window.App = {
  init() {
    DataService.init();
    AppState.init();

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch(error => {
          console.warn("Service worker registration failed", error);
        });
      });
    }

    this.render();
  },

  setTab(tab) {
    AppState.currentTab = tab;
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
      `<button class="btn white" onclick="TripsFeature.goList()">목록</button>`
    );
  }
};

document.addEventListener("DOMContentLoaded", () => App.init());
