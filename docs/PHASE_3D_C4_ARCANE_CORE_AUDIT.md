# Phase 3D-C4 — Arcane Core scope and policy audit

C3 published baseline: `95d909d0a2326342e7337ac68269afa0e3ca7e62` on `main` / `origin/main`. **C4 investigation/design only. No implementation, gameplay/balance/UI changes, assets, C4 commit/push or deployment. Stop for approval.**

## C3 publication record

Before investigation, local `main` was clean at the approved C3 SHA, one commit ahead of `origin/main`. Fetch confirmed remote remained `59b1f87f4074eeb711e462c60ec230516d5d1bca`, an ancestor of approved HEAD. Normal `push origin main` published C3 without force, amend, rebase or another commit. Direct `ls-remote` then confirmed remote main equals the C3 SHA above; local/upstream counts were0/0. Audit documentation was created only after successful publication.

## 1. C4 identity and specification traceability

**Working C4 identity: Arcane Core, including magic-power/CDR foundations and eventual supported Shop trading.** This is an inference from the incremental C1 Crown → C2 Hammer → C3 Banner sequence, the remaining Core work in [Phase3 design](PHASE_3_DESIGN.md), and Core being the sole disabled artifact in the original eight-item catalog. No repository document explicitly defines a numbered C4 implementation contract. Confirm this scope before authorizing code. C4 is not Campaign Phase4, another hero, repair/demolition, a new recipe or a broader magic system.

| Classification | Grounded finding | Source |
|---|---|---|
| Original specification | Arcane Core550 Gold, magic power+30, cooldown reduction10% | [03 economy/artifacts](03_ECONOMY_ARTIFACTS.md), original catalog row |
| Original specification | Six equipment slots; near-base or dead purchase;60% actual paid-cost resale | Same original Shop section. Standard550 basis implies330 resale |
| Original specification | Skill cooldowns use shared simulation time, pause/slow motion consistently, and data rather than hard-coded UI rules | [02 heroes/combat](02_HEROES_COMBAT.md), cooldown section; [07 architecture](07_PHASER_ARCHITECTURE.md), fixed timestep/UI commands |
| Original specification | Physical/magic armor formula, direct damage distinction; named economic passives do not stack | Original02/03. Neither provision specifies Core stacking or magic-power coefficients |
| Original specification limitation | No Core cap, duplicate CDR rule, skill/basic-attack mask, minimum/rounding policy, mid-cooldown trade policy, power-to-damage/shield coefficients or Guardian compatibility | Original numbered documents provide no such definitions |
| Existing approved Guardian policy | Flat rank skill effects with no ATK/AP coefficient; physical Bash/Charge, utility Taunt, fixed shield/armor Zone | [Guardian balance Option A](GUARDIAN_BALANCE_V0_1.md), rank tables/scaling comparison; [guardian data](../src/data/guardian.ts) |
| Previous Phase3 recommendation, not approved C4 mechanics | Additive CDR,40% cap, upward-rounded tick interval, minimum1 tick, snapshot at next accepted cast; retain Guardian's rank effects and withhold Core pending power decision | [Phase3 design](PHASE_3_DESIGN.md), Arcane Core paragraph and open decision5 |
| C3-specific approval, not a Core rule | Banner radius240/no aura LOS, single non-stacking multiplier and resolution-time basic-strike eligibility | [C3 audit](PHASE_3D_C3_BANNER_AUDIT.md). Do not transplant aura/radius/non-stacking/basic-hit policies into C4 |

The original [09 roadmap](09_ROADMAP_ACCEPTANCE.md) places heroes/artifacts in its Phase2 and Campaign in its Phase3. The repository's reviewed Phase3 inventory/artifact sequence is its later incremental implementation plan; original phase labels do not imply Core coefficients or new modes. Original heroes include future Pyromancer, but no implemented mage or numeric magic-power skill formulas currently justify activating Core for one.

## 2. Current implementation status and integration audit

