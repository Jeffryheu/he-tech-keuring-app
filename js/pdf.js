import { CHECKLISTS } from './checklists.js';

const { PDFDocument, StandardFonts, rgb } = window.PDFLib;

const GROEN = rgb(0x00 / 255, 0x7a / 255, 0x55 / 255);
const INKT = rgb(0x14 / 255, 0x18 / 255, 0x1a / 255);
const GRIJS = rgb(0x5b / 255, 0x63 / 255, 0x60 / 255);
const ROOD = rgb(0.7, 0.1, 0.1);
const A4 = [595.28, 841.89];
const MARGE = 50;

function saniteerVoorPdf(tekst, font) {
  const vlak = String(tekst ?? '').replace(/\r\n|\r|\n/g, ' ');
  try {
    font.widthOfTextAtSize(vlak, 1);
    return vlak;
  } catch {
    return Array.from(vlak).map((ch) => {
      try { font.widthOfTextAtSize(ch, 1); return ch; } catch { return '?'; }
    }).join('');
  }
}

function truncateText(tekst, font, size, maxWidth) {
  let vlak = String(tekst ?? '');
  if (font.widthOfTextAtSize(vlak, size) <= maxWidth) return vlak;
  while (vlak.length > 1 && font.widthOfTextAtSize(`${vlak}…`, size) > maxWidth) {
    vlak = vlak.slice(0, -1);
  }
  return `${vlak}…`;
}

