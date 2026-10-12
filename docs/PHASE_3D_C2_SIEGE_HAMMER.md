# Phase 3D-C2 — Siege Hammer

Baseline: `08a6a7a34fd771593d984b224e6249b4fc3107c8`. Implementation-report technical review passed; approved for C2 finalization. **No Banner/Core, new recipes, Phase3D-C3 or Phase4 work.**

## Specification and combat audit

[Original artifact specification](03_ECONOMY_ARTIFACTS.md) defines Siege Hammer550 Gold, ATK+20 and building damage+25%. Its explicit non-stacking rule concerns economic item passives; Hammer's structural mask, duplicate percentage policy and effect timing are unspecified. There is **no conflict** with C2's approved provisional policies: flat ATK adds per Hammer, one structural25% bonus, Guardian basic strikes only, and no additional eligible targets. These policies are not new original-spec claims.

The baseline Guardian stat writer derives `hero.damage` from original level ATK plus additive equipment ATK, refreshing before command processing and after accepted trades. `Strike` stores target ID and due tick, not equipment or raw-damage snapshots. Commands process before movement/skill resolution and the sorted combat loop; Guardian is first, then unit IDs. A due basic strike revalidates target liveness/team/range/LOS/protection, reads current damage/equipment and resolves the existing seeded Crit decision. **C2 retains resolution-time equipment**, including purchases/sales during an existing windup.

`canAttack()` already supports enemy units and structures, including Keep footprint distance, LOS excluding the attacking/target structure, and positive source/target HP. No target/AI/range/protection policy changes. Guardian active skills use their existing unit-only legal target mask and fixed rank damage. Burn applies only after positive basic HP loss to a surviving hostile unit; it uses its separate magic-hit callback and cannot crit or recursively proc.

Existing physical and magic mitigation is `raw * 100 / (100 + max(0, armor))`, then shield absorption, then HP-loss clamping. Direct damage retains its existing bypass. Damage events report raw, mitigated, absorbed and actual amount; the same hit pipeline records participation and processes death/rewards. Completed enemy Tower death awards80 XP and no Gold; minion death awards60 XP/15 Gold once; Keeps retain objective tombstones/results and no kill rewards. All of these paths are unchanged.

## Authoritative integration and precision

`Inventory.equipmentBuildingMultiplier()` validates inventory, checks for at least one equipped Hammer and reads the original `.25` modifier, returning1.25 once or1. Flat ATK remains in `equipmentStats()` and the existing Guardian refresh; no competing stat writer is added.

After existing basic-hit eligibility and Crit resolution, `Simulation.basicHit()` requires both the actual Guardian source object and the target object registered under its ID in authoritative structures/bases. Sprite/kind/position alone does not grant the bonus. It passes:

`raw = current Guardian ATK * (critical ? 2 : 1) * structuralMultiplier`

into the unchanged physical hit pipeline. Existing JavaScript-number damage precision remains intact: **no ceil, floor, truncation or second rounding stage**. ATK100 yields125 raw structurally and100 against units; critical structural raw is250. Armor100 reduces250 to125; shield30 leaves95 actual HP loss. Fractional armor results retain existing precision. Visual damage numbers, crit feedback, structure/Keep HP and Phase2D notices use their existing consumers; no new effect or permanent indicator.

The multiplier is absent from skills, direct hits, magic/Burn ticks, allied minions and Tower strikes. Ruby and Flame crit remain additive and seeded. Hammer + Flame has ATK135 atLV1, with normal structural168.75 or critical337.5 raw. Flame may Burn a living unit after a positive basic hit, but structural hits still cannot apply Burn. No RNG draw or reward path is introduced by the Hammer helper.

## Duplicates and lifecycle

Two Hammers add40 ATK, with one1.25 factor. Selling one exact duplicate retains the factor; final sale removes it for future resolved strikes. During windup, buy-before-resolution adds both current ATK and structural bonus; final sale-before-resolution removes them. No exception or stale multiplier cache.

