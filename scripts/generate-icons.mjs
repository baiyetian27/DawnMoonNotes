import sharp from 'sharp';
import { mkdirSync, readFileSync } from 'fs';
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

// Read the user's moon.png icon
const pngPath = join(__dirname, '..', 'public', 'moon.png');
const sourcePng = readFileSync(pngPath);

try {
  // Generate each density by resizing the source PNG
  for (const { name, size } of densities) {
    const dir = join(resDir, `mipmap-${name}`);
    mkdirSync(dir, { recursive: true });

    await sharp(sourcePng)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(join(dir, 'ic_launcher.png'));

    console.log(`✅ ${name} (${size}×${size}) → mipmap-${name}/ic_launcher.png`);
  }

  console.log('\n🎉 All launcher icons generated from moon.png!');
} catch (err) {
  console.error('❌ Error generating icons:', err);
  process.exit(1);
}
