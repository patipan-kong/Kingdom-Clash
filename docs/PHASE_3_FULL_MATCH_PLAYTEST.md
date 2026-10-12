# Phase 3 — Full match playtest checklist and log

Baseline: `b0dcf4ca4a82cf8f83e50e6f4e3e536b07b84fd3`. Phase3 scope closed with seven playable artifacts; Arcane Core deliberately deferred. This is manual playtest preparation, not completed human-match results or balance approval.

## Run a natural match

- [ ] Start a fresh **Extended Encounter** (normal browser default; `?encounter=extended` makes it explicit). Restart between runs: LV1, initial skill point,250 Gold and empty six-slot equipment. Avoid `?encounter=prototype`, developer funds, teleports or forced outcomes for pacing observations.
- [ ] Use844×390 and/or a real landscape phone; optionally repeat960×540. Record device/browser/viewport and input type. Play naturally to Victory or Defeat. Record wall elapsed time separately from the results-panel simulation time, which excludes Pause and advances slowly during Shop/Build.
- [ ] Watch wave progression, Crimson Tower destruction and pressure on both Keeps. Is “Destroy Crimson Keep” clear? Can you distinguish “Enemies near Azure Keep” from “Azure Keep under attack,” including when away from Azure?
- [ ] Move with the left joystick; enable basic Attack; learn and use Bash, Taunt, Charge and Protect (the four skills internally bound to Q/W/E/R, without visible keyboard badges). Check tap, drag aim/cancel, simultaneous movement/aim, cooldown feedback and Pause/resume during action.
- [ ] Observe damage attribution, Guardian survivability, useful/ineffective skill moments, Crit and Burn feedback. Record concrete events before suggesting balance changes. Active Guardian skills target units, not structures; use Attack on Towers/Keeps.

## Economy, equipment and defenses

- [ ] Note starting250 Gold. Record the first purchase time and why it mattered; Sword200 and Ruby150 are already affordable initially. Record when later choices become affordable, not just when you choose to buy.
- [ ] Across repeated natural matches try different paths: Sword/Shield survival; Sword+Ruby toward Flame Fusion; Crown/defenses; Hammer/structures; Banner/allied support. Do not require every product in one match or grind a stalled match solely to complete the list.
- [ ] Browse Shop away from Azure; verify trading is unavailable there. Trade near the allied Keep (living:240 world units from its footprint plus LOS) and while dead (distance bypass). Confirm dead trading does not revive you, and inventory survives respawn.
- [ ] Inspect Equipment and exact instances; sell with confirmation and buy again when tactically useful. Record purchase spending and sale refunds separately. Check whether six automatically equipped slots suffice; no backpack/manual unequip is intended.
- [ ] If naturally affordable, explicitly select Sword/Ruby instances for Flame Blade Fusion. Due-now paths are650 with neither,450 with Sword,500 with Ruby,300 with both. Note paid components and the displayed quote; do not count the same component cost twice in spending. Observe Burn5 magic damage/s for3s and refreshed duration, without assuming it damages structures.
- [ ] Compare Hammer's practical structure contribution, Banner's usefulness beside engaging allied minions, and Crown's defense value. Crown costs450; equipped costs are Wall23 Wood, Tower74 Wood+10 Iron. Note whether enemy pressure makes construction worthwhile, whether placement is understood, and what was lost/completed.
- [ ] During combat look for unreadable messages, missed taps, overlaps, accidental movement from panels and gesture-edge problems. Test Shop/Equipment/Close, Build, Upgrade skills and Pause transitions. Keep the24px bottom reserve clear; prioritize touch usability over cosmetic differences. Army remains Soon; Arcane Core should not appear.

## Where measurements come from

