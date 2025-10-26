const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { createTestImageFile, mockPlatform } = require('./test-utils');

// Mock the macOS tags module
jest.mock('../macos-tags', () => ({
    readFinderTags: jest.fn(),
    writeFinderTags: jest.fn()
}));

const { readFinderTags, writeFinderTags } = require('../macos-tags');

describe('macOS Finder Tags API Endpoints', () => {
    let app;
    let testScanDir;
    let testFilePath;
    let restorePlatform;

    beforeEach(async () => {
        // Setup test directory structure
        testScanDir = global.TEST_TEMP_DIR;
        await fs.mkdir(path.join(testScanDir, 'subdir'), { recursive: true });
        
        // Create test files
        testFilePath = await createTestImageFile('test-image.jpg');
        await createTestImageFile('subdir/nested-image.jpg');

        // Mock platform as macOS
        restorePlatform = mockPlatform('darwin');

        // Clear mocks
        jest.clearAllMocks();

        // Create Express app with the API endpoints
        app = express();
        app.use(express.json());

        // Mock fs.access to simulate file existence
        const originalAccess = fs.access;
        jest.spyOn(fs, 'access').mockImplementation(async (filePath) => {
            if (filePath.includes('test-image.jpg') || filePath.includes('nested-image.jpg')) {
                return Promise.resolve();
            }
            return originalAccess(filePath);
        });

        // Set scan directory for path validation
        const scanDir = testScanDir;

        // GET endpoint for reading tags
        app.get('/api/macos/tag', async (req, res) => {
            if (process.platform !== 'darwin') {
                return res.json({ tags: [] });
            }
            try {
                const relativePath = req.query.relativePath;
                if (!relativePath) return res.json({ tags: [] });
                
                const imagePath = path.join(scanDir, relativePath);
                const resolvedPath = path.resolve(imagePath);
                const resolvedScanDir = path.resolve(scanDir);
                
                if (!resolvedPath.startsWith(resolvedScanDir)) {
                    return res.status(403).json({ error: 'Access denied' });
                }
                
                await fs.access(resolvedPath);
                const tags = await readFinderTags(resolvedPath);
                return res.json({ tags });
            } catch (e) {
                return res.json({ tags: [] });
            }
        });

        // POST endpoint for writing tags
        app.post('/api/macos/tag', async (req, res) => {
            if (process.platform !== 'darwin') {
                return res.status(400).json({ error: 'Finder tagging only available on macOS' });
            }
            try {
                const { relativePath, tags } = req.body || {};
                if (!relativePath || !Array.isArray(tags) || tags.length === 0) {
                    return res.status(400).json({ error: 'relativePath and non-empty tags array required' });
                }
                
                const imagePath = path.join(scanDir, relativePath);
                const resolvedPath = path.resolve(imagePath);
                const resolvedScanDir = path.resolve(scanDir);
                
                if (!resolvedPath.startsWith(resolvedScanDir)) {
                    return res.status(403).json({ error: 'Access denied' });
                }
                
                await fs.access(resolvedPath);
                await writeFinderTags(resolvedPath, tags);
                
                // Read back the tags to confirm
                const readBack = await readFinderTags(resolvedPath);
                return res.json({ ok: true, tags: readBack });
            } catch (e) {
                res.status(500).json({ error: e.message || 'Failed to set Finder tags' });
            }
        });
    });

    afterEach(() => {
        restorePlatform();
        jest.restoreAllMocks();
    });

    describe('GET /api/macos/tag', () => {
        it('returns the correct tags for a given file', async () => {
            // Mock readFinderTags to return test tags
            const testTags = ['Work', 'Important', 'Photo'];
            readFinderTags.mockResolvedValue(testTags);

            const response = await request(app)
                .get('/api/macos/tag')
                .query({ relativePath: 'test-image.jpg' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ tags: testTags });
            expect(readFinderTags).toHaveBeenCalledWith(
                path.resolve(testScanDir, 'test-image.jpg')
            );
        });

        it('returns empty tags array for file without tags', async () => {
            readFinderTags.mockResolvedValue([]);

            const response = await request(app)
                .get('/api/macos/tag')
                .query({ relativePath: 'test-image.jpg' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ tags: [] });
        });

        it('handles nested file paths correctly', async () => {
            const testTags = ['Nested', 'Subfolder'];
            readFinderTags.mockResolvedValue(testTags);

            const response = await request(app)
                .get('/api/macos/tag')
                .query({ relativePath: 'subdir/nested-image.jpg' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ tags: testTags });
            expect(readFinderTags).toHaveBeenCalledWith(
                path.resolve(testScanDir, 'subdir/nested-image.jpg')
            );
        });

        it('returns empty tags when no relativePath provided', async () => {
            const response = await request(app)
                .get('/api/macos/tag')
                .query({});

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ tags: [] });
            expect(readFinderTags).not.toHaveBeenCalled();
        });

        it('prevents path traversal attacks', async () => {
            const response = await request(app)
                .get('/api/macos/tag')
                .query({ relativePath: '../../../etc/passwd' });

            expect(response.status).toBe(403);
            expect(response.body).toEqual({ error: 'Access denied' });
            expect(readFinderTags).not.toHaveBeenCalled();
        });

        it('handles file access errors gracefully', async () => {
            // Mock fs.access to throw an error
            fs.access.mockRejectedValue(new Error('File not found'));

            const response = await request(app)
                .get('/api/macos/tag')
                .query({ relativePath: 'nonexistent.jpg' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ tags: [] });
            expect(readFinderTags).not.toHaveBeenCalled();
        });

        it('handles readFinderTags errors gracefully', async () => {
            readFinderTags.mockRejectedValue(new Error('xattr failed'));

            const response = await request(app)
                .get('/api/macos/tag')
                .query({ relativePath: 'test-image.jpg' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ tags: [] });
        });

        it('returns empty tags on non-macOS platforms', async () => {
            // Temporarily mock non-macOS platform
            const restoreNonMac = mockPlatform('linux');
            
            const response = await request(app)
                .get('/api/macos/tag')
                .query({ relativePath: 'test-image.jpg' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ tags: [] });
            expect(readFinderTags).not.toHaveBeenCalled();

            restoreNonMac();
        });
    });

    describe('POST /api/macos/tag', () => {
        it('successfully sets tags for a given file', async () => {
            const tagsToSet = ['Work', 'Project', 'Important'];
            const mockReadBack = ['Work', 'Project', 'Important'];
            
            writeFinderTags.mockResolvedValue(true);
            readFinderTags.mockResolvedValue(mockReadBack);

            const response = await request(app)
                .post('/api/macos/tag')
                .send({
                    relativePath: 'test-image.jpg',
                    tags: tagsToSet
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ 
                ok: true, 
                tags: mockReadBack 
            });
            expect(writeFinderTags).toHaveBeenCalledWith(
                path.resolve(testScanDir, 'test-image.jpg'),
                tagsToSet
            );
            expect(readFinderTags).toHaveBeenCalledWith(
                path.resolve(testScanDir, 'test-image.jpg')
            );
        });

        it('successfully sets tags for nested file paths', async () => {
            const tagsToSet = ['Nested', 'Test'];
            writeFinderTags.mockResolvedValue(true);
            readFinderTags.mockResolvedValue(tagsToSet);

            const response = await request(app)
                .post('/api/macos/tag')
                .send({
                    relativePath: 'subdir/nested-image.jpg',
                    tags: tagsToSet
                });

            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);
            expect(writeFinderTags).toHaveBeenCalledWith(
                path.resolve(testScanDir, 'subdir/nested-image.jpg'),
                tagsToSet
            );
        });

        it('validates that relativePath is provided', async () => {
            const response = await request(app)
                .post('/api/macos/tag')
                .send({
                    tags: ['Work']
                });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ 
                error: 'relativePath and non-empty tags array required' 
            });
            expect(writeFinderTags).not.toHaveBeenCalled();
        });

        it('validates that tags is a non-empty array', async () => {
            const response = await request(app)
                .post('/api/macos/tag')
                .send({
                    relativePath: 'test-image.jpg',
                    tags: []
                });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ 
                error: 'relativePath and non-empty tags array required' 
            });
            expect(writeFinderTags).not.toHaveBeenCalled();
        });

        it('validates that tags is an array', async () => {
            const response = await request(app)
                .post('/api/macos/tag')
                .send({
                    relativePath: 'test-image.jpg',
                    tags: 'not-an-array'
                });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ 
                error: 'relativePath and non-empty tags array required' 
            });
            expect(writeFinderTags).not.toHaveBeenCalled();
        });

        it('prevents path traversal attacks', async () => {
            const response = await request(app)
                .post('/api/macos/tag')
                .send({
                    relativePath: '../../../etc/passwd',
                    tags: ['evil']
                });

            expect(response.status).toBe(403);
            expect(response.body).toEqual({ error: 'Access denied' });
            expect(writeFinderTags).not.toHaveBeenCalled();
        });

        it('handles file access errors', async () => {
            fs.access.mockRejectedValue(new Error('File not found'));

            const response = await request(app)
                .post('/api/macos/tag')
                .send({
                    relativePath: 'nonexistent.jpg',
                    tags: ['test']
                });

            expect(response.status).toBe(500);
            expect(response.body.error).toBeDefined();
            expect(writeFinderTags).not.toHaveBeenCalled();
        });

        it('handles writeFinderTags errors', async () => {
            writeFinderTags.mockRejectedValue(new Error('xattr command failed'));

            const response = await request(app)
                .post('/api/macos/tag')
                .send({
                    relativePath: 'test-image.jpg',
                    tags: ['test']
                });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ 
                error: 'xattr command failed' 
            });
        });

        it('handles empty request body', async () => {
            const response = await request(app)
                .post('/api/macos/tag')
                .send();

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ 
                error: 'relativePath and non-empty tags array required' 
            });
            expect(writeFinderTags).not.toHaveBeenCalled();
        });

        it('rejects requests on non-macOS platforms', async () => {
            // Temporarily mock non-macOS platform
            const restoreNonMac = mockPlatform('linux');

            const response = await request(app)
                .post('/api/macos/tag')
                .send({
                    relativePath: 'test-image.jpg',
                    tags: ['test']
                });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ 
                error: 'Finder tagging only available on macOS' 
            });
            expect(writeFinderTags).not.toHaveBeenCalled();

            restoreNonMac();
        });

        it('handles malformed JSON gracefully', async () => {
            const response = await request(app)
                .post('/api/macos/tag')
                .set('Content-Type', 'application/json')
                .send('{"invalid": json}');

            expect(response.status).toBe(400);
        });

        it('reads back tags after successful write', async () => {
            const tagsToSet = ['Work'];
            const readBackTags = ['Work', 'Auto-added']; // Simulate system adding additional tags
            
            writeFinderTags.mockResolvedValue(true);
            readFinderTags.mockResolvedValue(readBackTags);

            const response = await request(app)
                .post('/api/macos/tag')
                .send({
                    relativePath: 'test-image.jpg',
                    tags: tagsToSet
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ 
                ok: true, 
                tags: readBackTags 
            });
            
            // Verify both functions were called
            expect(writeFinderTags).toHaveBeenCalled();
            expect(readFinderTags).toHaveBeenCalled();
        });
    });
});