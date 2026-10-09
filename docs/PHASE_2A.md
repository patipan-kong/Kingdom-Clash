# Phase 2A — supported progression, pending skill specification

## Baseline and scope decision

Original Phase 1D implementation `5e7af9732e2b80d7e547da5e036a3893d5504b28` remains in history. Stage 1 finalization was committed with the requested `feat: complete playable match lifecycle` and pushed as **`c9c29d529120fc151fa6fbd9a8012c2895c5ad40`**. HEAD/upstream/remote matched and the tree was clean before Phase 2A. It passed 88 tests, build/diff checks, and both builds' 16 match/9 collision/13 navigation/24 construction/52 regression checks plus 6 immediate-resize Restarts. Deferred visual backlog and focused harness corrections are in `PHASE_1D.md`; evidence is `phase1d-finalization.json`.

The [pre-code specification review and plan](PHASE_2A_PLAN.md) lists exact rules and missing values. On 9 October 2026 the user selected **implement only behavior supported by specifications; report missing rules**. This is a partial progression slice. Functional Guardian skills and normal XP earning are not complete, and this report does not claim otherwise.

## Implemented

- `GameState.heroProgression`: fresh LV1, XP0, one Skill Point, independent Q/W/E/R rank records.
- Renderer-independent reward kernel: next-level threshold `80 + 25 * (level - 1)`, multiple level-ups per award, one point per level, cap LV20/20 total awarded points, no further XP accumulation, source deduplication and invalid-amount rejection.
- Authoritative death integration records positive Guardian damage participation. A configured reward can go to a participant even when an ally lands the last hit. Production XP rewards and assistance radius remain undefined, so ordinary minion/objective deaths award **no invented XP**, while existing Gold remains unchanged. No XP player command or extra clock exists.
- `learn` commands validate skill/request IDs, point budget, regular rank gate LV1/3/5/7/9, Ultimate gate LV6/11/16 and max rank 5/3 before spending. Each request ID is processed once. Invalid or repeated attempts cannot consume points. At LV20 all known skills cost 18 points; the last two remain reserved because special stat upgrades are undefined.
- Death/respawn preserves XP, level, points and ranks. Respawn uses `min(25, 5 + 0.8 * (level - 1))` seconds, represented exactly by fixed ticks (LV3:198; LV20:606). Safe spawn/full HP/two-second protection and the fixed 30 Hz pause/timeScale behavior remain shared with Phase 1D. New simulation/restart resets progression and deduplication ledgers.
- Existing LV/XP HUD now observes state. Tap the Guardian information panel to allocate points in a compact modal; rank/gate/point feedback and >=48 CSS px targets are provided. The modal consumes input and closes on death/pause/terminal/restart. Opening it clears only the player's attack/movement intent and preserves enemy windups. Original art, skill preview buttons, camera, minimap, resources and Build controls are preserved.

## Missing rules and deliberately unavailable gameplay

The specifications give ability names and broad status principles, but no Q/W/E/R rank effects/damage types/amounts/ranges/areas/target policies/LOS/durations/cooldowns/resource costs, charge collision behavior, taunt priorities, zone recipients/stacking, passive armor bonus/radius, or stat-rank effects. They also omit XP reward amounts, assistance radius/participation lifetime, stat growth and level-up HP adjustment. No mana system is defined.

Accordingly skills remain **visual previews**, explicitly described as such in the existing cast feedback and new allocation panel. Learning a rank does not enable unapproved gameplay effects or replace prototype cooldowns with invented combat balance. Current combat stats remain unchanged at every level. Normal gameplay cannot yet gain XP, level up, learn later ranks or activate the Ultimate. Browser XP/level-up demonstrations use an explicitly identified supplemental kernel fixture; they are not evidence of normal XP gameplay. Mana/status/passive/functional-skill validation cannot be run until the missing data is supplied.

## Files

- New `src/data/progression.ts` and `src/simulation/Progression.ts`.
- `src/simulation/GameState.ts`, `Simulation.ts`: state/commands/events, participation hook, level-dependent respawn and player-only input cleanup.
- `src/scenes/HUD.ts`, `Battle.ts`: state-driven progression display and compact allocation modal/input routing.
- `tests/progression.cjs`: meaningful progression/transaction/lifecycle cases, including explicit test-only reward policy; all earlier tests retained.
- `scripts/verify-progression.mjs`, `package.json`: actual allocation/mobile/combat/Restart and clearly separated supplemental XP/respawn evidence.
- This report, `PHASE_2A_PLAN.md`, verification/readme/limitations updates and browser reports/captures.

## Verification

