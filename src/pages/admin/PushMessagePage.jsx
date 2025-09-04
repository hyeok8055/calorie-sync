import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Space, message, Input, Divider, Row, Col } from 'antd';
import { BellOutlined, CoffeeOutlined, SunOutlined, MoonOutlined, MessageOutlined } from '@ant-design/icons';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';

const { Title, Text, Paragraph } = Typography;

// 관리자 접근 가능한 이메일 목록
const ADMIN_EMAILS = [
  'eodud653923@gmail.com',
  'youngwonhahn00@gmail.com',
  'juhyeok0123@gmail.com',
  'wn990123@gmail.com',
  'garcia29845@gmail.com',
  'yunj29845@gmail.com',
];

const PushMessagePage = () => {
  const [loading, setLoading] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customBody, setCustomBody] = useState('');
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const isMobile = useMediaQuery({ maxWidth: 768 });

  // 관리자 권한 확인
  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  // Firebase Functions 초기화
  const functions = getFunctions();
  const sendBreakfastNotification = httpsCallable(functions, 'sendBreakfastNotification');
  const sendLunchNotification = httpsCallable(functions, 'sendLunchNotification');
  const sendDinnerNotification = httpsCallable(functions, 'sendDinnerNotification');
  const sendCustomNotification = httpsCallable(functions, 'sendCustomNotification');

  // 권한이 없는 경우 리다이렉트
  useEffect(() => {
    if (!isAdmin) {
      message.error('관리자 권한이 필요합니다.');
      navigate('/');
    }
  }, [isAdmin, navigate]);

  // 알림 발송 핸들러
  const handleSendNotification = async (type, title = '', body = '') => {
    setLoading(true);
    try {
      let result;
      switch (type) {
        case 'breakfast':
          result = await sendBreakfastNotification({ title, body });
          break;
        case 'lunch':
          result = await sendLunchNotification({ title, body });
          break;
        case 'dinner':
          result = await sendDinnerNotification({ title, body });
          break;
        case 'custom':
          if (!customTitle || !customBody) {
            message.error('제목과 내용을 모두 입력해주세요.');
            setLoading(false);
            return;
          }
          result = await sendCustomNotification({ title: customTitle, body: customBody });
          break;
        default:
          throw new Error('알 수 없는 알림 타입');
      }

      message.success(`${type === 'custom' ? '커스텀' : type} 알림이 성공적으로 발송되었습니다!`);
      console.log('알림 발송 결과:', result.data);

      // 커스텀 입력 초기화
      if (type === 'custom') {
        setCustomTitle('');
        setCustomBody('');
      }

    } catch (error) {
      console.error('알림 발송 실패:', error);
      message.error(`알림 발송 실패: ${error.message || '알 수 없는 오류'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div style={{
      padding: isMobile ? '4px' : '8px',
      maxWidth: '1200px',
      margin: '0 auto',
      minHeight: '100vh',
      background: '#f5f5f5'
    }}>
      {/* 헤더 섹션 */}
      <Card
        style={{
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          marginBottom: '12px'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <Title level={3} style={{ margin: 0, color: '#262626' }}>
            📢 푸시 메시지 관리
          </Title>
        </div>
      </Card>

      {/* 메인 컨텐츠 */}
      <Card
        style={{
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 안내 메시지 */}
          <div>
            <p><strong>식사 알림:</strong> 기본 메시지로 즉시 발송</p>
            <p><strong>커스텀 메시지:</strong> 직접 제목과 내용을 입력하여 발송</p>
          </div>

          <Divider style={{ margin: "0" }}/>

          {/* 식사 알림 버튼들 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Button
                type="primary"
                size="large"
                icon={<CoffeeOutlined />}
                onClick={() => handleSendNotification('breakfast')}
                loading={loading}
                style={{
                  width: '100%',
                  height: '60px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #ffa726 0%, #fb8c00 100%)',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(255, 167, 38, 0.3)'
                }}
              >
                아침 알림 발송
              </Button>
            </Col>
            <Col xs={24} sm={8}>
              <Button
                type="primary"
                size="large"
                icon={<SunOutlined />}
                onClick={() => handleSendNotification('lunch')}
                loading={loading}
                style={{
                  width: '100%',
                  height: '60px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #42a5f5 0%, #1976d2 100%)',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(66, 165, 245, 0.3)'
                }}
              >
                점심 알림 발송
              </Button>
            </Col>
            <Col xs={24} sm={8}>
              <Button
                type="primary"
                size="large"
                icon={<MoonOutlined />}
                onClick={() => handleSendNotification('dinner')}
                loading={loading}
                style={{
                  width: '100%',
                  height: '60px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #7b1fa2 0%, #4a148c 100%)',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(123, 31, 162, 0.3)'
                }}
              >
                저녁 알림 발송
              </Button>
            </Col>
          </Row>

          <Divider style={{ margin: "0" }}/>

          {/* 커스텀 메시지 섹션 */}
          <div>
            <Title level={4} style={{ marginBottom: '16px' }}>커스텀 메시지 발송</Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input
                placeholder="알림 제목을 입력하세요"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                style={{ marginBottom: '12px' }}
              />
              <Input.TextArea
                placeholder="알림 내용을 입력하세요"
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                rows={4}
                style={{ marginBottom: '12px' }}
              />
              <Button
                type="primary"
                size="large"
                icon={<MessageOutlined />}
                onClick={() => handleSendNotification('custom')}
                loading={loading}
                style={{
                  width: '100%',
                  height: '50px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(82, 196, 26, 0.3)'
                }}
              >
                커스텀 메시지 발송
              </Button>
            </Space>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default PushMessagePage;
