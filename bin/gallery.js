#!/usr/bin/env node

const { Command } = require('commander');
const express = require('express');
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const sharp = require('sharp');
const net = require('net');
const { spawn, fork } = require('child_process');

// ESM-only 'open' support via dynamic import to avoid require() ESM error
let __openModule = null;
async function openInBrowser(url) {
    try {
        if (!__openModule) {
            const mod = await import('open');
            __openModule = mod.default || mod;
        }
        await __openModule(url);
        console.log(`🌐 Browser opened: ${url}`);
        return true;
    } catch (e) {
        console.warn(`⚠️  Could not open browser automatically: ${e.message}`);
        console.log(`   Open manually: ${url}`);
        return false;
    }
}

const program = new Command();

// Configuration
let PORT = 3000;

// Configuration
const PACKAGE_DIR = path.dirname(__dirname);
const PUBLIC_DIR = path.join(PACKAGE_DIR, 'public');

// Supported media extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.svg'];
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.ogg', '.m4v', '.3gp', '.wmv', '.flv'];

// Global scanning state
let scanningState = {
    isScanning: false,
    currentDirectory: '',
    filesFound: 0,
    directoriesScanned: 0,
    progress: 0
};

let sseClients = new Set();

// Check if file is an image
function isImage(filename) {
    const ext = path.extname(filename).toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext);
}

// Check if file is a video
function isVideo(filename) {
    const ext = path.extname(filename).toLowerCase();
    return VIDEO_EXTENSIONS.includes(ext);
}

// Check if file is media (image or video)
function isMedia(filename) {
    return isImage(filename) || isVideo(filename);
}

// Check if port is available
function checkPort(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(port, () => {
            server.once('close', () => {
                resolve(true);
            });
            server.close();
        });
        server.on('error', () => {
            resolve(false);
        });
    });
}

// Find next available port
async function findAvailablePort(startPort) {
    let port = startPort;
    while (port < startPort + 100) {
        if (await checkPort(port)) {
            return port;
        }
        port++;
    }
    throw new Error('No available port found');
}

// Broadcast progress to all SSE clients
function broadcastProgress() {
    const data = JSON.stringify(scanningState);
    sseClients.forEach(client => {
        try {
            client.write(`data: ${data}\n\n`);
        } catch (error) {
            sseClients.delete(client);
        }
    });
}

// Scan directory recursively for images
async function scanDirectory(dir, SCAN_DIR, THUMBNAILS_DIR, isRoot = false) {
    const images = [];
    
    if (isRoot) {
        scanningState.isScanning = true;
        scanningState.filesFound = 0;
        scanningState.directoriesScanned = 0;
        broadcastProgress();
    }
    
    try {
        scanningState.currentDirectory = path.relative(SCAN_DIR, dir) || 'Root';
        scanningState.directoriesScanned++;
        broadcastProgress();
        
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            
            if (item.isDirectory()) {
                // Skip hidden directories and node_modules
                if (!item.name.startsWith('.') && item.name !== 'node_modules') {
                    const subImages = await scanDirectory(fullPath, SCAN_DIR, THUMBNAILS_DIR, false);
                    images.push(...subImages);
                }
            } else if (item.isFile() && isMedia(item.name)) {
                const stats = await fs.stat(fullPath);
                images.push({
                    name: item.name,
                    path: fullPath,
                    relativePath: path.relative(SCAN_DIR, fullPath),
                    directory: path.relative(SCAN_DIR, dir) || '.',
                    size: stats.size,
                    modified: stats.mtime.toISOString(),
                    type: isImage(item.name) ? 'image' : 'video'
                });
                scanningState.filesFound++;
                
                // Update progress every 10 files to avoid too many updates
                if (scanningState.filesFound % 10 === 0) {
                    broadcastProgress();
                }
            }
        }
    } catch (error) {
        console.warn(`Unable to scan directory ${dir}:`, error.message);
    }
    
    if (isRoot) {
        scanningState.isScanning = false;
        scanningState.currentDirectory = 'Complete';
        broadcastProgress();
    }
    
    return images;
}

// Generate thumbnail for images (preserving aspect ratio)
async function generateImageThumbnail(imagePath, thumbnailPath) {
    try {
        await sharp(imagePath)
            .resize(300, 300, { 
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: 80 })
            .toFile(thumbnailPath);
        return true;
    } catch (error) {
        console.warn(`Failed to generate thumbnail for ${imagePath}:`, error.message);
        return false;
    }
}

