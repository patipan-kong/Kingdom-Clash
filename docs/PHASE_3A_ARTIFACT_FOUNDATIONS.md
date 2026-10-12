# Phase 3A — Artifact foundations

Baseline: `d32d28a43c204ea86e4974e2828952ee7d1dc015`. Approved scope: [Phase 3 design](PHASE_3_DESIGN.md), including its Phase 3A approval record. **Phase 3A reviewed and approved for finalization. Foundations only; Phase 3B has not begun.**

## Implemented

- [Artifact catalog](../src/data/artifacts.ts): the original eight names, prices and effect metadata from [specification 03](03_ECONOMY_ARTIFACTS.md), plus Flame Blade's Sword + Gem + 300 Gold recipe. Catalog validation rejects malformed/duplicate IDs, invalid prices/modifiers, unknown components, repeated references, invalid quantities, inconsistent totals and cyclic recipes. Simulation validates the shipped catalog before starting play.
- [Inventory](../src/simulation/Inventory.ts), owned by [GameState](../src/simulation/GameState.ts): exactly six ordered, automatically equipped slots; no backpack. Every instance records stable match/hero ownership, deterministic sequence, definition ID and total paid basis in ledger units. IDs encode match and hero names independently to avoid delimiter collisions. The next sequence is monotonic and quotes never reserve it. Validation rejects duplicate slots, orphan instances, ownership mismatches and invalid sequence/paid records.
- Pure `equipmentStats()` sums flat HP, ATK and armor, including ordinary duplicates. It never applies Crit, Burn, magic power, CDR, construction discounts, troop aura or structural multipliers. Unsupported artifacts retain their original metadata but report `effectsReady: false` and identify their unsupported effects. Only Sword and Shield report complete effect support. **Every product reports `tradingEnabled: false` in this slice.** Test-only injection of unsupported items can exercise their known flat modifiers; it does not make the whole product available.
- [GuardianSkills.refreshStats](../src/simulation/GuardianSkills.ts) remains the single Guardian stat writer. Equipment HP is added after growth/Fortitude multiplication; ATK and armor are additive. Existing base-passive armor and strongest-zone armor remain intact. The existing two-decimal downward HP-fraction policy is preserved; zero stays zero and repeated refresh does not compound stats or heal. Empty inventories preserve the previous formulas exactly.
- Inventory survives death and respawn because ownership uses the stable Guardian ID rather than a life ID. Pause and result/Restart transitions do not mutate owned items. The existing Restart and encounter-switching flow creates a new Simulation with six empty slots and sequence 1; old match state may remain available for inspection until discarded.
- [ArtifactQuotes](../src/simulation/ArtifactQuotes.ts): deeply frozen, detached purchase/Fusion quotes with explicit consumed instance IDs, missing-component cost, combine fee, exact Gold due, predicted paid basis, final occupied-slot count, first available output slot and proposed deterministic output identity. Capacity is checked **after** consumption; virtual missing ingredients require no temporary slots. Quotes expose affordability/capacity separately from unsupported-effect availability. No candidate output is installed or paid for.
- [Economy](../src/simulation/Economy.ts) exposes a primitive read-only `goldUnits` ledger snapshot. Its existing 1/120 scale is shared through [resources](../src/data/resources.ts); all income, rewards and construction charges are numerically unchanged. Quotes accept exact nonnegative safe-integer ledger units, not a guessed public balance. Future transactions must revalidate and atomically commit against the authoritative ledger; a quote alone is never authorization.

## Quote examples

These are planning results for an unavailable future product, not playable purchases:

| Explicitly selected owned ingredients | Gold due | Paid basis of proposed Blade at original component prices |
|---|---:|---:|
| None | 650 | 650 |
| Iron Sword | 450 | 650 |
| Ruby Gem | 500 | 650 |
| Iron Sword + Ruby Gem | 300 | 650 |

The caller selects exact instance IDs; unselected duplicate items remain owned. Paid basis uses actual consumed-instance costs plus new Gold due, rather than assuming that the combine fee is the total paid amount. Invalid/duplicate/irrelevant component selection throws without changing state. Insufficient funds or capacity is reported without charging, consuming or advancing the sequence. Predicted balances are quote information only.

## Verification

`npm test -- artifacts.cjs guardian-skills.cjs progression.cjs simulation.cjs` — **155 tests passed**, including 21 artifact-foundation checks and the selected existing Guardian, progression, simulation and resource-ledger regressions.

Coverage includes original catalog values and disabled effects; invalid catalogs and recipe cycles; six slots, ownership and deterministic identities; duplicate flat modifiers; every Guardian level and legal Fortitude rank with empty inventory; equipment + Fortitude/base/zone composition; fractional/zero HP and idempotence; real death, Pause, respawn and fresh-match cleanup; 650/450/300 quotes; full-slot post-consumption capacity; immutable/non-mutating quotes; insufficient funds and bad selections; actual paid basis and overflow protection; rejection of live trading commands.

The initial empty-inventory test fixture was corrected to stand outside the existing Azure Keep armor aura. No armor rule was altered to satisfy that assertion.

`npm run build` — TypeScript and Vite production build passed. Vite retains its existing large-bundle advisory.

`git diff --check` — passed. New source/test/document files were also checked for trailing whitespace and conflict markers. No browser suite, screenshot or artwork generation was needed for this UI-free slice.

## Explicit exclusions and next review boundary

No Shop activation, Buy/Sell/Fusion commands, Gold spending/refunds, manual equip/unequip, shop distance/LOS rule, active artifact effects, UI changes, artwork, or Phase 3B/3C/3D work. Combat damage formulas, skill data, progression/XP, waves, AI, input ownership, simulation timing and original economy amounts are unchanged. Approved Phase 2D HUD and feedback, including Keep HP clearance, are untouched.

The catalog, authoritative ownership model, stat composition and quote interfaces have passed design and technical review. Finalization reruns the focused tests, production build and diff checks before committing. Effect support does not imply purchase availability; a later transaction slice requires separate authorization.
