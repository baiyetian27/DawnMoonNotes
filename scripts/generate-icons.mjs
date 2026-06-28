import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { readFileSync } from 'fs';
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

// Read the source SVG (pwa-512.svg — high-res version with moon emoji + text)
const svgPath = join(__dirname, '..', 'public', 'pwa-512.svg');
const iconSvg = readFileSync(svgPath, 'utf-8');

// Master render size
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

  console.log('\n🎉 All launcher icons generated from pwa-512.svg!');
} catch (err) {
  console.error('❌ Error generating icons:', err);
  process.exit(1);
}
