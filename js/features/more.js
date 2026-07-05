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
        <p class="small">자동 동기화: ${FirebaseService.isAutoSyncEnabled?.() ? "켜짐" : "꺼짐"}</p>
        <div class="grid-2">
          <button class="btn primary" onclick="MoreFeature.signInFirebase()">Google 로그인</button>
          <button class="btn" onclick="MoreFeature.signOutFirebase()">로그아웃</button>
          <button class="btn" onclick="MoreFeature.uploadToFirebase()">현재 데이터 업로드</button>
          <button class="btn" onclick="MoreFeature.downloadFromFirebase()">클라우드에서 불러오기</button>
        </div>
        <div style="height:8px"></div>
        <button class="btn primary full" onclick="MoreFeature.startRealtimeSync()">실시간 동기화 시작</button>
        <div style="height:8px"></div>
        <button class="btn full" onclick="MoreFeature.disableAutoSync()">자동 동기화 끄기</button>
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
        <div class="card-title">고급 설정</div>
        <p class="small">Firebase 설정은 앱에 내장되어 있습니다. 일반적으로 별도 설정이 필요 없습니다.</p>
        <button class="btn full" onclick="MoreFeature.showFirebaseConfig()">Firebase 설정 확인</button>
      </section>
    `;
  },

  showFirebaseConfig() {
    const value = JSON.stringify(FirebaseService.getConfig(), null, 2);
    UI.modal(`
      <div class="modal-title">Firebase 설정 확인</div>
      <p class="small">Firebase 설정은 앱에 내장되어 있습니다.</p>
      <div class="field">
        <label>firebaseConfig JSON</label>
        <textarea id="firebaseConfigText" style="min-height:220px" readonly>${Utils.escape(value)}</textarea>
      </div>
      <button class="btn primary full" onclick="UI.closeModal()">닫기</button>
    `);
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
      alert("실시간 동기화를 시작했습니다. 다음부터는 앱을 열 때 자동으로 연결을 시도합니다.");
    } catch (error) {
      alert(error.message || "실시간 동기화 시작 실패");
    }
  },

  disableAutoSync() {
    FirebaseService.disableAutoSync?.();
    App.render();
    alert("자동 동기화를 껐습니다. 필요하면 다시 실시간 동기화 시작을 누르세요.");
  },

  showCleanupGuide() {
    UI.modal(`
      <div class="modal-title">중복 여행 정리 순서</div>
      <div class="notice">
        <p><b>추천 순서</b></p>
        <p>1. 목록에서 남길 여행 1개만 남기고 나머지는 삭제합니다.</p>
        <p>2. 더보기 → Firebase 정리 → 현재 로컬 데이터로 클라우드 덮어쓰기를 누릅니다.</p>
        <p>3. 휴대폰에서는 클라우드에서 불러오기를 다시 실행합니다.</p>
      </div>
      <div style="height:10px"></div>
      <button class="btn primary full" onclick="UI.closeModal()">확인</button>
    `);
  }
};
