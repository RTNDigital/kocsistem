// Dashboard — boards list

function Dashboard() {
  const { state, dispatch } = useStore();
  const { data, session } = state;
  const me = state.accounts.find(a => a.id === session.userId);
  const [query, setQuery] = React.useState('');
  const [adding, setAdding] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState('');

  const boards = data.boards.filter(b => !query || b.title.toLowerCase().includes(query.toLowerCase()));
  const starred = boards.filter(b => b.starred);
  const others = boards.filter(b => !b.starred);

  const go = (boardId) => dispatch({ type:'SET_ROUTE', route:{ name:'board', boardId } });

  const createBoard = (e) => {
    e?.preventDefault?.();
    if (!newTitle.trim()) return;
    dispatch({ type:'DATA', fn: M.addBoard(newTitle.trim()) });
    setNewTitle(''); setAdding(false);
  };

  return (
    <AppShell active="dashboard">
      <div style={{ maxWidth: 1160, width:'100%', margin:'0 auto', padding:'36px 40px 80px' }}>
        <header style={{ display:'flex', justifyContent:'space-between', alignItems:'end', marginBottom: 30, gap: 24 }}>
          <div>
            <div className="mono" style={{ fontSize:11, color:'var(--ink-3)', letterSpacing:'.1em', marginBottom:6 }}>
              BOARDS · {data.boards.length}
            </div>
            <h1 style={{ fontSize: 34, fontWeight: 600, letterSpacing:'-.02em', margin:0, lineHeight:1.1 }}>
              Good {greeting()}, {me.name.split(' ')[0]}.
            </h1>
            <p style={{ color:'var(--ink-3)', fontSize:14, margin:'6px 0 0' }}>
              {countOpenFor(data, me.id)} open cards · {countDueSoon(data, me.id)} due this week
            </p>
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--ink-4)' }}>{I.search}</span>
              <Input placeholder="Search boards" value={query} onChange={e=>setQuery(e.target.value)}
                style={{ paddingLeft: 32, width: 220 }} />
            </div>
            <Button variant="primary" onClick={()=>setAdding(true)}>
              {I.plus} New board
            </Button>
          </div>
        </header>

        {adding && (
          <form onSubmit={createBoard} style={{
            background:'var(--surface)', border:'1px solid var(--line-strong)', borderRadius:12,
            padding:14, marginBottom:24, display:'flex', gap:10, alignItems:'center',
            boxShadow:'var(--shadow-md)'
          }}>
            <Input autoFocus placeholder="Board title — e.g. Q3 Roadmap" value={newTitle} onChange={e=>setNewTitle(e.target.value)} />
            <Button variant="primary" type="submit">Create</Button>
            <Button type="button" variant="ghost" onClick={()=>{setAdding(false); setNewTitle('');}}>Cancel</Button>
          </form>
        )}

        {starred.length > 0 && (
          <Section title="Starred">
            <BoardGrid boards={starred} onOpen={go} />
          </Section>
        )}

        <Section title={starred.length ? 'All boards' : 'Your boards'} count={others.length}>
          <BoardGrid boards={others} onOpen={go} createCard={() => setAdding(true)} />
        </Section>

        <Section title="Recent activity">
          <ActivityFeed />
        </Section>
      </div>
    </AppShell>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'night';
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

function countOpenFor(data, userId) {
  return data.cards.filter(c => c.assignees.includes(userId)).length;
}
function countDueSoon(data, userId) {
  const weekFromNow = Date.now() + 1000*60*60*24*7;
  return data.cards.filter(c => c.assignees.includes(userId) && c.due && c.due < weekFromNow).length;
}

function Section({ title, count, children }) {
  return (
    <section style={{ marginBottom: 44 }}>
      <div style={{ display:'flex', alignItems:'baseline', gap: 10, marginBottom: 14 }}>
        <h2 style={{ fontSize: 12, fontWeight: 600, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--ink-3)', margin:0 }}>{title}</h2>
        {count != null && <span className="mono" style={{ fontSize:11, color:'var(--ink-4)' }}>{count}</span>}
        <div style={{ height:1, background:'var(--line)', flex:1 }} />
      </div>
      {children}
    </section>
  );
}

function BoardGrid({ boards, onOpen, createCard }) {
  const { state, dispatch } = useStore();
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
      {boards.map(b => {
        const cols = state.data.columns.filter(c => c.boardId===b.id);
        const cards = state.data.cards.filter(c => c.boardId===b.id);
        const members = b.memberIds.map(id => state.data.users.find(u => u.id===id)).filter(Boolean);
        return (
          <div key={b.id} onClick={()=>onOpen(b.id)} style={{
            background:'var(--surface)', border:'1px solid var(--line)', borderRadius:12,
            padding:16, cursor:'pointer', transition:'transform .12s, border-color .12s, box-shadow .12s',
            position:'relative', display:'flex', flexDirection:'column', gap:12, minHeight: 156
          }}
          onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--line-strong)'; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='var(--shadow-md)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--line)'; e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div style={{ width:30, height:30, borderRadius:8, background: b.color, boxShadow:'inset 0 0 0 1px rgba(0,0,0,.08)' }} />
              <button onClick={(e)=>{ e.stopPropagation(); dispatch({ type:'DATA', fn: M.toggleStar(b.id) }); }}
                style={{ background:'transparent', border:0, cursor:'pointer', color: b.starred ? 'var(--warn)' : 'var(--ink-4)' }}>
                {b.starred ? I.starF : I.star}
              </button>
            </div>
            <div style={{ fontSize: 15, fontWeight:600, letterSpacing:'-.01em' }}>{b.title}</div>
            <div style={{ display:'flex', gap:14, marginTop:'auto', alignItems:'center', fontSize:11.5, color:'var(--ink-3)' }}>
              <span className="mono">{cols.length} cols</span>
              <span className="mono">{cards.length} cards</span>
              <div style={{ marginLeft:'auto' }}>
                <AvatarStack users={members} size={20} max={3} />
              </div>
            </div>
          </div>
        );
      })}

      {createCard && (
        <button onClick={createCard} style={{
          background:'transparent', border:'2px dashed var(--line-strong)', borderRadius:12,
          padding:16, cursor:'pointer', color:'var(--ink-3)', fontSize:13,
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6,
          minHeight: 156
        }}>
          <span style={{ width:28, height:28, borderRadius:'50%', background:'var(--surface-2)', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
            {I.plus}
          </span>
          <span>New board</span>
        </button>
      )}
    </div>
  );
}

function ActivityFeed() {
  const { state } = useStore();
  const u = (id) => state.data.users.find(x=>x.id===id);
  const items = [
    { t: 'moved', card:'Kanban drag-drop perf on 200+ cards', who:'u_mete', from:'To do', to:'In progress', mins: 24 },
    { t: 'commented', card:'Kanban drag-drop perf on 200+ cards', who:'u_mete', mins: 180 },
    { t: 'created', card:'Activity feed sidebar', who:'u_ebru', mins: 320 },
    { t: 'completed', card:'CI for preview deploys', who:'u_mete', mins: 1440 },
  ];
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:12, overflow:'hidden' }}>
      {items.map((it, i) => {
        const who = u(it.who);
        if (!who) return null;
        return (
          <div key={i} style={{
            display:'flex', gap:12, padding:'13px 16px',
            borderTop: i ? '1px solid var(--line)' : 'none', alignItems:'center'
          }}>
            <Avatar user={who} size={28} />
            <div style={{ flex:1, fontSize:13, color:'var(--ink-2)' }}>
              <b style={{ color:'var(--ink)', fontWeight:600 }}>{who.name}</b>{' '}
              {it.t==='moved' && <>moved <i>{it.card}</i> from <span className="mono" style={{ color:'var(--ink-3)' }}>{it.from}</span> to <span className="mono" style={{ color:'var(--ink-3)' }}>{it.to}</span></>}
              {it.t==='commented' && <>commented on <i>{it.card}</i></>}
              {it.t==='created' && <>created <i>{it.card}</i></>}
              {it.t==='completed' && <>completed <i>{it.card}</i></>}
            </div>
            <span className="mono" style={{ fontSize:11, color:'var(--ink-4)' }}>{it.mins < 60 ? `${it.mins}m` : `${Math.round(it.mins/60)}h`} ago</span>
          </div>
        );
      })}
    </div>
  );
}

