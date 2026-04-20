/**
 * @file        LabelDesignPage.jsx
 * @description 전문 디자인 툴(Photoshop, Zebra Designer) 방식의 통합 라벨 편집기입니다.
 * (드래그 생성, 리사이징 핸들, Shift 다중 선택, 개체 정렬, 레이어 관리 및 DB/파일 입출력을 지원합니다.)
 */

import React, { useState, useRef, createRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Stack, 
  TextField, 
  Button, 
  Divider, 
  IconButton, 
  ToggleButtonGroup, 
  ToggleButton, 
  FormControlLabel, 
  Checkbox, 
  Slider,
  Dialog, 
  DialogTitle, 
  DialogContent, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemText,
  Tooltip,
  Paper as MuiPaper
} from '@mui/material';
import { Reorder } from 'framer-motion'; 
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import SaveIcon from '@mui/icons-material/Save';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DeleteIcon from '@mui/icons-material/Delete';
import CursorIcon from '@mui/icons-material/NearMe';
import TitleIcon from '@mui/icons-material/Title';
import DataObjectIcon from '@mui/icons-material/DataObject';
import EventIcon from '@mui/icons-material/Event';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import MaximizeIcon from '@mui/icons-material/Maximize';
import ImageIcon from '@mui/icons-material/Image';
import BarcodeIcon from '@mui/icons-material/ViewColumn';
import QrCodeIcon from '@mui/icons-material/QrCode';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import AlignHorizontalLeftIcon from '@mui/icons-material/AlignHorizontalLeft';
import AlignHorizontalCenterIcon from '@mui/icons-material/AlignHorizontalCenter';
import AlignHorizontalRightIcon from '@mui/icons-material/AlignHorizontalRight';
import AlignVerticalTopIcon from '@mui/icons-material/AlignVerticalTop';
import AlignVerticalCenterIcon from '@mui/icons-material/AlignVerticalCenter';
import AlignVerticalBottomIcon from '@mui/icons-material/AlignVerticalBottom';
import Barcode from 'react-barcode';
import QRCode from 'react-qr-code';
import Draggable from 'react-draggable';
import apiClient from '../../utils/apiClient';
import { showAlert, showConfirm } from '../../utils/swal';

/** [상수] mm 단위를 화면 px 단위로 변환하기 위한 비율 (96dpi 기준) */
const MM_PX_UNIT = 3.78; 

