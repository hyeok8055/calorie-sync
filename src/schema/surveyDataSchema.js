/**
 * 설문조사 데이터 스키마 정의
 * Firebase Firestore: surveys/{surveyId}/responses/{email}, system/survey
 * 
 * 사용자 설문조사 응답 및 설문 템플릿을 관리
 */

// 설문 응답 스키마
export const SurveyResponseSchema = {
  // 응답 ID
  responseId: {
    type: 'string',
    required: true,
    description: '설문 응답 고유 식별자'
  },
  
  // 사용자 이메일
  userId: {
    type: 'string',
    format: 'email',
    required: true,
    description: '응답자 이메일'
  },
  
  // 설문 ID
  surveyId: {
    type: 'string',
    required: true,
    description: '설문 템플릿 ID'
  },
  
  // 설문 응답 데이터
  responses: {
    type: 'object',
    required: true,
    properties: {
      // 일일 칼로리 섭취량
      q1_daily_calories: {
        type: 'number',
        minimum: 500,
        maximum: 5000,
        nullable: true,
        description: '일일 평균 칼로리 섭취량 (kcal)'
      },
      
      // 다이어트 상태
      q2_diet_status: {
        type: 'string',
        enum: ['not_dieting', 'trying_to_lose', 'trying_to_gain', 'maintaining', 'other'],
        nullable: true,
        description: '현재 다이어트 상태 (not_dieting: 다이어트 안함, trying_to_lose: 체중감량 중, trying_to_gain: 체중증가 중, maintaining: 체중유지, other: 기타)'
      },
      
      // 체중 조절 동기
      q3_weight_motivation: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['health', 'appearance', 'fitness', 'medical', 'confidence', 'social', 'other']
        },
        nullable: true,
        description: '체중 조절 동기 (health: 건강, appearance: 외모, fitness: 체력, medical: 의학적, confidence: 자신감, social: 사회적, other: 기타)'
      },
      
      // 식사 패턴
      q4_meal_pattern: {
        type: 'object',
        nullable: true,
        properties: {
          mealsPerDay: {
            type: 'number',
            minimum: 1,
            maximum: 10,
            description: '하루 식사 횟수'
          },
          regularMealTimes: {
            type: 'boolean',
            description: '규칙적인 식사 시간 여부'
          },
          snackFrequency: {
            type: 'string',
            enum: ['never', 'rarely', 'sometimes', 'often', 'always'],
            description: '간식 섭취 빈도'
          }
        }
      },
      
      // 운동 습관
      q5_exercise_habits: {
        type: 'object',
        nullable: true,
        properties: {
          frequency: {
            type: 'string',
            enum: ['never', 'rarely', 'weekly', 'several_times_week', 'daily'],
            description: '운동 빈도 (never: 안함, rarely: 가끔, weekly: 주 1회, several_times_week: 주 여러회, daily: 매일)'
          },
          duration: {
            type: 'number',
            minimum: 0,
            maximum: 300,
            description: '평균 운동 시간 (분)'
          },
          types: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: '주로 하는 운동 종류'
          }
        }
      },
      
      // 칼로리 인식 정확도
      q6_calorie_awareness: {
        type: 'object',
        nullable: true,
        properties: {
          confidenceLevel: {
            type: 'number',
            minimum: 1,
            maximum: 10,
            description: '칼로리 예측 자신감 (1-10점)'
          },
          usesApps: {
            type: 'boolean',
            description: '칼로리 계산 앱 사용 여부'
          },
          readsLabels: {
            type: 'boolean',
            description: '영양성분표 확인 여부'
          }
        }
      },
      
      // 식습관 평가
      q7_eating_habits: {
        type: 'object',
        nullable: true,
        properties: {
          emotionalEating: {
            type: 'string',
            enum: ['never', 'rarely', 'sometimes', 'often', 'always'],
            description: '감정적 식사 빈도'
          },
          portionControl: {
            type: 'string',
            enum: ['very_poor', 'poor', 'average', 'good', 'excellent'],
            description: '분량 조절 능력'
          },
          eatingSpeed: {
            type: 'string',
            enum: ['very_slow', 'slow', 'normal', 'fast', 'very_fast'],
            description: '식사 속도'
          }
        }
      },
      
      // 건강 상태
      q8_health_status: {
        type: 'object',
        nullable: true,
        properties: {
          chronicConditions: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['diabetes', 'hypertension', 'heart_disease', 'thyroid', 'none', 'other']
            },
            description: '만성 질환 (diabetes: 당뇨, hypertension: 고혈압, heart_disease: 심장병, thyroid: 갑상선, none: 없음, other: 기타)'
          },
          medications: {
            type: 'boolean',
            description: '체중에 영향을 주는 약물 복용 여부'
          },
          allergies: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: '음식 알레르기 목록'
          }
        }
      },
      
      // 라이프스타일
      q9_lifestyle: {
        type: 'object',
        nullable: true,
        properties: {
          sleepHours: {
            type: 'number',
            minimum: 3,
            maximum: 12,
            description: '평균 수면 시간 (시간)'
          },
          stressLevel: {
            type: 'number',
            minimum: 1,
            maximum: 10,
            description: '스트레스 수준 (1-10점)'
          },
          workType: {
            type: 'string',
            enum: ['sedentary', 'standing', 'physical', 'mixed'],
            description: '직업 활동 유형 (sedentary: 앉아서, standing: 서서, physical: 육체적, mixed: 혼합)'
          },
          socialEating: {
            type: 'string',
            enum: ['never', 'rarely', 'sometimes', 'often', 'always'],
            description: '사회적 식사 빈도'
          }
        }
      },
      
      // 목표 및 기대
      q10_goals_expectations: {
        type: 'object',
        nullable: true,
        properties: {
          primaryGoal: {
            type: 'string',
            enum: ['lose_weight', 'gain_weight', 'maintain_weight', 'build_muscle', 'improve_health', 'track_calories'],
            description: '주요 목표'
          },
          timeframe: {
            type: 'string',
            enum: ['1_month', '3_months', '6_months', '1_year', 'long_term'],
            description: '목표 달성 기간'
          },
          expectedWeightChange: {
            type: 'number',
            description: '예상 체중 변화 (kg, 양수: 증가, 음수: 감소)'
          },
          motivationLevel: {
            type: 'number',
            minimum: 1,
            maximum: 10,
            description: '동기 수준 (1-10점)'
          }
        }
      }
    }
  },
  
  // 응답 완료 여부
  isCompleted: {
    type: 'boolean',
    default: false,
    description: '설문 응답 완료 여부'
  },
  
  // 응답 진행률
  completionPercentage: {
    type: 'number',
    minimum: 0,
    maximum: 100,
    default: 0,
    description: '설문 응답 진행률 (%)'
  },
  
  // 응답 시작 시간
  startedAt: {
    type: 'string',
    format: 'iso-date',
    required: true,
    description: '설문 응답 시작 시간'
  },
  
  // 응답 완료 시간
  completedAt: {
    type: 'string',
    format: 'iso-date',
    nullable: true,
    description: '설문 응답 완료 시간'
  },
  
  // 응답 소요 시간 (초)
  responseTime: {
    type: 'number',
    minimum: 0,
    nullable: true,
    description: '설문 응답 소요 시간 (초)'
  },
  
  // 마지막 업데이트 시간
  updatedAt: {
    type: 'string',
    format: 'iso-date',
    description: '응답 마지막 업데이트 시간'
  }
};

