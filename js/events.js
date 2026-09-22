/**
 * Event Bindings
 */

function bindDropZoneEvents() {
  const zone = el("drop-zone");
  const compact = el("drop-zone-compact");
  const input = el("file-input");
  const overlay = el("file-drop-overlay");

  if (!zone || !input || !overlay) return;

  const openFilePicker = () => input.click();

  zone.addEventListener("click", openFilePicker);
  compact.addEventListener("click", openFilePicker);
  
  zone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openFilePicker();
    }
  });
  
  compact.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openFilePicker();
    }
  });

  let dragCounter = 0;
  window.addEventListener("dragenter", (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) {
      dragCounter++;
      overlay.classList.add("active");
    }
  });

  window.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  });

  window.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      overlay.classList.remove("active");
      dragCounter = 0;
    }
  });

  window.addEventListener("drop", (e) => {
    e.preventDefault();
    dragCounter = 0;
    overlay.classList.remove("active");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  });

  input.addEventListener("change", () => {
    if (input.files && input.files.length > 0) {
      handleFiles(Array.from(input.files));
    }
    input.value = "";
  });
}

async function handleFiles(files) {
  const supported = files.filter((f) => /\.(pdf|docx|doc)$/i.test(f.name));
  if (supported.length === 0) {
    showToast("Only PDF and DOCX files are supported", "error");
    return;
  }

  await processFilesAsync(supported);
}

function bindFileTableEvents() {
  const body = el("file-table-body");
  if (!body) return;

  body.addEventListener("change", (e) => {
    const input = e.target;
    const id = parseInt(input.dataset.id);
    const field = input.dataset.field;
    if (!id || !field) return;

    const item = findItemById(id);
    if (!item) return;

    if (field === "pages") {
      item.pages = parseInt(input.value) || 0;
      item.isPageExact = true;
      item.needsPageEntry = item.pages < 1;
      input.className = item.needsPageEntry ? "num-input warn" : "num-input";
    } else if (field === "fileName") {
      item.fileName = input.value || "Custom Item";
    } else if (field === "copies") {
      item.copies = parseInt(input.value) || 1;
    }

    refreshTotalCell(id);
    updateTotals();
    refreshAllRows();
    updateExpressCard();
    updateInvoicePreview();
  });

  // Segmented buttons (paper size / color mode)
  body.addEventListener("click", (e) => {
    const segBtn = e.target.closest(".seg-btn");
    if (segBtn && segBtn.dataset.id) {
      const id = parseInt(segBtn.dataset.id);
      const field = segBtn.dataset.field;
      const value = segBtn.dataset.value;
      const item = findItemById(id);
      if (!item || !field || !value) return;

      if (field === "paperSize") {
        item.paperSize = value;
        state.lastPaperSize = value;
      } else if (field === "colorMode") {
        item.colorMode = value;
        state.lastColorMode = value;
      } else {
        return;
      }
      item.unitPrice = getPriceForItem(item.colorMode, item.paperSize);

      refreshTotalCell(id);
      updateTotals();
      refreshAllRows();
      updateExpressCard();
      updateInvoicePreview();
      persistSettingsToStorage();
      return;
    }

    const previewTarget = e.target.closest("[data-preview-id]");
    if (previewTarget) {
      const id = parseInt(previewTarget.dataset.previewId);
      showFilePreview(id);
      return;
    }
    const btn = e.target.closest(".remove-btn");
    if (!btn) return;
    const id = parseInt(btn.dataset.id);
    if (id) removeItemFromState(id);
  });

  // Express card input delegation
  const expressContent = el("express-card-content");
  if (expressContent) {
    expressContent.addEventListener("change", (e) => {
      const input = e.target;
      const id = parseInt(input.dataset.id);
      const field = input.dataset.field;
      if (!id || !field) return;

      const item = findItemById(id);
      if (!item) return;

      if (field === "pages") {
        item.pages = parseInt(input.value) || 0;
        item.isPageExact = true;
        item.needsPageEntry = item.pages < 1;
      } else if (field === "copies") {
        item.copies = parseInt(input.value) || 1;
      }

      refreshTotalCell(id);
      updateTotals();
      refreshAllRows();
      updateExpressCard();
      updateInvoicePreview();
    });
  }
}

function bindPricingMatrixEvents() {
  const table = el("pricing-matrix-table");
  if (!table) return;

  table.addEventListener("input", () => {
    syncPricingMatrixToState();
    for (const item of state.fileItems) {
      item.unitPrice = getPriceForItem(item.colorMode, item.paperSize);
    }
    refreshAllRows();
    updateTotals();
    updateInvoicePreview();
  });
}

