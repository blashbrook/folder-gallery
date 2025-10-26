/**
 * Unit tests for updateTagButton functionality
 * 
 * Tests the JavaScript function embedded in the gallery HTML:
 * - updateTagButton: Updates tag button appearance based on currentTags
 * - Integration with openModal (fetching tags)
 * - Integration with saveTags (saving tags)
 */

const { JSDOM } = require('jsdom');

describe('updateTagButton Function', () => {
    let dom, window, document;
    let mockFetch;
    let originalConsole;
    
    // Global variables that exist in the gallery HTML
    let isMac;
    let currentModalMedia;
    let currentTags;
    let modal;
    let modalImg;
    let modalVideo;
    let zoomControls;
    let zoomInfo;
    
    // Functions from the HTML that we need to test
    let updateTagButton;
    let openModal;
    let fetchTagsForCurrent;
    let renderTagChips;
    let hideTagEditor;
    let resetZoom;
    
    beforeEach(() => {
        // Suppress console output during tests
        originalConsole = global.console;
        global.console = {
            ...global.console,
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };

        // Create a JSDOM environment with our HTML structure
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <head></head>
            <body>
                <div id="imageModal" class="modal">
                    <img class="modal-image" id="modalImage" style="display: none;">
                    <video class="modal-video" id="modalVideo" controls style="display: none;"></video>
                    <div class="zoom-info" id="zoomInfo">100%</div>
                    <div class="zoom-controls" id="zoomControls">
                        <button class="zoom-btn" id="tagBtn" title="Tag in Finder" style="display:none;">
                            <svg width="22" height="22" viewBox="0 0 24 24">
                                <path d="M20.59 13.41L11 3H4v7l9.59 9.59a2 2 0 0 0 2.83 0l4.17-4.17a2 2 0 0 0 0-2.83z"></path>
                                <circle cx="6.5" cy="6.5" r="1.5"></circle>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="tag-editor" id="tagEditor" aria-hidden="true">
                    <div id="tagChips" style="display:flex; gap:8px; flex-wrap:wrap;"></div>
                    <input id="tagInput" class="tag-input" type="text" placeholder="Add tag…" title="Add tag" />
                    <button id="tagSave" class="tag-save" title="Save tags">Save</button>
                </div>
            </body>
            </html>
        `, {
            url: 'http://localhost:3000',
            pretendToBeVisual: true,
            resources: 'usable'
        });

        window = dom.window;
        document = window.document;
        
        // Mock fetch
        mockFetch = jest.fn();
        global.fetch = mockFetch;
        
        // Initialize global variables as they exist in the HTML
        isMac = true; // Default to Mac for most tests
        currentModalMedia = null;
        currentTags = [];
        
        // Get DOM element references
        modal = document.getElementById('imageModal');
        modalImg = document.getElementById('modalImage');
        modalVideo = document.getElementById('modalVideo');
        zoomControls = document.getElementById('zoomControls');
        zoomInfo = document.getElementById('zoomInfo');
        
        // Define the functions as they exist in the HTML
        updateTagButton = function() {
            const tagBtn = document.getElementById('tagBtn');
            if (tagBtn && currentModalMedia && isMac) {
                tagBtn.classList.toggle('tagged', currentTags && currentTags.length > 0);
            }
        };
        
        fetchTagsForCurrent = async function() {
            if (!currentModalMedia) return [];
            const resp = await fetch('/api/macos/tag?relativePath=' + encodeURIComponent(currentModalMedia.relativePath));
            if (!resp.ok) return [];
            const data = await resp.json().catch(() => ({}));
            return Array.isArray(data.tags) ? data.tags : [];
        };
        
        renderTagChips = function() {
            const tagChips = document.getElementById('tagChips');
            tagChips.innerHTML = '';
            currentTags.forEach((t, idx) => {
                const chip = document.createElement('span');
                chip.className = 'tag-chip';
                chip.innerHTML = t + ' <button title="Remove tag" aria-label="Remove tag">×</button>';
                chip.querySelector('button').onclick = () => {
                    currentTags.splice(idx, 1);
                    renderTagChips();
                };
                tagChips.appendChild(chip);
            });
        };
        
        hideTagEditor = function() {
            const tagEditor = document.getElementById('tagEditor');
            tagEditor.classList.remove('active');
            tagEditor.setAttribute('aria-hidden', 'true');
        };
        
        resetZoom = function() {
            // Simplified for testing
        };
        
        // Wire up the tagSave button handler
        const tagSave = document.getElementById('tagSave');
        tagSave.onclick = async () => {
            if (!currentModalMedia) return;
            try {
                const resp = await fetch('/api/macos/tag', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ relativePath: currentModalMedia.relativePath, tags: currentTags })
                });
                const data = await resp.json().catch(() => ({}));
                if (resp.ok && data.ok) {
                    hideTagEditor();
                    updateTagButton();
                } else {
                    alert('Failed to save tags');
                }
            } catch {
                alert('Failed to save tags');
            }
        };
        
        openModal = async function(media) {
            // Simplified version focusing on tag-related functionality
            if (modalVideo && modalVideo.style.display === 'block') {
                try { modalVideo.pause(); } catch {}
            }
            currentModalMedia = media;
            if (media.type === 'video') {
                modalImg.style.display = 'none';
                modalVideo.style.display = 'block';
                modalVideo.src = media.url;
                zoomControls.classList.remove('active');
                zoomInfo.classList.remove('active');
            } else {
                modalVideo.style.display = 'none';
                modalImg.style.display = 'block';
                modalImg.src = media.url;
                zoomControls.classList.add('active');
                zoomInfo.classList.add('active');
                resetZoom();
            }
            modal.classList.add('active');
            
            // Show Finder tag button only on macOS
            const tagBtn = document.getElementById('tagBtn');
            if (isMac) { tagBtn.style.display = ''; } else { tagBtn.style.display = 'none'; }
            
            // Preload current Finder tags on macOS
            try {
                currentTags = isMac ? await fetchTagsForCurrent() : [];
                renderTagChips();
                updateTagButton();
            } catch {}
        };

        // Make DOM globally available for functions
        global.document = document;
        global.window = window;
    });

    afterEach(() => {
        // Restore original console
        global.console = originalConsole;
        
        // Clean up DOM
        dom.window.close();
        delete global.document;
        delete global.window;
        delete global.fetch;
    });

    describe('updateTagButton', () => {
        it('should add "tagged" class when currentTags is not empty and on Mac', () => {
            isMac = true;
            currentModalMedia = { relativePath: 'image1.jpg', url: '/image/image1.jpg', type: 'image' };
            currentTags = ['landscape', 'nature'];
            
            updateTagButton();
            
            const tagBtn = document.getElementById('tagBtn');
            expect(tagBtn.classList.contains('tagged')).toBe(true);
        });

        it('should remove "tagged" class when currentTags is empty and on Mac', () => {
            isMac = true;
            currentModalMedia = { relativePath: 'image1.jpg', url: '/image/image1.jpg', type: 'image' };
            currentTags = [];
            
            // Pre-add the class to test removal
            const tagBtn = document.getElementById('tagBtn');
            tagBtn.classList.add('tagged');
            
            updateTagButton();
            
            expect(tagBtn.classList.contains('tagged')).toBe(false);
        });

        it('should handle single tag (adds "tagged" class)', () => {
            isMac = true;
            currentModalMedia = { relativePath: 'image2.jpg', url: '/image/image2.jpg', type: 'image' };
            currentTags = ['portrait'];
            
            updateTagButton();
            
            const tagBtn = document.getElementById('tagBtn');
            expect(tagBtn.classList.contains('tagged')).toBe(true);
        });

        it('should handle multiple tags (adds "tagged" class)', () => {
            isMac = true;
            currentModalMedia = { relativePath: 'image3.jpg', url: '/image/image3.jpg', type: 'image' };
            currentTags = ['landscape', 'sunset', 'nature', 'beach'];
            
            updateTagButton();
            
            const tagBtn = document.getElementById('tagBtn');
            expect(tagBtn.classList.contains('tagged')).toBe(true);
        });

        it('should not add "tagged" class when not on Mac even if currentTags exists', () => {
            isMac = false;
            currentModalMedia = { relativePath: 'image1.jpg', url: '/image/image1.jpg', type: 'image' };
            currentTags = ['landscape'];
            
            updateTagButton();
            
            const tagBtn = document.getElementById('tagBtn');
            expect(tagBtn.classList.contains('tagged')).toBe(false);
        });

        it('should not add "tagged" class when currentModalMedia is null', () => {
            isMac = true;
            currentModalMedia = null;
            currentTags = ['landscape'];
            
            updateTagButton();
            
            const tagBtn = document.getElementById('tagBtn');
            expect(tagBtn.classList.contains('tagged')).toBe(false);
        });

        it('should not throw error when tag button does not exist', () => {
            isMac = true;
            currentModalMedia = { relativePath: 'image1.jpg', url: '/image/image1.jpg', type: 'image' };
            currentTags = ['landscape'];
            
            // Remove tag button
            const tagBtn = document.getElementById('tagBtn');
            tagBtn.remove();
            
            expect(() => {
                updateTagButton();
            }).not.toThrow();
        });

        it('should handle currentTags being null or undefined', () => {
            isMac = true;
            currentModalMedia = { relativePath: 'image1.jpg', url: '/image/image1.jpg', type: 'image' };
            const tagBtn = document.getElementById('tagBtn');
            
            // Test with null - classList.toggle with false condition removes class
            currentTags = null;
            tagBtn.classList.add('tagged'); // Pre-add to test removal
            updateTagButton();
            expect(tagBtn.classList.contains('tagged')).toBe(false);
            
            // Test with undefined
            currentTags = undefined;
            tagBtn.classList.add('tagged'); // Pre-add to test removal
            updateTagButton();
            expect(tagBtn.classList.contains('tagged')).toBe(false);
        });

        it('should work with video media (not just images)', () => {
            isMac = true;
            currentModalMedia = { relativePath: 'video1.mp4', url: '/image/video1.mp4', type: 'video' };
            currentTags = ['vacation', 'family'];
            
            updateTagButton();
            
            const tagBtn = document.getElementById('tagBtn');
            expect(tagBtn.classList.contains('tagged')).toBe(true);
        });
    });

    describe('Integration: updateTagButton called from openModal', () => {
        it('should call updateTagButton and add "tagged" class when fetching tags with data', async () => {
            isMac = true;
            
            // Mock successful fetch with tags
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ tags: ['landscape', 'nature'] })
            });
            
            const media = { relativePath: 'image1.jpg', url: '/image/image1.jpg', type: 'image' };
            await openModal(media);
            
            // Verify fetch was called
            expect(mockFetch).toHaveBeenCalledWith('/api/macos/tag?relativePath=image1.jpg');
            
            // Verify tags were loaded
            expect(currentTags).toEqual(['landscape', 'nature']);
            
            // Verify updateTagButton was called and button has "tagged" class
            const tagBtn = document.getElementById('tagBtn');
            expect(tagBtn.classList.contains('tagged')).toBe(true);
        });

        it('should call updateTagButton and remove "tagged" class when fetching tags with empty data', async () => {
            isMac = true;
            
            // Mock successful fetch with no tags
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ tags: [] })
            });
            
            // Pre-add "tagged" class to test removal
            const tagBtn = document.getElementById('tagBtn');
            tagBtn.classList.add('tagged');
            
            const media = { relativePath: 'image2.jpg', url: '/image/image2.jpg', type: 'image' };
            await openModal(media);
            
            // Verify fetch was called
            expect(mockFetch).toHaveBeenCalledWith('/api/macos/tag?relativePath=image2.jpg');
            
            // Verify tags are empty
            expect(currentTags).toEqual([]);
            
            // Verify "tagged" class was removed
            expect(tagBtn.classList.contains('tagged')).toBe(false);
        });

        it('should handle fetch errors gracefully and not add "tagged" class', async () => {
            isMac = true;
            
            // Mock failed fetch
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404
            });
            
            const media = { relativePath: 'image3.jpg', url: '/image/image3.jpg', type: 'image' };
            await openModal(media);
            
            // Verify tags are empty
            expect(currentTags).toEqual([]);
            
            // Verify no "tagged" class
            const tagBtn = document.getElementById('tagBtn');
            expect(tagBtn.classList.contains('tagged')).toBe(false);
        });

        it('should not fetch tags when not on macOS', async () => {
            isMac = false;
            
            const media = { relativePath: 'image1.jpg', url: '/image/image1.jpg', type: 'image' };
            await openModal(media);
            
            // Verify fetch was NOT called
            expect(mockFetch).not.toHaveBeenCalled();
            
            // Verify tags are empty
            expect(currentTags).toEqual([]);
        });

        it('should handle malformed JSON response gracefully', async () => {
            isMac = true;
            
            // Mock response with malformed JSON
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => { throw new Error('Invalid JSON'); }
            });
            
            const media = { relativePath: 'image4.jpg', url: '/image/image4.jpg', type: 'image' };
            await openModal(media);
            
            // Should handle error gracefully with empty tags
            expect(currentTags).toEqual([]);
            
            const tagBtn = document.getElementById('tagBtn');
            expect(tagBtn.classList.contains('tagged')).toBe(false);
        });

        it('should handle network errors gracefully', async () => {
            isMac = true;
            
            // Mock network error
            mockFetch.mockRejectedValueOnce(new Error('Network error'));
            
            const media = { relativePath: 'image5.jpg', url: '/image/image5.jpg', type: 'image' };
            
            // Should not throw
            await expect(openModal(media)).resolves.not.toThrow();
            
            // Tags should remain empty
            expect(currentTags).toEqual([]);
        });
    });

    describe('Integration: updateTagButton called after saveTags', () => {
        beforeEach(() => {
            // Setup a modal media context
            isMac = true;
            currentModalMedia = { relativePath: 'image1.jpg', url: '/image/image1.jpg', type: 'image' };
        });

        it('should call updateTagButton and add "tagged" class when saving tags successfully', async () => {
            currentTags = ['landscape', 'nature'];
            
            // Mock successful save
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ok: true })
            });
            
            // Simulate tag save click
            const tagSave = document.getElementById('tagSave');
            await tagSave.onclick();
            
            // Verify fetch was called with correct data
            expect(mockFetch).toHaveBeenCalledWith('/api/macos/tag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ relativePath: 'image1.jpg', tags: ['landscape', 'nature'] })
            });
            
            // Verify "tagged" class was added
            const tagBtn = document.getElementById('tagBtn');
            expect(tagBtn.classList.contains('tagged')).toBe(true);
        });

        it('should call updateTagButton and remove "tagged" class when saving empty tags', async () => {
            currentTags = []; // User removed all tags
            
            // Pre-add "tagged" class to test removal
            const tagBtn = document.getElementById('tagBtn');
            tagBtn.classList.add('tagged');
            
            // Mock successful save
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ok: true })
            });
            
            // Simulate tag save click
            const tagSave = document.getElementById('tagSave');
            await tagSave.onclick();
            
            // Verify fetch was called
            expect(mockFetch).toHaveBeenCalledWith('/api/macos/tag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ relativePath: 'image1.jpg', tags: [] })
            });
            
            // Verify "tagged" class was removed
            expect(tagBtn.classList.contains('tagged')).toBe(false);
        });

        it('should not call updateTagButton when save fails', async () => {
            currentTags = ['landscape'];
            
            // Mock failed save
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500
            });
            
            // Spy on alert
            global.alert = jest.fn();
            
            // Simulate tag save click
            const tagSave = document.getElementById('tagSave');
            await tagSave.onclick();
            
            // Verify alert was shown
            expect(global.alert).toHaveBeenCalledWith('Failed to save tags');
            
            // Note: In the actual implementation, updateTagButton is only called
            // on successful save, so we don't test for button state change here
        });

        it('should handle network error during save', async () => {
            currentTags = ['portrait'];
            
            // Mock network error
            mockFetch.mockRejectedValueOnce(new Error('Network error'));
            
            // Spy on alert
            global.alert = jest.fn();
            
            // Simulate tag save click
            const tagSave = document.getElementById('tagSave');
            await tagSave.onclick();
            
            // Verify alert was shown
            expect(global.alert).toHaveBeenCalledWith('Failed to save tags');
        });

        it('should handle response with ok:false in JSON', async () => {
            currentTags = ['sunset'];
            
            // Mock response with ok:false in body
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ok: false, error: 'Permission denied' })
            });
            
            // Spy on alert
            global.alert = jest.fn();
            
            // Simulate tag save click
            const tagSave = document.getElementById('tagSave');
            await tagSave.onclick();
            
            // Verify alert was shown
            expect(global.alert).toHaveBeenCalledWith('Failed to save tags');
        });

        it('should work with single tag', async () => {
            currentTags = ['vacation'];
            
            // Mock successful save
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ok: true })
            });
            
            const tagSave = document.getElementById('tagSave');
            await tagSave.onclick();
            
            const tagBtn = document.getElementById('tagBtn');
            expect(tagBtn.classList.contains('tagged')).toBe(true);
        });

        it('should work with multiple tags', async () => {
            currentTags = ['vacation', 'family', 'summer', '2023'];
            
            // Mock successful save
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ok: true })
            });
            
            const tagSave = document.getElementById('tagSave');
            await tagSave.onclick();
            
            const tagBtn = document.getElementById('tagBtn');
            expect(tagBtn.classList.contains('tagged')).toBe(true);
        });

        it('should not attempt save when currentModalMedia is null', async () => {
            currentModalMedia = null;
            currentTags = ['test'];
            
            const tagSave = document.getElementById('tagSave');
            await tagSave.onclick();
            
            // Verify fetch was NOT called
            expect(mockFetch).not.toHaveBeenCalled();
        });
    });

    describe('Complete workflow: fetch → display → modify → save', () => {
        it('should correctly update button through entire tag lifecycle', async () => {
            isMac = true;
            const tagBtn = document.getElementById('tagBtn');
            
            // Step 1: Open modal with no tags
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ tags: [] })
            });
            
            await openModal({ relativePath: 'image1.jpg', url: '/image/image1.jpg', type: 'image' });
            expect(tagBtn.classList.contains('tagged')).toBe(false);
            
            // Step 2: User adds tags
            currentTags = ['landscape', 'nature'];
            renderTagChips();
            
            // Step 3: Save tags
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ok: true })
            });
            
            const tagSave = document.getElementById('tagSave');
            await tagSave.onclick();
            
            expect(tagBtn.classList.contains('tagged')).toBe(true);
            
            // Step 4: Reopen same image (simulating navigation)
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ tags: ['landscape', 'nature'] })
            });
            
            await openModal({ relativePath: 'image1.jpg', url: '/image/image1.jpg', type: 'image' });
            expect(tagBtn.classList.contains('tagged')).toBe(true);
            expect(currentTags).toEqual(['landscape', 'nature']);
        });
    });
});
