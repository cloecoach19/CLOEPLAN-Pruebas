// data.jsx — shared state for CLOE te organiza
// Members + tasks + shopping + calendar + pet + reminders + small UI helpers

const MEMBERS = [
  { id: 'M', name: 'Marina', color: 'var(--m-marina)', role: 'mamá' },
  { id: 'C', name: 'Carlos', color: 'var(--m-carlos)', role: 'papá' },
  { id: 'L', name: 'Lucía',  color: 'var(--m-lucia)',  role: 'hija' },
  { id: 'P', name: 'Pablo',  color: 'var(--m-pablo)',  role: 'hijo' },
];

const memberById = (id) => MEMBERS.find(m => m.id === id) || MEMBERS[0];

// ── Avatar ──────────────────────────────────────────────
function Avatar({ id, size = 'md', stack = false }) {
  const m = memberById(id);
  const cls = size === 'lg' ? 'av lg' : size === 'xs' ? 'av xs' : 'av';
  return (
    <span className={cls} style={{ background: m.color }} title={m.name}>
      {m.id}
    </span>
  );
}
function AvatarStack({ ids, size = 'md' }) {
  return (
    <span className="av-stack">
      {ids.map(id => <Avatar key={id} id={id} size={size} />)}
    </span>
  );
}

// ── Checkbox with confetti ──────────────────────────────
function Check({ on, onToggle }) {
  const ref = React.useRef(null);
  const click = (e) => {
    if (!on && ref.current) burstConfetti(ref.current);
    onToggle?.();
  };
  return (
    <button ref={ref} className={'check' + (on ? ' on' : '')} onClick={click} aria-label="check">
      {on && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2.5 7.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}

// ── Confetti burst ──────────────────────────────────────
const CONFETTI_COLORS = ['#C24A22', '#E08054', '#6E8A4A', '#A04F6D', '#4F6A8C', '#E6B340'];
function burstConfetti(originEl) {
  const host = originEl.closest('[data-confetti-host]') || document.body;
  const hostRect = host.getBoundingClientRect();
  const r = originEl.getBoundingClientRect();
  const cx = r.left - hostRect.left + r.width / 2;
  const cy = r.top  - hostRect.top  + r.height / 2;
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('span');
    p.className = 'confetti';
    const ang = (Math.PI * 2 * i) / 18 + (Math.random() - 0.5) * 0.4;
    const dist = 60 + Math.random() * 80;
    p.style.left = cx + 'px';
    p.style.top  = cy + 'px';
    p.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
    p.style.setProperty('--dy', Math.sin(ang) * dist + 60 + 'px');
    p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
    p.style.borderRadius = i % 3 === 0 ? '999px' : '2px';
    host.appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }
}

// ── Initial data ────────────────────────────────────────
const INITIAL_TASKS_TODAY = [
  { id: 't1', title: 'Sacar a Loki',           cat: 'mascota',  emoji: '🐕', who: 'C', time: '08:00', done: true  },
  { id: 't2', title: 'Comprar pan y fruta',    cat: 'compra',   emoji: '🛒', who: 'M', time: '10:30', done: true  },
  { id: 't3', title: 'Recoger a Pablo del cole',cat: 'niños',   emoji: '🧸', who: 'C', time: '17:00', done: false },
  { id: 't4', title: 'Poner lavadora oscura',  cat: 'limpieza', emoji: '🧺', who: 'L', time: '18:30', done: false },
  { id: 't5', title: 'Hacer la cena',          cat: 'cocina',   emoji: '🍳', who: 'M', time: '20:30', done: false },
  { id: 't6', title: 'Regar las plantas',      cat: 'plantas',  emoji: '🌿', who: 'P', time: '—',     done: false },
];

const INITIAL_TASKS_WEEK = [
  { id: 'w1', title: 'Limpiar baño',       cat: 'limpieza', emoji: '🧽', who: 'C', day: 'sáb', done: false },
  { id: 'w2', title: 'Compra grande',      cat: 'compra',   emoji: '🛒', who: 'M', day: 'dom', done: false },
  { id: 'w3', title: 'Aspirar salón',      cat: 'limpieza', emoji: '🧹', who: 'L', day: 'jue', done: true  },
  { id: 'w4', title: 'Sacar la basura',    cat: 'limpieza', emoji: '🗑️', who: 'P', day: 'mié', done: true  },
  { id: 'w5', title: 'Cambiar sábanas',    cat: 'limpieza', emoji: '🛏️', who: 'M', day: 'dom', done: false },
  { id: 'w6', title: 'Coche al taller',    cat: 'recados',  emoji: '🚗', who: 'C', day: 'vie', done: false },
];

const INITIAL_SHOPPING = [
  { id: 's1',  name: 'Pan integral',     qty: '2 barras', cat: 'panadería', who: 'M', done: true  },
  { id: 's2',  name: 'Manzanas',         qty: '1 kg',     cat: 'fruta',     who: 'M', done: true  },
  { id: 's3',  name: 'Leche entera',     qty: '6 L',      cat: 'lácteos',   who: 'C', done: false },
  { id: 's4',  name: 'Yogures griegos',  qty: 'pack 8',   cat: 'lácteos',   who: 'L', done: false },
  { id: 's5',  name: 'Pollo',            qty: '1 kg',     cat: 'carne',     who: 'M', done: false },
  { id: 's6',  name: 'Tomates cherry',   qty: '500 g',    cat: 'verdura',   who: 'C', done: false },
  { id: 's7',  name: 'Papel higiénico',  qty: '12 rollos',cat: 'hogar',     who: '',  done: false },
  { id: 's8',  name: 'Detergente',       qty: '1 ud',     cat: 'hogar',     who: '',  done: false },
  { id: 's9',  name: 'Aceite oliva',     qty: '1 L',      cat: 'despensa',  who: 'M', done: false },
  { id: 's10', name: 'Pienso de Loki',   qty: '5 kg',     cat: 'mascota',   who: 'P', done: false },
];

const INITIAL_EVENTS = [
  { id: 'e1', title: 'Médico Lucía',          who: 'M', time: '09:30', dur: '45m', tag: 'salud',  color: 'var(--m-lucia)' },
  { id: 'e2', title: 'Entrenamiento Pablo',   who: 'P', time: '17:30', dur: '1h',  tag: 'cole',   color: 'var(--m-pablo)' },
  { id: 'e3', title: 'Cena con suegros',      who: 'M', time: '21:00', dur: '2h',  tag: 'social', color: 'var(--m-marina)' },
  { id: 'e4', title: 'Yoga online',           who: 'C', time: '07:00', dur: '45m', tag: 'salud',  color: 'var(--m-carlos)' },
];

const INITIAL_PET = {
  name: 'Loki',
  breed: 'mestizo',
  age: '4 años',
  weight: '18 kg',
  walks: [
    { id: 'wk1', label: 'Paseo mañana',   when: '08:00', who: 'C', done: true,  dur: '30m' },
    { id: 'wk2', label: 'Paseo mediodía', when: '14:00', who: 'L', done: true,  dur: '15m' },
    { id: 'wk3', label: 'Paseo tarde',    when: '19:30', who: 'P', done: false, dur: '45m' },
  ],
  meals: [
    { id: 'm1', label: 'Desayuno', when: '08:15', who: 'C', done: true,  amount: '150 g' },
    { id: 'm2', label: 'Cena',     when: '20:00', who: 'P', done: false, amount: '200 g' },
  ],
  vet: { next: 'Vacuna anual', date: '12 jun', daysLeft: 28 },
};

// Score per member this week
const INITIAL_SCORES = [
  { id: 'M', done: 11, total: 12 },
  { id: 'C', done: 9,  total: 11 },
  { id: 'L', done: 7,  total: 10 },
  { id: 'P', done: 5,  total: 9  },
];

// ── App-wide state hook ─────────────────────────────────
function useAppState() {
  const [today, setToday] = React.useState(INITIAL_TASKS_TODAY);
  const [week, setWeek]   = React.useState(INITIAL_TASKS_WEEK);
  const [shop, setShop]   = React.useState(INITIAL_SHOPPING);
  const [events]          = React.useState(INITIAL_EVENTS);
  const [pet, setPet]     = React.useState(INITIAL_PET);

  const toggleTodayTask = (id) => setToday(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const toggleWeekTask  = (id) => setWeek (ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const toggleShop      = (id) => setShop (ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const togglePetWalk   = (id) => setPet  (p => ({ ...p, walks: p.walks.map(w => w.id === id ? { ...w, done: !w.done } : w) }));
  const togglePetMeal   = (id) => setPet  (p => ({ ...p, meals: p.meals.map(m => m.id === id ? { ...m, done: !m.done } : m) }));

  return {
    members: MEMBERS,
    today, toggleTodayTask,
    week, toggleWeekTask,
    shop, toggleShop,
    events,
    pet, togglePetWalk, togglePetMeal,
    scores: INITIAL_SCORES,
  };
}

// Funny microcopy
const QUIPS = {
  empty_today: ['Hoy nada. ¿Casualidad o brujería?', 'Día limpio. Aprovecha.', '0 tareas. Sospechoso.'],
  done_all: ['¡Toma ya! Día completo.', 'Casa al 100%. Loki sonríe.', 'Hat-trick. Te has ganado el sofá.'],
  shop_empty: ['Nevera llena. Filosóficamente, también.', 'Lista vacía. Disfrútalo.'],
};
const quip = (key) => {
  const arr = QUIPS[key] || ['']; return arr[Math.floor(Math.random() * arr.length)];
};

// Export to global
Object.assign(window, {
  MEMBERS, memberById,
  Avatar, AvatarStack, Check,
  burstConfetti, useAppState, quip,
});
