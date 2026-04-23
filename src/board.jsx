// Kanban board with drag-drop

function BoardScreen({ boardId }) {
  const { state, dispatch } = useStore();
  const board = state.data.boards.find(b => b.id===boardId);
  const me = state.accounts.find(a => a.id === state.session.userId);
  const [query, setQuery] = React.useState('');
  const [labelFilters, setLabelFilters] = React.useState([]);
  const [openCardId, setOpenCardId] = React.useState(null);

  if (!board) return <div style={{ padding:40 }}>Board not found. <a href="#" onClick={e=>{e.preventDefault(); dispatch({ type:'SET_ROUTE', route:{ name:'dashboard' } });}}>Back</a></div>;

  const columns = state.data.columns.filter(c => c.boardId===boardId).sort((a,b)=>a.order-b.order);
  const cards = state.data.cards.filter(c => c.boardId===boardId);
  const members = board.memberIds.map(id => state.data.users.find(u => u.id===id)).filter(Boolean);

  // Keyboard shortcuts
  React.useEffect(() => {
    const h = (e) => {
      if (openCardId) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag==='input'||tag==='textarea') return;
      if (e.key === '/') { e.preventDefault(); document.getElementById('board-search')?.focus(); }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        const firstCol = columns[0];
        if (firstCol) document.querySelector(`[data-add-card="${firstCol.id}"]`)?.click();
      }
      if (e.key === 'Escape') setOpenCardId(null);
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [openCardId, columns]);

  const filteredCards = cards.filter(c => {
    if (query && !(c.title + ' ' + c.description).toLowerCase().includes(query.toLowerCase())) return false;
    if (labelFilters.length && !c.labels.some(l => labelFilters.includes(l))) return false;
    return true;
  });

  const onCardDrop = (cardId, toColId, toIndex) => {
    dispatch({ type:'DATA', fn: M.moveCard(cardId, toColId, toIndex) });
  };

  return (
    <AppShell active="board">
      <div style={{
        display:'flex', alignItems:'center', gap:10, padding:'12px 20px 12px 44px',
        borderBottom:'1px solid var(--line)',
        background: 'linear-gradient(180deg, color-mix(in oklab, '+board.color+' 8%, var(--bg)), var(--bg))'
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
          <div style={{ width:18, height:18, borderRadius:5, background: board.color, flexShrink:0 }} />
          <InlineEdit value={board.title}
            onCommit={(v)=>dispatch({ type:'DATA', fn: M.renameBoard(boardId, v) })}
            render={(v)=> <span style={{ fontSize:15, fontWeight:600, letterSpacing:'-.01em' }}>{v}</span>}
            inputStyle={{ fontSize:15, fontWeight:600 }}
          />
          <button onClick={()=>dispatch({ type:'DATA', fn: M.toggleStar(boardId) })}
            style={{ background:'transparent', border:0, cursor:'pointer', color: board.starred ? 'var(--warn)' : 'var(--ink-4)', padding:2 }}>
            {board.starred ? I.starF : I.star}
          </button>
        </div>
        <AvatarStack users={members} size={24} max={4} />
        <Button size="sm"><span style={{ color:'var(--ink-3)' }}>{I.plus}</span>Invite</Button>
      </div>

      <div style={{
        display:'flex', alignItems:'center', gap:10, padding:'10px 20px',
        borderBottom:'1px solid var(--line)', background:'var(--bg)'
      }}>
        <div style={{ position:'relative' }}>
          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--ink-4)' }}>{I.search}</span>
          <Input id="board-search" placeholder="Search cards  /" value={query} onChange={e=>setQuery(e.target.value)}
            style={{ paddingLeft: 32, width: 240, paddingRight: 50 }} />
        </div>
        <LabelFilter labels={state.data.labels} value={labelFilters} onChange={setLabelFilters} />

        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:14, fontSize:12, color:'var(--ink-3)' }}>
          <span><span className="kbd">N</span>  new card</span>
          <span><span className="kbd">/</span>  search</span>
          <span><span className="kbd">Esc</span>  close</span>
        </div>
      </div>

      {/* Board */}
      <div style={{ flex:1, overflowX:'auto', overflowY:'hidden' }}>
        <div style={{ display:'flex', gap:'var(--col-gap)', padding:'18px 24px 40px', alignItems:'flex-start', minHeight:'calc(100vh - 180px)' }}>
          {columns.map(col => (
            <Column
              key={col.id} col={col}
              cards={filteredCards.filter(c=>c.colId===col.id).sort((a,b)=>a.order-b.order)}
              users={state.data.users}
              labels={state.data.labels}
              onOpenCard={setOpenCardId}
              onCardDrop={onCardDrop}
            />
          ))}
          <AddColumn boardId={boardId} />
        </div>
      </div>

      {openCardId && <CardModal cardId={openCardId} onClose={()=>setOpenCardId(null)} />}
    </AppShell>
  );
}

