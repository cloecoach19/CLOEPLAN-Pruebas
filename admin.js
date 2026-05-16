// CLOE te organiza · panel admin de miembros

const me = requireUser();
if (!me) throw new Error('no user');
if (me.role !== 'Admin') {
  alert('Solo el admin puede acceder a este panel.');
  window.location.href = 'app.html';
  throw new Error('not admin');
}

const $ = (id) => document.getElementById(id);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

$('user-av').outerHTML = avatarHTML(me, 'sm').replace('<span ', '<span id="user-av" ');
$('user-name').textContent = me.name;
$('logout').addEventListener('click', () => { clearUser(); window.location.href = 'index.html'; });

const tbody = $('users-tbody');
const empty = $('empty');
const userModal = $('user-modal');
const userForm  = $('user-form');
const confirmModal = $('confirm-modal');
let users = [];
let pendingDelete = null;

async function loadUsers() {
  const { data, error } = await db
    .from('users')
    .select('id,name,email,role,status,member_id,color,last_seen,created_at')
    .order('created_at');
  if (error) {
    if (typeof showToast === 'function') showToast('Error al cargar usuarios');
    users = [];
  } else {
    users = data || [];
  }
  render();
}

function render() {
  if (!users.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  tbody.innerHTML = users.map(u => `
    <tr>
      <td>
        <div class="user-cell">
          ${avatarHTML(u, 'sm')}
          <div>
            <strong>${esc(u.name)}</strong>
            <small>${esc(u.member_id || '')}</small>
          </div>
        </div>
      </td>
      <td>${esc(u.email)}</td>
      <td class="col-hide-mobile"><span class="role-chip role-${esc(u.role)}">${esc(u.role)}</span></td>
      <td class="col-hide-mobile"><span class="status-chip status-${esc(u.status)}">${u.status === 'active' ? 'Activo' : 'Inactivo'}</span></td>
      <td class="col-hide-mobile"><small class="muted">${fmtLastSeen(u.last_seen)}</small></td>
      <td style="text-align:right;">
        <button class="icon-btn" data-edit="${u.id}" aria-label="Editar">✏️</button>
        <button class="icon-btn danger" data-del="${u.id}" aria-label="Eliminar">🗑</button>
      </td>
    </tr>
  `).join('');
  $$('[data-edit]').forEach(b => b.addEventListener('click', () => openEdit(b.dataset.edit)));
  $$('[data-del]').forEach(b => b.addEventListener('click', () => askDelete(b.dataset.del)));
}

function fmtLastSeen(iso) {
  if (!iso) return '—';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'Ahora';
  if (diff < 3600) return `Hace ${Math.floor(diff/60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff/3600)} h`;
  return `Hace ${Math.floor(diff/86400)} d`;
}

function openCreate() {
  $('user-modal-title').textContent = 'Nuevo fichaje';
  userForm.reset();
  userForm.id.value = '';
  userModal.classList.remove('hidden');
  userForm.name.focus();
}

function openEdit(id) {
  const u = users.find(x => x.id === id);
  if (!u) return;
  $('user-modal-title').textContent = 'Tunear ficha · ' + u.name;
  userForm.reset();
  userForm.id.value = u.id;
  userForm.name.value = u.name;
  userForm.member_id.value = u.member_id || '';
  userForm.email.value = u.email;
  userForm.role.value = u.role;
  userForm.status.value = u.status;
  userForm.color.value = u.color || 'marina';
  userModal.classList.remove('hidden');
}

function closeUserModal() { userModal.classList.add('hidden'); }

userForm.addEventListener('submit', async e => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(userForm));
  const payload = {
    name: d.name.trim(),
    member_id: d.member_id.trim().toUpperCase().slice(0, 2),
    email: d.email.trim().toLowerCase(),
    role: d.role,
    status: d.status,
    color: d.color,
  };
  if (!d.id) payload.password = d.password || '';
  else if (d.password) payload.password = d.password;

  const submit = userForm.querySelector('button[type="submit"]');
  submit.disabled = true; submit.textContent = 'Guardando magia…';

  const { error } = d.id
    ? await db.from('users').update(payload).eq('id', d.id)
    : await db.from('users').insert(payload);

  submit.disabled = false; submit.textContent = 'Guardar';

  if (error) {
    showToast('Error: ' + error.message);
    return;
  }
  closeUserModal();
  loadUsers();
});

