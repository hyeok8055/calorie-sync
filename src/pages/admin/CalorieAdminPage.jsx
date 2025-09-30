import { useState, useEffect, useCallback } from "react";
import { Typography, Input, Row, Col, Button, Modal, Form, Table, InputNumber, message, Select, Card, Tabs, Tag, Space, Tooltip, Divider, Switch, ColorPicker, Transfer, Skeleton, Empty, DatePicker, Slider, Radio, Popover, Steps, Alert } from 'antd';
import { db } from '../../firebaseconfig';
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, query, where, addDoc, deleteDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import { useNavigate } from "react-router-dom";
import { useMediaQuery } from 'react-responsive';
import { SyncOutlined, ExclamationCircleOutlined, UserOutlined, TeamOutlined, EditOutlined, PlusOutlined, DeleteOutlined, UserAddOutlined, CalendarOutlined, CoffeeOutlined, InfoCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Shuffle } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import useCalorieDeviation from '../../hook/useCalorieDeviation';
import { useFood } from '../../hook/useFood';

// 날짜별 그룹 관리 및 미래 편차 설정 훅 제거됨
dayjs.locale('ko');

const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;
const { TabPane } = Tabs;
const { confirm } = Modal;

// 관리자 접근 가능한 이메일 목록 (AdminPage.jsx와 동일)
const ADMIN_EMAILS = [
  'eodud653923@gmail.com',
  'youngwonhahn00@gmail.com',
  'juhyeok0123@gmail.com',
  'wn990123@gmail.com',
  'garcia29845@gmail.com',
  'yunj29845@gmail.com',
];

// 기본 그룹 (그룹 삭제 시 할당될 그룹)
const DEFAULT_GROUP_ID = 'default';
const DEFAULT_GROUP_VALUE = 0; // 사용자 문서의 'group' 필드에서 기본 그룹을 나타내는 값

// 식사 유형 한글 변환 맵 (컴포넌트 최상위 스코프)
const mealTypeKoreanMap = {
    breakfast: '아침',
    lunch: '점심',
    dinner: '저녁',
    snacks: '간식'
};

