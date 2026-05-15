// desktop.jsx — Desktop dashboard for CLOE
// Sidebar + main grid: timeline / tasks board / weekly ranking / shopping / pet / reminders

function DesktopApp({ state }) {
  const { today, week, shop, events, pet, scores, toggleTodayTask, toggleWeekTask, toggleShop, togglePetWalk } = state;
  const todayDone = today.filter(t => t.done).length;
  const pct = Math.round((todayDone / today.length) * 100);

  return (
    <div className="cloe desk-grid" data-confetti-host>
      {/* ── Sidebar ── */}
      <aside className="desk-side">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 24px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--accent)',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, letterSpacing: '-0.04em' }}>cl</div>
          <div>
            <div className="display" style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.03em' }}>CLOE</div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>te organiza</div>
          </div>
        </div>

        <div style={{ fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 12px 6px' }}>Casa</div>
        {[
          { e: '☀️', l: 'Hoy',        on: true },
          { e: '✓',  l: 'Tareas' },
          { e: '🛒', l: 'Compra' },
          { e: '📅', l: 'Calendario' },
          { e: '🐕', l: 'Loki' },
          { e: '🔔', l: 'Recordatorios' },
        ].map(n => (
          <div key={n.l} className={'nav-i' + (n.on ? ' on' : '')}>
            <span className="e">{n.e}</span>{n.l}
          </div>
        ))}

        <div style={{ fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '20px 12px 6px' }}>Familia</div>
        {MEMBERS.map(m => (
          <div key={m.id} className="nav-i" style={{ paddingTop: 6, paddingBottom: 6 }}>
            <Avatar id={m.id} size="xs" />
            <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span>{m.name}</span>
              <span className="mono num" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                {scores.find(s => s.id === m.id)?.done}
              </span>
            </div>
          </div>
        ))}

        <div style={{ flex: 1 }} />
        <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 14, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.4 }}>
          <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>Casa Vargas-Soler</div>
          4 miembros · Madrid
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="desk-main">
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>VIERNES · 15 MAYO · 2026</div>
            <h1 className="display" style={{ fontSize: 56, margin: 0, fontWeight: 700, letterSpacing: 'var(--tracking-display)' }}>
              Hoy en casa
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn ghost">🔍 Buscar</button>
            <button className="btn accent">+ Nueva tarea</button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
          {/* Hero stat */}
          <div className="card" style={{ padding: '22px 24px', display: 'flex', alignItems: 'flex-end', gap: 20 }}>
            <div style={{ flex: 1 }}>
              <div className="eyebrow">PROGRESO DE HOY</div>
              <div className="display" style={{ fontSize: 76, fontWeight: 700, lineHeight: 0.9, marginTop: 4 }}>
                <span style={{ color: 'var(--accent)' }}>{todayDone}</span>
                <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>/{today.length}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>tareas hechas hoy</div>
            </div>
            <div style={{ width: 110, height: 110, position: 'relative' }}>
              <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }} width="110" height="110">
                <circle cx="50" cy="50" r="42" stroke="var(--surface-2)" strokeWidth="10" fill="none" />
                <circle cx="50" cy="50" r="42" stroke="var(--accent)" strokeWidth="10" fill="none"
                  strokeDasharray={2 * Math.PI * 42}
                  strokeDashoffset={2 * Math.PI * 42 * (1 - pct/100)}
                  strokeLinecap="round" />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700 }}>{pct}%</div>
            </div>
          </div>

          {[
            { label: 'COMPRA',    val: shop.filter(s => !s.done).length, sub: 'ítems pendientes', emoji: '🛒' },
            { label: 'EVENTOS',   val: events.length, sub: 'en la agenda', emoji: '📅' },
            { label: 'PASEOS',    val: `${pet.walks.filter(w => w.done).length}/${pet.walks.length}`, sub: 'de Loki hoy', emoji: '🐕' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '22px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div className="eyebrow">{s.label}</div>
                <span style={{ fontSize: 18 }}>{s.emoji}</span>
              </div>
              <div className="display num" style={{ fontSize: 44, fontWeight: 700, marginTop: 12 }}>{s.val}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Two-column body */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, marginBottom: 16 }}>

          {/* ── Tasks board by person ── */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="display" style={{ fontSize: 22, fontWeight: 700 }}>Tareas por persona</div>
              <div className="meta">esta semana</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
              {MEMBERS.map(m => {
                const mine = week.filter(t => t.who === m.id);
                const todayMine = today.filter(t => t.who === m.id);
                const all = [...todayMine, ...mine];
                return (
                  <div key={m.id} style={{ background: 'var(--bg)', borderRadius: 14, padding: 12, minHeight: 220 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <Avatar id={m.id} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                        <div className="meta" style={{ fontSize: 11 }}>{all.filter(t => !t.done).length} pendientes</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {all.slice(0, 5).map(t => (
                        <div key={t.id} onClick={() => t.day ? toggleWeekTask(t.id) : toggleTodayTask(t.id)}
                             className={t.done ? 'done' : ''}
                             style={{
                          background: 'var(--surface)', padding: '8px 10px', borderRadius: 10,
                          border: '1px solid var(--line)', fontSize: 12, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6,
                          opacity: t.done ? 0.55 : 1,
                          textDecoration: t.done ? 'line-through' : 'none',
                        }}>
                          <span style={{ fontSize: 14 }}>{t.emoji}</span>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                          {t.time && <span className="mono num" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{t.time}</span>}
                          {t.day && <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{t.day}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Timeline ── */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="display" style={{ fontSize: 22, fontWeight: 700 }}>Hoy · timeline</div>
              <div className="meta">{events.length}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {events.slice().sort((a,b) => a.time.localeCompare(b.time)).map(e => (
                <div key={e.id} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 42, paddingTop: 4 }}>
                    <div className="mono num" style={{ fontSize: 12, fontWeight: 600 }}>{e.time}</div>
                    <div className="mono num" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{e.dur}</div>
                  </div>
                  <div style={{ flex: 1, padding: '10px 12px', background: 'var(--bg)', borderRadius: 12,
                                position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: e.color }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{e.title}</div>
                      <Avatar id={e.who} size="xs" />
                    </div>
                    <div className="meta" style={{ fontSize: 11 }}>{e.tag}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Third row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

          {/* Ranking */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="display" style={{ fontSize: 18, fontWeight: 700 }}>Ranking</div>
              <div className="meta">semana</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {scores.slice().sort((a,b) => b.done - a.done).map((s, i) => {
                const m = memberById(s.id);
                const p = (s.done / s.total) * 100;
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="display" style={{ width: 18, fontSize: 16, color: 'var(--ink-3)', fontWeight: 700 }}>{i+1}</div>
                    <Avatar id={s.id} size="xs" />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{m.name}{i === 0 && ' 👑'}</span>
                        <span className="mono num" style={{ fontSize: 11, color: 'var(--ink-2)' }}>{s.done}/{s.total}</span>
                      </div>
                      <div className="bar" style={{ marginTop: 4, height: 5 }}><i style={{ width: p+'%', background: m.color }} /></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Compra preview */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="display" style={{ fontSize: 18, fontWeight: 700 }}>Compra</div>
              <div className="meta">{shop.filter(s => !s.done).length} pendientes</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {shop.slice(0, 6).map(s => (
                <div key={s.id} onClick={() => toggleShop(s.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer',
                           opacity: s.done ? 0.5 : 1, textDecoration: s.done ? 'line-through' : 'none' }}>
                  <Check on={s.done} onToggle={() => toggleShop(s.id)} />
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{s.name}</span>
                  <span className="meta" style={{ fontSize: 11 }}>{s.qty}</span>
                </div>
              ))}
            </div>
            <button className="btn ghost" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}>Ver toda la lista →</button>
          </div>

          {/* Loki */}
          <div className="card" style={{ padding: '20px 22px', background: 'var(--accent-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="display" style={{ fontSize: 18, fontWeight: 700 }}>Loki 🐕</div>
              <div className="meta">{pet.walks.filter(w => w.done).length}/{pet.walks.length}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pet.walks.map(w => (
                <div key={w.id} onClick={() => togglePetWalk(w.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                           background: 'var(--surface)', borderRadius: 10, cursor: 'pointer',
                           opacity: w.done ? 0.6 : 1 }}>
                  <Check on={w.done} onToggle={() => togglePetWalk(w.id)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, textDecoration: w.done ? 'line-through' : 'none' }}>{w.label}</div>
                    <div className="meta" style={{ fontSize: 11 }}>{w.when} · {w.dur}</div>
                  </div>
                  <Avatar id={w.who} size="xs" />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--surface)', borderRadius: 10,
                          display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>💉</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{pet.vet.next}</div>
                <div className="meta" style={{ fontSize: 11 }}>en {pet.vet.daysLeft} días</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer marquee */}
        <div style={{ marginTop: 24, padding: '14px 22px', background: 'var(--ink)', color: 'var(--bg)',
                      borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="display" style={{ fontSize: 16, fontWeight: 600 }}>
            “Carlos sacó la basura. La casa lo agradece.” — Loki, presumiblemente.
          </div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>v 1.0 · te organiza</div>
        </div>
      </main>
    </div>
  );
}

Object.assign(window, { DesktopApp });
