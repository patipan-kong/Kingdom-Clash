# FIX1 generation report

Regenerated only the eight listed frames, one built-in generation per frame. Every call edited ../ref/canvas-template.png and supplied 00-idle.png plus the accepted neighbour listed below. Parameters: referenced_image_paths with those three absolute paths in that order; transparent_background=true. Generated PNGs were copied byte-for-byte to their exact requested filenames. No resizing, pixel changes, background removal, matting, alpha repair, or repeat generations. Existing accepted frames were not edited.

## Validation and remaining deviations

All eight PNG headers: **1360 x 1156, RGBA, 8 bits per channel** (PNG color type 6). The tool returned 85% of the requested 1600 x 1360 dimensions, with the correct aspect ratio. Original alpha is retained. Exact requested pixel dimensions and ground coordinates are therefore not met. Relative ground placement also drifts between frames. All outputs were visually inspected and contain one fully visible pose with generous margins.

Handedness is retained: sword at viewer-left, shield attached to the arm from viewer-right. However 12–14 keep the shield mainly at viewer-right, failing the requested pronounced cross-body bash toward viewer-left; 14 extends it toward viewer-right. Those poses require review. Taunt poses broadly follow the brief. Kneeling death and rise are visibly shorter than idle, but exact helmet, torso, and shield dimension equality is not certified; rise looks closer to about 90% than the requested 75% of idle silhouette height. Death collapse shows released sword and slipping shield but reads more as a low stagger than a strong sideways fall. These are deliverables for review, not a claim of exact visual compliance.

## 12-bash2.png

Tool: image_gen.imagegen (built-in, callable image_gen__imagegen).

Output: 1360 x 1156, RGBA, 8 bits/channel.

Edit target: G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png

Size/identity reference: G:/work/ark/arkhero-sprite/art/guardian-anim/frames/00-idle.png

Accepted neighbour: G:/work/ark/arkhero-sprite/art/guardian-anim/frames/11-bash1.png

Exact prompt:

```text
Use case: identity-preserve. Asset: single Guardian animation frame. EDIT image 1, ../ref/canvas-template.png, the 1600x1360 transparent canvas; image 2 is 00-idle.png, mandatory size and identity reference; image 3 is the accepted neighbouring pose reference. Output exactly one pose on the same 1600x1360 canvas with genuine transparent alpha. Preserve template framing, scale and ground contact at approximately y=1180, x=850. References with smaller canvases must be compared in normalized canvas coordinates: do not copy their smaller framing. Same physical helmet, pauldrons, torso and shield dimensions as idle relative to canvas, never enlarge to fill space; stocky top-heavy body, head about 22% of standing height. Standing character including plume is about 690 px tall; one-knee poses about 520 px tall, achieved by bending legs, not scaling anatomy. Same silver plate and gold trim, blue plume curling toward viewer-left, gold winged helmet crest, dark T visor, blue cape, gold-bordered blue tabard and long front panel, blue diamond chest and belt gems, brown belt, short broad silver sword with gold crossguard and blue pommel gem, kite shield with gold rim blue field and white shield-outline crest. Same painted soft shading, dark outlines, palette, top lighting, three-quarter high camera looking down about 35 degrees, body facing viewer-left. NEVER MIRROR: shield always on his anatomical LEFT arm originating on VIEWER-RIGHT; sword always anatomical RIGHT hand on VIEWER-LEFT. For bash, left shield arm crosses the front of chest toward viewer-left; it never swaps hands, sword hand stays low behind on viewer-left. Nothing touches canvas edges. No ground shadow, backdrop, blur, speed lines, glow, sparks, dust, text, border, extra objects, extra limbs, or sheet. Change only pose as follows.
Shield Bash COIL, following accepted 11-bash1 brace: weight loaded onto rear foot, knees deeply bent, shield shoulder leading, shield drawn close across chest, its rim turned toward viewer-left. Show continuity with 11, left shield arm coming from viewer-right and across body, sword held low and back in separate viewer-left hand.
```

## 13-bash3.png

Tool: image_gen.imagegen (built-in, callable image_gen__imagegen).

Output: 1360 x 1156, RGBA, 8 bits/channel.

Edit target: G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png

Size/identity reference: G:/work/ark/arkhero-sprite/art/guardian-anim/frames/00-idle.png

