# TripDesk

개인용 여행 관리 PWA 프로젝트입니다.

## 현재 버전
V1.2.0 Auto Firebase Sync

## 이번 버전
Firebase 동기화를 자동화했습니다.

- 한 번 실시간 동기화 시작 후 자동 동기화 상태 저장
- 앱을 다시 열 때 Firebase 자동 연결 시도
- Google 로그인 상태가 남아 있으면 자동 실시간 동기화 시작
- 자동 동기화 끄기 버튼 추가
- 기존 수동 연결/업로드/불러오기 버튼은 문제 해결용으로 유지

## 사용 방식

처음 한 번:
1. Firebase 설정
2. Google 로그인
3. 클라우드에서 불러오기 또는 현재 데이터 업로드
4. 실시간 동기화 시작

그 이후:
- 앱을 열면 자동으로 Firebase 연결을 시도합니다.
- 로그인 상태가 유지되어 있으면 자동 동기화됩니다.

## GitHub Pages

```text
https://braverygin-glitch.github.io/TripDesk/
```
