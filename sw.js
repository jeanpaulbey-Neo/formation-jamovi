const CACHE = "formations-v11";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./icon-512-maskable.png",
  "./katex/katex.min.css", "./katex/katex.min.js", "./katex/auto-render.min.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isHTML(req){
  return req.mode === "navigate" ||
    req.destination === "document" ||
    (req.url && (req.url.endsWith("/") || req.url.endsWith("index.html")));
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  // HTML : réseau d'abord (toujours à jour en ligne), cache en secours (hors-ligne)
  if (isHTML(req)) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put("./index.html", copy));
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  // Ressources statiques (KaTeX, polices, icônes) : cache d'abord
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(cached =>
      cached ||
      fetch(req).then(res => {
        if (res.ok && new URL(req.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
    )
  );
});
