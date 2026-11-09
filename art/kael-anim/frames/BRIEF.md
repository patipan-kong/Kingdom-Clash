# Kael (Azure Berserker, Tavern mercenary) V1.0 animation frames: production brief (14 images)

Inputs (do not edit them):
- `../ref/canvas-template.png` (1536x1536, transparent): the approved Kael painting at his game scale, standing with his boot soles on the ground line (y=1240) and his feet midpoint near x=950. Every frame is an edit of this template.
- `../ref/kael-still.png`: the same painting at its native size (identity reference).
- After Run 0 only: `00-idle.png`, the approved idle master, is a second reference for every later run.

## The character (identical in every frame)

A lean, athletic, slim young warrior (NOT broad, NOT bulky: a runner's build, long limbs, narrow waist), short spiky SILVER-WHITE hair, a fierce focused face with a dark brow, bare muscular arms with leather and steel bracers and gauntlets, a dark steel-grey and brown leather sleeveless vest with gold studs and a brown belt, dark brown trousers, steel knee and shin guards, brown leather boots with steel toe caps. A long BLUE SCARF/cloak is draped over his shoulders and streams out behind him on the viewer-right side. He carries TWO matching one-handed battle axes, one in each fist: each has a wide double-crescent steel blade with gold studs and a short dark wooden haft. He has NO shield and NO helmet. Painted soft-shaded style, dark outline, top lighting, same palette as the template.

## Rules for every frame

1. One generation per frame with the built-in image tool, editing the template, with a genuinely transparent background (`transparent_background: true`). Keep the tool alpha. Never a white, coloured or chroma-key backdrop; never any background removal, chroma key, matting or alpha repair, and no scripts on the pixels. Save each output exactly as returned.
2. Keep the output canvas the template shape (square). Keep Kael at EXACTLY the template size: standing, top of the hair to boot soles is about 590 px of the 1536 px height (head top to soles; the axes spread wider than the body). Keep the ground line: the weight-bearing foot (or, when he is down, the body contact with the ground) stays on y=1240, with the feet centred near x=950. Never scale him to fill the canvas. Nothing, axes and scarf included, may touch or leave the canvas: keep every part at least 80 px inside the edges.
3. The same character in every detail with the same SLIM proportions (never broader, never shorter, never bulkier). A kneeling pose is about three quarters of the standing body height; lying down is at most half.
4. Handedness, never mirrored: the scarf streams to the viewer-right. He is turned three-quarter toward viewer-left; his viewer-left arm is the front arm.
5. He always faces viewer-left (the game mirrors him for the right), same camera as the template, a little above.
6. Fast, light, agile, aggressive: low wide stances, quick twisting movements; the axes are light in his hands (unlike a heavy hammer) and the scarf whips.
7. No ground shadow, no motion blur, no impact lines, no speed lines, no glow, no sparks, no dust, no cracks, no blood, no text, no border.
8. Never a sheet: exactly one character and one pose per image.

## Run 0: the master

### `00-idle.png`
The template pose, as in the still: a wide braced fighting stance, an axe in each fist held out low to each side, the blades angled outward, the body turned three-quarter toward viewer-left, head turned left. Keep hair, scarf, vest, bracers, boots and both axes exactly as in the template. This is the master for every other frame.

## Run A: march (six images)

A fast, light, loping run toward viewer-left, longer and springier steps than a dwarf or a knight: both axes carried low and out to the sides, arms swinging gently, the torso leaning slightly forward, the scarf streaming behind.

| File | Pose |
|---|---|
| `01-walk1.png` | Contact: the viewer-left (front) foot just planted ahead, heel down; the other foot behind on its toes. Body slightly lower. |
| `02-walk2.png` | Down: weight settling onto the front foot, knee bent, body at its lowest; the rear foot starting to lift. |
| `03-walk3.png` | Passing: the rear foot swinging forward under the body, the supporting leg straight, body at its highest. |
| `04-walk4.png` | Contact with the OTHER leg: the viewer-right foot planted ahead, the viewer-left foot behind on its toes. Body slightly lower. |
| `05-walk5.png` | Down on the other leg: knee bent, body lowest, the rear foot starting to lift. |
| `06-walk6.png` | Passing on the other leg: the rear foot swinging forward under the body, body highest. Must lead back smoothly into 01. |

## Run B: crossing double-axe slash and hurt (four images)

The attack is a CROSSING DOUBLE-AXE SLASH: both axes swing together from wide apart in a scissor, crossing in front of him in an X. It is a fast LATERAL, horizontal slash, nothing like an overhead smash or a single diagonal cut: both arms are used at the same time, outstretched.

| File | Pose |
|---|---|
| `07-attack1.png` | Slash, wind-up: the torso twisted back and the arms flung wide apart, the viewer-left axe pulled back out to the viewer-left side and the other axe out to the viewer-right side, both blades open, the weight on the rear foot, the scarf flaring. |
| `08-attack2.png` | Slash, drive: both arms sweeping inward in front of the chest, the two axes mid-arc and about to meet in front of him, the front foot stepping forward, the torso turning into the cut. It must differ clearly from 07: the arms are no longer wide apart. |
| `09-attack3.png` | Slash, contact: a deep lunge toward viewer-left, the two axes CROSSED in an X directly in front of him at chest height, both arms extended forward and crossed, the blades overlapping in the X, the front knee bent deep, the scarf thrown forward. |
| `10-hurt.png` | Hurt: a flinch, shoulders hunched, head turned away and ducked, the body recoiling a little backward (toward viewer-right), the axes dropped low to his sides, one arm raised across the body. Feet as in idle. |

## Run C: death (three images)

| File | Pose |
|---|---|
| `11-death1.png` | Death, stagger: dropped to one knee (about three quarters of the standing body height), one axe planted on the ground propping him up, the other axe hanging from his hand, head bowed. |
| `12-death2.png` | Death, collapse: toppling forward and sideways toward viewer-left, both axes slipping from his hands, the scarf billowing. Same body size as idle. |
| `13-death3.png` | Death, down: lying on the ground on his side, at most half his standing body height, both axes lying on the ground beside him (the farthest axe at most 650 px from the feet midpoint), the scarf spread over him. |

## Report

Write the report file named in your task: for each file, the exact prompt, the tool name, the output pixel size and mode. Do not edit any file outside this `frames` folder.

## Note after Run 0

The approved idle master is now `../ref/idle-template.png` (1536x1536, the master at game scale; the lowest point of the boots on y=1240, the feet midpoint at x=950). For Runs A, B and C edit THAT file (not canvas-template.png) and keep the character exactly as in it. The ground line is y=1240 and the feet midpoint x=950 in every frame; keep every part at least 80 px inside the canvas edges. All other rules are unchanged.
