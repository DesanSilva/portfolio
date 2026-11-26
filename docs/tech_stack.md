# Technical Architecture & Tech Stack Specification (v2)

Static portfolio hosted on GitHub Pages. **Size and speed outrank every other concern.** The hero is an animated 3D point grid that tilts with the mouse; it must never delay or compete with first render.

Companion file: `AGENTS.md` (commands, code, rules for coding agents). This file holds the decisions, budgets and plan; numbers here and there must match.

---

## 1. Targets and budgets

All metrics are lab measurements (Lighthouse via LHCI, median of 5 runs, built site served by `astro preview`). The CI gate is looser than the target to absorb run variance.

| Metric | Target | CI gate |
|:--|:--|:--|
| Lighthouse Performance (mobile and desktop) | 98-100 | >= 97 |
| Total Blocking Time | 0 ms | <= 30 ms |
| Cumulative Layout Shift | 0 | <= 0.001 |
| LCP (mobile, simulated) | <= 1.2 s | <= 1.6 s |
| FCP (mobile, simulated) | <= 1.0 s | <= 1.2 s (warn) |
| Framework runtime JS | 0 KB | 0 KB |
| HTML per page, gzip, CSS inlined | <= 10 KB | <= 14 KB |
| Hero JS chunk, gzip, lazy | <= 4 KB | <= 6 KB |
| Total JS shipped, gzip | <= 6 KB | <= 8 KB |
| Primary font, woff2, preloaded | <= 25 KB | <= 35 KB |
| Total transfer on load (Lighthouse `total-byte-weight`) | <= 60 KB | <= 90 KB |

Note on v1's "FCP < 0.8 s": under Lighthouse's simulated slow-4G mobile profile, connection setup (RTT-bound) consumes most of that budget regardless of page weight, so 0.8 s is not a meaningful mobile gate. It remains a reasonable desktop expectation.

---

## 2. Decisions and what changed from v1

| Area | v1 | v2 | Why |
|:--|:--|:--|:--|
| UI layer | Svelte 5 island | None. `.astro` components only | The only interactive element is one canvas; nav, CTAs, cards are static. A framework adds runtime, hydration and a build integration for nothing. |
| 3D engine | Threlte / Three.js | Raw WebGL2, one draw call | Three.js's renderer alone is on the order of 100+ KB gzip (verify with the build); the grid is a single procedural `POINTS` draw. Main-thread parse and init cost makes 0 ms TBT unrealistic with Three. |
| Hydration | `client:visible` / `client:idle` islands | Plain `<script>` + dynamic `import()` after `load` + idle | `client:visible` fires immediately for an above-the-fold hero; islands are unnecessary without a framework. |
| Render loop | `frameloop="demand"` (not Threlte 8 API; would freeze the animation) | Explicit `requestAnimationFrame` loop gated by visibility, tab state, reduced motion, frame cap | The grid animates continuously; only pausing when unseen saves power. |
| Model pipeline | Draco / Meshopt / KTX2 / gltf-transform | Removed | Hero is procedural; decoders are WASM payload for nothing. Re-introduce only if a real `.glb` page is added (own lazy page). |
| Chunking | `rollupOptions` split of `three`/`@threlte` | Removed | Dynamic `import()` is the chunk boundary. Vite 8 (Rolldown) changed chunking internals; hand-tuned splits are fragile. |
| Content config | `src/content/config.ts`, Zod 3 | `src/content.config.ts`, loaders, `astro/zod` (Zod 4) | Legacy collections were removed in Astro 6. |
| Fonts | "font preloads" (unspecified) | Astro built-in Fonts API, one preloaded face | Automatic preload and size-adjusted fallbacks (no CLS). |
| `compressHTML: true` | Set | Default (`'jsx'` in Astro 7) | Keep defaults; mind inline whitespace (see AGENTS.md). |
| PDF/asset URLs | Absolute `/docs/...` | `withBase()` helper | Absolute paths break under a project-page `base`. |
| Verification | None | Size-budget script + Lighthouse CI in the workflow | Budgets that are not enforced decay. |
| Project schema | `modelPath` | Removed; added `kind` (project / research) and `pdfUrl` | No models; Research section needs papers. |

---

## 3. Core stack

