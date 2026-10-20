import { useEffect, useRef, useState } from "react";
import { AlertIcon, CloudIcon, RefreshIcon, UnlinkIcon } from "./Icons.jsx";

const pill =
  "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[0.8125rem] font-medium transition-colors ";
const pillNeutral =
  "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--fg)]";
const pillAccent = "border-transparent bg-[var(--accent-soft)] text-[var(--accent)] hover:opacity-85";
const pillWarn = "border-[var(--warn)] text-[var(--warn)] hover:bg-[var(--hover)]";
const menuItem =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--hover)]";

function timeText(ms) {
  return new Date(ms).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

// Drive sync chip for the top-right corner of the header; the menu holds the actions
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
        <button type="button" onClick={disconnect} aria-label="Drive bağlantısını kes" className="icon-btn">
          <UnlinkIcon />
        </button>
      </div>
    );
  }

  const syncing = status === "syncing";
  const failed = status === "error";
  const label = failed ? "Hata" : syncing ? "Eşitleniyor" : lastSynced ? timeText(lastSynced) : "Drive";

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menu}
        aria-label="Google Drive eşitleme"
        onClick={() => setMenu((v) => !v)}
        className={pill + (failed ? pillWarn : pillNeutral)}
      >
        {failed ? <AlertIcon /> : syncing ? <RefreshIcon spinning /> : <CloudIcon />}
        <span role="status" aria-live="polite" className="tabular">
          {label}
        </span>
        {!failed && !syncing ? (
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" aria-hidden="true"></span>
        ) : null}
      </button>
      {menu ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-56 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-xl"
        >
          <p className="px-3 pb-1.5 pt-2 text-xs text-[var(--muted)]">
            {failed && error
              ? error
              : lastSynced
                ? "Google Drive · son eşitleme " + timeText(lastSynced)
                : "Google Drive"}
          </p>
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
            <UnlinkIcon />
            Bağlantıyı kes
          </button>
        </div>
      ) : null}
    </div>
  );
}
