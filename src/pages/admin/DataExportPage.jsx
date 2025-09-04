import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Space, message, Alert, Spin, Divider, Row, Col, Statistic, Table, Tag } from 'antd';
import { DownloadOutlined, DatabaseOutlined, FileExcelOutlined, ReloadOutlined, CloudDownloadOutlined, ExportOutlined, FileTextOutlined } from '@ant-design/icons';
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
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const isMobile = useMediaQuery({ maxWidth: 768 });

  // 관리자 권한 확인
  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  // Firebase Functions 초기화
  const functions = getFunctions();
  const exportMealDataToCSV = httpsCallable(functions, 'exportMealDataToCSV');
  const listMealDataCSVFiles = httpsCallable(functions, 'listMealDataCSVFiles');
  const downloadCSVFile = httpsCallable(functions, 'downloadCSVFile');

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

      const result = await exportMealDataToCSV({});

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

      // 파일 목록 새로고침
      loadCsvFiles();

    } catch (error) {
      message.destroy();
      console.error('CSV 생성 중 오류:', error);
      handleFirebaseError(error, '데이터 내보내기 실패');
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

  // 파일 다운로드 핸들러
  const handleFileDownload = async (fileName) => {
    try {
      message.loading('파일을 다운로드하는 중입니다...', 0);

      const result = await downloadCSVFile({ fileName });

      message.destroy();

      if (result.data.downloadUrl) {
        window.open(result.data.downloadUrl, '_blank');
        message.success('파일 다운로드를 시작했습니다!');
      } else {
        message.warning('다운로드 URL을 가져올 수 없습니다.');
      }

    } catch (error) {
      message.destroy();
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileTextOutlined style={{ color: '#6366f1' }} />
          <Text style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>
            {text}
          </Text>
        </div>
      ),
    },
    {
      title: '생성일',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text) => (
        <Text style={{ fontSize: '12px', color: '#6b7280' }}>
          {new Date(text).toLocaleString('ko-KR')}
        </Text>
      ),
    },
    {
      title: '데이터 행 수',
      dataIndex: 'totalRows',
      key: 'totalRows',
      width: 120,
      render: (value) => (
        <Tag
          color="geekblue"
          style={{
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: '600',
            padding: '2px 12px'
          }}
        >
          {value?.toLocaleString() || 0} 행
        </Tag>
      ),
    },
    {
      title: '파일 크기',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 120,
      render: (size) => {
        if (!size) return <Text style={{ color: '#9ca3af' }}>-</Text>;
        const kb = size / 1024;
        const mb = kb / 1024;
        return (
          <Text style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
            {mb > 1 ? `${mb.toFixed(1)} MB` : `${kb.toFixed(1)} KB`}
          </Text>
        );
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
          onClick={() => handleFileDownload(record.fileName)}
          style={{
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            fontSize: '12px',
            fontWeight: '600',
            height: '32px',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
          }}
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
      padding: isMobile ? '4px' : '8px',
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
          marginTop: isMobile ? '8px' : '16px',
          marginBottom: '16px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <Title level={3} style={{ margin: 0, color: '#262626' }}>
            📊 데이터 반출 페이지
          </Title>
        </div>
      </Card>

      {/* 메인 컨텐츠 */}
      <Card
        style={{
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 안내 메시지 */}
          <div>
            <p><strong>데이터 내보내기</strong> <br />    모든 사용자의 식사 데이터를 CSV 파일로 내보냄</p>
            <p><strong>CSV 파일 목록</strong> <br />생성된 CSV 파일들을 확인하고 다운로드 가능</p>
          </div>

          <Divider style={{ margin: '4px 0 4px 0' }} />

          {/* 데이터 내보내기 섹션 */}
          <div style={{ textAlign: 'center' }}>
            <Button
              type="primary"
              size="large"
              icon={<DatabaseOutlined />}
              onClick={handleExportData}
              loading={loading}
              style={{
                height: '50px',
                fontSize: '14px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)'
              }}
            >
              <div>
                <div>데이터 내보내기 (CSV 파일 생성) </div>
              </div>
            </Button>
          </div>

          {/* 내보내기 결과 표시 */}
          {exportResult && (
            <>
            <div style={{ textAlign: 'center' }}>
              <Space style={{ fontSize: '16px', color: '#10b981', background: '#d1fae5', padding: '12px 24px', borderRadius: '8px' }}>
                <CloudDownloadOutlined style={{ color: '#52c41a' }} />
                <Text strong>데이터 내보내기 완료!</Text>
              </Space>
            </div>
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

          <Divider style={{ margin: '4px 0 4px 0' }} />

          {/* 파일 목록 섹션 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={4} style={{ margin: 0 }}>CSV 파일 목록</Title>
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
      </Card>
    </div>
  );
};

export default DataExportPage;