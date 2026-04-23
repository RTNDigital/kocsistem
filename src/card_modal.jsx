// Card detail modal

function CardModal({ cardId, onClose }) {
  const { state, dispatch } = useStore();
  const card = state.data.cards.find(c => c.id === cardId);
  const me = state.accounts.find(a => a.id === state.session.userId);
  const [comment, setComment] = React.useState('');
  const [checkText, setCheckText] = React.useState('');

  React.useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  if (!card) return null;
  const col = state.data.columns.find(c => c.id === card.colId);
  const board = state.data.boards.find(b => b.id === card.boardId);
  const assignees = card.assignees.map(id => state.data.users.find(u=>u.id===id)).filter(Boolean);
  const cardLabels = card.labels.map(id => state.data.labels.find(l=>l.id===id)).filter(Boolean);
  const checkDone = card.checklist.filter(c=>c.done).length;
  const checkTotal = card.checklist.length;
  const progress = checkTotal ? checkDone/checkTotal : 0;
  const due = dueState(card.due);

  const upd = (patch) => dispatch({ type:'DATA', fn: M.updateCard(cardId, patch) });

  const submitComment = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    dispatch({ type:'DATA', fn: M.addComment(cardId, me.id, comment.trim()) });
    setComment('');
  };

  const addCheck = (e) => {
    e.preventDefault();
    if (!checkText.trim()) return;
    dispatch({ type:'DATA', fn: M.addChecklistItem(cardId, checkText.trim()) });
    setCheckText('');
  };

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(20,20,19,.45)', backdropFilter:'blur(2px)',
      zIndex: 150, display:'flex', alignItems:'flex-start', justifyContent:'center',
      padding:'56px 20px', overflowY:'auto'
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:'100%', maxWidth: 820, background:'var(--surface)',
        border:'1px solid var(--line)', borderRadius: 14, boxShadow:'var(--shadow-lg)',
        overflow:'hidden'
      }}>
        {/* Header */}
        <div style={{ padding:'18px 22px 14px', borderBottom:'1px solid var(--line)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11.5, color:'var(--ink-3)', marginBottom:8 }}>
            <span className="mono" style={{ letterSpacing:'.06em' }}>{board.title.toUpperCase()}</span>
            <span>{I.chevR}</span>
            <span style={{ color:'var(--ink-2)', fontWeight:500 }}>{col.title}</span>
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:4 }}>
              <button onClick={()=>{
                if (confirm('Delete this card?')) { dispatch({ type:'DATA', fn: M.deleteCard(cardId) }); onClose(); }
              }} style={{ background:'transparent', border:0, padding:6, borderRadius:6, color:'var(--ink-3)', cursor:'pointer' }}>{I.trash}</button>
              <button onClick={onClose} style={{ background:'transparent', border:0, padding:6, borderRadius:6, color:'var(--ink-3)', cursor:'pointer' }}>{I.x}</button>
            </div>
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
            <div style={{ flex:1 }}>
              <InlineEdit value={card.title} onCommit={(v)=>upd({ title: v })}
                render={v => <h2 style={{ fontSize:22, fontWeight:600, letterSpacing:'-.01em', margin:0, lineHeight:1.2 }}>{v}</h2>}
                inputStyle={{ fontSize:22, fontWeight:600, letterSpacing:'-.01em' }}
              />
            </div>
          </div>

          {/* Chips row */}
          <div style={{ display:'flex', gap:8, marginTop:14, flexWrap:'wrap', alignItems:'center' }}>
            {cardLabels.map(l => (
              <Chip key={l.id} color={l.color}>{l.name}</Chip>
            ))}
            {card.priority && (
              <Chip color={ card.priority==='high' ? 'var(--err)' : card.priority==='med' ? 'var(--warn)' : 'var(--ok)' }>
                {card.priority} priority
              </Chip>
            )}
            {card.due && (
              <Chip color={ due==='overdue' ? 'var(--err)' : due==='soon' ? 'var(--warn)' : 'var(--ink-3)' }>
                {I.clock} {fmtDate(card.due)}
              </Chip>
            )}
            {assignees.length > 0 && (
              <span style={{ marginLeft: 'auto' }}>
                <AvatarStack users={assignees} size={24} max={5} />
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 240px', gap:0 }}>
          <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:22, minWidth:0 }}>
            <Block label="Description">
              <DescriptionEditor value={card.description} onCommit={(v)=>upd({ description: v })} />
            </Block>

            <Block label="Checklist" right={checkTotal>0 && <span className="mono" style={{ fontSize:11, color:'var(--ink-3)' }}>{checkDone}/{checkTotal}</span>}>
              {checkTotal > 0 && (
                <div style={{ height:4, background:'var(--surface-2)', borderRadius:2, marginBottom:10, overflow:'hidden' }}>
                  <div style={{ width:`${progress*100}%`, height:'100%', background:'var(--accent)', transition:'width .2s' }} />
                </div>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                {card.checklist.map(item => (
                  <div key={item.id} style={{ display:'flex', gap:9, alignItems:'center', padding:'5px 2px', borderRadius:6 }}
                    onMouseEnter={e => { e.currentTarget.querySelector('.ckdel').style.opacity='1'; }}
                    onMouseLeave={e => { e.currentTarget.querySelector('.ckdel').style.opacity='0'; }}>
                    <button onClick={()=>dispatch({ type:'DATA', fn: M.toggleChecklist(cardId, item.id) })}
                      style={{
                        width:16, height:16, borderRadius:4, border:'1.5px solid ' + (item.done ? 'var(--accent)' : 'var(--line-strong)'),
                        background: item.done ? 'var(--accent)' : 'transparent', cursor:'pointer',
                        padding:0, color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center'
                      }}>
                      {item.done && <Icon d="M4 10l3 3 7-7" size={11} stroke={2.5}/>}
                    </button>
                    <span style={{ fontSize:13.5, flex:1, color: item.done ? 'var(--ink-4)' : 'var(--ink-2)', textDecoration: item.done ? 'line-through' : 'none' }}>
                      {item.text}
                    </span>
                    <button className="ckdel" onClick={()=>dispatch({ type:'DATA', fn: M.removeChecklist(cardId, item.id) })}
                      style={{ opacity:0, transition:'opacity .1s', background:'transparent', border:0, cursor:'pointer', color:'var(--ink-4)', padding:2 }}>
                      {I.x}
                    </button>
                  </div>
                ))}
              </div>
              <form onSubmit={addCheck} style={{ display:'flex', gap:6, marginTop:checkTotal?8:0 }}>
                <Input value={checkText} onChange={e=>setCheckText(e.target.value)} placeholder="Add an item…" style={{ fontSize:13 }} />
                <Button size="sm" variant="default" type="submit">Add</Button>
              </form>
            </Block>

            <Block label={`Activity · ${card.comments.length} comments`}>
              <form onSubmit={submitComment} style={{ display:'flex', gap:10, marginBottom:14 }}>
                <Avatar user={me} size={28} />
                <div style={{ flex:1 }}>
                  <Textarea value={comment} onChange={e=>setComment(e.target.value)}
                    placeholder="Write a comment… (⌘↵ to send)"
                    onKeyDown={e => { if ((e.ctrlKey||e.metaKey) && e.key==='Enter') submitComment(e); }}
                    style={{ minHeight:60 }} />
                  {comment.trim() && (
                    <div style={{ marginTop:6, display:'flex', justifyContent:'flex-end' }}>
                      <Button variant="primary" size="sm" type="submit">Send</Button>
                    </div>
                  )}
                </div>
              </form>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {[...card.comments].reverse().map(c => {
                  const u = state.data.users.find(x => x.id===c.authorId);
                  return (
                    <div key={c.id} style={{ display:'flex', gap:10 }}>
                      <Avatar user={u} size={28} />
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12.5, color:'var(--ink-2)', marginBottom:3 }}>
                          <b style={{ color:'var(--ink)', fontWeight:600 }}>{u?.name || 'Unknown'}</b>
                          <span className="mono" style={{ color:'var(--ink-4)', marginLeft:8, fontSize:11 }}>{relativeTime(c.at)}</span>
                        </div>
                        <div style={{ fontSize:13.5, color:'var(--ink-2)', lineHeight:1.5, background:'var(--surface-2)', borderRadius:8, padding:'8px 10px' }}>
                          {c.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {card.comments.length === 0 && (
                  <div style={{ fontSize:12.5, color:'var(--ink-4)', fontStyle:'italic', paddingLeft:38 }}>No comments yet.</div>
                )}
              </div>
            </Block>
          </div>

          {/* Sidebar */}
          <aside style={{ padding:'20px 18px 20px 4px', borderLeft:'1px solid var(--line)', background:'color-mix(in oklab, var(--surface-2) 40%, var(--surface))', display:'flex', flexDirection:'column', gap:8 }}>
            <SidebarTitle>Add to card</SidebarTitle>
            <AssigneesPopover card={card} users={state.data.users} boardMemberIds={board.memberIds} />
            <LabelsPopover card={card} labels={state.data.labels} />
            <DuePopover card={card} onChange={(due)=>upd({ due })} />
            <PriorityPopover card={card} onChange={(priority)=>upd({ priority })} />

            <SidebarTitle style={{ marginTop: 18 }}>Move</SidebarTitle>
            <MoveMenu card={card} columns={state.data.columns.filter(c => c.boardId===card.boardId).sort((a,b)=>a.order-b.order)} />

            <div style={{ marginTop:'auto', paddingTop: 14, borderTop:'1px dashed var(--line)', fontSize:11, color:'var(--ink-4)' }}>
              <div className="mono">Created {fmtDate(card.createdAt)}</div>
              <div className="mono" style={{ marginTop:2 }}>ID {card.id.slice(-6)}</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function SidebarTitle({ children, style }) {
  return <div style={{ fontSize:10.5, fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--ink-4)', padding:'0 8px', marginBottom:2, ...style }}>{children}</div>;
}

function Block({ label, right, children }) {
  return (
    <div>
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:9 }}>
        <span style={{ fontSize:11.5, fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--ink-3)' }}>{label}</span>
        {right}
      </div>
      {children}
    </div>
  );
}

function DescriptionEditor({ value, onCommit }) {
  const [editing, setEditing] = React.useState(false);
  const [v, setV] = React.useState(value);
  React.useEffect(() => setV(value), [value]);
  if (editing) {
    return (
      <div>
        <Textarea autoFocus value={v} onChange={e=>setV(e.target.value)} placeholder="What's this card about?"
          style={{ minHeight:120 }} />
        <div style={{ marginTop:6, display:'flex', gap:6 }}>
          <Button variant="primary" size="sm" onClick={()=>{ onCommit(v); setEditing(false); }}>Save</Button>
          <Button variant="ghost" size="sm" onClick={()=>{ setV(value); setEditing(false); }}>Cancel</Button>
        </div>
      </div>
    );
  }
  return (
    <div onClick={()=>setEditing(true)} style={{
      background: value ? 'transparent' : 'var(--surface-2)', border: value ? '1px dashed transparent' : '1px dashed var(--line-strong)',
      borderRadius:8, padding:'10px 12px', minHeight: value ? 0 : 50,
      fontSize:13.5, color: value ? 'var(--ink-2)' : 'var(--ink-4)', cursor:'text',
      whiteSpace:'pre-wrap', lineHeight: 1.55
    }}>
      {value || 'Add a more detailed description…'}
    </div>
  );
}

function SideBtn({ icon, children, onClick, active }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:8, width:'100%', textAlign:'left',
      padding:'7px 10px', borderRadius:7, border:0,
      background: active ? 'var(--surface-2)' : 'var(--surface)',
      fontSize:12.5, color:'var(--ink-2)', cursor:'pointer',
      border: '1px solid var(--line)'
    }}
      onMouseEnter={e=>e.currentTarget.style.borderColor='var(--line-strong)'}
      onMouseLeave={e=>e.currentTarget.style.borderColor='var(--line)'}>
      <span style={{ color:'var(--ink-3)' }}>{icon}</span>
      {children}
    </button>
  );
}

function AssigneesPopover({ card, users, boardMemberIds }) {
  const { dispatch } = useStore();
  const members = boardMemberIds.map(id => users.find(u=>u.id===id)).filter(Boolean);
  return (
    <Menu trigger={({setOpen}) => (
      <SideBtn icon={I.users} onClick={()=>setOpen(o=>!o)}>Members ({card.assignees.length})</SideBtn>
    )}>
      {members.map(u => {
        const on = card.assignees.includes(u.id);
        return (
          <button key={u.id} onClick={(e)=>{ e.stopPropagation(); dispatch({ type:'DATA', fn: M.toggleAssignee(card.id, u.id) }); }}
            style={{
              display:'flex', alignItems:'center', gap:8, width:'100%', textAlign:'left',
              padding:'6px 8px', borderRadius:6, border:0, background:'transparent',
              fontSize:13, cursor:'pointer'
            }}
            onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <Avatar user={u} size={22} />
            <span style={{ flex:1 }}>{u.name}</span>
            {on && <span style={{ color:'var(--accent)' }}>{I.check}</span>}
          </button>
        );
      })}
    </Menu>
  );
}

function LabelsPopover({ card, labels }) {
  const { dispatch } = useStore();
  return (
    <Menu trigger={({setOpen}) => (
      <SideBtn icon={I.flag} onClick={()=>setOpen(o=>!o)}>Labels ({card.labels.length})</SideBtn>
    )}>
      {labels.map(l => {
        const on = card.labels.includes(l.id);
        return (
          <button key={l.id} onClick={(e)=>{ e.stopPropagation(); dispatch({ type:'DATA', fn: M.toggleLabel(card.id, l.id) }); }}
            style={{
              display:'flex', alignItems:'center', gap:8, width:'100%', textAlign:'left',
              padding:'6px 8px', borderRadius:6, border:0, background:'transparent',
              fontSize:13, cursor:'pointer'
            }}
            onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <span style={{ width:24, height:12, borderRadius:3, background:l.color }} />
            <span style={{ flex:1 }}>{l.name}</span>
            {on && <span style={{ color:'var(--accent)' }}>{I.check}</span>}
          </button>
        );
      })}
    </Menu>
  );
}

function DuePopover({ card, onChange }) {
  const dateInputRef = React.useRef(null);
  const toInput = card.due ? new Date(card.due).toISOString().slice(0,10) : '';
  return (
    <div style={{ position:'relative' }}>
      <SideBtn icon={I.clock} onClick={()=>dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()}>
        {card.due ? `Due ${fmtDate(card.due)}` : 'Due date'}
      </SideBtn>
      <input ref={dateInputRef} type="date" value={toInput}
        onChange={e => onChange(e.target.value ? new Date(e.target.value).getTime() : null)}
        style={{ position:'absolute', inset:0, opacity:0, pointerEvents:'none' }} />
      {card.due && (
        <button onClick={()=>onChange(null)} style={{
          position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
          background:'transparent', border:0, color:'var(--ink-4)', cursor:'pointer', padding:2
        }}>{I.x}</button>
      )}
    </div>
  );
}

function PriorityPopover({ card, onChange }) {
  const opts = [
    { v:'high', label:'High', c:'var(--err)' },
    { v:'med', label:'Medium', c:'var(--warn)' },
    { v:'low', label:'Low', c:'var(--ok)' },
  ];
  return (
    <Menu trigger={({setOpen}) => (
      <SideBtn icon={I.zap} onClick={()=>setOpen(o=>!o)}>
        {card.priority ? `Priority — ${card.priority}` : 'Priority'}
      </SideBtn>
    )}>
      {opts.map(o => (
        <button key={o.v} onClick={(e)=>{ e.stopPropagation(); onChange(card.priority===o.v ? null : o.v); }}
          style={{
            display:'flex', alignItems:'center', gap:8, width:'100%', textAlign:'left',
            padding:'6px 8px', borderRadius:6, border:0, background:'transparent',
            fontSize:13, cursor:'pointer'
          }}
          onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:o.c }} />
          <span style={{ flex:1 }}>{o.label}</span>
          {card.priority===o.v && <span style={{ color:'var(--accent)' }}>{I.check}</span>}
        </button>
      ))}
    </Menu>
  );
}

