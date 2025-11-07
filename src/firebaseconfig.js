// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getAnalytics, isSupported } from "firebase/analytics";

// Firebase configuration
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const realtimeDb = getDatabase(app);
const messaging = getMessaging(app);

// Initialize Analytics (with support check for environments like localhost)
let analytics = null;
isSupported().then(yes => {
  if (yes) {
    analytics = getAnalytics(app);
    console.log('Firebase Analytics initialized');
  }
}).catch(err => {
  console.warn('Firebase Analytics not supported:', err);
});

// 포그라운드 메시지 핸들러 설정 함수
export const setupForegroundHandler = () => {
  onMessage(messaging, (payload) => {
    console.log('[firebaseconfig.js] 포그라운드 메시지 수신:', payload);
    // 핵심: data-only 메시지만 처리하여 중복 방지
    if (payload.data && !payload.notification) {
      showForegroundNotification(payload.data);
    }
  });
};

// 포그라운드 알림 표시 함수
const showForegroundNotification = (data) => {
  if (Notification.permission === 'granted') {
    const { title, body, icon } = data;
    
    // 브라우저 알림 생성
    const notification = new Notification(title || '새 알림', {
      body: body || '새로운 알림이 도착했습니다',
      icon: icon || '/icons/maskable_icon_x192.png',
      badge: '/icons/maskable_icon_x48.png',
      tag: 'calorie-sync-foreground', // 중복 방지 태그
      requireInteraction: true,
      vibrate: [100, 50, 100]
    });

    // 알림 클릭 이벤트 처리
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // 5초 후 자동 닫기
    setTimeout(() => {
      notification.close();
    }, 5000);
  }
};

export { 
  app, 
  auth, 
  db, 
  realtimeDb, 
  messaging,
  getToken,
  onMessage,
  analytics
};
