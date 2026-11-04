# Chapter 5 Phase 0B: Mobile Performance Prep and Hero Command HUD Design

Status: design proposal and test preparation only. No Tavern, no M1, no balance change, no change to Chapters 1–4. Uncommitted in worktree `G:/work/ark/arkhero-c5-probe` (branch `scratch/c5-allied-hero`, base `main` `83d87df`). Follows [CHAPTER5_ALLY_PROBE.md](CHAPTER5_ALLY_PROBE.md).

## PO decisions applied (2026-11-04)

1. Allied Heroes may capture every capturable objective (Banner, Gatehouse, Elite Barracks). This is the probe's existing behaviour; no change.
2. Only the Guardian repairs. Existing behaviour; no change.
3. Several units in one ring do not speed a capture up. The existing code already behaves this way (a Banner rises in its fixed `raiseTicks`; site capture adds 1 progress per tick whoever stands there). It is now locked by a 13th probe test: Gatehouse 119 ticks and Banner raise 120 ticks, alike for one Knight and for three Knights plus the Guardian.
4. The 12 original probe tests are kept; the suite is now 13 (`tests/ally-probe.cjs`, 13/13).
5. The probe architecture is kept as is.

## A. Galaxy S24 comparison (ready; not yet measured)

Both URLs show the debug performance line at the top right: `NN FPS · frame ms (max) · N units`, where the unit count is living units, not structures. `scripts/verify-ally-probe.mjs` now checks this at the S24's fullscreen landscape viewport (780×360 CSS, DPR 3): the line is present, readable and inside the canvas, with no page errors, for both URLs.

| Run | URL path |
|---|---|
| Baseline | `/?debug=1&level=36` |
| Stress | `/?debug=1&level=36&allyTest=stress` |

Procedure:

1. On the PC, in `G:/work/ark/arkhero-c5-probe`: `node node_modules/vite/bin/vite.js --host 0.0.0.0 --port 5371`. Allow Node on the private network if Windows Firewall asks.
2. On the S24, on the same Wi-Fi, open `http://<PC LAN IP>:5371/?debug=1&level=36`.
3. A direct debug link skips the Play button, so the page is **not** fullscreen. Open Pause → FULLSCREEN → Resume so both runs use the same 780×360 viewport.
4. Play about 3 minutes and note the FPS and ms readings every 30 s.
5. Repeat with `&allyTest=stress`.

No mobile result is claimed until those numbers come back. Headless desktop figures (software rendering) are in the probe report and are not phone figures.

## B. Hero Command HUD

### Where it fits (measured on the real HUD)

On the S24 in fullscreen, the 960×540 canvas is drawn at 640×360 CSS (scale 0.667), with 70 px letterbox bars on each side that the HUD cannot use. Existing controls (logical 960×540 coordinates, from `HUD.controls`):

- the joystick at (112, 440), radius 64;
- Build / Shop / Army at x 92, y 177 / 252 / 327, with a 36 px hit radius (24 CSS);
- the skill cluster: Bash (690, 429), Taunt (690, 333), Charge and Protect (780 / 870, 279), Attack (870, 417);
- the Guardian and match plates across the top, down to y 108; the Azure Keep plate beside the minimap.

The only free band for a persistent control is the **bottom strip between the joystick and the skill cluster**. It lies above the 24 CSS px gesture inset and is the area least used by the camera, which follows the Guardian at the centre.

### Proposal

Mockups were drawn into the running game (`scripts/mock-hero-hud.mjs`, M4 Fortress Approach with `allyTest=1`) at 780×360 and at the worst-case 780×250, the non-fullscreen size the mobile tests cover. Stills: `hud-<size>-1-bar`, `-2-selected`, `-3-attack-mode`, `-4-defend-mode` (`.png` and `.jpg`).

1. **Hero bar.** One round portrait per hired hero, in a row starting just right of the joystick:
   - each portrait has a 48 CSS px target (44 at the short size);
   - an order badge at the lower right: » Follow (cream), ⚔ Attack (red), shield Defend (blue);
   - an HP bar under the portrait;
   - the bar is hidden in matches without Allied Heroes, so Chapters 1–4 show nothing new.
