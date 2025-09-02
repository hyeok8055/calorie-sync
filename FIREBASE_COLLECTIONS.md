# Firebase 컬렉션 구조 가이드

이 문서는 Calorie Sync 애플리케이션에서 사용하는 Firebase Firestore 컬렉션 구조를 정리한 가이드입니다.

## 개요

- **인증 방식**: 이메일 기반 인증
- **사용자 식별자**: `email` (기존 `uid` 대신 사용)
- **데이터베이스**: Firebase Firestore

## 컬렉션 구조

### 1. 사용자 데이터 (`users/{email}`)

사용자의 기본 정보와 프로필 데이터를 저장합니다.

```
users/{email}
├── email: string (이메일 주소)
├── displayName: string (표시 이름)
├── photoURL: string (프로필 사진 URL)
├── personalInfo: object
│   ├── age: number (나이)
│   ├── gender: string (성별: 'male', 'female', 'other')
│   ├── height: number (키, cm)
│   ├── weight: number (몸무게, kg)
│   └── activityLevel: string (활동 수준)
├── preferences: object
│   ├── theme: string (테마 설정)
│   ├── notifications: boolean (알림 설정)
│   └── language: string (언어 설정)
├── createdAt: timestamp (계정 생성일)
└── updatedAt: timestamp (마지막 업데이트)
```

### 2. 식사 데이터 (`users/{email}/foods/{date}`)

일별 식사 기록을 저장합니다.

```
users/{email}/foods/{date}
├── date: string (YYYY-MM-DD 형식)
├── breakfast: object (아침 식사)
│   ├── flag: number (완료 여부: 0=미완료, 1=완료)
│   ├── foods: array (섭취한 음식 목록)
│   │   └── [음식 객체]
│   │       ├── name: string (음식 이름)
│   │       ├── calories: number (칼로리)
│   │       ├── weight: number (중량, g)
│   │       ├── portion: number (분량 배수)
│   │       └── nutrients: object
│   │           ├── carbs: number (탄수화물, g)
│   │           ├── protein: number (단백질, g)
│   │           └── fat: number (지방, g)
│   ├── originalCalories: object
│   │   ├── estimated: number (예상 칼로리)
│   │   └── actual: number (실제 칼로리)
│   ├── calorieDeviation: object
│   │   ├── natural: number (자연 편차)
│   │   ├── applied: number (적용된 편차)
│   │   ├── groupSettings: object (그룹 설정)
│   │   └── personalBias: number (개인 편향값)
│   ├── selectedFoods: array (선택된 음식 목록)
│   ├── groupDeviationConfig: object (그룹 편차 설정)
│   └── updatedAt: timestamp
├── lunch: object (점심 식사 - 구조 동일)
├── dinner: object (저녁 식사 - 구조 동일)
└── snacks: object (간식 - flag 필드 없음)
```

### 3. 운동 데이터 (`users/{email}/fitness/{date}`)

일별 운동 기록을 저장합니다.

```
users/{email}/fitness/{date}
├── date: string (YYYY-MM-DD 형식)
├── exercises: array (운동 기록 목록)
│   └── [운동 객체]
│       ├── id: string (운동 ID)
│       ├── exercise: string (운동 이름)
│       └── duration: number (운동 시간, 분)
├── totalDuration: number (총 운동 시간)
├── caloriesBurned: number (소모 칼로리)
├── createdAt: timestamp
└── updatedAt: timestamp
```

### 4. 칼로리 그룹 (`calorieGroups/{groupId}`)

칼로리 편차 관리를 위한 그룹 정보를 저장합니다.

```
calorieGroups/{groupId}
├── groupId: string (그룹 ID)
├── name: string (그룹 이름)
├── description: string (그룹 설명)
├── key: string (그룹 키)
├── deviationMultiplier: number (편차 배수)
├── defaultDeviation: number (기본 편차값)
├── createdBy: string (생성자 이메일)
├── createdDate: timestamp (생성일)
├── applicableDate: timestamp (적용일)
├── isActive: boolean (활성화 여부)
└── users/{email} (서브컬렉션)
    ├── email: string (사용자 이메일)
    ├── addedAt: timestamp (추가일)
    └── addedBy: string (추가한 사용자 이메일)
```

### 5. 개인 칼로리 편차 (`personalCalorieDeviation/{email}`)

