const VERSION = '22912da16bd6cd691f4b';
const ASSETS = [{"url":"app.js","bytes":14272,"hash":"acd5ae2cfd0cd384f72f24bd0738a3c72b58136f07b88fcc1c505ad070a669ff"},{"url":"app.webmanifest","bytes":503,"hash":"55e47259c586289c4e994c8bb66986b63bda02dbc72feabd50d9e2e7de2591be"},{"url":"art/apple-touch-icon.png","bytes":24137,"hash":"122dd8994bd35cd7acb75b8983e7323214ff35a1a4c4d7765bce4cbb221eba04"},{"url":"art/icon-192.png","bytes":26841,"hash":"84ce2c531c7f83db82f7b8ddfddcf5b3131f89f7455140e4756f987c2d30a8ba"},{"url":"art/icon-512.png","bytes":188140,"hash":"463619067b664255d20d5a355c3b699c27d70aa881c116b56851801ad101ae09"},{"url":"art/island.webp","bytes":215622,"hash":"43721668913d7ea6c3d4d997241859cbfbce0580377f6f01f758b2cc516f9dce"},{"url":"index.html","bytes":3167,"hash":"e11f1c25e6f2ec5ce6d6e78b73866f8f16494750c85a8b32d5298fb2fe94bec6"},{"url":"lessons.js","bytes":3169,"hash":"9e0ff941ab9d23795e9122af2a2323e670883403fdea076c56e778cee9940212"},{"url":"offline.js","bytes":3042,"hash":"2f3da17eaa9accd3b938fbfca8c8456b4faec36b0a10ec4158130b352154fc69"},{"url":"pictures/apples.webp","bytes":75878,"hash":"3e3b6d0990945c6e8f3973152dd892adf5baee9ca38f71952fc12377ba21e5ca"},{"url":"pictures/bird.webp","bytes":110388,"hash":"667b1ac7389adee0f8ecbff836d9fa7908c654a9163b07fbd009987ae1e9f033"},{"url":"pictures/book.webp","bytes":114766,"hash":"6efae5128b6c65f166618f7947f37eb576fbbdbfd7130bf63da12df5ef45dfdd"},{"url":"pictures/box.webp","bytes":92816,"hash":"3204576753d4de5b7b919d6c948262231808f536d5474f3d90a381b4f3822b64"},{"url":"pictures/cat.webp","bytes":107250,"hash":"df511eae3b8bc9b7959a8ddfda41ee58880fc2263c62bca312e8d65c32b1ce04"},{"url":"pictures/catch.webp","bytes":67086,"hash":"5c3c6821d782eb0d7ca5399708eb831ddffabdce203bd8473e75f8ea1f187cf7"},{"url":"pictures/dog.webp","bytes":145108,"hash":"ebc875222dd65ea1e7a66f06903905a55b0df9b2af66ce2964f4232a2fd93c74"},{"url":"pictures/eat.webp","bytes":69812,"hash":"18820855b39af55133206fbeb3d790c041a41eef324637df1729099272613d31"},{"url":"pictures/milk.webp","bytes":80080,"hash":"2e16a8530c62178b0877284be72efd93493be964a546d53d3a2d8a8c2b1403a2"},{"url":"pictures/rain.webp","bytes":178272,"hash":"09cd4cc1efec08038d927b8109c8c490478cec4f78b47e03e995a2e98ca4c8f8"},{"url":"pictures/tower.webp","bytes":87262,"hash":"f296e87c685a177b1e3aa0d7814c8d32d84091e3c41ab2b2df77c6aa60015977"},{"url":"pictures/water.webp","bytes":85278,"hash":"b4ced5eaabc68ee4f7511c13d268c48c96f4bf5a13375927238fce2ae0074a4d"},{"url":"styles.css","bytes":14765,"hash":"cd96c7fc808c43d5c1b8b1410b67dcf7c4b3a2236720d54d7a195b8647974a6b"},{"url":"voice/explore-02.mp3","bytes":9308,"hash":"730143b8c1ca75df601407127e8cc51e82c1ece6db282a5defbd09655ffef301"},{"url":"voice/explore-03.mp3","bytes":14636,"hash":"b6fe4bb7f988951589a5d131b2cabc2d32c4ce0b316c1a6366c57d22cb6231cf"},{"url":"voice/explore-10.mp3","bytes":12332,"hash":"192f96df872234cb0ab77d0266d46226bc1664af3f275c8b03637e17a2386ca4"},{"url":"voice/family-05.mp3","bytes":12332,"hash":"4d12141d2b5356f24102ee8208db75bcca91dc3839cec7316fd1828172d4c57e"},{"url":"voice/guide-choose.mp3","bytes":17075,"hash":"cbb5913553bca762e1dd4db47bfd30522a049dc6b94edb7c351258f936641988"},{"url":"voice/guide-listen.mp3","bytes":19673,"hash":"64f92f96abe307815cf1de8c8b714937ff8f38d6a0697d40d38a8685370c18a6"},{"url":"voice/guide-speak.mp3","bytes":22268,"hash":"644abd52740c7137c831c0ddf6f821cfbf79618e2d7a4fae10ae61081711635c"},{"url":"voice/meals-01.mp3","bytes":9740,"hash":"62721cbf3c3382ff69fa29fa27e869efd304c4b4e3b235a449c7077210f655a6"},{"url":"voice/meals-05.mp3","bytes":14636,"hash":"5eeda5693075fb5eb6b83023efeba8cd71cd47d0f594dbb9a50907536b221ddb"},{"url":"voice/meals-10.mp3","bytes":20252,"hash":"7cb31466fa6313a0c329b23754605f2df360b175cf551e69c8180c2fcdcbc356"},{"url":"voice/needs-01.mp3","bytes":9884,"hash":"84d400cbcc89764c05071611707b9fbda2119f4760f9e922b18de6dc848685ff"},{"url":"voice/outside-08.mp3","bytes":11756,"hash":"f2ae4a4618ab7ae2687b61791712ce4684d95dbb3d4e4142007738f9e7212ffb"},{"url":"voice/play-05.mp3","bytes":10172,"hash":"64f9af8fcf841bc0bf8c448818d3a39423db70e729b2e36a0ae7be657d44fc06"},{"url":"voice/play-06.mp3","bytes":12332,"hash":"7c534edb3b970486007c345750b661c5b0e94224b8c899158af4c8903b68c46c"},{"url":"voice/tidy-01.mp3","bytes":14492,"hash":"be6f72b67bc44753fb816883331ddb9f06b34283b3d0b14f69faf6ea265ea646"}];
const SCOPE = self.registration.scope;
const CACHE_PREFIX = `bubble-english-island:${SCOPE}:`;
const CACHE_NAME = `${CACHE_PREFIX}${VERSION}`;
const assetsByUrl = new Map(ASSETS.map(asset => [new URL(asset.url, SCOPE).href, asset]));
const indexUrl = new URL('index.html', SCOPE).href;
let preparation;

