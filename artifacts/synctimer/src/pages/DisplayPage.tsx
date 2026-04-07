import { useEffect, useRef, useState } from "react";
import { useTimerSync, formatTime } from "@/lib/useTimerSync";
import { useTimerSounds } from "@/lib/useTimerSounds";
import { Link } from "wouter";

const IDLE_LOGO_DELAY = 3000;

export default function DisplayPage() {
  const { mode, status, currentSeconds, initialSeconds, overtime, connected, pause, soundPreset } = useTimerSync();
  const { playStart, playPause, primeAudio } = useTimerSounds(soundPreset);
  const prevStatusRef = useRef<string | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [showLogo, setShowLogo] = useState(false);
  const logoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const activate = () => {
      primeAudio();
      setAudioReady(true);
    };
    window.addEventListener("click", activate, { once: true });
    window.addEventListener("keydown", activate, { once: true });
    window.addEventListener("touchstart", activate, { once: true });
    return () => {
      window.removeEventListener("click", activate);
      window.removeEventListener("keydown", activate);
      window.removeEventListener("touchstart", activate);
    };
  }, [primeAudio]);

  useEffect(() => {
    const prev = prevStatusRef.current;
    if (prev !== null && prev !== status) {
      if (status === "running") playStart();
      else if (status === "paused") playPause();
    }
    prevStatusRef.current = status;
  }, [status, playStart, playPause]);

  // Show logo after 3s idle OR after 30s of finished/overtime
  useEffect(() => {
    if (logoTimerRef.current) clearTimeout(logoTimerRef.current);

    if (status === "idle") {
      logoTimerRef.current = setTimeout(() => setShowLogo(true), 3_000);
    } else if (status === "finished" || overtime) {
      logoTimerRef.current = setTimeout(() => setShowLogo(true), 30_000);
    } else {
      setShowLogo(false);
    }

    return () => {
      if (logoTimerRef.current) clearTimeout(logoTimerRef.current);
    };
  }, [status, overtime]);

  const isFinished = status === "finished";
  const isRunning = status === "running";
  const isPaused = status === "paused";
  const showAlert = overtime || isFinished;

  const progress =
    mode === "countdown" && initialSeconds > 0
      ? (currentSeconds / initialSeconds) * 100
      : 0;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        pause();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [pause]);

  useEffect(() => {
    if (status === "idle") {
      document.title = "SyncTimer";
      return;
    }
    const timeStr = formatTime(currentSeconds);
    if (isFinished) {
      document.title = `⏰ 00:00 — TEMPO ESGOTADO`;
    } else if (overtime) {
      document.title = `🔴 +${timeStr} — OVERTIME`;
    } else if (isPaused) {
      document.title = `⏸ ${timeStr} — PAUSADO`;
    } else {
      document.title = timeStr;
    }
    return () => {
      document.title = "SyncTimer";
    };
  }, [status, currentSeconds, isFinished, overtime, isPaused]);

  const timerColor = () => {
    if (showAlert) return "text-red-400";
    if (isPaused) return "text-yellow-300";
    if (mode === "countdown" && initialSeconds > 0) {
      const pct = currentSeconds / initialSeconds;
      if (pct <= 0.1) return "text-red-400";
      if (pct <= 0.25) return "text-orange-400";
    }
    return "text-white";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center relative overflow-hidden">

      {showAlert && (
        <div
          className="pointer-events-none fixed inset-0 z-10"
          style={{ animation: "redFlash 1.2s ease-in-out infinite" }}
        />
      )}

      <style>{`
        @keyframes redFlash {
          0%   { background-color: rgba(220, 38, 38, 0); }
          50%  { background-color: rgba(220, 38, 38, 0.22); }
          100% { background-color: rgba(220, 38, 38, 0); }
        }
      `}</style>

      {!audioReady && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 bg-white/10 backdrop-blur border border-white/20 rounded-full text-[11px] text-white/50 font-mono animate-pulse pointer-events-none">
          🔊 clique para ativar o som
        </div>
      )}

      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <span className={`text-[10px] font-mono px-2 py-1 rounded ${connected ? "bg-emerald-900/60 text-emerald-400" : "bg-red-900/60 text-red-400"}`}>
          {connected ? "● ONLINE" : "○ CONECTANDO"}
        </span>
        <Link
          href="/admin"
          className="px-4 py-2 bg-slate-800/90 hover:bg-slate-700 backdrop-blur-md border border-slate-600 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white shadow-xl transition-all uppercase"
        >
          PAINEL
        </Link>
      </div>

      {mode === "countdown" && initialSeconds > 0 && !showAlert && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-800">
          <div
            className="h-full bg-indigo-500 transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Logo overlay — fades in after 3s idle */}
      <div
        className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none transition-opacity duration-1000"
        style={{ opacity: showLogo ? 1 : 0 }}
      >
        <img
          src={`${import.meta.env.BASE_URL}idle-logo.svg`}
          alt="Logo"
          className="h-[15vw] sm:h-[20vw] w-auto object-contain"
        />
      </div>

      {/* Timer content — fades out when logo shows */}
      <div
        className="relative z-20 text-center px-8 select-none transition-opacity duration-1000"
        style={{ opacity: showLogo ? 0 : 1 }}
      >
        {showAlert && (
          <p
            className="text-xl font-black tracking-widest text-red-400 uppercase mb-4"
            style={{ animation: "redFlash 1.2s ease-in-out infinite" }}
          >
            {isFinished ? "TEMPO ESGOTADO" : "TEMPO ESGOTADO — OVERTIME"}
          </p>
        )}

        <div
          className={`text-[15vw] sm:text-[20vw] font-timer font-black leading-none transition-colors duration-500 ${timerColor()}`}
        >
          {formatTime(currentSeconds)}
        </div>

        {status === "idle" && (
          <p className="text-slate-500 text-lg font-mono uppercase tracking-widest mt-6">
            AGUARDANDO
          </p>
        )}

        {isPaused && !showAlert && (
          <p className="text-yellow-400 text-xl font-mono uppercase tracking-widest mt-6 animate-pulse">
            PAUSADO
          </p>
        )}

        {isRunning && !showAlert && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
            <p className="text-slate-400 text-sm font-mono uppercase tracking-widest">
              {mode === "countdown" ? "REGRESSIVO" : "PROGRESSIVO"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
