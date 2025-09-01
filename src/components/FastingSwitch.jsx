import React from 'react';
import { Typography, Switch } from 'antd';

const { Text } = Typography;

// 단식 스위치 컴포넌트
const FastingSwitch = ({ isFasting, onChange, disabled }) => {
  return (
    <div 
      className={`w-full rounded-xl p-4 ${disabled ? 'opacity-60' : ''}`}
      style={{
        height: '91px',
        fontFamily: 'Pretendard-600',
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        background: isFasting ? '#fff2f0' : 'white',
        borderColor: isFasting ? '#ff7875' : '#e8e8e8',
        borderWidth: isFasting ? '2px' : '1px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      <Text 
        style={{ 
          fontSize: '17px', 
          fontFamily: 'Pretendard-500',
          color: isFasting ? '#ff7875' : '#999',
          margin: 0,
          marginBottom: '2px'
        }}
      >
        단식
      </Text>
      <Switch 
        checked={isFasting}
        onChange={onChange}
        disabled={disabled}
        style={{
          backgroundColor: isFasting ? '#ff7875' : undefined
        }}
      />
    </div>
  );
};

export default FastingSwitch;