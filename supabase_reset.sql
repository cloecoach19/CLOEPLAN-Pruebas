-- ════════════════════════════════════════════════════
-- ⚠️ DESTRUCTIVO — Limpiar proyecto Supabase
-- ════════════════════════════════════════════════════
--
-- Este script BORRA todas las tablas y datos de la app
-- anterior (POLLITO House) para empezar de cero con CLOE.
--
-- NO HAY MARCHA ATRÁS. Si tienes algo que quieras
-- conservar, exporta los datos primero desde
-- Supabase → Table Editor → tabla → ... → Export to CSV.
--
-- Pasos:
--   1) Ejecuta ESTE script en SQL Editor → Run.
--   2) Luego ejecuta supabase_setup.sql (crea tablas CLOE).
--   3) Activa Realtime en Database → Replication para las
--      6 tablas (users, tasks, shopping, events, cloe_walks, cloe_downs).
-- ════════════════════════════════════════════════════

-- Soltar políticas existentes (si las hay)
drop policy if exists "public" on public.cloe_downs;
drop policy if exists "public" on public.cloe_walks;
drop policy if exists "public" on public.events;
drop policy if exists "public" on public.shopping;
drop policy if exists "public" on public.menus;
drop policy if exists "public" on public.users;
drop policy if exists "public" on public.tasks;

-- Soltar tablas (CASCADE elimina también las referencias)
drop table if exists public.cloe_downs cascade;
drop table if exists public.cloe_walks cascade;
drop table if exists public.events   cascade;
drop table if exists public.shopping cascade;
drop table if exists public.menus    cascade;
drop table if exists public.tasks    cascade;
drop table if exists public.users    cascade;

-- (Quitar la publicación de Realtime también — opcional, se vuelve a configurar luego)
-- Las suscripciones de Realtime se gestionan en Database → Replication en la UI.
