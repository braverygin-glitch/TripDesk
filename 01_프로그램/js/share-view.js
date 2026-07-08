window.ShareView = {
  async init() {
    try {
      await FirebaseService.init?.();

      const token = new URLSearchParams(location.search).get("token");
      if (!token) {
        this.renderMessage("공유 링크가 올바르지 않습니다.", "token 값이 없습니다.");
        return;
      }

      const data = await FirebaseService.loadPublicShare(token);

      if (!this.isActive(data)) {
        const reason = data?.status === "stopped"
          ? "공유자가 이 링크를 종료했습니다."
          : "이 공유 링크는 여행 종료와 함께 만료되었습니다.";
        this.renderMessage("공유 링크가 만료되었습니다.", reason);
        return;
      }

      this.render(data);
    } catch (error) {
      console.error("Share load failed", error);
      this.renderMessage("공유 일정을 불러오지 못했습니다.", error.message || "잠시 후 다시 시도해 주세요.");
    }
  },

  isActive(data) {
    if (!data || data.status !== "active") return false;

    if (data.expiresAt) {
      const expires = new Date(data.expiresAt);
      if (Number.isFinite(expires.getTime()) && Date.now() > expires.getTime()) {
        return false;
      }
    }

    return true;
  },

  app() {
    return document.getElementById("shareApp");
  },

  renderMessage(title, message) {
    this.app().innerHTML = `
      <header class="topbar">
        <h1 class="top-title">${Utils.escape(title)}</h1>
        <p class="top-sub">TripDesk 공유 일정</p>
      </header>
      <main class="content">
        <section class="card">
          <div class="card-title">${Utils.escape(title)}</div>
          <p class="small">${Utils.escape(message)}</p>
        </section>
      </main>
    `;
  },

  render(data) {
    const schedule = [...(data.schedule || [])].sort((a, b) => {
      const d = String(a.date || "").localeCompare(String(b.date || ""));
      if (d !== 0) return d;
      return String(a.time || "").localeCompare(String(b.time || ""));
    });

    const checklist = [...(data.checklist || [])].sort((a, b) => {
      const done = Number(a.done) - Number(b.done);
      if (done !== 0) return done;
      return String(a.category || "").localeCompare(String(b.category || ""));
    });

    const groupedSchedule = Utils.groupBy(schedule, item => item.date || "날짜 없음");
    const groupedChecklist = Utils.groupBy(checklist, item => item.category || "기타");

    this.app().innerHTML = `
      <header class="topbar">
        <h1 class="top-title">${Utils.escape(data.title || "공유 여행")}</h1>
        <p class="top-sub">${Utils.formatDate(data.startDate)} ~ ${Utils.formatDate(data.endDate)} · 읽기 전용</p>
      </header>

      <main class="content share-content">
        <section class="card">
          <div class="card-title">공유 안내</div>
          <p class="small">이 화면은 일정과 체크리스트만 보여주는 읽기 전용 공유 화면입니다.</p>
          <p class="small">만료: ${Utils.escape(String(data.expiresAt || "").replace("T", " ").replace("+09:00", ""))}</p>
        </section>

        <section class="card">
          <div class="card-title">일정</div>
          ${Object.keys(groupedSchedule).length ? Object.keys(groupedSchedule).map(date => `
            <div class="share-day">
              <div class="share-day-title">${Utils.formatDate(date)}</div>
              ${groupedSchedule[date].map(item => `
                <div class="share-item">
                  <div class="share-time">${Utils.escape(item.time || "시간 미정")} · ${Utils.escape(item.city || "")}</div>
                  <div class="share-title">${Utils.escape(item.title || "")}</div>
                  ${item.address ? `<div class="share-meta">📍 ${Utils.escape(item.address)}</div>` : ""}
                </div>
              `).join("")}
            </div>
          `).join("") : `<p class="small">공유된 일정이 없습니다.</p>`}
        </section>

        <section class="card">
          <div class="card-title">체크리스트</div>
          ${Object.keys(groupedChecklist).length ? Object.keys(groupedChecklist).map(category => `
            <div class="share-check-group">
              <div class="share-day-title">${Utils.escape(category)}</div>
              ${groupedChecklist[category].map(item => `
                <div class="share-check ${item.done ? "done" : ""}">
                  <span>${item.done ? "☑" : "☐"}</span>
                  <span>${Utils.escape(item.text || "")}</span>
                </div>
              `).join("")}
            </div>
          `).join("") : `<p class="small">공유된 체크리스트가 없습니다.</p>`}
        </section>
      </main>
    `;
  }
};

document.addEventListener("DOMContentLoaded", () => ShareView.init());
