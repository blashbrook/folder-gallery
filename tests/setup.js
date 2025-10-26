// Global test setup
const path = require('path');
const fs = require('fs').promises;

// Create temp directory for tests
global.TEST_TEMP_DIR = path.join(__dirname, 'temp');

beforeEach(async () => {
  // Create temp directory
  await fs.mkdir(global.TEST_TEMP_DIR, { recursive: true });
});

afterEach(async () => {
  // Clean up temp directory
  try {
    await fs.rm(global.TEST_TEMP_DIR, { recursive: true, force: true });
  } catch (err) {
    // Ignore cleanup errors
  }
});

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn()
};