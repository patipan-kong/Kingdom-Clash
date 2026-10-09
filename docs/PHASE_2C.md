# Phase 2C — Extended Combat (completed)

Phase 2C Extended Combat and the Tower faction-color and Keep HP visibility hotfixes passed manual gameplay and visual review. Finalized on 2026-10-09 on top of Phase 2B commit `1d46a36`. Design and provisional values: [PHASE_2C_PLAN.md](PHASE_2C_PLAN.md). Balance remains provisional, and Guardian Balance v0.1 is unchanged. Phase 2D has not started.

## How to play

- Default entry is the **extended** encounter: `npm run dev` and open the page. `?encounter=prototype` gives the original six-enemy baseline (used by the preserved regression suites).
- Implementation: [src/data/encounters.ts](../src/data/encounters.ts) (data) with the same `Simulation`, so there is one combat engine. 12 waves from 10 s, one every 40 s: 3,3,4,4,5,5,6,6,7,7,8,8 raiders (66 total), 2 allied reinforcements per wave, caps 24 Crimson / 16 Azure, deferred (not dropped) spawns, staggered 0.8 s. Crimson Keep is guarded by 7 pre-built red Archer Towers (unchanged tower stats, 80 XP each); keep HP stays 3000.
- HUD additions: `Wave n / 12 · m:ss` and a `KEEP THREATENED` warning in the existing objective line. Crimson towers use a faction variation of the existing tower art (see hotfix verification below).

## Status (verified)

- Finalization checks: **204/204** automated tests (179 existing + 23 encounter + 2 tower appearance), production build and `git diff --check` pass. The build retains the existing bundle-size warning. Extensive browser screenshot suites were not repeated.
- Extended unassisted browser play (real controls, read-only observation), development and production: reached LV6 at about 136 s through ordinary XP, learned R via the allocation UI, cast Q/E/R in combat, ended in a legitimate Victory at about 5:12 (production) and 5:24 (development), LV13, 1 Guardian death, 12/12 checks each. See the [compact verification summary](phase2c/verification-summary.json) and [representative production Victory](phase2c/screenshots/production/extended-result.png). Full reports remain local at `docs/phase2c/extended-{development,production}.json`.
- Lifecycle on both builds, 30/30 each: pause, Build/Shop timeScale, death and respawn, 844×390 touch, Defeat mid-wave, then Restart ×4 with no duplicate spawns, stale listeners or leaked state. Three Victory-Restart passes used a labeled supplemental fixture (teleport and 1-HP keep). The Defeat was unattended.
- Preserved prototype suites (match 16, resize 6, collision 9, navigation 13, construction 24, HUD 52, progression 15, skills 30) passed on both builds. Prototype normal play still gives six kills, 360 XP, LV4+45, Gold 340. Raw evidence remains local under `docs/phase2c/{legacy,skills,progression}`; check totals and report hashes are included in the compact summary.
- The prototype simulation is bit-identical to Phase 2B: a differential run of 4 scripted 9000-tick inputs gave 720/720 identical sampled states.

## Known limitations

- **Duration is shorter than the original 8–12 min hypothesis for efficient play.** Bots and the browser player win in about 4.7–7.4 min. Headless variants of wave interval and size did not change this. Competent automated play never damaged Azure Keep, while an idle player loses at about 2:25. Manual gameplay is now approved; no additional human timing measurements were supplied. Further encounter/balance changes are outside this finalization.
- A defend-only player can stall: waves are finite and there is no timer, by design.
- The preserved skills browser suite is intermittently flaky: its first production run failed, as did several reruns (different timing-dependent steps), and it passed on the final rerun. The committed Phase 2B build also failed 1 of 6 runs, and the simulation is identical, so this is a pre-existing harness timing issue, not a gameplay regression.
- Performance (limited): headless sim cost is about 0.40 ms/tick (extended, defend bot) vs 0.06 (prototype). Slow ticks of 4–20 ms are navigation plans, with a one-off 50 ms warm-up. Browser frames in headless software GL were about 50–66 ms median, which reflects the environment, and no spikes lined up with spawns. No device or Android performance was measured.
- Phase 2D UX notes: allocation and combat HUD still hard to read; the objective line is 10 px; skill buttons show `LEARN R0` / `LV6` labels that are unclear.
- Evidence cleanup: commit scope contains three representative screenshots and one compact summary rather than 129 screenshots and 23 raw JSON reports. All 152 original evidence files (97,015,394 bytes) remain intact locally, excluded by `.gitignore`; an additional SHA-256-verified backup is at `test-results/phase2c-finalize/raw-evidence`, with inventory at `test-results/phase2c-finalize/raw-evidence-manifest.json`. No raw evidence was deleted. Final test/build logs are in `test-results/phase2c-finalize`.