| Layer | Technology | Notes |
|:--|:--|:--|
| Meta-framework | **Astro 7.x**, `output: 'static'` | Vite 8 (Rolldown), Rust compiler. **Node >= 22.22.0.** Zero client JS by default. |
| UI | `.astro` components | No UI framework. No view transitions, no prefetch script. |
| Hero engine | **Vanilla TypeScript + WebGL2** (`src/lib/hero/`) | ~4 KB gzip target. Grid derived from `gl_VertexID`: no vertex buffers. |
| Styling | **Tailwind CSS v4** via `@tailwindcss/vite` | CSS-first (`@theme`). Output inlined into HTML (`build.inlineStylesheets: 'always'`). Requires modern browsers (roughly Chrome 111+, Safari 16.4+, Firefox 128+). |
| Fonts | **Astro Fonts API** | Fontsource provider (or local subsetted file if over budget). One preloaded variable face, latin subset. |
| Content | **Astro Content Collections** | `glob()` for Markdown, `file()` for YAML. Validated at build. |
| Icons / logo | Inline SVG (`?raw` import) | No icon libraries or fonts. |
| Hosting / CI | **GitHub Pages + GitHub Actions** (`withastro/action`) | Lighthouse CI + size budgets gate deploys. |
| Package manager | npm | Commit `package-lock.json`. |

---

## 4. Architecture rules

### A. Rendering and JS
- Every page is fully rendered HTML. The page must be readable and navigable with JavaScript disabled.
- The h1 (name) is the LCP element: real text in the first response, never JS-rendered.
- Only script on the page: the hero bootstrap (inline, <= 600 B) and the lazily imported hero module.
- Never add a UI framework, a router, analytics, or any third-party request.

### B. Hero engine
Composition reference: `landing_page.png` (diagonal point surface rising toward the top-right; sparse and faded toward the left under the headline). Headline contrast >= 4.5:1 outranks visual fidelity.

**Loading**
1. HTML ships a CSS-only placeholder (radial gradients / faint dot pattern) behind the text and an empty `<canvas aria-hidden="true">`.
2. A tiny inline bootstrap waits for `load`, then `requestIdleCallback(start, { timeout: 3000 })` (Safari: `setTimeout` fallback), then `import('../lib/hero/grid')`. Never earlier than `load`.
3. Skip entirely if `navigator.connection?.saveData`. On any failure (no WebGL2, import error, context loss) the placeholder simply stays.
4. Canvas fades in after the first rendered frame.

**Rendering**
- Context: `getContext('webgl2', { alpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' })`.
- Geometry: none uploaded. `drawArrays(POINTS, 0, cols * rows)` with an empty VAO; the vertex shader derives grid position from `gl_VertexID`, adds hashed jitter (organic scatter), displaces height with 2-3 layered sines plus a slow ripple driven by `uTime`, rotates by the tilt, and applies perspective in-shader. No matrices uploaded beyond sin/cos pairs. If a target browser fails the attribute-less draw, bind one dummy 1-float buffer.
- Fragment: round soft point (`gl_PointCoord`), premultiplied-alpha output, blend `ONE, ONE_MINUS_SRC_ALPHA`, alpha from depth fade x a screen-space left-edge fade (keeps the headline clear).
- Point count: <= 30,000 desktop; <= 10,000 when `(max-width: 768px)` or `hardwareConcurrency <= 4`. Point size in device pixels, DPR clamped to 1.5.
- Shader build: use `KHR_parallel_shader_compile` when available (poll `COMPLETION_STATUS_KHR` before first draw) so linking never blocks the main thread.

**Interaction**
- Passive `pointermove` on `window` (canvas is `pointer-events: none`). Ignore `pointerType === 'touch'`.
- Normalize to [-1, 1]; target yaw <= 0.20 rad, pitch <= 0.12 rad; critically damped each frame with `1 - exp(-6 * dt)`. Ease back to neutral after the pointer leaves or idles.
- No tilt when `(hover: none)`; the time-driven wave continues.

**Loop control**
- Animate only while: hero intersects the viewport (IntersectionObserver), `!document.hidden`, and `prefers-reduced-motion` is not `reduce`. Cancel `requestAnimationFrame` otherwise.
- Frame cap: 60 fps desktop, 30 fps mobile.
- Reduced motion: render one static frame (re-render on resize); no loop, no tilt. React to changes of the media query.
- `ResizeObserver` on the hero container; canvas backing size = CSS size x min(dpr, 1.5).
- `webglcontextlost`: `preventDefault()`, stop, fade the canvas out (placeholder shows). Do not attempt restoration in v1.
- Cleanup function returned by `mountHero()` cancels the loop, disconnects observers, removes listeners, deletes GL objects, and calls `WEBGL_lose_context.loseContext()`.

