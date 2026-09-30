/* Invoice row actions shared by Dashboard, Invoices and Reminders.
   All mutations go through I8.save(), which persists to localStorage and
   notifies React via the store subscription. */
export function invoiceAction(act, inv, ctx = {}) {
  switch (act) {
    case 'view':
      ctx.openPreview && ctx.openPreview(inv);
      break;
    case 'pdf':
      I8.exportPDF(inv);
      break;
    case 'print':
      I8.doPrint(inv);
      break;
    case 'paid':
      inv.status = 'PAID';
      I8.save();
      I8.toast('Marked PAID ✓');
      break;
    case 'send':
      inv.status = 'SENT';
      I8.save();
      I8.toast('Marked SENT ✓');
      break;
    case 'remind':
      I8.sendReminder(inv.id, 'manual');
      break;
    case 'del':
      I8.db.invoices = I8.db.invoices.filter(i => i.id !== inv.id);
      I8.save();
      I8.toast('Deleted');
      break;
    default:
  }
}

export function removeClient(id) {
  if (I8.db.invoices.some(i => i.clientId === id)) {
    I8.toast('Client has invoices — remove those first');
    return false;
  }
  I8.db.clients = I8.db.clients.filter(c => c.id !== id);
  I8.save();
  I8.toast('Client removed');
  return true;
}

export function clientName(id) {
  const c = I8.clientById(id);
  return c ? c.name : '—';
}
