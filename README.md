# TripDesk

개인용 여행 관리 PWA 프로젝트입니다.

## 현재 버전
V1.0.8 GitHub Pages Ready

## 이번 버전
GitHub Pages 배포를 위해 프로젝트 구조를 정리했습니다.

기존 구조:

```text
TripDesk/
└── 01_프로그램/
    ├── index.html
    ├── css/
    ├── js/
    ├── data/
    ├── templates/
    ├── manifest.json
    └── sw.js
```

새 구조:

```text
TripDesk/
├── index.html
├── manifest.json
├── sw.js
├── css/
├── js/
├── data/
├── templates/
├── docs/
├── README.md
├── CHANGELOG.md
├── .gitignore
└── .nojekyll
```

## GitHub에 올리지 않는 폴더

아래 폴더는 `.gitignore`로 제외합니다.

```text
02_여행데이터/
03_백업/
```

개인 여행 엑셀, JSON 백업, 예약번호, 경비 데이터는 GitHub에 올리지 마세요.

## 실행

로컬에서는 아래 파일을 브라우저에서 엽니다.

```text
index.html
```

## GitHub Pages 배포

1. 이 폴더 구조 그대로 GitHub 저장소에 커밋합니다.
2. GitHub 저장소에서 `Settings`로 이동합니다.
3. 왼쪽 메뉴에서 `Pages`를 선택합니다.
4. `Build and deployment`에서 `Deploy from a branch`를 선택합니다.
5. Branch는 `main`, 폴더는 `/root`를 선택합니다.
6. 저장 후 몇 분 기다립니다.
7. 아래 형식의 주소로 접속합니다.

```text
https://사용자명.github.io/TripDesk/
```

## 휴대폰 설치

### Android
Chrome에서 접속 후 `앱 설치` 또는 `홈 화면에 추가`를 선택합니다.

### iPhone
Safari에서 접속 후 `공유` → `홈 화면에 추가`를 선택합니다.

## 다음 단계
V1.0.9 PWA 안정화 및 배포 테스트
