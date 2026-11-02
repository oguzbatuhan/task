import { useEffect, useRef, useState } from "react";
import { ChevronIcon, CloseIcon, HistoryIcon, SearchIcon } from "./Icons.jsx";

// Quiet row under the main content. The whole history stays hidden behind it.
export function HistoryButton({ count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className="inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-[0.8125rem] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--fg)] active:bg-[var(--hover)]"
    >
      <HistoryIcon />
      <span>History</span>
      <span className="tabular rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--fg)]">
        {count}
      </span>
    </button>
  );
}

export function HistorySheet({ title = "History", summary, toolbar, onClose, children }) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const closeFn = useRef(onClose);
  closeFn.current = onClose;
  const openedAt = useRef(Date.now());
  const [expanded, setExpanded] = useState(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef(null);

  const isMobile = () =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;

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
    let dy = e.clientY - d.y0;
    if (expanded) {
      if (dy < 0) dy = 0;
    } else if (dy < 0) {
      dy = Math.max(dy, -120);
    }
    d.dy = dy;
    setOffset(dy);
  };

  const endDrag = (e) => {
    const d = drag.current;
    if (!d) return;
    if (e && d.id !== e.pointerId) return;
    const dy = d.dy || 0;
    drag.current = null;
    setDragging(false);
    if (dy > 110) {
      setOffset(0);
      closeFn.current();
      return;
    }
    if (!expanded && dy < -50) {
      setExpanded(true);
      setOffset(0);
      return;
    }
    if (expanded && dy > 70) {
      setExpanded(false);
      setOffset(0);
      return;
    }
    setOffset(0);
  };

  const heightClass = expanded ? "h-[100dvh] rounded-none" : "h-[90dvh] rounded-t-[1.5rem]";

  return (
    <div
      className="history-backdrop fixed inset-0 z-50 flex items-end justify-center overscroll-contain bg-black/50 sm:items-stretch sm:justify-end"
      onMouseDown={(e) => e.target === e.currentTarget && Date.now() - openedAt.current > 500 && closeFn.current()}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={
          "history-panel flex w-full max-w-lg flex-col overflow-hidden border border-[var(--line)] bg-[var(--bg)] shadow-[0_-8px_40px_rgba(0,0,0,0.45)] sm:h-full sm:max-w-md sm:rounded-none sm:rounded-l-2xl sm:border-r-0 sm:bg-[var(--surface)] " +
          heightClass
        }
        style={{
          transform: offset ? "translateY(" + offset + "px)" : undefined,
          transition: dragging
            ? "none"
            : "transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), border-radius 0.28s ease",
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
          <header className="flex items-center gap-3 px-5 pb-3 pt-1">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold tracking-tight">{title}</h2>
              
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--muted)] ring-1 ring-[var(--line)] active:bg-[var(--hover)]"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <CloseIcon />
            </button>
          </header>
        </div>

        {/* Desktop header */}
        <header className="hidden shrink-0 items-center gap-3 px-5 pt-4 sm:flex">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg)] text-[var(--muted)] ring-1 ring-[var(--line)] hover:text-[var(--fg)]"
          >
            <CloseIcon />
          </button>
        </header>

        {summary ? <div className="shrink-0 px-5 pb-3 pt-1 sm:pt-3">{summary}</div> : null}

        {toolbar ? (
          <div className="shrink-0 border-b border-[var(--line)] px-5 pb-3 pt-1">{toolbar}</div>
        ) : null}

        <div
          data-history-scroll
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5"
          style={{ paddingBottom: "max(28px, env(safe-area-inset-bottom, 0px))" }}
        >
          {children}
        </div>
      </section>
    </div>
  );
}

// Summary strip: completion rate with a bar, plus day and task counts
export function HistoryStats({ days, done, total }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3.5 sm:bg-[var(--bg)]">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="tabular text-2xl font-semibold leading-none tracking-tight">{pct}%</div>
          <div className="mt-1 text-xs text-[var(--muted)]">completed</div>
        </div>
        <div className="tabular text-right text-xs leading-relaxed text-[var(--muted)]">
          <div>
            <span className="text-[var(--fg)]">{done}</span> of {total} tasks
          </div>
          <div>
            {days} {days === 1 ? "day" : "days"}
          </div>
        </div>
      </div>
      <div className="progress mt-3">
        <span style={{ width: pct + "%" }} />
      </div>
    </div>
  );
}

