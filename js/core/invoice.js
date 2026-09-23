/**
 * Invoice Rendering & Exports
 */

function updateInvoicePreview() {
  applyUnitPriceVisibility();
  updateInvoiceHeader();
  updateInvoiceLineItems();
  updateInvoiceTotals();
  updateInvoiceRemarks();

  // Set QR Code
  const qrImg = el("inv-qr-image");
  const qrContainer = el("inv-qr-container");
  if (qrImg && qrContainer) {
    if (state.qrCode) {
      qrImg.src = state.qrCode;
      qrImg.style.width = `${INVOICE_QR_SIZE_PX}px`;
      qrImg.style.height = `${INVOICE_QR_SIZE_PX}px`;
      qrContainer.style.display = "flex";
    } else {
      qrContainer.style.display = "none";
    }
  }

  // ─── Dynamic Portrait Adjustment ───
  const preview = el("invoice-preview");
  const width = preview.offsetWidth || INVOICE_EXPORT_WIDTH_PX;
  const itemCount = state.fileItems.length;

  const minPortraitHeight = width * 1.35;
  const itemHeightBuffer =
    itemCount > 0 ? 400 + itemCount * 40 : minPortraitHeight;

  preview.style.minHeight = `${Math.max(minPortraitHeight, itemHeightBuffer)}px`;

  persistSettingsToStorage();
}

function applyUnitPriceVisibility() {
  const preview = el("invoice-preview");
  if (!preview) return;
  preview.classList.toggle("hide-unit-price", !state.settings.showUnitPrice);
  preview.classList.toggle("hide-mode-col", !state.settings.showModeOnInvoice);
}

function updateInvoiceHeader() {
  el("inv-ref").textContent = `REF# ${state.invoiceRef}`;
  el("inv-date").textContent = `DATE: ${state.invoiceDate}`;
}

function updateInvoiceLineItems() {
  const tbody = el("inv-items-body");

  if (state.fileItems.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align:center;padding:48px;color:#a09a94;font-size:12px">Upload files to see line items</td></tr>';
    return;
  }

  tbody.innerHTML = "";

  for (const item of state.fileItems) {
    const total = computeItemTotal(item);
    const tr = document.createElement("tr");

    const sizeLabel = PAPER_SIZE_LABELS[item.paperSize] || "Short";
    const modeMap = {
      bw: { label: "B&W", color: "var(--text-3)" },
      bw_image: { label: "B&W+Img", color: "var(--text-2)" },
      color_small: { label: "Small Color", color: "var(--blue)" },
      color_partial: { label: "Partial Color", color: "var(--amber)" },
      color_full: { label: "Full Color", color: "var(--accent)" },
      color: { label: "Color", color: "var(--blue)" }, // fallback
    };
    const modeInfo = modeMap[item.colorMode] || modeMap.bw;

    tr.innerHTML = `
      <td class="inv-item-name">${truncateText(item.fileName, 32)}${item.isManual ? ' <span style="font-size:9px;color:#a09a94">[manual]</span>' : ""}</td>
      <td class="inv-size">${sizeLabel}</td>
      <td class="inv-mode inv-mode-col"><span style="color:${modeInfo.color};font-weight:600">${modeInfo.label}</span></td>
      <td class="inv-num">${item.pages}</td>
      <td class="inv-num">${item.copies}</td>
      <td class="inv-price inv-unit-col">${formatPeso(item.unitPrice)}</td>
      <td class="inv-total">${formatPeso(total)}</td>
    `;
    tbody.appendChild(tr);
  }
}