function MoveMenu({ card, columns }) {
  const { dispatch } = useStore();
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4, padding:'0 4px' }}>
      {columns.map(c => (
        <button key={c.id} onClick={()=>{
          const targetCards = columns.find(x=>x.id===c.id) ? columns : [];
          dispatch({ type:'DATA', fn: M.moveCard(card.id, c.id, 0) });
        }}
          disabled={c.id === card.colId}
          style={{
            display:'flex', alignItems:'center', gap:8, width:'100%', textAlign:'left',
            padding:'6px 10px', borderRadius:6, border:0,
            background: c.id===card.colId ? 'var(--surface-2)' : 'transparent',
            fontSize:12.5, color: c.id===card.colId ? 'var(--ink)' : 'var(--ink-2)',
            cursor: c.id===card.colId ? 'default' : 'pointer',
            fontWeight: c.id===card.colId ? 600 : 400
          }}
          onMouseEnter={e=>{ if (c.id!==card.colId) e.currentTarget.style.background='var(--surface-2)'; }}
          onMouseLeave={e=>{ if (c.id!==card.colId) e.currentTarget.style.background='transparent'; }}>
          {c.id===card.colId && <span style={{ color:'var(--accent)' }}>●</span>}
          {c.title}
        </button>
      ))}
    </div>
  );
}

window.CardModal = CardModal;
