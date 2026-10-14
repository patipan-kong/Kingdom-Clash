# Mobile landscape Shop/Build popup fix

14 October 2026 · Baseline `dc73b406fa9dd0d16166239e80f77b54d535cdd9` · Review passed; approved for commit and upstream publication. Exact simulator extension and physical-device verification remain outstanding.

## Confirmed failure mechanism

Chromium mobile emulation with actual touchscreen taps reproduced both failures at844×390 and960×540, DPR3. One tap produced a Phaser touch pointerup (id1), then a compatibility mouse pointerup (id0). Shop/Build activation counts rose by **two**. The first handler opened the panel at quarter speed; the second toggled it closed and restored normal speed. Mouse-only desktop activation rose by one and left the panel open.

The cause is the game's explicit `input.touch.capture:false`. Phaser's TouchManager consequently did not prevent the default canvas touch behavior, allowing compatibility mouse events. CSS `touch-action:none` alone did not suppress those events. The input trace confirms handler reachability and an open→closed lifecycle; it is not a popup positioning or stacking failure.

Shop and Build use Phaser canvas containers, not popup DOM elements. Shop is depth600, Build depth100 in HUD; both have visible/alpha1 containers when open. Canvas display/visibility, bounds, pointer transforms and `elementFromPoint` were inspected. At844×390 the FIT canvas is approximately693.33×390 centered horizontally; at960×540 it fills the viewport. The visual viewport matched landscape dimensions and scale1. No hidden popup DOM, offscreen layout, portrait shade or error layer explained the reproduction. Fullscreen or extension-injected transforms were not reproduced.

## Minimal correction

[src/main.ts](../src/main.ts) changes only touch capture to `true`, with an explanatory comment. Phaser processes canvas touches and prevents their default browser behavior through non-passive touch listeners, suppressing the compatibility mouse click. Mouse input, active pointer count, pointer ownership and existing game handlers remain enabled. No timer debounce, layout/CSS change or platform-specific display mode is added.

No trading/inventory/economy/construction, balance, HUD geometry, art or popup lifecycle code changed. Quarter-speed Shop/Build, normal closing speed, Pause freezing, landscape/portrait and safe-inset behavior remain on their existing paths.

## Focused verification

[scripts/verify-popup-touch.mjs](../scripts/verify-popup-touch.mjs) uses installed Chrome and Edge with actual Playwright touchscreen taps, not mouse clicks merely labeled mobile. Both844×390 and960×540 are checked in desktop DPR1 and mobile DPR3 modes. Checks require exactly one utility activation, open state, rendered container visibility/depth, canvas stacking, in-bounds popup actions,48px targets and24px bottom reserve; one authoritative Sword purchase, Equipment navigation, Close, Wall selection and Cancel; Build→Shop exclusivity/quarter speed; Pause/resume; mobile joystick ownership with a second menu touch; portrait freeze and landscape return with safe insets. No screenshots or asset collection.

**120 focused browser checks passed.** Existing focused Shop, Guardian and simulation regressions: **115 passed**. Production TypeScript/Vite build passed with the existing large-chunk advisory. Whitespace checks passed. Browser results are recorded in ignored `test-results/popup-touch.txt`; temporary investigation script/logs, compiled tests and build output are excluded from review scope.

```text
node scripts/verify-popup-touch.mjs
npm test -- shop.cjs simulation.cjs guardian-skills.cjs
npm run build
git diff --check
```

The browser script defaults to a local Vite server at127.0.0.1:5187; `PROTOTYPE_URL` can override it. Browser checks cover this confirmed compatibility-event mechanism; they do not certify the user's exact Chrome/Edge simulator extension, extension-specific fullscreen/transforms, or a physical phone. Repeat Shop/Build taps on that extension and a real landscape device before final acceptance. No UI redesign or gameplay changes are proposed.
