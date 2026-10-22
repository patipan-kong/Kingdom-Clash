# Chapter 2 S8 — Level 14 "The Southern Flank"

Branch `chapter2/s8-level-14`, baseline `b7dcce1` (S7). Status: implemented, awaiting review. This is a playable content milestone, not a balance pass. No new mechanic: it uses the S7 flank, the existing Desert Raiders, towers and Guardian.

## Level 14

- Oasis. Mission `until-objectives`: **Build 3 Archer Towers** and **Defeat 8 Crimson waves**. Failure: Azure Keep HP below 50%.
- First wave tick 300, interval 900. Enemy counts `[3,3,4,4,5,5,6,6]`, Raiders `[0,0,2,3,3,4,4,5]` (Raiders take the last indices of a wave), one allied minion per wave. Default starting resources, Shop open, no Crimson towers, inert Crimson Keep.
- Flanks (S7 `WaveRules.flanks`): wave 4 south `raiders` (3 Raiders), wave 6 south `raiders` (4), wave 8 south `all` (6 units: 5 Raiders and 1 infantry). Other waves never flank.
- The briefing introduces the south-bank flank and tells the player to watch the wave notice. It does not claim that a south tower is needed; the Guardian can answer either bank.
- Registered as `campaign-14` after Level 13: sequential unlock, Levels 15–20 pending, Chapter 2 narrative says "The first four missions are released". Full Battle and Chapter 1 are unchanged. Raider stats, aggro, Navigation and the flank lifecycle are untouched.

## Verification (focused)

`tests/campaign-level-14.cjs` (10 tests): exact definition, wave composition and flank tags, registration/unlock/chapter view, objectives and failure threshold, no premature win before Wave 8 spawns, no stall (two towers only is not a win, no towers is a defeat), flank notice payloads on waves 4, 6 and 8 only, replay determinism, and the four scenarios below. Existing tests were updated only where they assumed Level 14 was unregistered or unflanked (levels 11–13, campaign, progress, chapter view, battlefield, canyon, flank). Browser verification scripts (`verify-chapters`, `verify-campaign-progress`, `verify-menu-readability`) had their expected counts updated but were not run.

### Four deterministic bot scenarios (shared test bot, provisional)

| Towers | Guardian | Result | Time | Keep HP (end) | Guardian deaths | Tower losses | Tagged units crossing S / N | Raiders crossing S / N (all) |
|---|---|---|---|---|---|---|---|---|
| north-only | parked | victory | 244 s | 3000 | 0 | 0 | 13 / 0 | 12 / 9 |
| north-only | active | victory | 235 s | 3000 | 0 | 0 | 13 / 0 | 12 / 9 |
| balanced | parked | victory | 263 s | 3000 | 0 | 0 | 13 / 0 | 14 / 12 |
| balanced | active | victory | 233 s | 3000 | 0 | 0 | 13 / 0 | 12 / 9 |

The Keep alert did not occupy the notice slot at the spawn of waves 4, 6 and 8 in any scenario. A level takes about 4 minutes of bot time; human time is unmeasured.

### Browser smoke (desktop Chrome 960x540, Vite dev server)

Chapter 2 grid with Levels 11–14 open (13 clears seeded) and 15–20 pending; Level 14 briefing; battle start on Oasis with the two objectives. For each flank wave the HUD notice showed `Enemy wave 4 · Raiders flank the south bank`, `Enemy wave 6 · Raiders flank the south bank` and `Enemy wave 8 · Enemies flank the south bank` for the HUD's 2.5 s notice duration, and tagged units were seen on the south bank each time. No runtime errors. The run used scratch help (unbreakable Keep, Crimson stragglers removed near the Keep before each flank wave, a fast-forward between waves); evidence is outside the repository. The scratch tower placement in that first smoke did not build (the script read `sim.wood` instead of `sim.state.wood`, a harness bug, not a game defect), so the objective panel read 0/3.

### Browser objective completion (final gate)

One run of the real Level 14 from the campaign briefing, with no Keep or objective shortcuts: three towers were placed with normal `place` commands and the Guardian driven with `move`/`attack` commands while the harness advanced ticks. Towers 0/3 to 1/3 (tick 166), 2/3 (181), 3/3 (1051); waves 1/8 (922) to 8/8 (7008); the status turned `victory` (`objectives-complete`) at tick 7008, in the same tick as the eighth wave was defeated and after both objectives were complete. The Keep stayed at 3000, no command was rejected, the HUD showed VICTORY, and there were no browser runtime errors. An earlier attempt hung only because the harness drained the match-end event before the HUD could read it.

Correction to `docs/CHAPTER2_S7.md`: its "about 4.9 s" notice figure was wall-clock in a slowed headless run; the HUD's notice lasts 2.5 s of game time.

Flanking is functional (observable, crosses the south bank, announced by the HUD) but does not yet force a tactical response in the bot scenarios.

## Pending human balance questions (not S8 requirements)

- Does a north-only defence lose or struggle? In the bot runs it never did: flanking Raiders mostly re-aggro (560 px) on the nearest Guardian or tower after the S7 "passed" release, so on this layout the flank rarely reaches the Keep.
- Does a balanced defence perform better? Not visible with the bot: all four won with the Keep untouched.
- Is Guardian movement useful or mandatory? Not mandatory in the bot runs.
- Level length (about 4 minutes of bot time) and difficulty need a human playtest.

## Risks

- The notice lasts 2.5 s, and tagged units reach the south bank roughly 4–5 s after the spawn (the tests assert at least 3 s). A Keep alert (priority 2) would suppress a wave notice (priority 1) if the Keep is already under attack at the spawn tick.
- Flanking is observable and crosses the south bank, but it may not yet create a real decision; the bot cannot judge that.
- Real-device performance is unmeasured; only the desktop timing probe in the S7 report exists.
- Human balance testing is pending.
