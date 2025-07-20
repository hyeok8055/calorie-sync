---
description: 
globs: 
alwaysApply: true
---
---
description: "React, Ant Design, Antd Mobile, Redux, Tailwind CSS를 사용하는 프로젝트의 코드 품질 및 성능 향상을 위한 규칙"
globs: ["src/**/*.{js,jsx}"]
alwaysApply: true
---

# 프로젝트 개발 지침
- React 컴포넌트는 함수형으로 작성합니다.
- Ant Design 및 Ant Design Mobile 컴포넌트는 공식 문서의 예제를 참고하여 사용합니다.
- 공통 컴포넌트는 `src/components/common/` 디렉토리에 위치시킵니다.
- 페이지 컴포넌트는 `src/pages/` 디렉토리에 위치시킵니다.

## 🧩 프로젝트 개요

- **프레임워크**: React 18.3.1 (함수형 컴포넌트 중심)
- **번들러**: Vite
- **스타일링**: Tailwind CSS v3
- **UI 컴포넌트**: Ant Design v5, Ant Design Mobile
- **상태 관리**: Redux v5
- **라우팅**: React Router v7
- **빌드 도구**: Vite

## 🎨 스타일링 가이드

- **Tailwind CSS**를 기본 스타일링 도구로 사용합니다.
- **Ant Design** 컴포넌트는 기본 스타일을 유지하되, 필요한 경우 Tailwind 클래스로 추가 스타일링을 합니다.
- **Ant Design Mobile** 컴포넌트는 모바일 환경에 최적화된 스타일을 적용합니다.
- **반응형 디자인**은 Tailwind의 반응형 유틸리티를 사용하여 구현합니다.

## 📏 코드 스타일 및 린팅
- ESLint와 Prettier를 사용하여 코드 스타일을 강제합니다. (eslint.config.js 참조)
- 변수명은 camelCase, 상수는 UPPER_CASE로 합니다.
- 함수는 화살표 함수를 우선 사용합니다.
- 들여쓰기는 2 spaces를 사용합니다.

## 🛠 컴포넌트 설계
- 모든 컴포넌트는 src/components/ 또는 src/pages/에 위치합니다.
- 재사용 가능한 컴포넌트는 src/components/common/에 넣고, PropTypes로 props를 정의합니다.
- 상태 관리는 Redux를 사용하며, 로컬 상태는 useState로 제한합니다.

## 🔄 훅(Hooks) 사용
- 커스텀 훅은 src/hook/에 위치합니다.
- 훅 이름은 'use'로 시작하며, side effects는 useEffect 내에서 처리합니다.
- 훅은 재사용성을 고려하여 설계합니다.

## ⚡ 성능 최적화
- React.memo 또는 useMemo를 사용하여 불필요한 리렌더링을 방지합니다.
- 이미지와 자산은 src/assets/에서 관리하며, lazy loading을 적용합니다.
- API 호출은 debounce/throttle을 고려합니다.

## 🚨 에러 핸들링 및 테스트
- API 호출(src/api/api.js) 시 try-catch를 사용하고, 에러를 Redux로 관리합니다.
- 단위 테스트는 Jest를 사용하며, 주요 컴포넌트와 훅에 대해 작성합니다.
- 에러 바운더리를 컴포넌트에 적용합니다.

## 📱 PWA 및 배포
- PWA 관련 파일(manifest.webmanifest, sw.js 등)은 public/ 또는 dist/에서 관리합니다.
- 빌드 시 Vite 설정(vite.config.mjs)을 최적화합니다.
- Firebase 설정(firebaseconfig.js)은 보안을 유지합니다.
