const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs').promises;

/**
 * Mock child_process.spawn for testing
 */
class MockSpawn extends EventEmitter {
    constructor(command, args, options) {
        super();
        this.command = command;
        this.args = args;
        this.options = options;
        this.pid = Math.floor(Math.random() * 10000) + 1000; // Random PID
        this.stdout = new EventEmitter();
        this.stderr = new EventEmitter();
        this.stdin = {
            write: jest.fn(),
            end: jest.fn()
        };
        this.unref = jest.fn(); // Add unref method
        
        // Auto-emit events after next tick to simulate async behavior
        process.nextTick(() => this._simulateExecution());
    }
    
    _simulateExecution() {
        // This will be overridden by individual test mocks
        this.emit('close', 0);
    }
}

/**
 * Create mock spawn function with configurable behavior
 */
function createMockSpawn() {
    return jest.fn((command, args, options) => {
        return new MockSpawn(command, args, options);
    });
}

/**
 * Create a temporary test file
 */
async function createTestFile(filename, content = 'test content') {
    const filePath = path.join(global.TEST_TEMP_DIR, filename);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
    return filePath;
}

/**
 * Create a test image file (empty but with correct extension)
 */
async function createTestImageFile(filename = 'test-image.jpg') {
    return createTestFile(filename, Buffer.from('fake-image-data'));
}

/**
 * Mock platform detection
 */
function mockPlatform(platform) {
    const originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', {
        value: platform,
        writable: false,
        configurable: true
    });
    return () => {
        Object.defineProperty(process, 'platform', {
            value: originalPlatform,
            writable: false,
            configurable: true
        });
    };
}

/**
 * Wait for a specified number of milliseconds
 */
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    MockSpawn,
    createMockSpawn,
    createTestFile,
    createTestImageFile,
    mockPlatform,
    wait
};