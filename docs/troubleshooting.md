[Home](../README.md) | [Installation](installation.md) | [CLI](cli.md) | [Server](server.md) | [Video thumbnails](video-thumbnails.md) | [Troubleshooting](troubleshooting.md)

# Troubleshooting

- Can’t open page? Hard refresh, then open http://localhost:3000 directly.
- Placeholders only for videos? Ensure FFmpeg is installed and not disabled.
- Thumbnails stale? Delete `.gallery-cache/thumbnails` and reload.
- Multiple servers? Run `gallery down`, then start a single instance.

If problems persist, tail the server log in your gallery directory:
```bash
tail -n 100 .gallery-cache/server.log
```