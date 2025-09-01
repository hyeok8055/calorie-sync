/**
 * 음식 데이터 스키마 정의
 * Firebase Realtime Database: foods/{foodId}
 * 
 * 개별 음식 정보를 저장하는 스키마
 */

// 개별 음식 데이터 스키마
export const FoodDataSchema = {
  // 음식 이름
  name: {
    type: 'string',
    required: true,
    description: '음식 이름 (예: "삼겹살", "김치찌개")'
  },
  
  // 칼로리 정보
  calories: {
    type: 'number',
    required: true,
    minimum: 0,
    description: '100g당 칼로리 (kcal)'
  },
  
  // 영양소 정보
  nutrients: {
    type: 'object',
    required: true,
    properties: {
      carbs: {
        type: 'number',
        minimum: 0,
        default: 0,
        description: '탄수화물 함량 (g per 100g)'
      },
      protein: {
        type: 'number',
        minimum: 0,
        default: 0,
        description: '단백질 함량 (g per 100g)'
      },
      fat: {
        type: 'number',
        minimum: 0,
        default: 0,
        description: '지방 함량 (g per 100g)'
      }
    }
  },
  
  // 음식 중량 (기준량)
  weight: {
    type: 'number',
    required: true,
    minimum: 0,
    description: '기준 중량 (g) - 보통 100g'
  },
  
  // 브랜드 정보
  brand: {
    type: 'string',
    nullable: true,
    description: '브랜드명 (예: "CJ제일제당", "농심")'
  },
  
  // 1회 제공량 정보
  serving: {
    type: 'object',
    nullable: true,
    properties: {
      size: {
        type: 'number',
        minimum: 0,
        description: '1회 제공량 크기 (g)'
      },
      unit: {
        type: 'string',
        description: '단위 (예: "개", "컵", "그릇")'
      },
      description: {
        type: 'string',
        description: '제공량 설명 (예: "중간 크기 1개")'
      }
    }
  },
  
  // 생성 시간
  createdAt: {
    type: 'string',
    format: 'iso-date',
    required: true,
    description: '음식 데이터 생성 시간 (ISO 8601 형식)'
  },
  
  // 업데이트 시간
  updatedAt: {
    type: 'string',
    format: 'iso-date',
    description: '음식 데이터 수정 시간 (ISO 8601 형식)'
  },
  
  // 데이터 소스
  source: {
    type: 'string',
    enum: ['user', 'api', 'admin'],
    default: 'user',
    description: '데이터 출처 (user: 사용자 입력, api: API 조회, admin: 관리자 입력)'
  },
  
  // API 관련 정보 (API에서 가져온 경우)
  apiInfo: {
    type: 'object',
    nullable: true,
    properties: {
      apiSource: {
        type: 'string',
        description: 'API 제공자 (예: "식품의약품안전처")'
      },
      apiId: {
        type: 'string',
        description: 'API에서의 음식 ID'
      },
      fetchedAt: {
        type: 'string',
        format: 'iso-date',
        description: 'API에서 가져온 시간'
      }
    }
  },
  
  // 카테고리 정보
  category: {
    type: 'string',
    nullable: true,
    description: '음식 카테고리 (예: "한식", "양식", "중식", "간식")'
  },
  
  // 검색 키워드
  searchKeywords: {
    type: 'array',
    items: {
      type: 'string'
    },
    description: '검색을 위한 키워드 목록'
  },
  
  // 사용자 정의 태그
  tags: {
    type: 'array',
    items: {
      type: 'string'
    },
    description: '사용자가 추가한 태그 목록'
  },
  
  // 즐겨찾기 여부
  isFavorite: {
    type: 'boolean',
    default: false,
    description: '즐겨찾기 음식 여부'
  },
  
  // 사용 빈도
  usageCount: {
    type: 'number',
    default: 0,
    minimum: 0,
    description: '사용자가 선택한 횟수'
  },
  
  // 마지막 사용 시간
  lastUsedAt: {
    type: 'string',
    format: 'iso-date',
    nullable: true,
    description: '마지막으로 선택한 시간'
  }
};

// 음식 검색 결과 스키마 (API 응답용)
export const FoodSearchResultSchema = {
  // 검색된 음식 목록
  foods: {
    type: 'array',
    items: FoodDataSchema,
    description: '검색된 음식 목록'
  },
  
  // 검색 메타데이터
  metadata: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '검색 쿼리'
      },
      totalCount: {
        type: 'number',
        description: '전체 검색 결과 수'
      },
      page: {
        type: 'number',
        description: '현재 페이지'
      },
      pageSize: {
        type: 'number',
        description: '페이지당 결과 수'
      },
      searchedAt: {
        type: 'string',
        format: 'iso-date',
        description: '검색 실행 시간'
      }
    }
  }
};

