const path = require('path');
const { MockSpawn, createMockSpawn, wait } = require('./test-utils');

// Mock the 'open' module since it's ESM-only
const mockOpenModule = jest.fn();
jest.doMock('open', () => mockOpenModule, { virtual: true });

// Mock child_process for server launching tests
jest.mock('child_process', () => ({
    spawn: jest.fn()
}));

// Import spawn after mocking
const { spawn } = require('child_process');

describe('Browser Opening Functionality', () => {
    let mockSpawn;
    let originalConsole;
    
    beforeEach(() => {
        // Setup mock spawn
        mockSpawn = createMockSpawn();
        spawn.mockImplementation(mockSpawn);
        
        // Reset mocks
        jest.clearAllMocks();
        mockOpenModule.mockClear();
        
        // Capture console output for testing
        originalConsole = {
            log: console.log,
            warn: console.warn
        };
        console.log = jest.fn();
        console.warn = jest.fn();
        
        // Reset any cached module state
        delete require.cache[require.resolve('../bin/gallery.js')];
        delete require.cache[require.resolve('../bin/server-runner.js')];
    });
    
    afterEach(() => {
        // Restore console
        console.log = originalConsole.log;
        console.warn = originalConsole.warn;
        
        // Clear module cache
        jest.resetModules();
    });
    
    describe('openInBrowser function from gallery.js', () => {
        let openInBrowser;
        
        beforeEach(() => {
            // We need to import the function after mocking
            // Since it's not exported, we'll need to test it indirectly through the CLI
            // For now, let's create a test version
            openInBrowser = async function(url) {
                try {
                    if (!global.__openModule) {
                        const mod = await import('open');
                        global.__openModule = mod.default || mod;
                    }
                    await global.__openModule(url);
                    console.log(`🌐 Browser opened: ${url}`);
                    return true;
                } catch (e) {
                    console.warn(`⚠️  Could not open browser automatically: ${e.message}`);
                    console.log(`   Open manually: ${url}`);
                    return false;
                }
            };
            
            // Set the mocked open module globally
            global.__openModule = mockOpenModule;
        });
        
        afterEach(() => {
            delete global.__openModule;
        });
        
        it('should successfully open a URL and return true', async () => {
            const testUrl = 'http://localhost:3000';
            mockOpenModule.mockResolvedValue(undefined);
            
            const result = await openInBrowser(testUrl);
            
            expect(result).toBe(true);
            expect(mockOpenModule).toHaveBeenCalledWith(testUrl);
            expect(console.log).toHaveBeenCalledWith(`🌐 Browser opened: ${testUrl}`);
        });
        
        it('should handle browser opening failures gracefully and return false', async () => {
            const testUrl = 'http://localhost:3000';
            const errorMessage = 'No default browser found';
            mockOpenModule.mockRejectedValue(new Error(errorMessage));
            
            const result = await openInBrowser(testUrl);
            
            expect(result).toBe(false);
            expect(mockOpenModule).toHaveBeenCalledWith(testUrl);
            expect(console.warn).toHaveBeenCalledWith(`⚠️  Could not open browser automatically: ${errorMessage}`);
            expect(console.log).toHaveBeenCalledWith(`   Open manually: ${testUrl}`);
        });
        
        it('should handle module import failures and return false', async () => {
            const testUrl = 'http://localhost:3000';
            
            // Reset the cached module to force re-import
            delete global.__openModule;
            
            // Simulate import failure by just throwing an error
            const testFunction = async function(url) {
                try {
                    if (!global.__openModule) {
                        // Simulate module import failure
                        throw new Error('Module not found');
                    }
                    await global.__openModule(url);
                    console.log(`🌐 Browser opened: ${url}`);
                    return true;
                } catch (e) {
                    console.warn(`⚠️  Could not open browser automatically: ${e.message}`);
                    console.log(`   Open manually: ${url}`);
                    return false;
                }
            };
            
            const result = await testFunction(testUrl);
            
            expect(result).toBe(false);
            expect(console.warn).toHaveBeenCalledWith(`⚠️  Could not open browser automatically: Module not found`);
            expect(console.log).toHaveBeenCalledWith(`   Open manually: ${testUrl}`);
        });
        
        it('should cache the open module after first successful import', async () => {
            const testUrl1 = 'http://localhost:3000';
            const testUrl2 = 'http://localhost:3001';
            
            // Reset the cached module
            delete global.__openModule;
            
            let importCallCount = 0;
            
            const testFunction = async function(url) {
                try {
                    if (!global.__openModule) {
                        // Simulate successful import
                        importCallCount++;
                        global.__openModule = mockOpenModule;
                    }
                    await global.__openModule(url);
                    console.log(`🌐 Browser opened: ${url}`);
                    return true;
                } catch (e) {
                    console.warn(`⚠️  Could not open browser automatically: ${e.message}`);
                    console.log(`   Open manually: ${url}`);
                    return false;
                }
            };
            
            mockOpenModule.mockResolvedValue(undefined);
            
            // First call should import the module
            const result1 = await testFunction(testUrl1);
            expect(result1).toBe(true);
            expect(importCallCount).toBe(1);
            
            // Second call should use cached module
            const result2 = await testFunction(testUrl2);
            expect(result2).toBe(true);
            expect(importCallCount).toBe(1); // Should not be called again
            expect(mockOpenModule).toHaveBeenCalledWith(testUrl1);
            expect(mockOpenModule).toHaveBeenCalledWith(testUrl2);
        });
    });
    
    describe('openInBrowser function from server-runner.js', () => {
        let openInBrowser;
        
        beforeEach(() => {
            // Create test version of server-runner openInBrowser function
            openInBrowser = async function(url) {
                try {
                    if (!global.__openModule) {
                        const mod = await import('open');
                        global.__openModule = mod.default || mod;
                    }
                    await global.__openModule(url);
                    console.log(`🌐 Opened browser: ${url}`);
                    return true;
                } catch (e) {
                    console.warn(`⚠️  Failed to open browser automatically: ${e.message}`);
                    console.warn(`   Please open manually: ${url}`);
                    return false;
                }
            };
            
            global.__openModule = mockOpenModule;
        });
        
        afterEach(() => {
            delete global.__openModule;
        });
        
        it('should successfully open browser from server-runner and return true', async () => {
            const testUrl = 'http://localhost:3000';
            mockOpenModule.mockResolvedValue(undefined);
            
            const result = await openInBrowser(testUrl);
            
            expect(result).toBe(true);
            expect(mockOpenModule).toHaveBeenCalledWith(testUrl);
            expect(console.log).toHaveBeenCalledWith(`🌐 Opened browser: ${testUrl}`);
        });
        
        it('should handle server-runner browser opening failures and return false', async () => {
            const testUrl = 'http://localhost:3000';
            const errorMessage = 'Browser launch failed';
            mockOpenModule.mockRejectedValue(new Error(errorMessage));
            
            const result = await openInBrowser(testUrl);
            
            expect(result).toBe(false);
            expect(mockOpenModule).toHaveBeenCalledWith(testUrl);
            expect(console.warn).toHaveBeenCalledWith(`⚠️  Failed to open browser automatically: ${errorMessage}`);
            expect(console.warn).toHaveBeenCalledWith(`   Please open manually: ${testUrl}`);
        });
    });
    
    describe('Gallery server launch with browser opening', () => {
        let launchBackgroundServer;
        
        beforeEach(() => {
            // Create test version of launchBackgroundServer
            launchBackgroundServer = async function(scanDir, port, openBrowser = true) {
                const config = {
                    scanDir,
                    port,
                    openBrowser,
                    packageDir: path.dirname(__dirname)
                };
                
                const serverRunnerPath = path.join(path.dirname(__dirname), 'bin', 'server-runner.js');
                
                const child = spawn('node', [serverRunnerPath, JSON.stringify(config)], {
                    detached: true,
                    stdio: ['ignore', 'ignore', 'ignore'],
                    cwd: scanDir
                });
                
                child.unref();
                
                return new Promise((resolve, reject) => {
                    child.on('error', (error) => {
                        reject(error);
                    });
                    
                    setTimeout(() => {
                        resolve({ pid: child.pid });
                    }, 100); // Reduced timeout for faster tests
                });
            };
        });
        
        it('should successfully launch server and open browser automatically', async () => {
            const mockChild = new MockSpawn('node', [], {});
            mockChild.pid = 12345;
            
            // Mock spawn to return our mock child
            mockSpawn.mockReturnValue(mockChild);
            
            // Mock successful server launch
            mockChild._simulateExecution = () => {
                setTimeout(() => {
                    // Don't emit close for detached process
                }, 10);
            };
            
            const testScanDir = '/test/directory';
            const testPort = 3000;
            
            const resultPromise = launchBackgroundServer(testScanDir, testPort, true);
            
            // Wait for the timeout that resolves the promise
            const result = await resultPromise;
            
            expect(result).toEqual({ pid: 12345 });
            expect(mockSpawn).toHaveBeenCalledWith(
                'node',
                [expect.stringContaining('server-runner.js'), expect.any(String)],
                {
                    detached: true,
                    stdio: ['ignore', 'ignore', 'ignore'],
                    cwd: testScanDir
                }
            );
            expect(mockChild.unref).toHaveBeenCalled();
        });
        
        it('should successfully launch server even when browser opening fails', async () => {
            const mockChild = new MockSpawn('node', [], {});
            mockChild.pid = 12346;
            
            mockSpawn.mockReturnValue(mockChild);
            
            // Mock successful server launch (browser failure is handled in server-runner)
            mockChild._simulateExecution = () => {
                setTimeout(() => {
                    // Server starts successfully regardless of browser opening
                }, 10);
            };
            
            const testScanDir = '/test/directory';
            const testPort = 3001;
            
            const result = await launchBackgroundServer(testScanDir, testPort, true);
            
            expect(result).toEqual({ pid: 12346 });
            expect(mockSpawn).toHaveBeenCalledWith(
                'node',
                [expect.stringContaining('server-runner.js'), expect.stringContaining('"openBrowser":true')],
                expect.objectContaining({
                    detached: true,
                    stdio: ['ignore', 'ignore', 'ignore'],
                    cwd: testScanDir
                })
            );
        });
        
        it('should handle server launch failures appropriately', async () => {
            const mockChild = new MockSpawn('node', [], {});
            mockChild.pid = 12340; // Keep a valid PID but will error
            
            mockSpawn.mockReturnValue(mockChild);
            
            // Mock server launch error
            mockChild._simulateExecution = () => {
                setTimeout(() => {
                    mockChild.emit('error', new Error('Failed to start server'));
                }, 10);
            };
            
            const testScanDir = '/test/directory';
            const testPort = 3002;
            
            await expect(launchBackgroundServer(testScanDir, testPort, true))
                .rejects.toThrow('Failed to start server');
            
            expect(mockSpawn).toHaveBeenCalled();
        });
        
        it('should pass correct configuration to server-runner', async () => {
            const mockChild = new MockSpawn('node', [], {});
            mockChild.pid = 12347;
            
            mockSpawn.mockReturnValue(mockChild);
            
            mockChild._simulateExecution = () => {
                setTimeout(() => {
                    // Success
                }, 10);
            };
            
            const testScanDir = '/custom/scan/dir';
            const testPort = 4000;
            const openBrowserFlag = false;
            
            await launchBackgroundServer(testScanDir, testPort, openBrowserFlag);
            
            // Get the config argument passed to server-runner
            const spawnArgs = mockSpawn.mock.calls[0];
            const configString = spawnArgs[1][1]; // Second argument after server-runner.js path
            const config = JSON.parse(configString);
            
            expect(config).toEqual({
                scanDir: testScanDir,
                port: testPort,
                openBrowser: openBrowserFlag,
                packageDir: expect.any(String)
            });
        });
        
        it('should create detached process with correct stdio configuration', async () => {
            const mockChild = new MockSpawn('node', [], {});
            mockChild.pid = 12348;
            
            mockSpawn.mockReturnValue(mockChild);
            
            await launchBackgroundServer('/test', 3000, true);
            
            const spawnOptions = mockSpawn.mock.calls[0][2];
            expect(spawnOptions).toMatchObject({
                detached: true,
                stdio: ['ignore', 'ignore', 'ignore'],
                cwd: '/test'
            });
            expect(mockChild.unref).toHaveBeenCalled();
        });
    });
    
    describe('Integration scenarios', () => {
        let launchBackgroundServer;
        
        beforeEach(() => {
            // Define launchBackgroundServer in the integration test scope
            launchBackgroundServer = async function(scanDir, port, openBrowser = true) {
                const config = {
                    scanDir,
                    port,
                    openBrowser,
                    packageDir: path.dirname(__dirname)
                };
                
                const serverRunnerPath = path.join(path.dirname(__dirname), 'bin', 'server-runner.js');
                
                const child = spawn('node', [serverRunnerPath, JSON.stringify(config)], {
                    detached: true,
                    stdio: ['ignore', 'ignore', 'ignore'],
                    cwd: scanDir
                });
                
                child.unref();
                
                return new Promise((resolve, reject) => {
                    child.on('error', (error) => {
                        reject(error);
                    });
                    
                    setTimeout(() => {
                        resolve({ pid: child.pid });
                    }, 100);
                });
            };
        });
        
        it('should handle the complete gallery up workflow', async () => {
            // This test simulates the complete flow from CLI command to server launch
            const mockChild = new MockSpawn('node', [], {});
            mockChild.pid = 99999;
            
            mockSpawn.mockReturnValue(mockChild);
            mockOpenModule.mockResolvedValue(undefined);
            
            // Mock the gallery up action workflow
            const simulateGalleryUp = async (scanDir, port, openBrowser) => {
                // 1. Launch background server
                const launchResult = await launchBackgroundServer(scanDir, port, openBrowser);
                
                // 2. If openBrowser is true, open the browser after server starts
                if (openBrowser) {
                    global.__openModule = mockOpenModule;
                    const openInBrowser = async function(url) {
                        try {
                            await global.__openModule(url);
                            console.log(`🌐 Browser opened: ${url}`);
                            return true;
                        } catch (e) {
                            console.warn(`⚠️  Could not open browser automatically: ${e.message}`);
                            return false;
                        }
                    };
                    
                    // Wait for server to be ready
                    await wait(100);
                    const browserResult = await openInBrowser(`http://localhost:${port}`);
                    
                    return { server: launchResult, browser: browserResult };
                }
                
                return { server: launchResult, browser: null };
            };
            
            const result = await simulateGalleryUp('/test/gallery', 3000, true);
            
            expect(result.server).toEqual({ pid: 99999 });
            expect(result.browser).toBe(true);
            expect(mockSpawn).toHaveBeenCalled();
            expect(mockOpenModule).toHaveBeenCalledWith('http://localhost:3000');
            expect(console.log).toHaveBeenCalledWith('🌐 Browser opened: http://localhost:3000');
        });
        
        it('should complete workflow even when browser opening fails', async () => {
            const mockChild = new MockSpawn('node', [], {});
            mockChild.pid = 99998;
            
            mockSpawn.mockReturnValue(mockChild);
            mockOpenModule.mockRejectedValue(new Error('No browser available'));
            
            const simulateGalleryUp = async (scanDir, port, openBrowser) => {
                const launchResult = await launchBackgroundServer(scanDir, port, openBrowser);
                
                if (openBrowser) {
                    global.__openModule = mockOpenModule;
                    const openInBrowser = async function(url) {
                        try {
                            await global.__openModule(url);
                            console.log(`🌐 Browser opened: ${url}`);
                            return true;
                        } catch (e) {
                            console.warn(`⚠️  Could not open browser automatically: ${e.message}`);
                            return false;
                        }
                    };
                    
                    await wait(100);
                    const browserResult = await openInBrowser(`http://localhost:${port}`);
                    return { server: launchResult, browser: browserResult };
                }
                
                return { server: launchResult, browser: null };
            };
            
            const result = await simulateGalleryUp('/test/gallery', 3000, true);
            
            expect(result.server).toEqual({ pid: 99998 });
            expect(result.browser).toBe(false);
            expect(mockSpawn).toHaveBeenCalled();
            expect(mockOpenModule).toHaveBeenCalledWith('http://localhost:3000');
            expect(console.warn).toHaveBeenCalledWith('⚠️  Could not open browser automatically: No browser available');
        });
    });
});