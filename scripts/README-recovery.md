# 그룹 멤버십 복구 스크립트

9월 29일과 9월 30일의 그룹 멤버십을 식사 데이터(`groupDeviationConfig`)를 기반으로 복구합니다.

## 복구 원리

1. 모든 사용자의 9월 29일, 30일 식사 데이터 조회
2. 각 식사 시간대(breakfast, lunch, dinner, snacks)에서 `groupDeviationConfig.groupId` 추출
3. 추출된 정보로 그룹 멤버십 복구:
   - `users/{email}/groupsByDate.{날짜}` 업데이트
   - `calorieGroups/{groupId}/users/{email}` 서브컬렉션 생성

## 실행 방법

### 1. Firebase Admin SDK 인증 설정

#### 방법 A: 서비스 계정 키 파일 (권장)
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/workspace/calorie-sync/serviceAccountKey.json"
```

#### 방법 B: gcloud CLI
```bash
gcloud auth application-default login
```

### 2. 스크립트 실행
```bash
pnpm run recover-groups
```

## 예상 출력

```
=== 그룹 멤버십 복구 스크립트 시작 ===

복구 방식: 식사 데이터의 groupDeviationConfig 기반

=== 2025-09-29 그룹 멤버십 복구 시작 ===
총 50명의 사용자 검색 중...
  ✓ ally051205@gmail.com -> 그룹 qCN6RF8Cicb0XrjPKGLi (lunch)
  ✓ eumyh03@gmail.com -> 그룹 qCN6RF8Cicb0XrjPKGLi (lunch)
  ...

발견된 그룹: 2개

그룹 복구 중: 아침조 (qCN6RF8Cicb0XrjPKGLi)
  - 10명의 멤버 복구
    ✓ ally051205@gmail.com -> 아침조
    ✓ eumyh03@gmail.com -> 아침조
    ...
  ✓ 아침조 복구 완료 (10명)

2025-09-29 복구 완료:
  - 복구된 그룹: 2개
  - 복구된 멤버: 15명

=== 2025-09-30 그룹 멤버십 복구 시작 ===
...

=== 전체 복구 완료 ===
총 복구된 그룹: 4개
총 복구된 멤버: 30명
```

## 복구되는 데이터

### users/{email}
```javascript
{
  groupsByDate: {
    "2025-09-29": "아침조",
    "2025-09-30": "점심조"
  }
}
```

### calorieGroups/{groupId}/users/{email}
```javascript
{
  email: "user@example.com",
  addedAt: Timestamp,
  addedBy: "recovery-script",
  recoveredFrom: "foodData"
}
```

## 주의사항

- 이미 복구된 데이터가 있어도 덮어씁니다 (merge: true)
- 식사 데이터 자체는 수정하지 않습니다
- `groupDeviationConfig`가 없는 사용자는 복구되지 않습니다 (기본 그룹 유지)

## 복구 후 확인

복구 후 관리자 페이지에서:
1. 9월 29일, 30일로 날짜 변경
2. 각 그룹 카드에 멤버 수가 정상적으로 표시되는지 확인
3. 개별 사용자 탭에서 그룹 태그가 제대로 표시되는지 확인