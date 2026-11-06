#!/usr/bin/env python
"""Pack the Ballista V1.0 frames (art/ballista-anim/frames) into one trimmed Phaser atlas, public/assets/ballista-sheet.png + .json (frames "0".."9", each with a
336x320 source cell and the post pivot (PIVOT_X, 320); frame map in src/world/ballistaSprite.ts), and the untrimmed review grids art/ballista-anim/ballista-grid.png
(the ten frames) and ballista-poses.png (each mechanism pose over the intact base, then mirrored) for scripts/validate-ballista-sheet.py.
Usage: py scripts/pack-ballista-sheet.py
Needs Pillow only. master.png is the approved painting (a Codex repaint of the old canvas Ballista, art/ballista-anim/ref/ballista-template.png); the generator returns
every image at 1254x1254, the template canvas scaled by 1254/1024. Every frame goes through the Guardian packer's alpha tidy (never colour based) and one premultiplied
Lanczos resize onto the cell grid (S cell px per template px). The master is split on one cell row (CUT) into the intact base (frame 0, rows >= CUT) and the loaded
mechanism (frame 6, rows < CUT), so that the two layers redraw the master exactly; base frames 1-2 are generated base-only images (kept whole: whatever sticks out above the cut, such as an arrow, is hidden by the stock or stays) and mechanism frames
7-9 mechanism-only images (rows < CUT), whose post and boss columns (POST) from row SEAM down are the loaded mechanism's, so the post and boss under the stock never change; the collapse frames 3-5
are whole-machine images."""
import json, os
from importlib.machinery import SourceFileLoader
from PIL import Image

guardian = SourceFileLoader('pack_guardian', 'scripts/pack-guardian-sheet.py').load_module()
register = SourceFileLoader('ballista_register', 'scripts/ballista-register.py').load_module()
ROOT = 'art/ballista-anim/frames/'
CW, CH = 336, 320
S = 0.375                          # template px -> cell px
OFF = (26, 53)                     # the cell's top-left in small (1024 * S) px
CUT = 204                          # cell row: the base's first row and the mechanism's end (the template's y=686, the 1254 canvas's y=840)
SEAM = 181                         # mechanism frames take the loaded mechanism's rows from here: the post and the boss's lower half never move
POST = (112, 200)                  # the columns of the post and the boss: the loaded mechanism's pixels from SEAM down replace the pose's, so the post under the stock never changes
ATLAS_W = 1024

def lowest(im, t=20):
    return im.getchannel('A').point(lambda v: 255 if v > t else 0).getbbox()[3]

def to_cell(out):
    """A generator output (the template canvas at any square size) onto the cell: tidy, one premultiplied Lanczos resize, an integer crop."""
    n = round(1024 * S)
    small = guardian.tidy(out.convert('RGBA')).convert('RGBa').resize((n, n), Image.LANCZOS).convert('RGBA')
    return small.crop((OFF[0], OFF[1], OFF[0] + CW, OFF[1] + CH))

def rows(cell, y0, y1):
    c = Image.new('RGBA', cell.size, (0, 0, 0, 0)); c.alpha_composite(cell.crop((0, y0, CW, y1)), (0, y0)); return c

def main():
    fired = Image.open(ROOT + 'mech-fired.png').convert('RGBA')
    def load(n):
        im = Image.open(ROOT + n).convert('RGBA')
        if im.size != fired.size: im, k, at = register.fit(im, fired); print('%s: came back at another canvas size; registered on the boss (scale %.3f, offset %s)' % (n, k, at))
        return to_cell(im)
    master = load('master.png')
    base0, mech0 = rows(master, CUT, CH), rows(master, 0, CUT)
    cells = [base0, load('base-damaged.png'), load('base-critical.png'),
             load('collapse-1.png'), load('collapse-2.png'), load('collapse-3.png'), mech0]
    for n in ('mech-fired.png', 'mech-recoil.png', 'mech-reload.png'):
        m = load(n); m = rows(m, 0, CUT); m.alpha_composite(rows(mech0, SEAM, CUT).crop((POST[0], 0, POST[1], CH)), (POST[0], 0)); cells.append(m)
    # the pivot: the post's centre in the intact base's top rows
    bb = base0.crop((0, CUT, CW, CUT + 8)).getchannel('A').point(lambda v: 255 if v >= 128 else 0).getbbox()
    pivot = round((bb[0] + bb[2]) / 2)
    for i, c in enumerate(cells):
        b = c.getchannel('A').point(lambda v: 255 if v >= 8 else 0).getbbox()
        if b and (b[0] < 1 or b[1] < 1 or b[2] > CW - 1 or b[3] > CH - 1): print('NOTE frame %d reaches the cell edge' % i, b)
    g = Image.new('RGBA', (CW * len(cells), CH), (0, 0, 0, 0))
    for i, c in enumerate(cells): g.paste(c, (i * CW, 0))
    g.save('art/ballista-anim/ballista-grid.png', optimize=True)
    poses = Image.new('RGBA', (CW * 8, CH), (0, 0, 0, 0))
    for i, f in enumerate((6, 7, 8, 9)):
        for j, flip in enumerate((False, True)):
            p = base0.copy(); m = cells[f]
            if flip:   # mirrored about the post, as the game draws it
                m = m.transpose(Image.FLIP_LEFT_RIGHT); sh = round(2 * pivot - (CW - 1)); t = Image.new('RGBA', m.size, (0, 0, 0, 0)); t.alpha_composite(m, (sh, 0)); m = t
            p.alpha_composite(m); poses.paste(p, ((i * 2 + j) * CW, 0))
    poses.save('art/ballista-anim/ballista-poses.png', optimize=True)
    trims = [(i, c.getchannel('A').getbbox()) for i, c in enumerate(cells)]
    order = sorted(trims, key=lambda t: -(t[1][3] - t[1][1])); x = y = shelf = 0; place = {}
    for i, bb in order:
        x0, y0, x1, y1 = max(0, bb[0] - 1), max(0, bb[1] - 1), min(CW, bb[2] + 1), min(CH, bb[3] + 1); w, h = x1 - x0, y1 - y0
        if x + w > ATLAS_W: x, y, shelf = 0, y + shelf + 2, 0
        place[i] = (x, y, x0, y0, w, h); x += w + 2; shelf = max(shelf, h)
    H = y + shelf; img = Image.new('RGBA', (ATLAS_W, H), (0, 0, 0, 0)); frames = {}
    for i, c in enumerate(cells):
        ax, ay, x0, y0, w, h = place[i]; img.paste(c.crop((x0, y0, x0 + w, y0 + h)), (ax, ay))
        frames[str(i)] = dict(frame=dict(x=ax, y=ay, w=w, h=h), rotated=False, trimmed=True, spriteSourceSize=dict(x=x0, y=y0, w=w, h=h), sourceSize=dict(w=CW, h=CH))
    img.save('public/assets/ballista-sheet.png', optimize=True)
    json.dump(dict(frames=frames, meta=dict(image='ballista-sheet.png', size=dict(w=ATLAS_W, h=H), scale='1', pivot=dict(x=pivot, y=CH), app='scripts/pack-ballista-sheet.py')), open('public/assets/ballista-sheet.json', 'w'), indent=1)
    print('pivot x =', pivot, '; wrote public/assets/ballista-sheet.png', img.size, '(%.2f MB RGBA, %.2f MB file)' % (ATLAS_W * H * 4 / 1048576, os.path.getsize('public/assets/ballista-sheet.png') / 1048576))

if __name__ == '__main__': main()
