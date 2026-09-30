/* =============================================================
   reminders.js — FR-6 reminder rules, queue and one-click email
   Part of Innova8 (WEB-06) · BBIT Hackathon 2026
   ============================================================= */
(function (I8) {
'use strict';

const { addDays, calc, clientById, inr0, invoiceById, iso, parse, prettyDate, save, statusOf, toast, todayISO, upiUrl } = I8;

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
  I8.db.invoices.forEach(inv => reminderPlan(inv).forEach(p => {
    if (p.state === 'DUE') out.push({ inv, p });
  }));
  return out.sort((a, b) => a.p.date.localeCompare(b.p.date));
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
    `${I8.db.business.name}`,
    `${I8.db.business.phone} · ${I8.db.business.email}`
  ].join('\n');

  inv.reminders = inv.reminders || [];
  inv.reminders.push({ rule: rule || 'manual', at: Date.now(), to: c.email || '' });
  I8.db.log.push({ invoice: inv.number, at: Date.now() });
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


/* exports */
I8.reminderPlan = reminderPlan;
I8.queue = queue;
I8.sendReminder = sendReminder;

})(window.I8 = window.I8 || {});
