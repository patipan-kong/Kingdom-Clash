# Chapter 5 M5: The Last Stronghold — design proposal and War Cart feasibility (not implemented)

Status: design + feasibility for PO review, on top of `eeda8e9` (M1-M3 locked, M4 local WIP awaiting the Galaxy S24 playtest). Nothing here is implemented, committed, pushed, merged or deployed. All numbers are starting hypotheses; bot results will be evidence only and the human S24 playtest decides balance. No change is proposed to M1-M4 or Chapters 1-4.

Target: difficulty 9/10 (M3 about 7, M4 about 8 pending S24), clear time 8-11 min, 4-7 Guardian deaths.

## 1. Mission overview

The Broken Alliance asked "what do I leave behind?". The Last Stronghold asks "which siege asset do I pay for first, and can I afford to use it?". Two outposts each unlock one siege asset, the Fortress Gate is the shared objective of both, and the Commanders arrive on a visible clock. Difficulty comes from resource allocation and timing, not from enemy HP.

- Win: destroy the Crimson Keep (`red-base`). Lose: the Azure Keep falls.
- Mandatory: capture the North Outpost and the South Outpost (`post:` objectives, as M3/M4), then destroy the Keep. Repairing the Ballista or the War Cart is never an objective.
- The Keep stays shielded while either outpost is not Azure (M3/M4 rule) and the Fortress Gate must fall to reach it (M6 rule).

## 2. Map and encounter flow

**Terrain: reuse Crimson Fortress.** New data-only variant `last-stronghold` (`...crimsonFortress`, own `c5-` tower ids, art registry alias), the same pattern as `broken-alliance`. The terrain already is the three fronts the brief asks for, so no new art, barriers or pathing:

| Front | Place | Content |
|---|---|---|
| North (Ballista) | Siege Road y 144-432; North Outpost circle (1080,288) r132, flag (1080,264) | 2 watchtowers (1176,216/360), Banner, **Ballista ruin** inside the circle's east side |
| South (War Cart) | Shadow Trail y 768-1008; South Outpost circle (1008,888) r132, flag (1032,888) | 2 watchtowers (1128,840/936), Banner, South Warden (as M3/M4), **War Cart wreck** inside the circle's west side |
| Center | Sally ground x 1248-1392 below the Crimson Ridge (x 768-1248, y 432-768) | Fortress Gate (1416,600) 2500 HP; behind the wall two towers (1464,504/696); **proposed: two forward towers on the sally ground** (about (1320,456) and (1320,744)); Last Stand garrison when the gate falls |
| Stronghold | Courtyard beyond the wall | Crimson Keep, shielded until both outposts are Azure |

Both roads converge on the Center, so the Center is where the plan is tested. A direct rush meets four towers plus the wave plus the Last Stand; a prepared assault removes forward towers first.

**Flow (hypothesis, not a script):**
0-2 min: spend the opening (Section 5), hire or train, clear the first outpost's towers. 2-4 min: first Banner, first siege asset repaired. 3.5 min: Iron Marshal. 4-6 min: second outpost. 5 min: Shadowblade. 6-10 min: forward towers, gate, Last Stand, Keep.

## 3. Siege assets

**Ballista (North), data only.** Existing M2 mechanic: `post.ballista:{col,row}` inside the North circle, repaired at the camp's repair percent while the North Outpost is Azure (`repairCamp` already requires this), 520 HP, 70 damage every 3 s at 420 px, a tower-kind structure. Intended behaviour: sits at the circle's east edge, about 350-390 px from the Fortress Gate and the near gate tower, so it outranges Crimson towers (240) and reaches the gate and the forward north tower. It shields the North Outpost against waves and is a bait for the Iron Marshal, who goes for Azure towers. The cell is chosen by a test (circle membership, at least 96 px from every tower, off the flag and ruin, route-walkable, range to the gate, visible above the Build panel at 780x360), not by eye.

**War Cart (South), needs a small Simulation extension (Section 6).** Existing Chapter 4 cart: one Azure cart (900 HP, armor 10, speed 55, 90 damage every 2 s against structures (about 45 dps), range 48), ordered at the Fortress Gate then the Keep, walking only while the Guardian is within `follow` px (300). Repair costs 160 Wood + 40 Iron and takes 150 ticks. Intended behaviour: the wreck lies inside the South Outpost circle; once the outpost is Azure the Guardian stands in the ring and pays. The cart is a real assault asset: M4 experiments with a cart beside the gate took the gate down in about 55 s, with the Last Stand still firing and the Keep still shielded. The cost is exposure: it must be escorted through the Shadow Trail and the sally ground, where the forward south tower and the wave hit it.