function updateInvoiceTotals() {
  const totals = computeGrandTotal();

  el("inv-subtotal").textContent = formatPeso(totals.subtotal);

  const grandEl = el("inv-grand-total");
  const prevText = grandEl.textContent;
  grandEl.textContent = formatPeso(totals.grandTotal);

  if (prevText !== grandEl.textContent) {
    grandEl.style.transition = "color 0.3s";
    grandEl.style.color = "var(--green)";
    setTimeout(() => {
      grandEl.style.color = "";
    }, 400);
  }

  const discountRow = el("inv-discount-row");
  const discountedRow = el("inv-discounted-row");
  const taxRow = el("inv-tax-row");

  if (totals.activeTier) {
    discountRow.style.display = "flex";
    discountedRow.style.display = "flex";
    el("inv-discount-label").textContent =
      `Discount (${totals.activeTier.discountPct}%)`;
    el("inv-discount-val").textContent = `−${formatPeso(totals.discountAmt)}`;
    el("inv-discounted-val").textContent = formatPeso(totals.discountedPrice);
  } else {
    discountRow.style.display = "none";
    discountedRow.style.display = "none";
  }

  if (state.settings.isTaxEnabled && state.settings.isVatVisibleOnInvoice) {
    taxRow.style.display = "flex";
    el("inv-tax-label").textContent = `Tax / VAT (${state.settings.taxRate}%)`;
    el("inv-tax-val").textContent = formatPeso(totals.taxAmt);
  } else {
    taxRow.style.display = "none";
  }
}

function updateInvoiceRemarks() {
  const text = el("remarks").value.trim();
  const block = el("inv-remarks-block");
  const textEl = el("inv-remarks-text");
  block.style.display = text ? "block" : "none";
  textEl.textContent = text;
}

async function captureInvoiceCanvas() {
  const previewEl = el("invoice-preview");
  const clone = previewEl.cloneNode(true);

  clone.style.boxShadow = "none";
  clone.style.borderRadius = "0";
  clone.style.margin = "0";
  clone.style.width = `${INVOICE_EXPORT_WIDTH_PX}px`;
  clone.style.height = "auto";
  clone.style.minHeight = "auto";

  const container = document.createElement("div");
  container.setAttribute("data-theme", "light");
  container.style.cssText = [
    "position:fixed",
    "top:-99999px",
    "left:-99999px",
    `width:${INVOICE_EXPORT_WIDTH_PX}px`,
    "height:auto",
    "overflow:visible",
    "z-index:-1",
    "background:#ffffff",
    "padding:0",
    "margin:0",
  ].join(";");

  container.appendChild(clone);
  document.body.appendChild(container);

  try {
    const images = clone.getElementsByTagName("img");
    await Promise.all(
      Array.from(images).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }),
    );

    const canvas = await html2canvas(container, {
      scale: COPY_IMAGE_SCALE,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: INVOICE_EXPORT_WIDTH_PX,
    });
    return canvas;
  } finally {
    document.body.removeChild(container);
  }
}

async function copyInvoiceAsImageAsync() {
  try {
    setStatus("Capturing…", "analyzing");
    const canvas = await captureInvoiceCanvas();
    await attemptCopyCanvasToClipboard(canvas);
    setStatus("Copied!", "copied");
    setTimeout(() => setStatus("Ready"), 2000);
  } catch {
    setStatus("Ready");
    showToast("Failed to capture invoice", "error");
  }
}

async function attemptCopyCanvasToClipboard(canvas) {
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );

  if (navigator.clipboard && window.ClipboardItem) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      showToast("✓ Copied to clipboard!", "success");
      return;
    } catch {
      // Fall through
    }
  }

  triggerPngDownload(canvas);
  showToast("📥 Saved as PNG (clipboard unavailable)", "info");
}

