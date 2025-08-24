# 칼로리 편차 관리 시스템 분석 보고서

## 📋 개요

현재 Calorie Sync 프로젝트에서 칼로리 편차 관리는 두 가지 주요 개념으로 구성되어 있습니다:

1. **calorieBias**: 사용자별 칼로리 편향값 (설정값)
2. **offset**: 실제 식사 데이터에 적용되는 칼로리 오프셋 (조정값)

## 🔍 데이터 구조 분석

### 1. 사용자 정보 (users 컬렉션)

```javascript
users/{uid}/
├── calorieBias: number  // 사용자별 칼로리 편향값 (기본값: 0)
├── group: number        // 그룹 번호
└── ... (기타 사용자 정보)
```

### 2. 식사 데이터 (foods 서브컬렉션)

```javascript
users/{uid}/foods/{YYYY-MM-DD}/
├── breakfast: {
│   ├── actualCalories: number
│   ├── estimatedCalories: number
│   ├── offset?: number              // 칼로리 오프셋 (조정값)
│   └── ... (기타 식사 정보)
│ }
├── lunch: { ... }
├── dinner: { ... }
└── snacks: { ... }
```

## 🛠️ 핵심 기능 분석

### 1. CalorieAdminPage.jsx - 관리자 페이지

#### 주요 기능:
- **사용자별 calorieBias 설정**: 개별 사용자의 칼로리 편향값 관리
- **그룹별 calorieBias 일괄 설정**: 선택된 그룹의 모든 사용자에게 동일한 편향값 적용
- **개별 편차 적용**: 특정 사용자의 calorieBias를 선택된 날짜/식사의 offset으로 적용
- **그룹 편차 적용**: 그룹 내 모든 사용자의 calorieBias를 offset으로 일괄 적용

#### 핵심 함수:

```javascript
// 개별 사용자 편차 적용
const applyCalorieBias = async (userId) => {
  const userCalorieBias = userInfo.calorieBias;
  const updateData = { [`${selectedMealType}.offset`]: userCalorieBias };
  await updateDoc(foodDocRef, updateData);
};

// 그룹 편차 일괄 적용
const applyGroupCalorieBias = async (groupKeyOrId) => {
  // 그룹 내 모든 사용자의 calorieBias를 offset으로 적용
  batch.update(foodDocRef, { [`${selectedMealType}.offset`]: userCalorieBias });
};
```

### 2. useModal.jsx - 칼로리 차이 계산 훅

#### 주요 기능:
- **최종 칼로리 차이 계산**: 원본 차이 + offset
- **offset 값 반환**: 특정 식사의 offset 값 조회

#### 핵심 로직:

```javascript
const getCalorieDifference = useCallback((mealType) => {
  const originalDifference = meal.actualCalories - meal.estimatedCalories;
  const offset = (typeof meal.offset === 'number') ? meal.offset : 0;
  return originalDifference + offset; // 최종 차이 = 원본 차이 + offset
}, [foodData]);

const getMealOffset = useCallback((mealType) => {
  return (typeof meal.offset === 'number') ? meal.offset : 0;
}, [foodData]);
```

### 3. SurveyPage.jsx - 설문 페이지

#### 주요 기능:
- **점심 칼로리 편차 계산**: offset을 반영한 실제 칼로리 계산
- **설문 조건부 표시**: 편차가 양수일 때만 특정 질문 표시

#### 핵심 로직:

```javascript
useEffect(() => {
  if (foodData && foodData.lunch) {
    // offset 반영하여 실제 칼로리 계산
    const actualCaloriesWithOffset = lunch.actualCalories + (lunch.offset || 0);
    const difference = lunch.estimatedCalories - actualCaloriesWithOffset;
    
    // 편차가 양수일 때만 표시 (예상보다 적게 섭취한 경우)
    if (difference > 0) {
      setLunchCalorieDifference(Math.round(difference));
    }
  }
}, [foodData]);
```

## 🔄 데이터 플로우

### 1. 편차 설정 플로우

```
관리자 페이지 → 사용자 선택 → calorieBias 설정 → users/{uid} 문서 업데이트
```

### 2. 편차 적용 플로우

```
관리자 페이지 → 날짜/식사 선택 → 사용자/그룹 선택 → calorieBias를 offset으로 복사 → foods/{date} 문서 업데이트
```

