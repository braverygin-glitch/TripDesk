window.BookingsFeature = {
  render(trip) {
    const sorted = [...trip.bookings].sort((a, b) => {
      const dateCompare = String(a.date || "").localeCompare(String(b.date || ""));
      if (dateCompare !== 0) return dateCompare;
      return String(a.category || "").localeCompare(String(b.category || ""));
    });

    const pinned = sorted.filter(item => item.pinned);
    const groups = Utils.groupBy(sorted, item => item.category || "기타");

    return `
      ${pinned.length ? `
        <section class="card">
          <div class="card-title">📌 핀한 예약</div>
          ${pinned.map(item => this.itemHtml(item)).join("")}
        </section>
      ` : ""}

      <section class="card">
        <div class="row-between">
          <div class="card-title">예약</div>
          <button class="btn primary" onclick="BookingsFeature.showForm()">+ 추가</button>
        </div>
        <p class="small">항공, 숙소, 입장권, 공연, 기차, 버스 등 확정된 예약을 따로 관리합니다.</p>
      </section>

      ${Object.keys(groups).length ? Object.keys(groups).map(category => `
        <section class="card">
          <div class="card-title">${Utils.escape(category)}</div>
          ${groups[category].map(item => this.itemHtml(item)).join("")}
        </section>
      `).join("") : `
        <section class="card">
          ${UI.empty("예약 정보가 없습니다. + 추가 버튼으로 예약을 입력하세요.")}
        </section>
      `}
    `;
  },

  itemHtml(item) {
    const addressButton = item.address
      ? `<button class="btn ghost" onclick="BookingsFeature.openMap('${item.id}')">지도</button>`
      : "";

    const reservationHtml = item.reservationNo
      ? `<div class="item-meta">예약번호: ${Utils.escape(item.reservationNo)}</div>`
      : "";

    return `
      <div class="item booking-item">
        <div class="row-between">
          <button class="booking-main" onclick="BookingsFeature.showForm('${item.id}')">
            <div class="item-time">${Utils.formatDate(item.date)} · ${Utils.escape(item.category || "기타")}</div>
            <div class="item-title">${Utils.escape(item.title)}</div>
            ${reservationHtml}
            ${item.address ? `<div class="item-meta">${Utils.escape(item.address)}</div>` : ""}
            ${item.memo ? `<div class="item-meta">${Utils.escape(item.memo)}</div>` : ""}
          </button>
          <div class="booking-actions">
            <button class="pin-btn" onclick="BookingsFeature.togglePin('${item.id}')">${item.pinned ? "📌" : "📍"}</button>
            ${addressButton}
          </div>
        </div>
      </div>
    `;
  },

  find(id) {
    return AppState.currentTrip().bookings.find(item => item.id === id) || null;
  },

  showForm(id = "") {
    const trip = AppState.currentTrip();
    const item = id ? this.find(id) : null;
    const isEdit = Boolean(item);

    UI.modal(`
      <div class="modal-title">${isEdit ? "예약 수정" : "예약 추가"}</div>

      <div class="grid-2">
        <div class="field">
          <label>날짜</label>
          <input id="bookingDate" type="date" value="${item?.date || trip.startDate || Utils.today()}">
        </div>
        <div class="field">
          <label>분류</label>
          <select id="bookingCategory">
            ${this.categoryOptions(item?.category || "숙소")}
          </select>
        </div>
      </div>

      <div class="field">
        <label>제목</label>
        <input id="bookingTitle" value="${Utils.escape(item?.title || "")}" placeholder="예: 바르셀로나 숙소 / 알함브라 입장권">
      </div>

      <div class="field">
        <label>예약번호</label>
        <input id="bookingReservationNo" value="${Utils.escape(item?.reservationNo || "")}" placeholder="예약번호 또는 PNR">
      </div>

      <div class="field">
        <label>주소</label>
        <input id="bookingAddress" value="${Utils.escape(item?.address || "")}" placeholder="지도 버튼용 주소">
      </div>

      <div class="field">
        <label>메모</label>
        <textarea id="bookingMemo">${Utils.escape(item?.memo || "")}</textarea>
      </div>

      <label class="check-row">
        <input id="bookingPinned" type="checkbox" ${item?.pinned ? "checked" : ""}>
        <span>핀 고정</span>
      </label>

      <div style="height:12px"></div>

      <div class="row-between">
        ${isEdit ? `<button class="btn danger" onclick="BookingsFeature.remove('${item.id}')">삭제</button>` : `<span></span>`}
        <div class="row">
          <button class="btn" onclick="UI.closeModal()">취소</button>
          <button class="btn primary" onclick="BookingsFeature.save('${item?.id || ""}')">저장</button>
        </div>
      </div>
    `);
  },

  categoryOptions(selected) {
    const categories = ["숙소", "항공", "기차", "버스", "입장권", "공연", "투어", "식당", "기타"];
    return categories.map(category => `<option value="${category}" ${category === selected ? "selected" : ""}>${category}</option>`).join("");
  },

  save(id = "") {
    const trip = AppState.currentTrip();
    const existing = id ? this.find(id) : null;

    const data = {
      id: id || Utils.id("b"),
      date: Utils.normalizeDate(Utils.value("bookingDate")) || trip.startDate || Utils.today(),
      category: Utils.value("bookingCategory") || "기타",
      title: Utils.value("bookingTitle") || "새 예약",
      reservationNo: Utils.value("bookingReservationNo"),
      address: Utils.value("bookingAddress"),
      memo: Utils.value("bookingMemo"),
      pinned: document.getElementById("bookingPinned")?.checked || false
    };

    if (existing) {
      Object.assign(existing, data);
    } else {
      trip.bookings.push(data);
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

    if (!confirm(`"${item.title}" 예약을 삭제할까요?`)) return;

    trip.bookings = trip.bookings.filter(booking => booking.id !== id);
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

  openMap(id) {
    const item = this.find(id);
    if (!item || !item.address) return;

    const query = encodeURIComponent(item.address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank", "noopener");
  }
};
