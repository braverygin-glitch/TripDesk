window.ShareView = {
  debugEntries: [],
  startedAt: 0,
  currentStage: "시작",

  log(stage, detail = "") {
    const elapsed = this.startedAt ? `${Date.now() - this.startedAt}ms` : "0ms";
    const entry = {
      time: new Date().toISOString(),
      elapsed,
      stage,
      detail: String(detail || "")
    };

    this.currentStage = stage;
    this.debugEntries.push(entry);
    console.log(`[TripDesk Share] ${stage}`, detail || "");
    this.renderLoading(stage);
  },

  withTimeout(promise, timeoutMs, label) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        window.setTimeout(() => {
          reject(new Error(`${label} 시간이 초과되었습니다. (${timeoutMs / 1000}초)`));
        }, timeoutMs);
      })
    ]);
  },

  async init() {
    this.startedAt = Date.now();
    this.debugEntries = [];

    try {
      this.log("페이지 초기화");

      const token = new URLSearchParams(location.search).get("token");
      this.log("공유 토큰 확인", token ? `토큰 길이 ${token.length}` : "토큰 없음");

      if (!token) {
        this.renderError(
          "공유 링크가 올바르지 않습니다.",
          "주소에 token 값이 없습니다.",
          "TOKEN_MISSING"
        );
        return;
      }

      this.log("Firebase 설정 확인");
      const enabled = await this.withTimeout(
        FirebaseService.init?.(),
        4000,
        "Firebase 설정 확인"
      );

      if (!enabled) {
        throw new Error("Firebase 설정이 로드되지 않았습니다.");
      }

      this.log("공유 서버 연결");
      await this.withTimeout(
        FirebaseService.connectPublicFirestore(),
        8000,
        "공유 서버 연결"
      );

      this.log("공유 데이터 요청");
      const data = await this.withTimeout(
        FirebaseService.loadPublicShare(token),
        10000,
        "공유 데이터 불러오기"
      );

      this.log(
        "공유 데이터 수신",
        `일정 ${(data?.schedule || []).length}개 · 체크리스트 ${(data?.checklist || []).length}개`
      );

      if (!this.isActive(data)) {
        const reason = data?.status === "stopped"
          ? "공유자가 이 링크를 종료했습니다."
          : "이 공유 링크는 여행 종료와 함께 만료되었습니다.";

        this.renderError(
          "공유 링크를 사용할 수 없습니다.",
          reason,
          data?.status === "stopped" ? "SHARE_STOPPED" : "SHARE_EXPIRED"
        );
        return;
      }

      this.log("공유 화면 렌더링");
      this.render(data);
    } catch (error) {
      console.error("Share load failed", error);

      const code = error?.code || "SHARE_LOAD_FAILED";
      const message = error?.message || "알 수 없는 오류가 발생했습니다.";

      this.renderError(
        "공유 일정을 불러오지 못했습니다.",
        message,
        code
      );
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

  renderLoading(stage) {
    const app = this.app();
    if (!app) return;

    app.innerHTML = `
      <header class="topbar">
        <h1 class="top-title">TripDesk 공유 일정</h1>
        <p class="top-sub">읽기 전용</p>
      </header>

      <main class="content share-content">
        <section class="card">
          <div class="card-title">공유 일정을 불러오는 중</div>
          <p class="small">${Utils.escape(stage || "잠시만 기다려 주세요.")}</p>
          <div class="share-loading-track" aria-hidden="true">
            <div class="share-loading-bar"></div>
          </div>
        </section>
      </main>
    `;
  },

  renderError(title, message, code = "UNKNOWN") {
    const debugText = this.debugEntries
      .map(item => `${item.elapsed} · ${item.stage}${item.detail ? ` · ${item.detail}` : ""}`)
      .join("\n");

    this.app().innerHTML = `
      <header class="topbar">
        <h1 class="top-title">${Utils.escape(title)}</h1>
        <p class="top-sub">TripDesk 공유 일정</p>
      </header>

      <main class="content share-content">
        <section class="card share-error-card">
          <div class="card-title">${Utils.escape(title)}</div>
          <p class="small">${Utils.escape(message)}</p>

          <div class="share-error-code">오류 코드: ${Utils.escape(code)}</div>

          <div class="row share-error-actions">
            <button type="button" class="btn primary" onclick="location.reload()">다시 시도</button>
            <button type="button" class="btn" onclick="ShareView.copyDiagnostics()">진단 정보 복사</button>
          </div>
        </section>

        <section class="card">
          <details class="share-debug-details">
            <summary>진단 정보 보기</summary>
            <pre id="shareDebugText">${Utils.escape(debugText || "진단 기록 없음")}</pre>
          </details>
        </section>
      </main>
    `;
  },

  async copyDiagnostics() {
    const text = [
      `URL: ${location.href}`,
      `UserAgent: ${navigator.userAgent}`,
      `온라인 상태: ${navigator.onLine}`,
      `현재 단계: ${this.currentStage}`,
      "",
      ...this.debugEntries.map(item =>
        `${item.time} | ${item.elapsed} | ${item.stage} | ${item.detail}`
      )
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      alert("진단 정보를 복사했습니다.");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      alert("진단 정보를 복사했습니다.");
    }
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

window.addEventListener("error", event => {
  console.error("Global share page error", event.error || event.message);
});

window.addEventListener("unhandledrejection", event => {
  console.error("Unhandled share page rejection", event.reason);
});

document.addEventListener("DOMContentLoaded", () => {
  ShareView.init();
});
