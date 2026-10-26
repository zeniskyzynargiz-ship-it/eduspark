"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useLang } from "@/lib/i18n/client";

/** Password input with a show/hide button so the teacher can see what was typed. */
export function PasswordField({ name, label, autoComplete, value, onChange }: { name: string; label: string; autoComplete: string; value?: string; onChange?: (v: string) => void }) {
  const { d } = useLang();
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={8}
          className="input pr-24"
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-sm font-semibold text-leaf-700 px-2.5 py-1.5 rounded-lg hover:bg-leaf-50"
          aria-pressed={show}
          aria-controls={name}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {show ? d.auth.hide : d.auth.show}
        </button>
      </div>
    </div>
  );
}
