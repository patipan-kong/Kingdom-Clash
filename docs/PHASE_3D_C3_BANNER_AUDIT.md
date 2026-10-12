# Phase 3D-C3 — Commander Banner audit and policy proposal

Baseline: `59b1f87f4074eeb711e462c60ec230516d5d1bca`. **Historical source audit; all eight provisional policy proposals subsequently approved for implementation.** The original audit stopped as requested because gameplay-critical semantics were missing. See [the C3 implementation report](PHASE_3D_C3_COMMANDER_BANNER.md) for current availability and verification. Final C3 technical review/conditional commit is documented separately; no push/deployment or C4 work.

## Specification traceability

| Finding | Authority | Status |
|---|---|---|
| Commander Banner costs600 Gold and grants troop ATK+15% within range | [Original economy/artifact spec](03_ECONOMY_ARTIFACTS.md), catalog row | Original requirement; exact range value absent |
| Six equipment slots, near-base/dead purchase and60% actual paid-cost resale | Same original Shop section; approved3A–C transactions | Existing behavior; standard Banner refund would be360 Gold |
| Named economic unique passives do not stack | Same original Shop section | Applies explicitly to economic items; does not establish Banner combat-aura stacking |
| Radius, distance boundary, recipient ownership/type, LOS, death behavior, duplicate Banner policy and windup timing | No definition found in original numbered specifications | Missing rules requiring approval |
| Living Guardian, radius240, allied minions, non-stacking aura and LOS | [Phase3 design recommendation](PHASE_3_DESIGN.md), Banner paragraph | Explicitly provisional, not original requirements or implemented behavior |

The original Thai effect `ATK ทหารในระยะ +15%` states troop attack+15% within range. It gives no numeric radius or further mask. Other original radius references describe building territory or different hero effects; they do not define this item. No material original-spec conflict exists. The older Phase3 LOS recommendation is a proposal, while the latest C3 request proposes no aura LOS unless originally required. The approved C3 policy therefore uses **no aura LOS**, superseding the older unimplemented LOS recommendation.

## Baseline implementation audit

| Area | Source-grounded behavior | C3 implication |
|---|---|---|
| Ownership/catalog | `GameState.units.guardian`, `inventory.ownerHeroId`, `Unit.team`; catalog Banner600 and `troop-attack-aura:.15` | One playable Guardian, team-based troops; no per-Guardian minion-owner identity. Aura metadata remains unsupported and trading disabled |
| Spawn/base damage | `Simulation.unit()` copies `minionStats`; kind/team derive as blue/red. `spawnDue()` preserves schedule/team order, caps and blocked spawning. Original minion raw damage18 | No permanent damage buff or spawn changes;18 becomes20.7 raw only for eligible resolved hits |
| Movement/targeting | `Movement.updateMovement()` updates authoritative x/y for living minions before combat, retaining target selection, routes, breaching, stun/slow and separation | Evaluate final simulation coordinates, not render projection or AI proximity guesses; leave navigation/AI untouched |
| Windup/order |30Hz shared `Clock`; command phase before movement/skills and sorted basic combat. Guardian first, then stable IDs. Minion windup9 ticks; strike stores target/due tick, not equipment | Resolution-time aura checks naturally match existing equipment policy; do not add a snapshot or frame timer |
| Hit eligibility | `Combat.canAttack()` validates positive HP, hostile teams, range, Keep footprint and attack LOS; `basicHit()` validates protection before damage | Aura eligibility must follow these checks; no new target/range/protection permissions |
| Damage modifiers | `basicHit()` currently applies Crit/Hammer only for actual Guardian source; `hit()` handles physical mitigation, shields and clamped HP loss. Skills and Burn call `hit()` separately | Add troop factor only in the basic-strike path; no Crit draws, Burn proc, Hammer leakage or new rounding |
| Existing aura | `GuardianSkills.refreshStats()` derives R-zone armor with LOS and caches original minion armor, not attack | Separate skill semantics; do not reuse armor writer or mutate minion damage every tick |
| Lifecycle/rewards | Death removes minions/structures and clears targeting; Guardian respawn retains inventory and replaces life identity. Current hit source attribution, life-based XP dedup and existing minion Gold ledger apply | Aura has no persistent target record; troop is still the damage/death source. Existing hero XP assistance and Gold accounting stay unchanged |
| Pause/results/Restart | Clock freezes; input clears; terminal result freezes match; new Simulation resets inventory/session | No timed aura registry needed; derive current effect only when a strike resolves |
| Shop | Existing immutable quotes, atomic Gold/inventory commit, shared request replay namespace, pending correlation, exact-instance sale and live access rules | Enable Banner only after complete approved aura behavior; reuse600 purchase/360 resale and existing compact pages |

