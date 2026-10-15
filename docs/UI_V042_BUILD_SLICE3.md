# UI v0.4.2 — Build Slice 3

## A. Baseline and scope

2026-10-15. Branch `ui-v0.4.2-shop-grid`, isolated worktree `C:\Users\patip\.codex\worktrees\ui-v042-shop-grid\arkhero`. Equipment was finalized and committed locally as `7634b13fd1c497234f3dd74dd91e4df88301587f` (`feat(ui): redesign equipment inventory and sale panel`), on Shop commit `5762fc6fc4db4b97dc5d51018570c6af67fd4d9d`. Equipment refinements passed 511 headless / 68 focused / 121 Equipment / 113 Shop / 152 popup / 24 Fusion / 27 Crown checks, TypeScript, production build and whitespace validation. The Equipment commit left a clean working tree. No push, merge, main update or other-worktree modification was performed.

Build implementation remains uncommitted for review. Simulation, costs, balance, collision/pathfinding, construction timing, Tower/Keep combat and Skills are outside scope.

## B. Verified construction contracts — inspected before implementation

Sources: `HUD.ts`, `Battle.ts`, `simulation/Building.ts`, `Simulation.ts`, `Economy.ts`, `ConstructionCosts.ts`, `data/buildings.ts`, `Clock.ts`, construction tests in `simulation.cjs` and `builders-crown.cjs`, and historical `verify-building.mjs`.

- Build utility toggles its panel; opening closes Shop/Equipment and Skills, clears Guardian intent, enables the territory grid and sets absolute combat speed to 0.25. Cancel closes mode and clears placement; normal speed resumes. Pause/results supersede panels; restart recreates scene/UI and listeners.
- Wall/Tower selection emits `select-building`, clearing the previous ghost. A separate unblocked battlefield pointer-down emits `placement(kind,x,y)`. Battle applies its existing camera offset and `viewToWorld`, then floors to a 48-unit cell. Dragging during this gesture pans the existing camera; it does not move the Guardian. Neither this projection nor camera behavior may change.
- Current base quotes: Wall 25 Wood / 0 Iron; Archer Tower 80 Wood / 10 Iron. A live Builder's Crown quote is 23 Wood or 74 Wood + 10 Iron; rounding and non-stacking rules come from the ledger. The resource ledger is authoritative, not a forged public display mirror. Initial resources are 180 Wood and 30 Iron, with existing tick income preserved.
- Wall has 400 HP and 60 build ticks; Tower has 650 HP and 150 build ticks. At 30 Hz these are 2 and 5 simulation seconds, or approximately 8 and 20 real seconds while Build remains at quarter speed. Positive construction progress grows HP while retaining construction damage. `built` acknowledges accepted start; `construction-complete` identifies completion. Acceptance is not instant completion.
- `placementReason` checks integer command/map bounds, controlled territory (within 8×48 of world 330,600), existing structures, living units, reserved spawn/approach areas, river/bridge bounds, scenery, static footprints, Tower cap 30, then authoritative resources. There is no Guardian-proximity build range; controlled territory is the build-range rule. No Wall cap was found in this validator. Failure priority remains authoritative.
- Existing ghost/footprint/range preview is rendered by Battle: green when placement is legal, red with a live reason otherwise. Confirm emits one `confirm-building(requestId)` and the existing Battle listener sends a `place` command with the selected kind/cell. No additional confirmation step exists.
- The simulation validates again on execution, deduplicates request IDs and deducts resources once before inserting `built-${requestId}`. Failed construction does not spend. A `built` event carries request ID; existing construction `rejected` events do **not** carry request IDs. UI must not falsely correlate a foreign rejection. A matching built acknowledgment, or next-tick structure presence/absence, establishes whether its own submitted request started.
- Guardian death does not prohibit placement (`place` is explicitly exempt from the dead-command filter). Build blocks Guardian movement/casts; battlefield placement and existing build-pan remain available. Pause/zero speed/restart clear queued input. Closing/toggling Build emits `building-mode(false)`, which clears simulation input, including an unexecuted queued place; an already executed construction remains. Submitted/completed work must never be described as undone by Cancel.
- Existing pointer ownership is split between HUD placement/pan gestures and Battle's building-mode suppression. Build controls previously activated on pointer-down. The redesign may own press/release and cancel safely, without changing placement rules or the camera.

