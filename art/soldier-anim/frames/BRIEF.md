# Azure Vanguard (soldier) V1.0 animation frames: production brief (14 frames)

Inputs (do not edit them):
- `../ref/canvas-template.png` (1600x1360, transparent): the approved Azure Vanguard soldier at his game scale, standing on the ground line (lowest sole at y=1180), with room around him. EVERY frame is an edit of this template.
- `../ref/soldier-reference.png`: the identity reference (the approved painting, 531x517).

## Rules for every frame

1. One generation per frame with the built-in image tool, editing the template, with a genuinely transparent background (`transparent_background: true`). Keep the tool's alpha. Never a white, coloured or chroma-key backdrop; never any background removal, chroma key, matting or alpha repair (no `remove_chroma_key.py`, no scripts on the pixels). Save each output exactly as returned.
2. Keep the output canvas the same shape as the template and the soldier at EXACTLY the template's size (standing plume-top to sole about 688 px of the 1360 px canvas height; helmet about 200 px wide). Keep the ground line: the weight-bearing foot (or, when he is down, the body's contact with the ground) stays on the template's ground line (y=1180), at about the same horizontal place (feet centred near x=866). Never scale him to fill the canvas; nothing may touch or leave the canvas.
3. The same character in every detail: a small, stocky infantry soldier with chibi proportions (the helmet is about a third of his standing height). Round-topped silver great-helm with a dark T-shaped visor slot and a small gold spike on the brow; a blue horsehair plume rising from the crown and curling back toward viewer-left. A blue scarf/short cape around the neck and shoulders. Silver pauldrons and breastplate, dark chainmail at the elbows, brown leather bracers and gloves, a brown belt with a square silver buckle, blue tabard skirt panels, silver knee guards, brown leather boots. A short broad silver sword with a round gold crossguard. A silver-rimmed kite shield with a blue field and a white shield-shaped crest emblem. He is NOT the Guardian: no gold armour trim, no winged crest, no gems.
4. Handedness, never mirrored: the sword is ALWAYS in his RIGHT hand, on the VIEWER-LEFT side of the image; the shield is ALWAYS strapped to his LEFT arm, on the VIEWER-RIGHT side. Every frame keeps this, even when he swings or falls.
5. The same body size in every frame: helmet, shoulders, torso and shield exactly as large as in the template. A kneeling or crouching pose is therefore SHORTER than standing (kneeling about three quarters of the standing height; lying down at most half). Never enlarge the body to fill the space; never change his proportions.
6. The same camera (three-quarter high angle, about 35 degrees above, body turned toward viewer-left / down-left), the same painted soft-shaded style, dark outline, palette and top lighting. He always faces viewer-left (the game mirrors him for the right).
7. No ground shadow, no motion blur, no speed lines, no glow, no sparks, no dust, no blood, no text, no border.
8. Never a sheet: exactly one character and one pose per image.

## Frames (file names are exact)

| File | Pose |
|---|---|
| `00-idle.png` | The template pose, unchanged: the guard stance, sword forward toward viewer-left, shield up at the viewer-right. |
| `01-walk1.png` | Walk, contact: marching toward viewer-left with sword and shield held as in the guard stance (sword forward and a little lower, shield up). The viewer-left (front) foot just planted a short step ahead, heel down; the other foot behind on its toes. Body slightly lower, leaning a little forward. Feet closer together than the wide guard stance. |
| `02-walk2.png` | Walk, down: weight settling onto the front foot, knees bent, body at its lowest; the rear foot starting to lift. |
| `03-walk3.png` | Walk, passing: the rear foot swinging forward under the body, the supporting leg straight, body at its highest. |
| `04-walk4.png` | Walk, contact with the OTHER leg: the viewer-right foot now planted ahead, the viewer-left foot behind on its toes. Body slightly lower. |
| `05-walk5.png` | Walk, down on the other leg: knees bent, body lowest, the rear foot starting to lift. |
| `06-walk6.png` | Walk, passing on the other leg: the rear foot swinging forward under the body, body highest. Must lead back smoothly into 01. |
| `07-attack1.png` | Sword attack, wind-up: weight back on the rear foot, shoulders turned away, the sword raised high and drawn back above and behind the helmet; the shield pulled in to the chest. |
| `08-attack2.png` | Sword attack, swing: the blade at the top of its arc, sweeping forward over the helmet toward viewer-left, body turning forward; shield guarding the chest; both feet planted. |
| `09-attack3.png` | Sword attack, contact: a forward lunge toward viewer-left, the front foot stepped forward, torso leaning forward, the sword arm fully extended with the blade slashing down and forward at waist height toward viewer-left; shield tucked in at the viewer-right. |
| `10-hurt.png` | Hurt: a flinch, head ducked, shoulders hunched, body recoiling a little backward (toward viewer-right); shield lifted slightly, sword dropping. Feet as in idle. |
| `11-death1.png` | Death, stagger: dropped to one knee (about three quarters of the standing height), the sword point dropping to the ground, the shield sagging, head bowed. |
| `12-death2.png` | Death, collapse: falling sideways and forward toward viewer-left, the helmet tilting, the sword slipping from the hand, the shield sliding off the arm. Same body size as idle. |
| `13-death3.png` | Death, down: lying on the ground on his side, at most half his standing height, the sword and shield on the ground beside him, plume down. |

## Report

Write the report file named in your task: for each file, the exact prompt, the tool name, the output pixel size and mode. Do not edit any file outside this `frames` folder.
