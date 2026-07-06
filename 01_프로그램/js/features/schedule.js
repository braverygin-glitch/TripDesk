window.ScheduleFeature = {
  render(trip) {
    trip.schedule = trip.schedule || [];
    trip.bookings = trip.bookings || [];
    trip.expenses = trip.expenses || [];

    const baseDate = trip.startDate || Utils.today();
    const month = AppState.scheduleMonth || Utils.monthKey(baseDate);
    AppState.scheduleMonth = month;

    const days = Utils.daysInMonth(month);
    const first = Utils.firstWeekdayOfMonth(month);
    const cells = [];

    for (let i = 0; i < first; i += 1) cells.push(null);
    for (let day = 1; day <= days; day += 1) {
      cells.push(`${month}-${String(day).padStart(2, "0")}`);
    }
    while (cells.length % 7 !== 0) cells.push(null);

    const scheduleByDate = Utils.groupBy(trip.schedule, item => item.date || "");
    const bookingsByDate = Utils.groupBy(trip.bookings, item => item.date || "");
    const expenseByDate = this.expenseByDate(trip.expenses || []);

    return `
      <section class="card">
        <div class="row-between">
          <div>
            <div class="card-title">달력</div>
            <p class="small">일정, 예약, 지출을 날짜별로 봅니다.</p>
          </div>
          <button class="btn primary" onclick="ScheduleFeature.showForm()">+ 일정</button>
        </div>

        <div class="row-between calendar-toolbar">
          <div class="row">
            <button class="btn ghost" onclick="ScheduleFeature.moveMonth(-1)">‹</button>
            <button class="btn ghost" onclick="ScheduleFeature.goToday()">오늘</button>
            <button class="btn ghost" onclick="ScheduleFeature.moveMonth(1)">›</button>
          </div>
          <div class="calendar-month-title">${Utils.formatMonth(month)}</div>
        </div>
      </section>

      <section class="card schedule-calendar-card">
        <div class="calendar-weekdays">
          ${["일", "월", "화", "수", "목", "금", "토"].map(day => `<div>${day}</div>`).join("")}
        </div>
        <div class="calendar-grid">
          ${cells.map(date => this.dayCell(date, scheduleByDate, bookingsByDate, expenseByDate)).join("")}
        </div>
      </section>

      <section class="card">
        <div class="card-title">이번 달 요약</div>
        ${this.monthSummary(month, trip, expenseByDate)}
      </section>
    `;
  },

  dayCell(date, scheduleByDate, bookingsByDate, expenseByDate) {
    if (!date) return `<div class="calendar-cell empty"></div>`;

    const schedules = scheduleByDate[date] || [];
    const bookings = bookingsByDate[date] || [];
    const expenses = expenseByDate[date] || {};
    const todayClass = date === Utils.today() ? "today" : "";
    const count = schedules.length + bookings.length;
    const expenseText = Object.keys(expenses).map(currency => `${currency} ${ExpensesFeature.formatAmount(expenses[currency])}`).join(" · ");

    return `
      <button type="button" class="calendar-cell ${todayClass}" onclick="ScheduleFeature.showDay('${date}')">
        <div class="calendar-date">${Number(date.slice(8, 10))}</div>
        ${schedules.slice(0, 2).map(item => `<div class="calendar-chip schedule">📅 ${Utils.escape(item.time || "")} ${Utils.escape(item.title)}</div>`).join("")}
        ${bookings.slice(0, 1).map(item => `<div class="calendar-chip booking">🎫 ${Utils.escape(item.title)}</div>`).join("")}
        ${count > 3 ? `<div class="calendar-more">+${count - 3}개 더</div>` : ""}
        ${expenseText ? `<div class="calendar-expense">${Utils.escape(expenseText)}</div>` : ""}
      </button>
    `;
  },

  monthSummary(month, trip, expenseByDate) {
    const schedules = (trip.schedule || []).filter(item => String(item.date || "").startsWith(month));
    const bookings = (trip.bookings || []).filter(item => String(item.date || "").startsWith(month));
    const expenses = Object.keys(expenseByDate)
      .filter(date => date.startsWith(month))
      .reduce((acc, date) => {
        Object.keys(expenseByDate[date]).forEach(currency => {
          acc[currency] = (acc[currency] || 0) + expenseByDate[date][currency];
        });
        return acc;
      }, {});

    return `
      <div class="calendar-summary">
        <div><b>${schedules.length}</b><span>일정</span></div>
        <div><b>${bookings.length}</b><span>예약</span></div>
        <div><b>${Object.keys(expenses).length ? Object.keys(expenses).map(c => `${c} ${ExpensesFeature.formatAmount(expenses[c])}`).join(" · ") : "0"}</b><span>지출</span></div>
      </div>
    `;
  },

  expenseByDate(expenses) {
    return expenses.reduce((acc, raw) => {
      const item = ExpensesFeature.normalizeExpense ? ExpensesFeature.normalizeExpense(raw) : raw;
      const date = item.date || "";
      const currency = item.currency || "EUR";
      if (!date) return acc;

      acc[date] = acc[date] || {};
      acc[date][currency] = (acc[date][currency] || 0) + Number(item.amount || 0);
      return acc;
    }, {});
  },

  showDay(date) {
    const trip = AppState.currentTrip();
    const schedules = (trip.schedule || []).filter(item => item.date === date).sort(Utils.sortSchedule);
    const bookings = (trip.bookings || []).filter(item => item.date === date);
    const expenses = (trip.expenses || []).filter(item => item.date === date);

    UI.modal(`
      <div class="modal-title">${Utils.formatDate(date)} 상세</div>

      <div class="day-detail-section">
        <div class="row-between">
          <div class="card-title">일정</div>
          <button class="btn primary" onclick="UI.closeModal(); ScheduleFeature.showForm('', '${date}')">+ 추가</button>
        </div>
        ${schedules.length ? schedules.map(item => this.dayScheduleHtml(item)).join("") : UI.empty("일정 없음")}
      </div>

      <div class="day-detail-section">
        <div class="card-title">예약</div>
        ${bookings.length ? bookings.map(item => `
          <div class="item">
            <div class="item-time">${Utils.escape(item.category || "기타")}</div>
            <div class="item-title">${Utils.escape(item.title)}</div>
            ${item.reservationNo ? `<div class="item-meta">예약번호: ${Utils.escape(item.reservationNo)}</div>` : ""}
          </div>
        `).join("") : UI.empty("예약 없음")}
      </div>

      <div class="day-detail-section">
        <div class="card-title">지출</div>
        ${expenses.length ? expenses.map(item => `
          <div class="item">
            <div class="item-title">${Utils.escape(item.category || "기타")} · ${Utils.escape(item.title || "")}</div>
            <div class="item-meta">${Utils.escape(item.currency || "EUR")} ${ExpensesFeature.formatAmount(item.amount)}</div>
          </div>
        `).join("") : UI.empty("지출 없음")}
      </div>

      <div class="row-between">
        <span></span>
        <button class="btn primary" onclick="UI.closeModal()">닫기</button>
      </div>
    `);
  },

  dayScheduleHtml(item) {
    return `
      <div class="item">
        <div class="row-between">
          <button class="schedule-main" onclick="UI.closeModal(); ScheduleFeature.showForm('${item.id}')">
            <div class="item-time">${Utils.escape(item.time || "시간 미정")} · ${Utils.escape(item.city || "")}</div>
            <div class="item-title">${Utils.escape(item.title)}</div>
            ${item.address ? `<div class="item-meta">📍 ${Utils.escape(item.address)}</div>` : ""}
            ${item.memo ? `<div class="item-meta">${Utils.escape(item.memo)}</div>` : ""}
          </button>
        </div>
      </div>
    `;
  },

  moveMonth(offset) {
    AppState.scheduleMonth = Utils.addMonths(AppState.scheduleMonth || Utils.monthKey(), offset);
    App.render();
  },

  goToday() {
    AppState.scheduleMonth = Utils.monthKey();
    App.render();
  },
  itemHtml(item) {
    const status = item.confirmed || (item.pinned ? "확정" : "");
    const statusHtml = status ? `<span class="badge">${Utils.escape(status)}</span>` : "";
    const mapQuery = Utils.mapQueryFromItem(item);
    const addressButton = mapQuery
      ? `
        <button class="map-btn" onclick="ScheduleFeature.openMap('${item.id}')">지도</button>
        <button class="map-btn" onclick="ScheduleFeature.openDirections('${item.id}')">길찾기</button>
      `
      : "";

    return `
      <div class="item schedule-item ${item.done ? "done" : ""}">
        <div class="row-between">
          <button class="schedule-main" onclick="ScheduleFeature.showForm('${item.id}')">
            <div class="item-time">${Utils.escape(item.time || "시간 미정")} · ${Utils.escape(item.city || "도시 미정")}</div>
            <div class="item-title">${Utils.escape(item.title)}</div>
            <div class="item-meta">
              ${Utils.escape(item.type || "기타")}
              ${statusHtml}
              ${UI.tags(item.tags)}
            </div>
            ${item.address ? `<div class="item-meta">📍 ${Utils.escape(item.address)}</div>` : ""}
            ${item.memo ? `<div class="item-meta">${Utils.escape(item.memo)}</div>` : ""}
          </button>
          <div class="schedule-actions">
            <button class="icon-btn" onclick="ScheduleFeature.toggleDone('${item.id}')">${item.done ? "↩" : "✓"}</button>
            <button class="pin-btn" onclick="ScheduleFeature.togglePin('${item.id}')">${item.pinned ? "📌" : "📍"}</button>
            ${addressButton}
          </div>
        </div>
      </div>
    `;
  },

  find(id) {
    return AppState.currentTrip().schedule.find(item => item.id === id) || null;
  },

  showForm(id = "", defaultDate = "") {
    const trip = AppState.currentTrip();
    const item = id ? this.find(id) : null;
    const isEdit = Boolean(item);

    UI.modal(`
      <div class="modal-title">${isEdit ? "일정 수정" : "일정 추가"}</div>

      <div class="field">
        <label>날짜</label>
        <input id="scheduleDate" type="date" value="${item?.date || defaultDate || trip.startDate || Utils.today()}">
      </div>

      <div class="grid-2">
        <div class="field">
          <label>시간</label>
          <input id="scheduleTime" value="${Utils.escape(item?.time || "")}" placeholder="09:00 / 오전">
        </div>
        <div class="field">
          <label>도시</label>
          <input id="scheduleCity" value="${Utils.escape(item?.city || "")}" placeholder="바르셀로나">
        </div>
      </div>

      <div class="field">
        <label>제목</label>
        <input id="scheduleTitle" value="${Utils.escape(item?.title || "")}" placeholder="사그라다 파밀리아">
      </div>

      <div class="grid-2">
        <div class="field">
          <label>분류</label>
          <select id="scheduleType">
            ${this.typeOptions(item?.type || "관광")}
          </select>
        </div>
        <div class="field">
          <label>확정여부</label>
          <select id="scheduleConfirmed">
            ${this.confirmedOptions(item?.confirmed || "")}
          </select>
        </div>
      </div>

      <div class="field">
        <label>태그</label>
        <input id="scheduleTags" value="${Utils.escape((item?.tags || []).join(", "))}" placeholder="가우디,예약">
      </div>

      <div class="field">
        <label>주소</label>
        <input id="scheduleAddress" value="${Utils.escape(item?.address || "")}" placeholder="지도 버튼용 주소">
      </div>

      <div class="field">
        <label>예약번호</label>
        <input id="scheduleReservationNo" value="${Utils.escape(item?.reservationNo || "")}">
      </div>

      <div class="field">
        <label>메모</label>
        <textarea id="scheduleMemo">${Utils.escape(item?.memo || "")}</textarea>
      </div>

      <div class="grid-2">
        <label class="check-row">
          <input id="schedulePinned" type="checkbox" ${item?.pinned ? "checked" : ""}>
          <span>핀 고정</span>
        </label>
        <label class="check-row">
          <input id="scheduleDone" type="checkbox" ${item?.done ? "checked" : ""}>
          <span>완료</span>
        </label>
      </div>

      <div style="height:12px"></div>

      <div class="row-between">
        ${isEdit ? `<button class="btn danger" onclick="ScheduleFeature.remove('${item.id}')">삭제</button>` : `<span></span>`}
        <div class="row">
          <button class="btn" onclick="UI.closeModal()">취소</button>
          <button class="btn primary" onclick="ScheduleFeature.save('${item?.id || ""}')">저장</button>
        </div>
      </div>
    `);
  },

  typeOptions(selected) {
    const types = ["관광", "이동", "숙소", "식사", "카페", "쇼핑", "시장", "공연", "예약", "휴식", "기타"];
    return types.map(type => `<option value="${type}" ${type === selected ? "selected" : ""}>${type}</option>`).join("");
  },

  confirmedOptions(selected) {
    const values = ["", "확정", "미확정", "취소"];
    return values.map(value => {
      const label = value || "없음";
      return `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`;
    }).join("");
  },

  save(id = "") {
    const trip = AppState.currentTrip();
    const existing = id ? this.find(id) : null;

    const confirmed = Utils.value("scheduleConfirmed");
    const tags = Utils.splitTags(Utils.value("scheduleTags"));
    if (confirmed === "확정" && !tags.includes("확정")) tags.push("확정");

    const city = Utils.value("scheduleCity");
    const data = {
      id: id || Utils.id("s"),
      date: Utils.normalizeDate(Utils.value("scheduleDate")) || trip.startDate || Utils.today(),
      time: Utils.normalizeTime(Utils.value("scheduleTime")),
      city,
      title: Utils.value("scheduleTitle") || "새 일정",
      type: Utils.value("scheduleType") || "기타",
      tags,
      confirmed,
      pinned: document.getElementById("schedulePinned")?.checked || confirmed === "확정",
      done: document.getElementById("scheduleDone")?.checked || false,
      memo: Utils.value("scheduleMemo"),
      reservationNo: Utils.value("scheduleReservationNo"),
      address: Utils.value("scheduleAddress")
    };

    if (existing) {
      Object.assign(existing, data);
    } else {
      trip.schedule.push(data);
    }

    if (city && !trip.cities.includes(city)) {
      trip.cities.push(city);
    }

    trip.schedule.sort(Utils.sortSchedule);
    Utils.normalizeTrip(trip);
    AppState.save();
    UI.closeModal();
    App.render();
  },

  remove(id) {
    const trip = AppState.currentTrip();
    const item = this.find(id);
    if (!item) return;

    if (!confirm(`"${item.title}" 일정을 삭제할까요?`)) return;

    trip.schedule = trip.schedule.filter(schedule => schedule.id !== id);
    AppState.save();
    UI.closeModal();
    App.render();
  },

  togglePin(id) {
    const item = this.find(id);
    if (!item) return;

    item.pinned = !item.pinned;
    AppState.save();
    App.render();
  },

  toggleDone(id) {
    const item = this.find(id);
    if (!item) return;

    item.done = !item.done;
    AppState.save();
    App.render();
  },

  openMap(id) {
    const item = this.find(id);
    if (!item) return;

    Utils.openMapSearch(Utils.mapQueryFromItem(item));
  },

  openDirections(id) {
    const item = this.find(id);
    if (!item) return;

    Utils.openMapDirections(Utils.mapQueryFromItem(item));
  }
};
