const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { exec, execFile, execFileSync, execSync } = require('child_process');
const fs = require('fs');

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
        console.log('Main: Generating thumbnail for:', filePath);
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

// Handle video dimensions request
ipcMain.on('get-video-dimensions', async (event, filePath) => {
    try {
        console.log('Main: Getting video dimensions for:', filePath);
        
        // Create a temporary file for the output
        const tempDir = app.getPath('temp');
        const tempFile = path.join(tempDir, `dimensions_${Date.now()}.txt`);
        
        await new Promise((resolve, reject) => {
            // Use FFprobe to get video dimensions
            const ffprobePath = ffmpegPath.replace('ffmpeg', 'ffprobe');
            
            if (ffprobePath.endsWith('.exe')) {
                const args = [
                    '-v', 'error',
                    '-select_streams', 'v:0',
                    '-show_entries', 'stream=width,height',
                    '-of', 'csv=p=0',
                    filePath
                ];
                
                execFile(ffprobePath, args, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`FFprobe error: ${error.message}`);
                        if (stderr) console.error(`stderr: ${stderr}`);
                        reject(error);
                    } else {
                        resolve(stdout.trim());
                    }
                });
            } else {
                const command = `${ffprobePath} -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${filePath}"`;
                
                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`FFprobe error: ${error.message}`);
                        if (stderr) console.error(`stderr: ${stderr}`);
                        reject(error);
                    } else {
                        resolve(stdout.trim());
                    }
                });
            }
        }).then(output => {
            // Parse the output (format: width,height)
            const [width, height] = output.split(',').map(Number);
            console.log(`Video dimensions: ${width}x${height}`);
            
            // Send dimensions back to renderer
            event.reply('video-dimensions', { width, height });
        }).catch(error => {
            console.error('Error getting video dimensions:', error);
            // Send default dimensions as fallback
            event.reply('video-dimensions', { width: 1280, height: 720 });
        });
    } catch (error) {
        console.error('Video dimensions error:', error);
        // Send default dimensions as fallback
        event.reply('video-dimensions', { width: 1280, height: 720 });
    }
});

