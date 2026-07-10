window.LocalStorageService = {
  tripsKey: "tripdesk.v103.trips",
  currentTripKey: "tripdesk.v103.currentTripId",
  backupTripsKey: "tripdesk.v171.backupTrips",
  backupTimeKey: "tripdesk.v171.backupTime",

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

      try {
        const backupRaw = localStorage.getItem(this.backupTripsKey);
        const backupTrips = backupRaw ? JSON.parse(backupRaw) : [];

        if (Array.isArray(backupTrips)) {
          backupTrips.forEach(trip => Utils.normalizeTrip(trip));
          return backupTrips;
        }
      } catch (backupError) {
        console.error("LocalStorage backup load failed", backupError);
      }

      return [];
    }
  },

  saveTrips(trips) {
    if (!Array.isArray(trips)) {
      throw new Error("저장할 여행 데이터 형식이 올바르지 않습니다.");
    }

    const cleanTrips = trips.map(trip => Utils.normalizeTrip(Utils.clone(trip)));

    try {
      const previous = localStorage.getItem(this.tripsKey);

      if (previous) {
        localStorage.setItem(this.backupTripsKey, previous);
        localStorage.setItem(this.backupTimeKey, new Date().toISOString());
      }

      localStorage.setItem(this.tripsKey, JSON.stringify(cleanTrips));
      return true;
    } catch (error) {
      console.error("LocalStorage save failed", error);
      throw new Error("기기 저장 공간에 데이터를 저장하지 못했습니다.");
    }
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
