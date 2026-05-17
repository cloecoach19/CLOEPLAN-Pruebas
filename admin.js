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
// 🪙 Tareas y monedas (catálogo único)
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
      showToast('Error al cargar tareas');
    }
    taskCoinRules = [];
  } else {
    taskCoinRules = data || [];
  }
  renderTaskCoinRules();
}

function getMergedTaskRows() {
  // Combina TASK_SUBCATEGORIES (hardcoded) con las filas de la BD.
  // Cada fila resultante puede tener `value` (si está definido en BD) o null.
  const byKey = new Map(taskCoinRules.map(r => [`${r.room}:${r.subcategory}`, r]));
  const rooms = (typeof TASK_ROOMS !== 'undefined') ? TASK_ROOMS.slice() : [];
  const seenKeys = new Set();
  const rowsByRoom = {};

  for (const room of rooms) {
    const subs = (typeof TASK_SUBCATEGORIES !== 'undefined' && TASK_SUBCATEGORIES[room.id]) || [];
    rowsByRoom[room.id] = subs.map(s => {
      const key = `${room.id}:${s.id}`;
      seenKeys.add(key);
      const dbRow = byKey.get(key);
      return {
        room: room.id,
        subcategory: s.id,
        label: (dbRow && dbRow.label) || s.label,
        emoji: (dbRow && dbRow.emoji) || s.emoji || '✨',
        value: dbRow ? Math.max(0, dbRow.value || 0) : null,
        custom: false,
      };
    });
  }
  // Filas custom: existen en BD pero no en el hardcoded.
  for (const r of taskCoinRules) {
    const key = `${r.room}:${r.subcategory}`;
    if (seenKeys.has(key)) continue;
    if (!rowsByRoom[r.room]) rowsByRoom[r.room] = [];
    rowsByRoom[r.room].push({
      room: r.room,
      subcategory: r.subcategory,
      label: r.label || r.subcategory,
      emoji: r.emoji || '✨',
      value: Math.max(0, r.value || 0),
      custom: true,
    });
  }
  return { rooms, rowsByRoom };
}

function renderTaskCoinRules() {
  const list = $('task-coin-rules-list');
  if (!list) return;
  if (typeof TASK_ROOMS === 'undefined' || typeof TASK_SUBCATEGORIES === 'undefined') {
    list.innerHTML = '<p class="empty">Catálogo de tareas no disponible.</p>';
    return;
  }

  const { rooms, rowsByRoom } = getMergedTaskRows();

  const sections = rooms.map(room => {
    const rs = rowsByRoom[room.id] || [];
    if (!rs.length) return '';
    const rowsHTML = rs.map(r => {
      const placeholder = r.value === null ? '0' : '';
      const value = r.value === null ? '' : r.value;
      const isUnset = r.value === null || r.value === 0;
      const warnBadge = isUnset
        ? ' <span class="warn-chip" title="Esta tarea da 0 monedas">⚠️ sin configurar</span>'
        : '';
      const delBtn = r.custom
        ? `<button type="button" class="icon-btn danger" data-del-task-rule data-room="${esc(r.room)}" data-sub="${esc(r.subcategory)}" title="Eliminar tarea">🗑</button>`
        : '';
      return `
        <div class="coin-rule${isUnset ? ' coin-rule-warn' : ''}">
          <span class="coin-rule-emoji">${esc(r.emoji)}</span>
          <div class="coin-rule-text">
            <div class="coin-rule-label">${esc(r.label)}${r.custom ? ' <small class="muted">(personalizada)</small>' : ''}${warnBadge}</div>
          </div>
          <div class="coin-rule-input">
            <input type="number" min="0" max="9999" placeholder="${placeholder}" value="${value}"
                   data-task-room="${esc(r.room)}" data-task-sub="${esc(r.subcategory)}">
            <span class="coin-icon">🪙</span>
            ${delBtn}
          </div>
        </div>`;
    }).join('');
    return `
      <details class="task-coin-room" open>
        <summary><strong>${esc(room.emoji)} ${esc(room.label)}</strong></summary>
        ${rowsHTML}
      </details>`;
  }).join('');

  list.innerHTML = sections;

  $$('input[data-task-room]', list).forEach(inp => {
    inp.addEventListener('input', () => {
      taskCoinDirty = true;
      $('save-task-coin-rules').disabled = false;
    });
  });
  $$('[data-del-task-rule]', list).forEach(b => b.addEventListener('click', () => {
    deleteTaskRule(b.dataset.room, b.dataset.sub);
  }));
}

