"""Eenmalig dev-script: genereert de PWA-iconen uit het echte He-Tech-beeldmerk
(assets/logo-mark-white-1024.png, gerasterd uit Kennis/HTE_elektro-logo--site.svg).
Geen runtime-dependency van de app zelf. Run: python generate_icons.py
"""
from pathlib import Path

from PIL import Image

ASSETS = Path(__file__).resolve().parent / "assets"
GROEN = (0, 122, 85, 255)  # #007a55, echte merkkleur uit het He-Tech-logo


def teken_icoon(afmeting, merk):
    img = Image.new("RGBA", (afmeting, afmeting), (0, 0, 0, 0))
    radius = round(afmeting * 0.18)
    achtergrond = Image.new("RGBA", (afmeting, afmeting), (0, 0, 0, 0))
    from PIL import ImageDraw
    ImageDraw.Draw(achtergrond).rounded_rectangle([0, 0, afmeting - 1, afmeting - 1], radius=radius, fill=GROEN)
    img.alpha_composite(achtergrond)

    merk_afmeting = round(afmeting * 0.62)
    merk_geschaald = merk.resize((merk_afmeting, merk_afmeting), Image.LANCZOS)
    positie = ((afmeting - merk_afmeting) // 2, (afmeting - merk_afmeting) // 2)
    img.alpha_composite(merk_geschaald, positie)
    return img


def main():
    merk = Image.open(ASSETS / "logo-mark-white-source.png").convert("RGBA")
    (ASSETS / "icons").mkdir(parents=True, exist_ok=True)
    for naam, afmeting in [("icon-192.png", 192), ("icon-512.png", 512), ("apple-touch-icon.png", 180)]:
        teken_icoon(afmeting, merk).save(ASSETS / "icons" / naam)
    print("Iconen gegenereerd in", ASSETS / "icons")


if __name__ == "__main__":
    main()
