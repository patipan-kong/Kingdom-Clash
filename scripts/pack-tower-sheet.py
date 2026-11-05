#!/usr/bin/env python
"""Pack the Tower V1.0 animation frames (one Azure Archer Tower master, art/tower-anim/frames) into one trimmed Phaser atlas, public/assets/tower-azure.png
+ .json (frames "0".."15", each with a 300x420 source cell and the feet pivot at (150,400); frame map in src/world/towerSprite.ts), and the untrimmed review
grid art/tower-anim/tower-grid.png for scripts/validate-tower-sheet.py. The Crimson sheet is made at load by the still's crimsonTowerPixels.
Usage: py scripts/pack-tower-sheet.py
Needs Pillow only. Building frames 0-5 are edits of the tower template (source x1.6, ground line y=1380); archer frames are edits of the 4x platform
template, placed on the tower template by that template's own geometry. Every frame goes through the Guardian packer's alpha tidy (never colour based)
and one premultiplied Lanczos resize onto the still's pixel grid (tower.png: the source tower at 188/327 x 384/674), so the intact building covers the
still's rectangle exactly. Archer: the right-facing set as painted, the left-facing set mirrored about his legs, both then cut at the front railing's top
edge, so the railing hides his legs whichever way he faces."""
import json
from importlib.machinery import SourceFileLoader
from PIL import Image, ImageDraw

guardian = SourceFileLoader('pack_guardian', 'scripts/pack-guardian-sheet.py').load_module()
ROOT = 'art/tower-anim/frames/'
CW, CH, COLS, ROWS = 300, 420, 6, 3
PIVOT = (150, 400)
ATLAS_W = 1024
SX, SY = (188 / 327) / 1.6, (384 / 674) / 1.6   # template px -> cell px (the still's own, slightly non-square, grid)
FEET = (250 + 163.5 * 1.6, 302 + 674 * 1.6)     # the still's bottom centre in template px
GROUND = 1376                                   # the intact feet's lowest opaque row in template px
# Building: file, vertical correction in template px (a collapse step that came back off the ground line is put back on it, by its lowest row).
BODY = [('00-intact.png', 0), ('01-damaged.png', 0), ('02-critical.png', 0), ('03-collapse1.png', 0), ('04-collapse2.png', None), ('05-collapse3.png', None)]
ARCHER = ['06-watch.png', 'archer-aim.png', '07-release.png', '08-nock.png', '09-draw.png']   # TA order: watch, aim, release, nock, draw
PLATFORM = dict(scale=0.4, at=(314 - 194 * 0.4, 590 - 72 * 0.4))   # platform template -> tower template (crop 40,180 of the source x4 at 194,72)
# The front railing's top edge in template px, left to right; the archer is hidden below it.
RAIL = [(240, 794), (340, 806), (400, 815), (460, 823), (520, 833), (600, 836), (700, 787), (740, 775), (800, 770)]

def lowest(im):
    a = im.getchannel('A').point(lambda v: 255 if v > 20 else 0); return a.getbbox()[3]

def to_cell(canvas):
    """A template-canvas image onto the cell: one premultiplied Lanczos resize, an integer paste. The same transform for every frame and layer."""
    w, h = round(canvas.width * SX), round(canvas.height * SY)
    small = canvas.convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA')
    ox, oy = round(PIVOT[0] - FEET[0] * SX), round(PIVOT[1] - FEET[1] * SY)
    cell = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); cell.alpha_composite(small.crop((-ox, -oy, -ox + CW, -oy + CH)), (0, 0))
    return cell

def body(name, dy):
    im = guardian.tidy(Image.open(ROOT + name).convert('RGBA'))
    if dy is None: dy = GROUND - lowest(im)
    canvas = Image.new('RGBA', (1024, 1536), (0, 0, 0, 0)); canvas.paste(im, (0, dy))
    return to_cell(canvas), dy

def legs_axis(im):
    """The x of the archer's legs (the lowest 120 px of the figure), in platform px: the mirror axis, the same for every frame."""
    a = im.getchannel('A'); bot = lowest(im); xs = [x for x in range(a.width) for y in range(bot - 120, bot, 4) if a.getpixel((x, y)) > 128]
    return (min(xs) + max(xs)) / 2

