import {
  SET_SURVEY_ACTIVE,
  SET_SURVEY_COMPLETED,
  CLEAR_SURVEY_STATUS,
  SET_SURVEY_RESPONSES,
  SET_SURVEY_STATISTICS,
  SET_USER_SURVEY_RESPONSE,
  CLEAR_SURVEY_DATA
} from '../actions/surveyActions';

const initialState = {
  isActive: false,           // 설문조사 활성화 여부
  surveyId: null,           // 현재 설문조사 ID
  activatedAt: null,        // 설문조사 활성화 시간
  completedSurveys: [],     // 완료된 설문조사 목록
  lastChecked: null,        // 마지막 확인 시간
  responses: {},            // 설문조사별 응답 목록 { surveyId: { responses: [], fetchedAt: '' } }
  statistics: {},           // 설문조사별 통계 { surveyId: { statistics: {}, fetchedAt: '' } }
  userResponses: {}         // 사용자별 설문조사 응답 { surveyId: { response: {}, fetchedAt: '' } }
};

const surveyReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_SURVEY_ACTIVE:
      return {
        ...state,
        isActive: action.payload.isActive,
        surveyId: action.payload.surveyId,
        activatedAt: action.payload.timestamp,
        lastChecked: action.payload.timestamp
      };

    case SET_SURVEY_COMPLETED:
      return {
        ...state,
        completedSurveys: [
          ...state.completedSurveys,
          {
            surveyId: action.payload.surveyId,
            completedAt: action.payload.completedAt
          }
        ]
      };

    case SET_SURVEY_RESPONSES:
      return {
        ...state,
        responses: {
          ...state.responses,
          [action.payload.surveyId]: {
            responses: action.payload.responses,
            fetchedAt: action.payload.fetchedAt
          }
        }
      };

    case SET_SURVEY_STATISTICS:
      return {
        ...state,
        statistics: {
          ...state.statistics,
          [action.payload.surveyId]: {
            statistics: action.payload.statistics,
            fetchedAt: action.payload.fetchedAt
          }
        }
      };

    case SET_USER_SURVEY_RESPONSE:
      return {
        ...state,
        userResponses: {
          ...state.userResponses,
          [action.payload.surveyId]: {
            response: action.payload.response,
            fetchedAt: action.payload.fetchedAt
          }
        }
      };

    case CLEAR_SURVEY_DATA:
      return {
        ...state,
        responses: {},
        statistics: {},
        userResponses: {}
      };

    case CLEAR_SURVEY_STATUS:
      return initialState;

    default:
      return state;
  }
};

export default surveyReducer;