import { TaskRow } from "./TaskRow.jsx";
import { HistoryDay, HistoryEmpty, HistoryLoadMore, MonthHead } from "./History.jsx";
import { groupLabel } from "../lib/dates.js";

// Pending first, then completed: the same list for every past day
function DayTasks({ tasks, handlers }) {
  if (tasks.length === 0) return null;
  return (
    <ul>
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} {...handlers} />
      ))}
    </ul>
  );
}

// Body of the history sheet: months, their days, and a "load more" button.
// months: [{ key, label, days: [{ date }] }]; handlers: { onToggle, onEdit, onRemove, onToggleSub, onToggleStar }
export default function HistoryList({ months, byDate, today, openDays, onToggleDay, pastStats, hasMore, onLoadMore, handlers }) {
  if (months.length === 0) return <HistoryEmpty />;
  return (
    <>
      {months.map((m) => {
        const st = pastStats(m.days.map((d) => d.date));
        return (
          <div key={m.key}>
            <MonthHead label={m.label} meta={st.done + "/" + st.total} />
            {m.days.map(({ date }) => {
              const all = byDate.get(date) || [];
              const label = groupLabel(date, today);
              return (
                <HistoryDay
                  key={date}
                  primary={label.primary}
                  secondary={label.secondary}
                  done={all.filter((x) => x.done).length}
                  total={all.length}
                  open={openDays.has(date)}
                  onToggle={() => onToggleDay(date)}
                >
                  <DayTasks tasks={all.filter((x) => !x.done)} handlers={handlers} />
                  <DayTasks tasks={all.filter((x) => x.done)} handlers={handlers} />
                </HistoryDay>
              );
            })}
          </div>
        );
      })}
      <HistoryLoadMore hasMore={hasMore} onLoadMore={onLoadMore} />
    </>
  );
}
