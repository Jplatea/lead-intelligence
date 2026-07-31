import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  group?: string;
}

interface Props<T extends string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  triggerClassName?: string;
  triggerStyle?: CSSProperties;
}

// A fully custom dropdown to replace native <select> in dense tables — the
// browser's own option-list popup can't be restyled cross-browser, and it
// read as out-of-place/ugly against the rest of the app's design.
//
// The panel is rendered into a portal on document.body, positioned with
// `position: fixed` from the trigger's own bounding rect. It has to escape
// the table this way — the table's scroll container clips/traps any
// absolutely-positioned descendant, which made the panel invisible or stuck
// behind other rows before this.
export function CustomSelect<T extends string>({ value, options, onChange, triggerClassName, triggerStyle }: Props<T>) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const measure = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 4, left: rect.left });
  };

  const openMenu = () => {
    measure();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    // Re-measure instead of closing on scroll (the table's own scroll
    // container fires these too) — closing on any scroll made the menu
    // disappear the instant it opened whenever the browser auto-scrolled
    // the trigger into view.
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  const groups: { group: string | undefined; items: SelectOption<T>[] }[] = [];
  for (const opt of options) {
    const last = groups[groups.length - 1];
    if (last && last.group === opt.group) last.items.push(opt);
    else groups.push({ group: opt.group, items: [opt] });
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        style={triggerStyle}
        className={
          triggerClassName ??
          "w-full bg-transparent outline-none text-[14px] font-medium text-black rounded-lg px-2 py-1 border border-dashed border-neutral-400 hover:border-neutral-600 cursor-pointer transition-colors"
        }
      >
        <span className="truncate block text-left">{current?.label ?? value}</span>
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: pos.top, left: pos.left }}
            className="z-[200] w-max max-h-60 overflow-y-auto glass rounded-xl p-1 shadow-[0_12px_28px_rgba(33,31,29,0.18)] animate-fade-in-up"
          >
            {groups.map((g, gi) => (
              <div key={gi}>
                {g.group && (
                  <p className="px-2 pt-1.5 pb-0.5 text-[11px] font-medium tracking-wide text-neutral-400">
                    {g.group}
                  </p>
                )}
                {g.items.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`block w-full text-left px-2.5 py-1.5 rounded-lg text-[13px] whitespace-nowrap transition-colors ${
                      opt.value === value
                        ? "bg-[#a8dfcf]/40 text-black font-medium"
                        : "text-neutral-700 hover:bg-black/[0.04]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