World geometry uses x/y in world units; `GRID=48`. Display y is projected by0.72 and must never enter eligibility. Existing range checks use center distance (except Keep targeting footprints) with a small boundary tolerance. No Banner recipient calculation, damage multiplier or visual indicator currently exists.

## Concrete provisional policy for approval

1. **Radius240 world units**, inclusive center-to-center distance, using the existing1e-8 boundary tolerance. This is five grid cells, matches the prior Phase3 radius recommendation and offers local allied support without making the item global. It is a configurable provisional starting value for later playtesting, not an original specification number.
2. **One living authoritative Guardian source** with at least one equipped Banner. Recipients are living registered combat minions (`minion-blue`/`minion-red`) whose authoritative team matches that Guardian. Current blue troops qualify by team, regardless of wave/initial spawn ID. Guardian, enemies, Towers, Walls and Keeps never receive the aura. No new ownership or troop class system.
3. **No aura LOS check.** Walls do not block delivery of the aura. The recipient's actual attack must still pass its unchanged target/range/LOS/protection rules. This follows the latest proposed policy and avoids importing a rule from R or Shop access.
4. **One1.15 multiplier, regardless of Banner duplicates.** Selling one preserves it; selling the final Banner removes it for future strikes. No additive/compound percentage across items or ticks. Future multiple-hero overlapping auras are deferred, not new C3 infrastructure.
5. **Resolution-time eligibility.** After normal basic-hit validation, check current Guardian life/HP, inventory and source-minion world position. Entering before hit resolution qualifies; leaving before resolution does not. Same-tick buy/sale precedes strikes under existing command order; a Guardian killed before a later troop strike disables that strike's bonus. Respawn can restore eligibility at its new world position.
6. **Multiply existing troop raw basic damage by1.15 once**, before existing physical armor/shield/HP loss. Keep current floating-point precision; no rounding stage, stat writes or RNG. Minion18 yields20.7 raw. Eligible basic attacks against already legal enemy units/structures may benefit; the item does not change target masks. Skills, direct/magic/Burn damage remain outside the aura path.
7. **Derive at relevant strikes only.** No whole-world per-frame scan, cached/permanent minion modifier, duration, grant ledger or persistent buff state. Death, sale, despawn, Pause, terminal state and Restart follow existing source/clock/inventory rules.
8. **Presentation/trading:** retain600 Gold/360 standard refund, authoritative six-slot transactions and existing Shop/Equipment patterns. Describe `Allied troops ATK +15% · within240 · living Guardian · does not stack`, split across existing compact detail pages/lines if necessary. Preserve48px targets,24px reserve, notices and Keep HP. Start with existing damage feedback and truthful item text; no permanent aura circle, new art or effect.

These policies are one proposed approval package. **Radius240, no aura LOS, same-team living-minion mask, living-source/death behavior, single non-stacking factor and resolution-time checks have been approved for implementation.** This audit records the source distinction; implementation is documented separately.

## Implementation and acceptance plan after approval

One focused C3 slice: pure Banner rule/eligibility helper consumed by the existing basic-strike path; catalog availability only after effects work; compact Shop/Equipment description; narrow headless and conditional browser checks. Reuse the existing stat/transaction/death paths. Do not modify minion base damage, AI, waves, skills, income or economy.

Acceptance checks:600/360 trading;18→20.7 raw once; duplicate/final sale; exact240 boundary plus movement during windup; attack LOS versus aura LOS distinction; hostile/allied and Guardian/structure exclusions; source death/respawn and command-order buy/sale; armor/shields; unchanged troop death/XP/Gold attribution; no Crit/Burn/Hammer leakage or stat compounding; Pause/zero speed/results/Restart;30/60 FPS replay; existing Crown/Fusion/Shop/AI/wave regressions. Narrow browser checks only for changed Shop text/actions. At most one screenshot only if presentation materially changes.

## Review status

At the audit checkpoint, original price/effect were confirmed, missing semantics identified and concrete defaults proposed; only documentation/source checks ran. The user subsequently approved all policies, including240/no aura LOS and resolution-time eligibility, and authorized C3 implementation. Current changed files, tests/build/browser results and limitations are in [the implementation report](PHASE_3D_C3_COMMANDER_BANNER.md). **Final C3 review permits a conditional commit only; no push/deployment or C4.**
