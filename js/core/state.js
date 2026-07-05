window.AppState = {
  trips: [],
  currentTripId: null,
  currentTab: "home",

  init() {
    this.trips = DataService.loadTrips();
    this.currentTripId = DataService.getCurrentTripId();

    if (this.currentTripId && !this.currentTrip()) {
      this.currentTripId = null;
      DataService.clearCurrentTripId();
    }
  },

  save() {
    UI.setSaveStatus?.("● 저장 중...", "saving");
    DataService.saveTrips(this.trips);
    window.setTimeout(() => UI.setSaveStatus?.("● 저장됨", "ok"), 180);
  },

  currentTrip() {
    return this.trips.find(trip => trip.id === this.currentTripId) || null;
  },

  findTrip(id) {
    return this.trips.find(trip => trip.id === id) || null;
  },

  openTrip(id) {
    this.currentTripId = id;
    this.currentTab = "home";
    DataService.setCurrentTripId(id);
  },

  closeTrip() {
    this.currentTripId = null;
    this.currentTab = "home";
    DataService.clearCurrentTripId();
  },

  addTrip(trip) {
    Utils.normalizeTrip(trip);
    this.trips.push(trip);
    this.openTrip(trip.id);
    this.save();
  },

  updateTrip(id, patch) {
    const trip = this.findTrip(id);
    if (!trip) return false;
    Object.assign(trip, patch);
    Utils.normalizeTrip(trip);
    this.save();
    return true;
  },

  deleteTrip(id) {
    if (!this.findTrip(id)) return false;
    this.trips = this.trips.filter(item => item.id !== id);
    if (this.currentTripId === id) this.closeTrip();
    this.save();
    return true;
  },

  duplicateTrip(id) {
    const trip = this.findTrip(id);
    if (!trip) return null;
    const copy = Utils.clone(trip);
    copy.id = Utils.id("trip");
    copy.name = `${copy.name} 복사본`;
    Utils.normalizeTrip(copy);
    this.trips.push(copy);
    this.openTrip(copy.id);
    this.save();
    return copy;
  },

  importTrip(rawTrip) {
    const trip = Utils.normalizeTrip(rawTrip);
    if (this.findTrip(trip.id)) trip.id = Utils.id("trip");
    this.trips.push(trip);
    this.openTrip(trip.id);
    this.save();
    return trip;
  },

  replaceTripsFromCloud(trips) {
    this.trips = Array.isArray(trips) ? trips : [];
    this.trips.forEach(trip => Utils.normalizeTrip(trip));

    if (this.currentTripId && !this.currentTrip()) {
      this.currentTripId = this.trips[0]?.id || null;
    }

    if (!this.currentTripId && this.trips.length) {
      this.currentTripId = this.trips[0].id;
    }

    LocalStorageService.saveTrips(this.trips);

    if (this.currentTripId) {
      DataService.setCurrentTripId(this.currentTripId);
    } else {
      DataService.clearCurrentTripId();
    }
  },

  clearLocalTrips() {
    this.trips = [];
    this.currentTripId = null;
    LocalStorageService.saveTrips([]);
    DataService.clearCurrentTripId();
  }
};
