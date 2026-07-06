window.ChecklistFeature = {
  filter: "all",

  render(trip) {
    const items = trip.checklist || [];
    const total = items.length;
    const done = items.filter(item => item.done).length;
    const percent = total ? Math.round((done / total) * 100) : 0;

    const filtered = this.filteredItems(items);
    const sorted = [...filtered].sort((a, b) => {
      const doneCompare = Number(a.done) - Number(b.done);
      if (doneCompare !== 0) return doneCompare;
      return String(a.category || "").localeCompare(String(b.category || ""));
    });

    const groups = Utils.groupBy(sorted, item => item.category || "기타");

    return `
      <section class="card">
        <div class="row-between">
          <div>
            <div class="card-title">체크리스트</div>
            <p class="small">준비물과 여행 중 할 일을 완료율로 관리합니다.</p>
          </div>
          <button class="btn primary" onclick="ChecklistFeature.showForm()">+ 추가</button>
        </div>

        <div class="check-progress">
          <div class="row-between">
            <b>${done} / ${total} 완료</b>
            <span>${percent}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-bar" style="width:${percent}%"></div>
          </div>
        </div>

        <div class="filter-row">
          ${this.filterButton("all", "전체")}
          ${this.filterButton("open", "미완료")}
          ${this.filterButton("done", "완료")}
        </div>

        <div class="quick-check-row">
          <button class="btn ghost" onclick="ChecklistFeature.addTemplate('travel')">여행 기본 추가</button>
          <button class="btn ghost" onclick="ChecklistFeature.addTemplate('laundry')">세탁/위생 추가</button>
        </div>
      </section>

      ${Object.keys(groups).length ? Object.keys(groups).map(category => `
        <section class="card">
          <div class="card-title">${Utils.escape(category)}</div>
          ${groups[category].map(item => this.itemHtml(item)).join("")}
        </section>
      `).join("") : `
        <section class="card">
          ${UI.empty(this.filter === "open" ? "미완료 항목이 없습니다." : "체크리스트가 없습니다. + 추가 버튼으로 입력하세요.")}
        </section>
      `}
    `;
  },

  filteredItems(items) {
    if (this.filter === "open") return items.filter(item => !item.done);
    if (this.filter === "done") return items.filter(item => item.done);
    return items;
  },

  filterButton(value, label) {
    return `<button class="filter-btn ${this.filter === value ? "active" : ""}" onclick="ChecklistFeature.setFilter('${value}')">${label}</button>`;
  },

  setFilter(value) {
    this.filter = value;
    App.render();
  },

  itemHtml(item) {
    return `
      <div class="item checklist-item ${item.done ? "done" : ""}">
        <div class="row-between">
          <button class="check-toggle" onclick="ChecklistFeature.toggle('${item.id}')">
            ${item.done ? "☑" : "☐"}
          </button>
          <button class="check-main" onclick="ChecklistFeature.showForm('${item.id}')">
            <div class="item-title">${Utils.escape(item.text)}</div>
            <div class="item-meta">${Utils.escape(item.category || "기타")}</div>
            ${item.memo ? `<div class="item-meta">${Utils.escape(item.memo)}</div>` : ""}
          </button>
          <button class="btn ghost" onclick="ChecklistFeature.showForm('${item.id}')">수정</button>
        </div>
      </div>
    `;
  },

  find(id) {
    return AppState.currentTrip().checklist.find(item => item.id === id) || null;
  },

  showForm(id = "") {
    const item = id ? this.find(id) : null;
    const isEdit = Boolean(item);

    UI.modal(`
      <div class="modal-title">${isEdit ? "체크리스트 수정" : "체크리스트 추가"}</div>

      <div class="field">
        <label>분류</label>
        <select id="checkCategory">
          ${this.categoryOptions(item?.category || "준비물")}
        </select>
      </div>

      <div class="field">
        <label>항목</label>
        <input id="checkText" value="${Utils.escape(item?.text || "")}" placeholder="예: 여권, 충전기, 세탁세제">
      </div>

      <div class="field">
        <label>메모</label>
        <textarea id="checkMemo">${Utils.escape(item?.memo || "")}</textarea>
      </div>

      <label class="check-row">
        <input id="checkDone" type="checkbox" ${item?.done ? "checked" : ""}>
        <span>완료</span>
      </label>

      <div style="height:12px"></div>

      <div class="row-between">
        ${isEdit ? `<button class="btn danger" onclick="ChecklistFeature.remove('${item.id}')">삭제</button>` : `<span></span>`}
        <div class="row">
          <button class="btn" onclick="UI.closeModal()">취소</button>
          <button class="btn primary" onclick="ChecklistFeature.save('${item?.id || ""}')">저장</button>
        </div>
      </div>
    `);
  },

  categoryOptions(selected) {
    const categories = ["준비물", "서류", "전자기기", "세면/위생", "의류", "약/건강", "세탁", "가방", "여행 중 할 일", "기타"];
    return categories.map(category => `<option value="${category}" ${category === selected ? "selected" : ""}>${category}</option>`).join("");
  },

  save(id = "") {
    const trip = AppState.currentTrip();
    const existing = id ? this.find(id) : null;

    const data = {
      id: id || Utils.id("c"),
      category: Utils.value("checkCategory") || "기타",
      text: Utils.value("checkText") || "새 항목",
      memo: Utils.value("checkMemo"),
      done: document.getElementById("checkDone")?.checked || false
    };

    if (existing) {
      Object.assign(existing, data);
    } else {
      trip.checklist.push(data);
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

    if (!confirm(`"${item.text}" 항목을 삭제할까요?`)) return;

    trip.checklist = trip.checklist.filter(check => check.id !== id);
    AppState.save();
    UI.closeModal();
    App.render();
  },

  toggle(id) {
    const item = this.find(id);
    if (!item) return;

    item.done = !item.done;
    AppState.save();
    App.render();
  },

  addTemplate(type) {
    const trip = AppState.currentTrip();
    const templates = {
      travel: [
        ["서류", "여권"],
        ["서류", "항공권/예약 확인"],
        ["전자기기", "충전기"],
        ["전자기기", "보조배터리"],
        ["가방", "비닐봉투"],
        ["약/건강", "상비약"]
      ],
      laundry: [
        ["세탁", "세탁세제"],
        ["세탁", "비닐봉투"],
        ["세면/위생", "휴대용 물티슈"],
        ["세면/위생", "마스크"]
      ]
    };

    const exists = new Set((trip.checklist || []).map(item => `${item.category}:${item.text}`));

    (templates[type] || []).forEach(([category, text]) => {
      const key = `${category}:${text}`;
      if (exists.has(key)) return;

      trip.checklist.push({
        id: Utils.id("c"),
        category,
        text,
        memo: "",
        done: false
      });
    });

    Utils.normalizeTrip(trip);
    AppState.save();
    App.render();
  }
};
