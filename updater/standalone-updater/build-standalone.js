const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure the dist directory exists
const distDir = path.join(__dirname, '..', '..', 'dist_v2');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

console.log('Building GIFME Standalone Updater...');

// First, build the updater using the build.js script
console.log('Building the updater with electron-packager...');
try {
  execSync('node build.js', { stdio: 'inherit', cwd: __dirname });
  console.log('Standalone updater built successfully!');
  console.log(`Updater files are in: ${path.join(distDir, 'updater-build', 'GIFME Updater-win32-x64')}`);
} catch (error) {
  console.error('Error building updater:', error);
  process.exit(1);
} 