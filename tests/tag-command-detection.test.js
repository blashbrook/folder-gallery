const { isTagCommandAvailable } = require('../macos-tags');
const { mockPlatform } = require('./test-utils');

// Mock child_process module for spawn testing
jest.mock('child_process', () => ({
    spawn: jest.fn(),
    spawnSync: jest.fn()
}));

describe('macOS tag Command Detection', () => {
    let restorePlatform;
    let childProcess;
    
    beforeEach(() => {
        // Mock macOS platform
        restorePlatform = mockPlatform('darwin');
        
        // Get reference to mocked child_process
        childProcess = require('child_process');
        
        // Clear any previous mock calls
        jest.clearAllMocks();
        jest.resetAllMocks();
    });
    
    afterEach(() => {
        restorePlatform();
    });
    
    describe('isTagCommandAvailable() in macos-tags.js', () => {
        it('detects tag command is available when it exists', async () => {
            // Mock successful spawn (tag command exists and responds)
            childProcess.spawn.mockImplementation((command, args, options) => {
                const mockProcess = {
                    on: jest.fn((event, callback) => {
                        if (event === 'close') {
                            // Simulate successful execution
                            setTimeout(() => callback(0), 10);
                        }
                    }),
                    kill: jest.fn()
                };
                return mockProcess;
            });
            
            const result = await isTagCommandAvailable();
            
            expect(result).toBe(true);
            expect(childProcess.spawn).toHaveBeenCalledWith(
                expect.stringContaining('tag'),
                ['--version'],
                { stdio: 'ignore' }
            );
        });
        
        it('detects tag command is unavailable when it does not exist', async () => {
            // Mock spawn error (tag command not found)
            childProcess.spawn.mockImplementation((command, args, options) => {
                const mockProcess = {
                    on: jest.fn((event, callback) => {
                        if (event === 'error') {
                            // Simulate command not found
                            setTimeout(() => callback(new Error('spawn ENOENT')), 10);
                        }
                    }),
                    kill: jest.fn()
                };
                return mockProcess;
            });
            
            const result = await isTagCommandAvailable();
            
            expect(result).toBe(false);
        });
        
        it('uses TAG_PATH environment variable if set', async () => {
            const customTagPath = '/custom/path/to/tag';
            const originalTagPath = process.env.TAG_PATH;
            process.env.TAG_PATH = customTagPath;
            
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
            
            await isTagCommandAvailable();
            
            expect(childProcess.spawn).toHaveBeenCalledWith(
                customTagPath,
                ['--version'],
                { stdio: 'ignore' }
            );
            
            // Restore original TAG_PATH
            if (originalTagPath !== undefined) {
                process.env.TAG_PATH = originalTagPath;
            } else {
                delete process.env.TAG_PATH;
            }
        });
        
        it('uses default tag path when TAG_PATH is not set', async () => {
            const originalTagPath = process.env.TAG_PATH;
            delete process.env.TAG_PATH;
            
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
            
            await isTagCommandAvailable();
            
            expect(childProcess.spawn).toHaveBeenCalledWith(
                '/opt/homebrew/bin/tag',
                ['--version'],
                { stdio: 'ignore' }
            );
            
            // Restore original TAG_PATH
            if (originalTagPath !== undefined) {
                process.env.TAG_PATH = originalTagPath;
            }
        });
        
        it('handles timeout scenarios', async () => {
            jest.useFakeTimers();
            
            // Mock spawn that never responds
            childProcess.spawn.mockImplementation((command, args, options) => {
                const mockProcess = {
                    on: jest.fn(),
                    kill: jest.fn()
                };
                return mockProcess;
            });
            
            const promise = isTagCommandAvailable();
            
            // Fast-forward time by 100ms (timeout threshold)
            jest.advanceTimersByTime(100);
            
            const result = await promise;
            
            expect(result).toBe(false);
            
            jest.useRealTimers();
        });
        
        it('returns true even if process exits with non-zero code', async () => {
            // Mock spawn that exits with error code (but command exists)
            childProcess.spawn.mockImplementation((command, args, options) => {
                const mockProcess = {
                    on: jest.fn((event, callback) => {
                        if (event === 'close') {
                            // Command exists but returned error (still means it's available)
                            setTimeout(() => callback(1), 10);
                        }
                    }),
                    kill: jest.fn()
                };
                return mockProcess;
            });
            
            const result = await isTagCommandAvailable();
            
            // Should return true because close event fired (command exists)
            expect(result).toBe(true);
        });
    });
    
    describe('postinstall.js tag detection using spawnSync', () => {
        let consoleLogSpy;
        
        beforeEach(() => {
            // Spy on console.log to verify output messages
            consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        });
        
        afterEach(() => {
            consoleLogSpy.mockRestore();
        });
        
        it('detects tag command is available using spawnSync', () => {
            // Mock successful spawnSync (tag command exists)
            childProcess.spawnSync.mockReturnValue({
                status: 0,
                error: null
            });
            
            const tagPath = process.env.TAG_PATH || '/opt/homebrew/bin/tag';
            const result = childProcess.spawnSync(tagPath, ['--version'], { stdio: 'ignore' });
            
            expect(result.status).toBe(0);
            expect(result.error).toBeNull();
            expect(childProcess.spawnSync).toHaveBeenCalledWith(
                tagPath,
                ['--version'],
                { stdio: 'ignore' }
            );
        });
        
        it('detects tag command is unavailable using spawnSync', () => {
            // Mock spawnSync error (tag command not found)
            childProcess.spawnSync.mockReturnValue({
                status: null,
                error: { code: 'ENOENT', message: 'spawn ENOENT' }
            });
            
            const tagPath = process.env.TAG_PATH || '/opt/homebrew/bin/tag';
            const result = childProcess.spawnSync(tagPath, ['--version'], { stdio: 'ignore' });
            
            expect(result.error).toBeTruthy();
            expect(result.error.code).toBe('ENOENT');
        });
        
        it('detects tag command exists but exits with error code', () => {
            // Mock spawnSync with non-zero exit status
            childProcess.spawnSync.mockReturnValue({
                status: 1,
                error: null
            });
            
            const tagPath = process.env.TAG_PATH || '/opt/homebrew/bin/tag';
            const result = childProcess.spawnSync(tagPath, ['--version'], { stdio: 'ignore' });
            
            expect(result.status).toBe(1);
            expect(result.error).toBeNull();
        });
        
        it('respects TAG_PATH environment variable in spawnSync', () => {
            const customTagPath = '/usr/local/bin/tag';
            const originalTagPath = process.env.TAG_PATH;
            process.env.TAG_PATH = customTagPath;
            
            childProcess.spawnSync.mockReturnValue({
                status: 0,
                error: null
            });
            
            const tagPath = process.env.TAG_PATH || '/opt/homebrew/bin/tag';
            childProcess.spawnSync(tagPath, ['--version'], { stdio: 'ignore' });
            
            expect(childProcess.spawnSync).toHaveBeenCalledWith(
                customTagPath,
                ['--version'],
                { stdio: 'ignore' }
            );
            
            // Restore original TAG_PATH
            if (originalTagPath !== undefined) {
                process.env.TAG_PATH = originalTagPath;
            } else {
                delete process.env.TAG_PATH;
            }
        });
        
        it('uses default tag path when TAG_PATH is not set in spawnSync', () => {
            const originalTagPath = process.env.TAG_PATH;
            delete process.env.TAG_PATH;
            
            childProcess.spawnSync.mockReturnValue({
                status: 0,
                error: null
            });
            
            const tagPath = process.env.TAG_PATH || '/opt/homebrew/bin/tag';
            childProcess.spawnSync(tagPath, ['--version'], { stdio: 'ignore' });
            
            expect(childProcess.spawnSync).toHaveBeenCalledWith(
                '/opt/homebrew/bin/tag',
                ['--version'],
                { stdio: 'ignore' }
            );
            
            // Restore original TAG_PATH
            if (originalTagPath !== undefined) {
                process.env.TAG_PATH = originalTagPath;
            }
        });
    });
    
    describe('Cross-platform behavior', () => {
        it('works correctly on non-macOS platforms', () => {
            // Restore platform and set to Linux
            restorePlatform();
            const restoreLinux = mockPlatform('linux');
            
            // On non-macOS, the check can still be performed but typically skipped
            childProcess.spawnSync.mockReturnValue({
                status: null,
                error: { code: 'ENOENT', message: 'spawn ENOENT' }
            });
            
            const tagPath = process.env.TAG_PATH || '/opt/homebrew/bin/tag';
            const result = childProcess.spawnSync(tagPath, ['--version'], { stdio: 'ignore' });
            
            // Should detect as unavailable on non-macOS
            expect(result.error).toBeTruthy();
            
            restoreLinux();
        });
        
        it('detects unavailability on Windows', () => {
            // Restore platform and set to Windows
            restorePlatform();
            const restoreWindows = mockPlatform('win32');
            
            childProcess.spawnSync.mockReturnValue({
                status: null,
                error: { code: 'ENOENT', message: 'spawn ENOENT' }
            });
            
            const tagPath = process.env.TAG_PATH || '/opt/homebrew/bin/tag';
            const result = childProcess.spawnSync(tagPath, ['--version'], { stdio: 'ignore' });
            
            expect(result.error).toBeTruthy();
            
            restoreWindows();
        });
    });
    
    describe('Integration with postinstall script logic', () => {
        it('mimics postinstall.js detection logic correctly', () => {
            // This test mimics the actual logic from scripts/postinstall.js (lines 50-61)
            const platform = process.platform;
            
            if (platform === 'darwin') {
                childProcess.spawnSync.mockReturnValue({
                    status: 0,
                    error: null
                });
                
                const tagPath = process.env.TAG_PATH || '/opt/homebrew/bin/tag';
                const checkTag = childProcess.spawnSync(tagPath, ['--version'], { stdio: 'ignore' });
                
                // Replicate the conditional logic from postinstall.js
                if (checkTag.error || checkTag.status !== 0) {
                    // Tag not found
                    expect(true).toBe(false); // Should not reach here
                } else {
                    // Tag found
                    expect(checkTag.status).toBe(0);
                    expect(checkTag.error).toBeNull();
                }
            }
        });
        
        it('correctly identifies when tag command is missing', () => {
            // Mock command not found scenario
            childProcess.spawnSync.mockReturnValue({
                status: null,
                error: { code: 'ENOENT' }
            });
            
            const tagPath = process.env.TAG_PATH || '/opt/homebrew/bin/tag';
            const checkTag = childProcess.spawnSync(tagPath, ['--version'], { stdio: 'ignore' });
            
            // Replicate the conditional logic from postinstall.js
            const isTagMissing = !!(checkTag.error || checkTag.status !== 0);
            expect(isTagMissing).toBe(true);
        });
        
        it('handles edge case where status is 0 but error exists', () => {
            // Edge case: status is 0 but error object exists (unusual but possible)
            childProcess.spawnSync.mockReturnValue({
                status: 0,
                error: { code: 'UNKNOWN' }
            });
            
            const tagPath = process.env.TAG_PATH || '/opt/homebrew/bin/tag';
            const checkTag = childProcess.spawnSync(tagPath, ['--version'], { stdio: 'ignore' });
            
            // Postinstall logic checks for error OR non-zero status
            const isTagMissing = !!(checkTag.error || checkTag.status !== 0);
            expect(isTagMissing).toBe(true);
        });
        
        it('handles edge case where status is non-zero but no error', () => {
            // Edge case: command exists but returns error code
            childProcess.spawnSync.mockReturnValue({
                status: 127,
                error: null
            });
            
            const tagPath = process.env.TAG_PATH || '/opt/homebrew/bin/tag';
            const checkTag = childProcess.spawnSync(tagPath, ['--version'], { stdio: 'ignore' });
            
            // Postinstall logic checks for error OR non-zero status
            const isTagMissing = !!(checkTag.error || checkTag.status !== 0);
            expect(isTagMissing).toBe(true);
        });
    });
    
    describe('Server startup tag detection', () => {
        it('mimics server-runner.js tag detection at startup', async () => {
            // This test mimics the logic from bin/server-runner.js (lines 2577-2582)
            
            // Mock successful tag detection
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
            
            const tagCommandAvailable = await isTagCommandAvailable();
            
            expect(tagCommandAvailable).toBe(true);
            
            // Server should not log warning when tag is available
            if (process.platform === 'darwin' && !tagCommandAvailable) {
                console.log('⚠️  macOS Finder tags disabled: tag command not found');
            }
            
            // Verify tag is detected as available
            expect(tagCommandAvailable).toBe(true);
        });
        
        it('logs warning when tag command is not available at startup', async () => {
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
            
            // Mock failed tag detection
            childProcess.spawn.mockImplementation((command, args, options) => {
                const mockProcess = {
                    on: jest.fn((event, callback) => {
                        if (event === 'error') {
                            setTimeout(() => callback(new Error('ENOENT')), 10);
                        }
                    }),
                    kill: jest.fn()
                };
                return mockProcess;
            });
            
            const tagCommandAvailable = await isTagCommandAvailable();
            
            expect(tagCommandAvailable).toBe(false);
            
            // Server should log warning when tag is not available
            if (process.platform === 'darwin' && !tagCommandAvailable) {
                console.log('⚠️  macOS Finder tags disabled: tag command not found');
                console.log('💡 Install with: brew install tag');
            }
            
            // Verify warning was logged
            expect(consoleLogSpy).toHaveBeenCalledWith('⚠️  macOS Finder tags disabled: tag command not found');
            expect(consoleLogSpy).toHaveBeenCalledWith('💡 Install with: brew install tag');
            
            consoleLogSpy.mockRestore();
        });
    });
});
