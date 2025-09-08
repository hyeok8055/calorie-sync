import { useCallback, useEffect, useState } from 'react';
import { Modal } from 'antd-mobile';
import { Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { useFood } from './useFood';

const { Text } = Typography;

export const useModal = (testMode = false) => {
  const { foodData, yesterdayFoodData } = useFood();
  const [viewedMeals, setViewedMeals] = useState({
    breakfast: false,
    lunch: false,
    dinner: false
  });

  // localStorage에서 조회 상태 로드
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
    const storageKey = `meal_viewed_${today}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      try {
        setViewedMeals(JSON.parse(stored));
      } catch (error) {
        console.error('조회 상태 로드 실패:', error);
      }
    }
  }, []);

  // 조회 상태를 localStorage에 저장
  const markMealAsViewed = useCallback((mealType) => {
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `meal_viewed_${today}`;
    
    const newViewedMeals = {
      ...viewedMeals,
      [mealType]: true
    };
    
    setViewedMeals(newViewedMeals);
    localStorage.setItem(storageKey, JSON.stringify(newViewedMeals));
  }, [viewedMeals]);

  const calculateCalorieDifference = useCallback((mealType) => {
    // 저녁 식사는 어제 데이터를 사용, 나머지는 오늘 데이터 사용
    const dataSource = mealType === 'dinner' ? yesterdayFoodData : foodData;
    if (!dataSource || !dataSource[mealType]) return null;
    
    const meal = dataSource[mealType];
    // originalCalories의 estimated 또는 actual이 null 또는 undefined이면 계산 불가
    const estimatedCalories = meal.originalCalories?.estimated;
    const actualCalories = meal.originalCalories?.actual;
    
    if (actualCalories === null || estimatedCalories === null || actualCalories === undefined || estimatedCalories === undefined) return null;
    
    // calorieDeviation.applied가 있으면 그 값을 사용, 없으면 기본 차이값 사용
    if (meal.calorieDeviation?.applied !== undefined && meal.calorieDeviation?.applied !== null) {
      return meal.calorieDeviation.applied;
    }
    
    // 기본 차이값 반환
    return actualCalories - estimatedCalories;

  }, [foodData, yesterdayFoodData]);

  // 필요에 따라 원본 차이만 반환하는 함수도 추가 가능
  const getOriginalCalorieDifference = useCallback((mealType) => {
      // 저녁 식사는 어제 데이터를 사용, 나머지는 오늘 데이터 사용
      const dataSource = mealType === 'dinner' ? yesterdayFoodData : foodData;
      if (!dataSource || !dataSource[mealType]) return null;
      const meal = dataSource[mealType];
      const estimatedCalories = meal.originalCalories?.estimated;
      const actualCalories = meal.originalCalories?.actual;
      
      if (actualCalories === null || estimatedCalories === null || actualCalories === undefined || estimatedCalories === undefined) return null;
      return actualCalories - estimatedCalories;
  }, [foodData, yesterdayFoodData]);

   // appliedDeviation 값만 반환하는 함수 (기존 offset)
   const getMealAppliedDeviation = useCallback((mealType) => {
       // 저녁 식사는 어제 데이터를 사용, 나머지는 오늘 데이터 사용
       const dataSource = mealType === 'dinner' ? yesterdayFoodData : foodData;
       if (!dataSource || !dataSource[mealType]) return null;
       const meal = dataSource[mealType];
       return meal.calorieDeviation?.applied || 0;
   }, [foodData, yesterdayFoodData]);
   
   // 기존 함수명 호환성을 위한 별칭
   const getMealOffset = getMealAppliedDeviation;

  const showCalorieDifferenceModal = useCallback((mealType, isAutoShow = false) => {
    // 저녁 식사는 어제 데이터를 사용, 나머지는 오늘 데이터 사용
    const dataSource = mealType === 'dinner' ? yesterdayFoodData : foodData;
    
    // 실제 데이터 확인
    const difference = calculateCalorieDifference(mealType);
    
    // 차이가 null이면 기본 메시지 표시
    if (difference === null) {
      Modal.alert({
        title: '데이터 없음',
        content: '해당 식사의 칼로리 데이터가 없습니다.',
        confirmText: '확인',
      });
      return;
    }

    // 실제 섭취 칼로리(y) 계산
    const meal = dataSource?.[mealType];
    const actualCalories = meal.originalCalories?.actual;
    const beta = difference; // β = y - ŷ (오차)
    
    // 3가지 케이스 분류
    let feedbackCase = 'accurate'; // 기본값
    let messageText = '';
    let messageColor = '#888';
    let backgroundColor = '#f8f8f8';
    let calorieTextColor = '#888';
    
    // 케이스 분류 로직
    const threshold = 0.2 * actualCalories; // 20% 임계값
    
    if (beta >= -threshold && beta <= threshold) {
      // 1. 정확 (±20% 이내)
      feedbackCase = 'accurate';
      messageText = '완벽해요! 예측과 거의 일치합니다';
      messageColor = '#888';
      backgroundColor = '#f8f8f8';
      calorieTextColor = '#888';
    } else if (beta < -threshold) {
      // 2. 적게 섭취 (-20% 초과)
      feedbackCase = 'less';
      messageText = (
        <span>
          실제 섭취량이 예상보다 <span style={{ color: '#ff4d4f' }}>-{Math.abs(beta).toFixed(0)}kcal</span> 적네요.
        </span>
      );
      messageColor = '#333'; // 검은색
      backgroundColor = 'rgba(255, 77, 79, 0.08)';
      calorieTextColor = '#ff4d4f'; // 붉은색
    } else {
      // 3. 많이 섭취 (+20% 초과)
      feedbackCase = 'more';
      messageText = (
        <span>
          실제 섭취량이 예상보다 <span style={{ color: '#1677ff' }}>+{beta.toFixed(0)}kcal</span> 많네요.
        </span>
      );
      messageColor = '#333'; // 검은색
      backgroundColor = 'rgba(22, 119, 255, 0.08)';
      calorieTextColor = '#1677ff'; // 푸른색
    }
    
    const absValue = Math.abs(difference).toFixed(0);
    const isPositive = difference > 0;

    let content = (
      <>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          width: '100%',
          marginTop: '15px'
        }}>
          <Text style={{ 
            fontSize: '18px', 
            textAlign: 'center', 
            marginBottom: '15px',
            color: messageColor,
            fontWeight: '600'
          }}>
            {messageText}
          </Text>
          
          {/* 편차 표시 패널 */}
          <div style={{
            backgroundColor: backgroundColor,
            borderRadius: '10px',
            padding: '15px 20px',
            width: '90%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: feedbackCase !== 'accurate' ? `0 2px 8px ${calorieTextColor}20` : 'none'
          }}>
            <Text 
              style={{ 
                fontSize: '24px', 
                fontWeight: '700', 
                color: calorieTextColor,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {feedbackCase === 'accurate' ? null : isPositive ? (
                <ArrowUpOutlined style={{ marginRight: '8px', fontSize: '22px' }} />
              ) : (
                <ArrowDownOutlined style={{ marginRight: '8px', fontSize: '22px' }} />
              )}
              {feedbackCase === 'accurate' ? '±' : isPositive ? '+' : '-'}{absValue}kcal
            </Text>
          </div>
        </div>
      </>
    );

    try {
      Modal.alert({
        title: `${isAutoShow ? '🔔 ' : ''}${mealType === 'dinner' ? '어제' : '지난'} ${
          mealType === 'breakfast' ? '아침' : 
          mealType === 'lunch' ? '점심' : '저녁'
        } 식사 결과`,
        content: content,
        confirmText: '확인했습니다.',
        onConfirm: () => {
          // 모달을 확인하면 해당 식사를 조회한 것으로 표시
          markMealAsViewed(mealType);
        }
      });
    } catch (error) {
      console.error('모달 표시 중 오류 발생:', error);
      // 기본 alert로 대체
      alert('식사 결과를 확인할 수 없습니다. 오류가 발생했습니다.');
    }
  }, [testMode, calculateCalorieDifference, foodData, markMealAsViewed]);

  // 자동으로 표시할 수 있는 모달이 있는지 확인하는 함수
  const checkAutoModalAvailable = useCallback(() => {
    // 임시 변경: 시간 기반 제약을 모두 주석 처리하고,
    // 식사 기록이 존재하면 즉시(해당 식사 데이터가 있을 때) 자동 모달을 허용합니다.
    // 기존 시간 기반 로직은 아래에 주석으로 남겨둡니다.

    if (testMode || !foodData) return { available: false, mealType: null };

    const mealsToCheck = ['breakfast', 'lunch', 'dinner'];

    for (const mealType of mealsToCheck) {
      const dataSource = mealType === 'dinner' ? yesterdayFoodData : foodData;
      const meal = dataSource?.[mealType];
      const hasData = meal &&
        meal.originalCalories?.actual !== undefined &&
        meal.originalCalories?.actual !== null &&
        meal.originalCalories?.estimated !== undefined &&
        meal.originalCalories?.estimated !== null;

      const notViewed = !viewedMeals[mealType];

      // 기록이 있으면 즉시 자동 모달 허용 (단, 이미 본 것은 제외)
      if (hasData && notViewed) {
        return { available: true, mealType };
      }
    }

    return { available: false, mealType: null };
  }, [foodData, viewedMeals, testMode]);

  // 기존 시간 제한 기반 모달 확인 함수
  const checkModalAvailable = useCallback(() => {
    // 임시 변경: 시간 제한을 무시하고, 데이터가 존재하면 즉시 조회 가능하게 함.
    if (testMode) return { available: true, mealType: 'lunch', isValidTime: true };

    const mealsToCheck = ['breakfast', 'lunch', 'dinner'];

    for (const mealType of mealsToCheck) {
      const dataSource = mealType === 'dinner' ? yesterdayFoodData : foodData;
      const meal = dataSource?.[mealType];
      const hasData = meal &&
        meal.originalCalories?.actual !== undefined &&
        meal.originalCalories?.actual !== null &&
        meal.originalCalories?.estimated !== undefined &&
        meal.originalCalories?.estimated !== null;

      const notViewed = !viewedMeals[mealType];

      if (hasData && notViewed) {
        return {
          available: true,
          mealType,
          isValidTime: true
        };
      }
    }

    return { available: false, mealType: null, isValidTime: false };
  }, [foodData, testMode]);

  // 모달을 표시하는 함수 (수동 클릭)
  const showModal = useCallback(() => {
    const modalInfo = checkModalAvailable();
    
    const { available, mealType, isValidTime } = modalInfo;
    
    if (testMode) {
      showCalorieDifferenceModal(mealType);
      return;
    }
    
    if (available && mealType) {
      showCalorieDifferenceModal(mealType);
    } else {
      // 조회 가능한 시간이 아니거나 식사 기록이 없는 경우
      const now = new Date();
      const hours = now.getHours();
      
      let message = '';
      
      // 시간대 확인
      if (!isValidTime) {
        message = (
          <div style={{ textAlign: 'center' }}>
            <Text style={{ fontSize: 16, lineHeight: 1.5 }}>
              현재는 이전 식사 결과를 조회할 수 있는 시간이 아닙니다.
            </Text>
            <br />
            <br />
            <Text strong style={{ fontSize: 15, color: '#333', lineHeight: 1.5, marginTop: '10px' }}>
              조회 가능 시간:
            </Text>
            <br />
            <Text style={{ fontSize: 14, color: '#666', lineHeight: 1.8 }}>
              - 아침 식사 결과: 오전 10:30 ~ 오후 2시<br />
              - 점심 식사 결과: 오후 4:30 ~ 오후 8시<br />
              - 저녁 식사 결과: 오전 6:30 ~ 오전 10시
            </Text>
          </div>
        );
      } else {
        // 시간은 맞지만 데이터가 없는 경우
        const messageStyle = { 
          fontSize: 16, 
          textAlign: 'center', 
          lineHeight: 1.5 
        };
        
        if (hours >= 6 && hours <= 10) {
          message = <Text style={messageStyle}>어제 저녁 식사 기록이 없습니다.</Text>;
        } else if (hours >= 11 && hours <= 14) {
          message = <Text style={messageStyle}>아침 식사 기록이 없습니다.</Text>;
        } else if (hours >= 17 && hours <= 20) {
          message = <Text style={messageStyle}>점심 식사 기록이 없습니다.</Text>;
        }
      }
      
      Modal.alert({
        title: '식사 결과 조회 불가',
        content: message,
        confirmText: '확인',
      });
    }
  }, [checkModalAvailable, showCalorieDifferenceModal, testMode]);

  // 자동 모달 표시 함수
  const showAutoModal = useCallback(() => {
    const autoModalInfo = checkAutoModalAvailable();
    
    if (autoModalInfo.available && autoModalInfo.mealType) {
      showCalorieDifferenceModal(autoModalInfo.mealType, true);
    }
  }, [checkAutoModalAvailable, showCalorieDifferenceModal]);

  return {
    showModal,
    showAutoModal,
    isModalAvailable: checkModalAvailable().available,
    isAutoModalAvailable: checkAutoModalAvailable().available,
    calculateCalorieDifference,
    getOriginalCalorieDifference,
    getMealOffset, // 기존 호환성
    getMealAppliedDeviation // 새로운 표준화된 함수명
  };
};