// 설문 템플릿 스키마
export const SurveyTemplateSchema = {
  // 설문 ID
  surveyId: {
    type: 'string',
    required: true,
    description: '설문 고유 식별자'
  },
  
  // 설문 제목
  title: {
    type: 'string',
    required: true,
    description: '설문 제목'
  },
  
  // 설문 설명
  description: {
    type: 'string',
    nullable: true,
    description: '설문 설명'
  },
  
  // 설문 버전
  version: {
    type: 'string',
    default: '1.0',
    description: '설문 버전'
  },
  
  // 설문 질문 목록
  questions: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        questionId: {
          type: 'string',
          required: true,
          description: '질문 ID'
        },
        questionText: {
          type: 'string',
          required: true,
          description: '질문 내용'
        },
        questionType: {
          type: 'string',
          enum: ['single_choice', 'multiple_choice', 'number', 'text', 'scale', 'boolean'],
          required: true,
          description: '질문 유형'
        },
        options: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              value: {
                type: 'string',
                description: '선택지 값'
              },
              label: {
                type: 'string',
                description: '선택지 라벨'
              }
            }
          },
          description: '선택지 목록 (선택형 질문용)'
        },
        isRequired: {
          type: 'boolean',
          default: false,
          description: '필수 응답 여부'
        },
        order: {
          type: 'number',
          description: '질문 순서'
        }
      }
    },
    description: '설문 질문 목록'
  },
  
  // 설문 카테고리
  category: {
    type: 'string',
    enum: ['onboarding', 'periodic', 'feedback', 'research'],
    description: '설문 카테고리 (onboarding: 온보딩, periodic: 정기, feedback: 피드백, research: 연구)'
  },
  
  // 설문 대상
  targetAudience: {
    type: 'object',
    properties: {
      ageRange: {
        type: 'object',
        properties: {
          min: {
            type: 'number',
            description: '최소 나이'
          },
          max: {
            type: 'number',
            description: '최대 나이'
          }
        }
      },
      gender: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['male', 'female', 'other']
        },
        description: '대상 성별'
      },
      groups: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: '대상 그룹 ID 목록'
      }
    }
  },
  
  // 설문 활성화 여부
  isActive: {
    type: 'boolean',
    default: true,
    description: '설문 활성화 여부'
  },
  
  // 설문 기간
  period: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        format: 'iso-date',
        description: '설문 시작 날짜'
      },
      endDate: {
        type: 'string',
        format: 'iso-date',
        nullable: true,
        description: '설문 종료 날짜'
      }
    }
  },
  
  // 예상 소요 시간 (분)
  estimatedDuration: {
    type: 'number',
    minimum: 1,
    description: '예상 응답 소요 시간 (분)'
  },
  
  // 설문 생성자
  createdBy: {
    type: 'string',
    format: 'email',
    required: true,
    description: '설문 생성자 이메일'
  },
  
  // 생성 시간
  createdAt: {
    type: 'string',
    format: 'iso-date',
    required: true,
    description: '설문 생성 시간'
  },
  
  // 마지막 수정 시간
  updatedAt: {
    type: 'string',
    format: 'iso-date',
    description: '설문 마지막 수정 시간'
  }
};

