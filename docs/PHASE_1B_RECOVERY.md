# Phase 1B verification recovery — 8 October 2026

## Evidence and classification

The previous Stage 1 run (chat `01a11b23-395d-7613-b0a1-c19d2b32bc1f`) passed the 52 production regression checks, then exited with:

```text
page.waitForFunction: Target page, context or browser has been closed
test-results/phase1b-push/verify-building.mjs:19:139
```

That line is the 20-second wait for the first Tower damage event. It is a browser/context/page interruption, not the `TimeoutError` emitted for an exhausted wait. The script has no test-runner-wide deadline and its only explicit `browser.close()` is after all checks and report writing. No server-shutdown, missing attack, renderer error or HP evidence accompanied the historical closure. The precise actor/process that closed the historical browser was not logged and cannot be proven retrospectively.

Fresh construction runs against supervised development (5180) and production (4180) servers passed all 24 original assertions and an additional target/authoritative-HP check. Production evidence: `built-ui-3` acquired `red-0-0`, emitted 18 damage at tick 162, and authoritative HP became 222 from 240. No browser errors occurred. Logs and fresh captures are preserved under ignored `test-results/phase1b-recovery/`.

Longer regression runs in the restricted process environment reproduced the closure. Running the same scripts with an unrestricted Chrome process lifecycle passed all 52 assertions on both servers. Chrome debug logs show deliberate graceful shutdown after the completed development report, process exit code 0 and temporary profile cleanup. This supports execution-environment process interruption as the cause of the failed runs; it does not establish a particular sandbox timeout or prove who terminated the original process. No gameplay regression was demonstrated. No gameplay change, assertion reduction or additional Phase 1B commit was made.

An initial recovery server launch incorrectly passed the numeric port as a Vite root through npm/PowerShell argument parsing. It returned an HTTP navigation failure before gameplay. It was replaced with direct Vite CLI calls using explicit ports and `--strictPort`; it is separate from the historical browser closure.

## Completed Stage 1

- 43/43 automated tests, strict TypeScript/Vite production build and `git diff --check` passed.
- Development and production: 24 construction assertions + one explicit target/HP assertion passed in fresh browsers.
- Development and production: 52/52 existing browser regression assertions passed; six enemies cleared, Gold 340, zero remaining enemy state/sprites.
- Pushed the existing `fa3a114228427b2dd28890dd84082bc7ceb3920e` to configured upstream `origin/main`.
- HEAD, upstream and remote branch all matched that SHA; working tree clean before Phase 1C began.
- No replacement Phase 1B commit or focused fix commit was necessary.

Phase 1C subsequently changes the normal combat matchup. Its legacy Tower and Guardian browser fixtures explicitly isolate allied attackers while preserving their original exact assertions. Independent normal-gameplay checks verify faction combat; see the Phase 1C report.
