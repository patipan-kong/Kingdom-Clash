# Chapter 3 · M5 — Mission 5 "The Fallen Outposts"

Status: Director PASS; committed. Implemented on `chapter3/m5-fallen-outposts` (off `chapter3/m4a-two-ring-siege` 0f57388, which is not yet merged to `main`). Not committed, pushed or deployed. Awaiting Game Director review and human playtest. Chapter 3 stays Coming Soon.

Human playtest (dev server only): `http://127.0.0.1:5251/?debug=1&chapter=3&mission=5` (`?debug=1&level=25` is the same mission).

## What it is

One fortress wall (x 1392-1440) with two ways through. The direct road breaks the **Main Gate** (4,000 HP) under two bastions. The other road is a **snow pass**: a Deep Snow pocket north of the wall, plugged by **Barracks B** (the plug, 3,000 HP) under two Choke Towers. **Barracks A** (the outpost, 1,500 HP) stands inside the pocket without blocking it: optional and passable. A **Keep Barracks** (1,500 HP) owns the garrison, which rallies when the gate **or** the plug falls. The single objective is still **Destroy the Crimson Keep**. The south pocket is an empty dead end.

Reused unchanged: walls, gates, towers, Crimson Barracks, the Azure Barracks and hybrid soldiers, waves, the garrison, navigation (its breach planner already treats a Barracks as a breakable wall). No new enemy class and no Elite Soldiers (HP x2 soldiers from Barracks A are reserved for a balance pass after the human playtest).

## Engine changes (three, all small)

1. **Deep Snow** (`SlowZone` on `Battlefield`, `zoneSlow`, `Movement.ts`): an optional list of rectangles; a unit whose centre is inside one moves at `1 - slow` speed (max 50%), either team, the Guardian included. It is evaluated every tick from the unit's current position, so it applies only while inside. It does not stack with a skill slow: movement uses the stronger of the two (like `slowFactor`'s own cap). Battlefields without zones are untouched (one `undefined` check). Guardian Charge's dash is not affected.
2. **Garrison trigger** (`MatchGarrison.after`): one id (as before) or a list; each is a gate or a Barracks of the match, once. The garrison starts when the first dies; the existing `!this.garrison` guard prevents duplicates. `checkGates` requires each trigger to open the sealed area by itself (a gate trigger takes every gate with it, as before; a Barracks trigger only itself), so a Barracks that does not open the way is rejected.

3. **Azure Barracks limit** (Director decision): `MatchAzure.limit` (1 to 3, default 3) feeds the existing `placementReason` check; Mission 5 sets 2. Missions 3 and 4 are unchanged at 3; Mission 6 is expected to use 3.

Also: a Deep Snow overlay in `Battle.ts` and a HUD line when a Barracks trigger falls ("The way is open · the garrison rallies").

## Layout (world 1920 x 1152, grid 48)

```
     0123456789012345678901234567890123456789
  0  ................+#####~~~~~~~#..........
  1  ................+#####~~~~~~~#..........
  2  .:#:............+#####~~++~~+++.........
  3  .+#+..+#........+#####~~+B~S+B+.........
  4  ..:...##:...#+..+#####~~~~~~+++.........
  5  .......:...:##..+#####~S~T~T~#..........
  6  ................+#####~~######..........
  7  ....:.....+#....+#####~~~~~~~#......S...
  8  ....+........++.+#####~~~~~~~#.....++...
  9  ................+#####~~~~~~~#T....+B...
 10  ..........b.................T#.....++...
 11  .....###+....................+..###..S..
 12  .....#A#+..........##........G..#K#.....
 13  .....###+....................+..###.....
 14  ............................T#..........
 15  ................+#####.......#T.........
 16  ........+.......+#####.......#..........
 17  ........:..#+...+#####..######..........
 18  ................+#####.......#..........
 19  ........:...:#:.+#####.......#..........
 20  ..+#...##...+#+.+#####.......#..........
 21  ..##:..+#.......+#####.......#..........
 22  ...:............+#####.......#..........
 23  ................+#####.......#..........
```

Legend: `#` cliff or wall, `+` structure footprint, `~` Deep Snow (open ground), `:` open for a minion but not the Guardian, `T` Crimson tower, `G` gate, `B` Crimson Barracks, `S` spawn slot (wave or garrison), `K`/`A` Crimson/Azure Keep, `b` Azure Barracks.

| Part | Where | Notes |
|---|---|---|
| Canyon cliffs | x 800-1040 (as Twin Walls) | |
| Wall | x 1392-1440, openings y 120-216 (plug) and y 552-648 (gate) | south of y 648 solid |
| Main Gate `red-gate-main` | (1416,600) | **4,000 HP** |
| Plug Barracks `red-barracks-plug` (B) | (1416,168) | **3,000 HP**, wave slot (1320,168) |
| Outpost Barracks `red-barracks-outpost` (A) | (1200,144) | 1,500 HP, wave slot (1128,240); optional, passable above and below |
| Keep Barracks `red-barracks-keep` | (1728,456) | 1,500 HP, owns the garrison slots (1776,552), (1728,360) |
| Ramparts | y 288-336 and y 816-864, x 1152-1392 | the north one walls the pocket from the strip; the south one walls the dead end |
| Deep Snow | x 1040-1392, y 0-480, **50%** | the pocket and the strip before its entrance |
| Bastions `red-bastion-north/south` | (1368,504), (1368,696) | see the gate's siege spots |
| Choke Towers `red-choke-east/west` | (1320,264), (1224,264) | flush on the north rampart's north face; see the plug's siege spots |
| Inner towers `red-inner-north/south` | (1464,456), (1464,744) | see the breach once the gate falls |

