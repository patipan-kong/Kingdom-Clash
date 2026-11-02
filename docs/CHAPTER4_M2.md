# Chapter 4 Mission 2 "Cliff Pass" (campaign-32): implementation notes

Specification: `docs/CHAPTER4_M2_DESIGN.md`. Built on the M1 checkpoint (fba0a39) in the worktree `G:\work\ark\arkhero-chapter4-m2`, branch `chapter4/m2-cliff-pass`. Uncommitted. Every balance value is provisional until human playtest.

## What was built
- **Cliff Pass battlefield** (`cliff-pass`, `src/world/battlefield.ts`): six cliff blocks, a 144 px neck, the faction gate site (1272,600, 1 x 3), the camp circle (1056,576, r144), four towers (camp holders at (1152,504)/(1152,648), gate towers at (1392,504)/(1392,696)). Drawn with Canyon's cliff painter (`battlefieldArt.ts`, road narrowed to y 520-680); no new art pipeline.
- **Faction gate** (per-gate level data, `gates:[{id,hp,faction:true}]`): the gate structure carries `gate:true`; `structuresFor(state,'red')` (GameState.ts) is the Crimson view without faction gates and is used by Movement, `Navigation.route`, the attack and line-of-sight checks and `checkGates`. `Geometry` (Collision.ts) is untouched. Chapter 3 gates carry no flag and stay solid for Crimson.
- **Ballista** (`buildings.ballista`: 140 Wood / 30 Iron, 520 HP, 70 damage every 90 ticks, range 420): a tower-kind structure with `ballista:true`, placed only on `MatchPost.ballista`'s ruin, only while the camp is Azure, repaired at 60% (84 Wood, 18 Iron, 5 s) with M1's repair rules. The tower code does targeting, sight and hits.
- **Level** (`campaignLevels.ts`, `cliffPassLevel`): M1's waves, start, Hero and Banner; no flank waves; 2 Elites on the first capture; 3,000 HP gate; one Azure Barracks (limit 1, none at start).
- **UI**: a fourth Build-panel card (Ballista, at the repair price), the gold ruin highlight, the ruin label with price and range ring, a ruin and Ballista sprite and a Cliff Gate sprite (`src/world/cliffArt.ts`, drawn on canvas textures, no image files), the camp name from `MatchPost.name`, and the camera brings the ruin into view when the Ballista card is chosen (the panel could otherwise cover it on a phone).
- **Validation**: a Ballista ruin must be inside the camp circle, off the tower ruin and the flag, and open ground (`initPost`); `checkGates` plans as Crimson sees the map.

## Verification (all green)
| Check | Result |
|---|---|
| Unit suite | 1082/1082 (1062 earlier + 20 in `tests/campaign-level-32.cjs`) |
| `tsc --noEmit`, `npm run build` | clean |
| M1 browser check (`verify-forest-edge.mjs`) against this branch | 31/31 |
| M2 browser check (`verify-cliff-pass.mjs`), desktop and 844 x 390 phone | all pass, no page errors |
| Layout geometry (`scripts/m2-layout-check.cjs`, plus the same checks as unit tests) | Azure cannot pass the standing gate at radius 12/20/28, Crimson can, neck and Keep lanes passable, Ballista sees the gate, neck exit, camp, Banner and hollow |

Movement and congestion (unit tests): Crimson units exit through the standing gate and never attack it; an Azure unit attacks it and is held west of it; the Guardian is stopped by it; Azure Barracks soldiers follow the Guardian to the gate without jamming (within 500 px, west of the gate) and cross after it falls; four Crimson units standing in the gate's footprint when it dies walk out; 36 mixed units at the open neck fight out with no unit stationary for 10 s without a foe near.

Frame time under neck congestion: headed Chrome on the real GPU (Intel UHD 730), `scripts/trace-forest-edge.mjs` with `TRACE_LEVEL=32 TRACE_AT=1296,600`: 15, 30 and 44 live units give 60 FPS, 16.7 ms frames, p95 16.8, worst 17 ms, no frame over 50 ms; main thread busy 50-54% of the frame, minor GC about 7-11 ms per 10 s. Simulation cost with 40 units: 1.83 ms/tick at the neck against 1.82 at M1's camp road. (The display was 61 Hz this time, not the 32 Hz Remote Display Adapter of the M1 trace.)

## Bot comparison (provisional; 5 variants each, recall 360-480; seconds to victory)
| Plan | Wins | Median | Guardian deaths |
|---|---|---|---|
| conquer + Ballista | 5/5 | 251 | 4-5 |
| conquer, no Ballista | 5/5 | 261 | 4-5 |
| turtle + Ballista | 5/5 | 288 | 4-5 |
| turtle, no Ballista | 5/5 | 265 | 4-5 |
| Barracks first + Ballista | 5/5 | 280 | 4-5 |
| no towers, no repair + Ballista | 5/5 | 291 | 4-6 |
| no towers, no repair, no Ballista | 4/5 | 483 | 4-7 |

M1's bots: conquer 252, turtle 349, no-build lost 5/5. So M2 matches M1 for the main plan, and is easier for the bots that do not build (the neck turns waves into a column, and the Ballista helps further). The Ballista never died in these runs. This is bot behaviour, not a human result.

## Known issues and integration risks
1. **Easier for non-builders than M1** (bots): if human playtest finds M2 too soft, the levers are gate HP/armour, a third Elite on the counterattack, or moving the Ballista ruin out of the Warden's guard.
2. **The Ballista chips the gate** (about 23 damage per second in a lull; enemies nearer always come first), as approved. Bot runs ended with the gate at 0 HP in every variant.
3. **Banner and Ballista labels overlap** on screen (the ruin sits 96 px north-west of the Banner).
4. **A unit standing inside a structure footprint** (for example one spawned on the Banner) is unreachable and enemies targeting it idle. Pre-existing engine behaviour, found by a test-harness mistake; not changed.
5. **Initial Azure Vanguards stand 20 px from the Banner flag at tick 0** (Meadow's positions); they move off in play, but a player who captures instantly would be blocked until they do. Tests move them.
6. **Ruin art, Ballista art and the Cliff Gate are placeholders** drawn on canvas; real artwork replaces them later.
7. Tower and Ballista ruin cells reuse M1's single-ruin rules; no new "Disabled" state.

## Run it
- Dev server: `cd G:\work\ark\arkhero-chapter4-m2` then `npm run dev -- --port 5281`.
- Play: `http://127.0.0.1:5281/?debug=1&level=32` (or `?debug=1&chapter=4&mission=2`). The FPS overlay is on with `debug=1`.
- Tests: `node scripts/test.mjs campaign-level-32.cjs`; browser: `CLIFF_URL=http://127.0.0.1:5281/ node scripts/verify-cliff-pass.mjs`; bots: `node tests/support/cliffBot.cjs "{\"plan\":\"turtle\"}"`; trace: `FOREST_URL=http://127.0.0.1:5281/ TRACE_LEVEL=32 TRACE_AT=1296,600 TRACE_CROWD=30 node scripts/trace-forest-edge.mjs`.
- Stills: `docs/screenshots/cliff-pass/` (map, gate and neck, ruin before and after capture, repair, repaired Ballista, Crimson crossing the gate, phone Build panel).