### 3. 편차 계산 플로우

```
식사 데이터 로드 → 원본 차이 계산 → offset 적용 → 최종 차이 표시
```

## 🎯 UI/UX 구성

### 1. 관리자 페이지 UI

- **그룹 카드**: 그룹별 사용자 수, 평균 편차, 사용자 목록 표시
- **사용자 테이블**: 칼로리 편차 설정값, 식사 정보, 작업 버튼
- **편차 설정 모달**: 개별/그룹 calorieBias 설정
- **편차 적용 버튼**: 설정된 calorieBias를 offset으로 적용

### 2. 편차 표시 방식

- **색상 코딩**: 
  - 양수(빨간색): 예상보다 적게 섭취
  - 음수(파란색): 예상보다 많이 섭취
  - 0(기본색): 편차 없음

- **툴팁**: 상세 정보 표시 (실제/예상 칼로리, offset 값)

## ⚠️ 발견된 이슈 및 개선점

### 1. 용어 혼재 문제

**문제**: `calorieBias`와 `offset`이 혼재되어 사용됨
- `calorieBias`: 사용자 설정값 (users 컬렉션)
- `offset`: 실제 적용값 (foods 컬렉션)

**개선 방안**: 용어 통일 또는 명확한 구분 필요

### 2. 데이터 일관성 문제

**문제**: `calorieBias` 설정과 `offset` 적용이 별도 프로세스
- 설정 변경 시 기존 적용된 offset과 불일치 가능
- 수동 적용 방식으로 인한 누락 가능성

**개선 방안**: 
- 자동 동기화 메커니즘 구현
- 일괄 업데이트 기능 강화

### 3. 레거시 코드 혼재

**문제**: 다양한 계산 방식이 혼재됨
- SurveyPage: `actualCalories + offset`
- useModal: `originalDifference + offset`
- CalorieAdminPage: 두 방식 모두 사용

**개선 방안**: 통일된 계산 로직 정의 및 적용

### 4. 성능 최적화 필요

**문제**: 
- 그룹 편차 적용 시 개별 문서 확인으로 인한 성능 저하
- 전체 데이터 리로드로 인한 UX 저하

**개선 방안**:
- 배치 처리 최적화
- 로컬 상태 업데이트로 즉시 반영

## 📊 통계 및 현황

### 코드 분포

- **CalorieAdminPage.jsx**: 1,365줄 (주요 관리 기능)
- **useModal.jsx**: 441줄 (계산 로직)
- **SurveyPage.jsx**: 645줄 (사용자 인터페이스)

### 주요 키워드 사용 빈도

- `calorieBias`: 25회 (주로 CalorieAdminPage)
- `offset`: 15회 (useModal, SurveyPage, CalorieAdminPage)
- `편차`: 20회 (UI 텍스트)

## 🚀 권장 리팩토링 방향

### 1. 단계별 접근

1. **용어 정리**: `calorieBias` → `calorieDeviation`, `offset` → `appliedDeviation`
2. **로직 통합**: 단일 계산 함수로 통합
3. **자동화**: 설정 변경 시 자동 적용 옵션
4. **성능 개선**: 배치 처리 및 캐싱 최적화

### 2. 새로운 아키텍처 제안

```javascript
// 통합된 편차 관리 훅
const useCalorieDeviation = () => {
  const calculateFinalDifference = (meal, userDeviation) => {
    const originalDiff = meal.actualCalories - meal.estimatedCalories;
    const appliedDeviation = meal.appliedDeviation || 0;
    return originalDiff + appliedDeviation;
  };
  
  const applyDeviation = async (userId, date, mealType, deviation) => {
    // 통합된 편차 적용 로직
  };
  
  return { calculateFinalDifference, applyDeviation };
};
```

### 3. 데이터 마이그레이션 계획

1. **백업**: 현재 데이터 백업
2. **점진적 마이그레이션**: 새 필드 추가 후 기존 필드 유지
3. **검증**: 데이터 일관성 검증
4. **정리**: 레거시 필드 제거

## 📝 결론

현재 칼로리 편차 관리 시스템은 기본적인 기능은 구현되어 있으나, 용어 혼재, 데이터 일관성, 성능 등의 개선이 필요합니다. 체계적인 리팩토링을 통해 더 안정적이고 사용자 친화적인 시스템으로 발전시킬 수 있을 것입니다.