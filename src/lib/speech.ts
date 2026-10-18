let timer = 0;
const keepAlive: { utterance: SpeechSynthesisUtterance | null } = { utterance: null };

function englishVoices(): SpeechSynthesisVoice[] {
  const voices = window.speechSynthesis.getVoices();
  return voices.filter((voice) => /en[-_](US|GB)/i.test(voice.lang) || /^en$/i.test(voice.lang));
}

export function pickVoice(): SpeechSynthesisVoice | undefined {
  if (typeof window === "undefined" || !window.speechSynthesis) return undefined;
  const voices = englishVoices();
  const pleasant = voices.find((voice) =>
    /samantha|google uk english female|karen|moira|serena|fiona|kate|libby|female/i.test(voice.name),
  );
  return (
    pleasant ||
    voices.find((voice) => /en[-_]GB/i.test(voice.lang)) ||
    voices.find((voice) => /en[-_]US/i.test(voice.lang)) ||
    voices[0]
  );
}

export function speak(text: string): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return;
  const synth = window.speechSynthesis;
  window.clearTimeout(timer);
  try {
    synth.cancel();
  } catch {
    /* ignore */
  }
  const utterance = new SpeechSynthesisUtterance(cleaned);
  const voice = pickVoice();
  utterance.lang = voice?.lang || "en-GB";
  if (voice) utterance.voice = voice;
  utterance.rate = 0.92;
  utterance.pitch = 1.04;
  keepAlive.utterance = utterance;
  timer = window.setTimeout(() => {
    try {
      synth.speak(utterance);
    } catch {
      /* ignore */
    }
  }, 60);
}

export function cancelSpeech(): void {
  window.clearTimeout(timer);
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}

export function chime(kind: "yes" | "no" | "star"): void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = kind === "yes" ? [523, 659, 784] : kind === "star" ? [523, 659, 784, 1046] : [392, 330];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = ctx.currentTime + i * 0.09;
      gain.gain.exponentialRampToValueAtTime(0.05, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      osc.start(start);
      osc.stop(start + 0.24);
    });
    window.setTimeout(() => void ctx.close(), 1200);
  } catch {
    /* ignore */
  }
}
