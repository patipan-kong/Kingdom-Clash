# UI v0.4.2 / Slice 1 — Shop icon grid

15 October 2026 · Implemented for human UI review; **not committed, pushed or merged**.

## Baseline and isolation

Verified `main` and created the managed worktree from current main at **`da7475debb5e382c429d9005ff010390dcc7a1cc`**, then created the explicitly requested branch **`ui-v0.4.2-shop-grid`**.

Worktree: `C:/Users/patip/.codex/worktrees/ui-v042-shop-grid/arkhero`.

Main's checkout remains `G:/work/ark/arkhero`. Its five existing untracked investigation/design documents were neither edited nor cleaned. The original proposal and external Round 2 artifacts were inspected in place. The missing standalone Round 2 filename is now a concise [decision record](UI_REDESIGN_REVIEW2_V042.md) in this isolated branch, explaining the provenance.

`G:/work/ark/arkhero-gameplay-v041` on `gameplay-v0.4.1-balance` was inspected read-only. It contains uncommitted changes to HUD, Battle, Simulation, GuardianSkills and the balance script, plus new Azure Keep HUD/balance files and evidence. Its `ShopPanel.ts`, `shopModel.ts` and `topHudLayout.ts` have no uncommitted edits. None of that work was copied, staged, edited or cleaned. No main/origin/main ref update occurred.

## Implementation

The paginated Shop catalog is replaced by all seven live items in a4×2 grid. Each cell has an explicit item-ID mapping, distinct temporary silhouette, short name, authoritative quoted Gold cost, selected check/blue fill, affordability treatment and pointer press feedback. The eighth position has no product or hit target. On standard screens its subdued area holds noninteractive transaction/restriction/temporary-art feedback.

Compact item selection opens complete details and a48 px Buy inside the same panel; Back retains the selected product. Standard/desktop selection keeps every tile visible and updates full ordinary-item effects and Buy beneath the grid. Flame selection on compact opens the recipe; standard offers an explicit Recipe action. Close remains reachable while a trade is pending.

Full effects come from current artifact modifiers, with existing Crown/Banner restrictions included. Catalog selection is distinct from Equipment's selected exact owned instance. Buy, sell and combine continue to use the existing quote readers, trade commands and request-correlated acknowledgments. There is no optimistic ownership/Gold mutation or extra ordinary-purchase confirmation.

Input activates on release of the pointer that began on a visible enabled control. Cancel/blur/shutdown release ownership. A300 ms,24 CSS px spatial guard prevents a double tap on a tile/Recipe from activating a newly exposed purchase control at the same point; an immediate tap on a different Buy location is allowed. Identical trade intents are additionally coalesced for350 ms so an acknowledgment between the two physical taps cannot cause a second purchase. This is a presentation safeguard, not a simulation rule. Existing canvas touch capture remains unchanged. Pending commands still provide the transaction lock; scene cleanup removes added listeners.

Equipment/component picker retain their text-slot presentation, original geometry/material and explicit instance selection. Their existing smaller/wider legacy panel bounds are retained instead of implementing the approved future Equipment icon redesign. New grid/detail/recipe bounds are published through the existing `shop-obstruction` event whenever the active view changes. The HUD edit is one call-site argument passing its actual clearance separately from the legacy Equipment/notice anchor. Build, Skills, Pause, results, minimap and permanent HUD behavior are unchanged.

Flame recipe shows complete effects, explicit selected slot or None, each missing component's quoted cost, quoted fee and total due. Stale selected instances disable Combine. Full-inventory capacity is still computed by the simulation after the explicitly selected instances are consumed; duplicates are never chosen automatically. Equipment sales retain authoritative paid-basis refunds and Confirm/Cancel.

## Files changed

| File | Purpose |
|---|---|
| `src/ui/ShopPanel.ts` | Catalog grid, complete responsive details, recipe presentation, pointer feedback/lifecycle; existing Equipment paths |
| `src/ui/shopModel.ts` | Separate selected catalog product and compact detail view; existing request correlation/reset retained |
| `src/ui/shopGridLayout.ts` | CSS-sized, FIT-aware capped panel geometry and compact breakpoint |
| `src/ui/shopItems.ts` | Seven explicit live-ID/short-name/placeholder mappings and supported full effect text |
| `src/ui/ShopItemIcon.ts` | Seven procedural **temporary** silhouettes; no unrelated ability-icon substitution |
| `src/scenes/HUD.ts` | Pass actual HUD clearance as the optional fourth Shop layout argument; retain legacy anchor |
| `tests/shop-grid.cjs` | Catalog/effect mapping, FIT/safe-area target geometry, catalog-vs-owned identity/reset |
| `scripts/verify-shop-grid.mjs` | Running-game grid, transactions, Fusion, restrictions, geometry, touch and lifecycle verification/captures |
| `scripts/verify-shop.mjs` | Preserve existing entry point; delegate to the grid-aware verifier |
| `scripts/verify-popup-touch.mjs` | Follow approved inspect→Buy and Back→Equipment navigation; retain the120 existing checks |
| This report, Round 2 decision record, `docs/ui-v042-shop-slice1/` | Review evidence and measurements |

