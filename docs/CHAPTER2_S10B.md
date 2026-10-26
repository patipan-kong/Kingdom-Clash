# Chapter 2 S10B — Levels 15–17

> **Level 15 was redesigned after the first human playtest (see "S10B-F2: Level 15 B3, Hold the Mouth" at the end). Where this document describes Level 15 above that section (stun objective, six waves, one ally per wave, bot rows for Level 15), it describes the superseded first draft.**

Branch `chapter2/s10b-levels-15-17`, baseline `91d4070` (Level 14 briefing polish). Status: implemented, awaiting owner review. Not committed. Every balance value is provisional: the bot results below are preliminary evidence, not a human playtest.

All three levels use existing objectives, enemy types, battlefields and overrides only. No global combat constant, Levels 1–14, Full Battle, save format or monetisation was touched.

## Configurations

All use the extended encounter, `until-objectives` waves, `firstWaveTick: 300`, an inert Crimson Keep and the default Shop and starting resources.

| | Level 15 Stun the Riders | Level 16 Across the Sunwell | Level 17 The Long Dusk |
|---|---|---|---|
| Map | Canyon Pass | Oasis | Canyon Pass |
| Waves | `[3,4,4,5,5,6]` | `[3,4,5,6,8,9,10,10,10]` | `[4,4,5,5,6,6,7,7,8,8]` |
| Raiders per wave | `[0,2,2,3,3,4]` | `[0,0,2,3,4,5,6,6,6]` | `[0,2,2,3,3,4,4,5,5,6]` |
| Interval (ticks) | 900 | 900 | 600 |
| Allies per wave | 1 | 0 | 0 |
| Crimson towers | none | front-north, front-center, front-south | none |
| Flanks | none | wave 4 Raiders south; waves 5–7 every unit south | none |
| Phases | one: 1 tower, 6 stuns, 6 waves | hold: 2 towers + 5 waves; breach: all 3 front towers | one: 1,200 tower damage + 10 waves |
| Failure | Azure Keep < 50% | < 50% | < 60% |

- **Level 15** uses `skill-impact stun 6` and no `skill-rank` objective: Shield Bash is the only source of stun, so the objective already requires it. A player who spends the first point elsewhere gets a second point at level 2 and still finishes (bot, Taunt or Charge first: wins). The briefing names Shield Bash.
- **Level 16** was retuned from the S10A.1 draft (S10A.1 wave numbers won in 129–194 s with the Azure Keep untouched). Larger late waves, no allies and flank waves 5–7 landing in the breach window gave a 190–240 s match with tower and Guardian losses for the bot. Whether it is hard enough for humans is a playtest question.
- **Level 17** replaces the S10A.1 "3 towers standing" objective, which latches once true and lets a Guardian-only defence win (measured: zero towers won the waves alone). `tower-damage` counts only damage dealt by player-built towers while the phase is active, so a Guardian-only match can never complete it. One surviving tower can complete it, so the requirement is tower participation, not a tower count.

## Small shared UI change

Level 17 is the first level with a failure line other than 50%. `MissionBriefing.ts` (defeat line) and `HUD.ts` (`Min …%`) hard-coded 50%; both now derive the percentage from `failure.azureKeepHpBelow`. Output for every existing level is byte-identical.

## Bot matrix (shared bot, deterministic; lane seed has no effect on 15–17)

The "rush" bot leaves for the breach as soon as the hold phase ends; "careful" also returns when raiders approach the Azure Keep; "forward" holds east of the pond or canyon; "north"/"south" build both towers on one bank only.

| Level | Guardian | Result | Time | Guardian deaths | Towers lost | Azure Keep min | Notes |
|---|---|---|---|---|---|---|---|
| 15 | active (home) | victory | 286 s | 0 | 0 | 3000 | stuns 6/6 |
| 15 | forward | not finished at 533 s | – | 0 | 0 | 3000 | stuns 4/6: it rarely casts Bash |
| 15 | never casts Bash | not finished at 533 s | – | 0 | 0 | 3000 | stuns 0/6, waves done at 175 s |
| 15 | parked | defeat | 157 s | 0 | 1 | 1502 | |
| 15 | Taunt or Charge first | victory | 225–286 s | – | – | – | in `campaign-levels-15-17.cjs` |
| 16 | rush | victory | 193 s | 1 | 1 | 3000 | |
| 16 | careful | victory | 237 s | 2 | 1 | 2538 | |
| 16 | forward | victory | 190 s | 1 | 1 | 2146 | |
| 16 | north towers only | victory | 200 s | 1 | 1 | 3000 | |
| 16 | south towers only | victory | 200 s | 1 | 0 | 3000 | |
| 16 | parked | defeat | 114 s | 0 | 2 | 1514 | |
| 17 | active, 3 towers | victory | 237 s | 2 | 0 | 3000 | damage 1216 |
| 17 | forward, 3 towers | victory | 363 s | 3 | 0 | 3000 | slow: the Guardian takes the kills |
| 17 | active, 1 tower | victory | 293 s | 2 | 1 | 3000 | one tower can complete it |
| 17 | no towers | defeat | 228 s | 2 | 0 | 1814 | damage 0/1200 |
| 17 | parked, 3 towers | defeat | 158 s | 0 | 4 | 1808 | damage done early, waves 5/10 |