async function deleteTaskRule(room, subcategory) {
  if (!confirm('¿Eliminar esta tarea personalizada?')) return;
  const { error } = await db.from('task_coin_rules').delete().eq('room', room).eq('subcategory', subcategory);
  if (error) { showToast('Error: ' + error.message); return; }
  showToast('Tarea eliminada');
  await loadTaskCoinRules();
}

async function saveTaskCoinRules() {
  const list = $('task-coin-rules-list');
  if (!list) return;
  const inputs = $$('input[data-task-room]', list);
  const { rowsByRoom } = getMergedTaskRows();
  const allRows = Object.values(rowsByRoom).flat();
  const rowByKey = new Map(allRows.map(r => [`${r.room}:${r.subcategory}`, r]));

  const upserts = [];
  inputs.forEach(inp => {
    const room = inp.dataset.taskRoom;
    const sub  = inp.dataset.taskSub;
    const raw  = inp.value.trim();
    const key  = `${room}:${sub}`;
    const row  = rowByKey.get(key);
    const val  = raw === '' ? 0 : parseInt(raw, 10);
    if (!Number.isFinite(val) || val < 0) return;
    if (!row || row.value !== val) {
      upserts.push({
        room, subcategory: sub, value: val,
        label: row?.label || sub, emoji: row?.emoji || '✨'
      });
    }
  });

  if (!upserts.length) {
    showToast('No hay cambios que guardar');
    taskCoinDirty = false;
    $('save-task-coin-rules').disabled = true;
    return;
  }

  const btn = $('save-task-coin-rules');
  btn.disabled = true; btn.textContent = 'Guardando…';

  const { error } = await db.from('task_coin_rules').upsert(upserts, { onConflict: 'room,subcategory' });
  if (error) {
    showToast('Error: ' + error.message);
    btn.disabled = false; btn.textContent = 'Guardar cambios';
    return;
  }

  btn.textContent = '✓ Guardado';
  taskCoinDirty = false;
  showToast(`✓ ${upserts.length} ${upserts.length === 1 ? 'tarea actualizada' : 'tareas actualizadas'}`);
  setTimeout(() => { btn.textContent = 'Guardar cambios'; btn.disabled = true; }, 1800);
  await loadTaskCoinRules();
}

$('save-task-coin-rules')?.addEventListener('click', saveTaskCoinRules);

// ── Aplicar el mismo valor a TODAS las tareas a la vez ──
async function bulkApplyCoinValue() {
  const input = $('bulk-coin-value');
  if (!input) return;
  const val = parseInt(input.value, 10);
  if (!Number.isFinite(val) || val < 0) {
    showToast('Pon un valor válido (≥ 0)');
    return;
  }
  const { rowsByRoom } = getMergedTaskRows();
  const allRows = Object.values(rowsByRoom).flat();
  if (!allRows.length) { showToast('No hay tareas para actualizar'); return; }

  if (!confirm(`¿Aplicar ${val} 🪙 a TODAS las tareas (${allRows.length})? Sobreescribe los valores actuales.`)) return;

  const btn = $('bulk-coin-apply');
  if (btn) { btn.disabled = true; btn.textContent = 'Aplicando…'; }

  const upserts = allRows.map(r => ({
    room: r.room,
    subcategory: r.subcategory,
    value: val,
    label: r.label,
    emoji: r.emoji,
  }));
  const { error } = await db.from('task_coin_rules').upsert(upserts, { onConflict: 'room,subcategory' });

  if (btn) { btn.disabled = false; btn.textContent = 'Aplicar a todas'; }
  if (error) { showToast('Error: ' + error.message); return; }
  showToast(`✓ ${val} 🪙 aplicado a ${allRows.length} tareas`);
  await loadTaskCoinRules();
}

