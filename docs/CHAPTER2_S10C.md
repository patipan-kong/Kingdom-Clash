# Chapter 2 S10C-A — Levels 18–19

Branch `chapter2/s10c-a-levels-18-19`, baseline `2f3c9aa` (S10B, Levels 15–17 approved). Status: human playtested; **Levels 18 and 19 are approved and their balance is locked** (Level 18: 3:46 victory, Azure Keep 2,122, one Guardian death; Level 19 with 0 Gold: 4:09 victory, Azure Keep 2,712, two Guardian deaths). The bot results below are preliminary evidence gathered before the playtest.

Both levels are configuration only: existing objectives, enemy types, battlefields and overrides. No shared combat, objective evaluation, AI, spawn logic, Raider stat, save format or asset was touched. Level 20 and the v2 save migration are not part of this slice (`campaign-20` stays unregistered).

## Configurations

Both use the extended encounter, `until-objectives` waves, `firstWaveTick: 300`, no allied reinforcements, an **empty start** (Level 18: 0 Wood, 0 Iron, 250 Gold; Level 19: 0 Wood, 0 Iron, **0 Gold** after the Level 19 playtest, see "Level 19 starting Gold"), the Shop open, and failure when the Azure Keep falls below 50%.

| | Level 18 The Twin Banks | Level 19 The Sandstone Line |
|---|---|---|
| Map | Oasis | Canyon Pass |
| Waves | `[3,3,4,5,6,6,7,8]` | `[3,4,4,5,5,6,6,7]` |
| Raiders per wave | `[0,0,2,2,3,3,4,4]` | `[0,0,2,2,3,3,4,4]` |
| Interval (ticks) | 800 | 750 |
| Lanes | waves 3–8, seeded and committed (S10A split shape) | none |
| Crimson towers | front north/center/south, defenders only | front ×3 and both gate towers, defenders only |
| Crimson Keep | inert, **vulnerable** (3,000 HP) | inert, **invulnerable** |
| Phases | `hold` (2 towers + 5 waves) → `siege` (destroy the Crimson Keep) | `hold` (2 towers + 6 waves) → `line` (2 of 3 front towers) → `gates` (both gate towers) |

- Level 18 south-bank split per wave (waves 3–8): `[1,2] [1,2] [2,3] [2,3] [3,4] [3,5]`, never leaving the north bank empty.
- The Level 19 Guardian level-5 objective of the design is removed (redundant).
- Objective ids are unique per mission (the mission validator requires it), so Level 19's phases are `hold`, `line`, `gates` and its objectives `towers`, `waves`, `front`, `gatetowers`.

## Level 19 starting Gold

Playtest: Level 18 approved (3:46 victory, Azure Keep 2,122, one Guardian death, three towers, Guardian Shield bought). Level 19 with the default 250 Gold passed (4:02, Azure Keep 2,874, Guardian Shield and an attack item bought) but felt slightly easier than Level 18. With 0 Gold the owner measured a 4:09 victory, Azure Keep 2,712, two Guardian deaths, difficulty similar to the original, and accepted it as the final balance. Level 19 `start.gold` went from the default 250 to **0**; nothing else changed (Level 18 keeps 250).

Gold income is Crimson-minion kills only (25 Gold per kill in waves 1 to 12, `balanceV02.crimsonMinionGold`); there is no passive Gold income. Catalog prices: Ruby Gem 150, Iron Sword 200, Builder's Crown 450, Guardian Shield 500 (+250 HP, +15 armor), Siege Hammer 550. Measured with the shared bot (which never buys, so its balance is start + kill rewards; the two variants play identically, 25/25 runs):

| Purchase | Affordable, 250 Gold start | Affordable, 0 Gold start |
|---|---|---|
| Ruby Gem (150) | at once | 46 s |
| Iron Sword (200) | at once | 66 s |
| Guardian Shield (500) | 69 s | 119 s |
| Shield + Iron Sword (700) | 117 s | 167 s |
| Siege Hammer (550) | 91 s | 141 s |

Times are for hold-first play on any route; departing at 60 s or 90 s delays them by a further 0 to 20 s. Bot results are identical in both variants (Shop unused): hold-first 218 to 259 s, raid at 10 and 30 s defeat, parked defeat at 49 s. Human Shop use is an estimate from the table above, not measured.

## Why the empty start

A reduced start (100 Wood, 10 Iron) was measured not to stop rushing on Level 18 (S10C Final Experiment): destroying the Keep early is still credited when the siege phase opens, and a raid during the hold won faster than the intended order. An empty start leaves home too weak to survive a departure before about 60 s. Level 19 with the default start was won by a raid at 10 s.

## Shared changes