function bindPricingEvents() {
  el("tax-rate")?.addEventListener("input", (e) => {
    state.settings.taxRate = parseFloat(e.target.value) || 0;
    const sub = el("tax-rate-sub");
    if (sub) sub.textContent = `${state.settings.taxRate}%`;
    updateTotals();
    updateInvoicePreview();
  });

  el("tax-enabled")?.addEventListener("change", (e) => {
    state.settings.isTaxEnabled = e.target.checked;
    const row = el("tax-rate-row");
    const vatRow = el("vat-show-row");
    if (row) row.style.display = state.settings.isTaxEnabled ? "flex" : "none";
    if (vatRow) vatRow.style.display = state.settings.isTaxEnabled ? "flex" : "none";
    updateTotals();
    updateInvoicePreview();
  });

  el("vat-show-invoice")?.addEventListener("change", (e) => {
    state.settings.isVatVisibleOnInvoice = e.target.checked;
    updateInvoicePreview();
  });

  el("round-up")?.addEventListener("change", (e) => {
    state.settings.shouldRoundUp = e.target.checked;
    updateTotals();
    updateInvoicePreview();
  });

  el("express-mode")?.addEventListener("change", (e) => {
    state.settings.isExpressMode = e.target.checked;
    updateExpressCard();
  });

  el("show-unit-price")?.addEventListener("change", (e) => {
    state.settings.showUnitPrice = e.target.checked;
    updateInvoicePreview();
    persistSettingsToStorage();
  });
}

function bindDiscountTierEvents() {
  const container = el("discount-tiers");
  if (!container) return;

  container.addEventListener("change", (e) => {
    const input = e.target;
    const tierIdx = parseInt(input.dataset.tier);
    const field = input.dataset.field;
    if (isNaN(tierIdx) || !field) return;

    state.discountTiers[tierIdx][field] = parseFloat(input.value) || 0;
    updateTotals();
    renderDiscountTiers(); // Re-render to highlight active
  });

  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".tier-remove-btn");
    if (!btn) return;
    const idx = parseInt(btn.dataset.tier);
    if (!isNaN(idx)) removeDiscountTier(idx);
  });

  el("btn-add-tier")?.addEventListener("click", addDiscountTier);
}

function bindExportEvents() {
  el("btn-place-order")?.addEventListener("click", placeOrder);
  el("btn-copy-image")?.addEventListener("click", copyInvoiceAsImageAsync);
  el("btn-copy-text")?.addEventListener("click", copyInvoiceAsText);
  el("btn-print")?.addEventListener("click", () => printInvoice());
  el("btn-save-png")?.addEventListener("click", saveAsPngAsync);
  
  el("btn-new-invoice")?.addEventListener("click", () => {
    showModal({
      title: "New Invoice",
      body: "Start a new invoice? Current data will be cleared.",
      type: "confirm",
      confirmText: "Start New",
      onConfirm: () => startNewInvoice()
    });
  });

  el("btn-add-item")?.addEventListener("click", addManualItem);
  
  el("btn-reset-copies")?.addEventListener("click", () => {
    for (const item of state.fileItems) item.copies = 1;
    refreshAllRows();
    updateTotals();
    updateInvoicePreview();
    showToast("All copies reset to 1", "info");
  });

  el("btn-apply-all")?.addEventListener("click", () => {
    if (state.fileItems.length === 0) return;
    const first = state.fileItems[0];
    for (const item of state.fileItems) {
      item.paperSize = first.paperSize;
      item.colorMode = first.colorMode;
      item.unitPrice = getPriceForItem(item.colorMode, item.paperSize);
    }
    state.lastPaperSize = first.paperSize;
    state.lastColorMode = first.colorMode;
    refreshAllRows();
    updateTotals();
    updateExpressCard();
    updateInvoicePreview();
    persistSettingsToStorage();
    showToast(`Applied ${PAPER_SIZE_LABELS[first.paperSize]} / ${COLOR_MODE_LABELS[first.colorMode]} to all rows`, "success");
  });
  
  el("btn-clear-table")?.addEventListener("click", () => {
    if (state.fileItems.length === 0) return;
    showModal({
      title: "Clear Invoice",
      body: "Are you sure you want to clear all items from this invoice?",
      type: "danger",
      confirmText: "Clear All",
      onConfirm: () => clearAllInvoiceData()
    });
  });

  el("remarks")?.addEventListener("input", updateInvoiceRemarks);

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toUpperCase() === "C") {
      e.preventDefault();
      copyInvoiceAsImageAsync();
    }
  });
}

