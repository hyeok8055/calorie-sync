// 설문조사 관련 액션 타입
export const SET_SURVEY_ACTIVE = 'SET_SURVEY_ACTIVE';
export const SET_SURVEY_COMPLETED = 'SET_SURVEY_COMPLETED';
export const CLEAR_SURVEY_STATUS = 'CLEAR_SURVEY_STATUS';
export const SET_SURVEY_RESPONSES = 'SET_SURVEY_RESPONSES';
export const SET_SURVEY_STATISTICS = 'SET_SURVEY_STATISTICS';
export const SET_USER_SURVEY_RESPONSE = 'SET_USER_SURVEY_RESPONSE';
export const CLEAR_SURVEY_DATA = 'CLEAR_SURVEY_DATA';

// 설문조사 활성화 상태 설정
export const setSurveyActive = (isActive, surveyId = null) => ({
  type: SET_SURVEY_ACTIVE,
  payload: {
    isActive,
    surveyId,
    timestamp: new Date().toISOString()
  }
});

// 설문조사 완료 상태 설정
export const setSurveyCompleted = (surveyId) => ({
  type: SET_SURVEY_COMPLETED,
  payload: {
    surveyId,
    completedAt: new Date().toISOString()
  }
});

// 설문조사 상태 초기화
export const clearSurveyStatus = () => ({
  type: CLEAR_SURVEY_STATUS
});

// 설문조사 응답 목록 설정
export const setSurveyResponses = (surveyId, responses) => ({
  type: SET_SURVEY_RESPONSES,
  payload: {
    surveyId,
    responses,
    fetchedAt: new Date().toISOString()
  }
});

// 설문조사 통계 설정
export const setSurveyStatistics = (surveyId, statistics) => ({
  type: SET_SURVEY_STATISTICS,
  payload: {
    surveyId,
    statistics,
    fetchedAt: new Date().toISOString()
  }
});

// 사용자 설문조사 응답 설정
export const setUserSurveyResponse = (surveyId, response) => ({
  type: SET_USER_SURVEY_RESPONSE,
  payload: {
    surveyId,
    response,
    fetchedAt: new Date().toISOString()
  }
});

// 설문조사 데이터 초기화
export const clearSurveyData = () => ({
  type: CLEAR_SURVEY_DATA
});