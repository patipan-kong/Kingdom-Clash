# Phase 1D — playable match plan

Start from pushed Phase 1C `49f0c4b84915af2614b046eea97a1a6cecedba17`. On 8 October 2026, HEAD = origin/main = remote main and the working tree was clean. Pre-commit verification: 72 automated tests, build and diff check; both origins passed 9 collision, 13 navigation, 24 construction and 52 regression browser checks. Caches/builds and temporary failure logs were excluded; approved artwork and original specifications were untouched.

## Source rules

- `01_GAME_DESIGN.md`: allied main base reaching zero HP means defeat; opposing main base reaching zero means victory for an assault objective. This slice is one standalone assault match, not a Campaign stage or Free Play system.
- `05_CAMPAIGN_FREEPLAY.md`, data rules: if both bases fall in one tick, player defeat takes precedence. No time-score victory. Evaluate objectives from authoritative events/state using simulation time.
- `02_HEROES_COMBAT.md`: nearest eligible enemy attacks, selected-target override, physical armor formula, range and LOS; LV1 respawn after 5 seconds at a clear point near the allied base, full HP, 2 seconds protection ending on attack. Death is independent of the base objective.
- `03_ECONOMY_ARTIFACTS.md`: initial 250 Gold / 180 Wood / 30 Iron, 2 Wood/s and 0.25 Iron/s, 15 Gold per defeated minion. No base-destruction reward is specified, so none is introduced.
- `04_BUILDING_PATHFINDING_AI.md`: 48-unit world grid, safe occupancy, four-neighbor paths, radius steering, terrain cannot be breached, compare travel/breach cost with 20% improvement and one-second target retention. Reuse Phase 1C planner budgets and caps.
- `06_MOBILE_UI.md`: preserve HUD/joystick/minimap, consume overlay inputs, landscape and 48 CSS px targets, pause on background/portrait, absolute Build/Shop timeScale 0.25.
- `07_PHASER_ARCHITECTURE.md`: authoritative GameState, command/event ownership, fixed 30 Hz, reset accumulator after interruption, no independent gameplay timers, clean scene listeners on restart, cap 40 minions/faction and 30 towers.
- `09_ROADMAP_ACCEPTANCE.md`: complete one-Hero vertical slice including both bases and win/loss, construction/rerouting/breaching, nonnegative economy and mobile controls. Later hero/artifact/campaign/free-play/Android systems excluded.

The specifications do **not** give numeric main-base HP or a vertical-slice wave timetable. Preserve the approved layout's existing 3,000 HP base display (3×3 footprint) and Phase 1C's finite red waves at ticks 1/240, initial three allies and three allied reinforcements at tick 240. These are inherited prototype data, not newly invented specification values. Do not add repeating waves, Barracks or forced time-based endings.

## Implementation sequence

1. Keep base state in an explicit authoritative objective collection, with the approved IDs/coordinates/footprints, shared attack/damage/death events and no rewards. Measure attack reach to a base's collision edge so melee units can hit its large footprint. Make LOS stop at that edge, and include base footprints in navigation occupancy and targeting.
2. Add initializing/playing/paused/victory/defeat/restarting phases, exactly-once end event/results snapshot, deterministic defeat precedence, immutable terminal progression and validated restart transition. Keep Guardian respawn and wave timing on the existing clock; select a clear respawn location.
3. Synchronize approved base sprites/bars/minimap and add compact top base HP/objective text plus a results overlay in the existing visual language. Consume input, clear held controls/menus, expose a touch-sized Restart creating a new Battle/HUD simulation.
4. Preserve all prior tests; add objective, lifecycle, cap, terminal, simultaneous-damage, respawn, navigation and determinism checks. Legacy fixtures remain isolated where their earlier purpose requires it; assertions are preserved.
5. Verify actual rendered fresh matches using normal input and unchanged stats: Guardian attack/build/advance to Victory; allow normal enemies to destroy the allied base for Defeat; use Restart repeatedly and play another match. Record mobile simultaneous controls, overlays, pause/background, state/render alignment, listener/planner bounds and desktop measurements. Supplemental fixtures are explicitly distinguished.

No Phase 1D commit or push. Stop after complete verification for manual review.
