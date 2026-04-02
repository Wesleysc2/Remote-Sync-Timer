import { useCallback, useRef } from "react";

export const SOUND_PRESETS = [
  { id: "bipe",    label: "Bipe",    emoji: "📡" },
  { id: "sino",    label: "Sino",    emoji: "🔔" },
  { id: "digital", label: "Digital", emoji: "💻" },
  { id: "suave",   label: "Suave",   emoji: "🎵" },
  { id: "nenhum",  label: "Nenhum",  emoji: "🔇" },
] as const;

function getAudioContext(): AudioContext | null {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    return null;
  }
}

function tone(
  ctx: AudioContext,
  freq: number,
  start: number,
  duration: number,
  peak: number,
  type: OscillatorType = "sine"
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

type SoundFn = (ctx: AudioContext) => void;

const SOUNDS: Record<string, { start: SoundFn; pause: SoundFn }> = {
  bipe: {
    start: (ctx) => {
      const t = ctx.currentTime;
      tone(ctx, 880,  t,        0.12, 0.25, "sine");
      tone(ctx, 1320, t + 0.13, 0.18, 0.20, "sine");
    },
    pause: (ctx) => {
      const t = ctx.currentTime;
      tone(ctx, 660, t,        0.08, 0.18, "sine");
      tone(ctx, 440, t + 0.09, 0.22, 0.14, "sine");
    },
  },

  sino: {
    start: (ctx) => {
      const t = ctx.currentTime;
      tone(ctx, 1046, t, 0.8, 0.30, "sine");
      tone(ctx, 2093, t, 0.6, 0.10, "sine");
      tone(ctx, 3139, t, 0.4, 0.05, "sine");
    },
    pause: (ctx) => {
      const t = ctx.currentTime;
      tone(ctx, 523, t, 0.7, 0.22, "sine");
      tone(ctx, 784, t, 0.5, 0.08, "sine");
    },
  },

  digital: {
    start: (ctx) => {
      const t = ctx.currentTime;
      tone(ctx, 1200, t,        0.06, 0.20, "square");
      tone(ctx, 1600, t + 0.08, 0.06, 0.18, "square");
      tone(ctx, 2000, t + 0.16, 0.08, 0.15, "square");
    },
    pause: (ctx) => {
      const t = ctx.currentTime;
      tone(ctx, 1000, t,        0.06, 0.18, "square");
      tone(ctx, 700,  t + 0.08, 0.08, 0.15, "square");
    },
  },

  suave: {
    start: (ctx) => {
      const t = ctx.currentTime;
      tone(ctx, 528, t,        0.35, 0.15, "triangle");
      tone(ctx, 660, t + 0.20, 0.35, 0.12, "triangle");
    },
    pause: (ctx) => {
      const t = ctx.currentTime;
      tone(ctx, 440, t, 0.40, 0.12, "triangle");
    },
  },

  nenhum: {
    start: () => {},
    pause: () => {},
  },
};

export function useTimerSounds(soundPreset: string = "bipe") {
  const ctxRef = useRef<AudioContext | null>(null);

  const ensureCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = getAudioContext();
    }
    if (ctxRef.current?.state === "suspended") {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const primeAudio = useCallback(() => {
    ensureCtx();
  }, [ensureCtx]);

  const preset = SOUNDS[soundPreset] ?? SOUNDS["bipe"];

  const playStart = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx) return;
    preset.start(ctx);
  }, [ensureCtx, preset]);

  const playPause = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx) return;
    preset.pause(ctx);
  }, [ensureCtx, preset]);

  const preview = useCallback((id: string) => {
    const ctx = ensureCtx();
    if (!ctx) return;
    const p = SOUNDS[id] ?? SOUNDS["bipe"];
    p.start(ctx);
  }, [ensureCtx]);

  return { playStart, playPause, primeAudio, preview };
}
