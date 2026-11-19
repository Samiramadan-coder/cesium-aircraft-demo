import type { AlertSeverity } from "@/types/alerts";

/**
 * Short tones for new notifications, made with the Web Audio API (no sound
 * files). Browsers only allow sound after the user has interacted with the
 * page (a click or key press); until then, playing does nothing.
 */

type Tone = { frequency: number; start: number; duration: number };

// Seconds from the start of the sound. Critical is the most insistent.
const TONES: Record<AlertSeverity, Tone[]> = {
  critical: [
    { frequency: 880, start: 0, duration: 0.14 },
    { frequency: 660, start: 0.18, duration: 0.14 },
    { frequency: 880, start: 0.36, duration: 0.14 },
    { frequency: 660, start: 0.54, duration: 0.2 },
  ],
  warning: [
    { frequency: 740, start: 0, duration: 0.12 },
    { frequency: 740, start: 0.18, duration: 0.16 },
  ],
  info: [{ frequency: 620, start: 0, duration: 0.22 }],
};

const VOLUME = 0.18;

let context: AudioContext | null = null;

function audioContext() {
  if (typeof window === "undefined" || !("AudioContext" in window)) {
    return null;
  }
  context ??= new AudioContext();
  return context;
}

/**
 * Lets later notifications play sound: browsers keep audio suspended until
 * a user gesture (and some suspend it again when idle), so it is resumed on
 * clicks and key presses. Returns the cleanup.
 */
export function unlockNotificationSound() {
  const unlock = () => {
    const audio = audioContext();
    if (audio && audio.state !== "running") void audio.resume();
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
  return () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
}

export function playNotificationSound(severity: AlertSeverity) {
  const audio = audioContext();
  if (!audio || audio.state !== "running") return;
  const now = audio.currentTime;
  for (const { frequency, start, duration } of TONES[severity] ?? TONES.info) {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    // Quick fade in and out, so the tones don't click.
    gain.gain.setValueAtTime(0, now + start);
    gain.gain.linearRampToValueAtTime(VOLUME, now + start + 0.02);
    gain.gain.linearRampToValueAtTime(0, now + start + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(now + start);
    oscillator.stop(now + start + duration + 0.02);
  }
}
