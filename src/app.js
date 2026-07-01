const screen = document.getElementById("screen");
const tripTitle = document.getElementById("tripTitle");

function getCurrentTripName(defaultText) {
    const currentTrip = TripStore.getCurrentTrip();
    return currentTrip ? currentTrip.name : defaultText;
}

function renderHome() {
    const currentTrip = TripStore.getCurrentTrip();

    if (!currentTrip) {
        tripTitle.textContent = "여행을 선택하세요";

        screen.innerHTML = `
            <section class="card hero-card">
                <p class="label">Trip Desk</p>
                <h2>현재 여행 없음</h2>
                <p>새 여행을 만들면 일정과 예약을 관리할 수 있습니다.</p>
            </section>

            <section class="card">
                <h3>시작하기</h3>
                <div class="menu-list">
                    <button class="menu-row" onclick="renderCreateTrip()">➕ 새 여행 만들기</button>
                </div>
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
            ${currentTrip.countries.map(c => `<p>${c.displayName} / ${c.name}</p>`).join("")}
        </section>

        <section class="card">
            <h3>도시</h3>
            ${currentTrip.cities.map(c => `<p>${c.displayName} / ${c.name}</p>`).join("")}
        </section>

        <section class="card">
            <h3>통화</h3>
            <p><strong>기본 통화</strong><br>${currentTrip.baseCurrency}</p>
            <p><strong>사용 통화</strong><br>${currentTrip.currencies.join(", ")}</p>
        </section>
    `;
}

function renderCreateTrip() {
    tripTitle.textContent = "새 여행 만들기";

    screen.innerHTML = `
        <section class="card">
            <h3>새 여행 만들기</h3>

            <label>여행 이름</label>
            <input id="tripName" class="input" placeholder="예: 스페인·포르투갈 2026">

            <label>출발일</label>
            <input id="startDate" class="input" type="date">

            <label>귀국일</label>
            <input id="endDate" class="input" type="date">

            <label>국가</label>
            <textarea id="countries" class="input" rows="3" placeholder="스페인&#10;포르투갈"></textarea>

            <label>도시</label>
            <textarea id="cities" class="input" rows="5" placeholder="바르셀로나&#10;그라나다&#10;세비야&#10;포르투&#10;리스본&#10;마드리드"></textarea>

            <label>기본 통화</label>
            <select id="baseCurrency" class="input">
                <option value="KRW">KRW</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="CHF">CHF</option>
                <option value="JPY">JPY</option>
            </select>

            <label>사용 통화</label>
            <div class="checkbox-list">
                <label><input type="checkbox" name="currency" value="KRW" checked> KRW 원</label>
                <label><input type="checkbox" name="currency" value="EUR" checked> EUR 유로</label>
                <label><input type="checkbox" name="currency" value="GBP"> GBP 파운드</label>
                <label><input type="checkbox" name="currency" value="CHF"> CHF 스위스 프랑</label>
                <label><input type="checkbox" name="currency" value="USD"> USD 달러</label>
                <label><input type="checkbox" name="currency" value="JPY"> JPY 엔</label>
            </div>

            <label>여행 메모</label>
            <textarea id="memo" class="input" rows="3" placeholder="선택사항"></textarea>

            <button class="primary-button" onclick="createTrip()">여행 생성</button>
        </section>
    `;
}

function createTrip() {
    const name = document.getElementById("tripName").value.trim();
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;
    const countriesText = document.getElementById("countries").value;
    const citiesText = document.getElementById("cities").value;
    const baseCurrency = document.getElementById("baseCurrency").value;
    const memo = document.getElementById("memo").value.trim();

    const currencies = Array.from(document.querySelectorAll('input[name="currency"]:checked'))
        .map(input => input.value);

    if (!name || !startDate || !endDate) {
        alert("여행 이름, 출발일, 귀국일은 필수입니다.");
        return;
    }

    const trip = {
        id: makeTripId(name),
        name,
        startDate,
        endDate,
        countries: makeLocationList(countriesText, LocationDict.countries),
        cities: makeLocationList(citiesText, LocationDict.cities),
        baseCurrency,
        currencies,
        memo,
        status: "preparing",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    TripStore.createTrip(trip);
    renderHome();
}

function renderSimplePage(title, text) {
    tripTitle.textContent = getCurrentTripName(title);
    screen.innerHTML = `<section class="card"><h3>${title}</h3><p class="empty">${text}</p></section>`;
}

function renderSetting() {
    tripTitle.textContent = "설정";
    screen.innerHTML = `
        <section class="card">
            <h3>⚙ 설정</h3>
            <button class="primary-button" onclick="resetCurrentTrip()">현재 여행 삭제</button>
        </section>
    `;
}

function resetCurrentTrip() {
    if (!confirm("현재 여행 정보를 삭제할까요?")) return;
    TripStore.deleteCurrentTrip();
    renderHome();
}

const pages = {
    home: renderHome,
    schedule: () => renderSimplePage("📅 일정", "엑셀 연동 후 일정이 표시됩니다."),
    places: () => renderSimplePage("📍 장소", "장소 저장소는 다음 단계에서 구현합니다."),
    booking: () => renderSimplePage("🎫 예약", "예약 정보는 엑셀 연동 후 표시됩니다."),
    required: () => renderSimplePage("⭐ 필수", "필수 리스트는 다음 단계에서 구현합니다."),
    check: () => renderSimplePage("☑ 체크", "체크리스트는 다음 단계에서 구현합니다."),
    setting: renderSetting
};

document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
        pages[button.dataset.screen]();
    });
});

document.getElementById("refreshButton").addEventListener("click", () => {
    location.reload();
});

renderHome();