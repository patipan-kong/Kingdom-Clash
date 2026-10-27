# Chapter 2 S5 — Sunwell Oasis battlefield

Branch `chapter2/s5-oasis-battlefield`, baseline `71ebd83` (S4). Status: implemented, awaiting review. No campaign level uses Oasis; it opens only with `?battlefield=oasis` on the dev server.

## What was added

- **Battlefield `oasis`** (`src/world/battlefield.ts`): a plus-shaped pond of two water barriers, a vertical bar x 920–1080, y 420–780 and a horizontal bar x 880–1120, y 520–680. Both banks stay open (north y 0–420, south y 780–1152, roughly 400 px across). Water blocks movement, tower fire and every line of sight, like Meadow's river.
- Scenery is Meadow's in full (the pond covers none of it). There are no pre-placed walls. Meadow's three opening Azure Vanguards stood where the pond is, so they move to the west shore: (870,470), (870,730), (860,600). Territory, reserved cell, respawn points and route objectives are Meadow's.
- **Outposts**: `Battlefield.outposts` (optional) and `inTerritory(field,x,y)`. A cell is buildable inside the Keep-centred territory (unchanged: radius 384 around the Keep) or inside an outpost circle. Oasis has two, radius 96 around (760,330) and (760,870). All other placement rules (reserved cells, scenery, barriers, static footprints, limits, costs) still apply. Meadow and Canyon have no outposts and place exactly as before; `Building.ts` and the building-mode grid in `Battle.ts` use the one helper.
- **Art** (`battlefieldArt.ts`, `Battle.createOasisTerrain`): Meadow's grass, sand road, water, tree, rock and bush textures only, with tints; nothing new is loaded or baked. The water texture is masked to the union of the barrier rectangles, so the visible water edge is the collision edge; sand bank, rim and shore stones sit outside it.
- **Dev launch**: `?battlefield=oasis` works through the existing mechanism (`battlefieldFromSearch`), dev server only.

- **Navigation optimisations** (`src/simulation/Navigation.ts` only, exact behaviour): (1) `structureMasks(live, radius)` assigns each live structure to the cells near it instead of filtering the whole structure list for all 960 cells; each cell keeps the same structures in the same order, and unmasked cells share one empty array that is only read. (2) `search` reuses one copied attacker (`probe`) for the goal-cell scan and sets x and y per cell, instead of copying the unit per cell; `canAttackOn` only reads its attacker and keeps no reference to it. The A* loop, open-list ordering, tie-breaks, replanning policy, AI and combat are unchanged.

Not touched: campaign levels and unlocks, combat, economy, skills, waves, enemy AI, A* and its tie-breaks, mobile UI, Full Battle, Canyon geometry.

## Results

- **Open ground** (cells a 12 px unit can stand on): Meadow 79.5%, Canyon 74.5%, Oasis 85.2%.
- **Encounter coordinates**: all 51 checked (spawn slots, Crimson towers, Guardian spawn, respawn points, opening units, prototype waves) are open.
- **Routes**: every Crimson slot, the Guardian spawn and both Azure slots reach both Keeps by either bank alone, for radius 12 and 21; with both banks masked the map is cut in two. Navigation plans on radius-safe segments for radius 12 and 20.
- **Route split, undefended extended match**: 8 of the 10 Crimson minions that reached the pond took the north bank and 2 the south (Canyon: 11 and 2). By slot: (1380,556) 4 north; (1380,600) 3 north; (1380,644) 1 north, 2 south. Nothing was hardcoded; the bias comes from the existing slot rows and A* ordering.
- **Tower coverage** (best single tower, share of a bank approach x 760–1240 within range 240 and line of sight): Keep circle alone 9 of 31 (29%); with the outposts 20 of 31 (65%), both banks. Canyon's best tower covers 9 of 21 (43%) of a lane. The outposts add 20 buildable cells (8 north, 12 south; the rock at 790,340 takes cells from the north outpost).
- **Performance, before the Navigation optimisations below** (headless, `perf-encounter.mjs`, defend bot, extended, 9000 ticks, median of 5 alternating runs, ms per tick): Oasis 0.766 against Meadow 0.435 = **1.76×**; Canyon in an identical run 0.567 against Meadow 0.413 = **1.37×**. Longest tick 35 ms on Oasis, 15.7 ms on Canyon (Meadow runs 13.6–29 ms). Navigation stays inside its bound of 2 plans per tick; the largest plan expanded 106 nodes (Canyon: 50). This is above the accepted Canyon exception; no simulation optimisation was made or authorised.

## Navigation optimisation results

- **Equivalence**: `tests/navigation-optimization.cjs` (5 tests) compares the masks with the previous per-cell filter (verbatim in the test) for 160 random layouts at radii 0, 12, 20 and 31.5, world edges and corners, overlapping structures, cell-boundary cases and a destroyed structure, and checks that a reused or frozen attacker gives the same `canAttackOn` answer for all 960 cells. Whole matches before and after (defend, rush and balanced policies on Meadow, Canyon and Oasis, plus the Meadow prototype encounter; 10 runs, including victory, defeat and timeout) have identical route hashes, plans, nodes expanded, kills, damage, Keep HP, XP and outcomes.
- **Benchmark** (headless, defend bot, extended, 9000 ticks, 9 alternating runs after 2 warm-ups, median ms per tick): Meadow 0.480 to 0.420, Canyon 0.601 to 0.546, Oasis 0.791 to 0.677. Oasis against Meadow is now about 1.61x. No Meadow or Canyon regression.
- **Real-device performance has not been measured.** Most of the remaining Oasis excess is more route replanning (target and goal-cell changes) and more live units, which is existing AI behaviour and was left alone.

## Known limitations

- **A held bank is a plug.** With the Guardian parked on the north shore line, the whole wave that goes north fights it and stays there, and no minion crosses. A wave does not redirect to the other bank (no AI change). Canyon let a few minions slip past; Oasis, with minions hugging the pond edge at y 408, does not.
- **North bias.** The three Crimson slot rows all send most of a wave north, so the south outpost sees fewer enemies than the north one.
- **Performance** exceeds the Canyon exception (see above) and is a headless figure, not a device measurement.
- **Art**: no palm sprite exists, so the groves are the Meadow trees (tinted). The pond uses the Meadow water texture.
- Oasis has no campaign level, mission or minimap bespoke art beyond its colours.

## Verification

Focused: `navigation-optimization.cjs` (5), `navigation`, `campaign-navigation`, `oasis.cjs` (12), `battlefield-art.cjs`, `battlefield-launch.cjs`, `battlefield.cjs`, `battlefield-threading.cjs`, `canyon-pass.cjs`, `golden-simulation.cjs` (fixtures unchanged, plus an Oasis-interleaved Level 1 golden run), `simulation`, `match-setup`, `campaign-level-11`, `build-ui`, `context-guidance`. One browser smoke on `?battlefield=oasis` with screenshots; no runtime errors.
