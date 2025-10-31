# Search Functionality Test Summary

## Overview
This document summarizes the comprehensive unit tests added for the gallery's search functionality in `tests/search-functionality.test.js`.

## Test File
- **Location**: `tests/search-functionality.test.js`
- **Total Tests**: 31 tests across 5 describe blocks
- **Status**: ✅ All tests passing

## Test Coverage

### 1. toggleSearch() Function (5 tests)
Tests the visibility and styling of the search input field.

**Covered Cases**:
- ✅ Shows search input and updates button styling when toggled on
- ✅ Hides search input and resets button styling when toggled off
- ✅ Clears search query when toggled off
- ✅ Calls filterByTags when toggled off to restore all items
- ✅ Toggles between active and inactive states multiple times

**Key Behaviors Tested**:
- Search container gets `.active` class when enabled
- Button styling changes (background: `#3498db`, color: `#fff`, svg stroke: `#fff`)
- Input value and `searchQuery` variable are cleared on toggle off
- All gallery items are restored to visible state when search is disabled

### 2. filterByTags() with Search Query (13 tests)
Tests the search filtering logic for both filename and folder name matching.

**Covered Cases**:
- ✅ Filters gallery items by filename based on search query
- ✅ Filters gallery items by folder name based on search query
- ✅ Case-insensitive filtering by filename
- ✅ Case-insensitive filtering by folder name
- ✅ Shows items matching either filename OR folder name
- ✅ Hides entire sections when no items match search query
- ✅ Shows sections when at least one item matches
- ✅ Shows all items when search query is empty
- ✅ Filters by partial matches in filename
- ✅ Filters by partial matches in folder name
- ✅ Combines search filter with heart filter
- ✅ Combines search filter with tag filter
- ✅ Applies filters in correct order: heart → tag → search

**Key Behaviors Tested**:
- Search uses `filename.includes(query)` and `dirname.includes(query)` logic
- Both filename and dirname are converted to lowercase for case-insensitive matching
- Search query is also converted to lowercase
- Partial matches work (e.g., "port" matches "portrait.jpg")
- Search filter is applied AFTER heart and tag filters
- Sections are hidden when all items within are filtered out

### 3. handleSearchInput() Function (4 tests)
Tests the search input event handler and query updating.

**Covered Cases**:
- ✅ Updates searchQuery with trimmed input value
- ✅ Triggers filterByTags after updating searchQuery
- ✅ Handles empty input by showing all items
- ✅ Handles whitespace-only input as empty

**Key Behaviors Tested**:
- Input value is trimmed before being stored in `searchQuery`
- `filterByTags()` is called immediately after query update
- Empty or whitespace-only input results in empty `searchQuery` and shows all items

### 4. Keyboard Shortcuts (6 tests)
Tests the keyboard shortcuts for toggling search visibility.

**Covered Cases**:
- ✅ Toggles search when Ctrl+K is pressed (Windows/Linux)
- ✅ Toggles search when Cmd+K is pressed (macOS)
- ✅ Toggles search off when Escape is pressed and search is active
- ✅ Handles multiple Ctrl+K presses to toggle on/off
- ✅ Does not trigger search toggle for other keys with Ctrl (e.g., Ctrl+S)
- ✅ Does not trigger search toggle for "k" without Ctrl/Cmd

**Key Behaviors Tested**:
- Keyboard handler checks for `(event.ctrlKey || event.metaKey) && event.key === 'k'`
- Escape key closes search when `searchActive` is true
- Other keyboard combinations are correctly ignored

### 5. Integration Tests (3 tests)
Tests complete end-to-end workflows combining multiple features.

**Covered Cases**:
- ✅ Complete workflow: toggle on → search → toggle off
- ✅ Progressive refinement of search query
- ✅ Combines search with heart and tag filters

**Key Behaviors Tested**:
- Full user workflow from opening search to closing it
- Search results narrow as query becomes more specific
- All three filter types (heart, tag, search) work together correctly
- Filter order: heart filter → tag filter → search filter

## Test Data Structure

