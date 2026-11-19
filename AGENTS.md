# AGENTS.md

Static portfolio on GitHub Pages. Size and speed outrank everything. Decisions, budgets and the phase plan live in `tech_stack.md`; this file is how to execute them. Read both fully before editing.

Astro, Tailwind and Vite changed APIs recently. Where this file is silent about an API, read the docs for the installed major version; do not rely on memory.

## Hard constraints

1. Zero UI framework. `.astro` components only. No Svelte/React/Vue, no Three.js/Threlte, no GLB/Draco/KTX2 tooling.
2. The hero is raw WebGL2 in `src/lib/hero/`, lazy-loaded after `load` + idle. It must never run before `load`.
3. No third-party requests (no CDN fonts, analytics, embeds). No new dependency without a measured size justification.
4. Budgets in `tech_stack.md` section 1 are enforced by `npm run verify` and Lighthouse CI. Never raise a budget to make a build pass; fix the cause or stop and report.
5. The page must be fully readable with JavaScript disabled.

## Stack (majors pinned)

- Astro 7.x, `output: 'static'`. Vite 8/Rolldown, Rust compiler. **Node >= 22.22.0.**
- Tailwind CSS v4 via `@tailwindcss/vite` (CSS-first; no `tailwind.config.js`, no `@astrojs/tailwind`).
- Astro Content Collections (`src/content.config.ts`, `astro/loaders`, `astro/zod` = Zod 4).
- Astro Fonts API (`fonts` in config, `<Font />` from `astro:assets`).
- npm; commit `package-lock.json`. Deploy with `withastro/action` + `actions/deploy-pages`.

## Setup commands (no hand-written boilerplate)

Run `npm create astro@latest -- --help` if a flag is rejected. Scaffold in an empty directory; if `AGENTS.md`/`tech_stack.md` are already there, move them aside and restore them afterwards (never overwrite them).

```bash
npm create astro@latest . -- --template minimal --install --git --yes

npm i tailwindcss @tailwindcss/vite
npm i -D @astrojs/check typescript @lhci/cli

npm pkg set engines.node=">=22.22.0"
npm pkg set scripts.check="astro check"
npm pkg set scripts.verify="npm run check && npm run build && node scripts/size-budget.mjs"
npm pkg set scripts.lhci="lhci autorun"
echo 22 > .nvmrc

mkdir -p public/docs scripts .github/workflows \
  src/assets/icons src/assets/images src/components/ui src/content/projects \
  src/data src/layouts src/lib/hero src/pages src/styles
printf '.lighthouseci/\n' >> .gitignore
```

Register Tailwind manually (do not run `astro add tailwind`; verify its output against the Tailwind docs if you do). Do not add `vite` to `package.json` or `overrides`: Astro 7 owns Vite 8, and a mismatch breaks `@tailwindcss/vite` (Rolldown resolver errors).

Daily commands:

```bash
npm run dev                         # http://localhost:4321
npm run check                       # types + .astro diagnostics
npm run build -- --timings          # production build with timing report
npm run preview                     # serve dist/ on :4321
npm run verify                      # check + build + byte budgets
npm run build && npm run lhci       # Lighthouse CI, mobile profile
npm run lhci -- --collect.settings.preset=desktop
npx @astrojs/upgrade                # upgrade Astro + official integrations together
```

Content actions:

- Add a project/research item: create `src/content/projects/<slug>.md` (frontmatter below).
- Add a qualification: append an entry (unique `id`) to `src/data/qualifications.yaml` and put the PDF in `public/docs/`. Confirm the file exists at its `pdfUrl`.

## Config files

`astro.config.mjs`:

```js
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://<user>.github.io',        // or the custom domain
  // base: '/<repo>',                      // ONLY for project pages; omit for <user>.github.io or custom domain
  output: 'static',
  build: { inlineStylesheets: 'always' },  // single inlined stylesheet: no render-blocking CSS request
  vite: { plugins: [tailwindcss()] },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: '<Family from landing_page.png>',   // ask the owner if unknown; do not guess
      cssVariable: '--font-brand',
      weights: ['300 600'],                     // exact variable range if the family is variable; otherwise explicit weights actually used
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['sans-serif'],
    },
  ],
});
```

