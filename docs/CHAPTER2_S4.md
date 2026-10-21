# Chapter 2 S4 — Level 11 Canyon Pass and the Full Battle migration

Branch `chapter2/s4-level-11-canyon-pass`, baseline `a91b890` (S3). Status: implemented, awaiting review. **Every Level 11 balance value is provisional.**

## Full Battle migration (approved B1)

Full Battle moved from `campaign-20` to the special id `full-battle`, so `campaign-20` is free for the Chapter 2 finale.

- `CampaignRegistry`: a special mode id (`campaignProgress.isSpecialLevelId`) is exempt from the `campaign-NN` id, number and chapter rules but must have `number 0` and `chapter 0`; every other level keeps the normal rules. Special modes list last.
- `campaignProgress`: the `special` map key is `full-battle`. It is still never saved, never counted and always unlocked. The save regex and schema are unchanged.
- `ChapterSelect.ts`: the Full Battle button opens `full-battle`. `CampaignSelect.ts` already found it through `specialLabel`, so it needed no change.
- `MissionBriefing.ts` and `HUD.ts`: the heading line of a special mode reads `FULL BATTLE · SPECIAL MODE` instead of `CHAPTER 2 · LEVEL 20` and `Level 20 — Full Battle` (text only; no layout change).
- Tests and the browser scripts' Full Battle ids were updated. The buttons keep their `FULL BATTLE · ALWAYS AVAILABLE` label.

## Chapter 2 release

Chapter 2 is `available`; its card is LOCKED until Level 10 is cleared (the existing derived unlock). Level 11 unlocks after Level 10. Levels 12–20 are unregistered, so their slots stay pending; slot 10 stays reserved for `campaign-20`. Chapter 3 stays coming soon.

## Level 11 — Canyon Pass (provisional)

Theme: hold the pass mouth, then break the Crimson front line.

- Battlefield `canyon-pass`, `extended` encounter, difficulty standard, Crimson Keep inert, Shop enabled (nothing in the mission requires a purchase), no Desert Raiders.
- Waves `[3,3,4,4,5,5]`, first wave tick 300, interval 900, one allied minion per wave, `until-objectives`.
- Crimson front towers: north, center, south.
- Phase `hold`: build 1 Archer Tower and defeat 3 Crimson waves. Phase `breach`: destroy any 2 of the 3 front towers.
- Defeat: Azure Keep below 50% health.

### Tower coverage at the pass mouth (probe, D4)

Of 155 placeable cells, 21 reach any lane point. The best cell, (col 14, row 12) at world (696, 600), covers 25 of 63 sample points in each lane up to x = 928, about 40% of the pass. It covers the mouth, not the interior or east exit, so the objective is phrased as holding the mouth. Geometry and tower mechanics are unchanged.

### First bot simulation (not tuned)

Shared test bot, north lane (front-north then front-center), one tower, Shield Bash: **victory at tick 3419 (114 s)**, objectives complete, Azure Keep 3000/3000, Guardian level 6, 10 kills, 1 Guardian death, one Archer Tower standing, front-north destroyed at 94 s and front-center at 114 s.

This is shorter than the 3–4.5 minute target. The floor is structural: wave 3 spawns at 70 s and the bot starts the breach the moment the hold phase completes. Candidate bounded adjustments (not applied): require 4 waves (about +30 s) and/or widen the interval from 900 to 1200 ticks (about +60 s). Human play will be slower than the bot, so the target may already be met by people; that needs a playtest.

## Verification

Focused tests, golden regression (fixtures unchanged), typecheck and production build, `git diff --check`, and one browser smoke (Chapter 2 selection, Level 11 start, Full Battle briefing). See the review report for results.

## Final verification (browser)

- Focused smoke 11/11 after correcting three assertions of the smoke script itself: two read only top-level scene text although the card and grid labels live in nested containers (and the first matched `AVAILABLE` exactly although the label is `AVAILABLE  ·  10/10 COMPLETE`), and one expected two HUD rows although the panel lists all three objectives (the Hold phase's two active rows plus the locked Breach row). The assertions are now stricter: exact label strings, nine `PENDING · UNRELEASED` slots, and row states `active, active, locked`.
- Updated for a released Chapter 2: `verify-campaign-progress` (129/129; Level 10 now says "Level 11 unlocked" and Continue targets Level 11), `verify-chapters` (Chapter 2 locked on a fresh save, available after ten clears with only Level 11 selectable), `verify-menu-readability` (170/170, now also measures the Chapter 2 grid and the Level 11 briefing), `verify-campaign-popup` (173/173; it now seeds a Levels 1-10 save because it launches Levels 2-4 directly, which the unlock guard redirected before S4), plus `verify-campaign-ui` (34/34), `verify-campaign-levels` (90/90) and `verify-campaign-selection`.

## Known follow-ups

- Level 11 balance and a human playtest; Canyon performance on a real device.
- The Chapter Select card status lines are 11 px on a mobile viewport (existing `ChapterSelect.ts` text, unchanged by S4); the readability script does not cover that scene.
