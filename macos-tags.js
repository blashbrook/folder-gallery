const childProcess = require('child_process');

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
    readFinderTags,
    writeFinderTags
};