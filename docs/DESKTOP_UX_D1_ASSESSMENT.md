# Desktop UX & HUD Polish — Phase D1 Assessment

Status: **assessment and design only, awaiting approval.** Nothing has been implemented, committed or deployed.
Base: `main` b67cbd3 (Kingdom Clash V1.1). This is not the Playgama branch.
Evidence: `docs/screenshots/desktop-d1/` (baseline = current game, proposal = runtime mock, measure.json = rendered CSS sizes).
The proposal screenshots were rendered by the real game, with the proposed values applied at runtime from a test script. No source file was changed.

---

## 0. Headline findings

1. **Every HUD control has a fixed CSS-pixel size, whatever the screen.** `controlLayout`, `topHudLayout`, `azureKeepHudLayout`, `heroBarLayout` and the label code all use `p(v)=v/scale`.
   A 1920×1080 desktop therefore gets the same 43 px skill disc, 34 px Build/Shop disc and 10–12 px labels as an 844×390 phone (measured, table §1).
   The minimap is the one exception: it is drawn in logical coordinates, so it grows with the canvas (98 px on the phone, 272 px at 1080p). That is why the controls look so small next to it.
2. **The canvas always renders at 960×540 internally and the browser stretches it with CSS.** This holds even at 2× DPR (verified: `canvas.width = 960` at 1536×864 for DPR 1, 1.25 and 2).
   At 1080p a "12 px" label gets **6 real pixels** and is stretched ×2, so it looks blurred. This, more than size, is why labels are hard to read at 1080p.
   On the phone the opposite happens (the canvas is downsampled), so mobile text is sharp.
3. **There is no Attack action to bind.** Auto Attack is permanent (`state.autoAttack`, released 2026-11-13). **Space already toggles Pause.**
4. **The "Boost" button does not exist on main.** It is the Playgama-only Battle Boosts entry (`arkhero-playgama/src/ui/BattleBoosts.ts`). The PC screenshot was therefore taken on the Playgama build.
   Desktop PC portal players are mostly Playgama players, so D2 must be ported to `platform/playgama` afterwards (§7, stage D2-5).
5. **C1M1 never teaches movement or Build.** Two hints are touch-only or out of date:
   - "Tap to cast · Drag to aim" is worded for touch.
   - "Use Attack on towers and Keeps." refers to a button that no longer exists.

---

## 1. Current HUD scaling and positioning

Measured CSS px for C1M1 at start (`baseline/measure.json`):

| Element | Phone 844×390 | 1280×720 | 1920×1080 | Note |
|---|---|---|---|---|
| Canvas scale (CSS height / 540) | 0.72 | 1.33 | 2.00 | |
| Skill disc / hit target | 43 / 48 | 43 / 48 | 43 / 48 | identical on every screen |
| Skill label font | 12 | 12 | 12 (= **6 canvas px**) | blurred at 1080p |
| Build / Shop disc / hit target | 34 / 48 | 34 / 48 | 34 / 48 | |
| Build / Shop label font | 10 | 10 | 10 (= 5 canvas px) | smallest text in the HUD |
| Guardian plate | 206×64 | 232×64 | 232×64 | |
| Mission plate | 280×64 | 280×64 | 280×64 | |
| Azure Keep plate | 170×30 | 170×30 | 170×30 | |
| Joystick | 86 | 86 | 86 | |
| Minimap | 98×59 | 181×109 | 272×164 | scales with the canvas |

Layout anchors:
- Skills form a diamond in the bottom-right corner.
- Build and Shop form a column on the left edge, above the joystick.
- The joystick sits bottom-left.
- The Chapter 5 Hero Bar sits in the bottom strip between the joystick and Bash.
- The top plates run along the top edge.

Everything is anchored to a corner, so a uniform multiplier per group grows each group from its own corner without moving the rest of the layout. That is what makes the change cheap.

## 2. Input mode detection (today) and recommendation

