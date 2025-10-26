const { readFinderTags, writeFinderTags } = require('../macos-tags');
const { MockSpawn, createMockSpawn, createTestImageFile, mockPlatform } = require('./test-utils');

// Mock child_process module
jest.mock('child_process', () => ({
    spawn: jest.fn()
}));

describe('macOS Finder Tags', () => {
    let mockSpawn;
    let testFilePath;
    let restorePlatform;

    beforeEach(async () => {
        // Mock macOS platform
        restorePlatform = mockPlatform('darwin');
        
        // Create test file
        testFilePath = await createTestImageFile('test-image.jpg');
        
        // Setup mock spawn  
        mockSpawn = createMockSpawn();
        const childProcess = require('child_process');
        childProcess.spawn = mockSpawn;
        
        // Clear any previous mock calls
        jest.clearAllMocks();
    });

    afterEach(() => {
        restorePlatform();
    });

    describe('readFinderTags', () => {
        it('correctly extracts tags from a file', async () => {
            // Mock successful tag reading
            mockSpawn.mockImplementation((command, args, options) => {
                const mockProcess = new MockSpawn(command, args, options);
                
                // Override simulation to emit tag data
                mockProcess._simulateExecution = () => {
                    setTimeout(() => {
                        // Simulate tag tool output (comma-separated)
                        mockProcess.stdout.emit('data', 'Work,Personal,Important');
                        mockProcess.emit('close', 0);
                    }, 10);
                };
                
                return mockProcess;
            });

            const tags = await readFinderTags(testFilePath);
            
            expect(tags).toEqual(['Work', 'Personal', 'Important']);
            const tagPath = process.env.TAG_PATH || '/opt/homebrew/bin/tag';
            expect(mockSpawn).toHaveBeenCalledWith(tagPath, ['--list', '--no-name', testFilePath], { stdio: ['ignore', 'pipe', 'ignore'] });
        });

        it('returns empty array when file has no tags', async () => {
            // Mock empty tag response
            mockSpawn.mockImplementation((command, args, options) => {
                const mockProcess = new MockSpawn(command, args, options);
                
                mockProcess._simulateExecution = () => {
                    setTimeout(() => {
                        // Simulate empty output (no tags)
                        mockProcess.stdout.emit('data', '');
                        mockProcess.emit('close', 0);
                    }, 10);
                };
                
                return mockProcess;
            });

            const tags = await readFinderTags(testFilePath);
            
            expect(tags).toEqual([]);
        });

        it('handles subprocess errors gracefully', async () => {
            // Mock process that exits with error (file has no xattr)
            mockSpawn.mockImplementation((command, args, options) => {
                const mockProcess = new MockSpawn(command, args, options);
                
                mockProcess._simulateExecution = () => {
                    setTimeout(() => {
                        // Simulate no output due to CalledProcessError in Python
                        mockProcess.stdout.emit('data', '');
                        mockProcess.emit('close', 1); // Exit with error code
                    }, 10);
                };
                
                return mockProcess;
            });

            const tags = await readFinderTags(testFilePath);
            
            expect(tags).toEqual([]);
        });

        it('filters out empty tags and trims whitespace', async () => {
            // Mock tag response with whitespace
            mockSpawn.mockImplementation((command, args, options) => {
                const mockProcess = new MockSpawn(command, args, options);
                
                mockProcess._simulateExecution = () => {
                    setTimeout(() => {
                        // Simulate messy output with whitespace (comma-separated)
                        mockProcess.stdout.emit('data', '  Work  , ,Personal,   , Important  ');
                        mockProcess.emit('close', 0);
                    }, 10);
                };
                
                return mockProcess;
            });

            const tags = await readFinderTags(testFilePath);
            
            expect(tags).toEqual(['Work', 'Personal', 'Important']);
        });

        it('calls tag CLI with correct arguments', async () => {
            let commandArgs = [];
            
            mockSpawn.mockImplementation((command, args, options) => {
                commandArgs = args;
                const mockProcess = new MockSpawn(command, args, options);
                
                mockProcess._simulateExecution = () => {
                    setTimeout(() => {
                        mockProcess.stdout.emit('data', '');
                        mockProcess.emit('close', 0);
                    }, 10);
                };
                
                return mockProcess;
            });

            await readFinderTags(testFilePath);
            
            expect(commandArgs).toEqual(['--list', '--no-name', testFilePath]);
        });
    });

    describe('writeFinderTags', () => {
        it('correctly applies a list of tags to a file', async () => {
            const tagsToSet = ['Work', 'Important', 'Project'];
            let tagArgs = [];

            mockSpawn.mockImplementation((command, args, options) => {
                const tagPath = process.env.TAG_PATH || '/opt/homebrew/bin/tag';
                if (command === tagPath) {
                    tagArgs = args;
                    const mockProcess = new MockSpawn(command, args, options);
                    
                    mockProcess._simulateExecution = () => {
                        setTimeout(() => {
                            mockProcess.emit('close', 0);
                        }, 10);
                    };
                    
                    return mockProcess;
                }
                return new MockSpawn(command, args, options);
            });

            const result = await writeFinderTags(testFilePath, tagsToSet);
            
            expect(result).toBe(true);
            expect(tagArgs).toEqual(['--set', 'Work,Important,Project', testFilePath]);
        });

        it('can clear existing tags from a file', async () => {
            const emptyTags = [];
            let tagCalled = false;

            mockSpawn.mockImplementation((command, args, options) => {
                const tagPath = process.env.TAG_PATH || '/opt/homebrew/bin/tag';
                if (command === tagPath) {
                    tagCalled = true;
                    const mockProcess = new MockSpawn(command, args, options);
                    
                    mockProcess._simulateExecution = () => {
                        setTimeout(() => {
                            mockProcess.emit('close', 0);
                        }, 10);
                    };
                    
                    return mockProcess;
                }
                return new MockSpawn(command, args, options);
            });

            const result = await writeFinderTags(testFilePath, emptyTags);
            
            expect(result).toBe(true);
            expect(tagCalled).toBe(true);
        });

        it('rejects when tag command fails', async () => {
            mockSpawn.mockImplementation((command, args, options) => {
                const tagPath = process.env.TAG_PATH || '/opt/homebrew/bin/tag';
                if (command === tagPath) {
                    const mockProcess = new MockSpawn(command, args, options);
                    
                    mockProcess._simulateExecution = () => {
                        setTimeout(() => {
                            mockProcess.emit('close', 1); // tag command failed
                        }, 10);
                    };
                    
                    return mockProcess;
                }
                return new MockSpawn(command, args, options);
            });

            await expect(writeFinderTags(testFilePath, ['tag1']))
                .rejects.toThrow('tag command failed');
        });


        it('handles empty tag array correctly', async () => {
            let tagArgs = [];
            
            mockSpawn.mockImplementation((command, args, options) => {
                const tagPath = process.env.TAG_PATH || '/opt/homebrew/bin/tag';
                if (command === tagPath) {
                    tagArgs = args;
                    const mockProcess = new MockSpawn(command, args, options);
                    
                    mockProcess._simulateExecution = () => {
                        setTimeout(() => {
                            mockProcess.emit('close', 0);
                        }, 10);
                    };
                    
                    return mockProcess;
                }
                // Fallback to prevent undefined
                return new MockSpawn(command, args, options);
            });

            const result = await writeFinderTags(testFilePath, []);
            
            expect(result).toBe(true);
            // Should call tag with --set and empty string for tags
            expect(tagArgs).toEqual(['--set', '', testFilePath]);
        });
    });
});