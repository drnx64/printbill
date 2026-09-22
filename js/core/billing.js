/**
 * Pricing Helpers
 */
function getPriceForItem(colorMode, paperSize) {
  const mode = (colorMode || "bw").toLowerCase();
  const size = (paperSize || "short").toLowerCase();

  if (state.pricing[mode] && state.pricing[mode][size]) {
    return state.pricing[mode][size];
  }

  // Fallback for legacy "color" key
  if (mode === "color" && state.pricing.color_small) {
    return state.pricing.color_small[size] || 3.0;
  }

  return 3.0;
}

function getPricingMatrixValues() {
  const matrix = {};

  for (const mode of COLOR_MODES) {
    matrix[mode] = {};
    for (const size of PAPER_SIZES) {
      matrix[mode][size] = parseFloat(el(`price-${mode}-${size}`).value) || 0;
    }
  }

  return matrix;
}

/**
 * Billing Calculations
 */
function computeItemTotal(item) {
  return item.pages * item.copies * item.unitPrice;
}

function computeTotalPrintedPages() {
  return state.fileItems.reduce((sum, i) => sum + i.pages * i.copies, 0);
}

function computeSubtotal() {
  return state.fileItems.reduce((sum, i) => sum + computeItemTotal(i), 0);
}

function resolveActiveTier(totalPages) {
  const sorted = [...state.discountTiers].sort(
    (a, b) => b.minPages - a.minPages,
  );
  return sorted.find((t) => totalPages >= t.minPages) || null;
}

function computeGrandTotal() {
  const subtotal = computeSubtotal();
  const totalPages = computeTotalPrintedPages();
  const activeTier = resolveActiveTier(totalPages);

  const discountAmt = activeTier
    ? subtotal * (activeTier.discountPct / 100)
    : 0;
  const discountedPrice = subtotal - discountAmt;
  const taxAmt = state.settings.isTaxEnabled
    ? discountedPrice * (state.settings.taxRate / 100)
    : 0;

  const rawTotal = discountedPrice + taxAmt;
  let grandTotal = rawTotal;
  let roundingAmt = 0;

  if (state.settings.shouldRoundUp && grandTotal % 1 > 0) {
    grandTotal = Math.ceil(grandTotal);
    roundingAmt = grandTotal - rawTotal;
  }

  return {
    subtotal,
    discountAmt,
    discountedPrice,
    taxAmt,
    rawTotal,
    roundingAmt,
    grandTotal,
    activeTier,
  };
}

function updateTotals() {
  const totals = computeGrandTotal();
  const totalPages = computeTotalPrintedPages();

  const totalPagesEl = el("tfoot-total-pages");
  const subtotalEl = el("tfoot-subtotal");
  const collectEl = el("btn-collect-amount");

  if (totalPagesEl) totalPagesEl.textContent = totalPages;
  if (subtotalEl) subtotalEl.textContent = formatPeso(totals.subtotal);
  if (collectEl) collectEl.textContent = formatPeso(totals.grandTotal);

  renderDiscountTiers();
  updateInvoicePreview();
}
