import { useEffect } from "react";

// Small message pill at the bottom of the screen with an optional "Geri al" action. Closes itself.
export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(onClose, 5000);
    return () => clearTimeout(id);
  }, [toast, onClose]);

  if (!toast) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4"
      style={{ bottom: "max(20px, calc(env(safe-area-inset-bottom, 0px) + 12px))" }}
    >
      <div
        role="status"
        aria-live="polite"
        className="toast-in pointer-events-auto flex max-w-sm items-center gap-3 rounded-full bg-[var(--fg)] py-1.5 pl-5 pr-1.5 text-sm text-[var(--bg)] shadow-xl"
      >
        <span className="min-w-0 truncate">{toast.message}</span>
        {toast.undo ? (
          <button
            type="button"
            onClick={() => {
              toast.undo();
              onClose();
            }}
            className="h-8 shrink-0 rounded-full bg-[color-mix(in_srgb,var(--bg)_15%,transparent)] px-4 text-[0.8125rem] font-medium hover:bg-[color-mix(in_srgb,var(--bg)_28%,transparent)]"
          >
            Geri al
          </button>
        ) : (
          <span className="w-3" aria-hidden="true"></span>
        )}
      </div>
    </div>
  );
}