Match: start 0/0/0; waves from tick 300 every 750, sizes 6,6,6,6,7,7,8,8 alternating the outpost's and the plug's slots, 1 Azure ally per wave; garrison counts 4 and 5 every 750 ticks, first 90 ticks after the trigger; Azure Barracks as Mission 4; defeat only at 0 Azure Keep HP.

## Verified (focused tests, real engine)

- With everything standing the wall is sealed for 12 px and 20 px units; gate down opens the direct road; plug down opens the snow pass; a Guardian walks past the standing outpost Barracks; the south pocket is closed to the east.
- Line of sight: gate siege spots seen by exactly the two bastions; plug siege spots by exactly the two Choke Towers; inner towers see the breach and cannot see over the wall.
- Deep Snow: the Guardian walks exactly half the distance in the zone and full speed outside it (leaving at y 480); Crimson and Azure wave units step at about half the full per-tick distance inside; a 30% skill slow plus the snow gives 50%, not 65%.
- Garrison: either trigger starts it (4 at about +166 ticks, then 5 on its own 750-tick clock); the second trigger neither restarts nor resets it; the outpost Barracks releases nothing; the Keep Barracks' death ends it. Single-string triggers still work; empty, duplicate, unknown and non-opening triggers are rejected.
- Navigation (probe, current engine): Azure wave allies plan to breach the cheaper of gate and plug by HP; with the plug at 3,000 HP the pass is still chosen. Soldiers keep their 400 px leash.

## Bot diagnostics (real Level 25, real Deep Snow, shared recall-and-rebuild bot; one deterministic run each)

| Plan | Time | Guardian deaths | Azure Keep lowest | Garrison first spawn / units | Outpost fell |
|---|---|---|---|---|---|
| Direct gate (bastions first) | 279 s | 2 | 3,000 | 208 s / 13 | no |
| Direct gate + Keep Barracks | 278 s | 2 | 3,000 | 208 s / 4 (cut after the first wave) | no |
| Snow: plug only | 276 s | 3 | 3,000 | 202 s / 18 | no |
| Snow: Choke Towers, then plug | 243 s | 2 | 3,000 | 183 s / 13 | no |
| Snow: outpost, then plug | 265 s | 3 | 3,000 | 208 s / 13 | 144 s |
| Snow: outpost, plug, Keep Barracks | 314 s | 4 | 3,000 | 208 s / 4 | 144 s |

Azure soldiers fought on every plan (2,500-3,550 damage, 6-16 kills) and, unlike Mission 4, spent 40-139 soldier-seconds inside the snow. Guardian damage taken: direct about 1,940-2,110 from towers and 2,080-2,210 from troops; snow plans about 2,000-3,600 from towers and 1,760-2,950 from troops.

Compared with the probe (Barracks B 2,000 HP, mud 35%): the snow road no longer beats the gate by 65-80 s; the roads finish within about 35 s of each other, and the outpost route is the slowest and deadliest. Nothing was tuned to equalise these times, and a single bot run varies by tens of seconds with small parameter changes.

## Known risks

- Home is still too safe: the Azure Keep never dropped below 3,000 in any plan.
- Bot times swing with small changes; they show both roads work and cost differently, not a balance verdict.
- The Guardian spends 54-74 s in the snow (about a quarter of the match); whether 50% over so wide a zone feels fair is a playtest question.
- The lane between Barracks A and the `red-choke-west` tower is one cell wide (48 px); the lane above A is two cells. Both are passable for the Guardian (tested).
- Killing the Keep Barracks right after the first garrison wave cancels the rest of the garrison.
- Deep Snow is a translucent overlay with flecks; there is no minimap marker.
- `scripts/verify-chapters.mjs` still stops at the removed Quick Play button (already failing on `main`).

## Fixed during review

The south wall segment first had an infinite bottom edge, which hung the Battle scene painter; it now ends at the world edge (y 1152).

## Changes

- `src/world/battlefield.ts`: `SlowZone`, `zoneSlow`, validation, the `fallen-outposts` battlefield. `src/world/battlefieldArt.ts`: its art (frozen).
- `src/simulation/Movement.ts`: Deep Snow in both movement paths. `src/simulation/Simulation.ts`: multi-id garrison trigger and its `checkGates`. `src/data/matchSetup.ts`: `after` as id or ids.
- `src/data/campaignLevels.ts`: `fallenOutpostsLevel` (campaign-25). `src/scenes/Battle.ts`, `src/scenes/HUD.ts`: snow overlay and trigger message.
- `tests/campaign-level-25.cjs` (14 tests). Count-only updates for Mission 5 in `barracks`, `battlefield-art`, `campaign-level-21/23/24`, `campaign-progress`, `chapter-view`, `debug-launch`, `frost-gate`, `six-missions`.

## Verification

- `npx tsc --noEmit` clean; `npm run build` green (existing chunk-size warning only).
- `npm test`: 1,021 / 1,021 (the Mission 4 branch was 1,006; +15 in `tests/campaign-level-25.cjs`).
