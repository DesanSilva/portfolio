# LOOP.md: orchestrating the build in Cursor (ponytail installed)

For the human operator. The agents never read this file; they read `WORKER.md` / `CRITIC.md`.

## Scope reading

`design/` holds the 3 PNGs of the single page. The loop builds exactly those three screens as sections of one static page, plus the 3D hero and performance work from `REQUIREMENTS.md`. Nothing else, no deployment. The PNGs are inputs: nothing writes to `design/`; renders go to `.render/` (override with `RENDER_DIR`). If you actually want agent-generated PNGs inside `design/`, set `RENDER_DIR=design/_render` and add that folder to the lock exclusions.

## Architecture

- One worker, one objective per iteration, fresh Cursor Agent chat each time. State lives in files, not in chat memory.
- One deterministic arbiter: `node scripts/gate.mjs`. It checks locked files, runs `npm run verify`, builds and serves the site, asserts copy/links/screen count, mobile overflow, and observes WebGL calls to prove the hero animates, tilts, pauses offscreen and honours reduced motion. Pass/fail is never the worker's opinion.
- One read-only critic in a fresh chat: visual comparison against the PNGs and a code review pass. Findings need evidence and are severity-ranked; only blockers and majors gate.
- One human checkpoint, at the spec (end of Phase 0), because every later iteration trusts it. After that you only press go.

## Ponytail under Cursor: constraints that shape the loop

- Your install is either the hooks or the always-on rule (`.cursor/rules/ponytail.mdc`). They are alternatives: with the rule file present the hooks do nothing. Keep exactly one.
- Hooks give level switching only; the rule gives no commands. There is no `/ponytail-review` or `/ponytail-audit` here, so `CRITIC.md` section B carries the review checklist instead.
- Cursor subagents do not receive the ponytail ruleset and cloud agents never fire the session hook. Therefore: no subagents, no background/cloud agents. Every role runs as a local Agent chat.
- The level does not persist across chats, so the loop pins `full`. `lite` ends with "let the user pick" and `ultra` pushes back on the request; both stall an unattended loop.
- Do not copy ponytail's own `AGENTS.md` into the project; ours is the one Cursor reads.
- Ponytail's rung 1 ("should this exist?") would cut the WebGL hero and the tilt. `REQUIREMENTS.md` and `WORKER.md` pre-answer it for every R-ID. Keep that wording.

Where ponytail is wired in: the host loads the skill at the start of each chat (it lasts for that session); `WORKER.md` section 3 says how it applies here (rung 1 pre-answered, check and shortcut conventions, footer); the footer lands in the STATE.md log; `CRITIC.md` treats omissions as blockers; Phase 4 greps the `shortcut:` comments. Do not paste the skill text into prompts, `AGENTS.md` or `REQUIREMENTS.md`: the host already injects it, and a second copy only adds tokens and the risk of two versions disagreeing.

Verify once: in a fresh Agent chat send `/ponytail` alone. With hooks it reports the level; with the rule it answers with a notice and runs at the rule's default. If it does neither, ponytail is not loading; fix that before starting.

## One-time setup (human)

1. Run the setup commands in `AGENTS.md` (scaffold, Tailwind, check, lhci) and create `scripts/size-budget.mjs` and `lighthouserc.json` from it. Skip `deploy.yml` (R-NODEPLOY-1).
2. Copy this pack into the repo root: `REQUIREMENTS.md`, `.agent/`, `scripts/gate.mjs`, `scripts/probe.mjs`.
3. `npm i -D playwright && npx playwright install chromium`
4. Put the PNGs in `design/` (names sort into screen order, e.g. `01.png`, `02.png`, `03.png`). Add `.render/` to `.gitignore`.
5. Vision check: in a fresh chat ask the model to name the three top-left elements of `design/01.png`. The model driving the loop must read images; if it cannot, stop and choose a vision-capable model.
6. Cursor settings: allow `node scripts/*` and `npm run *` without prompts. Keep `git` entirely off the allowlist (add it to the denylist if your Cursor version has one), and keep `rm` on manual approval. Agents have no git access in this loop; you commit.
7. Gitignore consistency: the folder name used everywhere in this pack is `.agent/` (singular). Your ignore entry must match it exactly. `REQUIREMENTS.md`, `tech_stack.md`, `.agent/`, `.render/` and `.lighthouseci/` are ignored; never run `git clean -x` (it deletes ignored files, including these docs).

