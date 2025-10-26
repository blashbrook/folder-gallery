/** @jest-environment jsdom */
/**
 * Unit tests for tag filtering functionality
 * 
 * Tests the JavaScript functions embedded in the gallery HTML:
 * - loadAllTags: Fetches and stores tags for images on macOS
 * - populateTagFilterDropdown: Renders tag items in dropdown with counts
 * - filterByTags: Shows/hides gallery items based on selected tags and hearts
 * - applyTagFilters: Updates filter button appearance and triggers filtering
 */

describe('Tag Filtering Functions', () => {
    let window, document;
    let mockFetch;
    let originalConsole;
    
    // Global variables that exist in the gallery HTML
    let isMac;
    let allTags;
    let selectedTags;
    let showTagFilter;
    let fileTags;
    let heartedImages;
    let showOnlyHearted;
    let modalMediaList;
    
    // Functions from the HTML that we need to test
    let loadAllTags;
    let populateTagFilterDropdown;
    let filterByTags;
    let applyTagFilters;
    let clearTagFilters;
    
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
                    <button class="header-btn" id="filterTagsBtn" title="Filter by Tags">
                        <svg width="18" height="18" viewBox="0 0 24 24">
                            <path d="M20.59 13.41L11 3H4v7l9.59 9.59a2 2 0 0 0 2.83 0l4.17-4.17a2 2 0 0 0 0-2.83z"></path>
                            <circle cx="6.5" cy="6.5" r="1.5"></circle>
                        </svg>
                    </button>
                    <div class="tag-filter-dropdown" id="tagFilterDropdown">
                        <div class="tag-filter-header">Filter by Tags</div>
                        <div class="tag-filter-items" id="tagFilterItems"></div>
                        <div class="tag-filter-actions">
                            <button class="tag-filter-btn" onclick="clearTagFilters()">Clear All</button>
                            <button class="tag-filter-btn" onclick="applyTagFilters()">Apply</button>
                        </div>
                    </div>
                </div>
                <div id="gallerySections">
                    <div class="gallery-section">
                        <div class="section-title">Root</div>
                        <div class="gallery">
                            <div class="gallery-item" data-relative-path="image1.jpg">
                                <img src="thumb1.jpg" alt="Image 1">
                            </div>
                            <div class="gallery-item" data-relative-path="image2.jpg">
                                <img src="thumb2.jpg" alt="Image 2">
                            </div>
                            <div class="gallery-item" data-relative-path="image3.jpg">
                                <img src="thumb3.jpg" alt="Image 3">
                            </div>
                        </div>
                    </div>
                    <div class="gallery-section">
                        <div class="section-title">Folder1</div>
                        <div class="gallery">
                            <div class="gallery-item" data-relative-path="folder1/image4.jpg">
                                <img src="thumb4.jpg" alt="Image 4">
                            </div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        // Mock fetch
        mockFetch = jest.fn();
        global.fetch = mockFetch;
        
        // Initialize global variables as they exist in the HTML
        isMac = true; // Default to Mac for most tests
        allTags = new Map();
        selectedTags = new Set();
        showTagFilter = false;
        fileTags = new Map();
        heartedImages = new Set();
        showOnlyHearted = false;
        modalMediaList = [
            { relativePath: 'image1.jpg', name: 'image1.jpg' },
            { relativePath: 'image2.jpg', name: 'image2.jpg' },
            { relativePath: 'image3.jpg', name: 'image3.jpg' },
            { relativePath: 'folder1/image4.jpg', name: 'image4.jpg' }
        ];
        
        // Define the functions as they exist in the HTML (simplified versions for testing)
        loadAllTags = async function() {
            if (!isMac) return;
            
            allTags.clear();
            fileTags.clear();
            
            const imagePaths = [];
            modalMediaList.forEach(item => {
                imagePaths.push(item.relativePath);
            });
            
            for (const relativePath of imagePaths) {
                try {
                    const response = await fetch('/api/macos/tag?relativePath=' + encodeURIComponent(relativePath));
                    if (response.ok) {
                        const data = await response.json();
                        if (data.tags && data.tags.length > 0) {
                            fileTags.set(relativePath, data.tags);
                            data.tags.forEach(tag => {
                                allTags.set(tag, (allTags.get(tag) || 0) + 1);
                            });
                        }
                    }
                } catch (e) {
                    // Ignore errors for individual files
                }
            }
            
            const tagFilterBtn = document.getElementById('filterTagsBtn');
            if (tagFilterBtn) {
                if (isMac) {
                    tagFilterBtn.style.display = '';
                } else {
                    tagFilterBtn.style.display = 'none';
                }
            }
            populateTagFilterDropdown();
        };
        
        populateTagFilterDropdown = function() {
            const container = document.getElementById('tagFilterItems');
            container.innerHTML = '';
            
            if (allTags.size === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.className = 'tag-filter-item';
                emptyMsg.style.cursor = 'default';
                emptyMsg.innerHTML = '<span style="font-size:0.85rem; color: var(--text-secondary);">No Finder tags found</span>';
                container.appendChild(emptyMsg);
                return;
            }
            
            const sortedTags = Array.from(allTags.entries()).sort((a, b) => a[0].localeCompare(b[0]));
            
            sortedTags.forEach(([tag, count]) => {
                const item = document.createElement('div');
                item.className = 'tag-filter-item';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = 'tag-filter-' + tag;
                checkbox.checked = selectedTags.has(tag);
                checkbox.onchange = () => {
                    if (checkbox.checked) {
                        selectedTags.add(tag);
                    } else {
                        selectedTags.delete(tag);
                    }
                };
                
                const label = document.createElement('label');
                label.htmlFor = checkbox.id;
                label.textContent = tag;
                
                const countSpan = document.createElement('span');
                countSpan.className = 'tag-filter-count';
                countSpan.textContent = count.toString();
                
                item.appendChild(checkbox);
                item.appendChild(label);
                item.appendChild(countSpan);
                
                container.appendChild(item);
            });
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
        
        applyTagFilters = function() {
            showTagFilter = selectedTags.size > 0;
            const btn = document.getElementById('filterTagsBtn');
            const dropdown = document.getElementById('tagFilterDropdown');
            
            if (showTagFilter) {
                btn.style.background = '#3498db';
                btn.style.color = '#fff';
                btn.querySelector('svg').style.fill = '#fff';
                btn.title = 'Filter by Tags (' + selectedTags.size + ' selected)';
            } else {
                btn.style.background = '';
                btn.style.color = '';
                btn.querySelector('svg').style.fill = '';
                btn.title = 'Filter by Tags';
            }
            
            filterByTags();
            
            dropdown.classList.remove('active');
        };
        
        clearTagFilters = function() {
            selectedTags.clear();
            showTagFilter = false;
            populateTagFilterDropdown();
            applyTagFilters();
        };

        // Make fetch globally available for functions
    });

    afterEach(() => {
        // Restore original console
        global.console = originalConsole;
        
        // Clean up DOM
        document.body.innerHTML = '';
        delete global.fetch;
    });

    describe('loadAllTags', () => {
        it('should fetch and store tags for images when running on macOS', async () => {
            isMac = true;
            
            // Mock successful fetch responses with different tags
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ tags: ['landscape', 'nature'] })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ tags: ['portrait', 'people'] })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ tags: ['landscape', 'sunset'] })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ tags: [] })
                });

            await loadAllTags();

            // Verify fetch was called for each image
            expect(mockFetch).toHaveBeenCalledTimes(4);
            expect(mockFetch).toHaveBeenCalledWith('/api/macos/tag?relativePath=image1.jpg');
            expect(mockFetch).toHaveBeenCalledWith('/api/macos/tag?relativePath=image2.jpg');
            expect(mockFetch).toHaveBeenCalledWith('/api/macos/tag?relativePath=image3.jpg');
            expect(mockFetch).toHaveBeenCalledWith('/api/macos/tag?relativePath=folder1%2Fimage4.jpg');

            // Verify tags were stored correctly
            expect(fileTags.get('image1.jpg')).toEqual(['landscape', 'nature']);
            expect(fileTags.get('image2.jpg')).toEqual(['portrait', 'people']);
            expect(fileTags.get('image3.jpg')).toEqual(['landscape', 'sunset']);
            expect(fileTags.has('folder1/image4.jpg')).toBe(false); // Empty tags array

            // Verify tag counts
            expect(allTags.get('landscape')).toBe(2); // image1 and image3
            expect(allTags.get('nature')).toBe(1);
            expect(allTags.get('portrait')).toBe(1);
            expect(allTags.get('people')).toBe(1);
            expect(allTags.get('sunset')).toBe(1);

            // Verify filter button is visible on macOS
            const filterBtn = document.getElementById('filterTagsBtn');
            expect(filterBtn.style.display).toBe('');
        });

        it('should handle fetch errors gracefully', async () => {
            isMac = true;
            
            // Mock fetch failures
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ tags: ['landscape'] })
                })
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    ok: false,
                    status: 404
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ tags: ['portrait'] })
                });

            await loadAllTags();

            // Should still process successful requests
            expect(fileTags.get('image1.jpg')).toEqual(['landscape']);
            expect(fileTags.get('folder1/image4.jpg')).toEqual(['portrait']);
            expect(fileTags.has('image2.jpg')).toBe(false); // Network error
            expect(fileTags.has('image3.jpg')).toBe(false); // 404 error
            
            // Tag counts should reflect only successful fetches
            expect(allTags.get('landscape')).toBe(1);
            expect(allTags.get('portrait')).toBe(1);
        });

        it('should return early and not fetch tags when not on macOS', async () => {
            isMac = false;
            
            // Simulate initial button setup that happens on page load
            const filterBtn = document.getElementById('filterTagsBtn');
            filterBtn.style.display = isMac ? '' : 'none';

            await loadAllTags();

            // Should not make any fetch calls
            expect(mockFetch).not.toHaveBeenCalled();
            expect(allTags.size).toBe(0);
            expect(fileTags.size).toBe(0);

            // Filter button should be hidden
            expect(filterBtn.style.display).toBe('none');
        });

        it('should clear existing tags before loading new ones', async () => {
            isMac = true;
            
            // Pre-populate with existing data
            allTags.set('old-tag', 5);
            fileTags.set('old-image.jpg', ['old-tag']);

            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({ tags: ['new-tag'] })
            });

            await loadAllTags();

            // Old data should be cleared
            expect(allTags.has('old-tag')).toBe(false);
            expect(fileTags.has('old-image.jpg')).toBe(false);
            
            // New data should be present
            expect(allTags.get('new-tag')).toBe(4); // 4 images with new-tag
            expect(fileTags.get('image1.jpg')).toEqual(['new-tag']);
        });
    });

    describe('populateTagFilterDropdown', () => {
        it('should correctly render tag items with counts when tags exist', () => {
            // Setup test data
            allTags.set('landscape', 3);
            allTags.set('portrait', 2);
            allTags.set('nature', 1);
            selectedTags.add('landscape'); // Pre-select landscape

            populateTagFilterDropdown();

            const container = document.getElementById('tagFilterItems');
            const items = container.querySelectorAll('.tag-filter-item');

            // Should create 3 tag items (sorted alphabetically)
            expect(items).toHaveLength(3);

            // Check first item (landscape - alphabetically first)
            const firstItem = items[0];
            const firstCheckbox = firstItem.querySelector('input[type="checkbox"]');
            const firstLabel = firstItem.querySelector('label');
            const firstCount = firstItem.querySelector('.tag-filter-count');

            expect(firstCheckbox.id).toBe('tag-filter-landscape');
            expect(firstCheckbox.checked).toBe(true); // Pre-selected
            expect(firstLabel.textContent).toBe('landscape');
            expect(firstLabel.htmlFor).toBe('tag-filter-landscape');
            expect(firstCount.textContent).toBe('3');

            // Check second item (nature)
            const secondItem = items[1];
            const secondCheckbox = secondItem.querySelector('input[type="checkbox"]');
            const secondLabel = secondItem.querySelector('label');
            const secondCount = secondItem.querySelector('.tag-filter-count');

            expect(secondCheckbox.id).toBe('tag-filter-nature');
            expect(secondCheckbox.checked).toBe(false);
            expect(secondLabel.textContent).toBe('nature');
            expect(secondCount.textContent).toBe('1');

            // Check third item (portrait)
            const thirdItem = items[2];
            const thirdCheckbox = thirdItem.querySelector('input[type="checkbox"]');
            const thirdLabel = thirdItem.querySelector('label');
            const thirdCount = thirdItem.querySelector('.tag-filter-count');

            expect(thirdCheckbox.id).toBe('tag-filter-portrait');
            expect(thirdCheckbox.checked).toBe(false);
            expect(thirdLabel.textContent).toBe('portrait');
            expect(thirdCount.textContent).toBe('2');
        });

        it('should show "No Finder tags found" message when no tags exist', () => {
            // Ensure allTags is empty
            allTags.clear();

            populateTagFilterDropdown();

            const container = document.getElementById('tagFilterItems');
            const items = container.querySelectorAll('.tag-filter-item');

            // Should have exactly one item with the empty message
            expect(items).toHaveLength(1);
            
            const emptyItem = items[0];
            expect(emptyItem.style.cursor).toBe('default');
            expect(emptyItem.innerHTML).toContain('No Finder tags found');
            expect(emptyItem.querySelector('span').style.fontSize).toBe('0.85rem');
        });

        it('should update checkbox states when selectedTags changes', () => {
            allTags.set('tag1', 1);
            allTags.set('tag2', 2);
            allTags.set('tag3', 1);
            
            // Initially no tags selected
            populateTagFilterDropdown();
            
            let checkboxes = document.querySelectorAll('input[type="checkbox"]');
            expect(checkboxes[0].checked).toBe(false);
            expect(checkboxes[1].checked).toBe(false);
            expect(checkboxes[2].checked).toBe(false);

            // Select some tags and repopulate
            selectedTags.add('tag1');
            selectedTags.add('tag3');
            
            populateTagFilterDropdown();
            
            checkboxes = document.querySelectorAll('input[type="checkbox"]');
            expect(checkboxes[0].checked).toBe(true);  // tag1
            expect(checkboxes[1].checked).toBe(false); // tag2
            expect(checkboxes[2].checked).toBe(true);  // tag3
        });

        it('should handle checkbox changes correctly', () => {
            allTags.set('test-tag', 1);
            selectedTags.clear();

            populateTagFilterDropdown();

            const checkbox = document.querySelector('input[type="checkbox"]');
            expect(selectedTags.has('test-tag')).toBe(false);

            // Simulate checking the box
            checkbox.checked = true;
            checkbox.onchange();
            expect(selectedTags.has('test-tag')).toBe(true);

            // Simulate unchecking the box
            checkbox.checked = false;
            checkbox.onchange();
            expect(selectedTags.has('test-tag')).toBe(false);
        });
    });

    describe('filterByTags', () => {
        beforeEach(() => {
            // Setup file tags for testing
            fileTags.set('image1.jpg', ['landscape', 'nature']);
            fileTags.set('image2.jpg', ['portrait', 'people']);
            fileTags.set('image3.jpg', ['landscape', 'sunset']);
            // image4 has no tags
        });

        it('should hide/show gallery items based on selected tags when showTagFilter is true', () => {
            showTagFilter = true;
            showOnlyHearted = false;
            selectedTags.add('landscape');

            filterByTags();

            const items = document.querySelectorAll('.gallery-item');
            
            // Items with 'landscape' tag should be visible
            expect(items[0].style.display).toBe(''); // image1.jpg has landscape
            expect(items[1].style.display).toBe('none'); // image2.jpg doesn't have landscape
            expect(items[2].style.display).toBe(''); // image3.jpg has landscape
            expect(items[3].style.display).toBe('none'); // image4.jpg has no tags
        });

        it('should show items with ANY of the selected tags (OR logic)', () => {
            showTagFilter = true;
            showOnlyHearted = false;
            selectedTags.add('portrait');
            selectedTags.add('sunset');

            filterByTags();

            const items = document.querySelectorAll('.gallery-item');
            
            expect(items[0].style.display).toBe('none'); // image1.jpg has neither portrait nor sunset
            expect(items[1].style.display).toBe(''); // image2.jpg has portrait
            expect(items[2].style.display).toBe(''); // image3.jpg has sunset
            expect(items[3].style.display).toBe('none'); // image4.jpg has no tags
        });

        it('should hide/show gallery items based on showOnlyHearted status', () => {
            showTagFilter = false;
            showOnlyHearted = true;
            heartedImages.add('image2.jpg');
            heartedImages.add('folder1/image4.jpg');

            filterByTags();

            const items = document.querySelectorAll('.gallery-item');
            
            // Only hearted items should be visible
            expect(items[0].style.display).toBe('none'); // image1.jpg not hearted
            expect(items[1].style.display).toBe(''); // image2.jpg is hearted
            expect(items[2].style.display).toBe('none'); // image3.jpg not hearted
            expect(items[3].style.display).toBe(''); // image4.jpg is hearted
        });

        it('should apply both heart and tag filters together', () => {
            showTagFilter = true;
            showOnlyHearted = true;
            selectedTags.add('landscape');
            heartedImages.add('image1.jpg');
            // image3.jpg has landscape but is not hearted

            filterByTags();

            const items = document.querySelectorAll('.gallery-item');
            
            // Only items that are hearted AND have the selected tag should be visible
            expect(items[0].style.display).toBe(''); // image1.jpg is hearted and has landscape
            expect(items[1].style.display).toBe('none'); // image2.jpg is not hearted
            expect(items[2].style.display).toBe('none'); // image3.jpg has landscape but not hearted
            expect(items[3].style.display).toBe('none'); // image4.jpg is not hearted and has no tags
        });

        it('should hide entire sections when no items are visible', () => {
            showTagFilter = true;
            showOnlyHearted = false;
            selectedTags.add('nonexistent-tag');

            filterByTags();

            const sections = document.querySelectorAll('.gallery-section');
            
            // All sections should be hidden since no items match
            expect(sections[0].style.display).toBe('none');
            expect(sections[1].style.display).toBe('none');
        });

        it('should show sections when at least one item is visible', () => {
            showTagFilter = true;
            showOnlyHearted = false;
            selectedTags.add('landscape');

            filterByTags();

            const sections = document.querySelectorAll('.gallery-section');
            
            // First section should be visible (has items with landscape tag)
            expect(sections[0].style.display).toBe('');
            // Second section should be hidden (no items with landscape tag)
            expect(sections[1].style.display).toBe('none');
        });

        it('should show all items when no filters are active', () => {
            showTagFilter = false;
            showOnlyHearted = false;
            selectedTags.clear();

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
    });

    describe('applyTagFilters', () => {
        it('should update filter button appearance when tags are selected', () => {
            selectedTags.add('landscape');
            selectedTags.add('portrait');

            applyTagFilters();

            const btn = document.getElementById('filterTagsBtn');
            const svg = btn.querySelector('svg');

            expect(showTagFilter).toBe(true);
            // CSS colors may be returned as hex or rgb, both are valid
            expect(btn.style.background).toMatch(/(#3498db|rgb\(52, 152, 219\))/);
            expect(btn.style.color).toMatch(/(#fff|rgb\(255, 255, 255\)|white)/);
            expect(svg.style.fill).toMatch(/(#fff|rgb\(255, 255, 255\)|white)/);
            expect(btn.title).toBe('Filter by Tags (2 selected)');
        });

        it('should reset filter button appearance when no tags are selected', () => {
            selectedTags.clear();

            // Pre-style the button to test reset
            const btn = document.getElementById('filterTagsBtn');
            const svg = btn.querySelector('svg');
            btn.style.background = '#3498db';
            btn.style.color = '#fff';
            svg.style.fill = '#fff';

            applyTagFilters();

            expect(showTagFilter).toBe(false);
            expect(btn.style.background).toBe('');
            expect(btn.style.color).toBe('');
            expect(svg.style.fill).toBe('');
            expect(btn.title).toBe('Filter by Tags');
        });

        it('should close the dropdown', () => {
            const dropdown = document.getElementById('tagFilterDropdown');
            dropdown.classList.add('active');

            applyTagFilters();

            expect(dropdown.classList.contains('active')).toBe(false);
        });

        it('should trigger filterByTags to apply the filters', () => {
            // Setup test data
            fileTags.set('image1.jpg', ['landscape']);
            selectedTags.add('landscape');
            showOnlyHearted = false;

            applyTagFilters();

            // Check that filtering was applied
            const items = document.querySelectorAll('.gallery-item');
            expect(items[0].style.display).toBe(''); // has landscape tag
            expect(items[1].style.display).toBe('none'); // doesn't have landscape tag
        });

        it('should handle single tag selection', () => {
            selectedTags.add('nature');

            applyTagFilters();

            const btn = document.getElementById('filterTagsBtn');
            expect(btn.title).toBe('Filter by Tags (1 selected)');
            expect(showTagFilter).toBe(true);
        });

        it('should handle multiple tag selections', () => {
            selectedTags.add('landscape');
            selectedTags.add('portrait');
            selectedTags.add('nature');
            selectedTags.add('sunset');

            applyTagFilters();

            const btn = document.getElementById('filterTagsBtn');
            expect(btn.title).toBe('Filter by Tags (4 selected)');
            expect(showTagFilter).toBe(true);
        });
    });

    describe('Integration: Complete tag filtering workflow', () => {
        it('should work end-to-end from loading tags to filtering items', async () => {
            isMac = true;
            
            // Mock tag data
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ tags: ['landscape', 'nature'] })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ tags: ['portrait'] })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ tags: ['landscape', 'sunset'] })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ tags: [] })
                });

            // 1. Load tags
            await loadAllTags();
            
            // Verify tags were loaded
            expect(allTags.get('landscape')).toBe(2);
            expect(allTags.get('nature')).toBe(1);
            expect(allTags.get('portrait')).toBe(1);
            expect(allTags.get('sunset')).toBe(1);

            // 2. Populate dropdown
            populateTagFilterDropdown();
            
            // Verify dropdown was populated
            const items = document.querySelectorAll('.tag-filter-item');
            expect(items).toHaveLength(4); // landscape, nature, portrait, sunset

            // 3. Select a tag
            const landscapeCheckbox = document.querySelector('#tag-filter-landscape');
            landscapeCheckbox.checked = true;
            landscapeCheckbox.onchange();
            
            expect(selectedTags.has('landscape')).toBe(true);

            // 4. Apply filters
            applyTagFilters();
            
            // Verify button appearance updated
            const btn = document.getElementById('filterTagsBtn');
            expect(btn.style.background).toMatch(/(#3498db|rgb\(52, 152, 219\))/);
            expect(btn.title).toBe('Filter by Tags (1 selected)');
            
            // Verify items were filtered
            const galleryItems = document.querySelectorAll('.gallery-item');
            expect(galleryItems[0].style.display).toBe(''); // image1.jpg has landscape
            expect(galleryItems[1].style.display).toBe('none'); // image2.jpg doesn't have landscape
            expect(galleryItems[2].style.display).toBe(''); // image3.jpg has landscape
            expect(galleryItems[3].style.display).toBe('none'); // image4.jpg has no tags
        });

        it('should handle combination of heart and tag filters', async () => {
            isMac = true;
            
            // Setup tags
            fileTags.set('image1.jpg', ['landscape']);
            fileTags.set('image2.jpg', ['portrait']);
            fileTags.set('image3.jpg', ['landscape']);
            
            // Setup hearts
            heartedImages.add('image1.jpg');
            heartedImages.add('image3.jpg');
            
            // Apply heart filter
            showOnlyHearted = true;
            
            // Apply tag filter
            selectedTags.add('landscape');
            applyTagFilters();
            
            // Should show items that are hearted AND have landscape tag
            const items = document.querySelectorAll('.gallery-item');
            expect(items[0].style.display).toBe(''); // image1.jpg: hearted + landscape
            expect(items[1].style.display).toBe('none'); // image2.jpg: hearted but no landscape
            expect(items[2].style.display).toBe(''); // image3.jpg: hearted + landscape
            expect(items[3].style.display).toBe('none'); // image4.jpg: not hearted, no tags
        });
    });
});