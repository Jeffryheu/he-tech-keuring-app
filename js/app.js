import * as DB from './db.js';
import { CHECKLISTS, buildInitialItems } from './checklists.js';

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
    reader.onerror = reject;
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
    };
    img.onerror = reject;
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
    `;
  }
  return `
    <label class="veld"><span>Klantnaam</span><input type="text" data-veld="klant.naam" value="${escapeHtml(keuring.klant.naam)}"></label>
    <label class="veld"><span>Adres</span><input type="text" data-veld="klant.adres" value="${escapeHtml(keuring.klant.adres)}"></label>
    <label class="veld"><span>Datum</span><input type="date" data-veld="datum" value="${escapeHtml(keuring.datum)}"></label>
    <label class="veld"><span>Monteur</span><input type="text" data-veld="monteur" value="${escapeHtml(keuring.monteur)}"></label>
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
    renderForm(keuring.id);
  });

  $form.querySelector('[data-actie="verwijderen"]')?.addEventListener('click', async () => {
    if (!confirm('Deze keuring verwijderen? Dit kan niet ongedaan gemaakt worden.')) return;
    await DB.deleteKeuring(keuring.id);
    location.hash = '#/';
  });

  $form.addEventListener('change', async (event) => {
    if (!event.target.classList.contains('item__foto-input')) return;
    const file = event.target.files[0];
    if (!file) return;
    const itemIndex = Number(event.target.dataset.itemIndex);
    const blob = await compressImage(file);
    const foto = { id: crypto.randomUUID(), keuringId: keuring.id, blob, gemaakt: new Date().toISOString() };
    await DB.saveFoto(foto);
    keuring.items[itemIndex].fotoIds.push(foto.id);
    keuring.bijgewerkt = new Date().toISOString();
    await DB.saveKeuring(keuring);
    renderForm(keuring.id);
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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js');
  });
}

window.addEventListener('hashchange', route);
route();
