#!/usr/bin/env node

// This is a custom electron.js file that will be used to start the application
// without loading ffmpeg. It sets environment variables to disable media features
// before requiring the electron module.

// Set environment variables to disable media features
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
process.env.ELECTRON_ENABLE_LOGGING = 'false';
process.env.ELECTRON_DISABLE_SCREEN_WAKE = 'true';
process.env.ELECTRON_FORCE_WINDOW_MENU_BAR = 'false';
process.env.ELECTRON_TRASH = 'false';
process.env.ELECTRON_NO_ASAR = 'false';
process.env.ELECTRON_NO_ATTACH_CONSOLE = 'true';
process.env.ELECTRON_SKIP_BINARY_DOWNLOAD = 'true';
process.env.ELECTRON_DISABLE_GPU = 'true';
process.env.ELECTRON_DISABLE_RENDERER_BACKGROUNDING = 'true';
process.env.ELECTRON_DISABLE_SANDBOX = 'true';
process.env.ELECTRON_DISABLE_CRASH_REPORTER = 'true';
process.env.ELECTRON_DISABLE_NETWORK_SERVICE = 'true';
process.env.ELECTRON_DISABLE_FRAME_RATE_LIMIT = 'true';
process.env.ELECTRON_DISABLE_DOMAIN_BLOCKING_FOR_3D_APIS = 'true';
process.env.ELECTRON_DISABLE_HARDWARE_ACCELERATION = 'true';
process.env.ELECTRON_DISABLE_ACCELERATED_2D_CANVAS = 'true';
process.env.ELECTRON_DISABLE_ACCELERATED_VIDEO_DECODE = 'true';
process.env.ELECTRON_DISABLE_ACCELERATED_VIDEO_ENCODE = 'true';
process.env.ELECTRON_DISABLE_ACCELERATED_MJPEG_DECODE = 'true';
process.env.ELECTRON_DISABLE_ACCELERATED_JPEG_DECODE = 'true';
process.env.ELECTRON_DISABLE_ACCELERATED_WEBP_DECODE = 'true';
process.env.ELECTRON_DISABLE_ACCELERATED_MEDIA = 'true';
process.env.ELECTRON_DISABLE_MEDIA = 'true';
process.env.ELECTRON_DISABLE_MEDIA_CAPTURE = 'true';
process.env.ELECTRON_DISABLE_MEDIA_SESSION = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_AUDIO = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_VIDEO = 'true';
process.env.ELECTRON_DISABLE_MEDIA_SOURCE = 'true';
process.env.ELECTRON_DISABLE_MEDIA_RECORDER = 'true';
process.env.ELECTRON_DISABLE_MEDIA_DEVICES = 'true';
process.env.ELECTRON_DISABLE_MEDIA_GALLERY = 'true';
process.env.ELECTRON_DISABLE_MEDIA_CONTROLS = 'true';
process.env.ELECTRON_DISABLE_MEDIA_CAPABILITIES = 'true';
process.env.ELECTRON_DISABLE_MEDIA_ENGAGEMENT = 'true';
process.env.ELECTRON_DISABLE_MEDIA_EXPERIENCE = 'true';
process.env.ELECTRON_DISABLE_MEDIA_FEED = 'true';
process.env.ELECTRON_DISABLE_MEDIA_INTERNALS = 'true';
process.env.ELECTRON_DISABLE_MEDIA_ROUTER = 'true';
process.env.ELECTRON_DISABLE_MEDIA_REMOTING = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_DISPATCHER = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_TRACK = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_AUDIO_SOURCE = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_VIDEO_SOURCE = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_AUDIO_SINK = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_VIDEO_SINK = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_AUDIO_PROCESSOR = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_VIDEO_PROCESSOR = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_AUDIO_RENDERER = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_VIDEO_RENDERER = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_AUDIO_TRACK = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_VIDEO_TRACK = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_AUDIO_TRACK_SINK = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_VIDEO_TRACK_SINK = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_AUDIO_TRACK_SOURCE = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_VIDEO_TRACK_SOURCE = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_AUDIO_TRACK_PROCESSOR = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_VIDEO_TRACK_PROCESSOR = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_AUDIO_TRACK_RENDERER = 'true';
process.env.ELECTRON_DISABLE_MEDIA_STREAM_VIDEO_TRACK_RENDERER = 'true';

// Add command line arguments to disable media features
const args = process.argv.slice(2);
args.push('--disable-features=AudioServiceOutOfProcess,MediaSessionService,WebRTC,WebRTCPipeWireCapturer');
args.push('--disable-speech-api');
args.push('--disable-web-security');
args.push('--disable-renderer-backgrounding');
args.push('--disable-accelerated-video-decode');
args.push('--disable-accelerated-video-encode');
args.push('--disable-gpu-memory-buffer-video-frames');
args.push('--disable-software-rasterizer');
args.push('--disable-logging');
args.push('--no-sandbox');
args.push('--disable-gpu');
args.push('--disable-audio');
args.push('--disable-audio-input');
args.push('--disable-audio-output');
args.push('--disable-d3d11');
args.push('--disable-gpu-compositing');
args.push('--disable-gpu-driver-bug-workarounds');
args.push('--disable-gpu-early-init');
args.push('--disable-gpu-memory-buffer-compositor-resources');
args.push('--disable-gpu-process');
args.push('--disable-gpu-program-cache');
args.push('--disable-gpu-rasterization');
args.push('--disable-gpu-sandbox');
args.push('--disable-gpu-shader-disk-cache');
args.push('--disable-gpu-vsync');
args.push('--disable-media-session-api');
args.push('--disable-remote-playback-api');
args.push('--disable-webrtc-hw-decoding');
args.push('--disable-webrtc-hw-encoding');

// Require the electron module and start the application
const electron = require('electron');
const childProcess = require('child_process');
const path = require('path');

// Start the application
const proc = childProcess.spawn(electron, args.concat([path.join(__dirname, 'main.js')]), {
  stdio: 'inherit',
  windowsHide: false
});

proc.on('close', (code) => {
  process.exit(code);
}); 