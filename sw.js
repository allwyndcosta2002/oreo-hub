/* Oreo Hub service worker: caches the app so it opens offline. Same-origin GET requests only. */
const CACHE="oreo-hub-6a6f1ac160";
const ASSETS=["./", "./css/fonts.css", "./css/tailwind.css", "./fonts/atkinson-hyperlegible-latin-400-italic.woff2", "./fonts/atkinson-hyperlegible-latin-400-normal.woff2", "./fonts/atkinson-hyperlegible-latin-700-normal.woff2", "./fonts/bricolage-grotesque-latin-600-normal.woff2", "./fonts/bricolage-grotesque-latin-800-normal.woff2", "./icons/apple-touch-icon-135ed68f.png", "./icons/avatar-64-135ed68f.png", "./icons/icon-192-135ed68f.png", "./icons/icon-512-135ed68f.png", "./icons/maskable-512-135ed68f.png", "./index.html", "./js/app.js", "./js/lucide.min.js", "./manifest.webmanifest"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",e=>{
  const r=e.request;if(r.method!=="GET"||new URL(r.url).origin!==location.origin)return;
  const u=new URL(r.url);
  if(u.pathname.endsWith(".webmanifest")){e.respondWith(fetch(r).catch(()=>caches.match(r,{ignoreSearch:true})));return;}
  if(r.mode==="navigate"){e.respondWith(fetch(r,{cache:"no-cache"}).then(res=>{const c=res.clone();caches.open(CACHE).then(ca=>ca.put("./index.html",c));return res;}).catch(()=>caches.match("./index.html")));return;}
  e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(CACHE).then(ca=>ca.put(r,c));}return res;})));
});
