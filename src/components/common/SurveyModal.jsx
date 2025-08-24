import React from 'react';
import { Modal, Button, Space } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setSurveyCompleted } from '../../redux/actions/surveyActions';
import {
  CheckCircleOutline
} from 'antd-mobile-icons';

const SurveyModal = ({ visible, onClose, surveyId }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleParticipate = () => {
    // onClose가 함수인 경우에만 호출
    if (typeof onClose === 'function') {
      onClose();
    }
    navigate('/survey');
  };

  return (
    <Modal
      visible={visible}
      content={
        <div className="text-center p-6">
          {/* 제목 */}
          <h2 className="text-xl font-bold text-gray-800 mb-3" style={{ fontFamily: 'Pretendard-700' }}>
            📊 설문조사 참여 안내
          </h2>

          {/* 설명 */}
          <div className="text-gray-600 mb-6 space-y-2" style={{ fontFamily: 'Pretendard-500' }}>
            <p className="text-base leading-relaxed">
              여러분의 소중한 의견을 듣고자 합니다.
            </p>
            <p className="text-sm text-gray-500">
              설문조사는 약 3-5분 정도 소요됩니다.
            </p>
          </div>
        
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

          {/* 안내 문구 */}
          <p className="text-xs text-gray-400 mt-4" style={{ fontFamily: 'Pretendard-400' }}>
            설문조사 참여로 더 나은 서비스를 만들어가요!
          </p>
        </div>
      }
      closeOnMaskClick={false}
      showCloseButton={false}
    />
  );
};

export default SurveyModal;