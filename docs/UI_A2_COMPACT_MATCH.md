# UI-A2 — Compact Match HUD implementation

Baseline `0701569a7221b9b5fabbcdaa42faa604a5342a96` · 14 October 2026 · Technical/visual review passed; approved for UI-A2 commit and publication after the two final checks below. No UI-B/UI-C, balance or Phase4 work.

Authority: [approved A2 design](UI_A2_COMPACT_MATCH_DESIGN.md). [Representative844×390 screenshot](ui-a2/match-844x390.png) shows an off-camera authoritative positive-damage fixture and the existing transient notice, not a naturally played match.

## File scope

- [HUD.ts](../src/scenes/HUD.ts):250×64 CSS teal/gold Match plate,14px objective and12px wave/timer/resources, reused resource artwork; removed permanent Keep HP text. Separate timer remains visible during nearby/confirmed threat. Existing650ms Azure emphasis now outlines the Match plate; current Azure HP appears on the second line of the existing defense notice. World clearance includes actual plate bounds and the unchanged minimap frame/shadow. Guardian/Skills, portrait, combat/utility controls, Pause and initial orientation geometry/copy remain unchanged.
- [topHudLayout.ts](../src/ui/topHudLayout.ts): Match centered between actual Guardian-right+8 and actual Pause-target-left−16. A1 Guardian outputs and legacy `shopHudBottom` are unchanged.
- [noticeSlot.ts](../src/ui/noticeSlot.ts): optional stable notice identity, identity-specific update/clear. Existing callers default identity to message, preserving their priority/deduplication/expiry behavior. Defense updates its content without reopening/extending the notice or wiping another notice.
- [top-hud-layout.cjs](../tests/top-hud-layout.cjs), [notice-slot.cjs](../tests/notice-slot.cjs): seven new focused geometry/identity cases, preserving existing regressions.
- [verify-ui-a2.mjs](../scripts/verify-ui-a2.mjs): narrow live layout/feedback/lifecycle/popups checks and one screenshot. [verify-ui-a1.mjs](../scripts/verify-ui-a1.mjs) updates only its obsolete Match-bound assertions for the approved A2 plate; Guardian checks remain.
- This report and `docs/ui-a2/match-844x390.png`. Pre-existing design proposals and unrelated balance-investigation work remain untouched.

No simulation, threat predicate, damage, Gold/resource economy, trading, inventory, construction, skill, AI or timeScale code changed. No new artwork, CSS, mobile capture changes or original-spec modifications.

## Measured bounds and clearance

Coordinates are CSS pixels relative to the rendered canvas (844×390 browser renders693.33×390 centered with~75px side margins).

| Viewport | Previous Match(x,y,w,h) | Current Match(x,y,w,h) | Actual world clearance before→after | Shop anchor unchanged |
|---|---|---|---|---|
|844×390 |222.44,8.67,267.22,92.44 |235.25,8,250,64 |109.11→83.83 (25.28px reclaimed) |121.39 |
|960×540 |308,12,370,128 |351.5,8,250,64 |148→113 (35px reclaimed) |148 |
|1280×720 |410.67,16,493.33,170.67 |475.67,8,250,64 |194.67→148 (46.67px reclaimed) |194.67 |

With844×390 asymmetric safe insets32/12px left/right and8/12px top/bottom, the resized canvas is657.78×370; Match is(215.75,8),250×64, world clearance80px and original Shop anchor118.31px. Objective, three six-digit resource totals,999:59 timer and both full threat phrases fit without overlap or reduced type.

Clearance differs slightly from the design estimate because it includes the existing minimap's4-logical-pixel frame **and3-pixel shadow**. Keep bars stay world-attached above sprites/effects and below HUD; camera-movement checks confirm they clear the new bounds. Match/Guardian controls remain separate;48px targets, the24px internal gesture reserve and external safe insets remain on existing layout paths.

## Defense identity and lifecycle