// Handle file conversion
ipcMain.on('convert-files', async (event, data) => {
    try {
        console.log('Main: Received conversion request:', data);
        
        // Extract parameters from the data object
        const { filePaths, outputDirectory, settings } = data;
        
        if (!outputDirectory) {
            console.error('Output directory not specified');
            event.reply('conversion-error', 'Output directory not specified');
            return;
        }
        
        if (!fs.existsSync(outputDirectory)) {
            fs.mkdirSync(outputDirectory, { recursive: true });
        }
        
        const { ffmpeg, gifsicle, cropSettings } = settings || {};
        
        // Check for existing files and ask for confirmation if needed
        const existingFiles = [];
        for (const filePath of filePaths) {
            const fileName = path.basename(filePath, '.mp4');
            const outputPath = path.join(outputDirectory, `${fileName}.gif`);
            if (fs.existsSync(outputPath)) {
                existingFiles.push({ filePath, outputPath });
            }
        }
        
        // If there are existing files, ask for confirmation
        if (existingFiles.length > 0) {
            const message = existingFiles.length === 1
                ? `The file "${path.basename(existingFiles[0].outputPath)}" already exists. Do you want to overwrite it?`
                : `${existingFiles.length} output files already exist. Do you want to overwrite them?`;
                
            const detail = existingFiles.length === 1
                ? 'The existing file will be replaced with the new conversion.'
                : 'All existing files will be replaced with new conversions.';
                
            const response = await dialog.showMessageBox({
                type: 'question',
                buttons: ['Cancel', 'Overwrite'],
                defaultId: 1,
                title: 'Confirm Overwrite',
                message,
                detail
            });
            
            // If user cancels, abort the conversion
            if (response.response === 0) {
                event.reply('conversion-error', 'Conversion cancelled by user');
                return;
            }
        }
        
        // Send total file count for progress tracking
        event.reply('conversion-start', { totalFiles: filePaths.length });
        
        let fileIndex = 0;
        for (const filePath of filePaths) {
            fileIndex++;
            const fileName = path.basename(filePath, '.mp4');
            const outputPath = path.join(outputDirectory, `${fileName}.gif`);
            const optimizedPath = path.join(outputDirectory, `${fileName}_optimized.gif`);
            
            // Notify about current file
            event.reply('conversion-progress', {
                filePath,
                fileName,
                currentIndex: fileIndex,
                totalFiles: filePaths.length,
                status: 'started'
            });
            
            // Apply crop if settings exist for this file
            if (cropSettings && cropSettings[filePath]) {
                const crop = cropSettings[filePath];
                await new Promise((resolve, reject) => {
                    // Calculate the actual crop coordinates based on the original video dimensions
                    // and the scaling information stored with the crop settings
                    
                    try {
                        // Get the actual video dimensions using ffprobe
                        const ffprobePath = ffmpegPath.replace('ffmpeg', 'ffprobe');
                        let actualWidth, actualHeight;
                        
                        // Get video dimensions
                        let dimensionsOutput;
                        if (ffprobePath.endsWith('.exe')) {
                            const args = [
                                '-v', 'error',
                                '-select_streams', 'v:0',
                                '-show_entries', 'stream=width,height',
                                '-of', 'csv=p=0',
                                filePath
                            ];
                            
                            dimensionsOutput = execFileSync(ffprobePath, args).toString().trim();
                        } else {
                            const command = `${ffprobePath} -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${filePath}"`;
                            dimensionsOutput = execSync(command).toString().trim();
                        }
                        
                        // Parse dimensions
                        [actualWidth, actualHeight] = dimensionsOutput.split(',').map(Number);
                        console.log(`Actual video dimensions: ${actualWidth}x${actualHeight}`);
                        console.log(`Original crop settings:`, crop);
                        
                        // Calculate crop parameters
                        let cropX, cropY, cropWidth, cropHeight;
                        
                        // If we have the preview dimensions, calculate the scale factor
                        if (crop.imageWidth && crop.imageHeight) {
                            // Calculate scale factors
                            const scaleX = actualWidth / crop.imageWidth;
                            const scaleY = actualHeight / crop.imageHeight;
                            
                            console.log(`Scale factors: ${scaleX}x${scaleY}`);
                            console.log(`Preview dimensions: ${crop.imageWidth}x${crop.imageHeight}`);
                            
                            // Scale the crop coordinates
                            cropX = Math.round(crop.x * scaleX);
                            cropY = Math.round(crop.y * scaleY);
                            cropWidth = Math.round(crop.width * scaleX);
                            cropHeight = Math.round(crop.height * scaleY);
                            
                            console.log(`Scaled crop: x=${cropX}, y=${cropY}, width=${cropWidth}, height=${cropHeight}`);
                        } else {
                            // Fallback to original crop values if no scaling info
                            cropX = Math.round(crop.x);
                            cropY = Math.round(crop.y);
                            cropWidth = Math.round(crop.width);
                            cropHeight = Math.round(crop.height);
                            
                            console.log(`Direct crop (no scaling): x=${cropX}, y=${cropY}, width=${cropWidth}, height=${cropHeight}`);
                        }
                        
                        // Ensure crop dimensions are valid and within video bounds
                        cropX = Math.max(0, cropX);
                        cropY = Math.max(0, cropY);
                        
                        // Make sure crop width and height are positive and not too large
                        cropWidth = Math.max(16, Math.min(actualWidth - cropX, cropWidth));
                        cropHeight = Math.max(16, Math.min(actualHeight - cropY, cropHeight));
                        
                        // If crop dimensions are invalid or too close to the edge, use the full video
                        if (cropWidth <= 16 || cropHeight <= 16 || 
                            cropWidth > actualWidth || cropHeight > actualHeight ||
                            cropX + cropWidth > actualWidth || cropY + cropHeight > actualHeight) {
                            
                            console.error(`Invalid crop dimensions: ${cropWidth}x${cropHeight} at position ${cropX},${cropY}`);
                            console.log(`Using full video dimensions instead: ${actualWidth}x${actualHeight}`);
                            
                            // Use full video dimensions instead
                            cropX = 0;
                            cropY = 0;
                            cropWidth = actualWidth;
                            cropHeight = actualHeight;
                            
                            // Don't use crop filter at all
                            resolve({
                                noCrop: true
                            });
                            return;
                        }
                        
                        console.log(`Final crop parameters: x=${cropX}, y=${cropY}, width=${cropWidth}, height=${cropHeight}`);
                        
                        // Store crop parameters for use in the conversion step
                        resolve({
                            cropX,
                            cropY,
                            cropWidth,
                            cropHeight
                        });
                    } catch (error) {
                        console.error('Error getting video dimensions for crop:', error);
                        // Don't use crop filter if there was an error
                        resolve({
                            noCrop: true
                        });
                    }
                }).then(cropParams => {
                    // Store crop parameters for use in the conversion step
                    cropSettings[filePath] = {
                        ...cropSettings[filePath],
                        ...cropParams
                    };
                }).catch(error => {
                    console.error('Failed to process crop settings:', error);
                    // Continue with conversion without crop
                    delete cropSettings[filePath];
                });
            }
            
            // Convert to GIF with quality settings
            const inputPath = filePath; // Always use original file as input
            const fps = ffmpeg?.fps || 12;
            const scale = ffmpeg?.scale || '480:-1';
            let additionalFilters = ffmpeg?.filters ? `,${ffmpeg.filters}` : '';
            
            // Add crop filter if crop settings exist and are valid
            if (cropSettings && cropSettings[filePath] && 
                !cropSettings[filePath].noCrop &&
                cropSettings[filePath].cropWidth && cropSettings[filePath].cropHeight) {
                const crop = cropSettings[filePath];
                
                // Get the actual video dimensions if available
                const actualWidth = crop.imageWidth || 1920; // Default to 1920 if not available
                const actualHeight = crop.imageHeight || 1080; // Default to 1080 if not available
                
                console.log(`Original crop settings:`, crop);
                console.log(`Actual video dimensions: ${actualWidth}x${actualHeight}`);
                
                // Calculate scale factor based on the target width
                const scaleFactorWidth = parseInt(scale.split(':')[0]) / actualWidth;
                console.log(`Scale factor based on width: ${scaleFactorWidth}`);
                
                // Calculate the scaled crop dimensions
                const scaledCropWidth = Math.round(crop.cropWidth * scaleFactorWidth);
                const scaledCropHeight = Math.round(crop.cropHeight * scaleFactorWidth);
                const scaledCropX = Math.round(crop.cropX * scaleFactorWidth);
                const scaledCropY = Math.round(crop.cropY * scaleFactorWidth);
                
                console.log(`Scaled crop dimensions: ${scaledCropWidth}x${scaledCropHeight} at position ${scaledCropX},${scaledCropY}`);
                
                // Validate crop dimensions
                if (scaledCropWidth < 16 || scaledCropHeight < 16) {
                    console.warn(`Skipping crop due to invalid dimensions: ${scaledCropWidth}x${scaledCropHeight}`);
                    // Don't apply crop filter if dimensions are too small
                } else {
                    // The crop filter should be applied BEFORE the scale in the filter chain
                    // Move the crop filter to the beginning of additionalFilters
                    const cropFilter = `crop=${crop.cropWidth}:${crop.cropHeight}:${crop.cropX}:${crop.cropY}`;
                    
                    // Reorder the filters: crop should come before scale
                    // Remove the leading comma from additionalFilters since we'll add it in the new string
                    const cleanAdditionalFilters = additionalFilters.startsWith(',') ? additionalFilters.substring(1) : additionalFilters;
                    
                    // Create a new filter chain with crop at the beginning
                    const newFilterChain = `${cropFilter},scale=${scale}:flags=lanczos${cleanAdditionalFilters ? ',' + cleanAdditionalFilters : ''}`;
                    
                    // Replace the scale filter in the command with our new filter chain
                    const scalePattern = `fps=${fps},scale=${scale}:flags=lanczos`;
                    const newPattern = `fps=${fps},${newFilterChain}`;
                    
                    // Store the new filter chain to be used later
                    additionalFilters = `,${cropFilter}`;
                    
                    console.log(`Adding crop filter: ${cropFilter}`);
                    console.log(`New filter chain will be: fps=${fps},${newFilterChain},split[s0][s1];[s0]palettegen=max_colors=256:stats_mode=full[p];[s1][p]paletteuse=dither=sierra2_4a`);
                }
            }
            
            // Delete existing output files if they exist to prevent overwrite issues
            if (fs.existsSync(outputPath)) {
                try {
                    fs.unlinkSync(outputPath);
                    console.log(`Deleted existing output file: ${outputPath}`);
                } catch (error) {
                    console.error(`Failed to delete existing output file: ${error.message}`);
                    // Continue anyway, FFmpeg might overwrite it
                }
            }
            
            if (fs.existsSync(optimizedPath)) {
                try {
                    fs.unlinkSync(optimizedPath);
                    console.log(`Deleted existing optimized file: ${optimizedPath}`);
                } catch (error) {
                    console.error(`Failed to delete existing optimized file: ${error.message}`);
                    // Continue anyway, gifsicle might overwrite it
                }
            }
            
            // Enable debug mode to log more information
            const debugMode = true;
            
            // Add a variable to track the current conversion processes
            let currentProcesses = {
                ffmpeg: null,
                gifsicle: null
            };
            
            // Add a handler for cancel requests
            ipcMain.once('cancel-conversion', () => {
                console.log('Received cancel request from renderer');
                
                // Kill any active processes
                if (currentProcesses.ffmpeg) {
                    try {
                        currentProcesses.ffmpeg.kill('SIGTERM');
                        console.log('FFmpeg process terminated');
                    } catch (error) {
                        console.error('Error terminating FFmpeg process:', error);
                    }
                }
                
                if (currentProcesses.gifsicle) {
                    try {
                        currentProcesses.gifsicle.kill('SIGTERM');
                        console.log('Gifsicle process terminated');
                    } catch (error) {
                        console.error('Error terminating Gifsicle process:', error);
                    }
                }
                
                // Notify renderer that conversion was cancelled
                event.reply('conversion-cancelled');
            });

            await new Promise((resolve, reject) => {
                if (ffmpegPath.endsWith('.exe')) {
                    // Prepare the filter chain
                    let filterChain;
                    
                    if (additionalFilters.includes('crop=')) {
                        // If we have a crop filter, we need to apply it before scaling
                        // Extract the crop filter from additionalFilters
                        const cropMatch = additionalFilters.match(/,crop=([^,]+)/);
                        const cropFilter = cropMatch ? cropMatch[0].substring(1) : ''; // Remove the leading comma
                        
                        // Remove the crop filter from additionalFilters
                        const otherFilters = additionalFilters.replace(/,crop=[^,]+/, '');
                        
                        // Build the new filter chain with crop before scale
                        filterChain = `fps=${fps},${cropFilter},scale=${scale}:flags=lanczos${otherFilters},split[s0][s1];[s0]palettegen=max_colors=256:stats_mode=full[p];[s1][p]paletteuse=dither=sierra2_4a`;
                    } else {
                        // Standard filter chain without crop
                        filterChain = `fps=${fps},scale=${scale}:flags=lanczos${additionalFilters},split[s0][s1];[s0]palettegen=max_colors=256:stats_mode=full[p];[s1][p]paletteuse=dither=sierra2_4a`;
                    }
                    
                    const ffmpegArgs = [
                        '-i', inputPath,
                        '-vf', filterChain,
                        '-f', 'gif',
                        '-progress', 'pipe:1',
                        outputPath
                    ];
                    
                    if (debugMode) {
                        console.log(`Full FFmpeg command: ${ffmpegPath} ${ffmpegArgs.join(' ')}`);
                        console.log(`Video filters: ${filterChain}`);
                    } else {
                        console.log(`Executing FFmpeg command: ${ffmpegPath} ${ffmpegArgs.join(' ')}`);
                    }
                    
                    const ffmpegProcess = execFile(ffmpegPath, ffmpegArgs, (error, stdout, stderr) => {
                        currentProcesses.ffmpeg = null;
                        
                        if (error) {
                            console.error(`FFmpeg error: ${error.message}`);
                            if (stderr) console.error(`stderr: ${stderr}`);
                            
                            // Create a more user-friendly error message
                            let errorMessage = 'Conversion failed';
                            
                            if (stderr && stderr.includes('Invalid too big or non positive size')) {
                                errorMessage = 'Invalid crop dimensions. Please try a different crop area.';
                                
                                // Log more details about the error
                                if (debugMode && cropSettings && cropSettings[filePath]) {
                                    const crop = cropSettings[filePath];
                                    console.error('Crop settings that caused the error:', crop);
                                }
                            } else if (stderr && stderr.includes('No such file or directory')) {
                                errorMessage = 'Input file not found or inaccessible.';
                            } else if (stderr && stderr.includes('Permission denied')) {
                                errorMessage = 'Permission denied. Cannot write to output location.';
                            } else if (error.code === 'ENOENT') {
                                errorMessage = 'FFmpeg executable not found.';
                            } else {
                                // Include part of the original error for debugging
                                const shortError = error.message.split('\n')[0];
                                errorMessage = `Conversion error: ${shortError}`;
                            }
                            
                            reject(new Error(errorMessage));
                        } else {
                            console.log('FFmpeg command completed successfully');
                            resolve();
                        }
                    });
                    
                    // Store the process reference
                    currentProcesses.ffmpeg = ffmpegProcess;
                    
                    // Log progress data
                    ffmpegProcess.stdout.on('data', (data) => {
                        console.log(`FFmpeg progress: ${data.toString()}`);
                    });
                    
                    ffmpegProcess.stderr.on('data', (data) => {
                        console.log(`FFmpeg info: ${data.toString()}`);
                    });
                } else {
                    // Prepare the filter chain
                    let filterChain;
                    
                    if (additionalFilters.includes('crop=')) {
                        // If we have a crop filter, we need to apply it before scaling
                        // Extract the crop filter from additionalFilters
                        const cropMatch = additionalFilters.match(/,crop=([^,]+)/);
                        const cropFilter = cropMatch ? cropMatch[0].substring(1) : ''; // Remove the leading comma
                        
                        // Remove the crop filter from additionalFilters
                        const otherFilters = additionalFilters.replace(/,crop=[^,]+/, '');
                        
                        // Build the new filter chain with crop before scale
                        filterChain = `fps=${fps},${cropFilter},scale=${scale}:flags=lanczos${otherFilters},split[s0][s1];[s0]palettegen=max_colors=256:stats_mode=full[p];[s1][p]paletteuse=dither=sierra2_4a`;
                    } else {
                        // Standard filter chain without crop
                        filterChain = `fps=${fps},scale=${scale}:flags=lanczos${additionalFilters},split[s0][s1];[s0]palettegen=max_colors=256:stats_mode=full[p];[s1][p]paletteuse=dither=sierra2_4a`;
                    }
                    
                    const ffmpegCommand = `${ffmpegPath} -i "${inputPath}" -vf "${filterChain}" -f gif -progress pipe:1 "${outputPath}"`;
                    
                    if (debugMode) {
                        console.log(`Full FFmpeg command: ${ffmpegCommand}`);
                        console.log(`Video filters: ${filterChain}`);
                    } else {
                        console.log(`Executing FFmpeg command: ${ffmpegCommand}`);
                    }
                    
                    const ffmpegProcess = exec(ffmpegCommand, (error, stdout, stderr) => {
                        currentProcesses.ffmpeg = null;
                        
                        if (error) {
                            console.error(`FFmpeg error: ${error.message}`);
                            if (stderr) console.error(`stderr: ${stderr}`);
                            
                            // Create a more user-friendly error message
                            let errorMessage = 'Conversion failed';
                            
                            if (stderr && stderr.includes('Invalid too big or non positive size')) {
                                errorMessage = 'Invalid crop dimensions. Please try a different crop area.';
                                
                                // Log more details about the error
                                if (debugMode && cropSettings && cropSettings[filePath]) {
                                    const crop = cropSettings[filePath];
                                    console.error('Crop settings that caused the error:', crop);
                                }
                            } else if (stderr && stderr.includes('No such file or directory')) {
                                errorMessage = 'Input file not found or inaccessible.';
                            } else if (stderr && stderr.includes('Permission denied')) {
                                errorMessage = 'Permission denied. Cannot write to output location.';
                            } else if (error.code === 'ENOENT') {
                                errorMessage = 'FFmpeg executable not found.';
                            } else {
                                // Include part of the original error for debugging
                                const shortError = error.message.split('\n')[0];
                                errorMessage = `Conversion error: ${shortError}`;
                            }
                            
                            reject(new Error(errorMessage));
                        } else {
                            console.log('FFmpeg command completed successfully');
                            resolve();
                        }
                    });
                    
                    // Store the process reference
                    currentProcesses.ffmpeg = ffmpegProcess;
                    
                    // Log progress data
                    ffmpegProcess.stdout.on('data', (data) => {
                        console.log(`FFmpeg progress: ${data.toString()}`);
                    });
                    
                    ffmpegProcess.stderr.on('data', (data) => {
                        console.log(`FFmpeg info: ${data.toString()}`);
                    });
                }
            });
            
            // Optimize with gifsicle using quality settings
            const optimization = gifsicle?.optimization || 3;
            const lossy = gifsicle?.lossy || 80;
            const colors = gifsicle?.colors || 256;
            
            await new Promise((resolve, reject) => {
                if (gifsiclePath.endsWith('.exe')) {
                    const gifsicleArgs = [
                        '--optimize=' + optimization,
                        '--lossy=' + lossy,
                        '--colors=' + colors,
                        '-o', optimizedPath,
                        outputPath
                    ];
                    
                    const gifsicleProcess = execFile(gifsiclePath, gifsicleArgs, (error, stdout, stderr) => {
                        currentProcesses.gifsicle = null;
                        
                        if (error) {
                            console.error(`Gifsicle error: ${error.message}`);
                            if (stderr) console.error(`stderr: ${stderr}`);
                            
                            // If the output file exists, we can still use it even if optimization failed
                            if (fs.existsSync(outputPath)) {
                                console.log('Using unoptimized GIF since optimization failed');
                                // Copy the unoptimized file to the optimized path
                                fs.copyFileSync(outputPath, optimizedPath);
                                resolve();
                            } else {
                                reject(error);
                            }
                        } else {
                            console.log('Gifsicle command completed successfully');
                            resolve();
                        }
                    });
                    
                    // Store the process reference
                    currentProcesses.gifsicle = gifsicleProcess;
                } else {
                    const gifsicleCommand = `${gifsiclePath} --optimize=${optimization} --lossy=${lossy} --colors=${colors} -o "${optimizedPath}" "${outputPath}"`;
                    
                    const gifsicleProcess = exec(gifsicleCommand, (error, stdout, stderr) => {
                        currentProcesses.gifsicle = null;
                        
                        if (error) {
                            console.error(`Gifsicle error: ${error.message}`);
                            if (stderr) console.error(`stderr: ${stderr}`);
                            
                            // If the output file exists, we can still use it even if optimization failed
                            if (fs.existsSync(outputPath)) {
                                console.log('Using unoptimized GIF since optimization failed');
                                // Copy the unoptimized file to the optimized path
                                fs.copyFileSync(outputPath, optimizedPath);
                                resolve();
                            } else {
                                reject(error);
                            }
                        } else {
                            console.log('Gifsicle command completed successfully');
                            resolve();
                        }
                    });
                    
                    // Store the process reference
                    currentProcesses.gifsicle = gifsicleProcess;
                }
            });
            
            // Replace original with optimized version
            fs.unlinkSync(outputPath);
            fs.renameSync(optimizedPath, outputPath);
            
            // After conversion is complete for this file
            event.reply('conversion-progress', {
                filePath,
                fileName,
                currentIndex: fileIndex,
                totalFiles: filePaths.length,
                status: 'completed'
            });
        }
        
        event.reply('conversion-complete');
    } catch (error) {
        console.error('Conversion error:', error);
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
