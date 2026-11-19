// Deterministic gate for the build loop.
//   node scripts/gate.mjs [--skip-3d] [--full]    run the gate (writes .agent/gate-report.json, exit 1 on failure)
//   node scripts/gate.mjs --lock                  freeze the locked files (after human review of the Phase 0 spec)
// Needs: npm i -D playwright && npx playwright install chromium
// The worker must not edit this file (hash-checked via .agent/LOCK.json).
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const argv = process.argv.slice(2);
const PORT = 4321;
const BASE = `http://127.0.0.1:${PORT}/`;
const RENDER = process.env.RENDER_DIR ?? '.render';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
const designs = readdirSync('design').filter((f) => f.endsWith('.png')).sort().map((f) => `design/${f}`);
const specs = existsSync('.agent/spec')
  ? readdirSync('.agent/spec').filter((f) => f.endsWith('.md')).sort().map((f) => `.agent/spec/${f}`)
  : [];
const LOCKED = [
  'scripts/gate.mjs', 'REQUIREMENTS.md', 'AGENTS.md', 'tech_stack.md', '.agent/expect.json',
  'lighthouserc.json', 'scripts/size-budget.mjs', ...specs, ...designs,
];

if (argv.includes('--lock')) {
  const lock = Object.fromEntries(LOCKED.filter(existsSync).map((f) => [f, sha(f)]));
  writeFileSync('.agent/LOCK.json', JSON.stringify(lock, null, 2));
  console.log(`locked ${Object.keys(lock).length} files`);
  process.exit(0);
}

