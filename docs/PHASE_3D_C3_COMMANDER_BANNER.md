# Phase 3D-C3 — Commander Banner implementation

Baseline: `59b1f87f4074eeb711e462c60ec230516d5d1bca`. All policies in [the source audit](PHASE_3D_C3_BANNER_AUDIT.md) were approved before implementation. **Final technical review passed; conditional C3 commit authorized. No push/deployment or C4 work.**

## Original requirement and approved semantics

[Original artifact specification](03_ECONOMY_ARTIFACTS.md) defines Commander Banner600 Gold and troop ATK+15% within range. Original Shop rules prescribe six slots, living-base/dead purchases and60% actual paid-cost resale (360 for a standard Banner). It does not define aura radius, LOS, precise troop mask, combat-aura stacking or timing. The economic unique-passive clause was not silently applied to this combat artifact.

Approved C3 semantics: inclusive240 **world-unit**, center-to-center radius with1e-8 tolerance; living registered authoritative Guardian; living registered combat minions matching its authoritative team; no Guardian/hostile/structure recipients; **no aura LOS**; one1.15 factor irrespective of duplicate Banners; eligibility at basic-strike resolution. These remain explicitly provisional implementation policies. They supersede the old unimplemented Phase3 LOS recommendation, not the original numbered specification.

## Authoritative combat architecture

New pure `BannerAura.bannerMultiplier(state, source)` validates the current Guardian object/ID/kind, positive finite HP, inventory owner, registered source identity, minion kind, living state and team. Distance uses finite simulation x/y only, never projected y, sprites or interpolation. Valid inventory is read only when a nearby allied minion qualifies; at most six slots are inspected. Presence of one or more Banners returns the original metadata's1+.15 factor. No whole-world/per-frame eligibility scan, stat writer, target buff cache, duration, life ledger, timer or RNG is added.

After unchanged `basicHit()` target/range/LOS/protection validation, only allied minion basic strikes query this helper. The result multiplies the troop's existing raw attack once, before the existing physical `hit()` pipeline. Base18 becomes18×1.15 (20.7 within existing floating-point precision), then ordinary armor, shield absorption and clamped HP loss. No rounding stage or permanent `Unit.damage` mutation. Without a Banner/outside range/dead or invalid Guardian, raw damage stays18.

Guardian Crit and Hammer remain restricted to the actual Guardian source; Flame's proc remains Guardian-only and unit-only. Banner-supported troops never roll Crit, proc Burn or receive Hammer's structural bonus. Direct/magic/skill/Burn callbacks are unchanged. Troops can gain the aura on attacks against already eligible hostile units or structures; no target mask or attack range is expanded. Walls may block an actual troop attack while still allowing delivery of the aura.

The troop's own ID remains in damage/death events. Existing armor/shields, participation, proximity/LOS XP assistance, target-life reward deduplication, minion Gold and Keep results remain untouched. An aura source is not substituted as the attacker, and no guaranteed XP entitlement is added merely for equipping Banner.

## Timing, duplicates and lifecycle

Existing30Hz update order is preserved: commands, then movement/skill resolution, then stable sorted combat (Guardian first, followed by IDs). Eligibility reads the current position/equipment when a valid hit resolves. Enter-before-resolution qualifies, leave-before-resolution does not. Same-tick accepted buy/sale precedes due strikes. One duplicate sale retains the factor; final sale removes it immediately for future resolved strikes.

Guardian HP0 disables the aura without deleting Banner ownership. Respawn restores eligibility around its new current position; old nearby troops do not receive a cached buff. **Existing Guardian death cleanup clears pending strikes/targets for all units.** It therefore cancels later pending minion windups in that death tick; this was preserved rather than inventing an exception. Subsequent valid troop attacks while the Guardian is dead are unbuffed.

Pause/zero scale freeze simulation coordinates, inventory, ticks and attacks; pure eligibility may still describe the frozen living source, but no damage executes. Terminal/restarting matches grant no further aura combat. Restart creates empty inventory and no effect state. Removed/replaced minion objects fail registration checks. No persistent aura can leak into a later match.

## Trading and mobile Shop

Banner is enabled only with the implemented effect. Existing atomic purchase/sale, paid-basis refund, exact-instance confirmation, shared replay namespace, match/owner validation, six-slot capacity, living Keep240-footprint/LOS trade access, dead bypass and pending event correlation are reused without changes. Trade LOS remains separate from the approved **no aura LOS** rule. Arcane Core remains disabled and no recipe is added.

