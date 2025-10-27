[Home](../README.md) | [Installation](installation.md) | [CLI](cli.md) | [Server](server.md) | [Video thumbnails](video-thumbnails.md) | [Troubleshooting](troubleshooting.md)

# How It Works

- Detached background server writes cache into `.gallery-cache/`
- SSE updates for progress; viewport-aware thumbnail priority
- Thumbnails cached and reused; watcher invalidates on file changes
- Safe path validation; serves only allowed media types

## For Agents (Source-of-Truth Mapping)

Important: All gallery HTML/CSS/JS is generated at runtime by JavaScript. There are no static templates.

- UI generator: bin/server-runner.js → function generateIndexHTML()
  - Writes `.gallery-cache/index.html` per scanned directory
  - Embeds all client logic:
    - SSE wiring to `/progress` (EventSource)
    - Masonry-style layout via CSS columns (no JS layout)
    - Modal image/video viewer (zoom/pan for images, HTML5 video for videos)
    - Favorites (localStorage) + filter toggle
    - Theme toggle (CSS custom properties)
    - Progress bar + pause/resume button (wired to `/api/pause-thumbnails`)
    - Viewport reporting (`/api/viewport-items`) to prioritize thumbnail generation
- Thumbnail pipeline: bin/server-runner.js
  - Sharp for images; optional FFmpeg frame extraction for videos
  - Outputs `.gallery-cache/thumbnails/<base64>.jpg`
  - Emits SSE messages as `data: {json}\n\n` (single newline characters, double newline termination)
- CLI and process management: bin/gallery.js
  - Spawns server-runner as a detached process
  - Writes/reads `.gallery-cache/gallery.pid` and `.gallery-cache/server-info.json`
  - Commands: up/down/scan/cleanup/delete/rescan

### Endpoints (runtime)
- `GET /` → serves `.gallery-cache/index.html`
- `GET /static/*` → serves `.gallery-cache/*` files (thumbnails, index, etc.)
- `GET /progress` → SSE stream (JSON lines prefixed by `data: ` and terminated by `\n\n`)
- `GET /api/gallery` → grouped media JSON (cached)
- `POST /api/viewport-items` → prioritize visible items
- `POST /api/pause-thumbnails` → toggle generation state
- macOS tags (macOS only): `GET/POST /api/macos/tag`

### Runtime outputs (per scanned directory)
```
.galler y-cache/
├── index.html          # Generated UI (generateIndexHTML)
├── thumbnails/         # Generated thumbnails
├── gallery.pid         # Background server PID
└── server-info.json    # Port and runtime metadata for CLI
```

Sections you may want to read next:
- Video thumbnails and performance: docs/video-thumbnails.md
- Troubleshooting tips: docs/troubleshooting.md
