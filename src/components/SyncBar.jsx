import { useEffect, useRef, useState } from "react";
import { AlertIcon, CloseIcon, CloudIcon, RefreshIcon } from "./Icons.jsx";

const pill =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ";
const pillNeutral = "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--fg)]";
const pillAccent = "border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-soft)]";
const pillWarn = "border-[var(--warn)] text-[var(--warn)] hover:bg-[var(--accent-soft)]";
const menuItem =
  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--accent-soft)]";

function timeText(ms) {
  return new Date(ms).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

// Compact Drive sync pill in the header; the menu holds the less common actions
export default function SyncBar({ sync }) {
  const { configured, connected, status, lastSynced, error, connect, disconnect, syncNow } = sync;
  const [menu, setMenu] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e) => box.current && !box.current.contains(e.target) && setMenu(false);
    const onKey = (e) => e.key === "Escape" && setMenu(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  if (!configured) return null;

  if (!connected || status === "off") {
    return (
      <button type="button" onClick={connect} className={pill + pillAccent}>
        <CloudIcon />
        Drive’a bağlan
      </button>
    );
  }

  if (status === "needs-auth") {
    return (
      <div className="flex items-center gap-1" role="status">
        <button type="button" onClick={connect} className={pill + pillWarn}>
          <AlertIcon />
          Yeniden bağlan
        </button>
        <button
          type="button"
          onClick={disconnect}
          aria-label="Drive bağlantısını kes"
          className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--fg)]"
        >
          <CloseIcon />
        </button>
      </div>
    );
  }

  const syncing = status === "syncing";
  const failed = status === "error";
  const label = failed
    ? "Eşitleme hatası"
    : syncing
      ? "Eşitleniyor…"
      : "Eşitlendi" + (lastSynced ? " · " + timeText(lastSynced) : "");

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menu}
        onClick={() => setMenu((v) => !v)}
        className={pill + (failed ? pillWarn : pillNeutral)}
      >
        {failed ? <AlertIcon /> : syncing ? <RefreshIcon spinning /> : <CloudIcon />}
        <span role="status" aria-live="polite" className="tabular">
          {label}
        </span>
      </button>
      {menu ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-60 rounded-2xl border border-[var(--line-strong)] bg-[var(--surface)] p-1.5 shadow-lg"
        >
          {failed && error ? <p className="px-3 py-2 text-xs text-[var(--warn)]">{error}</p> : null}
          <button
            type="button"
            role="menuitem"
            className={menuItem}
            onClick={() => {
              setMenu(false);
              syncNow();
            }}
          >
            <RefreshIcon />
            {failed ? "Tekrar dene" : "Şimdi eşitle"}
          </button>
          <button
            type="button"
            role="menuitem"
            className={menuItem + " text-[var(--muted)]"}
            onClick={() => {
              setMenu(false);
              disconnect();
            }}
          >
            <CloseIcon />
            Bağlantıyı kes
          </button>
        </div>
      ) : null}
    </div>
  );
}
