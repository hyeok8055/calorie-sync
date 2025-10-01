import admin from 'firebase-admin';
import dayjs from 'dayjs';

// Firebase Admin 초기화
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'calori-sync-f0431', // MCP에서 확인한 프로젝트 ID
});

const db = admin.firestore();

/**
 * 특정 날짜의 모든 사용자 식사 데이터를 조회하여
 * groupDeviationConfig가 있는 경우 그룹 멤버십 복구
 */
async function recoverGroupMembershipForDate(targetDate) {
  const dateString = targetDate.format('YYYY-MM-DD');
  console.log(`\n=== ${dateString} 그룹 멤버십 복구 시작 ===`);

  try {
    // 1. 모든 사용자 조회
    const usersSnapshot = await db.collection('users').get();
    console.log(`총 ${usersSnapshot.size}명의 사용자 검색 중...`);

    // 2. 각 사용자의 식사 데이터 확인
    const groupMembershipMap = new Map(); // groupId -> [userEmails]
    const userGroupMap = new Map(); // userEmail -> { groupId, groupName }

    for (const userDoc of usersSnapshot.docs) {
      const userEmail = userDoc.id;

      try {
        // 해당 날짜의 식사 문서 조회
        const foodDocRef = db.collection('users').doc(userEmail).collection('foods').doc(dateString);
        const foodDocSnap = await foodDocRef.get();

        if (!foodDocSnap.exists()) {
          continue;
        }

        const foodData = foodDocSnap.data();

        // 모든 식사 시간대 확인 (breakfast, lunch, dinner, snacks)
        for (const mealType of ['breakfast', 'lunch', 'dinner', 'snacks']) {
          const mealData = foodData[mealType];

          if (mealData && mealData.groupDeviationConfig && mealData.groupDeviationConfig.groupId) {
            const groupId = mealData.groupDeviationConfig.groupId;

            // groupId로 그룹 멤버십 맵 구성
            if (!groupMembershipMap.has(groupId)) {
              groupMembershipMap.set(groupId, []);
            }

            if (!groupMembershipMap.get(groupId).includes(userEmail)) {
              groupMembershipMap.get(groupId).push(userEmail);
            }

            // 사용자별 그룹 정보 저장 (가장 최근 발견된 그룹으로 덮어씀)
            userGroupMap.set(userEmail, { groupId });

            console.log(`  ✓ ${userEmail} -> 그룹 ${groupId} (${mealType})`);
            break; // 한 번만 찾으면 됨
          }
        }
      } catch (error) {
        console.error(`  ✗ ${userEmail} 처리 실패:`, error.message);
      }
    }

    if (groupMembershipMap.size === 0) {
      console.log(`\n${dateString}에 그룹 편차 설정이 적용된 사용자가 없습니다.`);
      return { recoveredUsers: 0, recoveredGroups: 0 };
    }

    console.log(`\n발견된 그룹: ${groupMembershipMap.size}개`);

    // 3. 각 그룹 정보 조회 및 복구
    let totalRecoveredUsers = 0;
    let totalRecoveredGroups = 0;

    for (const [groupId, userEmails] of groupMembershipMap.entries()) {
      try {
        // 그룹 문서 조회
        const groupDocRef = db.collection('calorieGroups').doc(groupId);
        const groupDocSnap = await groupDocRef.get();

        if (!groupDocSnap.exists()) {
          console.error(`  ✗ 그룹 ${groupId}를 찾을 수 없습니다.`);
          continue;
        }

        const groupData = groupDocSnap.data();
        const groupName = groupData.name;

        console.log(`\n그룹 복구 중: ${groupName} (${groupId})`);
        console.log(`  - ${userEmails.length}명의 멤버 복구`);

        const batch = db.batch();

        for (const userEmail of userEmails) {
          // users/{email}/groupsByDate.${dateString} 업데이트
          const userRef = db.collection('users').doc(userEmail);
          batch.update(userRef, {
            [`groupsByDate.${dateString}`]: groupName
          });

          // calorieGroups/{groupId}/users/{email} 서브컬렉션 추가
          const groupUserRef = db.collection('calorieGroups').doc(groupId).collection('users').doc(userEmail);
          batch.set(groupUserRef, {
            email: userEmail,
            addedAt: admin.firestore.FieldValue.serverTimestamp(),
            addedBy: 'recovery-script',
            recoveredFrom: 'foodData'
          }, { merge: true });

          console.log(`    ✓ ${userEmail} -> ${groupName}`);
        }

        await batch.commit();
        totalRecoveredUsers += userEmails.length;
        totalRecoveredGroups++;

        console.log(`  ✓ ${groupName} 복구 완료 (${userEmails.length}명)`);
      } catch (error) {
        console.error(`  ✗ 그룹 ${groupId} 복구 실패:`, error.message);
      }
    }

    console.log(`\n${dateString} 복구 완료:`);
    console.log(`  - 복구된 그룹: ${totalRecoveredGroups}개`);
    console.log(`  - 복구된 멤버: ${totalRecoveredUsers}명`);

    return { recoveredUsers: totalRecoveredUsers, recoveredGroups: totalRecoveredGroups };
  } catch (error) {
    console.error(`${dateString} 복구 중 오류 발생:`, error);
    throw error;
  }
}

async function main() {
  console.log('=== 그룹 멤버십 복구 스크립트 시작 ===\n');
  console.log('복구 방식: 식사 데이터의 groupDeviationConfig 기반\n');

  try {
    // 9월 29일 복구
    const sept29 = dayjs('2025-09-29');
    const result1 = await recoverGroupMembershipForDate(sept29);

    // 9월 30일 복구
    const sept30 = dayjs('2025-09-30');
    const result2 = await recoverGroupMembershipForDate(sept30);

    console.log('\n\n=== 전체 복구 완료 ===');
    console.log(`총 복구된 그룹: ${result1.recoveredGroups + result2.recoveredGroups}개`);
    console.log(`총 복구된 멤버: ${result1.recoveredUsers + result2.recoveredUsers}명`);

    process.exit(0);
  } catch (error) {
    console.error('\n복구 스크립트 실행 중 치명적 오류 발생:', error);
    process.exit(1);
  }
}

main();