function triggerPngDownload(canvas) {
  const link = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  link.download = `invoice-${state.invoiceRef}-${dateStr}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

async function saveAsPngAsync() {
  try {
    const canvas = await captureInvoiceCanvas();
    triggerPngDownload(canvas);
    showToast("📥 Invoice saved as PNG", "info");
  } catch {
    showToast("Failed to save PNG", "error");
  }
}

function printInvoice() {
  window.print();
}

function copyInvoiceAsText() {
  try {
    const lines = [];
    lines.push(`INVOICE — REF# ${state.invoiceRef}`);
    lines.push(`Date: ${state.invoiceDate}`);
    lines.push("");

    for (const item of state.fileItems) {
      const sizeLabel = PAPER_SIZE_LABELS[item.paperSize] || "Short";
      const modeLabel = COLOR_MODE_LONG_LABELS[item.colorMode] || "B&W";
      const total = computeItemTotal(item);
      const unitPart = state.settings.showUnitPrice ? ` @ ${formatPeso(item.unitPrice)}/pg` : "";
      lines.push(`${item.fileName} | ${sizeLabel} | ${modeLabel} | ${item.pages}pg × ${item.copies}qty${unitPart} | ${formatPeso(total)}`);
    }

    lines.push("");
    const totals = computeGrandTotal();
    lines.push(`Subtotal: ${formatPeso(totals.subtotal)}`);

    if (totals.activeTier) {
      lines.push(`Discount (${totals.activeTier.discountPct}%): −${formatPeso(totals.discountAmt)}`);
      lines.push(`Discounted: ${formatPeso(totals.discountedPrice)}`);
    }

    if (state.settings.isTaxEnabled) {
      lines.push(`Tax (${state.settings.taxRate}%): ${formatPeso(totals.taxAmt)}`);
    }

    lines.push(`Grand Total: ${formatPeso(totals.grandTotal)}`);

    const remarks = el("remarks")?.value.trim();
    if (remarks) {
      lines.push("");
      lines.push(`Remarks: ${remarks}`);
    }

    const text = lines.join("\n");

    navigator.clipboard.writeText(text).then(() => {
      showToast("Copied invoice as text!", "success");
    }).catch(() => {
      showToast("Failed to copy text", "error");
    });
  } catch {
    showToast("Failed to copy as text", "error");
  }
}

function startNewInvoice() {
  clearAllInvoiceData();
  state.invoiceRef = generateRef();
  state.invoiceDate = formatDate(new Date());
  updateInvoicePreview();
  showToast("New invoice started", "info");
}

function clearAllInvoiceData() {
  state.fileItems = [];
  state.nextItemId = 1;
  el("file-table-body").innerHTML = "";
  el("file-table-container").style.display = "none";
  const expressCard = el("express-card");
  if (expressCard) expressCard.style.display = "none";
  showFullDropZone();
  el("remarks").value = "";
  updateTotals();
  updateInvoicePreview();
}

