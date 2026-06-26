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

// Clean geometric crescent moon SVG using evenOdd fill
// (same approach as the Android vector drawable for consistency)
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
  <!-- Rounded dark background -->
  <rect width="512" height="512" rx="110" fill="url(#bg)"/>
  <!-- Crescent moon: two circles with evenOdd fill
       Outer: center(256,256) r=152   Inner: center(218,256) r=95
       The overlap cancels out, leaving a right-side crescent -->
  <path d="M 256 104
           A 152 152 0 1 1 256 408
           A 152 152 0 1 1 256 104
           M 218 161
           A 95 95 0 1 1 218 351
           A 95 95 0 1 1 218 161"
        fill="url(#moon)" fill-rule="evenodd"/>
  <!-- Star accents -->
  <circle cx="350" cy="170" r="17" fill="#E2E0E7" opacity="0.8"/>
  <circle cx="330" cy="290" r="12" fill="#E2E0E7" opacity="0.5"/>
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
