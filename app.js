// CLOE te organiza · lógica principal de la app

const me = requireUser();
if (!me) throw new Error('no user');

// PWA service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// Debounce util
function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// Update STATE optimistically + UI without re-fetching everything
function patchState(table, id, patch) {
  const map = { tasks: 'tasks', shopping: 'shopping', events: 'events', cloe_walks: 'cloeWalks', cloe_downs: 'cloeDowns' };
  const key = map[table];
  if (!key || !STATE[key]) return;
  const idx = STATE[key].findIndex(x => x.id === id);
  if (idx >= 0) STATE[key][idx] = { ...STATE[key][idx], ...patch };
}
// Bloquea el submit de un form mientras la promesa esté en vuelo
async function withFormLock(form, fn) {
  const btn = form.querySelector('button[type="submit"]');
  if (form.dataset.busy === '1') return;
  form.dataset.busy = '1';
  if (btn) btn.disabled = true;
  try { return await fn(); }
  finally {
    form.dataset.busy = '';
    if (btn) btn.disabled = false;
  }
}

function removeFromState(table, id) {
  const map = { tasks: 'tasks', shopping: 'shopping', events: 'events', cloe_walks: 'cloeWalks', cloe_downs: 'cloeDowns' };
  const key = map[table];
  if (!key || !STATE[key]) return;
  STATE[key] = STATE[key].filter(x => x.id !== id);
}

// ── Estado ───────────────────────────────────────────────
async function insertTask(payload) {
  const result = await db.from('tasks').insert(payload);
  if (!result.error) return result;

  const msg = result.error.message || '';
  if (!/(room|subcategory|schema cache|column)/i.test(msg)) return result;

  const { room, subcategory, ...fallback } = payload;
  return db.from('tasks').insert(fallback);
}

const STATE = { users: [], tasks: [], shopping: [], events: [], cloeWalks: [], cloeDowns: [] };
let activeTab = 'hoy';
let tasksScope = 'today';
const calDate = new Date(); calDate.setDate(1);

// ── Refs ─────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ── Header de usuario ────────────────────────────────────
$('user-av').outerHTML = avatarHTML(me, 'sm').replace('<span ', '<span id="user-av" ');
$('user-name').textContent = me.name;
if (me.role === 'Admin') $('nav-admin').style.display = '';
$('logout').addEventListener('click', () => { clearUser(); window.location.href = 'index.html'; });

// ── Dark mode ────────────────────────────────────────────
const THEME_KEY = 'cloe-theme';
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const btn = $('theme-toggle');
  if (btn) btn.textContent = t === 'dark' ? '☀️' : '🌙';
}
applyTheme(localStorage.getItem(THEME_KEY) || 'light');
$('theme-toggle')?.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

// ── Saludo ───────────────────────────────────────────────
function renderGreeting() {
  const h = new Date().getHours();
  const hi = h < 6 ? 'Modo ninja nocturno' : h < 13 ? 'Buenos días, máquina' : h < 21 ? 'Buenas tardes, crack' : 'Buenas noches, leyenda';
  $('greeting').textContent = `${hi}, ${me.name.split(' ')[0]}`;
  const fecha = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  $('today-eyebrow').textContent = fecha.toUpperCase();
}

// ── Tabs ─────────────────────────────────────────────────
$$('.tabs > .tab[data-tab]').forEach(b => b.addEventListener('click', () => {
  activeTab = b.dataset.tab;
  $$('.tabs > .tab[data-tab]').forEach(x => x.classList.toggle('active', x.dataset.tab === activeTab));
  $$('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + activeTab));
  if (location.hash !== '#' + activeTab) history.replaceState(null, '', '#' + activeTab);
}));
const initTab = (location.hash || '#hoy').slice(1);
if (['hoy','tareas','cloe','compra','calendario','stats'].includes(initTab)) {
  document.querySelector(`.tab[data-tab="${initTab}"]`)?.click();
}

// ── Tabs internas (Tareas: Hoy / Semana) ─────────────────
$$('.tab[data-scope]').forEach(b => b.addEventListener('click', () => {
  tasksScope = b.dataset.scope;
  $$('.tab[data-scope]').forEach(x => x.classList.toggle('active', x.dataset.scope === tasksScope));
  // Actualizar título de la sección
  $('tasks-section-title').textContent = tasksScope === 'today' 
    ? 'Misiones completadas hoy' 
    : 'Mapa semanal de misiones';
  renderTasks();
}));

// ── Tabs internas (Cloe: Pasear / Bajar) ─────────────────
$$('.tab[data-cloe-tab]').forEach(b => b.addEventListener('click', () => {
  const cloeTab = b.dataset.cloeTab;
  $$('.tab[data-cloe-tab]').forEach(x => x.classList.toggle('active', x.dataset.cloeTab === cloeTab));
  $$('.cloe-panel').forEach(p => p.classList.toggle('hidden', p.id !== 'cloe-' + cloeTab));
}));

// Función para abrir subventana de Cloe desde el modal de tareas
function openCloeSubwindowFromModal(sub = 'pasear') {
  modal.classList.add('hidden');
  document.querySelector('.tab[data-tab="cloe"]')?.click();
  document.querySelector(`.tab[data-cloe-tab="${sub}"]`)?.click();
}

// ── Modal ────────────────────────────────────────────────
const modal = $('modal'), modalBody = $('modal-body');
$('modal-close').addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !modal.classList.contains('hidden')) modal.classList.add('hidden');
});

