/**
 * @file        LabelDesignPage.jsx
 * @description 전문 디자인 툴 방식의 라벨 편집기 페이지
 * (바코드/QR코드 데이터 자동 조합 미리보기 및 프로젝트 작성 규칙 완벽 적용)
 */

import React, { 
  useState, 
  useRef, 
  createRef, 
  useEffect, 
  useCallback, 
  useMemo 
} from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Stack, 
  TextField, 
  Button, 
  Divider, 
  IconButton, 
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
  Paper as MuiPaper,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { Reorder } from 'framer-motion'; 
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import SaveIcon from '@mui/icons-material/Save';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DeleteIcon from '@mui/icons-material/Delete';
import CursorIcon from '@mui/icons-material/NearMe';
import PanToolIcon from '@mui/icons-material/PanTool';
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
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import AlignHorizontalLeftIcon from '@mui/icons-material/AlignHorizontalLeft';
import AlignHorizontalCenterIcon from '@mui/icons-material/AlignHorizontalCenter';
import AlignHorizontalRightIcon from '@mui/icons-material/AlignHorizontalRight';
import AlignVerticalTopIcon from '@mui/icons-material/AlignVerticalTop';
import AlignVerticalCenterIcon from '@mui/icons-material/AlignVerticalCenter';
import AlignVerticalBottomIcon from '@mui/icons-material/AlignVerticalBottom';
import ViewColumnIcon from '@mui/icons-material/ViewColumn'; 
import TableRowsIcon from '@mui/icons-material/TableRows';
import Barcode from 'react-barcode';
import QRCode from 'react-qr-code';
import Draggable from 'react-draggable';
import apiClient from '../../utils/apiClient';
import { 
  showAlert, 
  showConfirm 
} from '../../utils/swal';

/** * [상수] mm 단위를 화면 px 단위로 변환하기 위한 비율 (96dpi 기준) 
 */
const MM_PX_UNIT = 3.78; 

