# Chapter UI Phase 1A–1B

Implemented from committed campaign baseline `89624db` in isolated branch `codex/chapter-ui-phase1ab`. The baseline contains Levels 1–5 and the legacy special 20. Uncommitted Levels 6–8 were not copied; slots resolve them automatically after content integration. Slots 9–10 likewise remain pending until registered. This slice does not edit campaignLevels, Battle, HUD, briefing, save code or level selection.

`campaignChapters.ts` declares ten explicit intended story references per chapter. `chapterView.ts` projects registered content and the existing ProgressStore's authoritative states without storage access. Missing references are pending; Coming Soon chapters bind no missions. Legacy special modes are excluded using the current shared progression policy, not a new permanent ID list. Chapter 2 explicitly plans story Levels 11–20.

Main Menu Campaign opens ChapterSelect. Chapter 1 opens the existing CampaignSelect list. Back from Chapters opens Main Menu. Continue remains unchanged, including its existing up-to-date destination. The existing level list's Back still opens Main Menu: changing level-navigation behavior and replacing the list/grid are later slices. Full Battle on Chapters opens the unchanged campaign-20 briefing; its Back still returns to the existing level list. Main Menu Quick Play keeps its original launch route.

Artwork is a selection-only composition of existing grass, trees and Keep textures with tints for future chapter previews. There are no new battlefield textures, themes, geometry, mechanics or cutscenes. Chapter 2/3 names and narratives remain provisional. More chapter entries are supported through rows and scrolling, rather than fixed chapter-count conditions.

## Future Level 20 migration — deliberately not performed here

1. Introduce a stable non-campaign mode identity such as `full-battle` and route it through the existing quick/extended setup. Keep Full Battle always available, independent of story progression, and verify equivalent waves, towers, armed Keep, resources, shop and outcomes.
2. Keep `campaign-01`–`campaign-19` identities stable. Repurpose `campaign-20` only when the new Chapter 2 story finale is ready. Its local identity is Chapter 2 Mission 10, and its global identity remains campaign-20. The new finale gets chapter narrative/art and a future reviewed battlefield; comparable difficulty requires human playtesting.
3. Remove the legacy special classification of campaign-20 at that release. The existing contiguous progression can then run 1–20 and onward, provided all preceding missions are registered. Do not remove the exclusion while campaign-20 still points to the old encounter. Validate complete registration and chapter release together.
4. Existing successful special battles currently do not record campaign clears, so legitimate v1 saves normally have no campaign-20 clear. The parser nevertheless retains unknown/stale clear entries. Prevent those entries from becoming free story completion: use an explicit versioned migration that copies legitimate campaign-01–19 clears, discards any legacy campaign-20 clear, and preserves other valid unknown entries according to a documented policy. A version-2 save with a new key is a candidate to avoid old clients interpreting the repurposed ID; decide downgrade/multi-tab policy before release. Never infer finale completion from old special-mode play.
5. Separate new launch routes (`mode: quick` / extended or a typed non-campaign mode) from `mode: campaign, levelId: campaign-20`. Update bookmarks/debug routes, chapter entry, briefing, result return routes and tests together. If legacy external routes need compatibility, version or alias them explicitly rather than guess from the same ID.
6. Gate this migration with save fixtures, fresh and out-of-order progression, 19 → 20 → 21 unlocks, legacy/stale campaign-20 clears, special mode no-save assertions, deterministic extended equivalence, and later human difficulty validation. No navigation-only phase should attempt it.

## Verification

Run `node scripts/test.mjs chapter-view.cjs campaign-progress.cjs campaign-levels.cjs campaign.cjs campaign-ui.cjs` and `npm run build` in this worktree. `node scripts/verify-chapters.mjs` starts a temporary Vite server, runs real Chrome checks and writes ignored `test-results/chapters` evidence, then closes browser/server in finally. It covers fresh/partial/latest-released saves, chapter entry/Back, Continue, both Full Battle routes, no storage writes from navigation, future chapter input exclusion, desktop layouts and repeated shutdown/handler cleanup. Use `CHAPTER_EVIDENCE_ROOT` to direct evidence outside the worktree if desired.

### Results, 20 October 2026

- Focused tests: **63/63 passed**, including seven new chapter-model tests and existing deterministic Full Battle comparisons.
- `npm run build`: passed TypeScript and Vite production build. Existing large-bundle advisory remains (approximately 1.73 MB before gzip).
- New chapter browser suite: **29/29 passed**; zero browser/console/asset errors.
- Existing campaign UI suite: **33/33 passed** after adding the chapter hop to its entry helper.
- Existing menu readability suite: **97/97 passed**, zero browser/console/HTTP errors.
- Screenshots: `test-results/chapters/chapters-{960x540,1280x720,1366x768,1920x1080,844x390}.png` and `chapters-all-released-complete.png`. The 960×540 and 844×390 screenshots were visually inspected.
- `git diff --check`: passed. Protected registry, save/progression, Battle, HUD, MissionBriefing and CampaignSelect files exactly match `89624db`.
- Temporary verification servers and browsers closed. No commit, staging, merge, push or deployment.

The original checkout retains the same branch/HEAD and dirty-status file list. Its campaign content now includes independently added Levels 9–10; hashes differ from the earlier design-study snapshot in five campaign/content-test files. This implementation made no edits in that checkout and copied none of those changes. Its own baseline deliberately remains the committed five-mission campaign.

Changed files: new `campaignChapters.ts`, `chapterView.ts`, `ChapterSelect.ts`, `chapter-view.cjs`, `verify-chapters.mjs`, and this note; modified `main.ts`, MainMenu's Campaign entry, package script registration, and chapter-entry helpers in four existing browser scripts. Review limitations: existing level-list/briefing Back destinations remain unchanged, future art uses tinted existing sprites, future chapters remain unavailable, and the Level 20 migration is documentation only.
