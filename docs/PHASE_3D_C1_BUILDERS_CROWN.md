# Phase 3D-C1 — Builder's Crown

Baseline: `17074d7ef23d5d174289a815eccfad71eeab818e`. Technical report and manual visual review passed; approved for C1 finalization. **No Engineer, Hammer, Banner, Core, additional recipes or Phase3D-C2/Phase4 work.**

## Original rules and construction audit

[Original artifact specification](03_ECONOMY_ARTIFACTS.md) defines Builder's Crown at450 Gold, construction reduction8%, and same-named economic passives that do not stack. C1 explicitly approves retaining the effect while dead. The original multiplicative cost/round-once policy is preserved; Engineer's0.9 factor is not enabled.

At baseline, `data/buildings.ts` defined Wall25 Wood/0 Iron and Tower80 Wood/10 Iron. Placement validation checked those base values against public resource mirrors; `Economy.apply()` independently charged them against private1/120-unit balances. HUD buttons hard-coded25 and80/10. There was no live modifier, repair, demolition or paid-cost record. Construction order, geometry, occupancy, spawn reservation, collision, build durations, growing HP and Tower activation remain unchanged.

## Authoritative costs and spending

New `ConstructionCosts.ts` is the shared pure cost source. It validates equipped inventory, derives a single Crown presence flag, reads the original8% modifier and applies9200 basis points once. Positive resources round upward **after** multiplying factors; zero remains zero. The pure factor helper supports composition without intermediate rounding, but live C1 supplies only Crown's factor. It validates integer costs/factors and rejects overflow; it never mutates building definitions or inventory.

| Structure | No Crown | One or multiple Crowns |
|---|---|---|
| Wall |25 Wood,0 Iron|23 Wood,0 Iron|
| Tower |80 Wood,10 Iron|74 Wood,10 Iron|

`Economy.constructionQuote()` returns an immutable cost/affordability snapshot using private Wood/Iron units. Simulation exposes that read interface; placement geometry uses the same cost helper and private-ledger funds. Execution re-derives costs from current inventory before the existing atomic resource debit. No HUD formula or client price is trusted. A forged public resource mirror cannot fund a build.

Each accepted structure records `paidResources` separately from unchanged base definitions. Selling later does not reprice it or introduce refunds. The existing ledger validates both resources before committing, rejects duplicate debit identities, and publishes both mirrors together. Simulation retains its existing placement replay protection and deterministic arrival order. Rejected occupancy, insufficient funds, duplicate or invalid commands cause no partial construction debit.

Queued ordering is deliberate: buy→build uses the discount; build→buy pays the original cost; final sale→build revalidates original affordability; build→sale retains its discounted paid record. A previously affordable23-Wood preview cannot execute for23 after the final Crown is sold.

## Unique passive, trading and lifecycle

One or more equipped Crowns grant one8% factor. Selling one duplicate preserves it; selling the last removes it immediately for future quotes/builds. There is no cached discount, permanent definition mutation or Crown stat writer. Death/respawn retain equipped inventory and the passive; dead construction/trading use existing rules. Restart begins with empty inventory and original costs. Pause/zero speed/shutdown/Restart continue to cancel pending input and freeze shared simulation time.

Crown uses the unchanged atomic Gold purchase/sale path, exact ownership, match/request validation, replay protection, six-slot capacity, living Keep range/LOS and dead bypass. Original purchase450 / resale270 at standard paid basis are verified. Artifact prices, Flame Fusion costs and Gold/resource income are unaffected. Arcane Core, Commander Banner and Siege Hammer remain unavailable; no new recipe is added.

## Mobile presentation

Crown is the fifth page in the existing Extended Shop, with canonical name,450 Gold, **Construction cost −8%**, authoritative affordability/capacity/access and pending-state behavior. Equipment uses the same exact-instance inspection,270-Gold quote and confirmed sale; the long slot name wraps onto two lines, including disabled Crown entries in Fusion component pickers.

Build's existing Wall/Tower buttons now read Simulation's construction quotes every frame. Only their labels change: two lines, at least12 CSS px for cost readability, with no position/hit-area/panel/gesture changes. Wall displays Wood explicitly; Tower retains compact W/I notation within its existing width. Labels update after trades, death, respawn and Restart. Build/Shop quarter speed, Skills mode restoration, Pause, exclusive panels, pointer ownership, HUD, Keep HP and danger feedback are preserved.

## Focused verification

**308 headless tests passed**, including13 Crown tests and existing artifact/transaction, Flame Fusion, Burn/Crit, Shop, Guardian/progression, construction/economy/simulation/match and Phase2D feedback regressions.

```text
npm test -- builders-crown.cjs flame-fusion.cjs burn.cjs critical-hits.cjs artifacts.cjs artifact-transactions.cjs shop.cjs guardian-skills.cjs progression.cjs simulation.cjs match.cjs damage-feedback.cjs defense-feedback.cjs context-guidance.cjs notice-slot.cjs
node scripts/verify-builders-crown.mjs
npm run build
git diff --check
```

Coverage includes450/270 Gold, unchanged stats/artifact prices/definitions,25→23 and80→74/10, zero resource components, pure multiply-before-round fixtures, duplicates/final sale, exact threshold affordability, private-ledger authority, atomic deductions/replay, execution order/stale previews, paid-cost retention, death/respawn, Pause/Restart and30/60 FPS replay. Exact resource boundary tests seed private ledger units in controlled headless fixtures; this adds no live resource grant API. Browser supplemental Gold uses labeled existing minion-reward ledger fixtures.

**27 focused browser checks passed**, covering the Crown page/Equipment text and touch bounds, purchase/refund, real world-placement and confirmation, duplicate/final sales including dead trading, live cost labels, Restart, Build→Shop→Skills/Pause and844×390/960×540 Build touch/HUD/24px reserve clearance. The placement fixture reads current hit bounds and chooses a valid uncovered world cell rather than legacy fixed coordinates. One [844×390 screenshot](phase3dc1/crown-build-844x390.png) shows discounted Build labels. No broad browser suite or screenshot collection.

Production TypeScript/Vite build passed with its existing bundle-size advisory. Whitespace checks passed. Logs, transpiled tests and build output remain local/ignored.

## Changed files and review boundary

Eight source files: new `simulation/ConstructionCosts.ts`; `data/artifacts.ts`, `simulation/Building.ts`, `Economy.ts`, `GameState.ts`, `Simulation.ts`, `scenes/HUD.ts`, `ui/ShopPanel.ts`. Three test files: new `builders-crown.cjs`, plus existing catalog/transaction availability assertions. Review aids: focused browser script, this report, Phase3 design status and one screenshot — **15 files total**.

No blocking design decisions remain. Tower's compact W/I cost notation is the intentional width compromise. Technical report and manual visual review have passed; no unrelated interfaces, economy rates, combat/XP/AI/waves or later artifacts are changed.