function LabelFilter({ labels, value, onChange }) {
  return (
    <Menu trigger={({setOpen}) => (
      <Button size="sm" variant="default" onClick={()=>setOpen(o=>!o)}>
        <span style={{ color:'var(--ink-3)' }}>{I.filter}</span>
        Labels {value.length > 0 && <span className="mono" style={{ color:'var(--accent)' }}>({value.length})</span>}
      </Button>
    )}>
      <div style={{ padding:'4px 4px', minWidth: 180 }}>
        {labels.map(l => {
          const on = value.includes(l.id);
          return (
            <button key={l.id} onClick={(e)=>{ e.stopPropagation(); onChange(on ? value.filter(x=>x!==l.id) : [...value, l.id]); }}
              style={{
                display:'flex', alignItems:'center', gap:8, width:'100%', textAlign:'left',
                padding:'6px 8px', borderRadius:6, border:0, background: on?'var(--surface-2)':'transparent',
                fontSize:13, cursor:'pointer'
              }}>
              <span style={{ width:10, height:10, borderRadius:3, background:l.color }} />
              <span style={{ flex:1 }}>{l.name}</span>
              {on && <span style={{ color:'var(--accent)' }}>{I.check}</span>}
            </button>
          );
        })}
        {value.length > 0 && (
          <>
            <div style={{ height:1, background:'var(--line)', margin:'4px 0' }} />
            <MenuItem onClick={()=>onChange([])}>Clear filters</MenuItem>
          </>
        )}
      </div>
    </Menu>
  );
}

