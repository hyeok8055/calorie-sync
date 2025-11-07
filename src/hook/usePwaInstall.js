import { useState, useEffect } from 'react';
import { logPWAInstallPrompt, logPWAInstalled } from '../utils/analytics';

export const usePwaInstall = () => {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setShowInstallPrompt(true);
    };

    const handleAppInstalled = () => {
      // Analytics: PWA 설치 완료 이벤트
      logPWAInstalled();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 클린업 함수: 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []); // 마운트 시 한 번만 실행

  const installPwa = async () => {
    if (!deferredPrompt) {
      // console.log('설치 프롬프트가 없습니다 (hook)');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    // console.log(`사용자 선택 (hook): ${outcome}`);

    // Analytics: PWA 설치 프롬프트 응답 이벤트
    logPWAInstallPrompt(outcome === 'accepted');

    // 프롬프트가 사용되었으므로 상태 초기화
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  return { showInstallPrompt, installPwa };
}; 