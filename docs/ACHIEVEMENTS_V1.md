# Achievement V1

Branch `feature/achievements-v1` (from `a40f7b8`). No Chapter 4 availability, balance or simulation change.

## What it is
- `src/data/achievements.ts` — catalogue (one entry: `ballista-recovered`, Cliff Pass `campaign-32`, technology `ballista`) and the pure rule `earnedBy(run)`: victory AND a finished Ballista repair.
- `src/data/achievementSave.ts` — save `{version:1, unlocked:{id:epochMs}, bestTimes:{levelId:ticks}}` under `kingdom-clash.achievements.v1`. Strict parse (bad entries dropped, status `recovered`), a newer version is never writable, merge keeps the earlier unlock and the smaller tick count (commutative, idempotent). `technologiesOf` derives build rights from unlocked ids; nothing else stores them.
- `src/data/achievementStore.ts` — `AchievementStore`, same conventions as `ProgressStore`: refresh/merge, memory fallback when storage is unreadable or unwritable, no overwrite of a newer save, `record(run)` returns the ids unlocked for the first time.
- `src/data/achievementView.ts` — the cards the screen shows: only achievements whose mission passes `progress.isUnlocked` (so Replay and visibility follow the existing campaign rules). Counter hidden when the list is empty. Fixture lists for the dev preview.
- `src/scenes/Achievements.ts` — the screen (grey locked cards, date and best time on unlocked ones, Replay through `MissionBriefing`, friendly empty state, drag/wheel scroll when the cards do not fit).
- `Battle.ts` — sets a flag from the real `construction-complete` event of a structure with `ballista:true` and Azure team; on Victory records through the same gate as campaign progress (`recordsProgress`: never a debug or fixture run). Best time is the simulation's own victory tick (30 per second).
- `MainMenu.ts` — ACHIEVEMENTS button; dev-only `?achievementsPreview=mixed|locked|unlocked|empty` (fixtures, no storage read or write, Replay off). Not available in a production build (`import.meta.env.DEV`).

## Rules kept
- Achievement only after repair AND victory; a win without a repair saves the best time and no achievement; a defeat saves nothing.
- No retroactive grant: nothing reads the campaign save to guess earlier repairs.
- The first unlock time is never changed; a faster win lowers the best time only.
- No Chapters 1–3 achievements.

## Known limits
- Chapter 4 is still a coming-soon card, so on the real screen the list is empty (and a saved Ballista achievement stays hidden) until Chapter 4 is released. The screen was verified on fixtures for that reason.
- Chapter 4 is outside the playable sequence, so Replay is unreachable in production by construction. The Replay browser check releases Chapter 4 in memory on a dev page only (see below).
- The result screen shows no unlock notification (optional in the brief, omitted).

## Verification
- `node scripts/test.mjs achievements.cjs` (11 tests); full suite 1112/1112.
- `ACH_URL=http://127.0.0.1:5301/ node scripts/verify-achievements.mjs` against a dev server (stills in `docs/screenshots/achievements`).
- `ACH_URL=... node scripts/verify-achievements-focused.mjs`: Replay opens the campaign-32 Mission Briefing (Chapter 4 released in memory on the dev page only, campaign progress seeded in throwaway browser contexts; a locked mission offers no card and the briefing refuses it); Main Menu ACHIEVEMENTS layout, click and Back at 960x540, 667x375 and 568x320, with and without progress. On the smallest landscape canvas the enlarged touch rectangles of CAMPAIGN and ACHIEVEMENTS overlap at their edges, as Continue and Campaign already did; the visible buttons never overlap and centre taps go to the right button.
