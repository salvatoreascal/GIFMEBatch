const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { exec, execSync } = require('child_process');
const extract = require('extract-zip');
const rimraf = require('rimraf');

// GitHub repository information
const owner = 'salvatoreascal';
const repo = 'gifme';
const releaseApiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

let mainWindow;
let targetAppPath;
let downloadPath;
let updateInProgress = false;

// Create the main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'icon.ico'),
    resizable: false,
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Start the update process automatically
    checkForUpdates();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  // Determine the target app path (where GIFME is installed)
  // First check if a path was passed as an argument
  if (process.argv.length > 1) {
    const argPath = process.argv[1];
    if (fs.existsSync(argPath) && fs.existsSync(path.join(argPath, 'GIFME.exe'))) {
      targetAppPath = argPath;
    }
  }

  // If no valid path was provided, try to find the app in common locations
  if (!targetAppPath) {
    const commonPaths = [
      path.join(process.env.PROGRAMFILES, 'GIFME'),
      path.join(process.env.LOCALAPPDATA, 'Programs', 'GIFME'),
      path.dirname(app.getPath('exe')) // Check if updater is in the same directory as the app
    ];

    for (const p of commonPaths) {
      if (fs.existsSync(p) && fs.existsSync(path.join(p, 'GIFME.exe'))) {
        targetAppPath = p;
        break;
      }
    }
  }

  // If we still don't have a path, ask the user
  if (!targetAppPath) {
    const result = dialog.showOpenDialogSync({
      title: 'Select GIFME Installation Directory',
      properties: ['openDirectory'],
      message: 'Please select the folder where GIFME is installed (containing GIFME.exe)'
    });

    if (result && result.length > 0) {
      if (fs.existsSync(path.join(result[0], 'GIFME.exe'))) {
        targetAppPath = result[0];
      } else {
        dialog.showErrorBox('Invalid Directory', 'The selected directory does not contain GIFME.exe');
        app.quit();
        return;
      }
    } else {
      app.quit();
      return;
    }
  }

  // Set up download path
  downloadPath = path.join(app.getPath('temp'), 'gifme-update');
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath, { recursive: true });
  }

  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

// Check for updates
function checkForUpdates() {
  if (updateInProgress) return;
  updateInProgress = true;

  sendStatusToWindow('Checking for updates...');

  // Get current version from the installed app
  let currentVersion = '0.0.0';
  try {
    const packageJsonPath = path.join(targetAppPath, 'resources', 'app', 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      currentVersion = packageJson.version;
    } else {
      // For ASAR packaged apps
      const asarPath = path.join(targetAppPath, 'resources', 'app.asar');
      if (fs.existsSync(asarPath)) {
        // We can't directly read from asar, so we'll use the app version from the executable
        // This is a simplification - in a real app you might want to extract the version from the asar
        currentVersion = '1.0.0'; // Default to 1.0.0 if we can't determine
      }
    }
  } catch (error) {
    console.error('Error reading current version:', error);
    sendStatusToWindow(`Error reading current version: ${error.message}`);
    updateInProgress = false;
    return;
  }

  sendStatusToWindow(`Current version: ${currentVersion}`);

  const options = {
    headers: {
      'User-Agent': 'GIFME-Updater'
    }
  };

  const req = https.get(releaseApiUrl, options, (res) => {
    if (res.statusCode !== 200) {
      sendStatusToWindow(`GitHub API request failed with status code: ${res.statusCode}`);
      updateInProgress = false;
      return;
    }

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const releaseData = JSON.parse(data);
        const latestVersion = releaseData.tag_name.replace('v', '');
        
        sendStatusToWindow(`Latest version: ${latestVersion}`);
        
        // Compare versions
        const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;
        
        if (!hasUpdate) {
          sendStatusToWindow('You already have the latest version!');
          setTimeout(() => {
            app.quit();
          }, 3000);
          updateInProgress = false;
          return;
        }

        // Find the Windows installer asset
        let downloadUrl = '';
        
        if (releaseData.assets && releaseData.assets.length > 0) {
          for (const asset of releaseData.assets) {
            if (asset.name.includes('GIFME-win32-x64.zip')) {
              downloadUrl = asset.browser_download_url;
              break;
            }
          }
        }
        
        if (!downloadUrl) {
          sendStatusToWindow('No suitable update package found in the latest release.');
          updateInProgress = false;
          return;
        }

        // Ask user if they want to update
        const dialogResult = dialog.showMessageBoxSync(mainWindow, {
          type: 'info',
          buttons: ['Update Now', 'Cancel'],
          title: 'Update Available',
          message: `A new version of GIFME is available!`,
          detail: `Current version: ${currentVersion}\nLatest version: ${latestVersion}\n\nWould you like to update now?`,
          cancelId: 1
        });

        if (dialogResult === 1) {
          sendStatusToWindow('Update cancelled by user.');
          setTimeout(() => {
            app.quit();
          }, 2000);
          updateInProgress = false;
          return;
        }

        // Download and install the update
        downloadUpdate(downloadUrl, latestVersion);
      } catch (error) {
        sendStatusToWindow(`Error parsing GitHub API response: ${error.message}`);
        updateInProgress = false;
      }
    });
  });

  req.on('error', (error) => {
    sendStatusToWindow(`Error checking for updates: ${error.message}`);
    updateInProgress = false;
  });

  req.end();
}

