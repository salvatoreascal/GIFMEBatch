document.addEventListener("DOMContentLoaded", () => {
    const dropZone = document.getElementById('drop-zone');
    const fileListElement = document.getElementById('file-list');
    const saveLocationPath = document.getElementById('saveLocationPath');
    const browseButton = document.getElementById('browseButton');
    const convertButton = document.getElementById('convert-button');
    const donateButton = document.getElementById('donateButton');
    const status = document.getElementById('status');
    let filesToConvert = [];
    
    // Global variables
    let fileList = [];
    let saveLocation = '';
    let cropper = null;
    let selectedFilePath = null;
    let originalImageDimensions = { width: 0, height: 0 };
    let cropSettings = new Map(); // Map to store crop settings for each file
    
    // Progress bar elements
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-percent');
    const progressCount = document.getElementById('progress-count');
    const progressEta = document.getElementById('progress-eta');
    const progressFile = document.getElementById('progress-file');
    const cancelButton = document.getElementById('cancel-conversion');
    
    // Progress tracking variables
    let totalFiles = 0;
    let completedFiles = 0;
    let conversionStartTime = 0;

    if (!dropZone || !fileListElement || !saveLocationPath || !browseButton || !convertButton || !donateButton || !status) {
        console.error('One or more required elements not found:', {
            dropZone: !!dropZone,
            fileList: !!fileListElement,
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
        console.log('Files selected from dialog:', files);
        if (files && files.length > 0) {
            addFilesToList(files);
            console.log('Files after adding:', filesToConvert);
            
            // Force update the file selectors after a short delay to ensure DOM is updated
            setTimeout(() => {
                console.log('Forcing update of file selectors with files:', filesToConvert);
                updateTextOverlayFileSelector();
                updatePreviewFileSelector();
                updateSizeEstimatorFileSelector();
            }, 100);
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
            alert('Please add files to convert');
            return;
        }
        
        // Check if output directory is set
        if (!saveLocationPath.value) {
            alert('Please select an output directory');
            return;
        }
        
        // Check if progress elements are available
        if (!progressContainer || !progressBar || !progressCount || 
            !progressText || !progressEta || !progressFile) {
            console.error('Progress UI elements not found');
            alert('Error initializing progress display. Please reload the application.');
            return;
        }
        
        // Reset UI before starting new conversion
        resetUIForNewConversion();
        
        // Initialize progress tracking
        totalFiles = filesToConvert.length;
        completedFiles = 0;
        conversionStartTime = Date.now();
        
        // Update UI
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressCount.textContent = `0/${totalFiles} files`;
        progressText.textContent = '0%';
        progressEta.textContent = 'Estimating...';
        progressFile.textContent = 'Starting conversion...';

        console.log("✅ Sending files for conversion:", filesToConvert);
        const settings = getCurrentSettings();
        
        console.log("✅ Conversion settings:", settings);
        window.electron.sendConversion(filesToConvert, settings.outputDirectory, settings);
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

    // Add files to the list
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
                fileListElement.appendChild(fileItem);
                
                // Add click event listener to select the file
                fileItem.addEventListener('click', () => {
                    // Remove selected class from all file items
                    document.querySelectorAll('.file-item').forEach(item => {
                        item.classList.remove('selected');
                    });
                    
                    // Add selected class to this file item
                    fileItem.classList.add('selected');
                    
                    // Set selected file path
                    selectedFilePath = filePath;
                    
                    // If we're on the crop tab, initialize the cropper
                    if (document.getElementById('crop-tab') && document.getElementById('crop-tab').classList.contains('active')) {
                        // Use setTimeout to prevent UI freeze
                        setTimeout(() => {
                            initializeCropper(filePath);
                        }, 50);
                    }
                });
                
                // Generate thumbnail
                // Use setTimeout to prevent UI freeze when generating the first thumbnail
                setTimeout(() => {
                    window.electron.generateThumbnail(filePath)
                        .then(thumbnailPath => {
                            thumbnail.src = thumbnailPath;
                        })
                        .catch(error => {
                            console.error('Error generating thumbnail:', error);
                            thumbnail.alt = 'Error';
                        });
                }, 100);
                
                // Update UI elements
                updateFileCount();
                updateConvertButtonState();
                updateTextOverlayFileSelector();
                updatePreviewFileSelector();
                updateSizeEstimatorFileSelector();
            }
        });
    }

    // Remove a file from the list
    function removeFile(filePath) {
        console.log('Removing file:', filePath);
        const index = filesToConvert.indexOf(filePath);
        if (index !== -1) {
            filesToConvert.splice(index, 1);
            
            // Remove the file item from the DOM
            const fileItem = document.querySelector(`.file-item[data-path="${filePath.replace(/\\/g, '\\\\')}"]`);
            if (fileItem) {
                fileItem.remove();
            }
            
            // Update UI elements
            updateFileCount();
            updateConvertButtonState();
            
            // Force update the file selectors after a short delay to ensure DOM is updated
            setTimeout(() => {
                console.log('Forcing update of file selectors after removal with files:', filesToConvert);
                updateTextOverlayFileSelector();
                updatePreviewFileSelector();
                updateSizeEstimatorFileSelector();
            }, 100);
            
            // If the removed file was selected, clear the selection
            if (selectedFilePath === filePath) {
                selectedFilePath = null;
            }
        }
    }

    function updateConvertButtonState() {
        convertButton.disabled = filesToConvert.length === 0 || !saveLocationPath.value;
    }

    // Initialize progress bar for a new conversion
    function initializeProgressBar(fileCount) {
        // Make sure we have all the UI elements
        if (!progressContainer || !progressBar || !progressCount || 
            !progressText || !progressEta || !progressFile) {
            console.error('Progress UI elements not found');
            return;
        }

        // Reset progress tracking variables
        totalFiles = fileCount;
        completedFiles = 0;
        conversionStartTime = Date.now();
        
        // Reset progress bar appearance
        progressBar.style.width = '0%';
        progressBar.classList.remove('completed');
        
        // Reset text elements
        progressText.textContent = '0%';
        progressCount.textContent = `0/${fileCount} files`;
        progressFile.textContent = 'Starting conversion...';
        progressEta.textContent = 'Calculating...';
        
        // Show the progress container
        progressContainer.style.display = 'block';
        
        console.log(`Progress bar initialized for ${fileCount} files`);
    }
    
    // Update progress bar
    function updateProgressBar(fileName, isCompleted = false, currentIndex = null, totalCount = null) {
        // Make sure we have all the UI elements
        if (!progressContainer || !progressBar || !progressCount || 
            !progressText || !progressEta || !progressFile) {
            console.error('Progress UI elements not found');
            
            // Try to get the elements again
            const progressContainer = document.getElementById('progress-container');
            const progressBar = document.getElementById('progress-bar');
            const progressText = document.getElementById('progress-percent');
            const progressCount = document.getElementById('progress-count');
            const progressEta = document.getElementById('progress-eta');
            const progressFile = document.getElementById('progress-file');
            
            // If still not found, return
            if (!progressContainer || !progressBar || !progressCount || 
                !progressText || !progressEta || !progressFile) {
                console.error('Progress UI elements still not found after retry');
                return;
            }
        }

        // Update total files count if provided
        if (totalCount !== null) {
            totalFiles = totalCount;
        }

        // Update completed files count
        if (currentIndex !== null) {
            // If we have a current index, use it directly
            completedFiles = isCompleted ? currentIndex : currentIndex - 1;
        } else {
            // Otherwise increment the completed files count
            if (isCompleted) {
                completedFiles++;
            }
        }

        // Calculate progress percentage
        const progress = Math.round((completedFiles / totalFiles) * 100);
        
        // Update progress bar
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${progress}%`;
        progressCount.textContent = `${completedFiles}/${totalFiles} files`;
        
        // Update file name
        if (fileName) {
            progressFile.textContent = `Converting: ${fileName.split('\\').pop()}`;
        }
        
        // Calculate ETA
        const elapsedTime = Date.now() - conversionStartTime;
        if (completedFiles > 0) {
            const timePerFile = elapsedTime / completedFiles;
            const remainingFiles = totalFiles - completedFiles;
            const remainingTime = timePerFile * remainingFiles;
            
            // Format remaining time
            let etaText = 'Calculating...';
            if (remainingTime > 0) {
                if (remainingTime < 60000) {
                    // Less than a minute
                    etaText = `${Math.round(remainingTime / 1000)} seconds remaining`;
                } else if (remainingTime < 3600000) {
                    // Less than an hour
                    const minutes = Math.floor(remainingTime / 60000);
                    const seconds = Math.round((remainingTime % 60000) / 1000);
                    etaText = `${minutes} min ${seconds} sec remaining`;
                } else {
                    // More than an hour
                    const hours = Math.floor(remainingTime / 3600000);
                    const minutes = Math.floor((remainingTime % 3600000) / 60000);
                    etaText = `${hours} hr ${minutes} min remaining`;
                }
            }
            
            progressEta.textContent = etaText;
        }
        
        // If all files are completed, update the status
        if (completedFiles >= totalFiles) {
            progressFile.textContent = 'Conversion complete!';
            progressEta.textContent = 'Completed!';
            progressText.textContent = '100%';
            progressBar.style.width = '100%';
            
            // Add a class to show completion
            progressBar.classList.add('completed');
        }
        
        // Ensure the progress container is visible
        progressContainer.style.display = 'block';
        
        // Log the current progress state
        console.log(`Progress update: ${progress}%, ${completedFiles}/${totalFiles} files, container display: ${progressContainer.style.display}`);
    }

    // Handle conversion events
    window.electron.onConversionStart((data) => {
        console.log('Conversion started:', data);
        
        // Initialize progress tracking
        totalFiles = data.totalFiles || 0;
        completedFiles = 0;
        conversionStartTime = Date.now();
        
        // Make sure we have all the UI elements
        if (!progressContainer || !progressBar || !progressCount || 
            !progressText || !progressEta || !progressFile || !cancelButton) {
            console.error('Progress UI elements not found, trying to get them again');
            // Try to get the elements again
            progressContainer = document.getElementById('progress-container');
            progressBar = document.getElementById('progress-bar');
            progressText = document.getElementById('progress-percent');
            progressCount = document.getElementById('progress-count');
            progressEta = document.getElementById('progress-eta');
            progressFile = document.getElementById('progress-file');
            cancelButton = document.getElementById('cancel-conversion');
            
            // Log what we found
            console.log('Progress elements after retry:', {
                container: !!progressContainer,
                bar: !!progressBar,
                text: !!progressText,
                count: !!progressCount,
                eta: !!progressEta,
                file: !!progressFile,
                cancel: !!cancelButton
            });
        }
        
        // Update UI
        if (progressContainer) {
            progressContainer.style.display = 'block';
            console.log('Set progress container display to block');
        }
        if (progressBar) progressBar.style.width = '0%';
        if (progressCount) progressCount.textContent = `0/${totalFiles} files`;
        if (progressText) progressText.textContent = '0%';
        if (progressEta) progressEta.textContent = 'Calculating...';
        if (progressFile) progressFile.textContent = 'Starting conversion...';
        
        // Ensure cancel button is visible
        if (cancelButton) {
            cancelButton.style.display = 'block';
        }
    });

    window.electron.onConversionProgress((data) => {
        console.log('Conversion progress:', data);
        
        // Extract file name from path if needed
        const fileName = data.fileName || (data.filePath ? data.filePath.split('\\').pop() : 'Unknown file');
        
        // Handle file progress updates
        if (data.progress !== undefined) {
            // Update the progress bar for the current file
            const fileProgress = data.progress;
            
            // Calculate overall progress
            let overallProgress = 0;
            if (data.currentIndex !== undefined && data.totalFiles !== undefined) {
                // Calculate the contribution of completed files
                const completedFilesProgress = (data.currentIndex / data.totalFiles) * 100;
                // Calculate the contribution of the current file
                const currentFileContribution = (fileProgress / 100) * (1 / data.totalFiles) * 100;
                // Combine them for overall progress
                overallProgress = completedFilesProgress + currentFileContribution;
            } else {
                // If we don't have file indices, just use the file progress
                overallProgress = fileProgress;
            }
            
            // Update progress UI
            if (progressBar) progressBar.style.width = `${Math.round(overallProgress)}%`;
            if (progressText) progressText.textContent = `${Math.round(overallProgress)}%`;
            if (progressFile) progressFile.textContent = `Converting: ${fileName} (${Math.round(fileProgress)}%)`;
            if (progressCount) progressCount.textContent = `${data.currentIndex + 1}/${data.totalFiles} files`;
            
            // Update ETA
            updateETA(overallProgress);
            
            return;
        }
        
        // Handle status-based updates (for backward compatibility)
        if (data.status === 'started') {
            // Update status message
            const status = document.getElementById('status');
            if (status) status.innerHTML += `<p class="success">Converting: ${fileName}</p>`;
            
            // Update progress UI
            if (progressFile) progressFile.textContent = `Converting: ${fileName}`;
            updateProgressBar(fileName, false, data.currentIndex, data.totalFiles);
        } else if (data.status === 'completed') {
            // Update progress when a file is completed
            updateProgressBar(fileName, true, data.currentIndex, data.totalFiles);
        } else if (data.status === 'error') {
            // Handle error during conversion
            const status = document.getElementById('status');
            if (status) status.innerHTML += `<p class="error">Error converting: ${fileName} - ${data.error || 'Unknown error'}</p>`;
            
            // Still update progress to show we've moved past this file
            updateProgressBar(fileName, true, data.currentIndex, data.totalFiles);
        } else {
            // Generic progress update
            updateProgressBar(fileName, false, data.currentIndex, data.totalFiles);
        }
    });
    
    // Helper function to update ETA based on progress
    function updateETA(progress) {
        if (!progressEta) return;
        
        const elapsedTime = Date.now() - conversionStartTime;
        if (progress > 0) {
            const estimatedTotalTime = (elapsedTime / progress) * 100;
            const remainingTime = estimatedTotalTime - elapsedTime;
            
            // Format remaining time
            let etaText = 'Calculating...';
            if (remainingTime > 0) {
                if (remainingTime < 60000) {
                    // Less than a minute
                    etaText = `${Math.round(remainingTime / 1000)} seconds remaining`;
                } else if (remainingTime < 3600000) {
                    // Less than an hour
                    const minutes = Math.floor(remainingTime / 60000);
                    const seconds = Math.round((remainingTime % 60000) / 1000);
                    etaText = `${minutes} min ${seconds} sec remaining`;
                } else {
                    // More than an hour
                    const hours = Math.floor(remainingTime / 3600000);
                    const minutes = Math.floor((remainingTime % 3600000) / 60000);
                    etaText = `${hours} hr ${minutes} min remaining`;
                }
            }
            
            progressEta.textContent = etaText;
        }
    }

    window.electron.onConversionComplete(() => {
        console.log('Conversion complete');
        
        // Update completed files count to match total files
        completedFiles = totalFiles;
        
        // Update progress to 100%
        if (progressBar) progressBar.style.width = '100%';
        if (progressText) progressText.textContent = '100%';
        if (progressCount) progressCount.textContent = `${completedFiles}/${totalFiles} files`;
        if (progressFile) progressFile.textContent = 'Conversion complete!';
        if (progressEta) {
            progressEta.textContent = 'Completed!';
            progressEta.style.color = '#4CAF50';
        }
        
        // Add completion class to progress bar
        if (progressBar) progressBar.classList.add('completed');
        
        // Add completion message
        const status = document.getElementById('status');
        if (status) status.innerHTML += `<p class="success">All files converted successfully!</p>`;
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
        console.log('Conversion cancelled');
        
        // Update UI to show cancellation
        if (progressFile) progressFile.textContent = 'Conversion cancelled';
        if (progressEta) progressEta.textContent = 'Cancelled';
        if (progressBar) progressBar.classList.add('cancelled');
        
        // Hide progress container after a delay
        setTimeout(() => {
            if (progressContainer) {
                progressContainer.style.display = 'none';
            }
            if (progressBar) {
                progressBar.classList.remove('cancelled');
                progressBar.classList.remove('completed');
            }
        }, 3000);
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
        console.log('Renderer: Thumbnail generated for:', data.filePath);
        
        if (!data || !data.filePath || !data.thumbnail) {
            console.error('Invalid thumbnail data received:', data);
            return;
        }
        
        // Update thumbnail in the files list
        const fileItem = document.querySelector(`.file-item[data-path="${CSS.escape(data.filePath)}"]`);
        if (fileItem) {
            const thumbnail = fileItem.querySelector('.file-thumbnail');
            if (thumbnail) {
                thumbnail.src = data.thumbnail;
                thumbnail.style.display = 'block';
                console.log('File list thumbnail updated');
            } else {
                console.warn('Thumbnail element not found in file item');
            }
        } else {
            console.warn('File item not found for path:', data.filePath);
        }
        
        // Also update crop preview if this is the selected file
        if (selectedFilePath === data.filePath && cropper) {
            const cropperImage = document.getElementById('cropperImage');
            if (cropperImage) {
                const oldSrc = cropperImage.src;
                cropperImage.src = data.thumbnail;
                
                // Reinitialize cropper if the source changed
                if (oldSrc !== data.thumbnail) {
                    try {
                        cropper.replace(data.thumbnail);
                        console.log('Cropper image replaced');
                    } catch (error) {
                        console.error('Error replacing cropper image:', error);
                        
                        // If replace fails, try to destroy and reinitialize
                        try {
                            cropper.destroy();
                            console.log('Cropper destroyed, reinitializing...');
                            
                            // Wait a bit for the image to load
                            setTimeout(() => {
                                initCropper(data.filePath);
                            }, 100);
                        } catch (destroyError) {
                            console.error('Error destroying cropper:', destroyError);
                        }
                    }
                }
            } else {
                console.warn('Cropper image element not found');
            }
        }
        
        // Also update in crop thumbnails if we're showing them
        const cropThumbnail = document.querySelector(`#cropThumbnails .file-item[data-path="${CSS.escape(data.filePath)}"] .file-thumbnail`);
        if (cropThumbnail) {
            cropThumbnail.src = data.thumbnail;
            cropThumbnail.style.display = 'block';
            console.log('Crop thumbnail updated');
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
    
    // Keep track of the active tab
    let activeTab = 'files'; // Default tab
    
    // Track if we've already initialized the cropper for a file
    let cropperInitializedForFile = null;
    
    // Track crop states for each file
    let cropperStates = new Map();
    
    // Set up listener for thumbnail-generated event to update crop thumbnails
    window.electron.onThumbnailGenerated((thumbnailData) => {
        if (!thumbnailData || !thumbnailData.filePath || !thumbnailData.thumbnail) {
            console.error('Invalid thumbnail data received');
            return;
        }
        
        // Update thumbnail in crop tab
        const cropThumbnailContainer = document.querySelector(`.crop-thumbnail[data-path="${CSS.escape(thumbnailData.filePath)}"]`);
        if (cropThumbnailContainer) {
            const thumbnailImg = cropThumbnailContainer.querySelector('.thumbnail-img');
            if (thumbnailImg) {
                console.log('Updating crop thumbnail for:', thumbnailData.filePath);
                thumbnailImg.src = thumbnailData.thumbnail;
            }
        }
    });
    
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            try {
                const tabId = tab.getAttribute('data-tab');
                console.log('Switching to tab:', tabId);
                
                // If we're leaving the crop tab, save the current crop state
                if (activeTab === 'crop' && tabId !== 'crop' && selectedFilePath && cropper) {
                    console.log('Leaving crop tab, saving current crop state for:', selectedFilePath);
                    
                    try {
                        // Force save the current crop settings
                        updateCropInputFields(); // Make sure input fields are up to date
                        applyCropSettings(); // Save the current crop settings
                    } catch (e) {
                        console.error('Error saving crop settings when leaving crop tab:', e);
                    }
                }
                
                // If we're leaving the quality tab, save the current quality settings
                if (activeTab === 'quality' && tabId !== 'quality') {
                    console.log('Leaving quality tab, saving current settings');
                    
                    try {
                        // Get current settings to ensure they're saved
                        getCurrentSettings();
                    } catch (e) {
                        console.error('Error saving quality settings when leaving quality tab:', e);
                    }
                }
                
                // Update active tab
                activeTab = tabId;
                
                // Remove active class from all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to selected tab and content
                tab.classList.add('active');
                document.getElementById(`${tabId}-tab`).classList.add('active');
                
                // If switching to crop tab, initialize cropper with selected file
                if (tabId === 'crop') {
                    updateCropThumbnails();
                    if (selectedFilePath) {
                        initCropper(selectedFilePath);
                    }
                }
                
                // If switching to quality tab, update file selectors
                if (tabId === 'quality') {
                    console.log('Switching to quality tab, updating file selectors');
                    updateTextOverlayFileSelector();
                    updatePreviewFileSelector();
                    updateSizeEstimatorFileSelector();
                }
            } catch (error) {
                console.error('Error during tab switching:', error);
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
            const savePresetBtn = document.getElementById('savePresetBtn');
            const deletePresetBtn = document.getElementById('deletePresetBtn');
            if (savePresetBtn) savePresetBtn.disabled = false;
            if (deletePresetBtn) deletePresetBtn.disabled = true;
            return;
        } else {
            // Load custom preset from localStorage
            const customPresets = JSON.parse(localStorage.getItem('customPresets') || '{}');
            preset = customPresets[presetName];
        }
        
        if (preset) {
            // Get elements and check if they exist before setting values
            const fpsInput = document.getElementById('fps');
            const scaleInput = document.getElementById('scale');
            const filtersInput = document.getElementById('filters');
            const optimizationInput = document.getElementById('optimization');
            const lossyInput = document.getElementById('lossy');
            const colorsInput = document.getElementById('colors');
            
            if (fpsInput) fpsInput.value = preset.ffmpeg.fps;
            if (scaleInput) scaleInput.value = preset.ffmpeg.scale;
            if (filtersInput) filtersInput.value = preset.ffmpeg.filters;
            if (optimizationInput) optimizationInput.value = preset.gifsicle.optimization;
            if (lossyInput) lossyInput.value = preset.gifsicle.lossy;
            if (colorsInput) colorsInput.value = preset.gifsicle.colors;
        }
        
        // Update save/delete buttons
        const savePresetBtn = document.getElementById('savePresetBtn');
        const deletePresetBtn = document.getElementById('deletePresetBtn');
        if (savePresetBtn) savePresetBtn.disabled = presetName !== 'custom';
        if (deletePresetBtn) deletePresetBtn.disabled = !isCustomPreset(presetName);
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
    function initializeCropper(filePath) {
        console.log('Initializing cropper for:', filePath);
        
        try {
            // If the cropper is already initialized for this file, don't reinitialize
            if (cropper && cropperInitializedForFile === filePath) {
                console.log('Cropper already initialized for this file, not reinitializing');
                return;
            }
            
            // Show a loading indicator
            const cropPreviewImage = document.getElementById('cropPreviewImage');
            if (cropPreviewImage) {
                cropPreviewImage.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 300px;"><p>Loading cropper...</p></div>';
            }
            
            // Use setTimeout to prevent UI freeze
            setTimeout(() => {
                try {
                    // Save current cropper state if we're switching files
                    if (cropper && cropperInitializedForFile && cropperInitializedForFile !== filePath) {
                        try {
                            const currentState = {
                                cropData: cropper.getData(true),
                                canvasData: cropper.getCanvasData(),
                                cropBoxData: cropper.getCropBoxData(),
                                imageData: cropper.getImageData()
                            };
                            cropperStates.set(cropperInitializedForFile, currentState);
                            console.log('Saved cropper state for:', cropperInitializedForFile, currentState);
                        } catch (e) {
                            console.error('Error saving cropper state:', e);
                        }
                    }
                    
                    // Continue with the rest of the initialization
                    continueInitializingCropper(filePath);
                } catch (error) {
                    console.error('Error in delayed cropper initialization:', error);
                }
            }, 50);
        } catch (error) {
            console.error('Error in initializeCropper:', error);
        }
    }

    // Split the cropper initialization to make it more manageable
    function continueInitializingCropper(filePath) {
        // Destroy existing cropper if it exists
        if (cropper) {
            try {
                cropper.destroy();
                console.log('Previous cropper destroyed');
            } catch (e) {
                console.warn('Error destroying existing cropper:', e);
            }
            cropper = null;
        }
        
        selectedFilePath = filePath;
        const cropPreviewImage = document.getElementById('cropPreviewImage');
        
        if (!cropPreviewImage) {
            console.error('Crop preview image container not found');
            return;
        }
        
        // Clear previous content
        cropPreviewImage.innerHTML = '';
        
        // Create image element
        const img = document.createElement('img');
        img.id = 'cropperImage';
        img.style.maxWidth = '100%';
        
        // Set a placeholder while waiting for the thumbnail
        img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        cropPreviewImage.appendChild(img);
        
        // Request a new thumbnail for the cropper in a non-blocking way
        setTimeout(() => {
            console.log('Requesting new thumbnail for cropper');
            window.electron.generateThumbnail(filePath);
            
            // Get video dimensions to store with crop settings
            window.electron.getVideoDimensions(filePath);
        }, 50);
        
        // Check if we have saved crop settings
        const hasSavedSettings = cropSettings && typeof cropSettings.has === 'function' && cropSettings.has(filePath);
        console.log('Has saved crop settings:', hasSavedSettings, filePath);
        
        if (hasSavedSettings) {
            console.log('Found saved crop settings:', cropSettings.get(filePath));
        }
        
        // Initialize cropper after image is loaded
        img.onload = function() {
            try {
                // Skip initialization if this is just the placeholder image
                if (img.src === 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=') {
                    console.log('Skipping cropper initialization for placeholder image');
                    return;
                }
                
                // Store original dimensions
                originalImageDimensions = {
                    width: img.naturalWidth || 720,
                    height: img.naturalHeight || 480
                };
                
                console.log('Image loaded with dimensions:', originalImageDimensions);
                
                // Set initial crop dimensions to full image size
                const cropXInput = document.getElementById('cropX');
                const cropYInput = document.getElementById('cropY');
                const cropWidthInput = document.getElementById('cropWidth');
                const cropHeightInput = document.getElementById('cropHeight');
                
                if (cropXInput) cropXInput.value = 0;
                if (cropYInput) cropYInput.value = 0;
                if (cropWidthInput) cropWidthInput.value = originalImageDimensions.width;
                if (cropHeightInput) cropHeightInput.value = originalImageDimensions.height;
                
                // Add event listeners to update cropper when input fields change
                if (cropXInput) {
                    cropXInput.addEventListener('change', updateCropperFromInputs);
                }
                if (cropYInput) {
                    cropYInput.addEventListener('change', updateCropperFromInputs);
                }
                if (cropWidthInput) {
                    cropWidthInput.addEventListener('change', updateCropperFromInputs);
                }
                if (cropHeightInput) {
                    cropHeightInput.addEventListener('change', updateCropperFromInputs);
                }
                
                // SIMPLIFIED CROPPER INITIALIZATION
                // Initialize cropper with basic options and NO rotation
                const cropperOptions = {
                    viewMode: 1,
                    dragMode: 'move',
                    autoCropArea: 1.0, // Set to 1.0 to ensure full image is selected by default
                    restore: true,
                    guides: true,
                    center: true,
                    highlight: true,
                    cropBoxMovable: true,
                    cropBoxResizable: true,
                    toggleDragModeOnDblclick: false,
                    rotatable: false, // Disable rotation completely
                    minCropBoxWidth: 10, // Prevent tiny crop boxes
                    minCropBoxHeight: 10, // Prevent tiny crop boxes
                    ready: function() {
                        console.log('Cropper is ready');
                        
                        try {
                            // Check if we have a saved state for this file
                            if (cropperStates.has(filePath)) {
                                const savedState = cropperStates.get(filePath);
                                console.log('Restoring saved cropper state:', savedState);
                                
                                // Validate saved state to ensure it's not too small
                                if (savedState.cropData && 
                                    savedState.cropData.width >= 10 && 
                                    savedState.cropData.height >= 10) {
                                    
                                    // Restore the saved state
                                    if (savedState.canvasData) {
                                        cropper.setCanvasData(savedState.canvasData);
                                    }
                                    
                                    if (savedState.cropBoxData) {
                                        cropper.setCropBoxData(savedState.cropBoxData);
                                    }
                                    
                                    if (savedState.cropData) {
                                        cropper.setData(savedState.cropData);
                                    }
                                    
                                    // Update input fields
                                    updateCropInputFields();
                                    
                                    // Enable crop checkbox
                                    const cropEnabledCheckbox = document.getElementById('cropEnabled');
                                    if (cropEnabledCheckbox) {
                                        cropEnabledCheckbox.checked = true;
                                    }
                                    
                                    return; // Skip the rest of the initialization
                                } else {
                                    console.warn('Saved crop state has invalid dimensions, using full image');
                                    // Remove invalid state
                                    cropperStates.delete(filePath);
                                }
                            }
                            
                            // Apply saved crop settings if they exist
                            if (hasSavedSettings) {
                                try {
                                    const savedSettings = cropSettings.get(filePath);
                                    console.log('Applying saved crop settings:', savedSettings);
                                    
                                    // Validate saved settings to ensure they're not too small
                                    if (!savedSettings.cropWidth || savedSettings.cropWidth < 10 || 
                                        !savedSettings.cropHeight || savedSettings.cropHeight < 10) {
                                        console.warn('Saved crop dimensions are too small, using defaults');
                                        // Use default crop (full image)
                                        setFullImageCrop();
                                        return;
                                    }
                                    
                                    // Create a clean settings object for the cropper
                                    const cropperSettings = {
                                        x: typeof savedSettings.cropX === 'number' ? savedSettings.cropX : 0,
                                        y: typeof savedSettings.cropY === 'number' ? savedSettings.cropY : 0,
                                        width: typeof savedSettings.cropWidth === 'number' ? savedSettings.cropWidth : originalImageDimensions.width,
                                        height: typeof savedSettings.cropHeight === 'number' ? savedSettings.cropHeight : originalImageDimensions.height,
                                        scaleX: 1,
                                        scaleY: 1
                                    };
                                    
                                    // Apply immediately
                                    cropper.setData(cropperSettings);
                                    
                                    // Also apply with a delay to ensure it's applied correctly
                                    setTimeout(() => {
                                        try {
                                            cropper.setData(cropperSettings);
                                            updateCropInputFields();
                                            console.log('Applied saved crop settings with delay');
                                        } catch (e) {
                                            console.error('Error applying crop settings with delay:', e);
                                        }
                                    }, 300);
                                    
                                    // Enable crop checkbox
                                    const cropEnabledCheckbox = document.getElementById('cropEnabled');
                                    if (cropEnabledCheckbox) {
                                        cropEnabledCheckbox.checked = true;
                                    }
                                } catch (e) {
                                    console.error('Error applying saved crop settings:', e);
                                    // Update crop dimensions display with defaults
                                    setFullImageCrop();
                                }
                            } else {
                                // No saved settings, ensure crop checkbox is unchecked
                                const cropEnabledCheckbox = document.getElementById('cropEnabled');
                                if (cropEnabledCheckbox) {
                                    cropEnabledCheckbox.checked = false;
                                }
                                
                                // Set to full image crop by default
                                setFullImageCrop();
                            }
                        } catch (e) {
                            console.error('Error in cropper ready callback:', e);
                            // Fallback to full image crop
                            setFullImageCrop();
                        }
                    },
                    crop: function(event) {
                        try {
                            // Update crop dimensions when cropping
                            updateCropInputFields();
                        } catch (e) {
                            console.error('Error in crop event handler:', e);
                        }
                    }
                };
                
                // Create the cropper instance
                cropper = new Cropper(img, cropperOptions);
                
                // Set a flag to indicate the cropper is initialized
                window.cropperInitialized = true;
                cropperInitializedForFile = filePath;
            } catch (error) {
                console.error('Error initializing cropper:', error);
            }
        };
        
        // Add a listener for the thumbnail-generated event to update the cropper image
        window.electron.onThumbnailGenerated((thumbnailData) => {
            try {
                if (img && thumbnailData && thumbnailData.filePath === filePath) {
                    console.log('Received new thumbnail for cropper, updating image');
                    img.src = thumbnailData.thumbnail;
                }
            } catch (e) {
                console.error('Error updating cropper image with new thumbnail:', e);
            }
        });
        
        // Helper function to set crop to full image
        function setFullImageCrop() {
            if (!cropper) return;
            
            try {
                const imageData = cropper.getImageData();
                
                // Set crop to full image dimensions
                const fullImageCrop = {
                    x: 0,
                    y: 0,
                    width: imageData.naturalWidth,
                    height: imageData.naturalHeight,
                    scaleX: 1,
                    scaleY: 1
                };
                
                console.log('Setting crop to full image dimensions:', fullImageCrop);
                
                // Apply to cropper
                cropper.setData(fullImageCrop);
                
                // Update input fields
                updateCropInputFields();
            } catch (e) {
                console.error('Error setting full image crop:', e);
            }
        }
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
    const applyCropButton = document.getElementById('apply-crop');
    if (applyCropButton) {
        applyCropButton.addEventListener('click', applyCropSettings);
    }
    
    // Check if applyToAll button exists before adding event listener
    const applyToAllButton = document.getElementById('applyToAll');
    if (applyToAllButton) {
        applyToAllButton.addEventListener('click', () => {
            if (!cropper || !selectedFilePath) {
                alert('Please select a file and set crop dimensions first.');
                return;
            }
            
            const cropData = cropper.getData();
            
            // Validate crop dimensions
            if (cropData.width < 16 || cropData.height < 16) {
                alert('Crop area is too small. Please select a larger area (minimum 16x16 pixels).');
                return;
            }
            
            // Apply the same crop settings to all files
            filesToConvert.forEach(filePath => {
                cropSettings.set(filePath, {
                    x: cropData.x,
                    y: cropData.y,
                    width: cropData.width,
                    height: cropData.height
                });
            });
            
            // Update UI
            updateCropThumbnails();
            
            // Show success message
            const cropStatus = document.getElementById('crop-status');
            if (cropStatus) {
                cropStatus.textContent = 'Crop settings applied to all files!';
                cropStatus.style.color = '#4CAF50';
                
                // Clear the message after 3 seconds
                setTimeout(() => {
                    cropStatus.textContent = '';
                }, 3000);
            }
            
            console.log('Applied crop settings to all files');
        });
    }
    
    // Add event listener for the reset crop button
    const resetCropButton = document.getElementById('reset-crop');
    if (resetCropButton) {
        resetCropButton.addEventListener('click', resetCropSettings);
    }
    
    // Add event listener for the crop enabled checkbox
    const cropEnabledCheckbox = document.getElementById('cropEnabled');
    if (cropEnabledCheckbox) {
        cropEnabledCheckbox.addEventListener('change', (e) => {
            if (!selectedFilePath) {
                console.warn('No file selected for crop toggle');
                return;
            }
            
            console.log(`Crop ${e.target.checked ? 'enabled' : 'disabled'} for ${selectedFilePath}`);
            
            // If crop is enabled and we have crop settings, make sure they're applied
            if (e.target.checked && cropSettings && cropSettings.has && cropSettings.has(selectedFilePath)) {
                // Crop settings already exist, no need to do anything
                const cropStatus = document.getElementById('crop-status');
                if (cropStatus) {
                    cropStatus.textContent = 'Crop enabled';
                    cropStatus.style.color = '#4CAF50';
                    setTimeout(() => {
                        cropStatus.textContent = '';
                    }, 3000);
                }
            } 
            // If crop is enabled but we don't have crop settings, apply full image crop
            else if (e.target.checked) {
                try {
                    // If cropper exists, get the full image dimensions
                    if (cropper) {
                        const imageData = cropper.getImageData();
                        
                        // Set crop to full image dimensions
                        const fullImageCrop = {
                            x: 0,
                            y: 0,
                            width: imageData.naturalWidth,
                            height: imageData.naturalHeight,
                            scaleX: 1,
                            scaleY: 1
                        };
                        
                        console.log('Setting crop to full image dimensions:', fullImageCrop);
                        
                        // Apply to cropper
                        cropper.setData(fullImageCrop);
                        
                        // Update input fields
                        const cropXInput = document.getElementById('cropX');
                        const cropYInput = document.getElementById('cropY');
                        const cropWidthInput = document.getElementById('cropWidth');
                        const cropHeightInput = document.getElementById('cropHeight');
                        
                        if (cropXInput) cropXInput.value = 0;
                        if (cropYInput) cropYInput.value = 0;
                        if (cropWidthInput) cropWidthInput.value = Math.round(imageData.naturalWidth);
                        if (cropHeightInput) cropHeightInput.value = Math.round(imageData.naturalHeight);
                        
                        // Save these settings
                        applyCropSettings();
                        
                        const cropStatus = document.getElementById('crop-status');
                        if (cropStatus) {
                            cropStatus.textContent = 'Crop enabled (full image)';
                            cropStatus.style.color = '#4CAF50';
                            setTimeout(() => {
                                cropStatus.textContent = '';
                            }, 3000);
                        }
                    } else {
                        console.warn('Cannot set full image crop: Cropper not initialized');
                        applyCropSettings(); // Fall back to regular apply
                    }
                } catch (error) {
                    console.error('Error setting full image crop:', error);
                    applyCropSettings(); // Fall back to regular apply
                }
            }
            // If crop is disabled, just update the UI
            else {
                const cropStatus = document.getElementById('crop-status');
                if (cropStatus) {
                    cropStatus.textContent = 'Crop disabled';
                    cropStatus.style.color = '#f44336';
                    setTimeout(() => {
                        cropStatus.textContent = '';
                    }, 3000);
                }
                
                // Update crop thumbnails to reflect disabled state
                updateCropThumbnails();
            }
        });
    }
    
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
        // Get FFmpeg settings
        const fps = document.getElementById('fps').value;
        const scale = document.getElementById('scale').value;
        const startTime = document.getElementById('startTime').value;
        const duration = document.getElementById('duration').value;
        const textOverlayTop = document.getElementById('textOverlayTop').value;
        const textOverlayMiddle = document.getElementById('textOverlayMiddle').value;
        const textOverlayBottom = document.getElementById('textOverlayBottom').value;
        const textSize = document.getElementById('textSize').value;
        const textColor = document.getElementById('textColor').value;
        const videoFilters = document.getElementById('videoFilters').value;
        
        // Get selected files for text overlay
        const textOverlayFiles = getSelectedTextOverlayFiles();
        
        // Create FFmpeg settings object
        const ffmpegSettings = {
            fps,
            scale,
            startTime,
            duration,
            textOverlayTop,
            textOverlayMiddle,
            textOverlayBottom,
            textSize,
            textColor,
            filters: videoFilters,
            textOverlayFiles
        };
        
        // Get Gifsicle settings
        const optimization = document.getElementById('optimization').value;
        const lossy = document.getElementById('lossy').value;
        const colors = document.getElementById('colors').value;
        const dithering = document.getElementById('dithering').value;
        const interlace = document.getElementById('interlace').checked;
        const loop = document.getElementById('loop').checked;
        const loopCount = document.getElementById('loopCount').value;
        const delay = document.getElementById('delay').value;
        const paletteType = document.getElementById('paletteType').value;
        const customPalette = document.getElementById('customPalette').value;
        
        // Create Gifsicle settings object
        const gifsicleSettings = {
            optimization,
            lossy,
            colors,
            dithering,
            interlace,
            loop,
            loopCount: loop ? -1 : loopCount,
            delay: delay || '',
            paletteType,
            customPalette: paletteType === 'custom' ? customPalette : ''
        };
        
        // Get output format
        const outputFormat = document.querySelector('input[name="outputFormat"]:checked').value;
        
        // Convert crop settings Map to object
        const cropSettingsObj = {};
        cropSettings.forEach((settings, filePath) => {
            cropSettingsObj[filePath] = settings;
        });
        
        // Get output directory
        const outputDirectory = document.getElementById('saveLocationPath').value;
        
        return {
            outputFormat,
            outputDirectory,
            ffmpeg: ffmpegSettings,
            gifsicle: gifsicleSettings,
            cropSettings: cropSettingsObj
        };
    }

    // Update crop thumbnails
    function updateCropThumbnails(regenerateThumbnails = true) {
        console.log('Updating crop thumbnails, regenerate:', regenerateThumbnails);
        
        try {
            const cropThumbnailsContainer = document.getElementById('cropThumbnails');
            if (!cropThumbnailsContainer) {
                console.error('Crop thumbnails container not found');
                return;
            }
            
            // Clear existing thumbnails
            cropThumbnailsContainer.innerHTML = '';
            
            // Use the global filesToConvert array
            console.log('Files to convert for crop thumbnails:', filesToConvert);
            
            if (!filesToConvert || filesToConvert.length === 0) {
                cropThumbnailsContainer.innerHTML = '<p class="no-files">No files selected for conversion</p>';
                return;
            }
            
            // Create thumbnails for each file
            filesToConvert.forEach(filePath => {
                if (!filePath) {
                    console.warn('Invalid file path in filesToConvert');
                    return;
                }
                
                try {
                    const thumbnailContainer = document.createElement('div');
                    thumbnailContainer.className = 'crop-thumbnail';
                    thumbnailContainer.setAttribute('data-path', filePath);
                    
                    const thumbnailImg = document.createElement('img');
                    thumbnailImg.className = 'thumbnail-img';
                    thumbnailImg.alt = filePath.split('\\').pop(); // Get filename without path
                    
                    // Try to get the thumbnail from the files tab first
                    const existingThumbnail = document.querySelector(`.file-item[data-path="${CSS.escape(filePath)}"] .file-thumbnail`);
                    if (existingThumbnail && existingThumbnail.src && existingThumbnail.src !== 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=') {
                        console.log('Using existing thumbnail for crop thumbnail');
                        thumbnailImg.src = existingThumbnail.src;
                    } else {
                        // Set a placeholder while waiting for the thumbnail
                        thumbnailImg.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
                        
                        // Always generate thumbnails for the crop tab
                        console.log('Requesting new thumbnail for crop thumbnail:', filePath);
                        window.electron.generateThumbnail(filePath);
                    }
                    
                    const thumbnailLabel = document.createElement('div');
                    thumbnailLabel.className = 'thumbnail-label';
                    thumbnailLabel.textContent = filePath.split('\\').pop(); // Get filename without path
                    
                    thumbnailContainer.appendChild(thumbnailImg);
                    thumbnailContainer.appendChild(thumbnailLabel);
                    
                    // Add crop indicator if this file has crop settings
                    if (cropSettings && typeof cropSettings.has === 'function' && cropSettings.has(filePath)) {
                        const indicator = document.createElement('div');
                        indicator.className = 'crop-indicator';
                        indicator.textContent = 'CROPPED';
                        thumbnailContainer.appendChild(indicator);
                    }
                    
                    // Add click event to select this file for cropping
                    thumbnailContainer.addEventListener('click', () => {
                        try {
                            // If this is the same file that's already selected, don't do anything
                            if (selectedFilePath === filePath && cropper) {
                                console.log('File already selected for cropping:', filePath);
                                return;
                            }
                            
                            // Remove selected class from all thumbnails
                            document.querySelectorAll('.crop-thumbnail').forEach(thumb => {
                                thumb.classList.remove('selected');
                            });
                            
                            // Add selected class to this thumbnail
                            thumbnailContainer.classList.add('selected');
                            
                            // Save current crop settings before switching files
                            if (cropper && selectedFilePath) {
                                try {
                                    // Force save the current crop settings for the previous file
                                    updateCropInputFields(); // Make sure input fields are up to date
                                    applyCropSettings(); // Save the current crop settings
                                    console.log('Saved crop settings for previous file before switching:', selectedFilePath);
                                } catch (e) {
                                    console.error('Error saving crop settings before switching files:', e);
                                }
                            }
                            
                            // Initialize cropper with this file
                            initializeCropper(filePath);
                        } catch (e) {
                            console.error('Error in thumbnail click handler:', e);
                        }
                    });
                    
                    cropThumbnailsContainer.appendChild(thumbnailContainer);
                } catch (itemError) {
                    console.error('Error creating thumbnail item for file:', filePath, itemError);
                }
            });
        } catch (error) {
            console.error('Error updating crop thumbnails:', error);
        }
    }

    function updateCropDimensions() {
        // Check if cropper exists and is fully initialized
        if (!cropper) {
            console.warn('Cropper not initialized for dimension update');
            const cropStatus = document.getElementById('crop-status');
            if (cropStatus) {
                cropStatus.textContent = 'Please select an image to crop first.';
                cropStatus.style.color = '#f44336';
                setTimeout(() => {
                    cropStatus.textContent = '';
                }, 3000);
            }
            return;
        }
        
        // Check if getData method is available
        if (typeof cropper.getData !== 'function') {
            console.warn('Cropper getData method not available');
            const cropStatus = document.getElementById('crop-status');
            if (cropStatus) {
                cropStatus.textContent = 'Cropper not fully initialized. Please try again in a moment.';
                cropStatus.style.color = '#f44336';
                setTimeout(() => {
                    cropStatus.textContent = '';
                }, 3000);
            }
            return;
        }

        try {
            // Get crop data with a try-catch to handle potential errors
            let data;
            try {
                // Create a safe wrapper around getData to prevent the rotate property error
                const cropperElement = document.getElementById('cropperImage');
                if (!cropperElement || !cropperElement.cropper) {
                    throw new Error('Cropper element or instance not found');
                }
                
                // Try to get data safely
                try {
                    // Use a safer approach to get data
                    if (cropper && typeof cropper.getData === 'function') {
                        // Create a default data object first
                        data = {
                            x: 0,
                            y: 0,
                            width: cropperElement.naturalWidth || 640,
                            height: cropperElement.naturalHeight || 480,
                            rotate: 0,
                            scaleX: 1,
                            scaleY: 1
                        };
                        
                        // Then try to get the actual data
                        const cropperData = cropper.getData(true);
                        
                        // Only update properties that exist and are valid
                        if (cropperData) {
                            if (typeof cropperData.x === 'number') data.x = cropperData.x;
                            if (typeof cropperData.y === 'number') data.y = cropperData.y;
                            if (typeof cropperData.width === 'number') data.width = cropperData.width;
                            if (typeof cropperData.height === 'number') data.height = cropperData.height;
                            if (typeof cropperData.rotate === 'number') data.rotate = cropperData.rotate;
                            if (typeof cropperData.scaleX === 'number') data.scaleX = cropperData.scaleX;
                            if (typeof cropperData.scaleY === 'number') data.scaleY = cropperData.scaleY;
                        }
                    } else {
                        throw new Error('Cropper getData method not available');
                    }
                } catch (innerErr) {
                    console.warn('Error in cropper.getData, creating default data:', innerErr);
                    // Create default data based on the image dimensions
                    const width = cropperElement.naturalWidth || 640;
                    const height = cropperElement.naturalHeight || 480;
                    data = {
                        x: 0,
                        y: 0,
                        width: width,
                        height: height,
                        rotate: 0,
                        scaleX: 1,
                        scaleY: 1
                    };
                }
                
                // Explicitly check for undefined or missing properties
                if (!data || typeof data !== 'object') {
                    throw new Error('Cropper getData returned invalid data');
                }
            } catch (err) {
                console.error('Error getting cropper data:', err);
                
                // Create default data if getData fails
                data = {
                    x: 0,
                    y: 0,
                    width: 100,
                    height: 100,
                    rotate: 0,
                    scaleX: 1,
                    scaleY: 1
                };
                
                // Try to get the image dimensions from the cropper element
                const cropperImage = document.getElementById('cropperImage');
                if (cropperImage) {
                    data.width = cropperImage.naturalWidth || 100;
                    data.height = cropperImage.naturalHeight || 100;
                }
                
                const cropStatus = document.getElementById('crop-status');
                if (cropStatus) {
                    cropStatus.textContent = 'Error getting crop data. Using default crop area.';
                    cropStatus.style.color = '#f44336';
                    setTimeout(() => {
                        cropStatus.textContent = '';
                    }, 3000);
                }
            }
            
            // Validate crop dimensions
            if (data.width < 10 || data.height < 10) {
                const cropStatus = document.getElementById('crop-status');
                if (cropStatus) {
                    cropStatus.textContent = 'Crop area is too small. Please select a larger area.';
                    cropStatus.style.color = '#f44336';
                    setTimeout(() => {
                        cropStatus.textContent = '';
                    }, 3000);
                }
                return;
            }
            
            // Store crop settings for this file
            if (!cropSettings) {
                cropSettings = new Map();
            }
            
            // Round values for better UX
            const x = Math.round(data.x);
            const y = Math.round(data.y);
            const width = Math.round(data.width);
            const height = Math.round(data.height);
            
            // Update input fields
            const cropXInput = document.getElementById('cropX');
            const cropYInput = document.getElementById('cropY');
            const cropWidthInput = document.getElementById('cropWidth');
            const cropHeightInput = document.getElementById('cropHeight');
            
            if (cropXInput) cropXInput.value = x;
            if (cropYInput) cropYInput.value = y;
            if (cropWidthInput) cropWidthInput.value = width;
            if (cropHeightInput) cropHeightInput.value = height;
            
            // Calculate and display aspect ratio
            const aspectRatioElement = document.getElementById('aspectRatio');
            if (aspectRatioElement && width && height) {
                const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
                const divisor = gcd(width, height);
                const aspectRatioX = width / divisor;
                const aspectRatioY = height / divisor;
                
                if (aspectRatioX <= 20 && aspectRatioY <= 20) {
                    aspectRatioElement.textContent = `Aspect Ratio: ${aspectRatioX}:${aspectRatioY}`;
                } else {
                    aspectRatioElement.textContent = `Aspect Ratio: ${(width / height).toFixed(2)}:1`;
                }
            } else if (aspectRatioElement) {
                aspectRatioElement.textContent = '';
            }
            
            // Check if crop is enabled
            const cropEnabled = document.getElementById('cropEnabled');
            if (cropEnabled && !cropEnabled.checked) {
                const cropStatus = document.getElementById('crop-status');
                if (cropStatus) {
                    cropStatus.textContent = 'Crop settings updated. Enable crop to apply.';
                    cropStatus.style.color = '#2196F3';
                    setTimeout(() => {
                        cropStatus.textContent = '';
                    }, 3000);
                }
            }
        } catch (error) {
            console.error('Error updating crop dimensions:', error);
            const cropStatus = document.getElementById('crop-status');
            if (cropStatus) {
                cropStatus.textContent = `Error: ${error.message}`;
                cropStatus.style.color = '#f44336';
                setTimeout(() => {
                    cropStatus.textContent = '';
                }, 3000);
            }
        }
    }

    // New elements for advanced features
    const outputFormatRadios = document.querySelectorAll('input[name="outputFormat"]');
    const paletteTypeSelect = document.getElementById('paletteType');
    const customPaletteContainer = document.getElementById('customPaletteContainer');
    const customPaletteInput = document.getElementById('customPalette');
    const palettePreview = document.getElementById('palettePreview');
    const ditheringSelect = document.getElementById('dithering');
    const textOverlayInput = document.getElementById('textOverlay');
    const textSizeInput = document.getElementById('textSize');
    const textColorInput = document.getElementById('textColor');
    const textPositionSelect = document.getElementById('textPosition');
    const estimatedFileSizeSpan = document.getElementById('estimatedFileSize');
    const autoCalculateSizeCheckbox = document.getElementById('autoCalculateSize');
    const calculateSizeBtn = document.getElementById('calculateSizeBtn');
    const generatePreviewBtn = document.getElementById('generatePreviewBtn');
    const previewImageContainer = document.getElementById('previewImageContainer');
    const previewDimensions = document.getElementById('previewDimensions');
    const previewColors = document.getElementById('previewColors');
    const previewFrameCount = document.getElementById('previewFrameCount');
    const ffmpegAdvancedToggle = document.getElementById('ffmpegAdvancedToggle');
    const ffmpegAdvancedSettings = document.getElementById('ffmpegAdvancedSettings');
    const gifsicleAdvancedToggle = document.getElementById('gifsicleAdvancedToggle');
    const gifsicleAdvancedSettings = document.getElementById('gifsicleAdvancedSettings');
    const loopCheckbox = document.getElementById('loop');
    const loopCountContainer = document.getElementById('loopCountContainer');
    const loopCountInput = document.getElementById('loopCount');
    const startTimeInput = document.getElementById('startTime');
    const durationInput = document.getElementById('duration');
    const videoFiltersInput = document.getElementById('videoFilters');
    const interlaceCheckbox = document.getElementById('interlace');
    const delayInput = document.getElementById('delay');

    // Initialize advanced settings toggles
    ffmpegAdvancedToggle.addEventListener('click', () => {
        ffmpegAdvancedSettings.classList.toggle('visible');
        ffmpegAdvancedToggle.querySelector('span:last-child').textContent = 
            ffmpegAdvancedSettings.classList.contains('visible') ? '▲' : '▼';
    });

    gifsicleAdvancedToggle.addEventListener('click', () => {
        gifsicleAdvancedSettings.classList.toggle('visible');
        gifsicleAdvancedToggle.querySelector('span:last-child').textContent = 
            gifsicleAdvancedSettings.classList.contains('visible') ? '▲' : '▼';
    });

    // Handle loop checkbox change
    loopCheckbox.addEventListener('change', () => {
        loopCountContainer.style.display = loopCheckbox.checked ? 'none' : 'block';
    });

    // Handle palette type change
    paletteTypeSelect.addEventListener('change', () => {
        customPaletteContainer.style.display = 
            paletteTypeSelect.value === 'custom' ? 'block' : 'none';
        
        if (paletteTypeSelect.value === 'custom' && customPaletteInput.value) {
            updatePalettePreview(customPaletteInput.value);
        }
    });

    // Handle custom palette input change
    customPaletteInput.addEventListener('input', () => {
        updatePalettePreview(customPaletteInput.value);
    });

    // Update palette preview
    function updatePalettePreview(paletteString) {
        // Clear existing preview
        palettePreview.innerHTML = '';
        
        // Parse the palette string (comma-separated hex values)
        const colors = paletteString.split(',').map(color => color.trim());
        
        // Create color swatches
        colors.forEach(color => {
            if (color && /^#[0-9A-Fa-f]{6}$/.test(color)) {
                const colorSwatch = document.createElement('div');
                colorSwatch.className = 'palette-color';
                colorSwatch.style.backgroundColor = color;
                palettePreview.appendChild(colorSwatch);
            }
        });
    }

    // File size calculator
    calculateSizeBtn.addEventListener('click', () => {
        calculateEstimatedFileSize();
    });

    // Auto-calculate file size when settings change
    const settingInputs = document.querySelectorAll('#quality-tab input, #quality-tab select');
    settingInputs.forEach(input => {
        input.addEventListener('change', () => {
            if (autoCalculateSizeCheckbox.checked) {
                calculateEstimatedFileSize();
            }
        });
    });

    // Add event listener for size estimator file selector
    const sizeEstimatorFileSelector = document.getElementById('sizeEstimatorFileSelector');
    if (sizeEstimatorFileSelector) {
        sizeEstimatorFileSelector.addEventListener('change', () => {
            calculateEstimatedFileSize();
        });
    } else {
        console.error('Size estimator file selector not found');
    }

    // Calculate estimated file size
    function calculateEstimatedFileSize() {
        if (!filesToConvert || filesToConvert.length === 0) {
            if (estimatedFileSizeSpan) {
                estimatedFileSizeSpan.textContent = 'No files selected';
            }
            return;
        }

        try {
            // Get the selected file from the dropdown
            const sizeEstimatorFileSelector = document.getElementById('sizeEstimatorFileSelector');
            const selectedFile = sizeEstimatorFileSelector && sizeEstimatorFileSelector.value 
                ? sizeEstimatorFileSelector.value 
                : filesToConvert[0];
            
            if (!selectedFile) {
                if (estimatedFileSizeSpan) {
                    estimatedFileSizeSpan.textContent = 'Please select a file';
                }
                return;
            }
            
            // Show calculating message
            if (estimatedFileSizeSpan) {
                estimatedFileSizeSpan.textContent = 'Calculating...';
            }
            
            // Get current settings
            const settings = getCurrentSettings();
            
            // Get video dimensions and duration
            getVideoDimensions(selectedFile)
                .then(videoInfo => {
                    // Use actual video dimensions and duration if available
                    const actualWidth = videoInfo.width || 1280;
                    const actualHeight = videoInfo.height || 720;
                    const actualDuration = videoInfo.duration || 5; // Default to 5 seconds if not available
                    
                    // Apply scale if specified
                    const scale = settings.ffmpeg?.scale || '480:-1';
                    let width, height;
                    
                    if (scale.includes('-1')) {
                        // Calculate proportional dimensions
                        if (scale.startsWith('-1:')) {
                            // Height is fixed, calculate width
                            height = parseInt(scale.split(':')[1]) || actualHeight;
                            width = Math.round(actualWidth * (height / actualHeight));
                        } else {
                            // Width is fixed, calculate height
                            width = parseInt(scale.split(':')[0]) || actualWidth;
                            height = Math.round(actualHeight * (width / actualWidth));
                        }
                    } else {
                        // Both dimensions are specified
                        const dimensions = scale.split(':');
                        width = parseInt(dimensions[0]) || actualWidth;
                        height = parseInt(dimensions[1]) || actualHeight;
                    }
                    
                    // Apply crop if specified for this file
                    if (settings.cropSettings && settings.cropSettings[selectedFile] && 
                        !settings.cropSettings[selectedFile].noCrop) {
                        const cropSettings = settings.cropSettings[selectedFile];
                        if (cropSettings.cropWidth && cropSettings.cropHeight) {
                            // Calculate the scaled crop dimensions
                            const scaleX = actualWidth / cropSettings.imageWidth;
                            const scaleY = actualHeight / cropSettings.imageHeight;
                            
                            const cropWidth = Math.round(cropSettings.cropWidth * scaleX);
                            const cropHeight = Math.round(cropSettings.cropHeight * scaleY);
                            
                            // Use crop dimensions if valid
                            if (cropWidth > 10 && cropHeight > 10) {
                                width = cropWidth;
                                height = cropHeight;
                            }
                        }
                    }
                    
                    // Apply start time and duration if specified
                    let effectiveDuration = actualDuration;
                    if (settings.ffmpeg?.startTime && parseFloat(settings.ffmpeg.startTime) > 0) {
                        const startTime = parseFloat(settings.ffmpeg.startTime);
                        effectiveDuration = Math.max(0, actualDuration - startTime);
                    }
                    
                    if (settings.ffmpeg?.duration && parseFloat(settings.ffmpeg.duration) > 0) {
                        const specifiedDuration = parseFloat(settings.ffmpeg.duration);
                        effectiveDuration = Math.min(effectiveDuration, specifiedDuration);
                    }
                    
                    // Get other settings
                    const fps = parseInt(settings.ffmpeg?.fps || 12);
                    const colors = parseInt(settings.gifsicle?.colors || 256);
                    
                    // Calculate frames
                    const frameCount = Math.ceil(fps * effectiveDuration);
                    
                    // Calculate bytes per frame (very rough estimate)
                    // GIF uses LZW compression, so this is just a starting point
                    let bytesPerFrame = (width * height * Math.log2(colors) / 8);
                    
                    // Adjust for optimization level
                    const optimizationLevel = parseInt(settings.gifsicle?.optimization || 3);
                    const optimizationFactor = [1, 0.8, 0.6][optimizationLevel - 1] || 0.6;
                    
                    // Adjust for lossy compression
                    const lossyValue = parseInt(settings.gifsicle?.lossy || 0);
                    const lossyFactor = lossyValue > 0 ? (1 - lossyValue / 300) : 1;
                    
                    // Calculate total size
                    let totalBytes = bytesPerFrame * frameCount * optimizationFactor * lossyFactor;
                    
                    // Format the size
                    if (estimatedFileSizeSpan) {
                        estimatedFileSizeSpan.textContent = formatBytes(totalBytes);
                    }
                })
                .catch(error => {
                    console.error('Error getting video dimensions:', error);
                    
                    // Fallback to basic estimation
                    const scale = settings.ffmpeg?.scale || '480:-1';
                    const width = parseInt(scale.split(':')[0]) || 480;
                    const height = scale.includes('-1') 
                        ? Math.round(width * 9 / 16) // Assume 16:9 aspect ratio if height is auto
                        : parseInt(scale.split(':')[1]);
                    
                    const fps = parseInt(settings.ffmpeg?.fps || 12);
                    const colors = parseInt(settings.gifsicle?.colors || 256);
                    const duration = 5; // Assume 5 seconds if we don't know the actual duration
                    
                    // Calculate frames
                    const frameCount = fps * duration;
                    
                    // Calculate bytes per frame (very rough estimate)
                    let bytesPerFrame = (width * height * Math.log2(colors) / 8);
                    
                    // Adjust for optimization level
                    const optimizationLevel = parseInt(settings.gifsicle?.optimization || 3);
                    const optimizationFactor = [1, 0.8, 0.6][optimizationLevel - 1] || 0.6;
                    
                    // Adjust for lossy compression
                    const lossyValue = parseInt(settings.gifsicle?.lossy || 0);
                    const lossyFactor = lossyValue > 0 ? (1 - lossyValue / 300) : 1;
                    
                    // Calculate total size
                    let totalBytes = bytesPerFrame * frameCount * optimizationFactor * lossyFactor;
                    
                    // Format the size
                    if (estimatedFileSizeSpan) {
                        estimatedFileSizeSpan.textContent = formatBytes(totalBytes) + ' (estimate)';
                    }
                });
        } catch (error) {
            console.error('Error calculating estimated file size:', error);
            if (estimatedFileSizeSpan) {
                estimatedFileSizeSpan.textContent = 'Error calculating size';
            }
        }
    }

    // Format bytes to human-readable format
    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Generate preview
    generatePreviewBtn.addEventListener('click', () => {
        if (filesToConvert.length === 0) {
            alert('Please select at least one file to preview');
            return;
        }
        
        // Get the selected file from the dropdown
        const previewFileSelector = document.getElementById('previewFileSelector');
        const selectedFile = previewFileSelector.value || filesToConvert[0];
        
        // Show loading state
        const previewImageContainer = document.getElementById('previewImageContainer');
        previewImageContainer.innerHTML = '<p>Generating preview...</p>';
        
        // Get current settings
        const settings = getCurrentSettings();
        
        console.log('Generating preview with settings:', settings);
        
        // Request preview generation from main process
        window.electron.generatePreview(selectedFile, settings)
            .then(previewData => {
                // Update preview image
                previewImageContainer.innerHTML = '';
                const img = document.createElement('img');
                img.className = 'preview-image';
                img.src = previewData.url;
                previewImageContainer.appendChild(img);
                
                // Update preview info
                document.getElementById('previewDimensions').textContent = `${previewData.info.width}x${previewData.info.height}`;
                document.getElementById('previewColors').textContent = previewData.info.colors;
                document.getElementById('previewFrameCount').textContent = previewData.info.frames;
            })
            .catch(error => {
                console.error('Error generating preview:', error);
                previewImageContainer.innerHTML = `<p class="error">Error generating preview: ${error.message || error}</p>`;
            });
    });

    // Add a function to apply crop settings
    function applyCropSettings() {
        // Check if cropper is initialized and a file is selected
        if (!cropper || !selectedFilePath) {
            console.warn('Cannot apply crop: Cropper not initialized or no file selected');
            const cropStatus = document.getElementById('crop-status');
            if (cropStatus) {
                cropStatus.textContent = 'Please select a file and ensure the cropper is initialized.';
                cropStatus.style.color = '#f44336';
                setTimeout(() => {
                    cropStatus.textContent = '';
                }, 3000);
            }
            return;
        }
        
        try {
            // Get crop dimensions from input fields
            const cropXInput = document.getElementById('cropX');
            const cropYInput = document.getElementById('cropY');
            const cropWidthInput = document.getElementById('cropWidth');
            const cropHeightInput = document.getElementById('cropHeight');
            
            // Parse values from inputs
            const x = parseInt(cropXInput?.value || '0');
            const y = parseInt(cropYInput?.value || '0');
            const width = parseInt(cropWidthInput?.value || '100');
            const height = parseInt(cropHeightInput?.value || '100');
            
            // Validate crop dimensions
            if (width < 10 || height < 10) {
                const cropStatus = document.getElementById('crop-status');
                if (cropStatus) {
                    cropStatus.textContent = 'Crop area is too small. Please select a larger area.';
                    cropStatus.style.color = '#f44336';
                    setTimeout(() => {
                        cropStatus.textContent = '';
                    }, 3000);
                }
                return;
            }
            
            // Make sure we have valid original image dimensions
            if (!originalImageDimensions || !originalImageDimensions.width || !originalImageDimensions.height) {
                console.warn('Original image dimensions not available, using defaults');
                originalImageDimensions = {
                    width: 720,
                    height: 480
                };
            }
            
            // Initialize cropSettings if it doesn't exist
            if (!cropSettings) {
                cropSettings = new Map();
            }
            
            // Create a crop data object with property names that match what main.js expects
            const cropData = {
                cropX: x,
                cropY: y,
                cropWidth: width,
                cropHeight: height,
                // Store original image dimensions for accurate scaling
                imageWidth: originalImageDimensions.width,
                imageHeight: originalImageDimensions.height
            };
            
            console.log('Storing crop settings with original dimensions:', {
                cropSettings: cropData,
                originalDimensions: originalImageDimensions,
                filePath: selectedFilePath
            });
            
            // Save the crop settings
            cropSettings.set(selectedFilePath, cropData);
            
            // Enable crop checkbox
            const cropEnabledCheckbox = document.getElementById('cropEnabled');
            if (cropEnabledCheckbox) {
                cropEnabledCheckbox.checked = true;
            }
            
            // Update crop thumbnails
            updateCropThumbnails();
            
            // Show success message
            const cropStatus = document.getElementById('crop-status');
            if (cropStatus) {
                cropStatus.textContent = 'Crop settings applied!';
                cropStatus.style.color = '#4CAF50';
                
                // Clear the message after 3 seconds
                setTimeout(() => {
                    cropStatus.textContent = '';
                }, 3000);
            }
            
            // Also update lastCropPosition for tab switching
            lastCropPosition = {
                x: x,
                y: y,
                width: width,
                height: height
            };
            lastCropSelectedFile = selectedFilePath;
            
        } catch (error) {
            console.error('Error applying crop settings:', error);
            const cropStatus = document.getElementById('crop-status');
            if (cropStatus) {
                cropStatus.textContent = `Error: ${error.message || 'Unknown error'}`;
                cropStatus.style.color = '#f44336';
                setTimeout(() => {
                    cropStatus.textContent = '';
                }, 3000);
            }
        }
    }
    
    // Initialize file size calculator
    calculateEstimatedFileSize();

    // Initialize cancel button
    if (cancelButton) {
        cancelButton.addEventListener('click', handleCancelConversion);
    }

    // Function to reset UI for a new conversion
    function resetUIForNewConversion() {
        // Make sure we have all the UI elements
        if (!progressContainer || !progressBar || !progressCount || 
            !progressText || !progressEta || !progressFile || !cancelButton) {
            console.error('Progress UI elements not found, trying to get them again');
            // Try to get the elements again
            progressContainer = document.getElementById('progress-container');
            progressBar = document.getElementById('progress-bar');
            progressText = document.getElementById('progress-percent');
            progressCount = document.getElementById('progress-count');
            progressEta = document.getElementById('progress-eta');
            progressFile = document.getElementById('progress-file');
            cancelButton = document.getElementById('cancel-conversion');
        }
        
        // Reset progress bar
        if (progressBar) {
            progressBar.style.width = '0%';
            progressBar.classList.remove('completed');
            progressBar.classList.remove('cancelled');
        }
        
        // Reset progress text elements
        if (progressText) progressText.textContent = '0%';
        if (progressCount) progressCount.textContent = '0/0 files';
        if (progressFile) progressFile.textContent = 'Starting conversion...';
        if (progressEta) {
            progressEta.textContent = 'Calculating...';
            progressEta.style.color = ''; // Reset color
        }
        
        // Ensure progress container is visible
        if (progressContainer) {
            progressContainer.style.display = 'block';
            console.log('Set progress container display to block in resetUIForNewConversion');
        }
        
        // Ensure cancel button is visible
        if (cancelButton) {
            cancelButton.style.display = 'block';
        }
        
        // Reset any error messages
        const cropStatus = document.getElementById('crop-status');
        if (cropStatus) cropStatus.textContent = '';
        
        console.log('UI reset for new conversion');
    }

    // Function to reset crop settings
    function resetCropSettings() {
        // Check if cropper is initialized and a file is selected
        if (!cropper || !selectedFilePath) {
            console.warn('Cannot reset crop: Cropper not initialized or no file selected');
            const cropStatus = document.getElementById('crop-status');
            if (cropStatus) {
                cropStatus.textContent = 'Please select a file and ensure the cropper is initialized.';
                cropStatus.style.color = '#f44336';
                setTimeout(() => {
                    cropStatus.textContent = '';
                }, 3000);
            }
            return;
        }
        
        try {
            // Get the image data to determine full dimensions
            const imageData = cropper.getImageData();
            console.log('Reset to full image dimensions:', imageData);
            
            // Create a data object for the full image (no crop)
            const fullImageData = {
                x: 0,
                y: 0,
                width: imageData.naturalWidth,
                height: imageData.naturalHeight,
                scaleX: 1,
                scaleY: 1
            };
            
            // Reset the cropper to full image
            cropper.reset(); // Reset to initial state
            cropper.clear(); // Clear the crop box
            
            // Wait a moment for the reset to complete
            setTimeout(() => {
                try {
                    // Set to full image
                    cropper.setData(fullImageData);
                    
                    // Update the crop input fields to match the full image
                    const cropXInput = document.getElementById('cropX');
                    const cropYInput = document.getElementById('cropY');
                    const cropWidthInput = document.getElementById('cropWidth');
                    const cropHeightInput = document.getElementById('cropHeight');
                    
                    if (cropXInput) cropXInput.value = 0;
                    if (cropYInput) cropYInput.value = 0;
                    if (cropWidthInput && imageData) {
                        cropWidthInput.value = Math.round(imageData.naturalWidth);
                    }
                    if (cropHeightInput && imageData) {
                        cropHeightInput.value = Math.round(imageData.naturalHeight);
                    }
                    
                    // Store original dimensions
                    originalImageDimensions = {
                        width: imageData ? imageData.naturalWidth : 720,
                        height: imageData ? imageData.naturalHeight : 480
                    };
                    
                    console.log('Updated crop input fields to full image dimensions');
                } catch (e) {
                    console.error('Error setting full image data after reset:', e);
                }
            }, 100);
            
            // Remove saved crop settings for this file
            if (cropSettings && typeof cropSettings.delete === 'function' && cropSettings.has(selectedFilePath)) {
                cropSettings.delete(selectedFilePath);
                console.log('Deleted crop settings for:', selectedFilePath);
            }
            
            // Remove saved cropper state for this file
            if (cropperStates.has(selectedFilePath)) {
                cropperStates.delete(selectedFilePath);
                console.log('Deleted saved cropper state for:', selectedFilePath);
            }
            
            // Uncheck crop enabled checkbox
            const cropEnabledCheckbox = document.getElementById('cropEnabled');
            if (cropEnabledCheckbox) {
                cropEnabledCheckbox.checked = false;
            }
            
            // Update crop thumbnails
            updateCropThumbnails();
            
            // Show success message
            const cropStatus = document.getElementById('crop-status');
            if (cropStatus) {
                cropStatus.textContent = 'Crop settings reset!';
                cropStatus.style.color = '#4CAF50';
                
                // Clear the message after 3 seconds
                setTimeout(() => {
                    cropStatus.textContent = '';
                }, 3000);
            }
            
            console.log('Crop settings reset for:', selectedFilePath);
        } catch (error) {
            console.error('Error resetting crop settings:', error);
            const cropStatus = document.getElementById('crop-status');
            if (cropStatus) {
                cropStatus.textContent = `Error: ${error.message || 'Unknown error'}`;
                cropStatus.style.color = '#f44336';
                setTimeout(() => {
                    cropStatus.textContent = '';
                }, 3000);
            }
        }
    }

    // Function to update crop input fields directly from the cropper
    function updateCropInputFields() {
        try {
            if (!cropper) {
                console.warn('Cannot update crop input fields: Cropper not initialized');
                return;
            }
            
            // Get the crop data directly from the cropper
            const cropData = cropper.getData();
            
            // Round values to integers
            const actualX = Math.round(cropData.x);
            const actualY = Math.round(cropData.y);
            const actualWidth = Math.round(cropData.width);
            const actualHeight = Math.round(cropData.height);
            
            console.log('Calculated crop dimensions from cropper:', {
                x: actualX,
                y: actualY,
                width: actualWidth,
                height: actualHeight,
                originalWidth: originalImageDimensions?.width,
                originalHeight: originalImageDimensions?.height
            });
            
            // Update the input fields
            const cropXInput = document.getElementById('cropX');
            const cropYInput = document.getElementById('cropY');
            const cropWidthInput = document.getElementById('cropWidth');
            const cropHeightInput = document.getElementById('cropHeight');
            
            if (cropXInput) cropXInput.value = actualX;
            if (cropYInput) cropYInput.value = actualY;
            if (cropWidthInput) cropWidthInput.value = actualWidth;
            if (cropHeightInput) cropHeightInput.value = actualHeight;
            
            // Calculate and display aspect ratio
            const aspectRatioDisplay = document.getElementById('aspectRatio');
            if (aspectRatioDisplay && actualWidth && actualHeight) {
                // Calculate GCD for simplification
                const gcd = (a, b) => b ? gcd(b, a % b) : a;
                const divisor = gcd(actualWidth, actualHeight);
                
                // Display simplified aspect ratio
                const ratioWidth = actualWidth / divisor;
                const ratioHeight = actualHeight / divisor;
                
                // Only show simplified ratio if it's reasonable (not too large numbers)
                if (ratioWidth < 100 && ratioHeight < 100) {
                    aspectRatioDisplay.textContent = `${ratioWidth}:${ratioHeight}`;
                } else {
                    // Just show decimal ratio if simplified ratio has large numbers
                    const decimalRatio = (actualWidth / actualHeight).toFixed(2);
                    aspectRatioDisplay.textContent = `${decimalRatio}:1`;
                }
            }
            
            // Auto-save crop settings if crop is enabled
            const cropEnabledCheckbox = document.getElementById('cropEnabled');
            if (cropEnabledCheckbox && cropEnabledCheckbox.checked && selectedFilePath) {
                // Initialize cropSettings if it doesn't exist
                if (!cropSettings) {
                    cropSettings = new Map();
                }
                
                // Create a crop data object
                const cropData = {
                    cropX: actualX,
                    cropY: actualY,
                    cropWidth: actualWidth,
                    cropHeight: actualHeight,
                    imageWidth: originalImageDimensions?.width,
                    imageHeight: originalImageDimensions?.height
                };
                
                // Save the crop settings
                cropSettings.set(selectedFilePath, cropData);
                console.log('Auto-saved crop settings:', cropData);
            }
        } catch (error) {
            console.error('Error updating crop input fields:', error);
        }
    }

    // Document ready
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Document ready');
        
        // Set up listener for thumbnail-generated event
        window.electron.on('thumbnail-generated', (thumbnailData) => {
            if (!thumbnailData || !thumbnailData.filePath || !thumbnailData.thumbnail) {
                console.error('Invalid thumbnail data received');
                return;
            }
            
            // Update thumbnails in the files tab
            const fileItem = document.querySelector(`.file-item[data-path="${CSS.escape(thumbnailData.filePath)}"]`);
            if (fileItem) {
                const thumbnail = fileItem.querySelector('.file-thumbnail');
                if (thumbnail) {
                    thumbnail.src = thumbnailData.thumbnail;
                    thumbnail.alt = 'Thumbnail';
                }
            }
            
            // Update thumbnails in the crop tab
            const cropThumbnail = document.querySelector(`.crop-thumbnail[data-path="${CSS.escape(thumbnailData.filePath)}"]`);
            if (cropThumbnail) {
                const thumbnailImg = cropThumbnail.querySelector('.thumbnail-img');
                if (thumbnailImg) {
                    thumbnailImg.src = thumbnailData.thumbnail;
                }
            }
            
            // Update the cropper image if it's for the selected file
            if (selectedFilePath === thumbnailData.filePath) {
                const cropperImage = document.getElementById('cropperImage');
                if (cropperImage) {
                    cropperImage.src = thumbnailData.thumbnail;
                }
            }
        });
        
        // Initialize UI
        updateConvertButtonState();
    });

    // Function to update cropper from input fields
    function updateCropperFromInputs() {
        if (!cropper) {
            console.warn('Cannot update cropper: Cropper not initialized');
            return;
        }
        
        try {
            const cropXInput = document.getElementById('cropX');
            const cropYInput = document.getElementById('cropY');
            const cropWidthInput = document.getElementById('cropWidth');
            const cropHeightInput = document.getElementById('cropHeight');
            
            // Get values from inputs
            const x = parseInt(cropXInput?.value || '0');
            const y = parseInt(cropYInput?.value || '0');
            const width = parseInt(cropWidthInput?.value || '100');
            const height = parseInt(cropHeightInput?.value || '100');
            
            // Validate dimensions
            if (width < 10 || height < 10) {
                console.warn('Crop dimensions too small, using minimum values');
                if (width < 10) cropWidthInput.value = 10;
                if (height < 10) cropHeightInput.value = 10;
                return;
            }
            
            // Create data object for cropper
            const cropData = {
                x: x,
                y: y,
                width: width,
                height: height,
                scaleX: 1,
                scaleY: 1
            };
            
            console.log('Updating cropper with data from inputs:', cropData);
            
            // Update cropper
            cropper.setData(cropData);
            
            // Enable crop checkbox since we're manually setting crop
            const cropEnabledCheckbox = document.getElementById('cropEnabled');
            if (cropEnabledCheckbox) {
                cropEnabledCheckbox.checked = true;
            }
            
            // Save the crop settings
            applyCropSettings();
        } catch (error) {
            console.error('Error updating cropper from inputs:', error);
        }
    }

    // Update the text overlay file selector with current files
    function updateTextOverlayFileSelector() {
        console.log('Updating text overlay file selector with files:', filesToConvert);
        const textOverlayFileSelector = document.getElementById('textOverlayFileSelector');
        if (!textOverlayFileSelector) {
            console.error('Text overlay file selector element not found');
            return;
        }
        
        // Clear existing content
        textOverlayFileSelector.innerHTML = '';
        
        if (!filesToConvert || filesToConvert.length === 0) {
            console.log('No files to display in text overlay selector');
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = 'No files added yet';
            textOverlayFileSelector.appendChild(emptyMessage);
            return;
        }
        
        console.log(`Adding ${filesToConvert.length} files to text overlay selector`);
        
        // Add a checkbox for each file
        filesToConvert.forEach((filePath, index) => {
            if (!filePath) {
                console.warn(`Skipping undefined file path at index ${index}`);
                return;
            }
            
            console.log('Adding file to text overlay selector:', filePath);
            const fileCheckbox = document.createElement('div');
            fileCheckbox.className = 'file-checkbox';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `text-overlay-file-${index}`;
            checkbox.value = filePath;
            checkbox.checked = true; // Default to checked
            
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = filePath.split('\\').pop() || filePath;
            
            fileCheckbox.appendChild(checkbox);
            fileCheckbox.appendChild(label);
            textOverlayFileSelector.appendChild(fileCheckbox);
        });
    }
    
    // Update the preview file selector with current files
    function updatePreviewFileSelector() {
        console.log('Updating preview file selector with files:', filesToConvert);
        const previewFileSelector = document.getElementById('previewFileSelector');
        if (!previewFileSelector) {
            console.error('Preview file selector element not found');
            return;
        }
        
        // Save the current selection
        const currentSelection = previewFileSelector.value;
        
        // Clear existing options except the first one
        while (previewFileSelector.options.length > 1) {
            previewFileSelector.remove(1);
        }
        
        if (!filesToConvert || filesToConvert.length === 0) {
            console.log('No files to display in preview selector');
            return;
        }
        
        console.log(`Adding ${filesToConvert.length} files to preview selector`);
        
        // Add an option for each file
        filesToConvert.forEach((filePath, index) => {
            if (!filePath) {
                console.warn(`Skipping undefined file path at index ${index}`);
                return;
            }
            
            console.log('Adding file to preview selector:', filePath);
            const option = document.createElement('option');
            option.value = filePath;
            option.textContent = filePath.split('\\').pop() || filePath;
            previewFileSelector.appendChild(option);
        });
        
        // Restore the selection if it still exists
        if (currentSelection && filesToConvert.includes(currentSelection)) {
            previewFileSelector.value = currentSelection;
        } else if (filesToConvert.length > 0) {
            previewFileSelector.value = filesToConvert[0]; // Select the first file
        } else {
            previewFileSelector.value = ''; // No files available
        }
    }
    
    // Get the list of selected files for text overlay
    function getSelectedTextOverlayFiles() {
        const selectedFiles = [];
        document.querySelectorAll('#textOverlayFileSelector input[type="checkbox"]:checked').forEach(checkbox => {
            selectedFiles.push(checkbox.value);
        });
        return selectedFiles;
    }
    
    // Initialize UI elements
    updateTextOverlayFileSelector();
    updatePreviewFileSelector();
    updateSizeEstimatorFileSelector();
    
    // Initialize event listeners for text overlay file selector buttons
    const selectAllTextFilesBtn = document.getElementById('selectAllTextFiles');
    const deselectAllTextFilesBtn = document.getElementById('deselectAllTextFiles');
    
    if (selectAllTextFilesBtn) {
        selectAllTextFilesBtn.addEventListener('click', () => {
            document.querySelectorAll('#textOverlayFileSelector input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = true;
            });
        });
    }
    
    if (deselectAllTextFilesBtn) {
        deselectAllTextFilesBtn.addEventListener('click', () => {
            document.querySelectorAll('#textOverlayFileSelector input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = false;
            });
        });
    }
    
    // Initialize the preview file selector
    const previewFileSelector = document.getElementById('previewFileSelector');
    if (previewFileSelector) {
        previewFileSelector.addEventListener('change', () => {
            // Update the selected file path for preview
            if (previewFileSelector.value) {
                selectedFilePath = previewFileSelector.value;
            }
        });
    }

    // Update the size estimator file selector with current files
    function updateSizeEstimatorFileSelector() {
        console.log('Updating size estimator file selector with files:', filesToConvert);
        const sizeEstimatorFileSelector = document.getElementById('sizeEstimatorFileSelector');
        if (!sizeEstimatorFileSelector) {
            console.error('Size estimator file selector element not found');
            return;
        }
        
        // Save the current selection
        const currentSelection = sizeEstimatorFileSelector.value;
        
        // Clear existing options except the first one
        while (sizeEstimatorFileSelector.options.length > 1) {
            sizeEstimatorFileSelector.remove(1);
        }
        
        if (!filesToConvert || filesToConvert.length === 0) {
            console.log('No files to display in size estimator selector');
            return;
        }
        
        console.log(`Adding ${filesToConvert.length} files to size estimator selector`);
        
        // Add an option for each file
        filesToConvert.forEach((filePath, index) => {
            if (!filePath) {
                console.warn(`Skipping undefined file path at index ${index}`);
                return;
            }
            
            console.log('Adding file to size estimator selector:', filePath);
            const option = document.createElement('option');
            option.value = filePath;
            option.textContent = filePath.split('\\').pop() || filePath;
            sizeEstimatorFileSelector.appendChild(option);
        });
        
        // Restore previous selection if it still exists
        if (currentSelection) {
            for (let i = 0; i < sizeEstimatorFileSelector.options.length; i++) {
                if (sizeEstimatorFileSelector.options[i].value === currentSelection) {
                    sizeEstimatorFileSelector.selectedIndex = i;
                    break;
                }
            }
        }
        
        // If no selection, select the first file
        if (sizeEstimatorFileSelector.selectedIndex === 0 && sizeEstimatorFileSelector.options.length > 1) {
            sizeEstimatorFileSelector.selectedIndex = 1;
        }
    }
});

// Handle cancel button click
function handleCancelConversion() {
    // Check if conversion is in progress
    if (progressContainer && progressContainer.style.display === 'block') {
        // Send cancel event to main process
        window.electron.cancelConversion();
        
        // Update UI
        progressFile.textContent = 'Conversion cancelled';
        progressEta.textContent = 'Cancelled';
        
        // Add cancelled class to progress bar
        progressBar.classList.add('cancelled');
        
        // Hide progress container after a delay
        setTimeout(() => {
            progressContainer.style.display = 'none';
            progressBar.classList.remove('cancelled');
            progressBar.classList.remove('completed');
        }, 3000);
        
        console.log('Conversion cancelled by user');
    }
}
