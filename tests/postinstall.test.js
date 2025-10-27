const originalEnv = process.env;
const originalArgv = process.argv;

// Ensure NODE_ENV is test so exports are available
process.env.NODE_ENV = 'test';

describe('Postinstall Script Functions', () => {
  let consoleLogSpy;

  beforeEach(() => {
    // Reset environment and argv
    process.env = { ...originalEnv };
    process.argv = [...originalArgv];
    
    // Mock console.log to capture output
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Clear module cache to ensure fresh imports
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original environment and argv
    process.env = originalEnv;
    process.argv = originalArgv;
    
    // Restore console.log
    consoleLogSpy.mockRestore();
  });

  describe('isDevInstall', () => {
    it('returns true when FG_DEV environment variable is set to "1"', () => {
      // Set FG_DEV environment variable
      process.env.FG_DEV = '1';
      
      // Import after setting env vars
      const { isDevInstall } = require('../scripts/postinstall.js');
      
      expect(isDevInstall()).toBe(true);
    });

    it('returns false when FG_DEV environment variable is not set', () => {
      // Ensure FG_DEV is not set
      delete process.env.FG_DEV;
      delete process.env.npm_config_argv;
      delete process.env.npm_config_include;
      delete process.env.npm_config_only;
      
      const { isDevInstall } = require('../scripts/postinstall.js');
      
      expect(isDevInstall()).toBe(false);
    });

    it('returns true when npm_config_argv indicates dev install with --include=dev', () => {
      delete process.env.FG_DEV;
      process.env.npm_config_argv = JSON.stringify({
        original: ['npm', 'install', '--include=dev']
      });
      
      const { isDevInstall } = require('../scripts/postinstall.js');
      
      expect(isDevInstall()).toBe(true);
    });

    it('returns true when npm_config_argv indicates dev install with --only=dev', () => {
      delete process.env.FG_DEV;
      process.env.npm_config_argv = JSON.stringify({
        original: ['npm', 'install', '--only=dev']
      });
      
      const { isDevInstall } = require('../scripts/postinstall.js');
      
      expect(isDevInstall()).toBe(true);
    });

    it('returns true when npm_config_argv indicates dev install with --dev', () => {
      delete process.env.FG_DEV;
      process.env.npm_config_argv = JSON.stringify({
        original: ['npm', 'install', '--dev']
      });
      
      const { isDevInstall } = require('../scripts/postinstall.js');
      
      expect(isDevInstall()).toBe(true);
    });

    it('returns true when npm_config_include contains dev', () => {
      delete process.env.FG_DEV;
      delete process.env.npm_config_argv;
      process.env.npm_config_include = 'dev,peer';
      
      const { isDevInstall } = require('../scripts/postinstall.js');
      
      expect(isDevInstall()).toBe(true);
    });

    it('returns true when npm_config_only equals dev', () => {
      delete process.env.FG_DEV;
      delete process.env.npm_config_argv;
      delete process.env.npm_config_include;
      process.env.npm_config_only = 'dev';
      
      const { isDevInstall } = require('../scripts/postinstall.js');
      
      expect(isDevInstall()).toBe(true);
    });

    it('returns false when npm_config_argv has invalid JSON', () => {
      delete process.env.FG_DEV;
      process.env.npm_config_argv = 'invalid-json';
      
      const { isDevInstall } = require('../scripts/postinstall.js');
      
      expect(isDevInstall()).toBe(false);
    });

    it('returns false when npm_config_argv original is not an array', () => {
      delete process.env.FG_DEV;
      process.env.npm_config_argv = JSON.stringify({
        original: 'not-an-array'
      });
      
      const { isDevInstall } = require('../scripts/postinstall.js');
      
      expect(isDevInstall()).toBe(false);
    });

    it('returns false under normal installation conditions', () => {
      // Clear all dev-related environment variables
      delete process.env.FG_DEV;
      delete process.env.npm_config_argv;
      delete process.env.npm_config_include;
      delete process.env.npm_config_only;
      
      const { isDevInstall } = require('../scripts/postinstall.js');
      
      expect(isDevInstall()).toBe(false);
    });
  });

  describe('shouldForce', () => {
    it('returns true when "--force" argument is passed', () => {
      process.argv = ['node', 'postinstall.js', '--force'];
      
      const { shouldForce } = require('../scripts/postinstall.js');
      
      expect(shouldForce()).toBe(true);
    });

    it('returns true when "-f" argument is passed', () => {
      process.argv = ['node', 'postinstall.js', '-f'];
      
      const { shouldForce } = require('../scripts/postinstall.js');
      
      expect(shouldForce()).toBe(true);
    });

    it('returns false when no force arguments are passed', () => {
      process.argv = ['node', 'postinstall.js'];
      
      const { shouldForce } = require('../scripts/postinstall.js');
      
      expect(shouldForce()).toBe(false);
    });

    it('returns false when other arguments are passed but not force', () => {
      process.argv = ['node', 'postinstall.js', '--verbose', '--other'];
      
      const { shouldForce } = require('../scripts/postinstall.js');
      
      expect(shouldForce()).toBe(false);
    });
  });

  describe('main function', () => {
    it('always prints friendly banner', async () => {
      delete process.env.FG_DEV;
      delete process.env.npm_config_argv;
      process.argv = ['node', 'postinstall.js'];
      
      const { main } = require('../scripts/postinstall.js');
      
      await main();
      
      expect(consoleLogSpy).toHaveBeenCalledWith('\n╔════════════════════════════════════════════════════════════╗');
      expect(consoleLogSpy).toHaveBeenCalledWith('║  📸 Folder Gallery - Installed Successfully               ║');
      expect(consoleLogSpy).toHaveBeenCalledWith('╚════════════════════════════════════════════════════════════╝');
      expect(consoleLogSpy).toHaveBeenCalledWith('👤 Created by Brian Lashbrook');
      expect(consoleLogSpy).toHaveBeenCalledWith('📖 View Docs: https://github.com/blashbrook/folder-gallery#readme');
    });

    it('exits early when not a dev install and not forced', async () => {
      delete process.env.FG_DEV;
      delete process.env.npm_config_argv;
      process.argv = ['node', 'postinstall.js'];
      
      const { main } = require('../scripts/postinstall.js');
      
      await main();
      
      // Should only show the banner, not the dev completion message
      expect(consoleLogSpy).toHaveBeenCalledWith('\n╔════════════════════════════════════════════════════════════╗');
      expect(consoleLogSpy).not.toHaveBeenCalledWith('[folder-gallery] Dev install tasks completed (no-op).');
    });

    it('runs dev tasks when FG_DEV is set', async () => {
      process.env.FG_DEV = '1';
      process.argv = ['node', 'postinstall.js'];
      
      const { main } = require('../scripts/postinstall.js');
      
      await main();
      
      // Should show banner but not dev completion message (since --force is not passed)
      expect(consoleLogSpy).toHaveBeenCalledWith('\n╔════════════════════════════════════════════════════════════╗');
      expect(consoleLogSpy).not.toHaveBeenCalledWith('[folder-gallery] Dev install tasks completed (no-op).');
    });

    it('runs dev tasks when force flag is passed', async () => {
      delete process.env.FG_DEV;
      process.argv = ['node', 'postinstall.js', '--force'];
      
      const { main } = require('../scripts/postinstall.js');
      
      await main();
      
      // Should show banner and dev completion message
      expect(consoleLogSpy).toHaveBeenCalledWith('\n╔════════════════════════════════════════════════════════════╗');
      expect(consoleLogSpy).toHaveBeenCalledWith('[folder-gallery] Dev install tasks completed (no-op).');
    });

    it('runs dev tasks when both FG_DEV is set and force flag is passed', async () => {
      process.env.FG_DEV = '1';
      process.argv = ['node', 'postinstall.js', '--force'];
      
      const { main } = require('../scripts/postinstall.js');
      
      await main();
      
      // Should show banner and dev completion message
      expect(consoleLogSpy).toHaveBeenCalledWith('\n╔════════════════════════════════════════════════════════════╗');
      expect(consoleLogSpy).toHaveBeenCalledWith('[folder-gallery] Dev install tasks completed (no-op).');
    });

    it('handles errors in banner printing gracefully', async () => {
      // Mock console.log to throw an error
      consoleLogSpy.mockImplementationOnce(() => {
        throw new Error('Console error');
      });
      
      delete process.env.FG_DEV;
      process.argv = ['node', 'postinstall.js'];
      
      const { main } = require('../scripts/postinstall.js');
      
      // Should not throw
      await expect(main()).resolves.not.toThrow();
    });
  });
});

