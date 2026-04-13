import { useState, useEffect, useCallback } from "react";
import { useSocket, fmt } from "@/lib/useSocket";
import type { TimerState } from "@/lib/useSocket";

// ─── Web Audio ────────────────────────────────────────────────────────────────
let _ctx: AudioContext | null = null;

function primeAudio() {
  if (!_ctx) _ctx = new AudioContext();
}

function playPreview(preset: string) {
  if (!_ctx || preset === "nenhum") return;
  const ctx = _ctx;
  const t = ctx.currentTime;
  const beep = (freq: number, dur: number, type: OscillatorType = "sine", vol = 0.35, delay = 0) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t + delay);
    g.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
    o.start(t + delay); o.stop(t + delay + dur + 0.05);
  };
  if (preset === "bipe") beep(880, 0.12);
  else if (preset === "sino") { beep(1046, 0.8, "sine", 0.3); beep(1318, 0.6, "sine", 0.15); }
  else if (preset === "digital") { beep(440, 0.05, "square", 0.25); beep(880, 0.05, "square", 0.25, 0.08); }
  else if (preset === "suave") { beep(523, 0.5, "sine", 0.25); beep(659, 0.4, "sine", 0.15, 0.1); }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function statusText(s: TimerState): string {
  const mode = s.mode === "countdown" ? "REGRESSIVO" : "PROGRESSIVO";
  if (s.status === "idle") return `PARADO | ${mode}`;
  if (s.status === "paused") return `PAUSADO | ${mode}`;
  if (s.overtime || s.status === "finished") return `TEMPO ESGOTADO | ${mode}`;
  return `EM EXECUÇÃO | ${mode}`;
}

const SOUNDS = [
  { preset: "bipe",    icon: "📡", label: "BIPE" },
  { preset: "sino",    icon: "🔔", label: "SINO" },
  { preset: "digital", icon: "💻", label: "DIGITAL" },
  { preset: "suave",   icon: "🎵", label: "SUAVE" },
  { preset: "nenhum",  icon: "🔇", label: "NENHUM" },
];

const TRIGGERS = [
  { label: "1m",  seconds: 60,   hint: "[1]" },
  { label: "3m",  seconds: 180,  hint: "[3]" },
  { label: "5m",  seconds: 300,  hint: "[5]" },
  { label: "15m", seconds: 900,  hint: "[F]" },
  { label: "30m", seconds: 1800 },
  { label: "45m", seconds: 2700 },
  { label: "1h",  seconds: 3600 },
  { label: "2h",  seconds: 7200 },
];

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  bg:     "#0f1117",
  bg2:    "#1a1d27",
  bg3:    "#252838",
  border: "#2d3148",
  accent: "#6366f1",
  gold:   "#d97706",
  green:  "#22c55e",
  text:   "#f1f5f9",
  muted:  "#64748b",
};

function card(style: React.CSSProperties = {}): React.CSSProperties {
  return { background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 12, padding: "1.25rem", width: "100%", maxWidth: 520, ...style };
}