$('new-user-btn').addEventListener('click', openCreate);
$('close-user-modal').addEventListener('click', closeUserModal);
$('cancel-user').addEventListener('click', closeUserModal);
userModal.addEventListener('click', e => { if (e.target === userModal) closeUserModal(); });

// Borrado con confirmación
function askDelete(id) {
  const u = users.find(x => x.id === id);
  if (!u) return;
  if (u.id === me.id) { showToast('No puedes eliminarte a ti mismo.'); return; }
  pendingDelete = id;
  $('confirm-text').textContent = `Vas a eliminar a ${u.name}. Esta acción no se puede deshacer.`;
  confirmModal.classList.remove('hidden');
}
function closeConfirm() { confirmModal.classList.add('hidden'); pendingDelete = null; }
$('cancel-del').addEventListener('click', closeConfirm);
$('confirm-del').addEventListener('click', async () => {
  if (!pendingDelete) return;
  await db.from('users').delete().eq('id', pendingDelete);
  closeConfirm();
  loadUsers();
});
confirmModal.addEventListener('click', e => { if (e.target === confirmModal) closeConfirm(); });

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!userModal.classList.contains('hidden')) closeUserModal();
  if (!confirmModal.classList.contains('hidden')) closeConfirm();
});

// ═══════════════════════════════════════════════════════
// 🛍️ Gestión de tienda
// ═══════════════════════════════════════════════════════
let rewards = [];
let redemptions = [];
let allUsers = []; // necesario para mostrar nombre/avatar en pedidos
const rewardModal       = $('reward-modal');
const rewardForm        = $('reward-form');
const rewardConfirmModal = $('reward-confirm-modal');
let pendingRewardDelete = null;

async function loadShop() {
  const [rw, rd, us] = await Promise.all([
    db.from('rewards').select('*').order('cost'),
    db.from('redemptions').select('*').order('created_at', { ascending: false }),
    db.from('users').select('id,name,member_id,color,role,status'),
  ]);
  rewards     = rw.data || [];
  redemptions = rd.data || [];
  allUsers    = us.data || [];
  renderShop();
}

function renderShop() {
  renderRewardsGrid();
  renderRedemptions();
}

