interface Props {
  label: string;
  children: React.ReactNode;
  // "top" (default) renders above the trigger; use "bottom" when the
  // trigger sits near the top edge of a clipped (overflow-hidden)
  // container, or the tooltip would render off the top and get clipped.
  placement?: "top" | "bottom";
  // "center" (default) centers the tooltip on the trigger; use "left" when
  // the trigger sits near the right edge of its container, so the tooltip
  // opens leftward instead of overflowing off the right edge of the screen.
  align?: "center" | "left";
}

// A styled dark tooltip matching the app's own visual language (same look
// as DatabasePage's CellTip), replacing the browser's plain default
// title-attribute tooltip wherever a button needs one.
export function Tooltip({ label, children, placement = "top", align = "center" }: Props) {
  return (
    <span className="relative inline-flex group/tooltip">
      {children}
      <span
        className={`pointer-events-none absolute z-30 opacity-0 scale-95 group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 transition-[opacity,transform] duration-150 whitespace-nowrap rounded-lg bg-neutral-900 text-white text-[11px] font-medium px-2.5 py-1.5 shadow-lg ${
          placement === "top" ? "bottom-full mb-2" : "top-full mt-2"
        } ${align === "center" ? "left-1/2 -translate-x-1/2" : "right-0"}`}
      >
        {label}
      </span>
    </span>
  );
}
