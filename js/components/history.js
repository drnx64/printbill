/**
 * History Management
 */

let historyQuery = "";
let historyFilter = "all";

function entryMatchesHistoryFilter(entry) {
  if (historyFilter === "unpaid" && entry.isPaid) return false;
  if (historyFilter === "undone" && entry.isDone) return false;
  if (historyQuery) {
    const hay = `${entry.customerName || ""} ${entry.ref || ""} ${entry.date || ""}`.toLowerCase();
    if (!hay.includes(historyQuery)) return false;
  }
  return true;
}

window.exportHistoryCsv = function() {
  const history = readLocalStorage(STORAGE_KEYS.recentInvoices, []);
  if (!history.length) {
    showToast("No history to export", "error");
    return;
  }
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [[
    "ref", "date", "customer", "file", "paper", "color",
    "pages", "copies", "grandTotal", "remarks", "done", "paid", "timestamp",
  ]];
  for (const entry of history) {
    const files = entry.fileItems && entry.fileItems.length ? entry.fileItems : [{}];
    for (const f of files) {
      rows.push([
        entry.ref,
        entry.date,
        entry.customerName || "Walk-in",
        f.fileName || "",
        PAPER_SIZE_LABELS[f.paperSize] || "",
        COLOR_MODE_LABELS[f.colorMode] || "",
        f.pages ?? "",
        f.copies ?? "",
        entry.grandTotal ?? "",
        entry.remarks || "",
        entry.isDone ? "yes" : "no",
        entry.isPaid ? "yes" : "no",
        entry.timestamp ? new Date(entry.timestamp).toISOString() : "",
      ]);
    }
  }
  const csv = rows.map((r) => r.map(esc).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `printbill-history-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Exported ${history.length} order${history.length === 1 ? "" : "s"} to CSV`, "success");
};

function saveInvoiceToRecentHistory() {
  const totals = computeGrandTotal();
  const snapshot = {
    ref: state.invoiceRef,
    date: state.invoiceDate,
    customerName: state.customerName || "Walk-in",
    grandTotal: totals.grandTotal,
    itemCount: state.fileItems.length,
    fileItems: state.fileItems.map((i) => ({
      fileName: i.fileName,
      pages: i.pages,
      copies: i.copies,
      fileSize: i.fileSize,
      paperSize: i.paperSize,
      colorMode: i.colorMode,
    })),
    remarks: el("remarks").value.trim(),
    isDone: false,
    isPaid: false,
    timestamp: Date.now(),
  };

  const history = readLocalStorage(STORAGE_KEYS.recentInvoices, []);
  history.unshift(snapshot);
  if (history.length > MAX_RECENT_INVOICES) history.pop();
  writeLocalStorage(STORAGE_KEYS.recentInvoices, history);
}

window.deleteHistoryItem = function(idx) {
  showModal({
    title: "Remove History Item",
    body: "Are you sure you want to remove this item from your history?",
    type: "danger",
    confirmText: "Remove",
    onConfirm: () => {
      const history = readLocalStorage(STORAGE_KEYS.recentInvoices, []);
      history.splice(idx, 1);
      writeLocalStorage(STORAGE_KEYS.recentInvoices, history);
      renderHistoryList();
      showToast("Item removed from history", "info");
    },
  });
}

window.clearAllHistory = function() {
  showModal({
    title: "Clear History",
    body: "This will permanently remove all saved invoices from your history. This action cannot be undone.",
    type: "danger",
    confirmText: "Clear All",
    onConfirm: () => {
      writeLocalStorage(STORAGE_KEYS.recentInvoices, []);
      renderHistoryList();
      showToast("History cleared", "info");
    },
  });
}

window.toggleHistoryStatus = function(idx, field) {
  const history = readLocalStorage(STORAGE_KEYS.recentInvoices, []);
  if (history[idx]) {
    history[idx][field] = !history[idx][field];
    
    // If both are done/paid, ask to remove to declutter
    if (history[idx].isDone && history[idx].isPaid) {
      writeLocalStorage(STORAGE_KEYS.recentInvoices, history);
      renderHistoryList();
      
      showModal({
        title: "Order Completed",
        body: "This order is now marked as Done and Paid. Would you like to remove it from history to declutter?",
        type: "confirm",
        confirmText: "Remove from History",
        cancelText: "Keep in History",
        onConfirm: () => {
          const updatedHistory = readLocalStorage(STORAGE_KEYS.recentInvoices, []);
          updatedHistory.splice(idx, 1);
          writeLocalStorage(STORAGE_KEYS.recentInvoices, updatedHistory);
          renderHistoryList();
          showToast("Order cleared from history", "info");
        }
      });
    } else {
      writeLocalStorage(STORAGE_KEYS.recentInvoices, history);
      renderHistoryList();
      // Keep it expanded after toggle
      el(`history-item-${idx}`).classList.add("expanded");
    }
  }
}

