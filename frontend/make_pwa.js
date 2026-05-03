const fs = require('fs');

// 1. Update manifest.json
const manifest = {
  "short_name": "CrushDetector",
  "name": "CrushDetector - Find Your Match",
  "description": "The ultimate social app to find out if your crush likes you back!",
  "icons": [
    {
      "src": "favicon.ico",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/x-icon"
    },
    {
      "src": "logo192.png",
      "type": "image/png",
      "sizes": "192x192",
      "purpose": "any maskable"
    },
    {
      "src": "logo512.png",
      "type": "image/png",
      "sizes": "512x512",
      "purpose": "any maskable"
    }
  ],
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#1a1a2e",
  "background_color": "#1a1a2e"
};

fs.writeFileSync('frontend/public/manifest.json', JSON.stringify(manifest, null, 2));

// 2. Create a basic Service Worker in public/sw.js
const swContent = `
const CACHE_NAME = 'crush-detector-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Cache hit
        }
        return fetch(event.request);
      })
  );
});
`;

fs.writeFileSync('frontend/public/sw.js', swContent);

// 3. Register SW in index.js
let indexJs = fs.readFileSync('frontend/src/index.js', 'utf8');
if (!indexJs.includes('serviceWorkerRegistration')) {
    indexJs += `\n\nif ('serviceWorker' in navigator) {\n  window.addEventListener('load', () => {\n    navigator.serviceWorker.register('/sw.js').then(registration => {\n      console.log('SW registered: ', registration);\n    }).catch(registrationError => {\n      console.log('SW registration failed: ', registrationError);\n    });\n  });\n}`;
    fs.writeFileSync('frontend/src/index.js', indexJs);
}

// 4. Update index.html head for Apple/Mobile PWA support
let indexHtml = fs.readFileSync('frontend/public/index.html', 'utf8');
const appleMeta = `
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="CrushDetector" />
    <link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png" />
`;

if (!indexHtml.includes('apple-mobile-web-app-capable')) {
    indexHtml = indexHtml.replace('</head>', `${appleMeta}\n  </head>`);
    indexHtml = indexHtml.replace('<meta name="theme-color" content="#000000" />', '<meta name="theme-color" content="#1a1a2e" />');
    fs.writeFileSync('frontend/public/index.html', indexHtml);
}

console.log("PWA conversion completed.");
