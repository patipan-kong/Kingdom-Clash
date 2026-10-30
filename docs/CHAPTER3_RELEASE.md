# Chapter 3 · Release integration

Branch `chapter3/release`, off `chapter3/m6-frost-warlord` (e953053). Local only: not pushed, merged into `main` or deployed.

## Integration order

`main` (1dfd2f6) is an ancestor of the whole Chapter 3 line, which is linear and has nothing on `main` yet:
`56083fd` navigation perf, `5ccb262` Azure Barracks, `5de8a73` M1-M3 integration, `0f57388` M4, `96cde4c` M5, `e953053` M6. Branching from M6 therefore carries M4, M5 and M6 with no merge and no overwritten gameplay. Azure Barracks limits are untouched: M1-M4 and M6 at 3, M5 at 2.

## What this commit changes

- `src/data/campaignChapters.ts`: Chapter 3 `release: 'available'` and its narrative. Unlocking is the existing derived progression (Chapter 2 Mission 6 cleared opens Mission 1, then one mission at a time). The save format is unchanged (version 1 entries under `kingdom-clash.campaign.v2`); existing saves unlock Chapter 3 from their Chapter 2 clears with no migration. The `?debug=1` launch still bypasses unlock and records nothing (dev builds only).
- Mission Select art for all six missions: `public/assets/mission-art-campaign-21..26.webp` (341 x 375 like the Chapter 1-2 cards) and their entries in `src/ui/missionCardArt.ts`. 21-25 are crops of the approved mission collage (Frost Citadel, Broken Wall, Barracks camp, Twin Walls gate bridge, Fallen Outposts towers). **26 is not the collage's blue hammer boss**: it is the approved red-black Frost Warlord (concept sheet cut-out: white fur mantle, red cape, battle axe) over a darkened Twin Walls fortress.
- Tests: the Chapter 3 "coming soon" pins became released-state checks (`campaign-level-21..26`, `campaign-progress`, `chapter-view`, `six-missions`) plus `tests/support/chapter3Save.cjs`.

## Verified

`npx tsc --noEmit` clean; `npm test` 1,033 / 1,033; `npm run build` green (existing chunk-size warning). Browser (dev server, desktop 1280 x 720 and mobile landscape 844 x 390 at scale 2, no console errors): a fresh save shows Chapter 3 locked (not Coming Soon); Chapters 1-2 cleared opens Chapter 3 with only Mission 1 playable; five Chapter 3 clears show six illustrated cards with Mission 6 as PLAY; Mission Briefing and Battle open for Missions 1 and 6 through normal progression.

## Notes

- `scripts/verify-chapters.mjs` and `scripts/verify-campaign-progress.mjs` still pin Chapter 3 as Coming Soon (and the first already fails at the removed Quick Play button on `main`). They are not part of `npm test` and were left alone.
- The Mission 6 card crops the wide Warlord art, so the axe is partly cut at card width.
