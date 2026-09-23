/**
 * File Processing (PDF primary, DOCX estimate-only)
 */

// Checks if two dimensions match (either orientation) within tolerance of 20pt
function isSizePt(w1, h1, w2, h2, tol = 20) {
  return (
    (Math.abs(w1 - w2) < tol && Math.abs(h1 - h2) < tol) ||
    (Math.abs(w1 - h2) < tol && Math.abs(h1 - w2) < tol)
  );
}

async function readPdfPageCountAsync(file, onProgress) {
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) throw new Error("pdf.js not loaded");

  pdfjsLib.GlobalWorkerOptions.workerSrc = "lib/pdf.worker.min.js";

  onProgress?.(5, "Reading file…");
  const arrayBuffer = await file.arrayBuffer();
  onProgress?.(25, "Opening PDF…");
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) })
    .promise;
  const numPages = pdf.numPages;

  if (!Number.isInteger(numPages) || numPages < 1 || numPages > 9999) {
    throw new Error(`Bad page count: ${numPages}`);
  }

  let detectedSize = "short";
  for (let i = 1; i <= Math.min(numPages, 3); i++) {
    onProgress?.(25 + Math.round((i / Math.min(numPages, 3)) * 30), `Checking page ${i}/${Math.min(numPages, 3)}…`);
    try {
      const page = await pdf.getPage(i);
      if (i === 1) {
        const v = page.view;
        const width = Math.abs(v[2] - v[0]);
        const height = Math.abs(v[3] - v[1]);
        if (isSizePt(width, height, 612, 936)) detectedSize = "long";
        else if (isSizePt(width, height, 595, 842)) detectedSize = "a4";
        else if (isSizePt(width, height, 612, 792)) detectedSize = "short";
        else {
          const longest = Math.max(width, height);
          if (longest > 870) detectedSize = "long";
          else if (longest > 810) detectedSize = "a4";
          else detectedSize = "short";
        }
      }
    } catch (e) {
      console.warn(`Failed to parse page ${i}`, e);
    }
  }

  return { numPages, detectedSize };
}

async function readDocxSignalsAsync(arrayBuffer) {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(arrayBuffer);

  let metadataPages = 0;
  const appXml = await loadedZip.file("docProps/app.xml")?.async("string");
  if (appXml) {
    const m = appXml.match(/<Pages>(\d+)<\/Pages>/);
    if (m) metadataPages = parseInt(m[1]) || 0;
  }

  let markers = 0;
  let paperSize = null;
  const docXml = await loadedZip.file("word/document.xml")?.async("string");
  if (docXml) {
    const explicit = (docXml.match(/<w:br\s+[^>]*w:type="page"/g) || []).length;
    const rendered = (docXml.match(/<w:lastRenderedPageBreak/g) || []).length;
    if (explicit > 0 || rendered > 0) {
      markers = 1 + Math.max(explicit, rendered);
    }

    let wTwips = 0;
    let hTwips = 0;
    let pg = docXml.match(/<w:pgSz\b[^>]*?w:w="(\d+)"[^>]*?w:h="(\d+)"/);
    if (pg) {
      wTwips = parseInt(pg[1]);
      hTwips = parseInt(pg[2]);
    } else {
      pg = docXml.match(/<w:pgSz\b[^>]*?w:h="(\d+)"[^>]*?w:w="(\d+)"/);
      if (pg) {
        hTwips = parseInt(pg[1]);
        wTwips = parseInt(pg[2]);
      }
    }
    if (wTwips > 0 && hTwips > 0) {
      const wPt = wTwips / 20;
      const hPt = hTwips / 20;
      if (isSizePt(wPt, hPt, 612, 936)) paperSize = "long";
      else if (isSizePt(wPt, hPt, 595, 842)) paperSize = "a4";
      else if (isSizePt(wPt, hPt, 612, 792)) paperSize = "short";
      else {
        const longest = Math.max(wPt, hPt);
        if (longest > 870) paperSize = "long";
        else if (longest > 810) paperSize = "a4";
        else paperSize = "short";
      }
    }
  }

  return { markers, metadataPages, paperSize };
}

async function analyzeDocxAsync(file, onProgress) {
  onProgress?.(5, "Reading file…");
  try {
    const arrayBuffer = await file.arrayBuffer();
    onProgress?.(40, "Analyzing document…");
    const { markers, metadataPages, paperSize } = await readDocxSignalsAsync(arrayBuffer);

    let contentPages = 0;
    if (window.mammoth) {
      onProgress?.(70, "Estimating content…");
      try {
        const result = await mammoth.extractRawText({ arrayBuffer });
        contentPages = Math.ceil((result.value || "").length / DOCX_BYTES_PER_PAGE);
      } catch (e) {
        console.warn("mammoth text extract failed", e);
      }
    }

    let pages = Math.max(metadataPages, markers, contentPages, 1);
    if (metadataPages > 0 && contentPages > 0 && metadataPages > contentPages * 3) {
      pages = Math.max(markers, contentPages);
    }

    onProgress?.(95, "Done");
    return { pages, paperSize };
  } catch (e) {
    console.warn("DOCX analysis failed", e);
    return { pages: estimateDocxPageCount(file), paperSize: null };
  }
}