const CalorieAdminPage = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState('groups');
  const [selectedGroupKey, setSelectedGroupKey] = useState(null);

  const [isGroupEditModalVisible, setIsGroupEditModalVisible] = useState(false);
  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [isAddUserModalVisible, setIsAddUserModalVisible] = useState(false);
  const [isRandomUserModalVisible, setIsRandomUserModalVisible] = useState(false);
  const [targetGroupForAddingUser, setTargetGroupForAddingUser] = useState(null);
  const [targetKeysForTransfer, setTargetKeysForTransfer] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [randomUserCount, setRandomUserCount] = useState(5);
  const [randomUserPercentage, setRandomUserPercentage] = useState(50);
  const [randomSelectionMode, setRandomSelectionMode] = useState('count');
  const [randomSelectedUsers, setRandomSelectedUsers] = useState([]);
  const [form] = Form.useForm();

  const [groupEditForm] = Form.useForm();
  const [randomUserForm] = Form.useForm();
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();
  
  // 현재 선택된 그룹의 편차 설정을 가져오는 함수
  const getCurrentGroupDeviationSettings = useCallback(() => {
    if (!selectedGroupKey) {
      // 기본 그룹 설정 사용
      const defaultGroup = groups.find(g => g.id === DEFAULT_GROUP_ID);
      return {
        multiplier: defaultGroup?.deviationMultiplier || 0.2,
        defaultValue: defaultGroup?.defaultDeviation || 0
      };
    }
    
    const selectedGroup = groups.find(g => g.name === selectedGroupKey);
    return {
      multiplier: selectedGroup?.deviationMultiplier || 0.2,
      defaultValue: selectedGroup?.defaultDeviation || 0
    };
  }, [selectedGroupKey, groups]);

  // 칼로리 편차 관리 훅 사용 (그룹별 설정값 전달)
  const {
    calculateFinalDifference,
    applyDeviation,
    updateUserCalorieDeviation,
    updateGroupCalorieDeviation,
    getAppliedDeviation,
    savePersonalCalorieBias
  } = useCalorieDeviation(getCurrentGroupDeviationSettings());
  
  // useFood 훅에서 applyGroupDeviation 가져오기
  const { applyGroupDeviation } = useFood();
  
  // 편차 조작 상태
  const [loadingDeviation, setLoadingDeviation] = useState(false);
  
  // 미디어 쿼리로 모바일 환경 감지
  const isMobile = useMediaQuery({ maxWidth: 767 });

  // 날짜 및 식사 유형 상태 추가
  const [selectedDate, setSelectedDate] = useState(dayjs()); // 오늘 날짜로 초기화 (dayjs 객체)
  const [selectedMealType, setSelectedMealType] = useState('breakfast'); // 기본값: 아침
  
  // 도움말 상태
  const [showHelp, setShowHelp] = useState(false);



  // 권한 체크
  useEffect(() => {
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
      message.error('이 페이지에 접근할 권한이 없습니다.');
      navigate('/main');
    }
  }, [user, navigate]);

  // 그룹 데이터 로드 함수
  const fetchGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const groupsCollection = collection(db, 'calorieGroups');
      const groupsSnapshot = await getDocs(groupsCollection);
      const groupsData = groupsSnapshot.docs.map(doc => ({
        id: doc.id,
        key: doc.data().name || doc.id,
        ...doc.data()
      }));
      
      // 기본 그룹이 없는 경우 생성 또는 확인
      let defaultGroupExists = groupsData.some(g => g.id === DEFAULT_GROUP_ID);
      if (!defaultGroupExists) {
          const defaultGroupData = {
              name: '기본 그룹',
              color: '#8c8c8c',
              description: '그룹 미지정',
              isDefault: true,
              deviationMultiplier: 0.2, // 기본값 20%
              defaultDeviation: 0 // 기본값 0
          };
          try {
              const defaultGroupRef = doc(db, 'calorieGroups', DEFAULT_GROUP_ID);
              await setDoc(defaultGroupRef, defaultGroupData, { merge: true });
              groupsData.push({ ...defaultGroupData, id: DEFAULT_GROUP_ID, key: '기본 그룹' });
          } catch(error) {
              console.error("기본 그룹 확인/생성 실패:", error);
          }
      }

      setGroups(groupsData);
      return groupsData;
    } catch (error) {
      console.error('그룹 정보 가져오기 실패:', error);
      message.error('그룹 정보를 불러오는데 실패했습니다.');
      return [];
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  // 사용자 정보 가져오기 (선택된 날짜의 food 문서 로드)
  const fetchUsers = useCallback(async (loadedGroups, date) => {
    setLoadingUsers(true);
    try {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const dateString = date.format('YYYY-MM-DD'); // dayjs 객체를 문자열로 변환

      const usersDataPromises = usersSnapshot.docs.map(async (userDoc) => {
        const userData = userDoc.data();
        const userEmail = userDoc.id; // document ID는 이제 email
        let userGroupValue = userData.group === undefined ? DEFAULT_GROUP_VALUE : userData.group;

        const isValidGroup = userGroupValue === DEFAULT_GROUP_VALUE || loadedGroups.some(g => g.name === userGroupValue && !g.isDefault);

        if (!isValidGroup) {
            userGroupValue = DEFAULT_GROUP_VALUE;
            try {
              await updateDoc(doc(db, 'users', userEmail), { group: DEFAULT_GROUP_VALUE });
            } catch (updateError) {
              console.error(`사용자 ${userEmail} 그룹 기본값 업데이트 실패:`, updateError);
            }
        }

        const calorieBias = userData.calorieBias !== undefined ? userData.calorieBias : 0;

        // 선택된 날짜의 food 문서 가져오기
        let foodDocForSelectedDate = null;
        try {
          const foodDocRef = doc(db, `users/${userEmail}/foods`, dateString);
          const foodDocSnap = await getDoc(foodDocRef);
          if (foodDocSnap.exists()) {
            foodDocForSelectedDate = foodDocSnap.data();
          }
        } catch (error) {
          console.error(`사용자 ${userEmail}의 ${dateString} 음식 문서 로딩 실패:`, error);
        }

        return {
          key: userEmail, // email을 key로 사용
          email: userEmail,
          uid: userData.uid || null, // 호환성을 위해 uid 유지
          name: userData.name || '-',
          age: userData.age || '-',
          gender: userData.gender || '-',
          height: userData.height || '-',
          weight: userData.weight || '-',
          goal: userData.goal || '-',
          group: userGroupValue,
          calorieBias: calorieBias,
          foodDocForSelectedDate: foodDocForSelectedDate,
        };
      });

      const usersData = await Promise.all(usersDataPromises);
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      console.error('사용자 정보 가져오기 실패:', error);
      message.error('사용자 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // 데이터 로딩 통합 (selectedDate 변경 시 사용자 데이터 다시 로드)
  const loadData = useCallback(async () => {
    setLoadingGroups(true);
    setLoadingUsers(true); // 사용자 로딩도 시작으로 표시
    const groupsPromise = fetchGroups();
    const loadedGroups = await groupsPromise;
    if (loadedGroups.length > 0) {
        await fetchUsers(loadedGroups, selectedDate); // selectedDate 전달
    }
    // fetchGroups, fetchUsers 내부에서 각 로딩 상태 false로 변경
  }, [fetchGroups, fetchUsers, selectedDate]); // selectedDate 의존성 추가

  // 최초 로드 및 selectedDate 변경 시 데이터 리로드
  useEffect(() => {
    loadData();
  }, [loadData]); // loadData 자체가 selectedDate에 의존하므로 loadData만 넣어도 됨

  // 검색어에 따른 필터링
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // 그룹별 필터링
  const filterByGroup = (groupValue) => {
    setSelectedGroupKey(groupValue);
    if (groupValue === 'all') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => user.group === groupValue);
      setFilteredUsers(filtered);
    }
  };

  // 그룹 생성/수정 모달 열기
  const handleOpenGroupEditModal = (group = null) => {
      setEditingGroup(group);
      groupEditForm.setFieldsValue(
          group ? { ...group, color: group.color || '#1677ff' } : { name: '', description: '', color: '#1677ff' }
      );
      setIsGroupEditModalVisible(true);
  };

  // 그룹 생성/수정 처리
  const handleSaveGroup = async (values) => {
      const groupData = {
          name: values.name,
          description: values.description,
          color: typeof values.color === 'object' ? values.color.toHexString() : values.color,
          deviationMultiplier: values.deviationMultiplier !== undefined ? values.deviationMultiplier : 0.2, // 기본값 20%
          defaultDeviation: values.defaultDeviation !== undefined ? values.defaultDeviation : 0, // 기본값 0
          createdDate: Timestamp.now(), // 그룹 생성 날짜
          applicableDate: Timestamp.fromDate(selectedDate.toDate()), // 상단에서 선택된 날짜로 자동 설정
      };

      try {
          setLoadingGroups(true);
          if (editingGroup) {
              if (editingGroup.isDefault) {
                   message.warning('기본 그룹은 수정할 수 없습니다.');
                   return;
              }
              const groupRef = doc(db, 'calorieGroups', editingGroup.id);
              await updateDoc(groupRef, groupData);
              message.success('그룹 정보가 수정되었습니다.');
          } else {
              const docRef = await addDoc(collection(db, 'calorieGroups'), {
                  ...groupData,
                  key: `group_${Date.now()}`
              });
              
              // 그룹 생성 시 users 서브컬렉션 초기화
              const usersCollectionRef = collection(db, 'calorieGroups', docRef.id, 'users');
              // 빈 컬렉션을 위한 더미 문서 생성 (필요시)
              // await setDoc(doc(usersCollectionRef, '_placeholder'), { created: new Date() });
              
              message.success('새 그룹이 생성되었습니다.');
          }
          setIsGroupEditModalVisible(false);
          setEditingGroup(null);
          await fetchGroups();
      } catch (error) {
          console.error('그룹 저장 실패:', error);
          message.error('그룹 저장에 실패했습니다.');
      } finally { setLoadingGroups(false); }
  };

  // 그룹 삭제 처리
  const handleDeleteGroup = (group) => {
      if (group.isDefault || group.id === DEFAULT_GROUP_ID) {
          message.warning('기본 그룹은 삭제할 수 없습니다.');
          return;
      }

      confirm({
          title: `${group.name} 그룹 삭제`,
          icon: <ExclamationCircleOutlined />,
          content: (
            <div>
              <p>정말로 '{group.name}' 그룹을 삭제하시겠습니까?</p>
              <p>소속된 사용자들은 '기본 그룹'으로 이동됩니다.</p>
              <p><strong>주의: {dayjs(group.applicableDate?.toDate()).format('YYYY-MM-DD')} 날짜의 그룹 편차 설정도 함께 롤백됩니다.</strong></p>
            </div>
          ),
          okText: '삭제 및 롤백',
          okType: 'danger',
          cancelText: '취소',
          onOk: async () => {
              try {
                  setLoadingGroups(true);

                  // 1. 그룹 사용자 목록 가져오기
                  const usersInGroupQuery = query(collection(db, 'users'), where('group', '==', group.name));
                  const usersSnapshot = await getDocs(usersInGroupQuery);
                  const groupUserEmails = usersSnapshot.docs.map(doc => doc.id);

                  // 2. 그룹 편차 설정 롤백 (그룹의 applicableDate에 해당하는 날짜만)
                  if (groupUserEmails.length > 0) {
                    const rollbackBatch = writeBatch(db);
                    let rollbackCount = 0;

                    // 그룹의 적용 날짜 확인
                    const groupApplicableDate = group.applicableDate ? 
                      dayjs(group.applicableDate.toDate()).format('YYYY-MM-DD') : null;

                    for (const userEmail of groupUserEmails) {
                      try {
                        // 그룹의 applicableDate에 해당하는 날짜의 음식 문서만 확인
                        if (groupApplicableDate) {
                          const foodDocRef = doc(db, 'users', userEmail, 'foods', groupApplicableDate);
                          const foodDocSnap = await getDoc(foodDocRef);

                          if (foodDocSnap.exists()) {
                            const foodData = foodDocSnap.data();
                            let needsUpdate = false;
                            const updatedFoodData = { ...foodData };

                            // 각 식사 타입에서 그룹 편차 설정 제거
                            ['breakfast', 'lunch', 'dinner', 'snacks'].forEach(mealType => {
                              if (foodData[mealType] && foodData[mealType].groupDeviationConfig) {
                                // 해당 그룹의 설정인지 확인
                                if (foodData[mealType].groupDeviationConfig.groupId === group.id) {
                                  // 그룹 편차 설정 제거
                                  const { groupDeviationConfig, ...mealDataWithoutConfig } = foodData[mealType];
                                  updatedFoodData[mealType] = {
                                    ...mealDataWithoutConfig,
                                    calorieDeviation: {
                                      ...mealDataWithoutConfig.calorieDeviation,
                                      applied: mealDataWithoutConfig.calorieDeviation?.personalBias || 0,
                                      groupSettings: null
                                    },
                                    updatedAt: new Date().toISOString()
                                  };
                                  needsUpdate = true;
                                }
                              }
                            });

                            if (needsUpdate) {
                              rollbackBatch.update(foodDocRef, updatedFoodData);
                              rollbackCount++;
                            }
                          }
                        }
                      } catch (userError) {
                        console.error(`사용자 ${userEmail} 편차 롤백 실패:`, userError);
                      }
                    }

                    if (rollbackCount > 0) {
                      await rollbackBatch.commit();
                      console.log(`${rollbackCount}개의 식사 데이터에서 그룹 편차 설정이 롤백되었습니다.`);
                    }
                  }

                  // 3. 사용자들을 기본 그룹으로 이동
                  const batch = writeBatch(db);
                  usersSnapshot.forEach(userDoc => {
                      const userRef = doc(db, 'users', userDoc.id);
                      batch.update(userRef, { group: DEFAULT_GROUP_VALUE });
                  });
                  await batch.commit();

                  // 4. 그룹의 사용자 서브컬렉션 삭제
                  const groupUsersQuery = query(collection(db, 'calorieGroups', group.id, 'users'));
                  const groupUsersSnapshot = await getDocs(groupUsersQuery);
                  const usersBatch = writeBatch(db);
                  groupUsersSnapshot.forEach(userDoc => {
                      usersBatch.delete(userDoc.ref);
                  });
                  await usersBatch.commit();

                  // 5. 그룹 문서 삭제
                  const groupRef = doc(db, 'calorieGroups', group.id);
                  await deleteDoc(groupRef);

                  message.success(`'${group.name}' 그룹이 삭제되고 편차 설정이 롤백되었습니다.`);
                  await loadData();
              } catch (error) {
                  console.error('그룹 삭제 실패:', error);
                  message.error('그룹 삭제에 실패했습니다.');
              } finally {
                  setLoadingGroups(false);
              }
          },
      });
  };

  // 사용자 편집 모달
  const handleEditUser = (user) => {
    setCurrentUser(user);
    form.setFieldsValue({
      group: user.group,
      calorieBias: user.calorieBias
    });
    setIsUserModalVisible(true);
  };

  // 사용자 설정 저장
  const handleSaveUserSettings = async (values) => {
    if (!currentUser) return;
    
    // 그룹 유효성 검사
    const isValidGroup = values.group === DEFAULT_GROUP_VALUE || 
                        groups.some(g => g.name === values.group && !g.isDefault);
    
    if (!isValidGroup) {
      message.error('유효하지 않은 그룹입니다. 기본 그룹으로 설정됩니다.');
      values.group = DEFAULT_GROUP_VALUE;
    }
    
    try {
      const userEmail = currentUser.key; // email 기반 식별자
      const userRef = doc(db, 'users', userEmail);
      await updateDoc(userRef, {
        group: values.group,
        calorieBias: values.calorieBias
      });

      // 그룹이 변경된 경우 users 서브컬렉션 업데이트
      if (currentUser.group !== values.group) {
        const batch = writeBatch(db);
        
        // 이전 그룹에서 사용자 제거 (기본 그룹이 아닌 경우)
        if (currentUser.group !== DEFAULT_GROUP_VALUE) {
          const oldGroup = groups.find(g => g.name === currentUser.group);
          if (oldGroup && !oldGroup.isDefault) {
            const oldGroupUserRef = doc(db, 'calorieGroups', oldGroup.id, 'users', userEmail);
            batch.delete(oldGroupUserRef);
          }
        }
        
        // 새 그룹에 사용자 추가 (기본 그룹이 아닌 경우)
        if (values.group !== DEFAULT_GROUP_VALUE) {
          const newGroup = groups.find(g => g.name === values.group);
          if (newGroup && !newGroup.isDefault) {
            const newGroupUserRef = doc(db, 'calorieGroups', newGroup.id, 'users', userEmail);
            batch.set(newGroupUserRef, {
              email: userEmail,
              uid: currentUser.uid, // 호환성을 위해 uid 유지
              addedAt: new Date(),
              addedBy: 'admin'
            });
          }
        }
        
        await batch.commit();
      }

      message.success('사용자 설정이 업데이트되었습니다.');
      setIsUserModalVisible(false);
      await loadData();

    } catch (error) {
      console.error('사용자 설정 업데이트 실패:', error, currentUser.key);
      message.error('사용자 설정 업데이트에 실패했습니다.');
    }
  };

  // 그룹 사용자 관리 모달 열기
  const handleOpenAddUserModal = (group) => {
    setTargetGroupForAddingUser(group);

    // 그룹에 속한 사용자들의 key를 targetKeys로 설정
    const groupUserKeys = users
      .filter(user => {
        if (group.isDefault) {
          return user.group === DEFAULT_GROUP_VALUE;
        } else {
          return user.group === group.name;
        }
      })
      .map(user => user.key);

    setTargetKeysForTransfer(groupUserKeys);
    setIsAddUserModalVisible(true);
  };
  
  // 랜덤 사용자 선택 모달
  const handleOpenRandomUserModal = (group) => {
    setTargetGroupForAddingUser(group);
    setRandomUserCount(5); // 기본값 설정
    setRandomUserPercentage(50); // 기본값 설정
    setRandomSelectionMode('count'); // 기본 모드 설정
    setRandomSelectedUsers([]);
    setIsRandomUserModalVisible(true);
  };
  
  // 랜덤 사용자 선택 함수
  const handleRandomUserSelection = () => {
    const availableUsers = users.filter(user => {
      if (targetGroupForAddingUser.isDefault) {
        return user.group !== DEFAULT_GROUP_VALUE;
      } else {
        return user.group !== targetGroupForAddingUser.name;
      }
    });
    
    if (availableUsers.length === 0) {
      message.warning('선택 가능한 사용자가 없습니다.');
      return;
    }
    
    let selectedCount = 0;
    if (randomSelectionMode === 'count') {
      selectedCount = Math.min(randomUserCount, availableUsers.length);
    } else { // percentage 모드
      selectedCount = Math.floor(availableUsers.length * (randomUserPercentage / 100));
      selectedCount = Math.max(1, selectedCount); // 최소 1명 이상
      selectedCount = Math.min(selectedCount, availableUsers.length); // 최대 전체 인원
    }
    
    // Fisher-Yates 셔플 알고리즘으로 랜덤 선택
    const shuffled = [...availableUsers];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    const selected = shuffled.slice(0, selectedCount);
    setRandomSelectedUsers(selected);
    setTargetKeysForTransfer(selected.map(user => user.key));
  };
  
  // 랜덤 선택된 사용자를 그룹에 추가
  const handleAddRandomUsersToGroup = async () => {
    if (!targetGroupForAddingUser || targetKeysForTransfer.length === 0) {
      message.warning('추가할 사용자를 선택하세요.');
      return;
    }
    
    // 대상 그룹 유효성 검사
    const isValidTargetGroup = targetGroupForAddingUser.isDefault || 
                              groups.some(g => g.id === targetGroupForAddingUser.id && !g.isDefault);
    
    if (!isValidTargetGroup) {
      message.error('유효하지 않은 대상 그룹입니다.');
      return;
    }
    
    const targetGroupValue = targetGroupForAddingUser.isDefault
      ? DEFAULT_GROUP_VALUE
      : targetGroupForAddingUser.name;
      
    try {
      setLoadingUsers(true);
      const batch = writeBatch(db);
      
      targetKeysForTransfer.forEach(userEmail => {
        const userRef = doc(db, 'users', userEmail);
        batch.update(userRef, { group: targetGroupValue });
        
        // calorieGroups/{그룹ID}/users/ 컬렉션에 사용자 email 저장
        if (!targetGroupForAddingUser.isDefault) {
          const groupUserRef = doc(db, 'calorieGroups', targetGroupForAddingUser.id, 'users', userEmail);
          const user = users.find(u => u.key === userEmail);
          batch.set(groupUserRef, {
            email: userEmail,
            uid: user?.uid, // 호환성을 위해 uid 유지
            addedAt: new Date(),
            addedBy: 'admin'
          });
        }
      });
      
      await batch.commit();
      message.success(`${targetKeysForTransfer.length}명의 사용자가 '${targetGroupForAddingUser.name}' 그룹에 추가되었습니다.`);
      setIsRandomUserModalVisible(false);
      setTargetGroupForAddingUser(null);
      setRandomSelectedUsers([]);
      await loadData();
    } catch (error) {
      console.error('그룹에 사용자 추가 실패:', error);
      message.error('그룹에 사용자를 추가하는 중 오류가 발생했습니다.');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Transfer 데이터 소스 준비 (모든 사용자 표시)
  const getTransferDataSource = () => {
    if (!targetGroupForAddingUser) return [];
    return users.map(user => {
        const currentGroupName = user.group === DEFAULT_GROUP_VALUE
            ? '기본 그룹'
            : (groups.find(g => g.name === user.group)?.name || user.group);
        return {
            key: user.key,
            title: `${user.name} (${user.email})`,
            description: `현재 그룹: ${currentGroupName}`
        };
    });
  };

  // Transfer 선택 변경 핸들러
  const handleTransferChange = (nextTargetKeys) => {
    setTargetKeysForTransfer(nextTargetKeys);
  };

  // 그룹 멤버십 관리 (추가/제거 모두 처리)
  const handleManageGroupMembership = async () => {
    if (!targetGroupForAddingUser) {
        message.warning('대상 그룹이 선택되지 않았습니다.');
        return;
    }

    const targetGroupValue = targetGroupForAddingUser.isDefault
        ? DEFAULT_GROUP_VALUE
        : targetGroupForAddingUser.name;

    try {
        setLoadingUsers(true);
        const batch = writeBatch(db);

        // 모든 사용자들을 순회하면서 그룹 멤버십 결정
        users.forEach(user => {
            const shouldBeInGroup = targetKeysForTransfer.includes(user.key);
            const currentGroupValue = user.group;

            if (shouldBeInGroup && currentGroupValue !== targetGroupValue) {
                // 그룹에 추가해야 하는 경우
                const userRef = doc(db, 'users', user.key);
                batch.update(userRef, { group: targetGroupValue });

                // 기본 그룹이 아닌 경우 calorieGroups 컬렉션에 추가
                if (!targetGroupForAddingUser.isDefault) {
                  const groupUserRef = doc(db, 'calorieGroups', targetGroupForAddingUser.id, 'users', user.key);
                  const userData = users.find(u => u.key === user.key);
                  batch.set(groupUserRef, {
                    email: user.key,
                    uid: userData?.uid,
                    addedAt: new Date(),
                    addedBy: 'admin'
                  });
                }
            } else if (!shouldBeInGroup && currentGroupValue === targetGroupValue) {
                // 그룹에서 제거해야 하는 경우 (기본 그룹으로 이동)
                const userRef = doc(db, 'users', user.key);
                batch.update(userRef, { group: DEFAULT_GROUP_VALUE });

                // 기본 그룹이 아닌 경우 calorieGroups 컬렉션에서 제거
                if (!targetGroupForAddingUser.isDefault) {
                  const groupUserRef = doc(db, 'calorieGroups', targetGroupForAddingUser.id, 'users', user.key);
                  batch.delete(groupUserRef);
                }
            }
        });

        await batch.commit();
        message.success(`'${targetGroupForAddingUser.name}' 그룹 멤버십이 업데이트되었습니다.`);
        setIsAddUserModalVisible(false);
        setTargetGroupForAddingUser(null);
        setTargetKeysForTransfer([]);
        await loadData();
    } catch (error) {
        console.error('그룹 멤버십 관리 실패:', error);
        message.error('그룹 멤버십을 업데이트하는 중 오류가 발생했습니다.');
    } finally {
        setLoadingUsers(false);
    }
  };

  // 그룹 정보를 표시하는 카드 컴포넌트
  const GroupCard = ({ group }) => {
    
    const groupUsers = users.filter(user => {
        if (group.isDefault) {
            return user.group === DEFAULT_GROUP_VALUE;
        } else {
            return user.group === group.name;
        }
    });
    
    // 선택된 날짜/식사 유형의 평균 편차 계산
    let totalSpecificDifference = 0;
    let countWithSpecificData = 0;
    groupUsers.forEach(user => {
        const foodData = user.foodDocForSelectedDate;
        const mealData = foodData ? foodData[selectedMealType] : null;
        
        // 새로운 데이터 구조 (originalCalories) 및 기존 구조 모두 지원
        const actualCalories = mealData?.originalCalories?.actual ?? mealData?.actualCalories;
        const estimatedCalories = mealData?.originalCalories?.estimated ?? mealData?.estimatedCalories;
        
        if (mealData && actualCalories !== null && actualCalories !== undefined && estimatedCalories !== null && estimatedCalories !== undefined) {
            totalSpecificDifference += (actualCalories - estimatedCalories);
            countWithSpecificData++;
        }
    });
    const averageSpecificBias = countWithSpecificData > 0 ? Math.round(totalSpecificDifference / countWithSpecificData) : 0;

    // GroupCard 내부에서는 직접 맵 사용 또는 필요시 변수 선언
    const mealTypeKoreanLabel = mealTypeKoreanMap[selectedMealType] || selectedMealType;



    return (
      <Card
        size='small'
        title={
          <Space wrap>
            <Tag color={group.color || 'default'}>{group.name || '이름 없음'}</Tag>
          </Space>
        }
        extra={
          <Space wrap size="small">
             <Button
                 icon={<EditOutlined />}
                 size="small"
                 onClick={() => handleOpenGroupEditModal(group)}
                 title="그룹 정보 수정"
                 text="정보 수정"
             />
             {!group.isDefault && (
                 <>
                     <Button
                         danger
                         icon={<DeleteOutlined />}
                         size="small"
                         onClick={() => handleDeleteGroup(group)}
                         title="그룹 삭제"
                     />
                     <Popover
                       content={
                         <div style={{ width: 180 }}>
                           <Button 
                             icon={<UserAddOutlined />} 
                             block 
                             size="small"
                             style={{ marginBottom: 8 }}
                             onClick={() => {
                               handleOpenAddUserModal(group);
                             }}
                           >
                             수동 관리
                           </Button>
                           <Button 
                             icon={<Shuffle size={14} />} 
                             block
                             size="small"
                             onClick={() => {
                                handleOpenRandomUserModal(group);
                             }}
                           >
                             랜덤 추출
                           </Button>
                         </div>
                       }
                       title="사용자 추가"
                       trigger="click"
                       placement="bottom"
                     >
                       <Button
                         icon={<UserAddOutlined />}
                         size="small"
                         title="사용자 추가"
                       />
                     </Popover>
                 </>
             )}
            <Button
              type="default"
              icon={<SyncOutlined />}
              size="small"
              onClick={() => {
                confirm({
                  title: `${group.name} ${selectedDate.format('YYYY-MM-DD')} ${mealTypeKoreanLabel} 동기화 적용`,
                  icon: <ExclamationCircleOutlined />,
                  content: `${groupUsers.length}명 사용자에게 offset 적용?`,
                  onOk() { applyGroupCalorieBias(group.name); }
                });
              }}
              title="그룹 전체 사용자에게 동기화 적용"
            />
          </Space>
        }
        style={{ marginBottom: group.isDefault ? 8 : 16 }}
      >
        {group.isDefault ? (
          // 기본 그룹(미지정 유저)은 간결하게 표시
          <Row gutter={[8, 8]} align="middle">
            <Col xs={12} sm={8}>
              <Statistic title="사용자 수" value={groupUsers.length} suffix="명" />
            </Col>
            <Col xs={12} sm={8}>
              <Statistic title="평균 편차" value={averageSpecificBias} suffix="kcal" />
            </Col>
            <Col xs={24} sm={8}>
              {groupUsers.length > 0 ? (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {groupUsers.length}명의 미지정 사용자
                </Text>
              ) : (
                <Text type="secondary" style={{ fontSize: '12px' }}>미지정 사용자 없음</Text>
              )}
            </Col>
          </Row>
        ) : (
          // 일반 그룹은 상세하게 표시
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Text type="secondary" style={{ fontSize: '14px', fontWeight:'bold', display: 'block', marginBottom: '3px' }}>
                {group.description || '설명 없음'}
              </Text>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Statistic title="사용자 수" value={groupUsers.length} suffix="명" />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Statistic title={`평균 편차 (${selectedDate.format('MM/DD')} ${mealTypeKoreanLabel})`} value={averageSpecificBias} suffix={`kcal (${countWithSpecificData}명)`} />
            </Col>
            <Col xs={24} sm={24} md={8}>
              <Space wrap>
                {groupUsers.slice(0, isMobile ? 3 : 5).map(user => (
                  <Tooltip key={user.key} title={`${user.name} (${user.email}) - 설정값: ${user.calorieBias > 0 ? '+' : ''}${user.calorieBias}kcal`}>
                    <Tag color={group.color || 'default'}>
                      {user.name || user.email.split('@')[0]} ({user.calorieBias > 0 ? '+' : ''}{user.calorieBias})
                    </Tag>
                   </Tooltip>
                ))}
                {groupUsers.length > (isMobile ? 3 : 5) && <Tag>+{groupUsers.length - (isMobile ? 3 : 5)}명...</Tag>}
              </Space>
            </Col>
            

          </Row>
        )}
      </Card>
    );
  };

  // 통계 컴포넌트
  const Statistic = ({ title, value, suffix = '', prefix = '' }) => (
    <div style={{ marginBottom: isMobile ? 8 : 0 }}>
      <Text type="secondary" style={{ fontSize: '13px', display:'block' }}>{title}</Text>
      <Text strong style={{ fontSize: '22px', lineHeight: '1.2' }}>{prefix}{value}{suffix}</Text>
    </div>
  );

  // 데스크톱용 사용자 테이블 컬럼
  const desktopUserColumns = [
    {
      title: '이름',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.email}</Text>
        </div>
      ),
    },
    {
      title: '정보',
      key: 'info',
      width: 150,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{record.gender} / {record.age}세</Text>
          <Text>키: {record.height}cm / 몸무게: {record.weight}kg</Text>
          <Text>목표: {record.goal}</Text>
        </Space>
      ),
    },
    {
      title: '그룹',
      dataIndex: 'group',
      key: 'group',
      width: 120,
      render: (groupValue, record) => {
        // 선택된 날짜에 적용되는 그룹 찾기
        const applicableGroup = groups.find(g => {
          if (g.isDefault) return false;
          if (!g.applicableDate) return false;
          const groupDate = dayjs(g.applicableDate.toDate()).format('YYYY-MM-DD');
          const selectedDateStr = selectedDate.format('YYYY-MM-DD');
          return groupDate === selectedDateStr && record.group === g.name;
        });

        if (applicableGroup) {
          return <Tag color={applicableGroup.color || 'default'}>{applicableGroup.name}</Tag>;
        } else {
          // 적용되는 그룹이 없으면 기본 그룹 표시
          const defaultGroup = groups.find(g => g.id === DEFAULT_GROUP_ID);
          return <Tag color={defaultGroup?.color || '#8c8c8c'}>{defaultGroup?.name || '기본 그룹'}</Tag>;
        }
      },
      filters: [
          { text: '기본 그룹', value: DEFAULT_GROUP_VALUE },
          ...groups.filter(g => {
            if (g.isDefault) return false; // 기본 그룹은 이미 위에서 처리됨
            if (!g.applicableDate) return false; // applicableDate가 없는 그룹은 제외
            
            // 선택된 날짜와 그룹의 적용 날짜가 같은 경우만 표시
            const groupDate = dayjs(g.applicableDate.toDate()).format('YYYY-MM-DD');
            const selectedDateStr = selectedDate.format('YYYY-MM-DD');
            return groupDate === selectedDateStr;
          }).map(g => ({ text: g.name, value: g.name }))
      ],
      onFilter: (value, record) => record.group === value,
    },
    {
      title: '칼로리 편차 설정값',
      dataIndex: 'calorieBias',
      key: 'calorieBias',
      width: 150,
      render: (value) => (
        <Text style={{ color: value > 0 ? '#ff4d4f' : value < 0 ? '#1677ff' : 'inherit' }}>
          {value > 0 ? '+' : ''}{value} kcal
        </Text>
      ),
      sorter: (a, b) => a.calorieBias - b.calorieBias,
    },
    {
      title: '예측성공여부',
      key: 'predictionAccuracy',
      width: 120,
      render: (_, record) => {
        const foodData = record.foodDocForSelectedDate;
        const mealData = foodData ? foodData[selectedMealType] : null;
        
        if (!mealData) {
          return <Text type="secondary">-</Text>;
        }
        
        // 단식 체크 확인 (flag === 2)
        if (mealData.flag === 2) {
          return <Tag color="#faad14" style={{ color: 'white' }}>단식</Tag>;
        }
        
        // 데이터 추출 로직 (기존과 동일)
        let estimatedCalories = null;
        let actualCalories = null;
        let appliedDeviation = null;
        
        if (mealData) {
          // 새로운 데이터 구조 (originalCalories 사용)
          if (mealData.originalCalories) {
            estimatedCalories = mealData.originalCalories.estimated;
            actualCalories = mealData.originalCalories.actual;
            appliedDeviation = mealData.calorieDeviation?.applied || mealData.offset || 0;
          } 
          // 기존 데이터 구조 (estimatedCalories, actualCalories 직접 사용)
          else {
            estimatedCalories = mealData.estimatedCalories;
            actualCalories = mealData.actualCalories;
            appliedDeviation = mealData.offset || 0;
          }
        }
        
        if (estimatedCalories === null || actualCalories === null || isNaN(estimatedCalories) || isNaN(actualCalories)) {
          return <Text type="secondary">-</Text>;
        }
        
        // 차이 계산 (appliedDeviation 우선 사용)
        const difference = appliedDeviation ?? (actualCalories - estimatedCalories);
        const threshold = 0.2 * actualCalories;
        
        let status = '';
        let color = '';
        let icon = '';
        
        if (difference >= -threshold && difference <= threshold) {
          status = '정확';
          color = '#52c41a'; // 초록색
          icon = '✓';
        } else if (difference < -threshold) {
          status = '적게';
          color = '#ff4d4f'; // 빨간색
          icon = '↓';
        } else {
          status = '많이';
          color = '#1677ff'; // 파란색
          icon = '↑';
        }
        
        return (
          <Tag color={color} style={{ color: 'white' }}>
            {icon} {status}
          </Tag>
        );
      }
    },
    {
      title: `${selectedDate.format('MM/DD')} ${mealTypeKoreanMap[selectedMealType] || selectedMealType} 정보`,
      key: 'selectedMeal',
      width: 180,
      render: (_, record) => {
        const foodData = record.foodDocForSelectedDate;
        const mealData = foodData ? foodData[selectedMealType] : null;
        
        // 단식 체크 확인 (flag === 2)
        if (mealData && mealData.flag === 2) {
          return <Text type="secondary">단식</Text>;
        }
        
        // 새로운 데이터 구조와 기존 데이터 구조 모두 지원
        let estimatedCalories = null;
        let actualCalories = null;
        let appliedDeviation = null;
        
        if (mealData) {
          // 새로운 데이터 구조 (originalCalories 사용)
          if (mealData.originalCalories) {
            estimatedCalories = mealData.originalCalories.estimated;
            actualCalories = mealData.originalCalories.actual;
            appliedDeviation = mealData.calorieDeviation?.applied || mealData.offset || 0;
          } 
          // 기존 데이터 구조 (estimatedCalories, actualCalories 직접 사용)
          else {
            estimatedCalories = mealData.estimatedCalories;
            actualCalories = mealData.actualCalories;
            appliedDeviation = mealData.offset || 0;
          }
        }
        
        if (!mealData || estimatedCalories === null || actualCalories === null || isNaN(estimatedCalories) || isNaN(actualCalories)) {
            return <Text type="secondary">기록 없음</Text>;
        }
        
        const originalDifference = actualCalories - estimatedCalories;
        const finalDifference = appliedDeviation ?? originalDifference;
        
        return (
             <Space direction="vertical" size={0}>
                <Text>예:{estimatedCalories} / 실:{actualCalories}</Text>
                <Space>
                   <Tooltip title={`원본차(${originalDifference})`}><Text style={{ color: originalDifference > 0 ? '#ff4d4f' : originalDifference < 0 ? '#1677ff' : 'inherit' }}>({originalDifference>0?'+':''}{originalDifference})</Text></Tooltip>
                   {appliedDeviation !== null && appliedDeviation !== 0 && (<Tooltip title={`적용편차(${appliedDeviation})`}><Text strong style={{ color: finalDifference > 0 ? '#ff4d4f' : finalDifference < 0 ? '#1677ff' : 'inherit' }}>→{finalDifference>0?'+':''}{finalDifference}</Text></Tooltip>)}
                </Space>
             </Space>
        );
      },
      sorter: (a, b) => {
        const aData = a.foodDocForSelectedDate?.[selectedMealType];
        const bData = b.foodDocForSelectedDate?.[selectedMealType];
        
        // 우선순위 함수: 낮은 숫자가 높은 우선순위
        const getPriority = (data) => {
          if (!data) return 3; // 기록 없음
          if (data.flag === 2) return 2; // 단식
          
          // 칼로리 데이터 확인
          const hasCalories = data.originalCalories 
            ? (data.originalCalories.actual !== undefined && data.originalCalories.estimated !== undefined && !isNaN(data.originalCalories.actual) && !isNaN(data.originalCalories.estimated))
            : (data.estimatedCalories !== undefined && data.actualCalories !== undefined && !isNaN(data.estimatedCalories) && !isNaN(data.actualCalories));
          
          return hasCalories ? 1 : 3; // 식사 기록 또는 기록 없음
        };
        
        const aPriority = getPriority(aData);
        const bPriority = getPriority(bData);
        
        return aPriority - bPriority;
      }
    },
    {
      title: '작업',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="primary" size="small" onClick={() => handleEditUser(record)}>설정</Button>
          <Button
            size="small"
            icon={<SyncOutlined />}
            onClick={() => {
              confirm({
                title: '개별 편차 적용',
                icon: <ExclamationCircleOutlined />,
                content: `${record.name} (${selectedDate.format('YYYY-MM-DD')} ${mealTypeKoreanMap[selectedMealType] || selectedMealType}) 칼로리편차(${record.calorieBias}) 적용?`,
                onOk() { applyCalorieBias(record.key); }
              });
            }}
          >
            적용
          </Button>
        </Space>
      ),
    },
  ];

  // 모바일용 사용자 테이블 컬럼
  const mobileUserColumns = [
    {
      title: '사용자',
      key: 'user',
      render: (_, r) => {
          let groupName = '정보 없음';
          let groupColor = 'default';

          // 선택된 날짜에 적용되는 그룹 찾기
          const applicableGroup = groups.find(g => {
            if (g.isDefault) return false;
            if (!g.applicableDate) return false;
            const groupDate = dayjs(g.applicableDate.toDate()).format('YYYY-MM-DD');
            const selectedDateStr = selectedDate.format('YYYY-MM-DD');
            return groupDate === selectedDateStr && r.group === g.name;
          });

          if (applicableGroup) {
            groupName = applicableGroup.name;
            groupColor = applicableGroup.color || 'default';
          } else {
            const defaultGroup = groups.find(g => g.id === DEFAULT_GROUP_ID);
            groupName = defaultGroup?.name || '기본 그룹';
            groupColor = defaultGroup?.color || '#8c8c8c';
          }
          return (
             <div>
               <Space align="center">
                 <UserOutlined />
                 <Text strong>{r.name}</Text>
               </Space>
               <div style={{ marginTop: 4 }}>
                 <Text type="secondary" style={{ fontSize: '12px' }}>{r.email}</Text>
               </div>
               <div style={{ marginTop: 8 }}>
                 <Tag color={groupColor}>{groupName}</Tag>
                 <Tooltip title="칼로리 편차 설정값">
                   <Text style={{
                     color: r.calorieBias > 0 ? '#ff4d4f' : r.calorieBias < 0 ? '#1677ff' : 'inherit',
                     marginLeft: 8
                   }}>
                     ({r.calorieBias > 0 ? '+' : ''}{r.calorieBias} kcal)
                   </Text>
                 </Tooltip>
               </div>
               {r.foodDocForSelectedDate && (
                 <div style={{ marginTop: 8, fontSize: '12px', borderTop: '1px dashed #eee', paddingTop: 8 }}>
                     <Text type="secondary">최근 식사 ({selectedDate.format('MM/DD')} {mealTypeKoreanMap[selectedMealType]}): </Text>
                     {(() => {
                        const mealData = r.foodDocForSelectedDate[selectedMealType];
                        
                        // 단식 체크 확인 (flag === 2)
                        if (mealData && mealData.flag === 2) {
                          return <Text type="secondary">단식</Text>;
                        }
                        
                        // 새로운 데이터 구조와 기존 데이터 구조 모두 지원
                        let estimatedCalories = null;
                        let actualCalories = null;
                        let appliedDeviation = null;
                        
                        if (mealData) {
                          // 새로운 데이터 구조 (originalCalories 사용)
                          if (mealData.originalCalories) {
                            estimatedCalories = mealData.originalCalories.estimated;
                            actualCalories = mealData.originalCalories.actual;
                            appliedDeviation = mealData.calorieDeviation?.applied || mealData.offset || 0;
                          } 
                          // 기존 데이터 구조 (estimatedCalories, actualCalories 직접 사용)
                          else {
                            estimatedCalories = mealData.estimatedCalories;
                            actualCalories = mealData.actualCalories;
                            appliedDeviation = mealData.offset || 0;
                          }
                        }
                        
                        if (mealData && estimatedCalories !== null && actualCalories !== null && !isNaN(estimatedCalories) && !isNaN(actualCalories)) {
                            const originalDifference = actualCalories - estimatedCalories;
                            const finalDifference = appliedDeviation ?? originalDifference;
                            return (
                                 <Tooltip title={`실제: ${actualCalories}, 예상: ${estimatedCalories}, 적용편차: ${appliedDeviation ?? 0}`}>
                                     <Text style={{ color: finalDifference > 0 ? '#ff4d4f' : finalDifference < 0 ? '#1677ff' : 'inherit' }}>
                                          {finalDifference > 0 ? '+' : ''}{finalDifference} kcal
                                     </Text>
                                 </Tooltip>
                            );
                        }
                        return <Text type="secondary">기록 없음</Text>;
                     })()}
                 </div>
               )}
             </div>
        );
      },
    },
    {
      title: '작업',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button type="primary" size="small" block onClick={() => handleEditUser(record)}>설정</Button>
          <Button
            size="small"
            block
            icon={<SyncOutlined />}
            onClick={() => {
              confirm({
                title: '개별 편차 적용',
                icon: <ExclamationCircleOutlined />,
                content: `${record.name} (${selectedDate.format('YYYY-MM-DD')} ${mealTypeKoreanMap[selectedMealType] || selectedMealType}) 칼로리편차(${record.calorieBias}) 적용?`,
                onOk() { applyCalorieBias(record.key); }
              });
            }}
          >
            적용
          </Button>
        </Space>
      ),
    }
  ];

  // 칼로리 편차 적용 함수 (선택된 날짜/식사 유형 타겟) - 사용자 데이터 구조 유지
  const handleApplyUserDeviation = async (userEmail) => {
    if (!selectedDate || !selectedMealType) {
        message.error('편차를 적용할 날짜와 식사 유형을 선택하세요.');
        return;
    }
    try {
      setLoadingUsers(true);
      const userInfo = users.find(u => u.key === userEmail);
      if (!userInfo) { 
        message.error("사용자 정보를 찾을 수 없습니다."); 
        return; 
      }
      
      const dateString = selectedDate.format('YYYY-MM-DD');
      const personalBias = userInfo.calorieBias || 0;
      
      // 사용자의 해당 날짜 음식 문서 가져오기 (email 기반)
      const foodDocRef = doc(db, `users/${userEmail}/foods`, dateString);
      const foodDocSnap = await getDoc(foodDocRef);
      
      if (!foodDocSnap.exists()) {
        message.warning('해당 날짜에 식사 기록이 없습니다.');
        return;
      }
      
      const foodData = foodDocSnap.data();
      const mealData = foodData[selectedMealType];
      
      if (!mealData) {
        message.warning('해당 식사 시간대에 기록이 없습니다.');
        return;
      }
      
      // 기존 데이터 구조 확인 및 처리
      let estimatedCalories = null;
      let actualCalories = null;
      
      // 새로운 구조 (originalCalories) 우선 확인
      if (mealData.originalCalories) {
        estimatedCalories = mealData.originalCalories.estimated;
        actualCalories = mealData.originalCalories.actual;
      }
      // 기존 구조 (estimatedCalories, actualCalories) 확인
      else if (mealData.estimatedCalories !== undefined && mealData.actualCalories !== undefined) {
        estimatedCalories = mealData.estimatedCalories;
        actualCalories = mealData.actualCalories;
      }
      
      if (estimatedCalories === null || actualCalories === null) {
        message.warning('칼로리 정보가 완전하지 않습니다.');
        return;
      }
      
      // 사용자의 그룹 설정 가져오기 (applicableDate 체크)
      const userGroupId = userInfo.group;
      let groupSettings = null;
      let groupDeviationConfig = null;
      
      if (userGroupId !== DEFAULT_GROUP_VALUE) {
        const userGroup = groups.find(g => 
          g.name === userGroupId && 
          !g.isDefault && 
          g.applicableDate && 
          dayjs(g.applicableDate.toDate()).format('YYYY-MM-DD') === selectedDate.format('YYYY-MM-DD')
        );
        if (userGroup) {
          // 그룹의 applicableDate가 선택된 날짜와 일치하는지 확인 (이미 위에서 체크했으므로 생략 가능)
          const groupApplicableDate = dayjs(userGroup.applicableDate.toDate()).format('YYYY-MM-DD');
          const selectedDateStr = selectedDate.format('YYYY-MM-DD');
          
          // 일단위 동작: 그룹의 적용 날짜와 선택된 날짜가 같아야만 그룹 설정 적용
          if (groupApplicableDate === selectedDateStr) {
            groupSettings = {
              applicableDate: selectedDate.toDate(),
              defaultDeviation: userGroup.defaultDeviation ?? 0,
              deviationMultiplier: userGroup.deviationMultiplier ?? 0.2,
              groupId: userGroup.id
            };
            
            groupDeviationConfig = {
              appliedAt: new Date().toISOString(),
              appliedBy: "admin",
              defaultDeviation: userGroup.defaultDeviation ?? 0,
              deviationMultiplier: userGroup.deviationMultiplier ?? 0.2,
              groupId: userGroup.id
            };
          }
          // 그룹이 해당 날짜에 적용되지 않으면 groupSettings는 null로 유지 (개인 편차만 적용)
        }
      }
      
      // 편차 계산 (기존 데이터 구조 유지)
      let appliedDeviation = personalBias;
      
      if (estimatedCalories && actualCalories) {
        let difference = actualCalories - estimatedCalories;
        
        // 그룹 설정이 있는 경우 그룹 편차 계산 적용
        if (groupSettings) {
          const deviationMultiplier = groupSettings.deviationMultiplier ?? 0.2;
          const defaultDeviation = groupSettings.defaultDeviation ?? 0;
          
          if (difference > 0) {
            // 과식 시: -차이값 * (1 + multiplier)
            const adjustedMultiplier = 1 + deviationMultiplier;
            appliedDeviation = (-difference * adjustedMultiplier) + defaultDeviation + personalBias;
          } else {
            // 적게 먹을 시: 차이값 * (1 + multiplier) + defaultDeviation
            const adjustedMultiplier = 1 + deviationMultiplier;
            appliedDeviation = (difference * adjustedMultiplier) + defaultDeviation + personalBias;
          }
        } else {
          // 그룹 설정이 없으면 기본 차이값 + 개인 편차
          appliedDeviation = difference + personalBias;
        }
      }
      
      appliedDeviation = Math.round(appliedDeviation);
      
      // 기존 데이터 구조 유지하면서 업데이트
      const updatedMealData = {
        ...mealData,
        calorieDeviation: {
          ...mealData.calorieDeviation,
          applied: appliedDeviation,
          natural: actualCalories - estimatedCalories,
          groupSettings: groupSettings,
          personalBias: personalBias
        },
        groupDeviationConfig: groupDeviationConfig,
        updatedAt: new Date().toISOString()
      };
      
      // Firestore 업데이트
      await updateDoc(foodDocRef, {
        [selectedMealType]: updatedMealData,
        updatedAt: new Date().toISOString()
      });

      // 단발성 개인 편차 사용 후 0으로 리셋 (관리자 적용에서도 동일)
      if (personalBias !== 0) {
        try {
          await savePersonalCalorieBias(userEmail, 0);
        } catch (resetError) {
          console.error('개인 편차 리셋 실패:', resetError);
          // 리셋 실패해도 편차 적용은 성공했으므로 에러로 처리하지 않음
        }
      }
      
      message.success(`${userInfo.name || userInfo.email}의 ${dateString} ${mealTypeKoreanMap[selectedMealType]} 편차 적용 완료 (${appliedDeviation > 0 ? '+' : ''}${appliedDeviation} kcal)`);
      await loadData(); // 데이터 리로드

    } catch (error) {
      console.error('개별 편차 적용 실패:', error);
      message.error('개별 편차 적용에 실패했습니다.');
    } finally {
      setLoadingUsers(false);
    }
  };
  
  // 기존 함수명 호환성을 위한 별칭
  const applyCalorieBias = handleApplyUserDeviation;

  const handleApplyGroupDeviation = async (groupKeyOrId) => {
     if (!selectedDate || !selectedMealType) {
        message.error('편차를 적용할 날짜와 식사 유형을 선택하세요.');
        return;
    }
    
    // 그룹 유효성 검사
    const isValidGroup = groupKeyOrId === DEFAULT_GROUP_VALUE || 
                        groups.some(g => g.name === groupKeyOrId || (g.isDefault && groupKeyOrId === DEFAULT_GROUP_VALUE));
    
    if (!isValidGroup) {
      message.error('유효하지 않은 그룹입니다.');
      return;
    }
    
    try {
      setLoadingUsers(true);
      const dateString = selectedDate.format('YYYY-MM-DD');
      
      // 현재 그룹 시스템 사용
      let targetUsers = users.filter(user => user.group === groupKeyOrId);
      
      if (targetUsers.length === 0) { 
        message.info('대상 사용자가 없습니다.'); 
        setLoadingUsers(false); 
        return; 
      }
      
      // 그룹 설정 가져오기 (applicableDate 체크)
       let groupSettings = null;
       let groupDeviationConfig = null;
       if (groupKeyOrId !== DEFAULT_GROUP_VALUE) {
         const targetGroup = groups.find(g => 
           g.name === groupKeyOrId && 
           !g.isDefault && 
           g.applicableDate && 
           dayjs(g.applicableDate.toDate()).format('YYYY-MM-DD') === selectedDate.format('YYYY-MM-DD')
         );
         if (targetGroup) {
           // 그룹의 applicableDate가 선택된 날짜와 일치하는지 확인 (이미 위에서 체크했으므로 생략 가능)
           const groupApplicableDate = dayjs(targetGroup.applicableDate.toDate()).format('YYYY-MM-DD');
           const selectedDateStr = selectedDate.format('YYYY-MM-DD');
           
           // 일단위 동작: 그룹의 적용 날짜와 선택된 날짜가 같아야만 그룹 설정 적용
           if (groupApplicableDate === selectedDateStr) {
             groupSettings = {
               applicableDate: selectedDate.toDate(),
               defaultDeviation: targetGroup.defaultDeviation ?? 0,
               deviationMultiplier: targetGroup.deviationMultiplier ?? 0.2,
               groupId: targetGroup.id,
               mealType: selectedMealType
             };
             
             groupDeviationConfig = {
               appliedAt: new Date().toISOString(),
               appliedBy: "admin",
               defaultDeviation: targetGroup.defaultDeviation ?? 0,
               deviationMultiplier: targetGroup.deviationMultiplier ?? 0.2,
               groupId: targetGroup.id,
               mealType: selectedMealType
             };
           } else {
             // 그룹이 해당 날짜에 적용되지 않으면 경고 메시지
             message.warning(`${targetGroup.name} 그룹은 ${groupApplicableDate} 날짜에만 적용됩니다.`);
             setLoadingUsers(false);
             return;
           }
         } else {
           // 해당 날짜에 적용되는 그룹을 찾을 수 없음
           message.warning(`선택된 날짜(${selectedDate.format('YYYY-MM-DD')})에 적용되는 '${groupKeyOrId}' 그룹을 찾을 수 없습니다.`);
           setLoadingUsers(false);
           return;
         }
       }
      
      let successCount = 0;
      let errorCount = 0;
      
      // 각 사용자에 대해 편차 적용
      for (const user of targetUsers) {
        try {
          const userEmail = user.key; // email 기반 식별자
          const personalBias = user.calorieBias || 0;
          
          // 사용자의 해당 날짜 음식 문서 가져오기 (email 기반)
          const foodDocRef = doc(db, `users/${userEmail}/foods`, dateString);
          const foodDocSnap = await getDoc(foodDocRef);
          
          if (!foodDocSnap.exists()) {
            continue; // 해당 날짜에 식사 기록이 없으면 스킵
          }
          
          const foodData = foodDocSnap.data();
          const mealData = foodData[selectedMealType];
          
          if (!mealData) {
            continue; // 해당 식사 시간대에 기록이 없으면 스킵
          }
          
          // 기존 데이터 구조 확인 및 처리
          let estimatedCalories = null;
          let actualCalories = null;
          
          // 새로운 구조 (originalCalories) 우선 확인
          if (mealData.originalCalories) {
            estimatedCalories = mealData.originalCalories.estimated;
            actualCalories = mealData.originalCalories.actual;
          }
          // 기존 구조 (estimatedCalories, actualCalories) 확인
          else if (mealData.estimatedCalories !== undefined && mealData.actualCalories !== undefined) {
            estimatedCalories = mealData.estimatedCalories;
            actualCalories = mealData.actualCalories;
          }
          
          if (estimatedCalories === null || actualCalories === null) {
            continue; // 칼로리 정보가 완전하지 않으면 스킵
          }
          
          // 편차 계산 (기존 데이터 구조 유지)
          let appliedDeviation = personalBias;
          
          if (estimatedCalories && actualCalories) {
            let difference = actualCalories - estimatedCalories;
            
            // 그룹 설정이 있는 경우 그룹 편차 계산 적용
            if (groupSettings) {
              const deviationMultiplier = groupSettings.deviationMultiplier ?? 0.2;
              const defaultDeviation = groupSettings.defaultDeviation ?? 0;
              
              if (difference > 0) {
                // 과식 시: -차이값 * (1 + multiplier)
                const adjustedMultiplier = 1 + deviationMultiplier;
                appliedDeviation = (-difference * adjustedMultiplier) + defaultDeviation + personalBias;
              } else {
                // 적게 먹을 시: 차이값 * (1 + multiplier) + defaultDeviation
                const adjustedMultiplier = 1 + deviationMultiplier;
                appliedDeviation = (difference * adjustedMultiplier) + defaultDeviation + personalBias;
              }
            } else {
              // 그룹 설정이 없으면 기본 차이값 + 개인 편차
              appliedDeviation = difference + personalBias;
            }
          }
          
          appliedDeviation = Math.round(appliedDeviation);
          
          // 기존 데이터 구조 유지하면서 업데이트
           const updatedMealData = {
             ...mealData,
             calorieDeviation: {
               ...mealData.calorieDeviation,
               applied: appliedDeviation,
               natural: actualCalories - estimatedCalories,
               groupSettings: groupSettings,
               personalBias: personalBias
             },
             groupDeviationConfig: groupDeviationConfig,
             updatedAt: new Date().toISOString()
           };
          
          // Firestore 업데이트
          await updateDoc(foodDocRef, {
            [selectedMealType]: updatedMealData,
            updatedAt: new Date().toISOString()
          });

          // 단발성 개인 편차 사용 후 0으로 리셋 (그룹 적용에서도 동일)
          if (personalBias !== 0) {
            try {
              await savePersonalCalorieBias(userEmail, 0);
            } catch (resetError) {
              console.error(`사용자 ${userEmail} 편차 리셋 실패:`, resetError);
              // 리셋 실패해도 편차 적용은 성공했으므로 에러 카운트 증가하지 않음
            }
          }
          
          successCount++;
        } catch (userError) {
          console.error(`사용자 ${user.name || user.email} 편차 적용 실패:`, userError);
          errorCount++;
        }
      }
      
      const groupName = groupKeyOrId === DEFAULT_GROUP_VALUE ? '기본 그룹' : 
         (groups.find(g => g.name === groupKeyOrId)?.name || groupKeyOrId);
      
      if (successCount > 0) {
        message.success(`${groupName}의 ${dateString} ${mealTypeKoreanMap[selectedMealType]} 편차 적용 완료 (${successCount}명 성공${errorCount > 0 ? `, ${errorCount}명 실패` : ''})`);
      } else {
        message.warning('편차를 적용할 수 있는 사용자가 없습니다.');
      }
      
      await loadData(); // 데이터 리로드

    } catch (error) {
      console.error('그룹 편차 적용 실패:', error);
      message.error('그룹 편차 적용에 실패했습니다.');
    } finally {
      setLoadingUsers(false);
    }
  };
  
  // 기존 함수명 호환성을 위한 별칭
  const applyGroupCalorieBias = handleApplyGroupDeviation;

  return (
    <div style={{ padding: isMobile ? '8px' : '20px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16, padding: isMobile ? '0 8px' : 0 }}>
        <Space>
          <Title level={isMobile ? 4 : 2} style={{ color: '#5FDD9D', margin: 0 }}>칼로리 편차 관리</Title>
          <Tooltip title="도움말 보기">
            <Button 
              type="text" 
              shape="circle" 
              icon={<QuestionCircleOutlined />} 
              onClick={() => setShowHelp(!showHelp)}
            />
          </Tooltip>
        </Space>
        <Button onClick={loadData} icon={<SyncOutlined />} loading={loadingGroups || loadingUsers}>새로고침</Button>
      </Row>
      
      {showHelp && (
        <Alert
          message="칼로리 편차 관리 도움말"
          description={
            <div>
              <p><strong>그룹 관리</strong>: 사용자들을 그룹으로 관리하고 각 그룹 카드에서 직접 칼로리 편차를 설정할 수 있습니다.</p>
              <p><strong>편차 설정</strong>: 그룹 카드의 '편차 설정' 버튼을 클릭하여 해당 그룹의 모든 사용자에게 편차를 적용할 수 있습니다.</p>
              <p><strong>개별 사용자</strong>: 개별 사용자 탭에서 특정 사용자의 칼로리 편차를 개별적으로 설정할 수 있습니다.</p>
              <p><strong>랜덤 추출</strong>: 사용자를 랜덤하게 선택하여 그룹에 추가할 수 있습니다.</p>
            </div>
          }
          type="info"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          onClose={() => setShowHelp(false)}
        />
      )}

      <Row gutter={[8, 16]} align="middle" style={{ marginBottom: 20, padding: isMobile ? '0 8px' : 0 }}>
        <Col xs={12} sm={8} md={6}>
           <DatePicker 
              value={selectedDate} 
              onChange={(date) => setSelectedDate(date || dayjs())} // null 처리
              allowClear={false} // 날짜 선택 필수
              style={{ width: '100%' }} 
              size={isMobile ? 'small' : 'middle'}
              placeholder="날짜 선택"
           />
        </Col>
        <Col xs={12} sm={8} md={6}>
            <Select 
              value={selectedMealType} 
              onChange={(value) => setSelectedMealType(value)} 
              style={{ width: '100%' }} 
              size={isMobile ? 'small' : 'middle'}
            >
              <Option value="breakfast"><CoffeeOutlined /> {mealTypeKoreanMap['breakfast']}</Option>
              <Option value="lunch"><UserOutlined /> {mealTypeKoreanMap['lunch']}</Option>
              <Option value="dinner"><TeamOutlined /> {mealTypeKoreanMap['dinner']}</Option>
              <Option value="snacks"><CalendarOutlined /> {mealTypeKoreanMap['snacks']}</Option>
            </Select>
        </Col>
        <Col xs={24} sm={8} md={12}>
            <Text type="secondary" style={{ fontSize: isMobile ? '12px' : '14px' }}>
                선택한 날짜에 생성된 그룹만 표시되며, 해당 날짜와 식사 유형 기준으로 편차가 적용됩니다.
            </Text>
        </Col>
      </Row>
      


      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab} 
        tabBarStyle={{ marginBottom: 16, ...(isMobile && { overflowX: 'auto', whiteSpace: 'nowrap' }) }}
      >
        <TabPane tab={<span><TeamOutlined /> 그룹 관리</span>} key="groups">
          <Row justify="space-between" align="middle" style={{ marginBottom: 16, padding: isMobile ? '0 8px' : 0 }}>
            <Space>
              <Text style={{ fontSize: isMobile ? '14px' : '16px' }}>그룹별 설정 및 편차 관리</Text>
              <Tooltip title="선택한 날짜에 생성된 그룹만 표시됩니다. 그룹을 생성하고 사용자를 그룹에 할당할 수 있으며, 각 그룹 카드에서 칼로리 편차를 직접 설정하고 적용할 수 있습니다.">
                <InfoCircleOutlined style={{ color: '#1677ff' }} />
              </Tooltip>
            </Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenGroupEditModal()} size={isMobile ? 'small' : 'middle'}>새 그룹</Button>
          </Row>
          {loadingGroups ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Skeleton active paragraph={{ rows: 2 }} />
              <Skeleton active paragraph={{ rows: 2 }} />
            </Space>
          ) : groups.length > 0 ? (
             groups.filter(group => {
               // 기본 그룹은 항상 표시
               if (group.isDefault) return true;
               
               // applicableDate가 없는 그룹은 표시하지 않음
               if (!group.applicableDate) return false;
               
               // 선택된 날짜와 그룹의 적용 날짜가 같은 경우만 표시
               const groupDate = dayjs(group.applicableDate.toDate()).format('YYYY-MM-DD');
               const selectedDateStr = selectedDate.format('YYYY-MM-DD');
               return groupDate === selectedDateStr;
             }).sort((a, b) => {
                 if (a.id === DEFAULT_GROUP_ID) return -1;
                 if (b.id === DEFAULT_GROUP_ID) return 1;
                 if (a.isDefault && !b.isDefault) return -1;
                 if (!a.isDefault && b.isDefault) return 1;
                 return (a.name || '').localeCompare(b.name || '');
             }).map(group => (<GroupCard key={group.id} group={group} />))
          ) : (
            <Empty description="생성된 사용자 그룹이 없습니다." style={{ marginTop: 32, marginBottom: 32 }} >
              <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenGroupEditModal()}>새 그룹 생성</Button>
            </Empty>
          )}
        </TabPane>


        <TabPane tab={<span><UserOutlined /> 개별 사용자</span>} key="users">
          <Row gutter={[8, 8]} style={{ marginBottom: 16, padding: isMobile ? '0 8px' : 0 }}>
            <Col xs={24} md={12}>
              <Search placeholder="이름 또는 이메일 검색" value={searchTerm} onChange={handleSearchChange} allowClear style={{ width: '100%' }} size={isMobile ? 'small' : 'middle'}/>
            </Col>
            <Col xs={24} md={12}>
              <Select style={{ width: '100%' }} placeholder="그룹 필터" onChange={filterByGroup} value={selectedGroupKey || 'all'} allowClear onClear={() => filterByGroup('all')} size={isMobile ? 'small' : 'middle'}>
                <Option value="all">모든 그룹</Option>
                <Option value={DEFAULT_GROUP_VALUE}>
                   <Tag color={groups.find(g => g.id === DEFAULT_GROUP_ID)?.color || '#8c8c8c'} style={{ marginRight: 3 }} /> 기본 그룹
                </Option>
                {groups.filter(g => {
                  if (g.isDefault) return false; // 기본 그룹은 이미 위에서 처리됨
                  if (!g.applicableDate) return false; // applicableDate가 없는 그룹은 제외
                  
                  // 선택된 날짜와 그룹의 적용 날짜가 같은 경우만 표시
                  const groupDate = dayjs(g.applicableDate.toDate()).format('YYYY-MM-DD');
                  const selectedDateStr = selectedDate.format('YYYY-MM-DD');
                  return groupDate === selectedDateStr;
                }).sort((a, b) => a.name.localeCompare(b.name)).map(group => (
                    <Option key={group.id} value={group.name}>
                        <Tag color={group.color} style={{ marginRight: 3 }} /> {group.name}
                    </Option>
                 ))}
              </Select>
            </Col>
          </Row>
          <Table 
            columns={isMobile ? mobileUserColumns : desktopUserColumns} 
            dataSource={filteredUsers} 
            rowKey="key" 
            loading={loadingUsers ? { indicator: <Skeleton active paragraph={{ rows: 5 }} /> } : false}
            scroll={{ x: isMobile ? '100%' : 1000 }}
            pagination={{ pageSize: isMobile ? 8 : 10, showSizeChanger: false, size: 'small' }}
            size={isMobile ? "small" : "middle"}
            locale={{ emptyText: <Empty description="표시할 사용자가 없습니다." /> }}
          />
        </TabPane>

      </Tabs>

      <Modal title={<Text style={{ fontSize: '16px', fontWeight: '600' }}>사용자 설정</Text>} open={isUserModalVisible} onCancel={() => setIsUserModalVisible(false)} footer={null} width={isMobile ? '90%' : 480} destroyOnClose>
        {currentUser && ( <Form form={form} onFinish={handleSaveUserSettings} layout="vertical" initialValues={{ group: currentUser.group, calorieBias: currentUser.calorieBias }}>
          <Form.Item name="group" label="사용자 그룹" rules={[{ required: true, message: '그룹을 선택하세요.' }]}>
            <Select style={{ width: '100%' }}>
               <Option value={DEFAULT_GROUP_VALUE}>
                  <Tag color={groups.find(g => g.id === DEFAULT_GROUP_ID)?.color || '#8c8c8c'} style={{ marginRight: 5 }} /> 기본 그룹
               </Option>
               {groups.filter(g => {
                 if (g.isDefault) return false; // 기본 그룹은 이미 위에서 처리됨
                 if (!g.applicableDate) return false; // applicableDate가 없는 그룹은 제외
                 
                 // 선택된 날짜와 그룹의 적용 날짜가 같은 경우만 표시
                 const groupDate = dayjs(g.applicableDate.toDate()).format('YYYY-MM-DD');
                 const selectedDateStr = selectedDate.format('YYYY-MM-DD');
                 return groupDate === selectedDateStr;
               }).sort((a,b)=>a.name.localeCompare(b.name)).map(group => (
                  <Option key={group.id} value={group.name}>
                      <Tag color={group.color} style={{ marginRight: 5 }} /> {group.name}
                  </Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item name="calorieBias" label="칼로리 편차" rules={[{ required: true, message: '칼로리 편차를 입력하세요.' }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">저장</Button>
          </Form.Item>
        </Form> )}
      </Modal>
      
       <Modal title={<Text style={{ fontSize: '16px', fontWeight: '600' }}>{editingGroup ? '그룹 정보 수정' : '새 그룹 생성'}</Text>} open={isGroupEditModalVisible} onCancel={() => { setIsGroupEditModalVisible(false); setEditingGroup(null); }} footer={null} width={isMobile ? '90%' : 600} destroyOnClose>
           <Form form={groupEditForm} layout="vertical" onFinish={handleSaveGroup} initialValues={editingGroup ? { 
             ...editingGroup, 
             color: editingGroup.color || '#1677ff',
             deviationMultiplier: editingGroup.deviationMultiplier ?? 0.2,
             defaultDeviation: editingGroup.defaultDeviation ?? 0,

           } : { 
             name: '', 
             description: '', 
             color: '#1677ff',
             deviationMultiplier: 0.2,
             defaultDeviation: 0,

           }}>
               <Form.Item name="name" label="그룹 이름" rules={[{ required: true, message: '그룹 이름을 입력하세요.' }]}>
                   <Input />
               </Form.Item>
               <Form.Item name="description" label="그룹 설명">
                   <Input.TextArea />
               </Form.Item>

               <Form.Item name="color" label="그룹 색상" rules={[{ required: true, message: '그룹 색상을 선택하세요.' }]}>
                   <ColorPicker />
               </Form.Item>
               <Divider>편차 설정</Divider>
               <Row gutter={16}>
                 <Col span={12}>
                   <Form.Item 
                     name="deviationMultiplier" 
                     label="편차 가산율 (%)"
                     rules={[{ required: true, message: '편차 가산율을 입력하세요.' }]}
                   >
                     <InputNumber 
                       style={{ width: '100%' }}
                       min={0}
                       max={1}
                       step={0.01}
                       formatter={value => `${(value * 100).toFixed(0)}%`}
                       parser={value => value.replace('%', '') / 100}
                       placeholder="20%"
                     />
                   </Form.Item>
                 </Col>
                 <Col span={12}>
                   <Form.Item 
                     name="defaultDeviation" 
                     label="기본 편차값 (kcal)"
                     rules={[{ required: true, message: '기본 편차값을 입력하세요.' }]}
                   >
                     <InputNumber 
                       style={{ width: '100%' }}
                       placeholder="0"
                     />
                   </Form.Item>
                 </Col>
               </Row>
               <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: 16 }}>
                 편차 가산율: 칼로리 차이에 곱해지는 비율 (기본값: 20%)<br/>
                 기본 편차값: 편차 계산 시 사용되는 기본값 (기본값: 0kcal)
               </Text>
               <Form.Item>
                   <Button type="primary" htmlType="submit">저장</Button>
               </Form.Item>
           </Form>
       </Modal>

       <Modal title={<Text style={{ fontSize: '16px', fontWeight: '600' }}>'{targetGroupForAddingUser?.name}' 그룹 사용자 관리</Text>} open={isAddUserModalVisible} onCancel={() => setIsAddUserModalVisible(false)} onOk={handleManageGroupMembership} okText="저장" cancelText="취소" width={isMobile ? '95%' : 680} destroyOnClose bodyStyle={{ height: isMobile ? '50vh' : 350, overflowY: 'auto' }}>
            {targetGroupForAddingUser && ( <Transfer dataSource={getTransferDataSource()} showSearch filterOption={(i, o) => o.title.toLowerCase().includes(i.toLowerCase())} targetKeys={targetKeysForTransfer} onChange={handleTransferChange} render={item => item.title} listStyle={{ width: isMobile ? '45%' : 280, height: isMobile ? 280 : 300 }} titles={['전체 사용자', '그룹 멤버']} locale={{ itemUnit: '명', itemsUnit: '명', searchPlaceholder: '검색' }}/> )}
        </Modal>
        
        <Modal 
          title={
            <Space>
              <Shuffle size={16} />
              <Text style={{ fontSize: '16px', fontWeight: '600' }}>'{targetGroupForAddingUser?.name}' 그룹 랜덤 사용자 추가</Text>
            </Space>
          } 
          open={isRandomUserModalVisible} 
          onCancel={() => setIsRandomUserModalVisible(false)} 
          onOk={handleAddRandomUsersToGroup} 
          okText="선택한 사용자 추가" 
          cancelText="취소" 
          width={isMobile ? '95%' : 680} 
          destroyOnClose 
          bodyStyle={{ maxHeight: isMobile ? '70vh' : '70vh', overflowY: 'auto' }}
        >
          {targetGroupForAddingUser && (
            <div>
              <Steps
                current={randomSelectedUsers.length > 0 ? 1 : 0}
                items={[
                  {
                    title: '랜덤 설정',
                    description: '추출 방식 선택',
                  },
                  {
                    title: '사용자 확인',
                    description: '추출된 사용자 확인',
                  },
                ]}
                style={{ marginBottom: 24 }}
              />
              
              <Form form={randomUserForm} layout="vertical">
                <Form.Item label="랜덤 추출 방식">
                  <Radio.Group 
                    value={randomSelectionMode} 
                    onChange={(e) => setRandomSelectionMode(e.target.value)}
                    buttonStyle="solid"
                  >
                    <Radio.Button value="count">인원수 기준</Radio.Button>
                    <Radio.Button value="percentage">비율 기준</Radio.Button>
                  </Radio.Group>
                </Form.Item>
                
                {randomSelectionMode === 'count' ? (
                  <Form.Item label={`추출할 인원수 (최대 ${getTransferDataSource().length}명)`}>
                    <Row gutter={16}>
                      <Col span={16}>
                        <Slider
                          min={1}
                          max={Math.max(1, getTransferDataSource().length)}
                          value={randomUserCount}
                          onChange={setRandomUserCount}
                        />
                      </Col>
                      <Col span={8}>
                        <InputNumber
                          min={1}
                          max={Math.max(1, getTransferDataSource().length)}
                          value={randomUserCount}
                          onChange={setRandomUserCount}
                          style={{ width: '100%' }}
                          addonAfter="명"
                        />
                      </Col>
                    </Row>
                  </Form.Item>
                ) : (
                  <Form.Item label="전체 사용자 중 추출 비율 (%)">
                    <Row gutter={16}>
                      <Col span={16}>
                        <Slider
                          min={1}
                          max={100}
                          value={randomUserPercentage}
                          onChange={setRandomUserPercentage}
                        />
                      </Col>
                      <Col span={8}>
                        <InputNumber
                          min={1}
                          max={100}
                          value={randomUserPercentage}
                          onChange={setRandomUserPercentage}
                          style={{ width: '100%' }}
                          addonAfter="%"
                        />
                      </Col>
                    </Row>
                  </Form.Item>
                )}
                
                <Form.Item>
                  <Button 
                    type="primary" 
                    icon={<Shuffle size={16} />} 
                    onClick={handleRandomUserSelection}
                    disabled={getTransferDataSource().length === 0}
                  >
                    랜덤 추출하기
                  </Button>
                </Form.Item>
              </Form>
              
              {randomSelectedUsers.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <Alert
                    message={`${randomSelectedUsers.length}명의 사용자가 랜덤으로 선택되었습니다.`}
                    type="success"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  
                  <Table
                    dataSource={randomSelectedUsers}
                    rowKey="key"
                    size="small"
                    pagination={false}
                    columns={[
                      {
                        title: '이름',
                        dataIndex: 'name',
                        key: 'name',
                      },
                      {
                        title: '이메일',
                        dataIndex: 'email',
                        key: 'email',
                      },
                      {
                        title: '현재 그룹',
                        key: 'group',
                        render: (_, record) => {
                          const currentGroupName = record.group === DEFAULT_GROUP_VALUE
                            ? '기본 그룹'
                            : (groups.find(g => g.name === record.group)?.name || record.group);
                          return currentGroupName;
                        }
                      }
                    ]}
                  />
                </div>
              )}
            </div>
          )}
        </Modal>
    </div>
  );
};

export default CalorieAdminPage;