**Today:** the only check is `coarsePointer()` = `matchMedia('(pointer: coarse)')` in `src/ui/fullscreen.ts`. It is used for fullscreen on Play and for the pause-menu fullscreen control.
Nothing in the HUD checks the input mode, and nothing checks width (apart from the `short` rule for phone heights under 360 px).

**Recommendation: one small module, `src/ui/inputMode.ts`, with no new dependency.**
- **Initial mode:**
  - `coarsePointer()` true → `touch`, which is exactly today's mobile behaviour.
  - Otherwise → `keyboard`.
- **Switching:**
  - A `pointerdown` with `pointerType === 'touch'` switches to `touch` (a touchscreen laptop gets the joystick back on the first touch).
  - A movement or shortcut `keydown` switches to `keyboard`.
  - The change is applied on the next pointer-up, so it never happens in the middle of a drag.
- **Event:** a change emits the existing game event bus event `input-mode`. HUD reruns `layoutControls()`, as it already does on resize.
- **Testing:** a `?input=touch|keyboard` override for screenshots and checks.
- **Not used:** width alone. A 960×540 embed on a PC is `keyboard`; an S24 is `touch` at any size.

`touch` mode keeps today's values bit-for-bit, so the approved mobile HUD is unchanged by construction.

## 3. Keyboard bindings

### 3a. Current inventory

| Key | Action | Where |
|---|---|---|
| W A S D, ↑ ↓ ← → | Move (added to joystick input; zeroed while Build/Shop/Skills is open) | `Battle.ts:272`, `:1120` |
| Space | Toggle Pause | `HUD.ts:270` |
| Esc | Cancel a skill being aimed with the mouse | `HUD.ts:273` |
| Right click | Cancel a skill being aimed | `HUD.ts:273` |
| — | No keys for skills, Build, Shop, Skills panel or Hero Bar | |

### 3b. Proposed mapping, checked against the code

| Proposed | Status | Recommendation |
|---|---|---|
| WASD / arrows: move | exists | keep |
| 1 Bash, 2 Charge, 3 Taunt, 4 Protect | free | **adopt** (Protect = `zone`, unlocks at LV6, so it is naturally the last key) |
| B: Build | free | **adopt**; toggles the panel like the button (`showUtility('Build')`) |
| T: Shop | free | **adopt**; toggles (`openShop()`); does nothing when the Shop is closed for the mission (C1M1 shows "Shop Soon") |
| Space: Attack | **unavailable**: Auto Attack is always on and there is no Attack command | **do not adopt.** Keep Space = Pause, the existing and familiar binding |
| Esc: Pause | conflicts with Esc = cancel aim | **adopt as a chain:** cancel aim → else close the open panel (Build, Shop, Skills, Tavern, Audio) → else toggle Pause |
| (new) K: Skills panel | free | **add.** Learning skills is the main thing C1M1 teaches, and the "+1 Skills" entry has no key |

Final mapping: **WASD/arrows move · 1–4 skills · B Build · T Shop · K Skills · Esc back/pause · Space pause · right click cancels aim.**
Hero Bar, Tavern and Revive stay mouse-only in D2.

### 3c. Behaviour rules (no new casting mechanics)

A number key goes through the same path as a **tap** on the button: `AbilityButton` → `cast` event → `Battle.castSkill(skill, undefined)`.
That flow already exists:
- **Bash** auto-targets the selected or nearest foe.
- **Charge** dashes at the selected or nearest foe within 240, otherwise in the last movement direction. That is natural for WASD players: "Charge where I am moving".
- **Taunt** and **Protect** are self-centred.

Mouse drag-aim stays available for anyone who wants it. Required states:

