/**
 * @file        LabelPrintPage.jsx
 * @description 라벨 발행 관리 및 인쇄 시스템 페이지
 * - [버그수정] 일괄 데이터 입력창(마스터 필드)에 날짜(Date) 객체 데이터가 잘못 취합되어 1번 가변 데이터 필드로 밀려 들어가던 치명적 버그 완벽 해결
 * - [버그수정] 일괄 데이터 입력창(마스터 필드) 타이핑 시 스페이스바 튕김 및 글자 밀림 현상 완벽 해결 (포커스 디커플링 상태 연결)
 * - [기능유지] 양방향 데이터 일괄 입력, 엑셀 컬럼 자동 매핑, 대량 인쇄, 사용자 프리셋 저장 및 호출 완벽 지원
 */

import React, { 
  useState, 
  useRef, 
  useCallback, 
  useMemo,
  useEffect
} from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Stack, 
  TextField, 
  Divider, 
  CircularProgress, 
  ToggleButton, 
  ToggleButtonGroup, 
  IconButton,
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemText,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import LabelIcon from '@mui/icons-material/Label';
import CloseIcon from '@mui/icons-material/Close';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import SaveIcon from '@mui/icons-material/Save';
import BookmarkAddedIcon from '@mui/icons-material/BookmarkAdded';
import ViewListIcon from '@mui/icons-material/ViewList'; 
import { useReactToPrint } from 'react-to-print';
import Swal from 'sweetalert2'; 
import * as XLSX from 'xlsx';   
import LabelTemplate from '../../components/common/LabelTemplate';
import apiClient from '../../utils/apiClient';
import { 
  showAlert, 
  showConfirm 
} from '../../utils/swal';