function Column({ col, cards, users, labels, onOpenCard, onCardDrop }) {
  const { dispatch } = useStore();
  const [adding, setAdding] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState('');
  const [dragOverIdx, setDragOverIdx] = React.useState(null);
  const wipOver = col.wip > 0 && cards.length > col.wip;

  const onDragOver = (e, idx) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };
  const onDrop = (e, idx) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/card-id');
    if (cardId) onCardDrop(cardId, col.id, idx);
    setDragOverIdx(null);
  };

  const addCard = (e) => {
    e?.preventDefault?.();
    if (!newTitle.trim()) { setAdding(false); return; }
    dispatch({ type:'DATA', fn: M.addCard(col.boardId, col.id, newTitle.trim()) });
    setNewTitle('');
  };

  return (
    <div style={{
      width: 280, flexShrink: 0, background:'var(--surface-2)',
      borderRadius: 12, border:'1px solid var(--line)',
      display:'flex', flexDirection:'column', maxHeight:'calc(100vh - 160px)'
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px 8px' }}>
        <InlineEdit value={col.title}
          onCommit={(v)=>dispatch({ type:'DATA', fn: M.renameColumn(col.id, v) })}
          render={v => <span style={{ fontWeight:600, fontSize:13, letterSpacing:'-.005em' }}>{v}</span>}
          inputStyle={{ fontWeight:600, fontSize:13 }}
        />
        <span className="mono" style={{ fontSize:11, color:'var(--ink-4)' }}>{cards.length}{col.wip>0 && <>/{col.wip}</>}</span>
        {wipOver && <Chip color="var(--err)" style={{ marginLeft: 'auto' }}>WIP</Chip>}
        <Menu align="end" trigger={({setOpen}) => (
          <button onClick={()=>setOpen(o=>!o)} style={{ marginLeft: wipOver ? 0 : 'auto', background:'transparent', border:0, padding:4, cursor:'pointer', color:'var(--ink-4)' }}>{I.more}</button>
        )}>
          <MenuItem onClick={()=>{
            const v = prompt('WIP limit (0 for none)', String(col.wip||0));
            if (v != null) dispatch({ type:'DATA', fn: M.setColumnWip(col.id, Math.max(0, parseInt(v)||0)) });
          }}>Set WIP limit…</MenuItem>
          <MenuItem onClick={()=>setAdding(true)}>Add card</MenuItem>
          <div style={{ height:1, background:'var(--line)', margin:'4px 0' }} />
          <MenuItem danger onClick={()=>{
            if (confirm(`Delete column "${col.title}" and its ${cards.length} cards?`)) dispatch({ type:'DATA', fn: M.deleteColumn(col.id) });
          }}>Delete column</MenuItem>
        </Menu>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'2px 8px 8px', display:'flex', flexDirection:'column', gap:'var(--card-gap)' }}
        onDragOver={(e)=>onDragOver(e, cards.length)} onDrop={(e)=>onDrop(e, cards.length)}>
        {cards.map((card, idx) => (
          <React.Fragment key={card.id}>
            <DropSlot active={dragOverIdx===idx} onDragOver={(e)=>onDragOver(e, idx)} onDrop={(e)=>onDrop(e, idx)} onDragLeave={()=>setDragOverIdx(null)}/>
            <CardTile card={card} users={users} labels={labels} onOpen={()=>onOpenCard(card.id)} />
          </React.Fragment>
        ))}
        <DropSlot active={dragOverIdx===cards.length} onDragOver={(e)=>onDragOver(e, cards.length)} onDrop={(e)=>onDrop(e, cards.length)} onDragLeave={()=>setDragOverIdx(null)}/>

        {adding ? (
          <form onSubmit={addCard} style={{ marginTop:2 }}>
            <Textarea autoFocus value={newTitle} onChange={e=>setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); addCard(); } if (e.key==='Escape') { setAdding(false); setNewTitle(''); } }}
              placeholder="Card title…" style={{ minHeight:56, fontSize:13 }} />
            <div style={{ display:'flex', gap:6, marginTop:6 }}>
              <Button variant="primary" size="sm" type="submit">Add card</Button>
              <Button variant="ghost" size="sm" type="button" onClick={()=>{setAdding(false); setNewTitle('');}}>{I.x}</Button>
            </div>
          </form>
        ) : (
          <button data-add-card={col.id} onClick={()=>setAdding(true)} style={{
            background:'transparent', border:0, color:'var(--ink-3)', fontSize:12.5,
            padding:'8px 10px', borderRadius:8, cursor:'pointer', textAlign:'left',
            display:'flex', alignItems:'center', gap:6
          }}
            onMouseEnter={e=>e.currentTarget.style.background='color-mix(in oklab, var(--ink) 4%, transparent)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            {I.plus} Add a card
          </button>
        )}
      </div>
    </div>
  );
}

function DropSlot({ active, ...rest }) {
  return <div {...rest} style={{
    height: active ? 48 : 4,
    borderRadius: 8,
    background: active ? 'color-mix(in oklab, var(--accent) 14%, transparent)' : 'transparent',
    border: active ? '2px dashed var(--accent)' : 'none',
    transition: 'height .12s, background .12s',
    margin: '-2px 0',
  }} />;
}