// Generate thumbnail (for both images and videos)
async function generateThumbnail(mediaPath, thumbnailPath, mediaType) {
    if (mediaType === 'image') {
        return await generateImageThumbnail(mediaPath, thumbnailPath);
    } else if (mediaType === 'video') {
        // For videos, create a simple placeholder thumbnail
        try {
            // Create a simple video placeholder using Sharp
            await sharp({
                create: {
                    width: 300,
                    height: 200,
                    channels: 3,
                    background: { r: 52, g: 73, b: 94 }
                }
            })
            .composite([{
                input: Buffer.from(`<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="30" fill="white" opacity="0.8"/>
                    <polygon points="40,35 40,65 65,50" fill="#2c3e50"/>
                </svg>`),
                left: 100,
                top: 50
            }])
            .jpeg({ quality: 80 })
            .toFile(thumbnailPath);
            return true;
        } catch (error) {
            console.warn(`Failed to generate video thumbnail for ${mediaPath}:`, error.message);
            return false;
        }
    }
    return false;
}

// Get or create thumbnail
async function getThumbnail(media, THUMBNAILS_DIR) {
    const thumbnailName = `${Buffer.from(media.relativePath).toString('base64')}.jpg`;
    const thumbnailPath = path.join(THUMBNAILS_DIR, thumbnailName);
    
    try {
        await fs.access(thumbnailPath);
        return `/static/thumbnails/${thumbnailName}`;
    } catch {
        // Thumbnail doesn't exist, create it
        if (await generateThumbnail(media.path, thumbnailPath, media.type)) {
            return `/static/thumbnails/${thumbnailName}`;
        }
        return null;
    }
}

// Launch server as background process
async function launchBackgroundServer(scanDir, port, openBrowser = true, extras = {}) {
    const config = {
        scanDir,
        port,
        openBrowser,
        packageDir: PACKAGE_DIR,
        // Optional tuning
        maxWorkers: Number.isFinite(parseInt(extras.maxWorkers)) ? parseInt(extras.maxWorkers) : undefined,
        ffmpegTimeoutMs: Number.isFinite(parseInt(extras.ffmpegTimeoutMs)) ? parseInt(extras.ffmpegTimeoutMs) : undefined,
        disableVideoThumbs: !!extras.disableVideoThumbs
    };
    
    const serverRunnerPath = path.join(PACKAGE_DIR, 'bin', 'server-runner.js');
    
    // Create log file for server output
    const cacheDir = path.join(scanDir, '.gallery-cache');
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }
    const logFile = path.join(cacheDir, 'server.log');
    const outStream = fs.openSync(logFile, 'a');
    const errStream = fs.openSync(logFile, 'a');
    
    // Spawn fully detached child process
    const child = spawn(process.execPath, [serverRunnerPath, JSON.stringify(config)], {
        detached: true,
        stdio: ['ignore', outStream, errStream], // Redirect stdout/stderr to log file
        cwd: scanDir
    });
    
    // Let the process run independently
    child.unref();
    
    // Give the process a moment to start, then resolve
    return new Promise((resolve, reject) => {
        child.on('error', (error) => {
            reject(error);
        });
        
        // Simple delay to let process start
        setTimeout(() => {
            resolve({ pid: child.pid });
        }, 1000);
    });
}

// Read PID from file
async function readPidFile(directory = process.cwd()) {
    const pidFile = path.join(directory, '.gallery-cache', 'gallery.pid');
    try {
        const pid = await fsPromises.readFile(pidFile, 'utf8');
        return parseInt(pid.trim());
    } catch {
        return null;
    }
}

// Remove PID file
async function removePidFile(directory = process.cwd()) {
    const pidFile = path.join(directory, '.gallery-cache', 'gallery.pid');
    try {
        await fsPromises.unlink(pidFile);
    } catch {
        // Ignore if file doesn't exist
    }
}

// Check if process is running
function isProcessRunning(pid) {
    try {
        process.kill(pid, 0); // Signal 0 just checks if process exists
        return true;
    } catch {
        return false;
    }
}

