# UI v0.4.2 — Equipment Slice 2

Date: 2026-10-15. Equipment Slice 2 is **approved, including the final targeted visual refinements**, for a local commit. No push or merge was performed.

## Git baseline and approved Shop commit

The approved Shop Slice 1 + 1B is one local commit:

`5762fc6fc4db4b97dc5d51018570c6af67fd4d9d`

Title: `feat(ui): redesign shop grid and add fantasy item art`.

Branch: `ui-v0.4.2-shop-grid`. Parent/base: `da7475debb5e382c429d9005ff010390dcc7a1cc`. Implementation worktree: `C:\Users\patip\.codex\worktrees\ui-v042-shop-grid\arkhero`.

Preflight matched the reviewed change inventory; no unexpected modifications were found. Approved code, artwork, original art sources, tests, historical migrations and documentation were preserved. Generated-image provenance paths were made portable: original filenames and repository-relative preserved-source paths replace local generation-directory references. The preparation script now requires the preserved source files rather than copying from a private machine path. No credentials or files over 5 MB were found in the Shop change set. Seven original art PNGs total approximately 9 MB and are intentional reproducible authoring sources; build output and caches remain ignored. The focused 61-test Shop suite passed after provenance cleanup. The Shop commit left a clean working tree before Equipment edits began.

Main/origin/main and all other worktrees were not modified. At the start of finalization, Equipment changes were on top of the Shop commit, unstaged and uncommitted. The user subsequently authorized one local Equipment commit after verification. No gameplay, balance, item-definition, Tower, Keep or Skills implementation files are changed in Slice 2.

## Design and responsive behavior

Equipment now displays six numbered slots in a **3-column × 2-row** grid. Occupied slots use the approved painted item assets with contain-scaling, short names and slot indices. Empty slots have quiet outlines and an Empty label. Selected slots retain the Shop's royal-blue fill and antique-gold border. Full names and complete effects are displayed separately from the slot labels. There is no drag-and-drop, swapping, manual equip or rearrangement.

Standard/large: the grid occupies the left side; full details sit beside it. Gold/count and transaction feedback remain beneath the grid. A quiet vertical divider separates inventory from details. The 160×48 CSS px sale/confirmation action is aligned right; confirmation retains a separate 72×48 Cancel control. Compact retains its full-width action. The panel stays capped at 480×328 CSS px, including 1280×720.

Compact: six slots sit above a full-width detail area. The selected Equipment tab also displays live Gold and occupied count. Full names use 14 px text; effects and slot labels use 12 px. The sale row remains 48 px high. Compact Equipment uses the space between the actual HUD bottom and the existing 24 px gesture reserve, making it taller than the Shop without covering the joystick or combat/utility controls. Shop itself retains its approved dimensions and presentation. The initial narrow side-detail experiment did not fit Banner's full passive copy under unequal safe insets; the final stacked compact layout resolves that constraint without truncating text or shrinking touch targets.

| Viewport / insets | Actual FIT canvas | Equipment panel, CSS px relative to canvas | Slot target, CSS px |
|---|---|---|---|
| 844×390 | 693.33×390, viewport x=75 | x=124, y=83.83, 272×282.17 | 84×48 |
| 960×540 | 960×540 | x=124, y=156, 480×328 | 68×76 |
| 1280×720 | 1280×720 | x=124, y=156, 480×328 | 68×76 |
| 844×390, unequal safe insets | 657.77×370, viewport x=103/y=8 | x=124, y=80, 237.78×266 | 72.59×48 |
| 960×540, unequal safe insets | 916×515.25, viewport x=32/y=10 | x=124, y=156, 480×328 | 68×76 |
| 1280×720, unequal safe insets | 1236×695.25, viewport x=32/y=10 | x=124, y=156, 480×328 | 68×76 |

Safe-area fixture: left 32, right 12, top 8, bottom 12 CSS px. The logical canvas remains 960×540; letterboxing and Phaser pointer transforms are respected. Painted icon wrappers render at 32 CSS px compact and 44 px standard, preserving alpha and aspect ratio. All seven full effect sets, including Commander Banner and Flame Blade, passed compact normal/safe layout checks. All six slots remain visible during selection, confirmation and pending sale.

## Exact-instance selection and sale safety

The presentation model stores both `selectedSlot` and the exact `selected` instance ID. Selecting a slot reads that slot's current instance; it never searches by item type. Duplicate tiles also carry exact slot/instance metadata, so identical Sword/Gem/Banner art does not imply shared identity. If a later purchase fills an inspected empty slot, its old Empty selection is cleared rather than labeling the new item Empty or automatically selecting it.

