/**
 * Settings & Persistence
 */

async function persistSettingsToStorage() {
  await Promise.all([
    writeDb(STORAGE_KEYS.settings, {
      taxRate: state.settings.taxRate,
      isTaxEnabled: state.settings.isTaxEnabled,
      isVatVisibleOnInvoice: state.settings.isVatVisibleOnInvoice,
      shouldRoundUp: state.settings.shouldRoundUp,
      defaultCopies: state.settings.defaultCopies,
      isKMode: state.settings.isKMode,
      isExpressMode: state.settings.isExpressMode,
      showUnitPrice: state.settings.showUnitPrice,
      showModeOnInvoice: state.settings.showModeOnInvoice,
      discordWebhookUrl: state.settings.discordWebhookUrl,
      discountTiers: state.discountTiers,
      preferDefaults: state.settings.preferDefaults,
      defaultPaperSize: state.settings.defaultPaperSize,
      defaultColorMode: state.settings.defaultColorMode,
    }),
    writeDb(STORAGE_KEYS.pricing, state.pricing),
    writeDb(STORAGE_KEYS.pricingStandard, state.pricingStandard),
    writeDb(STORAGE_KEYS.pricingKMode, state.pricingKMode),
    writeDb(STORAGE_KEYS.cumulativeStats, state.cumulativeStats),
    writeDb(STORAGE_KEYS.shopInfo, state.shopInfo),
    writeDb(STORAGE_KEYS.fileItems, state.fileItems.map((i) => {
      const { _processing, _processingStage, _processingPct, ...rest } = i;
      return rest;
    })),
    writeDb(STORAGE_KEYS.qrCode, state.qrCode),
    writeDb(STORAGE_KEYS.orderTemplates, state.orderTemplates),
    writeDb(STORAGE_KEYS.pricingVersion, PRICING_VERSION),
    writeDb(STORAGE_KEYS.lastPaperSize, state.lastPaperSize),
    writeDb(STORAGE_KEYS.lastColorMode, state.lastColorMode),
    writeDb(STORAGE_KEYS.draft, {
      invoiceRef: state.invoiceRef,
      invoiceDate: state.invoiceDate,
      remarks: el("remarks")?.value || "",
    }),
  ]);
}

async function loadSettingsFromStorage() {
  const [
    shopInfo,
    settings,
    pricing,
    pricingStandard,
    pricingKMode,
    cumStats,
    savedItems,
    theme,
    qrCode,
    templates,
    pricingVersion,
    lastPaperSize,
    lastColorMode,
    draft,
  ] = await Promise.all([
    readDb(STORAGE_KEYS.shopInfo),
    readDb(STORAGE_KEYS.settings),
    readDb(STORAGE_KEYS.pricing),
    readDb(STORAGE_KEYS.pricingStandard),
    readDb(STORAGE_KEYS.pricingKMode),
    readDb(STORAGE_KEYS.cumulativeStats),
    readDb(STORAGE_KEYS.fileItems),
    readDb(STORAGE_KEYS.theme, "dark"),
    readDb(STORAGE_KEYS.qrCode),
    readDb(STORAGE_KEYS.orderTemplates, []),
    readDb(STORAGE_KEYS.pricingVersion, 0),
    readDb(STORAGE_KEYS.lastPaperSize, "short"),
    readDb(STORAGE_KEYS.lastColorMode, "bw"),
    readDb(STORAGE_KEYS.draft),
  ]);

  if (shopInfo) Object.assign(state.shopInfo, shopInfo);

  if (settings) {
    state.settings.taxRate = settings.taxRate ?? TAX_RATE_DEFAULT;
    state.settings.isTaxEnabled = settings.isTaxEnabled ?? true;
    state.settings.isVatVisibleOnInvoice = settings.isVatVisibleOnInvoice ?? true;
    state.settings.shouldRoundUp = settings.shouldRoundUp ?? false;
    state.settings.defaultCopies = settings.defaultCopies ?? DEFAULT_COPIES;
    state.settings.isKMode = settings.isKMode ?? false;
    state.settings.isExpressMode = settings.isExpressMode ?? false;
    state.settings.showUnitPrice = settings.showUnitPrice ?? true;
    state.settings.showModeOnInvoice = settings.showModeOnInvoice ?? true;
    state.settings.discordWebhookUrl = settings.discordWebhookUrl ?? "";
    state.settings.preferDefaults = settings.preferDefaults ?? false;
    state.settings.defaultPaperSize = settings.defaultPaperSize ?? "short";
    state.settings.defaultColorMode = settings.defaultColorMode ?? "bw";
    if (settings.discountTiers) state.discountTiers = settings.discountTiers;
  }

  state.lastPaperSize = lastPaperSize || "short";
  state.lastColorMode = lastColorMode || "bw";

  // Restore draft (REF# / date / remarks) so half-saved invoices survive reloads
  state._hadDraft = false;
  if (draft && typeof draft === "object") {
    if (draft.invoiceRef) state.invoiceRef = draft.invoiceRef;
    if (draft.invoiceDate) state.invoiceDate = draft.invoiceDate;
    if (draft.remarks) {
      const remarksEl = el("remarks");
      if (remarksEl) remarksEl.value = draft.remarks;
      state._hadDraft = true;
    }
  }

  // Force-apply new default pricing matrix when PRICING_VERSION changes
  const needsPricingReset = (pricingVersion || 0) < PRICING_VERSION;
  if (!needsPricingReset) {
    if (pricingStandard) state.pricingStandard = mergePricing(state.pricingStandard, pricingStandard);
    if (pricingKMode) state.pricingKMode = mergePricing(state.pricingKMode, pricingKMode);
    if (pricing) state.pricing = mergePricing(state.pricing, pricing);
  }

  if (cumStats) Object.assign(state.cumulativeStats, cumStats);
  if (qrCode) state.qrCode = qrCode;
  if (templates && Array.isArray(templates)) state.orderTemplates = templates;

  if (savedItems && Array.isArray(savedItems)) {
    state.fileItems = savedItems;
    if (state.fileItems.length > 0) {
      state.nextItemId = Math.max(...state.fileItems.map((i) => i.id)) + 1;
      state._hadDraft = true;
    }
  }

  // Initial pricing set based on K-Mode
  state.pricing = JSON.parse(JSON.stringify(
    state.settings.isKMode ? state.pricingKMode : state.pricingStandard
  ));

  applyTheme(theme);
}

