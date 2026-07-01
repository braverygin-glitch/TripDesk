const LocationDict = {
    countries: {
        "스페인": "Spain",
        "포르투갈": "Portugal",
        "프랑스": "France",
        "영국": "United Kingdom",
        "스위스": "Switzerland",
        "일본": "Japan",
        "대만": "Taiwan",
        "중국": "China"
    },
    cities: {
        "바르셀로나": "Barcelona",
        "그라나다": "Granada",
        "세비야": "Sevilla",
        "포르투": "Porto",
        "리스본": "Lisbon",
        "마드리드": "Madrid",
        "톨레도": "Toledo",
        "신트라": "Sintra",
        "런던": "London",
        "취리히": "Zurich",
        "파리": "Paris",
        "도쿄": "Tokyo"
    }
};

const TripStore = {
    tripsKey: "tripdesk_trips",
    currentTripKey: "tripdesk_current_trip_id",
    lastTripKey: "tripdesk_last_trip_id",

    getTrips() {
        return JSON.parse(localStorage.getItem(this.tripsKey) || "[]");
    },

    saveTrips(trips) {
        localStorage.setItem(this.tripsKey, JSON.stringify(trips));
    },

    getCurrentTrip() {
        const id = localStorage.getItem(this.currentTripKey);
        return this.getTrips().find(t => t.id === id) || null;
    },

    setCurrentTrip(id) {
        localStorage.setItem(this.currentTripKey, id);
        localStorage.setItem(this.lastTripKey, id);
    },

    getLastTripId() {
        return localStorage.getItem(this.lastTripKey);
    },

    createTrip(trip) {
        const trips = this.getTrips();
        trips.push(trip);
        this.saveTrips(trips);

        this.setCurrentTrip(trip.id);
    },

    deleteCurrentTrip() {
        const current = this.getCurrentTrip();
        if (!current) return;

        const trips = this.getTrips().filter(t => t.id !== current.id);
        this.saveTrips(trips);

        localStorage.removeItem(this.currentTripKey);
    },

    updateTrip(updatedTrip) {
        const trips = this.getTrips();

        const index = trips.findIndex(t => t.id === updatedTrip.id);
        if (index === -1) return;

        trips[index] = {
            ...trips[index],
            ...updatedTrip,
            updatedAt: new Date().toISOString()
        };

        this.saveTrips(trips);
    }
};

function makeTripId(name) {
    return name
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^\w가-힣_]/g, "")
        || "New_Trip";
}

function makeLocationList(text, dict) {
    return text
        .split(/\n|,/)
        .map(t => t.trim())
        .filter(Boolean)
        .map(displayName => ({
            displayName,
            name: dict[displayName] || displayName
        }));
}