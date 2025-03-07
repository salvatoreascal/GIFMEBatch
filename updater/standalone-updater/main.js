// Set environment variables to disable media features BEFORE requiring electron
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
process.env.ELECTRON_ENABLE_LOGGING = 'false';
process.env.ELECTRON_DISABLE_SCREEN_WAKE = 'true';
process.env.ELECTRON_FORCE_WINDOW_MENU_BAR = 'false';
process.env.ELECTRON_TRASH = 'false';
process.env.ELECTRON_NO_ASAR = 'false';
process.env.ELECTRON_NO_ATTACH_CONSOLE = 'true';
process.env.ELECTRON_SKIP_BINARY_DOWNLOAD = 'true';
process.env.ELECTRON_DISABLE_GPU = 'true';
process.env.ELECTRON_DISABLE_RENDERER_BACKGROUNDING = 'true';
process.env.ELECTRON_DISABLE_SANDBOX = 'true';
process.env.ELECTRON_DISABLE_CRASH_REPORTER = 'true';
process.env.ELECTRON_DISABLE_NETWORK_SERVICE = 'true';
process.env.ELECTRON_DISABLE_FRAME_RATE_LIMIT = 'true';
process.env.ELECTRON_DISABLE_DOMAIN_BLOCKING_FOR_3D_APIS = 'true';
process.env.ELECTRON_DISABLE_HARDWARE_ACCELERATION = 'true';
process.env.ELECTRON_DISABLE_ACCELERATED_2D_CANVAS = 'true';
process.env.ELECTRON_DISABLE_ACCELERATED_VIDEO_DECODE = 'true';
process.env.ELECTRON_DISABLE_ACCELERATED_VIDEO_ENCODE = 'true';
process.env.ELECTRON_DISABLE_ACCELERATED_MJPEG_DECODE = 'true';
process.env.ELECTRON_DISABLE_ACCELERATED_JPEG_DECODE = 'true';
process.env.ELECTRON_DISABLE_ACCELERATED_WEBP_DECODE = 'true';
process.env.ELECTRON_DISABLE_ACCELERATED_MEDIA = 'true';
process.env.ELECTRON_DISABLE_MEDIA = 'true';
process.env.ELECTRON_DISABLE_MEDIA_CAPTURE = 'true';
process.env.ELECTRON_DISABLE_MEDIA_SESSION = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_AUDIO = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_VIDEO = 'true';
process.env.ELECTRON_DISABLE_MEDIA_SOURCE = 'true';
process.env.ELECTRON_DISABLE_MEDIA_RECORDER = 'true';
process.env.ELECTRON_DISABLE_MEDIA_DEVICES = 'true';
process.env.ELECTRON_DISABLE_MEDIA_GALLERY = 'true';
process.env.ELECTRON_DISABLE_MEDIA_CONTROLS = 'true';
process.env.ELECTRON_DISABLE_MEDIA_CAPABILITIES = 'true';
process.env.ELECTRON_DISABLE_MEDIA_ENGAGEMENT = 'true';
process.env.ELECTRON_DISABLE_MEDIA_EXPERIENCE = 'true';
process.env.ELECTRON_DISABLE_MEDIA_FEED = 'true';
process.env.ELECTRON_DISABLE_MEDIA_INTERNALS = 'true';
process.env.ELECTRON_DISABLE_MEDIA_ROUTER = 'true';
process.env.ELECTRON_DISABLE_MEDIA_REMOTING = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_DISPATCHER = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_TRACK = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_AUDIO_SOURCE = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_VIDEO_SOURCE = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_AUDIO_SINK = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_VIDEO_SINK = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_AUDIO_PROCESSOR = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_VIDEO_PROCESSOR = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_AUDIO_RENDERER = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_VIDEO_RENDERER = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_AUDIO_TRACK = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_VIDEO_TRACK = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_AUDIO_TRACK_SINK = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_VIDEO_TRACK_SINK = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_AUDIO_TRACK_SOURCE = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_VIDEO_TRACK_SOURCE = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_AUDIO_TRACK_PROCESSOR = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_VIDEO_TRACK_PROCESSOR = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_AUDIO_TRACK_RENDERER = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_VIDEO_TRACK_RENDERER = 'true';

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { exec } = require('child_process');
const extract = require('extract-zip');
const rimraf = require('rimraf');
const os = require('os');
const AdmZip = require('adm-zip');

// Disable Electron's media features to avoid ffmpeg.dll dependency
app.commandLine.appendSwitch('disable-features', 'AudioServiceOutOfProcess,MediaSessionService,WebRTC,WebRTCPipeWireCapturer');
app.commandLine.appendSwitch('disable-speech-api');
app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-accelerated-video-decode');
app.commandLine.appendSwitch('disable-accelerated-video-encode');
app.commandLine.appendSwitch('disable-gpu-memory-buffer-video-frames');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-logging');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-audio');
app.commandLine.appendSwitch('disable-audio-input');
app.commandLine.appendSwitch('disable-audio-output');
app.commandLine.appendSwitch('disable-d3d11');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-gpu-driver-bug-workarounds');
app.commandLine.appendSwitch('disable-gpu-early-init');
app.commandLine.appendSwitch('disable-gpu-memory-buffer-compositor-resources');
app.commandLine.appendSwitch('disable-gpu-process');
app.commandLine.appendSwitch('disable-gpu-program-cache');
app.commandLine.appendSwitch('disable-gpu-rasterization');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-gpu-vsync');
app.commandLine.appendSwitch('disable-media-session-api');
app.commandLine.appendSwitch('disable-remote-playback-api');
app.commandLine.appendSwitch('disable-webrtc-hw-decoding');
app.commandLine.appendSwitch('disable-webrtc-hw-encoding');

