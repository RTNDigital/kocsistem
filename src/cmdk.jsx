// Command palette (⌘K) — keyboard-first actions & navigation

function CmdK({ open, onClose }) {
  const { state, dispatch } = useStore();
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState(0);
  const inputRef = React.useRef(null);

  React.useEffect(() => { if (open) { setQ(''); setSel(0); setTimeout(()=>inputRef.current?.focus(), 10); } }, [open]);

  const items = React.useMemo(() => {
    const go = (route) => () => { dispatch({ type:'SET_ROUTE', route }); onClose(); };
    const base = [
      { kind:'action', label:'Go to Boards', hint:'G then B', run: go({ name:'dashboard' }), group:'Navigation' },
      { kind:'action', label:'Go to Settings', hint:'G then S', run: go({ name:'settings' }), group:'Navigation' },
      { kind:'action', label:'Sign out', run: () => { dispatch({ type:'LOGOUT' }); onClose(); }, group:'Account' },
      { kind:'action', label:'New board', run: () => {
        const t = prompt('Board title'); if (t?.trim()) { dispatch({ type:'DATA', fn: M.addBoard(t.trim()) }); }
        onClose();
      }, group:'Create' },
    ];
    const boards = state.data.boards.map(b => ({
      kind:'board', label: b.title, hint:'Board',
      color: b.color, run: go({ name:'board', boardId: b.id }), group:'Boards'
    }));
    const cards = state.data.cards.slice(0, 40).map(c => {
      const b = state.data.boards.find(x => x.id===c.boardId);
      return { kind:'card', label: c.title, hint: b?.title || '', color: b?.color,
        run: go({ name:'board', boardId: c.boardId }), group:'Cards' };
    });
    const all = [...base, ...boards, ...cards];
    if (!q.trim()) return all.slice(0, 24);
    const qq = q.toLowerCase();
    return all.filter(x => x.label.toLowerCase().includes(qq)).slice(0, 24);
  }, [q, state.data]);

  React.useEffect(() => { setSel(0); }, [q]);

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s+1, items.length-1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s-1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); items[sel]?.run(); }
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  if (!open) return null;
  // Group items preserving order
  const groups = [];
  const seen = new Set();
  items.forEach((it, idx) => {
    if (!seen.has(it.group)) { seen.add(it.group); groups.push({ name: it.group, items: [] }); }
    groups[groups.findIndex(g=>g.name===it.group)].items.push({ ...it, idx });
  });

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(20,20,19,.4)', backdropFilter:'blur(3px)',
      zIndex: 200, display:'flex', alignItems:'flex-start', justifyContent:'center',
      padding:'12vh 20px 20px'
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:'100%', maxWidth: 580, background:'var(--surface)',
        border:'1px solid var(--line-strong)', borderRadius:12, boxShadow:'var(--shadow-lg)',
        overflow:'hidden'
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px', borderBottom:'1px solid var(--line)' }}>
          <span style={{ color:'var(--ink-4)' }}>{I.search}</span>
          <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)} onKeyDown={onKey}
            placeholder="Type a command, board, or card…"
            style={{ flex:1, border:0, outline:'none', background:'transparent', fontSize:15, color:'var(--ink)' }} />
          <span className="kbd">Esc</span>
        </div>
        <div style={{ maxHeight: 420, overflowY:'auto', padding:'6px 0' }}>
          {items.length === 0 && (
            <div style={{ padding:'24px 16px', color:'var(--ink-4)', fontSize:13, textAlign:'center' }}>No matches</div>
          )}
          {groups.map(g => (
            <div key={g.name}>
              <div style={{ padding:'8px 16px 4px', fontSize:10.5, fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--ink-4)' }}>{g.name}</div>
              {g.items.map(it => (
                <button key={it.idx} onMouseEnter={()=>setSel(it.idx)} onClick={it.run} style={{
                  display:'flex', alignItems:'center', gap:10, width:'100%',
                  padding:'8px 16px', border:0, background: sel===it.idx ? 'color-mix(in oklab, var(--accent) 10%, transparent)' : 'transparent',
                  cursor:'pointer', textAlign:'left', fontSize:13, color:'var(--ink)'
                }}>
                  {it.color ? <span style={{ width:10, height:10, borderRadius:3, background: it.color }} /> :
                    <span style={{ width:10, height:10, display:'inline-block' }} />}
                  <span style={{ flex:1 }}>{it.label}</span>
                  {it.hint && <span className="mono" style={{ fontSize:11, color:'var(--ink-4)' }}>{it.hint}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:12, padding:'8px 14px', borderTop:'1px solid var(--line)', background:'var(--surface-2)', fontSize:11, color:'var(--ink-3)' }}>
          <span><span className="kbd">↑↓</span> navigate</span>
          <span><span className="kbd">↵</span> select</span>
          <span style={{ marginLeft:'auto' }} className="mono">⌘K anywhere</span>
        </div>
      </div>
    </div>
  );
}

// Inbox — surfaces cards assigned or commented-on
function Inbox({ open, onClose }) {
  const { state, dispatch } = useStore();
  const me = state.accounts.find(a => a.id===state.session.userId);
  if (!open) return null;

  const mine = state.data.cards.filter(c => c.assignees.includes(me.id));
  const mentions = state.data.cards.filter(c => c.comments.some(co => co.text.includes('@') && co.authorId !== me.id));

  const Row = ({ card }) => {
    const b = state.data.boards.find(x => x.id===card.boardId);
    const col = state.data.columns.find(x => x.id===card.colId);
    return (
      <button onClick={()=>{ dispatch({ type:'SET_ROUTE', route:{ name:'board', boardId: card.boardId } }); onClose(); }}
        style={{
          display:'flex', alignItems:'center', gap:10, width:'100%', textAlign:'left',
          padding:'10px 14px', border:0, borderBottom:'1px solid var(--line)',
          background:'transparent', cursor:'pointer'
        }}
        onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
        <span style={{ width:10, height:10, borderRadius:3, background: b?.color, flexShrink:0 }} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:500, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{card.title}</div>
          <div style={{ fontSize:11.5, color:'var(--ink-3)', marginTop:2 }}>
            <span className="mono">{b?.title}</span> · {col?.title}
          </div>
        </div>
        {card.due && dueState(card.due)==='overdue' && <Chip color="var(--err)">overdue</Chip>}
        {card.priority==='high' && <Chip color="var(--err)">high</Chip>}
      </button>
    );
  };

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(20,20,19,.35)', zIndex:180,
      display:'flex', justifyContent:'flex-end'
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width: 380, background:'var(--surface)', borderLeft:'1px solid var(--line)',
        display:'flex', flexDirection:'column', boxShadow:'var(--shadow-lg)'
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'14px 16px', borderBottom:'1px solid var(--line)' }}>
          <span style={{ fontSize:14, fontWeight:600 }}>Inbox</span>
          <span className="mono" style={{ fontSize:11, color:'var(--ink-4)' }}>{mine.length + mentions.length}</span>
          <button onClick={onClose} style={{ marginLeft:'auto', background:'transparent', border:0, color:'var(--ink-3)', cursor:'pointer', padding:4 }}>{I.x}</button>
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          <div style={{ padding:'10px 14px 6px', fontSize:10.5, fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--ink-4)' }}>Assigned to you</div>
          {mine.length === 0 && <div style={{ padding:'12px 16px', fontSize:12.5, color:'var(--ink-4)', fontStyle:'italic' }}>Nothing assigned.</div>}
          {mine.map(c => <Row key={c.id} card={c} />)}
          <div style={{ padding:'14px 14px 6px', fontSize:10.5, fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--ink-4)' }}>Mentions</div>
          {mentions.length === 0 && <div style={{ padding:'12px 16px', fontSize:12.5, color:'var(--ink-4)', fontStyle:'italic' }}>No mentions yet.</div>}
          {mentions.map(c => <Row key={c.id} card={c} />)}
        </div>
      </div>
    </div>
  );
}

window.CmdK = CmdK;
window.Inbox = Inbox;
