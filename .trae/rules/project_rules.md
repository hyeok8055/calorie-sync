---
description: "Calorie Sync - React PWA 프로젝트 개발 규칙"
globs: ["src/**/*.{js,jsx}"]
alwaysApply: true
---

# Calorie Sync 프로젝트 개발 규칙

## 📋 프로젝트 개요

### 기술 스택
- **프레임워크**: React 18.3.1 (함수형 컴포넌트)
- **번들러**: Vite
- **스타일링**: Tailwind CSS v3
- **UI 라이브러리**: Ant Design v5, Ant Design Mobile
- **상태 관리**: Redux v5 + Redux Persist
- **라우팅**: React Router v7
- **백엔드**: Firebase (Firestore + Realtime Database + Auth)
- **배포**: PWA (Progressive Web App)

### 프로젝트 구조
```
src/
├── components/          # React 컴포넌트
│   ├── common/         # 재사용 가능한 공통 컴포넌트
│   ├── Header.jsx      # 헤더 컴포넌트
│   └── Footer.jsx      # 푸터 컴포넌트
├── pages/              # 페이지 컴포넌트
├── hook/               # 커스텀 훅
├── redux/              # Redux 상태 관리
│   ├── actions/        # Redux 액션
│   ├── reducers/       # Redux 리듀서
│   └── store.js        # Redux 스토어 설정
├── api/                # API 관련 함수
├── styles/             # 스타일 파일
├── utils/              # 유틸리티 함수
└── assets/             # 정적 자산
```

## 🎯 개발 원칙

### 컴포넌트 설계
- **함수형 컴포넌트만 사용**
- **재사용 가능한 컴포넌트는 `src/components/common/`에 위치**
- **페이지 컴포넌트는 `src/pages/`에 위치**
- **PropTypes로 props 타입 정의 필수**
- **컴포넌트명은 PascalCase 사용**

### 훅(Hooks) 사용
- **커스텀 훅은 `src/hook/`에 위치**
- **훅 이름은 'use'로 시작**
- **side effects는 useEffect 내에서 처리**
- **재사용성을 고려한 설계**

### 코드 스타일
- **ESLint + Prettier 사용 (eslint.config.js 참조)**
- **변수명: camelCase**
- **상수명: UPPER_CASE**
- **화살표 함수 우선 사용**
- **들여쓰기: 2 spaces**

## 🎨 스타일링 가이드

### Tailwind CSS
- **기본 스타일링 도구로 사용**
- **반응형 디자인은 Tailwind 유틸리티 클래스 활용**
- **커스텀 CSS는 최소화**

### UI 컴포넌트
- **Ant Design**: 데스크톱 환경 최적화
- **Ant Design Mobile**: 모바일 환경 최적화
- **공식 문서 예제 참고하여 사용**
- **기본 스타일 유지, 필요시 Tailwind로 추가 스타일링**

## ⚡ 성능 최적화

### 렌더링 최적화
- **React.memo로 불필요한 리렌더링 방지**
- **useMemo, useCallback 적절히 활용**
- **컴포넌트 분할로 렌더링 범위 최소화**

### 자산 관리
- **이미지는 `/public` 혹은 `src/assets/` 에서 관리**
- **lazy loading 적용**
- **API 호출에 debounce/throttle 적용**

## 🗄️ 데이터베이스 구조

### Firebase Firestore 구조

#### 사용자 정보 (users 컬렉션)
```
users/{uid}/
├── age: string                    // 나이
├── calorieBias: number            // 칼로리 편향값
├── createdAt: timestamp           // 계정 생성일
├── email: string                  // 이메일 주소
├── fcmToken: string               // FCM 푸시 알림 토큰
├── gender: string                 // 성별 ("male", "female")
├── goal: string                   // 목표 ("fitness", "weight_loss", etc.)
├── group: number                  // 그룹 번호
├── height: string                 // 키 (cm)
├── lastLoginAt: timestamp         // 마지막 로그인 시간
├── name: string                   // 사용자 이름
├── notificationEnabled: boolean   // 알림 활성화 여부
├── photoURL: string               // 프로필 사진 URL
├── platform: string               // 플랫폼 ("iOS", "Android")
└── setupCompleted: boolean        // 초기 설정 완료 여부
```

