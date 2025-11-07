import React, { useState } from 'react';
import { Form, Input, Select, Button, Radio, Card, Typography, Row, Col, message, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseconfig';
import { useSelector, useDispatch } from 'react-redux';
import { setAuthStatus } from '../../redux/actions/authActions';
import { logPageView } from '../../utils/analytics';

const { Option } = Select;

const Intro = () => {
  const navigate = useNavigate();
  const email = useSelector((state) => state.auth.user?.email);
  const uid = useSelector((state) => state.auth.user?.uid);
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [showCustomGoal, setShowCustomGoal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Analytics: 페이지 뷰
  React.useEffect(() => {
    logPageView('intro', '초기 프로필 설정 페이지');
  }, []);

  const onFinish = async (values) => {
    if (!email) {
      message.error('사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
      return;
    }

    setLoading(true);
    
    try {
      const userRef = doc(db, "users", email);
      
      // 최종 목표값 설정
      const finalGoal = values.goal === 'customGoal' ? values.customGoalText : values.goal;
      
      // Firestore에 저장할 데이터
      const userData = {
        ...values,
        goal: finalGoal,
        setupCompleted: true
      };
      
      // Firestore 업데이트
      await updateDoc(userRef, userData);

      // Redux 상태 업데이트
      const updatedUserData = {
        ...userData,
        uid,
        email,
        setupCompleted: true
      };
      
      dispatch(setAuthStatus(updatedUserData));
      
      // Analytics: 프로필 설정 완료 이벤트
      const { logProfileSetup } = await import('../../utils/analytics');
      logProfileSetup(userData);
      
      // 성공 메시지 표시
      message.success('프로필 설정이 완료되었습니다!');
      
      // 약간의 지연 후 라우팅 (Redux 상태 업데이트 완료 대기)
      setTimeout(() => {
        navigate('/main', { replace: true });
      }, 500);
      
    } catch (error) {
      console.error('사용자 정보 업데이트 실패:', error);
      
      // 구체적인 에러 메시지 제공
      if (error.code === 'permission-denied') {
        message.error('권한이 없습니다. 다시 로그인해주세요.');
      } else if (error.code === 'unavailable') {
        message.error('네트워크 연결을 확인해주세요.');
      } else {
        message.error('설정 저장에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoalChange = (value) => {
    setShowCustomGoal(value === 'customGoal');
    if (value !== 'customGoal') {
      form.setFieldValue('customGoalText', undefined);
    }
  };

  return (
    <div style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#f0f2f5', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Card 
        style={{ 
          maxWidth: '450px', 
          width: '100%', 
          borderRadius: '12px', 
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
        }}
      >
        <Typography.Title 
          level={2} 
          style={{ 
            textAlign: 'center', 
            marginBottom: '30px', 
            fontFamily: 'Pretendard-800', 
            color: '#333',
            letterSpacing: '1px' 
          }}
        >
          프로필 설정
        </Typography.Title>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          size="large" // 폼 요소 크기 조정
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="height"
                label={<span style={{ fontFamily: 'Pretendard-600' }}>키 (cm)</span>}
                rules={[{ required: true, message: '키를 입력해주세요' }]}
              >
                <Input placeholder="예) 175" type="number" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="age"
                label={<span style={{ fontFamily: 'Pretendard-600' }}>나이</span>}
                rules={[{ required: true, message: '나이를 입력해주세요' }]}
              >
                <Input placeholder="예) 25" type="number" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="gender"
            label={<span style={{ fontFamily: 'Pretendard-600' }}>성별</span>}
            rules={[{ required: true, message: '성별을 선택해주세요' }]}
          >
            <Radio.Group style={{ width: '100%' }}>
              <Radio.Button value="male" style={{ width: '50%', textAlign: 'center', borderRadius: '8px 0 0 8px' }}>남성</Radio.Button>
              <Radio.Button value="female" style={{ width: '50%', textAlign: 'center', borderRadius: '0 8px 8px 0' }}>여성</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="goal"
            label={<span style={{ fontFamily: 'Pretendard-600' }}>목표</span>}
            rules={[{ required: true, message: '목표를 선택해주세요' }]}
          >
            <Select onChange={handleGoalChange} placeholder="목표를 선택해주세요" style={{ borderRadius: '8px' }}>
              <Option value="diet">다이어트</Option>
              <Option value="bulk">벌크업</Option>
              <Option value="bodyprofile">바디프로필</Option>
              <Option value="diabetes">혈당관리</Option>
              <Option value="fitness">체력증진</Option>
              <Option value="customGoal">기타</Option>
            </Select>
          </Form.Item>

          {showCustomGoal && (
            <Form.Item
              name="customGoalText"
              label={<span style={{ fontFamily: 'Pretendard-600' }}>목표 직접 입력</span>}
              rules={[{ required: true, message: '목표를 입력해주세요' }]}
            >
              <Input placeholder="목표를 입력해주세요" style={{ borderRadius: '8px' }} />
            </Form.Item>
          )}

          <Form.Item style={{ marginTop: '30px' }}>
            <Button
              type="primary"
              htmlType="submit"
              block // 버튼 너비를 100%로 설정
              loading={loading}
              disabled={loading}
              style={{ 
                height: '50px', 
                borderRadius: '8px', 
                backgroundColor: loading ? '#d9d9d9' : '#5FDD9D', // FoodList의 메인 컬러 사용
                borderColor: loading ? '#d9d9d9' : '#5FDD9D',
                boxShadow: loading ? 'none' : '0 2px 6px rgba(95, 221, 157, 0.4)'
              }}
            >
              {loading ? (
                <>
                  <Spin size="small" style={{ marginRight: '8px' }} />
                  <span style={{ fontFamily: 'Pretendard-500', fontSize: '16px' }}>
                    설정 저장 중...
                  </span>
                </>
              ) : (
                <span style={{ fontFamily: 'Pretendard-700', fontSize: '16px', letterSpacing: '1px' }}>
                  설정 완료
                </span>
              )}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Intro;