Accepted neighbour: G:/work/ark/arkhero-sprite/art/guardian-anim/frames/11-bash1.png

Exact prompt:

```text
Use case: identity-preserve. Asset: single Guardian animation frame. EDIT image 1, ../ref/canvas-template.png, the 1600x1360 transparent canvas; image 2 is 00-idle.png, mandatory size and identity reference; image 3 is the accepted neighbouring pose reference. Output exactly one pose on the same 1600x1360 canvas with genuine transparent alpha. Preserve template framing, scale and ground contact at approximately y=1180, x=850. References with smaller canvases must be compared in normalized canvas coordinates: do not copy their smaller framing. Same physical helmet, pauldrons, torso and shield dimensions as idle relative to canvas, never enlarge to fill space; stocky top-heavy body, head about 22% of standing height. Standing character including plume is about 690 px tall; one-knee poses about 520 px tall, achieved by bending legs, not scaling anatomy. Same silver plate and gold trim, blue plume curling toward viewer-left, gold winged helmet crest, dark T visor, blue cape, gold-bordered blue tabard and long front panel, blue diamond chest and belt gems, brown belt, short broad silver sword with gold crossguard and blue pommel gem, kite shield with gold rim blue field and white shield-outline crest. Same painted soft shading, dark outlines, palette, top lighting, three-quarter high camera looking down about 35 degrees, body facing viewer-left. NEVER MIRROR: shield always on his anatomical LEFT arm originating on VIEWER-RIGHT; sword always anatomical RIGHT hand on VIEWER-LEFT. For bash, left shield arm crosses the front of chest toward viewer-left; it never swaps hands, sword hand stays low behind on viewer-left. Nothing touches canvas edges. No ground shadow, backdrop, blur, speed lines, glow, sparks, dust, text, border, extra objects, extra limbs, or sheet. Change only pose as follows.
Shield Bash THRUST after brace and coil: explosive short step forward toward viewer-left, shield driven across body forward and slightly up toward viewer-left, torso leaning forward. Left shield arm originates at viewer-right shoulder and reaches across chest. Sword remains low behind on viewer-left in right hand. Keep shield physical size; foreshortening allowed.
```

## 14-bash4.png

Tool: image_gen.imagegen (built-in, callable image_gen__imagegen).

Output: 1360 x 1156, RGBA, 8 bits/channel.

Edit target: G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png

Size/identity reference: G:/work/ark/arkhero-sprite/art/guardian-anim/frames/00-idle.png

Accepted neighbour: G:/work/ark/arkhero-sprite/art/guardian-anim/frames/11-bash1.png

Exact prompt:

```text
Use case: identity-preserve. Asset: single Guardian animation frame. EDIT image 1, ../ref/canvas-template.png, the 1600x1360 transparent canvas; image 2 is 00-idle.png, mandatory size and identity reference; image 3 is the accepted neighbouring pose reference. Output exactly one pose on the same 1600x1360 canvas with genuine transparent alpha. Preserve template framing, scale and ground contact at approximately y=1180, x=850. References with smaller canvases must be compared in normalized canvas coordinates: do not copy their smaller framing. Same physical helmet, pauldrons, torso and shield dimensions as idle relative to canvas, never enlarge to fill space; stocky top-heavy body, head about 22% of standing height. Standing character including plume is about 690 px tall; one-knee poses about 520 px tall, achieved by bending legs, not scaling anatomy. Same silver plate and gold trim, blue plume curling toward viewer-left, gold winged helmet crest, dark T visor, blue cape, gold-bordered blue tabard and long front panel, blue diamond chest and belt gems, brown belt, short broad silver sword with gold crossguard and blue pommel gem, kite shield with gold rim blue field and white shield-outline crest. Same painted soft shading, dark outlines, palette, top lighting, three-quarter high camera looking down about 35 degrees, body facing viewer-left. NEVER MIRROR: shield always on his anatomical LEFT arm originating on VIEWER-RIGHT; sword always anatomical RIGHT hand on VIEWER-LEFT. For bash, left shield arm crosses the front of chest toward viewer-left; it never swaps hands, sword hand stays low behind on viewer-left. Nothing touches canvas edges. No ground shadow, backdrop, blur, speed lines, glow, sparks, dust, text, border, extra objects, extra limbs, or sheet. Change only pose as follows.
Shield Bash IMPACT at maximum reach toward viewer-left, fully extended left shield arm across front of chest from viewer-right shoulder, shield face toward foe at viewer-left. Deep forward lunge, body lowest and furthest forward, same body dimensions as idle. Sword low behind in right hand on viewer-left side, visible separate from shield. Do not move shield to the sword arm.
```

