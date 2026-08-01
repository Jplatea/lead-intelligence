interface Props {
  label: string;
  children: React.ReactNode;
}

// A styled dark tooltip matching the app's own visual language (same look
// as DatabasePage's CellTip), replacing the browser's plain default
// title-attribute tooltip wherever a button needs one.
export function Tooltip({ label, children }: Props) {
  return (
    <span className="relative inline-flex group/tooltip">
      {children}
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-30 opacity-0 scale-95 group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 transition-[opacity,transform] duration-150 whitespace-nowrap rounded-lg bg-neutral-900 text-white text-[11px] font-medium px-2.5 py-1.5 shadow-lg">
        {label}
      </span>
    </span>
  );
}
