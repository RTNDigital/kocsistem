// Auth screen — login + signup, single layout

function AuthScreen() {
  const { state, dispatch } = useStore();
  const [mode, setMode] = React.useState('login');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');

  const submit = (e) => {
    e.preventDefault();
    if (mode==='signup') dispatch({ type:'SIGNUP', email, password, name });
    else dispatch({ type:'LOGIN', email, password });
  };

  const demo = () => {
    dispatch({ type:'SIGNUP', email:'demo@flowboard.app', password:'demo', name:'Demo User' });
  };

  return (
    <div style={{
      minHeight:'100vh', display:'grid', gridTemplateColumns:'1fr 1.05fr',
      background:'var(--bg)'
    }}>
      {/* Left — form */}
      <div style={{ display:'flex', flexDirection:'column', padding:'40px 56px', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Logo />
          <span style={{ fontWeight:700, fontSize:16, letterSpacing:'-.01em' }}>Flowboard</span>
        </div>

        <div style={{ maxWidth: 360, width:'100%', margin:'0 auto' }}>
          <h1 style={{ fontSize: 30, fontWeight:600, letterSpacing:'-.02em', margin:'0 0 6px', lineHeight:1.1 }}>
            {mode==='login' ? 'Welcome back.' : 'Start moving work.'}
          </h1>
          <p style={{ color:'var(--ink-3)', margin:'0 0 28px', fontSize:14 }}>
            {mode==='login' ? 'Sign in to your boards.' : 'Create an account — takes 5 seconds.'}
          </p>

          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {mode==='signup' && (
              <Field label="Full name">
                <Input value={name} onChange={e=>setName(e.target.value)} required placeholder="Ada Lovelace" />
              </Field>
            )}
            <Field label="Email">
              <Input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@work.com" autoComplete="email" />
            </Field>
            <Field label="Password" right={mode==='login' ? <a href="#" onClick={e=>e.preventDefault()} style={{ fontSize:11.5, color:'var(--ink-3)', textDecoration:'none' }}>Forgot?</a> : null}>
              <Input type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="••••••••" autoComplete={mode==='login' ? 'current-password' : 'new-password'} />
            </Field>

            {state.authError && (
              <div style={{
                fontSize:12.5, color:'var(--err)', background:'color-mix(in oklab, var(--err) 10%, transparent)',
                border:'1px solid color-mix(in oklab, var(--err) 25%, transparent)', borderRadius:7, padding:'8px 10px'
              }}>{state.authError}</div>
            )}

            <Button variant="primary" size="lg" type="submit" style={{ justifyContent:'center', marginTop:4 }}>
              {mode==='login' ? 'Sign in' : 'Create account'}
              <span style={{ opacity:.7 }}>{I.chevR}</span>
            </Button>

            <div style={{ display:'flex', alignItems:'center', gap:10, margin:'8px 0', color:'var(--ink-4)', fontSize:11 }}>
              <div style={{ height:1, background:'var(--line)', flex:1 }} />
              <span className="mono" style={{ letterSpacing:'.12em' }}>OR</span>
              <div style={{ height:1, background:'var(--line)', flex:1 }} />
            </div>

            <Button type="button" onClick={demo} style={{ justifyContent:'center' }}>
              <span style={{ color:'var(--ink-3)' }}>{I.zap}</span>
              Skip — explore with demo data
            </Button>
          </form>

          <p style={{ textAlign:'center', marginTop:22, color:'var(--ink-3)', fontSize:13 }}>
            {mode==='login' ? "Don't have an account?" : 'Already have one?'}{' '}
            <a href="#" onClick={e=>{e.preventDefault(); setMode(mode==='login'?'signup':'login');}} style={{ color:'var(--accent)', fontWeight:500, textDecoration:'none' }}>
              {mode==='login' ? 'Sign up' : 'Sign in'}
            </a>
          </p>
        </div>

        <div style={{ display:'flex', gap:16, fontSize:11.5, color:'var(--ink-4)' }}>
          <span className="mono">v0.4.2</span>
          <span>·</span>
          <span>Privacy</span>
          <span>Terms</span>
        </div>
      </div>

      {/* Right — preview */}
      <div style={{
        background:'linear-gradient(155deg, color-mix(in oklab, var(--accent) 14%, var(--bg)), var(--bg) 60%)',
        borderLeft:'1px solid var(--line)', position:'relative', overflow:'hidden',
        display:'flex', alignItems:'center', justifyContent:'center', padding: 40
      }}>
        <div style={{
          position:'absolute', inset:0,
          backgroundImage: `radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--ink) 10%, transparent) 1px, transparent 0)`,
          backgroundSize: '22px 22px', opacity:.4, maskImage:'radial-gradient(ellipse at center, black 40%, transparent 75%)'
        }} />
        <div style={{ position:'relative', width:'100%', maxWidth: 560 }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--ink-3)', marginBottom:14, letterSpacing:'.08em' }}>
            FLOWBOARD / PRODUCT
          </div>
          <MiniBoardPreview />
          <div style={{ marginTop: 30, display:'flex', gap: 14, flexWrap:'wrap' }}>
            <Feature label="Drag cards between columns" k="⌘K" />
            <Feature label="WIP limits on each column" k="W" />
            <Feature label="Inline edit titles" k="⏎" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, right, children }) {
  return (
    <label style={{ display:'block' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:5 }}>
        <span style={{ fontSize:11.5, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--ink-3)', fontWeight:600 }}>{label}</span>
        {right}
      </div>
      {children}
    </label>
  );
}

function Feature({ label, k }) {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:8, fontSize:12.5, color:'var(--ink-2)' }}>
      <span className="kbd">{k}</span> {label}
    </div>
  );
}

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="26" height="26" rx="6" fill="var(--ink)"/>
      <rect x="6" y="8" width="4" height="14" rx="1.2" fill="var(--accent)"/>
      <rect x="12" y="8" width="4" height="10" rx="1.2" fill="#fff" opacity=".9"/>
      <rect x="18" y="8" width="4" height="6" rx="1.2" fill="#fff" opacity=".5"/>
    </svg>
  );
}

