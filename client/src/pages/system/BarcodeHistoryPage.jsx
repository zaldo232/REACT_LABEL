/**
 * @file        BarcodeHistoryPage.jsx
 * @description 라벨 발행 및 스캔 이력을 조회하는 페이지 컴포넌트
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Stack, 
  MenuItem, 
  Select, 
  FormControl, 
  InputLabel, 
  Divider 
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import apiClient from '../../utils/apiClient';
import DataTable from '../../components/common/DataTable';
import { showAlert } from '../../utils/swal';

const BarcodeHistoryPage = () => {
  /** [상태 관리] 서버 데이터 및 조회 결과 */
  const [history, setHistory] = useState([]);                       // 조회된 이력 데이터 목록
  const [templates, setTemplates] = useState([]);                   // DB에서 로드한 양식(템플릿) 목록
  const [selectedTemplateId, setSelectedTemplateId] = useState(''); // 선택된 양식 ID
  const [dynamicColumns, setDynamicColumns] = useState([]);         // 양식에 따라 변하는 가변 컬럼들
  const [loading, setLoading] = useState(false);                    // 데이터 로딩 상태 제어

  /** * [상태 관리] 조회 필터 파라미터 
   * @description 규칙에 따라 KST(한국 시간) 보정을 적용하여 기본 날짜를 설정
   */
  const [searchParams, setSearchParams] = useState(() => {
    const now = new Date();
    // 한국 시간(UTC+9) 보정
    const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const kstOneWeekAgo = new Date(kstNow.getTime() - (7 * 24 * 60 * 60 * 1000));

    return {
      startDate: kstOneWeekAgo.toISOString().split('T')[0],
      endDate: kstNow.toISOString().split('T')[0],
      barcode: ''
    };
  });

  /** [로직] 컴포넌트 마운트 시 라벨 양식 목록 로드 */
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await apiClient.get('/label/template/list');
        setTemplates(res.data.data || []);
      } catch (err) {
        console.error("양식 목록 로드 실패", err);
      }
    };
    fetchTemplates();
  }, []);

  /** [이벤트 핸들러] */

  /**
   * 이력 조회 실행 함수
   * @description 선택된 양식 ID를 필수값으로 하며, 서버 응답 데이터의 키(Key)를 분석해 동적으로 컬럼을 생성
   */
  const fetchHistory = async () => {
    // 1. 필수 선택값 검증
    if (!selectedTemplateId) {
      return showAlert("양식 미선택", "warning", "조회할 라벨 양식을 먼저 선택해주세요.");
    }

    setLoading(true);
    try {
      // 2. 서버 API 호출 (동적 쿼리 기반 프로시저 호출)
      const response = await apiClient.get('/label/history', { 
        params: { 
          ...searchParams, 
          templateId: selectedTemplateId 
        } 
      });
      
      if (response.data.success) {
        const rawData = response.data.data;

        if (rawData && rawData.length > 0) {
          /** [로직] 서버 응답 키(Key) 분석을 통한 동적 컬럼 생성 */
          const firstRow = rawData[0];
          
          // 테이블에 표시하지 않을 시스템 필드(Primary Key, FK 등) 제외 목록
          const systemFields = [
            'PrintSeq', 'BatchNo', 'Barcode', 
            'UserName', 'PrintedAt', 'id', 'TemplateId'
          ];
          
          const generatedCols = Object.keys(firstRow)
            .filter((key) => !systemFields.includes(key)) // 시스템 필드 제외
            .map((key) => ({
              field: key,
              headerName: key,
              width: 140,
              headerAlign: 'center',
              align: 'center'
            }));

          setDynamicColumns(generatedCols);
          
          // 3. DataGrid 연동을 위한 ID 매핑 (PrintSeq를 고유 키로 활용)
          setHistory(rawData.map((item) => ({ 
            ...item, 
            id: item.PrintSeq 
          })));
        } else {
          // 데이터가 없을 경우 상태 초기화
          setHistory([]);
          setDynamicColumns([]);
          showAlert("조회 결과", "info", "해당 조건에 맞는 발행 이력이 존재하지 않습니다.");
        }
      }
    } catch (error) {
      showAlert("조회 실패", "error", "서버로부터 데이터를 가져오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  /** [로직] 그리드 전체 컬럼 정의 (고정 컬럼 + 분석된 동적 컬럼) */
  const columns = useMemo(() => [
    { 
      field: 'PrintSeq', 
      headerName: 'No', 
      width: 70, 
      align: 'center', 
      headerAlign: 'center' 
    },
    { 
      field: 'BatchNo', 
      headerName: '작업번호', 
      width: 180, 
      headerAlign: 'center', 
      align: 'center' 
    },
    ...dynamicColumns, // 서버 응답에 따라 추가된 가변 데이터 컬럼
    { 
      field: 'Barcode', 
      headerName: '바코드/시리얼', 
      flex: 1, 
      minWidth: 200, 
      headerAlign: 'center' 
    },
    { 
      field: 'UserName', 
      headerName: '담당자', 
      width: 120, 
      align: 'center', 
      headerAlign: 'center' 
    },
    { 
      field: 'PrintedAt', 
      headerName: '발행 일시', 
      width: 180, 
      align: 'center', 
      headerAlign: 'center' 
    },
  ], [dynamicColumns]);

  /** [렌더링 영역] */
  return (
    <Box 
      sx={{ 
        p: 3, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2, 
        height: 'calc(100vh - 100px)' 
      }}
    >
      {/* 상단 타이틀 */}
      <Typography 
        variant="h5" 
        fontWeight="bold"
      >
        스캔 이력 조회
      </Typography>

      {/* 필터 검색 영역 */}
      <Paper 
        sx={{ 
          p: 2.5, 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #e0e0e0' 
        }}
      >
        <Stack 
          direction="row" 
          spacing={2} 
          alignItems="center"
        >
          {/* 양식 선택 콤보박스 */}
          <FormControl 
            size="small" 
            sx={{ width: 220 }}
          >
            <InputLabel>라벨 양식 선택</InputLabel>
            <Select
              label="라벨 양식 선택"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              sx={{ backgroundColor: '#fff' }}
            >
              {templates.map((t) => (
                <MenuItem 
                  key={t.TemplateId} 
                  value={t.TemplateId}
                >
                  {t.TemplateName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider 
            orientation="vertical" 
            flexItem 
          />

          {/* 시작일 설정 */}
          <TextField 
            label="시작일" 
            type="date" 
            size="small" 
            value={searchParams.startDate} 
            onChange={(e) => setSearchParams({ ...searchParams, startDate: e.target.value })} 
            InputLabelProps={{ shrink: true }} 
            sx={{ 
              backgroundColor: '#fff', 
              width: 155 
            }} 
          />

          {/* 종료일 설정 */}
          <TextField 
            label="종료일" 
            type="date" 
            size="small" 
            value={searchParams.endDate} 
            onChange={(e) => setSearchParams({ ...searchParams, endDate: e.target.value })} 
            InputLabelProps={{ shrink: true }} 
            sx={{ 
              backgroundColor: '#fff', 
              width: 155 
            }} 
          />

          {/* 바코드/내용 검색어 입력 */}
          <TextField 
            label="검색어" 
            size="small" 
            value={searchParams.barcode} 
            onChange={(e) => setSearchParams({ ...searchParams, barcode: e.target.value })} 
            placeholder="바코드 또는 데이터 내용 검색" 
            sx={{ 
              backgroundColor: '#fff', 
              flex: 1 
            }} 
          />
          
          {/* 조회 실행 버튼 */}
          <Button 
            variant="contained" 
            size="large" 
            startIcon={<SearchIcon />} 
            onClick={fetchHistory}
            sx={{ 
              fontWeight: 'bold', 
              minWidth: 100,
              height: 40
            }}
          >
            조회하기
          </Button>
        </Stack>
      </Paper>

      {/* 하단 데이터 그리드 영역 */}
      <Paper 
        sx={{ 
          flex: 1, 
          width: '100%', 
          overflow: 'hidden' 
        }}
      >
        <DataTable 
          rows={history} 
          columns={columns} 
          loading={loading} 
        />
      </Paper>

    </Box>
  );
};

export default BarcodeHistoryPage;