## C. Layout direction

Use a navy illustrated tray between the joystick and utility column. Both Wall and Archer Tower remain visible. Expanded cards show the existing painted image, full name, authoritative cost and purpose. Selecting either card collapses the art row into compact illustrated choices so the placement battlefield has more exposed area. Confirm/Cancel stay explicit and at least 48 CSS px high. Keep the original select → battlefield cell → Confirm sequence. Measurements and verification follow below.

## D. Existing art

Reuse `public/assets/wall.png` (176×192 RGBA) and `tower.png` (188×384 RGBA), already loaded by Battle. No new art, building type or battlefield sprite alteration. Original generation/preparation provenance remains in `docs/ASSET_MANIFEST.md` and `art/`.

## E. Responsive measurements

All dimensions below are measured CSS pixels in the actual Phaser FIT canvas, not viewport assumptions. The logical canvas remains 960×540. Twenty geometry snapshots check artwork aspect, text bounds, target separation, essential controls, HUD and Keep HP clearance.

| Viewport | Rendered canvas | Tray width | Expanded / selected height | Card width × height, expanded / selected | Confirm | Cancel |
| --- | --- | --- | --- | --- | --- | --- |
| 844×390 | 693.33×390 | 272 | 232 / 180 | 124×96 / 124×48 | 176×48 | 72×48 |
| 960×540 | 960×540 | 360 | 232 / 180 | 168×96 / 168×48 | 160×48 | 72×48 |
| 1280×720 | 1280×720 | 360 | 232 / 180 | 168×96 / 168×48 | 160×48 | 72×48 |
| 844×390, unequal safe insets | 657.77×370 | 237.78 | 232 / 180 | 106.89×96 / 106.89×48 | 141.78×48 | 72×48 |

Safe-area fixture uses left 32, right 12, top 8 and bottom 12 CSS pixels. Standard safe canvas measures 916×515.25; large safe canvas 1236×695.25. Both retain the 360-wide selected tray. Tray left is 124 CSS px relative to the canvas. Normal top is 118 / 121 / 156 CSS px across compact / standard / large. Bottom gesture reserve is at least 24 CSS px. Body text is at least 12 CSS px, heading 16. Art is 40 px expanded and 32 px selected, with original proportions retained.

Selecting a card automatically recovers 52 vertical CSS pixels for placement. Both choices, prices and explicit Confirm/Cancel remain visible. The tray avoids the joystick, combat utilities, minimap and Keep HP bar; combat continues visibly beside it. A fixed tray still covers some world cells and can temporarily obscure actors behind it. The existing Build pan exposes those cells without changing projection, territory or camera rules. The unobstructed-placement capture demonstrates a real exposed ghost, rather than an isolated panel mockup.

## F. Construction state and transactions

`BuildModel` owns selection, collapsed presentation, pending request and status. `BuildPanel` renders public authoritative quotes and placement validity each frame. Selecting an unaffordable type remains possible for inspection; Confirm stays disabled and the live reason identifies Wood/Iron shortage. Displayed resource counters do not override ledger affordability.

Press ownership requires release on the same target. Release outside, cancel, blur, clear-controls and scene shutdown clean up pointer ownership. Pending disables selection and Confirm while leaving Cancel available. A 350 ms same-cell coalescing guard prevents rapid repeated confirmation, while request sequencing survives panel close/open. Existing simulation deduplication remains intact.

