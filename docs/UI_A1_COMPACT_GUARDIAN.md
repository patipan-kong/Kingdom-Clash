# UI-A1 — Compact Guardian HUD and Skills entry

Baseline `4a869c9524fce3702fdf1ccdaea8904adcaded54` · 14 October 2026 · Review passed; approved for UI-A1 commit and publication. No UI-A2 implementation, popup redesign or balance work.

Design: [approved UI-A proposal](UI_A_COMPACT_HUD_DESIGN.md). [Representative844×390 image](ui-a1/guardian-844x390.png) is a live CSS-resolution capture, not a mockup. Only one representative image is retained.

## Implementation and file scope

- [topHudLayout.ts](../src/ui/topHudLayout.ts): pure CSS-to-logical Guardian geometry, separate48px recenter/Skills targets, body/bar coordinates and legacy-compatible Shop reference.232×64 is the target; narrow canvas widths adapt beside the **unchanged** Match plate. Portrait resize transients keep sizes positive.
- [HUD.ts](../src/scenes/HUD.ts): existing portrait/recenter in a compact teal/gold plate,14 CSS px level/HP, readable current/max HP, HP bar and12px XP progress label/meter; integrated48×48 `+N / Skills` tile. Zero points displays0/Skills and remains actionable. No optional rim animation. Exact XP/level and “Combat continues while this panel is open” share the existing allocation header note; allocation layout/cards/actions/Close stay unchanged.
- [contextGuidance.ts](../src/ui/contextGuidance.ts): copy only, `Learn a skill with Skills.` Existing triggers, timing, priorities and limits unchanged.
- [top-hud-layout.cjs](../tests/top-hud-layout.cjs), [verify-ui-a1.mjs](../scripts/verify-ui-a1.mjs): focused pure geometry tests and live three-viewport checks.
- This report and `docs/ui-a1/guardian-844x390.png`: technical/manual review evidence. The pre-existing approved proposal and unrelated balance investigation were not edited.

Authoritative skill counts, allocation eligibility/success and initial point remain simulation reads. Opening still clears controls and leaves simulation at normal speed; zero points still permits inspection. Damage pulse code, ranks, Fortitude LV18/20 and accepted cooldown reads are preserved. No simulation, targeting, XP, economy, skill, inventory or construction changes. `main.ts` touch capture, all combat/joystick/utility controls, Pause, safe-area CSS and artwork remain untouched.

## Measured before/after bounds

CSS coordinates relative to the canvas, excluding browser margins and device insets:

| Viewport | Old Guardian plate | Old upgrade banner | New Guardian plate | New Skills target |
|---|---|---|---|---|
|844×390 (canvas693.33×390;~75px side margins) |(8.67,8.67),202.22×50.56 |(8.67,65),202.22×48.39 |(8,8),206.44×64 |(158.44,16),48×48 |
|960×540 |(12,12),280×70 |(12,90),280×48 |(8,8),232×64 |(184,16),48×48 |
|1280×720 desktop |(16,16),373.33×93.33 |(16,120),373.33×48 |(8,8),232×64 |(184,16),48×48 |

**Width compromise:** at844 the unchanged Match beginsx222.44; a232px Guardian plate atx8 would overlap. The responsive206.44px width keeps8px gap and both48px targets, with14px HP text. At844 with32/12px horizontal and8/12px vertical safe insets, canvas height370 gives~195.04×64; LV20,4074 max HP (Fortitude plus six Shields) and zero/death text fit.232px is used at960 and desktop. UI-A2 can recover the full target at844 by implementing its separately approved Match layout; that work is not included here.

Actual world-HUD clearance changes121.39→109.11 CSS px at844 (~12.28px reclaimed);960 remains148 and desktop194.67 because the original Match panel dominates. Guardian+old banner material area drops approximately34%/55%/72% respectively; this is a rectangle estimate, not a claim that the whole top HUD has shrunk by those amounts.

## Shop, world health and input integration

`topHudBottom` reports current top surfaces/entry to world Keep avoidance; `shopHudBottom` preserves the previous Match/banner/Pause/map maximum. Shop geometry and its notification anchoring use the latter, so reducing Guardian height does not move or resize Shop. Full Shop bounds (including scale/touch data) were compared with the former layout at each viewport. Build panel and quarter-speed/pause paths are unchanged. No changes to world Keep bar depth, HP or simulation state.

## Verification

**114 focused headless tests passed**, including7 new pure layout cases plus Guardian, progression, contextual guidance and Shop regressions. **58 focused Chrome browser checks passed** at844×390/960×540 with actual touch/DPR3, and1280×720 with mouse. Coverage: initial+1; native portrait recenter; allocation control clearing; exact XP and continued combat; authoritative learned rank/count/success; zero-point access; LV2 rank gate and LV6 ultimate; LV20, XP MAX, Fortitude and six-Shield text bounds; safe insets; positive HP loss/bar fraction; death countdown/respawn; results/Restart; unchanged Match and Shop geometry; Build open/Cancel; Pause. No browser errors.

Progression/equipment/respawn setup uses labeled controlled fixtures rather than claims of natural economy pacing. The transient existing HP pulse was seen in the earlier pass; final persistent damage assertions check HP text and bar fraction rather than sampling a brief color after its timeout. Browser verification does not certify the user's exact simulator extension or a physical device. Shop/Build one-touch behavior remains covered by native touch actions; no broad popup suite was repeated.

Production TypeScript/Vite build passed (existing large-chunk advisory only). `git diff --check` and new-file whitespace/reference checks passed. No generated assets, browser collections or original-spec edits. Ignored raw logs/transpilation/build files are excluded.

```text
npm test -- top-hud-layout.cjs guardian-skills.cjs progression.cjs context-guidance.cjs shop.cjs
node scripts/verify-ui-a1.mjs
npm run build
git diff --check
```

## Review limitations

The current Match panel remains visually large as required for A1; reducing it belongs to UI-A2. Extraordinarily narrow portrait transients are protected by the existing rotate/freeze behavior, not a new playable portrait layout. Device thumb comfort and exact simulator-extension behavior still need manual verification. The narrow Guardian width is a necessary responsive adaptation pending A2, not a moved combat control or reduced touch target.
