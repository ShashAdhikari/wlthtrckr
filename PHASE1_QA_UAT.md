# Phase 1 Security Hardening — QA & UAT Record

**Date**: 2026-07-13
**Scope**: Phase 1 "Quick Wins" from the security review, implemented on `Experiment`.
**Files changed**: `index.html`, `app.js`

> Correction to the earlier audit: the SRI hash strings shown in
> `SECURITY_REMEDIATION_GUIDE.md` were **illustrative placeholders and are not
> valid** (some contained non-ASCII characters). The authoritative hashes below
> were computed from the exact npm-published bytes that jsDelivr serves, and are
> the ones now in `index.html`. Use these, not the ones in the older guide.

---

## What changed

### 1. Pinned dependencies + Subresource Integrity (SRI), single CDN
All five third-party scripts now load from **jsDelivr** (npm-backed), pinned to an
exact version, each with a verified `integrity` hash and `crossorigin="anonymous"`.
If a CDN ever serves altered bytes, the browser refuses to run the script.

| Library | URL (jsDelivr, pinned) | sha384 integrity |
|---|---|---|
| three r128 | `/npm/three@0.128.0/build/three.min.js` | `sha384-CI3ELBVUz9XQO+97x6nwMDPosPR5XvsxW2ua7N1Xeygeh1IxtgqtCkGfQY9WWdHu` |
| gsap 3.12.2 | `/npm/gsap@3.12.2/dist/gsap.min.js` | `sha384-d+vyQ0dYcymoP8ndq2hW7FGC50nqGdXUEgoOUGxbbkAJwZqL7h+jKN0GGgn9hFDS` |
| ScrollTrigger 3.12.2 | `/npm/gsap@3.12.2/dist/ScrollTrigger.min.js` | `sha384-poC0r6usQOX2Ayt/VGA+t81H6V3iN9L+Irz9iO8o+s0X20tLpzc9DOOtnKxhaQSE` |
| chart.js 4.4.4 | `/npm/chart.js@4.4.4/dist/chart.umd.js` | `sha384-G436+Z2nlA8+PNoeRvWdxKbvOf8E/y+lYxqht2iBwNHTQDV5CJr3+AGVj8fGZi5t` |
| xlsx 0.18.5 | `/npm/xlsx@0.18.5/dist/xlsx.full.min.js` | `sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw` |

Note: `chart.js` was previously loaded **unversioned** (`/npm/chart.js` → whatever
"latest" happened to be). It is now pinned to 4.4.4. Chart.js v4 ships the browser
build as `dist/chart.umd.js` (no separate `.min.js`); the umd build is production.

### 2. Tightened Content Security Policy
`index.html` CSP `script-src` went from:
`'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com`
to:
`'self' 'unsafe-eval' https://cdn.jsdelivr.net`
- Dropped `'unsafe-inline'` — verified safe: the page has **no** inline `<script>`
  blocks, **no** inline `on*=` event handlers, and **no** `javascript:` URIs.
- Dropped `cdnjs.cloudflare.com` — no longer used (all scripts on jsDelivr).
- Added `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`.
- Kept `'unsafe-eval'` deliberately: SheetJS (xlsx) can use dynamic evaluation and
  removing it was **not verifiable in the build sandbox** (CDN egress blocked), so
  it stays until it can be confirmed safe in a networked browser. See UAT-6.

### 3. Import file-size limit (DoS guard)
`app.js` now rejects oversized uploads before parsing (parsing is synchronous on the
main thread and would otherwise freeze the tab). Limit: **10 MB**.
- `Upload.handle()` — CSV/Excel import path (both drag-drop and file picker).
- `Backup.import()` — JSON restore path.
- Shared helper `tooLarge(file)` + constants `MAX_IMPORT_MB` / `MAX_IMPORT_BYTES`.

---

## QA — automated, performed in this environment ✅

