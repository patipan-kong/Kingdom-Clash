# Chapter 4 Mission 3 "River & Island" (campaign-33): implementation notes

Spec: `docs/CHAPTER4_M3_DESIGN.md` (all five PO decisions approved). Built on the M2 checkpoint `95c1d85`. Not committed. Every balance value is provisional until the human playtest.

Playtest: `npm run dev` then `http://127.0.0.1:<port>/?debug=1&level=33` (or `?debug=1&chapter=4&mission=3`). Chapter 4 is still "coming soon" in the menus; only the dev launch reaches it.

## What changed
- `src/world/battlefield.ts`: battlefield `river-island` (six water barriers, Gatehouse site, Barracks site, four towers, island build circle). Meadow's third opening Vanguard moves from (1100,560) to (1056,560): the old spot is inside the Gatehouse's footprint, where Crimson could never reach it and every wave would stand still.
- `src/world/battlefieldArt.ts`, `src/scenes/Battle.ts`: art entry for it, using the Oasis water painter (clipped to the world, no shore stones on the map border) and a painted South Bridge causeway; the Gatehouse is drawn with the M2 gate sprite and labelled "Gatehouse". Presentation only.
- `src/data/campaignLevels.ts`: `riverIslandLevel` (campaign-33), all values from the design.
- `src/data/matchSetup.ts`, `src/simulation/Simulation.ts`, `src/scenes/HUD.ts`: one optional `MatchPost.firstNotice` (the first-capture text), and one placement rule: an Azure Barracks pad inside the post's build circle is closed until the camp is Azure ("Capture the Island Camp first"). No effect on M1/M2 (their pads are at home).
- Tests: `tests/campaign-level-33.cjs` (13 checks); allow-lists in six existing tests now know campaign-33. `scripts/verify-river-island.mjs` (browser, 15 checks); stills in `docs/screenshots/river-island/`.

Unchanged: Soldier AI, Navigation, Geometry, the anchor-snap quirk, M1/M2 gameplay and balance.

## Findings
- With the Gatehouse down, Crimson units still use the South Bridge: it is the shorter line from the Barracks slots to the Azure Keep. The short road is shorter for Azure only. Breaking the gate does not relieve the island; only destroying the Barracks stops the waves.
- Bot playthroughs (scratch bot, information only): Gate Assault, South Assault and Barracks-first all win in 229-280 s with the Keep untouched; the no-build Gate Assault loses (the Azure Keep falls at 288 s). M2's bot: 251 s.
- Browser runs use a large Azure Keep HP, never `invulnerable` (an invulnerable Azure Keep leaves Crimson no route).

## Known limitations
1. Destroying the Crimson Barracks before capturing the camp stops all waves (PO decision 1).
2. Azure Barracks soldiers now help against the Gatehouse (see the fix below); on the bridge they still straggle behind the Guardian (existing AI).
3. Latent anchor-snap bug unchanged and out of scope.
4. The bridge is a painted causeway on grass, not a bridge model. At collision radius 28 the bridge exit is plugged by the Barracks; no unit is that large (largest radius 20).

## Soldier support fix (after human playtests 1 and 2)
Cause (diagnosed first): the Gatehouse was never a soldier target, and the four Crimson towers sit on cell edges, so a soldier (reach 48 px to the tower's centre, 36 px of the tower blocked) has no cell to strike them from. Navigation returned an infinite cost, the unreachable tower stayed the nearest target, and the soldier stood still (also after the gate fell).

Fix, M3 only, behind an opt-in `assist: true` on the gate's level data (`MatchGate.assist`, read when the first soldier is spawned: `SoldierProto.assist`):
- `src/simulation/Movement.ts`: with `assist`, a soldier's visible targets include the red gate the Guardian is attacking (`hero.targetId`), preferred over everything else; and a tower with no attack cell is not a visible target.
- `src/simulation/SoldierProto.ts`: `hasAttackCell` (cached per tower, static terrain only).
- `src/data/matchSetup.ts`, `src/simulation/Simulation.ts`, `src/data/campaignLevels.ts`: the flag, its pass-through and M3's gate setting it.
Not changed: pathfinding costs, the soldier anchor, tower coordinates, balance, any other level (the flag is absent there; test C covers Cliff Pass and M3 without the flag).

Before / after (simulation, Guardian attacking the intact Gatehouse): soldiers idle about 100-120 px behind it, gate falls at about 45 s; after: both walk to the gate within 5 s and attack, it falls at about 33 s, then they follow the Guardian through the neck. South Assault with soldiers: before, they sat at the island and later froze at the west bank (anchor quirk); after, they cross the bridge with the Guardian and reach the Keep.

Remaining: soldiers still cannot attack the Gatehouse and island towers (data left as approved); with the Guardian idle on the island, soldiers now advance to their 400 px tether instead of standing still, so they can meet a wave on the bridge approach; the anchor-snap bug is still latent.
