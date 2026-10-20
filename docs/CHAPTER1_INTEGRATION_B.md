# Chapter 1 Integration B — browser acceptance

Result: **GO for browser acceptance**, with the test-only changes below left uncommitted for review. Human gameplay and balance acceptance remain pending.

## Baseline and execution policy

Verified clean `codex/chapter1-integration` at `96a3ee9a4e5930820b5cce16705a2ed600c74b27` in `C:/Users/patip/.codex/worktrees/chapter1-integration/arkhero` before testing. HEAD remains unchanged. No leftover test-owned server or browser was found in preflight.

Suites ran sequentially in the requested order, followed by focused unlock-edge and additional pause checks. Each run used a development Vite server, including the staged fixtures. Internal-server suites retained their own servers. A scratch runner recorded spawned child PIDs, Chrome profile paths, ports, available memory and cleanup results, enforced one connected owned browser at a time, and closed browser/server resources in `finally`, including failed runs. The long progress suite now replaces Chromium between independent fixtures, closing the preceding browser before launching another.

The runner and focused reproductions live outside the repository in this chat's visualization directory. Logs, screenshots, assertions and ownership records are ignored under `test-results/integration-b/`; no generated evidence is staged.

## Final complete suite results

| Existing script | Passed / total | Evidence directory |
|---|---:|---|
| `verify-chapters.mjs` | 29/29 | `01-chapters` |
| `verify-campaign-selection.mjs` | 51/51 | `02-selection-final` |
| `verify-campaign-routing.mjs` | 18/18 | `03-routing` |
| `verify-campaign-levels.mjs` | 90/90 | `04-levels-final` |
| `verify-campaign-ui.mjs` | 34/34 | `05-ui` |
| `verify-campaign-polish.mjs` | 39/39 | `06-polish` |
| `verify-campaign-progress.mjs` | 129/129 | `07-progress-final` |
| `verify-menu-readability.mjs` | 147/147 | `08-readability` |
| `verify-pause-menu.mjs` | 203/203 | `10-pause` |

Total: **740/740 assertions in final complete existing-suite runs**, with zero reported browser/console/asset errors. Earlier failed or incomplete attempts are retained as evidence and are not counted as passes. The previously outstanding campaign UI, polish and progress legacy browser gate now has complete passing runs.

Supplemental checks: fractional scroll boundaries **3/3** (`04-boundary-after`); fresh-browser mobile HUD checks **6/6** (`07-mobile-hud-recheck`); Level 2→3, 3→4 and 4→5 browser unlock edges **3/3** (`09-unlock-edges`). The unlock supplement uses the same declared-outcome fixture as the progress suite to verify routing/persistence, not mission difficulty.

## Coverage and visual review

- Chrome headless with actual Playwright mouse and touch events; keyboard/joystick/Space pause coverage also retained.
- Chapter/grid viewports: 960×540, 1280×720, 1366×768, 1920×1080 and 844×390. Levels and readability also cover 740×360. Pause covers 960×540, 844×390 and 740×370 with normal and supported safe-area cases.
- Ten released Chapter 1 missions, zero pending slots, future chapters unavailable, Back and direct Continue, guarded invalid/locked launches, replay selection and separate next recommendation.
- Sequential unlock edges 1→2 through 9→10, an existing Levels 1–5 save continuing at 6, Chapter 1 completion at 10/10, victory/defeat/retry identity and return routing, no duplicate handlers and no unnecessary navigation/defeat/retry save writes.
- Full Battle remains available from fresh progress, outside story completion, with correct grid/Chapter returns, no Chapter 2 credit and no effect on Continue. Quick Play and pause behavior retain their existing semantics.
- Level 9–10 hit targets are reached through real touch input at all three levels-verifier sizes. Small landscape retains strict clipping, disabled clipped targets and drag-release selection suppression. All mission briefings and Full Battle retain readable copy and reachable Back/Start controls.
- The 844×390 grid, finale view and Level 10 briefing screenshots were visually inspected. The automated readability suite found no clipped, overlapping or button-colliding text in its complete matrix.

## Findings, reproduction and scoped changes

1. **Test adaptation defect — fractional scroll boundary.** `04-levels` stopped after 25 passing checks at 844×390: seed all ten clears, scroll/drag the grid, Back through Chapters to Main Menu, re-enter and reveal Mission 1. Error: `Cannot reveal campaign slot campaign-01`. The helper treated a fractional offset as close enough to zero; strict input visibility still disabled the tile. A focused fixture reproduced this with scroll `-1e-10`, and exposed the same disabled-input issue at the finale boundary. `campaign-browser-helpers.mjs` now reaches exact clamped edges, uses a small interior inset and requires interactive targets to be enabled. Exact visibility/input assertions are preserved. The reproduction passed 3/3 after the fix; affected selection and levels suites passed 51/51 and 90/90.

2. **Infrastructure failure — Chromium network buffers.** `07-progress` completed 126 assertions, then logged `Failed to load resource: net::ERR_NO_BUFFER_SPACE` while opening the fresh Level 9 HUD fixture at 844×390. `open()` timed out waiting 20 seconds for Main Menu, before the HUD assertion was reached. No game assertion failed, no unexpected browser termination was observed, and this attempt is not a pass. All final HUD fixtures passed 6/6 in a fresh browser. The progress verifier now closes/relaunches Chromium after six independent contexts, retains every scenario/assertion, supports the focused `PROGRESS_SCENARIO=mobile-hud` diagnostic and records failed request URLs. The complete default `all` rerun passed 129/129 with no network errors.

3. **Additional stale test navigation.** Review of the applicable pause verifier found list-era direct entry and tile→Briefing assumptions. `verify-pause-menu.mjs` now enters Chapters and uses deliberate touch Briefing on entry/re-entry. Its simulation-state, cooldown, input-blocking, listener and pre-polish semantic-baseline assertions are unchanged; all 203 passed.

4. **Acceptance coverage strengthened.** The progress verifier adds explicit Full Battle victory return to the source grid, zero Chapter 1/2 completion credit, unchanged Continue and no navigation save writes. These passed in the complete 129-check run. The separate unlock-edge supplement covers the previously implicit Level 2–4 successor transitions.

No application defect was found and no files under `src/`, gameplay balance, simulation, campaign definitions, progression policy or save schema were changed.

## Cleanup, source integrity and review boundary

All 16 run attempts/diagnostics reported closed browsers and servers, including failures. A final OS audit found zero processes matching the 20 recorded temporary Chrome profiles, zero surviving recorded owned browser PIDs, zero remaining test-owned Node/esbuild services and no listeners on ports 5173/5198. Unrelated Chrome, Node, Codex and Claude processes were not terminated.

Gameplay remains at `fc94009a59bc7840ad48ec2e950834008f914327`, with clean tracked status and the same five unrelated untracked documents. Their hashes and the source checkout status match the preflight snapshot. Chapter UI remains clean at `1c0e7817b071a31a4fef954d61d0de11e2673b38`, with an empty index. Neither source worktree was modified.

Final script syntax checks and `git diff --check` pass. The integration index is empty; the three modified verifier/helper files and this report remain uncommitted. No commit, push, deployment, main merge, Chapter 2 implementation or human playtest was performed. No requested automated browser acceptance item remains untested within this Chrome/viewport scope; human gameplay/balance acceptance remains a separate gate.
