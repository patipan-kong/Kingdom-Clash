# Phase 3B — Authoritative artifact purchase and sale

Baseline: `7eb855a29af9ea5db1bbba0c3a5ae117e3fb6220`. Implements the approved [Phase 3 design](PHASE_3_DESIGN.md) transaction slice only. **Phase 3B reviewed and approved for finalization. Phase 3C has not begun.**

## Command contract and execution

[GameState](../src/simulation/GameState.ts) adds these simulation commands:

```ts
{type:'buy-item', matchId, heroId:'guardian', requestId, itemId:'iron-sword'}
{type:'sell-item', matchId, heroId:'guardian', requestId, instanceId}
```

All identities are required strings. Price, refund, capacity, modifiers and paid basis are derived from authoritative data; extra client fields cannot override them. `Simulation.send()` validates shape and copies identity fields into the existing queue. Structurally valid admission is not transaction success: an `item-traded` event confirms success, or `rejected` explains execution failure.

[Simulation](../src/simulation/Simulation.ts) processes trades in arrival order with the existing command loop, before the dead-hero movement/attack gate. Dead trades work without permitting dead movement, basic attacks or casts. Existing Build/Skill execution and cast ordering are unchanged. Each Simulation owns its transaction handler and captured session identity; the existing Battle Restart flow supplies a fresh match ID. Old-session requests cannot affect a new match.

[ArtifactTransactions](../src/simulation/ArtifactTransactions.ts) validates captured match identity, stable Guardian ownership, shared buy/sell request identity, active match, supported product, access, inventory, affordability and capacity before committing. Valid-identity rejected attempts consume that request ID, so a delayed replay cannot become a purchase when circumstances change. Wrong-session/owner requests do not poison a legitimate current-session request. Two distinct valid purchases are processed independently, against the latest ledger/inventory.

## Products and access

Only **Iron Sword: 200 Gold / ATK +15** and **Guardian Shield: 500 Gold / HP +250, armor +15** allow model-level trading. Ordinary duplicates are allowed. All eight original catalog definitions remain intact; the other six products and all unfinished effects remain unavailable. `artifactAvailability().tradingEnabled` now reports model support for those two products; it does **not** activate the Shop button.

[Artifact trading configuration](../src/data/artifacts.ts) records the provisional **240 world unit** range separately from item prices. Living buy/sell use the same nearest point on Azure Keep's authoritative rectangular footprint, with existing world collision/LOS checks to that point. Access is checked when the command executes, not when it is sent. Dead Guardians bypass distance/LOS. Trading rejects non-playing/results states and destroyed Keeps awaiting result processing. No Campaign or encounter capability gate was added; there is no production Shop UI in either test encounter.

## Atomic money and ownership

The pure planner returns a detached, deeply frozen candidate containing expected Gold units, expected inventory snapshot, next inventory, deterministic output identity and signed Gold change. Purchase/Fusion planning reuses [ArtifactQuotes](../src/simulation/ArtifactQuotes.ts); capacity is checked after exact selected components are consumed. Virtual missing components use no temporary slots. Candidate creation never modifies/freezes input records, charges funds or reserves a sequence.

[Economy.commitArtifactTransaction](../src/simulation/Economy.ts) is a **trusted simulation-internal commit boundary**, not a player command accepting arbitrary plans. It checks active phase, duplicate ledger key, current money and inventory against the expected snapshots, safe/nonnegative amounts, ownership and candidate invariants. It allocates/validates the next records before publishing Gold and inventory together synchronously, with no async work or callbacks between those writes. Stale or invalid plans change neither. Public Gold is updated from the same private 1/120-unit ledger; income, rewards, Wood/Iron and construction amounts are unchanged.

Purchase installs one deterministic instance into the first free slot, records the actual charged basis, and advances the sequence only on success. Sale removes only the exact owned instance, retains the next sequence, and refunds **3/5 of its recorded paid basis**. Sword refunds120 and Shield300 at their original prices. Catalog price is not substituted for actual paid basis. Zero/invalid basis, overflow and non-integral ledger-unit refunds reject; approved integer-Gold purchases always produce exact refunds, so no rounding rule is introduced.

Each accepted transaction invokes the existing `GuardianSkills.refreshStats()` once. The usual simulation expiry refreshes continue unchanged. Equipment HP remains after Fortitude; HP fraction uses the existing downward two-decimal policy, zero stays zero, and repeated fractional-HP buy/sell cycles do not heal. Rejected transactions do not invoke a transaction stat refresh or alter HP, Gold, inventory or sequence. Normal simulation ticks can still update statuses, targets, income or combat independently of a rejected trade; direct-handler snapshot tests isolate transaction atomicity.

## Lifecycle and Fusion boundary

Owned instances/paid basis survive death and respawn; respawn fills derived maxHP. Pause, zero timeScale and existing input cleanup discard pending commands. Battle shutdown already pauses/clears Simulation input; Restart clears input and constructs fresh inventory, request and ledger state. Committed items remain owned until the old match is discarded. Victory/Defeat reject further trading. No pending UI or new timers exist.

`prepareArtifactPurchase()` is the generic pure buy/Fusion candidate path. Tests cover Flame Blade650/450/300 pricing, selected instance IDs, actual total paid basis, missing ingredients and full-slot post-consumption capacity. The trusted commit boundary is reusable by a future approved Fusion handler, but **there is no Fusion command and no ordinary-play Flame Blade/Ruby activation**. No new effect infrastructure is implemented.

## Verification and review

`npm test -- artifact-transactions.cjs artifacts.cjs guardian-skills.cjs progression.cjs simulation.cjs` — **184 passed**: 29 transaction checks, 21 updated catalog/foundation checks and 134 selected existing Guardian/progression/simulation/resource regressions.

Checks cover valid buys/sales, exact charges/refunds, duplicates, full slots, insufficient funds, wrong/stale identities, double-tap and changed-payload replay, competing arrivals, footprint boundary/LOS and execution-time movement, dead trading, actual death/respawn, fractional/zero HP, once-only transaction stat refresh, Pause/shutdown input cleanup/Restart/results, client field tampering, unsupported products, immutable Fusion candidates, full rejection snapshots, stale/invalid ledger commits and 30/60 FPS command replay. Supplementary funds/component/basis fixtures are explicitly test-only; original gameplay income is unchanged.

`npm run build` — TypeScript and Vite passed; existing large-bundle advisory remains. `git diff --check` and new-file whitespace/conflict checks passed. No browser suite, screenshots or new artwork.

No unresolved rule is needed for Phase 3B's two-product transactions. The 240 range remains provisional. Finalization reruns focused tests, production build and diff checks before committing. Future effect semantics, Campaign unlocks, Shop UI/input presentation and live Fusion remain separate review decisions. No Phase 3C/3D work is included.
