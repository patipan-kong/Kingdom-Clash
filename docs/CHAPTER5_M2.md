# Chapter 5 M2: Brothers in Arms (implemented, human-playtested, locked)

Status: implemented on top of local commit `fabe5f6` (`scratch/c5-allied-hero`) following `CHAPTER5_M2_DESIGN.md` (PO: GO, Option B). Not committed, pushed or deployed. Chapter 5 stays **Coming Soon**. Every balance value is provisional until the human playtest.

**PO human playtest (Galaxy S24): PASS.** Difficulty about 4-5/10 accepted and locked; two hires affordable; Banner counterattack fun and manageable; Follow/Defend matter; no blocking pathfinding; mobile performance and controls acceptable; the Raider did not force Azure Keep defense, accepted for M2. No rebalance from bot results.

## What it is

campaign-42, Chapter 5 Mission 2: Hero Cap 2 (Roland / Borin / Kael), a Crimson **Warden** guarding the Crossroads Camp, a Crimson **Raider** released at 100 s (respawn 60 s), three Elites on the first capture, the south flank on waves 4 and 7. All from existing systems. No Barracks, Ballista, War Cart or new enemy behaviour.

| Rule | Value |
|---|---|
| Start | 100 Gold, 140 Wood, 15 Iron |
| Waves | `[5,5,6,6,6,7,7,8]`, first at 25 s, every 30 s; south flank (all units) on waves 4 and 7 |
| Camp | Crossroads Camp (Forest Edge geometry): two watchtowers, ring 96, Banner 2,000 HP in 4 s, ruin repair 60% in 5 s |
| Warden | camp hero, anchor (1128, 540), guard 220, respawn 45 s; becomes a Banner hunter once the camp is Azure |
| Raider | `setup.hero` spawn (1752, 600), delay 100 s, respawn 60 s; Banner, then Azure towers in the camp, then the Azure Keep |
| First capture | three Elite Soldiers, once; the Keep shield drops while the Banner stands |
| Tavern | cap 2, roster Roland / Borin / Kael, 100 W + 10 I; hire 150 / 180 / 200, Revive 45% after 30 s |
| Barracks | none (tray: Tower, Wall, Tavern) |

## Code changes (minimal)

- `src/data/matchSetup.ts`: one narrow explicit condition, `wardenRaider` = the camp has its own Warden, the setup has a Tavern and a `hero`, and there are no `posts` and no garrison. Only then may a single `post` carry `setup.hero` (and the hero validator accepts it). Chapter 4 single posts, M1 (no Warden) and any non-Tavern setup are still rejected (tests assert each). Simulation and Movement are unchanged.
- Data: `brothersInArmsLevel` (`campaignLevels.ts`), `brothers-in-arms` battlefield and art entry (a data variant of Forest Edge: its geometry and south trail, its own towers `c5-cross-north/south` and tree clumps).
- New: `tests/campaign-level-42.cjs` (13 tests), `tests/support/brothersBot.cjs`, `scripts/verify-brothers.mjs`. Hardcoded list tests updated for the new level (`battlefield-art`, `chapter-view`, `debug-launch`, `six-missions`, `campaign-level-31`, `frost-gate`, `campaign-level-41`).

## A measured data fix: the Warden blocked the Raider

With the design's Warden anchor (1128, 600) on the road's centre line, the Raider walked up to him and **stopped for good** (no Keep damage in 300 s). Anchors (1128, 540), (1056, 600) and (1128, 660) all let him through. The anchor is now (1128, 540); the Warden still covers both watchtowers and the ring (guard 220). A test (`the Warden no longer blocks the road`) guards it.

## Raider unopposed (PO item 4)

Calm waves, Guardian parked far east, no Defend hero: the Raider appears at 100 s, first Keep damage at about 118 s, **Azure Keep destroyed at about 146 s** (about 28 s of hitting; 46 s after release). The design's estimate (about 30 s) holds. With the waves running and no player at all the Keep falls at about 90 s, before the Raider.

## Bot sweep (production level, commands only; the bot is not a human)

Five tempos per plan stand in for variation (the simulation is deterministic and the crit seed does not change outcomes): the player starts the assault at 0, 60, 90, 120 or 150 s (after every hero is hired). Plans: **balanced** (Borin Defends the Keep, Roland Follows), **follow2**, **defend2** (Roland and Borin Defend), **none**.

Normal bot (the Guardian returns home when foes are within 420 px of the Azure Keep, as a player would):

