// Professioneel inspectierapport voor de oplevering: voorblad, samenvatting, algemene gegevens,
// inspectie en metingen, meetresultaten per groep, gebrekenkaarten, conclusie en (voor zakelijke
// klanten) een herstelverklaring.
import {
  CHECKLISTS, CONCLUSIES, DOCUMENTATIE, MEETSPANNINGEN, GROEP_SOORTEN, ERNST, isolatieMetingen,
  normaliseerRapport, minimumIsolatie, isolatieTeLaag, isolatieOpvallendLaag,
  uitschakeltijdTekst, korteTitel,
} from './checklists.js';
import { saniteerVoorPdf, truncateText, wrapText, datumNl } from './pdf-hulp.js';

const { PDFDocument, StandardFonts, rgb } = window.PDFLib;

const A4 = [595.28, 841.89];
const MARGE = 50;
const BREEDTE = A4[0] - MARGE * 2;
const BOVEN = A4[1] - 88;   // eerste regel onder de paginakop
const ONDER = 62;           // laagste regel boven de voettekst

const hex = (h) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const GROEN = hex('#007a55');
const GROEN_TINT = hex('#e3f3ec');
const INKT = hex('#14181a');
const GRIJS = hex('#5b6360');
const LICHTGRIJS = hex('#9aa39e');
const LIJN = hex('#d5dad6');
const VLAK = hex('#f4f6f4');
const WIT = rgb(1, 1, 1);
const ORANJE = hex('#ef6c00');
const ROOD = hex('#c62828');

const ERNST_STIJL = Object.fromEntries(ERNST.map((e) => [e.waarde, {
  ...e,
  kleur: hex(e.kleur),
  tekstKleur: e.waarde === 'geel' ? INKT : WIT,
}]));
const ONBEKENDE_ERNST = { label: 'Niet ingedeeld', actie: 'Ernst nog niet bepaald', kleur: GRIJS, tekstKleur: WIT };

function conclusieKleur(waarde) {
  if (waarde === 'geheel') return GROEN;
  if (waarde === 'niet') return ROOD;
  if (waarde) return ORANJE;
  return GRIJS;
}

