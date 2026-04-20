/**
 * @file        BarcodeScanPage.jsx
 * @description 실시간 바코드 등록 및 자동 파싱 처리 페이지
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Stack, 
  Alert, 
  TextField, 
  MenuItem, 
  Select, 
  FormControl, 
  InputLabel, 
  Divider 
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import apiClient from '../../utils/apiClient';
import useAppStore from '../../store/useAppStore';
import DataTable from '../../components/common/DataTable';
import { showAlert, showConfirm } from '../../utils/swal';

const BarcodeScanPage = () => {
  /** [상태 관리] 양식 정보 및 스캔 데이터 목록 */
  const [templates, setTemplates] = useState([]);                     // 서버에서 로드한 전체 라벨 양식 목록
  const [selectedTemplateId, setSelectedTemplateId] = useState('');   // 현재 선택된 양식 ID
  const [templateItems, setTemplateItems] = useState([]);             // 선택된 양식 내 가변 데이터 항목들
  const [currentDelimiter, setCurrentDelimiter] = useState('_');      // 바코드 문자열 분할용 구분자
  const [metaData, setMetaData] = useState({});                       // 스캔으로 채워진 항목별 값
  const [scannedList, setScannedList] = useState([]);                 // 서버 저장 전 대기 중인 스캔 목록
  
  /** [전역 상태] 스캐너 정보 및 사용자 정보 */
  const user = useAppStore((state) => state.user);
  const lastScan = useAppStore((state) => state.lastScan);
  const isScannerConnected = useAppStore((state) => state.isScannerConnected);

  /** [Ref] 마지막 처리 스캔 시간 (중복 처리 방지 및 초기 진입 시 경고 차단) */
  const lastProcessedTime = useRef(Date.now());

  /** [초기화] 컴포넌트 마운트 시 라벨 양식 목록 로드 */
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await apiClient.get('/label/template/list');
        setTemplates(res.data.data || []);
      } catch (err) {
        console.error("양식 로드 실패", err);
      }
    };
    fetchTemplates();
  }, []);

  /**
   * [이벤트 핸들러] 라벨 양식 선택 변경 처리
   * (양식 디자인 설정을 분석하여 가변 데이터 필드와 구분자를 동적으로 세팅)
   */
  const handleTemplateChange = (e) => {
    const tId = e.target.value;
    setSelectedTemplateId(tId);
    
    const target = templates.find(t => t.TemplateId === tId);
    if (target) {
      const fullDesign = JSON.parse(target.DesignJson || '[]');
      
      // 메타 정보에서 구분자(Delimiter) 추출
      const metaItem = fullDesign.find(i => i.type === 'meta');
      setCurrentDelimiter(metaItem?.layout?.delimiter || '_');

      // 'data' 타입의 항목들만 필터링하여 입력 필드 목록 생성
      const dataFields = fullDesign.filter(item => item.type === 'data');
      setTemplateItems(dataFields);
      
      // 항목별 데이터 초기값 세팅
      const initialMeta = {};
      dataFields.forEach(f => {
        initialMeta[f.label] = '';
      });
      setMetaData(initialMeta);
    }
  };

  /** [이벤트 핸들러] 항목 데이터 수동 입력 처리 (Read-only 적용으로 실제로는 스캔 시에만 변경됨) */
  const handleMetaChange = (label, value) => {
    setMetaData(prev => ({ 
      ...prev, 
      [label]: value 
    }));
  };

  /**
   * [로직] 한국 시간(KST) 문자열 생성 함수
   * (toISOString의 UTC 0 문제를 해결하기 위해 9시간을 더하여 'YYYY-MM-DD HH:mm:ss' 형식으로 반환)
   */
  const getKstString = (timestamp) => {
    const date = new Date(timestamp);
    const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
    return kstDate.toISOString().replace('T', ' ').substring(0, 19);
  };

  /** * [Effect] 실시간 바코드 스캔 감지 및 자동 파싱 처리
   * (스캔 발생 시 구분자로 데이터를 분할하여 항목에 매핑하고 리스트에 추가)
   */
  useEffect(() => {
    if (lastScan.barcode && lastScan.timestamp > lastProcessedTime.current) {
      lastProcessedTime.current = lastScan.timestamp;

      // 양식이 선택되지 않은 상태에서 스캔 시 경고 출력
      if (!selectedTemplateId) {
        showAlert("양식 미선택", "warning", "상단에서 라벨 양식을 먼저 선택해주세요.");
        return;
      }
      
      // 설정된 구분자로 바코드를 분할하여 각 데이터 필드에 자동 매핑
      const parts = lastScan.barcode.split(currentDelimiter);
      const updatedMeta = { ...metaData };

      templateItems.forEach((item, index) => {
        if (parts[index]) {
          updatedMeta[item.label] = parts[index];
        }
      });

      // 파싱된 결과를 UI(TextField)에 반영
      setMetaData(updatedMeta);

      /** 신규 스캔 데이터 객체 생성 */
      const newEntry = {
        id: lastScan.timestamp,
        no: scannedList.length + 1,
        barcode: lastScan.barcode,
        scannedAt: new Date(lastScan.timestamp).toLocaleTimeString(),
        operator: user?.userName || '관리자',
        templateId: selectedTemplateId,
        ...updatedMeta 
      };

      // 목록 최상단에 추가
      setScannedList((prev) => [newEntry, ...prev]);
    }
  }, [lastScan, user, metaData, selectedTemplateId, templateItems, currentDelimiter, scannedList.length]);

  /**
   * [이벤트 핸들러] 대기 중인 스캔 목록 서버 일괄 저장
   */
  const handleSave = async () => {
    if (scannedList.length === 0) return;

    const isConfirmed = await showConfirm(
      "저장 확인", 
      `${scannedList.length}건의 데이터를 서버에 저장하시겠습니까?`
    );

    if (isConfirmed) {
      try {
        const payload = scannedList.slice().reverse().map(item => {
          /**
           * 실제 스캔 시점의 ID(Timestamp)를 기반으로 KST 문자열을 생성하여 
           * 데이터 무결성을 보장
           */
          const { id, no, scannedAt, operator, templateId, barcode, ...restData } = item;
          
          return {
            barcode: barcode,
            scannedAt: getKstString(item.id), // 보정된 한국 시간 적용
            ...restData 
          };
        });

        const response = await apiClient.post('/label/save', { 
          labelData: payload, 
          templateId: selectedTemplateId 
        });

        if (response.data.success) {
          showAlert("성공", "success", "데이터가 서버에 정상 기록되었습니다.");
          setScannedList([]); 
          lastProcessedTime.current = Date.now();
        }
      } catch (error) { 
        showAlert("오류", "error", "서버 저장 중 통신 실패가 발생했습니다."); 
      }
    }
  };

  /** 데이터 그리드 컬럼 구성 (양식에 따라 동적 확장) */
  const columns = useMemo(() => {
    const baseCols = [
      { 
        field: 'no', 
        headerName: 'No.', 
        width: 60, 
        align: 'center', 
        headerAlign: 'center' 
      }
    ];

    const dynamicCols = templateItems.map(item => ({
      field: item.label, 
      headerName: item.label, 
      width: 130, 
      headerAlign: 'center', 
      align: 'center'
    }));

    const endCols = [
      { 
        field: 'barcode', 
        headerName: '바코드/시리얼', 
        flex: 1, 
        headerAlign: 'center' 
      },
      { 
        field: 'scannedAt', 
        headerName: '스캔 시간', 
        width: 130, 
        align: 'center', 
        headerAlign: 'center' 
      },
      { 
        field: 'operator', 
        headerName: '담당자', 
        width: 100, 
        align: 'center', 
        headerAlign: 'center' 
      },
    ];

    return [...baseCols, ...dynamicCols, ...endCols];
  }, [templateItems]);

  /** [렌더링 영역] */
  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      
      {/* 페이지 타이틀 */}
      <Typography variant="h5" fontWeight="bold">
        바코드 등록
      </Typography>

      {/* 장치 연결 상태 알림 */}
      {!isScannerConnected && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          장치 연결이 필요합니다. 사이드바 하단에서 <strong>[스캐너 연결]</strong>을 눌러주세요.
        </Alert>
      )}

      {/* 상단: 양식 선택 및 데이터 파싱 결과 확인 영역 */}
      <Paper 
        sx={{ 
          p: 2.5, 
          border: '1px solid #e0e0e0',
          backgroundColor: '#fff'
        }}
      >
        <Stack direction="row" spacing={3} alignItems="flex-start">
          
          {/* 라벨 양식 선택 Select */}
          <FormControl size="small" sx={{ width: 250 }}>
            <InputLabel>라벨 양식 선택</InputLabel>
            <Select 
              value={selectedTemplateId} 
              label="라벨 양식 선택" 
              onChange={handleTemplateChange}
            >
              {templates.map(t => (
                <MenuItem key={t.TemplateId} value={t.TemplateId}>
                  {t.TemplateName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider orientation="vertical" flexItem />

          {/* 파싱 데이터 확인 영역 (수정 불가 설정) */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="primary" fontWeight="bold">
              항목 데이터 (스캔 시 자동 분리됨 / 구분자: {currentDelimiter})
            </Typography>
            <Stack direction="row" spacing={1.5} mt={1} flexWrap="wrap" useFlexGap>
              {templateItems.map(item => (
                <TextField 
                  key={item.id} 
                  label={item.label} 
                  size="small" 
                  value={metaData[item.label] || ''}
                  onChange={(e) => handleMetaChange(item.label, e.target.value)} 
                  sx={{ width: 140 }}
                  // 사용자가 수동으로 바꾸지 못하도록 읽기 전용 설정
                  InputProps={{
                    readOnly: true,
                  }}
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </Paper>

      {/* 상태바 및 저장 버튼 영역 */}
      <Paper 
        sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          backgroundColor: '#f8f9fa' 
        }}
      >
        <Typography variant="body2">
          현재 스캔 대기: <b>{scannedList.length}</b>건
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button 
            variant="outlined" 
            color="error" 
            startIcon={<DeleteSweepIcon />} 
            onClick={() => setScannedList([])}
          >
            목록 비우기
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<SaveIcon />} 
            onClick={handleSave} 
            disabled={scannedList.length === 0 || !selectedTemplateId}
            sx={{ fontWeight: 'bold' }}
          >
            서버 일괄 저장
          </Button>
        </Stack>
      </Paper>

      {/* 스캔 목록 데이터 테이블 */}
      <Paper sx={{ height: 'calc(100vh - 350px)', width: '100%' }}>
        <DataTable 
          rows={scannedList} 
          columns={columns} 
        />
      </Paper>

    </Box>
  );
};

export default BarcodeScanPage;