No simulation, item data/stats, wave schedule, tower, Guardian, construction, Keep behavior or production asset file changed. No dependency/version change.

## Actual running-game screenshots

These are Chrome screenshots of the real Phaser implementation, not HTML mockup overlays. File names and visible labels identify temporary icons. The two Gold-funded Fusion fixtures use the existing authoritative ledger and purchase commands in disposable test sessions; they do not describe natural match pacing.

| Screenshot | Scenario |
|---|---|
| [Compact catalog](ui-v042-shop-slice1/compact-grid-844x390-TEMP-icons.png) | Seven visible products, selected item, unaffordable costs and temporary-art label |
| [Compact full detail](ui-v042-shop-slice1/compact-detail-844x390-TEMP-icons.png) | Shield HP/armor and disabled Buy at insufficient Gold |
| [Standard grid with detail](ui-v042-shop-slice1/standard-grid-details-960x540-TEMP-icons.png) | All seven products plus full Shield details/action |
| [Equipment after grid](ui-v042-shop-slice1/equipment-text-slots-after-grid.png) | Existing six text slots remain functional |
| [Exact component picker](ui-v042-shop-slice1/fusion-exact-component-picker.png) | Duplicate Swords/Gems remain separate owned slots |
| [Flame recipe](ui-v042-shop-slice1/flame-recipe-exact-slots-TEMP-icons.png) | Sword slot2 and Gem slot4;300 Gold due from authoritative quote |
| [Restricted purchase](ui-v042-shop-slice1/restricted-range-844x390-TEMP-icons.png) | Living Guardian out of range; Buy disabled with return guidance |

## Responsive measurements

Coordinates below are CSS pixels relative to the rendered game canvas. The browser's complete viewport, including letterboxes, is retained in screenshots. Breakpoints depend on actual canvas dimensions, not browser width.

| Browser / safe-parent setup | Rendered canvas | Grid panel x,y,w,h | Catalog cell | Minimum action / bottom reserve |
|---|---|---|---|---|
|844×390, no insets |693.328×390 at viewport75,0 |124,118,272,248 |58×64 |48×48 /24 |
|960×540 |960×540 at0,0 |124,156,480,328 |110×68 |48×48 /56 |
|1280×720 |1280×720 at0,0 |124,156,480,328 |110×68 |48×48 /236 |
|844×390, left32/right12/top8/bottom12 |657.766×370 at103,8 |124,98,237.778,248 |49.444×64 |48×48 /24 |

The standard implementation uses8 px outer inset consistently, yielding464 px inner width and110 px cells, rather than the mockup's12 px standard inset/108 px cells. This gives a little more text width while preserving the exact480×328 outer envelope. Type is12 CSS px for tile names/costs,14 for full effects,16 for names; large desktops do not enlarge it excessively. Back/Close/Buy/component selectors remain at least48 CSS px. The existing Equipment panel retains its baseline geometry (compact about271.33×232.61 at124,133.39).

The live verifier checks all seven selections at all four configurations, visible targets in bounds/non-overlapping, text bounds, no text over unrelated actions, actual top-HUD clearance, control-column separation and bottom reserve. See [machine-readable geometry and scenarios](ui-v042-shop-slice1/verification.json). Safe-area evidence is browser emulation of the existing safe-parent CSS variables, not physical Android certification.

## Gameplay contracts and regression coverage

Verified through real touch input and existing authoritative APIs:

- Shop open/close/toggle, absolute0.25 speed, continuing combat, blocked Guardian movement/casts and cleared intent.
- All seven products inspect without spending. Sword and Hammer purchases acknowledge exactly once; full Shield effects and Gold/capacity restrictions remain readable.
- Living proximity and path-blocking rejection; dead distant trading; inactive/ended match rejection. The baseline quote reader prioritizes Paused when the ended match's clock is paused; the UI does not invent a different reason.
- Flame with zero/one/two components at650/450/300 due, including actual transactions. Duplicate-instance picker consumes only the chosen Sword/Gem; six-full inventory fuses to five items after consuming two, preserving unselected duplicates. Stale selection disables purchase; Use none is explicit.
- Equipment six slots, item selection, sale confirmation/cancel and exact quoted refund.
- Pending rapid taps queue only one trade; navigation locks; Close cancels an unexecuted queued intent without spending; success only follows matching acknowledgment.
- HP-bearing Keep defense alert, unchanged defense expiry, world-attached Keep HP above the Shop, and tower warning beside the panel retain clearance.
- Pause/results priority, normal resume speed, restart inventory/Gold/pending reset, scene cleanup and one activation after restart, blur/portrait handling.

