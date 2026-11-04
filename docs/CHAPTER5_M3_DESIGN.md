# Chapter 5 M3 "The Divided Road": design, revision 2 (Azure Barracks and larger armies; for PO review, not implemented)

Status: design only. Nothing in `src/` or `tests/` was changed for M3. Branch `scratch/c5-allied-hero`, on top of the M2 commit `951341c`. Chapter 5 stays Coming Soon. Target human difficulty **7/10** (M1 2, M2 4-5). This revision supersedes revision 1 (no Barracks, 6-8 unit waves). Every number is a starting value for the bot sweep and the S24 playtest, not a balance sign-off. The bot is not a human.

## 0. Summary of the revision

Kept: the `divided-road` two-route map, the Warden at the Basin Camp, the Raider from the north (release 90 s, respawn 50 s), Hero Cap 2, the two-camp capture objective and the Crimson Keep shield.

Changed (PO): **Azure Barracks, maximum 2**; waves of **8-10** every **30 s**; a start economy that affords the first Barracks early.

Still **no code change**: the probes in section 9 show that campaign-35's `azure` block (pads, `limit`), the Tavern, a Raider and two camps already validate and run together. M3 remains a new level, a battlefield variant, tests, a bot and a browser check.

One finding changes how the Barracks should be read (section 3): **Azure Barracks soldiers are tethered to the Guardian, not to the Barracks.** They are a replaceable escort that fights where the Guardian fights, not a garrison that holds a road alone. The design is built around that, and asks the PO to confirm the reading.

## 1. Map and two-route layout (unchanged from revision 1)

New battlefield id `divided-road`: a **data variant of `canyon-basin`** (1920 x 1152, grid 48). It copies barriers, mesa, outposts, territory and art; only tower ids change (`c5-rim-*`, `c5-basin-*`, `c5-yard-*`). Chapter 4's map and campaign-35 stay untouched.

```
x:   0        768  912                1344            1920
y 0  +---------+=====================================+
     |         |  NORTH WALL (cliff)                 |
y192 |         +-----+----------------------+--------+
     |  Azure  |   NORTH ROAD   RIM CAMP [T][T] [P]  |  <- slot (1776,480); Raider spawn (1512,312)
y432 |  plain  |     +----------------------+        |
     |  Keep   |     |        MESA          | Crimson|
     |  (330)  |     |                      | Keep   |
y768 |  Tavern |     +----------------------+ (1610) |
     |  [P]x3  |  SOUTH ROAD  BASIN CAMP [T][T] [P]  |  <- slot (1776,720); Warden in the bowl
y960 |         +----+   bowl  +---------------------+
y1056|              +=========+   SOUTH WALL         |
```
`[T]` Crimson watchtower, `[P]` Azure Barracks pad, `[Y]` courtyard tower.

| Piece | Value |
|---|---|
| North Road | y 192-432. **Rim Camp**: flag (1176,312), ring 96, circle (1200,312) r 120, holders (1272,264) and (1272,360), ruin col 26 row 5. The forward camp, no Warden. |
| South Road | y 768-960, widening to y 1056 in the bowl. **Basin Camp**: flag (1080,888), ring 96, circle (1056,888) r 144, holders (1176,840) and (1176,936), ruin col 24 row 17. The deep camp, with the **Warden** (anchor starting at (1104,984), guard 220, spawn (1512,888), respawn 45 s). |
| Courtyard towers | (1464,264) and (1464,936). |
| Distances from the Azure Keep (330,600) | Rim flag 893 px, Basin flag 803 px (about 3 s for the Guardian at 280 px/s, much longer with fights). |

## 2. Objectives and enemy positions

| Item | Value |
|---|---|
| Mission | phase `capture`: "Capture the Rim Camp" and "Capture the Basin Camp" (latched, either order), then phase `assault`: "Destroy the Crimson Keep". The Keep is shielded while either camp is Crimson (existing rule). |
| Crimson towers | 6, as campaign-35; armed Crimson Keep. |
| **Warden** | the Basin Camp's hero (one camp hero is the existing maximum). Becomes a Banner hunter once the Basin is Azure. |
| **Raider** | spawn (1512,312), released at 90 s, respawn 50 s. Banner, then Azure towers in a camp, then the Azure Keep. Release is announced in the HUD. He does not target Barracks. |
| Elites | 2 on each camp's first capture, from that road's slot (as campaign-35). |
| Waves | **`[8,8,9,9,9,10,10,10]`**, first at **30 s**, every **30 s** (`firstWaveTick:900, waveInterval:900`), 1 allied minion per wave, slots (1776,480) and (1776,720) so each road takes about half, no flanks. |
| Hero Cap | 2 (`tavern:{cap:2,roster:[roland,borin,kael]}`). |
| Not enabled | Ballista, War Cart, Elite Barracks, new enemy behaviour. |

