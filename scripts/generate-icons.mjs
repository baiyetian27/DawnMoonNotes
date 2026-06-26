import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const resDir = join(__dirname, '..', 'twa', 'app', 'src', 'main', 'res');

// Android icon densities
const densities = [
  { name: 'mdpi', size: 48 },
  { name: 'hdpi', size: 72 },
  { name: 'xhdpi', size: 96 },
  { name: 'xxhdpi', size: 144 },
  { name: 'xxxhdpi', size: 192 },
];

// Clean geometric crescent moon SVG (no emoji, no text — renders reliably everywhere)
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0F0F1A"/>
      <stop offset="100%" stop-color="#1A1725"/>
    </linearGradient>
    <linearGradient id="moon" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#C084FC"/>
      <stop offset="100%" stop-color="#A855F7"/>
    </linearGradient>
  </defs>
  <!-- Rounded background -->
  <rect width="512" height="512" rx="128" fill="url(#bg)"/>
  <!-- Crescent moon using two overlapping arcs -->
  <path d="M 280 80
           A 180 180 0 1 0 280 432
           A 140 140 0 1 1 280 80 Z"
        fill="url(#moon)"/>
  <!-- Subtle star accents -->
  <circle cx="160" cy="200" r="6" fill="#E2E0E7" opacity="0.6"/>
  <circle cx="140" cy="300" r="4" fill="#E2E0E7" opacity="0.4"/>
  <circle cx="180" cy="360" r="3" fill="#E2E0E7" opacity="0.3"/>
</svg>`;

// Master size for rendering
const masterSize = 512;

try {
  // Render the SVG to a master PNG
  const masterPng = await sharp(Buffer.from(iconSvg), { density: 72 })
    .resize(masterSize, masterSize)
    .png()
    .toBuffer();

  // Generate each density
  for (const { name, size } of densities) {
    const dir = join(resDir, `mipmap-${name}`);
    mkdirSync(dir, { recursive: true });

    await sharp(masterPng)
      .resize(size, size)
      .png()
      .toFile(join(dir, 'ic_launcher.png'));

    console.log(`✅ ${name} (${size}×${size}) → mipmap-${name}/ic_launcher.png`);
  }

  console.log('\n🎉 All launcher icons generated!');
} catch (err) {
  console.error('❌ Error generating icons:', err);
  process.exit(1);
}