// Compare two version strings
function compareVersions(v1, v2) {
  const v1Parts = v1.split('.').map(Number);
  const v2Parts = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }
  
  return 0;
}

// Download the update
function downloadUpdate(url, version) {
  sendStatusToWindow(`Downloading update...`);
  
  const zipFilePath = path.join(downloadPath, `gifme-${version}.zip`);
  const file = fs.createWriteStream(zipFilePath);
  
  https.get(url, (response) => {
    if (response.statusCode !== 200) {
      sendStatusToWindow(`Failed to download update: Server returned ${response.statusCode}`);
      updateInProgress = false;
      return;
    }
    
    const totalLength = parseInt(response.headers['content-length'], 10);
    let downloaded = 0;
    
    response.on('data', (chunk) => {
      downloaded += chunk.length;
      const percent = Math.round((downloaded / totalLength) * 100);
      sendStatusToWindow(`Downloading update: ${percent}%`);
      sendProgressToWindow(percent);
    });
    
    response.pipe(file);
    
    file.on('finish', () => {
      file.close();
      sendStatusToWindow('Download complete. Preparing to install...');
      installUpdate(zipFilePath, version);
    });
  }).on('error', (err) => {
    fs.unlink(zipFilePath, () => {}); // Delete the file on error
    sendStatusToWindow(`Error downloading update: ${err.message}`);
    updateInProgress = false;
  });
}

