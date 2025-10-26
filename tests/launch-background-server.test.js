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
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses process.execPath when spawning the child process', async () => {
    const child = new MockSpawn(process.execPath, [], {});
    spawn.mockReturnValue(child);

    const promise = launchBackgroundServer('/tmp/scan', 3000, true);
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

    const scanDir = '/var/photos';
    const promise = launchBackgroundServer(scanDir, 3100, false);
    jest.advanceTimersByTime(1000);
    await promise;

    const [, , options] = spawn.mock.calls[0];
    expect(options).toMatchObject({
      detached: true,
      stdio: ['ignore', 'ignore', 'ignore'],
      cwd: scanDir
    });
    expect(child.unref).toHaveBeenCalled();
  });

  it('passes server-runner.js path as the first argument', async () => {
    const child = new MockSpawn(process.execPath, [], {});
    spawn.mockReturnValue(child);

    const promise = launchBackgroundServer('/data', 3200, true);
    jest.advanceTimersByTime(1000);
    await promise;

    const [, args] = spawn.mock.calls[0];
    expect(args[0]).toContain(path.join(path.dirname(__dirname), 'bin', 'server-runner.js').split(path.sep).join(path.sep));
    expect(args[0]).toMatch(/server-runner\.js$/);
  });

  it('passes serialized configuration as the second argument', async () => {
    const child = new MockSpawn(process.execPath, [], {});
    spawn.mockReturnValue(child);

    const scanDir = '/pics';
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
});