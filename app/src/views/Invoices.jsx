import { useState } from 'react';
import { Empty } from '../components/ui.jsx';
import { invoiceAction, clientName } from '../actions.js';

const FILTERS = ['ALL', 'DRAFT', 'SENT', 'VIEWED', 'PAID', 'OVERDUE'];

export default function Invoices({ openPreview }) {
  const db = I8.db;
  const [filter, setFilter] = useState('ALL');

  let list = [...db.invoices].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (filter !== 'ALL') list = list.filter(i => I8.statusOf(i) === filter);

  const act = (name, inv) => invoiceAction(name, inv, { openPreview });

  return (
    <>
      <div className="toolbar">
        <div className="filters" id="invFilters">
          {FILTERS.map(f => (
            <button key={f} className={'pill' + (filter === f ? ' active' : '')} onClick={() => setFilter(f)}>
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="muted small">{list.length} of {db.invoices.length} shown</div>
      </div>

      <div className="card">
        {list.length ? (
          <div className="list">
            {list.map(inv => {
              const s = I8.statusOf(inv);
              const age = I8.agingDays(inv);
              return (
                <div className="row-item" key={inv.id}>
                  <div>
                    <div className="t">
                      {inv.number} <span className={'st st-' + s}>{s}</span>
                      {age ? <span className="age hot"> · {age}d overdue</span> : ''}
                    </div>
                    <div className="s">
                      {clientName(inv.clientId)} · due {I8.prettyDate(inv.dueDate)} · {(inv.items || []).length} item(s)
                    </div>
                  </div>
                  <div className="row gap" style={{ gap: '14px' }}>
                    <div className="amt">{I8.inr0(I8.calc(inv).total)}</div>
                    <div className="acts">
                      <button className="btn sm" onClick={() => act('view', inv)}>Preview</button>
                      <button className="btn sm" onClick={() => act('pdf', inv)}>PDF</button>
                      <button className="btn sm" onClick={() => act('print', inv)}>Print</button>
                      {s !== 'PAID' && <button className="btn sm ok" onClick={() => act('paid', inv)}>Mark paid</button>}
                      {s === 'DRAFT' && <button className="btn sm" onClick={() => act('send', inv)}>Send</button>}
                      {s !== 'DRAFT' && <button className="btn sm" onClick={() => act('remind', inv)}>Remind</button>}
                      {s === 'DRAFT' && <button className="btn sm danger" onClick={() => act('del', inv)}>Delete</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty title="No invoices in this filter" sub="Try another status or create a new invoice." />
        )}
      </div>
    </>
  );
}
