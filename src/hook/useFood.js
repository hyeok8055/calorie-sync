import { useState, useEffect, useCallback } from 'react';
import { db } from '@/firebaseconfig';
import { doc, getDoc, setDoc, updateDoc, writeBatch, collection, query, getDocs } from 'firebase/firestore';
import { getDatabase, ref, get, orderByChild, equalTo, query as rtdbQuery, limitToFirst } from 'firebase/database';
import { useSelector, useDispatch } from 'react-redux';
import { updateMealFlag } from '@/redux/actions/mealActions';
import useCalorieDeviation from './useCalorieDeviation';
import dayjs from 'dayjs';

const getTodayDate = () => {
  return dayjs().format('YYYY-MM-DD');
};

// 어제 날짜 가져오기 함수 추가
const getYesterdayDate = () => {
  return dayjs().subtract(1, 'day').format('YYYY-MM-DD');
};

// 시간대 기준으로 간식이 어느 식사에 포함되는지 결정 (요구사항 #1 반영)
const getSnackMealType = () => {
  const h = dayjs().hour();
  const m = dayjs().minute();
  const total = h * 60 + m;

  // 아침: 06:30 ~ 10:29
  if (total >= (6 * 60 + 30) && total <= (10 * 60 + 29)) return 'breakfast';
  // 점심: 10:30 ~ 16:29
  if (total >= (10 * 60 + 30) && total <= (16 * 60 + 29)) return 'lunch';
  // 저녁: 그 외 시간 (16:30 ~ 익일 06:29)
  return 'dinner';
};

// 새로운 편차 계산 함수 (요구사항에 맞는 로직)
const calculateCalorieOffset = (estimatedCalories, actualCalories, groupSettings, personalBias = 0, currentMealType = null) => {
  // 1. 기본 계산식: (실제 칼로리 - 예측 칼로리)
  let offset = 0;
  
  if (estimatedCalories && actualCalories) {
    let difference = actualCalories - estimatedCalories;
    
    // 2. 그룹 적용 조건: 그룹 설정이 있고 오늘이 applicableDate인 경우 + mealType이 일치하는 경우
    if (groupSettings && groupSettings.applicableDate && dayjs(groupSettings.applicableDate).isSame(dayjs(), 'day')) {
      // mealType이 설정되어 있고 현재 식사 타입과 일치하는 경우에만 적용
      if (groupSettings.mealType && currentMealType && groupSettings.mealType === currentMealType) {
        const { deviationMultiplier = 1, defaultDeviation = 0 } = groupSettings;
        
        // a) 계산 결과가 양수일 경우: 부호를 음수로 전환 후 deviationMultiplier 적용
        if (difference > 0) {
          // 과식 시: -차이값 * (1 + multiplier)
          // multiplier 0.3 + 1 = 1.3으로 계산하여 (-차이값 * 1.3) 형태
          const adjustedMultiplier = 1 + deviationMultiplier;
          offset = (-difference * adjustedMultiplier) + defaultDeviation;
        } else {
          // 적게 먹을 시: 차이값 * (1 + multiplier) + defaultDeviation
          const adjustedMultiplier = 1 + deviationMultiplier;
          offset = (difference * adjustedMultiplier) + defaultDeviation;
        }
      } else {
        // 그룹 설정이 있지만 mealType이 일치하지 않으면 기본 차이값만 사용
        offset = difference;
      }
    } else {
      // 그룹 설정이 없거나 날짜가 맞지 않으면 기본 차이값만 사용
      offset = difference;
    }
  }
  
  // 3. 개인별 적용 사항: 사용자의 개인 calorieBias 수치값을 독립적으로 연산에 반영
  offset += personalBias;
  
  return Math.round(offset);
};

