# Tower V1.0: the intact building with an empty platform. The approved painting (art/tower-anim/ref/tower-template.png) everywhere except where the archer
# stood: there, Codex's "archer removed" edit (frames/body-intact.png), blended in through a feathered mask of the pixels that changed inside the archer's box.
# Output: art/tower-anim/frames/00-intact.png (template canvas, 1024x1536) and the mask for review.
from PIL import Image, ImageChops, ImageFilter
import sys
root = 'art/tower-anim/'
template = Image.open(root + 'ref/tower-template.png').convert('RGBA')
edit = Image.open(root + 'frames/body-intact.png').convert('RGBA')
BOX = (395, 640, 690, 875)  # the archer, his bow and arrow, in template px (template = source x1.6 + (250, 302))
diff = ImageChops.difference(template, edit)
r, g, b, a = diff.split()
d = ImageChops.lighter(ImageChops.lighter(r, g), ImageChops.lighter(b, a))
box = Image.new('L', template.size, 0)
box.paste(255, BOX)
changed = ImageChops.multiply(d.point(lambda v: 255 if v > 40 else 0), box)
mask = changed.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(4))
mask = ImageChops.multiply(mask, box.filter(ImageFilter.GaussianBlur(3)))
out = Image.composite(edit, template, mask)
out.save(root + 'frames/00-intact.png')
mask.save(root + 'ref/intact-mask.png')
print('mask px >0:', sum(1 for v in mask.get_flattened_data() if v > 0))