## Known balance risks

- Level 16 is not hard for the bot: the Azure Keep is rarely damaged, and where the towers stand barely matters (north-only and south-only both win). Whether human play finds it trivial is the first thing to check.
- Level 17's forward Guardian runs 6 minutes because towers get fewer kills; the active and one-tower runs are 4–5 minutes.
- Level 15 takes about 4.8 minutes with a bot that casts Bash only when a unit is within 100 px; humans can stun faster.

## Save migration policy (documented, not implemented; Level 20 ships in S10C)

- The version 1 save (`kingdom-clash.campaign.v1`) is used only for the initial migration, and only when a version 2 save is absent.
- Once version 2 exists it is authoritative; version 1 progress is never merged into it afterwards.
- The migration discards any stale `campaign-20` entry (a stale clear would otherwise make the finale complete without being played).
- The version 1 save stays on disk untouched, for rollback.
- It must ship no later than the release that registers Level 20: until then a stale entry is inert, because the unlock sequence stops at the first unregistered level.

## Tests and checks

- New `tests/campaign-levels-15-17.cjs` (16 tests): exact definitions, setup, objectives and phase order, deterministic replay, the Level 17 60% boundary, towers-required, Bash-only stuns, another-skill-first, parked defeat, unlock sequence and chapter view.
- Existing tests updated for the new registry and chapter counts (released 4 → 7, pending 15–20 → 18–20, hypothetical "Level 15/16" fixtures moved to 18/19, level lists extended, Levels 16 excluded from the "no flank" assertions): `campaign-level-11`, `campaign-level-12-13`, `campaign-level-14`, `campaign-levels`, `campaign-progress`, `campaign`, `chapter-view`, `battlefield`, `canyon-pass`, `flank`, `lane-split`; and `verify-chapters.mjs`, `verify-campaign-progress.mjs`. No assertion about Levels 1–14 was weakened.
- Replay equivalence: bot replay hashes for Levels 1–14 and Full Battle (active and parked, 30 hashes) are identical between `91d4070` and this tree.

## Human playtest

Run each level from the campaign (Chapter 2 → Level 15, 16, 17), with a fresh random lane seed, and record result, time, Azure Keep minimum, Guardian deaths and towers lost.

1. **Level 15:** take Taunt first once, Bash first once. Is it clear that Shield Bash stuns and counts? Is 6 stuns reasonable, and the length 3–5 minutes?
2. **Level 16:** is hold followed by the cross-pond attack engaging, or too easy? Do the south-flank notices (waves 4–7) get a response? Does leaving after wave 5 feel risky? Is the front-tower walk clear?
3. **Level 17:** is the 20-second wave cadence and the 60% line fair? Does the tower damage bar fill naturally, and do towers feel necessary? Is it too similar to Level 14?
4. Check the briefing, HUD objective rows and `Min 50%`/`Min 60%` on mobile landscape and desktop.

## Verification results

- `tsc --noEmit`: clean. Production build (`vite build`, scratch output dir): succeeds.
- Full headless suite (`node scripts/test.mjs`): 843 tests, 843 pass, 0 fail (an earlier run found six stale registry/battlefield assumptions, listed above, now updated).
- Browser (headless Chrome, real campaign path menu → chapters → briefing → battle; desktop 960×540 and mobile landscape 844×390): Levels 15, 16 and 17 briefings render with no overflow or overlap and the Start button in bounds; the defeat line reads 50% / 60% as configured; the HUD shows the objective row and `Min 50%`/`Min 60%`; the Level 16 wave 4 and 5 notices read "Raiders flank the south bank" and "Enemies flank the south bank"; no console, page or HTTP errors. Existing browser scripts `verify-chapters` (all pass), `verify-campaign-selection`, `verify-campaign-ui` (34/34), `verify-campaign-levels` (90/90), `verify-campaign-routing`, `verify-campaign-progress` (129/129) pass.

## S10B-F1: protected Crimson Keep (Levels 15–17)

Playtest feedback: Level 15's allied minions rushed the Crimson Keep and destroyed it, although no objective names it. Levels 15, 16 and 17 now set `crimsonKeepInvulnerable: true` (the existing Level 14 override, with `crimsonKeepArmed: false`). The Keep stays in the simulation and visible, and cannot be targeted or damaged by anyone. No code, renderer or art change; Level 20's Keep is not touched.

