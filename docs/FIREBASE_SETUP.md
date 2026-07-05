# Firebase 설정 가이드

TripDesk V1.0.10은 Firebase를 선택적으로 사용합니다.

Firebase 설정이 없어도 앱은 로컬 저장으로 정상 작동합니다.

## 1. Firebase 프로젝트 만들기

1. Firebase Console 접속
2. 프로젝트 추가
3. 프로젝트 이름 예: `TripDesk`
4. Google Analytics는 꺼도 됩니다.

## 2. 웹 앱 추가

1. 프로젝트 개요에서 웹 아이콘 `</>` 선택
2. 앱 닉네임: `TripDesk`
3. Hosting 설정은 지금 체크하지 않아도 됩니다.
4. 생성 후 `firebaseConfig` 값을 복사합니다.

예시:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

TripDesk 앱의 `더보기 > Firebase 동기화 > 설정`에 중괄호 안 JSON만 붙여넣습니다.

## 3. Authentication 설정

1. Firebase Console
2. Authentication
3. Sign-in method
4. Google 사용 설정
5. 저장

## 4. Firestore Database 설정

1. Firestore Database
2. 데이터베이스 만들기
3. Production mode 또는 Test mode 선택
4. 위치 선택

## 5. 권장 Firestore 보안 규칙

아래 규칙은 로그인한 사용자 본인의 데이터만 읽고 쓸 수 있게 합니다.

```text
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/trips/{tripId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 6. 동기화 방식

- PC에서 엑셀 가져오기
- Firebase 업로드
- 휴대폰에서 같은 Google 계정으로 로그인
- 클라우드에서 불러오기 또는 실시간 동기화 시작
- 이후 PC/휴대폰 양쪽에서 수정 가능

## 주의

처음 연결할 때는 PC에서 `Firebase 업로드`를 먼저 하는 것을 권장합니다.