#### 식사 플래그 데이터 (meals 서브컬렉션)
```
users/{uid}/meals/{YYYY-MM-DD}/
├── breakfast: {
│   ├── flag: number          // 식사 완료 플래그 (0 또는 1)
│   └── updatedAt: string     // 업데이트 시간 (ISO string)
│ }
├── lunch: {
│   ├── flag: number
│   └── updatedAt: string
│ }
├── dinner: {
│   ├── flag: number
│   └── updatedAt: string
│ }
└── snack: {
    ├── flag: number
    └── updatedAt: string
  }
```

#### 음식 데이터 (foods 서브컬렉션)
```
users/{uid}/foods/{YYYY-MM-DD}/
├── date: string              // 날짜 (YYYY-MM-DD)
├── breakfast: {
│   ├── flag: number          // 식사 완료 플래그 (0 또는 1)
│   ├── foods: Array<{
│   │   ├── name: string      // 음식명
│   │   ├── calories: number  // 칼로리
│   │   ├── weight: number    // 중량
│   │   ├── portion: number   // 분량
│   │   └── nutrients: {
│   │       ├── carbs: number    // 탄수화물
│   │       ├── fat: number      // 지방
│   │       └── protein: number  // 단백질
│   │   }
│   │ }>
│   ├── estimatedCalories: number | null  // 예상 칼로리
│   ├── actualCalories: number | null     // 실제 칼로리
│   ├── selectedFoods: Array             // 선택된 음식 목록
│   └── offset?: number                   // 칼로리 오프셋 (조정값)
│ }
├── lunch: { /* breakfast와 동일 구조 */ }
├── dinner: { /* breakfast와 동일 구조 */ }
└── snacks: {
    ├── foods: Array<음식객체>     // 간식 목록
    ├── estimatedCalories: number | null
    ├── actualCalories: number | null
    └── selectedFoods: Array
  }
```

#### 운동 데이터 (fitness 서브컬렉션)
```
users/{uid}/fitness/{YYYY-MM-DD}/
├── date: string              // 날짜
├── weight: number            // 체중
└── exercises: Array<{
    ├── name: string          // 운동명
    ├── duration?: number     // 운동 시간
    ├── calories?: number     // 소모 칼로리
    └── (기타 운동 정보)
  }>
```

#### 시스템 설정 데이터 (system 컬렉션)
```
system/
├── survey: {
│   ├── isActive: boolean         // 설문조사 활성화 여부
│   ├── surveyId: string          // 현재 설문조사 ID
│   ├── activatedAt: timestamp    // 설문조사 활성화 시간
│   ├── activatedBy: string       // 설문조사 활성화한 관리자 UID
│   ├── deactivatedAt?: timestamp // 설문조사 비활성화 시간
│   └── deactivatedBy?: string    // 설문조사 비활성화한 관리자 UID
│ }
└── (기타 시스템 설정)
```

#### 설문조사 응답 데이터 (surveys 컬렉션)
```
surveys/{surveyId}/responses/{userId}/
├── userId: string            // 응답자 사용자 ID
├── surveyId: string          // 설문조사 ID
├── submittedAt: timestamp    // 응답 제출 시간
├── responses: Array<{        // 설문조사 응답 목록
│   ├── questionId: string    // 질문 ID
│   ├── questionText: string  // 질문 내용
│   ├── answerType: string    // 답변 유형 ("single", "multiple", "text", "rating")
│   ├── answer: any           // 답변 내용 (문자열, 배열, 숫자 등)
│   └── answeredAt: timestamp // 답변 시간
│ }>
├── deviceInfo?: {            // 응답 시 디바이스 정보 (선택사항)
│   ├── platform: string      // 플랫폼 ("iOS", "Android", "Web")
│   ├── userAgent?: string    // 브라우저 정보
│   └── screenSize?: string   // 화면 크기
│ }
└── metadata?: {              // 추가 메타데이터 (선택사항)
    ├── completionTime: number // 완료 소요 시간 (초)
    ├── source: string        // 응답 경로 ("modal", "direct")
    └── version: string       // 설문조사 버전
  }
```

