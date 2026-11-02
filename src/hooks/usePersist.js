import { useEffect, useRef } from "react";

// Saves a value to localStorage shortly after it stops changing (a burst of edits = one write), and writes right away
// when the page is hidden or closed, so nothing is lost.
export function usePersist(key, value, delay = 300) {
  const latest = useRef(value);
  const dirty = useRef(false);
  latest.current = value;

  const flush = useRef(() => {});
  flush.current = () => {
    if (!dirty.current) return;
    dirty.current = false;
    try {
      localStorage.setItem(key, JSON.stringify(latest.current));
    } catch {}
  };

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false; // the value was just read from storage, nothing to write yet
      return;
    }
    dirty.current = true;
    const id = setTimeout(() => flush.current(), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  useEffect(() => {
    const onHide = () => document.visibilityState !== "visible" && flush.current();
    const now = () => flush.current();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", now);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", now);
      flush.current();
    };
  }, []);
}
