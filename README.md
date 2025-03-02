# GIFME - MP4 to GIF Converter

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows-brightgreen.svg)](https://github.com/salvatoreascal/gifme)

GIFME is a desktop application that allows you to easily convert MP4 videos to optimized GIFs with a clean, user-friendly interface.

## Features

- Drag and drop MP4 files for conversion
- Batch processing of multiple videos at once
- Preview thumbnails of videos before conversion
- High-quality GIF conversion with optimized settings
- Bundled with FFmpeg and Gifsicle - no external dependencies required
- Simple and intuitive user interface
- Support development with Solana donations

## Screenshots

![GIFME Application](screenshots/app-screenshot.png)
![Conversion Process](screenshots/conversion-screenshot.png)

## Installation

### Windows Installer

1. Download the latest installer (`GIFME-Setup.exe`) from the [releases page](https://github.com/salvatoreascal/gifme/releases)
2. Run the installer and follow the on-screen instructions
3. Launch GIFME from your desktop or start menu

### Portable Version

1. Download the portable version from the [releases page](https://github.com/salvatoreascal/gifme/releases)
2. Extract the ZIP file to any location
3. Run `GIFME.exe` to start the application

## Usage

1. Launch the GIFME application
2. Drag and drop MP4 files onto the drop zone, or click to browse for files
3. Select a save location for the converted GIFs
4. Click the "Convert to GIF" button
5. The converted GIFs will be saved to the selected location

## Technical Details

GIFME is built with:
- [Electron](https://www.electronjs.org/) - Cross-platform desktop application framework
- [FFmpeg](https://ffmpeg.org/) - Video processing library
- [Gifsicle](https://www.lcdf.org/gifsicle/) - GIF optimization tool

## Building from Source

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)
- Inno Setup 6 (for building the Windows installer)
- FFmpeg binaries (see below)

### FFmpeg Setup

Due to GitHub file size limitations, FFmpeg executables are not included in this repository. You need to download them separately:

1. Download FFmpeg for Windows from [ffmpeg.org](https://ffmpeg.org/download.html) or [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) (recommended: ffmpeg-release-essentials build)
2. Extract the downloaded archive
3. Copy the following files to the `ffmpeg-win/bin` directory in this project:
   - `ffmpeg.exe`
   - `ffprobe.exe`
   - `ffplay.exe`

### Setup

1. Clone the repository:
   ```
   git clone https://github.com/salvatoreascal/gifme.git
   cd gifme
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up FFmpeg as described above

4. Run the application in development mode:
   ```
   npm start
   ```

### Building the Executable

1. Make sure you have the FFmpeg and Gifsicle binaries in the `ffmpeg-win` and `gifsicle-win` directories
2. Build the executable:
   ```
   .\build-exe-only.bat
   ```
3. The executable will be created in the `dist_v2\packaged\GIFME-win32-x64` directory

### Building the Installer

1. Install [Inno Setup 6](https://jrsoftware.org/isdl.php)
2. Build the executable first using the steps above
3. Build the installer:
   ```
   .\build-inno-installer.bat
   ```
4. The installer will be created as `dist\GIFME-Setup.exe`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [FFmpeg](https://ffmpeg.org/) - For video processing
- [Gifsicle](https://www.lcdf.org/gifsicle/) - For GIF optimization
- [Electron](https://www.electronjs.org/) - For the application framework
- [Inno Setup](https://jrsoftware.org/isinfo.php) - For creating the Windows installer

## Support

If you find this application useful, consider supporting development by donating to our Solana wallet:
```
8ZwXjQsVPiQRGgM4qhNiWYmJLaYnJjhwwmXpYEDYE7Gn
```

## Contact

GitHub: [https://github.com/salvatoreascal](https://github.com/salvatoreascal)  
