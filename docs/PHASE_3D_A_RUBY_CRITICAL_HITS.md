# Phase 3D-A — Ruby Gem and deterministic critical hits

Baseline: `9a58c7c164346bd12065e5524bf61eb8975fb0e2`. Implements only the approved Ruby/crit slice of [Phase 3 design](PHASE_3_DESIGN.md), preserving the original [artifact catalog](03_ECONOMY_ARTIFACTS.md). **Phase 3D-A passed technical and manual visual review and is approved for finalization.**

## Resolution audit and integration

[Simulation](../src/simulation/Simulation.ts) starts ordinary attacks with an `attack` intent event, sets readyTick and a future strike deadline, then resolves the strike later in the existing unit loop. Resolution revalidates living enemy target, range, LOS and protection; stun/cast/death gates precede it. Guardian resolves first, followed by the existing stable unit-ID order. The zero-windup path for towers is separate from ordinary pending windup. Neither intent nor animation proves a landed hit.

Both actual basic-strike hit paths now call `basicHit()`. This revalidates hit eligibility, derives equipped Ruby chance, consumes one eligible roll and passes `source.damage × 2` on a critical result (otherwise unchanged raw damage) to the existing physical `hit()` pipeline. Armor, shield absorption, actual HP loss, source/target identity, deaths, XP and Gold rewards are untouched. Existing structural basic targets remain eligible; no range/target mask is invented. Guardian skills continue to call `hit()` directly and cannot roll or crit. Minion/tower basic damage uses the same wrapper with zero chance and no RNG.

Only successful critical resolutions add `critical: true` to their authoritative damage event. Ordinary/zero-crit events retain their previous shape; no false flag or new intent event is added. Positive critical damage uses the existing world-space damage text with a small gold `CRIT` prefix. Fully absorbed/zero HP-loss events remain free of misleading damage text or HP pulses. B1/B2 notices and B3 guidance retain their slots/priority.

## Seed ownership and consumption

[CriticalHits](../src/simulation/CriticalHits.ts) implements a small uint32 LCG: `state = (imul(state,1664525) + 1013904223) >>> 0`; the normalized roll is `state / 2^32`, compared strictly below the chance. No `Math.random()`, render time, UUID or general random gameplay service is used.

GameState owns inspectable `{seed,state,rolls}`. Simulation's optional third constructor argument is the initial uint32 seed, including valid seed0. The default is fixed `0x4b434c48`, so normal new matches/Restart begin reproducibly; changing a custom test/replay seed is explicit. A different match ID does not silently change that seed. Death/respawn, Pause, item purchases/sales and stat refresh retain RNG state; fresh Simulation resets it. No persistent replay or settings system is introduced.

Ruby supplies1000 basis points per instance; additive chance caps at10000. Six original Gems produce60%, so the100% cap test uses a clearly labeled higher-chance catalog fixture, not extra inventory slots or altered shipping metadata. Only Ruby is currently an eligible crit provider. Unavailable Flame Blade cannot activate Crit/Burn by virtue of stored metadata.

Exactly one roll occurs for a valid resolved Guardian basic strike with positive crit chance, including a valid hit fully absorbed by shields. No roll occurs at intent/windup, invalid/range/LOS/protection failure, canceled/pause-discarded strike, dead source/target, results, skills/direct damage, other units, empty inventory or zero chance. Stable authoritative tick/order determine draw order; 30/60 render partitions replay identically. Selling the last Gem removes chance without resetting the stream.

## Ruby ownership, economy and Shop

Ruby now has complete effect support and joins Sword/Shield in the live-trading allowlist. Original150 Gold/+10% Crit metadata and the other seven definitions remain unchanged. Existing commands, six slots, automatic equipment, ordinary duplicates, match/owner validation, capacity/affordability, paid-basis records, request deduplication and atomic commits are reused. Original-price Ruby sale refunds90 Gold. No Gold/XP/reward, base-stat, cooldown, windup or armor change is made.

[ShopPanel](../src/ui/ShopPanel.ts) still opens only through Extended Encounter's existing utility. Army remains Soon. All three products use the existing product card dimensions/materials and48px actions. Compact Back/Next paging shows one product at a time in the established card area; it occupies the former second-card area rather than shrinking text or touch targets. Equipment shows each exact instance's canonical name and effect; Ruby selection/confirmation uses the existing sale flow. Paging is disabled while a request is pending. No new artwork, combat HUD field, products beyond Ruby or manual equipment system.

## Verification

Focused combat/artifact/trading/Shop/Guardian/progression/simulation and danger/guidance/notice regressions: **239 tests passed**, including18 critical-hit checks. Separate16 match regressions passed (255 total headless checks). Command:

```text
npm test -- critical-hits.cjs artifacts.cjs artifact-transactions.cjs shop.cjs guardian-skills.cjs progression.cjs simulation.cjs damage-feedback.cjs defense-feedback.cjs context-guidance.cjs notice-slot.cjs
npm test -- match.cjs
```

Coverage: known seed0 LCG state, seed validation, reproducible streams, 10%/duplicates/cap, valid hit-only rolling, noncritical event shape, zero/invalid/canceled/protected cases, armor and partial/full shields, skill/direct exclusion, minion/tower equivalence, existing structural targets, critical death/source and original60 XP/15 Gold reward, 30/60 replay, Ruby prices/refunds/replays/full slots, death/respawn/sale/Restart and empty-inventory event equivalence. Early skill exclusion fixture timing/value expectations were corrected to the existing6-tick windup and configured rank damage; no skill rule was changed.

`node scripts/verify-ruby.mjs`: **10 focused browser checks passed**, covering actual Ruby buy/inspect/confirm/sell/rebuy, original descriptions,48px non-overlapping paging at844×390/960×540/safe areas, and gold critical text from an authoritative valid-hit fixture. The existing focused Shop verifier also passed **31 checks**, with paging-aware navigation and screenshot capture disabled, preserving lifecycle/pointer and B1/B2 clearance regression coverage. The feedback fixture explicitly sets seed2000 and a valid nearby enemy; it is not evidence of ordinary-play crit frequency.

TypeScript/Vite production build passed; existing large-bundle advisory remains. `git diff --check` and new-file whitespace/source-link checks passed. Raw evidence remains ignored under `test-results/`. One representative [844×390 Ruby Shop screenshot](phase3da/ruby-844x390.png) is retained; no screenshot collection or new assets.

## Review boundary

Changed architecture: CriticalHits and match RNG state, authoritative basic-strike wrapper/event metadata, Ruby availability, world damage-text emphasis, Shop paging/equipment labels, focused tests/verifiers and documentation. Original Guardian stat refresh remains the single stat writer and was not changed.

No unresolved blocking rule. Default seed policy and2×/additive crit values remain provisional and have passed the requested review; the same fixed seed intentionally repeats a fresh match's draw stream. Approved paging retains existing geometry/readability. Physical Android QA remains outstanding. Finalization reruns focused verification with screenshot capture disabled, preserving the approved image.

Flame Blade, Burn, Fusion, Core/Crown/Banner/Hammer effects, additional rewards/currency, balancing, other heroes/modes and Phase 4 remain excluded. **No Phase 3D-B work is included.**
