[Home](../README.md) | [Installation](installation.md) | [CLI](cli.md) | [Server](server.md) | [Video thumbnails](video-thumbnails.md) | [Troubleshooting](troubleshooting.md)

# How It Works

- Detached background server writes cache into `.gallery-cache/`
- SSE updates for progress; viewport-aware thumbnail priority
- Thumbnails cached and reused; watcher invalidates on file changes
- Safe path validation; serves only allowed media types

Sections you may want to read next:
- Video thumbnails and performance: docs/video-thumbnails.md
- Troubleshooting tips: docs/troubleshooting.md