| Area / relevant files | Actual behavior | C4 implication |
|---|---|---|
| [Artifact data](../src/data/artifacts.ts) | Core metadata retains550, `{magic-power:30}`, `{cdr:.1}`; both effects unsupported; Core absent from live trading whitelist | Do not mark effects complete merely because metadata/aggregation exists |
| [Inventory](../src/simulation/Inventory.ts), [Guardian stats](../src/simulation/GuardianSkills.ts) | Flat HP/ATK/armor compose through the existing refresh; separate Crit/Hammer/Banner paths. No magic-power or CDR aggregate/consumer | Add small pure derived aggregates/read interfaces after approval; no second mutable stat writer |
| [Guardian skills](../src/simulation/GuardianSkills.ts), [GameState](../src/simulation/GameState.ts) | Accepted casts snapshot rank, effect tick and geometry/target life. `ready[skill] = acceptedTick + rankCooldownTicks`; lock9 ticks. Rejected casts spend no cooldown. Interruption/death clear casts but preserve spent ready deadlines | Natural CDR integration is the one accepted-cast scheduling write, not periodic rewriting of deadlines |
| [Guardian rank tables](../src/data/guardian.ts) | Bash/Charge fixed physical rank damage; Taunt no damage; Zone fixed rank shield/armor, recipient HP shield cap and duration. No power coefficient | Magic damage type is not a magic-power scaling rule; adding Core power to Bash/Charge/shields would be a new balance policy |
| [Simulation](../src/simulation/Simulation.ts), [Clock](../src/simulation/Clock.ts) |30Hz; trade/learn commands precede cast acceptance; casts sorted by request ID. Pause/zero speed freeze ticks. Basic Attack/minion/Tower timing remains separate. `remaining()` derives seconds from authoritative ready deadlines | Same-tick buy/sale can change the next accepted cast's aggregate; preserve ordering and independent timers |
| [HUD](../src/scenes/HUD.ts), [AbilityButton](../src/ui/AbilityButton.ts) | Seconds read `sim.remaining()`, but radial duration comes from baseline rank cooldown data | A CDR implementation needs an authoritative accepted-interval read for progress, not a UI-side CDR formula or current-item denominator that changes an existing cooldown |
| [Transactions](../src/simulation/ArtifactTransactions.ts), [quotes](../src/simulation/ArtifactQuotes.ts), [Economy](../src/simulation/Economy.ts) | Atomic Gold/inventory, request replay/session/owner checks, paid basis, six slots, range/LOS and dead bypass already exist | Reuse550/330 trading only when approved effect/compatibility presentation is truthful; no currency/income/recipe change |
| [Shop](../src/ui/ShopPanel.ts) | Seven supported product pages; Core absent. Equipment displays supported effects and exact refund; panels retain mobile geometry | Add a compact page/detail only in an authorized live slice. Existing unsupported Core cannot currently be bought |
| [Burn](../src/simulation/BurnEffects.ts), [Crit](../src/simulation/CriticalHits.ts), [Banner](../src/simulation/BannerAura.ts) | Burn5 raw magic ticks, Guardian basic Crit, team troop aura each have their own approved scope | Never infer that power boosts all magic damage/Burn or that CDR affects these separate clocks |

No executable C4 behavior exists: no power stat consumer, cooldown reduction, Core trading or UI. The project currently has only the playable Guardian; no spell-power system can be borrowed from an implemented second hero.

## 3. Proposed smallest technical integration — approval required

### A. Pure equipment foundations

Recommend one pure aggregate of Core-owned modifiers: additive flat magic power (30 per Core if approved) and integer CDR basis points. Validate current authoritative inventory/owner with existing conventions. Do not increment stored stats on buy/sale or every tick. A power read value is a foundation, **not evidence that Guardian effects benefit**. No generic buff framework, mana, new hero or magic damage pipeline.

### B. CDR at accepted casts

Recommended provisional rule package: add10 percentage points per equipped Core, capped40%; only the Guardian's four learned active-skill cooldowns; integer interval `max(1, ceil(baseRankTicks * (10000 - effectiveCdrBps) / 10000))`. Compose percentages/round once using integer tick arithmetic. These defaults mirror the existing Phase3 recommendation and still require explicit approval.

At validated acceptance, snapshot the interval and publish `readyTick = currentTick + interval`. Record the accepted interval per skill for authoritative HUD progress. Buying/selling, skill-rank upgrades, death/respawn or equipment refresh must not rescale existing ready deadlines or in-flight effect timing; new equipment/rank applies on the next accepted cast. Keep existing cooldown spend on interrupted casts. No changes to cast windup, lock, stun/slow/taunt/zone duration, shield magnitude/cap, basic Attack, minion/Tower attacks, Burn, respawn, waves, economy or Clock timeScale.

