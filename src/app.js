const screen = document.getElementById("screen");
const tripTitle = document.getElementById("tripTitle");

let currentTrip = loadTrip();

function loadTrip() {
    const saved = localStorage.getItem("tripdesk_current_trip");
    return saved ? JSON.parse(saved) : null;
}

function saveTrip(trip) {
    localStorage.setItem("tripdesk_current_trip", JSON.stringify(trip));
    currentTrip = trip;
}

function makeTripId(name) {
    return name
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^\w가-힣_]/g, "")
        || "New_Trip";
}

function renderHome() {
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
                    <button class="menu-row" onclick="renderCreateTrip()">
                        ➕ 새 여행 만들기
                    </button>
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
            <h3>다음 단계</h3>
            <p class="empty">이제 엑셀 예약내역을 연결할 차례입니다.</p>
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

            <label>국가</label>
            <input id="tripCountry" class="input" placeholder="예: Spain, Portugal">

            <label>출발일</label>
            <input id="startDate" class="input" type="date">

            <label>귀국일</label>
            <input id="endDate" class="input" type="date">

            <label>통화</label>
            <select id="currency" class="input">
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="KRW">KRW</option>
                <option value="JPY">JPY</option>
            </select>

            <button class="primary-button" onclick="createTrip()">
                여행 생성
            </button>
        </section>
    `;
}

function createTrip() {
    const name = document.getElementById("tripName").value.trim();
    const country = document.getElementById("tripCountry").value.trim();
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;
    const currency = document.getElementById("currency").value;

    if (!name || !startDate || !endDate) {
        alert("여행 이름, 출발일, 귀국일은 필수입니다.");
        return;
    }

    const trip = {
        id: makeTripId(name),
        name,
        country,
        startDate,
        endDate,
        currency,
        createdAt: new Date().toISOString()
    };

    saveTrip(trip);
    renderHome();
}

const pages = {
    home: renderHome,
    schedule: () => {
        tripTitle.textContent = currentTrip?.name || "일정";
        screen.innerHTML = `<section class="card"><h3>📅 일정</h3><p class="empty">아직 일정이 없습니다.</p></section>`;
    },
    places: () => {
        tripTitle.textContent = currentTrip?.name || "장소";
        screen.innerHTML = `<section class="card"><h3>📍 장소 저장소</h3><p class="empty">장소 기능은 다음 단계에서 구현합니다.</p></section>`;
    },
    booking: () => {
        tripTitle.textContent = currentTrip?.name || "예약";
        screen.innerHTML = `<section class="card"><h3>🎫 예약</h3><p class="empty">예약 기능은 엑셀 연동 후 구현합니다.</p></section>`;
    },
    required: () => {
        tripTitle.textContent = currentTrip?.name || "필수";
        screen.innerHTML = `<section class="card"><h3>⭐ 필수 리스트</h3><p class="empty">필수 리스트는 다음 단계에서 구현합니다.</p></section>`;
    },
    check: () => {
        tripTitle.textContent = currentTrip?.name || "체크";
        screen.innerHTML = `
            <section class="card">
                <h3>☑ 체크리스트</h3>
                <p>□ 여권</p>
                <p>□ 충전기</p>
                <p>□ 보조배터리</p>
                <p>□ eSIM</p>
            </section>
        `;
    },
    setting: () => {
        tripTitle.textContent = "설정";
        screen.innerHTML = `
            <section class="card">
                <h3>⚙ 설정</h3>
                <button class="primary-button" onclick="resetTrip()">현재 여행 삭제</button>
            </section>
        `;
    }
};

function resetTrip() {
    if (!confirm("현재 여행 정보를 삭제할까요?")) return;
    localStorage.removeItem("tripdesk_current_trip");
    currentTrip = null;
    renderHome();
}

document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");

        const page = button.dataset.screen;
        pages[page]();
    });
});

document.getElementById("refreshButton").addEventListener("click", () => {
    location.reload();
});

renderHome();