import React, { useState, useEffect } from 'react';
import { Form, Input, Radio, Button, Card, NavBar, Toast, TextArea } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { db } from '../firebaseconfig';
import { collection, addDoc, serverTimestamp, query, where, getDocs, setDoc, doc, getDoc } from 'firebase/firestore';
import { useFood } from '../hook/useFood';
import { logSurveyCompleteEvent, logPageView } from '../utils/analytics';

const SurveyPage = () => {
  const navigate = useNavigate();
  const email = useSelector((state) => state.auth.user?.email);
  const user = useSelector((state) => state.auth.user);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const { foodData } = useFood();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [lunchCalorieDifference, setLunchCalorieDifference] = useState(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [checkingSubmission, setCheckingSubmission] = useState(true);
  const [isGroupApplied, setIsGroupApplied] = useState(false);

  // 점심 칼로리 편차 확인 제거 (Q6 폐지)
  useEffect(() => {
    // Analytics: 페이지 뷰 로깅
    logPageView('survey', '설문조사 페이지');
    
    setLunchCalorieDifference(0);
  }, [foodData]);

  // 오늘 설문 제출 여부 확인
  useEffect(() => {
    const checkTodaySubmission = async () => {
      if (!email) {
        setCheckingSubmission(false);
        return;
      }

      try {
        // 현재 활성화된 설문조사 ID 가져오기
        const surveyDoc = await getDoc(doc(db, 'system', 'survey'));
        let surveyId = 'default-survey'; // 기본값
        
        if (surveyDoc.exists() && surveyDoc.data().surveyId) {
          surveyId = surveyDoc.data().surveyId;
        }

        // 해당 설문조사에 대한 사용자 응답 확인: surveys/{surveyId}/{email}
        const userResponseDoc = await getDoc(doc(db, 'surveys', surveyId, 'responses', email));
        
        if (userResponseDoc.exists()) {
          const responseData = userResponseDoc.data();
          const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
          const responseDate = responseData.timestamp ? responseData.timestamp.split('T')[0] : null;
          
          // 오늘 날짜에 제출한 응답이 있는지 확인
          if (responseDate === today) {
            setAlreadySubmitted(true);
            Toast.show({
              content: '오늘 이미 설문조사를 완료하셨습니다.',
              position: 'top',
              duration: 3000
            });
            setTimeout(() => navigate('/'), 3000);
          }
        }
      } catch (error) {
        console.error('설문 제출 여부 확인 오류:', error);
      } finally {
        setCheckingSubmission(false);
      }
    };

    if (isAuthenticated && email) {
      checkTodaySubmission();
    }
  }, [email, isAuthenticated, navigate]);

  // Q6 관련 로직 제거

  // 설문 제출 처리
  const handleSubmit = async (values) => {
    if (!email || !user) {
      Toast.show({
        content: '로그인이 필요합니다.',
        position: 'top'
      });
      return;
    }

    setLoading(true);
    try {
      // 현재 활성화된 설문조사 ID 가져오기
      const surveyDoc = await getDoc(doc(db, 'system', 'survey'));
      let surveyId = 'default-survey'; // 기본값
      
      if (surveyDoc.exists() && surveyDoc.data().surveyId) {
        surveyId = surveyDoc.data().surveyId;
      }

      const surveyData = {
        userEmail: email,
        q1_daily_calories: values.q1_daily_calories,
        q2_on_diet: values.q2_on_diet,
        q3_weight_control_motivation: values.q3_weight_control_motivation,
        q4_forbidden_food_behavior: values.q4_forbidden_food_behavior,
        q5_food_consciousness: values.q5_food_consciousness,
        is_group: isGroupApplied,
        submittedAt: serverTimestamp(),
        timestamp: new Date().toISOString()
      };

      // 올바른 구조로 저장: surveys/{surveyId}/responses/{email}
      await setDoc(doc(db, 'surveys', surveyId, 'responses', email), surveyData);
      
      // Analytics: 설문조사 완료 이벤트
      logSurveyCompleteEvent(values);
      
      Toast.show({
        content: '설문조사가 성공적으로 제출되었습니다!',
        position: 'top',
        duration: 2000
      });
      
      setTimeout(() => {
        navigate('/main');
      }, 2000);
    } catch (error) {
      console.error('설문 제출 오류:', error);
      Toast.show({
        content: '설문 제출 중 오류가 발생했습니다.',
        position: 'top'
      });
    } finally {
      setLoading(false);
    }
  };

  // 리커트 척도 컴포넌트
  const LikertScale = ({ value, onChange, options, name }) => {
    return (
      <div className="likert-scale">
        <div className="flex justify-between items-center mb-3 px-1">
          <span className="text-xs text-gray-500 max-w-[45%] text-left leading-tight">
            {options[0]}
          </span>
          <span className="text-xs text-gray-500 max-w-[45%] text-right leading-tight">
            {options[options.length - 1]}
          </span>
        </div>
        <div className="flex justify-between items-center gap-1 sm:gap-2 pt-1">
          {options.map((_, index) => {
            const scaleValue = index + 1;
            return (
              <div key={scaleValue} className="flex flex-col items-center flex-1">
                <button
                  type="button"
                  onClick={() => onChange(scaleValue)}
                  className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full border-2 transition-all duration-200 text-sm sm:text-base ${
                    value === scaleValue
                      ? 'bg-blue-500 border-blue-500 text-white shadow-lg scale-110'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  {scaleValue}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 로딩 중이거나 이미 제출된 경우 또는 시간 제한된 경우 처리
  if (checkingSubmission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-700 mb-2">설문 상태 확인 중...</div>
          <div className="text-sm text-gray-500">잠시만 기다려주세요.</div>
        </div>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-2xl mb-4">✅</div>
          <div className="text-lg font-semibold text-gray-700 mb-2">오늘 설문조사를 이미 완료하셨습니다</div>
          <div className="text-sm text-gray-500">내일 다시 참여해 주세요!</div>
        </div>
      </div>
    );
  }

  return (
    <div className="survey-page min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* 네비게이션 바 */}
      <NavBar
        className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50"
      >
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold text-gray-800">📊 설문조사</span>
        </div>
      </NavBar>

      {/* 메인 콘텐츠 */}
      <div className="p-2 pb-10 max-w-2xl mx-auto">
        <div className="mt-2 mb-3 text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
            여러분의 소중한 의견을 들려주세요
          </h1>
          <p className="text-sm text-gray-600">
            모든 질문에 답변해 주시면 감사하겠습니다
          </p>
        </div>

        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
          className="space-y-4 sm:space-y-6"
        >
          {/* Q1: 하루 칼로리 섭취량 */}
          <Card className="bg-white rounded-xl shadow-sm border-0 overflow-hidden">
            <div className="p-2 sm:p-5">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-1">
                  <span className="text-blue-600 font-semibold text-sm">1</span>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                  번 질문
                </h3>
              </div>
              <p className="text-sm sm:text-base text-gray-600 mb-3 pl-4">
                보통 하루에 몇 칼로리를 섭취하시나요?
              </p>
              <Form.Item
                name="q1_daily_calories"
                rules={[{ required: true, message: '칼로리를 입력해 주세요' }]}
              >
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="예: 2000"
                    className="text-base sm:text-lg py-3 px-4 rounded-lg border-2 border-gray-200 focus:border-blue-400 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium text-sm sm:text-base">
                    kcal
                  </span>
                </div>
              </Form.Item>
            </div>
          </Card>

          {/* Q2: 다이어트 여부 */}
          <Card className="bg-white rounded-xl shadow-sm border-0 overflow-hidden">
            <div className="p-2 sm:p-5">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-1">
                  <span className="text-green-600 font-semibold text-sm">2</span>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                  번 질문
                </h3>
              </div>
              <p className="text-sm sm:text-base text-gray-600 mb-3 pl-4">
                현재 다이어트를 하고 계신가요?
              </p>
              <Form.Item
                name="q2_on_diet"
                rules={[{ required: true, message: '선택해 주세요' }]}
              >
                <Radio.Group className="w-full">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center p-3 sm:p-2 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                      <Radio value="yes" className="mr-3" />
                      <span className="text-sm sm:text-base text-gray-700 font-medium">예</span>
                    </label>
                    <label className="flex items-center p-3 sm:p-2 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                      <Radio value="no" className="mr-3" />
                      <span className="text-sm sm:text-base text-gray-700 font-medium">아니오</span>
                    </label>
                  </div>
                </Radio.Group>
              </Form.Item>
            </div>
          </Card>

          {/* Q3: 체중 조절 동기 수준 (4점 척도) */}
          <Card className="bg-white rounded-xl shadow-sm border-0 overflow-hidden">
            <div className="p-2 sm:p-5">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-1">
                  <span className="text-purple-600 font-semibold text-sm">3</span>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                  번 질문
                </h3>
              </div>
              <p className="text-sm sm:text-base text-gray-600 mb-6 pl-2">
                평소 체중을 조절하려는 동기가 얼마나 높으신가요?
              </p>
              <Form.Item
                name="q3_weight_control_motivation"
                rules={[{ required: true, message: '선택해 주세요' }]}
              >
                <LikertScale
                  value={form.getFieldValue('q3_weight_control_motivation')}
                  onChange={(value) => {
                    form.setFieldsValue({ q3_weight_control_motivation: value });
                  }}
                  options={[
                    '전혀 없음',
                    '매우 낮음',
                    '낮음',
                    '보통',
                    '높음',
                    '매우 높음',
                    '극도로 높음'
                  ]}
                  name="q3_weight_control_motivation"
                />
              </Form.Item>
            </div>
          </Card>

          {/* Q4: 금지된 음식 섭취 후 행동 */}
          <Card className="bg-white rounded-xl shadow-sm border-0 overflow-hidden">
            <div className="p-2 sm:p-5">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-1">
                  <span className="text-red-600 font-semibold text-sm">4</span>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                  번 질문
                </h3>
              </div>
              <p className="text-sm sm:text-base text-gray-600 mb-3 pl-4">
                다이어트를 하는 동안 '금지된' 음식을 섭취한 후,<br/> 보통 어떤 행동을 하십니까?
              </p>
              <Form.Item
                name="q4_forbidden_food_behavior"
                rules={[{ required: true, message: '선택해 주세요' }]}
              >
                <Radio.Group className="w-full">
                  <div className="space-y-3">
                    <label className="flex items-start p-3 sm:p-2 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                      <Radio value={1} className="mt-1 mr-3" />
                      <span className="text-sm sm:text-base text-gray-700">
                        다시 식단으로 돌아간다
                      </span>
                    </label>
                    <label className="flex items-start p-3 sm:p-2 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                      <Radio value={2} className="mt-1 mr-3" />
                      <span className="text-sm sm:text-base text-gray-700">
                        보상하기 위해 오랜 시간 동안 식사를 중단한다
                      </span>
                    </label>
                    <label className="flex items-start p-3 sm:p-2 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                      <Radio value={3} className="mt-1 mr-3" />
                      <span className="text-sm sm:text-base text-gray-700">
                        계속해서 과식한다
                      </span>
                    </label>
                    <label className="flex items-start p-3 sm:p-2 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                      <Radio value={4} className="mt-1 mr-3" />
                      <span className="text-sm sm:text-base text-gray-700">
                        다른 '금지된' 음식도 먹는다
                      </span>
                    </label>
                  </div>
                </Radio.Group>
              </Form.Item>
            </div>
          </Card>

          {/* Q5: 음식 섭취 의식 정도 (4점 척도) */}
          <Card className="bg-white rounded-xl shadow-sm border-0 overflow-hidden">
            <div className="p-2 sm:p-5">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-1">
                  <span className="text-orange-600 font-semibold text-sm">5</span>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                  번 질문
                </h3>
              </div>
              <p className="text-sm sm:text-base text-gray-600 mb-6 pl-4">
                체중을 조절할 때, 본인이 먹는 음식에 대해<br/> 얼마나 의식하고 있습니까?
              </p>
              <Form.Item
                name="q5_food_consciousness"
                rules={[{ required: true, message: '선택해 주세요' }]}
              >
                <LikertScale
                  value={form.getFieldValue('q5_food_consciousness')}
                  onChange={(value) => {
                    form.setFieldsValue({ q5_food_consciousness: value });
                  }}
                  options={[
                    '전혀 의식하지 않음',
                    '거의 의식하지 않음',
                    '조금 의식함',
                    '보통 의식함',
                    '적당히 의식함',
                    '많이 의식함',
                    '매우 의식함'
                  ]}
                  name="q5_food_consciousness"
                />
              </Form.Item>
            </div>
          </Card>

          {/* Q6 관련 항목 제거됨 */}
        </Form>
      </div>

      {/* 고정 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-2 z-40">
        <div className="max-w-2xl mx-auto space-y-3">
          <Button
            type="primary"
            loading={loading}
            block
            size="large"
            className="h-12 sm:h-14 text-base sm:text-lg font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 border-0 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            onClick={() => form.submit()}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                제출 중...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                설문 제출하기
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SurveyPage;