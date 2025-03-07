const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { exec, execFile, execFileSync, execSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const os = require('os');
const AdmZip = require('adm-zip');

// Enforce single instance - must be before app.on('ready')
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    console.log('Another instance is already running. Quitting...');
    app.quit();
    process.exit(0); // Force exit to ensure the app closes completely
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

let mainWindow;
let ffmpegPath = 'ffmpeg';
let gifsiclePath = 'gifsicle';
let ffprobePath = 'ffprobe';

// In development mode, use the bundled binaries
if (app.isPackaged) {
    const resourcesPath = process.resourcesPath;
    ffmpegPath = path.join(resourcesPath, 'ffmpeg-win', 'bin', 'ffmpeg.exe');
    gifsiclePath = path.join(resourcesPath, 'gifsicle-win', 'gifsicle.exe');
    ffprobePath = path.join(resourcesPath, 'ffmpeg-win', 'bin', 'ffprobe.exe');
} else {
    // In development, check if we have the binaries in the resources folder
    const devResourcesPath = path.join(__dirname, 'resources');
    const ffmpegDevPath = path.join(devResourcesPath, 'ffmpeg-win', 'bin', 'ffmpeg.exe');
    const gifsicleDevPath = path.join(devResourcesPath, 'gifsicle-win', 'gifsicle.exe');
    const ffprobeDevPath = path.join(devResourcesPath, 'ffmpeg-win', 'bin', 'ffprobe.exe');
    
    if (fs.existsSync(ffmpegDevPath)) {
        ffmpegPath = ffmpegDevPath;
    }
    if (fs.existsSync(gifsicleDevPath)) {
        gifsiclePath = gifsicleDevPath;
    }
    if (fs.existsSync(ffprobeDevPath)) {
        ffprobePath = ffprobeDevPath;
    }
    
    // Check for bundled binaries in the project root
    const bundledFFmpegPath = getBundledBinaryPath('ffmpeg');
    const bundledGifsiclePath = getBundledBinaryPath('gifsicle');
    const bundledFFprobePath = getBundledBinaryPath('ffprobe');
    
    if (bundledFFmpegPath) {
        console.log('Using bundled FFmpeg:', bundledFFmpegPath);
        ffmpegPath = bundledFFmpegPath;
    }
    
    if (bundledGifsiclePath) {
        console.log('Using bundled Gifsicle:', bundledGifsiclePath);
        gifsiclePath = bundledGifsiclePath;
    }
    
    if (bundledFFprobePath) {
        console.log('Using bundled FFprobe:', bundledFFprobePath);
        ffprobePath = bundledFFprobePath;
    }
}

console.log('Using FFmpeg path:', ffmpegPath);
console.log('Using Gifsicle path:', gifsiclePath);
console.log('Using FFprobe path:', ffprobePath);

// Function to get the path to the bundled binaries
function getBundledBinaryPath(binaryName) {
    const isProduction = app.isPackaged;
    let binaryDir, binaryPath;
    
    if (isProduction) {
        // In production, the binaries are in the resources directory
        const resourcesPath = process.resourcesPath;
        binaryDir = path.join(resourcesPath, `${binaryName === 'ffprobe' ? 'ffmpeg' : binaryName}-win`);
    } else {
        // In development, they're in the project root
        binaryDir = path.join(app.getAppPath(), `${binaryName === 'ffprobe' ? 'ffmpeg' : binaryName}-win`);
    }
    
    // The ffmpeg and ffprobe binaries are in the bin directory, but gifsicle is in the root
    if (binaryName === 'ffmpeg' || binaryName === 'ffprobe') {
        binaryPath = path.join(binaryDir, 'bin', `${binaryName}.exe`);
    } else {
        binaryPath = path.join(binaryDir, `${binaryName}.exe`);
    }
    
    console.log(`Checking for bundled ${binaryName} at: ${binaryPath}`);
    
    if (fs.existsSync(binaryPath)) {
        console.log(`Found bundled ${binaryName} at: ${binaryPath}`);
        return binaryPath;
    }
    
    console.log(`Bundled ${binaryName} not found at: ${binaryPath}`);
    return null;
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile("index.html");
}

app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// Handle files dropped
ipcMain.on('files-dropped', (event, filePaths) => {
    console.log('Main: Received dropped files:', filePaths);
    event.reply('files-received', filePaths);
});

// Handle folder selection
ipcMain.on('select-directory', async (event) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    
    if (!result.canceled) {
        event.reply('directory-selected', result.filePaths[0]);
    }
});

// Handle file selection
ipcMain.on('select-files', async (event) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections'],
        filters: [
            { name: 'MP4 Videos', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] }
        ]
    });
    
    if (!result.canceled) {
        event.reply('files-selected', result.filePaths);
    }
});

// Generate thumbnail from video
async function generateThumbnail(videoPath) {
    try {
        console.log(`Generating thumbnail for: ${videoPath}`);
        
        // Create a unique filename for the thumbnail
        const uniqueId = Date.now();
        const thumbnailPath = path.join(app.getPath('temp'), `thumb_${uniqueId}.png`);
        
        console.log(`Thumbnail will be saved to: ${thumbnailPath}`);
        
        // Make sure the temp directory exists
        if (!fs.existsSync(app.getPath('temp'))) {
            fs.mkdirSync(app.getPath('temp'), { recursive: true });
        }
        
        // Use a reliable ffmpeg command for short videos
        const ffmpegArgs = [
            '-y',                // Overwrite output file if it exists
            '-ss', '0.5',        // Seek to 0.5 seconds (to avoid black frames at the start)
            '-i', videoPath,     // Input file
            '-vframes', '1',     // Extract only one frame
            '-vf', 'scale=720:-1', // Scale to 480px width (higher resolution), maintain aspect ratio
            '-q:v', '2',         // High quality
            thumbnailPath        // Output file
        ];
        
        console.log(`Executing ffmpeg with args: ${ffmpegArgs.join(' ')}`);
        
        // Execute the command
        await new Promise((resolve, reject) => {
            execFile(ffmpegPath, ffmpegArgs, (error, stdout, stderr) => {
                if (error) {
                    console.error(`FFmpeg error: ${error.message}`);
                    console.error(`FFmpeg stderr: ${stderr}`);
                    
                    // Try an alternative approach for very short videos
                    console.log("First attempt failed, trying alternative approach...");
                    const altArgs = [
                        '-y',
                        '-i', videoPath,
                        '-vf', 'thumbnail,scale=720:-1',
                        '-frames:v', '1',
                        thumbnailPath
                    ];
                    
                    console.log(`Executing alternative command: ${altArgs.join(' ')}`);
                    
                    execFile(ffmpegPath, altArgs, (altError, altStdout, altStderr) => {
                        if (altError) {
                            console.error(`Alternative approach failed: ${altError.message}`);
                            console.error(`FFmpeg stderr: ${altStderr}`);
                            reject(altError);
                        } else {
                            console.log('Alternative approach succeeded');
                            resolve();
                        }
                    });
                } else {
                    console.log('FFmpeg command completed successfully');
                    resolve();
                }
            });
        });
        
        // Check if thumbnail was created
        if (!fs.existsSync(thumbnailPath)) {
            console.error(`Thumbnail file was not created at: ${thumbnailPath}`);
            throw new Error('Thumbnail file was not created');
        }
        
        return thumbnailPath;
    } catch (error) {
        console.error('Thumbnail generation error:', error);
        throw error;
    }
}

// Get video dimensions
async function getVideoDimensions(videoPath) {
    try {
        const videoInfo = await getVideoInfo(videoPath);
        return {
            width: videoInfo.width,
            height: videoInfo.height,
            duration: videoInfo.duration
        };
    } catch (error) {
        console.error('Error getting video dimensions:', error);
        throw error;
    }
}

// Handle video dimensions request
ipcMain.on('get-video-dimensions', async (event, filePath) => {
    try {
        console.log('Main: Getting video dimensions for:', filePath);
        
        // Use the getVideoDimensions function
        getVideoDimensions(filePath)
            .then(dimensions => {
                console.log(`Video dimensions: ${dimensions.width}x${dimensions.height}`);
                event.sender.send('video-dimensions', dimensions);
            })
            .catch(error => {
                console.error('Error getting video dimensions:', error);
                // Send default dimensions as fallback
                event.sender.send('video-dimensions', { width: 1280, height: 720 });
            });
    } catch (error) {
        console.error('Video dimensions error:', error);
        // Send default dimensions as fallback
        event.sender.send('video-dimensions', { width: 1280, height: 720 });
    }
});

