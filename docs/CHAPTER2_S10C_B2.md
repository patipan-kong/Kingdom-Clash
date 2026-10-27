# Chapter 2 S10C-B2 — Level 20, The Crimson Last Stand

Config-only implementation of the approved S10C Level 20 design. No engine, combat, AI, economy, tower, Raider or save code changed. Every balance value is provisional until the human playtest. Bot results are preliminary evidence, not a playtest.

## Configuration

| | |
|---|---|
| Id / chapter / slot | `campaign-20`, Chapter 2, finale (slot 10) |
| Battlefield | Oasis, extended encounter |
| Start | 0 Gold, 0 Wood, 0 Iron; Shop open; no allied units |
| Waves | Level 18's table verbatim: enemies `[3,3,4,5,6,6,7,8]`, Raiders `[0,0,2,2,3,3,4,4]`, first wave tick 300, interval 800, committed seeded lanes on waves 3–8 |
| Crimson defenders | front trio and both gate towers (5), all shooting from the start |
| Crimson Keep | armed (`crimsonKeepArmed:true`), vulnerable, 3,000 HP, no regeneration. Damage, cooldown, range and targeting are the shared Keep values that Level 10 already uses |
| Phases | `hold` (2 Archer Towers, 5 waves defeated) → `line` (2 of 3 front towers) → `keep` (Crimson Keep) |
| Failure | Azure Keep below 50% HP |

Targets destroyed in an earlier phase are credited when their phase opens, as in Levels 18–19. Razing the Keep early does not end the match; it is credited when the last phase opens, and the five towers still have to fall.

## Files

`src/data/campaignLevels.ts` (one definition), `src/data/campaignChapters.ts` (narrative: "All ten missions are released."), `tests/campaign-level-20.cjs` (new), count and exemption updates in existing tests and browser scripts (Level 20 is now registered), this note.

## Bot matrix

Shared bot (`tests/support/campaignBot.cjs`) on the real `campaign.setup(20, seed)`, lane seeds 1–20 where stated. The bot does not use the Shop, so the matrix adds a Shop hook (buys the next listed item when affordable and the Guardian is home). "Wait" holds at home through the hold phase and until the first purchase (or 200 s), then sorties and never returns. Hammer-first = Siege Hammer then Guardian Shield. The bot has no hit-and-run, so it likely underestimates a human.

| Policy | Wins | Win time | Guardian deaths | Notes |
|---|---|---|---|---|
| 3 towers, wait, Hammer first | **17/20** (target ≥70%: met) | 255–263 s | 3 (every run) | Azure Keep at the end 1,564–2,928; line phase opens 134–155 s, Keep phase 186–194 s, first purchase 155–164 s. The 3 losses (seeds 8, 17, 20) fell at 246–260 s with the Crimson Keep at 117–675 HP |
| 2 towers, wait, Hammer first | 8/20 = 40% (target ≤55%: met) | 253–261 s | 3 | |
| 1 tower | 0/6 (target none: met) | – | 1–2 | defeat or unfinished at 480 s |
| 3 towers, Shield first | 8/12 | 250–252 s | 3 | Hammer first is stronger: Keep damage persists across Guardian deaths, so damage beats survival |
| 3 towers, no Shop | 0/12 | – | 3–4 | the Shop is required for the bot to win |
| 3 towers, Hammer first, return home when threatened | 7/8 | 330–380 s | 2–3 | |
| Parked Guardian | 0/3 (target defeat <60 s: met) | defeat at 54 s | 0 | |
| Early raid, leave at 10 s | 0/6 | defeat at 64 s | 2 | |
| Early raid, leave at 30 s | 0/6 | defeat at 117–131 s | 3–4 | |
| **Early raid, leave at 60 s** | **1/6** (target none: **not met**) | 197 s | 4 | one win, with one extra Guardian death |
| Early raid, leave at 90 s | 2/6 | 222 s | 4 | |
| Early raid, leave at 120 s | 5/6 | 225–227 s | 3 | about 30 s faster than holding, same deaths |

## Findings for owner review (not tuned)

1. **Deviation: a 60 s raid won 1 of 6 seeds** (target: no early raid wins). 10 s and 30 s never win. Leaving at 90–120 s wins and is faster than holding first, so leaving once the second tower stands and the waves are nearly over is a real, and cheaper, strategy rather than a closed shortcut. The cost is exposure of the Azure Keep, not extra Guardian deaths (4 at 60–90 s, 3 at 120 s). Decide whether to accept it (it rewards reading the field), or add a later mechanism; nothing was adjusted here.
2. **Hammer-first dominates Shield-first** (17/20 against 8/12) because the Crimson Keep never heals. The Shop choice is real but lopsided.
3. **Human time estimate stays 4:30–5:30**, based on 4:15–4:25 for a brisk bot and the Level 18–19 human-to-bot ratio. The three bot losses all end with the Azure Keep, not the Guardian, failing while the Keep is nearly dead.
4. **Spawn deferral** (shared engine behaviour, not fixed): at most 2.5 s on the wait policy, 5.9 s for Shield first, 8.6–9.8 s on the early and return policies, and 16.4 s on the no-Shop runs that the bot loses. Level 20's front towers sit next to the Crimson spawn slots, so a Guardian lingering there stalls the whole Crimson queue.
5. **The east flank of the Keep is covered** by the gate towers (about 200 px from each). Destroying them is optional and opens it.

## Save progress warning (release readiness, not implemented)

`campaign-20` was the Full Battle id until Chapter 2 S4. Full Battle is special, so `recordVictory` refused to record it and **no shipped build wrote `campaign-20` to a v1 save**. A hand-edited or imported save could still hold it. Behaviour with the new registration (covered by a test):

- Entry present but Levels 1–19 not all saved: ignored (progress is the unbroken prefix of saved clears), Level 20 stays locked and uncleared.
- Entry present on top of Levels 1–19: **Level 20 is shown cleared and Chapter 2 complete** without being played. This would be wrong, and it cannot be told apart from a genuine clear in the v1 format.
- Nothing else changes; a genuine Level 19 → Level 20 clear writes `campaign-20` as normal.

This is the one place the deferred v2 save migration would matter; a migration could drop or rename a stale `campaign-20`. It does not block local gameplay or the playtest.

## Human playtest

**Level 20 — The Crimson Last Stand** (unlocks after Level 19):
1. Start with 0 Gold, 0 Wood and 0 Iron; the first tower arrives at about 40 s. Build three towers if you can; confirm the briefing explains the empty start, the armed Keep and the 50% line.
2. Hold five waves. Note when you first afford a Shop item (about 2:35) and which one you buy.
3. Phase 2: destroy any two front towers. Then the Keep. Stand near the Keep and confirm it hits you (about 17 damage every 0.8 s within 140 px of its edge). Record Guardian deaths and whether damage to the Keep persists after you die.
4. Try leaving at 60–90 s, and try Shield before Hammer. Try destroying the gate towers first.
5. Judge: 4:30–6:00? Does it feel like the climax, harder than Levels 18–19? Is a third tower understood as necessary? Did the Keep phase feel like a grind?
6. Record: time, Azure Keep HP, Guardian deaths, purchase times, any stall at the Crimson spawn.