2. **Selection.** Tap a portrait: it gets a gold halo and ring, a gold ring appears under the hero in the world, and its standing order is drawn (a red line to its Attack target, or a blue flag at its Defend post).
3. **Command popover.** Three 60×48 CSS buttons (48×48 at the short size), icon over label, directly above the portraits. The current order is highlighted. **Follow** applies at once and closes everything.
4. **Target mode** (Attack or Defend). The popover is replaced in the same place by a prompt, "ATTACK · tap an enemy" or "DEFEND · tap a spot to hold" (short size: "Tap an enemy" / "Tap a spot"):
   - Attack shows red reticles on every valid target in view;
   - the selected portrait turns into a ✕ (cancel), and a ✕ chip sits after the prompt where it clears the skill cluster;
   - the prompt lives at the bottom, not the top centre, because the top centre belongs to the notice channel (wave and Commander warnings);
   - a successful tap applies the order and exits automatically.

### Interaction flow

```
Idle ──tap portrait──▶ Selected (popover)
Selected ──Follow──▶ order applied ▶ Idle
Selected ──Attack / Defend──▶ Target mode
Selected ──tap same portrait / empty map / other UI──▶ Idle
Selected ──tap another portrait──▶ Selected (that hero)
Target(Attack) ──tap enemy or structure (snaps to nearest valid within ~28 CSS px)──▶ order ▶ Idle
Target(Attack) ──tap friendly / shielded Keep / empty ground──▶ stays, prompt shows the reason
Target(Defend) ──tap open ground (snaps to the nearest open cell centre)──▶ order ▶ Idle
Target(Defend) ──tap blocked ground──▶ stays, "Can't hold there"
Target(any) ──✕ / selected portrait / Build / Shop / Skills / skill button / Pause──▶ Idle (cancel)
Target(any) ──one-finger drag on the map──▶ pans the camera (as Build mode); a tap is under 10 CSS px of travel
```

The Guardian's death does not close anything: heroes stay commandable, and while he is dead the joystick already pans the camera, which helps to find targets. There is no time-out; a command is only issued by an explicit tap. The minimap tap (focus-map) works in target mode, and the camera holds there until the mode ends or the Guardian moves.

### Conflict analysis

| Existing input | Today | With the hero bar | Resolution |
|---|---|---|---|
| Joystick (own pointer, `activePointers: 3`) | Moves the Guardian; pans the camera while he is dead | Stays live in every hero state | The row starts at joystick + radius + 12 CSS; clearance is measured (below). Map taps ignore the stick's pointer id. |
| Tap a Crimson unit or structure | Guardian target (`Battle` art handler) | In Attack target mode it is the hero's target; the Guardian's target is unchanged | One branch in the art handler, active only in Attack target mode. |
| Tap an Azure or neutral entity | Inspect | Unchanged; a tap on an Allied Hero selects it (optional) | — |
| Tap empty map | Nothing (there is no tap-to-move) | Defend point in Defend mode; closes the popover when Selected | Same pattern as Build placement (HUD `pointerdown` with no HUD object). |
| Build mode (empty-tap placement, drag pan) | Disables the joystick | Mutually exclusive: opening Build cancels hero mode; the bar is disabled while Build is open | — |
| Shop / Skills panels, Pause | Modal | Cancel hero mode (`clear-controls`) | — |
| Skill buttons (drag aim, cancel zone at `controls.cancel`) | — | Pressing a skill cancels target mode first; the aim cancel zone and the popover are never shown together | — |
| Attack button | Guardian attack | Unchanged | — |
| Minimap tap | 2.2 s look | Works; the look is held during target mode | — |
| Notice / toast channel (top centre) | Wave and Commander warnings | Untouched; the prompt is at the bottom | — |
| Army "Soon" utility | Placeholder | Untouched; a natural later home for the Tavern / hire panel (Phase 1 decision) | — |

