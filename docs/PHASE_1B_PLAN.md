# Phase 1B implementation plan

Baseline c21f991, clean working tree. Reuse GameState, command/event queue, 30 Hz clock, combat mitigation, collision, approved wall/tower art and existing HUD/control layout.

1. Data-driven Wooden Wall and Archer Tower costs, construction, HP and combat; integer resource ledger in 1/120 units for exact base income and atomic idempotent transactions.
2. Validate grid bounds, full cell terrain, 8-cell blue-base ownership radius, static/dynamic occupancy, staged allies, hero respawn and scheduled enemy spawn areas. Construction blocks immediately; HP grows with progress while preserving damage; tower activates only when complete. Cap blue towers at 30.
3. Extend existing swept collision and combat for structures. Nearby minions can attack structures; otherwise existing static waypoint steering safely stops at obstacles. No dynamic rerouting or siege planner.
4. Build menu with world-cell preview, reason text, explicit confirm/cancel, quarter-speed simulation and input isolation. Observe structures/resources from state; cancel placement on lifecycle interruption and clean restart.
5. Headless transaction/construction/combat tests, existing Phase 1A browser regression, Phase 1B browser demonstration and production checks; captures at 960x540 and 844x390.

Resource producers, repair/upgrades/demolition and other building types remain deferred with the rest of later slices. Staged baseline buildings/bases remain illustrative static obstacles; newly constructed buildings are authoritative.
