"use client";

import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
  forwardRef,
  useEffect,
  useRef,
  useState,
} from "react";

// ----------------------------------------------------------------------------
// Avatar
// ----------------------------------------------------------------------------
interface AvatarUser {
  name: string;
  initials: string;
  color: string;
}

export function Avatar({ user, size = 24 }: { user: AvatarUser | null | undefined; size?: number }) {
  if (!user) return null;
  return (
    <div
      title={user.name}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: user.color,
        color: "#fff",
        fontSize: Math.round(size * 0.42),
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        letterSpacing: ".02em",
        boxShadow:
          "inset 0 0 0 1.5px rgba(255,255,255,.4), 0 0 0 2px var(--surface)",
      }}
    >
      {user.initials}
    </div>
  );
}

export function AvatarStack({
  users,
  size = 22,
  max = 4,
}: {
  users: AvatarUser[];
  size?: number;
  max?: number;
}) {
  const vis = users.slice(0, max);
  const extra = users.length - vis.length;
  return (
    <div style={{ display: "inline-flex" }}>
      {vis.map((u, i) => (
        <div key={i} style={{ marginLeft: i === 0 ? 0 : -6 }}>
          <Avatar user={u} size={size} />
        </div>
      ))}
      {extra > 0 && (
        <div
          style={{
            marginLeft: -6,
            width: size,
            height: size,
            borderRadius: "50%",
            background: "var(--surface-2)",
            color: "var(--ink-3)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: Math.round(size * 0.4),
            fontWeight: 600,
            boxShadow: "0 0 0 2px var(--surface)",
          }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Button
// ----------------------------------------------------------------------------
type ButtonVariant = "default" | "primary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "default", size = "md", style, children, onMouseEnter, onMouseLeave, ...rest },
  ref
) {
  const pad = size === "sm" ? "6px 10px" : size === "lg" ? "10px 18px" : "8px 14px";
  const fs = size === "sm" ? 12.5 : 13.5;
  const styles: Record<ButtonVariant, CSSProperties> = {
    default: { background: "var(--surface)", color: "var(--ink)", border: "1px solid var(--line-strong)" },
    primary: {
      background: "var(--accent)",
      color: "var(--accent-ink)",
      border: "1px solid color-mix(in oklab, var(--accent) 80%, black)",
    },
    ghost: { background: "transparent", color: "var(--ink-2)", border: "1px solid transparent" },
    danger: { background: "transparent", color: "var(--err)", border: "1px solid var(--line)" },
  };
  return (
    <button
      ref={ref}
      {...rest}
      style={{
        ...styles[variant],
        padding: pad,
        fontSize: fs,
        fontWeight: 500,
        borderRadius: 8,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        whiteSpace: "nowrap",
        transition: "background .12s, border-color .12s, filter .12s",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (variant === "default") e.currentTarget.style.background = "var(--surface-2)";
        if (variant === "ghost") e.currentTarget.style.background = "var(--surface-2)";
        if (variant === "primary") e.currentTarget.style.filter = "brightness(1.06)";
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (variant === "default") e.currentTarget.style.background = "var(--surface)";
        if (variant === "ghost") e.currentTarget.style.background = "transparent";
        if (variant === "primary") e.currentTarget.style.filter = "";
        onMouseLeave?.(e);
      }}
    >
      {children}
    </button>
  );
});

// ----------------------------------------------------------------------------
// Input + Textarea
// ----------------------------------------------------------------------------
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ style, ...rest }, ref) {
    return (
      <input
        ref={ref}
        {...rest}
        style={{
          padding: "9px 12px",
          borderRadius: 8,
          border: "1px solid var(--line-strong)",
          background: "var(--surface)",
          width: "100%",
          fontSize: 13.5,
          color: "var(--ink)",
          ...style,
        }}
      />
    );
  }
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ style, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      {...rest}
      style={{
        padding: "10px 12px",
        borderRadius: 8,
        border: "1px solid var(--line-strong)",
        background: "var(--surface)",
        width: "100%",
        fontSize: 13.5,
        fontFamily: "inherit",
        color: "var(--ink)",
        resize: "vertical",
        minHeight: 80,
        ...style,
      }}
    />
  );
});

// ----------------------------------------------------------------------------
// Chip
// ----------------------------------------------------------------------------
export function Chip({
  color = "var(--ink-3)",
  children,
  style,
}: {
  color?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 7px",
        borderRadius: 5,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: ".02em",
        background: `color-mix(in oklab, ${color} 14%, transparent)`,
        color: `color-mix(in oklab, ${color} 92%, var(--ink))`,
        border: `1px solid color-mix(in oklab, ${color} 28%, transparent)`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// ----------------------------------------------------------------------------
// Menu (dropdown)
// ----------------------------------------------------------------------------
interface MenuRenderProps {
  open: boolean;
  setOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
}
export function Menu({
  trigger,
  children,
  align = "start",
}: {
  trigger: (p: MenuRenderProps) => ReactNode;
  children: ReactNode;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      {trigger({ open, setOpen })}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            [align]: 0,
            minWidth: 180,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            boxShadow: "var(--shadow-md)",
            padding: 6,
            zIndex: 80,
          } as CSSProperties}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        textAlign: "left",
        padding: "7px 10px",
        borderRadius: 6,
        border: 0,
        background: "transparent",
        fontSize: 13,
        color: danger ? "var(--err)" : "var(--ink-2)",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}

// ----------------------------------------------------------------------------
// InlineEdit — click-to-edit text
// ----------------------------------------------------------------------------
export function InlineEdit({
  value,
  onCommit,
  render,
  inputStyle,
  placeholder,
  autoFocus,
}: {
  value: string;
  onCommit: (v: string) => void;
  render?: (v: string) => ReactNode;
  inputStyle?: CSSProperties;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [editing, setEditing] = useState(!!autoFocus);
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const commit = () => {
    setEditing(false);
    if (v.trim() && v !== value) onCommit(v.trim());
    else setV(value);
  };
  if (editing) {
    return (
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={commit}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setV(value);
            setEditing(false);
          }
        }}
        style={{
          font: "inherit",
          color: "inherit",
          background: "var(--surface)",
          border: "1px solid var(--accent)",
          borderRadius: 6,
          padding: "3px 6px",
          outline: "none",
          width: "100%",
          ...inputStyle,
        }}
      />
    );
  }
  return (
    <span onClick={() => setEditing(true)} style={{ cursor: "text" }}>
      {render ? render(value) : value}
    </span>
  );
}

// ----------------------------------------------------------------------------
// Field (label + input wrapper)
// ----------------------------------------------------------------------------
export function Field({
  label,
  right,
  children,
}: {
  label: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label style={{ display: "block" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 5,
        }}
      >
        <span
          style={{
            fontSize: 11.5,
            textTransform: "uppercase",
            letterSpacing: ".08em",
            color: "var(--ink-3)",
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        {right}
      </div>
      {children}
    </label>
  );
}
