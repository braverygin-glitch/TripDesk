window.UI = {
  app() {
    return document.getElementById("app");
  },

  topbar(title, subtitle, rightHtml = "") {
    return `
      <header class="topbar">
        <div class="row-between">
          <div>
            <h1 class="top-title">${Utils.escape(title)}</h1>
            <p class="top-sub">${Utils.escape(subtitle || "")}</p>
          </div>
          ${rightHtml}
        </div>
      </header>
    `;
  },

  nav() {
    const tabs = [
      ["home", "🏠", "홈"],
      ["schedule", "🗓️", "달력"],
      ["bookings", "📦", "예약"],
      ["expenses", "💰", "경비"],
      ["checklist", "✅", "체크"],
      ["trips", "🧳", "관리"],
      ["more", "☰", "더보기"]
    ];

    return `
      <nav class="bottom-nav">
        ${tabs.map(([id, icon, label]) => `
          <button type="button" class="nav-btn ${AppState.currentTab === id ? "active" : ""}" onclick="App.setTab('${id}')">
            <span>${icon}</span>${label}
          </button>
        `).join("")}
      </nav>
    `;
  },
  shell(title, subtitle, content, rightHtml = "") {
    this.app().innerHTML = `
      ${this.topbar(title, subtitle, rightHtml)}
      <main class="content">
        ${this.saveStatus()}
        ${content}
      </main>
      ${this.nav()}
    `;
  },

  saveStatus() {
    return `<div id="saveStatus" class="save-status">● 저장됨</div>`;
  },

  setSaveStatus(text, mode = "ok") {
    const el = document.getElementById("saveStatus");
    if (!el) return;
    el.textContent = text;
    el.className = `save-status ${mode}`;
  },

  modal(html) {
    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop";
    wrap.id = "modalBackdrop";
    wrap.innerHTML = `<div class="modal">${html}</div>`;
    wrap.addEventListener("click", event => {
      if (event.target.id === "modalBackdrop") this.closeModal();
    });
    document.body.appendChild(wrap);
  },

  closeModal() {
    document.getElementById("modalBackdrop")?.remove();
  },

  empty(text) {
    return `<p class="small">${Utils.escape(text)}</p>`;
  },

  tags(tags) {
    if (!Array.isArray(tags) || !tags.length) return "";
    return tags.map(tag => `<span class="badge">${Utils.escape(tag)}</span>`).join("");
  }
};