$('bulk-coin-apply')?.addEventListener('click', bulkApplyCoinValue);

// ── Modal: crear nueva tarea ─────────────────────────────
const newTaskRuleModal = $('new-task-rule-modal');
const newTaskRuleForm  = $('new-task-rule-form');

function openNewTaskRuleModal() {
  if (!newTaskRuleModal) return;
  // Rellenar selector de habitación
  const sel = newTaskRuleForm?.querySelector('[name=room]');
  if (sel && typeof TASK_ROOMS !== 'undefined') {
    sel.innerHTML = TASK_ROOMS.map(r => `<option value="${esc(r.id)}">${esc(r.emoji)} ${esc(r.label)}</option>`).join('');
  }
  newTaskRuleForm?.reset();
  if (sel) sel.value = sel.value || (TASK_ROOMS?.[0]?.id || '');
  newTaskRuleForm?.querySelector('[name=value]')?.setAttribute('value', '10');
  newTaskRuleModal.classList.remove('hidden');
  newTaskRuleForm?.querySelector('[name=label]')?.focus();
}
function closeNewTaskRuleModal() { newTaskRuleModal?.classList.add('hidden'); }

function slugify(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'tarea';
}

$('new-task-rule-btn')?.addEventListener('click', openNewTaskRuleModal);
$('close-new-task-rule')?.addEventListener('click', closeNewTaskRuleModal);
$('cancel-new-task-rule')?.addEventListener('click', closeNewTaskRuleModal);

newTaskRuleForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const fd = new FormData(newTaskRuleForm);
  const room  = String(fd.get('room') || '').trim();
  const label = String(fd.get('label') || '').trim();
  const emoji = String(fd.get('emoji') || '').trim() || '✨';
  const value = parseInt(fd.get('value'), 10);
  if (!room || !label || !Number.isFinite(value) || value < 0) {
    showToast('Revisa los campos'); return;
  }
  let base = slugify(label);
  let sub = base, n = 1;
  const keys = new Set(taskCoinRules.map(r => `${r.room}:${r.subcategory}`));
  const hardcodedKeys = new Set();
  if (typeof TASK_SUBCATEGORIES !== 'undefined' && TASK_SUBCATEGORIES[room]) {
    TASK_SUBCATEGORIES[room].forEach(s => hardcodedKeys.add(`${room}:${s.id}`));
  }
  while (keys.has(`${room}:${sub}`) || hardcodedKeys.has(`${room}:${sub}`)) {
    n++; sub = `${base}-${n}`;
  }
  const { error } = await db.from('task_coin_rules').upsert({
    room, subcategory: sub, label, emoji, value
  }, { onConflict: 'room,subcategory' });
  if (error) { showToast('Error: ' + error.message); return; }
  closeNewTaskRuleModal();
  showToast(`✓ Tarea "${label}" creada`);
  await loadTaskCoinRules();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && newTaskRuleModal && !newTaskRuleModal.classList.contains('hidden')) closeNewTaskRuleModal();
});

// ═══════════════════════════════════════════════════════
// 🎨 Picker de emojis para el formulario de premios
// ═══════════════════════════════════════════════════════
// Input destino actual del picker (cambia según el modal que lo abre).
let emojiPickerTarget = null;

function renderEmojiPicker(filterText = '') {
  const body = $('emoji-picker-body');
  if (!body || typeof EMOJI_CATALOG !== 'object') return;
  const q = filterText.trim().toLowerCase();

  const sections = Object.entries(EMOJI_CATALOG).map(([cat, emojis]) => {
    const catMatch = cat.toLowerCase().includes(q);
    const filteredEmojis = q && !catMatch ? [] : emojis;
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

  $$('.emoji-cell', body).forEach(b => b.addEventListener('click', () => {
    const emoji = b.dataset.emoji;
    if (!emoji || !emojiPickerTarget) return;
    emojiPickerTarget.value = emoji;
    emojiPickerTarget.dispatchEvent(new Event('input', { bubbles: true }));
    closeEmojiPicker();
  }));
}

function openEmojiPicker(target) {
  emojiPickerTarget = target || null;
  $('emoji-picker-modal')?.classList.remove('hidden');
  if ($('emoji-search')) $('emoji-search').value = '';
  renderEmojiPicker('');
  setTimeout(() => $('emoji-search')?.focus(), 60);
}
function closeEmojiPicker() {
  $('emoji-picker-modal')?.classList.add('hidden');
  emojiPickerTarget = null;
}

// Botones que abren el picker: data-open-emoji-picker="reward" o "task".
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-open-emoji-picker]');
  if (!btn) return;
  const kind = btn.dataset.openEmojiPicker;
  if (kind === 'reward' && rewardForm) openEmojiPicker(rewardForm.elements.emoji);
  else if (kind === 'task' && newTaskRuleForm) openEmojiPicker(newTaskRuleForm.elements.emoji);
});