function estimateDocxPageCount(file) {
  return Math.max(1, Math.ceil(file.size / DOCX_BYTES_PER_PAGE));
}

function setProcessingProgress(item, pct, label) {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  item._processingPct = p;
  item._processingStage = label ? `${p}% · ${label}` : `${p}%`;
  const row = el(`row-${item.id}`);
  if (!row) return;
  const fill = row.querySelector(".row-progress-fill");
  if (fill) fill.style.width = p + "%";
  const stage = row.querySelector(".row-stage");
  if (stage) stage.textContent = item._processingStage;
}

async function processFilesAsync(files) {
  if (!files || files.length === 0) return;

  const fileArray = Array.from(files);
  const total = fileArray.length;

  await Promise.all(fileArray.map(async (file) => {
    try {
      await processUploadedFileAsync(file);
    } catch (e) {
      console.error(`Failed to process ${file.name}`, e);
      showToast(`Failed to process ${file.name}`, "error");
    }
  }));

  setTimeout(() => {
    showToast(`Successfully processed ${total} files`, "success");
  }, 500);
}

async function processUploadedFileAsync(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  const isPdf = ext === "pdf";
  const isDocx = ext === "docx" || ext === "doc";
  const itemId = state.nextItemId++;
  const fileName = stripExtension(file.name);
  const copies = parseInt(el("default-copies")?.value) || state.settings.defaultCopies;

  const colorMode = resolveDefaultColorMode();
  const paperSize = resolveDefaultPaperSize();
  const unitPrice = getPriceForItem(colorMode, paperSize);

  const item = {
    id: itemId,
    fileName,
    fileExt: ext,
    fileSize: file.size,
    pages: 0,
    copies,
    colorMode,
    paperSize,
    unitPrice,
    isPageExact: false,
    isManual: false,
    needsPageEntry: false,
    _processing: true,
    _processingPct: 0,
    _processingStage: "0% · Reading file…",
    _previewDataUrl: null,
  };

  state.fileItems.push(item);
  renderFileTableRow(item);
  showCompactDropZone();

  try {
    if (isPdf) {
      try {
        setProcessingProgress(item, 1, "Reading file…");
        const result = await readPdfPageCountAsync(file, (p, l) => setProcessingProgress(item, p, l));
        item.paperSize = result.detectedSize;
        state.lastPaperSize = result.detectedSize;
        item.unitPrice = getPriceForItem(item.colorMode, item.paperSize);
        mutateItemPages(item.id, result.numPages, true);

        const sizeLabel = { long: "Long (8.5×14)", short: "Short (8.5×11)", a4: "A4 (210×297mm)" }[result.detectedSize];
        showToast(`Detected: ${sizeLabel} — ${result.numPages} pages`, "info");

        try {
          setProcessingProgress(item, 60, "Rendering preview…");
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
          const page1 = await pdf.getPage(1);
          const viewport = page1.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page1.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
          item._previewDataUrl = canvas.toDataURL("image/png");
          refreshItemRow(item.id);
        } catch (e) {
          console.warn("Failed to render PDF preview", e);
        }
      } catch {
        mutateItemNeedsPageEntry(item.id);
      }
    } else if (isDocx) {
      // Fast ZIP/XML analysis only — no rendering, no conversion
      try {
        const { pages, paperSize } = await analyzeDocxAsync(file, (p, l) => setProcessingProgress(item, p, l));
        if (paperSize) {
          item.paperSize = paperSize;
          state.lastPaperSize = paperSize;
          item.unitPrice = getPriceForItem(item.colorMode, item.paperSize);
        }
        mutateItemPages(item.id, pages, false);
        showToast(`⚠ ${fileName}: page count is approximate — convert to PDF`, "info");
      } catch (docxErr) {
        console.warn("DOCX analysis failed", docxErr);
        mutateItemPages(item.id, estimateDocxPageCount(file), false);
        showToast(`⚠ ${fileName}: page count is approximate — convert to PDF`, "info");
      }
    } else {
      mutateItemNeedsPageEntry(item.id);
    }
  } finally {
    setProcessingProgress(item, 100, "Done");
    item._processing = false;
    refreshItemRow(item.id);
    persistSettingsToStorage();
  }
}

function mutateItemPages(id, pages, isExact) {
  const item = findItemById(id);
  if (!item) return;
  item.pages = pages;
  item.isPageExact = isExact;
  item.needsPageEntry = false;
  refreshItemRow(id);
  updateTotals();
  updateInvoicePreview();
}

function mutateItemNeedsPageEntry(id) {
  const item = findItemById(id);
  if (!item) return;
  item.needsPageEntry = true;
  refreshItemRow(id);
}

function findItemById(id) {
  return state.fileItems.find((i) => i.id === id);
}
