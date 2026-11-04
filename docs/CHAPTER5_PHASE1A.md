# Chapter 5 Phase 1A: Hero Command HUD

Status: implemented in the worktree, uncommitted, not pushed or deployed (`G:/work/ark/arkhero-c5-probe`, branch `scratch/c5-allied-hero`, base `main` `83d87df`). Design: [CHAPTER5_HERO_HUD.md](CHAPTER5_HERO_HUD.md). No Tavern, Recruitment, Revive, Dismiss or M1. No balance change. Allied Heroes still exist only through the dev-only `?allyTest` launch, so production players never see the bar.

## Files

New:

| File | Role |
|---|---|
| `src/ui/heroBarLayout.ts` | Pure geometry: portrait slots, command popover, target prompt, from `controlLayout` and the CSS scale. |
| `src/ui/heroCommand.ts` | Pure command state machine: idle / menu / attack / defend, with selection, refusal reason and cancel. |
| `src/ui/HeroBar.ts` | The Phaser view: portraits (HP bar, order badge, selection, ✕ while targeting), the Follow / Attack / Defend popover, the prompt with its cancel chip. |
| `tests/hero-bar-layout.cjs` | 6 layout tests at 960×540, 832×291, 780×360, 780×250 and 740×270. |
| `tests/hero-command.cjs` | 10 tests: the state machine, and the `send()` pathway. |
| `scripts/verify-hero-hud.mjs` | Browser test, 31 checks, real touch taps at 780×360 (DPR 3) and 780×250. |

Changed:

| File | Change |
|---|---|
| `src/simulation/GameState.ts` | `{type:'ally', requestId, id, order}` command; `ally-order` event. |
| `src/simulation/Simulation.ts` | `send()` accepts `ally` (shape check). `step()` re-checks with the new `allyOrderReason()` and emits `ally-order` or `rejected` with the reason; it runs while the Guardian is dead. The probe's `orderAlly()` now uses the same check. |
| `src/scenes/HUD.ts` | Creates the bar (shown only while living Allied Heroes exist). Holds the command state. Reads map taps only while targeting, in the Build-mode pattern: a tap picks, a drag pans. Cancels on `clear-controls` (Build, Shop, Skills, Pause), a skill/Attack press, or the death of the selected hero. Keeps hero rejections out of the toast channel. |
| `src/scenes/Battle.ts` | `setHeroCommand`, `heroPan`, `heroPick` (Attack: the entity drawn within 28 CSS px of the tap, valid enemies first; Defend: the world point). While targeting, an entity tap no longer sets the Guardian's target. A tap on an Allied Hero selects it. World markers: gold ring under the selected hero, a red line to its Attack target, a blue flag at its Defend post, red reticles on valid targets in Attack mode. |
| `tests/ally-probe.cjs` | Unchanged since Phase 0B (13 tests). |

## Behaviour (as approved)

- Follow executes immediately. Attack needs a valid enemy; Defend needs open ground (snapped to the nearest open cell centre). A successful pick exits command mode.
- An invalid Attack tap stays in the mode with the reason in the prompt: "Tap an enemy or a structure", "Pick an enemy, not an ally", "Shielded · capture the camps first", "That gate stands open". An invalid Defend tap shows "Can't hold there".
- While targeting, the selected portrait is the cancel, and a ✕ chip sits at the prompt's right end.
- Build, Shop, Skills, any skill/Attack press and Pause cancel the mode. While a panel is open, portraits ignore taps.
- The joystick works in every mode. A one-finger drag on the map pans the camera in target mode, and leaving the mode returns the camera to the Guardian.
- Heroes take orders while the Guardian is down.

## Results

- Focused tests: `node scripts/test.mjs hero-bar-layout.cjs hero-command.cjs ally-probe.cjs` → **29/29** (6 layout + 10 command + the 13 probe tests, all kept).
- Browser, `scripts/verify-hero-hud.mjs` → **31/31**, three consecutive runs:
  - M1, M4 and M6 without heroes: no bar;
  - the bar at the layout's positions;
  - each command;
  - refused taps;
  - the Guardian's target unchanged by a hero pick;
  - both cancels;
  - Build, skill and Pause cancels, and portraits ignored while Build is open;
  - the joystick moves the Guardian during targeting (219–250 px);
  - drag pan and camera return;
  - orders while the Guardian is down;
  - the 780×250 Defend round;
  - no page errors.
- Full suite **1209/1209**: 1192 at Phase 0, plus the Phase 0B capture test, plus 6 layout and 10 command tests. tsc and the production build pass. Browser regressions pass: `verify-mobile-landscape`, `verify-crimson-fortress`, `verify-ally-probe`.

Clearance (CSS px to the nearest existing hit area, measured by the layout test and the live HUD):

| Viewport | Portraits 1 / 2 / 3 | Popover | Prompt |
|---|---|---|---|
| 780×360 (S24 fullscreen) | 13.4 / 68.8 / 124.6 | 15.2 | 15.2 |
| 780×250 (warning) | 12.1 / 48.6 / **3.9** | **3.0** | **3.0** |

The prompt was narrowed from 300 to 280 CSS px at fullscreen, because the layout test found its chip 6.3 px from Taunt.

## Remaining issues

1. **S24 device numbers are still pending**, both FPS and touch feel. Nothing here replaces the real-device run.
2. **780×250 with three heroes is tight** (3–4 px). This is a layout warning as approved, and only reachable from M5.
3. **The Knight is a placeholder sprite** (the Guardian's art), confusable with the Guardian.
4. **Selecting a hero by tapping its sprite** is implemented but not browser-tested: the Knights stand in a crowd, so the tap is not reliable to script. The portraits are the tested path.
5. **A late rejection** is possible: if the state changes between the HUD's check and the tick (the target dies in that frame), the order is refused after the mode has already closed. The reason then isn't shown, and the hero keeps its old order. This is rare and harmless.
6. **Off-screen targets** need a drag or a minimap look first, as designed.
7. **A tap on an enemy while the popover is open** closes the popover and also sets the Guardian's target (the normal tap). This is intended, but needs confirming in human play.

## Recommendation

**GO for Phase 1B, conditional on the S24 run.** The HUD works end to end through the real input and command paths, is invisible without Allied Heroes, and leaves every existing control and the 13 probe tests intact. Before or alongside 1B, run the S24 comparison and a short human touch test of the HUD on the device.
