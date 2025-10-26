// Global test setup
const path = require('path');
const fs = require('fs').promises;

// Create a unique temp directory for each test to avoid cross-test conflicts
beforeEach(async () => {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  global.TEST_TEMP_DIR = path.join(__dirname, 'temp', unique);
  await fs.mkdir(global.TEST_TEMP_DIR, { recursive: true });
});

afterEach(async () => {
  // Clean up temp directory
  try {
    if (global.TEST_TEMP_DIR) {
      await fs.rm(global.TEST_TEMP_DIR, { recursive: true, force: true });
    }
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