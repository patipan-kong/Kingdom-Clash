# Kingdom Clash RC1 integrated audit — 2026-10-16

## Decision and approval boundary

**CONDITIONAL GO for the proposed local RC1 commit, pending explicit human approval of the exact manifest and documented test debt.** This is not approval to push, merge, deploy or release to players. Slice 7 is accepted and included; it is not an outstanding design/sign-off item. No application code, gameplay, UI, vendor code, dependencies or test assertions were changed by this audit. Only release documentation and generated verification evidence were updated.

Worktree: `G:\work\ark\arkhero-integration-v041-v042`.

Branch: `integration/gameplay-v041-ui-v042`.

HEAD: `80a24dffc7ed00c0d33b729d69c1919027856290` (unchanged).

The index is empty of staged changes. No staging, commit, push, merge, cherry-pick, deployment, worktree creation/removal or cleanup of other worktrees occurred. Existing uncommitted integration changes remain intact.

## Integrated release scope

| Component | Audited scope |
| --- | --- |
| UI v0.4.2 | Already in HEAD: Shop grid/item details, Equipment, Build and Skills. These baseline commits are included through branch ancestry, not new files to stage again. |
| Gameplay Balance B | Active default in Simulation and normal URL: Guardian LV1 HP980, +60/LV; Crimson minion/tower raw damage vs Guardian20/26; Crimson Keep damage17. Azure Keep damage0 and HP3000. A/C remain explicit comparison variants; URL override is dev-only and warns. |
| Polish 5/5.1 | Shared navy/brass fantasy styling across panels, compact visible controls with preserved transparent interaction rectangles, original artwork and authoritative quote/transaction/skill behavior. No new bitmap assets. |
| Slice 6 | Selected-only 120 CSS-pixel placement tray, 24px bottom reserve, Change/Confirm/Cancel with 48px-high interaction areas; pending-safe return and cleared preview. Decorative Azure tower removed from entities and all shared obstacle consumers. Separate tower rendering template keeps real towers intact; map walls/eight enemy towers/Keep HP retained. Opening the old footprint is an intentional approved map change, not a claim of unchanged map occupancy. |
| Slice 7 | Accepted Fantasy Pause Menu using shared theme, responsive centered panel, 224x48 CSS Resume target, original pause/resume state flow, shade input blocking and Space shortcut. Dedicated regression proves frozen state/cooldown deadlines and working input after dismissal. |
| Azure Keep HP HUD | Authoritative current/max HP and health state under minimap, inspector reconciliation and local world-bar obstruction, visible when Guardian dies/camera moves. No independent HP counter/healing. |

Actual tracked diff and untracked source were inspected. The only simulation changes relative to HEAD are the approved Balance B variant plumbing, HP derivation and Crimson damage selection. No new item catalog/stat, economy, progression rule, cooldown rule, AI algorithm or save-format change is present. Slice 6 intentionally changes static map occupancy. Other panel changes are presentation plus the approved Build Change transition. No unrelated source path was found.

### Amendment: Slice 6 layout sign-off and bot baseline (2026-10-16)

Recorded after RC1 commit `a2082a5bf3d0329ad420f0635960c4385f969287`, which is unchanged by this amendment.

**Approved (Option A).** The project owner explicitly approved keeping the decorative Azure Archer Tower removed and its former cell at world (620,495) walkable and buildable, as implemented in RC1. The resulting simulation changes are accepted as the new RC1 baseline.

Root cause: removing the static `tower` entry from `entities` in `src/world/layout.ts` released its 1x1 footprint. Collision (`src/simulation/Collision.ts`), the navigation static walkable grid, line of sight and build placement (`src/simulation/Building.ts`) all read that footprint, so collision/walkability in front of the Azure Keep changed and unit routes changed with it. No pathfinding, movement, spawn, wave or combat code changed.

Isolation: an RC1 export with only that one entry restored (identical to the `da7475d` entry) reproduces the previous bot baseline byte-for-byte. RC1 as committed produces the new baseline.

Bot baseline: `node scripts/balance-v041.mjs all a,b,c --json=<file>` after `npm test`; 60 rows (variants A/B/C x 10 scenarios).

