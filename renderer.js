document.addEventListener("DOMContentLoaded", () => {
    const dropZone = document.getElementById('drop-zone');
    const fileList = document.getElementById('file-list');
    const saveLocationPath = document.getElementById('saveLocationPath');
    const browseButton = document.getElementById('browseButton');
    const convertButton = document.getElementById('convert-button');
    const donateButton = document.getElementById('donateButton');
    const status = document.getElementById('status');
    let filesToConvert = [];

    if (!dropZone || !fileList || !saveLocationPath || !browseButton || !convertButton || !donateButton || !status) {
        console.error('One or more required elements not found:', {
            dropZone: !!dropZone,
            fileList: !!fileList,
            saveLocationPath: !!saveLocationPath,
            browseButton: !!browseButton,
            convertButton: !!convertButton,
            donateButton: !!donateButton,
            status: !!status
        });
        return;
    }

    // Initialize event listeners for drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        document.body.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    // Highlight drop zone
    dropZone.addEventListener('dragenter', () => dropZone.classList.add('dragover'));
    dropZone.addEventListener('dragover', () => dropZone.classList.add('dragover'));
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', () => dropZone.classList.remove('dragover'));

    // Handle file drops
    dropZone.addEventListener('drop', (event) => {
        event.preventDefault();
        dropZone.classList.remove('dragover');

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

    // Handle click on drop zone
    dropZone.addEventListener('click', () => {
        window.electron.selectFiles();
    });

    // Handle files selected from dialog
    window.electron.onFilesSelected((files) => {
        if (files && files.length > 0) {
            addFilesToList(files);
        }
    });

    // Handle browse button click
    browseButton.addEventListener('click', () => {
        window.electron.selectDirectory();
    });

    // Handle directory selection
    window.electron.onDirectorySelected((path) => {
        if (path) {
            saveLocationPath.value = path;
            updateConvertButtonState();
        }
    });

    // Handle convert button click
    convertButton.addEventListener('click', () => {
        if (filesToConvert.length === 0) {
            alert("No valid files selected for conversion.");
            return;
        }
        
        if (!saveLocationPath.value) {
            alert("Please select a save location first.");
            return;
        }
        
        // Clear previous status and reset UI
        status.innerHTML = '';
        
        // Reset progress tracking variables
        completedFiles = 0;
        totalFiles = 0;
        conversionStartTime = 0;
        
        // Reset and hide the progress container - it will be shown again when conversion starts
        const progressContainer = document.getElementById('progress-container');
        progressContainer.style.display = 'none';
        
        // Reset progress bar elements
        document.getElementById('progress-bar').style.width = '0%';
        document.getElementById('progress-count').textContent = '0/0';
        document.getElementById('progress-percent').textContent = '0%';
        
        const progressEta = document.getElementById('progress-eta');
        progressEta.textContent = 'Calculating...';
        progressEta.style.color = ''; // Reset color to default
        
        document.getElementById('progress-file').textContent = '';

        console.log("✅ Sending files for conversion:", filesToConvert);
        const settings = getCurrentSettings();
        
        // Ensure output directory is set
        settings.outputDirectory = saveLocationPath.value;
        
        console.log("✅ Conversion settings:", settings);
        window.electron.sendConversion(filesToConvert, settings);
    });

    // Handle donation button click
    donateButton.addEventListener('click', () => {
        const walletAddress = "AfT3cj981fHVbgnssm1FPDjFHQwEe4HiGPoEQcWf47rb";
        navigator.clipboard.writeText(walletAddress)
            .then(() => {
                alert("Solana wallet address copied to clipboard: " + walletAddress);
            })
            .catch((err) => {
                console.error('Could not copy text: ', err);
            });
    });

    // File management functions
    function addFilesToList(files) {
        files.forEach(filePath => {
            if (!filesToConvert.includes(filePath)) {
                filesToConvert.push(filePath);
                
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.dataset.path = filePath;
                
                const thumbnail = document.createElement('img');
                thumbnail.className = 'file-thumbnail';
                thumbnail.alt = 'Loading...';
                thumbnail.style.backgroundColor = '#ddd';
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                const trashIcon = document.createElement('span');
                trashIcon.className = 'trash-icon';
                deleteBtn.appendChild(trashIcon);
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    removeFile(filePath);
                };
                
                const fileName = document.createElement('div');
                fileName.className = 'file-name';
                fileName.textContent = filePath.split('\\').pop();
                
                fileItem.appendChild(thumbnail);
                fileItem.appendChild(deleteBtn);
                fileItem.appendChild(fileName);
                fileList.appendChild(fileItem);
                
                window.electron.generateThumbnail(filePath);
            }
        });
        
        updateConvertButtonState();
        updateCropThumbnails();
    }

    function removeFile(filePath) {
        const index = filesToConvert.indexOf(filePath);
        if (index !== -1) {
            filesToConvert.splice(index, 1);
        }
        
        const fileItem = document.querySelector(`.file-item[data-path="${CSS.escape(filePath)}"]`);
        if (fileItem) {
            fileItem.remove();
        }
        
        updateConvertButtonState();
        updateCropThumbnails();
    }

    function updateConvertButtonState() {
        convertButton.disabled = filesToConvert.length === 0 || !saveLocationPath.value;
    }

    // Progress bar variables
    let totalFiles = 0;
    let completedFiles = 0;
    let conversionStartTime = 0;
    
    // Initialize progress bar
    function initializeProgressBar(fileCount) {
        const progressContainer = document.getElementById('progress-container');
        const progressBar = document.getElementById('progress-bar');
        const progressCount = document.getElementById('progress-count');
        const progressPercent = document.getElementById('progress-percent');
        const progressEta = document.getElementById('progress-eta');
        const progressFile = document.getElementById('progress-file');
        
        // Reset progress
        totalFiles = fileCount;
        completedFiles = 0;
        conversionStartTime = Date.now();
        
        // Update UI
        progressBar.style.width = '0%';
        progressCount.textContent = `0/${totalFiles} files`;
        progressPercent.textContent = '0%';
        progressEta.textContent = 'Calculating...';
        progressFile.textContent = 'Starting conversion...';
        
        // Show progress container
        progressContainer.style.display = 'block';
    }
    
    // Update progress bar
    function updateProgressBar(fileName, isCompleted = false, currentIndex = null, totalCount = null) {
        const progressBar = document.getElementById('progress-bar');
        const progressCount = document.getElementById('progress-count');
        const progressPercent = document.getElementById('progress-percent');
        const progressEta = document.getElementById('progress-eta');
        const progressFile = document.getElementById('progress-file');

        // Update total files count if provided
        if (totalCount !== null) {
            totalFiles = totalCount;
        }

        // Update completed files count
        if (currentIndex !== null) {
            // If we have a current index, use it directly
            completedFiles = isCompleted ? currentIndex : currentIndex - 1;
        } else if (isCompleted) {
            // Only increment if we don't have a current index and this is a completion event
            completedFiles++;
        }

        // Calculate percentage
        const percent = totalFiles > 0 ? Math.round((completedFiles / totalFiles) * 100) : 0;
        
        // Update progress bar
        progressBar.style.width = `${percent}%`;
        progressCount.textContent = `${completedFiles}/${totalFiles} files`;
        progressPercent.textContent = `${percent}%`;

        // Update file name being processed
        if (fileName) {
            progressFile.textContent = `Converting: ${fileName}`;
        } else if (completedFiles >= totalFiles && totalFiles > 0) {
            progressFile.textContent = 'All files converted successfully!';
        }

        // Calculate and update ETA
        if (completedFiles > 0 && completedFiles < totalFiles) {
            const elapsedTime = Date.now() - conversionStartTime;
            const timePerFile = elapsedTime / completedFiles;
            const remainingFiles = totalFiles - completedFiles;
            const remainingTime = timePerFile * remainingFiles;
            
            // Format remaining time
            const seconds = Math.round(remainingTime / 1000);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            
            progressEta.textContent = `ETA: ${minutes}m ${remainingSeconds}s`;
        } else if (completedFiles >= totalFiles && totalFiles > 0) {
            // All files completed
            const totalTime = Date.now() - conversionStartTime;
            const seconds = Math.round(totalTime / 1000);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            
            progressEta.textContent = `Completed in ${minutes}m ${remainingSeconds}s`;
            progressEta.style.color = '#4caf50'; // Green color for success
        }

        // Show progress container
        document.getElementById('progress-container').style.display = 'block';
    }

    // Handle conversion events
    window.electron.onConversionStart((data) => {
        console.log('Conversion started:', data);
        initializeProgressBar(data.totalFiles);
    });

    window.electron.onConversionProgress((data) => {
        console.log('Conversion progress:', data);
        const fileName = data.fileName || data.filePath.split('\\').pop();
        
        if (data.status === 'started') {
            // Update status message
            const status = document.getElementById('status');
            status.innerHTML += `<p class="success">Converting: ${fileName}</p>`;
            
            // Force immediate update of progress bar
            updateProgressBar(fileName, false, data.currentIndex, data.totalFiles);
        } else if (data.status === 'completed') {
            // Update progress when a file is completed
            updateProgressBar(fileName, true, data.currentIndex, data.totalFiles);
        } else if (data.status === 'error') {
            // Handle error during conversion
            const status = document.getElementById('status');
            status.innerHTML += `<p class="error">Error converting: ${fileName} - ${data.error || 'Unknown error'}</p>`;
        }
    });

    window.electron.onConversionComplete(() => {
        console.log('Conversion complete');

        // Update progress bar to show completion without incrementing the counter
        // Use a special flag to indicate we're just updating the UI, not counting a new file
        const progressBar = document.getElementById('progress-bar');
        const progressCount = document.getElementById('progress-count');
        const progressPercent = document.getElementById('progress-percent');
        const progressEta = document.getElementById('progress-eta');
        const progressFile = document.getElementById('progress-file');
        
        // Ensure the progress shows 100%
        progressBar.style.width = '100%';
        progressCount.textContent = `${completedFiles}/${totalFiles} files`;
        progressPercent.textContent = '100%';
        progressFile.textContent = 'All files converted successfully!';
        
        // Show completion time
        const totalTime = Date.now() - conversionStartTime;
        const seconds = Math.round(totalTime / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        progressEta.textContent = `Completed in ${minutes}m ${remainingSeconds}s`;
        progressEta.style.color = '#4caf50'; // Green color for success

        // Update status message
        const status = document.getElementById('status');
        status.innerHTML += '<p class="success">All conversions completed!</p>';

        // Don't hide the progress container - keep it visible until next conversion
        // The progress container will be reset and hidden when a new conversion starts

        // Clear file list
        fileList.innerHTML = '';
        filesToConvert = [];
        updateConvertButtonState();

        // Enable convert button
        document.getElementById('convert-button').disabled = false;
    });

    window.electron.onConversionError((error) => {
        console.error('Conversion error:', error);

        // Update status with error message
        const status = document.getElementById('status');
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error';

        // Format the error message
        if (error === 'Conversion cancelled by user') {
            errorMessage.textContent = 'Conversion cancelled: File overwrite was declined.';
        } else {
            errorMessage.textContent = `Error during conversion: ${error}`;
        }

        status.appendChild(errorMessage);
        status.scrollTop = status.scrollHeight;

        // Enable convert button
        document.getElementById('convert-button').disabled = false;

        // Update progress bar to show error state but don't hide it
        const progressEta = document.getElementById('progress-eta');
        progressEta.textContent = 'Conversion failed - see error message below';
        progressEta.style.color = '#ff3333';
    });
    
    window.electron.onConversionCancelled(() => {
        console.log('Conversion cancelled by user');
        
        // Update UI to show cancellation
        const progressEta = document.getElementById('progress-eta');
        progressEta.textContent = 'Conversion cancelled by user';
        progressEta.style.color = '#ff3333';
        
        // Enable convert button
        document.getElementById('convert-button').disabled = false;
        
        // Don't hide the progress container - keep it visible until next conversion
    });
    
    // Add cancel button event listener
    document.getElementById('cancel-conversion').addEventListener('click', () => {
        if (confirm('Are you sure you want to cancel the conversion?')) {
            console.log('User requested to cancel conversion');
            window.electron.cancelConversion();
        }
    });

    // Handle thumbnail events
    window.electron.onThumbnailGenerated((data) => {
        const fileItem = document.querySelector(`.file-item[data-path="${CSS.escape(data.filePath)}"]`);
        if (fileItem) {
            const thumbnail = fileItem.querySelector('.file-thumbnail');
            if (thumbnail) {
                thumbnail.src = data.thumbnail;
            }
        }
        
        // Also update crop preview if this is the selected file
        if (selectedFilePath === data.filePath && cropper) {
            const cropperImage = document.getElementById('cropperImage');
            if (cropperImage) {
                const oldSrc = cropperImage.src;
                cropperImage.src = data.thumbnail;
                
                // Reinitialize cropper if the source changed
                if (oldSrc !== data.thumbnail) {
                    cropper.replace(data.thumbnail);
                }
            }
        }
    });

    window.electron.onThumbnailError((data) => {
        const fileItem = document.querySelector(`.file-item[data-path="${CSS.escape(data.filePath)}"]`);
        if (fileItem) {
            const thumbnail = fileItem.querySelector('.file-thumbnail');
            if (thumbnail) {
                thumbnail.alt = 'Error';
                thumbnail.style.backgroundColor = '#ffcccc';
            }
        }
    });

    // Handle files received from main process
    window.electron.onFilesReceived((filePaths) => {
        console.log("Renderer.js: Received file paths from main:", filePaths);
        addFilesToList(filePaths);
    });

    // Tab functionality
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to selected tab and content
            tab.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
            
            // Update crop thumbnails when switching to crop tab
            if (tabId === 'crop') {
                updateCropThumbnails();
            }
        });
    });

    // Preset functionality
    const presetSelect = document.getElementById('presetSelect');
    const savePresetBtn = document.getElementById('savePreset');
    const deletePresetBtn = document.getElementById('deletePreset');
    
    // Load presets from localStorage
    function loadPresets() {
        const customPresets = localStorage.getItem('customPresets');
        if (customPresets) {
            const presets = JSON.parse(customPresets);
            
            // Remove existing custom presets
            Array.from(presetSelect.options).forEach(option => {
                if (isCustomPreset(option.value)) {
                    presetSelect.removeChild(option);
                }
            });
            
            // Add custom presets
            Object.keys(presets).forEach(presetName => {
                const option = document.createElement('option');
                option.value = presetName;
                option.textContent = presetName;
                presetSelect.appendChild(option);
            });
        }
    }
    
    // Check if preset is custom
    function isCustomPreset(presetName) {
        const defaultPresets = ['default', 'best', 'high', 'medium', 'low', 'potato', 'custom'];
        return !defaultPresets.includes(presetName);
    }
    
    // Load preset settings
    function loadPreset(presetName) {
        let preset;
        
        if (presetName === 'default') {
            preset = {
                ffmpeg: { fps: '12', scale: '480:-1', filters: '' },
                gifsicle: { optimization: '3', lossy: '80', colors: '256' }
            };
        } else if (presetName === 'best') {
            preset = {
                ffmpeg: { fps: '24', scale: '720:-1', filters: '' },
                gifsicle: { optimization: '3', lossy: '20', colors: '256' }
            };
        } else if (presetName === 'high') {
            preset = {
                ffmpeg: { fps: '15', scale: '480:-1', filters: '' },
                gifsicle: { optimization: '3', lossy: '40', colors: '192' }
            };
        } else if (presetName === 'medium') {
            preset = {
                ffmpeg: { fps: '12', scale: '360:-1', filters: '' },
                gifsicle: { optimization: '3', lossy: '80', colors: '128' }
            };
        } else if (presetName === 'low') {
            preset = {
                ffmpeg: { fps: '10', scale: '320:-1', filters: '' },
                gifsicle: { optimization: '2', lossy: '120', colors: '64' }
            };
        } else if (presetName === 'potato') {
            preset = {
                ffmpeg: { fps: '8', scale: '240:-1', filters: '' },
                gifsicle: { optimization: '1', lossy: '150', colors: '32' }
            };
        } else if (presetName === 'custom') {
            // For custom, we don't change any values, just enable the save button
            savePresetBtn.disabled = false;
            deletePresetBtn.disabled = true;
            return;
        } else {
            // Load custom preset from localStorage
            const customPresets = JSON.parse(localStorage.getItem('customPresets') || '{}');
            preset = customPresets[presetName];
        }
        
        if (preset) {
            document.getElementById('fps').value = preset.ffmpeg.fps;
            document.getElementById('scale').value = preset.ffmpeg.scale;
            document.getElementById('filters').value = preset.ffmpeg.filters;
            document.getElementById('optimization').value = preset.gifsicle.optimization;
            document.getElementById('lossy').value = preset.gifsicle.lossy;
            document.getElementById('colors').value = preset.gifsicle.colors;
        }
        
        // Update save/delete buttons
        savePresetBtn.disabled = presetName !== 'custom';
        deletePresetBtn.disabled = !isCustomPreset(presetName);
    }
    
    // Initialize presets
    loadPresets();
    
    // Handle preset selection
    presetSelect.addEventListener('change', () => {
        loadPreset(presetSelect.value);
    });
    
    // Handle save preset button
    savePresetBtn.addEventListener('click', () => {
        // Show the custom modal instead of using prompt()
        const presetModal = document.getElementById('presetModal');
        const presetNameInput = document.getElementById('presetNameInput');
        const savePresetNameBtn = document.getElementById('savePresetNameBtn');
        const cancelPresetBtn = document.getElementById('cancelPresetBtn');
        
        // Clear previous input
        presetNameInput.value = '';
        
        // Show the modal
        presetModal.style.display = 'flex';
        
        // Focus the input
        presetNameInput.focus();
        
        // Handle save button click
        const saveHandler = () => {
            const presetName = presetNameInput.value.trim();
            
            if (presetName !== '') {
                // Get current settings
                const settings = getCurrentSettings();
                
                // Save to localStorage
                const customPresets = JSON.parse(localStorage.getItem('customPresets') || '{}');
                customPresets[presetName] = settings;
                localStorage.setItem('customPresets', JSON.stringify(customPresets));
                
                // Check if this preset name already exists in the dropdown
                let existingOption = null;
                for (let i = 0; i < presetSelect.options.length; i++) {
                    if (presetSelect.options[i].value === presetName) {
                        existingOption = presetSelect.options[i];
                        break;
                    }
                }
                
                // Add or update the option in the select dropdown
                if (existingOption) {
                    existingOption.textContent = presetName;
                } else {
                    const option = document.createElement('option');
                    option.value = presetName;
                    option.textContent = presetName;
                    presetSelect.appendChild(option);
                }
                
                // Select the new preset
                presetSelect.value = presetName;
                
                // Update button states
                deletePresetBtn.disabled = false;
                savePresetBtn.disabled = true;
                
                // Hide the modal
                presetModal.style.display = 'none';
                
                // Remove event listeners
                savePresetNameBtn.removeEventListener('click', saveHandler);
                cancelPresetBtn.removeEventListener('click', cancelHandler);
                presetNameInput.removeEventListener('keydown', keyHandler);
            }
        };
        
        // Handle cancel button click
        const cancelHandler = () => {
            presetModal.style.display = 'none';
            
            // Remove event listeners
            savePresetNameBtn.removeEventListener('click', saveHandler);
            cancelPresetBtn.removeEventListener('click', cancelHandler);
            presetNameInput.removeEventListener('keydown', keyHandler);
        };
        
        // Handle key press
        const keyHandler = (e) => {
            if (e.key === 'Enter') {
                saveHandler();
            } else if (e.key === 'Escape') {
                cancelHandler();
            }
        };
        
        // Add event listeners
        savePresetNameBtn.addEventListener('click', saveHandler);
        cancelPresetBtn.addEventListener('click', cancelHandler);
        presetNameInput.addEventListener('keydown', keyHandler);
    });
    
    // Handle delete preset button
    deletePresetBtn.addEventListener('click', () => {
        const presetName = presetSelect.value;
        
        if (isCustomPreset(presetName)) {
            // Show the custom confirmation dialog
            const confirmModal = document.getElementById('confirmModal');
            const confirmMessage = document.getElementById('confirmMessage');
            const confirmBtn = document.getElementById('confirmBtn');
            const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');
            
            // Set the confirmation message
            confirmMessage.textContent = `Are you sure you want to delete the preset "${presetName}"?`;
            
            // Show the modal
            confirmModal.style.display = 'flex';
            
            // Handle confirm button click
            const confirmHandler = () => {
                // Remove from localStorage
                const customPresets = JSON.parse(localStorage.getItem('customPresets') || '{}');
                delete customPresets[presetName];
                localStorage.setItem('customPresets', JSON.stringify(customPresets));
                
                // Remove from select
                const option = presetSelect.querySelector(`option[value="${presetName}"]`);
                if (option) {
                    presetSelect.removeChild(option);
                }
                
                // Select default preset
                presetSelect.value = 'default';
                loadPreset('default');
                
                // Hide the modal
                confirmModal.style.display = 'none';
                
                // Remove event listeners
                confirmBtn.removeEventListener('click', confirmHandler);
                cancelConfirmBtn.removeEventListener('click', cancelHandler);
            };
            
            // Handle cancel button click
            const cancelHandler = () => {
                confirmModal.style.display = 'none';
                
                // Remove event listeners
                confirmBtn.removeEventListener('click', confirmHandler);
                cancelConfirmBtn.removeEventListener('click', cancelHandler);
            };
            
            // Add event listeners
            confirmBtn.addEventListener('click', confirmHandler);
            cancelConfirmBtn.addEventListener('click', cancelHandler);
        }
    });

    // Crop functionality
    let cropper = null;
    let selectedFilePath = null;
    let originalImageDimensions = null;

    function initializeCropper(filePath) {
        selectedFilePath = filePath;
        initCropper(filePath);
    }

    function initCropper(filePath) {
        selectedFilePath = filePath;
        const cropPreviewImage = document.getElementById('cropPreviewImage');
        
        // Clear previous content
        cropPreviewImage.innerHTML = '';
        
        // Create image element
        const img = document.createElement('img');
        img.id = 'cropperImage';
        img.style.maxWidth = '100%';
        
        // Try to get the thumbnail from the files tab
        const existingThumbnail = document.querySelector(`.file-item[data-path="${CSS.escape(filePath)}"] .file-thumbnail`);
        if (existingThumbnail && existingThumbnail.src) {
            // Use a higher quality image for cropping
            window.electron.generateThumbnail(filePath);
            
            // Temporarily use the thumbnail while waiting for the higher quality image
            img.src = existingThumbnail.src;
        }
        
        cropPreviewImage.appendChild(img);
        
        // Destroy previous cropper if exists
        if (cropper) {
            cropper.destroy();
        }
        
        // Get original video dimensions for proper scaling
        getVideoDimensions(filePath).then(dimensions => {
            originalImageDimensions = dimensions;
            console.log(`Original video dimensions: ${dimensions.width}x${dimensions.height}`);
            
            // If there are existing crop settings, apply them
            if (cropSettings.has(filePath)) {
                const savedCrop = cropSettings.get(filePath);
                console.log('Applying saved crop settings:', savedCrop);
            }
        }).catch(err => {
            console.error('Failed to get video dimensions:', err);
        });
        
        // Initialize cropper
        cropper = new Cropper(img, {
            viewMode: 1,
            dragMode: 'crop',
            aspectRatio: NaN,
            autoCropArea: 0.8,
            restore: false,
            guides: true,
            center: true,
            highlight: true,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: true,
            minContainerWidth: 250,
            minContainerHeight: 250,
            ready() {
                // Update crop dimensions inputs
                updateCropDimensions();
                
                // Add instructions for drag mode toggle
                const instructions = document.createElement('div');
                instructions.className = 'crop-instructions';
                instructions.innerHTML = '<p><strong>Tip:</strong> Double-click to toggle between crop and move modes</p>';
                instructions.style.marginTop = '10px';
                instructions.style.fontSize = '12px';
                instructions.style.color = '#666';
                cropPreviewImage.appendChild(instructions);
            },
            crop(event) {
                updateCropDimensions();
            }
        });
    }

    // Get video dimensions using the Electron API
    function getVideoDimensions(filePath) {
        return new Promise((resolve, reject) => {
            // Use a default dimension if we can't get the actual dimensions
            // This is a fallback in case we can't get the actual dimensions
            const defaultDimensions = { width: 1280, height: 720 };
            
            try {
                // Request video dimensions from the main process
                window.electron.getVideoDimensions(filePath);
                
                // Set up a one-time listener for the response
                const dimensionsHandler = (dimensions) => {
                    window.electron.removeVideoDimensionsListener(dimensionsHandler);
                    resolve(dimensions);
                };
                
                window.electron.onVideoDimensions(dimensionsHandler);
                
                // Set a timeout in case the main process doesn't respond
                setTimeout(() => {
                    window.electron.removeVideoDimensionsListener(dimensionsHandler);
                    console.warn('Timed out waiting for video dimensions, using defaults');
                    resolve(defaultDimensions);
                }, 5000);
            } catch (err) {
                console.error('Error requesting video dimensions:', err);
                resolve(defaultDimensions);
            }
        });
    }

    // Set up crop action buttons
    document.getElementById('applyCrop').addEventListener('click', () => {
        if (cropper && selectedFilePath) {
            const cropData = cropper.getData();
            const cropBoxData = cropper.getCropBoxData();
            const canvasData = cropper.getCanvasData();
            
            // Validate crop dimensions
            if (cropData.width < 16 || cropData.height < 16) {
                alert('Crop area is too small. Please select a larger area (minimum 16x16 pixels).');
                return;
            }
            
            // Ensure crop is within the image bounds
            if (cropData.x < 0 || cropData.y < 0 || 
                cropData.x + cropData.width > canvasData.naturalWidth || 
                cropData.y + cropData.height > canvasData.naturalHeight) {
                
                alert('Crop area is outside the image bounds. Please adjust your selection.');
                
                // Reset the cropper to ensure it's within bounds
                cropper.reset();
                return;
            }
            
            console.log('Applying crop with dimensions:', {
                x: cropData.x,
                y: cropData.y,
                width: cropData.width,
                height: cropData.height,
                imageWidth: canvasData.naturalWidth,
                imageHeight: canvasData.naturalHeight
            });
            
            // Store both the crop data and scaling information
            cropSettings.set(selectedFilePath, {
                x: Math.round(cropData.x),
                y: Math.round(cropData.y),
                width: Math.round(cropData.width),
                height: Math.round(cropData.height),
                // Store scaling information for accurate conversion
                imageWidth: canvasData.naturalWidth,
                imageHeight: canvasData.naturalHeight,
                cropBoxWidth: cropBoxData.width,
                cropBoxHeight: cropBoxData.height
            });
            
            console.log(`Applied crop settings to ${selectedFilePath}`, cropSettings.get(selectedFilePath));
            
            // Update the thumbnail to show it's been cropped
            const thumbnailItem = document.querySelector(`.thumbnails-list .file-item[data-path="${CSS.escape(selectedFilePath)}"]`);
            if (thumbnailItem) {
                thumbnailItem.classList.add('has-crop');
                
                // Create or update crop indicator with improved styling and icon
                let indicator = thumbnailItem.querySelector('.crop-indicator');
                if (!indicator) {
                    indicator = document.createElement('div');
                    indicator.className = 'crop-indicator';
                    thumbnailItem.appendChild(indicator);
                }
                
                // Set indicator content and styling
                indicator.textContent = 'CROPPED';
                indicator.style.position = 'absolute';
                indicator.style.top = '5px';
                indicator.style.right = '5px';
                indicator.style.backgroundColor = 'rgba(76, 175, 80, 0.85)';
                indicator.style.color = 'white';
                indicator.style.borderRadius = '4px';
                indicator.style.padding = '2px 6px';
                indicator.style.fontSize = '10px';
                indicator.style.fontWeight = 'bold';
                
                // If we're in the crop tab, update the crop thumbnail to reflect the new crop
                if (document.getElementById('crop-tab').classList.contains('active')) {
                    // Destroy the current cropper instance
                    if (cropper) {
                        cropper.destroy();
                        cropper = null;
                    }
                    
                    // Re-initialize the cropper with the new settings
                    initializeCropper(selectedFilePath);
                }
            }
        }
    });
    
    document.getElementById('applyToAll').addEventListener('click', () => {
        if (cropper && selectedFilePath) {
            const cropData = cropper.getData();
            const cropBoxData = cropper.getCropBoxData();
            const canvasData = cropper.getCanvasData();
            
            filesToConvert.forEach(filePath => {
                cropSettings.set(filePath, {
                    x: Math.round(cropData.x),
                    y: Math.round(cropData.y),
                    width: Math.round(cropData.width),
                    height: Math.round(cropData.height),
                    // Store scaling information for accurate conversion
                    imageWidth: canvasData.naturalWidth,
                    imageHeight: canvasData.naturalHeight,
                    cropBoxWidth: cropBoxData.width,
                    cropBoxHeight: cropBoxData.height
                });
                
                // Update thumbnails to show they've been cropped
                const thumbnailItem = document.querySelector(`.thumbnails-list .file-item[data-path="${CSS.escape(filePath)}"]`);
                if (thumbnailItem) {
                    thumbnailItem.classList.add('has-crop');
                    
                    // Create or update crop indicator with improved styling and icon
                    let indicator = thumbnailItem.querySelector('.crop-indicator');
                    if (!indicator) {
                        indicator = document.createElement('div');
                        indicator.className = 'crop-indicator';
                        thumbnailItem.appendChild(indicator);
                    }
                    
                    // Set indicator content and styling
                    indicator.textContent = 'CROPPED';
                    indicator.style.position = 'absolute';
                    indicator.style.top = '5px';
                    indicator.style.right = '5px';
                    indicator.style.backgroundColor = 'rgba(76, 175, 80, 0.85)';
                    indicator.style.color = 'white';
                    indicator.style.borderRadius = '4px';
                    indicator.style.padding = '2px 6px';
                    indicator.style.fontSize = '10px';
                    indicator.style.fontWeight = 'bold';
                    indicator.style.display = 'flex';
                    indicator.style.alignItems = 'center';
                    indicator.style.justifyContent = 'center';
                    indicator.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
                    
                    // Add tooltip
                    indicator.title = 'This file has custom crop settings applied';
                }
            });
            
            console.log('Applied crop settings to all files', cropData);
        }
    });
    
    document.getElementById('resetCrop').addEventListener('click', () => {
        if (selectedFilePath) {
            // Remove crop settings for this file
            cropSettings.delete(selectedFilePath);
            
            console.log(`Reset crop settings for ${selectedFilePath}`);
            
            // Update the thumbnail to show it's no longer cropped
            const thumbnailItem = document.querySelector(`.thumbnails-list .file-item[data-path="${CSS.escape(selectedFilePath)}"]`);
            if (thumbnailItem) {
                thumbnailItem.classList.remove('has-crop');
                
                // Remove crop indicator if it exists
                const indicator = thumbnailItem.querySelector('.crop-indicator');
                if (indicator) {
                    thumbnailItem.removeChild(indicator);
                }
            }
            
            // Reset the cropper if it exists
            if (cropper) {
                cropper.reset();
                
                // Update crop dimensions inputs
                updateCropDimensions();
                
                // Show a message to the user
                alert('Crop settings have been reset for this file.');
            }
        }
    });
    
    // Set up crop dimension inputs
    document.getElementById('cropWidth').addEventListener('change', (e) => {
        if (cropper) {
            const data = cropper.getData();
            data.width = parseInt(e.target.value) || data.width;
            cropper.setData(data);
        }
    });
    
    document.getElementById('cropHeight').addEventListener('change', (e) => {
        if (cropper) {
            const data = cropper.getData();
            data.height = parseInt(e.target.value) || data.height;
            cropper.setData(data);
        }
    });

    // Get current settings for conversion
    function getCurrentSettings() {
        return {
            outputDirectory: saveLocationPath.value,
            ffmpeg: {
                fps: document.getElementById('fps').value,
                scale: document.getElementById('scale').value,
                filters: document.getElementById('filters').value
            },
            gifsicle: {
                optimization: document.getElementById('optimization').value,
                lossy: document.getElementById('lossy').value,
                colors: document.getElementById('colors').value
            },
            cropSettings: Object.fromEntries(cropSettings)
        };
    }

    // Store crop settings for each file
    const cropSettings = new Map();

    // Update crop thumbnails
    function updateCropThumbnails() {
        const cropThumbnails = document.getElementById('cropThumbnails');
        if (!cropThumbnails) return;
        
        cropThumbnails.innerHTML = '';
        
        filesToConvert.forEach(filePath => {
            const thumbnailItem = document.createElement('div');
            thumbnailItem.className = 'file-item';
            thumbnailItem.dataset.path = filePath;
            thumbnailItem.style.cursor = 'pointer';
            thumbnailItem.style.position = 'relative'; // Ensure position is set for absolute positioning of indicator
            
            const thumbnail = document.createElement('img');
            thumbnail.className = 'file-thumbnail';
            thumbnail.alt = 'Loading...';
            thumbnail.style.backgroundColor = '#ddd';
            
            // Try to get the thumbnail from the files tab
            const existingThumbnail = document.querySelector(`.file-item[data-path="${CSS.escape(filePath)}"] .file-thumbnail`);
            if (existingThumbnail && existingThumbnail.src) {
                thumbnail.src = existingThumbnail.src;
            } else {
                // Generate a new thumbnail if not available
                window.electron.generateThumbnail(filePath);
            }
            
            const fileName = document.createElement('div');
            fileName.className = 'file-name';
            fileName.textContent = filePath.split('\\').pop();
            
            thumbnailItem.appendChild(thumbnail);
            thumbnailItem.appendChild(fileName);
            cropThumbnails.appendChild(thumbnailItem);
            
            // Add crop indicator if this file has crop settings
            if (cropSettings.has(filePath)) {
                const indicator = document.createElement('div');
                indicator.className = 'crop-indicator';
                indicator.textContent = 'CROPPED';
                indicator.style.position = 'absolute';
                indicator.style.top = '5px';
                indicator.style.right = '5px';
                indicator.style.backgroundColor = 'rgba(76, 175, 80, 0.85)';
                indicator.style.color = 'white';
                indicator.style.borderRadius = '4px';
                indicator.style.padding = '2px 6px';
                indicator.style.fontSize = '10px';
                indicator.style.fontWeight = 'bold';
                indicator.style.display = 'flex';
                indicator.style.alignItems = 'center';
                indicator.style.justifyContent = 'center';
                indicator.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
                indicator.title = 'This file has custom crop settings applied';
                thumbnailItem.appendChild(indicator);
            }
            
            thumbnailItem.addEventListener('click', () => {
                initCropper(filePath);
            });
        });
    }

    function updateCropDimensions() {
        if (cropper) {
            const data = cropper.getData();
            document.getElementById('cropWidth').value = Math.round(data.width);
            document.getElementById('cropHeight').value = Math.round(data.height);
        }
    }
});