function placeOrder() {
  if (state.fileItems.length === 0) {
    showToast("Please upload at least one file before placing an order.", "error");
    el("drop-zone").scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const hasUnfilledPages = state.fileItems.some((i) => i.needsPageEntry || i.pages < 1);
  if (hasUnfilledPages) {
    showToast("Please enter page counts for all items before placing an order.", "error");
    return;
  }

  const totals = computeGrandTotal();
  
  // Prompt for Customer Name
  showModal({
    title: "Customer Name",
    bodyHtml: `
      <div class="field-row">
        <label class="field-label" for="customer-name-input">Enter customer name to proceed</label>
        <input type="text" id="customer-name-input" class="field-input" placeholder="e.g. Juan Dela Cruz" list="customer-names-list" autofocus />
        <datalist id="customer-names-list"></datalist>
      </div>
      <div style="margin-top:12px;font-size:12px;color:var(--text-2)">Total to collect: <span style="color:var(--text-1);font-weight:700">${formatPeso(totals.grandTotal)}</span></div>
    `,
    type: "confirm",
    confirmText: "Place Order",
    onConfirm: async () => {
      await executeOrderPlacement();
    }
  });

  async function executeOrderPlacement() {
    const nameInput = el("customer-name-input");
    state.customerName = nameInput ? nameInput.value.trim() : "Walk-in";
    
    closeModal(); // Close the name modal
    showProcessing("Placing order...");
    showProcessingProgress();
    updateProcessingProgress(10, 100, "Updating statistics...");

    // Update Cumulative Stats
    for (const item of state.fileItems) {
      const totalPages = item.pages * item.copies;
      if (item.paperSize === "long") state.cumulativeStats.pagesLong += totalPages;
      else if (item.paperSize === "a4") state.cumulativeStats.pagesA4 += totalPages;
      else state.cumulativeStats.pagesShort += totalPages;
    }
    state.cumulativeStats.totalRevenue += totals.grandTotal;
    state.cumulativeStats.totalOrders += 1;
    
    await writeDb(STORAGE_KEYS.cumulativeStats, state.cumulativeStats);
    
    updateProcessingProgress(30, 100, "Saving to history...");
    saveInvoiceToRecentHistory();

    if (state.customerName && state.customerName !== "Walk-in") {
      const names = await readDb(STORAGE_KEYS.customerNames, []);
      if (!names.includes(state.customerName)) {
        names.push(state.customerName);
        await writeDb(STORAGE_KEYS.customerNames, names);
      }
    }

    updateProcessingProgress(40, 100, "Syncing to Cloud...");
    await sendToDiscordWebhookAsync(state.customerName, state.invoiceRef, totals);

    updateProcessingProgress(60, 100, "Listing items...");
    
    setTimeout(() => {
      updateProcessingProgress(80, 100, "Generating Invoice...");
      updateProcessingMessage("Generating Invoice...");
      
      copyInvoiceAsImageAsync().then(() => {
        updateProcessingProgress(100, 100, "Order Placed!");
        updateProcessingMessage("Order Placed!", true);
        showToast(`✓ Order placed! Collect ${formatPeso(totals.grandTotal)}`, "success");
        setStatus("Order Placed", "copied");

        setTimeout(() => {
          hideProcessing();
          hideProcessingProgress();
          clearAllInvoiceData();
          state.invoiceRef = generateRef();
          state.invoiceDate = formatDate(new Date());
          state.customerName = "";
          updateInvoicePreview();
          setStatus("Ready");
        }, 1500);
      });
    }, 800);
  }

  // Auto-focus the name input, bind Enter key, and populate autocomplete
  setTimeout(async () => {
    const input = el("customer-name-input");
    if (input) {
      input.focus();
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          executeOrderPlacement();
        }
      });
      const names = await readDb(STORAGE_KEYS.customerNames, []);
      const datalist = el("customer-names-list");
      if (datalist && names.length > 0) {
        datalist.innerHTML = names.map(n => `<option value="${n}">`).join("");
      }
    }
  }, 100);
}

async function sendToDiscordWebhookAsync(customerName, ref, totals) {
  if (!state.settings.discordWebhookUrl) return;

  const itemsDescription = state.fileItems.map(i => {
    const paper = i.paperSize.toUpperCase();
    const mode = (COLOR_MODE_LONG_LABELS[i.colorMode] || "B&W").toUpperCase();
    return `- **${i.fileName}** (${paper}, ${mode}): ${i.pages}pg x ${i.copies}qty = ${formatPeso(i.unitPrice * i.pages * i.copies)}`;
  }).join("\n");

  const embed = {
    title: `📦 New Order Placed — ${ref}`,
    color: 0x00ff00,
    fields: [
      { name: "👤 Customer", value: customerName, inline: true },
      { name: "💰 Grand Total", value: `**${formatPeso(totals.grandTotal)}**`, inline: true },
      { name: "📄 Total Pages", value: `${computeTotalPrintedPages()}`, inline: true },
      { name: "📝 Items", value: itemsDescription || "No items" },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: "PrintBill System" }
  };

  if (totals.activeTier) {
    embed.fields.push({ 
      name: "🏷️ Discount", 
      value: `${totals.activeTier.discountPct}% off (Saved ${formatPeso(totals.discountAmt)})`,
      inline: false 
    });
  }

  try {
    await fetch(state.settings.discordWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] })
    });
  } catch (e) {
    console.error("Discord webhook failed", e);
  }
}
