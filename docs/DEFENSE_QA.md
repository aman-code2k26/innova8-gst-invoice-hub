# DEFENSE_QA.md — Innova8 (WEB-06)

Anticipated judge questions with short, honest answers. Keep this open on a second screen during defence.

---

## A. Problem & product

**Q1. Why does a student freelancer need this — can't they use an existing invoice tool?**
Existing tools are built for registered companies, are subscription-priced, and are not Indian-first
(no LUT, no CGST/SGST split, no UPI QR). We target the exact student/gig workflow: set up once,
bill in 30 seconds, get paid by scanning a QR.

**Q2. Who exactly is the user?**
Student freelancers, gig-economy workers, boutique digital agencies, campus consultants — straight from the
handbook's target personas.

**Q3. What is the "micro-SaaS" business model?**
Free for 5 invoices/month → ₹199–499/month unlimited, custom logo, reminders and client portal.
Costs are near zero (static front-end + managed DB), so margins are high.

**Q4. Is this only a college project?**
The flow solves a real cash-flow problem the team itself faces; every feature was needed by a freelancer
at some point in the last semester.

---

## B. Functional requirements (FR-1 … FR-6)

**Q5. Show me where FR-1 lives.**
Settings (business name, PAN, GSTIN, state + code, UPI VPA, contact, logo) and Clients (address book with
GSTIN/state/email). Data persists across reloads via `localStorage`.

**Q6. How does FR-2 decide between CGST+SGST and IGST?**
Auto mode compares the client's state with your registered state:
- Same state → **intra-state** → CGST + SGST (50/50 of the tax)
- Different state → **inter-state** → **IGST**
- Export under **LUT** → 0 % GST (Settings toggle)
You can also force a treatment manually per invoice.

**Q7. What if the client has no GSTIN?**
Allowed — the invoice prints "Unregistered"; GST is still charged to you (B2C), the state decides the split.

**Q8. How exactly is the total calculated?**
`net = qty × rate × (1 − discount%)` per line → sum = taxable value →
`GST = Σ(net × rate%)` at 5/12/18/28 per item → `grand = round(taxable + GST)`,
and the difference is disclosed as **Round off**. Same formula in the preview, the PDF and the QR amount.

**Q9. FR-3 — is the PDF generated client-side? Is it really under 1 second?**
Yes, client-side with jsPDF + autotable; there is no server round-trip, so it completes in milliseconds.
A print-to-PDF stylesheet provides an identical layout with zero dependencies.

**Q10. Does the PDF really contain my logo and the QR?**
Yes — logo upload in Settings is embedded at the top-left of the PDF; the UPI QR (generated from the same
`upi://pay` payload) sits next to the grand total.

**Q11. FR-4 — how does the UPI QR work?**
We build the standard payload `upi://pay?pa=<vpa>&pn=<name>&am=<total>&cu=INR&tn=<invoice no>` and encode it as
a QR. Any UPI app scans it and pre-fills the exact amount — no card, no gateway fees, no bank details shared.

**Q12. FR-5 — how is OVERDUE determined? Is the status stored or derived?**
Base status (DRAFT/SENT/VIEWED/PAID) is stored; OVERDUE is **derived** at render time from
`today > dueDate` for any non-paid, non-draft invoice. Aging = `today − dueDate` in days.

**Q13. Who sets VIEWED?**
Manually in v1 (honest answer). In v2 a hosted public invoice URL records the view — documented in `PROGRESS.md`.

**Q14. FR-6 — are the reminders truly automated?**
The schedule and queue are automatic: a reminder becomes due at **due − 3 days** and again at **due + 1 days**,
and disappears once PAID. Sending is one click (opens a pre-filled email with amount + UPI link).
v2 replaces the click with an email API + cron using the same function.

**Q15. What happens if the client has no email?**
We fall back to the Web Share sheet, then to the clipboard — and always write an audit row into the reminder log.

---

## C. Non-functional & security

**Q16. "Bank-grade encryption" — how do you protect banking details?**
We never store bank credentials: only a UPI VPA (a public payment address) and business contact details.
Everything lives in the browser's `localStorage` and is never transmitted anywhere. The production plan
(Supabase) adds TLS in transit, encryption at rest and row-level security so only the owner reads their rows.
All of this is stated openly rather than over-claimed.

**Q17. Is the GST output compliant with Indian invoicing format?**
It carries the elements a tax invoice needs: seller name/addr/PAN/GSTIN, buyer name/addr/GSTIN, place of supply
with state code, invoice number and dates, item descriptions with HSN/SAC, taxable value, tax split with rates,
grand total, and round-off. We do not claim certification — it is formatted to the standard layout.

**Q18. Performance?**
Everything is in-memory DOM updates; the PDF and QR are generated in milliseconds (< 1 s requirement).
No framework hydration, no API waits.

**Q19. Browser support / offline?**
Chrome, Edge, Safari (desktop). Works offline except for jsPDF (PDF export) and supabase-js (cloud sync only) —
both degrade gracefully (print-to-PDF, localStorage). The QR generator is bundled with the app, so payment links
and QR codes work without internet.

---

## D. Technology

**Q20. The handbook recommends React/Next + Supabase — why didn't you use it?**
The handbook explicitly says the stack is only a recommendation and teams have full technical freedom.
We optimised for demo reliability inside 32 hours: a zero-build static site cannot fail on installs or env keys,
and it deploys to any static host. The storage layer is isolated in `load()/save()`, so swapping in
Supabase is a contained change (documented in `DEPLOYMENT.md` §7).

**Q21. Where is the backend?**
None is required for FR-1…FR-6. The version that needs one (email sending, auth, multi-device sync) is
scoped in `PLANNING.md` and `PROGRESS.md` v2.

**Q22. What libraries did you write vs use?**
We wrote the GST engine, status/aging logic, reminder scheduler, invoice layout and all UI.
We used jsPDF (PDF rendering), jspdf-autotable (tables) and qrcode (QR encoding) — commodity libraries.

**Q23. How is the code organised?**
`app/src/App.jsx` (shell + routing) · `app/src/views/*.jsx` (the six views) · `app/src/styles.css` (design system) ·
`app/public/logic/*.js` (framework-free domain layer: storage → GST engine → invoice/PDF → reminders).
Verified with `cd app && npm run verify`: production build + 25 headless click-through assertions, plus 43
domain assertions on the GST, invoice and reminder maths.

---

## E. Process, team & future

**Q24. How was the work split over 32 hours?**
See `docs/PLANNING.md` §6 milestones and `docs/PROGRESS.md` build log — FR by FR, docs and deck at the end.

**Q25. What did not work / what broke?**
Declared honestly in `PROGRESS.md`: reminders need a click, data is per-browser, VIEWED is manual,
GSTIN format is not checksum-validated. Each has a v2 fix listed.

**Q26. What would you build next, in order?**
1) Supabase auth + RLS, 2) email API + cron for hands-off reminders, 3) public invoice link so VIEWED is real,
4) GSTIN validation + e-invoice/IRN, 5) payment-gateway reconciliation.

**Q27. How do you prove it works right now?**
Live 90-second demo (script in `slides.html` slide 6): flip a client's state → tax changes;
build an invoice → PDF downloads and the QR scans; mark paid → aging updates; send a reminder → it logs.

**Q28. Where is the code and documentation?**
`README.md`, `docs/PLANNING.md`, `docs/PROGRESS.md`, `docs/DEPLOYMENT.md`, `docs/DEFENSE_QA.md`,
plus `slides.html` and `docs/SLIDES.md` for the presentation.
