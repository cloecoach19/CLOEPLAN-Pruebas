-- ════════════════════════════════════════════════════
-- CLOE te organiza · Setup de Supabase
-- Ejecutar en: tu proyecto Supabase → SQL Editor → New query → Run
-- Es idempotente: puedes re-ejecutarlo sin perder datos.
-- ════════════════════════════════════════════════════


-- ── Usuarios de la casa ───────────────────────────────────
create table if not exists users (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null unique,
  password   text not null default '',
  role       text not null default 'Miembro',   -- Admin | Miembro
  member_id  text not null default 'M',         -- Letra para el avatar (M/C/L/P/…)
  color      text not null default 'marina',    -- marina | carlos | lucia | pablo
  status     text not null default 'active',    -- active | inactive
  last_seen  timestamptz default now(),
  created_at timestamptz default now()
);

-- ── Tareas (hoy + semanales) ──────────────────────────────
create table if not exists tasks (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  category   text not null default 'general',   -- limpieza | compra | cocina | niños | plantas | recados | salud | social | cole | general
  room       text,                              -- salón | cocina | baño | cloe | ...
  subcategory text,                             -- tarea concreta dentro de la estancia
  emoji      text default '',
  scope      text not null default 'today',     -- today | week
  assignee   uuid references users(id) on delete set null,
  due_date   date,                              -- p.ej. 2026-05-20 (para "hoy" = hoy)
  due_time   text,                              -- HH:MM o null
  weekday    text,                              -- lun..dom (solo si scope='week')
  done       boolean not null default false,
  done_at    timestamptz,
  created_at timestamptz default now()
);

alter table tasks add column if not exists room text;
alter table tasks add column if not exists subcategory text;

-- ── Lista de la compra ────────────────────────────────────
create table if not exists shopping (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  quantity   text default '',
  category   text not null default 'otros',     -- fruta | verdura | carne | lácteos | panadería | despensa | hogar | mascota | otros
  added_by   uuid references users(id) on delete set null,
  done       boolean not null default false,
  done_at    timestamptz,
  created_at timestamptz default now()
);

-- ── Calendario / eventos ──────────────────────────────────
create table if not exists events (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  date       date not null,
  time       text,                              -- HH:MM o null = todo el día
  duration   text default '1h',                 -- 30m | 1h | 2h | 1d
  category   text not null default 'general',   -- salud | cole | social | recados | general
  assignee   uuid references users(id) on delete set null,
  notes      text default '',
  created_at timestamptz default now()
);

-- ── Cloe: Paseos ──────────────────────────────────────────
create table if not exists cloe_walks (
  id         uuid primary key default gen_random_uuid(),
  datetime   timestamptz not null,
  duration   int not null default 30,           -- duración en minutos
  assignee   uuid references users(id) on delete set null,
  notes      text default '',
  created_at timestamptz default now()
);

-- ── Cloe: Bajadas ─────────────────────────────────────────
create table if not exists cloe_downs (
  id         uuid primary key default gen_random_uuid(),
  datetime   timestamptz not null,
  reason     text not null default 'otro',      -- pipi | caca | jugar | comer | otro
  assignee   uuid references users(id) on delete set null,
  notes      text default '',
  created_at timestamptz default now()
);

-- ── Tienda: catálogo de premios ───────────────────────────
create table if not exists rewards (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  emoji       text not null default '🎁',
  cost        int  not null check (cost > 0),
  description text default '',
  active      boolean not null default true,
  stock       int  default null,                 -- null = stock infinito; 0 = agotado
  created_by  uuid references users(id) on delete set null,
  created_at  timestamptz default now()
);

-- ── Tienda: canjes / pedidos ──────────────────────────────
create table if not exists redemptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  reward_id    uuid references rewards(id) on delete set null,
  reward_name  text not null,                    -- snapshot por si se borra el premio
  reward_emoji text not null default '🎁',
  cost_paid    int  not null,                    -- snapshot del coste al canjear
  status       text not null default 'pending',  -- pending | approved | rejected | delivered
  resolved_by  uuid references users(id) on delete set null,
  resolved_at  timestamptz,
  note         text default '',
  created_at   timestamptz default now()
);

-- ── Row Level Security: abierto a anon (uso familiar privado) ─
alter table users    enable row level security;
alter table tasks    enable row level security;
alter table shopping enable row level security;
alter table events   enable row level security;
alter table cloe_walks  enable row level security;
alter table cloe_downs  enable row level security;
alter table rewards     enable row level security;
alter table redemptions enable row level security;

drop policy if exists "public" on users;
drop policy if exists "public" on tasks;
drop policy if exists "public" on shopping;
drop policy if exists "public" on events;
drop policy if exists "public" on cloe_walks;
drop policy if exists "public" on cloe_downs;
drop policy if exists "public" on rewards;
drop policy if exists "public" on redemptions;

create policy "public" on users    for all using (true) with check (true);
create policy "public" on tasks    for all using (true) with check (true);
create policy "public" on shopping for all using (true) with check (true);
create policy "public" on events   for all using (true) with check (true);
create policy "public" on cloe_walks  for all using (true) with check (true);
create policy "public" on cloe_downs  for all using (true) with check (true);
create policy "public" on rewards     for all using (true) with check (true);
create policy "public" on redemptions for all using (true) with check (true);

-- ── Realtime ──────────────────────────────────────────────
-- Tras ejecutar este SQL, ve a Database → Replication y activa
-- las 8 tablas (users, tasks, shopping, events, cloe_walks, cloe_downs, rewards, redemptions).
-- Sin esto los cambios no se sincronizan en vivo entre dispositivos.

-- ── Premios iniciales (demo) ──────────────────────────────
insert into rewards (name, emoji, cost, description) values
  ('Película de los viernes',  '🎬', 80,  'Eliges la peli de la noche del viernes'),
  ('Postre extra',             '🍦', 30,  'Doble postre tras la cena'),
  ('30 min más de tablet',     '📱', 60,  'Bonus de pantalla un día entre semana'),
  ('Pasear a Cloe libre',      '🐶', 100, 'Te libras de pasear a Cloe esta semana'),
  ('Elegir cena',              '🍕', 120, 'Tú mandas en la cena del próximo finde'),
  ('Ir al cine',               '🎟️', 250, 'Plan de cine en familia'),
  ('Salir a desayunar',        '🥐', 200, 'Desayuno fuera el sábado'),
  ('Comprarte un cómic',       '📚', 350, 'Vale por un libro o cómic')
on conflict do nothing;

-- ── Usuario admin inicial ─────────────────────────────────
-- Cambia la contraseña antes de ejecutar.
insert into users (name, email, password, role, member_id, color)
values ('Admin', 'admin@cloe.es', 'cambiar-esto', 'Admin', 'A', 'marina')
on conflict (email) do nothing;
