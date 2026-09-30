/* =============================================================
   invoice.js — invoice document, UPI QR/payment link, PDF & print, dashboard Payment QR
   Part of Innova8 (WEB-06) · BBIT Hackathon 2026
   ============================================================= */
(function (I8) {
'use strict';

const { $, addDays, calc, clientById, esc, gstBreakdown, inr, inr0, iso, num, prettyDate, rateFor, stateCode, statusOf, toast, todayISO } = I8;

/* FR-4 — build a UPI deep link for an arbitrary amount (dashboard Payment QR) */
function payLink(amount, note) {
  const b = I8.db.business;
  if (!b.upi) return '';
  const p = new URLSearchParams({
    pa: (b.upi || '').trim(),
    pn: (b.upiName || b.name || 'Payee').trim(),
    cu: 'INR',
    tn: note || 'Payment'
  });
  const amt = Math.round((Number(amount) || 0) * 100) / 100;
  if (amt > 0) p.set('am', String(amt));
  return 'upi://pay?' + p.toString();
}
/* ---------------- UPI QR (FR-4) ---------------- */
function upiUrl(inv) {
  const b = I8.db.business;
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
  const b = I8.db.business, c = clientById(inv.clientId) || {}, t = calc(inv);

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
          <div class="vpa small">${esc(I8.db.business.upi) || 'Add UPI ID in Settings'}</div>
          ${qr ? '' : `<div class="vpa small" style="word-break:break-all;opacity:.75">${esc(upiUrl(inv))}</div>`}
          <div class="muted small">Amount payable: <b>${inr0(t.total)}</b></div>
        </div>
      </div>
    </div>

    <div class="doc-foot">
      <span>${esc(I8.db.business.name)} · ${esc(I8.db.business.phone)}</span>
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
  const b = I8.db.business, c = clientById(inv.clientId) || {}, t = calc(inv);
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
  doc.text(I8.db.business.upi || '', tx + 42, gy + 22);
  doc.text('Amount payable: ' + inr0(t.total), tx + 42, gy + 26);

  doc.setFontSize(8);
  const footY = 282;
  doc.setDrawColor(228, 231, 236); doc.line(L, footY - 5, 210 - L, footY - 5);
  doc.text('Notes: ' + (inv.notes || '-'), L, footY);
  doc.text('Terms: ' + (inv.terms || '-'), L, footY + 4);
  doc.text(`${I8.db.business.name} · ${I8.db.business.phone}`, L, footY + 10);
  doc.text(inv.number, 210 - L, footY + 10, { align: 'right' });

  doc.save(`${inv.number}.pdf`);
  toast('PDF downloaded in < 1 sec ✓');
}

function printInvoice(inv, qr) {
  $('#printArea').innerHTML = docHTML(inv, qr || '');
  setTimeout(() => window.print(), 60);
}
async function doPrint(inv) { printInvoice(inv, await qrDataUrl(upiUrl(inv))); }
/* invoice numbering + fresh draft used by the builder */
function nextNumber() {
  return `${I8.db.settings.prefix}-${I8.db.settings.next}`;
}
function newDraft() {
  return {
    id: null, number: nextNumber(), date: todayISO(), dueDate: iso(addDays(new Date(), 15)),
    clientId: I8.db.clients[0] ? I8.db.clients[0].id : '', gstType: I8.db.settings.lut ? 'lut' : 'auto',
    status: 'DRAFT', items: [{ desc: '', hsn: I8.db.settings.hsn, qty: 1, rate: '', disc: 0, gstRate: I8.db.settings.gst }],
    notes: 'Thank you for your business!', terms: 'Payment via UPI to the QR on this invoice.',
    reminders: [], createdAt: Date.now()
  };
}


/* exports */
I8.upiUrl = upiUrl;
I8.payLink = payLink;
I8.qrDataUrl = qrDataUrl;
I8.docHTML = docHTML;
I8.exportPDF = exportPDF;
I8.printInvoice = printInvoice;
I8.doPrint = doPrint;
I8.nextNumber = nextNumber;
I8.newDraft = newDraft;

})(window.I8 = window.I8 || {});
