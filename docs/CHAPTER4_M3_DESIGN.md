# Chapter 4 Mission 3 "River & Island" (campaign-33): final design for implementation planning

Status: design only, revised after two scratch probes. No runtime code, nothing committed. Built on the M2 checkpoint `95c1d85`.
Evidence: `tests/m3-routing-probe.cjs` (faction-gate version, superseded) and `tests/m3-two-front-probe.cjs` (this design), both in the scratch worktree `G:\work\ark\arkhero-c4-m3-probe`, branch `scratch/c4-m3-routing`. Every balance number is provisional until human playtest.

## 1. Idea

M1 = take a camp. M2 = take a camp behind a gate in a narrow pass. M3 = take a camp in the middle of a river, then choose a front.

A river splits the map. The Island Camp in the middle must be captured, and held, to drop the Crimson Keep's shield. East of the island a **normal Gatehouse** (solid for both sides) blocks the short road. Every Crimson wave therefore comes from a **Crimson Barracks** beside the **South Bridge**, crosses there, and marches up the west bank on the Azure Keep, passing the island. The player then chooses:

- **Gate Assault**: break the Gatehouse under its two towers and take the short road to the Keep.
- **South Assault**: cross the South Bridge into the wave stream, destroy the Barracks (waves stop), then go for the Keep.

No new mechanic: the gate is Chapter 3's Frost Gate rule, the Barracks is Chapter 3 C3-2's slot-owning Crimson Barracks, the camp is M1's post. Difficulty comes from the ground and the choice, not from more enemies.

## 2. Layout (1920 x 1152, grid 48, y centre 600)

Reuses Meadow's Azure Keep (330,600), Crimson Keep (1610,600), reserved cell and respawn row. New battlefield `river-island`. Water is a barrier like M2's cliff (no water physics).

```
x:   0             816      1104 1200                       1920
y 0  +--------------+========+====+...........................+
     |              | WATER  |tooth   Crimson field           |
y456 |   Azure      +--------+====+   [T]                     |
     |   west bank  | ISLAND [GATE] neck        Keep (1610,600)|
y696 |  Keep (330)  |  camp  |====+   [T]                     |
     |              +--------+====+                           |
y912 |   <-- waves  | SOUTH BRIDGE  >>  [BARRACKS] slots       |
y1056|              +========+====+                           |
y1152+--------------+========+====+...........................+
```

Barriers (`reason: 'Water overlaps cell'`; +/-Infinity edges as shown):

| piece | x0 | y0 | x1 | y1 |
|---|---|---|---|---|
| north water | 816 | -Inf | 1104 | 456 |
| middle water | 816 | 696 | 1104 | 912 |
| south water | 816 | 1056 | 1104 | +Inf |
| north shore tooth | 1104 | -Inf | 1200 | 528 |
| middle shore tooth | 1104 | 672 | 1200 | 912 |
| south shore tooth | 1104 | 1056 | 1200 | +Inf |

