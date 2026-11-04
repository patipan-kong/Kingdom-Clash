# Chapter 5 M1: The Old Tavern (finalized, local commit)

Status: implemented and finalized on top of local commit `61a4cd0` (`scratch/c5-allied-hero`). Local commit only; not pushed or deployed. Finalization (PO, after human playtests): the forward Barracks pad was removed; M1 is the Guardian plus one Allied Hero. Design: `CHAPTER5_M1_DESIGN.md`. Chapter 5 is **Coming Soon**. Every balance value is provisional until the S24 human playtest.

## What it is

campaign-41, Chapter 5 Mission 1. Forest Edge's loop (capture the outpost, repair, advance, destroy the Keep) on a new map with the Tavern. Hero Cap 1; roster Roland / Borin / Kael; Tavern 100 Wood + 10 Iron; Hire 150 / 180 / 200 Gold; Revive 45% (68 / 81 / 90) after 30 s; Follow / Attack / Defend.

| Rule | Value |
|---|---|
| Start | 50 Gold, 140 Wood, 15 Iron |
| Waves | `[5,5,5,6,6,6,7,7]`, first at 25 s, every 30 s, no flank |
| Outpost | "Old Outpost": two watchtowers 288 px apart, ring 96, Banner 2,000 HP in 4 s, ruined tower repaired at 60% in 5 s (the tower is the only thing the camp opens) |
| First capture | two Elite Soldiers, once |
| Keep | shielded while Crimson holds the outpost (existing rule); armed, two front towers |
| Barracks | none: no pad, no Barracks card (the Build tray shows Tower, Wall, Tavern) |
| Crimson Hero | none |
| Intro | one notice "Build a Tavern to hire a hero" plus the briefing; no dialogs |

## Map: `old-tavern`

A Forest Edge variant (data only). A narrow west road (x 768-1056, y 456-744) opens into a wide basin (x 1056-1440, y 312-888) with the outpost at its east end; no south trail, no flank. The two watchtowers (1344,456) and (1344,744) let the Guardian and an Allied Hero take one each. Forest painter reused with the road band at y 456-744.

## Files

Changed: `src/data/campaignLevels.ts` (`oldTavernLevel`), `src/data/campaignChapters.ts` (Chapter 5, `coming-soon`, artwork reuses Chapter 4's), `src/data/matchSetup.ts` (a single post without a Crimson Hero is accepted only when the setup has a Tavern), `src/world/battlefield.ts` and `battlefieldArt.ts` (`old-tavern`), `src/scenes/HUD.ts` (the one Tavern notice), `src/ui/BuildPanel.ts` (four-card label font 8.5 to 7.2 so "Barracks" stays on one line).

New: `tests/campaign-level-41.cjs` (22), `tests/support/tavernBot.cjs`, `scripts/verify-old-tavern.mjs`.

Updated list tests (Chapter 5 now exists): `battlefield-art`, `chapter-view`, `debug-launch`, `six-missions`, `campaign-level-31`, `frost-gate`, `unlock-override`.

No change to Simulation, Movement, Economy, Tavern or Hero code. Allied Heroes could already capture a post (Phase 0).

## Bot results (production level, commands only; not human results)

| Plan | Result | Time | Outpost | Hired | Hero falls | Guardian deaths | Stalls |
|---|---|---|---|---|---|---|---|
| No Hero | victory | 149 s | 27 s | none | none | 3 | 0 |
| Roland, pushes at once | victory | 109 s | 27 s | 64 s | 0 | 2 | 0 |
| Borin, pushes at once | victory | 116 s | 27 s | 69 s | 0 | 2 | 0 |
| Kael, pushes at once | victory | 109 s | 27 s | 69 s | 0 | 2 | 0 |
| Roland, waits for the hire | victory | 135 s | 73 s | 50 s | 1 | 2 | 0 |
| Borin, waits for the hire | victory | 138 s | 91 s | 70 s | 0 | 1 | 0 |
| Kael, waits for the hire | victory | 147 s | 89 s | 70 s | 1 | 1 | 0 |

The Azure Keep was never touched. Split versus together made no difference in the bot.

## Balance observations

1. **The bot is far faster than the 5-7 minute human target.** Chapter 4 M1's bot took 244-335 s and the human first win 6:49, so a ratio of 1.3-1.7 predicts 2.5-4 minutes here. Not tuned blind: the human playtest decides. Candidate knobs (none used): Crimson Keep hit points (`crimsonKeepHp`; 4,500 added only 17 s, 6,000 added 65 s to the no-Hero bot), a third Outpost watchtower, wave size.
2. **The Hero helps most when it joins the assault** (about 25% faster than no Hero) and not when the player waits for it (no better than no Hero). Useful, not mandatory, as intended.
3. All three Heroes finish; Borin and Roland a little steadier (fewer falls), Kael fastest.
4. Gold: hire at 50-70 s in the bot; the first hire is affordable after one wave.

## Known issues

1. Chapter 5 shows Chapter 4's artwork and plain mission cards (no `mission-art-campaign-41.webp`, no `chapter-rise-of-the-heroes` painting). Needed before release.
2. M1 now shows three Build cards. The four-card tray (Chapter 4 with a Tavern, test scenarios) is still cramped and its "Select a cell" status wraps (shared, predates M1).
3. Pacing risk (observation 1).
4. No S24 device test; the browser runs use SwiftShader.
5. Heroes crowd the Tavern at its spawn; the Hero Bar and Hero sprites are the interim art from Phase 1B.

## Finalization findings

**Barracks pad.** Real touch taps at 780x360 DPR 3 (Build, Barracks card, pad cell) reached "Valid placement · confirm": the simulation and the Build flow accept the pad. It was an M1 configuration issue, not a shared defect: the pad (cell 24,13) lies in the screen's bottom-right, behind the skill and Attack button cluster while the Guardian stands in the camp, so a human tapping it hits a button instead. Chapter 4's rules were not touched (`placementReason`, the capture gate and pad limits are unchanged); M1 just declares no `azure` block, so there is no pad and no Barracks card. Tests assert this (`campaign-level-41.cjs`).

**Crimson Wave pressure.** No configuration blocks it. Unattended, with no player command, the waves walk the road, destroy the Azure Keep (first damage at 56-72 s, destroyed at 92-102 s), whether the Guardian waits at home, in the ring or parked far east. The map has no barrier or shield between the waves and the Azure Keep, and the Keep shield protects only the Crimson Keep. Humans and bots keep the Keep at full HP because the Guardian, the Hero and the allied soldiers intercept each wave before it travels west; that is player interception, not a defect (not separately measured). A regression test ("attack pressure" in `campaign-level-41.cjs`) fails if a change ever stops the waves reaching the Keep. No pressure was added; wave counts, timing, towers, Keep HP, Hero Cap and starting resources are unchanged.

Bot results after removing the pad are identical to the table above (the bot never used the pad).