## 3. Azure Barracks: what the code actually does

Read from `AzureBarracks.ts`, `SoldierProto.ts`, `Movement.ts`, `buildings.ts`, `Simulation.ts` (placement) and probed:

| Fact | Value |
|---|---|
| Cost | **120 Wood + 20 Iron**, 600 HP, 5 s to build. A Tavern is 100 W + 10 I; a tower 80 W + 10 I. |
| Output | **2 footmen** per Barracks (320 HP, armour 10, damage 20, speed 120): the first after 3 s, the second 1 s later; a dead footman is **replaced free after 15 s**. A destroyed Barracks drops its slots for good. |
| Limit | `azure.limit` (here 2), pads authored in `azure.pads`; placement only on a free pad. A pad inside a camp circle stays closed until that camp is Azure ("Capture the Rim Camp first"). |
| Behaviour | Footmen are `blue-s-*` soldiers in **hybrid** mode: they advance on the nearest hostile within 560 px but never go more than the leash (400 px) from **the Guardian**; farther than leash + 60 px they walk back to him. While the Guardian is dead they tether to the Azure Keep. |
| Probe | One home Barracks, Guardian sent to the north road: 40 s later its footmen were beside the Guardian at (1041,396), not at home. |

Consequences for the design (stated plainly):

- Footmen **do not hold a road by themselves**. They multiply the Guardian: with two Barracks the Guardian fights with 4 footmen, refilled for free. Where the Guardian goes, the escort goes.
- A Barracks' **position** decides where reinforcements *appear*: a home Barracks refills at the Keep; a camp Barracks (Rim pad, Basin pad) refills at the front, 14 s of walking closer, and is a 600-HP structure that Crimson units may attack and the player must repair or replace (to be measured; the Raider does not target it).
- The fixed points on each road are therefore the **towers, the Allied Heroes under Defend, and the Azure Keep**; the mobile force is **Guardian plus escort**. That is the allocation: you spend wood and iron on towers, a Barracks or a repair, and you place three movable pieces (Guardian group, hero 1, hero 2) on two roads.

If the PO wants footmen to stand a road without the Guardian, that is a new Barracks AI and is out of scope; revision 2 does not assume it.

## 4. Pads and the limit (concrete)

`azure:{pads:[...], initial:[], limit:2}`. `initial:[]`: no free Barracks and no scripted construction.

| Pad | Cell | Opens | Purpose |
|---|---|---|---|
| Home 1 | (10,10) | at once | North side of the Keep: footmen reach the north road first. |
| Home 2 | (10,14) | at once | South side of the Keep. |
| Home 3 | (13,12) | at once | In front of the Keep. |
| **Rim** | (23,6) | Rim Camp Azure | Forward reinforcement on the north road. |
| **Basin** | (21,20) | Basin Camp Azure | Forward reinforcement on the south road (the M5 pad). |

All five were probed with `placementReason('barracks', ...)`: home pads open, camp pads closed until their camp is Azure ("Capture ... first"), then open. Limit 2 means a forward Barracks costs a home Barracks (or a rebuild after one falls), which is the choice.

## 5. Starting economy and progression

Income is **2 Wood and 0.25 Iron per second** (120 W and 15 I a minute), Gold only from kills (25 each) and the start. **Iron is the scarce resource.**

| Item | Value | Why |
|---|---|---|
| Start | **100 Gold, 220 Wood, 30 Iron** | Exactly a Tavern (100 W + 10 I) and a Barracks (120 W + 20 I) at 0 s, so the first Barracks is early and not forced; Gold 100 plus the first wave's kills buys the first hire (150-200). A player may build a tower first instead (80 W + 10 I) and delay one of the two. |
| After the opening | 0 W, 0 I; +2 W/s, +0.25 I/s | A tower about 40 s later (iron), a second Barracks or a repair about 80 s later. |
| Hires | 150 / 180 / 200, cap 2, Revive 45% after 30 s | As M2 (accepted as affordable). |
| Competing spends | tower 80 W + 10 I, camp repair (60% of a tower), Barracks 120 W + 20 I, Revive | Iron makes the second Barracks, the repair and the towers compete. Nothing is scripted. |

Iron at the default 15 would not afford the first Barracks at all (20 I), hence 30. Probe: the 100 / 220 / 30 start, with a Barracks and then towers as iron allows, places the Barracks at 0 s and three towers by about 2 min.

## 6. Wave timing and difficulty curve

