const path = require('path');
const fsSync = require('fs');
const fs = fsSync.promises;
const os = require('os');

// Mock commander to prevent CLI from executing on import
jest.mock('commander', () => {
  class MockCommand {
    name() { return this; }
    description() { return this; }
    version() { return this; }
    command() { return this; }
    option() { return this; }
    action() { return this; }
    parse() { /* no-op */ }
  }
  return { Command: MockCommand };
});

// Mock child_process.spawn
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

// Ensure NODE_ENV is test so exports are available
process.env.NODE_ENV = 'test';

// Import after mocks so we can access the exported functions
const { 
  readPidFile, 
  removePidFile, 
  isProcessRunning 
} = require('../bin/gallery.js');

describe('Gallery Utility Functions', () => {
  let testDir;
  let cacheDir;

  beforeEach(async () => {
    // Create temp directory for each test
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gallery-utils-test-'));
    cacheDir = path.join(testDir, '.gallery-cache');
    await fs.mkdir(cacheDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temp directory
    if (testDir) {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  describe('readPidFile', () => {
    it('reads PID from file when it exists', async () => {
      const pidFile = path.join(cacheDir, 'gallery.pid');
      await fs.writeFile(pidFile, '12345');

      const pid = await readPidFile(testDir);
      expect(pid).toBe(12345);
    });

    it('returns null when PID file does not exist', async () => {
      const pid = await readPidFile(testDir);
      expect(pid).toBeNull();
    });

    it('returns null when cache directory does not exist', async () => {
      const nonExistentDir = path.join(os.tmpdir(), 'nonexistent-dir-' + Date.now());
      const pid = await readPidFile(nonExistentDir);
      expect(pid).toBeNull();
    });

    it('handles malformed PID file gracefully', async () => {
      const pidFile = path.join(cacheDir, 'gallery.pid');
      await fs.writeFile(pidFile, 'not-a-number');

      const pid = await readPidFile(testDir);
      expect(pid).toBeNaN();
    });

    it('trims whitespace from PID file', async () => {
      const pidFile = path.join(cacheDir, 'gallery.pid');
      await fs.writeFile(pidFile, '  54321  \n');

      const pid = await readPidFile(testDir);
      expect(pid).toBe(54321);
    });
  });

  describe('removePidFile', () => {
    it('removes PID file when it exists', async () => {
      const pidFile = path.join(cacheDir, 'gallery.pid');
      await fs.writeFile(pidFile, '12345');

      await removePidFile(testDir);

      // Verify file was deleted
      try {
        await fs.access(pidFile);
        fail('Expected file to be deleted');
      } catch (error) {
        expect(error.code).toBe('ENOENT');
      }
    });

    it('does not throw error when PID file does not exist', async () => {
      // Should not throw
      await expect(removePidFile(testDir)).resolves.not.toThrow();
    });

    it('does not throw error when cache directory does not exist', async () => {
      const nonExistentDir = path.join(os.tmpdir(), 'nonexistent-dir-' + Date.now());
      
      // Should not throw
      await expect(removePidFile(nonExistentDir)).resolves.not.toThrow();
    });
  });

  describe('isProcessRunning', () => {
    it('returns true for current process', () => {
      const currentPid = process.pid;
      expect(isProcessRunning(currentPid)).toBe(true);
    });

    it('returns false for non-existent PID', () => {
      // Use a very high PID that almost certainly doesn't exist
      const fakePid = 9999999;
      expect(isProcessRunning(fakePid)).toBe(false);
    });

    it('handles PID 0 (behavior depends on OS)', () => {
      // On some systems, PID 0 might be valid (kernel scheduler)
      // Just verify it doesn't throw
      const result = isProcessRunning(0);
      expect(typeof result).toBe('boolean');
    });

    it('handles negative PID (behavior depends on OS)', () => {
      // Negative PIDs have special meaning in process.kill (process groups)
      // Just verify it doesn't throw
      const result = isProcessRunning(-1);
      expect(typeof result).toBe('boolean');
    });

    it('handles null PID gracefully', () => {
      expect(isProcessRunning(null)).toBe(false);
    });

    it('handles undefined PID gracefully', () => {
      expect(isProcessRunning(undefined)).toBe(false);
    });
  });
});
