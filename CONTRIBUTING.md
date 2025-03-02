# Contributing to GIFME

Thank you for your interest in contributing to GIFME! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with the following information:
- A clear, descriptive title
- Steps to reproduce the bug
- Expected behavior
- Actual behavior
- Screenshots if applicable
- Your operating system and application version

### Suggesting Features

We welcome feature suggestions! Please create an issue with:
- A clear, descriptive title
- A detailed description of the proposed feature
- Any relevant mockups or examples
- Why this feature would be beneficial to users

### Pull Requests

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Development Setup

1. Clone the repository:
   ```
   git clone https://github.com/salvatoreascal/gifme.git
   cd gifme
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up FFmpeg:
   Due to GitHub file size limitations, FFmpeg executables are not included in this repository. You need to download them separately:
   - Run `download-ffmpeg.bat` or manually download FFmpeg from [ffmpeg.org](https://ffmpeg.org/download.html)
   - Copy `ffmpeg.exe`, `ffprobe.exe`, and `ffplay.exe` to the `ffmpeg-win/bin` directory

4. Run the application in development mode:
   ```
   npm start
   ```

## Building and Testing

### Building the Executable

```
.\build-exe-only.bat
```

### Building the Installer

```
.\build-inno-installer.bat
```

## Style Guidelines

- Use consistent indentation (2 spaces)
- Follow JavaScript Standard Style
- Write clear, descriptive commit messages
- Comment your code when necessary

## License

By contributing to GIFME, you agree that your contributions will be licensed under the project's MIT License. 