| State | Key result |
|---|---|
| Locked or unlearned (`Learn`, `LV6` badge) | No cast. Show the existing `battleLearnFirst` notice (rate-limited) and pulse the Skills entry. |
| On cooldown | No cast. Show the existing `battleCooldown` notice (rate-limited). |
| Stunned or dead | No cast. Existing `Stunned` notice when stunned; silent when dead. |
| Build, Shop, Skills or Tavern open | 1–4 are ignored. `Battle` already drops `cast` while a menu is open. B, T and K switch between panels; Esc closes. |
| Paused or results shown | Everything is ignored except Esc and Space (resume). `setPause` already guards a match that has ended. |
| A skill held with the mouse (aiming) | 1–4 are ignored until release. Esc or right click cancels, as today. |
| Key auto-repeat | Ignored (`event.repeat`). |

Shortcuts cast on **keydown** (the PC convention). The touch release-to-cast flow is unchanged.

### 3d. Key badges

Use a **key cap inside the name label** ("[1] Bash", "[B] Build"), plus a small "K" cap on the corner of the Skills entry.
Mock A tried caps on the disc rim. They collided with the neighbouring labels in the diamond and covered the icon art, so the label version is the recommendation.
Key caps show only in `keyboard` mode. They are not translated: the key letters are the same in every locale.

## 4. Desktop HUD sizing and layout (recommended)

One multiplier per group, applied only in `keyboard` mode. The **button multiplier is tiered by canvas CSS height** because a flat 150% crowds a small embed (`proposal-flat150/en-embed-960x540.png`).

| Group | Proposed | Recommended | Rendered at 1280×720 |
|---|---|---|---|
| Skill buttons (disc and hit target) | 150% | **150% when canvas ≥ 700 px tall · 125% at 500–699 · 100% below 500** | 43 → 65 px |
| Build / Shop | 150% | **same tier as skills** | 34 → 51 px |
| Skill labels | 125% | **125% (15 px).** Larger did not pay off: at 18 px the labels crowd the diamond, and the blur is not a size problem (§0.2) | |
| Build / Shop labels | — | **13 px** (today 10 px is the smallest text in the HUD) | |
| Diamond spacing (dx) | — | **+6 px** in `keyboard` mode so the larger labels clear Bash | |
| Guardian plate | 120% | **120%** | 232×64 → 278×77 |
| Mission and resources plate | 120% | **120%** | 280×64 → 336×77 |
| Azure Keep plate | 120% | **120%** | 170×30 → 204×36 |
| Boost | 125% | **125%, Playgama port only** (not on main) | — |
| Minimap | unchanged | **unchanged** (already scales with the canvas) | |
| Joystick | — | **hidden; a 100×74 movement-hint plate takes its place** (see below) | |

The **movement hint** is drawn inside the joystick's footprint, so it cannot collide with the Chapter 5 Hero Bar, whose slots start at the joystick's right edge:
- W, A, S and D key caps.
- A caption underneath: "Move · ←↑↓→" (localised).
- Existing plate styling.

Because hiding the joystick frees up its area, nothing else has to move.

**Panels:**
- Build, Shop, Skills, Tavern and Pause stay as they are in D2.
- `panelAnchorX` and the aim-cancel target must keep their current positions. Otherwise the approved panel positions shift (see §8).

**1080p limit:** the sizing makes 720p–900p look like a native PC HUD (`proposal/en-1280x720.png`, `en-1366x768.png`). At 1920×1080 the controls are larger but text is still soft because of §0.2.
The real fix is to render the canvas at its display size. That touches every scene's coordinates and pointer input, which is an architecture change, so it is proposed as a **separate, optional spike (D3)** and not included here.

## 5. Desktop tutorial (C1M1)

C1M1 has no scripted tutorial. It uses `ContextGuidance` (orientation → skills → support → structures) plus a one-off cast hint after the first skill is learned.

