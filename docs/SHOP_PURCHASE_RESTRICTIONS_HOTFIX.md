# Shop purchase restriction clarity

Baseline: `dc1fa7f5e66e2da69aa725ab7277ad78b9f846d5`.

## Confirmed cause and correction

`Simulation.shopPurchaseQuote` correctly rejected distant living Guardians with
`Return to Azure Keep`. `ShopPanel` translated this to generic `Locked` and
repeated the imperative in the footer. No trading-rule defect was found.

Presentation now maps authoritative reasons to **Too Far**, **Need Gold**,
**Full**, or **Need Items** for an invalid/stale selected Fusion component.
Allowed ordinary purchases show **Buy**. Pending, Details, Combine, sale refunds
and explicit sale confirmation remain intact. Disabled sale actions also show
Too Far rather than suggesting a return-to-base command.

The simulation's existing priority is retained: encounter/Pause/match access
(including range and LOS), product support, post-consumption capacity, then
affordability. Pending UI requests take priority over action labels. No second
eligibility calculation was introduced.

The non-interactive footer says **Move near Azure Keep to buy equipment** only
while current authoritative access is restricted. Old range-rejection feedback
cannot keep this guidance visible after access returns. The same guidance is
used in Fusion's existing detail area. Every HUD frame still reads live quotes;
there is no close/reopen requirement.

Missing unselected Fusion ingredients are intentionally bought within the
authoritative quoted price. They do **not** require ownership. Need Items applies
when an explicitly selected instance is no longer valid; selecting a valid
instance restores the existing action and cost.

## Verification

- 56 focused headless checks: Shop, artifact transactions and Flame Fusion.
- 45 focused Shop browser checks in Chrome: range transitions, death/respawn,
  Gold and inventory updates, stale/valid Fusion selection, real purchase,
  confirmed sale and Fusion, pending double taps, lifecycle, danger notices and
  Keep HP clearance.
- 844×390, 960×540 and asymmetric safe-area checks preserve panel bounds,
  separate 48px targets and readable range guidance.
- TypeScript and production build pass; existing large-bundle advisory remains.
- `git diff --check` passes. Raw logs/JSON stay under ignored `test-results`;
  no screenshots or generated evidence are committed.

One intermediate browser run failed its existing B1 notice check after an added
range fixture exposed the Guardian to enemy towers. The fixture was moved to a
safe out-of-range position; the final run passes without changing danger logic.

No simulation, balance, prices, ranges, LOS, dead trading, Fusion costs, geometry,
timeScale, artwork or return-to-base action changed. Physical-device and exact
simulator-extension testing were not performed.