$('close-emoji-picker')?.addEventListener('click', closeEmojiPicker);
$('emoji-search')?.addEventListener('input', e => renderEmojiPicker(e.target.value));

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('emoji-picker-modal')?.classList.contains('hidden')) {
    closeEmojiPicker();
  }
});

// Realtime: usuarios + tienda + reglas de monedas
// ═══════════════════════════════════════════════════════
// ⚠️ Reset de la app
// ═══════════════════════════════════════════════════════
// Tablas que se vacían en el reset. Se mantienen: users, rewards,
// coin_rules, task_coin_rules (catálogo y economía).
const RESET_TABLES = [
  'redemptions',
  'trophies_unlocked',
  'tasks',
  'shopping',
  'events',
  'cloe_walks',
  'cloe_downs',
];

const resetModal = $('reset-modal');
const resetInput = $('reset-confirm-input');
const resetConfirmBtn = $('confirm-reset');

function openResetModal() {
  if (!resetModal) return;
  if (resetInput) resetInput.value = '';
  if (resetConfirmBtn) resetConfirmBtn.disabled = true;
  resetModal.classList.remove('hidden');
  resetInput?.focus();
}
function closeResetModal() { resetModal?.classList.add('hidden'); }

$('reset-app-btn')?.addEventListener('click', openResetModal);
$('cancel-reset')?.addEventListener('click', closeResetModal);

resetInput?.addEventListener('input', () => {
  if (resetConfirmBtn) resetConfirmBtn.disabled = resetInput.value.trim() !== 'RESETEAR';
});

resetConfirmBtn?.addEventListener('click', async () => {
  if (resetInput?.value.trim() !== 'RESETEAR') return;
  resetConfirmBtn.disabled = true;
  resetConfirmBtn.textContent = 'Borrando…';
  const errors = [];
  for (const table of RESET_TABLES) {
    // Borra todas las filas. Filtro `id != null` para evitar el guard de
    // supabase-js que exige cláusula where (sirve para uuid y bigint).
    const { error } = await db.from(table).delete().not('id', 'is', null);
    if (error && !/relation|does not exist|42P01/i.test((error.message || '') + ' ' + (error.code || ''))) {
      errors.push(`${table}: ${error.message}`);
    }
  }
  // Limpiar caché local de "trofeos celebrados" para que vuelvan a celebrarse
  // tras volver a alcanzarlos.
  try { localStorage.removeItem('cloe-trophies-celebrated'); } catch {}
  try { localStorage.removeItem('cloe-trophies-unlocked'); } catch {}

  if (errors.length) {
    showToast('Reset parcial: ' + errors[0], 6000);
    console.error('Reset errors', errors);
  } else {
    showToast('✓ App reseteada. Empezamos de cero.', 5000);
  }
  resetConfirmBtn.textContent = 'Borrar todo';
  closeResetModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && resetModal && !resetModal.classList.contains('hidden')) closeResetModal();
});

db.channel('cloe-admin')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'users'       }, () => { loadUsers(); loadShop(); })
  .on('postgres_changes', { event: '*', schema: 'public', table: 'rewards'     }, loadShop)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'redemptions' }, loadShop)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'task_coin_rules' }, () => { if (!taskCoinDirty) loadTaskCoinRules(); })
  .subscribe();

loadUsers();
loadShop();
loadTaskCoinRules();
