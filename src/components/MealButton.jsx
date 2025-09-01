import React from 'react';
import { Button, Typography } from 'antd';
import { CheckCircleTwoTone, ClockCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

// 식사 버튼 컴포넌트
const MealButton = ({ 
  title, 
  icon, 
  time, 
  onClick, 
  disabled, 
  isCompleted, 
  isFasting = false,
  timeRestricted, 
  restrictionMessage,
  accent = false
}) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl p-0 relative ${disabled ? 'opacity-60' : ''}`}
      style={{ 
        height: '91px', 
        textAlign: 'left', 
        fontFamily: 'Pretendard-600', 
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        background: accent ? '#f0fff7' : 'white',
        borderColor: accent ? '#5FDD9D' : '#e8e8e8',
        padding: '16px',
        overflow: 'hidden'
      }}
    >
      {isFasting ? (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          height: '100%'
        }}>
          <Text style={{ 
            fontSize: '20px',
            fontWeight: '600',
            fontFamily: 'Pretendard-600',
            color: '#ff7875',
            textAlign: 'center'
          }}>
            {title.includes('아침') ? '아침 단식' : 
             title.includes('점심') ? '점심 단식' : 
             title.includes('저녁') ? '저녁 단식' : '단식 중'}
          </Text>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '8px',
              color: isCompleted ? '#5FDD9D' : '#333'
            }}>
              {icon}
              <Text style={{ 
                marginLeft: '8px', 
                fontSize: '18px', 
                fontWeight: '600', 
                fontFamily: 'Pretendard-600',
                color: isCompleted ? '#5FDD9D' : '#333'
              }}>
                {title}
              </Text>
            </div>
            <Text style={{ 
              fontSize: '14px', 
              color: '#888', 
              fontFamily: 'Pretendard-500'
            }}>
              {time}
            </Text>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {isCompleted && (
              <CheckCircleTwoTone
                twoToneColor="#5FDD9D"
                style={{ fontSize: 24 }}
              />
            )}
          </div>
        </div>
      )}
      {timeRestricted && (
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'rgba(255,255,255,0.9)', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center',
          borderRadius: '12px'
        }}>
          <div style={{
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            borderRadius: '12px'
          }}>
            <Text style={{ fontSize: '16px', color: '#ff4d4f', fontFamily: 'Pretendard-500', textAlign: 'center', marginBottom: '6.5px', marginRight: '8px' }}>식사 미기록</Text>
            <ClockCircleOutlined style={{ fontSize: 24, color: '#ff4d4f', marginBottom: '8px' }} />
          </div>
          <Text style={{ fontSize: '14px', color: '#ff4d4f', fontFamily: 'Pretendard-500', textAlign: 'center' }}>
            {restrictionMessage}
          </Text>
        </div>
      )}
    </Button>
  );
};

export default MealButton;