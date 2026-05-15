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
  const { data } = await db.from('users').select('*').order('created_at');
  users = data || [];
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
  $('user-modal-title').textContent = 'Nuevo miembro';
  userForm.reset();
  userForm.id.value = '';
  userModal.classList.remove('hidden');
  userForm.name.focus();
}

function openEdit(id) {
  const u = users.find(x => x.id === id);
  if (!u) return;
  $('user-modal-title').textContent = 'Editar · ' + u.name;
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
  submit.disabled = true; submit.textContent = 'Guardando…';

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

// Realtime
db.channel('cloe-admin')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, loadUsers)
  .subscribe();

loadUsers();