window.toggleHistoryExpanded = function(idx) {
  const item = el(`history-item-${idx}`);
  if (item) item.classList.toggle("expanded");
}

function renderHistoryList() {
  const container = el("history-list");
  if (!container) return;
  const history = readLocalStorage(STORAGE_KEYS.recentInvoices, []);

  if (history.length === 0) {
    const emptyCount = el("history-count");
    if (emptyCount) emptyCount.textContent = "";
    container.innerHTML =
      '<div class="dropdown-empty">No recent invoices</div>';
    return;
  }

  const filtered = history
    .map((entry, idx) => ({ entry, idx }))
    .filter(({ entry }) => entryMatchesHistoryFilter(entry));

  const countEl = el("history-count");
  if (countEl) {
    countEl.textContent = filtered.length === history.length
      ? `${history.length}`
      : `${filtered.length} / ${history.length}`;
  }

  if (filtered.length === 0) {
    container.innerHTML =
      '<div class="dropdown-empty">No matching invoices</div>';
    return;
  }

  container.innerHTML = "";
  filtered.forEach(({ entry, idx }) => {
    const item = buildElement("div", {
      className: `history-item${entry.isDone ? " is-done" : ""}${entry.isPaid ? " is-paid" : ""}`,
      id: `history-item-${idx}`,
    });

    const fileRows = entry.fileItems
      ? entry.fileItems
          .map((f) => {
            const sizeStr = f.fileSize ? ` <span class="history-file-size">(${formatSize(f.fileSize)})</span>` : "";
            const paperLabel = PAPER_SIZE_LABELS[f.paperSize] || "Short";
            const modeLabel = COLOR_MODE_LABELS[f.colorMode] || "B&W";

            return `
      <div class="history-file-row">
        <div class="history-file-info">
          <span class="history-file-name">${truncateText(f.fileName, 24)}</span>
          <div style="display:flex;gap:4px;align-items:center">
            <span class="meta-pill" style="font-size:8px;padding:1px 4px;background:var(--bg-card);border:1px solid var(--border)">${paperLabel}</span>
            <span class="meta-pill" style="font-size:8px;padding:1px 4px;background:var(--bg-card);border:1px solid var(--border)">${modeLabel}</span>
            ${sizeStr}
          </div>
        </div>
        <span class="history-file-calc">${f.pages} pg × ${f.copies} qty</span>
      </div>
    `;
          })
          .join("")
      : "";

    const remarksHtml = entry.remarks
      ? `
      <div class="history-remarks">
        <div class="history-remarks-header">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
           <span>Special Instructions</span>
        </div>
        <div class="history-remarks-content">${entry.remarks}</div>
      </div>
    `
      : "";

    item.innerHTML = `
      <div class="history-item-header">
        <div class="history-item-top">
          ${bulkModeActive ? `<input type="checkbox" id="bulk-check-${idx}" class="bulk-checkbox" ${bulkSelected.has(idx) ? 'checked' : ''} style="margin-right:8px;accent-color:var(--accent)" />` : ''}
          <div style="display:flex;flex-direction:column">
            <span class="history-item-name" style="font-size:16px;color:var(--accent);font-weight:700;line-height:1.2">${entry.customerName}</span>
            <span class="history-item-ref" style="font-size:10px;color:var(--text-3);font-family:var(--font-mono)">${entry.ref}</span>
          </div>
          <span class="history-item-total">${formatPeso(entry.grandTotal)}</span>
        </div>
        <div class="history-item-meta">
          <span>${entry.date}</span>
          <span>•</span>
          <span>${entry.itemCount || 0} items</span>
        </div>
      </div>
      <div class="history-item-body">
        <div class="history-files">
          ${fileRows}
        </div>
        ${remarksHtml}
        <div class="history-actions">
          <button class="btn-history-action btn-reprint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4"/></svg>
            Reprint
          </button>
          <button class="btn-history-action btn-done${entry.isDone ? " active-done" : ""}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            Done
          </button>
          <button class="btn-history-action btn-paid${entry.isPaid ? " active-paid" : ""}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Paid
          </button>
          <button class="btn-history-action danger btn-delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </div>
    `;

    // Bind Events
    const headerEl = item.querySelector(".history-item-header");
    if (bulkModeActive) {
      const checkbox = item.querySelector(`#bulk-check-${idx}`);
      if (checkbox) {
        checkbox.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleBulkSelect(idx);
        });
      }
      headerEl.addEventListener("click", (e) => {
        if (e.target.closest(".bulk-checkbox")) return;
        toggleBulkSelect(idx);
      });
    } else {
      headerEl.addEventListener("click", () => toggleHistoryExpanded(idx));
    }
    item.querySelector(".btn-reprint").addEventListener("click", (e) => { e.stopPropagation(); quickReprint(idx); });
    item.querySelector(".btn-done").addEventListener("click", (e) => { e.stopPropagation(); toggleHistoryStatus(idx, 'isDone'); });
    item.querySelector(".btn-paid").addEventListener("click", (e) => { e.stopPropagation(); toggleHistoryStatus(idx, 'isPaid'); });
    item.querySelector(".btn-delete").addEventListener("click", (e) => { e.stopPropagation(); deleteHistoryItem(idx); });

    container.appendChild(item);
  });
}

