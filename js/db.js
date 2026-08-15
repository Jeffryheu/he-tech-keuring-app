const DB_NAME = 'keuring-app';
const DB_VERSION = 1;
const STORE_KEURINGEN = 'keuringen';
const STORE_FOTOS = 'fotos';

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_KEURINGEN)) {
        db.createObjectStore(STORE_KEURINGEN, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_FOTOS)) {
        const fotoStore = db.createObjectStore(STORE_FOTOS, { keyPath: 'id' });
        fotoStore.createIndex('keuringId', 'keuringId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveKeuring(keuring) {
  const db = await openDb();
  const tx = db.transaction(STORE_KEURINGEN, 'readwrite');
  tx.objectStore(STORE_KEURINGEN).put(keuring);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(keuring);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getKeuring(id) {
  const db = await openDb();
  const tx = db.transaction(STORE_KEURINGEN, 'readonly');
  return promisifyRequest(tx.objectStore(STORE_KEURINGEN).get(id));
}

export async function listKeuringen() {
  const db = await openDb();
  const tx = db.transaction(STORE_KEURINGEN, 'readonly');
  const all = await promisifyRequest(tx.objectStore(STORE_KEURINGEN).getAll());
  return all.sort((a, b) => b.bijgewerkt.localeCompare(a.bijgewerkt));
}

export async function deleteKeuring(id) {
  const fotos = await getFotosByKeuring(id);
  const db = await openDb();
  const tx = db.transaction([STORE_KEURINGEN, STORE_FOTOS], 'readwrite');
  tx.objectStore(STORE_KEURINGEN).delete(id);
  const fotoStore = tx.objectStore(STORE_FOTOS);
  fotos.forEach((foto) => fotoStore.delete(foto.id));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveFoto(foto) {
  const db = await openDb();
  const tx = db.transaction(STORE_FOTOS, 'readwrite');
  tx.objectStore(STORE_FOTOS).put(foto);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(foto);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getFotosByKeuring(keuringId) {
  const db = await openDb();
  const tx = db.transaction(STORE_FOTOS, 'readonly');
  const index = tx.objectStore(STORE_FOTOS).index('keuringId');
  return promisifyRequest(index.getAll(keuringId));
}

export async function deleteFoto(id) {
  const db = await openDb();
  const tx = db.transaction(STORE_FOTOS, 'readwrite');
  tx.objectStore(STORE_FOTOS).delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
