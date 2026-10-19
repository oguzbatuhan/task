import { useCallback, useEffect, useRef, useState } from "react";
import {
  AuthError,
  downloadData,
  driveConfigured,
  loadGoogleScript,
  signIn,
  signOut,
  uploadData,
} from "../lib/drive.js";
import { mergeTasks, normalizeTasks, sameTasks, sortById } from "../lib/tasks.js";

const FLAG_KEY = "task-drive-connected";
const DEBOUNCE_MS = 1200;
const FOCUS_SYNC_MS = 15000;

const readFlag = () => {
  try {
    return localStorage.getItem(FLAG_KEY) === "1";
  } catch {
    return false;
  }
};
const writeFlag = (on) => {
  try {
    if (on) localStorage.setItem(FLAG_KEY, "1");
    else localStorage.removeItem(FLAG_KEY);
  } catch {}
};

// status: "off" | "syncing" | "synced" | "needs-auth" | "error"
export function useDriveSync(tasks, setTasks) {
  const initiallyConnected = driveConfigured && readFlag();
  const [connected, setConnected] = useState(initiallyConnected);
  const [status, setStatus] = useState(initiallyConnected ? "syncing" : "off");
  const [lastSynced, setLastSynced] = useState(null);
  const [error, setError] = useState("");

  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const connectedRef = useRef(initiallyConnected);
  const running = useRef(false);
  const rerun = useRef(false);
  const lastRun = useRef(0);
  // A change made by the sync itself must not trigger another sync
  const skipNext = useRef(true);

  const run = useCallback(async () => {
    if (!connectedRef.current) return;
    if (running.current) {
      rerun.current = true;
      return;
    }
    running.current = true;
    lastRun.current = Date.now();
    setStatus("syncing");
    try {
      const remote = await downloadData();
      const remoteTasks = normalizeTasks(remote?.tasks);
      const local = tasksRef.current;
      const merged = mergeTasks(local, remoteTasks);

      if (!sameTasks(sortById(local), merged)) {
        skipNext.current = true;
        setTasks(merged);
      }
      if (!remote || !sameTasks(sortById(remoteTasks), merged)) {
        await uploadData({ version: 1, tasks: merged });
      }
      setStatus("synced");
      setLastSynced(Date.now());
      setError("");
    } catch (e) {
      if (e instanceof AuthError) {
        setStatus("needs-auth");
      } else {
        setStatus("error");
        const offline = !navigator.onLine || e instanceof TypeError;
        setError(
          offline ? "İnternet bağlantısı yok, bağlantı gelince yeniden denenecek." : e.message || "Bilinmeyen hata"
        );
      }
    } finally {
      running.current = false;
      if (rerun.current) {
        rerun.current = false;
        run();
      }
    }
  }, [setTasks]);

  // Sync shortly after tasks change
  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    if (!connectedRef.current) return;
    const id = setTimeout(run, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [tasks, run]);

  // On startup: preload the Google script and sync silently if previously connected
  useEffect(() => {
    if (!driveConfigured) return;
    loadGoogleScript().catch(() => {});
    if (connectedRef.current) run();
  }, [run]);

  // Pull changes from other devices when returning to the tab
  useEffect(() => {
    if (!driveConfigured) return;
    const onVisible = () => {
      if (
        document.visibilityState === "visible" &&
        connectedRef.current &&
        Date.now() - lastRun.current > FOCUS_SYNC_MS
      ) {
        run();
      }
    };
    // Push pending changes when the connection returns
    const onOnline = () => {
      if (connectedRef.current) run();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [run]);

  const connect = useCallback(async () => {
    setError("");
    setStatus("syncing");
    try {
      await signIn();
      connectedRef.current = true;
      writeFlag(true);
      setConnected(true);
      await run();
    } catch (e) {
      if (e instanceof AuthError) {
        if (e.message === "popup_failed_to_open") {
          setError("Giriş penceresi açılamadı. Tarayıcının açılır pencere engelini kapat.");
        }
        setStatus(connectedRef.current ? "needs-auth" : "off");
      } else {
        setStatus("error");
        setError(e.message || "Bilinmeyen hata");
      }
    }
  }, [run]);

  // If silent renewal fails (e.g. the browser cleared cookies), open the sign-in popup on the first tap;
  // the account and consent are remembered, so the popup usually closes by itself.
  useEffect(() => {
    if (status !== "needs-auth" || !connectedRef.current) return;
    const onTap = () => connect();
    window.addEventListener("pointerdown", onTap, { once: true });
    return () => window.removeEventListener("pointerdown", onTap);
  }, [status, connect]);

  const disconnect = useCallback(() => {
    signOut();
    writeFlag(false);
    connectedRef.current = false;
    setConnected(false);
    setStatus("off");
    setError("");
  }, []);

  return {
    configured: driveConfigured,
    connected,
    status,
    lastSynced,
    error,
    connect,
    disconnect,
    syncNow: run,
  };
}
