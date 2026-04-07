import { useState, useEffect } from "react";
import { useTimerSync, formatTime } from "@/lib/useTimerSync";
import { useTimerSounds, SOUND_PRESETS } from "@/lib/useTimerSounds";
import { Link } from "wouter";

const QUICK_PRESETS = [
  { label: "1m", minutes: 1, key: "1" },
  { label: "3m", minutes: 3, key: "3" },
  { label: "5m", minutes: 5, key: "5" },
  { label: "15m", minutes: 15, key: "f" },
];

export default function AdminPage() {
  const { mode, status, currentSeconds, initialSeconds, connected, soundPreset, setMode, start, pause, reset, setQuick, setSound } = useTimerSync();
  const { preview } = useTimerSounds(soundPreset);

  const [inputMinutes, setInputMinutes] = useState(0);
  const [inputSeconds, setInputSeconds] = useState(0);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        pause();
      } else if (e.key === "r" || e.key === "R") {
        reset();
      } else if (e.key === "1") {
        setQuick(1);
      } else if (e.key === "3") {
        setQuick(3);
      } else if (e.key === "5") {
        setQuick(5);
      } else if (e.key === "f" || e.key === "F") {
        setQuick(15);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [pause, reset, setQuick]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    start(inputMinutes, inputSeconds);
  };

  const adjustMinutes = (delta: number) => {
    setInputMinutes((prev) => Math.max(0, Math.min(99, prev + delta)));
  };

  const adjustSeconds = (delta: number) => {
    setInputSeconds((prev) => {
      let next = prev + delta;
      if (next < 0) next = 59;
      if (next > 59) next = 0;
      return next;
    });
  };

  const statusLabel = () => {
    if (status === "running") return "RODANDO";
    if (status === "paused") return "PAUSADO";
    if (status === "finished") return "FINALIZADO";
    return "PARADO";
  };

  const statusColor = () => {
    if (status === "running") return "text-emerald-400";
    if (status === "paused") return "text-yellow-400";
    if (status === "finished") return "text-red-400";
    return "text-slate-400";
  };

  const modeLabel = mode === "countdown" ? "REGRESSIVO" : "PROGRESSIVO";

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 flex flex-col items-center">
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <span className={`text-[10px] font-mono px-2 py-1 rounded ${connected ? "bg-emerald-900/60 text-emerald-400" : "bg-red-900/60 text-red-400"}`}>
          {connected ? "● ONLINE" : "○ CONECTANDO"}
        </span>
        <Link
          href="/"
          className="px-4 py-2 bg-slate-800/90 hover:bg-slate-700 backdrop-blur-md border border-slate-600 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white shadow-xl transition-all uppercase"
        >
          MODO TELA
        </Link>
      </div>

      <div className="max-w-md w-full space-y-5 pt-14">

        {/* Header — desktop/tablet only */}
        <div className="hidden sm:block text-center pb-2 border-b border-white">
          <h1 className="text-xl font-black tracking-tight text-white uppercase">
            Painel de Controle
          </h1>
          <div className="flex justify-center gap-4 mt-2 text-xs font-mono uppercase">
            <span className={statusColor()}>{statusLabel()}</span>
            <span className="text-white">|</span>
            <span className="text-white font-bold">{modeLabel}</span>
          </div>
        </div>

        {/* Mode toggle — desktop/tablet only */}
        <div className="hidden sm:grid grid-cols-2 gap-2 bg-slate-800 p-1 rounded-lg border border-white/20">
          <button
            onClick={() => setMode("countdown")}
            className={`py-3 rounded-md font-bold text-sm transition-all uppercase ${
              mode === "countdown"
                ? "bg-white text-slate-900 shadow"
                : "text-white hover:bg-slate-700"
            }`}
          >
            Regressivo
          </button>
          <button
            onClick={() => setMode("countup")}
            className={`py-3 rounded-md font-bold text-sm transition-all uppercase ${
              mode === "countup"
                ? "bg-white text-slate-900 shadow"
                : "text-white hover:bg-slate-700"
            }`}
          >
            Progressivo
          </button>
        </div>

        {/* Time input form — desktop/tablet only */}
        <form onSubmit={handleSubmit} className="hidden sm:block bg-slate-800 rounded-xl p-4 shadow-lg border border-white/20 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex flex-col items-center">
              <label className="text-xs font-bold text-white mb-1 uppercase">Min</label>
              <div className="flex flex-col w-full gap-1">
                <button
                  type="button"
                  onClick={() => adjustMinutes(1)}
                  className="bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded p-2 text-white active:bg-slate-500"
                >
                  <svg className="w-6 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={inputMinutes}
                  onChange={(e) => setInputMinutes(Math.max(0, Math.min(99, parseInt(e.target.value) || 0)))}
                  className="w-full bg-slate-900 border border-slate-500 rounded py-2 text-center text-3xl font-mono text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white"
                />
                <button
                  type="button"
                  onClick={() => adjustMinutes(-1)}
                  className="bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded p-2 text-white active:bg-slate-500"
                >
                  <svg className="w-6 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="text-2xl font-bold text-white pb-8">:</div>

            <div className="flex-1 flex flex-col items-center">
              <label className="text-xs font-bold text-white mb-1 uppercase">Seg</label>
              <div className="flex flex-col w-full gap-1">
                <button
                  type="button"
                  onClick={() => adjustSeconds(1)}
                  className="bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded p-2 text-white active:bg-slate-500"
                >
                  <svg className="w-6 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={inputSeconds}
                  onChange={(e) => setInputSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="w-full bg-slate-900 border border-slate-500 rounded py-2 text-center text-3xl font-mono text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white"
                />
                <button
                  type="button"
                  onClick={() => adjustSeconds(-1)}
                  className="bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded p-2 text-white active:bg-slate-500"
                >
                  <svg className="w-6 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 border border-white/10 text-white font-black text-xl rounded-lg transition-transform active:scale-95 shadow-lg uppercase relative"
          >
            DEFINIR E INICIAR
            <span className="absolute right-3 top-3 text-[10px] bg-white/20 px-1 rounded font-mono hidden sm:inline">
              [ENTER]
            </span>
          </button>
        </form>

        {/* Pause/Reset buttons — desktop/tablet only */}
        <div className="hidden sm:grid grid-cols-2 gap-4">
          <button
            onClick={pause}
            className={`col-span-2 py-6 border border-white/10 text-white rounded-xl font-black text-2xl shadow-lg transition-transform active:scale-95 uppercase relative ${
              status === "paused"
                ? "bg-emerald-600 hover:bg-emerald-500"
                : "bg-yellow-600 hover:bg-yellow-500"
            }`}
          >
            {status === "paused" ? "RETOMAR" : "PAUSAR"}
            <span className="absolute right-4 top-4 text-xs bg-black/20 px-1.5 py-0.5 rounded font-mono hidden sm:inline">
              [ESPAÇO]
            </span>
          </button>

          <button
            onClick={reset}
            className="col-span-2 py-3 bg-slate-800 hover:bg-red-900 border border-white text-white hover:text-white rounded-lg font-bold transition-colors uppercase tracking-widest text-xs relative"
          >
            Resetar Timer
            <span className="ml-2 bg-white/10 px-1 rounded font-mono hidden sm:inline">[R]</span>
          </button>
        </div>

        {/* Sound selector — desktop/tablet only */}
        <div className="hidden sm:block pt-2 border-t border-white/30">
          <h3 className="text-xs font-bold text-white mb-3 uppercase tracking-wider text-center">
            Som do Timer
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {SOUND_PRESETS.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSound(s.id);
                  preview(s.id);
                }}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border font-bold text-sm transition-all active:scale-95 ${
                  soundPreset === s.id
                    ? "bg-indigo-600 border-white text-white shadow-lg"
                    : "bg-slate-800 border-white/20 text-slate-300 hover:bg-slate-700 hover:border-white/50"
                }`}
              >
                <span className="text-xl">{s.emoji}</span>
                <span className="text-[11px] uppercase tracking-wide">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick triggers — always visible */}
        <div className="pt-2 border-t border-white/30">
          <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-wider text-center">
            Gatilhos Rapidos
          </h3>

          {/* Mobile: vertical stack */}
          <div className="flex flex-col gap-3 sm:hidden">
            {QUICK_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => setQuick(preset.minutes)}
                className="relative w-full py-6 bg-slate-800 hover:bg-indigo-600 active:bg-indigo-700 border border-white/30 text-white rounded-2xl font-timer font-black text-4xl shadow-lg transition-all active:scale-95"
              >
                {preset.label}
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[11px] text-white/40 font-mono">
                  [{preset.key}]
                </span>
              </button>
            ))}
          </div>

          {/* Desktop/tablet: horizontal grid */}
          <div className="hidden sm:grid grid-cols-4 gap-2">
            {QUICK_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => setQuick(preset.minutes)}
                className="relative py-3 bg-slate-800 hover:bg-indigo-600 border border-white text-white rounded-md font-mono font-bold transition-all active:scale-95 group"
              >
                {preset.label}
                <span className="absolute top-0 right-0 p-0.5 text-[8px] opacity-60 font-sans group-hover:opacity-100">
                  [{preset.key}]
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Mobile-only: pause, start form, reset */}
        <div className="flex flex-col gap-3 sm:hidden pt-2 border-t border-white/20">

          {/* Pause/Resume */}
          <button
            onClick={pause}
            className={`w-full py-5 border border-white/10 text-white rounded-2xl font-black text-2xl shadow-lg transition-all active:scale-95 uppercase ${
              status === "paused"
                ? "bg-emerald-600 active:bg-emerald-700"
                : "bg-yellow-600 active:bg-yellow-700"
            }`}
          >
            {status === "paused" ? "RETOMAR" : "PAUSAR"}
          </button>

          {/* Start form */}
          <form onSubmit={handleSubmit} className="bg-slate-800 rounded-2xl p-4 border border-white/20 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex flex-col items-center gap-1">
                <label className="text-[10px] font-bold text-white uppercase tracking-widest">Min</label>
                <div className="flex items-center gap-2 w-full">
                  <button type="button" onClick={() => adjustMinutes(-1)}
                    className="bg-slate-700 active:bg-slate-600 border border-slate-500 rounded-xl p-3 text-white text-lg font-bold">−</button>
                  <span className="flex-1 text-center text-4xl font-timer font-black text-white">{String(inputMinutes).padStart(2, "0")}</span>
                  <button type="button" onClick={() => adjustMinutes(1)}
                    className="bg-slate-700 active:bg-slate-600 border border-slate-500 rounded-xl p-3 text-white text-lg font-bold">+</button>
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">:</div>
              <div className="flex-1 flex flex-col items-center gap-1">
                <label className="text-[10px] font-bold text-white uppercase tracking-widest">Seg</label>
                <div className="flex items-center gap-2 w-full">
                  <button type="button" onClick={() => adjustSeconds(-1)}
                    className="bg-slate-700 active:bg-slate-600 border border-slate-500 rounded-xl p-3 text-white text-lg font-bold">−</button>
                  <span className="flex-1 text-center text-4xl font-timer font-black text-white">{String(inputSeconds).padStart(2, "0")}</span>
                  <button type="button" onClick={() => adjustSeconds(1)}
                    className="bg-slate-700 active:bg-slate-600 border border-slate-500 rounded-xl p-3 text-white text-lg font-bold">+</button>
                </div>
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-4 bg-indigo-600 active:bg-indigo-700 text-white font-black text-lg rounded-xl transition-all active:scale-95 uppercase"
            >
              DEFINIR E INICIAR
            </button>
          </form>

          {/* Reset */}
          <button
            onClick={reset}
            className="w-full py-3 bg-slate-800 active:bg-red-950 border border-white/30 text-white/70 rounded-2xl font-bold uppercase tracking-widest text-sm transition-all active:scale-95"
          >
            Resetar Timer
          </button>
        </div>

        {/* Current time display — desktop/tablet only */}
        {(status === "running" || status === "paused" || status === "finished") && (
          <div className="hidden sm:block text-center pt-2 border-t border-white/20">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Tempo Atual</p>
            <p className="text-4xl font-timer font-black text-white">{formatTime(currentSeconds)}</p>
            {mode === "countdown" && initialSeconds > 0 && (
              <div className="w-full bg-slate-700 rounded-full h-2 mt-3">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${(currentSeconds / initialSeconds) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
