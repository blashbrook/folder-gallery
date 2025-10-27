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
      
      expect(consoleLogSpy).toHaveBeenCalledWith('\n[folder-gallery] Installed successfully');
      expect(consoleLogSpy).toHaveBeenCalledWith('[folder-gallery] Created by Brian Lashbrook');
      expect(consoleLogSpy).toHaveBeenCalledWith('[folder-gallery] View the docs: https://github.com/blashbrook/folder-gallery#readme');
    });

    it('exits early when not a dev install and not forced', async () => {
      delete process.env.FG_DEV;
      delete process.env.npm_config_argv;
      process.argv = ['node', 'postinstall.js'];
      
      const { main } = require('../scripts/postinstall.js');
      
      await main();
      
      // Should only show the banner, not the dev completion message
      expect(consoleLogSpy).toHaveBeenCalledWith('\n[folder-gallery] Installed successfully');
      expect(consoleLogSpy).not.toHaveBeenCalledWith('[folder-gallery] Dev install tasks completed (no-op).');
    });

    it('runs dev tasks when FG_DEV is set', async () => {
      process.env.FG_DEV = '1';
      process.argv = ['node', 'postinstall.js'];
      
      const { main } = require('../scripts/postinstall.js');
      
      await main();
      
      // Should show banner but not dev completion message (since --force is not passed)
      expect(consoleLogSpy).toHaveBeenCalledWith('\n[folder-gallery] Installed successfully');
      expect(consoleLogSpy).not.toHaveBeenCalledWith('[folder-gallery] Dev install tasks completed (no-op).');
    });

    it('runs dev tasks when force flag is passed', async () => {
      delete process.env.FG_DEV;
      process.argv = ['node', 'postinstall.js', '--force'];
      
      const { main } = require('../scripts/postinstall.js');
      
      await main();
      
      // Should show banner and dev completion message
      expect(consoleLogSpy).toHaveBeenCalledWith('\n[folder-gallery] Installed successfully');
      expect(consoleLogSpy).toHaveBeenCalledWith('[folder-gallery] Dev install tasks completed (no-op).');
    });

    it('runs dev tasks when both FG_DEV is set and force flag is passed', async () => {
      process.env.FG_DEV = '1';
      process.argv = ['node', 'postinstall.js', '--force'];
      
      const { main } = require('../scripts/postinstall.js');
      
      await main();
      
      // Should show banner and dev completion message
      expect(consoleLogSpy).toHaveBeenCalledWith('\n[folder-gallery] Installed successfully');
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