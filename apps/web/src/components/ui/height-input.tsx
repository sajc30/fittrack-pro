"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  valueCm: string;          // always stored as cm string
  onChange: (cm: string) => void;
}

function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}

function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * 30.48 + inches * 2.54) * 10) / 10;
}

export function HeightInput({ valueCm, onChange }: Props) {
  const cmNum = parseFloat(valueCm) || 0;
  const { feet: initFeet, inches: initInches } = cmNum
    ? cmToFeetInches(cmNum)
    : { feet: 5, inches: 9 };

  const [feet, setFeet]     = useState(initFeet || 5);
  const [inches, setInches] = useState(initInches || 9);

  // Sync when external valueCm changes (e.g. profile load)
  useEffect(() => {
    if (cmNum) {
      const { feet: f, inches: i } = cmToFeetInches(cmNum);
      setFeet(f);
      setInches(i);
    }
  }, [valueCm]);

  const inputStyle = {
    backgroundColor: "var(--color-inset)",
    border: "1px solid var(--color-border)",
    color: "var(--color-text-primary)",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 14,
    outline: "none",
    width: "100%",
  } as const;

  const selectStyle = {
    ...inputStyle,
    appearance: "none" as const,
    WebkitAppearance: "none" as const,
    paddingRight: 32,
    cursor: "pointer",
  };

  // Imperial — two selects
  const feetOptions = [4, 5, 6, 7];
  const inchOptions = Array.from({ length: 12 }, (_, i) => i);

  function handleFeetChange(f: number) {
    setFeet(f);
    onChange(String(feetInchesToCm(f, inches)));
  }

  function handleInchesChange(i: number) {
    setInches(i);
    onChange(String(feetInchesToCm(feet, i)));
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="relative">
        <select
          value={feet}
          onChange={(e) => handleFeetChange(parseInt(e.target.value))}
          style={selectStyle}
          onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
        >
          {feetOptions.map((f) => (
            <option key={f} value={f}>{f} ft</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--color-text-ghost)" }} />
      </div>
      <div className="relative">
        <select
          value={inches}
          onChange={(e) => handleInchesChange(parseInt(e.target.value))}
          style={selectStyle}
          onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
        >
          {inchOptions.map((i) => (
            <option key={i} value={i}>{i} in</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--color-text-ghost)" }} />
      </div>
    </div>
  );
}