// 설문 통계 스키마
export const SurveyStatisticsSchema = {
  surveyId: {
    type: 'string',
    required: true,
    description: '설문 ID'
  },
  
  // 응답 통계
  responseStats: {
    type: 'object',
    properties: {
      totalResponses: {
        type: 'number',
        default: 0,
        description: '총 응답 수'
      },
      completedResponses: {
        type: 'number',
        default: 0,
        description: '완료된 응답 수'
      },
      partialResponses: {
        type: 'number',
        default: 0,
        description: '부분 응답 수'
      },
      averageCompletionTime: {
        type: 'number',
        description: '평균 응답 소요 시간 (초)'
      },
      completionRate: {
        type: 'number',
        description: '응답 완료율 (%)'
      }
    }
  },
  
  // 질문별 응답 분포
  questionStats: {
    type: 'object',
    description: '질문별 응답 통계 (questionId를 키로 하는 객체)'
  },
  
  // 마지막 업데이트 시간
  lastUpdatedAt: {
    type: 'string',
    format: 'iso-date',
    description: '통계 마지막 업데이트 시간'
  }
};

// 설문 카테고리 열거형
export const SurveyCategories = {
  ONBOARDING: 'onboarding',
  PERIODIC: 'periodic',
  FEEDBACK: 'feedback',
  RESEARCH: 'research'
};

