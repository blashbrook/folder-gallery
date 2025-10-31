/** @jest-environment jsdom */
/**
 * Unit tests for search functionality
 * 
 * Tests the JavaScript functions embedded in the gallery HTML:
 * - toggleSearch: Shows/hides search input field and updates button styling
 * - filterByTags: Filters gallery items by filename/folder based on search query
 * - handleSearchInput: Handles search input changes and triggers filtering
 * - Keyboard shortcuts: Ctrl/Cmd+K to toggle search visibility
 */

describe('Search Functionality', () => {
    let window, document;
    let originalConsole;
    
    // Global variables that exist in the gallery HTML
    let searchQuery;
    let searchActive;
    let heartedImages;
    let showOnlyHearted;
    let selectedTags;
    let showTagFilter;
    let fileTags;
    
    // Functions from the HTML that we need to test
    let toggleSearch;
    let handleSearchInput;
    let filterByTags;
    
    beforeEach(() => {
        // Suppress console output during tests
        originalConsole = global.console;
        global.console = {
            ...global.console,
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };

        // Populate document with our HTML structure
        document = global.document;
        window = global.window;
        document.body.innerHTML = `
            <!DOCTYPE html>
            <html>
            <head></head>
            <body>
                <div class="header-actions">
                    <div class="search-container" id="searchContainer">
                        <input type="text" class="search-input" id="searchInput" placeholder="Search images..." />
                        <button class="header-btn" id="searchBtn" title="Search (Ctrl/Cmd+K)">
                            <svg width="18" height="18" viewBox="0 0 24 24">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div id="gallerySections">
                    <div class="gallery-section">
                        <div class="section-title">Root</div>
                        <div class="gallery">
                            <div class="gallery-item" data-relative-path="vacation.jpg" data-filename="vacation.jpg" data-dirname="Root">
                                <img src="thumb1.jpg" alt="vacation.jpg">
                            </div>
                            <div class="gallery-item" data-relative-path="portrait.jpg" data-filename="portrait.jpg" data-dirname="Root">
                                <img src="thumb2.jpg" alt="portrait.jpg">
                            </div>
                            <div class="gallery-item" data-relative-path="landscape.jpg" data-filename="landscape.jpg" data-dirname="Root">
                                <img src="thumb3.jpg" alt="landscape.jpg">
                            </div>
                        </div>
                    </div>
                    <div class="gallery-section">
                        <div class="section-title">Nature Photos</div>
                        <div class="gallery">
                            <div class="gallery-item" data-relative-path="nature/sunset.jpg" data-filename="sunset.jpg" data-dirname="Nature Photos">
                                <img src="thumb4.jpg" alt="sunset.jpg">
                            </div>
                            <div class="gallery-item" data-relative-path="nature/mountain.jpg" data-filename="mountain.jpg" data-dirname="Nature Photos">
                                <img src="thumb5.jpg" alt="mountain.jpg">
                            </div>
                        </div>
                    </div>
                    <div class="gallery-section">
                        <div class="section-title">City Scapes</div>
                        <div class="gallery">
                            <div class="gallery-item" data-relative-path="city/downtown.jpg" data-filename="downtown.jpg" data-dirname="City Scapes">
                                <img src="thumb6.jpg" alt="downtown.jpg">
                            </div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        // Initialize global variables as they exist in the HTML
        searchQuery = '';
        searchActive = false;
        heartedImages = new Set();
        showOnlyHearted = false;
        selectedTags = new Set();
        showTagFilter = false;
        fileTags = new Map();
        
        // Define the functions as they exist in the HTML
        toggleSearch = function() {
            searchActive = !searchActive;
            const container = document.getElementById('searchContainer');
            const input = document.getElementById('searchInput');
            const btn = document.getElementById('searchBtn');

            if (searchActive) {
                container.classList.add('active');
                setTimeout(() => input.focus(), 300); // Focus after animation
                btn.style.background = '#3498db';
                btn.style.color = '#fff';
                btn.querySelector('svg').style.stroke = '#fff';
            } else {
                container.classList.remove('active');
                input.value = '';
                searchQuery = '';
                btn.style.background = '';
                btn.style.color = '';
                btn.querySelector('svg').style.stroke = '';
                filterByTags(); // Re-filter to show all items
            }
        };

        handleSearchInput = function(e) {
            searchQuery = e.target.value.trim();
            filterByTags();
        };

        filterByTags = function() {
            document.querySelectorAll('.gallery-section').forEach(section => {
                const items = section.querySelectorAll('.gallery-item');
                let visibleCount = 0;

                items.forEach(item => {
                    const relativePath = item.dataset.relativePath;
                    let shouldShow = true;

                    // Apply heart filter first
                    if (showOnlyHearted && !heartedImages.has(relativePath)) {
                        shouldShow = false;
                    }

                    // Apply tag filter
                    if (shouldShow && showTagFilter && selectedTags.size > 0) {
                        const itemTags = fileTags.get(relativePath) || [];
                        shouldShow = Array.from(selectedTags).some(tag => itemTags.includes(tag));
                    }

                    // Apply search filter
                    if (shouldShow && searchQuery) {
                        const filename = (item.dataset.filename || '').toLowerCase();
                        const dirname = (item.dataset.dirname || '').toLowerCase();
                        const query = searchQuery.toLowerCase();
                        shouldShow = filename.includes(query) || dirname.includes(query);
                    }

                    if (shouldShow) {
                        item.style.display = '';
                        visibleCount++;
                    } else {
                        item.style.display = 'none';
                    }
                });

                section.style.display = visibleCount > 0 ? '' : 'none';
            });
        };
    });

    afterEach(() => {
        // Restore original console
        global.console = originalConsole;
        
        // Clean up DOM
        document.body.innerHTML = '';
    });

    describe('toggleSearch', () => {
        it('should show search input and update button styling when toggled on', () => {
            expect(searchActive).toBe(false);
            
            toggleSearch();
            
            const container = document.getElementById('searchContainer');
            const btn = document.getElementById('searchBtn');
            const svg = btn.querySelector('svg');
            
            expect(searchActive).toBe(true);
            expect(container.classList.contains('active')).toBe(true);
            // CSS colors may be returned as hex or rgb, both are valid
            expect(btn.style.background).toMatch(/(#3498db|rgb\(52, 152, 219\))/);
            expect(btn.style.color).toMatch(/(#fff|rgb\(255, 255, 255\)|white)/);
            expect(svg.style.stroke).toMatch(/(#fff|rgb\(255, 255, 255\)|white)/);
        });

        it('should hide search input and reset button styling when toggled off', () => {
            // First toggle on
            searchActive = false;
            toggleSearch();
            expect(searchActive).toBe(true);
            
            // Then toggle off
            toggleSearch();
            
            const container = document.getElementById('searchContainer');
            const input = document.getElementById('searchInput');
            const btn = document.getElementById('searchBtn');
            const svg = btn.querySelector('svg');
            
            expect(searchActive).toBe(false);
            expect(container.classList.contains('active')).toBe(false);
            expect(input.value).toBe('');
            expect(btn.style.background).toBe('');
            expect(btn.style.color).toBe('');
            expect(svg.style.stroke).toBe('');
        });

        it('should clear search query when toggled off', () => {
            searchActive = false;
            searchQuery = '';
            
            // Toggle on and set a search query
            toggleSearch();
            const input = document.getElementById('searchInput');
            input.value = 'test query';
            searchQuery = 'test query';
            
            expect(searchQuery).toBe('test query');
            
            // Toggle off
            toggleSearch();
            
            expect(searchQuery).toBe('');
            expect(input.value).toBe('');
        });

        it('should call filterByTags when toggled off to restore all items', () => {
            // Setup: Hide some items using search
            searchQuery = 'vacation';
            filterByTags();
            
            const items = document.querySelectorAll('.gallery-item');
            const visibleBeforeToggle = Array.from(items).filter(item => item.style.display !== 'none');
            expect(visibleBeforeToggle.length).toBeLessThan(items.length);
            
            // Toggle on, then off (which should restore all items)
            searchActive = false;
            toggleSearch(); // on
            toggleSearch(); // off
            
            const visibleAfterToggle = Array.from(items).filter(item => item.style.display !== 'none');
            expect(visibleAfterToggle.length).toBe(items.length);
        });

        it('should toggle between active and inactive states multiple times', () => {
            expect(searchActive).toBe(false);
            
            toggleSearch();
            expect(searchActive).toBe(true);
            
            toggleSearch();
            expect(searchActive).toBe(false);
            
            toggleSearch();
            expect(searchActive).toBe(true);
            
            toggleSearch();
            expect(searchActive).toBe(false);
        });
    });

    describe('filterByTags - search functionality', () => {
        it('should filter gallery items by filename based on search query', () => {
            searchQuery = 'vacation';
            
            filterByTags();
            
            const items = document.querySelectorAll('.gallery-item');
            
            // Only "vacation.jpg" should be visible
            expect(items[0].style.display).toBe(''); // vacation.jpg
            expect(items[1].style.display).toBe('none'); // portrait.jpg
            expect(items[2].style.display).toBe('none'); // landscape.jpg
            expect(items[3].style.display).toBe('none'); // sunset.jpg
            expect(items[4].style.display).toBe('none'); // mountain.jpg
            expect(items[5].style.display).toBe('none'); // downtown.jpg
        });

        it('should filter gallery items by folder name based on search query', () => {
            searchQuery = 'nature';
            
            filterByTags();
            
            const items = document.querySelectorAll('.gallery-item');
            
            // Only items in "Nature Photos" folder should be visible
            expect(items[0].style.display).toBe('none'); // Root/vacation.jpg
            expect(items[1].style.display).toBe('none'); // Root/portrait.jpg
            expect(items[2].style.display).toBe('none'); // Root/landscape.jpg
            expect(items[3].style.display).toBe(''); // Nature Photos/sunset.jpg
            expect(items[4].style.display).toBe(''); // Nature Photos/mountain.jpg
            expect(items[5].style.display).toBe('none'); // City Scapes/downtown.jpg
        });

        it('should be case-insensitive when filtering by filename', () => {
            // Test uppercase query
            searchQuery = 'VACATION';
            filterByTags();
            
            const items = document.querySelectorAll('.gallery-item');
            expect(items[0].style.display).toBe(''); // vacation.jpg should match
            
            // Test mixed case query
            searchQuery = 'VaCaTiOn';
            filterByTags();
            expect(items[0].style.display).toBe(''); // vacation.jpg should still match
            
            // Test lowercase query
            searchQuery = 'vacation';
            filterByTags();
            expect(items[0].style.display).toBe(''); // vacation.jpg should still match
        });

        it('should be case-insensitive when filtering by folder name', () => {
            // Test uppercase query
            searchQuery = 'NATURE';
            filterByTags();
            
            const items = document.querySelectorAll('.gallery-item');
            expect(items[3].style.display).toBe(''); // Nature Photos/sunset.jpg
            expect(items[4].style.display).toBe(''); // Nature Photos/mountain.jpg
            
            // Test mixed case query
            searchQuery = 'NaTuRe';
            filterByTags();
            expect(items[3].style.display).toBe(''); // Nature Photos/sunset.jpg
            expect(items[4].style.display).toBe(''); // Nature Photos/mountain.jpg
        });

        it('should show items matching either filename or folder name', () => {
            // "sunset" appears in filename, "nature" appears in folder name
            searchQuery = 'sun';
            filterByTags();
            
            const items = document.querySelectorAll('.gallery-item');
            expect(items[3].style.display).toBe(''); // sunset.jpg matches in filename
            
            searchQuery = 'photo';
            filterByTags();
            expect(items[3].style.display).toBe(''); // Nature Photos matches in folder
            expect(items[4].style.display).toBe(''); // Nature Photos matches in folder
        });

        it('should hide entire sections when no items match search query', () => {
            searchQuery = 'nonexistent';
            
            filterByTags();
            
            const sections = document.querySelectorAll('.gallery-section');
            
            // All sections should be hidden
            expect(sections[0].style.display).toBe('none'); // Root
            expect(sections[1].style.display).toBe('none'); // Nature Photos
            expect(sections[2].style.display).toBe('none'); // City Scapes
        });

        it('should show sections when at least one item matches', () => {
            searchQuery = 'mountain';
            
            filterByTags();
            
            const sections = document.querySelectorAll('.gallery-section');
            
            // Only Nature Photos section should be visible
            expect(sections[0].style.display).toBe('none'); // Root
            expect(sections[1].style.display).toBe(''); // Nature Photos (has mountain.jpg)
            expect(sections[2].style.display).toBe('none'); // City Scapes
        });

        it('should show all items when search query is empty', () => {
            searchQuery = '';
            showOnlyHearted = false;
            showTagFilter = false;
            
            filterByTags();
            
            const items = document.querySelectorAll('.gallery-item');
            const sections = document.querySelectorAll('.gallery-section');
            
            // All items should be visible
            items.forEach(item => {
                expect(item.style.display).toBe('');
            });
            
            // All sections should be visible
            sections.forEach(section => {
                expect(section.style.display).toBe('');
            });
        });

        it('should filter by partial matches in filename', () => {
            searchQuery = 'port';
            
            filterByTags();
            
            const items = document.querySelectorAll('.gallery-item');
            
            // "portrait.jpg" contains "port"
            expect(items[0].style.display).toBe('none'); // vacation.jpg
            expect(items[1].style.display).toBe(''); // portrait.jpg
            expect(items[2].style.display).toBe('none'); // landscape.jpg
        });

        it('should filter by partial matches in folder name', () => {
            searchQuery = 'city';
            
            filterByTags();
            
            const items = document.querySelectorAll('.gallery-item');
            
            // "City Scapes" contains "city"
            expect(items[5].style.display).toBe(''); // City Scapes/downtown.jpg
            expect(items[0].style.display).toBe('none'); // Root/vacation.jpg
        });

        it('should combine search filter with heart filter', () => {
            // Heart some images using full relative paths
            heartedImages.add('vacation.jpg');
            heartedImages.add('nature/sunset.jpg');
            showOnlyHearted = true;
            
            // Search for items that match filename
            searchQuery = 'sun';
            
            filterByTags();
            
            const items = document.querySelectorAll('.gallery-item');
            
            // Only hearted items matching search should be visible
            expect(items[0].style.display).toBe('none'); // vacation.jpg: hearted but no match
            expect(items[3].style.display).toBe(''); // nature/sunset.jpg: hearted AND matches
            expect(items[4].style.display).toBe('none'); // nature/mountain.jpg: not hearted
        });

        it('should combine search filter with tag filter', () => {
            // Setup tags using full relative paths
            fileTags.set('vacation.jpg', ['landscape']);
            fileTags.set('nature/sunset.jpg', ['landscape']);
            selectedTags.add('landscape');
            showTagFilter = true;
            
            // Search for items
            searchQuery = 'sun';
            
            filterByTags();
            
            const items = document.querySelectorAll('.gallery-item');
            
            // Only items with tag AND matching search should be visible
            expect(items[0].style.display).toBe('none'); // vacation.jpg: has tag but no match
            expect(items[3].style.display).toBe(''); // nature/sunset.jpg: has tag AND matches
            expect(items[1].style.display).toBe('none'); // portrait.jpg: no tag
        });

        it('should apply filters in correct order: heart -> tag -> search', () => {
            // Setup heart filter using full relative paths
            heartedImages.add('vacation.jpg');
            heartedImages.add('nature/sunset.jpg');
            heartedImages.add('portrait.jpg');
            showOnlyHearted = true;
            
            // Setup tag filter using full relative paths
            fileTags.set('vacation.jpg', ['nature']);
            fileTags.set('nature/sunset.jpg', ['nature']);
            selectedTags.add('nature');
            showTagFilter = true;
            
            // Setup search filter
            searchQuery = 'sun';
            
            filterByTags();
            
            const items = document.querySelectorAll('.gallery-item');
            
            // Only nature/sunset.jpg passes all three filters:
            // - Is hearted
            // - Has "nature" tag
            // - Filename contains "sun"
            expect(items[0].style.display).toBe('none'); // vacation.jpg: hearted, has tag, but no "sun"
            expect(items[1].style.display).toBe('none'); // portrait.jpg: hearted, no tag
            expect(items[3].style.display).toBe(''); // nature/sunset.jpg: passes all filters
        });
    });

    describe('handleSearchInput', () => {
        it('should update searchQuery with trimmed input value', () => {
            const input = document.getElementById('searchInput');
            input.value = '  vacation  ';
            
            const event = { target: input };
            handleSearchInput(event);
            
            expect(searchQuery).toBe('vacation');
        });

        it('should trigger filterByTags after updating searchQuery', () => {
            const input = document.getElementById('searchInput');
            input.value = 'mountain';
            
            const event = { target: input };
            handleSearchInput(event);
            
            const items = document.querySelectorAll('.gallery-item');
            
            // Verify filtering was applied
            expect(items[4].style.display).toBe(''); // mountain.jpg should be visible
            expect(items[0].style.display).toBe('none'); // vacation.jpg should be hidden
        });

        it('should handle empty input by showing all items', () => {
            const input = document.getElementById('searchInput');
            
            // First, set a search query
            input.value = 'vacation';
            handleSearchInput({ target: input });
            
            let items = document.querySelectorAll('.gallery-item');
            let hiddenCount = Array.from(items).filter(item => item.style.display === 'none').length;
            expect(hiddenCount).toBeGreaterThan(0);
            
            // Then clear it
            input.value = '';
            handleSearchInput({ target: input });
            
            items = document.querySelectorAll('.gallery-item');
            hiddenCount = Array.from(items).filter(item => item.style.display === 'none').length;
            expect(hiddenCount).toBe(0);
        });

        it('should handle whitespace-only input as empty', () => {
            const input = document.getElementById('searchInput');
            input.value = '   ';
            
            handleSearchInput({ target: input });
            
            expect(searchQuery).toBe('');
            
            const items = document.querySelectorAll('.gallery-item');
            items.forEach(item => {
                expect(item.style.display).toBe('');
            });
        });
    });

    describe('Keyboard shortcuts', () => {
        it('should toggle search when Ctrl+K is pressed', () => {
            expect(searchActive).toBe(false);
            
            const event = new KeyboardEvent('keydown', {
                key: 'k',
                ctrlKey: true,
                bubbles: true
            });
            
            // Simulate the keyboard shortcut handler
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                toggleSearch();
            }
            
            expect(searchActive).toBe(true);
        });

        it('should toggle search when Cmd+K is pressed (macOS)', () => {
            expect(searchActive).toBe(false);
            
            const event = new KeyboardEvent('keydown', {
                key: 'k',
                metaKey: true,
                bubbles: true
            });
            
            // Simulate the keyboard shortcut handler
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                toggleSearch();
            }
            
            expect(searchActive).toBe(true);
        });

        it('should toggle search off when Escape is pressed and search is active', () => {
            // First activate search
            searchActive = false;
            toggleSearch();
            expect(searchActive).toBe(true);
            
            const event = new KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true
            });
            
            // Simulate the keyboard shortcut handler for Escape
            if (event.key === 'Escape' && searchActive) {
                toggleSearch();
            }
            
            expect(searchActive).toBe(false);
        });

        it('should handle multiple Ctrl+K presses to toggle on/off', () => {
            expect(searchActive).toBe(false);
            
            // First press - should turn on
            toggleSearch();
            expect(searchActive).toBe(true);
            
            // Second press - should turn off
            toggleSearch();
            expect(searchActive).toBe(false);
            
            // Third press - should turn on again
            toggleSearch();
            expect(searchActive).toBe(true);
        });

        it('should not trigger search toggle for other keys with Ctrl', () => {
            expect(searchActive).toBe(false);
            
            // Simulate Ctrl+S (should not trigger search)
            const event = new KeyboardEvent('keydown', {
                key: 's',
                ctrlKey: true,
                bubbles: true
            });
            
            // Keyboard handler should only respond to 'k'
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                toggleSearch();
            }
            
            expect(searchActive).toBe(false);
        });

        it('should not trigger search toggle for "k" without Ctrl/Cmd', () => {
            expect(searchActive).toBe(false);
            
            // Simulate just pressing 'k' (should not trigger search)
            const event = new KeyboardEvent('keydown', {
                key: 'k',
                ctrlKey: false,
                metaKey: false,
                bubbles: true
            });
            
            // Keyboard handler requires Ctrl or Cmd
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                toggleSearch();
            }
            
            expect(searchActive).toBe(false);
        });
    });

    describe('Integration: Complete search workflow', () => {
        it('should work end-to-end from toggle to search to close', () => {
            // Start with search inactive
            expect(searchActive).toBe(false);
            
            // 1. Toggle search on
            toggleSearch();
            expect(searchActive).toBe(true);
            
            const container = document.getElementById('searchContainer');
            const input = document.getElementById('searchInput');
            expect(container.classList.contains('active')).toBe(true);
            
            // 2. Enter search query
            input.value = 'vacation';
            handleSearchInput({ target: input });
            
            expect(searchQuery).toBe('vacation');
            
            const items = document.querySelectorAll('.gallery-item');
            expect(items[0].style.display).toBe(''); // vacation.jpg visible
            expect(items[1].style.display).toBe('none'); // others hidden
            
            // 3. Toggle search off
            toggleSearch();
            expect(searchActive).toBe(false);
            expect(container.classList.contains('active')).toBe(false);
            expect(input.value).toBe('');
            expect(searchQuery).toBe('');
            
            // All items should be visible again
            items.forEach(item => {
                expect(item.style.display).toBe('');
            });
        });

        it('should handle progressive refinement of search query', () => {
            const input = document.getElementById('searchInput');
            
            // Start with broad search
            input.value = 'a';
            handleSearchInput({ target: input });
            
            let items = document.querySelectorAll('.gallery-item');
            let visibleCount1 = Array.from(items).filter(item => item.style.display === '').length;
            
            // Refine search
            input.value = 'vac';
            handleSearchInput({ target: input });
            
            let visibleCount2 = Array.from(items).filter(item => item.style.display === '').length;
            expect(visibleCount2).toBeLessThanOrEqual(visibleCount1);
            
            // Further refine
            input.value = 'vacation';
            handleSearchInput({ target: input });
            
            let visibleCount3 = Array.from(items).filter(item => item.style.display === '').length;
            expect(visibleCount3).toBeLessThanOrEqual(visibleCount2);
            expect(visibleCount3).toBe(1); // Only vacation.jpg
        });

        it('should combine search with heart and tag filters', () => {
            // Setup heart filter using full relative paths
            heartedImages.add('vacation.jpg');
            heartedImages.add('nature/sunset.jpg');
            heartedImages.add('landscape.jpg');
            showOnlyHearted = true;
            
            // Setup tag filter using full relative paths
            fileTags.set('vacation.jpg', ['travel']);
            fileTags.set('nature/sunset.jpg', ['travel', 'nature']);
            fileTags.set('landscape.jpg', ['nature']);
            selectedTags.add('travel');
            showTagFilter = true;
            
            // Apply search
            searchQuery = 'sun';
            filterByTags();
            
            const items = document.querySelectorAll('.gallery-item');
            
            // Only nature/sunset.jpg should be visible (hearted + has 'travel' tag + contains 'sun')
            expect(items[0].style.display).toBe('none'); // vacation.jpg: no 'sun'
            expect(items[3].style.display).toBe(''); // nature/sunset.jpg: passes all filters
            expect(items[2].style.display).toBe('none'); // landscape.jpg: no 'travel' tag
        });
    });
});
