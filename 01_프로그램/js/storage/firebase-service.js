window.FirebaseService = {
  enabled: false,

  init() {
    this.enabled = false;
  },

  async loadTrips() {
    throw new Error("Firebase sync is not enabled in V1.0.3.");
  },

  async saveTrips(_trips) {
    throw new Error("Firebase sync is not enabled in V1.0.3.");
  }
};
