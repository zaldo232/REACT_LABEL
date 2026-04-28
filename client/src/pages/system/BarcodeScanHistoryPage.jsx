/**
 * @file        BarcodeScanHistoryPage.jsx
 * @description 하드웨어 스캐너를 통해 서버에 저장된 원본 바코드 및 파싱 데이터 이력 조회 페이지
 * - [수정] 양식 로드 시 표(Table) 내부에 있는 가변 데이터 필드도 렌더링 컬럼에 포함되도록 파싱 로직 확장
 */

import React, { 
  useState, 
  useMemo 
} from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Stack 
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import apiClient from '../../utils/apiClient';
import DataTable from '../../components/common/DataTable';
import { showAlert } from '../../utils/swal';

/**
 * [컴포넌트] BarcodeScanHistoryPage
 */
const BarcodeScanHistoryPage = () => {
  /** [영역 분리: 상태 관리] */
  const [history, setHistory] = useState([]);
  const [dynamicColumns, setDynamicColumns] = useState([]);
  const [loading, setLoading] = useState(false);

  // KST 기준 1주일 전~오늘 초기화
  const [searchParams, setSearchParams] = useState(() => {
    const now = new Date();
    const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const kstOneWeekAgo = new Date(kstNow.getTime() - (7 * 24 * 60 * 60 * 1000));

    return {
      startDate: kstOneWeekAgo.toISOString().split('T')[0],
      endDate: kstNow.toISOString().split('T')[0],
      barcode: ''
    };
  });

  /** [영역 분리: 이벤트 핸들러] */
  const fetchScanHistory = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/system/history', { 
        params: searchParams 
      });
      
      if (response.data.success) {
        const rawData = response.data.data;

        if (rawData && rawData.length > 0) {
          /** [로직] JsonData 문자열을 파싱하여 객체 데이터로 병합 */
          const processedData = rawData.map(item => {
            let parsed = {};
            try {
               parsed = item.JsonData ? JSON.parse(item.JsonData) : {};
            } catch (e) {
               console.error("JSON 파싱 오류", e);
            }
            return {
              ...item,
              ...parsed,
              id: item.ScanSeq // DataGrid 고유 식별자 설정
            };
          });

          // 고정 컬럼들을 제외한 나머지 필드(파싱된 품명, 규격, 표 셀 등)를 추출하여 동적 컬럼 생성
          const excludeFields = [
            'ScanSeq', 
            'BatchNo', 
            'Barcode', 
            'JsonData', 
            'TemplateId', 
            'TemplateName', 
            'UserId', 
            'UserName', 
            'ScanAt', 
            'id', 
            'scannedAt'
          ];
          
          const newCols = Object.keys(processedData[0])
            .filter(key => !excludeFields.includes(key))
            .map(key => ({
              field: key,
              headerName: key,
              width: 140,
              headerAlign: 'center',
              align: 'center'
            }));

          setDynamicColumns(newCols);
          setHistory(processedData);
        } else {
          setHistory([]);
          setDynamicColumns([]);
          showAlert("조회 결과", "info", "해당 기간에 조회된 스캔 내역이 없습니다.");
        }
      }
    } catch (error) {
      showAlert("오류", "error", "데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  /** [영역 분리: 그리드 컬럼 정의] */
  const columns = useMemo(() => [
    { 
      field: 'ScanSeq', 
      headerName: 'No', 
      width: 70, 
      align: 'center', 
      headerAlign: 'center' 
    },
    { 
      field: 'BatchNo', 
      headerName: '스캔 묶음번호', 
      width: 180, 
      align: 'center', 
      headerAlign: 'center' 
    },
    { 
      field: 'TemplateName', 
      headerName: '적용 양식', 
      width: 160, 
      headerAlign: 'center',
      align: 'center'
    },
    ...dynamicColumns, // 파싱된 가변 필드(표 셀 포함) 삽입
    { 
      field: 'Barcode', 
      headerName: '스캔된 바코드 원문', 
      flex: 1, 
      minWidth: 250, 
      headerAlign: 'center' 
    },
    { 
      field: 'UserName', 
      headerName: '작업자', 
      width: 100, 
      align: 'center', 
      headerAlign: 'center' 
    },
    { 
      field: 'ScanAt', 
      headerName: '스캔 일시', 
      width: 180, 
      align: 'center', 
      headerAlign: 'center' 
    },
  ], [dynamicColumns]);

  /** [영역 분리: 렌더링] */
  return (
    <Box 
      sx={{ 
        p: 3, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2, 
        height: 'calc(100vh - 160px)',
        overflow: 'hidden'
      }}
    >
      <Typography 
        variant="h5" 
        fontWeight="bold"
      >
        바코드 스캔 이력 조회
      </Typography>

      <Paper 
        sx={{ 
          p: 2, 
          border: '1px solid', 
          borderColor: 'divider' 
        }}
      >
        <Stack 
          direction="row" 
          spacing={2} 
          alignItems="center"
        >
          <TextField 
            label="시작일" 
            type="date" 
            size="small" 
            value={searchParams.startDate}
            onChange={(e) => setSearchParams({ ...searchParams, startDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 160 }}
          />
          <TextField 
            label="종료일" 
            type="date" 
            size="small" 
            value={searchParams.endDate}
            onChange={(e) => setSearchParams({ ...searchParams, endDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 160 }}
          />
          <TextField 
            label="검색어" 
            size="small" 
            placeholder="바코드 원문 또는 파싱 데이터 검색"
            value={searchParams.barcode}
            onChange={(e) => setSearchParams({ ...searchParams, barcode: e.target.value })}
            sx={{ flex: 1 }}
          />
          <Button 
            variant="contained" 
            startIcon={<SearchIcon />} 
            onClick={fetchScanHistory}
            sx={{ height: 40, px: 3 }}
          >
            검색
          </Button>
        </Stack>
      </Paper>

      <Paper 
        sx={{ 
          flex: 1, 
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

export default BarcodeScanHistoryPage;