// Deep-merges saved pricing over defaults so missing modes/sizes (e.g. bw_image) fall back to defaults
function mergePricing(base, saved) {
  const merged = JSON.parse(JSON.stringify(base));
  if (!saved || typeof saved !== "object") return merged;
  for (const mode of Object.keys(merged)) {
    if (!saved[mode]) continue;
    for (const size of Object.keys(merged[mode])) {
      const v = parseFloat(saved[mode][size]);
      if (!isNaN(v)) merged[mode][size] = v;
    }
  }
  return merged;
}

function handleQrUpload(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // 1:1 Square Cropping via Canvas
      const canvas = document.createElement("canvas");
      const size = Math.min(img.width, img.height);
      canvas.width = 400; // Standardize stored size
      canvas.height = 400;
      const ctx = canvas.getContext("2d");

      const offsetX = (img.width - size) / 2;
      const offsetY = (img.height - size) / 2;

      ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, 400, 400);
      const b64 = canvas.toDataURL("image/png");

      state.qrCode = b64;
      if (el("qr-preview-img")) el("qr-preview-img").src = b64;
      updateInvoicePreview();
      showToast("QR Code updated", "success");
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function clearQrCode() {
  state.qrCode = "";
  if (el("qr-preview-img")) el("qr-preview-img").src = "";
  updateInvoicePreview();
  showToast("QR Code cleared", "info");
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const sun = el("icon-sun");
  const moon = el("icon-moon");
  if (sun && moon) {
    sun.style.display = theme === "dark" ? "block" : "none";
    moon.style.display = theme === "dark" ? "none" : "block";
  }
}

async function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  await writeDb(STORAGE_KEYS.theme, next);
}

function toggleKMode(enabled) {
  state.settings.isKMode = enabled;
  state.pricing = JSON.parse(JSON.stringify(
    enabled ? state.pricingKMode : state.pricingStandard
  ));

  applyPricingMatrixToUI();

  for (const item of state.fileItems) {
    if (!item.isCustomPrice) {
      item.unitPrice = getPriceForItem(item.colorMode, item.paperSize);
    }
  }

  refreshAllRows();
  updateTotals();
  updateInvoicePreview();

  showToast(enabled ? "K-Mode Active 🤝" : "Standard Pricing Restored", "info");
}

