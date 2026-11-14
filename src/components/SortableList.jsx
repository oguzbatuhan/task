import { useEffect, useRef, useState } from "react";

const HOLD_MS = 320; // hold duration
const SLOP = 8; // moving this far counts as scrolling; drag does not start
const GAP = 0; // rows are flush, separated by divider lines
const EDGE = 70; // auto-scroll when near the screen edge

// Reorders list items by long-press and drag. While dragging, the pointer can also be moved over another day
// (any element with data-drop-date, i.e. another day card): letting go there calls onMoveDay(id, date).
// The drop position inside that day is passed as index: onMoveDay(id, date, index).
// onDragState({ id, date, index }) reports the day under the pointer (date is null for "no other day"), and null when the drag ends.
// moveOnly: the list cannot be reordered (e.g. overdue tasks), items can only be moved to another day.
// dropIndex / dropGap: a task from another list is over this one: rows from dropIndex on move down by dropGap px (the dragged height).
// renderItem(item, sortable) sortable: { style, dragging, handlers, refCallback }
export default function SortableList({ items, onReorder, onMoveDay, onDragState, moveOnly, dropIndex, dropGap, renderItem }) {
  const nodes = useRef(new Map());
  const stop = useRef(null);
  const [drag, setDrag] = useState(null); // { id, from, to, dy }

  useEffect(() => () => stop.current && stop.current(), []);

  function start(e, id, index) {
    if (items.length < 2 && !onMoveDay) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.target.closest("button, a, input, textarea")) return;

    const s = {
      startX: e.clientX,
      startY: e.clientY,
      lastY: e.clientY,
      lastX: e.clientX,
      target: null, // another day under the pointer
      targetIndex: 0, // where in that day the task would land
      shift: 0, // px the page grew above the dragged row (a day above it opened a gap)
      startScroll: window.scrollY,
      active: false,
      centers: [],
      from: index,
      to: index,
      raf: 0,
    };

    const update = () => {
      // Is the pointer over another day? Then the task moves there instead of being reordered here.
      let target = null;
      let index = 0;
      let shift = 0;
      if (onMoveDay) {
        const ownDate = items[s.from].date;
        const el = document
          .elementsFromPoint(s.lastX, s.lastY)
          .find((n) => n.dataset && n.dataset.dropDate);
        if (el && el.dataset.dropDate !== ownDate) {
          target = el.dataset.dropDate;
          // Position among that day's open tasks: after every row whose middle is above the pointer
          const rows = el.querySelectorAll("[data-task-id]");
          rows.forEach((row) => {
            const r = row.getBoundingClientRect();
            // without the sliding-gap transform it currently has, or the index would flip back and forth
            const slide = new DOMMatrixReadOnly(getComputedStyle(row).transform).m42;
            if (r.top - slide + r.height / 2 < s.lastY) index++;
          });
          // The day opens a gap (it grows by the dragged height). If it is above the dragged row, that row's place moves
          // down by the same amount, so take it off again to keep the row under the finger.
          const src = nodes.current.get(id);
          if (index < rows.length && src && el.compareDocumentPosition(src) & Node.DOCUMENT_POSITION_FOLLOWING) shift = s.height;
        }
      }
      s.shift = shift;
      const dy = s.lastY - s.startY + (window.scrollY - s.startScroll) - s.shift;
      const center = s.centers[s.from] + dy;
      let to = 0;
      s.centers.forEach((c, j) => {
        if (j !== s.from && c < center) to++;
      });
      if (target !== s.target || index !== s.targetIndex) {
        s.target = target;
        s.targetIndex = index;
        if (onDragState) onDragState({ id, date: target, index, h: s.height });
      }
      s.to = target || moveOnly ? s.from : to;
      setDrag({ id, from: s.from, to: s.to, dy, h: s.height, moving: Boolean(target) });
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
      s.lastX = ev.clientX;
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
        if (onDragState) onDragState(null);
        if (s.target) onMoveDay(id, s.target, s.targetIndex);
        else if (s.to !== s.from) onReorder(s.from, s.to);
      }
    };
    const onCancel = () => {
      const wasActive = s.active;
      cleanup();
      if (wasActive) {
        setDrag(null);
        if (onDragState) onDragState(null);
      }
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
      if (onDragState) onDragState({ id, date: null, index: 0, h: s.height });
      update();
      // Empty days appear while dragging. If that pushes this list down, scroll along so the row stays under the
      // finger, then measure again.
      const node = nodes.current.get(id);
      const topBefore = rects[index].top;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!s.active || !node) return;
          const delta = node.getBoundingClientRect().top - topBefore;
          if (Math.abs(delta) > 0.5) window.scrollBy(0, delta);
          const again = items.map((t) => nodes.current.get(t.id));
          if (again.some((n) => !n)) return;
          s.centers = again.map((n) => {
            const r = n.getBoundingClientRect();
            return r.top + r.height / 2 + window.scrollY;
          });
          s.startScroll = window.scrollY;
          update();
        }),
      );
      s.raf = requestAnimationFrame(tick);
    }, HOLD_MS);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("touchmove", blockScroll, { passive: false });
    stop.current = cleanup;
  }

  return (
    <ul style={dropIndex != null && dropIndex < items.length ? { marginBottom: dropGap || 0 } : undefined}>
      {items.map((t, i) => {
        let style;
        const dragging = drag && drag.id === t.id;
        if (drag) {
          const shift = drag.h + GAP;
          if (dragging) {
            style = { transform: `translateY(${drag.dy}px) scale(${drag.moving ? 0.96 : 1.02})`, transition: "none" };
          } else if (drag.from < drag.to && i > drag.from && i <= drag.to) {
            style = { transform: `translateY(${-shift}px)` };
          } else if (drag.from > drag.to && i >= drag.to && i < drag.from) {
            style = { transform: `translateY(${shift}px)` };
          }
        }
        // Another day's task is hovering here: open a gap where it would land
        if (!drag && dropIndex != null && i >= dropIndex) style = { transform: `translateY(${dropGap || 0}px)` };
        const row = renderItem(t, {
          dragging: Boolean(dragging),
          active: Boolean(drag) || dropIndex != null,
          style,
          refCallback: (n) => {
            if (n) nodes.current.set(t.id, n);
            else nodes.current.delete(t.id);
          },
          onPointerDown: (e) => start(e, t.id, i),
          onContextMenu: (e) => e.preventDefault(),
        });
        return row;
      })}
    </ul>
  );
}
