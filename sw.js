/* Sandık service worker — çevrimdışı destek */
const VERSION = "sandik-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./pdf-birlestir.html",
  "./pdf-sayfa-duzenle.html",
  "./pdf-gorsel.html",
  "./gorsel-pdf.html",
  "./gorsel-sikistir.html",
  "./pdf-kucult.html",
  "./qr-kod.html",
  "./pdf-metin.html",
  "./hakkinda.html",
  "./gizlilik.html",
  "./iletisim.html",
  "./404.html",
  "./assets/css/style.css",
  "./assets/js/config.js",
  "./assets/js/core.js",
  "./assets/js/tools/merge.js",
  "./assets/js/tools/pages.js",
  "./assets/js/tools/pdf2img.js",
  "./assets/js/tools/img2pdf.js",
  "./assets/js/tools/imgcompress.js",
  "./assets/js/tools/pdfshrink.js",
  "./assets/js/tools/qr.js",
  "./assets/js/tools/pdftext.js",
  "./libs/pdf-lib.min.js",
  "./libs/pdf.min.js",
  "./libs/pdf.worker.min.js",
  "./libs/qrcode.js",
  "./libs/fflate.min.js",
  "./icons/logo.svg",
  "./icons/favicon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/hero.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      await cache.addAll(ASSETS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(VERSION);
          cache.put(req, fresh.clone());
          return fresh;
        } catch (e) {
          const cache = await caches.open(VERSION);
          return (await cache.match(req)) || (await cache.match("./index.html")) || Response.error();
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      const hit = await cache.match(req);
      if (hit) {
        fetch(req)
          .then((r) => { if (r && r.ok) cache.put(req, r); })
          .catch(() => {});
        return hit;
      }
      try {
        const r = await fetch(req);
        if (r && r.ok) cache.put(req, r.clone());
        return r;
      } catch (e) {
        return Response.error();
      }
    })()
  );
});
