# TripDesk

개인용 여행 관리 PWA 프로젝트입니다.

## 현재 버전
V1.0.10.2 Firebase Auth Flow Fix

## 이번 패치
Firebase Redirect 로그인 흐름을 안정화했습니다.

- 앱 시작 시 Firebase 로그인 상태 자동 확인
- Redirect 로그인 후 TripDesk로 돌아왔을 때 로그인 상태 복구
- 업로드/다운로드/실시간 동기화는 로그인 완료 후에만 실행
- 모바일 Safari/PWA에서 로그인 흐름 안정화
- 오류 메시지 개선

## 사용 순서
1. 더보기
2. Firebase 동기화
3. 설정 저장
4. 연결 확인
5. Google 로그인
6. PC/현재 데이터 업로드
7. 휴대폰에서 같은 Google 계정 로그인
8. 클라우드에서 불러오기
9. 실시간 동기화 시작

## 주소
```text
https://braverygin-glitch.github.io/TripDesk/
```

## 주의
Firebase 로그인은 `file://` 로컬 파일 실행에서는 동작하지 않습니다.
