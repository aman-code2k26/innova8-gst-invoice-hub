# WEB-06 — Micro-SaaS GST Invoice & Payment Link Hub for Student Freelancers

> Source: `095a88d4-5da8-4e2f-85cf-98a86bf17b32.jpg` — BBIT HACKATHON 2026 — CODERS' CLUB OFFICIAL HANDBOOK

---

## 1. Problem Statement (what the page says)

| Field | Value |
|---|---|
| Code | **WEB-06** |
| Title | Micro-SaaS GST Invoice & Payment Link Hub for Student Freelancers |
| Level | **Level 2 — Intermediate** (2nd year recommended) |
| Timebox | **32 hours** |
| Rubric focus | Completeness, UX & Design, Commercial Viability |

### 1.1 Real-world context & resume value
Student developers and designers doing freelance work struggle with:

- billing clients professionally
- tracking unpaid invoices
- calculating Indian **GST** or **LUT** exemptions
- following up on overdue payments

A clean micro-SaaS invoicing platform that generates **customized PDF bills**, tracks **payment milestones**, and sends **automated reminder emails** solves freelance cash-flow bottlenecks.

### 1.2 Target personas & core problem
**Primary users:** student freelancers, gig-economy workers, boutique digital agencies, campus consultants.

**Core problem:** money is earned but not collected on time, because invoicing is manual, non-compliant, and follow-ups are forgotten.

### 1.3 Core functional requirements (build in 32 hours)

| ID | Requirement | What it means |
|---|---|---|
| **FR-1** | Client & Business Profile Setup | Save freelancer business details, PAN/GST number, bank UPI ID, and a client address book. |
| **FR-2** | Dynamic Invoice Builder | Add line items, quantities, hourly/fixed rates, discounts; auto-calculate **SGST/CGST or IGST**. |
| **FR-3** | PDF Invoice Generator | Client-side or server-side generation of pixel-perfect, downloadable PDF invoices with a custom brand logo. |
| **FR-4** | Integrated UPI QR / Payment Link | Generate a dynamic **UPI payment QR code** embedded on the invoice for instant mobile settlement. |
| **FR-5** | Invoice Status & Aging Ledger | Track lifecycle: `DRAFT → SENT → VIEWED → PAID → OVERDUE`. |
| **FR-6** | Automated Overdue Reminder Scheduler | One-click trigger or automated email reminder sent to the client **3 days before** and **1 day after** the due date. |

### 1.4 Non-functional & reliability requirements
- Compliant with **Indian GST invoicing format**
- Instant PDF generation (**< 1 sec**)
- **Bank-grade encryption** of sensitive banking details

### 1.5 Mandatory team documentation artifacts
Must submit, based on official templates:

1. `README.md`
2. `docs/PLANNING.md`
3. `docs/PROGRESS.md`
4. `docs/DEPLOYMENT.md`
5. `docs/DEFENSE_QA.md`

### 1.6 Rubric alignment
High scores in **Completeness**, **UX & Design**, and **Commercial Viability**.

### 1.7 Hint & recommended stack (recommendation only)
| Layer | Suggested |
|---|---|
| Frontend | React / Next.js with Tailwind CSS |
| PDF | `@react-pdf/renderer` or `jsPDF` |
| Backend | Node.js Express |
| DB | PostgreSQL (Supabase) |
| Hosting | Vercel |

> **Disclaimer in the handbook:** this stack is a helpful recommendation; teams have full technical freedom to choose any modern stack.

---

## 2. What we are shipping in this folder

```
innova8 (3.0)/
├── 095a88d4-...jpg      ← problem statement photo
├── README.md            ← this file (page information + how to run)
├── slides.html          ← 6-slide presentation (open in browser, ← → keys, P = print)
├── docs/
│   ├── SUPABASE.sql     ← paste into Supabase SQL Editor
│   ├── SUPABASE.md      ← connect the app to Supabase (4-minute guide)
│   ├── PLANNING.md      ← scope, architecture, milestones, risks
│   ├── PROGRESS.md      ← build log + FR status board
│   ├── DEPLOYMENT.md    ← local run + Vercel/Netlify/GitHub Pages
│   ├── DEFENSE_QA.md    ← judge Q&A
│   └── SLIDES.md        ← slide-wise speaker explanation
└── src/
    ├── index.html       ← the app (open this)
    ├── css/styles.css
    ├── js/app.js        ← all business logic (FR-1 … FR-6)
    └── js/supabase-config.js  ← put your Project URL + anon key here
```

**Run it:** open `src/index.html` in a browser. No build, no install.
Data is stored in `localStorage` (swap to Supabase later — the storage layer is isolated in `load()/save()`).

### Feature → code map

| Requirement | Where |
|---|---|
| FR-1 Business + client book | Settings view, Clients view (`src/js/app.js`) |
| FR-2 Invoice builder + GST engine | `renderBuilder()`, `calcInvoice()` |
| FR-3 PDF with logo | `exportPDF()` (jsPDF) + `printInvoice()` (print stylesheet) |
| FR-4 UPI QR + payment link | `upiUrl()`, `makeQR()` |
| FR-5 Status & aging ledger | `deriveStatus()`, Dashboard aging table |
| FR-6 Reminder scheduler | Reminders view, `reminderPlan()`, `sendReminder()` |

### External libraries (CDN, loaded at runtime)
- `jspdf` + `jspdf-autotable` → PDF download
- `qrcodejs` → UPI QR rendering

If a CDN is unavailable the app still works: **Print / Save as PDF** uses the browser's own print engine (also < 1 sec).