function renderRewardsGrid() {
  const grid = $('rewards-admin-grid');
  const empty = $('rewards-empty');
  if (!rewards.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  grid.innerHTML = rewards.map(r => `
    <div class="reward-card ${r.active ? '' : 'locked'}">
      <button class="reward-edit" data-edit-reward="${esc(r.id)}" title="Editar">✏️</button>
      <div class="reward-emoji">${esc(r.emoji || '🎁')}</div>
      <div class="reward-name">${esc(r.name)}</div>
      ${r.description ? `<div class="reward-desc">${esc(r.description)}</div>` : ''}
      <div class="reward-cost"><span class="coin-icon">🪙</span> ${r.cost}</div>
      <div class="reward-stock">
        ${r.stock === null ? '∞ disponible' : (r.stock <= 0 ? 'Agotado' : `Stock: ${r.stock}`)}
        ${r.active ? '' : ' · oculto'}
      </div>
    </div>
  `).join('');
  $$('[data-edit-reward]', grid).forEach(b => b.addEventListener('click', () => openRewardEdit(b.dataset.editReward)));
}

function userById(id) { return allUsers.find(u => u.id === id); }

function redemptionRow(r, withActions) {
  const user = userById(r.user_id);
  const when = new Date(r.created_at).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const statusInfo = {
    pending:   { lbl: '⏳ Pendiente',  cls: 'pending' },
    approved:  { lbl: '✅ Aprobado',   cls: 'approved' },
    rejected:  { lbl: '❌ Rechazado',  cls: 'rejected' },
    delivered: { lbl: '🎉 Entregado',  cls: 'delivered' },
  }[r.status] || { lbl: r.status, cls: '' };

  const actions = withActions ? `
    <button class="btn accent sm" data-approve="${esc(r.id)}">✓ Aprobar</button>
    <button class="btn ghost sm"  data-reject="${esc(r.id)}">✗ Rechazar</button>
  ` : (r.status === 'approved' ? `<button class="btn ghost sm" data-deliver="${esc(r.id)}">📦 Marcar entregado</button>` : '');

  return `
    <div class="row redemption ${statusInfo.cls}">
      <span class="row-emoji" style="font-size:22px;">${esc(r.reward_emoji || '🎁')}</span>
      ${avatarHTML(user, 'xs')}
      <span class="row-title">${esc(user?.name || '?')} → ${esc(r.reward_name)}</span>
      <span class="row-meta">
        <span class="chip mini-cost"><span class="coin-icon">🪙</span> ${r.cost_paid}</span>
        <span class="chip status-${statusInfo.cls}">${statusInfo.lbl}</span>
        <span class="row-time">${when}</span>
        ${actions}
      </span>
    </div>
  `;
}

function renderRedemptions() {
  const pending = redemptions.filter(r => r.status === 'pending');
  const others  = redemptions.filter(r => r.status !== 'pending').slice(0, 30);

  $('pending-count').textContent = pending.length ? `${pending.length} esperando` : 'Bandeja limpia 😎';
  $('redemptions-list').innerHTML = pending.length
    ? pending.map(r => redemptionRow(r, true)).join('')
    : '<p class="empty">Sin pedidos pendientes. Buen rollo en la casa.</p>';
  $('redemptions-history').innerHTML = others.length
    ? others.map(r => redemptionRow(r, false)).join('')
    : '<p class="empty muted" style="font-size:13px;">Aquí aparecerá el histórico de canjes.</p>';

  $$('[data-approve]').forEach(b => b.addEventListener('click', () => resolveRedemption(b.dataset.approve, 'approved')));
  $$('[data-reject]').forEach(b => b.addEventListener('click', () => resolveRedemption(b.dataset.reject, 'rejected')));
  $$('[data-deliver]').forEach(b => b.addEventListener('click', () => resolveRedemption(b.dataset.deliver, 'delivered')));
}

async function resolveRedemption(id, newStatus) {
  const patch = {
    status: newStatus,
    resolved_by: me.id,
    resolved_at: new Date().toISOString(),
  };
  const { error } = await db.from('redemptions').update(patch).eq('id', id);
  if (error) { showToast('Error: ' + error.message); return; }
  // Descontar stock al aprobar (si aplica)
  if (newStatus === 'approved' || newStatus === 'delivered') {
    const r = redemptions.find(x => x.id === id);
    const rw = rewards.find(x => x.id === r?.reward_id);
    if (rw && rw.stock !== null && rw.stock > 0) {
      await db.from('rewards').update({ stock: rw.stock - 1 }).eq('id', rw.id);
    }
  }
  showToast(newStatus === 'approved' ? '✓ Aprobado' : newStatus === 'rejected' ? '✗ Rechazado' : '🎉 Entregado');
  loadShop();
}

// ── Modal crear/editar premio ────────────────────────────
function openRewardCreate() {
  if (!rewardModal || !rewardForm) { showToast('La tienda no se ha cargado bien'); return; }
  $('reward-modal-title').textContent = 'Nuevo premio';
  rewardForm.reset();
  const els = rewardForm.elements;
  els.id.value = '';
  els.emoji.value = '🎁';
  els.cost.value = 50;
  els.active.value = 'true';
  $('del-reward-btn').classList.add('hidden');
  rewardModal.classList.remove('hidden');
  try { els.name.focus(); } catch {}
}

function openRewardEdit(id) {
  if (!rewardModal || !rewardForm) return;
  const r = rewards.find(x => x.id === id);
  if (!r) return;
  $('reward-modal-title').textContent = 'Editar · ' + r.name;
  rewardForm.reset();
  const els = rewardForm.elements;
  els.id.value = r.id;
  els.emoji.value = r.emoji || '🎁';
  els.cost.value = r.cost;
  els.name.value = r.name;
  els.description.value = r.description || '';
  els.stock.value = r.stock === null ? '' : r.stock;
  els.active.value = r.active ? 'true' : 'false';
  $('del-reward-btn').classList.remove('hidden');
  rewardModal.classList.remove('hidden');
}

function closeRewardModal() { rewardModal.classList.add('hidden'); }

// Si por algún motivo no existe el modal de premios (página antigua cacheada),
// no rompemos el resto del admin.
if (!rewardForm || !rewardModal) {
  console.warn('[admin] Tienda no encontrada en el DOM. Recarga forzada con Ctrl+F5 si has actualizado los archivos.');
}

rewardForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const fd = new FormData(rewardForm);
  const stockRaw = fd.get('stock');
  const payload = {
    name: fd.get('name').trim(),
    emoji: (fd.get('emoji') || '🎁').trim() || '🎁',
    cost: parseInt(fd.get('cost'), 10) || 1,
    description: (fd.get('description') || '').trim(),
    stock: stockRaw === '' || stockRaw == null ? null : parseInt(stockRaw, 10),
    active: fd.get('active') === 'true',
  };
  if (!payload.name) { showToast('El nombre es obligatorio'); return; }
  if (payload.cost < 1) { showToast('El coste debe ser positivo'); return; }

  const submit = rewardForm.querySelector('button[type="submit"]');
  submit.disabled = true; submit.textContent = 'Guardando…';

  const id = fd.get('id');
  let err;
  if (id) {
    ({ error: err } = await db.from('rewards').update(payload).eq('id', id));
  } else {
    payload.created_by = me.id;
    ({ error: err } = await db.from('rewards').insert(payload));
  }

  submit.disabled = false; submit.textContent = 'Guardar';
  if (err) { showToast('Error: ' + err.message); return; }
  closeRewardModal();
  loadShop();
});

