# Chapter 2 S9C — Seeded dual-lane assault (Level 14)

Branch `chapter2/s8-level-14`, baseline `2629254` (S8). Status: implemented, awaiting review, not committed. Option B of the S9B design only: a deterministic per-unit north/south lane split. No route commitment, no enemy damage scaling, no stat tuning, no new level. Every balance value is provisional and awaits a human playtest.

## Why

Human playtest of Levels 11 to 14 said enemy routes were predictable and pressure felt low. S9B measured the cause: untagged units all take the north bank (the south bank only saw the tagged waves 4, 6 and 8), allies took 49 to 63 percent of enemy aggro, and the data model could only tag one lane per wave. S9C removes the predictability and the allies on Level 14.

## Architecture

- **Data model** (`src/data/encounters.ts`, `src/data/matchSetup.ts`). `WaveRules.lanes?: {wave, south:[min,max]}[]` and `WaveRules.laneSeed?: number`. Opt-in: a wave with no `lanes` entry is built exactly as before, and the existing S7 `flanks` are untouched. `WaveLaneSplit` is the entry type; `Encounter.waves[i].lanes` carries the actual `{north,south}` counts.
- **Seeded split** (`laneSplit`, `laneHash` in `encounters.ts`). A stateless 32-bit hash of `(seed, wave, slot)`. For a split wave: the south count is `min + hash(seed,wave,0) mod (max-min+1)`; the units are ranked by `hash(seed,wave,index+1)` (ties by index) and the lowest `south` units go south, the rest north. The result is a pure function of seed, wave and the wave data. It does not read `criticalRandom`, `matchId` or `Math.random`, so lane choice never depends on combat order. Unit ids, order, ticks, positions and Raider placement (last indices) are unchanged; only `SpawnEntry.lane` is added, on every unit of a split wave (north units get an explicit `north` lane and use the existing S7 per-unit flank mechanism and the `flankVia` waypoints).
- **Validation** (`matchSetup`). `lanes` must name each scripted wave at most once, never a wave that also has a `flanks` entry, with `1 <= min <= max <= count-1` as whole numbers (so both banks always get at least one unit) and a battlefield that has both `flankVia` waypoints. `laneSeed` must be a whole number in `0..2^32-1`. Anything else throws (`Invalid lanes`, `Invalid lane seed`); nothing is clamped. `laneSplit` itself throws on a range it cannot honour. `Simulation.checkFlank` now also requires both waypoints to be open when a match has `lanes`.
- **Engine, aggro and navigation are untouched.** The wave event (`Simulation.ts`) gains an optional `lanes:{north,south}` payload beside `flank`.
- **HUD** (`src/scenes/HUD.ts`). A wave event with `lanes` shows `Enemy wave N · Enemies attack both banks (A north · B south)`; the `flank` text is unchanged for other levels, and the notice uses the existing `tell` priority and word wrap.

## Seed and replay

- `MatchSetupOverrides.laneSeed` is optional and is recorded on `MatchSetup.laneSeed`. With no seed the fixed default `1` is used, so every existing test and headless scenario is deterministic.
- `Battle` draws one fresh seed per campaign match at the scene edge (`freshLaneSeed()` in `src/scenes/Battle.ts`: `crypto.getRandomValues`, outside any simulation tick) and passes it through `campaign.setup(levelId, laneSeed)`. It logs `[Kingdom Clash] lane seed N` to the console and the match keeps it on `simulation.setup.laneSeed`. A restart draws a new seed. `?laneSeed=N` in the page URL replays a known seed. No architectural complication arose, so no workaround was needed.
- The critical-hit generator and its sequence are unchanged (a test checks that its starting state is identical for different lane seeds).

## Exact Level 14 configuration

Oasis, eight waves, first wave tick 300, interval 900, the mission objectives, the Keep 50 percent failure threshold, the Shop, starting resources, the Guardian, enemy stats, no Crimson towers and an inert Crimson Keep are all unchanged.

