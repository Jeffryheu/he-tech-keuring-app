// Gedeelde hulpfuncties voor de PDF-rapporten (pdf.js en inspectierapport.js).

// De standaardfonts van pdf-lib kennen alleen WinAnsi-tekens; vervang wat daarbuiten valt.
export function saniteerVoorPdf(tekst, font) {
  const vlak = String(tekst ?? '')
    .replace(/\r\n|\r|\n/g, ' ')
    .replace(/Ω/g, 'Ohm')
    .replace(/∞/g, 'oneindig');
  try {
    font.widthOfTextAtSize(vlak, 1);
    return vlak;
  } catch {
    return Array.from(vlak).map((ch) => {
      try { font.widthOfTextAtSize(ch, 1); return ch; } catch { return '?'; }
    }).join('');
  }
}

export function truncateText(tekst, font, size, maxWidth) {
  let vlak = String(tekst ?? '');
  if (font.widthOfTextAtSize(vlak, size) <= maxWidth) return vlak;
  while (vlak.length > 1 && font.widthOfTextAtSize(`${vlak}…`, size) > maxWidth) {
    vlak = vlak.slice(0, -1);
  }
  return `${vlak}…`;
}

export function wrapText(tekst, font, size, maxWidth) {
  const woorden = String(tekst).split(' ');
  const regels = [];
  let huidigeRegel = '';
  for (const woord of woorden) {
    const kandidaat = huidigeRegel ? `${huidigeRegel} ${woord}` : woord;
    if (font.widthOfTextAtSize(kandidaat, size) > maxWidth && huidigeRegel) {
      regels.push(huidigeRegel);
      huidigeRegel = woord;
    } else {
      huidigeRegel = kandidaat;
    }
  }
  if (huidigeRegel) regels.push(huidigeRegel);
  return regels;
}

export function datumNl(iso) {
  if (!iso) return '';
  const [j, m, d] = iso.split('-');
  return `${d}-${m}-${j}`;
}
