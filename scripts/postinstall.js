#!/usr/bin/env node

// Gated postinstall to run only for dev installs or when explicitly forced
// Why: npm package contents are determined at publish-time (package.json "files"),
// so we keep the published tarball minimal. This script is a no-op unless FG_DEV=1
// or an explicit flag is provided, so it won't affect regular installs.

function isDevInstall() {
  try {
    // Explicit env var
    if (process.env.FG_DEV === '1') return true;

    // Check npm's argv payload for include=dev or --include=dev
    const argv = process.env.npm_config_argv ? JSON.parse(process.env.npm_config_argv) : null;
    const original = Array.isArray(argv?.original) ? argv.original.join(' ') : '';
    if (/--include=dev|--only=dev|--dev\b/.test(original)) return true;

    // Also respect npm_config_include or npm_config_only
    if ((process.env.npm_config_include || '').includes('dev')) return true;
    if ((process.env.npm_config_only || '') === 'dev') return true;
  } catch (_) {}
  return false;
}

function shouldForce() {
  return process.argv.includes('--force') || process.argv.includes('-f');
}

async function main() {
  // Always print a friendly banner on regular installs
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  📸 Folder Gallery - Installed Successfully               ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('👤 Created by Brian Lashbrook');
    console.log('📖 View Docs: https://github.com/blashbrook/folder-gallery#readme');
    console.log('');
    
    // Check if Sharp is available and provide guidance if not
    try {
      require('sharp');
      console.log('✅ Sharp: Image thumbnails enabled');
    } catch (error) {
      console.log('⚠️  Sharp: Not found - thumbnails will be disabled');
      console.log('   Install with: npm install -g sharp');
    }
    
    // Check for tag CLI on macOS
    if (process.platform === 'darwin') {
      const { spawnSync } = require('child_process');
      const tagPath = process.env.TAG_PATH || '/opt/homebrew/bin/tag';
      const checkTag = spawnSync(tagPath, ['--version'], { stdio: 'ignore' });
      
      if (checkTag.error || checkTag.status !== 0) {
        console.log('⚠️  macOS tag: Not found - Finder tags will be disabled');
        console.log('   Install with: brew install tag');
        console.log('   Info: https://github.com/jdberry/tag');
      } else {
        console.log('✅ macOS tag: Finder tags enabled');
      }
    }
    
    console.log('');
    console.log('🚀 Quick Start:');
    console.log('   cd /path/to/photos');
    console.log('   gallery up');
    console.log('');
  } catch (_) {}

  const dev = isDevInstall() || shouldForce();
  if (!dev) {
    // No dev tasks for regular installs
    return;
  }

  // Dev-only setup (placeholder no-op)
  // - generate local docs
  // - fetch large optional assets
  // - set up sample datasets

  if (shouldForce()) {
    console.log('[folder-gallery] Dev install tasks completed (no-op).');
  }
}

main().catch(() => process.exit(0));

// Export functions for testing
if (process.env.NODE_ENV === 'test') {
  module.exports = {
    isDevInstall,
    shouldForce,
    main
  };
}
