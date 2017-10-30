const cacheName = '2';
const productStorageKey = 'productsInCart';

importScripts(
  './scripts/template-stream.js',
  './scripts/html-decoder.js',
  './scripts/localforage.js'
);

addEventListener('install', event => {
  event.waitUntil(
    caches.open(cacheName).then(cache => {
      return cache.addAll([
        './templates/head.html',
        './templates/tail.html',
        './templates/body.html',
        './templates/product.html',
        './templates/cart.html',
        'https://darrens-fake-furniture.myshopify.com/products.json'
      ]);
    })
  );

  self.skipWaiting();
});

addEventListener('activate', event => {
  clients.claim();
});

function renderTemplate(template, inputData = []) {
  return template.then(html => {
    const decodedHTML = htmlDecode(html);
    const dataPromise = Promise.resolve(inputData);
    return dataPromise.then(data => eval('`' + decodedHTML + '`')); // hell yaaaaaa
  });
}

function addProductToStorage(product) {
  return localforage.getItem(productStorageKey).then(products => {
    if (products && products.includes(product)) return;

    if (!products) {
      products = [];
    }
    return localforage.setItem(productStorageKey, [...products, product]);
  });
}

function removeProductFromCart(id) {
  return localforage.getItem(productStorageKey).then(products => {
    const validProducts = products.filter(product => product !== id);
    return localforage.setItem(productStorageKey, validProducts);
  });
}

function isProductInCart(id) {
  return localforage
    .getItem(productStorageKey)
    .then(products => products && products.includes(id.toString()));
}

function cartCount() {
  return localforage.getItem(productStorageKey).then(productCache => {
    if (!productCache) {
      productCache = [];
    }
    return {cart_count: productCache.length};
  });
}

function transformImages(data) {
  const products = data.products.map(product => {
    const src = product.images[0].src;
    const jpgIndex = src.indexOf('.jpg');
    product.small_image = [
      src.slice(0, jpgIndex),
      '_pico',
      src.slice(jpgIndex)
    ].join('');
    return product;
  });

  return Object.assign(data, {products: products});
}

const indexView = () => templateStream`
  ${renderTemplate(
    caches.match('./templates/head.html').then(res => res.text())
  )}
  ${renderTemplate(
    caches.match('./templates/body.html').then(res => res.text()),
    caches
      .match('https://darrens-fake-furniture.myshopify.com/products.json')
      .then(res => res.json())
      .then(json => transformImages(json))
  )}
  ${renderTemplate(
    caches.match('./templates/tail.html').then(res => res.text()),
    cartCount()
  )}
`;

const productView = id => templateStream`
  ${renderTemplate(
    caches.match('./templates/head.html').then(res => res.text())
  )}
  ${renderTemplate(
    caches.match('./templates/product.html').then(res => res.text()),
    caches
      .match('https://darrens-fake-furniture.myshopify.com/products.json')
      .then(res => res.json())
      .then(json => transformImages(json))
      .then(({products}) =>
        products.find(product => product.id.toString() === id)
      )
      .then(product => {
        return isProductInCart(product.id).then(res => {
          if (res) {
            product.already_added = true;
            return product;
          }

          product.already_added = false;
          return product;
        });
      })
  )}
  ${renderTemplate(
    caches.match('./templates/tail.html').then(res => res.text()),
    cartCount()
  )}
`;

const cartView = () => templateStream`
  ${renderTemplate(
    caches.match('./templates/head.html').then(res => res.text())
  )}
  ${renderTemplate(
    caches.match('./templates/cart.html').then(res => res.text()),
    caches
      .match('https://darrens-fake-furniture.myshopify.com/products.json')
      .then(res => res.json())
      .then(json => transformImages(json))
      .then(({products}) =>
        localforage.getItem(productStorageKey).then(productCache => {
          if (!productCache) return [];

          return products.filter(product =>
            productCache.includes(product.id.toString())
          );
        })
      )
      .then(products => products)
  )}
  ${renderTemplate(
    caches.match('./templates/tail.html').then(res => res.text()),
    cartCount()
  )}
`;

addEventListener('fetch', event => {
  const requestURL = new URL(event.request.url);
  if (requestURL.origin != location.origin) return;

  if (requestURL.pathname === '/') {
    event.respondWith(
      new Response(indexView(), {
        headers: {'Content-Type': 'text/html; charset=utf-8 '}
      })
    );
  } else if (requestURL.pathname.includes('product')) {
    event.respondWith(
      new Response(productView(requestURL.pathname.split('/').pop()), {
        headers: {'Content-Type': 'text/html; charset=utf-8 '}
      })
    );
  } else if (requestURL.pathname.includes('cart')) {
    if (event.request.method === 'POST') {
      event.respondWith(
        event.request.formData().then(data => {
          const hiddenMethod = data.get('hidden_method');

          if (hiddenMethod === 'POST') {
            return addProductToStorage(data.get('id')).then(() => {
              return new Response(cartView(), {
                headers: {'Content-Type': 'text/html; charset=utf-8'}
              });
            });
          } else if (hiddenMethod === 'DELETE') {
            return removeProductFromCart(data.get('id')).then(() => {
              return new Response(cartView(), {
                headers: {'Content-Type': 'text/html; charset=utf-8'}
              });
            });
          }
        })
      );
    } else {
      event.respondWith(
        new Response(cartView(), {
          headers: {'Content-Type': 'text/html; charset=utf-8 '}
        })
      );
    }
  } else {
    event.respondWith(fetch(event.request));
  }
});
