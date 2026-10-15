# Gameplay v0.4 — Keep Defense & Wave Pressure (experimental, pending approval)

Branch `gameplay-v0.4`, based on main `a7e1cea` (v0.3 + Keep Defense Slice A). **Experimental values, not an approved final balance.** Everything lives in `src/data/gameplayV04.ts` with "was" notes. The v0.3 ([GAMEPLAY_V0_3.md](GAMEPLAY_V0_3.md)) and Slice A ([KEEP_DEFENSE_SLICE_A.md](KEEP_DEFENSE_SLICE_A.md)) documents stay as historical records; this file supersedes their wave counts and the inert-Keep assumption for the extended encounter only. The prototype encounter is unchanged.

## Rules
| System | v0.4 rule | Was |
|---|---|---|
| Crimson Keep defense | Attacks one enemy every **24 ticks** (0.8 s) for **14 physical** damage (armor applies: 11.67 to an LV1 Guardian). Range **140**, measured from the Keep's footprint edge. No windup. Targets the **Guardian first** when it is in reach, otherwise the nearest Azure unit. Same strike, protection and kill rules as a tower. | Inert (damage 0, range 0) |
| Shot origin / line of sight | The shot starts at the nearest point of the Keep's 3×3 footprint, so the Keep never blocks itself, and the segment is the reverse of any attacker's segment onto the Keep. Result: every reachable position from which the Guardian can hit the Keep is answered. Other structures still block line of sight. | — |
| Azure Keep | Stays inert (asymmetric model A). | Inert |
| Waves 1–12 (Crimson) | `[3,3,4,5,6,6,8,8,9,9,11,11]`: +1 for waves 4–6, +2 for 7–10, +3 for 11–12 (83 minions, was 66) | `[3,3,4,4,5,5,6,6,7,7,8,8]` |
| Wave 13+ (Crimson) | 9, +1 every 3 waves, capped at **11** | 8 → 10 |
| Unchanged | Keep HP 3000, 8 tower positions and stats, 40 s interval, 0.8 s spawn stagger, allied 2 per wave, caps 24/16, Guardian abilities, items, Siege Hammer bonus, respawn formula, late-wave Gold 10, UI/camera/Shop/rendering. | |

Presentation: no UI change. A Keep shot uses the existing generic paths: the attack-range flash (drawn at the Keep centre, so it understates the edge-based reach), the Guardian damage number and the impact ring. The tower-only "danger" trace and notice do not fire for the Keep.

## Root causes (confirmed)
1. **Free Keep sieges after tower losses.** All Keep defense came from other structures, and every tower kill permanently removes coverage. Static analysis (4 px lattice of reachable Guardian positions that can hit the Keep):

   | Destroyed | Keep-attack cells | 0 defenders | 1 defender |
   |---|---|---|---|
   | none (Slice A) | 2069 | 0 | 292 |
   | any one front/rear/wing tower | 2130–2384 | 0 | 292–352 |
   | `keep-north` (or `keep-south`) | 2292 | 0 | 352, of which **282 are covered only by `keep-rear`** |
   | `keep-rear` | 2363 | 438 | 1282 |
   | `keep-north` + `keep-rear` | 2586 | **571** | 918 |

   After one wing tower falls, most of the north (or south) face is covered by a single tower (about 20 DPS after armor), which a Guardian outlasts while breaking the Keep. The solo-able `keep-rear` then opens a fully free pocket. No tower layout fixes this; the Keep itself had to answer.
2. **Waves rarely reach the Azure Keep because the Guardian clears them.** The Guardian kills 90–95 % of all Crimson minions in every strategy; allied minions kill 2–14 per match. A full wave dies in the Azure half (defending) or at its own spawn (pushing), well inside the 40 s interval. Waves never accumulate: peak Crimson population ≤ 11 against the cap of 24, queue ≤ 11. Respawning at the Azure Keep returns a dying Guardian to the defense. Azure takes damage only while the Guardian is away or dead.

## Keep-defense model: A (Crimson only)
| Model | Effect (bots) |
|---|---|
| A, Crimson only | Flank and Keep sieges cost HP and deaths; Azure defense unchanged |
| B, symmetric 14/24 | Same Crimson effect, but the Azure Keep alone extends a Guardian-absent match from 112 s to 194 s, and turns the LV1 wing flank back into a safe win (Azure 1740–1958 left instead of 0–876). It undoes Goal 2. |

