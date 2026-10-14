# Gameplay v0.3 — strategic pressure experiment (provisional)

Branch `gameplay-v0.3`, based on main e363bf2 (Balance v0.2, UI-A2, Shop hotfix). **Experimental, not approved final balance.** All values live in `src/data/gameplayV03.ts` with "was" notes; Balance v0.2 values stay in `src/data/balanceV02.ts`.

## Rules
| System | Rule |
|---|---|
| Aggro | Round 2: Crimson minions acquire an unprovoked Guardian only within **160** units (was 560); the pursuit is kept to **260**. After a valid Guardian hit (`retaliateTick`) the minion is provoked for **120 ticks** and acquires out to **320**, keeping the pursuit to **420**. Every other target keeps the 560 sight range. |
| Leash | A pursuit ends after **300** units of travel or **300 ticks** (10 s). The Guardian is then ignored for **120 ticks** (4 s), except when in attack reach. Hits during the cooldown neither shorten it nor start a new pursuit. |
| Retaliation | A Guardian hit stamps `retaliateTick`, widens acquisition to 320 for 4 s and lets the minion re-evaluate immediately. It never moves the pursuit origin or timer, so repeated hits cannot extend a pursuit. |
| Waves | Waves 1–12 unchanged. From wave 13, every 40 s, **8** Crimson minions, **+1 every 3 waves**, capped at **10**; allied spawning stays 2 per wave on the same slot rotation. A team already holding a full spawn queue gets no extra entries, so the queue is bounded (red ≤ 34, blue ≤ 18). Existing population caps (24 red / 16 blue) are unchanged. No timer or terminal condition. |
| Gold | Crimson minion kills from wave 13 onward pay **10** (was 25). |
| Respawn | `min(22, 8 + 0.5 (level-1) + 3 priorDeaths)` seconds (was `min(25, 5 + 0.8 (level-1))`). `priorDeaths` = `state.guardianDeaths`, incremented at each death; a restart builds a new Simulation, so it resets. Full-HP respawn, progression, inventory, Gold and dead-state trading are untouched. |
| HUD | The existing "Revive Ns" text reads `respawnTick`, so it follows the authoritative timer. The wave label reads `Wave n / 12` through wave 12 and `Wave n` afterwards. |

## Files
`src/data/gameplayV03.ts` (new), `src/simulation/MinionAggro.ts` (new), `src/simulation/Movement.ts`, `src/simulation/Simulation.ts`, `src/simulation/GameState.ts`, `src/simulation/Economy.ts`, `src/data/encounters.ts`, `src/data/progression.ts`, `src/scenes/HUD.ts` (wave label only), `tests/gameplay-v03.cjs` (new) and fixture updates in `tests/encounter.cjs`, `tests/navigation.cjs`, `tests/progression.cjs`, `tests/artifact-transactions.cjs`.

## Deterministic bot scenarios (MEASURED; bots are not humans, times are not targets)
main = e363bf2, v0.3 = this branch. Azure HP of 3,000 is full; "reach" = distinct Crimson minions that entered the Azure half (x < 970).

| Scenario | main | v0.3 |
|---|---|---|
| Rush, no purchases | win 132 s, 2 deaths, Azure 3000, reach 0 | win 167 s, 3 deaths, Azure 3000, reach 0 |
| Shield prep + push | win 352 s, 1 death, Azure 3000 | win 347 s, 1 death, Azure 3000 |
| Hammer prep + push | win 314 s, 1 death, Azure 3000 | win 314 s, 1 death, Azure 3000 |
| Defending (15 min) | Azure 3000, 66 kills, Gold 1900, LV16 | Azure 3000, 160 kills, Gold 2840, LV20, peak 19 entities |
| Guardian dead / parked | defeat at 114 s / 112 s, first damage 35 s | defeat at 114 s / 114 s, first damage 35 s |
| Parked + 4 player towers | survives 15 min, Azure 2244 | **defeat at 824 s**, first damage 796 s, 21 waves |
| Defend 25 min | 66 kills, Gold 1900 | 310 kills, Gold 4340, 38 waves, peak 19 entities |
| Push after wave 12 | win 557 s | win 569 s |

