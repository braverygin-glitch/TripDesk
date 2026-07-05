window.HomeFeature = {
  render(trip) {
    const pinnedCount = trip.schedule.filter(item => item.pinned).length + trip.bookings.filter(item => item.pinned).length;

    return `
      <section class="card">
        <div class="card-title">여행 정보</div>
        <p><b>${Utils.escape(trip.name)}</b></p>
        <p class="small">${Utils.formatDate(trip.startDate)} ~ ${Utils.formatDate(trip.endDate)} · ${Utils.escape(trip.travelers)}</p>
        <p class="small">${Utils.escape(trip.memo || "메모 없음")}</p>
      </section>

      <section class="card">
        <div class="card-title">데이터 상태</div>
        <div class="item">
          <div><b>도시</b></div>
          <div class="small">${trip.cities.length}개</div>
        </div>
        <div class="item">
          <div><b>일정</b></div>
          <div class="small">${trip.schedule.length}개</div>
        </div>
        <div class="item">
          <div><b>예약</b></div>
          <div class="small">${trip.bookings.length}개</div>
        </div>
        <div class="item">
          <div><b>핀</b></div>
          <div class="small">${pinnedCount}개</div>
        </div>
      </section>

      <section class="card">
        <div class="card-title">현재 버전</div>
        <p class="small">V1.0.3 엑셀 가져오기 포함. 다음 단계는 V1.0.4 일정 관리입니다.</p>
      </section>
    `;
  }
};
