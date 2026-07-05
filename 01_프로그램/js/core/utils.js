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

  value(id) {
    return document.getElementById(id)?.value.trim() || "";
  },

  today() {
    const d = new Date();
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
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

    if (/^\d+(\.\d+)?$/.test(text)) {
      const num = Number(text);
      if (num > 0 && num < 1) {
        const totalMinutes = Math.round(num * 24 * 60);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }
    }

    const hm = text.match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/);
    if (hm) return `${hm[1].padStart(2, "0")}:${hm[2].padStart(2, "0")}`;

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
