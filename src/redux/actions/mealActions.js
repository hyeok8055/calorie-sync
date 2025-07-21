import { SET_MEAL_FLAGS, UPDATE_MEAL_FLAG } from './actionTypes';

export const setMealFlags = (mealFlags) => ({
  type: SET_MEAL_FLAGS,
  payload: mealFlags,
});

export const updateMealFlag = (mealType, flag) => ({
  type: UPDATE_MEAL_FLAG,
  payload: { mealType, flag },
});