// ── Editor de eventos (modal) ────────────────────────────
function openEventEditor(event, date, color) {
  const isEdit = !!event;
  const lightColor = getLightColor(color);
  
  modalBody.innerHTML = `
    <h3>${isEdit ? 'Editar evento' : 'Nuevo evento'}</h3>
    <form id="event-editor-form" style="margin-top:18px;">
      <input type="hidden" name="id" value="${esc(event?.id || '')}">
      <label><span>Título</span><input type="text" name="title" value="${esc(event?.title || '')}" required></label>
      <label><span>Fecha</span><input type="date" name="date" value="${event?.date || date}" required></label>
      <label><span>Hora</span><input type="time" name="time" value="${esc(event?.time || '')}"></label>
      <label><span>Categoría</span>
        <select name="category">
          ${CATEGORIES_EVENT.map(c => `<option value="${c.id}" ${event?.category === c.id ? 'selected' : ''}>${c.emoji} ${c.label}</option>`).join('')}
        </select>
      </label>
      <label><span>Asignado a</span>
        <select name="assignee">
          <option value="">Sin asignar</option>
          ${STATE.users.map(u => `<option value="${u.id}" ${event?.assignee === u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}
        </select>
      </label>
      <div class="form-row">
        <label><span>Color (usuario)</span>
          <div style="display:flex;align-items:center;gap:10px;margin-top:8px;">
            <span class="av av-${color}" style="width:32px;height:32px;font-size:14px;">${event ? (STATE.users.find(u => u.id === event.assignee)?.member_id || '?') : (STATE.users.find(u => u.id === me.id)?.member_id || '?')}</span>
            <span class="muted">${event ? (STATE.users.find(u => u.id === event.assignee)?.name || 'Sin asignar') : (STATE.users.find(u => u.id === me.id)?.name || me.name)}</span>
          </div>
        </label>
        <label><span>Vista previa del color</span>
          <div style="display:flex;align-items:center;gap:10px;margin-top:8px;">
            <div style="width:32px;height:32px;border-radius:50%;background:${lightColor};border:1px solid var(--line);"></div>
            <span class="muted">Color del evento</span>
          </div>
        </label>
      </div>
      <div class="form-actions" style="margin-top:18px;">
        ${isEdit ? '<button type="button" class="btn danger" id="delete-event-btn">Eliminar</button>' : ''}
        <button type="button" class="btn ghost" id="cancel-event-edit">Cancelar</button>
        <button type="submit" class="btn accent">${isEdit ? 'Guardar cambios' : 'Añadir'}</button>
      </div>
    </form>
  `;
  
  modal.classList.remove('hidden');
  
  // Manejar envío del formulario
  $('event-editor-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    const payload = {
      title: data.title.trim(),
      date: data.date,
      time: data.time || null,
      category: data.category || 'general',
      assignee: data.assignee || null,
    };
    
    if (!payload.title || !payload.date) {
      showToast('Título y fecha son obligatorios');
      return;
    }
    
    let error;
    if (isEdit) {
      const result = await db.from('events').update(payload).eq('id', data.id);
      error = result.error;
    } else {
      const result = await db.from('events').insert(payload);
      error = result.error;
    }
    
    if (error) {
      showToast('Error: ' + error.message);
      return;
    }
    
    modal.classList.add('hidden');
    loadAll();
  });
  
  // Manejar cancelación
  $('cancel-event-edit').addEventListener('click', () => {
    modal.classList.add('hidden');
  });
  
  // Manejar eliminación (solo edición)
  if (isEdit) {
    $('delete-event-btn').addEventListener('click', async () => {
      await db.from('events').delete().eq('id', event.id);
      modal.classList.add('hidden');
      loadAll();
    });
  }
}

// ── Carga ────────────────────────────────────────────────
async function loadAll() {
  const [u, t, s, e, cw, cd] = await Promise.all([
    db.from('users').select('id,name,email,role,member_id,color,status').order('name'),
    db.from('tasks').select('*').order('done').order('due_date',{nullsFirst:false}).order('due_time',{nullsFirst:true}),
    db.from('shopping').select('*').order('done').order('category').order('created_at'),
    db.from('events').select('*').order('date').order('time',{nullsFirst:true}),
    db.from('cloe_walks').select('*').order('datetime', { ascending: false }),
    db.from('cloe_downs').select('*').order('datetime', { ascending: false }),
  ]);
  STATE.users = (u.data || []).filter(x => x.status === 'active');
  STATE.tasks = t.data || [];
  STATE.shopping = s.data || [];
  STATE.events = e.data || [];
  STATE.cloeWalks = cw.data || [];
  STATE.cloeDowns = cd.data || [];
  renderAll();
}

function renderAll() {
  renderGreeting();
  fillSelects();
  renderStats();
  renderHoy();
  // Inicializar título de la sección de tareas
  $('tasks-section-title').textContent = tasksScope === 'today' 
    ? 'Misiones completadas hoy' 
    : 'Mapa semanal de misiones';
  renderTasks();
  renderShop();
  renderCalendar();
  renderUpcomingEvents();
  renderCloe();
  renderStatsPanel();
}

// ── STATS / RANKING semanal ──────────────────────────────
function renderStatsPanel() {
  const ranking = $('stats-ranking');
  const summary = $('stats-summary');
  const bars = $('stats-week-bars');
  if (!ranking || !bars) return;

  // Ventana últimos 7 días (incluyendo hoy)
  const now = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const inWindow = (iso) => iso && days.includes(iso.slice(0, 10));

  // Conteo por usuario
  const byUser = new Map();
  STATE.users.forEach(u => byUser.set(u.id, 0));
  STATE.tasks.forEach(t => {
    if (t.done && inWindow(t.done_at) && t.assignee && byUser.has(t.assignee)) {
      byUser.set(t.assignee, byUser.get(t.assignee) + 1);
    }
  });

  const total = [...byUser.values()].reduce((a, b) => a + b, 0);
  summary.textContent = total ? `${total} misiones tachadas` : 'Marcador a cero, empieza la remontada';

  const ordered = [...byUser.entries()]
    .map(([id, count]) => ({ user: STATE.users.find(u => u.id === id), count }))
    .filter(x => x.user)
    .sort((a, b) => b.count - a.count);

  const max = Math.max(1, ...ordered.map(x => x.count));
  ranking.innerHTML = ordered.length
    ? ordered.map((x, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '·';
        const pct = Math.round((x.count / max) * 100);
        return `
          <div class="row">
            <span class="row-emoji" style="font-size:20px;">${medal}</span>
            ${avatarHTML(x.user, 'sm')}
            <span class="row-title">${esc(x.user.name)}</span>
            <div class="stat-bar"><div class="stat-bar-fill" style="width:${pct}%;"></div></div>
            <span class="row-time">${x.count}</span>
          </div>`;
      }).join('')
    : '<p class="empty">El ranking está virgen. Una misión y ya hay pique sano.</p>';

  // Barras por día
  const byDay = days.map(iso => ({
    iso,
    label: WEEKDAYS[(new Date(iso + 'T00:00').getDay() + 6) % 7],
    count: STATE.tasks.filter(t => t.done && t.done_at && t.done_at.slice(0, 10) === iso).length,
  }));
  const maxDay = Math.max(1, ...byDay.map(d => d.count));
  bars.innerHTML = byDay.map(d => `
    <div class="bar-col">
      <div class="bar-val">${d.count}</div>
      <div class="bar"><div class="bar-fill" style="height:${(d.count / maxDay) * 100}%;"></div></div>
      <div class="bar-label">${d.label}</div>
    </div>
  `).join('');
}

// ── Selects de categorías y asignados ────────────────────
function fillSelects() {
  const evCats   = CATEGORIES_EVENT.map(c => `<option value="${c.id}">${c.emoji} ${c.label}</option>`).join('');
  const memOpts  = '<option value="">Sin asignar</option>' +
    STATE.users.map(u => `<option value="${u.id}">${esc(u.name)}</option>`).join('');

  $('qa-ev-cat').innerHTML   = evCats;
  $('qa-ev-assignee').innerHTML   = memOpts;
  $('cloe-walk-walker').innerHTML = memOpts;
  $('cloe-down-person').innerHTML = memOpts;
}

// ── Stats hero ───────────────────────────────────────────
function renderStats() {
  const today = todayISO();
  const todayTasks = STATE.tasks.filter(t => t.scope === 'today' && t.due_date === today);
  const todayDone = todayTasks.filter(t => t.done).length;
  $('stat-tasks-today').textContent = `${todayDone}/${todayTasks.length}`;
  $('stat-tasks-pending').textContent = STATE.tasks.filter(t => !t.done).length;
  $('stat-shop').textContent = STATE.shopping.filter(s => !s.done).length;
  $('stat-events').textContent = STATE.events.filter(e => e.date === today).length;
}

// ── HOY (solo eventos próximos) ──────────────────────────
function renderHoy() {
  const today = todayISO();
  const upcoming = STATE.events.filter(e => e.date >= today).slice(0, 5);
  $('hoy-events-list').innerHTML = upcoming.length
    ? upcoming.map(eventRowHTML).join('')
    : '<p class="empty">Semana tranquilita. Sospechosamente tranquilita.</p>';
  wireEventRows($('hoy-events-list'));
}

// ── TAREAS ───────────────────────────────────────────────
function taskRowHTML(t) {
  const user = STATE.users.find(u => u.id === t.assignee);
  const emoji = t.emoji || '✨';
  const roomInfo = t.room ? TASK_ROOMS.find(r => r.id === t.room) : null;
  const subcatInfo = t.subcategory && TASK_SUBCATEGORIES[t.room]
    ? TASK_SUBCATEGORIES[t.room].find(s => s.id === t.subcategory)
    : null;
  
  const today = todayISO();
  const overdue = !t.done && t.due_date && t.due_date < today;
  
  // Para vista semanal: mostrar día de la semana y fecha completa
  // Para vista hoy: mostrar hora si existe
  const dueLabel = t.scope === 'week'
    ? (t.weekday ? `<span class="chip">${t.weekday}</span>` : '') + (t.due_date ? `<span class="chip muted" style="font-size:10px;">${fmtDate(t.due_date)}</span>` : '')
    : (t.due_date ? `<span class="chip ${overdue ? 'row-due-overdue' : ''}">${fmtDate(t.due_date)}</span>` : '');
  
  const timeLabel = t.due_time ? `<span class="row-time">${esc(t.due_time)}</span>` : '';
  
  const roomBadge = roomInfo ? `<span class="chip" style="background:var(--surface-2);font-size:11px;">${roomInfo.emoji} ${roomInfo.label}</span>` : '';
  const subcatBadge = subcatInfo ? `<span class="chip" style="background:var(--surface-2);font-size:11px;">${subcatInfo.emoji} ${subcatInfo.label}</span>` : '';
  
  return `
    <div class="row ${t.done ? 'done' : ''}" data-task-id="${esc(t.id)}">
      <button class="check ${t.done ? 'on' : ''}" data-toggle-task="${esc(t.id)}" aria-label="Marcar">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7.5l3 3 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <span class="row-emoji" style="font-size:18px;">${emoji}</span>
      <span class="row-title" data-edit-task="${esc(t.id)}" title="Doble clic para editar">${esc(t.title)}</span>
      <span class="row-meta">
        ${timeLabel}
        ${dueLabel}
        ${roomBadge}
        ${subcatBadge}
        ${avatarHTML(user, 'xs')}
        <button class="icon-btn danger" data-del-task="${esc(t.id)}" aria-label="Eliminar">🗑</button>
      </span>
    </div>`;
}

function renderTasks() {
  const today = todayISO();
  
  if (tasksScope === 'today') {
    // Hoy: solo tareas realizadas hoy (para historial)
    const list = STATE.tasks.filter(t => 
      t.scope === 'today' && 
      t.done && 
      t.done_at && 
      t.done_at.startsWith(today)
    );
    $('tasks-list').innerHTML = list.length
      ? list.map(taskRowHTML).join('')
      : '<p class="empty">Hoy nadie ha desbloqueado logros todavía.</p>';
  } else {
    // Semana: calendario semanal de tareas realizadas
    // Agrupar tareas por día de la semana
    const weekDays = [];
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = WEEKDAYS_FULL[d.getDay() === 0 ? 6 : d.getDay() - 1];
      
      // Tareas realizadas en este día
      const dayTasks = STATE.tasks.filter(t => 
        t.scope === 'today' && 
        t.done && 
        t.done_at && 
        t.done_at.startsWith(dateStr)
      );
      
      weekDays.push({
        date: dateStr,
        dayName: dayName,
        tasks: dayTasks
      });
    }
    
    // Renderizar calendario semanal
    $('tasks-list').innerHTML = weekDays.map(day => `
      <div style="margin-bottom:20px;">
        <h4 style="margin-bottom:10px;font-size:14px;color:var(--muted);">${day.dayName} ${day.date.slice(5)}</h4>
        ${day.tasks.length
          ? day.tasks.map(taskRowHTML).join('')
          : '<p class="empty mini-empty">Sin hazañas por aquí</p>'
        }
      </div>
    `).join('');
  }
  wireTaskRows($('tasks-list'));
}

function wireTaskRows(root) {
  $$('[data-toggle-task]', root).forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.toggleTask;
    const t = STATE.tasks.find(x => x.id === id);
    if (!t) return;
    const patch = { done: !t.done, done_at: !t.done ? new Date().toISOString() : null };
    patchState('tasks', id, patch);
    renderAll();
    const { error } = await db.from('tasks').update(patch).eq('id', id);
    if (error) { showToast('Error: ' + error.message); loadAll(); }
  }));
  $$('[data-del-task]', root).forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.delTask;
    removeFromState('tasks', id);
    renderAll();
    const { error } = await db.from('tasks').delete().eq('id', id);
    if (error) { showToast('Error: ' + error.message); loadAll(); }
  }));
  $$('[data-edit-task]', root).forEach(el => el.addEventListener('dblclick', () => {
    const id = el.dataset.editTask;
    const original = el.textContent;
    el.contentEditable = 'true'; el.focus();
    const sel = window.getSelection(), range = document.createRange();
    range.selectNodeContents(el); sel.removeAllRanges(); sel.addRange(range);
    const save = async () => {
      el.contentEditable = 'false';
      const nt = el.textContent.trim();
      if (nt && nt !== original) { await db.from('tasks').update({ title: nt }).eq('id', id); loadAll(); }
      else el.textContent = original;
    };
    el.addEventListener('blur', save, { once: true });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
      if (e.key === 'Escape') { el.textContent = original; el.blur(); }
    });
  }));
}

// ── Modal de Tareas con ventanas y subventanas ────────────
let taskModalState = { room: null, subcategory: null, date: null, assignee: '' };

function openTaskModal() {
  const today = todayISO();
  const isWeekScope = tasksScope === 'week';
  
  // Generar días de la semana para vista semanal
  const weekDays = [];
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    weekDays.push({
      date: d.toISOString().split('T')[0],
      dayName: WEEKDAYS_FULL[d.getDay() === 0 ? 6 : d.getDay() - 1],
      shortDay: WEEKDAYS[d.getDay() === 0 ? 6 : d.getDay() - 1]
    });
  }

  modalBody.innerHTML = `
    <h3>📋 Nueva misión doméstica</h3>
    <p class="muted" style="margin-bottom:20px;">Elige zona, marca objetivos y suma puntos de gloria familiar.</p>
    
    <!-- Paso 1: Habitaciones -->
    <div id="task-room-grid" class="task-room-grid">
      ${TASK_ROOMS.map(r => `
        <button class="task-room-btn card-sm" data-room="${esc(r.id)}">
          <div class="task-room-emoji">${r.emoji}</div>
          <div class="task-room-label">${esc(r.label)}</div>
        </button>
      `).join('')}
    </div>

    <!-- Paso 2: Subcategorías -->
    <div id="task-subcat-section" class="hidden task-subcat-section">
      <p class="eyebrow" style="margin-bottom:12px;">Elige el reto:</p>
      <div id="task-subcat-grid" class="task-subcat-grid"></div>
    </div>
    
    <!-- Paso 3: Fecha y asignación -->
    <div id="task-details-section" class="hidden" style="border-top:1px solid var(--line);padding-top:20px;">
      <p class="eyebrow" style="margin-bottom:12px;">Plan de ataque:</p>
      
      ${isWeekScope ? `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;" id="task-week-days">
          ${weekDays.map(d => `
            <button class="chip day-chip" data-date="${d.date}" style="cursor:pointer;">
              ${d.shortDay} ${d.date.slice(5)}
            </button>
          `).join('')}
        </div>
      ` : `
        <label style="margin-bottom:16px;">
          <span>Fecha</span>
          <input type="date" id="task-date-input" value="${today}" style="width:100%;">
        </label>
      `}
      
      <label style="margin-bottom:16px;">
        <span>Héroe asignado</span>
        <select id="task-assignee-select" style="width:100%;">
          ${STATE.users.map(u => `<option value="${u.id}" ${u.id === me.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}
        </select>
      </label>
      
      <div class="form-actions">
        <button type="button" class="btn ghost" id="cancel-task-modal">Me lo pienso</button>
        <button type="button" class="btn accent" id="save-task-btn">✓ Lanzar misión</button>
      </div>
    </div>
  `;
  
  modal.classList.remove('hidden');
  taskModalState = { room: null, subcategory: null, subcategories: [], date: isWeekScope ? weekDays[0].date : today, assignee: me.id };
  const selectedSubcats = new Set();

  // Event listeners para habitaciones
  $$('.task-room-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.task-room-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      taskModalState.room = btn.dataset.room;

      const subcats = TASK_SUBCATEGORIES[taskModalState.room] || [];
      $('task-subcat-grid').innerHTML = subcats.map(s => `
        <button class="task-subcat-btn card-sm" data-subcat="${esc(s.id)}" data-emoji="${esc(s.emoji)}">
          <div class="task-subcat-emoji">${s.emoji}</div>
          <div class="task-subcat-label">${esc(s.label)}</div>
        </button>
      `).join('');
      $('task-subcat-section').classList.remove('hidden');
      taskModalState.subcategory = null;
      taskModalState.subcategories = [];
      selectedSubcats.clear();
      $('task-details-section').classList.add('hidden');
    });
  });

  // Event listeners para subcategorías
  $('task-subcat-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('.task-subcat-btn');
    if (!btn) return;
    const subcatId = btn.dataset.subcat;

    // Caso especial Cloe: al elegir subcategoría se abre la subventana correspondiente
    if (taskModalState.room === 'cloe') {
      openCloeSubwindowFromModal(subcatId);
      return;
    }

    // Resto de habitaciones: selección múltiple
    if (selectedSubcats.has(subcatId)) {
      selectedSubcats.delete(subcatId);
      btn.classList.remove('selected');
    } else {
      selectedSubcats.add(subcatId);
      btn.classList.add('selected');
    }
    taskModalState.subcategories = Array.from(selectedSubcats);
    $('task-details-section').classList.toggle('hidden', selectedSubcats.size === 0);
  });
  
  // Selección de día en modo semanal
  if (isWeekScope) {
    $$('.day-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        $$('.day-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        taskModalState.date = chip.dataset.date;
      });
    });
    // Seleccionar primer día por defecto
    $$('.day-chip')[0]?.classList.add('active');
  }
  
  // Cancelar
  $('cancel-task-modal').addEventListener('click', () => {
    modal.classList.add('hidden');
  });
  
  // Guardar tarea(s)
  $('save-task-btn').addEventListener('click', async () => {
    if (!taskModalState.room || !taskModalState.subcategories?.length) {
      showToast('Elige zona y reto, que la gloria no se autogenera');
      return;
    }
    
    const assignee = $('task-assignee-select').value || me.id;
    const subcats = TASK_SUBCATEGORIES[taskModalState.room];
    
    // Crear una tarea por cada subcategoría seleccionada
    const tasksToCreate = taskModalState.subcategories.map(subcatId => {
      const subcat = subcats.find(s => s.id === subcatId);
      return {
        title: `${subcat.label}`,
        category: subcatId,
        room: taskModalState.room,
        subcategory: subcatId,
        emoji: subcat.emoji,
        assignee: assignee,
        scope: tasksScope,
        due_date: isWeekScope ? null : (taskModalState.date || today),
        weekday: isWeekScope ? WEEKDAYS[new Date(taskModalState.date).getDay() === 0 ? 6 : new Date(taskModalState.date).getDay() - 1] : null
      };
    });
    
    // Insertar todas las tareas
    for (const payload of tasksToCreate) {
      const { error } = await insertTask(payload);
      if (error) {
        showToast('Error: ' + error.message);
        return;
      }
    }
    
    modal.classList.add('hidden');
    loadAll();
  });
}

