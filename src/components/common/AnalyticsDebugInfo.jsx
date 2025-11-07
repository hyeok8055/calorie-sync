import React, { useEffect, useState } from 'react';
import { Card, Typography, Tag } from 'antd';
import { analytics } from '../../firebaseconfig';

const { Text, Title } = Typography;

/**
 * Analytics 상태를 확인하는 개발용 컴포넌트
 * 개발 환경에서만 사용하세요
 */
const AnalyticsDebugInfo = () => {
  const [isAnalyticsEnabled, setIsAnalyticsEnabled] = useState(false);

  useEffect(() => {
    if (analytics) {
      setIsAnalyticsEnabled(true);
    }
  }, []);

  // 프로덕션 환경에서는 렌더링하지 않음
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <Card 
      size="small" 
      style={{ 
        position: 'fixed', 
        bottom: 10, 
        right: 10, 
        width: 250,
        zIndex: 9999,
        opacity: 0.9
      }}
    >
      <Title level={5} style={{ margin: 0, marginBottom: 8 }}>
        Analytics 상태
      </Title>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div>
          <Text strong>Firebase Analytics: </Text>
          {isAnalyticsEnabled ? (
            <Tag color="success">활성화됨</Tag>
          ) : (
            <Tag color="error">비활성화됨</Tag>
          )}
        </div>
        {isAnalyticsEnabled && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            콘솔에서 이벤트 로그를 확인하세요
          </Text>
        )}
      </div>
    </Card>
  );
};

export default AnalyticsDebugInfo;