Illustrations, not live changes: rank1 Bash300 ticks becomes270 with one Core,240 with two,180 at the proposed cap; rank2 Bash285 becomes257 with one after upward rounding; rank1 Zone1650 becomes1485 with one or990 at cap. Four+ Cores would share the proposed40% cap, while flat power could continue to add; neither is established by original item text. At the cap, casting opportunities rise more than40%, so combat control/Zone uptime need focused playtesting without changing their approved base effects.

### C. Resolve magic-power compatibility before live trading

**Recommended safest boundary:** keep Core unavailable until the user chooses its Guardian power semantics. Implementing only CDR or storing unused power must not be reported as both original effects being functionally useful. Do not rename +30 magic power to ATK, boost all magic damage, change Bash/Charge damage type, buff Burn, or invent coefficients to make the catalog look complete.

Two explicit alternatives for later approval:

- **Preserve Guardian rank-only effects.** A Guardian-playable Core could supply CDR while +30 power remains an owned derived stat unused by Guardian. This requires approval of that compatibility limitation and conspicuous Shop/Equipment disclosure, e.g. “Magic power does not scale Guardian skills.” It is a deliberate limitation, not full Guardian power-effect support.
- **Make power useful for Guardian.** Approve exactly which existing damage/shield effects scale, their coefficients, target masks/caps, numeric precision and acceptance-time power snapshot policy. No original coefficient exists; this is separate combat/balance approval and playtesting. The audit proposes no arbitrary coefficients. If chosen, use existing `hit()`/shield paths; do not add damage/reward writers.

Deferring live Core until an independently scoped spell-scaling design or future mage is also valid; it does not authorize implementing that hero in C4. A headless CDR/power foundation can be independently reviewed first while trading remains disabled.

### D. Mobile read integration after approval

Expose effective next-cast intervals and accepted active-cooldown intervals from Simulation; HUD continues to read remaining seconds and uses the accepted denominator throughout a cooldown. No formula duplication in Phaser. Keep controls/artwork/name captions/safe areas/touch ownership unchanged. Shop must disclose550 Gold,30 power,10% CDR, the approved stacking/cap and any Guardian limitation through existing compact pages/details; truthful text precedes availability. No permanent stat row, new aura indicator or HUD redesign.

## 4. Economy, progression and lifecycle

- Original550 Gold purchase /330 standard refund; actual paid-basis60% and ordinary duplicate instances remain. No new discounts, recipes, Gold income or XP. Core must not inherit Crown's construction discount or Banner/Hammer's unique multiplier behavior.
- Same-tick buy/sale before accepted cast affects the new interval only. Existing cooldowns are immutable deadlines: no buy/sell reset, acceleration, delayed cooldown or refund exploit. A rejected/duplicate cast/trade changes no interval/funds/sequence; atomic trade validation remains unchanged.
- Death preserves inventory and existing spent cooldowns; no skill casting while dead. Dead trade may change aggregates for later accepted casts without reviving or rewriting timers. Respawn retains original position/protection/HP policy.
- Pause/background/portrait/zero scale freezes all timers; Build/Shop0.25 mode policy remains. Terminal results reject further casts/trades. Restart resets inventory, derived power/CDR and accepted-interval records to empty-inventory baseline. Shutdown cancels pending input under existing policy.
- Skill allocation keeps level gates, ranks and point economy. Existing in-flight rank/effect timing stays fixed; a future approved power coefficient should snapshot at acceptance, not read sold/newly purchased power at impact.
- CDR may increase damage/control opportunity, but does not authorize changing base skills, statuses, reward amounts, enemy pressure or economy to compensate. Exact Core choices need narrow gameplay review once approved.

## 5. Dependencies, regression risks and verification plan

Dependencies:3A data/ownership/pure stats,3B atomic ledger/paid-basis lifecycle,3C mobile pending requests/mode ownership,3D approved Crit/Burn/Fusion/Crown/Hammer/Banner boundaries, Phase2 Guardian casting/progression/HUD. Reuse them; C4 has no dependency on new Campaign/Free Play or heroes.

