/**
 * @file        BarcodeScanPage.jsx
 * @description 실시간 바코드 등록 및 자동 파싱 처리 페이지
 * (연결된 하드웨어 스캐너로부터 데이터를 받아와 양식의 구분자에 맞게 파싱하고, 대기 목록을 관리합니다.)
 * - [버그수정] 표(Table) 병합(Merge)으로 인해 가려진 유령 셀이 파싱 대상에 포함되어 스캔 데이터가 밀리던 현상 완벽 해결 (유령 셀 필터링 추가)
 * - [버그수정] 구분자가 없을 때(빈 문자열) 강제로 '_'로 덮어씌워지던 Falsy 로직 해결
 * - [버그수정] 양식 로드 시 독립 데이터(Data)/날짜(Date) 객체 및 표(Table) 내부의 가변 데이터 셀을 모두 추출하여 파싱 목록과 완벽 동기화
 */

import React, { 
  useState, 
  useEffect, 
  useRef, 
  useMemo 
} from 'react';
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
import { 
  showAlert, 
  showConfirm 
} from '../../utils/swal';

// =========================================================================
// 공통 유틸리티 헬퍼 함수
// =========================================================================

/**
 * 표(Table) 병합(RowSpan/ColSpan)으로 인해 화면과 데이터에서 
 * 가려져야 할 유령 셀들의 ID(row_col)를 Set으로 반환합니다.
 */
const getHiddenCells = (item) => {
  const hidden = new Set();
  if (item.type === 'table' && item.cells) {
    item.cells.forEach(c => {
      if ((c.rowSpan || 1) > 1 || (c.colSpan || 1) > 1) {
        for (let r = 0; r < (c.rowSpan || 1); r++) {
          for (let col = 0; col < (c.colSpan || 1); col++) {
            if (r === 0 && col === 0) continue;
            hidden.add(`${c.row + r}_${c.col + col}`);
          }
        }
      }
    });
  }
  return hidden;
};

/**
 * [컴포넌트] BarcodeScanPage
 */