// Inicializar botón de abrir modal
$('open-task-modal')?.addEventListener('click', openTaskModal);

// ── COMPRA ───────────────────────────────────────────────
function shopRowHTML(s) {
  const user = STATE.users.find(u => u.id === s.added_by);
  return `
    <div class="row ${s.done ? 'done' : ''}" data-shop-id="${esc(s.id)}">
      <button class="check ${s.done ? 'on' : ''}" data-toggle-shop="${esc(s.id)}" aria-label="Marcar">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7.5l3 3 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <span class="row-title" data-edit-shop="${esc(s.id)}" title="Doble clic para editar">${esc(s.name)}</span>
      <span class="row-meta">
        ${s.quantity ? `<span class="row-time">${esc(s.quantity)}</span>` : ''}
        ${avatarHTML(user, 'xs')}
        <button class="icon-btn danger" data-del-shop="${esc(s.id)}" aria-label="Eliminar">🗑</button>
      </span>
    </div>`;
}

let shopFilter = '';
function renderShop() {
  const q = shopFilter.trim().toLowerCase();
  const match = (s) => !q || (s.name || '').toLowerCase().includes(q);
  const pending = STATE.shopping.filter(s => !s.done && match(s));
  const done    = STATE.shopping.filter(s =>  s.done && match(s));
  $('shop-summary').textContent = pending.length
    ? `${pending.length} tesoros pendientes · ${done.length} cazados`
    : `${done.length} cazados · carrito en modo zen`;

  // Agrupar pendientes por categoría siguiendo el orden de CATEGORIES_SHOP
  const groups = {};
  CATEGORIES_SHOP.forEach(c => groups[c.id] = []);
  pending.forEach(s => {
    const cat = groups[s.category] ? s.category : 'otros';
    groups[cat].push(s);
  });

  const aisles = CATEGORIES_SHOP
    .filter(c => groups[c.id].length)
    .map(c => `
      <div class="aisle">
        <div class="aisle-head">
          <span>${c.emoji}</span> ${c.label}
          <span class="aisle-count">${groups[c.id].length}</span>
        </div>
        <div class="row-list">${groups[c.id].map(shopRowHTML).join('')}</div>
      </div>`).join('');

  $('shop-pending').innerHTML = aisles || '<p class="empty">La nevera respira tranquila. Por ahora.</p>';
  $('shop-done').innerHTML = done.length
    ? done.map(shopRowHTML).join('')
    : '<p class="empty muted" style="font-size:13px;">Aquí caerán los trofeos del súper.</p>';

  wireShopRows(document);
}

