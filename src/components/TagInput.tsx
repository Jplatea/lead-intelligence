import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";

interface Props {
  value: string[];
  options: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

// A creatable multi-select: typing filters the shared vocabulary (brands or
// specialties already used elsewhere in the database) and offers to save a
// new value if nothing matches — same portal-positioning approach as
// CustomSelect, since the panel needs to escape this card's own scroll/clip
// context.
export function TagInput({ value, options, onChange, placeholder }: Props) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const measure = () => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  };

  const openMenu = () => {
    measure();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    // Same portal-aware check as CustomSelect: the dropdown is a portal, so
    // its buttons live outside wrapRef in the real DOM and always looked
    // like an "outside" click here without also checking menuRef - closing
    // (and unmounting) the menu on mousedown before the option button's own
    // click had a chance to register, losing the click entirely.
    const close = (e: Event) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open]);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (!value.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...value, trimmed]);
    }
    setText("");
    setOpen(false);
  };

  const removeTag = (tag: string) => onChange(value.filter((v) => v !== tag));

  const q = text.trim().toLowerCase();
  const available = options.filter((o) => !value.some((v) => v.toLowerCase() === o.toLowerCase()));
  const matches = q ? available.filter((o) => o.toLowerCase().includes(q)) : available.slice(0, 8);
  const exactExists = options.some((o) => o.toLowerCase() === q) || value.some((v) => v.toLowerCase() === q);

  return (
    <div ref={wrapRef} className="w-full">
      <div
        onClick={() => {
          inputRef.current?.focus();
          openMenu();
        }}
        className={`flex flex-wrap items-center gap-1.5 min-h-[34px] w-full rounded-lg px-2 py-1.5 cursor-text transition-colors ${
          value.length === 0
            ? "bg-black/[0.015] border border-dashed border-neutral-300 hover:border-neutral-400"
            : "bg-black/[0.03] border border-black/10 hover:border-black/20"
        } focus-within:!border-[#a8dfcf]`}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="gd-chip flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#a8dfcf]/30 text-[#2a9678] shrink-0"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="hover:text-[#b9503a]"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            openMenu();
          }}
          onFocus={openMenu}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(text);
            }
            if (e.key === "Backspace" && !text && value.length) removeTag(value[value.length - 1]);
          }}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[70px] bg-transparent outline-none text-xs text-neutral-700 placeholder:text-neutral-400 py-0.5"
        />
      </div>

      {open &&
        pos &&
        createPortal(
          <div
            style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
            className="z-[200] max-h-52 overflow-y-auto glass rounded-xl p-1 shadow-[0_12px_28px_rgba(33,31,29,0.18)] animate-fade-in-up"
          >
            {matches.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => addTag(m)}
                className="block w-full text-left px-2.5 py-1.5 rounded-lg text-[13px] text-neutral-700 hover:bg-black/[0.04] transition-colors"
              >
                {m}
              </button>
            ))}
            {q && !exactExists && (
              <button
                type="button"
                onClick={() => addTag(text)}
                className="flex items-center gap-1.5 w-full text-left px-2.5 py-1.5 rounded-lg text-[13px] text-[#2a9678] font-medium hover:bg-[#a8dfcf]/15 transition-colors"
              >
                <Plus size={12} /> Añadir "{text}"
              </button>
            )}
            {matches.length === 0 && !q && (
              <p className="px-2.5 py-1.5 text-[11px] text-neutral-400">Escribe para buscar o crear...</p>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
