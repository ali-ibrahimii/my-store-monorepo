// ============================================================
// آیکون‌های PWA را بدون وابستگی خارجی می‌سازد (PNG خام + zlib).
//   node scripts/generate-icons.mjs
// ============================================================
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const outDir = fileURLToPath(new URL("../public", import.meta.url));

// CRC32 for PNG chunks
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function makeIcon(size) {
  const px = Buffer.alloc(size * size * 4);
  const set = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
  };
  const u = size / 512; // واحد طراحی روی viewBox 512
  const rect = (x, y, w, h, r, g, b) => {
    for (let j = Math.round(y * u); j < Math.round((y + h) * u); j++)
      for (let i = Math.round(x * u); i < Math.round((x + w) * u); i++) set(i, j, r, g, b);
  };

  // پس‌زمینه‌ی slate-900
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) set(i, j, 15, 23, 42);

  // کادر اسکنر (sky-400)
  const s = 26, t = 26, L = 80;
  rect(96, 96, L, t, 56, 189, 248); rect(96, 96, t, L, 56, 189, 248);
  rect(416 - L + t, 96, L - t, t, 56, 189, 248); rect(416 - t, 96, t, L, 56, 189, 248);
  rect(96, 416 - t, L, t, 56, 189, 248); rect(96, 416 - L, t, L - t, 56, 189, 248);
  rect(416 - L + t, 416 - t, L - t, t, 56, 189, 248); rect(416 - t, 416 - L, t, L - t, 56, 189, 248);

  // میله‌های بارکد (سفید)
  const bars = [[144, 24], [184, 14], [212, 30], [256, 14], [284, 24], [324, 14], [352, 20]];
  for (const [x, w] of bars) rect(x, 192, w, 128, 248, 250, 252);
  // خط لیزر (قرمز)
  rect(112, 248, 288, 12, 244, 63, 94);

  // PNG encode
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let j = 0; j < size; j++) {
    raw[j * (size * 4 + 1)] = 0;
    px.copy(raw, j * (size * 4 + 1) + 1, j * size * 4, (j + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  writeFileSync(`${outDir}/icon-${size}.png`, makeIcon(size));
  console.log(`icon-${size}.png ساخته شد`);
}
