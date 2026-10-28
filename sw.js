/* Oreo Hub service worker: caches the app so it opens offline. Same-origin GET requests only. */
const CACHE="oreo-hub-c1b6a96ece";
const ASSETS=["./", "./css/fonts.css", "./css/tailwind.css", "./fonts/atkinson-hyperlegible-latin-400-italic.woff2", "./fonts/atkinson-hyperlegible-latin-400-normal.woff2", "./fonts/atkinson-hyperlegible-latin-700-normal.woff2", "./fonts/bricolage-grotesque-latin-600-normal.woff2", "./fonts/bricolage-grotesque-latin-800-normal.woff2", "./icons/apple-touch-icon.png", "./icons/avatar-64.png", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/maskable-512.png", "./index.html", "./js/app.js", "./js/lucide.min.js", "./manifest.webmanifest"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",e=>{
  const r=e.request;if(r.method!=="GET"||new URL(r.url).origin!==location.origin)return;
  if(r.mode==="navigate"){e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(CACHE).then(ca=>ca.put("./index.html",c));return res;}).catch(()=>caches.match("./index.html")));return;}
  e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(CACHE).then(ca=>ca.put(r,c));}return res;})));
});
