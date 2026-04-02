import { useEffect, useRef } from "react";
import { useTimerStore, formatTime } from "@/lib/timerStore";
import { Link } from "wouter";

export default function DisplayPage() {
  const { mode, status, currentSeconds, initialSeconds, tick, pause } = useTimerStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === "running") {
      intervalRef.current = setInterval(() => {
        tick();
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status, tick]);

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

  const isFinished = status === "finished";
  const isRunning = status === "running";
  const isPaused = status === "paused";

  const progress =
    mode === "countdown" && initialSeconds > 0
      ? (currentSeconds / initialSeconds) * 100
      : 0;

  const timerColor = () => {
    if (isFinished) return "text-red-400";
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
      <div className="fixed top-4 right-4 z-50">
        <Link
          href="/admin"
          className="px-4 py-2 bg-slate-800/90 hover:bg-slate-700 backdrop-blur-md border border-slate-600 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white shadow-xl transition-all uppercase"
        >
          PAINEL
        </Link>
      </div>

      {mode === "countdown" && initialSeconds > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-800">
          <div
            className="h-full bg-indigo-500 transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="text-center px-8 select-none">
        {isFinished ? (
          <div className="animate-pulse">
            <p className="text-2xl font-black tracking-widest text-red-400 uppercase mb-4">
              TEMPO ESGOTADO
            </p>
            <div className="text-[15vw] sm:text-[20vw] font-mono font-black text-red-400 leading-none">
              00:00
            </div>
          </div>
        ) : (
          <>
            <div
              className={`text-[15vw] sm:text-[20vw] font-mono font-black leading-none transition-colors duration-500 ${timerColor()}`}
            >
              {formatTime(currentSeconds)}
            </div>

            {status === "idle" && (
              <p className="text-slate-500 text-lg font-mono uppercase tracking-widest mt-6">
                AGUARDANDO
              </p>
            )}

            {isPaused && (
              <p className="text-yellow-400 text-xl font-mono uppercase tracking-widest mt-6 animate-pulse">
                PAUSADO
              </p>
            )}

            {isRunning && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
                <p className="text-slate-400 text-sm font-mono uppercase tracking-widest">
                  {mode === "countdown" ? "REGRESSIVO" : "PROGRESSIVO"}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
