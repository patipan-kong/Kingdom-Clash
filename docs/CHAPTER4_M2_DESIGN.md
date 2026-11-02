# Chapter 4 Mission 2 "Cliff Pass" — design for PO approval

Status: design only. No runtime code, nothing committed. Built on the M1 checkpoint (fba0a39) and two passed scratch probes (Faction Gate: branch `scratch/c4-faction-gate`; Repairable Ballista: branch `scratch/c4-ballista`). Every balance number is provisional.
Geometry below was checked against the real `Geometry` class with `scripts/m2-layout-check.cjs` (results in section 8).

## 1. Idea in one paragraph

M1 asked "can you take a camp and hold it". M2 keeps that loop (Capture → Repair → Defend → Advance) and changes the *ground*: the camp sits in a cliff-walled hollow, and the only way on to the Crimson Keep is a 144 px neck closed by a Crimson gate that Crimson units walk through and Azure must break. The new tool is the Ballista, repaired at one authored ruin after capture: it outranges every Crimson tower, covers the hollow, and (design note 6.1) chips the gate when nothing else is in range. Pressure comes from position, not from more enemies: wave sizes equal M1's, the counterattack is smaller (2 Elites, was 4) and there are no flank waves because the pass has no second road.

## 2. Map (1920 × 1152 mission window, y centre 600, grid 48)

Reuses Meadow's Azure Keep (330,600), Crimson Keep (1610,600), reserved cell (450,600) and respawn row. New battlefield id `cliff-pass`, drawn with the existing Canyon cliff art (barriers drawn as cliff rectangles; no new art pipeline).

```
x:   0        768            1248  1344                 1920
y 0  +--------+===============+=====+=====================+
     | Azure  |  NORTH CLIFF   |tooth|  COURTYARD WALL N   |
     |meadow  |                |     +---------------------+ y312
y408 |        +----------------+  [G]   courtyard (Crimson) |
     | Keep   |   CAMP HOLLOW   neck   Keep (1610,600)     |
     | (330)  |  camp (1056,576) gate                      |
y792 |        +----------------+  [G]                       |
     |        |  SOUTH CLIFF   |tooth|  COURTYARD WALL S   |
y1152+--------+================+=====+=====================+
```

Cliff barriers (all `reason: 'Cliff overlaps cell'`, canyon-style look):

| id | x0 | y0 | x1 | y1 |
|---|---|---|---|---|
| north massif | 768 | 0 | 1248 | 408 |
| north tooth | 1248 | 0 | 1344 | 528 |
| north courtyard wall | 1344 | 0 | 1920 | 312 |
| south massif | 768 | 792 | 1248 | 1152 |
| south tooth | 1248 | 672 | 1344 | 1152 |
| south courtyard wall | 1344 | 888 | 1920 | 1152 |

Open ground: Azure meadow x 0–768; the **mouth** (x 768, 384 tall); the **Camp Hollow** x 768–1248, y 408–792; the **neck** x 1248–1344, y 528–672 (144 px, three cells, passable at unit radius 28); the **courtyard** x 1344–1920, y 312–888 with the Crimson Keep in it (lanes 216 px tall north and south of the Keep).

## 3. Key positions

| Thing | Position | Notes |
|---|---|---|
| Azure Keep / Crimson Keep | (330,600) / (1610,600) | Meadow's, unchanged |
| **Faction Gate** `red-gate` | (1272,600), 1 col × 3 rows (x 1248–1296, y 528–672) | Fills the neck's west half; Chapter 3 gate structure + faction flag; **3,000 HP** (Chapter 3's `frostGateHp`) |
| **Camp circle** (outpost) | centre (1056,576), radius 144 | Entirely inside the hollow (x 912–1200, y 432–720) |
| Banner flag | (1080,552), ring 96 | Cell col 22 row 11; Guardian stands within 96 px |
| Camp holders (2 Crimson watchtowers) | (1152,504) and (1152,648) | East edge of the camp, like M1 |
| Gate towers (2 Crimson, defenders) | (1392,504) and (1392,696) | Courtyard side of the teeth; they cover the neck and gate (154 px), **not** the hollow (the teeth block their line of sight) |
| **Ballista ruin** | cell col 21 row 9 = (1032,456) | On the north cliff face, 122 px from the camp centre (inside the circle), 280 px from the gate, off the main lane |
| Tower ruin (M1 repair, 60%) | cell col 23 row 13 = (1128,648) | 102 px from the camp centre |
| Crimson wave slots / counter slots | (1776,480) and (1776,720) | Courtyard east side, 518 px from the gate (rule: at least 192) |
| Crimson Hero | anchor (1176,600), guard 260; spawn (1752,600); respawn 30 s | Warden while Crimson holds the camp, Raider once Azure (M1 rules) |
| Azure Barracks | M3 pads (504,504), (504,696), (648,600), limit 1, none standing at start | Unchanged from M1 playtest 1 |