export const useFood = () => {
  const [foodData, setFoodData] = useState(null);
  const [yesterdayFoodData, setYesterdayFoodData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const email = useSelector((state) => state.auth.user?.email);
  const dispatch = useDispatch();
  const { 
    getDeviationSettings, 
    getPersonalCalorieBias, 
    getGroupDeviationSettings, 
    getUserGroupId,
    savePersonalCalorieBias
  } = useCalorieDeviation();

  useEffect(() => {
    if (email) {
      fetchFoodData();
    }
  }, [email]);

  const fetchFoodData = async () => {
    setLoading(true);
    try {
      const today = getTodayDate();
      const yesterday = getYesterdayDate();
      
      // 오늘 데이터 가져오기
      const docRef = doc(db, 'users', email, 'foods', today);
      const docSnap = await getDoc(docRef);
      
      // 어제 저녁 식사 데이터만 가져오기 (최적화)
      const yesterdayDocRef = doc(db, 'users', email, 'foods', yesterday);
      const yesterdayDocSnap = await getDoc(yesterdayDocRef);
      
      if (yesterdayDocSnap.exists()) {
        const yesterdayData = yesterdayDocSnap.data();
        // 저녁 식사 데이터만 추출
        setYesterdayFoodData({
          dinner: yesterdayData.dinner || null
        });
      } else {
        setYesterdayFoodData(null);
      }
      
      if (docSnap.exists()) {
        setFoodData(docSnap.data());
      } else {
        const initialData = {
          date: today,
          breakfast: {
            flag: 0,
            foods: [],
            originalCalories: {
              estimated: null,
              actual: null
            },
            finalCalories: {
              estimated: null,
              actual: null
            },
            calorieDeviation: {
              natural: 0,
              applied: 0
            },
            selectedFoods: [],
            updatedAt: new Date().toISOString()
          },
          lunch: {
            flag: 0,
            foods: [],
            originalCalories: {
              estimated: null,
              actual: null
            },
            finalCalories: {
              estimated: null,
              actual: null
            },
            calorieDeviation: {
              natural: 0,
              applied: 0
            },
            selectedFoods: [],
            updatedAt: new Date().toISOString()
          },
          dinner: {
            flag: 0,
            foods: [],
            originalCalories: {
              estimated: null,
              actual: null
            },
            finalCalories: {
              estimated: null,
              actual: null
            },
            calorieDeviation: {
              natural: 0,
              applied: 0
            },
            selectedFoods: [],
            updatedAt: new Date().toISOString()
          },
          snacks: {
            foods: [],
            originalCalories: {
              estimated: null,
              actual: null
            },
            finalCalories: {
              estimated: null,
              actual: null
            },
            calorieDeviation: {
              natural: 0,
              applied: 0
            },
            selectedFoods: []
          }
        };
        setFoodData(initialData);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // 식사 또는 간식 데이터 저장
  const saveFoodData = useCallback(
    async (mealType, foods = [], estimatedCalories = null, actualCalories = null, selectedFoods = [], flag = 0) => {
      if (!email || !mealType) {
        console.error('email 또는 mealType이 없습니다:', { email, mealType });
        return;
      }
      
      setLoading(true);
      try {
        const today = getTodayDate();
        const docRef = doc(db, 'users', email, 'foods', today);
        const docSnap = await getDoc(docRef);
        
        let currentData = docSnap.exists() ? docSnap.data() : { date: today };

        // 데이터 유효성 검사 및 기본값 설정
        const validFoods = (foods || []).map(food => ({
          name: food.name || '',
          calories: !isNaN(Number(food.calories)) ? Number(food.calories) : 0,
          weight: !isNaN(Number(food.weight)) ? Number(food.weight) : 0,
          portion: !isNaN(Number(food.portion)) ? Number(food.portion) : 1,
          nutrients: {
            carbs: !isNaN(Number(food.nutrients?.carbs)) ? Number(food.nutrients.carbs) : 0,
            fat: !isNaN(Number(food.nutrients?.fat)) ? Number(food.nutrients.fat) : 0,
            protein: !isNaN(Number(food.nutrients?.protein)) ? Number(food.nutrients.protein) : 0
          }
        })).filter(food => food.name);

        // 개인 편차 설정 가져오기
        const personalBias = await getPersonalCalorieBias(email);
        
        // 그룹 설정 우선순위: 관리자 적용 시 최신 설정 우선, 사용자 직접 저장 시 기존 설정 우선
        let groupSettings = null;
        const groupId = await getUserGroupId(email);

        if (groupId) {
          try {
            // 현재 그룹 설정 조회 (항상 최신 설정 확인)
            const currentGroupSettings = await getGroupDeviationSettings(groupId);

            // 기존 저장된 설정 확인
            const existingConfig = currentData[mealType]?.groupDeviationConfig;
            const hasExistingConfig = existingConfig && dayjs(existingConfig.appliedAt).isSame(dayjs(), 'day');

            // 우선순위 결정 로직
            if (currentGroupSettings && currentGroupSettings.applicableDate) {
              // 그룹 설정이 있고 오늘 날짜인 경우: 최신 그룹 설정 우선 사용
              const groupApplicableDate = dayjs(currentGroupSettings.applicableDate.toDate ? currentGroupSettings.applicableDate.toDate() : currentGroupSettings.applicableDate);
              if (groupApplicableDate.isSame(dayjs(), 'day')) {
                groupSettings = {
                  deviationMultiplier: currentGroupSettings.deviationMultiplier,
                  defaultDeviation: currentGroupSettings.defaultDeviation,
                  groupId: currentGroupSettings.groupId,
                  applicableDate: currentGroupSettings.applicableDate,
                  mealType: currentGroupSettings.mealType // mealType 추가
                };
              }
            }

            // 그룹 설정이 없는 경우 기존 저장된 설정 사용 (fallback)
            if (!groupSettings && hasExistingConfig) {
              groupSettings = {
                deviationMultiplier: existingConfig.deviationMultiplier,
                defaultDeviation: existingConfig.defaultDeviation,
                groupId: existingConfig.groupId,
                applicableDate: existingConfig.appliedAt,
                mealType: existingConfig.mealType
              };
            }
          } catch (error) {
            console.error('그룹 설정 조회 실패:', error);
            // 에러 발생 시 기존 저장된 설정으로 fallback
            const existingConfig = currentData[mealType]?.groupDeviationConfig;
            if (existingConfig && dayjs(existingConfig.appliedAt).isSame(dayjs(), 'day')) {
              groupSettings = {
                deviationMultiplier: existingConfig.deviationMultiplier,
                defaultDeviation: existingConfig.defaultDeviation,
                groupId: existingConfig.groupId,
                applicableDate: existingConfig.appliedAt,
                mealType: existingConfig.mealType
              };
            }
          }
        }
        
        // 기존 편차 설정도 유지 (호환성을 위해)
        const deviationSettings = await getDeviationSettings();
        
        if (mealType === 'snacks') {
          // 간식인 경우 시간대에 따라 식사 타입 결정
          const targetMealType = getSnackMealType();
          
          // 기존 식사 데이터 가져오기
          const existingMeal = currentData[targetMealType] || {
            flag: 0,
            foods: [],
            originalCalories: { estimated: 0, actual: 0 },
            calorieDeviation: { natural: 0, applied: 0 },
            selectedFoods: [],
            updatedAt: new Date().toISOString()
          };

          // 기존 간식 데이터 가져오기
          const existingSnacks = currentData.snacks || {
            foods: [],
            originalCalories: { estimated: 0, actual: 0 },
            calorieDeviation: { natural: 0, applied: 0 },
            selectedFoods: [],
            updatedAt: new Date().toISOString()
          };

          // 간식 데이터 누적
          const newSnackEstimated = (existingSnacks.originalCalories.estimated || 0) + (estimatedCalories || 0);
          const newSnackActual = (existingSnacks.originalCalories.actual || 0) + (actualCalories || 0);
          
          // 간식에 대한 편차 계산
          const snackOffset = newSnackEstimated && newSnackActual ? 
            calculateCalorieOffset(newSnackEstimated, newSnackActual, groupSettings, personalBias, 'snacks') : 
            personalBias;
          
          currentData.snacks = {
            foods: [...existingSnacks.foods, ...validFoods],
            originalCalories: {
              estimated: newSnackEstimated,
              actual: newSnackActual
            },
            calorieDeviation: {
              natural: newSnackActual && newSnackEstimated ? newSnackActual - newSnackEstimated : 0,
              applied: snackOffset,
              groupSettings: groupSettings,
              personalBias: personalBias
            },
            selectedFoods: [...(existingSnacks.selectedFoods || []), ...(selectedFoods || [])],
            updatedAt: new Date().toISOString(),
            groupDeviationConfig: groupSettings ? {
              groupId: groupSettings.groupId || groupId,
              deviationMultiplier: groupSettings.deviationMultiplier,
              defaultDeviation: groupSettings.defaultDeviation,
              appliedAt: new Date().toISOString(),
              appliedBy: 'user'
            } : (existingSnacks.groupDeviationConfig || null)
          };
          
          // 식사 데이터에 간식 데이터 통합
          const newMealEstimated = (existingMeal.originalCalories.estimated || 0) + (estimatedCalories || 0);
          const newMealActual = (existingMeal.originalCalories.actual || 0) + (actualCalories || 0);
          
          // 자연 편차 계산 (실제 - 예상)
          const naturalDeviation = newMealActual && newMealEstimated ? newMealActual - newMealEstimated : 0;
          
          // 새로운 편차 계산 로직 적용 (간식 포함)
          const calculatedOffset = newMealEstimated && newMealActual ? 
            calculateCalorieOffset(newMealEstimated, newMealActual, groupSettings, personalBias, targetMealType) : 
            personalBias;
          
          currentData[targetMealType] = {
            ...existingMeal,
            flag: Number(existingMeal.flag),
            foods: [...existingMeal.foods, ...validFoods],
            originalCalories: {
              estimated: newMealEstimated,
              actual: newMealActual
            },
            calorieDeviation: {
              natural: naturalDeviation,
              applied: calculatedOffset,
              groupSettings: groupSettings,
              personalBias: personalBias
            },
            selectedFoods: [...(existingMeal.selectedFoods || []), ...(selectedFoods || [])],
            updatedAt: new Date().toISOString(),
            groupDeviationConfig: groupSettings ? {
              groupId: groupSettings.groupId || groupId,
              deviationMultiplier: groupSettings.deviationMultiplier,
              defaultDeviation: groupSettings.defaultDeviation,
              appliedAt: new Date().toISOString(),
              appliedBy: 'user'
            } : (existingMeal.groupDeviationConfig || null)
          };
          
          // finalCalories 필드 제거 - originalCalories와 calorieDeviation.applied로 계산 가능
          
        } else {
          // 일반 식사인 경우
          const existingMealData = currentData[mealType] || {
            calorieDeviation: { natural: 0, applied: 0 }
          };
          
          // 기존 간식 데이터가 있다면 보존
          const existingSnacks = currentData.snacks;
          
          // 기존 식사에 간식이 통합되어 있는지 확인
          const existingSnackCalories = existingSnacks ? {
            estimated: existingSnacks.originalCalories?.estimated || 0,
            actual: existingSnacks.originalCalories?.actual || 0
          } : { estimated: 0, actual: 0 };
          
          // 기존 식사 데이터에서 간식 칼로리 제외 (순수 식사 칼로리만)
          const pureMealEstimated = (existingMealData.originalCalories?.estimated || 0) - existingSnackCalories.estimated;
          const pureMealActual = (existingMealData.originalCalories?.actual || 0) - existingSnackCalories.actual;
          
          const originalEstimated = estimatedCalories !== null ? Number(estimatedCalories) : null;
          const originalActual = actualCalories !== null ? Number(actualCalories) : null;
          
          // 새로운 식사 칼로리 (순수 식사 + 새 입력)
          const newMealEstimated = Math.max(0, pureMealEstimated) + (originalEstimated || 0);
          const newMealActual = Math.max(0, pureMealActual) + (originalActual || 0);
          
          // 간식과 합친 총 칼로리
          const totalEstimated = newMealEstimated + existingSnackCalories.estimated;
          const totalActual = newMealActual + existingSnackCalories.actual;
          
          // 자연 편차 계산 (실제 - 예상)
          const naturalDeviation = totalActual && totalEstimated ? totalActual - totalEstimated : 0;
          
          // 새로운 편차 계산 로직 적용 (간식 포함 총 칼로리)
          const calculatedOffset = totalEstimated && totalActual ? 
            calculateCalorieOffset(totalEstimated, totalActual, groupSettings, personalBias, mealType) : 
            personalBias;
          
          // 기존 식사의 음식 목록에서 간식 제외
          const existingMealFoods = existingMealData.foods || [];
          const existingSnackFoods = existingSnacks?.foods || [];
          const pureMealFoods = existingMealFoods.filter(food => 
            !existingSnackFoods.some(snackFood => 
              snackFood.name === food.name && snackFood.calories === food.calories
            )
          );
          
          currentData[mealType] = {
            flag: Number(flag),
            foods: [...pureMealFoods, ...validFoods, ...(existingSnackFoods)],
            originalCalories: {
              estimated: totalEstimated,
              actual: totalActual
            },
            calorieDeviation: {
              natural: naturalDeviation,
              applied: calculatedOffset,
              groupSettings: groupSettings,
              personalBias: personalBias
            },
            selectedFoods: [...(existingMealData.selectedFoods || []).filter(sf => 
              !existingSnacks?.selectedFoods?.includes(sf)
            ), ...(selectedFoods || []), ...(existingSnacks?.selectedFoods || [])],
            updatedAt: new Date().toISOString(),
            groupDeviationConfig: groupSettings ? {
              groupId: groupSettings.groupId || groupId,
              deviationMultiplier: groupSettings.deviationMultiplier,
              defaultDeviation: groupSettings.defaultDeviation,
              appliedAt: new Date().toISOString(),
              appliedBy: 'user'
            } : (existingMealData.groupDeviationConfig || null)
          };
          
          // 기존 간식 데이터 복원
          if (existingSnacks) {
            currentData.snacks = existingSnacks;
          }
          
          // finalCalories 필드 제거 - originalCalories와 calorieDeviation.applied로 계산 가능
        }

        await setDoc(docRef, currentData, { merge: true });
        setFoodData(currentData);
        
        // 식사 완료 시 Redux 상태 업데이트
        if (flag === 1) {
          const targetMealType = mealType === 'snacks' ? getSnackMealType() : mealType;
          dispatch(updateMealFlag(targetMealType, 1));
        }

        // 단발성 개인 편차 사용 후 0으로 리셋 (저장 성공 시에만)
        if (personalBias !== 0) {
          try {
            await savePersonalCalorieBias(email, 0);
          } catch (resetError) {
            console.error('개인 편차 리셋 실패:', resetError);
            // 리셋 실패해도 저장은 성공했으므로 에러로 처리하지 않음
          }
        }
      } catch (err) {
        console.error('저장 중 에러 발생:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [email, getDeviationSettings]
  );

  const fetchFoodDetails = useCallback(async (foodNames) => {
    if (!foodNames || foodNames.length === 0) return [];
    setLoading(true);
    
    try {
      const rtdb = getDatabase();
      const foodDetails = [];

      for (const foodName of foodNames) {
        try {
          const nameQueryRef = rtdbQuery(
            ref(rtdb, 'foods'),
            orderByChild('name'),
            equalTo(foodName),
            limitToFirst(1)
          );
          
          const nameQuerySnapshot = await get(nameQueryRef);
          
          if (nameQuerySnapshot.exists()) {
            let foodData;
            nameQuerySnapshot.forEach((childSnapshot) => {
              foodData = childSnapshot.val();
              return true;
            });
            
            foodDetails.push({
              name: foodName,
              calories: foodData.calories || 0,
              weight: foodData.weight || '100g',
              nutrients: {
                carbs: foodData.nutrients?.carbs || 0,
                fat: foodData.nutrients?.fat || 0,
                protein: foodData.nutrients?.protein || 0
              },
              ...foodData
            });
          } else {
            console.log(`${foodName}에 대한 정보가 없습니다.`);
            foodDetails.push({ 
              name: foodName, 
              calories: 0,
              weight: '100g',
              nutrients: {
                carbs: 0,
                fat: 0,
                protein: 0
              }
            });
          }
        } catch (queryErr) {
          console.error(`${foodName} 조회 중 오류 발생:`, queryErr);
          foodDetails.push({ 
            name: foodName, 
            calories: 0,
            weight: '100g',
            nutrients: {
              carbs: 0,
              fat: 0,
              protein: 0
            }
          });
        }
      }
      
      return foodDetails;
    } catch (err) {
      console.error('음식 정보를 가져오는 중 오류 발생:', err);
      setError(err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // 그룹 편차 일괄 적용 함수
  const applyGroupDeviation = useCallback(async (userIds, date, mealType, deviationConfig = null, autoCalculate = false, groupId = null) => {
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new Error('사용자 ID 목록이 필요합니다.');
    }
    if (!date || !mealType) {
      throw new Error('날짜와 식사 유형이 필요합니다.');
    }

    setLoading(true);
    setError(null);

    try {
      let finalDeviationConfig = deviationConfig;
      
      // 자동 계산이 활성화된 경우 그룹 설정에서 편차 구성 가져오기
      if (autoCalculate && groupId) {
        const groupSettings = await getGroupDeviationSettings(groupId);
        if (groupSettings) {
          finalDeviationConfig = {
            type: 'percentage',
            value: groupSettings.deviationMultiplier !== undefined ? groupSettings.deviationMultiplier : 1,
            defaultDeviation: groupSettings.defaultDeviation !== undefined ? groupSettings.defaultDeviation : 0
          };
        }
      }

      if (!finalDeviationConfig) {
        throw new Error('편차 설정이 필요합니다.');
      }

      const batch = writeBatch(db);
      let processedCount = 0;
      const errors = [];

      // 그룹 사용자 목록 가져오기 (새로운 구조 사용)
      let actualUserIds = userIds;
      if (groupId && (!userIds || userIds.length === 0)) {
        try {
          const groupUsersQuery = query(collection(db, 'calorieGroups', groupId, 'users'));
          const groupUsersSnapshot = await getDocs(groupUsersQuery);
          actualUserIds = groupUsersSnapshot.docs.map(doc => doc.data().email);
        } catch (error) {
          console.error('그룹 사용자 목록 조회 실패:', error);
          throw new Error('그룹 사용자 목록을 가져올 수 없습니다.');
        }
      }

      // 각 사용자에 대해 편차 적용
      for (const userEmail of actualUserIds) {
        try {
          const foodDocRef = doc(db, 'users', userEmail, 'foods', date);
          const foodDoc = await getDoc(foodDocRef);

          // 개인 calorieBias 가져오기
          const personalBias = await getPersonalCalorieBias(userEmail) || 0;
          
          // 그룹 설정 가져오기
          const groupSettings = groupId ? await getGroupDeviationSettings(groupId) : null;

          if (!foodDoc.exists()) {
            // 식사 데이터가 없는 경우: 기본 구조 생성하고 그룹 설정 저장
            const initialData = {
              date: date,
              breakfast: {
                flag: 0,
                foods: [],
                originalCalories: { estimated: null, actual: null },
                finalCalories: { estimated: null, actual: null },
                calorieDeviation: { natural: 0, applied: personalBias },
                selectedFoods: [],
                updatedAt: new Date().toISOString(),
                groupDeviationConfig: groupSettings ? {
                  groupId: groupId,
                  deviationMultiplier: groupSettings.deviationMultiplier,
                  defaultDeviation: groupSettings.defaultDeviation,
                  appliedAt: new Date().toISOString(),
                  appliedBy: 'admin'
                } : null
              },
              lunch: {
                flag: 0,
                foods: [],
                originalCalories: { estimated: null, actual: null },
                finalCalories: { estimated: null, actual: null },
                calorieDeviation: { natural: 0, applied: personalBias },
                selectedFoods: [],
                updatedAt: new Date().toISOString(),
                groupDeviationConfig: groupSettings ? {
                  groupId: groupId,
                  deviationMultiplier: groupSettings.deviationMultiplier,
                  defaultDeviation: groupSettings.defaultDeviation,
                  appliedAt: new Date().toISOString(),
                  appliedBy: 'admin'
                } : null
              },
              dinner: {
                flag: 0,
                foods: [],
                originalCalories: { estimated: null, actual: null },
                finalCalories: { estimated: null, actual: null },
                calorieDeviation: { natural: 0, applied: personalBias },
                selectedFoods: [],
                updatedAt: new Date().toISOString(),
                groupDeviationConfig: groupSettings ? {
                  groupId: groupId,
                  deviationMultiplier: groupSettings.deviationMultiplier,
                  defaultDeviation: groupSettings.defaultDeviation,
                  appliedAt: new Date().toISOString(),
                  appliedBy: 'admin'
                } : null
              },
              snacks: {
                foods: [],
                originalCalories: { estimated: null, actual: null },
                finalCalories: { estimated: null, actual: null },
                calorieDeviation: { natural: 0, applied: personalBias },
                selectedFoods: [],
                groupDeviationConfig: groupSettings ? {
                  groupId: groupId,
                  deviationMultiplier: groupSettings.deviationMultiplier,
                  defaultDeviation: groupSettings.defaultDeviation,
                  appliedAt: new Date().toISOString(),
                  appliedBy: 'admin'
                } : null
              }
            };
            
            batch.set(foodDocRef, initialData);
            processedCount++;
            continue;
          }

          const foodData = foodDoc.data();
          const mealData = foodData[mealType];

          if (!mealData) {
            // 해당 식사 타입 데이터가 없는 경우: 기본 구조 생성
            const newMealData = {
              flag: 0,
              foods: [],
              originalCalories: { estimated: null, actual: null },
              finalCalories: { estimated: null, actual: null },
              calorieDeviation: { natural: 0, applied: personalBias },
              selectedFoods: [],
              updatedAt: new Date().toISOString(),
              groupDeviationConfig: groupSettings ? {
                groupId: groupId,
                deviationMultiplier: groupSettings.deviationMultiplier,
                defaultDeviation: groupSettings.defaultDeviation,
                appliedAt: new Date().toISOString(),
                appliedBy: 'admin'
              } : null
            };
            
            batch.update(foodDocRef, {
              [mealType]: newMealData,
              updatedAt: new Date().toISOString()
            });
            processedCount++;
            continue;
          }

          // 기존 식사 데이터가 있는 경우: 편차 재계산 및 그룹 설정 업데이트
          let newOffset = personalBias;
          
          if (mealData.originalCalories && mealData.originalCalories.estimated && mealData.originalCalories.actual) {
            // 실제 칼로리 데이터가 있는 경우 편차 계산
            newOffset = calculateCalorieOffset(
              mealData.originalCalories.estimated,
              mealData.originalCalories.actual,
              groupSettings,
              personalBias,
              mealType
            );
          }

          // 업데이트된 식사 데이터
          const updatedMealData = {
            ...mealData,
            calorieDeviation: {
              ...mealData.calorieDeviation,
              applied: newOffset,
              groupSettings: groupSettings,
              personalBias: personalBias
            },
            // finalCalories 필드 제거 - originalCalories와 calorieDeviation.applied로 계산 가능
            groupDeviationConfig: groupSettings ? {
              groupId: groupId,
              deviationMultiplier: groupSettings.deviationMultiplier,
              defaultDeviation: groupSettings.defaultDeviation,
              appliedAt: new Date().toISOString(),
              appliedBy: 'admin'
            } : null,
            updatedAt: new Date().toISOString()
          };

          // 배치에 업데이트 추가
          batch.update(foodDocRef, {
            [mealType]: updatedMealData,
            updatedAt: new Date().toISOString()
          });

          processedCount++;
        } catch (userError) {
          console.error(`사용자 ${userEmail} 처리 중 오류:`, userError);
          errors.push(`사용자 ${userEmail}: ${userError.message}`);
        }
      }

      // 배치 커밋
      await batch.commit();

      return {
        success: true,
        processedCount,
        totalCount: actualUserIds.length,
        errors: errors.length > 0 ? errors : null
      };
    } catch (error) {
      console.error('그룹 편차 적용 실패:', error);
      setError(error.message);
      return {
        success: false,
        error: error.message
      };
    } finally {
      setLoading(false);
    }
  }, [getGroupDeviationSettings, getPersonalCalorieBias]);

  return { loading, error, foodData, yesterdayFoodData, saveFoodData, fetchFoodDetails, applyGroupDeviation, calculateCalorieOffset };
};
