// mobile-screens.jsx — 5 mobile screens for CLOE
// Today (Hoy), Shopping (Compra), Tasks (Tareas), Calendar (Calendario), Pet (Loki)

// ── Shared header ──────────────────────────────────────
function MHeader({ eyebrow, title, right }) {
  return (
    <div style={{ padding: '8px 20px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div className="eyebrow">{eyebrow}</div>
        <div>{right}</div>
      </div>
      <h1 className="display" style={{ fontSize: 30, margin: 0, fontWeight: 700, letterSpacing: 'var(--tracking-display)' }}>
        {title}
      </h1>
    </div>
  );
}

const CAT_EMOJI = {
  compra: '🛒', limpieza: '🧽', cocina: '🍳', mascota: '🐕',
  niños: '🧸', plantas: '🌿', recados: '🚗', salud: '💊', social: '🎉', cole: '🎒',
};

// ─────────────────────────────────────────────────────────
// 1) HOY
// ─────────────────────────────────────────────────────────
function ScreenHoy({ state }) {
  const { today, toggleTodayTask, shop, events, members } = state;
  const todayDone = today.filter(t => t.done).length;
  const total = today.length;
  const pct = Math.round((todayDone / total) * 100);
  const myPending = today.filter(t => !t.done && t.who === 'M').length;
  const shopPending = shop.filter(s => !s.done).length;
  const nextEvent = events.slice().sort((a,b) => a.time.localeCompare(b.time)).find(e => true);

  const fecha = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date('2026-05-15'));

  return (
    <div className="screen-fade">
      <MHeader
        eyebrow={fecha.charAt(0).toUpperCase() + fecha.slice(1)}
        title="Hola, Marina"
        right={<AvatarStack ids={['M','C','L','P']} size="xs" />}
      />

      {/* Hero progress card */}
      <div style={{ margin: '0 16px 18px', padding: '20px 22px 22px',
        background: 'var(--surface)', borderRadius: 'var(--r-xl)',
        border: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>HOY EN CASA</div>
            <div className="display" style={{ fontSize: 56, fontWeight: 700 }}>
              <span style={{ color: 'var(--accent)' }}>{todayDone}</span>
              <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}> / {total}</span>
            </div>
            <div style={{ color: 'var(--ink-2)', fontSize: 13, marginTop: 4 }}>
              tareas hechas
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="display" style={{ fontSize: 36, color: 'var(--ink)', fontWeight: 600 }}>{pct}%</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              de la casa
            </div>
          </div>
        </div>
        <div className="bar"><i style={{ width: pct + '%' }} /></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, fontSize: 12, color: 'var(--ink-2)' }}>
          <span>Quedan {total - todayDone}</span>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <AvatarStack ids={['M','C','L','P']} size="xs" />
            <span style={{ marginLeft: 4 }}>colaborando</span>
          </span>
        </div>
      </div>

      {/* Quick stats row */}
      <div style={{ margin: '0 16px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ padding: 14, background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)' }}>
          <div className="eyebrow">Tuyo</div>
          <div className="display" style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>{myPending}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>tareas pendientes</div>
        </div>
        <div style={{ padding: 14, background: 'var(--accent-soft)', borderRadius: 16, border: '1px solid var(--line)' }}>
          <div className="eyebrow" style={{ color: 'var(--accent)' }}>Compra</div>
          <div className="display" style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>{shopPending}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>productos en la lista</div>
        </div>
      </div>

      {/* Mis tareas */}
      <div className="section-h">
        <div className="h">Mis tareas hoy</div>
        <div className="chip">{today.filter(t => t.who === 'M').length}</div>
      </div>
      <div style={{ margin: '0 16px 8px', background: 'var(--surface)', borderRadius: 18, border: '1px solid var(--line)', overflow: 'hidden' }}>
        {today.filter(t => t.who === 'M').map((t, i, arr) => (
          <div key={t.id} className={'row' + (t.done ? ' done' : '')}
               style={{ borderTop: i === 0 ? 'none' : '1px solid var(--line)' }}>
            <Check on={t.done} onToggle={() => toggleTodayTask(t.id)} />
            <span style={{ fontSize: 22 }}>{t.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="title" style={{ fontSize: 15 }}>{t.title}</div>
              <div className="meta">{t.time !== '—' ? t.time : 'cuando puedas'}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Próximo evento */}
      <div className="section-h">
        <div className="h">Próximo</div>
        <div className="chip">agenda</div>
      </div>
      <div style={{ margin: '0 16px 8px', padding: 16, background: 'var(--surface)', borderRadius: 18, border: '1px solid var(--line)',
                    display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: nextEvent.color }} />
        <div style={{ flex: 1 }}>
          <div className="title" style={{ fontSize: 15 }}>{nextEvent.title}</div>
          <div className="meta">{nextEvent.time} · {nextEvent.dur} · {nextEvent.tag}</div>
        </div>
        <Avatar id={nextEvent.who} />
      </div>

      {/* Todo del día */}
      <div className="section-h">
        <div className="h">Todo el día</div>
        <div className="chip">{total - today.filter(t => t.who === 'M').length} otras</div>
      </div>
      <div style={{ margin: '0 16px 100px', background: 'var(--surface)', borderRadius: 18, border: '1px solid var(--line)', overflow: 'hidden' }}>
        {today.filter(t => t.who !== 'M').map((t, i) => (
          <div key={t.id} className={'row' + (t.done ? ' done' : '')}
               style={{ borderTop: i === 0 ? 'none' : '1px solid var(--line)' }}>
            <Check on={t.done} onToggle={() => toggleTodayTask(t.id)} />
            <span style={{ fontSize: 20 }}>{t.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="title" style={{ fontSize: 14 }}>{t.title}</div>
              <div className="meta">{t.time}</div>
            </div>
            <Avatar id={t.who} size="xs" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 2) COMPRA
// ─────────────────────────────────────────────────────────
function ScreenCompra({ state }) {
  const { shop, toggleShop } = state;
  const groups = {};
  shop.forEach(s => { (groups[s.cat] ||= []).push(s); });
  const pending = shop.filter(s => !s.done).length;
  const done = shop.length - pending;

  return (
    <div className="screen-fade">
      <MHeader
        eyebrow="LISTA DE LA COMPRA"
        title="Compra"
        right={<span className="chip">{pending} ítems</span>}
      />

      {/* Hero */}
      <div style={{ margin: '0 16px 18px', padding: '18px 20px', background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
          <div className="display" style={{ fontSize: 64, fontWeight: 700, color: 'var(--accent)', lineHeight: 0.85 }}>{pending}</div>
          <div style={{ paddingBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>por comprar</div>
            <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{done} ya en el carro</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button className="btn accent" style={{ flex: 1 }}>🛒 Salgo a comprar</button>
          <button className="btn ghost">+ Añadir</button>
        </div>
      </div>

      {/* Categories */}
      <div style={{ padding: '0 16px 110px' }}>
        {Object.entries(groups).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '8px 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{CAT_EMOJI[cat] || '🏷️'}</span>
                <div className="display" style={{ fontSize: 17, fontWeight: 600, textTransform: 'capitalize' }}>{cat}</div>
              </div>
              <div className="meta" style={{ fontSize: 12 }}>{items.filter(i => !i.done).length} / {items.length}</div>
            </div>
            <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', overflow: 'hidden' }}>
              {items.map((it, i) => (
                <div key={it.id} className={'row' + (it.done ? ' done' : '')}
                     style={{ borderTop: i === 0 ? 'none' : '1px solid var(--line)', minHeight: 48, padding: '10px 14px' }}>
                  <Check on={it.done} onToggle={() => toggleShop(it.id)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="title" style={{ fontSize: 15 }}>{it.name}</div>
                    <div className="meta">{it.qty}</div>
                  </div>
                  {it.who ? <Avatar id={it.who} size="xs" /> :
                    <span className="chip" style={{ height: 22, fontSize: 11 }}>cualquiera</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 3) TAREAS
// ─────────────────────────────────────────────────────────
function ScreenTareas({ state }) {
  const { week, toggleWeekTask, scores } = state;
  const [filter, setFilter] = React.useState('todos');
  const DAYS = ['lun','mar','mié','jue','vie','sáb','dom'];

  const filtered = filter === 'todos' ? week : week.filter(t => t.who === filter);
  const scoreFor = (id) => scores.find(s => s.id === id);

  return (
    <div className="screen-fade">
      <MHeader
        eyebrow="ESTA SEMANA"
        title="Tareas"
        right={<span className="chip">📊 ranking</span>}
      />

      {/* Member scorecard */}
      <div style={{ margin: '0 16px 18px', padding: '16px 16px 18px', background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="display" style={{ fontSize: 17, fontWeight: 600 }}>Ranking de la semana</div>
          <div className="meta">de 32 tareas</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {scores.slice().sort((a,b) => b.done - a.done).map((s, i) => {
            const m = memberById(s.id);
            const pct = (s.done / s.total) * 100;
            const isLeader = i === 0;
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 14, fontSize: 13, color: 'var(--ink-3)', fontWeight: 600, textAlign: 'center' }}>
                  {i + 1}
                </div>
                <Avatar id={s.id} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{m.name} {isLeader && '👑'}</div>
                    <div className="num mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                      {s.done}/{s.total}
                    </div>
                  </div>
                  <div className="bar" style={{ marginTop: 4, height: 6 }}>
                    <i style={{ width: pct + '%', background: m.color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ padding: '0 16px 14px', display: 'flex', gap: 6, overflowX: 'auto' }}>
        {[{id:'todos',label:'Todos'}, ...MEMBERS.map(m => ({id:m.id,label:m.name}))].map(o => (
          <button key={o.id}
            onClick={() => setFilter(o.id)}
            className="chip"
            style={{
              cursor: 'pointer', border: 'none', flexShrink: 0,
              background: filter === o.id ? 'var(--ink)' : 'var(--surface-2)',
              color: filter === o.id ? 'var(--bg)' : 'var(--ink-2)',
              height: 32, padding: '0 12px', fontSize: 13, fontWeight: 500
            }}>
            {o.label}
          </button>
        ))}
      </div>

      {/* Week tasks grouped by day */}
      <div style={{ padding: '0 16px 110px' }}>
        {DAYS.map(d => {
          const items = filtered.filter(t => t.day === d);
          if (items.length === 0) return null;
          return (
            <div key={d} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '8px 4px' }}>
                <div className="display" style={{ fontSize: 22, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.025em' }}>{d}</div>
                <div className="meta" style={{ fontSize: 12 }}>{items.filter(t => !t.done).length} pendientes</div>
              </div>
              <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', overflow: 'hidden' }}>
                {items.map((t, i) => (
                  <div key={t.id} className={'row' + (t.done ? ' done' : '')}
                       style={{ borderTop: i === 0 ? 'none' : '1px solid var(--line)' }}>
                    <Check on={t.done} onToggle={() => toggleWeekTask(t.id)} />
                    <span style={{ fontSize: 20 }}>{t.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="title" style={{ fontSize: 15 }}>{t.title}</div>
                      <div className="meta">asignado a {memberById(t.who).name}</div>
                    </div>
                    <Avatar id={t.who} size="xs" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 4) CALENDARIO
// ─────────────────────────────────────────────────────────
function ScreenCalendario({ state }) {
  const { events } = state;
  const [selected, setSelected] = React.useState(15);
  const month = 'Mayo 2026';
  const daysInMonth = 31;
  const firstWeekday = 4; // viernes en mayo 2026

  // Generate calendar grid
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // Dots per day (synthetic for visual rhythm)
  const dotsByDay = { 3: ['M'], 7: ['L','P'], 12: ['C'], 15: ['M','P','C'], 18: ['L'], 22: ['M','C'], 25: ['P'], 28: ['L','M'] };

  const todayEvents = events.slice().sort((a,b) => a.time.localeCompare(b.time));

  return (
    <div className="screen-fade">
      <MHeader
        eyebrow="MAYO 2026"
        title="Calendario"
        right={<span className="chip">+ evento</span>}
      />

      {/* Calendar */}
      <div style={{ margin: '0 16px 18px', padding: '16px 14px', background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--line)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 6 }}>
          {['L','M','X','J','V','S','D'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, letterSpacing: '0.08em' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
          {cells.map((d, i) => (
            <button key={i}
              onClick={() => d && setSelected(d)}
              disabled={!d}
              style={{
                aspectRatio: '1/1', border: 'none', cursor: d ? 'pointer' : 'default',
                background: d === selected ? 'var(--ink)' : 'transparent',
                color: d === selected ? 'var(--bg)' : (d ? 'var(--ink)' : 'transparent'),
                borderRadius: 12,
                fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                position: 'relative', padding: 2
              }}>
              <div>{d}</div>
              {d && dotsByDay[d] && (
                <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                  {dotsByDay[d].slice(0, 3).map((id, j) => (
                    <span key={j} style={{ width: 4, height: 4, borderRadius: 2,
                      background: d === selected ? 'var(--bg)' : memberById(id).color }} />
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Day events */}
      <div className="section-h">
        <div className="h">Viernes 15</div>
        <div className="chip">{todayEvents.length} eventos</div>
      </div>
      <div style={{ padding: '0 16px 100px' }}>
        <div style={{ position: 'relative' }}>
          {todayEvents.map((e, i) => (
            <div key={e.id} style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
              <div style={{ width: 48, paddingTop: 12, textAlign: 'right' }}>
                <div className="mono num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{e.time}</div>
                <div className="mono num" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{e.dur}</div>
              </div>
              <div style={{ flex: 1, background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)',
                            padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: e.color }} />
                <div style={{ flex: 1 }}>
                  <div className="title" style={{ fontSize: 15 }}>{e.title}</div>
                  <div className="meta">{CAT_EMOJI[e.tag] || '📌'} {e.tag}</div>
                </div>
                <Avatar id={e.who} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 5) LOKI (Mascotas)
// ─────────────────────────────────────────────────────────
function ScreenLoki({ state }) {
  const { pet, togglePetWalk, togglePetMeal } = state;
  const walkedToday = pet.walks.filter(w => w.done).length;
  const totalWalks = pet.walks.length;
  const totalWalkMin = pet.walks.filter(w => w.done).reduce((a,w) => a + parseInt(w.dur), 0);

  return (
    <div className="screen-fade">
      <MHeader
        eyebrow="MASCOTA"
        title="Loki"
        right={<span className="chip">🦴 happy</span>}
      />

      {/* Pet hero */}
      <div style={{ margin: '0 16px 18px', padding: '20px', background: 'var(--accent-soft)', borderRadius: 24, border: '1px solid var(--line)',
                    position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 84, height: 84, borderRadius: 24, background: 'var(--surface)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52,
                        border: '1px solid var(--line)' }}>🐕</div>
          <div style={{ flex: 1 }}>
            <div className="display" style={{ fontSize: 32, fontWeight: 700 }}>{pet.name}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{pet.breed} · {pet.age} · {pet.weight}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 18 }}>
          <div style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: 14 }}>
            <div className="display num" style={{ fontSize: 22, fontWeight: 700 }}>{walkedToday}/{totalWalks}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-2)' }}>paseos hoy</div>
          </div>
          <div style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: 14 }}>
            <div className="display num" style={{ fontSize: 22, fontWeight: 700 }}>{totalWalkMin}<span style={{ fontSize: 12, fontWeight: 500 }}>m</span></div>
            <div style={{ fontSize: 11, color: 'var(--ink-2)' }}>minutos fuera</div>
          </div>
          <div style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: 14 }}>
            <div className="display num" style={{ fontSize: 22, fontWeight: 700 }}>{pet.vet.daysLeft}<span style={{ fontSize: 12, fontWeight: 500 }}>d</span></div>
            <div style={{ fontSize: 11, color: 'var(--ink-2)' }}>al vet</div>
          </div>
        </div>
      </div>

      {/* Walks */}
      <div className="section-h">
        <div className="h">Paseos de hoy</div>
        <div className="chip">{walkedToday} / {totalWalks}</div>
      </div>
      <div style={{ margin: '0 16px 8px', background: 'var(--surface)', borderRadius: 18, border: '1px solid var(--line)', overflow: 'hidden' }}>
        {pet.walks.map((w, i) => (
          <div key={w.id} className={'row' + (w.done ? ' done' : '')}
               style={{ borderTop: i === 0 ? 'none' : '1px solid var(--line)' }}>
            <Check on={w.done} onToggle={() => togglePetWalk(w.id)} />
            <span style={{ fontSize: 22 }}>🚶</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="title" style={{ fontSize: 15 }}>{w.label}</div>
              <div className="meta">{w.when} · {w.dur}</div>
            </div>
            <Avatar id={w.who} size="xs" />
          </div>
        ))}
      </div>

      {/* Meals */}
      <div className="section-h">
        <div className="h">Comidas</div>
        <div className="chip">{pet.meals.filter(m => m.done).length} / {pet.meals.length}</div>
      </div>
      <div style={{ margin: '0 16px 8px', background: 'var(--surface)', borderRadius: 18, border: '1px solid var(--line)', overflow: 'hidden' }}>
        {pet.meals.map((m, i) => (
          <div key={m.id} className={'row' + (m.done ? ' done' : '')}
               style={{ borderTop: i === 0 ? 'none' : '1px solid var(--line)' }}>
            <Check on={m.done} onToggle={() => togglePetMeal(m.id)} />
            <span style={{ fontSize: 22 }}>🥣</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="title" style={{ fontSize: 15 }}>{m.label}</div>
              <div className="meta">{m.when} · {m.amount}</div>
            </div>
            <Avatar id={m.who} size="xs" />
          </div>
        ))}
      </div>

      {/* Vet card */}
      <div className="section-h">
        <div className="h">Próxima visita</div>
      </div>
      <div style={{ margin: '0 16px 100px', padding: '16px 18px', background: 'var(--surface)', borderRadius: 18, border: '1px solid var(--line)',
                    display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontSize: 30 }}>💉</div>
        <div style={{ flex: 1 }}>
          <div className="title" style={{ fontSize: 15 }}>{pet.vet.next}</div>
          <div className="meta">{pet.vet.date} · faltan {pet.vet.daysLeft} días</div>
        </div>
        <button className="btn ghost" style={{ height: 32, fontSize: 13 }}>recordar</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Mobile App wrapper — bottom tabs + screen routing
// ─────────────────────────────────────────────────────────
function MobileApp({ initialTab = 'hoy', state }) {
  const [tab, setTab] = React.useState(initialTab);
  const [fabOpen, setFabOpen] = React.useState(false);

  const tabs = [
    { id: 'hoy',         label: 'Hoy',       icon: '☀️' },
    { id: 'compra',      label: 'Compra',    icon: '🛒' },
    { id: 'tareas',      label: 'Tareas',    icon: '✓'  },
    { id: 'calendario',  label: 'Calendario',icon: '📅' },
    { id: 'loki',        label: 'Loki',      icon: '🐕' },
  ];

  const Screen = ({
    hoy:        ScreenHoy,
    compra:     ScreenCompra,
    tareas:     ScreenTareas,
    calendario: ScreenCalendario,
    loki:       ScreenLoki,
  })[tab];

  const fabLabel = {
    hoy: '+', compra: '+', tareas: '+', calendario: '+', loki: '+',
  }[tab];

  return (
    <div className="cloe" data-confetti-host
         style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                  background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      {/* status bar spacer */}
      <div style={{ height: 56 }} />

      {/* Content */}
      <div key={tab} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <Screen state={state} />
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => setFabOpen(o => !o)} aria-label="añadir">
        <span style={{ transform: fabOpen ? 'rotate(45deg)' : 'none', transition: 'transform 200ms' }}>+</span>
      </button>

      {/* FAB menu */}
      {fabOpen && (
        <div style={{ position: 'absolute', right: 18, bottom: 176,
                      display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          {[
            { l: 'Tarea',       e: '✓'  },
            { l: 'Producto',    e: '🛒' },
            { l: 'Evento',      e: '📅' },
            { l: 'Paseo Loki',  e: '🐕' },
          ].map(o => (
            <button key={o.l} className="btn" style={{ background: 'var(--surface)', color: 'var(--ink)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid var(--line)' }}>
              <span>{o.e}</span> {o.l}
            </button>
          ))}
        </div>
      )}

      {/* Bottom tabs */}
      <div className="tabs" style={{ paddingBottom: 28 }}>
        {tabs.map(t => (
          <button key={t.id} className={'tab' + (tab === t.id ? ' on' : '')} onClick={() => { setTab(t.id); setFabOpen(false); }}>
            <span className="tab-i">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  ScreenHoy, ScreenCompra, ScreenTareas, ScreenCalendario, ScreenLoki,
  MobileApp,
});
