import { useEffect, useRef, useState } from "react";

const HOLD_MS = 320; // hold duration
const SLOP = 8; // moving this far counts as scrolling; drag does not start
const GAP = 8; // gap between rows (gap-2)
const EDGE = 70; // auto-scroll when near the screen edge

// Reorders list items by long-press and drag.
// renderItem(item, sortable) sortable: { style, dragging, handlers, refCallback }
export default function SortableList({ items, onReorder, renderItem }) {
  const nodes = useRef(new Map());
  const stop = useRef(null);
  const [drag, setDrag] = useState(null); // { id, from, to, dy }

  useEffect(() => () => stop.current && stop.current(), []);

  function start(e, id, index) {
    if (items.length < 2) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.target.closest("button, a, input, textarea")) return;

    const s = {
      startX: e.clientX,
      startY: e.clientY,
      lastY: e.clientY,
      startScroll: window.scrollY,
      active: false,
      centers: [],
      from: index,
      to: index,
      raf: 0,
    };

    const update = () => {
      const dy = s.lastY - s.startY + (window.scrollY - s.startScroll);
      const center = s.centers[s.from] + dy;
      let to = 0;
      s.centers.forEach((c, j) => {
        if (j !== s.from && c < center) to++;
      });
      s.to = to;
      setDrag({ id, from: s.from, to, dy, h: s.height });
    };

    const tick = () => {
      if (!s.active) return;
      const vh = window.innerHeight;
      let v = 0;
      if (s.lastY < EDGE) v = -Math.ceil((EDGE - s.lastY) / 5);
      else if (s.lastY > vh - EDGE) v = Math.ceil((s.lastY - (vh - EDGE)) / 5);
      if (v) {
        window.scrollBy(0, v);
        update();
      }
      s.raf = requestAnimationFrame(tick);
    };

    const blockScroll = (ev) => {
      if (s.active && ev.cancelable) ev.preventDefault();
    };

    const cleanup = () => {
      clearTimeout(s.timer);
      cancelAnimationFrame(s.raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("touchmove", blockScroll);
      stop.current = null;
    };

    const onMove = (ev) => {
      s.lastY = ev.clientY;
      if (!s.active) {
        if (Math.hypot(ev.clientX - s.startX, ev.clientY - s.startY) > SLOP) cleanup();
        return;
      }
      update();
    };
    const onUp = () => {
      const wasActive = s.active;
      cleanup();
      if (wasActive) {
        setDrag(null);
        if (s.to !== s.from) onReorder(s.from, s.to);
      }
    };
    const onCancel = () => {
      const wasActive = s.active;
      cleanup();
      if (wasActive) setDrag(null);
    };

    s.timer = setTimeout(() => {
      const list = items.map((t) => nodes.current.get(t.id));
      if (list.some((n) => !n)) return cleanup();
      const rects = list.map((n) => n.getBoundingClientRect());
      s.centers = rects.map((r) => r.top + r.height / 2 + window.scrollY);
      s.height = rects[index].height;
      s.active = true;
      s.startScroll = window.scrollY;
      s.startY = s.lastY;
      if (navigator.vibrate) navigator.vibrate(12);
      update();
      s.raf = requestAnimationFrame(tick);
    }, HOLD_MS);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("touchmove", blockScroll, { passive: false });
    stop.current = cleanup;
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((t, i) => {
        let style;
        const dragging = drag && drag.id === t.id;
        if (drag) {
          const shift = drag.h + GAP;
          if (dragging) {
            style = { transform: `translateY(${drag.dy}px) scale(1.02)`, transition: "none" };
          } else if (drag.from < drag.to && i > drag.from && i <= drag.to) {
            style = { transform: `translateY(${-shift}px)` };
          } else if (drag.from > drag.to && i >= drag.to && i < drag.from) {
            style = { transform: `translateY(${shift}px)` };
          }
        }
        return renderItem(t, {
          dragging: Boolean(dragging),
          active: Boolean(drag),
          style,
          refCallback: (n) => {
            if (n) nodes.current.set(t.id, n);
            else nodes.current.delete(t.id);
          },
          onPointerDown: (e) => start(e, t.id, i),
          onContextMenu: (e) => e.preventDefault(),
        });
      })}
    </ul>
  );
}
