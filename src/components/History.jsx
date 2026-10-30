import { useEffect, useRef } from "react";
import { ChevronIcon, CloseIcon, HistoryIcon } from "./Icons.jsx";

// Small pill under the main content. The whole history stays hidden behind it.
export function HistoryButton({ count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--line-strong)] pl-3 pr-3.5 text-[0.8125rem] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--fg)]"
    >
      <HistoryIcon />
      Geçmiş
      <span className="tabular rounded-full bg-[var(--accent-soft)] px-1.5 text-xs leading-5 text-[var(--accent)]">
        {count}
      </span>
    </button>
  );
}

const FOCUSABLE = 'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])';

// Bottom sheet on phones, side drawer on larger screens.
// toolbar: optional area under the title (search etc.) · children: the scrollable list
export function HistorySheet({ title = "Geçmiş", summary, toolbar, onClose, children }) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const closeFn = useRef(onClose);
  closeFn.current = onClose;
  const openedAt = useRef(Date.now());

  useEffect(() => {
    const prevFocus = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (closeRef.current) closeRef.current.focus({ preventScroll: true });

    const onKey = (e) => {
      // Another dialog (e.g. the task editor) opened on top of this one: leave the keys to it
      if (document.querySelectorAll('[aria-modal="true"]').length > 1) return;
      if (e.key === "Escape") {
        closeFn.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((n) => !n.disabled && n.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !panelRef.current.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !panelRef.current.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div
      className="history-backdrop fixed inset-0 z-50 flex items-end justify-center overscroll-contain bg-black/40 sm:items-stretch sm:justify-end"
      // The tap that opened the sheet must never close it (ghost mouse events on phones)
      onMouseDown={(e) => e.target === e.currentTarget && Date.now() - openedAt.current > 500 && closeFn.current()}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="history-panel flex h-[82dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-[var(--line)] bg-[var(--surface)] shadow-2xl sm:h-full sm:max-w-sm sm:rounded-none sm:rounded-l-3xl sm:border-r-0"
      >
        <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-[var(--line-strong)] sm:hidden" aria-hidden="true"></div>
        <header className="flex shrink-0 items-start gap-3 px-5 pb-3 pt-3 sm:pt-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-medium">{title}</h2>
            {summary ? <p className="tabular mt-0.5 text-xs text-[var(--muted)]">{summary}</p> : null}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Kapat" className="icon-btn -mr-2 -mt-1">
            <CloseIcon />
          </button>
        </header>
        {toolbar ? <div className="shrink-0 px-5 pb-3">{toolbar}</div> : null}
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-[var(--line)] px-5"
          style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom, 0px))" }}
        >
          {children}
        </div>
      </section>
    </div>
  );
}

// Month heading inside the list; sticks to the top while that month scrolls
export function MonthHead({ label, meta }) {
  return (
    <h3 className="sticky top-0 z-[1] -mx-5 flex items-baseline gap-2 bg-[var(--surface)] px-5 pb-1.5 pt-4 text-xs font-medium text-[var(--muted)]">
      <span>{label}</span>
      <span className="flex-1" aria-hidden="true"></span>
      <span className="tabular">{meta}</span>
    </h3>
  );
}

// One past day: a single row that opens to show that day's records
export function HistoryDay({ primary, secondary, meta, open, onToggle, children }) {
  return (
    <section className="border-b border-[var(--line)] last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center gap-2 rounded-lg py-2 text-left text-sm"
      >
        <span className={"inline-flex shrink-0 text-[var(--muted)] transition-transform " + (open ? "" : "-rotate-90")}>
          <ChevronIcon dir="down" />
        </span>
        <span className="shrink-0 font-medium">{primary}</span>
        {secondary ? <span className="min-w-0 truncate text-[var(--muted)]">{secondary}</span> : null}
        <span className="flex-1" aria-hidden="true"></span>
        <span className="tabular shrink-0 font-medium">{meta}</span>
      </button>
      {open ? <div className="task-in pb-2">{children}</div> : null}
    </section>
  );
}
