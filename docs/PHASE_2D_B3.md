# Phase 2D-B3 — Contextual gameplay guidance

12 October 2026 · Baseline `69c6520a3bf8194e0df647cf3326ae1a70d7a2b5` · Technical verification and manual screenshot review passed; approved for finalization. Scope follows [the approved B3 design](PHASE_2D_B_DESIGN.md).

## Guidance and truthful feedback

- One brief match orientation in the existing general slot: **Destroy Crimson Keep. Defend Azure Keep.** Each objective occupies its own line to preserve complete faction names at both viewport sizes.
- After authoritative movement changes the living Guardian's position, an unused initial point can prompt **Learn a skill with Upgrade skills.** Existing active ranks or Fortitude allocation suppress that hint. No point is spent by teaching, and no skill order is suggested.
- **Support your blue troops.** requires a recent authoritative attack/hit from a living allied minion, its current enemy target and both participants near the Guardian. Idle/remote allies, lost targets and stale engagements are insufficient. No promise of tower immunity or guaranteed XP is made.
- **Use Attack on towers and Keeps.** requires a learned active skill, confirmed positive Guardian damage against an enemy also engaged by a nearby ally, and a quiet approach to a living hostile tower/Keep. It does not imply active skills damage structures. Combat participation can be observed in either event order.
- **Attack enabled** is emitted only when authoritative `state.attacking` transitions to enabled, after simulation processing. Repeated taps during the same enabled intent do not repeat or extend it; an accepted intent never claims a target or immediate hit. Higher-priority alerts can suppress it without queuing stale feedback.
- The existing result-detail text adds **Crimson Keep destroyed** or **Azure Keep destroyed**, using the authoritative outcome. Existing totals, Restart, panel bounds and simultaneous defeat precedence remain unchanged.

## Bounded presentation policy

Orientation and contextual hints expire after **4s**. Each of the three contextual topics is delivered at most once per match, with **8s** minimum spacing (also after the orientation). The policy uses presentation time only and stores no cross-session onboarding state.

Teaching waits for an otherwise free notification area, outside active combat notices, skill allocation or Build panels. Confirmed damage, Azure threat, enemies with actual legal attack reach, direct rejection/cancellation and other combat feedback suppress or interrupt teaching. Even a deduplicated direct rejection suppresses optional advice without extending the rejection notice itself. No FIFO backlog is created. Each offer is re-evaluated against current state; visible advice clears when its context ceases to hold. Interrupted, already shown hints are counted and do not replay.

Near an engagement means **240 world units**, with a **2s** recent-event window. A structure approach uses **320 world units**; actual hostile attack legality and recent **3s** Guardian danger take precedence. These values affect teaching eligibility only, never combat reach, targeting or damage.

Pause/results remove teaching; death/respawn clear transient engagement evidence. Existing movement/skill knowledge remains bounded to the current match. Restart resets the whole policy and presents fresh orientation. Approved A1 allocation, A2 gesture guidance, A3 controls/Keep HP clearance, B1 attribution durations and B2 defense visuals/priorities remain intact. No simulation, encounter, AI, XP, skills, economy or balance files changed.

## Focused verification

- **32/32** focused policy tests: 11 new guidance tests plus existing notification, Guardian attribution and Azure defense checks, rerun successfully for finalization.
- **41/41** production-browser guidance checks: actual keyboard movement, initial point/early allocation, real A1 learning and A2 first-use guidance, actual allied attack and shared Guardian damage, missing/idle/remote allies, quiet structures, accepted/repeated Attack taps, stale context, rejection/cancellation (including dedup), B2 danger priority, immediate tower danger, Pause, Guardian death, actual result conditions and UI Restart with stable listeners.
- Both **844×390 and 960×540** keep teaching readable/non-interactive and clear of controls, captions, protected top HUD and the 24px bottom reserve. Victory, defeat and simultaneous result causes fit the existing result panel in both sizes. Two additional final rendering checks confirm complete objective sentences after the wrapping refinement.
- Production TypeScript/Vite build and `git diff --check` pass. The existing bundle-size warning remains. No full match simulations, extensive browser suites, new artwork or screenshot collection were used.

Finalization reran the 41 focused browser checks with `CAPTURE_SCREENSHOT=0`, preserving the approved screenshot. Only B3 implementation, tests, documentation and that single representative image are included; temporary evidence stays ignored locally.

Browser fixtures isolate units and hold advancement between selected actions, jump presentation time for spacing, and exercise actual simulation attacks/damage plus UI movement, allocation, Attack, Pause, results and Restart. They do not claim ordinary match progression or a novice usability study. Raw verification JSON and the small wrapping check remain under ignored `test-results/phase2d-b3/`.

[One representative 844×390 screenshot](phase2d-b3/contextual-guidance-844x390.png) shows fresh orientation and the discoverable LV1 upgrade action with the approved HUD. A completed frame is held for capture only; guidance does not pause gameplay. Technical verification and manual screenshot review approved this implementation for finalization. Advice can disappear before four seconds when danger starts or its context disappears; no permanent tutorial elements are added. Phase 3 remains outside this slice.