// Global variables
let mainWindow;
let downloadCancelled = false;
let installationCancelled = false;
let currentDownloadRequest = null;

// Create the browser window.
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 650,
    height: 600,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webgl: false,
      webaudio: false
    },
    resizable: false,
    show: false
  });

  // Load the index.html of the app.
  mainWindow.loadFile('index.html');

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});

// IPC handlers
ipcMain.handle('find-gifme-installation', async () => {
  console.log('Finding GIFME installation');
  
  try {
    // Common installation paths to check
    const commonPaths = [
      path.join(process.env.PROGRAMFILES, 'GIFME'),
      path.join(process.env.PROGRAMFILES, 'GIFME-win32-x64'),
      path.join(process.env.LOCALAPPDATA, 'Programs', 'GIFME'),
      path.join(process.env.LOCALAPPDATA, 'Programs', 'GIFME-win32-x64'),
      path.join(process.env.USERPROFILE, 'Desktop', 'GIFME'),
      path.join(process.env.USERPROFILE, 'Desktop', 'GIFME-win32-x64'),
      path.join(process.env.USERPROFILE, 'Downloads', 'GIFME'),
      path.join(process.env.USERPROFILE, 'Downloads', 'GIFME-win32-x64')
    ];
    
    console.log('Checking common installation paths:', commonPaths);
    
    // Check each path for GIFME.exe
    for (const installPath of commonPaths) {
      const gifmeExePath = path.join(installPath, 'GIFME.exe');
      console.log(`Checking for GIFME.exe at: ${gifmeExePath}`);
      
      if (fs.existsSync(gifmeExePath)) {
        console.log(`Found GIFME installation at: ${installPath}`);
        return { found: true, path: installPath };
      }
    }
    
    // If we're in test mode, use the current directory as a fallback
    if (process.env.NODE_ENV === 'development' || process.argv.includes('--test-mode')) {
      console.log('Test mode: Using current directory as fallback');
      const currentDir = process.cwd();
      console.log(`Current directory: ${currentDir}`);
      
      // Go up one directory to find the app directory
      const appDir = path.dirname(currentDir);
      console.log(`App directory: ${appDir}`);
      
      return { found: true, path: appDir };
    }
    
    console.log('GIFME installation not found');
    return { found: false };
  } catch (error) {
    console.error(`Error finding GIFME installation: ${error.message}`);
    return { found: false, error: error.message };
  }
});

ipcMain.handle('browse-for-gifme', async () => {
  console.log('Browsing for installation directory');
  
  try {
    const result = await dialog.showOpenDialog({
      title: 'Select Installation Directory',
      properties: ['openDirectory']
    });
    
    console.log('Dialog result:', result);
    
    if (result.canceled) {
      console.log('Dialog canceled');
      return { selected: false };
    }
    
    const selectedPath = result.filePaths[0];
    console.log(`Selected path: ${selectedPath}`);
    
    return {
      selected: true,
      path: selectedPath
    };
  } catch (error) {
    console.error(`Error browsing for directory: ${error.message}`);
    return { selected: false, error: error.message };
  }
});

ipcMain.handle('check-for-updates', async (event, { appPath }) => {
  console.log(`Checking for updates with appPath: ${appPath}`);
  
  if (!appPath) {
    console.error('No app path provided');
    return { error: 'No app path provided' };
  }
  
  try {
    // Validate the app path
    if (!fs.existsSync(appPath)) {
      console.error(`App path does not exist: ${appPath}`);
      return { error: `App path does not exist: ${appPath}` };
    }
    
    // Get the current version from package.json or use a default
    let currentVersion = '0.0.0';

    try {
      // Try to get the version from package.json in resources/app
      const packageJsonPath = path.join(appPath, 'resources', 'app', 'package.json');

      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        currentVersion = packageJson.version || '0.0.0';
      } else {
        // Try to get the version from app.asar
        const asarPackageJsonPath = path.join(appPath, 'resources', 'app.asar', 'package.json');

        if (fs.existsSync(asarPackageJsonPath)) {
          // We can't directly read from asar, so we'll use the app's version
          const { app } = require('electron');
          currentVersion = app.getVersion() || '0.0.0';
        }
      }
    } catch (error) {
      console.error(`Error getting current version: ${error.message}`);
      // Continue with default version
    }
    
    const exePath = path.join(appPath, 'GIFME.exe');
    
    if (fs.existsSync(exePath)) {
      console.log(`Found GIFME.exe at ${exePath}`);
      
      try {
        // Try to get version from package.json if it exists
        const packageJsonPath = path.join(appPath, 'resources', 'app', 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          if (packageJson.version) {
            currentVersion = packageJson.version;
            console.log(`Current version from package.json: ${currentVersion}`);
          }
        } else {
          console.log('package.json not found, using default version 0.0.0');
        }
      } catch (error) {
        console.error(`Error reading package.json: ${error.message}`);
        // Continue with default version
      }
    } else {
      console.error(`GIFME.exe not found at ${exePath}`);
      return { error: `GIFME.exe not found at ${exePath}` };
    }
    
    // Get the latest release information
    console.log('Getting latest release information...');
    const latestRelease = await getLatestRelease();
    console.log(`Latest release: ${JSON.stringify(latestRelease)}`);
    
    // Compare versions
    const hasUpdate = compareVersions(currentVersion, latestRelease.version) < 0;
    console.log(`Current version: ${currentVersion}, Latest version: ${latestRelease.version}, Has update: ${hasUpdate}`);
    
    return {
      hasUpdate,
      currentVersion,
      latestVersion: latestRelease.version,
      downloadUrl: latestRelease.downloadUrl,
      releaseNotes: latestRelease.releaseNotes
    };
  } catch (error) {
    console.error(`Error checking for updates: ${error.message}`);
    console.error(error.stack);
    return { error: `Error checking for updates: ${error.message}` };
  }
});