function wireShopRows(root) {
  $$('[data-toggle-shop]', root).forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.toggleShop;
    const s = STATE.shopping.find(x => x.id === id);
    if (!s) return;
    const patch = { done: !s.done, done_at: !s.done ? new Date().toISOString() : null };
    patchState('shopping', id, patch);
    renderAll();
    const { error } = await db.from('shopping').update(patch).eq('id', id);
    if (error) { showToast('Error: ' + error.message); loadAll(); }
  }));
  $$('[data-del-shop]', root).forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.delShop;
    removeFromState('shopping', id);
    renderAll();
    const { error } = await db.from('shopping').delete().eq('id', id);
    if (error) { showToast('Error: ' + error.message); loadAll(); }
  }));
  $$('[data-edit-shop]', root).forEach(el => el.addEventListener('dblclick', () => {
    const id = el.dataset.editShop;
    const original = el.textContent;
    el.contentEditable = 'true'; el.focus();
    const sel = window.getSelection(), range = document.createRange();
    range.selectNodeContents(el); sel.removeAllRanges(); sel.addRange(range);
    const save = async () => {
      el.contentEditable = 'false';
      const nn = el.textContent.trim();
      if (nn && nn !== original) { await db.from('shopping').update({ name: nn }).eq('id', id); loadAll(); }
      else el.textContent = original;
    };
    el.addEventListener('blur', save, { once: true });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
      if (e.key === 'Escape') { el.textContent = original; el.blur(); }
    });
  }));
}

