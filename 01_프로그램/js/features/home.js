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

      <section class="card pinned-overview-card">
        <div class="card-title">📌 핀한 일정</div>
        ${this.pinnedScheduleHtml(pinnedSchedule)}

        <div class="pinned-section-divider"></div>

        <div class="card-title pinned-booking-title">🎫 핀한 예약</div>
        ${this.pinnedBookingHtml(pinnedBookings)}
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

  pinnedScheduleHtml(items) {
    if (!Array.isArray(items) || !items.length) {
      return UI.empty("핀한 일정이 없습니다.");
    }

    const groups = this.groupPinnedByDate(items, item => item.date);

    return Object.keys(groups).map(date => `
      <div class="pinned-date-group">
        ${this.pinnedDateHeader(date, groups[date].length)}
        <div class="pinned-date-items">
          ${groups[date].map(item => this.pinnedScheduleItemHtml(item)).join("")}
        </div>
      </div>
    `).join("");
  },

  pinnedBookingHtml(items) {
    if (!Array.isArray(items) || !items.length) {
      return UI.empty("핀한 예약이 없습니다.");
    }

    const sorted = [...items].sort((a, b) => {
      const dateCompare = String(a.date || "").localeCompare(String(b.date || ""));
      if (dateCompare !== 0) return dateCompare;
      return String(a.time || "").localeCompare(String(b.time || ""));
    });

    const groups = this.groupPinnedByDate(sorted, item => item.date);

    return Object.keys(groups).map(date => `
      <div class="pinned-date-group">
        ${this.pinnedDateHeader(date, groups[date].length)}
        <div class="pinned-date-items">
          ${groups[date].map(item => this.pinnedBookingItemHtml(item)).join("")}
        </div>
      </div>
    `).join("");
  },

  groupPinnedByDate(items, getDate) {
    return items.reduce((groups, item) => {
      const normalized = Utils.normalizeDate?.(getDate(item)) || getDate(item) || "날짜 미정";
      groups[normalized] ||= [];
      groups[normalized].push(item);
      return groups;
    }, {});
  },

  pinnedDateHeader(date, count) {
    return `
      <div class="pinned-date-header">
        <div>
          <span class="pinned-date-icon">🗓</span>
          <b>${Utils.escape(this.longDateText(date))}</b>
        </div>
        <span class="pinned-date-count">${count}개</span>
      </div>
    `;
  },

  longDateText(value) {
    if (!value || value === "날짜 미정") return "날짜 미정";

    const normalized = Utils.normalizeDate?.(value) || value;
    const match = String(normalized).match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
    if (!match) return String(value);

    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    const weekday = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];

    return `${Number(match[2])}월 ${Number(match[3])}일 (${weekday})`;
  },

  pinnedScheduleItemHtml(item) {
    const icon = this.scheduleTypeIcon(item);
    const time = item.time || "시간 미정";
    const city = item.city || "도시 미정";

    return `
      <div class="pinned-item ${item.done ? "done" : ""}">
        <div class="pinned-item-icon" aria-hidden="true">${icon}</div>
        <div class="pinned-item-body">
          <div class="pinned-item-topline">
            <span class="pinned-item-time">${Utils.escape(time)}</span>
            <span class="pinned-item-city">${Utils.escape(city)}</span>
          </div>
          <div class="pinned-item-title">${Utils.escape(item.title || "제목 없음")}</div>
          <div class="pinned-item-meta">
            ${Utils.escape(item.type || "기타")}
            ${Array.isArray(item.tags) && item.tags.length ? ` · ${item.tags.map(tag => Utils.escape(tag)).join(" · ")}` : ""}
          </div>
        </div>
      </div>
    `;
  },

  pinnedBookingItemHtml(item) {
    const icon = this.bookingTypeIcon(item);
    const time = item.time || "";
    const category = item.category || "기타";

    return `
      <div class="pinned-item pinned-booking-item">
        <div class="pinned-item-icon" aria-hidden="true">${icon}</div>
        <div class="pinned-item-body">
          <div class="pinned-item-topline">
            <span class="pinned-item-time">${time ? Utils.escape(time) : Utils.escape(category)}</span>
            ${time ? `<span class="pinned-item-city">${Utils.escape(category)}</span>` : ""}
          </div>
          <div class="pinned-item-title">${Utils.escape(item.title || "예약")}</div>
          ${item.reservationNo ? `<div class="pinned-item-meta">예약번호: ${Utils.escape(item.reservationNo)}</div>` : ""}
        </div>
      </div>
    `;
  },

  scheduleTypeIcon(item) {
    const text = `${item?.type || ""} ${(item?.tags || []).join(" ")} ${item?.title || ""}`.toLowerCase();

    if (/비행|공항|항공|이동|기차|버스|출발|도착/.test(text)) return "✈️";
    if (/숙소|호텔|체크인|체크아웃|에어비앤비/.test(text)) return "🏨";
    if (/식당|식사|레스토랑|카페|점심|저녁|아침/.test(text)) return "🍽️";
    if (/관광|입장|투어|공원|성당|궁전|박물관|미술관/.test(text)) return "🎫";
    if (/쇼핑|마트|시장/.test(text)) return "🛍️";
    return "📌";
  },

  bookingTypeIcon(item) {
    const text = `${item?.category || ""} ${item?.title || ""}`.toLowerCase();

    if (/비행|항공|공항/.test(text)) return "✈️";
    if (/숙소|호텔|에어비앤비/.test(text)) return "🏨";
    if (/식당|레스토랑|카페/.test(text)) return "🍽️";
    if (/기차|버스|교통/.test(text)) return "🚆";
    if (/입장|투어|관광|공원|성당|궁전/.test(text)) return "🎫";
    return "🧾";
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
