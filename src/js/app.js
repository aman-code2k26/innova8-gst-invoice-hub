/* =============================================================
   Innova8 — Micro-SaaS GST Invoice & Payment Link Hub
   BBIT Hackathon 2026 · WEB-06
   FR-1 Client & Business Profile | FR-2 Dynamic Invoice Builder
   FR-3 PDF Generator               | FR-4 UPI QR / Payment Link
   FR-5 Status & Aging Ledger       | FR-6 Reminder Scheduler
   ============================================================= */
(() => {
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

/* ---------------- storage (FR-1 layer) ---------------- */
const DEFAULTS = {
  business: { name:'', pan:'', gstin:'', state:'Maharashtra', upi:'', upiName:'', email:'', phone:'', addr:'', logo:'' },
  settings: { prefix:'INV', next:101, gst:18, hsn:'998391', lut:false },
  clients: [], invoices: [], log: []
};
let db = load();

function load() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return Object.assign(structuredClone(DEFAULTS), JSON.parse(raw));
  } catch (e) { /* corrupted storage → seed fresh */ }
  return seed();
}
function save() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) { /* quota */ }
  if (sb) { clearTimeout(pushTimer); pushTimer = setTimeout(() => pushNow(true), 700); }
}

/* ---------------- Supabase cloud sync ----------------
   Config lives in src/js/supabase-config.js (Project URL + anon key).
   Table: public.app_state (see docs/SUPABASE.sql). Falls back to
   localStorage automatically when not configured or offline.        */
const CFG = window.SUPABASE_CONFIG || {};
let sb = null, syncMode = 'local', pushTimer = null;
try {
  if ((CFG.url || '').trim() && (CFG.anonKey || '').trim() && window.supabase
      && typeof window.supabase.createClient === 'function') {
    sb = window.supabase.createClient(CFG.url.trim(), CFG.anonKey.trim());
    syncMode = 'connecting';
  }
} catch (e) { sb = null; }

function setSync(mode) {
  syncMode = mode;
  const chip = $('#syncChip'), st = $('#sbStatus');
  const text = {
    cloud: '● Supabase synced', local: '● Local storage',
    connecting: '● Connecting…', error: '● Sync error'
  }[mode] || mode;
  if (chip) {
    chip.textContent = text;
    chip.className = 'chip ghost' + (mode === 'cloud' ? ' ok' : mode === 'error' ? ' bad' : '');
    chip.title = sb ? `Project: ${(CFG.url || '').replace('https://', '')}` : 'No Supabase keys configured yet';
  }
  if (st) { st.textContent = text; st.className = 'chip ghost' + (mode === 'cloud' ? ' ok' : mode === 'error' ? ' bad' : ''); }
}
function logSb(msg) { const el = $('#sbLog'); if (el) el.textContent = msg; }

