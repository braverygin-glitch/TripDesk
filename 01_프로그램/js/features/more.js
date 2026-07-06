window.MoreFeature = {
  render() {
    return `
      <section class="card">
        <div class="card-title">저장 상태</div>
        <p class="small">${DataService.statusText()}</p>
      </section>

      <section class="card">
        <div class="card-title">엑셀 표준</div>
        <p class="small">날짜, 도시, 시간, 제목, 분류, 태그, 확정여부, 메모, 예약번호, 주소</p>
      </section>

      <section class="card">
        <div class="card-title">다음 단계</div>
        <p class="small">V1.5.0에서 달력 보기, 예산 분석, 체크리스트 개선을 추가했습니다. 지도 버튼은 보조 기능으로 유지합니다.</p>
      </section>
    `;
  }
};
