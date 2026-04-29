let inputVolume = 0;
let outputVolume = 0;
let conversation = null;
let rafId = null;

export function setConversation(conv) {
  conversation = conv;
  if (!rafId) pollVolumes();
}

export function stopPolling() {
  conversation = null;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  inputVolume = 0;
  outputVolume = 0;
}

function pollVolumes() {
  if (!conversation) return;

  try {
    inputVolume = conversation.getInputVolume?.() ?? 0;
    outputVolume = conversation.getOutputVolume?.() ?? 0;
  } catch {
    inputVolume = 0;
    outputVolume = 0;
  }

  rafId = requestAnimationFrame(pollVolumes);
}

export function getInputVolume() {
  return inputVolume;
}

export function getOutputVolume() {
  return outputVolume;
}
