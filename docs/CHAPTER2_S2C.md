# Chapter 2 S2c — Canyon Pass integration verification

Result: **S2 Canyon Pass is complete.** S2c is a verification stage; it changed no source, data, save or golden file. Baseline `c24ef61` (S2b), on `chapter2/s2c-canyon-integration`.

S2 commits: S2a `1b35ef6` (geometry and guidance), S2b `c24ef61` (rendering and minimap), S2c (this record).

## Final verification matrix

| Check | Result |
|---|---|
| Full test suite | 737/737 |
| Typecheck and production build | pass (only the existing chunk-size advisory) |
| S0 golden fixtures | pass without regeneration; `tests/golden` diffs to `31b12ed` by 0 lines (`48aebb2a`, `3660a82a`, `588b885d`, `3a0dd31a`) |
| Chapter 1 and Full Battle replay | Level 1, 6, 10 and Full Battle goldens pass, and a Level 1 golden run interleaved tick by tick with a Canyon match still matches |
| Meadow visual preservation | 0 differing pixels against `1b35ef6` (spawn, bridge, minimap, mobile landscape spawn); repeat captures also 0 |
| Canyon browser verification (`npm run verify:canyon`) | 83/83 |
| Production build ignores `?battlefield=` | Meadow drawn, no warning, query alone does not launch a battle |
| Dev override and campaign | Campaign Level 1 and Full Battle stay on Meadow even with the Canyon query |
| Campaign browser scripts | `verify-campaign-ui`, `-levels`, `-routing`, `-selection`, `-progress` (129 checks) and `verify-guardian-collision` pass |
| Battlefield ownership | simulation, rendering, minimap and UI guidance all read the match's battlefield; no module-level mutable battlefield state; no scene, UI, data or world code calls the `MEADOW-COMPAT` wrappers; unknown battlefield or art throws, with no Meadow fallback |
| Canyon gameplay | both lanes routable; wall placement accepted through the command path; the Guardian respawns at the first open point after dying in either lane or either pass mouth; 0 units inside a barrier; no minion stood still without a target for more than 1 tick |

## Accepted Canyon performance exception

Headless Node, `extended` encounter, `defend` policy bot, median of 3 alternating runs (ms per tick):

| | S1 `f38d4e6` | S2c |
|---|---|---|
| Meadow prototype | 0.0594 | 0.0601 (+1.2%) |
| Meadow extended | 0.454 | 0.438 (−3.5%) |
| Canyon extended | | 0.603 (1.38× Meadow) |

- Meadow stays inside the 10% engine-regression budget.
- Canyon defend at about 1.37× Meadow is the accepted scenario-specific exception (extra line-of-sight checks from match dynamics). No simulation-core optimisation is authorised.
- Navigation is bounded: at most 2 plans per tick, at most 50 nodes per plan.
- Browser frame times (headless Chrome, software rendering): Meadow median 50 ms, p95 66.7 ms; Canyon median 33.4 ms, p95 50.1 ms. Report only; not device results.

## Existing browser automation technical debt

Not S2 regressions; the same results on `1b35ef6`. None is fixed here.

- `verify-navigation`: timeout at line 70, waiting for a `built-seal-` damage event.
- `verify-mobile-hud`: "960x540 unequal safe areas: survival hierarchy, permanent objective and unobstructed feedback".
- `verify-context-guidance`: "Moving with unspent initial point triggers explicit allocation advice after spacing".
- `verify-match`: flaky at the Build UI confirm step. The wall placement is valid; the script clicks Confirm before the button accepts input, a startup race under software rendering.

## North-lane Guardian aggro observation (for S4)

With the Guardian held at full HP in the north lane for 7,200 ticks, 0 Crimson minions leave the pass. All 10 living minions were fighting the Guardian at 32–48 px (attack range 48), nothing was stuck, and routes through both lanes are valid. A minion within attack reach keeps fighting a Guardian even while its pursuit leash is ignored, and the test Guardian never dies. This is expected aggro, not a pathfinding fault. S2a recorded the same result.

For S4 human playtests, watch whether a sustained north-lane block with healing feels too strong. No change is made.

## Placeholder Canyon artwork

Canyon uses procedural drawing and recoloured existing textures (dried foliage, warm-tinted rocks). There are no new painted assets. The spire is a 60 px crag; units pressed against its north face lose their feet behind it by depth. On the minimap the spire is about 6 × 3 px and the hero dot or view outline can cover it. Real desert art is later work.

## Pending real-device performance verification

All frame-time figures are software-rendered desktop Chrome. A measurement on a physical device is still needed, with Canyon against Meadow, before Canyon is treated as performance-accepted on mobile. Mobile HUD usability on a Samsung Galaxy S24 in landscape Chrome has been reported as a blocker and is tracked as a separate stage (M1), not part of S2.
