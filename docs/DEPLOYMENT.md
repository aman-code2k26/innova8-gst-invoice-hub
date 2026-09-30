# DEPLOYMENT.md — Innova8 (WEB-06)

The app is a **static site**: 3 files (`index.html`, `css/styles.css`, `js/app.js`) plus this `docs/` folder.
No build step, no server, no environment variables.

---

## 0. Run locally (zero setup)

```bash
open "src/index.html"
```

Or double-click `src/index.html`. Works in Chrome / Edge / Safari.
First load seeds demo data (1 business, 2 clients, 3 invoices).

> Opening via `file://` is fine. If your browser blocks CDN scripts on `file://`,
> serve the folder instead:
> ```bash
> cd "src" && python3 -m http.server 8080     # → http://localhost:8080
> ```

**Internet needed for:** PDF (jsPDF) and QR libraries from cdnjs.
**Without internet:** the app still works — PDF falls back to the browser print dialog,
and the QR area shows the copyable `upi://pay` link.

---

## 1. Deploy to Vercel (recommended, 30 seconds)

```bash
npm i -g vercel
cd "innova8 (3.0)/src"
vercel --prod
```
Or: push the folder to GitHub → vercel.com → **Add New Project** → import repo →
**Root Directory:** `src` → **Framework Preset:** Other → Deploy.

## 2. Deploy to Netlify

```bash
npm i -g netlify-cli
cd "innova8 (3.0)/src"
netlify deploy --prod --dir .
```

## 3. GitHub Pages

1. Create a repo, push this folder.
2. Repo → **Settings → Pages → Source:** `main` branch, folder `/src`.
3. Site appears at `https://<user>.github.io/<repo>/`.

## 4. Any static host

Upload the **contents of `src/`** (`index.html`, `css/`, `js/`) to the web root.
Expected layout on the server:

```
/
├── index.html
├── css/styles.css
└── js/app.js
```

---

## 5. Pre-deploy checklist

- [ ] `src/js/app.js` passes a syntax check (`SYNTAX OK`).
- [ ] Every `$('#id')` used in JS exists in `index.html` (verified: 0 missing).
- [ ] Settings → **Reset demo data** works (seeds correctly after a hard refresh).
- [ ] Create invoice → **PDF** downloads and opens.
- [ ] QR scans from a phone (UPI ID configured in Settings).
- [ ] Reminder queue shows due items; sending logs an entry.
- [ ] `slides.html` opens, `→` navigates, `P` prints 6 pages.
- [ ] No secrets in the repo (there are none — no keys, no tokens).

## 5b. Add cloud database (Supabase)

Follow `docs/SUPABASE.md`: copy **Settings → API** (Project URL + anon key) into
`src/js/supabase-config.js`, run `docs/SUPABASE.sql` in the SQL Editor, then click
**Test connection** in the app's Settings page. Without it the app still runs on `localStorage`.

## 6. Custom domain

Vercel/Netlify → **Domains** → add domain → set the DNS records they show → HTTPS is issued automatically.

## 7. Upgrading to a real backend (v2 path)

| Today | Replace with | File to change |
|---|---|---|
| `localStorage` (`load/save`) | **Supabase — already wired**, add Auth for per-user RLS | `src/js/supabase-config.js` + `docs/SUPABASE.sql` |
| `mailto:` reminder | Resend/SendGrid + cron (Vercel Cron) | `sendReminder()` |
| Client-side UPI QR only | Payment-link API + webhook status | new `api/` folder |

Only the storage and mail functions change — all FR logic (GST maths, status, aging) stays as-is.

## 8. Data backup / restore

In-app: **Settings → Export JSON backup / Import JSON**.
This is the recovery path if a browser clears `localStorage` before your demo.
