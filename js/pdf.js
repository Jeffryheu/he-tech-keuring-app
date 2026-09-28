import {
  CHECKLISTS, CONCLUSIES, DOCUMENTATIE, MEETSPANNINGEN, GROEP_SOORTEN, uitschakeltijdTekst,
  normaliseerRapport, minimumIsolatie, isolatieTeLaag, isolatieOpvallendLaag,
} from './checklists.js';

const { PDFDocument, StandardFonts, rgb } = window.PDFLib;

const GROEN = rgb(0x00 / 255, 0x7a / 255, 0x55 / 255);
const INKT = rgb(0x14 / 255, 0x18 / 255, 0x1a / 255);
const GRIJS = rgb(0x5b / 255, 0x63 / 255, 0x60 / 255);
const ROOD = rgb(0.7, 0.1, 0.1);
const A4 = [595.28, 841.89];
const MARGE = 50;
const LABEL_BREEDTE = 165;

function saniteerVoorPdf(tekst, font) {
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

function datumNl(iso) {
  if (!iso) return '';
  const [j, m, d] = iso.split('-');
  return `${d}-${m}-${j}`;
}

export async function genereerRapport(keuring, fotos) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const logoBytes = await fetch('assets/logo-mark.png').then((res) => res.arrayBuffer());
  const logoImage = await pdfDoc.embedPng(logoBytes);
  const fotosPerId = new Map(fotos.map((f) => [f.id, f]));
  const checklist = CHECKLISTS[keuring.type];
  const uitgebreid = Boolean(checklist.uitgebreidRapport);
  if (keuring.type !== 'lmra') normaliseerRapport(keuring);
  const r = keuring.rapport;
  const breedte = A4[0] - MARGE * 2;
  const s = (tekst) => saniteerVoorPdf(tekst, font);

  let page = pdfDoc.addPage(A4);
  let y = A4[1] - MARGE;

  function nieuwePagina() {
    page = pdfDoc.addPage(A4);
    y = A4[1] - MARGE;
  }

  function zorgVoorRuimte(hoogteNodig) {
    if (y - hoogteNodig < MARGE) nieuwePagina();
  }

  function sectieKop(titel) {
    zorgVoorRuimte(40);
    y -= 6;
    page.drawText(titel, { x: MARGE, y, size: 12, font: fontBold, color: GROEN });
    y -= 4;
    page.drawLine({ start: { x: MARGE, y }, end: { x: MARGE + breedte, y }, thickness: 0.5, color: GROEN });
    y -= 13;
  }

  // Label links, waarde rechts (meerdere regels mogelijk). Lege waarde wordt '-'.
  function veldRegel(label, waarde, kleur = INKT) {
    const regels = wrapText(s(waarde) || '-', font, 10, breedte - LABEL_BREEDTE);
    zorgVoorRuimte(regels.length * 13 + 2);
    page.drawText(label, { x: MARGE, y, size: 10, font, color: GRIJS });
    regels.forEach((regel, i) => page.drawText(regel, { x: MARGE + LABEL_BREEDTE, y: y - i * 13, size: 10, font, color: kleur }));
    y -= regels.length * 13 + 2;
  }

  function alinea(tekst, { size = 10, kleur = INKT, vet = false } = {}) {
    const f = vet ? fontBold : font;
    const regels = wrapText(saniteerVoorPdf(tekst, f), f, size, breedte);
    const regelHoogte = size + 3;
    for (const regel of regels) {
      zorgVoorRuimte(regelHoogte);
      page.drawText(regel, { x: MARGE, y, size, font: f, color: kleur });
      y -= regelHoogte;
    }
  }

  // Header
  page.drawImage(logoImage, { x: MARGE, y: y - 40, width: 40, height: 40 });
  page.drawText('He-Tech Elektro', { x: MARGE + 50, y: y - 15, size: 16, font: fontBold, color: GROEN });
  const titel = uitgebreid ? 'Inspectierapport — oplevering elektrische installatie' : `${checklist.label} (${checklist.subtitel})`;
  page.drawText(titel, { x: MARGE + 50, y: y - 33, size: 11, font, color: GRIJS });
  y -= 60;

  const aantalAfgekeurd = keuring.items.filter((item) => item.resultaat === 'afgekeurd').length;
  const conclusie = CONCLUSIES.find((c) => c.waarde === r?.conclusie);

  if (uitgebreid) {
    // Samenvatting bovenaan: in één oogopslag waar de installatie staat.
    const samenvatting = conclusie
      ? `Conclusie: ${conclusie.label.toLowerCase()} aan ${checklist.subtitel}. ${keuring.items.length} punten gecontroleerd, ${aantalAfgekeurd} afgekeurd.`
      : `${keuring.items.length} punten gecontroleerd, ${aantalAfgekeurd} afgekeurd.`;
    alinea(samenvatting, { size: 11, vet: true, kleur: aantalAfgekeurd > 0 || r.conclusie === 'niet' ? ROOD : GROEN });
    y -= 6;

    const og = r.opdrachtgever.zelfdeAlsObject
      ? { naam: keuring.klant.naam, adres: keuring.klant.adres, ...r.object }
      : r.opdrachtgever;

    sectieKop('1. Object');
    veldRegel('Naam object', keuring.klant.naam);
    veldRegel('Adres', keuring.klant.adres);
    veldRegel('Contactpersoon', r.object.contactpersoon);
    veldRegel('Contactgegevens', [r.object.telefoon, r.object.email].filter(Boolean).join(' · '));

    sectieKop('2. Opdrachtgever');
    if (r.opdrachtgever.zelfdeAlsObject) {
      veldRegel('Opdrachtgever', 'Zelfde als object');
    } else {
      veldRegel('Naam', og.naam);
      veldRegel('Adres', og.adres);
      veldRegel('Contactpersoon', og.contactpersoon);
      veldRegel('Contactgegevens', [og.telefoon, og.email].filter(Boolean).join(' · '));
    }

    sectieKop('3. Inspectie-instelling');
    veldRegel('Naam', r.instelling.naam);
    veldRegel('Adres', r.instelling.adres);
    veldRegel('Inspecteur', keuring.monteur);
    veldRegel('Datum inspectie', datumNl(keuring.datum));

    sectieKop('4. Soort inspectie');
    veldRegel('Soort', r.soortInstallatie === 'uitbreiding' ? 'Uitbreiding van een installatie' : 'Nieuwe installatie');
    veldRegel('Jaar van aanleg', r.jaarAanleg);

    sectieKop('5. Uitvoering en omvang');
    veldRegel('Uitvoering', r.uitvoering);
    veldRegel('Niet geïnspecteerd', r.nietGeinspecteerd || 'Geen — de installatie is volledig geïnspecteerd');

    sectieKop('6. Kenmerken installatie');
    veldRegel('Doel', r.doel);
    veldRegel('Stroomstelsel', r.stroomstelsel);
    veldRegel('Wederzijdse beïnvloeding', r.wederzijdseBeinvloeding);
    veldRegel('Uitwendige invloeden', r.uitwendigeInvloeden);

    sectieKop('7. Gebruikte documentatie');
    const docs = DOCUMENTATIE.filter((d) => r.documentatie[d.sleutel]).map((d) => d.label);
    if (r.documentatie.overig) docs.push(r.documentatie.overig);
    veldRegel('Documentatie', docs.join(', '));

    sectieKop('8. Inspectiefrequentie');
    const frequentie = { 1: 'Elk jaar', 3: 'Elke 3 jaar', 5: 'Elke 5 jaar', anders: 'Afwijkend, zie datum' }[r.frequentie];
    veldRegel('Frequentie', frequentie);
    veldRegel('Volgende inspectie', datumNl(r.volgendeInspectie));
    y -= 8;
  } else {
    // Kopgegevens (periodiek / LMRA)
    const kopregels = keuring.type === 'lmra'
      ? [`Werkzaamheden: ${s(keuring.werkzaamheden) || '-'}`, `Betrokkenen: ${s(keuring.betrokkenen) || '-'}`, `Datum: ${keuring.datum}`]
      : [`Klant: ${s(keuring.klant.naam) || '-'}`, `Adres: ${s(keuring.klant.adres) || '-'}`, `Datum: ${keuring.datum}`, `Monteur: ${s(keuring.monteur) || '-'}`];
    kopregels.forEach((regel) => {
      page.drawText(regel, { x: MARGE, y, size: 11, font, color: INKT });
      y -= 16;
    });
    y -= 10;

    page.drawText(`Samenvatting: ${keuring.items.length} punten gecontroleerd, ${aantalAfgekeurd} afgekeurd.`, {
      x: MARGE, y, size: 11, font: fontBold, color: aantalAfgekeurd > 0 ? ROOD : GROEN,
    });
    y -= 24;
  }

  // Groepentabel
  if (keuring.type !== 'lmra' && keuring.groepen && keuring.groepen.length > 0) {
    const meetspanning = r.meetspanning;
    const KOLOMMEN = [
      { label: 'Nr.', x: 0, w: 22 },
      { label: 'Naam', x: 24, w: 80 },
      { label: 'L1-PE', x: 106, w: 42 },
      { label: 'L2-PE', x: 150, w: 42 },
      { label: 'L3-PE', x: 194, w: 42 },
      { label: 'N-PE', x: 238, w: 42 },
      { label: 'Zs (Ohm)', x: 282, w: 40 },
      { label: 'Zek/Ø', x: 324, w: 65 },
      { label: 'Aardlek', x: 391, w: 104 },
    ];
    const ISOLATIE_KOLOMMEN = { 2: 'l1pe', 3: 'l2pe', 4: 'l3pe', 5: 'npe' };
    sectieKop('Groepen & meetgegevens');
    const spanning = MEETSPANNINGEN.find((m) => m.waarde === meetspanning);
    alinea(`Isolatieweerstand in MOhm, gemeten met ${spanning ? spanning.waarde : meetspanning} V DC. Minimum: ${minimumIsolatie(meetspanning).toFixed(1).replace('.', ',')} MOhm. Waarden onder het minimum staan in rood.`, { size: 8, kleur: GRIJS });
    y -= 2;
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
        truncateText(s(groep.naam), font, 8, 78),
        s(groep.isolatie.l1pe),
        driefase ? s(groep.isolatie.l2pe) : '',
        driefase ? s(groep.isolatie.l3pe) : '',
        s(groep.isolatie.npe),
        s(groep.zs),
        truncateText(zekDoorsnede, font, 8, 63),
        truncateText(s(aardlekTekst), font, 8, 102),
      ];
      const rijKleur = groep.aardlekAanwezig && groep.aardlek.testknop === 'afgekeurd' ? ROOD : INKT;
      KOLOMMEN.forEach((kol, i) => {
        const isolatieSleutel = ISOLATIE_KOLOMMEN[i];
        const teLaag = isolatieSleutel && isolatieTeLaag(groep.isolatie[isolatieSleutel], meetspanning);
        page.drawText(truncateText(waarden[i], font, 8, kol.w), {
          x: MARGE + kol.x, y, size: 8, font: teLaag ? fontBold : font, color: teLaag ? ROOD : rijKleur,
        });
      });
      y -= 11;
      const soort = GROEP_SOORTEN.find((g) => g.waarde === (groep.soort || 'eind-wcd'));
      page.drawText(s(`${soort.label} — uitschakeltijd ${uitschakeltijdTekst(soort.waarde, r.stroomstelsel)}`), {
        x: MARGE + 24, y, size: 7, font, color: GRIJS,
      });
      y -= 11;

      if (groep.opmerking) {
        const opmerkingRegels = wrapText(`Opmerking: ${s(groep.opmerking)}`, font, 8, breedte - 10);
        zorgVoorRuimte(opmerkingRegels.length * 11);
        opmerkingRegels.forEach((regel, i) => page.drawText(regel, { x: MARGE + 10, y: y - i * 11, size: 8, font, color: GRIJS }));
        y -= opmerkingRegels.length * 11;
      }
      y -= 4;
    }

    const opvallend = isolatieOpvallendLaag(keuring);
    if (opvallend.length) {
      y -= 4;
      alinea(`Let op: groep ${opvallend.join(', ')} heeft een opvallend lagere isolatieweerstand dan de andere groepen. Nader onderzoek naar de oorzaak is aan te raden.`, { size: 9, kleur: ROOD });
    }
    y -= 12;
  }

  // Items per categorie (volgorde zoals in de keuring zelf)
  const categorieen = [...new Set(keuring.items.map((item) => item.categorie))];
  for (const categorieNaam of categorieen) {
    const items = keuring.items.filter((item) => item.categorie === categorieNaam);
    sectieKop(categorieNaam);

    for (const item of items) {
      const resultaatLabel = item.resultaat || 'niet beoordeeld';
      const meetwaardeTekst = item.meeteenheid && item.meetwaarde
        ? ` — ${s(item.meetwaarde)} ${item.meeteenheid}`
        : '';
      const omschrijvingRegels = wrapText(`[${resultaatLabel}] ${s(item.omschrijving)}${meetwaardeTekst}`, font, 10, breedte);
      zorgVoorRuimte(omschrijvingRegels.length * 13 + 10);
      const kleur = item.resultaat === 'afgekeurd' ? ROOD : INKT;
      omschrijvingRegels.forEach((regel, i) => page.drawText(regel, { x: MARGE, y: y - i * 13, size: 10, font, color: kleur }));
      y -= omschrijvingRegels.length * 13;

      if (item.opmerking) {
        const opmerkingRegels = wrapText(`Opmerking: ${s(item.opmerking)}`, font, 9, breedte - 10);
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
    y -= 6;
  }

  if (uitgebreid) {
    sectieKop('Afwijkingen en aanbevelingen');
    const afwijkingen = String(r.afwijkingen || '').split('\n').map((regel) => regel.trim()).filter(Boolean);
    page.drawText('Geconstateerde afwijkingen', { x: MARGE, y, size: 10, font: fontBold, color: INKT });
    y -= 14;
    if (afwijkingen.length === 0) alinea('Geen afwijkingen geconstateerd.');
    afwijkingen.forEach((regel) => alinea(regel, { kleur: ROOD }));
    y -= 6;
    zorgVoorRuimte(30);
    page.drawText('Aanbevelingen', { x: MARGE, y, size: 10, font: fontBold, color: INKT });
    y -= 14;
    String(r.aanbevelingen || '-').split('\n').filter((regel) => regel.trim()).forEach((regel) => alinea(regel));
    y -= 6;
  }

  if (keuring.algemeneOpmerkingen) {
    sectieKop('Algemene opmerkingen');
    alinea(keuring.algemeneOpmerkingen);
    y -= 6;
  }

  if (uitgebreid) {
    sectieKop('Conclusie');
    const conclusieTekst = conclusie
      ? `De elektrische installatie ${conclusie.label.toLowerCase()} aan ${checklist.subtitel}.`
      : 'Nog geen conclusie vastgelegd.';
    alinea(conclusieTekst, { size: 12, vet: true, kleur: r.conclusie === 'geheel' ? GROEN : r.conclusie ? ROOD : GRIJS });
    if (r.conclusieToelichting) {
      y -= 2;
      String(r.conclusieToelichting).split('\n').filter((regel) => regel.trim()).forEach((regel) => alinea(regel));
    }
    y -= 6;

    sectieKop('Ondertekening');
    zorgVoorRuimte(110);
    veldRegel('Inspecteur', keuring.monteur);
    veldRegel('Datum ondertekening', datumNl(r.datumOndertekening));
    if (r.handtekening) {
      const handtekening = await pdfDoc.embedPng(r.handtekening);
      const w = 180;
      const h = w * (handtekening.height / handtekening.width);
      page.drawImage(handtekening, { x: MARGE + LABEL_BREEDTE, y: y - h, width: w, height: h });
      y -= h + 4;
    } else {
      veldRegel('Handtekening', 'Niet ondertekend', ROOD);
    }
  } else if (keuring.type !== 'lmra') {
    const conclusieTekst = aantalAfgekeurd === 0
      ? `Conclusie: de installatie voldoet aan de eisen van ${checklist.subtitel}.`
      : `Conclusie: de installatie voldoet niet volledig aan de eisen van ${checklist.subtitel} — zie geconstateerde gebreken hierboven. Herstel wordt geadviseerd.`;
    alinea(conclusieTekst, { size: 12, vet: true, kleur: aantalAfgekeurd > 0 ? ROOD : GROEN });
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