// Function to create GitHub API request options with token support
function createGitHubRequestOptions(apiPath) {
  const options = {
    hostname: 'api.github.com',
    path: apiPath,
    headers: {
      'User-Agent': 'GIFME-Updater'
    },
    timeout: 10000
  };
  
  // Add GitHub token if available (for higher rate limits)
  const githubToken = process.env.GITHUB_TOKEN;
  if (githubToken) {
    options.headers['Authorization'] = `token ${githubToken}`;
  }
  
  return options;
}

// Get the latest release from GitHub
async function getLatestRelease() {
  return new Promise((resolve, reject) => {
    console.log('Fetching latest release from GitHub...');
    
    const options = createGitHubRequestOptions('/repos/salvatoreascal/GIFMEBatch/releases/latest');
    
    const req = https.get(options, (res) => {
      if (res.statusCode === 403 && res.headers['x-ratelimit-remaining'] === '0') {
        console.error('GitHub API rate limit exceeded');
        reject(new Error('GitHub API rate limit exceeded. Please try again later.'));
        return;
      }
      
      if (res.statusCode !== 200) {
        console.error(`GitHub API returned status code ${res.statusCode}`);
        reject(new Error(`GitHub API returned status code ${res.statusCode}`));
        return;
      }
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          console.log(`Latest release: ${release.tag_name}`);
          
          // Find the zip asset
          const zipAsset = release.assets.find(asset => 
            asset.name.endsWith('.zip') && asset.name.includes('GIFME-win32-x64')
          );
          
          if (!zipAsset) {
            reject(new Error('No suitable zip asset found in the latest release'));
            return;
          }
          
          resolve({
            version: release.tag_name.replace(/^v/, ''),
            downloadUrl: zipAsset.browser_download_url,
            releaseNotes: release.body || 'No release notes available'
          });
        } catch (error) {
          console.error('Error parsing GitHub API response:', error);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Error fetching latest release:', error);
      reject(error);
    });
    
    req.on('timeout', () => {
      req.abort();
      reject(new Error('Request timed out while fetching latest release'));
    });
  });
}

// Helper function to compare versions
function compareVersions(version1, version2) {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }
  
  return 0;
}

// Fix the downloadFile function to properly report progress and handle redirects
async function downloadFile(url, destination, progressCallback) {
  console.log(`Downloading file from ${url} to ${destination}`);
  downloadCancelled = false;
  
  return new Promise((resolve, reject) => {
    // Create the directory if it doesn't exist
    const dir = path.dirname(destination);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Function to handle HTTP requests with redirect support
    const makeRequest = (currentUrl) => {
      console.log(`Making request to: ${currentUrl}`);
      
      // Check if download was cancelled
      if (downloadCancelled) {
        console.log('Download cancelled by user');
        reject(new Error('Download cancelled by user'));
        return;
      }
      
      // Determine if we're using http or https
      const httpModule = currentUrl.startsWith('https:') ? https : http;
      
      // Create a write stream to save the file
      const file = fs.createWriteStream(destination);
      
      // Track download progress
      let receivedBytes = 0;
      let totalBytes = 0;
      
      // Parse the URL to get hostname, path, etc.
      const parsedUrl = new URL(currentUrl);
      
      // Make the request
      const request = httpModule.get({
        host: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        headers: {
          'User-Agent': 'GIFME-Updater'
        },
        timeout: 30000 // 30 second timeout
      }, (response) => {
        // Store the current request so it can be aborted if needed
        currentDownloadRequest = request;
        
        // Handle redirects (status codes 301, 302, 303, 307, 308)
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          console.log(`Redirect received: ${response.statusCode} to ${response.headers.location}`);
          
          // Close the current file stream
          file.close();
          
          // Delete the incomplete file
          if (fs.existsSync(destination)) {
            fs.unlinkSync(destination);
          }
          
          // Follow the redirect
          const redirectUrl = new URL(response.headers.location, currentUrl).toString();
          makeRequest(redirectUrl);
          return;
        }
        
        // Check if the request was successful
        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(destination);
          reject(new Error(`Failed to download file: ${response.statusCode} ${response.statusMessage}`));
          return;
        }
        
        // Get the total file size
        totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        console.log(`Total file size: ${totalBytes} bytes`);
        
        // Handle the data
        response.on('data', (chunk) => {
          // Check if download was cancelled
          if (downloadCancelled) {
            console.log('Download cancelled during data transfer');
            request.abort();
            file.close();
            fs.unlinkSync(destination);
            return;
          }
          
          receivedBytes += chunk.length;
          
          // Calculate and report progress
          if (totalBytes > 0) {
            const percent = Math.round((receivedBytes / totalBytes) * 100);
            if (progressCallback) {
              progressCallback({ 
                percent: percent,
                received: receivedBytes,
                total: totalBytes
              });
            }
          }
          
          // Write the chunk to the file
          file.write(chunk);
        });
        
        // Handle the end of the download
        response.on('end', () => {
          // Check if download was cancelled
          if (downloadCancelled) {
            console.log('Download cancelled at end of transfer');
            file.close();
            fs.unlinkSync(destination);
            reject(new Error('Download cancelled by user'));
            return;
          }
          
          file.end();
          console.log(`Download completed: ${receivedBytes} bytes received`);
          currentDownloadRequest = null;
          
          // Immediately report 100% progress when download is complete
          if (progressCallback) {
            progressCallback({ 
              percent: 100,
              received: receivedBytes,
              total: receivedBytes > 0 ? receivedBytes : totalBytes // Use received as total if total is 0
            });
          }
          
          // Verify the file exists and has content
          if (fs.existsSync(destination)) {
            const fileSize = fs.statSync(destination).size;
            if (fileSize > 0) {
              console.log(`Verified downloaded file: ${fileSize} bytes`);
              resolve();
            } else {
              console.error('Downloaded file has zero size');
              fs.unlinkSync(destination);
              reject(new Error('Downloaded file has zero size'));
            }
          } else {
            reject(new Error('File not found after download'));
          }
        });
      });
      
      // Handle request errors
      request.on('error', (error) => {
        console.error(`Download error: ${error.message}`);
        file.close();
        fs.unlink(destination, () => {}); // Delete the file if there was an error
        currentDownloadRequest = null;
        reject(error);
      });
      
      // Handle file errors
      file.on('error', (error) => {
        console.error(`File write error: ${error.message}`);
        fs.unlink(destination, () => {}); // Delete the file if there was an error
        currentDownloadRequest = null;
        reject(error);
      });
      
      // Set a timeout for the request
      request.setTimeout(30000, () => {
        request.abort();
        console.error('Download request timed out');
        file.close();
        fs.unlink(destination, () => {});
        currentDownloadRequest = null;
        reject(new Error('Request timed out'));
      });
    };
    
    // Start the initial request
    makeRequest(url);
  });
}

