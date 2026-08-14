/* ============================================================
   SERVICE WORKER — Sabor&Validade
   Guarda uma cópia do "esqueleto" do app para abrir rápido
   e funcionar mesmo sem internet. Dados salvos (despensa,
   lista de compras) continuam no localStorage do navegador,
   isso aqui só cuida dos arquivos do app em si.
============================================================ */

const CACHE_VERSION = "sabor-validade-v1";

// Arquivos essenciais do app (o "esqueleto")
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

/* ---------- INSTALAÇÃO ---------- */
// Guarda o esqueleto do app assim que o service worker é instalado.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

/* ---------- ATIVAÇÃO ---------- */
// Remove versões antigas do cache quando uma nova é instalada.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

/* ---------- BUSCA DE ARQUIVOS ---------- */
// Estratégia: tenta a internet primeiro (para pegar sempre a versão
// mais nova); se não tiver internet, usa a cópia salva no cache.
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Só cuida de pedidos GET (o resto — como POST — passa direto).
  if (req.method !== "GET") return;

  // Pedidos para outros sites (CDNs de IA, Open Food Facts, etc.)
  // vão direto para a internet — não tentamos guardá-los aqui.
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
        return response;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match("./index.html"))
      )
  );
});
