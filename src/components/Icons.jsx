const base = { fill: "none", "aria-hidden": "true" };
const stroke = {
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" {...base}>
      <path
        d="M2.5 7.5l3 3 6-7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" {...base}>
      <path
        d="M3.5 5h11M7 5V3.5h4V5M5 5l.7 9h6.6L13 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" {...base}>
      <path
        d="M9 3.5v11M3.5 9h11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChevronIcon({ dir = "down" }) {
  const d = {
    left: "M11 3.5L5.5 9l5.5 5.5",
    right: "M7 3.5L12.5 9 7 14.5",
    down: "M3.5 6.5L9 12l5.5-5.5",
  }[dir];
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" {...base}>
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 18 18" {...base}>
      <rect
        x="2.5"
        y="3.5"
        width="13"
        height="12"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M2.5 7.5h13M6 2v3M12 2v3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CloudIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" {...base}>
      <path
        d="M5 14.5a3.25 3.25 0 01-.4-6.47A4.5 4.5 0 0113.2 7.3 3.6 3.6 0 0113 14.5H5z"
        strokeWidth="1.4"
        {...stroke}
      />
    </svg>
  );
}

export function RefreshIcon({ spinning = false }) {
  return (
    <svg
      className={spinning ? "animate-spin" : undefined}
      width="16"
      height="16"
      viewBox="0 0 18 18"
      {...base}
    >
      <path
        d="M14.5 9a5.5 5.5 0 11-1.6-3.9M14.5 3v3h-3"
        strokeWidth="1.5"
        {...stroke}
      />
    </svg>
  );
}

export function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" {...base}>
      <path d="M9 5.2v4.3M9 12.3v.1" strokeWidth="1.8" {...stroke} />
      <circle cx="9" cy="9" r="6.5" strokeWidth="1.4" {...stroke} />
    </svg>
  );
}

export function UnlinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" {...base}>
      <path
        d="M7.5 10.5l3-3M6.6 8.4L5 10a2.4 2.4 0 003.4 3.4L10 11.8M11.4 9.6L13 8a2.4 2.4 0 00-3.4-3.4L8 6.2M3 3l12 12"
        strokeWidth="1.4"
        {...stroke}
      />
    </svg>
  );
}

export function ClockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 18 18" {...base}>
      <circle cx="9" cy="9" r="6.5" strokeWidth="1.5" {...stroke} />
      <path d="M9 5.5V9l2.4 1.6" strokeWidth="1.5" {...stroke} />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" {...base}>
      <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" strokeWidth="2" {...stroke} />
    </svg>
  );
}
