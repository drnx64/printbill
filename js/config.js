const TAX_RATE_DEFAULT = 12;
const DEFAULT_COPIES = 1;
const MAX_RECENT_INVOICES = 20;
const DOCX_BYTES_PER_PAGE = 2400;
const COPY_IMAGE_SCALE = 2;
const INVOICE_EXPORT_WIDTH_PX = 680;
const INVOICE_QR_SIZE_PX = 70;
const TOAST_DURATION_MS = 2500;

const PRICING_VERSION = 3;

const COLOR_MODES = ["bw", "bw_image", "color_small", "color_partial", "color_full"];
const PAPER_SIZES = ["long", "short", "a4"];

const COLOR_MODE_LABELS = {
  bw: "B&W",
  bw_image: "B&W+Img",
  color_small: "Small",
  color_partial: "Partial",
  color_full: "Full",
  color: "Color",
};

const COLOR_MODE_LONG_LABELS = {
  bw: "B&W",
  bw_image: "B&W + Image",
  color_small: "Small Color",
  color_partial: "Partial Color",
  color_full: "Full Color",
  color: "Color",
};

const COLOR_MODE_SHORT = {
  bw: "BW",
  bw_image: "B+W",
  color_small: "Sm",
  color_partial: "Part",
  color_full: "Full",
  color: "Clr",
};

const PAPER_SIZE_LABELS = { long: "Long", short: "Short", a4: "A4" };

const DISCOUNT_TIERS_DEFAULT = [
  { minPages: 25, discountPct: 5 },
  { minPages: 50, discountPct: 10 },
  { minPages: 100, discountPct: 12 },
];

const PRICING_DEFAULTS = {
  bw: { long: 4.25, short: 3.5, a4: 3.5 },
  bw_image: { long: 5.0, short: 4.5, a4: 4.5 },
  color_small: { long: 5.75, short: 5.25, a4: 5.25 },
  color_partial: { long: 8.5, short: 7.5, a4: 7.5 },
  color_full: { long: 15.0, short: 14.0, a4: 14.0 },
};

const KAKILALA_PRICING_DEFAULTS = {
  bw: { long: 3.25, short: 2.75, a4: 2.75 },
  bw_image: { long: 4.0, short: 3.5, a4: 3.5 },
  color_small: { long: 4.75, short: 4.25, a4: 4.25 },
  color_partial: { long: 6.75, short: 6.0, a4: 6.0 },
  color_full: { long: 12.0, short: 11.0, a4: 11.0 },
};

const STORAGE_KEYS = {
  shopInfo: "ig_shop_info",
  recentInvoices: "ig_recent_invoices",
  settings: "ig_settings",
  theme: "ig_theme",
  pricing: "ig_pricing",
  pricingStandard: "ig_pricing_standard",
  pricingKMode: "ig_pricing_kmode",
  pricingVersion: "ig_pricing_version",
  lastPaperSize: "ig_last_paper_size",
  lastColorMode: "ig_last_color_mode",
  fileItems: "ig_file_items",
  cumulativeStats: "ig_cumulative_stats",
  qrCode: "ig_qr_code",
  customerNames: "ig_customer_names",
  orderTemplates: "ig_order_templates",
};