| Teaches | Today (desktop) | Minimal desktop change (same system, no new screens) |
|---|---|---|
| Move | not taught (the joystick explains itself only on touch) | the persistent movement-hint plate (§4) |
| Attack | Auto Attack; "Use Attack on towers and Keeps." is out of date | correct the text for both modes: "Your Guardian attacks automatically — stand near towers and Keeps." **This changes the approved mobile text, so it needs a separate OK.** |
| Learn a skill | "Learn a skill with Skills." | keyboard variant: "Press K or click Skills to learn a skill." |
| Use a skill | "Tap to cast · Drag to aim" (touch wording) | keyboard variant: "Press 1–4 or click to cast · Drag to aim" |
| Build / Shop | not taught | key caps only (B, T). C1M1's Shop is closed, so the Shop is not taught there |

- The variants are new keys alongside the existing ones in `battleMessages.ts` (EN, TH, JA), chosen by input mode at display time.
- Timing, ordering and validity rules are unchanged, so progression is untouched.

## 6. Visual verification

Viewports 1920×1080, 1536×864, 1366×768, 1280×720, a 960×540 embed and an 844×390 phone. EN at all sizes; TH and JA at 1280×720 and 1920×1080 (TH also at 1366×768).

| Check | Result |
|---|---|
| Enlarged skill diamond vs Hero Bar strip | clear. The diamond's leftmost edge (Taunt's hit target) moves about 100 px left at 150% (200 → 300 px from the right edge). Three Hero Bar slots end about 290 px from the left edge, so the gap is ≥ 400 px at 960×540 (125%) and ≥ 690 px at 1280. The Hero Bar already computes its popover's right limit from the leftmost skill |
| Build/Shop column vs road and Keep sprite | clear at 150%; the column starts higher but stays on grass/road, and no HUD element sits there |
| Top plates at 120% vs minimap | clear at every size. The mission plate ends about 230 px short of the minimap at 1280 and about 270 px short at 1366 (read from the screenshots). The TH/JA Keep plate has an existing compact fallback that still triggers correctly |
| Teaching toast under the mission plate | clear at every size |
| Movement hint vs Hero Bar | clear: it stays inside the joystick footprint |
| Labels in TH and JA | they fit; Thai "ร้านค้า เร็ว ๆ นี้" wraps to two lines as today; JA "ショップ 近日公開" also wraps to two lines |
| **Flat 150% in a 960×540 embed** | **too big**: the diamond covers about 30% of the height and the column sits on the road. Hence the tiers |
| Fullscreen vs embedded | layout depends only on canvas CSS height and input mode, so fullscreen = a larger canvas → higher tier. Embedded portal iframes need focus before keys reach the game (§8) |
| Not checked | Warlord boss bar, multi-objective panel and Hero Bar with recruited heroes; these are checked at D2-2 (§7) |

## 7. Staged implementation plan (each stage is independently reviewable)

