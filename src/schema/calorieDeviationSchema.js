/**
 * 칼로리 편차 설정 스키마 정의
 * Firebase Firestore: 
 * - groupDeviationSettings/{groupId}
 * - personalCalorieBias/{uid}
 * - deviationConfig (전역 설정)
 * 
 * 그룹별, 개인별 칼로리 편차 설정을 관리
 */

// 그룹 편차 설정 스키마
export const GroupDeviationSettingsSchema = {
  // 그룹 ID
  groupId: {
    type: 'string',
    required: true,
    description: '그룹 고유 식별자'
  },
  
  // 편차 타입
  type: {
    type: 'string',
    enum: ['fixed', 'percentage', 'adaptive'],
    required: true,
    description: '편차 적용 방식 (fixed: 고정값, percentage: 비율, adaptive: 적응형)'
  },
  
  // 편차 값
  value: {
    type: 'number',
    required: true,
    description: '편차 값 (type에 따라 절대값 또는 비율)'
  },
  
  // 기본 편차값
  defaultDeviation: {
    type: 'number',
    default: 0,
    description: '기본 편차값 (kcal)'
  },
  
  // 편차 배수
  deviationMultiplier: {
    type: 'number',
    default: 0.2,
    minimum: 0,
    maximum: 2.0,
    description: '편차 적용 배수 (0.0 ~ 2.0)'
  },
  
  // 적용 가능한 날짜 범위
  applicableDate: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        format: 'date',
        description: '편차 적용 시작 날짜 (YYYY-MM-DD)'
      },
      endDate: {
        type: 'string',
        format: 'date',
        nullable: true,
        description: '편차 적용 종료 날짜 (YYYY-MM-DD, null이면 무제한)'
      }
    }
  },
  
  // 적용 대상 식사 타입
  applicableMealTypes: {
    type: 'array',
    items: {
      type: 'string',
      enum: ['breakfast', 'lunch', 'dinner', 'snacks']
    },
    default: ['breakfast', 'lunch', 'dinner'],
    description: '편차를 적용할 식사 타입 목록'
  },
  
  // 최소/최대 편차 제한
  deviationLimits: {
    type: 'object',
    properties: {
      minDeviation: {
        type: 'number',
        nullable: true,
        description: '최소 편차값 (kcal)'
      },
      maxDeviation: {
        type: 'number',
        nullable: true,
        description: '최대 편차값 (kcal)'
      }
    }
  },
  
  // 활성화 여부
  isActive: {
    type: 'boolean',
    default: true,
    description: '편차 설정 활성화 여부'
  },
  
  // 생성자 정보
  createdBy: {
    type: 'string',
    required: true,
    description: '설정을 생성한 관리자 UID'
  },
  
  // 생성 시간
  createdAt: {
    type: 'string',
    format: 'iso-date',
    required: true,
    description: '설정 생성 시간 (ISO 8601 형식)'
  },
  
  // 마지막 수정자
  updatedBy: {
    type: 'string',
    description: '설정을 마지막으로 수정한 관리자 UID'
  },
  
  // 마지막 수정 시간
  updatedAt: {
    type: 'string',
    format: 'iso-date',
    description: '설정 마지막 수정 시간 (ISO 8601 형식)'
  }
};

// 개인 칼로리 편향 스키마
export const PersonalCalorieBiasSchema = {
  // 사용자 ID
  uid: {
    type: 'string',
    required: true,
    description: '사용자 고유 식별자'
  },
  
  // 개인 편향값
  bias: {
    type: 'number',
    default: 0,
    description: '개인 칼로리 편향값 (양수: 과대평가 경향, 음수: 과소평가 경향)'
  },
  
  // 편향값 계산 기준
  calculationBasis: {
    type: 'object',
    properties: {
      totalMeals: {
        type: 'number',
        default: 0,
        description: '편향값 계산에 사용된 총 식사 수'
      },
      averageError: {
        type: 'number',
        default: 0,
        description: '평균 칼로리 예측 오차 (kcal)'
      },
      standardDeviation: {
        type: 'number',
        default: 0,
        description: '칼로리 예측 오차의 표준편차'
      },
      lastCalculatedAt: {
        type: 'string',
        format: 'iso-date',
        description: '편향값 마지막 계산 시간'
      }
    }
  },
  
  // 편향값 적용 설정
  applicationSettings: {
    type: 'object',
    properties: {
      isEnabled: {
        type: 'boolean',
        default: true,
        description: '개인 편향값 적용 활성화 여부'
      },
      adaptiveAdjustment: {
        type: 'boolean',
        default: true,
        description: '적응형 편향값 조정 활성화 여부'
      },
      adjustmentRate: {
        type: 'number',
        default: 0.1,
        minimum: 0,
        maximum: 1,
        description: '편향값 조정 비율 (0.0 ~ 1.0)'
      }
    }
  },
  
  // 생성 시간
  createdAt: {
    type: 'string',
    format: 'iso-date',
    required: true,
    description: '편향값 설정 생성 시간'
  },
  
  // 마지막 업데이트 시간
  updatedAt: {
    type: 'string',
    format: 'iso-date',
    description: '편향값 설정 마지막 업데이트 시간'
  }
};