async function validAsset(response, asset) {
  if (!response || response.status !== 200) return false;
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== asset.bytes) return false;
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const hex = Array.from(hash, byte => byte.toString(16).padStart(2, '0')).join('');
  return hex === asset.hash;
}

async function fillCache() {
  const signalController = new AbortController();
  const timeout = setTimeout(() => signalController.abort(), 65000);
  try {
    const cache = await caches.open(CACHE_NAME);
    const results = await Promise.allSettled(Array.from(assetsByUrl, async ([url, asset]) => {
      if (await validAsset(await cache.match(url), asset)) return;
      const response = await fetch(url, {
        cache: 'reload',
        credentials: 'same-origin',
        redirect: 'error',
        signal: signalController.signal,
      });
      if (!await validAsset(response.clone(), asset)) throw new Error(`Invalid asset: ${asset.url}`);
      await cache.put(url, response);
    }));
    const failure = results.find(result => result.status === 'rejected');
    if (failure) throw failure.reason;
  } finally {
    clearTimeout(timeout);
  }
}

function prepare() {
  preparation ??= fillCache().finally(() => { preparation = undefined; });
  return preparation;
}

self.addEventListener('install', event => {
  // A failed or partial cache never takes over an existing working version.
  event.waitUntil(prepare());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const obsolete = (await caches.keys()).filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME);
    await Promise.all(obsolete.map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type !== 'prepare-offline' || !event.ports[0]) return;
  const port = event.ports[0];
  event.waitUntil(prepare().then(
    () => port.postMessage({ ready: true, version: VERSION, files: ASSETS.length }),
    () => port.postMessage({ ready: false }),
  ));
});

async function asRange(response, range) {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(range.trim());
  if (!match || (!match[1] && !match[2])) return response;
  const data = await response.arrayBuffer();
  const start = match[1] ? Number(match[1]) : Math.max(data.byteLength - Number(match[2]), 0);
  const end = match[1] && match[2] ? Math.min(Number(match[2]), data.byteLength - 1) : data.byteLength - 1;
  const headers = new Headers({'Accept-Ranges': 'bytes'});
  if (start > end || start >= data.byteLength) {
    headers.set('Content-Range', `bytes */${data.byteLength}`);
    return new Response(null, { status: 416, headers });
  }
  headers.set('Content-Range', `bytes ${start}-${end}/${data.byteLength}`);
  headers.set('Content-Type', response.headers.get('Content-Type') || 'application/octet-stream');
  headers.set('Content-Length', String(end - start + 1));
  return new Response(data.slice(start, end + 1), { status: 206, headers });
}

async function load(request, key) {
  const cache = await caches.open(CACHE_NAME);
  const response = await cache.match(key);
  if (!response) return fetch(request);
  const range = request.headers.get('Range');
  return range ? asRange(response, range) : response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const key = new URL(request.url);
  key.search = '';
  key.hash = '';
  if (request.mode === 'navigate' && (key.href === SCOPE || key.href === indexUrl)) {
    event.respondWith(load(request, indexUrl));
  } else if (assetsByUrl.has(key.href)) {
    event.respondWith(load(request, key.href));
  }
});
