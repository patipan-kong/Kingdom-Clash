# Azure Barracks V1.0: frame brief (6 images)

Input (do not edit it): `../ref/barracks-template.png` (1024x1024, transparent). It is the approved Azure Barracks painting at a fixed scale, seen from a three-quarter high angle: a timber-framed hall with a steep blue shingle gable roof on a dark grey stone base. A tall flag on a pole stands at the back right. The front right has stone steps rising to a dark doorway flanked by two lit wall torches and hanging blue banners with a gold eagle. A white-and-blue canvas awning on the left covers a spear rack and two round blue shields with a gold eagle. Blue banner poles stand at the far left and far right. A straw training dummy with a target and a small iron fire brazier stand in front of the steps. The lowest row of the picture (the brazier's feet) is on y=940.

## Rules for every image

1. **One generation per image.**
   - Use the built-in image tool, editing `../ref/barracks-template.png`, with a genuinely transparent background (`transparent_background: true`). Keep the tool's alpha.
   - Never use a white, coloured or chroma-key backdrop.
   - Never apply background removal, chroma key, matting, alpha repair or any script to the pixels.
   - Save each output exactly as returned, under the file name given.
2. **Keep the canvas and the scale.** Keep the output canvas 1024x1024. Keep the building at EXACTLY the template's size and position: never rescale, recentre or crop. The stone base, steps, brazier and training dummy stay at the template's exact positions, and the lowest row stays on y=940 (except where a frame says otherwise).
3. **Match the template.** Use the same painted, soft-shaded style, dark outline, warm wood, grey stone and blue-and-gold palette, top-left lighting and camera as the template.
4. **Nothing extra.** No ground patch, ground shadow, dust cloud, smoke, fire, glow outside the building, motion lines, sparks, text, border or backdrop. Only the building, its fittings and its debris.
5. **Stay inside the template's silhouette.** No frame may reach beyond the template's outline (left 128, right 896, top 196 on the 1024 canvas).

## Run A

### `01-recruiting.png`: Recruiting (doorway open)
The identical building, with the doorway at the top of the front steps now open: the door leaves swing open inward and a warm orange-yellow light spills from the interior onto the top steps and the door frame, as if soldiers are being mustered. Nothing else changes: the roof, banners, torches, awning, shields, steps, dummy, brazier and flag are exactly as in the template. The light stays inside the doorway and on the steps nearest to it.

### `02-damaged.png`: Damaged
The same building, same outline, same positions. Add light battle damage only on the surfaces:
- three or four patches of missing roof shingles, exposing dark timber boards;
- a few scorch marks near the eaves and the door frame;
- the tip of the big flag torn and ragged, and one of the hanging banners frayed at its bottom edge;
- two arrows stuck in the front wall and one in the roof, shafts angled toward the viewer;
- a few cracked and chipped stones in the base.
The silhouette must stay almost identical to the template.

### `03-badly-damaged.png`: Badly damaged
The same building, same size, position and base, with heavy damage:
- a large hole in the roof near the ridge with broken rafters showing, and many more missing shingles;
- the flag torn to a short ragged strip, and the hanging banners shredded;
- several wall boards broken, exposing the timber frame, and heavy black scorching on the front wall and roof;
- the awning torn and sagging, one shield cracked;
- five or six arrows stuck in the building;
- large cracks and missing stones in the base, the steps chipped.
The outline changes only at the roof hole and the flag. The base, steps, dummy and brazier stay where they are.

## Run B

### `04-collapse-1.png`: Collapse 1 (roof buckles)
The building at the moment it begins to fall, standing on the same base: the ridge sags in the middle and the two roof planes drop inward, so the building is about 12% lower; the walls bulge outward with snapping timbers; the flag pole leans; torn banners are falling. The stone base, steps, brazier and dummy stay exactly as in the template. It is still recognisably the same building.

### `05-collapse-2.png`: Collapse 2 (walls falling)
Mostly fallen: the walls have burst outward and the roof planes lie broken across the top of a heap of blue shingle slabs, snapped timbers and stones, about 45% of the template's height. A few timber uprights still stand at the back. The flag lies across the heap. The base stones at the front, the brazier and the dummy remain. No dust.

### `06-rubble.png`: Rubble
The building fallen: a low heap of stone blocks, broken timbers and blue shingle fragments, with some blue banner cloth lying on it, no taller than about one quarter of the template's height and no wider than the template's footprint (left 128 to right 896). Two or three short broken posts still stand in the heap, and the training dummy lies toppled in front. The heap's lowest row rests on y=940. No dust, no ground patch, no fire.
