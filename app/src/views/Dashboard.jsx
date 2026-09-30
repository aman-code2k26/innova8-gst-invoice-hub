import { useEffect, useState } from 'react';
import { Empty } from '../components/ui.jsx';
import { invoiceAction, clientName } from '../actions.js';

/* payment methods a client can scan the QR / open the link with */
const PAY_METHODS = ['UPI', 'GPay', 'PhonePe', 'Paytm'];

export default function Dashboard({ go, openPreview }) {
  const db = I8.db;
  const live = db.invoices.filter(i => i.status !== 'DRAFT');
  const paid = db.invoices.filter(i => i.status === 'PAID');
  const open = db.invoices.filter(i => i.status !== 'PAID' && i.status !== 'DRAFT');
  const overdue = db.invoices.filter(i => I8.statusOf(i) === 'OVERDUE');
  const sum = arr => arr.reduce((s, i) => s + I8.calc(i).total, 0);
  const billed = sum(live);

  const aged = db.invoices
    .filter(i => ['SENT', 'VIEWED', 'PAID'].includes(i.status))
    .sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || ''))
    .slice(0, 6);

  const recent = [...db.invoices]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 5);

  const queue = I8.queue().slice(0, 4);

  return (
    <>
      <div className="stat-grid">
        <div className="stat">
          <div className="k">Total billed</div>
          <div className="v">{I8.inr0(billed)}</div>
          <div className="d">{live.length} invoice(s) issued</div>
        </div>
        <div className="stat s2">
          <div className="k">Collected</div>
          <div className="v">{I8.inr0(sum(paid))}</div>
          <div className="d">
            {paid.length} paid · {billed ? Math.round((sum(paid) / billed) * 100) : 0}% collected
          </div>
        </div>
        <div className="stat s3">
          <div className="k">Outstanding</div>
          <div className="v">{I8.inr0(sum(open))}</div>
          <div className="d">{open.length} awaiting payment</div>
        </div>
        <div className="stat s4">
          <div className="k">Overdue</div>
          <div className="v">{I8.inr0(sum(overdue))}</div>
          <div className="d">{overdue.length} past due date</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-h">
            <h3>
              Aging Ledger <span className="tag">FR-5</span>
            </h3>
            <button className="btn ghost sm" onClick={() => go('invoices')}>View all</button>
          </div>
          {aged.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Client</th>
                    <th>Due</th>
                    <th className="num">Amount</th>
                    <th>Age</th>
                  </tr>
                </thead>
                <tbody>
                  {aged.map(i => {
                    const age = I8.agingDays(i);
                    return (
                      <tr key={i.id}>
                        <td><b>{i.number}</b></td>
                        <td>{clientName(i.clientId)}</td>
                        <td>{I8.prettyDate(i.dueDate)}</td>
                        <td className="num">{I8.inr0(I8.calc(i).total)}</td>
                        <td>
                          <span className={'age' + (age ? ' hot' : '')}>
                            {age ? age + ' days overdue' : I8.statusOf(i) === 'PAID' ? 'Settled' : 'Within terms'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No invoices yet" sub="Create your first invoice to see the aging ledger." />
          )}
        </div>

        <div className="card">
          <div className="card-h">
            <h3>
              Reminder queue <span className="tag">FR-6</span>
            </h3>
            <button className="btn ghost sm" onClick={() => go('reminders')}>Open</button>
          </div>
          {queue.length ? (
            <div className="list">
              {queue.map(({ inv, p }) => (
                <div className="row-item" key={inv.id + p.rule}>
                  <div>
                    <div className="t">{inv.number} · {clientName(inv.clientId)}</div>
                    <div className="s">
                      {p.label} — scheduled {I8.prettyDate(p.date)} · {I8.inr0(I8.calc(inv).total)}
                    </div>
                  </div>
                  <div className="acts">
                    <button className="btn sm primary" onClick={() => invoiceAction('remind', inv)}>Send reminder</button>
                    <button className="btn sm" onClick={() => openPreview(inv)}>Open</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="Queue is clear" sub="No reminders are due right now." />
          )}
        </div>
      </div>

      <PaymentCard invoices={open} />

      <div className="card">
        <div className="card-h"><h3>Recent invoices</h3></div>
        {recent.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(i => (
                  <tr key={i.id}>
                    <td><b>{i.number}</b></td>
                    <td>{clientName(i.clientId)}</td>
                    <td>{I8.prettyDate(i.date)}</td>
                    <td><span className={'st st-' + I8.statusOf(i)}>{I8.statusOf(i)}</span></td>
                    <td className="num">{I8.inr0(I8.calc(i).total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Nothing here yet" sub="Add a client, then create an invoice." />
        )}
      </div>
    </>
  );
}

/* FR-4 — the invoice link that can be shared as-is, plus a scannable UPI QR */
function PaymentCard({ invoices }) {
  const [qr, setQr] = useState(null); // null = generating, '' = unavailable, string = data URL
  const target = invoices[0] || null;
  const hasUpi = !!I8.db.business.upi;
  const link = target && hasUpi ? I8.payLink(I8.calc(target).total, `Payment for ${target.number}`) : '';

  useEffect(() => {
    let alive = true;
    if (!link) { setQr(''); return; }
    setQr(null);
    I8.qrDataUrl(link).then(u => { if (alive) setQr(u); });
    return () => { alive = false; };
  }, [link]);

  if (!hasUpi) {
    return (
      <div className="card">
        <div className="card-h">
          <h3>
            Payment link <span className="tag">FR-4</span>
          </h3>
        </div>
        <Empty
          title="Add your UPI ID"
          sub="Set the UPI VPA in Settings to generate shareable payment links and QR codes."
        />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-h">
        <h3>
          Payment link <span className="tag">FR-4</span>
        </h3>
        {target && <span className="chip ghost">Due for {target.number}</span>}
      </div>

      {target ? (
        <div className="row gap" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div
            style={{
              background: '#fff',
              border: '1px solid var(--line)',
              borderRadius: 12,
              padding: 12,
              textAlign: 'center'
            }}
          >
            {qr === null ? (
              <div style={{ width: 148, height: 148, display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
                generating…
              </div>
            ) : qr ? (
              <img src={qr} alt="UPI QR" style={{ width: 148, height: 148, display: 'block' }} />
            ) : (
              <div
                title="QR unavailable — use the payment link below"
                style={{
                  width: 148, height: 148, display: 'grid', placeItems: 'center',
                  borderRadius: 12, background: 'linear-gradient(135deg,#0b7285,#12b886)', color: '#fff'
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>₹</div>
                  <div style={{ fontSize: 11, letterSpacing: '.14em', marginTop: 4 }}>UPI</div>
                </div>
              </div>
            )}
            <div className="muted small" style={{ marginTop: 6 }}>{I8.inr0(I8.calc(target).total)}</div>
            <div className="row gap" style={{ marginTop: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {PAY_METHODS.map(m => (
                <span className="chip" key={m} style={{ fontSize: 11, padding: '3px 9px' }}>{m}</span>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="row-item" style={{ display: 'block' }}>
              <div className="t">Scan or share this link to get paid</div>
              <div className="s" style={{ wordBreak: 'break-all', marginTop: 6 }}>{link}</div>
              <div className="muted small" style={{ marginTop: 8 }}>
                Client can pay with {PAY_METHODS.slice(1).join(' · ')} or any UPI app
              </div>
              <div className="row gap" style={{ marginTop: 12 }}>
                <button
                  className="btn sm primary"
                  onClick={() => {
                    if (navigator.clipboard) navigator.clipboard.writeText(link);
                    I8.toast('Payment link copied ✓');
                  }}
                >
                  Copy link
                </button>
                <a className="btn sm" href={link} target="_blank" rel="noreferrer">Open in UPI app</a>
                <button className="btn sm ghost" onClick={() => invoiceAction('pdf', target)}>Invoice PDF</button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Empty title="No open invoices" sub="Create an invoice and its payment link appears here." />
      )}
    </div>
  );
}
