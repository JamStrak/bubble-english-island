const targetRate = 16_000;
const blockSize = 1024;
const captureSeconds = 6;
const pauseSeconds = 1.05;
const idleMilliseconds = 30_000;
const processorName = 'bubble-speech-input';

// This module also runs inside the audio worklet. Accumulate render quanta before sending
// copies of the input to the page, without sending audio to the speakers.
if (typeof AudioWorkletProcessor === 'function') {
  class SpeechInput extends AudioWorkletProcessor {
    constructor() {
      super();
      this.block = new Float32Array(blockSize);
      this.offset = 0;
    }

    process(inputs) {
      const samples = inputs[0]?.[0];
      for (let start = 0; samples && start < samples.length;) {
        const count = Math.min(blockSize - this.offset, samples.length - start);
        this.block.set(samples.subarray(start, start + count), this.offset);
        this.offset += count;
        start += count;
        if (this.offset === blockSize) {
          this.port.postMessage(this.block, [this.block.buffer]);
          this.block = new Float32Array(blockSize);
          this.offset = 0;
        }
      }
      return true;
    }
  }

  registerProcessor(processorName, SpeechInput);
}

function captureError(code, cause) {
  return Object.assign(new Error(code, { cause }), { code });
}

function inputError(error) {
  if (typeof error?.code === 'string') return error;
  const denied = error?.name === 'NotAllowedError' || error?.name === 'SecurityError';
  return captureError(denied ? 'permission' : 'microphone', error);
}

function stopTracks(stream) {
  stream?.getTracks().forEach(track => track.stop());
}

function pcmAt16k(samples, inputRate) {
  if (inputRate === targetRate) return samples.slice();
  const ratio = inputRate / targetRate;
  const output = new Float32Array(Math.floor(samples.length / ratio));
  for (let i = 0; i < output.length; i++) {
    const start = i * ratio;
    const end = Math.min(start + ratio, samples.length);
    if (ratio < 1) {
      const index = Math.floor(start);
      const next = samples[Math.min(index + 1, samples.length - 1)];
      output[i] = samples[index] + (next - samples[index]) * (start - index);
      continue;
    }
    // Average weighted input intervals before decimating, including fractional ratios.
    let sum = 0;
    for (let j = Math.floor(start); j < end; j++) {
      sum += samples[j] * (Math.min(end, j + 1) - Math.max(start, j));
    }
    output[i] = sum / (end - start);
  }
  return output;
}

