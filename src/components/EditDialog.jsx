import { useEffect, useRef, useState } from "react";
import { CalendarIcon, ClockIcon, CloseIcon } from "./Icons.jsx";
import { shortDate } from "../lib/dates.js";

const field =
  "relative flex h-11 min-w-0 items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--bg)] px-3.5 text-base transition-colors focus-within:border-[var(--accent)] sm:text-[0.9375rem]";

// Bottom sheet on phones, centered card on larger screens: edit title, day and time, or delete
export default function EditDialog({ task, onSave, onDelete, onClose }) {
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
        aria-label="Görevi düzenle"
        className="dialog-sheet max-h-full w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl border border-[var(--line)] bg-[var(--surface)] px-5 pt-5 shadow-2xl sm:rounded-3xl"
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-medium">Görevi düzenle</h2>
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

          <div className="grid grid-cols-2 gap-2.5 [&>*]:min-w-0">
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
        </div>

        {confirming ? (
          <div
            role="alertdialog"
            aria-label="Silme onayı"
            className="mt-6 flex flex-wrap items-center gap-2"
          >
            <p className="min-w-0 flex-1 basis-full text-sm sm:basis-0">Bu görev silinsin mi?</p>
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
              aria-disabled={!text}
              className={"btn btn-solid min-w-0 " + (text ? "" : "opacity-40")}
            >
              Kaydet
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
