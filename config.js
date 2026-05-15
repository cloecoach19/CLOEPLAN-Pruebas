/* ═══════════════════════════════════════════════════════
   CLOE te organiza · Configuración de Supabase
   ═══════════════════════════════════════════════════════

   PASOS:
   1. Ve a https://supabase.com → New project (plan Free).
   2. Settings → API → copia "Project URL" y "anon public".
   3. Pégalos abajo en SUPABASE_URL y SUPABASE_ANON_KEY.
   4. SQL Editor → pega supabase_setup.sql → Run.
   5. Database → Replication → activa las 4 tablas
      (users, tasks, shopping, events).
   6. Cambia la contraseña del usuario admin@cloe.es
      desde la pestaña Admin de la app, o en el SQL.

   La SERVICE ROLE KEY NUNCA debe estar aquí: este archivo
   se sirve al navegador. Solo la anon (publishable) key.
   ═══════════════════════════════════════════════════════ */

const SUPABASE_URL      = 'https://rjrjgrwdkcdplmidaggi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rJYhhSnQqLhCtr_dpUK1Ow_nW6dNch5';
