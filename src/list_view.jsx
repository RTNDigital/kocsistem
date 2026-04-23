// List view — durable filtered views across boards
// Supports both system presets (mine/due/all/label/priority) AND custom user views
// saved to data.views. A view = { id, name, starred, filters: { assignees, labels, priority, status, board, due, text } }

function matchesFilters(card, f, state, meId) {
  if (!f) return true;
  if (f.assignees === 'me' && !card.assignees.includes(meId)) return false;
  if (Array.isArray(f.assignees) && f.assignees.length && !f.assignees.some(a => card.assignees.includes(a))) return false;
  if (f.labels && f.labels.length && !f.labels.some(l => card.labels.includes(l))) return false;
  if (f.priority && f.priority.length && !f.priority.includes(card.priority || 'none')) return false;
  if (f.status && f.status.length) {
    const col = state.data.columns.find(c => c.id===card.colId);
    if (!col || !f.status.includes(col.title.toLowerCase())) return false;
  }
  if (f.boards && f.boards.length && !f.boards.includes(card.boardId)) return false;
  if (f.due === 'week' && !(card.due && card.due < Date.now()+1000*60*60*24*7)) return false;
  if (f.due === 'overdue' && !(card.due && card.due < Date.now())) return false;
  if (f.due === 'any' && !card.due) return false;
  if (f.text && f.text.trim()) {
    const q = f.text.toLowerCase();
    if (!(card.title + ' ' + card.description).toLowerCase().includes(q)) return false;
  }
  return true;
}

// Build filter object from route
function filtersFromRoute(route, state) {
  if (route.filter === 'mine') return { assignees:'me' };
  if (route.filter === 'due') return { due:'week' };
  if (route.filter === 'all') return {};
  if (route.filter === 'label') return { labels:[route.labelId] };
  if (route.filter === 'priority') return { priority:[route.priority] };
  if (route.filter === 'view') {
    const v = (state.data.views||[]).find(x => x.id === route.viewId);
    return v?.filters || {};
  }
  return {};
}

function viewTitle(route, state) {
  if (route.filter === 'mine') return 'My cards';
  if (route.filter === 'due') return 'Due this week';
  if (route.filter === 'all') return 'All cards';
  if (route.filter === 'label') return '#' + (state.data.labels.find(l=>l.id===route.labelId)?.name || '');
  if (route.filter === 'priority') return `${route.priority[0].toUpperCase()+route.priority.slice(1)} priority`;
  if (route.filter === 'view') return (state.data.views||[]).find(x=>x.id===route.viewId)?.name || 'View';
  return 'Cards';
}

