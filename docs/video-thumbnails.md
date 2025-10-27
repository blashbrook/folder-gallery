[Home](../README.md) | [Installation](installation.md) | [CLI](cli.md) | [Server](server.md) | [Video thumbnails](video-thumbnails.md) | [Troubleshooting](troubleshooting.md)

# Video Thumbnails (FFmpeg)

By default, the CLI extracts a frame around 1/3 into each video (FFmpeg), with a placeholder fallback if extraction fails or is disabled.

- Install FFmpeg (see docs/installation.md)
- Default behavior: generate frames at ~1/3 duration; cached as JPEG
- Fallback: glassy play-button placeholder

Tuning flags:
- `--max-workers <n>`: limit concurrent FFmpeg jobs
- `--ffmpeg-timeout <ms>`: cap per‑file processing time
- `--disable-video-thumbs`: skip FFmpeg, always use placeholder