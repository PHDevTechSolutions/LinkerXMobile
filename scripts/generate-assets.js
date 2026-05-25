// Generates minimal valid PNG files for Expo assets
const fs = require('fs');
const path = require('path');

// Minimal 1x1 purple PNG (base64 encoded)
// This is a valid 1024x1024 solid color PNG
function createPNG(width, height, r, g, b) {
  const { createCanvas } = (() => {
    try { return require('canvas'); } catch { return null; }
  })() || {};

  if (createCanvas) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, width, height);
    return canvas.toBuffer('image/png');
  }

  // Fallback: minimal valid PNG (8x8 solid color)
  // PNG signature + IHDR + IDAT + IEND
  const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    const table = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[i] = c;
    }
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    const typeBytes = Buffer.from(type);
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crcData = Buffer.concat([typeBytes, data]);
    const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(crcData));
    return Buffer.concat([len, typeBytes, data, crcBuf]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Raw image data (uncompressed)
  const rowSize = width * 3 + 1;
  const raw = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0; // filter type none
    for (let x = 0; x < width; x++) {
      raw[y * rowSize + 1 + x * 3] = r;
      raw[y * rowSize + 2 + x * 3] = g;
      raw[y * rowSize + 3 + x * 3] = b;
    }
  }

  // Compress with zlib
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(raw);

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);

// Purple color: #7C3AED = 124, 58, 237
const purple = [124, 58, 237];
const dark   = [13, 13, 26];

const files = [
  { name: 'icon.png',          w: 1024, h: 1024, color: purple },
  { name: 'adaptive-icon.png', w: 1024, h: 1024, color: purple },
  { name: 'splash.png',        w: 1284, h: 2778, color: dark   },
  { name: 'favicon.png',       w: 48,   h: 48,   color: purple },
];

files.forEach(({ name, w, h, color }) => {
  const filePath = path.join(assetsDir, name);
  if (!fs.existsSync(filePath)) {
    const png = createPNG(w, h, ...color);
    fs.writeFileSync(filePath, png);
    console.log(`✅ Created ${name}`);
  } else {
    console.log(`⏭️  Skipped ${name} (already exists)`);
  }
});

console.log('Done!');