function MiniBoardPreview() {
  const cols = [
    { title:'To do', cards:[
      { t:'Password reset bounces', pri:'high', labels:['bug'] },
      { t:'Invite flow copy', labels:['feature'] },
      { t:'WIP limit banner', labels:['design'] },
    ]},
    { title:'In progress', cards:[
      { t:'Kanban drag perf (200+ cards)', pri:'high', labels:['feature'], progress: 0.66 },
      { t:'Activity feed sidebar', labels:['feature'] },
    ]},
    { title:'Review', cards:[
      { t:'Board background picker', labels:['design'] },
    ]},
  ];
  const colorFor = (l) => ({ bug:'#E25C4B', feature:'#3E7CE0', design:'#8B5BD9' })[l] || '#888';
  return (
    <div style={{
      display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12,
      background:'var(--surface)', border:'1px solid var(--line)', borderRadius:14,
      padding:14, boxShadow:'var(--shadow-lg)'
    }}>
      {cols.map((c,ci) => (
        <div key={ci} style={{ background:'var(--surface-2)', borderRadius:10, padding:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, fontWeight:600, color:'var(--ink-2)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.06em' }}>
            <span>{c.title}</span>
            <span className="mono" style={{ color:'var(--ink-4)' }}>{c.cards.length}</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {c.cards.map((card,i) => (
              <div key={i} style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:8, padding:'8px 9px', boxShadow:'var(--shadow-sm)' }}>
                <div style={{ display:'flex', gap:4, marginBottom:5, flexWrap:'wrap' }}>
                  {card.labels.map(l => <span key={l} style={{ width:22, height:4, background: colorFor(l), borderRadius:2 }} />)}
                </div>
                <div style={{ fontSize:11.5, fontWeight:500, color:'var(--ink)', lineHeight:1.35 }}>{card.t}</div>
                {card.progress != null && (
                  <div style={{ marginTop:6, height:3, background:'var(--surface-2)', borderRadius:2 }}>
                    <div style={{ width:`${card.progress*100}%`, height:'100%', background:'var(--accent)', borderRadius:2 }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

window.AuthScreen = AuthScreen;
