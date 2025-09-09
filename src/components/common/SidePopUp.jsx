import React, { useState, useEffect } from 'react';
import { Typography, Select } from 'antd';
import { Popup, Space, Button, Avatar, Form, Input, Radio, Toast, List } from 'antd-mobile';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseconfig';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useSurvey } from '../../hook/useSurvey';
import {
  UserOutline,
  EditSOutline,
  CheckCircleOutline,
  CloseCircleOutline,
  UndoOutline,
  AppstoreOutline,
  LoopOutline,
  } from 'antd-mobile-icons';
import { AppstoreOutlined } from '@ant-design/icons';

const { Text } = Typography;

// 관리자 접근 가능한 이메일 목록
const ADMIN_EMAILS = [
  'eodud653923@gmail.com',
  'youngwonhahn00@gmail.com',
  'juhyeok0123@gmail.com',
  'wn990123@gmail.com',
  'garcia29845@gmail.com',
  'yunj29845@gmail.com',
];

const SidePopUp = ({ visible, onClose, onLogout, userName, email }) => {
  const [userInfo, setUserInfo] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [surveyStatus, setSurveyStatus] = useState({ isActive: false, surveyId: null });
  const userEmail = useSelector((state) => state.auth.user?.email);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { activateSurvey, deactivateSurvey, checkGlobalSurveyStatus, loading: surveyLoading } = useSurvey();

  // 사용자 정보 및 설문조사 상태 불러오기
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (userEmail) {
        const userDoc = await getDoc(doc(db, "users", userEmail));
        if (userDoc.exists()) {
          setUserInfo(userDoc.data());
          form.setFieldsValue(userDoc.data());
        }
      }
    };

    const fetchSurveyStatus = async () => {
      try {
        const status = await checkGlobalSurveyStatus();
        setSurveyStatus(status || { isActive: false, surveyId: null });
      } catch (error) {
        console.error('설문조사 상태 확인 실패:', error);
        setSurveyStatus({ isActive: false, surveyId: null });
      }
    };

    if (visible) {
      fetchUserInfo();
      fetchSurveyStatus();
    }
  }, [userEmail, visible, checkGlobalSurveyStatus]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async (values) => {
    try {
      const userRef = doc(db, "users", userEmail);
      // 목표값이 '기타'일 경우 customGoalText 사용
      const finalValues = {
        ...values,
        goal: values.goal === 'customGoal' ? values.customGoalText : values.goal,
      };
      // customGoalText 필드는 저장하지 않음 (이미 goal에 반영됨)
      if (finalValues.customGoalText) {
        delete finalValues.customGoalText;
      }

      await updateDoc(userRef, finalValues);
      setUserInfo(finalValues); // 업데이트된 정보로 상태 변경
      setIsEditing(false);
      Toast.show({
        icon: <CheckCircleOutline />,
        content: '정보가 저장되었습니다.',
      });
    } catch (error) {
      console.error("정보 업데이트 실패:", error);
      Toast.show({
        icon: <CloseCircleOutline />,
        content: '정보 저장에 실패했습니다.',
      });
    }
  };

  const refreshApp = () => {
    Toast.show({
      content: '새로고침 중...',
      duration: 1000,
    });

    setTimeout(() => {
      window.location.reload(true);
    }, 500);
  };

  const handleAdminPageClick = () => {
    navigate('/admin');
    onClose();
  };

  const handleSurveyToggle = async () => {
    try {
      let result;
      if (surveyStatus.isActive) {
        // 설문조사 비활성화
        result = await deactivateSurvey();
        if (result.success) {
          setSurveyStatus({ isActive: false, surveyId: null });
          Toast.show({
            icon: <CheckCircleOutline />,
            content: '설문조사가 종료되었습니다.',
            duration: 3000
          });
        } else {
          Toast.show({
            icon: <CloseCircleOutline />,
            content: '설문조사 종료에 실패했습니다.',
            duration: 3000
          });
        }
      } else {
        // 설문조사 활성화
        result = await activateSurvey();
        if (result.success) {
          setSurveyStatus({ isActive: true, surveyId: result.surveyId });
          Toast.show({
            icon: <CheckCircleOutline />,
            content: '설문조사가 활성화되었습니다. 모든 사용자에게 알림이 전송됩니다.',
            duration: 3000
          });
        } else {
          Toast.show({
            icon: <CloseCircleOutline />,
            content: '설문조사 활성화에 실패했습니다.',
            duration: 3000
          });
        }
      }
    } catch (error) {
      console.error('설문조사 상태 변경 오류:', error);
      Toast.show({
        icon: <CloseCircleOutline />,
        content: '오류가 발생했습니다.',
        duration: 3000
      });
    }
  };

  // 관리자 이메일인지 확인
  const isAdmin = ADMIN_EMAILS.includes(email);

  // 목표 텍스트 변환 함수
  const getGoalText = (goal) => {
    switch (goal) {
      case 'diet': return '다이어트';
      case 'bulk': return '벌크업';
      case 'bodyprofile': return '바디프로필';
      case 'diabetes': return '혈당관리';
      case 'fitness': return '체력증진';
      default: return goal; // '기타' 또는 직접 입력된 텍스트
    }
  };

  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      position='right'
      bodyStyle={{ width: '75vw', maxWidth: '300px', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8f9fa' }}
    >
      {/* 상단 영역 */}
      <div
        style={{
          background: 'linear-gradient(to bottom, #a6f0c6, #79e2a8)',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Avatar icon={<UserOutline />} size={64} style={{ backgroundColor: '#5FDD9D', '--size': '64px' }} />
        <Space direction='vertical' align='center' style={{ '--gap': '4px' }}>
          <Text style={{ fontSize: '18px', fontWeight: '600', color: '#333', fontFamily: 'Pretendard-600' }}>{userName}</Text>
          <Text style={{ fontSize: '13px', fontWeight: '400', color: '#555', fontFamily: 'Pretendard-400' }}>{email}</Text>
        </Space>
      </div>

      {/* 사용자 정보 영역 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!isEditing ? (
          // 정보 표시 모드 (List 사용)
          <List header={<div style={{ fontFamily: 'Pretendard-700', fontSize: '16px', padding: '12px 16px', color: '#333' }}>프로필 정보</div>} style={{ '--border-top': 'none', '--border-bottom': 'none', background: 'transparent' }}>
            <List.Item extra={`${userInfo?.height || '-'} cm`}><Text style={{ fontFamily: 'Pretendard-500' }}>키</Text></List.Item>
            <List.Item extra={userInfo?.gender === 'male' ? '남성' : userInfo?.gender === 'female' ? '여성' : '-'}><Text style={{ fontFamily: 'Pretendard-500' }}>성별</Text></List.Item>
            <List.Item extra={`${userInfo?.age || '-'} 세`}><Text style={{ fontFamily: 'Pretendard-500' }}>나이</Text></List.Item>
            <List.Item extra={getGoalText(userInfo?.goal) || '-'}><Text style={{ fontFamily: 'Pretendard-500' }}>목표</Text></List.Item>

            {/* 버튼 영역 */}
            <div style={{ padding: '16px', marginTop: '16px' }}>
              <Button block color='primary' fill='solid' shape='rounded' onClick={handleEdit} style={{ marginBottom: '12px', '--background-color': '#5FDD9D', '--border-color': '#5FDD9D' }}>
                <Space align='center'><EditSOutline /><span style={{ fontFamily: 'Pretendard-600' }}>정보 수정</span></Space>
              </Button>
              <Button block fill='outline' shape='rounded' onClick={refreshApp} style={{ marginBottom: '12px' }}>
                 <Space align='center'><LoopOutline /><span style={{ fontFamily: 'Pretendard-600' }}>새로고침</span></Space>
              </Button>
              
              {isAdmin && (
                <>
                  {/* 관리자 메뉴 섹션 */}
                  <div style={{ 
                    background: '#f0f8ff', 
                    borderRadius: '8px', 
                    padding: '2px', 
                    marginBottom: '12px',
                    border: '1px solid #e6f7ff'
                  }}>
                    <Text style={{ 
                      fontFamily: 'Pretendard-700', 
                      fontSize: '14px', 
                      color: '#1890ff',
                      display: 'block',
                      marginBottom: '4px',
                      textAlign: 'center'
                    }}>
                      🔧 관리자 메뉴
                    </Text>
                    
                    {/* 관리자 버튼들을 2열 그리드로 배치 */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '8px',
                      marginBottom: '8px'
                    }}>
                      <Button 
                        fill='outline' 
                        shape='box' 
                        color='success' 
                        size='small'
                        onClick={handleAdminPageClick}
                        style={{ 
                          fontSize: '11px',
                          padding: '8px 4px',
                          height: 'auto',
                          '--border-color': '#52c41a'
                        }}
                      >
                        <Space direction='vertical' align='center' style={{ '--gap': '2px', padding: '15px 0 15px 0'  }}>
                          <span style={{ fontFamily: 'Pretendard-600', lineHeight: '1.2', fontSize: '16px' }}>음식 데이터 관리</span>
                        </Space>
                      </Button>
                      
                      <Button 
                        fill='outline' 
                        shape='box' 
                        color='primary' 
                        size='small'
                        onClick={() => {
                          navigate('/calorie-admin');
                          onClose();
                        }}
                        style={{ 
                          fontSize: '11px',
                          padding: '8px 4px',
                          height: 'auto',
                          '--border-color': '#1890ff'
                        }}
                      >
                        <Space direction='vertical' align='center' style={{ '--gap': '2px', padding: '15px 0 15px 0'  }}>
                          <span style={{ fontFamily: 'Pretendard-600', lineHeight: '1.2', fontSize : '16px' }}>칼로리 편차 관리</span>
                        </Space>
                      </Button>
                      
                      <Button 
                        fill='outline' 
                        shape='box' 
                        color={surveyStatus.isActive ? 'danger' : 'warning'}
                        size='small'
                        onClick={handleSurveyToggle}
                        loading={surveyLoading}
                        style={{ 
                          fontSize: '11px',
                          padding: '8px 4px',
                          height: 'auto'
                        }}
                      >
                        <Space direction='vertical' align='center' style={{ '--gap': '2px', padding: '15px 0 15px 0' }}>
                          <span style={{ fontFamily: 'Pretendard-600', lineHeight: '1.2', fontSize : '16px' }}>
                            {surveyStatus.isActive ? '설문조사 종료' : '설문조사 실행'}
                          </span>
                        </Space>
                      </Button>
                      
                      <Button 
                        fill='outline' 
                        shape='box' 
                        color='primary'
                        size='small'
                        onClick={() => {
                          navigate('/admin/data-export');
                          onClose();
                        }}
                        style={{ 
                          fontSize: '11px',
                          padding: '8px 4px',
                          height: 'auto',
                          '--border-color': '#1890ff'
                        }}
                      >
                        <Space direction='vertical' align='center' style={{ '--gap': '2px', padding: '15px 0 15px 0' }}>
                          <span style={{ fontFamily: 'Pretendard-600', lineHeight: '1.2', fontSize : '16px'}}>데이터 내보내기</span>
                        </Space>
                      </Button>
                      
                      <Button 
                        fill='outline' 
                        shape='box' 
                        color='success'
                        size='small'
                        onClick={() => {
                          navigate('/survey-results');
                          onClose();
                        }}
                        style={{ 
                          fontSize: '11px',
                          padding: '8px 4px',
                          height: 'auto',
                          '--border-color': '#52c41a'
                        }}
                      >
                        <Space direction='vertical' align='center' style={{ '--gap': '2px', padding: '15px 0 15px 0' }}>
                          <span style={{ fontFamily: 'Pretendard-600', lineHeight: '1.2', fontSize : '16px'}}>설문조사 결과</span>
                        </Space>
                      </Button>
                      {/* 수동 메시지 발송*/}
                      <Button 
                        block 
                        fill='outline' 
                        shape='box' 
                        color='warning'
                        onClick={() => {
                          navigate('/push-message');
                          onClose();
                        }}
                        style={{ 
                          fontSize: '12px',
                          '--border-color': '#faad14'
                        }}
                      >
                        <Space flexDirection='column' align='center' style={{margin: '10px 0'}}>
                          <span style={{ fontFamily: 'Pretendard-600', fontSize : "16px" }}>수동 메시지 발송</span>
                        </Space>
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </List>
        ) : (
          // 정보 수정 모드
          <Form
            form={form}
            onFinish={handleSave}
            layout='vertical'
            initialValues={{ ...userInfo, customGoalText: userInfo?.goal && !['diet', 'bulk', 'bodyprofile', 'diabetes', 'fitness'].includes(userInfo.goal) ? userInfo.goal : undefined, goal: userInfo?.goal && !['diet', 'bulk', 'bodyprofile', 'diabetes', 'fitness'].includes(userInfo.goal) ? 'customGoal' : userInfo?.goal }}
            style={{ padding: '16px', background: '#fff', margin: '16px', borderRadius: '8px' }}
            footer={
              <Space direction='vertical' block style={{ '--gap': '12px' }}>
                <Button block type='submit' color='primary' shape='rounded' style={{ '--background-color': '#5FDD9D', '--border-color': '#5FDD9D' }}>
                   <Space align='center'><CheckCircleOutline /><span style={{ fontFamily: 'Pretendard-600' }}>저장</span></Space>
                </Button>
                <Button block onClick={() => setIsEditing(false)} shape='rounded' fill='outline'>
                   <Space align='center'><CloseCircleOutline /><span style={{ fontFamily: 'Pretendard-600' }}>취소</span></Space>
                </Button>
              </Space>
            }
          >
            <Form.Item
              name="height"
              label={<Text style={{ fontFamily: 'Pretendard-600' }}>키 (cm)</Text>}
              rules={[{ required: true, message: '키를 입력해주세요' }]}
            >
              <Input type="number" placeholder="예) 175" />
            </Form.Item>

            <Form.Item
              name="gender"
              label={<Text style={{ fontFamily: 'Pretendard-600' }}>성별</Text>}
              rules={[{ required: true, message: '성별을 선택해주세요' }]}
            >
              <Radio.Group>
                <Radio value="male"><span style={{ fontFamily: 'Pretendard-500' }}>남성</span></Radio>
                <Radio value="female" style={{ marginLeft: '16px' }}><span style={{ fontFamily: 'Pretendard-500' }}>여성</span></Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="age"
              label={<Text style={{ fontFamily: 'Pretendard-600' }}>나이</Text>}
              rules={[{ required: true, message: '나이를 입력해주세요' }]}
            >
              <Input type="number" placeholder="예) 25" />
            </Form.Item>

            <Form.Item
              name="goal"
              label={<Text style={{ fontFamily: 'Pretendard-600' }}>목표</Text>}
              rules={[{ required: true, message: '목표를 선택해주세요' }]}
            >
              <Select
                placeholder="목표를 선택해주세요"
                style={{ width: '100%' }}
                onChange={(value) => form.setFieldValue('goal', value)}
                options={[
                  { value: 'diet', label: <span style={{ fontFamily: 'Pretendard-500' }}>다이어트</span> },
                  { value: 'bulk', label: <span style={{ fontFamily: 'Pretendard-500' }}>벌크업</span> },
                  { value: 'bodyprofile', label: <span style={{ fontFamily: 'Pretendard-500' }}>바디프로필</span> },
                  { value: 'diabetes', label: <span style={{ fontFamily: 'Pretendard-500' }}>혈당관리</span> },
                  { value: 'fitness', label: <span style={{ fontFamily: 'Pretendard-500' }}>체력증진</span> },
                  { value: 'customGoal', label: <span style={{ fontFamily: 'Pretendard-500' }}>기타</span> }
                ]}
              />
            </Form.Item>

            {form.getFieldValue('goal') === 'customGoal' && (
              <Form.Item
                name="customGoalText"
                label={<Text style={{ fontFamily: 'Pretendard-600' }}>목표 직접 입력</Text>}
                rules={[{ required: true, message: '기타 목표를 입력해주세요' }]}
              >
                <Input placeholder="달성하고 싶은 목표를 입력하세요" />
              </Form.Item>
            )}
          </Form>
        )}
      </div>

      {/* 하단 로그아웃 버튼 영역 */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid #eee',
          background: '#f8f9fa'
        }}
      >
        <Button block onClick={onLogout} color='danger' fill='outline' shape='rounded'>
          <Space align='center'><span style={{ fontFamily: 'Pretendard-600' }}>로그아웃</span></Space>
        </Button>
      </div>
    </Popup>
  );
};

export default SidePopUp;
