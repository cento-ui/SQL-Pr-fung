// Einfacher Offline-Cache: zuerst das Netz (so kommen Updates sofort an), bei Fehler die zuletzt gespeicherte Kopie.
// Gespeichert werden nur eigene Dateien und sql.js von cdnjs. Neue Version: CACHE hochzählen, alte Caches werden gelöscht.
const CACHE = 'sql-detektei-v1';
const SQLJS = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/';
const CORE = ['./', 'index.html', 'css/style.css', 'manifest.webmanifest', 'icon-192.png',
  'js/app.js', 'js/compare.js', 'js/content.js', 'js/db.js', 'js/highlight.js', 'js/markdown.js', 'js/progress.js', 'js/tasks.js', 'js/util.js',
  'data/databases.json', 'data/lernziele.json', 'data/figuren.json', 'data/fehlerarten.json', 'data/hilfsblatt.md', 'data/flugbuchung.sql', 'chapters/index.json',
  SQLJS + '1.10.3/sql-wasm.js', SQLJS + '1.10.3/sql-wasm.wasm'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin && !req.url.startsWith(SQLJS)) return;
  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res && res.ok && (res.type === 'basic' || res.type === 'cors')) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    } catch (err) {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') {
        const home = await caches.match('index.html');
        if (home) return home;
      }
      throw err;
    }
  })());
});