Two assets, two roles: the Ballista is range and patience from the north, the cart is a gate-break (about 55 s for the gate) that must be protected. North-first buys the Ballista early (cheaper, 140W/30I at the camp percent, tune 60% -> about 84W/18I) and safe tower clearing; South-first buys the cart early (dearer, iron-bound) and a quick gate. A no-siege run (Guardian, two heroes, two Barracks) stays possible but must grind four towers and a 2500 HP gate under waves.

## 4. Enemies and difficulty model

All existing systems, no new enemy type, class or AI.

| Threat | Config (existing fields) | Starting value |
|---|---|---|
| Waves | `enemyPerWave`, slots (1776,480)/(1776,720) | first 30 s, every 30 s, M4's series [7,7,8,8,9,9,10,10] extended so the pressure does not stop at 4 min (list length behaviour to confirm) |
| South Warden | `post.hero` as M3/M4 | south camp is the hard camp |
| Outpost Elites | `counter` 2 per outpost on first capture | as M4 |
| Iron Marshal | Commander, north lane, warning 6 s | first 210 s, rest 60 s, escort 3 (M4: 180 s) |
| Shadowblade | Commander, warning 6 s | first 300 s, rest 40 s (M4: 240 s) |
| Fortress Gate | `faction`, 2500 HP | Last Stand garrison: M4's 4 Elites, candidate 6 |
| Center towers | battlefield data | M4's two behind the wall plus two forward |

Why 9/10: M4 already asks two fronts at once; M5 adds a third objective (the Center), a resource choice between two assets that cost the same scarce iron, later but denser Commanders, and a harder Center. No new rule is needed.

Commander overlap: the Marshal is released at 210 s and the Shadowblade at 300 s. Nothing in the data stops the Shadowblade from arriving while the Marshal is still alive. That is avoidable (kill the Marshal first, as in M4) but I will measure how often a normal line leaves it alive at 300 s; if usually, the Shadowblade moves to about 330 s rather than adding any rule. Every Commander keeps its 6 s warning, so nothing is untelegraphed.

## 5. Economy (starting 100 Gold / 180 Wood / 25 Iron)

Costs: Tavern 100W+10I, Barracks 120W+20I, tower 80W+10I, Ballista repair 140W+30I x camp percent, **War Cart repair 160W+40I (fixed)**. Hero 150/180/200 Gold, Hero Cap 2, Barracks Cap 2.