## Test results

Baseline before changing production Shop code: **57/57** existing Shop/artifact/transaction headless tests passed; unchanged legacy Shop browser verifier passed; unchanged Chrome/Edge popup verifier passed **120/120** checks. No pre-existing browser failure was observed in those baseline runs.

Final results are recorded below and in the checked-in browser evidence. The existing `verify-shop.mjs` entry point now executes the grid-aware scenarios instead of obsolete page-index assumptions. The updated popup verifier preserves the same120 behavioral/geometry checks, adding only the newly required item-inspect and compact Back steps.

- Focused Shop/artifact/transaction/grid headless tests: **60/60 passed**.
- Full headless suite: **503/503 passed** (500 existing +3 new grid tests).
- TypeScript strict check: passed.
- Vite production build: passed; existing >500 kB chunk-size advisory remains.
- Shop browser/touch scenarios: **110/110 passed**, zero browser JavaScript errors;38 geometry/view measurements, including restricted recipes at all four configurations.
- Chrome/Edge mouse DPR1 and touch DPR3,844/960 popup regressions: **120/120 passed**.
- Diff/whitespace check: passed; Git's existing CRLF-conversion notices are informational.

During development, the new layout test needed floating-point tolerance for48 and248 CSS px. Browser assertions were also corrected to permit deliberately tapping a disabled pending button and to respect the baseline's ended-match reason priority. These were verifier issues, not changes to gameplay rules or weakened transaction checks. Final unresolved failures, if any, must be listed explicitly rather than treated as pre-existing.

Final exercised suites have **no unresolved new failures and no observed pre-existing browser failures**. This is not a claim that every historical browser script passes: the older `verify-ruby`, `verify-flame-fusion`, `verify-builders-crown`, `verify-siege-hammer`, and `verify-commander-banner` scripts still assume Next/page indexes and retired `titles`/`descriptions` fields; `verify-ui-a1`/`verify-ui-a2` explicitly assert the former Shop envelope is unchanged. Those phase-specific expectations are superseded by this approved redesign and were not run or rewritten in this slice. Use the updated `verify-shop.mjs` entry point for current UI/trading validation. Migrate historical navigation/geometry assumptions before reusing those scripts; their underlying item-mechanic headless tests remain in the passing full suite. No baseline failure was relabeled to hide a regression.

Commands: `node scripts/test.mjs shop-grid.cjs shop.cjs artifacts.cjs artifact-transactions.cjs`; `node scripts/test.mjs`; `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/vite/bin/vite.js build`; `PROTOTYPE_URL=http://127.0.0.1:<port>/?encounter=extended node scripts/verify-shop.mjs`; the same local URL with `node scripts/verify-popup-touch.mjs`; `git diff --check`. Browser runs used temporary local Vite servers and stopped them afterward. Raw suite/build/browser logs stay in ignored `test-results/`; the curated browser report/screenshots are under `docs/ui-v042-shop-slice1/`.

## Icons and remaining review work

All seven Shop item icons are **temporary procedural silhouettes**, not final approved256×256 transparent painted PNGs. Their explicit ID mapping and visible TEMP labeling make the remaining art dependency clear. No emoji or unrelated combat ability icon substitutes are used. Commission/review the seven previously approved portraits, then replace the mapping/rendering seam without changing item identity or trading logic.

Human review should assess the compact item-first purchase step, actual phone thumb comfort, short-name readability at12 px, silhouette recognition, and whether the standard panel should move nearer combat without changing the protected controls. Final art, physical Android/WebView ergonomics and localization remain outside this verified browser slice. Equipment intentionally remains the old text-slot interface.

## Integration with gameplay v0.4.1

There is one expected manual merge hotspot in `HUD.layoutControls()`. v0.4.1 adds `keep-hud-obstruction` before the existing HUD-clearance/Shop-layout publications. Preserve that new Keep publication, and add this slice's fourth `this.topHudBottom` argument to `shop.layout(scale,this.shopHudBottom,utilityX,...)`. Keep `shopHudBottom` as the legacy Equipment/notice anchor. Do not replace v0.4.1's whole HUD file with this main-based version.

`Battle.ts` was not changed here. Preserve v0.4.1's new `keep-hud-obstruction` listener and world-Keep avoidance, plus the existing `shop-obstruction` path. This slice emits the actual active Shop/Equipment/picker bounds when a subview or resize changes geometry; the event remains in logical canvas coordinates. Verify the combined Keep plate, world bars and notices during camera movement, attacks and safe-inset changes after integrating both reviewed slices. The combined branch has not been tested or merged here.

Simulation/balance experiments from v0.4.1 are deliberately absent. Integrate only after both owners' review, retaining all independently approved gameplay changes. This branch remains uncommitted for human UI approval.
