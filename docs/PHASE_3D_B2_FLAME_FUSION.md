# Phase 3D-B2 — Flame Blade and live Fusion

Baseline: `0c2e68a64bcb944e89c6c1d26a213e5c5e8bbc1a`. Technical report and manual visual review passed; approved for B2 finalization. **No other effects, recipes or Phase 3D-C/Phase 4 work.**

## Specification and effect integration

[Original artifact specification](03_ECONOMY_ARTIFACTS.md) defines Flame Blade at650 Gold: Sword200 + Gem150 + combining fee300, ATK+35, Crit+10%, Burn5 damage/s for3 seconds with refresh. All catalog metadata is unchanged. The approved B1 unit-only magic damage, landed source attribution, stronger precedence and30/60/90 cadence remain provisional implementation semantics, rather than additional original-spec claims.

The existing derived Guardian stat writer supplies Blade's flat ATK. Crit aggregation adds the Blade's10 percentage points alongside Ruby, using the unchanged seeded RNG and eligible-strike policy. After a valid Guardian basic hit resolves, actual positive HP loss against a surviving hostile unit applies/refreshes the existing Burn registry only while a Blade is equipped. Absorbed/zero/lethal contacts, skills, direct damage and structures do not apply it. Critical basic hits may apply Burn. Duplicate Blades add ATK/Crit but refresh one same-named Burn.

Burn ticks still call the normal magic damage path; they cannot crit or apply another Burn. Selling a Blade removes future ATK/Crit/proc capability, while already landed Burns keep their recorded source and expiry. Original mitigation, shields, death, XP and Gold reward pipelines are unchanged. No new Burn artwork or presentation was added.

## Authoritative transaction architecture

`fuse-item` extends the existing trade command namespace with match ID, Guardian ID, unique request ID, target definition ID and explicit component instance IDs. Only Flame Blade has a live recipe. Simulation snapshots the component array when queued, processes trades before the dead-Guardian movement gate, and uses the existing shared request replay protection and ledger transaction key.

At execution, the transaction checks current session/ownership, active match, supported recipe/effects, living240-unit Keep-footprint range and LOS (dead bypass), exact current component ownership/count, valid paid basis, current funds and post-consumption capacity. The immutable planner constructs one output and charges Gold together with component removal through the existing atomic ledger commit. Missing ingredients are virtual costs, never temporary inventory instances. Rejections leave inventory, sequence, stats and Gold unchanged. Stat refresh runs once after an accepted commit.

| Explicit selected components | Gold due now | Paid basis at original prices | Resale |
|---|---:|---:|---:|
| None |650|650|390|
| Sword |450|650|390|
| Gem |500|650|390|
| Sword + Gem |300|650|390|

Paid basis is the selected instances' actual recorded acquisition cost plus newly charged Gold. A discounted100-Gold Sword fixture produces a550-Gold basis and330 refund; it does not silently acquire a650 basis. Invalid nonpositive or non-refund-compatible component bases reject. Refund remains60%, preserving exact ledger units. Full inventory permits Fusion only if selected components free sufficient capacity; no-component full inventory rejects. Exact duplicate selection never silently consumes another Sword/Gem.

## Mobile Shop flow

The existing four-page catalog now includes Flame Blade's real effects,650 total value and a Details action. Details opens a compact recipe view with current Gold, selected Sword/Gem slot numbers, missing ingredient costs,300 fee, authoritative due-now cost and Buy/Combine availability. Components default to **none**; owning an item never selects it automatically.

Each component opens the existing six-slot pattern in a separate picker. Only eligible owned instances are interactive; their exact slot number identifies duplicates. Selecting a slot returns to the quote. **Use none** explicitly removes that component selection, and Back retains it. Invalidated selections disable the action until reselected; no stale automatic substitution occurs.

Buy/Combine sends one request while pending, reports success only after matching `item-traded`, and displays authoritative rejection reasons. Equipment shows the Blade's concise effects and paid-basis refund; sale still requires confirmation. To preserve readability, effects remain on the catalog/Equipment pages while the recipe page prioritizes exact components and cost. There is no simultaneous all-information sheet or new permanent HUD control.

Shop bounds,48 CSS px targets, teal/gold materials, utilities, combat controls and joystick are unchanged. Existing quarter-speed/mode restoration, exclusive Build/Shop/Skills panels, pointer release, Pause/background/portrait/results/shutdown cleanup and Restart behavior remain in place. Danger notifications and world-attached Keep HP retain their clearance.

## Verification and review

**295 headless tests passed**, including20 new live Flame/Fusion checks and20 existing Burn foundation checks. **24 focused browser checks passed.** Production TypeScript/Vite build and `git diff --check` passed; the build retains its existing large-bundle advisory.

Focused headless checks cover all four pricing paths, actual paid-basis refund, duplicates, six-slot post-consumption capacity, stale/invalid selections, wrong owner/session, replay/double taps, competing commands, queued-array snapshots, insufficient funds, range/LOS, dead trade/respawn retention, injured/zero HP, no double-counted modifiers, single refresh, Crit+Burn, absorbed/lethal/structural exclusions, landed source death/rewards, duplicate Burn refresh, Pause/Restart/results and30/60 FPS replay. Existing Burn, Ruby, artifact, transaction, Shop, Guardian, progression, simulation/match and Phase2D feedback regressions also run.

```text
npm test -- flame-fusion.cjs burn.cjs critical-hits.cjs artifacts.cjs artifact-transactions.cjs shop.cjs guardian-skills.cjs progression.cjs simulation.cjs match.cjs damage-feedback.cjs defense-feedback.cjs context-guidance.cjs notice-slot.cjs
node scripts/verify-flame-fusion.mjs
npm run build
git diff --check
```

The focused browser check passes24 checks, including live purchase/Fusion/sale, second duplicate selection,650/450/300 UI pricing, pending double tap, confirmed refund, no-component Buy, mode/Pause behavior, text/action separation,48px targets,844×390/960×540/safe-area bounds, and defense-notice/Keep HP clearance. Supplemental Gold comes through the existing reward ledger in a labeled browser fixture, without changing live income or balance.

One representative [844×390 recipe screenshot](phase3db2/flame-fusion-844x390.png) shows explicit second-Sword/Gem selection and300-Gold Combine. Raw logs and build output remain local and ignored. No broader browser suite or asset collection.

Changed implementation paths: `data/artifacts.ts`; `simulation/ArtifactQuotes.ts`, `ArtifactTransactions.ts`, `BurnEffects.ts` (caller comment only), `CriticalHits.ts`, `GameState.ts`, `Simulation.ts`; `ui/ShopPanel.ts`, `shopModel.ts`. Tests: new `flame-fusion.cjs` and updates to four earlier artifact/Burn/crit tests whose disabled-Flame assertions are superseded. Review aids: focused browser script, this report, Phase3 design status and the one screenshot.

Actual working-tree scope: **18 files** — nine source files, five test files, one focused browser script, two documents and one screenshot. Generated test logs/build output are ignored and excluded from the commit.

No blocking design decisions remain for B2. The compact page separation is the intentional readability compromise for844×390; technical report and manual visual review have passed. Arcane Core, Crown, Banner, Hammer, other recipes, Campaign and Free Play remain disabled/out of scope. Economy rates, rewards, skills, base stats, AI and waves are unchanged.