// Delegación: aunque el botón "Nuevo premio" no exista todavía o si el script se cargó antes que el DOM,
// este click siempre funciona.
document.addEventListener('click', e => {
  if (e.target.closest('#new-reward-btn')) {
    e.preventDefault();
    openRewardCreate();
  }
});

$('close-reward-modal')?.addEventListener('click', closeRewardModal);
$('cancel-reward')?.addEventListener('click', closeRewardModal);
rewardModal?.addEventListener('click', e => { if (e.target === rewardModal) closeRewardModal(); });

$('del-reward-btn')?.addEventListener('click', () => {
  const id = rewardForm.elements.id.value;
  const r = rewards.find(x => x.id === id);
  if (!r) return;
  pendingRewardDelete = id;
  $('reward-confirm-text').textContent = `Vas a eliminar "${r.name}". Los canjes existentes mantendrán el nombre histórico pero el premio desaparece de la tienda.`;
  rewardConfirmModal.classList.remove('hidden');
});
$('cancel-reward-del')?.addEventListener('click', () => { rewardConfirmModal.classList.add('hidden'); pendingRewardDelete = null; });
$('confirm-reward-del')?.addEventListener('click', async () => {
  if (!pendingRewardDelete) return;
  const { error } = await db.from('rewards').delete().eq('id', pendingRewardDelete);
  if (error) { showToast('Error: ' + error.message); return; }
  rewardConfirmModal.classList.add('hidden');
  pendingRewardDelete = null;
  closeRewardModal();
  loadShop();
});
rewardConfirmModal?.addEventListener('click', e => { if (e.target === rewardConfirmModal) { rewardConfirmModal.classList.add('hidden'); pendingRewardDelete = null; } });

