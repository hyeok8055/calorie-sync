// Firebase 메시징 서비스 워커 (Vite PWA injectManifest 전략 사용)
// 이 파일은 Vite 빌드 과정에서 처리되어 환경변수가 안전하게 주입됩니다.

// Workbox 라이브러리는 vite-plugin-pwa에서 자동으로 주입됩니다.
// 따라서 직접 import하지 않고 전역 객체를 사용합니다.

// Vite PWA가 주입할 매니페스트를 사용해 프리캐싱 수행
// 앱의 셸(HTML, JS, CSS 등)을 캐싱하여 오프라인에서 작동하게 함
if (self.__WB_MANIFEST) {
  // Workbox precaching은 vite-plugin-pwa에서 자동으로 처리됩니다.
  console.log('[firebase-messaging-sw.js] Workbox precaching enabled');
}

/* ================================================= */
/* Firebase 메시징 코드                              */
/* ================================================= */

// Firebase 메시징 변수를 전역으로 정의
self.firebaseMessaging = null;

// Firebase 앱과 메시징 초기화
function initializeFirebaseMessaging() {
  if (!self.firebase) {
    // Firebase 앱과 메시징 관련 스크립트 로드
    importScripts("https://www.gstatic.com/firebasejs/12.2.0/firebase-app-compat.js");
    importScripts("https://www.gstatic.com/firebasejs/12.2.0/firebase-messaging-compat.js");

    // Firebase 구성 값 (개발/프로덕션 환경 대응)
    // 개발 모드에서는 import.meta.env를 사용할 수 없으므로 전역 변수나 하드코딩 사용
    const firebaseConfig = {
      apiKey: self.VITE_FIREBASE_API_KEY,
      authDomain: self.VITE_FIREBASE_AUTH_DOMAIN,
      databaseURL: self.VITE_FIREBASE_DATABASE_URL,
      projectId: self.VITE_FIREBASE_PROJECT_ID,
      storageBucket: self.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: self.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: self.VITE_FIREBASE_APP_ID,
      measurementId: self.VITE_FIREBASE_MEASUREMENT_ID
    };

    // Firebase 초기화
    firebase.initializeApp(firebaseConfig);

    // Firebase Messaging 인스턴스 가져오기 및 전역 변수에 저장
    self.firebaseMessaging = firebase.messaging();
    
    // console.log('[firebase-messaging-sw.js] Firebase 메시징 초기화 완료');
  }
  
  return self.firebaseMessaging;
}

// 모듈이 로드되면 Firebase 메시징 초기화
const messaging = initializeFirebaseMessaging();

// 핵심: 백그라운드 메시지 수신 이벤트 핸들러 (중복 방지)
messaging.onBackgroundMessage(function(payload) {
  // console.log('[firebase-messaging-sw.js] 백그라운드 메시지 수신:', payload);
  
  // 핵심: data-only 메시지만 처리하여 중복 방지
  if (payload.data && !payload.notification) {
    const { title, body, icon, timestamp } = payload.data;
    
    // 알림 설정 (중복 방지 태그 사용)
    const notificationOptions = {
      body: body || '새로운 알림이 도착했습니다',
      icon: icon || '/icons/maskable_icon_x192.png',
      badge: '/icons/maskable_icon_x48.png',
      vibrate: [100, 50, 100],
      tag: 'calorie-sync-notification', // 중복 방지를 위한 고유 태그
      renotify: true,
      requireInteraction: true,
      data: {
        ...payload.data,
        clickAction: '/'
      }
    };

    // 커스텀 알림 표시
    return self.registration.showNotification(title || '새 알림', notificationOptions);
  }
  
  return null;
});

// 알림 클릭 이벤트 리스너 정의
self.addEventListener('notificationclick', event => {
  // console.log('[firebase-messaging-sw.js] 알림 클릭됨:', event);
  event.notification.close();
  
  // 알림 클릭 시 앱 열기
  const urlToOpen = event.notification.data?.clickAction || '/';  
  const fullUrl = new URL(urlToOpen, self.location.origin).href;
  
  event.waitUntil(
    clients.matchAll({type: 'window', includeUncontrolled: true}).then(windowClients => {
      // 이미 열린 앱 창이 있는지 확인
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // 열린 창이 없으면 새 창 열기
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});

// 메인 sw.js와 통신하기 위한 메시지 이벤트 리스너
self.addEventListener('message', event => {
  // if (event.data && event.data.type === 'FIREBASE_MESSAGING_TEST') {
  //   // 테스트 알림 표시
  //   self.registration.showNotification('FCM 테스트', {
  //     body: 'Firebase 메시징이 정상적으로 작동합니다',
  //     icon: '/icons/maskable_icon_x192.png',
  //     tag: 'test-notification'
  //   });
  // }
  
  // 서비스 워커 상태 확인 요청에 응답
  if (event.data && event.data.type === 'SW_STATUS_CHECK') {
    event.ports[0]?.postMessage({
      type: 'SW_STATUS_RESPONSE',
      status: 'active'
    });
  }
});