import { IdCard, MessageSquare } from "lucide-react";

// Width of the bubble body below (w-56 = 14rem = 224px) — used to center it
// under the cursor via an explicit pixel offset instead of a Tailwind
// translate utility, so the scale-in animation's transform-origin (also in
// px, pinned to the cursor point) doesn't have to fight a second `transform`
// coming from a translate class on the same element.
const BUBBLE_W = 224;

// The speech-bubble ("bocadillo") that pops up when a Clientes row is
// clicked, offering a choice before committing to a specific action —
// viewing the full client card, or jumping straight into recent email
// history with that contact. Rendered at App's top level (a sibling of the
// page containers, not nested inside DatabasePage's own animated page
// wrapper) — nesting it inside an ancestor that carries a `filter`/`scale`
// style (even at rest) would hijack this `fixed` element's positioning to
// be relative to that ancestor instead of the real viewport.
export function RowActionBubble({
  x,
  y,
  onViewCard,
  onCommunicate,
  onClose,
}: {
  x: number;
  y: number;
  onViewCard: () => void;
  onCommunicate: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 animate-zoom-in-pop"
        style={{ left: x - BUBBLE_W / 2, top: y + 10, transformOrigin: `${BUBBLE_W / 2}px -10px` }}
      >
        <div className="relative">
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-t border-l border-black/10 rotate-45" />
          <div
            className="relative flex flex-col gap-0.5 rounded-2xl bg-white border border-black/10 shadow-xl p-1.5"
            style={{ width: BUBBLE_W }}
          >
            <button
              onClick={onViewCard}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 hover:bg-black/[0.04] transition-colors text-left"
            >
              <IdCard size={14} className="text-neutral-400" />
              Ver tarjeta
            </button>
            <button
              onClick={onCommunicate}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 hover:bg-black/[0.04] transition-colors text-left"
            >
              <MessageSquare size={14} className="text-neutral-400" />
              Establecer comunicación
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
