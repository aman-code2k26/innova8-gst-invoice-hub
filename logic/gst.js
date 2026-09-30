/* =============================================================
   gst.js     — GST engine: CGST/SGST vs IGST vs LUT, totals, round-off
   Part of Innova8 (WEB-06) · BBIT Hackathon 2026
   ============================================================= */
(function (I8) {
'use strict';

const { clientById, num } = I8;

/* ---------------- GST engine (FR-2) ---------------- */
function resolveGstType(inv) {
  if (I8.db.settings.lut) return 'lut';
  if (inv.gstType && inv.gstType !== 'auto') return inv.gstType;
  const b = I8.db.business, c = clientById(inv.clientId);
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


/* exports */
I8.resolveGstType = resolveGstType;
I8.rateFor = rateFor;
I8.calc = calc;
I8.gstBreakdown = gstBreakdown;

})(window.I8 = window.I8 || {});