const LabelPrintPage = () => {
  // =========================================================================
  // 상태 관리 (State Management)
  // =========================================================================
  const [templateId, setTemplateId] = useState(null);               
  const [templateName, setTemplateName] = useState('선택된 양식 없음'); 
  const [templateItems, setTemplateItems] = useState([]);           
  
  const [presetId, setPresetId] = useState(null);                   
  const [presetName, setPresetName] = useState('');                 
  const [dynamicData, setDynamicData] = useState({}); 
  const [copyCount, setCopyCount] = useState(1);                    
  const [printCopyCount, setPrintCopyCount] = useState(0);          

  const [excelDataList, setExcelDataList] = useState([]);   
  const [mappedDataList, setMappedDataList] = useState([]); 
  const [excelColumns, setExcelColumns] = useState([]);     

  const [layout, setLayout] = useState({
    labelW:       '100',     
    labelH:       '50',     
    cols:         '1',       
    rows:         '1',       
    marginTop:    '0',  
    marginLeft:   '0', 
    gap:          '0',        
    delimiter:    '_',
    excelMapping: {} 
  });

  const [previewMode, setPreviewMode] = useState('label');          
  const [zoom, setZoom] = useState(1.5); 
  const [isPreparing, setIsPreparing] = useState(false);            
  const [isPrinting, setIsPrinting] = useState(false); 
  
  const [openDbDialog, setOpenDbDialog] = useState(false);          
  const [openPresetListDialog, setOpenPresetListDialog] = useState(false); 
  const [savePresetDialogOpen, setSavePresetDialogOpen] = useState(false); 
  const [openMappingDialog, setOpenMappingDialog] = useState(false); 
  
  const [dbList, setDbList] = useState([]);                         
  const [presetList, setPresetList] = useState([]);                 
  const [presetNameInput, setPresetNameInput] = useState('');       

  const [masterInputText, setMasterInputText] = useState('');
  const [isMasterFocused, setIsMasterFocused] = useState(false);

  const printRef = useRef();         
  const fileInputRef = useRef(null); 
  const excelDataInputRef = useRef(null); 

  // =========================================================================
  // 로직 영역 (Data Formatting & Event Handlers)
  // =========================================================================

  const getKstFormattedDate = (format) => {
    if (!format) return '';
    const now = new Date();
    const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const pad = (n) => String(n).padStart(2, '0');
    return format
      .replace(/YYYY/g, kst.getUTCFullYear())
      .replace(/MM/g, pad(kst.getUTCMonth() + 1))
      .replace(/DD/g, pad(kst.getUTCDate()))
      .replace(/HH/g, pad(kst.getUTCHours()))
      .replace(/mm/g, pad(kst.getUTCMinutes()))
      .replace(/ss/g, pad(kst.getUTCSeconds()));
  };

  // ★ 버그 픽스: 마스터 데이터 취합 시 'date' 요소는 무조건 제외하고 순수 'data' 필드만 추적
  const combinedMasterData = useMemo(() => {
    const parts = [];
    let hasAnyContent = false;

    templateItems.forEach(item => {
      if (item.type === 'data') {
        const val = dynamicData[item.id] || '';
        if (val !== '') hasAnyContent = true;
        parts.push(val);
      } else if (item.type === 'table' && item.cells) {
        item.cells.forEach(cell => {
          if (cell.cellType === 'data') {
            const val = dynamicData[`${item.id}_${cell.row}_${cell.col}`] || '';
            if (val !== '') hasAnyContent = true;
            parts.push(val);
          }
        });
      }
    });

    if (!hasAnyContent) return '';
    
    // 후행 빈 문자열 제거
    let lastNonEmpty = -1;
    for (let idx = parts.length - 1; idx >= 0; idx--) {
      if (parts[idx] !== '') {
        lastNonEmpty = idx;
        break;
      }
    }
    const activeParts = parts.slice(0, lastNonEmpty + 1);

    return activeParts.join(layout.delimiter || '');
  }, [templateItems, dynamicData, layout.delimiter]);

  useEffect(() => {
    if (!isMasterFocused) {
      setMasterInputText(combinedMasterData);
    }
  }, [combinedMasterData, isMasterFocused]);

  const handleDynamicDataChange = (id, value) => { 
    setDynamicData((prev) => ({ 
      ...prev, 
      [id]: value 
    })); 
    
    if (mappedDataList.length > 0) {
      setMappedDataList((prev) => prev.map(data => ({
        ...data,
        [id]: value
      })));
    }
  };

  const handleMasterDataChange = (e) => {
    const newValue = e.target.value;
    setMasterInputText(newValue); 
    
    const delimiter = layout.delimiter || '';
    
    let totalFields = 0;
    templateItems.forEach(i => {
      if (i.type === 'data') totalFields++;
      else if (i.type === 'table' && i.cells) {
        i.cells.forEach(c => {
          if (c.cellType === 'data') totalFields++;
        });
      }
    });

    let parts = [];
    if (delimiter) {
      const splitArr = newValue.split(delimiter);
      if (splitArr.length > totalFields && totalFields > 0) {
        parts = splitArr.slice(0, totalFields - 1);
        parts.push(splitArr.slice(totalFields - 1).join(delimiter));
      } else {
        parts = splitArr;
      }
    } else {
      parts = [newValue];
    }

    let partIdx = 0;
    const newDynamicData = { ...dynamicData };

    templateItems.forEach((item) => {
      if (item.type === 'data') {
        newDynamicData[item.id] = parts[partIdx] !== undefined ? parts[partIdx] : '';
        partIdx++;
      } else if (item.type === 'table' && item.cells) {
        item.cells.forEach(cell => {
          if (cell.cellType === 'data') {
            newDynamicData[`${item.id}_${cell.row}_${cell.col}`] = parts[partIdx] !== undefined ? parts[partIdx] : '';
            partIdx++;
          }
        });
      }
    });

    setDynamicData(newDynamicData);

    if (mappedDataList.length > 0) {
      setMappedDataList((prev) => prev.map(data => ({
        ...data,
        ...newDynamicData
      })));
    }
  };

  const handleLayoutChange = (e) => {
    const { name, value } = e.target;
    setLayout((prev) => ({ 
      ...prev, 
      [name]: value 
    }));
  };
  
  const handleLayoutBlur = (e) => {
    const { name, value } = e.target;
    let val = parseFloat(value);
    if(name === 'labelW' || name === 'labelH') {
      if(isNaN(val) || val < 10) val = name === 'labelW' ? 100 : 50;
    } else if(name === 'cols' || name === 'rows') {
      if(isNaN(val) || val < 1) val = 1;
    } else {
      if(isNaN(val) || val < 0) val = 0;
    }
    setLayout((prev) => ({ 
      ...prev, 
      [name]: String(val) 
    }));
  };

  const getMappingTargets = useCallback(() => {
    const targets = [];
    templateItems.forEach(item => {
      if (item.type === 'data') {
        targets.push({ 
          id:      item.id, 
          name:    item.label || '데이터 개체', 
          isTable: false 
        });
      } else if (item.type === 'table' && item.cells) {
        item.cells.forEach(cell => {
          if (cell.cellType === 'data') {
            targets.push({ 
              id:      `${item.id}_${cell.row}_${cell.col}`, 
              name:    `표 셀: ${cell.dataId || 'DATA'}`, 
              isTable: true 
            });
          }
        });
      }
    });
    return targets;
  }, [templateItems]);

  const handlePreviewModeChange = (e, val) => {
    if (val) {
      setPreviewMode(val);
      setZoom(val === 'label' ? 1.5 : 0.4);
    }
  };

  const handleWheelZoom = (e) => {
    if (e.ctrlKey) {
      e.preventDefault(); 
      setZoom((prev) => {
        const newZoom = prev + (e.deltaY > 0 ? -0.1 : 0.1);
        return Math.min(Math.max(newZoom, 0.2), 3.0); 
      });
    }
  };

  const handleExcelDataImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        if (jsonData.length > 0) {
          const headers = Object.keys(jsonData[0]);
          setExcelColumns(headers);
          setExcelDataList(jsonData); 
          
          const newData = { ...dynamicData };
          if (layout.excelMapping) {
            Object.keys(layout.excelMapping).forEach(tid => {
              const col = layout.excelMapping[tid];
              if (jsonData[0][col] !== undefined) {
                newData[tid] = String(jsonData[0][col]);
              }
            });
          }
          setDynamicData(newData);
          setOpenMappingDialog(true);
          showAlert("연동 성공", "success", `총 ${jsonData.length}줄의 엑셀 데이터를 불러왔습니다.`);
        } else {
          showAlert("오류", "error", "엑셀 파일에 데이터가 없습니다.");
        }
      } catch (err) {
        showAlert("오류", "error", "엑셀/CSV 데이터 연동 처리 중 오류가 발생했습니다.");
      }
    };
    reader.readAsArrayBuffer(file);
    excelDataInputRef.current.value = null; 
  };

  const handleConfirmMapping = () => {
    const newMappedList = excelDataList.map((row) => {
      const rowData = { ...dynamicData }; 
      Object.keys(layout.excelMapping).forEach(targetId => {
        const colName = layout.excelMapping[targetId];
        if (colName && row[colName] !== undefined) {
          rowData[targetId] = String(row[colName]);
        }
      });
      return rowData;
    });

    setMappedDataList(newMappedList);
    if (newMappedList.length > 0) {
      setDynamicData(newMappedList[0]);
    }
    
    setOpenMappingDialog(false);
    showAlert("매핑 완료", "success", `총 ${newMappedList.length}건의 대량 인쇄 준비가 완료되었습니다.`);
  };

  const generatePrintPages = () => {
    const labelsPerPage = (parseInt(layout.cols) || 1) * (parseInt(layout.rows) || 1);
    let labelsToPrint = [];

    if (mappedDataList.length > 0) {
      const copies = parseInt(copyCount) || 1;
      mappedDataList.forEach(data => {
        for (let i = 0; i < copies; i++) {
          labelsToPrint.push(data);
        }
      });
    } else {
      const copies = parseInt(copyCount) || 1;
      const totalLabels = copies * labelsPerPage;
      labelsToPrint = Array(totalLabels).fill(dynamicData);
    }

    const pages = [];
    for (let i = 0; i < labelsToPrint.length; i += labelsPerPage) {
      pages.push(labelsToPrint.slice(i, i + labelsPerPage));
    }
    return pages;
  };

  const handlePrint = useReactToPrint({
    contentRef:    printRef, 
    documentTitle: `LabelPrint_${templateName}`,
    onAfterPrint:  () => { 
      setIsPreparing(false); 
      setIsPrinting(false);
      setPrintCopyCount(0); 
    },
  });

  const onPreparePrint = async () => {
    if (!templateId) return showAlert("경고", "warning", "먼저 양식을 선택하세요.");
    setIsPreparing(true);
    
    const now = new Date();
    const kstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000))
      .toISOString()
      .replace('T', ' ')
      .substring(0, 19);

    const getFormattedDateString = (format) => {
      const d = new Date();
      const kst = new Date(d.getTime() + (9 * 60 * 60 * 1000));
      const pad = n => String(n).padStart(2, '0');
      return (format || '')
        .replace(/YYYY/g, kst.getUTCFullYear())
        .replace(/MM/g, pad(kst.getUTCMonth() + 1))
        .replace(/DD/g, pad(kst.getUTCDate()))
        .replace(/HH/g, pad(kst.getUTCHours()))
        .replace(/mm/g, pad(kst.getUTCMinutes()))
        .replace(/ss/g, pad(kst.getUTCSeconds()))
        .replace(/[-_:\s]/g, '');
    };

    const dataListToPrint = mappedDataList.length > 0 ? mappedDataList : [dynamicData];
    
    const labelDataPayload = dataListToPrint.map((dataItem) => {
      const combinedParts = [];
      let hasAnyContent = false;
      const dynamicDataForDB = {};

      templateItems.forEach((item) => {
        if (item.type === 'data' || item.type === 'date') {
          let val = item.type === 'date' 
            ? getFormattedDateString(item.content) 
            : (dataItem[item.id] || '');
          
          if (val !== '') hasAnyContent = true;
          combinedParts.push(`${item.prefix || ''}${val}${item.suffix || ''}`);
          
          if (item.type === 'data') {
            dynamicDataForDB[item.label] = dataItem[item.id] || '';
          }
        } else if (item.type === 'table' && item.cells) {
          item.cells.forEach(cell => {
            if (cell.cellType === 'data' || cell.cellType === 'date') {
              let val = cell.cellType === 'date' 
                ? getFormattedDateString(cell.content || 'YYYY-MM-DD') 
                : (dataItem[`${item.id}_${cell.row}_${cell.col}`] || '');
              
              if (val !== '') hasAnyContent = true;
              combinedParts.push(`${cell.prefix || ''}${val}${cell.suffix || ''}`);
              
              if (cell.cellType === 'data') {
                const label = cell.dataId || `표 셀(${cell.row + 1},${cell.col + 1})`;
                dynamicDataForDB[label] = dataItem[`${item.id}_${cell.row}_${cell.col}`] || '';
              }
            }
          });
        }
      });

      const combinedValue = hasAnyContent ? combinedParts.join(layout.delimiter || '') : '';

      return { 
        barcode:   combinedValue || 'NO_DATA', 
        scannedAt: kstDate,
        ...dynamicDataForDB 
      };
    });

    try {
      await apiClient.post('/label/save', { 
        labelData:  labelDataPayload,
        templateId: templateId 
      });

      setPrintCopyCount(parseInt(copyCount) || 1);
      setIsPrinting(true); 
      
      showAlert("준비 완료", "success", "잠시 후 인쇄 창이 열립니다.");
      
      setTimeout(() => { 
        Swal.close(); 
        handlePrint(); 
      }, 800); 
    } catch (err) { 
      showAlert("오류", "error", "출력 이력 저장 중 통신 실패");
      setIsPreparing(false); 
    }
  };

  const applyTemplate = (json, isPreset = false) => {
    setTemplateId(json.templateId || json.TemplateId || null); 
    setTemplateName(json.templateName || json.TemplateName || '불러온 양식');
    
    const rawItems = json.items || JSON.parse(json.DesignJson || '[]');
    let extractedLayout = { 
      labelW:       json.LabelW, 
      labelH:       json.LabelH, 
      cols:         json.Cols, 
      rows:         json.Rows, 
      marginTop:    json.MarginTop, 
      marginLeft:   json.MarginLeft, 
      gap:          json.Gap, 
      delimiter:    '_',
      excelMapping: {} 
    };

    if (json.layout) {
      extractedLayout = { 
        ...extractedLayout, 
        ...json.layout 
      };
    }

    let extractedItems = rawItems;
    if (rawItems.length > 0 && rawItems[0].type === 'meta') {
      extractedLayout = { 
        ...extractedLayout, 
        ...rawItems[0].layout 
      };
      extractedItems = rawItems.slice(1);
    }

    const newLayout = isPreset ? JSON.parse(json.LayoutJson) : extractedLayout;
      
    setLayout((prev) => ({ 
      ...prev, 
      ...newLayout 
    }));
    
    setTemplateItems(extractedItems);
    setMappedDataList([]); 

    if (isPreset) {
      setDynamicData(JSON.parse(json.DynamicDataJson)); 
      setCopyCount(json.CopyCount || 1); 
      setPresetId(json.PresetId); 
      setPresetName(json.PresetName); 
      setPresetNameInput(json.PresetName);
    } else {
      const initialData = {}; 
      extractedItems.forEach((item) => {
        if (item.type === 'data') {
          initialData[item.id] = '';
        } else if (item.type === 'table' && item.cells) {
          item.cells.forEach(cell => {
            if (cell.cellType === 'data') {
              initialData[`${item.id}_${cell.row}_${cell.col}`] = '';
            }
          });
        }
      });
        
      setDynamicData(initialData); 
      setPresetId(null); 
      setPresetName('');
    }
  };

  const handleFetchDbList = async () => {
    try { 
      const res = await apiClient.get('/label/template/list'); 
      setDbList(res.data.data || []); 
      setOpenDbDialog(true); 
    } catch (err) { 
      showAlert("조회 실패", "error", "서버로부터 양식 목록을 가져오지 못했습니다."); 
    }
  };

  const fetchPresetList = async () => {
    try { 
      const res = await apiClient.get('/label/preset/list'); 
      setPresetList(res.data.data || []); 
      setOpenPresetListDialog(true); 
    } catch (err) { 
      showAlert("조회 실패", "error", "프리셋 목록 로드 실패"); 
    }
  };

  const handleDeleteItem = async (e, type, id, name) => {
    e.stopPropagation(); 
    
    const confirmed = await showConfirm(
      `${type === 'template' ? '양식' : '프리셋'} 삭제`,
      `[${name}] 항목을 삭제하시겠습니까?\n삭제 후에도 데이터베이스에는 보관됩니다.`
    );

    if (confirmed) {
      try {
        const res = await apiClient.delete(`/label/${type}/${id}`);
        if (res.data.success) {
          showAlert("삭제 성공", "success", "정상적으로 삭제 처리되었습니다.");
          type === 'template' ? handleFetchDbList() : fetchPresetList();
        }
      } catch (err) {
        showAlert("삭제 실패", "error", "서버 통신 중 오류가 발생했습니다.");
      }
    }
  };

  const executeSavePreset = async (targetId) => {
    if (!templateId) {
      return showAlert("경고", "warning", "원본 양식을 먼저 선택하세요.");
    }
    if (!presetNameInput.trim()) {
      return showAlert("경고", "warning", "프리셋 이름을 입력하세요.");
    }

    try {
      const payload = { 
        presetId:        targetId, 
        presetName:      presetNameInput, 
        templateId, 
        dynamicDataJson: JSON.stringify(dynamicData), 
        layoutJson:      JSON.stringify(layout), 
        copyCount 
      };
      
      const res = await apiClient.post('/label/preset/save', payload);
      setPresetId(res.data.resultId); 
      setPresetName(presetNameInput); 
      setSavePresetDialogOpen(false); 
      
      showAlert("저장 완료", "success", "현재 설정이 사용자 프리셋으로 등록되었습니다.");
    } catch (err) { 
      showAlert("저장 실패", "error", "데이터 저장 중 서버 에러 발생"); 
    }
  };

  const handleImportJson = (e) => {
    const file = e.target.files[0]; 
    if (!file) return;
    
    const reader = new FileReader(); 
    reader.onload = (event) => { 
      try { 
        applyTemplate(JSON.parse(event.target.result), false); 
        showAlert("가져오기 성공", "success", "파일에서 양식을 읽어왔습니다."); 
      } catch (err) { 
        showAlert("형식 오류", "error", "올바른 템플릿 JSON 파일이 아닙니다."); 
      } 
    };
    reader.readAsText(file); 
    e.target.value = null;
  };

  // =========================================================================
  // 렌더링 영역 (Render)
  // =========================================================================
  return (
    <Box 
      sx={{ 
        display:       'flex', 
        flexDirection: 'column', 
        gap:           2,
        height:        'calc(100vh - 160px)', 
        width:         '100%',
        overflow:      'hidden' 
      }}
    >
      <Stack 
        direction="row" 
        justifyContent="space-between" 
        alignItems="center"
      >
        <Typography 
          variant="h5" 
          fontWeight="bold" 
          color="text.primary"
        >
          라벨 발행 관리 시스템
        </Typography>
        
        <Stack 
          direction="row" 
          spacing={1}
        >
          <Button 
            variant="outlined" 
            color="inherit" 
            startIcon={<FolderOpenIcon />} 
            onClick={handleFetchDbList}
          >
            원본 불러오기
          </Button>
          
          <Button 
            variant="outlined" 
            color="secondary" 
            startIcon={<FileUploadIcon />} 
            onClick={() => fileInputRef.current.click()}
          >
            파일 열기
          </Button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept=".json" 
            onChange={handleImportJson} 
          />
          
          <Divider 
            orientation="vertical" 
            flexItem 
            sx={{ mx: 1 }} 
          />
          
          <Button 
            variant="outlined" 
            color="primary" 
            startIcon={<BookmarkAddedIcon />} 
            onClick={fetchPresetList}
          >
            내 프리셋 불러오기
          </Button>
          
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<SaveIcon />} 
            onClick={() => setSavePresetDialogOpen(true)} 
            disabled={!templateId}
          >
            현재 설정 저장
          </Button>
        </Stack>
      </Stack>

      <Stack 
        direction="row" 
        spacing={2} 
        alignItems="stretch" 
        sx={{ 
          flex:      1, 
          minHeight: 0, 
          width:     '100%', 
          overflow:  'hidden' 
        }}
      >
        {/* 좌측 패널 (데이터 및 설정 입력) */}
        <Paper 
          sx={{ 
            p:               3, 
            width:           450, 
            minWidth:        450, 
            flexShrink:      0, 
            backgroundColor: 'background.paper', 
            height:          '100%', 
            overflowY:       'auto', 
            display:         'flex', 
            flexDirection:   'column' 
          }}
        >
          <Stack 
            spacing={2} 
            sx={{ flex: 1 }}
          >
            <Typography 
              variant="h6" 
              color="primary" 
              fontWeight="bold"
            >
              [{templateName}] 
              {presetName && (
                <span 
                  style={{ 
                    color:      'text.secondary', 
                    fontSize:   '14px', 
                    marginLeft: 8 
                  }}
                >
                  (프리셋: {presetName})
                </span>
              )}
            </Typography>
            
            <Divider />

            <Stack 
              direction="row" 
              justifyContent="space-between" 
              alignItems="center"
            >
              <Typography 
                variant="subtitle2" 
                fontWeight="bold" 
                color="primary"
              >
                1. 가변 데이터 입력 {mappedDataList.length > 0 && <span style={{color:'red'}}>(대량 모드)</span>}
              </Typography>
              <Button 
                size="small" 
                variant="text" 
                startIcon={<ViewListIcon sx={{ fontSize: 16 }}/>} 
                onClick={() => excelDataInputRef.current.click()}
              >
                데이터 연동
              </Button>
              <input 
                type="file" 
                ref={excelDataInputRef} 
                style={{ display: 'none' }} 
                accept=".xlsx, .xls, .csv" 
                onChange={handleExcelDataImport} 
              />
            </Stack>
            
            {templateItems.filter((item) => item.type === 'data' || item.type === 'table').length === 0 ? (
               <Typography 
                 variant="body2" 
                 color="text.secondary"
               >
                 가변 데이터 항목이 없는 양식입니다.
               </Typography>
            ) : (
              <Stack spacing={1.5}>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p:               1.5, 
                    mb:              1, 
                    backgroundColor: 'rgba(2, 136, 209, 0.08)', 
                    borderColor:     'info.main' 
                  }}
                >
                  <Typography 
                    variant="caption" 
                    fontWeight="bold" 
                    color="info.main" 
                    display="block" 
                    mb={1}
                  >
                    💡 일괄 데이터 입력 (양방향 스캔 동기화)
                  </Typography>
                  <TextField 
                    label="바코드 스캔 데이터 등 일괄 입력" 
                    size="small" 
                    fullWidth 
                    multiline 
                    minRows={2} 
                    value={masterInputText} 
                    onChange={handleMasterDataChange} 
                    onFocus={() => setIsMasterFocused(true)}
                    onBlur={() => setIsMasterFocused(false)}
                    sx={{ backgroundColor: '#fff' }} 
                    helperText={`구분자 '${layout.delimiter || '없음'}' 기준으로 아래 필드에 분배됩니다.`} 
                  />
                </Paper>

                <Divider sx={{ mb: 1 }} />

                {templateItems.filter((item) => item.type === 'data').map((item) => (
                  <TextField 
                    key={item.id} 
                    label={item.label} 
                    fullWidth 
                    size="small" 
                    value={dynamicData[item.id] || ''} 
                    onChange={(e) => handleDynamicDataChange(item.id, e.target.value)} 
                  />
                ))}
                {templateItems.filter((item) => item.type === 'table').map((table) => (
                  table.cells?.filter(c => c.cellType === 'data').map((cell) => (
                    <TextField 
                      key={`${table.id}_${cell.row}_${cell.col}`} 
                      label={`표 셀: ${cell.dataId || '데이터'}`} 
                      fullWidth 
                      size="small" 
                      value={dynamicData[`${table.id}_${cell.row}_${cell.col}`] || ''} 
                      onChange={(e) => handleDynamicDataChange(`${table.id}_${cell.row}_${cell.col}`, e.target.value)} 
                      sx={{ backgroundColor: 'action.hover' }} 
                    />
                  ))
                ))}
              </Stack>
            )}

            <Divider />

            <Typography 
              variant="subtitle2" 
              fontWeight="bold" 
              color="primary"
            >
              2. 라벨 규격 설정 (mm)
            </Typography>
            <Stack 
              direction="row" 
              spacing={1}
            >
              <TextField 
                label="라벨 너비" 
                name="labelW" 
                type="number" 
                size="small" 
                fullWidth 
                value={layout.labelW ?? ''} 
                onChange={handleLayoutChange} 
                onBlur={handleLayoutBlur} 
              />
              <TextField 
                label="라벨 높이" 
                name="labelH" 
                type="number" 
                size="small" 
                fullWidth 
                value={layout.labelH ?? ''} 
                onChange={handleLayoutChange} 
                onBlur={handleLayoutBlur} 
              />
            </Stack>
            
            <TextField 
              label="바코드 구분자" 
              size="small" 
              fullWidth 
              value={layout.delimiter} 
              helperText="바코드 결합 기준 (읽기 전용)" 
              InputProps={{ readOnly: true }} 
              sx={{ backgroundColor: 'action.hover' }} 
            />

            <Divider />

            <Typography 
              variant="subtitle2" 
              fontWeight="bold" 
              color="primary"
            >
              3. 인쇄 배치 및 여백
            </Typography>
            
            <Stack 
              direction="row" 
              spacing={1}
            >
              <TextField 
                label="가로 개수" 
                name="cols" 
                type="number" 
                size="small" 
                fullWidth 
                value={layout.cols ?? ''} 
                onChange={handleLayoutChange} 
                onBlur={handleLayoutBlur} 
              />
              <TextField 
                label="세로 개수" 
                name="rows" 
                type="number" 
                size="small" 
                fullWidth 
                value={layout.rows ?? ''} 
                onChange={handleLayoutChange} 
                onBlur={handleLayoutBlur} 
              />
            </Stack>
            
            <Stack 
              direction="row" 
              spacing={1}
            >
              <TextField 
                label="상단 여백" 
                name="marginTop" 
                type="number" 
                size="small" 
                fullWidth 
                value={layout.marginTop ?? ''} 
                onChange={handleLayoutChange} 
                onBlur={handleLayoutBlur} 
              />
              <TextField 
                label="좌측 여백" 
                name="marginLeft" 
                type="number" 
                size="small" 
                fullWidth 
                value={layout.marginLeft ?? ''} 
                onChange={handleLayoutChange} 
                onBlur={handleLayoutBlur} 
              />
            </Stack>
            
            <Stack 
              direction="row" 
              spacing={1}
            >
              <TextField 
                label="라벨 간격" 
                name="gap" 
                type="number" 
                size="small" 
                fullWidth 
                value={layout.gap ?? ''} 
                onChange={handleLayoutChange} 
                onBlur={handleLayoutBlur} 
              />
              <TextField 
                label="인쇄 쪽수 (각 라벨별 복사매수)" 
                type="number" 
                size="small" 
                fullWidth
                value={copyCount ?? ''} 
                onChange={(e) => setCopyCount(e.target.value)} 
                onBlur={(e) => {
                  let val = parseFloat(e.target.value);
                  if (isNaN(val) || val < 1) val = 1;
                  setCopyCount(String(val));
                }}
                helperText={mappedDataList.length > 0 ? "전체 리스트 반복 횟수" : ""}
              />
            </Stack>

            <Box sx={{ flexGrow: 1 }} />

            <Button 
              variant="contained" 
              size="large" 
              fullWidth 
              startIcon={isPreparing ? <CircularProgress size={20} color="inherit" /> : <PrintIcon />} 
              onClick={onPreparePrint} 
              disabled={templateItems.length === 0 || isPreparing} 
              color="primary" 
              sx={{ fontWeight: 'bold', py: 1.5, mt: 1 }}
            >
              {isPreparing 
                ? "준비 중..." 
                : `${mappedDataList.length > 0 ? `총 ${mappedDataList.length * copyCount}장 대량 인쇄` : `${copyCount}쪽 인쇄하기`}`
              }
            </Button>
          </Stack>
        </Paper>

        {/* 우측 캔버스 미리보기 패널 */}
        <Box 
          sx={{ 
            flex:          1, 
            display:       'flex', 
            flexDirection: 'column', 
            gap:           2, 
            minWidth:      0, 
            height:        '100%' 
          }}
        >
          <Stack 
            direction="row" 
            justifyContent="space-between" 
            alignItems="center"
          >
            <Typography 
              variant="subtitle1" 
              fontWeight="bold" 
              color="text.primary"
            >
              인쇄물 미리보기 {mappedDataList.length > 0 && <Typography component="span" variant="caption" color="error">(첫 행 데이터)</Typography>}
            </Typography>
            
            <Stack 
              direction="row" 
              spacing={2} 
              alignItems="center"
            >
              <Typography variant="caption" fontWeight="bold">Zoom</Typography>
              <Slider 
                size="small" 
                value={zoom} 
                min={0.2} 
                max={3} 
                step={0.1} 
                onChange={(e, v) => setZoom(v)} 
                sx={{ width: 80 }} 
              />
              <Typography 
                variant="caption" 
                sx={{ 
                  width:     35, 
                  textAlign: 'right', 
                  color:     'text.secondary' 
                }}
              >
                {Math.round(zoom * 100)}%
              </Typography>

              <Divider 
                orientation="vertical" 
                flexItem 
                sx={{ mx: 1 }} 
              />

              <ToggleButtonGroup 
                value={previewMode} 
                exclusive 
                onChange={handlePreviewModeChange} 
                size="small" 
                color="primary"
              >
                <ToggleButton value="label" sx={{ px: 2 }}>
                  <LabelIcon sx={{ mr: 1, fontSize: 18 }} /> 라벨 모드
                </ToggleButton>
                <ToggleButton value="page" sx={{ px: 2 }}>
                  <AspectRatioIcon sx={{ mr: 1, fontSize: 18 }} /> 배치 모드
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Stack>

          <Paper 
            onWheel={handleWheelZoom}
            sx={{ 
              p:               4, 
              backgroundColor: (theme) => theme.palette.layout.design.canvasBg, 
              display:         'flex', 
              justifyContent:  'center', 
              alignItems:      'flex-start', 
              flex:            1, 
              overflow:        'auto' 
            }}
          >
            {previewMode === 'label' ? (
              <Box sx={{ zoom: zoom, boxShadow: '0 10px 30px rgba(0,0,0,0.1)', mt: 5 }}>
                <LabelTemplate 
                  items={templateItems} 
                  dynamicData={dynamicData} 
                  width={layout.labelW} 
                  height={layout.labelH} 
                  delimiter={layout.delimiter} 
                />
              </Box>
            ) : (
              <Box 
                sx={{ 
                  zoom:            zoom, 
                  boxShadow:       '0 10px 30px rgba(0,0,0,0.2)', 
                  backgroundColor: '#ffffff', 
                  paddingTop:      `${parseFloat(layout.marginTop || 0)}mm`, 
                  paddingLeft:     `${parseFloat(layout.marginLeft || 0)}mm`, 
                  paddingRight:    `${parseFloat(layout.marginLeft || 0)}mm`, 
                  paddingBottom:   `${parseFloat(layout.marginTop || 0)}mm`,
                  width:           'max-content', 
                  minHeight:       'max-content' 
                }}
              >
                <div 
                  style={{ 
                    display:             'grid', 
                    gridTemplateColumns: `repeat(${parseInt(layout.cols) || 1}, ${parseFloat(layout.labelW || 0)}mm)`, 
                    gap:                 `${parseFloat(layout.gap || 0)}mm` 
                  }}
                >
                  {(() => {
                    const labelsPerPage = (parseInt(layout.cols) || 1) * (parseInt(layout.rows) || 1);
                    let previewItems = [];
                    
                    if (mappedDataList.length > 0) {
                      const copies = parseInt(copyCount) || 1;
                      const expanded = [];
                      for (let data of mappedDataList) {
                        for (let i = 0; i < copies; i++) {
                          expanded.push(data);
                        }
                      }
                      previewItems = expanded.slice(0, labelsPerPage);
                    } else {
                      previewItems = Array(labelsPerPage).fill(dynamicData);
                    }
                    
                    return previewItems.map((dataItem, i) => (
                      <LabelTemplate 
                        key={i} 
                        items={templateItems} 
                        dynamicData={dataItem} 
                        width={layout.labelW} 
                        height={layout.labelH} 
                        delimiter={layout.delimiter} 
                      />
                    ));
                  })()}
                </div>
              </Box>
            )}
          </Paper>
        </Box>
      </Stack>

      {/* --- 실제 인쇄용 숨김 영역 --- */}
      <div 
        style={{ 
          position: 'absolute', 
          top:      '-9999px', 
          left:     '-9999px' 
        }}
      >
        {isPrinting && (
          <div ref={printRef}>
            {generatePrintPages().map((pageLabels, pageIdx) => (
              <div 
                key={pageIdx} 
                style={{ 
                  pageBreakAfter:  'always', 
                  paddingTop:      `${parseFloat(layout.marginTop || 0)}mm`, 
                  paddingLeft:     `${parseFloat(layout.marginLeft || 0)}mm`, 
                  backgroundColor: '#ffffff', 
                  width:           'max-content', 
                  minHeight:       'max-content' 
                }}
              >
                <div 
                  style={{ 
                    display:             'grid', 
                    gridTemplateColumns: `repeat(${parseInt(layout.cols) || 1}, ${parseFloat(layout.labelW || 0)}mm)`, 
                    gap:                 `${parseFloat(layout.gap || 0)}mm` 
                  }}
                >
                  {pageLabels.map((dataItem, itemIdx) => (
                    <LabelTemplate 
                      key={itemIdx} 
                      items={templateItems} 
                      dynamicData={dataItem} 
                      width={layout.labelW} 
                      height={layout.labelH} 
                      delimiter={layout.delimiter} 
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 엑셀 데이터 매핑 팝업 모달 */}
      <Dialog 
        open={openMappingDialog} 
        onClose={() => setOpenMappingDialog(false)} 
        fullWidth 
        maxWidth="sm"
      >
        <DialogTitle>엑셀 컬럼 자동 매핑 설정</DialogTitle>
        <DialogContent dividers>
          <List>
            {getMappingTargets().map(target => (
              <ListItem 
                key={target.id} 
                sx={{ borderBottom: '1px solid #f0f0f0' }}
              >
                <ListItemText primary={target.name} />
                <FormControl 
                  size="small" 
                  sx={{ width: 220 }}
                >
                  <InputLabel>엑셀 컬럼 선택</InputLabel>
                  <Select 
                    value={layout.excelMapping?.[target.id] || ''} 
                    label="엑셀 컬럼 선택" 
                    onChange={(e) => {
                      const newMapping = { 
                        ...layout.excelMapping, 
                        [target.id]: e.target.value 
                      };
                      setLayout({ ...layout, excelMapping: newMapping });
                    }}
                  >
                    <MenuItem value=""><em>선택하지 않음</em></MenuItem>
                    {excelColumns.map(col => (
                      <MenuItem 
                        key={col} 
                        value={col}
                      >
                        {col}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </ListItem>
            ))}
            {getMappingTargets().length === 0 && (
              <Typography 
                variant="body2" 
                sx={{ p: 2 }}
              >
                연결 가능한 데이터 필드가 없습니다.
              </Typography>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMappingDialog(false)}>취소</Button>
          <Button 
            onClick={handleConfirmMapping} 
            color="primary" 
            variant="contained"
          >
            적용 및 대량 인쇄 준비
          </Button>
        </DialogActions>
      </Dialog>

      {/* 모달: 양식 로드 */}
      <Dialog 
        open={openDbDialog} 
        onClose={() => setOpenDbDialog(false)} 
        fullWidth 
        maxWidth="xs"
      >
        <DialogTitle>원본 양식 선택 (초기화)</DialogTitle>
        <DialogContent dividers>
          <List>
            {dbList.map((t) => (
              <ListItem 
                key={t.TemplateId} 
                disablePadding
                secondaryAction={
                  <IconButton 
                    edge="end" 
                    color="error" 
                    size="small" 
                    onClick={(e) => handleDeleteItem(e, 'template', t.TemplateId, t.TemplateName)}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemButton 
                  onClick={() => { 
                    applyTemplate(t, false); 
                    setOpenDbDialog(false); 
                  }}
                >
                  <ListItemText 
                    primary={t.TemplateName} 
                    secondary={`${t.LabelW}x${t.LabelH} mm`} 
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      {/* 모달: 프리셋 로드 */}
      <Dialog 
        open={openPresetListDialog} 
        onClose={() => setOpenPresetListDialog(false)} 
        fullWidth 
        maxWidth="sm"
      >
        <DialogTitle>사용자 저장 프리셋 선택</DialogTitle>
        <DialogContent dividers>
          <List>
            {presetList.length > 0 ? presetList.map((p) => (
              <ListItem 
                key={p.PresetId} 
                disablePadding
                secondaryAction={
                  <IconButton 
                    edge="end" 
                    color="error" 
                    size="small" 
                    onClick={(e) => handleDeleteItem(e, 'preset', p.PresetId, p.PresetName)}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemButton 
                  onClick={() => { 
                    applyTemplate(p, true); 
                    setOpenPresetListDialog(false); 
                  }}
                >
                  <ListItemText 
                    primary={p.PresetName} 
                    secondary={`원본: ${p.TemplateName} | 출력 설정: ${p.CopyCount}장`} 
                  />
                </ListItemButton>
              </ListItem>
            )) : (
              <Typography 
                variant="body2" 
                sx={{ p: 2 }}
              >
                저장된 프리셋 기록이 없습니다.
              </Typography>
            )}
          </List>
        </DialogContent>
      </Dialog>

      {/* 모달: 프리셋 저장 */}
      <Dialog 
        open={savePresetDialogOpen} 
        onClose={() => setSavePresetDialogOpen(false)} 
        fullWidth 
        maxWidth="xs"
      >
        <DialogTitle>현재 인쇄 설정 저장</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField 
            label="저장할 프리셋 이름" 
            fullWidth 
            value={presetNameInput} 
            onChange={(e) => setPresetNameInput(e.target.value)} 
            size="small" 
            autoFocus 
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          {presetId && (
            <Button 
              variant="contained" 
              onClick={() => executeSavePreset(presetId)}
            >
              기존 프리셋 업데이트
            </Button>
          )}
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={() => executeSavePreset(null)}
          >
            신규 저장
          </Button>
          <Button onClick={() => setSavePresetDialogOpen(false)}>취소</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LabelPrintPage;