window.FirebaseService = {
  enabled: false,
  connected: false,
  syncEnabled: false,
  user: null,
  authChecked: false,
  configKey: "tripdesk.firebase.config",
  saveTimer: null,
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
    this.stopRealtimeSync();
    localStorage.removeItem(this.configKey);
    this.enabled = false;
    this.connected = false;
    this.user = null;
    this.authChecked = false;
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

      this.connected = true;
      this.enabled = true;

      await this.resolveAuthState();

      return true;
    } catch (error) {
      console.error("Firebase connect failed", error);
      this.connected = false;
      const code = error?.code ? ` (${error.code})` : "";
      const message = error?.message ? `\n${error.message}` : "";
      throw new Error(`Firebase 연결에 실패했습니다${code}.${message}`);
    }
  },

  async resolveAuthState() {
    if (!this.auth || !this.modules.auth) return null;

    try {
      const redirectResult = await this.modules.auth.getRedirectResult(this.auth);
      if (redirectResult?.user) {
        this.user = redirectResult.user;
      }
    } catch (error) {
      console.warn("Firebase redirect result failed", error);
    }

    await new Promise(resolve => {
      const unsubscribe = this.modules.auth.onAuthStateChanged(this.auth, user => {
        this.user = user || null;
        this.authChecked = true;
        unsubscribe();
        resolve(this.user);
      });
    });

    return this.user;
  },

  async ensureConnected() {
    await this.connect();
    return true;
  },

  async ensureSignedIn() {
    await this.connect();

    if (this.user) {
      return this.user;
    }

    throw new Error("Firebase 로그인이 필요합니다. 먼저 Google 로그인을 눌러 로그인하세요.");
  },

  async signIn() {
    await this.connect();

    if (this.user) {
      return this.user;
    }

    try {
      const provider = new this.modules.auth.GoogleAuthProvider();
      await this.modules.auth.signInWithRedirect(this.auth, provider);
      return null;
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
    this.authChecked = true;
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
      this.uploadTrips(snapshot, { silent: true }).catch(error => {
        console.warn("Firebase background sync failed", error);
        UI.setSaveStatus?.("● 로컬 저장됨 · 동기화 실패", "warn");
      });
    }, 700);
  },

  async uploadTrips(trips, options = {}) {
    await this.ensureSignedIn();

    const { setDoc, serverTimestamp } = this.modules.firestore;

    for (const trip of trips) {
      const cleanTrip = Utils.clone(trip);
      cleanTrip.cloudUpdatedAt = new Date().toISOString();
      await setDoc(this.tripDocRef(cleanTrip.id), {
        ...cleanTrip,
        syncedAt: serverTimestamp()
      }, { merge: true });
    }

    if (!options.silent) {
      UI.setSaveStatus?.("● 클라우드 동기화됨", "ok");
    }

    return true;
  },

  async downloadTrips() {
    await this.ensureSignedIn();

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

  async startRealtimeSync(onTripsChanged) {
    await this.ensureSignedIn();

    this.stopRealtimeSync();

    const { onSnapshot } = this.modules.firestore;
    this.syncEnabled = true;

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

  statusText() {
    if (!this.getConfig()) return "Firebase 설정 없음";
    if (!this.connected) return "Firebase 설정 있음 · 연결 전";
    if (!this.authChecked) return "Firebase 연결됨 · 로그인 확인 중";
    if (!this.user) return "Firebase 연결됨 · 로그인 전";
    if (this.syncEnabled) return `실시간 동기화 중 · ${this.user.email}`;
    return `로그인됨 · ${this.user.email}`;
  }
};
