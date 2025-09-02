import { useState, useEffect, useRef } from "react";
import { Typography, Input, Row, Col, Button, Spin, List, Empty } from 'antd';
import Fuse from "fuse.js";
import { useParams, useNavigate } from "react-router-dom";
import { PlusOutlined, MinusCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { realtimeDb } from '../../firebaseconfig';
import { ref, set, onValue, get } from "firebase/database";
import { useSelector, useDispatch } from 'react-redux';
import { setFoods } from '../../redux/actions/foodActions';
import { auth } from '../../firebaseconfig';
import { searchFoodNutrition as fetchFoodNutrition } from '../../api/api';
import '../../styles/FoodList.css';

const { Text } = Typography;

// 관리자 접근 가능한 이메일 목록
const ADMIN_EMAILS = [
  'eodud653923@gmail.com',
  'youngwonhahn00@gmail.com',
  'juhyeok0123@gmail.com'
];

// 캐시 만료 시간 (30일을 밀리초로 변환)
const CACHE_EXPIRY_TIME = 30 * 24 * 60 * 60 * 1000; // 30일

const Meal = () => {
  const { mealType } = useParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredFood, setFilteredFood] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const navigate = useNavigate();
  const [foodSearchResults, setFoodSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const dispatch = useDispatch();
  const foods = useSelector((state) => state.food.foods);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showApiResults, setShowApiResults] = useState(false);
  const [showFloatingResults, setShowFloatingResults] = useState(false);

  // 검색 요청 중복 방지를 위한 ref
  const searchRequestRef = useRef(null);
  const lastSearchQueryRef = useRef('');

  useEffect(() => {
    const foodsRef = ref(realtimeDb, 'foods');
    const unsubscribe = onValue(foodsRef, (snapshot) => {
      const foodsData = snapshot.val();
      if (foodsData) {
        dispatch(setFoods(foodsData));
      }
    });

    // 관리자 권한 체크
    const checkAdminStatus = () => {
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.email) {
        setIsAdmin(ADMIN_EMAILS.includes(currentUser.email));
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
    const authUnsubscribe = auth.onAuthStateChanged(checkAdminStatus);

    return () => {
      unsubscribe();
      authUnsubscribe();
    };
  }, [dispatch]);

  // 기존 음식 목록 필터링 (로컬 검색)
  useEffect(() => {
    if (foods) {
      const fuse = new Fuse(Object.values(foods), {
        keys: ["name"],
        threshold: 0.3,
      });

      // 검색어가 있을 때만 결과 표시
      let result = searchTerm 
        ? fuse.search(searchTerm).map(item => item.item) 
        : [];

      // 검색어와 정확히 일치하는 항목을 찾아 맨 앞으로 정렬
      if (searchTerm) {
        result.sort((a, b) => {
          const aExactMatch = a.name.toLowerCase() === searchTerm.toLowerCase();
          const bExactMatch = b.name.toLowerCase() === searchTerm.toLowerCase();
          
          if (aExactMatch && !bExactMatch) return -1;
          if (!aExactMatch && bExactMatch) return 1;
          return 0;
        });
      }

      setFilteredFood(result);
    }
  }, [searchTerm, foods]);

  // API 검색을 위한 디바운싱 useEffect
  useEffect(() => {
    const trimmedSearchTerm = searchTerm.trim();
    
    // 검색어가 없으면 결과 초기화
    if (!trimmedSearchTerm) {
      setShowFloatingResults(false);
      setShowApiResults(false);
      setFoodSearchResults([]);
      setIsSearching(false);
      lastSearchQueryRef.current = ''; // 이 줄 추가
      return;
    }

    // 이전 검색과 동일한 검색어면 중복 요청 방지
    if (trimmedSearchTerm === lastSearchQueryRef.current) {
      return;
    }

    // 플로팅 결과 화면 표시
    setShowFloatingResults(true);
    
    // 이전 검색 요청이 있으면 취소
    if (searchRequestRef.current) {
      clearTimeout(searchRequestRef.current);
    }

    // 800ms 후에 검색 실행 (디바운싱)
    searchRequestRef.current = setTimeout(() => {
      performSearch(trimmedSearchTerm);
    }, 800);

    // cleanup 함수
    return () => {
      if (searchRequestRef.current) {
        clearTimeout(searchRequestRef.current);
      }
    };
  }, [searchTerm]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
  };

  const handleItemSelect = (item) => {
    if (selectedItems.includes(item)) {
      setSelectedItems(selectedItems.filter(selectedItem => selectedItem !== item));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleNextClick = () => {
    const type = mealType === 'snack' ? 'snacks' : mealType;
    const selectedItemNames = selectedItems.map(item => item.name).join(',');
    navigate(`/calories/calorieEntry?items=${selectedItemNames}&type=${type}`);
  };

  const getMealTitle = () => {
    switch (mealType) {
      case "breakfast":
        return "아침";
      case "lunch":
        return "점심";
      case "dinner":
        return "저녁";
      case "snack":
        return "간식";
      default:
        return "식사";
    }
  };

  // 캐시에서 검색 결과 조회
  const getCachedSearchResult = async (searchQuery) => {
    try {
      const cacheKey = searchQuery.toLowerCase().trim();
      const cacheRef = ref(realtimeDb, `searchCache/${cacheKey}`);
      const snapshot = await get(cacheRef);
      
      if (snapshot.exists()) {
        const cachedData = snapshot.val();
        const now = Date.now();
        const cacheTime = new Date(cachedData.timestamp).getTime();
        
        // 캐시가 30일 이내인지 확인
        if (now - cacheTime < CACHE_EXPIRY_TIME) {
          // console.log('캐시된 검색 결과 사용:', searchQuery);
          return cachedData.results;
        } else {
          // console.log('캐시 만료, 새로운 검색 실행:', searchQuery);
          return null;
        }
      }
      return null;
    } catch (error) {
      // console.error('캐시 조회 실패:', error);
      return null;
    }
  };

  // 검색 결과를 캐시에 저장
  const saveCachedSearchResult = async (searchQuery, results) => {
    try {
      const cacheKey = searchQuery.toLowerCase().trim();
      const cacheRef = ref(realtimeDb, `searchCache/${cacheKey}`);
      
      const cacheData = {
        query: searchQuery,
        results: results,
        timestamp: new Date().toISOString()
      };
      
      await set(cacheRef, cacheData);
      // console.log('검색 결과 캐시 저장 완료:', searchQuery);
    } catch (error) {
      // console.error('캐시 저장 실패:', error);
    }
  };

  // 실제 검색 수행 함수
  const performSearch = async (searchQuery) => {
    // 중복 검색 방지 (하지만 검색어가 비어있었다가 다시 입력된 경우는 허용)
    if (searchQuery === lastSearchQueryRef.current && lastSearchQueryRef.current !== '') {
      return;
    }
    
    lastSearchQueryRef.current = searchQuery;
    setIsSearching(true);
    setFoodSearchResults([]);
    setShowApiResults(false);
    
    try {
      // 1단계: 캐시에서 검색 결과 확인
      const cachedResults = await getCachedSearchResult(searchQuery);
      
      if (cachedResults && cachedResults.length > 0) {
        // 캐시된 결과가 있으면 사용
        setFoodSearchResults(cachedResults);
        setShowApiResults(true);
        // console.log('캐시된 검색 결과 사용됨');
      } else {
        // 2단계: 캐시된 결과가 없거나 만료된 경우 API 호출
        // console.log('API 검색 실행:', searchQuery);
        const result = await fetchFoodNutrition(searchQuery);
        
        if (result && result.items && result.items.length > 0) {
          // API 응답 형식에 맞게 데이터 변환
          const formattedResults = result.items.map(item => ({
            name: item.name,
            brand: item.brand,
            serving: item.serving,
            weight: item.weight,
            unit: `${item.serving} (${item.weight})`,
            calories: parseFloat(item.calories),
            carbs: parseFloat(item.carbs),
            protein: parseFloat(item.protein),
            fat: parseFloat(item.fat)
          }));
          
          setFoodSearchResults(formattedResults);
          setShowApiResults(true);
          
          // 검색 결과를 캐시에 저장
          await saveCachedSearchResult(searchQuery, formattedResults);
        } else {
          setShowApiResults(false);
        }
      }
    } catch (error) {
      console.error('음식 검색 실패:', error);
      setShowApiResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  // 검색 버튼 클릭 시 즉시 검색 실행
  const handleSearchButtonClick = (value) => {
    const trimmedValue = value.trim();
    if (trimmedValue && trimmedValue !== lastSearchQueryRef.current) {
      // 기존 타이머 취소
      if (searchRequestRef.current) {
        clearTimeout(searchRequestRef.current);
      }
      // 즉시 검색 실행
      performSearch(trimmedValue);
    }
  };

  // 선택된 음식 제거 함수
  const handleRemoveSelectedItem = (itemToRemove) => {
    setSelectedItems(selectedItems.filter(item => item !== itemToRemove));
  };

  // Firebase에 음식 저장하는 공통 함수
  const saveFoodToFirebase = async (foodData) => {
    try {
      const userEmail = auth.currentUser?.email || 'default';
      const sanitizedEmail = userEmail.replace(/[^a-zA-Z0-9]/g, '_');
      
      // 현재 시간을 yyyy-mm-dd-hh-mm-ss 형식으로 포맷팅 (생성 시간 기록용)
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hour = String(now.getHours()).padStart(2, '0');
      const minute = String(now.getMinutes()).padStart(2, '0');
      const second = String(now.getSeconds()).padStart(2, '0');
      const timestamp = `${year}-${month}-${day}-${hour}-${minute}-${second}`;
      
      // 음식 이름만으로 foodKey 생성 (같은 음식은 덮어쓰기)
      const foodKey = foodData.name.replace(/[^a-zA-Z0-9가-힣]/g, '_');
      
      const foodsRef = ref(realtimeDb, `foods/${foodKey}`);
      
      const dataToSave = {
        ...foodData,
        createdAt: timestamp
      };
      
      await set(foodsRef, dataToSave);
      
      // 새로 추가된 음식 객체 생성
      const newAddedFood = {
        ...dataToSave,
        id: foodKey
      };
      
      return newAddedFood;
    } catch (error) {
      console.error('음식 저장 실패:', error);
      throw error;
    }
  };

  // API 검색 결과에서 음식 선택 처리
  const handleApiResultSelect = async (foodInfo) => {
    try {
      // API 결과를 Firebase 저장 형식으로 변환
      const foodData = {
        name: foodInfo.name,
        calories: foodInfo.calories,
        nutrients: {
          carbs: foodInfo.carbs,
          protein: foodInfo.protein,
          fat: foodInfo.fat
        },
        weight: foodInfo.weight,
        brand: foodInfo.brand || null,
        serving: foodInfo.serving || null
      };
      
      // Firebase에 저장
      const newAddedFood = await saveFoodToFirebase(foodData);
      
      // 새로 추가된 음식을 선택된 항목에 추가
      setSelectedItems([...selectedItems, newAddedFood]);
      
      // Redux store 업데이트
      if (foods) {
        const updatedFoods = { ...foods, [newAddedFood.id]: newAddedFood };
        dispatch(setFoods(updatedFoods));
      }
      
      // 검색 결과 숨기기 및 검색어 초기화
      setShowApiResults(false);
      setShowFloatingResults(false);
      setSearchTerm(''); // 검색어 자동 초기화
    } catch (error) {
      console.error('음식 추가 실패:', error);
      alert('음식 추가에 실패했습니다.');
    }
  };

  return (
    <div style={{ padding: '20px', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 15 }}>
        <Text style={{ fontSize: '24px', fontWeight: '800', color: '#5FDD9D', letterSpacing: '1px', fontFamily: 'Pretendard-800'}}>
          {getMealTitle()} 식사목록
        </Text>
        
        <Button 
          type="primary" 
          onClick={handleNextClick} 
          disabled={selectedItems.length === 0} 
          style={{ 
            fontFamily: 'Pretendard-700', 
            height: '40px', 
            borderRadius: '8px',
            background: selectedItems.length > 0 ? '#5FDD9D' : undefined,
            boxShadow: selectedItems.length > 0 ? '0 2px 6px rgba(95, 221, 157, 0.4)' : undefined
          }}
        >
          {selectedItems.length > 0 ? `${selectedItems.length}개 선택 완료` : '음식을 선택해주세요'}
        </Button>
      </Row>
      
      <Row gutter={[16, 24]} align="middle" style={{ marginBottom: 5 }}>
        <Col span={24}>
          <div style={{ position: 'relative' }}>
            <Input
              placeholder="먹은 음식을 검색해보세요"
              value={searchTerm}
              size="large"
              onChange={handleSearchChange}
              onPressEnter={(e) => handleSearchButtonClick(e.target.value)}
              style={{ 
                width: '100%', 
                height: '56px',
                borderRadius: '16px',
                border: '2px solid #f0f0f0',
                fontSize: '16px',
                paddingLeft: '55px',
                paddingRight: '20px',
                paddingBottom: '7px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                transition: 'all 0.3s ease',
                background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)'
              }}
              className="modern-search-input"
              suffix={
                <Button
                  type="text"
                  icon={<SearchOutlined style={{ fontSize: '20px', color: '#5FDD9D' }} />}
                  onClick={() => handleSearchButtonClick(searchTerm)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    height: '44px',
                    width: '44px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end'
                  }}
                />
              }
            />
            <div style={{
              position: 'absolute',
              left: '18px',
              top: '48%',
              transform: 'translateY(-50%)',
              fontSize: '20px',
              pointerEvents: 'none'
            }}>
              🍽️
            </div>
          </div>
        </Col>
      </Row>
      
      {/* 플로팅 검색 결과 화면 */}
      {showFloatingResults && (searchTerm || isSearching || (showApiResults && foodSearchResults.length > 0)) && (
        <div style={{
          position: 'absolute',
          top: '130px',
          left: '20px',
          right: '20px',
          backgroundColor: 'white',
          borderRadius: '16px',
          border: '1px solid #f0f0f0',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
          zIndex: 1000,
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {/* API 검색 결과 표시 영역 */}
          {isSearching && (
            <div style={{ textAlign: 'center', padding: '30px' }}>
              <Spin size="large" />
              <Text style={{ display: 'block', marginTop: '15px', color: '#666', fontSize: '16px' }}>
                '{searchTerm}' 검색 중...
              </Text>
            </div>
          )}
          
          {showApiResults && foodSearchResults.length > 0 && (
            <div style={{ padding: '15px' }}>
              <div style={{ padding: '5px 10px', marginBottom: '15px' }}>
                <Text style={{ fontSize: '18px', fontWeight: '600', color: '#333' }}>
                  '{searchTerm}' 검색 결과
                </Text>
              </div>
              
              <List
                dataSource={foodSearchResults}
                renderItem={(item) => (
                  <List.Item 
                    onClick={() => handleApiResultSelect(item)}
                    style={{ 
                      padding: '15px', 
                      cursor: 'pointer',
                      borderRadius: '12px',
                      marginBottom: '8px',
                      backgroundColor: '#f9f9f9',
                      border: '1px solid #f0f0f0',
                      transition: 'all 0.2s ease'
                    }}
                    className="hover:bg-gray-50 hover:shadow-md"
                  >
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: '16px', fontWeight: '600' }}>{item.name}</Text>
                        <Button 
                          type="text" 
                          icon={<PlusOutlined />} 
                          style={{ 
                            color: '#5FDD9D',
                            backgroundColor: 'rgba(95, 221, 157, 0.1)',
                            borderRadius: '8px',
                            width: '32px',
                            height: '32px'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApiResultSelect(item);
                          }}
                        />
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                        {item.brand && <span style={{ marginRight: '8px' }}>{item.brand}</span>}
                        <span>{item.unit}</span>
                      </div>
                      {isAdmin && (
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                          칼로리: {item.calories}kcal | 탄수화물: {item.carbs}g | 단백질: {item.protein}g | 지방: {item.fat}g
                        </div>
                      )}
                    </div>
                  </List.Item>
                )}
              />
            </div>
          )}
         
        </div>
      )}
      
      {/* 빈 상태 안내 UI */}
      {selectedItems.length === 0 && !searchTerm && !showFloatingResults && (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '40px'
        }}>
          <Empty
            image={<div style={{ fontSize: '64px', marginBottom: '20px' }}>🍽️</div>}
            description={
              <div style={{ textAlign: 'center' }}>
                <Text style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#666',
                  display: 'block',
                  marginBottom: '8px'
                }}>
                  음식을 검색해보세요
                </Text>
                <Text style={{ 
                  fontSize: '14px', 
                  color: '#999',
                  lineHeight: '1.5'
                }}>
                  위 검색창에서 드신 음식을 검색하고<br/>
                  선택하여 칼로리를 기록해보세요
                </Text>
              </div>
            }
          />
        </div>
      )}
      
      {/* 선택된 음식들 리스트 */}
      {selectedItems.length > 0 && (
        <div style={{
          marginTop: '10px',
          marginBottom: '15px',
          backgroundColor: 'white',
          borderRadius: '16px',
          border: '1px solid #f0f0f0',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
        }}>
          <div style={{ marginBottom: '15px' }}>
            <Text style={{ fontSize: '18px', fontWeight: '600', color: '#333' }}>
              선택된 음식 ({selectedItems.length}개)
            </Text>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {selectedItems.map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '15px 20px',
                  backgroundColor: 'linear-gradient(135deg, #f0fff7 0%, #f6fffa 100%)',
                  borderRadius: '12px',
                  border: '1px solid #e6f7ff',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ flex: 1 }}>
                  <Text style={{ 
                    fontSize: '16px', 
                    fontWeight: '600',
                    color: '#5FDD9D',
                    fontFamily: 'Pretendard-600'
                  }}>
                    {item.name}
                  </Text>
                  {item.weight && (
                    <Text style={{ 
                      fontSize: '14px', 
                      color: '#888',
                      marginLeft: '8px',
                      fontFamily: 'Pretendard-400'
                    }}>
                      ({item.weight})
                    </Text>
                  )}
                </div>
                <Button
                  type="text"
                  icon={<MinusCircleOutlined />}
                  style={{ 
                    color: '#ff4d4f',
                    backgroundColor: 'rgba(255, 77, 79, 0.1)',
                    borderRadius: '8px',
                    width: '32px',
                    height: '32px'
                  }}
                  onClick={() => handleRemoveSelectedItem(item)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Meal;