| Stage | Change | Files |
|---|---|---|
| **D2-1 Input mode** | `inputMode.ts` (detection, switching, `?input=` override); HUD hides the joystick and its hit area in `keyboard` mode; movement-hint plate. Touch: no change | new `src/ui/inputMode.ts`; `src/scenes/HUD.ts` |
| **D2-2 Desktop sizing** | `HUD.layoutControls` computes `controlScale = canvasScale / buttonTier` and `topScale = canvasScale / 1.2` in `keyboard` mode and passes them to the existing layout functions (no signature changes needed). Fixed `canvasScale` stays for gesture maths (`chargeFrom`), `panelAnchorX` and the aim-cancel target. Label size goes in as a parameter to `AbilityButton.setLayout`/`UtilityButton.setLayout`. Diamond dx +6 | `HUD.ts`, `controlLayout.ts`, `AbilityButton.ts`, `UtilityButton.ts`, `Battle.ts` (`aimCancel` reads the HUD's layout) |
| **D2-3 Shortcuts + badges** | 1–4, B, T, K, Esc chain; `AbilityButton.pressKey()` reuses the tap guard and `activate`; key caps in labels | `HUD.ts`, `AbilityButton.ts`, `UtilityButton.ts` |
| **D2-4 Desktop hints** | keyboard variants of the learn and cast hints (EN/TH/JA); the Attack-text fix, only if approved | `i18n/battleMessages.ts`, `HUD.ts` |
| **D2-5 Playgama port** | rebase onto `platform/playgama`; Boost entry at 125% via the same `topScale` | `arkhero-playgama/src/ui/BattleBoosts.ts`, `HUD.ts` |
| D3 (optional, separate) | spike: render the canvas at its display size for sharp 1080p text | `main.ts`, all scenes, so it needs its own approval |

Checks added in each stage:
- A new `scripts/verify-desktop-hud.mjs` covering:
  - 4 desktop viewports + embed × EN/TH/JA;
  - overlap assertions on HUD bounds;
  - keyboard checks in each state from §3c.
- Re-run the existing `verify:mobile-hud`, `verify:combat-hud`, `verify:top-hud`, `verify:hero-hud` and `verify:pause`.
  Expect them unchanged, apart from the 16 known legacy failures.
- An S24 spot check before release.

## 8. Regression risks

**Mobile**
- *Hybrid detection.* An iPad with a keyboard, or an Android tablet with a mouse, could switch to `keyboard` mode. The first touch switches it back, and the joystick hides only in `keyboard` mode, so the S24 (coarse, no keyboard) never leaves `touch`.
  Mitigation: a `touch`-mode test checking that the layout is identical to today's numbers.
- *Shared layout functions.* D2 passes a different scale instead of changing the functions, and at multiplier 1 the output is identical.
  Mitigation: snapshot `controlLayout`/`topHudLayout` output for 844×390 and 780×250 before and after.

**Desktop**
- `panelAnchorX`, the aim-cancel target and `safe` come from `controlLayout`. If they follow the scaled layout, the approved Build/Shop panel positions and the cancel circle move. Keep them on the unscaled layout (D2-2 note).
- `chargeFrom` uses canvas scale for drag distance. Leave it alone, otherwise Charge drag length changes, which would be a gameplay change.
- Embedded portals (Playgama iframe): keys reach the game only after the iframe has focus. The first click on the canvas gives it focus. Do not add any "click to focus" screen; just verify it.
- Space = Pause is kept, so no muscle memory breaks. Esc moves from "cancel aim only" to a chain, but cancelling stays first, so aiming behaviour is unchanged.
- WASD is already zeroed while Build, Shop or Skills is open. This is unchanged, so B, T and K cannot cause accidental movement.
- At 1080p text stays soft until D3. Set expectations: D2 fixes size and discoverability, not sharpness.

## 9. Screenshots

| | Baseline (today) | Proposal (mock) |
|---|---|---|
| 1920×1080 | `baseline/en-1920x1080.png` | `proposal/en-1920x1080.png` |
| 1366×768 | `baseline/en-1366x768.png` | `proposal/en-1366x768.png` |
| 1280×720 | `baseline/en-1280x720.png` | `proposal/en-1280x720.png` |
| 960×540 embed | `baseline/en-embed-960x540.png` | `proposal/en-embed-960x540.png` (125% tier) · `proposal-flat150/en-embed-960x540.png` (rejected) |
| TH / JA | `baseline/th-*`, `ja-*` | `proposal/th-*`, `ja-*` |
| Mobile reference | `baseline/*-mobile-844x390.png` | unchanged by design |

Mock limitations:
- The mock places key caps and the hint plate with test code, so spacing details are approximate. Examples: the arrow glyphs in the hint caption are too small, and the two-line Shop label makes its "T" cap too tall; the implementation would use a fixed square cap.
- The teaching toast shows a sample desktop hint for illustration.

## Decisions requested

1. Button tiers 150 / 125 / 100% by canvas height (instead of a flat 150%).
2. Final keys: 1–4, B, T, **K**, Esc chain, **Space stays Pause** (no Attack key).
3. Key caps inside labels (not on the disc rim).
4. Correcting the stale "Use Attack" hint, which also changes the mobile text.
5. Whether to schedule the D3 sharp-rendering spike.
