window.DataService = {
  mode: "local",

  init() {
    FirebaseService.init();
    this.mode = "local";
  },

  loadTrips() {
    return LocalStorageService.loadTrips();
  },

  saveTrips(trips) {
    LocalStorageService.saveTrips(trips);
    FirebaseService.scheduleSaveTrips?.(trips);
  },

  getCurrentTripId() {
    return LocalStorageService.getCurrentTripId();
  },

  setCurrentTripId(id) {
    LocalStorageService.setCurrentTripId(id);
  },

  clearCurrentTripId() {
    LocalStorageService.clearCurrentTripId();
  },

  statusText() {
    return `로컬 저장 사용 중 · ${FirebaseService.statusText()}`;
  }
};