function quickReprint(idx) {
  const history = readLocalStorage(STORAGE_KEYS.recentInvoices, []);
  const entry = history[idx];
  if (!entry || !entry.fileItems || entry.fileItems.length === 0) return;

  if (state.fileItems.length > 0) {
    showModal({
      title: "Reprint Order",
      body: `Add ${entry.fileItems.length} items from ${entry.ref}? Current invoice will be cleared.`,
      type: "confirm",
      confirmText: "Clear & Reprint",
      cancelText: "Cancel",
      onConfirm: () => {
        clearAllInvoiceData();
        addHistoryItemsToInvoice(entry);
      },
    });
  } else {
    addHistoryItemsToInvoice(entry);
  }
}

function addHistoryItemsToInvoice(entry) {
  for (const fi of entry.fileItems) {
    const id = state.nextItemId++;
    const item = {
      id,
      fileName: fi.fileName,
      pages: fi.pages,
      copies: fi.copies,
      colorMode: fi.colorMode,
      paperSize: fi.paperSize,
      unitPrice: getPriceForItem(fi.colorMode, fi.paperSize),
      isPageExact: true,
      isManual: true,
      needsPageEntry: false,
      _previewDataUrl: null,
    };
    state.fileItems.push(item);
    renderFileTableRow(item);
  }
  showCompactDropZone();
  updateTotals();
  updateExpressCard();
  showToast(`Reprinted ${entry.fileItems.length} items from ${entry.ref}`, "success");
  closeDrawer();
}

// ─── Bulk Selection Mode ──────────────────────────────────────────────────

let bulkModeActive = false;
const bulkSelected = new Set();

function toggleBulkMode() {
  bulkModeActive = !bulkModeActive;
  bulkSelected.clear();
  updateBulkUI();
  renderHistoryList();
}

function updateBulkUI() {
  const bar = el("bulk-actions");
  const countEl = el("bulk-count");
  const btn = el("btn-bulk-mode");
  if (bar) bar.style.display = bulkModeActive && bulkSelected.size > 0 ? "flex" : "none";
  if (countEl) countEl.textContent = `${bulkSelected.size} selected`;
  if (btn) {
    btn.style.background = bulkModeActive ? "var(--accent)" : "";
    btn.style.color = bulkModeActive ? "var(--bg)" : "";
  }
}

function toggleBulkSelect(idx) {
  if (bulkSelected.has(idx)) bulkSelected.delete(idx);
  else bulkSelected.add(idx);

  const checkbox = document.querySelector(`#bulk-check-${idx}`);
  if (checkbox) checkbox.checked = bulkSelected.has(idx);

  updateBulkUI();
}

function bulkMarkDone() {
  if (bulkSelected.size === 0) return;
  const history = readLocalStorage(STORAGE_KEYS.recentInvoices, []);
  for (const idx of bulkSelected) {
    if (history[idx]) history[idx].isDone = true;
  }
  writeLocalStorage(STORAGE_KEYS.recentInvoices, history);
  bulkSelected.clear();
  updateBulkUI();
  renderHistoryList();
  showToast("Marked as done", "success");
}

function bulkMarkPaid() {
  if (bulkSelected.size === 0) return;
  const history = readLocalStorage(STORAGE_KEYS.recentInvoices, []);
  for (const idx of bulkSelected) {
    if (history[idx]) history[idx].isPaid = true;
  }
  writeLocalStorage(STORAGE_KEYS.recentInvoices, history);
  bulkSelected.clear();
  updateBulkUI();
  renderHistoryList();
  showToast("Marked as paid", "success");
}

function bulkDelete() {
  if (bulkSelected.size === 0) return;
  showModal({
    title: "Delete Selected",
    body: `Are you sure you want to remove ${bulkSelected.size} item(s) from history?`,
    type: "danger",
    confirmText: "Delete",
    onConfirm: () => {
      const history = readLocalStorage(STORAGE_KEYS.recentInvoices, []);
      const sorted = Array.from(bulkSelected).sort((a, b) => b - a);
      for (const idx of sorted) {
        history.splice(idx, 1);
      }
      writeLocalStorage(STORAGE_KEYS.recentInvoices, history);
      bulkSelected.clear();
      updateBulkUI();
      renderHistoryList();
      showToast("Selected items deleted", "info");
    }
  });
}
