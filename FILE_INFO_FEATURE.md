# File Information Feature

**Added**: October 26, 2025  
**Status**: ✅ Implemented and tested

## Summary

Added comprehensive file information display throughout the gallery:
1. **Gallery View**: Filename tooltip on hover (all platforms)
2. **Modal Viewer**: Information icon with detailed file metadata panel
3. **macOS Integration**: "Reveal in Finder" button (macOS only)

## Features Added

### 1. Gallery Thumbnails - Filename Tooltips

**Location**: Gallery grid view  
**Platforms**: All (cross-platform)

When users hover over any thumbnail in the gallery, a native browser tooltip displays the filename.

**Implementation**:
- Added `title` attribute to both `<img>` and `.gallery-item` elements
- Uses native browser tooltip (no additional CSS/JS required)
- Instant feedback without clicks

**Code Location**: `bin/server-runner.js` lines 1694-1695

```javascript
img.title = item.name; // Tooltip with filename
galleryItem.title = item.name; // Tooltip on container too
```

### 2. Modal Viewer - File Information Panel

**Location**: Modal viewer (when image/video is open)  
**Platforms**: All (cross-platform), with macOS-specific features

A new information button (ℹ️) in the modal zoom controls opens a glassmorphic panel displaying:
- **Filename**: Full filename with extension
- **Path**: Relative path from scan directory
- **Size**: File size in megabytes (MB)
- **Dimensions**: Image width × height (images only)
- **Reveal in Finder**: Button to open file location (macOS only)

**UI Design**:
- Frosted glass panel with backdrop blur
- Positioned top-left (below zoom info)
- Matches existing glassmorphism aesthetic
- Toggle on/off with info button
- Auto-hides when modal closes

**Code Locations**:
- CSS: `bin/server-runner.js` lines 1054-1102
- HTML: `bin/server-runner.js` lines 1309-1321
- JavaScript: `bin/server-runner.js` lines 1938-1994

### 3. Reveal in Finder (macOS Only)

**Location**: File info panel in modal  
**Platforms**: macOS only

Clicking "Reveal in Finder" opens macOS Finder and highlights the file.

**Implementation**:
- Uses native `open -R <path>` command
- Button only visible on macOS (`process.platform === 'darwin'`)
- Spawns detached process to prevent blocking
- Includes security validation (path traversal protection)

**Code Location**: `bin/server-runner.js` lines 1984-1994, 2334-2364

## API Endpoints

### GET `/api/file-info`

Returns file metadata for a given file.

**Query Parameters**:
- `path`: Relative path to file

**Response**:
```json
{
  "size": 1234567,
  "dimensions": "1920 × 1080"
}
```

**Security**:
- Path traversal protection
- Only serves files within scan directory

**Code Location**: `bin/server-runner.js` lines 2290-2332

### POST `/api/reveal-in-finder`

Opens Finder and reveals the specified file (macOS only).

**Request Body**:
```json
{
  "relativePath": "subfolder/image.jpg"
}
```

**Response**:
```json
{
  "ok": true
}
```

**Platform Check**:
- Returns 400 error on non-macOS platforms
- Only executes `open -R` command on macOS

**Security**:
- Path traversal protection
- Requires valid relative path within scan directory

**Code Location**: `bin/server-runner.js` lines 2334-2364

## UI Components

### File Info Button

**Icon**: Information icon (ℹ️ in circle)  
**Location**: Modal zoom controls (between tags and zoom out)  
**Behavior**: Toggles file info panel visibility

### File Info Panel

**Style**: Glassmorphic with backdrop blur  
**Position**: Fixed, top-left at 80px from top, 30px from left  
**Content**:
```
Filename: image-name.jpg
Path: subfolder/image-name.jpg
Size: 2.45 MB
Dimensions: 3840 × 2160
[Reveal in Finder] (macOS only)
```

### Reveal Button

