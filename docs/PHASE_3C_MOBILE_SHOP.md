# Phase 3C — Playable mobile Shop

Baseline: `084652db749cafb769d8adeacbf9c17c0dbbd74a`. Implements the mobile Shop slice of [Phase 3 design](PHASE_3_DESIGN.md). **Phase 3C passed technical and manual visual review and is approved for finalization. No Phase 3D or Fusion.**

## Interface and authoritative integration

The existing Shop utility is functional in **Extended Encounter**, retaining its position, size and artwork. Army remains Soon; prototype Shop remains unavailable. No permanent inventory control or new assets were added.

[ShopPanel](../src/ui/ShopPanel.ts) uses existing teal/gold materials. Shop displays only Iron Sword and Guardian Shield, with names, flat effects derived from catalog metadata, authoritative quoted costs and disabled-action states. Gold/owned slots come from match state. The Shop and Equipment tabs and Close action have at least48 CSS px hit targets. Equipment shows six automatically equipped slots. Selecting an owned instance opens its name/effect and actual refund; Sell first opens explicit Confirm/Cancel actions. Tap Equipment to return to all slots. No equip/unequip, swapping or backpack.

[Simulation's read interfaces](../src/simulation/Simulation.ts) expose immutable purchase availability, exact sale refund and access reasons using the private Gold ledger, Phase 3A quotes and Phase 3B sale planner. The UI never debits Gold, grants an item or calculates a refund. Browse outside range; buy/sell disable with a return-to-Keep explanation. The approved240 footprint range/LOS and dead-trading bypass are unchanged. Full inventory, insufficient Gold, inactive/paused match and unsupported products remain distinct authoritative reasons.

[ShopModel](../src/ui/shopModel.ts) owns view/selection/confirmation and one pending action with a unique request ID. A pending action blocks additional buys/sales and tab/slot changes. Success is displayed only after its matching `item-traded` event; trade rejection events now carry optional request identity for accurate correlation. Unrelated events cannot complete a pending action. Requests remain unique across panel reopenings and are scoped to the active session through existing commands. Close cancels unexecuted queued trades through existing hero-input cleanup; already committed ownership always comes from state.

## Input, time and protected information

[HUD](../src/scenes/HUD.ts) makes Shop, Build and Skills mutually exclusive. Opening Shop emits shared pointer/aim cancellation, clears hero attack/target/movement intent and disables hero controls while allowing the utility column to switch panels. [Battle](../src/scenes/Battle.ts) blocks hero movement/casts and world target/inspection touches during Shop mode; the panel backdrop consumes Shop touches. Existing Build/skill behavior and keyboard testing support are retained.

Shop and Build use absolute0.25 timeScale; Skills/closed menus use1. Pause closes panels and freezes the clock. Resume returns to normal speed, never multiplied scales. Background blur and portrait invoke the existing true-pause path. Dead trading works in the same interface. Death cancels a still-pending request UI if input was discarded. Results, Restart and shutdown clear the panel/pending state; Restart resets match inventory/ledger and request ownership as before.

The compact panel lies below actual top-HUD clearance, between the left joystick and existing utility/combat column, with the24px bottom reserve. Its height is capped at244 CSS px at larger sizes. Important danger notices stay in their existing slots; the general slot moves beside the panel while shopping. Existing Keep HP bars remain attached horizontally to their Keeps and render above world effects. If a bar would intersect the Shop, its presentation shifts into the gap above the panel, respecting top-HUD clearance; closing restores the normal placement. No health, collision or structure location changes.

## Verification

`npm test -- shop.cjs artifact-transactions.cjs artifacts.cjs guardian-skills.cjs progression.cjs simulation.cjs notice-slot.cjs defense-feedback.cjs context-guidance.cjs damage-feedback.cjs` — **221 passed**. Covers read-only quotes/capability/access, pending correlation and double taps, cancellation/request uniqueness, compact geometry and existing trading, Guardian, progression, resource and feedback regressions.

`node scripts/verify-shop.mjs` — uses an already running local Vite server (default5185, overridable through `PROTOTYPE_URL`; this run used5186). **31 focused** browser interaction/layout checks passed: Extended entry, out-of-range browsing, initial-Gold Sword, six slots, sale confirmation/cancel/exact refund, reward-funded Shield, dead sale, Build→Shop→Skills, Pause/Resume, real simultaneous joystick/Shop touches, pending double tap/close cancellation, full inventory, results/Restart, both requested sizes and safe areas, B1/B2 notice clearance, Keep HP clearance and blur/portrait cleanup. A supplementary Equipment/detail/confirmation bounds pass at844×390,960×540 and844×390 with safe areas passed without extra screenshots.

Fixtures are explicit: validated logical hero positioning;22 test minion deaths through the actual combat/reward pipeline to fund Shield after sale; supplemental existing-ledger rewards for full-slot checks; zero HP for dead access; frame scheduling temporarily stopped to inspect a genuine pending request; a synthetic existing B1 warning event and confirmed positive Keep damage for B2. These demonstrate integration, **not** normal match pacing, Android performance or device certification. No Gold income, XP, waves or AI definitions were changed.

`npm run build` — TypeScript/Vite passed; existing bundle-size advisory remains. `git diff --check` and new-file whitespace/conflict checks passed. Raw logs/debug fixtures are local under ignored `test-results/`; no generated evidence collection enters the review scope.

## Visual review and remaining tradeoffs

One final representative [844×390 screenshot](phase3c/shop-844x390.png) shows a fresh Extended match after buying Sword with initial funds, the two-product Shop and retained danger notices. No item art was generated.

Equipment detail replaces the slot grid while selected; this is deliberate to keep48px actions and readable descriptions at844×390. Close is always reachable, including pending requests. Hero controls remain visible but disabled while shopping; close before moving back into range. The current finite Gold pacing is unchanged and still needs normal manual gameplay review. Physical Android touch/performance checks remain deferred. No unresolved transaction rules are introduced.

Changed files: HUD, Battle, UtilityButton, new ShopPanel/shopModel; Simulation quote readers and request-correlated trade rejection types; focused shop tests/browser verifier; design status, this report and one screenshot. Existing transaction rules/stat composition and all original artifact metadata remain intact. Finalization reruns focused checks and build with `CAPTURE_SCREENSHOT=0`, preserving the approved image. **Do not proceed to Phase 3D.**
