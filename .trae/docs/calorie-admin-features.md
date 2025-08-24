---
description: "CalorieAdminPage.jsx 기능 및 로직 상세 문서"
created: "2025-01-24"
last_updated: "2025-01-24"
---

# CalorieAdminPage.jsx 기능 문서

## 📋 개요

**파일 위치**: `src/pages/auth/CalorieAdminPage.jsx`

**목적**: 칼로리 그룹 관리 및 사용자 관리를 위한 관리자 전용 페이지

**접근 권한**: 하드코딩된 관리자 이메일 목록으로 제한

## 🔐 권한 관리

### 관리자 이메일 목록
```javascript
const ADMIN_EMAILS = [
  'eodud653923@gmail.com',
  'youngwonhahn00@gmail.com',
  'juhyeok0123@gmail.com',
  'wn990123@gmail.com',
  'garcia29845@gmail.com',
  'yunj29845@gmail.com',
];
```

### 접근 제어 로직
- Redux에서 현재 사용자 정보 확인
- 사용자 이메일이 `ADMIN_EMAILS` 목록에 없으면 `/main`으로 리다이렉트
- 권한 없음 메시지 표시

## 🏷️ 상수 정의

### 기본 그룹 설정
```javascript
const DEFAULT_GROUP_ID = 'default';           // Firestore 문서 ID
const DEFAULT_GROUP_VALUE = 0;                 // 사용자 문서의 group 필드값
```

### 식사 유형 매핑
```javascript
const mealTypeKoreanMap = {
    breakfast: '아침',
    lunch: '점심',
    dinner: '저녁',
    snacks: '간식'
};
```

## 📊 상태 관리

### 주요 상태 변수

#### 데이터 상태
- `users`: 전체 사용자 목록
- `filteredUsers`: 필터링된 사용자 목록
- `groups`: 칼로리 그룹 목록
- `loadingGroups`: 그룹 데이터 로딩 상태
- `loadingUsers`: 사용자 데이터 로딩 상태

#### UI 상태
- `activeTab`: 현재 활성 탭 ('groups' 또는 'users')
- `searchTerm`: 사용자 검색어
- `selectedGroupKey`: 선택된 그룹 키
- `selectedDate`: 선택된 날짜 (dayjs 객체)
- `selectedMealType`: 선택된 식사 유형
- `showHelp`: 도움말 표시 여부

#### 모달 상태
- `isGroupSettingsModalVisible`: 그룹 설정 모달
- `isGroupEditModalVisible`: 그룹 편집 모달
- `isUserModalVisible`: 사용자 편집 모달
- `isAddUserModalVisible`: 사용자 추가 모달
- `isRandomUserModalVisible`: 랜덤 사용자 선택 모달

#### 편집 상태
- `currentUser`: 현재 편집 중인 사용자
- `editingGroup`: 현재 편집 중인 그룹
- `targetGroupForAddingUser`: 사용자 추가 대상 그룹
- `targetKeysForTransfer`: Transfer 컴포넌트 선택된 키

#### 랜덤 선택 상태
- `randomUserCount`: 랜덤 선택 사용자 수
- `randomUserPercentage`: 랜덤 선택 비율
- `randomSelectionMode`: 선택 모드 ('count' 또는 'percentage')
- `randomSelectedUsers`: 랜덤 선택된 사용자 목록

## 🗄️ 데이터 로딩 로직

### 그룹 데이터 로딩 (`fetchGroups`)

```javascript
const fetchGroups = useCallback(async () => {
  // 1. calorieGroups 컬렉션에서 모든 그룹 조회
  // 2. 기본 그룹 존재 여부 확인
  // 3. 기본 그룹이 없으면 자동 생성
  // 4. 그룹 데이터 상태 업데이트
}, []);
```

**기본 그룹 자동 생성 로직**:
- ID: `'default'`
- 이름: `'기본 그룹'`
- 색상: `'#8c8c8c'`
- 설명: `'그룹 미지정'`
- `isDefault: true`

### 사용자 데이터 로딩 (`fetchUsers`)

