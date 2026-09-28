export const CHECKLISTS = {
  oplevering: {
    label: 'Oplevering nieuwe installatie',
    subtitel: 'NEN 1010',
    uitgebreidRapport: true,
    categorieen: [
      {
        naam: 'Inspectie',
        items: [
          'a) Bescherming tegen elektrische schok — aardlekschakelaars, aarding en beschermingsleiding in orde, geen aanraakbare actieve delen',
          'b) Brand en warmte — doorvoeringen brandwerend afgedicht, geen warmteophoping bij kabels of materieel',
          'c) Leidingen passend bij de belasting — kabeldoorsnede past bij stroom en legwijze',
          'd) Beveiligingstoestellen — juist type, waarde en karakteristiek van automaten en aardlekschakelaars',
          'e) Overspanningsbeveiliging — aanwezig waar nodig, juist geplaatst, aangesloten en afgestemd',
          'f) Schakelaars en scheiders — hoofdschakelaar en werkschakelaars aanwezig en op de juiste plek',
          'g) Materieel passend bij de omgeving — IP-klasse en uitvoering passen bij de ruimte (badkamer, buiten, stof)',
          'h) Aanduiding nul- en beschermingsleidingen — kleurcodering blauw en geel/groen correct',
          'i) Schema\'s, tekeningen en waarschuwingen — installatieschema/groepenverklaring aanwezig, waarschuwingsborden waar nodig',
          'j) Aanduiding van groepen en toestellen — groepen, automaten, aardlekschakelaars, schakelaars en klemmen herkenbaar gelabeld',
          'k) Deugdelijke aansluitingen — klemmen aangedraaid volgens fabrikant, geen losse aders of beschadigde isolatie',
          'l) Beschermings- en vereffeningsleidingen — aanwezig en voldoende doorsnede, hoofd- en aanvullende vereffening',
          'm) Bereikbaarheid — materieel bereikbaar voor bediening, herkenning en onderhoud',
          'n) Elektromagnetische verstoringen — scheiding sterkstroom/data waar nodig, omvormer en laadpaal volgens fabrikant',
          'o) Vereffening vreemde geleidende delen — water- en gasleiding en metalen constructiedelen vereffend waar nodig',
          'p) Leidingsystemen — kabels en buizen geschikt voor de plek, goed bevestigd, juiste legwijze',
        ],
      },
      {
        naam: 'Metingen en beproevingen',
        items: [
          { omschrijving: 'Doorgaande verbinding van beschermings- en vereffeningsleidingen', meeteenheid: 'Ohm' },
          { omschrijving: 'Isolatieweerstand (waarden per groep in de groepentabel)', meeteenheid: 'MOhm' },
          'Scheiding van stroomketens (bv. SELV, scheidingstransformator)',
          { omschrijving: 'Automatische uitschakeling — foutlusimpedantie (per groep in de groepentabel) of aardverspreidingsweerstand bij TT', meeteenheid: 'Ohm' },
          { omschrijving: 'Aanvullende bescherming — aardlekschakelaars beproefd (waarden per groep in de groepentabel)', meeteenheid: 'ms' },
          'Polariteit',
          'Functionele beproevingen — schakelaars, besturingen, laadpaal/batterij werken zoals bedoeld',
          { omschrijving: 'Spanningsverlies', meeteenheid: '%' },
        ],
      },
      {
        naam: 'Specifiek per opdracht (indien van toepassing)',
        items: [
          'Laadpaal-aansluiting: kabeldikte/zekering berekend op laadvermogen',
          'Laadpaal-aansluiting: aardlekbeveiliging type B of gelijkwaardig aanwezig',
          'Thuisbatterij-aansluiting: correct gekoppeld aan groepenkast/omvormer',
          'Thuisbatterij-aansluiting: noodstroomvoorziening getest (indien van toepassing)',
        ],
      },
    ],
  },
  periodiek: {
    label: 'Periodieke keuring',
    subtitel: 'NEN 3140',
    categorieen: [
      {
        naam: 'Visuele inspectie',
        items: [
          'Geen zichtbare schade aan kabels, stekkers of behuizingen',
          'Geen sporen van oververhitting (verkleuring, smeltplekken)',
          'Aansluitingen visueel in orde, geen losse verbindingen',
          'Installatie schoon en vrij van bouw-/waterschade',
        ],
      },
      {
        naam: 'Beveiligingen',
        items: [
          'Werking aardlekschakelaars getest (testknop)',
          'Overstroombeveiligingen (zekeringen/automaten) van het juiste type/waarde',
        ],
      },
      {
        naam: 'Meetresultaten',
        items: [
          { omschrijving: 'Isolatieweerstand gemeten en binnen norm', meeteenheid: 'MOhm' },
          { omschrijving: 'Aardverbinding/aardlusimpedantie gemeten en binnen norm', meeteenheid: 'Ohm' },
        ],
      },
      {
        naam: 'Gebreken & risicoclassificatie',
        items: [
          'Geconstateerde gebreken vastgelegd met risicoclassificatie',
          'Direct gevaarlijke situaties (indien aanwezig) direct gemeld aan de klant',
        ],
      },
    ],
  },
  lmra: {
    label: 'LMRA',
    subtitel: 'Laatste Minuut Risico Analyse',
    categorieen: [
      {
        naam: 'Werkomgeving',
        items: [
          'Werkplek vrij van obstakels en voldoende werkruimte',
          'Voldoende verlichting aanwezig',
          'Weersomstandigheden geen belemmering (bij werk buiten/in de meterkast bij buitendeur)',
        ],
      },
      {
        naam: 'Gereedschap & PBM',
        items: [
          'Juiste PBM aanwezig en gedragen (veiligheidsschoenen, isolerend gereedschap)',
          'Gereedschap visueel in orde, geen zichtbare schade',
        ],
      },
      {
        naam: 'Elektrische veiligheid',
        items: [
          'Spanning uitgeschakeld en vergrendeld waar van toepassing',
          'Spanningsloosheid gecontroleerd met juiste meetapparatuur',
          'Meetapparatuur zelf gecontroleerd op correcte werking',
        ],
      },
      {
        naam: 'Omgeving',
        items: [
          'Geen onbevoegde aanwezigen in de werkzone',
          'Vluchtweg/nooduitgang niet geblokkeerd',
        ],
      },
    ],
  },
};