| Time | Event |
|---|---|
| 0 s | Quiet. Build the Tavern and a Barracks (done at 5 s); footmen at 8-9 s. |
| 30 s | Wave 1 (8): about 4 per road. Reaches the camps' towers and the Azure side by about 50 s. |
| 60 / 90 s | Waves 2-3 (8, 9). |
| **90 s** | **Raider released and announced** (north). Unopposed he reaches the Azure Keep 13.5 s later and destroys it about 28 s after that. |
| 120 s onward | Waves 4-8 (9, 9, 10, 10, 10), then the last size repeats until the objectives are met. |
| First capture | 2 Elites, once, hunt that Banner. |
| Second capture | The shield falls; the Warden and the Raider hunt the Banners; the Keep assault. |

Against the earlier plan: the waves are 2 to 3 units larger (8-10 against 6-8, M2 5-8) and the interval is 30 s. Probes (Guardian away, no actions): **the waves alone destroy the Azure Keep at 82.9 s** (8-10 waves) against 89.6 s (6-8 waves). A Guardian who stays home but issues no commands, with a Barracks and three towers, lasts to about **129 s**. So the Keep is pressured but not instantly lost; **nothing arrives in the first 30 s, and the first Barracks, Tavern and footmen exist 9 s in**. The "no instant-loss trap" bar is: the earliest unopposed kill (the Raider) is 104 s plus about 28 s of hitting after an announcement, and every defence is buildable at 0 s.

**Unit counts and S24 performance.** Unattended Crimson peak: 18 units. A live match adds up to: 2 Crimson heroes, 4 Elites, 4 footmen, 2 Allied Heroes and the allied minion per wave. Estimate **at most about 35 live units** in the busiest minute (the waves die as they arrive). The bot logs the peak; acceptance is **peak live units <= 40**. If it exceeds that, the first knobs are the wave size (9 at most) and killing faster, not a mechanic. SwiftShader is not S24 evidence, so the human playtest decides performance.

## 7. Hero roles and tactical layout

Three movable pieces, two roads. **Guardian group** = Guardian plus footmen (the mobile force). **Hero 1, Hero 2** = Follow (join the Guardian group), Attack (focus a target) or Defend (hold a tapped point; a hero standing in a ring captures it).

| Strategy | Layout | Gains | Risks |
|---|---|---|---|
| **Concentrated, south first** | Guardian group + both heroes take the Basin (Warden), then north. | The strongest group meets the Warden; one road at a time; a Basin Barracks refills at the front. | North waves and the Raider (north spawn) have only towers; the Keep and the Rim towers take the damage; two trips. |
| **Concentrated, north first** | The same group takes the Rim (no Warden), then south. | The quick first capture starts the Elite/shield clock; the Rim Barracks refills the north. | The Raider hunts the new Rim Banner; the south waves reach home. |
| **Split** | Guardian group (+ one Follow hero) takes the Basin; the other hero **Defends the Rim ring**, capturing it and guarding the Banner. | Both camps go up in parallel; the fastest line. | Each half is weaker; a lone hero must beat the Raider (833 HP, 80 damage, armour 20) to keep the Banner; a fallen hero is out for 30 s. |
| **Split, Keep guard** | One hero Defends the Keep (stops the Raider); the Guardian group + the other hero take the camps in turn. | The Keep is safe from the Raider; no instant loss. | The slowest hero line. |
| **Barracks forward vs home** | Home pads keep the escort refilling at the Keep; camp pads refill at the front. Limit 2. | A forward Barracks shortens the refill walk and extends the Guardian group. | It costs a home Barracks, is a 600-HP target, and its footmen leave for the Guardian anyway. |
| **No Barracks / no Tavern** (control) | Towers and the Guardian only. | Cheapest; saves iron for towers. | Clearly weaker (bot expected; M2: +75% time); never required. |

The honest tension: iron and wood buy **fixed defence (towers, repair)** or **mobile force (Barracks, hires, revives)**; the Guardian can only be on one road; and a lost Banner re-shields the Keep. Both concentrating and splitting are viable, with the tradeoff speed against safety.

## 8. Expected completion time, bot and human acceptance

**Time.** The M5 bot (no heroes, no Tavern) took 314-534 s; the M2 bot 176-312 s for a projected 7-10 min human. With heroes and Barracks M3's bot should land at **about 5-7 minutes**, and a human at **about 11-14 minutes** (M1's ratio 2.4). Over 16 minutes is a finding.

