# macOS Tag Command Detection Tests

## Overview
This test suite (`tag-command-detection.test.js`) validates the detection of the macOS `tag` CLI command availability across different contexts in the folder-gallery project.

## Test Coverage: 19 Tests

### 1. `isTagCommandAvailable()` in macos-tags.js (6 tests)
Tests the async detection function that uses `spawn()` to check for tag command availability.

**Tests:**
- ✅ Detects tag command is available when it exists
- ✅ Detects tag command is unavailable when it does not exist  
- ✅ Uses TAG_PATH environment variable if set
- ✅ Uses default tag path when TAG_PATH is not set
- ✅ Handles timeout scenarios (100ms timeout)
- ✅ Returns true even if process exits with non-zero code (command exists but returns error)

**Key Implementation Details:**
- Uses `child_process.spawn()` with async Promise pattern
- Checks for `--version` flag to detect command existence
- 100ms timeout prevents hanging on non-existent commands
- Returns `true` if close event fires (command exists), `false` if error or timeout

### 2. postinstall.js tag detection using spawnSync (5 tests)
Tests the synchronous detection logic used in the postinstall script.

**Tests:**
- ✅ Detects tag command is available using spawnSync
- ✅ Detects tag command is unavailable using spawnSync
- ✅ Detects tag command exists but exits with error code
- ✅ Respects TAG_PATH environment variable in spawnSync
- ✅ Uses default tag path when TAG_PATH is not set in spawnSync

**Key Implementation Details:**
- Uses `child_process.spawnSync()` for synchronous detection
- Checks both `error` property and `status` code
- Detection logic: `checkTag.error || checkTag.status !== 0` means command missing
- Located in `scripts/postinstall.js` lines 50-61

### 3. Cross-platform behavior (2 tests)
Validates that detection works correctly on non-macOS platforms.

**Tests:**
- ✅ Works correctly on non-macOS platforms (Linux)
- ✅ Detects unavailability on Windows

**Key Implementation Details:**
- Uses platform mocking to simulate Linux/Windows environments
- Command expected to be unavailable (ENOENT error) on non-macOS
- Ensures graceful degradation on unsupported platforms

### 4. Integration with postinstall script logic (4 tests)
Tests that mimic the exact conditional logic from the postinstall script.

**Tests:**
- ✅ Mimics postinstall.js detection logic correctly
- ✅ Correctly identifies when tag command is missing
- ✅ Handles edge case where status is 0 but error exists
- ✅ Handles edge case where status is non-zero but no error

**Key Implementation Details:**
- Replicates exact logic from `scripts/postinstall.js`
- Tests edge cases in error/status combinations
- Validates boolean coercion of error/status check

### 5. Server startup tag detection (2 tests)
Tests the tag detection during server initialization in `server-runner.js`.

**Tests:**
- ✅ Mimics server-runner.js tag detection at startup
- ✅ Logs warning when tag command is not available at startup

**Key Implementation Details:**
- Uses async `isTagCommandAvailable()` function
- Logs warnings on macOS when tag command missing:
  - `⚠️  macOS Finder tags disabled: tag command not found`
  - `💡 Install with: brew install tag`
- Located in `bin/server-runner.js` lines 2577-2582

## Testing Patterns Used

### Mock Architecture
- **child_process.spawn()**: Mocked with custom EventEmitter implementation
- **child_process.spawnSync()**: Mocked with return value objects
- **Platform detection**: Temporary process.platform override
- **Console output**: Jest spy to verify warning messages

### Key Mocking Techniques
```javascript
// Async spawn mocking
childProcess.spawn.mockImplementation((command, args, options) => {
    const mockProcess = {
        on: jest.fn((event, callback) => {
            if (event === 'close') {
                setTimeout(() => callback(0), 10);
            }
        }),
        kill: jest.fn()
    };
    return mockProcess;
});

// Sync spawnSync mocking
childProcess.spawnSync.mockReturnValue({
    status: 0,
    error: null
});
```

### Test Isolation
- `jest.clearAllMocks()` - Clear call history
- `jest.resetAllMocks()` - Reset mock state  
- Platform restoration in `afterEach()`
- Environment variable preservation/restoration

## Related Files

### Source Files
- `macos-tags.js` - Contains `isTagCommandAvailable()` function
- `scripts/postinstall.js` - Lines 50-61: spawnSync detection
- `bin/server-runner.js` - Lines 2577-2582: Server startup detection

### Test Utilities
- `tests/test-utils.js` - Provides `mockPlatform()` helper
- `tests/setup.js` - Global test configuration

## Environment Variables
- `TAG_PATH` - Custom path to tag command (default: `/opt/homebrew/bin/tag`)
- `NODE_ENV=test` - Enables conditional exports for testing

## Running the Tests

```bash
# Run only tag command detection tests
npm test -- tests/tag-command-detection.test.js

# Run with verbose output
npm test -- tests/tag-command-detection.test.js --verbose

# Run specific test by name
npm test -- -t "detects tag command is available"

# Run in watch mode during development
npm run test:watch -- tests/tag-command-detection.test.js
```

## Test Results
```
PASS tests/tag-command-detection.test.js
  macOS tag Command Detection
    isTagCommandAvailable() in macos-tags.js
      ✓ detects tag command is available when it exists (16 ms)
      ✓ detects tag command is unavailable when it does not exist (11 ms)
      ✓ uses TAG_PATH environment variable if set (12 ms)
      ✓ uses default tag path when TAG_PATH is not set (12 ms)
      ✓ handles timeout scenarios (3 ms)
      ✓ returns true even if process exits with non-zero code (12 ms)
    postinstall.js tag detection using spawnSync
      ✓ detects tag command is available using spawnSync (1 ms)
      ✓ detects tag command is unavailable using spawnSync (1 ms)
      ✓ detects tag command exists but exits with error code (1 ms)
      ✓ respects TAG_PATH environment variable in spawnSync (1 ms)
      ✓ uses default tag path when TAG_PATH is not set in spawnSync (1 ms)
    Cross-platform behavior
      ✓ works correctly on non-macOS platforms (1 ms)
      ✓ detects unavailability on Windows
    Integration with postinstall script logic
      ✓ mimics postinstall.js detection logic correctly (1 ms)
      ✓ correctly identifies when tag command is missing (1 ms)
      ✓ handles edge case where status is 0 but error exists
      ✓ handles edge case where status is non-zero but no error (1 ms)
    Server startup tag detection
      ✓ mimics server-runner.js tag detection at startup (12 ms)
      ✓ logs warning when tag command is not available at startup (12 ms)

Test Suites: 1 passed, 1 total
Tests:       19 passed, 19 total
Time:        0.32 s
```

## Coverage Areas

### ✅ Covered
1. Async detection using spawn() with event handlers
2. Sync detection using spawnSync() with status/error checks
3. TAG_PATH environment variable handling
4. Default path fallback (/opt/homebrew/bin/tag)
5. Timeout handling (100ms)
6. Error handling (ENOENT, spawn failures)
7. Edge cases (non-zero exit codes, mixed error/status)
8. Cross-platform behavior (Linux, Windows)
9. Server startup integration
10. Postinstall script integration
11. Console warning output verification

### 📝 Notes
- Tests use comprehensive mocking to avoid actual filesystem/subprocess operations
- All tests are cross-platform compatible (run on any OS)
- Tests validate both happy path and error scenarios
- Integration tests ensure consistency with production code logic

## Future Enhancements
- Add tests for custom TAG_PATH validation
- Test behavior when tag command is found but returns invalid output
- Add performance tests for timeout thresholds
- Test concurrent detection calls (race conditions)
