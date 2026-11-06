#!/usr/bin/env python
"""Pack the Tavern V1.0 frames (one Azure Tavern master, art/tavern-anim/frames) into one trimmed Phaser atlas, public/assets/tavern-sheet.png + .json
(frames "0".."7", each with one 288x278 source cell (the still at 0.75x) and the bottom-centre pivot (144,278); frame map in src/world/tavernSprite.ts), and the untrimmed
review grid art/tavern-anim/tavern-grid.png for scripts/validate-tavern-sheet.py.
Usage: py scripts/pack-tavern-sheet.py
Needs Pillow only. Frame 0 is public/assets/tavern.png itself (384x371) through the same premultiplied Lanczos resize to the cell. Frames 1-7 are Codex edits of
art/tavern-anim/ref/tavern-template.png (the still at 2x Lanczos, 768x742 at (128,198) on 1024x1024); the generator returns them at any square size, the same picture scaled.
Each goes through the Guardian packer's alpha tidy (never colour based) and one premultiplied Lanczos resize onto the cell's pixel grid (0.375 of the template), so a frame
that keeps the template's outline lands on frame 0's pixels."""
import json, sys
from importlib.machinery import SourceFileLoader
from PIL import Image

guardian = SourceFileLoader('pack_guardian', 'scripts/pack-guardian-sheet.py').load_module()
ROOT = 'art/tavern-anim/frames/'
CW, CH, COLS = 288, 278, 8
AT = (128, 198)                    # the still's top-left in template px
S = 0.375                          # template px -> cell px (2x still, then 0.75x)
ATLAS_W = 1152
FRAMES = [('01-hire.png', 0), ('02-revive.png', 0), ('03-damaged.png', 0), ('04-badly-damaged.png', 0), ('05-collapse-1.png', 0), ('06-collapse-2.png', 0), ('07-rubble.png', 0)]

def lowest(im, t=20):
    return im.getchannel('A').point(lambda v: 255 if v > t else 0).getbbox()[3]

def to_cell(out):
    """A generator output (the template canvas at any square size) onto the cell: one premultiplied Lanczos resize, an integer paste."""
    k = 1024 / out.width; w, h = round(out.width * k * S), round(out.height * k * S)
    small = out.convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA')
    ox, oy = round(-AT[0] * S), round(-AT[1] * S)
    cell = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); cell.alpha_composite(small.crop((-ox, -oy, -ox + CW, -oy + CH)), (0, 0))
    return cell

def shifted(cell, dy):
    if not dy: return cell
    c = Image.new('RGBA', cell.size, (0, 0, 0, 0)); c.alpha_composite(cell.crop((0, -dy, CW, CH - dy)), (0, 0)); return c

def layout(cells):
    trims = [(i, c.getchannel('A').getbbox()) for i, c in enumerate(cells)]
    order = sorted(trims, key=lambda t: -(t[1][3] - t[1][1])); x = y = shelf = 0; place = {}
    for i, bb in order:
        x0, y0, x1, y1 = max(0, bb[0] - 1), max(0, bb[1] - 1), min(CW, bb[2] + 1), min(CH, bb[3] + 1); w, h = x1 - x0, y1 - y0
        if x + w > ATLAS_W: x, y, shelf = 0, y + shelf + 2, 0
        place[i] = (x, y, x0, y0, w, h); x += w + 2; shelf = max(shelf, h)
    return place, y + shelf

def main():
    still = Image.open('public/assets/tavern.png').convert('RGBA')
    assert still.size == (384, 371)
    intact = still.convert('RGBa').resize((CW, CH), Image.LANCZOS).convert('RGBA')   # the still at 0.75x (384x371 -> 288x278)
    cells, info, ground = [intact], [], lowest(intact)
    for name, dy in FRAMES:
        c = to_cell(guardian.tidy(Image.open(ROOT + name).convert('RGBA')))
        if dy is None: dy = ground - lowest(c)
        cells.append(shifted(c, dy)); info.append('%s dy=%d' % (name, dy))
    for i, c in enumerate(cells):
        bb = c.getchannel('A').point(lambda v: 255 if v >= 8 else 0).getbbox()
        if bb and (bb[0] < 1 or bb[1] < 1 or bb[2] > CW - 1 or bb[3] > CH - 1): print('NOTE frame %d reaches the cell edge' % i, bb)
    g = Image.new('RGBA', (CW * COLS, CH), (0, 0, 0, 0))
    for i, c in enumerate(cells): g.paste(c, (i * CW, 0))
    g.save('art/tavern-anim/tavern-grid.png', optimize=True)
    place, H = layout(cells); img = Image.new('RGBA', (ATLAS_W, H), (0, 0, 0, 0)); frames = {}
    for i, c in enumerate(cells):
        ax, ay, x0, y0, w, h = place[i]; img.paste(c.crop((x0, y0, x0 + w, y0 + h)), (ax, ay))
        frames[str(i)] = dict(frame=dict(x=ax, y=ay, w=w, h=h), rotated=False, trimmed=True, spriteSourceSize=dict(x=x0, y=y0, w=w, h=h), sourceSize=dict(w=CW, h=CH))
    img.save('public/assets/tavern-sheet.png', optimize=True)
    json.dump(dict(frames=frames, meta=dict(image='tavern-sheet.png', size=dict(w=ATLAS_W, h=H), scale='1', app='scripts/pack-tavern-sheet.py', pivot=dict(x=CW // 2, y=CH))), open('public/assets/tavern-sheet.json', 'w'), indent=1)
    import os
    print('\n'.join(info)); print('wrote public/assets/tavern-sheet.png', img.size, '(%.2f MB RGBA, %.2f MB file)' % (ATLAS_W * H * 4 / 1048576, os.path.getsize('public/assets/tavern-sheet.png') / 1048576))

if __name__ == '__main__': main()
