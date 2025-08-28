import React, { useState, useEffect, useCallback } from "react";
import { Typography, Input, Row, Col, Button, Modal, Form, Table, InputNumber, message, Select, Card, Tabs, Tag, Space, Tooltip, Divider, Switch, ColorPicker, Transfer, Skeleton, Empty, DatePicker, Slider, Radio, Popover, Steps, Alert, Progress } from 'antd';
import { db, auth } from '../../firebaseconfig';
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, query, where, addDoc, deleteDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import { useNavigate } from "react-router-dom";
import { useMediaQuery } from 'react-responsive';
import { SyncOutlined, ExclamationCircleOutlined, UserOutlined, TeamOutlined, EditOutlined, SaveOutlined, UndoOutlined, PlusOutlined, DeleteOutlined, UserAddOutlined, CalendarOutlined, CoffeeOutlined, InfoCircleOutlined, QuestionCircleOutlined, DownloadOutlined, DatabaseOutlined } from '@ant-design/icons';
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
const { RangePicker } = DatePicker;
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
    getAppliedDeviation
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

  // 데이터 반출 관련 상태
  const [exportLoading, setExportLoading] = useState(false);
  const [exportDateRange, setExportDateRange] = useState([dayjs().subtract(7, 'day'), dayjs()]);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportTotal, setExportTotal] = useState(0);
  const [exportBatchSize, setExportBatchSize] = useState(10);
  const [exportDelay, setExportDelay] = useState(100);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

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
        let userGroupValue = userData.group === undefined ? DEFAULT_GROUP_VALUE : userData.group;

        const isValidGroup = userGroupValue === DEFAULT_GROUP_VALUE || loadedGroups.some(g => g.name === userGroupValue && !g.isDefault);

        if (!isValidGroup) {
            userGroupValue = DEFAULT_GROUP_VALUE;
            try {
              await updateDoc(doc(db, 'users', userDoc.id), { group: DEFAULT_GROUP_VALUE });
            } catch (updateError) {
              console.error(`사용자 ${userDoc.id} 그룹 기본값 업데이트 실패:`, updateError);
            }
        }

        const calorieBias = userData.calorieBias !== undefined ? userData.calorieBias : 0;

        // 선택된 날짜의 food 문서 가져오기
        let foodDocForSelectedDate = null;
        try {
          const foodDocRef = doc(db, `users/${userDoc.id}/foods`, dateString);
          const foodDocSnap = await getDoc(foodDocRef);
          if (foodDocSnap.exists()) {
            foodDocForSelectedDate = foodDocSnap.data();
          }
        } catch (error) {
          console.error(`사용자 ${userDoc.id}의 ${dateString} 음식 문서 로딩 실패:`, error);
        }

        return {
          key: userDoc.id,
          email: userData.email || '-',
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
          deviationMultiplier: values.deviationMultiplier || 0.2, // 기본값 20%
          defaultDeviation: values.defaultDeviation || 0, // 기본값 0
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
          content: `정말로 '${group.name}' 그룹을 삭제하시겠습니까? 소속된 사용자들은 '기본 그룹'으로 이동됩니다.`,
          okText: '삭제',
          okType: 'danger',
          cancelText: '취소',
          onOk: async () => {
              try {
                  setLoadingGroups(true);
                  const usersInGroupQuery = query(collection(db, 'users'), where('group', '==', group.name));
                  const usersSnapshot = await getDocs(usersInGroupQuery);

                  const batch = writeBatch(db);
                  usersSnapshot.forEach(userDoc => {
                      const userRef = doc(db, 'users', userDoc.id);
                      batch.update(userRef, { group: DEFAULT_GROUP_VALUE });
                  });
                  await batch.commit();

                  // users 서브컬렉션의 모든 문서 삭제
                  const groupUsersQuery = query(collection(db, 'calorieGroups', group.id, 'users'));
                  const groupUsersSnapshot = await getDocs(groupUsersQuery);
                  const usersBatch = writeBatch(db);
                  groupUsersSnapshot.forEach(userDoc => {
                      usersBatch.delete(userDoc.ref);
                  });
                  await usersBatch.commit();

                  // 그룹 문서 삭제
                  const groupRef = doc(db, 'calorieGroups', group.id);
                  await deleteDoc(groupRef);
                  message.success(`'${group.name}' 그룹이 삭제되었습니다.`);
                  await loadData();
              } catch (error) {
                  console.error('그룹 삭제 실패:', error);
                  message.error('그룹 삭제에 실패했습니다.');
              } finally { setLoadingGroups(false); }
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
      const userRef = doc(db, 'users', currentUser.key);
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
            const oldGroupUserRef = doc(db, 'calorieGroups', oldGroup.id, 'users', currentUser.key);
            batch.delete(oldGroupUserRef);
          }
        }
        
        // 새 그룹에 사용자 추가 (기본 그룹이 아닌 경우)
        if (values.group !== DEFAULT_GROUP_VALUE) {
          const newGroup = groups.find(g => g.name === values.group);
          if (newGroup && !newGroup.isDefault) {
            const newGroupUserRef = doc(db, 'calorieGroups', newGroup.id, 'users', currentUser.key);
            batch.set(newGroupUserRef, {
              uid: currentUser.key,
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
      console.error('사용자 설정 업데이트 실패:', error);
      message.error('사용자 설정 업데이트에 실패했습니다.');
    }
  };

  // 사용자 추가 모달
  const handleOpenAddUserModal = (group) => {
    setTargetGroupForAddingUser(group);
    setTargetKeysForTransfer([]);
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
      
      targetKeysForTransfer.forEach(userKey => {
        const userRef = doc(db, 'users', userKey);
        batch.update(userRef, { group: targetGroupValue });
        
        // calorieGroups/{그룹ID}/users/ 컬렉션에 사용자 UID 저장
        if (!targetGroupForAddingUser.isDefault) {
          const groupUserRef = doc(db, 'calorieGroups', targetGroupForAddingUser.id, 'users', userKey);
          batch.set(groupUserRef, {
            uid: userKey,
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

  // Transfer 데이터 소스 준비 (모든 사용자 중 현재 그룹 제외)
  const getTransferDataSource = () => {
    if (!targetGroupForAddingUser) return [];
    return users
      .filter(user => {
           if (targetGroupForAddingUser.isDefault) {
               return user.group !== DEFAULT_GROUP_VALUE;
           } else {
               return user.group !== targetGroupForAddingUser.name;
           }
      })
      .map(user => {
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

  // 사용자를 그룹에 추가하는 로직
  const handleAddUsersToGroup = async () => {
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
        
        targetKeysForTransfer.forEach(userKey => {
            const userRef = doc(db, 'users', userKey);
            batch.update(userRef, { group: targetGroupValue });
            
            // calorieGroups/{그룹ID}/users/ 컬렉션에 사용자 UID 저장
            if (!targetGroupForAddingUser.isDefault) {
              const groupUserRef = doc(db, 'calorieGroups', targetGroupForAddingUser.id, 'users', userKey);
              batch.set(groupUserRef, {
                uid: userKey,
                addedAt: new Date(),
                addedBy: 'admin'
              });
            }
        });
        
        await batch.commit();
        message.success(`${targetKeysForTransfer.length}명의 사용자가 '${targetGroupForAddingUser.name}' 그룹에 추가되었습니다.`);
        setIsAddUserModalVisible(false);
        setTargetGroupForAddingUser(null);
        await loadData();
    } catch (error) {
        console.error('그룹에 사용자 추가 실패:', error);
        message.error('그룹에 사용자를 추가하는 중 오류가 발생했습니다.');
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
                             수동 선택
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
      render: (groupValue) => {
        if (groupValue === DEFAULT_GROUP_VALUE) {
          const defaultGroup = groups.find(g => g.id === DEFAULT_GROUP_ID);
          return <Tag color={defaultGroup?.color || '#8c8c8c'}>{defaultGroup?.name || '기본 그룹'}</Tag>;
        } else {
          const group = groups.find(g => g.name === groupValue);
          return <Tag color={group?.color || 'default'}>{group?.name || groupValue}</Tag>;
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
      title: `${selectedDate.format('MM/DD')} ${mealTypeKoreanMap[selectedMealType] || selectedMealType} 정보`,
      key: 'selectedMeal',
      width: 180,
      render: (_, record) => {
        const foodData = record.foodDocForSelectedDate;
        const mealData = foodData ? foodData[selectedMealType] : null;
        
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
        
        if (!mealData || estimatedCalories === null || actualCalories === null) {
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
          if (r.group === DEFAULT_GROUP_VALUE) {
              const defaultGroup = groups.find(g => g.id === DEFAULT_GROUP_ID);
              groupName = defaultGroup?.name || '기본 그룹';
              groupColor = defaultGroup?.color || '#8c8c8c';
          } else {
              const group = groups.find(g => g.name === r.group);
              groupName = group?.name || r.group;
              groupColor = group?.color || 'default';
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
                        
                        if (mealData && estimatedCalories !== null && actualCalories !== null) {
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
  const handleApplyUserDeviation = async (userId) => {
    if (!selectedDate || !selectedMealType) {
        message.error('편차를 적용할 날짜와 식사 유형을 선택하세요.');
        return;
    }
    try {
      setLoadingUsers(true);
      const userInfo = users.find(u => u.key === userId);
      if (!userInfo) { 
        message.error("사용자 정보를 찾을 수 없습니다."); 
        return; 
      }
      
      const dateString = selectedDate.format('YYYY-MM-DD');
      const personalBias = userInfo.calorieBias || 0;
      
      // 사용자의 해당 날짜 음식 문서 가져오기
      const foodDocRef = doc(db, `users/${userId}/foods`, dateString);
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
      
      // 사용자의 그룹 설정 가져오기
      const userGroupId = userInfo.group;
      let groupSettings = null;
      let groupDeviationConfig = null;
      
      if (userGroupId !== DEFAULT_GROUP_VALUE) {
        const userGroup = groups.find(g => g.name === userGroupId);
        if (userGroup) {
          groupSettings = {
            applicableDate: new Date(),
            defaultDeviation: userGroup.defaultDeviation || 0,
            deviationMultiplier: userGroup.deviationMultiplier || 0.2,
            groupId: userGroup.id
          };
          
          groupDeviationConfig = {
            appliedAt: new Date().toISOString(),
            appliedBy: "admin",
            defaultDeviation: userGroup.defaultDeviation || 0,
            deviationMultiplier: userGroup.deviationMultiplier || 0.2,
            groupId: userGroup.id
          };
        }
      }
      
      // 편차 계산 (기존 데이터 구조 유지)
      let appliedDeviation = personalBias;
      
      if (estimatedCalories && actualCalories) {
        let difference = actualCalories - estimatedCalories;
        
        // 그룹 설정이 있는 경우 그룹 편차 계산 적용
        if (groupSettings) {
          const { deviationMultiplier = 0.2, defaultDeviation = 0 } = groupSettings;
          
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
      
      // 그룹 설정 가져오기
       let groupSettings = null;
       let groupDeviationConfig = null;
       if (groupKeyOrId !== DEFAULT_GROUP_VALUE) {
         const targetGroup = groups.find(g => g.name === groupKeyOrId);
         if (targetGroup) {
           groupSettings = {
             applicableDate: new Date(),
             defaultDeviation: targetGroup.defaultDeviation || 0,
             deviationMultiplier: targetGroup.deviationMultiplier || 0.2,
             groupId: targetGroup.id
           };
           
           groupDeviationConfig = {
             appliedAt: new Date().toISOString(),
             appliedBy: "admin",
             defaultDeviation: targetGroup.defaultDeviation || 0,
             deviationMultiplier: targetGroup.deviationMultiplier || 0.2,
             groupId: targetGroup.id
           };
         }
       }
      
      let successCount = 0;
      let errorCount = 0;
      
      // 각 사용자에 대해 편차 적용
      for (const user of targetUsers) {
        try {
          const userId = user.key;
          const personalBias = user.calorieBias || 0;
          
          // 사용자의 해당 날짜 음식 문서 가져오기
          const foodDocRef = doc(db, `users/${userId}/foods`, dateString);
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
              const { deviationMultiplier = 0.2, defaultDeviation = 0 } = groupSettings;
              
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

  // 데이터 반출 함수 (Cloud Function 사용)
  const handleExportData = async () => {
    if (!exportDateRange || exportDateRange.length !== 2) {
      message.error('날짜 범위를 선택해주세요.');
      return;
    }

    setExportLoading(true);
    setExportProgress(0);
    setExportTotal(100); // Cloud Function 진행률은 단계별로 표시

    try {
      const startDate = exportDateRange[0].format('YYYY-MM-DD');
      const endDate = exportDateRange[1].format('YYYY-MM-DD');
      
      // Firebase Auth에서 현재 사용자의 ID 토큰 가져오기
      const user = auth.currentUser;
      if (!user) {
        throw new Error('인증되지 않은 사용자입니다.');
      }
      
      const idToken = await user.getIdToken();
      
      setExportProgress(20); // 인증 완료
      
      // Cloud Function 호출
      const functionUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:5001/calorie-sync-dev/us-central1/exportUserData'
        : 'https://us-central1-calorie-sync-dev.cloudfunctions.net/exportUserData';
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          startDate,
          endDate,
          batchSize: exportBatchSize,
          delay: exportDelay
        })
      });
      
      setExportProgress(60); // 요청 전송 완료
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: 서버 오류`);
      }
      
      const result = await response.json();
      
      setExportProgress(80); // 응답 수신 완료
      
      if (!result.success) {
        throw new Error(result.error || '데이터 반출에 실패했습니다.');
      }
      
      // 다운로드 URL로 파일 다운로드
      const downloadLink = document.createElement('a');
      downloadLink.href = result.downloadUrl;
      downloadLink.download = `calorie_data_${startDate}_to_${endDate}.csv`;
      downloadLink.style.visibility = 'hidden';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      setExportProgress(100); // 다운로드 완료
      
      message.success(`데이터 반출이 완료되었습니다. (총 ${result.recordCount}개 레코드, 처리 시간: ${result.processingTime}초)`);
      
    } catch (error) {
      console.error('데이터 반출 실패:', error);
      message.error(`데이터 반출에 실패했습니다: ${error.message}`);
    } finally {
      setExportLoading(false);
      setExportProgress(0);
      setExportTotal(0);
    }
  };

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

        <TabPane tab={<span><DatabaseOutlined /> 데이터 반출</span>} key="export">
          <Row justify="space-between" align="middle" style={{ marginBottom: 16, padding: isMobile ? '0 8px' : 0 }}>
            <Space>
              <Text style={{ fontSize: isMobile ? '14px' : '16px' }}>전체 사용자 식사 데이터 반출</Text>
              <Tooltip title="선택한 날짜 범위의 모든 사용자 식사 데이터를 CSV 파일로 다운로드할 수 있습니다. UID, 식사 날짜, Treatment 적용 여부, 식사 내용, 실제/예측 칼로리, 오차 정보가 포함됩니다.">
                <InfoCircleOutlined style={{ color: '#1677ff' }} />
              </Tooltip>
            </Space>
          </Row>
          
          <Card style={{ marginBottom: 16 }}>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} md={12}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>날짜 범위 선택</Text>
                  <RangePicker
                    value={exportDateRange}
                    onChange={(dates) => setExportDateRange(dates)}
                    style={{ width: '100%' }}
                    size={isMobile ? 'small' : 'middle'}
                    placeholder={['시작 날짜', '종료 날짜']}
                    allowClear={false}
                  />
                </Space>
              </Col>
              <Col xs={24} md={12}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>반출 실행</Text>
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={handleExportData}
                    loading={exportLoading}
                    disabled={!exportDateRange || exportDateRange.length !== 2}
                    size={isMobile ? 'small' : 'middle'}
                    block={isMobile}
                  >
                    CSV 파일 다운로드
                  </Button>
                </Space>
              </Col>
            </Row>
            
            <Divider style={{ margin: '16px 0' }} />
            
            <Row justify="space-between" align="middle">
              <Col>
                <Text strong>고급 설정</Text>
              </Col>
              <Col>
                <Button
                  type="link"
                  size="small"
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                >
                  {showAdvancedSettings ? '숨기기' : '보기'}
                </Button>
              </Col>
            </Row>
            
            {showAdvancedSettings && (
              <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} md={12}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text>배치 크기 (동시 처리 사용자 수)</Text>
                    <Tooltip title="한 번에 처리할 사용자 수입니다. 값이 클수록 빠르지만 서버 부담이 증가합니다.">
                      <InputNumber
                        min={1}
                        max={50}
                        value={exportBatchSize}
                        onChange={setExportBatchSize}
                        style={{ width: '100%' }}
                        addonAfter="명"
                      />
                    </Tooltip>
                  </Space>
                </Col>
                <Col xs={24} md={12}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text>배치 간 지연 시간</Text>
                    <Tooltip title="배치 처리 간 대기 시간입니다. 값이 클수록 서버 부담이 줄어들지만 처리 시간이 증가합니다.">
                      <InputNumber
                        min={0}
                        max={1000}
                        step={50}
                        value={exportDelay}
                        onChange={setExportDelay}
                        style={{ width: '100%' }}
                        addonAfter="ms"
                      />
                    </Tooltip>
                  </Space>
                </Col>
              </Row>
            )}
            
            {exportLoading && (
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">데이터 처리 중...</Text>
                <Progress
                  percent={exportTotal > 0 ? Math.round((exportProgress / exportTotal) * 100) : 0}
                  status="active"
                  format={() => `${exportProgress}/${exportTotal} 사용자 처리됨`}
                  style={{ marginTop: 8 }}
                />
              </div>
            )}
          </Card>
          
          <Alert
            message="데이터 반출 안내"
            description={
              <div>
                <p><strong>포함 데이터:</strong></p>
                <ul style={{ marginBottom: 8, paddingLeft: 20 }}>
                  <li>UID: 사용자 고유 식별자</li>
                  <li>식사 Date: 날짜 및 식사 시간 (아침/점심/저녁/간식)</li>
                  <li>Treatment: 칼로리 편차 그룹 적용 여부 (TRUE/FALSE)</li>
                  <li>식사내용: 섭취한 음식 목록 및 칼로리</li>
                  <li>실제칼로리: 사용자가 입력한 실제 칼로리</li>
                  <li>예측칼로리: 시스템이 예측한 칼로리</li>
                  <li>오차(원본): 실제 - 예측 칼로리</li>
                  <li>오차(Treatment 적용): Treatment 적용 후 조정된 오차</li>
                </ul>
                <p><strong>Cloud Function 최적화:</strong></p>
                 <ul style={{ marginBottom: 8, paddingLeft: 20 }}>
                   <li>서버 사이드 처리: Firebase Cloud Functions에서 데이터 처리 및 CSV 생성</li>
                   <li>배치 처리: {exportBatchSize}명씩 묶어서 병렬 처리로 성능 최적화</li>
                   <li>요청 간격: 배치 간 {exportDelay}ms 지연으로 Firestore 부담 완화</li>
                   <li>Firebase Storage: 생성된 CSV 파일을 안전하게 저장 및 다운로드</li>
                   <li>동적 설정: 고급 설정에서 배치 크기와 지연 시간 조정 가능</li>
                 </ul>
                <p><strong>장점:</strong> 클라이언트 부담 없이 서버에서 효율적으로 대용량 데이터를 처리하며, 확장성과 안정성이 크게 향상되었습니다.</p>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          <Alert
            message="Cloud Function 기반 처리"
            description="Firebase Cloud Functions를 사용하여 서버 사이드에서 데이터를 처리합니다. 클라이언트 부담 없이 대용량 데이터도 안정적으로 처리되며, 자동 확장과 최적화된 성능을 제공합니다."
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
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
             deviationMultiplier: editingGroup.deviationMultiplier || 0.2,
             defaultDeviation: editingGroup.defaultDeviation || 0,

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

       <Modal title={<Text style={{ fontSize: '16px', fontWeight: '600' }}>'{targetGroupForAddingUser?.name}' 그룹 사용자 추가</Text>} open={isAddUserModalVisible} onCancel={() => setIsAddUserModalVisible(false)} onOk={handleAddUsersToGroup} okText="추가" cancelText="취소" width={isMobile ? '95%' : 680} destroyOnClose bodyStyle={{ height: isMobile ? '50vh' : 350, overflowY: 'auto' }}>
            {targetGroupForAddingUser && ( <Transfer dataSource={getTransferDataSource()} showSearch filterOption={(i, o) => o.title.toLowerCase().includes(i.toLowerCase())} targetKeys={targetKeysForTransfer} onChange={handleTransferChange} render={item => item.title} listStyle={{ width: isMobile ? '45%' : 280, height: isMobile ? 280 : 300 }} titles={['전체', '추가']} locale={{ itemUnit: '명', itemsUnit: '명', searchPlaceholder: '검색' }}/> )}
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