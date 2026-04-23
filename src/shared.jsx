// Shared UI atoms

const cn = (...xs) => xs.filter(Boolean).join(' ');

function Avatar({ user, size = 24 }) {
  if (!user) return null;
  const s = size;
  return (
    <div title={user.name}
      style={{
        width: s, height: s, borderRadius: '50%', background: user.color,
        color: '#fff', fontSize: Math.round(s*0.42), fontWeight: 600,
        display:'inline-flex', alignItems:'center', justifyContent:'center',
        flexShrink: 0, letterSpacing: '.02em',
        boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,.4), 0 0 0 2px var(--surface)'
      }}>{user.initials}</div>
  );
}

function AvatarStack({ users, size = 22, max = 4 }) {
  const vis = users.slice(0, max);
  const extra = users.length - vis.length;
  return (
    <div style={{ display:'inline-flex' }}>
      {vis.map((u,i) => (
        <div key={u.id} style={{ marginLeft: i===0 ? 0 : -6 }}><Avatar user={u} size={size} /></div>
      ))}
      {extra > 0 && (
        <div style={{
          marginLeft: -6, width:size, height:size, borderRadius:'50%',
          background:'var(--surface-2)', color:'var(--ink-3)',
          display:'inline-flex', alignItems:'center', justifyContent:'center',
          fontSize: Math.round(size*0.4), fontWeight:600, boxShadow:'0 0 0 2px var(--surface)'
        }}>+{extra}</div>
      )}
    </div>
  );
}

function Button({ variant='default', size='md', children, ...rest }) {
  const pad = size==='sm' ? '6px 10px' : size==='lg' ? '10px 18px' : '8px 14px';
  const fs = size==='sm' ? 12.5 : 13.5;
  const styles = {
    default: { background:'var(--surface)', color:'var(--ink)', border:'1px solid var(--line-strong)' },
    primary: { background:'var(--accent)', color:'var(--accent-ink)', border:'1px solid color-mix(in oklab, var(--accent) 80%, black)' },
    ghost: { background:'transparent', color:'var(--ink-2)', border:'1px solid transparent' },
    danger: { background:'transparent', color:'var(--err)', border:'1px solid var(--line)' },
  }[variant];
  return (
    <button {...rest} style={{
      ...styles, padding: pad, fontSize: fs, fontWeight:500,
      borderRadius: 8, cursor:'pointer', display:'inline-flex',
      alignItems:'center', gap: 6, whiteSpace:'nowrap',
      transition:'background .12s, border-color .12s',
      ...rest.style
    }}
    onMouseEnter={e => {
      if (variant==='default') e.currentTarget.style.background='var(--surface-2)';
      if (variant==='ghost') e.currentTarget.style.background='var(--surface-2)';
      if (variant==='primary') e.currentTarget.style.filter='brightness(1.06)';
      rest.onMouseEnter?.(e);
    }}
    onMouseLeave={e => {
      if (variant==='default') e.currentTarget.style.background='var(--surface)';
      if (variant==='ghost') e.currentTarget.style.background='transparent';
      if (variant==='primary') e.currentTarget.style.filter='';
      rest.onMouseLeave?.(e);
    }}>
      {children}
    </button>
  );
}

function Input(props) {
  return <input {...props} style={{
    padding:'9px 12px', borderRadius:8, border:'1px solid var(--line-strong)',
    background:'var(--surface)', width:'100%', fontSize:13.5,
    ...props.style
  }} />;
}

function Textarea(props) {
  return <textarea {...props} style={{
    padding:'10px 12px', borderRadius:8, border:'1px solid var(--line-strong)',
    background:'var(--surface)', width:'100%', fontSize:13.5, fontFamily:'inherit',
    resize:'vertical', minHeight:80,
    ...props.style
  }} />;
}

function Chip({ color='var(--ink-3)', children, style, ...rest }) {
  return <span {...rest} style={{
    display:'inline-flex', alignItems:'center', gap:5, padding:'2px 7px',
    borderRadius:5, fontSize: 11, fontWeight:600, letterSpacing:'.02em',
    background: `color-mix(in oklab, ${color} 14%, transparent)`,
    color: `color-mix(in oklab, ${color} 92%, black)`,
    border: `1px solid color-mix(in oklab, ${color} 28%, transparent)`,
    ...style
  }}>{children}</span>;
}

function Menu({ children, trigger, align='start' }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} style={{ position:'relative', display:'inline-block' }}>
      {trigger({ open, setOpen })}
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 6px)',
          [align]:0,
          minWidth: 180, background:'var(--surface)', border:'1px solid var(--line)',
          borderRadius:10, boxShadow:'var(--shadow-md)', padding:6, zIndex:80
        }} onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

function MenuItem({ children, onClick, danger }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:8, width:'100%', textAlign:'left',
      padding:'7px 10px', borderRadius:6, border:0, background:'transparent',
      fontSize:13, color: danger?'var(--err)':'var(--ink-2)', cursor:'pointer'
    }}
    onMouseEnter={e => e.currentTarget.style.background='var(--surface-2)'}
    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
      {children}
    </button>
  );
}

function InlineEdit({ value, onCommit, render, inputStyle, placeholder, autoFocus }) {
  const [editing, setEditing] = React.useState(!!autoFocus);
  const [v, setV] = React.useState(value);
  React.useEffect(() => { setV(value); }, [value]);
  const commit = () => { setEditing(false); if (v.trim() && v !== value) onCommit(v.trim()); else setV(value); };
  if (editing) {
    return <input autoFocus value={v}
      onChange={e=>setV(e.target.value)}
      onBlur={commit}
      placeholder={placeholder}
      onKeyDown={e => { if (e.key==='Enter') commit(); if (e.key==='Escape') { setV(value); setEditing(false); } }}
      style={{
        font:'inherit', color:'inherit', background:'var(--surface)',
        border:'1px solid var(--accent)', borderRadius:6, padding:'3px 6px',
        outline:'none', width:'100%', ...inputStyle
      }} />;
  }
  return <span onClick={() => setEditing(true)} style={{ cursor:'text' }}>{render ? render(value) : value}</span>;
}

function fmtDate(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const opt = { month:'short', day:'numeric', ...(sameYear?{}:{ year:'numeric' }) };
  return d.toLocaleDateString('en-US', opt);
}

function dueState(ts) {
  if (!ts) return null;
  const diff = ts - Date.now();
  if (diff < 0) return 'overdue';
  if (diff < 1000*60*60*24) return 'soon';
  return 'normal';
}

function relativeTime(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s/60)}m ago`;
  if (s < 86400) return `${Math.round(s/3600)}h ago`;
  if (s < 86400*7) return `${Math.round(s/86400)}d ago`;
  return fmtDate(ts);
}

Object.assign(window, { cn, Avatar, AvatarStack, Button, Input, Textarea, Chip, Menu, MenuItem, InlineEdit, fmtDate, dueState, relativeTime });