**TBT escalation ladder** (apply in order only if the gate fails after measuring): (1) confirm parallel shader compile is active; (2) delay start to `load` + 2 s or the first pointer/scroll event, whichever is first; (3) move rendering to a Worker with `OffscreenCanvas` (post pointer, resize and visibility messages; verify browser support first). Do not add a library at any step.

### C. Fonts and images
- One font family from the design; one preloaded face (variable if available), latin subset, `display: swap`, Astro-generated size-adjusted fallback. Preload nothing else.
- If the woff2 exceeds the budget, subset locally (`pyftsubset`) and serve through the local provider.
- 2D raster images (project thumbnails): `<Image />` from `astro:assets`, explicit width/height, `loading="lazy"`, `decoding="async"`, AVIF or WebP, <= 40 KB each. None above the fold.

### D. PDFs
- Store in `public/docs/` (resume, certificates, papers). Link via `withBase('/docs/<file>.pdf')` with `target="_blank" rel="noopener noreferrer"`; resume may add `download`. Never embed a PDF viewer.

### E. CSS
- Single Tailwind v4 stylesheet, inlined. No `@apply` chains, no component libraries, no runtime CSS-in-JS. Single dark theme (`color-scheme: dark`).

### F. Base path
- Prefer a `<user>.github.io` repository or custom domain (no `base`). If a project page is unavoidable, set `base` and route every internal URL and `public/` asset through `withBase()`.

---

## 5. Directory blueprint

```text
/
├── .github/workflows/deploy.yml       # verify (PR + main) -> build -> deploy (main only)
├── public/
│   ├── docs/                          # resume.pdf, certificates, papers
│   ├── favicon.svg
│   ├── og.png                         # 1200x630, optional
│   └── CNAME                          # only with a custom domain
├── scripts/size-budget.mjs            # byte budgets (see AGENTS.md)
├── src/
│   ├── assets/{logo.svg,icons/*.svg,images/}
│   ├── components/ui/                 # Header, Hero, Section, ProjectCard, ResearchItem,
│   │                                  # QualificationItem, PdfLink, Icon  (all .astro)
│   ├── content/projects/*.md          # projects and research items (kind field)
│   ├── data/qualifications.yaml
│   ├── layouts/BaseLayout.astro       # head, Font preload, meta; no JS
│   ├── lib/
│   │   ├── hero/{config.ts,shaders.ts,grid.ts}
│   │   └── url.ts                     # withBase()
│   ├── pages/{index.astro,404.astro}
│   ├── styles/global.css              # @import "tailwindcss"; @theme
│   └── content.config.ts
├── astro.config.mjs
├── lighthouserc.json
├── package.json  tsconfig.json  .nvmrc
├── AGENTS.md  tech_stack.md
```

---

## 6. Content model (`src/content.config.ts`)

Adding content never touches UI code.

1. **`projects`** (`src/content/projects/*.md`, loader `glob`): `title`, `description`, `date`, `tags[]`, `kind` (`project` | `research`, default `project`), `liveUrl?`, `repoUrl?`, `pdfUrl?` (`/docs/*.pdf`), `featured` (bool). Research section = `kind: research`.
2. **`qualifications`** (`src/data/qualifications.yaml`, loader `file`; every entry needs a unique `id`): `title`, `issuer`, `date`, `credentialId?`, `pdfUrl?` (`/docs/*.pdf`).

Page v1 is a single page: hero, Projects, Research (papers + qualifications), Contact (`mailto:` + social links). Markdown bodies and per-project routes are deferred.

---

## 7. Build and hosting configuration

- `astro.config.mjs`: `output: 'static'`, `site`, `build.inlineStylesheets: 'always'`, `vite.plugins: [tailwindcss()]`, `fonts: [...]`. No `integrations` beyond what is later justified by a budget check. No `base` unless required.
- Do not add `vite` to `package.json` or `overrides`; Astro 7 owns Vite 8, and a mismatch breaks `@tailwindcss/vite`.
- GitHub Pages constraints: `Cache-Control` and other headers are not configurable (no CSP or `Link` preload headers, short cache lifetime). Mitigation is structural: inlined CSS, one font preload, tiny payload. No workarounds.
- Deploy via `withastro/action` + `actions/deploy-pages`; the workflow verifies budgets before building the deploy artifact.

