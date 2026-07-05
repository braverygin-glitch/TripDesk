window.FirebaseService = {
  enabled: false,
  connected: false,
  syncEnabled: false,
  user: null,
  configKey: "tripdesk.firebase.config",
  autoSyncKey: "tripdesk.firebase.autoSync",
  redirectPendingKey: "tripdesk.firebase.redirectPending",
  saveTimer: null,
  autoStarted: false,
  unsubscribeTrips: null,

  modules: {
    app: null,
    auth: null,
    firestore: null
  },

  firebaseApp: null,
  auth: null,
  db: null,

  init() {
    this.enabled = Boolean(this.getConfig());
  },

  getConfig() {
    if (window.TRIPDESK_FIREBASE_CONFIG?.apiKey) {
      return window.TRIPDESK_FIREBASE_CONFIG;
    }

    try {
      const raw = localStorage.getItem(this.configKey);
      if (!raw) return null;
      const config = JSON.parse(raw);
      if (!config || !config.apiKey || !config.projectId || !config.appId) return null;
      return config;
    } catch {
      return null;
    }
  },

  saveConfig(configText) {
    let config;

    try {
      config = typeof configText === "string" ? JSON.parse(configText) : configText;
    } catch {
      throw new Error("Firebase 설정 JSON 형식이 올바르지 않습니다.");
    }

    const required = ["apiKey", "authDomain", "projectId", "appId"];
    const missing = required.filter(key => !config[key]);

    if (missing.length) {
      throw new Error(`Firebase 설정에 ${missing.join(", ")} 값이 없습니다.`);
    }

    localStorage.setItem(this.configKey, JSON.stringify(config));
    this.enabled = true;
    return config;
  },

  clearConfig() {
    localStorage.removeItem(this.configKey);
    this.enabled = Boolean(window.TRIPDESK_FIREBASE_CONFIG?.apiKey);
    this.connected = false;
    this.user = null;
  },

  async connect() {
    const config = this.getConfig();
    if (!config) {
      throw new Error("Firebase 설정이 없습니다.");
    }

    if (this.connected && this.db && this.auth) {
      return true;
    }

    try {
      const [appModule, authModule, firestoreModule] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js")
      ]);

      this.modules.app = appModule;
      this.modules.auth = authModule;
      this.modules.firestore = firestoreModule;

      this.firebaseApp = appModule.initializeApp(config);
      this.auth = authModule.getAuth(this.firebaseApp);
      this.db = firestoreModule.getFirestore(this.firebaseApp);

      authModule.onAuthStateChanged(this.auth, user => {
        this.user = user || null;
      });

      try {
        const redirectResult = await authModule.getRedirectResult(this.auth);
        if (redirectResult?.user) {
          this.user = redirectResult.user;
          sessionStorage.removeItem(this.redirectPendingKey);
        }
      } catch (redirectError) {
        sessionStorage.removeItem(this.redirectPendingKey);
        console.warn("Firebase redirect result failed", redirectError);
      }

      this.connected = true;
      this.enabled = true;
      return true;
    } catch (error) {
      console.error("Firebase connect failed", error);
      this.connected = false;
      throw new Error("Firebase 연결에 실패했습니다. 설정값과 인터넷 연결을 확인하세요.");
    }
  },

  isMobileBrowser() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  },

  async handleRedirectOnLoad() {
    if (!this.getConfig()) return false;

    const hasRedirectMarker = sessionStorage.getItem(this.redirectPendingKey) === "1";
    const hasAuthParams = /[?&](apiKey|oobCode|mode|state|code)=/.test(location.search || "");

    if (!hasRedirectMarker && !hasAuthParams) return false;

    await this.connect();
    sessionStorage.removeItem(this.redirectPendingKey);
    return Boolean(this.user || this.auth?.currentUser);
  },


  async signIn() {
    await this.connect();

    try {
      const provider = new this.modules.auth.GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account"
      });

      if (this.isMobileBrowser()) {
        sessionStorage.setItem(this.redirectPendingKey, "1");
        await this.modules.auth.signInWithRedirect(this.auth, provider);
        return null;
      }

      try {
        const result = await this.modules.auth.signInWithPopup(this.auth, provider);
        this.user = result?.user || this.auth.currentUser || null;
        return this.user;
      } catch (popupError) {
        const popupBlockedCodes = [
          "auth/popup-blocked",
          "auth/popup-closed-by-user",
          "auth/cancelled-popup-request",
          "auth/operation-not-supported-in-this-environment"
        ];

        if (!popupBlockedCodes.includes(popupError?.code)) {
          throw popupError;
        }

        sessionStorage.setItem(this.redirectPendingKey, "1");
        await this.modules.auth.signInWithRedirect(this.auth, provider);
        return null;
      }
    } catch (error) {
      console.error("Firebase sign in failed", error);
      const code = error?.code ? ` (${error.code})` : "";
      const message = error?.message ? `\n${error.message}` : "";
      throw new Error(`Google 로그인에 실패했습니다${code}.${message}`);
    }
  },
  async signOut() {
    if (!this.connected || !this.auth) return;
    this.stopRealtimeSync();
    await this.modules.auth.signOut(this.auth);
    this.user = null;
  },

  isReady() {
    return this.enabled && this.connected && this.db && this.auth;
  },

  isSignedIn() {
    return Boolean(this.user);
  },

  tripsCollectionRef() {
    if (!this.isReady() || !this.user) {
      throw new Error("Firebase 로그인이 필요합니다.");
    }

    const { collection } = this.modules.firestore;
    return collection(this.db, "users", this.user.uid, "trips");
  },

  tripDocRef(tripId) {
    if (!this.isReady() || !this.user) {
      throw new Error("Firebase 로그인이 필요합니다.");
    }

    const { doc } = this.modules.firestore;
    return doc(this.db, "users", this.user.uid, "trips", tripId);
  },

  scheduleSaveTrips(trips) {
    if (!this.isReady() || !this.isSignedIn() || !this.syncEnabled) return;

    window.clearTimeout(this.saveTimer);
    const snapshot = Utils.clone(trips);

    this.saveTimer = window.setTimeout(() => {
      this.overwriteTrips(snapshot).catch(error => {
        console.warn("Firebase background sync failed", error);
        UI.setSaveStatus?.("● 로컬 저장됨 · 동기화 실패", "warn");
      });
    }, 900);
  },

  async uploadTrips(trips) {
    await this.connect();
    if (!this.user) throw new Error("Firebase 로그인이 필요합니다.");

    const { setDoc, serverTimestamp } = this.modules.firestore;

    for (const trip of trips) {
      const cleanTrip = Utils.clone(trip);
      cleanTrip.cloudUpdatedAt = new Date().toISOString();
      await setDoc(this.tripDocRef(cleanTrip.id), {
        ...cleanTrip,
        syncedAt: serverTimestamp()
      }, { merge: true });
    }

    UI.setSaveStatus?.("● 클라우드 동기화됨", "ok");
    return true;
  },

  async deleteAllCloudTrips() {
    await this.connect();
    if (!this.user) throw new Error("Firebase 로그인이 필요합니다.");

    const { getDocs, deleteDoc } = this.modules.firestore;
    const snapshot = await getDocs(this.tripsCollectionRef());

    const deletes = [];
    snapshot.forEach(docSnap => {
      deletes.push(deleteDoc(this.tripDocRef(docSnap.id)));
    });

    await Promise.all(deletes);
    UI.setSaveStatus?.("● 클라우드 초기화됨", "ok");
    return deletes.length;
  },

  async overwriteTrips(trips) {
    await this.connect();
    if (!this.user) throw new Error("Firebase 로그인이 필요합니다.");

    await this.deleteAllCloudTrips();
    await this.uploadTrips(trips);
    UI.setSaveStatus?.("● 클라우드 덮어쓰기 완료", "ok");
    return true;
  },

  async downloadTrips() {
    await this.connect();
    if (!this.user) throw new Error("Firebase 로그인이 필요합니다.");

    const { getDocs } = this.modules.firestore;
    const snapshot = await getDocs(this.tripsCollectionRef());
    const trips = [];

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      delete data.syncedAt;
      Utils.normalizeTrip(data);
      trips.push(data);
    });

    return trips;
  },

  startRealtimeSync(onTripsChanged) {
    if (!this.isReady() || !this.user) {
      throw new Error("Firebase 로그인이 필요합니다.");
    }

    this.stopRealtimeSync();

    const { onSnapshot } = this.modules.firestore;
    this.syncEnabled = true;
    this.enableAutoSync();

    this.unsubscribeTrips = onSnapshot(this.tripsCollectionRef(), snapshot => {
      const trips = [];

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        delete data.syncedAt;
        Utils.normalizeTrip(data);
        trips.push(data);
      });

      if (trips.length) {
        onTripsChanged(trips);
      }
    }, error => {
      console.error("Realtime sync failed", error);
      UI.setSaveStatus?.("● 실시간 동기화 오류", "warn");
    });

    return true;
  },

  stopRealtimeSync() {
    if (typeof this.unsubscribeTrips === "function") {
      this.unsubscribeTrips();
    }

    this.unsubscribeTrips = null;
    this.syncEnabled = false;
  },

  enableAutoSync() {
    localStorage.setItem(this.autoSyncKey, "1");
  },

  disableAutoSync() {
    localStorage.removeItem(this.autoSyncKey);
    this.autoStarted = false;
    this.stopRealtimeSync();
  },

  isAutoSyncEnabled() {
    return localStorage.getItem(this.autoSyncKey) === "1";
  },

  async startAutoSyncIfPossible(onTripsChanged) {
    if (this.autoStarted || !this.isAutoSyncEnabled() || !this.getConfig()) {
      return false;
    }

    try {
      await this.connect();

      // Firebase Auth usually restores the previous Google login automatically.
      await new Promise(resolve => window.setTimeout(resolve, 500));

      if (!this.user) {
        UI.setSaveStatus?.("● Firebase 로그인 필요", "warn");
        return false;
      }

      this.startRealtimeSync(onTripsChanged);
      this.autoStarted = true;
      UI.setSaveStatus?.("● 자동 동기화 중", "ok");
      return true;
    } catch (error) {
      console.warn("Auto Firebase sync failed", error);
      UI.setSaveStatus?.("● 자동 동기화 실패", "warn");
      return false;
    }
  },

  statusText() {
    if (!this.getConfig()) return "Firebase 설정 없음";
    if (!this.connected) return "Firebase 준비됨 · 연결 전";
    if (!this.user) return "Firebase 연결됨 · 로그인 전";
    if (this.syncEnabled) return `실시간 동기화 중 · ${this.user.email}`;
    return `로그인됨 · ${this.user.email}`;
  }
};