None in `src/` beyond data: `campaignLevels.ts` (two levels) and the `campaignChapters.ts` narrative ("first nine missions are released"). The existing registration, chapter-view and lane/flank/commit tests were updated for the two new registered levels (counts 7→9, pending 3→1, Level 18 exempt from the "no lanes" and "vulnerable Keep" guards, hypothetical unregistered ids moved from 18/19 to 20/21). No assertion about Levels 1–17 behaviour changed.

## Bot matrix (shared bot, real `campaign.setup`, Level 18 over lane seeds 1–20)

Policies: *never return* leaves when the hold ends and does not come home; *return* also comes home when raiders approach the Azure Keep; *raid at N s* leaves at N s and ignores the hold; *parked* never leaves the Keep.

### Level 18

| Policy | Towers | Wins | Win time | Defeat time | Azure Keep min | Guardian deaths | Spawn deferral |
|---|---|---|---|---|---|---|---|
| never return | 2 | **20/20** | 194–214 s | – | 2,382–2,928 | 1 | ≤ 1.7 s |
| return home | 2 | **7/20 (35%)** | 253–341 s | 215–271 s | 1,468–2,844 | 0–2 | ≤ 1.9 s |
| return home | 3 | **19/20 (95%)** | 195–257 s | 246 s | 1,494–2,928 | 1 | ≤ 1.7 s |
| return home | 1 | 0/20 | – | 272 s or unfinished | 1,484–2,928 | 1–3 | ≤ 1.7 s |
| never return | 1 | 2/20 | 276–391 s | 253 s or unfinished | 1,476–2,928 | 1–3 | ≤ 1.7 s |
| raid at 10 s | 2 | **0/20** | – | 54 s | 1,488 | 1 | 0 s |
| raid at 30 s | 2 | **0/20** | – | 112–119 s | 1,480–1,498 | 1 | ≤ 0.4 s |
| raid at 60 s | 2 | **2/20 (10%)** | 159 s | 140–188 s | 1,464–2,830 | 1 | ≤ 1.7 s |
| raid at 90 s | 2 | 16/20 (80%) | 153–183 s | 178–189 s | 1,486–2,928 | 1 | ≤ 1.7 s |
| parked | 2 | 0/20 | – | **54 s** | 1,488 | 0 | 0 s |

Every acceptance criterion passes. The raid at 90 s (80%) is above the 75% ceiling of the final-experiment report; it was not among the owner's criteria and is reported as a finding, not retuned.

### Level 19 (deterministic: one run per policy and route)

| Policy | Route | Result | Time | Guardian deaths | Towers lost | Spawn deferral |
|---|---|---|---|---|---|---|
| hold first, return when threatened | north | victory | 239 s | 2 | 0 | 0.2 s |
| hold first, return when threatened | south | victory | 259 s | 2 | 0 | 0 s |
| hold first, return when threatened | flanks | victory | 238 s | 2 | 0 | 6.0 s |
| hold first, return when threatened | sides | victory | 239 s | 2 | 0 | 0 s |
| hold first, never return | north / south / flanks / sides | victory | 218 / 216 / 222 / 217 s | 2 | 0–2 | ≤ 4.2 s |
| raid at 10 s | north / south | **defeat** | 61 / 55 s | 2 | 0 | 5.9 / 5.1 s |
| raid at 30 s | north / south | **defeat** | 86 / 83 s | 2 | 1 | 5.6 / 7.5 s |
| raid at 60 s | north | victory | 163 s | **3** | 1 | 5.5 s |
| raid at 60 s | south | **unfinished** (stranded, 8 towers lost) | 533 s | 2 | 8 | 0 s |
| raid at 90 s | north / south | victory | 167 / 164 s | 2 | 1–2 | 0 s |
| parked | – | defeat | 49 s | 0 | 0 | 0 s |

The Crimson Keep stays at 3,000 HP in every Level 19 run.

## Findings (investigated, not retuned)