export async function genereerInspectierapport(keuring, fotos) {
  normaliseerRapport(keuring);
  const r = keuring.rapport;
  const checklist = CHECKLISTS[keuring.type];
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const vet = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdfDoc.embedPng(await fetch('assets/logo-mark.png').then((res) => res.arrayBuffer()));
  const fotosPerId = new Map(fotos.map((f) => [f.id, f]));
  const s = (tekst) => saniteerVoorPdf(tekst, font);

  const conclusie = CONCLUSIES.find((c) => c.waarde === r.conclusie);
  const gebreken = keuring.items
    .filter((item) => item.resultaat === 'afgekeurd')
    .map((item, i) => ({ ...item, nummer: i + 1, stijl: ERNST_STIJL[item.ernst] || ONBEKENDE_ERNST }));
  const gebrekNummer = new Map(keuring.items
    .filter((item) => item.resultaat === 'afgekeurd')
    .map((item, i) => [item, i + 1]));
  const beoordeeld = keuring.items.filter((item) => item.resultaat).length;
  const locatieNaam = keuring.klant.naam || keuring.klant.adres || 'onbekende locatie';
  const opdrachtgever = r.opdrachtgever.zelfdeAlsObject
    ? { naam: keuring.klant.naam, adres: keuring.klant.adres, ...r.object }
    : r.opdrachtgever;
  const soortTekst = r.soortInstallatie === 'uitbreiding' ? 'Oplevering uitbreiding van een installatie' : 'Oplevering nieuwe installatie';

  let page;
  let y;

  // ---------- basisbouwstenen ----------

  function tekst(t, x, yy, { size = 10, f = font, kleur = INKT } = {}) {
    page.drawText(saniteerVoorPdf(t, f), { x, y: yy, size, font: f, color: kleur });
  }

  function tekstRechts(t, xRechts, yy, opties = {}) {
    const f = opties.f || font;
    const size = opties.size || 10;
    const vlak = saniteerVoorPdf(t, f);
    tekst(vlak, xRechts - f.widthOfTextAtSize(vlak, size), yy, opties);
  }

  function regels(t, breedte, size = 10, f = font) {
    return wrapText(saniteerVoorPdf(t, f), f, size, breedte);
  }

  function paginaKop() {
    page.drawImage(logo, { x: MARGE, y: A4[1] - 58, width: 22, height: 22 });
    tekst('He-Tech Elektro', MARGE + 30, A4[1] - 50, { size: 11, f: vet, kleur: GROEN });
    tekstRechts(`Inspectierapport ${r.rapportnummer || ''}`, MARGE + BREEDTE, A4[1] - 50, { size: 8.5, kleur: GRIJS });
    page.drawLine({ start: { x: MARGE, y: A4[1] - 66 }, end: { x: MARGE + BREEDTE, y: A4[1] - 66 }, thickness: 0.75, color: GROEN });
  }

  function nieuwePagina() {
    page = pdfDoc.addPage(A4);
    y = BOVEN;
    paginaKop();
  }

  function ruimte(hoogte) {
    if (y - hoogte < ONDER) nieuwePagina();
  }

  function hoofdstuk(titel) {
    ruimte(70);
    y -= 6;
    tekst(titel, MARGE, y, { size: 16, f: vet });
    y -= 9;
    page.drawRectangle({ x: MARGE, y, width: 36, height: 3, color: GROEN });
    y -= 20;
  }

  function subkop(titel) {
    ruimte(45);
    tekst(titel, MARGE, y, { size: 10.5, f: vet, kleur: GROEN });
    y -= 15;
  }

  function alinea(t, { size = 10, kleur = INKT, f = font, x = MARGE, breedte = BREEDTE, regelafstand = 1.45 } = {}) {
    for (const deel of String(t ?? '').split('\n')) {
      for (const regel of regels(deel || ' ', breedte, size, f)) {
        ruimte(size * regelafstand);
        tekst(regel, x, y, { size, f, kleur });
        y -= size * regelafstand;
      }
    }
  }

  function vinkje(x, yy, aan) {
    page.drawRectangle({ x, y: yy - 1, width: 8, height: 8, borderColor: INKT, borderWidth: 0.7 });
    if (aan) {
      page.drawLine({ start: { x: x + 1.5, y: yy + 0.5 }, end: { x: x + 6.5, y: yy + 5.5 }, thickness: 1, color: INKT });
      page.drawLine({ start: { x: x + 1.5, y: yy + 5.5 }, end: { x: x + 6.5, y: yy + 0.5 }, thickness: 1, color: INKT });
    }
  }

  function badge(t, xRechts, yy, achtergrond, tekstKleur, size = 7.5) {
    const vlak = saniteerVoorPdf(t, vet);
    const w = vet.widthOfTextAtSize(vlak, size) + 12;
    page.drawRectangle({ x: xRechts - w, y: yy - 4, width: w, height: size + 7, color: achtergrond });
    tekst(vlak, xRechts - w + 6, yy, { size, f: vet, kleur: tekstKleur });
    return w;
  }

  // Omkaderd blok met label/waarde-rijen. Een rij is [label, waarde] of { label, opties: [{ label, aan }] }.
  function kader(titel, rijen, { labelBreedte = 150 } = {}) {
    const waardeBreedte = BREEDTE - 24 - labelBreedte;
    const opgemaakt = rijen.map((rij) => {
      if (rij.opties) return { ...rij, hoogte: 15 };
      const [label, waarde, kleur] = rij;
      const r2 = regels(String(waarde ?? '').trim() || '-', waardeBreedte, 9.5);
      return { label, regels: r2, kleur, hoogte: r2.length * 13 + 2 };
    });
    const binnenHoogte = opgemaakt.reduce((som, rij) => som + rij.hoogte, 0);
    ruimte(binnenHoogte + 38);
    tekst(titel, MARGE, y, { size: 10.5, f: vet, kleur: GROEN });
    y -= 8;
    const boven = y;
    page.drawRectangle({ x: MARGE, y: boven - binnenHoogte - 16, width: BREEDTE, height: binnenHoogte + 16, color: VLAK, borderColor: LIJN, borderWidth: 0.75 });
    y -= 17;
    for (const rij of opgemaakt) {
      tekst(rij.label, MARGE + 12, y, { size: 9.5, kleur: GRIJS });
      const xWaarde = MARGE + 12 + labelBreedte;
      if (rij.opties) {
        let x = xWaarde;
        for (const optie of rij.opties) {
          vinkje(x, y, optie.aan);
          tekst(optie.label, x + 12, y, { size: 9.5 });
          x += 12 + font.widthOfTextAtSize(saniteerVoorPdf(optie.label, font), 9.5) + 16;
        }
      } else {
        rij.regels.forEach((regel, i) => tekst(regel, xWaarde, y - i * 13, { size: 9.5, kleur: rij.kleur || INKT }));
      }
      y -= rij.hoogte;
    }
    y = boven - binnenHoogte - 16 - 18;
  }

  // ---------- voorblad ----------

  page = pdfDoc.addPage(A4);
  page.drawRectangle({ x: 0, y: 0, width: 16, height: A4[1], color: GROEN });
  page.drawImage(logo, { x: MARGE + 10, y: A4[1] - 120, width: 56, height: 56 });
  tekst('He-Tech Elektro', MARGE + 78, A4[1] - 88, { size: 24, f: vet, kleur: GROEN });
  tekst('Groepenkasten · thuisbatterijen · laadpalen', MARGE + 78, A4[1] - 106, { size: 10, kleur: GRIJS });

  y = A4[1] - 250;
  tekst('INSPECTIERAPPORT', MARGE + 10, y, { size: 11, f: vet, kleur: GROEN });
  y -= 34;
  tekst('Elektrische installatie', MARGE + 10, y, { size: 30, f: vet });
  y -= 24;
  tekst(`${soortTekst} volgens ${checklist.subtitel}`, MARGE + 10, y, { size: 13, kleur: GRIJS });
  y -= 30;
  page.drawLine({ start: { x: MARGE + 10, y }, end: { x: MARGE + BREEDTE, y }, thickness: 0.75, color: LIJN });
  y -= 34;

  const voorbladBlok = (label, waarden, x, yy) => {
    tekst(label.toUpperCase(), x, yy, { size: 8, f: vet, kleur: GRIJS });
    waarden.filter(Boolean).forEach((w, i) => tekst(w, x, yy - 16 - i * 14, { size: 11.5, f: i === 0 ? vet : font }));
  };
  const kolom2 = MARGE + 10 + BREEDTE / 2;
  voorbladBlok('Inspectielocatie', [keuring.klant.naam || '-', keuring.klant.adres], MARGE + 10, y);
  voorbladBlok('Opdrachtgever', [opdrachtgever.naam || '-', opdrachtgever.adres], kolom2, y);
  y -= 78;
  voorbladBlok('Rapportnummer', [r.rapportnummer || '-'], MARGE + 10, y);
  voorbladBlok('Datum inspectie', [datumNl(keuring.datum) || '-'], kolom2, y);
  y -= 58;
  voorbladBlok('Inspecteur', [keuring.monteur || '-'], MARGE + 10, y);
  voorbladBlok('Volgende inspectie', [datumNl(r.volgendeInspectie) || '-'], kolom2, y);
  y -= 80;

  // Oordeel als groot gekleurd vlak
  const oordeelKleur = conclusieKleur(r.conclusie);
  page.drawRectangle({ x: MARGE + 10, y: y - 20, width: BREEDTE - 10, height: 50, color: oordeelKleur });
  tekst('CONCLUSIE', MARGE + 26, y + 12, { size: 8, f: vet, kleur: WIT });
  tekst(conclusie ? `De installatie ${conclusie.label.toLowerCase()} aan ${checklist.subtitel}` : 'Nog geen conclusie vastgelegd', MARGE + 26, y - 6, { size: 14, f: vet, kleur: WIT });

  tekst(`${r.instelling.naam} · ${r.instelling.adres} · ${r.instelling.telefoon} · ${r.instelling.email} · KVK ${r.instelling.kvk}`, MARGE + 10, 40, { size: 7.5, kleur: GRIJS });

  // ---------- samenvatting ----------

  nieuwePagina();
  hoofdstuk('Samenvatting');
  alinea(`Op ${datumNl(keuring.datum)} heeft He-Tech Elektro de elektrische installatie van ${locatieNaam}${keuring.klant.adres ? ` aan de ${keuring.klant.adres}` : ''} geïnspecteerd. In dit rapport leest u wat we hebben gecontroleerd, wat we hebben gemeten en wat er eventueel nog moet gebeuren. Elk gebrek staat in hoofdstuk 4 apart beschreven, met foto en advies.`);
  y -= 10;

  // Oordeel-blok
  const toelichting = r.conclusieToelichting ? regels(r.conclusieToelichting, BREEDTE - 36, 9.5) : [];
  const oordeelHoogte = 44 + toelichting.length * 13;
  ruimte(oordeelHoogte + 10);
  page.drawRectangle({ x: MARGE, y: y - oordeelHoogte + 10, width: BREEDTE, height: oordeelHoogte, color: VLAK });
  page.drawRectangle({ x: MARGE, y: y - oordeelHoogte + 10, width: 5, height: oordeelHoogte, color: oordeelKleur });
  tekst('OORDEEL', MARGE + 18, y - 4, { size: 8, f: vet, kleur: GRIJS });
  tekst(conclusie ? `De installatie ${conclusie.label.toLowerCase()} aan ${checklist.subtitel}.` : 'Nog geen conclusie vastgelegd.', MARGE + 18, y - 21, { size: 13, f: vet, kleur: oordeelKleur });
  toelichting.forEach((regel, i) => tekst(regel, MARGE + 18, y - 37 - i * 13, { size: 9.5 }));
  y -= oordeelHoogte + 14;

  // Tegels per ernst
  const tegelBreedte = (BREEDTE - 20) / 3;
  ruimte(80);
  ERNST.forEach((e, i) => {
    const stijl = ERNST_STIJL[e.waarde];
    const aantal = gebreken.filter((g) => g.ernst === e.waarde).length;
    const x = MARGE + i * (tegelBreedte + 10);
    page.drawRectangle({ x, y: y - 62, width: tegelBreedte, height: 66, color: WIT, borderColor: LIJN, borderWidth: 0.75 });
    page.drawRectangle({ x, y: y, width: tegelBreedte, height: 4, color: stijl.kleur });
    tekst(String(aantal), x + 12, y - 28, { size: 22, f: vet, kleur: aantal ? INKT : LICHTGRIJS });
    tekst(stijl.label, x + 12, y - 43, { size: 9.5, f: vet });
    tekst(stijl.actie, x + 12, y - 55, { size: 8, kleur: GRIJS });
  });
  y -= 84;
  const nietIngedeeld = gebreken.filter((g) => !ERNST_STIJL[g.ernst]).length;
  if (nietIngedeeld) {
    alinea(`Daarnaast ${nietIngedeeld === 1 ? 'is 1 gebrek' : `zijn ${nietIngedeeld} gebreken`} nog niet in een ernst ingedeeld.`, { size: 9, kleur: GRIJS });
    y -= 6;
  }

  kader('Kerngegevens', [
    ['Inspectielocatie', [keuring.klant.naam, keuring.klant.adres].filter(Boolean).join(', ')],
    ['Soort inspectie', soortTekst],
    ['Datum inspectie', datumNl(keuring.datum)],
    ['Inspecteur', keuring.monteur],
    ['Gecontroleerd', `${beoordeeld} van ${keuring.items.length} punten beoordeeld, ${gebreken.length} afgekeurd`],
    ['Groepen gemeten', String((keuring.groepen || []).length)],
    ['Volgende inspectie', datumNl(r.volgendeInspectie)],
  ]);

  // Ondertekening
  ruimte(120);
  tekst('Ondertekening', MARGE, y, { size: 10.5, f: vet, kleur: GROEN });
  y -= 18;
  tekst('Inspecteur', MARGE, y, { size: 9.5, kleur: GRIJS });
  tekst(keuring.monteur || '-', MARGE + 162, y, { size: 9.5 });
  y -= 14;
  tekst('Datum', MARGE, y, { size: 9.5, kleur: GRIJS });
  tekst(datumNl(r.datumOndertekening) || '-', MARGE + 162, y, { size: 9.5 });
  y -= 10;
  if (r.handtekening) {
    const handtekening = await pdfDoc.embedPng(r.handtekening);
    const w = 170;
    const h = w * (handtekening.height / handtekening.width);
    page.drawImage(handtekening, { x: MARGE + 156, y: y - h, width: w, height: h });
    y -= h;
  } else {
    y -= 12;
    tekst('Nog niet ondertekend', MARGE + 162, y, { size: 9.5, kleur: ROOD });
  }
  page.drawLine({ start: { x: MARGE + 162, y: y - 2 }, end: { x: MARGE + 340, y: y - 2 }, thickness: 0.5, color: LIJN });

  // ---------- 1. algemene gegevens ----------

  nieuwePagina();
  hoofdstuk('1. Algemene gegevens');
  kader('1.1 Opdrachtnemer', [
    ['Naam', r.instelling.naam],
    ['Adres', r.instelling.adres],
    ['Telefoon', r.instelling.telefoon],
    ['E-mail', r.instelling.email],
    ['KVK-nummer', r.instelling.kvk],
    ['Inspecteur', keuring.monteur],
  ]);
  kader('1.2 Opdrachtgever', r.opdrachtgever.zelfdeAlsObject
    ? [['Opdrachtgever', 'Zelfde als de inspectielocatie (zie 1.3)']]
    : [
      ['Naam', opdrachtgever.naam],
      ['Adres', opdrachtgever.adres],
      ['Contactpersoon', opdrachtgever.contactpersoon],
      ['Telefoon', opdrachtgever.telefoon],
      ['E-mail', opdrachtgever.email],
    ]);
  kader('1.3 Inspectielocatie', [
    ['Naam', keuring.klant.naam],
    ['Adres', keuring.klant.adres],
    ['Contactpersoon', r.object.contactpersoon],
    ['Telefoon', r.object.telefoon],
    ['E-mail', r.object.email],
    ['Jaar van aanleg', r.jaarAanleg],
    ['Gebruik', r.doel],
  ]);
  kader('1.4 Installatiegegevens', [
    { label: 'Netspanning', opties: ['230 V', '230/400 V'].map((v) => ({ label: v, aan: r.netspanning === v })) },
    { label: 'Stroomstelsel', opties: ['TN-S', 'TN-C-S', 'TT', 'IT'].map((v) => ({ label: v, aan: r.stroomstelsel === v })) },
    ['Aansluitwaarde', r.aansluitwaarde],
    ['Verdeelinrichtingen', r.aantalVerdeelinrichtingen],
    ['Aantal groepen', String((keuring.groepen || []).length)],
    ['Wederzijdse beïnvloeding', r.wederzijdseBeinvloeding || 'Geen bijzonderheden'],
    ['Uitwendige invloeden', r.uitwendigeInvloeden || 'Geen bijzonderheden'],
  ]);
  const documentatie = DOCUMENTATIE.filter((d) => r.documentatie[d.sleutel]).map((d) => d.label);
  if (r.documentatie.overig) documentatie.push(r.documentatie.overig);
  const frequentie = { 1: 'Elk jaar', 3: 'Elke 3 jaar', 5: 'Elke 5 jaar', anders: 'Afwijkend, zie datum' }[r.frequentie];
  kader('1.5 Inspectiegegevens', [
    { label: 'Soort inspectie', opties: [{ label: 'Nieuwe installatie', aan: r.soortInstallatie !== 'uitbreiding' }, { label: 'Uitbreiding', aan: r.soortInstallatie === 'uitbreiding' }] },
    ['Toegepaste norm(en)', r.normen],
    ['Uitvoering', r.uitvoering],
    ['Omvang', r.nietGeinspecteerd ? `Niet geïnspecteerd: ${r.nietGeinspecteerd}` : 'Alle installatiedelen zijn geïnspecteerd'],
    ['Gebruikte documentatie', documentatie.join(', ') || 'Geen'],
    ...(r.meetinstrumenten.length
      ? r.meetinstrumenten.map((inst, i) => [i === 0 ? 'Meetinstrumenten' : '', `${inst.naam}${inst.soort ? ` (${inst.soort})` : ''} — serienummer ${inst.serienummer || 'onbekend'}, gekalibreerd ${datumNl(inst.kalibratiedatum) || 'onbekend'}`])
      : [['Meetinstrumenten', 'Niet vastgelegd']]),
    ['Inspectiefrequentie', frequentie],
    ['Volgende inspectie', datumNl(r.volgendeInspectie)],
  ]);

  // ---------- 2. inspectie en metingen ----------

  hoofdstuk('2. Inspectie en metingen');
  alinea('Per punt ziet u of het in orde is. Is een punt afgekeurd, dan verwijst het naar de gebrekenkaart in hoofdstuk 4.', { size: 9.5, kleur: GRIJS });
  y -= 8;
  const categorieen = [...new Set(keuring.items.map((item) => item.categorie))];
  for (const categorie of categorieen) {
    const items = keuring.items.filter((item) => item.categorie === categorie);
    const metMeetwaarde = items.some((item) => item.meeteenheid);
    const tekstBreedte = BREEDTE - (metMeetwaarde ? 200 : 120);
    subkop(categorie);
    ruimte(40);
    page.drawRectangle({ x: MARGE, y: y - 5, width: BREEDTE, height: 17, color: GROEN_TINT });
    tekst('Punt', MARGE + 8, y, { size: 8.5, f: vet });
    if (metMeetwaarde) tekst('Meetwaarde', MARGE + BREEDTE - 190, y, { size: 8.5, f: vet });
    tekstRechts('Resultaat', MARGE + BREEDTE - 8, y, { size: 8.5, f: vet });
    y -= 18;
    items.forEach((item, i) => {
      const r2 = regels(korteTitel(item.omschrijving), tekstBreedte, 9);
      const hoogte = r2.length * 12 + 7;
      ruimte(hoogte);
      if (i % 2 === 1) page.drawRectangle({ x: MARGE, y: y - hoogte + 11, width: BREEDTE, height: hoogte, color: VLAK });
      r2.forEach((regel, j) => tekst(regel, MARGE + 8, y - j * 12, { size: 9 }));
      if (metMeetwaarde && item.meeteenheid && item.meetwaarde) {
        tekst(`${item.meetwaarde} ${item.meeteenheid}`, MARGE + BREEDTE - 190, y, { size: 9 });
      }
      const xr = MARGE + BREEDTE - 8;
      if (item.resultaat === 'ok') badge('Akkoord', xr, y, GROEN, WIT);
      else if (item.resultaat === 'n.v.t.') badge('N.v.t.', xr, y, LIJN, GRIJS);
      else if (item.resultaat === 'afgekeurd') {
        const stijl = ERNST_STIJL[item.ernst] || ONBEKENDE_ERNST;
        badge(`Gebrek ${gebrekNummer.get(item) ?? ''}`, xr, y, stijl.kleur, stijl.tekstKleur);
      } else badge('Niet beoordeeld', xr, y, WIT, LICHTGRIJS);
      y -= hoogte;
    });
    y -= 12;
  }

  // ---------- 3. meetresultaten per groep ----------

  if ((keuring.groepen || []).length > 0) {
    hoofdstuk('3. Meetresultaten per groep');
    const spanning = MEETSPANNINGEN.find((m) => m.waarde === r.meetspanning);
    alinea(`Isolatieweerstand in MOhm, gemeten met ${spanning ? spanning.waarde : r.meetspanning} V DC; het minimum is ${minimumIsolatie(r.meetspanning).toFixed(1).replace('.', ',')} MOhm. Waarden onder het minimum staan in rood. Onder elke groep staat de maximaal toegestane uitschakeltijd bij het ${r.stroomstelsel || 'nog niet gekozen'}-stelsel.`, { size: 9, kleur: GRIJS });
    y -= 8;
    const KOLOMMEN = [
      { label: 'Nr.', x: 6, w: 20 },
      { label: 'Groep', x: 28, w: 88 },
      { label: 'L1-PE', x: 118, w: 40 },
      { label: 'L2-PE', x: 160, w: 40 },
      { label: 'L3-PE', x: 202, w: 40 },
      { label: 'N-PE', x: 244, w: 40 },
      { label: 'Zs (Ohm)', x: 286, w: 44 },
      { label: 'Beveiliging', x: 332, w: 66 },
      { label: 'Aardlek', x: 400, w: 95 },
    ];
    const ISOLATIE = { 2: 'l1pe', 3: 'l2pe', 4: 'l3pe', 5: 'npe' };
    const tabelKop = () => {
      page.drawRectangle({ x: MARGE, y: y - 5, width: BREEDTE, height: 17, color: GROEN_TINT });
      KOLOMMEN.forEach((kol) => tekst(kol.label, MARGE + kol.x, y, { size: 8, f: vet }));
      y -= 18;
    };
    ruimte(60);
    tabelKop();
    keuring.groepen.forEach((groep, i) => {
      const hoogte = groep.opmerking ? 36 : 25;
      if (y - hoogte < ONDER) { nieuwePagina(); tabelKop(); }
      if (i % 2 === 1) page.drawRectangle({ x: MARGE, y: y - hoogte + 10, width: BREEDTE, height: hoogte, color: VLAK });
      const gemeten = new Set(isolatieMetingen(groep.fase).map((m) => m.sleutel));
      const aardlekFout = groep.aardlekAanwezig && groep.aardlek.testknop === 'afgekeurd';
      const waarden = [
        String(groep.nummer ?? ''),
        s(groep.naam),
        s(groep.isolatie.l1pe),
        gemeten.has('l2pe') ? s(groep.isolatie.l2pe) : '',
        gemeten.has('l3pe') ? s(groep.isolatie.l3pe) : '',
        s(groep.isolatie.npe),
        s(groep.zs),
        [groep.zekering ? `${groep.zekering} A` : '', groep.aderdoorsnede ? `${groep.aderdoorsnede} mm²` : ''].filter(Boolean).join(' / '),
        groep.aardlekAanwezig
          ? `${groep.aardlek.iDeltaN || '?'} mA · ${groep.aardlek.tijd || '?'} ms${aardlekFout ? ' · FOUT' : groep.aardlek.testknop === 'ok' ? ' · test ok' : ''}`
          : '-',
      ];
      KOLOMMEN.forEach((kol, k) => {
        const teLaag = ISOLATIE[k] && gemeten.has(ISOLATIE[k]) && isolatieTeLaag(groep.isolatie[ISOLATIE[k]], r.meetspanning);
        const fout = teLaag || (k === 8 && aardlekFout);
        tekst(truncateText(waarden[k], fout ? vet : font, 8.5, kol.w - 2), MARGE + kol.x, y, { size: 8.5, f: fout ? vet : font, kleur: fout ? ROOD : INKT });
      });
      const soort = GROEP_SOORTEN.find((g) => g.waarde === (groep.soort || 'eind-wcd'));
      tekst(truncateText(s(`${soort.label}, ${groep.fase || '1-fase'} · uitschakeltijd ${uitschakeltijdTekst(soort.waarde, r.stroomstelsel)}`), font, 7, BREEDTE - 40), MARGE + 28, y - 11, { size: 7, kleur: GRIJS });
      if (groep.opmerking) tekst(truncateText(s(`Opmerking: ${groep.opmerking}`), font, 7.5, BREEDTE - 40), MARGE + 28, y - 22, { size: 7.5, kleur: GRIJS });
      y -= hoogte;
    });
    const opvallend = isolatieOpvallendLaag(keuring);
    if (opvallend.length) {
      y -= 6;
      alinea(`Let op: groep ${opvallend.join(', ')} heeft een opvallend lagere isolatieweerstand dan de andere groepen. Nader onderzoek naar de oorzaak is aan te raden.`, { size: 9, kleur: ROOD, f: vet });
    }
    y -= 10;
  }

  // ---------- 4. gebreken ----------

  // Kop en eerste gebrekenkaart bij elkaar houden.
  if (gebreken.length && y < 420) nieuwePagina();
  hoofdstuk('4. Gebreken');
  if (gebreken.length === 0) {
    alinea('Er zijn bij deze inspectie geen gebreken geconstateerd.');
  } else {
    alinea('Hieronder staat elk gebrek apart beschreven: waar het zit, hoe ernstig het is, wat wij adviseren en een foto. Na herstel kunt u per gebrek invullen wanneer en door wie het is opgelost.', { size: 9.5, kleur: GRIJS });
    y -= 8;
    const MAX_FOTOS = 4;
    const LABEL = 95;
    const binnen = BREEDTE - 24;
    const fotoKolom = (binnen - 10) / 2;
    for (const gebrek of gebreken) {
      const rijen = [
        ['Locatie', gebrek.locatie || '-'],
        ['Inspectiepunt', `${korteTitel(gebrek.omschrijving)} (${gebrek.categorie})`],
        ['Omschrijving', gebrek.opmerking || '-'],
        ['Advies', gebrek.advies || '-'],
      ].map(([label, waarde]) => ({ label, regels: regels(waarde, binnen - LABEL, 9.5) }));
      const tekstHoogte = rijen.reduce((som, rij) => som + rij.regels.length * 13 + 3, 0);

      const beelden = [];
      for (const fotoId of gebrek.fotoIds.slice(0, MAX_FOTOS)) {
        const foto = fotosPerId.get(fotoId);
        if (!foto) continue;
        const image = await pdfDoc.embedJpg(await foto.blob.arrayBuffer());
        const schaal = Math.min(fotoKolom / image.width, 165 / image.height);
        beelden.push({ image, w: image.width * schaal, h: image.height * schaal });
      }
      const fotoRijen = [];
      for (let i = 0; i < beelden.length; i += 2) fotoRijen.push(beelden.slice(i, i + 2));
      const fotoHoogte = fotoRijen.reduce((som, rij) => som + Math.max(...rij.map((b) => b.h)) + 10, 0);
      const extraFotos = gebrek.fotoIds.length - MAX_FOTOS;

      const kaartHoogte = 26 + 10 + tekstHoogte + (fotoHoogte ? fotoHoogte + 4 : 0) + (extraFotos > 0 ? 12 : 0) + 26;
      ruimte(kaartHoogte + 12);
      const top = y + 12;
      const { stijl } = gebrek;
      page.drawRectangle({ x: MARGE, y: top - kaartHoogte, width: BREEDTE, height: kaartHoogte, color: WIT, borderColor: stijl.kleur, borderWidth: 1 });
      page.drawRectangle({ x: MARGE, y: top - 24, width: BREEDTE, height: 24, color: stijl.kleur });
      tekst(`Gebrek ${gebrek.nummer}`, MARGE + 12, top - 16, { size: 11, f: vet, kleur: stijl.tekstKleur });
      tekstRechts(`${stijl.label} — ${stijl.actie}`, MARGE + BREEDTE - 12, top - 16, { size: 9, f: vet, kleur: stijl.tekstKleur });
      y = top - 24 - 16;
      for (const rij of rijen) {
        tekst(rij.label, MARGE + 12, y, { size: 9.5, kleur: GRIJS });
        rij.regels.forEach((regel, i) => tekst(regel, MARGE + 12 + LABEL, y - i * 13, { size: 9.5, f: rij.label === 'Advies' ? vet : font }));
        y -= rij.regels.length * 13 + 3;
      }
      if (fotoHoogte) {
        y -= 4;
        for (const rij of fotoRijen) {
          const h = Math.max(...rij.map((b) => b.h));
          rij.forEach((b, i) => page.drawImage(b.image, { x: MARGE + 12 + i * (fotoKolom + 10), y: y - h, width: b.w, height: b.h }));
          y -= h + 10;
        }
      }
      if (extraFotos > 0) {
        tekst(`+ ${extraFotos} extra foto${extraFotos === 1 ? '' : "'s"} beschikbaar op aanvraag`, MARGE + 12, y, { size: 8, kleur: GRIJS });
        y -= 12;
      }
      y -= 6;
      tekst('Hersteld op:', MARGE + 12, y, { size: 8.5, kleur: GRIJS });
      page.drawLine({ start: { x: MARGE + 66, y: y - 2 }, end: { x: MARGE + 190, y: y - 2 }, thickness: 0.5, color: LIJN });
      tekst('Door:', MARGE + 210, y, { size: 8.5, kleur: GRIJS });
      page.drawLine({ start: { x: MARGE + 236, y: y - 2 }, end: { x: MARGE + BREEDTE - 12, y: y - 2 }, thickness: 0.5, color: LIJN });
      y = top - kaartHoogte - 16;
    }
  }
  if (r.afwijkingen && r.afwijkingen.trim()) {
    y -= 4;
    subkop('Overige afwijkingen');
    alinea(r.afwijkingen);
  }

  // ---------- 5. conclusie en aanbevelingen ----------

  y -= 10;
  hoofdstuk('5. Conclusie en aanbevelingen');
  alinea(conclusie ? `De elektrische installatie ${conclusie.label.toLowerCase()} aan ${checklist.subtitel}.` : 'Er is nog geen conclusie vastgelegd.', { size: 12, f: vet, kleur: oordeelKleur });
  y -= 4;
  if (r.conclusieToelichting) { alinea(r.conclusieToelichting); y -= 6; }
  if (r.aanbevelingen) {
    subkop('Aanbevelingen');
    alinea(r.aanbevelingen);
    y -= 6;
  }
  if (keuring.algemeneOpmerkingen) {
    subkop('Opmerkingen');
    alinea(keuring.algemeneOpmerkingen);
    y -= 6;
  }
  y -= 6;
  alinea(gebreken.length
    ? `Wilt u de gebreken laten herstellen, of heeft u vragen over dit rapport? Neem gerust contact met ons op via ${r.instelling.telefoon} of ${r.instelling.email}. We plannen het herstel graag met u in en werken het rapport daarna bij.`
    : `Heeft u vragen over dit rapport? Neem gerust contact met ons op via ${r.instelling.telefoon} of ${r.instelling.email}.`, { size: 9.5, kleur: GRIJS });

  // ---------- bijlage: herstelverklaring (zakelijk) ----------

  if (r.zakelijk) {
    nieuwePagina();
    hoofdstuk('Bijlage — Herstelverklaring');
    alinea(`Met deze verklaring bevestigt de installateur dat de gebreken uit inspectierapport ${r.rapportnummer || ''} zijn hersteld. Stuur de ingevulde en ondertekende verklaring naar uw verzekeraar of tussenpersoon als die daarom vraagt.`);
    y -= 10;
    kader('Inspectielocatie en rapport', [
      ['Inspectielocatie', [keuring.klant.naam, keuring.klant.adres].filter(Boolean).join(', ')],
      ['Rapportnummer', r.rapportnummer],
      ['Datum inspectie', datumNl(keuring.datum)],
      ['Aantal gebreken', String(gebreken.length)],
    ]);
    const invulKader = (titel, labels) => {
      ruimte(labels.length * 22 + 40);
      tekst(titel, MARGE, y, { size: 10.5, f: vet, kleur: GROEN });
      y -= 22;
      for (const label of labels) {
        tekst(label, MARGE, y, { size: 9.5, kleur: GRIJS });
        page.drawLine({ start: { x: MARGE + 150, y: y - 2 }, end: { x: MARGE + BREEDTE, y: y - 2 }, thickness: 0.5, color: LIJN });
        y -= 22;
      }
      y -= 8;
    };
    invulKader('Verzekeraar', ['Naam verzekeraar', 'Polisnummer', 'Contactpersoon']);
    invulKader('Installateur die het herstel heeft uitgevoerd', ['Bedrijfsnaam', 'Contactpersoon', 'Adres', 'Telefoon', 'E-mail']);

    ruimte(gebreken.length * 16 + 60);
    tekst('Herstelde gebreken', MARGE, y, { size: 10.5, f: vet, kleur: GROEN });
    y -= 18;
    page.drawRectangle({ x: MARGE, y: y - 5, width: BREEDTE, height: 17, color: GROEN_TINT });
    tekst('Nr.', MARGE + 6, y, { size: 8.5, f: vet });
    tekst('Gebrek', MARGE + 34, y, { size: 8.5, f: vet });
    tekst('Hersteld op', MARGE + BREEDTE - 100, y, { size: 8.5, f: vet });
    y -= 18;
    for (const gebrek of gebreken) {
      ruimte(16);
      tekst(String(gebrek.nummer), MARGE + 6, y, { size: 9 });
      tekst(truncateText(s(`${korteTitel(gebrek.omschrijving)}${gebrek.locatie ? ` — ${gebrek.locatie}` : ''}`), font, 9, BREEDTE - 150), MARGE + 34, y, { size: 9 });
      page.drawLine({ start: { x: MARGE + BREEDTE - 100, y: y - 2 }, end: { x: MARGE + BREEDTE - 6, y: y - 2 }, thickness: 0.5, color: LIJN });
      y -= 16;
    }
    y -= 12;

    ruimte(130);
    tekst('Verklaring', MARGE, y, { size: 10.5, f: vet, kleur: GROEN });
    y -= 18;
    const verklaringen = [
      `Alle gebreken uit rapport ${r.rapportnummer || ''} zijn vakkundig hersteld.`,
      'Alleen de hierboven aangekruiste of ingevulde gebreken zijn hersteld.',
      'De werkzaamheden zijn uitgevoerd volgens de geldende installatievoorschriften.',
    ];
    for (const v of verklaringen) {
      vinkje(MARGE, y, false);
      tekst(v, MARGE + 14, y, { size: 9.5 });
      y -= 16;
    }
    y -= 14;
    tekst('Datum', MARGE, y, { size: 9.5, kleur: GRIJS });
    page.drawLine({ start: { x: MARGE + 40, y: y - 2 }, end: { x: MARGE + 180, y: y - 2 }, thickness: 0.5, color: LIJN });
    tekst('Handtekening', MARGE + 210, y, { size: 9.5, kleur: GRIJS });
    page.drawLine({ start: { x: MARGE + 280, y: y - 2 }, end: { x: MARGE + BREEDTE, y: y - 2 }, thickness: 0.5, color: LIJN });
  }

  // ---------- voettekst op alle pagina's behalve het voorblad ----------

  const paginas = pdfDoc.getPages();
  paginas.forEach((p, i) => {
    if (i === 0) return;
    page = p;
    page.drawLine({ start: { x: MARGE, y: 46 }, end: { x: MARGE + BREEDTE, y: 46 }, thickness: 0.5, color: LIJN });
    tekst(truncateText(s(`He-Tech Elektro · Inspectierapport ${r.rapportnummer || ''} · ${locatieNaam}`), font, 7.5, BREEDTE - 90), MARGE, 34, { size: 7.5, kleur: GRIJS });
    tekstRechts(`pagina ${i + 1} van ${paginas.length}`, MARGE + BREEDTE, 34, { size: 7.5, kleur: GRIJS });
  });

  return pdfDoc.save();
}
