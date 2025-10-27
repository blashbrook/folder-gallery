[Home](../README.md) | [Installation](installation.md) | [CLI](cli.md) | [Server](server.md) | [Video thumbnails](video-thumbnails.md) | [Troubleshooting](troubleshooting.md)

# Installation and Requirements

- Node.js 18+ (recommended)
- macOS: Xcode Command Line Tools (`xcode-select --install`)
- Linux: build tools (`build-essential`)  
- Windows: Visual Studio Build Tools

Optional but recommended:
- FFmpeg (for real video frame thumbnails)
  - macOS: `brew install ffmpeg`
  - Linux: `sudo apt-get install ffmpeg`
  - Windows: `choco install ffmpeg`

## Install
```bash
npm install -g folder-gallery
```

This installs a minimal package (CLI + server). Docs/tests are not included in the published tarball.

### Dev extras (optional)
```bash
# Run dev postinstall tasks (no-op placeholder)
npm run local-install
# or
FG_DEV=1 npm install -g folder-gallery
```

## Update
```bash
npm update -g folder-gallery
```
