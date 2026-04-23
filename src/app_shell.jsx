// App shell with persistent Linear-style sidebar

function AppShell({ children, active }) {
  const { state, dispatch } = useStore();
  const me = state.accounts.find(a => a.id === state.session.userId);
  const ui = React.useContext(UICtx);
  const [collapsed, setCollapsed] = React.useState(false);
  const [openTeams, setOpenTeams] = React.useState({ 'team-product': true, 'team-personal': true });

  // Keyboard: cmd/ctrl K opens command palette (stub), b toggles sidebar
  React.useEffect(() => {
    const h = (e) => {
      const t = (e.target.tagName||'').toLowerCase();
      if (t==='input'||t==='textarea') return;
      if ((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='b') { e.preventDefault(); setCollapsed(c=>!c); }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  const go = (route) => dispatch({ type:'SET_ROUTE', route });

  // Group boards into two synthetic "teams" for structure
  const productBoards = state.data.boards.filter(b => b.memberIds.length > 1);
  const personalBoards = state.data.boards.filter(b => b.memberIds.length === 1);
  const starred = state.data.boards.filter(b => b.starred);
  const starredViews = (state.data.views||[]).filter(v => v.starred);

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)' }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 0 : 244, flexShrink:0,
        borderRight:'1px solid var(--line)', background:'color-mix(in oklab, var(--surface-2) 55%, var(--bg))',
        transition:'width .18s', overflow:'hidden',
        display:'flex', flexDirection:'column',
        position:'sticky', top:0, height:'100vh'
      }}>
        <div style={{ minWidth: 244, display:'flex', flexDirection:'column', height:'100%' }}>
          {/* Workspace header */}
          <div style={{ padding:'12px 10px 10px', borderBottom:'1px solid var(--line)' }}>
            <Menu trigger={({setOpen}) => (
              <button onClick={()=>setOpen(o=>!o)} style={{
                display:'flex', alignItems:'center', gap:8, width:'100%',
                padding:'6px 8px', background:'transparent', border:0, borderRadius:7, cursor:'pointer',
                color:'var(--ink)', textAlign:'left'
              }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <span style={{ width:22, height:22, borderRadius:5, background:'var(--ink)', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:700 }}>F</span>
                <span style={{ fontSize:13, fontWeight:600, letterSpacing:'-.01em' }}>{me.name.split(' ')[0]}'s workspace</span>
                <span style={{ marginLeft:'auto', color:'var(--ink-4)' }}>{I.chev}</span>
              </button>
            )}>
              <div style={{ padding:'6px 10px', fontSize:11, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'.08em', fontWeight:600 }}>Workspaces</div>
              <MenuItem>
                <span style={{ width:16, height:16, borderRadius:4, background:'var(--ink)', color:'#fff', fontSize:10, fontWeight:700, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>F</span>
                {me.name.split(' ')[0]}'s workspace
                <span style={{ marginLeft:'auto', color:'var(--accent)' }}>{I.check}</span>
              </MenuItem>
              <div style={{ height:1, background:'var(--line)', margin:'4px 0' }} />
              <MenuItem onClick={()=>go({ name:'settings' })}>{I.gear} Settings</MenuItem>
              <MenuItem onClick={()=>dispatch({ type:'LOGOUT' })} danger>{I.logout} Sign out</MenuItem>
            </Menu>

            {/* Quick actions row */}
            <div style={{ display:'flex', gap:4, marginTop:6 }}>
              <QuickBtn icon={I.search} label="Search" kbd="⌘K" onClick={()=>ui.openCmdK()} />
              <QuickBtn icon={I.msg} label="Inbox" kbd="I" onClick={()=>ui.openInbox()} />
            </div>
          </div>

          {/* Scrollable nav */}
          <nav style={{ flex:1, overflowY:'auto', padding:'10px 8px', fontSize:13 }}>
            <NavItem icon={I.grid} label="Boards" active={active==='dashboard'} onClick={()=>go({ name:'dashboard' })} />
            <NavItem icon={I.list} label="My cards"
              count={state.data.cards.filter(c=>c.assignees.includes(me.id)).length}
              active={active==='list' && state.route.filter==='mine'}
              onClick={()=>go({ name:'list', filter:'mine' })} />
            <NavItem icon={I.clock} label="Due this week"
              count={state.data.cards.filter(c=>c.due && c.due < Date.now()+1000*60*60*24*7).length}
              active={active==='list' && state.route.filter==='due'}
              onClick={()=>go({ name:'list', filter:'due' })} />
            <NavItem icon={I.filter} label="All cards"
              count={state.data.cards.length}
              active={active==='list' && state.route.filter==='all'}
              onClick={()=>go({ name:'list', filter:'all' })} />
            <NavItem icon={I.star} label="Views"
              active={active==='views'}
              onClick={()=>go({ name:'views' })} />

            {(starred.length > 0 || starredViews.length > 0) && (
              <NavSection label="Favorites">
                {starred.map(b => (
                  <NavItem key={b.id} icon={<Swatch color={b.color} />} label={b.title}
                    active={active==='board' && state.route.boardId===b.id}
                    onClick={()=>go({ name:'board', boardId: b.id })}
                  />
                ))}
                {starredViews.map(v => (
                  <NavItem key={v.id} icon={I.filter} label={v.name}
                    active={state.route.name==='list' && state.route.filter==='view' && state.route.viewId===v.id}
                    onClick={()=>go({ name:'list', filter:'view', viewId: v.id })}
                  />
                ))}
              </NavSection>
            )}

            <NavSection label="Teams">
              <TeamGroup
                id="team-product" open={openTeams['team-product']} onToggle={()=>setOpenTeams(s=>({ ...s, 'team-product': !s['team-product'] }))}
                letter="P" name="Product"
                boards={productBoards}
                activeBoardId={active==='board' ? state.route.boardId : null}
                onGo={(id)=>go({ name:'board', boardId: id })}
              />
              <TeamGroup
                id="team-personal" open={openTeams['team-personal']} onToggle={()=>setOpenTeams(s=>({ ...s, 'team-personal': !s['team-personal'] }))}
                letter="Y" name="You"
                boards={personalBoards}
                activeBoardId={active==='board' ? state.route.boardId : null}
                onGo={(id)=>go({ name:'board', boardId: id })}
              />
            </NavSection>

            <NavSection label="Labels">
              {state.data.labels.map(l => (
                <NavItem key={l.id} icon={<span style={{ width:10, height:10, borderRadius:3, background:l.color, display:'inline-block' }} />} label={l.name}
                  count={state.data.cards.filter(c=>c.labels.includes(l.id)).length}
                  active={active==='list' && state.route.filter==='label' && state.route.labelId===l.id}
                  onClick={()=>go({ name:'list', filter:'label', labelId: l.id })} />
              ))}
            </NavSection>
          </nav>

          {/* Bottom footer */}
          <div style={{ borderTop:'1px solid var(--line)', padding:'10px', display:'flex', alignItems:'center', gap:8 }}>
            <Avatar user={me} size={24} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12.5, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{me.name}</div>
              <div style={{ fontSize:11, color:'var(--ink-4)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{me.email}</div>
            </div>
            <button onClick={()=>go({ name:'settings' })} style={{ background:'transparent', border:0, padding:4, color:'var(--ink-3)', cursor:'pointer', borderRadius:5 }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{I.gear}</button>
          </div>
        </div>
      </aside>

      {/* Collapse rail (always visible) */}
      <button onClick={()=>setCollapsed(c=>!c)} title="Toggle sidebar (⌘B)" style={{
        position:'absolute', left: collapsed ? 8 : 228, top: 14, zIndex: 60,
        width: 24, height: 24, borderRadius:6,
        background: collapsed ? 'var(--surface)' : 'transparent',
        border: collapsed ? '1px solid var(--line)' : '1px solid transparent',
        color:'var(--ink-4)', cursor:'pointer', padding:0,
        display:'flex', alignItems:'center', justifyContent:'center',
        transition:'left .18s, background .12s'
      }}
        onMouseEnter={e=>{ e.currentTarget.style.background='var(--surface-2)'; e.currentTarget.style.color='var(--ink-2)'; }}
        onMouseLeave={e=>{ e.currentTarget.style.background=collapsed?'var(--surface)':'transparent'; e.currentTarget.style.color='var(--ink-4)'; }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {collapsed ? <path d="M9 6l6 6-6 6"/> : <path d="M15 6l-6 6 6 6"/>}
        </svg>
      </button>

      {/* Content */}
      <main style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
        {children}
      </main>
    </div>
  );
}

function QuickBtn({ icon, label, kbd, onClick }) {
  return (
    <button onClick={onClick} title={label} style={{
      flex:1, display:'flex', alignItems:'center', gap:6,
      padding:'6px 8px', borderRadius:6, border:'1px solid var(--line)',
      background:'var(--surface)', color:'var(--ink-3)', fontSize:12, cursor:'pointer'
    }}
      onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
      onMouseLeave={e=>e.currentTarget.style.background='var(--surface)'}>
      <span>{icon}</span>
      <span style={{ flex:1, textAlign:'left' }}>{label}</span>
      <span className="kbd" style={{ padding:'1px 4px' }}>{kbd}</span>
    </button>
  );
}

function NavItem({ icon, label, count, active, onClick, indent=0 }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:8, width:'100%',
      padding:`5px ${8 + indent}px 5px ${8 + indent}px`, borderRadius:6, border:0,
      background: active ? 'color-mix(in oklab, var(--accent) 14%, transparent)' : 'transparent',
      color: active ? 'var(--ink)' : 'var(--ink-2)',
      fontSize:12.5, cursor:'pointer', textAlign:'left',
      fontWeight: active ? 500 : 400,
      marginBottom: 1
    }}
      onMouseEnter={e=>{ if (!active) e.currentTarget.style.background='var(--surface-2)'; }}
      onMouseLeave={e=>{ if (!active) e.currentTarget.style.background='transparent'; }}>
      <span style={{ display:'inline-flex', width:16, justifyContent:'center', color: active ? 'var(--accent)' : 'var(--ink-4)', flexShrink:0 }}>{icon}</span>
      <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</span>
      {count != null && <span className="mono" style={{ fontSize:11, color:'var(--ink-4)' }}>{count}</span>}
    </button>
  );
}

function NavSection({ label, children }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ padding:'4px 10px 4px', fontSize:10.5, fontWeight:600, color:'var(--ink-4)', textTransform:'uppercase', letterSpacing:'.1em' }}>{label}</div>
      {children}
    </div>
  );
}

function Swatch({ color }) {
  return <span style={{ width:10, height:10, borderRadius:3, background:color, display:'inline-block' }} />;
}

function TeamGroup({ id, open, onToggle, letter, name, boards, activeBoardId, onGo }) {
  return (
    <div>
      <button onClick={onToggle} style={{
        display:'flex', alignItems:'center', gap:8, width:'100%',
        padding:'5px 8px', borderRadius:6, border:0, background:'transparent',
        color:'var(--ink-2)', fontSize:12.5, cursor:'pointer', textAlign:'left', marginBottom:1
      }}
        onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
        <span style={{ color:'var(--ink-4)', width:10, display:'inline-flex', transform: open ? 'rotate(0)' : 'rotate(-90deg)', transition:'transform .12s' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
        </span>
        <span style={{ width:18, height:18, borderRadius:4, background:'var(--ink-2)', color:'var(--surface)', fontSize:10, fontWeight:700, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>{letter}</span>
        <span style={{ flex:1, fontWeight:500 }}>{name}</span>
      </button>
      {open && (
        <div style={{ paddingLeft: 18 }}>
          {boards.map(b => (
            <NavItem key={b.id} indent={0} icon={<Swatch color={b.color} />} label={b.title}
              active={activeBoardId===b.id}
              onClick={()=>onGo(b.id)} />
          ))}
          <button style={{
            display:'flex', alignItems:'center', gap:8, padding:'5px 8px',
            fontSize:11.5, color:'var(--ink-4)', background:'transparent', border:0, cursor:'pointer', width:'100%', textAlign:'left', borderRadius:6
          }}
            onMouseEnter={e=>{ e.currentTarget.style.color='var(--ink-2)'; e.currentTarget.style.background='var(--surface-2)'; }}
            onMouseLeave={e=>{ e.currentTarget.style.color='var(--ink-4)'; e.currentTarget.style.background='transparent'; }}>
            <span style={{ width:10, display:'inline-block' }}/>
            {I.plus} New board
          </button>
        </div>
      )}
    </div>
  );
}

window.AppShell = AppShell;