function wrapText(tekst, font, size, maxWidth) {
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

export async function genereerRapport(keuring, fotos) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const logoBytes = await fetch('assets/logo-mark.png').then((res) => res.arrayBuffer());
  const logoImage = await pdfDoc.embedPng(logoBytes);
  const fotosPerId = new Map(fotos.map((f) => [f.id, f]));
  const checklist = CHECKLISTS[keuring.type];
  const breedte = A4[0] - MARGE * 2;

  let page = pdfDoc.addPage(A4);
  let y = A4[1] - MARGE;

  function nieuwePagina() {
    page = pdfDoc.addPage(A4);
    y = A4[1] - MARGE;
  }

  function zorgVoorRuimte(hoogteNodig) {
    if (y - hoogteNodig < MARGE) nieuwePagina();
  }

  // Header
  page.drawImage(logoImage, { x: MARGE, y: y - 40, width: 40, height: 40 });
  page.drawText('He-Tech Elektro', { x: MARGE + 50, y: y - 15, size: 16, font: fontBold, color: GROEN });
  page.drawText(`${checklist.label} (${checklist.subtitel})`, { x: MARGE + 50, y: y - 33, size: 11, font, color: GRIJS });
  y -= 60;

  // Kopgegevens
  const kopregels = keuring.type === 'lmra'
    ? [`Werkzaamheden: ${saniteerVoorPdf(keuring.werkzaamheden, font) || '-'}`, `Betrokkenen: ${saniteerVoorPdf(keuring.betrokkenen, font) || '-'}`, `Datum: ${keuring.datum}`]
    : [`Klant: ${saniteerVoorPdf(keuring.klant.naam, font) || '-'}`, `Adres: ${saniteerVoorPdf(keuring.klant.adres, font) || '-'}`, `Datum: ${keuring.datum}`, `Monteur: ${saniteerVoorPdf(keuring.monteur, font) || '-'}`];
  kopregels.forEach((regel) => {
    page.drawText(regel, { x: MARGE, y, size: 11, font, color: INKT });
    y -= 16;
  });
  y -= 10;

  // Samenvatting
  const aantalAfgekeurd = keuring.items.filter((item) => item.resultaat === 'afgekeurd').length;
  page.drawText(`Samenvatting: ${keuring.items.length} punten gecontroleerd, ${aantalAfgekeurd} afgekeurd.`, {
    x: MARGE, y, size: 11, font: fontBold, color: aantalAfgekeurd > 0 ? ROOD : GROEN,
  });
  y -= 24;

  // Groepentabel
  if (keuring.type !== 'lmra' && keuring.groepen && keuring.groepen.length > 0) {
    const KOLOMMEN = [
      { label: 'Groep', x: 0, w: 22 },
      { label: 'Naam', x: 24, w: 80 },
      { label: 'L1-PE', x: 106, w: 42 },
      { label: 'L2-PE', x: 150, w: 42 },
      { label: 'L3-PE', x: 194, w: 42 },
      { label: 'N-PE', x: 238, w: 42 },
      { label: 'Zs (Ohm)', x: 282, w: 40 },
      { label: 'Zek/Ø', x: 324, w: 65 },
      { label: 'Aardlek', x: 391, w: 104 },
    ];
    zorgVoorRuimte(40);
    page.drawText('Groepen & meetgegevens', { x: MARGE, y, size: 13, font: fontBold, color: GROEN });
    y -= 18;
    page.drawText('Isolatieweerstand in MOhm', { x: MARGE, y, size: 8, font, color: GRIJS });
    y -= 12;
    KOLOMMEN.forEach((kol) => page.drawText(kol.label, { x: MARGE + kol.x, y, size: 8, font: fontBold, color: INKT }));
    y -= 4;
    page.drawLine({ start: { x: MARGE, y }, end: { x: MARGE + breedte, y }, thickness: 0.5, color: GRIJS });
    y -= 12;

    for (const groep of keuring.groepen) {
      zorgVoorRuimte(24);
      const driefase = groep.fase === '3-fase';
      const zekDoorsnede = [groep.zekering ? `${groep.zekering}A` : '', groep.aderdoorsnede ? `${groep.aderdoorsnede}mm²` : '']
        .filter(Boolean).join(' / ');
      const aardlekTekst = groep.aardlekAanwezig
        ? `${groep.aardlek.iDeltaN || '?'}mA / ${groep.aardlek.tijd || '?'}ms ${groep.aardlek.testknop === 'afgekeurd' ? 'FOUT' : groep.aardlek.testknop === 'ok' ? 'OK' : ''}`
        : '-';
      const waarden = [
        String(groep.nummer ?? ''),
        truncateText(saniteerVoorPdf(groep.naam, font), font, 8, 78),
        groep.isolatie.l1pe || '',
        driefase ? (groep.isolatie.l2pe || '') : '',
        driefase ? (groep.isolatie.l3pe || '') : '',
        groep.isolatie.npe || '',
        groep.zs || '',
        truncateText(zekDoorsnede, font, 8, 63),
        truncateText(saniteerVoorPdf(aardlekTekst, font), font, 8, 102),
      ];
      const rijKleur = groep.aardlekAanwezig && groep.aardlek.testknop === 'afgekeurd' ? ROOD : INKT;
      KOLOMMEN.forEach((kol, i) => page.drawText(waarden[i], { x: MARGE + kol.x, y, size: 8, font, color: rijKleur }));
      y -= 12;

      if (groep.opmerking) {
        const opmerkingRegels = wrapText(`Opmerking: ${saniteerVoorPdf(groep.opmerking, font)}`, font, 8, breedte - 10);
        zorgVoorRuimte(opmerkingRegels.length * 11);
        opmerkingRegels.forEach((regel, i) => page.drawText(regel, { x: MARGE + 10, y: y - i * 11, size: 8, font, color: GRIJS }));
        y -= opmerkingRegels.length * 11;
      }
      y -= 4;
    }
    y -= 12;
  }

  // Items per categorie
  for (const categorie of checklist.categorieen) {
    const items = keuring.items.filter((item) => item.categorie === categorie.naam);
    if (items.length === 0) continue;
    zorgVoorRuimte(30);
    page.drawText(categorie.naam, { x: MARGE, y, size: 13, font: fontBold, color: GROEN });
    y -= 18;

    for (const item of items) {
      const resultaatLabel = item.resultaat || 'niet beoordeeld';
      const meetwaardeTekst = item.meeteenheid && item.meetwaarde
        ? ` — ${saniteerVoorPdf(item.meetwaarde, font)} ${item.meeteenheid}`
        : '';
      const omschrijvingRegels = wrapText(`[${resultaatLabel}] ${item.omschrijving}${meetwaardeTekst}`, font, 10, breedte);
      zorgVoorRuimte(omschrijvingRegels.length * 13 + 10);
      const kleur = item.resultaat === 'afgekeurd' ? ROOD : INKT;
      omschrijvingRegels.forEach((regel, i) => page.drawText(regel, { x: MARGE, y: y - i * 13, size: 10, font, color: kleur }));
      y -= omschrijvingRegels.length * 13;

      if (item.opmerking) {
        const opmerkingRegels = wrapText(`Opmerking: ${saniteerVoorPdf(item.opmerking, font)}`, font, 9, breedte - 10);
        zorgVoorRuimte(opmerkingRegels.length * 12);
        opmerkingRegels.forEach((regel, i) => page.drawText(regel, { x: MARGE + 10, y: y - i * 12, size: 9, font, color: GRIJS }));
        y -= opmerkingRegels.length * 12;
      }

      for (const fotoId of item.fotoIds) {
        const foto = fotosPerId.get(fotoId);
        if (!foto) continue;
        const bytes = await foto.blob.arrayBuffer();
        const image = await pdfDoc.embedJpg(bytes);
        const schaal = Math.min(150 / image.width, 150 / image.height, 1);
        const w = image.width * schaal;
        const h = image.height * schaal;
        zorgVoorRuimte(h + 10);
        page.drawImage(image, { x: MARGE + 10, y: y - h, width: w, height: h });
        y -= h + 10;
      }
      y -= 6;
    }
    y -= 10;
  }

  if (keuring.algemeneOpmerkingen) {
    const regels = wrapText(saniteerVoorPdf(keuring.algemeneOpmerkingen, font), font, 10, breedte);
    zorgVoorRuimte(regels.length * 13 + 20);
    page.drawText('Algemene opmerkingen', { x: MARGE, y, size: 12, font: fontBold, color: GROEN });
    y -= 16;
    regels.forEach((regel, i) => page.drawText(regel, { x: MARGE, y: y - i * 13, size: 10, font, color: INKT }));
    y -= regels.length * 13;
  }

  if (keuring.type !== 'lmra') {
    const conclusieTekst = aantalAfgekeurd === 0
      ? `Conclusie: de installatie voldoet aan de eisen van ${checklist.subtitel}.`
      : `Conclusie: de installatie voldoet niet volledig aan de eisen van ${checklist.subtitel} — zie geconstateerde gebreken hierboven. Herstel wordt geadviseerd.`;
    const conclusieRegels = wrapText(conclusieTekst, fontBold, 12, breedte);
    zorgVoorRuimte(conclusieRegels.length * 15 + 10);
    const conclusieKleur = aantalAfgekeurd > 0 ? ROOD : GROEN;
    conclusieRegels.forEach((regel, i) => page.drawText(regel, { x: MARGE, y: y - i * 15, size: 12, font: fontBold, color: conclusieKleur }));
    y -= conclusieRegels.length * 15 + 10;
  }

  if (keuring.type === 'lmra') {
    zorgVoorRuimte(20);
    const gaTekst = keuring.gaGeenGa === 'ga'
      ? 'GA — werkzaamheden mogen starten'
      : keuring.gaGeenGa === 'geen-ga'
        ? 'GEEN GA — werkzaamheden niet starten'
        : 'Nog geen ga/geen-ga-beslissing vastgelegd';
    page.drawText(gaTekst, { x: MARGE, y, size: 12, font: fontBold, color: keuring.gaGeenGa === 'geen-ga' ? ROOD : GROEN });
  }

  return pdfDoc.save();
}