Measured clearance from the mock (CSS px from each new element to the nearest existing hit area; negative would overlap):

| Viewport | Portrait 1 | Portrait 2 | Portrait 3 | Popover | Popover top to the plates | Targets |
|---|---|---|---|---|---|---|
| 780×360 (S24 fullscreen) | 13.4 (joystick) | 68.8 | 124.6 | 15.2 (joystick) | 154 | portraits 48, commands 60×48 |
| 780×250 (worst case, browser bars) | 12.1 (joystick) | 48.6 (Bash) | **3.9 (Bash)** | **3.0 (joystick)** | 48 | portraits 44, commands 48×48 |

At the worst-case size, with three heroes (M5–M6), it fits, but tightly. At one or two heroes (M1–M4) the third slot does not exist.

Seen in the 780×250 stills but not caused by this proposal: the Azure Keep plate already overlaps the resource row of the match plate at that size.

## C. Minimal file-change plan (Phase 1, once approved)

| File | Change |
|---|---|
| `src/ui/heroBarLayout.ts` (new, pure) | Slots, popover and prompt rectangles from `controlLayout` and the CSS scale. This is the `layoutFn` already written in `scripts/mock-hero-hud.mjs`. |
| `src/ui/HeroBar.ts` (new) | Portraits, badges, HP, popover and prompt, in the style of `UtilityButton` / `AbilityButton`. |
| `src/scenes/HUD.ts` | Create the bar only when the match has Allied Heroes. The hero-mode state machine. The Defend map tap (Build pattern). Cancels from `clear-controls`, Build, Shop, Skills and ability presses. |
| `src/scenes/Battle.ts` | Attack-mode branch in the art handler (with a 28 CSS px snap to the nearest valid target), selection by tapping an ally, screen→world for the Defend tap (as placement), and a world marker layer (selected ring, attack line, defend flag, reticles). |
| `src/simulation/GameState.ts`, `Simulation.ts` | A real `{type:'ally', id, order}` command through `send()` (validation and pause rules, like every command) in place of the probe's direct `orderAlly`, plus an `ally-order` event and `rejected` reasons for the prompt. |
| Tests | `tests/hero-bar-layout.cjs` (pure geometry at 960×540, 832×291, 780×360, 780×250, 740×270: no overlap, ≥ 44 CSS targets); `tests/ally-command.cjs` (send validation, events); `scripts/verify-hero-hud.mjs` (real taps at both phone sizes: select → Attack → tower; Defend → ground; both cancels; joystick held during targeting still moves the Guardian; Build cancels; the Guardian's target is unchanged by an Attack-mode tap). The 13 probe tests stay. |

Chapters 1–4 are untouched: the bar exists only when a match has Allied Heroes.

## D. Risks and recommendation

- **The S24 numbers are still missing.** This is the gate for M1 and nothing here replaces it.
- **The worst-case size is tight with three heroes** (3–4 CSS px). Fullscreen has 13 px or more. It only matters from M5, so revisit it then (for example a 2-row bar, or a smaller Bash offset in the short layout).
- **Snapping a tap to a small moving unit** (about 25×32 CSS px on the phone) needs the 28 px snap radius and a human check that it doesn't feel slippery.
- **Off-screen targets** need a drag or minimap look first; there is no "tap the minimap to attack" in V1.
- **The Knight sprite is a placeholder** (the Guardian's art). A distinct silhouette is needed before human tests, or players will confuse the Guardian with a Knight.
- **A one-thumb command takes two taps** (portrait → command → target makes three for Attack/Defend). That is acceptable for V1; a later shortcut could be a long-press on a portrait to cycle orders.

**Recommendation: GO to build this HUD in Phase 1, conditional on the S24 result.** The design needs no engine change and reuses the Build-mode tap pattern. It keeps every existing control live, and on the S24's fullscreen viewport it clears every existing control by 13 CSS px or more. Start M1 only after the S24 comparison is in and this HUD is approved.
