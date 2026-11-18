const retryMessage = '离线下载还没完成，请联网后再试一次。';
const timeoutMs = 195000;
let pending;
let checkedForUpdates = false;

function getWorker(registration) {
  return new Promise((resolve, reject) => {
    let watched;
    const timer = setTimeout(() => finish(reject, new Error(retryMessage)), timeoutMs);

    function finish(callback, value) {
      clearTimeout(timer);
      watched?.removeEventListener('statechange', check);
      registration.removeEventListener('updatefound', check);
      callback(value);
    }

    function check() {
      if (registration.active?.state === 'activated') {
        finish(resolve, registration.active);
        return;
      }
      const worker = registration.active || registration.installing || registration.waiting || watched;
      if (worker?.state === 'redundant') {
        finish(reject, new Error(retryMessage));
        return;
      }
      if (worker && watched !== worker) {
        watched?.removeEventListener('statechange', check);
        watched = worker;
        worker.addEventListener('statechange', check);
      }
    }

    registration.addEventListener('updatefound', check);
    check();
  });
}

function checkCache(worker) {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => finish(reject, new Error(retryMessage)), timeoutMs);

    function finish(callback, value) {
      clearTimeout(timer);
      channel.port1.close();
      callback(value);
    }

    channel.port1.onmessage = ({ data }) => {
      if (data?.ready) finish(resolve, data);
      else finish(reject, new Error(retryMessage));
    };
    try {
      worker.postMessage({ type: 'prepare-offline' }, [channel.port2]);
    } catch {
      finish(reject, new Error(retryMessage));
    }
  });
}

async function prepare() {
  if (!window.isSecureContext || !('serviceWorker' in navigator)) {
    throw new Error('请用 Safari 打开 HTTPS 版，再下载离线内容。');
  }
  try {
    const workerUrl = new URL('./sw.js', import.meta.url);
    const scope = new URL('./', workerUrl).href;
    // getRegistration works on cold offline launches even if the host is unreachable.
    const known = await navigator.serviceWorker.getRegistration(workerUrl.href);
    const alreadyRegistered = known?.scope === scope && known.active?.scriptURL === workerUrl.href;
    const registration = alreadyRegistered ? known : await navigator.serviceWorker.register(workerUrl.href, { scope, updateViaCache: 'none' });
    if (alreadyRegistered && navigator.onLine && !checkedForUpdates) {
      checkedForUpdates = true;
      // Let the new version wait until the active lesson's tabs are closed.
      void registration.update().catch(() => { checkedForUpdates = false; });
    }
    return await checkCache(await getWorker(registration));
  } catch {
    throw new Error(retryMessage);
  }
}

export function prepareOffline() {
  pending ??= prepare().finally(() => { pending = undefined; });
  return pending;
}
