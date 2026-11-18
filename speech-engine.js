const LIBRARY_URL = new URL('./speech-ai/vosk-0.0.8.js', import.meta.url).href;
const MODEL_URL = new URL('./speech-ai/model-en-us-0.15.tar.gz', import.meta.url).href;
const MODEL_BYTES = 41184862;
const SAMPLE_RATE = 16000;
const PREPARE_TIME = 180_000;
const RECOGNITION_TIME = 25_000;
let model;
let preparation;
let activeLibrary;

function abortError() {
  return new DOMException('已取消这次跟读。', 'AbortError');
}

function withSignal(promise, signal) {
  if (!signal) return promise;
  return new Promise((resolve, reject) => {
    function settle(callback, value) {
      signal.removeEventListener('abort', onAbort);
      callback(value);
    }
    const onAbort = () => settle(reject, abortError());
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
    promise.then(value => settle(resolve, value), error => settle(reject, error));
  });
}

function loadLibrary(signal) {
  if (activeLibrary) return Promise.resolve(activeLibrary);
  const script = document.createElement('script');
  script.src = LIBRARY_URL;
  function clear() {
    script.onload = null;
    script.onerror = null;
    script.remove();
  }
  const wait = new Promise((resolve, reject) => {
    script.onload = () => {
      if (window.Vosk?.Model) {
        activeLibrary = window.Vosk;
        resolve(activeLibrary);
      } else reject(new Error('声音工具没有打开。'));
    };
    script.onerror = () => reject(new Error('声音工具还没下载好。'));
    document.head.append(script);
  });
  return withSignal(wait, signal).finally(clear);
}

async function loadArchive(signal) {
  const response = await fetch(MODEL_URL, {
    credentials: 'same-origin', redirect: 'error', signal,
  });
  if (!response.ok) throw new Error('声音包没有下载好。');
  const archive = await response.blob();
  if (archive.size !== MODEL_BYTES) throw new Error('声音包下载不完整。');
  return archive;
}

function createModel(library, archive, signal) {
  const archiveUrl = URL.createObjectURL(archive);
  const NativeWorker = window.Worker;
  let wrapperUrl;
  let candidate;
  function CachedWorker(source, options) {
    // Safari can miss service worker interception from a blob worker. Fetch
    // the archive in the page, but keep Vosk's original URL as the IDB key.
    const wrapper = `
      const archive = ${JSON.stringify(archiveUrl)};
      const original = ${JSON.stringify(MODEL_URL)};
      const fetchInWorker = self.fetch.bind(self);
      self.fetch = (input, options) => {
        const address = typeof input === 'string' ? input : input.url || String(input);
        return fetchInWorker(address === original ? archive : input, options);
      };
      importScripts(${JSON.stringify(String(source))});
    `;
    wrapperUrl = URL.createObjectURL(new Blob([wrapper], { type: 'text/javascript' }));
    return new NativeWorker(wrapperUrl, options);
  }
  try {
    window.Worker = CachedWorker;
    candidate = new library.Model(MODEL_URL, -2);
  } catch (error) {
    URL.revokeObjectURL(archiveUrl);
    if (wrapperUrl) URL.revokeObjectURL(wrapperUrl);
    throw error;
  } finally {
    window.Worker = NativeWorker;
  }

  const loading = new Promise((resolve, reject) => {
    candidate.addEventListener('load', event => {
      if (event.detail?.result) resolve(candidate);
      else reject(new Error('声音包没有打开。'));
    }, { once: true });
    candidate.addEventListener('error', () => reject(new Error('声音包没有打开。')), { once: true });
    candidate.worker.addEventListener('error', () => {
      if (model === candidate) model = undefined;
      candidate.worker.terminate();
      reject(new Error('小耳朵暂时没准备好。'));
    }, { once: true });
  });
  return withSignal(loading, signal).catch(error => {
    candidate.worker.terminate();
    throw error;
  }).finally(() => {
    URL.revokeObjectURL(archiveUrl);
    if (wrapperUrl) URL.revokeObjectURL(wrapperUrl);
  });
}

async function initialize() {
  if (typeof WebAssembly === 'undefined' || typeof Worker === 'undefined') {
    throw new Error('这个浏览器暂时无法启用跟读识别。');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PREPARE_TIME);
  try {
    const [library, archive] = await Promise.all([
      loadLibrary(controller.signal),
      loadArchive(controller.signal),
    ]);
    model = await createModel(library, archive, controller.signal);
    return model;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('声音包准备超时，请稍后再试。');
    throw error;
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

function readyModel(signal) {
  if (signal?.aborted) return Promise.reject(abortError());
  if (model?.ready) return Promise.resolve(model);
  if (!preparation) {
    preparation = initialize().finally(() => { preparation = undefined; });
  }
  return withSignal(preparation, signal);
}

/** Warm the local model. Concurrent callers share a single preparation. */
export async function prepareSpeech({ signal } = {}) {
  await readyModel(signal);
}

/** Transcribe mono 16 kHz PCM. The recognizer has no knowledge of the target sentence. */
export async function recognizeSpeech(samples, { signal } = {}) {
  if (signal?.aborted) throw abortError();
  if (!(samples instanceof Float32Array) || samples.length > SAMPLE_RATE * 20) {
    throw new TypeError('每次可以跟读一句。');
  }
  if (!samples.length) return '';
  const currentModel = await readyModel(signal);
  if (signal?.aborted) throw abortError();
  const recognizer = new currentModel.KaldiRecognizer(SAMPLE_RATE);
  const parts = [];
  const controller = new AbortController();
  function stop() { controller.abort(); }
  const timer = setTimeout(() => {
    if (model === currentModel) model = undefined;
    currentModel.worker.terminate();
    stop();
  }, RECOGNITION_TIME);
  signal?.addEventListener('abort', stop, { once: true });
  currentModel.worker.addEventListener('error', stop, { once: true });
  let next;
  const onResult = ({ detail }) => {
    if (detail.result?.text) parts.push(detail.result.text);
    next?.resolve();
  };
  const onPartial = () => next?.resolve();
  const onError = () => next?.reject(new Error('这次没听清，可以再说一次。'));
  recognizer.addEventListener('result', onResult);
  recognizer.addEventListener('partialresult', onPartial);
  recognizer.addEventListener('error', onError);
  async function send(action) {
    if (controller.signal.aborted) throw abortError();
    const reply = new Promise((resolve, reject) => {
      next = { resolve, reject };
      action();
    });
    try {
      await withSignal(reply, controller.signal);
    } finally {
      next = undefined;
    }
  }
  try {
    for (let offset = 0; offset < samples.length; offset += SAMPLE_RATE) {
      const chunk = samples.subarray(offset, offset + SAMPLE_RATE);
      await send(() => recognizer.acceptWaveformFloat(chunk, SAMPLE_RATE));
    }
    await send(() => recognizer.retrieveFinalResult());
    if (signal?.aborted) throw abortError();
    return parts.join(' ').trim();
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted) throw new Error('小耳朵响应超时，请再试一次。');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', stop);
    currentModel.worker.removeEventListener('error', stop);
    recognizer.remove();
  }
}
