const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
    sendFiles: (filePaths) => {
        console.log("Preload.js: Sending file paths to main process...", filePaths);
        ipcRenderer.send("files-dropped", filePaths);
    },
    onFilesReceived: (callback) => {
        ipcRenderer.on("files-received", (event, filePaths) => {
            console.log("Preload.js: Received file paths from main:", filePaths);
            callback(filePaths);
        });
    },
    
    // File selection
    selectFiles: () => ipcRenderer.send('select-files'),
    onFilesSelected: (callback) => ipcRenderer.on('files-selected', (_, files) => callback(files)),
    
    // Directory selection
    selectDirectory: () => ipcRenderer.send('select-directory'),
    onDirectorySelected: (callback) => ipcRenderer.on('directory-selected', (_, path) => callback(path)),
    
    // Thumbnail generation
    generateThumbnail: (filePath) => ipcRenderer.send('generate-thumbnail', filePath),
    onThumbnailGenerated: (callback) => ipcRenderer.on('thumbnail-generated', (_, data) => callback(data)),
    onThumbnailError: (callback) => ipcRenderer.on('thumbnail-error', (_, data) => callback(data)),
    
    // Video dimensions
    getVideoDimensions: (filePath) => ipcRenderer.send('get-video-dimensions', filePath),
    onVideoDimensions: (callback) => ipcRenderer.on('video-dimensions', (_, data) => callback(data)),
    removeVideoDimensionsListener: (callback) => ipcRenderer.removeListener('video-dimensions', callback),
    
    // Conversion
    sendConversion: (files, outputDirectory, settings) => {
        console.log("Preload.js: Sending conversion request with settings:", settings);
        ipcRenderer.send('convert-files', { 
            filePaths: files, 
            outputDirectory: outputDirectory,
            settings: settings 
        });
    },
    onConversionStart: (callback) => ipcRenderer.on('conversion-start', (_, data) => callback(data)),
    onConversionProgress: (callback) => ipcRenderer.on('conversion-progress', (_, data) => callback(data)),
    onConversionComplete: (callback) => ipcRenderer.on('conversion-complete', () => callback()),
    onConversionError: (callback) => ipcRenderer.on('conversion-error', (_, error) => callback(error)),
    
    // Cancel conversion
    cancelConversion: () => {
        console.log("Preload.js: Sending cancel conversion request");
        ipcRenderer.send('cancel-conversion');
    },
    onConversionCancelled: (callback) => ipcRenderer.on('conversion-cancelled', () => callback()),
    
    // Update checking
    checkForUpdates: () => {
        console.log("Preload.js: Checking for updates");
        ipcRenderer.send('check-for-updates');
    },
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_, updateInfo) => callback(updateInfo)),
    onNoUpdateAvailable: (callback) => ipcRenderer.on('no-update-available', (_, versionInfo) => callback(versionInfo)),
    onUpdateError: (callback) => ipcRenderer.on('update-error', (_, error) => callback(error)),
    downloadUpdate: (downloadUrl) => {
        console.log("Preload.js: Downloading update from", downloadUrl);
        ipcRenderer.send('download-update', downloadUrl);
    },
    onUpdateDownloadStarted: (callback) => ipcRenderer.on('update-download-started', () => callback()),
    onUpdateDownloadProgress: (callback) => ipcRenderer.on('update-download-progress', (_, progress) => callback(progress)),
    onUpdateDownloadComplete: (callback) => ipcRenderer.on('update-download-complete', () => callback()),
    
    // New features
    
    // Preview generation
    generatePreview: (filePath, settings) => {
        console.log("Preload.js: Generating preview with settings:", settings);
        return ipcRenderer.invoke('generate-preview', { filePath, settings });
    },
    
    // File size estimation
    estimateFileSize: (filePath, settings) => {
        console.log("Preload.js: Estimating file size with settings:", settings);
        return ipcRenderer.invoke('estimate-file-size', { filePath, settings });
    },
    
    // Color palette extraction
    extractPalette: (filePath, maxColors) => {
        console.log("Preload.js: Extracting color palette from:", filePath);
        return ipcRenderer.invoke('extract-palette', { filePath, maxColors });
    }
});