| Plan | Wins | Time s | Median | Azure Keep min HP | Guardian deaths | Hero falls | Banner lost | deaths + falls in the 60 s after capture |
|---|---|---|---|---|---|---|---|---|
| balanced | 5/5 | 171 171 179 183 292 | 179 | 3000 3000 3000 2840 2600 | 1 1 1 0 2 | 2 2 2 1 4 | 2 2 1 0 1 | 2 2 3 0 2 |
| follow2 | 5/5 | 148 148 180 209 242 | 180 | 3000 3000 3000 2760 2760 | 1 1 1 1 1 | 1 1 2 2 3 | 1 1 2 1 1 | 2 2 1 2 2 |
| defend2 | 5/5 | 165 165 176 213 241 | 176 | 3000 3000 3000 2760 2760 | 1 1 1 1 1 | 2 2 2 3 3 | 1 1 2 1 1 | 3 3 1 3 2 |
| none | 5/5 | 190 312 283 449 367 | **312** | 2680 2440 2520 2680 1960 | 4 4 3 4 3 | n/a | 1 1 1 3 2 | 2 1 1 1 1 |

Bot that commits to the assault and never returns home (the strictest test of "who guards the Keep"):

| Plan | Wins | Time s | Median | Azure Keep min HP | Guardian deaths |
|---|---|---|---|---|---|
| balanced | 5/5 | 184 184 192 224 232 | 192 | 3000 3000 3000 1640 2600 | 2 2 2 3 1 |
| follow2 | 5/5 | 133 133 180 220 237 | 180 | 3000 3000 3000 1240 2600 | 1 1 2 2 2 |
| defend2 | 5/5 | 179 179 219 232 298 | **219** | 3000 3000 **386** 2120 2280 | 2 2 3 1 3 |
| none | **2/5** | 255 140 125 138 336 | 140 | 164 0 0 0 600 | 5 3 2 1 3 |

Reading (comparative only):
- **No Hero is clearly disadvantaged.** With the Guardian guarding home it takes a median 312 s against about 178 s (+75%) and loses 3 to 4 Guardians per run against 1; if the player does not return home it **loses the Azure Keep in 3 of 5 runs**.
- **2 Defend sacrifices tempo** (median 219 s against 180 to 192 s without recall, the slowest hero plan), and the Keep still dipped to 386 HP once, so defending is not free either.
- **2 Follow is the fastest** (133 to 148 s at the earliest tempos), but its Azure Keep minimum (1240 once, otherwise 2600 or more) is not reliably worse than balanced in the bot. The differences between balanced, follow2 and defend2 are smaller than the tempo differences, so the bot does not show 2 Follow as clearly riskier. A human who commits both heroes and ignores the base is a case the bot models only partly.
- All hero plans win every run. Allied Hero stalls: 0 to 4 per plan, each a 3 s episode near the camp and the Warden, resolved by the stall breaker (no deadlock, no timeout, no run over 450 s).

## Banner capture spike (PO item 6)

After the first capture the Warden (as Banner hunter), the Raider (if released) and the three Elites converge on the Banner. In the normal-bot runs with a hero plan the Banner fell at least once in 14 of 15 runs (it must then be retaken, and the Keep is shielded again meanwhile), with 0 to 3 Guardian deaths or Hero falls in the next 60 s. Every run still won. This is a real but moderate spike, not excessive for 5/10, so nothing was changed. If the human playtest finds it too hard: Elites 3 to 2 first, then Warden respawn 45 to 60 s, then Raider release 100 to 120 s.

## Timing against the target (PO item 5)

Bot medians are 176 to 312 s (about 3 to 5 minutes). M1's bot took 109 to 149 s for a human 4:26 to 6:00 (about 2.4 times), so M2 projects to **about 7 to 10 minutes** for a human, in line with the design. This is not a human result.

## Verification

- tsc clean; full suite **1260 / 1260**; production build OK.
- `verify-brothers.mjs` (780 x 360, DPR 3, real taps): all checks pass (start state, three Build cards, Tavern, two hires, third refused, Hero Bar with two heroes, Defend and Follow orders, Raider at 100 s met by the Defend hero, camp capture, shield, Elites, no pad).
- Regressions: `verify-old-tavern` (M1), `verify-tavern`, `verify-hero-hud`, `verify-mobile-landscape`, `verify-crimson-fortress` all pass; Chapters 1 to 4 by the full suite.

## Proposed balance adjustments (none applied beyond the Warden anchor)

1. Keep the values as they are for the playtest; the bot shows no excessive difficulty.
2. If the human finds it too easy: release the Raider at 80 s. Too hard: Elites 3 to 2, then Warden or Raider timings.
3. The strategy differences are not sharp in the bot. A candidate to make 2 Follow riskier without new mechanics: Raider respawn 60 to 45 s. Left for the human playtest.

## Known issues

1. The Chapter 5 painting and `mission-art-campaign-42.webp` are missing (same as M1).
2. Allied Hero stalls of about 3 s near the camp towers and the Warden's anchor (0 to 4 per run, resolved).
3. The Hero sprites are upscaled and soft (Phase 1B art).
4. Not profiled on a real S24: the browser runs used SwiftShader (12 to 16 FPS there).
5. The bot is not a human; five tempos are not five random seeds.