Open ground:
- **Island**: x 816-1104, y 456-696. Its whole 240 px west edge is a landing from the west bank; no other link.
- **Gatehouse neck**: x 1104-1200, y 528-672, 144 px (M2's proven neck width).
- **South Bridge**: x 816-1200, y 912-1056, 144 px wide. Probe: moving it north (y 744-888) gave no extra island pressure, so it stays here.

## 3. Positions and the three Crimson defence groups

| Group | Piece | Value |
|---|---|---|
| **Island Camp** | Banner flag, ring | **(984,600)** (a cell centre, see section 9), ring 96 |
| | Camp circle (outpost, buildable once Azure) | (960,576), radius 120 |
| | Holder towers | `c4-isle-north` (912,504), `c4-isle-south` (912,648) |
| | Ruined tower (M1 repair rules) | cell col 21, row 13 = (1032,648) |
| | Crimson Hero (Warden, then Raider) | anchor (1056,576), guard 220, respawn 900 ticks at (1488,984) |
| | Elite counterattack, first capture only | 2 Elites at (1536,936) and (1536,1032) |
| **Gatehouse** | Normal gate (no faction flag) | `red-gate` (1128,600), 1 column x 3 rows, 3,000 HP |
| | Gate towers, exactly two | `c4-gate-north` (1248,504), `c4-gate-south` (1248,696) |
| **South Bridge** | Crimson Barracks (destroyable, 2 x 2) | `red-barracks-south` (1344,1008), 2,000 HP |
| | Wave spawn slots, both owned by it | (1440,936), (1440,1032) |
| **Keep** | Crimson Keep | (1610,600), 3,000 HP, shielded while the camp is not Azure |

No Ballista in M3, and no other Crimson towers.

Spawn ownership:
- Both wave slots belong to the Barracks. The engine already requires every wave slot to be owned once any Barracks exists, and drops queued and future spawns at a dead Barracks' slots (probe B: 0 spawns after it fell).
- The Elite slots and the Hero spawn are **not** wave slots. If they were, a Barracks destroyed before the first capture would silently cancel the counterattack, because the drop rule applies to every Crimson entry at an owned slot. All three points are open, reachable east-side cells; implementation must check this with a unit test, since an unreachable target makes units idle on their slot and stall every later wave (probe D, first run).

## 4. Azure side, start and waves

- **Start**: 0 Gold, 100 Wood, 10 Iron (M1/M2).
- **Azure Barracks**: limit **one**, none at start. Pads: the three home pads (col 10 row 10, col 10 row 14, col 13 row 12) plus one island pad at col 20, row 10 = (984,504), valid only once the camp is Azure (M1/M2 circle rule). Soldier AI unchanged (hybrid, 400 px leash).
- **Waves**: `[6,6,6,6,7,7,8,8]`, first at tick 300, every 750 ticks, mission `until-objectives` (the last size repeats until the Keep falls), 1 Azure ally per wave, no flank waves. Exactly M2's budget: 54 scripted Crimson units, plus 2 Elites once and the Hero.

Why the waves are not reduced: in this engine the Crimson Barracks does not train extra soldiers. It *owns* the wave slots, so "Barracks pressure" is the waves themselves, and destroying it takes enemies away. Probe D2 measured island pressure equal to M2's (same passive-defence test: both camps fell at 52 s). Starting at M2's budget is therefore already "no additional enemies"; trim only if the playtest says so (decision 2).

## 5. Stats (all existing values)

| Piece | HP | Attack | Notes |
|---|---|---|---|
| Tower (Crimson holders and gate towers, Azure built) | 650 | 18 every 24 ticks, range 240 | 80 Wood, 10 Iron to build; repair of the ruin 60% = 48 Wood, 6 Iron, 5 s |
| Gatehouse | 3,000 | none | Normal wall rules: blocks movement and sight for both sides, Crimson never attacks it, no XP or Gold |
| Crimson Barracks | 2,000 | none | Wall rules; its death drops every queued and future spawn at its slots |
| Crimson Keep | 3,000 | 14 every 24 ticks, range 140, Guardian first | Shielded while the camp is not Azure |
| Banner | 2,000 | none | Rises 120 ticks after the Guardian stands in the ring with both holders dead |
| Crimson minion | 240 | 18 every 30 ticks, range 48 | speed 95 |
| Crimson Elite | 480 | as minion | 2, once, on the first capture |
| Crimson Hero | 833, armour 20 | 80 every 23 ticks | Warden while the camp is Crimson, Raider (Banner first) once it is Azure |

## 6. Objective and shield

Phases as M1/M2: `capture` (the Island Camp) then `assault` (destroy `red-base`). The HUD objective already follows the camp: "Capture the Island Camp", then "Destroy the Crimson Keep", or "Recapture the Island Camp" if the Banner falls. The Keep shield and its "Keep Shielded! Capture the Island Camp first" notice are unchanged. The Ballista hint does not appear (no ruin Ballista).

Proposed first-capture notice (optional, decision 5): "Island Camp captured! Break the Gatehouse or cross the South Bridge".

## 7. The two strategies

Both start the same way: capture the island and hold it, because losing the Banner brings the shield back.

| | Gate Assault | South Assault |
|---|---|---|
| Path | Island, Gatehouse neck, Keep: the short road | West bank, South Bridge, Barracks, then the Keep |
| Opposition | 3,000 HP gate under two towers (650 HP, range 240) | The wave stream itself, coming the other way across a 144 px bridge, plus the Barracks (2,000 HP) |
| What it buys | The short road; the Guardian stays about 150 px from the island | No more waves once the Barracks dies; the island becomes safe |
| Cost | Waves keep coming at the island while you break the gate | You leave the island; it must hold on towers (and the Barracks soldiers) without you |
| Soldiers | Do not attack the gate; they fight what reaches the island | Limited help: they straggle on the bridge, the Guardian does the Barracks damage (probe C) |

Neither strategy needs a particular building. A player who builds nothing can still do either; the camp is simply harder to hold.

## 8. Expected experience and acceptance criteria

Target: victory **7-9 minutes**, **3-6 Guardian deaths** (M1 6:49 / 3-4, M2 7:15 / 4-5).

Human playtest passes when:
1. The opening is understood: capture the island first; the shield notice explains a struck Keep.
2. Both strategies win within 7-9 minutes in at least one run each, with neither clearly dominant.
3. Crimson waves are seen crossing the South Bridge, never through the standing Gatehouse, and never attacking it.
4. Destroying the Barracks visibly stops the waves.
5. The island is under real pressure after capture (it is not "safe once taken"), but a defended camp holds.
6. No unit stuck at the neck, the bridge or the island; Azure soldiers do not stand idle far from any fight for long.
7. 60 FPS on desktop and steady on phone landscape with crowds on the bridge; notices readable.

Bots before the playtest (as for M2): conquer, turtle, no-build and Barracks-first, plus Gate Assault only and South Assault only. Both route bots should win within the M1/M2 range.

## 9. Known technical limitations (from the probes)

1. **The Banner flag must be a cell centre.** A flag on a cell corner (the earlier (1008,576)) leaves the 1 x 1 Banner with no attack position, so Crimson cannot reach it. The Elites then idle on their slots and the spawn clearance stalls every later wave. M1 and M2 flags were already cell centres; implementation should validate this.
2. **Any unreachable Crimson target stalls the waves** for the same reason. Every Crimson spawn point needs a reachability test.
3. **Azure soldiers give limited help in the South Assault.** They engage what comes within reach of the Guardian; the Guardian does the Barracks damage. This is accepted behaviour, not a fix item.
4. **Soldier anchor-snap bug remains latent.** `SoldierProto.soldierAnchor` snaps to cell corners; a soldier that must detour to rejoin the Guardian can get no route and stand still. Not triggered in the two-front probe; a one-line fix broke a Chapter 3 test, so it is out of scope for M3.
5. **Simulation cost**: 44 units on the bridge cost 1.74-2.01 ms per tick against 1.66-1.67 at M2's neck in the same harness (up to +21%); still well inside the frame. A browser trace is part of implementation.
6. **Water art**: drawn from the barrier rectangles with the existing water and bridge textures; presentation only.

## 10. Decisions for the PO

1. **Barracks before capture.** Nothing stops a player from crossing the South Bridge and destroying the Barracks *before* capturing the island, which ends all waves and makes the capture and Keep trivial. Options: (a) accept it as a valid, hard opening (recommended for the first playtest: the bridge is where every wave arrives, so it is expensive early); (b) shield the Barracks like the Keep until the camp is Azure (a small rule change: the shield applies to a list instead of one Keep); (c) raise Barracks HP.
2. **Wave budget**: keep M2's `[6,6,6,6,7,7,8,8]` for the first playtest (recommended; the Barracks adds no units), or trim pre-emptively (for example `[5,5,6,6,6,7,7,8]`).
3. **Barracks HP 2,000** (probe value, Chapter 3 range 1,500-3,000).
4. **Island Azure Barracks pad** at (984,504) in addition to the home pads, limit still one (recommended).
5. **First-capture notice** for M3 (optional text above).