// 편차 적용 기록 스키마
export const DeviationApplicationSchema = {
  // 적용 ID
  applicationId: {
    type: 'string',
    required: true,
    description: '편차 적용 고유 식별자'
  },
  
  // 사용자 ID
  uid: {
    type: 'string',
    required: true,
    description: '편차가 적용된 사용자 ID'
  },
  
  // 식사 날짜
  mealDate: {
    type: 'string',
    format: 'date',
    required: true,
    description: '편차가 적용된 식사 날짜 (YYYY-MM-DD)'
  },
  
  // 식사 타입
  mealType: {
    type: 'string',
    enum: ['breakfast', 'lunch', 'dinner', 'snacks'],
    required: true,
    description: '편차가 적용된 식사 타입'
  },
  
  // 적용된 편차 정보
  appliedDeviation: {
    type: 'object',
    required: true,
    properties: {
      // 그룹 편차
      groupDeviation: {
        type: 'number',
        default: 0,
        description: '적용된 그룹 편차값 (kcal)'
      },
      
      // 개인 편향
      personalBias: {
        type: 'number',
        default: 0,
        description: '적용된 개인 편향값 (kcal)'
      },
      
      // 총 편차
      totalDeviation: {
        type: 'number',
        required: true,
        description: '총 적용된 편차값 (kcal)'
      },
      
      // 편차 적용 전 칼로리
      originalCalories: {
        type: 'object',
        properties: {
          estimated: {
            type: 'number',
            nullable: true,
            description: '편차 적용 전 예상 칼로리'
          },
          actual: {
            type: 'number',
            nullable: true,
            description: '편차 적용 전 실제 칼로리'
          }
        }
      },
      
      // 편차 적용 후 칼로리
      adjustedCalories: {
        type: 'object',
        properties: {
          estimated: {
            type: 'number',
            nullable: true,
            description: '편차 적용 후 예상 칼로리'
          },
          actual: {
            type: 'number',
            nullable: true,
            description: '편차 적용 후 실제 칼로리'
          }
        }
      }
    }
  },
  
  // 적용 소스
  source: {
    type: 'string',
    enum: ['group', 'personal', 'admin', 'system'],
    required: true,
    description: '편차 적용 소스 (group: 그룹 설정, personal: 개인 설정, admin: 관리자, system: 시스템)'
  },
  
  // 적용자
  appliedBy: {
    type: 'string',
    enum: ['user', 'admin', 'system'],
    required: true,
    description: '편차를 적용한 주체'
  },
  
  // 적용 시간
  appliedAt: {
    type: 'string',
    format: 'iso-date',
    required: true,
    description: '편차 적용 시간 (ISO 8601 형식)'
  },
  
  // 적용 이유/메모
  reason: {
    type: 'string',
    nullable: true,
    description: '편차 적용 이유 또는 메모'
  }
};

// 전역 편차 설정 스키마
export const GlobalDeviationConfigSchema = {
  // 편차 시스템 활성화 여부
  isEnabled: {
    type: 'boolean',
    default: true,
    description: '전체 편차 시스템 활성화 여부'
  },
  
  // 기본 편차 설정
  defaultSettings: {
    type: 'object',
    properties: {
      deviationMultiplier: {
        type: 'number',
        default: 0.2,
        description: '기본 편차 배수'
      },
      maxDeviationPercentage: {
        type: 'number',
        default: 50,
        description: '최대 편차 비율 (%)'
      },
      minMealsForBias: {
        type: 'number',
        default: 10,
        description: '개인 편향값 계산을 위한 최소 식사 수'
      }
    }
  },
  
  // 자동 조정 설정
  autoAdjustment: {
    type: 'object',
    properties: {
      isEnabled: {
        type: 'boolean',
        default: true,
        description: '자동 편차 조정 활성화 여부'
      },
      adjustmentInterval: {
        type: 'number',
        default: 7,
        description: '자동 조정 주기 (일)'
      },
      learningRate: {
        type: 'number',
        default: 0.1,
        description: '학습률 (0.0 ~ 1.0)'
      }
    }
  },
  
  // 마지막 업데이트 정보
  lastUpdatedBy: {
    type: 'string',
    description: '마지막 수정자 UID'
  },
  
  lastUpdatedAt: {
    type: 'string',
    format: 'iso-date',
    description: '마지막 수정 시간'
  }
};