const LabelDesignPage = () => {
  /** [상태 관리: 템플릿 및 개체 데이터] */
  const [templateId, setTemplateId] = useState(null);           
  const [templateName, setTemplateName] = useState('');         
  const [items, setItems] = useState([]);             
  const [selectedIds, setSelectedIds] = useState([]); // 다중 선택을 위한 배열 관리

  /** [상태 관리: 캔버스 및 정밀 제어] */
  const [layout, setLayout] = useState({ 
    labelW: '100', 
    labelH: '50', 
    delimiter: '_' 
  });
  const [zoom, setZoom] = useState(1.5);              
  const [showGrid, setShowGrid] = useState(true);     
  const [snapToGrid, setSnapToGrid] = useState(true); 
  const [gridSize, setGridSize] = useState(1); 

  /** [상태 관리: 드로잉 및 리사이징 모드] */
  const [activeTool, setActiveTool] = useState('select'); 
  const [isDrawing, setIsDrawing] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [tempRect, setTempRect] = useState(null);

  /** [상태 관리: UI 요소 제어] */
  const [openDbDialog, setOpenDbDialog] = useState(false);       
  const [dbList, setDbList] = useState([]);                      

  /** [Ref: DOM 및 좌표 계산 참조] */
  const canvasRef = useRef(null);
  const nodeRefs = useRef({});       
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  /** [로직: 좌표 변환 및 스냅 계산] */

  /**
   * 브라우저 마우스 좌표를 캔버스 내 mm 좌표로 변환
   */
  const getMmPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const pxX = (e.clientX - rect.left) / zoom;
    const pxY = (e.clientY - rect.top) / zoom;
    return { 
      x: pxX / MM_PX_UNIT, 
      y: pxY / MM_PX_UNIT 
    };
  };

  /**
   * 자석 스냅(Grid Snap) 적용 계산
   */
  const applySnap = (val, forceSnap = snapToGrid) => {
    if (!forceSnap) return parseFloat(val.toFixed(1));
    return Math.round(val / gridSize) * gridSize;
  };

  /** [로직: 개체 정렬 및 맞춤] */

  /**
   * 선택된 다중 개체들에 대한 정렬 실행
   * @param {string} type - 정렬 방향 (left, right, top, bottom, h-center, v-center)
   */
  const alignSelectedItems = (type) => {
    if (selectedIds.length < 2) return;

    const selectedItems = items.filter((i) => selectedIds.includes(i.id));
    const minX = Math.min(...selectedItems.map((i) => i.x));
    const maxX = Math.max(...selectedItems.map((i) => i.x + (i.width || 0)));
    const minY = Math.min(...selectedItems.map((i) => i.y));
    const maxY = Math.max(...selectedItems.map((i) => i.y + (i.height || 0)));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setItems((prev) => prev.map((item) => {
      if (!selectedIds.includes(item.id)) return item;
      switch (type) {
        case 'left': return { ...item, x: minX };
        case 'right': return { ...item, x: maxX - (item.width || 0) };
        case 'top': return { ...item, y: minY };
        case 'bottom': return { ...item, y: maxY - (item.height || 0) };
        case 'h-center': return { ...item, x: centerX - (item.width || 0) / 2 };
        case 'v-center': return { ...item, y: centerY - (item.height || 0) / 2 };
        default: return item;
      }
    }));
  };

  /** [로직: 바코드 데이터 조합 및 날짜 처리] */

  /**
   * KST 기준 실시간 날짜 미리보기 문자열 생성
   */
  const getKstPreviewDate = (format) => {
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

  /**
   * 가변 데이터와 날짜, 접두어를 조합한 실제 바코드 원문 계산
   */
  const codeDataWithPrefix = useMemo(() => {
    return items
      .filter((i) => i.type === 'data' || i.type === 'date')
      .map((i) => {
        let val = i.type === 'date' ? getKstPreviewDate(i.content) : (i.content || 'DATA');
        if (i.type === 'date') val = val.replace(/[-_:\s]/g, ''); 
        return `${i.prefix || ''}${val}`;
      })
      .join(layout.delimiter || '');
  }, [items, layout.delimiter]);

  /** [이벤트 핸들러: 개체 선택 및 조작] */

  /**
   * 캔버스 내 개체 클릭 시 선택 처리 (Shift 다중 선택 포함)
   */
  const handleItemClick = (e, id) => {
    e.stopPropagation();
    if (activeTool !== 'select') return;

    if (e.shiftKey) {
      setSelectedIds((prev) => prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]);
    } else {
      setSelectedIds([id]);
    }
  };

  /**
   * 개체 속성 업데이트 (빈칸 허용 및 소수점 처리)
   */
  const updateItem = (id, field, value) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };

  /**
   * 선택된 개체들 일괄 삭제 (Delete 키보드 연동)
   */
  const deleteSelectedItems = useCallback(() => {
    if (selectedIds.length > 0) {
      setItems((prev) => prev.filter((i) => !selectedIds.includes(i.id)));
      setSelectedIds([]);
    }
  }, [selectedIds]);

  /** [이벤트 핸들러: 마우스 및 키보드 전역 감시] */

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      // 리사이징 드래그 상태 감시
      if (isResizing && selectedIds.length === 1) {
        const item = items.find((i) => i.id === selectedIds[0]);
        if (!item) return;
        const currentPos = getMmPos(e);
        const newW = applySnap(currentPos.x - item.x, item.useSnap);
        const newH = applySnap(currentPos.y - item.y, item.useSnap);
        updateItem(item.id, 'width', Math.max(0.5, newW));
        updateItem(item.id, 'height', Math.max(0.5, newH));
      }
      // 드래그 생성(드로잉) 상태 감시
      if (isDrawing) {
        const currentPos = getMmPos(e);
        setTempRect({
          x: Math.min(drawStart.x, currentPos.x),
          y: Math.min(drawStart.y, currentPos.y),
          w: Math.abs(currentPos.x - drawStart.x),
          h: Math.abs(currentPos.y - drawStart.y)
        });
      }
    };

    const handleGlobalMouseUp = () => {
      if (isResizing) setIsResizing(false);
    };

    const handleKeyDown = (e) => {
      // 입력 필드 포커스 시 단축키 오작동 방지
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelectedItems();
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isResizing, isDrawing, selectedIds, items, zoom, snapToGrid, gridSize, drawStart, deleteSelectedItems]);

  /** [이벤트 핸들러: 드래그 및 그룹 이동] */

  /**
   * 다중 선택된 개체들의 동시 이동 처리
   */
  const handleGroupDrag = (id, data) => {
    const targetItem = items.find((i) => i.id === id);
    if (!targetItem) return;

    const newX = data.x / MM_PX_UNIT;
    const newY = data.y / MM_PX_UNIT;
    const dx = newX - targetItem.x;
    const dy = newY - targetItem.y;

    setItems((prev) => prev.map((item) => {
      if (selectedIds.includes(item.id)) {
        return {
          ...item,
          x: applySnap(item.x + dx, item.useSnap),
          y: applySnap(item.y + dy, item.useSnap)
        };
      }
      return item;
    }));
  };

  /**
   * 드래그 생성 도구 시작
   */
  const handleMouseDown = (e) => {
    if (activeTool === 'select' || isResizing) return;
    setIsDrawing(true);
    const pos = getMmPos(e);
    setDrawStart(pos);
    setTempRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
  };

  /**
   * 드래그 생성 도구 종료 및 개체 확정
   */
  const handleMouseUpCanvas = () => {
    if (!isDrawing || !tempRect) return;
    if (tempRect.w > 0.5 || tempRect.h > 0.5) {
      const newId = `item-${Date.now()}`;
      const newItem = {
        id: newId, 
        type: activeTool, 
        label: `${activeTool}_${items.length + 1}`,
        content: activeTool === 'text' ? 'TEXT' : activeTool === 'image' ? '' : activeTool === 'date' ? 'YYYY-MM-DD' : 'DATA',
        x: applySnap(tempRect.x), 
        y: applySnap(tempRect.y),
        width: applySnap(tempRect.w) || 20, 
        height: applySnap(tempRect.h) || 10,
        fontSize: 12, 
        fontWeight: 'normal', 
        barcodeType: 'CODE128', 
        borderWidth: 1, 
        visible: true, 
        useSnap: true, 
        prefix: '', 
        src: ''
      };
      setItems([newItem, ...items]);
      setSelectedIds([newId]);
    }
    setIsDrawing(false); 
    setTempRect(null); 
    setActiveTool('select');
  };

  /** [로직: 데이터 입출력 (DB/File)] */

  const handleExportJson = () => {
    const data = { templateName, layout, items };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; 
    link.download = `${templateName || 'label'}.json`; 
    link.click();
  };

  const handleImportJson = (e) => {
    const file = e.target.files[0]; 
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        setTemplateId(null); 
        setTemplateName(json.templateName || 'Imported');
        setLayout(json.layout || { labelW: '100', labelH: '50', delimiter: '_' }); 
        setItems(json.items || []);
        showAlert("성공", "success", "파일 데이터를 불러왔습니다.");
      } catch (err) { 
        showAlert("오류", "error", "올바른 JSON 파일이 아닙니다."); 
      }
    };
    reader.readAsText(file); 
    e.target.value = null;
  };

  const requestSave = async (targetId) => {
    if (!templateName) return showAlert("확인", "warning", "양식 이름을 입력하세요.");
    try {
      const payload = {
        templateId: targetId, 
        templateName, 
        labelW: layout.labelW, 
        labelH: layout.labelH,
        designJson: JSON.stringify([{ type: 'meta', layout }, ...items])
      };
      const res = await apiClient.post('/label/template/save', payload);
      setTemplateId(res.data.resultId); 
      showAlert("성공", "success", "디자인이 DB에 저장되었습니다.");
    } catch (e) { 
      showAlert("실패", "error", "서버 통신 중 오류가 발생했습니다."); 
    }
  };

  const handleDeleteTemplate = async (e, id, name) => {
    e.stopPropagation();
    if (await showConfirm("삭제", `[${name}] 양식을 영구 삭제할까요?`)) {
      try {
        await apiClient.delete(`/label/template/${id}`);
        const res = await apiClient.get('/label/template/list');
        setDbList(res.data.data || []);
        showAlert("성공", "success", "삭제 처리가 완료되었습니다.");
      } catch (e) { 
        showAlert("실패", "error", "삭제 실패"); 
      }
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0]; 
    if (!file || selectedIds.length !== 1) return;
    const reader = new FileReader();
    reader.onload = (ev) => updateItem(selectedIds[0], 'src', ev.target.result);
    reader.readAsDataURL(file); 
    e.target.value = null;
  };

  /** [렌더링 영역] */
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        height: 'calc(100vh - 120px)', 
        backgroundColor: '#f0f2f5', 
        gap: 0.5 
      }}
    >
      
      {/* 1. 좌측 도구 모음 (Floating Toolbar 스타일) */}
      <Paper 
        elevation={2} 
        sx={{ 
          width: 60, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          py: 2, 
          gap: 1, 
          backgroundColor: '#2c3e50', 
          color: '#fff', 
          borderRadius: 0 
        }}
      >
        <Tooltip title="선택(Del삭제 / Shift다중)" placement="right">
          <IconButton 
            color={activeTool === 'select' ? 'primary' : 'inherit'} 
            onClick={() => setActiveTool('select')}
          >
            <CursorIcon />
          </IconButton>
        </Tooltip>
        <Divider sx={{ width: '60%', bgcolor: 'rgba(255,255,255,0.1)', my: 1 }} />
        {[
          { id: 'text', icon: <TitleIcon />, label: '글자' }, 
          { id: 'data', icon: <DataObjectIcon />, label: '데이터' }, 
          { id: 'date', icon: <EventIcon />, label: '날짜' },
          { id: 'rect', icon: <CropSquareIcon />, label: '사각형' }, 
          { id: 'circle', icon: <RadioButtonUncheckedIcon />, label: '타원' }, 
          { id: 'line', icon: <MaximizeIcon />, label: '선' },
          { id: 'image', icon: <ImageIcon />, label: '이미지' }, 
          { id: 'barcode', icon: <BarcodeIcon />, label: '바코드' }, 
          { id: 'qrcode', icon: <QrCodeIcon />, label: 'QR코드' }
        ].map(tool => (
          <Tooltip key={tool.id} title={tool.label} placement="right">
            <IconButton 
              color={activeTool === tool.id ? 'primary' : 'inherit'} 
              onClick={() => setActiveTool(tool.id)}
            >
              {tool.icon}
            </IconButton>
          </Tooltip>
        ))}
      </Paper>

      {/* 2. 중앙 메인 작업 영역 */}
      <Box 
        sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden' 
        }}
      >
        {/* 상단 도구 제어 바 */}
        <Paper 
          sx={{ 
            p: 1, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            borderRadius: 0, 
            borderBottom: '1px solid #ddd' 
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="caption" fontWeight="bold">Zoom</Typography>
            <Slider 
              size="small" 
              value={zoom} 
              min={0.5} 
              max={3} 
              step={0.1} 
              onChange={(e, v) => setZoom(v)} 
              sx={{ width: 80 }} 
            />
            <FormControlLabel 
              control={<Checkbox size="small" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />} 
              label={<Typography variant="caption">격자</Typography>} 
            />
            <FormControlLabel 
              control={<Checkbox size="small" checked={snapToGrid} onChange={(e) => setSnapToGrid(e.target.checked)} />} 
              label={<Typography variant="caption">스냅</Typography>} 
            />
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button 
              size="small" 
              variant="outlined" 
              startIcon={<FolderOpenIcon />} 
              onClick={() => apiClient.get('/label/template/list').then(res => { setDbList(res.data.data || []); setOpenDbDialog(true); })}
            >
              불러오기
            </Button>
            <Button 
              size="small" 
              variant="outlined" 
              color="secondary" 
              startIcon={<FileUploadIcon />} 
              onClick={() => fileInputRef.current.click()}
            >
              파일열기
            </Button>
            <Button 
              size="small" 
              variant="outlined" 
              color="info" 
              startIcon={<FileDownloadIcon />} 
              onClick={handleExportJson}
            >
              내보내기
            </Button>
            <Button 
              size="small" 
              variant="contained" 
              color="success" 
              startIcon={<SaveIcon />} 
              onClick={() => requestSave(templateId)}
            >
              저장
            </Button>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept=".json" 
              onChange={handleImportJson} 
            />
          </Stack>
        </Paper>

        {/* 메인 캔버스 (도화지) 영역 */}
        <Box 
          sx={{ 
            flex: 1, 
            overflow: 'auto', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            p: 10, 
            backgroundColor: '#d1d4d9', 
            cursor: activeTool === 'select' ? 'default' : 'crosshair' 
          }} 
          onMouseDown={handleMouseDown} 
          onMouseUp={handleMouseUpCanvas}
        >
          <Box 
            ref={canvasRef} 
            sx={{ 
              width: `${layout.labelW}mm`, 
              height: `${layout.labelH}mm`, 
              backgroundColor: '#fff', 
              position: 'relative', 
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)', 
              transform: `scale(${zoom})`, 
              transformOrigin: 'center center', 
              ...(showGrid && { 
                backgroundImage: 'radial-gradient(#ccc 1px, transparent 1px)', 
                backgroundSize: `${gridSize * MM_PX_UNIT}px ${gridSize * MM_PX_UNIT}px` 
              }) 
            }} 
            onClick={() => setSelectedIds([])}
          >
            {/* 드로잉 중 가이드 박스 */}
            {tempRect && (
              <Box 
                sx={{ 
                  position: 'absolute', 
                  left: `${tempRect.x}mm`, 
                  top: `${tempRect.y}mm`, 
                  width: `${tempRect.w}mm`, 
                  height: `${tempRect.h}mm`, 
                  border: '1px dashed #1976d2', 
                  backgroundColor: 'rgba(25, 118, 210, 0.1)', 
                  zIndex: 1000 
                }} 
              />
            )}
            
            {/* 아이템 레이어 렌더링 */}
            {items.filter(i => i.visible).map((item) => {
              if (!nodeRefs.current[item.id]) nodeRefs.current[item.id] = createRef();
              const isSel = selectedIds.includes(item.id);
              return (
                <Draggable 
                  key={item.id} 
                  nodeRef={nodeRefs.current[item.id]} 
                  disabled={activeTool !== 'select' || isResizing} 
                  scale={zoom} 
                  position={{ x: item.x * MM_PX_UNIT, y: item.y * MM_PX_UNIT }} 
                  onDrag={(e, data) => handleGroupDrag(item.id, data)}
                >
                  <div 
                    ref={nodeRefs.current[item.id]} 
                    onClick={(e) => handleItemClick(e, item.id)} 
                    style={{ 
                      position: 'absolute', 
                      border: isSel ? '1px solid #1976d2' : '1px transparent', 
                      padding: '2px', 
                      cursor: activeTool === 'select' ? 'move' : 'crosshair', 
                      zIndex: isSel ? 100 : 1 
                    }}
                  >
                    {['text', 'data', 'date'].includes(item.type) && (
                      <Typography 
                        sx={{ 
                          fontSize: `${item.fontSize}pt`, 
                          whiteSpace: 'nowrap', 
                          lineHeight: 1, 
                          color: item.type === 'data' ? '#1976d2' : '#000', 
                          fontWeight: item.fontWeight 
                        }}
                      >
                        {item.type === 'date' ? getKstPreviewDate(item.content) : item.content}
                      </Typography>
                    )}
                    {item.type === 'rect' && <Box sx={{ width: `${item.width}mm`, height: `${item.height}mm`, border: `${item.borderWidth}px solid #000`, boxSizing: 'border-box' }} />}
                    {item.type === 'circle' && <Box sx={{ width: `${item.width}mm`, height: `${item.height}mm`, border: `${item.borderWidth}px solid #000`, borderRadius: '50%', boxSizing: 'border-box' }} />}
                    {item.type === 'line' && <Box sx={{ width: `${item.width}mm`, height: `${item.borderWidth}px`, backgroundColor: '#000' }} />}
                    {item.type === 'image' && (
                      <Box 
                        sx={{ 
                          width: `${item.width}mm`, 
                          height: `${item.height}mm`, 
                          border: item.src ? 'none' : '1px dashed #ccc', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          overflow: 'hidden' 
                        }}
                      >
                        {item.src ? <img src={item.src} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="up" /> : <ImageIcon sx={{ color: '#ccc' }} />}
                      </Box>
                    )}
                    {item.type === 'barcode' && <Barcode value={codeDataWithPrefix || 'DATA'} format={item.barcodeType} width={item.width / 20} height={item.height * MM_PX_UNIT} displayValue={false} margin={0} />}
                    {item.type === 'qrcode' && <QRCode value={codeDataWithPrefix || 'DATA'} size={item.height * MM_PX_UNIT} />}
                    
                    {/* 단일 선택 시에만 노출되는 리사이징 핸들 */}
                    {isSel && selectedIds.length === 1 && item.type !== 'line' && (
                      <Box 
                        onMouseDown={(e) => { e.stopPropagation(); setIsResizing(true); }} 
                        sx={{ 
                          position: 'absolute', right: -5, bottom: -5, width: 10, height: 10, 
                          backgroundColor: '#1976d2', cursor: 'nwse-resize', borderRadius: '50%', 
                          border: '1px solid #fff', zIndex: 101 
                        }} 
                      />
                    )}
                  </div>
                </Draggable>
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* 3. 우측 사이드 패널 (Properties & Layers) */}
      <Box 
        sx={{ 
          width: 320, 
          borderLeft: '1px solid #ddd', 
          backgroundColor: '#fff', 
          display: 'flex', 
          flexDirection: 'column' 
        }}
      >
        {/* 상단: 속성 창 (Properties) */}
        <Box sx={{ p: 2, flex: 1, overflowY: 'auto' }}>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold" color="primary">Properties</Typography>
          <Divider sx={{ mb: 2 }} />
          
          {selectedIds.length > 0 ? (
            <Stack spacing={2}>
               {/* 다중 선택 시 정렬 도구 섹션 */}
               {selectedIds.length > 1 && (
                 <MuiPaper variant="outlined" sx={{ p: 1, backgroundColor: '#f5f5f5' }}>
                   <Typography variant="caption" fontWeight="bold" display="block" mb={1}>개체 정렬 (Align)</Typography>
                   <Stack direction="row" spacing={0.5} justifyContent="space-between">
                     <Tooltip title="좌측"><IconButton size="small" onClick={() => alignSelectedItems('left')}><AlignHorizontalLeftIcon fontSize="small"/></IconButton></Tooltip>
                     <Tooltip title="수평중앙"><IconButton size="small" onClick={() => alignSelectedItems('h-center')}><AlignHorizontalCenterIcon fontSize="small"/></IconButton></Tooltip>
                     <Tooltip title="우측"><IconButton size="small" onClick={() => alignSelectedItems('right')}><AlignHorizontalRightIcon fontSize="small"/></IconButton></Tooltip>
                     <Tooltip title="상단"><IconButton size="small" onClick={() => alignSelectedItems('top')}><AlignVerticalTopIcon fontSize="small"/></IconButton></Tooltip>
                     <Tooltip title="수직중앙"><IconButton size="small" onClick={() => alignSelectedItems('v-center')}><AlignVerticalCenterIcon fontSize="small"/></IconButton></Tooltip>
                     <Tooltip title="하단"><IconButton size="small" onClick={() => alignSelectedItems('bottom')}><AlignVerticalBottomIcon fontSize="small"/></IconButton></Tooltip>
                   </Stack>
                 </MuiPaper>
               )}

               {selectedIds.length === 1 ? (
                 <>
                   <FormControlLabel 
                     control={<Checkbox size="small" checked={items.find(i => i.id === selectedIds[0])?.useSnap} onChange={(e) => updateItem(selectedIds[0], 'useSnap', e.target.checked)} />} 
                     label={<Typography variant="caption" fontWeight="bold">자석 스냅 사용</Typography>} 
                   />
                   
                   {items.find(i => i.id === selectedIds[0])?.type === 'image' && (
                     <Button 
                       variant="outlined" 
                       startIcon={<AddPhotoAlternateIcon />} 
                       fullWidth 
                       onClick={() => imageInputRef.current.click()}
                     >
                       이미지 선택
                     </Button>
                   )}
                   <input 
                     type="file" 
                     ref={imageInputRef} 
                     style={{ display: 'none' }} 
                     accept="image/*" 
                     onChange={handleImageUpload} 
                   />
                   
                   {['text', 'data', 'date'].includes(items.find(i => i.id === selectedIds[0])?.type) && (
                     <MuiPaper variant="outlined" sx={{ p: 1.5, backgroundColor: '#fcfcfc' }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <TextField label="폰트(pt)" type="number" size="small" value={items.find(i => i.id === selectedIds[0])?.fontSize} onChange={(e) => updateItem(selectedIds[0], 'fontSize', parseInt(e.target.value))} />
                          <IconButton color={items.find(i => i.id === selectedIds[0])?.fontWeight === 'bold' ? 'primary' : 'default'} onClick={() => updateItem(selectedIds[0], 'fontWeight', items.find(i => i.id === selectedIds[0])?.fontWeight === 'bold' ? 'normal' : 'bold')}><FormatBoldIcon /></IconButton>
                        </Stack>
                     </MuiPaper>
                   )}

                   {['data', 'date'].includes(items.find(i => i.id === selectedIds[0])?.type) && (
                     <TextField label="바코드 접두어(Prefix)" size="small" value={items.find(i => i.id === selectedIds[0])?.prefix || ''} onChange={(e) => updateItem(selectedIds[0], 'prefix', e.target.value)} />
                   )}
                   
                   <Stack direction="row" spacing={1}>
                     <TextField label="X" type="number" size="small" value={items.find(i => i.id === selectedIds[0])?.x} onChange={(e) => updateItem(selectedIds[0], 'x', parseFloat(e.target.value))} />
                     <TextField label="Y" type="number" size="small" value={items.find(i => i.id === selectedIds[0])?.y} onChange={(e) => updateItem(selectedIds[0], 'y', parseFloat(e.target.value))} />
                   </Stack>
                   <Stack direction="row" spacing={1}>
                     <TextField label="W" type="number" size="small" value={items.find(i => i.id === selectedIds[0])?.width} onChange={(e) => updateItem(selectedIds[0], 'width', parseFloat(e.target.value))} />
                     <TextField label="H" type="number" size="small" value={items.find(i => i.id === selectedIds[0])?.height} onChange={(e) => updateItem(selectedIds[0], 'height', parseFloat(e.target.value))} />
                   </Stack>
                   <TextField label="Content" size="small" multiline value={items.find(i => i.id === selectedIds[0])?.content} onChange={(e) => updateItem(selectedIds[0], 'content', e.target.value)} />
                 </>
               ) : (
                 <Typography variant="body2" color="textSecondary" align="center">{selectedIds.length}개 개체 선택됨</Typography>
               )}
               <Button variant="contained" color="error" fullWidth startIcon={<DeleteIcon />} onClick={deleteSelectedItems}>삭제</Button>
            </Stack>
          ) : (
            <Stack spacing={2}>
              <TextField label="양식 이름" size="small" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
              <Stack direction="row" spacing={1}>
                <TextField label="너비(W)" type="number" size="small" value={layout.labelW} onChange={(e) => setLayout({...layout, labelW: e.target.value})} />
                <TextField label="높이(H)" type="number" size="small" value={layout.labelH} onChange={(e) => setLayout({...layout, labelH: e.target.value})} />
              </Stack>
              <TextField label="데이터 구분자" size="small" value={layout.delimiter} onChange={(e) => setLayout({...layout, delimiter: e.target.value})} />
            </Stack>
          )}
        </Box>

        <Divider />

        {/* 하단: 레이어 창 (Layers) */}
        <Box sx={{ p: 2, height: 220, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold" color="secondary">Layers (드래그 순서 변경)</Typography>
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            <Reorder.Group axis="y" values={items} onReorder={setItems} style={{ listStyle: 'none', padding: 0 }}>
              {items.map((item) => (
                <Reorder.Item key={item.id} value={item}>
                  <MuiPaper 
                    elevation={0} 
                    onClick={() => setSelectedIds([item.id])} 
                    sx={{ 
                      p: 1, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1, 
                      border: selectedIds.includes(item.id) ? '1px solid #1976d2' : '1px solid #eee', 
                      cursor: 'pointer', backgroundColor: selectedIds.includes(item.id) ? '#f0f7ff' : '#fff' 
                    }}
                  >
                    <DragIndicatorIcon fontSize="small" sx={{ color: '#ccc' }} />
                    <Typography variant="caption" sx={{ flex: 1, fontWeight: 'bold' }}>{item.label || item.type}</Typography>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); updateItem(item.id, 'visible', !item.visible); }}>
                      <VisibilityIcon fontSize="inherit" color={item.visible ? 'action' : 'disabled'} />
                    </IconButton>
                  </MuiPaper>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </Box>
        </Box>
      </Box>

      {/* 디자인 불러오기 팝업 */}
      <Dialog 
        open={openDbDialog} 
        onClose={() => setOpenDbDialog(false)} 
        fullWidth 
        maxWidth="xs"
      >
        <DialogTitle>디자인 불러오기</DialogTitle>
        <DialogContent dividers>
          <List>
            {dbList.map(t => (
              <ListItem 
                key={t.TemplateId} 
                disablePadding 
                secondaryAction={<IconButton edge="end" color="error" size="small" onClick={(e) => handleDeleteTemplate(e, t.TemplateId, t.TemplateName)}><CloseIcon fontSize="small" /></IconButton>}
              >
                <ListItemButton 
                  onClick={() => { 
                    setTemplateId(t.TemplateId); setTemplateName(t.TemplateName); 
                    const raw = JSON.parse(t.DesignJson); 
                    setLayout({ ...layout, labelW: t.LabelW, labelH: t.LabelH, ...(raw[0].layout || {}) }); 
                    setItems(raw.slice(1)); 
                    setOpenDbDialog(false); 
                  }}
                >
                  <ListItemText primary={t.TemplateName} secondary={`${t.LabelW}x${t.LabelH}mm`} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default LabelDesignPage;