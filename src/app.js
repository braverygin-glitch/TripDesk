
const screen = document.getElementById("screen");
const tripTitle = document.getElementById("tripTitle");

let editing = null;
let dragState = { fromDay: null, fromIndex: null };

/* =========================
   INIT
========================= */

function init() {
    restoreLastTrip();
    renderHome();
}

function restoreLastTrip() {
    const last = TripStore.getLastTrip();
    if (!last) return;

    const trips = TripStore.getTrips();
    const exists = trips.find(t => t?.id === last);

    if (exists) TripStore.setCurrentTrip(last);
}

/* =========================
   HOME
========================= */

function renderHome() {
    const trip = TripStore.getCurrentTrip();

    if (!trip) {
        tripTitle.textContent = "여행 선택";

        screen.innerHTML = `
            <section class="card">
                <h3>여행 없음</h3>
                <button onclick="renderCreateTrip()">새 여행</button>
                <button onclick="renderExcelImport()">엑셀 입력</button>
            </section>
        `;
        return;
    }

    tripTitle.textContent = trip.name || "";

    const schedule = trip.schedule || [];

    screen.innerHTML = `
        <section class="card">
            <h2>${trip.name || ""}</h2>
            <p>${trip.startDate || ""} ~ ${trip.endDate || ""}</p>
        </section>

        <section class="card">
            <h3>📅 일정</h3>

            ${schedule.length === 0 ? "<p>일정 없음</p>" : ""}

            ${schedule.map((day, di) => `
                <div style="margin-bottom:16px;">
                    <strong>${day.date || ""} / ${day.city || ""}</strong>

                    ${(day.items || []).map((item, ii) => `
                        <div
                            draggable="true"
                            ondragstart="onDragStart(event, ${di}, ${ii})"
                            ondragover="onDragOver(event)"
                            ondrop="onDrop(event, ${di}, ${ii})"
                            style="
                                padding:10px;
                                margin:6px 0;
                                border:1px solid #ddd;
                                border-radius:10px;
                                background:#fff;
                            "
                        >
                            ⏰ ${item.time || "-"} / ${item.title || ""}

                            <button onclick="editItem(${di},${ii})">수정</button>
                            <button onclick="deleteItem(${di},${ii})">삭제</button>
                        </div>
                    `).join("")}

                    <button onclick="openAddItem('${day.date}','${day.city}')">
                        + 일정 추가
                    </button>
                </div>
            `).join("")}
        </section>

        <section class="card">
            <button onclick="renderAddDay()">+ 날짜 추가</button>
            <button onclick="renderExcelImport()">📥 엑셀 입력</button>
        </section>
    `;
}

/* =========================
   DRAG LOGIC
========================= */

function onDragStart(e, dayIndex, itemIndex) {
    dragState.fromDay = dayIndex;
    dragState.fromIndex = itemIndex;
}

function onDragOver(e) {
    e.preventDefault();
}

function onDrop(e, toDay, toIndex) {
    e.preventDefault();

    const trip = TripStore.getCurrentTrip();
    if (!trip) return;

    const fromDay = dragState.fromDay;
    const fromIndex = dragState.fromIndex;

    if (fromDay === null || fromIndex === null) return;

    const fromItems = trip.schedule[fromDay]?.items;
    const toItems = trip.schedule[toDay]?.items;

    if (!fromItems || !toItems) return;

    const item = fromItems.splice(fromIndex, 1)[0];
    if (!item) return;

    toItems.splice(toIndex, 0, item);

    TripStore.updateTrip(trip);

    dragState = { fromDay: null, fromIndex: null };

    renderHome();
}

/* =========================
   DAY ADD
========================= */

function renderAddDay() {
    screen.innerHTML = `
        <section class="card">
            <h3>날짜 추가</h3>

            <input id="date" type="date">
            <input id="city" placeholder="도시">

            <button onclick="addDay()">추가</button>
        </section>
    `;
}

function addDay() {
    const trip = TripStore.getCurrentTrip();
    if (!trip) return;

    const date = document.getElementById("date").value;
    const city = document.getElementById("city").value;

    if (!date || !city) return;

    if (!trip.schedule) trip.schedule = [];

    trip.schedule.push({
        date,
        city,
        items: []
    });

    TripStore.updateTrip(trip);
    renderHome();
}

/* =========================
   ITEM ADD
========================= */

function openAddItem(date, city) {
    screen.innerHTML = `
        <section class="card">
            <h3>일정 추가</h3>

            <div>${date} / ${city}</div>

            <input id="time" type="time">
            <input id="title" placeholder="일정">
            <input id="memo" placeholder="메모">

            <button onclick="addItem('${date}','${city}')">추가</button>
        </section>
    `;
}

function addItem(date, city) {
    const trip = TripStore.getCurrentTrip();
    if (!trip) return;

    const day = trip.schedule.find(d => d.date === date && d.city === city);
    if (!day) return;

    day.items.push({
        time: document.getElementById("time").value || "",
        title: document.getElementById("title").value || "",
        memo: document.getElementById("memo").value || ""
    });

    TripStore.updateTrip(trip);
    renderHome();
}

/* =========================
   EDIT
========================= */

function editItem(di, ii) {
    const trip = TripStore.getCurrentTrip();
    const item = trip.schedule[di].items[ii];

    editing = { di, ii };

    screen.innerHTML = `
        <section class="card">
            <h3>수정</h3>

            <input id="time" value="${item.time || ""}">
            <input id="title" value="${item.title || ""}">
            <input id="memo" value="${item.memo || ""}">

            <button onclick="saveEditItem()">저장</button>
        </section>
    `;
}

function saveEditItem() {
    const trip = TripStore.getCurrentTrip();
    const { di, ii } = editing;

    trip.schedule[di].items[ii] = {
        time: document.getElementById("time").value || "",
        title: document.getElementById("title").value || "",
        memo: document.getElementById("memo").value || ""
    };

    TripStore.updateTrip(trip);
    editing = null;
    renderHome();
}

/* =========================
   DELETE
========================= */

function deleteItem(di, ii) {
    const trip = TripStore.getCurrentTrip();

    trip.schedule[di].items.splice(ii, 1);

    TripStore.updateTrip(trip);
    renderHome();
}

/* =========================
   EXCEL (기존 유지)
========================= */

function renderExcelImport() {
    screen.innerHTML = `
        <section class="card">
            <h3>엑셀 입력</h3>

            <textarea id="excelInput" placeholder="date	city	title	type"></textarea>

            <button onclick="runExcelImport()">가져오기</button>
        </section>
    `;
}

function parseExcel(text) {
    return text.trim().split("\n").map(line => {
        const [date, city, title, type] = line.split("\t");

        return {
            date: (date || "").trim(),
            city: (city || "").trim(),
            title: (title || "").trim(),
            type: (type || "place").trim()
        };
    });
}

function buildSchedule(items) {
    const map = {};

    items.forEach(i => {
        const key = i.date + "_" + i.city;

        if (!map[key]) {
            map[key] = {
                date: i.date,
                city: i.city,
                items: []
            };
        }

        map[key].items.push({
            time: "",
            title: i.title,
            type: i.type
        });
    });

    return Object.values(map);
}

function runExcelImport() {
    const trip = TripStore.getCurrentTrip();
    if (!trip) return;

    const text = document.getElementById("excelInput").value;
    if (!text) return;

    const parsed = parseExcel(text);
    const schedule = buildSchedule(parsed);

    trip.schedule = schedule;

    TripStore.updateTrip(trip);
    renderHome();
}

/* =========================
   START
========================= */

init();