Bot comparison, before (S10B) → after (F1), same bot and seed:

| Level | Guardian | Before | After |
|---|---|---|---|
| 15 | active | victory 286 s | victory 225 s |
| 15 | forward | not finished at 533 s (stuns 4/6) | victory 190 s |
| 15 | never casts Bash | not finished, stuns 0/6 | not finished, stuns 0/6 |
| 15 | parked | defeat 157 s | defeat 150 s |
| 16 | rush / careful / forward | win 193 / 237 / 190 s | win 195 / 256 / 198 s |
| 16 | north only / south only | win 200 / 200 s | win 202 / 278 s (south: 4 towers lost) |
| 16 | parked | defeat 114 s | defeat 111 s |
| 17 | active / forward / 1 tower | win 237 / 363 / 293 s | win 206 / 361 / 206 s |
| 17 | no towers | defeat 228 s (waves 10/10) | defeat 165 s (waves 6/10, damage 0) |
| 17 | parked | defeat 158 s | defeat 142 s |

Cause of the shifts: the three starting allied minions exist in every level. Before, they reached the Keep and hit it. Now they cannot attack it, they advance more slowly and meet the first Crimson wave mid-map (about x 900–1200 at 10–20 s) and die there. Everything after follows from that.

## S10B-F2: Level 15 B3, "Hold the Mouth" (human playtest candidate)

Human acceptance of the first Level 15 failed: the Guardian could hold a forward position, clear all six waves and lose one ally. After the campaign audit and two scratch comparisons (C2, then C2 with allies against C2 without the stun counter), B3 was approved **for human playtest only**; it is not final balance.

Level 15 keeps its id (`campaign-15`), number and chapter. Title "Hold the Mouth". Configuration (`src/data/campaignLevels.ts`):

- Canyon Pass, extended encounter, `until-objectives`, failure Azure Keep < 50%.
- Waves `[3,4,4,5,5,6,6]`, Raiders `[0,2,2,3,3,4,4]`, first wave tick 300, interval 900, no per-wave allied reinforcement (the three opening Azure Vanguards still exist, as in every level).
- Crimson front line (`red-tower-front-north/center/south`) stands as an active defender and is not an objective. The Crimson Keep stays inert and invulnerable. Shop open, default resources.
- One phase `mouth`: complete 3 Archer Towers, Archer Towers deal 1,200 damage, defeat 7 waves. The Shield Bash stun objective is removed.
- The briefing says the front line is dangerous but does not need to be destroyed.

### Verification

- `tests/campaign-levels-15-17.cjs` (21 tests): the exact definition, the front line cannot satisfy or shortcut an objective (destroyed by script: towers, damage and waves stay 0, match stays active), bot win in 180-330 s with tower damage at least 1,200, replay identity, Guardian-only play never completes the tower objectives, parked defeat, camping at x 1330 and 1250 costs at least 3 Guardian deaths and the front towers shoot the camper, rush-front-then-camp, spawn deferral at most 5 s, Keep protection, unlock sequence.
- Typecheck clean. Full headless suite 848 of 848. Legacy replay: 30 bot hashes (Levels 1-14 and Full Battle, active and parked) identical to a build of `91d4070`. Browser (headless Chrome, real campaign path, desktop 960x540 and mobile landscape 844x390): the briefing and HUD fit, objective rows read as above, `Min 50%` shown, no console, page or HTTP errors; `verify-campaign-levels` 90/90, `verify-chapters` 33/33, `verify-campaign-progress` 129/129, `verify-campaign-routing` 18/18.

### Bot results (preliminary, scratch harness; B3 as shipped)

| Scenario | Result | Guardian deaths | Notes |
|---|---|---|---|
| Home, 3 towers | win 256 s | 1 | towers 17% of damage, Keep untouched |
| Chase to the canyon exit | win 286 s | 1 | |
| Camp x 1330 | win about 200-235 s | 6-7 | 1-2 towers lost |
| Camp x 1395 (spawn slot) | win 221 s | 7 | 5 towers lost, up to 24 s of spawn deferral by the Guardian |
| Destroy front line, then camp | win 263-380 s, or unfinished, by bot variant | 3 | **not a closed shortcut**: it is no faster than home but it is not blocked; an earlier statement that it "closes" was one near miss (1,193 of 1,200) |
| Parked | defeat about 207 s | 0 | |

### Known issues for the playtest

- The Guardian dies about once at home around 190-200 s in every bot variant (no healing exists); wave tuning and allies did not change this.
- Towers deal 17-20% of the damage at home against about 33% on Level 14.
- Level 15 and Level 17 are both Canyon with a 1,200 tower-damage target; Level 17 was not changed.
- Level 15 no longer teaches a skill.
- Camping is deterred by Guardian deaths, not blocked.
