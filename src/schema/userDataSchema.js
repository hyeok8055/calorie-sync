/**
 * 사용자 데이터 스키마 정의
 * Firebase Firestore: users/{email}
 * 
 * 사용자 개인정보, 설정값, 그룹 정보 등을 저장
 * 주요 변경사항: uid 대신 email을 primary key로 사용
 */

// 사용자 기본 정보 스키마
export const UserDataSchema = {
  // 이메일 주소 (Primary Key)
  email: {
    type: 'string',
    format: 'email',
    required: true,
    description: '사용자 이메일 주소 (Primary Key)'
  },
  
  // 사용자 ID (Firebase Auth UID) - 호환성을 위해 유지
  uid: {
    type: 'string',
    nullable: true,
    description: 'Firebase Authentication UID (호환성을 위해 유지)'
  },
  

  
  // 사용자 이름
  name: {
    type: 'string',
    required: true,
    description: '사용자 실명 또는 닉네임'
  },
  
  // 나이
  age: {
    type: 'number',
    minimum: 1,
    maximum: 150,
    nullable: true,
    description: '사용자 나이'
  },
  
  // 성별
  gender: {
    type: 'string',
    enum: ['male', 'female', 'other'],
    nullable: true,
    description: '사용자 성별 (male: 남성, female: 여성, other: 기타)'
  },
  
  // 신장 (cm)
  height: {
    type: 'number',
    minimum: 50,
    maximum: 300,
    nullable: true,
    description: '사용자 신장 (cm)'
  },
  
  // 체중 (kg) - 기본값, 실제 체중은 fitness 컬렉션에서 관리
  weight: {
    type: 'number',
    minimum: 10,
    maximum: 500,
    nullable: true,
    description: '사용자 기본 체중 (kg) - 최신 값은 fitness 컬렉션 참조'
  },
  
  // 목표 (다이어트, 유지, 증량 등)
  goal: {
    type: 'string',
    enum: ['lose_weight', 'maintain_weight', 'gain_weight', 'muscle_gain', 'health_improvement'],
    nullable: true,
    description: '사용자 목표 (lose_weight: 체중감량, maintain_weight: 체중유지, gain_weight: 체중증가, muscle_gain: 근육증가, health_improvement: 건강개선)'
  },
  
  // 소속 그룹 ID
  group: {
    type: 'string',
    nullable: true,
    description: '사용자가 속한 칼로리 편차 그룹 ID'
  },
  
  // 개인 칼로리 편향값
  calorieBias: {
    type: 'number',
    default: 0,
    description: '개인별 칼로리 편향값 (양수: 과대평가 경향, 음수: 과소평가 경향)'
  },
  
  // 선택된 날짜의 음식 문서 참조
  foodDocForSelectedDate: {
    type: 'object',
    nullable: true,
    description: '현재 선택된 날짜의 식사 데이터 (캐시용)'
  },
  
  // 사용자 설정
  settings: {
    type: 'object',
    properties: {
      // 알림 설정
      notifications: {
        type: 'object',
        properties: {
          mealReminder: {
            type: 'boolean',
            default: true,
            description: '식사 알림 활성화 여부'
          },
          calorieAlert: {
            type: 'boolean',
            default: true,
            description: '칼로리 초과/부족 알림 활성화 여부'
          },
          weeklyReport: {
            type: 'boolean',
            default: true,
            description: '주간 리포트 알림 활성화 여부'
          }
        }
      },
      
      // 개인화 설정
      preferences: {
        type: 'object',
        properties: {
          theme: {
            type: 'string',
            enum: ['light', 'dark', 'auto'],
            default: 'auto',
            description: '앱 테마 설정'
          },
          language: {
            type: 'string',
            enum: ['ko', 'en'],
            default: 'ko',
            description: '앱 언어 설정'
          },
          units: {
            type: 'object',
            properties: {
              weight: {
                type: 'string',
                enum: ['kg', 'lb'],
                default: 'kg',
                description: '체중 단위'
              },
              height: {
                type: 'string',
                enum: ['cm', 'ft'],
                default: 'cm',
                description: '신장 단위'
              }
            }
          }
        }
      },
      
      // 목표 칼로리 설정
      dailyCalorieGoal: {
        type: 'number',
        minimum: 800,
        maximum: 5000,
        nullable: true,
        description: '일일 목표 칼로리 (kcal)'
      },
      
      // 식사 시간 설정
      mealTimes: {
        type: 'object',
        properties: {
          breakfast: {
            type: 'string',
            format: 'time',
            default: '08:00',
            description: '아침 식사 시간 (HH:MM)'
          },
          lunch: {
            type: 'string',
            format: 'time',
            default: '12:00',
            description: '점심 식사 시간 (HH:MM)'
          },
          dinner: {
            type: 'string',
            format: 'time',
            default: '18:00',
            description: '저녁 식사 시간 (HH:MM)'
          }
        }
      }
    }
  },
  
  // 활동 수준
  activityLevel: {
    type: 'string',
    enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active'],
    nullable: true,
    description: '활동 수준 (sedentary: 좌식생활, lightly_active: 가벼운 활동, moderately_active: 보통 활동, very_active: 활발한 활동, extremely_active: 매우 활발한 활동)'
  },
  
  // 계정 생성 시간
  createdAt: {
    type: 'string',
    format: 'iso-date',
    required: true,
    description: '계정 생성 시간 (ISO 8601 형식)'
  },
  
  // 마지막 업데이트 시간
  updatedAt: {
    type: 'string',
    format: 'iso-date',
    description: '프로필 마지막 업데이트 시간 (ISO 8601 형식)'
  },
  
  // 마지막 로그인 시간
  lastLoginAt: {
    type: 'string',
    format: 'iso-date',
    description: '마지막 로그인 시간 (ISO 8601 형식)'
  },
  
  // 계정 상태
  status: {
    type: 'string',
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
    description: '계정 상태 (active: 활성, inactive: 비활성, suspended: 정지)'
  },
  
  // 이용약관 동의
  agreements: {
    type: 'object',
    properties: {
      termsOfService: {
        type: 'object',
        properties: {
          agreed: {
            type: 'boolean',
            required: true,
            description: '이용약관 동의 여부'
          },
          agreedAt: {
            type: 'string',
            format: 'iso-date',
            description: '동의 시간'
          },
          version: {
            type: 'string',
            description: '동의한 약관 버전'
          }
        }
      },
      privacyPolicy: {
        type: 'object',
        properties: {
          agreed: {
            type: 'boolean',
            required: true,
            description: '개인정보처리방침 동의 여부'
          },
          agreedAt: {
            type: 'string',
            format: 'iso-date',
            description: '동의 시간'
          },
          version: {
            type: 'string',
            description: '동의한 정책 버전'
          }
        }
      },
      marketingConsent: {
        type: 'object',
        properties: {
          agreed: {
            type: 'boolean',
            default: false,
            description: '마케팅 정보 수신 동의 여부'
          },
          agreedAt: {
            type: 'string',
            format: 'iso-date',
            nullable: true,
            description: '동의 시간'
          }
        }
      }
    }
  }
};

