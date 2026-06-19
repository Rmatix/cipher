const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sharp = require('sharp');

async function convertPngToIco(srcPng, destIco) {
  console.log(`[Icon Conversion] Converting ${srcPng} to ${destIco}...`);
  const sizes = [16, 32, 48, 64, 128, 256];
  const pngBuffers = [];
  
  for (const size of sizes) {
    const buf = await sharp(srcPng)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    pngBuffers.push(buf);
  }
  
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type: Icon
  header.writeUInt16LE(sizes.length, 4); // Number of images
  
  const dirEntries = [];
  let offset = 6 + sizes.length * 16;
  
  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];
    const dataSize = pngBuffers[i].length;
    const entry = Buffer.alloc(16);
    
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(dataSize, 8);
    entry.writeUInt32LE(offset, 12);
    
    dirEntries.push(entry);
    offset += dataSize;
  }
  
  const icoBuffer = Buffer.concat([header, ...dirEntries, ...pngBuffers]);
  fs.writeFileSync(destIco, icoBuffer);
  console.log(`[Icon Conversion] Created ${destIco}`);
}

async function main() {
  const target = process.argv[2] || 'all';
  const projectRoot = path.resolve(__dirname, '..');
  
  const logolitePng = path.join(projectRoot, 'renderer', 'public', 'logolite.png');
  const logodevPng = path.join(projectRoot, 'renderer', 'public', 'logodev.png');
  
  const logoliteIco = path.join(projectRoot, 'renderer', 'public', 'logolite.ico');
  const logodevIco = path.join(projectRoot, 'renderer', 'public', 'logodev.ico');
  
  // 1. Convert PNGs to ICOs
  if (!fs.existsSync(logoliteIco)) {
    await convertPngToIco(logolitePng, logoliteIco);
  }
  if (!fs.existsSync(logodevIco)) {
    await convertPngToIco(logodevPng, logodevIco);
  }
  
  // 2. Build the renderer (shared bundle)
  console.log('[Build] Compiling React/Vite renderer bundle...');
  execSync('pnpm build', { cwd: projectRoot, stdio: 'inherit' });
  
  // 3. Invoke electron-builder for selected target(s)
  const targets = target === 'all' ? ['lite', 'dev', 'studio'] : [target];
  
  for (const t of targets) {
    console.log(`[Package] Packaging Cipher ${t.toUpperCase()}...`);
    const configFile = path.join('build', `cipher-${t}.config.js`);
    execSync(`pnpm electron-builder --config ${configFile} --win --x64`, {
      cwd: projectRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        CIPHER_PRODUCT: t
      }
    });
  }
  
  console.log('[Build] All builds completed successfully!');
}

main().catch(err => {
  console.error('[Error] Build failed:', err);
  process.exit(1);
});
