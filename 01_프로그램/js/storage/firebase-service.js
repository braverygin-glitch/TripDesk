window.FirebaseService = {
  enabled: false,
  connected: false,
  syncEnabled: false,
  user: null,
  authChecking: false,
  lastAuthError: "",

  configKey: "tripdesk.firebase.config",
  autoSyncKey: "tripdesk.firebase.autoSync",
  redirectPendingKey: "tripdesk.firebase.redirectPending",
  redirectCompletedKey: "tripdesk.firebase.redirectCompleted",

  saveTimer: null,
  autoStarted: false,
  unsubscribeTrips: null,
  unsubscribeAuthState: null,

  modules: {
    app: null,
    auth: null,
    firestore: null
  },

  firebaseApp: null,
  auth: null,
  db: null,

  async init() {
    const config = await this.waitForConfig(1500);
    this.enabled = Boolean(config);
    return this.enabled;
  },

  getConfig() {
    if (window.TRIPDESK_FIREBASE_CONFIG && window.TRIPDESK_FIREBASE_CONFIG.apiKey) {
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

  waitForConfig(timeoutMs = 2000) {
    const existing = this.getConfig();
    if (existing) return Promise.resolve(existing);

    return new Promise(resolve => {
      let done = false;

      const finish = config => {
        if (done) return;
        done = true;
        window.removeEventListener("tripdesk:firebase-config-ready", onReady);
        resolve(config || this.getConfig());
      };

      const onReady = event => {
        finish(event?.detail || this.getConfig());
      };

      window.addEventListener("tripdesk:firebase-config-ready", onReady, { once: true });

      const startedAt = Date.now();
      const timer = window.setInterval(() => {
        const config = this.getConfig();

        if (config) {
          window.clearInterval(timer);
          finish(config);
          return;
        }

        if (Date.now() - startedAt >= timeoutMs) {
          window.clearInterval(timer);
          finish(null);
        }
      }, 50);
    });
  },

  waitForAuthState(timeoutMs = 8000) {
    if (!this.auth || !this.modules.auth?.onAuthStateChanged) {
      return Promise.resolve(null);
    }

    this.authChecking = true;

    return new Promise(resolve => {
      let done = false;

      const finish = user => {
        if (done) return;
        done = true;

        try {
          unsubscribe?.();
        } catch (_) {}

        this.user = user || this.auth.currentUser || null;
        this.authChecking = false;
        resolve(this.user);
      };

      let unsubscribe = null;

      try {
        unsubscribe = this.modules.auth.onAuthStateChanged(this.auth, user => {
          finish(user);
        }, error => {
          this.lastAuthError = `${error?.code || ""} ${error?.message || ""}`.trim();
          console.warn("Firebase auth state failed", error);
          finish(this.auth.currentUser || null);
        });
      } catch (error) {
        this.lastAuthError = `${error?.code || ""} ${error?.message || ""}`.trim();
        console.warn("Firebase auth state listener setup failed", error);
        finish(this.auth.currentUser || null);
        return;
      }

      window.setTimeout(() => {
        finish(this.auth.currentUser || null);
      }, timeoutMs);
    });
  },

  async pollAuthUser(timeoutMs = 10000) {
    if (!this.auth) return null;

    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const user = this.user || this.auth.currentUser || null;

      if (user) {
        this.user = user;
        sessionStorage.setItem(this.redirectCompletedKey, "1");
        return user;
      }

      await new Promise(resolve => window.setTimeout(resolve, 250));
    }

    return null;
  },

  startAuthStateListener() {
    if (!this.auth || !this.modules.auth?.onAuthStateChanged) return;

    if (typeof this.unsubscribeAuthState === "function") {
      return;
    }

    this.unsubscribeAuthState = this.modules.auth.onAuthStateChanged(this.auth, user => {
      this.user = user || null;

      if (user) {
        this.authChecking = false;
        sessionStorage.setItem(this.redirectCompletedKey, "1");
        UI.setSaveStatus?.("● Firebase 로그인됨", "ok");

        if (!AppState.currentTrip?.()) {
          TripsFeature.renderList?.();
        } else {
          App.render?.();
        }
      }
    }, error => {
      this.lastAuthError = `${error?.code || ""} ${error?.message || ""}`.trim();
      console.warn("Firebase auth state listener failed", error);
      UI.setSaveStatus?.("● Firebase 인증 확인 실패", "warn");
    });
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
    const config = await this.waitForConfig(2500);

    if (!config) {
      console.error("TRIPDESK_FIREBASE_CONFIG missing", {
        hasWindowConfig: Boolean(window.TRIPDESK_FIREBASE_CONFIG),
        readyFlag: Boolean(window.__TRIPDESK_FIREBASE_CONFIG_READY__),
        scriptList: Array.from(document.scripts).map(s => s.src)
      });
      throw new Error("Firebase 설정이 없습니다.");
    }

    if (this.connected && this.db && this.auth) {
      await this.waitForAuthState(8000);
      await this.pollAuthUser(3000);
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

      this.firebaseApp = appModule.getApps().length
        ? appModule.getApps()[0]
        : appModule.initializeApp(config);

      this.auth = authModule.getAuth(this.firebaseApp);

      try {
        await authModule.setPersistence(
          this.auth,
          authModule.browserLocalPersistence
        );
      } catch (e) {
        console.warn("Persistence setup failed", e);
      }

      this.db = firestoreModule.getFirestore(this.firebaseApp);

      this.startAuthStateListener();

      try {
        const redirectResult = await authModule.getRedirectResult(this.auth);

        if (redirectResult?.user) {
          this.user = redirectResult.user;
          sessionStorage.removeItem(this.redirectPendingKey);
          sessionStorage.setItem(this.redirectCompletedKey, "1");
        }
      } catch (redirectError) {
        this.lastAuthError = `${redirectError?.code || ""} ${redirectError?.message || ""}`.trim();
        sessionStorage.removeItem(this.redirectPendingKey);
        console.warn("Firebase redirect result failed", redirectError);
      }

      await this.waitForAuthState(8000);
      await this.pollAuthUser(5000);

      if (this.user) {
        sessionStorage.setItem(this.redirectCompletedKey, "1");
      }

      this.connected = true;
      this.enabled = true;
      return true;
    } catch (error) {
      this.lastAuthError = `${error?.code || ""} ${error?.message || ""}`.trim();
      console.error("Firebase connect failed", error);
      this.connected = false;
      throw new Error("Firebase 연결에 실패했습니다. 설정값과 인터넷 연결을 확인하세요.");
    }
  },

  isIOSBrowser() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  },

  isMobileBrowser() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  },

  async handleRedirectOnLoad() {
    const config = await this.waitForConfig(1500);
    if (!config) return false;

    const hasRedirectMarker = sessionStorage.getItem(this.redirectPendingKey) === "1";
    const hasRedirectCompleted = sessionStorage.getItem(this.redirectCompletedKey) === "1";
    const hasAuthParams = /[?&](apiKey|oobCode|mode|state|code)=/.test(location.search || "");

    await this.connect();

    if (this.isIOSBrowser()) {
      await this.waitForAuthState(8000);
      await this.pollAuthUser(8000);
    }

    if (hasRedirectMarker || hasRedirectCompleted || hasAuthParams || this.user) {
      sessionStorage.removeItem(this.redirectPendingKey);
      return Boolean(this.user);
    }

    return false;
  },

  async signIn() {
    await this.connect();

    try {
      const provider = new this.modules.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      if (this.isIOSBrowser()) {
        this.authChecking = true;
        try {
          const result = await this.modules.auth.signInWithPopup(this.auth, provider);
          this.user = result?.user || this.auth.currentUser || null;
          return this.user;
        } catch(e){
          console.warn("iOS popup failed, fallback redirect",e);
        }
      }

      if (this.isMobileBrowser()) {
        this.authChecking = true;
        sessionStorage.setItem(this.redirectPendingKey, "1");
        UI.setSaveStatus?.("● Google 로그인 이동 중", "ok");
        await this.modules.auth.signInWithRedirect(this.auth, provider);
        return null;
      }

      try {
        const result = await this.modules.auth.signInWithPopup(this.auth, provider);
        this.user = result?.user || null;

        if (!this.user) {
          await this.waitForAuthState(8000);
          await this.pollAuthUser(3000);
        }

        if (this.user) {
          sessionStorage.setItem(this.redirectCompletedKey, "1");
        }

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

        this.authChecking = true;
        sessionStorage.setItem(this.redirectPendingKey, "1");
        await this.modules.auth.signInWithRedirect(this.auth, provider);
        return null;
      }
    } catch (error) {
      this.lastAuthError = `${error?.code || ""} ${error?.message || ""}`.trim();
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
    this.authChecking = false;
    sessionStorage.removeItem(this.redirectPendingKey);
    sessionStorage.removeItem(this.redirectCompletedKey);
  },

  isReady() {
    return this.enabled && this.connected && this.db && this.auth;
  },

  isSignedIn() {
    return Boolean(this.user);
  },

  async ensureSignedIn(timeoutMs = 8000) {
    await this.connect();

    if (this.user || this.auth?.currentUser) {
      this.user = this.user || this.auth.currentUser;
      return this.user;
    }

    await this.waitForAuthState?.(timeoutMs);
    await this.pollAuthUser?.(Math.min(timeoutMs, 5000));

    this.user = this.user || this.auth?.currentUser || null;
    return this.user;
  },

  consumeRedirectCompleted() {
    const completed = sessionStorage.getItem(this.redirectCompletedKey) === "1";
    if (completed) {
      sessionStorage.removeItem(this.redirectCompletedKey);
    }
    return completed;
  },

  statusText() {
    if (!this.getConfig()) return "Firebase 설정 없음";
    if (this.authChecking) return "Firebase 인증 확인 중";
    if (!this.connected) return "Firebase 준비됨 · 연결 전";
    if (!this.user) {
      return this.lastAuthError ? `Firebase 연결됨 · 로그인 전 (${this.lastAuthError})` : "Firebase 연결됨 · 로그인 전";
    }
    if (this.syncEnabled) return `실시간 동기화 중 · ${this.user.email || "사용자"}`;
    return `로그인됨 · ${this.user.email || "사용자"}`;
  },

  tripsCollectionRef() {
    if (!this.isReady() || !this.user) throw new Error("Firebase 로그인이 필요합니다.");
    const { collection } = this.modules.firestore;
    return collection(this.db, "users", this.user.uid, "trips");
  },

  tripDocRef(tripId) {
    if (!this.isReady() || !this.user) throw new Error("Firebase 로그인이 필요합니다.");
    const { doc } = this.modules.firestore;
    return doc(this.db, "users", this.user.uid, "trips", tripId);
  },


  publicShareDocRef(token) {
    if (!this.db || !this.modules.firestore?.doc) throw new Error("Firebase 연결이 필요합니다.");
    const { doc } = this.modules.firestore;
    return doc(this.db, "publicShares", token);
  },

  createShareToken() {
    // 128bit 이상 난수 기반 토큰. 링크를 아는 사람만 접근하는 구조이므로 예측 가능성을 낮춥니다.
    const bytes = new Uint8Array(24);

    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i += 1) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }

    const tokenBody = Array.from(bytes)
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");

    return `share-${Date.now().toString(36)}-${tokenBody}`;
  },

  sanitizeScheduleForShare(schedule = []) {
    return (schedule || []).map(item => ({
      id: item.id || "",
      date: item.date || "",
      time: item.time || "",
      city: item.city || "",
      title: item.title || "",
      type: item.type || "",
      confirmed: item.confirmed || "",
      address: item.address || ""
    })).filter(item => item.date || item.title);
  },

  sanitizeChecklistForShare(checklist = []) {
    return (checklist || []).map(item => ({
      id: item.id || "",
      category: item.category || "기타",
      text: item.text || item.title || "",
      done: Boolean(item.done)
    })).filter(item => item.text);
  },

  shareExpiresAtForTrip(trip) {
    const endDate = Utils.normalizeDate?.(trip?.endDate) || trip?.endDate || Utils.today();
    return `${endDate}T23:59:59+09:00`;
  },

  buildSharePayload(trip, existingToken = "") {
    const token = existingToken || this.createShareToken();
    const expiresAt = this.shareExpiresAtForTrip(trip);

    return {
      token,
      ownerUid: this.user?.uid || "",
      tripId: trip.id,
      title: trip.name || "공유 여행",
      startDate: trip.startDate || "",
      endDate: trip.endDate || "",
      travelers: trip.travelers || "",
      status: "active",
      scope: {
        schedule: true,
        checklist: true,
        expenses: false,
        bookings: false,
        notes: false,
        management: false
      },
      expiresAt,
      publicUpdatedAt: new Date().toISOString(),
      schedule: this.sanitizeScheduleForShare(trip.schedule || []),
      checklist: this.sanitizeChecklistForShare(trip.checklist || [])
    };
  },

  async createOrUpdatePublicShare(trip) {
    const user = await this.ensureSignedIn?.(10000);
    if (!user) throw new Error("Firebase 로그인이 필요합니다.");

    const { setDoc, serverTimestamp } = this.modules.firestore;
    const token = trip.share?.token || this.createShareToken();
    const payload = this.buildSharePayload(trip, token);

    await setDoc(this.publicShareDocRef(token), {
      ...payload,
      updatedAt: serverTimestamp(),
      createdAt: trip.share?.createdAt || new Date().toISOString()
    }, { merge: true });

    return {
      token,
      url: `${location.origin}${location.pathname.replace(/index\.html$/, "")}share.html?token=${encodeURIComponent(token)}`,
      expiresAt: payload.expiresAt
    };
  },

  async stopPublicShare(token) {
    const user = await this.ensureSignedIn?.(10000);
    if (!user) throw new Error("Firebase 로그인이 필요합니다.");

    const { setDoc, serverTimestamp } = this.modules.firestore;
    await setDoc(this.publicShareDocRef(token), {
      ownerUid: this.user.uid,
      status: "stopped",
      stoppedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    return true;
  },

  async loadPublicShare(token) {
    await this.connect();

    const { getDoc } = this.modules.firestore;
    const snapshot = await getDoc(this.publicShareDocRef(token));

    if (!snapshot.exists()) {
      throw new Error("공유 링크를 찾을 수 없습니다.");
    }

    return snapshot.data();
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
    const user = await this.ensureSignedIn?.(10000);
    if (!user) throw new Error("Firebase 로그인이 필요합니다.");

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
    if (!this.isReady() || !this.user) throw new Error("Firebase 로그인이 필요합니다.");

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
      if (trips.length) onTripsChanged(trips);
    }, error => {
      console.error("Realtime sync failed", error);
      UI.setSaveStatus?.("● 실시간 동기화 오류", "warn");
    });

    return true;
  },

  stopRealtimeSync() {
    if (typeof this.unsubscribeTrips === "function") this.unsubscribeTrips();
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
    if (this.autoStarted || !this.isAutoSyncEnabled()) return false;

    const config = await this.waitForConfig(1500);
    if (!config) return false;

    try {
      await this.connect();

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
  }
};