// Handle file conversion
ipcMain.on('convert-files', (event, { filePaths, outputDirectory, settings }) => {
    console.log('Converting files with settings:', settings);
    
    // Ensure output directory exists
    if (!outputDirectory) {
        outputDirectory = path.dirname(filePaths[0]);
        console.log(`No output directory specified, using: ${outputDirectory}`);
    }
    
    if (!fs.existsSync(outputDirectory)) {
        try {
            fs.mkdirSync(outputDirectory, { recursive: true });
            console.log(`Created output directory: ${outputDirectory}`);
        } catch (error) {
            console.error(`Error creating output directory: ${error.message}`);
            event.sender.send('conversion-error', { 
                error: `Failed to create output directory: ${error.message}` 
            });
            return;
        }
    }
    
    // Send start event
    event.sender.send('conversion-start', { totalFiles: filePaths.length });
    
    // Process files sequentially
    let currentIndex = 0;
    let isCancelled = false;
    
    // Handle cancel request
    const cancelListener = () => {
        console.log('Conversion cancelled');
        isCancelled = true;
        event.sender.send('conversion-cancelled');
    };
    
    ipcMain.once('cancel-conversion', cancelListener);
    
    const processNextFile = () => {
        if (isCancelled || currentIndex >= filePaths.length) {
            // Clean up listener
            ipcMain.removeListener('cancel-conversion', cancelListener);
            
            if (!isCancelled) {
                event.sender.send('conversion-complete');
            }
            return;
        }
        
        const filePath = filePaths[currentIndex];
        const fileName = path.basename(filePath);
        
        console.log(`Converting file ${currentIndex + 1}/${filePaths.length}: ${fileName}`);
        
        // Send progress update for file start
        event.sender.send('conversion-progress', {
            fileName,
            currentIndex,
            totalFiles: filePaths.length,
            progress: 0,
            status: 'started'
        });
        
        // Determine output format and path
        const isGif = settings.outputFormat === 'gif' || !settings.outputFormat;
        const isPngSequence = settings.outputFormat === 'png-sequence';
        
        let outputPath;
        if (isGif) {
            outputPath = path.join(outputDirectory, path.basename(filePath, path.extname(filePath)) + '.gif');
        } else if (isPngSequence) {
            // Create a directory for the PNG sequence
            const baseName = path.basename(filePath, path.extname(filePath));
            const sequenceDir = path.join(outputDirectory, baseName + '_frames');
            if (!fs.existsSync(sequenceDir)) {
                fs.mkdirSync(sequenceDir, { recursive: true });
            }
            // Use %04d format for frame numbering (4 digits with leading zeros)
            outputPath = path.join(sequenceDir, 'frame_%04d.png');
            console.log('PNG sequence output path:', outputPath);
        } else {
            // Default to MP4 if not specified
            outputPath = path.join(outputDirectory, path.basename(filePath, path.extname(filePath)) + '.mp4');
        }
        
        // Convert the file
        convertFile(filePath, outputPath, settings, (progress) => {
            if (!isCancelled) {
                event.sender.send('conversion-progress', {
                    fileName,
                    currentIndex,
                    totalFiles: filePaths.length,
                    progress
                });
            }
        })
        .then(() => {
            // Send progress update for file completion
            event.sender.send('conversion-progress', {
                fileName,
                currentIndex,
                totalFiles: filePaths.length,
                progress: 100,
                status: 'completed'
            });
            
            // Move to next file
            currentIndex++;
            processNextFile();
        })
        .catch(error => {
            console.error(`Error converting ${fileName}:`, error);
            event.sender.send('conversion-error', {
                fileName,
                error: error.message
            });
            
            // Continue with next file
            currentIndex++;
            processNextFile();
        });
    };
    
    // Start processing
    processNextFile();
});

// Check for ffmpeg and gifsicle in PATH
function checkDependencies() {
    return new Promise((resolve, reject) => {
        exec('ffmpeg -version', (error) => {
            if (error) {
                console.log('FFmpeg not found in PATH, checking for bundled version...');
                const bundledFFmpeg = getBundledBinaryPath('ffmpeg');
                if (bundledFFmpeg) {
                    ffmpegPath = bundledFFmpeg;
                    console.log(`Using bundled FFmpeg: ${ffmpegPath}`);
                } else {
                    reject('FFmpeg is not installed or not in PATH, and no bundled version found');
                    return;
                }
            } else {
                console.log('FFmpeg found in PATH');
            }
            
            exec('gifsicle --version', (error) => {
                if (error) {
                    console.log('Gifsicle not found in PATH, checking for bundled version...');
                    const bundledGifsicle = getBundledBinaryPath('gifsicle');
                    if (bundledGifsicle) {
                        gifsiclePath = bundledGifsicle;
                        console.log(`Using bundled Gifsicle: ${gifsiclePath}`);
                    } else {
                        reject('Gifsicle is not installed or not in PATH, and no bundled version found');
                        return;
                    }
                } else {
                    console.log('Gifsicle found in PATH');
                }
                
                resolve();
            });
        });
    });
}

// Initialize app
app.whenReady().then(async () => {
    try {
        await checkDependencies();
        createWindow();
        setupIPC(); // Set up IPC handlers
        
        // Check for updates after a short delay to allow the app to load
        setTimeout(() => {
            checkForUpdates();
        }, 3000);
    } catch (error) {
        dialog.showErrorBox('Dependency Error', 
            `${error}\n\nPlease ensure FFmpeg and Gifsicle are installed and added to your system PATH, or reinstall the application.`);
        app.quit();
    }
});

// Helper function to create GitHub API request options
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

// Check for updates
async function checkForUpdates() {
    try {
        console.log('Checking for updates...');
        
        // Get the current version from package.json
        const currentVersion = app.getVersion();
        console.log(`Current version: ${currentVersion}`);
        
        // Get the latest release from GitHub
        const latestRelease = await getLatestRelease();
        console.log(`Latest version: ${latestRelease.version}`);
        
        // Compare versions
        const comparison = compareVersions(latestRelease.version, currentVersion);
        
        if (comparison > 0) {
            console.log(`Update available: ${latestRelease.version}`);
            
            // Send update info to the renderer
            mainWindow.webContents.send('update-available', {
                currentVersion,
                newVersion: latestRelease.version,
                releaseNotes: latestRelease.releaseNotes,
                downloadUrl: latestRelease.downloadUrl
            });
        } else {
            console.log('No update available');
        }
    } catch (error) {
        console.error('Error checking for updates:', error);
    }
}

// Handle update download request
ipcMain.on('download-update', (event, downloadUrl) => {
    downloadUpdate(downloadUrl, event.sender);
});

// Function to handle update downloads
async function downloadUpdate(downloadUrl, sender) {
    try {
        // Create downloads directory if it doesn't exist
        const downloadsDir = path.join(app.getPath('userData'), 'downloads');
        if (!fs.existsSync(downloadsDir)) {
            fs.mkdirSync(downloadsDir, { recursive: true });
        }
        
        // Generate a unique filename for the download
        const downloadPath = path.join(downloadsDir, `GIFME-update-${Date.now()}.zip`);
        
        // Notify the renderer that download is starting
        sender.send('update-download-started');
        
        // Download the update
        await downloadFile(downloadUrl, downloadPath, (progress) => {
            // Send download progress to renderer
            sender.send('update-download-progress', progress);
        });
        
        // Notify the renderer that download is complete
        sender.send('update-download-complete');
        
        // Get the app path
        const appPath = path.dirname(app.getPath('exe'));
        
        // Launch the standalone updater to install the update
        launchStandaloneUpdater(downloadPath, appPath);
    } catch (error) {
        console.error('Error downloading update:', error);
        sender.send('update-error', error.message);
    }
}

// Function to download a file with progress reporting
async function downloadFile(url, destination, progressCallback) {
    return new Promise((resolve, reject) => {
        console.log(`Downloading file from ${url} to ${destination}`);
        
        // Make sure the destination directory exists
        const destDir = path.dirname(destination);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        
        // Function to make the request (handles redirects)
        const makeRequest = (currentUrl) => {
            console.log(`Making request to: ${currentUrl}`);
            
            // Parse the URL
            const urlObj = new URL(currentUrl);
            
            // Create request options
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'User-Agent': 'GIFME-Updater'
                }
            };
            
            // Make the request
            const req = https.request(options, (res) => {
                // Handle redirects
                if (res.statusCode === 301 || res.statusCode === 302) {
                    const redirectUrl = res.headers.location;
                    console.log(`Redirected to: ${redirectUrl}`);
                    makeRequest(redirectUrl);
                    return;
                }
                
                // Check for successful response
                if (res.statusCode !== 200) {
                    reject(new Error(`Server returned status code: ${res.statusCode}`));
                    return;
                }
                
                // Get the total file size
                const totalBytes = parseInt(res.headers['content-length'], 10);
                console.log(`Total file size: ${totalBytes} bytes`);
                
                // Create the output file stream
                const fileStream = fs.createWriteStream(destination);
                
                // Track progress
                let receivedBytes = 0;
                
                // Handle data chunks
                res.on('data', (chunk) => {
                    receivedBytes += chunk.length;
                    fileStream.write(chunk);
                    
                    // Calculate and report progress
                    const percent = Math.round((receivedBytes / totalBytes) * 100);
                    if (progressCallback) {
                        progressCallback({
                            percent,
                            received: receivedBytes,
                            total: totalBytes
                        });
                    }
                });
                
                // Handle end of response
                res.on('end', () => {
                    fileStream.end();
                    console.log(`Download complete: ${destination}`);
                    resolve(destination);
                });
                
                // Handle file stream errors
                fileStream.on('error', (error) => {
                    console.error(`File stream error: ${error.message}`);
                    reject(error);
                });
            });
            
            // Handle request errors
            req.on('error', (error) => {
                console.error(`Request error: ${error.message}`);
                reject(error);
            });
            
            // End the request
            req.end();
        };
        
        // Start the download
        makeRequest(url);
    });
}