Confirmation records `confirmedInstance` separately. Selecting another slot, switching tabs, canceling, closing or resetting clears confirmation. Before each render, selection is reconciled against the live slot and instance table. A removed, consumed or replaced instance clears selection and confirmation; a new same-type item in the same slot cannot inherit the old confirmation. A surviving duplicate remains independently selectable. A successfully sold slot becomes a neutral empty slot rather than selecting a remaining duplicate.

Sell continues to use the authoritative current sale quote and the existing two-step confirmation. No inventory or Gold is changed optimistically. Pending sale locks slot/tab/action navigation, keeps the intended instance selected and displays Pending; Close remains available through the existing cancellation policy. Correlated acknowledgments update the display from authoritative inventory and Gold. Rejection retains the item and Gold, clears pending state and displays the restriction. The existing same-intent coalescing safeguard remains intact. Dead distant Guardian trading is unchanged.

Compact selected-item restrictions are displayed in the disabled sale action with the quoted refund (for example Too Far and its Gold amount). Standard Equipment also shows the current access guidance. Neutral/empty compact states use the footer feedback line. Success messages are shown only after matching acknowledgments. Model feedback remains request-correlated and retains the original item-specific messages.

Shop → Equipment → Shop preserves the previously selected catalog product; Equipment selection also survives tab round trips when its exact instance remains valid. Gold and occupied count read live inventory/economy state. The existing Fusion component picker remains a separate exact-slot workflow; no automatic component consumption was introduced. Shared panel obstruction events use the new Equipment bounds. Existing combat speed, Guardian input suppression, Pause/results priority, pointer ownership and shutdown cleanup remain in place.

## Files changed after the Shop commit

| File | Purpose |
|---|---|
| `src/ui/ShopPanel.ts` | Painted six-slot Equipment, responsive details, exact-instance confirmation, existing component-picker isolation |
| `src/ui/shopModel.ts` | Slot/instance selection, live reconciliation and confirmation identity |
| `src/ui/equipmentLayout.ts` | Equipment-only CSS layout within existing HUD/control clearance |
| `tests/equipment-ui.cjs` | Seven focused layout/identity/transaction/Fusion tests |
| `scripts/verify-equipment.mjs` | Actual-game Equipment scenarios, geometry and screenshots |
| `scripts/verify-popup-touch.mjs` | Four added Equipment assertions per Chrome/Edge mouse/touch configuration |
| `scripts/verify-shop-grid.mjs` | Validate painted Equipment labels within their own slot targets; retain Shop assertions |
| `scripts/verify-ruby.mjs` | Separate full-name/effect fields plus exact slot identity assertion |
| `scripts/verify-flame-fusion.mjs` | Wait for completed component-picker state before reading exact selection |
| `scripts/shop-browser-helpers.mjs` | Wait for actual enabled Buy after fixture ledger funding; rapid-tap paths unchanged |
| `docs/ui-v042-equipment-slice2/` | Running-game screenshots and structured verification, plus Shop regression evidence |
| This report | Review and integration record |

No new art assets or dependencies were required. Seven paintings, provenance and licensing remain in the approved Shop commit and asset manifest.

## Verification

| Check | Final result |
|---|---|
| Focused Equipment/Shop/artifact/transaction tests | **68/68 passed** |
| Full headless suite | **511/511 passed**, zero skipped |
| Equipment browser/touch scenarios | **121/121 passed**, 56 geometry measurements, zero JavaScript errors |
| Shop grid browser regressions | **113/113 passed** |
| Chrome/Edge popup mouse/touch regressions | **152/152 passed** |
| Historical Ruby / Flame / Crown / Hammer / Banner / UI-A1 / UI-A2 | **227/227 passed** (10 / 24 / 27 / 19 / 19 / 58 / 70) |
| TypeScript `--noEmit` | Passed |
| Production build | Passed; existing >500 kB bundle advisory remains |
| Diff/whitespace and final Git scope | Passed; only Equipment code/tests/evidence/report changes remain, unstaged |

The seven new headless tests cover responsive targets, duplicate exact-slot sale, pending selection lock, empty selection, later purchases filling inspected empty slots, replacement canceling confirmation, Fusion consuming the selected duplicate, and correlated rejection/dead sale quotes. Existing artifact and Fusion mechanic assertions are retained.

Actual-game scenarios cover six empty/one occupied/six occupied slots, each slot independently selected at three viewport sizes with and without safe insets, exact duplicate identity, full effects/refund, Sell/Cancel/Confirm, pending double taps, rejection after access changes between submission and execution, dead remote sale, stale same-type replacement, Fusion consuming a confirmed component, Shop/Equipment round trips, combat input suppression, Close, Pause, results, restart and subsequent activation. Controlled setup uses the existing reward ledger and authoritative trade commands; death/results fixtures only exercise lifecycle behavior.

