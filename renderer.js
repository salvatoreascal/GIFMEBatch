document.addEventListener("DOMContentLoaded", () => {
    const dropZone = document.getElementById("drop-zone");
    const fileList = document.getElementById("file-list");
    const convertButton = document.getElementById("convert-button");
    let filesToConvert = [];

    dropZone.addEventListener("dragover", (event) => {
        event.preventDefault();
        dropZone.classList.add("dragging");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragging");
    });

    dropZone.addEventListener("drop", async (event) => {
        event.preventDefault();
        dropZone.classList.remove("dragging");

        console.log("✅ File drop detected!");
        const files = Array.from(event.dataTransfer.files);
        console.log("Dropped files:", files);

        if (files.length === 0) {
            console.warn("⚠️ No files detected in the drop event.");
            return;
        }

        // ✅ Extract file paths before sending them
        const filePaths = files.map(file => file.path).filter(Boolean);
        console.log("Extracted file paths:", filePaths);

        if (filePaths.length === 0) {
            console.error("❌ No valid file paths extracted. Check Electron sandbox settings.");
            return;
        }

        // ✅ Send file paths to `preload.js`
        if (window.electron && window.electron.sendFiles) {
            console.log("✅ Sending file paths to main process...", filePaths);
            window.electron.sendFiles(filePaths);
        } else {
            console.error("❌ window.electron.sendFiles is not defined! Check preload.js.");
        }
    });

    window.electron.onFilesReceived((filePaths) => {
        console.log("Renderer.js: Received file paths from main:", filePaths);

        filesToConvert = filePaths;
        fileList.innerHTML = "";

        filePaths.forEach((filePath) => {
            const listItem = document.createElement("li");
            listItem.textContent = filePath;
            fileList.appendChild(listItem);
        });
    });

    convertButton.addEventListener("click", () => {
        if (filesToConvert.length > 0) {
            console.log("✅ Sending files for conversion:", filesToConvert);
            window.electron.sendFiles(filesToConvert);
        } else {
            alert("No valid files selected for conversion.");
        }
    });
});