## 18-taunt1.png

Tool: image_gen.imagegen (built-in, callable image_gen__imagegen).

Output: 1360 x 1156, RGBA, 8 bits/channel.

Edit target: G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png

Size/identity reference: G:/work/ark/arkhero-sprite/art/guardian-anim/frames/00-idle.png

Accepted neighbour: G:/work/ark/arkhero-sprite/art/guardian-anim/frames/19-taunt2.png

Exact prompt:

```text
Use case: identity-preserve. Asset: single Guardian animation frame. EDIT image 1, ../ref/canvas-template.png, the 1600x1360 transparent canvas; image 2 is 00-idle.png, mandatory size and identity reference; image 3 is the accepted neighbouring pose reference. Output exactly one pose on the same 1600x1360 canvas with genuine transparent alpha. Preserve template framing, scale and ground contact at approximately y=1180, x=850. References with smaller canvases must be compared in normalized canvas coordinates: do not copy their smaller framing. Same physical helmet, pauldrons, torso and shield dimensions as idle relative to canvas, never enlarge to fill space; stocky top-heavy body, head about 22% of standing height. Standing character including plume is about 690 px tall; one-knee poses about 520 px tall, achieved by bending legs, not scaling anatomy. Same silver plate and gold trim, blue plume curling toward viewer-left, gold winged helmet crest, dark T visor, blue cape, gold-bordered blue tabard and long front panel, blue diamond chest and belt gems, brown belt, short broad silver sword with gold crossguard and blue pommel gem, kite shield with gold rim blue field and white shield-outline crest. Same painted soft shading, dark outlines, palette, top lighting, three-quarter high camera looking down about 35 degrees, body facing viewer-left. NEVER MIRROR: shield always on his anatomical LEFT arm originating on VIEWER-RIGHT; sword always anatomical RIGHT hand on VIEWER-LEFT. For bash, left shield arm crosses the front of chest toward viewer-left; it never swaps hands, sword hand stays low behind on viewer-left. Nothing touches canvas edges. No ground shadow, backdrop, blur, speed lines, glow, sparks, dust, text, border, extra objects, extra limbs, or sheet. Change only pose as follows.
Taunt CALL: standing tall, chest out, sword raised upright in front of him in viewer-left right hand, shield swung out sideways to viewer-right on left arm. Preserve exactly idle and 19-taunt2 physical anatomy size and stocky proportions. Raising sword must not enlarge body.
```

## 20-taunt3.png

Tool: image_gen.imagegen (built-in, callable image_gen__imagegen).

Output: 1360 x 1156, RGBA, 8 bits/channel.

Edit target: G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png

Size/identity reference: G:/work/ark/arkhero-sprite/art/guardian-anim/frames/00-idle.png

Accepted neighbour: G:/work/ark/arkhero-sprite/art/guardian-anim/frames/19-taunt2.png

Exact prompt:

```text
Use case: identity-preserve. Asset: single Guardian animation frame. EDIT image 1, ../ref/canvas-template.png, the 1600x1360 transparent canvas; image 2 is 00-idle.png, mandatory size and identity reference; image 3 is the accepted neighbouring pose reference. Output exactly one pose on the same 1600x1360 canvas with genuine transparent alpha. Preserve template framing, scale and ground contact at approximately y=1180, x=850. References with smaller canvases must be compared in normalized canvas coordinates: do not copy their smaller framing. Same physical helmet, pauldrons, torso and shield dimensions as idle relative to canvas, never enlarge to fill space; stocky top-heavy body, head about 22% of standing height. Standing character including plume is about 690 px tall; one-knee poses about 520 px tall, achieved by bending legs, not scaling anatomy. Same silver plate and gold trim, blue plume curling toward viewer-left, gold winged helmet crest, dark T visor, blue cape, gold-bordered blue tabard and long front panel, blue diamond chest and belt gems, brown belt, short broad silver sword with gold crossguard and blue pommel gem, kite shield with gold rim blue field and white shield-outline crest. Same painted soft shading, dark outlines, palette, top lighting, three-quarter high camera looking down about 35 degrees, body facing viewer-left. NEVER MIRROR: shield always on his anatomical LEFT arm originating on VIEWER-RIGHT; sword always anatomical RIGHT hand on VIEWER-LEFT. For bash, left shield arm crosses the front of chest toward viewer-left; it never swaps hands, sword hand stays low behind on viewer-left. Nothing touches canvas edges. No ground shadow, backdrop, blur, speed lines, glow, sparks, dust, text, border, extra objects, extra limbs, or sheet. Change only pose as follows.
Taunt DEFIANCE: feet wide, shield held out wide to viewer-right on left arm, sword in right hand extended and pointed at foe toward viewer-left, head up. Preserve exactly idle and 19-taunt2 body size, helmet, shield, and stocky proportions.
```