// 음식 영양소 계산 스키마
export const FoodNutritionCalculationSchema = {
  // 기본 음식 정보
  foodId: {
    type: 'string',
    required: true,
    description: '음식 ID'
  },
  
  name: {
    type: 'string',
    required: true,
    description: '음식 이름'
  },
  
  // 섭취량 정보
  consumedWeight: {
    type: 'number',
    required: true,
    minimum: 0,
    description: '실제 섭취한 중량 (g)'
  },
  
  portion: {
    type: 'number',
    default: 1,
    minimum: 0,
    description: '섭취 분량 배수'
  },
  
  // 계산된 영양소
  calculatedNutrition: {
    type: 'object',
    required: true,
    properties: {
      calories: {
        type: 'number',
        minimum: 0,
        description: '계산된 칼로리 (kcal)'
      },
      carbs: {
        type: 'number',
        minimum: 0,
        description: '계산된 탄수화물 (g)'
      },
      protein: {
        type: 'number',
        minimum: 0,
        description: '계산된 단백질 (g)'
      },
      fat: {
        type: 'number',
        minimum: 0,
        description: '계산된 지방 (g)'
      }
    }
  }
};

// 음식 데이터 소스 열거형
export const FoodDataSources = {
  USER: 'user',
  API: 'api',
  ADMIN: 'admin'
};

// 음식 카테고리 열거형
export const FoodCategories = {
  KOREAN: '한식',
  WESTERN: '양식',
  CHINESE: '중식',
  JAPANESE: '일식',
  SNACK: '간식',
  BEVERAGE: '음료',
  DESSERT: '디저트',
  FAST_FOOD: '패스트푸드',
  HOME_COOKING: '가정식',
  RESTAURANT: '외식'
};

// 기본 음식 데이터 생성 함수
export const createDefaultFoodData = (name, calories, nutrients = {}) => {
  return {
    name,
    calories,
    nutrients: {
      carbs: nutrients.carbs || 0,
      protein: nutrients.protein || 0,
      fat: nutrients.fat || 0
    },
    weight: 100, // 기본 100g
    brand: null,
    serving: null,
    createdAt: new Date().toISOString(),
    source: FoodDataSources.USER,
    apiInfo: null,
    category: null,
    searchKeywords: [name.toLowerCase()],
    tags: [],
    isFavorite: false,
    usageCount: 0,
    lastUsedAt: null
  };
};

// 영양소 계산 함수
export const calculateNutrition = (foodData, consumedWeight, portion = 1) => {
  const baseWeight = foodData.weight || 100;
  const ratio = (consumedWeight * portion) / baseWeight;
  
  return {
    calories: Math.round(foodData.calories * ratio * 100) / 100,
    carbs: Math.round(foodData.nutrients.carbs * ratio * 100) / 100,
    protein: Math.round(foodData.nutrients.protein * ratio * 100) / 100,
    fat: Math.round(foodData.nutrients.fat * ratio * 100) / 100
  };
};

// 음식 데이터 유효성 검사 함수
export const validateFoodData = (foodData) => {
  const errors = [];
  
  if (!foodData) {
    errors.push('음식 데이터가 없습니다.');
    return errors;
  }
  
  // 필수 필드 검사
  if (!foodData.name || typeof foodData.name !== 'string') {
    errors.push('음식 이름이 필요합니다.');
  }
  
  if (typeof foodData.calories !== 'number' || foodData.calories < 0) {
    errors.push('올바른 칼로리 값이 필요합니다.');
  }
  
  if (!foodData.nutrients || typeof foodData.nutrients !== 'object') {
    errors.push('영양소 정보가 필요합니다.');
  } else {
    const { carbs, protein, fat } = foodData.nutrients;
    if (typeof carbs !== 'number' || carbs < 0) {
      errors.push('올바른 탄수화물 값이 필요합니다.');
    }
    if (typeof protein !== 'number' || protein < 0) {
      errors.push('올바른 단백질 값이 필요합니다.');
    }
    if (typeof fat !== 'number' || fat < 0) {
      errors.push('올바른 지방 값이 필요합니다.');
    }
  }
  
  if (typeof foodData.weight !== 'number' || foodData.weight <= 0) {
    errors.push('올바른 중량 값이 필요합니다.');
  }
  
  return errors;
};

// 음식 검색 키워드 생성 함수
export const generateSearchKeywords = (foodData) => {
  const keywords = new Set();
  
  // 음식 이름 기반 키워드
  if (foodData.name) {
    keywords.add(foodData.name.toLowerCase());
    // 공백으로 분리된 단어들
    foodData.name.toLowerCase().split(/\s+/).forEach(word => {
      if (word.length > 1) keywords.add(word);
    });
  }
  
  // 브랜드 기반 키워드
  if (foodData.brand) {
    keywords.add(foodData.brand.toLowerCase());
  }
  
  // 카테고리 기반 키워드
  if (foodData.category) {
    keywords.add(foodData.category.toLowerCase());
  }
  
  // 태그 기반 키워드
  if (foodData.tags && Array.isArray(foodData.tags)) {
    foodData.tags.forEach(tag => {
      keywords.add(tag.toLowerCase());
    });
  }
  
  return Array.from(keywords);
};