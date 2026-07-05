window.MoreFeature = {
  render() {
    const localCount = AppState.trips.length;

    return `
      <section class="card">
        <div class="card-title">저장 상태</div>
        <p class="small">${DataService.statusText()}</p>
        <p class="small">로컬 여행: ${localCount}개</p>
      </section>

      <section class="card">
        <div class="card-title">Firebase 동기화</div>
        <p class="small">${FirebaseService.statusText()}</p>
        <div class="grid-2">
          <button class="btn" onclick="MoreFeature.showFirebaseConfig()">설정</button>
          <button class="btn" onclick="MoreFeature.connectFirebase()">연결</button>
          <button class="btn primary" onclick="MoreFeature.signInFirebase()">Google 로그인</button>
          <button class="btn" onclick="MoreFeature.signOutFirebase()">로그아웃</button>
          <button class="btn" onclick="MoreFeature.uploadToFirebase()">현재 데이터 업로드</button>
          <button class="btn" onclick="MoreFeature.downloadFromFirebase()">클라우드에서 불러오기</button>
        </div>
        <div style="height:8px"></div>
        <button class="btn primary full" onclick="MoreFeature.startRealtimeSync()">실시간 동기화 시작</button>
        <p class="small">PC와 휴대폰에서 일정, 예약, 경비, 체크리스트를 수정할 수 있습니다.</p>
      </section>

      <section class="card danger-zone">
        <div class="card-title">Firebase 정리</div>
        <p class="small">중복 여행이나 테스트 데이터를 정리할 때 사용합니다.</p>
        <div class="grid-2">
          <button class="btn danger" onclick="MoreFeature.overwriteCloudWithLocal()">현재 로컬 데이터로 클라우드 덮어쓰기</button>
          <button class="btn danger" onclick="MoreFeature.clearCloudTrips()">클라우드 전체 초기화</button>
          <button class="btn danger" onclick="MoreFeature.clearLocalTripsOnly()">이 기기 로컬 데이터 초기화</button>
          <button class="btn" onclick="MoreFeature.showCleanupGuide()">정리 순서 보기</button>
        </div>
      </section>

      <section class="card">
        <div class="card-title">엑셀 표준</div>
        <p class="small">날짜, 도시, 시간, 제목, 분류, 태그, 확정여부, 메모, 예약번호, 주소</p>
      </section>

      <section class="card">
        <div class="card-title">보류 기능</div>
        <p class="small">통화 추가, 결제수단 추가, 카테고리 추가, 여행 전 사용 금액, 사진/메모는 핵심 기능 완료 후 추가합니다.</p>
      </section>
    `;
  },

  showFirebaseConfig() {
    const existing = FirebaseService.getConfig();
    const value = existing ? JSON.stringify(existing, null, 2) : "";

    UI.modal(`
      <div class="modal-title">Firebase 설정</div>
      <p class="small">Firebase Console의 웹 앱 설정(firebaseConfig)을 그대로 붙여넣으세요.</p>
      <div class="field">
        <label>firebaseConfig JSON</label>
        <textarea id="firebaseConfigText" style="min-height:220px" placeholder='{"apiKey":"...","authDomain":"...","projectId":"...","appId":"..."}'>${Utils.escape(value)}</textarea>
      </div>
      <div class="grid-2">
        <button class="btn" onclick="UI.closeModal()">취소</button>
        <button class="btn primary" onclick="MoreFeature.saveFirebaseConfig()">저장</button>
      </div>
    `);
  },

  saveFirebaseConfig() {
    try {
      FirebaseService.saveConfig(Utils.value("firebaseConfigText"));
      UI.closeModal();
      App.render();
      alert("Firebase 설정을 저장했습니다.");
    } catch (error) {
      alert(error.message || "Firebase 설정 저장에 실패했습니다.");
    }
  },

  async connectFirebase() {
    try {
      await FirebaseService.connect();
      App.render();
      alert("Firebase 연결이 완료되었습니다.");
    } catch (error) {
      alert(error.message || "Firebase 연결 실패");
    }
  },

  async signInFirebase() {
    try {
      await FirebaseService.signIn();
      App.render();
    } catch (error) {
      alert(error.message || "Google 로그인 실패");
    }
  },

  async signOutFirebase() {
    try {
      await FirebaseService.signOut();
      App.render();
      alert("로그아웃했습니다.");
    } catch (error) {
      alert(error.message || "로그아웃 실패");
    }
  },

  async uploadToFirebase() {
    try {
      if (!confirm("현재 로컬 여행 데이터를 Firebase에 업로드할까요? 기존 클라우드 데이터는 유지됩니다.")) return;
      await FirebaseService.connect();
      if (!FirebaseService.isSignedIn()) await FirebaseService.signIn();
      await FirebaseService.uploadTrips(AppState.trips);
      App.render();
      alert("Firebase 업로드가 완료되었습니다.");
    } catch (error) {
      alert(error.message || "Firebase 업로드 실패");
    }
  },

  async overwriteCloudWithLocal() {
    try {
      if (!confirm("현재 이 기기에 남아 있는 여행 목록으로 클라우드를 완전히 덮어쓸까요? 클라우드의 기존 여행은 모두 삭제됩니다.")) return;
      if (!confirm("정말 진행할까요? 이 작업은 Firebase의 중복 여행을 삭제합니다.")) return;

      await FirebaseService.connect();
      if (!FirebaseService.isSignedIn()) await FirebaseService.signIn();

      await FirebaseService.overwriteTrips(AppState.trips);
      App.render();
      alert("현재 로컬 데이터로 클라우드를 덮어썼습니다.");
    } catch (error) {
      alert(error.message || "클라우드 덮어쓰기 실패");
    }
  },

  async clearCloudTrips() {
    try {
      if (!confirm("Firebase 클라우드에 저장된 모든 여행을 삭제할까요? 이 기기의 로컬 데이터는 삭제되지 않습니다.")) return;
      if (!confirm("정말 클라우드 전체를 초기화할까요?")) return;

      await FirebaseService.connect();
      if (!FirebaseService.isSignedIn()) await FirebaseService.signIn();

      const count = await FirebaseService.deleteAllCloudTrips();
      App.render();
      alert(`클라우드 여행 ${count}개를 삭제했습니다.`);
    } catch (error) {
      alert(error.message || "클라우드 초기화 실패");
    }
  },

  clearLocalTripsOnly() {
    if (!confirm("이 기기의 로컬 여행 데이터를 모두 삭제할까요? Firebase 클라우드에는 영향이 없습니다.")) return;
    if (!confirm("정말 이 기기의 로컬 데이터를 초기화할까요?")) return;

    AppState.clearLocalTrips();
    App.render();
    alert("이 기기의 로컬 데이터를 초기화했습니다.");
  },

  async downloadFromFirebase() {
    try {
      if (!confirm("Firebase 데이터를 이 기기로 불러올까요? 현재 로컬 데이터는 클라우드 데이터로 교체됩니다.")) return;
      await FirebaseService.connect();
      if (!FirebaseService.isSignedIn()) await FirebaseService.signIn();

      const trips = await FirebaseService.downloadTrips();
      if (!trips.length) {
        alert("Firebase에 저장된 여행 데이터가 없습니다.");
        return;
      }

      AppState.replaceTripsFromCloud(trips);
      App.render();
      alert("Firebase 데이터를 불러왔습니다.");
    } catch (error) {
      alert(error.message || "Firebase 다운로드 실패");
    }
  },

  async startRealtimeSync() {
    try {
      await FirebaseService.connect();
      if (!FirebaseService.isSignedIn()) await FirebaseService.signIn();

      FirebaseService.startRealtimeSync(trips => {
        AppState.replaceTripsFromCloud(trips);
        App.render();
        UI.setSaveStatus?.("● 클라우드에서 갱신됨", "ok");
      });

      FirebaseService.syncEnabled = true;
      await FirebaseService.overwriteTrips(AppState.trips);
      App.render();
      alert("실시간 동기화를 시작했습니다.");
    } catch (error) {
      alert(error.message || "실시간 동기화 시작 실패");
    }
  },

  showCleanupGuide() {
    UI.modal(`
      <div class="modal-title">중복 여행 정리 순서</div>
      <div class="notice">
        <p><b>추천 순서</b></p>
        <p>1. 목록에서 남길 여행 1개만 남기고 나머지는 삭제합니다.</p>
        <p>2. 더보기 → Firebase 정리 → 현재 로컬 데이터로 클라우드 덮어쓰기를 누릅니다.</p>
        <p>3. 휴대폰에서는 클라우드에서 불러오기를 다시 실행합니다.</p>
        <p>이렇게 하면 중복 여행이 다시 살아나지 않습니다.</p>
      </div>
      <div style="height:10px"></div>
      <button class="btn primary full" onclick="UI.closeModal()">확인</button>
    `);
  }
};