// Filtro de búsqueda en la lista de compra
$('shop-filter')?.addEventListener('input', e => {
  shopFilter = e.target.value || '';
  renderShop();
});

// Autocompletado con sugerencias de productos
const $shopName = $('qa-shop-name');
const $shopSuggestions = $('shop-suggestions');
let selectedProduct = null;

$shopName.addEventListener('input', () => {
  const query = $shopName.value.trim();
  const suggestions = findProductSuggestions(query);
  
  if (suggestions.length > 0) {
    $shopSuggestions.innerHTML = suggestions.map(p => `
      <div class="suggestion-item" data-name="${esc(p.name)}" data-category="${p.category}">
        <span>${esc(p.name)}</span>
        <span class="cat-badge">${p.store}</span>
      </div>
    `).join('');
    $shopSuggestions.classList.remove('hidden');
  } else {
    $shopSuggestions.classList.add('hidden');
  }
});

$shopSuggestions.addEventListener('click', (e) => {
  const item = e.target.closest('.suggestion-item');
  if (!item) return;
  
  const name = item.dataset.name;
  const category = item.dataset.category;
  
  $shopName.value = name;
  $shopSuggestions.classList.add('hidden');
  selectedProduct = { name, category };
});

// Ocultar sugerencias al hacer click fuera
$shopName.addEventListener('focus', () => {
  if ($shopName.value.trim().length >= 2) {
    const suggestions = findProductSuggestions($shopName.value);
    if (suggestions.length > 0) {
      $shopSuggestions.classList.remove('hidden');
    }
  }
});

