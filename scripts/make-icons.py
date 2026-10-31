"""Generates the PWA icons into public/. Run: python3 scripts/make-icons.py"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public"
BG = (20, 20, 20, 255)  # #141414
FG = (230, 230, 230, 255)  # #e6e6e6
SS = 4


def draw_icon(size, rounded, glyph_scale):
    n = size * SS
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, n - 1, n - 1], radius=int(n * 0.22), fill=BG)
    else:
        d.rectangle([0, 0, n, n], fill=BG)

    k = n * glyph_scale / 100
    ox = oy = n * (1 - glyph_scale) / 2

    def p(x, y):
        return ox + x * k, oy + y * k

    pts = [p(28, 52), p(42, 68), p(72, 32)]
    w = max(int(8 * k), 2)
    d.line(pts, fill=FG, width=w, joint="curve")
    r = w / 2
    for x, y in pts:
        d.ellipse([x - r, y - r, x + r, y + r], fill=FG)

    return img.resize((size, size), Image.LANCZOS)


draw_icon(192, True, 0.72).save(OUT / "icon-192.png")
draw_icon(512, True, 0.72).save(OUT / "icon-512.png")
draw_icon(512, False, 0.56).save(OUT / "icon-maskable-512.png")
draw_icon(180, False, 0.66).save(OUT / "apple-touch-icon.png")
print("done")