const LabelDesignPage = () => {
  /** * [영역 분리: 상태 관리 - 템플릿 및 개체 데이터] 
   */
  const [templateId, setTemplateId] = useState(null);           
  const [templateName, setTemplateName] = useState('');         
  const [items, setItems] = useState([]);             
  const [selectedIds, setSelectedIds] = useState([]);

  /** * [영역 분리: 상태 관리 - 캔버스 및 정밀 제어] 
   */
  const [layout, setLayout] = useState({ 
    labelW: '100', 
    labelH: '50', 
    delimiter: '_' 
  });
  const [zoom, setZoom] = useState(1.5);              
  const [showGrid, setShowGrid] = useState(true);     
  const [snapToGrid, setSnapToGrid] = useState(true); 
  const [gridSize, setGridSize] = useState(2);

  /** * [영역 분리: 상태 관리 - 드로잉, 패닝 및 리사이징 모드] 
   */
  const [activeTool, setActiveTool] = useState('select'); 
  const [isDrawing, setIsDrawing] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [tempRect, setTempRect] = useState(null);

  /** * [영역 분리: 상태 관리 - UI 요소 제어] 
   */
  const [openDbDialog, setOpenDbDialog] = useState(false);       
  const [dbList, setDbList] = useState([]);                      

  /** * [영역 분리: Ref - DOM 및 스크롤/드래그 참조] 
   */
  const canvasRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const nodeRefs = useRef({});       
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const dragInfoRef = useRef({ 
    startX: 0, 
    startY: 0, 
    isDragging: false 
  });

  /** * [영역 분리: 파생 상태] 
   * 단일 개체 선택 최적화 및 속성 패널용 타겟 요소
   */
  const targetItem = selectedIds.length === 1 
    ? items.find(i => i.id === selectedIds[0]) 
    : null;

  /** * [영역 분리: 이벤트 핸들러 - 툴 제어] 
   */
  const handleToolChange = (tool) => {
    setActiveTool(tool);
    if (tool !== 'select') {
      setSelectedIds([]); 
    }
  };

  /** * [영역 분리: 로직 - 좌표 변환 및 스냅 계산] 
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

  const getEffectiveSnap = () => showGrid && snapToGrid;

  const applySnap = (val, forceSnap) => {
    if (!getEffectiveSnap() || !forceSnap) {
      return parseFloat(val.toFixed(1));
    }
    return Math.round(val / gridSize) * gridSize;
  };

  /** * [영역 분리: 로직 - 개체 실제 크기(Bounding Box) 측정] 
   */
  const getRealBBox = (item) => {
    if (['text', 'data', 'date'].includes(item.type)) {
      const el = nodeRefs.current[item.id]?.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const realW = rect.width / zoom / MM_PX_UNIT;
        const realH = rect.height / zoom / MM_PX_UNIT;
        return { 
          x: item.x, 
          y: item.y, 
          w: realW, 
          h: realH 
        };
      }
    }
    return { 
      x: item.x, 
      y: item.y, 
      w: item.width || 0, 
      h: item.height || 0 
    };
  };

  /** * [영역 분리: 로직 - 다중 개체 정렬 및 간격 맞춤] 
   */
  const alignSelectedItems = (type) => {
    if (selectedIds.length < 2) return;

    const selectedItems = items.filter((i) => selectedIds.includes(i.id));
    const bboxes = selectedItems.map(item => ({ 
      item, 
      bbox: getRealBBox(item) 
    }));
    
    const minX = Math.min(...bboxes.map(b => b.bbox.x));
    const maxX = Math.max(...bboxes.map(b => b.bbox.x + b.bbox.w));
    const minY = Math.min(...bboxes.map(b => b.bbox.y));
    const maxY = Math.max(...bboxes.map(b => b.bbox.y + b.bbox.h));
    
    const boxCenterX = (minX + maxX) / 2;
    const boxCenterY = (minY + maxY) / 2;

    if (type === 'h-distribute') {
      if (selectedItems.length < 3) return; 
      const sorted = [...bboxes].sort((a, b) => a.bbox.x - b.bbox.x);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalWidth = sorted.reduce((acc, curr) => acc + curr.bbox.w, 0);
      const availableSpace = (last.bbox.x + last.bbox.w) - first.bbox.x - totalWidth;
      const gap = availableSpace / (sorted.length - 1);
      
      const targetX = {};
      let currentX = first.bbox.x;
      sorted.forEach((b, idx) => {
        if (idx === 0) {
          targetX[b.item.id] = b.item.x;
          currentX += b.bbox.w + gap;
        } else if (idx === sorted.length - 1) {
          targetX[b.item.id] = b.item.x;
        } else {
          targetX[b.item.id] = currentX;
          currentX += b.bbox.w + gap;
        }
      });

      setItems((prev) => prev.map((item) => 
        targetX[item.id] !== undefined 
          ? { ...item, x: targetX[item.id] } 
          : item
      ));
      return;
    }

    if (type === 'v-distribute') {
      if (selectedItems.length < 3) return;
      const sorted = [...bboxes].sort((a, b) => a.bbox.y - b.bbox.y);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalHeight = sorted.reduce((acc, curr) => acc + curr.bbox.h, 0);
      const availableSpace = (last.bbox.y + last.bbox.h) - first.bbox.y - totalHeight;
      const gap = availableSpace / (sorted.length - 1);
      
      const targetY = {};
      let currentY = first.bbox.y;
      sorted.forEach((b, idx) => {
        if (idx === 0) {
          targetY[b.item.id] = b.item.y;
          currentY += b.bbox.h + gap;
        } else if (idx === sorted.length - 1) {
          targetY[b.item.id] = b.item.y;
        } else {
          targetY[b.item.id] = currentY;
          currentY += b.bbox.h + gap;
        }
      });

      setItems((prev) => prev.map((item) => 
        targetY[item.id] !== undefined 
          ? { ...item, y: targetY[item.id] } 
          : item
      ));
      return;
    }

    setItems((prev) => prev.map((item) => {
      if (!selectedIds.includes(item.id)) return item;
      
      const { bbox } = bboxes.find(b => b.item.id === item.id);
      let newX = item.x;
      let newY = item.y;

      switch (type) {
        case 'left':     newX = minX; break;
        case 'right':    newX = maxX - bbox.w; break;
        case 'top':      newY = minY; break;
        case 'bottom':   newY = maxY - bbox.h; break;
        case 'h-center': newX = boxCenterX - (bbox.w / 2); break;
        case 'v-center': newY = boxCenterY - (bbox.h / 2); break;
        default: break;
      }
      return { 
        ...item, 
        x: newX, 
        y: newY 
      };
    }));
  };

  /** * [영역 분리: 로직 - 날짜/시간 처리 (KST 타임존 적용)] 
   * @description 현재 시간을 기준으로 한국 표준시(KST, UTC+9)를 철저히 고려하여 변환합니다.
   */
  const getKstPreviewDate = (format) => {
    if (!format) return '';
    const now = new Date();
    // UTC 시간에 9시간을 더하여 KST 도출
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

  /** * [영역 분리: 파생 데이터 - 바코드 및 QR코드용 데이터 조합] 
   * @description 화면 내의 모든 'data'와 'date' 개체의 값을 접두어와 함께 조합하여 바코드용 데이터 스트링을 생성합니다.
   */
  const codeDataWithPrefix = useMemo(() => {
    return items
      .filter((i) => i.type === 'data' || i.type === 'date')
      .map((i) => {
        let val = i.type === 'date' 
          ? getKstPreviewDate(i.content) 
          : (i.content || 'DATA');
        // 바코드 인식 오류를 방지하기 위해 날짜 특수문자 제거
        if (i.type === 'date') val = val.replace(/[-_:\s]/g, ''); 
        return `${i.prefix || ''}${val}`;
      })
      .join(layout.delimiter || '');
  }, [items, layout.delimiter]);

  /** * [영역 분리: 이벤트 핸들러 - 개체 드래그 및 마우스 조작] 
   */
  const handleDragStart = (e, data) => {
    dragInfoRef.current = { 
      startX: data.x, 
      startY: data.y, 
      isDragging: false 
    };
  };

  const handleGroupDrag = (e, data) => {
    // 튕김 및 미세 떨림 방어 로직
    if (Math.abs(data.x - dragInfoRef.current.startX) > 2 || Math.abs(data.y - dragInfoRef.current.startY) > 2) {
      dragInfoRef.current.isDragging = true;
    }
    
    const dx = data.deltaX / MM_PX_UNIT;
    const dy = data.deltaY / MM_PX_UNIT;

    setItems((prev) => prev.map((item) => {
      if (selectedIds.includes(item.id)) {
        return {
          ...item,
          x: item.x + dx,
          y: item.y + dy
        };
      }
      return item;
    }));
  };

  const handleDragStop = () => {
    setTimeout(() => { 
      dragInfoRef.current.isDragging = false; 
    }, 100);
    
    setItems((prev) => prev.map((item) => {
      if (selectedIds.includes(item.id)) {
        return {
          ...item,
          x: applySnap(item.x, item.useSnap),
          y: applySnap(item.y, item.useSnap)
        };
      }
      return item;
    }));
  };

  const handleItemClick = (e, id) => {
    e.stopPropagation();
    if (dragInfoRef.current.isDragging) return;
    if (activeTool !== 'select') return;

    if (e.shiftKey) {
      setSelectedIds((prev) => 
        prev.includes(id) 
          ? prev.filter((sid) => sid !== id) 
          : [...prev, id]
      );
    } else {
      setSelectedIds([id]);
    }
  };

  /** * [영역 분리: 로직 - 개별 및 다중 속성 업데이트] 
   * @description 단일 필드 변경 뿐만 아니라 객체 형태를 넘겨 여러 필드를 동시 업데이트할 수 있습니다.
   */
  const updateItem = (id, fieldOrObj, value) => {
    setItems((prev) => prev.map((item) => {
      if (item.id === id) {
        if (typeof fieldOrObj === 'object') {
          return { 
            ...item, 
            ...fieldOrObj 
          };
        }
        return { 
          ...item, 
          [fieldOrObj]: value 
        };
      }
      return item;
    }));
  };

  const deleteSelectedItems = useCallback(() => {
    if (selectedIds.length > 0) {
      setItems((prev) => prev.filter((i) => !selectedIds.includes(i.id)));
      setSelectedIds([]);
    }
  }, [selectedIds]);

  /** * [영역 분리: 부수 효과 (Effect) - 전역 마우스/키보드 감시] 
   */
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (isResizing && selectedIds.length === 1) {
        const item = items.find((i) => i.id === selectedIds[0]);
        if (!item) return;
        const currentPos = getMmPos(e);
        const newW = applySnap(currentPos.x - item.x, item.useSnap);
        const newH = applySnap(currentPos.y - item.y, item.useSnap);

        if (item.type === 'line') {
           updateItem(item.id, { 
             width: Math.max(0.5, newW), 
             height: Math.max(0.5, newH) 
           });
        } else if (item.type === 'qrcode') {
           // QR 코드의 1:1 비율 강제 유지
           const size = Math.max(0.5, Math.max(newW, newH));
           updateItem(item.id, { 
             width: size, 
             height: size 
           });
        } else {
           updateItem(item.id, { 
             width: Math.max(0.5, newW), 
             height: Math.max(0.5, newH) 
           });
        }
      }
      
      if (isDrawing) {
        const currentPos = getMmPos(e);
        let rawW = currentPos.x - drawStart.x;
        let rawH = currentPos.y - drawStart.y;
        let w = Math.abs(rawW);
        let h = Math.abs(rawH);

        if (activeTool === 'qrcode') {
           const size = Math.max(w, h);
           w = size; 
           h = size;
           rawW = rawW < 0 ? -size : size;
           rawH = rawH < 0 ? -size : size;
        }

        setTempRect({
          x: Math.min(drawStart.x, drawStart.x + rawW),
          y: Math.min(drawStart.y, drawStart.y + rawH),
          w, 
          h
        });
      }

      if (isPanning && scrollContainerRef.current) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        scrollContainerRef.current.scrollLeft -= dx;
        scrollContainerRef.current.scrollTop -= dy;
        setPanStart({ 
          x: e.clientX, 
          y: e.clientY 
        });
      }
    };

    const handleGlobalMouseUp = () => {
      setIsResizing(false);
      setIsPanning(false);
    };

    const handleKeyDown = (e) => {
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
  }, [
    isResizing, isDrawing, isPanning, selectedIds, 
    items, zoom, showGrid, snapToGrid, gridSize, 
    drawStart, panStart, deleteSelectedItems, activeTool
  ]);

  /** * [영역 분리: 이벤트 핸들러 - 캔버스 바탕 클릭 및 화면 배율 조작] 
   */
  const handleMouseDownCanvas = (e) => {
    if (e.target === canvasRef.current || e.target === scrollContainerRef.current) {
      setSelectedIds([]);
    }

    if (activeTool === 'pan') {
      setIsPanning(true);
      setPanStart({ 
        x: e.clientX, 
        y: e.clientY 
      });
      return;
    }

    if (activeTool === 'select' || isResizing) return;
    
    setIsDrawing(true);
    const pos = getMmPos(e);
    setDrawStart(pos);
    setTempRect({ 
      x: pos.x, 
      y: pos.y, 
      w: 0, 
      h: 0 
    });
  };

  const handleMouseUpCanvas = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!isDrawing || !tempRect) return;
    
    if (tempRect.w > 0.5 || tempRect.h > 0.5) {
      const newId = `item-${Date.now()}`;
      let finalW = applySnap(tempRect.w, true) || 20;
      let finalH = applySnap(tempRect.h, true) || (activeTool === 'line' ? 1 : activeTool === 'qrcode' ? 20 : 10);
      
      if (activeTool === 'qrcode') {
         const size = Math.max(finalW, finalH);
         finalW = size; 
         finalH = size;
      }

      const newItem = {
        id:           newId, 
        type:         activeTool, 
        label:        `${activeTool}_${items.length + 1}`,
        content:      activeTool === 'text' ? 'TEXT' : activeTool === 'image' ? '' : activeTool === 'date' ? 'YYYY-MM-DD' : 'DATA',
        x:            applySnap(tempRect.x, true), 
        y:            applySnap(tempRect.y, true),
        width:        finalW, 
        height:       finalH,
        rotate:       0,
        fontSize:     12, 
        fontWeight:   'normal', 
        fontStyle:    'normal', 
        barcodeType:  'CODE128', 
        qrErrorLevel: 'M',
        borderWidth:  1, 
        visible:      true, 
        useSnap:      true, 
        prefix:       '', 
        src:          ''
      };
      
      setItems([newItem, ...items]);
      setSelectedIds([newId]);
    }
    
    setIsDrawing(false); 
    setTempRect(null); 
    setActiveTool('select');
  };

  const handleWheelZoom = (e) => {
    if (e.ctrlKey) {
      e.preventDefault(); 
      setZoom((prev) => {
        const newZoom = prev + (e.deltaY > 0 ? -0.1 : 0.1);
        return Math.min(Math.max(newZoom, 0.5), 3.0); 
      });
    }
  };

  /** * [영역 분리: 이벤트 핸들러 - JSON 데이터 입출력 (Export/Import)] 
   */
  const handleExportJson = () => {
    const data = { 
      templateName, 
      layout, 
      items 
    };
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
        showAlert("성공", "success", "파일을 불러왔습니다.");
      } catch (err) { 
        showAlert("오류", "error", "올바른 JSON 파일이 아닙니다."); 
      }
    };
    reader.readAsText(file); 
    e.target.value = null;
  };

  /** * [영역 분리: API 연동 및 서버 통신] 
   */
  const requestSave = async (targetId) => {
    if (!templateName) {
      return showAlert("확인", "warning", "양식 이름을 입력하세요.");
    }
    
    try {
      const payload = {
        templateId:   targetId, 
        templateName: templateName, 
        labelW:       layout.labelW, 
        labelH:       layout.labelH,
        designJson:   JSON.stringify([{ type: 'meta', layout }, ...items])
      };
      const res = await apiClient.post('/label/template/save', payload);
      setTemplateId(res.data.resultId); 
      showAlert("성공", "success", "저장되었습니다.");
    } catch (e) { 
      showAlert("실패", "error", "저장 오류"); 
    }
  };

  const handleDeleteTemplate = async (e, id, name) => {
    e.stopPropagation();
    const confirmed = await showConfirm("삭제", `[${name}] 양식을 삭제할까요?`);
    
    if (confirmed) {
      try {
        await apiClient.delete(`/label/template/${id}`);
        const res = await apiClient.get('/label/template/list');
        setDbList(res.data.data || []);
        showAlert("성공", "success", "삭제 완료");
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

  /** * [영역 분리: 렌더링 영역 - 전체 화면 구조] 
   */
  return (
    <Box 
      sx={{ 
        display:         'flex', 
        height:          'calc(100vh - 160px)', 
        backgroundColor: 'background.default', 
        gap:             0,
        overflow:        'hidden'
      }}
    >
      
      {/* 1. 좌측 도구 모음 패널 */}
      <Paper 
        elevation={0} 
        sx={{ 
          width:           60, 
          display:         'flex', 
          flexDirection:   'column', 
          alignItems:      'center', 
          py:              2, 
          gap:             1, 
          backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#111827' : '#2c3e50', 
          color:           '#fff', 
          borderRadius:    0,
          zIndex:          12
        }}
      >
        <Tooltip 
          title="선택 (Del삭제 / Shift다중)" 
          placement="right"
        >
          <IconButton 
            color={activeTool === 'select' ? 'primary' : 'inherit'} 
            onClick={() => handleToolChange('select')}
          >
            <CursorIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip 
          title="이동 (화면 스크롤)" 
          placement="right"
        >
          <IconButton 
            color={activeTool === 'pan' ? 'primary' : 'inherit'} 
            onClick={() => handleToolChange('pan')}
          >
            <PanToolIcon />
          </IconButton>
        </Tooltip>
        
        <Divider 
          sx={{ 
            width:   '60%', 
            bgcolor: 'rgba(255,255,255,0.1)', 
            my:      1 
          }} 
        />
        
        {[
          { id: 'text',    icon: <TitleIcon />,                  label: '글자' }, 
          { id: 'data',    icon: <DataObjectIcon />,             label: '데이터' }, 
          { id: 'date',    icon: <EventIcon />,                  label: '날짜' },
          { id: 'rect',    icon: <CropSquareIcon />,             label: '사각형' }, 
          { id: 'circle',  icon: <RadioButtonUncheckedIcon />,   label: '타원' }, 
          { id: 'line',    icon: <MaximizeIcon />,               label: '선' },
          { id: 'image',   icon: <ImageIcon />,                  label: '이미지' }, 
          { id: 'barcode', icon: <BarcodeIcon />,                label: '바코드' }, 
          { id: 'qrcode',  icon: <QrCodeIcon />,                 label: 'QR코드' }
        ].map(tool => (
          <Tooltip 
            key={tool.id} 
            title={tool.label} 
            placement="right"
          >
            <IconButton 
              color={activeTool === tool.id ? 'primary' : 'inherit'} 
              onClick={() => handleToolChange(tool.id)}
            >
              {tool.icon}
            </IconButton>
          </Tooltip>
        ))}
      </Paper>

      {/* 2. 중앙 캔버스 작업 영역 */}
      <Box 
        sx={{ 
          flex:          1, 
          display:       'flex', 
          flexDirection: 'column', 
          overflow:      'hidden',
          position:      'relative'
        }}
      >
        <Paper 
          sx={{ 
            p:              1, 
            display:        'flex', 
            justifyContent: 'space-between', 
            alignItems:     'center', 
            borderRadius:   0, 
            borderBottom:   '1px solid', 
            borderColor:    'divider',
            backgroundColor: 'background.paper',
            zIndex:         12
          }}
        >
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
              min={0.5} 
              max={3} 
              step={0.1} 
              onChange={(e, v) => setZoom(v)} 
              sx={{ 
                width: 80 
              }} 
            />
            <FormControlLabel 
              control={
                <Checkbox 
                  size="small" 
                  checked={showGrid} 
                  onChange={(e) => setShowGrid(e.target.checked)} 
                />
              } 
              label={<Typography variant="caption">격자</Typography>} 
            />
            
            {showGrid && (
              <Stack 
                direction="row" 
                alignItems="center" 
                spacing={0.5}
              >
                <TextField 
                  size="small"
                  type="number"
                  variant="outlined"
                  value={gridSize}
                  // 엣지 케이스 방지: 값이 지워졌을 때 NaN을 대비하여 1mm 고정 적용
                  onChange={(e) => setGridSize(Math.max(0.1, parseFloat(e.target.value) || 1))}
                  sx={{ 
                    width: 65 
                  }}
                  inputProps={{ 
                    step: 0.5, 
                    min: 0.1, 
                    style: { 
                      padding: '4px', 
                      fontSize: '0.75rem', 
                      textAlign: 'center' 
                    } 
                  }}
                />
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                >
                  mm
                </Typography>
              </Stack>
            )}

            <FormControlLabel 
              control={
                <Checkbox 
                  size="small" 
                  disabled={!showGrid} 
                  checked={showGrid && snapToGrid} 
                  onChange={(e) => setSnapToGrid(e.target.checked)} 
                />
              } 
              label={<Typography variant="caption">스냅</Typography>} 
            />
          </Stack>
          
          <Stack 
            direction="row" 
            spacing={1}
          >
            <Button 
              size="small" 
              variant="outlined" 
              startIcon={<FolderOpenIcon />} 
              onClick={() => {
                apiClient.get('/label/template/list').then(res => { 
                  setDbList(res.data.data || []); 
                  setOpenDbDialog(true); 
                });
              }}
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

        <Box 
          sx={{ 
            flex:     1, 
            position: 'relative', 
            overflow: 'hidden' 
          }}
        >
          <Box 
            ref={scrollContainerRef}
            sx={{ 
              position:        'absolute', 
              top:             0, 
              left:            0, 
              right:           0, 
              bottom:          0,
              overflow:        'auto', 
              display:         'flex', 
              p:               10, 
              backgroundColor: (theme) => theme.palette.layout.design.canvasBg,
              cursor:          activeTool === 'pan' ? (isPanning ? 'grabbing' : 'grab') : 'default',
              userSelect:      'none',
              WebkitUserSelect:'none'
            }} 
            onMouseDown={handleMouseDownCanvas} 
            onMouseUp={handleMouseUpCanvas}
            onWheel={handleWheelZoom}
          >
            <Box 
              sx={{ 
                margin:         'auto', 
                width:          `${parseFloat(layout.labelW) * MM_PX_UNIT * zoom}px`, 
                height:         `${parseFloat(layout.labelH) * MM_PX_UNIT * zoom}px`, 
                display:        'flex', 
                alignItems:     'center', 
                justifyContent: 'center' 
              }}
            >
              <Box 
                ref={canvasRef} 
                sx={{ 
                  width:           `${layout.labelW}mm`, 
                  height:          `${layout.labelH}mm`, 
                  backgroundColor: '#fff', 
                  position:        'relative', 
                  boxShadow:       '0 10px 30px rgba(0,0,0,0.3)', 
                  transform:       `scale(${zoom})`, 
                  transformOrigin: 'center center', 
                  ...(showGrid && { 
                    backgroundImage:    `radial-gradient(rgba(0,0,0,0.2) 1.5px, transparent 1.5px)`, 
                    backgroundSize:     `${gridSize * MM_PX_UNIT}px ${gridSize * MM_PX_UNIT}px`,
                    backgroundPosition: `${-(gridSize * MM_PX_UNIT) / 2}px ${-(gridSize * MM_PX_UNIT) / 2}px`
                  }) 
                }} 
              >
                {tempRect && (
                  <Box 
                    sx={{ 
                      position:        'absolute', 
                      left:            `${tempRect.x}mm`, 
                      top:             `${tempRect.y}mm`, 
                      width:           `${tempRect.w}mm`, 
                      height:          `${tempRect.h}mm`, 
                      border:          '1px dashed #1976d2', 
                      backgroundColor: 'rgba(25, 118, 210, 0.1)', 
                      zIndex:          1000 
                    }} 
                  />
                )}
                
                {items.filter(i => i.visible).map((item) => {
                  if (!nodeRefs.current[item.id]) {
                    nodeRefs.current[item.id] = createRef();
                  }
                  const isSel = selectedIds.includes(item.id);
                  const isTextType = ['text', 'data', 'date'].includes(item.type);
                  
                  return (
                    <Draggable 
                      key={item.id} 
                      nodeRef={nodeRefs.current[item.id]} 
                      disabled={activeTool !== 'select' || isResizing || isPanning || !isSel} 
                      scale={zoom} 
                      position={{ 
                        x: item.x * MM_PX_UNIT, 
                        y: item.y * MM_PX_UNIT 
                      }} 
                      onStart={handleDragStart}
                      onDrag={(e, data) => handleGroupDrag(e, data)}
                      onStop={handleDragStop}
                    >
                      <div 
                        ref={nodeRefs.current[item.id]} 
                        onClick={(e) => handleItemClick(e, item.id)} 
                        style={{ 
                          position: 'absolute', 
                          cursor:   activeTool === 'select' ? 'move' : 'inherit', 
                          zIndex:   isSel ? 100 : 1,
                          userSelect: 'none',
                          WebkitUserSelect: 'none'
                        }}
                      >
                        <div 
                          style={{ 
                            transform:       `rotate(${item.rotate || 0}deg)`, 
                            transformOrigin: 'center center', 
                            border:          isSel ? '1.5px solid #1976d2' : '1px dashed transparent', 
                            width:           isTextType ? 'max-content' : `${item.width}mm`, 
                            height:          isTextType ? 'max-content' : `${item.height}mm`, 
                            position:        'relative' 
                          }}
                        >
                          
                          {/* 렌더링 1. 텍스트 개체들 (데이터 및 날짜 처리 통합 적용) */}
                          {isTextType && (
                            <Box 
                              sx={{ 
                                width:          'max-content', 
                                height:         'max-content', 
                                display:        'flex', 
                                alignItems:     'flex-start', 
                                justifyContent: 'flex-start' 
                              }}
                            >
                              <Typography 
                                sx={{ 
                                  fontSize:   `${item.fontSize}pt`, 
                                  whiteSpace: 'nowrap', 
                                  lineHeight: 1, 
                                  color:      item.type === 'data' ? '#1976d2' : '#000', 
                                  fontWeight: item.fontWeight,
                                  fontStyle:  item.fontStyle || 'normal'
                                }}
                              >
                                {item.type === 'date' 
                                  ? `${item.prefix || ''}${getKstPreviewDate(item.content)}` 
                                  : item.type === 'data' 
                                    ? `${item.prefix || ''}${item.content}` 
                                    : item.content}
                              </Typography>
                            </Box>
                          )}
                          
                          {/* 렌더링 2. 사각형 개체 */}
                          {item.type === 'rect' && (
                            <Box 
                              sx={{ 
                                width:     '100%', 
                                height:    '100%', 
                                border:    `${item.borderWidth}px solid #000`, 
                                boxSizing: 'border-box' 
                              }} 
                            />
                          )}
                          
                          {/* 렌더링 3. 타원(원) 개체 */}
                          {item.type === 'circle' && (
                            <Box 
                              sx={{ 
                                width:        '100%', 
                                height:       '100%', 
                                border:       `${item.borderWidth}px solid #000`, 
                                borderRadius: '50%', 
                                boxSizing:    'border-box' 
                              }} 
                            />
                          )}
                          
                          {/* 렌더링 4. 선 개체 */}
                          {item.type === 'line' && (
                            <Box 
                              sx={{ 
                                width:           '100%', 
                                height:          '100%', 
                                backgroundColor: '#000' 
                              }} 
                            />
                          )}
                          
                          {/* 렌더링 5. 이미지 개체 */}
                          {item.type === 'image' && (
                            <Box 
                              sx={{ 
                                width:          '100%', 
                                height:         '100%', 
                                border:         item.src ? 'none' : '1px dashed #ccc', 
                                display:        'flex', 
                                alignItems:     'center', 
                                justifyContent: 'center', 
                                overflow:       'hidden' 
                              }}
                            >
                              {item.src ? (
                                <img 
                                  src={item.src} 
                                  style={{ 
                                    width:     '100%', 
                                    height:    '100%', 
                                    objectFit: 'contain' 
                                  }} 
                                  alt="up" 
                                />
                              ) : (
                                <ImageIcon sx={{ color: '#ccc' }} />
                              )}
                            </Box>
                          )}
                          
                          {/* 렌더링 6. 바코드 개체 (조합된 데이터 실시간 반응) */}
                          {item.type === 'barcode' && (
                            <Box 
                              sx={{ 
                                width:          '100%', 
                                height:         '100%', 
                                display:        'flex', 
                                alignItems:     'stretch', 
                                justifyContent: 'stretch', 
                                overflow:       'hidden',
                                '& svg': {
                                  width:   '100% !important',
                                  height:  '100% !important',
                                  display: 'block'
                                }
                              }}
                              ref={(el) => {
                                if (el) {
                                  const svg = el.querySelector('svg');
                                  if (svg) svg.setAttribute('preserveAspectRatio', 'none');
                                }
                              }}
                            >
                              <Barcode 
                                value={codeDataWithPrefix || 'DATA'} 
                                format={item.barcodeType || 'CODE128'} 
                                width={2} 
                                height={100} 
                                displayValue={false} 
                                margin={0} 
                              />
                            </Box>
                          )}
                          
                          {/* 렌더링 7. QR코드 개체 (조합된 데이터 실시간 반응) */}
                          {item.type === 'qrcode' && (
                            <Box 
                              sx={{ 
                                width:  '100%', 
                                height: '100%' 
                              }}
                            >
                              <QRCode 
                                value={codeDataWithPrefix || 'DATA'} 
                                level={item.qrErrorLevel || 'M'} 
                                size={item.height * MM_PX_UNIT} 
                                style={{ 
                                  width: '100%', 
                                  height: '100%' 
                                }}
                              />
                            </Box>
                          )}
                          
                          {/* 렌더링 8. 선택 영역 우측 하단 리사이징 조절자 */}
                          {isSel && selectedIds.length === 1 && !isTextType && (
                            <Box 
                              onMouseDown={(e) => { 
                                e.stopPropagation(); 
                                setIsResizing(true); 
                              }} 
                              sx={{ 
                                position:        'absolute', 
                                right:           -5, 
                                bottom:          -5, 
                                width:           10, 
                                height:          10, 
                                backgroundColor: '#1976d2', 
                                cursor:          'nwse-resize', 
                                borderRadius:    '50%', 
                                border:          '1px solid #fff', 
                                zIndex:          101 
                              }} 
                            />
                          )}
                        </div>
                      </div>
                    </Draggable>
                  );
                })}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* 3. 우측 객체 속성(Properties) 패널 */}
      <Box 
        sx={{ 
          width:           320, 
          minWidth:        320, 
          flexShrink:      0, 
          borderLeft:      (theme) => `1px solid ${theme.palette.divider}`, 
          backgroundColor: 'background.paper', 
          display:         'flex', 
          flexDirection:   'column' 
        }}
      >
        <Box 
          sx={{ 
            p:         2, 
            flex:      1, 
            overflowY: 'auto' 
          }}
        >
          <Typography 
            variant="subtitle2" 
            gutterBottom 
            fontWeight="bold" 
            color="primary"
          >
            Properties
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          {selectedIds.length > 0 ? (
            <Stack spacing={2.5}>
               {/* 3-1. 레이어 식별 이름 (단일 선택 시 노출) */}
               {selectedIds.length === 1 && (
                 <TextField 
                   label="레이어 이름" 
                   size="small" 
                   fullWidth 
                   value={targetItem?.label || ''} 
                   onChange={(e) => updateItem(selectedIds[0], 'label', e.target.value)} 
                 />
               )}

               {/* 3-2. 다중 개체 정렬 툴바 */}
               {selectedIds.length > 1 && (
                 <MuiPaper 
                   variant="outlined" 
                   sx={{ 
                     p:               1.5, 
                     backgroundColor: 'action.hover' 
                   }}
                 >
                    <Typography 
                      variant="caption" 
                      fontWeight="bold" 
                      display="block" 
                      mb={1}
                    >
                      개체 정렬 및 간격 맞춤
                    </Typography>
                    
                    <Stack 
                      direction="row" 
                      spacing={0.5} 
                      justifyContent="space-between" 
                      mb={1}
                    >
                      <Tooltip title="좌측 맞춤">
                        <IconButton size="small" onClick={() => alignSelectedItems('left')}>
                          <AlignHorizontalLeftIcon fontSize="small"/>
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="수평 중앙 맞춤">
                        <IconButton size="small" onClick={() => alignSelectedItems('h-center')}>
                          <AlignHorizontalCenterIcon fontSize="small"/>
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="우측 맞춤">
                        <IconButton size="small" onClick={() => alignSelectedItems('right')}>
                          <AlignHorizontalRightIcon fontSize="small"/>
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="상단 맞춤">
                        <IconButton size="small" onClick={() => alignSelectedItems('top')}>
                          <AlignVerticalTopIcon fontSize="small"/>
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="수직 중앙 맞춤">
                        <IconButton size="small" onClick={() => alignSelectedItems('v-center')}>
                          <AlignVerticalCenterIcon fontSize="small"/>
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="하단 맞춤">
                        <IconButton size="small" onClick={() => alignSelectedItems('bottom')}>
                          <AlignVerticalBottomIcon fontSize="small"/>
                        </IconButton>
                      </Tooltip>
                    </Stack>

                    <Divider sx={{ my: 1 }} />
                    
                    <Stack 
                      direction="row" 
                      spacing={1} 
                      justifyContent="center"
                    >
                      <Button 
                        size="small" 
                        variant="outlined" 
                        startIcon={<ViewColumnIcon />} 
                        onClick={() => alignSelectedItems('h-distribute')} 
                        disabled={selectedIds.length < 3}
                      >
                        가로 간격 (3개↑)
                      </Button>
                      <Button 
                        size="small" 
                        variant="outlined" 
                        startIcon={<TableRowsIcon />} 
                        onClick={() => alignSelectedItems('v-distribute')} 
                        disabled={selectedIds.length < 3}
                      >
                        세로 간격 (3개↑)
                      </Button>
                    </Stack>
                 </MuiPaper>
               )}

               {/* 3-3. 단일 개체 제어 속성 그룹 */}
               {selectedIds.length === 1 && (
                 <>
                   <FormControlLabel 
                     control={
                       <Checkbox 
                         size="small" 
                         checked={targetItem?.useSnap || false} 
                         onChange={(e) => updateItem(selectedIds[0], 'useSnap', e.target.checked)} 
                       />
                     } 
                     label={
                       <Typography 
                         variant="caption" 
                         fontWeight="bold"
                       >
                         자석 스냅 유지
                       </Typography>
                     } 
                   />
                   
                   <MuiPaper 
                     variant="outlined" 
                     sx={{ 
                       p:               1.5, 
                       backgroundColor: 'action.hover' 
                     }}
                   >
                      <Stack 
                        direction="row" 
                        spacing={1} 
                        alignItems="center"
                      >
                        <RotateRightIcon 
                          fontSize="small" 
                          color="action" 
                        />
                        <Typography 
                          variant="caption" 
                          fontWeight="bold"
                        >
                          회전
                        </Typography>
                        <Slider 
                          size="small" 
                          value={targetItem?.rotate || 0} 
                          min={0} 
                          max={360} 
                          onChange={(e, v) => updateItem(selectedIds[0], 'rotate', v)} 
                        />
                        <TextField 
                          size="small" 
                          variant="outlined" 
                          type="number" 
                          value={targetItem?.rotate || 0} 
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            updateItem(selectedIds[0], 'rotate', isNaN(val) ? 0 : val);
                          }} 
                          sx={{ width: 100 }} 
                          inputProps={{ 
                            style: { 
                              fontSize:  '0.75rem', 
                              textAlign: 'center', 
                              padding:   '6px' 
                            } 
                          }} 
                        />
                      </Stack>
                   </MuiPaper>

                   <Stack 
                     direction="row" 
                     spacing={1}
                   >
                     <TextField 
                       label="X위치(mm)" 
                       type="number" 
                       size="small" 
                       value={targetItem?.x || 0} 
                       onChange={(e) => {
                         const val = parseFloat(e.target.value);
                         updateItem(selectedIds[0], 'x', isNaN(val) ? 0 : val);
                       }} 
                     />
                     <TextField 
                       label="Y위치(mm)" 
                       type="number" 
                       size="small" 
                       value={targetItem?.y || 0} 
                       onChange={(e) => {
                         const val = parseFloat(e.target.value);
                         updateItem(selectedIds[0], 'y', isNaN(val) ? 0 : val);
                       }} 
                     />
                   </Stack>
                   
                   {/* 사각형, 선, 바코드/QR 등 도형 계열의 치수 제어 */}
                   {!['text', 'data', 'date'].includes(targetItem?.type) && (
                     <Stack 
                       direction="row" 
                       spacing={1}
                     >
                       {targetItem?.type === 'qrcode' ? (
                         <TextField 
                           label="크기(W/H)" 
                           type="number" 
                           size="small" 
                           fullWidth
                           value={targetItem?.width || 0} 
                           onChange={(e) => {
                             const size = Math.max(1, parseFloat(e.target.value) || 1);
                             updateItem(selectedIds[0], { width: size, height: size });
                           }} 
                         />
                       ) : (
                         <>
                           <TextField 
                             label="너비(W)" 
                             type="number" 
                             size="small" 
                             value={targetItem?.width || 0} 
                             onChange={(e) => {
                               const val = parseFloat(e.target.value);
                               updateItem(selectedIds[0], 'width', isNaN(val) ? 1 : val);
                             }} 
                           />
                           <TextField 
                             label={targetItem?.type === 'line' ? '두께(H)' : '높이(H)'} 
                             type="number" 
                             size="small" 
                             value={targetItem?.height || 0} 
                             onChange={(e) => {
                               const val = parseFloat(e.target.value);
                               updateItem(selectedIds[0], 'height', isNaN(val) ? 1 : val);
                             }} 
                           />
                         </>
                       )}
                     </Stack>
                   )}

                   {targetItem?.type === 'image' && (
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

                   {targetItem?.type === 'barcode' && (
                     <FormControl 
                       fullWidth 
                       size="small"
                     >
                       <InputLabel>바코드 포맷</InputLabel>
                       <Select 
                         value={targetItem?.barcodeType || 'CODE128'} 
                         label="바코드 포맷" 
                         onChange={(e) => updateItem(selectedIds[0], 'barcodeType', e.target.value)}
                       >
                         <MenuItem value="CODE128">CODE128 (기본)</MenuItem>
                         <MenuItem value="CODE39">CODE39</MenuItem>
                         <MenuItem value="EAN13">EAN-13</MenuItem>
                         <MenuItem value="EAN8">EAN-8</MenuItem>
                         <MenuItem value="UPC">UPC</MenuItem>
                         <MenuItem value="ITF14">ITF-14</MenuItem>
                       </Select>
                     </FormControl>
                   )}

                   {targetItem?.type === 'qrcode' && (
                     <FormControl 
                       fullWidth 
                       size="small"
                     >
                       <InputLabel>오류 복원율</InputLabel>
                       <Select 
                         value={targetItem?.qrErrorLevel || 'M'} 
                         label="오류 복원율" 
                         onChange={(e) => updateItem(selectedIds[0], 'qrErrorLevel', e.target.value)}
                       >
                         <MenuItem value="L">L (Low - 7%)</MenuItem>
                         <MenuItem value="M">M (Medium - 15%)</MenuItem>
                         <MenuItem value="Q">Q (Quartile - 25%)</MenuItem>
                         <MenuItem value="H">H (High - 30%)</MenuItem>
                       </Select>
                     </FormControl>
                   )}
                   
                   {/* 텍스트 요소 전용: 폰트 사이즈 및 스타일 제어 */}
                   {['text', 'data', 'date'].includes(targetItem?.type) && (
                     <MuiPaper 
                       variant="outlined" 
                       sx={{ 
                         p:               1.5, 
                         backgroundColor: 'action.hover' 
                       }}
                     >
                        <Stack 
                          direction="row" 
                          spacing={1} 
                          alignItems="center"
                        >
                          <TextField 
                            label="폰트(pt)" 
                            type="number" 
                            size="small" 
                            value={targetItem?.fontSize || 12} 
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              updateItem(selectedIds[0], 'fontSize', isNaN(val) ? 8 : val);
                            }} 
                          />
                          <Tooltip title="굵게 (Bold)">
                            <IconButton 
                              size="small"
                              color={targetItem?.fontWeight === 'bold' ? 'primary' : 'default'} 
                              onClick={() => updateItem(
                                selectedIds[0], 
                                'fontWeight', 
                                targetItem?.fontWeight === 'bold' ? 'normal' : 'bold'
                              )}
                            >
                              <FormatBoldIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="기울임 (Italic)">
                            <IconButton 
                              size="small"
                              color={targetItem?.fontStyle === 'italic' ? 'primary' : 'default'} 
                              onClick={() => updateItem(
                                selectedIds[0], 
                                'fontStyle', 
                                targetItem?.fontStyle === 'italic' ? 'normal' : 'italic'
                              )}
                            >
                              <FormatItalicIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                     </MuiPaper>
                   )}

                   {/* 데이터형 개체 전용: 데이터 앞단에 고정 출력되는 문자열 세팅 */}
                   {['data', 'date'].includes(targetItem?.type) && (
                     <TextField 
                       label="바코드 접두어(Prefix)" 
                       size="small" 
                       value={targetItem?.prefix || ''} 
                       onChange={(e) => updateItem(selectedIds[0], 'prefix', e.target.value)} 
                     />
                   )}

                   {/* ★ 핵심 추가 로직: 바코드/QR코드일 경우 조합된 최종 데이터(codeDataWithPrefix)를 읽기 전용으로 화면에 표시 */}
                   {['barcode', 'qrcode'].includes(targetItem?.type) ? (
                     <TextField 
                       label="조합된 데이터 (자동 미리보기)"
                       size="small" 
                       multiline 
                       minRows={2}
                       value={codeDataWithPrefix}
                       InputProps={{
                         readOnly: true
                       }}
                       helperText="다른 데이터/날짜 요소들의 조합으로 자동 생성됩니다."
                     />
                   ) : (
                     <TextField 
                       label="Content (내용)"
                       size="small" 
                       multiline 
                       minRows={2}
                       value={targetItem?.content || ''} 
                       onChange={(e) => updateItem(selectedIds[0], 'content', e.target.value)} 
                     />
                   )}
                 </>
               )}
               
               <Button 
                 variant="contained" 
                 color="error" 
                 fullWidth 
                 startIcon={<DeleteIcon />} 
                 onClick={deleteSelectedItems}
               >
                 삭제 (Del)
               </Button>
            </Stack>
          ) : (
            <Stack spacing={2}>
              <TextField 
                label="양식 이름" 
                size="small" 
                value={templateName} 
                onChange={(e) => setTemplateName(e.target.value)} 
              />
              <Stack 
                direction="row" 
                spacing={1}
              >
                <TextField 
                  label="라벨 너비(mm)" 
                  type="number" 
                  size="small" 
                  value={layout.labelW} 
                  onChange={(e) => setLayout({ ...layout, labelW: e.target.value })} 
                />
                <TextField 
                  label="라벨 높이(mm)" 
                  type="number" 
                  size="small" 
                  value={layout.labelH} 
                  onChange={(e) => setLayout({ ...layout, labelH: e.target.value })} 
                />
              </Stack>
              <TextField 
                label="데이터 구분자" 
                size="small" 
                value={layout.delimiter} 
                onChange={(e) => setLayout({ ...layout, delimiter: e.target.value })} 
              />
            </Stack>
          )}
        </Box>
        <Divider />
        
        {/* 4. 우측 하단 레이어 목록 */}
        <Box 
          sx={{ 
            p:               2, 
            height:          350, 
            display:         'flex', 
            flexDirection:   'column', 
            backgroundColor: (theme) => theme.palette.layout.design.layerBg 
          }}
        >
          <Typography 
            variant="subtitle2" 
            gutterBottom 
            fontWeight="bold" 
            color="secondary"
          >
            Layers
          </Typography>
          <Box 
            sx={{ 
              flex:      1, 
              overflowY: 'auto' 
            }}
          >
            <Reorder.Group 
              axis="y" 
              values={items} 
              onReorder={setItems} 
              style={{ 
                listStyle: 'none', 
                padding:   0 
              }}
            >
              {items.map((item) => (
                <Reorder.Item 
                  key={item.id} 
                  value={item}
                >
                  <MuiPaper 
                    elevation={0} 
                    onClick={() => setSelectedIds([item.id])} 
                    sx={{ 
                      p:               1, 
                      mb:              0.5, 
                      display:         'flex', 
                      alignItems:      'center', 
                      gap:             1, 
                      border:          selectedIds.includes(item.id) ? '1.5px solid #1976d2' : '1px solid', 
                      borderColor:     'divider', 
                      cursor:          'pointer', 
                      backgroundColor: selectedIds.includes(item.id) ? 'action.selected' : 'background.paper' 
                    }}
                  >
                    <DragIndicatorIcon 
                      fontSize="small" 
                      sx={{ color: 'text.secondary' }} 
                    />
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        flex:       1, 
                        fontWeight: 'bold' 
                      }}
                    >
                      {item.label}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        updateItem(item.id, 'visible', !item.visible); 
                      }}
                    >
                      <VisibilityIcon 
                        fontSize="inherit" 
                        color={item.visible ? 'action' : 'disabled'} 
                      />
                    </IconButton>
                  </MuiPaper>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </Box>
        </Box>
      </Box>

      {/* 디자인 서버 로드 모달 다이얼로그 */}
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
                <ListItemButton 
                  onClick={() => { 
                    setTemplateId(t.TemplateId); 
                    setTemplateName(t.TemplateName); 
                    const raw = JSON.parse(t.DesignJson); 
                    setLayout({ ...layout, labelW: t.LabelW, labelH: t.LabelH, ...(raw[0].layout || {}) }); 
                    setItems(raw.slice(1)); 
                    setOpenDbDialog(false); 
                  }}
                >
                  <ListItemText 
                    primary={t.TemplateName} 
                    secondary={`${t.LabelW}x${t.LabelH}mm`} 
                  />
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