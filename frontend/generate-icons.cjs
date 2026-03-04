/**
 * Run this script to generate PWA icon PNGs from the SVG.
 * Requires: npm install sharp
 * Usage: node generate-icons.js
 */
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.log('Installing sharp...');
    require('child_process').execSync('npm install sharp', { stdio: 'inherit' });
    sharp = require('sharp');
  }

  const svgPath = path.join(__dirname, 'public', 'icons', 'icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  const sizes = [192, 512];

  for (const size of sizes) {
    const outputPath = path.join(__dirname, 'public', 'icons', `icon-${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`Generated: icon-${size}.png`);
  }

  console.log('Done! PWA icons generated.');
}

generateIcons().catch(console.error);
