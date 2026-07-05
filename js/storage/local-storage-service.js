window.LocalStorageService = {
  tripsKey: "tripdesk.v103.trips",
  currentTripKey: "tripdesk.v103.currentTripId",

  loadTrips() {
    try {
      const raw = localStorage.getItem(this.tripsKey);
      if (!raw) {
        const initial = Utils.clone(window.SampleTrips || []);
        initial.forEach(trip => Utils.normalizeTrip(trip));
        this.saveTrips(initial);
        return initial;
      }

      const trips = JSON.parse(raw);
      if (!Array.isArray(trips)) return [];
      trips.forEach(trip => Utils.normalizeTrip(trip));
      return trips;
    } catch (error) {
      console.error("LocalStorage load failed", error);
      return [];
    }
  },

  saveTrips(trips) {
    localStorage.setItem(this.tripsKey, JSON.stringify(trips));
  },

  getCurrentTripId() {
    return localStorage.getItem(this.currentTripKey);
  },

  setCurrentTripId(id) {
    localStorage.setItem(this.currentTripKey, id);
  },

  clearCurrentTripId() {
    localStorage.removeItem(this.currentTripKey);
  }
};
