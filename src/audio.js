let conversation = null;
let rafId = null;

let rawInputVol = 0;
let rawOutputVol = 0;
let boostedInputVol = 0;
let boostedOutputVol = 0;

let inputFreqData = new Uint8Array(64);
let outputFreqData = new Uint8Array(64);

export function setConversation(conv) {
  conversation = conv;
  if (!rafId) pollAudioData();
}

export function stopPolling() {
  conversation = null;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  rawInputVol = 0;
  rawOutputVol = 0;
  boostedInputVol = 0;
  boostedOutputVol = 0;
}

function pollAudioData() {
  if (!conversation) return;

  try {
    rawInputVol = conversation.getInputVolume?.() ?? 0;
    rawOutputVol = conversation.getOutputVolume?.() ?? 0;

    // Amplified gain curve so subtle voice notes create dynamic visual feedback
    boostedInputVol = Math.min(1.0, Math.pow(rawInputVol * 3.5, 0.75));
    boostedOutputVol = Math.min(1.0, Math.pow(rawOutputVol * 3.5, 0.75));

    const inFreq = conversation.getInputByteFrequencyData?.();
    if (inFreq && inFreq.length > 0) {
      inputFreqData = inFreq;
    }

    const outFreq = conversation.getOutputByteFrequencyData?.();
    if (outFreq && outFreq.length > 0) {
      outputFreqData = outFreq;
    }
  } catch (err) {
    rawInputVol = 0;
    rawOutputVol = 0;
    boostedInputVol = 0;
    boostedOutputVol = 0;
  }

  rafId = requestAnimationFrame(pollAudioData);
}

export function getInputVolume() {
  return boostedInputVol;
}

export function getOutputVolume() {
  return boostedOutputVol;
}

export function getAudioMetrics(state) {
  let vol = 0;
  let freqArray = null;

  if (state === 'speaking') {
    vol = boostedOutputVol;
    freqArray = outputFreqData;
  } else if (state === 'listening') {
    vol = boostedInputVol;
    freqArray = inputFreqData;
  }

  let bass = 0;
  let mid = 0;
  let treble = 0;

  if (freqArray && freqArray.length > 0) {
    let bassSum = 0, midSum = 0, trebleSum = 0;

    // Speech-calibrated frequency bands (human voice energy is in bins 0..24):
    // Bass (Vocal Body / Fundamental Pitch): bins 0..3
    for (let i = 0; i < 4; i++) bassSum += freqArray[i] || 0;

    // Mid (Vowels & Formants): bins 4..11
    for (let i = 4; i < 12; i++) midSum += freqArray[i] || 0;

    // Treble (Consonants, Fricatives & Speech Clarity): bins 12..24
    for (let i = 12; i < 25; i++) trebleSum += freqArray[i] || 0;

    bass = (bassSum / 4) / 255;
    mid = (midSum / 8) / 255;
    // Boost treble response slightly as speech consonants have lower amplitude than vowels
    treble = Math.min(1.0, ((trebleSum / 13) / 255) * 1.85);
  } else {
    bass = vol * 0.9;
    mid = vol * 1.1;
    treble = vol * 0.8;
  }

  return {
    volume: vol,
    bass,
    mid,
    treble,
    freqArray
  };
}
