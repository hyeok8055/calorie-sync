import React, { Suspense } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { useSelector } from 'react-redux';
import { Spin } from 'antd';

// 컴포넌트 동적 임포트
const Main = React.lazy(() => import("./pages/Main"));
const Fitness = React.lazy(() => import("./pages/fitness/Fitness"));
const GoogleLogin = React.lazy(() => import("./pages/auth/GoogleLogin"));
const FoodList = React.lazy(() => import("./pages/food/FoodList"));
const CaloriEntry = React.lazy(() => import("./pages/calories/CaloriEntry"));
const Intro = React.lazy(() => import("./pages/auth/Intro"));
const QnA = React.lazy(() => import("./pages/QnA/qna"));
const AdminPage = React.lazy(() => import("./pages/auth/AdminPage"));
const CalorieAdminPage = React.lazy(() => import("./pages/auth/CalorieAdminPage"));
const SurveyPage = React.lazy(() => import("./pages/SurveyPage"));

// 로딩 컴포넌트
const LoadingSpinner = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    backgroundColor: '#f0f2f5'
  }}>
    <Spin size="large" />
  </div>
);

const AppRoutes = () => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const user = useSelector((state) => state.auth.user);
  

  
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* 초기 경로 처리 */}
        <Route
          path="/"
          element={
            <Navigate 
              to={isAuthenticated ? "/main" : "/googlelogin"} 
              replace 
            />
          }
        />
        
        {/* Google 로그인 페이지 - 항상 접근 가능 */}
        <Route 
          path="/googlelogin" 
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <GoogleLogin />
            </Suspense>
          } 
        />
        
        {/* 인증된 사용자만 접근 가능한 라우트 */}
        {isAuthenticated ? (
          <>
            <Route 
              path="/main" 
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Main />
                </Suspense>
              } 
            />
            <Route 
              path="/fitness" 
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Fitness />
                </Suspense>
              } 
            />
            <Route 
              path="/meals/:mealType" 
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <FoodList />
                </Suspense>
              } 
            />
            <Route 
              path="/calories/calorieEntry" 
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <CaloriEntry />
                </Suspense>
              } 
            />
            <Route 
              path="/intro" 
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Intro />
                </Suspense>
              } 
            />
            <Route 
              path="/qna" 
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <QnA />
                </Suspense>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <AdminPage />
                </Suspense>
              } 
            />
            <Route 
              path="/calorie-admin" 
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <CalorieAdminPage />
                </Suspense>
              } 
            />
            <Route 
              path="/survey" 
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <SurveyPage />
                </Suspense>
              } 
            />
            {/* 404 처리 - 인증된 사용자 */}
            <Route 
              path="*" 
              element={
                <Navigate 
                  to={user?.setupCompleted ? "/main" : "/intro"} 
                  replace 
                />
              } 
            />
          </>
        ) : (
          /* 미인증 사용자의 모든 경로를 로그인으로 리다이렉트 */
          <Route 
            path="*" 
            element={<Navigate to="/googlelogin" replace />} 
          />
        )}
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
