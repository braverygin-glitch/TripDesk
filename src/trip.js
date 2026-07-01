const StorageAdapter = {
    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.warn("Storage parse error:", key);
            return null;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn("Storage set error:", key);
        }
    },

    remove(key) {
        localStorage.removeItem(key);
    }
};

/* =========================
   LOCATION DICT
========================= */

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
        "런던": "London",
        "파리": "Paris",
        "도쿄": "Tokyo"
    }
};

/* =========================
   TRIP STORE (SAFE)
========================= */

const TripStore = {
    tripsKey: "tripdesk_trips",
    currentKey: "tripdesk_current_trip",
    lastKey: "tripdesk_last_trip",

    getTrips() {
        return StorageAdapter.get(this.tripsKey) || [];
    },

    saveTrips(trips) {
        StorageAdapter.set(this.tripsKey, Array.isArray(trips) ? trips : []);
    },

    getCurrentTrip() {
        const id = StorageAdapter.get(this.currentKey);
        if (!id) return null;

        const trips = this.getTrips();
        return trips.find(t => t && t.id === id) || null;
    },

    setCurrentTrip(id) {
        if (!id) return;

        StorageAdapter.set(this.currentKey, id);
        StorageAdapter.set(this.lastKey, id);
    },

    getLastTrip() {
        return StorageAdapter.get(this.lastKey);
    },

    createTrip(trip) {
        if (!trip || !trip.id) return;

        const trips = this.getTrips();
        trips.push(trip);
        this.saveTrips(trips);
        this.setCurrentTrip(trip.id);
    },

    updateTrip(updated) {
        if (!updated || !updated.id) return;

        const trips = this.getTrips();
        const idx = trips.findIndex(t => t && t.id === updated.id);

        if (idx === -1) return;

        trips[idx] = {
            ...trips[idx],
            ...updated,
            updatedAt: new Date().toISOString()
        };

        this.saveTrips(trips);
    },

    deleteCurrentTrip() {
        const current = this.getCurrentTrip();
        if (!current) return;

        const trips = this.getTrips().filter(t => t && t.id !== current.id);
        this.saveTrips(trips);
        StorageAdapter.remove(this.currentKey);
    }
};

/* =========================
   UTIL SAFE
========================= */

function makeTripId(name) {
    if (!name || typeof name !== "string") return "trip_" + Date.now();

    return (
        name
            .trim()
            .replace(/\s+/g, "_")
            .replace(/[^\w가-힣_]/g, "")
            || "trip_" + Date.now()
    );
}

function makeLocationList(text, dict) {
    if (!text || typeof text !== "string") return [];

    return text
        .split(/\n|,/)
        .map(v => v.trim())
        .filter(v => v && v.length > 0)
        .map(name => ({
            displayName: name,
            name: (dict && dict[name]) ? dict[name] : name
        }));
}

/* =========================
   SCHEDULE FACTORY
========================= */

function createSchedule(date, city) {
    if (!date || !city) return null;

    return {
        date,
        city,
        items: []
    };
}