document.addEventListener('click', (e) => {
  if (!$shopName.contains(e.target) && !$shopSuggestions.contains(e.target)) {
    $shopSuggestions.classList.add('hidden');
  }
});

$('qa-shop').addEventListener('submit', e => {
  e.preventDefault();
  withFormLock(e.target, async () => {
    let name = $shopName.value.trim();
    if (!name) return;

    let category;
    if (selectedProduct && selectedProduct.category) category = selectedProduct.category;
    else category = guessCategory(name);

    const { error } = await db.from('shopping').insert({
      name,
      quantity: $('qa-shop-qty').value.trim(),
      category,
      added_by: me.id,
      done: false,
    });
    if (error) { showToast('Error: ' + error.message); return; }
    $shopName.value = ''; $('qa-shop-qty').value = '';
    $shopSuggestions.classList.add('hidden');
    selectedProduct = null;
    loadAll();
  });
});

// ── CALENDARIO ───────────────────────────────────────────
function renderCalendar() {
  const y = calDate.getFullYear(), m = calDate.getMonth();
  $('cal-title').textContent = calDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const firstDow = (new Date(y, m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = todayISO();

  // Cache festivos del mes en una pasada
  const monthHolidays = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const h = isHoliday(iso);
    if (h) monthHolidays[iso] = h;
  }
  // Cache eventos por día
  const eventsByDay = {};
  for (const e of STATE.events) {
    (eventsByDay[e.date] = eventsByDay[e.date] || []).push(e);
  }

  let html = WEEKDAYS.map(d => `<div class="dow">${d}</div>`).join('');
  // Padding antes
  for (let i = 0; i < firstDow; i++) html += '<div class="day outside"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const evs = eventsByDay[iso] || [];

    const evsHtml = evs.slice(0, 3).map(e => {
      const user = STATE.users.find(u => u.id === e.assignee);
      const color = user?.color || 'marina';
      const lightColor = getLightColor(color);
      return `<div class="day-ev" data-event-id="${esc(e.id)}" style="background:${lightColor}; cursor:pointer;" title="${esc(e.title)}">${esc(e.title)}</div>`;
    }).join('');

    const more = evs.length > 3 ? `<div class="day-ev" style="background:var(--surface-2); color:var(--ink-2);">+${evs.length-3}</div>` : '';

    const isWeekendClass = isWeekend(iso) ? 'weekend' : '';
    const holidayInfo = monthHolidays[iso];
    const isHolidayClass = holidayInfo ? 'holiday' : '';
    const holidayTitle = holidayInfo ? ` title="${esc(holidayInfo.name)}"` : '';

    html += `<div class="day ${iso === today ? 'today' : ''} ${isWeekendClass} ${isHolidayClass}" data-day="${iso}"${holidayTitle}>
      <div class="day-num">${d}</div>
      <div class="day-evs">${evsHtml}${more}</div>
    </div>`;
  }

  $('month-grid').innerHTML = html;
  
  // Click en días para crear evento
  $$('.day[data-day]', $('month-grid')).forEach(el => {
    el.addEventListener('click', (e) => {
      // Si se hizo click en un evento, no abrir el editor desde el día
      if (e.target.closest('.day-ev[data-event-id]')) return;
      
      const day = el.dataset.day;
      // Buscar usuario seleccionado en el formulario de eventos
      const selectedUser = $('qa-ev-assignee')?.value || me.id;
      const user = STATE.users.find(u => u.id === selectedUser);
      const color = user?.color || 'marina';
      
      $('qa-ev-date').value = day;
      $('qa-ev-title').focus();
      
      // Abrir modal editor de eventos
      openEventEditor(null, day, color);
    });
  });
  
  // Click en eventos para editarlos
  $$('.day-ev[data-event-id]', $('month-grid')).forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const eventId = el.dataset.eventId;
      const event = STATE.events.find(ev => ev.id === eventId);
      if (!event) return;
      
      const user = STATE.users.find(u => u.id === event.assignee);
      const color = user?.color || 'marina';
      
      openEventEditor(event, event.date, color);
    });
  });
}

