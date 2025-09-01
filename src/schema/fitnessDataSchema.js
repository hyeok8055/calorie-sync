/**
 * 피트니스 데이터 스키마 정의
 * Firebase Firestore: users/{uid}/fitness/{date}
 * 
 * 운동 기록, 체중 기록, BMI 계산 등 피트니스 관련 데이터를 저장
 */

// 개별 운동 기록 스키마
export const ExerciseRecordSchema = {
  // 운동 ID (고유 식별자)
  exerciseId: {
    type: 'string',
    required: true,
    description: '운동 기록 고유 식별자'
  },
  
  // 운동 타입/이름
  exerciseType: {
    type: 'string',
    required: true,
    description: '운동 종류 (예: "러닝", "웨이트 트레이닝", "요가")'
  },
  
  // 운동 지속 시간 (분)
  duration: {
    type: 'number',
    required: true,
    minimum: 1,
    description: '운동 지속 시간 (분)'
  },
  
  // 소모 칼로리 (추정값)
  caloriesBurned: {
    type: 'number',
    minimum: 0,
    nullable: true,
    description: '소모된 칼로리 (kcal) - 자동 계산 또는 사용자 입력'
  },
  
  // 운동 강도
  intensity: {
    type: 'string',
    enum: ['low', 'moderate', 'high', 'very_high'],
    nullable: true,
    description: '운동 강도 (low: 낮음, moderate: 보통, high: 높음, very_high: 매우 높음)'
  },
  
  // 운동 세부 정보
  details: {
    type: 'object',
    nullable: true,
    properties: {
      // 거리 (러닝, 사이클링 등)
      distance: {
        type: 'number',
        minimum: 0,
        description: '운동 거리 (km)'
      },
      
      // 속도 (러닝, 사이클링 등)
      averageSpeed: {
        type: 'number',
        minimum: 0,
        description: '평균 속도 (km/h)'
      },
      
      // 심박수 정보
      heartRate: {
        type: 'object',
        properties: {
          average: {
            type: 'number',
            minimum: 30,
            maximum: 220,
            description: '평균 심박수 (bpm)'
          },
          maximum: {
            type: 'number',
            minimum: 30,
            maximum: 220,
            description: '최대 심박수 (bpm)'
          }
        }
      },
      
      // 웨이트 트레이닝 정보
      weightTraining: {
        type: 'object',
        properties: {
          sets: {
            type: 'number',
            minimum: 1,
            description: '세트 수'
          },
          reps: {
            type: 'number',
            minimum: 1,
            description: '반복 횟수'
          },
          weight: {
            type: 'number',
            minimum: 0,
            description: '사용 중량 (kg)'
          }
        }
      },
      
      // 기타 메모
      notes: {
        type: 'string',
        description: '운동에 대한 추가 메모'
      }
    }
  },
  
  // 운동 시작 시간
  startTime: {
    type: 'string',
    format: 'iso-date',
    nullable: true,
    description: '운동 시작 시간 (ISO 8601 형식)'
  },
  
  // 운동 종료 시간
  endTime: {
    type: 'string',
    format: 'iso-date',
    nullable: true,
    description: '운동 종료 시간 (ISO 8601 형식)'
  },
  
  // 기록 생성 시간
  createdAt: {
    type: 'string',
    format: 'iso-date',
    required: true,
    description: '운동 기록 생성 시간'
  }
};

