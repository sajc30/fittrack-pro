"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daysInMonth(month: number, year: number) {
  if (!month) return 31;
  return new Date(year || 2000, month, 0).getDate();
}

interface Props {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
}

export function DobPicker({ value, onChange }: Props) {
  // Partial selections live here — the value prop only ever carries a complete
  // date, so building one dropdown at a time must not reset the others.
  const [year, setYear] = useState(0);
  const [month, setMonth] = useState(0);
  const [day, setDay] = useState(0);

  // Sync down when the parent supplies a complete date (e.g. profile loads in settings)
  useEffect(() => {
    if (!value) return;
    const [y, m, d] = value.split("-").map(Number);
    if (y && m && d) {
      setYear(y);
      setMonth(m);
      setDay(d);
    }
  }, [value]);

  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 10; y >= 1935; y--) years.push(y);

  const maxDays = daysInMonth(month, year);
  const days: number[] = [];
  for (let d = 1; d <= maxDays; d++) days.push(d);

  function emit(y: number, m: number, d: number) {
    if (y && m && d) {
      onChange(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    } else {
      onChange("");
    }
  }

  function handleMonth(m: number) {
    const clampedDay = day > daysInMonth(m, year) ? daysInMonth(m, year) : day;
    setMonth(m);
    setDay(clampedDay);
    emit(year, m, clampedDay);
  }

  function handleDay(d: number) {
    setDay(d);
    emit(year, month, d);
  }

  function handleYear(y: number) {
    const clampedDay = day > daysInMonth(month, y) ? daysInMonth(month, y) : day;
    setYear(y);
    setDay(clampedDay);
    emit(y, month, clampedDay);
  }

  const selectStyle = {
    backgroundColor: "var(--color-inset)",
    border: "1px solid var(--color-border)",
    color: "var(--color-text-primary)",
    borderRadius: 2,
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
          value={month}
          onChange={(e) => handleMonth(parseInt(e.target.value))}
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
          value={day}
          onChange={(e) => handleDay(parseInt(e.target.value))}
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
          value={year}
          onChange={(e) => handleYear(parseInt(e.target.value))}
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
