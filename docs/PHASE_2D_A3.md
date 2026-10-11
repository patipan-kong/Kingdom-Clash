# Phase 2D-A3 — Mobile HUD layout and spacing

11 October 2026 · Baseline `cb33103` · Completed and approved by final manual visual review.

Implements Slice 3 of the [approved design](PHASE_2D_A_DESIGN.md), preserving A2's final mobile-first presentation: no combat shortcut badges or rank indicators on any platform. Existing artwork, colors, allocation card design and gameplay data remain intact.

## Changes

- Larger HP and level text remain primary. Final polish puts HP and XP side by side with separate bars, reducing the Guardian panel from 98 to 70 logical pixels high. The short revive countdown occupies the HP slot when dead. Resource totals are smaller and secondary.
- One compact match panel keeps **Destroy Crimson Keep** visible above faction HP, wave/time and resources. A Keep threat replaces the wave line rather than obscuring the objective.
- `controlLayout()` expresses right-hand combat, left joystick, utility column, captions, feedback and cancellation in CSS pixels inside the existing FIT canvas. Skills and Build have 48px targets, Attack has a 72px circle, and the joystick has an 86px target. Captions and targets stay above the additional 24px bottom gesture reserve.
- Skill names have dark teal backing and sit directly below their original artwork. Circles retain the single most important status, including cooldown during temporary blocking. Controls and labels have separate clearance.
- Build remains functional. Shop and Army show muted **Soon** labels and have no active hit targets. Opening Build retains its existing 0.25 time scale; confirmation, costs and cancellation use the unchanged simulation.
- Existing CSS safe-area insets remain the outer boundary; custom properties allow deterministic inset checks. Parent ResizeObserver behavior is preserved. Resize recomputes layout and releases active combat/utility button pointers during repositioning.
- The top panels record the same bounds used to draw their surfaces. Keep HP avoidance combines those bounds with the upgrade action, minimap and Pause bounds plus a small gap. Both faction markers/bars retain world attachment, camera-follow synchronization and depth 2700.
- Rendering and hit-testing use the same shared cancel coordinates. The cancel ring has zero scroll factor, preventing camera follow from moving the visible ring away from its input target. General notifications are also moved clear of the utility captions.
- Final top-only polish reduces the match panel from 160 to 128 logical pixels and trims Upgrade Skills to a 48–49 CSS pixel target. Horizontal bounds are unchanged. Including Keep clearance, the top footprint falls from about 142 to 121 CSS pixels at 844×390 and from 194 to 148 at 960×540. Combat controls, captions, utility placement and the A1 allocation panel are unchanged by this polish.

## Verification

| Check | Result |
|---|---|
| `npm test` | 204/204 passed |
| `npm run verify:mobile-hud` | 33/33 passed |
| `npm run verify:combat-hud` | 26/26 passed |
| Focused A1 allocation regression (prior review) | 38/38 passed |
| Final `npm run verify:top-hud` | 25/25 passed at both viewports and unequal safe areas |
| Production build and script syntax | Passed; inherited bundle-size advisory remains |
| `git diff --check` | Passed |

Layout checks cover 844×390 and 960×540, each with normal and unequal safe-area insets (left 32, right 12, top 8, bottom 12 CSS pixels). They verify separate targets, caption contrast and bounds, the bottom reserve, objective/hierarchy, feedback clearance, original A1 allocation fit, cancel-ring pixels and actual Keep HP pixels after camera movement. Build checks use real control taps, a world-space cell tap, authoritative wall placement and cancellation.

Combat regression covers ready/unlearned/locked/cooldown, stun/cast lock, death/respawn, keyboard movement, failed casting, simultaneous joystick/aim pointers, touch cancellation, drag cancellation, outside release and actual Restart. Supplemental status fixtures use a longer observation window to avoid expiry under slow headless scheduling; gameplay status durations are untouched.

The final top-HUD checks cover LV1, long LV19 HP/XP values, max level and revive text; real Upgrade Skills taps; actual faction HP pixels after camera movement; and general wave notification plus rejected-cast feedback through live event listeners. Finalization reruns 204 automated tests and 84 focused checks (33 mobile HUD, 26 combat/input, 25 top HUD), plus the production build and `git diff --check`. Browser capture is disabled during finalization to preserve the approved screenshot. The earlier 38 A1 allocation checks remain prior review evidence; current mobile and combat checks also confirm allocation fit and casting restrictions.

## Review evidence and limits

[Final compact 844×390 layout](phase2d-a3/hud-844x390.png).

The commit retains only the approved final 844×390 image, with the compact top panels, Crimson Keep HP bar and live notification positions. The preceding 844×390 image and older 960×540 review image are preserved under ignored `test-results/phase2d-a3/pre-compact/`. Current 960×540 spacing is checked live without another screenshot.

Raw reports and temporary diagnostic scripts remain ignored under `test-results/phase2d-a3/` and `test-results/`. The approved A1 and A2 images are unchanged. No assets were generated, no simulation/balance/encounter files changed, and no extensive match or screenshot suite was run. Final manual visual review passed; physical thumb comfort remains device-dependent. No subsequent phase is included.
