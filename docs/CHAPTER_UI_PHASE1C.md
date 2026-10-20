# Chapter UI Phase 1C — ten-mission selection

Baseline: local commit `abeae49ddce9b3786e25b41352a7e9124a9b392f`, clean branch `codex/chapter-ui-phase1ab`, isolated worktree `C:/Users/patip/.codex/worktrees/chapter-ui-phase1ab/arkhero`. No uncommitted content was imported from the original campaign checkout or other worktrees. This baseline registers Levels 1–5 and legacy Full Battle, so story slots 6–10 remain pending here.

## Behavior

- ChapterSelect passes an explicit chapter ID. CampaignSelect resolves ten slots through the existing chapter metadata, registry and ProgressStore. Unknown, locked and Coming Soon chapters return to Chapters.
- Desktop uses five columns and two rows. At smaller rendered scale the grid becomes three columns with a masked, scrollable region. Details and navigation stay outside the mask. Locked/pending targets have no input; only fully visible open/replay targets accept input. Wheel and drag scroll; drag release never selects or launches.
- Cards show the actual registered name and text status, with separate completed/replay, available/recommended, locked/prerequisite and pending/unreleased presentations. Missing content has a generic numbered slot, not a fabricated title or playable definition.
- Selecting an open or completed tile updates its name and actual short description in a fixed detail panel. A separate Briefing button is required. A gold frame and “NEXT MISSION” label identify the recommendation independently of the current replay selection.
- Mission 10 has a double frame, “FINALE” label and subdued Crimson Keep illustration. It stays pending until the registry supplies real content.
- Default selection is the authoritative next mission; when all released content is complete it selects the latest available replay. Valid prior selection and grid scroll survive this menu's own lifecycle. No selection state is written to storage.
- Back returns to ChapterSelect. Full Battle has a separate fixed action and keeps the existing campaign-20 briefing/launch behavior. Main Menu Continue, MissionBriefing and Battle guards, results and save persistence are unchanged.

## Architecture and boundaries

`data/campaignSelection.ts` is a pure presentation projection over ChapterViewModel and existing progression. `ui/campaignLayout.ts` owns logical grid geometry, clamping and visibility. CampaignSelect owns drawing and input lifetimes. The menu refreshes and rechecks real registry/unlock state before opening a briefing.

There are no changes to campaignLevels, mission definitions, objectives, balance, simulation, world geometry, Battle, HUD, MainMenu, MissionBriefing or save/progress code. No battlefield themes, story cutscenes, Level 20 migration or Phase 1D return-routing logic. Existing briefing/results callers still enter CampaignSelect without chapter context and default to Chapter 1; broader return routing belongs to Phase 1D.

Browser verification helpers now exercise tile selection followed by the deliberate Briefing action, and use the separate Full Battle control. Existing progression, outcome, save and launch-guard assertions are retained with grid-specific labels/targets. The chapter browser suite reflects the new Grid → Chapters → Main Menu Back path.

## Verification and evidence

- `node scripts/test.mjs campaign-selection.cjs chapter-view.cjs campaign-progress.cjs campaign-ui.cjs`: 34 passed. Seven new selection/layout tests include future content display references without registering or constructing playable Levels 6–10.
- `npm run build`: passed TypeScript and production build; the existing large-bundle advisory remains.
- `node scripts/verify-campaign-selection.mjs`: 51 passed, zero browser/console/HTTP errors. Covers fresh/partial saves, all released complete, replay, recommendation, inert pending/locked slots, all ten slots reachable at small scale, drag suppression, clipping, Back, Continue, unchanged Full Battle, no storage writes, direct launch guards and input/resize-handler cleanup.
- Screenshots in ignored `test-results/campaign-selection/`: `grid-960x540.png`, `grid-1280x720.png`, `grid-1920x1080.png`, `grid-844x390.png`, `grid-finale-844x390.png`, `grid-all-released-complete.png`. All requested viewport screenshots and the small finale/replay views were visually inspected. Desktop fits all ten slots; smaller landscape uses a scrollbar and deliberate partial-row clipping with inert clipped targets.
- Chapter Selection browser suite: **29/29 passed** with the new Grid → Chapters Back path.
- Menu readability browser suite on final 11 px status labels: **97/97 passed**, zero browser/console/HTTP errors; includes 960×540, 844×390 and 740×360.
- An earlier campaign UI run passed **34/34**. The final-code rerun passed 24 checks, including campaign victory/defeat/retry and Full Battle HP behavior, then its browser closed unexpectedly at the development-only staged fixture. It is **not** counted as a completed final-code pass.
- Extended campaign polish and progress browser runs did not complete. The polish run also exposed an existing wall-time-dependent Quick Play restart assertion during an earlier attempt. Timing-harness experiments were reverted; this slice changes only its grid-entry helper. A later run passed 23 assertions before an unexpected browser closure. Progress runs were interrupted during cleanup and are not counted as passes.
- The host had roughly 0.6 GB RAM free during parallel verification. Remaining runs were serialized, but unexpected browser closures still occurred. This is a verification limitation, not proof of either an application defect or a clean full legacy battle regression. Rerun the extended battle suites with more resource headroom before treating them as fully verified.
- All requested Phase 1C cases are covered by the successful focused selection/model, chapter and readability suites. The production build and focused unit tests were rerun after the final font correction. Temporary verification servers on ports 5197/5198 were confirmed stopped.

Known limitations: only committed Levels 1–5 are released in this worktree; future content integration is separate. Missing slots have no mission description because there is no registered mission to describe. Available/completed mission descriptions appear on selection. Longer future content copy should be included in content-integration layout review. Phase 1D completion/return-routing behavior is intentionally unchanged. Evidence and generated build outputs remain ignored. Review approved one local Phase 1C commit; full legacy browser regression acceptance remains outstanding.

## Outstanding integration gate

- Complete campaign UI regression on the final code.
- Complete campaign polish regression on the final code.
- Complete campaign progress regression on the final code.
- Verify browser and Vite process cleanup without terminating user-owned processes.
- Run the suites sequentially with sufficient RAM available.
- Distinguish infrastructure/browser termination from actual game assertion failures in the results.

These incomplete suites are not accepted as full regression passes. The local-commit review does not rerun extended browser suites or change browser infrastructure. Phase 1D remains a separate task.

## Integrity and file manifest

Implementation review started on `codex/chapter-ui-phase1ab` at `abeae49`, with unstaged work only. Campaign registry, progression/save modules, Battle, HUD, MainMenu, MissionBriefing, world and simulation sources match that baseline. Review subsequently authorized one local Phase 1C commit, with no merge, push or deployment.

No writes were made to the original campaign or integration checkout. Independent work in the original checkout was observed during this task: five campaign verification scripts changed and `tests/campaign-levels-9-10.cjs` appeared. None of it was imported into this worktree. Consequently, byte-for-byte equality of that independently active checkout is not claimed.

Changed production files:

```text
src/data/campaignSelection.ts                 (new)
src/ui/campaignLayout.ts                      (new)
src/scenes/CampaignSelect.ts
src/scenes/ChapterSelect.ts
```

Changed verification/documentation files:

```text
docs/CHAPTER_UI_PHASE1C.md                     (new)
package.json
scripts/campaign-browser-helpers.mjs          (new)
scripts/verify-campaign-selection.mjs         (new)
scripts/verify-campaign-ui.mjs
scripts/verify-campaign-progress.mjs
scripts/verify-campaign-polish.mjs
scripts/verify-chapters.mjs
scripts/verify-menu-readability.mjs
tests/campaign-selection.cjs                  (new)
```
