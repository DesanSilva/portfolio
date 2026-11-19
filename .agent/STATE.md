# STATE

phase: 0
iteration: 0 (cap: 24)
ponytail: full (fixed for the whole loop)
last_gate: n/a

## Backlog (tick when the objective's own gate passes)

### Phase 0: Intake (no code; human checkpoint at the end)
- [ ] For each `design/NN.png`: write `.agent/spec/screen-N.md` (template in LOOP.md), sampling colours with `scripts/probe.mjs`
- [ ] Write `.agent/expect.json` (schema in LOOP.md)
- [ ] List ambiguities as assumptions A-n (do not ask)
- HUMAN: review spec + expect.json, then run `node scripts/gate.mjs --lock`

### Phase 1: Static screens, zero JS (gate: `node scripts/gate.mjs --skip-3d`)
- [ ] Tokens, font config, `BaseLayout.astro`, `global.css`, `withBase`
- [ ] Screen 1 section (static; CSS-only placeholder behind the text)
- [ ] Screen 2 section
- [ ] Screen 3 section
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

(none yet)

## Deviations (D-n)

(none yet)

## Log

| # | phase | objective | files touched | gate | ponytail footer (skipped / unchecked / risk) |
|:--|:--|:--|:--|:--|:--|