| Baseline | SHA-256 of JSON output |
| --- | --- |
| Previous (tower entity present) | `33029cece7abb1a2013da36b6e2fe58c17ac9bc894bb902b0b84b209826148bd` |
| New RC1 (former cell open) | `f71b8b4bf31e9fb663b89110c3ea29a50c31a017396555411e77f5b692a23dcb` |

Balance B, 20 bot runs per layout:

| Metric | Tower entity present | RC1, cell open |
| --- | --- | --- |
| Wins | 12/20 | 12/20 |
| Mean match duration | 376.3s | 373.7s |
| Mean Guardian deaths | 2.8 | 2.8 |
| Mean Azure Keep HP at match end | 1832 | 2009 |

Four win/loss outcomes flipped, all in the `dying` scenarios (per-run order): A WWW to WLW, B LWW to WWL, C WWL to WWW. Balance B numerical parameters are unchanged: Guardian LV1 HP980, +60/LV; Crimson minion/tower raw damage vs Guardian 20/26; Crimson Keep damage 17; Azure Keep damage 0 and HP 3000.

This is an approved layout/baseline change. It is not evidence that the simulation is byte-identical to the previous baseline or statistically equivalent to it; 20 deterministic bot runs per variant do not establish equivalence. Human playtest of the Azure Keep front lane remains required.

### Browser-coordinate wait review

`scripts/browser-coordinates.mjs` waits for the compact Skills selection to change, then for renderer frames, then reads the current hit bounds. HUD renders Skills each frame and the UI reconstructs visible compact-row placement; the wait synchronizes test input with presentation/input geometry. It does not retry a rejected upgrade, alter simulation state, extend a cooldown, replace an interaction with direct model mutation, or bypass pending/point checks. The current Combat HUD run exercises actual allocation through this helper and passes its functional checks. This is a legitimate asynchronous presentation synchronization, not evidence of a masked gameplay defect. Existing strict assertions remain intact.

## Fresh verification of this working tree

All browser reruns used task-owned Vite on `127.0.0.1:5208`; Chrome headless with emulated mouse/touch. Historical numbers were not substituted for these checks.

Evidence paths in this section identify the retained local audit archive, not required Git attachments. The minimal commit deliberately omits generated results/screenshots; release results are summarized here. The frozen Pause baseline and isolated warning diagnostic are retained in Git as specified in `rc1-audit/WHITELIST_REVIEW.md`. The whitelist-only review did not rerun application checks.

| Gate | Fresh result | Evidence |
| --- | --- | --- |
| TypeScript | PASS (`tsc --noEmit` through `npm run build`) | Build exited0 |
| Production build | PASS, 69 modules; existing >500kB bundle advisory | `dist/assets/index-lsGsZk3d.js`, 1668.36kB / gzip396.71kB; generated dist excluded |
| Full headless | **539/539**, fail0, skipped0, cancelled0; 385365.8725ms | `npm test` exited0 |
| Pause regression | **192/192**, errors0 | `ui-polish-slice7/after/verification.json` refreshed by audit; compares all ten outcomes to retained pre-polish baseline |
| Build/Slice 6 | **65/65**, errors0 | `rc1-audit/build/verification.json` |
| Azure Keep HUD/Balance B | **55/55**, errors0 | `rc1-audit/keep-hud-rerun/keep-hud-verification.json` |
| Combat HUD | **25 functional checks pass; 1 strict console assertion fails**, exit1 | `rc1-audit/combat-hud/verification.json` |
| Git whitespace/index | `git diff --check` PASS; no staged paths | Rechecked after documentation edits; untracked text separately checked |

The first Keep HUD audit invocation incorrectly supplied a query-bearing base URL; this harness appends `?combat=a`, producing a malformed override URL. It passed2 checks then failed the override assertion. This was an audit invocation error, not an application defect. The unchanged harness was rerun with bare `http://127.0.0.1:5208/`, passed55/55, and both runs are retained (`rc1-audit/keep-hud/` and `keep-hud-rerun/`). An initial npm argument-forwarding issue started Vite on5174; it was stopped and replaced by direct Vite CLI on5208 before the browser checks.

## Known test debt and limits

### Current reproduced Chrome intervention