1. **Level 19 hold-first without returning finishes in 216–222 s**, three of four routes a few seconds under the 220 s floor. Holding first and returning when threatened (the canonical policy) is 238–259 s. The committed test asserts the 215–300 s band for the never-return policy and 220–300 s for the returning one.
2. **The Level 19 shortcut costs an extra Guardian death only for departures at about 50–60 s** (3 deaths against 2 for holding first). Leaving at 70–150 s wins in 148–221 s with the same 2 deaths, so for those departures the shortcut is a free 20–90 s saving. A sweep of departure times (north / south): 40 s defeat (87 / 79 s); 50 s 154 / 162 s with 3 deaths; 70 s 171 / 148 s; 80 s 159 / 155 s; 100 s 178 / 174 s; 120 s 190 / 190 s; 150 s 221 / 220 s. The canyon home is safe with two towers, so leaving once they stand is not punished. The owner's criterion ("requires at least one additional Guardian death") is therefore met at 60 s on the north route and not at 70 s or later. This needs an owner decision (accept, or add a mechanism in a later slice); it was not rebalanced.
3. **South-route shortcut can strand the Guardian**: a raid at 60 s on the south route did not finish (the Guardian was stranded and eight towers were lost). Hold-first and the 90 s departure on the same route pass. This is a bot pathing observation; a human playtest should confirm whether a human can recover.
4. **Spawn deferral** (shared engine behaviour, not fixed): Level 18 at most 1.9 s on the tested wins; Level 19 up to 6.0 s on the flanks route (above the 5 s used as a Level 18 limit, not a Level 19 criterion). Failed raids see 5–7.5 s because the Guardian stands forward.
5. **Level 18 with one tower** cannot reliably win (never return 2/20, return 0/20): two towers are the real minimum, and the briefing says a spare third tower lets the player come home mid-siege (3 towers returning: 95%).
6. The bot never uses the Shop, so Siege Hammer and Guardian Shield effects are untested; one Siege Hammer run should be part of the playtest.

## Verification (S10C-A)

| Check | Result |
|---|---|
| Focused tests, `tests/campaign-levels-18-19.cjs` | 16/16 (Level 18 matrix on 10 lane seeds by default; `KC_SEEDS=20 node scripts/test.mjs campaign-levels-18-19.cjs` reruns it on 20) |
| Full headless suite | 864/864 (848 existing + 16 new) |
| `tsc --noEmit` and `npm run build` | pass |
| Campaign browser scripts (dev server) | chapters 33, campaign-progress 129, campaign-ui 34, campaign-selection 51, campaign-levels 90, campaign-polish 39, campaign-popup 173, menu-readability 170, canyon-pass 69/69: all pass |
| Levels 18–19 in the real UI (scratch probe, not committed) | 35/35: locked before and available after the previous level, only Level 20 pending, briefing text fits at 960×540 and 844×390, live matches start with income-only Wood/Iron and 250 Gold, correct map, towers and Keep state, HUD rows, 50% failure line, no page or console errors |
| `campaign-playthrough` (headed Level 1 real-time run) | does not complete in this environment: times out waiting for the match to become visible. It fails identically on the unmodified `2f3c9aa` build, so it is an environment limitation and not a regression |
| Legacy replay comparison | 40 runs (Levels 1–17 and Full Battle, active and parked policies, lane seeds 1 and 3 where lanes exist) give the same final hash on `2f3c9aa` and on this branch; 40 distinct hashes |
| `git diff --check` | clean |

A briefing body longer than about 320 characters wraps to a fourth line and overlaps the "PRIMARY OBJECTIVES" heading at 960×540 (found by the UI probe on the first drafts of both briefings; Level 14, the longest existing one, is 311). Both briefings were shortened to 282 and 269 characters (Level 19 now reads "you start with no Gold, Wood or Iron"), and the test asserts the 320 limit.

## Human playtest

**Level 18 — The Twin Banks** (unlocks after Level 17):
1. You start with 0 Wood and 0 Iron (and 250 Gold): confirm the briefing explains this and that the first tower arrives after about 40 s.
2. Build two towers (a third if Wood allows) near the shore outposts and survive five waves. Read the wave notice: it gives the north/south split.
3. After the fifth wave the objective turns into "Destroy the Crimson Keep". Cross the oasis and destroy it. Note how many Guardian deaths it costs and whether the front towers feel dangerous.
4. Try leaving early (at 10 s, 30 s, 60 s) and see whether home survives; try coming home mid-siege with two and with three towers.
5. Judge: 3–4.5 minutes? Does it feel different from Level 16 (one long commitment instead of three short fights)? Is the empty start understood?

**Level 19 — The Sandstone Line** (unlocks after Level 18):
1. Same empty start, now with **0 Gold** too: the Shop cannot buy anything until about 46 s (Ruby Gem) or 66 s (Iron Sword); the Guardian Shield comes at about 2:00. Hold the mouth with two towers for six waves. Note when you first afford a purchase and whether the level still feels easier than Level 18.
2. Destroy any two front towers (the HUD says 2 of 3), then both gate towers. The Crimson Keep cannot be damaged: confirm it is clear that it is not a target.
3. Try leaving at 60–90 s: how much faster, and how many Guardian deaths? Does the north or south side feel like a choice? Does the safe home make the hold boring?
4. Judge: about 4–4.5 minutes? Does the three-phase order read clearly in the HUD?
