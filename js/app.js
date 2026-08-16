import * as DB from './db.js';
import { CHECKLISTS, buildInitialItems, buildGroep } from './checklists.js';
import { genereerRapport } from './pdf.js';
import { deelPdf } from './share.js';

const $app = document.getElementById('app');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function setPath(obj, path, value) {
  const parts = path.split('.');
  let target = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = /^\d+$/.test(parts[i]) ? Number(parts[i]) : parts[i];
    target = target[key];
  }
  const lastKey = /^\d+$/.test(parts[parts.length - 1]) ? Number(parts[parts.length - 1]) : parts[parts.length - 1];
  target[lastKey] = value;
}

function compressImage(file, maxDim = 1600, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const img = new Image();
    reader.onload = () => { img.src = reader.result; };
    reader.onerror = () => reject(new Error('Kon bestand niet lezen'));
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Kon afbeelding niet comprimeren'));
      }, 'image/jpeg', quality);
    };
    img.onerror = () => reject(new Error('Bestand is geen geldige afbeelding'));
    reader.readAsDataURL(file);
  });
}

async function route() {
  const hash = location.hash || '#/';
  const match = hash.match(/^#\/keuring\/(.+)$/);
  if (match) {
    await renderForm(match[1]);
  } else {
    await renderHome();
  }
}

async function renderHome() {
  const keuringen = await DB.listKeuringen();
  $app.innerHTML = `
    <section class="nieuw">
      <h2>Nieuwe keuring</h2>
      <div class="nieuw__knoppen">
        <button class="btn btn--primary" data-type="oplevering">Oplevering (NEN 1010)</button>
        <button class="btn btn--primary" data-type="periodiek">Periodieke keuring (NEN 3140)</button>
        <button class="btn btn--primary" data-type="lmra">LMRA</button>
      </div>
    </section>
    <section class="geschiedenis">
      <h2>Geschiedenis</h2>
      ${keuringen.length === 0
        ? '<p class="leeg">Nog geen keuringen.</p>'
        : `<ul class="geschiedenis__lijst">${keuringen.map(renderGeschiedenisItem).join('')}</ul>`}
    </section>
  `;
  $app.querySelectorAll('.nieuw__knoppen button').forEach((btn) => {
    btn.addEventListener('click', () => startNieuweKeuring(btn.dataset.type));
  });
  $app.querySelectorAll('.geschiedenis__lijst li').forEach((li) => {
    li.addEventListener('click', () => { location.hash = `#/keuring/${li.dataset.id}`; });
  });
}

function renderGeschiedenisItem(keuring) {
  const label = CHECKLISTS[keuring.type].label;
  const statusLabel = keuring.status === 'afgerond' ? 'Afgerond' : 'Concept';
  const naam = keuring.klant?.naam || keuring.werkzaamheden || '(geen naam)';
  return `
    <li data-id="${keuring.id}" class="geschiedenis__item geschiedenis__item--${keuring.status}">
      <span class="geschiedenis__type">${escapeHtml(label)}</span>
      <span class="geschiedenis__status">${statusLabel}</span>
      <span class="geschiedenis__klant">${escapeHtml(naam)}</span>
      <span class="geschiedenis__datum">${escapeHtml(keuring.datum)}</span>
    </li>
  `;
}

async function startNieuweKeuring(type) {
  const nu = new Date().toISOString();
  const keuring = {
    id: crypto.randomUUID(),
    type,
    status: 'concept',
    klant: { naam: '', adres: '' },
    datum: nu.slice(0, 10),
    monteur: '',
    items: buildInitialItems(type),
    groepen: [],
    algemeneOpmerkingen: '',
    aangemaakt: nu,
    bijgewerkt: nu,
    werkzaamheden: '',
    betrokkenen: '',
    gaGeenGa: null,
  };
  await DB.saveKeuring(keuring);
  location.hash = `#/keuring/${keuring.id}`;
}

async function renderForm(id) {
  const keuring = await DB.getKeuring(id);
  if (!keuring) { location.hash = '#/'; return; }
  const checklist = CHECKLISTS[keuring.type];
  const fotos = await DB.getFotosByKeuring(keuring.id);
  const fotoUrlMap = new Map(fotos.map((foto) => [foto.id, URL.createObjectURL(foto.blob)]));
  $app.innerHTML = `
    <section class="formulier">
      <a href="#/" class="terug">&larr; Terug</a>
      <h2>${escapeHtml(checklist.label)} <span class="subtitel">${escapeHtml(checklist.subtitel)}</span></h2>
      ${renderKopVelden(keuring)}
      ${keuring.type !== 'lmra' ? renderGroepenSectie(keuring) : ''}
      ${checklist.categorieen.map((cat) => renderCategorie(keuring, cat, fotoUrlMap)).join('')}
      <label class="veld">
        <span>Algemene opmerkingen</span>
        <textarea data-veld="algemeneOpmerkingen">${escapeHtml(keuring.algemeneOpmerkingen)}</textarea>
      </label>
      <div class="formulier__acties">
        ${keuring.status === 'concept'
          ? '<button class="btn btn--primary" data-actie="afronden">Afronden</button>'
          : '<button class="btn btn--primary" data-actie="deel-opnieuw">Deel opnieuw</button>'}
        <button class="btn btn--gevaar" data-actie="verwijderen">Verwijderen</button>
      </div>
    </section>
  `;
  bindFormEvents(keuring);
}

function renderKopVelden(keuring) {
  if (keuring.type === 'lmra') {
    return `
      <label class="veld"><span>Werkzaamheden</span><input type="text" data-veld="werkzaamheden" value="${escapeHtml(keuring.werkzaamheden)}"></label>
      <label class="veld"><span>Betrokkenen</span><input type="text" data-veld="betrokkenen" value="${escapeHtml(keuring.betrokkenen)}"></label>
      <label class="veld"><span>Datum</span><input type="date" data-veld="datum" value="${escapeHtml(keuring.datum)}"></label>
      <div class="veld">
        <span>Ga/geen-ga beslissing</span>
        <div class="item__resultaten">
          <label class="resultaat resultaat--ga">
            <input type="radio" name="gaGeenGa" value="ga" data-veld="gaGeenGa" ${keuring.gaGeenGa === 'ga' ? 'checked' : ''}>
            <span>Ga</span>
          </label>
          <label class="resultaat resultaat--geenga">
            <input type="radio" name="gaGeenGa" value="geen-ga" data-veld="gaGeenGa" ${keuring.gaGeenGa === 'geen-ga' ? 'checked' : ''}>
            <span>Geen ga</span>
          </label>
        </div>
      </div>
    `;
  }
  return `
    <label class="veld"><span>Klantnaam</span><input type="text" data-veld="klant.naam" value="${escapeHtml(keuring.klant.naam)}"></label>
    <label class="veld"><span>Adres</span><input type="text" data-veld="klant.adres" value="${escapeHtml(keuring.klant.adres)}"></label>
    <label class="veld"><span>Datum</span><input type="date" data-veld="datum" value="${escapeHtml(keuring.datum)}"></label>
    <label class="veld"><span>Monteur</span><input type="text" data-veld="monteur" value="${escapeHtml(keuring.monteur)}"></label>
  `;
}

function renderGroepenSectie(keuring) {
  const groepen = keuring.groepen || [];
  return `
    <fieldset class="categorie groepen">
      <legend>Groepen &amp; meetgegevens</legend>
      <label class="veld veld--aantal-groepen">
        <span>Aantal groepen</span>
        <input type="number" min="0" inputmode="numeric" data-actie="aantal-groepen" value="${groepen.length || ''}">
      </label>
      ${groepen.map((groep, i) => renderGroep(groep, i)).join('')}
    </fieldset>
  `;
}

function renderGroep(groep, i) {
  const driefase = groep.fase === '3-fase';
  return `
    <div class="groep" data-groep-index="${i}">
      <p class="groep__titel">Groep ${groep.nummer}</p>
      <label class="veld"><span>Naam/omschrijving</span><input type="text" data-veld="groepen.${i}.naam" value="${escapeHtml(groep.naam)}"></label>
      <label class="veld">
        <span>Fase</span>
        <select class="groep__fase" data-groep-index="${i}">
          <option value="1-fase" ${!driefase ? 'selected' : ''}>1-fase</option>
          <option value="3-fase" ${driefase ? 'selected' : ''}>3-fase</option>
        </select>
      </label>
      <div class="groep__rij">
        <label class="veld"><span>Zekering/automaat (A)</span><input type="text" inputmode="decimal" data-veld="groepen.${i}.zekering" value="${escapeHtml(groep.zekering)}"></label>
        <label class="veld"><span>Aderdoorsnede (mm²)</span><input type="text" inputmode="decimal" data-veld="groepen.${i}.aderdoorsnede" value="${escapeHtml(groep.aderdoorsnede)}"></label>
      </div>
      <p class="groep__subkop">Isolatieweerstand (MΩ)</p>
      <div class="groep__rij">
        <label class="veld"><span>L1-PE</span><input type="text" inputmode="decimal" data-veld="groepen.${i}.isolatie.l1pe" value="${escapeHtml(groep.isolatie.l1pe)}"></label>
        <label class="veld"><span>N-PE</span><input type="text" inputmode="decimal" data-veld="groepen.${i}.isolatie.npe" value="${escapeHtml(groep.isolatie.npe)}"></label>
        ${driefase ? `
          <label class="veld"><span>L2-PE</span><input type="text" inputmode="decimal" data-veld="groepen.${i}.isolatie.l2pe" value="${escapeHtml(groep.isolatie.l2pe)}"></label>
          <label class="veld"><span>L3-PE</span><input type="text" inputmode="decimal" data-veld="groepen.${i}.isolatie.l3pe" value="${escapeHtml(groep.isolatie.l3pe)}"></label>
        ` : ''}
      </div>
      <label class="veld"><span>Lusimpedantie Zs (Ω)</span><input type="text" inputmode="decimal" data-veld="groepen.${i}.zs" value="${escapeHtml(groep.zs)}"></label>
      <label class="groep__aardlek-toggle">
        <input type="checkbox" class="groep__aardlek-aanwezig" data-groep-index="${i}" ${groep.aardlekAanwezig ? 'checked' : ''}>
        <span>Aardlekschakelaar op deze groep</span>
      </label>
      ${groep.aardlekAanwezig ? `
        <div class="groep__rij">
          <label class="veld"><span>I∆n (mA)</span><input type="text" inputmode="decimal" data-veld="groepen.${i}.aardlek.iDeltaN" value="${escapeHtml(groep.aardlek.iDeltaN)}"></label>
          <label class="veld"><span>Aanspreektijd (ms)</span><input type="text" inputmode="decimal" data-veld="groepen.${i}.aardlek.tijd" value="${escapeHtml(groep.aardlek.tijd)}"></label>
        </div>
        <div class="item__resultaten">
          <label class="resultaat resultaat--ok"><input type="radio" name="aardlek-testknop-${i}" value="ok" data-veld="groepen.${i}.aardlek.testknop" ${groep.aardlek.testknop === 'ok' ? 'checked' : ''}><span>testknop ok</span></label>
          <label class="resultaat resultaat--afgekeurd"><input type="radio" name="aardlek-testknop-${i}" value="afgekeurd" data-veld="groepen.${i}.aardlek.testknop" ${groep.aardlek.testknop === 'afgekeurd' ? 'checked' : ''}><span>testknop afgekeurd</span></label>
        </div>
      ` : ''}
      <textarea class="item__opmerking" placeholder="Opmerking" data-veld="groepen.${i}.opmerking">${escapeHtml(groep.opmerking)}</textarea>
    </div>
  `;
}

function renderCategorie(keuring, categorie, fotoUrlMap) {
  const items = keuring.items.filter((item) => item.categorie === categorie.naam);
  return `
    <fieldset class="categorie">
      <legend>${escapeHtml(categorie.naam)}</legend>
      ${items.map((item) => renderItem(keuring, item, fotoUrlMap)).join('')}
    </fieldset>
  `;
}

function renderItem(keuring, item, fotoUrlMap) {
  const itemIndex = keuring.items.indexOf(item);
  const resultaten = ['ok', 'afgekeurd', 'n.v.t.'];
  const fotos = item.fotoIds.map((fotoId) => `
    <span class="foto-thumb">
      <img src="${fotoUrlMap.get(fotoId)}" alt="Foto bij item">
      <button type="button" class="foto-thumb__verwijder" data-verwijder-foto="${fotoId}" data-item-index="${itemIndex}">&times;</button>
    </span>
  `).join('');
  return `
    <div class="item" data-item-index="${itemIndex}">
      <p class="item__omschrijving">${escapeHtml(item.omschrijving)}</p>
      <div class="item__resultaten">
        ${resultaten.map((r) => `
          <label class="resultaat resultaat--${r.replace(/\./g, '')}">
            <input type="radio" name="resultaat-${itemIndex}" value="${r}" data-veld="items.${itemIndex}.resultaat" ${item.resultaat === r ? 'checked' : ''}>
            <span>${r}</span>
          </label>
        `).join('')}
      </div>
      ${item.meeteenheid ? `
        <label class="veld veld--meting">
          <span>Meetwaarde (${escapeHtml(item.meeteenheid)})</span>
          <input type="text" inputmode="decimal" placeholder="bv. 1.2" value="${escapeHtml(item.meetwaarde)}" data-veld="items.${itemIndex}.meetwaarde">
        </label>
      ` : ''}
      <textarea class="item__opmerking" placeholder="Opmerking" data-veld="items.${itemIndex}.opmerking">${escapeHtml(item.opmerking)}</textarea>
      <div class="item__fotos">${fotos}</div>
      <label class="btn btn--klein">
        Foto toevoegen
        <input type="file" accept="image/*" capture="environment" class="item__foto-input" data-item-index="${itemIndex}" hidden>
      </label>
    </div>
  `;
}

function bindFormEvents(keuring) {
  const $form = $app.querySelector('.formulier');

  $form.addEventListener('input', async (event) => {
    const veld = event.target.dataset.veld;
    if (!veld) return;
    if (event.target.type === 'radio' && !event.target.checked) return;
    setPath(keuring, veld, event.target.value);
    keuring.bijgewerkt = new Date().toISOString();
    await DB.saveKeuring(keuring);
  });

  $form.querySelector('[data-actie="afronden"]')?.addEventListener('click', async () => {
    keuring.status = 'afgerond';
    keuring.bijgewerkt = new Date().toISOString();
    await DB.saveKeuring(keuring);
    await deelRapport(keuring);
    renderForm(keuring.id);
  });

  $form.querySelector('[data-actie="deel-opnieuw"]')?.addEventListener('click', async () => {
    await deelRapport(keuring);
  });

  $form.querySelector('[data-actie="verwijderen"]')?.addEventListener('click', async () => {
    if (!confirm('Deze keuring verwijderen? Dit kan niet ongedaan gemaakt worden.')) return;
    await DB.deleteKeuring(keuring.id);
    location.hash = '#/';
  });

  $form.addEventListener('change', async (event) => {
    if (event.target.dataset.actie === 'aantal-groepen') {
      const aantal = Math.max(0, Math.min(99, Number(event.target.value) || 0));
      const huidig = keuring.groepen || [];
      const nieuw = [];
      for (let i = 0; i < aantal; i++) {
        nieuw.push(huidig[i] || buildGroep(i + 1));
      }
      keuring.groepen = nieuw;
      keuring.bijgewerkt = new Date().toISOString();
      await DB.saveKeuring(keuring);
      renderForm(keuring.id);
      return;
    }
    if (event.target.classList.contains('groep__fase')) {
      const groepIndex = Number(event.target.dataset.groepIndex);
      keuring.groepen[groepIndex].fase = event.target.value;
      keuring.bijgewerkt = new Date().toISOString();
      await DB.saveKeuring(keuring);
      renderForm(keuring.id);
      return;
    }
    if (event.target.classList.contains('groep__aardlek-aanwezig')) {
      const groepIndex = Number(event.target.dataset.groepIndex);
      keuring.groepen[groepIndex].aardlekAanwezig = event.target.checked;
      keuring.bijgewerkt = new Date().toISOString();
      await DB.saveKeuring(keuring);
      renderForm(keuring.id);
      return;
    }
  });

  $form.addEventListener('change', async (event) => {
    if (!event.target.classList.contains('item__foto-input')) return;
    const file = event.target.files[0];
    if (!file) return;
    try {
      const itemIndex = Number(event.target.dataset.itemIndex);
      const blob = await compressImage(file);
      const foto = { id: crypto.randomUUID(), keuringId: keuring.id, blob, gemaakt: new Date().toISOString() };
      await DB.saveFoto(foto);
      keuring.items[itemIndex].fotoIds.push(foto.id);
      keuring.bijgewerkt = new Date().toISOString();
      await DB.saveKeuring(keuring);
      renderForm(keuring.id);
    } catch (err) {
      alert('Foto toevoegen is mislukt. Probeer het opnieuw.');
      console.error(err);
    }
  });

  $form.addEventListener('click', async (event) => {
    const fotoId = event.target.dataset.verwijderFoto;
    if (!fotoId) return;
    const itemIndex = Number(event.target.dataset.itemIndex);
    await DB.deleteFoto(fotoId);
    keuring.items[itemIndex].fotoIds = keuring.items[itemIndex].fotoIds.filter((id) => id !== fotoId);
    keuring.bijgewerkt = new Date().toISOString();
    await DB.saveKeuring(keuring);
    renderForm(keuring.id);
  });
}

async function deelRapport(keuring) {
  const fotos = await DB.getFotosByKeuring(keuring.id);
  const naamDeel = keuring.klant?.naam || keuring.werkzaamheden || 'rapport';
  const bestandsnaam = `${keuring.type}-${keuring.datum}-${naamDeel.replace(/\s+/g, '-')}.pdf`;
  try {
    const pdfBytes = await genereerRapport(keuring, fotos);
    await deelPdf(pdfBytes, bestandsnaam);
  } catch (err) {
    if (err.name !== 'AbortError') {
      alert('Delen is mislukt. Probeer het later opnieuw via de knop "Deel opnieuw".');
      console.error(err);
    }
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js');
  });
}

window.addEventListener('hashchange', route);
route();
