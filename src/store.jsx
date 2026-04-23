// Lightweight state store with localStorage persistence.
// Auth is fake — stored client-side, no server.

const LS_KEY = 'flowboard.v1';

function uid(prefix = 'id') {
  return prefix + '_' + Math.random().toString(36).slice(2, 9);
}

function now() { return Date.now(); }

function seedData(userId) {
  const boardId = 'b_product';
  const board2 = 'b_personal';
  const cols = [
    { id: 'c_bl', boardId, title: 'Backlog', wip: 0, order: 0 },
    { id: 'c_todo', boardId, title: 'To do', wip: 5, order: 1 },
    { id: 'c_doing', boardId, title: 'In progress', wip: 3, order: 2 },
    { id: 'c_review', boardId, title: 'Review', wip: 2, order: 3 },
    { id: 'c_done', boardId, title: 'Done', wip: 0, order: 4 },
  ];
  const members = [
    { id: userId, name: 'You', color: '#5B5BF5', initials: 'YO' },
    { id: 'u_ebru', name: 'Ebru K.', color: '#E6884E', initials: 'EK' },
    { id: 'u_mete', name: 'Mete D.', color: '#2E7D6A', initials: 'MD' },
    { id: 'u_sena', name: 'Sena A.', color: '#C84B7A', initials: 'SA' },
  ];
  const labels = [
    { id: 'l_bug', name: 'bug', color: '#E25C4B' },
    { id: 'l_feat', name: 'feature', color: '#3E7CE0' },
    { id: 'l_design', name: 'design', color: '#8B5BD9' },
    { id: 'l_research', name: 'research', color: '#D49A2E' },
    { id: 'l_infra', name: 'infra', color: '#4A8C6F' },
  ];
  const c = (colId, title, extra = {}) => ({
    id: uid('card'), boardId, colId, title,
    description: '', assignees: [], labels: [],
    due: null, priority: null, checklist: [],
    comments: [], createdAt: now(), order: 0, ...extra
  });
  const cards = [
    c('c_bl', 'Audit onboarding drop-off funnel', { labels:['l_research'], priority:'low' }),
    c('c_bl', 'Evaluate Postgres → read replica split', { labels:['l_infra'] }),
    c('c_bl', 'Mobile nav — tablet breakpoints', { labels:['l_design'], assignees:['u_sena'] }),

    c('c_todo', 'Password reset email bounces', {
      labels:['l_bug'], priority:'high', due: now()+1000*60*60*24*2,
      assignees:[userId],
      checklist:[
        { id: uid('ck'), text:'Reproduce on staging', done:true },
        { id: uid('ck'), text:'Check SES reputation', done:false },
        { id: uid('ck'), text:'Ship fix + monitor 24h', done:false },
      ],
      description:'Support flagged three reports this week. Bounces appear to be DMARC-related on gmail workspace domains.',
    }),
    c('c_todo', 'Invite flow — copy rewrite', { labels:['l_feat'], assignees:['u_ebru'] }),
    c('c_todo', 'Add WIP limit warning banner', { labels:['l_feat','l_design'], assignees:['u_sena'], priority:'med' }),

    c('c_doing', 'Kanban drag-drop perf on 200+ cards', {
      labels:['l_feat'], priority:'high',
      assignees:[userId,'u_mete'],
      due: now()+1000*60*60*24*5,
      checklist:[
        { id: uid('ck'), text:'Virtualize column list', done:true },
        { id: uid('ck'), text:'Profile drag handlers', done:true },
        { id: uid('ck'), text:'Debounce order writes', done:false },
      ],
      comments:[
        { id: uid('co'), authorId:'u_mete', text:'Pushed a branch — perf is 3x better after virtualization.', at: now()-1000*60*60*3 },
        { id: uid('co'), authorId:userId, text:'Nice. Let\'s pair on the debounce bit tomorrow.', at: now()-1000*60*60*2 },
      ],
      description:'Boards with >200 cards stutter during drag. Need virtualization + write-batching.'
    }),
    c('c_doing', 'Activity feed sidebar', { labels:['l_feat'], assignees:['u_ebru'] }),

    c('c_review', 'Board background picker', { labels:['l_design'], assignees:['u_sena'], priority:'low' }),

    c('c_done', 'Set up CI for preview deploys', { labels:['l_infra'], assignees:['u_mete'] }),
    c('c_done', 'Typography + color token pass', { labels:['l_design'], assignees:['u_sena'] }),
  ];
  // assign stable column orders
  const byCol = {};
  cards.forEach(cd => { byCol[cd.colId] = (byCol[cd.colId]||0)+1; cd.order = byCol[cd.colId]-1; });

  const b2Cols = [
    { id: 'c2_in', boardId: board2, title: 'Inbox', wip: 0, order: 0 },
    { id: 'c2_week', boardId: board2, title: 'This week', wip: 5, order: 1 },
    { id: 'c2_done', boardId: board2, title: 'Done', wip: 0, order: 2 },
  ];
  const b2Cards = [
    { id: uid('card'), boardId: board2, colId:'c2_in', title:'Book dentist', assignees:[], labels:[], checklist:[], comments:[], createdAt: now(), order:0, description:'', due:null, priority:null },
    { id: uid('card'), boardId: board2, colId:'c2_week', title:'Write Q3 review doc', assignees:[userId], labels:[], checklist:[], comments:[], createdAt: now(), order:0, description:'', due:null, priority:'med' },
  ];

  return {
    users: members,
    labels,
    views: [],
    boards: [
      { id: boardId, title:'Flowboard — Product', starred:true, ownerId:userId, createdAt: now(), color:'#5B5BF5', memberIds:[userId,'u_ebru','u_mete','u_sena'] },
      { id: board2, title:'Personal', starred:false, ownerId:userId, createdAt: now(), color:'#2E7D6A', memberIds:[userId] },
    ],
    columns: [...cols, ...b2Cols],
    cards: [...cards, ...b2Cards],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function saveState(s) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
}

function freshState() {
  const userId = uid('u');
  return {
    session: null, // {userId} when logged in
    accounts: [], // [{id,email,name,password,initials,color,createdAt}]
    data: null, // populated on first login
    route: { name: 'login' },
  };
}

// Global store — uses a single React reducer + context
const StoreCtx = React.createContext(null);

function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE': return { ...state, ...action.state };
    case 'SET_ROUTE': return { ...state, route: action.route };
    case 'SIGNUP': {
      const { email, password, name } = action;
      if (state.accounts.find(a => a.email.toLowerCase() === email.toLowerCase())) {
        return { ...state, authError: 'An account with this email already exists.' };
      }
      const initials = (name || email).split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()||'').join('') || 'U';
      const colors = ['#5B5BF5','#2E7D6A','#C84B7A','#E6884E','#8B5BD9'];
      const user = {
        id: uid('u'), email, password, name: name || email.split('@')[0],
        initials, color: colors[Math.floor(Math.random()*colors.length)],
        createdAt: now(),
      };
      const data = seedData(user.id);
      data.users = [{ id: user.id, name: user.name, color: user.color, initials: user.initials }, ...data.users.filter(u=>u.id!==user.id && !u.id.startsWith('u_')===false)];
      // make sure "you" becomes the user
      data.users = data.users.map(u => u.name === 'You' ? { ...u, id: user.id, name: user.name, initials: user.initials, color: user.color } : u);
      // rewire card assignees from placeholder id
      return {
        ...state,
        accounts: [...state.accounts, user],
        session: { userId: user.id },
        data,
        route: { name: 'dashboard' },
        authError: null,
      };
    }
    case 'LOGIN': {
      const { email, password } = action;
      const acc = state.accounts.find(a => a.email.toLowerCase()===email.toLowerCase() && a.password===password);
      if (!acc) return { ...state, authError: 'Email or password is incorrect.' };
      let data = state.data;
      if (!data || data.boards.every(b => b.ownerId !== acc.id)) {
        data = seedData(acc.id);
        data.users = data.users.map(u => u.name === 'You' ? { ...u, id: acc.id, name: acc.name, initials: acc.initials, color: acc.color } : u);
      }
      return { ...state, session:{ userId: acc.id }, data, route:{ name:'dashboard' }, authError:null };
    }
    case 'LOGOUT':
      return { ...state, session: null, route: { name: 'login' } };
    case 'UPDATE_PROFILE': {
      const { patch } = action;
      const accounts = state.accounts.map(a => a.id===state.session.userId ? { ...a, ...patch } : a);
      const data = state.data ? {
        ...state.data,
        users: state.data.users.map(u => u.id===state.session.userId ? { ...u, ...('name' in patch ? { name: patch.name } : {}), ...('initials' in patch ? { initials: patch.initials } : {}), ...('color' in patch ? { color: patch.color } : {}) } : u),
      } : state.data;
      return { ...state, accounts, data };
    }
    case 'DATA': {
      return { ...state, data: action.fn(state.data) };
    }
    default: return state;
  }
}

