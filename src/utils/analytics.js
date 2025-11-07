import { logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import { analytics } from '../firebaseconfig';

/**
 * Analytics 이벤트 로깅 유틸리티
 * Firebase Analytics와 GA4에 자동으로 전송됩니다
 */

// Analytics가 초기화되지 않았을 때 안전하게 처리
const safeLogEvent = (eventName, eventParams) => {
  if (analytics) {
    try {
      logEvent(analytics, eventName, eventParams);
      console.log(`[Analytics] ${eventName}`, eventParams);
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }
};

// 사용자 식별
export const setAnalyticsUserId = (userId) => {
  if (analytics && userId) {
    setUserId(analytics, userId);
    console.log('[Analytics] User ID set:', userId);
  }
};

// 사용자 속성 설정
export const setAnalyticsUserProperties = (properties) => {
  if (analytics && properties) {
    setUserProperties(analytics, properties);
    console.log('[Analytics] User properties set:', properties);
  }
};

// ===== 인증 관련 이벤트 =====

export const logLoginEvent = (method = 'google') => {
  safeLogEvent('login', {
    method: method
  });
};

export const logSignUpEvent = (method = 'google') => {
  safeLogEvent('sign_up', {
    method: method
  });
};

export const logLogoutEvent = () => {
  safeLogEvent('logout', {});
};

// ===== 칼로리 관련 이벤트 =====

export const logCalorieEntryEvent = (calorieAmount, mealType) => {
  safeLogEvent('calorie_entry', {
    calorie_amount: calorieAmount,
    meal_type: mealType,
    timestamp: new Date().toISOString()
  });
};

export const logCalorieGoalSet = (goalAmount) => {
  safeLogEvent('calorie_goal_set', {
    goal_amount: goalAmount
  });
};

// ===== 식사 관련 이벤트 =====

export const logMealAddEvent = (mealType, foodCount, totalCalories) => {
  safeLogEvent('meal_add', {
    meal_type: mealType,
    food_count: foodCount,
    total_calories: totalCalories
  });
};

export const logMealDeleteEvent = (mealType) => {
  safeLogEvent('meal_delete', {
    meal_type: mealType
  });
};

export const logFastingToggleEvent = (isEnabled) => {
  safeLogEvent('fasting_toggle', {
    is_enabled: isEnabled
  });
};

// ===== 음식 검색 및 선택 =====

export const logFoodSearchEvent = (searchTerm, resultsCount) => {
  safeLogEvent('food_search', {
    search_term: searchTerm,
    results_count: resultsCount
  });
};

export const logFoodSelectEvent = (foodName, calories) => {
  safeLogEvent('food_select', {
    food_name: foodName,
    calories: calories
  });
};

// ===== 설문조사 관련 =====

export const logSurveyStartEvent = () => {
  safeLogEvent('survey_start', {});
};

export const logSurveyCompleteEvent = (surveyData) => {
  safeLogEvent('survey_complete', {
    age_group: surveyData.age,
    gender: surveyData.gender,
    height: surveyData.height,
    weight: surveyData.weight,
    activity_level: surveyData.activityLevel
  });
};

// ===== 피트니스 관련 =====

export const logFitnessDataSync = (stepsCount, caloriesBurned) => {
  safeLogEvent('fitness_data_sync', {
    steps_count: stepsCount,
    calories_burned: caloriesBurned
  });
};

export const logFitnessPermissionRequest = (granted) => {
  safeLogEvent('fitness_permission_request', {
    granted: granted
  });
};

// ===== BMI 계산 =====

export const logBMICalculation = (bmi, category) => {
  safeLogEvent('bmi_calculation', {
    bmi_value: bmi,
    bmi_category: category
  });
};

// ===== 주간 리포트 =====

export const logWeeklyReportView = (weekNumber) => {
  safeLogEvent('weekly_report_view', {
    week_number: weekNumber
  });
};

export const logChartView = (chartType) => {
  safeLogEvent('chart_view', {
    chart_type: chartType
  });
};

// ===== 알림 관련 =====

export const logNotificationPermission = (granted) => {
  safeLogEvent('notification_permission', {
    granted: granted
  });
};

export const logNotificationReceived = (notificationType) => {
  safeLogEvent('notification_received', {
    notification_type: notificationType
  });
};

// ===== PWA 관련 =====

export const logPWAInstallPrompt = (accepted) => {
  safeLogEvent('pwa_install_prompt', {
    accepted: accepted
  });
};

export const logPWAInstalled = () => {
  safeLogEvent('pwa_installed', {});
};

// ===== 페이지 뷰 =====

export const logPageView = (pageName, pageTitle) => {
  safeLogEvent('page_view', {
    page_name: pageName,
    page_title: pageTitle,
    page_location: window.location.href
  });
};

// ===== 에러 이벤트 =====

export const logErrorEvent = (errorMessage, errorContext) => {
  safeLogEvent('error_occurred', {
    error_message: errorMessage,
    error_context: errorContext
  });
};

// ===== 사용자 참여도 =====

export const logEngagementTime = (timeSpent, page) => {
  safeLogEvent('user_engagement', {
    engagement_time_msec: timeSpent,
    page: page
  });
};

// ===== 프로필 설정 =====

export const logProfileSetup = (userData) => {
  safeLogEvent('profile_setup', {
    height: userData.height,
    age: userData.age,
    gender: userData.gender,
    goal: userData.goal
  });
};

export const logProfileUpdate = (updatedFields) => {
  safeLogEvent('profile_update', {
    updated_fields: Object.keys(updatedFields).join(',')
  });
};

// ===== 운동 관련 =====

export const logExerciseAdd = (exerciseName, duration) => {
  safeLogEvent('exercise_add', {
    exercise_name: exerciseName,
    duration_minutes: duration
  });
};

export const logExerciseDelete = (exerciseName) => {
  safeLogEvent('exercise_delete', {
    exercise_name: exerciseName
  });
};

export const logWeightRecord = (weight, hasPreviousData) => {
  safeLogEvent('weight_record', {
    weight: weight,
    is_first_record: !hasPreviousData
  });
};

// ===== Admin 관련 =====

export const logAdminAction = (actionType, details) => {
  safeLogEvent('admin_action', {
    action_type: actionType,
    details: details
  });
};

export const logDataExport = (exportType, recordCount) => {
  safeLogEvent('data_export', {
    export_type: exportType,
    record_count: recordCount
  });
};