```javascript
const fetchUsers = useCallback(async (loadedGroups, date) => {
  // 1. users 컬렉션에서 모든 사용자 조회
  // 2. 각 사용자의 그룹 유효성 검사
  // 3. 유효하지 않은 그룹은 기본 그룹으로 자동 수정
  // 4. 선택된 날짜의 food 문서 로드
  // 5. 사용자 데이터 상태 업데이트
}, []);
```

**그룹 유효성 검사 로직**:
- `DEFAULT_GROUP_VALUE(0)` 또는 존재하는 비기본 그룹명만 유효
- 유효하지 않은 그룹은 `DEFAULT_GROUP_VALUE`로 자동 수정
- Firestore에 즉시 업데이트

### 통합 데이터 로딩 (`loadData`)

```javascript
const loadData = useCallback(async () => {
  // 1. 그룹 데이터 로딩
  // 2. 로딩된 그룹 정보로 사용자 데이터 로딩
  // 3. selectedDate 변경 시 자동 리로드
}, [fetchGroups, fetchUsers, selectedDate]);
```

## 🔍 검색 및 필터링

### 텍스트 검색
- 사용자 이메일 또는 이름으로 검색
- 대소문자 구분 없음
- 실시간 필터링

### 그룹별 필터링
```javascript
const filterByGroup = (groupValue) => {
  if (groupValue === 'all') {
    setFilteredUsers(users);
  } else {
    const filtered = users.filter(user => user.group === groupValue);
    setFilteredUsers(filtered);
  }
};
```

## 🏷️ 그룹 관리 기능

### 그룹 생성/수정

**모달 열기** (`handleOpenGroupEditModal`):
- 새 그룹: 기본값으로 폼 초기화
- 기존 그룹: 현재 값으로 폼 초기화
- 기본 색상: `#1677ff`

**저장 로직** (`handleSaveGroup`):
```javascript
const groupData = {
  name: values.name,
  description: values.description,
  color: typeof values.color === 'object' ? values.color.toHexString() : values.color,
};
```

**제약사항**:
- 기본 그룹(`isDefault: true`)은 수정 불가
- 그룹명 중복 검사 없음 (Firestore 문서 ID로 구분)

### 그룹 삭제

**삭제 로직** (`handleDeleteGroup`):
1. 기본 그룹 삭제 방지
2. 확인 모달 표시
3. 해당 그룹 소속 사용자를 기본 그룹으로 일괄 이동
4. Firestore batch write 사용
5. 그룹 문서 삭제

```javascript
// 사용자 그룹 일괄 변경
const usersInGroupQuery = query(collection(db, 'users'), where('group', '==', group.name));
const batch = writeBatch(db);
usersSnapshot.forEach(userDoc => {
  const userRef = doc(db, 'users', userDoc.id);
  batch.update(userRef, { group: DEFAULT_GROUP_VALUE });
});
await batch.commit();
```

## 👥 사용자 관리 기능

### 개별 사용자 편집

**편집 모달** (`handleEditUser`):
- 현재 그룹 및 칼로리 편차 표시
- 그룹 선택 드롭다운
- 칼로리 편차 숫자 입력

**저장 로직** (`handleSaveUserSettings`):
```javascript
// 그룹 유효성 검사
const isValidGroup = values.group === DEFAULT_GROUP_VALUE || 
                    groups.some(g => g.name === values.group && !g.isDefault);

if (!isValidGroup) {
  message.error('유효하지 않은 그룹입니다. 기본 그룹으로 설정됩니다.');
  values.group = DEFAULT_GROUP_VALUE;
}
```

### 그룹별 일괄 설정

**그룹 설정 모달** (`handleOpenGroupSettingsModal`):
- 선택된 그룹의 첫 번째 사용자 칼로리 편차를 기본값으로 설정
- 그룹 내 모든 사용자에게 동일한 칼로리 편차 적용

