/* =============================================================
   storage.js — localStorage persistence + Supabase cloud sync
   Part of Innova8 (WEB-06) · BBIT Hackathon 2026
   ============================================================= */
(function (I8) {
'use strict';

const { $, DB_KEY, addDays, iso, toast, uid } = I8;

/* ---- store: React components subscribe here and re-render on save ---- */
const listeners = new Set();
function notify() {
  I8.db = Object.assign({}, I8.db);   // new identity so React sees the change
  listeners.forEach(function (fn) { try { fn(); } catch (err) {} });
}
function subscribe(fn) {
  listeners.add(fn);
  return function () { listeners.delete(fn); };
}

/* ---------------- storage (FR-1 layer) ---------------- */
const DEFAULTS = {
  business: { name:'', pan:'', gstin:'', state:'Maharashtra', upi:'', upiName:'', email:'', phone:'', addr:'', logo:'' },
  settings: { prefix:'INV', next:101, gst:18, hsn:'998391', lut:false },
  clients: [], invoices: [], log: []
};
I8.db = load();

function load() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return Object.assign(structuredClone(DEFAULTS), JSON.parse(raw));
  } catch (e) { /* corrupted storage → seed fresh */ }
  return seed();
}
function save() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(I8.db)); } catch (e) { /* quota */ }
  notify();
  if (I8.sb) { clearTimeout(pushTimer); pushTimer = setTimeout(() => pushNow(true), 700); }
}

/* ---------------- Supabase cloud sync ----------------
   Config lives in src/js/supabase-config.js (Project URL + anon key).
   Table: public.app_state (see docs/SUPABASE.sql). Falls back to
   localStorage automatically when not configured or offline.        */
const CFG = window.SUPABASE_CONFIG || {};
I8.sb = null;
I8.syncMode = 'local';
let pushTimer = null;
try {
  if ((CFG.url || '').trim() && (CFG.anonKey || '').trim() && window.supabase
      && typeof window.supabase.createClient === 'function') {
    I8.sb = window.supabase.createClient(CFG.url.trim(), CFG.anonKey.trim());
    I8.syncMode = 'connecting';
  }
} catch (e) { I8.sb = null; }

function setSync(mode) {
  I8.syncMode = mode;
  const chip = $('#syncChip'), st = $('#sbStatus');
  const text = {
    cloud: '● Supabase synced', local: '● Local storage',
    connecting: '● Connecting…', error: '● Sync error'
  }[mode] || mode;
  if (chip) {
    chip.textContent = text;
    chip.className = 'chip ghost' + (mode === 'cloud' ? ' ok' : mode === 'error' ? ' bad' : '');
    chip.title = I8.sb ? `Project: ${(CFG.url || '').replace('https://', '')}` : 'No Supabase keys configured yet';
  }
  if (st) { st.textContent = text; st.className = 'chip ghost' + (mode === 'cloud' ? ' ok' : mode === 'error' ? ' bad' : ''); }
}
function logSb(msg) { const el = $('#sbLog'); if (el) el.textContent = msg; }