Primary risks are obsolete UI radial duration, stale cooldown rewrites on trading/rank change, float rounding at fractional tick boundaries, false AP-effect claims, unintended changes to R shield caps/interrupt semantics, and accidental CDR application to basic attacks/Burn/respawn. These are integration risks, **not confirmed current C3 defects**.

Existing focused suites: `guardian-skills.cjs` (rank cooldowns, cast rejection/locks/interrupts, shield/status endpoints, death retention), `progression.cjs`, `simulation.cjs`/`match.cjs` (shared clock/restart/results/basic attacks), `artifacts.cjs`, `artifact-transactions.cjs`, `shop.cjs`, `flame-fusion.cjs`, `critical-hits.cjs`, `burn.cjs`, `builders-crown.cjs`, `siege-hammer.cjs`, `commander-banner.cjs`, and Phase2D feedback/input verifiers. Do not convert catalog “supported” assertions until real approved effects exist.

After approval add focused Core tests: empty-inventory exact equivalence;30-power aggregation without stat mutation;1–6 duplicate CDR/cap according to chosen rule; all four skill ranks and upward-rounding boundaries; minimum interval; accepted versus rejected/duplicate casts; same-tick trade ordering; nonretroactive buy/sell/rank/interrupt/death/respawn; Pause/0.25/zero speed/terminal/Restart;30/60 FPS replay; no basic/minion/Tower/Burn/Crit/Banner/Crown/Hammer leakage;550/330 actual-basis trading/capacity/access/replay if enabled. If power scaling is authorized, separately cover exact coefficients, accepted snapshots, target/mitigation/shield caps and existing reward attribution.

Narrow browser checks only for any authorized cooldown/read UI or Core page change: correct seconds and progress after equipment changes, learning/locking/stun/casting states, pending Buy/Sell/confirmation, explicit Guardian compatibility text, panel transitions and844×390/960×540 safe-area/48px/24px-reserve/notice/Keep HP clearance. At most one representative screenshot only if presentation materially changes. Production build and diff checks at implementation review; no new suite or screenshot collection in this audit.

## 6. Open policy decisions and recommended boundaries

| Decision requiring explicit approval | Recommendation / boundary |
|---|---|
| Is C4 Arcane Core's remaining power/CDR work? | Yes as the smallest inferred remaining artifact scope; confirm because no original numbered C4 contract exists |
| What does magic power do for Guardian? | Preserve existing rank-only skills; keep Core unavailable pending an explicit compatibility decision. If allowing CDR-only Guardian utility, approve/disclose unused power. If scaling, approve effects/coefficients separately |
| CDR stacking and cap? | Additive10% per Core, provisional40% cap; do not reuse C3 duplicate non-stacking policy |
| Affected timers? | Only four active-skill cooldowns; no basic attacks, cast lock/windup, statuses, Burn, minion/Tower timing, respawn or other clocks |
| Rounding and snapshot timing? | Upward integer ticks, minimum1; snapshot on acceptance; never rewrite an existing deadline on trade/upgrade/death |
| Is magic power additive, and how is later effect strength snapshotted? | Propose30 per Core; future consuming skill snapshots power at acceptance. No coefficient or new consumer without approval |
| Can live trading be enabled with an unused Guardian stat? | Do not enable by default; approve explicit limitation or require meaningful approved power effects first |

Recommended review boundaries: **C4-A** pure power/CDR foundations plus accepted-cast scheduling/HUD read correctness after policy approval, Core still disabled; **C4-B** approved power compatibility/effects and live550/330 Shop integration, only if the policy allows it. These are proposed review slices, not implementation authorization. If all policy decisions are approved together, a single small Core slice may be reviewed instead; do not add a generic effect framework or new heroes.

## Audit outcome

C3 publication succeeded and remote SHA was verified directly. C4 source investigation identifies missing Core semantics that require approval; no implementation proceeded. Only this audit file was created. Documentation/source-link/whitespace checks ran; gameplay tests/build/browser checks were intentionally not repeated for a read-only investigation. Arcane Core remains unavailable. **Wait for C4 policy approval; no C4 commit/push or deployment.**
