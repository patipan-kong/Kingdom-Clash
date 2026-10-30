# Chapter 3 · M4A — Mission 4 "The Twin Walls"

Status: Game Director PASS (2026-10-30): gameplay and balance locked as implemented; no M4B (no mud, no new enemies, no HP changes). Committed on `chapter3/m4a-two-ring-siege` (off `main` 5de8a73), not pushed or deployed. Chapter 3 stays Coming Soon.

Human playtest: `http://localhost:5173/?debug=1&chapter=3&mission=4` (dev server only; `?debug=1&level=24` is the same mission).

## What it is

A two-ring siege on a new battlefield, `twin-walls`. The direct road breaks the Outer Gate. The alternate roads go round the outer wall through a gap at its north or south end, past that gap's Crimson Barracks. Every road ends at the Inner Gate, and the one objective is **Destroy the Crimson Keep**. Gates, towers and Barracks are all optional.

Nothing new was added to the engine: walls, gates, towers, Crimson Barracks, the garrison, Azure Barracks and the hybrid soldier AI are reused unchanged. There is no mud, no fire, no `overWall`, no new enemy class and no navigation change.

## Layout (world 1920 x 1152, grid 48)

```
     0123456789012345678901234567890123456789
  0  ................+#####..................
  1  ................+#####......S...........
  2  .:#:............+#####........++........
  3  .+#+..+#........+#####........+B........
  4  ..:...##:...#+..+#####....#...++........
  5  .......:...:##..+#####....#T............
  6  ................+#####...T#.............
  7  ....:.....+#....+#####....#...##########
  8  ....+........++.+#####....#...#......++.
  9  ................+#####....#..T#......+B.
 10  ..........b..............T#...#.........
 11  .....###+.................+...+.###.....
 12  .....#A#+..........##.....G...G.#K#.....
 13  .....###+.................+...+.###.....
 14  .........................T#...#.........
 15  ................+#####....#..T#.........
 16  ........+.......+#####....#...#.........
 17  ........:..#+...+#####....#...##########
 18  ................+#####...T#.............
 19  ........:...:#:.+#####....#T............
 20  ..+#...##...+#+.+#####....#...++........
 21  ..##:..+#.......+#####........+B........
 22  ...:............+#####........++........
 23  ................+#####......S...........
```

Legend: `#` cliff or wall, `+` structure footprint, `:` open for a minion but not the Guardian, `T` Crimson tower, `G` gate (1 x 2), `B` Crimson Barracks (2 x 2), `b` Azure Barracks, `S` wave spawn slot, `K` / `A` Crimson / Azure Keep.

