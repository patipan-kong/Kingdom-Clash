# Chapter 5 Phase 1B: Tavern and Allied Hero recruitment

**Finalization (PO cleanup):** hiring and Revive now cost Gold only (Roland 150, Borin 180, Kael 200; Revive 45% rounded up = 68 / 81 / 90). The Tavern still costs 100 Wood + 10 Iron. Gold income is 25 per Crimson kill (10 from wave 13), the start is 250, shop items cost 150 to 650 and Guardian upgrades cost no Gold (skill points), so a hero costs about one early shop item. The Army Soon button and its `hud-army.png` are removed from every chapter; Build and Shop keep their positions. Asset needs: `CHAPTER5_ASSET_READINESS.md`. The sections below describe the original Wood/Iron prices where they differ; the Gold values above win.

Status: implemented in the worktree, uncommitted, not pushed or deployed (`G:/work/ark/arkhero-c5-probe`, base `main` `83d87df`). No M1 mission, no random roster, no new hero classes, War Cart or Ballista changes. Chapters 1-4 are untouched: no setup carries a Tavern.

## Files

New: `src/data/mercenaries.ts` (roster, prices, revive rule), `src/data/tavernTest.ts` (dev-only `?debug=1&level=N&tavernTest=1|2|3`, the value is the hero cap), `src/ui/tavernLayout.ts`, `src/ui/TavernPanel.ts`, `tests/tavern.cjs` (12), `tests/tavern-layout.cjs` (3), `scripts/verify-tavern.mjs`.

Changed: `buildings.ts` (`tavern`), `matchSetup.ts` (`MatchTavern`: cap 1-3, roster of 1-3 ids), `GameState.ts` (`Unit.tavern`, `Unit.ally.merc`, `GameState.tavern.slots`, `tavern` command and event), `Economy.ts` (`hire`/`revive` price ops, Wood and Iron only), `Simulation.ts` (placement, hire, revive, dismiss, fall hook), `BuildPanel.ts` (Tavern card only when the setup has one), `HUD.ts` (panel wiring, notices), `Battle.ts` (Tavern visual, tap opens the panel, dev launch).

## Economy and lifecycle rules

- **Build:** the ordinary Build command, `tavern` kind, 100 Wood + 10 Iron, 150 ticks, one at a time, in controlled territory. A wall-kind structure, so it is attacked and destroyed by the existing rules.
- **Hire:** needs a finished Tavern. Roland (Balanced) 110W 16I, Borin (Tank, HP x1.4, ATK x0.8) 140W 24I, Kael (Berserker, HP x0.8, ATK x1.3) 120W 20I. Wood and Iron only; Gold and Guardian upgrades are never touched. Each mercenary is hired once; refused at the cap, when unaffordable, or with no free cell beside the Tavern.
- **Cap:** `MatchTavern.cap` (M1 will use 1). A fallen hero keeps its slot.
- **Fall:** the hero leaves the field, its slot becomes `dead`.
- **Revive:** manual, from the Tavern panel. 45% of the hire price (rounded up), paid once when ordered; the hero returns beside the Tavern after exactly 900 ticks (30 s) at full HP on Follow, same slot. The countdown runs only while a finished Tavern stands.
- **Dismiss:** frees the slot (alive, dead or returning). No refund. The panel needs a second tap ("Sure?").
- **Tavern destroyed:** hiring and reviving are refused; a revive in progress waits (no loss) and resumes when a new Tavern is finished. Slots stay occupied until dismissed.
- **Access:** tap the finished Tavern. Orders work while the Guardian is down.
- **Ch1-4:** `setup.tavern` absent, so no state, no Build card, `place` and `tavern` commands are refused.

## Results

- `tavern.cjs` 12/12, `tavern-layout.cjs` 3/3; full suite 1224/1224 (1209 + 15); tsc and production build pass.
- `verify-tavern.mjs` (real touch, 780x360 DPR3 + 780x250): all pass, repeated runs. Covers Ch1/4/6 with no Tavern, the Build card, placement, charge, panel, hire, cap refusal, all three commands on a hired hero, fall, revive charge once, timer, dismiss arm/confirm, 30 s return, destroyed Tavern.
- Browser regressions: verify-hero-hud, verify-mobile-landscape, verify-crimson-fortress pass. The 13 Allied Hero probe tests and the 29 Phase 1A tests are included in the suite.
- Stills: `scratchpad/c5/tavern/` (780x360-1..9, 780x250-panel).

## Remaining risks

1. All numbers (prices, stat multipliers, Tavern cost) are provisional, untested in a real mission economy (income is 2 Wood and 0.25 Iron per second, so 16 Iron is about 64 s).
2. Placeholder art: the Tavern reuses the Azure Barracks sprite, heroes use the Guardian sprite.
3. Build tray with four cards (Barracks and Tavern together) wraps "Barracks" onto two lines; fine only on maps with both.
4. Tavern is reached by tapping it, with no distance rule and no HUD button; players need the "Tavern ready" notice.
5. A Revive waiting for room beside the Tavern retries every tick; heroes could be blocked if the ring is full.
6. Screenshots between taps swallow the next touch in the Playwright harness only (not seen on device).
7. No S24 device check of the Tavern yet.

## Recommendation

GO for M1 layout and objectives, with the numbers in risk 1 to be tuned in the first M1 playtest.

## Art integration (PO approved)

The Tavern and the three mercenaries now use painted sprites (`tavern.png`, `hero-roland.png`, `hero-borin.png`, `hero-kael.png`) cut from the Chapter 5 concept sheet. `mercenaryTexture(id)` maps a hired hero to its sprite (an Allied Hero with no mercenary identity keeps the Guardian sprite); the Hero Bar portrait uses the same texture. Allied Hero sprites are width-capped at 1.6x the hero's width so Borin's hammer does not make him tower. No stats, prices, hitboxes or Chapter 1-4 assets changed. Limits: the hero cut-outs are upscaled about 1.8x from the sheet, so they are softer than the Guardian; the Tavern has a small grey wedge beside its right lantern. Request native-resolution source art for a final pass.