Chrome and Edge run mouse DPR1 and touch DPR3 at 844×390 and 960×540. All original 120 popup assertions remain; 32 additions verify painted exact selection/refund, geometry, confirmation and cancellation. Historical Ruby's old combined name/effect text assertion now checks both separate fields and the exact selected slot. The Shop geometry verifier permits a slot's own name/index only when fully contained within that same target; other text/action overlap still fails. Transaction, refund, stat and exact-component assertions have not been removed.

No baseline failures were observed in the reviewed Shop results or precommit focused run. Development failures were tracked separately: an initial compact Banner layout overflow was fixed by reflow, and two new headless fixtures initially retained immutable pre-transaction inventory snapshots; they now inspect live post-transaction state. The historical Fusion run also exposed a fixture timing race: reward funding changed the ledger before HUD render enabled the second Sword's Buy, so the disabled click left only one Sword for the duplicate picker. The shared helper now waits for the actual enabled control before deliberate purchases, without retrying clicks or bypassing restrictions. Its `frames=false` rapid-tap paths are unchanged. The picker assertion still requires the exact second Sword and unchanged 450/300 costs. Temporary input diagnostics were removed. Final exercised suites have no unresolved failures; no mechanic or transaction assertion was weakened to obtain passing results.

Commands: `node scripts/test.mjs equipment-ui.cjs shop-grid.cjs shop.cjs artifacts.cjs artifact-transactions.cjs`; `node scripts/test.mjs`; `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/vite/bin/vite.js build`; `git diff --check`. With a local Vite server and `PROTOTYPE_URL`, run `scripts/verify-equipment.mjs`, `scripts/verify-shop.mjs`, `scripts/verify-popup-touch.mjs`, and the seven historical scripts. Use `EVIDENCE_ROOT=docs/ui-v042-equipment-slice2/shop-regression` for the Shop run to preserve the approved Shop evidence. Raw logs remain ignored under `test-results/`; structured evidence is saved with the screenshots.

## Actual-game screenshots

| Required state | Screenshot |
|---|---|
| Empty Equipment, 844×390 | [Empty compact](ui-v042-equipment-slice2/empty-844x390.png) |
| Occupied Equipment, 844×390 | [Occupied compact](ui-v042-equipment-slice2/occupied-844x390.png) |
| Occupied Equipment, 960×540 | [Occupied standard](ui-v042-equipment-slice2/occupied-960x540.png) |
| Full six-slot inventory, 960×540 | [Full inventory](ui-v042-equipment-slice2/full-six-slots-960x540.png) |
| Selected details and Sell | [Details and quote](ui-v042-equipment-slice2/selected-details-and-sell.png) |
| Sale confirmation | [Confirmation](ui-v042-equipment-slice2/sale-confirmation.png) |
| Duplicate instances | [Second Sword selected](ui-v042-equipment-slice2/duplicate-item-instances.png) |
| Shop ↔ Equipment | [Equipment](ui-v042-equipment-slice2/navigation-equipment.png), [returned Shop selection](ui-v042-equipment-slice2/navigation-shop.png) |

These captures show the actual running Phaser battlefield/HUD with FIT letterboxing. The illustrated icons and text were visually inspected at rendered size. [Equipment verification](ui-v042-equipment-slice2/verification.json), [Shop regression verification](ui-v042-equipment-slice2/shop-regression/verification.json) and [overall check summary](ui-v042-equipment-slice2/verification-summary.json) preserve measurements and scenario results.

## Limitations, integration risks and recommendation

Physical Android touch/performance and final human UI review remain outstanding. Browser emulation is not a physical-device claim. The compact panel is taller than Shop to fit all six slots plus full effects and confirmation; it remains below the HUD, above the 24 px gesture reserve and clear of both control columns. Viewports smaller than the tested landscape/safe-area cases are not newly certified.

No v0.4.1 worktree was edited. The combined balance/UI integration remains untested. Preserve the other branch's Keep HP/obstruction work when integrating the existing Shop HUD callsite/preload changes. Equipment itself adds no HUD or Battle implementation edits; it reports its bounds through the existing obstruction event. After integration, rerun the full suite, Equipment/Shop/popup, UI-A1/A2 and the balance branch's Keep-obstruction checks. Preserve all three Shop/Equipment layout/model files together.

**Finalization: approved for local Equipment commit.** All functional behavior and the targeted standard Sell/divider refinements are approved. The final browser measurements additionally verify the standard sale action remains 140–180 px wide and right aligned. Physical phone and combined-branch obstruction verification remain follow-ups. Build Slice 3 begins only after the local Equipment commit; Skills redesign remains outside scope.
