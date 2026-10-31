import { useCallback, useEffect, useRef, useState } from "react";
import {
  AuthError,
  cloudConfigured,
  downloadData,
  onAuthChange,
  requireUser,
  signIn,
  signOut,
  uploadData,
} from "../lib/supabase.js";
import { mergeTasks, normalizeTasks, sameTasks, sortById } from "../lib/tasks.js";
import { mergeRules, normalizeRules } from "../lib/repeat.js";

const FLAG_KEY = "task-cloud-connected";
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
export function useCloudSync(tasks, setTasks, rules, setRules) {
  const initiallyConnected = cloudConfigured && readFlag();
  const [connected, setConnected] = useState(initiallyConnected);
  const [status, setStatus] = useState(initiallyConnected ? "syncing" : "off");
  const [lastSynced, setLastSynced] = useState(null);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");

  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const rulesRef = useRef(rules);
  rulesRef.current = rules;
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
      const user = await requireUser();
      setEmail(user.email || "");
      const remote = await downloadData();
      const remoteTasks = normalizeTasks(remote?.tasks);
      const local = tasksRef.current;
      const merged = mergeTasks(local, remoteTasks);
      // Recurring rules travel in the same backup (older backups have none)
      const remoteRules = normalizeRules(remote?.rules);
      const localRules = rulesRef.current;
      const mergedRules = mergeRules(localRules, remoteRules);

      const tasksChanged = !sameTasks(sortById(local), merged);
      const rulesChanged = !sameTasks(mergeRules(localRules, []), mergedRules);
      if (tasksChanged || rulesChanged) skipNext.current = true;
      if (tasksChanged) setTasks(merged);
      if (rulesChanged) setRules(mergedRules);
      if (!remote || !sameTasks(sortById(remoteTasks), merged) || !sameTasks(mergeRules(remoteRules, []), mergedRules)) {
        await uploadData({ version: 2, tasks: merged, rules: mergedRules });
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
  }, [setTasks, setRules]);

  // Sync shortly after tasks change
  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    if (!connectedRef.current) return;
    const id = setTimeout(run, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [tasks, rules, run]);

  // On startup (also right after returning from the Google sign-in page): sync if previously connected.
  // Supabase finishes the sign-in code exchange inside getSession(), so run() simply waits for it.
  useEffect(() => {
    if (!cloudConfigured) return;
    if (connectedRef.current) run();
  }, [run]);

  // If the session is lost (signed out elsewhere, refresh token revoked) ask to reconnect
  useEffect(() => {
    if (!cloudConfigured) return;
    return onAuthChange((event) => {
      if (event === "SIGNED_OUT" && connectedRef.current) {
        setStatus("needs-auth");
      }
    });
  }, []);

  // Pull changes from other devices when returning to the tab
  useEffect(() => {
    if (!cloudConfigured) return;
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

  // Redirects to Google. The flag is written first so the app syncs automatically when it comes back.
  const connect = useCallback(async () => {
    setError("");
    setStatus("syncing");
    writeFlag(true);
    try {
      await signIn();
    } catch (e) {
      writeFlag(connectedRef.current);
      setStatus(connectedRef.current ? "needs-auth" : "off");
      setError(e.message || "Giriş başlatılamadı");
    }
  }, []);

  const disconnect = useCallback(async () => {
    connectedRef.current = false;
    writeFlag(false);
    setConnected(false);
    setStatus("off");
    setError("");
    setEmail("");
    await signOut();
  }, []);

  return {
    configured: cloudConfigured,
    connected,
    status,
    lastSynced,
    error,
    email,
    connect,
    disconnect,
    syncNow: run,
  };
}