// 사용자 통계 정보 스키마 (별도 문서로 관리)
export const UserStatsSchema = {
  email: {
    type: 'string',
    format: 'email',
    required: true,
    description: '사용자 이메일 주소 (Primary Key)'
  },
  
  // 총 기록 일수
  totalDaysRecorded: {
    type: 'number',
    default: 0,
    description: '식사 기록을 작성한 총 일수'
  },
  
  // 연속 기록 일수
  currentStreak: {
    type: 'number',
    default: 0,
    description: '현재 연속 기록 일수'
  },
  
  // 최장 연속 기록 일수
  longestStreak: {
    type: 'number',
    default: 0,
    description: '최장 연속 기록 일수'
  },
  
  // 평균 일일 칼로리
  averageDailyCalories: {
    type: 'number',
    nullable: true,
    description: '평균 일일 섭취 칼로리'
  },
  
  // 목표 달성률
  goalAchievementRate: {
    type: 'number',
    minimum: 0,
    maximum: 100,
    nullable: true,
    description: '목표 칼로리 달성률 (%)'
  },
  
  // 마지막 통계 업데이트 시간
  lastUpdatedAt: {
    type: 'string',
    format: 'iso-date',
    description: '통계 마지막 업데이트 시간'
  }
};

// 성별 열거형
export const Gender = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other'
};

