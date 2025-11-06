#!/usr/bin/env node

/**
 * 특정 사용자에게 점심 식사 기록 추가
 * d255lsn@gmail.com - 2025-11-05 점심 식사
 * - 돈까스 1인분 (568 kcal)
 * - 쌀밥 1인분 (270 kcal)
 */

import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';

// .env 파일 로드
const envPath = path.join(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

// ============================================
// Firebase 초기화
// ============================================

function initializeFirebase() {
  try {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    
    if (!projectId) {
      throw new Error('VITE_FIREBASE_PROJECT_ID가 설정되지 않았습니다');
    }

    admin.initializeApp({
      projectId: projectId,
      databaseURL: process.env.VITE_FIREBASE_DATABASE_URL
    });

    console.log('✅ Firebase 초기화 완료\n');
    return admin.firestore();
  } catch (error) {
    console.error('❌ Firebase 초기화 실패:', error.message);
    process.exit(1);
  }
}

// ============================================
// 유틸리티
// ============================================

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m'
  };
  
  console.log(`${colors[type] || colors.info}${message}${colors.reset}`);
}

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase());
    });
  });
}

// ============================================
// 메인 함수
// ============================================

async function addLunchMeal() {
  const db = initializeFirebase();
  
  const userEmail = 'd255lsn@gmail.com';
  const date = '2025-11-05';
  
  log('╔════════════════════════════════════════════════════╗', 'info');
  log('║  점심 식사 기록 추가                               ║', 'info');
  log('╚════════════════════════════════════════════════════╝\n', 'info');
  
  log(`📧 사용자: ${userEmail}`, 'info');
  log(`📅 날짜: ${date}`, 'info');
  log(`🍽️  메뉴: 돈까스 (568 kcal) + 쌀밥 (270 kcal)\n`, 'info');
  
  // 새로운 점심 데이터 (useFood.js 구조에 맞춤)
  const newLunchData = {
    flag: 1,
    foods: [
      {
        name: '돈까스',
        calories: 568,
        weight: 200,
        portion: 1,
        nutrients: { carbs: 45, fat: 28, protein: 32 }
      },
      {
        name: '쌀밥',
        calories: 270,
        weight: 180,
        portion: 1,
        nutrients: { carbs: 58.5, fat: 0.9, protein: 4.5 }
      }
    ],
    originalCalories: { 
      estimated: 900,
      actual: 838
    },
    calorieDeviation: {
      natural: -62,  // actual - estimated = 838 - 900 = -62
      applied: -62,
      personalBias: 0,
      groupSettings: null
    },
    selectedFoods: ['돈까스', '쌀밥'],
    updatedAt: new Date().toISOString(),
    groupDeviationConfig: null
  };
  
  // DRY RUN
  log('═══════════════════════════════════════════════════', 'info');
  log('🔍 DRY RUN - 추가될 데이터 미리보기\n', 'warning');
  
  log('점심 식사 데이터:', 'info');
  log(`   음식 1: ${newLunchData.foods[0].name} (${newLunchData.foods[0].calories} kcal)`, 'info');
  log(`   음식 2: ${newLunchData.foods[1].name} (${newLunchData.foods[1].calories} kcal)`, 'info');
  log(`   총 칼로리: ${newLunchData.originalCalories.actual} actual / ${newLunchData.originalCalories.estimated} estimated`, 'info');
  log(`   flag: ${newLunchData.flag}`, 'info');
  log('', 'info');
  
  const docRef = db.collection('users').doc(userEmail).collection('foods').doc(date);
  
  // 현재 데이터 확인
  const currentSnapshot = await docRef.get();
  if (currentSnapshot.data()?.lunch) {
    log('⚠️  경고: 이미 점심 데이터가 존재합니다!', 'warning');
    log(`   기존 칼로리: ${currentSnapshot.data().lunch.originalCalories.actual}`, 'warning');
    log(`   새 칼로리: ${newLunchData.originalCalories.actual}`, 'warning');
    log('   → 덮어씌워집니다!\n', 'warning');
  } else {
    log('✅ 점심 데이터가 없으므로 새로 생성됩니다\n', 'success');
  }
  
  log('═══════════════════════════════════════════════════\n', 'info');
  
  // 사용자 확인
  const answer = await prompt('위의 내용이 맞나요? (yes 입력 시 진행): ');
  
  if (answer !== 'yes') {
    log('\n❌ 작업 취소됨\n', 'warning');
    process.exit(0);
  }
  
  // 실제 추가
  try {
    await docRef.set(
      { lunch: newLunchData },
      { merge: true }
    );
    
    log('\n✅ 점심 식사 기록이 성공적으로 추가되었습니다!', 'success');
    log(`📝 ${userEmail} - 2025-11-05 점심 식사\n`, 'success');
  } catch (error) {
    log(`\n❌ 추가 실패: ${error.message}`, 'error');
    process.exit(1);
  }
  
  process.exit(0);
}

// 실행
addLunchMeal().catch(error => {
  log(`💥 치명적 오류: ${error.message}`, 'error');
  process.exit(1);
});
