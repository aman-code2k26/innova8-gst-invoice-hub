# PLANNING.md — Innova8 (WEB-06)

**Project:** Micro-SaaS GST Invoice & Payment Link Hub for Student Freelancers
**Team:** Innova8 · **Event:** BBIT Hackathon 2026 · **Track:** WEB-06 (Level 2, Intermediate)
**Timebox:** 32 hours

---

## 1. Problem in one line

Student freelancers earn money but lose time and cash to manual, non-compliant billing and forgotten follow-ups.

## 2. Scope

### In scope (must ship — mapped to the handbook)
| Req | Deliverable | Acceptance test |
|---|---|---|
| FR-1 | Business profile + client address book | Save PAN/GSTIN/UPI/state, add/edit clients, reload → data persists |
| FR-2 | Dynamic invoice builder | Line items with qty/rate/discount, auto CGST+SGST vs IGST vs LUT, correct totals |
| FR-3 | PDF invoice with logo | One click → A4 PDF with brand logo, Indian tax-invoice layout, generated in < 1 s |
| FR-4 | UPI QR / payment link | `upi://pay` payload with exact amount rendered as QR on screen and inside the PDF |
| FR-5 | Status + aging ledger | DRAFT → SENT → VIEWED → PAID, auto-OVERDUE after due date, days-late shown |
| FR-6 | Reminder scheduler | Queue at due−3 days and due+1 days, one-click email with amount + UPI link, stops when PAID |
| Docs | 5 artefacts | README, PLANNING, PROGRESS, DEPLOYMENT, DEFENSE_QA |

### Out of scope (v2)
- Payment-gateway settlement reconciliation (UPI intent only)
- e-Invoice / IRN / QR code as per GSTN e-invoicing rule
- Multi-currency and multi-user teams
- Native mobile apps

## 3. Architecture decision

| Option | Pros | Cons | Decision |
|---|---|---|---|
| Next.js + Supabase (handbook hint) | Scale, auth, RDS | Setup + env keys eat hours; needs network at demo time | Backup plan |
| React (Vite) + Express + PG | Clear FE/BE split | Two servers, more boilerplate | Rejected |
| **Zero-build SPA (HTML/CSS/JS) + localStorage** | Runs anywhere, instant demo, no install, static-hostable | No server-side automation yet | **Chosen** |

**Why:** in 32 hours the risk is un-demoable infrastructure, not architecture. The storage layer is isolated
(`load()/save()` in `app/public/logic/storage.js`), so replacing `localStorage` with Supabase REST is a single-module change.

**Libraries:** `jspdf` + `jspdf-autotable` (PDF), `qrcode` (UPI QR). Both loaded from CDN with graceful fallback
(print-to-PDF if the CDN is unreachable).

## 4. Data model

```
business { name, pan, gstin, state, upi, upiName, email, phone, addr, logo }
settings { prefix, next, gst, hsn, lut }
client   { id, name, gstin, state, email, phone, addr }
invoice  { id, number, date, dueDate, clientId, gstType, status,
           items[{desc, hsn, qty, rate, disc, gstRate}],
           notes, terms, reminders[{rule, at, to}], createdAt }
```
Status is **derived** where possible: `SENT/VIEWED` + past `dueDate` ⇒ `OVERDUE`.

## 5. GST rules implemented

1. `lut` enabled → tax = 0 (export under Letter of Undertaking).
2. Explicit override (intra/inter) if the user forces it.
3. Auto: `client.state === business.state` → **CGST + SGST** (each half), else **IGST**.
4. Per-item rate 5 / 12 / 18 / 28 %; taxable = qty × rate × (1 − discount%).
5. Grand total rounded to ₹; difference printed as **Round off**.

## 6. Milestones (32-hour plan)

| Hour | Milestone |
|---|---|
| 0–3 | Problem breakdown, data model, UI wireframe |
| 3–8 | FR-1 profile + clients, storage layer |
| 8–15 | FR-2 builder + GST engine + live preview |
| 15–19 | FR-3 PDF + print stylesheet |
| 19–22 | FR-4 UPI QR + payment link |
| 22–26 | FR-5 status/aging + dashboard |
| 26–29 | FR-6 reminder queue + email drafts |
| 29–32 | Docs, QA pass, deploy, deck rehearsal |

## 7. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| CDN blocked at demo venue | No PDF/QR | Print-to-PDF fallback; QR degrades to a copyable `upi://` link |
| Wrong GST classification by judges | Credibility | Explain rules openly, show the LUT/intra/inter switch live |
| localStorage cleared before demo | Lost data | JSON export/import button in Settings; seed demo data on first run |
| `mailto:` blocked by browser | Reminder looks broken | Fallback: Web Share API → clipboard copy, all logged |
| Scope creep | Missing FRs | Strict FR checklist above; v2 list parked |

## 8. Quality bar

- All 6 FRs demoable end-to-end in 90 seconds.
- No console errors; works in Chrome, Edge and Safari.
- Responsive down to 800 px (judges may view on a laptop).
- Keyboard shortcuts `1–6` for fast live demo.
