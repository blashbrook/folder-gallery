[Home](../README.md) | [Installation](installation.md) | [CLI](cli.md) | [Server](server.md) | [Video thumbnails](video-thumbnails.md) | [Troubleshooting](troubleshooting.md)

# Troubleshooting

## Common Issues

- **Can't open page?** Hard refresh, then open http://localhost:3000 directly.
- **No thumbnails generating?** Sharp may not be installed. See "Sharp Installation Issues" below.
- **Placeholders only for videos?** Ensure FFmpeg is installed and not disabled.
- **Thumbnails stale?** Delete `.gallery-cache/thumbnails` and reload.
- **Multiple servers?** Run `gallery down`, then start a single instance.

## Sharp Installation Issues

If you see "Sharp not available" warnings or thumbnails aren't generating:

**On macOS:**
```bash
# Install Xcode Command Line Tools first
xcode-select --install

# Then install Sharp globally
npm install -g sharp
```

**On Linux:**
```bash
# Install build tools first (Ubuntu/Debian)
sudo apt-get install build-essential python3

# Or on CentOS/RHEL
sudo yum install gcc-c++ python3

# Then install Sharp globally
npm install -g sharp
```

**On Windows:**
```bash
# Install Visual Studio Build Tools from:
# https://visualstudio.microsoft.com/downloads/
# Select "Desktop development with C++" workload

# Or install via Chocolatey
choco install visualstudio2019buildtools
choco install visualstudio2019-workload-vctools

# Then install Sharp globally
npm install -g sharp
```

**Alternative:** If Sharp continues to fail, the gallery will still work - you'll just see image files listed without thumbnails. Original images are still accessible.

## Server Log

If problems persist, tail the server log in your gallery directory:
```bash
tail -n 100 .gallery-cache/server.log
```