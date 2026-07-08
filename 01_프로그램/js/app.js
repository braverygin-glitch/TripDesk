window.App = {
  async init() {
    DataService.init();
    AppState.init();
    await FirebaseService.init?.();

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch(error => {
          console.warn("Service worker registration failed", error);
        });
      });
    }

    this.render();
    this.handleFirebaseRedirectOnLoad();
    this.startAutoFirebaseSync();
  },

  async handleFirebaseRedirectOnLoad() {
    try {
      const signedIn = await FirebaseService.handleRedirectOnLoad?.();
      const redirectCompleted = FirebaseService.consumeRedirectCompleted?.();

      if (signedIn || redirectCompleted || FirebaseService.isSignedIn?.()) {
        if (!AppState.currentTrip()) {
          TripsFeature.renderList();
        } else {
          this.render();
        }

        UI.setSaveStatus?.("● Firebase 로그인됨", "ok");
        return;
      }

      if (!AppState.currentTrip()) {
        TripsFeature.renderList();
      }
    } catch (error) {
      console.warn("Firebase redirect login handling failed", error);
      if (!AppState.currentTrip()) {
        TripsFeature.renderList();
      }
    }
  },

  startAutoFirebaseSync() {
    FirebaseService.startAutoSyncIfPossible?.(trips => {
      AppState.replaceTripsFromCloud(trips);
      this.render();
      UI.setSaveStatus?.("● 클라우드에서 자동 갱신됨", "ok");
    });
  },

  setTab(tab) {
    if (tab === "calendar") tab = "schedule";
    AppState.currentTab = tab;

    if (!AppState.currentTrip()) {
      TripsFeature.renderList();
      return;
    }

    this.render();
  },

  render() {
    const trip = AppState.currentTrip();

    if (!trip) {
      TripsFeature.renderList();
      return;
    }

    let content = "";
    if (AppState.currentTab === "home") content = HomeFeature.render(trip);
    if (AppState.currentTab === "schedule") content = ScheduleFeature.render(trip);
    if (AppState.currentTab === "bookings") content = BookingsFeature.render(trip);
    if (AppState.currentTab === "expenses") content = ExpensesFeature.render(trip);
    if (AppState.currentTab === "checklist") content = ChecklistFeature.render(trip);
    if (AppState.currentTab === "trips") content = TripsFeature.renderManagePage();
    if (AppState.currentTab === "more") content = MoreFeature.render(trip);

    UI.shell(
      trip.name,
      `${Utils.formatDate(trip.startDate)} ~ ${Utils.formatDate(trip.endDate)} · ${trip.travelers}`,
      content,
      `<button type="button" class="btn white top-list-button" onclick="TripsFeature.goList()">목록</button>`
    );

    this.bindNav();
  },

  bindNav() {
    document.querySelectorAll(".nav-btn[data-tab]").forEach(button => {
      button.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        this.setTab(button.dataset.tab);
      };
    });
  }
};

document.addEventListener("DOMContentLoaded", () => App.init());