#### 칼로리 그룹 데이터 (calorieGroups 컬렉션)
```
calorieGroups/{groupId}/
├── id: string                // 그룹 고유 ID (기본 그룹: 'default')
├── name: string              // 그룹명
├── description: string       // 그룹 설명
├── color: string             // 그룹 색상 (기본값: '#1677ff')
├── isDefault: boolean        // 기본 그룹 여부 (기본 그룹은 삭제 불가)
├── createdAt: timestamp      // 그룹 생성일
├── updatedAt: timestamp      // 그룹 수정일
├── createdBy: string         // 그룹 생성자 UID
└── userCount?: number        // 그룹 소속 사용자 수 (계산된 값)
```

### Firebase Realtime Database 구조

#### 음식 정보 데이터베이스
```
foods/
└── {foodId}: {
    ├── name: string          // 음식명
    ├── calories: number      // 100g당 칼로리
    ├── weight: string        // 기준 중량 (예: "100g")
    └── nutrients: {
        ├── carbs: number     // 탄수화물 (g)
        ├── fat: number       // 지방 (g)
        └── protein: number   // 단백질 (g)
      }
  }
```

### 데이터 접근 패턴

#### 음식 데이터 관리 (useFood 훅)
- **일일 음식 데이터 조회**: `users/{uid}/foods/{YYYY-MM-DD}`
- **간식 처리**: 시간대에 따라 해당 식사(아침/점심/저녁)에 자동 통합
  - 0-12시: breakfast에 통합
  - 12-18시: lunch에 통합
  - 18-24시: dinner에 통합
- **음식 정보 검색**: Realtime DB에서 `name` 속성으로 쿼리

#### 운동 데이터 관리 (useFitness 훅)
- **데이터 조회**: 날짜 역순으로 정렬 (`orderBy('date', 'desc')`)
- **데이터 저장**: 날짜를 문서 ID로 사용
- **데이터 삭제**: 문서 ID로 직접 삭제

#### 사용자 인증 (useAuth 훅)
- **사용자 정보**: Firestore에서 추가 정보 조회
- **설정 완료 상태**: `setupCompleted` 필드로 관리

#### 설문조사 데이터 관리 (useSurvey 훅)
- **시스템 설정 조회**: `system/survey` 문서에서 활성화 상태 확인
- **응답 저장**: `surveys/{surveyId}/responses/{userId}` 구조로 저장
- **응답 조회**: 특정 설문조사의 모든 응답 또는 사용자별 응답 조회
- **통계 계산**: 플랫폼별, 날짜별 응답 통계 및 완료 시간 분석
- **완료 여부 확인**: 사용자별 설문조사 참여 여부 실시간 확인

#### 칼로리 그룹 관리 (CalorieAdminPage)
- **그룹 데이터 조회**: `calorieGroups` 컬렉션에서 모든 그룹 정보 로드
- **기본 그룹 보장**: 'default' ID를 가진 기본 그룹이 없으면 자동 생성
- **사용자-그룹 연결**: `users/{uid}` 문서의 `group` 필드로 그룹 연결 (number 타입)
  - 기본 그룹 값: `0` (DEFAULT_GROUP_VALUE)
  - 사용자 그룹이 유효하지 않으면 기본 그룹으로 할당
- **그룹 삭제 시 처리**: 삭제되는 그룹의 모든 사용자를 기본 그룹으로 이동
- **칼로리 편차 관리**: 그룹별 또는 개별 사용자별 칼로리 오프셋 적용
- **관리자 권한**: 하드코딩된 ADMIN_EMAILS 목록으로 접근 제어

### 데이터 유효성 검사
- 모든 숫자 필드는 `Number()` 변환 후 `isNaN()` 검사
- 배열 필드는 기본값 `[]`로 초기화
- null/undefined 값에 대한 안전한 처리 필수

## 🔄 Redux 상태 관리 구조

### Redux Store 설정
- **영구 저장**: `redux-persist`를 사용하여 **로컬 스토리지**에 상태 영구 저장
- **저장소**: 브라우저 로컬 스토리지 (`redux-persist/lib/storage`)
- **직렬화**: 비직렬화 가능한 액션들에 대한 예외 처리 적용

### Redux 상태 구조

