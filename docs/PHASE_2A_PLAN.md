# Phase 2A — specification-supported progression slice

Stage 1 completed first: existing Phase 1D implementation `5e7af9732e2b80d7e547da5e036a3893d5504b28` was preserved; finalization `c9c29d529120fc151fa6fbd9a8012c2895c5ad40` uses `feat: complete playable match lifecycle`. Both are pushed. HEAD/upstream/remote matched and the working tree was clean before this plan/code. Rerun results and deferred UI backlog are in `PHASE_1D.md` and `phase1d-finalization.json`.

## Rules extracted before coding

Read `01_GAME_DESIGN`, `02_HEROES_COMBAT`, `03_ECONOMY_ARTIFACTS`, `06_MOBILE_UI`, `07_PHASER_ARCHITECTURE`, `09_ROADMAP_ACCEPTANCE` and the implementation/verification reports. Inspect authoritative state/commands, fixed clock, damage/death/reward, Guardian controls, HUD and terminal/restart cleanup.

- Every new match starts LV1. Max LV20. LV1 has one Skill Point; LV2–20 award one each, total 20.
- Next-level XP: `80 + 25 * (level - 1)`. LV20 stops accumulating XP for further levels. Consume thresholds repeatedly when one award crosses several levels.
- XP recipients participate in the attack or are within assistance range; last-hit is not required. Share XP between eligible heroes rather than multiplying it. This slice has only one hero.
- Q/W/E max rank 5; written normal rank-gate proposal requires LV >= `2 * rank - 1`. R max rank 3 at LV6/11/16. Check gate and points before spending. Two further stat ranks exist, but their effects/gates are unspecified and spending them is deferred.
- Guardian Q/W/E/R names: Shield Bash / Taunt / Charge / Guardian Zone. Passive: more armor near base. Names alone do not define damage, area or durations.
- Respawn: `min(25, 5 + 0.8 * (level - 1))` seconds, on the same 30 Hz clock. Death clears movement/attack/aim and temporary statuses; XP/level/ranks persist. Full HP, safe allied-base spawn, two seconds protection ending on attack. New match resets progression.
- Armor formula and status stacking principles exist; skill-specific coefficients/types/status durations do not. No mana pool, mana cost, or other skill resource budget is defined.
- HUD uses authoritative HP/LV/XP/points; pointer controls consume input and use >=48 CSS px targets. Preserve camera, joystick, resources, minimap, Build/Shop and fixed clock. Pause/background/timeScale/terminal state affect all simulation commands/timers.

## Missing specification, confirmed scope

On 9 October 2026 the user explicitly chose **implement only rules present in specifications; report missing rules**. Do not invent experimental values.

Missing: XP amount per enemy/objective; assistance radius and participation lifetime; per-level stat growth and HP-change policy; every skill's rank cost/effect/damage type/range/area/target policy/LOS/duration/cooldown/resource cost; charge movement/collision rules; taunt target types/priority; zone recipients/stacking; passive armor amount/radius; two stat-rank bonuses/gates. Existing `previewSeconds` are Phase 1 visual prototype timing, not approved gameplay ability cooldowns.

Consequently normal gameplay XP rewards/level-ups, stat growth, functional Q/W/E/R/passive, mana and status effects cannot be completed or verified yet. Keep approved skill previews clearly identified as previews. No fake XP based on Gold, arbitrary assistance radius, invented ability effects, or developer fixture claimed as normal progression evidence.

## Implementation sequence

1. Data for the exact threshold/rank/respawn rules; authoritative progression state with fresh-match defaults.
2. Headless XP transaction kernel with source deduplication/multi-level/cap behavior. Connect death participation to that kernel only when a reward is configured; absent configuration awards nothing. No external XP command or additional clock.
3. Skill allocation command with request deduplication, exact level/rank/point validation and events. Leave special-stat spending disabled until defined.
4. Existing HUD LV/XP values plus a small skill-allocation panel, reachable by tapping the Guardian information panel. At least 48 CSS px targets, consume input, close on pause/death/terminal/restart; clearly explain pending rewards/effects.
5. Level-dependent respawn, progression persistence, terminal freeze and fresh restart. Existing combat stats/effects remain unchanged.
6. Test supported rules and lifecycle; run all prior tests/build/diff checks and existing browser suites. Actual browser demonstrates LV1 point allocation, correct pending-XP behavior after normal enemy kills, existing combat/controls and normal Victory/Restart. Supplemental XP fixtures validate calculations/HUD/respawn, never substitute for unavailable normal gameplay evidence.

At plan creation Phase 2A changes were to remain uncommitted/unpushed for review. The subsequent 9 October 2026 request authorizes finalizing the reviewed foundation. This is a partial, specification-supported slice, not completion of functional Hero Skills. Inventory/Artifacts/Fusion, other Heroes, selection, Campaign, Free Play, Android and major UI polish are excluded.