// 질문 유형 열거형
export const QuestionTypes = {
  SINGLE_CHOICE: 'single_choice',
  MULTIPLE_CHOICE: 'multiple_choice',
  NUMBER: 'number',
  TEXT: 'text',
  SCALE: 'scale',
  BOOLEAN: 'boolean'
};

// 다이어트 상태 열거형
export const DietStatus = {
  NOT_DIETING: 'not_dieting',
  TRYING_TO_LOSE: 'trying_to_lose',
  TRYING_TO_GAIN: 'trying_to_gain',
  MAINTAINING: 'maintaining',
  OTHER: 'other'
};

// 빈도 열거형
export const FrequencyLevels = {
  NEVER: 'never',
  RARELY: 'rarely',
  SOMETIMES: 'sometimes',
  OFTEN: 'often',
  ALWAYS: 'always'
};

// 기본 설문 응답 생성 함수
export const createDefaultSurveyResponse = (email, surveyId) => {
  return {
    responseId: `${email}_${surveyId}_${Date.now()}`,
    userId: email,
    surveyId,
    responses: [],
    submittedAt: null,
    deviceInfo: {
      platform: 'Unknown',
      userAgent: '',
      screenSize: ''
    },
    metadata: {
      source: 'modal',
      version: '1.0'
    }
  };
};

// 설문 진행률 계산 함수
export const calculateCompletionPercentage = (responses, totalQuestions) => {
  if (!responses || !totalQuestions || totalQuestions === 0) {
    return 0;
  }
  
  const answeredQuestions = Object.keys(responses).filter(key => {
    const value = responses[key];
    return value !== null && value !== undefined && value !== '';
  }).length;
  
  return Math.round((answeredQuestions / totalQuestions) * 100);
};

// 설문 응답 유효성 검사 함수
export const validateSurveyResponse = (response, template) => {
  const errors = [];
  
  if (!response) {
    errors.push('설문 응답이 없습니다.');
    return errors;
  }
  
  if (!response.uid || typeof response.uid !== 'string') {
    errors.push('사용자 ID가 필요합니다.');
  }
  
  if (!response.surveyId || typeof response.surveyId !== 'string') {
    errors.push('설문 ID가 필요합니다.');
  }
  
  // 필수 질문 응답 확인
  if (template && template.questions) {
    const requiredQuestions = template.questions.filter(q => q.isRequired);
    requiredQuestions.forEach(question => {
      const answer = response.responses[question.questionId];
      if (answer === null || answer === undefined || answer === '') {
        errors.push(`필수 질문 "${question.questionText}"에 응답해주세요.`);
      }
    });
  }
  
  return errors;
};

// 설문 응답 분석 함수
export const analyzeSurveyResponse = (response) => {
  const analysis = {
    calorieAwareness: 'unknown',
    dietGoal: 'unknown',
    exerciseLevel: 'unknown',
    healthRisk: 'low'
  };
  
  if (!response.responses) {
    return analysis;
  }
  
  const { responses } = response;
  
  // 칼로리 인식 수준 분석
  if (responses.q6_calorie_awareness) {
    const confidence = responses.q6_calorie_awareness.confidenceLevel;
    if (confidence >= 8) analysis.calorieAwareness = 'high';
    else if (confidence >= 5) analysis.calorieAwareness = 'medium';
    else analysis.calorieAwareness = 'low';
  }
  
  // 다이어트 목표 분석
  if (responses.q2_diet_status) {
    analysis.dietGoal = responses.q2_diet_status;
  }
  
  // 운동 수준 분석
  if (responses.q5_exercise_habits) {
    const frequency = responses.q5_exercise_habits.frequency;
    if (frequency === 'daily' || frequency === 'several_times_week') {
      analysis.exerciseLevel = 'high';
    } else if (frequency === 'weekly') {
      analysis.exerciseLevel = 'medium';
    } else {
      analysis.exerciseLevel = 'low';
    }
  }
  
  // 건강 위험도 분석
  if (responses.q8_health_status) {
    const conditions = responses.q8_health_status.chronicConditions || [];
    if (conditions.length > 0 && !conditions.includes('none')) {
      analysis.healthRisk = 'high';
    }
  }
  
  return analysis;
};