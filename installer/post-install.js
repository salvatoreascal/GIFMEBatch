const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Only run on Windows
if (process.platform !== 'win32') {
    console.log('This script is only for Windows systems.');
    process.exit(0);
}

// This script runs after the app is installed
// It adds the ffmpeg and gifsicle binaries to the user's PATH if they're not already there

// Get the path to the app's resources directory
const appPath = process.cwd();
const isProduction = !appPath.includes('node_modules');

// In production, the binaries are in the resources directory
// In development, they're in the project root
let ffmpegPath, gifsiclePath;

if (isProduction) {
    // In production, the binaries are in the resources directory
    const resourcesPath = path.join(process.resourcesPath);
    ffmpegPath = path.join(resourcesPath, 'ffmpeg-win', 'bin');
    gifsiclePath = path.join(resourcesPath, 'gifsicle-win');
} else {
    // In development, they're in the project root
    ffmpegPath = path.join(appPath, 'ffmpeg-win', 'bin');
    gifsiclePath = path.join(appPath, 'gifsicle-win');
}

console.log('FFmpeg path:', ffmpegPath);
console.log('Gifsicle path:', gifsiclePath);

// Check if the directories exist
if (!fs.existsSync(ffmpegPath)) {
    console.error('FFmpeg directory not found:', ffmpegPath);
    process.exit(1);
}

if (!fs.existsSync(gifsiclePath)) {
    console.error('Gifsicle directory not found:', gifsiclePath);
    process.exit(1);
}

// Function to check if a path is already in the PATH
function isInPath(pathToCheck) {
    const envPath = process.env.PATH || '';
    const paths = envPath.split(path.delimiter);
    return paths.some(p => p.toLowerCase() === pathToCheck.toLowerCase());
}

// Function to add a path to the user's PATH
function addToPath(pathToAdd) {
    if (isInPath(pathToAdd)) {
        console.log(`${pathToAdd} is already in PATH`);
        return Promise.resolve();
    }

    console.log(`Adding ${pathToAdd} to PATH...`);
    
    // Use PowerShell to add to PATH (user level)
    const command = `
        [Environment]::SetEnvironmentVariable(
            "PATH",
            [Environment]::GetEnvironmentVariable("PATH", "User") + "${path.delimiter}${pathToAdd}",
            "User"
        )
    `;
    
    return new Promise((resolve, reject) => {
        exec(`powershell -Command "${command}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error adding to PATH: ${error.message}`);
                console.error(`stderr: ${stderr}`);
                reject(error);
            } else {
                console.log(`Successfully added ${pathToAdd} to PATH`);
                resolve();
            }
        });
    });
}

// Add both directories to PATH
Promise.all([
    addToPath(ffmpegPath),
    addToPath(gifsiclePath)
])
    .then(() => {
        console.log('Successfully added FFmpeg and Gifsicle to PATH');
    })
    .catch(error => {
        console.error('Error adding to PATH:', error);
    }); 