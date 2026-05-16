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

const STATE = { users: [], tasks: [], shopping: [], events: [], cloeWalks: [], cloeDowns: [], rewards: [], redemptions: [] };
let activeTab = 'hoy';
let tasksScope = 'week';
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
  if (btn) {
    btn.textContent = t === 'dark' ? '☀️' : '🥷';
    btn.title = t === 'dark' ? 'Modo día' : 'Modo ninja';
  }
}
applyTheme(localStorage.getItem(THEME_KEY) || 'light');
$('theme-toggle')?.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

// ── Notificaciones ───────────────────────────────────────
const NOTIF_KEY = 'cloe-notif-enabled';
const NOTIF_SENT_KEY = 'cloe-notif-sent';
const NOTIF_TTL_MS = 6 * 60 * 60 * 1000; // 6h dedup

function notifSupported() { return 'Notification' in window; }
function notifEnabled() {
  return notifSupported()
    && Notification.permission === 'granted'
    && localStorage.getItem(NOTIF_KEY) === '1';
}

function paintBell() {
  const btn = $('notif-toggle');
  if (!btn) return;
  if (!notifSupported()) { btn.textContent = '🚫'; btn.title = 'Notificaciones no soportadas'; btn.disabled = true; return; }
  if (Notification.permission === 'denied') { btn.textContent = '🚫'; btn.title = 'Permiso denegado en el navegador'; return; }
  btn.textContent = notifEnabled() ? '🔔' : '🔕';
  btn.title = notifEnabled() ? 'Notificaciones activadas' : 'Activar notificaciones';
}

async function toggleNotif() {
  if (!notifSupported()) return;
  if (Notification.permission === 'denied') {
    showToast('El navegador ha bloqueado las notificaciones para esta página');
    return;
  }
  if (Notification.permission !== 'granted') {
    const p = await Notification.requestPermission();
    if (p !== 'granted') { paintBell(); return; }
  }
  const on = localStorage.getItem(NOTIF_KEY) === '1';
  localStorage.setItem(NOTIF_KEY, on ? '0' : '1');
  paintBell();
  if (!on) {
    new Notification('🥷 CLOE en guardia', { body: 'Te avisaré de eventos, tareas y paseos.', icon: 'Cloe.png' });
    runNotifChecks();
  }
}
$('notif-toggle')?.addEventListener('click', toggleNotif);
paintBell();

function loadNotifSent() {
  try {
    const raw = JSON.parse(localStorage.getItem(NOTIF_SENT_KEY) || '{}');
    const now = Date.now();
    // GC entradas expiradas
    Object.keys(raw).forEach(k => { if (now - raw[k] > NOTIF_TTL_MS) delete raw[k]; });
    return raw;
  } catch { return {}; }
}
function markNotifSent(key) {
  const map = loadNotifSent();
  map[key] = Date.now();
  localStorage.setItem(NOTIF_SENT_KEY, JSON.stringify(map));
}
function notifyOnce(key, title, body) {
  if (!notifEnabled()) return;
  const sent = loadNotifSent();
  if (sent[key]) return;
  try { new Notification(title, { body, icon: 'Cloe.png', tag: key }); } catch {}
  markNotifSent(key);
}

// Reglas evaluadas cada minuto
function runNotifChecks() {
  if (!STATE || !STATE.events) return;
  const now = new Date();
  const todayStr = todayISO();
  const hour = now.getHours();

  // 1. Eventos en los próximos 30 min asignados a mí (o sin asignar)
  for (const e of STATE.events) {
    if (e.date !== todayStr || !e.time) continue;
    if (e.assignee && e.assignee !== me.id) continue;
    const [h, m] = e.time.split(':').map(Number);
    const evDate = new Date(now); evDate.setHours(h, m, 0, 0);
    const diffMin = (evDate - now) / 60000;
    if (diffMin > 0 && diffMin <= 30) {
      notifyOnce(`event:${e.id}:${todayStr}`, `📅 En ${Math.round(diffMin)} min: ${e.title}`, `A las ${e.time}`);
    }
  }

  // 2. Tareas vencidas asignadas a mí — aviso una vez por día y solo en horario diurno
  if (hour >= 8 && hour <= 22) {
    const overdue = STATE.tasks.filter(t =>
      !t.done && t.assignee === me.id && t.due_date && t.due_date < todayStr
    );
    if (overdue.length) {
      notifyOnce(`overdue:${me.id}:${todayStr}`,
        `⚔️ ${overdue.length} ${overdue.length === 1 ? 'misión vencida' : 'misiones vencidas'}`,
        overdue.slice(0, 3).map(t => '• ' + t.title).join('\n'));
    }
  }

  // 3. Cloe: sin paseo desde hace > 5h en horario diurno
  if (hour >= 8 && hour <= 22 && STATE.cloeWalks?.length) {
    const last = STATE.cloeWalks
      .map(w => new Date(w.datetime).getTime())
      .sort((a, b) => b - a)[0];
    const diffH = (Date.now() - last) / 3600000;
    if (diffH > 5) {
      const bucket = Math.floor(diffH); // dedup por hora redondeada para no spamear
      notifyOnce(`cloe-walk:${todayStr}:${bucket}`, `🐶 Cloe pide paseo`, `Última vuelta hace ${diffH.toFixed(1)}h`);
    }
  }
}

