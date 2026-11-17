// 기업가의 길 — 오프라인 지원 서비스워커
const CACHE = 'gieopga-gil-v2';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './favicon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
// 같은 사이트 하위 폴더에 있는 다른 앱은 이 서비스워커가 건드리지 않음(게임 캐시가 섞이지 않게)
const OTHER_APPS = ['lifting-coach/'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const SCOPE_PATH = new URL(self.registration.scope).pathname;

function isOtherApp(pathname) {
  return OTHER_APPS.some(dir => pathname.startsWith(SCOPE_PATH + dir));
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  // 이전 버전 캐시 정리
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameSite = url.origin === self.location.origin;
  // 다른 앱 폴더, 게임 밖 경로, 글꼴이 아닌 외부 파일은 그대로 네트워크로
  if (sameSite && (isOtherApp(url.pathname) || !url.pathname.startsWith(SCOPE_PATH))) return;
  if (!sameSite && !FONT_HOSTS.includes(url.hostname)) return;
  if (req.mode === 'navigate') {
    // 페이지: 온라인이면 최신 파일, 오프라인이면 저장해 둔 파일
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
      return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  // 아이콘·글꼴 등: 캐시에 있으면 바로 쓰고, 뒤에서 새로 받아 둠
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