| Metric | Obtain it / limitation |
|---|---|
| Outcome, cause, simulation duration, enemies defeated, final Keep HP | Read the existing results panel before Restart. Time is floored to whole seconds; Keep HP display rounds up. Simultaneous Keep destruction is Defeat. No new telemetry required |
| Wall elapsed duration | Manual stopwatch; note pauses/menu time separately. Do not equate it with simulation duration |
| Guardian level | Guardian top HUD; note late-match level before results. Results panel does not include level |
| Remaining Gold | Top resource HUD or Shop while playing; note before results. Results panel does not show Gold. Simulation result state stores Gold but is not a player-facing export |
| Gold earned/spent/refunded | No cumulative player-facing totals/history. Manually log purchases/Fusion due-now charges and sale refunds while playing; mark unknown if missed. Earned may be derived as `remaining − 250 + spent − refunds` only with a complete record, labeled derived; otherwise unavailable. Resource display floors Gold |
| Artifacts, exact sale refund, Fusion | Shop/Equipment slots, descriptions, quote and confirmed messages during play. Manually record sequence before results close the panel; no persistent match history |
| Structures built/destroyed and notable hits | Manual observations; distinguish own builds, construction completion/loss, hostile Towers and Keeps. No cumulative construction/destruction summary |
| First affordability/purchase time, friction, fun | Manual observation using simulation clock or stopwatch (state which). Wave/time area can show threat status; result time remains available |

Known limits: menus continue combat at0.25 speed (Skills continues normally); Pause/background/portrait freezes. Keep pressure can continue off-camera while browsing. Core's CDR/power cannot be exercised in an ordinary match. Shield and skill gates may require saving Gold/XP; a short defeat may not expose every effect. This checklist is not proof that all purchase paths fit current income. Use repeated matches and report untested cases honestly. Do not add instrumentation or rebalance from one run.

## Reusable log — copy once per match

```text
Match # / date:
Baseline / device / browser / viewport / touch or mouse:
Purchase-path intent:
Duration: results simulation mm:ss ___ ; wall elapsed ___ ; pauses/menu notes ___
Outcome / cause:
Guardian final observed level (or unavailable):
Gold: start250 ; earned ___ [manual/derived/unavailable] ; spent ___ ; sale refunds ___ ; remaining ___
Purchase/Fusion sequence (time basis: simulation/wall):
  Time | item/action | Gold charged/refunded | selected Fusion components
First meaningful artifact / first affordability time / purchase time:
Final equipment (or last observed):
Structures: own built/completed/lost ___ ; hostile Towers/Keep destroyed ___ [manual]
Azure Keep final HP ___ /3000 ; Crimson Keep final HP ___ /3000 [results display]
Notable combat events (including skills, Crit/Burn, Hammer/Banner/Crown):
Observations — what happened, when, reproducible steps:
Friction/confusing interactions — control/message/context:
Hypotheses — possible causes; label uncertainty, do not treat as measurements:
Fun factor1–5 / brief reason:
One proposed improvement (hypothesis, not approved change):
Untested cases / missing measurements:
```

## Readiness verification

12 October2026: **198 existing checks passed**:193 focused artifact/Core-unavailability, Shop/equipment/pending/mode, Fusion, Crown/Build, Guardian and simulation tests; five selected Extended Encounter checks confirm full-HP initial defenders, controlled Victory/Defeat with frozen spawn queues, ordinary Attack destruction of an exposed Crimson Keep, threat predicates and confirmed Azure damage. Production TypeScript/Vite build passed with the existing large-chunk advisory. Whitespace checks passed. No source changes, new tests, browser suites, screenshots or telemetry. Headless controlled terminal checks establish reachability, not a claim about a natural human victory or economy pacing.

```text
npm test -- artifacts.cjs arcane-core.cjs shop.cjs flame-fusion.cjs builders-crown.cjs guardian-skills.cjs simulation.cjs
node --test --test-name-pattern="extended defenders|no spawns occur after Victory|enemy base is destructible|Azure Keep threat flag|allied base hits" tests/encounter.cjs
npm run build
git diff --check
```

The npm test command prepares the existing `.test-build` modules before the selected encounter checks. Logs/transpiled modules/build output remain ignored locally. Seven supported catalog products and disabled Core are covered by existing availability assertions; the live Shop product list remains the same seven. The production JS/CSS bundle hashes match the preceding C4-A build. No full human match or new live-device check has been performed in this documentation task.
