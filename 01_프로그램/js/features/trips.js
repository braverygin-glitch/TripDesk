window.TripsFeature = {
  renderList() {
    const cards = AppState.trips.map(trip => `
      <section class="trip-card">
        <button class="trip-card-inner" onclick="TripsFeature.open('${trip.id}')">
          <div class="trip-name">${Utils.escape(trip.name)}</div>
          <div class="trip-date">${Utils.formatDate(trip.startDate)} ~ ${Utils.formatDate(trip.endDate)} · ${Utils.escape(trip.travelers)}</div>
          <div class="small">${Utils.escape(trip.memo || "")}</div>
        </button>
        <div class="trip-actions">
          <button class="btn ghost" onclick="TripsFeature.showEditForm('${trip.id}')">수정</button>
          <button class="btn ghost" onclick="TripsFeature.duplicate('${trip.id}')">복사</button>
          <button class="btn ghost" onclick="TripsFeature.exportTrip('${trip.id}')">백업</button>
        </div>
      </section>
    `).join("");

    UI.app().innerHTML = `
      ${UI.topbar("TripDesk", "여행을 선택하거나 새 여행을 만드세요.")}
      <main class="content">
        ${cards || UI.empty("저장된 여행이 없습니다.")}
        <div class="grid-2">
          <button class="btn primary" onclick="TripsFeature.showCreateForm()">+ 새 여행</button>
          <button class="btn" onclick="TripsFeature.showImportChoice()">가져오기</button>
        </div>
        <input id="tripJsonImportFile" class="file-input" type="file" accept="application/json" onchange="TripsFeature.importJson(event)">
        <input id="tripExcelImportFile" class="file-input" type="file" accept=".xlsx,.csv" onchange="TripsFeature.importExcel(event)">
      </main>
    `;
  },

  renderManagePage() {
    const trip = AppState.currentTrip();

    return `
      <section class="card">
        <div class="card-title">현재 여행 관리</div>
        <p><b>${Utils.escape(trip.name)}</b></p>
        <p class="small">${Utils.formatDate(trip.startDate)} ~ ${Utils.formatDate(trip.endDate)} · ${Utils.escape(trip.travelers)}</p>
        <div class="grid-2">
          <button class="btn" onclick="TripsFeature.showEditForm('${trip.id}')">여행 수정</button>
          <button class="btn" onclick="TripsFeature.exportTrip('${trip.id}')">JSON 백업</button>
          <button class="btn" onclick="TripsFeature.duplicate('${trip.id}')">여행 복사</button>
          <button class="btn danger" onclick="TripsFeature.remove('${trip.id}')">여행 삭제</button>
        </div>
      </section>

      <section class="card">
        <div class="card-title">엑셀/CSV 가져오기</div>
        <p class="small">엑셀 1개 = 여행 1개입니다. 가져오면 새 여행으로 생성됩니다.</p>
        <button class="btn primary full" onclick="document.getElementById('manageExcelImportFile').click()">엑셀/CSV 파일 선택</button>
        <input id="manageExcelImportFile" class="file-input" type="file" accept=".xlsx,.csv" onchange="TripsFeature.importExcel(event)">
      </section>

      <section class="card">
        <div class="card-title">데이터 원칙</div>
        <p class="small">여행 1개 = 엑셀 1개 = JSON 1개 = 앱 프로젝트 1개</p>
      </section>
    `;
  },

  open(id) {
    AppState.openTrip(id);
    App.render();
  },

  goList() {
    AppState.closeTrip();
    this.renderList();
  },

  showImportChoice() {
    UI.modal(`
      <div class="modal-title">가져오기</div>
      <div class="notice">엑셀/CSV는 새 여행으로 생성됩니다. JSON은 백업한 여행을 복원합니다.</div>
      <div style="height:12px"></div>
      <div class="grid-2">
        <button class="btn primary" onclick="document.getElementById('tripExcelImportFile').click(); UI.closeModal();">엑셀/CSV</button>
        <button class="btn" onclick="document.getElementById('tripJsonImportFile').click(); UI.closeModal();">JSON</button>
      </div>
      <div style="height:10px"></div>
      <button class="btn full" onclick="UI.closeModal()">닫기</button>
    `);
  },

  showCreateForm() {
    this.showTripForm();
  },

  showEditForm(id) {
    const trip = AppState.findTrip(id);
    if (!trip) return;
    this.showTripForm(trip);
  },

  showTripForm(trip = null) {
    const isEdit = Boolean(trip);
    UI.modal(`
      <div class="modal-title">${isEdit ? "여행 수정" : "새 여행 만들기"}</div>
      <div class="field">
        <label>여행명</label>
        <input id="tripName" value="${Utils.escape(trip?.name || "")}" placeholder="예: 2026 스페인·포르투갈">
      </div>
      <div class="grid-2">
        <div class="field">
          <label>시작일</label>
          <input id="tripStart" type="date" value="${trip?.startDate || Utils.today()}">
        </div>
        <div class="field">
          <label>종료일</label>
          <input id="tripEnd" type="date" value="${trip?.endDate || Utils.today()}">
        </div>
      </div>
      <div class="field">
        <label>인원</label>
        <input id="tripTravelers" value="${Utils.escape(trip?.travelers || "")}" placeholder="예: 2명">
      </div>
      <div class="field">
        <label>메모</label>
        <textarea id="tripMemo">${Utils.escape(trip?.memo || "")}</textarea>
      </div>
      <div class="grid-2">
        <button class="btn" onclick="UI.closeModal()">취소</button>
        <button class="btn primary" onclick="${isEdit ? `TripsFeature.update('${trip.id}')` : "TripsFeature.create()"}">저장</button>
      </div>
    `);
  },

  create() {
    const startDate = Utils.value("tripStart") || Utils.today();
    const trip = {
      id: Utils.id("trip"),
      name: Utils.value("tripName") || "새 여행",
      startDate,
      endDate: Utils.value("tripEnd") || startDate,
      travelers: Utils.value("tripTravelers"),
      memo: Utils.value("tripMemo"),
      cities: [],
      schedule: [],
      bookings: [],
      expenses: [],
      checklist: [],
      notes: "",
      schemaVersion: "1.0"
    };

    AppState.addTrip(trip);
    UI.closeModal();
    App.render();
  },

  update(id) {
    const startDate = Utils.value("tripStart") || Utils.today();

    AppState.updateTrip(id, {
      name: Utils.value("tripName") || "새 여행",
      startDate,
      endDate: Utils.value("tripEnd") || startDate,
      travelers: Utils.value("tripTravelers"),
      memo: Utils.value("tripMemo")
    });

    UI.closeModal();
    App.render();
  },

  remove(id) {
    const trip = AppState.findTrip(id);
    if (!trip) return;
    if (!confirm(`"${trip.name}" 여행을 삭제할까요?`)) return;

    AppState.deleteTrip(id);
    App.render();
  },

  duplicate(id) {
    const copy = AppState.duplicateTrip(id);
    if (!copy) return;
    App.render();
  },

  exportTrip(id) {
    const trip = AppState.findTrip(id);
    if (!trip) return;
    JsonService.download(`${Utils.safeFilename(trip.name)}.json`, trip);
  },

  async importJson(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await JsonService.readFile(file);
      const list = Array.isArray(data) ? data : [data];

      if (!list.length) {
        alert("가져올 여행 데이터가 없습니다.");
        return;
      }

      list.forEach(item => AppState.importTrip(item));
      App.render();
      alert("JSON 가져오기가 완료되었습니다.");
    } catch (error) {
      alert(error.message || "JSON 불러오기에 실패했습니다.");
    } finally {
      event.target.value = "";
    }
  },

  async importExcel(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const trip = await ExcelImportService.importFile(file);
      AppState.addTrip(trip);
      App.render();
      alert(`엑셀 가져오기 완료: 일정 ${trip.schedule.length}개, 예약 ${trip.bookings.length}개`);
    } catch (error) {
      console.error(error);
      alert(error.message || "엑셀/CSV 가져오기에 실패했습니다.");
    } finally {
      event.target.value = "";
    }
  }
};