Calm shows Wave n/N plus timer; nearby enemies show **Enemies near Azure Keep** plus timer; recent positive damage shows **Azure Keep under attack** plus timer. `azureThreatStatus`, radius/recent ticks, `DefenseFeedback.observe()` and its episode/repeat gate are unchanged.

First positive hit calls the general notification channel at existing priority2 with identity `azure-defense`. Its two-line text is `Azure Keep under attack` and current/max Azure HP;650ms rim/minimap emphasis and2500ms notice duration remain. Later positive hits update HP only; they do not restart expiry/accent. Fully absorbed damage gives no loss notice/accent. Off-camera damage uses the same authoritative path without camera movement.

While the same identity is current and valid, `NoticeSlot.update()` changes display content only. Expiry, cleared threat, Pause/results/Restart/shutdown remove that identity; a replacing notice cannot be overwritten or removed by stale defense cleanup. No backlog or new permanent notification row. Ordinary wave/construction/inspection notices remain below defense priority; direct combat feedback and optional teaching keep their existing priority paths. The initial two-line Destroy/Defend guidance stays at its original location and timing.

## Verification and popup compatibility

**185 focused headless tests passed**, including seven added cases and existing defense, notice, guidance, B1 feedback, Shop, Guardian/progression and simulation regressions. **70 focused Chrome browser checks passed**: actual touch/DPR3 at844×390/960×540, desktop mouse at1280×720, plus asymmetric safe insets. Coverage: text/icon bounds, large numbers/long timer, initial guidance unchanged, nearby versus positive/absorbed damage, off-camera HP,650/2500ms timing, HP updates without extension, replacement/expiry/threat/Pause/results/Restart cleanup, unchanged Guardian/Skills/Pause/map anchors, full Shop geometry/quarter speed, Shop-open notice without interactive overlap, Build open/Cancel, camera/world Keep clearance and no browser errors.

Shop still uses the legacy reference and same action geometry. Its HP-bearing defense notice wraps to a second line within the existing slot; no controls are obscured. Shop/Build native touch checks retain the mobile duplicate-click fix. Tests use labeled controlled numeric/damage fixtures, not natural-match balance claims. One live844px screenshot was inspected and retained; no browser image collection.

Production TypeScript/Vite build and whitespace/reference checks passed, with only the existing large-chunk advisory. No broad browser suite ran. Earlier Phase2 fixed-HUD snapshot verifiers retain their historical geometry assumptions; the current focused UI-A verifiers cover the changed presentation.

Final conditional approval checks at844×390 passed: Gold1250/Wood1800/Iron1200, objective, Wave7/12 and12:34 all fit at the approved type sizes, without overlaps/clipping. With Shop open and a confirmed positive Azure hit, the two-line2900/3000 HP notice was readable, inside the viewport and clear of Shop/combat/utility/Pause/Skills targets. Full Shop bounds were identical before/after damage and quarter speed was retained. Both local screenshots were visually inspected; no correction, notification redesign or orientation change was needed. Only these two browser cases were rerun for finalization; the185 focused headless tests, build and whitespace checks passed again. Temporary final-check script/images/logs remain ignored and outside the commit scope.

```text
npm test -- top-hud-layout.cjs notice-slot.cjs defense-feedback.cjs context-guidance.cjs damage-feedback.cjs shop.cjs guardian-skills.cjs progression.cjs simulation.cjs
node scripts/verify-ui-a2.mjs
npm run build
git diff --check
```

## Limits for manual review

Physical-device comfort and the exact simulator extension remain unverified. Long-number tests cover six-digit resources and999:59; arbitrary larger values or unusually narrow landscape canvases are not a promise of unlimited text capacity. Initial objective guidance intentionally remains mid-screen, as required. Off-camera danger notice is transient and may cover world artwork, but not interactive HUD controls. Unrelated untracked documents are preserved and excluded from this implementation scope.