Crimson has no player defending it, so the Keep compensates for that. Azure already has the Guardian and player-built towers.

## Deterministic bot scenarios (MEASURED; bots are not humans)
Harness: `scripts/balance-v04.mjs` (see [Balance harness](#balance-harness)), an adaptation of the v0.3 scenario driver: lane push/defend bots with skills and Shop, plus a wing-flank bot that destroys `keep-north`/`keep-south` from its least-defended spot, then hits the Keep from the least-defended spot, respawning and repeating. Lane scenarios run at 1-, 2- and 3-tick reaction cadences; values are those three samples. Repeated runs are byte-identical.

### Keep damage / cooldown range (v0.3 waves)
| Scenario | baseline | 12/24 | **14/24** | 16/24 | 12/18 | 14/18 | 16/18 |
|---|---|---|---|---|---|---|---|
| Wing flank N, LV1 | win 79 s, 1 death | Keep 72 left, Azure falls 87 s | Keep 312, 87 s | Keep 456 | Keep 456 | Keep 552 | Keep 600 |
| Wing flank S, LV1 | win 79 s, Azure 1884 | win 96 s, Azure 912 | win 97 s, Azure 876 | 876 | 876 | 876 | 390 |
| Flank N + `keep-rear` | win 75 s, 0 deaths | Keep 72 | Keep 120 | 168 | 120 | 168 | 168 |
| Hammer flank (buys ~160 s) | win 182 s, 0 deaths | win 182 s | win 182 s | win 182 s | win 182 s | win 199 s, 1 death | win 200 s, 1 death |
| Frontal rush | win 146–152 s, 2 deaths, Azure 2334–3000 | win 174 s, 3 deaths, 1272–1812 | win 174 s, 3 deaths, 1380–1848 | 1488–1884 | 1488–1506 | **defeat 193–199 s** | win, 1308–3000 |
| Shield | win 234–236 s, 1 death, Azure 1110–1830 | win 264–266 s, 2 deaths | win 249–265 s, 2 deaths | win 247–268 s | win 247–268 s | win, Azure 624–2100 | win, Azure 678–2334 |
| Hammer | win 236–239 s, Azure 2388–2622 | unchanged | unchanged | unchanged | unchanged | unchanged | unchanged |
| Defend 15 min / absent | 3000 / defeat 114 s | unchanged | unchanged | unchanged | unchanged | unchanged | unchanged |

Keep damage taken by the Guardian: 730–1,390 per push at 12–16/24. The 18-tick variants make the outcome swing between a clean win and a loss, so they are rejected.

### Wave schedules (with Keep 14/24)
| Scenario | v0.3 waves | **v0.4 mild** | candidate (+2/+3/+4, 10→12) |
|---|---|---|---|
| Frontal rush | Azure 1380–1848 | Azure 1056–1164 | Azure 570–714 |
| Shield | win, Azure 1416–2100 | win 271 s, Azure 1416–1668, 2 deaths | **1 of 3 lost**, Azure 0–2640 |
| Hammer | Azure 2568–3000 | 3000 | 3000 |
| Defend 15 min | Azure 3000, 0 deaths, Gold 2840 | Azure 2928–3000, 0–1 deaths, Gold 3355 | Azure 2568–3000, 1 death, Gold 3715 |
| Defend 20 min | 3000, Gold 3610 | 2928, Gold 4215 | 2676, Gold 4645 |
| Parked + 4 player towers | defeat 824 s | defeat 480 s | defeat 401 s |
| Forced deaths every 60 s | win, Azure 2118–3000 | win, Azure 588–3000 | win, Azure 588–3000 |
| Peak Crimson alive / queued (rush; defend 15 min) | 8 / 4; 10 / 9 | 10–11 / 5; 10 / 10 | 11 / 6; 10 / 11 (cap 24) |

The candidate schedule alone, without Keep defense, barely changes the rush, because it wins around wave 4. Combined with Keep defense it overshoots.

### Recommended configuration vs baseline (Keep 14/24 + mild waves)
| Scenario | baseline (a7e1cea) | v0.4 |
|---|---|---|
| Frontal rush, no items | win 146–152 s, 2 deaths, Azure 2334–3000 | win 174–175 s, 3 deaths, Azure 1056–1164, Keep dealt 1,296–1,391 to the Guardian |
| Wing flank N, no items | win 79 s, 1 death, Azure 2118 | Keep 312 left when Azure falls at 87 s (bot never defends), 2 deaths |
| Wing flank S, no items | win 79 s, 1 death | win 97 s, 2 deaths, Azure 876 |
| Shield | win ~235 s, 1 death, Azure 1110–1830 | win ~271 s, 2 deaths, Azure 1416–1668 |
| Siege Hammer | win ~237 s, 1 death, Azure 2388–2622 | win ~237 s, 1 death, Azure 3000 |
| Hammer flank | win 182 s, 0 deaths | win 184 s, 0 deaths (Keep dealt 459) |
| Defend 15 min | Azure 3000, LV20 at ~660 s, Gold 2840 | Azure 2928–3000, LV20 at ~600 s, Gold 3355 |
| Guardian absent | defeat 114 s | defeat 112 s |
| Survive 20 min | Azure 3000 | Azure 2928, 1 death |

Strategy times now spread: Hammer about 237 s, rush 175 s, Shield 271 s. The Hammer becomes the safest option (no extra deaths, Azure untouched), because it clears waves and kills structures fastest. This needs a separate balance decision; the Hammer bonus is unchanged here.

## Final validation (provisionally approved configuration)
### Hammer flank: a legitimate race, not an unopposed position
The Hammer flank bot farms and defends at home until it buys the Hammer (~145 s, LV6), takes the north lane, destroys `keep-north`, then hits the Keep from (1712, 552), a spot covered by one tower (`keep-rear`) **and** the Keep.

| Measure (north flank, v0.4) | Value |
|---|---|
| Keep shots fired / landed | 47 / 47 (41 on the Guardian, 6 on allied minions while the Guardian was out of its reach) |
| Ticks where the Keep could hit the Guardian but targeted something else | 0 (Guardian-first works) |
| Time the Guardian could hit the Keep / time inside the Keep's reach | 32.4 s / 32.6 s (every attack position is answered) |
| Damage to the Guardian: Keep / towers / minions | 459 / 941 / 0 (baseline: 0 / 902 / 0) |
| Guardian HP from first Keep hit, 1 s samples | 1374 → 100 (baseline 1423 → 598) |
| Towers destroyed first | `keep-north` only |
| Keep siege duration | 32.4 s in both variants. The +2 s (182 → 184 s) is a later purchase (145.3 s vs 143.7 s) from different wave Gold, not the Keep |

Why it still has no deaths: the Hammer kills the 3000 HP Keep in about 32 s, so the Keep only gets about 41 shots (11.2 damage each after LV6 armor). An LV6 Guardian (~1,450 HP) survives the Keep plus one tower with **100 HP to spare** (7 %). The margin is thin but consistent: south flank 81 HP left; damage 12 → 166, 16 → 34; only the rejected 18-tick cadence kills it (1 death, 201 s). Destroying `keep-rear` too leaves the Keep as the only defender at that spot; the Keep still lands 55 shots and the Guardian ends at 490 HP. The Hammer's strength is shortening exposure, which is its intended role. Its bonus is unchanged pending a separate decision.

### Extended wave queue: bounded
Per-minute samples of active Crimson minions, queued Crimson spawns and Azure HP (`queue15/25/30`, `dyingDefend30`, `absent30`, `stress30`).

| Scenario | baseline | v0.4 |
|---|---|---|
| Defend 15 min | Azure 3000, 0 deaths, peak 9 alive / 9 queued | Azure 2928, 1 death, peak 10 / 10 |
| Defend 25 min | Azure 3000, 0 deaths, peak 10 / 9 | Azure 2928, 1 death, peak 10 / 10 |
| Defend 30 min | Azure 2262, 1 death (1697 s) | Azure 1236, 2 deaths (829 s, 1697 s), peak 12 / 10 |
| Defend, forced death every 90 s | defeat 919 s | defeat 838 s |
| Guardian absent | defeat 114 s, peak 7 / 3 | defeat 112 s, peak 7 / 3 |
| Stress probe (absent, Azure made indestructible, cap saturated from minute 5) | peak queue 33, 22–33 after minute 8 | **peak queue 44 at minute 8**, 22–33 from minute 13 to 30 |

- With an active defender the queue is 0 at every minute sample. The peaks are only a wave's own 0.8 s stagger entries.
- Cap saturation needs an absent Guardian and an indestructible Azure Keep. In a real match Azure falls at about 112 s, long before that.
- While the 24 cap is full, scripted waves 1–12 still enqueue unconditionally. Their total is finite (83), so the backlog peaks at 44 and then drains as minions die.
- From wave 13 on, a wave is enqueued only while the Crimson queue holds fewer than 24 entries, so the queue can never exceed 23 + 11 = 34. A wave arriving at a full queue is skipped (pre-existing v0.3 rule).
- No unbounded growth. No correction proposed.

Long matches: the simulation has no HP regeneration, so a defending LV20 Guardian bleeds HP until a wave kills it (1697 s in both variants). v0.4's larger waves made that death cost more Azure HP (1,692 vs 738). That attrition is pre-existing, not a queue or Keep effect.

## Balance harness
`node scripts/balance-v04.mjs [scenario,...|all] [baseline|v04|both] [--full]`, after `npm test` (which transpiles `src` into `.test-build`).
- `all` runs the lane and flank scenarios (about 2–3 minutes for both variants). The queue scenarios are long and opt-in: `queue15`, `queue25`, `queue30`, `dyingDefend30`, `absent30`, `stress30`.
- `--full` adds the per-minute timeline, death times, tower kills, Azure damage sources and Keep metrics (shots fired/landed, target kinds, targeting misses, time in Keep reach, Guardian HP from the first Keep hit).
- Variants mutate the loaded `gameplayV04` data object inside the harness process. No source, build or saved state changes. `baseline` (inert Keeps, v0.3 waves) reproduces `a7e1cea`, because the v0.4 shot origin only matters for an attacking Keep.

Limitations:
- Bots, not humans: fixed priorities, perfect reaction, no retreating, no healing between pushes, the flank bot never defends.
- The flank bot picks spots by counting towers only (it replays the v0.3.1A exploit route on purpose).
- Shop use is limited to one item per bot. Forced deaths set HP to 0 with the real respawn formula.
- The stress probe changes Azure HP in memory to keep the match alive and is not a playable scenario.
- Results are byte-identical between runs; they are not a statistical sample.

## Files
`scripts/balance-v04.mjs` (new, harness), `src/data/gameplayV04.ts` (new), `src/simulation/Combat.ts` (Keep shot origin), `src/simulation/Simulation.ts` (arm Keeps for the extended encounter, Keeps join the attack loop, Guardian-first targeting, target clearing on death/pause), `src/data/encounters.ts` (v0.4 schedule), `tests/gameplay-v04.cjs` (new), contract updates in `tests/encounter.cjs` and `tests/gameplay-v03.cjs`.

## Tests (`tests/gameplay-v04.cjs`)
Armed values, inert Azure/prototype, Keep HP; every reachable Keep-attack position answered (intact layout and no towers); no self-blocking (faces and corners, with a centre-origin control); edge-based range, no map-wide reach; 24-tick cadence and armor-reduced 14 damage, deterministic; Guardian-first targeting, minion fallback, never its own team; Crimson minion decisions unchanged; Keep kills of the Guardian (respawn timer, no XP, respawn protection); victory while the Keep fires and no fire after the result; defeat unchanged; pause clears the Keep target; schedule counts, cadence and stagger; populations within caps in a defended 15-minute match.

## Risks and required human playtests
- **Bots are not humans.** Humans flanked in 2:44 with 4 deaths, where the bot needs 79 s with 1 death; humans defend between pushes, and the flank bot never does.
  - Needed: a human wing flank (keep-north or keep-south) with and without destroying `keep-rear`.
  - Needed: a rush, a Shield run and a Hammer run.
  - Record time, deaths, Azure HP, and whether the Keep's fire was noticed and understood.
- **Readability:** Keep shots have no dedicated trace or warning. If players cannot tell why they are dying, the Keep needs a presentation slice (out of scope here).
- **The frontal rush is the most affected strategy** (Azure about 1,100 left in bots). Check that humans still win it without feeling forced into the Hammer.
- **Siege Hammer dominance** should be reviewed before v0.4 is finalised.
- **Gold surplus grows** (3,355 Gold at 15 min while defending). There is still no Gold sink.
- **Spawn queue:** validated as bounded (see [Extended wave queue](#extended-wave-queue-bounded)). While the 24 cap is full, the scripted waves can queue up to 44 Crimson entries; from wave 13 the queue cannot exceed 34.
- **Long matches:** no HP regeneration exists, so a defending Guardian eventually dies to attrition (about 28 min in bots), and v0.4's larger waves make that death cost more Azure HP.
