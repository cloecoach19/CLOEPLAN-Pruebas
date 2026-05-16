// ═══════════════════════════════════════════════════════
// CLOE · Sincronización con Google Calendar (bidireccional)
// ═══════════════════════════════════════════════════════
// Requiere:
//   - GOOGLE_CLIENT_ID en config.js (vacío = integración desactivada)
//   - Google Identity Services cargado (script en app.html)
//   - Helper `me` (usuario actual de CLOE)
//   - Función `loadAll()` y objeto `STATE` ya inicializados (app.js)
// ═══════════════════════════════════════════════════════

const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly';
const GCAL_TOKEN_KEY = () => `gcal-token-${me?.id || 'anon'}`;
const GCAL_PROFILE_KEY = () => `gcal-profile-${me?.id || 'anon'}`;
const GCAL_LAST_SYNC_KEY = () => `gcal-last-sync-${me?.id || 'anon'}`;

let gcalTokenClient = null;
let gcalReadyPromise = null;

const gcalEnabled = () => typeof GOOGLE_CLIENT_ID === 'string' && GOOGLE_CLIENT_ID.length > 0;

// ── Inicialización del Token Client (cuando GIS esté cargado) ─
function gcalReady() {
  if (gcalReadyPromise) return gcalReadyPromise;
  gcalReadyPromise = new Promise((resolve, reject) => {
    if (!gcalEnabled()) return reject(new Error('GOOGLE_CLIENT_ID no configurado'));
    let tries = 0;
    (function wait() {
      if (window.google?.accounts?.oauth2) return resolve();
      if (++tries > 50) return reject(new Error('Google Identity Services no cargado'));
      setTimeout(wait, 100);
    })();
  }).then(() => {
    gcalTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GCAL_SCOPE,
      prompt: '',                  // se sobrescribe por llamada
      callback: () => {},          // se sobrescribe por llamada
    });
  });
  return gcalReadyPromise;
}

// ── Token storage ────────────────────────────────────────
function gcalGetToken() {
  try {
    const raw = JSON.parse(localStorage.getItem(GCAL_TOKEN_KEY()));
    if (!raw || !raw.access_token || !raw.expires_at) return null;
    if (Date.now() > raw.expires_at - 30_000) return null; // expirado o casi
    return raw.access_token;
  } catch { return null; }
}
function gcalSetToken(tokenResponse) {
  const expiresIn = (tokenResponse.expires_in || 3600) * 1000;
  const stored = {
    access_token: tokenResponse.access_token,
    expires_at: Date.now() + expiresIn,
  };
  localStorage.setItem(GCAL_TOKEN_KEY(), JSON.stringify(stored));
}
function gcalClearToken() {
  localStorage.removeItem(GCAL_TOKEN_KEY());
  localStorage.removeItem(GCAL_PROFILE_KEY());
  localStorage.removeItem(GCAL_LAST_SYNC_KEY());
}
function gcalGetProfile() {
  try { return JSON.parse(localStorage.getItem(GCAL_PROFILE_KEY())); } catch { return null; }
}
function gcalIsConnected() { return !!gcalGetToken(); }

// ── Sign-in / sign-out ──────────────────────────────────
async function gcalSignIn(silent = false) {
  await gcalReady();
  return new Promise((resolve, reject) => {
    gcalTokenClient.callback = async (resp) => {
      if (resp.error) return reject(new Error(resp.error));
      gcalSetToken(resp);
      // Recuperar email del usuario para mostrarlo
      try {
        const r = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList/primary', {
          headers: { Authorization: `Bearer ${resp.access_token}` },
        });
        if (r.ok) {
          const cal = await r.json();
          localStorage.setItem(GCAL_PROFILE_KEY(), JSON.stringify({
            email: cal.id,
            summary: cal.summary,
            calendarId: cal.id,
          }));
        }
      } catch {}
      resolve(resp.access_token);
    };
    try {
      gcalTokenClient.requestAccessToken({ prompt: silent ? 'none' : '' });
    } catch (e) { reject(e); }
  });
}

async function gcalSignOut() {
  const token = gcalGetToken();
  if (token && window.google?.accounts?.oauth2?.revoke) {
    google.accounts.oauth2.revoke(token, () => {});
  }
  gcalClearToken();
}

