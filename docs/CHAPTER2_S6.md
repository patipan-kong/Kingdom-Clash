# Chapter 2 S6 — Levels 12 and 13

Branch `chapter2/s6-levels-12-13`, baseline `941b0cb` (S5). Status: implemented, final gate passed. **Every balance value is provisional.** No new mechanics: both levels use existing objectives, the Oasis and Canyon Pass battlefields and the existing Desert Raider spawn configuration. No Navigation, AI, combat, geometry, asset or Mobile UI change.

## Level 12 — Hold the Sunwell (Oasis)

- Battlefield `oasis`, `extended` encounter, no Crimson towers, Crimson Keep inert, Shop enabled (not needed), default starting resources, no Desert Raiders.
- Waves `[3,3,4,4,5,5]`, first wave tick 300, interval 900, one allied minion per wave, `until-objectives`.
- One phase, `defend`: build 3 Archer Towers; defeat 6 Crimson waves. Defeat: Azure Keep below 50% health.
- Intent: introduce the Oasis and its shore outposts. Bank placement is not forced (no objective can require a bank) and the north-route bias of the Crimson columns is untouched.
- Design revision: an Archer-Tower-kills objective was part of the first design and was removed after the bot probes (see below). It is not replaced by another objective.

## Level 13 — The Dust Riders (Canyon Pass)

- Battlefield `canyon-pass`, `extended` encounter, no Crimson towers, Crimson Keep inert, Shop enabled (not needed), default starting resources.
- Waves `[3,3,4,4,5,5]`, Desert Raiders inside those totals `[0,0,2,2,3,3]` (waves 3 to 6: 2, 2, 3, 3), same timing and ally as Level 12.
- One phase, `defend`: build 2 Archer Towers; defeat 6 Crimson waves. Failure as Level 12. No breach phase and no skill objective.
- Raider stats and AI are unchanged (130 HP, speed 150, damage 14, against Crimson 240, 95 and 18).

## Chapter 2 flow

Levels 12 and 13 unlock in sequence (11, then 12, then 13). The Chapter 2 narrative reads "The first three missions are released." Levels 14-20 stay pending, slot 10 stays reserved for `campaign-20`, Chapter 3 stays coming soon.

## Test support

`tests/support/campaignBot.cjs` `play()` takes an optional `cells` list (tower cells in order of preference). The default stays the Meadow keep-circle list, so every existing caller is unchanged.

## Verified behaviour

- Exact Raider counts per wave read from the encounter spawn table: Level 12 `[0,0,0,0,0,0]`, Level 13 `[0,0,2,2,3,3]` in waves of `[3,3,4,4,5,5]`. In a live Level 13 match no Raider exists before Wave 3 and Wave 3 brings two.
- No unintended instant win: parked or active, both levels need at least the schedule floor (wave 6 spawns at 160 s).
- With no towers built, a parked Guardian loses both levels (Level 13 at 89 s).

## Fixed bot scenarios (headless, shared test bot, deterministic)

Level 12 uses cells (17,7), (16,8), (13,12), Level 13 uses (14,12), (14,11), (14,13). Active = hold at x 620 with Shield Bash, leash 650; parked = Guardian moved to the south-west corner and never touched.

| Level | Guardian | Result | Time | Azure Keep | Guardian deaths | Towers lost |
|---|---|---|---|---|---|---|
| 12 | active | victory | 186.8 s | 3000/3000 | 0 | 0 |
| 12 | parked | victory | 191.8 s | 3000/3000 | 0 | 0 |
| 13 | active | victory | 170.6 s | 3000/3000 | 0 | 0 |
| 13 | parked | victory | 194.4 s | 3000/3000 | 0 | 0 |

A parked Guardian winning is accepted: a tower-focused strategy is a legitimate choice, and no artificial Guardian requirement was added.

## Why the Level 12 kill objective was removed

In the earlier bot matrix (18 layout and Guardian combinations) the "Archer Towers slay 8" objective lagged the six waves whenever the Guardian fought forward (finishing at 327 to 396 s, or not within 533 s in two runs with weak tower cells), because the Guardian takes the kills. With the objective removed the six waves are the clock and every run in the fixed set above finishes in 187 to 192 s.

## Known balance risks (provisional)

- Bot results are not human results; a human playtest has not been done. Estimated human time is 4 to 6 minutes for each level.
- Both levels are won by two or three well-placed towers plus the Azure Keep, with or without the Guardian. Pressure on Level 13 comes only from Raiders reaching the towers first; two towers handled every tested wave.
- Oasis sends most Crimson north (83 to 100% in earlier probes); south-only or Keep-circle tower layouts are weaker but still held with a nearby Guardian. Parked, a south-heavy layout (three south towers, or one north, one south and one Keep) lost at 153 to 218 s in the earlier probe; north cells or Keep-circle cells won parked.
- Real-device performance is not measured (headless Oasis is about 1.61 times Meadow, Canyon about 1.30 times).

## Verification

Focused tests (`campaign-level-12-13`, `campaign-level-11`, `campaign-levels`, `campaign`, `campaign-progress`, `chapter-view`, `oasis`, `canyon-pass`, `desert-raider`, `navigation`, `campaign-navigation`, `navigation-optimization`, `golden-simulation`, `match-setup`, `battlefield`, `battlefield-art`, `battlefield-launch`, `battlefield-threading`): 194 of 194 pass; Chapter 1 golden fixtures unchanged. Browser: `verify-chapters` passes; one smoke of Chapter Select, Level 12 and Level 13 (Raider screenshot). Typecheck, build and `git diff --check`.

## Open items (non-blocking)

- Human balance testing is still pending; all values are provisional.
- Raider contrast at the default zoom on the sand canyon floor is a non-blocking visual issue (see below). No artwork was changed.
- Oasis real-device performance is not measured.
- Browser smoke (Chapter Select, Level 12, Level 13): 10 of 10 pass. Its Continue check derives the expected level from the seeded progress (next uncompleted level) instead of a fixed number.

## Visual observation (Raiders)

In a real browser screenshot of Level 13 Wave 3, a Desert Raider (sand and gold armour) stands beside a red Crimson soldier. They are distinguishable at close zoom; at the default zoom on the sand-coloured canyon floor the Raider tint is less contrasty. No assets were changed.