The seventh catalog page displays Commander Banner, allied troop ATK+15%, range240, living Guardian and non-stacking semantics, with600 Gold. Existing two-line product spacing is reused; Equipment uses compact detail lines and the authoritative resale quote. Slot names wrap as Commander/Banner in normal equipment and disabled Fusion picker entries. Shop bounds/navigation/action centers,48 CSS px targets,24px reserve, notices, Keep HP, combat controls and Build/Shop/Skills/Pause policies are unchanged. No artwork, permanent aura circle or new damage visual; existing increased HP loss/damage feedback and truthful item text provide the indication.

## Verification

**387 focused headless tests passed**:21 new Banner checks plus existing artifact/transactions, Crown, Hammer, Flame Fusion, Burn/Crit, Shop, Guardian/progression, simulation/match, navigation/encounter waves and Phase2D feedback regressions. **19 focused browser checks passed.** Production TypeScript/Vite build passed with its existing bundle-size advisory. Diff/new-file whitespace checks passed.

```text
npm test -- commander-banner.cjs siege-hammer.cjs builders-crown.cjs flame-fusion.cjs burn.cjs critical-hits.cjs artifacts.cjs artifact-transactions.cjs shop.cjs guardian-skills.cjs progression.cjs simulation.cjs match.cjs navigation.cjs encounter.cjs damage-feedback.cjs defense-feedback.cjs context-guidance.cjs notice-slot.cjs
node scripts/verify-commander-banner.mjs
npm run build
git diff --check
```

Banner coverage includes600/360 and discounted actual paid basis;18→20.7 raw without compounding;240/tolerance/outside boundary; authoritative team and stale/unregistered identities; recipient/source exclusions; aura LOS independence versus attack LOS; duplicate/final sale; entering/leaving windup; same-tick trading; death/respawn and existing death-tick cancellations; physical armor/shields/fractional HP loss; troop source attribution and once-only XP/Gold; no Crit/Burn/Hammer leakage; no damage-stat mutation; Pause/zero scale/results/Restart; ownership/session/capacity/replay/pending;30/60 FPS replay.

Browser checks cover truthful eligibility text,600 affordability/access, pending double tap, authoritative transactions,360 exact duplicate/final sale, dead purchase without healing, catalog/Equipment/confirmation readability and non-overlapping48px actions,844×390/960×540/safe-area clearance and Build→Shop→Skills/Pause. Gold funding uses labeled existing-ledger reward fixtures. No screenshots generated because the presentation uses unchanged page geometry; no broad browser suite or asset collection. Logs/build/transpiled tests remain local and ignored.

## Final technical review and conditional commit gate

**Verdict: GO.** Read-only audit of the approved policy, original catalog, actual source/diff and tests found no unresolved BLOCKER, policy discrepancy or required new design decision. Guardian/minion identity, ownership, finite world coordinates, radius/no aura LOS, one factor, resolution-time ordering, death-tick cancellations and lifecycle conform. Existing mitigation, source attribution, rewards and atomic trading remain unchanged. No permanent aura/stat cache or per-frame/full-world aura scan exists. The focused tests cover the changed helper/basic-strike boundary, trading, lifecycle and mobile text/action geometry.

**NON-BLOCKING observation — `src/simulation/BannerAura.ts:10` and `:12`:** each nearby eligible minion strike revalidates the bounded six-slot inventory and looks up immutable catalog metadata. `Inventory.validateInventory()` constructs a Set and recomputes instance identities; these are repeated allocations/work at strikes, including nearby no-Banner cases. Impact is bounded to six slots and the fixed eight-item catalog; no performance regression is demonstrated. Retain correctness checks for C3; profile before considering a later pure/static lookup optimization. Do not add a persistent aura cache to optimize it. **FUTURE:** no required follow-up; multiple aura owners/troop classes stay outside C3.

Actual review rerun:387 tests passed,19 focused browser checks passed, production build passed (existing bundle advisory), and whitespace checks passed. No runtime corrections or additional regression tests were necessary. Documentation records review approval and distinguishes the historical baseline audit from implementation status. The intended13-file scope excludes ignored logs/build/transpiled fixtures. Branch `main` was reviewed at the exact baseline above; commit is authorized only for these files, with no push/deployment/C4.

## Final scope

**13 files**: four source files (new `simulation/BannerAura.ts`, `Simulation.ts`, `data/artifacts.ts`, `ui/ShopPanel.ts`); five tests (new `commander-banner.cjs` and four existing catalog/transaction/Crown/Hammer unavailable-product assertions); one focused browser verifier; three docs (the approved audit, this report, Phase3 design status).

Only current combat-minion kinds are eligible; multiple playable aura owners or new troop classes remain out of scope. No blocking technical/gameplay concerns remain under the approved policy. No base stats, skills, AI/routes, spawning/waves, economy/XP/reward rules, prior item effects, artwork or HUD geometry were changed. **Stop after the C3 conditional commit; no push/deployment or C4.**