// Fix the download-update handler to properly handle progress and GitHub URLs
ipcMain.handle('download-update', async (event, { url, appPath }) => {
  console.log(`Downloading update from ${url}`);
  console.log(`App path: ${appPath}`);
  
  if (!url) {
    console.error('No download URL provided');
    return { error: 'No download URL provided' };
  }
  
  try {
    // Create a downloads directory in the app path if it doesn't exist
    const downloadsDir = path.join(appPath, 'downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }
    
    // Set the destination path for the download
    let fileName = 'GIFME-update.zip';
    if (url && typeof url === 'string') {
      const urlParts = url.split('/');
      if (urlParts.length > 0) {
        const lastPart = urlParts[urlParts.length - 1];
        if (lastPart && lastPart.trim() !== '') {
          fileName = lastPart;
        }
      }
    }
    
    const downloadPath = path.join(downloadsDir, fileName);
    console.log(`Download destination: ${downloadPath}`);
    
    // Check if the file already exists and has content
    if (fs.existsSync(downloadPath)) {
      const fileSize = fs.statSync(downloadPath).size;
      if (fileSize > 0) {
        console.log(`File already exists with size ${fileSize} bytes. Skipping download.`);
        
        // Report 100% progress immediately
        if (mainWindow) {
          mainWindow.webContents.send('download-progress', {
            percent: 100,
            received: fileSize,
            total: fileSize
          });
        }
        
        // Wait a moment to ensure the UI updates
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return { downloadPath, appPath };
      } else {
        // Delete the empty file
        console.log('Existing file is empty, deleting it');
        fs.unlinkSync(downloadPath);
      }
    }
    
    // If we get here, we need to download the file
    console.log('Starting download...');
    
    // Download the file with progress reporting
    await downloadFile(url, downloadPath, (progress) => {
      console.log(`Download progress: ${progress.percent}% (${progress.received}/${progress.total} bytes)`);
      if (mainWindow) {
        mainWindow.webContents.send('download-progress', progress);
      }
    });
    
    // Verify the downloaded file
    if (!fs.existsSync(downloadPath)) {
      throw new Error('Downloaded file not found after download completed');
    }
    
    const fileSize = fs.statSync(downloadPath).size;
    if (fileSize === 0) {
      throw new Error('Downloaded file has zero size');
    }
    
    console.log(`Download completed: ${downloadPath} (${fileSize} bytes)`);
    return { downloadPath, appPath };
  } catch (error) {
    console.error(`Error downloading update: ${error.message}`);
    console.error(error.stack);
    return { error: `Error downloading update: ${error.message}` };
  }
});

// Fix the install-update handler
ipcMain.handle('install-update', async (event, { downloadPath, appPath }) => {
  console.log(`Installing update from ${downloadPath} to ${appPath}`);
  
  // Reset cancellation flag at the start of installation
  installationCancelled = false;
  
  if (!downloadPath || !appPath) {
    console.error('Missing required parameters');
    return { error: 'Missing required parameters for installation' };
  }
  
  try {
    // Send progress update
    if (mainWindow && !installationCancelled) {
      mainWindow.webContents.send('install-progress', { 
        status: 'Preparing for installation...', 
        percent: 10 
      });
    }
    
    // Check if the download file exists
    if (!fs.existsSync(downloadPath)) {
      console.error(`Download file not found at ${downloadPath}`);
      return { error: 'Download file not found' };
    }
    
    // Check if operation was cancelled
    if (installationCancelled) {
      console.log('Installation cancelled by user');
      return { cancelled: true };
    }
    
    // Verify the ZIP file
    try {
      const stats = fs.statSync(downloadPath);
      console.log(`ZIP file size: ${stats.size} bytes`);
      
      if (stats.size === 0) {
        return { error: 'Update package is empty' };
      }
    } catch (error) {
      console.error(`Error checking ZIP file: ${error.message}`);
      return { error: `Error checking update package: ${error.message}` };
    }
    
    // Check if operation was cancelled
    if (installationCancelled) {
      console.log('Installation cancelled by user');
      return { cancelled: true };
    }
    
    // Send progress update
    if (mainWindow && !installationCancelled) {
      mainWindow.webContents.send('install-progress', { 
        status: 'Closing running applications...', 
        percent: 20 
      });
    }
    
    // Close any running instances of the app
    try {
      await closeRunningInstances(appPath);
    } catch (error) {
      console.error(`Error closing running instances: ${error.message}`);
      // Continue even if this fails
    }
    
    // Check if operation was cancelled
    if (installationCancelled) {
      console.log('Installation cancelled by user');
      return { cancelled: true };
    }
    
    // Send progress update
    if (mainWindow && !installationCancelled) {
      mainWindow.webContents.send('install-progress', { 
        status: 'Extracting update...', 
        percent: 30 
      });
    }
    
    // Extract the update package
    console.log(`Extracting ${downloadPath} to ${appPath}`);
    try {
      // Check for cancellation during extraction
      if (installationCancelled) {
        console.log('Installation cancelled before extraction');
        return { cancelled: true };
      }
      
      // Send progress update for extraction start
      if (mainWindow && !installationCancelled) {
        mainWindow.webContents.send('install-progress', { 
          status: 'Extracting update files...', 
          percent: 30 
        });
      }
      
      await extractZipManually(downloadPath, appPath);
      console.log('Extraction completed successfully');
      
      // Check for cancellation after extraction
      if (installationCancelled) {
        console.log('Installation cancelled after extraction');
        return { cancelled: true };
      }
      
      // Send progress update after extraction
      if (mainWindow && !installationCancelled) {
        mainWindow.webContents.send('install-progress', { 
          status: 'Update files extracted successfully', 
          percent: 70 
        });
      }
    } catch (error) {
      console.error(`Error during extraction: ${error.message}`);
      return { error: `Error extracting update package: ${error.message}` };
    }
    
    // Check if operation was cancelled
    if (installationCancelled) {
      console.log('Installation cancelled by user');
      return { cancelled: true };
    }
    
    // Send progress update
    if (mainWindow && !installationCancelled) {
      mainWindow.webContents.send('install-progress', { 
        status: 'Finalizing installation...', 
        percent: 90 
      });
    }
    
    // Clean up the downloaded ZIP file
    try {
      fs.unlinkSync(downloadPath);
      console.log(`Removed downloaded file: ${downloadPath}`);
    } catch (error) {
      console.error(`Error removing downloaded file: ${error.message}`);
      // Continue even if cleanup fails
    }
    
    // Check if operation was cancelled
    if (installationCancelled) {
      console.log('Installation cancelled by user');
      return { cancelled: true };
    }
    
    // Send final progress update - IMPORTANT: This ensures the progress bar shows 100%
    if (mainWindow && !installationCancelled) {
      mainWindow.webContents.send('install-progress', { 
        status: 'Update installed successfully!', 
        percent: 100 
      });
      
      // Add a small delay to ensure the UI updates
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('Update installed successfully');
    return { success: true };
  } catch (error) {
    console.error(`Error installing update: ${error.message}`);
    console.error(error.stack);
    return { error: `Error installing update: ${error.message}` };
  }
});

// Add this new function before the install-update handler
function forceReplaceAppAsar(sourcePath, targetPath) {
  console.log(`\n=== SPECIAL HANDLING FOR APP.ASAR ===`);
  console.log(`Source app.asar: ${sourcePath}`);
  console.log(`Target app.asar: ${targetPath}`);
  
  // Check if source exists
  if (!fs.existsSync(sourcePath)) {
    console.error(`Source app.asar does not exist at: ${sourcePath}`);
    return false;
  }
  
  // Log file sizes
  const sourceSize = fs.statSync(sourcePath).size;
  console.log(`Source app.asar size: ${sourceSize} bytes`);
  
  if (fs.existsSync(targetPath)) {
    const targetSize = fs.statSync(targetPath).size;
    console.log(`Target app.asar size: ${targetSize} bytes`);
    
    // Try to delete the target file using multiple methods
    console.log(`Attempting to delete existing app.asar at: ${targetPath}`);
    try {
      // First try: simple unlink
      fs.unlinkSync(targetPath);
      console.log(`Successfully deleted app.asar using fs.unlinkSync`);
    } catch (unlinkErr) {
      console.error(`Failed to delete with fs.unlinkSync: ${unlinkErr.message}`);
      
      try {
        // Second try: rimraf
        rimraf.sync(targetPath);
        console.log(`Successfully deleted app.asar using rimraf.sync`);
      } catch (rimrafErr) {
        console.error(`Failed to delete with rimraf: ${rimrafErr.message}`);
        
        try {
          // Third try: command line (Windows specific)
          const deleteCmd = `del "${targetPath}" /f /q`;
          console.log(`Executing command: ${deleteCmd}`);
          require('child_process').execSync(deleteCmd);
          console.log(`Successfully deleted app.asar using command line`);
        } catch (cmdErr) {
          console.error(`Failed to delete with command line: ${cmdErr.message}`);
          return false;
        }
      }
    }
  } else {
    console.log(`Target app.asar does not exist yet, no need to delete`);
    
    // Make sure the resources directory exists
    const resourcesDir = path.dirname(targetPath);
    if (!fs.existsSync(resourcesDir)) {
      console.log(`Creating resources directory: ${resourcesDir}`);
      fs.mkdirSync(resourcesDir, { recursive: true });
    }
  }
  
  // Now copy the file using multiple methods
  console.log(`Copying app.asar from ${sourcePath} to ${targetPath}`);
  
  try {
    // First try: direct copy
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`Successfully copied app.asar using fs.copyFileSync`);
  } catch (copyErr) {
    console.error(`Failed to copy with fs.copyFileSync: ${copyErr.message}`);
    
    try {
      // Second try: command line (Windows specific)
      const copyCmd = `copy "${sourcePath}" "${targetPath}" /Y`;
      console.log(`Executing command: ${copyCmd}`);
      require('child_process').execSync(copyCmd);
      console.log(`Successfully copied app.asar using command line`);
    } catch (cmdErr) {
      console.error(`Failed to copy with command line: ${cmdErr.message}`);
      
      try {
        // Third try: read and write
        console.log(`Trying to read and write the file manually`);
        const fileContent = fs.readFileSync(sourcePath);
        fs.writeFileSync(targetPath, fileContent);
        console.log(`Successfully copied app.asar using read/write`);
      } catch (rwErr) {
        console.error(`Failed to copy with read/write: ${rwErr.message}`);
        return false;
      }
    }
  }
  
  // Verify the copy was successful
  if (fs.existsSync(targetPath)) {
    const newTargetSize = fs.statSync(targetPath).size;
    console.log(`New target app.asar size: ${newTargetSize} bytes`);
    console.log(`Verification: ${newTargetSize === sourceSize ? 'SUCCESSFUL' : 'FAILED'}`);
    return newTargetSize === sourceSize;
  } else {
    console.error(`Target app.asar still does not exist after copy attempts`);
    return false;
  }
}

// Modify the extractZipManually function to properly preserve directory structure and handle cancellation
async function extractZipManually(zipPath, destPath) {
  console.log(`Extracting ZIP file: ${zipPath} to ${destPath}`);
  
  // Make sure the destination directory exists
  if (!fs.existsSync(destPath)) {
    fs.mkdirSync(destPath, { recursive: true });
  }
  
  try {
    // Check for cancellation at the start
    if (installationCancelled) {
      console.log('Extraction cancelled before starting');
      throw new Error('Extraction cancelled by user');
    }
    
    // Create a temporary extraction directory
    const tempDir = path.join(os.tmpdir(), 'gifme-update-' + Date.now());
    console.log(`Creating temporary extraction directory: ${tempDir}`);
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Use system commands to extract the ZIP file to the temporary directory
    console.log(`Extracting ZIP to temporary directory: ${tempDir}`);
    
    try {
      // Use PowerShell's Expand-Archive command on Windows
      const { execSync } = require('child_process');
      const psCommand = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${tempDir}' -Force"`;
      console.log(`Executing command: ${psCommand}`);
      
      execSync(psCommand, { stdio: 'inherit' });
      console.log('PowerShell extraction completed successfully');
      
      // List the contents of the temporary directory
      console.log('Contents of temporary directory:');
      listDirectoryContents(tempDir);
      
      // Look for the resources directory in the temporary directory
      const resourcesDir = path.join(tempDir, 'resources');
      const destResourcesDir = path.join(destPath, 'resources');
      
      if (fs.existsSync(resourcesDir)) {
        console.log(`Found resources directory: ${resourcesDir}`);
        
        // Make sure the destination resources directory exists
        if (!fs.existsSync(destResourcesDir)) {
          fs.mkdirSync(destResourcesDir, { recursive: true });
        }
        
        // Copy the entire resources directory, but don't delete existing files
        console.log(`Copying resources directory from ${resourcesDir} to ${destResourcesDir} (preserving existing files)`);
        
        try {
          // Use PowerShell to copy the directory contents, but with -Force to overwrite only existing files
          const copyResourcesCommand = `powershell -Command "Copy-Item -Path '${resourcesDir}\\*' -Destination '${destResourcesDir}' -Recurse -Force"`;
          console.log(`Executing command: ${copyResourcesCommand}`);
          
          execSync(copyResourcesCommand, { stdio: 'inherit' });
          console.log('Resources directory copied successfully');
          
          // Verify app.asar was copied
          const destAppAsarPath = path.join(destResourcesDir, 'app.asar');
          if (fs.existsSync(destAppAsarPath)) {
            const size = fs.statSync(destAppAsarPath).size;
            console.log(`Verified app.asar exists in destination: ${destAppAsarPath} (${size} bytes)`);
          } else {
            console.error('app.asar not found in destination resources directory after copy');
            throw new Error('app.asar not found in destination resources directory after copy');
          }
        } catch (copyError) {
          console.error(`Error copying resources directory: ${copyError.message}`);
          throw new Error(`Error copying resources directory: ${copyError.message}`);
        }
      } else {
        console.error('Resources directory not found in extracted files');
        throw new Error('Resources directory not found in extracted files');
      }
      
      // Now copy all other files and directories from the temporary directory to the destination
      console.log(`Copying all files from ${tempDir} to ${destPath} (preserving existing files)`);
      
      // Get all items in the temporary directory
      const tempItems = fs.readdirSync(tempDir);
      
      for (const item of tempItems) {
        // Skip the resources directory as we've already handled it
        if (item === 'resources') {
          continue;
        }
        
        const sourcePath = path.join(tempDir, item);
        const destPath2 = path.join(destPath, item);
        
        try {
          if (fs.statSync(sourcePath).isDirectory()) {
            // For directories, we need to create them if they don't exist
            if (!fs.existsSync(destPath2)) {
              fs.mkdirSync(destPath2, { recursive: true });
            }
            
            // Use PowerShell to copy directory contents, preserving existing files
            const copyDirCommand = `powershell -Command "Copy-Item -Path '${sourcePath}\\*' -Destination '${destPath2}' -Recurse -Force"`;
            console.log(`Executing command: ${copyDirCommand}`);
            
            execSync(copyDirCommand, { stdio: 'inherit' });
            console.log(`Directory ${item} copied successfully`);
          } else {
            // For files, just copy and overwrite if exists
            fs.copyFileSync(sourcePath, destPath2);
            console.log(`File ${item} copied successfully`);
          }
        } catch (copyError) {
          console.error(`Error copying item ${item}: ${copyError.message}`);
          // Continue with other files
        }
      }
      
      console.log('All files copied successfully');
      
      // Clean up the temporary directory
      try {
        removeDirectoryRecursive(tempDir);
        console.log(`Temporary directory removed: ${tempDir}`);
      } catch (cleanupError) {
        console.error(`Error removing temporary directory: ${cleanupError.message}`);
        // Continue even if cleanup fails
      }
      
      return true;
    } catch (extractError) {
      console.error(`Error during extraction: ${extractError.message}`);
      
      // Clean up the temporary directory if it exists
      try {
        if (fs.existsSync(tempDir)) {
          removeDirectoryRecursive(tempDir);
          console.log(`Temporary directory removed: ${tempDir}`);
        }
      } catch (cleanupError) {
        console.error(`Error removing temporary directory: ${cleanupError.message}`);
      }
      
      throw extractError;
    }
  } catch (error) {
    console.error(`Error during extraction: ${error.message}`);
    throw error;
  }
}

ipcMain.handle('launch-gifme', async (event, appPath) => {
  try {
    const exePath = path.join(appPath, 'GIFME.exe');
    
    if (fs.existsSync(exePath)) {
      exec(`"${exePath}"`, (error) => {
        if (error) {
          console.error('Error launching GIFME:', error);
        }
      });
      return { success: true };
    } else {
      return { success: false, error: 'GIFME.exe not found' };
    }
  } catch (error) {
    console.error('Error launching GIFME:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.on('quit-app', () => {
  app.quit();
});

// Helper functions
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

function findExtractedAppDir(extractPath) {
  console.log('Looking for app directory in:', extractPath);
  
  // Check if the directory exists
  if (!fs.existsSync(extractPath)) {
    console.error('Extract path does not exist:', extractPath);
    return null;
  }
  
  // Log the contents of the extract path
  try {
    const contents = fs.readdirSync(extractPath);
    console.log('Contents of extract path:', contents);
  } catch (error) {
    console.error('Error reading extract path:', error);
  }
  
  // First, check if GIFME.exe is directly in the extract path
  if (fs.existsSync(path.join(extractPath, 'GIFME.exe'))) {
    console.log('Found GIFME.exe in extract path');
    return extractPath;
  }
  
  // Check for GIFME-win32-x64 directory
  const gifmeWinDir = path.join(extractPath, 'GIFME-win32-x64');
  if (fs.existsSync(gifmeWinDir)) {
    console.log('Found GIFME-win32-x64 directory');
    
    // Check if GIFME.exe exists in this directory
    if (fs.existsSync(path.join(gifmeWinDir, 'GIFME.exe'))) {
      console.log('Found GIFME.exe in GIFME-win32-x64 directory');
      return gifmeWinDir;
    }
  }
  
  // Then check subdirectories (first level)
  const entries = fs.readdirSync(extractPath);
  for (const entry of entries) {
    const entryPath = path.join(extractPath, entry);
    if (fs.statSync(entryPath).isDirectory()) {
      console.log('Checking subdirectory:', entry);
      
      // Check for GIFME.exe
      if (fs.existsSync(path.join(entryPath, 'GIFME.exe'))) {
        console.log('Found GIFME.exe in subdirectory:', entry);
        return entryPath;
      }
      
      // Check for second-level directories
      try {
        const subEntries = fs.readdirSync(entryPath);
        for (const subEntry of subEntries) {
          const subEntryPath = path.join(entryPath, subEntry);
          if (fs.statSync(subEntryPath).isDirectory()) {
            // Check for GIFME.exe
            if (fs.existsSync(path.join(subEntryPath, 'GIFME.exe'))) {
              console.log('Found GIFME.exe in second-level subdirectory:', path.join(entry, subEntry));
              return subEntryPath;
            }
          }
        }
      } catch (error) {
        console.error('Error checking second-level subdirectories:', error);
      }
    }
  }
  
  console.log('Could not find GIFME.exe in extracted files');
  return null;
}

// Helper function to recursively list files
function listFilesRecursive(dir, prefix, level, maxLevel) {
  if (level > maxLevel) return;
  
  try {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      const relativePath = path.join(prefix, file);
      
      if (stats.isDirectory()) {
        console.log(`${prefix}${file}/`);
        listFilesRecursive(filePath, `${prefix}  `, level + 1, maxLevel);
      } else {
        console.log(`${prefix}${file} (${stats.size} bytes)`);
      }
    });
  } catch (error) {
    console.error(`Error listing files in ${dir}:`, error);
  }
}

// Helper function to copy folders recursively
function copyFolderRecursiveSync(source, target) {
  // Check if source exists
  if (!fs.existsSync(source)) {
    console.error(`Source directory does not exist: ${source}`);
    return;
  }

  // Create target directory if it doesn't exist
  if (!fs.existsSync(target)) {
    try {
      fs.mkdirSync(target, { recursive: true });
      console.log(`Created target directory: ${target}`);
    } catch (error) {
      console.error(`Error creating target directory: ${target}`, error);
      return;
    }
  }

  // Get all files and directories in the source
  let items = [];
  try {
    items = fs.readdirSync(source);
    console.log(`Copying ${items.length} items from ${source} to ${target}`);
  } catch (error) {
    console.error(`Error reading source directory: ${source}`, error);
    return;
  }

  // Process each item
  items.forEach(item => {
    const sourcePath = path.join(source, item);
    const targetPath = path.join(target, item);

    try {
      const stats = fs.statSync(sourcePath);

      if (stats.isDirectory()) {
        // If it's a directory, recursively copy it
        console.log(`Copying directory: ${sourcePath} -> ${targetPath}`);
        
        // If target directory exists and is not empty, clean it first
        if (fs.existsSync(targetPath)) {
          try {
            rimraf.sync(targetPath);
            console.log(`Removed existing directory: ${targetPath}`);
          } catch (error) {
            console.error(`Error removing existing directory: ${targetPath}`, error);
          }
        }
        
        copyFolderRecursiveSync(sourcePath, targetPath);
      } else {
        // If it's a file, copy it directly
        try {
          // Check if target file exists
          if (fs.existsSync(targetPath)) {
            try {
              // Try to delete the file first
              fs.unlinkSync(targetPath);
              console.log(`Deleted existing file: ${targetPath}`);
            } catch (deleteError) {
              console.error(`Cannot delete existing file: ${targetPath}`, deleteError);
            }
          }

          // Copy the file
          try {
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`Copied file: ${sourcePath} -> ${targetPath}`);
          } catch (copyError) {
            console.error(`Error copying file: ${sourcePath} -> ${targetPath}`, copyError);
          }
        } catch (e) {
          console.error(`Error processing file ${sourcePath} to ${targetPath}: ${e.message}`);
        }
      }
    } catch (e) {
      console.error(`Error processing ${sourcePath}: ${e.message}`);
    }
  });
}

