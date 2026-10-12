# Phase 3D-B1 — Deterministic Burn foundation

Baseline: `61eab6d8696642e32dadf86e30cd98240a1da1ad`. **Headless foundation only; technical review passed and B1 is approved for finalization. No Flame Blade trading/Fusion activation or Shop changes.** Original values remain5 damage/s for3 seconds with duration refresh, from [specification03](03_ECONOMY_ARTIFACTS.md). All targeting, damage-type, ordering and ownership semantics below are provisional rules from the approved B1 request, not additional original-spec claims.

## Source audit and architecture

[Simulation](../src/simulation/Simulation.ts) already separates resolved basic hits from skill/direct damage, applies armor/shields before actual HP loss, records source participation, then handles death, XP and once-only Gold rewards. [XPRewards](../src/simulation/XPRewards.ts) gives each unit object a match-local life identity; revive replaces it. Source IDs establish participation even if the Guardian is dead when a later credited hit lands. Existing skill expiry removes stun/slow/taunt, expired shields and invalid source zones, so Burn must not be placed in that expiry list: landed Burn explicitly survives source death.

[BurnEffects](../src/simulation/BurnEffects.ts) is a dedicated registry in [GameState](../src/simulation/GameState.ts), keyed by target unit ID. One entry holds target life, source ID/life and a frozen source snapshot, raw potency, application tick, next due tick and expiry. No generic effect framework, timers, randomness, skill changes or visuals are introduced. Source snapshots preserve landed provenance through death/revival rather than rebinding to a different source life or its later stats.

There is **no production application caller** in B1. The controlled fixture in [burn tests](../tests/burn.cjs) first invokes actual basic-hit resolution, measures actual positive HP loss, then calls the private Simulation-owned effect handler's `applyAfterBasicHit()`. Registration additionally requires an active match, a registered living Guardian, a registered living hostile unit, valid basic range/LOS and no protection; lethal/zero/fully absorbed contacts and structures/Keeps reject. No player command or inventory item grants access. Flame Blade remains unavailable and Burn is still reported unsupported for ordinary play.

## Scheduling, refresh and precedence

Rules derive from the original Flame Blade metadata and the existing30Hz clock: raw5 magic damage,30-tick interval,90-tick initial lifetime. An application at tickT causes **no immediate Burn damage** and schedulesT+30,T+60,T+90. The final due tick runs before the effect's own expiry removal.

Each simulation step processes existing skill/status and reward expiry first, then due Burns, before commands, Guardian respawn, movement, skills and ordinary strikes. This is the explicit provisional tie order: a due Burn can kill a target before its pending ordinary strike; currently expired shields/armor buffs use existing expiry rules. Burns process in sorted target-ID order. The shared clock visits every tick; repeated processing of the same due tick cannot deal damage twice, and expired stale records cannot deal late damage.

Reapplication extends expiry to at least currentTick+90 while retaining the already scheduled next tick and original cadence. Rapid refreshes cannot postpone tick30 indefinitely. One same-named Burn exists per target life. Equal/weaker reapplication retains the stronger existing potency and original source; a stronger application replaces potency/source ownership without delaying the next tick. Equal-source tie ownership is deliberately first-landed and deterministic. These are provisional future-strength semantics, tested with labeled fixtures; the shipping catalog remains5 DPS.

An application after expiry or to a new life starts a fresh cadence. Landed Burn continues when a target leaves initial attack range/LOS; ticks validate current life/team/liveness, not a new attack connection.

## Damage, attribution and lifecycle

Due ticks call the existing `Simulation.hit()` callback with the landed source snapshot, current target, fixed raw amount and **magic** damage type. They never call `basicHit()`, draw crit RNG, refresh/apply Burn recursively, bypass armor/shields or invent rewards. Actual HP loss, mitigation/absorption and source ID use the normal damage event. Positive HP-loss ticks refresh existing participation attribution; target death goes through the existing once-only XP/Gold path, including credit while the source Guardian is dead. Fully absorbed ticks remain truthful zero-damage events and establish no extra HP-loss participation.

Target death through the hit pipeline clears its matching Burn immediately. Removed/replaced targets, changed target life, invalid kind or changed allied team clear the old entry on the next effect pass, before damage. Source death/revival leaves landed entries intact and does not rewrite the stored source life. Existing source-death shield/zone cleanup still applies normally; Burn receives no special mitigation exemption.

Pause/zero timeScale preserve pending effects and freeze simulation ticks. Slow motion changes wall-clock spacing through the existing Clock, without altering deadlines or multiplying duration. Victory/Defeat and `beginRestart()` clear the registry; a fresh Simulation/encounter starts empty. Existing shutdown pauses/disposes the old match, so no wall-clock effect can keep executing. Ordinary input clearing does not erase an already landed Burn on another unit.

## Verification

**275 headless tests passed**, including20 Burn checks plus selected original critical-hit, artifact/transaction, Shop read/model, Guardian, progression, simulation, match and danger/guidance/notice regressions:

```text
npm test -- burn.cjs critical-hits.cjs artifacts.cjs artifact-transactions.cjs shop.cjs guardian-skills.cjs progression.cjs simulation.cjs match.cjs damage-feedback.cjs defense-feedback.cjs context-guidance.cjs notice-slot.cjs
```

Coverage includes original values/no immediate damage/exact30/60/90 ticks; final-tick-before-expiry; repeated refresh/no starvation; one entry/stronger-source and equal-source provenance; invalid, zero, shield-absorbed and lethal application; no structural Burn; current armor/shields; no crit draw or recursive proc; source-attributed death with unchanged60 XP/15 Gold; source death/revival; target death/replacement/respawn life; target movement after landing; Pause/quarter/zero speed;30/60 FPS replay; stable simultaneous order; terminal/Restart cleanup; expired records; and no Burn in ordinary empty/Ruby/forced-Flame-metadata basic combat. Future potency/source and life-change cases are explicitly fixtures, not new playable heroes, item grants or balance values.

`npm run build` — TypeScript/Vite passed, with the existing large-bundle advisory. `git diff --check` and new-file whitespace/source-link checks passed. Raw logs remain local under ignored `test-results/`. No browser suite, screenshots or assets.

## Changed files and review boundary

New `BurnEffects.ts` and `tests/burn.cjs`; `GameState.ts` adds the registry; `Simulation.ts` owns processing, authoritative damage callback and death/result/Restart cleanup. This report and the Phase 3 design status document the slice. Guardian skill/stat code, status rules, XP/Gold ledgers, artifact data, AI/waves, crit resolution, Shop and HUD are unchanged.

The actual finalization scope is **six files: three source files, one test file and two documentation files** (three tracked modifications and three new files). The earlier five-file edit summary did not represent the complete working-tree scope; the full Git path list is authoritative. Local ignored verification logs are excluded.

No unresolved blocking rule for B1. Provisional tick/source tie semantics are covered by the approved B1 technical review; any B2 item/proc integration requires separate authorization. **Do not activate Flame Blade/Fusion or begin B2.**
