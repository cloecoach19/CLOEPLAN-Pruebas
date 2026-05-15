# CLOE te organiza

Gestor familiar de **tareas domésticas**, **lista de la compra** y **calendario** compartido, con panel admin de miembros. Diseño cálido inspirado en el prototipo CLOE (paleta terracota + Bricolage Grotesque).

- Móvil + ordenador (responsive + instalable como PWA).
- Sincronización en tiempo real entre dispositivos (Supabase Realtime).
- Sin build, sin npm: HTML+JS plano. Despliegue inmediato en Vercel.

## Estructura

```
index.html      Login
app.html        App principal (Hoy / Tareas / Compra / Calendario)
admin.html      Panel admin (gestión de miembros)
config.js       Claves Supabase (cambiar antes de desplegar)
shared.js       Cliente Supabase + helpers
app.js          Lógica de la app
admin.js        Lógica del admin
styles.css      Diseño completo
supabase_setup.sql  SQL para crear las tablas
sw.js           Service Worker (PWA / offline)
manifest.json   PWA manifest
icon.svg        Icono de la app
vercel.json     Config de despliegue
prototype/      Maquetas originales (referencia visual, no se despliega)
```

## Setup (10 minutos)

### 1. Supabase

1. Usa tu proyecto Supabase (ya configurado en `config.js`).
2. **⚠️ Si el proyecto tenía tablas viejas** (de POLLITO u otro): **SQL Editor** → pega [`supabase_reset.sql`](supabase_reset.sql) → **Run**. Esto borra todo. Salta este paso si el proyecto está limpio.
3. **SQL Editor** → New query → pega el contenido de [`supabase_setup.sql`](supabase_setup.sql) → **Run**.
4. **Database → Replication** → activa las 4 tablas: `users`, `tasks`, `shopping`, `events`.
5. **Settings → API** → copia:
   - **Project URL**
   - **anon public** key
5. Pega ambas en [`config.js`](config.js):
   ```js
   const SUPABASE_URL      = 'https://TU-PROYECTO.supabase.co';
   const SUPABASE_ANON_KEY = 'eyJhbG...tu-anon-key...';
   ```

### 2. Primera contraseña del admin

El SQL crea un usuario inicial:
- email: `admin@cloe.es`
- password: `cambiar-esto`
- role: `Admin`

**Cámbiala** lo antes posible:
- Opción A: desde la app → entra como admin → pestaña Admin → editar al admin → poner nueva contraseña.
- Opción B: en Supabase → Table Editor → tabla `users` → editar la fila del admin.

### 3. Vercel

1. Sube el repo a GitHub.
2. Entra en https://vercel.com → New Project → importa el repo.
3. Sin variables de entorno (todo va en `config.js`). Deploy.
4. Tu app está en `https://tu-proyecto.vercel.app`.

## Uso

- **Login**: `index.html`. El admin crea a los miembros desde `admin.html`; cada uno entra con su email y contraseña.
- **Tareas**: dos modos, "Hoy" (con fecha límite) o "Semana" (rotación libre por día). Marca, asigna, edita doble click.
- **Compra**: agrupada por categorías, marca al comprar, se reordena automáticamente.
- **Calendario**: vista de mes; click en un día rellena la fecha del formulario.
- **Tiempo real**: cualquier cambio aparece en los demás dispositivos en <2 s sin recargar.

## Seguridad

Las políticas RLS están abiertas (`using (true)`) — aceptable para uso **privado** familiar, donde solo los miembros conocen la URL y sus credenciales. Si quieres endurecer:

1. Migrar a Supabase Auth (registro/recuperación reales).
2. Cambiar políticas a `using (auth.uid() is not null)`.
3. Vincular la columna `id` de `users` con `auth.users.id`.

Es trabajo aparte; el MVP actual prioriza simplicidad.

## Desarrollo local

No hay build. Para probar antes de desplegar:

```powershell
# Servir la carpeta con cualquier servidor estático
python -m http.server 8080
# o
npx serve .
```

Abre `http://localhost:8080`.

## Roadmap (opcional, no incluido en el MVP)

- Mascota (paseos / comidas / vet) — está diseñado en `prototype/` pero no implementado.
- Ranking semanal por miembro (ya tenemos los datos, falta UI).
- Recordatorios con notificaciones push.
- Exportar calendario a iCal / Google.
- Sugerencias de menú semanal con IA.
