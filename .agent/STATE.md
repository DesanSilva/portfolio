# STATE

phase: 0
iteration: 3 (cap: 24)
ponytail: full (fixed for the whole loop)
last_gate: --skip-3d pass (R-SCOPE-1, R-SCOPE-2, R-SCOPE-4, R-A11Y-1, R-PERF-1). R-PERF-2 not run.

## Backlog (tick when the objective's own gate passes)

### Phase 0: Intake (no code; human checkpoint at the end)
- [x] For each `design/NN.png`: write `.agent/spec/screen-N.md` (template in LOOP.md), sampling colours with `scripts/probe.mjs`
- [x] Write `.agent/expect.json` (schema in LOOP.md)
- [ ] List ambiguities as assumptions A-n (do not ask)
- HUMAN: review spec + expect.json, then run `node scripts/gate.mjs --lock`

### Phase 1: Static screens, zero JS (gate: `node scripts/gate.mjs --skip-3d`)
- [ ] Tokens, font config, `BaseLayout.astro`, `global.css`, `withBase`
- [ ] Screen 1 section (static; CSS-only placeholder behind the text)
- [x] Screen 2 section
- [x] Screen 3 section
- [ ] Content collections seeded from the design (R-CONTENT-1)
- [ ] Phase end: `--skip-3d --full` passes, critic (visual) run

### Phase 2: Hero (gate: `node scripts/gate.mjs`)
- [ ] Static frame: context, shader, draw (compare to screen 1 composition)
- [ ] Time animation
- [ ] Pointer tilt, damped
- [ ] Loop gating: offscreen, hidden tab, frame cap
- [ ] Resize and DPR clamp
- [ ] Reduced motion, `hover: none`, `saveData`, context loss
- [ ] Deferred load after `load` + idle, fade-in via `data-ready`
- [ ] Cleanup function
- [ ] Phase end: `--full` passes (TBT escalation ladder in `tech_stack.md` if needed)

### Phase 3: Fidelity (gate: critic `pass` twice in a row)
- [ ] Screen 1 revise until critic passes
- [ ] Screen 2 revise until critic passes
- [ ] Screen 3 revise until critic passes

### Phase 4: Hardening (gate: `--full` + critic code pass)
- [ ] Delete dead code flagged by the critic
- [ ] Harvest ponytail shortcuts: `grep -rn "shortcut:" src/ scripts/`; list each under Deviations as a known limit; fix any that conflicts with an R-ID
- [ ] Keyboard/focus, contrast over the hero, 390 px layout
- [ ] Final: `node scripts/gate.mjs --full` and critic verdict `pass`

## Assumptions (A-n)

- A-1 Screen numbers follow filename sort (`about_me.png` = 1, `contact.png` = 2, `landing_page.png` = 3) because R-SCOPE-1 says so. The 3D notes and `tech_stack.md` call the hero screen 1. Human should fix this before `--lock` if the page order should be hero, about, contact.
- A-2 Nav labels Projects and Research have no matching block in any PNG. No project or research cards to seed.
- A-3 "View Resume" href is not drawn. Use `/docs/resume.pdf` when the page is built.
- A-4 "Get In Touch" target is not drawn. Treat it as `#contact` (screen 2).
- A-5 Portrait on screen 1 is a photograph. Do not crop the PNG (R-SCOPE-3). No separate file exists.
- A-6 Font family is not identifiable. Do not guess a family. Weights are not measured.
- A-7 Contact form has no action and no submit label. Phone and location have no visible href.
- A-8 Shared nav text is listed only on screen 1. The gate uses `getByText().first()` and requires that node inside the viewport, so repeating Projects, Research, or Contact on later screens fails. "Contact" is also a substring of "Get In Touch". The button string "Get In Touch →" is only on screen 3.

## Deviations (D-n)

- D-1 No portrait on screen 1. The only photo is `design/profile.png`, and R-SCOPE-3 forbids using a design PNG as page content. V1-07 stays open.
- D-2 No canonical link. `astro.config` has no `site`.
- D-3 Type is `ui-sans-serif`. No family is named (A-6), so the Astro font block is not set.

## Log

| # | phase | objective | files touched | gate | ponytail footer (skipped / unchecked / risk) |
|:--|:--|:--|:--|:--|:--|
| 1 | 0 | Specs for the three PNGs | `.agent/spec/screen-1.md`, `screen-2.md`, `screen-3.md`, `.agent/STATE.md` | skipped (phase 0) | Skipped `expect.json` and the gate. Text was read from the images, not OCR. Field edges on screen 2 are ±10px where the dots cross the stroke. Risk: A-1 puts the hero last. |
| 2 | 0 | Write expect.json | `.agent/expect.json`, `.agent/STATE.md` | skipped (phase 0) | Skipped the gate and a second pass over the PNGs. Nav text is only on screen 1 (A-8). Risk: icon links and the portrait are not in the contract, because they have no text. |
| 3 | 0 | Critique C-01: replace the starter with the three sections | `src/pages/index.astro`, `src/layouts/BaseLayout.astro`, `src/styles/global.css`, `.agent/STATE.md` | `--skip-3d` pass | Skipped the portrait (D-1), the font family (D-3), hero JS, and Lighthouse (C-02). Risk: screen 1 still fails V1-07, and the next critic will flag type and the uniform dot field. |