// 일일 피트니스 데이터 스키마
export const DailyFitnessDataSchema = {
  // 사용자 ID
  uid: {
    type: 'string',
    required: true,
    description: '사용자 고유 식별자'
  },
  
  // 기록 날짜
  date: {
    type: 'string',
    format: 'date',
    required: true,
    description: '피트니스 기록 날짜 (YYYY-MM-DD)'
  },
  
  // 체중 기록
  weight: {
    type: 'number',
    minimum: 10,
    maximum: 500,
    nullable: true,
    description: '당일 체중 (kg)'
  },
  
  // 체중 측정 시간
  weightMeasuredAt: {
    type: 'string',
    format: 'iso-date',
    nullable: true,
    description: '체중 측정 시간'
  },
  
  // BMI (자동 계산)
  bmi: {
    type: 'number',
    minimum: 10,
    maximum: 100,
    nullable: true,
    description: 'BMI 지수 (자동 계산)'
  },
  
  // 운동 기록 목록
  exercises: {
    type: 'array',
    items: ExerciseRecordSchema,
    default: [],
    description: '당일 운동 기록 목록'
  },
  
  // 총 운동 시간 (분)
  totalExerciseTime: {
    type: 'number',
    minimum: 0,
    default: 0,
    description: '총 운동 시간 (분) - 자동 계산'
  },
  
  // 총 소모 칼로리
  totalCaloriesBurned: {
    type: 'number',
    minimum: 0,
    default: 0,
    description: '총 소모 칼로리 (kcal) - 자동 계산'
  },
  
  // 걸음 수 (만보계 연동)
  steps: {
    type: 'number',
    minimum: 0,
    nullable: true,
    description: '당일 걸음 수'
  },
  
  // 수면 정보
  sleep: {
    type: 'object',
    nullable: true,
    properties: {
      duration: {
        type: 'number',
        minimum: 0,
        maximum: 24,
        description: '수면 시간 (시간)'
      },
      quality: {
        type: 'string',
        enum: ['poor', 'fair', 'good', 'excellent'],
        description: '수면 질 (poor: 나쁨, fair: 보통, good: 좋음, excellent: 매우 좋음)'
      },
      bedTime: {
        type: 'string',
        format: 'iso-date',
        description: '취침 시간'
      },
      wakeTime: {
        type: 'string',
        format: 'iso-date',
        description: '기상 시간'
      }
    }
  },
  
  // 수분 섭취량 (ml)
  waterIntake: {
    type: 'number',
    minimum: 0,
    nullable: true,
    description: '수분 섭취량 (ml)'
  },
  
  // 기분/컨디션
  mood: {
    type: 'string',
    enum: ['very_bad', 'bad', 'neutral', 'good', 'very_good'],
    nullable: true,
    description: '기분/컨디션 (very_bad: 매우 나쁨, bad: 나쁨, neutral: 보통, good: 좋음, very_good: 매우 좋음)'
  },
  
  // 에너지 레벨
  energyLevel: {
    type: 'number',
    minimum: 1,
    maximum: 10,
    nullable: true,
    description: '에너지 레벨 (1-10 점수)'
  },
  
  // 일일 메모
  notes: {
    type: 'string',
    nullable: true,
    description: '일일 피트니스 메모'
  },
  
  // 생성 시간
  createdAt: {
    type: 'string',
    format: 'iso-date',
    required: true,
    description: '기록 생성 시간'
  },
  
  // 마지막 업데이트 시간
  updatedAt: {
    type: 'string',
    format: 'iso-date',
    description: '기록 마지막 업데이트 시간'
  }
};

// 운동 타입 마스터 데이터 스키마
export const ExerciseTypeSchema = {
  // 운동 타입 ID
  exerciseTypeId: {
    type: 'string',
    required: true,
    description: '운동 타입 고유 식별자'
  },
  
  // 운동 이름
  name: {
    type: 'string',
    required: true,
    description: '운동 이름 (예: "러닝", "수영", "요가")'
  },
  
  // 운동 카테고리
  category: {
    type: 'string',
    enum: ['cardio', 'strength', 'flexibility', 'sports', 'other'],
    required: true,
    description: '운동 카테고리 (cardio: 유산소, strength: 근력, flexibility: 유연성, sports: 스포츠, other: 기타)'
  },
  
  // MET 값 (Metabolic Equivalent of Task)
  metValue: {
    type: 'number',
    minimum: 1,
    maximum: 20,
    required: true,
    description: 'MET 값 (칼로리 소모량 계산용)'
  },
  
  // 운동 설명
  description: {
    type: 'string',
    nullable: true,
    description: '운동에 대한 설명'
  },
  
  // 운동 아이콘/이미지
  icon: {
    type: 'string',
    nullable: true,
    description: '운동 아이콘 URL 또는 이름'
  },
  
  // 인기도 (정렬용)
  popularity: {
    type: 'number',
    default: 0,
    description: '운동 인기도 점수'
  },
  
  // 활성화 여부
  isActive: {
    type: 'boolean',
    default: true,
    description: '운동 타입 활성화 여부'
  }
};