"Elevated" is presentation only (a stone shelf drawn under the ruin): the engine has no height, so the ruin sees exactly what an open cell at that spot would see.

## 4. Mission and rules

- Phase 1 **Capture the Camp**: destroy both holders (the Warden guards the camp meanwhile); stand in the ring and the Banner (2,000 HP) rises in 4 s. M1 rules unchanged: Keep shielded while Crimson owns the camp; losing the Banner makes the camp Crimson again; repaired structures stay.
- Phase 2 **Destroy the Crimson Keep** (gate is never an objective, it is simply in the way, as in Chapter 3). The Keep is armed.
- First capture sends **2 Elites** (once per match). Everything else in the Raider/Warden/Banner logic is M1's.
- **Faction gate**: Crimson units path, collide and see as if the gate were absent; Azure units and the Guardian treat it as a hostile wall (existing breach logic); Azure Barracks soldiers cannot pass it.
- **Ballista**: 140 W / 30 I at full price, **84 W / 18 I** as the repair, 5 s, 520 HP, range 420, **70 damage every 3 s**, only at its ruin, only while the camp is Azure; once built it stays and fires even if the camp is lost (probe E). A tower cannot be placed on that ruin.
- One normal Azure Barracks stays available.

## 5. Enemies, waves, resources

| | M1 | M2 (proposed) |
|---|---|---|
| Waves | 6,6,6,6,7,7,8,8; first at 10 s, every 25 s, until the Keep falls | **identical**, cap 24 Crimson / 16 Azure |
| Flank waves | waves 3 and 6 via the south trail | **none** (single road) |
| Allies | 1 per wave | 1 per wave |
| First-capture counterattack | 4 Elites | **2 Elites** |
| Defender towers | 2 holders + 2 front towers | 2 holders + 2 gate towers |
| Crimson Hero | 833 HP, 30 s respawn | unchanged |
| Start | 100 Wood, 10 Iron, 0 Gold | unchanged |

Waves spawn inside the courtyard and walk through the gate, so they reach the hollow as a column through a 144 px neck, 6–7 s after spawning (M1: about 7 s). Income is 2 Wood and 0.25 Iron per second, so **iron is the scarce resource**: roughly 10 + 15 per minute.

Build opportunities and their iron price: home tower 10 I, camp tower repair 6 I, Barracks 20 I, Ballista repair 18 I, an extra tower at the camp 10 I, walls 0 I. A player cannot afford everything before minute 4, which is intended.

## 6. Decision points for the player

1. **Opening:** home tower (10 I) or save iron for the Barracks (20 I, affordable at about 40 s).
2. **Timing the push:** take the camp between waves, or hold at home until the Barracks stands.
3. **After capture, the iron choice:** Ballista (18 I), tower repair (6 I), or a Barracks. M1 showed one forward structure gives the whole benefit; M2 gives that structure a second shape.
4. **Where to fight:** the neck exit is a 215–285 px kill zone for the Ballista, but the Warden (guard 260) and the Raider Hero reach the ruin (204 px from his anchor). Defending the shelf costs Guardian time.
5. **Advance:** break the gate with the Guardian under the gate towers' fire, let the Ballista chip it (6.1), or wait out the waves.
6. **Gate down:** the courtyard opens; Crimson units are no longer funnelled and the Keep fights.

### 6.1 Design note: the Ballista will shoot the gate
Tower code targets the nearest hostile unit or structure in line of sight, and the gate is a hostile structure 280 px away. In a lull the Ballista deals about 23 damage per second to it (3,000 HP takes about 130 s of uninterrupted fire). I recommend keeping this: it is the Advance reward for holding the camp, and enemies, being nearer, always take priority. Knob if playtest says it trivialises the gate: gate armour 10 or 4,000 HP, or place the ruin so the gate is just out of reach (more than 420 px).

## 7. Technical integration risks

