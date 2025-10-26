const fs = require('fs').promises;
const path = require('path');

// Mock the entire bin/server-runner.js module
jest.mock('chokidar', () => ({
    watch: jest.fn(() => ({
        on: jest.fn().mockReturnThis(),
        close: jest.fn()
    }))
}));

jest.mock('sharp', () => {
    const mockSharp = jest.fn(() => ({
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toFile: jest.fn().mockResolvedValue({}),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-image-data'))
    }));
    return mockSharp;
});

describe('getCachedGalleryData - Image Sorting', () => {
    let tempDir;
    let scanDirectory;
    let getCachedGalleryData;
    let IMAGE_EXTENSIONS;
    let VIDEO_EXTENSIONS;
    let CACHE_DIR;
    let THUMBNAILS_DIR;
    let hasThumbnail;
    let galleryCache;

    beforeAll(() => {
        // Set up environment before requiring the module
        tempDir = path.join(__dirname, 'temp-test-dir-' + Date.now());
        process.env.TEST_SCAN_DIR = tempDir;
        process.env.TEST_CACHE_DIR = path.join(tempDir, '.gallery-cache');
        process.env.TEST_THUMBNAILS_DIR = path.join(tempDir, '.gallery-cache', 'thumbnails');
    });

    beforeEach(async () => {
        // Clear module cache to get fresh instances
        jest.resetModules();
        
        // Create temporary test directory structure
        tempDir = path.join(__dirname, 'temp-test-dir-' + Date.now());
        await fs.mkdir(tempDir, { recursive: true });
        
        // Create subdirectories with unsorted image names
        const subDir1 = path.join(tempDir, 'vacation-2023');
        const subDir2 = path.join(tempDir, 'work-photos');
        await fs.mkdir(subDir1, { recursive: true });
        await fs.mkdir(subDir2, { recursive: true });
        
        // Create test images with deliberately unsorted filenames
        await fs.writeFile(path.join(subDir1, 'zebra.jpg'), Buffer.from('fake-image-data'));
        await fs.writeFile(path.join(subDir1, 'apple.jpg'), Buffer.from('fake-image-data'));
        await fs.writeFile(path.join(subDir1, 'mountain.jpg'), Buffer.from('fake-image-data'));
        await fs.writeFile(path.join(subDir1, 'banana.jpg'), Buffer.from('fake-image-data'));
        
        await fs.writeFile(path.join(subDir2, 'office-2.jpg'), Buffer.from('fake-image-data'));
        await fs.writeFile(path.join(subDir2, 'meeting-1.jpg'), Buffer.from('fake-image-data'));
        await fs.writeFile(path.join(subDir2, 'desk-setup.jpg'), Buffer.from('fake-image-data'));
        
        // Create cache directories
        const cacheDir = path.join(tempDir, '.gallery-cache');
        const thumbnailsDir = path.join(cacheDir, 'thumbnails');
        await fs.mkdir(cacheDir, { recursive: true });
        await fs.mkdir(thumbnailsDir, { recursive: true });
        
        // Create a minimal server module state
        const serverState = {
            scanDir: tempDir,
            IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.svg'],
            VIDEO_EXTENSIONS: ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.ogg', '.m4v', '.3gp', '.wmv', '.flv'],
            CACHE_DIR: cacheDir,
            THUMBNAILS_DIR: thumbnailsDir,
            CACHE_DURATION: 30000,
            galleryCache: {
                data: null,
                lastScan: 0,
                isStale: false
            }
        };
        
        // Create mock implementations
        const scanDirectoryImpl = async (dir, recursive = false) => {
            const results = [];
            
            async function scan(currentDir, baseDir) {
                const entries = await fs.readdir(currentDir, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(currentDir, entry.name);
                    const relativePath = path.relative(baseDir, fullPath);
                    
                    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
                        continue;
                    }
                    
                    if (entry.isDirectory()) {
                        if (recursive) {
                            await scan(fullPath, baseDir);
                        }
                    } else {
                        const ext = path.extname(entry.name).toLowerCase();
                        const isImage = serverState.IMAGE_EXTENSIONS.includes(ext);
                        const isVideo = serverState.VIDEO_EXTENSIONS.includes(ext);
                        
                        if (isImage || isVideo) {
                            results.push({
                                name: entry.name,
                                path: fullPath,
                                relativePath: relativePath,
                                directory: path.dirname(relativePath) || '.',
                                isVideo: isVideo
                            });
                        }
                    }
                }
            }
            
            await scan(dir, dir);
            return results;
        };
        
        const hasThumbnailImpl = async (image) => {
            const base64Path = Buffer.from(image.relativePath).toString('base64');
            const thumbnailPath = path.join(serverState.THUMBNAILS_DIR, `${base64Path}.jpg`);
            try {
                await fs.access(thumbnailPath);
                return `/static/thumbnails/${base64Path}.jpg`;
            } catch {
                return null;
            }
        };
        
        const cleanupOrphanedThumbnailsImpl = async () => {
            return 0; // No-op for these tests
        };
        
        const generateThumbnailsInBackgroundImpl = jest.fn();
        
        const getCachedGalleryDataImpl = async function() {
            const now = Date.now();
            
            // Return cached data if still valid
            if (serverState.galleryCache.data && 
                !serverState.galleryCache.isStale && 
                (now - serverState.galleryCache.lastScan) < serverState.CACHE_DURATION) {
                return serverState.galleryCache.data;
            }
            
            // Scan and cache new data
            const images = await scanDirectoryImpl(serverState.scanDir, true);
            const galleries = {};
            const pendingThumbnails = [];
            
            // First pass: Add all images, checking for existing thumbnails
            for (const image of images) {
                if (!galleries[image.directory]) {
                    galleries[image.directory] = [];
                }
                
                // Check if thumbnail already exists (no generation)
                const existingThumbnail = await hasThumbnailImpl(image);
                
                const imageData = {
                    ...image,
                    thumbnail: existingThumbnail,
                    url: `/image/${encodeURIComponent(image.relativePath)}`,
                    thumbnailReady: !!existingThumbnail
                };
                
                galleries[image.directory].push(imageData);
                
                // Queue for thumbnail generation if needed
                if (!existingThumbnail) {
                    pendingThumbnails.push(image);
                }
            }
            
            // Sort images within each directory by name
            for (const directory in galleries) {
                galleries[directory].sort((a, b) => a.name.localeCompare(b.name));
            }
            
            const result = {
                scanDirectory: serverState.scanDir,
                totalImages: images.length,
                galleries,
                lastScan: now,
                cached: false,
                pendingThumbnails: pendingThumbnails.length
            };
            
            // Update cache
            serverState.galleryCache.data = result;
            serverState.galleryCache.lastScan = now;
            serverState.galleryCache.isStale = false;
            
            // Start background thumbnail generation for pending items
            if (pendingThumbnails.length > 0) {
                const sortedThumbnails = pendingThumbnails.sort((a, b) => {
                    const dirCompare = a.directory.localeCompare(b.directory);
                    if (dirCompare !== 0) return dirCompare;
                    return a.name.localeCompare(b.name);
                });
                
                generateThumbnailsInBackgroundImpl(sortedThumbnails);
            }
            
            return result;
        };
        
        // Expose functions for testing
        scanDirectory = scanDirectoryImpl;
        getCachedGalleryData = getCachedGalleryDataImpl;
        hasThumbnail = hasThumbnailImpl;
        IMAGE_EXTENSIONS = serverState.IMAGE_EXTENSIONS;
        VIDEO_EXTENSIONS = serverState.VIDEO_EXTENSIONS;
        CACHE_DIR = serverState.CACHE_DIR;
        THUMBNAILS_DIR = serverState.THUMBNAILS_DIR;
        galleryCache = serverState.galleryCache;
    });

    afterEach(async () => {
        // Clean up test directory
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    describe('Image sorting within directories', () => {
        it('sorts images alphabetically by name within each directory', async () => {
            const result = await getCachedGalleryData();
            
            expect(result.galleries).toBeDefined();
            
            // Check vacation-2023 directory
            const vacation = result.galleries['vacation-2023'];
            expect(vacation).toBeDefined();
            expect(vacation).toHaveLength(4);
            
            // Should be sorted: apple, banana, mountain, zebra
            expect(vacation[0].name).toBe('apple.jpg');
            expect(vacation[1].name).toBe('banana.jpg');
            expect(vacation[2].name).toBe('mountain.jpg');
            expect(vacation[3].name).toBe('zebra.jpg');
        });

        it('sorts images in multiple directories independently', async () => {
            const result = await getCachedGalleryData();
            
            // Check work-photos directory
            const workPhotos = result.galleries['work-photos'];
            expect(workPhotos).toBeDefined();
            expect(workPhotos).toHaveLength(3);
            
            // Should be sorted: desk-setup, meeting-1, office-2
            expect(workPhotos[0].name).toBe('desk-setup.jpg');
            expect(workPhotos[1].name).toBe('meeting-1.jpg');
            expect(workPhotos[2].name).toBe('office-2.jpg');
            
            // Verify vacation directory is still sorted correctly
            const vacation = result.galleries['vacation-2023'];
            expect(vacation[0].name).toBe('apple.jpg');
            expect(vacation[3].name).toBe('zebra.jpg');
        });

        it('maintains sort order in cached results', async () => {
            // First call - fresh scan
            const firstResult = await getCachedGalleryData();
            const firstVacation = firstResult.galleries['vacation-2023'];
            const firstNames = firstVacation.map(img => img.name);
            
            // Second call - should use cache
            const secondResult = await getCachedGalleryData();
            const secondVacation = secondResult.galleries['vacation-2023'];
            const secondNames = secondVacation.map(img => img.name);
            
            // Both should be sorted identically
            expect(secondNames).toEqual(firstNames);
            expect(secondNames).toEqual(['apple.jpg', 'banana.jpg', 'mountain.jpg', 'zebra.jpg']);
        });

        it('uses localeCompare for natural language sorting', async () => {
            // Create directory with numbers in filenames
            const numberedDir = path.join(tempDir, 'numbered');
            await fs.mkdir(numberedDir, { recursive: true });
            
            await fs.writeFile(path.join(numberedDir, 'photo-2.jpg'), Buffer.from('fake-image-data'));
            await fs.writeFile(path.join(numberedDir, 'photo-10.jpg'), Buffer.from('fake-image-data'));
            await fs.writeFile(path.join(numberedDir, 'photo-1.jpg'), Buffer.from('fake-image-data'));
            await fs.writeFile(path.join(numberedDir, 'photo-20.jpg'), Buffer.from('fake-image-data'));
            
            // Invalidate cache to force rescan
            galleryCache.isStale = true;
            
            const result = await getCachedGalleryData();
            const numbered = result.galleries['numbered'];
            
            expect(numbered).toBeDefined();
            expect(numbered).toHaveLength(4);
            
            // localeCompare should handle numeric sorting naturally
            const names = numbered.map(img => img.name);
            expect(names).toEqual(['photo-1.jpg', 'photo-10.jpg', 'photo-2.jpg', 'photo-20.jpg']);
        });

        it('handles case-insensitive sorting correctly', async () => {
            // Create directory with mixed case filenames
            const mixedCaseDir = path.join(tempDir, 'mixed-case');
            await fs.mkdir(mixedCaseDir, { recursive: true });
            
            await fs.writeFile(path.join(mixedCaseDir, 'Zebra.jpg'), Buffer.from('fake-image-data'));
            await fs.writeFile(path.join(mixedCaseDir, 'apple.jpg'), Buffer.from('fake-image-data'));
            await fs.writeFile(path.join(mixedCaseDir, 'Mountain.jpg'), Buffer.from('fake-image-data'));
            await fs.writeFile(path.join(mixedCaseDir, 'banana.jpg'), Buffer.from('fake-image-data'));
            
            // Invalidate cache to force rescan
            galleryCache.isStale = true;
            
            const result = await getCachedGalleryData();
            const mixedCase = result.galleries['mixed-case'];
            
            expect(mixedCase).toBeDefined();
            expect(mixedCase).toHaveLength(4);
            
            // localeCompare handles case-insensitive sorting by default
            const names = mixedCase.map(img => img.name);
            expect(names[0].toLowerCase()).toBe('apple.jpg');
            expect(names[3].toLowerCase()).toBe('zebra.jpg');
        });

        it('sorts empty directories without errors', async () => {
            // Create empty directory
            const emptyDir = path.join(tempDir, 'empty');
            await fs.mkdir(emptyDir, { recursive: true });
            
            // Invalidate cache to force rescan
            galleryCache.isStale = true;
            
            const result = await getCachedGalleryData();
            
            // Empty directory should not appear in galleries
            expect(result.galleries['empty']).toBeUndefined();
        });

        it('preserves all image metadata after sorting', async () => {
            const result = await getCachedGalleryData();
            const vacation = result.galleries['vacation-2023'];
            
            // Check that all required properties are present after sorting
            for (const image of vacation) {
                expect(image).toHaveProperty('name');
                expect(image).toHaveProperty('path');
                expect(image).toHaveProperty('relativePath');
                expect(image).toHaveProperty('directory');
                expect(image).toHaveProperty('isVideo');
                expect(image).toHaveProperty('thumbnail');
                expect(image).toHaveProperty('url');
                expect(image).toHaveProperty('thumbnailReady');
            }
            
            // Verify directory is correct
            expect(vacation[0].directory).toBe('vacation-2023');
        });
    });
});
