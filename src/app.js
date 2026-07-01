const screen = document.getElementById("screen");
const tripTitle = document.getElementById("tripTitle");

/* =========================
   RESTORE LAST TRIP
========================= */
function restoreLastTrip() {
    const lastId = TripStore.getLastTripId();
    if (!lastId) return;

    const trips = TripStore.getTrips();
    const exists = trips.find(t => t.id === lastId);

    if (exists) {
        TripStore.setCurrentTrip(lastId);
    }
}

/* =========================
   HOME
========================= */
function renderHome() {
    const currentTrip = TripStore.getCurrentTrip();

    if (!currentTrip) {
        tripTitle.textContent = "여행을 선택하세요";

        screen.innerHTML = `
            <section class="card hero-card">
                <p class="label">Trip Desk</p>
                <h2>현재 여행 없음</h2>
                <p>여행을 선택하거나 새로 만드세요.</p>
            </section>

            <section class="card">
                <button class="menu-row" onclick="renderTripList()">📂 여행 목록</button>
                <button class="menu-row" onclick="renderCreateTrip()">➕ 새 여행</button>
            </section>
        `;
        return;
    }

    tripTitle.textContent = currentTrip.name;

    screen.innerHTML = `
        <section class="card hero-card">
            <p class="label">현재 여행</p>
            <h2>${currentTrip.name}</h2>
            <p>${currentTrip.startDate} ~ ${currentTrip.endDate}</p>
        </section>

        <section class="card">
            <h3>국가</h3>
            ${
                currentTrip.countries.map(c =>
                    `<p>${c.displayName} / ${c.name}</p>`
                ).join("")
            }
        </section>

        <section class="card">
            <h3>통화</h3>
            <p>${currentTrip.baseCurrency}</p>
        </section>

        <section class="card">
            <button class="menu-row" onclick="renderEditTrip('${currentTrip.id}')">
                ✏ 수정
            </button>
        </section>
    `;
}

/* =========================
   LIST
========================= */
function renderTripList() {
    const trips = TripStore.getTrips();

    screen.innerHTML = `
        <section class="card">
            <h3>여행 목록</h3>

            ${trips.map(t => `
                <div class="menu-row" onclick="selectTrip('${t.id}')">
                    <strong>${t.name}</strong><br>
                    <small>${t.startDate} ~ ${t.endDate}</small>
                </div>
            `).join("")}
        </section>
    `;
}

function selectTrip(id) {
    TripStore.setCurrentTrip(id);
    renderHome();
}

/* =========================
   CREATE
========================= */
function renderCreateTrip() {
    tripTitle.textContent = "새 여행";

    screen.innerHTML = `
        <section class="card">
            <h3>새 여행</h3>

            <label>이름</label>
            <input id="name" class="input">

            <label>출발</label>
            <input id="start" type="date" class="input">

            <label>귀국</label>
            <input id="end" type="date" class="input">

            <label>국가</label>
            <textarea id="countries" class="input"></textarea>

            <label>통화</label>
            <select id="currency" class="input">
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="KRW">KRW</option>
            </select>

            <button class="primary-button" onclick="createTrip()">생성</button>
        </section>
    `;
}

function createTrip() {
    const name = document.getElementById("name").value;
    const start = document.getElementById("start").value;
    const end = document.getElementById("end").value;
    const countries = document.getElementById("countries").value;
    const currency = document.getElementById("currency").value;

    const trip = {
        id: makeTripId(name),
        name,
        startDate: start,
        endDate: end,
        countries: makeLocationList(countries, LocationDict.countries),
        baseCurrency: currency,
        currencies: [currency],
        createdAt: new Date().toISOString()
    };

    TripStore.createTrip(trip);
    renderHome();
}

/* =========================
   EDIT
========================= */
function renderEditTrip(id) {
    const trip = TripStore.getTrips().find(t => t.id === id);

    screen.innerHTML = `
        <section class="card">
            <h3>수정</h3>

            <input id="editName" class="input" value="${trip.name}">
            <input id="editStart" type="date" class="input" value="${trip.startDate}">
            <input id="editEnd" type="date" class="input" value="${trip.endDate}">

            <button class="primary-button" onclick="saveEdit('${id}')">저장</button>
        </section>
    `;
}

function saveEdit(id) {
    const name = document.getElementById("editName").value;
    const start = document.getElementById("editStart").value;
    const end = document.getElementById("editEnd").value;

    TripStore.updateTrip({
        id,
        name,
        startDate: start,
        endDate: end
    });

    TripStore.setCurrentTrip(id);
    renderHome();
}

/* =========================
   INIT
========================= */
restoreLastTrip();
renderHome();