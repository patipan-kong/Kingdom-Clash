# RC1 proposed whitelist review — 2026-10-16

## Recommendation and accounting

Recommend the revised exact `PROPOSED_COMMIT_FILES.txt`: **46 files** (36 implementation/test/script files +10 documentation/fixture/review files), with no screenshots. All13 source files, all11 tests and all12 scripts from the original proposal remain. UI v0.4.2 already in HEAD remains in ancestry.

The original211 files are classified individually below: **45 REQUIRED, 46 OPTIONAL, 120 EXCLUDE**. The new review document itself is one additional REQUIRED release-scope decision record, bringing the revised proposal to46. OPTIONAL files are deliberately NOT in the minimal whitelist; none of the166 omitted original files is to be staged. Exclusion is from Git scope only: every original file stays on disk.

The original inventory totaled98,860,967 bytes (about94.3MiB). The166 omitted files account for98,296,411 bytes (about93.7MiB), not counting Git compression/deduplication. These are measured original bytes, not a claim about final commit size. The original broad manifest is recoverable as the211 exact paths in this table; no second obsolete whitelist is introduced.

## Selection rationale

- REQUIRED source/tests/scripts preserve all approved gameplay, UI and functional verification coverage. Even retargeted legacy checks and A/C comparison harness support are retained; no source cleanup or test removal is folded into this review.
- REQUIRED release docs retain Balance B rationale, HUD contracts, integration provenance/conflict resolution, legacy debt and physical-device limits, and Slice6/7 acceptance records. Historical asset references are explicitly labeled local-only outputs.
- `docs/ui-polish-slice7/before/verification.json` is REQUIRED because `scripts/verify-pause-menu.mjs` reads its `semantics` during the default after run. Do not discard or regenerate it from the polished menu as though it were ordinary output. Its other historical metadata is retained unchanged to avoid a test/fixture redesign.
- The small isolated `touchcancel-diagnostic.json` is REQUIRED to retain evidence supporting the accepted no-Pause warning classification. The current full Combat result is reproducible output; its exact25/26 result and intervention are retained in the release audit.
- OPTIONAL captures and metadata preserve distinct pre/post visual history, experiments or a one-off source-hash audit. Useful for an archive/review bundle, but not required for a build, maintained test or release decision; omit them from the minimal commit.
- EXCLUDE repeated Keep HUD matrices across integration/Slice6/Slice7/RC1, per-action generated Build captures/results, old Combat attempts, transient Git status dumps and the malformed-URL audit attempt. These are superseded or reproducible outputs, not maintained test inputs. Their relevant outcomes/limitations are preserved in release docs.
- Only two groups are byte-identical in the original inventory: RC1/Slice6 Build verification JSON; and Slice6/Slice7 Keep idle1280 screenshots. Other overlapping runs are redundant by purpose, not necessarily identical bytes. No claim that all excluded images are identical.
- No app assets, package files, ignored build products, other worktrees or new implementation paths are added. No ignore rules or output-folder conventions were changed.

## Documentation and verification policy

The RC1 audit result remains CONDITIONAL GO for a local commit after explicit approval of this reduced scope and known test debt. Historical browser failures and lack of physical Android/iOS/Safari/notch/gesture testing remain recorded. This scope-only review reran no application tests; the previous audit's539/539 headless,192/192 Pause,65/65 Build,55/55 Keep and25/26 Combat results are prior verification, not new results from this review.

Existing reports retain local evidence paths so the on-disk archive stays usable. Files marked OPTIONAL/EXCLUDE are not guaranteed in a Git-only checkout and are not essential release-doc attachments. Test outputs can be regenerated using the maintained harnesses; only the frozen Pause baseline is a committed test input. Avoid running `PAUSE_PHASE=before` on the polished tree, which would overwrite that historical fixture.

Verification for this review: original inventory exists;211 distinct classifications; revised46 distinct paths exist; all36 source/test/script hashes unchanged; all166 omitted files still exist and hashes unchanged; revised manifest equals REQUIRED original paths plus this review; no staged changes; branch/HEAD unchanged; Git diff whitespace check passed. This is not staging or commit approval.

