/**
 * Main Entry Point
 */

async function init() {
  // Generate initial invoice metadata if needed
  if (!state.invoiceRef) state.invoiceRef = generateRef();
  if (!state.invoiceDate) state.invoiceDate = formatDate(new Date());

  // Load settings (now async via IndexedDB)
  await loadSettingsFromStorage();
  
  applyLoadedSettingsToUI();
  applyPricingMatrixToUI();

  // Render loaded items
  if (state.fileItems.length > 0) {
    el("file-table-container").style.display = "block";
    showCompactDropZone();
    for (const item of state.fileItems) {
      renderFileTableRow(item);
    }
  }

  // Render discount tiers
  renderDiscountTiers();

  // Set invoice date
  el("inv-date").textContent = `DATE: ${state.invoiceDate}`;

  // Start real-time clock
  updateClock();
  setInterval(updateClock, 1000);

  // Initial preview render
  updateTotals();
  updateInvoicePreview();

  // Bind all events
  bindAllEvents();

  if (state._hadDraft) {
    const n = state.fileItems.length;
    const parts = [];
    if (n > 0) parts.push(`${n} item${n === 1 ? "" : "s"}`);
    if (el("remarks")?.value.trim()) parts.push("remarks");
    showToast(`Draft restored — ${parts.join(" & ")}`, "info");
    setStatus("Draft restored", "unsaved");
    setTimeout(() => setStatus("Ready"), 3000);
  } else {
    setStatus("Ready");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  init().catch(err => console.error("Initialization failed:", err));
});