// Stop gallery server in current directory
async function stopGalleryServer(directory = process.cwd()) {
    const pid = await readPidFile(directory);
    
    if (pid && isProcessRunning(pid)) {
        try {
            process.kill(pid, 'SIGTERM');
            console.log(`🛑 Stopped gallery server (PID: ${pid}) in ${directory}`);
            await removePidFile(directory);
            return true;
        } catch (error) {
            console.warn(`Could not stop process ${pid}:`, error.message);
            await removePidFile(directory); // Clean up stale PID file
            return false;
        }
    } else {
        if (pid) {
            console.log('Gallery server is not running (stale PID file)');
            await removePidFile(directory); // Clean up stale PID file
        } else {
            console.log('No gallery server running in current directory');
        }
        return false;
    }
}

// Find and kill all gallery processes
async function killAllGalleryProcesses() {
    let stoppedCount = 0;
    
    // First, try to stop server in current directory
    if (await stopGalleryServer()) {
        stoppedCount++;
    }
    
    // Then look for other gallery processes using ps
    return new Promise((resolve) => {
        const ps = spawn('ps', ['aux']);
        const grep = spawn('grep', ['server-runner.js']);
        const grep2 = spawn('grep', ['-v', 'grep']);
        
        ps.stdout.pipe(grep.stdin);
        grep.stdout.pipe(grep2.stdin);
        
        let output = '';
        grep2.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        grep2.on('close', (code) => {
            const lines = output.trim().split('\n').filter(line => line.length > 0);
            const pids = lines.map(line => {
                const parts = line.trim().split(/\s+/);
                return parseInt(parts[1]); // PID is second column
            }).filter(pid => pid && !isNaN(pid));
            
            if (pids.length > 0) {
                console.log(`Found ${pids.length} additional gallery server(s)...`);
                pids.forEach(pid => {
                    try {
                        process.kill(pid, 'SIGTERM');
                        console.log(`🛑 Stopped gallery server (PID: ${pid})`);
                        stoppedCount++;
                    } catch (error) {
                        console.warn(`Could not stop process ${pid}:`, error.message);
                    }
                });
            }
            
            if (stoppedCount === 0) {
                console.log('No gallery servers found running');
            } else {
                console.log(`✅ Stopped ${stoppedCount} gallery server(s)`);
            }
            
            resolve();
        });
        
        ps.on('error', () => resolve());
        grep.on('error', () => resolve());
        grep2.on('error', () => resolve());
    });
}

// Delete gallery cache files recursively
async function deleteGalleryFiles(dir) {
    try {
        const items = await fsPromises.readdir(dir, { withFileTypes: true });
        let deletedCount = 0;
        
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            
            if (item.isDirectory()) {
                if (item.name === '.gallery-cache') {
                    // Delete entire .gallery-cache directory
                    await fsPromises.rm(fullPath, { recursive: true, force: true });
                    console.log(`🗑️  Deleted: ${fullPath}`);
                    deletedCount++;
                } else if (!item.name.startsWith('.') && item.name !== 'node_modules') {
                    // Recursively search subdirectories
                    deletedCount += await deleteGalleryFiles(fullPath);
                }
            }
        }
        
        return deletedCount;
    } catch (error) {
        console.warn(`Unable to scan directory ${dir}:`, error.message);
        return 0;
    }
}

// No longer needed - CLI doesn't run servers directly

// CLI Commands
program
    .name('gallery')
.description('Folder Gallery CLI')
    .version('1.0.0');