| # | Check | Method | Result |
|---|---|---|---|
| QA-1 | `app.js` has no syntax errors | `node --check app.js` | ✅ pass |
| QA-2 | Page boots with zero uncaught JS errors | headless Chromium load of `index.html` | ✅ 0 page errors |
| QA-3 | New UI nodes render (`safe-to-spend`, `pulse-indicator`) | DOM probe after init | ✅ present |
| QA-4 | Pulse computes correct state on empty data | DOM probe | ✅ `health-critical` |
| QA-5 | Loader dismisses (app reaches ready state) | computed style `opacity:0` | ✅ pass |
| QA-6 | Graceful degradation when libs absent | libs blocked in sandbox, app still boots | ✅ pass |
| QA-7 | No residual `cdnjs` references | grep `index.html` | ✅ none |
| QA-8 | `script-src` no longer allows `'unsafe-inline'` | grep CSP | ✅ confirmed |
| QA-9 | All 5 CDN scripts carry `integrity="sha384-…"` | grep count = 5 | ✅ pass |
| QA-10 | Size-guard boundary correct | unit test of `tooLarge` | ✅ ≤10MB allowed, >10MB blocked, unknown allowed |

**Sandbox limitation (honest):** outbound access to jsDelivr/Google Fonts is blocked
in the build environment, so QA-2/6 ran with the CDN scripts *failing to load*. That
proves no regression and graceful degradation, but it does **not** prove the SRI
hashes match a live jsDelivr response end-to-end. That is UAT-1, below.

---

## UAT — to run in a real browser with internet (human sign-off)

| # | Step | Expected result | Pass/Fail |
|---|---|---|---|
| UAT-1 | Open the deployed site; open DevTools → Console/Network | All 5 CDN scripts load **200**, **no** "failed integrity" CSP errors | ☐ |
| UAT-2 | Confirm charts render (portfolio donut, wealth-over-time) | Charts draw → Chart.js loaded under SRI | ☐ |
| UAT-3 | Confirm background 3D + scroll animations work | Three.js / GSAP loaded under SRI | ☐ |
| UAT-4 | Import a normal CSV (<10 MB) of expenses | Rows import, toast "Imported N records" | ☐ |
| UAT-5 | Import an Excel `.xlsx` (<10 MB) | Rows import → xlsx loaded under SRI | ☐ |
| UAT-6 | Watch console during UAT-5 | No CSP `unsafe-eval` violation; if none appears, `'unsafe-eval'` can be removed in a later phase | ☐ |
| UAT-7 | Try importing a >10 MB file (CSV or JSON) | Blocked with "File too large — the limit is 10MB." — no freeze | ☐ |
| UAT-8 | Export a backup, then restore it | Round-trips; data intact | ☐ |
| UAT-9 | Paste `<img src=x onerror=alert(1)>` as a transaction description | Shows as literal text; no alert (pre-existing XSS defense still holds) | ☐ |

### How to regenerate/verify the SRI hashes independently
```bash
npm pack three@0.128.0 gsap@3.12.2 chart.js@4.4.4 xlsx@0.18.5
# extract each tarball, then for the relevant dist file:
openssl dgst -sha384 -binary <file> | openssl base64 -A
# jsDelivr serves npm bytes verbatim, so these hashes match the live URLs.
```

---

## Not done in Phase 1 (and why)
- **CSV formula-injection sanitization on export** — *not applicable*: the app
  exports **JSON**, not CSV, so there is no spreadsheet-formula sink. Adding it would
  be security theater. Revisit only if a CSV export feature is added.
- **Swapping the CSV parser for PapaParse** — *declined*: the existing parser already
  handles quoted fields and escaped quotes, and adding another CDN dependency works
  against Phase 1's goal of shrinking third-party surface.
- **localStorage encryption / master password (Phase 3)** — deferred: it is a
  significant UX change with real data-loss risk (a forgotten password locks the
  user out of their own data) and needs a product decision before implementation.
