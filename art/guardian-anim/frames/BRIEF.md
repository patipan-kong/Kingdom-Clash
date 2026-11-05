# Guardian V1.0 animation frames: production brief (29 frames)

Inputs (do not edit them):
- `../ref/canvas-template.png` (1600x1360, transparent): the approved Guardian at his game scale, standing on the ground line, with room around him. EVERY frame is an edit of this template.
- `../ref/guardian-reference.png`: the identity reference (the approved painting).
- `../pilot/p1-walk-contact.png`, `../pilot/p2-attack-windup.png` and `../pilot2/q1-attack-contact.png`: accepted examples of new poses of the same character (q1 also shows the accepted scale and ground line). Use them only as examples, never copy their framing.

## Rules for every frame

1. One generation per frame with the built-in image tool, editing the template, with a genuinely transparent background. Keep the tool's alpha. Never a white, coloured or chroma-key backdrop; never any background removal, chroma key, matting or alpha repair (no `remove_chroma_key.py`, no scripts on the pixels). Save each output exactly as returned.
2. Keep the output canvas the same shape as the template and the character at EXACTLY the template's size. Keep the ground line where it is: the weight-bearing foot (or, when he is down, the body's contact with the ground) stays on the template's ground line, at about the same horizontal place. Never scale him to fill the canvas; nothing may touch or leave the canvas.
3. The same character in every detail (see `../pilot/BRIEF.md`): silver plate with gold trim, blue horsehair plume curling back toward viewer-left, gold winged crest, dark T-visor, blue cape, blue tabard with gold border and long front panel, blue diamond gems on chest and belt, brown belt, short broad silver sword with gold crossguard and blue pommel gem in the hand at viewer-left, kite shield with gold rim, blue field and white shield-outline crest on the viewer-right arm. Stocky, top-heavy proportions.
4. The same camera (three-quarter high angle, body turned toward viewer-left), the same painted soft-shaded style, dark outline, palette and top lighting. He always faces viewer-left (the game mirrors him for the right).
5. No ground shadow, no motion blur, no speed lines, no glow, no sparks, no dust, no text, no border.
6. Never a sheet: exactly one character and one pose per image.

## Frames (file names are exact)

| File | Pose |
|---|---|
| `00-idle.png` | The template pose, unchanged. |
| `01-walk1.png` | Walk, contact: the viewer-left foot just planted a short step ahead, the other foot behind on its toes. Body slightly lower, leaning a little forward. Sword low at his side, point down; shield carried in front on the viewer-right. |
| `02-walk2.png` | Walk, down: weight settling onto the front foot, knees bent, body at its lowest; the rear foot starting to lift. |
| `03-walk3.png` | Walk, passing: the rear foot swinging forward under the body, body at its highest, sword and shield centred. |
| `04-walk4.png` | Walk, contact with the OTHER leg: the viewer-right foot now planted ahead, the viewer-left foot behind on its toes. Body slightly lower. |
| `05-walk5.png` | Walk, down on the other leg: knees bent, body lowest, the rear foot starting to lift. |
| `06-walk6.png` | Walk, passing on the other leg: the rear foot swinging forward under the body, body highest. Must lead back smoothly into 01. |
| `07-attack1.png` | Sword attack, anticipation: weight back on the rear foot, shoulders turned away, the sword drawn back and up behind the head; shield pulled in. |
| `08-attack2.png` | Sword attack, overhead: the blade raised high above the helmet, starting forward; shield guarding the chest; both feet planted. |
| `09-attack3.png` | Sword attack, mid-swing: the blade sweeping down and forward at shoulder height toward viewer-left; the front foot stepping forward. |
| `10-attack4.png` | Sword attack, contact: a forward lunge, the front foot stepped forward, torso leaning forward, the sword arm fully extended toward viewer-left with the blade horizontal at chest height; shield tucked in at the right. |
| `11-bash1.png` | Shield Bash, brace: a crouch, knees bent, the shield drawn in to the chest and turning toward viewer-left; sword low and back. |
| `12-bash2.png` | Shield Bash, coil: weight loaded on the rear foot, the shield shoulder leading, the shield rim turned toward viewer-left. |
| `13-bash3.png` | Shield Bash, thrust: an explosive step forward toward viewer-left, the shield driven forward and slightly up, body forward. |
| `14-bash4.png` | Shield Bash, impact: fully extended, the shield thrust at maximum reach toward viewer-left with its face toward the foe, body lowest and furthest forward; sword behind him. |
| `15-charge1.png` | Charge, brace: a low sprinter's crouch, the shield raised in front like a ram, the rear foot pushing off; sword trailing low behind. |
| `16-charge2.png` | Charge, dash A: running hard toward viewer-left, torso pitched about 20 degrees forward behind the raised shield, the front knee high, the rear leg extended behind; cape and plume streaming back. |
| `17-charge3.png` | Charge, dash B: as dash A with the legs swapped. Alternates with dash A. |
| `18-taunt1.png` | Taunt, call: standing tall, chest out, the sword raised upright in front of him, the shield swung out to the side. |
| `19-taunt2.png` | Taunt, clash: he beats the flat of the sword against the face of the shield, head forward, shouting a challenge (the visor hides the face). |
| `20-taunt3.png` | Taunt, defiance: feet wide, the shield held out wide, the sword pointed at the foe toward viewer-left, head up. |
| `21-protect1.png` | Sanctuary, plant: dropping to one knee, the shield planted upright on the ground in front of him. |
| `22-protect2.png` | Sanctuary, invoke: rising from the knee, the sword lifting toward the sky, the shield still planted. |
| `23-protect3.png` | Sanctuary, hold: standing tall, the sword held straight up above the helmet, the shield braced upright on the ground at his side. |
| `24-hurt.png` | Hurt: a flinch, head ducked, shoulders hunched, body recoiling a little backward (toward viewer-right); shield lifted slightly, sword dropping. Feet as in idle. |
| `25-death1.png` | Death, stagger: dropped to one knee, the sword point driven into the ground to hold himself up, the shield sagging. |
| `26-death2.png` | Death, collapse: falling sideways and forward, helmet tilting, the sword slipping from the hand, the shield sliding off the arm. |
| `27-death3.png` | Death, down: lying on the ground on his side, at most half his standing height, the sword and shield on the ground beside him, plume down. |
| `28-rise.png` | Rise (respawn): halfway up from one knee, pushing up with the sword arm, the shield arm bracing; about to stand. |

## Report

Write `REPORT.md`: for each file, the exact prompt, the tool name, the output pixel size and mode. Do not edit any file outside this `frames` folder.
