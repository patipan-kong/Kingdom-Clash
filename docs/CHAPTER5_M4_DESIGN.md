# Chapter 5 M4: The Broken Alliance — design proposal (not implemented)

PO decision: approved with one adjustment (Raider removed; Iron Marshal 180 s, Shadowblade 240 s and the rest as below); War Cart amendment handled in `CHAPTER5_M4.md`. Status: proposal for PO review, on top of local commit `99f319f` (M3, locked). Nothing here is implemented, pushed, merged or deployed. All numbers are starting values for the Galaxy S24 playtest. Bot results are evidence only.

Target difficulty: about 8/10 (M2 4-5, M3 7). The increase comes from *more simultaneous pressure*, not from bigger waves.

## 0. Idea in one paragraph

The Divided Road asked "which camp first?". The Broken Alliance asks "what do I leave behind?". It reuses the Chapter 4 M6 *Crimson Fortress* geometry (two roads round a ridge, two outposts, one Fortress Gate) and combines three systems that already exist: M3's Warden + Raider, M3's Tavern (Hero Cap 2) and Barracks (cap 2), and M6's two Commanders. Every threat is announced before it starts. The player has the Guardian, two hired heroes and two Barracks to cover two roads, two captured outposts and the Keep, and cannot cover all of them.

## 1. Objectives, victory, defeat

- Phase 1 "Break the Outposts": capture the North Outpost and the South Outpost (both `post:` objectives, as M3).
- Phase 2 "Break the Fortress": destroy the Crimson Keep (`red-base`). The Keep is shielded while either outpost is not Azure (M3 rule); the Fortress Gate must also fall to reach it (M6 rule).
- Victory: Crimson Keep destroyed. Defeat: Azure Keep destroyed (no new rule; Guardian death respawns as today).
- Nothing mandatory is scripted: Tavern and Barracks are choices, as M3.

## 2. Map: recommended variant

New data-only variant `broken-alliance` = `...crimsonFortress` with its own tower ids (`c5-…`), registered in the art registry as an alias of `crimsonFortress` (the same pattern as `divided-road`). No new barriers, assets or art.

- Why Crimson Fortress and not Canyon Basin again: the roads already have Commander spawns and flank waypoints (`flankVia`), the gate adds a third objective, and a new map feel avoids "M3 plus a little". Canyon Basin stays M3's.
- Geometry reused as is: ridge (x 768-1248, y 432-768), Siege Road north (y 144-432) past the North Outpost (circle 1080,288 r132, flag 1080,264), Shadow Trail south (y 768-1008) past the South Outpost (circle 1008,888 r132, flag 1032,888), sally ground, Fortress wall (x 1392-1440) with one gate at (1416,600), courtyard beyond.
- Open question for implementation: does the existing `posts` + `commanders` + `tavern` + Raider (`hero`) combination validate unchanged? M3 already validates `posts` + Tavern + Raider and M6 validates `posts` + commanders, so I expect yes; the first implementation step is a one-line validation check, and if it fails I stop and report rather than touch matchSetup.

## 3. Enemies, waves, counterattacks

| Threat | Config (existing fields) | Behaviour |
|---|---|---|
| Waves | `[7,7,8,8,9,9,10,10]`, first 30 s, every 30 s, slots (1776,480)/(1776,720), no flank | Slightly smaller early than M3 because three roamers share the unit budget; peaks at M3's 10 |
| Warden | South Outpost, as M3 (anchor/guard/respawn 1350 ticks) | Defends the south camp; the hard camp |
| Raider | `setup.hero`, release 120 s (M3: 90), respawn 50 s | Targets a captured Banner first, then Azure towers, then the Keep: this is the "defend what you took" pressure |
| Iron Marshal | M6 Commander, north lane, first 180 s, warning 6 s, rest 60 s, escort 3 | Tears down Azure towers then Barracks along the Siege Road; slow, tanky |
| Shadowblade | M6 Commander, first 240 s, warning 6 s, rest 40 s, keepBonus .5 | Strikes the Barracks farthest from the Guardian, else the Keep; fast |
| Outpost Elites | 2 per camp on first capture, from the wave slots (M3) | Hit the fresh Banner |
| Fortress Gate | 2500 HP faction gate, Last Stand garrison of 4 Elites when it falls (M6) | Costs the final assault something; no new rule |

Counterattack behaviour is only what these systems already do; there is no new AI. Honest limit: nothing retakes a captured camp by a "recapture" rule; pressure on territory is the Raider's Banner attack and the Elites, as in M2 and M3.

