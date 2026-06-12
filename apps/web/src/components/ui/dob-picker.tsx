"use client";

import { ChevronDown } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daysInMonth(month: number, year: number) {
  if (!month || !year) return 31;
  return new Date(year, month, 0).getDate();
}

interface Props {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
}

export function DobPicker({ value, onChange }: Props) {
  const parts = value ? value.split("-") : ["", "", ""];
  const selectedYear  = parts[0] ? parseInt(parts[0]) : 0;
  const selectedMonth = parts[1] ? parseInt(parts[1]) : 0;
  const selectedDay   = parts[2] ? parseInt(parts[2]) : 0;

  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 10; y >= 1935; y--) years.push(y);

  const maxDays = daysInMonth(selectedMonth, selectedYear);
  const days: number[] = [];
  for (let d = 1; d <= maxDays; d++) days.push(d);

  function emit(y: number, m: number, d: number) {
    if (!y || !m || !d) { onChange(""); return; }
    const mm = String(m).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    onChange(`${y}-${mm}-${dd}`);
  }

  const selectStyle = {
    backgroundColor: "var(--color-inset)",
    border: "1px solid var(--color-border)",
    color: "var(--color-text-primary)",
    borderRadius: 8,
    padding: "10px 32px 10px 12px",
    fontSize: 14,
    outline: "none",
    width: "100%",
    appearance: "none" as const,
    cursor: "pointer",
    WebkitAppearance: "none" as const,
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Month */}
      <div className="relative">
        <select
          value={selectedMonth}
          onChange={(e) => {
            const m = parseInt(e.target.value);
            const clamped = Math.min(selectedDay, daysInMonth(m, selectedYear) || 31);
            emit(selectedYear, m, clamped);
          }}
          style={selectStyle}
          onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
        >
          <option value={0} disabled style={{ color: "var(--color-text-ghost)" }}>Month</option>
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--color-text-ghost)" }} />
      </div>

      {/* Day */}
      <div className="relative">
        <select
          value={selectedDay}
          onChange={(e) => emit(selectedYear, selectedMonth, parseInt(e.target.value))}
          style={selectStyle}
          onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
        >
          <option value={0} disabled style={{ color: "var(--color-text-ghost)" }}>Day</option>
          {days.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--color-text-ghost)" }} />
      </div>

      {/* Year */}
      <div className="relative">
        <select
          value={selectedYear}
          onChange={(e) => emit(parseInt(e.target.value), selectedMonth, selectedDay)}
          style={selectStyle}
          onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
        >
          <option value={0} disabled style={{ color: "var(--color-text-ghost)" }}>Year</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--color-text-ghost)" }} />
      </div>
    </div>
  );
}
