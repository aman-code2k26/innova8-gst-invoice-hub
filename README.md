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
| Frontend | **React 18 + Vite** (source in `app/`, built to static files at the repo root) | Matches the handbook's recommended stack; one component per view |
| Styling | Hand-written CSS design system (`app/src/styles.css`, custom properties, responsive) | No framework weight; full control of the invoice document styling |
| Domain logic | Framework-free JavaScript modules on `window.I8` (`logic/*.js`, classic `<script>` tags) | Keeps GST/PDF/reminder logic testable without the UI framework |
| PDF | **jsPDF 2.5.1** + **jspdf-autotable** (CDN) with a print-to-PDF stylesheet fallback | Client-side generation → milliseconds, meets the "< 1 sec" requirement |
| QR | **qrcode 1.5.3** (CDN) → PNG data URL | Standard `upi://pay` payload, works with every UPI app |
| Database | **Supabase Postgres** (cloud sync) with **localStorage** fallback | Works with or without keys; swap is one config file |
| Supabase client | `@supabase/supabase-js` v2 (UMD via CDN) | Single `<script>`, no bundler |
| Hosting | **GitHub Pages** (live), also Vercel / Netlify / any static server | Free, instant, custom-domain capable |
| Presentation | `slides.html` (6 slides, keyboard nav, print-to-PDF) | No PowerPoint needed |

*The handbook recommends React/Next.js + Supabase and explicitly allows any modern stack: the UI is React,
persistence is Supabase with a localStorage fallback, and there is no server to deploy (see `docs/PLANNING.md` §3).*

---

## Features

**Functional (FR-1 … FR-6)**

| Feature | What it does | Where |
|---|---|---|
| Business profile | Name, address, PAN, GSTIN, state + code, UPI VPA, contact, brand logo | Settings view |
| Client address book | Client GSTIN/state/email/phone, invoice usage counter | Clients view |
| Invoice builder | Line items with HSN/SAC, qty, hourly/fixed rate, discount, per-item GST % | New invoice view |
| **Auto GST engine** | Same state → **CGST + SGST**; other state → **IGST**; LUT toggle → **0 %** | `logic/gst.js` |
| Live preview | Invoice re-renders on every keystroke, QR included | `app/src/views/Builder.jsx` |
| PDF export | Indian tax-invoice layout with logo, parties, HSN, tax split, round-off | `logic/invoice.js` |
| UPI QR + link | `upi://pay?pa&pn&am&cu&tn` with the exact payable amount | `logic/invoice.js` |
| Status lifecycle | `DRAFT → SENT → VIEWED → PAID`, auto **OVERDUE** after due date | `logic/core.js` |
| Aging ledger | Days-overdue per invoice + 4 dashboard KPIs + shareable payment-link card | `views/Dashboard.jsx` |
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
├── index.html                  ← built React app (GitHub Pages entry)
├── assets/                     ← bundled JS + CSS (hashed, generated)
├── logic/                      ← runtime domain modules (generated from app/public/logic)
│   ├── core.js · storage.js · gst.js · invoice.js · reminders.js
│   └── supabase-config.js      ← Project URL + anon key (the only config file)
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
└── app/                        ← React source (Vite)
    ├── package.json · vite.config.js · index.html
    ├── test/smoke.mjs          ← headless boot + click-through test (npm test)
    ├── public/logic/           ← source of truth for ../logic/*.js
    └── src/
        ├── main.jsx            ← loads the logic modules, then mounts React
        ├── App.jsx             ← shell, sidebar, routing, keyboard 1–6, boot
        ├── useI8.js            ← subscribes React to the I8 store
        ├── actions.js          ← shared invoice / client actions
        ├── styles.css          ← design system + print stylesheet
        └── views/              ← Dashboard · Invoices · Builder · Clients · Reminders · Settings
```

**Domain layer — `app/public/logic/*.js` (served from `/logic`, framework-free):**

| File | Responsibilities |
|---|---|
| `core.js` | constants · `esc() · inr() · statusOf() · agingDays() · toast()` |
| `storage.js` | `load() / save() / seed()` (localStorage) · `hydrate() / pushNow() / pullNow()` (Supabase) · `subscribe()` store |
| `gst.js` | `resolveGstType() · rateFor() · calc() · gstBreakdown()` |
| `invoice.js` | `docHTML() · exportPDF() · doPrint()` · `upiUrl() · payLink() · qrDataUrl()` · `newDraft()` |
| `reminders.js` | `reminderPlan() · queue() · sendReminder()` (FR-6) |

**React layer — `app/src/`:**

| File | Responsibilities |
|---|---|
| `App.jsx` | shell, sidebar nav, view routing, keyboard shortcuts, boot (`hydrate()`) |
| `views/Builder.jsx` | line-item editing, live preview, save / PDF / print (FR-2 · FR-3) |
| `views/Dashboard.jsx` | KPIs, aging ledger, reminder queue, payment-link QR card (FR-4 · FR-5) |
| `views/Settings.jsx` | business + invoice settings, Supabase sync, JSON backup |
| `views/Invoices.jsx` · `Clients.jsx` · `Reminders.jsx` | lifecycle actions · address book · FR-6 queue + log |

---

## Quick Start (Local)

**Option A — run the deployed build (no tooling required).**

```bash
git clone https://github.com/aman-code2k26/innova8-gst-invoice-hub.git
cd innova8-gst-invoice-hub
python3 -m http.server 8080      # serves the built app from the repo root
# → http://localhost:8080
```

**Option B — develop (needs Node 18+).**

```bash
cd app
npm install
npm run dev        # Vite dev server with hot reload
npm run build      # writes ../index.html, ../assets and ../logic
npm test           # headless boot + click-through smoke test
npm run verify     # build + test in one go
```

**First run** seeds a demo workspace (see next section). Open **Settings → Reset demo data** to re-seed.

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
file — `app/public/logic/supabase-config.js` (copied to `/logic/supabase-config.js` on every build):

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
After editing the config file run `cd app && npm run build` so the copy served from the site root is refreshed.

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