If the preloaded woff2 exceeds 35 KB, subset locally (`pip install fonttools brotli`) and switch to `fontProviders.local()`:

```bash
pyftsubset Font.ttf --unicodes="U+0020-007E,U+00A0-00FF,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2026" \
  --layout-features="kern,liga" --flavor=woff2 --output-file=src/assets/fonts/brand.woff2
```

`src/styles/global.css`:

```css
@import "tailwindcss";
@theme inline { --font-sans: var(--font-brand); }
html { color-scheme: dark; background: #000; }
.hero-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block;
  opacity: 0; transition: opacity .6s ease; pointer-events: none; }
.hero-canvas[data-ready] { opacity: 1; }
@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
```

`src/lib/url.ts`:

```ts
export const withBase = (p: string) => import.meta.env.BASE_URL.replace(/\/$/, '') + p;
```

All internal links, PDFs and `public/` assets go through `withBase`. Navigation is anchors (`#projects`, `#research`, `#contact`) on one page.

`src/layouts/BaseLayout.astro` head (no JS in the layout):

```astro
---
import { Font } from 'astro:assets';
import '../styles/global.css';
import { withBase } from '../lib/url';
const { title, description } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <meta name="theme-color" content="#000000" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={new URL(Astro.url.pathname, Astro.site)} />
    <link rel="icon" href={withBase('/favicon.svg')} type="image/svg+xml" />
    <Font cssVariable="--font-brand" preload />
  </head>
  <body class="bg-black font-sans text-neutral-100"><slot /></body>
</html>
```

`src/content.config.ts`:

```ts
import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';

const pdf = z.string().regex(/^\/docs\/[\w.-]+\.pdf$/);

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    kind: z.enum(['project', 'research']).default('project'),
    liveUrl: z.url().optional(),
    repoUrl: z.url().optional(),
    pdfUrl: pdf.optional(),
    featured: z.boolean().default(false),
  }),
});

const qualifications = defineCollection({
  loader: file('./src/data/qualifications.yaml'),   // each entry needs a unique `id`
  schema: z.object({
    title: z.string(),
    issuer: z.string(),
    date: z.coerce.date(),
    credentialId: z.string().optional(),
    pdfUrl: pdf.optional(),
  }),
});

export const collections = { projects, qualifications };
```

`src/data/qualifications.yaml` shape:

```yaml
- id: example-cert
  title: Example Certificate
  issuer: Example Org
  date: 2026-01-15
  credentialId: ABC123
  pdfUrl: /docs/example-cert.pdf
```

Query with `getCollection('projects')` (filter on `kind`), sort by `date` desc.

## Hero implementation

Spec: `tech_stack.md` section 4B. Composition reference: `landing_page.png`. Files:

- `src/components/ui/Hero.astro`: static markup + placeholder + canvas + bootstrap script.
- `src/lib/hero/config.ts`: constants (point counts, tilt limits, frame intervals, DPR clamp).
- `src/lib/hero/shaders.ts`: GLSL ES 3.00 strings.
- `src/lib/hero/grid.ts`: `export function mountHero(canvas: HTMLCanvasElement): () => void` (returns cleanup).

Bootstrap in `Hero.astro` (Astro bundles `<script>`; the dynamic import becomes a separate lazy chunk):

```astro
<div class="hero-bg" aria-hidden="true">
  <canvas id="hero-canvas" class="hero-canvas"></canvas>
</div>
<script>
  type Conn = Navigator & { connection?: { saveData?: boolean } };
  const canvas = document.getElementById('hero-canvas') as HTMLCanvasElement | null;
  if (canvas && !(navigator as Conn).connection?.saveData) {
    const start = () => import('../../lib/hero/grid').then((m) => m.mountHero(canvas)).catch(() => {});
    const idle = () =>
      'requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 3000 }) : setTimeout(start, 1500);
    document.readyState === 'complete' ? idle() : addEventListener('load', idle, { once: true });
  }
</script>
```