## 25-death1.png

Tool: image_gen.imagegen (built-in, callable image_gen__imagegen).

Output: 1360 x 1156, RGBA, 8 bits/channel.

Edit target: G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png

Size/identity reference: G:/work/ark/arkhero-sprite/art/guardian-anim/frames/00-idle.png

Accepted neighbour: G:/work/ark/arkhero-sprite/art/guardian-anim/frames/19-taunt2.png

Exact prompt:

```text
Use case: identity-preserve. Asset: single Guardian animation frame. EDIT image 1, ../ref/canvas-template.png, the 1600x1360 transparent canvas; image 2 is 00-idle.png, mandatory size and identity reference; image 3 is the accepted neighbouring pose reference. Output exactly one pose on the same 1600x1360 canvas with genuine transparent alpha. Preserve template framing, scale and ground contact at approximately y=1180, x=850. References with smaller canvases must be compared in normalized canvas coordinates: do not copy their smaller framing. Same physical helmet, pauldrons, torso and shield dimensions as idle relative to canvas, never enlarge to fill space; stocky top-heavy body, head about 22% of standing height. Standing character including plume is about 690 px tall; one-knee poses about 520 px tall, achieved by bending legs, not scaling anatomy. Same silver plate and gold trim, blue plume curling toward viewer-left, gold winged helmet crest, dark T visor, blue cape, gold-bordered blue tabard and long front panel, blue diamond chest and belt gems, brown belt, short broad silver sword with gold crossguard and blue pommel gem, kite shield with gold rim blue field and white shield-outline crest. Same painted soft shading, dark outlines, palette, top lighting, three-quarter high camera looking down about 35 degrees, body facing viewer-left. NEVER MIRROR: shield always on his anatomical LEFT arm originating on VIEWER-RIGHT; sword always anatomical RIGHT hand on VIEWER-LEFT. For bash, left shield arm crosses the front of chest toward viewer-left; it never swaps hands, sword hand stays low behind on viewer-left. Nothing touches canvas edges. No ground shadow, backdrop, blur, speed lines, glow, sparks, dust, text, border, extra objects, extra limbs, or sheet. Change only pose as follows.
Death STAGGER: dropped onto one knee, right hand at viewer-left driving sword point into ground to hold himself up, shield sagging on viewer-right left arm. Bowed exhausted posture. Body including plume only about three quarters of idle standing height (about 520 px), ground contact still y=1180. Helmet and shield remain exactly idle physical size; legs fold, no giant kneeling body.
```

## 26-death2.png

Tool: image_gen.imagegen (built-in, callable image_gen__imagegen).

Output: 1360 x 1156, RGBA, 8 bits/channel.

Edit target: G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png

Size/identity reference: G:/work/ark/arkhero-sprite/art/guardian-anim/frames/00-idle.png

Accepted neighbour: G:/work/ark/arkhero-sprite/art/guardian-anim/frames/19-taunt2.png

Exact prompt:

