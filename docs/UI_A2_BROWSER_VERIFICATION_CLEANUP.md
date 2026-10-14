# Post-merge UI-A2 browser verification cleanup

Baseline `a9862b00c70a0cae1d7c24cd0b28c163e7d34233` · Review passed; approved for verification-only commit and publication. UI-A2 and Balance v0.2 production files are unchanged.

## Reproductions and root causes

| Script | Before / observed state | Classification and correction |
|---|---|---|
| [Shop](../scripts/verify-shop.mjs) | Failed “B2 defense alert remains visible beside Shop.” The actual notice was visible, identity `azure-defense`, text `Azure Keep under attack` plus `2990 / 3000 HP`; bounds were entirely beside Shop, expiry still in the future. A separate startup run also raced HUD creation after `visualReady` | Stale single-line text assertion and verification readiness race, **not hidden production UI**. Wait for the Shop object; assert exact current/max HP text, identity, minimum12px type, bounds/control separation. A second hit must update HP without changing notice expiry or complete Shop bounds |
| [Tower appearance](../scripts/verify-tower-appearance.mjs) | With `PROTOTYPE_URL` already containing `?encounter=extended`, loader appended another`?encounter=prototype`. Parsed value was `extended?encounter=prototype`; game correctly fell back to Extended with seven red towers. Clean prototype URL loaded prototype with zero red towers and original `tower` texture/white tint | Verification URL-construction bug, **not an artwork/switching production defect**. Set the encounter through `URL.searchParams`, preserving other parameters/hash and ensuring one valid value. Verify actual loaded encounter, retain original pixel/alpha/dimension/ownership/Restart checks, add a real rendered opaque-blue roof-pixel assertion in prototype |
| [Extended encounter](../scripts/verify-extended.mjs) | Failed startup wave/time assertion: `objectiveText` was correctly `Destroy Crimson Keep`, actual spawned waves0. The old snapshot also searched objective text for obsolete `THREATENED` | Stale HUD reader. Read separate objective, wave and timer; compare wave count/total and formatted timer against state/ticks. Read threat from current wave/status element. Preserve all other full-match checks and default full-match mode |

Tower roof appearance was visually inspected in the original comparison capture; raw Crimson conversion checks passed before the URL failure. A clean prototype probe showed original Azure texture and neutral tint. Updated verification additionally samples the actual renderer, so the old visual checks are strengthened rather than replaced by weaker texture-only checks.

## Scope

Only the three scripts above and this report changed. No simulation, balance constants, economy, progression, HUD, Shop, Build, Pause, artwork or original specifications changed. The Balance branch/worktree and three pre-existing untracked investigation/design documents were not touched.

Browser evidence now defaults to ignored `test-results` locations and accepts `EVIDENCE_ROOT`; screenshots can be disabled with `CAPTURE_SCREENSHOT=0`. No screenshot/JSON evidence enters the intended diff. Useful raw reproduction evidence remains locally preserved.

Extended gains explicit `EXTENDED_STARTUP_ONLY=1` for a narrow HUD integration pass. It checks authoritative labels and an advancing timer without injecting commands or playing a full automated match. The normal policy loop, terminal/XP/level/skill/cap checks remain under the default full-match path. Failed checks now produce a nonzero exit status; a short startup pass is not reported as full-match acceptance.

## Verification

- **Shop:32 checks passed**, including all retained transactions/panels/lifecycle checks, UI-A2 HP notice and its nonextending update; no browser errors.
- **Tower:15 checks passed**, including URLs with existing encounter/query/hash parameters, prototype→extended switching, original sprite conversion, ownership/combat/Restart and rendered Azure roof; no browser errors.
- **Extended:6 startup checks passed**: correct objective, wave0/12, initial timer, seven towers/full Keeps, live tick advancement2→32 with timer0:01 and synchronized wave label, no runtime/asset errors. Full automated match was deliberately not rerun.
- **45 focused headless tests passed**: Shop, defense, notice identity, tower appearance and encounter regressions.
- Standalone TypeScript, production build and whitespace checks passed. Build retains the existing bundle-size advisory.

```text
# Local Vite server on127.0.0.1:5187; PROTOTYPE_URL points to it.
# All browser runs: CAPTURE_SCREENSHOT=0; evidence under test-results/browser-cleanup.
node scripts/verify-shop.mjs
node scripts/verify-tower-appearance.mjs
# EXTENDED_STARTUP_ONLY=1 for this review:
node scripts/verify-extended.mjs
npm test -- shop.cjs defense-feedback.cjs notice-slot.cjs tower-appearance.cjs encounter.cjs
npx tsc --noEmit
npm run build
git diff --check
```

## Remaining limits

Tests used installed Chrome with software WebGL, not physical phones or the user's exact simulator extension. The full long-running Extended scenario was preserved but not exercised; this report makes no new full-match gameplay or balance claim. No production change was necessary for the three demonstrated failures.
