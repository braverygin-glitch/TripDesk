window.ExpensesFeature = {
  render(trip) {
    trip.expenses = (trip.expenses || []).map(item => this.normalizeExpense(item));

    const sorted = [...trip.expenses].sort((a, b) => {
      const typeCompare = this.typeSortValue(a) - this.typeSortValue(b);
      if (typeCompare !== 0) return typeCompare;

      const dateCompare = String(a.date || "").localeCompare(String(b.date || ""));
      if (dateCompare !== 0) return dateCompare;

      return String(a.category || "").localeCompare(String(b.category || ""));
    });

    const preExpenses = sorted.filter(item => this.typeOf(item) === "pre");
    const tripExpenses = sorted.filter(item => this.typeOf(item) === "trip");

    const totalByCurrency = this.sumByCurrency(sorted);
    const preTotalByCurrency = this.sumByCurrency(preExpenses);
    const tripTotalByCurrency = this.sumByCurrency(tripExpenses);

    const byCategory = this.sumBy(sorted, "category");
    const byCity = this.sumBy(sorted, "city");

    return `
      <section class="card">
        <div class="row-between">
          <div class="card-title">경비</div>
          <div class="row expense-action-row">
            <button class="btn" onclick="ExpensesFeature.showForm('', { expenseType: 'pre' })">+ 여행 전</button>
            <button class="btn primary" onclick="ExpensesFeature.showForm('', { expenseType: 'trip' })">+ 여행 중</button>
          </div>
        </div>
        <p class="small">여행 전 결제한 비용과 여행 중 사용한 비용을 나누어 관리합니다.</p>
      </section>

      <section class="card">
        <div class="card-title">여행 전 경비 빠른 입력</div>
        <p class="small">항목을 누르면 금액만 빠르게 입력할 수 있습니다.</p>
        <div class="quick-expense-grid">
          ${this.preQuickCategories().map(category => `
            <button class="btn" onclick="ExpensesFeature.showQuickPreForm('${this.jsString(category)}')">${Utils.escape(category)}</button>
          `).join("")}
        </div>
      </section>

      <section class="card">
        <div class="card-title">총 지출</div>
        ${this.totalHtml(totalByCurrency, "아직 경비 내역이 없습니다.")}
      </section>

      <section class="card">
        <div class="card-title">여행 전 합계</div>
        ${this.totalHtml(preTotalByCurrency, "여행 전 경비가 없습니다.")}
      </section>

      <section class="card">
        <div class="card-title">여행 중 합계</div>
        ${this.totalHtml(tripTotalByCurrency, "여행 중 경비가 없습니다.")}
      </section>

      <section class="card">
        <div class="card-title">분류별 합계</div>
        ${Object.keys(byCategory).length ? this.summaryHtml(byCategory) : UI.empty("분류별 합계가 없습니다.")}
      </section>

      <section class="card">
        <div class="card-title">도시별 합계</div>
        ${Object.keys(byCity).length ? this.summaryHtml(byCity) : UI.empty("도시별 합계가 없습니다.")}
      </section>
      
      ${window.ExpenseAnalysisFeature ? ExpenseAnalysisFeature.render(trip) : ""}

<section class="card">
        <div class="card-title">여행 전 경비</div>
        ${preExpenses.length ? preExpenses.map(item => this.itemHtml(item)).join("") : UI.empty("여행 전 경비가 없습니다.")}
      </section>

      <section class="card">
        <div class="card-title">여행 중 경비</div>
        ${tripExpenses.length ? tripExpenses.map(item => this.itemHtml(item)).join("") : UI.empty("여행 중 경비가 없습니다.")}
      </section>
    `;
  },

  itemHtml(item) {
    const typeLabel = this.typeOf(item) === "pre" ? "🟦 여행 전" : "🟩 여행 중";

    return `
      <div class="item expense-item">
        <div class="row-between">
          <button class="expense-main" onclick="ExpensesFeature.showForm('${item.id}')">
            <div class="item-time">${typeLabel} · ${Utils.formatDate(item.date)} · ${Utils.escape(item.city || "도시 미정")}</div>
            <div class="item-title">${Utils.escape(item.category || "기타")} · ${Utils.escape(item.currency || "EUR")} ${this.formatAmount(item.amount, item.currency)}</div>
            ${item.memo ? `<div class="item-meta">${Utils.escape(item.memo)}</div>` : ""}
            ${item.paymentMethod ? `<div class="item-meta">결제: ${Utils.escape(item.paymentMethod)}</div>` : ""}
          </button>
          <div class="row expense-item-actions">
            <button class="btn ghost" onclick="ExpensesFeature.showForm('${item.id}')">수정</button>
            <button class="btn danger" onclick="ExpensesFeature.remove('${item.id}')">삭제</button>
          </div>
        </div>
      </div>
    `;
  },

  find(id) {
    const trip = AppState.currentTrip();
    return (trip.expenses || []).find(item => item.id === id) || null;
  },

  showQuickPreForm(category) {
    UI.modal(`
      <div class="modal-title">여행 전 경비 빠른 입력</div>

      <div class="notice">
        <b>${Utils.escape(category)}</b><br>
        금액만 입력하면 여행 전 경비로 바로 저장됩니다.
      </div>

      <div style="height:12px"></div>

      <div class="field">
        <label>날짜</label>
        <input id="quickExpenseDate" type="date" value="${Utils.today()}">
      </div>

      <div class="grid-2">
        <div class="field">
          <label>금액</label>
          <input id="quickExpenseAmount" type="number" step="0.01" min="0.01" placeholder="0">
        </div>
        <div class="field">
          <label>통화</label>
          <select id="quickExpenseCurrency">
            ${this.currencyOptions("EUR")}
          </select>
        </div>
      </div>

      <div class="field">
        <label>결제수단</label>
        <select id="quickExpensePaymentMethod">
          ${this.paymentOptions("카드")}
        </select>
      </div>

      <div class="field">
        <label>메모</label>
        <textarea id="quickExpenseMemo" placeholder="예: 항공권 2인 결제"></textarea>
      </div>

      <div class="row-between">
        <button class="btn" onclick="ExpensesFeature.showForm('', { expenseType: 'pre', category: '${this.jsString(category)}' })">상세 입력</button>
        <div class="row">
          <button class="btn" onclick="UI.closeModal()">취소</button>
          <button class="btn primary" onclick="ExpensesFeature.saveQuickPreExpense('${this.jsString(category)}')">저장</button>
        </div>
      </div>
    `);
  },

  saveQuickPreExpense(category) {
    const trip = AppState.currentTrip();
    trip.expenses = trip.expenses || [];

    const amount = Number(Utils.value("quickExpenseAmount") || 0);

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("금액을 0보다 크게 입력하세요.");
      return;
    }

    const data = {
      id: Utils.id("e"),
      date: Utils.normalizeDate(Utils.value("quickExpenseDate")) || Utils.today(),
      city: "",
      expenseType: "pre",
      category: category || "기타",
      amount,
      currency: Utils.value("quickExpenseCurrency") || "EUR",
      paymentMethod: Utils.value("quickExpensePaymentMethod") || "카드",
      memo: Utils.value("quickExpenseMemo")
    };

    trip.expenses.push(data);

    Utils.normalizeTrip(trip);
    trip.expenses = trip.expenses.map(item => this.normalizeExpense(item));

    AppState.save();
    UI.closeModal();
    App.render();
  },

  showForm(id = "", defaults = {}) {
    const item = id ? this.find(id) : null;
    const isEdit = Boolean(item);

    const expenseType = item?.expenseType || defaults.expenseType || "trip";
    const category = item?.category || defaults.category || (expenseType === "pre" ? "항공권" : "식비");

    UI.modal(`
      <div class="modal-title">${isEdit ? "경비 수정" : "경비 추가"}</div>

      <div class="field">
        <label>날짜</label>
        <input id="expenseDate" type="date" value="${item?.date || Utils.today()}">
      </div>

      <div class="field">
        <label>경비 구분</label>
        <select id="expenseType" onchange="ExpensesFeature.updateCategoryOptions()">
          <option value="trip" ${expenseType === "trip" ? "selected" : ""}>여행 중</option>
          <option value="pre" ${expenseType === "pre" ? "selected" : ""}>여행 전</option>
        </select>
      </div>

      <div class="grid-2">
        <div class="field">
          <label>도시</label>
          <input id="expenseCity" value="${Utils.escape(item?.city || "")}" placeholder="바르셀로나">
        </div>
        <div class="field">
          <label>분류</label>
          <select id="expenseCategory">
            ${this.categoryOptions(category, expenseType)}
          </select>
        </div>
      </div>

      <div class="grid-2">
        <div class="field">
          <label>금액</label>
          <input id="expenseAmount" type="number" step="0.01" min="0.01" value="${item?.amount ?? ""}" placeholder="12.50">
        </div>
        <div class="field">
          <label>통화</label>
          <select id="expenseCurrency">
            ${this.currencyOptions(item?.currency || "EUR")}
          </select>
        </div>
      </div>

      <div class="field">
        <label>결제수단</label>
        <select id="expensePaymentMethod">
          ${this.paymentOptions(item?.paymentMethod || "카드")}
        </select>
      </div>

      <div class="field">
        <label>메모</label>
        <textarea id="expenseMemo" placeholder="예: 보케리아 시장 점심">${Utils.escape(item?.memo || "")}</textarea>
      </div>

      <div class="row-between">
        ${isEdit ? `<button class="btn danger" onclick="ExpensesFeature.remove('${item.id}')">삭제</button>` : `<span></span>`}
        <div class="row">
          <button class="btn" onclick="UI.closeModal()">취소</button>
          <button class="btn primary" onclick="ExpensesFeature.save('${item?.id || ""}')">저장</button>
        </div>
      </div>
    `);
  },

  updateCategoryOptions() {
    const type = Utils.value("expenseType") || "trip";
    const select = document.getElementById("expenseCategory");
    if (!select) return;

    const current = select.value;
    select.innerHTML = this.categoryOptions(current, type);
  },

  save(id = "") {
    const trip = AppState.currentTrip();
    trip.expenses = trip.expenses || [];
    trip.cities = trip.cities || [];

    const existing = id ? this.find(id) : null;
    const amount = Number(Utils.value("expenseAmount") || 0);
    const city = Utils.value("expenseCity");
    const category = Utils.value("expenseCategory") || "기타";

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("금액을 0보다 크게 입력하세요.");
      return;
    }

    if (!category) {
      alert("분류를 선택하세요.");
      return;
    }

    const data = {
      id: id || Utils.id("e"),
      date: Utils.normalizeDate(Utils.value("expenseDate")) || Utils.today(),
      city,
      expenseType: Utils.value("expenseType") || "trip",
      category,
      amount: Number.isFinite(amount) ? amount : 0,
      currency: Utils.value("expenseCurrency") || "EUR",
      paymentMethod: Utils.value("expensePaymentMethod") || "카드",
      memo: Utils.value("expenseMemo")
    };

    if (existing) {
      Object.assign(existing, data);
    } else {
      trip.expenses.push(data);
    }

    if (city && !trip.cities.includes(city)) {
      trip.cities.push(city);
    }

    Utils.normalizeTrip(trip);
    trip.expenses = trip.expenses.map(item => this.normalizeExpense(item));

    AppState.save();
    UI.closeModal();
    App.render();
  },

  remove(id) {
    const trip = AppState.currentTrip();
    const item = this.find(id);
    if (!item) return;

    if (!confirm(`"${item.category} ${item.currency} ${this.formatAmount(item.amount, item.currency)}" 경비를 삭제할까요?`)) return;

    trip.expenses = (trip.expenses || []).filter(expense => expense.id !== id);

    Utils.normalizeTrip(trip);
    AppState.save();
    UI.closeModal();
    App.render();
  },

  typeOf(item) {
    return item?.expenseType === "pre" ? "pre" : "trip";
  },

  typeSortValue(item) {
    return this.typeOf(item) === "pre" ? 0 : 1;
  },

  normalizeExpense(item) {
    return {
      ...item,
      expenseType: item?.expenseType === "pre" ? "pre" : "trip"
    };
  },

  sumByCurrency(items) {
    return (items || []).reduce((acc, item) => {
      const currency = item.currency || "EUR";
      acc[currency] = (acc[currency] || 0) + Number(item.amount || 0);
      return acc;
    }, {});
  },

  sumBy(items, key) {
    return (items || []).reduce((acc, item) => {
      const name = item[key] || "미정";
      const currency = item.currency || "EUR";
      if (!acc[name]) acc[name] = {};
      acc[name][currency] = (acc[name][currency] || 0) + Number(item.amount || 0);
      return acc;
    }, {});
  },

  totalHtml(total, emptyText) {
    return Object.keys(total).length
      ? Object.keys(total).map(currency => `
        <div class="expense-total">${Utils.escape(currency)} ${this.formatAmount(total[currency], currency)}</div>
      `).join("")
      : UI.empty(emptyText);
  },

  summaryHtml(summary) {
    return Object.keys(summary).map(name => `
      <div class="expense-summary-row">
        <b>${Utils.escape(name)}</b>
        <span>${Object.keys(summary[name]).map(currency => `${Utils.escape(currency)} ${this.formatAmount(summary[name][currency], currency)}`).join(" · ")}</span>
      </div>
    `).join("");
  },

  categoryOptions(selected, expenseType = "trip") {
    const preCategories = [
      "항공권",
      "숙소",
      "입장권",
      "기차",
      "버스",
      "공항 교통",
      "eSIM",
      "여행자 보험",
      "여행용품",
      "환전 수수료",
      "카메라 장비",
      "캐리어",
      "기타"
    ];

    const tripCategories = [
      "식비",
      "카페",
      "교통",
      "숙소",
      "입장권",
      "쇼핑",
      "마트",
      "기념품",
      "통신",
      "기타"
    ];

    const base = expenseType === "pre" ? preCategories : tripCategories;
    const categories = base.includes(selected) ? base : [selected, ...base];

    return categories
      .filter((category, index, array) => array.indexOf(category) === index)
      .map(category => `<option value="${category}" ${category === selected ? "selected" : ""}>${category}</option>`)
      .join("");
  },

  preQuickCategories() {
    return [
      "항공권",
      "숙소",
      "입장권",
      "기차",
      "버스",
      "공항 교통",
      "eSIM",
      "여행자 보험",
      "여행용품",
      "환전 수수료",
      "기타"
    ];
  },

  currencyOptions(selected) {
    const currencies = ["EUR", "KRW", "USD", "CNY", "JPY", "TWD", "GBP"];
    return currencies.map(currency => `<option value="${currency}" ${currency === selected ? "selected" : ""}>${currency}</option>`).join("");
  },

  paymentOptions(selected) {
    const methods = ["카드", "현금", "트래블카드", "계좌이체", "기타"];
    return methods.map(method => `<option value="${method}" ${method === selected ? "selected" : ""}>${method}</option>`).join("");
  },

  jsString(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r");
  },

  fractionDigits(currency = "") {
    const zeroDecimalCurrencies = new Set([
      "KRW",
      "JPY",
      "VND",
      "IDR",
      "CLP",
      "PYG",
      "XOF",
      "XAF",
      "XPF"
    ]);

    return zeroDecimalCurrencies.has(String(currency || "").toUpperCase()) ? 0 : 2;
  },

  formatAmount(value, currency = "") {
    const digits = this.fractionDigits(currency);

    return Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }
};
