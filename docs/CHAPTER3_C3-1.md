# Chapter 3 C3-1: The Frost Citadel (Level 21)

Vertical slice: the Frost Citadel battlefield (a walled Crimson fortress with a Frost Gate and two bastions) and Level 21. Baseline `main` at `ed67790`; branch `chapter3/c3-1-sealed-pass`. Not committed, merged, pushed or deployed. Every balance value is provisional and the bot results are preliminary evidence, not a human playtest.

This replaces the first C3-1 design (a Frost Gate plugging one of Canyon's two lanes on a "Frozen Pass"). That design was superseded: on Canyon's geometry the gate could not create a route choice (see the Opus review), and the intended mechanic is a fortress siege.

## What was built

- **Frost Citadel** (`world/battlefield.ts`): Canyon Pass's cliffs, spire, territory, opening Vanguards and routes exactly on the Azure side, plus a fortress around the Crimson Keep at (1610, 600).
  - Four wall barriers: west wall north `x 1392-1440, y 336-552`, west wall south `x 1392-1440, y 648-864`, north wall `x 1440-1920, y 336-384`, south wall `x 1440-1920, y 816-864`. The east side is the world edge. The courtyard is `x 1440-1920, y 384-816`.
  - One gate site `red-gate` at (1416, 600), 1 x 2 cells: it fills the 96 px opening in the west wall exactly (`y 552-648`).
  - Two bastion positions, `red-bastion-north` (1368, 456) and `red-bastion-south` (1368, 744), 1 x 1 cell towers flush against the west wall's outer face (`x 1344-1392`).
  - Scenery that touches a wall or stands in the courtyard is dropped: rocks (1440, 365) and (1490, 835), bushes (1580, 410) and (1700, 810).
- **Frost Gate** (`Simulation.gate`, unchanged from the first design): a pre-completed red `wall` with the level's hit points and the site's footprint. It reuses the wall rules wholesale: it never attacks, blocks movement and line of sight while it lives, is removed like any structure, and rewards nothing (`enemyXp.wall` is 0 and only red minions pay Gold). No new pathfinding, collision, combat or save code.
- **Bastions**: ordinary Crimson defender towers (650 HP, the existing tower attack), named by the level's `defenders` list next to `extendedRules.towers`, which no battlefield changes.
- **Level-specific spawn slots**: `waves.redSlots` replaces the Crimson spawn points for one level (copied and validated). `extendedRules.redSlots` and `extendedRules.towers` are untouched, so Full Battle and every golden run are byte-identical.
- **Visuals**: the canyon painter draws the walls (`Barrier.look === 'wall'`: ice-stone blocks, one per grid cell along the wall, each depth-sorted at its own front edge like the spire), over snow. The gate keeps its ice-blue recolour and "FROST GATE" label; a HUD notice says "The Frost Gate has fallen · the fortress is open".
- **Level 21** (`data/campaignLevels.ts`), registered as `campaign-21`, chapter 3.

### Engine changes (all small, all absent from Chapters 1-2)

| File | Change |
|---|---|
| `world/battlefield.ts` | `Barrier.look`, `BattlefieldTower`, `Battlefield.towers`, validation (a tower may touch but not overlap a barrier), `frostCitadel`; the first design's `frozenPass` is removed |
| `data/matchSetup.ts` | `defenders` may name the battlefield's towers; `waves.redSlots` override, validated and copied; the gate's distance-to-spawn-slot rule is unchanged |
| `simulation/Simulation.ts` | `checkGates` (runs only when a match has gates) also rejects a spawn slot that is blocked for a minion |
| `scenes/Battle.ts` | `fortressWall` painter branch |
| `scenes/HUD.ts` | the gate-fall text |
| `world/battlefieldArt.ts` | registry key `frost-citadel` |
| `data/campaignLevels.ts` | Level 21 |

## Level 21: The Frost Citadel

| | |
|---|---|
| Map | Frost Citadel; six bastions, a 3,000 HP gate and a garrison (balance v3, below); the Crimson Keep is armed (`crimsonKeepArmed: true`, the existing Keep defense, balance v2) and **not** protected: it is the objective |
| Waves | first at tick 300, every 900 ticks, `[3,3,4,4,5,5,6]` then 6 repeating, no Raiders, one allied minion per wave, no lanes or flanks |
| Spawn slots | balance v2: (1224, 552), (1296, 264), (1224, 648), (1296, 936) in that round-robin order, so about half of each wave musters in front of the gate (198 px from it) and the rest spawn north and south of the fortress (357 px) |
| Crimson structures | the Frost Gate (3,000 HP since balance v3; 1,500 before) and six bastions (650 HP each); the Keep (3,000 HP, no regeneration) |
| Start, Shop | default (250 Gold, 180 Wood, 30 Iron), Shop open |
| Phase 1 `hold` | build 2 Archer Towers, defeat 4 Crimson waves |
| Phase 2 `storm` | destroy the Crimson Keep |
| Defeat | Azure Keep below 50% |

The gate is never an objective. It is simply in the way: nothing outside can see or touch the Keep until it falls.

### How the siege plays (from source, then measured)

- **The Guardian's siege spot is under fire.** The wall stops the Guardian at x <= 1372; its 90 px reach to the gate's centre puts the siege spot at x 1326-1372, about 145 px from each bastion (range 240, clear line of sight). Both bastions fire on it; the wall hides the courtyard from them.
- **Each bastion falls on its own.** From (1293, 456) the Guardian reaches the north bastion and not the south one (298 px); mirrored for the south. Bastions-first costs about 20 s more and the Guardian takes about 400 damage in total.
- **A level-1 rush dies.** Both bastions deal about 41 damage per second to the Guardian; breaking 1,500 HP takes 24 s at level 1 (about 990 damage against 980 HP).
- **Allies breach the gate.** With the Keep in sight and no route in, the existing planner prices the gate (1,500 HP / 18 damage x 1 s per hit = 83 s) against no route, and breaches. Until the bastions fall, allied minions go for the nearer bastion first.

### Gate hit points: 1,500 (unchanged)

From source: the Guardian deals `(80 + 3 x (level-1)) x 0.6` per hit to a structure, one hit per 23 ticks, against armor 0; Siege Hammer adds 20 attack and x1.25.

| Guardian | Damage / hit | 1,500 HP takes |
|---|---|---|
| level 1 | 48 | 24 s (measured 23.8 s) |
| level 5 | 55.2 | 20.8 s |
| level 5 + Siege Hammer | 84 | 13.7 s (computed; the bot never buys) |

One constant, `frostGateHp`, to tune after the playtest.

## Verification

All run in this worktree.

| Check | Result |
|---|---|
| `npx tsc --noEmit`, `npm run build` | pass |
| `node scripts/test.mjs` | see the final report |
| New tests | `tests/frost-gate.cjs` (15 tests: layout, validation, seal and sight, bastion reach and independence, gate siege and no reward, Keep protection, allied breach and entry, spawns, isolation), `tests/campaign-level-21.cjs` (6 tests) |
| Spawns, no player (Azure Keep made durable, gate standing and open) | 0 spawn-deferral ticks over five waves; no Crimson unit ever in the courtyard; columns split between both canyon halves |

### Bot scenarios (shared bot: two Archer Towers, Shield Bash; nothing was tuned to improve them)

| Scenario | Result | Guardian deaths | Gate falls | Bastions fall | Keep falls | Bastion damage to the Guardian |
|---|---|---|---|---|---|---|
| Early raid at 5 s, gate then Keep | victory 112 s | 1 (29 s) | 43 s | never | 92 s | 1,095 |
| Early raid at 5 s, bastions first | victory 114 s | 0 | 42 s | N 12 s, S 23 s | 81 s | 302 |
| Early raid at 30 s, gate then Keep | victory 134 s | 1 (49 s) | 68 s | never | 114 s | 1,429 |
| Early raid at 60 s, gate then Keep | victory 143 s | 1 (79 s) | 98 s | never | 143 s | 1,263 |
| Gate rush after the hold phase | victory 195 s | 1 (139 s) | 155 s | never | 195 s | 1,144 |
| Bastions first after the hold phase | victory 196 s | 0 | 156 s | N 124 s, S 135 s | 196 s | 395 |

The table above is the first Frost Citadel build (inert Keep, two slots). See balance v2 below for the current numbers.

## Balance v2 (after the first human playtest)

Playtest: victory in 2:54 with one Guardian death. The siege felt new, but too easy: the Keep never fought back and Crimson units ignored the Guardian and marched on the Azure Keep.

**Why the Crimson units were passive.** Spawn geometry, not AI. An unprovoked Crimson minion only notices the Guardian within `gameplayV03.aggro.acquireRange` (160 px). From (1296, 264) and (1296, 936) the columns head south-west for the canyon's east mouth (x 1120, y 480-720), and their closest approach to the gate siege spot (x 1326-1372, y 600) is about 250 px. Line of sight is not the cause: the siege spot is open ground. Routing is not the cause either: the walls never put the routes near the gate. The north column does pass about 120 px from the north bastion's siege spot (1293, 456), which is why bastions-first already met some minions while the gate siege met almost none.

**Changes (Level 21 data only, `src/data/campaignLevels.ts`):**
- `crimsonKeepArmed: true`. The existing Keep defense is used unchanged: 17 damage (variant B), every 24 ticks, 140 px from its footprint edge, Guardian first. It cannot reach the gate siege spot (166 px from the footprint even with the gate gone), so it fires only once the Guardian is in the opening or the courtyard.
- `redSlots` becomes `[[1224,552],[1296,264],[1224,648],[1296,936]]`. Round-robin puts 2, 2, 2, 2, 3, 3, 3 units of waves 1-7 on the two front slots and the rest on the original outer slots.
  - The front slots are 113-156 px from the gate siege spot and about 118 px from each bastion siege spot, so they are inside the acquire range.
  - They are 48 px off the y 600 approach, so a Guardian or ally walking to the gate does not hold the spawn (26 px rule).
  - They are 198 px from the gate, which passes the existing 192 px rule.
- The strategy text says the Keep shoots back and that Crimson units muster at the gate.
- No change to AI, aggro range, gate, bastion or Keep values, waves, resources or the Guardian.

**Bot runs, before and after** (shared bot; damage is to the Guardian; "siege minion" counts Crimson minion damage taken east of x 1150):

| Scenario | Before: result, deaths | After: result, deaths | Keep damage after | Siege minion damage, before / after |
|---|---|---|---|---|
| Early raid 5 s, gate then Keep | 112 s, 1 | 113 s, 2 | 867 | 167 / 658 |
| Early raid 5 s, bastions first | 114 s, 0 | 113 s, 1 | 822 | 248 / 380 |
| Early raid 30 s, gate then Keep | 134 s, 1 | 130 s, 2 | 823 | 66 / 150 |
| Gate rush after hold | 195 s, 1 | 199 s, 1 | 675 | 117 / 256 |
| Bastions first after hold | 196 s, 0 | 211 s, 1 | 664 | 576 / 603 |

The Azure Keep was never damaged in any bot run before or after, and no spawn was deferred. With no player and no Azure towers the Azure Keep falls at 61 s, against 70 s before.

**Still open for the retest:**
- Early raids still win at about 113 s.
- With two towers built, the waves never touch the Azure Keep.
- The front-slot units that engage the Guardian are units that no longer push toward the Azure side.

## Balance v3 (second human playtest: still too easy)

Playtests: v1 2:54 with one death, v2 2:44 with one death. The fortress read well but the siege was thin. Approved targets: four outer and two inner bastions, a 3,000 HP gate, garrison minions that fight in the courtyard, the Keep stays armed. Level data unless noted.

**Bastions** (ordinary Crimson towers, existing stats; sites on `frostCitadel.towers`, named by the level's `defenders`):

| Id | Position | Covers |
|---|---|---|
| `red-forward-north` / `-south` | (1176, 312) / (1176, 888) | the canyon's east exits at y 520 and y 680; the centre line y 600 stays safe |
| `red-bastion-north` / `-south` (unchanged) | (1368, 456) / (1368, 744) | the gate siege spot, both together |
| `red-inner-north` / `-south` | (1464, 456) / (1464, 744) | flush inside the west wall: the doorway and the Keep's west and north (south) face; nothing outside the walls |

Every bastion can be killed alone, from a spot where no other bastion (and, before the kill, not the Keep) can shoot the Guardian: (1140,236), (1140,812), (1316,508), (1284,716), (1460,404), (1460,788). Rejected inner layouts: (1512, y) fires out through the broken gate, (1608, y) seals the corridors beside the Keep, diagonal pairs leave an uncovered pocket south of the doorway.

**Gate**: 3,000 HP (`frostGateHp`): 63 Guardian strikes, about 48 s at level 1 and 42 s at level 5, 28 s with a Siege Hammer. Collision, breach and routing are unchanged.

**Garrison waves** (the only new engine code):
- `MatchSetupOverrides.garrison = {after, slots, counts, delayTicks, intervalTicks}` (validated and copied by `matchSetup`; legal only with the named gate; `MatchSetup.garrison` is absent when unused).
- `Simulation`: when the gate named by `after` dies, a private schedule starts. `garrisonDue` pushes `counts[n mod counts.length]` ordinary Crimson minions onto the **existing spawn queue** (ids `red-g<n>-<i>`, `wave: 0`, staggered by the wave rules' `spawnStagger`, slots round-robin), then repeats every `intervalTicks` until the Crimson Keep falls. The red unit cap and the queue's deferral rules apply as for any Crimson unit.
- Level 21: `after: 'red-gate'`, slots (1800, 552) and (1800, 648), counts `[3, 4]`, first wave 90 ticks after the gate falls, then every 900 ticks.
- **Wave 0** keeps them out of the mission: `Mission.waveDefeats` only opens waves 1 and up, so a living or dead garrison never counts toward, or blocks, "defeat 4 waves". The gate may fall during the hold phase (an early raid) and nothing changes.
- `checkGates` also rejects a garrison slot that is blocked for a minion, reachable from the Azure Keep while the gate stands, or cut off from it once the gates are gone.
- The HUD gate notice appends "the garrison rallies" when the match has a garrison.

**Why the garrison fights.** The slots are 92 px from the Keep's east face and 384 px from the gate. Every Keep siege spot lies within the 160 px acquire range of the garrison's route to the doorway, and a minion that has acquired the Guardian keeps it. Measured with the Guardian held 25 s: 4 of 4 units engage at the doorway, the Keep's west face and its east face (first hit 0.9-4.8 s); at the north and south faces two of four march on.

**Unchanged:** outside waves, wave sizes and intervals, resources, the Keep's HP and defense, minion and Guardian stats, Chapters 1-2 (no other setup carries a garrison, a forward or inner bastion, or a gate).

**Bot runs** (shared bot: Shield Bash, towers rebuilt on the first free of ten cells; deterministic, the match label does not seed the crits, so one run is one result). These are evidence, not tuning targets; the bot walks into every crossfire and never buys the Siege Hammer.

| Scenario | 2 Azure towers | 4 Azure towers: time, Guardian deaths |
|---|---|---|
| Early raid 5 s, gate rush | defeat 217 s | win 253 s, 7 |
| Early raid 5 s, wall pair then gate | defeat 173 s | win 220 s, 5 |
| Early raid 30 s, wall pair then gate | defeat 221 s | win 240 s, 5 |
| Gate rush after the hold phase | defeat 265 s | win 309 s, 5 |
| Wall pair then gate after the hold phase | defeat 275 s | win 303 s, 4 |
| Full clear (all six) after the hold phase | defeat 329 s | win 345 s, 4 |

v2 for comparison: 2:44 and one death in the human playtest; 1.9-3.5 minutes with 1-2 deaths in the bot runs. With two towers the Azure Keep falls to the continuous waves (about 6 every 30 s) while the Guardian is away or dead; with four the Azure Keep is never touched. A bot with six towers once parked its Guardian against its own towers (a bot routing artefact, not a game stall).

**Open for the retest:** how many Azure towers a human builds; whether the 4-7 bot deaths are a bot artefact (it fights inside every crossfire) or the siege is too punishing; whether the garrison feels like a fight or a nuisance; whether the Keep chop is still boring after the inner bastions fall.

## Findings the playtest must judge

1. **Early raids still win, and win early.** The Keep is credited when the storm phase opens, so a raid that finishes the siege before wave 4 is defeated wins as soon as the waves do (112-114 s with the default start) and the Azure Keep is never touched. This is no longer a shortcut past the content (the bot had to break the gate and the Keep, and the level-1 gate rush costs the Guardian its life), but the hold phase does not constrain the player: towers and allies hold four waves alone. A 0/0/0 start was not copied. If the playtest finds the hold phase hollow, the smallest lever is an armed Keep (Level 22), not a resource cut.
2. **Rush and bastions-first take the same time after the hold phase (195 s and 196 s).** The rush dies once and respawns; bastions-first does not die. The difference is risk, not time. Whether a human prefers the rush is exactly what the playtest should show.
3. **Canyon's opening Vanguards chip the north bastion.** Three Azure Vanguards open at x 940-1100 and march on the north bastion at about 4 s; with no player the bastion is at about half health by 150 s (the south one is untouched). It is existing minion behaviour on Canyon's opening positions, which the brief said to keep. If it feels like a free half-bastion, relocate those three Vanguards on this battlefield.
4. **Seam, not a hole.** Where two blockers touch (the wall's end and the gate's footprint at y 552 and 648, like any two touching barriers), a ray exactly on the shared line slips between them; no unit position or real attack range produces that. The Keep-protection test probes 1 px off the grid-centre lines for that reason.
5. **Continue leaks the level.** `MainMenu` Continue follows registration, not chapter release: a save with Levels 1-20 cleared now offers Level 21 while Chapter Select says "coming soon". Asserted in `campaign-level-21.cjs`. This is why the branch must not be merged or deployed alone; no release switch was added.
6. **Red bastions read as "Archer Tower"** in the inspector; only the gate has its own name.

## Human playtest

```
cd G:\work\ark\arkhero-chapter3-c31
npm run dev            # http://127.0.0.1:5173/ ; for a phone: npx vite --host 0.0.0.0
```
Level 21 is locked until Levels 1-20 are saved. In the browser console on that origin (this touches only that dev origin's storage, never production):
```
localStorage.setItem('kingdom-clash.campaign.v1',JSON.stringify({version:1,levels:Object.fromEntries(Array.from({length:20},(_,i)=>['campaign-'+String(i+1).padStart(2,'0'),{clears:1}]))}));location.reload()
```
Then CONTINUE CAMPAIGN, read the briefing, START BATTLE. The fortress is at the east edge: the camera follows the Guardian, or tap the minimap. To siege the gate stand about 75 px west of it, near (1341, 600); to siege a bastion stand 75 px west of it, near (1293, 456) or (1293, 744). Select the target, then attack.

Observe, in this order, without coaching first:
- Do you understand the fortress at a glance: walls, gate, bastions, Keep? Do you realise the Keep cannot be hit until the gate falls?
- What do you attack first, and why? Do you notice the bastions shooting you at the gate?
- Rush or bastions first? How did it feel when the Guardian died at the gate?
- Did you leave before the hold phase ended? Did the hold phase feel like something you had to do?
- Do your allies attack the bastions or the gate? Do the Crimson columns ever feel stuck or silly?
- Is the snow and the wall readable on a phone in landscape?

Distinguish: a **layout** problem (cannot find or reach the gate, walls unclear), a **gate-balance** problem (1,500 HP too long or too short, bastion fire too strong or weak) and a **player-understanding** problem (never tries the gate, or does not know the Keep is protected).