function applyPricingMatrixToUI() {
  for (const mode of COLOR_MODES) {
    for (const size of PAPER_SIZES) {
      const input = el(`price-${mode}-${size}`);
      if (input) input.value = state.pricing[mode]?.[size] || 0;
    }
  }
}

function syncPricingMatrixToState() {
  state.pricing = getPricingMatrixValues();
  if (state.settings.isKMode) {
    state.pricingKMode = JSON.parse(JSON.stringify(state.pricing));
  } else {
    state.pricingStandard = JSON.parse(JSON.stringify(state.pricing));
  }
}

function renderDiscountTiers() {
  const container = el("discount-tiers");
  if (!container) return;
  container.innerHTML = "";

  const totalPages = computeTotalPrintedPages();
  const activeTier = resolveActiveTier(totalPages);

  for (let i = 0; i < state.discountTiers.length; i++) {
    const tier = state.discountTiers[i];
    const isActive = activeTier === tier;
    const row = buildElement("div", {
      className: `tier-row${isActive ? " active" : ""}`,
    });

    row.innerHTML = `
      <span class="tier-label">${isActive ? "✦" : "○"}</span>
      <input type="number" class="tier-input" value="${tier.minPages}" min="1" step="1"
        data-tier="${i}" data-field="minPages" />
      <span class="tier-label">pages</span>
      <span class="tier-label">→</span>
      <input type="number" class="tier-input" value="${tier.discountPct}" min="0" max="100" step="1"
        data-tier="${i}" data-field="discountPct" />
      <span class="tier-label">% off</span>
      <button class="tier-remove-btn" data-tier="${i}" title="Remove tier">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;
    container.appendChild(row);
  }
  updateTierHint(totalPages, activeTier);
}

function refreshDiscountTierHighlights() {
  renderDiscountTiers();
}

function updateTierHint(totalPages, activeTier) {
  const hintEl = el("tier-hint");
  if (!hintEl) return;

  const nextTier = [...state.discountTiers]
    .sort((a, b) => a.minPages - b.minPages)
    .find((t) => t.minPages > totalPages);

  if (nextTier) {
    const diff = nextTier.minPages - totalPages;
    hintEl.textContent = `Add ${diff} more pages for ${nextTier.discountPct}% off!`;
    hintEl.style.display = "block";
  } else {
    hintEl.style.display = "none";
  }
}

function addDiscountTier() {
  const lastTier = state.discountTiers[state.discountTiers.length - 1];
  const newMinPages = lastTier ? lastTier.minPages + 15 : 15;
  state.discountTiers.push({ minPages: newMinPages, discountPct: 5 });
  renderDiscountTiers();
  updateTotals();
}

function removeDiscountTier(index) {
  state.discountTiers.splice(index, 1);
  renderDiscountTiers();
  updateTotals();
}

function resetSettingsToDefaults() {
  showModal({
    title: "Reset Settings",
    body: "Are you sure you want to reset all settings to their defaults? This cannot be undone.",
    type: "danger",
    confirmText: "Reset Defaults",
    onConfirm: async () => {
      await window.appDb.clear();
      state.settings = {
        taxRate: TAX_RATE_DEFAULT,
        isTaxEnabled: true,
        isVatVisibleOnInvoice: true,
        shouldRoundUp: false,
        defaultCopies: DEFAULT_COPIES,
        isKMode: false,
        isExpressMode: false,
        showUnitPrice: true,
        showModeOnInvoice: true,
        discordWebhookUrl: "",
        preferDefaults: false,
        defaultPaperSize: "short",
        defaultColorMode: "bw",
      };
      state.shopInfo = {
        name: "Printing Shop",
        address: "",
        phone: "",
        email: "",
        paymentTerms: "Due on receipt",
      };
      state.pricing = JSON.parse(JSON.stringify(PRICING_DEFAULTS));
      state.pricingStandard = JSON.parse(JSON.stringify(PRICING_DEFAULTS));
      state.pricingKMode = JSON.parse(JSON.stringify(KAKILALA_PRICING_DEFAULTS));
      state.discountTiers = JSON.parse(JSON.stringify(DISCOUNT_TIERS_DEFAULT));
      applyLoadedSettingsToUI();
      renderDiscountTiers();
      closeDrawer();
      showToast("Settings reset to defaults", "info");
    },
  });
}

function loadSettingsIntoDrawer() {
  const s = state.shopInfo;
  el("s-shop-name").value = s.name;
  el("s-shop-address").value = s.address;
  el("s-shop-phone").value = s.phone;
  el("s-shop-email").value = s.email;
  el("s-payment-terms").value = s.paymentTerms;

  el("tax-rate").value = state.settings.taxRate;
  el("default-copies").value = state.settings.defaultCopies;
  el("tax-enabled").checked = state.settings.isTaxEnabled;
  el("round-up").checked = state.settings.shouldRoundUp;
  el("vat-show-invoice").checked = state.settings.isVatVisibleOnInvoice;
  el("express-mode").checked = state.settings.isExpressMode;
  if (el("show-unit-price")) el("show-unit-price").checked = state.settings.showUnitPrice;
  if (el("show-mode-col")) el("show-mode-col").checked = state.settings.showModeOnInvoice;
  if (el("prefer-defaults")) el("prefer-defaults").checked = state.settings.preferDefaults;
  if (el("default-paper-size")) el("default-paper-size").value = state.settings.defaultPaperSize;
  if (el("default-color-mode")) el("default-color-mode").value = state.settings.defaultColorMode;
  const formatRows = el("default-format-rows");
  if (formatRows) formatRows.style.display = state.settings.preferDefaults ? "flex" : "none";
  document.querySelectorAll('[data-seg-group="default-paper-size"] .seg-btn').forEach((b) => {
    b.classList.toggle("active", b.dataset.segValue === state.settings.defaultPaperSize);
  });
  document.querySelectorAll('[data-seg-group="default-color-mode"] .seg-btn').forEach((b) => {
    b.classList.toggle("active", b.dataset.segValue === state.settings.defaultColorMode);
  });

  if (el("discord-webhook")) el("discord-webhook").value = state.settings.discordWebhookUrl || "";

  if (el("qr-preview-img")) el("qr-preview-img").src = state.qrCode || "";

  applyPricingMatrixToUI();
  renderDiscountTiers();
  renderTemplates();
}

function saveSettingsFromDrawer() {
  state.shopInfo = {
    name: el("s-shop-name").value.trim() || "",
    address: el("s-shop-address").value.trim(),
    phone: el("s-shop-phone").value.trim(),
    email: el("s-shop-email").value.trim(),
    paymentTerms: el("s-payment-terms").value.trim() || "Due on receipt",
  };

  state.settings.taxRate = parseFloat(el("tax-rate").value) || TAX_RATE_DEFAULT;
  state.settings.defaultCopies = parseInt(el("default-copies").value) || DEFAULT_COPIES;
  state.settings.isTaxEnabled = el("tax-enabled").checked;
  state.settings.shouldRoundUp = el("round-up").checked;
  state.settings.isVatVisibleOnInvoice = el("vat-show-invoice").checked;
  state.settings.isExpressMode = el("express-mode").checked;
  if (el("show-unit-price")) state.settings.showUnitPrice = el("show-unit-price").checked;
  if (el("show-mode-col")) state.settings.showModeOnInvoice = el("show-mode-col").checked;
  if (el("prefer-defaults")) state.settings.preferDefaults = el("prefer-defaults").checked;
  if (el("default-paper-size")) state.settings.defaultPaperSize = el("default-paper-size").value || "short";
  if (el("default-color-mode")) state.settings.defaultColorMode = el("default-color-mode").value || "bw";
  state.settings.discordWebhookUrl = el("discord-webhook") ? el("discord-webhook").value.trim() : "";

  el("tax-rate-sub").textContent = `${state.settings.taxRate}%`;

  syncPricingMatrixToState();
  persistSettingsToStorage();
  updateTotals();
  updateInvoicePreview();
  closeDrawer();
  showToast("Settings saved", "success");
}

function applyLoadedSettingsToUI() {
  el("default-copies").value = state.settings.defaultCopies;
  el("tax-rate").value = state.settings.taxRate;
  el("tax-enabled").checked = state.settings.isTaxEnabled;
  el("round-up").checked = state.settings.shouldRoundUp;
  el("vat-show-invoice").checked = state.settings.isVatVisibleOnInvoice;
  el("header-kmode-toggle").checked = state.settings.isKMode;
  el("express-mode").checked = state.settings.isExpressMode;
  if (el("show-unit-price")) el("show-unit-price").checked = state.settings.showUnitPrice;
  if (el("show-mode-col")) el("show-mode-col").checked = state.settings.showModeOnInvoice;
  if (el("prefer-defaults")) el("prefer-defaults").checked = state.settings.preferDefaults;
  if (el("default-paper-size")) el("default-paper-size").value = state.settings.defaultPaperSize;
  if (el("default-color-mode")) el("default-color-mode").value = state.settings.defaultColorMode;
  const fmtRows = el("default-format-rows");
  if (fmtRows) fmtRows.style.display = state.settings.preferDefaults ? "flex" : "none";

  el("tax-rate-sub").textContent = `${state.settings.taxRate}%`;
  el("tax-rate-row").style.display = state.settings.isTaxEnabled ? "flex" : "none";
  el("vat-show-row").style.display = state.settings.isTaxEnabled ? "flex" : "none";
  applyPricingMatrixToUI();
}

function renderTemplates() {
  const container = el("template-list");
  if (!container) return;
  container.innerHTML = "";

  if (state.orderTemplates.length === 0) {
    container.innerHTML = '<div style="font-size:11px;color:var(--text-3);padding:8px 0">No templates saved yet</div>';
    return;
  }

  for (let i = 0; i < state.orderTemplates.length; i++) {
    const t = state.orderTemplates[i];
    const row = buildElement("div", { className: "tier-row" });
    const sizeLabel = { long: "Long", short: "Short", a4: "A4" }[t.paperSize] || "Short";
    const modeLabel = COLOR_MODE_LABELS[t.colorMode] || "B&W";
    row.innerHTML = `
      <span class="tier-label" style="flex:1;color:var(--text-1);font-weight:500;font-size:12px">${t.name}</span>
      <span class="tier-label" style="font-size:10px">${sizeLabel}</span>
      <span class="tier-label" style="font-size:10px">${modeLabel}</span>
      <span class="tier-label" style="font-size:10px">${t.defaultCopies}c</span>
      <button class="tier-remove-btn" data-template="${i}" title="Delete template">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;
    container.appendChild(row);
  }
}

