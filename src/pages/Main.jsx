import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Typography, Row, Col, Card } from 'antd';
import { message } from 'antd';
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

// 시간 제한 설정 상수
// 요구사항 1: 아침 06:30~10:30, 점심 10:30~16:30, 저녁 16:30~06:29
const TIME_RESTRICTIONS = {
  breakfast: { start: 6.5, end: 10.5, label: '06:30 - 10:30' },
  lunch: { start: 10.5, end: 16.5, label: '10:30 - 16:30' },
  dinner: { start: 16.5, end: 6.4833, label: '16:30 - 06:29' },
  snack: { start: 0, end: 24, label: '언제든지 기록 가능' }
};

// 시간대 카테고리 매핑 (요구사항 1과 동일하게 통일)
const getTimeCategory = (totalMinutes) => {
  // 분 단위 비교: 아침 [06:30, 10:30), 점심 [10:30, 16:30), 저녁 [16:30, 익일 06:29]
  const breakfastStart = 6 * 60 + 30; // 390
  const breakfastEndExclusive = 10 * 60 + 30; // 630 (exclusive)
  const lunchStart = breakfastEndExclusive; // 630
  const lunchEndExclusive = 16 * 60 + 30; // 990 (exclusive)
  const dinnerStart = lunchEndExclusive; // 990
  const dinnerEndInclusive = 6 * 60 + 29; // 389 (inclusive next day)

  if (totalMinutes >= breakfastStart && totalMinutes < breakfastEndExclusive) return '아침';
  if (totalMinutes >= lunchStart && totalMinutes < lunchEndExclusive) return '점심';
  // 나머지는 저녁 시간대
  return '저녁';
};

