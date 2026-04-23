/**
 * @file        LabelPrintPage.jsx
 * @description 라벨 발행 관리 및 인쇄 시스템 페이지
 * (인쇄 미리보기 시 발생하는 '준비 완료' 모달창 멈춤 현상을 강제 종료 로직으로 해결한 전체 코드입니다.)
 */

import React, { useState, useRef } from 'react';
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
  Slider 
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import LabelIcon from '@mui/icons-material/Label';
import CloseIcon from '@mui/icons-material/Close';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import SaveIcon from '@mui/icons-material/Save';
import BookmarkAddedIcon from '@mui/icons-material/BookmarkAdded';
import { useReactToPrint } from 'react-to-print';
import Swal from 'sweetalert2'; // ★ 인쇄 모달 강제 종료를 위해 SweetAlert2 직접 임포트
import LabelTemplate from '../../components/common/LabelTemplate';
import apiClient from '../../utils/apiClient';
import { 
  showAlert, 
  showConfirm 
} from '../../utils/swal';

/**
 * [컴포넌트] LabelPrintPage
 */
const LabelPrintPage = () => {
  /** [영역 분리: 상태 관리 - 원본 양식(템플릿) 정보] */
  const [templateId, setTemplateId] = useState(null);               
  const [templateName, setTemplateName] = useState('선택된 양식 없음'); 
  const [templateItems, setTemplateItems] = useState([]);           
  
  /** [영역 분리: 상태 관리 - 프리셋 및 입력 데이터] */
  const [presetId, setPresetId] = useState(null);                   
  const [presetName, setPresetName] = useState('');                 
  const [dynamicData, setDynamicData] = useState({});               
  const [copyCount, setCopyCount] = useState(1);                    
  const [printCopyCount, setPrintCopyCount] = useState(0);          

  /** [영역 분리: 상태 관리 - 인쇄 레이아웃 설정] */
  const [layout, setLayout] = useState({
    labelW:     '',     
    labelH:     '',     
    cols:       '',       
    rows:       '',       
    marginTop:  '',  
    marginLeft: '', 
    gap:        '',        
    delimiter:  ''   
  });

  /** [영역 분리: 상태 관리 - UI 및 미리보기 제어] */
  const [previewMode, setPreviewMode] = useState('label');          
  const [zoom, setZoom] = useState(1.5); 
  const [isPreparing, setIsPreparing] = useState(false);            
  const [openDbDialog, setOpenDbDialog] = useState(false);          
  const [openPresetListDialog, setOpenPresetListDialog] = useState(false); 
  const [savePresetDialogOpen, setSavePresetDialogOpen] = useState(false); 
  
  /** [영역 분리: 상태 관리 - 데이터 목록 리스트] */
  const [dbList, setDbList] = useState([]);                         
  const [presetList, setPresetList] = useState([]);                 
  const [presetNameInput, setPresetNameInput] = useState('');       

  /** [영역 분리: Ref - DOM 참조] */
  const printRef = useRef();         
  const fileInputRef = useRef(null); 

  /** [영역 분리: 이벤트 핸들러] */
  const handleDynamicDataChange = (id, value) => { 
    setDynamicData((prev) => ({ 
      ...prev, 
      [id]: value 
    })); 
  };

  const handleLayoutChange = (e) => {
    const { name, value } = e.target;
    
    setLayout((prev) => ({ 
      ...prev, 
      [name]: value === '' ? '' : value 
    }));
  };

  /**
   * 미리보기 모드 토글 핸들러
   * @description 모드에 따라 최적의 기본 줌(Zoom) 비율로 자동 조정합니다.
   */
  const handlePreviewModeChange = (e, val) => {
    if (val) {
      setPreviewMode(val);
      setZoom(val === 'label' ? 1.5 : 0.4);
    }
  };

  /**
   * 캔버스 내 마우스 휠 줌(Zoom) 핸들러
   */
  const handleWheelZoom = (e) => {
    if (e.ctrlKey) {
      e.preventDefault(); 
      setZoom((prev) => {
        const newZoom = prev + (e.deltaY > 0 ? -0.1 : 0.1);
        return Math.min(Math.max(newZoom, 0.2), 3.0); 
      });
    }
  };

  /** [영역 분리: 인쇄 로직 및 이력 저장] */
  const handlePrint = useReactToPrint({
    contentRef:    printRef, 
    documentTitle: `LabelPrint_${templateName}`,
    onAfterPrint:  () => { 
      setIsPreparing(false); 
      setPrintCopyCount(0); 
    },
  });

  const onPreparePrint = async () => {
    setIsPreparing(true);
    
    // KST 시간(UTC+9) 보정 문자열 생성
    const now = new Date();
    const kstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000))
      .toISOString()
      .replace('T', ' ')
      .substring(0, 19);

    const combinedValue = templateItems
      .filter((i) => i.type === 'data' || i.type === 'date')
      .map((i) => {
        let val = '';
        
        if (i.type === 'data') {
          val = dynamicData[i.id] || '';
        } else if (i.type === 'date') {
          const d = new Date();
          val = (i.content || '')
            .replace(/YYYY/g, d.getFullYear())
            .replace(/MM/g, String(d.getMonth() + 1).padStart(2, '0'))
            .replace(/DD/g, String(d.getDate()).padStart(2, '0'))
            .replace(/HH/g, String(d.getHours()).padStart(2, '0'))
            .replace(/mm/g, String(d.getMinutes()).padStart(2, '0'))
            .replace(/ss/g, String(d.getSeconds()).padStart(2, '0'))
            .replace(/[-_:\s]/g, ''); 
        }
        
        return `${i.prefix || ''}${val}`;
      })
      .join(layout.delimiter || ''); 

    const dynamicDataForDB = {};
    
    templateItems
      .filter((item) => item.type === 'data')
      .forEach((item) => {
        dynamicDataForDB[item.label] = dynamicData[item.id] || '';
      });

    const printItem = { 
      barcode:   combinedValue || 'NO_DATA', 
      scannedAt: kstDate,
      ...dynamicDataForDB 
    };

    try {
      await apiClient.post('/label/save', { 
        labelData:  [printItem],
        templateId: templateId 
      });

      setPrintCopyCount(parseInt(copyCount) || 1);
      
      showAlert(
        "준비 완료", 
        "success", 
        "잠시 후 인쇄 창이 열립니다."
      );
      
      setTimeout(() => { 
        // ★ 핵심 해결 로직: 인쇄 시스템(브라우저 스레드)이 멈추기 직전에 모달을 강제로 닫음
        Swal.close(); 
        handlePrint(); 
      }, 800); 
    } catch (err) { 
      showAlert(
        "오류", 
        "error", 
        "출력 이력 저장 중 통신 실패"
      );
      setIsPreparing(false); 
    }
  };

  /** [영역 분리: 데이터 처리 - JSON 템플릿 파싱 및 적용] */
  const applyTemplate = (json, isPreset = false) => {
    setTemplateId(json.templateId || json.TemplateId || null); 
    setTemplateName(json.templateName || json.TemplateName || '불러온 양식');
    
    const rawItems = json.items || JSON.parse(json.DesignJson || '[]');
    let extractedLayout = { 
      labelW:     json.LabelW, 
      labelH:     json.LabelH, 
      cols:       json.Cols, 
      rows:       json.Rows, 
      marginTop:  json.MarginTop, 
      marginLeft: json.MarginLeft, 
      gap:        json.Gap, 
      delimiter:  '_'
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

    const newLayout = isPreset 
      ? JSON.parse(json.LayoutJson) 
      : extractedLayout;
      
    setLayout((prev) => ({ 
      ...prev, 
      ...newLayout 
    }));
    
    setTemplateItems(extractedItems);

    if (isPreset) {
      setDynamicData(JSON.parse(json.DynamicDataJson)); 
      setCopyCount(json.CopyCount || 1); 
      setPresetId(json.PresetId); 
      setPresetName(json.PresetName); 
      setPresetNameInput(json.PresetName);
    } else {
      const initialData = {}; 
      extractedItems
        .filter((item) => item.type === 'data')
        .forEach((item) => { 
          initialData[item.id] = ''; 
        });
        
      setDynamicData(initialData); 
      setPresetId(null); 
      setPresetName('');
    }
  };

  /** [영역 분리: 데이터 입출력 (DB 조회 및 저장)] */
  const handleFetchDbList = async () => {
    try { 
      const res = await apiClient.get('/label/template/list'); 
      setDbList(res.data.data || []); 
      setOpenDbDialog(true); 
    } catch (err) { 
      showAlert(
        "조회 실패", 
        "error", 
        "서버로부터 양식 목록을 가져오지 못했습니다."
      ); 
    }
  };

  const fetchPresetList = async () => {
    try { 
      const res = await apiClient.get('/label/preset/list'); 
      setPresetList(res.data.data || []); 
      setOpenPresetListDialog(true); 
    } catch (err) { 
      showAlert(
        "조회 실패", 
        "error", 
        "프리셋 목록 로드 실패"
      ); 
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
          showAlert(
            "삭제 성공", 
            "success", 
            "정상적으로 삭제 처리되었습니다."
          );
          type === 'template' ? handleFetchDbList() : fetchPresetList();
        }
      } catch (err) {
        showAlert(
          "삭제 실패", 
          "error", 
          "서버 통신 중 오류가 발생했습니다."
        );
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
      
      showAlert(
        "저장 완료", 
        "success", 
        "현재 설정이 사용자 프리셋으로 등록되었습니다."
      );
    } catch (err) { 
      showAlert(
        "저장 실패", 
        "error", 
        "데이터 저장 중 서버 에러 발생"
      ); 
    }
  };

  const handleImportJson = (e) => {
    const file = e.target.files[0]; 
    if (!file) return;
    
    const reader = new FileReader(); 
    reader.onload = (event) => { 
      try { 
        applyTemplate(JSON.parse(event.target.result), false); 
        showAlert(
          "가져오기 성공", 
          "success", 
          "파일에서 양식을 읽어왔습니다."
        ); 
      } catch (err) { 
        showAlert(
          "형식 오류", 
          "error", 
          "올바른 템플릿 JSON 파일이 아닙니다."
        ); 
      } 
    };
    reader.readAsText(file); 
    e.target.value = null;
  };

  /** [렌더링 영역] */
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
            style={{ 
              display: 'none' 
            }} 
            accept=".json" 
            onChange={handleImportJson} 
          />
          
          <Divider 
            orientation="vertical" 
            flexItem 
            sx={{ 
              mx: 1 
            }} 
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
        {/* 좌측 패널 */}
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
            sx={{ 
              flex: 1 
            }}
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

            <Typography 
              variant="subtitle2" 
              fontWeight="bold" 
              color="primary"
            >
              1. 데이터 입력
            </Typography>
            
            {templateItems.filter((item) => item.type === 'data').length === 0 ? (
               <Typography 
                 variant="body2" 
                 color="text.secondary"
               >
                 가변 데이터 항목이 없는 양식입니다.
               </Typography>
            ) : (
              <Stack spacing={1.5}>
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
                value={layout.labelW} 
                onChange={handleLayoutChange} 
              />
              <TextField 
                label="라벨 높이" 
                name="labelH" 
                type="number" 
                size="small" 
                fullWidth
                value={layout.labelH} 
                onChange={handleLayoutChange} 
              />
            </Stack>
            
            <TextField 
              label="바코드 구분자" 
              size="small" 
              fullWidth 
              value={layout.delimiter} 
              helperText="바코드 결합 기준 (읽기 전용)" 
              InputProps={{
                readOnly: true,
              }}
              sx={{ 
                backgroundColor: 'action.hover' 
              }} 
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
                value={layout.cols} 
                onChange={handleLayoutChange} 
              />
              <TextField 
                label="세로 개수" 
                name="rows" 
                type="number" 
                size="small" 
                fullWidth
                value={layout.rows} 
                onChange={handleLayoutChange} 
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
                value={layout.marginTop} 
                onChange={handleLayoutChange} 
              />
              <TextField 
                label="좌측 여백" 
                name="marginLeft" 
                type="number" 
                size="small" 
                fullWidth
                value={layout.marginLeft} 
                onChange={handleLayoutChange} 
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
                value={layout.gap} 
                onChange={handleLayoutChange} 
              />
              <TextField 
                label="인쇄 쪽수" 
                type="number" 
                size="small" 
                fullWidth
                value={copyCount} 
                onChange={(e) => setCopyCount(Math.max(1, e.target.value))} 
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
              sx={{ 
                fontWeight: 'bold', 
                py:         1.5, 
                mt:         1 
              }}
            >
              {isPreparing ? "준비 중..." : `${copyCount}쪽 인쇄하기`}
            </Button>
          </Stack>
        </Paper>

        {/* 우측 캔버스 패널 */}
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
              인쇄물 미리보기
            </Typography>
            
            <Stack 
              direction="row" 
              spacing={2} 
              alignItems="center"
            >
              <Typography 
                variant="caption" 
                fontWeight="bold"
              >
                Zoom
              </Typography>
              <Slider 
                size="small" 
                value={zoom} 
                min={0.2} 
                max={3} 
                step={0.1} 
                onChange={(e, v) => setZoom(v)} 
                sx={{ 
                  width: 80 
                }} 
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
                sx={{ 
                  mx: 1 
                }} 
              />

              <ToggleButtonGroup 
                value={previewMode} 
                exclusive 
                onChange={handlePreviewModeChange} 
                size="small" 
                color="primary"
              >
                <ToggleButton 
                  value="label" 
                  sx={{ 
                    px: 2 
                  }}
                >
                  <LabelIcon 
                    sx={{ 
                      mr:       1, 
                      fontSize: 18 
                    }} 
                  /> 
                  라벨 모드
                </ToggleButton>
                <ToggleButton 
                  value="page" 
                  sx={{ 
                    px: 2 
                  }}
                >
                  <AspectRatioIcon 
                    sx={{ 
                      mr:       1, 
                      fontSize: 18 
                    }} 
                  /> 
                  배치 모드
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
              <Box 
                sx={{ 
                  zoom:      zoom, 
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)', 
                  mt:        5 
                }}
              >
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
                  {Array.from({ length: (parseInt(layout.cols) || 0) * (parseInt(layout.rows) || 0) }).map((_, i) => (
                    <LabelTemplate 
                      key={i} 
                      items={templateItems} 
                      dynamicData={dynamicData} 
                      width={layout.labelW} 
                      height={layout.labelH} 
                      delimiter={layout.delimiter} 
                    />
                  ))}
                </div>
              </Box>
            )}
          </Paper>
        </Box>
      </Stack>

      {/* 실제 인쇄용 숨김 영역 */}
      <div 
        style={{ 
          position: 'absolute', 
          top:      '-9999px', 
          left:     '-9999px' 
        }}
      >
        <div ref={printRef}>
          {printCopyCount > 0 && Array.from({ length: printCopyCount }).map((_, pageIdx) => (
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
                {Array.from({ length: (parseInt(layout.cols) || 0) * (parseInt(layout.rows) || 0) }).map((_, itemIdx) => (
                  <LabelTemplate 
                    key={itemIdx} 
                    items={templateItems} 
                    dynamicData={dynamicData} 
                    width={layout.labelW} 
                    height={layout.labelH} 
                    delimiter={layout.delimiter} 
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

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
                sx={{ 
                  p: 2 
                }}
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
          <Button onClick={() => setSavePresetDialogOpen(false)}>
            취소
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LabelPrintPage;