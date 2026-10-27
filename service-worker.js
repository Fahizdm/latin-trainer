const CACHE = 'latin-trainer-cloud-v1';
self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil((async()=>{ for(const k of await caches.keys()){if(k!==CACHE)await caches.delete(k)} await self.clients.claim(); })()); });
self.addEventListener('fetch', event => { const request=event.request; if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin) return; event.respondWith((async()=>{try{const response=await fetch(request);if(response.ok) (await caches.open(CACHE)).put(request,response.clone());return response;}catch(e){return (await caches.match(request))||Response.error();}})()); });