const Main = () => {
  // 식사 버튼 설정 (메모이제이션)
  const mealButtonConfigs = useMemo(() => [
    {
      type: 'breakfast',
      title: '아침식사',
      icon: <FireOutlined style={{ fontSize: '16px', color: '#ff7875' }} />,
      color: '#ff7875'
    },
    {
      type: 'lunch', 
      title: '점심식사',
      icon: <FireOutlined style={{ fontSize: '16px', color: '#ffa940' }} />,
      color: '#ffa940'
    },
    {
      type: 'dinner',
      title: '저녁식사', 
      icon: <FireOutlined style={{ fontSize: '16px', color: '#597ef7' }} />,
      color: '#597ef7'
    },
    {
      type: 'snack',
      title: '간식',
      icon: <FireOutlined style={{ fontSize: '16px', color: '#73d13d' }} />,
      color: '#73d13d'
    }
  ], []);

  // Redux 상태 및 디스패치
  const dispatch = useDispatch();
  const email = useSelector((state) => state.auth.user?.email);
  const mealFlags = useSelector((state) => state.meal.mealFlags);
  
  // 커스텀 훅들
  const { foodData, loading, error } = useFood(email);
  const { checkGlobalSurveyStatus, checkUserSurveyCompletion } = useSurvey();
  const { showModal, showAutoModal, isModalAvailable, isAutoModalAvailable } = useModal();
  const navigate = useNavigate();
  
  // 로컬 상태
  const [surveyModalVisible, setSurveyModalVisible] = useState(false);
  const [showSurveyNotification, setShowSurveyNotification] = useState(false);
  
  // 현재 시간 정보 (메모이제이션)
  const currentTime = useMemo(() => {
    const now = new Date();
    return {
      hour: now.getHours(),
      minute: now.getMinutes(),
      totalMinutes: now.getHours() * 60 + now.getMinutes(),
      date: now.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).replace(/\.$/, ""),
      weekday: now.toLocaleDateString("ko-KR", { weekday: "long" })
    };
  }, []);

  // 시간 제한 체크 (메모이제이션)
  // 시간 제한을 완전히 해제하려면 아래 주석을 해제하고 기존 코드를 주석 처리하세요
  // const timeRestrictions = useMemo(() => ({
  //   breakfast: false,
  //   lunch: false,
  //   dinner: false,
  //   snack: false,
  // }), []);
  
  const timeRestrictions = useMemo(() => {
    const { totalMinutes } = currentTime;

    // 아침: 06:30 ~ 10:29 (390 ~ 629분)
    const breakfastAllowed = totalMinutes >= 6 * 60 + 30 && totalMinutes <= 10 * 60 + 29;
    // 점심: 10:30 ~ 16:29 (630 ~ 989분)
    const lunchAllowed = totalMinutes >= 10 * 60 + 30 && totalMinutes <= 16 * 60 + 29;
    // 저녁: 16:30 ~ 06:29 (990 ~ 1439 또는 0 ~ 389)
    const dinnerAllowed = totalMinutes >= 16 * 60 + 30 || totalMinutes <= 6 * 60 + 29;

    return {
      breakfast: !breakfastAllowed,
      lunch: !lunchAllowed,
      dinner: !dinnerAllowed,
      snack: false,
    };
  }, [currentTime]);

  // 현재 시간 카테고리 (메모이제이션)
  const currentTimeCategory = useMemo(() => {
    return getTimeCategory(currentTime.totalMinutes);
  }, [currentTime.totalMinutes]);

  // 자동 모달 표시를 위한 useEffect
  useEffect(() => {
    const checkAndShowAutoModal = async () => {
      if (email && isAutoModalAvailable) {
        await showAutoModal();
      }
    };

    checkAndShowAutoModal();
  }, [email, isAutoModalAvailable, showAutoModal]);

  // 설문조사 상태 확인 및 알림 표시
  useEffect(() => {
    const checkSurveyStatus = async () => {
      if (email) {
        try {
          // 전역 설문조사 상태 확인
          const globalStatus = await checkGlobalSurveyStatus();
          
          if (globalStatus && globalStatus.isActive) {
            // 사용자의 설문조사 완료 여부 확인
            const userCompletion = await checkUserSurveyCompletion(email, globalStatus.surveyId);
            
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
  }, [email, checkGlobalSurveyStatus, checkUserSurveyCompletion]);

  // Firestore에서 meal flag 데이터 가져오기
  useEffect(() => {
    const loadMealFlags = async () => {
      if (email) {
        try {
          const flags = await getMealFlags(email);
          dispatch(setMealFlags(flags));
        } catch (error) {
          console.error('Meal flags 로드 실패:', error);
        }
      }
    };
    loadMealFlags();
  }, [email, dispatch]);

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


  const handleMealClick = (mealType) => {
    navigate(`/meals/${mealType}`);
  };

  // 간식이 해당 식사 시간대에 기록되어 있는지 확인하는 함수
  const hasSnackInMealTime = useCallback((mealType) => {
    if (!foodData || !foodData.snacks) return false;
    
    const snacks = foodData.snacks;
    if (!snacks.foods || snacks.foods.length === 0) return false;
    
    // 간식이 해당 식사 시간대에 통합되어 있는지 확인
    const mealData = foodData[mealType];
    if (!mealData || !mealData.foods) return false;
    
    // 간식 데이터가 해당 식사에 포함되어 있는지 확인
    return mealData.foods.some(food => 
      snacks.foods.some(snack => 
        snack.name === food.name && snack.brand === food.brand
      )
    );
  }, [foodData]);

  // 단식 스위치 핸들러 (최적화)
  const handleFastingToggle = useCallback(async (mealType, checked) => {
    // 요구사항 2: 식사 시간대에만 단식 설정 가능
    if (timeRestrictions[mealType]) {
      message.warning(`현재 시간에는 ${mealType === 'breakfast' ? '아침' : mealType === 'lunch' ? '점심' : '저녁'} 단식 설정이 불가능합니다.\n기록 가능 시간: ${TIME_RESTRICTIONS[mealType].label}`);
      return;
    }
    const newFlag = checked ? 2 : 0;
    const previousFlag = mealFlags[mealType];
    
    // Redux 상태 즉시 업데이트
    dispatch(updateMealFlag(mealType, newFlag));
    
    // Firestore에 저장
    try {
      await updateMealFlagAPI(email, mealType, newFlag);
    } catch (error) {
      console.error('단식 상태 저장 실패:', error);
      // 실패 시 이전 상태로 롤백
      dispatch(updateMealFlag(mealType, previousFlag));
    }
  }, [email, dispatch, mealFlags]);

  // 시간 제한 메시지 반환 함수
  const getTimeRestrictionMessage = (mealType) => {
    switch (mealType) {
      case 'breakfast':
        return '06시30분부터 10시30분까지만 기록 가능';
      case 'lunch':
        return '10시30분부터 16시30분까지만 기록 가능';
      case 'dinner':
        return '16시30분부터 다음날 06시29분까지만 기록 가능';
      default:
        return '';
    }
  };

  // 설문조사 알림 컴포넌트
  const SurveyNotification = () => {
    if (!showSurveyNotification) return null;
    
    return (
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
    );
  };

  // 로딩 상태 처리
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

  // 에러 상태 처리
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
              {currentTime.date} {currentTime.weekday}
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
                borderRadius: '4%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <HistoryOutlined style={{ fontSize: '20px', color: isModalAvailable ? '#5FDD9D' : '#999' }} />
              <Text style={{ fontSize: '16px', fontFamily: 'Pretendard-500', marginLeft: '8px' }}>기록 확인하기</Text>
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

      <SurveyNotification />

      {/* 식사 기록 버튼 섹션 */}
      <Title level={4} style={{ margin: '24px 0 16px 0', fontFamily: 'Pretendard-700', color: '#5FDD9D' }}>
        일일 식사 기록
      </Title>
      
      <Row gutter={[16, 16]} justify="center">
        {mealButtonConfigs.map((config) => {
          const isRestricted = timeRestrictions[config.type];
          const isFasting = mealFlags[config.type] === 2;
          const isCompleted = mealFlags[config.type] === 1;
          const hasSnackData = hasSnackInMealTime(config.type);
          
          return (
            <Col span={24} key={config.type}>
              {config.type !== 'snack' ? (
                <Row gutter={[12, 0]} align="middle">
                  <Col span={18}>
                    <MealButton 
                      title={`${config.title} 기록`}
                      icon={config.icon}
                      time={TIME_RESTRICTIONS[config.type].label}
                      onClick={() => handleMealClick(config.type)}
                      disabled={isCompleted || isFasting || isRestricted}
                      isCompleted={isCompleted}
                      isFasting={isFasting}
                      timeRestricted={mealFlags[config.type] === 0 && isRestricted}
                      restrictionMessage={getTimeRestrictionMessage(config.type)}
                    />
                  </Col>
                  <Col span={6}>
                    <FastingSwitch 
                      isFasting={isFasting}
                      onChange={(checked) => handleFastingToggle(config.type, checked)}
                      disabled={isCompleted || hasSnackData || isRestricted}
                    />
                  </Col>
                </Row>
              ) : (
                <MealButton 
                  title={`${config.title} 기록`}
                  icon={config.icon}
                  time={TIME_RESTRICTIONS[config.type].label}
                  onClick={() => handleMealClick(config.type)}
                  disabled={false}
                  isCompleted={false}
                  isFasting={false}
                  timeRestricted={false}
                  accent={false}
                />
              )}
            </Col>
          );
        })}
      </Row>
      
      {/* 설문조사 모달 */}
      <SurveyModal 
        visible={surveyModalVisible}
        onClose={() => setSurveyModalVisible(false)}
        email={email}
      />
    </div>
  );
};



export default Main;