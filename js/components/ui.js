/**
 * UI Components (Modals, Toasts, Clock, Status, Tables)
 */

// ─── Modal System ───────────────────────────────────────────────────────────

function showModal(options = {}) {
  const overlay = el("global-modal-overlay");
  const contentEl = el("global-modal-content");
  const titleEl = el("global-modal-title");
  const bodyEl = el("global-modal-body");
  const footerEl = el("global-modal-footer");

  if (!overlay || !contentEl || !titleEl || !bodyEl || !footerEl) return;

  // Reset classes
  contentEl.className = "modal-content";
  if (options.modalClass) {
    contentEl.classList.add(options.modalClass);
  }

  titleEl.textContent = options.title || "Notification";

  if (options.bodyHtml) {
    bodyEl.innerHTML = options.bodyHtml;
  } else {
    bodyEl.textContent = options.body || "";
  }

  footerEl.innerHTML = "";

  const type = options.type || "info"; // info, confirm, danger

  if (type === "confirm" || type === "danger" || options.showCancel) {
    const cancelBtn = buildElement("button", {
      className: "modal-btn modal-btn-secondary",
      textContent: options.cancelText || "Cancel",
    });
    cancelBtn.addEventListener("click", () => {
      closeModal();
      if (options.onCancel) options.onCancel();
    });
    footerEl.appendChild(cancelBtn);
  }

  const confirmBtn = buildElement("button", {
    className: `modal-btn ${type === "danger" ? "modal-btn-danger" : "modal-btn-primary"}`,
    textContent: options.confirmText || (type === "info" ? "Close" : "OK"),
  });
  confirmBtn.addEventListener("click", () => {
    closeModal();
    if (options.onConfirm) options.onConfirm();
  });
  footerEl.appendChild(confirmBtn);

  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  const overlay = el("global-modal-overlay");
  if (overlay) overlay.classList.remove("open");
  document.body.style.overflow = "";
}

// ─── Processing Overlay ─────────────────────────────────────────────────────

function showProcessing(message = "Processing...") {
  const overlay = el("processing-overlay");
  const msgEl = el("processing-message");
  const spinner = el("processing-spinner");
  const successIcon = el("processing-success-icon");

  if (overlay && msgEl) {
    msgEl.textContent = message;
    if (spinner) spinner.style.display = "block";
    if (successIcon) successIcon.style.display = "none";

    overlay.classList.add("active");
    overlay.setAttribute("aria-hidden", "false");
  }
}

function updateProcessingMessage(message, isSuccess = false) {
  const msgEl = el("processing-message");
  const spinner = el("processing-spinner");
  const successIcon = el("processing-success-icon");

  if (msgEl) {
    msgEl.style.opacity = "0";
    msgEl.style.transform = "translateY(5px)";
    setTimeout(() => {
      msgEl.textContent = message;
      msgEl.style.opacity = "1";
      msgEl.style.transform = "translateY(0)";

      if (isSuccess) {
        if (spinner) spinner.style.display = "none";
        if (successIcon) successIcon.style.display = "flex";
      }
    }, 150);
  }
}

function hideProcessing() {
  const overlay = el("processing-overlay");
  if (overlay) {
    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");
  }
}

// ─── Progress Bar ───────────────────────────────────────────────────────────

function showProcessingProgress() {
  const container = el("processing-progress-container");
  const spinner = el("processing-spinner");
  if (container) container.style.display = "block";
  if (spinner) spinner.style.display = "none";
}

function updateProcessingProgress(current, total, statusText) {
  const bar = el("progress-bar-fill");
  const percentText = el("progress-percent");
  const statusEl = el("progress-status-text");

  const percent = Math.round((current / total) * 100);

  if (bar) bar.style.width = `${percent}%`;
  if (percentText) percentText.textContent = `${percent}%`;
  if (statusEl && statusText) statusEl.textContent = statusText;
}

function hideProcessingProgress() {
  const container = el("processing-progress-container");
  const spinner = el("processing-spinner");
  if (container) {
    container.style.display = "none";
    // Reset for next time
    const bar = el("progress-bar-fill");
    if (bar) bar.style.width = "0%";
  }
  if (spinner) spinner.style.display = "block";
}

