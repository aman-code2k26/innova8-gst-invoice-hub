/* =============================================================
   core.js   — constants, DOM/format helpers, lookups, status & aging
   Part of Innova8 (WEB-06) · BBIT Hackathon 2026
   ============================================================= */
(function (I8) {
'use strict';


/* ---------------- constants ---------------- */
const DB_KEY = 'innova8_db_v1';
const GST_RATES = [0, 5, 12, 18, 28];
const STATES = [
  ['Jammu & Kashmir','01'],['Himachal Pradesh','03'],['Punjab','03'],['Chandigarh','04'],
  ['Uttarakhand','05'],['Haryana','06'],['Delhi','07'],['Rajasthan','08'],
  ['Uttar Pradesh','09'],['Bihar','10'],['Sikkim','11'],['Arunachal Pradesh','12'],
  ['Nagaland','13'],['Manipur','14'],['Mizoram','15'],['Tripura','16'],
  ['Meghalaya','17'],['Assam','18'],['West Bengal','19'],['Jharkhand','20'],
  ['Odisha','21'],['Chhattisgarh','22'],['Madhya Pradesh','23'],['Gujarat','24'],
  ['Dadra & Nagar Haveli and Daman & Diu','26'],['Maharashtra','27'],['Karnataka','29'],
  ['Goa','30'],['Lakshadweep','31'],['Kerala','32'],['Tamil Nadu','33'],
  ['Puducherry','34'],['Andaman & Nicobar Islands','35'],['Telangana','36'],
  ['Andhra Pradesh','37'],['Ladakh','38'],['Other Territory','99']
];
const STATUS_FLOW = ['DRAFT','SENT','VIEWED','PAID'];

/* ---------------- helpers ---------------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const num = v => (parseFloat(v) || 0);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const todayISO = () => iso(new Date());
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const parse = s => new Date(s + 'T00:00:00');
const daysBetween = (a, b) => Math.round((b - a) / 864e5);
const inr = n => '₹' + (Math.round((num(n) + Number.EPSILON) * 100) / 100)
  .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inr0 = n => '₹' + Math.round(num(n)).toLocaleString('en-IN');
const prettyDate = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const stateCode = name => (STATES.find(s => s[0] === name) || ['', ''])[1];

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------------- lookups ---------------- */
const clientById = id => I8.db.clients.find(c => c.id === id);
const invoiceById = id => I8.db.invoices.find(i => i.id === id);

function statusOf(inv) {
  if (inv.status === 'PAID' || inv.status === 'DRAFT') return inv.status;
  if (inv.dueDate && todayISO() > inv.dueDate) return 'OVERDUE';
  return inv.status;
}
function agingDays(inv) {
  const s = statusOf(inv);
  return (s === 'OVERDUE') ? daysBetween(parse(inv.dueDate), parse(todayISO())) : 0;
}


/* exports */
I8.DB_KEY = DB_KEY;
I8.GST_RATES = GST_RATES;
I8.STATES = STATES;
I8.STATUS_FLOW = STATUS_FLOW;
I8.$ = $;
I8.$$ = $$;
I8.num = num;
I8.uid = uid;
I8.todayISO = todayISO;
I8.iso = iso;
I8.addDays = addDays;
I8.parse = parse;
I8.daysBetween = daysBetween;
I8.inr = inr;
I8.inr0 = inr0;
I8.prettyDate = prettyDate;
I8.esc = esc;
I8.stateCode = stateCode;
I8.toast = toast;
I8.clientById = clientById;
I8.invoiceById = invoiceById;
I8.statusOf = statusOf;
I8.agingDays = agingDays;

})(window.I8 = window.I8 || {});
