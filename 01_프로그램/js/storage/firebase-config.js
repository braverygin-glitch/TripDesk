// TripDesk Firebase 웹 앱 설정
// Safari/iPhone 대응: 설정을 전역 변수에 넣고 로드 완료 이벤트를 발생시킵니다.

(function () {
  const config = {
    apiKey: "AIzaSyCwBaS5_fnmWsJG45gpAiP-pc8seaM6OHI",
    authDomain: "tripdesk-4fa90.firebaseapp.com",
    projectId: "tripdesk-4fa90",
    storageBucket: "tripdesk-4fa90.firebasestorage.app",
    messagingSenderId: "52234613370",
    appId: "1:52234613370:web:d1f2b59875d4337c2681c3"
  };

  window.TRIPDESK_FIREBASE_CONFIG = config;
  window.__TRIPDESK_FIREBASE_CONFIG_READY__ = true;

  try {
    window.dispatchEvent(new CustomEvent("tripdesk:firebase-config-ready", {
      detail: config
    }));
  } catch (_) {
    // 구형 브라우저 대응
    const event = document.createEvent("Event");
    event.initEvent("tripdesk:firebase-config-ready", true, true);
    window.dispatchEvent(event);
  }
})();
