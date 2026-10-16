# Stage 1 UI Polish Slice 6

RC1 retention note: this report is included as the approved slice record. Referenced screenshots, generated verification JSON and `git-status.txt` are retained on disk as a historical local archive but omitted from the minimal RC1 commit. Their paths below are not required Git attachments. Current scope: `../rc1-audit/WHITELIST_REVIEW.md`.

## A. Workspace and Git

Worktree: `G:\work\ark\arkhero-integration-v041-v042`

Branch: `integration/gameplay-v041-ui-v042`

HEAD before and after: `80a24dffc7ed00c0d33b729d69c1919027856290`.

Final `git status --short`: see `git-status.txt` (27 modified files and 13 untracked entries, including inherited integration work; no staged files).

All pre-existing uncommitted integration, Balance B, Keep HUD and UI Polish 5/5.1 changes were preserved. No staging, commit, reset, clean, cherry-pick, push, merge or deployment was performed. No other worktree was modified.

## B. Build interaction

The existing 232 CSS-pixel structure selection panel remains. Choosing Wall or Archer Tower replaces it with a bottom placement tray 120 CSS pixels high (previous collapsed tray: 180). Its standard width is 272 CSS pixels; it narrows to fit the available safe-area/control gap. At 844x390, its top moves from the old selection panel's y=118 to y=246, exposing previously covered cells.

Only the selected structure's original artwork and live authoritative cost remain in placement mode. The tray includes placement/status instructions and Change, Confirm and Cancel. Their hit areas remain 48 CSS pixels high; the visual controls retain the shared fantasy styling. Confirm is disabled until a legal cell is selected. Touch can choose a different cell before confirmation. Change clears the preview and selected kind, returning to selection without resource deductions; it is disabled while a confirmation is pending. Cancel keeps the existing safe close/cancel behavior.

## C. Decorative Azure tower

Removed the static `tower` entity at world (620,495). It was never a simulation combatant. Its sprite, health bar, footprint and minimap entry disappear through the existing entity consumers. Removing the same entity consistently releases its decorative-only collision, navigation obstruction, line-of-sight obstruction and static placement restriction. No collision or placement algorithm was edited.

The tower rendering template is now a separate `towerVisual` value outside map occupancy. Battle uses it to render actual player-built and enemy towers with the original dimensions and team texture. Both Keeps, map walls, scenery, all eight Crimson towers, tower combat, waves and Balance B values remain unchanged. Azure Keep starts at 3000/3000 HP. Save format, progression and victory conditions were not edited.

## D. Slice 6 changes

| File | Reason |
| --- | --- |
| `src/ui/BuildPanel.ts` | Selected-only placement tray and Change control; preserve transparent hit targets and fantasy artwork. |
| `src/ui/buildLayout.ts` | Bottom-aligned 120px placement tray; expanded selection layout preserved. |
| `src/ui/buildModel.ts` | Pending-safe return to structure selection. |
| `src/world/layout.ts` | Remove the decorative map entity; retain a separate tower visual template. |
| `src/scenes/Battle.ts` | Use the visual template for actual tower combatants. Existing integration edits preserved. |
| `scripts/build-browser-helpers.mjs` | Switch structures through the real Change button; validate visible controls and selected-label geometry. |
| `scripts/verify-build-ui.mjs` | Add former-panel-cell touch, cell reselection, Change, disabled Confirm, tower absence and preserved Keep/enemy assertions. |
| `tests/build-ui.cjs` | Tray/return-state and former tower cell placement tests. |
| `tests/azure-defense-hud.cjs` | Replace the obsolete decorative-tower-presence contract with absence plus surviving map-wall assertions. Existing tower/Keep tests retained. |
| `tests/simulation.cjs` | Explicitly verify removed-tower collision is released and legitimate map walls still block. Existing integration edits preserved. |
| `docs/ui-polish-slice6/` | Before/after screenshots, browser verification JSON and this report. |

## E. Verification

| Check | Result |
| --- | --- |
| Pre-change focused baseline | 64/64 passed |
| TypeScript (`tsc --noEmit`, via build) | Passed |
| Production build | Passed, 69 modules; existing >500kB bundle warning |
| Full headless suite (`npm test`) | 539/539 passed; 0 failures/skips; 226945.8765 ms |
| Build touchscreen browser suite | 65/65 passed; 0 errors |
| Azure Keep HUD browser integration | 55/55 passed; 0 errors |
| Legacy build/placement browser regression | 24/24 passed; 0 errors |
| `git diff --check` | Passed |

Build checks cover all twelve requested interactions, pending double confirmation, exact 25 Wood wall and 80 Wood/10 Iron tower deductions, invalid/insufficient-resource rejection, pause/results/restart and camera pan. The legacy browser suite confirms a completed player-built tower attacks a real wave minion for 18 damage. Headless Azure tests additionally preserve 18 damage/24-tick cadence for both A and B and prohibit firing during construction.

The first new headless fixture used a map wall outside controlled territory and therefore correctly received `Outside controlled territory`. The fixture was corrected to inspect the Azure Keep's static occupancy inside controlled territory; map-wall collision remains explicitly asserted separately. This was a new test-fixture error, not a legacy failure or a gameplay-rule change. The final full suite passes without weakened legacy behavior checks.

Evidence: `after/build/verification.json`, `after/keep-hud/keep-hud-verification.json`, `after/phase1c/legacy/development/phase1b-verification.json`.

## F. Screenshots and mobile findings

- Before: `before/battlefield-844.png`, `before/expanded-844.png`, `before/placement-844.png`.
- After: `after/battlefield-844.png`, `after/placement-844.png`, `after/placement-960.png`, `after/placement-1280.png`.
- Formerly obstructed valid cell: `after/build/valid-placement-unobstructed.png`.
- Change return: `after/build/change-back-to-selection.png`.
- Changed tower placement cell: `after/build/tower-cell-changed.png`.
- Actual tower combat: `after/phase1c/legacy/development/screenshots/phase1b/tower-combat-960x540.png`.

Inspected rendered before/after screenshots. Geometry passes at 844x390, 960x540 and 1280x720, with and without unequal safe areas (32/12/8/12). Visible target height stays 48px, the bottom gesture reserve stays 24px, text fits and controls do not overlap. Keep health plates, top HUD, joystick, abilities and utilities remain clear. The formerly panel-covered cell is selected with an actual touchscreen gesture, not by setting placement state directly.

## G. Remaining concerns

No observed regression in the checks above. The compact tray still covers a small bottom patch of battlefield; existing camera panning remains available for those cells. Touch checks used Chrome headless touch emulation, not a physical mobile device. Removing the decorative obstacle intentionally opens that local path and placement area; no broader balance tuning was introduced.

## H. Verdict

GO for human playtest. All implementation and verification work is complete and intentionally uncommitted. Review mobile thumb comfort and formerly obstructed placement cells during the next playtest.