export const INSPECTIE_INSTELLING = {
  naam: 'He-Tech Elektro',
  adres: 'Lage Gouwe 142, 2801 LL Gouda',
};

export const CONCLUSIES = [
  { waarde: 'geheel', label: 'Voldoet geheel' },
  { waarde: 'vrijwel', label: 'Voldoet vrijwel geheel' },
  { waarde: 'ten-dele', label: 'Voldoet ten dele' },
  { waarde: 'niet', label: 'Voldoet niet' },
];

export const DOCUMENTATIE = [
  { sleutel: 'tekening', label: 'Installatietekening' },
  { sleutel: 'groepenverklaring', label: 'Groepenverklaring' },
  { sleutel: 'eendraadschema', label: 'Eendraadschema' },
  { sleutel: 'fabrikant', label: 'Documentatie fabrikant' },
];

export function buildRapport() {
  const contact = () => ({ contactpersoon: '', telefoon: '', email: '' });
  return {
    object: contact(),
    opdrachtgever: { zelfdeAlsObject: true, naam: '', adres: '', ...contact() },
    instelling: { ...INSPECTIE_INSTELLING },
    jaarAanleg: '',
    soortInstallatie: 'nieuw',
    uitvoering: '',
    nietGeinspecteerd: '',
    doel: '',
    stroomstelsel: '',
    wederzijdseBeinvloeding: '',
    uitwendigeInvloeden: '',
    documentatie: { tekening: false, groepenverklaring: false, eendraadschema: false, fabrikant: false, overig: '' },
    meetspanning: '500',
    frequentie: '',
    volgendeInspectie: '',
    afwijkingen: '',
    aanbevelingen: '',
    conclusie: null,
    conclusieToelichting: '',
    handtekening: '',
    datumOndertekening: '',
  };
}

// Vult ontbrekende velden aan bij keuringen die met een oudere app-versie zijn aangemaakt.
export function normaliseerRapport(keuring) {
  const basis = buildRapport();
  const huidig = keuring.rapport || {};
  keuring.rapport = {
    ...basis,
    ...huidig,
    object: { ...basis.object, ...huidig.object },
    opdrachtgever: { ...basis.opdrachtgever, ...huidig.opdrachtgever },
    instelling: { ...basis.instelling, ...huidig.instelling },
    documentatie: { ...basis.documentatie, ...huidig.documentatie },
  };
  return keuring;
}

export const MEETSPANNINGEN = [
  { waarde: '250', label: '250 V DC — SELV- en PELV-ketens', minimum: 0.5 },
  { waarde: '500', label: '500 V DC — stroomketens t/m 500 V (incl. FELV)', minimum: 1.0 },
  { waarde: '1000', label: '1000 V DC — stroomketens boven 500 V', minimum: 1.0 },
];

export function minimumIsolatie(meetspanning) {
  return (MEETSPANNINGEN.find((m) => m.waarde === meetspanning) || MEETSPANNINGEN[1]).minimum;
}

// Leest een ingevulde meetwaarde als getal. Waarden als ">999", "OL" of "∞" betekenen:
// buiten meetbereik, dus ruim voldoende. Geeft null terug als er niets (bruikbaars) is ingevuld.
export function leesIsolatie(waarde) {
  const tekst = String(waarde ?? '').trim();
  if (!tekst) return null;
  if (/^(>|ol|∞|oo)/i.test(tekst)) return Infinity;
  const getal = Number(tekst.replace(',', '.'));
  return Number.isFinite(getal) ? getal : null;
}

export function isolatieTeLaag(waarde, meetspanning) {
  const getal = leesIsolatie(waarde);
  return getal !== null && getal < minimumIsolatie(meetspanning);
}

