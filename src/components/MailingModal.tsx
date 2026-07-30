import { useEffect, useState } from "react";
import { Mail, Plus, Trash2, X } from "lucide-react";

interface Props {
  onClose: () => void;
}

const STORAGE_KEY = "lead-intelligence:mailing-list";

function loadEmails(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function MailingModal({ onClose }: Props) {
  const [emails, setEmails] = useState<string[]>(loadEmails);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(emails));
  }, [emails]);

  const addEmail = () => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return;
    if (!EMAIL_RE.test(trimmed)) {
      setError("Email no válido");
      return;
    }
    if (emails.includes(trimmed)) {
      setError("Ese email ya está en la lista");
      return;
    }
    setEmails((prev) => [...prev, trimmed]);
    setValue("");
    setError(null);
  };

  const removeEmail = (email: string) => setEmails((prev) => prev.filter((e) => e !== email));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-5">
      <div className="glass rounded-3xl p-5 w-full max-w-sm animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-neutral-800">Mailing</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-800 p-1 rounded-lg hover:bg-black/5">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && addEmail()}
            placeholder="nombre@empresa.com"
            className="flex-1 bg-black/[0.03] border border-black/10 rounded-lg px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 outline-none focus:border-[#a8dfcf]"
          />
          <button
            onClick={addEmail}
            className="shrink-0 flex items-center gap-1 text-xs px-3 py-2 rounded-lg bg-[#a79bcb]/25 border border-[#a79bcb] text-[#6a56a0] hover:bg-[#a79bcb]/40"
          >
            <Plus size={13} /> Añadir
          </button>
        </div>
        {error && <p className="text-xs text-[#b9503a] mt-1.5">{error}</p>}

        <div className="mt-4 max-h-64 overflow-y-auto space-y-1.5">
          {emails.length === 0 && <p className="text-xs text-neutral-400">Todavía no has añadido ningún email.</p>}
          {emails.map((email) => (
            <div
              key={email}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/[0.02] border border-black/6"
            >
              <Mail size={13} className="text-[#6a56a0] shrink-0" />
              <span className="text-xs text-neutral-700 truncate flex-1">{email}</span>
              <button onClick={() => removeEmail(email)} className="text-neutral-400 hover:text-[#b9503a] shrink-0 p-0.5">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>

        <p className="text-xs text-neutral-400 mt-4">{emails.length} email{emails.length === 1 ? "" : "s"} en la lista de mailing.</p>
      </div>
    </div>
  );
}