// Add this function before the install-update handler
function findFileRecursive(startPath, fileName) {
  console.log(`Searching for ${fileName} in ${startPath}`);
  
  if (!fs.existsSync(startPath)) {
    console.log(`Start path does not exist: ${startPath}`);
    return null;
  }
  
  // Check if the file exists directly in the start path
  const directFile = path.join(startPath, fileName);
  if (fs.existsSync(directFile)) {
    console.log(`Found ${fileName} directly in ${startPath}`);
    return directFile;
  }
  
  // Get all files and directories in the start path
  const files = fs.readdirSync(startPath);
  
  // First check all files in the current directory
  for (const file of files) {
    const filePath = path.join(startPath, file);
    const stat = fs.statSync(filePath);
    
    if (!stat.isDirectory() && file === fileName) {
      console.log(`Found ${fileName} at ${filePath}`);
      return filePath;
    }
  }
  
  // Then recursively check all subdirectories
  for (const file of files) {
    const filePath = path.join(startPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      const found = findFileRecursive(filePath, fileName);
      if (found) {
        return found;
      }
    }
  }
  
  return null;
}

// Helper function to find all files with a specific extension
function findAllFilesWithExtension(dir, extension) {
  let results = [];
  
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        // Recursively search subdirectories
        results = results.concat(findAllFilesWithExtension(filePath, extension));
      } else if (file.toLowerCase().endsWith(extension.toLowerCase())) {
        // Add file to results if it ends with the specified extension
        results.push(filePath);
        console.log(`Found file with extension ${extension}: ${filePath}`);
      }
    }
  } catch (error) {
    console.error(`Error searching for files with extension ${extension}:`, error);
  }
  
  return results;
}

