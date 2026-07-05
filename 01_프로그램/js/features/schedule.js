window.ScheduleFeature = {
  render(trip) {
    const sorted = [...trip.schedule].sort(Utils.sortSchedule);
    const pinned = sorted.filter(item => item.pinned);
    const groups = Utils.groupBy(sorted, item => item.date);

    return `
      ${pinned.length ? `
        <section class="card">
          <div class="card-title">📌 핀한 일정</div>
          ${pinned.map(item => this.itemHtml(item)).join("")}
        </section>
      ` : ""}

      <section class="card">
        <div class="row-between">
          <div class="card-title">일정</div>
          <button class="btn primary" onclick="ScheduleFeature.showForm()">+ 추가</button>
        </div>
        <p class="small">날짜별로 자동 정렬됩니다. 확정 일정은 가져오기 시 자동으로 핀 처리됩니다.</p>
      </section>

      ${Object.keys(groups).length ? Object.keys(groups).map(date => `
        <section class="card">
          <div class="row-between">
            <div class="card-title">${Utils.formatDate(date)}</div>
            <button class="btn ghost" onclick="ScheduleFeature.showForm('', '${date}')">+ 추가</button>
          </div>
          ${groups[date].map(item => this.itemHtml(item)).join("")}
        </section>
      `).join("") : `
        <section class="card">
          ${UI.empty("아직 일정이 없습니다. + 추가 버튼으로 일정을 입력하세요.")}
        </section>
      `}
    `;
  },

  itemHtml(item) {
    const status = item.confirmed || (item.pinned ? "확정" : "");
    const statusHtml = status ? `<span class="badge">${Utils.escape(status)}</span>` : "";
    const addressButton = item.address
      ? `<button class="btn ghost" onclick="ScheduleFeature.openMap('${item.id}')">지도</button>`
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
    if (!item || !item.address) return;

    const query = encodeURIComponent(item.address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank", "noopener");
  }
};
