import { useEffect, useRef, useState } from "react";

const linkButton = "rounded-md px-1.5 py-0.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)]";
const menuItem =
  "block w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--accent-soft)]";

function timeText(ms) {
  return new Date(ms).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

// A small one-line status indicator shown once sync is set up
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

  const row = "mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs";

  if (!connected || status === "off") {
    return (
      <div className={row}>
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--line-strong)]" aria-hidden="true"></span>
        <span className="text-[var(--muted)]">Yalnızca bu cihazda</span>
        <button type="button" onClick={connect} className={linkButton}>
          Drive’a bağlan
        </button>
      </div>
    );
  }

  if (status === "needs-auth" || status === "error") {
    return (
      <div className={row} role="status">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--warn)]" aria-hidden="true"></span>
        <span className="text-[var(--warn)]">
          {status === "needs-auth" ? "Drive oturumu kapandı." : "Eşitleme hatası."}
          {error ? " " + error : ""}
        </span>
        <button type="button" onClick={status === "needs-auth" ? connect : syncNow} className={linkButton}>
          {status === "needs-auth" ? "Yeniden bağlan" : "Tekrar dene"}
        </button>
        <button type="button" onClick={disconnect} className={linkButton + " !text-[var(--muted)]"}>
          Kes
        </button>
      </div>
    );
  }

  const syncing = status === "syncing";
  return (
    <div className="relative mt-1.5 inline-block" ref={box}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menu}
        onClick={() => setMenu((v) => !v)}
        className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs text-[var(--muted)] hover:bg-[var(--accent-soft)]"
        style={{ marginLeft: "-6px" }}
      >
        <span
          className={"h-1.5 w-1.5 rounded-full bg-[var(--accent)] " + (syncing ? "animate-pulse" : "")}
          aria-hidden="true"
        ></span>
        <span role="status" aria-live="polite" className="tabular">
          {syncing ? "Eşitleniyor…" : "Drive" + (lastSynced ? " · " + timeText(lastSynced) : "")}
        </span>
      </button>
      {menu ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-20 mt-1 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className={menuItem}
            onClick={() => {
              setMenu(false);
              syncNow();
            }}
          >
            Şimdi eşitle
          </button>
          <button
            type="button"
            role="menuitem"
            className={menuItem}
            onClick={() => {
              setMenu(false);
              disconnect();
            }}
          >
            Bağlantıyı kes
          </button>
        </div>
      ) : null}
    </div>
  );
}