// ── API helper ──────────────────────────────────────────
async function gcalApi(path, options = {}) {
  let token = gcalGetToken();
  if (!token) {
    // Intento silencioso de renovar
    try { await gcalSignIn(true); token = gcalGetToken(); }
    catch { throw new Error('Sin token Google. Reconéctate.'); }
  }
  const url = path.startsWith('http') ? path : `https://www.googleapis.com/calendar/v3${path}`;
  const r = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (r.status === 204) return null;
  if (!r.ok) {
    if (r.status === 401) gcalClearToken();
    const t = await r.text();
    throw new Error(`Google API ${r.status}: ${t}`);
  }
  return r.json();
}

// ── Conversión CLOE ↔ Google ────────────────────────────
function cloeToGoogleEvent(e) {
  // CLOE: { title, date, time?, notes?, ... }
  // Google: start.date / start.dateTime
  const start = {}, end = {};
  if (e.time && /^\d{2}:\d{2}/.test(e.time)) {
    const [h, m] = e.time.split(':').map(Number);
    const startDt = new Date(`${e.date}T${e.time}:00`);
    const endDt = new Date(startDt.getTime() + 60 * 60_000); // duración por defecto 1h
    start.dateTime = startDt.toISOString();
    end.dateTime = endDt.toISOString();
    start.timeZone = end.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } else {
    start.date = e.date;
    // En Google, las dateOnly son [start, end) → end es el día siguiente
    const d = new Date(e.date + 'T00:00');
    d.setDate(d.getDate() + 1);
    end.date = d.toISOString().slice(0, 10);
  }
  return {
    summary: e.title,
    description: e.notes || `[CLOE] ${e.category || ''}`.trim(),
    start, end,
  };
}

function googleToCloeEvent(g) {
  const dateOnly = g.start?.date || (g.start?.dateTime || '').slice(0, 10);
  const time = g.start?.dateTime ? g.start.dateTime.slice(11, 16) : null;
  return {
    title: g.summary || '(sin título)',
    date: dateOnly,
    time,
    category: 'general',
    notes: g.description || '',
    gcal_event_id: g.id,
    gcal_calendar_id: 'primary',
    gcal_synced_at: new Date().toISOString(),
  };
}

// ── Operaciones públicas ────────────────────────────────
async function gcalListUpcoming(daysBack = 7, daysAhead = 90) {
  const tMin = new Date(Date.now() - daysBack * 86400_000).toISOString();
  const tMax = new Date(Date.now() + daysAhead * 86400_000).toISOString();
  const url = `/calendars/primary/events?singleEvents=true&orderBy=startTime` +
              `&maxResults=250&timeMin=${encodeURIComponent(tMin)}&timeMax=${encodeURIComponent(tMax)}`;
  const data = await gcalApi(url);
  return (data.items || []).filter(e => e.status !== 'cancelled');
}

async function gcalCreateEvent(cloeEvent) {
  const body = cloeToGoogleEvent(cloeEvent);
  const created = await gcalApi('/calendars/primary/events', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return created; // tiene .id
}

async function gcalUpdateEvent(eventId, cloeEvent) {
  const body = cloeToGoogleEvent(cloeEvent);
  return gcalApi(`/calendars/primary/events/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

async function gcalDeleteEvent(eventId) {
  return gcalApi(`/calendars/primary/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
  });
}

// ── Sincronización completa con Supabase ────────────────
// Estrategia:
//  1. Bajar últimos eventos de Google.
//  2. Comparar con lo que ya tengo en Supabase (por gcal_event_id).
//  3. Insertar los nuevos, actualizar los modificados, borrar los que ya no están.
async function gcalSyncDown() {
  if (!gcalIsConnected()) return { added: 0, updated: 0, removed: 0 };
  const items = await gcalListUpcoming();
  const googleIds = new Set(items.map(g => g.id));

  // Filas en Supabase con vínculo a Google (de cualquier user, único globalmente)
  const { data: linked } = await db.from('events').select('*').not('gcal_event_id', 'is', null);
  const linkedById = new Map((linked || []).map(r => [r.gcal_event_id, r]));

  let added = 0, updated = 0, removed = 0;

  // Insert / update
  for (const g of items) {
    const cloe = googleToCloeEvent(g);
    cloe.assignee = me.id; // los eventos de Google se asignan al que sincroniza
    const existing = linkedById.get(g.id);
    if (existing) {
      // Comparar campos básicos para evitar updates innecesarios
      if (existing.title !== cloe.title || existing.date !== cloe.date || existing.time !== cloe.time) {
        await db.from('events').update({
          title: cloe.title, date: cloe.date, time: cloe.time, notes: cloe.notes,
          gcal_synced_at: cloe.gcal_synced_at,
        }).eq('id', existing.id);
        updated++;
      }
    } else {
      await db.from('events').insert(cloe);
      added++;
    }
  }

  // Borrar locales cuyo Google ya no existe (solo dentro del rango sincronizado)
  for (const row of (linked || [])) {
    if (!googleIds.has(row.gcal_event_id)) {
      // Solo borrar si está dentro del rango (no quitar viejos)
      const d = new Date(row.date);
      if (d > new Date(Date.now() - 8 * 86400_000)) {
        await db.from('events').delete().eq('id', row.id);
        removed++;
      }
    }
  }

  localStorage.setItem(GCAL_LAST_SYNC_KEY(), String(Date.now()));
  return { added, updated, removed };
}