// Tick cada minuto
setInterval(runNotifChecks, 60_000);

// ── Auto-refresco temporal ───────────────────────────────
// Mantiene la app "viva": saludo correcto a cualquier hora,
// día actual resaltado bien aunque cambies de día con la app abierta,
// y datos frescos cuando vuelves a la pestaña tras un rato.
let _lastTickDay   = todayISO();
let _lastTickHour  = new Date().getHours();
let _lastTickStamp = Date.now();

function timeTick() {
  if (!STATE || !STATE.users) return; // aún no ha cargado

  const now      = new Date();
  const nowDay   = todayISO();
  const nowHour  = now.getHours();
  const elapsed  = Date.now() - _lastTickStamp;

  const dayChanged   = nowDay !== _lastTickDay;
  const hourChanged  = nowHour !== _lastTickHour;
  const longGap      = elapsed > 5 * 60_000; // el dispositivo durmió >5 min

  if (dayChanged || longGap) {
    // Cambió el día o volvemos de dormir: recarga todo desde Supabase
    loadAll();
  } else if (hourChanged) {
    // Solo cambió la franja horaria: actualiza saludo y banners ligeros
    renderGreeting();
    renderHoy();
    paintBadges();
  }

  _lastTickDay   = nowDay;
  _lastTickHour  = nowHour;
  _lastTickStamp = Date.now();
}

// Cada 60 s comprobamos cambios de hora / día
setInterval(timeTick, 60_000);

// Cuando la pestaña vuelve al primer plano (cambio de app, móvil bloqueado…)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') timeTick();
});

// Cuando recuperas conexión tras estar offline
window.addEventListener('online', () => loadAll());

// ── Badges en tabs y título ──────────────────────────────
function paintBadges() {
  if (!STATE || !STATE.tasks) return;
  const todayStr = todayISO();
  const counts = {
    hoy: STATE.events.filter(e => e.date === todayStr).length,
    tareas: STATE.tasks.filter(t => !t.done && t.assignee === me.id && (!t.due_date || t.due_date <= todayStr)).length,
    compra: STATE.shopping.filter(s => !s.done).length,
    calendario: STATE.events.filter(e => e.date === todayStr).length,
  };
  $$('.tabs > .tab[data-tab]').forEach(tab => {
    const c = counts[tab.dataset.tab];
    let badge = tab.querySelector('.tab-badge');
    if (c && c > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'tab-badge';
        tab.appendChild(badge);
      }
      badge.textContent = c > 99 ? '99+' : c;
    } else if (badge) badge.remove();
  });

  // Título del documento
  const total = counts.tareas + counts.hoy;
  document.title = total > 0 ? `(${total}) CLOE · App` : 'CLOE · App';
}

// ── Saludo ───────────────────────────────────────────────
function renderGreeting() {
  const h = new Date().getHours();
  const hi = h < 6 ? 'Modo ninja nocturno' : h < 13 ? 'Buenos días, máquina' : h < 21 ? 'Buenas tardes, crack' : 'Buenas noches, leyenda';
  $('greeting').textContent = `${hi}, ${me.name.split(' ')[0]}`;
  const fecha = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  $('today-eyebrow').textContent = '// ' + fecha.toLowerCase();
}