## Running it

Each iteration is a new Agent chat with one message.

- Worker: `@.agent/WORKER.md run one iteration`
- Critic: `@.agent/CRITIC.md run`

Read the PASS/FAIL lines in the reply, then open a new chat for the next iteration.

**Phase 0, Intake.** Run Worker iterations until the Phase 0 backlog is ticked. Then review `.agent/spec/*.md` and `.agent/expect.json` against the PNGs yourself (this is the only careful human review in the loop), fix them by hand if needed, and run `node scripts/gate.mjs --lock`. Optionally commit and tag it yourself (`spec-locked`).

**Phase 1, Static screens.** Worker iterations with the gate's `--skip-3d` mode. At phase end: `node scripts/gate.mjs --skip-3d --full`, then one Critic run (visual pass useful, canvas is hidden).

**Phase 2, Hero.** Worker iterations in the backlog order. Phase end: `node scripts/gate.mjs --full`. If TBT fails, the Worker follows the escalation ladder in `tech_stack.md` section 4B; it does not improvise.

**Phase 3, Fidelity.** Alternate Critic then Worker. Stop when the Critic returns `pass` twice in a row for a screen.

**Phase 4, Hardening.** Final `--full` gate plus a Critic code pass. Done when `REQUIREMENTS.md` acceptance holds.

Version control is yours alone. After every iteration whose gate is green, checkpoint it yourself: `git add -A && git commit -m "iter N"` (the ignored docs stay out of the commit), and tag phase ends (`green-p1`, `green-p2`, ...). If an iteration makes things worse, `git reset --hard <last green>` rather than asking the Worker to undo it. `reset --hard` leaves ignored files alone; `git clean -x` does not.

## Phase 0 artefacts

`.agent/spec/screen-N.md` (one per PNG):

```
# screen-N
viewport: WxH @scale
background: base colour (probe), gradients/vignettes with sample points
| id | element | text (verbatim) | x,y,w,h | size/weight/case/tracking | colour (probe) | notes |
interactive: element -> intended href or behaviour
decorative: ...
assets to draw as inline SVG: ...
uncertain: anything unreadable or ambiguous (also logged as A-n)
```

`.agent/expect.json` (the gate's contract; example from screen 1 of the design you shared):

```json
{
  "screens": [
    {
      "file": "design/01.png",
      "scale": 1,
      "selector": "[data-screen='1']",
      "texts": ["Portfolio", "Desan Silva", "AI/ML Engineer & Researcher", "View Resume", "Get In Touch", "Projects", "Research", "Contact"],
      "links": [
        { "text": "View Resume", "hrefContains": "/docs/resume.pdf" },
        { "text": "Projects", "hrefContains": "#projects" }
      ]
    }
  ]
}
```

Add one entry per remaining PNG. Keep only text that is truly visible in that screen's viewport.

## Intervention rules

- Iteration cap 24 overall. The Worker writes `BLOCKED:` after the same R-ID fails three log rows in a row; stop and read the log before restarting.
- If the Worker edits a locked file, the next gate fails on `LOCK`. Revert that change; do not re-lock.
- If the Critic and the gate disagree, the gate wins for pass/fail; the Critic wins only for what to fix next.
- Use a different model for the Critic than for the Worker if you can; same-model critics are more lenient.

## Known gaps

- Only `landing_page.png` was visible when this pack was written; screens 2 and 3 are covered by the generic spec/expect flow, not by specific rules.
- `gate.mjs` passed a syntax check and a unit test of its WebGL hook; it has not been run end to end. First run on a trivial page and fix environment issues (Chromium flags, Windows process handling) before trusting it.
- The 3D checks assume the hero draws with `drawArrays` and sets tilt through `uniform4f`/`uniform4fv`, as specified in `AGENTS.md`. A different draw call or uniform type makes them fail; adjust the hook, not the hero.
- Headless Chromium uses software GL. It is fine for behaviour checks, not for judging smoothness.
