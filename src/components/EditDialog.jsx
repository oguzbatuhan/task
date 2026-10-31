import { useEffect, useRef, useState } from "react";
import { CalendarIcon, ClockIcon, CloseIcon, RepeatIcon } from "./Icons.jsx";
import DayPicker from "./DayPicker.jsx";
import { shortDate } from "../lib/dates.js";

const field =
  "relative flex h-11 min-w-0 items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--bg)] px-3.5 text-base transition-colors focus-within:border-[var(--accent)] sm:text-[0.9375rem]";

// Bottom sheet on phones, centered card on larger screens: edit title, day and time, or delete.
// mode "rule": edits a recurring rule instead (title, time and weekdays; no single date).
// ruleInfo / onEditRule: shown for a task made by a rule, with a button that opens that rule.
export default function EditDialog({ task, mode = "task", ruleInfo = "", onEditRule, onSave, onDelete, onClose }) {
  const isRule = mode === "rule";
  const [days, setDays] = useState(task.days || []);
  const [title, setTitle] = useState(task.title);
  const [date, setDate] = useState(task.date);
  const [time, setTime] = useState(task.time || "");
  const [confirming, setConfirming] = useState(false);
  const inputRef = useRef(null);
  const cancelRef = useRef(null);
  const openedAt = useRef(Date.now());
  const text = title.trim();

  // Focus the title, lock page scroll, restore focus on close
  useEffect(() => {
    const prev = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // On phones the keyboard would open at once and cover the day/time fields, so only focus with a mouse
    const fine = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
    if (fine && inputRef.current) inputRef.current.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (prev && prev.focus) prev.focus();
    };
  }, []);

  useEffect(() => {
    if (confirming && cancelRef.current) cancelRef.current.focus();
  }, [confirming]);

  // Follow the visible area so the on-screen keyboard never covers the sheet
  const [vv, setVv] = useState(null);
  useEffect(() => {
    const vp = window.visualViewport;
    if (!vp) return;
    // Only while the keyboard is open (visible area clearly shorter than the window); otherwise the sheet keeps its
    // plain full-screen position, so a wrong viewport offset can never push it off screen
    const update = () =>
      setVv(window.innerHeight - vp.height > 120 ? { h: vp.height, top: vp.offsetTop } : null);
    update();
    vp.addEventListener("resize", update);
    vp.addEventListener("scroll", update);
    return () => {
      vp.removeEventListener("resize", update);
      vp.removeEventListener("scroll", update);
    };
  }, []);

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      confirming ? setConfirming(false) : onClose();
    }
  };

  function submit(e) {
    e.preventDefault();
    if (!text) return inputRef.current && inputRef.current.focus();
    if (isRule) {
      if (days.length === 0) return;
      return onSave(task.id, { title: text, time, days });
    }
    onSave(task.id, { title: text, date, time });
  }

  return (
    <div
      className="dialog-backdrop fixed inset-x-0 top-0 z-50 flex h-dvh items-end justify-center overscroll-contain bg-black/40 sm:items-center sm:p-5"
      style={vv ? { height: vv.h + "px", transform: "translateY(" + vv.top + "px)" } : undefined}
      // Ignore taps in the first moment: the tap that opened the sheet must never close it (ghost mouse events on phones)
      onMouseDown={(e) => e.target === e.currentTarget && Date.now() - openedAt.current > 500 && onClose()}
      onKeyDown={onKeyDown}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label={isRule ? "Tekrarlayan görevi düzenle" : "Görevi düzenle"}
        className="dialog-sheet max-h-full w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl border border-[var(--line)] bg-[var(--surface)] px-5 pt-5 shadow-2xl sm:rounded-3xl"
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-medium">{isRule ? "Tekrarlayan görevi düzenle" : "Görevi düzenle"}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="icon-btn -mr-2"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            autoComplete="off"
            aria-label="Görev adı"
            placeholder="Görev adı"
            className={field + " w-full text-[var(--fg)] outline-none placeholder:text-[var(--muted)]"}
          />

          <div className={"grid gap-2.5 [&>*]:min-w-0 " + (isRule ? "grid-cols-1" : "grid-cols-2")}>
            {isRule ? null : (
            <label className={field + " cursor-pointer"}>
              <span className="text-[var(--muted)]">
                <CalendarIcon />
              </span>
              <span className="truncate">{shortDate(date)}</span>
              <input
                type="date"
                value={date}
                aria-label="Tarih"
                onChange={(e) => e.target.value && setDate(e.target.value)}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker();
                  } catch {}
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
            )}

            <div className={field + " cursor-pointer pr-2"}>
              <span className="text-[var(--muted)]">
                <ClockIcon />
              </span>
              <span
                className={
                  "tabular flex-1 " + (time ? "" : "text-[var(--muted)]")
                }
              >
                {time || "Saat yok"}
              </span>
              <input
                type="time"
                value={time}
                aria-label="Saat"
                onChange={(e) => setTime(e.target.value)}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker();
                  } catch {}
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              {time ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTime("");
                  }}
                  aria-label="Saati kaldır"
                  className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--fg)]"
                >
                  <CloseIcon />
                </button>
              ) : null}
            </div>
          </div>

          {isRule ? (
            <div className="mt-1">
              <DayPicker days={days} onChange={setDays} />
              <p className="mt-2 text-xs text-[var(--muted)]">
                Değişiklikler bugünden itibaren, tamamlanmamış tekrarlara uygulanır. Geçmiş ve tamamlanan görevler değişmez.
              </p>
            </div>
          ) : ruleInfo ? (
            <div className="flex items-center gap-2 rounded-xl border border-[var(--line)] px-3.5 py-2.5 text-sm">
              <span className="text-[var(--accent)]">
                <RepeatIcon />
              </span>
              <span className="min-w-0 flex-1 truncate text-[var(--muted)]">{ruleInfo}</span>
              <button type="button" onClick={onEditRule} className="btn btn-ghost btn-sm">
                Tekrarı düzenle
              </button>
            </div>
          ) : null}
        </div>

        {confirming ? (
          <div
            role="alertdialog"
            aria-label="Silme onayı"
            className="mt-6 flex flex-wrap items-center gap-2"
          >
            <p className="min-w-0 flex-1 basis-full text-sm sm:basis-0">
              {isRule ? "Tekrarlayan görev silinsin mi? Bugünden sonraki tamamlanmamış tekrarlar da silinir." : "Bu görev silinsin mi?"}
            </p>
            <button
              ref={cancelRef}
              type="button"
              onClick={() => setConfirming(false)}
              className="btn btn-ghost btn-sm"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="btn btn-warn btn-sm"
            >
              Evet, sil
            </button>
          </div>
        ) : (
          <div className="mt-6 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="btn btn-sm min-w-0 border-[var(--line-strong)] text-[var(--warn)] hover:bg-[var(--hover)]"
            >
              Sil
            </button>
            <span className="flex-1" aria-hidden="true"></span>
            <button type="button" onClick={onClose} className="btn btn-ghost min-w-0">
              Vazgeç
            </button>
            <button
              type="submit"
              aria-disabled={!text || (isRule && days.length === 0)}
              className={"btn btn-solid min-w-0 " + (text && (!isRule || days.length) ? "" : "opacity-40")}
            >
              Kaydet
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
