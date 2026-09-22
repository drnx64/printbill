const state = {
  fileItems: [],
  // Each item: { id, fileName, pages, copies, colorMode, paperSize, unitPrice, isPageExact, isManual, needsPageEntry }
  nextItemId: 1,
  discountTiers: JSON.parse(JSON.stringify(DISCOUNT_TIERS_DEFAULT)),
  pricing: JSON.parse(JSON.stringify(PRICING_DEFAULTS)),
  pricingStandard: JSON.parse(JSON.stringify(PRICING_DEFAULTS)),
  pricingKMode: JSON.parse(JSON.stringify(KAKILALA_PRICING_DEFAULTS)),
  settings: {
    taxRate: TAX_RATE_DEFAULT,
    isTaxEnabled: true,
    isVatVisibleOnInvoice: true,
    shouldRoundUp: false,
    defaultCopies: DEFAULT_COPIES,
    isKMode: false,
    isExpressMode: false,
    showUnitPrice: true,
    discordWebhookUrl: "",
  },
  lastPaperSize: "short",
  lastColorMode: "bw",
  customerName: "",
  cumulativeStats: {
    pagesLong: 0,
    pagesShort: 0,
    pagesA4: 0,
    totalRevenue: 0,
    totalOrders: 0,
  },
  shopInfo: {
    name: "Syempre kay Charles",
    address: "",
    phone: "",
    email: "",
    paymentTerms: "Due on receipt",
  },
  invoiceRef: "", // Will be generated in main.js
  invoiceDate: "", // Will be set in main.js
  qrCode: "",
  orderTemplates: [],
  _previewItemId: null,
  _previewPage: 0,
};