| Part | Where | Notes |
|---|---|---|
| Canyon cliffs | x 800-1040 (was 1120 on Canyon/Frost Citadel), lanes y 480-720, spire x 920-1000 | shortened so three bands fit east of the cliffs |
| Outside strip | x 1040-1248 | from the canyon mouth north and south to the gaps |
| Outer wall | x 1248-1296, y 192-552 and 648-1008 | north gap y 0-192, south gap y 1008-1152 |
| Outer Gate `red-gate-outer` | (1272,600), 1 x 2 | **1,000 HP** |
| Ring | x 1296-1440 between the walls, plus the open ground north and south of the courtyard | |
| Inner wall and courtyard | west wall x 1440-1488 (Frost Citadel's moved 48 px east), courtyard walls y 336-384 and 816-864 | |
| Inner Gate `red-gate-inner` | (1464,600), 1 x 2 | **3,000 HP** (the Frost Gate value) |
| Crimson Keep | (1610,600), armed | unchanged position |
| Outer bastions `red-outer-north/south` | (1224,504), (1224,696), flush on the outer wall's west face | cover the Outer Gate siege spots |
| Court bastions `red-court-north/south` | (1416,456), (1416,744), flush on the inner wall's west face | cover the Inner Gate siege spots |
| Strip Towers `red-strip-north/south` | (1224,312), (1224,888), outside the outer wall | watch the strip and the gap from outside |
| Gap Towers `red-gap-north/south` | (1320,264), (1320,936), inside the ring | watch the gap exit |
| North / South Barracks | (1488,168), (1488,1032), 2,000 HP each | own the wave slots (1368,72) and (1368,1128), 48 px from their gap road |
| Court Barracks | (1824,432), 1,500 HP | owns the garrison slots (1800,552), (1704,432) |
| Azure Barracks | Mission 3's pads (10,10), (10,14), (13,12); the first stands at the start | unchanged M3 system |

Match: start 0 Gold / 0 Wood / 0 Iron; waves from tick 300 every 750, sizes 6,6,6,6,7,7,8,8 (the last repeats until the Keep falls), 1 Azure ally per wave, alternating North and South slots; garrison after the Inner Gate, first 90 ticks later, 4 and 5 alternating every 750 ticks; defeat only at 0 Azure Keep HP.

## Verified geometry (focused tests, real engine)

- With the Outer Gate standing, a minion (12 px) and a Guardian (20 px) reach the Inner Gate only through a gap; with it down, the direct road is the shortest. Both gaps are open for both radii. Nothing reaches the courtyard while the Inner Gate stands.
- Line of sight with the existing rules: at all three siege rows (y 552/600/648) the Outer Gate spot (x 1224) is seen by exactly the two outer bastions and the Inner Gate spot (x 1416) by exactly the two court bastions. The courtyard bastions cannot see the outer spot or into the courtyard. Each gap is seen by its Strip Tower from outside and its Gap Tower from inside.
- Each gap Barracks' wave reaches the Azure Keep through its own gap while the Outer Gate stands.
- Road lengths for the Guardian from the canyon mouth to the Inner Gate spot: direct 384 px (1.4 s), north or south gap 1,344 px (4.8 s). Tower-seconds while walking: direct 3.1, either gap 7.7 (towers only hurt a standing Guardian much; see the probe finding below).

## Bot diagnostics (shared recall-and-rebuild Barracks bot, real Level 24)

The engine is deterministic: different crit seeds gave identical runs, so each row is one run. The bot stays home for its first 100 s, rebuilds up to four Archer Towers, recalls when Crimson come within 420 px of the Azure Keep and buys the three Shop items in order. Nothing was tuned to equalize these times.

| Plan | Result | Guardian deaths | Azure Keep lowest | Gold | Fell (s) | Outer-wall crossings (north / gate / south) |
|---|---|---|---|---|---|---|
| Direct: outer bastions, Outer Gate, court bastions, Inner Gate, Keep | win 305 s | 3 | 3,000 | 2,200 | Outer 142, Inner 232 | 0 / 5 / 0 |
| North road, Barracks ignored | win 304 s | 2 | 3,000 | 2,050 | Inner 245 | 8 / 0 / 4 |
| North road + North Barracks | win 335 s | 3 | 3,000 | 1,830 | N Barracks 150, Inner 254 | 8 / 0 / 3 |
| South road, Barracks ignored | win 302 s | 2 | 3,000 | 2,050 | Inner 248 | 8 / 0 / 4 |
| South road + South Barracks | win 332 s | 3 | 3,000 | 1,895 | S Barracks 151, Inner 235 | 6 / 0 / 5 |

Azure participation (soldiers = Azure Barracks footmen; allies = the one wave ally):

| Plan | Soldiers spawned | Soldier damage | Soldier kills | Soldier-seconds home / field (x < 1248) / ring | Ally damage / kills |
|---|---|---|---|---|---|
| Direct | 19 | 3,169 | 13 | 144 / 191 / 0 | 1,750 / 3 |
| North, ignore | 20 | 2,846 | 8 | 116 / 212 / 0 | 1,540 / 3 |
| North + Barracks | 22 | 2,710 | 11 | 139 / 213 / 4 | 1,185 / 3 |
| South, ignore | 21 | 2,521 | 11 | 123 / 193 / 0 | 1,199 / 1 |
| South + Barracks | 22 | 2,700 | 13 | 122 / 229 / 10 | 1,586 / 5 |

Reading:
- All five plans win within 302-335 s with the Azure Keep untouched. Cutting a gap Barracks costs about 30 s and some Gold; the bot gains nothing measurable from it because the Azure Keep is never threatened.
- The bot does not keep to one gap: its routes are shortest paths per trip, so a "north" plan also uses the south gap on some trips home. A human chooses; the bot only shows that both gaps work.
- Azure soldiers fight on every plan (2,500-3,200 damage, 8-13 kills per match) but almost never reach the ring: they meet the Crimson waves coming out of the gaps and the canyon, die there and are replaced after 15 s. They screen the strip and the canyon mouth rather than join the siege. No soldier was found stuck on a wall.

## Differences from the read-only probe

1. **South gap mirrored** (Director's choice): the probe's v1 had one alternate road (north) and a dead-end south pocket with an outside Barracks and guard tower. Now both ends of the outer wall have a gap, a Strip Tower, a Gap Tower and a Barracks beside the gap inside the ring; the pocket Barracks and its guard are gone. The south gap is 3 cells wide (y 1008-1152), the north one 4 (y 0-192), because the gates sit on y 600 and the world is 1152 high.
2. **Azure Barracks and hybrid soldiers** from main (M3 pads, one Barracks standing) are in the mission; the probe had neither. This is the main reason the probe's "ignore the gap Barracks" plan nearly lost (Azure Keep 30 HP) and now loses nothing.
3. Built on main 5de8a73 (Missions 2-3, the navigation performance change), not on the C3-1 snapshot.
4. Ids follow the game's conventions (`red-gate-*`, `red-barracks-*`) so the existing Frost Gate and Crimson Barracks art and soldier targeting apply.

## Changes

- `src/world/battlefield.ts`: the `twin-walls` battlefield and its registration. Frost Citadel and Broken Wall are unchanged.
- `src/world/battlefieldArt.ts`: `twin-walls` uses the frozen art.
- `src/data/campaignLevels.ts`: `twinWallsLevel` (campaign-24, Chapter 3 Mission 4).
- `tests/campaign-level-24.cjs`: definition, battlefield separation, build, roads, line of sight, slot roads, open objective, defeat, Coming Soon/Continue, and three bot roads (direct, north, south).
- Existing tests updated only where they count Chapter 3 missions.

## Known risks

- **Too safe at home.** With the Azure Barracks and the bot's recall, the Azure Keep never lost a point in any plan, so the "fast but risky" side of the choice does not show in bot play. A human who recalls less will feel more pressure; if the playtest confirms it is too safe, the levers are wave size or interval, or no starting Azure Barracks. Not tuned here, per the brief.
- **Direct and the gaps finish alike** (302-305 s). The roads differ in what they cost (gate time under two bastions versus a longer road past a Strip Tower, a Gap Tower and a Barracks' wave) rather than in total time.
- **Opening Vanguards under fire.** The canyon is shorter, so Canyon's three opening Azure Vanguards (around x 1040) stand inside the outer bastions' range at second 0 and are shot at once.
- Soldiers rarely reach the ring, so they help hold the strip, not break the gates.
- The Outer Gate is one hit target for the Guardian; with the Siege Hammer it falls fast (142 s total including the 100 s the bot waited at home).

## Verification

- `npx tsc --noEmit`: clean. `npm run build`: green (only the existing chunk-size warning).
- `npm test`: 1,006 / 1,006 (main was 994 / 994; +12 in `tests/campaign-level-24.cjs`). Count-only updates for Mission 4 in `barracks`, `battlefield-art`, `campaign-level-21`, `campaign-level-23`, `campaign-progress`, `chapter-view`, `debug-launch`, `frost-gate` and `six-missions`.
- Browser, dev server, `?debug=1&chapter=3&mission=4`: opens `campaign-24` on `twin-walls` with every structure standing and no console error; screenshots of the start, both gates and both gaps taken.
- `scripts/verify-chapters.mjs`: every Chapter 1-3 check passes, including "Chapter 3 coming soon and non-interactive" and "Continue never opens a Chapter 3 briefing". It then stops at the Quick Play step because main 1dfd2f6 removed the Quick Play button from the Main Menu; that failure is on main already and unrelated to M4A.
