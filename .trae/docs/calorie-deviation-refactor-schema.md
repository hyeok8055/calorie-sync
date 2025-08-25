# 칼로리 편차 관리 시스템 리팩토링 스키마

## 📋 개요

기존의 복잡한 편차 관리 로직을 단순화하고, 원본 칼로리와 편차를 명확히 분리하여 관리하는 새로운 시스템 설계

## 🗄️ 새로운 데이터 구조

### 1. 식사 데이터 구조 (foods 컬렉션)

```javascript
users/{uid}/foods/{YYYY-MM-DD}/
├── date: string
├── breakfast: {
│   ├── flag: number                    // 식사 상태 (0: 미기록, 1: 완료, 2: 단식)
│   ├── foods: Array<FoodItem>          // 음식 목록
│   ├── selectedFoods: Array            // 선택된 음식 목록
│   ├── updatedAt: string               // 업데이트 시간
│   │
│   // === 칼로리 관련 필드 (새로운 구조) ===
│   ├── originalCalories: {             // 원본 칼로리 (편차 적용 전)
│   │   ├── estimated: number | null    // 예상 칼로리
│   │   └── actual: number | null       // 실제 칼로리
│   │ }
│   ├── finalCalories: {                // 최종 칼로리 (편차 적용 후)
│   │   ├── estimated: number | null    // 편차 적용된 예상 칼로리
│   │   └── actual: number | null       // 편차 적용된 실제 칼로리
│   │ }
│   ├── calorieDeviation: {             // 칼로리 편차 정보
│   │   ├── natural: number             // 자연 편차 (실제 - 예상)
│   │   ├── applied: {                  // 적용된 인위적 편차
│   │   │   ├── type: 'percentage' | 'fixed'  // 편차 타입
│   │   │   ├── value: number           // 편차 값 (퍼센트면 0.1 = 10%, 고정값이면 실제 칼로리)
│   │   │   ├── calculatedAmount: number // 계산된 편차 칼로리
│   │   │   ├── appliedAt: timestamp    // 편차 적용 시간
│   │   │   ├── appliedBy: string       // 편차 적용자 (관리자 UID 또는 'user')
│   │   │   └── source: 'admin' | 'user' | 'group' // 편차 적용 출처
│   │   │ }
│   │   └── total: number               // 총 편차 (natural + applied.calculatedAmount)
│   │ }
│ }
├── lunch: { /* breakfast와 동일 구조 */ }
├── dinner: { /* breakfast와 동일 구조 */ }
└── snacks: { /* breakfast와 동일 구조 */ }
```

### 2. 편차 설정 데이터 구조 (deviationSettings 컬렉션)

```javascript
deviationSettings/
├── global/                             // 전역 편차 설정
│   ├── default: {
│   │   ├── type: 'percentage' | 'fixed'    // 기본 편차 타입
│   │   ├── value: number                   // 기본 편차 값
│   │   ├── description: string             // 설명
│   │   ├── isActive: boolean               // 활성화 여부
│   │   ├── createdAt: timestamp
│   │   ├── updatedAt: timestamp
│   │   └── createdBy: string               // 생성자 UID
│   │ }
│   └── presets: Array<{                    // 사전 정의된 편차 프리셋
│       ├── id: string
│       ├── name: string                    // 프리셋 이름 (예: "과소평가 10%", "고정 +50kcal")
│       ├── type: 'percentage' | 'fixed'
│       ├── value: number
│       ├── description: string
│       └── isActive: boolean
│     }>
├── groups/{groupId}/                   // 그룹별 편차 설정
│   ├── type: 'percentage' | 'fixed'
│   ├── value: number
│   ├── description: string
│   ├── isActive: boolean
│   ├── appliedAt: timestamp
│   ├── appliedBy: string
│   └── affectedUsers: Array<string>        // 영향받는 사용자 UID 목록
└── users/{userId}/                     // 개별 사용자 편차 설정
    ├── type: 'percentage' | 'fixed'
    ├── value: number
    ├── description: string
    ├── isActive: boolean
    ├── appliedAt: timestamp
    ├── appliedBy: string
    └── overridesGroup: boolean             // 그룹 설정 무시 여부
```

### 3. 편차 적용 히스토리 (deviationHistory 컬렉션)

