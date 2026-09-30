# DEPLOYMENT.md — Innova8 (WEB-06)

The app is a **static site**: the committed build output (`index.html`, `assets/`, `logic/`) plus this `docs/`
folder. No server, no environment variables — and no build step unless you are changing the React source.

---

## 0. Run locally (zero setup)

```bash
python3 -m http.server 8080      # from the repository root
```

Open http://localhost:8080 in Chrome / Edge / Safari. No build step is needed — the repository ships the built app.
First load seeds demo data (1 business, 2 clients, 3 invoices).

> Serve over HTTP (module scripts are blocked on `file://`):
> ```bash
> python3 -m http.server 8080     # from the repository root → http://localhost:8080
> ```

**Internet needed for:** PDF (jsPDF) from cdnjs, and Supabase (only if cloud sync is switched on). The
QR generator is bundled with the app, so payment links work offline.
**Without internet:** the app still works — PDF falls back to the browser print dialog,
and the QR area shows the copyable `upi://pay` link.

---

## 1. Deploy to Vercel (recommended, 30 seconds)

```bash
npm i -g vercel
vercel --prod          # from the repository root, no build command
```
Or: push the repo → vercel.com → **Add New Project** → import →
**Root Directory:** `.` → **Build Command:** *(leave empty)* → **Output Directory:** `.` → Deploy.

## 2. Deploy to Netlify

```bash
npm i -g netlify-cli
netlify deploy --prod --dir .     # publish directory = repository root
```

## 3. GitHub Pages (what this project uses)

1. Repo → **Settings → Pages → Source:** `Deploy from a branch`.
2. Branch `main`, folder `/ (root)`.
3. Push to `main` → the site republishes in ~1 min at
   `https://<user>.github.io/<repo>/`.

## 4. Any static host

Nothing manual is needed: GitHub Pages is set to **Deploy from a branch → `main` / `(root)`**, and the build output
(`index.html`, `assets/`, `logic/`) is committed at the repository root. Pushing to `main` republishes the site.
Expected layout on the server:

```
/
├── index.html      ← React shell
├── assets/         ← bundled JS + CSS
├── logic/          ← window.I8 domain modules + supabase-config.js
├── slides.html
└── docs/
```

---

## 5. Pre-deploy checklist

- [ ] `cd app && npm run verify` passes (build + 25 smoke assertions).
- [ ] `cd app && npm test` boots the built site and clicks through all six views (25 assertions).
- [ ] Settings → **Reset demo data** works (seeds correctly after a hard refresh).
- [ ] Create invoice → **PDF** downloads and opens.
- [ ] QR scans from a phone (UPI ID configured in Settings).
- [ ] Reminder queue shows due items; sending logs an entry.
- [ ] `slides.html` opens, `→` navigates, `P` prints 6 pages.
- [ ] No secrets in the repo (there are none — no keys, no tokens).

## 5b. Add cloud database (Supabase)

Follow `docs/SUPABASE.md`: copy **Settings → API** (Project URL + anon key) into
`app/public/logic/supabase-config.js`, run `npm run build` inside `app/`, run `docs/SUPABASE.sql` in the SQL Editor, then click
**Test connection** in the app's Settings page. Without it the app still runs on `localStorage`.

## 6. Custom domain

Vercel/Netlify → **Domains** → add domain → set the DNS records they show → HTTPS is issued automatically.

## 7. Upgrading to a real backend (v2 path)

| Today | Replace with | File to change |
|---|---|---|
| `localStorage` (`load/save`) | **Supabase — already wired**, add Auth for per-user RLS | `app/public/logic/supabase-config.js` + `docs/SUPABASE.sql` |
| `mailto:` reminder | Resend/SendGrid + cron (Vercel Cron) | `sendReminder()` |
| Client-side UPI QR only | Payment-link API + webhook status | new `api/` folder |

Only the storage and mail functions change — all FR logic (GST maths, status, aging) stays as-is.

## 8. Data backup / restore

In-app: **Settings → Export JSON backup / Import JSON**.
This is the recovery path if a browser clears `localStorage` before your demo.
