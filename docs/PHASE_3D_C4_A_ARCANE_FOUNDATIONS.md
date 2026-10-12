# Phase 3D-C4-A — Arcane Core foundations and CDR

Baseline: `95d909d0a2326342e7337ac68269afa0e3ca7e62`. Technical review passed; committed and published at `b0dcf4ca4a82cf8f83e50e6f4e3e536b07b84fd3`. No C4-B implementation or deployment.

## Scope and authority

Original [artifact specification](03_ECONOMY_ARTIFACTS.md): Core550 Gold, Magic Power30, CDR10%. The [C4 audit](PHASE_3D_C4_ARCANE_CORE_AUDIT.md) remains the historical investigation. The user subsequently approved **C4-A only**: additive power and CDR,40% effective cap, active Guardian skills only, upward integer tick rounding, accepted-cast snapshots and rank-only Guardian effects. These are provisional policies, not retroactive original-spec claims.

## Integration

- [ArcaneEquipment](../src/simulation/ArcaneEquipment.ts) validates authoritative six-slot ownership and returns frozen pure totals: `magicPower`, uncapped `cdrBps`, capped `effectiveCdrBps`. Each original Core adds30 power and1000 basis points. Six yield180 power/6000 raw/4000 effective. No Unit stats or competing stat writer are added. Existing HP/ATK/armor composition is unchanged.
- [GuardianSkills](../src/simulation/GuardianSkills.ts) computes `max(1, ceil(baseRankTicks * (10000-effectiveCdrBps) / 10000))` after **all cast validation** and before acceptance commit. It stores the interval and `ready = acceptedTick + interval` together. Rejected casts change neither. Existing6/9-tick windups,9-tick lock, rank snapshots and resolution effects remain intact.
- [GameState](../src/simulation/GameState.ts) holds `skills.cooldownIntervals` for the four active skills, initially0. Each entry changes only on a later accepted cast. No trades, refresh, learning, interruption, death or respawn recalculate these snapshots or ready deadlines.
- [Simulation](../src/simulation/Simulation.ts) exposes `cooldownInterval(skill)` in ticks. Before any accepted cast it falls back to the current baseline rank interval; after acceptance it reads the stored interval even after cooldown expiry or rank/equipment changes. `remaining()` continues reading the authoritative ready deadline against the shared30Hz clock.
- [HUD](../src/scenes/HUD.ts) uses `cooldownInterval/30` as the existing radial denominator and `remaining()` as its numerator. A reduced cooldown begins with a full cooldown arc and progresses against the interval actually spent. The Attack denominator and all button geometry, art, labels, targets, safe areas and controls are unchanged.

Examples: Bash rank1 with one Core300→270 ticks; rank2 with one Core285→257; rank1 with four or more300→180. Protect rank1 with one Core1650→1485. No floating seconds are used to schedule cooldowns.

## Command order and lifecycle

Existing ordering is preserved: queued trades and learning execute in their original order, then cast requests are sorted by request identity. An accepted cast uses the resulting rank/equipment, even when queued before learning or a trade in the same tick. Core trades themselves still reject; controlled tests inject validated ownership without adding production acquisition commands.

Pause/background/zero scale freeze the existing shared clock. Build/Shop quarter scale advances cooldowns at the same quarter speed as effects; returning to normal changes no deadline. Interruption retains spent cooldown; source death/respawn retains inventory, deadline and interval. Results freeze execution. Restart stops the old instance and creates empty inventory, zero deadlines/intervals and original rank1 display defaults. No old effect data carries into the new match.

## Availability and exclusions

Core metadata and prices are unchanged. `artifactAvailability` still reports incomplete effects and trading disabled; Core is absent from Shop, and authoritative buy/sell paths reject it. No catalog readiness flags, product pages or Fusion recipes were enabled. The aggregation can be exercised only through controlled owned-item fixtures in this slice.

Magic Power has **no Guardian effect consumer**. Bash/Charge damage, Taunt, Protect shield/armor/duration, basic attacks, Burn, Crit, troop/Tower attacks, respawn, rewards, economy and encounter timing remain unchanged. CDR reduces only the four active-skill cooldowns; it does not reduce cast lock, windup, status/effect durations or any other clocks. No new hero or C4-B implementation.

## Verification

**338 focused/regression tests passed**, including24 new [arcane-core tests](../tests/arcane-core.cjs). Coverage: frozen/pure additive totals,40% cap, minimum tick/upward rounding, all four accepted skill intervals with0/1/6 Cores, rejection without spending, same-tick learning/trading order, nonretroactive equipment/rank changes, interruption/death/respawn, Restart, terminal freeze, Pause/zero/quarter speed,30/60 FPS full-state/event replay, unchanged rank effects and unavailable Core buy/sale/Shop. HUD read checks verify the stored denominator remains stable after rank/equipment changes.

Relevant existing regressions cover Guardian/progression, artifacts/transactions, Crit/Burn/Flame Fusion, Crown/Hammer/Banner, Shop, simulation and match behavior. Production TypeScript/Vite build passed (existing large-chunk advisory only). `git diff --check` and new-file whitespace checks passed. No browser suite, screenshots or assets generated; ignored local logs/build output are excluded.

```text
npm test -- arcane-core.cjs guardian-skills.cjs progression.cjs artifacts.cjs artifact-transactions.cjs critical-hits.cjs burn.cjs flame-fusion.cjs builders-crown.cjs siege-hammer.cjs commander-banner.cjs shop.cjs simulation.cjs match.cjs
npm run build
git diff --check
```

## Final milestone product decision

Option A approved: defer live Arcane Core until a future hero meaningfully consumes Magic Power, with separate activation and balance approval. This deliberate product decision closes Phase 3 with seven playable artifacts; it is not an implementation failure. Original550 Gold / Magic Power30 / CDR10% metadata and additive power/capped CDR foundations remain. No Guardian power scaling, Core purchase/sale or live Shop page. See the [full match playtest checklist and log](PHASE_3_FULL_MATCH_PLAYTEST.md).
