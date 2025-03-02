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
    }
});