Automated: **112/112 pass** (88 preserved + 24 new). Tests cover exact thresholds and remainders, multiple level-ups, cap/total points, duplicate/invalid rewards, both rank-gate families, allocation exhaustion/unknown IDs, duplicate commands, pause/zero/quarter timeScale, all level-dependent respawn deadlines, XP/rank retention, allocation while dead, fresh ledgers, known 18-point spending/reserved two points, terminal freeze, deterministic 30/60 rendering partitions, positive-damage participation without last-hit, and the absence of fabricated reward/assistance rules. No test was skipped or removed. The explicit minion XP=80 policy in two integration fixtures is restored immediately and never enters production data.

Production TypeScript/Vite build and diff check pass. Development and production each passed **15/15 progression browser checks** with no page/console/asset errors, at 960×540 and 844×390. Actual gameplay used the initial point through the allocation UI, rejected Q rank 2/R rank 1 without spending, blocked underlying keyboard input while allocating, moved via real multitouch joystick+Attack, defeated enemies and destroyed the full-HP enemy base, then used UI Restart to restore LV1/XP0/one point/all ranks zero. Normal enemy kills correctly left XP0 because their reward values are unspecified. This is actual allocation/combat evidence, not normal level-up or functional-skill evidence.

The separately labeled supplemental fixture awarded 245 XP via the headless kernel (LV3, XP60/130, three points), displayed exact HUD/bar values, and allocated Q ranks 1/2 through UI. Actual minion damage killed the fixture Guardian; exact damage-step observation confirmed a 198-tick (6.6-second) deadline, retained XP/ranks, full-HP safe respawn and frozen progression during pause. Subsequent actual movement/Attack ended that fixture-modified match and UI Restart cleared its LV3/ranks with stable listeners. That later match had a controlled unit fixture and is not represented as a second untouched normal match.

Two fixture corrections were needed: the approved respawn point y=600 is outside the bridge's radius-safe lane, so the harness steers north using actual keyboard input before crossing; and render-dispatched death events can arrive after several fixed ticks, so the fixture records the exact authoritative hit tick rather than the later render tick. The exact 198-tick assertion remains. Failure evidence stays ignored in `test-results/`.

Final preserved browser checks passed on both builds: **9 collision + 13 navigation + 24 construction + 52 regression + 6 immediate-resize Restarts**, with no errors. Together with the new 15 progression checks this is **119 browser checks per build**. Original skill-preview, targeting, collision, wall rerouting/breaching, Tower damage, Build/Shop timeScale, safe-area, background/portrait and lifecycle assertions remain unchanged. Legacy reports/captures are under `phase2a/legacy/`, preserving committed Phase 1 evidence. The complete normal Victory/Defeat/three-match suite additionally passed in Stage 1 before the commit; Phase 2A's normal Victory/Restart and supplemental lifecycle evidence are identified above.

Reports: `phase2a/verification-{development,production}.json`; actual captures: `phase2a/screenshots/{development,production}/initial-points-960x540.png`, `allocated-mobile-844x390.png`, `normal-victory.png`. Captures prefixed `fixture-` identify supplemental XP/rank/death data and must not be presented as normal gameplay progression.

Normal development Victory: tick 885 (29.5 seconds), six kills, Gold340, allied base3000/enemy base0. Production: tick939 (31.3 seconds), identical kills/Gold/base HP. Both actual LV1 allocations consumed one point and retained Q rank1 until Restart. Supplemental development death tick83 → respawn281; production death47 → respawn245. HUD showed LV3/XP60 of130/Q rank2 and preserved it through that death.

## Manual review and next slice

Run development or production, tap the Guardian's LV/XP panel, spend the initial point, try an unavailable higher rank/R, close the panel, then play the normal match. Skill buttons still show approved previews; the allocation panel states that effects and XP rewards await specification. After Victory/Defeat use the existing Restart and verify LV1/XP0/one point/all ranks zero.

Recommended Phase 2B: resolve and approve the missing Guardian progression/skill balance data first, then implement functional Q/W/E/R, passive/status/resource validation and normal gameplay XP evidence as a focused slice. Inventory/Artifacts/Fusion should remain a separate later task unless explicitly authorized. Physical mobile/WebView performance and UI polish remain unverified/deferred.

Phase 2A progression foundation was reviewed and authorized for commit/push on 9 October 2026. Finalization reruns automated tests, both browser builds, production build and diff checks. Functional skills remain pending approved balance data.

Finalization rerun on 9 October 2026: 112/112 automated tests (zero skipped), strict production build, tracked/untracked whitespace checks and 119/119 browser checks on each of development and production passed. No gameplay changes were needed. Summary: `phase2a/finalization.json`; fresh detailed logs/captures are ignored under `test-results/phase2a-commit/`. Original specifications and approved assets were unchanged.
