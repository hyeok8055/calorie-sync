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
import { useSurvey } from './hook/useSurvey';
import SurveyModal from './components/common/SurveyModal';

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
  const [isNavigating, setIsNavigating] = React.useState(false);

  React.useEffect(() => {
    // 이미 네비게이션 중이면 중복 실행 방지
    if (isNavigating) return;

    if (isAuthenticated && user) {
      if (!user.setupCompleted && location.pathname !== '/intro') {
        setIsNavigating(true);
        navigate('/intro', { replace: true });
        setTimeout(() => setIsNavigating(false), 100);
      } else if (user.setupCompleted && location.pathname === '/intro') {
        setIsNavigating(true);
        navigate('/main', { replace: true });
        setTimeout(() => setIsNavigating(false), 100);
      }
    } else if (!isAuthenticated && location.pathname !== '/googlelogin') {
      setIsNavigating(true);
      navigate('/googlelogin', { replace: true });
      setTimeout(() => setIsNavigating(false), 100);
    }
  }, [isAuthenticated, user?.setupCompleted, user?.email, location.pathname, navigate, isNavigating]);

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
  // 설문조사 관련 훅
  const { checkGlobalSurveyStatus, markSurveyCompleted } = useSurvey();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const surveyState = useSelector((state) => state.survey);
  const email = useSelector((state) => state.auth.user?.email);

  // 포그라운드 메시지 핸들러 초기화
  useEffect(() => {
    // 알림 권한이 있을 때만 포그라운드 핸들러 설정
    if (Notification.permission === 'granted') {
      setupForegroundHandler();
    }
  }, []);

  // 설문조사 상태 확인
  useEffect(() => {
    if (isAuthenticated && email) {
      // 전역 설문조사 상태 확인 (사용자 완료 상태도 함께 확인됨)
      checkGlobalSurveyStatus();
    }
  }, [isAuthenticated, email, checkGlobalSurveyStatus]);

  // 설문조사 모달 표시 여부 결정
  const shouldShowSurveyModal = isAuthenticated && 
    surveyState.isActive && 
    surveyState.surveyId && 
    !surveyState.completedSurveys.some(completed => completed.surveyId === surveyState.surveyId);

  // 설문조사 모달 닫기 함수
  const handleCloseSurveyModal = () => {
    if (surveyState.surveyId) {
      markSurveyCompleted(surveyState.surveyId);
    }
  };

  // 알림 권한 요청 버튼 클릭 핸들러
  const handleNotificationRequest = () => {
    if (typeof requestPermission === 'function') {
      requestPermission();
    } else {
      console.error('requestPermission이 함수가 아닙니다:', requestPermission);
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
      
      {/* 설문조사 모달 */}
      {shouldShowSurveyModal && (
        <SurveyModal 
          visible={shouldShowSurveyModal}
          surveyId={surveyState.surveyId}
          onClose={handleCloseSurveyModal}
        />
      )}
    </BrowserRouter>
  );
};

export default App;
