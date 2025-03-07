const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const electronPackager = require('electron-packager');

// Ensure the dist directory exists
const distDir = path.join(__dirname, '..', '..', 'dist_v2');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

console.log('Building GIFME Standalone Updater...');

// Install dependencies
console.log('Installing dependencies...');
execSync('npm install electron-packager --save-dev', { stdio: 'inherit', cwd: __dirname });

// Create a custom package.json for the build
const customPackageJson = {
  name: 'gifme-updater',
  version: '1.0.0',
  description: 'Standalone updater for GIFME application',
  main: 'main.js',
  bin: {
    'gifme-updater': './electron.js'
  },
  author: 'salvatoreascal',
  license: 'MIT',
  build: {
    appId: 'com.salvatoreascal.gifme-updater',
    productName: 'GIFME Updater',
    electronDist: path.join(__dirname, 'dist'),
    extraResources: [
      {
        from: path.join(__dirname, 'assets'),
        to: 'assets',
        filter: ['**/*']
      }
    ],
    files: [
      "**/*",
      "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}",
      "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
      "!**/node_modules/*.d.ts",
      "!**/node_modules/.bin",
      "!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}",
      "!.editorconfig",
      "!**/._*",
      "!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}",
      "!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}",
      "!**/{appveyor.yml,.travis.yml,circle.yml}",
      "!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}",
      "!**/ffmpeg.dll",
      "!**/libffmpeg.dll",
      "!**/libffmpeg.so",
      "!**/libffmpeg.dylib",
      "!**/ffmpeg-static/**/*",
      "!**/ffmpeg/**/*"
    ]
  }
};

// Write the custom package.json to a file
fs.writeFileSync(path.join(__dirname, 'build-package.json'), JSON.stringify(customPackageJson, null, 2));

// Build with electron-packager
console.log('Packaging updater...');

const packagerOptions = {
  dir: __dirname,
  out: path.join(__dirname, '..', '..', 'dist_v2', 'updater-build'),
  name: 'GIFME Updater',
  platform: 'win32',
  arch: 'x64',
  overwrite: true,
  asar: true,
  icon: path.join(__dirname, 'assets', 'icon.ico'),
  ignore: [
    /node_modules\/(ffmpeg-static)/,
    /ffmpeg/,
    /\.git/,
    /\.vscode/,
    /dist/,
    /build/,
    /\.gitignore/,
    /\.DS_Store/,
    /README\.md/,
    /LICENSE/,
    /package-lock\.json/,
    /yarn\.lock/
  ],
  extraResource: [
    path.join(__dirname, 'assets')
  ],
  afterCopy: [
    (buildPath, electronVersion, platform, arch, callback) => {
      console.log('After copy hook running...');
      
      // Remove any ffmpeg files that might have been copied
      const ffmpegFiles = [
        path.join(buildPath, 'ffmpeg.dll'),
        path.join(buildPath, 'libffmpeg.dll'),
        path.join(buildPath, 'libffmpeg.so'),
        path.join(buildPath, 'libffmpeg.dylib'),
        path.join(buildPath, 'node_modules', 'ffmpeg-static'),
        path.join(buildPath, 'node_modules', 'ffmpeg')
      ];
      
      // Also search for any ffmpeg files in the node_modules directory
      const nodeModulesDir = path.join(buildPath, 'node_modules');
      if (fs.existsSync(nodeModulesDir)) {
        const nodeModules = fs.readdirSync(nodeModulesDir);
        for (const module of nodeModules) {
          if (module.includes('ffmpeg')) {
            ffmpegFiles.push(path.join(nodeModulesDir, module));
          }
        }
      }
      
      // Remove all ffmpeg files
      for (const file of ffmpegFiles) {
        if (fs.existsSync(file)) {
          console.log(`Removing ${file}`);
          if (fs.lstatSync(file).isDirectory()) {
            fs.rmdirSync(file, { recursive: true });
          } else {
            fs.unlinkSync(file);
          }
        }
      }
      
      // Copy the electron.js file to the build directory
      fs.copyFileSync(
        path.join(__dirname, 'electron.js'),
        path.join(buildPath, 'electron.js')
      );
      
      callback();
    }
  ],
  tmpdir: path.join(__dirname, '..', '..', 'tmp-electron-build'),
  download: {
    cache: path.join(__dirname, '..', '..', 'electron-cache'),
    mirror: 'https://github.com/electron/electron/releases/download'
  }
};

electronPackager(packagerOptions)
  .then(appPaths => {
    console.log(`Updater packaged at: ${appPaths[0]}`);
    
    // Clean up the build-package.json
    if (fs.existsSync(path.join(__dirname, 'build-package.json'))) {
      fs.unlinkSync(path.join(__dirname, 'build-package.json'));
    }
    
    console.log('GIFME Standalone Updater built successfully!');
  })
  .catch(err => {
    console.error('Error packaging updater:', err);
    process.exit(1);
  }); 