// Esc cierra modales de la tienda también
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (rewardModal && !rewardModal.classList.contains('hidden')) closeRewardModal();
  if (rewardConfirmModal && !rewardConfirmModal.classList.contains('hidden')) { rewardConfirmModal.classList.add('hidden'); pendingRewardDelete = null; }
});

// ═══════════════════════════════════════════════════════
// 🪙 Reglas de monedas
// ═══════════════════════════════════════════════════════
let coinRules = [];
let coinDirty = false;

async function loadCoinRules() {
  const { data } = await db.from('coin_rules').select('*').order('sort_order');
  coinRules = data || [];
  if (typeof applyCoinRules === 'function') applyCoinRules(coinRules);
  renderCoinRules();
  // Repinta también la lista fina porque su columna "auto" depende de las reglas globales.
  if (typeof taskCoinDirty !== 'undefined' && !taskCoinDirty) renderTaskCoinRules();
}

function renderCoinRules() {
  const list = $('coin-rules-list');
  if (!list) return;
  if (!coinRules.length) {
    list.innerHTML = '<p class="empty">No hay reglas configuradas. Ejecuta el SQL de setup.</p>';
    return;
  }
  list.innerHTML = coinRules.map(r => `
    <div class="coin-rule" data-key="${esc(r.key)}">
      <span class="coin-rule-emoji">${esc(r.emoji || '✨')}</span>
      <div class="coin-rule-text">
        <div class="coin-rule-label">${esc(r.label)}</div>
        <div class="coin-rule-desc">${esc(r.description || '')}</div>
      </div>
      <div class="coin-rule-input">
        <input type="number" min="0" max="9999" value="${r.value}" data-rule-key="${esc(r.key)}">
        <span class="coin-icon">🪙</span>
      </div>
    </div>
  `).join('');

  // Listener de cambios para activar el botón guardar
  $$('input[data-rule-key]', list).forEach(inp => {
    inp.addEventListener('input', () => {
      coinDirty = true;
      $('save-coin-rules').disabled = false;
    });
  });
}

async function saveCoinRules() {
  const list = $('coin-rules-list');
  if (!list) return;
  const inputs = $$('input[data-rule-key]', list);
  const updates = [];
  inputs.forEach(inp => {
    const key = inp.dataset.ruleKey;
    const val = parseInt(inp.value, 10);
    const cur = coinRules.find(r => r.key === key);
    if (cur && Number.isFinite(val) && val >= 0 && val !== cur.value) {
      updates.push({ key, value: val });
    }
  });
  if (!updates.length) {
    showToast('No hay cambios que guardar');
    coinDirty = false;
    $('save-coin-rules').disabled = true;
    return;
  }
  const btn = $('save-coin-rules');
  btn.disabled = true; btn.textContent = 'Guardando…';
  for (const u of updates) {
    const { error } = await db.from('coin_rules').update({ value: u.value }).eq('key', u.key);
    if (error) {
      showToast('Error: ' + error.message);
      btn.disabled = false; btn.textContent = 'Guardar cambios';
      return;
    }
  }
  btn.textContent = '✓ Guardado';
  coinDirty = false;
  showToast(`✓ ${updates.length} ${updates.length === 1 ? 'regla actualizada' : 'reglas actualizadas'}`);
  setTimeout(() => { btn.textContent = 'Guardar cambios'; btn.disabled = true; }, 1800);
  // Forzar recarga inmediata para aplicar los nuevos valores
  await loadCoinRules();
}

$('save-coin-rules')?.addEventListener('click', saveCoinRules);

// ═══════════════════════════════════════════════════════
// 🪙 Reglas de monedas por tarea concreta (room × subcategory)
// ═══════════════════════════════════════════════════════
let taskCoinRules = [];
let taskCoinDirty = false;