async function pushNow(silent) {
  if (!sb) { if (!silent) toast('Add Supabase URL + anon key in src/js/supabase-config.js'); return false; }
  try {
    const { error } = await sb.from('app_state').upsert({
      id: 'default', data: db, updated_at: new Date().toISOString()
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
  if (!sb) { if (!silent) toast('Add Supabase URL + anon key in src/js/supabase-config.js'); return false; }
  try {
    const { data, error } = await sb.from('app_state').select('data').eq('id', 'default').maybeSingle();
    if (error) throw error;
    if (!data || !data.data) {
      logSb('Cloud table is empty — pushing the local data as the first backup.');
      return pushNow(silent);
    }
    db = Object.assign(structuredClone(DEFAULTS), data.data);
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) {}
    setSync('cloud');
    logSb('Pulled ✓ ' + new Date().toLocaleTimeString());
    if (!silent) { renderAll(); toast('Data pulled from Supabase ✓'); }
    return true;
  } catch (e) {
    setSync('error'); logSb('Pull failed: ' + (e.message || e));
    if (!silent) toast('Pull failed — ' + (e.message || 'run docs/SUPABASE.sql'));
    return false;
  }
}
async function hydrate() {
  if (!sb) { setSync('local'); return; }
  setSync('connecting');
  try {
    const { data, error } = await sb.from('app_state').select('data').eq('id', 'default').maybeSingle();
    if (error) throw error;
    if (data && data.data) {
      db = Object.assign(structuredClone(DEFAULTS), data.data);
      try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) {}
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

/* ---------------- GST engine (FR-2) ---------------- */
function resolveGstType(inv) {
  if (db.settings.lut) return 'lut';
  if (inv.gstType && inv.gstType !== 'auto') return inv.gstType;
  const b = db.business, c = clientById(inv.clientId);
  if (!b.state || !c || !c.state) return 'inter';
  return b.state === c.state ? 'intra' : 'inter';
}
function rateFor(inv, item) {
  const t = resolveGstType(inv);
  return t === 'lut' ? 0 : num(item.gstRate);
}
function calc(inv) {
  let taxable = 0, gst = 0; const byRate = {};
  (inv.items || []).forEach(it => {
    const net = num(it.qty) * num(it.rate) * (1 - num(it.disc) / 100);
    if (!isFinite(net)) return;
    taxable += net;
    const r = rateFor(inv, it), g = net * r / 100;
    gst += g; byRate[r] = (byRate[r] || 0) + g;
  });
  const sub = taxable + gst, total = Math.round(sub);
  return { taxable, gst, byRate, sub, total, roundOff: total - sub, type: resolveGstType(inv) };
}
/* CGST/SGST split for intra-state, IGST for inter-state, nothing for LUT */
function gstBreakdown(t) {
  return Object.entries(t.byRate).flatMap(([r, v]) =>
    t.type === 'intra'
      ? [['CGST @ ' + r + '%', v / 2], ['SGST @ ' + r + '%', v / 2]]
      : [['GST @ ' + r + '%' + (t.type === 'inter' ? ' (IGST)' : ' (LUT)'), v]]);
}

/* ---------------- lookups ---------------- */
const clientById = id => db.clients.find(c => c.id === id);
const invoiceById = id => db.invoices.find(i => i.id === id);

function statusOf(inv) {
  if (inv.status === 'PAID' || inv.status === 'DRAFT') return inv.status;
  if (inv.dueDate && todayISO() > inv.dueDate) return 'OVERDUE';
  return inv.status;
}
function agingDays(inv) {
  const s = statusOf(inv);
  return (s === 'OVERDUE') ? daysBetween(parse(inv.dueDate), parse(todayISO())) : 0;
}

/* ---------------- UPI QR (FR-4) ---------------- */
function upiUrl(inv) {
  const b = db.business;
  if (!b.upi) return '';
  const c = clientById(inv.clientId);
  const p = new URLSearchParams({
    pa: b.upi.trim(),
    pn: (b.upiName || b.name || 'Payee').trim(),
    am: String(Math.max(0, calc(inv).total)),
    cu: 'INR',
    tn: inv.number || 'Invoice'
  });
  return 'upi://pay?' + p.toString();
}
function qrDataUrl(text) {
  return new Promise(res => {
    if (!text) return res('');
    if (typeof QRCode === 'undefined') return res('');
    try {
      QRCode.toDataURL(text, { margin: 1, width: 260, color: { dark: '#101828', light: '#ffffff' } },
        (e, url) => res(e ? '' : url));
    } catch (e) { res(''); }
  });
}

/* ---------------- invoice document (FR-3 preview/print/PDF) ---------------- */
function docHTML(inv, qr) {
  const b = db.business, c = clientById(inv.clientId) || {}, t = calc(inv);

  const breakdown = gstBreakdown(t);

  const rateRows = breakdown.length
    ? breakdown.map(([label, v]) =>
        `<tr><td>${label}</td><td class="num">${inr(v)}</td></tr>`).join('')
    : '<tr><td>No GST applied</td><td class="num">' + inr(0) + '</td></tr>';

  return `
  <div class="doc">
    <div class="doc-top">
      <div>
        ${b.logo ? `<img class="doc-logo" src="${b.logo}" alt="logo">` : ''}
        <div style="font-weight:800;font-size:15px;margin-top:${b.logo ? '8px' : '0'}">${esc(b.name) || 'Your Business'}</div>
        <div class="muted" style="font-size:11.5px;white-space:pre-line">${esc(b.addr)}</div>
        <div class="muted" style="font-size:11.5px">PAN: ${esc(b.pan) || '—'} · GSTIN: ${esc(b.gstin) || '—'}</div>
        <div class="muted" style="font-size:11.5px">${esc(b.email)} · ${esc(b.phone)}</div>
      </div>
      <div style="text-align:right">
        <div class="doc-title">TAX INVOICE</div>
        <div class="muted" style="font-size:11.5px">Original for Recipient</div>
        <div class="doc-meta" style="justify-content:flex-end">
          <div><b>Invoice no.</b>${esc(inv.number)}</div>
          <div><b>Date</b>${prettyDate(inv.date)}</div>
          <div><b>Due</b>${prettyDate(inv.dueDate)}</div>
        </div>
      </div>
    </div>

    <div class="doc-parties">
      <div>
        <h5>Bill to</h5>
        <div style="font-weight:700">${esc(c.name) || '—'}</div>
        <div class="muted" style="white-space:pre-line">${esc(c.addr)}</div>
        <div class="muted">GSTIN: ${esc(c.gstin) || 'Unregistered'} · ${esc(c.state) || ''} (${stateCode(c.state) || '—'})</div>
        <div class="muted">${esc(c.email)} ${c.phone ? '· ' + esc(c.phone) : ''}</div>
      </div>
      <div>
        <h5>Place of supply</h5>
        <div style="font-weight:700">${esc(c.state) || '—'} (${stateCode(c.state) || '—'})</div>
        <div class="muted">Tax: ${t.type === 'intra' ? 'Intra-state — CGST + SGST' : t.type === 'inter' ? 'Inter-state — IGST' : 'Supply under LUT — 0%'}</div>
        <div class="muted">Status: <span class="st st-${statusOf(inv)}">${statusOf(inv)}</span></div>
      </div>
    </div>

    <table>
      <thead><tr>
        <th style="width:34px">#</th><th>Description</th><th>HSN/SAC</th>
        <th class="num">Qty</th><th class="num">Rate</th><th class="num">Disc</th>
        <th class="num">GST</th><th class="num">Amount</th>
      </tr></thead>
      <tbody>
        ${(inv.items || []).map((it, i) => {
          const net = num(it.qty) * num(it.rate) * (1 - num(it.disc) / 100);
          return `<tr><td>${i + 1}</td><td>${esc(it.desc) || 'Item'}</td><td>${esc(it.hsn) || '—'}</td>
            <td class="num">${num(it.qty)}</td><td class="num">${inr(it.rate)}</td>
            <td class="num">${num(it.disc) || 0}%</td><td class="num">${rateFor(inv, it)}%</td>
            <td class="num">${inr(net)}</td></tr>`;
        }).join('') || '<tr><td colspan="8" class="muted">No line items yet</td></tr>'}
      </tbody>
    </table>

    <div class="doc-bottom">
      <div>
        <div class="muted" style="font-size:11.5px"><b>Notes:</b> ${esc(inv.notes) || '—'}</div>
        <div class="muted" style="font-size:11.5px;margin-top:6px"><b>Terms:</b> ${esc(inv.terms) || '—'}</div>
        <div class="legal">
          This is a computer-generated invoice and does not require a physical signature.
          E. &amp; O.E. Goods/Services once delivered are subject to our standard terms.
        </div>
      </div>
      <div>
        <table class="totals">
          <tr><td>Taxable value</td><td>${inr(t.taxable)}</td></tr>
          ${rateRows}
          <tr><td>Round off</td><td>${inr(t.roundOff)}</td></tr>
          <tr class="grand"><td>Grand total</td><td>${inr0(t.total)}</td></tr>
        </table>
        <div class="upi-box" style="margin-top:12px">
          <div class="muted small" style="font-weight:700">SCAN &amp; PAY VIA UPI</div>
          ${qr ? `<img src="${qr}" alt="UPI QR">` : '<div style="height:118px"></div>'}
          <div class="vpa small">${esc(db.business.upi) || 'Add UPI ID in Settings'}</div>
          <div class="muted small">Amount payable: <b>${inr0(t.total)}</b></div>
        </div>
      </div>
    </div>

    <div class="doc-foot">
      <span>${esc(db.business.name)} · ${esc(db.business.phone)}</span>
      <span>${esc(inv.number)} · ${prettyDate(inv.date)}</span>
    </div>
  </div>`;
}

/* ---------------- PDF export (FR-3) ---------------- */
async function exportPDF(inv) {
  const qr = await qrDataUrl(upiUrl(inv));
  const hasJsPDF = typeof window.jspdf !== 'undefined';
  if (!hasJsPDF) { toast('PDF library offline — opening print dialog instead'); return printInvoice(inv, qr); }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const b = db.business, c = clientById(inv.clientId) || {}, t = calc(inv);
  const L = 14, W = 210 - L * 2;
  let y = 16;

  if (b.logo) {
    try { doc.addImage(b.logo, 'PNG', L, 12, 26, 14); y = 30; } catch (e) {}
  }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
  doc.text(b.name || 'Business', L, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(102, 112, 133);
  doc.text(doc.splitTextToSize(b.addr || '', 95), L, y + 5);
  doc.text(`PAN: ${b.pan || '-'}   GSTIN: ${b.gstin || '-'}`, L, y + 16);
  doc.text(`${b.email || ''}  ${b.phone || ''}`, L, y + 20);

  doc.setTextColor(16, 24, 40);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text('TAX INVOICE', 210 - L, y, { align: 'right' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(102, 112, 133);
  doc.text('Original for Recipient', 210 - L, y + 5, { align: 'right' });
  doc.setTextColor(16, 24, 40); doc.setFont('helvetica', 'bold');
  doc.text(`Invoice: ${inv.number}`, 210 - L, y + 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${prettyDate(inv.date)}    Due: ${prettyDate(inv.dueDate)}`, 210 - L, y + 17, { align: 'right' });

  y = Math.max(y + 26, 46);
  doc.setDrawColor(16, 24, 40); doc.setLineWidth(0.5);
  doc.line(L, y, 210 - L, y); y += 7;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(102, 112, 133);
  doc.text('BILL TO', L, y); doc.text('PLACE OF SUPPLY', 118, y);
  y += 4.5;
  doc.setFontSize(10); doc.setTextColor(16, 24, 40); doc.setFont('helvetica', 'bold');
  doc.text(c.name || '-', L, y); doc.text(`${c.state || '-'} (${stateCode(c.state) || '-'})`, 118, y);
  y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(102, 112, 133);
  doc.text(doc.splitTextToSize(c.addr || '', 92), L, y);
  doc.text(`GSTIN: ${c.gstin || 'Unregistered'}`, 118, y);
  doc.text(doc.splitTextToSize(`${c.email || ''} ${c.phone || ''}`, 92), L, y + 9);
  const taxLabel = t.type === 'intra' ? 'Intra-state: CGST + SGST' : t.type === 'inter' ? 'Inter-state: IGST' : 'Supply under LUT (0%)';
  doc.text(taxLabel, 118, y + 5);
  doc.text(`Status: ${statusOf(inv)}`, 118, y + 9);
  y += 18;

  doc.autoTable({
    startY: y, margin: { left: L, right: L },
    head: [['#', 'Description', 'HSN/SAC', 'Qty', 'Rate', 'Disc', 'GST', 'Amount']],
    body: (inv.items || []).map((it, i) => [
      i + 1, it.desc || 'Item', it.hsn || '-', String(num(it.qty)), inr(it.rate),
      (num(it.disc) || 0) + '%', rateFor(inv, it) + '%',
      inr(num(it.qty) * num(it.rate) * (1 - num(it.disc) / 100))
    ]),
    styles: { fontSize: 8.5, cellPadding: 2.2, textColor: [16, 24, 40] },
    headStyles: { fillColor: [242, 244, 247], textColor: [52, 64, 84], fontStyle: 'bold', lineWidth: 0 },
    columnStyles: { 0:{cellWidth:8}, 2:{cellWidth:20}, 3:{cellWidth:13,halign:'right'},
                    4:{cellWidth:22,halign:'right'}, 5:{cellWidth:15,halign:'right'},
                    6:{cellWidth:14,halign:'right'}, 7:{cellWidth:26,halign:'right'} },
    alternateRowStyles: { fillColor: [252, 252, 253] }
  });
  y = doc.lastAutoTable.finalY + 7;

  const txW = 74, tx = 210 - L - txW;
  const rows = [['Taxable value', inr(t.taxable)],
    ...gstBreakdown(t).map(([l, v]) => [l, inr(v)]),
    ['Round off', inr(t.roundOff)]];

  doc.setFontSize(9);
  rows.forEach((r, i) => {
    const yy = y + i * 5;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(102, 112, 133);
    doc.text(r[0], tx + 14, yy, { align: 'right' });
    doc.setTextColor(16, 24, 40);
    doc.text(r[1], tx + txW, yy, { align: 'right' });
  });
  const gy = y + rows.length * 5 + 1;
  doc.setLineWidth(0.5); doc.line(tx, gy, tx + txW, gy);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text('Grand total', tx + 14, gy + 6, { align: 'right' });
  doc.text(inr0(t.total), tx + txW, gy + 6, { align: 'right' });

  if (qr) { try { doc.addImage(qr, 'PNG', tx + 4, gy + 11, 30, 30); } catch (e) {} }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(102, 112, 133);
  doc.text('SCAN & PAY VIA UPI', tx + 42, gy + 18);
  doc.text(db.business.upi || '', tx + 42, gy + 22);
  doc.text('Amount payable: ' + inr0(t.total), tx + 42, gy + 26);

  doc.setFontSize(8);
  const footY = 282;
  doc.setDrawColor(228, 231, 236); doc.line(L, footY - 5, 210 - L, footY - 5);
  doc.text('Notes: ' + (inv.notes || '-'), L, footY);
  doc.text('Terms: ' + (inv.terms || '-'), L, footY + 4);
  doc.text(`${db.business.name} · ${db.business.phone}`, L, footY + 10);
  doc.text(inv.number, 210 - L, footY + 10, { align: 'right' });

  doc.save(`${inv.number}.pdf`);
  toast('PDF downloaded in < 1 sec ✓');
}

function printInvoice(inv, qr) {
  $('#printArea').innerHTML = docHTML(inv, qr || '');
  setTimeout(() => window.print(), 60);
}
async function doPrint(inv) { printInvoice(inv, await qrDataUrl(upiUrl(inv))); }

/* =============================================================
   VIEWS
   ============================================================= */
const VIEWS = {
  dashboard: ['Dashboard', 'Cash-flow at a glance'],
  invoices:  ['Invoices', 'Lifecycle: DRAFT → SENT → VIEWED → PAID → OVERDUE'],
  builder:   ['New invoice', 'Dynamic builder with auto GST · FR-2'],
  clients:   ['Clients', 'Business profile & client address book · FR-1'],
  reminders: ['Reminders', '3 days before · 1 day after due date · FR-6'],
  settings:  ['Settings', 'Brand, GST registration and UPI details · FR-1']
};
function go(view) {
  $$('.view').forEach(v => v.classList.toggle('hidden', v.id !== 'view-' + view));
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  $('#viewTitle').textContent = VIEWS[view][0];
  $('#viewSub').textContent = VIEWS[view][1];
  if (view === 'builder') renderBuilder();
  if (view === 'dashboard') renderDashboard();
  if (view === 'invoices') renderInvoices();
  if (view === 'clients') renderClients();
  if (view === 'reminders') renderReminders();
  if (view === 'settings') renderSettings();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------------- dashboard ---------------- */
function renderDashboard() {
  const live = db.invoices.filter(i => i.status !== 'DRAFT');
  const paid = db.invoices.filter(i => i.status === 'PAID');
  const open = db.invoices.filter(i => i.status !== 'PAID' && i.status !== 'DRAFT');
  const overdue = db.invoices.filter(i => statusOf(i) === 'OVERDUE');
  const sum = arr => arr.reduce((s, i) => s + calc(i).total, 0);

  $('#statGrid').innerHTML = `
    <div class="stat"><div class="k">Total billed</div><div class="v">${inr0(sum(live))}</div>
      <div class="d">${live.length} invoice(s) issued</div></div>
    <div class="stat s2"><div class="k">Collected</div><div class="v">${inr0(sum(paid))}</div>
      <div class="d">${paid.length} paid · ${live.length ? Math.round(sum(paid) / sum(live) * 100) : 0}% collected</div></div>
    <div class="stat s3"><div class="k">Outstanding</div><div class="v">${inr0(sum(open))}</div>
      <div class="d">${open.length} awaiting payment</div></div>
    <div class="stat s4"><div class="k">Overdue</div><div class="v">${inr0(sum(overdue))}</div>
      <div class="d">${overdue.length} past due date</div></div>`;

  const aged = db.invoices.filter(i => ['SENT','VIEWED','PAID'].includes(i.status))
    .sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || '')).slice(0, 6);
  $('#agingTable').innerHTML = aged.length ? `
    <div class="table-wrap"><table>
      <thead><tr><th>Invoice</th><th>Client</th><th>Due</th><th class="num">Amount</th><th>Age</th></tr></thead>
      <tbody>${aged.map(i => {
        const age = agingDays(i);
        return `<tr><td><b>${esc(i.number)}</b></td><td>${esc((clientById(i.clientId) || {}).name || '—')}</td>
        <td>${prettyDate(i.dueDate)}</td><td class="num">${inr0(calc(i).total)}</td>
        <td><span class="age ${age ? 'hot' : ''}">${age ? age + ' days overdue' : statusOf(i) === 'PAID' ? 'Settled' : 'Within terms'}</span></td></tr>`;
      }).join('')}</tbody></table></div>` : emptyBox('No invoices yet', 'Create your first invoice to see the aging ledger.');

  const q = queue();
  $('#dashReminders').innerHTML = q.length ? `<div class="list">${q.slice(0, 4).map(reminderRow).join('')}</div>`
    : emptyBox('Queue is clear', 'No reminders are due right now.');

  const recent = [...db.invoices].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);
  $('#recentTable').innerHTML = recent.length ? `
    <div class="table-wrap"><table>
      <thead><tr><th>Invoice</th><th>Client</th><th>Date</th><th>Status</th><th class="num">Amount</th></tr></thead>
      <tbody>${recent.map(i => `<tr>
        <td><b>${esc(i.number)}</b></td><td>${esc((clientById(i.clientId) || {}).name || '—')}</td>
        <td>${prettyDate(i.date)}</td><td><span class="st st-${statusOf(i)}">${statusOf(i)}</span></td>
        <td class="num">${inr0(calc(i).total)}</td></tr>`).join('')}</tbody></table></div>`
    : emptyBox('Nothing here yet', 'Add a client, then create an invoice.');
}
const emptyBox = (t, s) => `<div class="empty"><b>${t}</b>${s}</div>`;

/* ---------------- invoices list ---------------- */
let invFilter = 'ALL';
function renderInvoices() {
  let list = [...db.invoices].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (invFilter !== 'ALL') list = list.filter(i => statusOf(i) === invFilter);
  $('#invFilterNote').textContent = `${list.length} of ${db.invoices.length} shown`;

  $('#invoiceList').innerHTML = list.length ? `<div class="list">${list.map(inv => {
    const s = statusOf(inv), c = clientById(inv.clientId) || {};
    return `<div class="row-item">
      <div>
        <div class="t">${esc(inv.number)} <span class="st st-${s}">${s}</span>
          ${agingDays(inv) ? `<span class="age hot"> · ${agingDays(inv)}d overdue</span>` : ''}</div>
        <div class="s">${esc(c.name || 'No client')} · due ${prettyDate(inv.dueDate)} · ${(inv.items || []).length} item(s)</div>
      </div>
      <div class="row gap" style="gap:14px">
        <div class="amt">${inr0(calc(inv).total)}</div>
        <div class="acts">
          <button class="btn sm" data-act="view" data-id="${inv.id}">Preview</button>
          <button class="btn sm" data-act="pdf" data-id="${inv.id}">PDF</button>
          <button class="btn sm" data-act="print" data-id="${inv.id}">Print</button>
          ${s !== 'PAID' ? `<button class="btn sm ok" data-act="paid" data-id="${inv.id}">Mark paid</button>` : ''}
          ${s === 'DRAFT' ? `<button class="btn sm" data-act="send" data-id="${inv.id}">Send</button>` : ''}
          ${s !== 'DRAFT' ? `<button class="btn sm" data-act="remind" data-id="${inv.id}">Remind</button>` : ''}
          ${s === 'DRAFT' ? `<button class="btn sm danger" data-act="del" data-id="${inv.id}">Delete</button>` : ''}
        </div>
      </div>
    </div>`;
  }).join('')}</div>` : emptyBox('No invoices in this filter', 'Try another status or create a new invoice.');
}

/* ---------------- builder ---------------- */
let draft = null;

function nextNumber() { return `${db.settings.prefix}-${db.settings.next}`; }

function newDraft() {
  return {
    id: null, number: nextNumber(), date: todayISO(), dueDate: iso(addDays(new Date(), 15)),
    clientId: db.clients[0] ? db.clients[0].id : '', gstType: db.settings.lut ? 'lut' : 'auto',
    status: 'DRAFT', items: [{ desc: '', hsn: db.settings.hsn, qty: 1, rate: '', disc: 0, gstRate: db.settings.gst }],
    notes: 'Thank you for your business!', terms: 'Payment via UPI to the QR on this invoice.',
    reminders: [], createdAt: Date.now()
  };
}

function renderBuilder() {
  if (!draft) draft = newDraft();
  $('#fNumber').value = draft.number || nextNumber();
  $('#fDate').value = draft.date || todayISO();
  $('#fDue').value = draft.dueDate || '';
  $('#fGstType').value = draft.gstType || 'auto';
  $('#fNotes').value = draft.notes || '';
  $('#fTermsText').value = draft.terms || '';

  const sel = $('#fClient');
  sel.innerHTML = db.clients.length
    ? db.clients.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')
    : '<option value="">— add a client first —</option>';
  if (draft.clientId) sel.value = draft.clientId;

  renderItems();
  refreshBuilder();
}

function renderItems() {
  $('#itemsBody').innerHTML = (draft.items || []).map((it, i) => {
    const net = num(it.qty) * num(it.rate) * (1 - num(it.disc) / 100);
    return `<tr>
      <td><input data-i="${i}" data-k="desc" value="${esc(it.desc)}" placeholder="Service description"></td>
      <td><input data-i="${i}" data-k="hsn" value="${esc(it.hsn)}"></td>
      <td><input data-i="${i}" data-k="qty" type="number" min="0" step="0.01" value="${it.qty}"></td>
      <td><input data-i="${i}" data-k="rate" type="number" min="0" step="0.01" value="${it.rate}" placeholder="0.00"></td>
      <td><input data-i="${i}" data-k="disc" type="number" min="0" max="100" step="1" value="${it.disc}"></td>
      <td><select data-i="${i}" data-k="gstRate">${GST_RATES.map(r =>
        `<option value="${r}" ${num(it.gstRate) === r ? 'selected' : ''}>${r}%</option>`).join('')}</select></td>
      <td class="num"><b>${inr(net)}</b></td>
      <td><button class="icon-x" data-del="${i}" title="Remove">✕</button></td>
    </tr>`;
  }).join('');
}

function readBuilder() {
  draft.number = $('#fNumber').value.trim() || nextNumber();
  draft.date = $('#fDate').value;
  draft.dueDate = $('#fDue').value;
  draft.clientId = $('#fClient').value;
  draft.gstType = $('#fGstType').value;
  draft.notes = $('#fNotes') ? $('#fNotes').value : draft.notes;
  draft.terms = $('#fTermsText') ? $('#fTermsText').value : draft.terms;
  return draft;
}

let renderToken = 0;
async function refreshBuilder() {
  const inv = readBuilder();
  const token = ++renderToken;
  const qr = await qrDataUrl(upiUrl(inv));
  if (token !== renderToken) return; // an newer keystroke already re-rendered
  $('#invoicePreview').innerHTML = docHTML(inv, qr);
}

function saveDraft(status) {
  const inv = readBuilder();
  if (!db.clients.length) { toast('Add a client first (FR-1)'); go('clients'); return; }
  if (!inv.items.filter(i => num(i.qty) && num(i.rate)).length) { toast('Add at least one line item'); return; }

  inv.items = inv.items.filter(i => i.desc || num(i.rate));
  inv.status = status || 'DRAFT';
  inv.updatedAt = Date.now();

  const idx = inv.id ? db.invoices.findIndex(i => i.id === inv.id) : -1;
  if (idx >= 0) {
    inv.reminders = db.invoices[idx].reminders || [];
    db.invoices[idx] = inv;
  } else {
    inv.id = uid();
    inv.createdAt = Date.now();
    inv.reminders = [];
    db.invoices.unshift(inv);
    const seq = parseInt(String(inv.number).split('-').pop(), 10);
    if (!isNaN(seq) && seq >= db.settings.next) db.settings.next = seq + 1;
  }
  save();
  draft = inv;
  toast(status === 'SENT' ? 'Saved & marked SENT ✓' : 'Draft saved ✓');
  go('invoices');
}

/* ---------------- clients (FR-1) ---------------- */
function renderClients() {
  $('#clientList').innerHTML = db.clients.length ? `<div class="list">${db.clients.map(c => {
    const used = db.invoices.filter(i => i.clientId === c.id).length;
    return `<div class="row-item">
      <div>
        <div class="t">${esc(c.name)}</div>
        <div class="s">${esc(c.state)} (${stateCode(c.state)}) · GSTIN ${esc(c.gstin) || 'Unregistered'} · ${esc(c.email || 'no email')}</div>
        <div class="s">${esc(c.addr || '')} ${used ? '· ' + used + ' invoice(s)' : ''}</div>
      </div>
      <div class="acts"><button class="btn sm danger" data-cdel="${c.id}">Remove</button></div>
    </div>`;
  }).join('')}</div>` : emptyBox('Address book is empty', 'Add your first client above.');
}

/* ---------------- reminders (FR-6) ---------------- */
function reminderPlan(inv) {
  if (!inv.dueDate || inv.status === 'PAID' || inv.status === 'DRAFT') return [];
  const due = parse(inv.dueDate);
  return [
    { rule:'before', label:'3 days before due date', date: iso(addDays(due, -3)) },
    { rule:'after',  label:'1 day after due date',  date: iso(addDays(due, 1)) }
  ].map(r => {
    const sent = (inv.reminders || []).some(x => x.rule === r.rule);
    const dueNow = todayISO() >= r.date;
    return { ...r, sent, dueNow, state: sent ? 'SENT' : dueNow ? 'DUE' : 'SCHEDULED' };
  });
}
function queue() {
  const out = [];
  db.invoices.forEach(inv => reminderPlan(inv).forEach(p => {
    if (p.state === 'DUE') out.push({ inv, p });
  }));
  return out.sort((a, b) => a.p.date.localeCompare(b.p.date));
}
function reminderRow({ inv, p }) {
  const c = clientById(inv.clientId) || {};
  const late = daysBetween(parse(p.date), parse(todayISO()));
  return `<div class="row-item">
    <div>
      <div class="t">${esc(inv.number)} · ${esc(c.name || '—')}</div>
      <div class="s">${p.label} — scheduled ${prettyDate(p.date)}${late ? ` · ${late} day(s) ago` : ''} · ${inr0(calc(inv).total)}</div>
    </div>
    <div class="acts">
      <button class="btn sm primary" data-remind="${inv.id}" data-rule="${p.rule}">Send reminder</button>
      <button class="btn sm" data-act="view" data-id="${inv.id}">Open</button>
    </div>
  </div>`;
}
function renderReminders() {
  const rules = [
    ['Rule 1', 'Send 3 days before the due date'],
    ['Rule 2', 'Send 1 day after the due date'],
    ['Expiry', 'Auto-stops once the invoice is PAID']
  ];
  $('#ruleSummary').innerHTML = rules.map(r =>
    `<div class="chip">${r[0]}: ${r[1]}</div>`).join('');

  const q = queue();
  $('#reminderList').innerHTML = q.length ? `<div class="list">${q.map(reminderRow).join('')}</div>`
    : emptyBox('Nothing to send', 'All reminders are either scheduled ahead or already sent.');

  const log = [];
  db.invoices.forEach(inv => (inv.reminders || []).forEach(r =>
    log.push({ inv, ...r })));
  log.sort((a, b) => (b.at || 0) - (a.at || 0));
  $('#reminderLog').innerHTML = log.length ? `<div class="table-wrap"><table>
    <thead><tr><th>Invoice</th><th>Client</th><th>Rule</th><th>Sent at</th></tr></thead>
    <tbody>${log.slice(0, 20).map(r => `<tr>
      <td><b>${esc(r.inv.number)}</b></td>
      <td>${esc((clientById(r.inv.clientId) || {}).name || '—')}</td>
      <td>${r.rule === 'before' ? '3 days before' : r.rule === 'after' ? '1 day after' : 'Manual / one-click'}</td>
      <td>${new Date(r.at).toLocaleString('en-IN')}</td></tr>`).join('')}</tbody></table></div>`
    : emptyBox('No reminders sent yet', 'Send one from the queue and it is logged here.');
}

function sendReminder(invId, rule) {
  const inv = invoiceById(invId); if (!inv) return;
  const c = clientById(inv.clientId) || {}, t = calc(inv);
  const kind = statusOf(inv) === 'OVERDUE' ? 'overdue' : 'upcoming';
  const subject = kind === 'overdue'
    ? `Reminder: ${inv.number} is overdue — ${inr0(t.total)} due`
    : `Reminder: ${inv.number} due on ${prettyDate(inv.dueDate)} — ${inr0(t.total)}`;
  const body = [
    `Hi ${c.name || 'there'},`,
    '',
    kind === 'overdue'
      ? `Our invoice ${inv.number} dated ${prettyDate(inv.date)} was due on ${prettyDate(inv.dueDate)} and is now overdue.`
      : `A friendly reminder that invoice ${inv.number} is due on ${prettyDate(inv.dueDate)}.`,
    '',
    `Amount payable: ${inr0(t.total)}`,
    `Pay instantly by opening this link on your phone:`,
    upiUrl(inv) || '(add your UPI ID in Settings)',
    '',
    'You can also scan the UPI QR code attached to the invoice PDF.',
    '',
    `Thanks,`,
    `${db.business.name}`,
    `${db.business.phone} · ${db.business.email}`
  ].join('\n');

  inv.reminders = inv.reminders || [];
  inv.reminders.push({ rule: rule || 'manual', at: Date.now(), to: c.email || '' });
  db.log.push({ invoice: inv.number, at: Date.now() });
  save();

  if (c.email) {
    window.location.href = `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  } else if (navigator.share) {
    navigator.share({ title: subject, text: body }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(body);
    toast('Reminder copied to clipboard (no client email on file)');
    return;
  }
  toast('Reminder logged ✓');
}

/* ---------------- settings ---------------- */
function fillStateSelect(el, value) {
  el.innerHTML = STATES.map(s => `<option value="${s[0]}">${s[0]} (${s[1]})</option>`).join('');
  el.value = value || 'Maharashtra';
}
function renderSettings() {
  const b = db.business, s = db.settings;
  $('#bName').value = b.name; $('#bPan').value = b.pan; $('#bGst').value = b.gstin;
  fillStateSelect($('#bState'), b.state); $('#bCode').value = stateCode(b.state);
  $('#bUpi').value = b.upi; $('#bUpiName').value = b.upiName;
  $('#bEmail').value = b.email; $('#bPhone').value = b.phone; $('#bAddr').value = b.addr;
  $('#sPrefix').value = s.prefix; $('#sNext').value = s.next;
  $('#sGst').value = String(s.gst); $('#sHsn').value = s.hsn; $('#sLut').checked = !!s.lut;
  $('#bizChip').textContent = b.name ? `${b.name} · GSTIN ${b.gstin || '—'}` : 'Set up your business →';
}

/* ---------------- global events ---------------- */
function bind() {
  // nav + quick links
  document.addEventListener('click', e => {
    const nav = e.target.closest('[data-view]');
    if (nav) return go(nav.dataset.view);
    const quick = e.target.closest('[data-go]');
    if (quick) return go(quick.dataset.go);

    // invoice filters
    const pill = e.target.closest('#invFilters .pill');
    if (pill) {
      invFilter = pill.dataset.filter;
      $$('#invFilters .pill').forEach(p => p.classList.toggle('active', p === pill));
      return renderInvoices();
    }

    // invoice actions
    const act = e.target.closest('[data-act]');
    if (act) {
      const inv = invoiceById(act.dataset.id); if (!inv) return;
      switch (act.dataset.act) {
        case 'view':   openPreview(inv); break;
        case 'pdf':    exportPDF(inv); break;
        case 'print':  doPrint(inv); break;
        case 'paid':   inv.status = 'PAID'; save(); toast('Marked PAID ✓'); renderAll(); break;
        case 'send':   inv.status = 'SENT'; save(); toast('Marked SENT ✓'); renderAll(); break;
        case 'remind': sendReminder(inv.id, 'manual'); break;
        case 'del':    db.invoices = db.invoices.filter(i => i.id !== inv.id); save(); toast('Deleted'); renderAll(); break;
      }
      return;
    }

    // reminders
    const rem = e.target.closest('[data-remind]');
    if (rem) return sendReminder(rem.dataset.remind, rem.dataset.rule);

    // client delete
    const cd = e.target.closest('[data-cdel]');
    if (cd) {
      const used = db.invoices.some(i => i.clientId === cd.dataset.cdel);
      if (used) return toast('Client has invoices — remove those first');
      db.clients = db.clients.filter(c => c.id !== cd.dataset.cdel);
      save(); toast('Client removed'); renderClients();
      return;
    }

    // builder: delete line item
    const del = e.target.closest('[data-del]');
    if (del && draft) {
      draft.items.splice(num(del.dataset.del), 1);
      if (!draft.items.length) draft.items.push({ desc:'', hsn: db.settings.hsn, qty:1, rate:'', disc:0, gstRate: db.settings.gst });
      renderItems(); refreshBuilder();
    }
  });

  // builder inputs
  $('#itemsBody').addEventListener('input', e => {
    const el = e.target.closest('[data-k]'); if (!el || !draft) return;
    const i = num(el.dataset.i), k = el.dataset.k;
    draft.items[i][k] = (k === 'desc' || k === 'hsn') ? el.value : el.value;
    const row = el.closest('tr');
    if (row) {
      const it = draft.items[i];
      row.children[6].innerHTML = '<b>' + inr(num(it.qty) * num(it.rate) * (1 - num(it.disc) / 100)) + '</b>';
    }
    refreshBuilder();
  });
  $('#itemsBody').addEventListener('change', e => {
    const el = e.target.closest('[data-k]'); if (!el || !draft) return;
    draft.items[num(el.dataset.i)][el.dataset.k] = el.value;
    refreshBuilder();
  });

  $('#addItem').addEventListener('click', () => {
    draft.items.push({ desc:'', hsn: db.settings.hsn, qty:1, rate:'', disc:0, gstRate: db.settings.gst });
    renderItems(); refreshBuilder();
  });
  ['fNumber','fDate','fDue','fClient','fGstType'].forEach(id =>
    $('#' + id).addEventListener('input', refreshBuilder));
  $('#fGstType').addEventListener('change', refreshBuilder);
  $('#fClient').addEventListener('change', refreshBuilder);
  $('#fDate').addEventListener('change', () => {
    if (!$('#fDue').value) {
      $('#fDue').value = iso(addDays(parse($('#fDate').value || todayISO()), 15));
      refreshBuilder();
    }
  });
  $('#fTerms').addEventListener('change', () => {
    $('#fDue').value = iso(addDays(parse($('#fDate').value || todayISO()), num($('#fTerms').value)));
    refreshBuilder();
  });
  $('#fNotes').addEventListener('input', refreshBuilder);
  $('#fTermsText').addEventListener('input', refreshBuilder);

  $('#saveDraft').addEventListener('click', () => saveDraft('DRAFT'));
  $('#saveSent').addEventListener('click', () => saveDraft('SENT'));
  $('#savePdf').addEventListener('click', async () => { const inv = readBuilder(); await exportPDF(inv); saveDraft('SENT'); });
  $('#btnPdf').addEventListener('click', () => exportPDF(readBuilder()));
  $('#btnPrint').addEventListener('click', () => doPrint(readBuilder()));

  // clients
  $('#cState').addEventListener('change', () => $('#cCode').value = stateCode($('#cState').value));
  $('#addClient').addEventListener('click', () => {
    const name = $('#cName').value.trim();
    if (!name) return toast('Client name is required');
    db.clients.push({
      id: uid(), name, gstin: $('#cGst').value.trim(), state: $('#cState').value,
      email: $('#cEmail').value.trim(), phone: $('#cPhone').value.trim(), addr: $('#cAddr').value.trim()
    });
    save();
    ['cName','cGst','cEmail','cPhone','cAddr'].forEach(i => $('#' + i).value = '');
    toast('Client added ✓'); renderClients();
  });

  // settings
  $('#bState').addEventListener('change', () => $('#bCode').value = stateCode($('#bState').value));
  $('#saveBiz').addEventListener('click', () => {
    Object.assign(db.business, {
      name: $('#bName').value.trim(), pan: $('#bPan').value.trim().toUpperCase(),
      gstin: $('#bGst').value.trim().toUpperCase(), state: $('#bState').value,
      upi: $('#bUpi').value.trim(), upiName: $('#bUpiName').value.trim(),
      email: $('#bEmail').value.trim(), phone: $('#bPhone').value.trim(), addr: $('#bAddr').value.trim()
    });
    save();
    $('#bizSaved').textContent = 'Saved ✓ ' + new Date().toLocaleTimeString();
    $('#bizChip').textContent = `${db.business.name} · GSTIN ${db.business.gstin || '—'}`;
    toast('Business profile saved ✓');
  });
  $('#bLogo').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { db.business.logo = r.result; save(); toast('Logo saved ✓'); refreshBuilder(); };
    r.readAsDataURL(f);
  });
  $('#saveSettings').addEventListener('click', () => {
    Object.assign(db.settings, {
      prefix: $('#sPrefix').value.trim() || 'INV', next: Math.max(1, num($('#sNext').value) || 1),
      gst: num($('#sGst').value), hsn: $('#sHsn').value.trim(), lut: $('#sLut').checked
    });
    save(); toast('Settings saved ✓');
    if (draft) draft.number = nextNumber();
    renderBuilder();
  });
  $('#sbPush').addEventListener('click', () => pushNow(false));
  $('#sbPull').addEventListener('click', () => pullNow(false));
  $('#sbTest').addEventListener('click', async () => {
    if (!sb) { logSb('Not configured — fill in src/js/supabase-config.js and run docs/SUPABASE.sql.'); return; }
    logSb('Testing…');
    try {
      const { error } = await sb.from('app_state').select('id').limit(1);
      if (error) throw error;
      setSync('cloud'); logSb('Connection OK — table "app_state" is reachable ✓');
      toast('Supabase connection OK ✓');
    } catch (e) {
      setSync('error');
      logSb('Failed: ' + (e.message || e) + ' — did you run docs/SUPABASE.sql?');
      toast('Connection failed — check SQL table');
    }
  });

  $('#resetDemo').addEventListener('click', () => {
    if (!confirm('Reset everything back to the demo data?')) return;
    localStorage.removeItem(DB_KEY); db = load(); draft = null;
    if (sb) pushNow(true);
    toast('Demo data restored'); renderAll(); go('dashboard');
  });
  $('#exportJson').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'innova8-backup.json'; a.click();
    URL.revokeObjectURL(a.href);
  });
  $('#importJson').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try { db = Object.assign(structuredClone(DEFAULTS), JSON.parse(r.result)); save(); renderAll(); toast('Backup imported ✓'); }
      catch (err) { toast('Invalid backup file'); }
    };
    r.readAsText(f);
  });

  // keyboard: 1-6 jump between views when not typing
  document.addEventListener('keydown', e => {
    if (/input|textarea|select/i.test(e.target.tagName)) return;
    const map = { 1:'dashboard', 2:'invoices', 3:'builder', 4:'clients', 5:'reminders', 6:'settings' };
    if (map[e.key]) go(map[e.key]);
  });
}

function openPreview(inv) {
  go('builder');
  draft = structuredClone(inv);
  renderBuilder();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderAll() {
  renderDashboard(); renderInvoices(); renderClients(); renderReminders(); renderSettings();
  $('#navInvCount').textContent = db.invoices.length;
  $('#navRemCount').textContent = queue().length;
  $('#navRemCount').style.display = queue().length ? '' : 'none';
}

/* ---------------- boot ---------------- */
async function boot() {
  fillStateSelect($('#cState'), 'Maharashtra');
  $('#cCode').value = stateCode('Maharashtra');
  renderSettings();
  bind();
  await hydrate();          // pull from Supabase (or fall back to localStorage)
  renderAll();
  go('dashboard');
  if (syncMode === 'cloud') toast('Connected to Supabase ✓');
  else if (!db.business.upi) toast('Add your UPI ID in Settings to enable payment QR codes');
}
document.addEventListener('DOMContentLoaded', boot);
})();
