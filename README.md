# Desan Silva — Portfolio

One-page static portfolio, deployed to <https://desansilva.github.io>.

## Tech stack

- [Astro](https://astro.build) 7 (static output, no UI framework) with Content Collections
- Tailwind CSS v4 plus a small hand-written stylesheet, inlined at build time
- Raw WebGL2 point-grid background (`src/lib/hero/`), lazy-loaded after page load
- Self-hosted fonts via the Astro Fonts API (Outfit, Montserrat, Inter)
- GitHub Actions → GitHub Pages

## Page format

A single page with five screens: **Landing**, **About**, **Projects**, **Research**, **Contact**, plus a `404` page.
Projects and research entries are Markdown files in `src/content/projects/` (`kind: project | research`, lower `rank` shows first).
PDFs live in `public/assets/docs/` and are referenced as `/assets/docs/<name>.pdf`.

## Getting started

Requires Node ≥ 22.22.

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # production build into dist/
npm run preview    # serve dist/
npm run verify     # type check + build + size budgets
```

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml` (verify → build → deploy). In the repository, set **Settings → Pages → Source** to **GitHub Actions**.
For the `https://desansilva.github.io` address the repository must be named `desansilva.github.io`.
