# Proposed Release v1.11.0 (Express v5, jsdom v27, Jest tweaks)

Date: 2025-10-26

Summary
- Runtime deps updated safely; test suite fully green (116/116)
- Express upgraded to v5 with no code changes required
- Moved DOM tests to use Jest’s jsdom environment (no direct jsdom import)
- Upgraded jsdom to v27 (ESM) with Jest ESM support
- Added TextEncoder/TextDecoder polyfill for tests
- Kept rollback marker for dependency state

Runtime dependency updates
- express: ^4.21.2 → ^5.1.0
- chokidar: ^3.x → ^4.0.3
- commander: ^11.x → ^14.0.2
- sharp: ^0.32.6 → ^0.34.4
- Removed unused multer

Dev dependency updates
- semantic-release: ^22.x → ^25.0.1
- @semantic-release/commit-analyzer: ^11.x → ^13.0.1
- @semantic-release/github: ^9.x → ^12.0.0
- @semantic-release/npm: ^11.x → ^13.1.1
- @semantic-release/release-notes-generator: ^12.x → ^14.1.0
- jsdom: ^23.x → ^27.0.1 (ESM)
- jest-environment-jsdom: ^30.2.0 (added)

Jest/test changes
- Run Jest via Node with ESM modules: `node --experimental-vm-modules ./node_modules/jest/bin/jest.js`
- Default testEnvironment remains `node`; DOM suites opt-in via `/** @jest-environment jsdom */` pragma
- Updated DOM tests to use `document.body.innerHTML` instead of constructing JSDOM directly
- Polyfilled TextEncoder/TextDecoder in tests/setup.js for libraries expecting them

Rollback
- Snapshot saved at ROLLBACK_MARKER.json (pre-Express5/jsdom27 state)

Validation
- npm install: OK, audit: 0 vulnerabilities
- npm test: 8/8 suites passing, 116/116 tests passing

---

# Recent Changes - Test Infrastructure Improvements

**Date**: October 26, 2025  
**Author**: AI Assistant (Warp Agent)  
**Status**: ✅ All 116 tests passing

## Summary

Comprehensive test infrastructure improvements including new utility tests, bug fixes in main code, test isolation fixes, and updated documentation. All tests now pass reliably.

## Changes Made

### 1. New Test File: `tests/gallery-utils.test.js`

Added comprehensive unit tests for critical backend utility functions:

- **14 new tests** covering PID file management and process detection
- Tests use real filesystem operations with temporary directories
- Full coverage of edge cases (null PIDs, malformed files, missing directories)

**Functions Tested**:
- `readPidFile()` - 5 tests
- `removePidFile()` - 3 tests  
- `isProcessRunning()` - 6 tests

### 2. Bug Fix in Main Code: `bin/gallery.js`

**Critical Bug Discovered by Tests**:
- **Lines 286, 297**: Incorrect use of callback-based `fs` API with `await`
- **Before**: `await fs.readFile()` and `await fs.unlink()`
- **After**: `await fsPromises.readFile()` and `await fsPromises.unlink()`

**Impact**: This bug would have caused PID file operations to fail silently or behave unpredictably. The tests caught this before it could cause production issues.

### 3. Fixed Test Failures: `tests/launch-background-server.test.js`

**Problem**: Tests were failing with "EACCES: permission denied" errors

**Root Cause**: Tests tried to create directories in restricted system paths:
- `/var/photos/.gallery-cache`
- `/data/.gallery-cache`
- `/pics/.gallery-cache`

**Solution**:
1. Added comprehensive `fs` module mocking:
   ```javascript
   jest.mock('fs', () => ({
     existsSync: jest.fn(),
     mkdirSync: jest.fn(),
     openSync: jest.fn()
   }));
   ```
2. Changed test paths to use `/tmp/test-*` paths
3. All filesystem operations now properly mocked

**Result**: All 6 tests now pass consistently

### 4. Fixed Test Isolation: `tests/macos-tags-api.test.js`

**Problem**: Intermittent test failures with different errors each run:
- First run: 404 error on "handles file access errors"
- Second run: 405 error on "validates that tags is an array"
- When run in isolation: all tests pass

**Root Cause**: Mock pollution - `fs.access` mocks were leaking between tests

**Solution**: Added `jest.resetAllMocks()` before `jest.clearAllMocks()` in `beforeEach`:
```javascript
beforeEach(async () => {
    // ... other setup
    jest.resetAllMocks();  // ADDED - Reset mock state
    jest.clearAllMocks();  // EXISTING - Clear call history
    // ... rest of setup
});
```

**Result**: All 20 tests now pass consistently

### 5. Updated Exports in `bin/gallery.js`