function eventRowHTML(e) {
  const user = STATE.users.find(u => u.id === e.assignee);
  const emoji = emojiForEventCat(e.category);
  const color = user?.color || 'marina';
  const lightColor = getLightColor(color);
  return `
    <div class="row" data-event-id="${esc(e.id)}" style="border-left:3px solid ${lightColor};">
      <span class="row-emoji">${emoji}</span>
      <span class="row-title" data-edit-event="${esc(e.id)}" title="Doble clic para editar o click para abrir editor">${esc(e.title)}</span>
      <span class="row-meta">
        <span class="row-time">${fmtDate(e.date)}${e.time ? ' · ' + esc(e.time) : ''}</span>
        ${avatarHTML(user, 'xs')}
        <button class="icon-btn danger" data-del-event="${esc(e.id)}" aria-label="Eliminar">🗑</button>
      </span>
    </div>`;
}

function renderUpcomingEvents() {
  const today = todayISO();
  const upcoming = STATE.events.filter(e => e.date >= today).slice(0, 20);
  $('cal-list').innerHTML = upcoming.length
    ? upcoming.map(eventRowHTML).join('')
    : '<p class="empty">Agenda despejada. Raro, pero se celebra.</p>';
  wireEventRows($('cal-list'));
}

// ── CLOE: Paseos y bajadas ───────────────────────────────
const CLOE_REASONS = {
  'pipi': { emoji: '🚽', label: 'Pipí' },
  'caca': { emoji: '💩', label: 'Caca' },
  'jugar': { emoji: '🎾', label: 'Jugar' },
  'comer': { emoji: '🍖', label: 'Comer' },
  'otro': { emoji: '📝', label: 'Otro' }
};

function cloeWalkRowHTML(w) {
  const user = STATE.users.find(u => u.id === w.assignee);
  const duration = w.duration || 30;
  const dt = new Date(w.datetime);
  const timeStr = dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const dateStr = dt.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  
  return `
    <div class="row" data-walk-id="${esc(w.id)}">
      <span class="row-emoji" style="font-size:18px;">🚶</span>
      <span class="row-title">${timeStr} - ${duration} min</span>
      <span class="row-meta">
        <span class="chip muted" style="font-size:10px;">${dateStr}</span>
        ${avatarHTML(user, 'xs')}
        <button class="icon-btn danger" data-del-walk="${esc(w.id)}" aria-label="Eliminar">🗑</button>
      </span>
    </div>`;
}

function cloeDownRowHTML(d) {
  const user = STATE.users.find(u => u.id === d.assignee);
  const reason = CLOE_REASONS[d.reason] || CLOE_REASONS['otro'];
  const dt = new Date(d.datetime);
  const timeStr = dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const dateStr = dt.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  
  return `
    <div class="row" data-down-id="${esc(d.id)}">
      <span class="row-emoji" style="font-size:18px;">${reason.emoji}</span>
      <span class="row-title">${timeStr} - ${reason.label}</span>
      <span class="row-meta">
        <span class="chip muted" style="font-size:10px;">${dateStr}</span>
        ${avatarHTML(user, 'xs')}
        <button class="icon-btn danger" data-del-down="${esc(d.id)}" aria-label="Eliminar">🗑</button>
      </span>
    </div>`;
}

function renderCloe() {
  // Obtener paseos (últimos 20)
  const walks = (STATE.cloeWalks || []).sort((a, b) => new Date(b.datetime) - new Date(a.datetime)).slice(0, 20);
  $('cloe-walks-list').innerHTML = walks.length
    ? walks.map(cloeWalkRowHTML).join('')
    : '<p class="empty">Cloe aún no ha estrenado la pasarela de paseos.</p>';
  
  // Obtener bajadas (últimos 20)
  const downs = (STATE.cloeDowns || []).sort((a, b) => new Date(b.datetime) - new Date(a.datetime)).slice(0, 20);
  $('cloe-downs-list').innerHTML = downs.length
    ? downs.map(cloeDownRowHTML).join('')
    : '<p class="empty">Sin mini aventuras registradas. El contador espera drama.</p>';
  
  // Wire up delete buttons
  $$('[data-del-walk]', $('cloe-walks-list')).forEach(b => b.addEventListener('click', async () => {
    await db.from('cloe_walks').delete().eq('id', b.dataset.delWalk);
    loadAll();
  }));

  $$('[data-del-down]', $('cloe-downs-list')).forEach(b => b.addEventListener('click', async () => {
    await db.from('cloe_downs').delete().eq('id', b.dataset.delDown);
    loadAll();
  }));
}