// ── Empuja un evento creado/editado/borrado en CLOE a Google ─
async function gcalPushEvent(cloeEvent, action = 'create') {
  if (!gcalIsConnected()) return null;
  try {
    if (action === 'create') {
      const created = await gcalCreateEvent(cloeEvent);
      // Devuelve el id para que app.js lo guarde en Supabase
      return { gcal_event_id: created.id, gcal_calendar_id: 'primary', gcal_synced_at: new Date().toISOString() };
    }
    if (action === 'update' && cloeEvent.gcal_event_id) {
      await gcalUpdateEvent(cloeEvent.gcal_event_id, cloeEvent);
      return { gcal_synced_at: new Date().toISOString() };
    }
    if (action === 'delete' && cloeEvent.gcal_event_id) {
      await gcalDeleteEvent(cloeEvent.gcal_event_id);
      return null;
    }
  } catch (e) {
    console.warn('[gcal] push error:', e.message);
    showToast('⚠️ Google Calendar: ' + e.message);
    return null;
  }
}

// ── UI helper: pintar el chip / botón ───────────────────
function gcalRefreshButton() {
  const btn = document.getElementById('gcal-toggle');
  if (!btn) return;
  if (!gcalEnabled()) { btn.style.display = 'none'; return; }
  btn.style.display = '';
  if (gcalIsConnected()) {
    const p = gcalGetProfile();
    btn.classList.add('connected');
    btn.innerHTML = `<span class="g-dot"></span> Google · ${p?.email ? p.email.split('@')[0] : 'conectado'}`;
    btn.title = `Conectado a ${p?.email || 'Google Calendar'}. Click para desconectar.`;
  } else {
    btn.classList.remove('connected');
    btn.innerHTML = '🔗 Conectar Google';
    btn.title = 'Sincronizar con tu Google Calendar';
  }
}

async function gcalToggle() {
  if (gcalIsConnected()) {
    if (!confirm('¿Desconectar Google Calendar? Tus eventos seguirán en CLOE pero dejarán de sincronizarse.')) return;
    await gcalSignOut();
    gcalRefreshButton();
    showToast('Google Calendar desconectado');
    return;
  }
  try {
    await gcalSignIn(false);
    gcalRefreshButton();
    showToast('✓ Google Calendar conectado, sincronizando…');
    const r = await gcalSyncDown();
    showToast(`✓ Google: +${r.added} nuevos, ${r.updated} actualizados`);
    if (typeof loadAll === 'function') loadAll();
  } catch (e) {
    showToast('No se pudo conectar: ' + e.message);
  }
}

// Polling y eventos automáticos
function gcalStartAutoSync() {
  if (!gcalEnabled()) return;
  // Primer sync silencioso si hay token
  gcalReady().then(async () => {
    if (gcalIsConnected()) {
      try {
        await gcalSyncDown();
        if (typeof loadAll === 'function') loadAll();
      } catch (e) { console.warn('[gcal] sync inicial:', e.message); }
    } else {
      // Intento silencioso por si tiene sesión Google activa
      try { await gcalSignIn(true); gcalRefreshButton(); } catch {}
    }
  });

  // Cada 10 minutos
  setInterval(async () => {
    if (gcalIsConnected()) {
      try {
        const r = await gcalSyncDown();
        if (r.added || r.updated || r.removed) {
          if (typeof loadAll === 'function') loadAll();
        }
      } catch (e) { console.warn('[gcal] poll:', e.message); }
    }
  }, 10 * 60_000);

  // Al volver a la pestaña
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && gcalIsConnected()) {
      gcalSyncDown().catch(() => {});
    }
  });
}
