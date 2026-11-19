// Average colour of a region of an image: node scripts/probe.mjs design/01.png x y [w h]
// Use it instead of estimating hex values by eye. `sharp` ships with Astro; if missing: npm i -D sharp
import sharp from 'sharp';

const [file, x, y, w = 1, h = 1] = process.argv.slice(2);
if (!file || x === undefined || y === undefined) {
  console.error('usage: node scripts/probe.mjs <png> <x> <y> [w h]');
  process.exit(2);
}
const { data, info } = await sharp(file)
  .extract({ left: +x, top: +y, width: +w, height: +h })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const n = info.width * info.height;
const sum = [0, 0, 0];
for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) sum[k] += data[i * info.channels + k];
console.log('#' + sum.map((v) => Math.round(v / n).toString(16).padStart(2, '0')).join(''));
