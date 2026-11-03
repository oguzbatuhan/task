import { useCallback, useEffect, useRef, useState } from "react";
import {
  AuthError,
  ConflictError,
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

const sameRules = (a, b) => JSON.stringify(normalizeRules(a)) === JSON.stringify(normalizeRules(b));
const MAX_CONFLICT_RETRIES = 3;

const FLAG_KEY = "task-cloud-connected";
const DEBOUNCE_MS = 1200;
const FOCUS_SYNC_MS = 15000;
const POLL_MS = 30000; // while the page is visible, check for changes from other devices

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
      // Download, merge, upload. If another device saved in between, the upload is refused (ConflictError):
      // start over with the newer copy, so nothing either device changed is lost.
      for (let attempt = 0; ; attempt++) {
        const { data: remote, version } = await downloadData();
        const remoteTasks = normalizeTasks(remote?.tasks);
        const remoteRules = normalizeRules(remote?.rules); // older backups have no rules
        const local = tasksRef.current;
        const localRules = rulesRef.current;
        const merged = mergeTasks(local, remoteTasks);
        const mergedRules = mergeRules(localRules, remoteRules);

        const tasksChanged = !sameTasks(sortById(local), merged);
        const rulesChanged = !sameRules(mergeRules(localRules, []), mergedRules);
        if (tasksChanged || rulesChanged) skipNext.current = true;
        if (tasksChanged) setTasks(merged);
        if (rulesChanged) setRules(mergedRules);
        // Nothing to upload when the backup already holds exactly the merged data
        if (remote && sameTasks(remoteTasks, merged) && sameRules(remoteRules, mergedRules)) break;
        try {
          await uploadData({ version: 3, tasks: merged, rules: mergedRules }, version);
          break;
        } catch (e) {
          if (!(e instanceof ConflictError) || attempt >= MAX_CONFLICT_RETRIES) throw e;
        }
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
          offline ? "No internet connection, will retry when it returns." : e.message || "Unknown error"
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
    if (!cloudConfigured || !connected) return;
    return onAuthChange((event) => {
      if (event === "SIGNED_OUT" && connectedRef.current) {
        setStatus("needs-auth");
      }
    });
  }, [connected]);

  // Pull changes from other devices when returning to the tab / app, and every POLL_MS while it stays visible
  // (a tab left open on a desktop never fires "visibilitychange", so it would never see a star set on the phone).
  // Push right away when the page is hidden or frozen: phones suspend the debounce timer, so a change made just
  // before locking the screen would otherwise wait until the app is opened again.
  useEffect(() => {
    if (!cloudConfigured) return;
    const pullIfStale = () => {
      if (
        document.visibilityState === "visible" &&
        connectedRef.current &&
        Date.now() - lastRun.current > FOCUS_SYNC_MS
      ) {
        run();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") pullIfStale();
      else if (connectedRef.current) run(); // push pending changes before the page is suspended
    };
    const onPageHide = () => {
      if (connectedRef.current) run();
    };
    // Push pending changes when the connection returns
    const onOnline = () => {
      if (connectedRef.current) run();
    };
    const poll = setInterval(pullIfStale, POLL_MS);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", pullIfStale);
    window.addEventListener("pageshow", pullIfStale);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", pullIfStale);
      window.removeEventListener("pageshow", pullIfStale);
      window.removeEventListener("pagehide", onPageHide);
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
      setError(e.message || "Could not start sign-in");
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