async function readServerInfo(directory = process.cwd()) {
    const infoPath = path.join(directory, '.gallery-cache', 'server-info.json');
    try {
        const raw = await fsPromises.readFile(infoPath, 'utf8');
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

program
    .command('up')
    .description('Start the gallery server')
    .option('-d, --directory <path>', 'Directory to scan', process.cwd())
    .option('-p, --port <number>', 'Port to run server on', '3000')
    .option('--no-open', 'Don\'t open browser automatically')
    .option('--max-workers <n>', 'Max concurrent video frame extractions', '2')
    .option('--ffmpeg-timeout <ms>', 'FFmpeg per-file timeout in ms', '20000')
    .option('--disable-video-thumbs', 'Disable real video thumbnails (use placeholder)')
    .action(async (options) => {
        const scanDir = path.resolve(options.directory);
        const port = parseInt(options.port);
        const openBrowser = options.open;
        const maxWorkers = Number.isFinite(parseInt(options.maxWorkers)) ? parseInt(options.maxWorkers) : 2;
        const ffmpegTimeout = Number.isFinite(parseInt(options.ffmpegTimeout)) ? parseInt(options.ffmpegTimeout) : 20000;
        const disableVideoThumbs = !!options.disableVideoThumbs;
        
        try {
            // Check if server is already running in this directory
            const existingPid = await readPidFile(scanDir);
            if (existingPid && isProcessRunning(existingPid)) {
                console.log(`⚠️  Gallery server already running (PID: ${existingPid})`);
                if (openBrowser) {
                    // Open actual port if we can read it
                    const info = await readServerInfo(scanDir);
                    const actual = info?.port || port;
                    await openInBrowser(`http://localhost:${actual}`);
                }
                return;
            }
            
            
            // Check if tag command is available on macOS
            if (process.platform === 'darwin') {
                const { spawn } = require('child_process');
                const tagPath = process.env.TAG_PATH || '/opt/homebrew/bin/tag';
                const checkTag = spawn(tagPath, ['--version'], { stdio: 'ignore' });
                let tagAvailable = false;
                checkTag.on('error', () => {});
                checkTag.on('close', () => { tagAvailable = true; });
                await new Promise(r => setTimeout(r, 50));
                
                if (!tagAvailable) {
                    console.log('⚠️  Note: macOS Finder tags disabled (optional)');
                    console.log('💡 To enable tags, install: brew install tag');
                }
            }
            const result = await launchBackgroundServer(scanDir, port, openBrowser, { maxWorkers, ffmpegTimeoutMs: ffmpegTimeout, disableVideoThumbs });
            console.log(`✅ Gallery server starting in background (PID: ${result.pid})`);
            // Wait briefly for server-info.json to appear
            let actualPort = port;
            const start = Date.now();
            while (Date.now() - start < 5000) {
                const info = await readServerInfo(scanDir);
                if (info?.port) { actualPort = info.port; break; }
                await new Promise(r => setTimeout(r, 200));
            }
            console.log(`🌐 Server will be available at: http://localhost:${actualPort}`);
            console.log('💡 Use "gallery down" to stop the server');

            if (openBrowser) {
                // Wait a bit for server to be ready, then open browser
                await new Promise(r => setTimeout(r, 1000));
                await openInBrowser(`http://localhost:${actualPort}`);
            }
            
            // Exit the CLI process to return control to the terminal
            process.exit(0);
            
        } catch (error) {
            console.error('Failed to start gallery server:', error.message);
            process.exit(1);
        }
    });

program
    .command('scan')
    .description('Scan directory and display results without starting server')
    .option('-d, --directory <path>', 'Directory to scan', process.cwd())
    .action(async (options) => {
        const scanDir = path.resolve(options.directory);
        
        try {
            console.log(`Scanning directory: ${scanDir}`);
            const THUMBNAILS_DIR = path.join(process.cwd(), '.gallery-cache', 'thumbnails');
            const images = await scanDirectory(scanDir, scanDir, THUMBNAILS_DIR, true);
            
            console.log(`\n📊 Scan Results:`);
            console.log(`   Total media files: ${images.length}`);
            console.log(`   Images: ${images.filter(img => img.type === 'image').length}`);
            console.log(`   Videos: ${images.filter(img => img.type === 'video').length}`);
            
            const directories = [...new Set(images.map(img => img.directory))];
            console.log(`   Directories: ${directories.length}`);
            
            if (directories.length > 0) {
                console.log(`\n📁 Directories with media:`);
                directories.sort().forEach(dir => {
                    const count = images.filter(img => img.directory === dir).length;
                    console.log(`   ${dir === '.' ? 'Root' : dir}: ${count} files`);
                });
            }
        } catch (error) {
            console.error('Failed to scan directory:', error.message);
            process.exit(1);
        }
    });

program
    .command('down')
    .description('Stop all running gallery servers')
    .action(async () => {
        try {
            console.log('🛑 Stopping gallery servers...');
            await killAllGalleryProcesses();
        } catch (error) {
            console.error('Failed to stop gallery servers:', error.message);
            process.exit(1);
        }
    });

// Helper: get CWD for a PID (macOS/Linux)
async function getCwdForPid(pid) {
    // Try Linux /proc first
    const procCwd = `/proc/${pid}/cwd`;
    try {
        const real = await fs.readlink(procCwd);
        if (real) return real;
    } catch {}

    // macOS and general fallback: use lsof
    return new Promise((resolve) => {
        const child = spawn('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn']);
        let out = '';
        child.stdout.on('data', d => out += d.toString());
        child.on('close', () => {
            // Look for line starting with 'n' containing path
            const line = out.split('\n').find(l => l.startsWith('n/'));
            if (line && line.length > 1) {
                resolve(line.slice(1));
            } else {
                resolve(null);
            }
        });
        child.on('error', () => resolve(null));
    });
}

// List all running galleries with their root directories and ports
async function listRunningGalleries() {
    const results = [];

    // Collect PIDs via ps | grep server-runner.js (Unix/macOS)
    const pids = await new Promise((resolve) => {
        const ps = spawn('ps', ['aux']);
        const grep = spawn('grep', ['server-runner.js']);
        const grep2 = spawn('grep', ['-v', 'grep']);

        ps.stdout.pipe(grep.stdin);
        grep.stdout.pipe(grep2.stdin);

        let output = '';
        grep2.stdout.on('data', (data) => { output += data.toString(); });
        const finish = () => {
            const lines = output.trim().split('\n').filter(l => l.trim().length > 0);
            const ids = lines.map(line => {
                const parts = line.trim().split(/\s+/);
                const pid = parseInt(parts[1]);
                return isNaN(pid) ? null : pid;
            }).filter(Boolean);
            resolve(Array.from(new Set(ids)));
        };
        grep2.on('close', finish);
        ps.on('error', finish);
        grep.on('error', finish);
        grep2.on('error', finish);
    });

    // For each PID, determine CWD and read server-info.json
    for (const pid of pids) {
        try {
            const cwd = await getCwdForPid(pid);
            if (!cwd) continue;
            const info = await readServerInfo(cwd);
            results.push({
                pid,
                path: cwd,
                port: info?.port || null,
                startedAt: info?.startedAt || null
            });
        } catch {}
    }

    // Also check current directory if running
    const localPid = await readPidFile(process.cwd());
    if (localPid && isProcessRunning(localPid)) {
        const info = await readServerInfo(process.cwd());
        const already = results.find(r => r.pid === localPid);
        if (!already) {
            results.push({ pid: localPid, path: process.cwd(), port: info?.port || null, startedAt: info?.startedAt || null });
        }
    }

    // Deduplicate by path
    const deduped = Object.values(results.reduce((acc, cur) => {
        acc[cur.path] = acc[cur.path] && acc[cur.path].port ? acc[cur.path] : cur;
        return acc;
    }, {}));

    return deduped.sort((a, b) => (a.path || '').localeCompare(b.path || ''));
}

program
    .command('list')
    .description('List running gallery servers and their root directories')
    .action(async () => {
        try {
            const running = await listRunningGalleries();
            if (!running || running.length === 0) {
                console.log('No gallery servers found running');
                return;
            }
            console.log('Running galleries:');
            running.forEach(item => {
                const portText = item.port ? ` (port ${item.port})` : '';
                console.log(`- ${item.path}${portText} [PID ${item.pid}]`);
            });
        } catch (error) {
            console.error('Failed to list galleries:', error.message);
            process.exit(1);
        }
    });

// Alias 'stop' to 'down' for backwards compatibility
program
    .command('stop')
    .description('Stop all running gallery servers (alias for down)')
    .action(async () => {
        console.log('💡 Note: "stop" is deprecated, use "gallery down" instead');
        try {
            console.log('🛑 Stopping gallery servers...');
            await killAllGalleryProcesses();
        } catch (error) {
            console.error('Failed to stop gallery servers:', error.message);
            process.exit(1);
        }
    });

program
    .command('rescan')
    .description('Force rescan of current directory gallery')
    .action(async () => {
        try {
            const pid = await readPidFile();
            if (!pid || !isProcessRunning(pid)) {
                console.log('⚠️  No gallery server running in current directory');
                console.log('💡 Start a server with: gallery up');
                return;
            }
            
            // Try to trigger rescan via API using recorded port
            const info = await readServerInfo(process.cwd());
            const tryPorts = [];
            if (info?.port) tryPorts.push(info.port);
            tryPorts.push(3000);
            for (let p = 3001; p <= 3010; p++) tryPorts.push(p);
            let response;
            for (const p of tryPorts) {
                try {
                    response = await fetch(`http://localhost:${p}/api/rescan`, { method: 'POST' });
                    if (response.ok) break;
                } catch {}
            }
            if (!response) throw new Error('Could not connect to gallery server');
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Gallery rescanned successfully');
                console.log(`▦ Found ${result.totalImages} media files`);
            } else {
                console.error('❌ Failed to rescan gallery');
            }
            
        } catch (error) {
            console.error('Failed to rescan gallery:', error.message);
            console.log('💡 The server might be running on a different port');
            process.exit(1);
        }
    });

