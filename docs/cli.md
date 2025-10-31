[Home](../README.md) | [Installation](installation.md) | [CLI](cli.md) | [Server](server.md) | [Video thumbnails](video-thumbnails.md) | [Troubleshooting](troubleshooting.md)

# CLI Reference

```bash
gallery up [options]
```

Common options:
- `-d, --directory <path>`: Directory to scan (default: current)
- `-p, --port <number>`: Port (default: 3000)
- `--no-open`: Don’t open a browser automatically
- `--max-workers <n>`: Max concurrent FFmpeg extractions (default: 2)
- `--ffmpeg-timeout <ms>`: Per‑file FFmpeg timeout (default: 20000)
- `--disable-video-thumbs`: Use placeholder for videos

Other commands:
- `gallery down` — stop all gallery servers
- `gallery rescan` — force rescan for current gallery
- `gallery upgrade` — regenerate HTML/JS/CSS from latest version (preserves thumbnails & metadata)
- `gallery scan -d <path>` — dry-run scan output
- `gallery cleanup` — clean orphan thumbnails in current dir
- `gallery delete -d <path>` — delete all .gallery-cache directories under path