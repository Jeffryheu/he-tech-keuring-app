"""Eenmalig dev-script: genereert de PWA-iconen en het rapport-logo.
Geen runtime-dependency van de app zelf. Run: python generate_icons.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

ASSETS = Path(__file__).resolve().parent / "assets"
GROEN = (11, 138, 92, 255)  # #0b8a5c, zelfde als --color-green in css/styles.css
WIT = (255, 255, 255, 255)


def teken_bolt(afmeting):
    img = Image.new("RGBA", (afmeting, afmeting), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    radius = round(afmeting * 0.18)
    draw.rounded_rectangle([0, 0, afmeting - 1, afmeting - 1], radius=radius, fill=GROEN)
    s = afmeting
    bliksem = [
        (s * 0.55, s * 0.15),
        (s * 0.30, s * 0.55),
        (s * 0.46, s * 0.55),
        (s * 0.40, s * 0.85),
        (s * 0.68, s * 0.42),
        (s * 0.52, s * 0.42),
    ]
    draw.polygon(bliksem, fill=WIT)
    return img


def main():
    (ASSETS / "icons").mkdir(parents=True, exist_ok=True)
    for naam, afmeting in [("icon-192.png", 192), ("icon-512.png", 512), ("apple-touch-icon.png", 180)]:
        teken_bolt(afmeting).save(ASSETS / "icons" / naam)
    teken_bolt(512).save(ASSETS / "logo-mark.png")
    print("Iconen en logo gegenereerd in", ASSETS)


if __name__ == "__main__":
    main()