### HTML Elements
- `#searchContainer` - Container for search input (gets `.active` class)
- `#searchInput` - Text input field for search query
- `#searchBtn` - Button to toggle search visibility
- `.gallery-item` - Gallery items with data attributes:
  - `data-relative-path` - Full path (e.g., "nature/sunset.jpg")
  - `data-filename` - Just filename (e.g., "sunset.jpg")
  - `data-dirname` - Folder/section name (e.g., "Nature Photos")

### Test Gallery Structure
```
Root/
  - vacation.jpg
  - portrait.jpg
  - landscape.jpg

Nature Photos/
  - sunset.jpg
  - mountain.jpg

City Scapes/
  - downtown.jpg
```

## Code Coverage

### Functions Tested
1. **toggleSearch()** - Shows/hides search input and updates button styling
2. **handleSearchInput(e)** - Updates search query and triggers filtering
3. **filterByTags()** - Filters gallery items by search query (plus heart/tag filters)

### Global Variables Tested
- `searchQuery` - Current search text (trimmed)
- `searchActive` - Boolean indicating if search is visible
- `heartedImages` - Set of hearted image paths
- `showOnlyHearted` - Boolean for heart filter
- `selectedTags` - Set of selected Finder tags
- `showTagFilter` - Boolean for tag filter
- `fileTags` - Map of file paths to tag arrays

## Testing Patterns Used

### 1. DOM Manipulation Testing
```javascript
document.body.innerHTML = `...`; // Setup HTML structure
const element = document.getElementById('searchInput');
expect(element.style.display).toBe('');
```

### 2. CSS Color Matching (Cross-browser)
```javascript
// Accepts both hex and rgb formats
expect(btn.style.background).toMatch(/(#3498db|rgb\\(52, 152, 219\\))/);
```

### 3. Event Simulation
```javascript
const event = { target: input };
handleSearchInput(event);
```

### 4. Keyboard Event Testing
```javascript
const event = new KeyboardEvent('keydown', {
    key: 'k',
    ctrlKey: true,
    bubbles: true
});
```

### 5. Filter Combination Testing
```javascript
// Setup multiple filters
heartedImages.add('vacation.jpg');
selectedTags.add('nature');
searchQuery = 'sun';
filterByTags(); // Apply all filters
```

## Integration with Existing Tests

This test file follows the same patterns as existing test files:
- ✅ Uses `/** @jest-environment jsdom */` for DOM testing
- ✅ Suppresses console output in tests
- ✅ Cleans up DOM in afterEach hooks
- ✅ Uses descriptive test names with "should" prefix
- ✅ Groups related tests in describe blocks
- ✅ Includes integration tests for complete workflows

## Running the Tests

### Run search tests only
```bash
npm test -- tests/search-functionality.test.js
```

### Run all tests (includes search tests)
```bash
npm test
```

### Run with coverage
```bash
npm run test:coverage
```

## Test Results
```
Test Suites: 15 passed, 15 total
Tests:       247 passed, 247 total (31 new search tests)
Time:        ~3.6s
```

## Key Insights from Testing

1. **Filter Order Matters**: The search filter is applied AFTER heart and tag filters, meaning an item must pass all previous filters before search is checked.

2. **Case Insensitivity**: Both the search query and the target strings (filename, dirname) are converted to lowercase, ensuring consistent case-insensitive matching.

3. **OR Logic for Filename/Folder**: An item is shown if the search query matches EITHER the filename OR the folder name.

4. **Relative Path Matching**: Heart and tag filters use the full relative path (e.g., "nature/sunset.jpg"), while search uses just the filename and dirname separately.

5. **Section Visibility**: Sections are automatically hidden when all items within them are filtered out, improving UX.

6. **Trimming Behavior**: Input is trimmed, so whitespace-only input is treated as empty, showing all items.

## Future Test Considerations

Potential areas for additional testing:
- Search debouncing/throttling (if implemented)
- Search history/suggestions (if implemented)
- Regex or advanced search patterns (if implemented)
- Performance testing with large galleries (1000+ images)
- Accessibility testing (screen reader announcements, ARIA attributes)

## Related Files
- **Implementation**: `bin/server-runner.js` (lines 1635-1660, 1815-1854)
- **Test File**: `tests/search-functionality.test.js`
- **Similar Tests**: `tests/tag-filtering.test.js` (for tag filter behavior)
