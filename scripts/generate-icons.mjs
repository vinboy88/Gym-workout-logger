import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public');

const BG = [12, 13, 15, 255];
const LIME = [200, 245, 66, 255];

function crc(data) {
  let c = ~0;
  for (const byte of data) {
    c ^= byte;
    for (let i = 0; i < 8; i += 1) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function inRect(x, y, rx, ry, rw, rh, radius = 0) {
  if (radius <= 0) {
    return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
  }
  const nx = Math.max(rx + radius, Math.min(x, rx + rw - 1 - radius));
  const ny = Math.max(ry + radius, Math.min(y, ry + rh - 1 - radius));
  if (x >= rx + radius && x < rx + rw - radius && y >= ry && y < ry + rh) return true;
  if (y >= ry + radius && y < ry + rh - radius && x >= rx && x < rx + rw) return true;
  const dx = x - nx;
  const dy = y - ny;
  return dx * dx + dy * dy <= radius * radius;
}

function colorAt(size, x, y) {
  const s = size / 512;
  const plates = [
    [86 * s, 196 * s, 56 * s, 120 * s, 10 * s],
    [142 * s, 216 * s, 28 * s, 80 * s, 6 * s],
    [176 * s, 240 * s, 160 * s, 32 * s, 8 * s],
    [342 * s, 216 * s, 28 * s, 80 * s, 6 * s],
    [370 * s, 196 * s, 56 * s, 120 * s, 10 * s],
  ];
  for (const [rx, ry, rw, rh, r] of plates) {
    if (inRect(x, y, rx, ry, rw, rh, r)) return LIME;
  }
  return BG;
}

function makePng(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  let offset = 0;
  for (let y = 0; y < size; y += 1) {
    raw[offset] = 0;
    offset += 1;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = colorAt(size, x, y);
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
      offset += 4;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return png;
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'pwa-192x192.png'), makePng(192));
writeFileSync(join(outDir, 'pwa-512x512.png'), makePng(512));
writeFileSync(join(outDir, 'apple-touch-icon.png'), makePng(180));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0c0d0f"/>
  <g fill="#c8f542">
    <rect x="86" y="196" width="56" height="120" rx="10"/>
    <rect x="142" y="216" width="28" height="80" rx="6"/>
    <rect x="176" y="240" width="160" height="32" rx="8"/>
    <rect x="342" y="216" width="28" height="80" rx="6"/>
    <rect x="370" y="196" width="56" height="120" rx="10"/>
  </g>
</svg>
`;
writeFileSync(join(outDir, 'favicon.svg'), svg);
console.log('wrote PWA icons');