async function loadTaskCoinRules() {
  const { data, error } = await db.from('task_coin_rules').select('*');
  if (error) {
    const msg = (error.message || '') + ' ' + (error.code || '');
    if (/relation|does not exist|42P01/i.test(msg)) {
      showToast('⚠️ Falta ejecutar supabase_setup.sql (tabla task_coin_rules)', 6000);
    } else {
      showToast('Error al cargar reglas finas');
    }
    taskCoinRules = [];
  } else {
    taskCoinRules = data || [];
  }
  renderTaskCoinRules();
}

function renderTaskCoinRules() {
  const list = $('task-coin-rules-list');
  if (!list) return;
  if (typeof TASK_ROOMS === 'undefined' || typeof TASK_SUBCATEGORIES === 'undefined') {
    list.innerHTML = '<p class="empty">Catálogo de tareas no disponible.</p>';
    return;
  }
  // Asegura que el cálculo del "auto" usa las reglas globales más recientes.
  if (typeof applyCoinRules === 'function') applyCoinRules(coinRules);

  const byKey = new Map(taskCoinRules.map(r => [`${r.room}:${r.subcategory}`, r.value]));

  const sections = TASK_ROOMS.map(room => {
    const subs = TASK_SUBCATEGORIES[room.id] || [];
    if (!subs.length) return '';
    const rows = subs.map(sub => {
      const key = `${room.id}:${sub.id}`;
      const fallback = coinsForTask({ done: true, room: room.id, subcategory: sub.id }, { taskCoinRules: [] });
      const current = byKey.has(key) ? byKey.get(key) : '';
      return `
        <div class="coin-rule" data-room="${esc(room.id)}" data-sub="${esc(sub.id)}">
          <span class="coin-rule-emoji">${esc(sub.emoji || '✨')}</span>
          <div class="coin-rule-text">
            <div class="coin-rule-label">${esc(sub.label)}</div>
            <div class="coin-rule-desc">auto: 🪙 ${fallback}</div>
          </div>
          <div class="coin-rule-input">
            <input type="number" min="0" max="9999" placeholder="auto" value="${current === '' ? '' : current}"
                   data-task-room="${esc(room.id)}" data-task-sub="${esc(sub.id)}">
            <span class="coin-icon">🪙</span>
          </div>
        </div>`;
    }).join('');
    return `
      <details class="task-coin-room" open>
        <summary><strong>${esc(room.emoji)} ${esc(room.label)}</strong></summary>
        ${rows}
      </details>`;
  }).join('');

  list.innerHTML = sections;

  $$('input[data-task-room]', list).forEach(inp => {
    inp.addEventListener('input', () => {
      taskCoinDirty = true;
      $('save-task-coin-rules').disabled = false;
    });
  });
}

async function saveTaskCoinRules() {
  const list = $('task-coin-rules-list');
  if (!list) return;
  const inputs = $$('input[data-task-room]', list);
  const upserts = [];
  const deletes = [];
  const currentKeys = new Set(taskCoinRules.map(r => `${r.room}:${r.subcategory}`));

  inputs.forEach(inp => {
    const room = inp.dataset.taskRoom;
    const sub  = inp.dataset.taskSub;
    const raw  = inp.value.trim();
    const key  = `${room}:${sub}`;
    if (raw === '') {
      if (currentKeys.has(key)) deletes.push({ room, subcategory: sub });
      return;
    }
    const val = parseInt(raw, 10);
    if (!Number.isFinite(val) || val < 0) return;
    const cur = taskCoinRules.find(r => r.room === room && r.subcategory === sub);
    if (!cur || cur.value !== val) upserts.push({ room, subcategory: sub, value: val });
  });

  if (!upserts.length && !deletes.length) {
    showToast('No hay cambios que guardar');
    taskCoinDirty = false;
    $('save-task-coin-rules').disabled = true;
    return;
  }

  const btn = $('save-task-coin-rules');
  btn.disabled = true; btn.textContent = 'Guardando…';

  if (upserts.length) {
    const { error } = await db.from('task_coin_rules').upsert(upserts, { onConflict: 'room,subcategory' });
    if (error) {
      showToast('Error: ' + error.message);
      btn.disabled = false; btn.textContent = 'Guardar cambios';
      return;
    }
  }
  for (const d of deletes) {
    const { error } = await db.from('task_coin_rules').delete().eq('room', d.room).eq('subcategory', d.subcategory);
    if (error) { showToast('Error: ' + error.message); btn.disabled = false; btn.textContent = 'Guardar cambios'; return; }
  }

  btn.textContent = '✓ Guardado';
  taskCoinDirty = false;
  const n = upserts.length + deletes.length;
  showToast(`✓ ${n} ${n === 1 ? 'tarea actualizada' : 'tareas actualizadas'}`);
  setTimeout(() => { btn.textContent = 'Guardar cambios'; btn.disabled = true; }, 1800);
  await loadTaskCoinRules();
}

