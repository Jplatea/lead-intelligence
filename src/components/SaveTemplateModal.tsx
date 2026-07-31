import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  onSave: (name: string) => void;
  onClose: () => void;
}

// A styled stand-in for window.prompt() — native browser prompts can't be
// restyled at all (font, colors, the "localhost:XXXX dice" header), so
// this is a real in-app modal instead, matching the rest of the app's
// design.
export function SaveTemplateModal({ onSave, onClose }: Props) {
  const [name, setName] = useState("");

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-5">
      <div className="glass rounded-3xl p-5 w-full max-w-sm animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="type-h2 text-neutral-800">Guardar plantilla</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-800 p-1 rounded-lg hover:bg-black/5">
            <X size={16} />
          </button>
        </div>

        <label className="text-xs text-neutral-600 mb-1.5 block">Nombre de la plantilla</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Ej. Newsletter verano"
          className="w-full text-sm px-3 py-2 rounded-lg border border-black/10 bg-white/70 text-neutral-800 placeholder:text-neutral-400 outline-none focus:border-[#a8dfcf] mb-4"
        />

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="text-xs font-medium px-3 py-2 rounded-lg bg-black/[0.04] border border-black/10 text-neutral-600 hover:bg-black/[0.07] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="text-xs font-medium px-4 py-2 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