The Combat HUD strict console assertion sees: `Ignored attempt to cancel a touchcancel event with cancelable=false, for example because scrolling is in progress and cannot be interrupted.` All25 functional assertions pass, including simultaneous joystick/aim, touch cancellation, respawn, Pause freeze and Restart cleanup. The assertion remains red; no filtering or assertion weakening occurred.

Classification: **known browser/Phaser test debt, not an established application defect**. Existing isolated evidence (`ui-polish-slice7/touchcancel-diagnostic.json`) reproduces it without opening Pause, with `paused:false`, `overlay:false`, `stickPointer:null`. Source inspection confirms unchanged Phaser3.90 TouchManager.onTouchCancel calls preventDefault without checking cancelable. This audit reproduces the same warning in the full functional harness. A real stuck-input, lost-pointer or post-cancel gameplay failure would invalidate this classification and block approval; none appeared in the reruns. Vendor/input behavior was not modified.

### Historical legacy browser failures, not freshly rerun wholesale

Earlier baseline-vs-integration evidence is retained in `GAMEPLAY_V041_UI_V042_INTEGRATION.md` sectionJ. This audit does not claim that all suites pass or re-establish every historical diagnosis against a fresh baseline export:

- `verify-context-guidance`: unspent-point advice assertion; underlying cause not fully investigated.
- `verify-defense-feedback`: obsolete combined wave/timer text.
- `verify-keep-health`: stale world-bar clearance constant.
- `verify-mobile-hud`: strict unequal-safe header geometry.
- `verify-navigation`: prototype-unit expectation.
- `verify-progression`: obsolete verbose XP text.
- `verify-skill-allocation`: old LV/SP text contract; underlying cause not fully investigated.
- `verify-skills`: historical joystick-drag timeout.
- `verify-top-hud`: retired HUD text field.
- `verify-extended-lifecycle`: historical timeout even though script exits0; exit0 is not proof of full coverage.
- `verify.mjs`: old Pause/Shop/wave expectations, and now an obsolete decorative-tower collision expectation after approved Slice 6. The distinct Slice6 legacy building/placement suite passed24/24 historically; that is not a fresh pass of this entire script.

Only Combat HUD was rerun among that historical failure inventory. Build65, Pause192 and Keep55 are current targeted coverage; earlier Shop113/113, Equipment121/121, Skills41/41 and broad integration browser evidence remain historical evidence rather than fresh audit results.

No physical Android/iOS device, mobile Safari, real notch/gesture bar, thumb comfort, thermal/performance or device-specific cancellation testing was performed. CSS safe-inset emulation is not device certification. Human release/device QA remains necessary; the proposed local commit is not a deployment decision. The production artifact builds, but this audit did not rerun a production-preview browser suite (production override behavior is covered by current headless tests and prior integration evidence).

## Exact proposed commit scope

The original broad211-file proposal is superseded by the scope review in `rc1-audit/WHITELIST_REVIEW.md`, which classifies every original path. `rc1-audit/PROPOSED_COMMIT_FILES.txt` now proposes **46 exact files**, one path per line: all36 source/test/script files plus10 essential documentation/fixture/review files. OPTIONAL and EXCLUDE evidence is intentionally omitted; the whitelist is no longer meant to match every untracked artifact. Nothing was deleted. Revalidate the exact proposal before any approved commit. Both task-owned Vite invocations were stopped after verification.

Implementation/test scope is unchanged: 13 application source files (10 modified +3 new), 12 scripts (9 modified +3 new), and11 tests (9 modified +2 new). Essential documentation includes the integration/balance/HUD records, Slice6/7 reports and this audit. The frozen Pause baseline JSON is a maintained test dependency; the small isolated touchcancel diagnostic is retained for known-debt provenance. Screenshots and generated rerun outputs are local-only, not part of the proposed commit. Baseline UI artwork/assets and package files are unchanged and need no staging. Exclude ignored `node_modules`, `dist`, `.test-build`, scratch test-results, all other worktrees and unrelated planning files; no blanket add is proposed.

Approval requested: one local RC1 integration commit of exactly the manifest, accepting the known Chrome assertion debt and explicitly recorded historical/device limits. No commit message or Git mutation has been applied. Stop and obtain approval before staging/committing. A functional regression, unexpected scope, or unaccepted test exception changes this to NO-GO until resolved.
