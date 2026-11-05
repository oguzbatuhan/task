import { useEffect, useRef, useState } from "react";
import { AlertIcon, CloudIcon, RefreshIcon, UnlinkIcon } from "./Icons.jsx";

const menuItem =
  "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors hover:bg-[var(--hover)] active:bg-[var(--hover)]";

function timeText(ms) {
  return new Date(ms).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// Cloud backup: one quiet icon button in the header, same size as its neighbours.
// Status is a tiny dot on the icon; everything else lives in the menu.
export default function SyncBar({ sync }) {
  const { configured, connected, status, lastSynced, error, email, connect, disconnect, syncNow } = sync;
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

  // Not signed in: tap goes straight to Google sign-in
  if (!connected || status === "off") {
    return (
      <button
        type="button"
        onClick={connect}
        aria-label="Back up with Google"
        title="Back up with Google"
        className="icon-btn"
      >
        <CloudIcon />
      </button>
    );
  }

  const needsAuth = status === "needs-auth";
  const syncing = status === "syncing";
  const failed = status === "error";
  const bad = needsAuth || failed;

  const info = needsAuth
    ? "Session expired. Sign in again to keep backing up."
    : failed && error
      ? error
      : (email || "Google account") + (lastSynced ? " · synced " + timeText(lastSynced) : "");

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menu}
        aria-label={needsAuth ? "Cloud backup: sign in again" : failed ? "Cloud backup: error" : syncing ? "Syncing" : "Cloud backup"}
        onClick={() => setMenu((v) => !v)}
        className="icon-btn relative"
        style={bad ? { color: "var(--warn)" } : undefined}
      >
        {bad ? <AlertIcon /> : syncing ? <RefreshIcon spinning /> : <CloudIcon />}
        {!bad && !syncing ? (
          <span
            className="absolute right-[0.7rem] top-[0.7rem] h-1.5 w-1.5 rounded-full bg-[var(--success)] sm:right-[0.5rem] sm:top-[0.5rem]"
            aria-hidden="true"
          ></span>
        ) : null}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {syncing ? "Syncing" : failed ? "Sync error" : ""}
      </span>
      {menu ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-[min(16rem,calc(100vw-2rem))] rounded-2xl border border-[var(--line)] bg-[var(--surface-elevated)] p-1.5 shadow-xl"
        >
          <p className="break-words px-3 pb-2 pt-2 text-xs leading-relaxed text-[var(--muted)]">{info}</p>
          <button
            type="button"
            role="menuitem"
            className={menuItem}
            onClick={() => {
              setMenu(false);
              needsAuth ? connect() : syncNow();
            }}
          >
            <RefreshIcon />
            {needsAuth ? "Sign in again" : failed ? "Try again" : "Sync now"}
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
            Disconnect
          </button>
        </div>
      ) : null}
    </div>
  );
}