| Wave | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Enemies (`enemyPerWave`) | 3 | 3 | 4 | 5 | 5 | 6 | 7 | 8 |
| Raiders (`raidersPerWave`) | 0 | 0 | 2 | 2 | 2 | 3 | 3 | 4 |
| Wave HP | 720 | 720 | 740 | 980 | 980 | 1110 | 1350 | 1480 |
| South range (`lanes`) | none | none | [1,2] | [1,2] | [1,2] | [3,4] | [3,4] | [4,5] |
| Possible north / south | all north | all north | 3/1, 2/2 | 4/1, 3/2 | 4/1, 3/2 | 3/3, 2/4 | 4/3, 3/4 | 4/4, 3/5 |

`alliedPerWave: 0`. The three S8 flank entries (waves 4, 6, 8) are removed because the lane split replaces them; the global S7 flank code is untouched. The seeds used in the evidence below produced, for example, seed 1: 2/2, 3/2, 4/1, 3/3, 4/3, 3/5 for waves 3 to 8.

Briefing and strategy text were updated to say the column splits and the notice gives the count for each bank. Levels 11 to 13 and Chapter 1 are unchanged (a test asserts their spawn data is identical with or without a seed).

## Corrected tower-loss metric

`tests/campaign-level-12-13.cjs` and `tests/campaign-level-14.cjs` counted tower losses by looking up the dead tower in `sim.state.structures` after its `death` event, which is already deleted, so the result was always 0 and the "no towers lost" assertions were vacuous. They now use `towerLosses(log)` (new in `tests/support/campaignBot.cjs`), which counts `death` events for ids starting `built-`. Corrected historical values are in `docs/CHAPTER2_S8.md` (Level 14 as shipped in S8) and below for Levels 12 and 13: active 0 and parked 1 on Level 12, active 0 and parked 2 on Level 13; the tests pin these. S9C results are kept separate from those historical tables.

## Test evidence

Focused runs only; the full suite was not run.

| File | Result |
|---|---|
| `lane-split.cjs` (new, 11 tests) | 11 pass |
| `campaign-level-14.cjs` (11 tests) | 11 pass |
| `flank.cjs` | 10 pass |
| `campaign-levels.cjs` | 21 pass |
| `campaign-level-12-13.cjs` | 14 pass |
| `battlefield.cjs`, `campaign.cjs`, `campaign-progress.cjs`, `canyon-pass.cjs` (also reference Level 14) | 16, 15, 18, 13 pass |

`npx tsc --noEmit` exit 0. `vite build` succeeds (built to a scratch directory; the chunk-size warning pre-exists). `git diff --check` reports no whitespace errors (only the usual LF to CRLF notice for three test files).

`lane-split.cjs` covers: invalid configurations rejected (wave 0, beyond the waves, fractional, min 0, max = count, min above max, one-element range, duplicate wave, NaN, a map without waypoints, invalid seeds); lane and flank conflict on one wave, and each working on its own wave; at least one unit per bank over 200 seeds and the count range honoured; same seed gives an identical encounter and different seeds vary both the south count and the unit assignment; exact composition (ids, order, ticks, positions, Raider placement and totals equal to the unsplit build); legacy spawns unchanged (waves ignore the seed without lanes, every other level ignores the seed); bit-identical replay for the same seed, a different one for a different seed, and an unchanged critical-hit starting state; blocked-waypoint refusal; and tower-loss counting from death events, including a check that the old lookup reads 0 for a real destroyed tower.

`campaign-level-14.cjs` was rewritten around the split: exact definition, exact wave composition for four seeds, lane counts equal to the wave payload, the four bot scenarios, no stalls, the replay hash, and a different-seed-different-match check.

One existing assertion had to change meaning. With two towers the bot loses and rebuilds towers, and the objective counts completed towers, so the mission can be won with only two standing. The test now asserts that the towers objective, and the win, happen exactly when three towers were completed.

## Diagnostic matrix (Level 14, shared test bot, seeds 1 to 4)

Scratch harness outside the repository (`scratchpad/s9c/matrix.cjs`). "North-only" is three towers at the north outpost, "balanced" two north and one south. "Active" holds the Guardian near (620,600) with Bash; "parked" sends it away and never fights. Tower losses are the corrected death-event count (a rebuilt tower is counted each time it is lost). "Dual" is the share of time with enemies west of the pond on both banks. Crossings are of the 35 tagged units of waves 3 to 8 plus 6 untagged units from waves 1 and 2 (north), so north includes those 6.

