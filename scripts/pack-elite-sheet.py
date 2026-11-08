#!/usr/bin/env python
"""Pack the Crimson Elite Soldier V1.0 frames (art/elite-anim/frames, one master: 00-idle.png, and 13 edits of it) into one trimmed Phaser atlas,
public/assets/soldier-elite.png + .json (frames "0".."13", each with a 288x240 source cell and the feet pivot at (164,214); frame map SF and geometry ELITE_SHEET in
src/world/soldierSprite.ts), and the untrimmed 5x3 review grid art/elite-anim/elite-grid.png for scripts/validate-elite-sheet.py.
Usage: py scripts/pack-elite-sheet.py
Needs Pillow only. Per frame: the Guardian packer's alpha tidy (never colour based), ONE uniform premultiplied Lanczos resize (the same scale for every frame: the idle
silhouette, spear tip to soles, is IDLE_H cell px), an integer translation of the anchor onto the pivot. The anchor is the idle's feet midpoint in the generator's frame
(the generator keeps the knight where the template put him), its y the lowest ink of the frame (a translation only: a sole, or the body where he is down)."""
import json, os, sys
from importlib.machinery import SourceFileLoader
from PIL import Image

guardian = SourceFileLoader('pack_guardian', 'scripts/pack-guardian-sheet.py').load_module()
ROOT = 'art/elite-anim/frames/'
CW, CH, COLS, ROWS, FRAMES = 288, 240, 5, 3, 14
PIVOT = (164, 214)
IDLE_H = 150
ATLAS_W = 1152
NAMES = ['00-idle'] + ['%02d-walk%d' % (i, i) for i in range(1, 7)] + ['07-attack1', '08-attack2', '09-attack3', '10-hurt', '11-death1', '12-death2', '13-death3']
STANDING = 14                      # every frame is grounded on its own lowest ink (the generator drew the lying body a few px low)

def ink(im, t=128): return im.getchannel('A').point(lambda v: 255 if v >= t else 0).getbbox()

def feet_of(idle):
    bb = ink(idle); band = idle.crop((0, bb[3] - 30, idle.width, bb[3] + 1)); b = ink(band)
    return (b[0] + b[2]) / 2, bb[3], bb[3] - bb[1]

def place(small, ax, ay):
    ox, oy = round(PIVOT[0] - ax), round(PIVOT[1] - ay + 1)
    cell = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    sx, sy = max(0, -ox), max(0, -oy)
    cell.alpha_composite(small.crop((sx, sy, min(small.width, CW - ox), min(small.height, CH - oy))), (max(0, ox), max(0, oy)))
    b = ink(small, 8); clipped = bool(b) and (ox + b[0] < 2 or oy + b[1] < 2 or ox + b[2] > CW - 2 or oy + b[3] > CH - 2)
    return cell, clipped

def layout(cells):
    trims = [(i, c.getchannel('A').getbbox()) for i, c in enumerate(cells)]
    order = sorted(trims, key=lambda t: -(t[1][3] - t[1][1])); x = y = shelf = 0; placed = {}
    for i, bb in order:
        x0, y0, x1, y1 = max(0, bb[0] - 1), max(0, bb[1] - 1), min(CW, bb[2] + 1), min(CH, bb[3] + 1); w, h = x1 - x0, y1 - y0
        if x + w > ATLAS_W: x, y, shelf = 0, y + shelf + 2, 0
        placed[i] = (x, y, x0, y0, w, h); x += w + 2; shelf = max(shelf, h)
    return placed, y + shelf

def main():
    idle = Image.open(ROOT + NAMES[0] + '.png').convert('RGBA'); fx, fy, ih = feet_of(idle); k = 1 / ih
    cells, bad = [], []
    for i, n in enumerate(NAMES):
        im = guardian.tidy(Image.open(ROOT + n + '.png').convert('RGBA'))
        s = IDLE_H * k; w, h = round(im.width * s), round(im.height * s)
        small = im.convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA')
        ay = ink(im)[3] if i < STANDING else fy        # the lowest ink (a sole, or the body where he is down)
        cell, clipped = place(small, fx * s, ay * s); cells.append(cell)
        if clipped: bad.append('%d %s reaches the 2 px cell gutter' % (i, n))
    g = Image.new('RGBA', (CW * COLS, CH * ROWS), (0, 0, 0, 0))
    for i, c in enumerate(cells): g.paste(c, ((i % COLS) * CW, (i // COLS) * CH))
    g.save('art/elite-anim/elite-grid.png', optimize=True)
    placed, H = layout(cells); img = Image.new('RGBA', (ATLAS_W, H), (0, 0, 0, 0)); frames = {}
    for i, c in enumerate(cells):
        ax, ay, x0, y0, w, h = placed[i]; img.paste(c.crop((x0, y0, x0 + w, y0 + h)), (ax, ay))
        frames[str(i)] = dict(frame=dict(x=ax, y=ay, w=w, h=h), rotated=False, trimmed=True, spriteSourceSize=dict(x=x0, y=y0, w=w, h=h), sourceSize=dict(w=CW, h=CH))
    img.save('public/assets/soldier-elite.png', optimize=True)
    json.dump(dict(frames=frames, meta=dict(image='soldier-elite.png', size=dict(w=ATLAS_W, h=H), scale='1', app='scripts/pack-elite-sheet.py', pivot=dict(x=PIVOT[0], y=PIVOT[1]))), open('public/assets/soldier-elite.json', 'w'), indent=1)
    print('idle in generator px: feet mid x=%.1f, soles y=%d, height %d; scale %.5f cell px per generator px' % (fx, fy, ih, IDLE_H * k))
    print('wrote public/assets/soldier-elite.png', img.size, '(%.2f MB RGBA, %.2f MB file)' % (ATLAS_W * H * 4 / 1048576, os.path.getsize('public/assets/soldier-elite.png') / 1048576))
    [print('WARN', b) for b in bad]

if __name__ == '__main__': main()
