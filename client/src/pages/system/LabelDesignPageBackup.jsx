/**
 * @file        LabelDesignPage.jsx
 * @description 라벨 디자인 툴 페이지
 */

import React, { useState, useRef, createRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Stack, 
  TextField, 
  Button, 
  Divider, 
  IconButton, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails, 
  ToggleButtonGroup, 
  ToggleButton, 
  FormControlLabel, 
  Checkbox, 
  Slider,
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemText
} from '@mui/material';
import { Reorder } from 'framer-motion'; 
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import SaveIcon from '@mui/icons-material/Save';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Barcode from 'react-barcode';
import QRCode from 'react-qr-code';
import Draggable from 'react-draggable';
import apiClient from '../../utils/apiClient';
import { showAlert, showConfirm } from '../../utils/swal';

/** [상수] mm 단위를 화면 px 단위로 변환하기 위한 비율 (96dpi 기준 약 3.78) */
const MM_PX_UNIT = 3.78; 

const LabelDesignPage = () => {
  /** [상태 관리] 템플릿 기본 정보 */
  const [templateId, setTemplateId] = useState(null);           // 저장된 템플릿의 고유 ID
  const [templateName, setTemplateName] = useState('');         // 템플릿 이름
  
  /** [상태 관리] 라벨 규격 및 설정 (빈칸 입력 허용을 위해 초기값 '' 적용) */
  const [layout, setLayout] = useState({ 
    labelW: '',     // 라벨 가로 너비 (mm)
    labelH: '',     // 라벨 세로 높이 (mm)
    pageW: '',      // 용지 가로 너비
    pageH: '',      // 용지 세로 높이
    cols: 1,        // 가로 개수
    rows: 1,        // 세로 개수
    marginTop: '',  // 상단 여백
    marginLeft: '', // 좌측 여백
    gap: '',        // 라벨 간 간격
    delimiter: ''   // 바코드 데이터 구분자
  });

  /** [상태 관리] 편집기 UI 설정 */
  const [zoom, setZoom] = useState(1.5);              // 캔버스 확대 비율
  const [items, setItems] = useState([]);             // 배치된 레이어 항목 리스트
  const [selectedId, setSelectedId] = useState(null); // 현재 선택된 레이어 ID
  const [expandedAcc, setExpandedAcc] = useState({}); // 아코디언 확장 상태 관리
  const [showGrid, setShowGrid] = useState(true);     // 가이드선 표시 여부

  /** [상태 관리] 다이얼로그 제어 */
  const [openDbDialog, setOpenDbDialog] = useState(false);       // DB 불러오기 팝업
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false); // 저장 방식 확인 팝업
  const [dbList, setDbList] = useState([]);                      // DB에서 조회된 템플릿 목록

  /** [Ref] DOM 조작 및 외부 입력 참조 */
  const nodeRefs = useRef({});       // Draggable 컴포넌트용 Ref 객체
  const fileInputRef = useRef(null); // JSON 파일 업로드를 위한 input 참조

  /** [이벤트 핸들러] */

  /**
   * 레이어 항목 속성 개별 업데이트
   */
  const updateItem = (id, field, value) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  /**
   * 캔버스 내 드래그 좌표 업데이트 (px 단위 데이터를 mm로 변환)
   */
  const handleDrag = (id, data) => {
    const mmX = parseFloat((data.x / MM_PX_UNIT).toFixed(1));
    const mmY = parseFloat((data.y / MM_PX_UNIT).toFixed(1));
    
    updateItem(id, 'x', Math.max(0, mmX)); 
    updateItem(id, 'y', Math.max(0, mmY)); 
  };

  /**
   * 아코디언 메뉴 토글 제어
   */
  const handleAccordionToggle = (id) => (event, isExpanded) => {
    setExpandedAcc(prev => ({ ...prev, [id]: isExpanded }));
  };

  /** [로직] */

  /**
   * DB 저장 요청 실행 로직
   * @description 신규 저장(null) 또는 기존 수정(templateId)에 따라 백엔드에 반영
   */
  const requestSave = async (targetId) => {
    if (!templateName) {
      return showAlert("입력 확인", "warning", "양식 이름을 입력해주세요.");
    }
    
    try {
      const payload = {
        templateId: targetId,
        templateName, 
        pageW: layout.pageW,
        pageH: layout.pageH,
        labelW: layout.labelW,
        labelH: layout.labelH,
        cols: layout.cols,
        rows: layout.rows,
        marginTop: layout.marginTop,
        marginLeft: layout.marginLeft,
        gap: layout.gap,
        // 메타 데이터(레이아웃 설정)와 아이템 리스트를 병합하여 직렬화
        designJson: JSON.stringify([{ type: 'meta', layout }, ...items]) 
      };

      const res = await apiClient.post('/label/template/save', payload);
      setTemplateId(res.data.resultId); 
      setSaveConfirmOpen(false);
      
      showAlert(
        "저장 완료", 
        "success", 
        res.data.action === 'INSERT' ? "새 양식으로 저장되었습니다." : "기존 양식이 수정되었습니다."
      );
    } catch (err) { 
      showAlert("저장 실패", "error", "DB 저장 중 오류가 발생했습니다."); 
    }
  };

  /**
   * 저장 버튼 클릭 (신규/수정 분기 처리)
   */
  const handleSaveToDb = () => { 
    templateId ? setSaveConfirmOpen(true) : requestSave(null); 
  };

  /**
   * 디자인 데이터 JSON 파일 다운로드 내보내기
   */
  const handleExportJson = async () => {
    const data = { 
      templateName, 
      layout, 
      items 
    };
    const jsonString = JSON.stringify(data, null, 2);
    
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({ 
          suggestedName: `${templateName || 'label_design'}.json`, 
          types: [{ description: 'JSON File', accept: { 'application/json': ['.json'] } }]
        });
        const writable = await handle.createWritable(); 
        await writable.write(jsonString); 
        await writable.close();
        showAlert("저장 완료", "success", "파일이 성공적으로 저장되었습니다.");
      } catch (err) { 
        if (err.name !== 'AbortError') showAlert("저장 실패", "error", "파일 저장 오류"); 
      }
    } else {
      // 구형 브라우저 대응
      const blob = new Blob([jsonString], { type: 'application/json' }); 
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); 
      link.href = url; 
      link.download = `${templateName || 'label_design'}.json`; 
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  /**
   * 로컬 JSON 파일로부터 데이터 불러오기
   */
  const handleImportJson = (e) => {
    const file = e.target.files[0]; 
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        setTemplateId(null); 
        setTemplateName(json.templateName || '불러온 양식'); 
        setLayout(json.layout || { labelW: 100, labelH: 50, delimiter: '_' }); 
        setItems(json.items || []);
        
        // 불러온 데이터의 모든 아코디언 메뉴 자동 확장
        const newExpanded = {}; 
        (json.items || []).forEach(i => { newExpanded[i.id] = true; }); 
        setExpandedAcc(newExpanded);
        
        showAlert("로드 성공", "success", "파일 데이터를 불러왔습니다.");
      } catch (err) { 
        showAlert("파일 오류", "error", "올바른 JSON 파일 형식이 아닙니다."); 
      }
    };
    reader.readAsText(file); 
    e.target.value = null;
  };

  /**
   * DB에 저장된 템플릿 목록 조회
   */
  const handleFetchDbList = async () => {
    try {
      const response = await apiClient.get('/label/template/list');
      setDbList(response.data.data || []); 
      setOpenDbDialog(true);
    } catch (err) { 
      showAlert("조회 실패", "error", "템플릿 목록을 가져오지 못했습니다."); 
    }
  };

  /**
   * DB에서 선택한 템플릿을 캔버스 및 상태에 적용
   */
  const loadTemplateFromDb = (template) => {
    setTemplateId(template.TemplateId); 
    setTemplateName(template.TemplateName); 
    
    const loadedRaw = JSON.parse(template.DesignJson);
    let loadedItems = loadedRaw;
    let loadedLayout = { 
      labelW: template.LabelW, 
      labelH: template.LabelH, 
      pageW: template.PageW, 
      pageH: template.PageH,
      cols: template.Cols, 
      rows: template.Rows,
      marginTop: template.MarginTop, 
      marginLeft: template.MarginLeft,
      gap: template.Gap, 
      delimiter: '' 
    };
    
    // JSON 내부의 'meta' 타입 레이아웃 복원
    if (loadedRaw.length > 0 && loadedRaw[0].type === 'meta') {
      loadedLayout = { ...loadedLayout, ...loadedRaw[0].layout };
      loadedItems = loadedRaw.slice(1); 
    }
    
    setLayout(loadedLayout);
    setItems(loadedItems);
    
    const newExpanded = {}; 
    loadedItems.forEach(i => { newExpanded[i.id] = true; }); 
    setExpandedAcc(newExpanded);
    setOpenDbDialog(false); 
    showAlert("로드 완료", "success", `[${template.TemplateName}] 양식을 불러왔습니다.`);
  };

  /**
   * 템플릿 삭제 (Soft Delete 플래그 처리)
   */
  const handleDeleteTemplate = async (e, id, name) => {
    e.stopPropagation(); 
    const confirmed = await showConfirm(
      "양식 삭제", 
      `[${name}] 양식을 삭제하시겠습니까?\n(삭제 후에도 DB에는 기록이 보관됩니다.)`
    );
    
    if (confirmed) {
      try {
        const res = await apiClient.delete(`/label/template/${id}`);
        if (res.data.success) {
          showAlert("성공", "success", "양식이 삭제되었습니다.");
          handleFetchDbList(); 
        }
      } catch (err) {
        showAlert("실패", "error", "삭제 중 서버 오류가 발생했습니다.");
      }
    }
  };

  /**
   * 캔버스에 새로운 레이어 요소(텍스트, 데이터, 바코드 등) 추가
   */
  const addItem = (type) => {
    const hasCode = items.some(i => i.type === 'barcode' || i.type === 'qrcode');
    if ((type === 'barcode' || type === 'qrcode') && hasCode) {
      return showAlert("추가 불가", "warning", "바코드나 QR코드는 하나만 삽입할 수 있습니다.");
    }

    const newId = `item-${Date.now()}`;
    const newItem = {
      id: newId, 
      type,
      label: '',   
      content: '', 
      prefix: '',  
      x: '', 
      y: '', 
      fontSize: '', 
      width: '', 
      height: '', 
      fontWeight: 'normal'
    };

    setItems([newItem, ...items]); 
    setSelectedId(newId);
    setExpandedAcc(prev => ({ ...prev, [newId]: true })); 
  };

  /**
   * 날짜 포맷 미리보기 문자열 생성 (KST 보정 적용)
   */
  const getPreviewDate = (format) => {
    if (!format) return '';
    const now = new Date();
    // KST(UTC+9) 보정
    const kstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    
    // getUTC... 메서드를 사용하여 KST 시간 추출
    const yyyy = kstDate.getUTCFullYear(); 
    const MM = String(kstDate.getUTCMonth() + 1).padStart(2, '0'); 
    const dd = String(kstDate.getUTCDate()).padStart(2, '0');
    const HH = String(kstDate.getUTCHours()).padStart(2, '0'); 
    const mm = String(kstDate.getUTCMinutes()).padStart(2, '0'); 
    const ss = String(kstDate.getUTCSeconds()).padStart(2, '0');
    
    return format
      .replace(/YYYY/g, yyyy)
      .replace(/MM/g, MM)
      .replace(/DD/g, dd)
      .replace(/HH/g, HH)
      .replace(/mm/g, mm)
      .replace(/ss/g, ss);
  };

  /** [Memo] 바코드 미리보기 렌더링용 데이터 조합 */
  const codeDataWithPrefix = items
    .filter(i => i.type === 'data' || i.type === 'date')
    .map(i => {
      let val = i.type === 'date' ? getPreviewDate(i.content) : (i.content || 'EMPTY');
      if (i.type === 'date') val = val.replace(/[-_:\s]/g, ''); 
      return `${i.prefix || ''}${val}`;
    })
    .join(layout.delimiter || ''); 

  /** [렌더링 영역] */
  return (
    <Box 
      sx={{ 
        p: 3, 
        height: 'calc(100vh - 120px)', 
        display: 'flex', 
        flexDirection: 'column' 
      }}
    >
      {/* 상단 액션 바 */}
      <Stack 
        direction="row" 
        justifyContent="space-between" 
        alignItems="center" 
        mb={2}
      >
        <Typography 
          variant="h5" 
          fontWeight="bold"
        >
          라벨 디자인 툴 {templateId && `(ID: ${templateId})`}
        </Typography>

        <Stack 
          direction="row" 
          spacing={1}
        >
          <Button 
            variant="outlined" 
            startIcon={<FolderOpenIcon />} 
            onClick={handleFetchDbList}
          >
            DB 불러오기
          </Button>
          <Button 
            variant="outlined" 
            color="secondary" 
            startIcon={<FileDownloadIcon />} 
            onClick={() => fileInputRef.current.click()}
          >
            파일 열기
          </Button>
          <Button 
            variant="outlined" 
            color="info" 
            startIcon={<FileUploadIcon />} 
            onClick={handleExportJson}
          >
            파일 내보내기
          </Button>
          <Button 
            variant="contained" 
            color="success" 
            startIcon={<SaveIcon />} 
            onClick={handleSaveToDb} 
            sx={{ fontWeight: 'bold' }}
          >
            DB 저장
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept=".json" 
            onChange={handleImportJson} 
          />
        </Stack>
      </Stack>

      {/* 메인 편집 영역 (좌측 설정창 + 우측 캔버스) */}
      <Stack 
        direction="row" 
        spacing={2} 
        sx={{ flex: 1, overflow: 'hidden' }}
      >
        
        {/* 좌측 설정 사이드바 */}
        <Paper 
          sx={{ 
            width: 400, 
            p: 2.5, 
            overflowY: 'auto', 
            backgroundColor: '#f8f9fa', 
            border: '1px solid #ddd' 
          }}
        >
          <TextField 
            label="양식 이름" 
            fullWidth 
            size="small" 
            value={templateName} 
            onChange={(e) => setTemplateName(e.target.value)} 
            sx={{ mb: 3, backgroundColor: '#fff' }} 
          />

          <Typography 
            variant="subtitle2" 
            gutterBottom 
            fontWeight="bold" 
            color="primary"
          >
            1. 라벨 규격 & 배율
          </Typography>
          
          <Stack 
            direction="row" 
            spacing={1} 
            mb={1}
          >
            <TextField 
              label="가로(W) mm" 
              type="number" 
              size="small" 
              value={layout.labelW} 
              onChange={(e) => setLayout({ ...layout, labelW: e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value)) })} 
              sx={{ flex: 1, backgroundColor: '#fff' }} 
            />
            <TextField 
              label="세로(H) mm" 
              type="number" 
              size="small" 
              value={layout.labelH} 
              onChange={(e) => setLayout({ ...layout, labelH: e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value)) })} 
              sx={{ flex: 1, backgroundColor: '#fff' }} 
            />
          </Stack>

          <Stack 
            direction="row" 
            spacing={1} 
            mb={2}
          >
            <TextField 
              label="바코드 데이터 구분자" 
              size="small" 
              fullWidth 
              value={layout.delimiter} 
              onChange={(e) => setLayout({ ...layout, delimiter: e.target.value })} 
              sx={{ backgroundColor: '#fff' }} 
              helperText="스캔 시 데이터를 쪼개는 기준" 
            />
          </Stack>

          <Box sx={{ px: 1, mb: 3 }}>
            <Stack 
              direction="row" 
              alignItems="center" 
              spacing={2}
            >
              <Box sx={{ flex: 1 }}>
                <Slider 
                  size="small" 
                  value={zoom} 
                  min={0.5} 
                  max={3.0} 
                  step={0.1} 
                  onChange={(e, v) => setZoom(v)} 
                />
              </Box>
              <FormControlLabel 
                control={
                  <Checkbox 
                    size="small" 
                    checked={showGrid} 
                    onChange={(e) => setShowGrid(e.target.checked)} 
                  />
                } 
                label={<Typography variant="caption" fontWeight="bold">가이드선</Typography>} 
              />
            </Stack>
          </Box>

          <Divider sx={{ my: 1.5 }} />
          
          <Typography 
            variant="subtitle2" 
            gutterBottom 
            fontWeight="bold" 
            color="primary"
          >
            2. 요소 추가
          </Typography>
          <Stack 
            direction="row" 
            spacing={0.5} 
            mb={3}
          >
            <Button 
              size="small" 
              variant="contained" 
              color="inherit" 
              sx={{ flex: 1 }} 
              onClick={() => addItem('text')}
            >
              + 글자
            </Button>
            <Button 
              size="small" 
              variant="contained" 
              color="primary" 
              sx={{ flex: 1 }} 
              onClick={() => addItem('data')}
            >
              + 데이터
            </Button>
            <Button 
              size="small" 
              variant="contained" 
              color="info" 
              sx={{ flex: 1 }} 
              onClick={() => addItem('date')}
            >
              + 날짜
            </Button>
            <Button 
              size="small" 
              variant="contained" 
              color="warning" 
              sx={{ flex: 1 }} 
              disabled={items.some(i => i.type === 'barcode' || i.type === 'qrcode')}
              onClick={() => addItem('barcode')} 
            >
              + 코드
            </Button>
          </Stack>

          <Typography 
            variant="subtitle2" 
            gutterBottom 
            fontWeight="bold" 
            color="primary"
          >
            3. 레이어 리스트 (드래그하여 순서 변경)
          </Typography>
          
          {/* Framer-motion을 이용한 레이어 순서 재정렬 리스트 */}
          <Reorder.Group 
            axis="y" 
            values={items} 
            onReorder={setItems} 
            style={{ listStyle: 'none', padding: 0 }}
          >
            {items.map((item) => (
              <Reorder.Item 
                key={item.id} 
                value={item} 
                style={{ marginBottom: '8px' }}
              >
                <Accordion 
                  expanded={!!expandedAcc[item.id]} 
                  onChange={handleAccordionToggle(item.id)} 
                  onClick={() => setSelectedId(item.id)} 
                  sx={{ 
                    border: selectedId === item.id ? `2px solid #1976d2` : '1px solid #ccc', 
                    boxShadow: 'none' 
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack 
                      direction="row" 
                      alignItems="center" 
                      spacing={1}
                    >
                       <DragIndicatorIcon sx={{ color: '#aaa', cursor: 'grab' }} />
                       <Typography 
                         variant="body2" 
                         fontWeight="bold"
                       >
                         [{item.type.toUpperCase()}] {item.label || '항목명 미지정'}
                       </Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails 
                    sx={{ 
                      p: 2, 
                      backgroundColor: '#fff', 
                      borderTop: '1px solid #eee' 
                    }}
                  >
                    <Stack spacing={2}>
                      <TextField 
                        label="항목 이름" 
                        fullWidth 
                        size="small" 
                        value={item.label} 
                        onChange={(e) => updateItem(item.id, 'label', e.target.value)} 
                      />
                      
                      {item.type === 'date' ? (
                        <Stack spacing={1}>
                          <ToggleButtonGroup 
                            value={item.content} 
                            exclusive 
                            size="small" 
                            onChange={(e, next) => updateItem(item.id, 'content', next || '')} 
                            fullWidth
                          >
                            <ToggleButton value="YYYY-MM-DD">날짜만</ToggleButton>
                            <ToggleButton value="YYYYMMDD_HHmmss">언더바형</ToggleButton>
                          </ToggleButtonGroup>
                          <TextField 
                            label="날짜 포맷 직접 입력" 
                            fullWidth 
                            size="small" 
                            value={item.content} 
                            onChange={(e) => updateItem(item.id, 'content', e.target.value)} 
                            helperText="YYYY, MM, DD, HH, mm, ss 사용 가능" 
                          />
                        </Stack>
                      ) : (
                        <TextField 
                          label="데이터" 
                          fullWidth 
                          size="small" 
                          value={item.content} 
                          onChange={(e) => updateItem(item.id, 'content', e.target.value)} 
                        />
                      )}

                      {(item.type === 'data' || item.type === 'date') && (
                        <TextField 
                          label="바코드 접두어(Prefix)" 
                          size="small" 
                          value={item.prefix || ''} 
                          onChange={(e) => updateItem(item.id, 'prefix', e.target.value)} 
                          helperText="스캔 시 데이터 조합용" 
                          fullWidth 
                        />
                      )}

                      {(item.type === 'barcode' || item.type === 'qrcode') && (
                        <ToggleButtonGroup 
                          value={item.type} 
                          exclusive 
                          size="small" 
                          onChange={(e, next) => next && updateItem(item.id, 'type', next)} 
                          fullWidth
                        >
                          <ToggleButton value="barcode">바코드</ToggleButton>
                          <ToggleButton value="qrcode">QR코드</ToggleButton>
                        </ToggleButtonGroup>
                      )}

                      <Stack 
                        direction="row" 
                        spacing={1} 
                        alignItems="center"
                      >
                        <TextField 
                          label="X(mm)" 
                          type="number" 
                          size="small" 
                          value={item.x} 
                          onChange={(e) => updateItem(item.id, 'x', e.target.value === '' ? '' : parseFloat(e.target.value))} 
                          sx={{ width: 85 }} 
                        />
                        <TextField 
                          label="Y(mm)" 
                          type="number" 
                          size="small" 
                          value={item.y} 
                          onChange={(e) => updateItem(item.id, 'y', e.target.value === '' ? '' : parseFloat(e.target.value))} 
                          sx={{ width: 85 }} 
                        />
                        
                        {(item.type !== 'barcode' && item.type !== 'qrcode') && (
                           <>
                            <TextField 
                              label="크기" 
                              type="number" 
                              size="small" 
                              value={item.fontSize} 
                              onChange={(e) => updateItem(item.id, 'fontSize', e.target.value === '' ? '' : parseInt(e.target.value))} 
                              sx={{ width: 85 }} 
                            />
                            <FormControlLabel 
                              control={
                                <Checkbox 
                                  size="small" 
                                  checked={item.fontWeight === 'bold'} 
                                  onChange={(e) => updateItem(item.id, 'fontWeight', e.target.checked ? 'bold' : 'normal')} 
                                />
                              } 
                              label={<Typography variant="caption">Bold</Typography>} 
                            />
                           </>
                        )}
                      </Stack>

                      <Stack 
                        direction="row" 
                        spacing={1} 
                        alignItems="center" 
                        justifyContent="flex-end"
                      >
                         {(item.type === 'barcode' || item.type === 'qrcode') && (
                           <TextField 
                             label="코드 높이/사이즈" 
                             type="number" 
                             size="small" 
                             value={item.height} 
                             sx={{ flex: 1 }} 
                             onChange={(e) => updateItem(item.id, 'height', e.target.value === '' ? '' : parseFloat(e.target.value))} 
                           />
                         )}
                         <IconButton 
                           color="error" 
                           size="small" 
                           onClick={() => setItems(items.filter(i => i.id !== item.id))}
                         >
                           <DeleteIcon />
                         </IconButton>
                      </Stack>
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </Paper>

        {/* 우측 디자인 캔버스 영역 */}
        <Paper 
          sx={{ 
            flex: 1, 
            backgroundColor: '#e9ecef', 
            overflow: 'auto', 
            position: 'relative',
            p: 10 
          }}
        >
          <Box 
            sx={{ 
              transform: `scale(${zoom})`, 
              transformOrigin: 'top left', 
              display: 'inline-block',
              transition: 'transform 0.1s ease-out' 
            }}
          >
            {/* 실제 라벨지 영역 */}
            <Box 
              sx={{ 
                position: 'relative', 
                width: `${parseFloat(layout.labelW) || 0}mm`, 
                height: `${parseFloat(layout.labelH) || 0}mm`, 
                backgroundColor: '#fff', 
                border: '1px solid #000',
                boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                ...(showGrid && { 
                  backgroundImage: `linear-gradient(to right, #e0e0e0 1px, transparent 1px), linear-gradient(to bottom, #e0e0e0 1px, transparent 1px)`, 
                  backgroundSize: `${5 * MM_PX_UNIT}px ${5 * MM_PX_UNIT}px` 
                })
              }}
            >
              {/* 레이어를 역순으로 렌더링 */}
              {[...items].reverse().map((item) => {
                if (!nodeRefs.current[item.id]) {
                  nodeRefs.current[item.id] = createRef();
                }
                
                return (
                  <Draggable 
                    key={item.id} 
                    nodeRef={nodeRefs.current[item.id]} 
                    bounds="parent" 
                    scale={zoom} 
                    position={{ 
                      x: (parseFloat(item.x) || 0) * MM_PX_UNIT, 
                      y: (parseFloat(item.y) || 0) * MM_PX_UNIT 
                    }} 
                    onDrag={(e, data) => handleDrag(item.id, data)} 
                    onStop={() => setSelectedId(item.id)}
                  >
                    <div 
                      ref={nodeRefs.current[item.id]} 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setSelectedId(item.id); 
                      }} 
                      style={{ 
                        position: 'absolute', 
                        cursor: 'move', 
                        border: selectedId === item.id ? '1px dashed #1976d2' : 'none', 
                        backgroundColor: selectedId === item.id ? 'rgba(25, 118, 210, 0.05)' : 'transparent', 
                        zIndex: selectedId === item.id ? 10 : 1, 
                        lineHeight: 1 
                      }}
                    >
                      {/* 텍스트/데이터/날짜 타입 렌더링 */}
                      {(item.type === 'text' || item.type === 'data' || item.type === 'date') && (
                        <Typography 
                          sx={{ 
                            fontSize: `${parseFloat(item.fontSize) || 12}pt`, 
                            fontWeight: item.fontWeight || 'normal', 
                            color: item.type === 'data' ? '#1976d2' : '#000', 
                            whiteSpace: 'nowrap', 
                            userSelect: 'none', 
                            lineHeight: 1 
                          }}
                        >
                          {item.type === 'date' ? getPreviewDate(item.content) : (item.content || 'TEXT')}
                        </Typography>
                      )}

                      {/* 바코드 타입 렌더링 */}
                      {item.type === 'barcode' && (
                        <div style={{ pointerEvents: 'none', lineHeight: 0 }}>
                          <Barcode 
                            value={codeDataWithPrefix || 'PREVIEW'} 
                            width={parseFloat(item.width) || 1.2} 
                            height={parseFloat(item.height) || 20} 
                            displayValue={false} 
                            margin={0} 
                          />
                        </div>
                      )}

                      {/* QR코드 타입 렌더링 */}
                      {item.type === 'qrcode' && (
                        <div style={{ pointerEvents: 'none', lineHeight: 0 }}>
                          <QRCode 
                            value={codeDataWithPrefix || 'PREVIEW'} 
                            size={(parseFloat(item.height) || 20) * MM_PX_UNIT} 
                          />
                        </div>
                      )}
                    </div>
                  </Draggable>
                );
              })}
            </Box>
          </Box>
        </Paper>
      </Stack>

      {/* [다이얼로그] DB에서 양식 선택 */}
      <Dialog 
        open={openDbDialog} 
        onClose={() => setOpenDbDialog(false)} 
        fullWidth 
        maxWidth="xs"
      >
        <DialogTitle>DB에서 양식 선택 (초기화)</DialogTitle>
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
                    onClick={(e) => handleDeleteTemplate(e, t.TemplateId, t.TemplateName)}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemButton onClick={() => loadTemplateFromDb(t)}>
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
      
      {/* [다이얼로그] 저장 방식 확인 */}
      <Dialog 
        open={saveConfirmOpen} 
        onClose={() => setSaveConfirmOpen(false)}
      >
        <DialogTitle>저장 확인</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          수정 중인 양식을 어떻게 처리할까요?
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            variant="contained" 
            onClick={() => requestSave(templateId)}
          >
            기존 양식 덮어쓰기
          </Button>
          <Button 
            variant="outlined" 
            color="secondary" 
            onClick={() => requestSave(null)}
          >
            새 양식으로 저장
          </Button>
          <Button onClick={() => setSaveConfirmOpen(false)}>
            취소
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default LabelDesignPage;