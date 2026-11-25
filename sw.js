
const CACHE = "electrosmeta-v3";

const ROOT = self.registration.scope;
const INDEX = new URL("index.html", ROOT).href;
const MANIFEST = new URL("manifest.json", ROOT).href;

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);

    await cache.addAll([
      new Request(INDEX, {cache: "reload"}),
      new Request(MANIFEST, {cache: "reload"})
    ]);

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys.filter(key =>
        key.startsWith("electrosmeta-") &&
        key !== CACHE
      ).map(key => caches.delete(key))
    );

    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  if (
    request.mode === "navigate" &&
    request.url.startsWith(ROOT)
  ) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const saved = await cache.match(INDEX);

      if (saved) return saved;

      const response = await fetch(INDEX);

      if (response.ok) {
        await cache.put(INDEX, response.clone());
      }

      return response;
    })());

    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const saved = await cache.match(request);

    if (saved) return saved;

    try {
      const response = await fetch(request);

      if (
        response.ok ||
        response.type === "opaque"
      ) {
        await cache.put(
          request,
          response.clone()
        );
      }

      return response;
    } catch {
      return new Response("", {
        status: 503
      });
    }
  })());
});
