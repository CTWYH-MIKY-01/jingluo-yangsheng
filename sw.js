// 经络养生提醒 PWA Service Worker v5（升级：版本自动更新机制）
var CACHE = 'jlys-v5';
var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './放松口令.mp3',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png'
];
// 注意：version.txt 不入缓存、不做缓存优先，必须网络优先，否则客户端永远读到旧版本号

// 安装：预缓存核心文件后立即激活
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k !== CACHE;
      }).map(function (k) {
        return caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// 拦截请求：首页采用「网络优先」保证拿到最新版；其余同源 GET 缓存优先；B站/跨域直接放行
self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'SKIP_WAITING') { self.skipWaiting(); }
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  var url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) {
    return; // 跨域（B站 iframe、其内嵌资源）不处理，正常走网络
  }
  // version.txt 必须走网络，永远拿服务器最新版本号（不能被旧缓存坑）
  if (url.pathname.indexOf('version.txt') !== -1) {
    return;
  }
  var isDoc = (req.mode === 'navigate') || /\/index\.html$/.test(url.pathname) || url.pathname.endsWith('/');
  if (isDoc) {
    // 首页网络优先：在线时永远拿最新 index.html，离线回退缓存
    e.respondWith(
      fetch(req).then(function (resp) {
        var cp = resp.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', cp); });
        return resp;
      }).catch(function () {
        return caches.match('./index.html');
      })
    );
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) { return hit; }
      return fetch(req).then(function (resp) {
        var cp = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(req, cp); });
        return resp;
      }).catch(function () {
        return caches.match('./index.html');
      });
    })
  );
});
