// Helpers compartidos entre páginas
if (!window.supabase || !window.supabase.createClient) {
  document.body && (document.body.innerHTML =
    '<div style="padding:2rem;font-family:sans-serif;text-align:center">' +
    '<h2>No se pudo cargar Supabase</h2>' +
    '<p>Revisa tu conexión y recarga la página.</p></div>');
  throw new Error('Supabase SDK no cargado');
}
const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SESSION_KEY = 'cloe-user';
function getUser() {
  try {
    const u = JSON.parse(localStorage.getItem(SESSION_KEY));
    return (u && typeof u === 'object') ? u : null;
  } catch { return null; }
}
function setUser(u) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(u)); } catch {}
}
function clearUser() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

function requireUser(redirect = 'index.html') {
  const u = getUser();
  if (!u) { window.location.href = redirect; return null; }
  return u;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fmtDate(iso) {
  if (!iso) return '';
  const norm = String(iso).slice(0, 10);
  const d = new Date(norm + 'T00:00');
  if (isNaN(d.getTime())) return '';
  const today = todayISO();
  const tmrw = new Date(); tmrw.setDate(tmrw.getDate()+1);
  const tmrwISO = `${tmrw.getFullYear()}-${String(tmrw.getMonth()+1).padStart(2,'0')}-${String(tmrw.getDate()).padStart(2,'0')}`;
  if (norm === today) return 'Hoy';
  if (norm === tmrwISO) return 'Mañana';
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

// Festivos nacionales España 2025 y 2026
const NATIONAL_HOLIDAYS = {
  '2025': ['01-01', '01-06', '04-18', '05-01', '08-15', '10-12', '11-01', '12-06', '12-08', '12-25'],
  '2026': ['01-01', '01-06', '04-03', '05-01', '08-15', '10-12', '11-01', '12-06', '12-08', '12-25']
};

// Festivos Madrid capital 2025 y 2026 (adicionales a los nacionales)
const MADRID_HOLIDAYS = {
  '2025': ['03-19', '05-02', '05-15', '07-25', '11-09'],
  '2026': ['03-19', '05-02', '05-15', '07-25', '11-09']
};

function isWeekend(dateStr) {
  const d = new Date(dateStr + 'T00:00');
  const day = d.getDay();
  return day === 0 || day === 6;
}

function isHoliday(dateStr) {
  const d = new Date(dateStr + 'T00:00');
  const year = String(d.getFullYear());
  const monthDay = `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  
  // Check national holidays
  if (NATIONAL_HOLIDAYS[year] && NATIONAL_HOLIDAYS[year].includes(monthDay)) {
    return { type: 'national', name: 'Festivo nacional' };
  }
  // Check Madrid holidays
  if (MADRID_HOLIDAYS[year] && MADRID_HOLIDAYS[year].includes(monthDay)) {
    return { type: 'madrid', name: 'Festivo Madrid' };
  }
  return null;
}

// Productos de supermercados para autocompletado
const SUPERMARKET_PRODUCTS = [
  // Mercadona
  { name: 'Leche entera', category: 'lácteos', store: 'mercadona' },
  { name: 'Leche semidesnatada', category: 'lácteos', store: 'mercadona' },
  { name: 'Yogur natural', category: 'lácteos', store: 'mercadona' },
  { name: 'Yogur griego', category: 'lácteos', store: 'mercadona' },
  { name: 'Queso fresco', category: 'lácteos', store: 'mercadona' },
  { name: 'Queso curado', category: 'lácteos', store: 'mercadona' },
  { name: 'Mantequilla', category: 'lácteos', store: 'mercadona' },
  { name: 'Nata líquida', category: 'lácteos', store: 'mercadona' },
  { name: 'Batido chocolate', category: 'lácteos', store: 'mercadona' },
  { name: 'Cuajada', category: 'lácteos', store: 'mercadona' },
  { name: 'Manzanas', category: 'fruta', store: 'mercadona' },
  { name: 'Plátanos', category: 'fruta', store: 'mercadona' },
  { name: 'Naranjas', category: 'fruta', store: 'mercadona' },
  { name: 'Fresas', category: 'fruta', store: 'mercadona' },
  { name: 'Uvas', category: 'fruta', store: 'mercadona' },
  { name: 'Peras', category: 'fruta', store: 'mercadona' },
  { name: 'Melocotones', category: 'fruta', store: 'mercadona' },
  { name: 'Kiwis', category: 'fruta', store: 'mercadona' },
  { name: 'Sandía', category: 'fruta', store: 'mercadona' },
  { name: 'Melón', category: 'fruta', store: 'mercadona' },
  { name: 'Piña', category: 'fruta', store: 'mercadona' },
  { name: 'Aguacates', category: 'fruta', store: 'mercadona' },
  { name: 'Tomates', category: 'verdura', store: 'mercadona' },
  { name: 'Lechuga', category: 'verdura', store: 'mercadona' },
  { name: 'Zanahorias', category: 'verdura', store: 'mercadona' },
  { name: 'Cebollas', category: 'verdura', store: 'mercadona' },
  { name: 'Patatas', category: 'verdura', store: 'mercadona' },
  { name: 'Pepinos', category: 'verdura', store: 'mercadona' },
  { name: 'Pimientos', category: 'verdura', store: 'mercadona' },
  { name: 'Brócoli', category: 'verdura', store: 'mercadona' },
  { name: 'Espinacas', category: 'verdura', store: 'mercadona' },
  { name: 'Calabacín', category: 'verdura', store: 'mercadona' },
  { name: 'Berenjenas', category: 'verdura', store: 'mercadona' },
  { name: 'Champiñones', category: 'verdura', store: 'mercadona' },
  { name: 'Ajos', category: 'verdura', store: 'mercadona' },
  { name: 'Pechuga pollo', category: 'carne', store: 'mercadona' },
  { name: 'Carne picada', category: 'carne', store: 'mercadona' },
  { name: 'Salmón', category: 'carne', store: 'mercadona' },
  { name: 'Merluza', category: 'carne', store: 'mercadona' },
  { name: 'Ternera', category: 'carne', store: 'mercadona' },
  { name: 'Cerdo', category: 'carne', store: 'mercadona' },
  { name: 'Jamón serrano', category: 'carne', store: 'mercadona' },
  { name: 'Jamón york', category: 'carne', store: 'mercadona' },
  { name: 'Salchichas', category: 'carne', store: 'mercadona' },
  { name: 'Chorizo', category: 'carne', store: 'mercadona' },
  { name: 'Atún en lata', category: 'carne', store: 'mercadona' },
  { name: 'Sardinas', category: 'carne', store: 'mercadona' },
  { name: 'Gambas', category: 'carne', store: 'mercadona' },
  { name: 'Sepia', category: 'carne', store: 'mercadona' },
  { name: 'Pan de molde', category: 'panadería', store: 'mercadona' },
  { name: 'Barra pan', category: 'panadería', store: 'mercadona' },
  { name: 'Croissants', category: 'panadería', store: 'mercadona' },
  { name: 'Pan integral', category: 'panadería', store: 'mercadona' },
  { name: 'Tostas', category: 'panadería', store: 'mercadona' },
  { name: 'Magdalenas', category: 'panadería', store: 'mercadona' },
  { name: 'Donuts', category: 'panadería', store: 'mercadona' },
  { name: 'Palmeras', category: 'panadería', store: 'mercadona' },
  { name: 'Arroz', category: 'despensa', store: 'mercadona' },
  { name: 'Pasta', category: 'despensa', store: 'mercadona' },
  { name: 'Lentejas', category: 'despensa', store: 'mercadona' },
  { name: 'Garbanzos', category: 'despensa', store: 'mercadona' },
  { name: 'Alubias', category: 'despensa', store: 'mercadona' },
  { name: 'Aceite oliva', category: 'despensa', store: 'mercadona' },
  { name: 'Vinagre', category: 'despensa', store: 'mercadona' },
  { name: 'Sal', category: 'despensa', store: 'mercadona' },
  { name: 'Azúcar', category: 'despensa', store: 'mercadona' },
  { name: 'Tomates fritos', category: 'despensa', store: 'mercadona' },
  { name: 'Salsa tomate', category: 'despensa', store: 'mercadona' },
  { name: 'Galletas', category: 'despensa', store: 'mercadona' },
  { name: 'Cereales', category: 'despensa', store: 'mercadona' },
  { name: 'Muesli', category: 'despensa', store: 'mercadona' },
  { name: 'Chocolate', category: 'despensa', store: 'mercadona' },
  { name: 'Café', category: 'despensa', store: 'mercadona' },
  { name: 'Té', category: 'despensa', store: 'mercadona' },
  { name: 'Colacao', category: 'despensa', store: 'mercadona' },
  { name: 'Mermelada', category: 'despensa', store: 'mercadona' },
  { name: 'Miel', category: 'despensa', store: 'mercadona' },
  { name: 'Frutos secos', category: 'despensa', store: 'mercadona' },
  { name: 'Detergente', category: 'hogar', store: 'mercadona' },
  { name: 'Suavizante', category: 'hogar', store: 'mercadona' },
  { name: 'Papel higiénico', category: 'hogar', store: 'mercadona' },
  { name: 'Papel cocina', category: 'hogar', store: 'mercadona' },
  { name: 'Servilletas', category: 'hogar', store: 'mercadona' },
  { name: 'Lejía', category: 'hogar', store: 'mercadona' },
  { name: 'Lavavajillas', category: 'hogar', store: 'mercadona' },
  { name: 'Sal lavavajillas', category: 'hogar', store: 'mercadona' },
  { name: 'Limpiacristales', category: 'hogar', store: 'mercadona' },
  { name: 'Desengrasante', category: 'hogar', store: 'mercadona' },
  { name: 'Ambientador', category: 'hogar', store: 'mercadona' },
  { name: 'Bolsas basura', category: 'hogar', store: 'mercadona' },
  { name: 'Pilas', category: 'hogar', store: 'mercadona' },
  { name: 'Bombillas', category: 'hogar', store: 'mercadona' },
  { name: 'Pienso perro', category: 'mascota', store: 'mercadona' },
  { name: 'Pienso gato', category: 'mascota', store: 'mercadona' },
  { name: 'Comida húmeda perro', category: 'mascota', store: 'mercadona' },
  { name: 'Comida húmeda gato', category: 'mascota', store: 'mercadona' },
  { name: 'Arena gato', category: 'mascota', store: 'mercadona' },
  { name: 'Snacks mascota', category: 'mascota', store: 'mercadona' },
  { name: 'Champú bebé', category: 'varios', store: 'mercadona' },
  { name: 'Pañales', category: 'varios', store: 'mercadona' },
  { name: 'Toallitas', category: 'varios', store: 'mercadona' },
  { name: 'Crema solar', category: 'varios', store: 'mercadona' },
  { name: 'Gel ducha', category: 'varios', store: 'mercadona' },
  { name: 'Desodorante', category: 'varios', store: 'mercadona' },
  { name: 'Pasta dientes', category: 'varios', store: 'mercadona' },
  { name: 'Cepillo dientes', category: 'varios', store: 'mercadona' },
  { name: 'Algodón', category: 'varios', store: 'mercadona' },
  { name: 'Bastoncillos', category: 'varios', store: 'mercadona' },
  { name: 'Compresas', category: 'varios', store: 'mercadona' },
  { name: 'Tampones', category: 'varios', store: 'mercadona' },
  { name: 'Preservativos', category: 'varios', store: 'mercadona' },
  { name: 'Velas', category: 'varios', store: 'mercadona' },
  { name: 'Encendedor', category: 'varios', store: 'mercadona' },
  { name: 'Cinta adhesiva', category: 'varios', store: 'mercadona' },
  { name: 'Alambre', category: 'varios', store: 'mercadona' },
  { name: 'Cuerda', category: 'varios', store: 'mercadona' },

  // ── Mercadona ampliado ─────────────────────────────────
  // Lácteos extra
  { name: 'Leche desnatada', category: 'lácteos', store: 'mercadona' },
  { name: 'Leche sin lactosa', category: 'lácteos', store: 'mercadona' },
  { name: 'Bebida soja', category: 'lácteos', store: 'mercadona' },
  { name: 'Bebida avena', category: 'lácteos', store: 'mercadona' },
  { name: 'Bebida almendra', category: 'lácteos', store: 'mercadona' },
  { name: 'Bebida coco', category: 'lácteos', store: 'mercadona' },
  { name: 'Yogur desnatado', category: 'lácteos', store: 'mercadona' },
  { name: 'Yogur proteínas', category: 'lácteos', store: 'mercadona' },
  { name: 'Skyr', category: 'lácteos', store: 'mercadona' },
  { name: 'Yogur líquido', category: 'lácteos', store: 'mercadona' },
  { name: 'Actimel', category: 'lácteos', store: 'mercadona' },
  { name: 'Petit Suisse', category: 'lácteos', store: 'mercadona' },
  { name: 'Natillas', category: 'lácteos', store: 'mercadona' },
  { name: 'Flan', category: 'lácteos', store: 'mercadona' },
  { name: 'Arroz con leche', category: 'lácteos', store: 'mercadona' },
  { name: 'Queso rallado', category: 'lácteos', store: 'mercadona' },
  { name: 'Queso feta', category: 'lácteos', store: 'mercadona' },
  { name: 'Queso mozzarella', category: 'lácteos', store: 'mercadona' },
  { name: 'Queso brie', category: 'lácteos', store: 'mercadona' },
  { name: 'Queso azul', category: 'lácteos', store: 'mercadona' },
  { name: 'Queso de cabra', category: 'lácteos', store: 'mercadona' },
  { name: 'Queso burgos', category: 'lácteos', store: 'mercadona' },
  { name: 'Queso emmental', category: 'lácteos', store: 'mercadona' },
  { name: 'Queso havarti', category: 'lácteos', store: 'mercadona' },
  { name: 'Queso parmesano', category: 'lácteos', store: 'mercadona' },
  { name: 'Quesitos', category: 'lácteos', store: 'mercadona' },
  { name: 'Crema de queso', category: 'lácteos', store: 'mercadona' },
  { name: 'Mascarpone', category: 'lácteos', store: 'mercadona' },
  { name: 'Margarina', category: 'lácteos', store: 'mercadona' },
  { name: 'Huevos M', category: 'lácteos', store: 'mercadona' },
  { name: 'Huevos L', category: 'lácteos', store: 'mercadona' },
  { name: 'Huevos camperos', category: 'lácteos', store: 'mercadona' },
  { name: 'Huevos ecológicos', category: 'lácteos', store: 'mercadona' },

  // Fruta extra
  { name: 'Limones', category: 'fruta', store: 'mercadona' },
  { name: 'Mandarinas', category: 'fruta', store: 'mercadona' },
  { name: 'Cerezas', category: 'fruta', store: 'mercadona' },
  { name: 'Albaricoques', category: 'fruta', store: 'mercadona' },
  { name: 'Ciruelas', category: 'fruta', store: 'mercadona' },
  { name: 'Higos', category: 'fruta', store: 'mercadona' },
  { name: 'Granada', category: 'fruta', store: 'mercadona' },
  { name: 'Mango', category: 'fruta', store: 'mercadona' },
  { name: 'Papaya', category: 'fruta', store: 'mercadona' },
  { name: 'Coco', category: 'fruta', store: 'mercadona' },
  { name: 'Nectarinas', category: 'fruta', store: 'mercadona' },
  { name: 'Paraguayos', category: 'fruta', store: 'mercadona' },
  { name: 'Frambuesas', category: 'fruta', store: 'mercadona' },
  { name: 'Arándanos', category: 'fruta', store: 'mercadona' },
  { name: 'Moras', category: 'fruta', store: 'mercadona' },
  { name: 'Pomelo', category: 'fruta', store: 'mercadona' },
  { name: 'Caqui', category: 'fruta', store: 'mercadona' },
  { name: 'Chirimoya', category: 'fruta', store: 'mercadona' },
  { name: 'Frutos rojos congelados', category: 'fruta', store: 'mercadona' },

  // Verdura extra
  { name: 'Apio', category: 'verdura', store: 'mercadona' },
  { name: 'Puerro', category: 'verdura', store: 'mercadona' },
  { name: 'Coliflor', category: 'verdura', store: 'mercadona' },
  { name: 'Repollo', category: 'verdura', store: 'mercadona' },
  { name: 'Col lombarda', category: 'verdura', store: 'mercadona' },
  { name: 'Coles de bruselas', category: 'verdura', store: 'mercadona' },
  { name: 'Acelgas', category: 'verdura', store: 'mercadona' },
  { name: 'Rúcula', category: 'verdura', store: 'mercadona' },
  { name: 'Canónigos', category: 'verdura', store: 'mercadona' },
  { name: 'Espárragos', category: 'verdura', store: 'mercadona' },
  { name: 'Maíz', category: 'verdura', store: 'mercadona' },
  { name: 'Guisantes', category: 'verdura', store: 'mercadona' },
  { name: 'Habas', category: 'verdura', store: 'mercadona' },
  { name: 'Judías verdes', category: 'verdura', store: 'mercadona' },
  { name: 'Alcachofas', category: 'verdura', store: 'mercadona' },
  { name: 'Setas variadas', category: 'verdura', store: 'mercadona' },
  { name: 'Boniato', category: 'verdura', store: 'mercadona' },
  { name: 'Remolacha', category: 'verdura', store: 'mercadona' },
  { name: 'Rabanitos', category: 'verdura', store: 'mercadona' },
  { name: 'Calabaza', category: 'verdura', store: 'mercadona' },
  { name: 'Jengibre', category: 'verdura', store: 'mercadona' },
  { name: 'Perejil', category: 'verdura', store: 'mercadona' },
  { name: 'Cilantro', category: 'verdura', store: 'mercadona' },
  { name: 'Albahaca', category: 'verdura', store: 'mercadona' },
  { name: 'Menta', category: 'verdura', store: 'mercadona' },
  { name: 'Aceitunas verdes', category: 'verdura', store: 'mercadona' },
  { name: 'Aceitunas negras', category: 'verdura', store: 'mercadona' },
  { name: 'Pepinillos', category: 'verdura', store: 'mercadona' },

  // Carne y pescado extra
  { name: 'Muslos pollo', category: 'carne', store: 'mercadona' },
  { name: 'Alitas pollo', category: 'carne', store: 'mercadona' },
  { name: 'Pollo entero', category: 'carne', store: 'mercadona' },
  { name: 'Pavo fileteado', category: 'carne', store: 'mercadona' },
  { name: 'Solomillo cerdo', category: 'carne', store: 'mercadona' },
  { name: 'Lomo cerdo', category: 'carne', store: 'mercadona' },
  { name: 'Costillas', category: 'carne', store: 'mercadona' },
  { name: 'Hamburguesas ternera', category: 'carne', store: 'mercadona' },
  { name: 'Hamburguesas pollo', category: 'carne', store: 'mercadona' },
  { name: 'Hamburguesas vegetales', category: 'carne', store: 'mercadona' },
  { name: 'Albóndigas', category: 'carne', store: 'mercadona' },
  { name: 'San Jacobos', category: 'carne', store: 'mercadona' },
  { name: 'Nuggets pollo', category: 'carne', store: 'mercadona' },
  { name: 'Bacon', category: 'carne', store: 'mercadona' },
  { name: 'Panceta', category: 'carne', store: 'mercadona' },
  { name: 'Chistorra', category: 'carne', store: 'mercadona' },
  { name: 'Morcilla', category: 'carne', store: 'mercadona' },
  { name: 'Lacón', category: 'carne', store: 'mercadona' },
  { name: 'Pavo cocido', category: 'carne', store: 'mercadona' },
  { name: 'Salami', category: 'carne', store: 'mercadona' },
  { name: 'Mortadela', category: 'carne', store: 'mercadona' },
  { name: 'Fuet', category: 'carne', store: 'mercadona' },
  { name: 'Bacalao', category: 'carne', store: 'mercadona' },
  { name: 'Lubina', category: 'carne', store: 'mercadona' },
  { name: 'Dorada', category: 'carne', store: 'mercadona' },
  { name: 'Atún fresco', category: 'carne', store: 'mercadona' },
  { name: 'Trucha', category: 'carne', store: 'mercadona' },
  { name: 'Boquerones', category: 'carne', store: 'mercadona' },
  { name: 'Anchoas', category: 'carne', store: 'mercadona' },
  { name: 'Pulpo', category: 'carne', store: 'mercadona' },
  { name: 'Calamares', category: 'carne', store: 'mercadona' },
  { name: 'Mejillones', category: 'carne', store: 'mercadona' },
  { name: 'Almejas', category: 'carne', store: 'mercadona' },
  { name: 'Langostinos', category: 'carne', store: 'mercadona' },
  { name: 'Surimi', category: 'carne', store: 'mercadona' },
  { name: 'Palitos de cangrejo', category: 'carne', store: 'mercadona' },
  { name: 'Caballa en lata', category: 'carne', store: 'mercadona' },
  { name: 'Bonito en lata', category: 'carne', store: 'mercadona' },
  { name: 'Ventresca atún', category: 'carne', store: 'mercadona' },
  { name: 'Berberechos', category: 'carne', store: 'mercadona' },
  { name: 'Tofu', category: 'carne', store: 'mercadona' },
  { name: 'Seitan', category: 'carne', store: 'mercadona' },
  { name: 'Salchichas vegetales', category: 'carne', store: 'mercadona' },

  // Panadería y bollería extra
  { name: 'Pan rústico', category: 'panadería', store: 'mercadona' },
  { name: 'Pan brioche', category: 'panadería', store: 'mercadona' },
  { name: 'Pan hamburguesa', category: 'panadería', store: 'mercadona' },
  { name: 'Pan hot dog', category: 'panadería', store: 'mercadona' },
  { name: 'Pan pita', category: 'panadería', store: 'mercadona' },
  { name: 'Pan bao', category: 'panadería', store: 'mercadona' },
  { name: 'Wraps', category: 'panadería', store: 'mercadona' },
  { name: 'Tortillas trigo', category: 'panadería', store: 'mercadona' },
  { name: 'Tortillas maíz', category: 'panadería', store: 'mercadona' },
  { name: 'Pan rallado', category: 'panadería', store: 'mercadona' },
  { name: 'Picos', category: 'panadería', store: 'mercadona' },
  { name: 'Regañás', category: 'panadería', store: 'mercadona' },
  { name: 'Bizcocho', category: 'panadería', store: 'mercadona' },
  { name: 'Sobaos', category: 'panadería', store: 'mercadona' },
  { name: 'Napolitanas chocolate', category: 'panadería', store: 'mercadona' },
  { name: 'Ensaimadas', category: 'panadería', store: 'mercadona' },
  { name: 'Bollos suizos', category: 'panadería', store: 'mercadona' },
  { name: 'Roscón', category: 'panadería', store: 'mercadona' },
  { name: 'Tarta santiago', category: 'panadería', store: 'mercadona' },
  { name: 'Empanada', category: 'panadería', store: 'mercadona' },
  { name: 'Pizza fresca', category: 'panadería', store: 'mercadona' },
  { name: 'Masa pizza', category: 'panadería', store: 'mercadona' },
  { name: 'Masa hojaldre', category: 'panadería', store: 'mercadona' },
  { name: 'Masa quebrada', category: 'panadería', store: 'mercadona' },
  { name: 'Masa filo', category: 'panadería', store: 'mercadona' },

  // Despensa extra (incluye bebidas, conservas, snacks, dulces, congelados, salsas, especias)
  { name: 'Macarrones', category: 'despensa', store: 'mercadona' },
  { name: 'Espaguetis', category: 'despensa', store: 'mercadona' },
  { name: 'Tallarines', category: 'despensa', store: 'mercadona' },
  { name: 'Lasaña placas', category: 'despensa', store: 'mercadona' },
  { name: 'Canelones placas', category: 'despensa', store: 'mercadona' },
  { name: 'Tortellini', category: 'despensa', store: 'mercadona' },
  { name: 'Ravioli', category: 'despensa', store: 'mercadona' },
  { name: 'Ñoquis', category: 'despensa', store: 'mercadona' },
  { name: 'Cuscús', category: 'despensa', store: 'mercadona' },
  { name: 'Quinoa', category: 'despensa', store: 'mercadona' },
  { name: 'Bulgur', category: 'despensa', store: 'mercadona' },
  { name: 'Avena copos', category: 'despensa', store: 'mercadona' },
  { name: 'Arroz integral', category: 'despensa', store: 'mercadona' },
  { name: 'Arroz basmati', category: 'despensa', store: 'mercadona' },
  { name: 'Arroz redondo', category: 'despensa', store: 'mercadona' },
  { name: 'Arroz bomba', category: 'despensa', store: 'mercadona' },
  { name: 'Aceite girasol', category: 'despensa', store: 'mercadona' },
  { name: 'Aceite virgen extra', category: 'despensa', store: 'mercadona' },
  { name: 'Vinagre módena', category: 'despensa', store: 'mercadona' },
  { name: 'Vinagre manzana', category: 'despensa', store: 'mercadona' },
  { name: 'Pimienta', category: 'despensa', store: 'mercadona' },
  { name: 'Pimentón', category: 'despensa', store: 'mercadona' },
  { name: 'Comino', category: 'despensa', store: 'mercadona' },
  { name: 'Curry', category: 'despensa', store: 'mercadona' },
  { name: 'Orégano', category: 'despensa', store: 'mercadona' },
  { name: 'Romero', category: 'despensa', store: 'mercadona' },
  { name: 'Tomillo', category: 'despensa', store: 'mercadona' },
  { name: 'Laurel', category: 'despensa', store: 'mercadona' },
  { name: 'Canela', category: 'despensa', store: 'mercadona' },
  { name: 'Azafrán', category: 'despensa', store: 'mercadona' },
  { name: 'Colorante', category: 'despensa', store: 'mercadona' },
  { name: 'Levadura', category: 'despensa', store: 'mercadona' },
  { name: 'Harina', category: 'despensa', store: 'mercadona' },
  { name: 'Harina integral', category: 'despensa', store: 'mercadona' },
  { name: 'Harina avena', category: 'despensa', store: 'mercadona' },
  { name: 'Harina almendra', category: 'despensa', store: 'mercadona' },
  { name: 'Maicena', category: 'despensa', store: 'mercadona' },
  { name: 'Bicarbonato', category: 'despensa', store: 'mercadona' },
  { name: 'Cacao puro', category: 'despensa', store: 'mercadona' },
  { name: 'Chocolate negro', category: 'despensa', store: 'mercadona' },
  { name: 'Chocolate con leche', category: 'despensa', store: 'mercadona' },
  { name: 'Chocolate blanco', category: 'despensa', store: 'mercadona' },
  { name: 'Crema cacao', category: 'despensa', store: 'mercadona' },
  { name: 'Mantequilla cacahuete', category: 'despensa', store: 'mercadona' },
  { name: 'Sirope arce', category: 'despensa', store: 'mercadona' },
  { name: 'Salsa pesto', category: 'despensa', store: 'mercadona' },
  { name: 'Salsa carbonara', category: 'despensa', store: 'mercadona' },
  { name: 'Salsa boloñesa', category: 'despensa', store: 'mercadona' },
  { name: 'Salsa barbacoa', category: 'despensa', store: 'mercadona' },
  { name: 'Salsa brava', category: 'despensa', store: 'mercadona' },
  { name: 'Salsa rosa', category: 'despensa', store: 'mercadona' },
  { name: 'Salsa césar', category: 'despensa', store: 'mercadona' },
  { name: 'Salsa soja', category: 'despensa', store: 'mercadona' },
  { name: 'Salsa teriyaki', category: 'despensa', store: 'mercadona' },
  { name: 'Salsa picante', category: 'despensa', store: 'mercadona' },
  { name: 'Wasabi', category: 'despensa', store: 'mercadona' },
  { name: 'Tabasco', category: 'despensa', store: 'mercadona' },
  { name: 'Mayonesa', category: 'despensa', store: 'mercadona' },
  { name: 'Ketchup', category: 'despensa', store: 'mercadona' },
  { name: 'Mostaza', category: 'despensa', store: 'mercadona' },
  { name: 'Caldo pollo', category: 'despensa', store: 'mercadona' },
  { name: 'Caldo verduras', category: 'despensa', store: 'mercadona' },
  { name: 'Caldo pescado', category: 'despensa', store: 'mercadona' },
  { name: 'Sopa fideos', category: 'despensa', store: 'mercadona' },
  { name: 'Crema calabaza', category: 'despensa', store: 'mercadona' },
  { name: 'Gazpacho', category: 'despensa', store: 'mercadona' },
  { name: 'Salmorejo', category: 'despensa', store: 'mercadona' },
  { name: 'Hummus', category: 'despensa', store: 'mercadona' },
  { name: 'Guacamole', category: 'despensa', store: 'mercadona' },
  { name: 'Patatas fritas bolsa', category: 'despensa', store: 'mercadona' },
  { name: 'Doritos', category: 'despensa', store: 'mercadona' },
  { name: 'Pretzels', category: 'despensa', store: 'mercadona' },
  { name: 'Palomitas', category: 'despensa', store: 'mercadona' },
  { name: 'Cacahuetes', category: 'despensa', store: 'mercadona' },
  { name: 'Almendras', category: 'despensa', store: 'mercadona' },
  { name: 'Nueces', category: 'despensa', store: 'mercadona' },
  { name: 'Pistachos', category: 'despensa', store: 'mercadona' },
  { name: 'Anacardos', category: 'despensa', store: 'mercadona' },
  { name: 'Pasas', category: 'despensa', store: 'mercadona' },
  { name: 'Dátiles', category: 'despensa', store: 'mercadona' },
  { name: 'Orejones', category: 'despensa', store: 'mercadona' },
  { name: 'Pipas', category: 'despensa', store: 'mercadona' },
  { name: 'Galletas maría', category: 'despensa', store: 'mercadona' },
  { name: 'Galletas chocolate', category: 'despensa', store: 'mercadona' },
  { name: 'Galletas avena', category: 'despensa', store: 'mercadona' },
  { name: 'Tortitas arroz', category: 'despensa', store: 'mercadona' },
  { name: 'Barritas energéticas', category: 'despensa', store: 'mercadona' },
  { name: 'Barritas cereales', category: 'despensa', store: 'mercadona' },
  { name: 'Helado vainilla', category: 'despensa', store: 'mercadona' },
  { name: 'Helado chocolate', category: 'despensa', store: 'mercadona' },
  { name: 'Helado fresa', category: 'despensa', store: 'mercadona' },
  { name: 'Conos helado', category: 'despensa', store: 'mercadona' },
  { name: 'Polos', category: 'despensa', store: 'mercadona' },
  { name: 'Verdura congelada', category: 'despensa', store: 'mercadona' },
  { name: 'Patatas congeladas', category: 'despensa', store: 'mercadona' },
  { name: 'Pizza congelada', category: 'despensa', store: 'mercadona' },
  { name: 'Croquetas', category: 'despensa', store: 'mercadona' },
  { name: 'Empanadillas congeladas', category: 'despensa', store: 'mercadona' },
  { name: 'Lentejas en bote', category: 'despensa', store: 'mercadona' },
  { name: 'Garbanzos en bote', category: 'despensa', store: 'mercadona' },
  { name: 'Alubias en bote', category: 'despensa', store: 'mercadona' },
  { name: 'Maíz en lata', category: 'despensa', store: 'mercadona' },
  { name: 'Champiñones en lata', category: 'despensa', store: 'mercadona' },
  { name: 'Pimientos del piquillo', category: 'despensa', store: 'mercadona' },
  { name: 'Espárragos en lata', category: 'despensa', store: 'mercadona' },
  { name: 'Alcaparras', category: 'despensa', store: 'mercadona' },
  { name: 'Tomate triturado', category: 'despensa', store: 'mercadona' },
  { name: 'Tomate concentrado', category: 'despensa', store: 'mercadona' },
  { name: 'Tomate seco', category: 'despensa', store: 'mercadona' },
  { name: 'Foie gras', category: 'despensa', store: 'mercadona' },
  { name: 'Paté ibérico', category: 'despensa', store: 'mercadona' },
  { name: 'Agua mineral', category: 'despensa', store: 'mercadona' },
  { name: 'Agua con gas', category: 'despensa', store: 'mercadona' },
  { name: 'Coca-Cola', category: 'despensa', store: 'mercadona' },
  { name: 'Coca-Cola Zero', category: 'despensa', store: 'mercadona' },
  { name: 'Fanta naranja', category: 'despensa', store: 'mercadona' },
  { name: 'Aquarius', category: 'despensa', store: 'mercadona' },
  { name: 'Tónica', category: 'despensa', store: 'mercadona' },
  { name: 'Cerveza', category: 'despensa', store: 'mercadona' },
  { name: 'Cerveza sin alcohol', category: 'despensa', store: 'mercadona' },
  { name: 'Vino tinto', category: 'despensa', store: 'mercadona' },
  { name: 'Vino blanco', category: 'despensa', store: 'mercadona' },
  { name: 'Vino rosado', category: 'despensa', store: 'mercadona' },
  { name: 'Cava', category: 'despensa', store: 'mercadona' },
  { name: 'Sidra', category: 'despensa', store: 'mercadona' },
  { name: 'Vermut', category: 'despensa', store: 'mercadona' },
  { name: 'Ron', category: 'despensa', store: 'mercadona' },
  { name: 'Ginebra', category: 'despensa', store: 'mercadona' },
  { name: 'Vodka', category: 'despensa', store: 'mercadona' },
  { name: 'Whisky', category: 'despensa', store: 'mercadona' },
  { name: 'Zumo naranja', category: 'despensa', store: 'mercadona' },
  { name: 'Zumo manzana', category: 'despensa', store: 'mercadona' },
  { name: 'Zumo piña', category: 'despensa', store: 'mercadona' },
  { name: 'Zumo melocotón', category: 'despensa', store: 'mercadona' },
  { name: 'Néctar multifrutas', category: 'despensa', store: 'mercadona' },
  { name: 'Bebida isotónica', category: 'despensa', store: 'mercadona' },
  { name: 'Café cápsulas', category: 'despensa', store: 'mercadona' },
  { name: 'Café molido', category: 'despensa', store: 'mercadona' },
  { name: 'Café soluble', category: 'despensa', store: 'mercadona' },
  { name: 'Té verde', category: 'despensa', store: 'mercadona' },
  { name: 'Té negro', category: 'despensa', store: 'mercadona' },
  { name: 'Manzanilla', category: 'despensa', store: 'mercadona' },
  { name: 'Tila', category: 'despensa', store: 'mercadona' },
  { name: 'Poleo menta', category: 'despensa', store: 'mercadona' },
  { name: 'Caramelos', category: 'despensa', store: 'mercadona' },
  { name: 'Chicles', category: 'despensa', store: 'mercadona' },
  { name: 'Gominolas', category: 'despensa', store: 'mercadona' },
  { name: 'Regaliz', category: 'despensa', store: 'mercadona' },
  { name: 'Bombones', category: 'despensa', store: 'mercadona' },
  { name: 'Turrón', category: 'despensa', store: 'mercadona' },
  { name: 'Polvorones', category: 'despensa', store: 'mercadona' },
  { name: 'Kinder', category: 'despensa', store: 'mercadona' },
  { name: 'Snickers', category: 'despensa', store: 'mercadona' },
  { name: 'KitKat', category: 'despensa', store: 'mercadona' },
  { name: 'Oreo', category: 'despensa', store: 'mercadona' },
  { name: 'Filipinos', category: 'despensa', store: 'mercadona' },
  { name: 'Nocilla', category: 'despensa', store: 'mercadona' },
  { name: 'Nutella', category: 'despensa', store: 'mercadona' },
  { name: 'Sushi', category: 'despensa', store: 'mercadona' },
  { name: 'Salsa de tomate frito', category: 'despensa', store: 'mercadona' },

  // Hogar extra
  { name: 'Detergente cápsulas', category: 'hogar', store: 'mercadona' },
  { name: 'Detergente líquido', category: 'hogar', store: 'mercadona' },
  { name: 'Quitamanchas', category: 'hogar', store: 'mercadona' },
  { name: 'Estropajos', category: 'hogar', store: 'mercadona' },
  { name: 'Bayetas', category: 'hogar', store: 'mercadona' },
  { name: 'Mopa', category: 'hogar', store: 'mercadona' },
  { name: 'Recambio mopa', category: 'hogar', store: 'mercadona' },
  { name: 'Fregona', category: 'hogar', store: 'mercadona' },
  { name: 'Cubo fregona', category: 'hogar', store: 'mercadona' },
  { name: 'Escoba', category: 'hogar', store: 'mercadona' },
  { name: 'Recogedor', category: 'hogar', store: 'mercadona' },
  { name: 'Guantes limpieza', category: 'hogar', store: 'mercadona' },
  { name: 'Limpiador suelos', category: 'hogar', store: 'mercadona' },
  { name: 'Limpiador baño', category: 'hogar', store: 'mercadona' },
  { name: 'Antical', category: 'hogar', store: 'mercadona' },
  { name: 'Limpia hornos', category: 'hogar', store: 'mercadona' },
  { name: 'Insecticida', category: 'hogar', store: 'mercadona' },
  { name: 'Polvo lavavajillas', category: 'hogar', store: 'mercadona' },
  { name: 'Abrillantador', category: 'hogar', store: 'mercadona' },
  { name: 'Papel film', category: 'hogar', store: 'mercadona' },
  { name: 'Papel aluminio', category: 'hogar', store: 'mercadona' },
  { name: 'Bolsas congelar', category: 'hogar', store: 'mercadona' },
  { name: 'Bolsas zip', category: 'hogar', store: 'mercadona' },
  { name: 'Papel horno', category: 'hogar', store: 'mercadona' },
  { name: 'Cápsulas café vacías', category: 'hogar', store: 'mercadona' },
  { name: 'Velas perfumadas', category: 'hogar', store: 'mercadona' },
  { name: 'Friegasuelos', category: 'hogar', store: 'mercadona' },
  { name: 'Friegamuebles', category: 'hogar', store: 'mercadona' },
  { name: 'Spray multiusos', category: 'hogar', store: 'mercadona' },
  { name: 'Pastillas WC', category: 'hogar', store: 'mercadona' },
  { name: 'Cerillas', category: 'hogar', store: 'mercadona' },

  // Mascota extra
  { name: 'Pienso cachorro', category: 'mascota', store: 'mercadona' },
  { name: 'Pienso senior', category: 'mascota', store: 'mercadona' },
  { name: 'Bolsas caca perro', category: 'mascota', store: 'mercadona' },
  { name: 'Champú perro', category: 'mascota', store: 'mercadona' },
  { name: 'Antipulgas', category: 'mascota', store: 'mercadona' },
  { name: 'Juguete perro', category: 'mascota', store: 'mercadona' },
  { name: 'Hueso roer', category: 'mascota', store: 'mercadona' },
  { name: 'Galletas perro', category: 'mascota', store: 'mercadona' },
  { name: 'Empapadores perro', category: 'mascota', store: 'mercadona' },

  // Higiene / cuidado personal (varios)
  { name: 'Champú', category: 'varios', store: 'mercadona' },
  { name: 'Acondicionador', category: 'varios', store: 'mercadona' },
  { name: 'Mascarilla pelo', category: 'varios', store: 'mercadona' },
  { name: 'Espuma afeitar', category: 'varios', store: 'mercadona' },
  { name: 'Cuchillas afeitar', category: 'varios', store: 'mercadona' },
  { name: 'After shave', category: 'varios', store: 'mercadona' },
  { name: 'Gel manos', category: 'varios', store: 'mercadona' },
  { name: 'Crema manos', category: 'varios', store: 'mercadona' },
  { name: 'Crema corporal', category: 'varios', store: 'mercadona' },
  { name: 'Crema cara', category: 'varios', store: 'mercadona' },
  { name: 'Sérum', category: 'varios', store: 'mercadona' },
  { name: 'Limpiador facial', category: 'varios', store: 'mercadona' },
  { name: 'Tónico facial', category: 'varios', store: 'mercadona' },
  { name: 'Mascarilla facial', category: 'varios', store: 'mercadona' },
  { name: 'Discos desmaquillantes', category: 'varios', store: 'mercadona' },
  { name: 'Quitaesmalte', category: 'varios', store: 'mercadona' },
  { name: 'Esmalte uñas', category: 'varios', store: 'mercadona' },
  { name: 'Cortauñas', category: 'varios', store: 'mercadona' },
  { name: 'Maquinilla pelo', category: 'varios', store: 'mercadona' },
  { name: 'Tinte pelo', category: 'varios', store: 'mercadona' },
  { name: 'Laca', category: 'varios', store: 'mercadona' },
  { name: 'Espuma peinar', category: 'varios', store: 'mercadona' },
  { name: 'Cera peinar', category: 'varios', store: 'mercadona' },
  { name: 'Enjuague bucal', category: 'varios', store: 'mercadona' },
  { name: 'Hilo dental', category: 'varios', store: 'mercadona' },
  { name: 'Protector solar SPF50', category: 'varios', store: 'mercadona' },
  { name: 'After sun', category: 'varios', store: 'mercadona' },
  { name: 'Repelente mosquitos', category: 'varios', store: 'mercadona' },
  { name: 'Tiritas', category: 'varios', store: 'mercadona' },
  { name: 'Termómetro', category: 'varios', store: 'mercadona' },
  { name: 'Paracetamol', category: 'varios', store: 'mercadona' },
  { name: 'Ibuprofeno', category: 'varios', store: 'mercadona' },
  { name: 'Suero fisiológico', category: 'varios', store: 'mercadona' },
  { name: 'Alcohol', category: 'varios', store: 'mercadona' },
  { name: 'Agua oxigenada', category: 'varios', store: 'mercadona' },
  { name: 'Vitamina C', category: 'varios', store: 'mercadona' },
  { name: 'Multivitamínico', category: 'varios', store: 'mercadona' },
  { name: 'Pañales talla 1', category: 'varios', store: 'mercadona' },
  { name: 'Pañales talla 2', category: 'varios', store: 'mercadona' },
  { name: 'Pañales talla 3', category: 'varios', store: 'mercadona' },
  { name: 'Pañales talla 4', category: 'varios', store: 'mercadona' },
  { name: 'Toallitas bebé', category: 'varios', store: 'mercadona' },
  { name: 'Crema pañal', category: 'varios', store: 'mercadona' },
  { name: 'Leche fórmula', category: 'varios', store: 'mercadona' },
  { name: 'Potitos', category: 'varios', store: 'mercadona' },
  { name: 'Cereales bebé', category: 'varios', store: 'mercadona' },
  { name: 'Chupete', category: 'varios', store: 'mercadona' },
  { name: 'Biberón', category: 'varios', store: 'mercadona' },
  { name: 'Pilas AA', category: 'varios', store: 'mercadona' },
  { name: 'Pilas AAA', category: 'varios', store: 'mercadona' },
  { name: 'Pila botón', category: 'varios', store: 'mercadona' },
  { name: 'Cargador móvil', category: 'varios', store: 'mercadona' },
  { name: 'Auriculares', category: 'varios', store: 'mercadona' },

  // Plantas
  { name: 'Tierra plantas', category: 'plantas', store: 'mercadona' },
  { name: 'Maceta', category: 'plantas', store: 'mercadona' },
  { name: 'Plato maceta', category: 'plantas', store: 'mercadona' },
  { name: 'Abono plantas', category: 'plantas', store: 'mercadona' },
  { name: 'Semillas', category: 'plantas', store: 'mercadona' },

  // Dia
  { name: 'Leche', category: 'lácteos', store: 'dia' },
  { name: 'Yogures', category: 'lácteos', store: 'dia' },
  { name: 'Queso', category: 'lácteos', store: 'dia' },
  { name: 'Fruta fresca', category: 'fruta', store: 'dia' },
  { name: 'Verduras', category: 'verdura', store: 'dia' },
  { name: 'Pollo', category: 'carne', store: 'dia' },
  { name: 'Ternera', category: 'carne', store: 'dia' },
  { name: 'Pescado', category: 'carne', store: 'dia' },
  { name: 'Pan', category: 'panadería', store: 'dia' },
  { name: 'Bollería', category: 'panadería', store: 'dia' },
  { name: 'Conservas', category: 'despensa', store: 'dia' },
  { name: 'Legumbres', category: 'despensa', store: 'dia' },
  { name: 'Limpiador', category: 'hogar', store: 'dia' },
  { name: 'Lavavajillas', category: 'hogar', store: 'dia' },
  // Ahorramas
  { name: 'Leche Puleva', category: 'lácteos', store: 'ahorramas' },
  { name: 'Activia', category: 'lácteos', store: 'ahorramas' },
  { name: 'Mahonés', category: 'lácteos', store: 'ahorramas' },
  { name: 'Piezas fruta', category: 'fruta', store: 'ahorramas' },
  { name: 'Bolsa verdura', category: 'verdura', store: 'ahorramas' },
  { name: 'Jamón york', category: 'carne', store: 'ahorramas' },
  { name: 'Chorizo', category: 'carne', store: 'ahorramas' },
  { name: 'Atún', category: 'carne', store: 'ahorramas' },
  { name: 'Pan Bimbo', category: 'panadería', store: 'ahorramas' },
  { name: 'Magdalenas', category: 'panadería', store: 'ahorramas' },
  { name: 'Tomates fritos', category: 'despensa', store: 'ahorramas' },
  { name: 'Galletas', category: 'despensa', store: 'ahorramas' },
  { name: 'Fabada', category: 'despensa', store: 'ahorramas' },
  { name: 'Don Limpio', category: 'hogar', store: 'ahorramas' },
  { name: 'Ariel', category: 'hogar', store: 'ahorramas' },
  // Más productos variados
  { name: 'Huevos', category: 'lácteos', store: 'mercadona' },
  { name: 'Queso crema', category: 'lácteos', store: 'mercadona' },
  { name: 'Kéfir', category: 'lácteos', store: 'mercadona' },
  { name: 'Requesón', category: 'lácteos', store: 'mercadona' },
  { name: 'Leche condensada', category: 'lácteos', store: 'mercadona' },
  { name: 'Flan', category: 'lácteos', store: 'mercadona' },
  { name: 'Natillas', category: 'lácteos', store: 'mercadona' },
  { name: 'Arándanos', category: 'fruta', store: 'mercadona' },
  { name: 'Frambuesas', category: 'fruta', store: 'mercadona' },
  { name: 'Mangos', category: 'fruta', store: 'mercadona' },
  { name: 'Papayas', category: 'fruta', store: 'mercadona' },
  { name: 'Granadas', category: 'fruta', store: 'mercadona' },
  { name: 'Cerezas', category: 'fruta', store: 'mercadona' },
  { name: 'Ciruelas', category: 'fruta', store: 'mercadona' },
  { name: 'Albaricoques', category: 'fruta', store: 'mercadona' },
  { name: 'Nísperos', category: 'fruta', store: 'mercadona' },
  { name: 'Caqui', category: 'fruta', store: 'mercadona' },
  { name: 'Chirimoya', category: 'fruta', store: 'mercadona' },
  { name: 'Maracuyá', category: 'fruta', store: 'mercadona' },
  { name: 'Limas', category: 'fruta', store: 'mercadona' },
  { name: 'Pomelos', category: 'fruta', store: 'mercadona' },
  { name: 'Mandarinas', category: 'fruta', store: 'mercadona' },
  { name: 'Rúcula', category: 'verdura', store: 'mercadona' },
  { name: 'Canónigos', category: 'verdura', store: 'mercadona' },
  { name: 'Escarola', category: 'verdura', store: 'mercadona' },
  { name: 'Radicheta', category: 'verdura', store: 'mercadona' },
  { name: 'Apio', category: 'verdura', store: 'mercadona' },
  { name: 'Puerros', category: 'verdura', store: 'mercadona' },
  { name: 'Espárragos', category: 'verdura', store: 'mercadona' },
  { name: 'Alcachofas', category: 'verdura', store: 'mercadona' },
  { name: 'Guisantes', category: 'verdura', store: 'mercadona' },
  { name: 'Habas', category: 'verdura', store: 'mercadona' },
  { name: 'Judías verdes', category: 'verdura', store: 'mercadona' },
  { name: 'Coliflor', category: 'verdura', store: 'mercadona' },
  { name: 'Repollo', category: 'verdura', store: 'mercadona' },
  { name: 'Coles de Bruselas', category: 'verdura', store: 'mercadona' },
  { name: 'Acelgas', category: 'verdura', store: 'mercadona' },
  { name: 'Remolacha', category: 'verdura', store: 'mercadona' },
  { name: 'Nabo', category: 'verdura', store: 'mercadona' },
  { name: 'Chirivía', category: 'verdura', store: 'mercadona' },
  { name: 'Boniatos', category: 'verdura', store: 'mercadona' },
  { name: 'Calabaza', category: 'verdura', store: 'mercadona' },
  { name: 'Setas', category: 'verdura', store: 'mercadona' },
  { name: 'Boletus', category: 'verdura', store: 'mercadona' },
  { name: 'Shiitake', category: 'verdura', store: 'mercadona' },
  { name: 'Portobello', category: 'verdura', store: 'mercadona' },
  { name: 'Salmón ahumado', category: 'carne', store: 'mercadona' },
  { name: 'Bacalao', category: 'carne', store: 'mercadona' },
  { name: 'Bonito', category: 'carne', store: 'mercadona' },
  { name: 'Atún fresco', category: 'carne', store: 'mercadona' },
  { name: 'Emperador', category: 'carne', store: 'mercadona' },
  { name: 'Lubina', category: 'carne', store: 'mercadona' },
  { name: 'Dorada', category: 'carne', store: 'mercadona' },
  { name: 'Rodaballo', category: 'carne', store: 'mercadona' },
  { name: 'Rape', category: 'carne', store: 'mercadona' },
  { name: 'Langostinos', category: 'carne', store: 'mercadona' },
  { name: 'Mejillones', category: 'carne', store: 'mercadona' },
  { name: 'Almejas', category: 'carne', store: 'mercadona' },
  { name: 'Navajas', category: 'carne', store: 'mercadona' },
  { name: 'Pulpo', category: 'carne', store: 'mercadona' },
  { name: 'Calamares', category: 'carne', store: 'mercadona' },
  { name: 'Chipirones', category: 'carne', store: 'mercadona' },
  { name: 'Bogavante', category: 'carne', store: 'mercadona' },
  { name: 'Cigalas', category: 'carne', store: 'mercadona' },
  { name: 'Paté', category: 'carne', store: 'mercadona' },
  { name: 'Foie', category: 'carne', store: 'mercadona' },
  { name: 'Morcilla', category: 'carne', store: 'mercadona' },
  { name: 'Longaniza', category: 'carne', store: 'mercadona' },
  { name: 'Butifarra', category: 'carne', store: 'mercadona' },
  { name: 'Fuet', category: 'carne', store: 'mercadona' },
  { name: 'Salchichón', category: 'carne', store: 'mercadona' },
  { name: 'Chorizo ibérico', category: 'carne', store: 'mercadona' },
  { name: 'Lomo embuchado', category: 'carne', store: 'mercadona' },
  { name: ' Cecina', category: 'carne', store: 'mercadona' },
  { name: 'Tartar de ternera', category: 'carne', store: 'mercadona' },
  { name: 'Hamburguesas', category: 'carne', store: 'mercadona' },
  { name: 'Albóndigas', category: 'carne', store: 'mercadona' },
  { name: 'Pan de payés', category: 'panadería', store: 'mercadona' },
  { name: 'Chapata', category: 'panadería', store: 'mercadona' },
  { name: 'Focaccia', category: 'panadería', store: 'mercadona' },
  { name: 'Ciabatta', category: 'panadería', store: 'mercadona' },
  { name: 'Baguette', category: 'panadería', store: 'mercadona' },
  { name: 'Pan de centeno', category: 'panadería', store: 'mercadona' },
  { name: 'Pan sin gluten', category: 'panadería', store: 'mercadona' },
  { name: 'Picatostes', category: 'panadería', store: 'mercadona' },
  { name: 'Grissini', category: 'panadería', store: 'mercadona' },
  { name: 'Crackers', category: 'panadería', store: 'mercadona' },
  { name: 'Ensaladilla', category: 'panadería', store: 'mercadona' },
  { name: 'Quiche', category: 'panadería', store: 'mercadona' },
  { name: 'Empanada', category: 'panadería', store: 'mercadona' },
  { name: 'Pizza', category: 'panadería', store: 'mercadona' },
  { name: 'Tarta de queso', category: 'panadería', store: 'mercadona' },
  { name: 'Tiramisú', category: 'panadería', store: 'mercadona' },
  { name: 'Brownie', category: 'panadería', store: 'mercadona' },
  { name: 'Cheesecake', category: 'panadería', store: 'mercadona' },
  { name: 'Mousse chocolate', category: 'panadería', store: 'mercadona' },
  { name: 'Crema catalana', category: 'panadería', store: 'mercadona' },
  { name: 'Arroz rojo', category: 'despensa', store: 'mercadona' },
  { name: 'Arroz integral', category: 'despensa', store: 'mercadona' },
  { name: 'Arroz basmati', category: 'despensa', store: 'mercadona' },
  { name: 'Quinoa', category: 'despensa', store: 'mercadona' },
  { name: 'Cuscús', category: 'despensa', store: 'mercadona' },
  { name: 'Bulgur', category: 'despensa', store: 'mercadona' },
  { name: 'Amaranto', category: 'despensa', store: 'mercadona' },
  { name: 'Trigo sarraceno', category: 'despensa', store: 'mercadona' },
  { name: 'Espaguetis', category: 'despensa', store: 'mercadona' },
  { name: 'Macarrones', category: 'despensa', store: 'mercadona' },
  { name: 'Linguine', category: 'despensa', store: 'mercadona' },
  { name: 'Fetuccini', category: 'despensa', store: 'mercadona' },
  { name: 'Tallarines', category: 'despensa', store: 'mercadona' },
  { name: 'Lasaña', category: 'despensa', store: 'mercadona' },
  { name: 'Ñoquis', category: 'despensa', store: 'mercadona' },
  { name: 'Raviolis', category: 'despensa', store: 'mercadona' },
  { name: 'Tortellini', category: 'despensa', store: 'mercadona' },
  { name: 'Sémola', category: 'despensa', store: 'mercadona' },
  { name: 'Harina trigo', category: 'despensa', store: 'mercadona' },
  { name: 'Harina maíz', category: 'despensa', store: 'mercadona' },
  { name: 'Maicena', category: 'despensa', store: 'mercadona' },
  { name: 'Levadura', category: 'despensa', store: 'mercadona' },
  { name: 'Polvo hornear', category: 'despensa', store: 'mercadona' },
  { name: 'Bicarbonato', category: 'despensa', store: 'mercadona' },
  { name: 'Cacao puro', category: 'despensa', store: 'mercadona' },
  { name: 'Chocolate negro', category: 'despensa', store: 'mercadona' },
  { name: 'Chocolate blanco', category: 'despensa', store: 'mercadona' },
  { name: 'Chocolate con leche', category: 'despensa', store: 'mercadona' },
  { name: 'Bombones', category: 'despensa', store: 'mercadona' },
  { name: 'Trufas', category: 'despensa', store: 'mercadona' },
  { name: 'Turrones', category: 'despensa', store: 'mercadona' },
  { name: 'Polvorones', category: 'despensa', store: 'mercadona' },
  { name: 'Mazapán', category: 'despensa', store: 'mercadona' },
  { name: 'Caramelos', category: 'despensa', store: 'mercadona' },
  { name: 'Chicles', category: 'despensa', store: 'mercadona' },
  { name: 'Regaliz', category: 'despensa', store: 'mercadona' },
  { name: 'Malvaviscos', category: 'despensa', store: 'mercadona' },
  { name: 'Palomitas', category: 'despensa', store: 'mercadona' },
  { name: 'Nachos', category: 'despensa', store: 'mercadona' },
  { name: 'Patatas fritas', category: 'despensa', store: 'mercadona' },
  { name: 'Frutos secos mixtos', category: 'despensa', store: 'mercadona' },
  { name: 'Almendras', category: 'despensa', store: 'mercadona' },
  { name: 'Nueces', category: 'despensa', store: 'mercadona' },
  { name: 'Avellanas', category: 'despensa', store: 'mercadona' },
  { name: 'Anacardos', category: 'despensa', store: 'mercadona' },
  { name: 'Pistachos', category: 'despensa', store: 'mercadona' },
  { name: 'Piñones', category: 'despensa', store: 'mercadona' },
  { name: 'Semillas girasol', category: 'despensa', store: 'mercadona' },
  { name: 'Semillas calabaza', category: 'despensa', store: 'mercadona' },
  { name: 'Semillas chía', category: 'despensa', store: 'mercadona' },
  { name: 'Semillas lino', category: 'despensa', store: 'mercadona' },
  { name: 'Semillas sésamo', category: 'despensa', store: 'mercadona' },
  { name: 'Pasas', category: 'despensa', store: 'mercadona' },
  { name: 'Orejones', category: 'despensa', store: 'mercadona' },
  { name: 'Ciruelas pasas', category: 'despensa', store: 'mercadona' },
  { name: 'Dátiles', category: 'despensa', store: 'mercadona' },
  { name: 'Higos secos', category: 'despensa', store: 'mercadona' },
  { name: 'Arándanos deshidratados', category: 'despensa', store: 'mercadona' },
  { name: 'Goji', category: 'despensa', store: 'mercadona' },
  { name: 'Coco rallado', category: 'despensa', store: 'mercadona' },
  { name: 'Coco en polvo', category: 'despensa', store: 'mercadona' },
  { name: 'Leche coco', category: 'despensa', store: 'mercadona' },
  { name: 'Crema cacahuete', category: 'despensa', store: 'mercadona' },
  { name: 'Crema almendra', category: 'despensa', store: 'mercadona' },
  { name: 'Tahini', category: 'despensa', store: 'mercadona' },
  { name: 'Salsa soja', category: 'despensa', store: 'mercadona' },
  { name: 'Salsa teriyaki', category: 'despensa', store: 'mercadona' },
  { name: 'Salsa ostras', category: 'despensa', store: 'mercadona' },
  { name: 'Salsa picante', category: 'despensa', store: 'mercadona' },
  { name: 'Salsa barbacoa', category: 'despensa', store: 'mercadona' },
  { name: 'Ketchup', category: 'despensa', store: 'mercadona' },
  { name: 'Mostaza', category: 'despensa', store: 'mercadona' },
  { name: 'Mayonesa', category: 'despensa', store: 'mercadona' },
  { name: 'Alioli', category: 'despensa', store: 'mercadona' },
  { name: 'Vinagre manzana', category: 'despensa', store: 'mercadona' },
  { name: 'Vinagre módena', category: 'despensa', store: 'mercadona' },
  { name: 'Aceite girasol', category: 'despensa', store: 'mercadona' },
  { name: 'Aceite coco', category: 'despensa', store: 'mercadona' },
  { name: 'Manteca cerdo', category: 'despensa', store: 'mercadona' },
  { name: 'Sebo vacuno', category: 'despensa', store: 'mercadona' },
  { name: 'Caldo pollo', category: 'despensa', store: 'mercadona' },
  { name: 'Caldo verduras', category: 'despensa', store: 'mercadona' },
  { name: 'Caldo carne', category: 'despensa', store: 'mercadona' },
  { name: 'Sobre paella', category: 'despensa', store: 'mercadona' },
  { name: 'Sobre gazpacho', category: 'despensa', store: 'mercadona' },
  { name: 'Sobre puré patatas', category: 'despensa', store: 'mercadona' },
  { name: 'Copos avena', category: 'despensa', store: 'mercadona' },
  { name: 'Proteína whey', category: 'despensa', store: 'mercadona' },
  { name: 'Barritas proteína', category: 'despensa', store: 'mercadona' },
  { name: 'Suplementos vitaminas', category: 'varios', store: 'mercadona' },
  { name: 'Espejo limpieza', category: 'hogar', store: 'mercadona' },
  { name: 'Multiusos', category: 'hogar', store: 'mercadona' },
  { name: 'Antical', category: 'hogar', store: 'mercadona' },
  { name: 'Moho limpieza', category: 'hogar', store: 'mercadona' },
  { name: 'Desinfectante', category: 'hogar', store: 'mercadona' },
  { name: 'Jabón manos', category: 'hogar', store: 'mercadona' },
  { name: 'Recambio jabón', category: 'hogar', store: 'mercadona' },
  { name: 'Gel hidroalcohólico', category: 'hogar', store: 'mercadona' },
  { name: 'Mascarillas', category: 'hogar', store: 'mercadona' },
  { name: 'Guantes látex', category: 'hogar', store: 'mercadona' },
  { name: 'Guantes goma', category: 'hogar', store: 'mercadona' },
  { name: 'Bayetas', category: 'hogar', store: 'mercadona' },
  { name: 'Estropajos', category: 'hogar', store: 'mercadona' },
  { name: 'Fregona', category: 'hogar', store: 'mercadona' },
  { name: 'Recambio fregona', category: 'hogar', store: 'mercadona' },
  { name: 'Escoba', category: 'hogar', store: 'mercadona' },
  { name: 'Recogedor', category: 'hogar', store: 'mercadona' },
  { name: 'Cepillo baño', category: 'hogar', store: 'mercadona' },
  { name: 'Vainas fregona', category: 'hogar', store: 'mercadona' },
  { name: 'Perchas', category: 'hogar', store: 'mercadona' },
  { name: 'Pinzas ropa', category: 'hogar', store: 'mercadona' },
  { name: 'Tendedero', category: 'hogar', store: 'mercadona' },
  { name: 'Cestas ropa', category: 'hogar', store: 'mercadona' },
  { name: 'Organizadores', category: 'hogar', store: 'mercadona' },
  { name: 'Cajas almacenaje', category: 'hogar', store: 'mercadona' },
  { name: 'Fundas vacío', category: 'hogar', store: 'mercadona' },
  { name: 'Perchas terciopelo', category: 'hogar', store: 'mercadona' },
  { name: 'Ganchos pared', category: 'hogar', store: 'mercadona' },
  { name: 'Adhesivos doble cara', category: 'hogar', store: 'mercadona' },
  { name: 'Silicona', category: 'hogar', store: 'mercadona' },
  { name: 'Superpegamento', category: 'hogar', store: 'mercadona' },
  { name: 'Cinta aislante', category: 'hogar', store: 'mercadona' },
  { name: 'Cinta carrocero', category: 'hogar', store: 'mercadona' },
  { name: 'Precintos', category: 'hogar', store: 'mercadona' },
  { name: 'Bridas', category: 'hogar', store: 'mercadona' },
  { name: 'Tornillos', category: 'hogar', store: 'mercadona' },
  { name: 'Tuercas', category: 'hogar', store: 'mercadona' },
  { name: 'Tacos pared', category: 'hogar', store: 'mercadona' },
  { name: 'Clavos', category: 'hogar', store: 'mercadona' },
  { name: 'Martillo', category: 'hogar', store: 'mercadona' },
  { name: 'Destornillador', category: 'hogar', store: 'mercadona' },
  { name: 'Alicates', category: 'hogar', store: 'mercadona' },
  { name: 'Llave inglesa', category: 'hogar', store: 'mercadona' },
  { name: 'Metro', category: 'hogar', store: 'mercadona' },
  { name: 'Nivel', category: 'hogar', store: 'mercadona' },
  { name: 'Linterna', category: 'hogar', store: 'mercadona' },
  { name: 'Extensión eléctrica', category: 'hogar', store: 'mercadona' },
  { name: 'Regletas', category: 'hogar', store: 'mercadona' },
  { name: 'Adaptadores', category: 'hogar', store: 'mercadona' },
  { name: 'Transformador', category: 'hogar', store: 'mercadona' },
  { name: 'Cargador USB', category: 'hogar', store: 'mercadona' },
  { name: 'Cables USB', category: 'hogar', store: 'mercadona' },
  { name: 'Auriculares', category: 'varios', store: 'mercadona' },
  { name: 'Funda móvil', category: 'varios', store: 'mercadona' },
  { name: 'Protector pantalla', category: 'varios', store: 'mercadona' },
  { name: 'Soporte móvil', category: 'varios', store: 'mercadona' },
  { name: 'Powerbank', category: 'varios', store: 'mercadona' },
  { name: 'Tarjeta memoria', category: 'varios', store: 'mercadona' },
  { name: 'Pendrive', category: 'varios', store: 'mercadona' },
  { name: 'Disco duro', category: 'varios', store: 'mercadona' },
  { name: 'Ratón ordenador', category: 'varios', store: 'mercadona' },
  { name: 'Teclado', category: 'varios', store: 'mercadona' },
  { name: 'Webcam', category: 'varios', store: 'mercadona' },
  { name: 'Micrófono', category: 'varios', store: 'mercadona' },
  { name: 'Altavoz bluetooth', category: 'varios', store: 'mercadona' },
  { name: 'Cable HDMI', category: 'varios', store: 'mercadona' },
  { name: 'Adaptador HDMI', category: 'varios', store: 'mercadona' },
  { name: 'Filtros café', category: 'despensa', store: 'mercadona' },
  { name: 'Cápsulas café', category: 'despensa', store: 'mercadona' },
  { name: 'Infusiones', category: 'despensa', store: 'mercadona' },
  { name: 'Manzanilla', category: 'despensa', store: 'mercadona' },
  { name: 'Té verde', category: 'despensa', store: 'mercadona' },
  { name: 'Té negro', category: 'despensa', store: 'mercadona' },
  { name: 'Roibos', category: 'despensa', store: 'mercadona' },
  { name: 'Mate', category: 'despensa', store: 'mercadona' },
  { name: 'Agua mineral', category: 'despensa', store: 'mercadona' },
  { name: 'Agua con gas', category: 'despensa', store: 'mercadona' },
  { name: 'Refrescos cola', category: 'despensa', store: 'mercadona' },
  { name: 'Refrescos naranja', category: 'despensa', store: 'mercadona' },
  { name: 'Refrescos limón', category: 'despensa', store: 'mercadona' },
  { name: 'Zumos fruta', category: 'despensa', store: 'mercadona' },
  { name: 'Néctares', category: 'despensa', store: 'mercadona' },
  { name: 'Smoothies', category: 'despensa', store: 'mercadona' },
  { name: 'Cerveza', category: 'despensa', store: 'mercadona' },
  { name: 'Vino tinto', category: 'despensa', store: 'mercadona' },
  { name: 'Vino blanco', category: 'despensa', store: 'mercadona' },
  { name: 'Cava', category: 'despensa', store: 'mercadona' },
  { name: 'Champán', category: 'despensa', store: 'mercadona' },
  { name: 'Sidra', category: 'despensa', store: 'mercadona' },
  { name: 'Ron', category: 'despensa', store: 'mercadona' },
  { name: 'Whisky', category: 'despensa', store: 'mercadona' },
  { name: 'Ginebra', category: 'despensa', store: 'mercadona' },
  { name: 'Vodka', category: 'despensa', store: 'mercadona' },
  { name: 'Tequila', category: 'despensa', store: 'mercadona' },
  { name: 'Licor café', category: 'despensa', store: 'mercadona' },
  { name: 'Licor chocolate', category: 'despensa', store: 'mercadona' },
  { name: 'Crema orujo', category: 'despensa', store: 'mercadona' },
  { name: ' Pacharán', category: 'despensa', store: 'mercadona' },
  { name: 'Anís', category: 'despensa', store: 'mercadona' },
  { name: 'Coñac', category: 'despensa', store: 'mercadona' },
  { name: 'Brandy', category: 'despensa', store: 'mercadona' },
  { name: 'Hielo', category: 'despensa', store: 'mercadona' },
  { name: 'Servilletas papel', category: 'hogar', store: 'mercadona' },
  { name: 'Manteles papel', category: 'hogar', store: 'mercadona' },
  { name: 'Vasos plástico', category: 'hogar', store: 'mercadona' },
  { name: 'Platos plástico', category: 'hogar', store: 'mercadona' },
  { name: 'Cubiertos plástico', category: 'hogar', store: 'mercadona' },
  { name: 'Manteles tela', category: 'hogar', store: 'mercadona' },
  { name: 'Individual mesa', category: 'hogar', store: 'mercadona' },
  { name: 'Posavasos', category: 'hogar', store: 'mercadona' },
  { name: 'Centros mesa', category: 'hogar', store: 'mercadona' },
  { name: 'Velas aromáticas', category: 'hogar', store: 'mercadona' },
  { name: 'Difusor aroma', category: 'hogar', store: 'mercadona' },
  { name: 'Incienso', category: 'hogar', store: 'mercadona' },
  { name: 'Varitas incienso', category: 'hogar', store: 'mercadona' },
  { name: 'Esencia lavanda', category: 'hogar', store: 'mercadona' },
  { name: 'Esencia eucalipto', category: 'hogar', store: 'mercadona' },
  { name: 'Esencia menta', category: 'hogar', store: 'mercadona' },
  { name: 'Esencia limón', category: 'hogar', store: 'mercadona' },
  { name: 'Esencia naranja', category: 'hogar', store: 'mercadona' },
  { name: 'Esencia vainilla', category: 'hogar', store: 'mercadona' },
  { name: 'Esencia canela', category: 'hogar', store: 'mercadona' },
  { name: 'Esencia pino', category: 'hogar', store: 'mercadona' },
  { name: 'Esencia romero', category: 'hogar', store: 'mercadona' },
  { name: 'Esencia tomillo', category: 'hogar', store: 'mercadona' },
  { name: 'Plantas aromáticas', category: 'plantas', store: 'mercadona' },
  { name: 'Cactus', category: 'plantas', store: 'mercadona' },
  { name: 'Suculentas', category: 'plantas', store: 'mercadona' },
  { name: 'Orquídeas', category: 'plantas', store: 'mercadona' },
  { name: 'Rosales', category: 'plantas', store: 'mercadona' },
  { name: 'Geranios', category: 'plantas', store: 'mercadona' },
  { name: 'Petunias', category: 'plantas', store: 'mercadona' },
  { name: 'Begonias', category: 'plantas', store: 'mercadona' },
  { name: 'Margaritas', category: 'plantas', store: 'mercadona' },
  { name: 'Girasoles', category: 'plantas', store: 'mercadona' },
  { name: 'Tulipanes', category: 'plantas', store: 'mercadona' },
  { name: 'Narcisos', category: 'plantas', store: 'mercadona' },
  { name: 'Jacintos', category: 'plantas', store: 'mercadona' },
  { name: 'Crocos', category: 'plantas', store: 'mercadona' },
  { name: 'Azafrán', category: 'plantas', store: 'mercadona' },
  { name: 'Lirios', category: 'plantas', store: 'mercadona' },
  { name: 'Gladiolos', category: 'plantas', store: 'mercadona' },
  { name: 'Dalias', category: 'plantas', store: 'mercadona' },
  { name: 'Claveles', category: 'plantas', store: 'mercadona' },
  { name: 'Jazmín', category: 'plantas', store: 'mercadona' },
  { name: 'Gardenia', category: 'plantas', store: 'mercadona' },
  { name: 'Camelia', category: 'plantas', store: 'mercadona' },
  { name: 'Azalea', category: 'plantas', store: 'mercadona' },
  { name: 'Rododendro', category: 'plantas', store: 'mercadona' },
  { name: 'Hortensia', category: 'plantas', store: 'mercadona' },
  { name: 'Lavanda', category: 'plantas', store: 'mercadona' },
  { name: 'Romero', category: 'plantas', store: 'mercadona' },
  { name: 'Tomillo', category: 'plantas', store: 'mercadona' },
  { name: 'Salvia', category: 'plantas', store: 'mercadona' },
  { name: 'Albahaca', category: 'plantas', store: 'mercadona' },
  { name: 'Menta', category: 'plantas', store: 'mercadona' },
  { name: 'Hierbabuena', category: 'plantas', store: 'mercadona' },
  { name: 'Perejil', category: 'plantas', store: 'mercadona' },
  { name: 'Cilantro', category: 'plantas', store: 'mercadona' },
  { name: 'Eneldo', category: 'plantas', store: 'mercadona' },
  { name: 'Orégano', category: 'plantas', store: 'mercadona' },
  { name: 'Mejorana', category: 'plantas', store: 'mercadona' },
  { name: 'Laurel', category: 'plantas', store: 'mercadona' },
  { name: 'Cúrcuma', category: 'plantas', store: 'mercadona' },
  { name: 'Jengibre', category: 'plantas', store: 'mercadona' },
  { name: 'Tierra plantas', category: 'plantas', store: 'mercadona' },
  { name: 'Abono plantas', category: 'plantas', store: 'mercadona' },
  { name: 'Fertilizante', category: 'plantas', store: 'mercadona' },
  { name: 'Insecticida plantas', category: 'plantas', store: 'mercadona' },
  { name: 'Fungicida', category: 'plantas', store: 'mercadona' },
  { name: 'Macetas', category: 'plantas', store: 'mercadona' },
  { name: 'Platos maceta', category: 'plantas', store: 'mercadona' },
  { name: 'Tutores plantas', category: 'plantas', store: 'mercadona' },
  { name: 'Alambre jardinería', category: 'plantas', store: 'mercadona' },
  { name: 'Tijeras podar', category: 'plantas', store: 'mercadona' },
  { name: 'Guantes jardinería', category: 'plantas', store: 'mercadona' },
  { name: 'Pala jardinería', category: 'plantas', store: 'mercadona' },
  { name: 'Rastrillo', category: 'plantas', store: 'mercadona' },
  { name: 'Regadera', category: 'plantas', store: 'mercadona' },
  { name: 'Manguera', category: 'plantas', store: 'mercadona' },
  { name: 'Aspersor', category: 'plantas', store: 'mercadona' },
  { name: 'Riego automático', category: 'plantas', store: 'mercadona' },
  { name: 'Semillas tomate', category: 'plantas', store: 'mercadona' },
  { name: 'Semillas lechuga', category: 'plantas', store: 'mercadona' },
  { name: 'Semillas zanahoria', category: 'plantas', store: 'mercadona' },
  { name: 'Semillas rábano', category: 'plantas', store: 'mercadona' },
  { name: 'Semillas espinaca', category: 'plantas', store: 'mercadona' },
  { name: 'Semillas acelga', category: 'plantas', store: 'mercadona' },
  { name: 'Semillas judía', category: 'plantas', store: 'mercadona' },
  { name: 'Semillas guisante', category: 'plantas', store: 'mercadona' },
  { name: 'Semillas calabacín', category: 'plantas', store: 'mercadona' },
  { name: 'Semillas pepino', category: 'plantas', store: 'mercadona' },
  { name: 'Semillas pimiento', category: 'plantas', store: 'mercadona' },
  { name: 'Semillas berenjena', category: 'plantas', store: 'mercadona' },
  { name: 'Semillas cebolla', category: 'plantas', store: 'mercadona' },
  { name: 'Semillas ajo', category: 'plantas', store: 'mercadona' },
  { name: 'Semillas perejil', category: 'plantas', store: 'mercadona' },
  { name: 'Semillas albahaca', category: 'plantas', store: 'mercadona' },
  { name: 'Semillas cilantro', category: 'plantas', store: 'mercadona' },
  { name: 'Semillas menta', category: 'plantas', store: 'mercadona' },
  { name: 'Semillas flores', category: 'plantas', store: 'mercadona' },
  { name: 'Semillas césped', category: 'plantas', store: 'mercadona' },
  { name: 'Césped artificial', category: 'plantas', store: 'mercadona' },
  { name: 'Musgo decorativo', category: 'plantas', store: 'mercadona' },
  { name: 'Corteza pino', category: 'plantas', store: 'mercadona' },
  { name: 'Grava decorativa', category: 'plantas', store: 'mercadona' },
  { name: 'Piedras río', category: 'plantas', store: 'mercadona' },
  { name: 'Arena playa', category: 'plantas', store: 'mercadona' },
  { name: 'Conchas mar', category: 'plantas', store: 'mercadona' },
  { name: 'Comida hámster', category: 'mascota', store: 'mercadona' },
  { name: 'Comida conejo', category: 'mascota', store: 'mercadona' },
  { name: 'Comida loro', category: 'mascota', store: 'mercadona' },
  { name: 'Comida periquito', category: 'mascota', store: 'mercadona' },
  { name: 'Comida canario', category: 'mascota', store: 'mercadona' },
  { name: 'Comida pez', category: 'mascota', store: 'mercadona' },
  { name: 'Comida tortuga', category: 'mascota', store: 'mercadona' },
  { name: 'Comida hurón', category: 'mascota', store: 'mercadona' },
  { name: 'Comida cobaya', category: 'mascota', store: 'mercadona' },
  { name: 'Jaula pájaro', category: 'mascota', store: 'mercadona' },
  { name: 'Acuario', category: 'mascota', store: 'mercadona' },
  { name: 'Terrario', category: 'mascota', store: 'mercadona' },
  { name: 'Transportín mascota', category: 'mascota', store: 'mercadona' },
  { name: 'Correa perro', category: 'mascota', store: 'mercadona' },
  { name: 'Collar perro', category: 'mascota', store: 'mercadona' },
  { name: 'Arnés perro', category: 'mascota', store: 'mercadona' },
  { name: 'Bozal perro', category: 'mascota', store: 'mercadona' },
  { name: 'Cama perro', category: 'mascota', store: 'mercadona' },
  { name: 'Cama gato', category: 'mascota', store: 'mercadona' },
  { name: 'Rascador gato', category: 'mascota', store: 'mercadona' },
  { name: 'Juguetes perro', category: 'mascota', store: 'mercadona' },
  { name: 'Juguetes gato', category: 'mascota', store: 'mercadona' },
  { name: 'Pelotas mascota', category: 'mascota', store: 'mercadona' },
  { name: 'Huesos mascota', category: 'mascota', store: 'mercadona' },
  { name: 'Premios mascota', category: 'mascota', store: 'mercadona' },
  { name: 'Vitamina mascota', category: 'mascota', store: 'mercadona' },
  { name: 'Antiparasitario', category: 'mascota', store: 'mercadona' },
  { name: 'Pipeta garrapatas', category: 'mascota', store: 'mercadona' },
  { name: 'Collar antipulgas', category: 'mascota', store: 'mercadona' },
  { name: 'Champú perro', category: 'mascota', store: 'mercadona' },
  { name: 'Champú gato', category: 'mascota', store: 'mercadona' },
  { name: 'Toallitas mascota', category: 'mascota', store: 'mercadona' },
  { name: 'Peine mascota', category: 'mascota', store: 'mercadona' },
  { name: 'Cortaúñas mascota', category: 'mascota', store: 'mercadona' },
  { name: 'Secador mascota', category: 'mascota', store: 'mercadona' },
  { name: 'Bebé ropa', category: 'varios', store: 'mercadona' },
  { name: 'Bebé calzado', category: 'varios', store: 'mercadona' },
  { name: 'Bebé accesorios', category: 'varios', store: 'mercadona' },
  { name: 'Biberones', category: 'varios', store: 'mercadona' },
  { name: 'Tetinas', category: 'varios', store: 'mercadona' },
  { name: 'Chupetes', category: 'varios', store: 'mercadona' },
  { name: 'Baberos', category: 'varios', store: 'mercadona' },
  { name: 'Cochecito bebé', category: 'varios', store: 'mercadona' },
  { name: 'Silla coche bebé', category: 'varios', store: 'mercadona' },
  { name: 'Trona bebé', category: 'varios', store: 'mercadona' },
  { name: 'Cuna bebé', category: 'varios', store: 'mercadona' },
  { name: 'Colchón bebé', category: 'varios', store: 'mercadona' },
  { name: 'Sábanas bebé', category: 'varios', store: 'mercadona' },
  { name: 'Mantas bebé', category: 'varios', store: 'mercadona' },
  { name: 'Sacos dormir bebé', category: 'varios', store: 'mercadona' },
  { name: 'Mosquitera bebé', category: 'varios', store: 'mercadona' },
  { name: 'Monitor bebé', category: 'varios', store: 'mercadona' },
  { name: 'Termómetro bebé', category: 'varios', store: 'mercadona' },
  { name: 'Aspirador nasal', category: 'varios', store: 'mercadona' },
  { name: 'Cortaúñas bebé', category: 'varios', store: 'mercadona' },
  { name: 'Cepillo pelo bebé', category: 'varios', store: 'mercadona' },
  { name: 'Peine bebé', category: 'varios', store: 'mercadona' },
  { name: 'Bañera bebé', category: 'varios', store: 'mercadona' },
  { name: 'Termómetro baño', category: 'varios', store: 'mercadona' },
  { name: 'Juguetes baño', category: 'varios', store: 'mercadona' },
  { name: 'Juguetes bebé', category: 'varios', store: 'mercadona' },
  { name: 'Sonajeros', category: 'varios', store: 'mercadona' },
  { name: 'Mordedores', category: 'varios', store: 'mercadona' },
  { name: 'Peluches', category: 'varios', store: 'mercadona' },
  { name: 'Libros bebé', category: 'varios', store: 'mercadona' },
  { name: 'Cuentos niños', category: 'varios', store: 'mercadona' },
  { name: 'Cuadernos niños', category: 'varios', store: 'mercadona' },
  { name: 'Lápices colores', category: 'varios', store: 'mercadona' },
  { name: 'Ceras niños', category: 'varios', store: 'mercadona' },
  { name: 'Rotuladores', category: 'varios', store: 'mercadona' },
  { name: 'Pinturas dedos', category: 'varios', store: 'mercadona' },
  { name: 'Papel dibujo', category: 'varios', store: 'mercadona' },
  { name: 'Tijeras niños', category: 'varios', store: 'mercadona' },
  { name: 'Pegamento barra', category: 'varios', store: 'mercadona' },
  { name: 'Manualidades', category: 'varios', store: 'mercadona' },
  { name: 'Disfraces niños', category: 'varios', store: 'mercadona' },
  { name: 'Maquillaje niños', category: 'varios', store: 'mercadona' },
  { name: 'Fiesta cumpleaños', category: 'varios', store: 'mercadona' },
  { name: 'Globos', category: 'varios', store: 'mercadona' },
  { name: 'Decoración fiesta', category: 'varios', store: 'mercadona' },
  { name: 'Invitaciones', category: 'varios', store: 'mercadona' },
  { name: 'Regalos envolver', category: 'varios', store: 'mercadona' },
  { name: 'Lazos regalo', category: 'varios', store: 'mercadona' },
  { name: 'Tarjetas regalo', category: 'varios', store: 'mercadona' },
  { name: 'Sobres', category: 'varios', store: 'mercadona' },
  { name: 'Sellos', category: 'varios', store: 'mercadona' },
  { name: 'Material oficina', category: 'varios', store: 'mercadona' },
  { name: 'Carpetas', category: 'varios', store: 'mercadona' },
  { name: 'Archivadores', category: 'varios', store: 'mercadona' },
  { name: 'Folios', category: 'varios', store: 'mercadona' },
  { name: 'Cuadernos', category: 'varios', store: 'mercadona' },
  { name: 'Agendas', category: 'varios', store: 'mercadona' },
  { name: 'Calendarios', category: 'varios', store: 'mercadona' },
  { name: 'Calculadora', category: 'varios', store: 'mercadona' },
  { name: 'Grampeadora', category: 'varios', store: 'mercadona' },
  { name: 'Grapas', category: 'varios', store: 'mercadona' },
  { name: 'Sacapuntas', category: 'varios', store: 'mercadona' },
  { name: 'Gomas borrar', category: 'varios', store: 'mercadona' },
  { name: 'Corrector', category: 'varios', store: 'mercadona' },
  { name: 'Post-it', category: 'varios', store: 'mercadona' },
  { name: 'Notas adhesivas', category: 'varios', store: 'mercadona' },
  { name: 'Marcadores', category: 'varios', store: 'mercadona' },
  { name: 'Subrayadores', category: 'varios', store: 'mercadona' },
  { name: 'Reglas', category: 'varios', store: 'mercadona' },
  { name: 'Compás', category: 'varios', store: 'mercadona' },
  { name: 'Transportador', category: 'varios', store: 'mercadona' },
  { name: 'Escuadra', category: 'varios', store: 'mercadona' },
  { name: 'Cartabón', category: 'varios', store: 'mercadona' },
];

function findProductSuggestions(query) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().trim();
  return SUPERMARKET_PRODUCTS
    .filter(p => p.name.toLowerCase().includes(q))
    .slice(0, 8);
}

function guessCategory(productName) {
  const name = productName.toLowerCase();
  const mappings = {
    'fruta': ['manzana', 'plátano', 'naranja', 'fresa', 'uva', 'pera', 'melocotón', 'kiwi', 'sandía', 'melón', 'piña', 'aguacate', 'limón', 'mandarina', 'arándano', 'frambuesa', 'mango', 'papaya', 'granada', 'cereza', 'ciruela', 'albaricoque', 'níspero', 'caqui', 'chirimoya', 'maracuyá', 'lima', 'pomelo'],
    'verdura': ['tomate', 'lechuga', 'zanahoria', 'cebolla', 'patata', 'pepino', 'pimiento', 'brócoli', 'espinaca', 'calabacín', 'berenjena', 'champiñón', 'ajo', 'col', 'repollo', 'rúcula', 'canónigo', 'escarola', 'radicheta', 'apio', 'puerro', 'espárrago', 'alcachofa', 'guisante', 'haba', 'judía', 'coliflor', 'acelga', 'remolacha', 'nabo', 'chirivía', 'boniato', 'calabaza', 'seta', 'boletus', 'shiitake', 'portobello'],
    'carne': ['pollo', 'ternera', 'cerdo', 'salmón', 'merluza', 'atún', 'jamón', 'chorizo', 'pescado', 'salchicha', 'sardina', 'gamba', 'sepia', 'bacalao', 'lenguado', 'bonito', 'emperador', 'lubina', 'dorada', 'rodaballo', 'rape', 'langostino', 'mejillón', 'almeja', 'navaja', 'pulpo', 'calamar', 'chipirón', 'bogavante', 'cigala', 'paté', 'foie', 'morcilla', 'longaniza', 'butifarra', 'fuet', 'salchichón', 'lomo', 'cecina', 'hamburguesa', 'albóndiga'],
    'lácteos': ['leche', 'yogur', 'queso', 'mantequilla', 'natilla', 'flán', 'nata', 'batido', 'cuajada', 'mahonesa', 'huevos', 'requesón', 'kéfir', 'condensada'],
    'panadería': ['pan', 'croissant', 'magdalena', 'bollo', 'bimbo', 'molde', 'tosta', 'donut', 'palmera', 'integral', 'payés', 'chapata', 'focaccia', 'ciabatta', 'baguette', 'centeno', 'picatoste', 'grissini', 'cracker', 'ensaladilla', 'quiche', 'empanada', 'pizza', 'tarta', 'tiramisú', 'brownie', 'cheesecake', 'mousse'],
    'despensa': ['arroz', 'pasta', 'lenteja', 'garbanzo', 'alubia', 'conserva', 'tomate frito', 'galleta', 'aceite', 'vinagre', 'sal', 'azúcar', 'cereales', 'muesli', 'chocolate', 'café', 'té', 'colacao', 'mermelada', 'miel', 'frutos secos', 'salsa', 'quinoa', 'cuscús', 'bulgur', 'amaranto', 'trigo', 'sémola', 'harina', 'maicena', 'levadura', 'cacao', 'bombón', 'trufa', 'turrón', 'polvorón', 'mazapán', 'caramelo', 'chicle', 'regaliz', 'malvavisco', 'palomita', 'nacho', 'almendra', 'nuez', 'avellana', 'anacardo', 'pistacho', 'piñón', 'semilla', 'pasa', 'orejón', 'dátil', 'higo', 'goji', 'coco', 'tahini', 'soja', 'teriyaki', 'ostra', 'ketchup', 'mostaza', 'alioli', 'caldo', 'paella', 'gazpacho', 'puré', 'avena', 'proteína', 'barrita', 'filtro', 'cápsula', 'infusión', 'manzanilla', 'roibos', 'mate', 'agua', 'refresco', 'zumo', 'néctar', 'smoothie', 'cerveza', 'vino', 'cava', 'champán', 'sidra', 'ron', 'whisky', 'ginebra', 'vodka', 'tequila', 'licor', 'orujo', 'pacharán', 'anís', 'coñac', 'brandy', 'hielo'],
    'hogar': ['detergente', 'suavizante', 'papel', 'limpiador', 'lavavajillas', 'lejía', 'don limpio', 'ariel', 'servilleta', 'bolsa basura', 'pila', 'bombilla', 'ambientador', 'desengrasante', 'limpiacristales', 'espejo', 'multiusos', 'antical', 'moho', 'desinfectante', 'jabón', 'gel', 'mascarilla', 'guante', 'bayeta', 'estropajo', 'fregona', 'escoba', 'recogedor', 'cepillo', 'percha', 'pinza', 'tendedero', 'cesta', 'organizador', 'caja', 'funda', 'gancho', 'adhesivo', 'silicona', 'pegamento', 'cinta', 'precinto', 'brida', 'tornillo', 'tuerca', 'taco', 'clavo', 'martillo', 'destornillador', 'alicate', 'llave', 'metro', 'nivel', 'linterna', 'extensión', 'regleta', 'adaptador', 'transformador', 'cargador', 'cable', 'mantel', 'vaso', 'plato', 'cubierto', 'individual', 'posavasos', 'centro', 'vela', 'difusor', 'incienso', 'varita', 'esencia'],
    'mascota': ['pienso', 'comida perro', 'comida gato', 'arena gato', 'snack mascota', 'hámster', 'conejo', 'loro', 'periquito', 'canario', 'pez', 'tortuga', 'hurón', 'cobaya', 'jaula', 'acuario', 'terrario', 'transportín', 'correa', 'collar', 'arnés', 'bozal', 'cama', 'rascador', 'juguete', 'pelota', 'hueso', 'premio', 'vitamina', 'antiparasitario', 'pipeta', 'champú', 'toallita', 'peine', 'cortaúñas', 'secador'],
    'plantas': ['planta', 'cactus', 'suculenta', 'orquídea', 'rosal', 'geranio', 'petunia', 'begonia', 'margarita', 'girasol', 'tulipán', 'narciso', 'jacinto', 'crocus', 'azafrán', 'lirio', 'gladiolo', 'dalia', 'clavel', 'jazmín', 'gardenia', 'camelia', 'azalea', 'rododendro', 'hortensia', 'lavanda', 'romero', 'tomillo', 'salvia', 'albahaca', 'menta', 'hierbabuena', 'perejil', 'cilantro', 'eneldo', 'orégano', 'mejorana', 'laurel', 'cúrcuma', 'jengibre', 'tierra', 'abono', 'fertilizante', 'insecticida', 'fungicida', 'maceta', 'plato', 'tutor', 'alambre', 'tijera', 'pala', 'rastrillo', 'regadera', 'manguera', 'aspersor', 'riego', 'semilla', 'césped', 'musgo', 'corteza', 'grava', 'piedra', 'arena', 'concha'],
    'varios': ['champú', 'pañal', 'toallita', 'crema', 'gel', 'desodorante', 'pasta dientes', 'cepillo', 'algodón', 'bastoncillo', 'compresa', 'tampón', 'preservativo', 'vela', 'encendedor', 'cinta', 'alambre', 'cuerda', 'bebé', 'suplemento', 'auricular', 'funda', 'protector', 'soporte', 'powerbank', 'tarjeta', 'pendrive', 'disco', 'ratón', 'teclado', 'webcam', 'micrófono', 'altavoz', 'hdmi', 'ropa', 'calzado', 'accesorio', 'biberón', 'tetina', 'chupete', 'babero', 'cochecito', 'silla', 'trona', 'cuna', 'colchón', 'sábana', 'manta', 'saco', 'mosquitera', 'monitor', 'termómetro', 'aspirador', 'juguetes', 'sonajero', 'mordedor', 'peluche', 'libro', 'cuento', 'cuaderno', 'lápiz', 'cera', 'rotulador', 'pintura', 'papel', 'tijera', 'manualidad', 'disfraz', 'maquillaje', 'fiesta', 'globo', 'decoración', 'invitación', 'regalo', 'lazo', 'sobre', 'sello', 'material', 'carpeta', 'archivador', 'folio', 'agenda', 'calculadora', 'grampeadora', 'grapa', 'sacapuntas', 'goma', 'corrector', 'post-it', 'nota', 'marcador', 'subrayador', 'regla', 'compás', 'transportador', 'escuadra', 'cartabón']
  };
  
  for (const [cat, keywords] of Object.entries(mappings)) {
    if (keywords.some(k => name.includes(k))) {
      return cat;
    }
  }
  return 'varios';
}

const TASK_ROOMS = [
  { id: 'habitat-sandra', emoji: '👧', label: 'Habitación Sandra' },
  { id: 'habitat-jorge', emoji: '👦', label: 'Habitación Jorge' },
  { id: 'habitat-lucas', emoji: '👶', label: 'Habitación Lucas' },
  { id: 'salon', emoji: '🛋️', label: 'Salón' },
  { id: 'cocina', emoji: '🍳', label: 'Cocina' },
  { id: 'bano', emoji: '🚿', label: 'Baño' },
  { id: 'cloe', emoji: '🐶', label: 'Cloe' },
];

const TASK_SUBCATEGORIES = {
  'salon': [
    { id: 'limpieza', emoji: '🧽', label: 'Limpieza' },
    { id: 'polvo', emoji: '✨', label: 'Polvo' },
    { id: 'ventanas', emoji: '🪟', label: 'Ventanas' },
    { id: 'mesa', emoji: '🍽️', label: 'Poner/Quitar mesa' },
  ],
  'habitat-sandra': [
    { id: 'cama', emoji: '🛏️', label: 'Hacer la cama' },
    { id: 'limpieza', emoji: '🧽', label: 'Limpieza' },
    { id: 'polvo', emoji: '✨', label: 'Polvo' },
    { id: 'ventanas', emoji: '🪟', label: 'Ventanas' },
  ],
  'habitat-jorge': [
    { id: 'cama', emoji: '🛏️', label: 'Hacer la cama' },
    { id: 'limpieza', emoji: '🧽', label: 'Limpieza' },
    { id: 'polvo', emoji: '✨', label: 'Polvo' },
    { id: 'ventanas', emoji: '🪟', label: 'Ventanas' },
  ],
  'habitat-lucas': [
    { id: 'cama', emoji: '🛏️', label: 'Hacer la cama' },
    { id: 'juguetes', emoji: '🧸', label: 'Recoger juguetes' },
    { id: 'mochila', emoji: '🎒', label: 'Preparar mochila' },
    { id: 'dientes', emoji: '🦷', label: 'Lavarse los dientes' },
    { id: 'ducha', emoji: '🚿', label: 'Ducharse' },
    { id: 'deberes', emoji: '✏️', label: 'Hacer deberes' },
    { id: 'ropa', emoji: '👕', label: 'Recoger ropa' },
    { id: 'lectura', emoji: '📚', label: 'Leer un buen rato' },
    { id: 'limpieza', emoji: '🧽', label: 'Limpieza' },
    { id: 'polvo', emoji: '✨', label: 'Polvo' },
    { id: 'ventanas', emoji: '🪟', label: 'Ventanas' },
  ],
  'cocina': [
    { id: 'desayuno', emoji: '🥐', label: 'Desayuno' },
    { id: 'comida', emoji: '🍝', label: 'Comida' },
    { id: 'cena', emoji: '🌙', label: 'Cena' },
    { id: 'limpieza', emoji: '🧽', label: 'Limpieza' },
    { id: 'limpieza-profunda', emoji: '✨', label: 'Limpieza profunda' },
    { id: 'ventanas', emoji: '🪟', label: 'Ventanas' },
    { id: 'basura', emoji: '🗑️', label: 'Bajar basura' },
    { id: 'compra', emoji: '🛒', label: 'Compra' },
    { id: 'lavavajillas', emoji: '🍽️', label: 'Lavavajillas' },
    { id: 'lavadora', emoji: '👕', label: 'Poner/Quitar lavadora' },
    { id: 'secadora', emoji: '👖', label: 'Poner/Quitar secadora' },
  ],
  'bano': [
    { id: 'limpieza', emoji: '🧽', label: 'Limpieza' },
    { id: 'limpieza-total', emoji: '✨', label: 'Limpieza Total' },
    { id: 'polvo', emoji: '✨', label: 'Polvo' },
    { id: 'ventanas', emoji: '🪟', label: 'Ventanas' },
  ],
  'cloe': [
    { id: 'pasear', emoji: '🚶', label: 'Pasear a Cloe' },
    { id: 'bajar', emoji: '⬇️', label: 'Bajar a Cloe' },
  ],
};

const CATEGORIES_TASK = [
  { id: 'limpieza', emoji: '🧽', label: 'Limpieza' },
  { id: 'compra',   emoji: '🛒', label: 'Compra' },
  { id: 'cocina',   emoji: '🍳', label: 'Cocina' },
  { id: 'niños',    emoji: '🧸', label: 'Niños' },
  { id: 'plantas',  emoji: '🌿', label: 'Plantas' },
  { id: 'recados',  emoji: '🚗', label: 'Recados' },
  { id: 'salud',    emoji: '💊', label: 'Salud' },
  { id: 'cole',     emoji: '🎒', label: 'Cole' },
  { id: 'social',   emoji: '🎉', label: 'Social' },
  { id: 'general',  emoji: '✨', label: 'General' },
];

const CATEGORIES_SHOP = [
  { id: 'fruta',     emoji: '🍎', label: 'Fruta' },
  { id: 'verdura',   emoji: '🥦', label: 'Verdura' },
  { id: 'carne',     emoji: '🥩', label: 'Carne y pescado' },
  { id: 'lácteos',   emoji: '🥛', label: 'Lácteos' },
  { id: 'panadería', emoji: '🍞', label: 'Panadería' },
  { id: 'despensa',  emoji: '🥫', label: 'Despensa' },
  { id: 'hogar',     emoji: '🏠', label: 'Hogar' },
  { id: 'mascota',   emoji: '🐕', label: 'Mascota' },
  { id: 'plantas',   emoji: '🌿', label: 'Plantas' },
  { id: 'varios',    emoji: '🛒', label: 'Varios' },
];

const CATEGORIES_EVENT = [
  { id: 'salud',    emoji: '💊', label: 'Salud' },
  { id: 'cole',     emoji: '🎒', label: 'Cole' },
  { id: 'social',   emoji: '🎉', label: 'Social' },
  { id: 'recados',  emoji: '🚗', label: 'Recados' },
  { id: 'general',  emoji: '📅', label: 'General' },
];

const WEEKDAYS = ['lun','mar','mié','jue','vie','sáb','dom'];
const WEEKDAYS_FULL = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

function emojiForTaskCat(id)  { return (CATEGORIES_TASK.find(c => c.id === id) || CATEGORIES_TASK[CATEGORIES_TASK.length-1]).emoji; }
function emojiForShopCat(id)  { return (CATEGORIES_SHOP.find(c => c.id === id) || CATEGORIES_SHOP[CATEGORIES_SHOP.length-1]).emoji; }
function emojiForEventCat(id) { return (CATEGORIES_EVENT.find(c => c.id === id) || CATEGORIES_EVENT[CATEGORIES_EVENT.length-1]).emoji; }

function avatarHTML(user, size) {
  if (!user) return '<span class="av" style="background:var(--ink-3)">?</span>';
  const cls = size === 'xs' ? 'av xs' : size === 'lg' ? 'av lg' : 'av';
  const name = (typeof user.name === 'string') ? user.name : '';
  const initial = user.member_id || (name && name[0]) || '?';
  return `<span class="${cls} av-${esc(user.color || 'marina')}" title="${esc(name)}">${esc(initial)}</span>`;
}

// Función para aclarar un color hexadecimal
function lightenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
}

// Obtener color aclarado para eventos (tono claro)
function getLightColor(colorName) {
  const colorMap = {
    'marina': '#FFA8A8',
    'carlos': '#4ECDC4',
    'lucia': '#A8D5BA',
    'pablo': '#FFD98A',
    'verde': '#B8E6C8',
    'rosa': '#FFB3D1',
    'lavanda': '#C8B8F0',
    'melocoton': '#FFC8A8',
    'cielo': '#A8D8EA',
    'lima': '#D4E8A8',
    'coral': '#FF8A80',
    'turquesa': '#4DD0E1',
    'violeta': '#B39DDB',
    'naranja': '#FFCC80',
    'aguamarina': '#80DEEA',
    'fresa': '#F48FB1',
    'menta': '#A7FFEB',
    'ciruela': '#CE93D8',
    'albaricoque': '#FFD180'
  };
  const baseColor = colorMap[colorName] || '#FFA8A8';
  return lightenColor(baseColor, 30);
}

function showToast(msg, ms = 2200) {
  let el = document.getElementById('cloe-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'cloe-toast'; el.className = 'toast hidden';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), ms);
}

// ═══════════════ CATÁLOGO DE EMOJIS (picker) ═══════════════
// Organizados por categorías para usar al crear premios o tareas
const EMOJI_CATALOG = {
  'Premios y celebración': [
    '🎁','🎉','🎊','🎈','🥳','🏆','🥇','🥈','🥉','🎖️','🏅','👑','💎','✨','⭐','🌟','💫','🎀','🎗️','🪅'
  ],
  'Comida': [
    '🍕','🍔','🌮','🍣','🍱','🍜','🍝','🥗','🌭','🥪','🍿','🥨','🥐','🥯','🍞','🥞','🧇','🥓','🍳','🍩',
    '🍪','🎂','🧁','🍰','🥧','🍫','🍬','🍭','🍮','🍯','🍓','🍇','🍉','🍊','🍌','🍎','🍒','🍑','🥝','🍍'
  ],
  'Bebidas': [
    '🥛','☕','🍵','🥤','🧋','🧃','🧉','🍷','🍺','🍻','🥂','🍾','🍸','🍹','🍶','🥃','🧊'
  ],
  'Ocio y juegos': [
    '🎮','🕹️','🎲','🃏','🎰','🧩','♟️','🎯','🎱','🎨','🖌️','🎭','🪀','🪁','🛹','🛷','🪂','🎢','🎡','🎠','🤹','🪄'
  ],
  'Cine y TV': [
    '🎬','🎥','📽️','🎞️','📺','🍿','🎫','🎟️','🍦','🍿'
  ],
  'Música': [
    '🎵','🎶','🎼','🎤','🎧','🥁','🎸','🎹','🎺','🎷','🪕','🪘','🎻','📻','🎙️'
  ],
  'Tech y digital': [
    '📱','💻','⌨️','🖱️','🖥️','🖨️','📷','📸','📹','🎥','📺','💾','💿','📀','🕹️','🎮','📡','🔌','🔋','💡','🔦'
  ],
  'Deportes': [
    '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🎱','🥏','🏓','🏸','🥊','🥋','🥅','⛳','🏹','🎣','🤿','🥌','⛸️','🛼','🏂','🏄','🏊','🚴','🚵','🏇','🤸','🤼','🤽','🤾','🏋️','🧗','⛹️','🪂','🏆'
  ],
  'Viajes y planes': [
    '✈️','🚂','🚄','🚌','🚗','🚕','🚲','🛵','🏍️','🚤','⛵','🚢','🚁','🛺','🚠','🗺️','🧭','🏖️','⛱️','🏔️','🗻','🏕️','⛺','🏞️','🌅','🌄','🌇','🌃','🌉','🗼','🗽','🎡','🎢'
  ],
  'Compras': [
    '🛍️','🛒','💳','💵','💶','💷','💴','💰','🪙','🏷️','🧾','📦','🎁','🛎️'
  ],
  'Cultura y lectura': [
    '📚','📖','📗','📘','📙','📕','📓','📔','📒','📰','📜','📝','✏️','✒️','🖊️','🖋️','🖌️','🖍️','📐','📏','🧮','🔬','🔭','🎓','🏫'
  ],
  'Animales': [
    '🐶','🐕','🦮','🐩','🐱','🐈','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🦄','🐔','🐧','🐦','🐤','🦅','🦉','🦋','🐝','🐞','🐢','🐍','🦎','🐙','🦑','🦐','🦞','🐠','🐟','🐬','🐳','🐋','🦈'
  ],
  'Naturaleza': [
    '🌸','🌺','🌻','🌷','🌹','🥀','🪷','💐','🌳','🌲','🌴','🌵','🌿','☘️','🍀','🍃','🍂','🍁','🌾','🌱','🌼','🌞','🌝','🌚','🌙','⭐','✨','☁️','⛅','🌧️','🌩️','❄️','☔','🌈','🔥','💧','🌊'
  ],
  'Ropa y accesorios': [
    '👕','👖','👗','👔','🧥','🧣','🧤','🧦','🥼','🥻','🩱','🩲','🩳','👘','🥾','👟','🥿','👠','👡','👢','🎩','🧢','👒','⛑️','🎓','👑','💍','👜','👛','👝','🎒','🕶️','👓','🌂','💄','💎'
  ],
  'Casa y hogar': [
    '🏠','🏡','🛋️','🛏️','🚿','🛁','🪥','🧻','🧼','🧽','🧹','🧺','🧴','🪒','🪞','🪟','🪑','🚪','🪤','🔑','🗝️','🔨','🪛','🛠️','⚙️','🧲','🔧'
  ],
  'Símbolos y caras': [
    '😀','😄','😁','😊','😍','🤩','😎','🥰','😘','🤗','🤭','🤫','🤔','🤓','🧐','😴','🥱','😋','😛','🤤','😇','🤠','🤡','🤖','👻','💀','👽','🤖','💩','🦾','🦿','👀','👁️','💯','💢','💥','💫','💤','💨','🕳️','💣','💬','💭','🗯️','♥️','💛','💙','💜','🖤','💚','🧡','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟'
  ],
  'Tiempo y eventos': [
    '🕐','🕑','🕒','🕓','🕔','🕕','🕖','🕗','🕘','🕙','🕚','🕛','⏰','⏱️','⏲️','⌚','📅','📆','🗓️','🗒️','🗂️','🎂','🎄','🎃','🪔','🎆','🎇','🧨','✨','🎈','🎉','🎊','🎀','🎁','🪅','🪩'
  ],
  'Mascota Cloe & amigos': [
    '🐶','🦴','🦮','🐕‍🦺','🐾','🦷','🥎','🎾','🥾','🏠','💩','🚽'
  ],
  'Niños y peques': [
    '👶','👧','👦','🧒','🍼','🚼','🧸','🪀','🪁','🎠','🎡','🎢','🎈','🎁','🪅','🦄','🌈','⭐','✨','🐻','🐰','🐱','🦖','🦕','🐉','🚀','🛸','🦸','🦸‍♀️','🦸‍♂️','🧚','🧚‍♀️','🧚‍♂️','🧙','👸','🤴'
  ],
};

// ═══════════════ TROFEOS / LOGROS ═══════════════
// Cada trofeo recibe (state, userId) y devuelve { current, target }
// 'unlocked' se calcula como current >= target
const TROPHIES = [
  // ── Tareas (común → mítico) ───────────────────────────
  { id: 'first-task', emoji: '🎯', name: 'Primer paso', desc: 'Completa tu primera misión.', rarity: 'common', coins: 10,
    eval: (s, uid) => ({ current: s.tasks.filter(t => t.done && t.assignee === uid).length, target: 1 }) },
  { id: 'tasks-10', emoji: '✅', name: 'Calentando motores', desc: '10 misiones completadas.', rarity: 'common', coins: 20,
    eval: (s, uid) => ({ current: s.tasks.filter(t => t.done && t.assignee === uid).length, target: 10 }) },
  { id: 'tasks-50', emoji: '⚡', name: 'Máquina', desc: '50 misiones completadas.', rarity: 'rare', coins: 50,
    eval: (s, uid) => ({ current: s.tasks.filter(t => t.done && t.assignee === uid).length, target: 50 }) },
  { id: 'tasks-100', emoji: '💯', name: 'Centena gloriosa', desc: '100 misiones a tus espaldas.', rarity: 'epic', coins: 150,
    eval: (s, uid) => ({ current: s.tasks.filter(t => t.done && t.assignee === uid).length, target: 100 }) },
  { id: 'tasks-500', emoji: '🏆', name: 'Quinientos finos', desc: '500 misiones. Leyenda en pijama.', rarity: 'legendary', coins: 500,
    eval: (s, uid) => ({ current: s.tasks.filter(t => t.done && t.assignee === uid).length, target: 500 }) },
  { id: 'tasks-1000', emoji: '👑', name: 'Mil veces héroe', desc: '1000 misiones. Estatua merecida.', rarity: 'mythic', coins: 1000,
    eval: (s, uid) => ({ current: s.tasks.filter(t => t.done && t.assignee === uid).length, target: 1000 }) },

  // ── Rachas ────────────────────────────────────────────
  { id: 'streak-3', emoji: '🔥', name: 'Racha encendida', desc: '3 días seguidos haciendo al menos una tarea.', rarity: 'common', coins: 15,
    eval: (s, uid) => ({ current: computeStreak(s, uid), target: 3 }) },
  { id: 'streak-7', emoji: '🔥', name: 'Semana imparable', desc: '7 días seguidos.', rarity: 'rare', coins: 50,
    eval: (s, uid) => ({ current: computeStreak(s, uid), target: 7 }) },
  { id: 'streak-30', emoji: '🌋', name: 'Volcán doméstico', desc: '30 días seguidos. Locura sana.', rarity: 'epic', coins: 200,
    eval: (s, uid) => ({ current: computeStreak(s, uid), target: 30 }) },

  // ── Horarios extremos ─────────────────────────────────
  { id: 'early-bird', emoji: '🌅', name: 'Madrugador', desc: 'Una tarea hecha antes de las 7 AM.', rarity: 'rare', coins: 30,
    eval: (s, uid) => ({
      current: s.tasks.some(t => t.done && t.assignee === uid && t.done_at && new Date(t.done_at).getHours() < 7) ? 1 : 0,
      target: 1
    }) },
  { id: 'night-owl', emoji: '🦉', name: 'Búho nocturno', desc: 'Una tarea hecha después de las 23 h.', rarity: 'rare', coins: 30,
    eval: (s, uid) => ({
      current: s.tasks.some(t => t.done && t.assignee === uid && t.done_at && new Date(t.done_at).getHours() >= 23) ? 1 : 0,
      target: 1
    }) },
  { id: 'sprint-5', emoji: '💨', name: 'Sprint relámpago', desc: '5 misiones en un mismo día.', rarity: 'rare', coins: 40,
    eval: (s, uid) => ({ current: maxTasksOneDay(s, uid), target: 5 }) },
  { id: 'sprint-10', emoji: '🚀', name: 'Combo decuple', desc: '10 misiones en un mismo día.', rarity: 'epic', coins: 100,
    eval: (s, uid) => ({ current: maxTasksOneDay(s, uid), target: 10 }) },

  // ── Especialistas por sala ────────────────────────────
  { id: 'kitchen-25', emoji: '🍳', name: 'Chef de la casa', desc: '25 misiones de cocina.', rarity: 'rare', coins: 50,
    eval: (s, uid) => ({ current: s.tasks.filter(t => t.done && t.assignee === uid && t.room === 'cocina').length, target: 25 }) },
  { id: 'clean-25', emoji: '🧽', name: 'Maestro brillo', desc: '25 misiones de limpieza.', rarity: 'rare', coins: 50,
    eval: (s, uid) => ({ current: s.tasks.filter(t => t.done && t.assignee === uid && t.subcategory === 'limpieza').length, target: 25 }) },
  { id: 'bath-15', emoji: '🚿', name: 'Spa manager', desc: '15 misiones del baño.', rarity: 'rare', coins: 40,
    eval: (s, uid) => ({ current: s.tasks.filter(t => t.done && t.assignee === uid && t.room === 'bano').length, target: 15 }) },
  { id: 'window-cleaner', emoji: '🪟', name: 'Cazador de huellas', desc: '10 ventanas relucientes.', rarity: 'rare', coins: 30,
    eval: (s, uid) => ({ current: s.tasks.filter(t => t.done && t.assignee === uid && t.subcategory === 'ventanas').length, target: 10 }) },

  // ── Cloe ──────────────────────────────────────────────
  { id: 'cloe-first', emoji: '🐶', name: 'Bienvenida al club', desc: 'Tu primer paseo con Cloe.', rarity: 'common', coins: 10,
    eval: (s, uid) => ({ current: (s.cloeWalks || []).filter(w => w.assignee === uid).length, target: 1 }) },
  { id: 'cloe-20', emoji: '🐕', name: 'Paseante VIP', desc: '20 paseos con Cloe.', rarity: 'rare', coins: 50,
    eval: (s, uid) => ({ current: (s.cloeWalks || []).filter(w => w.assignee === uid).length, target: 20 }) },
  { id: 'cloe-100', emoji: '🐕‍🦺', name: 'Cloe te adora', desc: '100 paseos con Cloe.', rarity: 'epic', coins: 150,
    eval: (s, uid) => ({ current: (s.cloeWalks || []).filter(w => w.assignee === uid).length, target: 100 }) },
  { id: 'cloe-walk-10k', emoji: '⏱️', name: 'Tobillo de hierro', desc: '500 minutos paseando.', rarity: 'epic', coins: 150,
    eval: (s, uid) => ({
      current: (s.cloeWalks || []).filter(w => w.assignee === uid).reduce((acc, w) => acc + (w.duration || 30), 0),
      target: 500
    }) },
  { id: 'poop-scout', emoji: '💩', name: 'Recoge-cacas pro', desc: '50 caquitas registradas.', rarity: 'rare', coins: 50,
    eval: (s, uid) => ({
      current: (s.cloeDowns || []).filter(d => d.assignee === uid && d.reason === 'caca').length,
      target: 50
    }) },

  // ── Compra ────────────────────────────────────────────
  { id: 'shop-first', emoji: '🛒', name: 'A tu carro', desc: 'Añade tu primer producto.', rarity: 'common', coins: 10,
    eval: (s, uid) => ({ current: s.shopping.filter(x => x.added_by === uid).length, target: 1 }) },
  { id: 'shop-50', emoji: '🛍️', name: 'Carrito serial', desc: '50 productos comprados.', rarity: 'rare', coins: 50,
    eval: (s, uid) => ({ current: s.shopping.filter(x => x.added_by === uid && x.done).length, target: 50 }) },
  { id: 'shop-healthy', emoji: '🥗', name: 'Modo saludable', desc: '20 frutas o verduras compradas.', rarity: 'rare', coins: 40,
    eval: (s, uid) => ({
      current: s.shopping.filter(x => x.added_by === uid && x.done && (x.category === 'fruta' || x.category === 'verdura')).length,
      target: 20
    }) },

  // ── Eventos / planificación ───────────────────────────
  { id: 'event-first', emoji: '📅', name: 'Plan en marcha', desc: 'Crea tu primer evento.', rarity: 'common', coins: 10,
    eval: (s, uid) => ({ current: s.events.filter(e => e.assignee === uid).length, target: 1 }) },
  { id: 'event-organizer', emoji: '🎉', name: 'Cerebro de eventos', desc: '20 eventos en tu nombre.', rarity: 'rare', coins: 50,
    eval: (s, uid) => ({ current: s.events.filter(e => e.assignee === uid).length, target: 20 }) },

  // ── Diversidad ────────────────────────────────────────
  { id: 'multitasker', emoji: '🌈', name: 'Manitas total', desc: 'Tareas en 5 habitaciones distintas.', rarity: 'epic', coins: 150,
    eval: (s, uid) => ({
      current: new Set(s.tasks.filter(t => t.done && t.assignee === uid && t.room).map(t => t.room)).size,
      target: 5
    }) },
];

function computeStreak(state, uid) {
  // Cuenta días consecutivos hasta hoy con al menos una tarea hecha por el usuario
  const tasks = (state && state.tasks) || [];
  const days = new Set(
    tasks
      .filter(t => t.done && t.done_at && t.assignee === uid)
      .map(t => t.done_at.slice(0, 10))
  );
  let streak = 0;
  const d = new Date();
  for (;;) {
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (!days.has(iso)) break;
    streak++;
    d.setDate(d.getDate() - 1);
    if (streak > 365) break;
  }
  return streak;
}

function maxTasksOneDay(state, uid) {
  const counts = {};
  ((state && state.tasks) || [])
    .filter(t => t.done && t.done_at && t.assignee === uid)
    .forEach(t => {
      const k = t.done_at.slice(0, 10);
      counts[k] = (counts[k] || 0) + 1;
    });
  return Math.max(0, ...Object.values(counts));
}

// ═══════════════ MONEDAS 🪙 ═══════════════
// Valores por defecto (semilla). El admin los puede modificar desde su panel
// y al cargar la app se sobrescriben con los de la tabla coin_rules.
const COINS = {
  TASK_BASE:       10,
  TASK_KIDROOM:    15,
  TASK_KITCHEN:     8,
  TASK_CLEAN:      12,
  TASK_DEEP_CLEAN: 15,  // Limpieza profunda (cocina) y Limpieza Total (baño)
  CLOE_WALK:       20,
  CLOE_DOWN:        5,
  SHOP_DONE:        2,
};

// Aplica las reglas guardadas en la tabla coin_rules sobre el objeto COINS
function applyCoinRules(rules) {
  if (!Array.isArray(rules)) return;
  for (const r of rules) {
    if (r && r.key && Number.isFinite(r.value) && r.key in COINS) {
      COINS[r.key] = r.value;
    }
  }
}

// Catálogo unificado: TASK_SUBCATEGORIES (hardcoded) + filas de task_coin_rules.
// La fila de BD pisa cualquier valor del hardcoded. Las filas custom (que
// no existen en TASK_SUBCATEGORIES) se añaden al catálogo.
function getTaskCatalog(state) {
  const out = {};
  if (typeof TASK_SUBCATEGORIES !== 'undefined') {
    for (const room of Object.keys(TASK_SUBCATEGORIES)) {
      out[room] = (TASK_SUBCATEGORIES[room] || []).map(s => ({
        id: s.id, label: s.label, emoji: s.emoji, value: null, sort_order: 100
      }));
    }
  }
  const rules = (state && state.taskCoinRules) || [];
  for (const r of rules) {
    if (!r || !r.room || !r.subcategory) continue;
    if (!out[r.room]) out[r.room] = [];
    const idx = out[r.room].findIndex(s => s.id === r.subcategory);
    const merged = {
      id: r.subcategory,
      label: r.label || (idx >= 0 ? out[r.room][idx].label : r.subcategory),
      emoji: r.emoji || (idx >= 0 ? out[r.room][idx].emoji : '✨'),
      value: Math.max(0, r.value || 0),
      sort_order: r.sort_order ?? 100,
    };
    if (idx >= 0) out[r.room][idx] = merged;
    else out[r.room].push(merged);
  }
  for (const room of Object.keys(out)) {
    out[room].sort((a, b) => (a.sort_order - b.sort_order) || a.label.localeCompare(b.label));
  }
  return out;
}

function coinsForTask(t, state) {
  if (!t || !t.done) return 0;
  if (!t.room || !t.subcategory) return 0;
  const rules = (state && state.taskCoinRules) || [];
  const hit = rules.find(r => r.room === t.room && r.subcategory === t.subcategory);
  return hit ? Math.max(0, hit.value || 0) : 0;
}

// Saldo de monedas ganadas por ACTIVIDAD (tareas, cloe, compra) menos canjes.
// NO incluye los bonos de trofeos — esa función es la que se usa también para
// evaluar los trofeos `coin-N` y por eso debe ser independiente de TROPHIES,
// si no entra en recursión infinita.
function baseCoins(state, uid) {
  let sum = 0;
  for (const t of ((state && state.tasks) || [])) {
    if (t.done && t.assignee === uid) sum += coinsForTask(t, state);
  }
  for (const w of ((state && state.cloeWalks) || [])) {
    if (w.assignee === uid) sum += COINS.CLOE_WALK;
  }
  for (const d of ((state && state.cloeDowns) || [])) {
    if (d.assignee === uid) sum += COINS.CLOE_DOWN;
  }
  for (const s of ((state && state.shopping) || [])) {
    if (s.done && s.added_by === uid) sum += COINS.SHOP_DONE;
  }
  for (const r of ((state && state.redemptions) || [])) {
    if (r.user_id === uid && (r.status === 'approved' || r.status === 'delivered')) {
      sum -= Math.max(0, r.cost_paid || 0);
    }
  }
  return Math.max(0, sum);
}

// Re-entrancy guard: si totalCoins llama a un tr.eval que vuelve a llamar a
// totalCoins (caso que NO debería ocurrir tras este refactor pero blindamos),
// devolvemos baseCoins para evitar stack overflow.
let _totalCoinsDepth = 0;
function totalCoins(state, uid) {
  if (_totalCoinsDepth > 0) return baseCoins(state, uid);
  _totalCoinsDepth++;
  try {
    let sum = baseCoins(state, uid);
    // Bonos por trofeos actualmente desbloqueados (evaluación in-memory).
    if (typeof TROPHIES !== 'undefined' && Array.isArray(TROPHIES)) {
      for (const tr of TROPHIES) {
        if (!tr || typeof tr.eval !== 'function') continue;
        try {
          const r = tr.eval(state, uid);
          if (r && r.current >= r.target) sum += Math.max(0, tr.coins || 0);
        } catch { /* trofeo con eval defectuoso → ignorar */ }
      }
    }
    // Trofeos persistidos cuyo id ya no existe en el catálogo (no se les quita lo ganado).
    if (state && Array.isArray(state.trophiesUnlocked) && typeof TROPHIES !== 'undefined') {
      const known = new Set(TROPHIES.map(t => t.id));
      for (const tu of state.trophiesUnlocked) {
        if (tu.user_id === uid && !known.has(tu.trophy_id)) {
          sum += Math.max(0, tu.coins || 0);
        }
      }
    }
    return Math.max(0, sum);
  } finally {
    _totalCoinsDepth--;
  }
}

// ═══════════════ TROFEOS INFANTILES 🧒 ═══════════════
// Se añaden al catálogo TROPHIES principal
TROPHIES.push(
  // Hábitos diarios
  { id: 'tooth-10', emoji: '🦷', name: 'Dientes brillantes', desc: '10 cepillados registrados.', rarity: 'common', coins: 10,
    eval: (s, uid) => ({ current: s.tasks.filter(t => t.done && t.assignee === uid && t.subcategory === 'dientes').length, target: 10 }) },
  { id: 'tooth-50', emoji: '😁', name: 'Sonrisa de anuncio', desc: '50 cepillados. ¡Dentista feliz!', rarity: 'rare', coins: 50,
    eval: (s, uid) => ({ current: s.tasks.filter(t => t.done && t.assignee === uid && t.subcategory === 'dientes').length, target: 50 }) },
  { id: 'bed-10', emoji: '🛏️', name: 'Maestro de la cama', desc: 'Hacer la cama 10 veces.', rarity: 'common', coins: 10,
    eval: (s, uid) => ({ current: s.tasks.filter(t => t.done && t.assignee === uid && t.subcategory === 'cama').length, target: 10 }) },
  { id: 'bed-30', emoji: '👑', name: 'Rey de la almohada', desc: '30 camas hechas perfectas.', rarity: 'rare', coins: 50,
    eval: (s, uid) => ({ current: s.tasks.filter(t => t.done && t.assignee === uid && t.subcategory === 'cama').length, target: 30 }) },
  { id: 'toys-10', emoji: '🧸', name: 'Recogedor pro', desc: 'Recoger juguetes 10 veces.', rarity: 'common', coins: 10,
    eval: (s, uid) => ({ current: s.tasks.filter(t => t.done && t.assignee === uid && t.subcategory === 'juguetes').length, target: 10 }) },
  { id: 'backpack-10', emoji: '🎒', name: 'Mochila ninja', desc: 'Preparar mochila 10 veces sin que te lo recuerden.', rarity: 'rare', coins: 40,
    eval: (s, uid) => ({ current: s.tasks.filter(t => t.done && t.assignee === uid && t.subcategory === 'mochila').length, target: 10 }) },
  { id: 'reading-10', emoji: '📚', name: 'Lector intrépido', desc: '10 ratos de lectura.', rarity: 'rare', coins: 30,
    eval: (s, uid) => ({ current: s.tasks.filter(t => t.done && t.assignee === uid && (t.subcategory === 'lectura' || t.subcategory === 'cuento')).length, target: 10 }) },
  { id: 'reading-50', emoji: '🧙', name: 'Mago de las palabras', desc: '50 sesiones de lectura.', rarity: 'epic', coins: 150,
    eval: (s, uid) => ({ current: s.tasks.filter(t => t.done && t.assignee === uid && (t.subcategory === 'lectura' || t.subcategory === 'cuento')).length, target: 50 }) },
  { id: 'homework-15', emoji: '✏️', name: 'Cerebro en marcha', desc: '15 deberes terminados.', rarity: 'rare', coins: 50,
    eval: (s, uid) => ({ current: s.tasks.filter(t => t.done && t.assignee === uid && t.subcategory === 'deberes').length, target: 15 }) },
  { id: 'shower-15', emoji: '🚿', name: 'Limpio como un samurái', desc: '15 duchas registradas.', rarity: 'common', coins: 10,
    eval: (s, uid) => ({ current: s.tasks.filter(t => t.done && t.assignee === uid && (t.subcategory === 'ducha' || t.subcategory === 'baño')).length, target: 15 }) },
  // Combo de hábitos diarios completos
  { id: 'kid-day-combo', emoji: '🌟', name: 'Día redondo', desc: 'En un mismo día: cama, dientes y mochila.', rarity: 'rare', coins: 50,
    eval: (s, uid) => ({ current: comboKidDays(s, uid), target: 1 }) },
  { id: 'kid-day-combo-7', emoji: '✨', name: 'Semana de oro', desc: '7 "días redondos" acumulados.', rarity: 'epic', coins: 150,
    eval: (s, uid) => ({ current: comboKidDays(s, uid), target: 7 }) },

  // Monedas
  { id: 'coin-1', emoji: '🪙', name: 'Primera moneda', desc: 'Gana tu primera moneda.', rarity: 'common', coins: 10,
    eval: (s, uid) => ({ current: Math.min(baseCoins(s, uid), 1), target: 1 }) },
  { id: 'coin-100', emoji: '💰', name: 'Hucha que suena', desc: 'Acumula 100 monedas.', rarity: 'common', coins: 20,
    eval: (s, uid) => ({ current: baseCoins(s, uid), target: 100 }) },
  { id: 'coin-500', emoji: '💵', name: 'Hucha pesada', desc: 'Acumula 500 monedas.', rarity: 'rare', coins: 50,
    eval: (s, uid) => ({ current: baseCoins(s, uid), target: 500 }) },
  { id: 'coin-2000', emoji: '🤑', name: 'Tesoro pirata', desc: 'Acumula 2.000 monedas.', rarity: 'epic', coins: 200,
    eval: (s, uid) => ({ current: baseCoins(s, uid), target: 2000 }) },
  { id: 'coin-10000', emoji: '🏦', name: 'Banco familiar', desc: 'Acumula 10.000 monedas. Reservados para la jubilación.', rarity: 'legendary', coins: 500,
    eval: (s, uid) => ({ current: baseCoins(s, uid), target: 10000 }) },

  // Estrella diaria
  { id: 'kid-star-day', emoji: '⭐', name: 'Estrella del día', desc: '5 misiones en un mismo día.', rarity: 'rare', coins: 50,
    eval: (s, uid) => ({ current: maxTasksOneDay(s, uid), target: 5 }) },
  { id: 'kid-helper', emoji: '🤝', name: 'Ayudante oficial', desc: '20 misiones en cocina.', rarity: 'rare', coins: 50,
    eval: (s, uid) => ({ current: s.tasks.filter(t => t.done && t.assignee === uid && t.room === 'cocina').length, target: 20 }) },
);

function comboKidDays(state, uid) {
  // Cuenta días en los que el usuario hizo cama + dientes + mochila el mismo día
  const want = ['cama', 'dientes', 'mochila'];
  const byDay = {};
  for (const t of state.tasks) {
    if (!t.done || t.assignee !== uid || !t.done_at) continue;
    const day = t.done_at.slice(0, 10);
    (byDay[day] = byDay[day] || new Set()).add(t.subcategory);
  }
  let n = 0;
  for (const day in byDay) {
    if (want.every(w => byDay[day].has(w))) n++;
  }
  return n;
}

const TROPHY_RARITY = {
  common:    { label: 'Común',     class: 'common',    color: '#9A9AB0' },
  rare:      { label: 'Raro',      class: 'rare',      color: '#00B4D8' },
  epic:      { label: 'Épico',     class: 'epic',      color: '#B14CFF' },
  legendary: { label: 'Legendario',class: 'legendary', color: '#FFB347' },
  mythic:    { label: 'Mítico',    class: 'mythic',    color: '#FF1A4D' },
};
