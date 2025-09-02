import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Space, message, Alert, Spin, Divider, Row, Col, Statistic, Table, Tag, Tabs } from 'antd';
import { DownloadOutlined, DatabaseOutlined, FileExcelOutlined, CloudDownloadOutlined, SyncOutlined, HistoryOutlined, ReloadOutlined } from '@ant-design/icons';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';

const { Title, Text, Paragraph } = Typography;

// 관리자 접근 가능한 이메일 목록
const ADMIN_EMAILS = [
  'eodud653923@gmail.com',
  'youngwonhahn00@gmail.com',
  'juhyeok0123@gmail.com',
  'wn990123@gmail.com',
  'garcia29845@gmail.com',
  'yunj29845@gmail.com',
];

const DataExportPage = () => {
  const [loading, setLoading] = useState(false);
  const [exportResult, setExportResult] = useState(null);
  const [csvFiles, setCsvFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('export');
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const isMobile = useMediaQuery({ maxWidth: 768 });

  // 관리자 권한 확인
  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  // Firebase Functions 초기화
  const functions = getFunctions();
  const exportMealDataToCSV = httpsCallable(functions, 'exportMealDataToCSV');
  const updateMealDataCSV = httpsCallable(functions, 'updateMealDataCSV');
  const downloadLatestMealDataCSV = httpsCallable(functions, 'downloadLatestMealDataCSV');
  const listMealDataCSVFiles = httpsCallable(functions, 'listMealDataCSVFiles');

  // 권한이 없는 경우 리다이렉트
  useEffect(() => {
    if (!isAdmin) {
      message.error('관리자 권한이 필요합니다.');
      navigate('/');
    }
  }, [isAdmin, navigate]);

  // CSV 파일 목록 로드
  const loadCsvFiles = async () => {
    setFilesLoading(true);
    try {
      const result = await listMealDataCSVFiles({});
      setCsvFiles(result.data.files || []);
    } catch (error) {
      console.error('CSV 파일 목록 로드 실패:', error);
      handleFirebaseError(error, '파일 목록을 불러오는데 실패했습니다');
    } finally {
      setFilesLoading(false);
    }
  };

  // 컴포넌트 마운트 시 파일 목록 로드
  useEffect(() => {
    if (isAdmin) {
      loadCsvFiles();
    }
  }, [isAdmin]);

  // CSV 데이터 내보내기 함수
  const handleExportData = async () => {
    setLoading(true);
    setExportResult(null);

    try {
      message.loading('데이터를 내보내는 중입니다...', 0);
      
      const result = await exportMealDataToCSV({
        // 필요한 경우 추가 파라미터
      });

      message.destroy();
      message.success('CSV 파일이 성공적으로 생성되었습니다!');
      
      setExportResult(result.data);
      
      console.log('CSV 파일이 생성되었습니다:', result.data);
      console.log('다운로드 URL:', result.data.downloadUrl);
      console.log('총 행 수:', result.data.totalRows);
      
      // 자동으로 다운로드 시작
      if (result.data.downloadUrl) {
        window.open(result.data.downloadUrl, '_blank');
      }
      
    } catch (error) {
      message.destroy();
      console.error('CSV 생성 중 오류:', error);
      handleFirebaseError(error, '데이터 내보내기 실패');
    } finally {
      setLoading(false);
    }
  };

  // 업데이트된 데이터만 내보내기
  const handleUpdateData = async () => {
    setLoading(true);
    setExportResult(null);

    try {
      message.loading('업데이트된 데이터를 내보내는 중입니다...', 0);
      
      const result = await updateMealDataCSV({});

      message.destroy();
      message.success('업데이트된 CSV 파일이 성공적으로 생성되었습니다!');
      
      setExportResult({
        ...result.data,
        isUpdate: true
      });
      
      // 자동으로 다운로드 시작
      if (result.data.downloadUrl) {
        window.open(result.data.downloadUrl, '_blank');
      }
      
      // 파일 목록 새로고침
      loadCsvFiles();
      
    } catch (error) {
       message.destroy();
       console.error('업데이트 CSV 생성 중 오류:', error);
       handleFirebaseError(error, '업데이트 데이터 내보내기 실패');
     } finally {
      setLoading(false);
    }
  };

  // Firebase 권한 오류 처리 공통 함수
  const handleFirebaseError = (error, defaultMessage) => {
    if (error.message && error.message.includes('iam.serviceAccounts.signBlob')) {
      message.error({
        content: (
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>🔒 Firebase 권한 설정 필요</div>
            <div style={{ marginBottom: '8px' }}>Firebase Functions에서 Storage 접근 권한이 부족합니다.</div>
            <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.4' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>해결 방법:</div>
              <div>1. Firebase Console → IAM 및 관리자 → IAM</div>
              <div>2. App Engine 기본 서비스 계정 찾기</div>
              <div>3. 'Service Account Token Creator' 역할 추가</div>
              <div style={{ marginTop: '4px', fontStyle: 'italic' }}>
                또는 관리자에게 문의하여 권한 설정을 요청하세요.
              </div>
            </div>
          </div>
        ),
        duration: 15
      });
    } else {
      message.error(`${defaultMessage}: ${error.message || '알 수 없는 오류가 발생했습니다.'}`);
    }
  };

  // 최신 CSV 다운로드
  const handleDownloadLatest = async () => {
    try {
      message.loading('최신 파일을 가져오는 중입니다...', 0);
      
      const result = await downloadLatestMealDataCSV({});
      
      message.destroy();
      
      if (result.data.downloadUrl) {
        window.open(result.data.downloadUrl, '_blank');
        message.success('최신 CSV 파일 다운로드를 시작했습니다!');
      } else {
        message.warning('다운로드 가능한 CSV 파일이 없습니다.');
      }
      
    } catch (error) {
      message.destroy();
      console.error('최신 CSV 다운로드 실패:', error);
      handleFirebaseError(error, '최신 파일 다운로드 실패');
    }
  };

  // 다운로드 버튼 클릭 핸들러
  const handleDownload = () => {
    if (exportResult?.downloadUrl) {
      window.open(exportResult.downloadUrl, '_blank');
    }
  };

  // 파일 다운로드 핸들러
  const handleFileDownload = async (downloadUrl) => {
    try {
      window.open(downloadUrl, '_blank');
    } catch (error) {
      console.error('파일 다운로드 실패:', error);
      handleFirebaseError(error, '파일 다운로드 실패');
    }
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      title: '파일명',
      dataIndex: 'fileName',
      key: 'fileName',
      ellipsis: true,
      render: (text) => (
        <Text code style={{ fontSize: '12px' }}>
          {text}
        </Text>
      ),
    },
    {
      title: '생성일',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text) => new Date(text).toLocaleString('ko-KR'),
    },
    {
      title: '데이터 행 수',
      dataIndex: 'totalRows',
      key: 'totalRows',
      width: 120,
      render: (value) => (
        <Tag color="blue">{value?.toLocaleString() || 0}</Tag>
      ),
    },
    {
      title: '파일 크기',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 120,
      render: (size) => {
        if (!size) return '-';
        const kb = size / 1024;
        const mb = kb / 1024;
        return mb > 1 ? `${mb.toFixed(1)} MB` : `${kb.toFixed(1)} KB`;
      },
    },
    {
      title: '액션',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<DownloadOutlined />}
          onClick={() => handleFileDownload(record.downloadUrl)}
        >
          다운로드
        </Button>
      ),
    },
  ];

  if (!isAdmin) {
    return null;
  }

  return (
    <div style={{ 
      padding: isMobile ? '16px' : '24px', 
      maxWidth: '1400px', 
      margin: '0 auto',
      minHeight: '100vh',
      background: '#f5f5f5'
    }}>
      {/* 헤더 섹션 */}
      <Card 
        style={{ 
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          marginBottom: '24px'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <DatabaseOutlined 
            style={{ 
              fontSize: '48px', 
              color: '#1890ff', 
              marginBottom: '16px' 
            }} 
          />
          <Title level={2} style={{ margin: 0, color: '#262626' }}>
            📊 데이터 관리 센터
          </Title>
          <Paragraph style={{ 
            fontSize: '16px', 
            color: '#8c8c8c', 
            marginTop: '8px',
            marginBottom: 0
          }}>
            식사 데이터를 CSV 파일로 내보내고 관리할 수 있습니다
          </Paragraph>
        </div>
      </Card>

      {/* 탭 컨텐츠 */}
      <Card 
        style={{ 
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'export',
              label: (
                <Space>
                  <FileExcelOutlined />
                  데이터 내보내기
                </Space>
              ),
              children: (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  {/* 안내 메시지 */}
                  <Alert
                    message="데이터 내보내기 안내"
                    description={
                      <div>
                        <p>• <strong>전체 내보내기:</strong> 모든 사용자의 전체 식사 데이터를 CSV로 내보냅니다</p>
                        <p>• <strong>업데이트 내보내기:</strong> 마지막 내보내기 이후 변경된 데이터만 내보냅니다</p>
                        <p>• <strong>최신 다운로드:</strong> 가장 최근에 생성된 CSV 파일을 다운로드합니다</p>
                        <p>• 모든 CSV 파일은 UTF-8-BOM 인코딩으로 Excel에서 한글이 깨지지 않습니다</p>
                      </div>
                    }
                    type="info"
                    showIcon
                    style={{ borderRadius: '8px' }}
                  />

                  {/* 액션 버튼들 */}
                  <Row gutter={[16, 16]} justify="center">
                    <Col xs={24} sm={8}>
                      <Button
                        type="primary"
                        size="large"
                        icon={<DatabaseOutlined />}
                        onClick={handleExportData}
                        loading={loading}
                        block
                        style={{
                          height: '60px',
                          fontSize: '16px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)'
                        }}
                      >
                        <div>
                          <div>전체 데이터 내보내기</div>
                          <div style={{ fontSize: '12px', opacity: 0.8 }}>모든 식사 데이터</div>
                        </div>
                      </Button>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Button
                        type="default"
                        size="large"
                        icon={<SyncOutlined />}
                        onClick={handleUpdateData}
                        loading={loading}
                        block
                        style={{
                          height: '60px',
                          fontSize: '16px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
                          border: 'none',
                          color: 'white',
                          boxShadow: '0 4px 12px rgba(82, 196, 26, 0.3)'
                        }}
                      >
                        <div>
                          <div>업데이트 내보내기</div>
                          <div style={{ fontSize: '12px', opacity: 0.8 }}>변경된 데이터만</div>
                        </div>
                      </Button>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Button
                        type="default"
                        size="large"
                        icon={<CloudDownloadOutlined />}
                        onClick={handleDownloadLatest}
                        block
                        style={{
                          height: '60px',
                          fontSize: '16px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
                          border: 'none',
                          color: 'white',
                          boxShadow: '0 4px 12px rgba(114, 46, 209, 0.3)'
                        }}
                      >
                        <div>
                          <div>최신 파일 다운로드</div>
                          <div style={{ fontSize: '12px', opacity: 0.8 }}>가장 최근 파일</div>
                        </div>
                      </Button>
                    </Col>
                  </Row>

                  {/* 결과 표시 */}
                  {exportResult && (
                    <>
                      <Divider />
                      <Card 
                        title={
                          <Space>
                            <CloudDownloadOutlined style={{ color: '#52c41a' }} />
                            <Text strong>
                              {exportResult.isUpdate ? '업데이트 내보내기 완료' : '전체 내보내기 완료'}
                            </Text>
                          </Space>
                        }
                        style={{ 
                          borderRadius: '8px',
                          border: '1px solid #b7eb8f'
                        }}
                        headStyle={{ 
                          background: '#f6ffed',
                          borderRadius: '8px 8px 0 0'
                        }}
                      >
                        <Row gutter={[16, 16]}>
                          <Col xs={24} sm={exportResult.isUpdate ? 8 : 12}>
                            <Statistic
                              title="총 데이터 행 수"
                              value={exportResult.totalRows || 0}
                              prefix={<DatabaseOutlined />}
                              valueStyle={{ color: '#1890ff' }}
                            />
                          </Col>
                          {exportResult.isUpdate && (
                            <>
                              <Col xs={24} sm={8}>
                                <Statistic
                                  title="새 행 수"
                                  value={exportResult.newRows || 0}
                                  prefix={<SyncOutlined />}
                                  valueStyle={{ color: '#52c41a' }}
                                />
                              </Col>
                              <Col xs={24} sm={8}>
                                <Statistic
                                  title="업데이트된 행 수"
                                  value={exportResult.updatedRows || 0}
                                  prefix={<ReloadOutlined />}
                                  valueStyle={{ color: '#fa8c16' }}
                                />
                              </Col>
                            </>
                          )}
                          {!exportResult.isUpdate && (
                            <Col xs={24} sm={12}>
                              <Statistic
                                title="파일 상태"
                                value="생성 완료"
                                prefix={<FileExcelOutlined />}
                                valueStyle={{ color: '#52c41a' }}
                              />
                            </Col>
                          )}
                        </Row>
                        
                        <Divider style={{ margin: '16px 0' }} />
                        
                        <Row justify="center">
                          <Col>
                            <Button
                              type="primary"
                              icon={<DownloadOutlined />}
                              onClick={handleDownload}
                              size="large"
                              style={{
                                borderRadius: '6px',
                                background: '#52c41a',
                                borderColor: '#52c41a'
                              }}
                            >
                              다시 다운로드
                            </Button>
                          </Col>
                        </Row>
                      </Card>
                    </>
                  )}

                  {/* 로딩 상태 */}
                  {loading && (
                    <div style={{ textAlign: 'center', padding: '24px' }}>
                      <Spin size="large" />
                      <div style={{ marginTop: '16px' }}>
                        <Text type="secondary">데이터를 처리하고 있습니다...</Text>
                      </div>
                    </div>
                  )}
                </Space>
              ),
            },
            {
              key: 'files',
              label: (
                <Space>
                  <HistoryOutlined />
                  파일 관리
                </Space>
              ),
              children: (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Title level={4} style={{ margin: 0 }}>저장된 CSV 파일 목록</Title>
                      <Text type="secondary">생성된 모든 CSV 파일을 확인하고 다운로드할 수 있습니다</Text>
                    </div>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={loadCsvFiles}
                      loading={filesLoading}
                    >
                      새로고침
                    </Button>
                  </div>
                  
                  <Table
                    columns={columns}
                    dataSource={csvFiles}
                    loading={filesLoading}
                    rowKey="fileName"
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `총 ${total}개 파일`,
                    }}
                    scroll={{ x: 800 }}
                    style={{ borderRadius: '8px' }}
                  />
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default DataExportPage;