// 편차 타입 열거형
export const DeviationTypes = {
  FIXED: 'fixed',
  PERCENTAGE: 'percentage',
  ADAPTIVE: 'adaptive'
};

// 편차 적용 소스 열거형
export const DeviationSources = {
  GROUP: 'group',
  PERSONAL: 'personal',
  ADMIN: 'admin',
  SYSTEM: 'system'
};

// 편차 적용자 열거형
export const DeviationAppliedBy = {
  USER: 'user',
  ADMIN: 'admin',
  SYSTEM: 'system'
};

// 식사 타입 열거형
export const MealTypes = {
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  DINNER: 'dinner',
  SNACKS: 'snacks'
};

// 기본 그룹 편차 설정 생성 함수
export const createDefaultGroupDeviationSettings = (groupId, createdBy) => {
  return {
    groupId,
    type: DeviationTypes.PERCENTAGE,
    value: 20, // 20% 편차
    defaultDeviation: 0,
    deviationMultiplier: 0.2,
    applicableDate: {
      startDate: new Date().toISOString().split('T')[0],
      endDate: null
    },
    applicableMealTypes: [MealTypes.BREAKFAST, MealTypes.LUNCH, MealTypes.DINNER],
    deviationLimits: {
      minDeviation: -500,
      maxDeviation: 500
    },
    isActive: true,
    createdBy,
    createdAt: new Date().toISOString()
  };
};

// 기본 개인 편향 설정 생성 함수
export const createDefaultPersonalCalorieBias = (uid) => {
  return {
    uid,
    bias: 0,
    calculationBasis: {
      totalMeals: 0,
      averageError: 0,
      standardDeviation: 0,
      lastCalculatedAt: null
    },
    applicationSettings: {
      isEnabled: true,
      adaptiveAdjustment: true,
      adjustmentRate: 0.1
    },
    createdAt: new Date().toISOString()
  };
};

// 편차 계산 함수
export const calculateDeviation = (originalCalories, groupSettings, personalBias = 0) => {
  if (!originalCalories || !groupSettings) {
    return 0;
  }
  
  let deviation = 0;
  
  // 그룹 편차 계산
  switch (groupSettings.type) {
    case DeviationTypes.FIXED:
      deviation = groupSettings.value;
      break;
    case DeviationTypes.PERCENTAGE:
      deviation = originalCalories * (groupSettings.value / 100);
      break;
    case DeviationTypes.ADAPTIVE:
      // 적응형 편차는 별도 로직 필요
      deviation = groupSettings.defaultDeviation;
      break;
    default:
      deviation = 0;
  }
  
  // 편차 배수 적용
  deviation *= groupSettings.deviationMultiplier;
  
  // 개인 편향 추가
  deviation += personalBias;
  
  // 편차 제한 적용
  if (groupSettings.deviationLimits) {
    if (groupSettings.deviationLimits.minDeviation !== null) {
      deviation = Math.max(deviation, groupSettings.deviationLimits.minDeviation);
    }
    if (groupSettings.deviationLimits.maxDeviation !== null) {
      deviation = Math.min(deviation, groupSettings.deviationLimits.maxDeviation);
    }
  }
  
  return Math.round(deviation);
};

// 편차 적용 함수
export const applyDeviationToCalories = (originalCalories, deviation) => {
  if (!originalCalories) {
    return originalCalories;
  }
  
  return {
    estimated: originalCalories.estimated ? originalCalories.estimated + deviation : null,
    actual: originalCalories.actual ? originalCalories.actual + deviation : null
  };
};

// 편차 설정 유효성 검사 함수
export const validateDeviationSettings = (settings) => {
  const errors = [];
  
  if (!settings) {
    errors.push('편차 설정이 없습니다.');
    return errors;
  }
  
  if (!settings.groupId || typeof settings.groupId !== 'string') {
    errors.push('그룹 ID가 필요합니다.');
  }
  
  if (!Object.values(DeviationTypes).includes(settings.type)) {
    errors.push('올바른 편차 타입을 선택해주세요.');
  }
  
  if (typeof settings.value !== 'number') {
    errors.push('편차 값이 필요합니다.');
  }
  
  if (typeof settings.deviationMultiplier !== 'number' || settings.deviationMultiplier < 0 || settings.deviationMultiplier > 2) {
    errors.push('편차 배수는 0.0 ~ 2.0 사이의 값이어야 합니다.');
  }
  
  return errors;
};