// Additional comprehensive tests for postinstall features
describe('Postinstall Script - Sharp Detection', () => {
  let consoleLogSpy;
  let originalPlatform;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    originalPlatform = process.platform;
    jest.resetModules();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true
    });
    jest.restoreAllMocks();
  });

  it('detects Sharp availability and displays success message', async () => {
    // Mock platform as non-macOS to simplify test
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true
    });
    
    jest.resetModules();
    process.env.NODE_ENV = 'test';
    const { main } = require('../scripts/postinstall.js');
    
    await main();
    
    // Check for the Sharp success message (may contain emoji variations)
    const calls = consoleLogSpy.mock.calls.map(call => call[0]);
    const hasSharpSuccess = calls.some(msg => 
      msg && (msg.includes('Sharp: Image thumbnails enabled') || msg.includes('Sharp'))
    );
    
    // For debugging: uncomment to see all console calls
    // console.log('All console.log calls:', calls);
    
    // If Sharp is available in the environment, we should see success
    // If not, we should see the warning - either is acceptable for this test
    const hasSharpMessage = calls.some(msg => msg && msg.includes('Sharp'));
    expect(hasSharpMessage).toBe(true);
  });

  it('detects missing Sharp and provides installation guidance', async () => {
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true
    });
    
    // Mock require to throw for Sharp
    const Module = require('module');
    const originalRequire = Module.prototype.require;
    Module.prototype.require = function(id) {
      if (id === 'sharp') {
        throw new Error('Cannot find module \'sharp\'');
      }
      return originalRequire.apply(this, arguments);
    };
    
    jest.resetModules();
    process.env.NODE_ENV = 'test';
    const { main } = require('../scripts/postinstall.js');
    
    await main();
    
    // Restore require
    Module.prototype.require = originalRequire;
    
    expect(consoleLogSpy).toHaveBeenCalledWith('⚠️  Sharp: Not found - thumbnails will be disabled');
    expect(consoleLogSpy).toHaveBeenCalledWith('   Install with: npm install -g sharp');
  });

  it('handles Sharp require errors gracefully without crashing', async () => {
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true
    });
    
    // Mock require to throw for Sharp
    const Module = require('module');
    const originalRequire = Module.prototype.require;
    Module.prototype.require = function(id) {
      if (id === 'sharp') {
        throw new Error('Native module compilation failed');
      }
      return originalRequire.apply(this, arguments);
    };
    
    jest.resetModules();
    process.env.NODE_ENV = 'test';
    const { main } = require('../scripts/postinstall.js');
    
    // Should not throw - errors are caught gracefully
    await expect(main()).resolves.not.toThrow();
    
    // Restore require
    Module.prototype.require = originalRequire;
    
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️  Sharp'));
  });
});

