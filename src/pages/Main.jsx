import React, { useEffect, useState } from 'react';
import { Typography, Row, Col, Button, Card, Radio, Switch } from 'antd';
import { useNavigate } from 'react-router-dom';
import 'dayjs/locale/ko';
import { useSelector, useDispatch } from 'react-redux';
import { useFood } from '@/hook/useFood';
import { useModal } from '@/hook/useModal';
import { setMealFlags, updateMealFlag } from '@/redux/actions/mealActions';
import { getMealFlags, updateMealFlag as updateMealFlagAPI } from '@/api/api';
import SurveyModal from '../components/common/SurveyModal';
import { 
  CheckCircleTwoTone, 
  ClockCircleOutlined, 
  CoffeeOutlined, 
  FireOutlined,
  HistoryOutlined,
  MinusCircleOutlined,
  FormOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;


const Main = () => {
  const dispatch = useDispatch();
  const uid = useSelector((state) => state.auth.user?.uid);
  const mealFlags = useSelector((state) => state.meal.mealFlags);
  const { foodData, loading, error } = useFood(uid);
  const [timeRestrictions, setTimeRestrictions] = useState({
    breakfast: false,
    lunch: false,
    dinner: false,
    snack: false,
  });
  const [currentTimeCategory, setCurrentTimeCategory] = useState('');
  const [surveyModalVisible, setSurveyModalVisible] = useState(false);
  const navigate = useNavigate();

  const { showModal, showAutoModal, isModalAvailable, isAutoModalAvailable } = useModal(foodData);

  // 자동 모달 표시를 위한 useEffect 추가
  useEffect(() => {
    if (foodData && isAutoModalAvailable) {
      // 페이지 로드 후 1초 뒤에 자동 모달 표시
      const timer = setTimeout(() => {
        showAutoModal();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [foodData, isAutoModalAvailable, showAutoModal]);

  // Firestore에서 meal flag 데이터 가져오기
  useEffect(() => {
    const loadMealFlags = async () => {
      if (uid) {
        try {
          const flags = await getMealFlags(uid);
          dispatch(setMealFlags(flags));
        } catch (error) {
          console.error('Meal flags 로드 실패:', error);
        }
      }
    };
    
    loadMealFlags();
  }, [uid, dispatch]);

  useEffect(() => {
    if (foodData) {
      // foodData에서 식사 완료 상태 확인하여 Redux 상태 업데이트
      const updatedFlags = {
        breakfast: foodData.breakfast?.flag || mealFlags.breakfast || 0,
        lunch: foodData.lunch?.flag || mealFlags.lunch || 0,
        dinner: foodData.dinner?.flag || mealFlags.dinner || 0,
        snack: 0, // 간식은 언제든지 기록 가능하도록 항상 0으로 설정
      };
      dispatch(setMealFlags(updatedFlags));
    }
  }, [foodData, dispatch]);

  // 시간 제한 확인을 위한 useEffect
  useEffect(() => {
    const checkTimeRestrictions = () => {
      const currentHour = new Date().getHours(); // 24시간 형식 (0-23)
      
      // 시간 제한 로직 (24시간 형식 기준)
      // 아침식사: 06시부터 11시59분까지 기록 가능
      // 점심식사: 12시부터 17시59분까지 기록 가능
      // 저녁식사: 18시부터 23시59분까지 기록 가능
      
      // 현재 시간대 카테고리 설정
      if (currentHour >= 6 && currentHour < 12) {
        setCurrentTimeCategory('아침');
      } else if (currentHour >= 12 && currentHour < 18) {
        setCurrentTimeCategory('점심');
      } else if (currentHour >= 18) {
        setCurrentTimeCategory('저녁');
      } else {
        setCurrentTimeCategory('새벽');
      }
      
      setTimeRestrictions({
        breakfast: currentHour < 6 || currentHour >= 12, // 6시부터 11시59분까지만 아침식사 가능
        lunch: currentHour < 12 || currentHour >= 18, // 12시부터 17시59분까지만 점심식사 가능
        dinner: currentHour < 18 || currentHour >= 24, // 18시부터 23시59분까지만 저녁식사 가능
        snack: false, // 간식은 제한 없음
      });
    };

    checkTimeRestrictions();
     const intervalId = setInterval(checkTimeRestrictions, 60000); // 1분마다 체크
     
     return () => clearInterval(intervalId);
   }, []);

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

  if (loading) {
    return (
      <div className="h-[100%] flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
          <Text style={{ color: '#666', fontFamily: 'Pretendard-500' }}>데이터를 불러오는 중입니다...</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[100%] flex justify-center items-center">
        <div className="text-center p-6 bg-red-50 rounded-lg">
          <Text style={{ color: 'red', fontFamily: 'Pretendard-600', fontSize: '18px' }}>오류가 발생했습니다</Text>
          <Text style={{ color: '#666', fontFamily: 'Pretendard-500', display: 'block', marginTop: '8px' }}>{error.message}</Text>
        </div>
      </div>
    );
  }

  const handleMealClick = (mealType) => {
    navigate(`/meals/${mealType}`);
  };

  // 단식 스위치 핸들러
  const handleFastingToggle = async (mealType, checked) => {
    const newFlag = checked ? 2 : 0;
    
    // Redux 상태 즉시 업데이트
    dispatch(updateMealFlag(mealType, newFlag));
    
    // Firestore에 저장
    try {
      await updateMealFlagAPI(uid, mealType, newFlag);
    } catch (error) {
      console.error('단식 상태 저장 실패:', error);
      // 실패 시 이전 상태로 롤백
      dispatch(updateMealFlag(mealType, checked ? 0 : 2));
    }
  };

  // 시간 제한 메시지 반환 함수
  const getTimeRestrictionMessage = (mealType) => {
    switch (mealType) {
      case 'breakfast':
        return '06시부터 11시59분까지만 기록 가능';
      case 'lunch':
        return '12시부터 17시59분까지만 기록 가능';
      case 'dinner':
        return '18시부터 23시59분까지만 기록 가능';
      default:
        return '';
    }
  };

  // 오늘의 날짜 포맷팅
  const today = new Date();
  const formattedDate = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).replace(/\.$/, "");
  
  const weekday = today.toLocaleDateString("ko-KR", { weekday: "long" });

  return (
    <div className="h-[100%] bg-bg1 p-4 pb-16 overflow-auto">
      {/* 헤더 섹션 */}
      <Card 
        bordered={false} 
        style={{ 
          borderRadius: '16px', 
          marginBottom: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}
      >
        <Row justify="space-between" align="middle">
          <div>
            <Text style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Pretendard-700'}}>
              {formattedDate} {weekday}
            </Text>
            <br />
            <Text style={{ fontSize: '16px', color: '#666', fontFamily: 'Pretendard-500'}}>
              현재 시간대: {currentTimeCategory}
            </Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              onClick={() => setSurveyModalVisible(true)}
              style={{ 
                cursor: 'pointer',
                padding: '8px',
                background: '#f0f9ff',
                borderRadius: '50%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <FormOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            </div>
            <div 
              onClick={showModal}
              style={{ 
                position: 'relative', 
                cursor: 'pointer',
                padding: '8px',
                background: isModalAvailable ? '#f0fff7' : '#f5f5f5',
                borderRadius: '50%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <HistoryOutlined style={{ fontSize: '24px', color: isModalAvailable ? '#5FDD9D' : '#999' }} />
              {isModalAvailable && (
                <div style={{
                  position: 'absolute',
                  top: '0',
                  right: '0',
                  width: '10px',
                  height: '10px',
                  backgroundColor: '#ff4d4f',
                  borderRadius: '50%'
                }} />
              )}
            </div>
          </div>
        </Row>
      </Card>

      {/* 식사 기록 버튼 섹션 */}
      <Title level={4} style={{ margin: '24px 0 16px 0', fontFamily: 'Pretendard-700', color: '#5FDD9D' }}>
        일일 식사 기록
      </Title>
      
      <Row gutter={[16, 16]} justify="center">
        {/* 아침 식사 */}
        <Col span={24}>
          <Row gutter={[12, 0]} align="middle">
            <Col span={18}>
              <MealButton 
                title="아침 식사 기록"
                icon={<FireOutlined />}
                time="06:00 - 11:59"
                onClick={() => handleMealClick('breakfast')}
                disabled={mealFlags.breakfast === 1 || mealFlags.breakfast === 2 || timeRestrictions.breakfast}
                isCompleted={mealFlags.breakfast === 1}
                isFasting={mealFlags.breakfast === 2}
                timeRestricted={mealFlags.breakfast === 0 && timeRestrictions.breakfast}
                restrictionMessage={getTimeRestrictionMessage('breakfast')}
              />
            </Col>
            <Col span={6}>
              <FastingSwitch 
                isFasting={mealFlags.breakfast === 2}
                onChange={(checked) => handleFastingToggle('breakfast', checked)}
                disabled={mealFlags.breakfast === 1}
              />
            </Col>
          </Row>
        </Col>
        
        {/* 점심 식사 */}
        <Col span={24}>
          <Row gutter={[12, 0]} align="middle">
            <Col span={18}>
              <MealButton 
                title="점심 식사 기록"
                icon={<FireOutlined />}
                time="12:00 - 17:59"
                onClick={() => handleMealClick('lunch')}
                disabled={mealFlags.lunch === 1 || mealFlags.lunch === 2 || timeRestrictions.lunch}
                isCompleted={mealFlags.lunch === 1}
                isFasting={mealFlags.lunch === 2}
                timeRestricted={mealFlags.lunch === 0 && timeRestrictions.lunch}
                restrictionMessage={getTimeRestrictionMessage('lunch')}
              />
            </Col>
            <Col span={6}>
              <FastingSwitch 
                isFasting={mealFlags.lunch === 2}
                onChange={(checked) => handleFastingToggle('lunch', checked)}
                disabled={mealFlags.lunch === 1}
              />
            </Col>
          </Row>
        </Col>
        
        {/* 저녁 식사 */}
        <Col span={24}>
          <Row gutter={[12, 0]} align="middle">
            <Col span={18}>
              <MealButton 
                title="저녁 식사 기록"
                icon={<FireOutlined />}
                time="18:00 - 05:59"
                onClick={() => handleMealClick('dinner')}
                disabled={mealFlags.dinner === 1 || mealFlags.dinner === 2 || timeRestrictions.dinner}
                isCompleted={mealFlags.dinner === 1}
                isFasting={mealFlags.dinner === 2}
                timeRestricted={mealFlags.dinner === 0 && timeRestrictions.dinner}
                restrictionMessage={getTimeRestrictionMessage('dinner')}
              />
            </Col>
            <Col span={6}>
              <FastingSwitch 
                isFasting={mealFlags.dinner === 2}
                onChange={(checked) => handleFastingToggle('dinner', checked)}
                disabled={mealFlags.dinner === 1}
              />
            </Col>
          </Row>
        </Col>
        
        {/* 간식 */}
        <Col span={24}>
          <MealButton 
            title="간식 기록"
            icon={<CoffeeOutlined />}
            time="언제든지 기록 가능"
            onClick={() => handleMealClick('snack')}
            disabled={false}
            isCompleted={false}
            isFasting={false}
            timeRestricted={false}
            accent={false}
          />
        </Col>
      </Row>
      
      {/* 설문조사 모달 */}
      <SurveyModal 
        visible={surveyModalVisible}
        onClose={() => setSurveyModalVisible(false)}
        uid={uid}
      />
    </div>
  );
};

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

export default Main;