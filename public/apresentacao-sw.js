// Service worker da apresentação: guarda a página, os scripts, as fontes e as imagens
// depois da primeira visita, para o Pedro apresentar mesmo se a internet cair.
// Troque a versão abaixo para forçar a limpeza do cache antigo.
const CACHE = "apresentacao-v5";
// ignoreVary: servidores que mandam "Vary: Origin" não podem impedir o uso do cache sem internet
const OPCOES = { ignoreVary: true };

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith("apresentacao-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (e) => {
  if (e.data && e.data.tipo === "guardar" && Array.isArray(e.data.urls)) {
    e.waitUntil(caches.open(CACHE).then((c) => Promise.all(e.data.urls.map((u) => c.add(u).catch(() => null)))));
  }
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // páginas: rede primeiro (conteúdo sempre atualizado), cache se estiver sem internet
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
          return res;
        })
        .catch(() => caches.match(req, OPCOES).then((m) => m || caches.match(url.pathname, OPCOES).then((m2) => m2 || caches.match("/apresentacao", OPCOES)))),
    );
    return;
  }

  // arquivos (scripts, estilos, fontes, imagens têm nome com hash): cache primeiro
  e.respondWith(
    caches.match(req, OPCOES).then(
      (m) =>
        m ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return res;
        }),
    ),
  );
});
