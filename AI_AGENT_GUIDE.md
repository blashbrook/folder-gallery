# AI Agent Quick Reference Guide

**For**: Future Warp AI Agents working on this codebase  
**Updated**: October 26, 2025  
**Test Status**: ✅ 116/116 tests passing

## First Things to Know

1. **This is a Node.js CLI tool** for creating image galleries from directories
2. **Test-driven**: Always run `npm test` before and after changes
3. **Well-documented**: Read `WARP.md` for architecture, `TEST_SUMMARY.md` for testing
4. **Critical paths are tested**: Backend utilities, API endpoints, process management

## Quick Commands

```bash
# Development
npm run link          # Link local version for testing
npm run unlink        # Unlink when done
npm run dev          # Start with file watching

# Testing
npm test             # Run all 116 tests
npm test -- --watch  # Watch mode
npm test -- tests/gallery-utils.test.js  # Specific file

# Gallery Commands (after linking)
gallery up           # Start gallery in current directory
gallery down         # Stop gallery
gallery rescan       # Force cache refresh
```

## Critical Files

| File | Purpose | Key Points |
|------|---------|-----------|
| `bin/gallery.js` | CLI entry point | Exports functions conditionally for testing |
| `bin/server-runner.js` | Background server | Spawned as detached process |
| `tests/gallery-utils.test.js` | Utility tests | Tests PID file management |
| `tests/launch-background-server.test.js` | Server tests | Heavy fs mocking |
| `tests/macos-tags-api.test.js` | API tests | Requires `resetAllMocks()` |
| `WARP.md` | Architecture docs | Read first for context |
| `TEST_SUMMARY.md` | Test documentation | Details on all 116 tests |

## Common Tasks

### Adding a New Test

1. Create test file in `tests/` directory
2. Mock Commander if importing `bin/gallery.js`:
   ```javascript
   jest.mock('commander', () => {
     class MockCommand {
       name() { return this; }
       description() { return this; }
       version() { return this; }
       command() { return this; }
       option() { return this; }
       action() { return this; }
       parse() { /* no-op */ }
     }
     return { Command: MockCommand };
   });
   ```
3. Set `NODE_ENV=test` before importing: `process.env.NODE_ENV = 'test';`
4. Use proper mock isolation:
   ```javascript
   beforeEach(() => {
       jest.resetAllMocks();
       jest.clearAllMocks();
   });
   ```
5. Run tests: `npm test`

### Exporting Functions for Testing

In the source file (e.g., `bin/gallery.js`):
```javascript
// At bottom of file
if (process.env.NODE_ENV === 'test') {
    module.exports = {
        functionToTest,
        anotherFunction
    };
}
```

### Mocking Filesystem Operations

```javascript
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  openSync: jest.fn()
}));

// In beforeEach
fs.existsSync.mockReturnValue(false);
fs.mkdirSync.mockReturnValue(undefined);
```

### Using Temporary Directories

```javascript
const os = require('os');
const path = require('path');
const fs = require('fs').promises;

let testDir;

beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-'));
});

afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
});
```

## Known Issues & Solutions

### Issue: Tests fail with permission errors
**Solution**: Mock filesystem operations, don't use real system paths

### Issue: Tests pass individually but fail together
**Solution**: Add `jest.resetAllMocks()` before `jest.clearAllMocks()` in `beforeEach`

### Issue: Can't import functions from `bin/gallery.js`
**Solution**: Set `process.env.NODE_ENV = 'test'` before importing

### Issue: `fs.promises` not working
**Solution**: Use `fsPromises` constant, not `fs` directly:
```javascript
const fsPromises = require('fs').promises;
await fsPromises.readFile(...);  // ✓ Correct
await fs.readFile(...);           // ✗ Wrong (callback API)
```

## Test Patterns Reference

### 1. Commander Mock (Required for CLI imports)
```javascript
jest.mock('commander', () => {
  class MockCommand {
    name() { return this; }
    description() { return this; }
    version() { return this; }
    command() { return this; }
    option() { return this; }
    action() { return this; }
    parse() { /* no-op */ }
  }
  return { Command: MockCommand };
});
```

### 2. Filesystem Mock
```javascript
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  openSync: jest.fn()
}));
```

### 3. child_process Mock
```javascript
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));
```

### 4. Platform Mock
```javascript
const mockPlatform = (platform) => {
    const original = process.platform;
    Object.defineProperty(process, 'platform', { value: platform });
    return () => {
        Object.defineProperty(process, 'platform', { value: original });
    };
};
```

## Architecture Quick Summary

```
User runs: gallery up
    ↓
bin/gallery.js (CLI)
    ↓
Spawns detached process
    ↓
bin/server-runner.js (Server)
    ↓
Creates .gallery-cache/
    ├── thumbnails/
    ├── index.html
    └── gallery.pid
```

### Process Management
- **PID file**: `.gallery-cache/gallery.pid` tracks server process
- **readPidFile()**: Read PID from file
- **removePidFile()**: Delete PID file
- **isProcessRunning()**: Check if process is alive
- **launchBackgroundServer()**: Spawn detached server

### Key Features
- Viewport-aware thumbnail generation
- Progressive loading (tiny → full)
- Server-Sent Events for progress
- macOS Finder tags integration
- Real-time file watching

## Bug Fixed During This Session

**File**: `bin/gallery.js`  
**Lines**: 286, 297

**Before (Bug)**:
```javascript
const pid = await fs.readFile(pidFile, 'utf8');  // Wrong API
await fs.unlink(pidFile);                        // Wrong API
```

**After (Fixed)**:
```javascript
const pid = await fsPromises.readFile(pidFile, 'utf8');  // Correct
await fsPromises.unlink(pidFile);                        // Correct
```

This was caught by the new test suite and fixed.

## Documentation Hierarchy

1. **WARP.md** - Complete architecture and design guide (start here)
2. **AI_AGENT_GUIDE.md** - This file (quick reference)
3. **TEST_SUMMARY.md** - Detailed test documentation
4. **RECENT_CHANGES.md** - Latest changes and improvements
5. **README.md** - User-facing documentation

## Important Reminders

✅ **Always run tests before/after changes**  
✅ **Mock Commander when importing bin/gallery.js**  
✅ **Use `jest.resetAllMocks()` for test isolation**  
✅ **Reference existing tests as templates**  
✅ **Update docs when making significant changes**  
✅ **Use `/tmp` paths in tests, never system paths**  
✅ **Export functions with `NODE_ENV === 'test'` check**  

## Getting Help

1. Check `WARP.md` "Testing Infrastructure" section
2. Look at `TEST_SUMMARY.md` for test examples
3. Reference similar existing tests
4. Check `RECENT_CHANGES.md` for recent fixes
5. All tests passing? You're on the right track!

## Test Suite Health Check

```bash
npm test
```

Expected output:
```
Test Suites: 8 passed, 8 total
Tests:       116 passed, 116 total
Time:        ~2 seconds
```

If this output changes, something broke. Investigate before proceeding.

---

**Remember**: The test suite is your safety net. Trust it, maintain it, expand it!
