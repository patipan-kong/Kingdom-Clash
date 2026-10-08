# Guardian unit collision — Phase 1C review

## Root cause and scope

The Guardian moved through `Collision.move`, which checked terrain, static footprints and constructed structures only. Minions used that same static movement function, then `Movement.updateMovement` separated only the sorted minion array. The Guardian was excluded from that array. Neither movement path checked Guardian–minion contact, so a fast joystick-controlled Guardian could cross their ground centers. Minion crowd separation did not repair it.

The authoritative circles were already appropriate: Guardian radius 20 and minion radius 12, in world coordinates. Presentation projects Y by 0.72 and uses taller artwork; neither sprite dimensions nor projected coordinates enter this fix. The required center distance is 32 world units. Combat ranges remain Guardian 90 and minion 48.

## Implementation

- Add `Collision.moveUnit`: deterministic circle sweeps in the existing four-unit movement substeps, followed by tangent sliding. Guardian contacts use hard clipping; minion-only crowds retain the existing soft separation. Sort contacts by ID, bound each sweep to four iterations, and reject terrain-slide endpoints that violate unit contact.
- Use that helper for Guardian/minion movement and existing minion separation. Preserve terrain/structure collision and the fixed 30 Hz state pipeline; add no physics engine.
- Passive crowd corrections leave the Guardian anchored. Active joystick movement can nudge each contacted minion outward by at most two world units per tick, through the same safe movement checks. This permits escape from small crowds without allowing either unit to cross the other's center or pushing the player into a blocked footprint.
- Repair initial spawn/fixture overlaps gradually on the minion side, capped at one unit per tick. These are repairs for initially overlapping states, not normal movement penetration.
- Minion routes skip intermediate waypoints inside the Guardian footprint, follow a stable ID-selected tangent locally, then recenter before the narrow bridge. This prevents oscillating between a blocked lane and a sideways correction. Target selection, damage, cooldowns and windups remain unchanged.
- A legacy browser restart check exposed a queued-restart readiness race under software-rendering load: `visualReady` could refer to the previous simulation. Its harness now waits for a different simulation instance and records readiness observations. All 52 existing assertions remain intact. No gameplay lifecycle code changed.

## Verification

Added eleven automated scenarios: allied/enemy joystick contact, both factions moving toward the Guardian, twelve surrounding units beside a Wall, smooth initial-overlap recovery, authoritative melee damage, both bridge banks and constructed walls, frame-partition/insertion-order determinism, dead-unit release/minion-only behavior, allied navigation around a stationary Guardian and across the bridge, and an enemy AI melee approach.

`npm run verify:collision` uses actual Chrome rendering and mouse-driven virtual joystick/Attack controls. Controlled fixtures isolate two battling minions (zero movement/damage retains real attack events without premature deaths), then normal enemy AI/damage verifies stationary Guardian contact and the unchanged 80-damage Guardian melee attack. Per-frame world-position samples verify the 32-unit contact distance and exact renderer projection. Diagonal joystick input must leave the group; allied and enemy direct-contact scenarios must remain separated. Before-fix overlap was captured before modifying simulation code.

Final results: 72/72 automated tests, no failures/skips/cancellations; TypeScript/Vite production build passed; `git diff --check` passed. Development and production each passed all 9 Guardian collision, 13 navigation, 24 construction and 52 regression browser checks, with no runtime errors. The unchanged large Phaser bundle advisory remains.

The before-fix run sampled a minimum Guardian–minion distance of 4 world units. Both final collision runs sampled a minimum of exactly 32, including allied contact, enemy contact and diagonal escape; all sampled rendered centers matched `(worldX, worldY × 0.72)`. Normal enemy AI reached melee range without moving the stationary Guardian, and the actual Attack button delivered the expected 80 damage. Ground separation does not require changing the approved tall silhouettes.

Restart diagnostics independently confirmed the harness race: both development restart observations at the old ready flag reported `sameSimulation: true`; after the strengthened wait, both reported `false`, zero kills, one cast listener and an unpaused HUD. The final lifecycle assertion passes on both origins. Waiting for actual completion strengthens the readiness check rather than masking a failed assertion.

Reports: `guardian-collision-before.json`, `guardian-collision-development.json`, `guardian-collision-production.json`, and existing Phase 1C/legacy reports. Captures: `screenshots/guardian-collision/{development,production}/` (before overlap, after contact, after walking around the group, and after enemy contact). Detailed command output is retained in ignored `test-results/guardian-collision/`.

## Limits and review status

This remains local circle avoidance and soft minion crowd separation, not a crowd-reservation planner. An actually sealed corridor safely blocks movement. Tall sprite silhouettes may overlap visually even when ground footprints are separate; their approved artwork and presentation rings are unchanged. Initial externally positioned/spawned overlaps resolve gradually. Physical touch devices and Android WebView are unverified; Chrome exercises the real virtual joystick handlers.

No sprites, camera, HUD, effects, terrain or combat rules were redesigned. No Phase 1D features, commit or push. The existing Phase 1C working tree and this focused fix remain available for review.