// 목표 열거형
export const Goals = {
  LOSE_WEIGHT: 'lose_weight',
  MAINTAIN_WEIGHT: 'maintain_weight',
  GAIN_WEIGHT: 'gain_weight',
  MUSCLE_GAIN: 'muscle_gain',
  HEALTH_IMPROVEMENT: 'health_improvement'
};

// 활동 수준 열거형
export const ActivityLevels = {
  SEDENTARY: 'sedentary',
  LIGHTLY_ACTIVE: 'lightly_active',
  MODERATELY_ACTIVE: 'moderately_active',
  VERY_ACTIVE: 'very_active',
  EXTREMELY_ACTIVE: 'extremely_active'
};

// 계정 상태 열거형
export const AccountStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended'
};

// 기본 사용자 데이터 생성 함수
export const createDefaultUserData = (email, name, uid = null) => {
  return {
    email,
    uid,
    name,
    age: null,
    gender: null,
    height: null,
    weight: null,
    goal: null,
    group: null,
    calorieBias: 0,
    foodDocForSelectedDate: null,
    settings: {
      notifications: {
        mealReminder: true,
        calorieAlert: true,
        weeklyReport: true
      },
      preferences: {
        theme: 'auto',
        language: 'ko',
        units: {
          weight: 'kg',
          height: 'cm'
        }
      },
      dailyCalorieGoal: null,
      mealTimes: {
        breakfast: '08:00',
        lunch: '12:00',
        dinner: '18:00'
      }
    },
    activityLevel: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    status: AccountStatus.ACTIVE,
    agreements: {
      termsOfService: {
        agreed: false,
        agreedAt: null,
        version: null
      },
      privacyPolicy: {
        agreed: false,
        agreedAt: null,
        version: null
      },
      marketingConsent: {
        agreed: false,
        agreedAt: null
      }
    }
  };
};

// BMR 계산 함수 (기초대사율)
export const calculateBMR = (gender, height, weight, age) => {
  if (!gender || !height || !weight || !age) {
    return null;
  }
  
  // Harris-Benedict 공식
  if (gender === Gender.MALE) {
    return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  } else if (gender === Gender.FEMALE) {
    return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  }
  
  return null;
};

// TDEE 계산 함수 (총 일일 에너지 소비량)
export const calculateTDEE = (bmr, activityLevel) => {
  if (!bmr || !activityLevel) {
    return null;
  }
  
  const activityMultipliers = {
    [ActivityLevels.SEDENTARY]: 1.2,
    [ActivityLevels.LIGHTLY_ACTIVE]: 1.375,
    [ActivityLevels.MODERATELY_ACTIVE]: 1.55,
    [ActivityLevels.VERY_ACTIVE]: 1.725,
    [ActivityLevels.EXTREMELY_ACTIVE]: 1.9
  };
  
  return bmr * (activityMultipliers[activityLevel] || 1.2);
};

// BMI 계산 함수
export const calculateBMI = (height, weight) => {
  if (!height || !weight || height <= 0 || weight <= 0) {
    return null;
  }
  
  const heightInMeters = height / 100;
  return Math.round((weight / (heightInMeters * heightInMeters)) * 100) / 100;
};

// 사용자 데이터 유효성 검사 함수
export const validateUserData = (userData) => {
  const errors = [];
  
  if (!userData) {
    errors.push('사용자 데이터가 없습니다.');
    return errors;
  }
  
  // 필수 필드 검사
  if (!userData.uid || typeof userData.uid !== 'string') {
    errors.push('사용자 ID가 필요합니다.');
  }
  
  if (!userData.email || typeof userData.email !== 'string') {
    errors.push('이메일 주소가 필요합니다.');
  }
  
  if (!userData.name || typeof userData.name !== 'string') {
    errors.push('사용자 이름이 필요합니다.');
  }
  
  // 선택적 필드 유효성 검사
  if (userData.age !== null && (typeof userData.age !== 'number' || userData.age < 1 || userData.age > 150)) {
    errors.push('올바른 나이를 입력해주세요 (1-150).');
  }
  
  if (userData.height !== null && (typeof userData.height !== 'number' || userData.height < 50 || userData.height > 300)) {
    errors.push('올바른 신장을 입력해주세요 (50-300cm).');
  }
  
  if (userData.weight !== null && (typeof userData.weight !== 'number' || userData.weight < 10 || userData.weight > 500)) {
    errors.push('올바른 체중을 입력해주세요 (10-500kg).');
  }
  
  return errors;
};