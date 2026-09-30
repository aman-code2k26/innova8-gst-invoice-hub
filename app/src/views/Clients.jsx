import { useState } from 'react';
import { Empty } from '../components/ui.jsx';
import { removeClient } from '../actions.js';

export default function Clients() {
  const db = I8.db;
  const [form, setForm] = useState({ name: '', gstin: '', state: 'Maharashtra', email: '', phone: '', addr: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const add = () => {
    const name = form.name.trim();
    if (!name) return I8.toast('Client name is required');
    I8.db.clients.push({ id: I8.uid(), ...form, name, gstin: form.gstin.trim(), email: form.email.trim(), phone: form.phone.trim(), addr: form.addr.trim() });
    I8.save();
    setForm({ name: '', gstin: '', state: 'Maharashtra', email: '', phone: '', addr: '' });
    I8.toast('Client added ✓');
  };

  return (
    <>
      <div className="card">
        <div className="card-h">
          <h3>
            Add client <span className="tag">FR-1</span>
          </h3>
        </div>
        <div className="form-grid">
          <label>Client / company name
            <input type="text" placeholder="Aarav Studio" value={form.name} onChange={e => set('name', e.target.value)} />
          </label>
          <label>GSTIN (optional)
            <input type="text" placeholder="27ABCDE1234F1Z5" value={form.gstin} onChange={e => set('gstin', e.target.value)} />
          </label>
          <label>State
            <select value={form.state} onChange={e => set('state', e.target.value)}>
              {I8.STATES.map(([name, code]) => (
                <option key={code} value={name}>{name} ({code})</option>
              ))}
            </select>
          </label>
          <label>State code<input type="text" readOnly value={I8.stateCode(form.state)} /></label>
          <label>Email
            <input type="email" placeholder="client@mail.com" value={form.email} onChange={e => set('email', e.target.value)} />
          </label>
          <label>Phone
            <input type="tel" placeholder="+91 ..." value={form.phone} onChange={e => set('phone', e.target.value)} />
          </label>
          <label className="span2">Address
            <textarea rows="2" placeholder="Street, City, PIN" value={form.addr} onChange={e => set('addr', e.target.value)} />
          </label>
        </div>
        <button className="btn primary" onClick={add}>Add to address book</button>
      </div>

      <div className="card">
        <div className="card-h"><h3>Address book</h3></div>
        {db.clients.length ? (
          <div className="list">
            {db.clients.map(c => {
              const used = db.invoices.filter(i => i.clientId === c.id).length;
              return (
                <div className="row-item" key={c.id}>
                  <div>
                    <div className="t">{c.name}</div>
                    <div className="s">
                      {c.state} ({I8.stateCode(c.state)}) · GSTIN {c.gstin || 'Unregistered'} · {c.email || 'no email'}
                    </div>
                    <div className="s">{c.addr}{used ? ` · ${used} invoice(s)` : ''}</div>
                  </div>
                  <div className="acts">
                    <button className="btn sm danger" onClick={() => removeClient(c.id)}>Remove</button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty title="Address book is empty" sub="Add your first client above." />
        )}
      </div>
    </>
  );
}
