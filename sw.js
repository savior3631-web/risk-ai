// 오프라인/저속망 대비 캐시 (영상·프레임은 다루지 않음)
const V = 'risk-ai-v23-1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('risk-ai-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 실시간 API(기상청·카카오)와 대용량 AI 모델(transformers.js가 자체 캐시)은 건드리지 않음
  if (/apis\.data\.go\.kr|dapi\.kakao\.com|huggingface\.co|hf\.co/.test(url.hostname)) return;
  if (url.pathname.endsWith('.onnx') || url.pathname.endsWith('ready.json') || url.pathname.includes('/models/Xenova/')) return;

  // 페이지: 네트워크 우선(업데이트 즉시 반영), 실패 시 캐시
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html')){
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(V).then(c => c.put('./index.html', cp)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // 라이브러리·차량감지 모델: 캐시 우선
  if (url.origin === location.origin || /cdn\.jsdelivr\.net|storage\.googleapis\.com/.test(url.hostname)){
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok && (r.type === 'basic' || r.type === 'cors')){ const cp = r.clone(); caches.open(V).then(c => c.put(req, cp)); }
      return r;
    })));
  }
});
