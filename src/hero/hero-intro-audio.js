const assets = import.meta.glob('../../images/intro/*.mp3', {
  eager: true, query: '?url', import: 'default',
});

function synthesizeDrop(context) {
  const rate = context.sampleRate;
  const buffer = context.createBuffer(1, Math.ceil(rate * .7), rate);
  const samples = buffer.getChannelData(0);
  const ring = (time, frequency) => {
    const phase = frequency * time + 190 * (1 - Math.exp(-time * 25)) / 25;
    return Math.sin(2 * Math.PI * phase) * Math.min(1, time * 450) * Math.exp(-time * 18);
  };
  for (let index = 0; index < samples.length; index++) {
    const time = index / rate;
    samples[index] = .65 * ring(time, 78)
      + (time > .08 ? .19 * ring(time - .08, 112) : 0)
      + (time > .16 ? .07 * ring(time - .16, 88) : 0);
  }
  return buffer;
}

export function createIntroAudio() {
  const cues = ['opening-whoosh', 'deep-water-drop', 'gold-shimmer', 'transition-sweep'];
  const controller = new AbortController();
  const encoded = new Map();
  const buffers = new Map();
  const playing = new Set();
  const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  let context;
  let autoplayAllowed;
  let attempted = false;

  for (const cue of cues) {
    const url = assets[`../../images/intro/${cue}.mp3`];
    if (!url) continue;
    encoded.set(cue, fetch(url, { signal: controller.signal })
      .then(response => response.ok ? response.arrayBuffer() : null)
      .catch(() => null));
  }

  function decode(decoder) {
    for (const [cue, download] of encoded) {
      download.then(bytes => bytes && !controller.signal.aborted ? decoder.decodeAudioData(bytes) : null)
        .then(buffer => { if (buffer && !controller.signal.aborted) buffers.set(cue, buffer); })
        .catch(() => {});
    }
  }

  let decoding = false;
  if (OfflineContext && encoded.size) {
    try {
      decode(new OfflineContext(1, 1, 44100));
      decoding = true;
    } catch { /* Decode with the playback context when enabled. */ }
  }

  function stop() {
    for (const source of playing) source.stop();
    playing.clear();
  }

  function tryAutoplay() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext || attempted || controller.signal.aborted) return;
    attempted = true;
    try {
      context = new AudioContext();
      if (!decoding) decode(context);
      context.resume().catch(() => { autoplayAllowed = false; });
    } catch { autoplayAllowed = false; }
  }

  function play(cue, volume, limit) {
    // Decide at the first cue so a later interaction cannot start mid-intro audio.
    autoplayAllowed ??= context?.state === 'running';
    if (!autoplayAllowed || context?.state !== 'running') return;
    const buffer = buffers.get(cue) ?? (cue === 'deep-water-drop' ? synthesizeDrop(context) : null);
    if (!buffer) return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.connect(gain).connect(context.destination);
    source.onended = () => {
      playing.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    const now = context.currentTime;
    const duration = Math.min(buffer.duration, limit ?? buffer.duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.setValueAtTime(volume, now + duration * .72);
    gain.gain.linearRampToValueAtTime(0, now + duration);
    try {
      source.start(now, 0, duration);
      playing.add(source);
    } catch {
      source.disconnect();
      gain.disconnect();
    }
  }

  return {
    play, stop, tryAutoplay,
    dispose() {
      controller.abort();
      stop();
      context?.close().catch(() => {});
      buffers.clear();
      encoded.clear();
    },
  };
}
