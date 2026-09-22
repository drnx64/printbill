# AGENTS.md — PrintBill (InvV4)

## What This Is

Chrome extension (Manifest V3) that replaces the New Tab page with a printing shop invoice tool. Vanilla HTML/CSS/JS — no build system, no bundler, no package manager.

## Project Structure

```
index.html          — Single-page app shell; all <script> tags load here in dependency order
js/main.js          — Entry point (init on DOMContentLoaded)
js/db.js            — IndexedDB wrapper (async, exposed as window.appDb)
js/utils.js         — DOM helpers (el(), buildElement()), formatters, storage read/write
js/config.js        — Constants: defaults, pricing tiers, storage keys
js/state.js         — Global mutable state object (fileItems, settings, pricing, etc.)
js/core/billing.js  — Price calculations, discount tiers, grand total
js/core/files.js    — PDF/DOCX page count detection (pdf.js, mammoth, JSZip)
js/core/invoice.js  — Invoice preview rendering, image capture (html2canvas), exports
js/components/      — ui.js (modals, toasts, table), settings.js, history.js, dashboard.js
js/events.js        — All event binding (bindAllEvents called from main.js)
css/                — Modular CSS: tokens, layout, components, drawer, invoice, dashboard
lib/                — Vendored libraries (pdf.js, jszip, mammoth, html2canvas)
```

## Key Architecture Facts

- **No module system.** All JS files are loaded via `<script>` tags in index.html. Load order matters — config before state, utils before core, etc.
- **Global state.** Single `state` object in `js/state.js` holds all app data. Functions mutate it directly.
- **Global DB.** `window.appDb` is the IndexedDB instance. Use `readDb(key)` and `writeDb(key, val)` from utils.js.
- **Dual storage.** Settings/pricing/QR/stats persist via IndexedDB (`STORAGE_KEYS.*`). History uses localStorage.
- **Dual pricing.** "K-Mode" (Kakilala/friend rates) swaps the entire pricing matrix. Toggle in header swaps `state.pricing` between `state.pricingStandard` and `state.pricingKMode`.
- **Paper sizes:** `long` (612×936pt), `short` (612×792pt), `a4` (595×842pt). Auto-detected for PDFs by page dimensions.
- **Color modes:** `bw`, `color_small`, `color_partial`, `color_full`.

## Development

**No build step.** Open `index.html` in Chrome to run. For extension mode, load the directory as an unpacked extension in `chrome://extensions`.

**No lint, test, or typecheck commands exist.** This is a vanilla JS project with no tooling.

**CSP constraint:** `script-src 'self'` — no inline scripts, no eval, no external CDN scripts. All libraries are vendored in `lib/`.

## Common Gotchas

- **Script load order is critical.** If you add a new JS file, you must add a `<script>` tag in `index.html` in the correct position (after its dependencies).
- **PDF worker path:** `js/core/files.js:17` sets `pdfjsLib.GlobalWorkerOptions.workerSrc = "lib/pdf.worker.min.js"` — this must be a relative path from the extension root.
- **DOCX page estimation** uses a heuristic (`DOCX_BYTES_PER_PAGE = 2400`). Actual page breaks from `<w:br w:type="page"/>` are preferred when found.
- **All prices are in Philippine Peso (₱).** `formatPeso()` in utils.js formats them.
- **`persistSettingsToStorage()` is called on every `updateInvoicePreview()` call** (via `js/core/invoice.js:36`). Settings are auto-saved frequently.
- **History uses localStorage, everything else uses IndexedDB.** They have different storage limits and persistence behavior.
- **Theme stored as `"dark"` or `"light"` in IndexedDB**, applied via `data-theme` attribute on `<html>`.
- **QR code stored as base64 data URL** in IndexedDB (can be large). Cropped to 400×400 square on upload.

## File Processing Flow

1. User drops/selects files → `handleFiles()` in events.js
2. `processFilesAsync()` → `processUploadedFileAsync()` per file
3. PDF: `readPdfPageCountAsync()` via pdf.js → detects paper size by page dimensions
4. DOCX: `readDocxPageCountAsync()` via mammoth + JSZip → uses metadata, page breaks, or text heuristics
5. Items added to `state.fileItems`, table row rendered, totals updated

## Order Placement Flow

1. `placeOrder()` validates items, prompts for customer name via modal
2. Updates cumulative stats → saves to IndexedDB
3. Saves snapshot to localStorage history
4. Sends Discord webhook embed if configured
5. Captures invoice as image via html2canvas → copies to clipboard or downloads PNG
6. Clears invoice, generates new ref, resets state

## Adding New Features

- **New settings field:** Add to `state.settings` in state.js, persist in `persistSettingsToStorage()`, load in `loadSettingsFromStorage()`, wire UI in settings.js.
- **New UI component:** Follow pattern in `js/components/`. Add modal content via `showModal({ bodyHtml: "..." })`.
- **New CSS:** Add file in `css/`, import via `<link>` in index.html. Use CSS custom properties from `css/tokens.css`.
