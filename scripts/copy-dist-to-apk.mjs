/**
 * copy-dist-to-apk.mjs
 *
 * Copies the built PWA output (dist/) into the Android APK assets folder
 * so WebViewAssetLoader can serve the app locally without any network.
 *
 * Usage: node scripts/copy-dist-to-apk.mjs
 * Prerequisite: npm run build (with --base=/ for APK builds)
 */

import { cpSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const distDir = join(root, 'dist');
const assetsDir = join(root, 'twa', 'app', 'src', 'main', 'assets', 'www');

// ── Pre-flight check ────────────────────────────────

if (!existsSync(distDir)) {
  console.error('❌ dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

if (!existsSync(join(distDir, 'index.html'))) {
  console.error('❌ dist/index.html not found. Build may have failed.');
  process.exit(1);
}

// ── Clean & copy ─────────────────────────────────────

console.log('📦 Copying dist/ → twa/app/src/main/assets/www/ ...');

// Remove old assets if present
if (existsSync(assetsDir)) {
  rmSync(assetsDir, { recursive: true });
}

// Ensure target directory exists
mkdirSync(assetsDir, { recursive: true });

// Copy all files recursively
cpSync(distDir, assetsDir, { recursive: true });

// ── Summary ──────────────────────────────────────────

function countFiles(dir) {
  let count = 0;
  const { readdirSync, statSync } = require('fs') || { readdirSync: () => [], statSync: () => ({ isDirectory: () => false }) };
  // Use simple walk instead
  return count;
}

console.log('✅ Assets copied successfully.');
console.log(`   Target: ${assetsDir}`);