**Bot** (`tests/support/dividedBot.cjs`, from `brothersBot.cjs` and `basinBot.cjs`; commands only). Plans: `concentrate-south`, `concentrate-north`, `split`, `split-keep`, `no-barracks` (heroes and towers only) and `none`. Five assault tempos each (0, 60, 90, 120, 150 s), with and without the Guardian returning home, and a variant per Barracks placement (home only, plus the Rim pad, plus the Basin pad).

**Bot acceptance** (comparative):
- Every hero plan with Barracks wins in at least 4 of 5 tempos; the `none` control is the slowest or loses a camp.
- At least two different plans finish within 25% of each other, and the faster one shows more Banner losses, hero falls, Keep damage or Barracks losses than the slower one (a real tradeoff, no dominant line).
- Azure Keep never destroyed in any hero-plan run at the normal bot; no loss earlier than 60 s after the Raider's release.
- Barracks used meaningfully: the plan with a Barracks beats the same plan without one by a measurable margin (time or Guardian deaths), without making it mandatory (the no-Barracks plan still wins).
- Peak live units <= 40; no Allied Hero stall over 8 s; no deadlock; no run over 600 s.
- No more than 4 Guardian deaths or hero falls in the minute after the second capture.

**Human acceptance** (Galaxy S24 landscape):
- Difficulty 6.5-7.5, completion 11-14 min.
- The player describes choosing a line and a Barracks position and why; both concentrating and splitting are tried or considered.
- Follow / Attack / Defend and the Guardian's road change fights.
- Building a Barracks feels useful, not mandatory.
- No loss without warning; frame rate and controls acceptable (M2's bar).

## 9. Probes and implementation scope

**Probes** (scratch scripts on the built tests; no source change):
1. campaign-35 overrides + `tavern{cap:2}` + the Warden at the Basin + the Raider from (1512,312) + 8-10 waves + `azure{pads x5, initial:[], limit:2}` pass `matchSetup('extended', ...)` and run. **No `matchSetup` change.**
2. Income measured: 120 W and 15 I per minute.
3. Camp pads and home pads behave as in section 4.
4. Footmen follow the Guardian (section 3).
5. Waves alone destroy the Keep at 82.9 s; a Barracks + 3 towers + a home Guardian with no commands lasts to 129 s; the Raider from the north walks to the Keep unblocked for three Warden anchors (first damage 13.5 s after release, Keep destroyed 28.4 s later).

**Scope (data and tests):**
- `src/world/battlefield.ts`, `battlefieldArt.ts`: `divided-road` data variant (art alias to Canyon).
- `src/data/campaignLevels.ts`: `dividedRoadLevel`, campaign-43, Chapter 5 mission 3.
- Tests: `tests/campaign-level-43.cjs`, `tests/support/dividedBot.cjs`; the hardcoded list tests as in M2; `scripts/verify-divided-road.mjs` (780 x 360, DPR 3).
- **Not touched:** Simulation, Movement, `matchSetup`, `AzureBarracks`, enemy AI, units, Chapters 1-4, M1, M2.

**Risks:**

| Risk | Mitigation |
|---|---|
| The Barracks reading (escort, not garrison) differs from what the PO expects. | Stated in section 3 and decision 1; the design holds without a garrison; a garrison needs new AI. |
| 8-10 unit waves plus two camps are too hard. | The data knobs: wave size (9 max), interval, Raider 90 to 105 s, Elites per camp, Warden respawn. Tune after the human playtest. |
| Unit count hurts the S24. | Peak <= 40 in the bot; the knobs above; the playtest decides. |
| Iron starves the second Barracks, towers and repair, and the player feels blocked. | Start 30 iron; if the playtest says so, 35 or the Barracks pad count are data. |
| A Warden anchor near the Basin pad (21,20) blocks placement or paths. | Pathing and placement test on both, as in M2. |
| Waves destroy a camp Barracks in seconds. | A bot metric (Barracks losses); the player may rebuild; if lethal, move the camp pad into the camp's interior. |
| Mobile frame rate, missing art. | As M1/M2 (no new art; no `mission-art-campaign-43.webp`). |

## 10. Decisions for the PO

1. **Confirm the Barracks reading** (escort tethered to the Guardian, refilled free; not a garrison). If a garrison is required, say so and treat it as a separate mechanic request.
2. **Start 100 Gold / 220 Wood / 30 Iron** (affords the Tavern and the first Barracks at 0 s).
3. **Waves `[8,8,9,9,9,10,10,10]` every 30 s, first at 30 s.**
4. **Pads:** three home pads plus one in each camp, limit 2.
5. Raider 90 s / 50 s, Warden at the Basin, `divided-road` variant, unchanged from revision 1.

GO on these (or with changes) is requested. Nothing is implemented, committed, pushed or deployed for M3 (the M2 commit `951341c` is local only).
