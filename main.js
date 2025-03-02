const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { exec, execFile } = require('child_process');
const fs = require('fs');

let mainWindow;
let ffmpegPath = 'ffmpeg';
let gifsiclePath = 'gifsicle';

// Function to get the path to the bundled binaries
function getBundledBinaryPath(binaryName) {
    const isProduction = app.isPackaged;
    let binaryDir, binaryPath;
    
    if (isProduction) {
        // In production, the binaries are in the resources directory
        const resourcesPath = process.resourcesPath;
        binaryDir = path.join(resourcesPath, `${binaryName}-win`);
    } else {
        // In development, they're in the project root
        binaryDir = path.join(app.getAppPath(), `${binaryName}-win`);
    }
    
    // The ffmpeg binary is in the bin directory, but gifsicle is in the root
    if (binaryName === 'ffmpeg') {
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
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile("index.html");
}

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
            { name: 'MP4 Videos', extensions: ['mp4'] }
        ]
    });
    
    if (!result.canceled) {
        event.reply('files-selected', result.filePaths);
    }
});

// Generate thumbnail from video
ipcMain.on('generate-thumbnail', async (event, filePath) => {
    try {
        console.log(`Generating thumbnail for: ${filePath}`);
        
        // Create a unique filename for the thumbnail
        const uniqueId = Date.now();
        const thumbnailPath = path.join(app.getPath('temp'), `thumb_${uniqueId}.png`);
        
        console.log(`Thumbnail will be saved to: ${thumbnailPath}`);
        
        // Make sure the temp directory exists
        if (!fs.existsSync(app.getPath('temp'))) {
            fs.mkdirSync(app.getPath('temp'), { recursive: true });
        }
        
        // Use a more reliable ffmpeg command for short videos
        // -ss 0 takes a frame from the very beginning
        // -vframes 1 takes just one frame
        // -an disables audio processing
        const ffmpegArgs = [
            '-y',
            '-i', filePath,
            '-ss', '0',
            '-an',
            '-vframes', '1',
            '-vf', 'scale=120:-1',
            thumbnailPath
        ];
        
        console.log(`Executing ffmpeg with args: ${ffmpegArgs.join(' ')}`);
        
        // Execute the command
        await new Promise((resolve, reject) => {
            if (ffmpegPath.endsWith('.exe')) {
                // Use execFile for the bundled binary
                execFile(ffmpegPath, ffmpegArgs, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`FFmpeg error: ${error.message}`);
                        if (stderr) console.error(`stderr: ${stderr}`);
                        
                        // Try an alternative approach for very short videos
                        console.log("First attempt failed, trying alternative approach...");
                        const altArgs = [
                            '-y',
                            '-i', filePath,
                            '-vf', 'thumbnail,scale=120:-1',
                            '-frames:v', '1',
                            thumbnailPath
                        ];
                        
                        console.log(`Executing alternative command with args: ${altArgs.join(' ')}`);
                        
                        execFile(ffmpegPath, altArgs, (altError, altStdout, altStderr) => {
                            if (altError) {
                                console.error(`Alternative approach failed: ${altError.message}`);
                                if (altStderr) console.error(`stderr: ${altStderr}`);
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
            } else {
                // Use exec for the system command
                const ffmpegCommand = `${ffmpegPath} -y -i "${filePath}" -ss 0 -an -vframes 1 -vf "scale=120:-1" "${thumbnailPath}"`;
                console.log(`Executing: ${ffmpegCommand}`);
                
                exec(ffmpegCommand, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`FFmpeg error: ${error.message}`);
                        if (stderr) console.error(`stderr: ${stderr}`);
                        
                        // Try an alternative approach for very short videos
                        console.log("First attempt failed, trying alternative approach...");
                        const altCommand = `${ffmpegPath} -y -i "${filePath}" -vf "thumbnail,scale=120:-1" -frames:v 1 "${thumbnailPath}"`;
                        console.log(`Executing alternative command: ${altCommand}`);
                        
                        exec(altCommand, (altError, altStdout, altStderr) => {
                            if (altError) {
                                console.error(`Alternative approach failed: ${altError.message}`);
                                if (altStderr) console.error(`stderr: ${altStderr}`);
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
            }
        });
        
        // Check if thumbnail was created
        if (!fs.existsSync(thumbnailPath)) {
            console.error(`Thumbnail file was not created at: ${thumbnailPath}`);
            throw new Error('Thumbnail file was not created');
        }
        
        console.log(`Thumbnail created successfully at: ${thumbnailPath}`);
        
        // Read the thumbnail as base64
        const thumbnailData = fs.readFileSync(thumbnailPath, { encoding: 'base64' });
        console.log(`Thumbnail read as base64, length: ${thumbnailData.length}`);
        
        // Clean up the temporary file
        fs.unlinkSync(thumbnailPath);
        console.log('Temporary thumbnail file deleted');
        
        // Send the thumbnail data back to the renderer
        event.reply('thumbnail-generated', { 
            filePath, 
            thumbnail: `data:image/png;base64,${thumbnailData}` 
        });
        console.log('Thumbnail data sent to renderer');
    } catch (error) {
        console.error('Thumbnail generation error:', error);
        event.reply('thumbnail-error', { filePath, error: error.message });
    }
});

// Handle file conversion
ipcMain.on('convert-files', async (event, { filePaths, outputDirectory }) => {
    try {
        if (!outputDirectory) {
            throw new Error('Output directory not specified');
        }
        
        if (!fs.existsSync(outputDirectory)) {
            fs.mkdirSync(outputDirectory, { recursive: true });
        }
        
        for (const filePath of filePaths) {
            const fileName = path.basename(filePath, '.mp4');
            const outputPath = path.join(outputDirectory, `${fileName}.gif`);
            const optimizedPath = path.join(outputDirectory, `${fileName}_optimized.gif`);
            
            // Improve initial GIF quality with better ffmpeg settings
            await new Promise((resolve, reject) => {
                if (ffmpegPath.endsWith('.exe')) {
                    // Use execFile for the bundled binary
                    const ffmpegArgs = [
                        '-i', filePath,
                        '-vf', 'fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256:stats_mode=full[p];[s1][p]paletteuse=dither=sierra2_4a',
                        '-f', 'gif',
                        outputPath
                    ];
                    
                    execFile(ffmpegPath, ffmpegArgs, (error) => {
                        if (error) reject(error);
                        else resolve();
                    });
                } else {
                    // Use exec for the system command
                    const ffmpegCommand = `${ffmpegPath} -i "${filePath}" -vf "fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256:stats_mode=full[p];[s1][p]paletteuse=dither=sierra2_4a" -f gif "${outputPath}"`;
                    exec(ffmpegCommand, (error) => {
                        if (error) reject(error);
                        else resolve();
                    });
                }
            });

            // Use much gentler optimization with gifsicle
            // -O1 for minimal optimization (preserves more quality)
            // --colors 256 to keep maximum colors
            // --no-warnings to suppress warnings
            // Removed lossy options completely
            await new Promise((resolve, reject) => {
                if (gifsiclePath.endsWith('.exe')) {
                    // Use execFile for the bundled binary
                    const gifsicleArgs = [
                        '-O1',
                        '--colors', '256',
                        '--no-warnings',
                        outputPath,
                        '-o', optimizedPath
                    ];
                    
                    execFile(gifsiclePath, gifsicleArgs, (error) => {
                        if (error) reject(error);
                        else resolve();
                    });
                } else {
                    // Use exec for the system command
                    exec(`${gifsiclePath} -O1 --colors 256 --no-warnings "${outputPath}" -o "${optimizedPath}"`, (error) => {
                        if (error) reject(error);
                        else resolve();
                    });
                }
            });

            // Delete the intermediate GIF
            fs.unlinkSync(outputPath);

            event.reply('conversion-complete', {
                originalPath: filePath,
                outputPath: optimizedPath
            });
        }
        event.reply('all-conversions-complete');
    } catch (error) {
        event.reply('conversion-error', error.message);
    }
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
    } catch (error) {
        dialog.showErrorBox('Dependency Error', 
            `${error}\n\nPlease ensure FFmpeg and Gifsicle are installed and added to your system PATH, or reinstall the application.`);
        app.quit();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Handle dropped files
ipcMain.on("files-dropped", (event, filePaths) => {
    console.log("✅ Main.js: Received file paths from renderer:", filePaths);

    if (!filePaths || filePaths.length === 0) {
        console.warn("⚠️ No valid file paths received.");
        event.reply("conversion-error", "No valid file paths received.");
        return;
    }

    console.log("✅ Sending extracted file paths back to renderer:", filePaths);
    event.reply("files-received", filePaths);
});
