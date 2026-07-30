interface Props {
  active: boolean;
}

// Shared full-viewport cloud backdrop for Database/Mailing. Rendered once at
// the app root, outside the animated page container — nesting it inside a
// motion.div would give it a transformed ancestor, which turns `position:
// fixed` into "fixed to that ancestor" instead of the viewport.
export function CloudBackground({ active }: Props) {
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none transition-opacity duration-500"
      style={{ background: "#e6dcd2", opacity: active ? 1 : 0 }}
    >
      <div
        className="login-cloud login-cloud-a"
        style={{ width: 640, height: 640, top: "-10%", left: "-10%", mixBlendMode: "multiply", opacity: 0.45 }}
      />
      <div
        className="login-cloud login-cloud-b"
        style={{ width: 560, height: 560, bottom: "-15%", right: "-10%", mixBlendMode: "multiply", opacity: 0.45 }}
      />
      <div
        className="login-cloud login-cloud-c"
        style={{ width: 420, height: 420, top: "35%", left: "55%", mixBlendMode: "multiply", opacity: 0.4 }}
      />
    </div>
  );
}