// Helper function to recursively remove a directory
function removeDirectoryRecursive(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.statSync(curPath).isDirectory()) {
        // Recursive call for directories
        removeDirectoryRecursive(curPath);
      } else {
        // Delete file
        fs.unlinkSync(curPath);
      }
    });
    
    // Now that the directory is empty, remove it
    try {
      fs.rmdirSync(dirPath);
    } catch (err) {
      console.error(`Error removing directory ${dirPath}:`, err);
      // If we can't remove it with fs.rmdirSync, try using rimraf as a fallback
      try {
        rimraf.sync(dirPath);
      } catch (rimrafErr) {
        console.error(`Error removing directory with rimraf ${dirPath}:`, rimrafErr);
        // As a last resort, try using the execSync to run the OS-specific command
        try {
          const { execSync } = require('child_process');
          if (process.platform === 'win32') {
            execSync(`rd /s /q "${dirPath}"`);
          } else {
            execSync(`rm -rf "${dirPath}"`);
          }
        } catch (execErr) {
          console.error(`Failed all attempts to remove directory ${dirPath}: ${execErr}`);
        }
      }
    }
  }
}

// Helper function to list directory contents for debugging
function listDirectoryContents(dirPath, indent = '') {
  if (!fs.existsSync(dirPath)) {
    console.log(`${indent}Directory does not exist: ${dirPath}`);
    return;
  }
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        console.log(`${indent}[DIR] ${item}`);
        listDirectoryContents(itemPath, `${indent}  `);
      } else {
        console.log(`${indent}[FILE] ${item} (${stats.size} bytes)`);
      }
    }
  } catch (error) {
    console.error(`Error listing directory contents: ${error.message}`);
  }
}

