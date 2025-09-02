import { db } from '@/firebaseconfig';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// 백엔드 API URL 설정 (실제 환경에 맞게 조정 필요)
const BACKEND_API_URL = 'https://wnln.mooo.com/api';

// 오늘 날짜를 YYYY-MM-DD 형식으로 반환
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 음식 영양정보 검색 API
export const searchFoodNutrition = async (keyword) => {
  try {
    const response = await fetch(`${BACKEND_API_URL}/food_info?keyword=${encodeURIComponent(keyword)}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return await response.json();
  } catch (error) {
    console.error('음식 영양정보 검색 실패:', error);
    throw error;
  }
};

// Meal Flag 관련 API 함수들

// 오늘의 meal flag 데이터 가져오기 (foods 컬렉션에서)
export const getMealFlags = async (uid) => {
  try {
    const today = getTodayDate();
    const docRef = doc(db, 'users', uid, 'foods', today);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        breakfast: data.breakfast?.flag || 0,
        lunch: data.lunch?.flag || 0,
        dinner: data.dinner?.flag || 0,
        snack: data.snack?.flag || 0,
      };
    } else {
      // 문서가 없으면 기본값 반환
      return {
        breakfast: 0,
        lunch: 0,
        dinner: 0,
        snack: 0,
      };
    }
  } catch (error) {
    console.error('Meal flags 가져오기 실패:', error);
    throw error;
  }
};

// 특정 meal의 flag 업데이트 (foods 컬렉션만 사용)
export const updateMealFlag = async (uid, mealType, flag) => {
  try {
    const today = getTodayDate();
    
    // foods 컬렉션에서 flag 업데이트
    const foodsDocRef = doc(db, 'users', uid, 'foods', today);
    const foodsDocSnap = await getDoc(foodsDocRef);
    
    if (foodsDocSnap.exists()) {
      // foods 문서가 존재하면 해당 meal의 flag와 updatedAt 업데이트
      await updateDoc(foodsDocRef, {
        [`${mealType}.flag`]: flag,
        [`${mealType}.updatedAt`]: new Date().toISOString(),
      });
    } else {
      // foods 문서가 없으면 기본 구조로 생성
      const newFoodsData = {
        date: today,
        [mealType]: {
          flag: flag,
          foods: [],
          estimatedCalories: null,
          actualCalories: null,
          selectedFoods: [],
          updatedAt: new Date().toISOString()
        }
      };
      await setDoc(foodsDocRef, newFoodsData);
    }
    

    return true;
  } catch (error) {
    console.error('Meal flag 업데이트 실패:', error);
    throw error;
  }
};

// 모든 meal flag 한번에 업데이트 (foods 컬렉션만 사용)
export const updateAllMealFlags = async (uid, mealFlags) => {
  try {
    const today = getTodayDate();
    const docRef = doc(db, 'users', uid, 'foods', today);
    
    const updateData = {};
    Object.keys(mealFlags).forEach(mealType => {
      updateData[`${mealType}.flag`] = mealFlags[mealType];
      updateData[`${mealType}.updatedAt`] = new Date().toISOString();
    });
    
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      await updateDoc(docRef, updateData);
    } else {
      // foods 문서가 없으면 기본 구조로 생성
      const newData = {
        date: today
      };
      Object.keys(mealFlags).forEach(mealType => {
        newData[mealType] = {
          flag: mealFlags[mealType],
          foods: [],
          estimatedCalories: null,
          actualCalories: null,
          selectedFoods: [],
          updatedAt: new Date().toISOString(),
        };
      });
      await setDoc(docRef, newData);
    }
    
    return true;
  } catch (error) {
    console.error('모든 meal flags 업데이트 실패:', error);
    throw error;
  }
};