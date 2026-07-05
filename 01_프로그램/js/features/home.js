window.HomeFeature = {
  render(trip) {
    const today = Utils.today();

    trip.schedule = trip.schedule || [];
    trip.bookings = trip.bookings || [];
    trip.expenses = trip.expenses || [];

    trip.expenses = trip.expenses || [];

    const todaySchedule = trip.schedule
      .filter(item => item.date === today)
      .sort(Utils.sortSchedule);

    const todayBookings = trip.bookings
      .filter(item => item.date === today)
      .sort((a, b) => String(a.category || "").localeCompare(String(b.category || "")));

    const todayExpenses = trip.expenses.filter(item => item.date === today);
    const todayExpenseTotals = this.sumExpensesByCurrency(todayExpenses);

    const preExpenses = trip.expenses.filter(item => (item.expenseType || "trip") === "pre");
    const tripOnlyExpenses = trip.expenses.filter(item => (item.expenseType || "trip") === "trip");
    const preTotals = this.sumExpensesByCurrency(preExpenses);
    const tripTotals = this.sumExpensesByCurrency(tripOnlyExpenses);
    const allTotals = this.sumExpensesByCurrency(trip.expenses);

    const pinnedSchedule = trip.schedule
      .filter(item => item.pinned)
      .sort(Utils.sortSchedule);

    const pinnedBookings = trip.bookings
      .filter(item => item.pinned)
      .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));

    return `
      <section class="card">
        <div class="row-between">
          <div class="card-title">📅 오늘 일정</div>
          <span class="small">${Utils.formatDate(today)}</span>
        </div>
        ${todaySchedule.length ? todaySchedule.map(item => this.scheduleItemHtml(item)).join("") : UI.empty("오늘 등록된 일정이 없습니다.")}
      </section>

      <section class="card">
        <div class="card-title">🎫 오늘 예약</div>
        ${todayBookings.length ? todayBookings.map(item => this.bookingItemHtml(item)).join("") : UI.empty("오늘 예약이 없습니다.")}
      </section>

      <section class="card">
        <div class="card-title">💰 오늘 지출</div>
        ${Object.keys(todayExpenseTotals).length ? Object.keys(todayExpenseTotals).map(currency => `
          <div class="home-total">${Utils.escape(currency)} ${this.formatAmount(todayExpenseTotals[currency])}</div>
        `).join("") : UI.empty("오늘 입력된 경비가 없습니다.")}
      </section>

      <section class="card">
        <div class="card-title">💳 여행 경비 요약</div>

        <div class="small"><b>여행 전</b></div>
        ${Object.keys(preTotals).length ? Object.keys(preTotals).map(currency => `
          <div class="home-total">${Utils.escape(currency)} ${this.formatAmount(preTotals[currency])}</div>
        `).join("") : UI.empty("없음")}

        <div style="height:8px"></div>

        <div class="small"><b>여행 중</b></div>
        ${Object.keys(tripTotals).length ? Object.keys(tripTotals).map(currency => `
          <div class="home-total">${Utils.escape(currency)} ${this.formatAmount(tripTotals[currency])}</div>
        `).join("") : UI.empty("없음")}

        <div style="height:8px"></div>

        <div class="small"><b>총 지출</b></div>
        ${Object.keys(allTotals).length ? Object.keys(allTotals).map(currency => `
          <div class="home-total">${Utils.escape(currency)} ${this.formatAmount(allTotals[currency])}</div>
        `).join("") : UI.empty("없음")}
      </section>

      <section class="card">
        <div class="card-title">📌 핀한 일정</div>
        ${pinnedSchedule.length ? pinnedSchedule.slice(0, 8).map(item => this.scheduleItemHtml(item)).join("") : UI.empty("핀한 일정이 없습니다.")}
        ${pinnedBookings.length ? `
          <div style="height:10px"></div>
          <div class="small"><b>핀한 예약</b></div>
          ${pinnedBookings.slice(0, 5).map(item => this.bookingItemHtml(item)).join("")}
        ` : ""}
      </section>

      <section class="card">
        <div class="card-title">🧳 여행 정보</div>
        <p><b>${Utils.escape(trip.name)}</b></p>
        <p class="small">${Utils.formatDate(trip.startDate)} ~ ${Utils.formatDate(trip.endDate)} · ${Utils.escape(trip.travelers)}</p>
        <p class="small">${Utils.escape(trip.memo || "메모 없음")}</p>
      </section>

      <section class="card">
        <div class="card-title">최근 가져온 엑셀</div>
        ${this.lastImportHtml(trip)}
      </section>
    `;
  },

  scheduleItemHtml(item) {
    return `
      <div class="item ${item.done ? "done" : ""}">
        <div class="item-time">${Utils.escape(item.time || "시간 미정")} · ${Utils.escape(item.city || "도시 미정")}</div>
        <div class="item-title">${Utils.escape(item.title)}</div>
        <div class="item-meta">
          ${Utils.escape(item.type || "기타")}
          ${item.pinned ? `<span class="badge">핀</span>` : ""}
          ${UI.tags(item.tags)}
        </div>
      </div>
    `;
  },

  bookingItemHtml(item) {
    return `
      <div class="item">
        <div class="item-time">${Utils.formatDate(item.date)} · ${Utils.escape(item.category || "기타")}</div>
        <div class="item-title">${Utils.escape(item.title)}</div>
        ${item.reservationNo ? `<div class="item-meta">예약번호: ${Utils.escape(item.reservationNo)}</div>` : ""}
      </div>
    `;
  },

  lastImportHtml(trip) {
    const lastImport = trip.lastImport || {};

    if (!lastImport.filename) {
      return UI.empty("최근 가져온 엑셀 정보가 없습니다.");
    }

    return `
      <div class="item">
        <div class="item-title">${Utils.escape(lastImport.filename)}</div>
        <div class="item-meta">${lastImport.importedAt ? new Date(lastImport.importedAt).toLocaleString() : ""}</div>
      </div>
    `;
  },

  sumExpensesByCurrency(items) {
    return (items || []).reduce((acc, item) => {
      const currency = item.currency || "EUR";
      acc[currency] = (acc[currency] || 0) + Number(item.amount || 0);
      return acc;
    }, {});
  },

  formatAmount(value) {
    return Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
};
