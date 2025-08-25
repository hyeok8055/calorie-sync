import React, { useEffect, useState } from 'react';
import { Modal, Button, Space } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setSurveyCompleted } from '../../redux/actions/surveyActions';
import { useSurvey } from '../../hook/useSurvey';
import {
  CheckCircleOutline
} from 'antd-mobile-icons';

const SurveyModal = ({ visible, onClose, surveyId }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const uid = useSelector((state) => state.auth.user?.uid);
  const { checkGlobalSurveyStatus, checkUserSurveyCompletion } = useSurvey();
  const [autoModalVisible, setAutoModalVisible] = useState(false);
  const [currentSurveyId, setCurrentSurveyId] = useState(null);

  // 전역 설문조사 상태 확인 및 자동 모달 표시
  useEffect(() => {
    const checkAndShowSurvey = async () => {
      if (uid) {
        try {
          const globalStatus = await checkGlobalSurveyStatus();
          
          if (globalStatus && globalStatus.isActive) {
            const userCompletion = await checkUserSurveyCompletion(uid, globalStatus.surveyId);
            
            // 사용자가 아직 설문조사를 완료하지 않은 경우 자동으로 모달 표시
            if (!userCompletion) {
              setCurrentSurveyId(globalStatus.surveyId);
              setAutoModalVisible(true);
            }
          }
        } catch (error) {
          console.error('설문조사 상태 확인 실패:', error);
        }
      }
    };

    checkAndShowSurvey();
    
    // 30초마다 설문조사 상태 재확인
    const interval = setInterval(checkAndShowSurvey, 30 * 1000);
    
    return () => clearInterval(interval);
  }, [uid, checkGlobalSurveyStatus, checkUserSurveyCompletion]);

  const handleParticipate = () => {
    // 자동 모달인 경우
    if (autoModalVisible) {
      setAutoModalVisible(false);
    }
    // 수동 모달인 경우 onClose가 함수인 경우에만 호출
    if (typeof onClose === 'function') {
      onClose();
    }
    navigate('/survey');
  };

  const handleCloseAutoModal = () => {
    setAutoModalVisible(false);
  };

  // 표시할 모달 결정 (자동 모달이 우선)
  const shouldShowModal = autoModalVisible || visible;
  const isAutoModal = autoModalVisible;

  return (
      <Modal
        visible={shouldShowModal}
      content={
        <div className="text-center p-6">
          {/* 제목 */}
          <h2 className="text-xl font-bold text-gray-800 mb-3" style={{ fontFamily: 'Pretendard-700' }}>
            📊 설문조사 참여 안내
          </h2>
        
          {/* 버튼 영역 */}
          <div className="mt-6">
            <Button
              block
              color="primary"
              size="large"
              shape="rounded"
              onClick={handleParticipate}
              style={{
                '--background-color': '#5FDD9D',
                '--border-color': '#5FDD9D',
                fontFamily: 'Pretendard-600',
                fontSize: '16px',
                height: '48px'
              }}
            >
              <Space align="center">
                <CheckCircleOutline />
                <span>지금 참여하기</span>
              </Space>
            </Button>
          </div>
        </div>
      }
        closeOnMaskClick={!isAutoModal}
        showCloseButton={!isAutoModal}
        onClose={isAutoModal ? undefined : onClose}
    />
  );
};

export default SurveyModal;