// Delegated once at bind time — never inside renderTemplates (listeners used to stack)
function handleTemplateListClick(e) {
  const btn = e.target.closest(".tier-remove-btn[data-template]");
  if (!btn || !e.currentTarget.contains(btn)) return;
  const idx = parseInt(btn.dataset.template);
  if (isNaN(idx)) return;
  state.orderTemplates.splice(idx, 1);
  persistSettingsToStorage();
  renderTemplates();
  showToast("Template removed", "info");
}

function saveCurrentAsTemplate() {
  const colorButtons = COLOR_MODES.map((m) =>
    `<button type="button" class="seg-btn${m === "bw" ? " active" : ""}" data-seg-field="template-color-mode" data-seg-value="${m}">${COLOR_MODE_LABELS[m]}</button>`
  ).join("");
  const paperButtons = PAPER_SIZES.map((s) =>
    `<button type="button" class="seg-btn${s === "short" ? " active" : ""}" data-seg-field="template-paper-size" data-seg-value="${s}">${PAPER_SIZE_LABELS[s]}</button>`
  ).join("");

  showModal({
    title: "Save Template",
    bodyHtml: `
      <div class="field-row">
        <label class="field-label" for="template-name-input">Template name</label>
        <input type="text" id="template-name-input" class="field-input" placeholder="e.g. Thesis B&W Long" autofocus />
        <input type="hidden" id="template-color-mode" value="bw" />
        <input type="hidden" id="template-paper-size" value="short" />
      </div>
      <div class="field-row">
        <span class="field-label">Default Color Mode</span>
        <div class="seg-control" data-seg-group="template-color-mode">${colorButtons}</div>
      </div>
      <div class="field-row">
        <span class="field-label">Default Paper Size</span>
        <div class="seg-control" data-seg-group="template-paper-size">${paperButtons}</div>
      </div>
      <div class="field-row">
        <label class="field-label" for="template-copies">Default Copies</label>
        <input type="number" id="template-copies" class="field-input" value="1" min="1" step="1" />
      </div>
    `,
    type: "confirm",
    confirmText: "Save Template",
    onConfirm: () => {
      const name = el("template-name-input")?.value.trim();
      if (!name) {
        showToast("Please enter a template name", "error");
        return;
      }
      state.orderTemplates.push({
        name,
        colorMode: el("template-color-mode")?.value || "bw",
        paperSize: el("template-paper-size")?.value || "short",
        defaultCopies: parseInt(el("template-copies")?.value) || 1,
      });
      persistSettingsToStorage();
      renderTemplates();
      showToast(`Template "${name}" saved`, "success");
    },
  });
}