`.hero-bg` is `absolute inset-0 z-0` with a CSS-only placeholder (radial gradients / dot pattern); content sits above it at `relative z-10`. Add a left-edge mask so the headline stays legible.

Shader contract (skeleton: structure is the contract, numbers are untuned starting points):

```glsl
// vertex
#version 300 es
uniform vec2 uGrid;            // cols, rows
uniform vec2 uRes;             // canvas px
uniform float uTime, uSize, uDpr;
uniform vec4 uRot;             // sinYaw, cosYaw, sinPitch, cosPitch
out float vAlpha;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  float ix = mod(float(gl_VertexID), uGrid.x);
  float iz = floor(float(gl_VertexID) / uGrid.x);
  vec2 g = vec2(ix, iz) / (uGrid - 1.0) - 0.5;
  g += (vec2(hash(vec2(ix, iz)), hash(vec2(iz, ix) + 7.3)) - 0.5) / uGrid.x;   // jitter
  vec3 p = vec3(g.x * 4.0, 0.0, g.y * 2.5);
  p.y = 0.18 * sin(p.x * 3.0 + uTime * 0.6) + 0.12 * sin(p.z * 4.0 - uTime * 0.45);
  p.xz = mat2(uRot.y, -uRot.x, uRot.x, uRot.y) * p.xz;                          // yaw
  p.yz = mat2(uRot.w, -uRot.z, uRot.z, uRot.w) * p.yz;                          // pitch
  p.z += 3.0;                                                                   // camera distance
  vec2 ndc = vec2(p.x * 1.6 * uRes.y / uRes.x, p.y * 1.6) / p.z;
  gl_Position = vec4(ndc, 0.0, 1.0);
  gl_PointSize = max(1.0, uSize * uDpr / p.z);
  vAlpha = clamp(1.4 - p.z * 0.25, 0.0, 1.0) * smoothstep(-0.95, 0.15, ndc.x);  // depth fade x left-edge fade
}
// fragment
#version 300 es
precision mediump float;
in float vAlpha;
out vec4 o;
void main() {
  float a = smoothstep(0.5, 0.15, length(gl_PointCoord - 0.5)) * vAlpha;
  o = vec4(vec3(a), a);                                                         // premultiplied white
}
```

Implementation order (verify each step before the next): static frame -> time animation -> tilt -> loop gating -> resize/DPR -> reduced-motion, `hover: none`, `saveData`, context loss -> deferred load + fade-in (`canvas.dataset.ready = ''` after first frame) -> cleanup.

GL rules: `getContext('webgl2', { alpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' })`; empty VAO and `drawArrays(POINTS, 0, cols * rows)` (no buffers; if a target fails, bind one dummy 1-float buffer); `gl.enable(BLEND)` with `blendFunc(ONE, ONE_MINUS_SRC_ALPHA)`; `KHR_parallel_shader_compile` when available (poll `COMPLETION_STATUS_KHR` before first draw); cache uniform locations; no per-frame allocations; DPR clamp 1.5.

Loop rules: rAF runs only while hero is intersecting AND `!document.hidden` AND motion allowed; cancel otherwise and restart on resume. Frame cap 60 fps desktop / 30 fps mobile. Passive `pointermove` on `window`, ignore touch, damped with `1 - Math.exp(-6 * dt)`. Verify in DevTools Performance that no frames are produced offscreen or in a background tab.

## Verification scripts

`scripts/size-budget.mjs`:

```js
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
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(26)} ${(size / KB).toFixed(1)} KB / ${(limit / KB).toFixed(0)} KB`);
}
process.exit(failed ? 1 : 0);
```

`lighthouserc.json` (median of 5; if `base` is set, include it in the URL; verify the ready pattern matches `astro preview` output):

```json
{
  "ci": {
    "collect": {
      "startServerCommand": "npm run preview -- --host 127.0.0.1 --port 4321",
      "startServerReadyPattern": "Local|localhost|127.0.0.1",
      "url": ["http://127.0.0.1:4321/"],
      "numberOfRuns": 5,
      "settings": { "onlyCategories": ["performance"], "chromeFlags": "--no-sandbox --headless=new" }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.97 }],
        "total-blocking-time": ["error", { "maxNumericValue": 30 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.001 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 1600 }],
        "first-contentful-paint": ["warn", { "maxNumericValue": 1200 }],
        "total-byte-weight": ["error", { "maxNumericValue": 90000 }]
      }
    },
    "upload": { "target": "filesystem", "outputDir": ".lighthouseci" }
  }
}
```

`.github/workflows/deploy.yml` (action tags per Astro docs as of Nov 2026; confirm the latest majors before committing):

```yaml
name: Deploy
on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages-${{ github.ref }}
  cancel-in-progress: true
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run verify
      - run: npm run lhci
      - run: npm run lhci -- --collect.settings.preset=desktop
  build:
    if: github.event_name != 'pull_request'
    needs: verify
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: withastro/action@v6
        with:
          node-version: 22
  deploy:
    if: github.event_name != 'pull_request'
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

One-time: repo Settings -> Pages -> Source = GitHub Actions. Custom domain: `public/CNAME` with the domain, `site` set to it, no `base`.

## Astro 7 pitfalls

- Rust compiler: unclosed tags and invalid nesting (`<div>` inside `<p>`) are build errors.
- `compressHTML` defaults to `'jsx'`: whitespace across newlines between inline elements is dropped. Use `{' '}` where a visible space is required (nav, icon rows, CTA arrow).
- `src/fetch.ts` is a reserved filename (advanced routing). Never create it.
- `import.meta.env` is inlined at build time. No secrets in this repo.
- Do not configure `manualChunks`/chunk splitting; the dynamic import is the boundary. If hero code appears in the page's main bundle, fix the import, not the config.
- Do not use view transitions (`ClientRouter`), `astro:prefetch`, or any `client:*` directive.
- Logo and icons: `import svg from '../assets/logo.svg?raw'` rendered with `<Fragment set:html={svg} />`. The CTA arrow is an inline SVG, not a font glyph.
- Tailwind v4: tokens in `@theme`; no `@apply` chains; scan is automatic.

## Execution plan

Follow `tech_stack.md` section 9 in order; do not start a phase until the previous gate passes. After each phase run `npm run verify`, then `npm run build && npm run lhci` (mobile and desktop) and put the scores plus gzip sizes in the commit message.

0. Inputs and decisions (repo location/domain, font, PDFs, logo, icons, copy).
1. Scaffold + static shell (zero JS). Gate: Lighthouse 99+, CLS 0, HTML <= 10 KB, font <= 25 KB.
2. Hero module (implementation order above). Gate: hero chunk <= 6 KB gz, TBT <= 30 ms, Lighthouse >= 97, no frames offscreen. If TBT fails: confirm parallel shader compile -> delay start to `load` + 2 s or first pointer/scroll -> Worker + `OffscreenCanvas`. No libraries.
3. Content collections and sections. Gate: new project and qualification added with no code change.
4. CI/CD. Gate: a PR with a deliberately broken budget fails; `main` deploys; production score within 2 points of local.
5. QA: keyboard/focus order, skip link, contrast over the hero, iOS Safari / Firefox / Android Chrome, SEO meta, 404, reduced-motion and `hover: none` paths.
6. Maintenance: any new dependency or asset needs a size justification and a passing verify.

## Definition of done

1. `npm run verify` passes with no warnings.
2. Lighthouse (mobile and desktop) meets the gates in `tech_stack.md` section 1.
3. Page is readable and navigable with JS disabled; placeholder shows if WebGL fails.
4. Reduced-motion, `hover: none`, `saveData`, background-tab and offscreen behavior verified.
5. Resume and certificate PDFs open under the configured `base`.
6. No console errors; no layout shift on load.

## Stop and report (do not improvise)

- A budget cannot be met after the documented mitigations.
- A required API differs from this file or the installed version's docs.
- A change would add a dependency, a framework, a third-party request, or a new rendering engine.
- The font or the design reference is ambiguous.
