# Balance v0.2 — final provisional candidate

Baseline: `4a869c9` (main at branch time). Branch: `balance-v0.2`. **Provisional playtest values, not canonical specification.** Original numbered specifications (`docs/01`–`09`) and Phase 1–3 documents are unchanged. Motivation and evidence: `docs/GAMEPLAY_BALANCE_INVESTIGATION.md`.

## Final rules (single source: `src/data/balanceV02.ts`)

| # | Rule | Before | After |
|---|---|---|---|
| 1 | Guardian basic-attack damage vs enemy towers/Keep, applied before the Siege Hammer ×1.25 (`Simulation.basicHit`) | ×1 | **×0.6** |
| 2 | Crimson (red) tower damage **to the Guardian** (`Simulation.basicHit`) | 18 | **24** |
| 3 | Crimson tower damage to allied minions and every other target | 18 | 18 (unchanged) |
| 4 | Crimson tower XP (`enemyXp.tower`) | 80 | **30** |
| 5 | Gold per Crimson minion kill (`Economy`, `reward` event) | 15 | **25** |

Unchanged: player-built tower damage (18, `buildings.tower`), Siege Hammer +25%, Guardian vs units, skills, artifact prices/effects, XP thresholds, tower layout, spawn geometry, win conditions, Shop UI, 30 Hz simulation, attack cadence, targeting, range and line of sight. Revert by restoring the "before" values.

Mechanics: the tower still resolves through the normal `basicHit`/`hit` path. Only the base damage number changes when `source.kind==='tower' && source.team==='red' && target.kind==='guardian'`. No target-priority change. Player-built towers are blue and never take the branch. Shield, armor, Crit and mitigation apply after the number as before.

## Why this rule (v0.2b sensitivity, bots only)

A uniform increase of Crimson tower damage (22/24/27) shortened allied minions' lives and cut their structure damage by 36–55% (parked-Guardian run 198 → 126/108/90) and lowered Azure's 8-minute HP with four player towers (2,514 → 2,352/1,722/1,740). Applying the increase to the Guardian only keeps the intended rush deterrent and preserves minion behavior.

Final candidate vs original baseline and uniform-27 (bot results, not human durations; `test-results/balance-v02/`, git-ignored):

| Scenario | Original | Uniform 27 | **Final (24 vs Guardian)** |
|---|---|---|---|
| Rush, no purchases | 76.6 s, 1 death | 156.5 s, 3 | **132.4 s, 2** |
| Rush + Iron Sword | 74.3 s, 1 | 122.8 s, 2 | 124.7 s, 2 |
| Shield: farm, buy, push | 242.2 s, 0 | 246.9 s, 2 | 225.5 s, 1 |
| Hammer: farm, buy, push | 266.6 s, 0 | 233.8 s, 1 | 228.3 s, 1 |
| Allied minions only (Guardian parked) | defeat 111.6 s, 198 struct dmg | defeat 111.5 s, 90 | defeat 111.6 s, **198** |
| Parked + 4 player towers, Azure HP at 8 min | 2,514 | 1,740 | **2,514** |
| Defend (minion structure damage) | 576 | 90 | **576** |
| Defend to wave 6, then push | 309.7 s, 1 | 387 s, 2 | 346.9 s, 1 |

Gold for a defender: 450 at 1:39 and 550 at 2:19 (original 2:23 and 3:36).

## Known limitations

- Bots are idealized; a rush still beats every prepared line, so this slice does not make "prepare then attack" optimal and does not reach 8–12 minutes.
- Bot results are single trajectories and some are non-monotonic; read trends, not cells.
- The Shield reduces but does not remove rush deaths (1 vs 2); it never produced 0 in the rush fixtures.
- Tower Inspect UI shows no damage number, so the Guardian-specific 24 is not displayed.
- Missing from the original specs and still absent: Gold mines, building repair, Azure pressure while the Guardian rushes.

## Human playtest criteria (≥ 3 natural matches, no developer Gold)

1. Rush deaths feel fair rather than a loop (record deaths per match; concern if > 4 in one attack).
2. First Shield/Hammer purchase happens before the attack at least once, and the player can say why.
3. Allied minions visibly contribute at the tower cluster.
4. Azure feels threatened at least once when the Guardian leaves.
5. Record match time without treating bot times as targets.
