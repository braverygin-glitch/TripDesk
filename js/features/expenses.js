window.ExpensesFeature = {
  render(trip) {
    const sorted = [...trip.expenses].sort((a, b) => {
      const dateCompare = String(a.date || "").localeCompare(String(b.date || ""));
      if (dateCompare !== 0) return dateCompare;
      return String(a.category || "").localeCompare(String(b.category || ""));
    });

    const totalByCurrency = this.sumByCurrency(sorted);
    const byCategory = this.sumBy(sorted, "category");
    const byCity = this.sumBy(sorted, "city");

    return `
      <section class="card">
        <div class="row-between">
          <div class="card-title">경비</div>
          <button class="btn primary" onclick="ExpensesFeature.showForm()">+ 추가</button>
        </div>
        <p class="small">예산 기능 없이 사용 내역과 합계만 관리합니다.</p>
      </section>

      <section class="card">
        <div class="card-title">총 사용금액</div>
        ${Object.keys(totalByCurrency).length ? Object.keys(totalByCurrency).map(currency => `
          <div class="expense-total">${Utils.escape(currency)} ${this.formatAmount(totalByCurrency[currency])}</div>
        `).join("") : UI.empty("아직 경비 내역이 없습니다.")}
      </section>

      <section class="card">
        <div class="card-title">분류별 합계</div>
        ${Object.keys(byCategory).length ? this.summaryHtml(byCategory) : UI.empty("분류별 합계가 없습니다.")}
      </section>

      <section class="card">
        <div class="card-title">도시별 합계</div>
        ${Object.keys(byCity).length ? this.summaryHtml(byCity) : UI.empty("도시별 합계가 없습니다.")}
      </section>

      <section class="card">
        <div class="card-title">사용 내역</div>
        ${sorted.length ? sorted.map(item => this.itemHtml(item)).join("") : UI.empty("경비 내역이 없습니다. + 추가 버튼으로 입력하세요.")}
      </section>
    `;
  },

  itemHtml(item) {
    return `
      <div class="item expense-item">
        <div class="row-between">
          <button class="expense-main" onclick="ExpensesFeature.showForm('${item.id}')">
            <div class="item-time">${Utils.formatDate(item.date)} · ${Utils.escape(item.city || "도시 미정")}</div>
            <div class="item-title">${Utils.escape(item.category || "기타")} · ${Utils.escape(item.currency || "EUR")} ${this.formatAmount(item.amount)}</div>
            ${item.memo ? `<div class="item-meta">${Utils.escape(item.memo)}</div>` : ""}
            ${item.paymentMethod ? `<div class="item-meta">결제: ${Utils.escape(item.paymentMethod)}</div>` : ""}
          </button>
          <button class="btn ghost" onclick="ExpensesFeature.showForm('${item.id}')">수정</button>
        </div>
      </div>
    `;
  },

  find(id) {
    return AppState.currentTrip().expenses.find(item => item.id === id) || null;
  },

  showForm(id = "") {
    const trip = AppState.currentTrip();
    const item = id ? this.find(id) : null;
    const isEdit = Boolean(item);

    UI.modal(`
      <div class="modal-title">${isEdit ? "경비 수정" : "경비 추가"}</div>

      <div class="field">
        <label>날짜</label>
        <input id="expenseDate" type="date" value="${item?.date || Utils.today()}">
      </div>

      <div class="grid-2">
        <div class="field">
          <label>도시</label>
          <input id="expenseCity" value="${Utils.escape(item?.city || "")}" placeholder="바르셀로나">
        </div>
        <div class="field">
          <label>분류</label>
          <select id="expenseCategory">
            ${this.categoryOptions(item?.category || "식비")}
          </select>
        </div>
      </div>

      <div class="grid-2">
        <div class="field">
          <label>금액</label>
          <input id="expenseAmount" type="number" step="0.01" value="${item?.amount ?? ""}" placeholder="12.50">
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

  categoryOptions(selected) {
    const categories = ["식비", "카페", "교통", "숙소", "입장권", "쇼핑", "마트", "기념품", "통신", "기타"];
    return categories.map(category => `<option value="${category}" ${category === selected ? "selected" : ""}>${category}</option>`).join("");
  },

  currencyOptions(selected) {
    const currencies = ["EUR", "KRW", "USD", "CNY", "JPY", "TWD", "GBP"];
    return currencies.map(currency => `<option value="${currency}" ${currency === selected ? "selected" : ""}>${currency}</option>`).join("");
  },

  paymentOptions(selected) {
    const methods = ["카드", "현금", "트래블카드", "계좌이체", "기타"];
    return methods.map(method => `<option value="${method}" ${method === selected ? "selected" : ""}>${method}</option>`).join("");
  },

  save(id = "") {
    const trip = AppState.currentTrip();
    const existing = id ? this.find(id) : null;
    const amount = Number(Utils.value("expenseAmount") || 0);
    const city = Utils.value("expenseCity");

    const data = {
      id: id || Utils.id("e"),
      date: Utils.normalizeDate(Utils.value("expenseDate")) || Utils.today(),
      city,
      category: Utils.value("expenseCategory") || "기타",
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
    AppState.save();
    UI.closeModal();
    App.render();
  },

  remove(id) {
    const trip = AppState.currentTrip();
    const item = this.find(id);
    if (!item) return;

    if (!confirm(`"${item.category} ${item.currency} ${this.formatAmount(item.amount)}" 경비를 삭제할까요?`)) return;

    trip.expenses = trip.expenses.filter(expense => expense.id !== id);
    AppState.save();
    UI.closeModal();
    App.render();
  },

  sumByCurrency(items) {
    return items.reduce((acc, item) => {
      const currency = item.currency || "EUR";
      acc[currency] = (acc[currency] || 0) + Number(item.amount || 0);
      return acc;
    }, {});
  },

  sumBy(items, key) {
    return items.reduce((acc, item) => {
      const name = item[key] || "미정";
      const currency = item.currency || "EUR";
      if (!acc[name]) acc[name] = {};
      acc[name][currency] = (acc[name][currency] || 0) + Number(item.amount || 0);
      return acc;
    }, {});
  },

  summaryHtml(summary) {
    return Object.keys(summary).map(name => `
      <div class="expense-summary-row">
        <b>${Utils.escape(name)}</b>
        <span>${Object.keys(summary[name]).map(currency => `${Utils.escape(currency)} ${this.formatAmount(summary[name][currency])}`).join(" · ")}</span>
      </div>
    `).join("");
  },

  formatAmount(value) {
    return Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
};
