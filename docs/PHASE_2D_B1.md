# Phase 2D-B1 — Guardian damage attribution

12 October 2026 · Baseline `db544512e7516d27118145c3e0779cb566cb8611` · Technical verification and preliminary visual review passed; approved for finalization. Effect durations and artwork remain as reviewed.

## Presentation changes

- An authoritative hostile tower `attack` targeting the Guardian produces a static, fading **200ms connection** from the tower to the Guardian. It depicts the resolved strike, with no projectile travel, warning window or combat delay. This replaces only that attack's redundant range flash; other existing attack effects remain.
- Positive hostile Guardian damage produces a restrained ground impact accent and a **220ms HP text/bar pulse**. Missing damage sources receive a generic local cue, never an inferred tower identity. Fully absorbed hits still have an attack connection, but produce no health-loss pulse or `-0`; shield/status presentation remains separate.
- Presentation policy caps connections at **two**, deduplicates each source, and coalesces local accents within **150ms**. `Tower attacking you` appears once per tower-danger episode: **3s without a tower attack** ends an episode, with at least **5s between notice attempts**. All clocks are presentation clocks; no simulation timers change.
- The existing combat notice slot keeps direct rejection/cancellation above routine confirmations and optional tower notices. Suppressed tower notices are dropped, with no stale queue; world attribution remains visible. General notifications, Azure threat wording and onboarding are unchanged (B2/B3 deferred).
- Existing tower artwork inspection now displays one **4s boundary** using the inspected living tower's authoritative range and world projection. Selecting something else, tower destruction or expiry clears it. It shows attack reach, not line-of-sight guarantees, and introduces no input target or selection system.
- New world graphics are non-interactive, camera attached and below protected Keep HP (depth 2700) and the separate HUD. Pause, Guardian death/respawn and match end clear effects, Guardian damage numbers, range inspection, HP pulse and the optional tower notice. Transient cleanup retains notice throttles; Restart/encounter creation resets the policy and removes listeners normally.

## Verification

- `npm test`: **212/212**, including eight focused attribution/expiry/throttle tests and existing simulation, skills, progression, encounter and tower identity regressions.
- `npm run verify:damage-feedback`: **27/27** focused production-browser checks: real tower→Guardian, tower→minion, allied tower and minion damage; actual shield absorption; source disappearance; rejection/cancellation priority; natural expiry; Pause, actual death/respawn, UI Restart and encounter switching; existing artwork inspection and range expiry/destruction. Both **844×390** and **960×540** are checked for world depth and notice/control clearance.
- Existing `verify:top-hud` with `CAPTURE_SCREENSHOT=0`: **25/25**. Renderer pixels confirm Azure/Crimson Keep HP visibility during camera movement, both viewport sizes and safe-area variants; compact top HUD, Upgrade target, notifications and approved allocation entry remain intact.
- Production TypeScript/Vite build passes. Existing large-bundle warning remains. `git diff --check` passes.
- No edits to simulation, balance, data, targeting, input gestures, A1 allocation layout, A2 skill presentation or A3 layout/Keep HP clearance.

The focused browser fixture isolates existing structures/units and calls the real combat step/hit logic. Simulation advancement is held between strikes solely to inspect short-lived effects; input remains accepted. Shield and respawn timing are fixture-controlled. This is automated rendering/lifecycle evidence, not a claim of a new novice usability test or ordinary match progression. Raw JSON is retained under ignored `test-results/phase2d-b1/`.

## One review image and remaining review

[Representative 844×390 tower hit](phase2d-b1/guardian-damage-844x390.png): original artwork and approved HUD, actual tower attack/damage, static connection, local impact and HP pulse. The completed render frame is held for capture; this is not a paused-game screenshot. Units/waves are isolated for attribution clarity. No 960×540 screenshot collection was generated.

The 200ms cue is intentionally brief. A cast rejection or first-use skill guidance can suppress the optional tower wording, so the source connection and local hit cue must carry attribution. The selected range is subtle and temporary. Technical verification and preliminary visual review approved this implementation for finalization; further manual gameplay evidence should precede any duration or visual adjustments. B2/B3 are separate slices.
