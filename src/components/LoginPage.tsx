import { useState } from "react";
import { ChevronLeft, ChevronRight, Lock, ShieldCheck } from "lucide-react";
import type { RepId } from "../types";
import { authenticate, REP_CREDENTIALS } from "../lib/auth";
import { NeuralCell } from "./NeuralCell";

interface Props {
  onLogin: (repId: RepId) => void;
}

export function LoginPage({ onLogin }: Props) {
  const [codeIndex, setCodeIndex] = useState(0);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const current = REP_CREDENTIALS[codeIndex];

  const cycle = (dir: 1 | -1) => {
    setError(null);
    setCodeIndex((i) => (i + dir + REP_CREDENTIALS.length) % REP_CREDENTIALS.length);
  };

  const submit = () => {
    const repId = authenticate(current.repId, password);
    if (!repId) {
      setError("Código o contraseña incorrectos.");
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    onLogin(repId);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden" style={{ background: "#0b1220" }}>
      <div className="login-cloud login-cloud-a" style={{ width: 640, height: 640, top: "-10%", left: "-10%" }} />
      <div className="login-cloud login-cloud-b" style={{ width: 560, height: 560, bottom: "-15%", right: "-10%" }} />
      <div className="login-cloud login-cloud-c" style={{ width: 420, height: 420, top: "35%", left: "55%" }} />

      <div
        className={`relative z-10 w-full max-w-sm mx-5 rounded-3xl p-6 backdrop-blur-xl ${shake ? "shake-x" : ""}`}
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 30px 60px -20px rgba(0,0,0,0.6)",
        }}
      >
        <div className="flex items-center gap-2 mb-6">
          <NeuralCell size={34} animated />
          <span className="text-sm font-semibold tracking-wide text-white">ILEADS</span>
        </div>

        <h1 className="text-xl font-semibold text-white mb-1">Bienvenido</h1>
        <p className="text-xs text-white/50 mb-6">Selecciona tu usuario e introduce tu contraseña.</p>

        <label className="text-[11px] tracking-wide text-white/50 mb-2 block">Usuario</label>
        <div className="flex items-center justify-center gap-4 mb-2">
          <button
            onClick={() => cycle(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10"
          >
            <ChevronLeft size={16} />
          </button>
          <div
            className="flex-1 text-center py-3 rounded-xl text-xl font-semibold tracking-wide text-white"
            style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            {current.label}
          </div>
          <button
            onClick={() => cycle(1)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center justify-center gap-1.5 mb-5">
          {REP_CREDENTIALS.map((_, i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full transition-colors"
              style={{ background: i === codeIndex ? "#a8dfcf" : "rgba(255,255,255,0.2)" }}
            />
          ))}
        </div>

        <label className="text-[11px] tracking-wide text-white/50 mb-2 block">Contraseña</label>
        <div className="relative mb-4">
          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Contraseña"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white placeholder:text-white/30 outline-none"
            style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.1)" }}
          />
        </div>

        {error && <p className="text-xs text-[#eda18f] mb-3">{error}</p>}

        <button
          onClick={submit}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-black/80 bg-[#a8dfcf] hover:bg-[#93d3bd] transition-colors"
        >
          Entrar
        </button>

        <div className="flex items-center justify-center gap-1.5 mt-6 text-[10px] text-white/30">
          <ShieldCheck size={11} />
          Acceso restringido — uso interno Ileads
        </div>
      </div>
    </div>
  );
}
