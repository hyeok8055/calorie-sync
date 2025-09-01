import React, { useEffect, useState } from 'react';
import { Typography, Row, Col, Card } from 'antd';
import { useNavigate } from 'react-router-dom';
import 'dayjs/locale/ko';
import { useSelector, useDispatch } from 'react-redux';
import { useFood } from '@/hook/useFood';
import { useModal } from '@/hook/useModal';
import { useSurvey } from '@/hook/useSurvey';
import { setMealFlags, updateMealFlag } from '@/redux/actions/mealActions';
import { getMealFlags, updateMealFlag as updateMealFlagAPI } from '@/api/api';
import SurveyModal from '@/components/common/SurveyModal';
import MealButton from '@/components/MealButton';
import FastingSwitch from '@/components/FastingSwitch';
import { CoffeeOutlined, FireOutlined, HistoryOutlined, FormOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

const Main = () => {
  const dispatch = useDispatch();
  const uid = useSelector((state) => state.auth.user?.uid);
  const mealFlags = useSelector((state) => state.meal.mealFlags);
  const { foodData, loading, error } = useFood(uid);
  const { surveyState, checkGlobalSurveyStatus, checkUserSurveyCompletion } = useSurvey();
  const [timeRestrictions, setTimeRestrictions] = useState({
    breakfast: false,
    lunch: false,
    dinner: false,
    snack: false,
  });
  const [currentTimeCategory, setCurrentTimeCategory] = useState('');
  const [surveyModalVisible, setSurveyModalVisible] = useState(false);
  const [showSurveyNotification, setShowSurveyNotification] = useState(false);
  const navigate = useNavigate();

  const { showModal, showAutoModal, isModalAvailable, isAutoModalAvailable } = useModal();

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

  // 설문조사 상태 확인 및 알림 표시
  useEffect(() => {
    const checkSurveyStatus = async () => {
      if (uid) {
        try {
          // 전역 설문조사 상태 확인
          const globalStatus = await checkGlobalSurveyStatus();
          
          if (globalStatus && globalStatus.isActive) {
            // 사용자의 설문조사 완료 여부 확인
            const userCompletion = await checkUserSurveyCompletion(uid, globalStatus.surveyId);
            
            // 설문조사가 활성화되어 있고 사용자가 아직 완료하지 않은 경우 알림 표시
            const shouldShow = !userCompletion;
            setShowSurveyNotification(shouldShow);
          } else {
            setShowSurveyNotification(false);
          }
        } catch (error) {
          console.error('설문조사 상태 확인 실패:', error);
          setShowSurveyNotification(false);
        }
      }
    };

    checkSurveyStatus();
    
    // 5분마다 설문조사 상태 재확인
    const interval = setInterval(checkSurveyStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [uid, checkGlobalSurveyStatus, checkUserSurveyCompletion]);

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
      // Redux 상태가 이미 업데이트된 경우 덮어쓰지 않도록 조건부 업데이트
      const updatedFlags = {
        breakfast: foodData.breakfast?.flag !== undefined ? foodData.breakfast.flag : mealFlags.breakfast || 0,
        lunch: foodData.lunch?.flag !== undefined ? foodData.lunch.flag : mealFlags.lunch || 0,
        dinner: foodData.dinner?.flag !== undefined ? foodData.dinner.flag : mealFlags.dinner || 0,
        snack: 0, // 간식은 언제든지 기록 가능하도록 항상 0으로 설정
      };
      
      // 현재 Redux 상태와 다른 경우에만 업데이트
      const hasChanges = Object.keys(updatedFlags).some(
        key => updatedFlags[key] !== mealFlags[key]
      );
      
      if (hasChanges) {
        dispatch(setMealFlags(updatedFlags));
      }
    }
  }, [foodData, dispatch]); // mealFlags를 의존성에서 제거하여 무한 루프 방지

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
            {showSurveyNotification && (
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
            )}
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

      {/* 설문조사 알림 */}
      {showSurveyNotification && (
        <Card 
          bordered={false} 
          style={{ 
            borderRadius: '16px', 
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
          }}
          onClick={() => setSurveyModalVisible(true)}
          className="cursor-pointer hover:shadow-lg transition-all duration-300"
        >
          <Row justify="space-between" align="middle">
            <div style={{ color: 'white' }}>
              <Text style={{ fontSize: '18px', fontWeight: '700', color: 'white', fontFamily: 'Pretendard-700' }}>
                📋 설문조사 참여 요청
              </Text>
              <br />
              <Text style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)', fontFamily: 'Pretendard-500' }}>
                점심 식사 관련 설문조사에 참여해주세요!
              </Text>
            </div>
            <div style={{ 
              background: 'rgba(255,255,255,0.2)', 
              borderRadius: '50%', 
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FormOutlined style={{ fontSize: '24px', color: 'white' }} />
            </div>
          </Row>
        </Card>
      )}

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



export default Main;