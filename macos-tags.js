const childProcess = require('child_process');

/**
 * Read Finder tags from a file using macOS xattr and Python
 * @param {string} filePath - Path to the file
 * @returns {Promise<string[]>} Array of tag names
 */
async function readFinderTags(filePath) {
    return new Promise((resolve) => {
        // Prefer native xattr; if no attribute, return []
        const py = childProcess.spawn('python3', ['-'], { stdio: ['pipe', 'pipe', 'ignore'] });
        const code = `import sys, plistlib, subprocess

path = sys.argv[1]
try:
    out = subprocess.check_output(['/usr/bin/xattr','-p','com.apple.metadata:_kMDItemUserTags', path])
    arr = plistlib.loads(out)
    for s in arr:
        sys.stdout.write(str(s)+'\\n')
except subprocess.CalledProcessError:
    pass
`;
        let output = '';
        py.stdout.on('data', d => { output += d.toString(); });
        py.on('close', () => {
            const tags = output.split('\n').map(s => s.trim()).filter(Boolean);
            resolve(tags);
        });
        py.stdin.write(code);
        py.stdin.end(filePath + '\n');
    });
}

/**
 * Write Finder tags to a file using macOS xattr and Python
 * @param {string} filePath - Path to the file
 * @param {string[]} tags - Array of tag names to set
 * @returns {Promise<boolean>} Success status
 */
async function writeFinderTags(filePath, tags) {
    return new Promise((resolve, reject) => {
        const py = childProcess.spawn('python3', ['-c', `import sys, plistlib; print(plistlib.dumps(sys.argv[1:], fmt=plistlib.FMT_BINARY).hex())`, ''].concat(tags));
        let hex = '';
        py.stdout.on('data', d => { hex += d.toString().trim(); });
        py.on('close', (codeExit) => {
            if (!hex) return reject(new Error('Failed to encode tags'));
            const x = childProcess.spawn('/usr/bin/xattr', ['-wx', 'com.apple.metadata:_kMDItemUserTags', hex, filePath]);
            x.on('close', (c) => c === 0 ? resolve(true) : reject(new Error('xattr failed')));
        });
    });
}

module.exports = {
    readFinderTags,
    writeFinderTags
};