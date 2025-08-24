import { combineReducers } from 'redux';
import authReducer from './authReducer';
import weeklyReducer from './weeklyReducer';
import foodReducer from './foodReducer';
import mealReducer from './mealReducer';
import surveyReducer from './surveyReducer';

const rootReducer = combineReducers({
  auth: authReducer,
  weekly: weeklyReducer,
  food: foodReducer,
  meal: mealReducer,
  survey: surveyReducer,
});

export default rootReducer;