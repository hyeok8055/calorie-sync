import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebaseconfig';
import { setSurveyActive, setSurveyCompleted } from '../redux/actions/surveyActions';

const useSurvey = () => {
  const dispatch = useDispatch();
  const uid = useSelector((state) => state.auth.user?.uid);
  const surveyState = useSelector((state) => state.survey);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 사용자의 설문조사 완료 여부 확인
  const checkUserSurveyCompletion = useCallback(async (userId, surveyId) => {
    if (!userId || !surveyId) return false;
    
    try {
      // 구조: surveys/{surveyId}/responses/{userId}
      const userResponseDoc = await getDoc(doc(db, 'surveys', surveyId, 'responses', userId));
      return userResponseDoc.exists();
    } catch (err) {
      console.error('사용자 설문조사 완료 여부 확인 오류:', err);
      return false;
    }
  }, []);

  // 전역 설문조사 상태 확인
  const checkGlobalSurveyStatus = useCallback(async () => {
    try {
      setLoading(true);
      const surveyDoc = await getDoc(doc(db, 'system', 'survey'));
      
      if (surveyDoc.exists()) {
        const data = surveyDoc.data();
        if (data.isActive && data.surveyId) {
          return { isActive: true, surveyId: data.surveyId };
        }
      }
      
      return { isActive: false, surveyId: null };
    } catch (err) {
      console.error('설문조사 상태 확인 오류:', err);
      setError(err.message);
      return { isActive: false, surveyId: null };
    } finally {
      setLoading(false);
    }
  }, []);



  // 관리자: 설문조사 활성화
  const activateSurvey = async () => {
    try {
      setLoading(true);
      const surveyId = `survey_${Date.now()}`;
      
      await setDoc(doc(db, 'system', 'survey'), {
        isActive: true,
        surveyId: surveyId,
        activatedAt: serverTimestamp(),
        activatedBy: uid
      });
      
      dispatch(setSurveyActive(true, surveyId));
      return { success: true, surveyId };
    } catch (err) {
      console.error('설문조사 활성화 오류:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // 관리자: 설문조사 비활성화
  const deactivateSurvey = async () => {
    try {
      setLoading(true);
      
      await updateDoc(doc(db, 'system', 'survey'), {
        isActive: false,
        deactivatedAt: serverTimestamp(),
        deactivatedBy: uid
      });
      
      dispatch(setSurveyActive(false, null));
      return { success: true };
    } catch (err) {
      console.error('설문조사 비활성화 오류:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // 사용자: 설문조사 응답 저장
  const submitSurveyResponse = async (surveyId, responses, metadata = {}) => {
    if (!uid || !surveyId || !responses || responses.length === 0) {
      return { success: false, error: '필수 정보가 누락되었습니다.' };
    }
    
    try {
      setLoading(true);
      
      // 디바이스 정보 수집
      const deviceInfo = {
        platform: navigator.platform || 'Unknown',
        userAgent: navigator.userAgent,
        screenSize: `${window.screen.width}x${window.screen.height}`
      };
      
      // 설문조사 응답 데이터 구조
      const surveyData = {
        userId: uid,
        surveyId: surveyId,
        submittedAt: serverTimestamp(),
        responses: responses.map(response => ({
          ...response,
          answeredAt: response.answeredAt || serverTimestamp()
        })),
        deviceInfo,
        metadata: {
          source: 'modal',
          version: '1.0',
          ...metadata
        }
      };
      
      // Firestore에 저장: surveys/{surveyId}/responses/{userId}
      await setDoc(doc(db, 'surveys', surveyId, 'responses', uid), surveyData);
      
      // Redux 상태 업데이트
      dispatch(setSurveyCompleted(surveyId));
      
      return { success: true, data: surveyData };
    } catch (err) {
      console.error('설문조사 응답 저장 오류:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };
  
  // 특정 설문조사의 모든 응답 조회 (관리자용)
  const getSurveyResponses = async (surveyId) => {
    if (!surveyId) return { success: false, error: '설문조사 ID가 필요합니다.' };
    
    try {
      setLoading(true);
      const responsesSnapshot = await getDocs(collection(db, 'surveys', surveyId, 'responses'));
      
      const responses = [];
      responsesSnapshot.forEach(doc => {
        responses.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return { success: true, data: responses };
    } catch (err) {
      console.error('설문조사 응답 조회 오류:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };
  
  // 사용자의 특정 설문조사 응답 조회
  const getUserSurveyResponse = async (surveyId) => {
    if (!uid || !surveyId) return { success: false, error: '사용자 정보 또는 설문조사 ID가 없습니다.' };
    
    try {
      setLoading(true);
      const userResponseDoc = await getDoc(doc(db, 'surveys', surveyId, 'responses', uid));
      
      if (userResponseDoc.exists()) {
        return { success: true, data: userResponseDoc.data() };
      } else {
        return { success: false, error: '응답을 찾을 수 없습니다.' };
      }
    } catch (err) {
      console.error('사용자 설문조사 응답 조회 오류:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };
  
  // 설문조사 응답 통계 조회 (관리자용)
  const getSurveyStatistics = async (surveyId) => {
    if (!surveyId) return { success: false, error: '설문조사 ID가 필요합니다.' };
    
    try {
      setLoading(true);
      const responsesResult = await getSurveyResponses(surveyId);
      
      if (!responsesResult.success) {
        return responsesResult;
      }
      
      const responses = responsesResult.data;
      const totalResponses = responses.length;
      
      // 기본 통계 계산
      const statistics = {
        totalResponses,
        responsesByPlatform: {},
        averageCompletionTime: 0,
        responsesByDate: {},
        questionStatistics: {}
      };
      
      // 플랫폼별 응답 수 계산
      responses.forEach(response => {
        const platform = response.deviceInfo?.platform || 'Unknown';
        statistics.responsesByPlatform[platform] = (statistics.responsesByPlatform[platform] || 0) + 1;
        
        // 날짜별 응답 수 계산
        const date = response.submittedAt?.toDate?.()?.toISOString().split('T')[0] || 'Unknown';
        statistics.responsesByDate[date] = (statistics.responsesByDate[date] || 0) + 1;
        
        // 완료 시간 계산
        if (response.metadata?.completionTime) {
          statistics.averageCompletionTime += response.metadata.completionTime;
        }
      });
      
      if (totalResponses > 0) {
        statistics.averageCompletionTime = statistics.averageCompletionTime / totalResponses;
      }
      
      return { success: true, data: statistics };
    } catch (err) {
      console.error('설문조사 통계 조회 오류:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };
  
  // 사용자: 설문조사 완료 처리 (기존 호환성 유지)
  const markSurveyCompleted = async (surveyId) => {
    if (!uid || !surveyId) return { success: false, error: '사용자 정보 또는 설문조사 ID가 없습니다.' };
    
    try {
      dispatch(setSurveyCompleted(surveyId));
      return { success: true };
    } catch (err) {
      console.error('설문조사 완료 처리 오류:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // 앱 시작 시 설문조사 상태 확인
  useEffect(() => {
    if (uid) {
      checkGlobalSurveyStatus();
    }
  }, [uid, checkGlobalSurveyStatus]);

  return {
    surveyState,
    loading,
    error,
    checkGlobalSurveyStatus,
    checkUserSurveyCompletion,
    activateSurvey,
    deactivateSurvey,
    submitSurveyResponse,
    getSurveyResponses,
    getUserSurveyResponse,
    getSurveyStatistics,
    markSurveyCompleted
  };
};

export { useSurvey };