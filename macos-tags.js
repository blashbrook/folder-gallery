const childProcess = require('child_process');

/**
 * Check if the tag CLI tool is available
 * @returns {Promise<boolean>} True if tag command is available
 */
async function isTagCommandAvailable() {
    return new Promise((resolve) => {
        const tagPath = process.env.TAG_PATH || '/opt/homebrew/bin/tag';
        
        // Try to run 'tag --version' to check if it exists
        const proc = childProcess.spawn(tagPath, ['--version'], { stdio: 'ignore' });
        
        proc.on('error', () => {
            resolve(false);
        });
        
        proc.on('close', (code) => {
            // If it runs successfully or with any exit code, it exists
            resolve(true);
        });
        
        // Timeout after 100ms
        setTimeout(() => {
            proc.kill();
            resolve(false);
        }, 100);
    });
}

/**
 * Read Finder tags from a file using the 'tag' CLI tool
 * @param {string} filePath - Path to the file
 * @returns {Promise<string[]>} Array of tag names
 */
async function readFinderTags(filePath) {
    return new Promise((resolve) => {
        // Use the 'tag' CLI tool which handles binary plist correctly
        // Try common installation paths
        const tagPath = process.env.TAG_PATH || '/opt/homebrew/bin/tag';
        const proc = childProcess.spawn(tagPath, ['--list', '--no-name', filePath], { stdio: ['ignore', 'pipe', 'ignore'] });
        let output = '';
        
        // Handle spawn errors (e.g., command not found)
        proc.on('error', (err) => {
            // Silently return empty array if tag tool isn't installed
            resolve([]);
        });
        
        proc.stdout.on('data', d => { output += d.toString(); });
        proc.on('close', (code) => {
            if (code !== 0) {
                // File has no tags or error occurred
                resolve([]);
                return;
            }
            // Output format is comma-separated tags, trim whitespace
            const tags = output.trim().split(',').map(s => s.trim()).filter(Boolean);
            resolve(tags);
        });
    });
}

/**
 * Write Finder tags to a file using the 'tag' CLI tool
 * @param {string} filePath - Path to the file
 * @param {string[]} tags - Array of tag names to set
 * @returns {Promise<boolean>} Success status
 */
async function writeFinderTags(filePath, tags) {
    return new Promise((resolve, reject) => {
        // Use 'tag --set' to replace all tags
        // Join tags with commas as required by the tool
        const tagPath = process.env.TAG_PATH || '/opt/homebrew/bin/tag';
        const tagString = tags.join(',');
        const proc = childProcess.spawn(tagPath, ['--set', tagString, filePath], { stdio: 'ignore' });
        
        // Handle spawn errors (e.g., command not found)
        proc.on('error', (err) => {
            reject(new Error(`tag command not found: ${err.message}`));
        });
        
        proc.on('close', (code) => {
            if (code === 0) {
                resolve(true);
            } else {
                reject(new Error(`tag command failed with code ${code}`));
            }
        });
    });
}

module.exports = {
    isTagCommandAvailable,
    readFinderTags,
    writeFinderTags
};
