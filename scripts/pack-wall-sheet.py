#!/usr/bin/env python
"""Pack the Wall V1.0 frames (one wooden wall segment master, art/wall-anim/frames) into one trimmed Phaser atlas, public/assets/wall-wood.png + .json
(frames "0".."6", each with a 256x232 source cell and the base pivot at (128,224); frame map in src/world/wallSprite.ts), and the untrimmed review grid
art/wall-anim/wall-grid.png for scripts/validate-wall-sheet.py. The ice (Frost Gate) and ironwood (Cliff / Throne Gate, Gatehouses) sheets are made at
load by the stills' own frostGatePixels / cliffGatePixels, and a gate is drawn as one segment per footprint row.
Usage: py scripts/pack-wall-sheet.py
Needs Pillow only. Frame 0 is public/assets/wall.png itself, pasted unchanged where the still is drawn (its bottom centre on the pivot). Frames 1-6 are
Codex edits of art/wall-anim/ref/wall-template.png (the source crop behind wall.png, 665x724 at (180,216) on 1024x1024); the generator returns them at
1254x1254, the same picture scaled by 1254/1024. Each goes through the Guardian packer's alpha tidy (never colour based) and one premultiplied Lanczos
resize onto wall.png's pixel grid (176/665 x 192/724 of the template), so a frame that keeps the template's outline lands on the still's pixels."""
import json
from importlib.machinery import SourceFileLoader
from PIL import Image

guardian = SourceFileLoader('pack_guardian', 'scripts/pack-guardian-sheet.py').load_module()
ROOT = 'art/wall-anim/frames/'
CW, CH, COLS = 256, 232, 7
PIVOT = (128, 224)
WALL = (PIVOT[0] - 88, PIVOT[1] - 192)               # wall.png's top-left in the cell
ATLAS_W = 1024
SX, SY = 176 / 665, 192 / 724                         # template px -> cell px (wall.png's own grid)
AT = (180, 216)                                       # the wall's top-left in template px
# file, vertical correction in cell px (None: put the frame's lowest row on the intact wall's lowest row; rubble and breaking are re-grounded this way)
FRAMES = [('01-damaged.png', 0), ('02-badly-damaged.png', 0), ('03-breaking.png', None), ('04-rubble.png', None), ('05-ajar.png', 0), ('06-open.png', 0)]

def lowest(im, t=20):
    return im.getchannel('A').point(lambda v: 255 if v > t else 0).getbbox()[3]

def to_cell(out):
    """A generator output (the template canvas at any square size) onto the cell: one premultiplied Lanczos resize, an integer paste."""
    k = 1024 / out.width; w, h = round(out.width * k * SX), round(out.height * k * SY)
    small = out.convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA')
    ox, oy = round(WALL[0] - AT[0] * SX), round(WALL[1] - AT[1] * SY)
    cell = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); cell.alpha_composite(small.crop((-ox, -oy, -ox + CW, -oy + CH)), (0, 0))
    return cell

def shifted(cell, dy):
    if not dy: return cell
    c = Image.new('RGBA', cell.size, (0, 0, 0, 0)); c.alpha_composite(cell.crop((0, -dy, CW, CH - dy)) if dy > 0 else cell.crop((0, -dy, CW, CH - dy)), (0, 0)); return c

def layout(cells):
    trims = [(i, c.getchannel('A').getbbox()) for i, c in enumerate(cells)]
    order = sorted(trims, key=lambda t: -(t[1][3] - t[1][1])); x = y = shelf = 0; place = {}
    for i, bb in order:
        x0, y0, x1, y1 = max(0, bb[0] - 1), max(0, bb[1] - 1), min(CW, bb[2] + 1), min(CH, bb[3] + 1); w, h = x1 - x0, y1 - y0
        if x + w > ATLAS_W: x, y, shelf = 0, y + shelf + 2, 0
        place[i] = (x, y, x0, y0, w, h); x += w + 2; shelf = max(shelf, h)
    return place, y + shelf

def main():
    intact = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); intact.paste(Image.open('public/assets/wall.png').convert('RGBA'), WALL)
    cells, info, ground = [intact], [], lowest(intact)
    for name, dy in FRAMES:
        c = to_cell(guardian.tidy(Image.open(ROOT + name).convert('RGBA')))
        if dy is None: dy = ground - lowest(c)
        cells.append(shifted(c, dy)); info.append('%s dy=%d' % (name, dy))
    for i, c in enumerate(cells):
        bb = c.getchannel('A').point(lambda v: 255 if v >= 8 else 0).getbbox()
        if bb and (bb[0] < 2 or bb[1] < 2 or bb[2] > CW - 2 or bb[3] > CH - 2): print('WARN frame %d reaches the 2 px cell gutter' % i, bb)
    g = Image.new('RGBA', (CW * COLS, CH), (0, 0, 0, 0))
    for i, c in enumerate(cells): g.paste(c, (i * CW, 0))
    g.save('art/wall-anim/wall-grid.png', optimize=True)
    place, H = layout(cells); img = Image.new('RGBA', (ATLAS_W, H), (0, 0, 0, 0)); frames = {}
    for i, c in enumerate(cells):
        ax, ay, x0, y0, w, h = place[i]; img.paste(c.crop((x0, y0, x0 + w, y0 + h)), (ax, ay))
        frames[str(i)] = dict(frame=dict(x=ax, y=ay, w=w, h=h), rotated=False, trimmed=True, spriteSourceSize=dict(x=x0, y=y0, w=w, h=h), sourceSize=dict(w=CW, h=CH))
    img.save('public/assets/wall-wood.png', optimize=True)
    json.dump(dict(frames=frames, meta=dict(image='wall-wood.png', size=dict(w=ATLAS_W, h=H), scale='1', app='scripts/pack-wall-sheet.py')), open('public/assets/wall-wood.json', 'w'), indent=1)
    print('\n'.join(info)); print('wrote public/assets/wall-wood.png', img.size, '(%.2f MB RGBA)' % (ATLAS_W * H * 4 / 1048576))

if __name__ == '__main__': main()