From the Faction Gate probe:
1. **`checkGates` must use the Crimson view.** The Simulation's start-up check that every Crimson spawn slot reaches the Azure side treats the gate as solid and will throw for courtyard slots. Required fix, with a test.
2. **The faction flag must be data, not the probe's module switch.** Add it to the gate's `MatchGate` / level setup so Chapter 3 gates stay solid for everyone.
3. Every call site that gives a Crimson unit a structure map must use the Crimson view: Movement, `Navigation.route`, attack and line-of-sight checks (done in the probe), plus Hero spawn clearance and `spawnOpen`. Add a unit test that enumerates them.
4. Cache the Crimson view once per tick (the probe built it per route call).
5. An invulnerable Azure Keep leaves Crimson units with no route (no legal attack position); the M2 mission must never set `invulnerable` on the Azure Keep.
6. Untested in the probe: Azure Barracks soldiers following the Guardian into the neck, and the gate dying under a Crimson unit standing in its footprint. Both go in the acceptance tests.

From the Ballista probe:
7. **Validate** that the Ballista and tower ruins lie inside the camp circle, in open cells, and off the Banner cell (new battlefield/setup validator).
8. **UI and art are missing:** a "Repair Ballista" mode in the Build panel (`buildModel`, `BuildPanel`), a ruin sprite and a Ballista sprite on a tower-kind structure.
9. Azure units or the Guardian standing on the ruin block placement ("Occupied by unit", M1's rule). The ruin is off the lane to limit this; add a clear message.
10. The 2 Elites arrive about 10 s after capture and can reach a fresh 520 HP Ballista. Intended pressure, but the first human playtest should watch it.
11. Ballista counts toward the 30-tower cap and draws Crimson targeting like a tower.

New for M2:
12. Register `cliff-pass` in the battlefield and art registries; `tests/battlefield-art.cjs` enumerates the ids and must be updated. Chapters 1–3 art and fields stay untouched.
13. Crowd cost: a 24-unit sortie funnels through one neck, which is where line-of-sight work concentrates. The worst-case crowd at the neck must be profiled before human playtest (the M1 profile script covers it).

## 8. Layout verification (scripts/m2-layout-check.cjs)

| Check | Result |
|---|---|
| Azure (radius 20) reaches the Crimson Keep side with the gate standing | no |
| Same with the gate removed | yes |
| Crimson spawn and Hero slots reach the Azure reserved cell with the gate transparent | yes (all three) |
| Same if the gate blocked Crimson | no (confirms risk 1) |
| Neck and both Keep lanes passable at unit radius 12, 20 and 28 | yes |
| Ruin, flag cells open | yes |
| Ruin in camp circle | 122 of 144 px |
| Ballista line of sight to: gate, neck exit, camp centre, Banner, hollow corners, mouth | all clear |
| Ballista line of sight to (1296,600) behind the standing gate | blocked (intended); clear once the gate falls |
| Gate towers' line of sight into the hollow | blocked by the teeth (they cover the neck only) |
| Ballista to the gate towers | 363 and 433 px (outranges their 240) but the teeth block the line of sight |

## 9. Acceptance criteria

Implementation (automated):
1. Chapters 1–3 and M1 tests unchanged and passing; full suite, `tsc`, production build green.
2. Battlefield validates; all geometry checks in section 8 pass as unit tests; Azure cannot reach the Keep side with the gate standing, Crimson can.
3. Faction gate: a Crimson unit placed in the courtyard walks out through the standing gate and never attacks it; an Azure unit breaches it; Chapter 3 gates still block Crimson; the Azure Barracks soldiers do not jam.
4. Ballista: probe scenarios A–F ported as tests, using the final stats; ruin validator rejects a ruin outside the circle.
5. Bot comparisons (5 variants each, as in M1): conquer, turtle, no-build, each with and without the Ballista. Expect the no-build plan to lose, every other plan to win, median conquer time within 20% of M1's, Guardian deaths no worse than M1.
6. Browser check: card/ruin presentation, gate drawn, no page errors, desktop and phone landscape, the `?debug=1` overlay.

Human playtest (pass if all hold):
1. First win in 7–10 minutes (M1: 7:40), no more than twice the M1 number of Guardian deaths.
2. The player can state in one sentence why the Ballista ruin matters, and used it before minute 5.
3. No unit congestion at the neck lasting more than 10 s, no unit stuck in terrain.
4. The Ballista was destroyed at most once per run before the gate fell.
5. FPS: no new drop beyond the machine's display cap (use the overlay with unit count).
6. Open questions to record: did the Ballista chip the gate and did that feel earned; was 2 Elites too soft; was the neck a good fight or a traffic jam.

## 10. Not in this mission
Elite Barracks and Gatehouse (M4), a south trail or second route, an elevation mechanic, a global Ballista build option, more than one Hero, changes to Chapters 1–3 or M1.
