window.MoreFeature = {
  render(trip) {
    return `
      <section class="card">
        <div class="card-title">저장 상태</div>
        <p class="small">${DataService.statusText()}</p>
        <p class="small">${FirebaseService.statusText ? FirebaseService.statusText() : "Firebase 준비됨"}</p>
        <div class="grid-2">
          <button class="btn primary" onclick="MoreFeature.signInFirebase()">Google 로그인</button>
          <button class="btn" onclick="MoreFeature.downloadFromFirebase()">클라우드에서 불러오기</button>
          <button class="btn" onclick="MoreFeature.uploadToFirebase()">클라우드에 저장</button>
          <button class="btn danger" onclick="MoreFeature.signOutFirebase()">로그아웃</button>
        </div>
      </section>

      <section class="card">
        <div>
            <div class="card-title">일정 공유</div>
            <p class="small">일정과 체크리스트만 읽기 전용 링크로 공유합니다. 링크는 여행 종료 후 자동 만료됩니다.</p>
          </div>
          <button class="btn primary" style="width:100%;margin-top:12px" onclick="MoreFeature.showSharePanel()">공유하기</button>
        ${this.shareSummary(trip)}
      </section>

      <section class="card">
        <div class="card-title">엑셀 표준</div>
        <p class="small">날짜, 도시, 시간, 제목, 분류, 태그, 확정여부, 메모, 예약번호, 주소</p>
      </section>

      <section class="card">
        <div class="card-title">버전</div>
        <p class="small">V1.6.7 로그인 UI 복원 + 일정 공유</p>
      </section>
    `;
  },

  shareSummary(trip) {
    if (!trip?.share?.token) {
      return `<p class="small">현재 공유 링크가 없습니다.</p>`;
    }

    const url = this.shareUrl(trip.share.token);
    const status = trip.share.status === "stopped" ? "중지됨" : "공유 중";

    return `
      <div class="notice share-summary">
        <b>${status}</b><br>
        만료: ${Utils.escape(this.expireText(trip.share.expiresAt || FirebaseService.shareExpiresAtForTrip(trip)))}<br>
        <div class="share-actions"><input class="share-url-input" value="${Utils.escape(url)}" readonly onclick="this.select()"><button class="btn copy-share-btn" onclick="navigator.clipboard.writeText(`${url}`).then(()=>alert('링크가 복사되었습니다.'))">복사</button></div>
      </div>
    `;
  },

  shareUrl(token) {
    return `${location.origin}${location.pathname.replace(/index\\.html$/, "")}share.html?token=${encodeURIComponent(token)}`;
  },

  expireText(value) {
    if (!value) return "여행 종료 후";
    return String(value).replace("T", " ").replace("+09:00", "");
  },

  async signInFirebase() {
    try {
      UI.setSaveStatus?.("● Google 로그인 확인 중...", "saving");
      const user = await FirebaseService.signIn();

      if (user) {
        UI.setSaveStatus?.("● Firebase 로그인됨", "ok");
        App.render();
      } else {
        UI.setSaveStatus?.("● 로그인 이동 중", "ok");
      }
    } catch (error) {
      console.error("Firebase sign in failed", error);
      alert(error.message || "Google 로그인 실패");
      App.render();
    }
  },

  async signOutFirebase() {
    try {
      await FirebaseService.signOut();
      UI.setSaveStatus?.("● 로그아웃됨", "ok");
      App.render();
    } catch (error) {
      console.error("Firebase sign out failed", error);
      alert(error.message || "로그아웃 실패");
    }
  },

  async uploadToFirebase() {
    try {
      const user = await this.ensureFirebaseUser();
      if (!user) return;

      if (!confirm("현재 로컬 여행 데이터를 클라우드에 저장할까요?")) return;

      UI.setSaveStatus?.("● 클라우드 저장 중...", "saving");
      await FirebaseService.uploadTrips(AppState.trips);
      UI.setSaveStatus?.("● 클라우드 저장 완료", "ok");
      alert("클라우드에 저장했습니다.");
      App.render();
    } catch (error) {
      console.error("Firebase upload failed", error);
      alert(error.message || "클라우드 저장 실패");
    }
  },

  async downloadFromFirebase() {
    try {
      const user = await this.ensureFirebaseUser();
      if (!user) return;

      UI.setSaveStatus?.("● 클라우드 데이터 확인 중...", "saving");
      const trips = await FirebaseService.downloadTrips();

      if (!trips.length) {
        alert("Firebase에 저장된 여행 데이터가 없습니다.");
        App.render();
        return;
      }

      if (!confirm(`Firebase에서 여행 ${trips.length}개를 불러올까요? 현재 로컬 데이터는 클라우드 데이터로 교체됩니다.`)) {
        App.render();
        return;
      }

      AppState.replaceTripsFromCloud(trips);
      UI.setSaveStatus?.("● 클라우드에서 불러옴", "ok");
      alert(`Firebase 데이터를 불러왔습니다. 여행 ${trips.length}개`);
      App.render();
    } catch (error) {
      console.error("Firebase download failed", error);
      alert(error.message || "Firebase 다운로드 실패");
      App.render();
    }
  },

  async ensureFirebaseUser() {
    let user = await FirebaseService.ensureSignedIn?.(10000);

    if (user) return user;

    user = await FirebaseService.signIn();

    if (!user) {
      alert("Google 로그인 후 다시 시도해 주세요.");
      return null;
    }

    return user;
  },

  showSharePanel() {
    const trip = AppState.currentTrip();

    UI.modal(`
      <div class="modal-title">일정 공유</div>

      <div class="notice">
        <b>공유 내용</b><br>
        ✅ 일정<br>
        ✅ 체크리스트<br>
        ❌ 경비<br>
        ❌ 예약 정보<br>
        ❌ 개인 메모<br>
        ❌ 관리 기능
      </div>

      <div style="height:12px"></div>

      <div class="notice">
        <b>만료 정책</b><br>
        여행 종료 후 자동 만료<br>
        만료 예정: ${Utils.escape(this.expireText(FirebaseService.shareExpiresAtForTrip(trip)))}
      </div>

      ${trip.share?.token ? `
        <div style="height:12px"></div>
        <div class="field">
          <label>공유 링크</label>
          <input id="shareUrl" class="share-url-input" value="${Utils.escape(this.shareUrl(trip.share.token))}" readonly onclick="this.select()">
        </div>
      ` : ""}

      <div style="height:16px"></div>

      <div class="row-between">
        ${trip.share?.token && trip.share?.status !== "stopped"
          ? `<button class="btn danger" onclick="MoreFeature.stopShare()">공유 종료</button>`
          : `<span></span>`}
        <div class="row">
          ${trip.share?.token ? `<button class="btn" onclick="MoreFeature.copyShareLink()">링크 복사</button>` : ""}
          <button class="btn primary" onclick="MoreFeature.createShare()">${trip.share?.token ? "공유 갱신" : "공유 링크 만들기"}</button>
        </div>
      </div>
    `);
  },

  async createShare() {
    try {
      const trip = AppState.currentTrip();
      if (!trip) return;

      const user = await this.ensureFirebaseUser();
      if (!user) return;

      UI.setSaveStatus?.("● 공유 링크 생성 중...", "saving");

      const result = await FirebaseService.createOrUpdatePublicShare(trip);

      trip.share = {
        token: result.token,
        url: result.url,
        status: "active",
        createdAt: trip.share?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: result.expiresAt
      };

      AppState.save();

      await FirebaseService.uploadTrips?.(AppState.trips);

      UI.closeModal();
      App.render();

      await this.copyText(result.url);
      alert("보안 토큰이 포함된 공유 링크를 만들고 클립보드에 복사했습니다.");
    } catch (error) {
      console.error("Create share failed", error);
      alert(error.message || "공유 링크 생성 실패");
    }
  },

  async stopShare() {
    try {
      const trip = AppState.currentTrip();
      if (!trip?.share?.token) return;

      const user = await this.ensureFirebaseUser();
      if (!user) return;

      if (!confirm("공유 링크를 종료할까요? 종료 후 기존 링크는 사용할 수 없습니다.")) return;

      await FirebaseService.stopPublicShare(trip.share.token);

      trip.share.status = "stopped";
      trip.share.updatedAt = new Date().toISOString();

      AppState.save();
      await FirebaseService.uploadTrips?.(AppState.trips);

      UI.closeModal();
      App.render();
      alert("공유를 종료했습니다.");
    } catch (error) {
      console.error("Stop share failed", error);
      alert(error.message || "공유 종료 실패");
    }
  },

  async copyShareLink() {
    const trip = AppState.currentTrip();
    if (!trip?.share?.token) return;

    await this.copyText(this.shareUrl(trip.share.token));
    alert("공유 링크를 복사했습니다.");
  },

  async copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const input = document.createElement("textarea");
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
  }
};