// Function to launch the standalone updater
function launchStandaloneUpdater(downloadPath, appPath) {
    try {
        console.log('Preparing to install update...');
        
        // Create a temporary directory for extraction
        const tempDir = path.join(os.tmpdir(), 'gifme-update-' + Date.now());
        console.log(`Creating temporary directory: ${tempDir}`);
        
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Create a batch file to run the update process
        const batchFilePath = path.join(os.tmpdir(), `gifme-update-${Date.now()}.bat`);
        console.log(`Creating batch file: ${batchFilePath}`);
        
        // The batch file will:
        // 1. Wait for the current app to close
        // 2. Extract the ZIP file directly using PowerShell
        // 3. Copy the extracted files to the app directory
        // 4. Start the app again
        // 5. Clean up temporary files
        const batchFileContent = `
@echo off
echo Waiting for application to close...
timeout /t 2 /nobreak > nul

echo Extracting update package...
powershell -Command "Expand-Archive -Path '${downloadPath}' -DestinationPath '${tempDir}' -Force"

echo Updating application...
echo Copying files from ${tempDir} to ${appPath}

:: Make sure resources directory exists
if not exist "${appPath}\\resources" mkdir "${appPath}\\resources"

:: Look for app.asar file
if exist "${tempDir}\\resources\\app.asar" (
    echo Found app.asar in resources directory
    copy /Y "${tempDir}\\resources\\app.asar" "${appPath}\\resources\\app.asar"
) else (
    echo Searching for app.asar in extracted files...
    for /r "${tempDir}" %%i in (app.asar) do (
        echo Found app.asar: %%i
        copy /Y "%%i" "${appPath}\\resources\\app.asar"
    )
)

:: Copy all other files
echo Copying other files...
xcopy "${tempDir}\\*" "${appPath}\\" /E /I /Y

echo Cleaning up...
rmdir /S /Q "${tempDir}"
del "${downloadPath}"

echo Starting application...
start "" "${appPath}\\GIFME.exe"

echo Update complete!
del "%~f0"
exit
`;
        
        fs.writeFileSync(batchFilePath, batchFileContent);
        console.log('Batch file created successfully');
        
        // Launch the batch file and detach from the process
        console.log('Launching batch file...');
        const child = require('child_process').spawn('cmd.exe', ['/c', batchFilePath], {
            detached: true,
            stdio: 'ignore',
            windowsHide: false
        });
        
        // Unref the child process so it can run independently
        child.unref();
        
        // Exit the current app to allow the update to proceed
        console.log('Exiting app for update...');
        setTimeout(() => {
            app.exit(0);
        }, 1000);
    } catch (error) {
        console.error('Error installing update:', error);
        throw error;
    }
}

// Handle update check request from renderer
ipcMain.on('check-for-updates', async (event) => {
    try {
        // Get the current version from package.json
        const currentVersion = app.getVersion();
        console.log(`Current version: ${currentVersion}`);
        
        // Get the latest release from GitHub
        const latestRelease = await getLatestRelease();
        console.log(`Latest version: ${latestRelease.version}`);
        
        // Compare versions
        const comparison = compareVersions(latestRelease.version, currentVersion);
        
        if (comparison > 0) {
            console.log(`Update available: ${latestRelease.version}`);
            
            // Send update info to the renderer
            event.reply('update-available', {
                currentVersion,
                newVersion: latestRelease.version,
                releaseNotes: latestRelease.releaseNotes,
                downloadUrl: latestRelease.downloadUrl
            });
        } else {
            console.log('No update available');
            event.reply('no-update-available', { currentVersion });
        }
    } catch (error) {
        console.error('Error checking for updates:', error);
        event.reply('update-error', error.message);
    }
});

