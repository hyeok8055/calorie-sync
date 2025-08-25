import { SET_MEAL_FLAGS, UPDATE_MEAL_FLAG } from '../actions/actionTypes';

const initialState = {
  mealFlags: {
    breakfast: 0, // 0: 미기록, 1: 식사완료, 2: 단식
    lunch: 0,
    dinner: 0,
    snack: 0,
  },
};

const mealReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_MEAL_FLAGS:
      return {
        ...state,
        mealFlags: action.payload,
      };
    case 'UPDATE_MEAL_FLAG':
      return {
        ...state,
        mealFlags: {
          ...state.mealFlags,
          [action.payload.mealType]: action.payload.flag,
        },
      };
    default:
      return state;
  }
};

export default mealReducer;