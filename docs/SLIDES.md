# 6-Slide Deck — Speaker Notes (Slide-wise Explanation)

**Deck file:** `slides.html` → open in any browser.
**Controls:** `→ / Space / PageDown` next · `← / PageUp` back · `P` or the Print button → save as PDF.
**Total time:** ~4 minutes of talking + 90 seconds demo.

> How to use: keep `slides.html` open on the projector, and read/paraphrase the "Say this" block for each slide.
> Each slide also has a "If the judge asks" line so you do not get stuck.

---

## Slide 1 — Title & Problem Statement

**On screen:** Title "Micro-SaaS GST Invoice & Payment Link Hub for Student Freelancers", event tag, Level 2 / 32 hours, and three cards: pain → what we built → why it matters.

**Say this (≈30 sec):**
> "We are Team Innova8, and our problem statement is WEB-06 from the BBIT Hackathon 2026 handbook.
> Student freelancers do real client work but bill them over WhatsApp — no proper invoice, no GST maths,
> no record of who paid. Our product is a micro-SaaS that closes that gap: it creates a GST-compliant invoice,
> turns it into a PDF, embeds a UPI QR so the client can pay instantly, tracks the invoice status, and sends
> follow-up reminders automatically. In short: **billing → PDF → payment → reminder, in one place.**"

**Key numbers to remember:** 6 functional requirements · 32 hours · Level 2 (intermediate) · 5 documentation files.

**If asked "why micro-SaaS?"** → Because it solves one narrow, painful job (freelance invoicing) for a specific
audience (students), and can be charged for later as a monthly plan.

---

## Slide 2 — Target Users, Core Problem & Solution

**On screen:** Left card = the 4 personas, right card = the 4 pain points, bottom = the 6-step flow.

**Say this (≈40 sec):**
> "Our primary users are student freelancers, gig workers, small digital agencies and campus consultants.
> Their core problem is not that they cannot work — it is that they **cannot collect**. Four things break:
> unprofessional invoices, hand-done GST maths, no ledger of unpaid bills, and awkward follow-ups.
> Our solution is a straight six-step flow — set up your profile, build the invoice, get a PDF with a UPI QR,
> send it, get reminded automatically, and mark it paid. That same flow is exactly what we will demo live."

**Emphasise:** the flow bar at the bottom *is* the demo script — tell the judges this so they know what is coming.

**If asked "why not just use an existing invoice app?"** → Existing tools are heavy, paid, or not built for
Indian student freelancers (GST + LUT + UPI in one screen). Ours is free, single-screen, and UPI-first.

---

## Slide 3 — FR-1, FR-2, FR-3 (Setup · Builder · PDF)

**On screen:** Three cards, one per requirement, each with a bullet list and a "Demo:" hint line;
a pill row underneath showing the non-functional requirements.

**Say this (≈45 sec):**
> "Three requirements are about *creating* the invoice.
> **FR-1** — we store your business profile: name, PAN, GSTIN, address, UPI ID, plus a client address book.
> **FR-2** — the dynamic invoice builder: line items with quantity, hourly or fixed rates and discounts.
> The smart part is automatic tax selection — if the client's state is the same as yours we charge **CGST + SGST**,
> if it is a different state we charge **IGST**, and if you export under **LUT** the tax is zero.
> **FR-3** — one click produces a downloadable PDF with your logo, in the Indian tax-invoice format, in under a second.
> And we meet the non-functional bar: GST-compliant layout, sub-second PDF, and banking details stay private."

**Demo pointer:** change the client's state in the builder and watch the tax type flip — that is the "wow" moment.

**If asked "how do you get < 1 second PDF?"** → The PDF is drawn in the browser itself (jsPDF), no server round-trip;
we also provide a print-to-PDF path, which is instant.

---

## Slide 4 — FR-4, FR-5, FR-6 (Payment · Status · Reminders)

**On screen:** Three cards — UPI QR, the DRAFT → SENT → VIEWED → PAID chain, and the reminder rules.

