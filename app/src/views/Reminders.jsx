import { Empty } from '../components/ui.jsx';
import { invoiceAction, clientName } from '../actions.js';

const RULES = [
  ['Rule 1', 'Send 3 days before the due date'],
  ['Rule 2', 'Send 1 day after the due date'],
  ['Expiry', 'Auto-stops once the invoice is PAID']
];

export default function Reminders({ openPreview }) {
  const db = I8.db;
  const queue = I8.queue();

  const log = [];
  db.invoices.forEach(inv => (inv.reminders || []).forEach(r => log.push({ inv, ...r })));
  log.sort((a, b) => (b.at || 0) - (a.at || 0));

  return (
    <>
      <div className="card soft">
        <div className="card-h">
          <h3>
            Schedule rules <span className="tag">FR-6</span>
          </h3>
        </div>
        <p className="muted">
          A reminder is queued <strong>3 days before the due date</strong> and <strong>1 day after the due date</strong>.
          Paid invoices are removed from the queue automatically.
        </p>
        <div className="row gap wrap">
          {RULES.map(([k, v]) => (
            <div className="chip" key={k}>{k}: {v}</div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-h"><h3>Reminder queue</h3></div>
        {queue.length ? (
          <div className="list">
            {queue.map(({ inv, p }) => {
              const late = I8.daysBetween(I8.parse(p.date), I8.parse(I8.todayISO()));
              return (
                <div className="row-item" key={inv.id + p.rule}>
                  <div>
                    <div className="t">{inv.number} · {clientName(inv.clientId)}</div>
                    <div className="s">
                      {p.label} — scheduled {I8.prettyDate(p.date)}
                      {late ? ` · ${late} day(s) ago` : ''} · {I8.inr0(I8.calc(inv).total)}
                    </div>
                  </div>
                  <div className="acts">
                    <button className="btn sm primary" onClick={() => invoiceAction('remind', inv)}>
                      Send reminder
                    </button>
                    <button className="btn sm" onClick={() => openPreview(inv)}>Open</button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty title="Nothing to send" sub="All reminders are either scheduled ahead or already sent." />
        )}
      </div>

      <div className="card">
        <div className="card-h"><h3>Reminder log</h3></div>
        {log.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Client</th>
                  <th>Rule</th>
                  <th>Sent at</th>
                </tr>
              </thead>
              <tbody>
                {log.slice(0, 20).map((r, i) => (
                  <tr key={r.inv.id + '-' + (r.rule || '') + '-' + i}>
                    <td><b>{r.inv.number}</b></td>
                    <td>{clientName(r.inv.clientId)}</td>
                    <td>
                      {r.rule === 'before' ? '3 days before' : r.rule === 'after' ? '1 day after' : 'Manual / one-click'}
                    </td>
                    <td>{new Date(r.at).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No reminders sent yet" sub="Send one from the queue and it is logged here." />
        )}
      </div>
    </>
  );
}