// 체중 변화 추적 스키마
export const WeightTrackingSchema = {
  uid: {
    type: 'string',
    required: true,
    description: '사용자 ID'
  },
  
  // 체중 기록 목록 (최근 30일)
  weightHistory: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          format: 'date',
          required: true,
          description: '측정 날짜'
        },
        weight: {
          type: 'number',
          required: true,
          description: '체중 (kg)'
        },
        bmi: {
          type: 'number',
          description: 'BMI 지수'
        }
      }
    },
    description: '체중 변화 기록'
  },
  
  // 목표 체중
  targetWeight: {
    type: 'number',
    nullable: true,
    description: '목표 체중 (kg)'
  },
  
  // 시작 체중
  startWeight: {
    type: 'number',
    nullable: true,
    description: '시작 체중 (kg)'
  },
  
  // 체중 변화 통계
  statistics: {
    type: 'object',
    properties: {
      totalWeightChange: {
        type: 'number',
        description: '총 체중 변화 (kg)'
      },
      weeklyAverage: {
        type: 'number',
        description: '주간 평균 체중 (kg)'
      },
      monthlyAverage: {
        type: 'number',
        description: '월간 평균 체중 (kg)'
      },
      trend: {
        type: 'string',
        enum: ['increasing', 'decreasing', 'stable'],
        description: '체중 변화 추세'
      }
    }
  }
};

// 운동 강도 열거형
export const ExerciseIntensity = {
  LOW: 'low',
  MODERATE: 'moderate',
  HIGH: 'high',
  VERY_HIGH: 'very_high'
};

// 운동 카테고리 열거형
export const ExerciseCategories = {
  CARDIO: 'cardio',
  STRENGTH: 'strength',
  FLEXIBILITY: 'flexibility',
  SPORTS: 'sports',
  OTHER: 'other'
};

// 수면 질 열거형
export const SleepQuality = {
  POOR: 'poor',
  FAIR: 'fair',
  GOOD: 'good',
  EXCELLENT: 'excellent'
};

// 기분 열거형
export const MoodLevels = {
  VERY_BAD: 'very_bad',
  BAD: 'bad',
  NEUTRAL: 'neutral',
  GOOD: 'good',
  VERY_GOOD: 'very_good'
};

// 체중 변화 추세 열거형
export const WeightTrends = {
  INCREASING: 'increasing',
  DECREASING: 'decreasing',
  STABLE: 'stable'
};

// 기본 운동 타입 목록
export const DefaultExerciseTypes = [
  { name: '러닝', category: ExerciseCategories.CARDIO, metValue: 8.0 },
  { name: '걷기', category: ExerciseCategories.CARDIO, metValue: 3.5 },
  { name: '사이클링', category: ExerciseCategories.CARDIO, metValue: 7.5 },
  { name: '수영', category: ExerciseCategories.CARDIO, metValue: 8.0 },
  { name: '웨이트 트레이닝', category: ExerciseCategories.STRENGTH, metValue: 6.0 },
  { name: '요가', category: ExerciseCategories.FLEXIBILITY, metValue: 2.5 },
  { name: '필라테스', category: ExerciseCategories.FLEXIBILITY, metValue: 3.0 },
  { name: '축구', category: ExerciseCategories.SPORTS, metValue: 7.0 },
  { name: '농구', category: ExerciseCategories.SPORTS, metValue: 6.5 },
  { name: '테니스', category: ExerciseCategories.SPORTS, metValue: 7.3 },
  { name: '배드민턴', category: ExerciseCategories.SPORTS, metValue: 5.5 },
  { name: '등산', category: ExerciseCategories.CARDIO, metValue: 6.0 },
  { name: '댄스', category: ExerciseCategories.CARDIO, metValue: 4.8 },
  { name: '복싱', category: ExerciseCategories.CARDIO, metValue: 12.0 },
  { name: '크로스핏', category: ExerciseCategories.STRENGTH, metValue: 8.0 }
];

