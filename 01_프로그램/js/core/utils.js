window.Utils = {
  clone(value) {
    return JSON.parse(JSON.stringify(value));
  },

  id(prefix = "id") {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  },

  escape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  },


  mapQueryFromItem(item = {}) {
    const parts = [
      item.address,
      item.title,
      item.city
    ].filter(Boolean);

    return parts.join(" ").trim();
  },

  googleMapSearchUrl(query) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || "")}`;
  },

  googleMapDirectionsUrl(query) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query || "")}&travelmode=walking`;
  },

  openMapSearch(query) {
    if (!query) {
      alert("지도에서 찾을 주소나 장소명이 없습니다.");
      return;
    }

    window.open(this.googleMapSearchUrl(query), "_blank", "noopener");
  },

  openMapDirections(query) {
    if (!query) {
      alert("길찾기에 사용할 주소나 장소명이 없습니다.");
      return;
    }

    window.open(this.googleMapDirectionsUrl(query), "_blank", "noopener");
  },

  value(id) {
    return document.getElementById(id)?.value.trim() || "";
  },

  today() {
    const d = new Date();
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  },


  monthKey(value = this.today()) {
    const date = String(value || this.today()).slice(0, 10);
    return date.slice(0, 7);
  },

  addMonths(monthKey, offset) {
    const [year, month] = String(monthKey || this.monthKey()).split("-").map(Number);
    const d = new Date(year, (month || 1) - 1 + Number(offset || 0), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  },

  daysInMonth(monthKey) {
    const [year, month] = String(monthKey || this.monthKey()).split("-").map(Number);
    return new Date(year, month, 0).getDate();
  },

  firstWeekdayOfMonth(monthKey) {
    const [year, month] = String(monthKey || this.monthKey()).split("-").map(Number);
    return new Date(year, month - 1, 1).getDay();
  },

  formatMonth(value) {
    const [year, month] = String(value || this.monthKey()).split("-");
    return `${year}.${Number(month)}.`;
  },

  formatDate(value) {
    if (!value) return "";
    const parts = String(value).split("-");
    if (parts.length === 3) return `${Number(parts[1])}/${Number(parts[2])}`;
    return this.escape(value);
  },

  normalizeDate(value) {
    const text = String(value ?? "").trim();
    if (!text) return "";

    if (/^\d+(\.\d+)?$/.test(text)) {
      const serial = Number(text);
      if (serial > 20000 && serial < 80000) {
        const utc = Math.round((serial - 25569) * 86400 * 1000);
        return new Date(utc).toISOString().slice(0, 10);
      }
    }

    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(text)) {
      const [y, m, d] = text.split("-");
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    const slash = text.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})$/);
    if (slash) return `${slash[1]}-${slash[2].padStart(2, "0")}-${slash[3].padStart(2, "0")}`;

    return text;
  },

  normalizeTime(value) {
    const text = String(value ?? "").trim();
    if (!text) return "";

    // Excel numeric time, including scientific notation like 7.986111111111105E-2
    const num = Number(text);
    if (Number.isFinite(num) && num >= 0 && num < 1) {
      const totalMinutes = Math.round(num * 24 * 60);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }

    // HH:mm:ss
    let match = text.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
    if (match) {
      return `${match[1].padStart(2, "0")}:${match[2]}`;
    }

    // HH:mm
    match = text.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      return `${match[1].padStart(2, "0")}:${match[2]}`;
    }

    // HHmm / Hmm numeric input, e.g. 0730 -> 07:30, 900 -> 09:00
    match = text.match(/^(\d{3,4})$/);
    if (match) {
      const raw = match[1].padStart(4, "0");
      const hour = Number(raw.slice(0, 2));
      const minute = Number(raw.slice(2, 4));

      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      }
    }

    // 1:55 AM / 1:55:00 AM
    match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (match) {
      let hour = parseInt(match[1], 10);
      const minute = match[2];
      const ampm = match[4].toUpperCase();

      if (ampm === "AM") {
        if (hour === 12) hour = 0;
      } else {
        if (hour !== 12) hour += 12;
      }

      return `${String(hour).padStart(2, "0")}:${minute}`;
    }

    // 오전 1:55 / 오후 3:30
    match = text.match(/^(오전|오후)\s*(\d{1,2}):(\d{2})$/);
    if (match) {
      let hour = parseInt(match[2], 10);
      const minute = match[3];

      if (match[1] === "오전") {
        if (hour === 12) hour = 0;
      } else {
        if (hour !== 12) hour += 12;
      }

      return `${String(hour).padStart(2, "0")}:${minute}`;
    }

    return text;
  },

  splitTags(text) {
    return String(text || "")
      .split(/[,\|]/)
      .map(tag => tag.trim())
      .filter(Boolean);
  },

  normalizeTrip(trip) {
    trip.id ||= this.id("trip");
    trip.name ||= "새 여행";
    trip.startDate ||= this.today();
    trip.endDate ||= trip.startDate;
    trip.travelers ||= "";
    trip.memo ||= "";
    trip.cities ||= [];
    trip.schedule ||= [];
    trip.bookings ||= [];
    trip.expenses ||= [];
    trip.checklist ||= [];
    trip.notes ||= "";
    trip.lastImport ||= {
      filename: "",
      importedAt: ""
    };
    trip.schemaVersion ||= "1.0";
    trip.updatedAt = new Date().toISOString();

    trip.schedule.forEach(item => {
      item.id ||= this.id("s");
      item.date ||= trip.startDate;
      item.city ||= "";
      item.time ||= "";
      item.title ||= "일정";
      item.type ||= "기타";
      item.tags ||= [];
      item.confirmed ||= "";
      item.pinned = Boolean(item.pinned);
      item.done = Boolean(item.done);
      item.memo ||= "";
      item.reservationNo ||= "";
      item.address ||= "";
    });

    trip.bookings.forEach(item => {
      item.id ||= this.id("b");
      item.category ||= "기타";
      item.title ||= "예약";
      item.date ||= trip.startDate;
      item.memo ||= "";
      item.reservationNo ||= "";
      item.address ||= "";
      item.pinned = Boolean(item.pinned);
    });

    trip.expenses.forEach(item => {
      item.id ||= this.id("e");
      item.date ||= trip.startDate;
      item.city ||= "";
      item.category ||= "기타";
      item.amount = Number(item.amount || 0);
      item.currency ||= "EUR";
      item.memo ||= "";
    });

    trip.checklist.forEach(item => {
      item.id ||= this.id("c");
      item.text ||= "";
      item.category ||= "준비물";
      item.memo ||= "";
      item.done = Boolean(item.done);
    });

    return trip;
  },

  safeFilename(name) {
    return String(name || "trip").replace(/[\\/:*?"<>|]/g, "_");
  },

  sortSchedule(a, b) {
    const dateCompare = String(a.date || "").localeCompare(String(b.date || ""));
    if (dateCompare !== 0) return dateCompare;
    return String(a.time || "").localeCompare(String(b.time || ""));
  },

  groupBy(list, getter) {
    return list.reduce((acc, item) => {
      const key = getter(item) || "미정";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }
};
