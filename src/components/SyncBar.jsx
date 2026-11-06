import { useEffect, useRef, useState } from "react";
import { AlertIcon, CloudIcon, RefreshIcon, UnlinkIcon } from "./Icons.jsx";
import { useI18n } from "../i18n.jsx";

const menuItem =
  "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors hover:bg-[var(--hover)] active:bg-[var(--hover)]";

function timeText(ms, locale) {
  return new Date(ms).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

// Cloud backup: one quiet icon button in the header, same size as its neighbours.
// Status is a tiny dot on the icon; everything else lives in the menu.
export default function SyncBar({ sync }) {
  const { t, locale } = useI18n();
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
        aria-label={t("sync.backUp")}
        title={t("sync.backUp")}
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

  // An error is kept as a key (translated now) or as the server's own message
  const errorText = error ? (error.key ? t(error.key, error.params) : error.text) : "";
  const info = needsAuth
    ? t("sync.expired")
    : failed && errorText
      ? errorText
      : (email || t("sync.googleAccount")) +
        (lastSynced ? t("sync.syncedAt", { time: timeText(lastSynced, locale) }) : "");

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menu}
        aria-label={
          needsAuth
            ? t("sync.ariaNeedsAuth")
            : failed
              ? t("sync.ariaError")
              : syncing
                ? t("sync.ariaSyncing")
                : t("sync.ariaDefault")
        }
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
        {syncing ? t("sync.ariaSyncing") : failed ? t("sync.errorStatus") : ""}
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
            {needsAuth ? t("sync.signInAgain") : failed ? t("sync.tryAgain") : t("sync.syncNow")}
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
            {t("sync.disconnect")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
