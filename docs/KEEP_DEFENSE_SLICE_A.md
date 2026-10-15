# Gameplay v0.3.1A — Keep Defense Slice A (current encounter specification)

Branch `gameplay-v0.3.1a`, based on main `b60020d`. Experimental, part of the v0.3 playtest line; not an approved final balance. This document supersedes the Crimson defender count in [Phase 2C plan](PHASE_2C_PLAN.md) and [Phase 2C report](PHASE_2C.md), which remain historical records of the original seven-tower layout.

## Crimson defenders (extended encounter): 8 towers
| Id | Position | Role |
|---|---|---|
| `red-tower-front-north` / `front-center` / `front-south` | (1464, 504 / 600 / 696) | front line (unchanged) |
| `red-tower-rear-north` / `rear-south` | (1512, 456 / 744) | second line (unchanged) |
| `red-tower-keep-north` / `keep-south` | (1560, 480 / 720) | Keep flanks (unchanged) |
| **`red-tower-keep-rear`** | **(1760, 600)** | **new: covers the Keep's east face** |

All eight are the existing pre-completed Archer Tower: 650 HP, damage 18 (24 against the Guardian, Balance v0.2), range 240, cooldown 24 ticks, no windup, nearest-target with line of sight, 30 XP when destroyed, no Gold. Keep HP (3000), line of sight, targeting, collision, damage, movement speed, minion counts and wave schedules are unchanged. The data change is one entry in `extendedRules.towers` (`src/data/encounters.ts`).

## Why
The Crimson Keep body blocks the sight lines of every original tower toward its east face. With seven towers, 438 reachable Keep-attack positions (4 px lattice) had no defending tower; a Guardian could flank along the north or south lane (about 8 s, 40–100 damage) and destroy the Keep in about 48 s with zero tower retaliation, winning at about 56 s from match start at level 1.

## Rules this slice guarantees (tests/keep-defense.cjs)
- In the intact 8-tower layout, no reachable position from which the Guardian can hit the Keep is free of defending towers. A control removes `keep-rear` and requires the east-face pocket to reappear.
- The Keep can still fall while every Crimson tower stands (victory needs only the Keep).
- The Guardian passes at full speed both through the 14 px clearance between the Keep and `keep-rear` (x 1702–1716 for its 20-unit radius) and around the tower's east side.
- Destroying `keep-rear` awards the normal tower XP and reopens the east-face pocket. Flanking stays possible; it now costs a tower.

## Measured effect (deterministic bots, MEASURED; bots are not humans)
| Scenario | 7 towers | 8 towers |
|---|---|---|
| Keep-attack positions with 0 / 1 / 2+ defending towers | 438 / 1,282 / 595 | **0** / 292 / 1,729 |
| Towers to destroy before the Keep is undefended | 0 | 1 (`keep-rear`, solo-able) |
| LV1 flank straight to the Keep | win 56 s, 40–100 damage | dies with Keep at 168–312 HP |
| LV1 flank, destroy `keep-rear`, then Keep | — | win about 67 s, 340–380 damage |
| Siege Hammer flank straight to the Keep | win 37 s, 40–100 damage | win 37 s, about 820–880 damage |
| Siege Hammer flank, destroy `keep-rear` first | — | win 44 s, about 240–280 damage |
| Frontal Rush / Shield bots | win 151 s / 357 s | unchanged; `keep-rear` left standing |
| Hammer bot (also destroys `keep-rear`) | win 314 s, Azure 3000 | win 315 s, Azure 2586 (timing drift) |
| Defend 15 min | Azure 3000, 160 kills | identical |
Front-side tower coverage is unchanged (0 of 215 front grid cells differ).

## Known risks / playtest questions
- Flanking remains about 2.3 times faster than the frontal rush; a Hammer Guardian can still absorb one tower while destroying the Keep. Whether that is acceptable is a Keep-durability or Wave Pressure question, not a placement one.
- The 14 px clearance beside the Keep is tight; it needs a human check on touch and mouse.
- The rear tower sits on the right edge of the play area; check readability on small screens.
