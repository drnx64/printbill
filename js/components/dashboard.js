/**
 * Revenue Dashboard Component
 * Improved design with better visual hierarchy, Syne font, and progress bars.
 */

window.resetCumulativeStats = function() {
  showModal({
    title: "Reset Statistics",
    body: "Are you sure you want to reset all cumulative print statistics? This will not affect your invoice history.",
    type: "danger",
    confirmText: "Reset",
    onConfirm: () => {
      state.cumulativeStats = {
        pagesLong: 0,
        pagesShort: 0,
        pagesA4: 0,
        totalRevenue: 0,
        totalOrders: 0,
      };
      writeDb(STORAGE_KEYS.cumulativeStats, state.cumulativeStats);
      showToast("Statistics reset", "info");
      showRevenueDashboard(); // Refresh
    }
  });
}

function showRevenueDashboard() {
  const c = state.cumulativeStats;
  const totalPages = c.pagesLong + c.pagesShort + c.pagesA4;
  const avgOrder = c.totalOrders > 0 ? c.totalRevenue / c.totalOrders : 0;

  const bodyHtml = `
    <div class="revenue-dashboard-v2">
      <!-- Key Metrics -->
      <div class="dashboard-metrics">
        <div class="metric-card revenue">
          <div class="metric-label">Total Revenue</div>
          <div class="metric-value syne-font">${formatPeso(c.totalRevenue)}</div>
        </div>
        <div class="metric-card profit positive">
          <div class="metric-label">Total Orders</div>
          <div class="metric-value syne-font">${c.totalOrders}</div>
        </div>
        <div class="metric-card margin">
          <div class="metric-label">Avg. per Order</div>
          <div class="metric-value syne-font">${formatPeso(avgOrder)}</div>
        </div>
      </div>

      <!-- Pages Breakdown -->
      <div class="dashboard-section">
        <div class="section-title-alt">Pages Printed</div>
        <div class="expense-list">
          <div class="expense-item"><span>Total Pages</span><span class="expense-val">${totalPages}</span></div>
          <div class="expense-item"><span>Long</span><span class="expense-val">${c.pagesLong}</span></div>
          <div class="expense-item"><span>Short</span><span class="expense-val">${c.pagesShort}</span></div>
          <div class="expense-item"><span>A4</span><span class="expense-val">${c.pagesA4}</span></div>
        </div>
      </div>

      <div class="dashboard-footer-actions">
        <button class="btn-dashboard-reset">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
          Reset Statistics
        </button>
      </div>
    </div>
  `;

  showModal({
    title: "Revenue Analytics",
    bodyHtml: bodyHtml,
    type: "info",
    confirmText: "Close",
    modalClass: "modal-lg"
  });

  // Bind Reset Statistics Event (Post-render)
  const resetBtn = document.querySelector(".btn-dashboard-reset");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => window.resetCumulativeStats());
  }
}

function showDailySummary() {
  const history = readLocalStorage(STORAGE_KEYS.recentInvoices, []);
  const today = new Date().toDateString();
  const todayOrders = history.filter(h => new Date(h.timestamp).toDateString() === today);

  let todayRevenue = 0;
  let todayPages = 0;
  let todayItems = 0;

  for (const order of todayOrders) {
    todayRevenue += order.grandTotal || 0;
    todayItems += order.itemCount || 0;
    for (const fi of (order.fileItems || [])) {
      todayPages += (fi.pages || 0) * (fi.copies || 1);
    }
  }

  const bodyHtml = `
    <div class="revenue-dashboard-v2">
      <div class="dashboard-metrics">
        <div class="metric-card revenue">
          <div class="metric-label">Today's Revenue</div>
          <div class="metric-value syne-font">${formatPeso(todayRevenue)}</div>
        </div>
        <div class="metric-card profit positive">
          <div class="metric-label">Orders Today</div>
          <div class="metric-value syne-font">${todayOrders.length}</div>
        </div>
        <div class="metric-card margin">
          <div class="metric-label">Pages Today</div>
          <div class="metric-value syne-font">${todayPages}</div>
        </div>
      </div>
      <div class="dashboard-section">
        <div class="section-title-alt">Today's Breakdown</div>
        <div class="expense-list">
          <div class="expense-item"><span>Total Pages</span><span class="expense-val">${todayPages}</span></div>
          <div class="expense-item"><span>Total Files</span><span class="expense-val">${todayItems}</span></div>
          <div class="expense-item"><span>Total Orders</span><span class="expense-val">${todayOrders.length}</span></div>
        </div>
      </div>
    </div>
  `;

  showModal({
    title: "Daily Summary",
    bodyHtml: bodyHtml,
    type: "info",
    confirmText: "Close",
    modalClass: "modal-lg"
  });
}
