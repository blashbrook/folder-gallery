const path = require('path');

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

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  openSync: jest.fn()
}));

const fs = require('fs');
const { spawn } = require('child_process');
const { MockSpawn, createMockSpawn } = require('./test-utils');

// Ensure NODE_ENV is test so exports are available
process.env.NODE_ENV = 'test';

// Import after mocks so we can access the exported function
const { launchBackgroundServer } = require('../bin/gallery.js');

describe('launchBackgroundServer spawning behavior', () => {
  let mockSpawn;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockSpawn = createMockSpawn();
    spawn.mockImplementation(mockSpawn);
    
    // Setup fs mocks
    fs.existsSync.mockReturnValue(false);
    fs.mkdirSync.mockReturnValue(undefined);
    fs.openSync.mockReturnValue(3); // Mock file descriptor
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses process.execPath when spawning the child process', async () => {
    const child = new MockSpawn(process.execPath, [], {});
    spawn.mockReturnValue(child);

    const promise = launchBackgroundServer('/tmp/test-gallery', 3000, true);
    jest.advanceTimersByTime(1000);
    const result = await promise;

    expect(result).toHaveProperty('pid', child.pid);
    expect(spawn).toHaveBeenCalled();
    const [command] = spawn.mock.calls[0];
    expect(command).toBe(process.execPath);
  });

  it('spawns a detached child process with stdio ignored and correct cwd', async () => {
    const child = new MockSpawn(process.execPath, [], {});
    spawn.mockReturnValue(child);

    const scanDir = '/tmp/test-photos';
    const promise = launchBackgroundServer(scanDir, 3100, false);
    jest.advanceTimersByTime(1000);
    await promise;

    const [, , options] = spawn.mock.calls[0];
    expect(options).toMatchObject({
      detached: true,
      cwd: scanDir
    });
    expect(options.stdio).toHaveLength(3);
    expect(child.unref).toHaveBeenCalled();
  });

  it('passes server-runner.js path as the first argument', async () => {
    const child = new MockSpawn(process.execPath, [], {});
    spawn.mockReturnValue(child);

    const promise = launchBackgroundServer('/tmp/test-data', 3200, true);
    jest.advanceTimersByTime(1000);
    await promise;

    const [, args] = spawn.mock.calls[0];
    expect(args[0]).toContain(path.join(path.dirname(__dirname), 'bin', 'server-runner.js').split(path.sep).join(path.sep));
    expect(args[0]).toMatch(/server-runner\.js$/);
  });

  it('passes serialized configuration as the second argument', async () => {
    const child = new MockSpawn(process.execPath, [], {});
    spawn.mockReturnValue(child);

    const scanDir = '/tmp/test-pics';
    const port = 3300;
    const openBrowser = false;

    const promise = launchBackgroundServer(scanDir, port, openBrowser);
    jest.advanceTimersByTime(1000);
    await promise;

    const [, args] = spawn.mock.calls[0];
    expect(typeof args[1]).toBe('string');
    const config = JSON.parse(args[1]);

    expect(config.scanDir).toBe(scanDir);
    expect(config.port).toBe(port);
    expect(config.openBrowser).toBe(openBrowser);
    expect(config.packageDir).toBe(path.dirname(path.dirname(__filename)));
  });

  it('creates .gallery-cache directory if it does not exist', async () => {
    const child = new MockSpawn(process.execPath, [], {});
    spawn.mockReturnValue(child);

    const scanDir = '/tmp/test-images';
    fs.existsSync.mockReturnValue(false);

    const promise = launchBackgroundServer(scanDir, 3400, true);
    jest.advanceTimersByTime(1000);
    await promise;

    expect(fs.existsSync).toHaveBeenCalledWith(path.join(scanDir, '.gallery-cache'));
    expect(fs.mkdirSync).toHaveBeenCalledWith(path.join(scanDir, '.gallery-cache'), { recursive: true });
  });

  it('opens log file for server output', async () => {
    const child = new MockSpawn(process.execPath, [], {});
    spawn.mockReturnValue(child);

    const scanDir = '/tmp/test-gallery-logs';
    const promise = launchBackgroundServer(scanDir, 3500, true);
    jest.advanceTimersByTime(1000);
    await promise;

    const expectedLogPath = path.join(scanDir, '.gallery-cache', 'server.log');
    expect(fs.openSync).toHaveBeenCalledWith(expectedLogPath, 'a');
    expect(fs.openSync).toHaveBeenCalledTimes(2); // stdout and stderr
  });
});
