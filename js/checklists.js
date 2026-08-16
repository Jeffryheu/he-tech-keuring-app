export const CHECKLISTS = {
  oplevering: {
    label: 'Oplevering nieuwe installatie',
    subtitel: 'NEN 1010',
    categorieen: [
      {
        naam: 'Groepenkast',
        items: [
          'Aardlekschakelaars aanwezig en functioneren (testknop ingedrukt)',
          'Groepindeling logisch en overeenkomstig het schema',
          'Alle groepen voorzien van duidelijke etikettering',
          'Bedrading netjes weggewerkt, geen loshangende draden',
          'Aansluitingen goed vastgedraaid (steekproefsgewijs gecontroleerd)',
          'Hoofdschakelaar goed bereikbaar en functioneert',
        ],
      },
      {
        naam: 'Aarding',
        items: [
          'Hoofdaarde aanwezig en goed aangesloten',
          { omschrijving: 'Aardweerstand gemeten en binnen norm', meeteenheid: 'Ohm' },
          'Potentiaalvereffening aangebracht (bv. leidingwerk, badkamer)',
        ],
      },
      {
        naam: 'Installatie algemeen',
        items: [
          'Wandcontactdozen goed bevestigd en functioneren',
          'Schakelmateriaal goed bevestigd en functioneert',
          'Kabelroutes veilig weggewerkt (geen mechanische belasting/knelpunten)',
          'Doorverbindingen in lasdozen/verdelers deugdelijk',
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
