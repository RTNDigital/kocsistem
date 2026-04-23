// Tweaks panel — accent color, density, background tone

function Tweaks({ tweaks, setTweaks }) {
  const accents = [
    { v:'#5B5BF5', name:'Indigo' },
    { v:'#E6884E', name:'Amber' },
    { v:'#2E7D6A', name:'Forest' },
    { v:'#C84B7A', name:'Rose' },
    { v:'#141413', name:'Ink' },
  ];
  const densities = [
    { v:'comfortable', label:'Roomy' },
    { v:'compact', label:'Compact' },
  ];
  const bgs = [
    { v:'paper', label:'Paper' },
    { v:'cool', label:'Cool' },
    { v:'dark', label:'Dark' },
  ];
  const set = (patch) => setTweaks({ ...tweaks, ...patch });

  return (
    <div className="tweaks">
      <h4>Tweaks</h4>
      <label>Accent</label>
      <div className="row">
        {accents.map(a => (
          <button key={a.v} title={a.name}
            onClick={()=>set({ accent: a.v })}
            className={cn('swatch', tweaks.accent===a.v && 'active')}
            style={{ background: a.v }} />
        ))}
      </div>
      <label>Density</label>
      <div className="row">
        <div className="seg">
          {densities.map(d => (
            <button key={d.v} className={cn(tweaks.density===d.v && 'active')} onClick={()=>set({ density: d.v })}>{d.label}</button>
          ))}
        </div>
      </div>
      <label>Background</label>
      <div className="row">
        <div className="seg">
          {bgs.map(d => (
            <button key={d.v} className={cn(tweaks.bg===d.v && 'active')} onClick={()=>set({ bg: d.v })}>{d.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

window.Tweaks = Tweaks;