---

## 8. Risks and escape hatches

| Risk | Detection | Response |
|:--|:--|:--|
| TBT above gate from hero init | LHCI `total-blocking-time` | Escalation ladder (section 4B) |
| Font over budget | `size-budget.mjs` | Local subset via `pyftsubset`; fewer weights |
| Dependency upgrade inflates JS (e.g. Vite/Rolldown chunking) | `size-budget.mjs` after every upgrade | Revert or pin; investigate chunk output |
| `@tailwindcss/vite` / Vite mismatch | Build error mentioning Rolldown or `tsconfigPaths` | Remove stray `vite` dependency/override; `npx @astrojs/upgrade` |
| WebGL2 missing or context lost | Manual test | Placeholder stays; no error UI |
| Lighthouse variance | Score swings of a few points | Median of 5; gate at 97 not 98 |
| Astro major upgrade | `npx @astrojs/upgrade`, read upgrade guide | Re-run full verify before merging |

---

## 9. Development plan

Each phase has an exit gate. Do not start the next phase until the gate passes; record scores in the commit message.

**Phase 0: Decisions and inputs (~1 h).** Decide repo location (`<user>.github.io` or custom domain, avoiding `base`). Choose the font family from the design. Collect: `resume.pdf`, certificate/paper PDFs, logo SVG, social icon SVGs, project/research copy. Install Node >= 22.22.0.
*Gate:* inputs available; `node -v` OK.

**Phase 1: Scaffold and static shell (~3-4 h).** Scaffold Astro, add Tailwind v4, Fonts API, `BaseLayout`, `Header`, `Hero` (h1, tagline, CTAs, CSS placeholder background), empty Projects/Research/Contact sections, `withBase`, `404`. No JS.
*Gate:* build clean; zero JS shipped; Lighthouse mobile and desktop 100 (or 99+); CLS 0; HTML <= 10 KB gzip; font <= 25 KB.

**Phase 2: Hero WebGL2 module (~4-6 h).** Implement in this order: (1) static frame (shader, draw, composition vs `landing_page.png`); (2) time animation; (3) tilt with damping; (4) loop gating (visibility, tab, frame cap); (5) resize and DPR clamp; (6) reduced motion, `hover: none`, `saveData`, context loss; (7) deferred loading and fade-in; (8) cleanup.
*Gate:* hero chunk <= 6 KB gzip; no frames while offscreen or backgrounded (DevTools Performance); Lighthouse >= 97 with TBT <= 30 ms. If TBT fails, climb the escalation ladder.

**Phase 3: Content (~3-4 h).** Collections and schemas, Projects cards, Research list (papers with PDF links), Qualifications from YAML, Contact section, thumbnails via `<Image />`.
*Gate:* adding a project (one `.md`) and a qualification (one YAML entry + PDF) requires no code change; build validates schemas; budgets still pass.

**Phase 4: CI/CD (~1-2 h).** `lighthouserc.json`, `scripts/size-budget.mjs`, `deploy.yml`, Pages source = GitHub Actions, optional custom domain.
*Gate:* a PR runs verify and fails when a budget is deliberately broken; merge to `main` deploys; production URL scores within 2 points of local.

**Phase 5: QA and polish (~2-3 h).** Keyboard and focus order, skip link, contrast over the hero, iOS Safari / Firefox / Android Chrome checks, tilt feel, SEO meta (title, description, canonical, OG), 404, real-device Lighthouse sanity.
*Gate:* definition of done in `AGENTS.md` fully checked.

**Phase 6: Maintenance.** Any new dependency or asset needs a size justification and a passing verify. Upgrade Astro with `npx @astrojs/upgrade` and re-run all gates.

---

## 10. Non-goals

SSR or adapters, CMS, client-side routing or view transitions, UI framework islands, Three.js/Threlte, GLB/Draco/KTX2 pipelines, PDF.js, analytics, comments, search, light/dark toggle, i18n. Revisit only with a measured, budgeted reason.
