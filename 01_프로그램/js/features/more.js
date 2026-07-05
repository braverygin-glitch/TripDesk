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
        <p class="small">V1.0.4에서 일정 추가/수정/삭제 화면을 구현합니다.</p>
      </section>
    `;
  }
};
