# Azure Tavern V1.0: frame brief (7 images)

Input (do not edit it): `../ref/tavern-template.png` (1024x1024, transparent). It is the approved Azure Tavern painting at a fixed scale, seen from a three-quarter high angle: a two-storey timber-and-stone inn with a blue shingle roof, a tall stone chimney, a big hanging beer-mug signboard on the left (on a wooden bracket), warm lit windows, a blue-and-white striped awning over a lit ground-floor window, a blue banner with a gold lion in the middle, an arched wooden door with two stone steps at the front right, a hanging lantern beside the door and another under the awning, two barrels, a wooden bench and a stool at the front left, all on a small square plinth of grass with dirt edges. The lowest row of the picture (the plinth bottom corner) is on y=940.

## Rules for every image

1. **One generation per image.**
   - Use the built-in image tool, editing `../ref/tavern-template.png`, with a genuinely transparent background (`transparent_background: true`). Keep the tool alpha.
   - Never use a white, coloured or chroma-key backdrop.
   - Never apply background removal, chroma key, matting, alpha repair or any script to the pixels.
   - Save each output exactly as returned, under the file name given.
2. **Keep the canvas and the scale.** Keep the output canvas 1024x1024. Keep the building at EXACTLY the template size and position: never rescale, recentre or crop. The grass plinth, barrels, bench, stool and steps stay at the template exact positions, and the lowest row stays on y=940 (except where a frame says otherwise).
3. **Match the template.** Same painted, soft-shaded pixel-art style, dark outline, warm wood, stone, blue-and-gold palette, top-left lighting and camera as the template.
4. **Nothing extra.** No ground shadow, dust cloud, smoke, fire, glow outside the building, motion lines, sparks, particles, text, border or backdrop. Only the building, its fittings and its debris.
5. **Stay inside the template silhouette.** No frame may reach beyond the template outline (left 128, right 896, top 198 on the 1024 canvas).
6. **Identity.** Every frame must read at a glance as the same inn: same roof shape, chimney, signboard position, awning, banner and plinth.

## Run A

### `01-hire.png`: Hire (door open, warm light)
The identical building, with the arched front door swung wide open inward: the door leaves open to show a bright warm orange-yellow lit interior, and a warm pool of light spills out over the two stone steps. Nothing else changes: roof, chimney, sign, awning, banner, lanterns, windows, barrels, bench and plinth are exactly as in the template. The light stays on the doorway and the steps.

### `02-revive.png`: Revive complete (bell and golden glow)
The identical building with the door CLOSED (as in the template, so it is clearly different from the hire frame). A small brass bell now hangs from the wooden beam above the door, and the inn glows: every window, both lanterns and the lion on the banner are lit to a brighter golden-white, with a soft golden halo hugging the window frames and the banner, as if the inn is celebrating. The glow stays on the building own surfaces. Nothing else changes.

### `03-damaged.png`: Damaged
The same building, same outline, same positions. Add light battle damage only on the surfaces:
- three or four patches of missing roof shingles, exposing dark timber boards;
- a few scorch marks near the eaves and the chimney;
- one window pane cracked and dim, the awning torn at its fringe and the banner frayed at the bottom;
- the signboard slightly chipped, two arrows stuck in the front wall and one in the roof;
- a few cracked stones in the chimney and the steps.
The silhouette stays almost identical to the template; windows stay lit.

### `04-badly-damaged.png`: Badly damaged
The same building, same size, position and plinth, with heavy damage:
- a large hole in the roof near the ridge with broken rafters showing, and many more missing shingles; the chimney cracked with missing stones;
- the signboard hanging crooked from one broken chain, cracked;
- several wall boards broken, exposing the timber frame, and heavy black scorching on the front wall and roof;
- the awning torn and sagging, the banner shredded, the lanterns dark and one window dark;
- five or six arrows stuck in the building;
- one barrel split, the bench broken.
The outline changes only at the roof hole, the chimney and the sign. The plinth, steps, barrels and bench stay where they are.

## Run B

### `05-collapse-1.png`: Collapse 1 (roof buckles)
The inn at the moment it begins to fall, on the same plinth: the roof ridge sags in the middle and the two roof planes drop inward, so the building is about 12% lower; the walls bulge outward with snapping timbers; the chimney leans; the signboard falls askew; the banner and awning are torn. The plinth, barrels, bench and stool stay exactly as in the template. It is still recognisably the same inn.

### `06-collapse-2.png`: Collapse 2 (walls falling)
Mostly fallen: the walls have burst outward and the roof planes lie broken across the top of a heap of blue shingle slabs, snapped timbers and stone blocks, about 45% of the template height. A few timber uprights and part of the chimney still stand at the back. The beer-mug signboard lies on the heap. The plinth, barrels and bench remain. No dust.

### `07-rubble.png`: Rubble
The inn fallen: a low heap of stone blocks, broken timbers and blue shingle fragments, with some blue banner cloth and the striped awning lying on it, no taller than about one quarter of the template height and no wider than the template footprint (left 128 to right 896). Two or three short broken posts still stand in the heap and the beer-mug signboard lies face-up on it. The heap lowest row rests on y=940. No dust, no fire.
