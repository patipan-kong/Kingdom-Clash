#!/usr/bin/env python
"""Pack the Guardian V1.0 animation frames into a trimmed Phaser atlas, public/assets/guardian-sheet.png + .json (frames "0".."28", each with a 400x364 source cell
and the feet pivot at (256,334); frame map in src/world/guardianSprite.ts), and the untrimmed 5x6 grid art/guardian-anim/guardian-grid.png for
scripts/validate-guardian-sheet.py and review. Usage: py scripts/pack-guardian-sheet.py [art/guardian-anim/frames.json]
Needs Pillow only. Inputs are the generator's own transparent PNGs (art/guardian-anim/frames/); nothing is colour-keyed. Per frame, in order:
 1. alpha tidy, never colour based: generator haze (alpha below 16 farther than 8 px from the body) becomes 0, and the body's own interior (alpha 128+ eroded
    by 2 px) becomes fully opaque (the generator returns 247-254 for opaque paint, which would let the ground show through);
 2. one uniform resize to the cell scale (premultiplied, Lanczos);
 3. an integer translation that puts the frame's feet anchor (manifest, in source px) on the pivot.
The manifest lists, per frame index: file, anchor [x, y] (the ground point between the soles, or the body's ground contact when down) and scale (cell px per source px)."""
import sys, json
from PIL import Image, ImageFilter

CW, CH, COLS, ROWS, FRAMES = 400, 364, 5, 6, 29
PIVOT = (256, 334)
ATLAS_W = 2048

def tidy(im):
    a = im.getchannel('A')
    solid = a.point(lambda v: 255 if v >= 128 else 0)
    near = solid.filter(ImageFilter.MaxFilter(17))
    inner = solid.filter(ImageFilter.MinFilter(5))
    av, nv, iv = bytearray(a.tobytes()), near.tobytes(), inner.tobytes()
    for i in range(len(av)):
        if iv[i]: av[i] = 255
        elif av[i] < 16 and not nv[i]: av[i] = 0
    im = im.copy(); im.putalpha(Image.frombytes('L', a.size, bytes(av))); return im

def frame(entry, base):
    im = tidy(Image.open(base + entry['file']).convert('RGBA'))
    s = entry['scale']; w, h = round(im.width * s), round(im.height * s)
    small = im.convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA')
    ax, ay = entry['anchor']; ox, oy = round(PIVOT[0] - ax * s), round(PIVOT[1] - ay * s)
    cell = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    sx, sy = max(0, -ox), max(0, -oy)
    cell.alpha_composite(small.crop((sx, sy, min(w, CW - ox), min(h, CH - oy))), (max(0, ox), max(0, oy)))
    ink = small.getchannel('A').point(lambda v: 255 if v >= 8 else 0).getbbox()
    clipped = bool(ink) and (ox + ink[0] < 2 or oy + ink[1] < 2 or ox + ink[2] > CW - 2 or oy + ink[3] > CH - 2)   # inside the 2 px gutter
    return cell, clipped

def main():
    manifest = sys.argv[1] if len(sys.argv) > 1 else 'art/guardian-anim/frames.json'
    base = manifest.rsplit('/', 1)[0] + '/'
    m = json.load(open(manifest, encoding='utf-8'))
    assert len(m['frames']) == FRAMES, 'manifest needs %d frames' % FRAMES
    grid = Image.new('RGBA', (CW * COLS, CH * ROWS), (0, 0, 0, 0)); cells = []; bad = []
    for i, entry in enumerate(m['frames']):
        cell, clipped = frame(entry, base)
        if clipped: bad.append('%d %s reaches the 2 px cell gutter' % (i, entry['file']))
        grid.paste(cell, ((i % COLS) * CW, (i // COLS) * CH)); cells.append(cell)
    grid.save(base + 'guardian-grid.png', optimize=True)
    # Trimmed atlas: each frame cropped to its pixels plus 1 px, shelf-packed with 2 px padding; Phaser restores the 400x364 source cell from
    # spriteSourceSize/sourceSize, so the origin (the pivot) is the same point in every frame.
    trims = [(i, c, c.getchannel('A').getbbox()) for i, c in enumerate(cells)]
    order = sorted(trims, key=lambda t: -(t[2][3] - t[2][1])); x = y = shelf = 0; place = {}
    for i, c, bb in order:
        x0, y0, x1, y1 = max(0, bb[0] - 1), max(0, bb[1] - 1), min(CW, bb[2] + 1), min(CH, bb[3] + 1); w, h = x1 - x0, y1 - y0
        if x + w > ATLAS_W: x, y, shelf = 0, y + shelf + 2, 0
        place[i] = (x, y, x0, y0, w, h); x += w + 2; shelf = max(shelf, h)
    H = y + shelf
    atlas = Image.new('RGBA', (ATLAS_W, H), (0, 0, 0, 0)); frames = {}
    for i, c, bb in trims:
        ax, ay, x0, y0, w, h = place[i]; atlas.paste(c.crop((x0, y0, x0 + w, y0 + h)), (ax, ay))
        frames[str(i)] = dict(frame=dict(x=ax, y=ay, w=w, h=h), rotated=False, trimmed=True, spriteSourceSize=dict(x=x0, y=y0, w=w, h=h), sourceSize=dict(w=CW, h=CH))
    atlas.save('public/assets/guardian-sheet.png', optimize=True)
    json.dump(dict(frames=frames, meta=dict(image='guardian-sheet.png', size=dict(w=ATLAS_W, h=H), scale='1', app='scripts/pack-guardian-sheet.py')), open('public/assets/guardian-sheet.json', 'w'), indent=1)
    print('wrote public/assets/guardian-sheet.png', atlas.size, '(%.1f MB RGBA) and the review grid' % (ATLAS_W * H * 4 / 1048576)); [print('WARN', b) for b in bad]

if __name__ == '__main__': main()
