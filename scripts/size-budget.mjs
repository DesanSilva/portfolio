import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { gzipSync } from 'node:zlib';

const KB = 1024;
const walk = (d) => readdirSync(d).flatMap((f) => {
 const p = join(d, f);
 return statSync(p).isDirectory() ? walk(p) : [p];
});
const files = walk('dist');
const gz = (p) => gzipSync(readFileSync(p), { level: 9 }).length;
const by = (ext) => files.filter((f) => extname(f) === ext);

const checks = [
 ['largest HTML (gz)', Math.max(0, ...by('.html').map(gz)), 14 * KB],
 ['total JS (gz)', by('.js').reduce((n, f) => n + gz(f), 0), 8 * KB],
 ['total external CSS (gz)', by('.css').reduce((n, f) => n + gz(f), 0), 10 * KB],
 ['largest font (woff2)', Math.max(0, ...by('.woff2').map((f) => statSync(f).size)), 35 * KB],
];

let failed = false;
for (const [name, size, limit] of checks) {
 const ok = size <= limit;
 failed ||= !ok;
 console.log(`${ok ? 'ok ' : 'FAIL'} ${name.padEnd(26)} ${(size / KB).toFixed(1)} KB / ${(limit / KB).toFixed(0)} KB`);
}
process.exit(failed ? 1 : 0);