**Say this (≈45 sec):**
> "These three requirements are about *collecting* the money.
> **FR-4** — we generate a dynamic `upi://pay` link carrying the exact invoice amount, and embed it as a QR code
> on the invoice PDF. The client scans it with any UPI app and pays — no card details, no gateway.
> **FR-5** — every invoice moves through DRAFT → SENT → VIEWED → PAID, and automatically flips to **OVERDUE**
> once the due date passes. The dashboard shows an aging ledger with *how many days late* each invoice is.
> **FR-6** — a reminder scheduler queues a follow-up **3 days before** the due date and **1 day after**,
> as a one-click email containing the amount and the UPI link. It stops by itself once the invoice is paid."

**Demo pointer:** Reminders page → queue → "Send reminder" (opens a pre-written email).

**If asked "is the reminder really automated?"** → In this build the *scheduling and queueing* are automatic and the
send is one click; in production we wire it to an email API (Resend/SendGrid) with a cron job — same code path,
just an API call instead of `mailto`.

---

## Slide 5 — Technology & GST Logic

**On screen:** Left = stack table, right = the GST decision diagram + formula list, bottom = page list.

**Say this (≈40 sec):**
> "On technology: the handbook *recommends* React or Next.js with Supabase, and explicitly says teams are free to
> choose any modern stack. We chose a **zero-build single-page app** — HTML, CSS and JavaScript — because it runs
> anywhere with no install, ships fast inside 32 hours, and is trivial to host.
> For PDF we use jsPDF with a print fallback, for the QR we encode the standard UPI payload, and data currently lives
> in the browser with a JSON export/import; the planned upgrade is **Supabase Postgres** with row-level security.
> The logic core is simple: taxable value equals quantity times rate minus discount; GST is applied at 5, 12, 18 or
> 28 percent; the total is rounded to the nearest rupee with the difference shown as round-off — and that final
> amount is exactly what we put inside the UPI QR code."

**Pages of the app:** Dashboard · Invoices · New invoice · Clients · Reminders · Settings (press keys **1–6**).

**If asked "why not Next.js?"** → No requirement forces SSR; our app is fully client-side. We documented the Next.js
migration path in `docs/PLANNING.md`, and the data layer is isolated so swapping localStorage for Supabase is a
one-file change.

---

## Slide 6 — Demo, Documentation & Rubric

**On screen:** Left = 6-step 90-second demo script, right = the 5 required documents, bottom = three rubric cards.

**Say this (≈40 sec):**
> "Here is our 90-second demo: we show the saved business profile, add a client in a different state so the tax flips
> to IGST, build an invoice and watch the totals and QR update live, download and open the PDF, mark it paid to see
> the aging ledger, and finally send a reminder in one click.
> For documentation we are submitting all five required artefacts — README, PLANNING, PROGRESS, DEPLOYMENT and
> DEFENSE_QA.
> On the rubric: **Completeness** because all six functional requirements work end-to-end;
> **UX and Design** because everything updates live on one screen with keyboard shortcuts;
> and **Commercial Viability** because every student freelancer in this room has already faced this exact problem —
> and the natural next step is a freemium plan. Thank you — we are happy to take questions."

**Future scope (say only if asked):** email API for fully automated reminders, Supabase auth + RLS,
payment-gateway reconciliation, e-invoice/IRN, multi-currency.

---

## Quick defence answers (keep in your pocket)

| Likely question | One-line answer |
|---|---|
| Where is the data stored? | Browser `localStorage` today; JSON export/import included; Supabase is the documented next step. |
| Is GST calculation correct? | Intra-state (same state) → CGST+SGST; inter-state → IGST; exports under LUT → 0%. Rates 5/12/18/28 per item. |
| How is the UPI QR built? | Standard `upi://pay?pa=&pn=&am=&cu=INR&tn=` payload encoded as a QR — works with every UPI app. |
| Is it secure? | No bank credentials are stored — only a UPI VPA; production plan adds Supabase RLS + encryption at rest. |
| Why no backend? | Nothing in FR-1…FR-6 needs one yet; adding Express/Supabase changes only the storage module. |
| How long did it take? | Built inside the 32-hour window; see `docs/PROGRESS.md`. |