export function HistoryToolbar({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  allOpen,
  onToggleAll,
  hasDays,
}) {
  const filters = [
    { id: "all", label: "All" },
    { id: "done", label: "Completed" },
    { id: "pending", label: "Pending" },
  ];
  return (
    <div className="flex flex-col gap-2.5">
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]">
          <SearchIcon />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search tasks or days…"
          enterKeyHint="search"
          className="h-10 w-full rounded-xl border border-transparent bg-[var(--surface)] pl-10 pr-9 text-base outline-none placeholder:text-[var(--muted)] focus:border-[var(--line-strong)] sm:bg-[var(--bg)] sm:text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--fg)]"
            aria-label="Clear search"
          >
            <CloseIcon />
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <div role="tablist" aria-label="Filter" className="flex rounded-full bg-[var(--bg)] p-0.5 ring-1 ring-[var(--line)] sm:bg-[var(--surface)]">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => onFilterChange(f.id)}
              className={
                "h-7 rounded-full px-3 text-xs font-medium transition-colors " +
                (filter === f.id
                  ? "bg-[var(--fg)] text-[var(--bg)]"
                  : "text-[var(--muted)] hover:text-[var(--fg)]")
              }
            >
              {f.label}
            </button>
          ))}
        </div>
        {hasDays ? (
          <button
            type="button"
            onClick={onToggleAll}
            className="ml-auto rounded-full px-2.5 py-1 text-xs font-medium text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--fg)]"
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

// Month heading inside the list; sticks to the top while that month scrolls
export function MonthHead({ label, meta }) {
  return (
    <h3 className="sticky top-0 z-[1] -mx-4 flex items-baseline justify-between gap-2 bg-[var(--bg)]/95 px-5 pb-1.5 pt-4 text-xs font-semibold text-[var(--muted)] backdrop-blur-md sm:-mx-5 sm:bg-[var(--surface)]/95 sm:px-6">
      <span className="uppercase tracking-wider">{label}</span>
      <span className="tabular font-medium">{meta}</span>
    </h3>
  );
}

// One past day: date tile, label, mini progress, open/closed state
export function HistoryDay({ primary, secondary, badge, done = 0, total = 0, open, onToggle, children }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  const full = total > 0 && done === total;
  return (
    <section className="my-1.5 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] sm:bg-[var(--bg)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-[3.5rem] w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--hover)] active:bg-[var(--hover)]"
      >
        {badge ? (
          <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--bg)] leading-none ring-1 ring-[var(--line)] sm:bg-[var(--surface)]">
            <span className="tabular text-sm font-semibold">{badge.day}</span>
            <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-[var(--muted)]">{badge.wd}</span>
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">
            <span className="font-medium text-[var(--fg)]">{primary}</span>
            {secondary ? <span className="ml-2 text-[var(--muted)]">{secondary}</span> : null}
          </span>
          <span className="mt-1.5 flex items-center gap-2">
            <span className="progress h-1 flex-1">
              <span style={{ width: pct + "%", opacity: full ? 1 : 0.6 }} />
            </span>
            <span className="tabular shrink-0 text-[11px] text-[var(--muted)]">
              {done}/{total}
            </span>
          </span>
        </span>
        <span
          className={"shrink-0 text-[var(--muted)] transition-transform " + (open ? "rotate-180" : "rotate-0")}
        >
          <ChevronIcon dir="down" />
        </span>
      </button>
      {open ? <div className="task-in border-t border-[var(--line)] px-2 py-1.5">{children}</div> : null}
    </section>
  );
}

export function HistoryEmpty({ query, filter }) {
  let message = "No past days yet.";
  if (query) message = `No results found for "${query}".`;
  else if (filter === "done") message = "No days with completed tasks.";
  else if (filter === "pending") message = "No days with pending tasks.";

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="flex h-10 w-10 items-center justify-center text-[var(--muted)]">
        <HistoryIcon />
      </div>
      <p className="text-sm text-[var(--muted)]">{message}</p>
    </div>
  );
}

// Infinite scroll sentinel for older history days
export function HistoryLoadMore({ hasMore, onLoadMore, loadingLabel = "Loading older days…" }) {
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

  return (
    <div ref={ref} className="flex flex-col items-center gap-2 py-6">
      <div className="h-1 w-16 overflow-hidden rounded-full bg-[var(--line)]">
        <div className="history-load-bar h-full w-1/2 rounded-full bg-[var(--accent)]" />
      </div>
      <p className="text-xs text-[var(--muted)]">{loadingLabel}</p>
      <button
        type="button"
        onClick={() => cb.current()}
        className="btn btn-ghost btn-sm mt-1"
      >
        Older days
      </button>
    </div>
  );
}
