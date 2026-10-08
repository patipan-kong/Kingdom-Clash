# Phase 1C implementation plan

Start from verified, pushed `fa3a114228427b2dd28890dd84082bc7ceb3920e`. HEAD, upstream and remote matched and the tree was clean before this slice.

1. Promote the three approved blue staging minions to authoritative units. Reuse minion stats and the two-wave schedule, with blue reinforcements near the base approach. Specifications do not prescribe a separate allied wave schedule; this is an explicit prototype balance assumption. Do not add Barracks production or spend resources for scripted waves.
2. Add deterministic four-neighbor grid navigation, radius-aware terrain/edge validation, dynamic structure occupancy, cached paths, topology versions and a two-plan-per-tick budget. Collision remains authoritative. Separate nearby minions with deterministic, collision-checked steering.
3. Acquire visible enemies, retain valid targets for at least one second, share existing windup/range/LOS/damage/death rules. Plan routes to attack positions; when necessary evaluate enemy structure crossing costs and stop to breach before crossing. Friendly structures and permanent terrain cannot be breached.
4. Synchronize allied sprites, HP, minimap and death cleanup. Keep camera, HUD geometry, economy, construction and fixed 30 Hz clock. Static preplaced bases/structures remain illustrative; match objectives/results belong to the later slice.
5. Add headless coverage and real Chrome gameplay checks for normal allied combat, construction rerouting, sealed-route breaching, destruction, deterministic frame partition and lifecycle cleanup. Retain original regression assertions; explicitly isolate older combat fixtures where their purpose requires the earlier solo matchup.

No Phase 1D, skills, artifacts, campaign, Free Play, new artwork, commits or pushes.
