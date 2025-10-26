# updateTagButton Test Suite

This document describes the comprehensive test suite for the `updateTagButton` functionality in the gallery application.

## Overview

The `updateTagButton` function is responsible for updating the visual state of the tag button in the modal viewer based on whether the current image/video has Finder tags. The button receives a "tagged" CSS class when tags are present, providing visual feedback to the user.

## Test File Location

`tests/update-tag-button.test.js`

## Test Coverage

### 1. Core `updateTagButton` Function Tests (9 tests)

#### ✓ should add "tagged" class when currentTags is not empty and on Mac
- **Purpose**: Verifies the primary functionality - button gets "tagged" class when tags exist
- **Scenario**: macOS, current modal media exists, tags array has multiple items
- **Expected**: Button has "tagged" class

#### ✓ should remove "tagged" class when currentTags is empty and on Mac
- **Purpose**: Verifies the button class is removed when no tags exist
- **Scenario**: macOS, current modal media exists, empty tags array
- **Expected**: Button does not have "tagged" class

#### ✓ should handle single tag (adds "tagged" class)
- **Purpose**: Confirms functionality works with a single tag
- **Scenario**: macOS, one tag in array
- **Expected**: Button has "tagged" class

#### ✓ should handle multiple tags (adds "tagged" class)
- **Purpose**: Confirms functionality works with multiple tags
- **Scenario**: macOS, four tags in array
- **Expected**: Button has "tagged" class

#### ✓ should not add "tagged" class when not on Mac even if currentTags exists
- **Purpose**: Ensures platform-specific behavior (tags only on macOS)
- **Scenario**: Non-macOS platform, tags exist
- **Expected**: Button does not have "tagged" class

#### ✓ should not add "tagged" class when currentModalMedia is null
- **Purpose**: Verifies function doesn't operate when no media is selected
- **Scenario**: macOS, no current media, tags exist
- **Expected**: Button does not have "tagged" class

#### ✓ should not throw error when tag button does not exist
- **Purpose**: Tests error handling when DOM element is missing
- **Scenario**: Button element removed from DOM
- **Expected**: Function executes without throwing

#### ✓ should handle currentTags being null or undefined
- **Purpose**: Tests edge cases with missing data
- **Scenario**: currentTags set to null or undefined
- **Expected**: Button does not have "tagged" class

#### ✓ should work with video media (not just images)
- **Purpose**: Confirms functionality works for video files
- **Scenario**: macOS, video file selected, tags exist
- **Expected**: Button has "tagged" class

---

### 2. Integration with `openModal` (6 tests)

These tests verify that `updateTagButton` is called correctly when opening the modal viewer.

#### ✓ should call updateTagButton and add "tagged" class when fetching tags with data
- **Purpose**: Tests complete flow from opening modal to displaying tagged state
- **Scenario**: Modal opened, API returns tags
- **Expected**: Tags fetched, button has "tagged" class

#### ✓ should call updateTagButton and remove "tagged" class when fetching tags with empty data
- **Purpose**: Confirms button state updates when no tags found
- **Scenario**: Modal opened, API returns empty tags array
- **Expected**: Button does not have "tagged" class

#### ✓ should handle fetch errors gracefully and not add "tagged" class
- **Purpose**: Tests error handling for failed API calls
- **Scenario**: Modal opened, API returns 404
- **Expected**: No error thrown, button has no "tagged" class

#### ✓ should not fetch tags when not on macOS
- **Purpose**: Verifies platform check prevents unnecessary API calls
- **Scenario**: Non-macOS platform, modal opened
- **Expected**: No API call made, empty tags

#### ✓ should handle malformed JSON response gracefully
- **Purpose**: Tests resilience against invalid API responses
- **Scenario**: API returns invalid JSON
- **Expected**: Error handled, empty tags, no "tagged" class

#### ✓ should handle network errors gracefully
- **Purpose**: Tests handling of network failures
- **Scenario**: Network error during fetch
- **Expected**: Promise resolves, empty tags

---

### 3. Integration with `saveTags` (9 tests)

These tests verify that `updateTagButton` is called correctly after saving tags.

#### ✓ should call updateTagButton and add "tagged" class when saving tags successfully
- **Purpose**: Tests button updates after successful save
- **Scenario**: User saves multiple tags, API returns success
- **Expected**: Button has "tagged" class