const results = [];
const check = (id, ok, detail = '') => {
  results.push({ id, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id}${detail ? `  (${detail})` : ''}`);
  return Boolean(ok);
};
const finish = () => {
  const pass = results.every((r) => r.ok);
  mkdirSync('.agent', { recursive: true });
  writeFileSync('.agent/gate-report.json', JSON.stringify({ at: new Date().toISOString(), pass, results }, null, 2));
  process.exit(pass ? 0 : 1);
};
const npm = (args) => spawnSync('npm', args, { stdio: 'inherit', shell: true }).status === 0;

// 1. Locked files unchanged
const lock = existsSync('.agent/LOCK.json') ? JSON.parse(readFileSync('.agent/LOCK.json', 'utf8')) : null;
const tampered = Object.entries(lock ?? {}).filter(([f, h]) => !existsSync(f) || sha(f) !== h).map(([f]) => f);
check('LOCK', lock && !tampered.length, lock ? tampered.join(', ') : 'missing: run --lock after spec review');

// 2. Type check, build, byte budgets
if (!check('R-PERF-1 verify (check + build + size budgets)', npm(['run', 'verify']))) finish();

// 3. Lighthouse (only with --full)
if (argv.includes('--full')) {
  check('R-PERF-2 lighthouse mobile', npm(['run', 'lhci']));
  check('R-PERF-2 lighthouse desktop', npm(['run', 'lhci', '--', '--collect.settings.preset=desktop']));
}

// 4. Browser checks against the built site
const expected = JSON.parse(readFileSync('.agent/expect.json', 'utf8'));
const dims = (f) => {
  const b = readFileSync(f);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};
const sc = expected.screens[0].scale ?? 1;
const d0 = dims(expected.screens[0].file);
const vp = { width: Math.round(d0.w / sc), height: Math.round(d0.h / sc) };

// Test-only instrumentation: observes WebGL calls without touching production code.
const hook = () => {
  window.__gl = { draws: 0, first: 0, u4: {} };
  if (!window.WebGL2RenderingContext) return;
  const P = WebGL2RenderingContext.prototype;
  const ids = new WeakMap();
  let n = 0;
  const draw = P.drawArrays;
  P.drawArrays = function (...a) {
    window.__gl.draws++;
    window.__gl.first ||= performance.now();
    return draw.apply(this, a);
  };
  for (const name of ['uniform4f', 'uniform4fv']) {
    const orig = P[name];
    P[name] = function (loc, ...a) {
      if (loc) {
        if (!ids.has(loc)) ids.set(loc, ++n);
        window.__gl.u4[ids.get(loc)] = JSON.stringify(a[0] && typeof a[0] === 'object' ? [...a[0]] : a.slice(0, 4));
      }
      return orig.call(this, loc, ...a);
    };
  }
};

const server = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(PORT)], {
  stdio: 'ignore',
  shell: true,
  detached: process.platform !== 'win32',
});
const stop = () =>
  process.platform === 'win32' ? spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F']) : process.kill(-server.pid);

let browser;
try {
  let up = false;
  for (let i = 0; i < 80 && !up; i++) {
    up = await fetch(BASE).then((r) => r.ok, () => false);
    if (!up) await sleep(250);
  }
  if (!check('preview server', up)) throw new Error('preview did not start');

  // No-JS path: served HTML already contains the copy (R-SCOPE-2, R-3D-4)
  const norm = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const html = await (await fetch(BASE)).text();
  const text = norm(html);
  const missing = expected.screens.flatMap((s) => (s.texts ?? []).filter((t) => !text.includes(norm(t).trim())));
  check('R-SCOPE-2 copy present without JS', !missing.length, missing.join(' | '));
  check('R-A11Y-1 exactly one h1', (html.match(/<h1[\s>]/g) ?? []).length === 1);

  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const open = async (opts = {}) => {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: sc, ...opts });
    await ctx.addInitScript(hook);
    const page = await ctx.newPage();
    page.errors = [];
    page.on('pageerror', (e) => page.errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && page.errors.push(m.text()));
    await page.goto(BASE, { waitUntil: 'load' });
    return page;
  };
  const draws = (p) => p.evaluate(() => window.__gl.draws);
  const u4 = (p) => p.evaluate(() => JSON.stringify(window.__gl.u4));

  // Screens: structure, copy, links, render for the critic (canvas hidden)
  const page = await open();
  check('R-SCOPE-1 screen count', (await page.locator('[data-screen]').count()) === expected.screens.length, `expected ${expected.screens.length}`);
  await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}canvas{visibility:hidden!important}' });
  mkdirSync(RENDER, { recursive: true });
  for (const [i, s] of expected.screens.entries()) {
    await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: 'start' }), s.selector);
    await sleep(150);
    await page.screenshot({ path: `${RENDER}/screen-${i + 1}.png` });
    const bad = [];
    for (const t of s.texts ?? []) {
      const box = await page.getByText(t, { exact: false }).first().boundingBox({ timeout: 2000 }).catch(() => null);
      if (!box || box.y < -1 || box.y + box.height > vp.height + 1) bad.push(t);
    }
    check(`R-SCOPE-2 screen ${i + 1} copy inside viewport`, !bad.length, bad.join(' | '));
    const badLinks = [];
    for (const l of s.links ?? []) {
      const href = await page.locator('a', { hasText: l.text }).first().getAttribute('href', { timeout: 2000 }).catch(() => null);
      if (!href || !href.includes(l.hrefContains)) badLinks.push(l.text);
    }
    check(`R-SCOPE-2 screen ${i + 1} links`, !badLinks.length, badLinks.join(' | '));
  }

  // Mobile: no horizontal overflow
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mp = await mctx.newPage();
  await mp.goto(BASE, { waitUntil: 'load' });
  check('R-SCOPE-4 no horizontal overflow at 390px', await mp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));

  // 3D behaviour (observed through WebGL call hooks)
  if (!argv.includes('--skip-3d')) {
    const p = await open();
    const ready = await p.waitForSelector('canvas[data-ready]', { timeout: 8000 }).then(() => true, () => false);
    check('R-3D-1 hero renders a first frame', ready);
    if (ready) {
      const [first, loaded] = await p.evaluate(() => [window.__gl.first, performance.getEntriesByType('navigation')[0].loadEventEnd]);
      check('R-3D-4 hero starts after load', first >= loaded, `${Math.round(first)} vs ${Math.round(loaded)} ms`);
      let a = await draws(p);
      await sleep(700);
      let b = await draws(p);
      check('R-3D-3 animates while visible', b - a >= 5, `${b - a} draws / 0.7 s`);
      await p.mouse.move(vp.width * 0.1, vp.height * 0.1, { steps: 5 });
      await sleep(1200);
      const t1 = await u4(p);
      await p.mouse.move(vp.width * 0.9, vp.height * 0.9, { steps: 5 });
      await sleep(1200);
      const t2 = await u4(p);
      check('R-3D-2 pointer tilts the grid', t1 !== t2);
      await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await sleep(600);
      a = await draws(p);
      await sleep(800);
      b = await draws(p);
      check('R-3D-3 loop pauses offscreen', b - a <= 1, `${b - a} draws while offscreen`);
      await p.evaluate(() => window.scrollTo(0, 0));
      await sleep(600);
      a = await draws(p);
      await sleep(500);
      b = await draws(p);
      check('R-3D-3 loop resumes on return', b - a >= 3, `${b - a} draws / 0.5 s`);
    }
    check('R-QA-1 no console errors', !p.errors.length, p.errors[0] ?? '');

    const rp = await open({ reducedMotion: 'reduce' });
    await sleep(4000);
    a = await draws(rp);
    await sleep(1000);
    b = await draws(rp);
    check('R-3D-3 reduced motion: static frame, no loop', a >= 1 && b - a <= 1, `${a} draws, +${b - a}/1 s`);
  }
} catch (e) {
  check('gate crashed', false, String(e).slice(0, 200));
} finally {
  await browser?.close();
  try {
    stop();
  } catch {}
}
finish();
