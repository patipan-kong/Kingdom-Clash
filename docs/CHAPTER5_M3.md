# Chapter 5 M3: The Divided Road (implemented, human-playtested, locked)

Status: implemented on top of the local commit `951341c` (`scratch/c5-allied-hero`) following `CHAPTER5_M3_DESIGN.md` revision 2 (PO: GO). **Not pushed, merged or deployed.** Chapter 5 stays **Coming Soon**. 

**PO human playtest (Galaxy S24): PASS.** Balance is very good; APPROVED and LOCKED, including the Basin Barracks pad at (20,17). No rebalance from bot results.

## What it is

campaign-43, Chapter 5 Mission 3, on `divided-road` (a data variant of Canyon Basin's geometry: same mesa, roads and camp circles, its own tower ids). Two Crimson camps behind one Keep shield, a Warden at the Basin Camp, a Raider released at 90 s from the north courtyard, the Tavern at Hero Cap 2, up to two Azure Barracks, waves of 8-10.

| Rule | Value |
|---|---|
| Start | 100 Gold, 220 Wood, 30 Iron (a Tavern and a Barracks exactly, at 0 s) |
| Waves | `[8,8,9,9,9,10,10,10]`, first at 30 s, every 30 s, slots (1776,480) / (1776,720), no flanks |
| Camps | Rim Camp (no Warden) and Basin Camp (Warden: anchor (1104,984), guard 220, respawn 45 s); 2 Elites on each camp's first capture; Banner 2,000 HP in 4 s; repair 60% in 5 s |
| Raider | spawn (1512,312), release 90 s, respawn 50 s |
| Barracks | cap 2, none at the start; pads (10,10), (10,14), (13,12) at home, (23,6) in the Rim Camp, **(20,17) in the Basin Camp** (moved from (21,20), PO-approved: see below); a camp pad opens when its own camp is Azure |
| Tavern | cap 2, Roland / Borin / Kael |
| Objective | capture both camps, then destroy the Crimson Keep (shielded while either camp is Crimson) |

## Changes (data and tests only)

- `src/world/battlefield.ts`, `battlefieldArt.ts`: `divided-road` (copies `canyon-basin`'s barriers, outposts, territory; Canyon art).
- `src/data/campaignLevels.ts`: `dividedRoadLevel` (campaign-43), registered after campaign-42.
- Tests: `tests/campaign-level-43.cjs` (19), `tests/support/dividedBot.cjs`; list tests updated for the new level: `battlefield-art`, `chapter-view` [6,6,6,6,3], `debug-launch`, `six-missions` (28 levels), `frost-gate`, `campaign-level-31`, `campaign-level-41`, and the "only Missions 1-3" assertion in `campaign-level-42.cjs` (it asserted that campaign-43 is not registered; no behaviour of M2 changed).
- Browser: `scripts/verify-divided-road.mjs`.
- **Not touched:** Simulation, Movement, `matchSetup`, `AzureBarracks`, SoldierProto, enemy AI, units, Chapters 1-4, M1, M2.

## Verification

- `tsc --noEmit` clean; full suite **1280 / 1280**; production build OK (only the existing chunk-size warning).
- **Basin pad fix (PO-approved, data only):** the pad moved from (21,20) to (20,17) in `campaignLevels.ts` and in the tests and the script. No other value changed (Raider, respawn, Elites, waves, resources, Barracks limit untouched). Re-verified: tsc clean, focused tests 20/20, full suite 1280/1280, production build OK, M3 browser check ALL PASS twice, M1 / M2 / Canyon Basin browser checks pass.
- `verify-divided-road.mjs` at 780 x 360, DPR 3: all checks pass on repeated runs (one earlier run lost a tap under software rendering; the script now retries a lost confirm). It covers: the start (100 / 220 / 30, plate, Warden in the south bowl, no Raider, Cap 2, shielded Keep, five pads, limit 2, no Barracks), the opening spend by taps (Tavern, then the first home pad: wood and iron end at 0, two footmen), pad states (home open, camp pads closed until their camp is Azure), the Rim capture by the Guardian (Keep still shielded, Rim pad opens, Basin pad stays closed), two Barracks placed by tap (home and Rim pad), the third refused at the cap, the Basin Camp capture (2 Elites, Keep still shielded), **the Basin pad (20,17) selected and placed by real taps with no simulation-command workaround**, the Guardian walking to it with movement commands and the Barracks completing beside him, its two footmen spawning, the second capture (both Azure, Keep vulnerable, plate "Destroy the Crimson Keep"), the footmen standing with the Guardian on the far road, the Raider at 90 s in the north with his release announced, and a busy-match unit peak (28).
- Regressions in the browser on this worktree: `verify-old-tavern` (M1), `verify-brothers` (M2), `verify-tavern` (one run missed the 30 s revive-timer check by 13 ticks under load, 887 against about 900; the re-run passed), `verify-hero-hud`, `verify-mobile-landscape`, `verify-crimson-fortress`, `verify-canyon-basin`. Chapters 1-4 by the full suite. Tracked screenshots were not overwritten.

## Bot results (comparative evidence, not a balance sign-off)

`tests/support/dividedBot.cjs`, commands only, five assault tempos per plan (0, 60, 90, 120, 150 s after every hero is hired; the simulation is deterministic, so tempo is the variation). Home Barracks pads unless stated.

Normal bot (the Guardian returns home when foes come within 420 px of the Keep):

| Plan | Wins | Time s | Median | Azure Keep min HP | Guardian deaths | Hero falls | Banners lost | Peak live units |
|---|---|---|---|---|---|---|---|---|
| concentrate-south | 5/5 | 191 191 207 259 264 | 207 | 3000 3000 2760 3000 3000 | 1 1 1 2 1 | 2 2 2 3 2 | 1 1 1 1 1 | 32 |
| concentrate-north | 5/5 | 203 203 246 238 255 | 238 | 3000 3000 2680 3000 3000 | 2 2 2 1 1 | 2 2 4 2 2 | 1 1 2 2 1 | 23 |
| split | 5/5 | 212 212 295 246 289 | 246 | 2360 2360 2840 3000 2200 | 2 2 3 2 2 | 3 3 5 4 3 | 0 0 3 1 1 | 21 |
| split-keep | 5/5 | 277 277 198 237 269 | 269 | 3000 3000 2680 3000 3000 | 3 3 1 2 1 | 5 5 3 2 2 | 4 4 1 2 2 | 22 |
| no-barracks | 5/5 | 191 191 278 258 270 | 258 | 3000 3000 2760 3000 2760 | 2 2 3 2 2 | 2 2 4 4 2 | 2 2 2 1 2 | 18 |
| none | 4/5 | 393 131 537 448 424 | 424 | 3000 **0** 680 2412 1320 | 6 2 4 3 3 | n/a | 5 0 7 4 2 | 22 |

Bot that commits to the assault and never returns home (the strictest test of "who guards the Keep"):

| Plan | Wins | Time s | Median | Azure Keep min HP |
|---|---|---|---|---|
| concentrate-south | 5/5 | 228 228 228 198 296 | 228 | 760 760 760 2200 2200 |
| concentrate-north | 5/5 | 237 237 237 265 247 | 237 | 2280 2280 2280 2200 2200 |
| split | 5/5 | 215 215 215 302 260 | 215 | 600 600 600 2200 1640 |
| split-keep | 5/5 | 210 210 210 214 296 | 210 | 2280 2280 2280 2200 2200 |
| no-barracks | **3/5** | 221 221 249 132 132 | 221 | 3000 3000 1480 **0 0** |
| none | **0/5** | 183 118 128 131 132 | 131 | 0 0 0 0 0 |

A forward Barracks (the second one on a camp pad) changes little: concentrate-south median 206 s (against 207 s), one Barracks lost in one run, Keep minimum 2440.

### Reading

- **Both lines work, with a tradeoff.** concentrate-south is the fastest and, in the normal bot, among the safest (median 207 s, Keep rarely touched). split finishes within 19% of it but with the lowest Keep HP in the normal bot (2200 to 2360), more hero falls (3 to 5) and Banner losses. concentrate-north is 15% slower. split-keep is the slowest (+30%) and loses the most Banners (the hero at home does not help the camps). No plan is clearly dominated, but **concentrate-south is the strongest line for this bot**; the human playtest must say whether that holds.
- **Barracks are useful, not mandatory.** With the same heroes, concentrate-south against no-barracks: median 207 s against 258 s (about 20% faster) and fewer Guardian deaths (1 against 2). Without a Guardian at home, Barracks plans win 5/5 with the Keep as low as 600 HP, while the no-Barracks plan loses the Keep in 2 of 5 runs. The no-Barracks plan still wins 5/5 with the normal bot. They do not trivialise the mission (the Keep is touched in no-recall runs and Banners fall in every plan).
- **No Barracks, no heroes is clearly worst**: 4/5 at a median of 424 s, 3 to 7 Banner losses, up to 6 Guardian deaths; with no return home it loses 5/5 (the Raider finishes the Keep at about 118 to 132 s).
- **Unit peak: 32 live units at most** (concentrate-south), against the 40 target; Crimson peak 24.
- **Allied Hero stalls:** at most 3 per run (3 s each), 0 to 1 give-ups; every run finished well under the 900 s cap, none deadlocked.

### Early losses and pathing

- The earliest unopposed Keep loss is the Raider's: first damage about 14 s after the 90 s release, Keep destroyed about 28 s later (test: first damage between 95 and 115 s, destroyed before 135 s). Every plan with a hero or a Barracks keeps the Keep above 0 in the normal bot; the loss appears only in the no-Barracks and none no-recall runs, where a Guardian and both heroes sit on the far side of the map for the whole release.
- Waves alone destroy the Keep at about 83 s if the Guardian does nothing (waves of 8-10); a home Guardian with a Barracks and three towers lasts to about 129 s. The first damage to a defended Keep comes after 40 s; the Tavern and Barracks are built by 9 s. Nothing in the first 30 s.
- No pathfinding stall or deadlock in any bot run; the Raider reaches the Keep unopposed (the Warden is in the south bowl, the Raider on the north road); the Warden's anchor (1104,984) neither blocks the Raider nor the Basin pad's placement.

## Balance concerns (none applied; for PO review)

1. **The bot finds M3 easier than 7/10.** Medians 207 to 269 s with the Keep untouched in most normal runs project to about 8 to 11 minutes for a human (M1's bot-to-human ratio about 2.4), under the 11 to 14 minutes in the design. The Raider is the only direct Keep threat, and a Defend hero or the Guardian's return stops him. If the human playtest agrees, the data knobs are, in this order: Raider release 90 to 75 s; Raider respawn 50 to 40 s; Elites 2 to 3 per camp; wave size to 10 from the start (`[9,9,10,10,10,10,10,10]`). If it plays too hard, the reverse: release 105 s, one Elite fewer.
2. **concentrate-south is strong.** The south road carries the Warden, so the strongest group meets the only camp hero first. A way to make the other lines more attractive without a mechanic: put the Warden at the Rim (Chapter 4 M5's arrangement), or increase the Rim's pressure. Left for the playtest.
3. **split-keep is the slowest and loses the most Banners** because the Defend hero is far from both camps; that is the intended price, but check that it does not feel like a trap.
4. **Gold:** the bot hires both heroes by 62 to 83 s, so the 100 Gold start plus kills is enough; check the human pace.

## Deviations and unresolved issues

1. **Basin pad moved to (20,17) (resolved).** At (21,20) the pad sat under the placement panel at 780 x 360 (pad y 383, panel top y 354, camera at its maximum scroll). At (20,17) it is on screen at y 279, 75 px above the panel top, and tappable. Verified in the browser at 780 x 360, DPR 3: the pad is visible and clear of the panel, a real tap selects it, a real confirm tap places the Barracks, and the old workaround that bypassed it is removed. Unit test: the pad lies inside the Basin build circle, 192 px from the nearest watchtower, off the flag, ruin and Warden (about 187 px from his anchor), opens only with its own camp, a walkable route reaches it from home, construction completes with the Guardian beside it, and two footmen spawn and follow him. No terrain, pathing or UI overlap was found. Note: a camp is Azure only after its watchtowers fall, which is why the pad is safe; a standing tower (range 240) would shoot a Barracks on it.
   - **Observation (existing AI, not changed):** footmen from the Basin pad advance on the Crimson courtyard tower (c5-yard-south, 480 px away) when the Guardian is near, and in the browser run both of the first two died to it (a replacement arrived 15 s later). Chapter 4 M5's pad had the same exposure. So a forward Basin Barracks costs footmen unless the Guardian keeps them in check, which is a real tradeoff for the human playtest. The earlier forward-Barracks bot sweep used the old pad (21,20); it was not re-run.
2. `tests/campaign-level-42.cjs` was edited (one assertion: campaign-43 is now registered). No M2 behaviour or data changed.
3. The bot is not a human; five tempos are not five random seeds; SwiftShader (12 to 16 FPS) is not S24 performance. The 40-unit target is met in the bot (32), not measured on the device.
4. The Chapter 5 painting and `mission-art-campaign-43.webp` are missing (as M1, M2). The Allied Hero and footman sprites are the Phase 1B upscaled art.
5. **Barracks reading, as approved:** footmen are tethered to the Guardian (they follow him; with him dead they tether to the Keep). No garrison AI was added; no Barracks AI changed.
6. The design file `CHAPTER5_M3_DESIGN.md` (revision 2) is still untracked; nothing is committed.

## Run it

`npm run dev -- --port 5371`, then `http://127.0.0.1:5371/?debug=1&level=43` (or `?debug=1&chapter=5&mission=3`). Browser check: `DIVIDED_URL=http://127.0.0.1:5371/ node scripts/verify-divided-road.mjs`. Bot: `node tests/support/dividedBot.cjs '{"plan":"split","startAt":2700}'`.
