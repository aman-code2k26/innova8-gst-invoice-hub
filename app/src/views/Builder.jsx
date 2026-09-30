import { useEffect, useMemo, useRef, useState } from 'react';

const GST_OPTIONS = [
  ['auto', 'Auto (intra-state → CGST+SGST / inter-state → IGST)'],
  ['intra', 'Intra-state — CGST + SGST'],
  ['inter', 'Inter-state — IGST'],
  ['lut', 'Export / LUT — 0% GST']
];

const TERMS = [['7', 'Due in 7 days'], ['15', 'Due in 15 days'], ['30', 'Due in 30 days'], ['0', 'Due immediately']];

export default function Builder({ draft, setDraft, go }) {
  const [qr, setQr] = useState('');
  const [term, setTerm] = useState('15');
  const qrToken = useRef(0);

  useEffect(() => {
    if (!draft) setDraft(I8.newDraft());
  }, [draft, setDraft]);

  const up = patch => setDraft(d => (d ? { ...d, ...patch } : d));

  const setItem = (i, k, v) =>
    setDraft(d => ({ ...d, items: d.items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)) }));

  const addItem = () =>
    setDraft(d => ({
      ...d,
      items: [...d.items, { desc: '', hsn: I8.db.settings.hsn, qty: 1, rate: '', disc: 0, gstRate: I8.db.settings.gst }]
    }));

  const delItem = i =>
    setDraft(d => {
      const items = d.items.filter((_, idx) => idx !== i);
      if (!items.length) items.push({ desc: '', hsn: I8.db.settings.hsn, qty: 1, rate: '', disc: 0, gstRate: I8.db.settings.gst });
      return { ...d, items };
    });

  const changeDate = value => {
    if (!draft.dueDate) up({ date: value, dueDate: I8.iso(I8.addDays(I8.parse(value || I8.todayISO()), 15)) });
    else up({ date: value });
  };

  const changeTerm = value => {
    setTerm(value);
    up({ dueDate: I8.iso(I8.addDays(I8.parse(draft.date || I8.todayISO()), I8.num(value))) });
  };

  /* live preview — debounced UPI QR, then the invoice document HTML */
  useEffect(() => {
    if (!draft) return;
    const token = ++qrToken.current;
    const t = setTimeout(() => {
      I8.qrDataUrl(I8.upiUrl(draft)).then(u => {
        if (token === qrToken.current) setQr(u);
      });
    }, 120);
    return () => clearTimeout(t);
  }, [draft]);

  const html = useMemo(() => {
    if (!draft) return '';
    try {
      return I8.docHTML(draft, qr);
    } catch (e) {
      return '';
    }
  }, [draft, qr]);

  if (!draft) return null;

  const save = status => {
    if (!I8.db.clients.length) {
      I8.toast('Add a client first (FR-1)');
      go('clients');
      return;
    }
    if (!draft.items.filter(i => I8.num(i.qty) && I8.num(i.rate)).length) {
      I8.toast('Add at least one line item');
      return;
    }

    const inv = {
      ...draft,
      items: draft.items.filter(i => i.desc || I8.num(i.rate)),
      status: status || 'DRAFT',
      updatedAt: Date.now()
    };

    const idx = inv.id ? I8.db.invoices.findIndex(i => i.id === inv.id) : -1;
    if (idx >= 0) {
      inv.reminders = I8.db.invoices[idx].reminders || [];
      I8.db.invoices[idx] = inv;
    } else {
      inv.id = I8.uid();
      inv.createdAt = Date.now();
      inv.reminders = [];
      I8.db.invoices.unshift(inv);
      const seq = parseInt(String(inv.number).split('-').pop(), 10);
      if (!isNaN(seq) && seq >= I8.db.settings.next) I8.db.settings.next = seq + 1;
    }

    I8.save();
    setDraft(inv);
    I8.toast(status === 'SENT' ? 'Saved & marked SENT ✓' : 'Draft saved ✓');
    go('invoices');
  };

  const savePdf = async () => {
    await I8.exportPDF(draft);
    save('SENT');
  };

  return (
    <div className="builder">
      <div className="card">
        <div className="card-h">
          <h3>
            Invoice details <span className="tag">FR-2</span>
          </h3>
        </div>

        <div className="form-grid">
          <label>Invoice no.
            <input type="text" value={draft.number || ''} onChange={e => up({ number: e.target.value })} />
          </label>
          <label>Invoice date
            <input type="date" value={draft.date || ''} onChange={e => changeDate(e.target.value)} />
          </label>
          <label>Due date
            <input type="date" value={draft.dueDate || ''} onChange={e => up({ dueDate: e.target.value })} />
          </label>
          <label>Client
            <select value={draft.clientId || ''} onChange={e => up({ clientId: e.target.value })}>
              {I8.db.clients.length ? (
                I8.db.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
              ) : (
                <option value="">— add a client first —</option>
              )}
            </select>
          </label>
        </div>

        <div className="form-grid">
          <label>Tax treatment
            <select value={draft.gstType || 'auto'} onChange={e => up({ gstType: e.target.value })}>
              {GST_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label>Payment terms
            <select value={term} onChange={e => changeTerm(e.target.value)}>
              {TERMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>

        <div className="card-sub">Line items</div>
        <div className="table-wrap">
          <table className="items">
            <thead>
              <tr>
                <th style={{ width: '34%' }}>Description</th>
                <th>HSN/SAC</th>
                <th>Qty</th>
                <th>Rate (₹)</th>
                <th>Disc %</th>
                <th>GST %</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {draft.items.map((it, i) => {
                const net = I8.num(it.qty) * I8.num(it.rate) * (1 - I8.num(it.disc) / 100);
                return (
                  <tr key={i}>
                    <td><input value={it.desc} placeholder="Service description" onChange={e => setItem(i, 'desc', e.target.value)} /></td>
                    <td><input value={it.hsn} onChange={e => setItem(i, 'hsn', e.target.value)} /></td>
                    <td><input type="number" min="0" step="0.01" value={it.qty} onChange={e => setItem(i, 'qty', e.target.value)} /></td>
                    <td><input type="number" min="0" step="0.01" value={it.rate} placeholder="0.00" onChange={e => setItem(i, 'rate', e.target.value)} /></td>
                    <td><input type="number" min="0" max="100" step="1" value={it.disc} onChange={e => setItem(i, 'disc', e.target.value)} /></td>
                    <td>
                      <select value={String(it.gstRate)} onChange={e => setItem(i, 'gstRate', e.target.value)}>
                        {I8.GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                      </select>
                    </td>
                    <td className="num"><b>{I8.inr(net)}</b></td>
                    <td><button className="icon-x" title="Remove" onClick={() => delItem(i)}>✕</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button className="btn ghost sm" onClick={addItem}>＋ Add line item</button>

        <div className="form-grid mt">
          <label>Notes
            <textarea rows="2" placeholder="Thanks for your business!" value={draft.notes || ''} onChange={e => up({ notes: e.target.value })} />
          </label>
          <label>Terms
            <textarea rows="2" placeholder="Payment via UPI to the QR on this invoice." value={draft.terms || ''} onChange={e => up({ terms: e.target.value })} />
          </label>
        </div>

        <div className="builder-actions">
          <button className="btn" onClick={() => save('DRAFT')}>Save draft</button>
          <button className="btn" onClick={() => save('SENT')}>Save &amp; mark sent</button>
          <button className="btn primary" onClick={savePdf}>Save &amp; download PDF</button>
        </div>
      </div>

      <div className="preview-col">
        <div className="card preview-card">
          <div className="card-h">
            <h3>
              Live preview <span className="tag">FR-3 · FR-4</span>
            </h3>
            <div className="row gap">
              <button className="btn ghost sm" onClick={() => I8.doPrint(draft)}>Print</button>
              <button className="btn ghost sm" onClick={() => I8.exportPDF(draft)}>PDF</button>
            </div>
          </div>
          <div id="invoicePreview" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
    </div>
  );
}
