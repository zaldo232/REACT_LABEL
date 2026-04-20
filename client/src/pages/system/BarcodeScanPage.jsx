/**
 * @file        BarcodeScanPage.jsx
 * @description 실시간 바코드 등록 및 자동 파싱 처리 페이지
 * (연결된 하드웨어 스캐너로부터 데이터를 받아와 양식의 구분자에 맞게 파싱하고, 대기 목록을 관리합니다. 한 화면에 꽉 차도록 레이아웃이 보정되었습니다.)
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

/**
 * [컴포넌트] BarcodeScanPage
 */
const BarcodeScanPage = () => {
  /** [영역 분리: 상태 관리 - 양식 및 스캔 데이터] */
  const [templates, setTemplates] = useState([]);                     // 서버에서 로드한 전체 라벨 양식 목록
  const [selectedTemplateId, setSelectedTemplateId] = useState('');   // 현재 선택된 양식 ID
  const [templateItems, setTemplateItems] = useState([]);             // 선택된 양식 내 가변 데이터 필드 항목들
  const [currentDelimiter, setCurrentDelimiter] = useState('_');      // 바코드 문자열 분할용 구분자
  const [metaData, setMetaData] = useState({});                       // 스캔으로 채워진 항목별 값 객체
  const [scannedList, setScannedList] = useState([]);                 // 서버 저장 전 대기 중인 스캔 데이터 목록
  
  /** [영역 분리: 전역 상태 관리] */
  const { 
    user, 
    lastScan, 
    isScannerConnected 
  } = useAppStore();

  /** [영역 분리: Ref 관리] 
   * 마지막으로 처리된 스캔 시간 타임스탬프
   * (React 렌더링 사이클에 의한 중복 처리 방지 및 초기 진입 시 과거 스캔 데이터 무시)
   */
  const lastProcessedTime = useRef(Date.now());

  /** [영역 분리: 부수 효과 (Effects)] */

  /** 컴포넌트 마운트 시 서버로부터 라벨 양식 목록 로드 */
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

  /** * 실시간 바코드 스캔 감지 및 자동 파싱 처리 
   * (Zustand 스토어의 lastScan 객체가 업데이트될 때마다 실행)
   */
  useEffect(() => {
    if (lastScan.barcode && lastScan.timestamp > lastProcessedTime.current) {
      // 1. 중복 실행 방지를 위해 최근 처리 시간 갱신
      lastProcessedTime.current = lastScan.timestamp;

      // 2. 양식 미선택 시 경고 및 로직 중단
      if (!selectedTemplateId) {
        showAlert("양식 미선택", "warning", "상단에서 라벨 양식을 먼저 선택해주세요.");
        return;
      }
      
      // 3. 설정된 구분자(Delimiter)로 스캔된 바코드 문자열을 배열로 분할
      const parts = lastScan.barcode.split(currentDelimiter);
      const updatedMeta = { ...metaData };

      // 4. 분할된 문자열을 순서대로 양식의 가변 데이터 필드에 매핑
      templateItems.forEach((item, index) => {
        if (parts[index]) {
          updatedMeta[item.label] = parts[index];
        }
      });

      // 5. 파싱 결과를 UI(TextField 렌더링 용)에 즉시 반영
      setMetaData(updatedMeta);

      // 6. 데이터 그리드(표)에 삽입할 신규 스캔 데이터 객체 생성
      const newEntry = {
        id: lastScan.timestamp,
        no: scannedList.length + 1,
        barcode: lastScan.barcode,
        scannedAt: new Date(lastScan.timestamp).toLocaleTimeString(),
        operator: user?.userName || '관리자',
        templateId: selectedTemplateId,
        ...updatedMeta 
      };

      // 7. 스캔 목록 최상단에 새 데이터 추가
      setScannedList((prev) => [newEntry, ...prev]);
    }
  }, [
    lastScan, 
    user, 
    metaData, 
    selectedTemplateId, 
    templateItems, 
    currentDelimiter, 
    scannedList.length
  ]);

  /** [영역 분리: 이벤트 핸들러] */

  /**
   * 라벨 양식 선택 변경 처리
   * @description 양식의 DesignJson을 분석하여 가변 데이터 필드(data)와 구분자(meta)를 동적으로 추출합니다.
   */
  const handleTemplateChange = (e) => {
    const tId = e.target.value;
    setSelectedTemplateId(tId);
    
    const target = templates.find(t => t.TemplateId === tId);
    if (target) {
      const fullDesign = JSON.parse(target.DesignJson || '[]');
      
      // 메타 정보에서 바코드 결합 구분자(Delimiter) 추출
      const metaItem = fullDesign.find(i => i.type === 'meta');
      setCurrentDelimiter(metaItem?.layout?.delimiter || '_');

      // 'data' 타입의 항목들만 필터링하여 동적 입력 필드 목록 생성
      const dataFields = fullDesign.filter(item => item.type === 'data');
      setTemplateItems(dataFields);
      
      // 항목별 데이터 빈 문자열로 초기화
      const initialMeta = {};
      dataFields.forEach(f => {
        initialMeta[f.label] = '';
      });
      setMetaData(initialMeta);
    }
  };

  /**
   * 항목 데이터 수동 입력 처리 (실제로는 ReadOnly로 동작함)
   */
  const handleMetaChange = (label, value) => {
    setMetaData(prev => ({ 
      ...prev, 
      [label]: value 
    }));
  };

  /** [영역 분리: 비즈니스 로직] */

  /**
   * 한국 시간(KST) 문자열 변환 함수
   * @param {number} timestamp - 밀리초 단위의 타임스탬프
   * @returns {string} 'YYYY-MM-DD HH:mm:ss' 형식의 KST 시간 문자열
   */
  const getKstString = (timestamp) => {
    const date = new Date(timestamp);
    const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
    return kstDate.toISOString().replace('T', ' ').substring(0, 19);
  };

  /**
   * 대기 중인 스캔 목록 서버 일괄 저장
   * @description 확인 팝업 호출 후, 스캔 시점의 타임스탬프를 기준으로 데이터를 서버에 전송합니다.
   */
  const handleSave = async () => {
    if (scannedList.length === 0) return;

    const isConfirmed = await showConfirm(
      "저장 확인", 
      `${scannedList.length}건의 데이터를 서버에 저장하시겠습니까?`
    );

    if (isConfirmed) {
      try {
        // 화면 표출을 위해 역순(최신순) 정렬된 배열을 다시 원래 시간순으로 돌려 Payload 생성
        const payload = scannedList.slice().reverse().map(item => {
          const { id, no, scannedAt, operator, templateId, barcode, ...restData } = item;
          
          return {
            barcode: barcode,
            scannedAt: getKstString(item.id), // 서버 저장을 위한 정밀한 KST 보정 시간 적용
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

  /** * 데이터 그리드 컬럼 구성 (Memoization) 
   * @description 선택된 양식의 가변 데이터 수에 따라 표의 컬럼이 동적으로 확장됩니다.
   */
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

    // 가변 데이터 필드를 데이터 그리드의 컬럼으로 매핑
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
        headerName: '바코드/시리얼 원문', 
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
    <Box 
      sx={{ 
        p: 3, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2,
        // ★ 일괄 160px 보정으로 외부 스크롤 강제 차단
        height: 'calc(100vh - 160px)',
        width: '100%',
        overflow: 'hidden'
      }}
    >
      
      {/* 1. 페이지 타이틀 */}
      <Typography 
        variant="h5" 
        fontWeight="bold"
        color="text.primary"
      >
        바코드 실시간 스캔 및 등록
      </Typography>

      {/* 2. 장치 연결 상태 알림 (미연결 시 경고 표시) */}
      {!isScannerConnected && (
        <Alert 
          severity="warning" 
          sx={{ 
            mb: 1 
          }}
        >
          장치 연결이 필요합니다. 좌측 사이드바 하단에서 <strong>[스캐너 연결]</strong>을 눌러주세요.
        </Alert>
      )}

      {/* 3. 상단 제어부: 양식 선택 및 데이터 파싱 결과 확인 */}
      <Paper 
        sx={{ 
          p: 2.5, 
          // 하드코딩 색상 제거, 테마 색상 연동
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          flexShrink: 0
        }}
      >
        <Stack 
          direction="row" 
          spacing={3} 
          alignItems="flex-start"
        >
          
          {/* 좌측: 라벨 양식 선택 Select */}
          <FormControl 
            size="small" 
            sx={{ 
              width: 250 
            }}
          >
            <InputLabel>
              라벨 양식 선택
            </InputLabel>
            <Select 
              value={selectedTemplateId} 
              label="라벨 양식 선택" 
              onChange={handleTemplateChange}
            >
              {templates.map(t => (
                <MenuItem 
                  key={t.TemplateId} 
                  value={t.TemplateId}
                >
                  {t.TemplateName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* 중앙 구분선 */}
          <Divider 
            orientation="vertical" 
            flexItem 
          />

          {/* 우측: 파싱 데이터 실시간 확인 영역 */}
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="caption" 
              color="primary" 
              fontWeight="bold"
            >
              항목 파싱 결과 (구분자: {currentDelimiter})
            </Typography>
            <Stack 
              direction="row" 
              spacing={1.5} 
              mt={1} 
              flexWrap="wrap" 
              useFlexGap
            >
              {templateItems.length === 0 ? (
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  양식을 선택하거나 가변 데이터가 있는 양식을 선택해주세요.
                </Typography>
              ) : (
                templateItems.map(item => (
                  <TextField 
                    key={item.id} 
                    label={item.label} 
                    size="small" 
                    value={metaData[item.label] || ''}
                    onChange={(e) => handleMetaChange(item.label, e.target.value)} 
                    sx={{ 
                      width: 140,
                      backgroundColor: 'action.hover' // 입력 불가 느낌을 주기 위해 살짝 어두운 배경 처리
                    }}
                    InputProps={{
                      readOnly: true, // 사용자가 수동으로 바꾸지 못하도록 읽기 전용 강제
                    }}
                  />
                ))
              )}
            </Stack>
          </Box>
        </Stack>
      </Paper>

      {/* 4. 중단 제어부: 상태바 및 저장 액션 버튼 */}
      <Paper 
        sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          backgroundColor: 'action.hover',
          flexShrink: 0
        }}
      >
        <Typography 
          variant="body2"
          color="text.primary"
        >
          현재 스캔 대기열: <b>{scannedList.length}</b>건
        </Typography>
        <Stack 
          direction="row" 
          spacing={1}
        >
          <Button 
            variant="outlined" 
            color="error" 
            startIcon={<DeleteSweepIcon />} 
            onClick={() => setScannedList([])}
            disabled={scannedList.length === 0}
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

      {/* 5. 하단: 스캔 데이터 실시간 리스트 (DataTable) */}
      <Paper 
        sx={{ 
          // flex: 1을 주어 남은 높이를 꽉 채우도록 설정
          flex: 1, 
          width: '100%',
          backgroundColor: 'background.paper',
          overflow: 'hidden'
        }}
      >
        <DataTable 
          rows={scannedList} 
          columns={columns} 
          pageSize={25}
        />
      </Paper>

    </Box>
  );
};

export default BarcodeScanPage;