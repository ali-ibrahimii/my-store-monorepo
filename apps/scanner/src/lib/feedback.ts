// ============================================================
// بازخورد حسی: صدا + لرزش
// ============================================================

let audioContext: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioContext) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      audioContext = new Ctor();
    }
    if (audioContext.state === "suspended") void audioContext.resume();
    return audioContext;
  } catch {
    return null;
  }
}

function tone(frequency: number, durationMs: number, volume = 0.15) {
  const ctx = context();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
  osc.start();
  osc.stop(ctx.currentTime + durationMs / 1000);
}

/** صدای موفقیت — بوق کوتاه بلند */
export function beepSuccess(): void {
  tone(1180, 130, 0.18);
}

/** صدای خطا — دو بوق کوتاه بم */
export function beepError(): void {
  tone(320, 160, 0.2);
  setTimeout(() => tone(240, 200, 0.2), 170);
}

export function vibrate(pattern: number | number[] = 40): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // روی iOS پشتیبانی نمی‌شود
  }
}