```javascript
deviationHistory/{historyId}/
├── id: string                          // 히스토리 고유 ID
├── type: 'bulk_apply' | 'individual_apply' | 'setting_change'
├── targetType: 'global' | 'group' | 'user'
├── targetId: string                    // 대상 ID (groupId 또는 userId)
├── deviationConfig: {                  // 적용된 편차 설정
│   ├── type: 'percentage' | 'fixed'
│   ├── value: number
│   └── description: string
│ }
├── affectedData: {                     // 영향받은 데이터 정보
│   ├── userCount: number               // 영향받은 사용자 수
│   ├── recordCount: number             // 영향받은 식사 기록 수
│   ├── dateRange: {                    // 영향받은 날짜 범위
│   │   ├── start: string
│   │   └── end: string
│   │ }
│   └── users: Array<string>            // 영향받은 사용자 UID 목록
│ }
├── appliedAt: timestamp
├── appliedBy: string                   // 적용자 UID
└── notes?: string                      // 추가 메모
```

## 🔄 데이터 마이그레이션 전략

### 기존 데이터 호환성

```javascript
// 기존 필드 → 새로운 필드 매핑
const migrateOldData = (oldMealData) => {
  return {
    flag: oldMealData.flag || 0,
    foods: oldMealData.foods || [],
    selectedFoods: oldMealData.selectedFoods || [],
    updatedAt: oldMealData.updatedAt || new Date().toISOString(),
    
    // 새로운 칼로리 구조
    originalCalories: {
      estimated: oldMealData.estimatedCalories || null,
      actual: oldMealData.actualCalories ? 
        (oldMealData.actualCalories - (oldMealData.appliedDeviation || oldMealData.offset || 0)) : null
    },
    finalCalories: {
      estimated: oldMealData.estimatedCalories || null,
      actual: oldMealData.actualCalories || null
    },
    calorieDeviation: {
      natural: oldMealData.actualCalories && oldMealData.estimatedCalories ? 
        (oldMealData.actualCalories - oldMealData.estimatedCalories - (oldMealData.appliedDeviation || oldMealData.offset || 0)) : 0,
      applied: oldMealData.appliedDeviation || oldMealData.offset ? {
        type: 'fixed',
        value: oldMealData.appliedDeviation || oldMealData.offset || 0,
        calculatedAmount: oldMealData.appliedDeviation || oldMealData.offset || 0,
        appliedAt: oldMealData.deviationAppliedAt || new Date(),
        appliedBy: 'migration',
        source: 'migration'
      } : null,
      total: (oldMealData.appliedDeviation || oldMealData.offset || 0)
    }
  };
};
```

## 📊 새로운 계산 로직

### 편차 계산 공식

```javascript
// 1. 자연 편차 계산
const naturalDeviation = originalCalories.actual - originalCalories.estimated;

// 2. 인위적 편차 계산
const calculateAppliedDeviation = (deviationConfig, baseCalories) => {
  if (deviationConfig.type === 'percentage') {
    return baseCalories * deviationConfig.value; // value가 0.1이면 10%
  } else {
    return deviationConfig.value; // 고정값
  }
};

// 3. 최종 칼로리 계산
const finalCalories = {
  estimated: originalCalories.estimated + (appliedDeviation || 0),
  actual: originalCalories.actual + (appliedDeviation || 0)
};

// 4. 총 편차
const totalDeviation = naturalDeviation + (appliedDeviation || 0);
```

## 🎯 주요 개선사항

1. **명확한 데이터 분리**: 원본 칼로리와 편차 적용 후 칼로리를 완전히 분리
2. **유연한 편차 설정**: 퍼센트와 고정값 모두 지원
3. **추적 가능성**: 모든 편차 적용 히스토리 기록
4. **계층적 설정**: 전역 → 그룹 → 개별 사용자 순서로 편차 설정 적용
5. **롤백 지원**: 원본 데이터 보존으로 언제든 편차 제거 가능
6. **성능 최적화**: 복잡한 캐싱 로직 제거, 단순한 계산식 사용

## 🔧 구현 우선순위

1. **Phase 1**: 새로운 데이터 구조로 useCalorieDeviation 훅 리팩토링
2. **Phase 2**: useFood 훅에서 새로운 구조 지원
3. **Phase 3**: 관리자 페이지에서 편차 설정 및 일괄 적용 기능
4. **Phase 4**: 기존 데이터 마이그레이션 스크립트
5. **Phase 5**: 편차 히스토리 및 롤백 기능