program
    .command('cleanup')
    .description('Clean up orphaned thumbnail files in current directory')
    .action(async () => {
        try {
            const thumbnailsDir = path.join(process.cwd(), '.gallery-cache', 'thumbnails');
            
            // Check if thumbnails directory exists
            try {
                await fs.access(thumbnailsDir);
            } catch {
                console.log('ℹ️  No thumbnail cache found in current directory');
                return;
            }
            
            console.log('🧹 Cleaning up orphaned thumbnails...');
            
            const thumbnailFiles = await fs.readdir(thumbnailsDir);
            let cleanedCount = 0;
            let totalThumbnails = 0;
            
            for (const thumbnailFile of thumbnailFiles) {
                if (!thumbnailFile.endsWith('.jpg')) continue;
                totalThumbnails++;
                
                // Decode the original file path from base64 filename
                const base64Path = thumbnailFile.replace('.jpg', '');
                try {
                    const originalPath = Buffer.from(base64Path, 'base64').toString('utf8');
                    const fullOriginalPath = path.join(process.cwd(), originalPath);
                    
                    // Check if original file still exists
                    try {
                        await fs.access(fullOriginalPath);
                    } catch {
                        // Original file doesn't exist, remove thumbnail
                        const thumbnailPath = path.join(thumbnailsDir, thumbnailFile);
                        await fs.unlink(thumbnailPath);
                        console.log(`🗑️  Removed: ${thumbnailFile}`);
                        cleanedCount++;
                    }
                } catch (error) {
                    // Invalid base64 or other error, skip
                    console.warn(`⚠️  Could not decode thumbnail: ${thumbnailFile}`);
                }
            }
            
            console.log(`\n✅ Cleanup complete:`);
            console.log(`   Total thumbnails: ${totalThumbnails}`);
            console.log(`   Cleaned: ${cleanedCount}`);
            console.log(`   Remaining: ${totalThumbnails - cleanedCount}`);
            
        } catch (error) {
            console.error('Failed to cleanup thumbnails:', error.message);
            process.exit(1);
        }
    });