```text
Use case: identity-preserve. Asset: single Guardian animation frame. EDIT image 1, ../ref/canvas-template.png, the 1600x1360 transparent canvas; image 2 is 00-idle.png, mandatory size and identity reference; image 3 is the accepted neighbouring pose reference. Output exactly one pose on the same 1600x1360 canvas with genuine transparent alpha. Preserve template framing, scale and ground contact at approximately y=1180, x=850. References with smaller canvases must be compared in normalized canvas coordinates: do not copy their smaller framing. Same physical helmet, pauldrons, torso and shield dimensions as idle relative to canvas, never enlarge to fill space; stocky top-heavy body, head about 22% of standing height. Standing character including plume is about 690 px tall; one-knee poses about 520 px tall, achieved by bending legs, not scaling anatomy. Same silver plate and gold trim, blue plume curling toward viewer-left, gold winged helmet crest, dark T visor, blue cape, gold-bordered blue tabard and long front panel, blue diamond chest and belt gems, brown belt, short broad silver sword with gold crossguard and blue pommel gem, kite shield with gold rim blue field and white shield-outline crest. Same painted soft shading, dark outlines, palette, top lighting, three-quarter high camera looking down about 35 degrees, body facing viewer-left. NEVER MIRROR: shield always on his anatomical LEFT arm originating on VIEWER-RIGHT; sword always anatomical RIGHT hand on VIEWER-LEFT. For bash, left shield arm crosses the front of chest toward viewer-left; it never swaps hands, sword hand stays low behind on viewer-left. Nothing touches canvas edges. No ground shadow, backdrop, blur, speed lines, glow, sparks, dust, text, border, extra objects, extra limbs, or sheet. Change only pose as follows.
Death COLLAPSE: falling sideways and forward toward viewer-left, torso low and diagonally tilted, helmet tilting, sword slipping out of viewer-left right hand, shield sliding off viewer-right left arm. This is mid-fall, not lying fully down. Preserve exact idle body part sizes, no enlargement. Lowest body contact on same ground line y=1180 near usual horizontal placement.
```

## 28-rise.png

Tool: image_gen.imagegen (built-in, callable image_gen__imagegen).

Output: 1360 x 1156, RGBA, 8 bits/channel.

Edit target: G:/work/ark/arkhero-sprite/art/guardian-anim/ref/canvas-template.png

Size/identity reference: G:/work/ark/arkhero-sprite/art/guardian-anim/frames/00-idle.png

Accepted neighbour: G:/work/ark/arkhero-sprite/art/guardian-anim/frames/19-taunt2.png

Exact prompt:

```text
Use case: identity-preserve. Asset: single Guardian animation frame. EDIT image 1, ../ref/canvas-template.png, the 1600x1360 transparent canvas; image 2 is 00-idle.png, mandatory size and identity reference; image 3 is the accepted neighbouring pose reference. Output exactly one pose on the same 1600x1360 canvas with genuine transparent alpha. Preserve template framing, scale and ground contact at approximately y=1180, x=850. References with smaller canvases must be compared in normalized canvas coordinates: do not copy their smaller framing. Same physical helmet, pauldrons, torso and shield dimensions as idle relative to canvas, never enlarge to fill space; stocky top-heavy body, head about 22% of standing height. Standing character including plume is about 690 px tall; one-knee poses about 520 px tall, achieved by bending legs, not scaling anatomy. Same silver plate and gold trim, blue plume curling toward viewer-left, gold winged helmet crest, dark T visor, blue cape, gold-bordered blue tabard and long front panel, blue diamond chest and belt gems, brown belt, short broad silver sword with gold crossguard and blue pommel gem, kite shield with gold rim blue field and white shield-outline crest. Same painted soft shading, dark outlines, palette, top lighting, three-quarter high camera looking down about 35 degrees, body facing viewer-left. NEVER MIRROR: shield always on his anatomical LEFT arm originating on VIEWER-RIGHT; sword always anatomical RIGHT hand on VIEWER-LEFT. For bash, left shield arm crosses the front of chest toward viewer-left; it never swaps hands, sword hand stays low behind on viewer-left. Nothing touches canvas edges. No ground shadow, backdrop, blur, speed lines, glow, sparks, dust, text, border, extra objects, extra limbs, or sheet. Change only pose as follows.
Rise RESPAWN: halfway up from one knee, pushing up with sword arm at viewer-left, sword tip braced on ground, left shield arm at viewer-right bracing. About to stand, clear recovering upward posture. Kneeling silhouette including plume about three quarters of idle standing height (about 520 px) at ground y=1180. Helmet, torso, pauldrons, shield exactly idle physical size; fold legs, never enlarge kneeling character.
```


