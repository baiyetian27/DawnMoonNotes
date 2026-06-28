/**
 * copy-dist-to-apk.mjs
 *
 * Copies the built PWA output (dist/) into the Android APK assets folder
 * so WebViewAssetLoader can serve the app via https://appassets.androidplatform.net
 * without any network.
 *
 * Usage: node scripts/copy-dist-to-apk.mjs
 * Prerequisite: npm run build:apk
 */

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const distDir = join(root, 'dist');
const assetsDir = join(root, 'twa', 'app', 'src', 'main', 'assets', 'www');

// ── Pre-flight check ────────────────────────────────

if (!existsSync(distDir)) {
  console.error('❌ dist/ not found. Run `npm run build:apk` first.');
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

// ── Count files ──────────────────────────────────────

function countFilesRecursive(dir) {
  let count = 0;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      count += countFilesRecursive(join(dir, entry.name));
    } else {
      count++;
    }
  }
  return count;
}

const fileCount = countFilesRecursive(assetsDir);

// ── Post-process HTML for APK compatibility ──────────

const indexPath = join(assetsDir, 'index.html');
let indexContent = readFileSync(indexPath, 'utf-8');

let warnings = 0;

// Check 1: Script paths must be absolute (starting with /)
if (indexContent.includes('src="./') || indexContent.includes('href="./')) {
  console.warn('⚠️  Warning: Relative paths found in built HTML.');
  console.warn('   Absolute paths (starting with /) are required.');
  console.warn('   Ensure --base=/ was used during build.');
  warnings++;
}

// Check 2: Strip crossorigin from module scripts
// loadDataWithBaseURL origin is same-origin for all assets, so crossorigin
// is unnecessary and can cause CORS issues on some WebView versions.
// Our shouldInterceptRequest adds CORS headers, but stripping crossorigin
// removes an entire class of potential problems.
const crossoriginPattern = /\s+crossorigin(?:\s*=\s*"[^"]*")?\s*/g;
const beforeCrossorigin = indexContent;
indexContent = indexContent.replace(crossoriginPattern, ' ');
if (indexContent !== beforeCrossorigin) {
  console.log('🔧 Stripped crossorigin attributes from HTML.');
}
// Check 3: Strip GitHub Pages redirect script (uses history.replaceState
// which fails on file:// protocol with null origin)
const redirectPattern = /[\t ]*<!-- GitHub Pages SPA[\s\S]*?<\/script>/g;
const beforeRedirect = indexContent;
indexContent = indexContent.replace(redirectPattern, '');
if (indexContent !== beforeRedirect) {
  console.log('🔧 Stripped GitHub Pages redirect script.');
}
writeFileSync(indexPath, indexContent, 'utf-8');

// Check 4: index.html exists and is non-empty
const indexSize = indexContent.length;
if (indexSize < 100) {
  console.warn('⚠️  Warning: index.html is suspiciously small (' + indexSize + ' bytes).');
  warnings++;
}

// ── Summary ──────────────────────────────────────────

console.log(`✅ Assets copied successfully. (${fileCount} files)`);
console.log(`   Target: ${assetsDir}`);

if (warnings > 0) {
  console.warn(`⚠️  ${warnings} warning(s) found. Review above before building APK.`);
} else {
  console.log('✅ All APK compatibility checks passed.');
}
