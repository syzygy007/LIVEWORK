/* ============================================================
   LIVEWORK service worker.

   Rule that matters here: this site ships by dragging files into
   the repo, so a cache that serves yesterday's desk.html is worse
   than no cache at all. Pages, CSS and JS are NETWORK FIRST and
   the cache is only a fallback for when the phone has no signal.
   Only fonts and images are cache first, because those never
   change without a new filename.

   Supabase calls are never touched.
   ============================================================ */
const V = 'lw-2';   /* bumped for the design pass: the fonts and marks changed under the same names */
const SHELL = 'lw-shell-' + V;
const ASSETS = 'lw-assets-' + V;

const PRECACHE = [
  'offline.html',
  'lw.css',
  'Manrope-Regular.woff2',
  'Manrope-SemiBold.woff2',
  'Manrope-ExtraBold.woff2',
  'livework-wordmark-heavy-yellow.svg',
  'livework-wordmark-black.svg',
  'icon-192.png',
  'apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL)
      .then(c => Promise.allSettled(PRECACHE.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== ASSETS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });

const isAsset = p => /\.(woff2|ttf|png|jpg|jpeg|svg|ico|webp)$/i.test(p);
const isCode  = p => /\.(css|js|mjs|webmanifest|json)$/i.test(p);

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  /* anything that is not this site, and anything talking to Supabase,
     goes straight to the network and is never stored */
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/functions/') || url.pathname.startsWith('/rest/') || url.pathname.startsWith('/auth/')) return;

  /* pages: network, cache only as the offline fallback */
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(SHELL).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('offline.html')))
    );
    return;
  }

  /* css, js, manifests: network first, cache is the backup */
  if (isCode(url.pathname)) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(SHELL).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  /* fonts and images: cache first, refreshed quietly in the background */
  if (isAsset(url.pathname)) {
    e.respondWith(
      caches.match(req).then(hit => {
        const live = fetch(req).then(res => {
          if (res && res.ok) { const copy = res.clone(); caches.open(ASSETS).then(c => c.put(req, copy)); }
          return res;
        }).catch(() => hit);
        return hit || live;
      })
    );
  }
});
