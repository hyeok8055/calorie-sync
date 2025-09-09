import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Select, Space, Typography, Spin, message, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { collection, collectionGroup, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebaseconfig';
import { useSelector } from 'react-redux';

const { Title, Text } = Typography;
const { Option } = Select;

// 관리자 접근 가능한 이메일 목록
const ADMIN_EMAILS = [
  'eodud653923@gmail.com',
  'youngwonhahn00@gmail.com',
  'juhyeok0123@gmail.com',
  'wn990123@gmail.com',
  'garcia29845@gmail.com',
  'yunj29845@gmail.com',
];

const SurveyResultsPage = () => {
  const navigate = useNavigate();
  const userEmail = useSelector((state) => state.auth.user?.email);
  const [surveys, setSurveys] = useState([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentSurvey, setCurrentSurvey] = useState(null);

  // 관리자 권한 확인
  const isAdmin = ADMIN_EMAILS.includes(userEmail);

  useEffect(() => {
    if (!isAdmin) {
      message.error('관리자 권한이 필요합니다.');
      navigate('/');
      return;
    }

    fetchSurveys();
  }, [isAdmin, navigate]);

  // 모든 설문조사 목록 가져오기
  const fetchSurveys = async () => {
    try {
      setLoading(true);

      // Fetch all responses across surveys to build counts per surveyId (single scan)
      const responsesGroupSnapshot = await getDocs(collectionGroup(db, 'responses'));
      const countsMap = new Map();
      for (const respDoc of responsesGroupSnapshot.docs) {
        const surveyDocRef = respDoc.ref.parent?.parent;
        if (!surveyDocRef) continue;
        const surveyId = surveyDocRef.id;
        countsMap.set(surveyId, (countsMap.get(surveyId) || 0) + 1);
      }

      // Fetch existing survey documents (these may include surveys with zero responses)
      const surveysSnapshot = await getDocs(collection(db, 'surveys'));
      const surveysData = [];

      // Add surveys that have documents (use metadata + counts)
      for (const surveyDoc of surveysSnapshot.docs) {
        const surveyId = surveyDoc.id;
        const surveyMeta = surveyDoc.data() || {};
        const responseCount = countsMap.get(surveyId) || 0;
        surveysData.push({ id: surveyId, ...surveyMeta, responseCount });
        countsMap.delete(surveyId);
      }

      // For any remaining surveyIds that had responses but no survey doc, create entries.
      if (countsMap.size > 0) {
        const remainingIds = Array.from(countsMap.keys());
        // Batch fetch metadata for remaining ids in parallel
        const metaPromises = remainingIds.map(id => getDoc(doc(db, 'surveys', id)).then(d => ({ id, data: d.exists() ? d.data() : null })));
        const metas = await Promise.all(metaPromises);
        for (const m of metas) {
          surveysData.push({ id: m.id, ...(m.data || {}), responseCount: countsMap.get(m.id) || 0 });
        }
      }

      // Sort by response count desc
      surveysData.sort((a, b) => (b.responseCount || 0) - (a.responseCount || 0));

      setSurveys(surveysData);

      // Select first available
      if (surveysData.length > 0) {
        setSelectedSurveyId(surveysData[0].id);
        setCurrentSurvey(surveysData[0]);
        // load responses for the first survey (don't await to keep UI responsive)
        fetchResponses(surveysData[0].id);
      }
    } catch (error) {
      console.error('설문조사 목록 조회 실패:', error);
      message.error('설문조사 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 선택된 설문조사의 응답들 가져오기
  const fetchResponses = async (surveyId) => {
    try {
      setLoading(true);
      const responsesRef = collection(db, 'surveys', surveyId, 'responses');
      const responsesQuery = query(responsesRef, orderBy('submittedAt', 'desc'));
      const responsesSnapshot = await getDocs(responsesQuery);

      const responsesData = responsesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setResponses(responsesData);
    } catch (error) {
      console.error('응답 조회 실패:', error);
      message.error('응답을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 설문조사 선택 변경
  const handleSurveyChange = (surveyId) => {
    setSelectedSurveyId(surveyId);
    const selected = surveys.find(s => s.id === surveyId);
    setCurrentSurvey(selected);
    fetchResponses(surveyId);
  };

  // 응답 데이터 내보내기 (CSV)
  const exportToCSV = () => {
    if (responses.length === 0) {
      message.warning('내보낼 데이터가 없습니다.');
      return;
    }

    const headers = [
      '이메일',
      '하루 칼로리 섭취량',
      '다이어트 여부',
      '체중 조절 동기 (1-7)',
      '금지 음식 행동 (1-4)',
      '음식 의식 정도 (1-7)',
      '적게 섭취한 반응',
      '추가 설명',
      '그룹 적용 여부',
      '제출일시'
    ];

    const csvData = responses.map(response => [
      response.userEmail || '',
      response.q1_daily_calories || '',
      response.q2_on_diet === 'yes' ? '예' : response.q2_on_diet === 'no' ? '아니오' : '',
      response.q3_weight_control_motivation || '',
      response.q4_forbidden_food_behavior || '',
      response.q5_food_consciousness || '',
      response.q6_less_intake_reaction || '',
      response.q6_follow_up || '',
      response.is_group ? '예' : '아니오',
      response.timestamp || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8-sig;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `설문조사_결과_${selectedSurveyId}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      title: '이메일',
      dataIndex: 'userEmail',
      key: 'userEmail',
      width: 120,
      ellipsis: true,
    },
    {
      title: 'Q1 : 칼로리',
      dataIndex: 'q1_daily_calories',
      key: 'q1_daily_calories',
      width: 100,
      align: 'center',
    },
    {
      title: 'Q2 : 다이어트',
      dataIndex: 'q2_on_diet',
      key: 'q2_on_diet',
      width: 80,
      align: 'center',
      render: (value) => value === 'yes' ? '예' : value === 'no' ? '아니오' : '-',
    },
    {
      title: 'Q3 : 동기',
      dataIndex: 'q3_weight_control_motivation',
      key: 'q3_weight_control_motivation',
      width: 80,
      align: 'center',
    },
    {
      title: 'Q4 : 행동',
      dataIndex: 'q4_forbidden_food_behavior',
      key: 'q4_forbidden_food_behavior',
      width: 80,
      align: 'center',
    },
    {
      title: 'Q5 : 의식',
      dataIndex: 'q5_food_consciousness',
      key: 'q5_food_consciousness',
      width: 80,
      align: 'center',
    },
    {
      title: 'Q6 : 반응',
      dataIndex: 'q6_less_intake_reaction',
      key: 'q6_less_intake_reaction',
      width: 100,
      align: 'center',
      ellipsis: true,
    },
    {
        title: 'Q6: 추가 서술',
        dataIndex: 'q6_follow_up',
        key: 'q6_follow_up',
        width: 100,
        align: 'center',
        ellipsis: true,
    },
    {
      title: '그룹 편차 적용 여부',
      dataIndex: 'is_group',
      key: 'is_group',
      width: 80,
      align: 'center',
      render: (value) => (
        <Tag color={value ? 'green' : 'default'}>
          {value ? '적용' : '미적용'}
        </Tag>
      ),
    },
    {
      title: '제출일시',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 150,
      render: (value) => value ? new Date(value).toLocaleString('ko-KR') : '-',
    },
  ];

  if (!isAdmin) {
    return null;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>설문조사 결과 조회</Title>
          <Text type="secondary">관리자 전용 페이지입니다.</Text>
        </div>
        <Button onClick={() => navigate('/')}>홈으로 돌아가기</Button>
      </div>

      <Card>
        <Space direction="vertical" style={{ width: '100%' }}>
          {/* 설문조사 선택 */}
          <div>
            <Text strong style={{ marginRight: '10px' }}>설문조사 선택:</Text>
            <Select
              value={selectedSurveyId}
              onChange={handleSurveyChange}
              style={{ width: '300px' }}
              loading={loading}
            >
              {surveys.map(survey => (
                <Option key={survey.id} value={survey.id}>
                  {survey.title || survey.id} ({survey.responseCount}명 응답)
                </Option>
              ))}
            </Select>
          </div>

          {/* 현재 설문조사 정보 */}
          {currentSurvey && (
            <Card size="small" style={{ backgroundColor: '#f5f5f5' }}>
              <Space direction="vertical">
                <Text strong>설문조사 정보:</Text>
                <Text>응답 수: {currentSurvey.responseCount}명</Text>
                <Text>활성화 상태: {currentSurvey.isActive ? '활성' : '비활성'}</Text>
              </Space>
            </Card>
          )}

          {/* 내보내기 버튼 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="primary" onClick={exportToCSV} disabled={responses.length === 0}>
              CSV 내보내기
            </Button>
          </div>

          {/* 응답 테이블 */}
          <Spin spinning={loading}>
            <Table
              columns={columns}
              dataSource={responses}
              rowKey="id"
              scroll={{ x: 1200 }}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${total}개 중 ${range[0]}-${range[1]}개 표시`,
              }}
              size="small"
            />
          </Spin>
        </Space>
      </Card>
    </div>
  );
};

export default SurveyResultsPage;