Items survive death/respawn; zero HP remains zero during dead trade. Restart clears inventory and derived effects. Existing Pause/zero-speed/input cancellation and terminal-state rejection remain unchanged. Empty inventory returns multiplier1 and preserves original basic-hit/RNG behavior.

## Trading and Shop

Hammer is the sixth page in the existing Extended Encounter catalog. The unchanged authoritative purchase/sale pipeline supplies550 Gold charge and330 standard-basis refund, affordability/capacity/access reasons, ownership/session checks, replay protection, pending request correlation and exact-instance confirmed sale. Its effect is fully integrated before availability is enabled. Banner and Core remain disabled.

The catalog displays `ATK +20` and `Building damage +25%` on two lines using the existing Flame card spacing, with550 Gold. Equipment displays the combined effect and actual paid-basis refund; slot names wrap as `Siege / Hammer`, including disabled entries in component pickers. No new Fusion recipe, target control, artwork, panel bounds or HUD geometry. Actions retain48 CSS px targets; the24px reserve, danger/Keep HP clearance and Build/Shop/Skills mode policy remain unchanged.

## Focused verification

**325 headless tests passed**, including17 Hammer checks and existing Crown, Flame/Fusion, Burn/Crit, artifact/transaction, Shop, Guardian/progression, simulation/match and Phase2D feedback regressions. **19 focused browser checks passed.** TypeScript/Vite production build passed with its existing bundle-size advisory; `git diff --check` passed.

```text
npm test -- siege-hammer.cjs builders-crown.cjs flame-fusion.cjs burn.cjs critical-hits.cjs artifacts.cjs artifact-transactions.cjs shop.cjs guardian-skills.cjs progression.cjs simulation.cjs match.cjs damage-feedback.cjs defense-feedback.cjs context-guidance.cjs notice-slot.cjs
node scripts/verify-siege-hammer.mjs
npm run build
git diff --check
```

Headless coverage:550/330 trading; additive ATK/unique multiplier; duplicate/final sale; authoritative Walls/Towers/Keeps versus units and stale/unregistered targets; range/LOS/protection/team/liveness; armor/shield/fractional damage; Ruby/Flame crit composition; structural Burn exclusion and5-raw magic ticks; active skill/direct/magic exclusions; allied minion/Tower equivalence; damage/HP/death/XP/Gold attribution; in-flight equipment timing; death/respawn/dead trading; pending/replay/affordability/capacity; Pause/results/Restart; and30/60 FPS replay. Existing Crown costs, Fusion selection/pricing and artifact ownership regressions remain green. Combat targets and Gold funding are isolated fixtures, not new live APIs or changed structure/base data.

Browser coverage: out-of-range browsing, effect/price/affordability, pending double tap, authoritative purchase feedback, duplicate ATK, exact confirmed330 refund, final sale, dead remote trading, catalog/Equipment/confirmation text bounds, non-overlapping48px targets,844×390/960×540/safe-area clearance, and Build→Shop→Skills/Pause behavior. Supplemental Gold uses the existing reward ledger in a labeled fixture. No screenshots were generated because the Shop geometry/navigation is unchanged; the addition reuses an existing page pattern. No broader browser suite or evidence collection.

## Changed files and review boundary

**11 files**: four source files (`data/artifacts.ts`, `simulation/Inventory.ts`, `Simulation.ts`, `ui/ShopPanel.ts`); four tests (new `siege-hammer.cjs`, existing artifact/catalog/Crown disabled-product assertions); one focused browser script; this report and Phase3 design status. Raw logs/build/transpiled tests remain local and ignored.

No unresolved specification conflict or blocking gameplay decision. The approved structural mask, non-stacking percentage and resolution-time policy are recorded above for review. No structure stats, economy income, skills, XP/rewards, waves/AI, construction mechanics or unrelated HUD changes. **Do not begin C3.**
