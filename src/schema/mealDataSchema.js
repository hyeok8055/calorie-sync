/**
 * 식사 데이터 스키마 정의
 * Firebase Firestore: users/{uid}/foods/{date}
 * 
 * 각 날짜별로 아침, 점심, 저녁, 간식 데이터를 저장
 */

// 개별 식사 타입 스키마 (breakfast, lunch, dinner)
export const MealTypeSchema = {
  // 식사 완료 플래그 (0: 미완료, 1: 완료)
  flag: {
    type: 'number',
    required: true,
    default: 0,
    description: '식사 기록 완료 여부 (0: 미완료, 1: 완료)'
  },
  
  // 섭취한 음식 목록
  foods: {
    type: 'array',
    required: true,
    default: [],
    items: {
      name: {
        type: 'string',
        required: true,
        description: '음식 이름'
      },
      calories: {
        type: 'number',
        required: true,
        description: '음식 칼로리 (kcal)'
      },
      weight: {
        type: 'number',
        required: true,
        description: '음식 중량 (g)'
      },
      portion: {
        type: 'number',
        default: 1,
        description: '섭취 분량 (배수)'
      },
      nutrients: {
        type: 'object',
        required: true,
        properties: {
          carbs: {
            type: 'number',
            default: 0,
            description: '탄수화물 (g)'
          },
          protein: {
            type: 'number',
            default: 0,
            description: '단백질 (g)'
          },
          fat: {
            type: 'number',
            default: 0,
            description: '지방 (g)'
          }
        }
      }
    }
  },
  
  // 원본 칼로리 정보 (새로운 구조)
  originalCalories: {
    type: 'object',
    required: true,
    properties: {
      estimated: {
        type: 'number',
        nullable: true,
        description: '예상 칼로리 (사용자가 예측한 값)'
      },
      actual: {
        type: 'number',
        nullable: true,
        description: '실제 칼로리 (사용자가 입력한 실제 섭취 값)'
      }
    }
  },
  
  // 최종 칼로리 정보 (편차 적용 후)
  finalCalories: {
    type: 'object',
    required: true,
    properties: {
      estimated: {
        type: 'number',
        nullable: true,
        description: '편차 적용된 예상 칼로리'
      },
      actual: {
        type: 'number',
        nullable: true,
        description: '편차 적용된 실제 칼로리'
      }
    }
  },
  
  // 칼로리 편차 정보
  calorieDeviation: {
    type: 'object',
    required: true,
    properties: {
      natural: {
        type: 'number',
        default: 0,
        description: '자연 편차 (실제 - 예상 칼로리)'
      },
      applied: {
        type: 'number',
        default: 0,
        description: '적용된 편차 (그룹/개인 설정 반영)'
      },
      groupSettings: {
        type: 'object',
        nullable: true,
        description: '편차 계산 시 사용된 그룹 설정'
      },
      personalBias: {
        type: 'number',
        default: 0,
        description: '개인 편향값'
      }
    }
  },
  
  // 선택된 음식 목록 (UI에서 선택한 음식들)
  selectedFoods: {
    type: 'array',
    required: true,
    default: [],
    description: '사용자가 선택한 음식 목록'
  },
  
  // 그룹 편차 설정 정보
  groupDeviationConfig: {
    type: 'object',
    nullable: true,
    properties: {
      groupId: {
        type: 'string',
        required: true,
        description: '그룹 ID'
      },
      deviationMultiplier: {
        type: 'number',
        default: 0.2,
        description: '편차 배수 (기본값: 0.2)'
      },
      defaultDeviation: {
        type: 'number',
        default: 0,
        description: '기본 편차값'
      },
      appliedAt: {
        type: 'string',
        format: 'iso-date',
        description: '적용 시간 (ISO 8601 형식)'
      },
      appliedBy: {
        type: 'string',
        enum: ['user', 'admin'],
        description: '적용자 (user: 사용자, admin: 관리자)'
      }
    }
  },
  
  // 업데이트 시간
  updatedAt: {
    type: 'string',
    format: 'iso-date',
    required: true,
    description: '마지막 업데이트 시간 (ISO 8601 형식)'
  },
  
  // 레거시 필드들 (하위 호환성)
  estimatedCalories: {
    type: 'number',
    nullable: true,
    deprecated: true,
    description: '레거시: 예상 칼로리 (originalCalories.estimated 사용 권장)'
  },
  actualCalories: {
    type: 'number',
    nullable: true,
    deprecated: true,
    description: '레거시: 실제 칼로리 (originalCalories.actual 사용 권장)'
  },
  offset: {
    type: 'number',
    nullable: true,
    deprecated: true,
    description: '레거시: 편차값 (calorieDeviation.applied 사용 권장)'
  }
};

// 간식 스키마 (flag 필드 없음)
export const SnackSchema = {
  ...MealTypeSchema
};
delete SnackSchema.flag;

// 전체 식사 데이터 스키마
export const DailyMealDataSchema = {
  // 날짜 (YYYY-MM-DD 형식)
  date: {
    type: 'string',
    format: 'date',
    required: true,
    description: '식사 날짜 (YYYY-MM-DD 형식)'
  },
  
  // 아침 식사
  breakfast: {
    type: 'object',
    required: true,
    properties: MealTypeSchema
  },
  
  // 점심 식사
  lunch: {
    type: 'object',
    required: true,
    properties: MealTypeSchema
  },
  
  // 저녁 식사
  dinner: {
    type: 'object',
    required: true,
    properties: MealTypeSchema
  },
  
  // 간식
  snacks: {
    type: 'object',
    required: true,
    properties: SnackSchema
  },
  
  // 전체 업데이트 시간
  updatedAt: {
    type: 'string',
    format: 'iso-date',
    description: '문서 전체 업데이트 시간'
  }
};

// 식사 타입 열거형
export const MealTypes = {
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  DINNER: 'dinner',
  SNACKS: 'snacks'
};

// 식사 완료 플래그 열거형
export const MealFlags = {
  INCOMPLETE: 0,
  COMPLETE: 1
};

// 편차 적용자 열거형
export const DeviationAppliedBy = {
  USER: 'user',
  ADMIN: 'admin'
};

// 기본 식사 데이터 생성 함수
export const createDefaultMealData = (date) => {
  const defaultMeal = {
    flag: MealFlags.INCOMPLETE,
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
  };
  
  const defaultSnack = { ...defaultMeal };
  delete defaultSnack.flag;
  
  return {
    date,
    breakfast: { ...defaultMeal },
    lunch: { ...defaultMeal },
    dinner: { ...defaultMeal },
    snacks: defaultSnack
  };
};

// 식사 데이터 유효성 검사 함수
export const validateMealData = (mealData, mealType) => {
  const errors = [];
  
  if (!mealData) {
    errors.push('식사 데이터가 없습니다.');
    return errors;
  }
  
  // 필수 필드 검사
  if (mealType !== MealTypes.SNACKS && typeof mealData.flag !== 'number') {
    errors.push('flag 필드가 필요합니다.');
  }
  
  if (!Array.isArray(mealData.foods)) {
    errors.push('foods 필드는 배열이어야 합니다.');
  }
  
  if (!mealData.originalCalories || typeof mealData.originalCalories !== 'object') {
    errors.push('originalCalories 필드가 필요합니다.');
  }
  
  if (!mealData.calorieDeviation || typeof mealData.calorieDeviation !== 'object') {
    errors.push('calorieDeviation 필드가 필요합니다.');
  }
  
  return errors;
};