The UI emits the existing confirm event once. It does not spend resources or create optimistic structures. A matching `built` acknowledgment identifies authoritative acceptance; structure lookup is the fallback. If the simulation advances past submission without that acknowledgment/structure, the UI reports rejection. Rejection events have no request ID, so unrelated rejection events are never assigned to this request. The reason is the current authoritative placement reason, with generic rejection fallback; precise historical rejection attribution is unavailable under the existing contract.

Acceptance clears the ghost, retains the selected type for subsequent building and shows actual progress until completion. Status distinguishes started from complete and follows the real structure `completeTick`; tests wait for actual completion and retain construction damage. A same-tick destruction after acceptance is still recognized through the matching acknowledgment. Cancel before execution retains the existing command-clearing behavior; Cancel after acceptance does not remove a structure or refund costs.

## G. Changed files

Production:

- `src/scenes/HUD.ts`: replace old Build controls with the panel, retain original placement/pan and simulation command events; isolate existing Army preview offset; publish tray obstruction and position notices beside it.
- `src/ui/BuildPanel.ts`: illustrated controls, live costs/status, pointer ownership and listener cleanup.
- `src/ui/buildLayout.ts`: FIT-aware expanded/collapsed geometry.
- `src/ui/buildModel.ts`: presentation state, pending coalescing, acknowledgment/rejection handling.

Verification:

- `tests/build-ui.cjs`: six model/layout tests.
- `scripts/build-browser-helpers.mjs`: measured Build buttons and responsive geometry.
- `scripts/verify-build-ui.mjs`: actual-game responsive, transaction and lifecycle journeys.
- `scripts/verify-building.mjs`, `verify-builders-crown.mjs`, `verify-navigation.mjs`, `verify-match.mjs`, `verify-mobile-hud.mjs`, `verify-extended.mjs`, `verify-extended-lifecycle.mjs`: migrate obsolete fixed Build coordinates to measured controls. Construction fixture retains exact mechanics assertions and filters player-built structures from pre-existing extended defenders; it pans to expose the original cells and locates the actual Pause control.

Documentation/evidence: this report and `docs/ui-v042-build-slice3/`, including separate Shop/Equipment regression evidence. Raw logs and legacy screenshots remain under ignored `test-results/`. No new artwork or package dependency. No simulation, building data, Battle, Tower, Keep or Skills implementation changes.

## H. Actual-game captures

All captures are from the running Phaser game with battlefield/HUD context. Images are available in [the evidence folder](ui-v042-build-slice3/).

| Capture | Purpose |
| --- | --- |
| [Compact](ui-v042-build-slice3/build-panel-844x390.png) | 844×390 expanded tray |
| [Standard](ui-v042-build-slice3/build-panel-960x540.png) | 960×540 expanded tray |
| [Wall](ui-v042-build-slice3/wall-selected.png) | Collapsed selected state |
| [Archer Tower](ui-v042-build-slice3/archer-tower-selected.png) | Distinct selection and both costs |
| [Exposed valid placement](ui-v042-build-slice3/valid-placement-unobstructed.png) | Existing green ghost and battlefield visibility |
| [Invalid](ui-v042-build-slice3/invalid-placement.png) | Occupied-cell rejection before submission |
| [Wood shortage](ui-v042-build-slice3/insufficient-wood.png), [Iron shortage](ui-v042-build-slice3/insufficient-iron.png) | Live affordability |
| [Pending](ui-v042-build-slice3/pending-construction.png) | Locked Confirm without optimistic success |
| [Accepted Wall](ui-v042-build-slice3/confirmed-construction.png), [Accepted Tower](ui-v042-build-slice3/tower-construction-started.png) | Actual accepted construction |
| [Execution rejection](ui-v042-build-slice3/construction-rejected.png) | Authoritative rejection without spend |
| [Combat](ui-v042-build-slice3/active-combat-visible.png) | Combat remains visible beside collapsed tray |

Pending capture uses a test-only hold on simulation advance with input/rendering active, then restores real execution. Resource boundary, death and results fixtures are test-only. No production state is forged to show success. Captures were visually inspected; machine geometry also checks clipping and overlap.