Aggro sensitivity (scratch override of the acquisition range, retain = acquire + 100): the rush only leaks to Azure when acquisition is **160 or less** (Azure −666 at 160, first damage 115 s; −1,506 at 80, first damage 111 s). Defend, Shield and Hammer stay at 3000 for every value.

## Result against the acceptance criteria
- **Meaningful Azure pressure on a rush: not achieved at 320.** The rushing Guardian stands in the minions' spawn, so they fight it inside any plausible acquisition range and never cross the map. Recommended tuning is below.
- **Defense remains viable:** a defending Guardian still shuts out every wave, with no Azure damage through 25 minutes.
- **Repeated deaths are more consequential:** the death timers are 8 s, 11 s, 14 s, 17 s, 20 s, 22 s at LV1; the bot rush gained about 35 s from them.
- **Battlefield stays populated** after wave 12, with entities bounded (peak 19 with a defending Guardian, 27 in the worst scenario including player towers).
- **Gold:** late waves pay 10, but a defender still ends with 2,840 Gold at 15 min and 4,340 at 25 min. Gold is dead once the six items are bought; this is a sink question, not a pacing one.
- **Determinism:** identical JSON state across repeated runs for the aggro, long-run and respawn tests.
- **Too fast?** Only an absent Guardian loses (parked with four towers at about 13.7 min, dead at 1:54); that appears intended.

## Known limitations and tuning recommendations
1. Lower the acquisition range toward 160 for a non-retaliating minion (keep 320 for retaliation), or add "advance-first until the Azure half". Only then does a rush create a defensive tradeoff.
2. Leash and ignore window are untested at human kiting patterns.
3. Retaliation lets a Guardian that pokes every few seconds drag a minion about one leash length per poke.
4. Gold needs a sink or a lower late-wave payout before long matches.
5. The Inspect panel does not show aggro or the new respawn formula.
6. Browser checks and mobile device performance were not run for this experiment.

## Round 2: 160 / 320 aggro split (replaces the 320 result above)
Scenario table, bots, MEASURED (main = e363bf2). Azure 3000 is full; reach = distinct Crimson minions that entered the Azure half.

| Scenario | main | v0.3 round 1 (320) | v0.3 round 2 (160/320) |
|---|---|---|---|
| Rush | win 132 s, Azure 3000, 2 deaths | win 167 s, Azure 3000, 3 deaths, reach 0 | win 151 s, **Azure 2334**, first damage 114.8 s, 2 deaths, reach 3 |
| Shield + push | win 352 s, Azure 3000 | win 347 s, Azure 3000 | win 357 s, **Azure 1200**, first damage 311 s, reach 25 |
| Hammer + push | win 314 s, Azure 3000 | same | win 314 s, Azure 3000, reach 21 |
| Defend 15 min | Azure 3000, 66 kills, Gold 1900 | 160 kills, Gold 2840 | Azure 3000, 160 kills, Gold 2840, 23 waves, peak 19 |
| Dead / parked | defeat 114 s / 112 s | 114 s | defeat 114 s, first damage 35 s |
| Parked + 4 towers | survives, Azure 2244 | defeat 824 s | defeat 824 s, first damage 796 s, peak 27 |
| Defend 25 min | 66 kills | 310 kills, 38 waves | 310 kills, Gold 4340, 38 waves, peak 19 |
| Push after wave 12 | win 557 s | win 569 s | win 577 s, Azure 3000 |

Targeting share (guardian / structures+base / minions): rush 17/32/51 %, Shield 11/34/55 %, Hammer 13/15/71 %, defend 9/12/78 %.

Findings: the rush now costs Azure 666 HP (22 %) and the Shield push 1,800 HP (60 %), both still won. Hammer is unaffected because its push clears the waves too fast to leak. A defending Guardian still stops everything. No empty field, bounded entities, no new exploit found in the headless tests (hits cannot extend a leash). The Shield outcome (1,200 HP left, 46 s before the win) is the closest to "too severe"; a human who dies once more in that push would probably lose Azure.

## v0.3.1A Keep Defense Slice A
The extended encounter now has **8 Crimson towers**: `red-tower-keep-rear` at (1760, 600) covers the Keep's east face, which the Keep hid from every original tower. Stats and all other rules are unchanged. See [Keep Defense Slice A](KEEP_DEFENSE_SLICE_A.md).
