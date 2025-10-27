const fs = require('fs').promises;
const path = require('path');

// Mock Commander to prevent CLI execution
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

// Mock filesystem operations
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  }
}));

// Import the function under test
const { readServerInfo } = require('../bin/gallery.js');

describe('readServerInfo', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should read and parse server-info.json using fsPromises.readFile', async () => {
    const testDir = '/test/directory';
    const serverInfo = {
      port: 3001,
      startTime: '2024-01-01T00:00:00.000Z',
      pid: 12345,
      version: '1.11.1'
    };

    fs.readFile.mockResolvedValue(JSON.stringify(serverInfo));

    const result = await readServerInfo(testDir);

    expect(fs.readFile).toHaveBeenCalledWith(
      path.join(testDir, '.gallery-cache', 'server-info.json'),
      'utf8'
    );
    expect(result).toEqual(serverInfo);
  });

  test('should use process.cwd() as default directory', async () => {
    const originalCwd = process.cwd();
    const mockCwd = '/default/directory';
    process.cwd = jest.fn().mockReturnValue(mockCwd);

    const serverInfo = { port: 3000 };
    fs.readFile.mockResolvedValue(JSON.stringify(serverInfo));

    const result = await readServerInfo();

    expect(fs.readFile).toHaveBeenCalledWith(
      path.join(mockCwd, '.gallery-cache', 'server-info.json'),
      'utf8'
    );
    expect(result).toEqual(serverInfo);

    // Restore original cwd
    process.cwd = jest.fn().mockReturnValue(originalCwd);
  });

  test('should return null when file does not exist', async () => {
    const testDir = '/test/directory';
    const error = new Error('ENOENT: no such file or directory');
    error.code = 'ENOENT';

    fs.readFile.mockRejectedValue(error);

    const result = await readServerInfo(testDir);

    expect(result).toBeNull();
  });

  test('should return null when file contains invalid JSON', async () => {
    const testDir = '/test/directory';
    
    fs.readFile.mockResolvedValue('invalid json content');

    const result = await readServerInfo(testDir);

    expect(result).toBeNull();
  });

  test('should return null when file read fails with permission error', async () => {
    const testDir = '/test/directory';
    const error = new Error('EACCES: permission denied');
    error.code = 'EACCES';

    fs.readFile.mockRejectedValue(error);

    const result = await readServerInfo(testDir);

    expect(result).toBeNull();
  });

  test('should correctly parse complex server info object', async () => {
    const testDir = '/test/directory';
    const complexServerInfo = {
      port: 3001,
      startTime: '2024-01-01T12:34:56.789Z',
      pid: 98765,
      version: '1.11.1',
      scanDir: '/home/user/photos',
      config: {
        maxWorkers: 2,
        ffmpegTimeout: 20000,
        disableVideoThumbs: false
      },
      stats: {
        imagesFound: 150,
        videosFound: 25,
        thumbnailsGenerated: 100
      }
    };

    fs.readFile.mockResolvedValue(JSON.stringify(complexServerInfo));

    const result = await readServerInfo(testDir);

    expect(result).toEqual(complexServerInfo);
    expect(result.config).toEqual(complexServerInfo.config);
    expect(result.stats).toEqual(complexServerInfo.stats);
  });

  test('should handle empty JSON object', async () => {
    const testDir = '/test/directory';
    
    fs.readFile.mockResolvedValue('{}');

    const result = await readServerInfo(testDir);

    expect(result).toEqual({});
  });

  test('should handle JSON with null values', async () => {
    const testDir = '/test/directory';
    const serverInfo = {
      port: 3000,
      startTime: null,
      pid: 12345,
      config: null
    };

    fs.readFile.mockResolvedValue(JSON.stringify(serverInfo));

    const result = await readServerInfo(testDir);

    expect(result).toEqual(serverInfo);
    expect(result.startTime).toBeNull();
    expect(result.config).toBeNull();
  });

  test('should verify fsPromises.readFile is called with correct encoding', async () => {
    const testDir = '/custom/path';
    
    fs.readFile.mockResolvedValue('{"port": 4000}');

    await readServerInfo(testDir);

    expect(fs.readFile).toHaveBeenCalledWith(
      path.join(testDir, '.gallery-cache', 'server-info.json'),
      'utf8'
    );
    expect(fs.readFile).toHaveBeenCalledTimes(1);
  });

  test('should handle various JSON data types correctly', async () => {
    const testDir = '/test/directory';
    const serverInfo = {
      port: 3000,                    // number
      active: true,                  // boolean  
      startTime: '2024-01-01',      // string
      tags: ['gallery', 'images'],  // array
      metadata: null,               // null
      config: {                     // object
        nested: {
          value: 42
        }
      }
    };

    fs.readFile.mockResolvedValue(JSON.stringify(serverInfo));

    const result = await readServerInfo(testDir);

    expect(result.port).toBe(3000);
    expect(result.active).toBe(true);
    expect(result.startTime).toBe('2024-01-01');
    expect(result.tags).toEqual(['gallery', 'images']);
    expect(result.metadata).toBeNull();
    expect(result.config.nested.value).toBe(42);
  });
});