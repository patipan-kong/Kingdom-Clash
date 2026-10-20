# Chapter 1 Integration A — merge and test adaptation

## Sources and merge state

- Common ancestor: `89624db9ec09836197a61b449e320add05dc8a14`.
- Gameplay: `codex/stage2-s5-campaign-progression`, `fc94009a59bc7840ad48ec2e950834008f914327`.
- Chapter UI: `codex/chapter-ui-phase1ab`, `1c0e7817b071a31a4fef954d61d0de11e2673b38`.
- New worktree: `C:/Users/patip/.codex/worktrees/chapter1-integration/arkhero`; branch `codex/chapter1-integration`.
- Created at the common ancestor, fast-forwarded to gameplay, then merged Chapter UI with `--no-ff --no-commit`. The integration branch remains at gameplay HEAD with Chapter UI as MERGE_HEAD. No integration commit is created.

Both source worktrees had clean tracked status before integration. The gameplay checkout contained exactly the five unrelated untracked documents listed below; Chapter UI was clean. The existing integration worktree is not reused or modified.

## Reconciliation

Textual conflicts were limited to `scripts/verify-campaign-progress.mjs` (six hunks) and `scripts/verify-campaign-ui.mjs` (one hunk). Progress scenarios for Levels 6–10, including phase/HUD checks, are retained alongside chapter navigation, deliberate Briefing, completed/replay labels, correct locked counts and Full Battle outside the story grid. Ten-level seeds from gameplay and grid helpers from Chapter UI are retained in the cleanly merged polish and readability scripts.

No integration-specific changes are made under `src/`: runtime comes from Chapter UI, with `campaignLevels.ts` from gameplay. Simulation, world, balance, registry policy, ProgressStore and save schema are not modified during reconciliation. Full Battle remains the legacy special mode.

Files adapted beyond the incoming source changes:

```text
scripts/campaign-browser-helpers.mjs
scripts/verify-campaign-levels.mjs
scripts/verify-campaign-polish.mjs
scripts/verify-campaign-progress.mjs
scripts/verify-campaign-selection.mjs
scripts/verify-campaign-ui.mjs
scripts/verify-chapters.mjs
scripts/verify-menu-readability.mjs
tests/campaign-selection.cjs
tests/chapter-view.cjs
```

The shared helper uses measured target bounds and clamped scroll destinations through real wheel input. It preserves both touch and mouse selection followed by deliberate Briefing. Desktop tests accept a fully visible 5×2 grid; small landscape tests retain real clipping, finale reachability and drag-release selection suppression. Unit fixtures cover all ten real missions and explicit partial registries, without duplicate registered references or fabricated playable content. Chapter 1 reaches 10/10 and remains replayable.

## Verification boundary

Integration A runs full unit tests, a standalone TypeScript check, the production build, static browser-script syntax checks and Git diff-checks. Browser scripts are adapted but not executed. No browser, Vite development server or human playtest is started in this phase.

Results:

- `npm test`: **685/685 passed**, zero failed, cancelled or skipped.
- `npx --no-install tsc --noEmit`: passed.
- `npm run build`: TypeScript and Vite production build passed; the existing large-bundle advisory remains.
- `node --check` passed for nine relevant browser/helper scripts, without executing them.
- `git diff --check` and `git diff --cached --check`: passed. No unmerged entries, unstaged changes or untracked files remain in the integration worktree. Generated dependencies, test transpilation and build output are ignored and excluded from the staged merge.

The campaign UI, campaign polish and campaign progress legacy browser regression gate remains open. Integration B must run the adapted suites sequentially with sufficient RAM, verify test-owned browser/server cleanup and distinguish browser/infrastructure termination from assertion failures. Integrated viewport inspection and human playtesting of Levels 6–10 remain separate acceptance work.

## Source protection

The original gameplay checkout and Chapter UI worktree are read only. The original checkout's branch HEAD, status and SHA-256 hashes of all five unrelated documents are checked before and after integration. They are not copied, staged, stashed, cleaned or deleted:

```text
docs/GAMEPLAY_BALANCE_INVESTIGATION.md
docs/POST_PLAYTEST_LOOP_INVESTIGATION.md
docs/UI_A2_COMPACT_MATCH_DESIGN.md
docs/UI_A_COMPACT_HUD_DESIGN.md
docs/UI_REDESIGN_PROPOSAL_V042.md
```

Final comparison: gameplay remains at `fc94009a59bc7840ad48ec2e950834008f914327`, with clean tracked status and the same five untracked documents; all five hashes match the preflight snapshot. Chapter UI remains clean at `1c0e7817b071a31a4fef954d61d0de11e2673b38`, with an empty index. Both source branch tips are unchanged. The new integration worktree has 30 staged merge paths, with all conflicts resolved and HEAD still at `fc94009`; MERGE_HEAD is `1c0e781`.

No push, deployment, main-branch merge, Chapter 2 work or Integration B is performed. Stop for review before committing.