def rail_mask():
    m = Image.new('L', (1024, 1536), 255); d = ImageDraw.Draw(m)
    d.polygon([(0, RAIL[0][1])] + RAIL + [(1024, RAIL[-1][1]), (1024, 1536), (0, 1536)], fill=0); return m

def archer(name, mirror_x, mask):
    im = guardian.tidy(Image.open(ROOT + name).convert('RGBA'))
    s = PLATFORM['scale']; small = im.convert('RGBa').resize((round(im.width * s), round(im.height * s)), Image.LANCZOS).convert('RGBA')
    canvas = Image.new('RGBA', (1024, 1536), (0, 0, 0, 0)); canvas.alpha_composite(small, (round(PLATFORM['at'][0]), round(PLATFORM['at'][1])))
    out = []
    for flip in (False, True):
        c = canvas
        if flip:   # mirror about the legs: x -> 2*axis - x
            c = canvas.transpose(Image.FLIP_LEFT_RIGHT); shift = round(2 * mirror_x - 1023)
            moved = Image.new('RGBA', c.size, (0, 0, 0, 0)); moved.alpha_composite(c.crop((max(0, -shift), 0, min(1024, 1024 - shift), 1536)), (max(0, shift), 0)); c = moved
        a = Image.composite(c.getchannel('A'), Image.new('L', c.size, 0), mask); c = c.copy(); c.putalpha(a)
        out.append(to_cell(c))
    return out

def layout(cells):
    trims = [(i, c.getchannel('A').getbbox()) for i, c in enumerate(cells)]
    order = sorted(trims, key=lambda t: -(t[1][3] - t[1][1])); x = y = shelf = 0; place = {}
    for i, bb in order:
        x0, y0, x1, y1 = max(0, bb[0] - 1), max(0, bb[1] - 1), min(CW, bb[2] + 1), min(CH, bb[3] + 1); w, h = x1 - x0, y1 - y0
        if x + w > ATLAS_W: x, y, shelf = 0, y + shelf + 2, 0
        place[i] = (x, y, x0, y0, w, h); x += w + 2; shelf = max(shelf, h)
    return place, y + shelf

def main():
    cells, info = [], []
    for name, dy in BODY:
        c, used = body(name, dy); cells.append(c); info.append('%s dy=%d' % (name, used))
    aim = Image.open(ROOT + 'archer-aim.png').convert('RGBA'); axis_p = legs_axis(aim)
    axis_t = PLATFORM['at'][0] + axis_p * PLATFORM['scale']; mask = rail_mask()
    right, left = [], []
    for name in ARCHER:
        r, l = archer(name, axis_t, mask); right.append(r); left.append(l)
    cells += right + left
    for i, c in enumerate(cells):
        bb = c.getchannel('A').point(lambda v: 255 if v >= 8 else 0).getbbox()
        if bb and (bb[0] < 2 or bb[1] < 2 or bb[2] > CW - 2 or bb[3] > CH - 2): print('WARN frame %d reaches the 2 px cell gutter' % i, bb)
    g = Image.new('RGBA', (CW * COLS, CH * ROWS), (0, 0, 0, 0))
    for i, c in enumerate(cells): g.paste(c, ((i % COLS) * CW, (i // COLS) * CH))
    g.save('art/tower-anim/tower-grid.png', optimize=True)
    place, H = layout(cells); img = Image.new('RGBA', (ATLAS_W, H), (0, 0, 0, 0)); frames = {}
    for i, c in enumerate(cells):
        ax, ay, x0, y0, w, h = place[i]; img.paste(c.crop((x0, y0, x0 + w, y0 + h)), (ax, ay))
        frames[str(i)] = dict(frame=dict(x=ax, y=ay, w=w, h=h), rotated=False, trimmed=True, spriteSourceSize=dict(x=x0, y=y0, w=w, h=h), sourceSize=dict(w=CW, h=CH))
    img.save('public/assets/tower-azure.png', optimize=True)
    json.dump(dict(frames=frames, meta=dict(image='tower-azure.png', size=dict(w=ATLAS_W, h=H), scale='1', app='scripts/pack-tower-sheet.py')), open('public/assets/tower-azure.json', 'w'), indent=1)
    print('\n'.join(info)); print('archer mirror axis: platform x %.1f = template x %.1f' % (axis_p, axis_t))
    print('wrote public/assets/tower-azure.png', img.size, '(%.1f MB RGBA)' % (ATLAS_W * H * 4 / 1048576))

if __name__ == '__main__': main()