export function createSpeechCapture({ onLevel } = {}) {
  let resources;
  let active;

  function cancel() {
    active?.(captureError('aborted'));
  }

  function release() {
    const current = resources;
    if (!current) return;
    resources = undefined;
    clearTimeout(current.idle);
    cancel();
    current.abort.abort();
    stopTracks(current.stream);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', release);
    if (current.context.state !== 'closed') current.context.close().catch(() => {});
  }

  function onVisibility() {
    if (document.hidden) release();
  }

  function refreshIdle(current) {
    clearTimeout(current.idle);
    current.idle = setTimeout(() => {
      if (resources === current) release();
    }, idleMilliseconds);
  }

  async function requestStream(current) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    if (resources !== current) {
      stopTracks(stream);
      throw captureError('aborted');
    }
    current.stream = stream;
    for (const track of stream.getAudioTracks()) {
      track.enabled = false;
      track.addEventListener('ended', () => {
        if (resources !== current) return;
        active?.(captureError('microphone'));
        release();
      }, { once: true });
    }
    if (!stream.getAudioTracks().some(track => track.readyState === 'live')) {
      throw captureError('microphone');
    }
  }

  async function prepare() {
    if (resources) return resources.ready;
    const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Context || !navigator.mediaDevices?.getUserMedia) throw captureError('unavailable');

    let context;
    try {
      context = new Context();
    } catch (error) {
      throw captureError('unavailable', error);
    }
    const current = { context, abort: new AbortController() };
    resources = current;
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', release);

    // Start both browser operations in the same user gesture, before the first await.
    const resume = async () => context.resume();
    const setup = Promise.all([resume(), requestStream(current)]).then(async () => {
      if (resources !== current) throw captureError('aborted');
      if (context.audioWorklet && typeof AudioWorkletNode === 'function') {
        try {
          await context.audioWorklet.addModule(import.meta.url);
          current.worklet = true;
        } catch (error) {
          if (!context.createScriptProcessor) throw captureError('unavailable', error);
        }
      }
      if (!current.worklet && !context.createScriptProcessor) throw captureError('unavailable');
    });
    const cancelled = new Promise((_, reject) => {
      current.abort.signal.addEventListener('abort', () => reject(captureError('aborted')), { once: true });
    });
    current.ready = Promise.race([setup, cancelled]).then(() => {
      if (resources !== current) throw captureError('aborted');
      refreshIdle(current);
    }).catch(error => {
      if (resources === current) release();
      throw inputError(error);
    });
    return current.ready;
  }

  async function listen({ signal } = {}) {
    if (signal?.aborted) throw captureError('aborted');
    const current = resources;
    if (!current) throw captureError('microphone');
    await current.ready;
    if (signal?.aborted || resources !== current) throw captureError('aborted');
    if (active) throw captureError('microphone');

    return new Promise((resolve, reject) => {
      const { context, stream } = current;
      const tracks = stream.getAudioTracks();
      const rate = context.sampleRate;
      const buffer = new Float32Array(rate * captureSeconds);
      let frames = 0;
      let firstVoice = -1;
      let lastVoice = 0;
      let consecutive = 0;
      let quietLevel = 0.001;
      let source;
      let input;
      let mute;
      let timeout;

      function abort() {
        finish(captureError('aborted'));
      }

      function finish(error) {
        if (active !== finish) return;
        active = undefined;
        signal?.removeEventListener('abort', abort);
        clearTimeout(timeout);
        source?.disconnect();
        if (input?.port) {
          input.port.onmessage = null;
          input.port.close();
        } else if (input) {
          input.onaudioprocess = null;
        }
        input?.disconnect();
        mute?.disconnect();
        tracks.forEach(track => { track.enabled = false; });
        if (resources === current) refreshIdle(current);
        if (error) reject(error);
        else if (!frames) reject(captureError('microphone'));
        else if (firstVoice < 0) reject(captureError('no-speech'));
        else {
          const start = Math.max(0, firstVoice - Math.round(rate * 0.24));
          const end = Math.min(frames, lastVoice + Math.round(rate * 0.30));
          resolve(pcmAt16k(buffer.subarray(start, end), rate));
        }
      }

      function receive(samples) {
        if (active !== finish) return;
        const count = Math.min(samples.length, buffer.length - frames);
        buffer.set(samples.subarray(0, count), frames);
        let energy = 0;
        for (let i = 0; i < count; i++) energy += samples[i] ** 2;
        const level = Math.sqrt(energy / count);
        frames += count;
        if (level >= Math.max(0.004, quietLevel * 2.6)) {
          consecutive += count;
          lastVoice = frames;
          if (firstVoice < 0 && consecutive >= rate * 0.08) firstVoice = frames - consecutive;
        } else {
          consecutive = 0;
          if (firstVoice < 0) quietLevel = quietLevel * 0.95 + level * 0.05;
        }
        if (frames >= buffer.length || (firstVoice >= 0 && frames - lastVoice >= rate * pauseSeconds)) {
          finish();
        } else {
          onLevel?.(level);
        }
      }

      active = finish;
      clearTimeout(current.idle);
      signal?.addEventListener('abort', abort, { once: true });
      timeout = setTimeout(finish, captureSeconds * 1000);
      try {
        tracks.forEach(track => { track.enabled = true; });
        source = context.createMediaStreamSource(stream);
        if (current.worklet) {
          input = new AudioWorkletNode(context, processorName, { channelCount: 1 });
          input.port.onmessage = event => receive(event.data);
        } else {
          input = context.createScriptProcessor(blockSize, 1, 1);
          input.onaudioprocess = event => receive(event.inputBuffer.getChannelData(0));
        }
        mute = context.createGain();
        mute.gain.value = 0;
        source.connect(input).connect(mute).connect(context.destination);
        if (context.state !== 'running') context.resume().catch(error => finish(inputError(error)));
      } catch (error) {
        finish(inputError(error));
      }
    });
  }

  return {
    prepare, listen, cancel, release,
    get prepared() { return resources?.stream?.getAudioTracks().some(track => track.readyState === 'live') || false; },
  };
}