// Isolatiewaarden liggen normaal ruim boven het minimum. Een groep die een factor 10 of meer
// lager scoort dan de beste groep verdient nader onderzoek, ook als hij het minimum haalt.
export function isolatieOpvallendLaag(keuring) {
  const perGroep = (keuring.groepen || []).map((groep) => {
    const waarden = Object.values(groep.isolatie).map(leesIsolatie).filter((w) => w !== null && w !== Infinity);
    return waarden.length ? Math.min(...waarden) : null;
  });
  const gemeten = perGroep.filter((w) => w !== null);
  if (gemeten.length < 2) return [];
  const hoogste = Math.max(...gemeten);
  return perGroep
    .map((w, i) => (w !== null && w * 10 <= hoogste ? keuring.groepen[i].nummer : null))
    .filter((n) => n !== null);
}

// Soort groep bepaalt welke maximale uitschakeltijd geldt. 'lang' = de ruimere tijd
// (distributiegroepen en zware eindgroepen, waar de kans op een aardfout klein is).
export const GROEP_SOORTEN = [
  { waarde: 'eind-wcd', label: 'Eindgroep met wandcontactdozen (t/m 63 A)', lang: false },
  { waarde: 'eind-vast', label: 'Eindgroep zonder wandcontactdozen (t/m 32 A)', lang: false },
  { waarde: 'distributie', label: 'Distributiegroep (voeding onderverdeler)', lang: true },
  { waarde: 'eind-vast-groot', label: 'Eindgroep zonder wandcontactdozen, boven 32 A', lang: true },
  { waarde: 'eind-wcd-groot', label: 'Eindgroep met wandcontactdozen, boven 63 A', lang: true },
];

// Maximale uitschakeltijden in seconden, per bereik van U0 (nominale spanning t.o.v. aarde).
const UITSCHAKELTIJDEN_LANG = { tn: 5, tt: 1 };
const UITSCHAKELTIJDEN_OVERIG = [
  { totEnMet: 120, tn: 0.8, tt: 0.3 },
  { totEnMet: 230, tn: 0.4, tt: 0.2 },
  { totEnMet: 400, tn: 0.2, tt: 0.07 },
  { totEnMet: Infinity, tn: 0.1, tt: 0.04 },
];

export function stelselSoort(stroomstelsel) {
  if (stroomstelsel === 'TN-S' || stroomstelsel === 'TN-C-S') return 'tn';
  if (stroomstelsel === 'TT') return 'tt';
  return null;
}

// Geeft { seconden, stelsel } of null als het stroomstelsel (nog) onbekend is of IT is.
export function maxUitschakeltijd(groepSoort, stroomstelsel, u0 = 230) {
  const stelsel = stelselSoort(stroomstelsel);
  if (!stelsel) return null;
  const soort = GROEP_SOORTEN.find((g) => g.waarde === groepSoort) || GROEP_SOORTEN[0];
  if (soort.lang) return { seconden: UITSCHAKELTIJDEN_LANG[stelsel], stelsel };
  const rij = UITSCHAKELTIJDEN_OVERIG.find((r) => u0 <= r.totEnMet);
  return { seconden: rij[stelsel], stelsel };
}

export function uitschakeltijdTekst(groepSoort, stroomstelsel) {
  const max = maxUitschakeltijd(groepSoort, stroomstelsel);
  if (!max) return stroomstelsel === 'IT' ? 'IT-stelsel: uitschakeltijd apart beoordelen' : 'Kies eerst het stroomstelsel';
  return `max. ${String(max.seconden).replace('.', ',')} s (${max.stelsel.toUpperCase()}-stelsel, U0 = 230 V)`;
}

export function stelConclusieVoor(keuring) {
  const beoordeeld = keuring.items.filter((item) => item.resultaat === 'ok' || item.resultaat === 'afgekeurd');
  const afgekeurd = beoordeeld.filter((item) => item.resultaat === 'afgekeurd').length;
  if (beoordeeld.length === 0) return null;
  if (afgekeurd === 0) return 'geheel';
  const aandeel = afgekeurd / beoordeeld.length;
  if (aandeel <= 0.1) return 'vrijwel';
  if (aandeel <= 0.5) return 'ten-dele';
  return 'niet';
}

export function buildGroep(nummer) {
  return {
    nummer,
    naam: '',
    soort: 'eind-wcd',
    fase: '1-fase',
    zekering: '',
    aderdoorsnede: '',
    isolatie: { l1pe: '', l2pe: '', l3pe: '', npe: '' },
    zs: '',
    aardlekAanwezig: false,
    aardlek: { iDeltaN: '', tijd: '', testknop: null },
    opmerking: '',
  };
}

export function buildInitialItems(type) {
  const items = [];
  CHECKLISTS[type].categorieen.forEach((categorie) => {
    categorie.items.forEach((entry) => {
      const omschrijving = typeof entry === 'string' ? entry : entry.omschrijving;
      const meeteenheid = typeof entry === 'string' ? null : entry.meeteenheid;
      items.push({
        categorie: categorie.naam,
        omschrijving,
        meeteenheid,
        meetwaarde: '',
        resultaat: null,
        opmerking: '',
        fotoIds: [],
      });
    });
  });
  return items;
}
