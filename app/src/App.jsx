import { useCallback, useEffect, useReducer, useState } from 'react';
import { useI8 } from './useI8.js';
import Dashboard from './views/Dashboard.jsx';
import Invoices from './views/Invoices.jsx';
import Builder from './views/Builder.jsx';
import Clients from './views/Clients.jsx';
import Reminders from './views/Reminders.jsx';
import Settings from './views/Settings.jsx';

const VIEWS = {
  dashboard: ['Dashboard', 'Cash-flow at a glance'],
  invoices: ['Invoices', 'Lifecycle: DRAFT → SENT → VIEWED → PAID → OVERDUE'],
  builder: ['New invoice', 'Dynamic builder with auto GST · FR-2'],
  clients: ['Clients', 'Business profile & client address book · FR-1'],
  reminders: ['Reminders', '3 days before · 1 day after due date · FR-6'],
  settings: ['Settings', 'Brand, GST registration and UPI details · FR-1']
};

const NAV = [
  ['dashboard', '▦', 'Dashboard'],
  ['invoices', '🧾', 'Invoices'],
  ['builder', '＋', 'New Invoice'],
  ['clients', '👥', 'Clients'],
  ['reminders', '⏰', 'Reminders'],
  ['settings', '⚙', 'Settings']
];

const KEYMAP = { 1: 'dashboard', 2: 'invoices', 3: 'builder', 4: 'clients', 5: 'reminders', 6: 'settings' };

export default function App() {
  const db = useI8();
  const [view, setView] = useState('dashboard');
  const [draft, setDraft] = useState(null);
  const [, force] = useReducer(x => x + 1, 0);

  const go = useCallback(v => {
    setView(v);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openPreview = useCallback(inv => {
    setDraft(structuredClone(inv));
    go('builder');
  }, [go]);

  const startNew = useCallback(() => {
    setDraft(null);
    go('builder');
  }, [go]);

  useEffect(() => {
    let alive = true;
    I8.hydrate().then(() => {
      if (!alive) return;
      force();
      if (I8.syncMode === 'cloud') I8.toast('Connected to Supabase ✓');
      else if (!I8.db.business.upi) I8.toast('Add your UPI ID in Settings to enable payment QR codes');
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onKey = e => {
      if (/input|textarea|select/i.test(e.target.tagName)) return;
      if (KEYMAP[e.key]) go(KEYMAP[e.key]);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go]);

  const remindersDue = I8.queue().length;
  const [title, sub] = VIEWS[view];
  const shared = { go, force, openPreview };

  return (
    <>
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">i8</div>
            <div>
              <div className="brand-name">Innova8</div>
              <div className="brand-sub">GST Invoice Hub</div>
            </div>
          </div>

          <nav className="nav" id="nav">
            {NAV.map(([key, ico, label]) => (
              <button
                key={key}
                className={'nav-btn' + (view === key ? ' active' : '')}
                onClick={() => (key === 'builder' ? startNew() : go(key))}
              >
                <span className="ico">{ico}</span> {label}
                {key === 'invoices' && <span className="badge">{db.invoices.length}</span>}
                {key === 'reminders' && remindersDue > 0 && <span className="badge warn">{remindersDue}</span>}
              </button>
            ))}
          </nav>

          <div className="side-foot">
            <div className="chip">FR-1 … FR-6 mapped</div>
            <div className="muted small">BBIT Hackathon 2026 · WEB-06</div>
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <div>
              <h1>{title}</h1>
              <p className="muted">{sub}</p>
            </div>
            <div className="top-actions">
              <SyncChip />
              <span className="chip ghost" id="bizChip">
                {db.business.name ? `${db.business.name} · GSTIN ${db.business.gstin || '—'}` : 'Set up your business →'}
              </span>
              <button className="btn primary" onClick={startNew}>＋ New invoice</button>
            </div>
          </header>

          <div className="content">
            {view === 'dashboard' && <Dashboard {...shared} />}
            {view === 'invoices' && <Invoices {...shared} />}
            {view === 'builder' && (
              <Builder {...shared} draft={draft} setDraft={setDraft} key={draft && draft.id ? draft.id : 'new'} />
            )}
            {view === 'clients' && <Clients {...shared} />}
            {view === 'reminders' && <Reminders {...shared} />}
            {view === 'settings' && <Settings {...shared} />}
          </div>
        </main>
      </div>

      {/* toast + print target are owned by the domain layer (core.js / invoice.js) */}
      <div id="toast" className="toast" />
      <div id="printArea" className="print-area" />
    </>
  );
}

/* setSync() in storage.js writes the text/colour of this chip imperatively;
   React mirrors I8.syncMode so both stay in agreement. */
function SyncChip() {
  const text = {
    cloud: '● Supabase synced',
    local: '● Local storage',
    connecting: '● Connecting…',
    error: '● Sync error'
  }[I8.syncMode] || I8.syncMode;
  return (
    <span className="chip ghost" id="syncChip" title={I8.sb ? 'Supabase configured' : 'No Supabase keys configured yet'}>
      {text}
    </span>
  );
}