Timing intent: waves from 30 s, Raider 120 s, Marshal 180 s, Shadowblade 240 s. Staggered, so there is never an unannounced third threat, and a player who has not taken both outposts by about 4 minutes starts to be overrun.

## 4. Start, buildings, limits

- Start: 100 Gold, 220 Wood, 30 Iron (a Tavern and a Barracks affordable at 0 s, as M3); no prebuilt Barracks.
- Hero Cap 2 (Roland, Borin, Kael at 150/180/200 Gold; Revive as today). Barracks cap 2, 2 footmen each, escorting the Guardian (existing behaviour).
- Pads: the three home pads plus one pad in each outpost circle that opens when that outpost is Azure (the M3 rule). The positions are chosen by a test, not by eye (lesson from M3): inside the circle, at least 96 px from every tower, off the flag, ruin and Warden, route-walkable, and on screen above the placement panel at 780x360 DPR 3 after the allowed map drag.
- Income and costs unchanged.

## 5. Tactical decisions and expected difficulty

1. Which outpost first. North is the Raider/Marshal road; south has the Warden. Taking south first costs a longer fight; taking north first leaves the Warden to wait.
2. Where the heroes stand. One Defend hero in a ring captures it (M2/M3 rule) while the Guardian clears the other camp, but then the Marshal arrives to a thin line. Follow/Attack/Defend each have a job: Follow for the south fight, Attack against the Raider/Shadowblade, Defend to hold a Banner or a Barracks.
3. Barracks placement. Home Barracks are safe but the Shadowblade targets the farthest one, so a forward Barracks becomes bait that costs 120 Wood and 20 Iron; the Guardian can answer the announcement or let it fall. Footmen near a pad are pulled to nearby Crimson towers (M3 observation), so a forward Barracks needs the Guardian.
4. Keep defence versus advance, because the Marshal, Shadowblade and Raider can all reach the Azure Keep. Towers at home slow the Marshal.
5. Two heroes plus two Barracks does not all fit the early economy; Gold comes from kills, so the second hero is mid-game.

Both a concentrated push (one road then the other) and a split (Guardian south, heroes north) should be viable; a Keep-guard line should win slowly. There is no instant-loss trap: every Commander is announced 6 s ahead and rests between attacks, and the first roamer arrives at 120 s.

## 6. Bot verification plan

Reuse `tests/support/dividedBot.cjs` as a base (`brokenBot.cjs`), M3's plans plus Commander handling: none, no-barracks, concentrate-north, concentrate-south, split, split-keep, and a Keep-guard plan. For each, at least 5 seeds/timings, normal and no-recall, reporting outcome, time, captures, hero falls, Barracks lost, Keep minimum HP, stalls, peak live units.

Evidence expected (not gates): the `none` plan loses most runs; hero plans win in roughly 5-8 min with the Keep dipping low at least once; no plan trivialises (win under 4 min); peak live units at or under 40; pathing stalls at most 4; the first Raider/Commander damage lands within the designed windows. Unit tests: identity and approved values, pad geometry and route, per-camp Elites, Raider/Commander timing unopposed, shield, registry (`broken-alliance` walls and outposts equal crimson-fortress), `matchSetup` unchanged, and the full suite for M1-M3 and Chapters 1-4.

Mobile acceptance (780x360 CSS at DPR 3, real touch): both outposts and both new pads visible and tappable with no panel overlap; real-tap Tavern hire, Barracks placement and Follow/Attack/Defend; Guardian reaches each pad; footmen spawn and follow; each Commander warning readable and not covered by the HUD; unit peak at or under 40; no frame-time regression against M3 under SwiftShader; M1, M2, M3 and Crimson Fortress browser checks still pass. Then Galaxy S24 playtest decides the balance.

## 7. Risks and knobs (not applied)

- Risk: three roamers plus waves may exceed 8/10. First knobs: Marshal 210 s, Raider 150 s, waves minus 1.
- Risk: validation of `posts` + `commanders` + Tavern + Raider (section 2).
- Risk: Shadowblade bait makes the forward Barracks a trap; the 6 s warning is the mitigation.
- Alternative if the PO wants it simpler: drop the Raider and keep M6's two Commanders only (difficulty about 7.5, fewer moving parts).

## 8. Scope

Level config, one battlefield alias, tests, bot, verify script and a report. No change to Simulation, Movement, AI, matchSetup, buildings, unit types, M1-M3 or Chapters 1-4.
