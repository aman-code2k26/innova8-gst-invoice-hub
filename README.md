# Innova8 — GST Invoice & Payment Link Hub

**Micro-SaaS invoicing for student freelancers** — GST-compliant PDF invoices, embedded UPI QR for instant
collection, an invoice status/aging ledger, and an overdue reminder scheduler.

> BBIT Hackathon 2026 · Coders' Club · Track **WEB-06** · Level 2 (Intermediate) · 32 hours
> **Live site:** https://aman-code2k26.github.io/innova8-gst-invoice-hub/

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Features](#features)
4. [Project Structure](#project-structure)
5. [Quick Start (Local)](#quick-start-local)
6. [Seed Accounts / Demo Data](#seed-accounts--demo-data)
7. [Configuration / Environment Variables](#configuration--environment-variables)
8. [API Overview](#api-overview)
9. [Security Notes](#security-notes)
10. [Problem Statement (handbook extract)](#problem-statement-handbook-extract)
11. [Documentation Set](#documentation-set)

---

## Overview

Freelancers earn money but lose it to manual billing: no proper invoice, hand-done GST maths, no record of
who paid, and awkward follow-ups. Innova8 closes that loop in one screen:

**Set up profile → build invoice → PDF + UPI QR → send → auto reminder → paid.**

| | |
|---|---|
| **Problem** | Unprofessional billing, GST errors, unpaid invoices, forgotten follow-ups |
| **Users** | Student freelancers, gig workers, boutique agencies, campus consultants |
| **Solution** | 6-page web app covering FR-1 … FR-6 end-to-end, zero install, works offline |
| **Differentiator** | India-first: CGST+SGST vs IGST auto-switch, LUT (0%), UPI QR on the invoice |
| **Status** | All 6 functional requirements implemented · 5 required docs written · deployed |

**Requirements coverage**

| Req | Requirement | Status |
|---|---|---|
| FR-1 | Client & business profile setup (PAN/GSTIN/UPI/client book) | ✅ |
| FR-2 | Dynamic invoice builder with auto SGST/CGST or IGST | ✅ |
| FR-3 | PDF invoice generator with custom brand logo (< 1 s) | ✅ |
| FR-4 | Integrated UPI QR / payment link embedded on the invoice | ✅ |
| FR-5 | Invoice status & aging ledger (`DRAFT→SENT→VIEWED→PAID→OVERDUE`) | ✅ |
| FR-6 | Overdue reminder scheduler (due−3 days, due+1 day) | ✅ |

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | **HTML + CSS + vanilla JavaScript** (SPA, no build step) | Cannot fail on installs/env during a live demo; deploys to any static host |
| Styling | Hand-written CSS design system (`styles.css`, CSS custom properties, responsive) | No framework weight; full control of the invoice document styling |
| PDF | **jsPDF 2.5.1** + **jspdf-autotable** (CDN) with a print-to-PDF stylesheet fallback | Client-side generation → milliseconds, meets the "< 1 sec" requirement |
| QR | **qrcode 1.5.3** (CDN) → PNG data URL | Standard `upi://pay` payload, works with every UPI app |
| Database | **Supabase Postgres** (cloud sync) with **localStorage** fallback | Works with or without keys; swap is one config file |
| Supabase client | `@supabase/supabase-js` v2 (UMD via CDN) | Single `<script>`, no bundler |
| Hosting | **GitHub Pages** (live), also Vercel / Netlify / any static server | Free, instant, custom-domain capable |
| Presentation | `slides.html` (6 slides, keyboard nav, print-to-PDF) | No PowerPoint needed |

*The handbook recommends React/Next.js + Supabase + Express and explicitly allows any modern stack —
this choice optimises for demo reliability inside a 32-hour window (see `docs/PLANNING.md` §3).*

---

## Features

**Functional (FR-1 … FR-6)**

| Feature | What it does | Where |
|---|---|---|
| Business profile | Name, address, PAN, GSTIN, state + code, UPI VPA, contact, brand logo | Settings view |
| Client address book | Client GSTIN/state/email/phone, invoice usage counter | Clients view |
| Invoice builder | Line items with HSN/SAC, qty, hourly/fixed rate, discount, per-item GST % | New invoice view |
| **Auto GST engine** | Same state → **CGST + SGST**; other state → **IGST**; LUT toggle → **0 %** | `calc()`, `gstBreakdown()` |
| Live preview | Invoice re-renders on every keystroke, QR included | `refreshBuilder()` |
| PDF export | Indian tax-invoice layout with logo, parties, HSN, tax split, round-off | `exportPDF()` / `printInvoice()` |
| UPI QR + link | `upi://pay?pa&pn&am&cu&tn` with the exact payable amount | `upiUrl()`, `qrDataUrl()` |
| Status lifecycle | `DRAFT → SENT → VIEWED → PAID`, auto **OVERDUE** after due date | `statusOf()` |
| Aging ledger | Days-overdue per invoice + 4 dashboard KPIs | Dashboard view |
| Reminder scheduler | Queue at **due−3 days** and **due+1 day**, stops once PAID, one-click email with amount + UPI link, audit log | Reminders view |
| JSON backup | Export / import the whole workspace | Settings view |

**UX**

- 6 views: Dashboard · Invoices · New invoice · Clients · Reminders · Settings
- Keyboard shortcuts **`1`–`6`** jump between views (great for live demos)
- Status filter pills, empty-state guidance, toast feedback
- Responsive down to mobile widths; print stylesheet for a pixel-perfect paper copy

---

## Project Structure

```
innova8-gst-invoice-hub/
├── index.html                  ← landing redirect → src/index.html (GitHub Pages entry)
├── slides.html                 ← 6-slide deck (← → keys, P = print)
├── README.md                   ← this file
├── .gitignore
├── 095a88d4-…jpg               ← original problem-statement photo (handbook)
├── docs/
│   ├── PLANNING.md             ← scope, architecture, milestones, risks
│   ├── PROGRESS.md             ← build log + FR status board
│   ├── DEPLOYMENT.md           ← local run + GitHub Pages / Vercel / Netlify
│   ├── DEFENSE_QA.md           ← judge Q&A
│   ├── SLIDES.md               ← slide-by-slide speaker notes
│   ├── SUPABASE.md             ← 4-minute Supabase setup guide
│   └── SUPABASE.sql            ← schema: app_state + RLS + trigger
└── src/
    ├── index.html              ← the application (open this)
    ├── css/styles.css          ← design system + print stylesheet
    └── js/
        ├── app.js              ← all business logic (FR-1 … FR-6)
        └── supabase-config.js  ← Project URL + anon key (the only config file)
```

**Code map inside `src/js/app.js` (single module, ~950 lines):**

| Section | Responsibilities |
|---|---|
| Storage | `load() / save() / seed()` (localStorage) · `hydrate() / pushNow() / pullNow()` (Supabase) |
| GST engine | `resolveGstType() · rateFor() · calc() · gstBreakdown()` |
| Document | `docHTML()` (preview + print) · `exportPDF()` (jsPDF) · `doPrint()` |
| Payments | `upiUrl() · qrDataUrl()` |
| Ledger | `statusOf() · agingDays() · renderDashboard()` |
| Reminders | `reminderPlan() · queue() · sendReminder()` |
| UI | `go() · render*() · bind()` (event delegation, keys 1–6) |

---

## Quick Start (Local)

**No install, no build, no accounts required.**

```bash
git clone https://github.com/aman-code2k26/innova8-gst-invoice-hub.git
cd innova8-gst-invoice-hub
open src/index.html            # macOS  (double-clicking also works)
```

Prefer a local server (avoids any `file://` CDN restrictions):

```bash
cd src && python3 -m http.server 8080
# → http://localhost:8080
```

Or with Node:

```bash
npx serve src
```

**First run** seeds a demo workspace (see next section). Open **Settings → Reset demo data** to re-seed.

**Live site:** https://aman-code2k26.github.io/innova8-gst-invoice-hub/

> Internet is needed only for the 3 CDN libraries (jsPDF, qrcode, supabase-js).
> If they are blocked, the app still works: PDF falls back to the browser print dialog
> and the QR area shows a copyable `upi://` link.

---

## Seed Accounts / Demo Data

There are **no login accounts** — v1 is a single-user app (auth is listed as the first v2 task).
Instead, the first launch auto-seeds a complete workspace so every feature is demoable in seconds.

**Seeded business profile (Settings)**

| Field | Value |
|---|---|
| Business name | Ruhi Creative Labs |
| PAN / GSTIN | `BKUPR8842F` / `27BKUPR8842F1Z9` |
| State | Maharashtra (`27`) |
| UPI VPA | `ruhicreative@okhdfcbank` |
| Email / Phone | hello@ruhicreative.in / +91 98765 43210 |

**Seeded clients (address book)**

| Client | State | Purpose in the demo |
|---|---|---|
| Aarav Studio Pvt Ltd | Karnataka (`29`) | Inter-state → triggers **IGST** |
| Neha Kulkarni | Maharashtra (`27`) | Same state → triggers **CGST + SGST** |

**Seeded invoices**

| Invoice | Client | Status | Why it is there |
|---|---|---|---|
| INV-101 | Aarav Studio | SENT | Two line items + 10 % discount → IGST maths |
| INV-102 | Neha Kulkarni | SENT | Due in 3 days → sits in the reminder queue |
| INV-103 | Aarav Studio | VIEWED → **OVERDUE** | Due 4 days ago → shows the aging ledger |

**Reset:** Settings → **Reset demo data** (re-seeds and re-pushes to Supabase if connected).
**Clear everything:** export a JSON backup first, then reset and delete unwanted records.

---

## Configuration / Environment Variables

The app is a static site, so there are **no server-side environment variables**. All configuration is in one
file — `src/js/supabase-config.js`:

```js
window.SUPABASE_CONFIG = {
  url:     'https://kodnexxyvounongdwcry.supabase.co',   // Project → Settings → API → Project URL
  anonKey: ''                                           // Project → Settings → API → anon public
};
```

| Key | Required | Default if empty | Where to get it |
|---|---|---|---|
| `url` | for cloud sync | app runs on `localStorage` | Supabase → Settings → API → **Project URL** |
| `anonKey` | for cloud sync | app runs on `localStorage` | Supabase → Settings → API → **anon / public** key |

**In-app settings** (stored with your data, not in code): invoice prefix, next number, default GST %,
default HSN/SAC, LUT toggle, brand logo, UPI VPA.

**SQL setup:** run `docs/SUPABASE.sql` once in the Supabase SQL Editor — see `docs/SUPABASE.md`.

**If you migrate to Next.js / Vercel later**, the same two values become:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://kodnexxyvounongdwcry.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Nothing else is required — no API keys, no tokens, no secrets are committed to this repository.

---

## API Overview

### 1. Supabase REST (the only backend API used)

Table: **`public.app_state`** — one row (`id = 'default'`) holding the whole workspace as JSON.

| Operation | When | Supabase call |
|---|---|---|
| Load | App boot (`hydrate()`) | `select('data').eq('id','default').maybeSingle()` |
| Save | 700 ms after any change (`save()` → debounced `pushNow()`) | `upsert({ id:'default', data, updated_at })` |
| Test | Settings → **Test connection** | `select('id').limit(1)` |
| Manual push/pull | Settings → Push / Pull buttons | same as above |

Example call (what supabase-js sends):

```http
GET /rest/v1/app_state?id=eq.default&select=data
apikey: <anon key>
```

Each request must carry the `apikey` header — a missing key returns `401 No API key found in request`.

### 2. UPI deep link (FR-4, no server involved)

```text
upi://pay?pa=<vpa>&pn=<payee>&am=<total>&cu=INR&tn=<invoice no>
```

| Param | Meaning | Example |
|---|---|---|
| `pa` | Payee address (VPA) | `ruhicreative@okhdfcbank` |
| `pn` | Payee name | `Ruhi Creative Labs` |
| `am` | Amount, exact invoice total | `54000` |
| `cu` | Currency | `INR` |
| `tn` | Transaction note | `INV-101` |

Encoded as a QR (PNG data URL) → rendered in the preview, the print view **and** the PDF.

### 3. External libraries (CDN, load-time only)

`jspdf@2.5.1` · `jspdf-autotable@3.8.2` · `qrcode@1.5.3` · `@supabase/supabase-js@2.45.4`

### 4. Graceful degradation

| Failure | Behaviour |
|---|---|
| No Supabase keys / table missing | `● Local storage` chip; full functionality on localStorage |
| Supabase unreachable | Error chip + message; local data kept, retried on next edit |
| jsPDF CDN blocked | Automatic fallback to print-to-PDF |
| QR library blocked | QR area shows the copyable `upi://` link |

---

## Security Notes

**What is stored:** business name, address, PAN/GSTIN, contact details, client list, invoices, and a
**UPI VPA** (a public payment address). **No bank credentials, no passwords, no card data are ever stored.**

1. **API keys**
   - Only the **`anon` public** key ships in the front end — by design it can do nothing except what
     Row Level Security allows.
   - The **`service_role`** key must never appear in this repository, in config, or in the browser.

2. **Row Level Security** — enabled on `public.app_state` in `docs/SUPABASE.sql`.
   - Demo policy: `using (true) with check (true)` so the app works without login (single shared demo row).
   - Production policy (commented in the SQL file): `owner_id = auth.uid()` with Supabase Auth enabled.
   - Because RLS is on, a leaked anon key cannot read anything until a policy permits it.

3. **Transport & storage** — HTTPS/TLS on every Supabase request; Postgres data is encrypted at rest
   (Supabase default). Without keys configured, data never leaves the device (`localStorage` only).

4. **XSS** — every user-supplied string rendered into the DOM goes through `esc()` (HTML-entity escaping);
   no `innerHTML` is fed raw user input. Logo is stored as a data URL, not fetched from arbitrary origins.

5. **Dependency surface** — 4 well-known CDN libraries, pinned to exact versions, with code-level
   fallbacks if any of them fail to load. No analytics, no trackers, no third-party cookies.

6. **Reminders** — use `mailto:` with an encoded subject/body (never raw shell/email headers);
   fallback chain is Web Share → clipboard. No server-side mail relay is running, so no mail credentials exist.

7. **Before production (checklist)**
   - [ ] Enable Supabase Auth and switch to the `owner_id = auth.uid()` policy
   - [ ] Remove the demo `using (true)` policy
   - [ ] Add CSP headers on the host and self-host the CDN libraries
   - [ ] Validate GSTIN/PAN formats and add rate limiting once an email API exists
   - [ ] Rotate the anon key if this repository was ever public with a key inside (it is not)

---

## Problem Statement (handbook extract)

| Field | Value |
|---|---|
| Code | WEB-06 · Micro-SaaS GST Invoice & Payment Link Hub for Student Freelancers |
| Level | 2 — Intermediate (2nd year recommended) · 32 hours |
| Context | Students freelance but bill manually: no professional PDFs, GST/LUT maths by hand, unpaid invoices, no follow-ups |
| Non-functional | Indian GST invoicing format · PDF < 1 sec · bank-grade protection of sensitive banking details |
| Required docs | `README.md`, `docs/PLANNING.md`, `docs/PROGRESS.md`, `docs/DEPLOYMENT.md`, `docs/DEFENSE_QA.md` |
| Rubric | Completeness · UX & Design · Commercial Viability |
| Recommended stack | React/Next.js + Tailwind · `@react-pdf/renderer`/jsPDF · Node Express · PostgreSQL (Supabase) · Vercel — *recommendation only; full technical freedom* |

---

## Documentation Set

| File | Contents |
|---|---|
| `docs/PLANNING.md` | Scope, architecture decision, data model, GST rules, 32-hour milestones, risks |
| `docs/PROGRESS.md` | FR status board, hour-by-hour build log, known limitations, v2 backlog |
| `docs/DEPLOYMENT.md` | Local run, GitHub Pages / Vercel / Netlify, pre-deploy checklist, backend upgrade path |
| `docs/DEFENSE_QA.md` | 28 anticipated judge questions with honest answers |
| `docs/SLIDES.md` | Speaker notes for all 6 slides + pocket Q&A |
| `docs/SUPABASE.md` | 4-minute Supabase connection guide + troubleshooting |
| `docs/SUPABASE.sql` | `app_state` table, index, RLS policies, `updated_at` trigger |

**Presentation:** open `slides.html` → `←`/`→` to navigate, `P` to print 6 pages to PDF.