## Per-file classification of the original211

| File | Class | Reason |
| --- | --- | --- |
| `docs/AZURE_DEFENSE_HUD.md` | REQUIRED | Maintained Keep HUD contract and historical tower diagnosis, with current removal notice. |
| `docs/GAMEPLAY_V041_UI_V042_INTEGRATION.md` | REQUIRED | Integration provenance, conflict resolution, approved scope and legacy test-debt inventory. |
| `docs/GAMEPLAY_V0_4_1.md` | REQUIRED | Balance experiment rationale and approved B selection context referenced by source. |
| `docs/RC1_AUDIT.md` | REQUIRED | Current RC1 release scope, verified gates, exceptions and approval boundary. |
| `docs/gameplay-v041/azure-keep-hud-full-844x390.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/gameplay-v041/azure-keep-hud-full-960x540.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/gameplay-v041/azure-keep-hud-low-dead-844x390.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/gameplay-v041/azure-keep-hud-low-dead-960x540.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/integration-v041-v042/keep-hud-build-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/integration-v041-v042/keep-hud-build-960x540.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/integration-v041-v042/keep-hud-dead-far-low-1280x720.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/integration-v041-v042/keep-hud-dead-far-low-844x390-safe.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/integration-v041-v042/keep-hud-dead-far-low-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/integration-v041-v042/keep-hud-dead-far-low-960x540.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/integration-v041-v042/keep-hud-defeat-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/integration-v041-v042/keep-hud-idle-1280x720.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/integration-v041-v042/keep-hud-idle-844x390-safe.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/integration-v041-v042/keep-hud-idle-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/integration-v041-v042/keep-hud-idle-960x540.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/integration-v041-v042/keep-hud-inspector-960x540.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/integration-v041-v042/keep-hud-paused-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/integration-v041-v042/keep-hud-shop-1280x720.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/integration-v041-v042/keep-hud-shop-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/integration-v041-v042/keep-hud-shop-960x540.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/integration-v041-v042/keep-hud-skills-1280x720.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/integration-v041-v042/keep-hud-skills-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/integration-v041-v042/keep-hud-skills-960x540.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/integration-v041-v042/keep-hud-verification.json` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/integration-v041-v042/ui-polish/build-confirm-cancel-1280x720.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/integration-v041-v042/ui-polish/build-confirm-cancel-844x390.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/integration-v041-v042/ui-polish/equipment-sell-844x390.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/integration-v041-v042/ui-polish/equipment-sell-confirm-844x390.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/integration-v041-v042/ui-polish/evidence.json` | OPTIONAL | Historical verification metadata; useful archive, not a runtime fixture or essential release document. |
| `docs/integration-v041-v042/ui-polish/item-details-buy-844x390.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/integration-v041-v042/ui-polish/item-details-disabled-844x390.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/integration-v041-v042/ui-polish/item-details-warning-844x390.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/integration-v041-v042/ui-polish/keep-plate-gameplay-960x540.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/integration-v041-v042/ui-polish/keep-plate-guardian-dead-960x540.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/integration-v041-v042/ui-polish/shop-equipment-960x540.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/integration-v041-v042/ui-polish/shop-grid-844x390.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/integration-v041-v042/ui-polish/shop-grid-960x540.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/integration-v041-v042/ui-polish/skills-compact-844x390.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/integration-v041-v042/ui-polish/skills-standard-1280x720.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/rc1-audit/PROPOSED_COMMIT_FILES.txt` | REQUIRED | Exact revised staging proposal; approval boundary, not a generated test artifact. |
| `docs/rc1-audit/build/active-combat-visible.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/build/archer-tower-selected.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/build/build-panel-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/build/build-panel-960x540.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/build/change-back-to-selection.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/build/confirmed-construction.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/build/construction-rejected.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/build/insufficient-iron.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/build/insufficient-wood.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/build/invalid-placement.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/build/pending-construction.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/build/tower-cell-changed.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/build/tower-construction-started.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/build/valid-placement-unobstructed.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/build/verification.json` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/build/wall-selected.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/combat-hud/verification.json` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/keep-hud-rerun/keep-hud-build-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/keep-hud-rerun/keep-hud-build-960x540.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/keep-hud-rerun/keep-hud-dead-far-low-1280x720.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/keep-hud-rerun/keep-hud-dead-far-low-844x390-safe.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/keep-hud-rerun/keep-hud-dead-far-low-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/keep-hud-rerun/keep-hud-dead-far-low-960x540.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/keep-hud-rerun/keep-hud-defeat-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/keep-hud-rerun/keep-hud-idle-1280x720.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/keep-hud-rerun/keep-hud-idle-844x390-safe.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/keep-hud-rerun/keep-hud-idle-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/keep-hud-rerun/keep-hud-idle-960x540.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/keep-hud-rerun/keep-hud-inspector-960x540.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/keep-hud-rerun/keep-hud-paused-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/keep-hud-rerun/keep-hud-shop-1280x720.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/keep-hud-rerun/keep-hud-shop-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/keep-hud-rerun/keep-hud-shop-960x540.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/keep-hud-rerun/keep-hud-skills-1280x720.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/keep-hud-rerun/keep-hud-skills-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/keep-hud-rerun/keep-hud-skills-960x540.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/keep-hud-rerun/keep-hud-verification.json` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/rc1-audit/keep-hud/failure.png` | EXCLUDE | Superseded failed audit invocation (malformed base URL); cause and successful rerun summarized in release audit. |
| `docs/rc1-audit/keep-hud/keep-hud-verification.json` | EXCLUDE | Superseded failed audit invocation (malformed base URL); cause and successful rerun summarized in release audit. |
| `docs/ui-polish-slice6/REPORT.md` | REQUIRED | Approved compact placement and decorative-tower removal release record. |
| `docs/ui-polish-slice6/after/battlefield-1280.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/ui-polish-slice6/after/battlefield-844.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/ui-polish-slice6/after/battlefield-960.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/ui-polish-slice6/after/build/active-combat-visible.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/build/archer-tower-selected.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/build/build-panel-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/build/build-panel-960x540.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/build/change-back-to-selection.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/build/confirmed-construction.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/build/construction-rejected.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/build/insufficient-iron.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/build/insufficient-wood.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/build/invalid-placement.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/build/pending-construction.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/build/tower-cell-changed.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/build/tower-construction-started.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/build/valid-placement-unobstructed.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/build/verification.json` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/build/wall-selected.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/keep-hud/keep-hud-build-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/keep-hud/keep-hud-build-960x540.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/keep-hud/keep-hud-dead-far-low-1280x720.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/keep-hud/keep-hud-dead-far-low-844x390-safe.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/keep-hud/keep-hud-dead-far-low-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/keep-hud/keep-hud-dead-far-low-960x540.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/keep-hud/keep-hud-defeat-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/keep-hud/keep-hud-idle-1280x720.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/keep-hud/keep-hud-idle-844x390-safe.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/keep-hud/keep-hud-idle-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/keep-hud/keep-hud-idle-960x540.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/keep-hud/keep-hud-inspector-960x540.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/keep-hud/keep-hud-paused-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/keep-hud/keep-hud-shop-1280x720.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/keep-hud/keep-hud-shop-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/keep-hud/keep-hud-shop-960x540.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/keep-hud/keep-hud-skills-1280x720.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/keep-hud/keep-hud-skills-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/keep-hud/keep-hud-skills-960x540.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/keep-hud/keep-hud-verification.json` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice6/after/phase1c/legacy/development/phase1b-verification.json` | OPTIONAL | Historical verification metadata; useful archive, not a runtime fixture or essential release document. |
| `docs/ui-polish-slice6/after/phase1c/legacy/development/screenshots/phase1b/build-menu-844x390.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/ui-polish-slice6/after/phase1c/legacy/development/screenshots/phase1b/build-menu-960x540.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/ui-polish-slice6/after/phase1c/legacy/development/screenshots/phase1b/invalid-wall-960x540.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/ui-polish-slice6/after/phase1c/legacy/development/screenshots/phase1b/mobile-844x390.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/ui-polish-slice6/after/phase1c/legacy/development/screenshots/phase1b/tower-combat-960x540.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/ui-polish-slice6/after/phase1c/legacy/development/screenshots/phase1b/wall-preview-960x540.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/ui-polish-slice6/after/placement-1280.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/ui-polish-slice6/after/placement-844.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/ui-polish-slice6/after/placement-960.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/ui-polish-slice6/before/battlefield-844.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/ui-polish-slice6/before/expanded-844.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/ui-polish-slice6/before/placement-844.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/ui-polish-slice6/git-status.txt` | EXCLUDE | Transient pre-commit worktree snapshot; immediately stale and reproducible with git status. |
| `docs/ui-polish-slice7/REPORT.md` | REQUIRED | Accepted Pause Menu release record and behavior-verification summary. |
| `docs/ui-polish-slice7/after/combat-hud-rerun/verification.json` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice7/after/combat-hud/verification.json` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice7/after/keep-hud/keep-hud-build-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice7/after/keep-hud/keep-hud-build-960x540.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice7/after/keep-hud/keep-hud-dead-far-low-1280x720.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice7/after/keep-hud/keep-hud-dead-far-low-844x390-safe.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice7/after/keep-hud/keep-hud-dead-far-low-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice7/after/keep-hud/keep-hud-dead-far-low-960x540.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice7/after/keep-hud/keep-hud-defeat-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice7/after/keep-hud/keep-hud-idle-1280x720.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice7/after/keep-hud/keep-hud-idle-844x390-safe.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice7/after/keep-hud/keep-hud-idle-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice7/after/keep-hud/keep-hud-idle-960x540.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice7/after/keep-hud/keep-hud-inspector-960x540.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice7/after/keep-hud/keep-hud-paused-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice7/after/keep-hud/keep-hud-shop-1280x720.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice7/after/keep-hud/keep-hud-shop-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice7/after/keep-hud/keep-hud-shop-960x540.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice7/after/keep-hud/keep-hud-skills-1280x720.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice7/after/keep-hud/keep-hud-skills-844x390.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice7/after/keep-hud/keep-hud-skills-960x540.png` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice7/after/keep-hud/keep-hud-verification.json` | EXCLUDE | Reproducible or superseded generated browser-run output; maintained scripts and release summaries retained. |
| `docs/ui-polish-slice7/after/pause-740x370-safe.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/ui-polish-slice7/after/pause-740x370.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/ui-polish-slice7/after/pause-844x390-safe.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/ui-polish-slice7/after/pause-844x390.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/ui-polish-slice7/after/pause-960x540.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/ui-polish-slice7/after/verification.json` | EXCLUDE | Generated Pause result, not test input; summary retained and script regenerates it. Pre-polish baseline is retained separately. |
| `docs/ui-polish-slice7/before/pause-740x370-safe.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/ui-polish-slice7/before/pause-740x370.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/ui-polish-slice7/before/pause-844x390-safe.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/ui-polish-slice7/before/pause-844x390.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/ui-polish-slice7/before/pause-960x540.png` | OPTIONAL | Useful historical visual comparison, not required to build or run maintained tests; omit from minimal commit. |
| `docs/ui-polish-slice7/before/verification.json` | REQUIRED | Runtime input read by verify-pause-menu.mjs; immutable pre-polish semantic fixture, not disposable output. |
| `docs/ui-polish-slice7/git-status.txt` | EXCLUDE | Transient pre-commit worktree snapshot; immediately stale and reproducible with git status. |
| `docs/ui-polish-slice7/source-audit.json` | OPTIONAL | Historical Slice 7 source-hash snapshot; useful provenance, not a functional test dependency. |
| `docs/ui-polish-slice7/touchcancel-diagnostic.json` | REQUIRED | Small isolated no-Pause diagnostic supporting the accepted Chrome-warning exception. |
| `scripts/balance-v04.mjs` | REQUIRED | Maintained verification, coordinate helper or deterministic balance harness; retain existing coverage. |
| `scripts/balance-v041.mjs` | REQUIRED | Maintained verification, coordinate helper or deterministic balance harness; retain existing coverage. |
| `scripts/browser-coordinates.mjs` | REQUIRED | Maintained verification, coordinate helper or deterministic balance harness; retain existing coverage. |
| `scripts/build-browser-helpers.mjs` | REQUIRED | Maintained verification, coordinate helper or deterministic balance harness; retain existing coverage. |
| `scripts/verify-azure-keep-hud.mjs` | REQUIRED | Maintained verification, coordinate helper or deterministic balance harness; retain existing coverage. |
| `scripts/verify-build-ui.mjs` | REQUIRED | Maintained verification, coordinate helper or deterministic balance harness; retain existing coverage. |
| `scripts/verify-combat-hud.mjs` | REQUIRED | Maintained verification, coordinate helper or deterministic balance harness; retain existing coverage. |
| `scripts/verify-match.mjs` | REQUIRED | Maintained verification, coordinate helper or deterministic balance harness; retain existing coverage. |
| `scripts/verify-pause-menu.mjs` | REQUIRED | Maintained verification, coordinate helper or deterministic balance harness; retain existing coverage. |
| `scripts/verify-progression.mjs` | REQUIRED | Maintained verification, coordinate helper or deterministic balance harness; retain existing coverage. |
| `scripts/verify-skills.mjs` | REQUIRED | Maintained verification, coordinate helper or deterministic balance harness; retain existing coverage. |
| `scripts/verify.mjs` | REQUIRED | Maintained verification, coordinate helper or deterministic balance harness; retain existing coverage. |
| `src/data/gameplayV041.ts` | REQUIRED | Approved application implementation. |
| `src/scenes/Battle.ts` | REQUIRED | Approved application implementation. |
| `src/scenes/HUD.ts` | REQUIRED | Approved application implementation. |
| `src/simulation/GuardianSkills.ts` | REQUIRED | Approved application implementation. |
| `src/simulation/Simulation.ts` | REQUIRED | Approved application implementation. |
| `src/ui/BuildPanel.ts` | REQUIRED | Approved application implementation. |
| `src/ui/ShopPanel.ts` | REQUIRED | Approved application implementation. |
| `src/ui/SkillsPanel.ts` | REQUIRED | Approved application implementation. |
| `src/ui/azureKeepHud.ts` | REQUIRED | Approved application implementation. |
| `src/ui/buildLayout.ts` | REQUIRED | Approved application implementation. |
| `src/ui/buildModel.ts` | REQUIRED | Approved application implementation. |
| `src/ui/fantasyTheme.ts` | REQUIRED | Approved application implementation. |
| `src/world/layout.ts` | REQUIRED | Approved application implementation. |
| `tests/artifact-transactions.cjs` | REQUIRED | Maintained functional regression tests. |
| `tests/artifacts.cjs` | REQUIRED | Maintained functional regression tests. |
| `tests/azure-defense-hud.cjs` | REQUIRED | Maintained functional regression tests. |
| `tests/balance-v02.cjs` | REQUIRED | Maintained functional regression tests. |
| `tests/build-ui.cjs` | REQUIRED | Maintained functional regression tests. |
| `tests/encounter.cjs` | REQUIRED | Maintained functional regression tests. |
| `tests/gameplay-v04.cjs` | REQUIRED | Maintained functional regression tests. |
| `tests/gameplay-v041.cjs` | REQUIRED | Maintained functional regression tests. |
| `tests/guardian-skills.cjs` | REQUIRED | Maintained functional regression tests. |
| `tests/match.cjs` | REQUIRED | Maintained functional regression tests. |
| `tests/simulation.cjs` | REQUIRED | Maintained functional regression tests. |

## Approval boundary

Do not stage this file or any proposed file until explicitly approved. After approval, stage only the revised exact whitelist, never directory globs or blanket add. Omitted files intentionally remain untracked/on disk; a dirty status from those artifacts after a future commit is expected. Any new application/test modification or unreviewed path requires another scope check. No stage, commit, push, merge, deployment, deletion or gameplay/UI change was performed by this review.
