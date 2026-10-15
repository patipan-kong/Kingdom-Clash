# UI v0.4.2 — Skills Slice 4

## A. Baseline

Build approved and committed locally as `9c8500a41d4f44e48982215df68835b93e70d11c` on `ui-v0.4.2-shop-grid`, following Equipment `7634b13fd1c497234f3dd74dd91e4df88301587f`. Clean worktree after commit. Valid-placement runtime capture confirms the existing gold enabled Confirm; no Build production change was needed. Skills was subsequently approved by human UI review for local finalization. No push, merge, main or gameplay-worktree edit.

## B. Contracts inspected before implementation

Sources: HUD open/close/createSkills/observeSimulation, Battle skill-menu and cast/input guards, Simulation.send/step/clearHeroInput/clearInput, Progression.allocate/award, data/progression and guardian rank tables.

- The visible Skills HUD entry opens even with zero points, in combat and while dead. No existing open keyboard shortcut; Space toggles Pause. Q/W/E/R retain cast semantics outside the panel. No allocation keyboard shortcuts exist (Fortitude's data key F is not an active cast).
- Opening closes Shop/Equipment/Build, clears Guardian intent and emits skill-menu(true). Normal combat speed remains 1; closing Shop/Build restores 1 before opening Skills. No automatic pause/slowdown. Battle suppresses keyboard movement, casts, target/attack and aiming while the menu is active. Close emits skill-menu(false) and existing input reset.
- Initial level 1, zero XP, one point. Each level grants one point; maximum level 20. XP next-level threshold is 80+25×(level−1); at level20 XP is MAX. Authoritative rewards/award drive progression.
- Bash Q, Taunt W and Charge E each have five ranks gated at levels 1/3/5/7/9. Guardian Zone R has three at 6/11/16. Fortitude is passive, two ranks at 18/20. No additional cross-skill prerequisites. Every allocation costs exactly one point. Rank cap, next level and points are validated again on execution, in that order.
- Existing UI sends learn with a unique skill-ui-N request. Simulation validates/deduplicates IDs, queues commands and Progression.allocate changes rank/point on the next step. It refreshes existing skill stats and emits skill-upgraded(skill,rank), or rejected(reason). Neither acknowledgment has request ID; UI must avoid falsely attributing unrelated events. There is no existing optimistic point deduction.
- Learn is processed before the dead-Guardian filter, so reopening while dead permits legal upgrades. A Guardian death event closes Skills; it does not forbid reopening. Existing stats/respawn rules remain authoritative.
- clearHeroInput preserves queued learn; therefore closing Skills alone does not cancel an already queued allocation. Pause/zero-speed/restart clearInput removes queued commands. Results/Pause supersede and close panels; restart rebuilds UI and resets match progression/listeners.
- Current upgrade buttons activate on pointer-down with no explicit pending lock. Presentation polish may add owned-release and a pending/coalescing guard without changing authoritative costs, gates or command semantics.

## C. Design decisions

The Azure Armory navy tray replaces the old oversized shaded panel. Gold Learn/Upgrade actions indicate a permitted spend; blue cards identify upgradeable skills, muted cards/actions distinguish Locked, No points and Max rank. Every active skill retains its original ability artwork. Fortitude has a typographic P passive badge because no dedicated passive icon exists; no new artwork or fabricated icon asset is presented as finished art.

Standard landscape shows all four active skills in a two-column grid and Fortitude across the bottom. Compact landscape shows one complete skill with its icon, name/hotkey, rank/max, next required level, description and explicit action. Previous/Next wrap through all five entries, with a 1/5–5/5 position indicator. Closing is always visible. Compact discovery takes up to four Next taps; this trades simultaneous visibility for readable descriptions and 48 px targets. It does not add a confirmation to learning/upgrading.

Skill points and level/XP remain immediately visible; combat continues is explicit. The floating panel leaves the HUD, joystick, utility column and combat controls uncovered, and the battlefield is visible around it. No fullscreen shade remains. The panel still covers world art behind its rectangle; it does not promise an unobstructed view of every actor. Existing gameplay input suppression remains in Battle.

## D. Actual FIT measurements

Measurements are CSS pixels relative to the actual canvas. Phaser remains 960×540 logical with FIT letterboxing. Eleven runtime geometry snapshots check bounds, text separation, text versus actions, targets, HUD/Keep clearance and essential controls.

| Viewport | Actual canvas | Panel x / y | Panel width × height | Arrangement | Upgrade target |
| --- | --- | --- | --- | --- | --- |
| 844×390 | 693.33×390 | 124 / 91.83 | 272×232 | Focused, all five reachable | 152×48 |
| 960×540 | 960×540 | 124 / 121 | 540×360 | Two columns + passive | 92×48 |
| 1280×720 | 1280×720 | 124 / 156 | 550×360 | Two columns + passive | 92×48 |
| 844×390 safe | 657.78×370 | 124 / 88 | 237.78×232 | Focused | 117.78×48 |
| 960×540 safe | 916×515.25 | 124 / 116.19 | 496×360 | Two columns + passive | 92×48 |
| 1280×720 safe | 1236×695.25 | 124 / 151.19 | 550×360 | Two columns + passive | 92×48 |

Unequal safe insets are left32/right12/top8/bottom12 CSS px. Close is 64×48; Previous/Next are 48×48. Active icons are 32×32. Body/action text remains 12 CSS px, header 16. Standard active cards are 258×88 at 960; passive is 524×72. Bottom gesture clearance is at least 24 px in all measured layouts. Compact tray area is approximately 23% of its rendered canvas, standard 37.5%, large 21.5%; no fullscreen backdrop consumes the remaining field.

## E. Upgrade state and authoritative handling

`allocationState` reads the real progression object and existing upgrade rules. It mirrors validation priority: maximum rank, next level, then points. Both locked and no-points entries remain inspectable. In compact mode the rank line includes the next level and the action states the lock reason; the footer adds the full requirement or transaction result. Switching entry clears old success feedback. The existing full descriptions and actual one-point cost are retained.

`SkillsModel` sends the existing learn command with a unique request ID. No point/rank is changed optimistically. All upgrade actions lock while one is pending; navigation and Close remain usable. A 350 ms guard coalesces the same skill's rapid repeated activation even after a fast acknowledgment. Explicit later taps can allocate the next eligible rank normally.

Because the existing skill-upgraded/rejected events have no request ID, pending completion follows authoritative rank change. Once a simulation step has processed the queued command, unchanged rank produces a generic “Upgrade not applied · check availability” result. It never labels an unrelated rejection as this request's historical reason. The current rank, gate and point count explain present availability. Closing preserves a queued learn; Pause clears it under the existing simulation contract. No command validation, progression, skill effects or balances were edited.

## F. Input and lifecycle verification

The entry and Space Pause behavior remain unchanged. Q/W/E/R and movement are suppressed while Skills is open; normal combat ticks continue at speed1. Buttons now require their owned pointer release on the same target. Release outside, touchcancel, pointercancel, clear-controls, blur and shutdown release ownership. A canceled press cannot spend a point. Pointer state is reset during resize/hide.

Actual-game tests exercise zero/one/multiple points, Q/W/E/R and both Fortitude ranks, level gates and maximum rank, level-up while open, held pending/double taps, real rank/point updates, execution rejection, Close with queued allocation, Pause cancellation, Shop→Skills, Build→Skills, Skills→Shop, death closing then legal dead reopening/upgrading, results priority, restart and one skill-menu listener. Chrome and Edge each test mouse DPR1 and touch DPR3. Dead allocation does not revive the Guardian.

## G. Files changed

Production:

- `src/scenes/HUD.ts`: replace Skills construction/rendering with the new panel while retaining opening/closing, guidance, combat and lifecycle events; publish visible Skills obstruction using the existing event.
- `src/ui/SkillsPanel.ts`: navy grid/focused layouts, existing icons, explicit upgrade states and owned-release controls.
- `src/ui/skillsLayout.ts`: CSS-sized FIT-aware geometry.
- `src/ui/skillsModel.ts`: authoritative availability, pending observation and repeat-tap coalescing.

Verification:

- `tests/skills-ui.cjs`: five focused tests covering gates, pending/non-optimistic spend, rejection/Pause, dead/close/unique IDs and FIT sizes.
- `scripts/verify-skills-ui.mjs`: 41 actual-game scenario/geometry checks and screenshots.
- `scripts/verify-skills-input.mjs`: 24 Chrome/Edge mouse/touch ownership checks.
- `scripts/browser-coordinates.mjs`: navigate to compact entries through actual Next controls before activating; wait for actual selected entry rather than fixed timing.
- `scripts/verify-ui-a1.mjs`: focus compact Zone/Fortitude before inspecting their visible controls; existing progression/gameplay assertions retained.
- `scripts/verify-mobile-hud.mjs`: remove retired duplicate baseText from geometry inventory, check functional Shop versus unavailable Army, and tolerate subpixel FIT arithmetic for the same intended font/target sizes.
- `scripts/verify-match.mjs`: read existing world Keep health instead of retired baseText; locate actual Pause control.
- `scripts/verify-navigation.mjs`: use shared FIT pointer helper and actual Pause coordinates; prototype fixture assertions retained.

Documentation/evidence: this report and `docs/ui-v042-skills-slice4/` with separate regression subfolders. No modified simulation, GuardianSkills, data, Battle, Build/Shop/Equipment implementation, balance, Tower, Keep, art or dependencies. Raw logs/legacy captures stay in ignored `test-results/`.

## H. Actual-game screenshots

These are running Phaser screenshots, with real battlefield/HUD context. Level fixtures call the existing Progression.award kernel; pending temporarily holds simulation.advance while input/rendering remain active. Death/results and execution rejection use deterministic test-only state setup. Actual simulation handles every successful upgrade; captures are not static mockups.

- [844×390](ui-v042-skills-slice4/skills-panel-844x390.png), [960×540](ui-v042-skills-slice4/skills-panel-960x540.png), [1280×720](ui-v042-skills-slice4/skills-panel-1280x720.png).
- [Upgrade available](ui-v042-skills-slice4/upgrade-available.png), [no points](ui-v042-skills-slice4/no-skill-points.png), [level locked](ui-v042-skills-slice4/level-locked.png), [maximum rank](ui-v042-skills-slice4/maximum-rank.png).
- [Successful upgrade](ui-v042-skills-slice4/after-successful-upgrade.png), [pending](ui-v042-skills-slice4/upgrade-pending.png), [rejected](ui-v042-skills-slice4/upgrade-rejected.png).
- [Combat active](ui-v042-skills-slice4/combat-active.png), [Guardian dead](ui-v042-skills-slice4/guardian-dead.png), [unequal safe area](ui-v042-skills-slice4/unequal-safe-area.png).

Screenshots were visually inspected alongside machine geometry. Final spacing separates the compact XP line from Close and action labels from costs at fractional FIT scales.

## I. Test results

| Check | Result |
| --- | --- |
| Full headless suite | 522/522 passed, zero skipped; final run repeated after last presentation spacing changes |
| Focused Skills UI + progression + Guardian skills | 96/96 passed |
| Skills actual-game browser/touch | 41/41 passed, 11 geometry snapshots, zero JavaScript/asset errors |
| Dedicated Skills Chrome/Edge mouseDPR1/touchDPR3 | 24/24 passed |
| Shop grid regression | 113/113 passed |
| Equipment regression | 121/121 passed |
| Build regression | 60/60 passed |
| Popup/input Chrome/Edge | 152/152 passed |
| UI-A1 / UI-A2 | 58/58 and 70/70 passed |
| TypeScript | Passed |
| Production build | Passed; existing >500KB chunk advisory |
| Diff/whitespace and scope | Passed |

The regression pass exercised final HUD integration; subsequent production refinements only adjusted Skills text/action spacing, with Skills checks and TypeScript/build repeated. Browser tests now wait for actual progression/navigation instead of assuming a fixed delay is enough during CPU-heavy headless runs. The historical scripts below remain failing; no all-green historical-suite claim is made. Portable source hashes and results are in [verification-summary.json](ui-v042-skills-slice4/verification-summary.json); detailed Skills evidence is in [verification.json](ui-v042-skills-slice4/verification.json) and [input-verification.json](ui-v042-skills-slice4/input-verification.json).

## J. Known limitations

Physical Android ergonomics remain unverified. Compact discovery shows one skill at a time, with up to four Next taps to another entry. The panel still occludes some world art; the new floating layout preserves surrounding combat visibility and existing input policy. The current no-request-ID skill acknowledgment contract limits precise rejection attribution; current authoritative state remains definitive. Long autonomous full-match/performance journeys were not certified by this slice.

## K. Remaining historical browser failures

Clear obsolete fixtures were migrated without deleting gameplay assertions. Remaining results are separate from the passing focused Skills and UI-A1/A2 suites:

- `verify-mobile-hud.mjs`: now passes 22 checks, including normal/compact-safe Skills fitting, both Keep HP pixel checks and modern Shop availability. Its 23rd check fails the old strict combined header/feedback geometry condition at 960×540 with unequal safe insets. Retired baseText and Shop Soon assumptions are removed; further top-HUD geometry fixture maintenance is separate from Skills.
- `verify-match.mjs`: retired baseText and old Pause coordinates are migrated. Four checks pass (initial match, actual Build, Pause, multitouch), then the original normal-victory movement journey times out waiting for the Guardian to reach x1480 in the extended encounter. No enemy, hero, pathfinding or victory rule was changed to force that fixture to win.
- `verify-navigation.mjs`: shared FIT pointer transforms and actual Pause coordinates are migrated. Seven checks pass, then restart waits for prototype unit red-0-0, absent from extended's red-wave IDs. Its deterministic route fixture is tied to that prototype roster and requires a broader encounter migration.

Raw latest failure logs remain under ignored `test-results/slice1b/`; mobile structured results under `test-results/phase2d-a3/layout/verification.json`. Their remaining failures do not justify restoring retired production fields or altering encounter mechanics.

## L. Integration risks with gameplay v0.4.1

No gameplay worktree changes or integration branch. Combined v0.4.1 behavior remains unverified. Preserve authoritative upgrade rules, the existing Battle skill-menu input guards and original normal-speed policy during future integration. Preserve Azure Keep HP anchoring and hud-clearance; Skills now publishes its rectangle through the already existing shop-obstruction event, alongside Shop/Build. Keep the current Keep listener and reconcile HUD call sites carefully. No Tower combat or Keep implementation was changed. Recheck bar clearance, pending upgrades and lifecycle listeners on the eventual combined branch.

## M. Human review and finalization

Skills Slice 4 was approved by human UI review. The compact focused view, standard two-column layout, authoritative behavior and input safeguards are preserved unchanged. All four production source hashes match the reviewed evidence. The branch is ready for independent integration review after the authorized local Skills commit; historical-browser and physical-device limitations above remain.

Build is committed as 9c8500a41d4f44e48982215df68835b93e70d11c. Skills is finalized with one local commit named `feat(ui): polish skills upgrade panel`; its SHA is recorded by Git and the final handoff. No push, merge, main edit, other-worktree edit or v0.4.1 integration.


## N. Exact commit file manifest

The local Skills commit contains exactly these 63 files, including this report. Reviewed runtime screenshots and structured verification evidence are intentional deliverables. Raw logs, caches and build outputs are ignored and excluded.

- `docs/UI_V042_SKILLS_SLICE4.md`
- `docs/ui-v042-skills-slice4/after-successful-upgrade.png`
- `docs/ui-v042-skills-slice4/build-regression/active-combat-visible.png`
- `docs/ui-v042-skills-slice4/build-regression/archer-tower-selected.png`
- `docs/ui-v042-skills-slice4/build-regression/build-panel-844x390.png`
- `docs/ui-v042-skills-slice4/build-regression/build-panel-960x540.png`
- `docs/ui-v042-skills-slice4/build-regression/confirmed-construction.png`
- `docs/ui-v042-skills-slice4/build-regression/construction-rejected.png`
- `docs/ui-v042-skills-slice4/build-regression/insufficient-iron.png`
- `docs/ui-v042-skills-slice4/build-regression/insufficient-wood.png`
- `docs/ui-v042-skills-slice4/build-regression/invalid-placement.png`
- `docs/ui-v042-skills-slice4/build-regression/pending-construction.png`
- `docs/ui-v042-skills-slice4/build-regression/tower-construction-started.png`
- `docs/ui-v042-skills-slice4/build-regression/valid-placement-unobstructed.png`
- `docs/ui-v042-skills-slice4/build-regression/verification.json`
- `docs/ui-v042-skills-slice4/build-regression/wall-selected.png`
- `docs/ui-v042-skills-slice4/combat-active.png`
- `docs/ui-v042-skills-slice4/equipment-regression/duplicate-item-instances.png`
- `docs/ui-v042-skills-slice4/equipment-regression/empty-844x390.png`
- `docs/ui-v042-skills-slice4/equipment-regression/full-six-slots-960x540.png`
- `docs/ui-v042-skills-slice4/equipment-regression/navigation-equipment.png`
- `docs/ui-v042-skills-slice4/equipment-regression/navigation-shop.png`
- `docs/ui-v042-skills-slice4/equipment-regression/occupied-844x390.png`
- `docs/ui-v042-skills-slice4/equipment-regression/occupied-960x540.png`
- `docs/ui-v042-skills-slice4/equipment-regression/sale-confirmation.png`
- `docs/ui-v042-skills-slice4/equipment-regression/selected-details-and-sell.png`
- `docs/ui-v042-skills-slice4/equipment-regression/verification.json`
- `docs/ui-v042-skills-slice4/guardian-dead.png`
- `docs/ui-v042-skills-slice4/input-verification.json`
- `docs/ui-v042-skills-slice4/level-locked.png`
- `docs/ui-v042-skills-slice4/maximum-rank.png`
- `docs/ui-v042-skills-slice4/no-skill-points.png`
- `docs/ui-v042-skills-slice4/shop-regression/compact-detail-844x390.png`
- `docs/ui-v042-skills-slice4/shop-regression/compact-grid-844x390.png`
- `docs/ui-v042-skills-slice4/shop-regression/equipment-painted-grid.png`
- `docs/ui-v042-skills-slice4/shop-regression/flame-recipe-exact-slots.png`
- `docs/ui-v042-skills-slice4/shop-regression/fusion-exact-component-picker.png`
- `docs/ui-v042-skills-slice4/shop-regression/restricted-range-844x390.png`
- `docs/ui-v042-skills-slice4/shop-regression/standard-flame-recipe-960x540.png`
- `docs/ui-v042-skills-slice4/shop-regression/standard-grid-details-960x540.png`
- `docs/ui-v042-skills-slice4/shop-regression/standard-unaffordable-960x540.png`
- `docs/ui-v042-skills-slice4/shop-regression/verification.json`
- `docs/ui-v042-skills-slice4/skills-panel-1280x720.png`
- `docs/ui-v042-skills-slice4/skills-panel-844x390.png`
- `docs/ui-v042-skills-slice4/skills-panel-960x540.png`
- `docs/ui-v042-skills-slice4/unequal-safe-area.png`
- `docs/ui-v042-skills-slice4/upgrade-available.png`
- `docs/ui-v042-skills-slice4/upgrade-pending.png`
- `docs/ui-v042-skills-slice4/upgrade-rejected.png`
- `docs/ui-v042-skills-slice4/verification-summary.json`
- `docs/ui-v042-skills-slice4/verification.json`
- `scripts/browser-coordinates.mjs`
- `scripts/verify-match.mjs`
- `scripts/verify-mobile-hud.mjs`
- `scripts/verify-navigation.mjs`
- `scripts/verify-skills-input.mjs`
- `scripts/verify-skills-ui.mjs`
- `scripts/verify-ui-a1.mjs`
- `src/scenes/HUD.ts`
- `src/ui/SkillsPanel.ts`
- `src/ui/skillsLayout.ts`
- `src/ui/skillsModel.ts`
- `tests/skills-ui.cjs`

## O. Approved finalization checks

Human approval authorized one local Skills commit. Preflight confirmed expected branch and Build HEAD; approved Shop, Equipment and Build commits remain intact. All four Skills production hashes exactly match the reviewed evidence, so no browser rerun was required and no production changes were made. The existing 41/41 Skills browser and 24/24 Chrome/Edge input evidence remains applicable.

Finalization reran focused Skills/progression/Guardian verification (96/96), the full headless suite (522/522, zero failures/skips), TypeScript, Vite production build and diff/whitespace checks. All passed; Vite retains its existing large-chunk advisory. The 63-file manifest above is the exact local commit scope. Artifact, secret-like token and machine-specific path scans found no issues. Ignored raw logs/build outputs remain excluded. The previously documented historical failures were neither rerun nor expanded during finalization.

The local Skills commit leaves a clean working tree and preserves the compact focused and standard two-column layouts, authoritative upgrade behavior, pending safeguards, owned-release input and gameplay contracts. No push, merge, gameplay-worktree edit or integration was performed.