$('save-task-coin-rules')?.addEventListener('click', saveTaskCoinRules);

// ═══════════════════════════════════════════════════════
// 🎨 Picker de emojis para el formulario de premios
// ═══════════════════════════════════════════════════════
function renderEmojiPicker(filterText = '') {
  const body = $('emoji-picker-body');
  if (!body || typeof EMOJI_CATALOG !== 'object') return;
  const q = filterText.trim().toLowerCase();

  const sections = Object.entries(EMOJI_CATALOG).map(([cat, emojis]) => {
    const catMatch = cat.toLowerCase().includes(q);
    const filteredEmojis = q && !catMatch
      ? []   // si la categoría no coincide y hay query, omitimos (los emojis no tienen texto)
      : emojis;
    if (!filteredEmojis.length) return '';
    return `
      <div class="emoji-cat">
        <h5 class="emoji-cat-title">${esc(cat)}</h5>
        <div class="emoji-grid">
          ${filteredEmojis.map(e => `<button type="button" class="emoji-cell" data-emoji="${esc(e)}" title="${esc(e)}">${e}</button>`).join('')}
        </div>
      </div>
    `;
  }).join('');

  body.innerHTML = sections || '<p class="empty">Sin coincidencias. Prueba "comida", "ocio", "tech"…</p>';

  // Click → mete emoji en el input y cierra
  $$('.emoji-cell', body).forEach(b => b.addEventListener('click', () => {
    const emoji = b.dataset.emoji;
    if (!emoji || !rewardForm) return;
    rewardForm.elements.emoji.value = emoji;
    closeEmojiPicker();
  }));
}

function openEmojiPicker() {
  $('emoji-picker')?.classList.remove('hidden');
  renderEmojiPicker($('emoji-search')?.value || '');
  setTimeout(() => $('emoji-search')?.focus(), 60);
}
function closeEmojiPicker() {
  $('emoji-picker')?.classList.add('hidden');
}

$('open-emoji-picker')?.addEventListener('click', openEmojiPicker);
$('close-emoji-picker')?.addEventListener('click', closeEmojiPicker);
$('emoji-search')?.addEventListener('input', e => renderEmojiPicker(e.target.value));

// Esc dentro del picker
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('emoji-picker')?.classList.contains('hidden')) {
    closeEmojiPicker();
  }
});

// Realtime: usuarios + tienda + reglas de monedas
db.channel('cloe-admin')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'users'       }, () => { loadUsers(); loadShop(); })
  .on('postgres_changes', { event: '*', schema: 'public', table: 'rewards'     }, loadShop)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'redemptions' }, loadShop)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'coin_rules'  }, () => { if (!coinDirty) loadCoinRules(); })
  .on('postgres_changes', { event: '*', schema: 'public', table: 'task_coin_rules' }, () => { if (!taskCoinDirty) loadTaskCoinRules(); })
  .subscribe();

loadUsers();
loadShop();
loadCoinRules();
loadTaskCoinRules();