// ── Tabs ─────────────────────────────────────────────────
$$('.tabs > .tab[data-tab]').forEach(b => b.addEventListener('click', () => {
  activeTab = b.dataset.tab;
  $$('.tabs > .tab[data-tab]').forEach(x => x.classList.toggle('active', x.dataset.tab === activeTab));
  $$('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + activeTab));
  if (location.hash !== '#' + activeTab) history.replaceState(null, '', '#' + activeTab);
}));
const initTab = (location.hash || '#hoy').slice(1);
if (['hoy','tareas','compra','calendario','tienda','stats'].includes(initTab)) {
  document.querySelector(`.tab[data-tab="${initTab}"]`)?.click();
}

// ── Tabs internas (Tareas: Hoy / Semana) ─────────────────
$$('.tab[data-scope]').forEach(b => b.addEventListener('click', () => {
  tasksScope = b.dataset.scope;
  $$('.tab[data-scope]').forEach(x => x.classList.toggle('active', x.dataset.scope === tasksScope));
  // Actualizar título de la sección
  $('tasks-section-title').textContent = tasksScope === 'today' 
    ? 'Hazañas que han caído hoy'
    : 'Tu semana de combate';
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
  const [u, t, s, e, cw, cd, rw, rd, cr] = await Promise.all([
    db.from('users').select('id,name,email,role,member_id,color,status').order('name'),
    db.from('tasks').select('*').order('done').order('due_date',{nullsFirst:false}).order('due_time',{nullsFirst:true}),
    db.from('shopping').select('*').order('done').order('category').order('created_at'),
    db.from('events').select('*').order('date').order('time',{nullsFirst:true}),
    db.from('cloe_walks').select('*').order('datetime', { ascending: false }),
    db.from('cloe_downs').select('*').order('datetime', { ascending: false }),
    db.from('rewards').select('*').order('cost'),
    db.from('redemptions').select('*').order('created_at', { ascending: false }),
    db.from('coin_rules').select('*').order('sort_order'),
  ]);
  STATE.users = (u.data || []).filter(x => x.status === 'active');
  STATE.tasks = t.data || [];
  STATE.shopping = s.data || [];
  STATE.events = e.data || [];
  STATE.cloeWalks = cw.data || [];
  STATE.cloeDowns = cd.data || [];
  STATE.rewards = rw.data || [];
  STATE.redemptions = rd.data || [];
  STATE.coinRules = cr.data || [];
  applyCoinRules(STATE.coinRules);
  renderAll();
}

function renderAll() {
  renderGreeting();
  fillSelects();
  renderStats();
  renderHoy();
  // Inicializar título de la sección de tareas
  $('tasks-section-title').textContent = tasksScope === 'today' 
    ? 'Hazañas que han caído hoy'
    : 'Tu semana de combate';
  renderTasks();
  renderShop();
  renderCalendar();
  renderUpcomingEvents();
  renderCloe();
  renderStatsPanel();
  initChartFilters();
  renderRewardsShop();
  paintBadges();
  paintCoinBalance();
  runNotifChecks();
}

// ── 🛍️ TIENDA ───────────────────────────────────────────
function renderRewardsShop() {
  const grid = $('rewards-grid');
  const myList = $('my-redemptions');
  const balanceEl = $('shop-balance-num');
  const adminCard = $('shop-admin-card');
  const adminBtn = $('shop-new-reward-btn');
  const pendingList = $('pending-redemptions');
  if (!grid) return;

  const balance = totalCoins(STATE, me.id);
  if (balanceEl) balanceEl.textContent = balance.toLocaleString('es-ES');

  // Premios disponibles
  const active = (STATE.rewards || []).filter(r => r.active);
  grid.innerHTML = active.length ? active.map(r => {
    const canAfford = balance >= r.cost;
    const outOfStock = r.stock !== null && r.stock <= 0;
    const disabled = !canAfford || outOfStock;
    return `
      <div class="reward-card ${disabled ? 'locked' : ''}">
        ${me.role === 'Admin' ? `<button class="reward-edit" data-edit-reward="${esc(r.id)}" title="Editar">✏️</button>` : ''}
        <div class="reward-emoji">${r.emoji || '🎁'}</div>
        <div class="reward-name">${esc(r.name)}</div>
        ${r.description ? `<div class="reward-desc">${esc(r.description)}</div>` : ''}
        <div class="reward-cost"><span class="coin-icon">🪙</span> ${r.cost}</div>
        ${r.stock !== null ? `<div class="reward-stock">${outOfStock ? 'Agotado' : 'Quedan ' + r.stock}</div>` : ''}
        <button class="btn accent sm reward-buy" data-reward-id="${esc(r.id)}" ${disabled ? 'disabled' : ''}>
          ${outOfStock ? '😢 Agotado' : (canAfford ? '✨ Canjear' : `Faltan ${r.cost - balance} 🪙`)}
        </button>
      </div>
    `;
  }).join('') : '<p class="empty">La tienda está vacía. Pídele al admin que añada premios.</p>';

  // Engancha botones canjear
  $$('.reward-buy', grid).forEach(b => b.addEventListener('click', () => redeemReward(b.dataset.rewardId)));
  $$('[data-edit-reward]', grid).forEach(b => b.addEventListener('click', () => openRewardEditor(b.dataset.editReward)));

  // Mis canjes
  const mine = (STATE.redemptions || []).filter(r => r.user_id === me.id).slice(0, 12);
  myList.innerHTML = mine.length ? mine.map(redemptionRowHTML).join('') : '<p class="empty">Aún no has canjeado ningún premio.</p>';

  // Admin: panel de pendientes + botón nuevo premio
  if (me.role === 'Admin') {
    adminBtn?.classList.remove('hidden');
    adminCard?.classList.remove('hidden');
    adminBtn?.addEventListener('click', () => openRewardEditor(null), { once: true });

    const pending = (STATE.redemptions || []).filter(r => r.status === 'pending');
    pendingList.innerHTML = pending.length
      ? pending.map(adminRedemptionRowHTML).join('')
      : '<p class="empty">Sin pedidos pendientes. La familia está tranquila 😎</p>';
    $$('[data-approve]', pendingList).forEach(b => b.addEventListener('click', () => resolveRedemption(b.dataset.approve, 'approved')));
    $$('[data-reject]',  pendingList).forEach(b => b.addEventListener('click', () => resolveRedemption(b.dataset.reject,  'rejected')));
    $$('[data-deliver]', pendingList).forEach(b => b.addEventListener('click', () => resolveRedemption(b.dataset.deliver, 'delivered')));
  }
}

function redemptionRowHTML(r) {
  const statusInfo = {
    pending:   { lbl: '⏳ Esperando aprobación', cls: 'pending' },
    approved:  { lbl: '✅ Aprobado',              cls: 'approved' },
    rejected:  { lbl: '❌ Rechazado',             cls: 'rejected' },
    delivered: { lbl: '🎉 Entregado',             cls: 'delivered' },
  }[r.status] || { lbl: r.status, cls: '' };
  const when = new Date(r.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  return `
    <div class="row redemption ${statusInfo.cls}">
      <span class="row-emoji" style="font-size:22px;">${r.reward_emoji || '🎁'}</span>
      <span class="row-title">${esc(r.reward_name)}</span>
      <span class="row-meta">
        <span class="chip mini-cost"><span class="coin-icon">🪙</span> ${r.cost_paid}</span>
        <span class="chip status-${statusInfo.cls}">${statusInfo.lbl}</span>
        <span class="row-time">${when}</span>
      </span>
    </div>
  `;
}

function adminRedemptionRowHTML(r) {
  const user = STATE.users.find(u => u.id === r.user_id);
  const when = new Date(r.created_at).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return `
    <div class="row redemption pending">
      <span class="row-emoji" style="font-size:22px;">${r.reward_emoji || '🎁'}</span>
      ${avatarHTML(user, 'xs')}
      <span class="row-title">${esc(user?.name || '?')} pide ${esc(r.reward_name)}</span>
      <span class="row-meta">
        <span class="chip mini-cost"><span class="coin-icon">🪙</span> ${r.cost_paid}</span>
        <span class="row-time">${when}</span>
        <button class="btn accent sm" data-approve="${esc(r.id)}">✓ Aprobar</button>
        <button class="btn ghost sm"  data-reject="${esc(r.id)}">✗ Rechazar</button>
      </span>
    </div>
  `;
}

async function redeemReward(rewardId) {
  const reward = STATE.rewards.find(r => r.id === rewardId);
  if (!reward) return;
  const balance = totalCoins(STATE, me.id);
  if (balance < reward.cost) {
    showToast(`Te faltan ${reward.cost - balance} 🪙 para canjear "${reward.name}"`);
    return;
  }
  if (reward.stock !== null && reward.stock <= 0) {
    showToast('Agotado, prueba más tarde');
    return;
  }
  // Insertar canje
  const { error } = await db.from('redemptions').insert({
    user_id: me.id,
    reward_id: reward.id,
    reward_name: reward.name,
    reward_emoji: reward.emoji || '🎁',
    cost_paid: reward.cost,
    status: 'pending',
  });
  if (error) { showToast('Error: ' + error.message); return; }
  showToast(`🎁 Has pedido "${reward.name}". Esperando aprobación de un admin.`, 3500);
  loadAll();
}

async function resolveRedemption(id, newStatus) {
  const patch = {
    status: newStatus,
    resolved_by: me.id,
    resolved_at: new Date().toISOString(),
  };
  const { error } = await db.from('redemptions').update(patch).eq('id', id);
  if (error) { showToast('Error: ' + error.message); return; }
  // Si entregado y el premio tenía stock, descuento -1
  if (newStatus === 'approved' || newStatus === 'delivered') {
    const r = STATE.redemptions.find(x => x.id === id);
    const reward = STATE.rewards.find(rw => rw.id === r?.reward_id);
    if (reward && reward.stock !== null && reward.stock > 0) {
      await db.from('rewards').update({ stock: reward.stock - 1 }).eq('id', reward.id);
    }
  }
  showToast(newStatus === 'approved' ? '✓ Aprobado' : newStatus === 'rejected' ? '✗ Rechazado' : '🎉 Entregado');
  loadAll();
}

function openRewardEditor(rewardId) {
  const reward = rewardId ? STATE.rewards.find(r => r.id === rewardId) : null;
  const isEdit = !!reward;
  modalBody.innerHTML = `
    <h3>${isEdit ? '✏️ Editar premio' : '🎁 Nuevo premio'}</h3>
    <form id="reward-form" style="margin-top:18px;">
      <div class="form-row">
        <label><span>Emoji</span><input type="text" name="emoji" maxlength="2" value="${esc(reward?.emoji || '🎁')}" style="text-align:center;font-size:24px;"></label>
        <label><span>Coste 🪙</span><input type="number" name="cost" min="1" value="${reward?.cost || 50}" required></label>
      </div>
      <label><span>Nombre</span><input type="text" name="name" value="${esc(reward?.name || '')}" required placeholder="Película de los viernes..."></label>
      <label><span>Descripción</span><textarea name="description" rows="2" placeholder="Detalles opcionales">${esc(reward?.description || '')}</textarea></label>
      <label><span>Stock (vacío = infinito)</span><input type="number" name="stock" min="0" value="${reward?.stock ?? ''}" placeholder="∞"></label>
      <label><span>Activo</span>
        <select name="active">
          <option value="true" ${reward?.active !== false ? 'selected' : ''}>Sí, visible en la tienda</option>
          <option value="false" ${reward?.active === false ? 'selected' : ''}>No, oculto</option>
        </select>
      </label>
      <div class="form-actions">
        ${isEdit ? '<button type="button" class="btn danger" id="del-reward-btn">Eliminar</button>' : ''}
        <button type="button" class="btn ghost" id="cancel-reward">Cancelar</button>
        <button type="submit" class="btn accent">${isEdit ? 'Guardar' : 'Crear premio'}</button>
      </div>
    </form>
  `;
  modal.classList.remove('hidden');

  $('reward-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      name: fd.get('name').trim(),
      emoji: fd.get('emoji').trim() || '🎁',
      cost: parseInt(fd.get('cost'), 10) || 1,
      description: fd.get('description').trim(),
      active: fd.get('active') === 'true',
      stock: fd.get('stock') === '' ? null : parseInt(fd.get('stock'), 10),
    };
    if (!payload.name) { showToast('Nombre obligatorio'); return; }
    let err;
    if (isEdit) {
      ({ error: err } = await db.from('rewards').update(payload).eq('id', reward.id));
    } else {
      payload.created_by = me.id;
      ({ error: err } = await db.from('rewards').insert(payload));
    }
    if (err) { showToast('Error: ' + err.message); return; }
    modal.classList.add('hidden');
    loadAll();
  });

  $('cancel-reward').addEventListener('click', () => modal.classList.add('hidden'));
  if (isEdit) $('del-reward-btn').addEventListener('click', async () => {
    if (!confirm(`¿Eliminar "${reward.name}"?`)) return;
    await db.from('rewards').delete().eq('id', reward.id);
    modal.classList.add('hidden');
    loadAll();
  });
}

// ── Monedas en el header ─────────────────────────────────
let _lastCoinBalance = null;
function paintCoinBalance() {
  if (!STATE || !STATE.tasks) return;
  const total = totalCoins(STATE, me.id);
  const el = $('coin-num');
  if (!el) return;
  const prev = _lastCoinBalance;
  el.textContent = total.toLocaleString('es-ES');
  if (prev !== null && total > prev) {
    const delta = total - prev;
    flyCoin(delta);
    const chip = $('coin-balance');
    chip.classList.remove('coin-pop');
    void chip.offsetWidth;
    chip.classList.add('coin-pop');
  }
  _lastCoinBalance = total;
}

function flyCoin(delta) {
  const chip = $('coin-balance');
  if (!chip) return;
  const rect = chip.getBoundingClientRect();
  const float = document.createElement('div');
  float.className = 'coin-float';
  float.textContent = `+${delta} 🪙`;
  float.style.left = (rect.left + rect.width / 2) + 'px';
  float.style.top = (rect.top + rect.height) + 'px';
  document.body.appendChild(float);
  setTimeout(() => float.remove(), 1500);
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
        const coins = totalCoins(STATE, x.user.id);
        return `
          <div class="row">
            <span class="row-emoji" style="font-size:20px;">${medal}</span>
            ${avatarHTML(x.user, 'sm')}
            <span class="row-title">${esc(x.user.name)}</span>
            <span class="coin-chip mini" title="Monedas totales"><span class="coin-icon">🪙</span><span class="coin-num">${coins.toLocaleString('es-ES')}</span></span>
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

  renderTrophies();

  // Render type chart
  renderTypeChart();
}

// ── Type Chart: Tareas por tipo y usuario ────────────────
let chartDateFrom, chartDateTo;

function initChartFilters() {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  chartDateFrom = firstDayOfMonth;
  chartDateTo = now;
  
  const fromInput = $('chart-date-from');
  const toInput = $('chart-date-to');
  if (!fromInput || !toInput) return;
  
  fromInput.value = formatDateForInput(chartDateFrom);
  toInput.value = formatDateForInput(chartDateTo);
  
  fromInput.addEventListener('change', (e) => {
    chartDateFrom = new Date(e.target.value + 'T00:00:00');
    renderTypeChart();
  });
  
  toInput.addEventListener('change', (e) => {
    chartDateTo = new Date(e.target.value + 'T23:59:59');
    renderTypeChart();
  });
  
  $('chart-reset')?.addEventListener('click', () => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    chartDateFrom = firstDayOfMonth;
    chartDateTo = now;
    fromInput.value = formatDateForInput(chartDateFrom);
    toInput.value = formatDateForInput(chartDateTo);
    renderTypeChart();
  });
}

function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function renderTypeChart() {
  const container = $('stats-type-chart');
  if (!container) return;
  
  const fromStr = chartDateFrom.toISOString().slice(0, 10);
  const toStr = chartDateTo.toISOString().slice(0, 10);
  
  // Get all task types from TASK_SUBCATEGORIES
  const taskTypes = {};
  
  Object.keys(TASK_SUBCATEGORIES).forEach(room => {
    taskTypes[room] = { 
      label: TASK_SUBCATEGORIES[room][0]?.label || room,
      emoji: TASK_SUBCATEGORIES[room][0]?.emoji || '📋',
      color: getRoomColor(room)
    };
  });
  
  // Count tasks by user and type
  const dataByUser = new Map();
  STATE.users.forEach(u => dataByUser.set(u.id, { user: u, byType: {} }));
  
  STATE.tasks.forEach(t => {
    if (!t.done || !t.done_at) return;
    const doneDate = t.done_at.slice(0, 10);
    if (doneDate < fromStr || doneDate > toStr) return;
    if (!t.assignee || !dataByUser.has(t.assignee)) return;
    
    const userData = dataByUser.get(t.assignee);
    const typeKey = t.room || 'otros';
    
    if (!taskTypes[typeKey]) {
      taskTypes[typeKey] = { label: typeKey, emoji: '📋', color: '#9CA3AF' };
    }
    
    if (!userData.byType[typeKey]) userData.byType[typeKey] = 0;
    userData.byType[typeKey]++;
  });
  
  // Calculate max total for scaling
  let maxTotal = 1;
  dataByUser.forEach(userData => {
    const total = Object.values(userData.byType).reduce((a, b) => a + b, 0);
    if (total > maxTotal) maxTotal = total;
  });
  
  // Build HTML
  let html = '';
  dataByUser.forEach(({ user, byType }) => {
    const total = Object.values(byType).reduce((a, b) => a + b, 0);
    if (total === 0) return;
    
    const segments = Object.entries(byType)
      .map(([typeKey, count]) => {
        const typeInfo = taskTypes[typeKey];
        const pct = (count / maxTotal) * 100;
        return `<div class="type-chart-bar-segment" style="width:${pct}%;background:${typeInfo.color};" title="${typeInfo.emoji} ${typeInfo.label}: ${count}"></div>`;
      })
      .join('');
    
    html += `
      <div class="type-chart-row">
        <div class="type-chart-user">
          ${avatarHTML(user, 'xs')}
          <span class="type-chart-user-name">${esc(user.name)}</span>
        </div>
        <div class="type-chart-bars">${segments}</div>
        <div class="type-chart-total">${total}</div>
      </div>
    `;
  });
  
  if (!html) {
    html = '<p class="empty">No hay tareas completadas en este periodo.</p>';
  }
  
  // Build legend
  const legendHtml = Object.entries(taskTypes)
    .filter(([key]) => {
      let hasData = false;
      dataByUser.forEach(ud => { if (ud.byType[key]) hasData = true; });
      return hasData;
    })
    .map(([key, info]) => `
      <div class="type-chart-legend-item">
        <div class="type-chart-legend-color" style="background:${info.color};"></div>
        <span>${info.emoji} ${info.label}</span>
      </div>
    `)
    .join('');
  
  container.innerHTML = `
    ${html}
    ${legendHtml ? `<div class="type-chart-legend">${legendHtml}</div>` : ''}
  `;
}

function getRoomColor(room) {
  const colors = {
    'salon': '#FF6B6B',
    'habitat-sandra': '#FFD98A',
    'habitat-jorge': '#4ECDC4',
    'habitat-lucas': '#A8D5BA',
    'cocina': '#FFB84D',
    'bano': '#7C5CFF',
    'cloe': '#2EE6A6',
    'otros': '#9CA3AF'
  };
  return colors[room] || colors['otros'];
}

// ── Trofeos / premios ────────────────────────────────────
const TROPHY_KEY = 'cloe-trophies-unlocked';
function loadUnlockedTrophies() {
  try { return new Set(JSON.parse(localStorage.getItem(TROPHY_KEY) || '[]')); } catch { return new Set(); }
}
function saveUnlockedTrophies(set) {
  localStorage.setItem(TROPHY_KEY, JSON.stringify([...set]));
}

function renderTrophies() {
  const grid = $('trophies-grid');
  const summary = $('trophies-summary');
  if (!grid) return;

  const evaluated = TROPHIES.map(tr => {
    const r = tr.eval(STATE, me.id);
    const unlocked = r.current >= r.target;
    return { ...tr, ...r, unlocked, pct: Math.min(100, (r.current / r.target) * 100) };
  });

  // Detectar nuevos desbloqueos para celebrarlos
  const previouslyUnlocked = loadUnlockedTrophies();
  const nowUnlocked = new Set(evaluated.filter(t => t.unlocked).map(t => t.id));
  const justUnlocked = [...nowUnlocked].filter(id => !previouslyUnlocked.has(id));
  if (justUnlocked.length) {
    justUnlocked.forEach(id => {
      const tr = evaluated.find(t => t.id === id);
      celebrateTrophy(tr);
    });
    saveUnlockedTrophies(nowUnlocked);
  } else if (nowUnlocked.size !== previouslyUnlocked.size) {
    saveUnlockedTrophies(nowUnlocked);
  }

  // Orden: desbloqueados primero, luego por progreso descendente
  evaluated.sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    return b.pct - a.pct;
  });

  summary.textContent = `${nowUnlocked.size}/${TROPHIES.length} desbloqueados`;
  grid.innerHTML = evaluated.map(tr => {
    const rarity = TROPHY_RARITY[tr.rarity] || TROPHY_RARITY.common;
    return `
      <div class="trophy ${tr.unlocked ? 'unlocked' : 'locked'} rarity-${rarity.class}">
        <div class="trophy-emoji">${tr.emoji}</div>
        <div class="trophy-name">${esc(tr.name)}</div>
        <div class="trophy-desc">${esc(tr.desc)}</div>
        <div class="trophy-bar"><div class="trophy-bar-fill" style="width:${tr.pct}%;"></div></div>
        <div class="trophy-foot">
          <span class="trophy-rarity">${rarity.label}</span>
          <span class="trophy-progress">${Math.min(tr.current, tr.target)}/${tr.target}</span>
        </div>
      </div>
    `;
  }).join('');
}

function celebrateTrophy(tr) {
  showToast(`🏆 ¡Trofeo desbloqueado! ${tr.emoji} ${tr.name}`, 4500);
  if (typeof notifyOnce === 'function') {
    notifyOnce(`trophy:${tr.id}`, `🏆 ¡Trofeo desbloqueado!`, `${tr.emoji} ${tr.name} — ${tr.desc}`);
  }
  // Confetti DOM rápido
  const burst = document.createElement('div');
  burst.className = 'trophy-burst';
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('span');
    p.className = 'confetti';
    p.style.setProperty('--x', (Math.random() * 360 - 180) + 'px');
    p.style.setProperty('--y', (Math.random() * -260 - 80) + 'px');
    p.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    p.style.background = ['#FF1A4D', '#00F5FF', '#FFD93D', '#B14CFF', '#22F5A5'][i % 5];
    burst.appendChild(p);
  }
  document.body.appendChild(burst);
  setTimeout(() => burst.remove(), 2200);
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

  // Lunes como inicio de semana (ISO)
  const startOfWeek = new Date();
  const dow = (startOfWeek.getDay() + 6) % 7; // 0 = lun
  startOfWeek.setDate(startOfWeek.getDate() - dow);
  startOfWeek.setHours(0, 0, 0, 0);

  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const shortName = WEEKDAYS[i];
    // Una tarea pertenece a este día si:
    //  - su due_date coincide con el iso del día, o
    //  - es semanal sin due_date pero con weekday == shortName, o
    //  - no tiene due_date pero se marcó hecha ese día
    const dayTasks = STATE.tasks.filter(t => {
      if (t.due_date) return t.due_date === iso;
      if (t.scope === 'week' && t.weekday) return t.weekday === shortName;
      if (t.done && t.done_at) return t.done_at.slice(0, 10) === iso;
      return false;
    });
    // Ordenar: pendientes arriba, hechas abajo; pendientes por hora
    dayTasks.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (a.due_time || '').localeCompare(b.due_time || '');
    });
    weekDays.push({
      iso,
      dayNum: d.getDate(),
      dayName: WEEKDAYS_FULL[i],
      shortName,
      isToday: iso === today,
      isFuture: iso > today,
      tasks: dayTasks,
    });
  }

  if (tasksScope === 'today') {
    // Solo el día de hoy (mismo cálculo)
    const t = weekDays.find(d => d.isToday) || weekDays[0];
    $('tasks-list').innerHTML = `
      <div class="wk-cal">
        ${renderWeekDayCard(t, true)}
      </div>
    `;
  } else {
    // Calendario vertical: header de píldoras arriba + lista de días debajo
    const totalDone = weekDays.reduce((a, d) => a + d.tasks.filter(t => t.done).length, 0);
    const totalAll  = weekDays.reduce((a, d) => a + d.tasks.length, 0);
    $('tasks-list').innerHTML = `
      <div class="wk-cal">
        <div class="wk-cal-strip">
          ${weekDays.map(d => `
            <button class="wk-pill ${d.isToday ? 'today' : ''} ${d.isFuture ? 'future' : ''} ${d.tasks.length ? 'has' : ''}"
                    data-scroll-day="${d.iso}">
              <span class="wk-pill-dow">${d.shortName}</span>
              <span class="wk-pill-num">${d.dayNum}</span>
              ${d.tasks.length ? `<span class="wk-pill-dot">${d.tasks.length}</span>` : ''}
            </button>
          `).join('')}
        </div>
        <p class="wk-cal-sub">${totalDone}/${totalAll} cazadas esta semana ⚔️</p>
        <div class="wk-cal-stack">
          ${weekDays.map(d => renderWeekDayCard(d, false)).join('')}
        </div>
      </div>
    `;

    // Scroll suave al pulsar la píldora
    $$('.wk-pill').forEach(btn => btn.addEventListener('click', () => {
      const el = document.getElementById('wk-day-' + btn.dataset.scrollDay);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
  }
  wireTaskRows($('tasks-list'));
}

function renderWeekDayCard(d, soloMode) {
  const grad = ['g1','g2','g3','g4','g5','g6','g7'][ (new Date(d.iso + 'T00:00').getDay() + 6) % 7 ];
  const doneN = d.tasks.filter(t => t.done).length;
  const total = d.tasks.length;
  return `
    <article id="wk-day-${d.iso}" class="wk-day ${d.isToday ? 'today' : ''} ${d.isFuture ? 'future' : ''} ${total === 0 ? 'empty' : ''} ${soloMode ? 'solo' : ''}">
      <header class="wk-day-head wk-grad-${grad}">
        <div class="wk-day-head-left">
          <div class="wk-day-name">${d.dayName}</div>
          <div class="wk-day-date">${d.dayNum}</div>
        </div>
        <div class="wk-day-badge">
          ${total
            ? `<span class="wk-count">${doneN}/${total}</span><span class="wk-count-lbl">hechas</span>`
            : `<span class="wk-count-lbl">${d.isFuture ? '🌤 por venir' : '💤 vacío'}</span>`
          }
        </div>
      </header>
      <div class="wk-day-body">
        ${total
          ? `<div class="row-list">${d.tasks.map(taskRowHTML).join('')}</div>`
          : `<div class="wk-day-empty">${d.isToday ? '🚀 El día está virgen, dale candela' : (d.isFuture ? '🌱 Aquí brotará el caos pronto' : '😴 Día sin pelea registrada')}</div>`
        }
      </div>
    </article>
  `;
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
  
  // Generar días de la semana (lunes ISO, en hora local — sin toISOString)
  const weekDays = [];
  const startOfWeek = new Date();
  const dowStart = (startOfWeek.getDay() + 6) % 7;
  startOfWeek.setDate(startOfWeek.getDate() - dowStart);
  startOfWeek.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    weekDays.push({
      date: iso,
      dayName: WEEKDAYS_FULL[i],
      shortDay: WEEKDAYS[i],
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
    // Marcar el día actual por defecto si está en la semana, si no el primero
    const todayChip = document.querySelector(`.day-chip[data-date="${today}"]`);
    (todayChip || $$('.day-chip')[0])?.classList.add('active');
    if (todayChip) taskModalState.date = today;
  } else {
    $('task-date-input')?.addEventListener('change', e => {
      taskModalState.date = e.target.value || today;
    });
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
      const targetDate = taskModalState.date || today;
      const targetDow = (new Date(targetDate + 'T00:00').getDay() + 6) % 7;
      return {
        title: `${subcat.label}`,
        category: subcatId,
        room: taskModalState.room,
        subcategory: subcatId,
        emoji: subcat.emoji,
        assignee: assignee,
        scope: tasksScope,
        due_date: targetDate,
        weekday: isWeekScope ? WEEKDAYS[targetDow] : null,
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
    const id = b.dataset.delEvent;
    await db.from('events').delete().eq('id', id);
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
    const assignee = $('cloe-walk-walker').value || me.id;  // fallback al usuario actual

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
    if (walkError) { showToast('Error en paseo: ' + walkError.message); console.error('[cloe walk]', walkError); return; }

    // También insertar como tarea realizada (aparece en pestaña Tareas)
    const dateOnly = datetime.split('T')[0];
    const timeOnly = datetime.split('T')[1]?.slice(0, 5) || null;
    const dow = (new Date(dateOnly + 'T00:00').getDay() + 6) % 7;
    const { error: taskError } = await insertTask({
      title: 'Pasear a Cloe',
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
      weekday: WEEKDAYS[dow],
    });
    if (taskError) {
      console.error('[cloe walk → task]', taskError);
      showToast('⚠️ Paseo guardado pero falló crear la tarea: ' + taskError.message);
    } else {
      showToast(`✓ Paseo fichado · tarea añadida en Tareas`);
    }
    loadAll();
  });
});

// ── CLOE: Registrar bajada ────────────────────────────────
$('qa-cloe-down').addEventListener('submit', e => {
  e.preventDefault();
  withFormLock(e.target, async () => {
    const datetime = $('cloe-down-datetime').value;
    const reason = $('cloe-down-reason').value || 'otro';
    const assignee = $('cloe-down-person').value || me.id;  // fallback al usuario actual

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
    if (downError) { showToast('Error en bajada: ' + downError.message); console.error('[cloe down]', downError); return; }

    // También insertar como tarea realizada (aparece en pestaña Tareas)
    const dateOnly = datetime.split('T')[0];
    const timeOnly = datetime.split('T')[1]?.slice(0, 5) || null;
    const dow = (new Date(dateOnly + 'T00:00').getDay() + 6) % 7;
    const reasonEmoji = { pipi: '🚽', caca: '💩', jugar: '🎾', comer: '🍖', otro: '📝' }[reason] || '📝';
    const reasonLabel = { pipi: 'pipí', caca: 'caca', jugar: 'jugar', comer: 'comer', otro: 'otro' }[reason] || reason;
    const { error: taskError } = await insertTask({
      title: `Bajar a Cloe (${reasonLabel})`,
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
      weekday: WEEKDAYS[dow],
    });
    if (taskError) {
      console.error('[cloe down → task]', taskError);
      showToast('⚠️ Bajada guardada pero falló crear la tarea: ' + taskError.message);
    } else {
      showToast(`✓ Bajada fichada · tarea añadida en Tareas`);
    }
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
  .on('postgres_changes', { event: '*', schema: 'public', table: 'rewards'    }, debouncedLoad)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'redemptions'}, debouncedLoad)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'coin_rules' }, debouncedLoad)
  .subscribe();

// Cleanup al cerrar / salir
window.addEventListener('beforeunload', () => {
  try { db.removeChannel(realtimeChannel); } catch {}
});

setCloeDefaultDatetime();
loadAll();
