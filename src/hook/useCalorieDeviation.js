import { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { doc, updateDoc, getDoc, collection, query, where, getDocs, writeBatch, setDoc } from 'firebase/firestore';
import { db } from '../firebaseconfig';

// 편차 타입 상수
const DEVIATION_TYPES = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed'
};

// 편차 적용 출처
const DEVIATION_SOURCES = {
  ADMIN: 'admin',
  USER: 'user',
  GROUP: 'group'
};

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 편차 계산 유틸리티 함수
const calculateDeviationAmount = (deviationConfig, baseCalories) => {
  if (!deviationConfig || !baseCalories) return 0;
  
  if (deviationConfig.type === DEVIATION_TYPES.PERCENTAGE) {
    return Math.round(baseCalories * deviationConfig.value);
  } else {
    return deviationConfig.value;
  }
};

// 자연 편차 계산 (실제 - 예상)
const calculateNaturalDeviation = (actualCalories, estimatedCalories) => {
  if (actualCalories == null || estimatedCalories == null) return 0;
  return actualCalories - estimatedCalories;
};

const useCalorieDeviation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const user = useSelector((state) => state.auth.user);

  // 개인별 calorieBias 저장
  const savePersonalCalorieBias = useCallback(async (userEmail, calorieBias) => {
    if (!userEmail || calorieBias === undefined) {
      throw new Error('userEmail과 calorieBias가 필요합니다.');
    }

    setLoading(true);
    setError(null);

    try {
      const userDocRef = doc(db, 'users', userEmail);
      await updateDoc(userDocRef, {
        calorieBias: Number(calorieBias),
        updatedAt: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('개인 칼로리 편차 저장 실패:', error);
      setError(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // 개인별 calorieBias 조회
  const getPersonalCalorieBias = useCallback(async (userEmail) => {
    if (!userEmail) return 0;

    try {
      const userDocRef = doc(db, 'users', userEmail);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.calorieBias || 0;
      }
      
      return 0;
    } catch (error) {
      console.error('개인 칼로리 편차 조회 실패:', error);
      return 0;
    }
  }, []);

  // 그룹 편차 설정 조회 (applicableDate 기준)
  const getGroupDeviationSettings = useCallback(async (groupId) => {
    if (!groupId) {
      console.log('getGroupDeviationSettings: groupId가 없음');
      return null;
    }

    try {
      const today = getTodayDate();
      const groupDocRef = doc(db, 'calorieGroups', groupId.toString());
      const groupDoc = await getDoc(groupDocRef);
      
      if (groupDoc.exists()) {
        const groupData = groupDoc.data();
        
        // applicableDate가 오늘 날짜와 일치하는지 확인
        // applicableDate가 Timestamp 객체인 경우 문자열로 변환하여 비교
        let applicableDateStr = groupData.applicableDate;
        if (groupData.applicableDate && typeof groupData.applicableDate.toDate === 'function') {
          const date = groupData.applicableDate.toDate();
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          applicableDateStr = `${year}-${month}-${day}`;
        }
        
        if (applicableDateStr === today) {
          return {
            deviationMultiplier: groupData.deviationMultiplier || 1,
            defaultDeviation: groupData.defaultDeviation || 0,
            groupId: groupId,
            applicableDate: groupData.applicableDate
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('그룹 편차 설정 조회 실패:', error);
      return null;
    }
  }, []);

  // 사용자의 그룹 ID 조회
  const getUserGroupId = useCallback(async (userEmail) => {
    if (!userEmail) return null;

    try {
      const userDocRef = doc(db, 'users', userEmail);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.group || null;
      }
      
      return null;
    } catch (error) {
      console.error('사용자 그룹 조회 실패:', error);
      return null;
    }
  }, []);

  // 편차 설정 조회
  const getDeviationSettings = useCallback(async (userEmail, groupId = null) => {
    try {
      // 1. 개별 사용자 설정 확인
      const userSettingsRef = doc(db, 'deviationSettings', 'users', userEmail);
      const userSettingsDoc = await getDoc(userSettingsRef);
      
      if (userSettingsDoc.exists() && userSettingsDoc.data().isActive) {
        const userData = userSettingsDoc.data();
        if (userData.overridesGroup) {
          return userData;
        }
      }
      
      // 2. 그룹 설정 확인
      if (groupId) {
        const groupSettingsRef = doc(db, 'deviationSettings', 'groups', groupId.toString());
        const groupSettingsDoc = await getDoc(groupSettingsRef);
        
        if (groupSettingsDoc.exists() && groupSettingsDoc.data().isActive) {
          return groupSettingsDoc.data();
        }
      }
      
      // 3. 전역 기본 설정 확인
      const globalSettingsRef = doc(db, 'deviationSettings', 'global', 'default');
      const globalSettingsDoc = await getDoc(globalSettingsRef);
      
      if (globalSettingsDoc.exists() && globalSettingsDoc.data().isActive) {
        return globalSettingsDoc.data();
      }
      
      return null;
    } catch (error) {
      console.error('편차 설정 조회 실패:', error);
      setError(error.message);
      return null;
    }
  }, []);

  // 식사 데이터에 편차 적용
  const applyDeviationToMeal = useCallback((mealData, deviationConfig, appliedBy = 'user') => {
    if (!mealData || !deviationConfig) return mealData;

    const originalCalories = {
      estimated: mealData.originalCalories?.estimated ?? mealData.estimatedCalories ?? null,
      actual: mealData.originalCalories?.actual ?? mealData.actualCalories ?? null
    };

    // 편차 계산 (예상 칼로리 기준)
    const baseCalories = originalCalories.estimated || 0;
    const calculatedAmount = calculateDeviationAmount(deviationConfig, baseCalories);

    // 자연 편차 계산
    const naturalDeviation = calculateNaturalDeviation(
      originalCalories.actual,
      originalCalories.estimated
    );

    // 최종 칼로리 계산
    const finalCalories = {
      estimated: originalCalories.estimated ? originalCalories.estimated + calculatedAmount : null,
      actual: originalCalories.actual ? originalCalories.actual + calculatedAmount : null
    };

    return {
      ...mealData,
      originalCalories,
      finalCalories,
      calorieDeviation: {
        natural: naturalDeviation,
        applied: {
          type: deviationConfig.type,
          value: deviationConfig.value,
          calculatedAmount,
          appliedAt: new Date(),
          appliedBy,
          source: appliedBy === 'admin' ? DEVIATION_SOURCES.ADMIN : DEVIATION_SOURCES.USER
        },
        total: naturalDeviation + calculatedAmount
      }
    };
  }, []);

  // 개별 사용자 편차 적용
  const applyDeviation = useCallback(async (userEmail, date, mealType, deviationConfig) => {
    if (!userEmail || !date || !mealType || !deviationConfig) {
      throw new Error('필수 매개변수가 누락되었습니다.');
    }

    setLoading(true);
    setError(null);

    try {
      const foodDocRef = doc(db, 'users', userEmail, 'foods', date);
      const foodDoc = await getDoc(foodDocRef);

      if (!foodDoc.exists()) {
        throw new Error('해당 날짜의 식사 데이터가 존재하지 않습니다.');
      }

      const foodData = foodDoc.data();
      const mealData = foodData[mealType];

      if (!mealData) {
        throw new Error('해당 식사 데이터가 존재하지 않습니다.');
      }

      // 편차 적용
      const updatedMealData = applyDeviationToMeal(mealData, deviationConfig, 'user');

      // Firestore 업데이트
      await updateDoc(foodDocRef, {
        [mealType]: updatedMealData,
        updatedAt: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('편차 적용 실패:', error);
      setError(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [applyDeviationToMeal]);



  // useModal에서 사용하는 함수들
  // 최종 칼로리 차이 계산 (자연 편차 + 적용된 편차)
  const calculateFinalDifference = useCallback((meal, userDeviation = 0) => {
    if (!meal) return null;
    
    // 자연 편차 (실제 - 예상)
    const naturalDeviation = meal.calorieDeviation?.natural || 0;
    
    // 적용된 편차 (그룹/개인 편차)
    const appliedDeviation = meal.calorieDeviation?.applied || 0;
    
    // 최종 차이 = 자연 편차 + 적용된 편차 + 사용자 편차
    return naturalDeviation + appliedDeviation + userDeviation;
  }, []);

  // 적용된 편차만 반환 (기존 offset 역할)
  const getAppliedDeviation = useCallback((meal) => {
    if (!meal) return null;
    return meal.calorieDeviation?.applied || 0;
  }, []);

  // 편차 설정 저장
  const saveDeviationSettings = useCallback(async (targetType, targetId, deviationConfig) => {
    if (!targetType || !deviationConfig) {
      throw new Error('필수 매개변수가 누락되었습니다.');
    }

    setLoading(true);
    setError(null);

    try {
      let docPath;
      if (targetType === 'global') {
        docPath = 'deviationSettings/global/default';
      } else if (targetType === 'group') {
        docPath = `deviationSettings/groups/${targetId}`;
      } else if (targetType === 'user') {
        docPath = `deviationSettings/users/${targetId}`;
      } else {
        throw new Error('잘못된 대상 타입입니다.');
      }

      const settingsData = {
        ...deviationConfig,
        updatedAt: new Date(),
        appliedBy: user?.email || 'unknown'
      };

      if (targetType === 'global') {
        settingsData.createdAt = settingsData.createdAt || new Date();
      }

      await setDoc(doc(db, docPath), settingsData, { merge: true });



      return true;
    } catch (error) {
      console.error('편차 설정 저장 실패:', error);
      setError(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 편차 제거 (원본 데이터로 복원)
  const removeDeviation = useCallback(async (userEmail, date, mealType) => {
    if (!userEmail || !date || !mealType) {
      throw new Error('필수 매개변수가 누락되었습니다.');
    }

    setLoading(true);
    setError(null);

    try {
      const foodDocRef = doc(db, 'users', userEmail, 'foods', date);
      const foodDoc = await getDoc(foodDocRef);

      if (!foodDoc.exists()) {
        throw new Error('해당 날짜의 식사 데이터가 존재하지 않습니다.');
      }

      const foodData = foodDoc.data();
      const mealData = foodData[mealType];

      if (!mealData || !mealData.originalCalories) {
        throw new Error('원본 칼로리 데이터가 존재하지 않습니다.');
      }

      // 원본 데이터로 복원
      const restoredMealData = {
        ...mealData,
        estimatedCalories: mealData.originalCalories.estimated,
        actualCalories: mealData.originalCalories.actual,
        finalCalories: {
          estimated: mealData.originalCalories.estimated,
          actual: mealData.originalCalories.actual
        },
        calorieDeviation: {
          natural: calculateNaturalDeviation(
            mealData.originalCalories.actual,
            mealData.originalCalories.estimated
          ),
          applied: null,
          total: calculateNaturalDeviation(
            mealData.originalCalories.actual,
            mealData.originalCalories.estimated
          )
        }
      };

      await updateDoc(foodDocRef, {
        [mealType]: restoredMealData,
        updatedAt: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('편차 제거 실패:', error);
      setError(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getDeviationSettings,
    applyDeviationToMeal,
    applyDeviation,
    saveDeviationSettings,
    removeDeviation,
    // 새로 추가된 함수들
    savePersonalCalorieBias,
    getPersonalCalorieBias,
    getGroupDeviationSettings,
    getUserGroupId,
    // useModal에서 사용하는 함수들
    calculateFinalDifference,
    getAppliedDeviation,
    // 유틸리티 함수들
    calculateDeviationAmount,
    calculateNaturalDeviation,
    DEVIATION_TYPES,
    DEVIATION_SOURCES
  };
};

export default useCalorieDeviation;