function ListScreen({ filter, labelId, priority, viewId }) {
  const { state, dispatch } = useStore();
  const me = state.accounts.find(a => a.id===state.session.userId);
  const route = state.route;
  const existingView = route.filter === 'view' ? (state.data.views||[]).find(v=>v.id===route.viewId) : null;

  // Seed filters from route on mount/route change
  const routeFilters = React.useMemo(() => filtersFromRoute(route, state), [route.filter, route.labelId, route.priority, route.viewId]);
  const [filters, setFilters] = React.useState(routeFilters);
  React.useEffect(() => { setFilters(routeFilters); setDirty(false); }, [route.filter, route.labelId, route.priority, route.viewId]);

  const [dirty, setDirty] = React.useState(false);
  const [openCardId, setOpenCardId] = React.useState(null);
  const [groupBy, setGroupBy] = React.useState(filter === 'label' ? 'board' : 'status');
  const [showSaveDialog, setShowSaveDialog] = React.useState(false);

  const setFilter = (patch) => { setFilters(f => ({ ...f, ...patch })); setDirty(true); };

  let cards = state.data.cards.filter(c => matchesFilters(c, filters, state, me.id));

  // Sort
  if (filters.due) cards = [...cards].sort((a,b)=>(a.due||Infinity)-(b.due||Infinity));

  const groupLabel = (c) => {
    if (groupBy==='board') return state.data.boards.find(b=>b.id===c.boardId)?.title || '—';
    if (groupBy==='status') return state.data.columns.find(co=>co.id===c.colId)?.title || '—';
    if (groupBy==='priority') return c.priority || 'none';
    if (groupBy==='assignee') {
      if (!c.assignees.length) return 'Unassigned';
      return c.assignees.map(id => state.data.users.find(u=>u.id===id)?.name).filter(Boolean).join(', ');
    }
    return '';
  };
  const groups = {};
  cards.forEach(c => { const k = groupLabel(c); (groups[k] = groups[k] || []).push(c); });

  const title = viewTitle(route, state);

  const saveView = (name) => {
    const v = { name, filters };
    const act = existingView && !dirty ? null : (existingView && dirty ? M.updateView(existingView.id, { name, filters }) : M.addView(v));
    if (act) dispatch({ type:'DATA', fn: act });
    setDirty(false);
    setShowSaveDialog(false);
  };

  const activeFilterChips = [];
  if (filters.assignees === 'me') activeFilterChips.push({ k:'assignees', label:'Assigned to me', clear: ()=>setFilter({ assignees: undefined }) });
  if (Array.isArray(filters.assignees)) filters.assignees.forEach(id => {
    const u = state.data.users.find(x=>x.id===id);
    if (u) activeFilterChips.push({ k:'assignees-'+id, label:`@${u.name}`, clear: ()=>setFilter({ assignees: filters.assignees.filter(x=>x!==id) }) });
  });
  (filters.labels||[]).forEach(id => {
    const l = state.data.labels.find(x=>x.id===id);
    if (l) activeFilterChips.push({ k:'l-'+id, label:`#${l.name}`, color: l.color, clear: ()=>setFilter({ labels: filters.labels.filter(x=>x!==id) }) });
  });
  (filters.priority||[]).forEach(p => activeFilterChips.push({ k:'p-'+p, label:`priority: ${p}`, clear: ()=>setFilter({ priority: filters.priority.filter(x=>x!==p) }) }));
  (filters.status||[]).forEach(s => activeFilterChips.push({ k:'s-'+s, label:`status: ${s}`, clear: ()=>setFilter({ status: filters.status.filter(x=>x!==s) }) }));
  (filters.boards||[]).forEach(id => {
    const b = state.data.boards.find(x=>x.id===id);
    if (b) activeFilterChips.push({ k:'b-'+id, label: b.title, color: b.color, clear: ()=>setFilter({ boards: filters.boards.filter(x=>x!==id) }) });
  });
  if (filters.due === 'week') activeFilterChips.push({ k:'due', label:'due this week', clear: ()=>setFilter({ due: undefined }) });
  if (filters.due === 'overdue') activeFilterChips.push({ k:'due', label:'overdue', clear: ()=>setFilter({ due: undefined }) });
  if (filters.due === 'any') activeFilterChips.push({ k:'due', label:'has due date', clear: ()=>setFilter({ due: undefined }) });

  return (
    <AppShell active={route.filter === 'view' ? 'list-view-'+route.viewId : 'list'}>
      <div style={{ padding:'28px 36px 12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <h1 style={{ fontSize:26, fontWeight:600, letterSpacing:'-.02em', margin:0 }}>{title}</h1>
          {existingView && (
            <button onClick={()=>dispatch({ type:'DATA', fn: M.toggleStarView(existingView.id) })}
              title={existingView.starred ? 'Unstar' : 'Star'}
              style={{ background:'transparent', border:0, cursor:'pointer', color: existingView.starred ? 'var(--warn)' : 'var(--ink-4)', padding:4 }}>
              {existingView.starred ? I.starF : I.star}
            </button>
          )}
          {dirty && <Chip>unsaved changes</Chip>}
          <span className="mono" style={{ marginLeft:'auto', fontSize:11, color:'var(--ink-4)' }}>{cards.length} cards</span>
        </div>

        {/* Filter bar */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:16, flexWrap:'wrap' }}>
          <FilterPicker filters={filters} setFilter={setFilter} state={state} me={me} />
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--ink-4)' }}>{I.search}</span>
            <Input value={filters.text||''} onChange={e=>setFilter({ text: e.target.value })}
              placeholder="Filter text…"
              style={{ paddingLeft: 32, width: 200, height: 32 }} />
          </div>

          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
            {dirty && (
              existingView
                ? <Button variant="ghost" onClick={()=>saveView(existingView.name)}>Save changes</Button>
                : <Button variant="ghost" onClick={()=>setShowSaveDialog(true)}>{I.star} Save as view</Button>
            )}
            {!dirty && existingView && (
              <Menu trigger={(p)=>(
                <button {...p} style={{ background:'transparent', border:'1px solid var(--line)', borderRadius:6, padding:'6px 8px', cursor:'pointer', color:'var(--ink-3)' }}>{I.more}</button>
              )}>
                <MenuItem onClick={()=>{
                  const n = prompt('Rename view', existingView.name);
                  if (n?.trim()) dispatch({ type:'DATA', fn: M.updateView(existingView.id, { name: n.trim() }) });
                }}>{I.edit} Rename</MenuItem>
                <MenuItem danger onClick={()=>{
                  if (confirm(`Delete "${existingView.name}"?`)) {
                    dispatch({ type:'DATA', fn: M.deleteView(existingView.id) });
                    dispatch({ type:'SET_ROUTE', route:{ name:'views' } });
                  }
                }}>{I.trash} Delete view</MenuItem>
              </Menu>
            )}
            <span style={{ fontSize:12, color:'var(--ink-3)' }}>Group</span>
            <div style={{ display:'inline-flex', background:'var(--surface-2)', borderRadius:8, padding:2 }}>
              {['status','board','priority','assignee'].map(g => (
                <button key={g} onClick={()=>setGroupBy(g)} style={{
                  border:0, cursor:'pointer', padding:'4px 8px', borderRadius:6,
                  background: groupBy===g ? 'var(--surface)' : 'transparent',
                  boxShadow: groupBy===g ? 'var(--shadow-sm)' : 'none',
                  fontSize:11.5, color: groupBy===g ? 'var(--ink)' : 'var(--ink-3)'
                }}>{g}</button>
              ))}
            </div>
          </div>
        </div>

        {activeFilterChips.length > 0 && (
          <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
            {activeFilterChips.map(c => (
              <span key={c.k} style={{
                display:'inline-flex', alignItems:'center', gap:6, padding:'3px 6px 3px 8px',
                fontSize:11.5, background:'var(--surface-2)', border:'1px solid var(--line)',
                borderRadius:6, color:'var(--ink-2)'
              }}>
                {c.color && <span style={{ width:8, height:8, borderRadius:2, background:c.color }} />}
                {c.label}
                <button onClick={c.clear} style={{ background:'transparent', border:0, cursor:'pointer', color:'var(--ink-4)', padding:0, display:'flex' }}>{I.x}</button>
              </span>
            ))}
            <button onClick={()=>{ setFilters({}); setDirty(true); }} style={{
              background:'transparent', border:0, cursor:'pointer',
              fontSize:11.5, color:'var(--ink-3)', padding:'3px 6px', textDecoration:'underline'
            }}>Clear all</button>
          </div>
        )}
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'10px 36px 60px' }}>
        {cards.length === 0 ? (
          <EmptyList title={title} />
        ) : (
          Object.entries(groups).map(([gname, list]) => (
            <div key={gname} style={{ marginTop:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 4px', borderBottom:'1px solid var(--line)' }}>
                <span style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--ink-2)' }}>{gname}</span>
                <span className="mono" style={{ fontSize:11, color:'var(--ink-4)' }}>{list.length}</span>
              </div>
              <div>
                {list.map(c => (
                  <ListRow key={c.id} card={c} state={state} onOpen={()=>setOpenCardId(c.id)} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {showSaveDialog && <SaveViewDialog onSave={saveView} onCancel={()=>setShowSaveDialog(false)} />}
      {openCardId && <CardModal cardId={openCardId} onClose={()=>setOpenCardId(null)} />}
    </AppShell>
  );
}

// Multi-select filter dropdown
function FilterPicker({ filters, setFilter, state, me }) {
  const toggleInArray = (key, val) => {
    const arr = filters[key] || [];
    const next = arr.includes(val) ? arr.filter(x=>x!==val) : [...arr, val];
    setFilter({ [key]: next.length ? next : undefined });
  };
  return (
    <Menu trigger={(p)=>(
      <button {...p} style={{
        background:'var(--surface)', border:'1px dashed var(--line-strong)', borderRadius:8,
        padding:'6px 10px', cursor:'pointer', fontSize:12.5, color:'var(--ink-2)',
        display:'inline-flex', alignItems:'center', gap:6
      }}>{I.plus} Add filter</button>
    )} width={240}>
      <div style={{ padding:'6px 10px', fontSize:10.5, fontWeight:600, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--ink-4)' }}>Quick</div>
      <MenuItem onClick={()=>setFilter({ assignees: filters.assignees==='me' ? undefined : 'me' })}>
        <span style={{ color: filters.assignees==='me' ? 'var(--accent)' : 'transparent' }}>{I.check}</span> Assigned to me
      </MenuItem>
      <MenuItem onClick={()=>setFilter({ due: filters.due==='week' ? undefined : 'week' })}>
        <span style={{ color: filters.due==='week' ? 'var(--accent)' : 'transparent' }}>{I.check}</span> Due this week
      </MenuItem>
      <MenuItem onClick={()=>setFilter({ due: filters.due==='overdue' ? undefined : 'overdue' })}>
        <span style={{ color: filters.due==='overdue' ? 'var(--accent)' : 'transparent' }}>{I.check}</span> Overdue
      </MenuItem>

      <div style={{ height:1, background:'var(--line)', margin:'4px 0' }} />
      <div style={{ padding:'6px 10px', fontSize:10.5, fontWeight:600, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--ink-4)' }}>Priority</div>
      {['high','med','low','none'].map(p => (
        <MenuItem key={p} onClick={()=>toggleInArray('priority', p)}>
          <span style={{ color: (filters.priority||[]).includes(p) ? 'var(--accent)' : 'transparent' }}>{I.check}</span>
          {p}
        </MenuItem>
      ))}

      <div style={{ height:1, background:'var(--line)', margin:'4px 0' }} />
      <div style={{ padding:'6px 10px', fontSize:10.5, fontWeight:600, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--ink-4)' }}>Labels</div>
      {state.data.labels.map(l => (
        <MenuItem key={l.id} onClick={()=>toggleInArray('labels', l.id)}>
          <span style={{ color: (filters.labels||[]).includes(l.id) ? 'var(--accent)' : 'transparent' }}>{I.check}</span>
          <span style={{ width:8, height:8, borderRadius:2, background:l.color }} />
          {l.name}
        </MenuItem>
      ))}

      <div style={{ height:1, background:'var(--line)', margin:'4px 0' }} />
      <div style={{ padding:'6px 10px', fontSize:10.5, fontWeight:600, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--ink-4)' }}>Boards</div>
      {state.data.boards.map(b => (
        <MenuItem key={b.id} onClick={()=>toggleInArray('boards', b.id)}>
          <span style={{ color: (filters.boards||[]).includes(b.id) ? 'var(--accent)' : 'transparent' }}>{I.check}</span>
          <span style={{ width:8, height:8, borderRadius:2, background:b.color }} />
          {b.title}
        </MenuItem>
      ))}
    </Menu>
  );
}

function SaveViewDialog({ onSave, onCancel }) {
  const [name, setName] = React.useState('');
  const inputRef = React.useRef(null);
  React.useEffect(()=>{ setTimeout(()=>inputRef.current?.focus(), 20); }, []);
  return (
    <div onClick={onCancel} style={{
      position:'fixed', inset:0, background:'rgba(20,20,19,.4)', zIndex:160,
      display:'flex', alignItems:'center', justifyContent:'center'
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'var(--surface)', border:'1px solid var(--line-strong)',
        borderRadius:12, padding:22, width:400, boxShadow:'var(--shadow-lg)'
      }}>
        <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>Save view</div>
        <div style={{ fontSize:12.5, color:'var(--ink-3)', marginBottom:14 }}>
          Give this filter combination a name. It will appear in your sidebar.
        </div>
        <Input ref={inputRef} value={name} onChange={e=>setName(e.target.value)}
          placeholder="e.g. High priority bugs"
          onKeyDown={e=>{ if (e.key==='Enter' && name.trim()) onSave(name.trim()); if (e.key==='Escape') onCancel(); }}
          style={{ width:'100%' }} />
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:16 }}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button onClick={()=>name.trim() && onSave(name.trim())} disabled={!name.trim()}>Save view</Button>
        </div>
      </div>
    </div>
  );
}

function ListRow({ card, state, onOpen }) {
  const b = state.data.boards.find(x => x.id===card.boardId);
  const col = state.data.columns.find(x => x.id===card.colId);
  const assignees = card.assignees.map(id => state.data.users.find(u=>u.id===id)).filter(Boolean);
  const cardLabels = card.labels.map(id => state.data.labels.find(l=>l.id===id)).filter(Boolean);
  const due = dueState(card.due);
  const doneCt = card.checklist.filter(c=>c.done).length;
  const priColor = card.priority==='high' ? 'var(--err)' : card.priority==='med' ? 'var(--warn)' : card.priority==='low' ? 'var(--ok)' : null;
  return (
    <button onClick={onOpen} style={{
      display:'flex', alignItems:'center', gap:10, width:'100%', textAlign:'left',
      padding:'9px 4px', border:0, borderBottom:'1px solid var(--line)',
      background:'transparent', cursor:'pointer', color:'var(--ink)'
    }}
      onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
      {priColor ? <span title={card.priority} style={{ width:8, height:8, borderRadius:'50%', background: priColor, flexShrink:0 }} />
        : <span style={{ width:8, height:8, border:'1.5px solid var(--line-strong)', borderRadius:'50%', flexShrink:0 }} />}
      <span className="mono" style={{ fontSize:11, color:'var(--ink-4)', width: 90, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {b?.title?.slice(0,12).toUpperCase()}
      </span>
      <span style={{ flex:1, fontSize:13.5, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{card.title}</span>
      <div style={{ display:'flex', gap:4, flexShrink:0 }}>
        {cardLabels.slice(0,3).map(l => <span key={l.id} title={l.name} style={{ height:4, width:18, borderRadius:2, background:l.color }} />)}
      </div>
      <span className="mono" style={{ fontSize:11, color:'var(--ink-4)', width: 90, textAlign:'right', flexShrink:0 }}>{col?.title}</span>
      {card.checklist.length > 0 && (
        <span className="mono" style={{ fontSize:11, color: doneCt===card.checklist.length ? 'var(--ok)' : 'var(--ink-4)', width:40, textAlign:'right', flexShrink:0 }}>
          {doneCt}/{card.checklist.length}
        </span>
      )}
      <span className="mono" style={{ fontSize:11, color: due==='overdue' ? 'var(--err)' : due==='soon' ? 'var(--warn)' : 'var(--ink-4)', width: 72, textAlign:'right', flexShrink:0 }}>
        {card.due ? fmtDate(card.due) : '—'}
      </span>
      <div style={{ width: 70, display:'flex', justifyContent:'flex-end', flexShrink:0 }}>
        {assignees.length > 0 && <AvatarStack users={assignees} size={20} max={3} />}
      </div>
    </button>
  );
}

function EmptyList({ title }) {
  return (
    <div style={{
      margin:'40px auto', maxWidth: 420, padding:'40px 32px',
      textAlign:'center', background:'var(--surface)',
      border:'1px dashed var(--line-strong)', borderRadius:14, color:'var(--ink-3)'
    }}>
      <div style={{ width:44, height:44, margin:'0 auto 14px', borderRadius:10, background:'var(--surface-2)', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'var(--ink-4)' }}>
        {I.check}
      </div>
      <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)', marginBottom:4 }}>Nothing here</div>
      <div style={{ fontSize:13 }}>Nothing matches these filters.</div>
    </div>
  );
}

// Views screen — system presets + user's saved views
function ViewsScreen() {
  const { state, dispatch } = useStore();
  const me = state.accounts.find(a => a.id===state.session.userId);
  const yours = state.data.views || [];

  const systemViews = [
    { id:'sys-mine', name:'My cards', desc:'Assigned to me', icon: I.list, route:{ name:'list', filter:'mine' },
      count: state.data.cards.filter(c=>c.assignees.includes(me.id)).length },
    { id:'sys-due', name:'Due this week', desc:'Next 7 days', icon: I.clock, route:{ name:'list', filter:'due' },
      count: state.data.cards.filter(c=>c.due && c.due < Date.now()+1000*60*60*24*7).length },
    { id:'sys-hi', name:'High priority', desc:'Everything marked high', icon: I.zap, route:{ name:'list', filter:'priority', priority:'high' },
      count: state.data.cards.filter(c=>c.priority==='high').length },
    { id:'sys-all', name:'All cards', desc:'Everything in workspace', icon: I.grid, route:{ name:'list', filter:'all' },
      count: state.data.cards.length },
  ];

  const countForView = (v) => state.data.cards.filter(c => matchesFilters(c, v.filters, state, me.id)).length;

  const Card = ({ v, onClick, trailing }) => (
    <div style={{
      background:'var(--surface)', border:'1px solid var(--line)', borderRadius:12, padding:16,
      display:'flex', flexDirection:'column', gap:10, minHeight: 120, position:'relative',
      transition:'border-color .12s, transform .12s'
    }}
      onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--line-strong)'; e.currentTarget.style.transform='translateY(-2px)'; }}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--line)'; e.currentTarget.style.transform=''; }}>
      <button onClick={onClick} style={{ position:'absolute', inset:0, background:'transparent', border:0, cursor:'pointer' }} aria-label={v.name} />
      <div style={{ display:'flex', alignItems:'center', gap:8, position:'relative', pointerEvents:'none' }}>
        {v.color ? <span style={{ width:10, height:10, borderRadius:3, background:v.color }} /> :
          <span style={{ color:'var(--ink-3)' }}>{v.icon}</span>}
        <span className="mono" style={{ marginLeft:'auto', fontSize:11, color:'var(--ink-4)' }}>{v.count}</span>
      </div>
      <div style={{ fontSize:14.5, fontWeight:600, letterSpacing:'-.005em', pointerEvents:'none' }}>{v.name}</div>
      <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:'auto', pointerEvents:'none' }}>{v.desc}</div>
      {trailing}
    </div>
  );

  return (
    <AppShell active="views">
      <div style={{ padding:'28px 36px 60px', maxWidth: 1200 }}>
        <h1 style={{ fontSize:26, fontWeight:600, letterSpacing:'-.02em', margin:'0 0 4px' }}>Views</h1>
        <p style={{ fontSize:13, color:'var(--ink-3)', margin:'0 0 26px' }}>
          Saved filters that cut across every board. Open any list, apply filters, then <b>Save as view</b> to keep it.
        </p>

        <SectionLabel>Your views <span className="mono" style={{ color:'var(--ink-4)', marginLeft:6 }}>{yours.length}</span></SectionLabel>
        {yours.length === 0 ? (
          <div style={{
            padding:'32px 20px', textAlign:'center', background:'var(--surface)',
            border:'1px dashed var(--line-strong)', borderRadius:12, color:'var(--ink-3)', fontSize:13,
            marginBottom: 28
          }}>
            No custom views yet. Open a list, stack filters, then <b>Save as view</b>.
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:12, marginBottom:28 }}>
            {yours.map(v => {
              const viewObj = {
                ...v,
                icon: I.filter,
                desc: describeFilters(v.filters, state) || 'No filters',
                count: countForView(v),
              };
              return (
                <Card key={v.id} v={viewObj}
                  onClick={()=>dispatch({ type:'SET_ROUTE', route:{ name:'list', filter:'view', viewId: v.id } })}
                  trailing={
                    <div style={{ position:'absolute', top:10, right:38, display:'flex', gap:2 }}>
                      <button title={v.starred?'Unstar':'Star'} onClick={(e)=>{ e.stopPropagation(); dispatch({ type:'DATA', fn: M.toggleStarView(v.id) }); }}
                        style={{ background:'transparent', border:0, cursor:'pointer', color: v.starred ? 'var(--warn)' : 'var(--ink-4)', padding:4 }}>
                        {v.starred ? I.starF : I.star}
                      </button>
                    </div>
                  } />
              );
            })}
          </div>
        )}

        <SectionLabel>System views</SectionLabel>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:12, marginBottom:28 }}>
          {systemViews.map(v => (
            <Card key={v.id} v={v} onClick={()=>dispatch({ type:'SET_ROUTE', route: v.route })} />
          ))}
        </div>

        <SectionLabel>By label</SectionLabel>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:12 }}>
          {state.data.labels.map(l => {
            const v = {
              name: `#${l.name}`, desc: `Cards with label ${l.name}`, color: l.color,
              count: state.data.cards.filter(c=>c.labels.includes(l.id)).length,
            };
            return <Card key={l.id} v={v} onClick={()=>dispatch({ type:'SET_ROUTE', route:{ name:'list', filter:'label', labelId: l.id } })} />;
          })}
        </div>
      </div>
    </AppShell>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, margin:'8px 0 12px',
      fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--ink-2)' }}>
      {children}
    </div>
  );
}

// Human-readable summary of a filter object
function describeFilters(f, state) {
  if (!f) return '';
  const parts = [];
  if (f.assignees === 'me') parts.push('assigned to me');
  if (Array.isArray(f.assignees)) parts.push(`${f.assignees.length} assignee${f.assignees.length>1?'s':''}`);
  if (f.labels?.length) parts.push(`${f.labels.length} label${f.labels.length>1?'s':''}`);
  if (f.priority?.length) parts.push(`priority: ${f.priority.join('/')}`);
  if (f.status?.length) parts.push(`status: ${f.status.join('/')}`);
  if (f.boards?.length) parts.push(`${f.boards.length} board${f.boards.length>1?'s':''}`);
  if (f.due === 'week') parts.push('due ≤7d');
  if (f.due === 'overdue') parts.push('overdue');
  if (f.text) parts.push(`"${f.text}"`);
  return parts.join(' · ');
}

window.ListScreen = ListScreen;
window.ViewsScreen = ViewsScreen;