// Convert a file to GIF or PNG sequence
async function convertFile(inputPath, outputPath, settings, progressCallback) {
    try {
        console.log(`Converting ${inputPath} to ${outputPath}`);
        console.log(`FFmpeg settings:`, settings.ffmpeg);
        console.log(`Gifsicle settings:`, settings.gifsicle);
        console.log(`Crop settings:`, settings.cropSettings ? settings.cropSettings[inputPath] : 'None');
        
        // Create temp directory for processing
        const tempDir = path.join(os.tmpdir(), 'gifme-' + Date.now());
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Build FFmpeg command based on settings
        let ffmpegArgs = [
            '-i', inputPath
        ];
        
        // Add start time if specified - FFMPEG setting
        if (settings.ffmpeg?.startTime && parseFloat(settings.ffmpeg.startTime) > 0) {
            ffmpegArgs.push('-ss', settings.ffmpeg.startTime);
        }
        
        // Add duration if specified - FFMPEG setting
        if (settings.ffmpeg?.duration && parseFloat(settings.ffmpeg.duration) > 0) {
            ffmpegArgs.push('-t', settings.ffmpeg.duration);
        }
        
        // Start building the filter chain - FFMPEG setting
        let filterChain = `fps=${settings.ffmpeg?.fps || '15'}`;
        
        // Add scale if specified - FFMPEG setting
        if (settings.ffmpeg?.scale) {
            filterChain += `,scale=${settings.ffmpeg.scale}`;
        }
        
        // Add text overlay if specified and if this file is selected for text overlay - FFMPEG setting
        if (settings.ffmpeg?.textOverlayFiles && settings.ffmpeg.textOverlayFiles.includes(inputPath)) {
            // Use a specific font file that we know exists on the system
            // For Windows, use Arial which is commonly available
            const fontPath = process.platform === 'win32' ? 'C\\:\\\\Windows\\\\Fonts\\\\arial.ttf' : '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
            
            // Add top text if specified
            if (settings.ffmpeg?.textOverlayTop && settings.ffmpeg.textOverlayTop.trim() !== '') {
                const safeTextOverlayTop = settings.ffmpeg.textOverlayTop.replace(/'/g, "\\'");
                filterChain += `,drawtext=text='${safeTextOverlayTop}':fontfile='${fontPath}':fontsize=${settings.ffmpeg.textSize || '24'}:fontcolor=${settings.ffmpeg.textColor || '#ffffff'}:x=(w-text_w)/2:y=10`;
                console.log('Added top text overlay to output');
            }
            
            // Add middle text if specified
            if (settings.ffmpeg?.textOverlayMiddle && settings.ffmpeg.textOverlayMiddle.trim() !== '') {
                const safeTextOverlayMiddle = settings.ffmpeg.textOverlayMiddle.replace(/'/g, "\\'");
                filterChain += `,drawtext=text='${safeTextOverlayMiddle}':fontfile='${fontPath}':fontsize=${settings.ffmpeg.textSize || '24'}:fontcolor=${settings.ffmpeg.textColor || '#ffffff'}:x=(w-text_w)/2:y=(h-th)/2`;
                console.log('Added middle text overlay to output');
            }
            
            // Add bottom text if specified
            if (settings.ffmpeg?.textOverlayBottom && settings.ffmpeg.textOverlayBottom.trim() !== '') {
                const safeTextOverlayBottom = settings.ffmpeg.textOverlayBottom.replace(/'/g, "\\'");
                filterChain += `,drawtext=text='${safeTextOverlayBottom}':fontfile='${fontPath}':fontsize=${settings.ffmpeg.textSize || '24'}:fontcolor=${settings.ffmpeg.textColor || '#ffffff'}:x=(w-text_w)/2:y=h-th-10`;
                console.log('Added bottom text overlay to output');
            }
        }
        
        // Add video filters if specified - FFMPEG setting
        if (settings.ffmpeg?.filters) {
            filterChain += `,${settings.ffmpeg.filters}`;
        }
        
        // Determine output format
        const isGif = settings.outputFormat === 'gif' || !settings.outputFormat;
        const isPngSequence = settings.outputFormat === 'png-sequence';
        
        console.log(`Output format: ${isGif ? 'GIF' : isPngSequence ? 'PNG Sequence' : 'Other'}`);
        
        if (isGif) {
            // Map dithering option to valid FFmpeg values - GIFSICLE setting
            let ditherOption = 'sierra2_4a'; // Default
            switch(settings.gifsicle?.dithering) {
                case 'none':
                    ditherOption = 'none';
                    break;
                case 'floyd_steinberg':
                case 'fs':
                    ditherOption = 'floyd_steinberg';
                    break;
                case 'bayer':
                    ditherOption = 'bayer';
                    break;
                case 'sierra2':
                    ditherOption = 'sierra2_4a';
                    break;
                default:
                    ditherOption = 'sierra2_4a';
            }
            
            // For GIF output, use filter_complex to handle palette generation and application in one command
            let filterComplex = '';
            
            // Ensure fps and scale are valid values - FFMPEG settings
            const fps = settings.ffmpeg?.fps || '15';
            const scale = settings.ffmpeg?.scale || '480:-1';
            
            // Colors is a GIFSICLE setting
            const colors = settings.gifsicle?.colors || '256';
            
            // Build the filter complex without text overlay first
            let baseFilter = `fps=${fps}`;
            
            // Add crop filter if it exists for this file
            if (settings.cropSettings && settings.cropSettings[inputPath]) {
                const cropSetting = settings.cropSettings[inputPath];
                
                // Only apply crop if it's enabled (noCrop is false)
                if (!cropSetting.noCrop && cropSetting.cropWidth && cropSetting.cropHeight) {
                    console.log('Applying crop settings:', cropSetting);
                    
                    // Get video dimensions to calculate proper crop
                    const dimensions = await getVideoDimensions(inputPath);
                    console.log('Actual video dimensions:', dimensions);
                    
                    if (dimensions) {
                        // Extract crop dimensions from settings
                        const { cropX, cropY, cropWidth, cropHeight, imageWidth, imageHeight } = cropSetting;
                        
                        // Calculate scale factors between thumbnail and actual video
                        const scaleX = dimensions.width / imageWidth;
                        const scaleY = dimensions.height / imageHeight;
                        
                        // Scale crop dimensions to match actual video dimensions
                        const scaledX = Math.round(cropX * scaleX);
                        const scaledY = Math.round(cropY * scaleY);
                        const scaledWidth = Math.round(cropWidth * scaleX);
                        const scaledHeight = Math.round(cropHeight * scaleY);
                        
                        // Ensure crop dimensions don't exceed video dimensions
                        const finalX = Math.min(scaledX, dimensions.width - 10);
                        const finalY = Math.min(scaledY, dimensions.height - 10);
                        const finalWidth = Math.min(scaledWidth, dimensions.width - finalX);
                        const finalHeight = Math.min(scaledHeight, dimensions.height - finalY);
                        
                        // Add crop filter if dimensions are valid
                        if (finalWidth >= 10 && finalHeight >= 10) {
                            const cropFilter = `crop=${finalWidth}:${finalHeight}:${finalX}:${finalY}`;
                            baseFilter += `,${cropFilter}`;
                            console.log('Added crop filter:', cropFilter);
                        } else {
                            console.warn('Crop dimensions too small, skipping crop filter');
                        }
                    } else {
                        console.warn('Could not determine video dimensions, skipping crop');
                    }
                }
            }
            
            // Add scale if specified - FFMPEG setting
            if (settings.ffmpeg?.scale) {
                baseFilter += `,scale=${settings.ffmpeg.scale}`;
            }
            
            // Add text overlay if specified and if this file is selected for text overlay - FFMPEG setting
            if (settings.ffmpeg?.textOverlayFiles && settings.ffmpeg.textOverlayFiles.includes(inputPath)) {
                // Use a specific font file that we know exists on the system
                // For Windows, use Arial which is commonly available
                const fontPath = process.platform === 'win32' ? 'C\\:\\\\Windows\\\\Fonts\\\\arial.ttf' : '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
                
                // Add top text if specified
                if (settings.ffmpeg?.textOverlayTop && settings.ffmpeg.textOverlayTop.trim() !== '') {
                    const safeTextOverlayTop = settings.ffmpeg.textOverlayTop.replace(/'/g, "\\'");
                    baseFilter += `,drawtext=text='${safeTextOverlayTop}':fontfile='${fontPath}':fontsize=${settings.ffmpeg.textSize || '24'}:fontcolor=${settings.ffmpeg.textColor || '#ffffff'}:x=(w-text_w)/2:y=10`;
                    console.log('Added top text overlay to output');
                }
                
                // Add middle text if specified
                if (settings.ffmpeg?.textOverlayMiddle && settings.ffmpeg.textOverlayMiddle.trim() !== '') {
                    const safeTextOverlayMiddle = settings.ffmpeg.textOverlayMiddle.replace(/'/g, "\\'");
                    baseFilter += `,drawtext=text='${safeTextOverlayMiddle}':fontfile='${fontPath}':fontsize=${settings.ffmpeg.textSize || '24'}:fontcolor=${settings.ffmpeg.textColor || '#ffffff'}:x=(w-text_w)/2:y=(h-th)/2`;
                    console.log('Added middle text overlay to output');
                }
                
                // Add bottom text if specified
                if (settings.ffmpeg?.textOverlayBottom && settings.ffmpeg.textOverlayBottom.trim() !== '') {
                    const safeTextOverlayBottom = settings.ffmpeg.textOverlayBottom.replace(/'/g, "\\'");
                    baseFilter += `,drawtext=text='${safeTextOverlayBottom}':fontfile='${fontPath}':fontsize=${settings.ffmpeg.textSize || '24'}:fontcolor=${settings.ffmpeg.textColor || '#ffffff'}:x=(w-text_w)/2:y=h-th-10`;
                    console.log('Added bottom text overlay to output');
                }
            }
            
            // Add video filters if specified - FFMPEG setting
            if (settings.ffmpeg?.filters) {
                baseFilter += `,${settings.ffmpeg.filters}`;
            }
            
            // Complete the filter complex for GIF generation
            // Handle palette type for grayscale or other special palettes - GIFSICLE setting
            let palettegenOptions = `max_colors=${colors}`;
            
            // Apply palette type if specified - GIFSICLE setting
            if (settings.gifsicle?.paletteType) {
                switch(settings.gifsicle.paletteType) {
                    case 'grayscale':
                        // For grayscale, we need to convert to grayscale first
                        baseFilter += ',hue=s=0'; // Remove saturation to make grayscale
                        console.log('Applied grayscale filter');
                        break;
                    case 'web':
                        palettegenOptions += ':stats_mode=single';
                        console.log('Applied web palette');
                        break;
                    case 'adaptive':
                        palettegenOptions += ':stats_mode=full';
                        console.log('Applied adaptive palette');
                        break;
                    // Add other palette types as needed
                }
            }
            
            const paletteFilterComplex = `[0:v]${baseFilter},split[a][b];[a]palettegen=${palettegenOptions}[p];[b][p]paletteuse=dither=${ditherOption}`;
            
            // Use filter_complex instead of vf
            ffmpegArgs.push('-filter_complex', paletteFilterComplex);
            
            // Add output path
            ffmpegArgs.push(outputPath);
            
            console.log('GIF generation command:', ffmpegArgs.join(' '));
            
            // Execute FFmpeg to generate the initial GIF
            let ffmpegProcess;
            let totalDuration = 0;
            let lastProgress = 0;
            
            console.log('Starting FFmpeg process...');
            await new Promise((resolve, reject) => {
                // Make sure the output directory exists
                const outputDir = path.dirname(outputPath);
                if (!fs.existsSync(outputDir)) {
                    try {
                        fs.mkdirSync(outputDir, { recursive: true });
                        console.log(`Created output directory: ${outputDir}`);
                    } catch (error) {
                        console.error(`Error creating output directory: ${error.message}`);
                        reject(new Error(`Failed to create output directory: ${error.message}`));
                        return;
                    }
                }
                
                // Delete the output file if it already exists
                if (fs.existsSync(outputPath)) {
                    try {
                        fs.unlinkSync(outputPath);
                        console.log(`Deleted existing output file: ${outputPath}`);
                    } catch (error) {
                        console.error(`Error deleting existing output file: ${error.message}`);
                        // Continue anyway, FFmpeg might overwrite it
                    }
                }
                
                ffmpegProcess = execFile(ffmpegPath, ffmpegArgs, (error, stdout, stderr) => {
                    if (error) {
                        console.error('FFmpeg error:', error);
                        console.error('FFmpeg stderr:', stderr);
                        
                        // Provide more detailed error message for PNG sequence
                        if (isPngSequence) {
                            // Check for common PNG sequence errors
                            if (stderr.includes('No such file or directory')) {
                                reject(new Error('Failed to create PNG sequence: Directory access error'));
                            } else if (stderr.includes('Invalid argument')) {
                                reject(new Error('Failed to create PNG sequence: Invalid output format'));
                            } else {
                                reject(new Error('Failed to create PNG sequence: ' + (error.message || 'Unknown error')));
                            }
                        } else {
                            reject(new Error('FFmpeg process exited with code ' + error.code));
                        }
                    } else {
                        console.log('FFmpeg process completed successfully');
                        
                        // Check if the output file was created
                        if (!fs.existsSync(outputPath)) {
                            console.error('FFmpeg did not create the output file:', outputPath);
                            reject(new Error('FFmpeg did not create the output file'));
                        } else {
                            resolve();
                        }
                    }
                });
            });
            
            // Track progress
            ffmpegProcess.stderr.on('data', (data) => {
                const dataStr = data.toString();
                console.log('FFmpeg progress data:', dataStr);
                
                // Extract duration if not already set
                if (totalDuration === 0) {
                    const durationMatch = dataStr.match(/Duration: (\d{2}):(\d{2}):(\d{2})/);
                    if (durationMatch) {
                        const hours = parseInt(durationMatch[1]);
                        const minutes = parseInt(durationMatch[2]);
                        const seconds = parseInt(durationMatch[3]);
                        totalDuration = hours * 3600 + minutes * 60 + seconds;
                        console.log(`Video duration: ${totalDuration} seconds`);
                    }
                }
                
                // Extract current time
                const timeMatch = dataStr.match(/time=(\d{2}):(\d{2}):(\d{2})/);
                if (timeMatch && totalDuration > 0) {
                    const hours = parseInt(timeMatch[1]);
                    const minutes = parseInt(timeMatch[2]);
                    const seconds = parseInt(timeMatch[3]);
                    const currentTime = hours * 3600 + minutes * 60 + seconds;
                    const progress = Math.min(Math.round((currentTime / totalDuration) * 100), 100);
                    
                    if (progress > lastProgress) {
                        lastProgress = progress;
                        console.log(`FFmpeg progress: ${progress}%`);
                        if (progressCallback) {
                            progressCallback(progress);
                        }
                    }
                }
            });
            
            console.log('FFmpeg process completed, starting Gifsicle...');
            
            // Now apply Gifsicle optimizations
            const gifsicleArgs = [
                '--optimize=' + (settings.gifsicle?.optimization || '1'),
                '--colors=' + (settings.gifsicle?.colors || '256')
            ];
            
            // Add lossy compression if specified - GIFSICLE setting
            if (settings.gifsicle?.lossy && parseInt(settings.gifsicle.lossy) > 0) {
                gifsicleArgs.push('--lossy=' + settings.gifsicle.lossy);
            }
            
            // Add interlacing if specified - GIFSICLE setting
            if (settings.gifsicle?.interlace) {
                gifsicleArgs.push('--interlace');
            }
            
            // Add delay if specified - GIFSICLE setting
            if (settings.gifsicle?.delay) {
                gifsicleArgs.push('--delay=' + settings.gifsicle.delay);
            }
            
            // Add loop settings - GIFSICLE setting
            if (settings.gifsicle?.loop) {
                gifsicleArgs.push('--loopcount=forever');
            } else if (settings.gifsicle?.loopCount > 0) {
                gifsicleArgs.push('--loopcount=' + settings.gifsicle.loopCount);
            }
            
            // Input and output
            gifsicleArgs.push('-i', outputPath, '-o', outputPath);
            
            console.log('Gifsicle optimization command:', gifsicleArgs.join(' '));
            
            // Execute Gifsicle
            await new Promise((resolve, reject) => {
                console.log('Starting Gifsicle process...');
                
                // Check if the output file exists before running Gifsicle
                if (!fs.existsSync(outputPath)) {
                    console.error('FFmpeg output file does not exist:', outputPath);
                    reject(new Error('FFmpeg output file does not exist'));
                    return;
                }
                
                // Use a temporary output file to avoid overwriting issues
                const tempOutputPath = outputPath + '.temp.gif';
                
                // Update output path in arguments
                gifsicleArgs[gifsicleArgs.length - 1] = tempOutputPath;
                
                execFile(gifsiclePath, gifsicleArgs, (error) => {
                    if (error) {
                        console.error('Gifsicle error:', error);
                        reject(error);
                    } else {
                        console.log('Gifsicle process completed successfully');
                        
                        // Replace original with optimized version
                        try {
                            if (fs.existsSync(tempOutputPath)) {
                                // On Windows, we need to unlink the destination file first
                                if (fs.existsSync(outputPath)) {
                                    fs.unlinkSync(outputPath);
                                }
                                fs.renameSync(tempOutputPath, outputPath);
                                console.log('Replaced original GIF with optimized version');
                            } else {
                                console.error('Optimized GIF file not found:', tempOutputPath);
                            }
                        } catch (renameError) {
                            console.error('Error replacing original GIF:', renameError);
                        }
                        
                        resolve();
                    }
                });
            });
            
            console.log('Gifsicle process completed');
            
        } else if (isPngSequence) {
            // For PNG sequence, we'll use the same approach as GIF but without palette generation
            
            // Ensure fps and scale are valid values - FFMPEG settings
            const fps = settings.ffmpeg?.fps || '15';
            const scale = settings.ffmpeg?.scale || '480:-1';
            
            // Build the filter chain with all settings
            let baseFilter = `fps=${fps}`;
            
            // Add crop filter if it exists for this file
            if (settings.cropSettings && settings.cropSettings[inputPath]) {
                const cropSetting = settings.cropSettings[inputPath];
                
                // Only apply crop if it's enabled (noCrop is false)
                if (!cropSetting.noCrop && cropSetting.cropWidth && cropSetting.cropHeight) {
                    console.log('Applying crop settings to PNG sequence:', cropSetting);
                    
                    // Get video dimensions to calculate proper crop
                    const dimensions = await getVideoDimensions(inputPath);
                    console.log('Actual video dimensions:', dimensions);
                    
                    if (dimensions) {
                        // Extract crop dimensions from settings
                        const { cropX, cropY, cropWidth, cropHeight, imageWidth, imageHeight } = cropSetting;
                        
                        // Calculate scale factors between thumbnail and actual video
                        const scaleX = dimensions.width / imageWidth;
                        const scaleY = dimensions.height / imageHeight;
                        
                        // Scale crop dimensions to match actual video dimensions
                        const scaledX = Math.round(cropX * scaleX);
                        const scaledY = Math.round(cropY * scaleY);
                        const scaledWidth = Math.round(cropWidth * scaleX);
                        const scaledHeight = Math.round(cropHeight * scaleY);
                        
                        // Ensure crop dimensions don't exceed video dimensions
                        const finalX = Math.min(scaledX, dimensions.width - 10);
                        const finalY = Math.min(scaledY, dimensions.height - 10);
                        const finalWidth = Math.min(scaledWidth, dimensions.width - finalX);
                        const finalHeight = Math.min(scaledHeight, dimensions.height - finalY);
                        
                        // Add crop filter if dimensions are valid
                        if (finalWidth >= 10 && finalHeight >= 10) {
                            const cropFilter = `crop=${finalWidth}:${finalHeight}:${finalX}:${finalY}`;
                            baseFilter += `,${cropFilter}`;
                            console.log('Added crop filter to PNG sequence:', cropFilter);
                        } else {
                            console.warn('Crop dimensions too small, skipping crop filter');
                        }
                    } else {
                        console.warn('Could not determine video dimensions, skipping crop');
                    }
                }
            }
            
            // Add scale if specified - FFMPEG setting
            if (settings.ffmpeg?.scale) {
                baseFilter += `,scale=${settings.ffmpeg.scale}`;
                console.log('Added scale to PNG sequence:', settings.ffmpeg.scale);
            }
            
            // Add text overlay if specified and if this file is selected for text overlay - FFMPEG setting
            if (settings.ffmpeg?.textOverlayFiles && settings.ffmpeg.textOverlayFiles.includes(inputPath)) {
                // Use a specific font file that we know exists on the system
                // For Windows, use Arial which is commonly available
                const fontPath = process.platform === 'win32' ? 'C\\:\\\\Windows\\\\Fonts\\\\arial.ttf' : '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
                
                // Add top text if specified
                if (settings.ffmpeg?.textOverlayTop && settings.ffmpeg.textOverlayTop.trim() !== '') {
                    const safeTextOverlayTop = settings.ffmpeg.textOverlayTop.replace(/'/g, "\\'");
                    baseFilter += `,drawtext=text='${safeTextOverlayTop}':fontfile='${fontPath}':fontsize=${settings.ffmpeg.textSize || '24'}:fontcolor=${settings.ffmpeg.textColor || '#ffffff'}:x=(w-text_w)/2:y=10`;
                    console.log('Added top text overlay to PNG sequence');
                }
                
                // Add middle text if specified
                if (settings.ffmpeg?.textOverlayMiddle && settings.ffmpeg.textOverlayMiddle.trim() !== '') {
                    const safeTextOverlayMiddle = settings.ffmpeg.textOverlayMiddle.replace(/'/g, "\\'");
                    baseFilter += `,drawtext=text='${safeTextOverlayMiddle}':fontfile='${fontPath}':fontsize=${settings.ffmpeg.textSize || '24'}:fontcolor=${settings.ffmpeg.textColor || '#ffffff'}:x=(w-text_w)/2:y=(h-th)/2`;
                    console.log('Added middle text overlay to PNG sequence');
                }
                
                // Add bottom text if specified
                if (settings.ffmpeg?.textOverlayBottom && settings.ffmpeg.textOverlayBottom.trim() !== '') {
                    const safeTextOverlayBottom = settings.ffmpeg.textOverlayBottom.replace(/'/g, "\\'");
                    baseFilter += `,drawtext=text='${safeTextOverlayBottom}':fontfile='${fontPath}':fontsize=${settings.ffmpeg.textSize || '24'}:fontcolor=${settings.ffmpeg.textColor || '#ffffff'}:x=(w-text_w)/2:y=h-th-10`;
                    console.log('Added bottom text overlay to PNG sequence');
                }
            }
            
            // Add video filters if specified - FFMPEG setting
            if (settings.ffmpeg?.filters) {
                baseFilter += `,${settings.ffmpeg.filters}`;
                console.log('Added custom filters to PNG sequence:', settings.ffmpeg.filters);
            }
            
            // Apply palette type if specified - GIFSICLE setting (for grayscale only)
            if (settings.gifsicle?.paletteType === 'grayscale') {
                // For grayscale, we need to convert to grayscale first
                baseFilter += ',hue=s=0'; // Remove saturation to make grayscale
                console.log('Applied grayscale filter to PNG sequence');
            }
            
            // Set the video filter
            ffmpegArgs.push('-vf', baseFilter);
            
            // Set frame rate for PNG sequence
            ffmpegArgs.push('-r', fps);
            
            // Set output format to PNG
            ffmpegArgs.push('-f', 'image2');
            
            // Make sure the directory exists
            const sequenceDir = path.dirname(outputPath);
            if (!fs.existsSync(sequenceDir)) {
                fs.mkdirSync(sequenceDir, { recursive: true });
            }
            
            // Use the outputPath directly as it's already formatted correctly in the calling code
            ffmpegArgs.push(outputPath);
            
            console.log('PNG sequence generation command:', ffmpegArgs.join(' '));
            
            // Execute FFmpeg to generate the PNG sequence
            let ffmpegProcess;
            let totalDuration = 0;
            let lastProgress = 0;
            
            await new Promise((resolve, reject) => {
                ffmpegProcess = execFile(ffmpegPath, ffmpegArgs, (error, stdout, stderr) => {
                    if (error) {
                        console.error('FFmpeg error:', error);
                        console.error('FFmpeg stderr:', stderr);
                        
                        // Provide more detailed error message for PNG sequence
                        if (isPngSequence) {
                            // Check for common PNG sequence errors
                            if (stderr.includes('No such file or directory')) {
                                reject(new Error('Failed to create PNG sequence: Directory access error'));
                            } else if (stderr.includes('Invalid argument')) {
                                reject(new Error('Failed to create PNG sequence: Invalid output format'));
                            } else {
                                reject(new Error('Failed to create PNG sequence: ' + (error.message || 'Unknown error')));
                            }
                        } else {
                            reject(new Error('FFmpeg process exited with code ' + error.code));
                        }
                    } else {
                        console.log('FFmpeg process completed successfully');
                        resolve();
                    }
                });
                
                // Track progress
                ffmpegProcess.stderr.on('data', (data) => {
                    const durationMatch = data.toString().match(/Duration: (\d{2}):(\d{2}):(\d{2})/);
                    if (durationMatch) {
                        const hours = parseInt(durationMatch[1]);
                        const minutes = parseInt(durationMatch[2]);
                        const seconds = parseInt(durationMatch[3]);
                        totalDuration = hours * 3600 + minutes * 60 + seconds;
                    }
                    
                    const timeMatch = data.toString().match(/time=(\d{2}):(\d{2}):(\d{2})/);
                    if (timeMatch && totalDuration > 0) {
                        const hours = parseInt(timeMatch[1]);
                        const minutes = parseInt(timeMatch[2]);
                        const seconds = parseInt(timeMatch[3]);
                        const currentTime = hours * 3600 + minutes * 60 + seconds;
                        const progress = Math.min(Math.round((currentTime / totalDuration) * 100), 100);
                        
                        if (progress > lastProgress) {
                            lastProgress = progress;
                            if (progressCallback) {
                                progressCallback(progress);
                            }
                        }
                    }
                });
            });
        } else {
            // For other formats, use simple filter
            ffmpegArgs.push('-vf', filterChain);
            ffmpegArgs.push(outputPath);
            
            console.log('Video generation command:', ffmpegArgs.join(' '));
            
            // Execute FFmpeg
            let ffmpegProcess;
            let totalDuration = 0;
            let lastProgress = 0;
            
            await new Promise((resolve, reject) => {
                ffmpegProcess = execFile(ffmpegPath, ffmpegArgs, (error, stdout, stderr) => {
                    if (error) {
                        console.error('FFmpeg error:', error);
                        console.error('FFmpeg stderr:', stderr);
                        
                        // Provide more detailed error message for PNG sequence
                        if (isPngSequence) {
                            // Check for common PNG sequence errors
                            if (stderr.includes('No such file or directory')) {
                                reject(new Error('Failed to create PNG sequence: Directory access error'));
                            } else if (stderr.includes('Invalid argument')) {
                                reject(new Error('Failed to create PNG sequence: Invalid output format'));
                            } else {
                                reject(new Error('Failed to create PNG sequence: ' + (error.message || 'Unknown error')));
                            }
                        } else {
                            reject(new Error('FFmpeg process exited with code ' + error.code));
                        }
                    } else {
                        console.log('FFmpeg process completed successfully');
                        resolve();
                    }
                });
                
                // Track progress
                ffmpegProcess.stderr.on('data', (data) => {
                    const durationMatch = data.toString().match(/Duration: (\d{2}):(\d{2}):(\d{2})/);
                    if (durationMatch) {
                        const hours = parseInt(durationMatch[1]);
                        const minutes = parseInt(durationMatch[2]);
                        const seconds = parseInt(durationMatch[3]);
                        totalDuration = hours * 3600 + minutes * 60 + seconds;
                    }
                    
                    const timeMatch = data.toString().match(/time=(\d{2}):(\d{2}):(\d{2})/);
                    if (timeMatch && totalDuration > 0) {
                        const hours = parseInt(timeMatch[1]);
                        const minutes = parseInt(timeMatch[2]);
                        const seconds = parseInt(timeMatch[3]);
                        const currentTime = hours * 3600 + minutes * 60 + seconds;
                        const progress = Math.min(Math.round((currentTime / totalDuration) * 100), 100);
                        
                        if (progress > lastProgress) {
                            lastProgress = progress;
                            if (progressCallback) {
                                progressCallback(progress);
                            }
                        }
                    }
                });
            });
        }
        
        // Clean up temp files
        try {
            fs.rmdirSync(tempDir, { recursive: true });
        } catch (cleanupError) {
            console.warn('Error cleaning up temp files:', cleanupError);
        }
        
        console.log(`Conversion of ${inputPath} completed successfully`);
        // Return success
        return outputPath;
    } catch (error) {
        console.error('Error in convertFile:', error);
        throw error;
    }
}

// Helper function to get GIF information
async function getGifInfo(gifPath) {
    return new Promise((resolve, reject) => {
        execFile(gifsiclePath, ['--info', gifPath], (error, stdout) => {
            if (error) {
                reject(error);
                return;
            }
            
            const info = {
                width: 0,
                height: 0,
                frames: 0,
                colors: 0
            };
            
            // Extract dimensions
            const dimensionsMatch = stdout.match(/logical screen (\d+)x(\d+)/);
            if (dimensionsMatch) {
                info.width = parseInt(dimensionsMatch[1]);
                info.height = parseInt(dimensionsMatch[2]);
            }
            
            // Extract frame count
            const framesMatch = stdout.match(/(\d+) images/);
            if (framesMatch) {
                info.frames = parseInt(framesMatch[1]);
            }
            
            // Extract color count
            const colorsMatch = stdout.match(/(\d+) colors/);
            if (colorsMatch) {
                info.colors = parseInt(colorsMatch[1]);
            }
            
            resolve(info);
        });
    });
}

// Helper function to get video information
async function getVideoInfo(videoPath) {
    return new Promise((resolve, reject) => {
        console.log(`Getting video info for: ${videoPath} using FFprobe at: ${ffprobePath}`);
        
        const ffprobeArgs = [
            '-v', 'error',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=width,height,duration',
            '-of', 'json',
            videoPath
        ];
        
        try {
            execFile(ffprobePath, ffprobeArgs, (error, stdout, stderr) => {
                if (error) {
                    console.error(`FFprobe error: ${error.message}`);
                    if (stderr) console.error(`FFprobe stderr: ${stderr}`);
                    
                    // Provide fallback values instead of rejecting
                    console.log('Using fallback video dimensions');
                    resolve({
                        width: 1280,
                        height: 720,
                        duration: 10.0
                    });
                    return;
                }
                
                try {
                    const info = JSON.parse(stdout);
                    if (!info.streams || info.streams.length === 0) {
                        console.error('No video streams found in FFprobe output');
                        resolve({
                            width: 1280,
                            height: 720,
                            duration: 10.0
                        });
                        return;
                    }
                    
                    const videoStream = info.streams[0];
                    
                    resolve({
                        width: parseInt(videoStream.width) || 1280,
                        height: parseInt(videoStream.height) || 720,
                        duration: parseFloat(videoStream.duration) || 10.0
                    });
                } catch (parseError) {
                    console.error('Error parsing FFprobe output:', parseError);
                    resolve({
                        width: 1280,
                        height: 720,
                        duration: 10.0
                    });
                }
            });
        } catch (execError) {
            console.error('Error executing FFprobe:', execError);
            resolve({
                width: 1280,
                height: 720,
                duration: 10.0
            });
        }
    });
}

// Set up IPC handlers
function setupIPC() {
    // Handle file drops
    ipcMain.on('files-dropped', (event, filePaths) => {
        console.log('Main process received file paths:', filePaths);
        event.sender.send('files-received', filePaths);
    });
    
    // Handle thumbnail generation
    ipcMain.on('generate-thumbnail', async (event, filePath) => {
        try {
            console.log('Main: Generating thumbnail for:', filePath);
            
            // Use the generateThumbnail function
            const thumbnailPath = await generateThumbnail(filePath);
            
            // Read the thumbnail as base64
            const thumbnailData = fs.readFileSync(thumbnailPath, { encoding: 'base64' });
            console.log(`Thumbnail read as base64, length: ${thumbnailData.length}`);
            
            // Clean up the temporary file
            fs.unlinkSync(thumbnailPath);
            console.log('Temporary thumbnail file deleted');
            
            // Send the thumbnail data back to the renderer
            event.sender.send('thumbnail-generated', { 
                filePath, 
                thumbnail: `data:image/png;base64,${thumbnailData}` 
            });
            console.log('Thumbnail data sent to renderer');
        } catch (error) {
            console.error('Thumbnail generation error:', error);
            event.sender.send('thumbnail-error', { filePath, error: error.message });
        }
    });
    
    // Handle video dimensions request
    ipcMain.on('get-video-dimensions', (event, filePath) => {
        getVideoDimensions(filePath)
            .then(dimensions => {
                event.sender.send('video-dimensions', { filePath, dimensions });
            })
            .catch(error => {
                console.error('Error getting video dimensions:', error);
                event.sender.send('video-dimensions', { filePath, error: error.message });
            });
    });
    
    // Handle conversion request
    ipcMain.on('convert-files', (event, { filePaths, settings }) => {
        console.log('Converting files with settings:', settings);
        
        // Ensure output directory exists
        let outputDirectory = settings.outputDirectory;
        
        // If no output directory is specified, use the directory of the first file
        if (!outputDirectory) {
            outputDirectory = path.dirname(filePaths[0]);
            console.log(`No output directory specified, using: ${outputDirectory}`);
        }
        
        // Update settings with the output directory
        settings.outputDirectory = outputDirectory;
        
        if (!fs.existsSync(outputDirectory)) {
            try {
                fs.mkdirSync(outputDirectory, { recursive: true });
                console.log(`Created output directory: ${outputDirectory}`);
            } catch (error) {
                console.error(`Error creating output directory: ${error.message}`);
                event.sender.send('conversion-error', { 
                    error: `Failed to create output directory: ${error.message}` 
                });
                return;
            }
        }
        
        // Send start event
        event.sender.send('conversion-start', { totalFiles: filePaths.length });
        
        // Process files sequentially
        let currentIndex = 0;
        let isCancelled = false;
        
        // Handle cancel request
        const cancelListener = () => {
            console.log('Conversion cancelled');
            isCancelled = true;
            event.sender.send('conversion-cancelled');
        };
        
        ipcMain.once('cancel-conversion', cancelListener);
        
        const processNextFile = () => {
            if (isCancelled || currentIndex >= filePaths.length) {
                // Clean up listener
                ipcMain.removeListener('cancel-conversion', cancelListener);
                
                if (!isCancelled) {
                    event.sender.send('conversion-complete');
                }
                return;
            }
            
            const filePath = filePaths[currentIndex];
            const fileName = path.basename(filePath);
            
            console.log(`Converting file ${currentIndex + 1}/${filePaths.length}: ${fileName}`);
            
            // Send progress update for file start
            event.sender.send('conversion-progress', {
                fileName,
                currentIndex,
                totalFiles: filePaths.length,
                progress: 0,
                status: 'started'
            });
            
            // Determine output format and path
            const isGif = settings.outputFormat === 'gif' || !settings.outputFormat;
            const isPngSequence = settings.outputFormat === 'png-sequence';
            
            let outputPath;
            if (isGif) {
                outputPath = path.join(outputDirectory, path.basename(filePath, path.extname(filePath)) + '.gif');
            } else if (isPngSequence) {
                // Create a directory for the PNG sequence
                const baseName = path.basename(filePath, path.extname(filePath));
                const sequenceDir = path.join(outputDirectory, baseName + '_frames');
                if (!fs.existsSync(sequenceDir)) {
                    fs.mkdirSync(sequenceDir, { recursive: true });
                }
                // Use %04d format for frame numbering (4 digits with leading zeros)
                outputPath = path.join(sequenceDir, 'frame_%04d.png');
                console.log('PNG sequence output path:', outputPath);
            }
            
            // Convert the file
            convertFile(filePath, outputPath, settings, (progress) => {
                if (!isCancelled) {
                    event.sender.send('conversion-progress', {
                        fileName,
                        currentIndex,
                        totalFiles: filePaths.length,
                        progress
                    });
                }
            })
            .then(() => {
                // Send progress update for file completion
                event.sender.send('conversion-progress', {
                    fileName,
                    currentIndex,
                    totalFiles: filePaths.length,
                    progress: 100,
                    status: 'completed'
                });
                
                // Move to next file
                currentIndex++;
                processNextFile();
            })
            .catch(error => {
                console.error(`Error converting ${fileName}:`, error);
                event.sender.send('conversion-error', {
                    fileName,
                    error: error.message
                });
                
                // Continue with next file
                currentIndex++;
                processNextFile();
            });
        };
        
        // Start processing
        processNextFile();
    });
    
    // Handle update checking
    ipcMain.on('check-for-updates', () => {
        checkForUpdates();
    });
    
    // Handle update download
    ipcMain.on('download-update', (event, downloadUrl) => {
        downloadUpdate(downloadUrl, event.sender);
    });
    
    // New handlers for advanced features
    
    // Generate preview
    ipcMain.handle('generate-preview', async (event, { filePath, settings }) => {
        try {
            console.log('Generating preview for:', filePath);
            console.log('With settings:', settings);
            
            // Create temp directory for preview
            const previewDir = path.join(os.tmpdir(), 'gifme-preview-' + Date.now());
            if (!fs.existsSync(previewDir)) {
                fs.mkdirSync(previewDir, { recursive: true });
            }
            
            // Generate a short preview (first 2 seconds)
            const previewDuration = 2;
            const previewPath = path.join(previewDir, 'preview.gif');
            
            // Build FFmpeg command with settings
            let ffmpegArgs = [
                '-i', filePath,
                '-t', previewDuration.toString()
            ];
            
            // Add start time if specified - FFMPEG setting
            if (settings.ffmpeg?.startTime && parseFloat(settings.ffmpeg.startTime) > 0) {
                ffmpegArgs.unshift('-ss', settings.ffmpeg.startTime);
            }
            
            // Map dithering option to valid FFmpeg values - GIFSICLE setting
            let ditherOption = 'sierra2_4a'; // Default
            switch(settings.gifsicle?.dithering) {
                case 'none':
                    ditherOption = 'none';
                    break;
                case 'floyd_steinberg':
                case 'fs':
                    ditherOption = 'floyd_steinberg';
                    break;
                case 'bayer':
                    ditherOption = 'bayer';
                    break;
                case 'sierra2':
                    ditherOption = 'sierra2_4a';
                    break;
                default:
                    ditherOption = 'sierra2_4a';
            }
            
            // Build the filter complex without text overlay first
            let baseFilter = `fps=${settings.ffmpeg?.fps || '8'}`;
            
            // Add crop filter if it exists for this file
            if (settings.cropSettings && settings.cropSettings[filePath]) {
                const cropSetting = settings.cropSettings[filePath];
                
                // Only apply crop if it's enabled (noCrop is false)
                if (!cropSetting.noCrop && cropSetting.cropWidth && cropSetting.cropHeight) {
                    console.log('Applying crop settings to preview:', cropSetting);
                    
                    // Get video dimensions to calculate proper crop
                    const dimensions = await getVideoDimensions(filePath);
                    console.log('Actual video dimensions:', dimensions);
                    
                    // Calculate scale factors between thumbnail and actual video
                    const scaleX = dimensions.width / cropSetting.imageWidth;
                    const scaleY = dimensions.height / cropSetting.imageHeight;
                    
                    // Scale crop dimensions to match actual video dimensions
                    const scaledX = Math.round(cropSetting.cropX * scaleX);
                    const scaledY = Math.round(cropSetting.cropY * scaleY);
                    const scaledWidth = Math.round(cropSetting.cropWidth * scaleX);
                    const scaledHeight = Math.round(cropSetting.cropHeight * scaleY);
                    
                    // Ensure crop dimensions don't exceed video dimensions
                    const finalX = Math.min(scaledX, dimensions.width - 10);
                    const finalY = Math.min(scaledY, dimensions.height - 10);
                    const finalWidth = Math.min(scaledWidth, dimensions.width - finalX);
                    const finalHeight = Math.min(scaledHeight, dimensions.height - finalY);
                    
                    // Add crop filter if dimensions are valid
                    if (finalWidth >= 10 && finalHeight >= 10) {
                        const cropFilter = `crop=${finalWidth}:${finalHeight}:${finalX}:${finalY}`;
                        baseFilter += `,${cropFilter}`;
                        console.log('Added crop filter to preview:', cropFilter);
                    } else {
                        console.warn('Crop dimensions too small, skipping crop filter');
                    }
                }
            }
            
            // Add scale if specified - FFMPEG setting
            if (settings.ffmpeg?.scale) {
                baseFilter += `,scale=${settings.ffmpeg.scale}`;
            }
            
            // Add text overlay if specified and if this file is selected for text overlay - FFMPEG setting
            if (settings.ffmpeg?.textOverlayFiles && settings.ffmpeg.textOverlayFiles.includes(filePath)) {
                // Use a specific font file that we know exists on the system
                // For Windows, use Arial which is commonly available
                const fontPath = process.platform === 'win32' ? 'C\\:\\\\Windows\\\\Fonts\\\\arial.ttf' : '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
                
                // Add top text if specified
                if (settings.ffmpeg?.textOverlayTop && settings.ffmpeg.textOverlayTop.trim() !== '') {
                    const safeTextOverlayTop = settings.ffmpeg.textOverlayTop.replace(/'/g, "\\'");
                    baseFilter += `,drawtext=text='${safeTextOverlayTop}':fontfile='${fontPath}':fontsize=${settings.ffmpeg.textSize || '24'}:fontcolor=${settings.ffmpeg.textColor || '#ffffff'}:x=(w-text_w)/2:y=10`;
                    console.log('Added top text overlay to preview');
                }
                
                // Add middle text if specified
                if (settings.ffmpeg?.textOverlayMiddle && settings.ffmpeg.textOverlayMiddle.trim() !== '') {
                    const safeTextOverlayMiddle = settings.ffmpeg.textOverlayMiddle.replace(/'/g, "\\'");
                    baseFilter += `,drawtext=text='${safeTextOverlayMiddle}':fontfile='${fontPath}':fontsize=${settings.ffmpeg.textSize || '24'}:fontcolor=${settings.ffmpeg.textColor || '#ffffff'}:x=(w-text_w)/2:y=(h-th)/2`;
                    console.log('Added middle text overlay to preview');
                }
                
                // Add bottom text if specified
                if (settings.ffmpeg?.textOverlayBottom && settings.ffmpeg.textOverlayBottom.trim() !== '') {
                    const safeTextOverlayBottom = settings.ffmpeg.textOverlayBottom.replace(/'/g, "\\'");
                    baseFilter += `,drawtext=text='${safeTextOverlayBottom}':fontfile='${fontPath}':fontsize=${settings.ffmpeg.textSize || '24'}:fontcolor=${settings.ffmpeg.textColor || '#ffffff'}:x=(w-text_w)/2:y=h-th-10`;
                    console.log('Added bottom text overlay to preview');
                }
            }
            
            // Add video filters if specified - FFMPEG setting
            if (settings.ffmpeg?.filters) {
                baseFilter += `,${settings.ffmpeg.filters}`;
            }
            
            // Complete the filter complex for GIF generation
            // Handle palette type for grayscale or other special palettes - GIFSICLE setting
            let palettegenOptions = `max_colors=${settings.gifsicle?.colors || '256'}`;
            
            // Apply palette type if specified - GIFSICLE setting
            if (settings.gifsicle?.paletteType) {
                switch(settings.gifsicle.paletteType) {
                    case 'grayscale':
                        // For grayscale, we need to convert to grayscale first
                        baseFilter += ',hue=s=0'; // Remove saturation to make grayscale
                        console.log('Applied grayscale filter');
                        break;
                    case 'web':
                        palettegenOptions += ':stats_mode=single';
                        console.log('Applied web palette');
                        break;
                    case 'adaptive':
                        palettegenOptions += ':stats_mode=full';
                        console.log('Applied adaptive palette');
                        break;
                    // Add other palette types as needed
                }
            }
            
            const paletteFilterComplex = `[0:v]${baseFilter},split[a][b];[a]palettegen=${palettegenOptions}[p];[b][p]paletteuse=dither=${ditherOption}`;
            
            // Use filter_complex instead of vf
            ffmpegArgs.push('-filter_complex', paletteFilterComplex);
            
            // Add output format
            ffmpegArgs.push('-f', 'gif');
            
            // Add progress reporting
            ffmpegArgs.push('-progress', 'pipe:1');
            
            // Add output path
            ffmpegArgs.push(previewPath);
            
            console.log('Preview generation command:', ffmpegArgs.join(' '));
            
            // Execute FFmpeg to generate preview
            await new Promise((resolve, reject) => {
                execFile(ffmpegPath, ffmpegArgs, (error, stdout, stderr) => {
                    if (error) {
                        console.error('Error generating preview:', error);
                        console.error('FFmpeg stderr:', stderr);
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });
            
            // Apply Gifsicle optimizations - GIFSICLE settings
            const gifsicleArgs = [
                '--optimize=' + (settings.gifsicle?.optimization || '1'),
                '--colors=' + (settings.gifsicle?.colors || '256')
            ];
            
            // Add lossy compression if specified - GIFSICLE setting
            if (settings.gifsicle?.lossy && parseInt(settings.gifsicle.lossy) > 0) {
                gifsicleArgs.push('--lossy=' + settings.gifsicle.lossy);
            }
            
            // Add interlacing if specified - GIFSICLE setting
            if (settings.gifsicle?.interlace) {
                gifsicleArgs.push('--interlace');
            }
            
            // Add delay if specified - GIFSICLE setting
            if (settings.gifsicle?.delay) {
                gifsicleArgs.push('--delay=' + settings.gifsicle.delay);
            }
            
            // Add loop settings - GIFSICLE setting
            if (settings.gifsicle?.loop) {
                gifsicleArgs.push('--loopcount=forever');
            } else if (settings.gifsicle?.loopCount > 0) {
                gifsicleArgs.push('--loopcount=' + settings.gifsicle.loopCount);
            }
            
            // Input and output
            gifsicleArgs.push('-i', previewPath, '-o', previewPath);
            
            console.log('Gifsicle optimization command for preview:', gifsicleArgs.join(' '));
            
            // Execute Gifsicle
            await new Promise((resolve, reject) => {
                execFile(gifsiclePath, gifsicleArgs, (error) => {
                    if (error) {
                        console.error('Error optimizing preview:', error);
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });
            
            // Get preview info
            const previewInfo = await getGifInfo(previewPath);
            
            // Convert preview to data URL
            const previewData = fs.readFileSync(previewPath);
            const previewUrl = 'data:image/gif;base64,' + previewData.toString('base64');
            
            // Clean up temp files
            try {
                fs.unlinkSync(previewPath);
                fs.rmdirSync(previewDir);
            } catch (cleanupError) {
                console.warn('Error cleaning up preview files:', cleanupError);
            }
            
            return {
                url: previewUrl,
                info: previewInfo
            };
        } catch (error) {
            console.error('Error generating preview:', error);
            throw error;
        }
    });
    
    // Estimate file size
    ipcMain.handle('estimate-file-size', async (event, { filePath, settings }) => {
        try {
            console.log('Estimating file size for:', filePath);
            
            // Get video info
            const videoInfo = await getVideoInfo(filePath);
            
            // Calculate estimated size based on settings and video info
            const width = parseInt(settings.scale.split(':')[0]) || videoInfo.width;
            const height = settings.scale.includes('-1') 
                ? Math.round(width * videoInfo.height / videoInfo.width) 
                : parseInt(settings.scale.split(':')[1]);
            
            const fps = parseInt(settings.fps);
            const colors = parseInt(settings.colors);
            const duration = settings.duration ? parseFloat(settings.duration) : videoInfo.duration;
            
            // Calculate frames
            const frameCount = fps * duration;
            
            // Calculate bytes per frame (rough estimate)
            let bytesPerFrame = (width * height * Math.log2(colors) / 8);
            
            // Adjust for optimization level
            const optimizationFactor = [1, 0.8, 0.6][parseInt(settings.optimization) - 1];
            
            // Adjust for lossy compression
            const lossyFactor = settings.lossy > 0 ? (1 - settings.lossy / 300) : 1;
            
            // Calculate total size
            let totalBytes = bytesPerFrame * frameCount * optimizationFactor * lossyFactor;
            
            return {
                estimatedSize: totalBytes,
                width,
                height,
                frameCount,
                duration
            };
        } catch (error) {
            console.error('Error estimating file size:', error);
            throw error;
        }
    });
    
    // Extract color palette
    ipcMain.handle('extract-palette', async (event, { filePath, maxColors }) => {
        try {
            console.log('Extracting color palette from:', filePath);
            
            // Create temp directory for palette
            const tempDir = path.join(os.tmpdir(), 'gifme-palette-' + Date.now());
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            const palettePath = path.join(tempDir, 'palette.png');
            
            // Use FFmpeg to extract palette
            const ffmpegArgs = [
                '-i', filePath,
                '-vf', `fps=1,scale=320:-1,palettegen=max_colors=${maxColors || 256}`,
                '-t', '1',
                palettePath
            ];
            
            // Execute FFmpeg
            await new Promise((resolve, reject) => {
                execFile(ffmpegPath, ffmpegArgs, (error) => {
                    if (error) {
                        console.error('Error extracting palette:', error);
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });
            
            // Use ImageMagick to extract colors from palette
            // Note: This requires ImageMagick to be installed
            const colors = [];
            try {
                const output = execSync(`magick convert ${palettePath} -unique-colors txt:`, { encoding: 'utf8' });
                const colorLines = output.split('\n');
                
                for (const line of colorLines) {
                    const match = line.match(/#([0-9A-F]{6})/i);
                    if (match) {
                        colors.push(match[0]);
                    }
                }
            } catch (error) {
                console.warn('Error extracting colors with ImageMagick, falling back to default palette:', error);
                // Fallback to a default palette
                colors.push('#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF', '#000000');
            }
            
            // Clean up temp files
            try {
                fs.unlinkSync(palettePath);
                fs.rmdirSync(tempDir);
            } catch (cleanupError) {
                console.warn('Error cleaning up palette files:', cleanupError);
            }
            
            return { colors };
        } catch (error) {
            console.error('Error extracting palette:', error);
            throw error;
        }
    });
}