## Manual playtest checklist

1. Wave 1 appears at 0:10 and the HUD shows wave and time. 2. Reach LV6 (about 11 raider kills), learn R from the Guardian panel, and cast it. 3. Compare turtling, building towers and pushing early. 4. Note the match length, the first moment the keep is threatened, and any crowding at the bridge. 5. Check Victory, Defeat and Restart.

## Tower faction hotfix — approved

The old multiplicative pink tint left inherently blue cloth blue. The renderer now creates a cached Crimson texture by recoloring only blue cloth/armor pixels. Tower appearance selects that texture from `team`; Azure retains the original texture. Neutral materials, alpha, sprite dimensions, health bars and gameplay rules are preserved. Existing faction markers remain sufficient alongside the red roof, flag and banner.

- `npm test`: 204/204 pass. `npm run build`: pass (existing bundle-size warning).
- `node scripts/verify-tower-appearance.mjs`: 11/11 production-browser checks at 844×390. Covers all seven pre-built Crimson towers, a normally constructed Azure tower, original pixel shading/materials/dimensions, appearance outside Guardian attack range, unchanged hostile targeting, Restart, and prototype → extended switching. A supplemental renderer fixture adds a red tower at an Azure tower's position with a neutral ID to verify that ownership alone determines its texture.
- One comparison screenshot: [Azure and Crimson towers in the same match](phase2c/tower-hotfix/comparison-844x390.png). Check totals are in the [verification summary](phase2c/verification-summary.json); the full `tower-hotfix/verification.json` remains local.
- Manual visual review approved. No balance, wave schedule, collision, targeting or combat changes from this hotfix.

## Keep HP occlusion hotfix — approved

The Keep bar's original above-flag offset placed it behind the fixed top HUD: with camera scroll `(960,197)`, Crimson's full bar occupied screen `(603,28.2)` with width 94, overlapping the resource panel ending at x=624. More southerly camera positions clipped the bar off the top entirely. The bar also inherited its sprite container's y-sorted depth (432), leaving health vulnerable to world/effect overlap. The existing tower positions are preserved.

Both Keeps now have separate world-space health containers at depth 2700, above world objects/effects but beneath the unchanged HUD scene. The original roof offset remains when clear; when necessary, the bar and faction marker shift down onto the visible Keep to clear the existing top HUD. Horizontal alignment follows each Keep; offscreen Keeps do not leave detached indicators. Manual pans and final interpolated camera follow update the attachment before rendering. Health fill still reads authoritative HP.

- `npm run build`: pass (existing bundle-size warning). `git diff --check`: pass.
- `node scripts/verify-keep-health.mjs`: 40/40 production-browser checks. Both Keeps at 960×540 and 844×390, four camera heights each, actual rendered fill pixels, nearby seven unchanged Archer Towers and wave minions, real combat reducing Crimson Keep to 1800/3000, synthetic overlap at existing minion/effect depths, fixed HUD priority, camera follow, offscreen behavior and Restart. Supplemental visual overlap fixtures change no structure positions or simulation rules.
- One screenshot for this hotfix: [Crimson Keep and nearby towers at 844×390](phase2c/keep-health-hotfix/crimson-keep-844x390.png). Check totals are in the [verification summary](phase2c/verification-summary.json); the full `keep-health-hotfix/verification.json` remains local.
- Manual visual review approved. Artwork, structure positions, health values, damage, targeting and collision remain unchanged by this hotfix.
