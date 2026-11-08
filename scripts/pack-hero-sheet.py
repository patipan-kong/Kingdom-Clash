#!/usr/bin/env python
"""Pack the Crimson Hero V1.0 frames (art/hero-anim/frames, one master: 00-idle.png, and 13 edits of it) into one trimmed Phaser atlas, public/assets/soldier-hero.png + .json
(frames "0".."13", each with a CWxCH source cell and the feet pivot at PIVOT; frame map SF and geometry HERO_SHEET in src/world/soldierSprite.ts), and the untrimmed 5x3 review grid
art/hero-anim/hero-grid.png for scripts/validate-hero-sheet.py. One sheet serves every Crimson Hero-class unit (the Frost Warlord, Crimson Hero, Raider Hero, Defender Hero / Crimson Lord and
the Iron Marshal, who is the same sheet drawn larger).
Usage: py scripts/pack-hero-sheet.py
Needs Pillow only. Per frame: the Guardian packer's alpha tidy (never colour based), ONE uniform premultiplied Lanczos resize (the same scale for every frame: the idle silhouette, horn tip to the
axe's lowest point, is IDLE_H cell px), an integer translation of the ground anchor onto the pivot. The anchor is the idle's boot midpoint in the generator's frame (FEET_X: the generator keeps the
warlord where the template put him). The ground line is the sole of the planted rear boot (the lowest ink in the columns right of the axe head, from GROUND_COL: the axe's lowest blade hangs a few px
below the boots, and well below them in the lunge, and must not lift the body), and for a frame he is down in the lowest ink right of the axe lying in front of him (DOWN_COL). The pivot stands GROUND_GAP cell px below that line (the old still's feet
stood that far above its bottom edge, where the pivot is)."""
import json, os, sys
from importlib.machinery import SourceFileLoader
from PIL import Image

guardian = SourceFileLoader('pack_guardian', 'scripts/pack-guardian-sheet.py').load_module()
ROOT = 'art/hero-anim/frames/'
CW, CH, COLS, ROWS, FRAMES = 408, 360, 5, 3, 14
PIVOT = (230, 326)
GROUND_GAP = 7
IDLE_H = 215
FEET_X = 717            # the idle's boot midpoint in the generator's 1254 px frame
GROUND_COL = 640        # standing frames: the ground line is the lowest ink right of here (the rear boot)
ATLAS_W = 1152
NAMES = ['00-idle'] + ['%02d-walk%d' % (i, i) for i in range(1, 7)] + ['07-attack1', '08-attack2', '09-attack3', '10-hurt', '11-death1', '12-death2', '13-death3']
DOWN_COL = {11: 350, 12: 420, 13: 520}   # a frame he is down in: the ground line is the lowest ink right of the axe lying in front of him

def ink(im, t=128): return im.getchannel('A').point(lambda v: 255 if v >= t else 0).getbbox()

def place(small, ax, ay):
    ox, oy = round(PIVOT[0] - ax), round(PIVOT[1] - GROUND_GAP - ay + 1)
    cell = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    sx, sy = max(0, -ox), max(0, -oy)
    cell.alpha_composite(small.crop((sx, sy, min(small.width, CW - ox), min(small.height, CH - oy))), (max(0, ox), max(0, oy)))
    b = ink(small, 8); clipped = bool(b) and (ox + b[0] < 2 or oy + b[1] < 2 or ox + b[2] > CW - 2 or oy + b[3] > CH - 2)
    return cell, clipped, (ox + b[0], oy + b[1], ox + b[2], oy + b[3])

def layout(cells):
    trims = [(i, c.getchannel('A').getbbox()) for i, c in enumerate(cells)]
    order = sorted(trims, key=lambda t: -(t[1][3] - t[1][1])); x = y = shelf = 0; placed = {}
    for i, bb in order:
        x0, y0, x1, y1 = max(0, bb[0] - 1), max(0, bb[1] - 1), min(CW, bb[2] + 1), min(CH, bb[3] + 1); w, h = x1 - x0, y1 - y0
        if x + w > ATLAS_W: x, y, shelf = 0, y + shelf + 2, 0
        placed[i] = (x, y, x0, y0, w, h); x += w + 2; shelf = max(shelf, h)
    return placed, y + shelf

def main():
    idle = Image.open(ROOT + NAMES[0] + '.png').convert('RGBA'); bb = ink(idle); k = IDLE_H / (bb[3] - bb[1])
    cells, bad, env, lines = [], [], [0, 0, 0, 0], []
    for i, n in enumerate(NAMES):
        raw = Image.open(ROOT + n + '.png').convert('RGBA'); assert raw.width == 1254, '%s is %d px wide, expected 1254' % (n, raw.width)
        im = guardian.tidy(raw)
        col = DOWN_COL.get(i, GROUND_COL); ground = ink(im.crop((col, 0, im.width, im.height)))[3]
        w, h = round(im.width * k), round(im.height * k)
        small = im.convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA')
        cell, clipped, b = place(small, FEET_X * k, ground * k); cells.append(cell); lines.append('%s ground=%d' % (n, ground))
        if clipped: bad.append('%d %s reaches the 2 px cell gutter' % (i, n))
        env = [max(env[0], PIVOT[0] - b[0]), max(env[1], PIVOT[1] - GROUND_GAP - b[1]), max(env[2], b[2] - PIVOT[0]), max(env[3], b[3] - (PIVOT[1] - GROUND_GAP))]
    g = Image.new('RGBA', (CW * COLS, CH * ROWS), (0, 0, 0, 0))
    for i, c in enumerate(cells): g.paste(c, ((i % COLS) * CW, (i // COLS) * CH))
    g.save('art/hero-anim/hero-grid.png', optimize=True)
    placed, H = layout(cells); img = Image.new('RGBA', (ATLAS_W, H), (0, 0, 0, 0)); frames = {}
    for i, c in enumerate(cells):
        ax, ay, x0, y0, w, h = placed[i]; img.paste(c.crop((x0, y0, x0 + w, y0 + h)), (ax, ay))
        frames[str(i)] = dict(frame=dict(x=ax, y=ay, w=w, h=h), rotated=False, trimmed=True, spriteSourceSize=dict(x=x0, y=y0, w=w, h=h), sourceSize=dict(w=CW, h=CH))
    img.save('public/assets/soldier-hero.png', optimize=True)
    json.dump(dict(frames=frames, meta=dict(image='soldier-hero.png', size=dict(w=ATLAS_W, h=H), scale='1', app='scripts/pack-hero-sheet.py', pivot=dict(x=PIVOT[0], y=PIVOT[1]))), open('public/assets/soldier-hero.json', 'w'), indent=1)
    print('scale %.5f cell px per generator px; envelope around the pivot (cell px): left %d up %d right %d below %d' % (k, env[0], env[1], env[2], env[3]))
    print('wrote public/assets/soldier-hero.png', img.size, '(%.2f MB RGBA, %.2f MB file)' % (ATLAS_W * H * 4 / 1048576, os.path.getsize('public/assets/soldier-hero.png') / 1048576))
    [print('WARN', b) for b in bad]

if __name__ == '__main__': main()