**일괄 저장** (`handleSaveGroupSettings`):
```javascript
const groupUsers = users.filter(user => user.group === selectedGroupKey);
const batch = writeBatch(db);
for (const groupUser of groupUsers) {
  const userRef = doc(db, 'users', groupUser.key);
  batch.update(userRef, { calorieBias: values.calorieBias });
}
await batch.commit();
```

### 사용자 그룹 추가

#### Transfer 컴포넌트 방식

**데이터 소스 준비** (`getTransferDataSource`):
```javascript
return users
  .filter(user => {
    if (targetGroupForAddingUser.isDefault) {
      return user.group !== DEFAULT_GROUP_VALUE;
    } else {
      return user.group !== targetGroupForAddingUser.name;
    }
  })
  .map(user => ({
    key: user.key,
    title: `${user.name} (${user.email})`,
    description: `현재 그룹: ${currentGroupName}`
  }));
```

**추가 로직** (`handleAddUsersToGroup`):
1. 대상 그룹 유효성 검사
2. 선택된 사용자들의 그룹 필드 일괄 업데이트
3. Firestore batch write 사용

#### 랜덤 선택 방식

**선택 모드**:
- `count`: 지정된 인원수만큼 선택
- `percentage`: 전체 대상자의 지정된 비율만큼 선택

**랜덤 선택 알고리즘** (`handleRandomUserSelection`):
```javascript
// Fisher-Yates 셔플 알고리즘
const shuffled = [...availableUsers];
for (let i = shuffled.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
}
const selected = shuffled.slice(0, selectedCount);
```

## 📊 칼로리 편차 관리

### 개념
- **칼로리 편차(calorieBias)**: 사용자별 칼로리 조정값
- 기본값: `0`
- 양수/음수 모두 가능
- 실제 칼로리 계산 시 적용

### 적용 방식

#### 개별 적용
- 사용자 편집 모달에서 개별 설정
- `users/{uid}` 문서의 `calorieBias` 필드 업데이트

#### 그룹별 일괄 적용
- 그룹 설정 모달에서 일괄 설정
- 해당 그룹 모든 사용자에게 동일한 값 적용
- Firestore batch write로 성능 최적화

### 특정 그룹 칼로리 편차 적용

**함수**: `applyGroupCalorieBias`
```javascript
const applyGroupCalorieBias = async (groupName, calorieBias) => {
  // 1. 그룹 유효성 검사
  // 2. 해당 그룹 사용자 필터링
  // 3. batch write로 일괄 업데이트
  // 4. 성공 메시지 표시
  // 5. 데이터 리로드
};
```

## 🍽️ 식사 데이터 조회

### 날짜별 조회
- `selectedDate` 상태로 조회 날짜 관리
- dayjs 객체 사용
- 날짜 변경 시 자동 리로드

### Food 문서 구조
```javascript
// users/{uid}/foods/{YYYY-MM-DD}
{
  date: "2025-01-24",
  breakfast: {
    flag: 1,
    foods: [...],
    estimatedCalories: 500,
    actualCalories: 480,
    selectedFoods: [...],
    offset: 20
  },
  lunch: { /* 동일 구조 */ },
  dinner: { /* 동일 구조 */ },
  snacks: { /* 동일 구조 */ }
}
```

### 식사 유형별 데이터
- `selectedMealType` 상태로 식사 유형 선택
- 기본값: `'breakfast'`
- 한글 변환: `mealTypeKoreanMap` 사용

## 🎨 UI/UX 구성

### 반응형 디자인
```javascript
const isMobile = useMediaQuery({ maxWidth: 767 });
```
- 모바일/데스크톱 환경 감지
- 조건부 레이아웃 적용

### 탭 구성
- **그룹 관리 탭**: 그룹 목록, 생성/수정/삭제
- **사용자 관리 탭**: 사용자 목록, 검색/필터링, 편집

### 모달 컴포넌트

#### 그룹 편집 모달
- 그룹명, 설명, 색상 입력
- ColorPicker 컴포넌트 사용
- 생성/수정 모드 구분

#### 사용자 편집 모달
- 그룹 선택 (Select 컴포넌트)
- 칼로리 편차 입력 (InputNumber 컴포넌트)

