window.MoreFeature = {
  render() {
    return `
      <section class="card">
        <div class="card-title">저장 상태</div>
        <p class="small">${DataService.statusText()}</p>
      </section>

      <section class="card">
        <div class="card-title">Firebase 동기화</div>
        <p class="small">${FirebaseService.statusText()}</p>
        <div class="grid-2">
          <button class="btn" onclick="MoreFeature.showFirebaseConfig()">설정</button>
          <button class="btn" onclick="MoreFeature.connectFirebase()">연결</button>
          <button class="btn primary" onclick="MoreFeature.signInFirebase()">Google 로그인</button>
          <button class="btn" onclick="MoreFeature.signOutFirebase()">로그아웃</button>
          <button class="btn" onclick="MoreFeature.uploadToFirebase()">PC/현재 데이터 업로드</button>
          <button class="btn" onclick="MoreFeature.downloadFromFirebase()">클라우드에서 불러오기</button>
        </div>
        <div style="height:8px"></div>
        <button class="btn primary full" onclick="MoreFeature.startRealtimeSync()">실시간 동기화 시작</button>
        <p class="small">휴대폰에서도 일정, 예약, 경비, 체크리스트를 수정할 수 있습니다. 수정 내용은 Firebase를 통해 PC와 동기화됩니다.</p>
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
      if (!confirm("현재 로컬 여행 데이터를 Firebase에 업로드할까요?")) return;
      await FirebaseService.connect();
      if (!FirebaseService.isSignedIn()) await FirebaseService.signIn();
      await FirebaseService.uploadTrips(AppState.trips);
      App.render();
      alert("Firebase 업로드가 완료되었습니다.");
    } catch (error) {
      alert(error.message || "Firebase 업로드 실패");
    }
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
      await FirebaseService.uploadTrips(AppState.trips);
      App.render();
      alert("실시간 동기화를 시작했습니다.");
    } catch (error) {
      alert(error.message || "실시간 동기화 시작 실패");
    }
  }
};