function CardTile({ card, users, labels, onOpen }) {
  const assignees = card.assignees.map(id => users.find(u=>u.id===id)).filter(Boolean);
  const cardLabels = card.labels.map(id => labels.find(l=>l.id===id)).filter(Boolean);
  const checkDone = card.checklist.filter(c=>c.done).length;
  const checkTotal = card.checklist.length;
  const due = dueState(card.due);
  const priColor = card.priority==='high' ? 'var(--err)' : card.priority==='med' ? 'var(--warn)' : 'var(--ok)';

  const onDragStart = (e) => {
    e.dataTransfer.setData('text/card-id', card.id);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
  };
  const onDragEnd = (e) => { e.currentTarget.classList.remove('dragging'); };

  return (
    <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onOpen}
      style={{
        background:'var(--surface)', border:'1px solid var(--line)',
        borderRadius:10, padding:'var(--card-pad)', cursor:'grab', userSelect:'none',
        boxShadow:'var(--shadow-sm)', transition:'border-color .12s, box-shadow .12s'
      }}
      onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--line-strong)'; e.currentTarget.style.boxShadow='var(--shadow-md)'; }}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--line)'; e.currentTarget.style.boxShadow='var(--shadow-sm)'; }}>

      {cardLabels.length > 0 && (
        <div style={{ display:'flex', gap:4, marginBottom:6, flexWrap:'wrap' }}>
          {cardLabels.map(l => (
            <span key={l.id} style={{ height:4, width: 28, borderRadius: 2, background: l.color }} title={l.name} />
          ))}
        </div>
      )}

      <div style={{ fontSize:13, lineHeight: 1.38, fontWeight:500, color:'var(--ink)' }}>
        {card.priority && <span style={{ width:7, height:7, borderRadius:'50%', background:priColor, display:'inline-block', marginRight:6, verticalAlign:'middle' }} />}
        {card.title}
      </div>

      {(card.description || checkTotal>0 || card.due || card.comments.length>0 || assignees.length>0) && (
        <div style={{ display:'flex', gap:10, alignItems:'center', marginTop:8, color:'var(--ink-3)', fontSize:11.5 }}>
          {card.description && <span title="Has description" style={{ display:'inline-flex', gap: 3, alignItems:'center' }}>{I.list}</span>}
          {card.due && (
            <span style={{ display:'inline-flex', gap:4, alignItems:'center',
              color: due==='overdue' ? 'var(--err)' : due==='soon' ? 'var(--warn)' : 'var(--ink-3)' }}>
              {I.clock} <span className="mono">{fmtDate(card.due)}</span>
            </span>
          )}
          {checkTotal>0 && (
            <span style={{ display:'inline-flex', gap:4, alignItems:'center', color: checkDone===checkTotal ? 'var(--ok)' : 'var(--ink-3)' }}>
              {I.check} <span className="mono">{checkDone}/{checkTotal}</span>
            </span>
          )}
          {card.comments.length>0 && (
            <span style={{ display:'inline-flex', gap:4, alignItems:'center' }}>
              {I.msg} <span className="mono">{card.comments.length}</span>
            </span>
          )}
          <div style={{ marginLeft:'auto' }}>
            {assignees.length > 0 && <AvatarStack users={assignees} size={20} max={3} />}
          </div>
        </div>
      )}
    </div>
  );
}

function AddColumn({ boardId }) {
  const { dispatch } = useStore();
  const [adding, setAdding] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const submit = (e) => {
    e?.preventDefault?.();
    if (!title.trim()) { setAdding(false); return; }
    dispatch({ type:'DATA', fn: M.addColumn(boardId, title.trim()) });
    setTitle(''); setAdding(false);
  };
  if (!adding) return (
    <button onClick={()=>setAdding(true)} style={{
      width: 280, flexShrink:0, background:'transparent', border:'2px dashed var(--line-strong)',
      borderRadius:12, padding:'14px 16px', cursor:'pointer', color:'var(--ink-3)',
      display:'flex', alignItems:'center', gap:6, fontSize:13, alignSelf:'flex-start'
    }}>{I.plus} Add column</button>
  );
  return (
    <form onSubmit={submit} style={{ width: 280, flexShrink:0, background:'var(--surface)', border:'1px solid var(--line-strong)', borderRadius:12, padding:10, alignSelf:'flex-start' }}>
      <Input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Column title"
        onKeyDown={e=>{ if (e.key==='Escape') { setAdding(false); setTitle(''); } }} />
      <div style={{ display:'flex', gap:6, marginTop:8 }}>
        <Button variant="primary" size="sm" type="submit">Add</Button>
        <Button variant="ghost" size="sm" type="button" onClick={()=>{setAdding(false); setTitle('');}}>{I.x}</Button>
      </div>
    </form>
  );
}

window.BoardScreen = BoardScreen;