- At 180W/25I the opening is a choice: a Barracks (120W+20I) or a Tavern (100W+10I), not both (M4's 220/30 afforded both). Iron is the limiter: 25 iron cannot pay a Barracks (20) and a cart (40), so the cart cannot be repaired before iron has been earned. In M4 experiments the iron for a 40-iron repair took about 160 s of play; here I expect the Ballista at about 2-3 min and the cart not before about 3.5-4 min.
- Both assets plus two Barracks plus the Tavern need about 108 iron in total, far more than the opening, so a player always chooses an order. The numbers will be checked by bots (resources over time, first-repair times) before any human run.
- Kills give Gold and income continues as in M3/M4; unchanged.

## 6. War Cart feasibility verdict

**Verdict: feasible with a small, isolated Simulation extension (about 6 lines in two functions plus data validation). It reuses the existing repair job, ownership gate, movement, combat and rendering code unchanged. It cannot be done with data alone.**

What I inspected (Chapter 4 M4 code):
- `Simulation.leaveWreck` creates `state.cartWreck` only when a **Crimson** cart dies; `updateFortress` spawns that Crimson cart at `startTick`.
- Repair (`payJob`, `w.repair`, `finishCartRepair`) is generic: it needs only `state.cartWreck` and `setup.cart`. It does not care how the wreck got there.
- Azure cart behaviour (`Movement.ts` order list and `follow` 300 px rule, `Combat` structure-only damage, `war-cart` stats and art, the wreck ring and price label in `Battle.ts`) all work once a wreck exists.
- The Ballista path already gates repair on camp ownership; the cart path does not (the wreck can be repaired by anyone standing in the ring who can pay).

Gaps and the minimum change set:

| # | Change | File | Size |
|---|---|---|---|
| 1 | `MatchCart` gains optional `wreckAtStart?:true` and `post?:string` (id of a post); validated (a `post` must exist; `wreckAtStart` needs a site) and copied | `src/data/matchSetup.ts` (interface ~line 54, validation ~194, copy ~210) | ~3 lines |
| 2 | `initFortress`: if `wreckAtStart`, set `state.cartWreck` to `sites[0]` (same open-ground check as today) | `src/simulation/Simulation.ts` | ~2 lines |
| 3 | `updateFortress`: do not queue the Crimson cart when `wreckAtStart`; start the repair job only when `!ct.post` or that post's owner is `azure` (the `repairCamp` idea) | `src/simulation/Simulation.ts` | ~2 lines |
| 4 | Wreck ring label says "CAPTURE THE SOUTH OUTPOST FIRST" while gated (UI copy only) | `src/scenes/Battle.ts` ~line 517 | 1 line |
| 5 | Capture notice: `HUD` currently says "Repair the Ballista" on the first capture of any camp when a Ballista exists; make it per camp and add the cart line (copy only) | `src/scenes/HUD.ts` ~line 259 | few lines |

Not touched: `Movement.ts`, `Combat.ts`, `Navigation`, `GameState.ts` (`CartWreck` already exists), economy, achievements, campaign progression. A repaired Azure cart that dies leaves no new wreck (existing rule), so the cart is single-use: one 160W+40I repair per run (see Open decision 2).

Impact on Chapter 4 and progression: both new fields are optional and absent in campaign-34, so its behaviour is identical; no match state is saved between sessions, progression stores only mission completion, and `warCartRepaired` earns an achievement only for `campaign-34` (`levelId` filter), so M5 neither earns nor changes one. **Focused regression plan:** the existing campaign-34 cart tests unchanged; new tests for (a) wreck present at tick 0 and no Crimson cart, (b) repair refused until the post is Azure then accepted, (c) the cart is a normal Azure cart afterwards (order, follow, structure-only), (d) `matchSetup` rejects bad `post`/missing site, (e) campaign-34 and 36 snapshots equal before/after; then the full suite (1314 today) and the Chapter 4 M4 browser check.

**Needs PO approval before any coding** (core Simulation file).

## 7. Tactics and counterplay

- North-first: Ballista early, safe tower clearing, but the Marshal comes down the north lane to a Ballista that is also his bait; the South Warden waits.
- South-first: harder first fight (Warden), cart late-ish, quick gate; the Shadowblade punishes a thin home line.
- Split: Guardian south with the cart, one hero holding the north Banner, a Defend hero in the ring; costs coverage at home.
- Escort rule: the cart moves only within 300 px of the Guardian, so using it means leading it; a cart left behind is safe but idle.
- Last Stand: breaking the gate fast with the cart is possible but the garrison appears sooner, so the Center must be answered, not rushed.
- No-siege: theoretically possible, slower and costlier.

## 8. Risks

- **Pathing (high):** the cart is the first Azure cart on this terrain; it must route from the South circle through the Shadow Trail to the gate. Mitigation: wreck cell and route chosen by test; `initFortress` already rejects blocked sites.
- **Ballista line of fire (medium):** assumed to reach the gate and forward north tower over the ridge corner; to be measured in a unit test before the cell is fixed.
- **Siege asset usability on a phone (medium):** the Build panel may show up to five cards (Wall, Tower, Barracks, Ballista, Tavern) at 780x360; M4's South pad had 40 px of room above the panel. Wreck ring, ring label and both new cells need real-touch checks at 780x360 DPR 3.
- **Economy (medium):** 25 iron may starve the opening; the first bot sweep will measure first-repair times before the S24 run.
- **Overload (medium):** three fronts, two Commanders, two heroes and two Barracks may exceed 9/10; first knobs are Marshal 240 s, Shadowblade 330 s, waves minus 1, Last Stand 4.
- **Baseline:** M4 is not yet S24-approved. M5 would be built on the local M4 commit and its own level file, so an M4 retune would not rewrite M5, only change its reference.
- **Shared files:** items 4-5 touch `HUD.ts` and `Battle.ts`, which other agents are also editing for Chapter 5 UI. They would be small, isolated hunks, to be coordinated.

## 9. Open decisions requiring PO approval

1. Approve the small Simulation extension for a start-as-wreck, outpost-gated War Cart (Section 6, items 1-3). Required for Option A.
2. War Cart single-use (recommended: no second repair, as Chapter 4) or replaceable if destroyed.
3. Center: add two forward towers on the sally ground (data only, recommended) and Last Stand 4 or 6 Elites.
4. Terrain: reuse Crimson Fortress as the `last-stronghold` variant (recommended) or commission new terrain.
5. Shadowblade 300 s as given, or hold the decision until overlap is measured (recommended).
6. Approve the two small UI copy changes (items 4-5), coordinated with the other Chapter 5 UI agent.
7. Starting 100/180/25 as given for the first bot run; the iron figure is the main risk.

Scope on approval: one level definition, one battlefield alias, the isolated extension above, tests, a bot adaptation, a browser verify script and a report. No new enemy, class, currency, building or system.
