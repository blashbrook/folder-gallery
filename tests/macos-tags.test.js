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
                        // Simulate Python script output with tags
                        mockProcess.stdout.emit('data', 'Work\nPersonal\nImportant\n');
                        mockProcess.emit('close', 0);
                    }, 10);
                };
                
                return mockProcess;
            });

            const tags = await readFinderTags(testFilePath);
            
            expect(tags).toEqual(['Work', 'Personal', 'Important']);
            expect(mockSpawn).toHaveBeenCalledWith('python3', ['-'], { stdio: ['pipe', 'pipe', 'ignore'] });
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
            // Mock tag response with whitespace and empty lines
            mockSpawn.mockImplementation((command, args, options) => {
                const mockProcess = new MockSpawn(command, args, options);
                
                mockProcess._simulateExecution = () => {
                    setTimeout(() => {
                        // Simulate messy output with whitespace
                        mockProcess.stdout.emit('data', '  Work  \n\nPersonal\n  \n Important\n\n');
                        mockProcess.emit('close', 0);
                    }, 10);
                };
                
                return mockProcess;
            });

            const tags = await readFinderTags(testFilePath);
            
            expect(tags).toEqual(['Work', 'Personal', 'Important']);
        });

        it('writes correct Python code to stdin', async () => {
            let stdinContent = '';
            
            mockSpawn.mockImplementation((command, args, options) => {
                const mockProcess = new MockSpawn(command, args, options);
                
                mockProcess.stdin.write = jest.fn((data) => {
                    stdinContent += data;
                });
                
                mockProcess.stdin.end = jest.fn((data) => {
                    if (data) stdinContent += data;
                });
                
                mockProcess._simulateExecution = () => {
                    setTimeout(() => {
                        mockProcess.stdout.emit('data', '');
                        mockProcess.emit('close', 0);
                    }, 10);
                };
                
                return mockProcess;
            });

            await readFinderTags(testFilePath);
            
            expect(stdinContent).toContain('import sys, plistlib, subprocess');
            expect(stdinContent).toContain('/usr/bin/xattr');
            expect(stdinContent).toContain('com.apple.metadata:_kMDItemUserTags');
            expect(stdinContent).toContain(testFilePath);
        });
    });

    describe('writeFinderTags', () => {
        it('correctly applies a list of tags to a file', async () => {
            const tagsToSet = ['Work', 'Important', 'Project'];
            let xattrCalled = false;
            let encodedHex = '';

            // Mock the two-stage process: Python encoding then xattr setting
            mockSpawn.mockImplementation((command, args, options) => {
                if (command === 'python3' && args[0] === '-c') {
                    // First call: Python encoding
                    const mockProcess = new MockSpawn(command, args, options);
                    
                    mockProcess._simulateExecution = () => {
                        setTimeout(() => {
                            // Simulate hex-encoded plist output
                            const mockHex = '62706c69737430303030303030';
                            mockProcess.stdout.emit('data', mockHex + '\n');
                            mockProcess.emit('close', 0);
                        }, 10);
                    };
                    
                    return mockProcess;
                } else if (command === '/usr/bin/xattr') {
                    // Second call: xattr setting
                    xattrCalled = true;
                    encodedHex = args[2]; // The hex value passed to xattr
                    
                    const mockProcess = new MockSpawn(command, args, options);
                    
                    mockProcess._simulateExecution = () => {
                        setTimeout(() => {
                            mockProcess.emit('close', 0); // Success
                        }, 10);
                    };
                    
                    return mockProcess;
                }
            });

            const result = await writeFinderTags(testFilePath, tagsToSet);
            
            expect(result).toBe(true);
            expect(xattrCalled).toBe(true);
            expect(encodedHex).toBe('62706c69737430303030303030');
            
            // Check that python was called with correct tags
            const pythonCall = mockSpawn.mock.calls.find(call => call[0] === 'python3');
            expect(pythonCall[1]).toContain('Work');
            expect(pythonCall[1]).toContain('Important');
            expect(pythonCall[1]).toContain('Project');
            
            // Check that xattr was called with correct parameters
            const xattrCall = mockSpawn.mock.calls.find(call => call[0] === '/usr/bin/xattr');
            expect(xattrCall[1]).toContain('-wx');
            expect(xattrCall[1]).toContain('com.apple.metadata:_kMDItemUserTags');
            expect(xattrCall[1]).toContain(testFilePath);
        });

        it('can clear existing tags from a file', async () => {
            const emptyTags = [];
            let xattrCalled = false;

            mockSpawn.mockImplementation((command, args, options) => {
                if (command === 'python3') {
                    const mockProcess = new MockSpawn(command, args, options);
                    
                    mockProcess._simulateExecution = () => {
                        setTimeout(() => {
                            // Simulate hex for empty array
                            mockProcess.stdout.emit('data', '62706c697374303000000000\n');
                            mockProcess.emit('close', 0);
                        }, 10);
                    };
                    
                    return mockProcess;
                } else if (command === '/usr/bin/xattr') {
                    xattrCalled = true;
                    
                    const mockProcess = new MockSpawn(command, args, options);
                    
                    mockProcess._simulateExecution = () => {
                        setTimeout(() => {
                            mockProcess.emit('close', 0);
                        }, 10);
                    };
                    
                    return mockProcess;
                }
            });

            const result = await writeFinderTags(testFilePath, emptyTags);
            
            expect(result).toBe(true);
            expect(xattrCalled).toBe(true);
        });

        it('rejects when Python encoding fails', async () => {
            mockSpawn.mockImplementation((command, args, options) => {
                if (command === 'python3') {
                    const mockProcess = new MockSpawn(command, args, options);
                    
                    mockProcess._simulateExecution = () => {
                        setTimeout(() => {
                            // Simulate no output (encoding failure)
                            mockProcess.stdout.emit('data', '');
                            mockProcess.emit('close', 1);
                        }, 10);
                    };
                    
                    return mockProcess;
                }
            });

            await expect(writeFinderTags(testFilePath, ['tag1']))
                .rejects.toThrow('Failed to encode tags');
        });

        it('rejects when xattr command fails', async () => {
            mockSpawn.mockImplementation((command, args, options) => {
                if (command === 'python3') {
                    const mockProcess = new MockSpawn(command, args, options);
                    
                    mockProcess._simulateExecution = () => {
                        setTimeout(() => {
                            mockProcess.stdout.emit('data', '62706c69737430303030303030\n');
                            mockProcess.emit('close', 0);
                        }, 10);
                    };
                    
                    return mockProcess;
                } else if (command === '/usr/bin/xattr') {
                    const mockProcess = new MockSpawn(command, args, options);
                    
                    mockProcess._simulateExecution = () => {
                        setTimeout(() => {
                            mockProcess.emit('close', 1); // xattr failure
                        }, 10);
                    };
                    
                    return mockProcess;
                }
            });

            await expect(writeFinderTags(testFilePath, ['tag1']))
                .rejects.toThrow('xattr failed');
        });

        it('handles empty tag array correctly', async () => {
            let pythonArgs = [];
            
            mockSpawn.mockImplementation((command, args, options) => {
                if (command === 'python3') {
                    pythonArgs = args;
                    const mockProcess = new MockSpawn(command, args, options);
                    
                    mockProcess._simulateExecution = () => {
                        setTimeout(() => {
                            mockProcess.stdout.emit('data', '62706c697374303000000000\n');
                            mockProcess.emit('close', 0);
                        }, 10);
                    };
                    
                    return mockProcess;
                } else if (command === '/usr/bin/xattr') {
                    const mockProcess = new MockSpawn(command, args, options);
                    
                    mockProcess._simulateExecution = () => {
                        setTimeout(() => {
                            mockProcess.emit('close', 0);
                        }, 10);
                    };
                    
                    return mockProcess;
                }
            });

            const result = await writeFinderTags(testFilePath, []);
            
            expect(result).toBe(true);
            // Should call python with empty tag list (just the empty string at the end)
            expect(pythonArgs[pythonArgs.length - 1]).toBe('');
        });
    });
});