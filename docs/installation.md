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

### Installation Feedback

After installation, you'll see a friendly banner with:
- ✅ **Sharp status**: Confirms image thumbnail support is available
- ✅ **macOS tag status**: Confirms Finder tags support (macOS only)
- 🚀 **Quick start commands**: Get your first gallery running immediately
- ⚠️ **Installation instructions**: If optional dependencies are missing

**Example output:**
```
╬════════════════════════════════════════════════════════════╩
║  📸 Folder Gallery - Installed Successfully               ║
╙════════════════════════════════════════════════════════════╜

👤 Created by Brian Lashbrook
📖 View Docs: https://github.com/blashbrook/folder-gallery#readme

✅ Sharp: Image thumbnails enabled
✅ macOS tag: Finder tags enabled

🚀 Quick Start:
   cd /path/to/photos
   gallery up
```

If dependencies are missing, you'll see warnings with installation instructions:
```
⚠️  Sharp: Not found - thumbnails will be disabled
   Install with: npm install -g sharp

⚠️  macOS tag: Not found - Finder tags will be disabled
   Install with: brew install tag
   Info: https://github.com/jdberry/tag
```

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
