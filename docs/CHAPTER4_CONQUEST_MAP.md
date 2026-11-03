# Chapter 4 Conquest Map (mission select)

Chapter 4's mission screen is one painted campaign map with a marker per mission. It replaces the card grid for Chapter 4 only; Chapters 1–3 keep their cards. PO approved the V2 visuals on 2026-11-03.

## What the player sees
- One illustrated background, a small marker for each of the six missions, thin roads that follow the tracks painted in the art, and plain names with a dark halo.
- Two steps: tap a marker to select it, then press BRIEFING (REPLAY for a conquered mission). A locked mission can be selected to read its status, and its button reads LOCKED and opens nothing.
- Marker states, from the same selection model as the card grid:
  - conquered: teal check and an Azure flag, on a solid Azure road;
  - next: gold with a soft pulse and a PLAY tag, on a dashed gold road;
  - any other open mission (every one with `?unlock=all`): gold, no pulse;
  - locked: dark with a padlock and a Crimson flag, on a faint dotted road.
- The selected marker gets a thin blue ring and a gold name; the bottom panel shows its status and name.
- Once Mission 6 is **conquered** the Crimson Fortress on the map becomes Azure. This only reads the existing completion state; nothing new is saved, and `?unlock=all` does not conquer anything.

## Files
| File | Role |
|---|---|
| `src/ui/conquestMap.ts` | Pure layout: six stops and five roads as data in background pixels, road smoothing, dashes, tap areas, name boxes, styles. |
| `src/ui/conquestMapView.ts` | Phaser drawing and input with existing Graphics, Text, Image and tweens. No new dependency. |
| `src/scenes/CampaignSelect.ts` | Branches to the map when the chapter is `conquered-lands`; everything else is the old code. The map reuses `campaignSelection()`, the unlock check and `openBriefing`. |
| `public/assets/conquest-map.webp` | The painted background (1672×941, 364 KB). |
| `public/assets/conquest-map-azure-keep.webp` | The small Azure Fortress overlay (382×380 with a feathered edge, 39 KB). |
| `scripts/build-conquest-assets.mjs` | Regenerates both files from the source PNG (encoding in Chrome's canvas, no dependency). |

Both WebP files load only when the Chapter 4 map opens (checked in the browser script). The background is OpenAI-generated and was approved for use by the PO, subject to applicable terms.

## Interaction and sizes
- Each marker takes taps in a square of at least 44 CSS px (the marker itself is 22 px), and its name is tappable too. CHAPTERS and BRIEFING are at least 44 px tall.
- Names lift to at least 12 CSS px on phones, as the other menus do. Checked at 960×540, 844×390, 740×270 and 568×320.
- Returning from a Briefing restores the selected marker.

## Unchanged
Mission data, gameplay, balance, achievements, the save format, progression and unlock logic, Chapters 1–3, and the Production gating: Chapter 4 is still a Coming Soon card without `?unlock=all` in a dev or Preview build.

## Verification
- `tsc` clean, production build green.
- Full suite **1180/1180** (7 new layout tests in `tests/conquest-map.cjs`).
- `scripts/verify-conquest-map.mjs`: 74 browser checks, run three times in a row. They cover all six mission states, two-step navigation, locked missions refusing, selection restored from the Briefing, the Azure Fortress absent at 5 of 6 and present at 6 of 6, the save untouched, `?unlock=all`, Chapter 4 still Coming Soon in normal mode, Chapters 1–3 unchanged, the lazy art loading, and four screen sizes with real mouse taps and one finger tap (names inside the screen, no overlaps, tap areas, bottom-panel text).
- Existing checks still pass: `verify-unlock-override` (updated for the two-step tap; includes the Production bundle), `verify-achievements-focused` 44/44, `verify-victory-navigation` 27/27, `verify-mobile-landscape` 62/62, `verify-crimson-fortress` 27/27.
- The six legacy menu scripts that already failed on `main` were not touched.

## Known limitations
- The map is an illustrated route, not the six battlefields in geography.
- The Azure Fortress overlay is a recoloured crop of the same painting, so the sky behind the castle also turns cool. A hand-painted Azure fortress would look better and can replace the overlay file without code changes.
- The painting is 364 KB. A smaller export would load faster on slow connections.
- Needs a real-device playtest on mobile landscape before release.
