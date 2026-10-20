# Chapter UI Phase 1D — navigation and return routing

Baseline: `809468d9a7444ae0db12dc130a4d72b2465fb3ee` on `codex/chapter-ui-phase1ab`, verified clean before implementation in `C:/Users/patip/.codex/worktrees/chapter-ui-phase1ab/arkhero`. No other checkout is modified. No uncommitted campaign content is imported.

## Routing decisions

- `campaignNavigation.ts` resolves transient destinations from chapter metadata, registered mission identity and authoritative progression. Story identity takes priority over supplied chapter context. Invalid, locked and pending identities cannot select a locked mission or start a match.
- MissionBriefing derives a valid destination even when Main Menu Continue or a direct scene launch bypasses Chapters and the grid. Back carries chapter and selected mission explicitly. Battle launch carries the same destination; existing retry passes it through unchanged.
- HUD's existing pause/results exit uses the Battle launch destination. This is the necessary navigation-only HUD change: previously it started CampaignSelect without data. Battle's only runtime changes normalize launch context and supply a safe destination for its existing blocked-launch guard. Simulation setup, outcome evaluation, victory recording and retry mechanics are unchanged.
- Returning to a story grid selects the played mission, including completed replays. CampaignSelect refreshes ProgressStore on creation, so newly unlocked missions appear immediately and the next recommendation remains independent of replay selection. A fresh Continue entry overrides a stale grid selection with the mission it actually opened.
- Legacy Full Battle returns to its entry screen: Chapters by default, or the source grid and its selected story mission when launched there. Briefing, pause and results labels reflect the destination. It is never assigned to Chapter 2 or recorded as story progress. Main Menu Quick Play remains unchanged.
- Destinations live only in scene data. No save schema, storage key, progression policy or save writes are added. Existing registry/unlock guards remain authoritative.

## Verification

Focused command: `node scripts/test.mjs campaign-navigation.cjs campaign-selection.cjs chapter-view.cjs campaign-progress.cjs campaign-ui.cjs` — 39/39 passed, including five new pure routing/store tests.

Production build passed TypeScript and Vite with the existing large-bundle advisory.

Targeted browser command: `node scripts/verify-campaign-routing.mjs`. One browser and page run sequential real-scene checks for direct Continue, normal chapter entry, Briefing Back, actual victory/unlock refresh, replay defeat, retry, both Full Battle entry locations, guards, stable handler counts and save-write counts. Its `finally` closes its own browser and Vite server. Ignored screenshots/report are written to `test-results/campaign-routing/`.

Result: **18/18 passed**, no page errors. Actual victory produced exactly one save write; browsing, defeats, retry, guard redirects and Full Battle produced none. Handler counts remained stable through repeated Briefing/Grid transitions. The return-grid screenshot was visually inspected at 960×540.

Cleanup: the report confirms `browserClosed: true` and `serverClosed: true`. The verifier, its Chrome process and esbuild child were absent after exit; its Vite port 5174 had no listener. No user-owned processes were terminated. The targeted run was slow on this host but completed successfully; this does not close the legacy regression gate below.

## Outstanding integration gate and limitations

- Complete the legacy campaign UI, campaign polish and campaign progress browser regressions on integrated final code. Their earlier incomplete runs are not accepted as passes.
- Run those suites sequentially with sufficient RAM, verify browser and Vite cleanup, and distinguish infrastructure/browser termination from actual game assertion failures.
- This slice runs only targeted routing checks, does not modify unrelated browser infrastructure and does not terminate user-owned processes.
- This baseline still contains only committed story missions 1–5; slots 6–10 remain pending. No mission content, chapter themes, map geometry or campaign-20 migration is included. Future chapter release and long content integration require their own verification.
- Only local unstaged implementation is authorized here. No commit, merge, push or deployment is performed.
