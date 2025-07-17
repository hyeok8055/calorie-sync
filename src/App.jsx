import React, { useEffect } from 'react';
import { useLocation, useNavigate, BrowserRouter} from 'react-router-dom';
import { useSelector } from 'react-redux';
import Header from './components/Header';
import Footer from './components/Footer';
import AppRoutes from './routes';
import { useAuth } from './hook/useAuth';
import { usePwaInstall } from './hook/usePwaInstall';
import { useDeviceInfo } from './hook/useDeviceInfo';
import { useNotificationPermission } from './hook/useNotificationPermission';
import { setupForegroundHandler } from './firebaseconfig';

// 스타일 상수
const pwaInstallPromptStyle = {
  position: 'fixed',
  width: '70%',
  top: '10px',
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: '#4CAF50',
  color: 'white',
  padding: '10px 15px',
  borderRadius: '5px',
  zIndex: 10000,
  boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const pwaInstallButtonStyle = {
  backgroundColor: 'white',
  color: '#4CAF50',
  border: 'none',
  padding: '8px 16px',
  borderRadius: '3px',
  cursor: 'pointer'
};

const pwaInstallButtonTextStyle = {
  fontSize: '16px',
  fontWeight: 'bold'
};

// 알림 권한 요청 토스트 스타일
const notificationPromptStyle = {
  position: 'fixed',
  width: '70%',
  bottom: '80px',
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: '#2196F3',
  color: 'white',
  padding: '10px 15px',
  borderRadius: '5px',
  zIndex: 9999,
  boxShadow: '0 3px 8px rgba(0,0,0,0.3)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const notificationButtonStyle = {
  backgroundColor: 'white',
  color: '#2196F3',
  border: 'none',
  padding: '8px 15px',
  borderRadius: '5px',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '14px'
};

const ConditionalHeaderFooter = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const user = useSelector((state) => state.auth.user);

  React.useEffect(() => {
    if (isAuthenticated) {
      if (!user?.setupCompleted && location.pathname !== '/intro') {
        navigate('/intro');
      } else if (user?.setupCompleted && location.pathname === '/intro') {
        navigate('/main');
      }
    } else if (location.pathname !== '/googlelogin') {
      navigate('/googlelogin');
    }
  }, [isAuthenticated, user?.setupCompleted, location.pathname, navigate]);

  const hiddenRoutes = ['/googlelogin', '/intro'];
  const shouldHideHeaderFooter = hiddenRoutes.includes(location.pathname);

  return (
    <div className="app h-screen overflow-y-auto overflow-x-hidden flex flex-col">
      {!shouldHideHeaderFooter && (
        <div className="h-[60px] z-10">
          <Header />
        </div>
      )}
      <div className={`flex-1 ${!shouldHideHeaderFooter ? 'mb-[70px]' : ''}`}>
        <AppRoutes />
      </div>
      {!shouldHideHeaderFooter && (
        <div className="h-[70px] fixed bottom-0 left-0 right-0 bg-white border-t">
          <Footer />
        </div>
      )}
    </div>
  );
};

const App = () => {
  // 커스텀 훅 사용
  useAuth();
  const deviceInfo = useDeviceInfo();
  const { showInstallPrompt, installPwa } = usePwaInstall();
  // 알림 권한 훅 사용 (isAndroidPwa 속성 추가)
  const { showPermissionPrompt, requestPermission, isAndroidPwa } = useNotificationPermission();

  // 포그라운드 메시지 핸들러 초기화
  useEffect(() => {
    // 알림 권한이 있을 때만 포그라운드 핸들러 설정
    if (Notification.permission === 'granted') {
      setupForegroundHandler();
      // console.log('[App.jsx] 포그라운드 메시지 핸들러 설정 완료');
    }
  }, []);

  // 알림 권한 요청 버튼 클릭 핸들러
  const handleNotificationRequest = () => {
    // console.log('[App.jsx] 알림받기 버튼 클릭됨');
    // console.log('[App.jsx] requestPermission 함수 타입:', typeof requestPermission);
    
    if (typeof requestPermission === 'function') {
      requestPermission();
    } else {
      console.error('[App.jsx] requestPermission이 함수가 아닙니다:', requestPermission);
    }
  };

  return (
    <BrowserRouter>
      {/* PWA 설치 버튼 (스타일 상수 적용) */}
      {showInstallPrompt && (
        <div style={pwaInstallPromptStyle}>
          <span>앱 설치를 권장합니다</span>
          <button
            onClick={installPwa}
            style={pwaInstallButtonStyle}
          >
            <span style={pwaInstallButtonTextStyle}>
              설치
            </span>
          </button>
        </div>
      )}

      {/* 알림 권한 요청 토스트 */}
      {showPermissionPrompt && (
        <div style={notificationPromptStyle}>
          <span>알림 권한이 필요합니다</span>
          <button
            onClick={handleNotificationRequest}
            style={notificationButtonStyle}
          >
            알림받기
          </button>
        </div>
      )}

      <ConditionalHeaderFooter />
    </BrowserRouter>
  );
};

export default App;
