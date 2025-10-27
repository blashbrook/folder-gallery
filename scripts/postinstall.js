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
    const link = 'https://github.com/blashbrook/folder-gallery#readme';
    console.log('\n[folder-gallery] Installed successfully');
    console.log('[folder-gallery] Created by Brian Lashbrook');
    console.log(`[folder-gallery] View the docs: ${link}`);
    
    // Check if Sharp is available and provide guidance if not
    try {
      require('sharp');
      console.log('✅ Sharp is available - image thumbnails enabled');
    } catch (error) {
      console.log('⚠️  Sharp not found - image thumbnails will be disabled');
      console.log('   To enable thumbnails, run: npm install -g sharp');
      console.log('   Or install locally: npm install sharp');
    }
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