개인별 칼로리 편차 설정을 저장합니다.

```
personalCalorieDeviation/{email}
├── email: string (사용자 이메일)
├── bias: number (개인 편향값)
├── isEnabled: boolean (활성화 여부)
├── createdAt: timestamp
└── updatedAt: timestamp
```

### 6. 설문조사 (`surveys/{surveyId}`)

설문조사 관련 데이터를 저장합니다.

```
surveys/{surveyId}
├── surveyId: string (설문 ID)
├── title: string (설문 제목)
├── description: string (설문 설명)
├── isActive: boolean (활성화 여부)
├── createdBy: string (생성자 이메일)
├── createdAt: timestamp
├── updatedAt: timestamp
└── responses/{email} (서브컬렉션)
    ├── userId: string (응답자 이메일)
    ├── surveyId: string (설문 ID)
    ├── responses: array (응답 목록)
    ├── submittedAt: timestamp (제출일)
    ├── deviceInfo: object (기기 정보)
    └── metadata: object (메타데이터)
```

### 7. 시스템 설정 (`system/survey`)

전역 설문조사 상태를 관리합니다.

```
system/survey
├── isActive: boolean (설문 활성화 여부)
├── surveyId: string (현재 활성 설문 ID)
└── updatedAt: timestamp
```

## 데이터 접근 패턴

### 1. 사용자 데이터 조회
```javascript
// 사용자 정보 가져오기
const userDoc = await getDoc(doc(db, 'users', email));
```

### 2. 일별 식사 데이터 조회/저장
```javascript
// 특정 날짜 식사 데이터 가져오기
const foodDoc = await getDoc(doc(db, 'users', email, 'foods', date));

// 식사 데이터 저장
await setDoc(doc(db, 'users', email, 'foods', date), mealData);
```

### 3. 운동 데이터 조회/저장
```javascript
// 특정 날짜 운동 데이터 가져오기
const fitnessDoc = await getDoc(doc(db, 'users', email, 'fitness', date));

// 운동 데이터 저장
await setDoc(doc(db, 'users', email, 'fitness', date), fitnessData);
```

### 4. 그룹 관리
```javascript
// 그룹 정보 가져오기
const groupDoc = await getDoc(doc(db, 'calorieGroups', groupId));

// 그룹 멤버 추가
await setDoc(doc(db, 'calorieGroups', groupId, 'users', email), memberData);
```

## 보안 규칙 고려사항

1. **사용자 데이터**: 각 사용자는 자신의 데이터만 읽기/쓰기 가능
2. **그룹 데이터**: 그룹 관리자만 그룹 설정 변경 가능
3. **설문조사**: 모든 사용자가 읽기 가능, 관리자만 생성/수정 가능
4. **시스템 설정**: 관리자만 접근 가능

## 마이그레이션 가이드

기존 `uid` 기반 데이터를 `email` 기반으로 마이그레이션할 때:

1. 기존 `users/{uid}` → `users/{email}`
2. 기존 `users/{uid}/foods/{date}` → `users/{email}/foods/{date}`
3. 기존 `users/{uid}/fitness/{date}` → `users/{email}/fitness/{date}`
4. 그룹 멤버 정보에서 `uid` → `email` 변경
5. 설문조사 응답에서 `uid` → `userId(email)` 변경

## 주의사항

1. **이메일 형식**: 모든 이메일은 소문자로 정규화하여 저장
2. **날짜 형식**: 날짜는 `YYYY-MM-DD` 형식으로 통일
3. **타임스탬프**: Firebase `serverTimestamp()` 사용 권장
4. **데이터 검증**: 클라이언트와 서버 양쪽에서 데이터 유효성 검사 필수
5. **인덱스**: 자주 쿼리하는 필드에 대해 복합 인덱스 설정 고려

## 성능 최적화

1. **배치 작업**: 여러 문서를 동시에 업데이트할 때 배치 쓰기 사용
2. **캐싱**: 자주 접근하는 데이터는 로컬 캐싱 고려
3. **페이지네이션**: 대량 데이터 조회 시 페이지네이션 적용
4. **실시간 리스너**: 필요한 경우에만 실시간 리스너 사용

---

이 문서는 현재 애플리케이션의 실제 구현을 기반으로 작성되었으며, 스키마 변경 시 함께 업데이트되어야 합니다.