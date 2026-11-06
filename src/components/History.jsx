import { useEffect, useRef, useState } from "react";
import { ChevronIcon, CloseIcon, HistoryIcon } from "./Icons.jsx";
import { useI18n } from "../i18n.jsx";

const FOCUSABLE =
  'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Quiet icon button in the page header
export function HistoryButton({ count, onClick }) {
  const { t, tp } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={tp("history.aria", count)}
      title={t("history.title")}
      className="icon-btn"
    >
      <HistoryIcon />
    </button>
  );
}

export function HistorySheet({
  title,
  summary,
  onClose,
  children,
}) {
  const { t } = useI18n();
  title = title ?? t("history.title");
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const closeFn = useRef(onClose);
  closeFn.current = onClose;
  const openedAt = useRef(Date.now());
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef(null);

  const isMobile = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 639px)").matches;

  useEffect(() => {
    const prevFocus = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (closeRef.current) closeRef.current.focus({ preventScroll: true });

    const onKey = (e) => {
      if (document.querySelectorAll('[aria-modal="true"]').length > 1) return;
      if (e.key === "Escape") {
        closeFn.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter(
        (n) => !n.disabled && n.offsetParent !== null,
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          !panelRef.current.contains(document.activeElement))
      ) {
        e.preventDefault();
        last.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last ||
          !panelRef.current.contains(document.activeElement))
      ) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (prevFocus && prevFocus.focus)
        prevFocus.focus({ preventScroll: true });
    };
  }, []);

  const onHandleDown = (e) => {
    if (!isMobile()) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = { y0: e.clientY, dy: 0, id: e.pointerId };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setDragging(true);
  };

  const onHandleMove = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    d.dy = Math.max(0, e.clientY - d.y0);
    setOffset(d.dy);
  };

  const endDrag = (e) => {
    const d = drag.current;
    if (!d || (e && d.id !== e.pointerId)) return;
    drag.current = null;
    setDragging(false);
    setOffset(0);
    if (d.dy > 110) closeFn.current();
  };

  return (
    <div
      className="history-backdrop fixed inset-0 z-50 flex items-end justify-center overscroll-contain bg-black/60 sm:items-stretch sm:justify-end"
      onMouseDown={(e) =>
        e.target === e.currentTarget &&
        Date.now() - openedAt.current > 500 &&
        closeFn.current()
      }
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={
          "history-panel flex h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.5rem] border border-[var(--line)] bg-[var(--surface-elevated)] shadow-[0_-8px_40px_rgba(0,0,0,0.45)] sm:h-full sm:max-w-md sm:rounded-l-2xl sm:rounded-r-none sm:border-r-0"
        }
        style={{
          transform: offset ? "translateY(" + offset + "px)" : undefined,
          transition: dragging
            ? "none"
            : "transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        {/* Mobile drag zone */}
        <div
          className="sm:hidden touch-none select-none"
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="flex justify-center pb-1 pt-3" aria-hidden="true">
            <div className="h-1 w-9 rounded-full bg-[var(--line-strong)]" />
          </div>
          <header className="flex items-center gap-3 px-6 pb-2 pt-1">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold tracking-tight">
                {title}
              </h2>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--muted)] active:bg-[var(--hover)]"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <CloseIcon />
            </button>
          </header>
        </div>

        {/* Desktop header */}
        <header className="hidden shrink-0 items-center gap-3 px-6 pt-5 sm:flex">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="-mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--fg)]"
          >
            <CloseIcon />
          </button>
        </header>

        {summary ? (
          <div className="shrink-0 px-6 pb-4">{summary}</div>
        ) : null}

        <div
          data-history-scroll
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6"
          style={{
            paddingBottom: "max(28px, env(safe-area-inset-bottom, 0px))",
          }}
        >
          {children}
        </div>
      </section>
    </div>
  );
}

// One quiet line instead of a stats card
export function HistoryStats({ days, done, total }) {
  const { t, tp } = useI18n();
  return (
    <p className="tabular text-[13px] text-[var(--muted)]">
      {t("history.stats", { done, total, days, dayWord: tp("history.day", days) })}
    </p>
  );
}

// Month heading: plain small caps text, no sticky bar
export function MonthHead({ label, meta }) {
  return (
    <h3 className="flex items-baseline justify-between gap-2 px-1 pb-1 pt-7 text-xs font-medium text-[var(--muted-2)] first:pt-3">
      <span className="uppercase tracking-wider">{label}</span>
      <span className="tabular">{meta}</span>
    </h3>
  );
}

// One past day: a single hairline row; tasks appear underneath when opened
export function HistoryDay({
  primary,
  secondary,
  done = 0,
  total = 0,
  open,
  onToggle,
  children,
}) {
  const full = total > 0 && done === total;
  return (
    <section className="border-b border-[var(--line)] last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-[3.25rem] w-full items-center gap-3 px-1 py-2 text-left"
      >
        <span className="min-w-0 flex-1 truncate text-[0.9375rem]">
          <span className="font-medium">{primary}</span>
          {secondary ? (
            <span className="ml-2 text-[13px] text-[var(--muted-2)]">{secondary}</span>
          ) : null}
        </span>
        <span
          className={
            "tabular shrink-0 text-xs " +
            (full ? "text-[var(--success)]" : "text-[var(--muted-2)]")
          }
        >
          {done}/{total}
        </span>
        <span
          className={
            "shrink-0 text-[var(--muted-2)] transition-transform " +
            (open ? "rotate-180" : "rotate-0")
          }
        >
          <ChevronIcon dir="down" />
        </span>
      </button>
      {open ? <div className="task-in pb-2">{children}</div> : null}
    </section>
  );
}

export function HistoryEmpty() {
  const { t } = useI18n();
  return <p className="py-20 text-center text-sm text-[var(--muted)]">{t("history.empty")}</p>;
}

// Infinite scroll sentinel for older history days
export function HistoryLoadMore({
  hasMore,
  onLoadMore,
}) {
  const ref = useRef(null);
  const cb = useRef(onLoadMore);
  cb.current = onLoadMore;

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasMore) return;
    const root = el.closest("[data-history-scroll]") || null;
    let locked = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || locked) return;
        locked = true;
        cb.current();
        // brief lock so one intersection does not fire many times while limit updates
        setTimeout(() => {
          locked = false;
        }, 400);
      },
      { root, rootMargin: "160px 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore]);

  if (!hasMore) return null;

  return <div ref={ref} className="h-10" aria-hidden="true" />;
}