function bindSettingsEvents() {
  el("btn-settings-toggle")?.addEventListener("click", () => openDrawer("settings"));
  el("drawer-close")?.addEventListener("click", closeDrawer);
  el("drawer-overlay")?.addEventListener("click", closeDrawer);
  el("btn-drawer-cancel")?.addEventListener("click", closeDrawer);
  el("btn-save-settings")?.addEventListener("click", saveSettingsFromDrawer);

  // Segmented buttons inside modals (e.g. template editor)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".modal-content .seg-btn");
    if (!btn) return;
    const field = btn.dataset.segField;
    const value = btn.dataset.segValue;
    if (!field || !value) return;
    const group = btn.closest(".seg-control");
    if (group) {
      group.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    }
    const hidden = el(field);
    if (hidden) hidden.value = value;
  });
  
  el("btn-clear-all")?.addEventListener("click", () => {
    if (state.fileItems.length === 0) return;
    showModal({
      title: "Clear Invoice",
      body: "Are you sure you want to clear the current invoice data?",
      type: "danger",
      confirmText: "Clear",
      onConfirm: () => clearAllInvoiceData()
    });
  });
  
  el("btn-reset-settings")?.addEventListener("click", resetSettingsToDefaults);
  el("btn-add-template")?.addEventListener("click", saveCurrentAsTemplate);

  el("tab-history")?.addEventListener("click", () => switchDrawerView("history"));
  el("tab-settings")?.addEventListener("click", () => switchDrawerView("settings"));
}

function bindQrEvents() {
  el("btn-qr-upload")?.addEventListener("click", () => el("qr-input").click());
  el("btn-qr-clear")?.addEventListener("click", clearQrCode);
  el("qr-input")?.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      handleQrUpload(e.target.files[0]);
    }
  });
}

function bindNumericInputEvents() {
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" && e.target.type === "number") {
      const allowedKeys = ["0","1","2","3","4","5","6","7","8","9",".","Backspace","Delete","ArrowLeft","ArrowRight","Tab","Home","End","Enter"];
      if (e.ctrlKey || e.metaKey) return;
      if (!allowedKeys.includes(e.key)) e.preventDefault();
    }
  });
  document.addEventListener("paste", (e) => {
    if (e.target.tagName === "INPUT" && e.target.type === "number") {
      const data = e.clipboardData.getData("text");
      if (!/^\d+\.?\d*$/.test(data)) e.preventDefault();
    }
  });
}

function bindHeaderEvents() {
  el("btn-theme")?.addEventListener("click", toggleTheme);
  
  const kmodeToggle = el("header-kmode-toggle");
  if (kmodeToggle) {
    kmodeToggle.addEventListener("change", (e) => {
      toggleKMode(e.target.checked);
    });
  }
  
  el("btn-recent")?.addEventListener("click", () => openDrawer("history"));
  el("btn-revenue-dashboard")?.addEventListener("click", () => showRevenueDashboard());
  el("btn-daily-summary")?.addEventListener("click", () => showDailySummary());
  el("btn-clear-recent-history")?.addEventListener("click", () => clearAllHistory());
}

function bindMobilePreviewEvents() {
  const fab = el("preview-fab");
  if (fab) {
    fab.addEventListener("click", () => {
      const modal = el("preview-modal");
      if (modal) {
        modal.classList.add("open");
        const preview = el("invoice-preview");
        if (preview) {
           const clone = preview.cloneNode(true);
           clone.id = "invoice-preview-clone";
           const content = el("preview-modal-content");
           if (content) {
             content.innerHTML = "";
             content.appendChild(clone);
           }
        }
      }
    });
  }
  
  el("preview-modal-close")?.addEventListener("click", () => el("preview-modal").classList.remove("open"));
  el("preview-modal")?.addEventListener("click", (e) => {
    if (e.target === el("preview-modal")) el("preview-modal").classList.remove("open");
  });
}

function bindFilePreviewEvents() {
  el("file-preview-close")?.addEventListener("click", closeFilePreview);
  el("file-preview-back")?.addEventListener("click", closeFilePreview);
  el("file-preview-prev")?.addEventListener("click", () => navigatePreviewPage(-1));
  el("file-preview-next")?.addEventListener("click", () => navigatePreviewPage(1));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && el("file-preview-container")?.style.display !== "none") {
      closeFilePreview();
    }
    if (state._previewItemId) {
      if (e.key === "ArrowLeft") navigatePreviewPage(-1);
      if (e.key === "ArrowRight") navigatePreviewPage(1);
    }
  });
}

function bindBulkEvents() {
  el("btn-bulk-mode")?.addEventListener("click", toggleBulkMode);
  el("bulk-mark-done")?.addEventListener("click", bulkMarkDone);
  el("bulk-mark-paid")?.addEventListener("click", bulkMarkPaid);
  el("bulk-delete")?.addEventListener("click", bulkDelete);
}

function bindAllEvents() {
  bindDropZoneEvents();
  bindFileTableEvents();
  bindPricingMatrixEvents();
  bindPricingEvents();
  bindDiscountTierEvents();
  bindExportEvents();
  bindSettingsEvents();
  bindQrEvents();
  bindNumericInputEvents();
  bindHeaderEvents();
  bindMobilePreviewEvents();
  bindModalEvents();
  bindFilePreviewEvents();
  bindBulkEvents();
}