function bindModalEvents() {
  const closeBtn = el("global-modal-close");
  const overlay = el("global-modal-overlay");

  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

// ─── Status Pill ─────────────────────────────────────────────────────────────

function setStatus(text, type = "ready") {
  const dot = el("status-dot");
  const span = el("status-text");
  if (!dot || !span) return;

  span.textContent = text;
  dot.className = "status-dot";

  if (type === "analyzing") {
    dot.style.background = "var(--blue)";
    dot.classList.add("pulse");
  } else if (type === "unsaved") {
    dot.style.background = "var(--amber)";
  } else if (type === "copied") {
    dot.style.background = "var(--green)";
  } else {
    dot.style.background = "var(--green)";
  }
}

// ─── Clock ───────────────────────────────────────────────────────────────────

function updateClock() {
  const now = new Date();
  const timeEl = el("clock-time");
  const dateEl = el("clock-date");

  if (timeEl) {
    timeEl.textContent = now.toLocaleTimeString("en-US", {
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  }
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function showToast(message, type = "success") {
  const container = el("toast-container");
  if (!container) return;

  const icons = {
    success:
      '<svg class="toast-icon success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
    error:
      '<svg class="toast-icon error" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg class="toast-icon info" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  };

  const toast = buildElement("div", {
    className: `toast ${type}`,
    role: "alert",
  });
  toast.innerHTML = (icons[type] || icons.info) + `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = `toast-out 0.2s ease-in forwards`;
    setTimeout(() => toast.remove(), 200);
  }, TOAST_DURATION_MS);
}

// ─── File Table Rendering ────────────────────────────────────────────────────

function renderFileTableRow(item) {
  const tbody = el("file-table-body");
  if (!tbody) return;

  const tr = buildElement("tr", {
    className: "file-row",
    id: `row-${item.id}`,
  });
  tbody.appendChild(tr);
  refreshItemRow(item.id);
  el("file-table-container").style.display = "block";
  updateTotals();
  updateExpressCard();
  updateInvoicePreview();
}

function refreshItemRow(id) {
  const item = findItemById(id);
  const tr = el(`row-${id}`);
  if (!item || !tr) return;

  const rowIndex = state.fileItems.indexOf(item) + 1;
  const rowTotal = computeItemTotal(item);
  const isActive = checkIfRowPushesTierActive(item);

  tr.className = "file-row" + (isActive ? " row-discount-active" : "");

  const metaPills = buildMetaPills(item);
  const fileTypePill = item.isManual
    ? ""
    : `<span class="meta-pill pill-filetype">${(item.fileExt || "file").toUpperCase()}</span>`;
  const pagesInputClass = item.needsPageEntry ? "num-input warn" : "num-input";
  const pagesValue = item.pages > 0 ? item.pages : "";

  const nameContent = item.isManual
    ? `<input type="text" class="row-name-input" value="${item.fileName}" data-id="${id}" data-field="fileName" />`
    : `<span class="file-name-text clickable" data-preview-id="${id}" title="${item.fileName} — click to preview">${item.fileName}</span>`;

  const progressBarHtml = item._processing
    ? `<div class="row-progress"><div class="row-progress-fill" style="width:${item._processingPct || 0}%"></div></div><div class="row-stage">${item._processingStage || "0%"}</div>`
    : "";

  const paperBtns = PAPER_SIZES.map(
    (s) =>
      `<button type="button" class="seg-btn${item.paperSize === s ? " active" : ""}" data-id="${id}" data-field="paperSize" data-value="${s}" title="${PAPER_SIZE_LABELS[s]} paper">${PAPER_SIZE_LABELS[s]}</button>`,
  ).join("");

  const modeBtns = COLOR_MODES.map(
    (m) =>
      `<button type="button" class="seg-btn${item.colorMode === m || (m === "color_small" && item.colorMode === "color") ? " active" : ""}" data-id="${id}" data-field="colorMode" data-value="${m}" title="${COLOR_MODE_LONG_LABELS[m]}">${COLOR_MODE_SHORT[m]}</button>`,
  ).join("");

  tr.innerHTML = `
    <td style="color:var(--text-3);font-size:12px;font-family:var(--font-mono)">${rowIndex}</td>
    <td class="file-name-cell">
      ${nameContent}
      ${progressBarHtml}
      <div class="file-meta">${fileTypePill}${metaPills}${isActive ? '<span class="meta-pill pill-discount">✦ Tier</span>' : ""}</div>
    </td>
    <td>
      <div class="seg-control" data-field="paperSize">${paperBtns}</div>
    </td>
    <td>
      <div class="seg-control" data-field="colorMode">${modeBtns}</div>
    </td>
    <td>
      <input type="number" class="${pagesInputClass}" value="${pagesValue}" min="1"
        data-id="${id}" data-field="pages" />
    </td>
    <td>
      <input type="number" class="num-input" value="${item.copies}" min="1"
        data-id="${id}" data-field="copies" />
    </td>
    <td class="total-cell" id="total-${id}">${formatPeso(rowTotal)}</td>
    <td class="remove-cell">
      <button class="remove-btn" data-id="${id}" title="Remove item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </td>
  `;
}

function buildMetaPills(item) {
  const pills = [];
  if (item.isManual) {
    pills.push('<span class="meta-pill pill-estimated">Manual</span>');
  } else {
    const isDocx = item.fileExt === "docx" || item.fileExt === "doc";
    if (isDocx) {
      pills.push(
        '<span class="meta-pill pill-warn" title="DOCX page counts are estimates — convert to PDF for accuracy">⚠ Approx — use PDF</span>',
      );
    }
    if (item.needsPageEntry) {
      pills.push('<span class="meta-pill pill-warn">⚠ Enter pages</span>');
    } else if (item.isPageExact) {
      pills.push('<span class="meta-pill pill-exact">● Exact</span>');
    } else if (!isDocx) {
      pills.push(
        '<span class="meta-pill pill-estimated" title="Estimated from file size">~Est.</span>',
      );
    }
  }
  return pills.join("");
}

function checkIfRowPushesTierActive(targetItem) {
  const totalWithout = state.fileItems
    .filter((i) => i.id !== targetItem.id)
    .reduce((sum, i) => sum + i.pages * i.copies, 0);
  const totalWith = totalWithout + targetItem.pages * targetItem.copies;
  const activeTier = resolveActiveTier(totalWith);
  const tierWithout = resolveActiveTier(totalWithout);
  return activeTier && activeTier !== tierWithout;
}

function refreshAllRows() {
  for (const item of state.fileItems) {
    refreshItemRow(item.id);
  }
}

function removeItemFromState(id) {
  const removed = state.fileItems.find((i) => i.id === id);
  state.fileItems = state.fileItems.filter((i) => i.id !== id);
  const tr = el(`row-${id}`);
  if (tr) {
    tr.style.opacity = "0";
    tr.style.transform = "translateX(-8px)";
    tr.style.transition = "all 0.15s";
    setTimeout(() => tr.remove(), 150);
  }
  if (state.fileItems.length === 0) {
    el("file-table-container").style.display = "none";
    showFullDropZone();
  }
  updateTotals();
  updateExpressCard();
  updateInvoicePreview();
}

function addManualItem() {
  const id = state.nextItemId++;
  const copies =
    parseInt(el("default-copies")?.value) || state.settings.defaultCopies;
  const colorMode = state.lastColorMode || "bw";
  const paperSize = state.lastPaperSize || "short";
  const item = {
    id,
    fileName: "Custom Item",
    pages: 1,
    copies,
    colorMode,
    paperSize,
    unitPrice: getPriceForItem(colorMode, paperSize),
    isPageExact: true,
    isManual: true,
    needsPageEntry: false,
  };
  state.fileItems.push(item);
  renderFileTableRow(item);
  showCompactDropZone();
  updateTotals();
  updateExpressCard();
  updateInvoicePreview();
  setStatus("Unsaved", "unsaved");
}

function showFullDropZone() {
  const dz = el("drop-zone");
  const cdz = el("drop-zone-compact");
  if (dz) dz.style.display = "block";
  if (cdz) cdz.style.display = "none";
}

function showCompactDropZone() {
  const dz = el("drop-zone");
  const cdz = el("drop-zone-compact");
  if (dz) dz.style.display = "none";
  if (cdz) cdz.style.display = "flex";
}

function showFilePreview(id) {
  const item = findItemById(id);
  if (!item) return;

  const invoicePreview = el("invoice-preview");
  const previewFrame = invoicePreview?.closest(".preview-frame");
  const container = el("file-preview-container");
  if (!container) return;

  // Store current preview item for page navigation
  state._previewItemId = id;
  state._previewPage = 0;

  // Build preview body
  const body = el("file-preview-body");
  const title = el("file-preview-title");
  const nav = el("file-preview-nav");
  const meta = el("file-preview-meta");

  if (title) title.textContent = item.fileName;

  // Determine what to show
  const hasPdfPreview = !!item._previewDataUrl;

  if (hasPdfPreview) {
    // PDF — single page image
    body.innerHTML = `<img class="file-preview-image" id="file-preview-image" src="${item._previewDataUrl}" />`;
    if (nav) nav.style.display = "none";
  } else {
    const isDocx = item.fileExt === "docx" || item.fileExt === "doc";
    const msg = isDocx
      ? "No preview for DOCX — convert to PDF for accurate pages &amp; preview"
      : "No preview available";
    body.innerHTML = `<div class="file-preview-empty">${msg}</div>`;
    if (nav) nav.style.display = "none";
  }

  // Metadata bar
  if (meta) {
    const sizeLabel = PAPER_SIZE_LABELS[item.paperSize] || "Short";
    const modeLabel = COLOR_MODE_LONG_LABELS[item.colorMode] || "B&W";
    meta.innerHTML = `
      <span class="file-preview-meta-item"><span class="file-preview-meta-label">Pages</span><span class="file-preview-meta-val">${item.pages}</span></span>
      <span class="file-preview-meta-item"><span class="file-preview-meta-label">Copies</span><span class="file-preview-meta-val">${item.copies}</span></span>
      <span class="file-preview-meta-item"><span class="file-preview-meta-label">Paper</span><span class="file-preview-meta-val">${sizeLabel}</span></span>
      <span class="file-preview-meta-item"><span class="file-preview-meta-label">Color</span><span class="file-preview-meta-val">${modeLabel}</span></span>
      <span class="file-preview-meta-item"><span class="file-preview-meta-label">Unit</span><span class="file-preview-meta-val">${formatPeso(item.unitPrice)}/pg</span></span>
      <span class="file-preview-meta-item"><span class="file-preview-meta-label">Total</span><span class="file-preview-meta-val file-preview-meta-total">${formatPeso(computeItemTotal(item))}</span></span>
      ${item.fileSize ? `<span class="file-preview-meta-item"><span class="file-preview-meta-label">Size</span><span class="file-preview-meta-val">${formatSize(item.fileSize)}</span></span>` : ""}
    `;
  }

  // Swap panels
  if (previewFrame) previewFrame.style.display = "none";
  container.style.display = "flex";
}

function closeFilePreview() {
  const container = el("file-preview-container");
  const invoicePreview = el("invoice-preview");
  const previewFrame = invoicePreview?.closest(".preview-frame");
  if (container) container.style.display = "none";
  if (previewFrame) previewFrame.style.display = "";
  state._previewItemId = null;
  state._previewPage = 0;
}

function navigatePreviewPage(direction) {
  // PDF previews are single-page; DOCX previews were removed (PDF-only).
}

function updateExpressCard() {
  const card = el("express-card");
  const tableContainer = el("file-table-container");
  if (!card) return;

  const isExpress =
    state.settings.isExpressMode && state.fileItems.length === 1;
  card.style.display = isExpress ? "block" : "none";
  if (tableContainer)
    tableContainer.style.display = isExpress
      ? "none"
      : state.fileItems.length > 0
        ? "block"
        : "none";

  if (isExpress) {
    const item = state.fileItems[0];
    const total = computeItemTotal(item);
    const sizeLabel =
      { long: "Long (8.5×14)", short: "Short (8.5×11)", a4: "A4" }[
        item.paperSize
      ] || "Short";
    const modeLabel = COLOR_MODE_LONG_LABELS[item.colorMode] || "B&W";

    const content = el("express-card-content");
    if (content) {
      content.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
          <div>
            <div style="font-size:16px;font-weight:700;color:var(--text-1);margin-bottom:2px">${truncateText(item.fileName, 32)}</div>
            <div style="display:flex;gap:6px;margin-top:4px">
              <span class="meta-pill">${sizeLabel}</span>
              <span class="meta-pill">${modeLabel}</span>
              ${item.isPageExact ? '<span class="meta-pill pill-exact">● Exact</span>' : '<span class="meta-pill pill-estimated">~Est.</span>'}
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:20px;font-weight:700;color:var(--accent);font-family:var(--font-mono)">${formatPeso(total)}</div>
            <div style="font-size:11px;color:var(--text-3)">${formatPeso(item.unitPrice)}/pg</div>
          </div>
        </div>
        <div style="display:flex;gap:12px;align-items:center">
          <div style="flex:1">
            <label class="field-label" style="font-size:10px">Pages</label>
            <input type="number" class="num-input" value="${item.pages || ""}" min="1"
              data-id="${item.id}" data-field="pages" style="width:100%;font-size:14px" />
          </div>
          <div style="flex:1">
            <label class="field-label" style="font-size:10px">Copies</label>
            <input type="number" class="num-input" value="${item.copies}" min="1"
              data-id="${item.id}" data-field="copies" style="width:100%;font-size:14px" />
          </div>
        </div>
      `;
    }
  }
}

function refreshTotalCell(id) {
  const item = findItemById(id);
  const cell = el(`total-${id}`);
  if (!item || !cell) return;

  const newTotal = formatPeso(computeItemTotal(item));
  if (cell.textContent !== newTotal) {
    cell.textContent = newTotal;
    cell.classList.add("total-flash");
    setTimeout(() => cell.classList.remove("total-flash"), 200);
  }
}

// Excel-style autofit: Total column width = widest total value + cell padding
function autofitTotalColumn() {
  const table = document.querySelector(".file-table");
  if (!table) return;

  const probe = document.createElement("span");
  probe.style.cssText =
    "position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;" +
    "font-family:var(--font-mono-alt);font-size:13px;font-weight:600;";
  document.body.appendChild(probe);

  let max = 0;
  for (const cell of table.querySelectorAll(".total-cell")) {
    probe.textContent = cell.textContent;
    if (probe.offsetWidth > max) max = probe.offsetWidth;
  }
  document.body.removeChild(probe);

  table.style.setProperty("--total-col-w", `${Math.max(56, Math.ceil(max) + 18)}px`);

  if (!window._totalColFontHooked && document.fonts) {
    window._totalColFontHooked = true;
    document.fonts.ready.then(() => autofitTotalColumn());
  }
}

// ─── Drawer Management ───────────────────────────────────────────────────────

function openDrawer(view = "history") {
  switchDrawerView(view);
  el("app-drawer").classList.add("open");
  el("drawer-overlay").classList.add("open");
  document.body.style.overflow = "hidden";
  if (view === "history") renderHistoryList();
  else loadSettingsIntoDrawer();
}

function closeDrawer() {
  el("app-drawer").classList.remove("open");
  el("drawer-overlay").classList.remove("open");
  document.body.style.overflow = "";
}

function switchDrawerView(view) {
  if (view === "history") {
    el("history-view").style.display = "flex";
    el("settings-view").style.display = "none";
    el("tab-history").classList.add("active");
    el("tab-settings").classList.remove("active");
    renderHistoryList();
  } else {
    el("history-view").style.display = "none";
    el("settings-view").style.display = "flex";
    el("tab-history").classList.remove("active");
    el("tab-settings").classList.add("active");
    loadSettingsIntoDrawer();
  }
}
