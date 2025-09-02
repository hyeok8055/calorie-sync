import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseconfig';
import { setAuthStatus, clearAuthStatus } from '../redux/actions/authActions';

export const useAuth = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.email);
          const userDoc = await getDoc(userDocRef);
          const userData = userDoc.exists() ? userDoc.data() : {};

          // Redux에 필요한 필드만 선택적으로 포함 (Timestamp 필드 제외)
          const {
            createdAt, 
            lastLoginAt, 
            ...safeUserData 
          } = userData;

          const serializedUser = {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            setupCompleted: userData?.setupCompleted || false,
            ...safeUserData // Timestamp가 제외된 안전한 사용자 데이터
          };
          
          dispatch(setAuthStatus(serializedUser));
          
        } catch (error) {
          console.error('Firestore 사용자 데이터 조회 실패:', error);
          
          // Firestore 읽기 오류 시 기본 정보로 dispatch
          const fallbackUser = {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            setupCompleted: false, // 안전한 기본값
          };
          
          dispatch(setAuthStatus(fallbackUser));
        }
      } else {
        dispatch(clearAuthStatus());
      }
    });

    // 클린업 함수: 컴포넌트 언마운트 시 구독 해제
    return () => unsubscribe();
  }, [dispatch]); // dispatch 함수가 변경될 때만 effect 재실행 (일반적으로는 안 변함)

  // 이 훅은 상태를 직접 반환하기보다는 effect 실행에 중점을 둡니다.
  // 필요하다면 여기서 auth 상태를 반환하도록 수정할 수 있습니다.
};