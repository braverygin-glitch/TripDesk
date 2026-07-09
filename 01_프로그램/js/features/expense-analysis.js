window.ExpenseAnalysisFeature = {
  normalizedExpenses(trip) {
    return (trip?.expenses || []).map(item => (
      ExpensesFeature.normalizeExpense
        ? ExpensesFeature.normalizeExpense(item)
        : item
    ));
  },

  sumByCurrency(items) {
    return items.reduce((acc, item) => {
      const currency = String(item.currency || "EUR").toUpperCase();
      acc[currency] = (acc[currency] || 0) + Number(item.amount || 0);
      return acc;
    }, {});
  },

  sumByField(items, field, fallback) {
    return items.reduce((acc, item) => {
      const name = String(item[field] || fallback);
      const currency = String(item.currency || "EUR").toUpperCase();

      acc[name] = acc[name] || {};
      acc[name][currency] = (acc[name][currency] || 0) + Number(item.amount || 0);
      return acc;
    }, {});
  },

  currencyText(amounts = {}) {
    const keys = Object.keys(amounts);
    if (!keys.length) return "0";

    return keys.map(currency => (
      `${Utils.escape(currency)} ${ExpensesFeature.formatAmount(amounts[currency], currency)}`
    )).join(" · ");
  },

  singleCurrencyRows(summary = {}) {
    const rows = [];

    Object.entries(summary).forEach(([name, amounts]) => {
      Object.entries(amounts).forEach(([currency, amount]) => {
        rows.push({ name, currency, amount: Number(amount || 0) });
      });
    });

    return rows.sort((a, b) => {
      const currencyCompare = a.currency.localeCompare(b.currency);
      if (currencyCompare !== 0) return currencyCompare;
      return b.amount - a.amount;
    });
  },

  barHtml(summary = {}, emptyText = "분석할 경비가 없습니다.") {
    const rows = this.singleCurrencyRows(summary);
    if (!rows.length) return UI.empty(emptyText);

    const maxByCurrency = rows.reduce((acc, row) => {
      acc[row.currency] = Math.max(acc[row.currency] || 0, row.amount);
      return acc;
    }, {});

    return `
      <div class="expense-analysis-bars">
        ${rows.map(row => {
          const max = maxByCurrency[row.currency] || 1;
          const width = Math.max(3, Math.round((row.amount / max) * 100));

          return `
            <div class="expense-analysis-row">
              <div class="expense-analysis-label">
                <b>${Utils.escape(row.name)}</b>
                <span>${Utils.escape(row.currency)} ${ExpensesFeature.formatAmount(row.amount, row.currency)}</span>
              </div>
              <div class="expense-analysis-track" aria-hidden="true">
                <div class="expense-analysis-fill" style="width:${width}%"></div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  },

  render(trip) {
    const items = this.normalizedExpenses(trip);
    const byDate = this.sumByField(items, "date", "날짜 없음");
    const byCategory = this.sumByField(items, "category", "기타");
    const byCity = this.sumByField(items, "city", "도시 미정");

    return `
      <section class="card">
        <div class="row-between">
          <div>
            <div class="card-title">경비 분석</div>
            <p class="small">기존 경비 데이터를 읽기 전용으로 분석합니다.</p>
          </div>
          <button type="button" class="btn primary expense-report-button" onclick="ExpenseAnalysisFeature.showReport()">여행 리포트</button>
        </div>
      </section>

      <section class="card">
        <div class="card-title">카테고리별 지출</div>
        ${this.barHtml(byCategory, "카테고리별 경비가 없습니다.")}
      </section>

      <section class="card">
        <div class="card-title">도시별 지출</div>
        ${this.barHtml(byCity, "도시별 경비가 없습니다.")}
      </section>

      <section class="card">
        <div class="card-title">날짜별 지출</div>
        ${this.barHtml(byDate, "날짜별 경비가 없습니다.")}
      </section>
    `;
  },

  topEntry(summary = {}) {
    const rows = this.singleCurrencyRows(summary);
    return rows.length ? rows[0] : null;
  },

  reportData(trip) {
    const items = this.normalizedExpenses(trip);
    const totals = this.sumByCurrency(items);
    const byCategory = this.sumByField(items, "category", "기타");
    const byCity = this.sumByField(items, "city", "도시 미정");
    const byDate = this.sumByField(items, "date", "날짜 없음");

    return {
      items,
      totals,
      byCategory,
      byCity,
      byDate,
      topCategory: this.topEntry(byCategory),
      topCity: this.topEntry(byCity)
    };
  },

  showReport() {
    const trip = AppState.currentTrip();
    if (!trip) return;

    const data = this.reportData(trip);

    UI.modal(`
      <div class="modal-title">여행 리포트</div>

      <div class="report-cover">
        <b>${Utils.escape(trip.name || "여행")}</b>
        <span>${Utils.formatDate(trip.startDate)} ~ ${Utils.formatDate(trip.endDate)}</span>
      </div>

      <div class="report-stat-grid">
        <div>
          <span>경비 기록</span>
          <b>${data.items.length}건</b>
        </div>
        <div>
          <span>통화 수</span>
          <b>${Object.keys(data.totals).length}개</b>
        </div>
      </div>

      <div class="day-detail-section">
        <div class="card-title">총 지출</div>
        ${Object.keys(data.totals).length
          ? Object.keys(data.totals).map(currency => `
              <div class="report-total">
                <b>${Utils.escape(currency)}</b>
                <span>${ExpensesFeature.formatAmount(data.totals[currency], currency)}</span>
              </div>
            `).join("")
          : UI.empty("경비 기록이 없습니다.")}
      </div>

      <div class="report-highlight-grid">
        <div class="notice">
          <b>가장 많이 지출한 도시</b><br>
          ${data.topCity
            ? `${Utils.escape(data.topCity.name)} · ${Utils.escape(data.topCity.currency)} ${ExpensesFeature.formatAmount(data.topCity.amount, data.topCity.currency)}`
            : "데이터 없음"}
        </div>
        <div class="notice">
          <b>가장 많이 지출한 분류</b><br>
          ${data.topCategory
            ? `${Utils.escape(data.topCategory.name)} · ${Utils.escape(data.topCategory.currency)} ${ExpensesFeature.formatAmount(data.topCategory.amount, data.topCategory.currency)}`
            : "데이터 없음"}
        </div>
      </div>

      <div class="day-detail-section">
        <div class="card-title">도시별</div>
        ${this.reportRows(data.byCity)}
      </div>

      <div class="day-detail-section">
        <div class="card-title">카테고리별</div>
        ${this.reportRows(data.byCategory)}
      </div>

      <div class="day-detail-section">
        <div class="card-title">날짜별</div>
        ${this.reportRows(data.byDate)}
      </div>

      <div class="row-between">
        <button class="btn" onclick="ExpenseAnalysisFeature.downloadCsv()">CSV 저장</button>
        <div class="row">
          <button class="btn" onclick="ExpenseAnalysisFeature.printReport()">인쇄/PDF</button>
          <button class="btn primary" onclick="UI.closeModal()">닫기</button>
        </div>
      </div>
    `);
  },

  reportRows(summary = {}) {
    const names = Object.keys(summary);
    if (!names.length) return UI.empty("데이터가 없습니다.");

    return names.map(name => `
      <div class="expense-summary-row">
        <b>${Utils.escape(name)}</b>
        <span>${this.currencyText(summary[name])}</span>
      </div>
    `).join("");
  },

  csvEscape(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  },

  downloadCsv() {
    const trip = AppState.currentTrip();
    if (!trip) return;

    const items = this.normalizedExpenses(trip);
    const header = ["날짜", "구분", "도시", "분류", "금액", "통화", "결제수단", "메모"];
    const rows = items.map(item => [
      item.date || "",
      item.expenseType === "pre" ? "여행 전" : "여행 중",
      item.city || "",
      item.category || "",
      Number(item.amount || 0),
      item.currency || "EUR",
      item.paymentMethod || "",
      item.memo || ""
    ]);

    const csv = "\uFEFF" + [header, ...rows]
      .map(row => row.map(value => this.csvEscape(value)).join(","))
      .join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeName = String(trip.name || "TripDesk")
      .replace(/[\\/:*?"<>|]/g, "_");

    anchor.href = url;
    anchor.download = `${safeName}_경비리포트.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },

  printReport() {
    const trip = AppState.currentTrip();
    if (!trip) return;

    const data = this.reportData(trip);
    const popup = window.open("", "_blank", "noopener,noreferrer");

    if (!popup) {
      alert("팝업이 차단되었습니다. 브라우저에서 팝업을 허용해 주세요.");
      return;
    }

    popup.document.write(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>${Utils.escape(trip.name || "TripDesk")} 경비 리포트</title>
        <style>
          body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:32px;color:#111827}
          h1{margin-bottom:4px}
          .sub{color:#6b7280;margin-bottom:28px}
          section{margin:24px 0}
          h2{font-size:18px;border-bottom:1px solid #d1d5db;padding-bottom:8px}
          .row{display:flex;justify-content:space-between;gap:20px;padding:7px 0;border-bottom:1px solid #f1f5f9}
          .total{font-size:20px;font-weight:800}
          @media print{body{margin:16mm}}
        </style>
      </head>
      <body>
        <h1>${Utils.escape(trip.name || "여행")} 경비 리포트</h1>
        <div class="sub">${Utils.formatDate(trip.startDate)} ~ ${Utils.formatDate(trip.endDate)}</div>

        <section>
          <h2>총 지출</h2>
          ${Object.keys(data.totals).map(currency => `
            <div class="row total"><span>${Utils.escape(currency)}</span><span>${ExpensesFeature.formatAmount(data.totals[currency], currency)}</span></div>
          `).join("") || "<p>경비 기록 없음</p>"}
        </section>

        <section><h2>도시별</h2>${this.printRows(data.byCity)}</section>
        <section><h2>카테고리별</h2>${this.printRows(data.byCategory)}</section>
        <section><h2>날짜별</h2>${this.printRows(data.byDate)}</section>
      </body>
      </html>
    `);

    popup.document.close();
    popup.focus();
    window.setTimeout(() => popup.print(), 250);
  },

  printRows(summary = {}) {
    return Object.keys(summary).map(name => `
      <div class="row">
        <span>${Utils.escape(name)}</span>
        <span>${this.currencyText(summary[name])}</span>
      </div>
    `).join("") || "<p>데이터 없음</p>";
  }
};