const BarcodeScanPage = () => {
  /** [영역 분리: 상태 관리 - 양식 및 스캔 데이터] */
  const [templates, setTemplates] = useState([]);                     // 서버에서 로드한 전체 라벨 양식 목록
  const [selectedTemplateId, setSelectedTemplateId] = useState('');   // 현재 선택된 양식 ID
  const [templateItems, setTemplateItems] = useState([]);             // 선택된 양식 내 가변 데이터 필드 항목들 (표 셀 포함)
  const [currentDelimiter, setCurrentDelimiter] = useState('_');      // 바코드 문자열 분할용 구분자
  const [metaData, setMetaData] = useState({});                       // 스캔으로 채워진 항목별 값 객체
  const [scannedList, setScannedList] = useState([]);                 // 서버 저장 전 대기 중인 스캔 데이터 목록
  
  /** [영역 분리: 전역 상태 관리] */
  const { 
    user, 
    lastScan, 
    isScannerConnected 
  } = useAppStore();

  /** [영역 분리: Ref 관리] */
  const lastProcessedTime = useRef(Date.now());

  /** [영역 분리: 부수 효과 (Effects)] */
  
  // 1. 컴포넌트 마운트 시 양식 목록 로드
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

  // 2. 실시간 바코드 스캔 감지 로직
  useEffect(() => {
    // 값이 없거나, 이미 처리한 과거의 데이터라면 즉시 종료
    if (!lastScan || !lastScan.barcode || lastScan.timestamp <= lastProcessedTime.current) {
      return; 
    }

    console.log("📥 [스캔 데이터 수신됨]:", lastScan.barcode);

    // 새로운 데이터임이 확인되었으므로, 다음 중복 방지를 위해 처리 시간 즉시 갱신
    lastProcessedTime.current = lastScan.timestamp;

    // 양식을 선택하지 않았다면 파싱을 진행할 수 없으므로 경고창 띄우고 중단
    if (!selectedTemplateId) {
      showAlert("양식 미선택", "warning", "스캔을 진행하기 전에 상단에서 라벨 양식을 먼저 선택해주세요.");
      return;
    }
    
    // 구분자가 비어있을 경우, split("")으로 글자를 쪼개는 것을 막고 원문 전체를 할당
    const parts = currentDelimiter ? lastScan.barcode.split(currentDelimiter) : [lastScan.barcode];
    const updatedMeta = { ...metaData };

    // 순서대로 데이터 파싱 및 할당
    templateItems.forEach((item, index) => {
      if (parts[index]) {
        updatedMeta[item.label] = parts[index];
      }
    });

    setMetaData(updatedMeta);

    // 상태 업데이트 시 prev를 사용하여 scannedList를 의존성 배열에서 제거 (무한 렌더링 방지)
    setScannedList((prev) => {
      const newEntry = {
        id:         lastScan.timestamp,
        no:         prev.length + 1, 
        barcode:    lastScan.barcode,
        scannedAt:  new Date(lastScan.timestamp).toLocaleTimeString(),
        operator:   user?.userName || '관리자',
        templateId: selectedTemplateId,
        ...updatedMeta 
      };
      return [newEntry, ...prev];
    });

  }, [
    lastScan, 
    user, 
    metaData, 
    selectedTemplateId, 
    templateItems, 
    currentDelimiter
  ]);

  /** [영역 분리: 이벤트 핸들러] */
  const handleTemplateChange = (e) => {
    const tId = e.target.value;
    setSelectedTemplateId(tId);
    
    const target = templates.find(t => t.TemplateId === tId);
    if (target) {
      const fullDesign = JSON.parse(target.DesignJson || '[]');
      
      const metaItem = fullDesign.find(i => i.type === 'meta');
      
      // || 연산자 대신 명시적 undefined 체크로, 구분자가 ''(빈칸)인 설정을 완벽하게 존중
      const savedDelimiter = metaItem?.layout?.delimiter;
      setCurrentDelimiter(savedDelimiter !== undefined && savedDelimiter !== null ? savedDelimiter : '_');

      // ★ Data 뿐만 아니라 Date(날짜) 객체 및 표 내부 셀까지 모두 파싱 대상으로 추출 (유령 셀 제외)
      const dataFields = [];
      fullDesign.forEach(item => {
        if (item.type === 'data' || item.type === 'date') {
          dataFields.push({ 
            id:    item.id, 
            label: item.label || (item.type === 'date' ? '날짜' : '데이터') 
          });
        } else if (item.type === 'table' && item.cells) {
          const hiddenCells = getHiddenCells(item); // ★ 표 병합으로 가려진 유령 셀 파악
          item.cells.forEach(cell => {
            if (hiddenCells.has(`${cell.row}_${cell.col}`)) return; // ★ 가려진 셀은 파싱 항목에서 완벽히 제외!

            if (cell.cellType === 'data' || cell.cellType === 'date') {
              dataFields.push({ 
                id:    `${item.id}_${cell.row}_${cell.col}`, 
                label: cell.cellType === 'date' ? `표 셀(날짜)` : (cell.dataId || `표 셀(${cell.row + 1},${cell.col + 1})`) 
              });
            }
          });
        }
      });

      setTemplateItems(dataFields);
      
      const initialMeta = {};
      dataFields.forEach(f => {
        initialMeta[f.label] = '';
      });
      setMetaData(initialMeta);
    }
  };

  const handleMetaChange = (label, value) => {
    setMetaData(prev => ({ 
      ...prev, 
      [label]: value 
    }));
  };

  /** [영역 분리: 비즈니스 로직] */
  const getKstString = (timestamp) => {
    const date = new Date(timestamp);
    const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
    return kstDate.toISOString().replace('T', ' ').substring(0, 19);
  };

  /** 대기 중인 스캔 목록 서버 저장 */
  const handleSave = async () => {
    if (scannedList.length === 0) return;

    const isConfirmed = await showConfirm(
      "저장 확인", 
      `${scannedList.length}건의 데이터를 서버에 저장하시겠습니까?`
    );

    if (isConfirmed) {
      try {
        const payload = scannedList.slice().reverse().map(item => {
          const { 
            id, 
            no, 
            scannedAt, 
            operator, 
            templateId, 
            barcode, 
            ...restData 
          } = item;
          
          return {
            barcode:   barcode,
            scannedAt: getKstString(item.id),
            ...restData 
          };
        });

        const response = await apiClient.post('/system/scans', { 
          scanData:   payload, 
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

  /** [영역 분리: 데이터 그리드 컬럼] */
  const columns = useMemo(() => {
    const baseCols = [
      { 
        field:       'no', 
        headerName:  'No.', 
        width:       60, 
        align:       'center', 
        headerAlign: 'center' 
      }
    ];

    const dynamicCols = templateItems.map(item => ({
      field:       item.label, 
      headerName:  item.label, 
      width:       130, 
      headerAlign: 'center', 
      align:       'center'
    }));

    const endCols = [
      { 
        field:       'barcode', 
        headerName:  '바코드 원문', 
        flex:        1, 
        headerAlign: 'center' 
      },
      { 
        field:       'scannedAt', 
        headerName:  '스캔 시간', 
        width:       130, 
        align:       'center', 
        headerAlign: 'center' 
      },
      { 
        field:       'operator', 
        headerName:  '담당자', 
        width:       100, 
        align:       'center', 
        headerAlign: 'center' 
      },
    ];

    return [
      ...baseCols, 
      ...dynamicCols, 
      ...endCols
    ];
  }, [templateItems]);

  /** [렌더링 영역] */
  return (
    <Box 
      sx={{ 
        p:             3, 
        display:       'flex', 
        flexDirection: 'column', 
        gap:           2,
        height:        'calc(100vh - 160px)',
        width:         '100%',
        overflow:      'hidden'
      }}
    >
      <Typography 
        variant="h5" 
        fontWeight="bold"
        color="text.primary"
      >
        바코드 실시간 스캔 및 등록
      </Typography>

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

      <Paper 
        sx={{ 
          p:               2.5, 
          border:          '1px solid',
          borderColor:     'divider',
          backgroundColor: 'background.paper',
          flexShrink:      0
        }}
      >
        <Stack 
          direction="row" 
          spacing={3} 
          alignItems="flex-start"
        >
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

          <Divider 
            orientation="vertical" 
            flexItem 
          />

          <Box 
            sx={{ 
              flex: 1 
            }}
          >
            <Typography 
              variant="caption" 
              color="primary" 
              fontWeight="bold"
            >
              항목 파싱 결과 (구분자: {currentDelimiter === '' ? '없음' : currentDelimiter})
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
                  sx={{ 
                    mt: 1 
                  }}
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
                    InputProps={{
                      readOnly: true,
                    }}
                    sx={{ 
                      width:           140,
                      backgroundColor: 'action.hover'
                    }}
                  />
                ))
              )}
            </Stack>
          </Box>
        </Stack>
      </Paper>

      <Paper 
        sx={{ 
          p:               2, 
          display:         'flex', 
          justifyContent:  'space-between', 
          alignItems:      'center', 
          backgroundColor: 'action.hover',
          flexShrink:      0
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
            sx={{ 
              fontWeight: 'bold' 
            }}
          >
            서버 일괄 저장
          </Button>
        </Stack>
      </Paper>

      <Paper 
        sx={{ 
          flex:            1, 
          width:           '100%',
          backgroundColor: 'background.paper',
          overflow:        'hidden'
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