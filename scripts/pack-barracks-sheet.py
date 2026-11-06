#!/usr/bin/env python
"""Pack the Barracks V1.0 frames (one Azure Barracks master, art/barracks-anim/frames) into one trimmed Phaser atlas, public/assets/barracks-sheet.png + .json
(frames "0".."6", each with the still's own 384x372 source cell and the bottom-centre pivot (192,372); frame map in src/world/barracksSprite.ts), and the untrimmed review
grid art/barracks-anim/barracks-grid.png for scripts/validate-barracks-sheet.py. The Crimson Barracks keeps its still.
Usage: py scripts/pack-barracks-sheet.py
Needs Pillow only. Frame 0 is public/assets/barracks-azure.png itself, pasted unchanged (it fills the cell). Frames 1-6 are Codex edits of
art/barracks-anim/ref/barracks-template.png (the still at 2x Lanczos, 768x744 at (128,196) on 1024x1024); the generator returns them at 1254x1254, the same picture
scaled by 1254/1024. Each goes through the Guardian packer's alpha tidy (never colour based) and one premultiplied Lanczos resize onto the still's pixel grid (1/2 of the
template), so a frame that keeps the template's outline lands on the still's pixels."""
import json, sys
from importlib.machinery import SourceFileLoader
from PIL import Image

guardian = SourceFileLoader('pack_guardian', 'scripts/pack-guardian-sheet.py').load_module()
ROOT = 'art/barracks-anim/frames/'
CW, CH, COLS = 384, 372, 7
AT = (128, 196)                    # the still's top-left in template px
S = 0.5                            # template px -> cell px
ATLAS_W = 1536
# file, vertical correction in cell px (None: put the frame's lowest row on the intact building's lowest row)
FRAMES = [('01-recruiting.png', 0), ('02-damaged.png', 0), ('03-badly-damaged.png', 0), ('04-collapse-1.png', 0), ('05-collapse-2.png', 0), ('06-rubble.png', 0)]

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
    intact = Image.open('public/assets/barracks-azure.png').convert('RGBA')
    assert intact.size == (CW, CH)
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
    g.save('art/barracks-anim/barracks-grid.png', optimize=True)
    place, H = layout(cells); img = Image.new('RGBA', (ATLAS_W, H), (0, 0, 0, 0)); frames = {}
    for i, c in enumerate(cells):
        ax, ay, x0, y0, w, h = place[i]; img.paste(c.crop((x0, y0, x0 + w, y0 + h)), (ax, ay))
        frames[str(i)] = dict(frame=dict(x=ax, y=ay, w=w, h=h), rotated=False, trimmed=True, spriteSourceSize=dict(x=x0, y=y0, w=w, h=h), sourceSize=dict(w=CW, h=CH))
    img.save('public/assets/barracks-sheet.png', optimize=True)
    json.dump(dict(frames=frames, meta=dict(image='barracks-sheet.png', size=dict(w=ATLAS_W, h=H), scale='1', app='scripts/pack-barracks-sheet.py')), open('public/assets/barracks-sheet.json', 'w'), indent=1)
    import os
    print('\n'.join(info)); print('wrote public/assets/barracks-sheet.png', img.size, '(%.2f MB RGBA, %.2f MB file)' % (ATLAS_W * H * 4 / 1048576, os.path.getsize('public/assets/barracks-sheet.png') / 1048576))

if __name__ == '__main__': main()