function btn(bg: string, extra: React.CSSProperties = {}): React.CSSProperties {
  return { background: bg, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: "0.85rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, padding: "1rem", width: "100%", ...extra };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { state, connected, send } = useSocket();
  const [mins, setMins] = useState(0);
  const [secs, setSecs] = useState(0);

  const doStart = useCallback(() => {
    primeAudio();
    send({ type: "SET_AND_START", seconds: mins * 60 + secs, mode: state.mode });
  }, [mins, secs, state.mode, send]);

  const doPause = useCallback(() => {
    primeAudio();
    send({ type: "PAUSE" });
  }, [send]);

  const doReset = useCallback(() => send({ type: "RESET" }), [send]);

  const doQuick = useCallback((seconds: number) => {
    primeAudio();
    send({ type: "SET_AND_START", seconds, mode: state.mode });
    if (state.mode === "countdown") {
      setMins(Math.floor(seconds / 60));
      setSecs(seconds % 60);
    }
  }, [state.mode, send]);

  const doSetMode = useCallback((mode: "countdown" | "countup") => {
    send({ type: "SET_MODE", mode });
  }, [send]);

  const doSetSound = useCallback((preset: string) => {
    primeAudio();
    send({ type: "SET_SOUND", preset });
    playPreview(preset);
  }, [send]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") { e.preventDefault(); doPause(); }
      if (e.code === "Enter") { e.preventDefault(); doStart(); }
      if (e.code === "KeyR")  { e.preventDefault(); doReset(); }
      if (e.code === "Digit1") doQuick(60);
      if (e.code === "Digit3") doQuick(180);
      if (e.code === "Digit5") doQuick(300);
      if (e.code === "KeyF")   doQuick(900);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [doStart, doPause, doReset, doQuick]);

  const pauseLabel = state.status === "running" ? "PAUSAR" : state.status === "paused" ? "RETOMAR" : "INICIAR";
  const pauseBg    = state.status === "running" ? S.gold  : state.status === "paused" ? S.green  : S.accent;
  const shortcut   = (label: string) => (
    <span style={{ marginLeft: "0.4rem", fontSize: "0.6rem", background: "rgba(255,255,255,0.18)", borderRadius: 4, padding: "0.1rem 0.35rem", verticalAlign: "middle", fontWeight: 600 }}>
      {label}
    </span>
  );

  return (
    <div
      style={{ minHeight: "100vh", background: S.bg, display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "1.5rem 1rem 3rem" }}
      onClick={primeAudio}
    >
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", maxWidth: 520 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: connected ? S.green : "#ef4444", display: "block" }} />
          <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.15em", color: S.muted }}>
            {connected ? "ONLINE" : "OFFLINE"}
          </span>
        </div>
        <a
          href={import.meta.env.BASE_URL}
          style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", color: S.muted, textDecoration: "none", padding: "0.5rem 1rem", border: `1px solid ${S.border}`, borderRadius: 8 }}
        >
          MODO TELA
        </a>
      </div>

      {/* Title */}
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: S.text }}>
          PAINEL DE CONTROLE
        </h1>
        <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.2em", color: S.muted, marginTop: "0.25rem" }}>
          {statusText(state)}
        </p>
        <p className="font-timer" style={{ fontSize: "1.75rem", fontWeight: 900, color: S.text, marginTop: "0.25rem" }}>
          {fmt(state.currentSeconds)}
        </p>
      </div>

      {/* Mode toggle */}
      <div style={card({ padding: "1rem" })}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderRadius: 8, overflow: "hidden", border: `1px solid ${S.border}` }}>
          {(["countdown", "countup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => doSetMode(m)}
              style={{
                padding: "0.85rem",
                fontWeight: 800, fontSize: "0.85rem", letterSpacing: "0.12em", textTransform: "uppercase",
                cursor: "pointer", border: "none",
                background: state.mode === m ? S.text : S.bg3,
                color: state.mode === m ? S.bg : S.muted,
              }}
            >
              {m === "countdown" ? "REGRESSIVO" : "PROGRESSIVO"}
            </button>
          ))}
        </div>
      </div>

      {/* Time input — desktop only */}
      <div style={{ ...card(), display: "none" }} className="sm-show-block">
        <style>{`.sm-show-block { display: block !important; } @media (max-width: 639px) { .sm-show-block { display: none !important; } }`}</style>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "0.5rem" }}>
          {[
            { label: "MIN", value: mins, set: setMins, max: 99 },
            null,
            { label: "SEG", value: secs, set: setSecs, max: 59 },
          ].map((col, i) =>
            col === null ? (
              <span key={i} className="font-timer" style={{ fontSize: "2rem", fontWeight: 900, color: S.muted, textAlign: "center" }}>:</span>
            ) : (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.15em", color: S.muted }}>{col.label}</label>
                <button onClick={() => col.set((v) => Math.min(col.max, v + 1))} style={{ width: "100%", padding: "0.6rem", background: S.bg3, border: `1px solid ${S.border}`, borderRadius: 6, color: S.text, fontSize: "1rem", cursor: "pointer" }}>▲</button>
                <input
                  type="number"
                  value={col.value}
                  onChange={(e) => col.set(Math.max(0, Math.min(col.max, Number(e.target.value))))}
                  className="font-timer"
                  style={{ width: "100%", padding: "0.5rem", textAlign: "center", fontSize: "2.5rem", fontWeight: 900, background: S.bg3, border: `1px solid ${S.border}`, borderRadius: 6, color: S.text }}
                  min={0} max={col.max}
                />
                <button onClick={() => col.set((v) => Math.max(0, v - 1))} style={{ width: "100%", padding: "0.6rem", background: S.bg3, border: `1px solid ${S.border}`, borderRadius: 6, color: S.text, fontSize: "1rem", cursor: "pointer" }}>▼</button>
              </div>
            )
          )}
        </div>
        <button onClick={doStart} style={{ ...btn(S.accent), marginTop: "1rem" }}>
          DEFINIR E INICIAR {shortcut("ENTER")}
        </button>
      </div>

      {/* Pause / Reset */}
      <div style={card()}>
        <button onClick={doPause} style={btn(pauseBg)}>
          {pauseLabel} {shortcut("ESPAÇO")}
        </button>
        <button onClick={doReset} style={{ ...btn(S.bg3, { border: `1px solid ${S.border}`, marginTop: "0.6rem" }) }}>
          RESETAR TIMER {shortcut("R")}
        </button>
      </div>

      {/* Sound — desktop only */}
      <div style={{ ...card(), display: "none" }} className="sm-show-block">
        <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.2em", color: S.muted, textAlign: "center", marginBottom: "1rem" }}>SOM DO TIMER</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.4rem" }}>
          {SOUNDS.map(({ preset, icon, label }) => (
            <button
              key={preset}
              onClick={() => doSetSound(preset)}
              style={{
                padding: "0.65rem 0.25rem", borderRadius: 8,
                display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem",
                cursor: "pointer",
                background: state.soundPreset === preset ? S.accent : S.bg3,
                border: `1px solid ${state.soundPreset === preset ? S.accent : S.border}`,
                color: state.soundPreset === preset ? "#fff" : S.muted,
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>{icon}</span>
              <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.05em" }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick triggers */}
      <div style={card()}>
        <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.2em", color: S.muted, textAlign: "center", marginBottom: "1rem" }}>GATILHOS RÁPIDOS</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
          {TRIGGERS.map(({ label, seconds, hint }) => (
            <button
              key={label}
              onClick={() => doQuick(seconds)}
              style={{
                padding: "0.85rem 0.5rem",
                background: S.bg3, border: `1px solid ${S.border}`, borderRadius: 8,
                color: S.text, cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center",
              }}
            >
              <span className="font-timer" style={{ fontWeight: 700, fontSize: "0.95rem" }}>{label}</span>
              {hint && <span style={{ fontSize: "0.5rem", color: S.muted, letterSpacing: "0.1em", marginTop: "0.1rem" }}>{hint}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