Added utility functions to test exports:
```javascript
if (process.env.NODE_ENV === 'test') {
    module.exports = {
        launchBackgroundServer,
        readPidFile,           // NEW
        removePidFile,         // NEW
        isProcessRunning       // NEW
    };
}
```

### 6. New npm Scripts in `package.json`

Added convenient development scripts:
```json
{
  "scripts": {
    "link": "npm link",
    "unlink": "npm unlink -g folder-gallery"
  }
}
```

**Usage**:
- `npm run link` - Link local project for testing
- `npm run unlink` - Unlink and revert to published version

### 7. Documentation Updates

#### Updated `TEST_SUMMARY.md`
- Renamed from "macOS Finder Tags Test Suite" to "Folder Gallery Test Suite"
- Added sections for all 8 test files
- Documented the new `gallery-utils.test.js` tests
- Documented bug fixes and their solutions
- Added testing infrastructure improvements section
- Updated test statistics (116 tests, 8 suites)

#### Updated `WARP.md`
- Expanded "Testing Infrastructure" section significantly
- Added test coverage by component
- Added critical testing patterns with code examples
- Documented known issues fixed by testing
- Added test debugging commands
- Added "Adding New Tests" guidelines
- Updated test structure to show all 8 test files
- Added "Development Scripts" section with npm commands

## Test Results

### Before
- 100 tests passing
- 3 tests failing in `launch-background-server.test.js`
- Intermittent failures in `macos-tags-api.test.js`
- Critical bug in PID file operations (undetected)

### After
- ✅ **116 tests passing** (14 new + 2 fixed)
- 0 tests failing
- ~2 second runtime
- All tests run reliably across multiple executions
- Critical bug discovered and fixed

## Testing Patterns Established

### 1. Mock Commander Pattern
All test files that import `bin/gallery.js` must mock Commander to prevent CLI execution:
```javascript
jest.mock('commander', () => {
  class MockCommand {
    name() { return this; }
    // ... other chainable methods
    parse() { /* no-op */ }
  }
  return { Command: MockCommand };
});
```

### 2. Filesystem Mocking Pattern
When testing functions that perform filesystem operations:
```javascript
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  openSync: jest.fn()
}));
```

### 3. Test Isolation Pattern
Ensure clean state between tests:
```javascript
beforeEach(() => {
    jest.resetAllMocks();   // Reset mock state
    jest.clearAllMocks();   // Clear call history
});

afterEach(() => {
    jest.restoreAllMocks(); // Restore original implementations
});
```

### 4. Temporary Directory Pattern
When real filesystem operations are needed:
```javascript
const os = require('os');
const path = require('path');

let testDir;
beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-prefix-'));
});

afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
});
```

## Files Modified

1. `bin/gallery.js` - Bug fix + new exports
2. `tests/launch-background-server.test.js` - Added fs mocking
3. `tests/macos-tags-api.test.js` - Fixed test isolation
4. `tests/gallery-utils.test.js` - NEW FILE
5. `TEST_SUMMARY.md` - Comprehensive updates
6. `WARP.md` - Expanded testing section
7. `package.json` - Added npm scripts

## Why This Matters

### For Future Development
1. **Bug Prevention**: The test suite caught a critical bug that would have caused production failures
2. **Confidence**: All 116 tests pass reliably, giving confidence in code changes
3. **Documentation**: Future developers understand how to write and run tests
4. **Patterns**: Established clear patterns for mocking and test isolation

### For AI Agents (Warp/Claude)
1. **Context**: Comprehensive documentation in WARP.md explains the entire test setup
2. **Examples**: Clear code examples show how to mock Commander, fs, and other modules
3. **Troubleshooting**: Documents common issues and their solutions
4. **Guidelines**: Step-by-step instructions for adding new tests

## Running Tests

```bash
# All tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Specific file
npm test -- tests/gallery-utils.test.js

# Debug mode
npm test -- --verbose
```

## Next Steps

Consider these potential improvements:
1. Increase code coverage beyond critical paths
2. Add integration tests for full server lifecycle
3. Add performance benchmarks for thumbnail generation
4. Add visual regression tests for UI
5. Set up CI/CD with automated test runs

## Notes for Future Warp Agents

When working with this codebase:

1. **Always run tests** before and after changes: `npm test`
2. **Check test documentation** first: `TEST_SUMMARY.md` and WARP.md "Testing Infrastructure"
3. **Follow established patterns** for mocking and isolation
4. **Export functions conditionally** with `NODE_ENV === 'test'` check
5. **Mock Commander** when importing `bin/gallery.js`
6. **Use `jest.resetAllMocks()` before `jest.clearAllMocks()`** in beforeEach
7. **Reference existing tests** as templates for new tests
8. **Update documentation** when adding new tests or fixing issues

The test suite is comprehensive and reliable. Trust it to catch bugs early!