**Text**: "Reveal in Finder" with house icon  
**Visibility**: macOS only (hidden on other platforms)  
**Style**: Translucent button with hover effect

## Cross-Platform Compatibility

| Feature | Windows | macOS | Linux |
|---------|---------|-------|-------|
| Filename tooltips | ✅ | ✅ | ✅ |
| File info button | ✅ | ✅ | ✅ |
| File size display | ✅ | ✅ | ✅ |
| Dimensions display | ✅ | ✅ | ✅ |
| Reveal in Finder | ❌ | ✅ | ❌ |

## Technical Details

### Image Dimensions

Uses Sharp library to read image metadata:
```javascript
const metadata = await sharp(resolvedPath).metadata();
info.dimensions = `${metadata.width} × ${metadata.height}`;
```

**Supported formats**: jpg, jpeg, png, gif, webp, bmp, tiff

### File Size Calculation

```javascript
const stats = await fs.stat(resolvedPath);
const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
```

**Display format**: Always in MB with 2 decimal places

### Platform Detection

```javascript
const isMac = navigator.platform.toLowerCase().includes('mac');

// Server-side
if (process.platform !== 'darwin') {
    return res.status(400).json({ error: 'macOS only' });
}
```

## User Interaction Flow

### Viewing File Info

1. User opens image/video in modal
2. File info automatically loads in background
3. User clicks info button (ℹ️)
4. Panel appears with file details
5. Click info button again or close modal to hide

### Revealing in Finder (macOS)

1. User opens file info panel
2. "Reveal in Finder" button appears (macOS only)
3. User clicks button
4. Finder opens with file highlighted
5. Gallery remains open in background

## Security Considerations

### Path Traversal Protection

All file operations validate paths:
```javascript
const resolvedPath = path.resolve(filePath);
const resolvedScanDir = path.resolve(scanDir);

if (!resolvedPath.startsWith(resolvedScanDir)) {
    return res.status(403).json({ error: 'Access denied' });
}
```

This prevents:
- `../../etc/passwd` attacks
- Access to files outside scan directory
- Directory traversal exploits

### Command Injection Protection

The `open` command uses spawn with array arguments (not shell):
```javascript
spawn('open', ['-R', resolvedPath], { detached: true });
```

This prevents:
- Shell injection
- Command chaining
- Malicious path manipulation

## Files Modified

1. `bin/server-runner.js` - All changes in this file:
   - CSS styles for file info panel (lines 1054-1102)
   - HTML for file info panel (lines 1309-1321)
   - Info button in modal controls (lines 1337-1343)
   - Filename tooltips in gallery (lines 1694-1695)
   - JavaScript functions (lines 1938-1994, 2020)
   - API endpoints (lines 2290-2364)

## Testing

### Manual Testing Checklist

- [x] Tooltip appears on hover in gallery view
- [x] Info button visible in modal
- [x] Info panel toggles correctly
- [x] File size displays correctly
- [x] Image dimensions display correctly
- [x] Reveal button only on macOS
- [x] Reveal in Finder works (macOS)
- [x] Panel hides when modal closes
- [x] Cross-platform compatibility verified
- [x] Security: Path traversal blocked
- [x] All existing tests pass (116/116)

### Automated Tests

No new tests added (all existing 116 tests still pass).

**Test Status**: ✅ All 116 tests passing

## Future Enhancements

Potential improvements:
1. Add "Copy Path" button
2. Show creation/modification dates
3. Display EXIF data for photos
4. Add video duration for videos
5. Show file format details
6. "Reveal in Explorer" for Windows
7. "Show in Files" for Linux

## Notes for Future Developers

- The info button is always visible (all platforms)
- Reveal button visibility is controlled by `isMac` check in frontend
- API endpoint validates platform server-side for security
- Sharp library is already a dependency (used for thumbnails)
- Native tooltips require no additional dependencies
- File info loads asynchronously to avoid blocking modal open