| Scenario | Seed | Result | Time | Guardian lowest HP | Keep end / min | Tower losses | Crossed N / S | Dual |
|---|---|---|---|---|---|---|---|---|
| north-only active | 1 | victory | 240 s | 880 | 3000 / 3000 | 1 | 25 / 16 | 39% |
| north-only active | 2 | victory | 239 s | 628 | 3000 / 3000 | 1 | 24 / 17 | 43% |
| north-only active | 3 | victory | 251 s | 868 | 3000 / 3000 | 2 | 27 / 14 | 44% |
| north-only active | 4 | victory | 239 s | 886 | 3000 / 3000 | 1 | 26 / 15 | 35% |
| balanced active | 1 | victory | 240 s | 890 | 3000 / 3000 | 2 | 24 / 17 | 37% |
| balanced active | 2 | victory | 249 s | 828 | 3000 / 3000 | 2 | 23 / 18 | 29% |
| balanced active | 3 | victory | 240 s | 829 | 3000 / 3000 | 1 | 26 / 15 | 49% |
| balanced active | 4 | victory | 240 s | 980 | 3000 / 3000 | 2 | 25 / 16 | 28% |
| north-only parked | 1 | defeat | 275 s | 980 | 1470 / 1502 | 8 | 31 / 18 | 62% |
| north-only parked | 2 | defeat | 295 s | 980 | 1492 / 1506 | 9 | 37 / 20 | 65% |
| north-only parked | 3 | defeat | 252 s | 980 | 1486 / 1518 | 8 | 27 / 14 | 66% |
| north-only parked | 4 | defeat | 256 s | 980 | 1486 / 1500 | 8 | 28 / 16 | 66% |
| balanced parked | 1 | defeat | 235 s | 980 | 1498 / 1516 | 6 | 24 / 17 | 66% |
| balanced parked | 2 | defeat | 225 s | 980 | 1494 / 1512 | 7 | 20 / 13 | 59% |
| balanced parked | 3 | defeat | 221 s | 980 | 1498 / 1512 | 7 | 22 / 11 | 55% |
| balanced parked | 4 | defeat | 212 s | 980 | 1494 / 1508 | 6 | 21 / 12 | 56% |

Notice payload: in all 16 runs every wave event's `lanes` counts equal the spawn plan counts exactly (for example seed 1: 3:2/2, 4:3/2, 5:4/1, 6:3/3, 7:4/3, 8:3/5; seed 3: 3:3/1, 4:4/1, 5:4/1, 6:3/3, 7:3/4, 8:4/4), and the south crossings equal the planned south counts (16 of 16, 17 of 17, 14 of 14, 15 of 15 for the active north-only seeds).

Readings, not forced to match any expectation:

- **Active Guardian: 8 of 8 victories**, 239 to 251 s, Guardian never died (lowest HP 628 to 980 of its maximum), the Keep untouched in every run, 1 to 2 tower losses. Both banks are under simultaneous pressure for 28 to 49 percent of in-zone time (13 to 20 percent before S9C, per S9B).
- **Parked Guardian: 8 of 8 defeats** at the Keep threshold, in 212 to 295 s, with 6 to 9 towers lost and rebuilt. Before S9C a parked Guardian won every Level 14 run (S8 table). A Guardian that never fights can no longer win; whether a real player who wanders or is slow will cross that line is a human question.
- **North-only versus balanced shows no consistent benefit for balanced** with this bot (active losses 1, 1, 2, 1 versus 2, 2, 1, 2; the bot never chooses a bank). Whether placing a tower on the south bank matters is untested with a human.
- **The Keep was never hit in an active run.** The split moves damage to towers (1 to 2 lost per run) rather than the Keep. If the level is still too easy for a competent Guardian, the S9B levers not used here (enemy damage, route commitment) remain.
- Nothing stalled: every run ended by victory or the Keep threshold.

## Browser findings

Vite dev server on an isolated origin (port 5291, seeded save with Levels 1 to 13 cleared, scratch only), Chrome headless with software WebGL, real campaign flow, normal `place`/`move`/`attack` commands only while the scenes were paused for fast stepping, and the scenes resumed before each wave so the HUD observed the wave event live. No injected victory, objective or Keep shortcut.