## I. Verification results

Completed on the final production sources; subsequent changes only migrate historical test fixtures and finish documentation.

| Check | Result |
| --- | --- |
| Full headless `node scripts/test.mjs` | 517/517 passed, zero skipped |
| Build UI + existing Crown/construction simulation focus | 62/62 passed |
| Actual-game Build browser/touch | 60/60 passed, 20 geometry snapshots, zero JavaScript errors |
| Shop regression | 113/113 passed |
| Equipment regression | 121/121 passed |
| Chrome/Edge popup input, mouse DPR1 and touch DPR3 | 152/152 passed |
| Historical construction browser, migrated fixtures | 24/24 passed, zero runtime errors |
| Builder's Crown browser | 27/27 passed |
| Fusion browser | 24/24 passed |
| UI-A1 / UI-A2 browser | 58/58 and 70/70 passed |
| TypeScript | Passed |
| Vite production build | Passed; existing large-chunk advisory |

Build browser checks include live resources and authoritative affordability, valid/invalid cells, both types, exact costs accounting for tick income, double Confirm (one queued command), pending cancellation, execution-time rejection without spend, Wall completion at 60 ticks and Tower at 150 ticks with original HP, dead Guardian, active combat and input suppression, unchanged pan, panel transitions, Pause/results, restart and single listener cleanup. Real construction completion is asserted separately from UI acceptance.

The historical browser migration is partial. `verify-mobile-hud.mjs` and `verify-match.mjs` stop on the retired `HUD.baseText` field, already absent at Equipment HEAD. Mobile also contains a retired Shop “Soon” expectation. `verify-navigation.mjs` reaches seven checks then times out waiting for prototype enemy IDs (`red-0-0`) in the extended encounter, whose units use wave IDs. Their measured Build buttons are migrated, but their unrelated old HUD/encounter fixtures need a separate maintenance pass. No assertions were deleted and no retired production HUD or gameplay rules were restored to satisfy them.

`verify-extended.mjs` and `verify-extended-lifecycle.mjs` have measured Build targets but their long autonomous-match/performance journeys were not rerun. These results do not constitute an all-green historical browser suite. Detailed portable results and source hashes are in [verification-summary.json](ui-v042-build-slice3/verification-summary.json); detailed Build measurements are in [verification.json](ui-v042-build-slice3/verification.json).

## J. Known limitations

Physical Android/device ergonomics remain unverified; touch results are desktop browser emulation. The tray recovers placement space but cannot expose every world cell simultaneously. Existing Build pan is still necessary for covered cells. Rejection attribution is limited by the existing no-request-ID rejection contract. The three obsolete whole-game scripts above remain failing; long match/performance scripts are not certified by this slice. No changes were made to gameplay to work around those fixtures.

## K. Integration risks with gameplay v0.4.1

The gameplay worktree was not modified, and no combined integration branch was created. Combined v0.4.1 behavior therefore remains unverified. Integrate HUD changes carefully: preserve gameplay's Azure Keep HP HUD, `hud-clearance`, current Keep anchoring and Tower combat logic. Build reuses the existing `shop-obstruction` event to communicate its visible bounds; retain both Shop and Build publishers plus the existing Battle listener. Recheck clearance after any HUD merge or revised canvas safe-area policy.

No Battle renderer or Tower behavior was edited. Current-branch Crown, construction, UI-A1/A2, Shop and Equipment checks passed, including Keep-bar clearance. They do not replace testing the eventual combined branch. Confirm listener cleanup and all transaction bridges again after conflict resolution.

## L. Recommendation

Ready for human review of Build UI and its focused behavior. Review compact art legibility, automatic collapse and placement visibility using the actual-game captures. Historical whole-game browser compatibility remains incomplete as detailed above; this is not an unconditional release sign-off.

Build remains uncommitted on Equipment `7634b13fd1c497234f3dd74dd91e4df88301587f`. No push or merge. Stop here for approval before committing Build; Skills Slice 4 has not started.
