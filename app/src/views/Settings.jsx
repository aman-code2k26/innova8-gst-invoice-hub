import { useEffect, useState } from 'react';

export default function Settings({ force }) {
  const db = I8.db;
  const [biz, setBiz] = useState(() => ({ ...db.business }));
  const [inv, setInv] = useState(() => ({ ...db.settings }));
  const [savedAt, setSavedAt] = useState('');

  useEffect(() => setBiz({ ...I8.db.business }), [db.business]);
  useEffect(() => setInv({ ...I8.db.settings }), [db.settings]);

  const setB = (k, v) => setBiz(b => ({ ...b, [k]: v }));
  const setS = (k, v) => setInv(s => ({ ...s, [k]: v }));

  const saveBiz = () => {
    Object.assign(I8.db.business, {
      name: biz.name.trim(),
      pan: biz.pan.trim().toUpperCase(),
      gstin: biz.gstin.trim().toUpperCase(),
      state: biz.state,
      upi: biz.upi.trim(),
      upiName: biz.upiName.trim(),
      email: biz.email.trim(),
      phone: biz.phone.trim(),
      addr: biz.addr.trim()
    });
    I8.save();
    setSavedAt('Saved ✓ ' + new Date().toLocaleTimeString());
    I8.toast('Business profile saved ✓');
    force();
  };

  const pickLogo = e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      I8.db.business.logo = r.result;
      I8.save();
      I8.toast('Logo saved ✓');
    };
    r.readAsDataURL(f);
  };

  const saveSettings = () => {
    Object.assign(I8.db.settings, {
      prefix: inv.prefix.trim() || 'INV',
      next: Math.max(1, I8.num(inv.next) || 1),
      gst: I8.num(inv.gst),
      hsn: inv.hsn.trim(),
      lut: !!inv.lut
    });
    I8.save();
    I8.toast('Settings saved ✓');
    force();
  };

  const resetDemo = () => {
    if (!window.confirm('Reset everything back to the demo data?')) return;
    localStorage.removeItem(I8.DB_KEY);
    I8.db = I8.load();
    I8.notify();
    setBiz({ ...I8.db.business });
    setInv({ ...I8.db.settings });
    if (I8.sb) I8.pushNow(true);
    I8.toast('Demo data restored');
    force();
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(I8.db, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'innova8-backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        I8.db = Object.assign(structuredClone(I8.DEFAULTS), JSON.parse(r.result));
        I8.save();
        setBiz({ ...I8.db.business });
        setInv({ ...I8.db.settings });
        I8.toast('Backup imported ✓');
        force();
      } catch (err) {
        I8.toast('Invalid backup file');
      }
    };
    r.readAsText(f);
    e.target.value = '';
  };

  const testConnection = async () => {
    if (!I8.sb) {
      I8.logSb('Not configured — fill in app/public/logic/supabase-config.js and run docs/SUPABASE.sql.');
      force();
      return;
    }
    I8.logSb('Testing…');
    try {
      const { error } = await I8.sb.from('app_state').select('id').limit(1);
      if (error) throw error;
      I8.setSync('cloud');
      I8.logSb('Connection OK — table "app_state" is reachable ✓');
      I8.toast('Supabase connection OK ✓');
    } catch (e) {
      I8.setSync('error');
      I8.logSb('Failed: ' + (e.message || e) + ' — did you run docs/SUPABASE.sql?');
      I8.toast('Connection failed — check SQL table');
    }
    force();
  };

  const syncText = {
    cloud: '● Supabase synced',
    local: '● Local storage',
    connecting: '● Connecting…',
    error: '● Sync error'
  }[I8.syncMode] || I8.syncMode;

  return (
    <>
      <div className="grid-2">
        <div className="card">
          <div className="card-h">
            <h3>
              Business profile <span className="tag">FR-1</span>
            </h3>
          </div>
          <div className="form-grid">
            <label className="span2">Business name
              <input type="text" placeholder="Ruhi Creative Labs" value={biz.name} onChange={e => setB('name', e.target.value)} />
            </label>
            <label>PAN
              <input type="text" placeholder="ABCDE1234F" value={biz.pan} onChange={e => setB('pan', e.target.value)} />
            </label>
            <label>GSTIN
              <input type="text" placeholder="27ABCDE1234F1Z5" value={biz.gstin} onChange={e => setB('gstin', e.target.value)} />
            </label>
            <label>State
              <select value={biz.state} onChange={e => setB('state', e.target.value)}>
                {I8.STATES.map(([name, code]) => (
                  <option key={code} value={name}>{name} ({code})</option>
                ))}
              </select>
            </label>
            <label>State code<input type="text" readOnly value={I8.stateCode(biz.state)} /></label>
            <label>UPI ID (VPA)
              <input type="text" placeholder="name@okhdfcbank" value={biz.upi} onChange={e => setB('upi', e.target.value)} />
            </label>
            <label>Payee name
              <input type="text" placeholder="Name on UPI" value={biz.upiName} onChange={e => setB('upiName', e.target.value)} />
            </label>
            <label>Email
              <input type="email" value={biz.email} onChange={e => setB('email', e.target.value)} />
            </label>
            <label>Phone
              <input type="tel" value={biz.phone} onChange={e => setB('phone', e.target.value)} />
            </label>
            <label className="span2">Address
              <textarea rows="2" value={biz.addr} onChange={e => setB('addr', e.target.value)} />
            </label>
            <label className="span2">Brand logo (PNG/JPG — used on the PDF)
              <input type="file" accept="image/*" onChange={pickLogo} />
            </label>
          </div>
          <div className="row gap">
            <button className="btn primary" onClick={saveBiz}>Save profile</button>
            <span className="muted small">{savedAt}</span>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h3>Invoice settings</h3></div>
          <div className="form-grid">
            <label>Invoice prefix
              <input type="text" placeholder="INV" value={inv.prefix} onChange={e => setS('prefix', e.target.value)} />
            </label>
            <label>Next number
              <input type="number" min="1" value={inv.next} onChange={e => setS('next', e.target.value)} />
            </label>
            <label>Default GST %
              <select value={String(inv.gst)} onChange={e => setS('gst', e.target.value)}>
                {[5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </label>
            <label>Default HSN/SAC
              <input type="text" placeholder="998391" value={inv.hsn} onChange={e => setS('hsn', e.target.value)} />
            </label>
          </div>
          <label className="check">
            <input type="checkbox" checked={!!inv.lut} onChange={e => setS('lut', e.target.checked)} />
            Register under LUT — always bill at 0% GST (exports)
          </label>
          <div className="row gap mt">
            <button className="btn" onClick={saveSettings}>Save settings</button>
            <button className="btn ghost" onClick={resetDemo}>Reset demo data</button>
          </div>

          <div className="card-sub">Security note — non-functional requirement</div>
          <p className="muted small">
            Banking identifiers (UPI VPA, account references) are stored only in your browser's{' '}
            <code>localStorage</code> and never leave this device. For production, move them to Supabase with Row
            Level Security + column-level encryption (AES-256) so only the owner can read them.
          </p>

          <div className="card-sub">Export / import</div>
          <div className="row gap">
            <button className="btn ghost sm" onClick={exportJson}>Export JSON backup</button>
            <label className="btn ghost sm file-btn">
              Import JSON
              <input type="file" accept="application/json" hidden onChange={importJson} />
            </label>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>
            Supabase (cloud sync) <span className="tag">Postgres</span>
          </h3>
          <span className="chip ghost" id="sbStatus">{syncText}</span>
        </div>
        <p className="muted small" id="sbHelp">
          Add your Project URL + anon key in <code>app/public/logic/supabase-config.js</code>, then run{' '}
          <code>docs/SUPABASE.sql</code> in the Supabase SQL Editor. Until then, everything is saved in this browser
          (localStorage).
        </p>
        <div className="row gap wrap">
          <button className="btn sm" onClick={() => { I8.pushNow(false); force(); }}>Push data to Supabase</button>
          <button className="btn sm" onClick={() => { I8.pullNow(false); force(); }}>Pull data from Supabase</button>
          <button className="btn sm ghost" onClick={testConnection}>Test connection</button>
        </div>
        <p className="muted small" id="sbLog" style={{ marginTop: '10px' }} />
      </div>
    </>
  );
}
