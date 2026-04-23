import type { CSSProperties, ReactNode } from "react";

interface IconProps {
  d: ReactNode | string;
  size?: number;
  stroke?: number | "none";
  fill?: string;
  style?: CSSProperties;
}

export function Icon({ d, size = 16, stroke = 1.6, fill = "none", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={stroke === "none" ? "none" : "currentColor"}
      strokeWidth={typeof stroke === "number" ? stroke : undefined}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {typeof d === "string" ? <path d={d} /> : d}
    </svg>
  );
}

export const I = {
  plus:    <Icon d="M12 5v14M5 12h14" />,
  x:       <Icon d="M6 6l12 12M18 6L6 18" />,
  search:  <Icon d={<><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>} />,
  check:   <Icon d="M5 12l5 5L20 7" />,
  chev:    <Icon d="M6 9l6 6 6-6" />,
  chevR:   <Icon d="M9 6l6 6-6 6" />,
  chevL:   <Icon d="M15 6l-6 6 6 6" />,
  more:    <Icon d={<><circle cx={5} cy={12} r={1.4} /><circle cx={12} cy={12} r={1.4} /><circle cx={19} cy={12} r={1.4} /></>} fill="currentColor" stroke="none" />,
  star:    <Icon d="M12 3l2.6 5.6 6 .6-4.5 4.2 1.3 6L12 16.8 6.6 19.4 7.9 13.4 3.4 9.2l6-.6z" />,
  starF:   <Icon d="M12 3l2.6 5.6 6 .6-4.5 4.2 1.3 6L12 16.8 6.6 19.4 7.9 13.4 3.4 9.2l6-.6z" fill="currentColor" />,
  clock:   <Icon d={<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>} />,
  user:    <Icon d={<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></>} />,
  users:   <Icon d={<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 21c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" /><circle cx="17" cy="7" r="3" /><path d="M17 13c3 0 5.5 2.2 5.5 5" /></>} />,
  grid:    <Icon d={<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>} />,
  list:    <Icon d={<><path d="M8 6h13M8 12h13M8 18h13" /><circle cx={4} cy={6} r={1} /><circle cx={4} cy={12} r={1} /><circle cx={4} cy={18} r={1} /></>} fill="currentColor" />,
  logout:  <Icon d={<><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" /><path d="M10 17l-5-5 5-5" /><path d="M15 12H5" /></>} />,
  filter:  <Icon d="M4 5h16l-6 8v6l-4-2v-4z" />,
  trash:   <Icon d={<><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /><path d="M9 7V4h6v3" /></>} />,
  msg:     <Icon d="M4 5h16v11H8l-4 4z" />,
  flag:    <Icon d="M5 21V4h10l-1 3 1 3H5" />,
  zap:     <Icon d="M13 3L4 14h6l-1 7 9-11h-6z" />,
  eye:     <Icon d={<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>} />,
  eyeOff:  <Icon d={<><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>} />,
  gear:    <Icon d={<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>} />,
  drag:    <Icon d={<><circle cx={9} cy={6} r={1.4} /><circle cx={15} cy={6} r={1.4} /><circle cx={9} cy={12} r={1.4} /><circle cx={15} cy={12} r={1.4} /><circle cx={9} cy={18} r={1.4} /><circle cx={15} cy={18} r={1.4} /></>} fill="currentColor" stroke="none" />,
  archive: <Icon d={<><path d="M21 8v13H3V8" /><path d="M1 3h22v5H1z" /><path d="M10 12h4" /></>} />,
  rocket:  <Icon d={<><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></>} />,
  calendar:<Icon d={<><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>} />,
  edit:    <Icon d={<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>} />,
};

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="1" y="1" width="26" height="26" rx="6" fill="var(--ink)" />
      <rect x="6" y="8" width="4" height="14" rx="1.2" fill="var(--accent)" />
      <rect x="12" y="8" width="4" height="10" rx="1.2" fill="#fff" opacity=".9" />
      <rect x="18" y="8" width="4" height="6" rx="1.2" fill="#fff" opacity=".5" />
    </svg>
  );
}
