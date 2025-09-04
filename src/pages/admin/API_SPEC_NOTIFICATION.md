# Firebase Functions 알림 API 명세서

## 개요
이 문서는 Firebase Functions에 배포된 즉시 알림 발송 API들의 명세서입니다. 모든 함수는 인증 없이 호출 가능합니다.

## 공통 사항
- **호출 방식**: Firebase Functions HTTPS Callable
- **인증**: 필요 없음
- **응답 형식**: JSON
- **에러 처리**: `functions.https.HttpsError` 사용

## API 목록

### 1. 즉시 아침 식사 알림 발송 (`sendBreakfastNotification`)
아침 식사 관련 즉시 알림을 발송합니다.

**파라미터:**
```json
{
  "title": "string (선택) - 알림 제목, 기본값: '어제 저녁, 얼마나 드셨나요?'",
  "body": "string (선택) - 알림 내용, 기본값: '오늘 아침 식사 전, 어제 저녁 칼로리 현황을 확인해보세요!'"
}
```

**응답:**
```json
{
  "success": true,
  "successCount": "number - 성공적으로 발송된 알림 수",
  "failureCount": "number - 실패한 알림 수",
  "timestamp": "number - 타임스탬프",
  "mealType": "breakfast"
}
```

### 2. 즉시 점심 식사 알림 발송 (`sendLunchNotification`)
점심 식사 관련 즉시 알림을 발송합니다.

**파라미터:**
```json
{
  "title": "string (선택) - 알림 제목, 기본값: '오늘 아침, 충분히 드셨나요?'",
  "body": "string (선택) - 알림 내용, 기본값: '점심 전, 아침 식사의 칼로리 섭취 현황을 점검해보세요!'"
}
```

**응답:**
```json
{
  "success": true,
  "successCount": "number - 성공적으로 발송된 알림 수",
  "failureCount": "number - 실패한 알림 수",
  "timestamp": "number - 타임스탬프",
  "mealType": "lunch"
}
```

### 3. 즉시 저녁 식사 알림 발송 (`sendDinnerNotification`)
저녁 식사 관련 즉시 알림을 발송합니다.

**파라미터:**
```json
{
  "title": "string (선택) - 알림 제목, 기본값: '점심 식사는 잘 하셨나요?'",
  "body": "string (선택) - 알림 내용, 기본값: '저녁 식사 전, 오늘 점심의 칼로리 현황을 확인해보세요!'"
}
```

**응답:**
```json
{
  "success": true,
  "successCount": "number - 성공적으로 발송된 알림 수",
  "failureCount": "number - 실패한 알림 수",
  "timestamp": "number - 타임스탬프",
  "mealType": "dinner"
}
```

### 4. 즉시 커스텀 알림 발송 (`sendCustomNotification`)
사용자가 직접 입력한 타이틀과 바디로 커스텀 알림을 발송합니다.

**파라미터:**
```json
{
  "title": "string (필수) - 알림 제목",
  "body": "string (필수) - 알림 내용"
}
```

**응답:**
```json
{
  "success": true,
  "successCount": "number - 성공적으로 발송된 알림 수",
  "failureCount": "number - 실패한 알림 수",
  "timestamp": "number - 타임스탬프",
  "mealType": "custom",
  "title": "string - 전송된 알림 제목",
  "body": "string - 전송된 알림 내용"
}
```

## 사용 예시 (JavaScript)

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

// 아침 알림 발송 (기본값 사용)
const breakfastResult = await httpsCallable(functions, 'sendBreakfastNotification')({});
console.log(breakfastResult.data);

// 점심 알림 발송 (커스텀 메시지)
const lunchResult = await httpsCallable(functions, 'sendLunchNotification')({
  title: "점심시간이에요!",
  body: "오늘 점심 메뉴는 무엇인가요?"
});
console.log(lunchResult.data);

// 저녁 알림 발송 (기본값 사용)
const dinnerResult = await httpsCallable(functions, 'sendDinnerNotification')({});
console.log(dinnerResult.data);

// 커스텀 알림 발송
const customResult = await httpsCallable(functions, 'sendCustomNotification')({
  title: "중요 공지",
  body: "오늘 저녁 8시에 정기 회의가 있습니다."
});
console.log(customResult.data);
```

## 알림 특징
- **타겟**: 모든 FCM 토큰을 가진 사용자 (모든 사용자)
- **우선순위**: 높음 (high)
- **플랫폼 지원**: Android, iOS, Web
- **데이터 전용**: UI 표시 없이 백그라운드에서 데이터 처리
- **중복 방지**: timestamp와 type으로 중복 알림 방지

## 에러 처리
모든 함수는 다음과 같은 에러를 반환할 수 있습니다:
- `invalid-argument`: 잘못된 파라미터 (커스텀 알림에서 title/body 누락 시)
- `internal`: 서버 내부 오류 (예: FCM 토큰 없음)

에러 응답 형식:
```json
{
  "error": {
    "status": "error_code",
    "message": "error_message"
  }
}
```

## 로그 기록
모든 알림 발송은 Firestore의 `notificationLogs` 컬렉션에 기록됩니다:
- 발송 성공/실패 상태
- 성공/실패 수
- 발송 시간 (서울 시간)
- 알림 타입 및 내용
