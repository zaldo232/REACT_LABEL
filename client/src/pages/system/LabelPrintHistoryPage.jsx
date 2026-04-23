/**
 * @file        LabelPrintHistoryPage.jsx
 * @description 시스템에서 라벨 프린터로 실제 발행(인쇄)한 데이터를 조회하는 이력 페이지
 */

import React, { 
  useState, 
  useEffect, 
  useMemo 
} from 'react';
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

/**
 * [컴포넌트] LabelPrintHistoryPage
 */
const LabelPrintHistoryPage = () => {
  /** [영역 분리: 상태 관리] */
  const [history, setHistory] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [dynamicColumns, setDynamicColumns] = useState([]);
  const [loading, setLoading] = useState(false);

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

  /** [영역 분리: 부수 효과 (Effects)] */
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

  /** [영역 분리: 이벤트 핸들러] */
  const fetchHistory = async () => {
    if (!selectedTemplateId) {
      return showAlert("양식 미선택", "warning", "조회할 라벨 양식을 먼저 선택해주세요.");
    }

    setLoading(true);
    try {
      const response = await apiClient.get('/label/history', { 
        params: { 
          ...searchParams, 
          templateId: selectedTemplateId 
        } 
      });
      
      if (response.data.success) {
        const rawData = response.data.data;

        if (rawData && rawData.length > 0) {
          const firstRow = rawData[0];
          
          // 시스템 필드 제외
          const systemFields = [
            'PrintSeq', 
            'BatchNo', 
            'Barcode', 
            'UserName', 
            'PrintedAt', 
            'id', 
            'TemplateId'
          ];
          
          const generatedCols = Object.keys(firstRow)
            .filter((key) => !systemFields.includes(key))
            .map((key) => ({
              field: key,
              headerName: key,
              width: 140,
              headerAlign: 'center',
              align: 'center'
            }));

          setDynamicColumns(generatedCols);
          setHistory(
            rawData.map((item) => ({ 
              ...item, 
              id: item.PrintSeq 
            }))
          );
        } else {
          setHistory([]);
          setDynamicColumns([]);
          showAlert("조회 결과", "info", "해당 조건에 맞는 발행 이력이 존재하지 않습니다.");
        }
      }
    } catch (error) {
      showAlert("조회 실패", "error", "데이터를 가져오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  /** [영역 분리: 데이터 그리드 컬럼 정의] */
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
      headerName: '발행 묶음번호', 
      width: 180, 
      headerAlign: 'center', 
      align: 'center' 
    },
    ...dynamicColumns,
    { 
      field: 'Barcode', 
      headerName: '인쇄된 바코드 원문', 
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
        height: 'calc(100vh - 160px)',
        width: '100%',
        overflow: 'hidden' 
      }}
    >
      <Typography 
        variant="h5" 
        fontWeight="bold"
        color="text.primary"
      >
        라벨 발행 이력 조회
      </Typography>

      <Paper 
        sx={{ 
          p: 2.5, 
          backgroundColor: 'background.paper', 
          border: '1px solid',
          borderColor: 'divider',
          flexShrink: 0
        }}
      >
        <Stack 
          direction="row" 
          spacing={2} 
          alignItems="center"
        >
          <FormControl 
            size="small" 
            sx={{ 
              width: 220 
            }}
          >
            <InputLabel>
              라벨 양식 선택
            </InputLabel>
            <Select
              label="라벨 양식 선택"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
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

          <TextField 
            label="시작일" 
            type="date" 
            size="small" 
            value={searchParams.startDate} 
            onChange={(e) => setSearchParams({ ...searchParams, startDate: e.target.value })} 
            InputLabelProps={{ shrink: true }} 
            sx={{ width: 155 }} 
          />

          <TextField 
            label="종료일" 
            type="date" 
            size="small" 
            value={searchParams.endDate} 
            onChange={(e) => setSearchParams({ ...searchParams, endDate: e.target.value })} 
            InputLabelProps={{ shrink: true }} 
            sx={{ width: 155 }} 
          />

          <TextField 
            label="검색어" 
            size="small" 
            value={searchParams.barcode} 
            onChange={(e) => setSearchParams({ ...searchParams, barcode: e.target.value })} 
            placeholder="바코드 또는 데이터 검색" 
            sx={{ flex: 1 }} 
          />
          
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

      <Paper 
        sx={{ 
          flex: 1, 
          width: '100%', 
          overflow: 'hidden',
          backgroundColor: 'background.paper'
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

export default LabelPrintHistoryPage;