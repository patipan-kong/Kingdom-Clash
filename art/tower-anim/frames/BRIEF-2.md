# Azure Archer Tower V1.0: step 2 brief (9 images)

Inputs (do not edit them):
- `00-intact.png` (1024x1536, transparent): the approved Azure Archer Tower with an empty platform. The stone feet stand on the ground line y=1380. It is the edit target for the BUILDING images 01 to 05.
- `archer-aim.png` (1536x1024, transparent): the tower's archer, isolated, aiming. It is the edit target for the ARCHER images 06 to 09.

## Rules for every image

1. One generation per image with the built-in image tool, editing the named target, with a genuinely transparent background (`transparent_background: true`). Keep the tool's alpha. Never a white, coloured or chroma-key backdrop. Never any background removal, chroma key, matting, alpha repair or script on the pixels. Save each output exactly as returned.
2. Keep the output canvas the same shape as the target. Keep everything at EXACTLY the target's scale: never rescale, recentre or crop. Nothing may touch or leave the canvas edge.
3. The same painted soft-shaded style, dark outline, palette, top lighting and camera (three-quarter high angle) as the target.
4. No ground shadow, glow, smoke, fire, dust clouds, flying debris, motion lines, text, border, backdrop or extra objects.

## BUILDING images (edit `00-intact.png`)

For 01 and 02:
- The SAME tower in the same place, at the same size, from the same camera.
- The outline, the four stone feet on the ground line, the posts, the roof, the gold finial, the pennant, the front banner and its white shield crest all stay where they are.
- Change ONLY the damage details listed. Keep the platform empty (no archer).

- `01-damaged.png`: light battle damage.
  - A crack and a chipped corner on the front stone foot.
  - One split, splintered plank in the front railing.
  - Two broken-off arrow shafts stuck in the wooden posts.
  - A small tear in the bottom hem of the front banner.
  - Everything else is unchanged.
- `02-critical.png`: heavy battle damage on the same tower.
  - Everything from 01, plus:
    - a broken railing post top;
    - a ragged hole torn in the blue roof cloth near one edge, with the roof frame still standing;
    - the front banner tattered and torn halfway up;
    - more cracks in two stone feet;
    - several broken arrow shafts stuck in the wood;
    - scorched dark patches on the planks.
  - The tower still stands upright with the same outline (except the torn cloth edges).

The COLLAPSE images 03 to 05 show the same tower being destroyed, in three steps. Its four stone feet stay on the ground line at the same place, and it stays at the same scale.
- `03-collapse1.png`: the tower breaking.
  - The upper structure (platform, roof and posts) tilts about 12 degrees toward viewer-left, cracked.
  - The left front post is snapping; planks are breaking loose.
  - The roof is crooked, and the banner is torn.
  - The stone feet still stand.
- `04-collapse2.png`: falling.
  - The upper structure has broken off its legs and slumps down: the roof has dropped to about half the tower's height, broken and caved in.
  - Posts and planks are snapped and splayed.
  - The stone feet still stand at the bottom.
- `05-collapse3.png`: a rubble heap on the ground.
  - A low pile, about one quarter of the tower's height and about as wide as the stone feet span.
  - It holds broken planks, snapped posts, the torn blue roof cloth and the toppled gold finial.
  - The torn blue banner with its white crest lies on top.
  - The four broken stone feet sit at the base, on the ground line.

## ARCHER images (edit `archer-aim.png`)

Rules for these four images:
- The SAME archer, identical in every detail.
  - Deep blue hood with a thin gold trim edge.
  - Blue tunic with a gold emblem, brown leather shoulder guards, bracers and gloves.
  - A brown belt with a gold buckle, brown trousers and boots.
  - A curved wooden short bow and silver-headed arrows.
- The same size and the same place.
  - His feet stay exactly where they are, and his hood, head and body are exactly as large as in the target.
  - He stands upright. Only his arms, the bow and his head move.
- Handedness, never mirrored: the bow is ALWAYS in his LEFT hand, on the VIEWER-RIGHT side. His RIGHT hand, on the VIEWER-LEFT side, handles the arrow and string. He faces viewer-right.
- Only the archer: nothing else in the image.

The four images:
- `06-watch.png`: at rest, watching.
  - The bow is lowered, held loosely in his left hand, pointing down at his side toward viewer-right.
  - No arrow on the string; his right hand rests at his belt.
  - He looks out toward viewer-right, alert.
- `07-release.png`: the instant after the shot.
  - The bow arm is still extended toward viewer-right. The string has snapped straight, the bow has relaxed, and there is NO arrow.
  - His right hand has opened and flown back past his ear, fingers spread.
  - His shoulders lean back a little from the recoil.
- `08-nock.png`: reloading.
  - The bow is held lower, in front of his chest, tilted.
  - His right hand brings a new silver-headed arrow to the string and sets it on the string.
  - The string is not pulled yet. He looks down at the arrow.
- `09-draw.png`: drawing.
  - The bow is raised toward viewer-right, almost level, an arrow nocked.
  - His right hand pulls the string halfway back, to the middle of his chest; the bow is half bent.
  - He looks toward viewer-right.

Write a short report to the report file named in your task.