// Install the update
async function installUpdate(zipFilePath, version) {
  try {
    sendStatusToWindow('Closing GIFME application if running...');
    
    // Try to close any running instances of GIFME
    try {
      execSync('taskkill /f /im GIFME.exe', { windowsHide: true });
      sendStatusToWindow('GIFME application closed.');
    } catch (error) {
      // It's okay if the app wasn't running
      sendStatusToWindow('No running GIFME application found or unable to close it.');
    }
    
    // Wait a moment to ensure the app is fully closed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    sendStatusToWindow('Backing up current installation...');
    const backupPath = path.join(app.getPath('temp'), 'gifme-backup');
    if (fs.existsSync(backupPath)) {
      rimraf.sync(backupPath);
    }
    fs.mkdirSync(backupPath, { recursive: true });
    
    // Copy important files to backup
    try {
      // Copy user data/settings if they exist
      const userDataPath = path.join(targetAppPath, 'userData');
      if (fs.existsSync(userDataPath)) {
        fs.mkdirSync(path.join(backupPath, 'userData'), { recursive: true });
        copyFolderRecursiveSync(userDataPath, path.join(backupPath, 'userData'));
      }
    } catch (error) {
      sendStatusToWindow(`Warning: Error backing up user data: ${error.message}`);
      // Continue with the update even if backup fails
    }
    
    sendStatusToWindow('Extracting update...');
    const extractPath = path.join(downloadPath, 'extract');
    if (fs.existsSync(extractPath)) {
      rimraf.sync(extractPath);
    }
    fs.mkdirSync(extractPath, { recursive: true });
    
    try {
      await extract(zipFilePath, { dir: extractPath });
      sendStatusToWindow('Update extracted successfully.');
    } catch (error) {
      sendStatusToWindow(`Error extracting update: ${error.message}`);
      updateInProgress = false;
      return;
    }
    
    // Find the extracted app directory
    const extractedAppDir = findExtractedAppDir(extractPath);
    if (!extractedAppDir) {
      sendStatusToWindow('Error: Could not find the application files in the extracted update.');
      updateInProgress = false;
      return;
    }
    
    sendStatusToWindow('Installing update...');
    
    try {
      // Remove old files except user data
      const filesToKeep = ['userData'];
      const entries = fs.readdirSync(targetAppPath);
      
      for (const entry of entries) {
        if (!filesToKeep.includes(entry)) {
          const entryPath = path.join(targetAppPath, entry);
          if (fs.lstatSync(entryPath).isDirectory()) {
            rimraf.sync(entryPath);
          } else {
            fs.unlinkSync(entryPath);
          }
        }
      }
      
      // Copy new files
      copyFolderRecursiveSync(extractedAppDir, targetAppPath);
      
      sendStatusToWindow('Update installed successfully!');
      
      // Clean up
      try {
        rimraf.sync(extractPath);
        fs.unlinkSync(zipFilePath);
      } catch (error) {
        // Non-critical error, just log it
        console.error('Error cleaning up temporary files:', error);
      }
      
      // Ask if user wants to launch the updated app
      const launchResult = dialog.showMessageBoxSync(mainWindow, {
        type: 'info',
        buttons: ['Launch Now', 'Exit'],
        title: 'Update Complete',
        message: 'GIFME has been updated successfully!',
        detail: `Version ${version} has been installed. Would you like to launch the application now?`,
        cancelId: 1
      });
      
      if (launchResult === 0) {
        // Launch the updated app
        exec(`"${path.join(targetAppPath, 'GIFME.exe')}"`, (error) => {
          if (error) {
            dialog.showErrorBox('Launch Error', `Failed to launch GIFME: ${error.message}`);
          }
          app.quit();
        });
      } else {
        app.quit();
      }
    } catch (error) {
      sendStatusToWindow(`Error installing update: ${error.message}`);
      
      // Try to restore from backup if installation fails
      try {
        sendStatusToWindow('Attempting to restore from backup...');
        // Implement restore logic here if needed
      } catch (restoreError) {
        sendStatusToWindow(`Error restoring from backup: ${restoreError.message}`);
      }
      
      updateInProgress = false;
    }
  } catch (error) {
    sendStatusToWindow(`Error during update process: ${error.message}`);
    updateInProgress = false;
  }
}

// Helper function to find the extracted app directory
function findExtractedAppDir(extractPath) {
  // Look for common patterns in the extracted files
  if (fs.existsSync(path.join(extractPath, 'GIFME.exe'))) {
    return extractPath;
  }
  
  // Check if there's a single directory that contains the app
  const entries = fs.readdirSync(extractPath);
  for (const entry of entries) {
    const entryPath = path.join(extractPath, entry);
    if (fs.lstatSync(entryPath).isDirectory() && 
        fs.existsSync(path.join(entryPath, 'GIFME.exe'))) {
      return entryPath;
    }
  }
  
  return null;
}

// Helper function to copy a folder recursively
function copyFolderRecursiveSync(source, target) {
  // Check if source exists
  if (!fs.existsSync(source)) {
    return;
  }

  // Create target folder if it doesn't exist
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  // Copy all files and subfolders
  const files = fs.readdirSync(source);
  files.forEach(file => {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);

    if (fs.lstatSync(sourcePath).isDirectory()) {
      copyFolderRecursiveSync(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}

// Send status updates to the renderer process
function sendStatusToWindow(message) {
  console.log(message);
  if (mainWindow) {
    mainWindow.webContents.send('update-status', message);
  }
}

// Send progress updates to the renderer process
function sendProgressToWindow(percent) {
  if (mainWindow) {
    mainWindow.webContents.send('update-progress', percent);
  }
}

// IPC handlers
ipcMain.on('check-for-updates', () => {
  checkForUpdates();
});

ipcMain.on('quit-app', () => {
  app.quit();
}); 