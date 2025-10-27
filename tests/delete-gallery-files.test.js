const fs = require('fs').promises;
const path = require('path');

// Mock all potentially problematic modules before imports
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

// Mock child_process to prevent any subprocess calls
jest.mock('child_process', () => ({
  spawn: jest.fn().mockReturnValue({ on: jest.fn(), stdout: { pipe: jest.fn() } })
}));

// Mock open module
jest.mock('open', () => jest.fn().mockResolvedValue(true));

// Mock filesystem operations
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    rm: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    stat: jest.fn(),
    unlink: jest.fn(),
  },
  // Mock sync versions that might be used
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  openSync: jest.fn()
}));

// Mock net module to prevent port checking
jest.mock('net', () => ({
  createServer: jest.fn().mockReturnValue({
    listen: jest.fn((port, callback) => callback && callback()),
    close: jest.fn((callback) => callback && callback()),
    on: jest.fn()
  })
}));

// Import the function under test
let deleteGalleryFiles;

// Wrap import in try-catch to handle any issues
try {
  const galleryModule = require('../bin/gallery.js');
  deleteGalleryFiles = galleryModule.deleteGalleryFiles;
} catch (error) {
  console.error('Error importing gallery module:', error.message);
}

describe('deleteGalleryFiles', () => {
  beforeAll(() => {
    if (!deleteGalleryFiles) {
      throw new Error('Failed to import deleteGalleryFiles function');
    }
  });

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    // Suppress console.log during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should delete .gallery-cache directories using fsPromises.rm with correct options', async () => {
    const testDir = '/test/directory';
    
    // Mock directory contents with a .gallery-cache directory
    fs.readdir
      .mockResolvedValueOnce([
        {
          name: '.gallery-cache',
          isDirectory: () => true,
          isFile: () => false
        },
        {
          name: 'subfolder',
          isDirectory: () => true,
          isFile: () => false
        },
        {
          name: 'image.jpg',
          isDirectory: () => false,
          isFile: () => true
        }
      ])
      // Subfolder contents (no further recursion)
      .mockResolvedValueOnce([
        {
          name: 'file.txt',
          isDirectory: () => false,
          isFile: () => true
        }
      ]);

    const result = await deleteGalleryFiles(testDir);

    // Should call rm with recursive and force options
    expect(fs.rm).toHaveBeenCalledWith(
      path.join(testDir, '.gallery-cache'),
      { recursive: true, force: true }
    );
    expect(result).toBe(1); // Should return count of deleted directories
    expect(console.log).toHaveBeenCalledWith(`🗑️  Deleted: ${path.join(testDir, '.gallery-cache')}`);
  });

  test('should recursively scan subdirectories and delete multiple .gallery-cache directories', async () => {
    const testDir = '/test/directory';
    
    // First call - root directory
    fs.readdir
      .mockResolvedValueOnce([
        {
          name: '.gallery-cache',
          isDirectory: () => true,
          isFile: () => false
        },
        {
          name: 'subfolder',
          isDirectory: () => true,
          isFile: () => false
        }
      ])
      // Second call - subfolder
      .mockResolvedValueOnce([
        {
          name: '.gallery-cache',
          isDirectory: () => true,
          isFile: () => false
        },
        {
          name: 'image.jpg',
          isDirectory: () => false,
          isFile: () => true
        }
      ]);

    const result = await deleteGalleryFiles(testDir);

    // Should delete both .gallery-cache directories
    expect(fs.rm).toHaveBeenCalledTimes(2);
    expect(fs.rm).toHaveBeenCalledWith(
      path.join(testDir, '.gallery-cache'),
      { recursive: true, force: true }
    );
    expect(fs.rm).toHaveBeenCalledWith(
      path.join(testDir, 'subfolder', '.gallery-cache'),
      { recursive: true, force: true }
    );
    expect(result).toBe(2);
  });

  test('should skip hidden directories (except .gallery-cache) and node_modules', async () => {
    const testDir = '/test/directory';
    
    fs.readdir.mockResolvedValue([
      {
        name: '.gallery-cache',
        isDirectory: () => true,
        isFile: () => false
      },
      {
        name: '.git',
        isDirectory: () => true,
        isFile: () => false
      },
      {
        name: 'node_modules',
        isDirectory: () => true,
        isFile: () => false
      },
      {
        name: '.hidden',
        isDirectory: () => true,
        isFile: () => false
      }
    ]);

    const result = await deleteGalleryFiles(testDir);

    // Should only call readdir once (for the root directory) and only delete .gallery-cache
    expect(fs.readdir).toHaveBeenCalledTimes(1);
    expect(fs.rm).toHaveBeenCalledTimes(1);
    expect(fs.rm).toHaveBeenCalledWith(
      path.join(testDir, '.gallery-cache'),
      { recursive: true, force: true }
    );
    expect(result).toBe(1);
  });

  test('should handle directories without .gallery-cache directories', async () => {
    const testDir = '/test/directory';
    
    fs.readdir.mockResolvedValue([
      {
        name: 'images',
        isDirectory: () => true,
        isFile: () => false
      },
      {
        name: 'photo.jpg',
        isDirectory: () => false,
        isFile: () => true
      }
    ]);

    // Mock the recursive call to return no deletions
    fs.readdir.mockResolvedValueOnce([
      {
        name: 'photo2.jpg',
        isDirectory: () => false,
        isFile: () => true
      }
    ]);

    const result = await deleteGalleryFiles(testDir);

    expect(fs.rm).not.toHaveBeenCalled();
    expect(result).toBe(0);
  });

  test('should handle filesystem errors gracefully', async () => {
    const testDir = '/test/directory';
    const error = new Error('Permission denied');
    
    fs.readdir.mockRejectedValue(error);

    const result = await deleteGalleryFiles(testDir);

    expect(console.warn).toHaveBeenCalledWith(`Unable to scan directory ${testDir}:`, error.message);
    expect(result).toBe(0);
  });

  test('should handle rm operation errors gracefully', async () => {
    const testDir = '/test/directory';
    
    fs.readdir.mockResolvedValueOnce([
      {
        name: '.gallery-cache',
        isDirectory: () => true,
        isFile: () => false
      }
    ]);

    const rmError = new Error('Failed to delete');
    fs.rm.mockRejectedValueOnce(rmError);

    const result = await deleteGalleryFiles(testDir);

    // Current implementation catches errors and returns 0
    expect(result).toBe(0);
    expect(console.warn).toHaveBeenCalled();
  });

  test('should verify fsPromises.rm is called with exact parameters', async () => {
    const testDir = '/specific/test/path';
    
    fs.readdir.mockResolvedValue([
      {
        name: '.gallery-cache',
        isDirectory: () => true,
        isFile: () => false
      }
    ]);

    await deleteGalleryFiles(testDir);

    // Verify exact parameters passed to fsPromises.rm
    const expectedPath = path.join(testDir, '.gallery-cache');
    const expectedOptions = { recursive: true, force: true };
    
    expect(fs.rm).toHaveBeenCalledWith(expectedPath, expectedOptions);
    expect(fs.rm).toHaveBeenCalledTimes(1);
  });
});