#### 인증 상태 (auth)
```javascript
auth: {
  isAuthenticated: boolean,     // 로그인 상태
  user: {                       // 사용자 정보 (Firebase에서 가져온 데이터)
    uid: string,
    email: string,
    name: string,
    setupCompleted: boolean,    // 초기 설정 완료 여부
    // ... 기타 사용자 정보
  },
  token: string | null,         // 인증 토큰
  fcmToken: string | null       // FCM 푸시 알림 토큰
}
```

#### 주간 데이터 (weekly)
```javascript
weekly: {
  weeklyData: object | null,    // 주간 통계 데이터
  lastFetched: string | null    // 마지막 데이터 가져온 시간 (ISO string)
}
```

#### 음식 데이터 (food)
```javascript
food: {
  foods: object | null          // 현재 선택된 음식 데이터
}
```

#### 식사 플래그 (meal)
```javascript
meal: {
  mealFlags: {
    breakfast: number,          // 0: 미기록, 1: 식사완료, 2: 단식
    lunch: number,
    dinner: number,
    snack: number
  }
}
```

#### 설문조사 상태 (survey)
```javascript
survey: {
  isActive: boolean,           // 설문조사 활성화 여부
  surveyId: string | null,     // 현재 설문조사 ID
  activatedAt: string | null,  // 설문조사 활성화 시간
  completedSurveys: Array<{    // 완료된 설문조사 목록
    surveyId: string,
    completedAt: string
  }>,
  lastChecked: string | null,  // 마지막 확인 시간
  responses: {                 // 설문조사별 응답 목록
    [surveyId]: {
      responses: Array,
      fetchedAt: string
    }
  },
  statistics: {                // 설문조사별 통계
    [surveyId]: {
      statistics: object,
      fetchedAt: string
    }
  },
  userResponses: {             // 사용자별 설문조사 응답
    [surveyId]: {
      response: object,
      fetchedAt: string
    }
  }
}
```

### Redux 액션 타입
- `SET_AUTH_STATUS`: 사용자 인증 상태 설정
- `CLEAR_AUTH_STATUS`: 인증 상태 초기화
- `SET_FCM_TOKEN`: FCM 토큰 설정
- `SET_WEEKLY_DATA`: 주간 데이터 설정
- `CLEAR_WEEKLY_DATA`: 주간 데이터 초기화
- `SET_FOODS`: 음식 데이터 설정
- `SET_MEAL_FLAGS`: 식사 플래그 일괄 설정
- `UPDATE_MEAL_FLAG`: 개별 식사 플래그 업데이트
- `SET_SURVEY_ACTIVE`: 설문조사 활성화 상태 설정
- `SET_SURVEY_COMPLETED`: 설문조사 완료 상태 설정
- `CLEAR_SURVEY_STATUS`: 설문조사 상태 초기화
- `SET_SURVEY_RESPONSES`: 설문조사 응답 목록 설정
- `SET_SURVEY_STATISTICS`: 설문조사 통계 설정
- `SET_USER_SURVEY_RESPONSE`: 사용자 설문조사 응답 설정
- `CLEAR_SURVEY_DATA`: 설문조사 데이터 초기화

### 데이터 저장 방식
1. **영구 저장**: 모든 Redux 상태는 로컬 스토리지에 자동 저장
2. **실시간 동기화**: Firebase와의 데이터는 실시간으로 동기화되지 않음 (필요시 수동 갱신)
3. **캐싱**: 주간 데이터는 `lastFetched` 타임스탬프로 캐시 관리
4. **세션 관리**: 앱 재시작 시 로컬 스토리지에서 상태 복원

### 데이터 흐름
1. **로그인**: Firebase Auth → Redux auth 상태 업데이트 → 로컬 스토리지 저장
2. **음식 데이터**: Firebase Firestore → Redux food 상태 → 로컬 스토리지 저장
3. **식사 플래그**: Firebase Firestore → Redux meal 상태 → 로컬 스토리지 저장
4. **주간 통계**: Firebase 집계 → Redux weekly 상태 → 로컬 스토리지 저장
5. **설문조사**: Firebase Firestore → Redux survey 상태 → 로컬 스토리지 저장

## 📚 추가 문서

### 관리자 기능 문서
- **[CalorieAdminPage 기능 문서](.trae/docs/calorie-admin-features.md)**: 칼로리 그룹 관리 및 사용자 관리 기능의 상세 로직과 데이터 스키마