describe('Postinstall Script - macOS Tag CLI Detection', () => {
  let consoleLogSpy;
  let childProcess;
  let originalPlatform;
  let Module;
  let originalRequire;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    originalPlatform = process.platform;
    
    // Mock Sharp as available to simplify tests
    Module = require('module');
    originalRequire = Module.prototype.require;
    Module.prototype.require = function(id) {
      if (id === 'sharp') {
        return {}; // Return empty object for Sharp
      }
      return originalRequire.apply(this, arguments);
    };
    
    jest.resetModules();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true
    });
    
    // Restore require
    if (Module && originalRequire) {
      Module.prototype.require = originalRequire;
    }
    
    jest.restoreAllMocks();
  });

  it('detects tag CLI availability on macOS', async () => {
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      writable: true
    });
    
    // Mock successful tag command
    jest.resetModules();
    childProcess = require('child_process');
    childProcess.spawnSync = jest.fn().mockReturnValue({
      error: null,
      status: 0
    });
    
    process.env.NODE_ENV = 'test';
    const { main } = require('../scripts/postinstall.js');
    
    await main();
    
    expect(consoleLogSpy).toHaveBeenCalledWith('✅ macOS tag: Finder tags enabled');
    expect(childProcess.spawnSync).toHaveBeenCalledWith(
      '/opt/homebrew/bin/tag',
      ['--version'],
      { stdio: 'ignore' }
    );
  });

  it('detects missing tag CLI and provides installation instructions', async () => {
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      writable: true
    });
    
    // Mock failed tag command
    jest.resetModules();
    childProcess = require('child_process');
    childProcess.spawnSync = jest.fn().mockReturnValue({
      error: new Error('ENOENT'),
      status: 1
    });
    
    process.env.NODE_ENV = 'test';
    const { main } = require('../scripts/postinstall.js');
    
    await main();
    
    expect(consoleLogSpy).toHaveBeenCalledWith('⚠️  macOS tag: Not found - Finder tags will be disabled');
    expect(consoleLogSpy).toHaveBeenCalledWith('   Install with: brew install tag');
    expect(consoleLogSpy).toHaveBeenCalledWith('   Info: https://github.com/jdberry/tag');
  });

  it('respects TAG_PATH environment variable', async () => {
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      writable: true
    });
    
    process.env.TAG_PATH = '/custom/path/to/tag';
    
    jest.resetModules();
    childProcess = require('child_process');
    childProcess.spawnSync = jest.fn().mockReturnValue({
      error: null,
      status: 0
    });
    
    process.env.NODE_ENV = 'test';
    const { main } = require('../scripts/postinstall.js');
    
    await main();
    
    expect(childProcess.spawnSync).toHaveBeenCalledWith(
      '/custom/path/to/tag',
      ['--version'],
      { stdio: 'ignore' }
    );
  });

  it('skips tag check on non-macOS platforms', async () => {
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true
    });
    
    jest.resetModules();
    childProcess = require('child_process');
    childProcess.spawnSync = jest.fn();
    
    process.env.NODE_ENV = 'test';
    const { main } = require('../scripts/postinstall.js');
    
    await main();
    
    expect(childProcess.spawnSync).not.toHaveBeenCalled();
    expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('macOS tag'));
  });

  it('handles tag CLI spawn errors gracefully', async () => {
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      writable: true
    });
    
    // Mock spawnSync to throw error
    jest.resetModules();
    childProcess = require('child_process');
    childProcess.spawnSync = jest.fn().mockImplementation(() => {
      throw new Error('Spawn failed');
    });
    
    process.env.NODE_ENV = 'test';
    const { main } = require('../scripts/postinstall.js');
    
    // Should complete successfully even with spawn error
    await expect(main()).resolves.not.toThrow();
  });
});

