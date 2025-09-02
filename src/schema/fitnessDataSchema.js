/**
 * 피트니스 데이터 스키마 정의
 * Firebase Firestore: users/{email}/fitness/{date}
 * 
 * 운동 기록, 체중 기록, BMI 계산 등 피트니스 관련 데이터를 저장
 */

// 개별 운동 기록 스키마 (실제 사용 구조에 맞춤)
export const ExerciseRecordSchema = {
  // 운동 ID (문서 ID와 동일)
  id: {
    type: 'string',
    required: true,
    description: '운동 기록 고유 식별자 (문서 ID)'
  },
  
  // 운동 종류/이름
  exercise: {
    type: 'string',
    required: true,
    description: '운동 종류 (예: "축구", "농구", "수영", "달리기")'
  },
  
  // 운동 지속 시간 (분)
  duration: {
    type: 'number',
    required: true,
    minimum: 1,
    description: '운동 지속 시간 (분)'
  }
};

// 일일 피트니스 데이터 스키마 (실제 사용 구조에 맞춤)
export const DailyFitnessDataSchema = {
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
  
  // 운동 기록 목록
  exercises: {
    type: 'array',
    items: ExerciseRecordSchema,
    default: [],
    description: '당일 운동 기록 목록'
  }
};

// 지원되는 운동 종목 목록 (Fitness.jsx에서 사용)
export const SupportedExercises = [
  "축구", "농구", "배구", "야구", "테니스", 
  "탁구", "수영", "달리기", "자전거", "요가", 
  "등산", "배드민턴", "볼링", "스쿼시", "걷기", 
  "조깅", "서핑", "홈트", "헬스", "골프", 
  "마라톤", "승마", "당구", "낚시", "복싱", 
  "태권도", "유도", "검도", "레슬링", "합기도", 
  "무에타이", "주짓수", "킥복싱", "롤러 스케이팅", 
  "스케이트보드", "필라테스", "웨이트 트레이닝", "클라이밍"
];

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
  if (!bmi) return { category: "데이터 없음", color: "#d9d9d9" };
  
  if (bmi < 18.5) return { category: "저체중", color: "#69c0ff" };
  if (bmi < 23) return { category: "정상", color: "#95de64" };
  if (bmi < 25) return { category: "과체중", color: "#ffd666" };
  if (bmi < 30) return { category: "비만", color: "#ffa39e" };
  return { category: "고도비만", color: "#ff4d4f" };
};

// 기본 일일 피트니스 데이터 생성 함수
export const createDefaultDailyFitnessData = (email, date) => {
  return {
    date,
    weight: null,
    exercises: []
  };
};

// 운동 기록 유효성 검사 함수
export const validateExerciseRecord = (exerciseRecord) => {
  const errors = [];
  
  if (!exerciseRecord) {
    errors.push('운동 기록이 없습니다.');
    return errors;
  }
  
  if (!exerciseRecord.exercise || typeof exerciseRecord.exercise !== 'string') {
    errors.push('운동 종류가 필요합니다.');
  }
  
  if (typeof exerciseRecord.duration !== 'number' || exerciseRecord.duration < 1) {
    errors.push('올바른 운동 시간을 입력해주세요 (최소 1분).');
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