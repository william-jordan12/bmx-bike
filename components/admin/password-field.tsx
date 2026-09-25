"use client";

import { useState, type ChangeEvent } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
  hint?: string;
  invalid?: boolean;
  variant?: "light" | "dark";
};

const TONES = {
  light: {
    field: "border-[#d8d3ca] bg-white focus-within:border-[var(--orange)]",
    fieldInvalid: "border-[#a5372a] bg-white",
    input: "text-[#1d1c1a] placeholder:text-[#a8a49c]",
    icon: "text-[#8d887f] hover:text-[var(--orange)]"
  },
  dark: {
    field: "border-[#3c3934] bg-white/5 focus-within:border-[var(--orange)]",
    fieldInvalid: "border-[#a5372a] bg-white/5",
    input: "text-white placeholder:text-[#5f5b55]",
    icon: "text-[#77736c] hover:text-[var(--orange)]"
  }
} as const;

export default function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  autoComplete = "current-password",
  minLength,
  required,
  hint,
  invalid,
  variant = "light"
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const tone = TONES[variant];

  return (
    <label className="block">
      <span className="eyebrow text-[#8d887f]">{label}</span>
      <span className={`mt-2 flex items-center gap-2 border px-3 transition ${invalid ? tone.fieldInvalid : tone.field}`}>
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          className={`h-11 w-full bg-transparent text-sm outline-none ${tone.input}`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className={`flex h-8 w-8 shrink-0 items-center justify-center transition ${tone.icon}`}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          title={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
      {hint ? <span className="mt-1.5 block text-[11px] leading-4 text-[#8d887f]">{hint}</span> : null}
    </label>
  );
}