// 기본 일일 피트니스 데이터 생성 함수
export const createDefaultDailyFitnessData = (uid, date) => {
  return {
    uid,
    date,
    weight: null,
    weightMeasuredAt: null,
    bmi: null,
    exercises: [],
    totalExerciseTime: 0,
    totalCaloriesBurned: 0,
    steps: null,
    sleep: null,
    waterIntake: null,
    mood: null,
    energyLevel: null,
    notes: null,
    createdAt: new Date().toISOString()
  };
};

// BMI 계산 함수
export const calculateBMI = (height, weight) => {
  if (!height || !weight || height <= 0 || weight <= 0) {
    return null;
  }
  
  const heightInMeters = height / 100;
  return Math.round((weight / (heightInMeters * heightInMeters)) * 100) / 100;
};

// BMI 카테고리 판정 함수
export const getBMICategory = (bmi) => {
  if (!bmi) return null;
  
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
};

// 칼로리 소모량 계산 함수 (MET 기반)
export const calculateCaloriesBurned = (metValue, weight, durationMinutes) => {
  if (!metValue || !weight || !durationMinutes) {
    return 0;
  }
  
  // 칼로리 소모량 = MET × 체중(kg) × 시간(시간)
  const durationHours = durationMinutes / 60;
  return Math.round(metValue * weight * durationHours);
};

// 운동 기록 유효성 검사 함수
export const validateExerciseRecord = (exerciseRecord) => {
  const errors = [];
  
  if (!exerciseRecord) {
    errors.push('운동 기록이 없습니다.');
    return errors;
  }
  
  if (!exerciseRecord.exerciseType || typeof exerciseRecord.exerciseType !== 'string') {
    errors.push('운동 종류가 필요합니다.');
  }
  
  if (typeof exerciseRecord.duration !== 'number' || exerciseRecord.duration < 1) {
    errors.push('올바른 운동 시간을 입력해주세요 (최소 1분).');
  }
  
  if (exerciseRecord.caloriesBurned !== null && (typeof exerciseRecord.caloriesBurned !== 'number' || exerciseRecord.caloriesBurned < 0)) {
    errors.push('올바른 소모 칼로리를 입력해주세요.');
  }
  
  return errors;
};

// 피트니스 데이터 유효성 검사 함수
export const validateFitnessData = (fitnessData) => {
  const errors = [];
  
  if (!fitnessData) {
    errors.push('피트니스 데이터가 없습니다.');
    return errors;
  }
  
  if (!fitnessData.uid || typeof fitnessData.uid !== 'string') {
    errors.push('사용자 ID가 필요합니다.');
  }
  
  if (!fitnessData.date || typeof fitnessData.date !== 'string') {
    errors.push('날짜가 필요합니다.');
  }
  
  if (fitnessData.weight !== null && (typeof fitnessData.weight !== 'number' || fitnessData.weight < 10 || fitnessData.weight > 500)) {
    errors.push('올바른 체중을 입력해주세요 (10-500kg).');
  }
  
  if (fitnessData.exercises && Array.isArray(fitnessData.exercises)) {
    fitnessData.exercises.forEach((exercise, index) => {
      const exerciseErrors = validateExerciseRecord(exercise);
      exerciseErrors.forEach(error => {
        errors.push(`운동 ${index + 1}: ${error}`);
      });
    });
  }
  
  return errors;
};