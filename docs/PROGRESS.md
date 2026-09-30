# PROGRESS.md — Innova8 (WEB-06)

Live log of what was built, in build order. Tick = demoable.

## Status board

| Req | Title | Status | Where |
|---|---|---|---|
| FR-1 | Client & business profile setup | ✅ Done | `src/js/app.js` → `renderSettings()`, `renderClients()` |
| FR-2 | Dynamic invoice builder + auto GST | ✅ Done | `renderBuilder()`, `calc()`, `gstBreakdown()` |
| FR-3 | PDF invoice generator with logo | ✅ Done | `exportPDF()`, `printInvoice()` |
| FR-4 | UPI QR / payment link | ✅ Done | `upiUrl()`, `qrDataUrl()` |
| FR-5 | Status & aging ledger | ✅ Done | `statusOf()`, `agingDays()`, Dashboard |
| FR-6 | Overdue reminder scheduler | ✅ Done | `reminderPlan()`, `queue()`, `sendReminder()` |
| Docs | 5 documentation artefacts | ✅ Done | `README.md`, `docs/*` |
| — | 6-slide deck + speaker notes | ✅ Done | `slides.html`, `docs/SLIDES.md` |

## Build log

### Hour 0–3 · Discovery
- Read the handbook page (WEB-06), split it into FR-1…FR-6 + non-functional + docs.
- Chose a zero-build SPA so the demo can never fail on infrastructure.
- Output: `README.md` (problem extraction), `docs/PLANNING.md`.

### Hour 3–8 · FR-1 profile & storage
- `localStorage` layer (`load/save/seed`) with a JSON export/import path.
- Settings form: business name, PAN, GSTIN, state (+ auto state code), UPI VPA, contact, logo upload.
- Clients address book with GSTIN/state/email and usage counter.
- Seeded demo data: 1 business, 2 clients, 3 invoices.

### Hour 8–15 · FR-2 builder + GST engine
- Line-item table (description, HSN/SAC, qty, rate, discount, GST %), add/remove rows, live row totals.
- Tax resolver: LUT → 0 %, explicit override, auto (same state ⇒ CGST+SGST, else IGST).
- Live invoice preview re-rendered on every keystroke with a render token to kill stale updates.
- Payment-terms selector auto-sets the due date (0/7/15/30 days).

### Hour 15–19 · FR-3 PDF
- jsPDF + autotable layout: header with logo, parties, item table, tax breakdown, round-off, footer notes.
- Print stylesheet for a pixel-identical "Save as PDF" path (< 1 s, no library needed).
- Fallback: if the PDF CDN is unavailable the app automatically opens the print dialog.

### Hour 19–22 · FR-4 UPI QR
- `upi://pay?pa&pn&am&cu&tn` payload built from the invoice total.
- QR rendered to a data URL → embedded in the preview, the print view and the PDF.
- Placeholder guidance when no VPA is configured yet.

### Hour 22–26 · FR-5 status & aging
- Status badges across the app, filter pills (All/Draft/Sent/Viewed/Paid/Overdue).
- Derived OVERDUE state, days-late column, dashboard KPIs (billed / collected / outstanding / overdue).

### Hour 26–29 · FR-6 reminders
- Rules: due−3 days and due+1 days; queue shows only what is actually due; PAID invoices exit the queue.
- One-click reminder builds a subject + body with amount and UPI link, opens the mail client,
  falls back to Web Share / clipboard, and writes an audit entry to the reminder log.

### Hour 29–32 · QA, docs, deck
- Syntax check on `app.js`, cross-checked every `$('#id')` against `index.html` (0 missing).
- Wrote `docs/DEPLOYMENT.md`, `docs/DEFENSE_QA.md`, `slides.html` (6 slides) and `docs/SLIDES.md`.

## Known limitations (declared honestly)
1. Reminders are *scheduled automatically* but sent on click (no server cron yet) — v2 wires an email API.
2. Data is per-browser (`localStorage`); Supabase/Postgres is the documented next step.
3. "VIEWED" is set manually — opening a real link would need a hosted invoice page.
4. PAN/GSTIN are stored as text; format validation is not enforced yet.

## Next sprint (v2)
- Supabase auth + Postgres with row-level security (owner-only rows).
- Resend/SendGrid + cron for fully hands-off reminders.
- Public invoice URL so `VIEWED` becomes real, with a "pay now" button.
- GSTIN checksum validation, e-invoice/IRN, multi-currency.
