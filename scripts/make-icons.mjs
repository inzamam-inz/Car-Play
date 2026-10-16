// Generates the PWA PNG icons by rasterising the Gari mark.
// No native image deps: samples shapes per pixel with 3x3 supersampling.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const BG = [10, 10, 11];
const FG = [237, 237, 237];
const ACCENT = [77, 159, 255];

const inRoundRect = (x, y, rx, ry, rw, rh, r) => {
  if (x < rx || y < ry || x > rx + rw || y > ry + rh) return false;
  const cx = Math.min(Math.max(x, rx + r), rx + rw - r);
  const cy = Math.min(Math.max(y, ry + r), ry + rh - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};
const inCircle = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

// The mark: a rounded "car body" outline with two wheels, drawn in a 0..1 space.
function sample(u, v) {
  // car body outline (rounded rect stroke)
  const bodyOuter = inRoundRect(u, v, 0.17, 0.36, 0.66, 0.28, 0.11);
  const bodyInner = inRoundRect(u, v, 0.23, 0.43, 0.54, 0.15, 0.06);
  if (bodyOuter && !bodyInner) return FG;
  // wheels
  if (inCircle(u, v, 0.31, 0.66, 0.075) || inCircle(u, v, 0.69, 0.66, 0.075)) return FG;
  // accent bar along the top of the body
  if (inRoundRect(u, v, 0.29, 0.28, 0.42, 0.045, 0.022)) return ACCENT;
  return null;
}

function render(size, { maskable }) {
  const px = Buffer.alloc(size * size * 4);
  const inset = maskable ? 0 : size * 0.06; // maskable is full-bleed
  const scale = maskable ? 0.62 : 0.8;      // keep glyph inside the safe zone
  const off = (size * (1 - scale)) / 2;
  const radius = maskable ? 0 : size * 0.22;
  const S = 3;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const fx = x + (sx + 0.5) / S;
          const fy = y + (sy + 0.5) / S;
          const bgHit = maskable
            ? true
            : inRoundRect(fx, fy, inset, inset, size - inset * 2, size - inset * 2, radius);
          const u = (fx - off) / (size * scale);
          const v = (fy - off) / (size * scale);
          const fg = bgHit ? sample(u, v) : null;
          const c = fg ?? (bgHit ? BG : null);
          if (c) {
            r += c[0]; g += c[1]; b += c[2]; a += 255;
          }
        }
      }
      const n = S * S;
      const o = (y * size + x) * 4;
      if (a > 0) {
        // colours are averaged only over covered samples so edges stay crisp
        const cov = a / 255;
        px[o] = Math.round(r / cov);
        px[o + 1] = Math.round(g / cov);
        px[o + 2] = Math.round(b / cov);
        px[o + 3] = Math.round(a / n);
      }
    }
  }
  return png(size, size, px);
}

function png(w, h, raw) {
  const stride = w * 4;
  const data = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    data[y * (stride + 1)] = 0; // filter: none
    raw.copy(data, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const chunk = (type, body) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(body.length, 0);
    const buf = Buffer.concat([Buffer.from(type), body]);
    const crc = Buffer.alloc(4);
    let c = 0xffffffff;
    for (const byte of buf) {
      c ^= byte;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crc.writeUInt32BE((c ^ 0xffffffff) >>> 0, 0);
    return Buffer.concat([len, buf, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(data, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });
const out = [
  ['public/icons/icon-192.png', 192, { maskable: false }],
  ['public/icons/icon-512.png', 512, { maskable: false }],
  ['public/icons/maskable-512.png', 512, { maskable: true }],
  ['public/icons/apple-touch-icon-180.png', 180, { maskable: true }],
];
for (const [path, size, opts] of out) {
  writeFileSync(path, render(size, opts));
  console.log('wrote', path);
}