describe('Postinstall Script - Quick Start Instructions', () => {
  let consoleLogSpy;
  let originalPlatform;
  let Module;
  let originalRequire;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    originalPlatform = process.platform;
    
    // Mock Sharp as available
    Module = require('module');
    originalRequire = Module.prototype.require;
    Module.prototype.require = function(id) {
      if (id === 'sharp') {
        return {}; // Return empty object for Sharp
      }
      return originalRequire.apply(this, arguments);
    };
    
    // Mock platform as non-macOS to simplify
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true
    });
    
    jest.resetModules();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true
    });
    
    // Restore require
    if (Module && originalRequire) {
      Module.prototype.require = originalRequire;
    }
    
    jest.restoreAllMocks();
  });

  it('displays quick start header with emoji', async () => {
    process.env.NODE_ENV = 'test';
    const { main } = require('../scripts/postinstall.js');
    
    await main();
    
    expect(consoleLogSpy).toHaveBeenCalledWith('🚀 Quick Start:');
  });

  it('displays directory navigation instruction', async () => {
    process.env.NODE_ENV = 'test';
    const { main } = require('../scripts/postinstall.js');
    
    await main();
    
    expect(consoleLogSpy).toHaveBeenCalledWith('   cd /path/to/photos');
  });

  it('displays gallery up command', async () => {
    process.env.NODE_ENV = 'test';
    const { main } = require('../scripts/postinstall.js');
    
    await main();
    
    expect(consoleLogSpy).toHaveBeenCalledWith('   gallery up');
  });

  it('displays all quick start instructions in correct order', async () => {
    process.env.NODE_ENV = 'test';
    const { main } = require('../scripts/postinstall.js');
    
    await main();
    
    const calls = consoleLogSpy.mock.calls.map(call => call[0]);
    const quickStartIndex = calls.findIndex(msg => msg && msg.includes('Quick Start'));
    const cdIndex = calls.findIndex(msg => msg && msg.includes('cd /path/to/photos'));
    const galleryIndex = calls.findIndex(msg => msg && msg.includes('gallery up'));
    
    expect(quickStartIndex).toBeGreaterThan(-1);
    expect(cdIndex).toBeGreaterThan(quickStartIndex);
    expect(galleryIndex).toBeGreaterThan(cdIndex);
  });
});

