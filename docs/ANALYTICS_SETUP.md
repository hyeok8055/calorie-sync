# Firebase Analytics & GA4 설정 가이드

이 프로젝트는 Firebase Analytics와 Google Analytics 4(GA4)를 통합하여 사용자 활동을 추적합니다.

## 📋 목차

1. [Firebase Analytics 설정](#firebase-analytics-설정)
2. [추적되는 이벤트](#추적되는-이벤트)
3. [GA4 대시보드 확인](#ga4-대시보드-확인)
4. [커스텀 이벤트 추가 방법](#커스텀-이벤트-추가-방법)

---

## 🔧 Firebase Analytics 설정

### 1. Firebase 프로젝트 설정 확인

프로젝트의 Firebase 설정에 `measurementId`가 포함되어 있는지 확인하세요:

```javascript
// firebaseconfig.js
const firebaseConfig = {
  // ... 기타 설정
  measurementId: "G-XXXXXXXXXX"  // 이 값이 있어야 Analytics가 작동합니다
};
```

### 2. Firebase Console에서 Analytics 활성화

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **Analytics** 클릭
4. Analytics 활성화 (아직 활성화되지 않은 경우)
5. Google Analytics 계정 연결

### 3. 자동 수집되는 데이터

Firebase Analytics는 다음 데이터를 자동으로 수집합니다:
- 페이지 조회수
- 세션 시작/종료
- 첫 방문/재방문
- 사용자 참여도
- 기기 및 브라우저 정보
- 지리적 위치 (국가/도시)

---

## 📊 추적되는 이벤트

### 인증 관련

| 이벤트 이름 | 설명 | 파라미터 |
|-----------|------|---------|
| `login` | 사용자 로그인 (기존 사용자) | `method`: 로그인 방법 (google) |
| `sign_up` | 신규 가입 (새 사용자) | `method`: 가입 방법 (google) |
| `logout` | 로그아웃 | - |
| `profile_setup` | 초기 프로필 설정 완료 | `height`, `age`, `gender`, `goal` |
| `profile_update` | 프로필 정보 업데이트 | `updated_fields`: 변경된 필드 목록 |

### 칼로리 및 식사 관련

| 이벤트 이름 | 설명 | 파라미터 |
|-----------|------|---------|
| `calorie_entry` | 칼로리 입력 | `calorie_amount`, `meal_type`, `timestamp` |
| `calorie_goal_set` | 칼로리 목표 설정 | `goal_amount` |
| `meal_add` | 식사 추가 | `meal_type`, `food_count`, `total_calories` |
| `meal_delete` | 식사 삭제 | `meal_type` |
| `fasting_toggle` | 단식 모드 전환 | `is_enabled` |

### 음식 검색 및 선택

| 이벤트 이름 | 설명 | 파라미터 |
|-----------|------|---------|
| `food_search` | 음식 검색 | `search_term`, `results_count` |
| `food_select` | 음식 선택 | `food_name`, `calories` |

### 설문조사

| 이벤트 이름 | 설명 | 파라미터 |
|-----------|------|---------|
| `survey_start` | 설문조사 시작 | - |
| `survey_complete` | 설문조사 완료 | `age_group`, `gender`, `height`, `weight`, `activity_level` |

### 피트니스

| 이벤트 이름 | 설명 | 파라미터 |
|-----------|------|---------|
| `fitness_data_sync` | 피트니스 데이터 동기화 | `steps_count`, `calories_burned` |
| `fitness_permission_request` | 피트니스 권한 요청 | `granted` |
| `exercise_add` | 운동 추가 | `exercise_name`, `duration_minutes` |
| `exercise_delete` | 운동 삭제 | `exercise_name` |
| `weight_record` | 체중 기록 | `weight`, `is_first_record` |

### BMI 계산

| 이벤트 이름 | 설명 | 파라미터 |
|-----------|------|---------|
| `bmi_calculation` | BMI 계산 | `bmi_value`, `bmi_category` |

### 리포트 및 차트

| 이벤트 이름 | 설명 | 파라미터 |
|-----------|------|---------|
| `weekly_report_view` | 주간 리포트 조회 | `week_number` |
| `chart_view` | 차트 조회 | `chart_type` |

### 알림

| 이벤트 이름 | 설명 | 파라미터 |
|-----------|------|---------|
| `notification_permission` | 알림 권한 요청 결과 | `granted` |
| `notification_received` | 알림 수신 | `notification_type` |

### PWA

| 이벤트 이름 | 설명 | 파라미터 |
|-----------|------|---------|
| `pwa_install_prompt` | PWA 설치 프롬프트 응답 | `accepted` |
| `pwa_installed` | PWA 설치 완료 | - |

### 페이지 뷰

| 이벤트 이름 | 설명 | 파라미터 |
|-----------|------|---------|
| `page_view` | 페이지 조회 | `page_name`, `page_title`, `page_location` |

### 에러 및 참여도

| 이벤트 이름 | 설명 | 파라미터 |
|-----------|------|---------|
| `error_occurred` | 에러 발생 | `error_message`, `error_context` |
| `user_engagement` | 사용자 참여도 | `engagement_time_msec`, `page` |

### 관리자 액션

| 이벤트 이름 | 설명 | 파라미터 |
|-----------|------|---------|
| `admin_action` | 관리자 작업 | `action_type`, `details` |
| `survey_activate` | 설문조사 활성화 | `surveyId` |
| `survey_deactivate` | 설문조사 비활성화 | `surveyId` |
| `push_notification_sent` | 푸시 알림 발송 | `notification_type`, `has_custom_message` |
| `data_export` | 데이터 내보내기 | `export_type`, `record_count` |

---

## 📈 GA4 대시보드 확인

### Firebase Console에서 확인

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택
3. **Analytics > Dashboard** 클릭
4. 실시간 데이터 및 이벤트 확인

### Google Analytics에서 확인

1. [Google Analytics](https://analytics.google.com/) 접속
2. 연결된 속성 선택
3. **보고서 > 실시간** - 실시간 사용자 활동 확인
4. **보고서 > 이벤트** - 모든 이벤트 로그 확인
5. **탐색 > 맞춤 탐색** - 커스텀 보고서 생성

### 유용한 GA4 보고서

- **이벤트 보고서**: 모든 커스텀 이벤트 확인
- **전환 보고서**: 주요 전환 이벤트 추적 (예: 식사 추가, 설문조사 완료)
- **사용자 속성**: 사용자 유형, 설문 완료 여부 등
- **퍼널 분석**: 사용자 여정 추적

---

## 🛠 커스텀 이벤트 추가 방법

### 1. Analytics 유틸리티 파일에 함수 추가

`src/utils/analytics.js` 파일에 새로운 이벤트 로깅 함수를 추가하세요:

```javascript
// 새로운 이벤트 함수 추가
export const logCustomEvent = (param1, param2) => {
  safeLogEvent('custom_event_name', {
    parameter1: param1,
    parameter2: param2,
    timestamp: new Date().toISOString()
  });
};
```

### 2. 컴포넌트에서 사용

```javascript
import { logCustomEvent } from '@/utils/analytics';

// 이벤트 발생 시점에 호출
const handleSomething = () => {
  // ... 로직 수행
  
  // Analytics 이벤트 로깅
  logCustomEvent(value1, value2);
};
```

### 3. 이벤트 명명 규칙

Firebase Analytics 권장 사항:
- 소문자와 언더스코어(_) 사용
- 최대 40자
- 숫자로 시작하지 않기
- 예약어 피하기 (예: `first_open`, `session_start`)

---

## 🔍 디버깅

### 개발 환경에서 이벤트 확인

브라우저 콘솔에서 Analytics 이벤트 로그를 확인할 수 있습니다:

```
[Analytics] meal_add {meal_type: "breakfast", food_count: 3, total_calories: 450}
```

### DebugView 사용 (Firebase Console)

1. Chrome 확장 프로그램 설치: [Google Analytics Debugger](https://chrome.google.com/webstore/detail/google-analytics-debugger)
2. 확장 프로그램 활성화
3. Firebase Console > Analytics > DebugView
4. 실시간으로 이벤트 디버깅

---

## 📝 주의사항

1. **개인정보 보호**: 민감한 개인 정보(이메일, 비밀번호 등)를 이벤트 파라미터에 포함하지 마세요.
2. **데이터 보존**: GA4는 기본적으로 14개월간 데이터를 보존합니다. 설정에서 변경 가능합니다.
3. **로컬 환경**: `localhost`에서는 Analytics가 자동으로 비활성화될 수 있습니다.
4. **쿼터 제한**: 
   - 이벤트 이름: 앱당 500개
   - 이벤트 파라미터: 이벤트당 25개
   - 사용자 속성: 25개

---

## 🔗 유용한 링크

- [Firebase Analytics 문서](https://firebase.google.com/docs/analytics)
- [GA4 이벤트 가이드](https://support.google.com/analytics/answer/9267735)
- [Analytics 권장사항](https://firebase.google.com/docs/analytics/events)
- [GA4 보고서 가이드](https://support.google.com/analytics/answer/9212670)