function useStore() { return React.useContext(StoreCtx); }

function StoreProvider({ children }) {
  const [state, dispatch] = React.useReducer(reducer, null, () => {
    const loaded = loadState();
    return loaded ? loaded : freshState();
  });

  React.useEffect(() => { saveState(state); }, [state]);

  const value = React.useMemo(() => ({ state, dispatch }), [state]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

// Data mutation helpers — each returns a function (data) => newData
const M = {
  addBoard: (title) => (data) => {
    const id = uid('b');
    const colors = ['#5B5BF5','#2E7D6A','#C84B7A','#E6884E','#8B5BD9','#3E7CE0'];
    const board = { id, title, starred:false, ownerId: data.users[0].id, createdAt: now(), color: colors[Math.floor(Math.random()*colors.length)], memberIds:[data.users[0].id] };
    const cols = [
      { id: uid('c'), boardId:id, title:'To do', wip:0, order:0 },
      { id: uid('c'), boardId:id, title:'In progress', wip:0, order:1 },
      { id: uid('c'), boardId:id, title:'Done', wip:0, order:2 },
    ];
    return { ...data, boards:[...data.boards, board], columns:[...data.columns, ...cols] };
  },
  toggleStar: (boardId) => (data) => ({ ...data, boards: data.boards.map(b => b.id===boardId ? { ...b, starred:!b.starred } : b) }),
  renameBoard: (boardId, title) => (data) => ({ ...data, boards: data.boards.map(b => b.id===boardId ? { ...b, title } : b) }),
  deleteBoard: (boardId) => (data) => ({
    ...data,
    boards: data.boards.filter(b=>b.id!==boardId),
    columns: data.columns.filter(c=>c.boardId!==boardId),
    cards: data.cards.filter(c=>c.boardId!==boardId),
  }),

  addColumn: (boardId, title) => (data) => {
    const cols = data.columns.filter(c=>c.boardId===boardId);
    const order = cols.length ? Math.max(...cols.map(c=>c.order))+1 : 0;
    return { ...data, columns: [...data.columns, { id: uid('c'), boardId, title, wip:0, order }] };
  },
  renameColumn: (colId, title) => (data) => ({ ...data, columns: data.columns.map(c => c.id===colId ? { ...c, title } : c) }),
  setColumnWip: (colId, wip) => (data) => ({ ...data, columns: data.columns.map(c => c.id===colId ? { ...c, wip } : c) }),
  deleteColumn: (colId) => (data) => ({
    ...data,
    columns: data.columns.filter(c=>c.id!==colId),
    cards: data.cards.filter(c=>c.colId!==colId),
  }),

  addCard: (boardId, colId, title) => (data) => {
    const cards = data.cards.filter(c=>c.colId===colId);
    const order = cards.length ? Math.max(...cards.map(c=>c.order))+1 : 0;
    const card = {
      id: uid('card'), boardId, colId, title, description:'',
      assignees:[], labels:[], due:null, priority:null, checklist:[], comments:[],
      createdAt: now(), order
    };
    return { ...data, cards: [...data.cards, card] };
  },
  updateCard: (cardId, patch) => (data) => ({ ...data, cards: data.cards.map(c => c.id===cardId ? { ...c, ...patch } : c) }),
  deleteCard: (cardId) => (data) => ({ ...data, cards: data.cards.filter(c=>c.id!==cardId) }),

  moveCard: (cardId, toColId, toIndex) => (data) => {
    const card = data.cards.find(c=>c.id===cardId);
    if (!card) return data;
    // cards NOT in target col
    const otherCards = data.cards.filter(c => c.id !== cardId);
    const targetCards = otherCards.filter(c => c.colId === toColId).sort((a,b)=>a.order-b.order);
    targetCards.splice(toIndex, 0, { ...card, colId: toColId });
    const renumbered = targetCards.map((c,i)=>({ ...c, order: i }));
    const cards = [
      ...otherCards.filter(c => c.colId !== toColId),
      ...renumbered,
    ];
    return { ...data, cards };
  },

  moveColumn: (colId, toIndex) => (data) => {
    const col = data.columns.find(c=>c.id===colId);
    if (!col) return data;
    const siblings = data.columns.filter(c => c.boardId===col.boardId && c.id!==colId).sort((a,b)=>a.order-b.order);
    siblings.splice(toIndex, 0, col);
    const renumbered = siblings.map((c,i)=>({...c, order:i}));
    const other = data.columns.filter(c => c.boardId !== col.boardId);
    return { ...data, columns: [...other, ...renumbered] };
  },

  addComment: (cardId, userId, text) => (data) => {
    const comment = { id: uid('co'), authorId:userId, text, at: now() };
    return { ...data, cards: data.cards.map(c => c.id===cardId ? { ...c, comments: [...c.comments, comment] } : c) };
  },
  addChecklistItem: (cardId, text) => (data) => {
    const item = { id: uid('ck'), text, done:false };
    return { ...data, cards: data.cards.map(c => c.id===cardId ? { ...c, checklist: [...c.checklist, item] } : c) };
  },
  toggleChecklist: (cardId, itemId) => (data) => ({
    ...data, cards: data.cards.map(c => c.id===cardId ? { ...c, checklist: c.checklist.map(i => i.id===itemId ? { ...i, done:!i.done } : i) } : c)
  }),
  removeChecklist: (cardId, itemId) => (data) => ({
    ...data, cards: data.cards.map(c => c.id===cardId ? { ...c, checklist: c.checklist.filter(i => i.id!==itemId) } : c)
  }),
  toggleAssignee: (cardId, userId) => (data) => ({
    ...data, cards: data.cards.map(c => c.id===cardId ? { ...c, assignees: c.assignees.includes(userId) ? c.assignees.filter(x=>x!==userId) : [...c.assignees, userId] } : c)
  }),
  toggleLabel: (cardId, labelId) => (data) => ({
    ...data, cards: data.cards.map(c => c.id===cardId ? { ...c, labels: c.labels.includes(labelId) ? c.labels.filter(x=>x!==labelId) : [...c.labels, labelId] } : c)
  }),

  // Custom views — user-defined filter presets
  addView: (view) => (data) => ({
    ...data,
    views: [...(data.views||[]), { id: uid('v'), createdAt: now(), starred:false, ...view }],
  }),
  updateView: (viewId, patch) => (data) => ({
    ...data,
    views: (data.views||[]).map(v => v.id===viewId ? { ...v, ...patch } : v),
  }),
  deleteView: (viewId) => (data) => ({
    ...data,
    views: (data.views||[]).filter(v => v.id !== viewId),
  }),
  toggleStarView: (viewId) => (data) => ({
    ...data,
    views: (data.views||[]).map(v => v.id===viewId ? { ...v, starred: !v.starred } : v),
  }),
};

window.StoreProvider = StoreProvider;
window.StoreCtx = StoreCtx;
window.useStore = useStore;
window.M = M;
window.uid = uid;