// Helper function to close running instances of the app
async function closeRunningInstances(appPath) {
  return new Promise((resolve, reject) => {
    try {
      console.log('Attempting to close any running instances of GIFME');
      const { exec } = require('child_process');
      
      exec('taskkill /f /im GIFME.exe', (error) => {
        if (error) {
          console.log('No running instances of GIFME found or error closing');
        } else {
          console.log('Closed running instances of GIFME');
        }
        
        // Wait a moment to ensure processes are closed
        setTimeout(resolve, 1000);
      });
    } catch (error) {
      console.error(`Error closing running instances: ${error.message}`);
      // Resolve anyway to continue with the installation
      setTimeout(resolve, 1000);
    }
  });
}

// Add a cancel-download handler
ipcMain.handle('cancel-download', async (event) => {
  console.log('Cancelling download or installation...');
  
  // Cancel download if in progress
  downloadCancelled = true;
  installationCancelled = true;
  
  // Abort the current download request if it exists
  if (currentDownloadRequest) {
    console.log('Aborting current download request');
    currentDownloadRequest.abort();
    currentDownloadRequest = null;
  }
  
  // Notify the renderer that the operation was cancelled
  if (mainWindow) {
    mainWindow.webContents.send('cancel-operation');
  }
  
  return { success: true, message: 'Operation cancelled' };
});