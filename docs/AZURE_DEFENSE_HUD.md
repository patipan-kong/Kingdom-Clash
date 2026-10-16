# Azure tower diagnosis and Azure Keep HP HUD

Evidence retention: referenced screenshots are historical local-only archive files, not required Git attachments in the minimal RC1 scope. The diagnosis, contracts and current removal notice remain committed documentation; see `rc1-audit/WHITELIST_REVIEW.md`.

> RC1 update (2026-10-16): this is the historical pre-Slice-6 diagnosis. The approved Slice 6 removes the decorative tower at (620,495), including its map occupancy/obstruction; map walls and actual built/enemy tower combat remain. Balance B and the Azure Keep HUD are integrated with UI v0.4.2 and approved Polish 5/5.1, 6 and 7. Current scope and approval conditions: `RC1_AUDIT.md`.

Branch `gameplay-v0.4.1-balance`, based on `da7475d`. Uncommitted, alongside the v0.4.1 combat variants (`docs/GAMEPLAY_V0_4_1.md`).

## 1. Azure towers: root cause

The playtest finding is accurate, but it is not a defect in tower combat. **The Archer Tower already standing next to the Azure Keep is decorative by design.**

| Azure structure | In the simulation? | Attacks? | Evidence |
|---|---|---|---|
| Pre-placed Archer Tower `tower` at (620,495), plus Wooden Walls `wall-a` and `wall-b` | **No.** These are `src/world/layout.ts` visuals only. They are drawn, block movement and building, and show "650 / 650" when inspected, but have no stats, target or HP pool | Never | `Simulation` creates only Azure minions from `entities` and Crimson defenders from the encounter. No Azure structure exists at match start |
| Player-built Archer Tower (Build menu) | Yes (`state.structures`, team blue) | **Yes.** 18 damage per 24 ticks, range 240 from its centre, line of sight, nearest target first. Never hits allies or the Guardian. Silent while under construction | Deterministic reproduction and `tests/azure-defense-hud.cjs` |
| Azure Keep | Yes | No (Gameplay v0.4 asymmetric model, unchanged) | `gameplayV04.keepDefense.blue = null` |

- **This is an explicit design decision.** `docs/GUARDIAN_BALANCE_V0_1.md` §12 (line 314) lists "should preplaced decorative structures ever become combat objects" as an open question: "until answered … illustrative objects remain obstacles". Making the pre-placed tower fight is therefore a new defensive mechanic, so it was **not implemented** (see §3).
- **Reproduction** (Variant A, extended encounter, no waves):
  - A Crimson minion parked 76 px from the decorative tower takes 0 damage in 3 s.
  - A built tower deals 4 × 18 = 72 damage to a Crimson minion 150 px away in the same 3 s, and 0 to an Azure minion 40 px away.
- **Visual feedback for built towers already exists:**
  - a gold range-ellipse flash on every shot (200 ms);
  - a floating "-18" over the target.

  Neither is dramatic, so a built tower can look idle at a glance.

## 2. Azure Keep HP plate

`src/ui/azureKeepHud.ts`, with drawing code in `src/scenes/HUD.ts`.

- **Content:**
  - "AZURE KEEP" label;
  - current and maximum HP, e.g. `2550 / 3000` (the current value rounded up, matching the existing under-attack toast);
  - a bar in the same blue as the world Keep bar.
- **Data source:** read every HUD frame from `simulation.state.bases['blue-base']`. There is no UI counter, no tweening and no implied regeneration. Simulation damage shows on the next rendered frame.
- **States:**

  | HP | Bar | Border |
  |---|---|---|
  | ≥ 50% | Blue | Gold, like the other top plates |
  | Below 50% | Amber | Gold |
  | Below 30% | Red | Slowly breathing red; the HP text turns red |
  | 0 | Red | Red, static |

- **The existing "Azure Keep under attack" toast and wave-line warning are unchanged.**
- **Layout:** fixed 170×30 CSS px, right-aligned with the minimap panel, 4 px below its shadow. It is always visible, including when the Guardian is dead or far away.
  - 960×540: logical (782, 109)–(952, 139).
  - 844×390: CSS (518, 80), 170×30.
  - It clears the skills, utilities (Build / Shop / Army), joystick, cancel, pause, minimap, match and Guardian plates, combat notice and Shop panel at both sizes.
- **Interaction with world Keep bars:**
  - The plate is not added to the full-width HUD clearance, which stays at 113 / 116 logical, so world Keep bars elsewhere on screen behave exactly as before.
  - A world Keep bar that would sit under the plate drops 2 px below it, the same local-obstruction approach the Shop panel already uses.
  - An earlier draft added the plate to the clearance. That would have hidden both world Keep bars about 34 px earlier when scrolling, so it was rejected.
- **Screenshots** (`docs/gameplay-v041/`):
  - `azure-keep-hud-full-844x390.png` and `azure-keep-hud-full-960x540.png`: full HP.
  - `azure-keep-hud-low-dead-844x390.png` and `azure-keep-hud-low-dead-960x540.png`: 720 / 3000 (low warning) with the Guardian dead and the camera on the Crimson side.

**Pre-existing `keep-health` failure.** At 960×540, pan 197, the check requires the world bar's marker at screen y ≥ **144**. The current compact top HUD ends at 113, and the bar correctly rests at 113. There is no overlap: the 144 is a stale constant from the Phase 2C HUD. It was left untouched. Recommended one-line test fix: compare against `HUD.topHudBottom` instead of 144.

## 3. Balance impact

The production tower behaviour did not change, so the shipped game has no balance delta. To support the decision on the decorative tower, the harness was run **in memory only**: the tower was armed at (620,495) with unchanged built-tower stats (650 HP, 18 damage, 240 range).

| Scenario | Variant | Today | Armed decorative tower |
|---|---|---|---|
| Guardian absent | A, B | Defeat at 112 s; 9 minions reach Azure | Defeat at 262 s (+150 s); 7 reach Azure |
| Rush, no items (3 bot speeds) | A | Win 174 s; Azure 1056–1164; 5–6 minions reach Azure | Win 174 s; **Azure 3000; 0 reach** |
| Rush, no items | B | Win; Azure 1074–3000 | Win; Azure 3000 |
| Left flank, no items | A | **Defeat** at 87 s (Crimson 312 left) | **Victory** at 200 s; Azure 2226 |
| Left flank, no items | B | **Defeat** at 83 s | **Victory** at 156 s; Azure 3000 |
| Guardian Shield | A | Win; Azure 1416–1668 | Win; Azure 3000 |
| Guardian Shield | B | Win; Azure 2100–2604 | Win; Azure 3000 |
| Siege Hammer | A, B | Win; Azure 3000 | Unchanged |

**One free tower at the Azure door would remove nearly all Crimson pressure on Azure in the first five minutes.** It would also flip the no-item flank back to a win, undoing what Variant B achieves. If it is wanted, it needs its own tuning, separate from the v0.4.1 durability variants. Options:
- lower damage or HP;
- destroyable without being rebuilt;
- start inactive until a wave threshold;
- or keep it decorative and change its art, so it doesn't read as a defender.

## 4. Files

- **New:** `src/ui/azureKeepHud.ts`, `tests/azure-defense-hud.cjs` (6 tests), `docs/AZURE_DEFENSE_HUD.md`, and screenshots in `docs/gameplay-v041/`.
- **Changed:**
  - `src/scenes/HUD.ts`: the plate and its obstruction event.
  - `src/scenes/Battle.ts`: world Keep bars avoid the plate.
- **No simulation, balance or tower-stat changes in this slice.**
