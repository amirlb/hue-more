"use strict";

self.addEventListener('install', function (e) {
    e.waitUntil(
        caches.open('v1').then(function (cache) {
            return cache.addAll([
                '/hue-more/index.html',
                '/hue-more/style.css',
                '/hue-more/main.js',
                '/hue-more/icon-192.png',
                '/hue-more/icon-512.png'
            ]);
        })
    );
});

self.addEventListener('fetch', function (e) {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});
