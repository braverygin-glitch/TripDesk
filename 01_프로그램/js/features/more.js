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
        <p class="small">V1.0.7에서 체크리스트 기능을 구현합니다. 사진/메모 기능은 최하위 우선순위로 보류합니다.</p>
      </section>
    `;
  }
};