program
    .command('delete')
    .description('Delete all gallery cache files (.gallery-cache directories)')
    .option('-d, --directory <path>', 'Directory to clean (searches recursively)', process.cwd())
    .option('-f, --force', 'Skip confirmation prompt')
    .action(async (options) => {
        const searchDir = path.resolve(options.directory);
        
        try {
            if (!options.force) {
                console.log(`\n⚠️  This will delete all .gallery-cache directories in:`);
                console.log(`   ${searchDir}`);
                console.log(`\n   This includes all thumbnails and metadata files.`);
                console.log(`\n   Continue? (y/N):`);
                
                // Simple confirmation (in a real CLI, you'd use a proper prompt library)
                process.stdin.setRawMode(false);
                process.stdin.resume();
                const response = await new Promise((resolve) => {
                    process.stdin.once('data', (data) => {
                        process.stdin.pause();
                        resolve(data.toString().trim().toLowerCase());
                    });
                });
                
                if (response !== 'y' && response !== 'yes') {
                    console.log('❌ Operation cancelled');
                    process.exit(0);
                }
            }
            
            console.log(`\n🗑️  Deleting gallery cache files in: ${searchDir}`);
            const deletedCount = await deleteGalleryFiles(searchDir);
            
            if (deletedCount > 0) {
                console.log(`\n✅ Deleted ${deletedCount} .gallery-cache director${deletedCount === 1 ? 'y' : 'ies'}`);
            } else {
                console.log('\n📂 No .gallery-cache directories found');
            }
            process.exit(0);
        } catch (error) {
            console.error('Failed to delete gallery files:', error.message);
            process.exit(1);
        }
    });

program.parse();

// Export internals for testing only
if (process.env.NODE_ENV === 'test') {
    module.exports = {
        launchBackgroundServer,
        readPidFile,
        removePidFile,
        isProcessRunning,
        deleteGalleryFiles,
        readServerInfo
    };
}