#### ✓ should call updateTagButton and remove "tagged" class when saving empty tags
- **Purpose**: Tests button updates when removing all tags
- **Scenario**: User removes all tags and saves, API returns success
- **Expected**: Button does not have "tagged" class

#### ✓ should not call updateTagButton when save fails
- **Purpose**: Verifies button not updated on failed save
- **Scenario**: Save API returns error
- **Expected**: Alert shown, button state unchanged

#### ✓ should handle network error during save
- **Purpose**: Tests error handling for network failures
- **Scenario**: Network error during save operation
- **Expected**: Alert shown to user

#### ✓ should handle response with ok:false in JSON
- **Purpose**: Tests handling of unsuccessful save (valid response but operation failed)
- **Scenario**: API returns 200 but with `ok: false` in body
- **Expected**: Alert shown, button not updated

#### ✓ should work with single tag
- **Purpose**: Confirms save works with one tag
- **Scenario**: User saves single tag
- **Expected**: Button has "tagged" class

#### ✓ should work with multiple tags
- **Purpose**: Confirms save works with multiple tags
- **Scenario**: User saves four tags
- **Expected**: Button has "tagged" class

#### ✓ should not attempt save when currentModalMedia is null
- **Purpose**: Tests guard clause prevents invalid saves
- **Scenario**: No media selected
- **Expected**: No API call made

---

### 4. Complete Workflow Test (1 test)

#### ✓ should correctly update button through entire tag lifecycle
- **Purpose**: End-to-end integration test
- **Flow**:
  1. Open modal with no tags → button not tagged
  2. User adds tags → tags added to UI
  3. User saves tags → button becomes tagged
  4. Reopen same image → tags persist, button still tagged
- **Expected**: Button state accurately reflects tag state throughout

---

## Key Testing Patterns

### 1. Platform Awareness
Tests verify that tag functionality is properly gated to macOS only:
```javascript
isMac = false;
// ... test that tags are not processed
```

### 2. Mock Fetch API
All network calls are mocked to test in isolation:
```javascript
mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ tags: ['landscape', 'nature'] })
});
```

### 3. DOM State Verification
Tests check CSS class presence:
```javascript
expect(tagBtn.classList.contains('tagged')).toBe(true);
```

### 4. Error Handling
Multiple tests verify graceful degradation:
- Network failures
- Invalid JSON
- Missing DOM elements
- Null/undefined data

### 5. Integration Points
Tests cover both integration points:
- **Fetch integration**: `openModal` → `fetchTagsForCurrent` → `updateTagButton`
- **Save integration**: `tagSave.onclick` → API call → `updateTagButton`

---

## Test Structure

Each test follows this pattern:
1. **Setup**: Initialize environment (isMac, currentModalMedia, currentTags)
2. **Mock**: Configure fetch mock for API calls
3. **Execute**: Call the function or trigger the event
4. **Verify**: Check button state, API calls, and side effects

---

## Running the Tests

```bash
# Run just updateTagButton tests
npx jest tests/update-tag-button.test.js --verbose

# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

---

## Coverage Summary

- **Total Tests**: 24
- **Function Coverage**: 100% of `updateTagButton` logic
- **Integration Coverage**: Both call sites (`openModal` and `saveTags`)
- **Edge Cases**: Null/undefined handling, missing DOM elements, platform checks
- **Error Cases**: Network errors, invalid responses, failed saves

---

## Related Files

- **Implementation**: `bin/server-runner.js` (lines 1343-1348, 1822, 1927)
- **API Endpoints**: `/api/macos/tag` (GET and POST)
- **Related Functions**: `fetchTagsForCurrent`, `openModal`, tag save handler
- **Related Tests**: `tests/macos-tags-api.test.js`, `tests/tag-filtering.test.js`

---

## Notes

1. **JSDOM Environment**: Tests use JSDOM to simulate browser DOM
2. **Platform Mocking**: Tests mock `navigator.userAgent` via `isMac` flag
3. **Async Testing**: Uses async/await for all fetch-based tests
4. **Console Suppression**: Console output suppressed during tests for cleaner output
5. **Isolation**: Each test has clean setup/teardown via `beforeEach`/`afterEach`