#### 사용자 추가 모달
- Transfer 컴포넌트로 다중 선택
- 현재 그룹 정보 표시
- 실시간 필터링

#### 랜덤 사용자 선택 모달
- 선택 모드 라디오 버튼
- 인원수/비율 입력
- 선택 결과 미리보기
- Shuffle 아이콘으로 재선택

### 테이블 구성

#### 그룹 테이블
- 그룹명, 설명, 색상, 사용자 수
- 액션 버튼: 편집, 삭제, 설정, 사용자 추가
- 색상 태그로 시각적 구분

#### 사용자 테이블
- 기본 정보: 이름, 이메일, 나이, 성별, 키, 몸무게, 목표
- 그룹 정보: 그룹명 (색상 태그)
- 칼로리 편차
- 선택된 날짜의 식사 데이터
- 액션 버튼: 편집

## 🔄 데이터 일관성 보장

### 참조 무결성 검증

#### 사용자 로딩 시
```javascript
const isValidGroup = userGroupValue === DEFAULT_GROUP_VALUE || 
                    loadedGroups.some(g => g.name === userGroupValue && !g.isDefault);

if (!isValidGroup) {
  userGroupValue = DEFAULT_GROUP_VALUE;
  await updateDoc(doc(db, 'users', userDoc.id), { group: DEFAULT_GROUP_VALUE });
}
```

#### 사용자 설정 저장 시
- 그룹 유효성 검사 후 저장
- 유효하지 않은 그룹은 기본 그룹으로 자동 변경

#### 그룹 삭제 시
- 해당 그룹 소속 사용자를 기본 그룹으로 이동
- batch write로 원자성 보장

### 에러 처리

#### 네트워크 에러
- try-catch 블록으로 예외 처리
- 사용자 친화적 에러 메시지
- 로딩 상태 적절히 해제

#### 데이터 검증
- 필수 필드 존재 여부 확인
- 기본값 설정으로 안전성 보장
- null/undefined 값 처리

## 🚀 성능 최적화

### 메모이제이션
```javascript
const fetchGroups = useCallback(async () => { /* ... */ }, []);
const fetchUsers = useCallback(async (loadedGroups, date) => { /* ... */ }, []);
const loadData = useCallback(async () => { /* ... */ }, [fetchGroups, fetchUsers, selectedDate]);
```

### Batch 작업
- 다중 사용자 업데이트 시 batch write 사용
- 네트워크 요청 수 최소화
- 원자성 보장

### 조건부 렌더링
- 로딩 상태에 따른 Skeleton 컴포넌트
- 데이터 없음 상태의 Empty 컴포넌트
- 모바일/데스크톱 조건부 레이아웃

## 🔧 개발자 도구

### 디버깅
- console.error로 상세 에러 로깅
- 개발 환경에서 상태 추적 가능
- Firebase 콘솔과 연동

### 도움말 시스템
- `showHelp` 상태로 도움말 토글
- Popover 컴포넌트로 컨텍스트 도움말
- 사용법 안내 및 주의사항 표시

## 📝 향후 개선 사항

### 보안 강화
- 하드코딩된 관리자 이메일을 데이터베이스 기반으로 변경
- 역할 기반 접근 제어 (RBAC) 도입
- 감사 로그 기능 추가

### 기능 확장
- 그룹별 통계 대시보드
- 사용자 활동 모니터링
- 벌크 데이터 가져오기/내보내기
- 그룹 템플릿 기능

### 성능 개선
- 가상화된 테이블로 대용량 데이터 처리
- 실시간 데이터 동기화
- 캐싱 전략 개선
- 페이지네이션 도입

### UX 개선
- 드래그 앤 드롭으로 그룹 이동
- 키보드 단축키 지원
- 다크 모드 지원
- 접근성 개선 (ARIA 라벨, 키보드 네비게이션)

---

**문서 버전**: 1.0  
**마지막 업데이트**: 2025-01-24  
**작성자**: AI Assistant  
**검토 필요**: 보안 정책, 성능 요구사항