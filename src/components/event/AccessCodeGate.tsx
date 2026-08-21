import { useState } from "react";
import { Lock, ArrowRight } from "lucide-react";

interface AccessCodeGateProps {
  onSubmit: (code: string) => void;
  accentColor?: string | undefined;
  error?: string | undefined;
}

export function AccessCodeGate({ onSubmit, accentColor, error }: AccessCodeGateProps) {

  const [code, setCode] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length >= 3) onSubmit(code.trim().toUpperCase());
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background p-6 animate-fade-in">
      <div className="w-full max-w-sm text-center">
        <div
          className="mx-auto mb-6 grid size-16 place-items-center rounded-full"
          style={{ backgroundColor: `${accentColor}18` }}
        >
          <Lock className="size-7" style={{ color: accentColor }} />
        </div>

        <h1 className="font-display text-3xl text-foreground">Galeria privada</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Este evento requer um código de acesso.
          <br />
          Verifique o convite ou pergunte ao organizador.
        </p>

        <form onSubmit={handleSubmit} className="mt-8">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Ex: KELVIN30"
            className="w-full rounded-sm border border-input bg-background px-4 py-4 text-center text-lg font-mono tracking-[0.3em] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring uppercase"
            maxLength={12}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={code.trim().length < 3}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-sm px-6 py-3.5 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-40"
            style={{
              backgroundColor: accentColor ?? "var(--color-foreground)",
              color: "var(--color-background)",
            }}
          >
            Entrar <ArrowRight className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
