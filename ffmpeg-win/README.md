# FFmpeg for GIFME

This directory should contain FFmpeg binaries required for GIFME to function.

## Required Files

The following files should be placed in the `bin` directory:

- `ffmpeg.exe`
- `ffprobe.exe`
- `ffplay.exe`

## How to Obtain FFmpeg

Due to GitHub file size limitations, FFmpeg executables are not included in this repository. You need to download them separately:

1. Run the `download-ffmpeg.bat` script in the root directory, or
2. Download FFmpeg for Windows from [ffmpeg.org](https://ffmpeg.org/download.html) or [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) (recommended: ffmpeg-release-essentials build)
3. Extract the downloaded archive
4. Copy the required files to the `bin` directory

## Verification

After placing the files in the correct location, you can run `check-binaries.bat` from the root directory to verify that all required binaries are present. 