async function pushNow(silent) {
  if (!I8.sb) { if (!silent) toast('Add Supabase URL + anon key in src/js/supabase-config.js'); return false; }
  try {
    const { error } = await I8.sb.from('app_state').upsert({
      id: 'default', data: I8.db, updated_at: new Date().toISOString()
    });
    if (error) throw error;
    setSync('cloud');
    logSb('Pushed ✓ ' + new Date().toLocaleTimeString());
    if (!silent) toast('Data pushed to Supabase ✓');
    return true;
  } catch (e) {
    setSync('error'); logSb('Push failed: ' + (e.message || e));
    if (!silent) toast('Push failed — ' + (e.message || 'check keys / table'));
    return false;
  }
}
async function pullNow(silent) {
  if (!I8.sb) { if (!silent) toast('Add Supabase URL + anon key in src/js/supabase-config.js'); return false; }
  try {
    const { data, error } = await I8.sb.from('app_state').select('data').eq('id', 'default').maybeSingle();
    if (error) throw error;
    if (!data || !data.data) {
      logSb('Cloud table is empty — pushing the local data as the first backup.');
      return pushNow(silent);
    }
    I8.db = Object.assign(structuredClone(DEFAULTS), data.data);
    try { localStorage.setItem(DB_KEY, JSON.stringify(I8.db)); } catch (e) {}
    setSync('cloud');
    logSb('Pulled ✓ ' + new Date().toLocaleTimeString());
    if (!silent) { I8.notify(); toast('Data pulled from Supabase ✓'); }
    return true;
  } catch (e) {
    setSync('error'); logSb('Pull failed: ' + (e.message || e));
    if (!silent) toast('Pull failed — ' + (e.message || 'run docs/SUPABASE.sql'));
    return false;
  }
}
async function hydrate() {
  if (!I8.sb) { setSync('local'); return; }
  setSync('connecting');
  try {
    const { data, error } = await I8.sb.from('app_state').select('data').eq('id', 'default').maybeSingle();
    if (error) throw error;
    if (data && data.data) {
      I8.db = Object.assign(structuredClone(DEFAULTS), data.data);
      try { localStorage.setItem(DB_KEY, JSON.stringify(I8.db)); } catch (e) {}
      notify();
      logSb('Loaded workspace from Supabase ✓');
    } else {
      await pushNow(true);
      logSb('New workspace created in Supabase ✓');
    }
    setSync('cloud');
  } catch (e) {
    setSync('error');
    logSb('Supabase unreachable — staying on localStorage. ' + (e.message || ''));
  }
}

function seed() {
  const d = structuredClone(DEFAULTS);
  d.business = {
    name:'Ruhi Creative Labs', pan:'BKUPR8842F', gstin:'27BKUPR8842F1Z9',
    state:'Maharashtra', upi:'ruhicreative@okhdfcbank', upiName:'Ruhi Creative Labs',
    email:'hello@ruhicreative.in', phone:'+91 98765 43210',
    addr:'402, Sunrise Apartments, Andheri East, Mumbai 400069', logo:''
  };
  d.clients = [
    { id:uid(), name:'Aarav Studio Pvt Ltd', gstin:'29AAECA1234K1ZP', state:'Karnataka',
      email:'accounts@aaravstudio.in', phone:'+91 90000 11111', addr:'4th Cross, Indiranagar, Bengaluru 560038' },
    { id:uid(), name:'Neha Kulkarni', gstin:'', state:'Maharashtra',
      email:'neha.k@gmail.com', phone:'+91 91234 56780', addr:'Baner, Pune 411045' }
  ];
  const mk = (seq, clientIdx, items, dueOffset, status, createdOffset) => {
    const created = addDays(new Date(), createdOffset);
    return {
      id:uid(), number:'INV-' + seq, date:iso(created), dueDate:iso(addDays(created, dueOffset)),
      clientId:d.clients[clientIdx].id, gstType:'auto', status,
      items, notes:'Thank you for choosing us.', terms:'Payment via UPI to the QR on this invoice.',
      reminders:[], createdAt:created.getTime()
    };
  };
  d.invoices = [
    mk(101, 0, [
      { desc:'Brand identity design', hsn:'998391', qty:1, rate:45000, disc:0, gstRate:18 },
      { desc:'Logo animation (3 loops)', hsn:'998391', qty:3, rate:5000, disc:10, gstRate:18 }
    ], 15, 'SENT', -6),
    mk(102, 1, [
      { desc:'Landing page design', hsn:'998311', qty:1, rate:28000, disc:5, gstRate:18 },
      { desc:'Social media creatives', hsn:'998391', qty:10, rate:800, disc:0, gstRate:18 }
    ], 3, 'SENT', -12),
    mk(103, 0, [
      { desc:'Website development retainer', hsn:'998314', qty:1, rate:60000, disc:0, gstRate:18 }
    ], -4, 'VIEWED', -25)
  ];
  d.settings.next = 104;
  localStorage.setItem(DB_KEY, JSON.stringify(d));
  return d;
}


/* exports */
I8.DEFAULTS = DEFAULTS;
I8.load = load;
I8.save = save;
I8.setSync = setSync;
I8.logSb = logSb;
I8.pushNow = pushNow;
I8.pullNow = pullNow;
I8.hydrate = hydrate;
I8.seed = seed;
I8.subscribe = subscribe;
I8.notify = notify;

})(window.I8 = window.I8 || {});
