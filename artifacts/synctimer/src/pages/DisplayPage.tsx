import { useEffect, useRef, useState } from "react";
import { useSocket, fmt } from "@/lib/useSocket";
import type { TimerState } from "@/lib/useSocket";

// ─── Web Audio ────────────────────────────────────────────────────────────────
let _ctx: AudioContext | null = null;

function primeAudio() {
  if (!_ctx) _ctx = new AudioContext();
}

function playSound(preset: string) {
  if (!_ctx || preset === "nenhum") return;
  const ctx = _ctx;
  const t = ctx.currentTime;
  const beep = (
    freq: number,
    dur: number,
    type: OscillatorType = "sine",
    vol = 0.35,
    delay = 0,
  ) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t + delay);
    g.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
    o.start(t + delay);
    o.stop(t + delay + dur + 0.05);
  };
  if (preset === "bipe") {
    beep(880, 0.12);
  } else if (preset === "sino") {
    beep(1046, 0.8, "sine", 0.3);
    beep(1318, 0.6, "sine", 0.15);
  } else if (preset === "digital") {
    beep(440, 0.05, "square", 0.25);
    beep(880, 0.05, "square", 0.25, 0.08);
  } else if (preset === "suave") {
    beep(523, 0.5, "sine", 0.25);
    beep(659, 0.4, "sine", 0.15, 0.1);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function statusLabel(s: TimerState): string {
  if (s.status === "idle") return "AGUARDANDO";
  if (s.status === "paused") return "PAUSADO";
  if (s.overtime || s.status === "finished") return "TEMPO ESGOTADO";
  return "EM EXECUÇÃO";
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DisplayPage() {
  const { state, connected } = useSocket();
  const prevStatus = useRef<string | null>(null);
  const [soundReady, setSoundReady] = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);
  const logoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Play sounds on status transitions
  useEffect(() => {
    const prev = prevStatus.current;
    const curr = state.status;
    if (prev !== null && prev !== curr) {
      if (curr === "running" || curr === "paused" || curr === "finished") {
        playSound(state.soundPreset);
      }
    }
    prevStatus.current = curr;
  }, [state.status, state.soundPreset]);

  // Logo fade logic
  useEffect(() => {
    if (logoTimer.current) clearTimeout(logoTimer.current);
    if (state.status === "running") {
      setLogoVisible(false);
      return;
    }
    if (state.status === "idle") {
      logoTimer.current = setTimeout(() => setLogoVisible(true), 3000);
    } else if (state.status === "finished" || state.overtime) {
      logoTimer.current = setTimeout(() => setLogoVisible(true), 30000);
    } else {
      setLogoVisible(false);
    }
    return () => {
      if (logoTimer.current) clearTimeout(logoTimer.current);
    };
  }, [state.status, state.overtime]);

  const handleClick = () => {
    primeAudio();
    setSoundReady(true);
  };

  const isOvertime = state.overtime || (state.status === "finished" && state.mode === "countdown");
  const digitColor = isOvertime ? "#ef4444" : state.status === "finished" ? "#d97706" : "#f1f5f9";
  const timerHidden = logoVisible && state.status === "idle";

  return (
    <div
      style={{ width: "100vw", height: "100vh", background: "#0f1117", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", cursor: "default", userSelect: "none" }}
      onClick={handleClick}
    >
      {/* Logo overlay */}
      <div
        style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none", zIndex: 10,
          opacity: logoVisible ? 1 : 0,
          transition: "opacity 1s ease",
        }}
      >
        <img
          src={`${import.meta.env.BASE_URL}idle-logo.svg`}
          alt=""
          style={{ height: "20vw", width: "auto", objectFit: "contain" }}
        />
      </div>

      {/* Timer */}
      <div
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem",
          opacity: timerHidden ? 0 : 1,
          transition: "opacity 0.5s ease",
        }}
      >
        <div
          className="font-timer"
          style={{
            fontSize: "clamp(3rem, 20vw, 18rem)",
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: "0.05em",
            color: digitColor,
          }}
        >
          {fmt(state.currentSeconds)}
        </div>
        <div
          style={{
            fontSize: "clamp(0.9rem, 2.5vw, 2rem)",
            fontWeight: 700,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "#64748b",
          }}
        >
          {statusLabel(state)}
        </div>
      </div>

      {/* Connection badge */}
      <div style={{ position: "absolute", top: "1rem", left: "1rem", display: "flex", alignItems: "center", gap: "0.5rem", opacity: 0.4 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: connected ? "#22c55e" : "#ef4444", display: "block" }} />
        <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", color: "#64748b" }}>
          {connected ? "ONLINE" : "OFFLINE"}
        </span>
      </div>

      {/* Sound hint */}
      {!soundReady && (
        <div style={{ position: "absolute", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)", fontSize: "0.75rem", color: "#64748b", letterSpacing: "0.1em", pointerEvents: "none", whiteSpace: "nowrap" }}>
          🔊 toque para ativar o som
        </div>
      )}

      {/* Admin link */}
      <a
        href={`${import.meta.env.BASE_URL}admin`}
        style={{ position: "absolute", top: "1rem", right: "1rem", fontSize: "1.25rem", color: "#64748b", opacity: 0.2, textDecoration: "none", transition: "opacity 0.2s" }}
        title="Painel de controle"
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.2")}
      >
        ⚙
      </a>
    </div>
  );
}