- **Desktop 960x540, `?laneSeed=7`** (console printed `lane seed 7`). Briefing text shows the split wording, battle starts on Oasis with 0 allied units and the two objectives. Towers 1/3 (tick 166), 2/3 (181), 3/3 (1051); waves 1/8 (1315) to 8/8 (7198); the status turned `victory` (`objectives-complete`) at tick 7198; the HUD showed VICTORY. Keep 3000 throughout. HUD notices read: wave 3 `3 north · 1 south`, wave 4 `3 north · 2 south`, wave 5 `3 north · 2 south`, wave 6 `2 north · 4 south`, wave 7 `4 north · 3 south`, wave 8 `4 north · 4 south`, equal to the planned counts, and the units actually seen at spawn per wave (3/1, 3/2, 3/2, 2/4, 4/3, 4/4) matched. Waves 1 and 2 showed only `Enemy wave N` and had no lane.
- **Phone landscape 844x390, no seed in the URL** (fresh seed 3163825719 drawn and logged). Notices wrapped to two lines, stayed inside the game area and did not cover the controls (screenshot reviewed): waves 3 to 8 read 3/1, 4/1, 3/2, 3/3, 4/3, 4/4 north/south, equal to the planned counts. Victory at tick 7177 with the Keep at 3000. The harness timed out after the result was read, so the final HUD VICTORY text was not captured in this run; it was captured in the desktop run.
- No page or console errors in either run. Portrait 390x844 did not load the menu in my harness; I did not investigate it (it may be an orientation gate) and treat portrait as untested.
- Real-device performance is unmeasured.

## Remaining gameplay risks

- **AFK defeat.** A parked Guardian loses 8 of 8 (above). Intended by the design, but a hard cliff.
- **The Keep is not threatened by an active Guardian.** Pressure shows up as lost towers and Guardian HP loss, not Keep damage.
- **Balanced versus north-only is a weak signal** in the bot runs.
- **Seed variance.** South counts range from 1 to 5 within a wave and tower losses from 1 to 2; wave 3 to 5 can be as lopsided as 4 north / 1 south. That is the configured range.
- **Notice timing.** The notice lasts 2.5 s of game time and the first split unit reaches the pond about 4 to 5 s after the spawn (S7 and S8 figure; not re-measured).
- **Level 13 still has allied minions** (not changed here, as instructed); its ramp relative to Level 14 is a playtest question.
- **Towers objective semantics (verified, unchanged).** "Build 3 Archer Towers" is a `structures-completed` counter: by the mission contract (`src/data/mission.ts`) it counts `construction-complete` events during the active phase and latches, unlike `structures-standing`, which reads the world. Every campaign level that builds towers uses the same type and wording. So a rebuilt tower counts again and the objective can complete with fewer than three standing. S9C keeps this and adds no standing-tower requirement; the Level 14 test is titled for it.
- **Lane seed lifecycle (verified).** `freshLaneSeed()` runs on every match start: with a valid `?laneSeed=N` (plain digits, 0 to 4294967295, parsed by `parseLaneSeed`) every start and restart uses N and gets the identical lane plan; with none or an invalid value it draws a fresh random seed. Non-campaign modes never read the seed and keep the fixed default. The save format and progress key are untouched.
- **Portrait phone viewport** untested.

## Human playtest instructions

1. Start the dev server in this worktree (`npm run dev`) and open the game. A scratch origin keeps real progress safe, for example `npx vite --host 127.0.0.1 --port 5291` and a seeded save (`kingdom-clash.campaign.v1` with Levels 1 to 13 cleared).
2. Play Level 14 normally. Each new match draws a fresh lane seed and writes `[Kingdom Clash] lane seed N` to the browser console. To replay a match, open the same page with `?laneSeed=N`.
3. Record: time, towers built and where, towers lost, Keep HP, whether the notice gave enough time to respond, whether you chose a bank to defend, whether splitting felt fair, and whether Level 14 now feels harder than Level 13. Note the seed for any run you want reproduced.
4. Things to watch: whether the south bank is ever ignored, whether a lopsided wave (4/1) feels like a decision or like noise, and whether an active Guardian is ever really threatened.
