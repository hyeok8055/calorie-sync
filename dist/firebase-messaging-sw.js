// Firebase 메시징 서비스 워커 기능 정의
// 이 파일은 Vite PWA 플러그인에 의해 생성된 sw.js에 의해 importScripts 됩니다.
// 실제 서비스 워커 등록은 Vite PWA 플러그인이 처리합니다.

// Firebase 메시징 변수를 전역으로 정의 (sw.js에서 접근 가능하도록)
self.firebaseMessaging = null;

// Firebase 앱과 메시징 초기화
function initializeFirebaseMessaging() {
  if (!self.firebase) {
    // Firebase 앱과 메시징 관련 스크립트 로드
    importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
    importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

    // Firebase 구성 값
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
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
  
  // notification 객체가 포함된 메시지는 무시 (FCM 자동 처리 방지)
  // console.log('[firebase-messaging-sw.js] notification 객체 포함 메시지 무시');
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