function wireEventRows(root) {
  $$('[data-del-event]', root).forEach(b => b.addEventListener('click', async () => {
    await db.from('events').delete().eq('id', b.dataset.delEvent);
    loadAll();
  }));
  
  // Click en evento para abrir editor modal
  $$('[data-event-id]', root).forEach(el => {
    el.addEventListener('click', (e) => {
      // Si es click en el botón de eliminar, no hacer nada aquí
      if (e.target.closest('[data-del-event]')) return;
      
      const eventId = el.dataset.eventId;
      const event = STATE.events.find(ev => ev.id === eventId);
      if (!event) return;
      
      const user = STATE.users.find(u => u.id === event.assignee);
      const color = user?.color || 'marina';
      
      openEventEditor(event, event.date, color);
    });
  });
  
  // Doble click para edición inline rápida del título
  $$('[data-edit-event]', root).forEach(el => el.addEventListener('dblclick', () => {
    const id = el.dataset.editEvent;
    const original = el.textContent;
    el.contentEditable = 'true'; el.focus();
    const sel = window.getSelection(), range = document.createRange();
    range.selectNodeContents(el); sel.removeAllRanges(); sel.addRange(range);
    const save = async () => {
      el.contentEditable = 'false';
      const nt = el.textContent.trim();
      if (nt && nt !== original) { await db.from('events').update({ title: nt }).eq('id', id); loadAll(); }
      else el.textContent = original;
    };
    el.addEventListener('blur', save, { once: true });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
      if (e.key === 'Escape') { el.textContent = original; el.blur(); }
    });
  }));
}

$('cal-prev').addEventListener('click',  () => { calDate.setMonth(calDate.getMonth() - 1); renderCalendar(); });
$('cal-next').addEventListener('click',  () => { calDate.setMonth(calDate.getMonth() + 1); renderCalendar(); });
$('cal-today').addEventListener('click', () => { const n = new Date(); calDate.setFullYear(n.getFullYear()); calDate.setMonth(n.getMonth()); renderCalendar(); });

$('qa-event').addEventListener('submit', e => {
  e.preventDefault();
  withFormLock(e.target, async () => {
    const title = $('qa-ev-title').value.trim();
    const date  = $('qa-ev-date').value;
    if (!title || !date) return;
    const { error } = await db.from('events').insert({
      title,
      date,
      time: $('qa-ev-time').value || null,
      category: $('qa-ev-cat').value || 'general',
      assignee: $('qa-ev-assignee').value || null,
    });
    if (error) { showToast('Error: ' + error.message); return; }
    $('qa-ev-title').value = ''; $('qa-ev-time').value = '';
    loadAll();
  });
});

// ── CLOE: Registrar paseo ─────────────────────────────────
$('qa-cloe-walk').addEventListener('submit', e => {
  e.preventDefault();
  withFormLock(e.target, async () => {
  const datetime = $('cloe-walk-datetime').value;
  const duration = parseInt($('cloe-walk-duration').value) || 30;
  const assignee = $('cloe-walk-walker').value || null;
  
  if (!datetime) {
    showToast('Pon fecha y hora, que Cloe no viaja en el tiempo');
    return;
  }
  
  // Insertar en tabla de paseos
  const { error: walkError } = await db.from('cloe_walks').insert({
    datetime,
    duration,
    assignee,
  });
  if (walkError) { showToast('Error: ' + walkError.message); return; }
  
  // También insertar como tarea realizada hoy (scope='today', done=true)
  const dateOnly = datetime.split('T')[0];
  const timeOnly = datetime.split('T')[1]?.slice(0, 5) || null;
  const { error: taskError } = await insertTask({
    title: 'Pasear a Cloe como leyenda',
    category: 'pasear',
    room: 'cloe',
    subcategory: 'pasear',
    emoji: '🚶',
    assignee,
    scope: 'today',
    done: true,
    done_at: new Date().toISOString(),
    due_date: dateOnly,
    due_time: timeOnly,
  });
  if (taskError) { showToast('Error al guardar tarea: ' + taskError.message); return; }

  loadAll();
  });
});

// ── CLOE: Registrar bajada ────────────────────────────────
$('qa-cloe-down').addEventListener('submit', e => {
  e.preventDefault();
  withFormLock(e.target, async () => {
  const datetime = $('cloe-down-datetime').value;
  const reason = $('cloe-down-reason').value || 'otro';
  const assignee = $('cloe-down-person').value || null;
  
  if (!datetime) {
    showToast('Pon fecha y hora, que esta expedición necesita coordenadas');
    return;
  }
  
  // Insertar en tabla de bajadas
  const { error: downError } = await db.from('cloe_downs').insert({
    datetime,
    reason,
    assignee,
  });
  if (downError) { showToast('Error: ' + downError.message); return; }
  
  // También insertar como tarea realizada hoy (scope='today', done=true)
  const dateOnly = datetime.split('T')[0];
  const timeOnly = datetime.split('T')[1]?.slice(0, 5) || null;
  const reasonEmoji = { pipi: '🚽', caca: '💩', jugar: '🎾', comer: '🍖', otro: '📝' }[reason] || '📝';
  const { error: taskError } = await insertTask({
    title: `Bajar a Cloe en modo ${reason}`,
    category: 'bajar',
    room: 'cloe',
    subcategory: 'bajar',
    emoji: reasonEmoji,
    assignee,
    scope: 'today',
    done: true,
    done_at: new Date().toISOString(),
    due_date: dateOnly,
    due_time: timeOnly,
  });
  if (taskError) { showToast('Error al guardar tarea: ' + taskError.message); return; }

  loadAll();
  });
});

// Establecer fecha/hora por defecto en los formularios de Cloe
function setCloeDefaultDatetime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const iso = now.toISOString().slice(0, 16);
  if ($('cloe-walk-datetime')) $('cloe-walk-datetime').value = iso;
  if ($('cloe-down-datetime')) $('cloe-down-datetime').value = iso;
}

// ── Realtime ─────────────────────────────────────────────
const debouncedLoad = debounce(loadAll, 300);
const realtimeChannel = db.channel('cloe-sync')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks'    }, debouncedLoad)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping' }, debouncedLoad)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'events'   }, debouncedLoad)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'users'    }, debouncedLoad)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'cloe_walks'  }, debouncedLoad)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'cloe_downs' }, debouncedLoad)
  .subscribe();

// Cleanup al cerrar / salir
window.addEventListener('beforeunload', () => {
  try { db.removeChannel(realtimeChannel); } catch {}
});

setCloeDefaultDatetime();
loadAll();