function TopBar({ me, right, center }) {
  const { dispatch } = useStore();
  return (
    <div style={{
      position:'sticky', top:0, zIndex:50,
      background:'color-mix(in oklab, var(--bg) 80%, transparent)',
      backdropFilter:'saturate(1.4) blur(8px)',
      borderBottom:'1px solid var(--line)',
      padding:'12px 24px', display:'flex', alignItems:'center', gap:14
    }}>
      <button onClick={()=>dispatch({ type:'SET_ROUTE', route:{ name:'dashboard' } })} style={{
        background:'transparent', border:0, cursor:'pointer', display:'flex', alignItems:'center', gap:8, padding:0, color:'inherit'
      }}>
        <Logo />
        <span style={{ fontWeight:700, fontSize:14, letterSpacing:'-.01em' }}>Flowboard</span>
      </button>

      {center}
      <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>
        {right}
        <Menu align="end" trigger={({setOpen}) => (
          <button onClick={()=>setOpen(o=>!o)} style={{ background:'transparent', border:0, cursor:'pointer', padding:4, display:'flex', alignItems:'center', gap:8 }}>
            <Avatar user={me} size={28} />
          </button>
        )}>
          <div style={{ padding:'8px 10px', borderBottom:'1px solid var(--line)', marginBottom:4 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>{me.name}</div>
            <div style={{ fontSize:11.5, color:'var(--ink-3)' }}>{me.email}</div>
          </div>
          <MenuItem onClick={()=>dispatch({ type:'SET_ROUTE', route:{ name:'settings' } })}>
            {I.gear} Settings
          </MenuItem>
          <MenuItem onClick={()=>dispatch({ type:'LOGOUT' })} danger>
            {I.logout} Sign out
          </MenuItem>
        </Menu>
      </div>
    </div>
  );
}

window.Dashboard = Dashboard;
window.TopBar = TopBar;