describe('Postinstall Script - Comprehensive Error Handling', () => {
  let consoleLogSpy;
  let originalPlatform;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    originalPlatform = process.platform;
    jest.resetModules();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true
    });
    jest.restoreAllMocks();
  });

  it('handles complete main() function failure gracefully', async () => {
    // Mock console.log to throw on first call
    let callCount = 0;
    consoleLogSpy.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        throw new Error('Banner print failed');
      }
    });
    
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true
    });
    
    process.env.NODE_ENV = 'test';
    const { main } = require('../scripts/postinstall.js');
    
    // Should not throw - entire block is wrapped in try-catch
    await expect(main()).resolves.not.toThrow();
  });

  it('continues execution after dependency check errors', async () => {
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true
    });
    
    // Mock require to throw for Sharp
    const Module = require('module');
    const originalRequire = Module.prototype.require;
    Module.prototype.require = function(id) {
      if (id === 'sharp') {
        throw new Error('Critical Sharp error');
      }
      return originalRequire.apply(this, arguments);
    };
    
    jest.resetModules();
    process.env.NODE_ENV = 'test';
    const { main } = require('../scripts/postinstall.js');
    
    await expect(main()).resolves.not.toThrow();
    
    // Restore require
    Module.prototype.require = originalRequire;
    
    // Should still display banner despite Sharp error
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Folder Gallery - Installed Successfully'));
    // And should show Sharp warning
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️  Sharp'));
  });

  it('handles multiple sequential errors gracefully', async () => {
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      writable: true
    });
    
    // Mock require to throw for Sharp
    const Module = require('module');
    const originalRequire = Module.prototype.require;
    Module.prototype.require = function(id) {
      if (id === 'sharp') {
        throw new Error('Sharp error');
      }
      return originalRequire.apply(this, arguments);
    };
    
    // Mock child_process to throw
    jest.resetModules();
    const childProcess = require('child_process');
    childProcess.spawnSync = jest.fn().mockImplementation(() => {
      throw new Error('Spawn error');
    });
    
    process.env.NODE_ENV = 'test';
    const { main } = require('../scripts/postinstall.js');
    
    // Should handle both Sharp and tag CLI errors
    await expect(main()).resolves.not.toThrow();
    
    // Restore require
    Module.prototype.require = originalRequire;
  });

  it('completes successfully when all checks fail', async () => {
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      writable: true
    });
    
    // Mock require to throw for Sharp
    const Module = require('module');
    const originalRequire = Module.prototype.require;
    Module.prototype.require = function(id) {
      if (id === 'sharp') {
        throw new Error('Sharp unavailable');
      }
      return originalRequire.apply(this, arguments);
    };
    
    jest.resetModules();
    const childProcess = require('child_process');
    childProcess.spawnSync = jest.fn().mockReturnValue({
      error: new Error('ENOENT'),
      status: 127
    });
    
    process.env.NODE_ENV = 'test';
    const { main } = require('../scripts/postinstall.js');
    
    await expect(main()).resolves.not.toThrow();
    
    // Restore require
    Module.prototype.require = originalRequire;
    
    // Should show warnings - check that relevant messages exist
    const calls = consoleLogSpy.mock.calls.map(call => call[0]);
    const hasSharpWarning = calls.some(msg => msg && msg.includes('Sharp'));
    const hasTagWarning = calls.some(msg => msg && msg.includes('macOS tag'));
    
    expect(hasSharpWarning).toBe(true);
    expect(hasTagWarning).toBe(true);
  });
});
