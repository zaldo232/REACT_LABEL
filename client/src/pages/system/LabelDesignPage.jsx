/**
 * @file        LabelDesignPage.jsx
 * @description 전문 디자인 툴 방식의 라벨 편집기 페이지
 * - [UX개선] 선택 도구 단축키 표준화: Ctrl(Cmd) 키로 개별 다중 선택, Shift 키로 시작~끝 범위 일괄 선택 기능 탑재 (캔버스 개체 및 표 내부 셀 모두 적용)
 * - [버그수정] 표(Table) 병합된 셀이 포함된 행/열 삭제 시 셀이 통째로 날아가며 하단에 빈 공간(유령 행)이 붕 뜨던 치명적 버그 완벽 해결
 * - [버그수정] 행/열 삭제 시 남은 셀들이 빈 공간을 100% 꽉 채우지 못하던 현상 완벽 해결 (CSS Grid 'fr' 강제 할당)
 * - [기능추가] 상단 및 좌측에 정밀 렌더링 기반의 눈금자(Ruler) 탑재 완료 (1mm 단위)
 * - [기능추가] 마우스 포인터를 따라다니는 눈금자 십자 가이드라인(Tracking Line) 추가
 * - [버그수정] 개체를 제자리에서 클릭 시 History가 중복으로 쌓이던 현상 완벽 해결 (JSON 딥 체크 알고리즘)
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
import TableChartIcon from '@mui/icons-material/TableChart';
import GridOnIcon from '@mui/icons-material/GridOn';
import CallMergeIcon from '@mui/icons-material/CallMerge';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import AddRowIcon from '@mui/icons-material/TableRows';
import AddColIcon from '@mui/icons-material/ViewColumn';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';

import Barcode from 'react-barcode';
import QRCode from 'react-qr-code';
import Draggable from 'react-draggable';
import apiClient from '../../utils/apiClient';
import { 
  showAlert, 
  showConfirm 
} from '../../utils/swal';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

const MM_PX_UNIT = 3.78; 

// =========================================================================
// 공통 유틸리티 헬퍼 함수
// =========================================================================

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

const LabelDesignPage = () => {
  // =========================================================================
  // 상태 관리 (State Management)
  // =========================================================================
  const [templateId, setTemplateId] = useState(null);                
  const [templateName, setTemplateName] = useState(''); 
  const [items, setItems] = useState([]);            
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedCells, setSelectedCells] = useState([]); 

  const [layout, setLayout] = useState({
    labelW:       '100',     
    labelH:       '50',     
    cols:         '',       
    rows:         '',       
    marginTop:    '',  
    marginLeft:   '', 
    gap:          '',        
    delimiter:    '',
    excelMapping: {} 
  });

  const [zoom, setZoom] = useState(1.5); 
  const [showGrid, setShowGrid] = useState(true);     
  const [snapToGrid, setSnapToGrid] = useState(true); 
  
  const [gridSize, setGridSize] = useState('2');
  const safeGridSize = parseFloat(gridSize) > 0 ? parseFloat(gridSize) : 2;
  
  const [activeTool, setActiveTool] = useState('select'); 
  const [isDrawing, setIsDrawing] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  
  const [tableResizeData, setTableResizeData] = useState(null);

  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [tempRect, setTempRect] = useState(null);

  const [openDbDialog, setOpenDbDialog] = useState(false);          
  const [dbList, setDbList] = useState([]);                         

  const [masterInputText, setMasterInputText] = useState('');
  const [isMasterFocused, setIsMasterFocused] = useState(false);

  const [expandedTableIds, setExpandedTableIds] = useState([]);

  // =========================================================================
  // 히스토리(Undo/Redo) 코어 시스템 (Manual Snapshot Architecture)
  // =========================================================================
  const historyRef = useRef([]); 
  const historyPointer = useRef(-1);
  const [historyUIState, setHistoryUIState] = useState({ step: 0, length: 0 });

  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  const selectedIdsRef = useRef(selectedIds);
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);

  const initItems = useCallback((newItems) => {
    setItems(newItems);
    historyRef.current = [newItems];
    historyPointer.current = 0;
    setHistoryUIState({ step: 0, length: 1 });
  }, []);

  useEffect(() => {
    if (historyRef.current.length === 0) {
      historyRef.current = [[]]; 
      historyPointer.current = 0;
      setHistoryUIState({ step: 0, length: 1 });
    }
  }, []);

  const takeSnapshot = useCallback(() => {
    setItems((prev) => {
      const hist = historyRef.current;
      const ptr = historyPointer.current;
      const last = hist[ptr];
      
      if (JSON.stringify(last) !== JSON.stringify(prev)) {
        const newHist = hist.slice(0, ptr + 1);
        newHist.push(prev);
        if (newHist.length > 50) newHist.shift(); 
        historyRef.current = newHist;
        historyPointer.current = newHist.length - 1;
        setHistoryUIState({ step: historyPointer.current, length: newHist.length });
      }
      return prev;
    });
  }, []);

  const updateItems = useCallback((action, saveSnapshot = true) => {
    setItems((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      
      if (saveSnapshot) {
        const hist = historyRef.current;
        const ptr = historyPointer.current;
        const last = hist[ptr];
        
        if (JSON.stringify(last) !== JSON.stringify(next)) {
          const newHist = hist.slice(0, ptr + 1);
          newHist.push(next);
          if (newHist.length > 50) newHist.shift();
          historyRef.current = newHist;
          historyPointer.current = newHist.length - 1;
          setHistoryUIState({ step: historyPointer.current, length: newHist.length });
        }
      }
      return next;
    });
  }, []);

  const handleUndo = useCallback(() => {
    if (historyPointer.current > 0) {
      historyPointer.current -= 1;
      setItems(historyRef.current[historyPointer.current]);
      setSelectedIds([]);
      setSelectedCells([]);
      setHistoryUIState({ step: historyPointer.current, length: historyRef.current.length });
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (historyPointer.current < historyRef.current.length - 1) {
      historyPointer.current += 1;
      setItems(historyRef.current[historyPointer.current]);
      setSelectedIds([]);
      setSelectedCells([]);
      setHistoryUIState({ step: historyPointer.current, length: historyRef.current.length });
    }
  }, []);

  // =========================================================================
  // Ref 및 개체 매핑
  // =========================================================================
  const canvasRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const nodeRefs = useRef({}); 
  const fileInputRef = useRef(null); 
  const imageInputRef = useRef(null);
  const excelLayoutInputRef = useRef(null); 
  
  // 눈금자(Ruler) 관련 Ref
  const hRulerRef = useRef(null);
  const vRulerRef = useRef(null);
  const hGuideRef = useRef(null);
  const vGuideRef = useRef(null);

  // ★ 범위 선택(Shift)을 위한 앵커 포인트 Ref 추가
  const lastSelectedIdRef = useRef(null);
  const lastSelectedCellRef = useRef(null);

  const dragInfoRef = useRef({ 
    startX:           0, 
    startY:           0, 
    isDragging:       false,
    initialItems:     [],
    hasAlertedBounds: false 
  });

  const targetItem = selectedIds.length === 1 
    ? items.find(i => i.id === selectedIds[0]) 
    : null;

  const activeCell = targetItem?.type === 'table' && selectedCells.length === 1
    ? targetItem.cells.find(c => c.row === selectedCells[0].row && c.col === selectedCells[0].col)
    : null;

  const isMasterInputVisible = selectedIds.length === 1 && (
    ['barcode', 'qrcode'].includes(targetItem?.type) ||
    (activeCell && ['barcode', 'qrcode'].includes(activeCell.cellType)) ||
    targetItem?.type === 'table' 
  );

  // =========================================================================
  // 눈금자(Ruler) 렌더링 로직
  // =========================================================================
  const drawRulers = useCallback(() => {
    if (!hRulerRef.current || !vRulerRef.current || !canvasRef.current || !scrollContainerRef.current) return;

    const hCtx = hRulerRef.current.getContext('2d');
    const vCtx = vRulerRef.current.getContext('2d');
    
    const scrollContainer = scrollContainerRef.current;
    const canvasEl = canvasRef.current; 
    
    const scrollRect = scrollContainer.getBoundingClientRect();
    const canvasRect = canvasEl.getBoundingClientRect();

    const offsetX = canvasRect.left - scrollRect.left;
    const offsetY = canvasRect.top - scrollRect.top;

    const hWidth = scrollRect.width;
    const hHeight = 20;
    const vWidth = 20;
    const vHeight = scrollRect.height;

    const dpr = window.devicePixelRatio || 1;
    
    hRulerRef.current.width = hWidth * dpr;
    hRulerRef.current.height = hHeight * dpr;
    hCtx.scale(dpr, dpr);

    vRulerRef.current.width = vWidth * dpr;
    vRulerRef.current.height = vHeight * dpr;
    vCtx.scale(dpr, dpr);

    hCtx.clearRect(0, 0, hWidth, hHeight);
    vCtx.clearRect(0, 0, vWidth, vHeight);

    hCtx.beginPath();
    vCtx.beginPath();
    
    hCtx.strokeStyle = '#999999';
    vCtx.strokeStyle = '#999999';
    hCtx.fillStyle = '#666666';
    vCtx.fillStyle = '#666666';
    hCtx.font = '9px "Segoe UI", Arial, sans-serif';
    vCtx.font = '9px "Segoe UI", Arial, sans-serif';
    hCtx.textAlign = 'center';
    hCtx.textBaseline = 'top';

    vCtx.textAlign = 'right';
    vCtx.textBaseline = 'middle';

    const mmPx = MM_PX_UNIT * zoom;
    
    const startMmx = Math.floor(-offsetX / mmPx);
    const endMmx = startMmx + Math.ceil(hWidth / mmPx);

    for (let i = startMmx - 5; i <= endMmx + 5; i++) {
       const x = offsetX + (i * mmPx);
       if (x < -10 || x > hWidth + 10) continue;

       if (i % 10 === 0) {
         hCtx.moveTo(x, 0); 
         hCtx.lineTo(x, 20);
         if (i >= 0) hCtx.fillText((i / 10).toString(), x + 2, 2);
       } else if (i % 5 === 0) {
         hCtx.moveTo(x, 10); 
         hCtx.lineTo(x, 20);
       } else {
         hCtx.moveTo(x, 15); 
         hCtx.lineTo(x, 20);
       }
    }

    const startMmy = Math.floor(-offsetY / mmPx);
    const endMmy = startMmy + Math.ceil(vHeight / mmPx);

    for (let i = startMmy - 5; i <= endMmy + 5; i++) {
       const y = offsetY + (i * mmPx);
       if (y < -10 || y > vHeight + 10) continue;

       if (i % 10 === 0) {
         vCtx.moveTo(0, y); 
         vCtx.lineTo(20, y);
         if (i >= 0) {
           vCtx.save();
           vCtx.translate(14, y + 2);
           vCtx.rotate(-Math.PI / 2);
           vCtx.fillText((i / 10).toString(), 0, 0);
           vCtx.restore();
         }
       } else if (i % 5 === 0) {
         vCtx.moveTo(10, y); 
         vCtx.lineTo(20, y);
       } else {
         vCtx.moveTo(15, y); 
         vCtx.lineTo(20, y);
       }
    }

    hCtx.stroke();
    vCtx.stroke();
  }, [zoom, layout.labelW, layout.labelH]);

  useEffect(() => {
    const timer = setTimeout(() => drawRulers(), 50);
    window.addEventListener('resize', drawRulers);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', drawRulers);
    };
  }, [drawRulers, layout.labelW, layout.labelH]);

  // =========================================================================
  // 유틸리티 및 계산 로직 (Utility & Calculation)
  // =========================================================================
  const handleToolChange = (tool) => {
    setActiveTool(tool);
    if (tool !== 'select') {
      setSelectedIds([]); 
      setSelectedCells([]); 
    }
  };

  const toggleTableExpand = (e, id) => {
    e.stopPropagation();
    setExpandedTableIds(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const getMmPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const pxX = (e.clientX - rect.left) / zoom;
    const pxY = (e.clientY - rect.top) / zoom;
    return { 
      x: pxX / MM_PX_UNIT, 
      y: pxY / MM_PX_UNIT 
    };
  };

  const getEffectiveSnap = () => showGrid && snapToGrid && parseFloat(gridSize) > 0;

  const applySnap = (val, forceSnap) => {
    if (!getEffectiveSnap() || !forceSnap) {
      return parseFloat(Number(val).toFixed(1));
    }
    return Math.round(val / safeGridSize) * safeGridSize;
  };

  const getRealBBox = (item) => {
    if (['text', 'data', 'date'].includes(item.type)) {
      const el = nodeRefs.current[item.id]?.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const realW = rect.width / zoom / MM_PX_UNIT;
        const realH = rect.height / zoom / MM_PX_UNIT;
        return { x: parseFloat(item.x)||0, y: parseFloat(item.y)||0, w: realW, h: realH };
      }
    }
    return { x: parseFloat(item.x)||0, y: parseFloat(item.y)||0, w: parseFloat(item.width)||0, h: parseFloat(item.height)||0 };
  };

  const alignSelectedItems = (type) => {
    if (selectedIds.length < 2) return;
    
    const selectedItems = items.filter((i) => selectedIds.includes(i.id));
    const bboxes = selectedItems.map(item => ({ item, bbox: getRealBBox(item) }));
    
    const minX = Math.min(...bboxes.map(b => b.bbox.x));
    const maxX = Math.max(...bboxes.map(b => b.bbox.x + b.bbox.w));
    const minY = Math.min(...bboxes.map(b => b.bbox.y));
    const maxY = Math.max(...bboxes.map(b => b.bbox.y + b.bbox.h));
    
    const boxCenterX = (minX + maxX) / 2;
    const boxCenterY = (minY + maxY) / 2;

    if (type === 'h-distribute' || type === 'v-distribute') {
      if (selectedItems.length < 3) return; 
      
      const isH = type === 'h-distribute';
      const sorted = [...bboxes].sort((a, b) => isH ? a.bbox.x - b.bbox.x : a.bbox.y - b.bbox.y);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalSize = sorted.reduce((acc, curr) => acc + (isH ? curr.bbox.w : curr.bbox.h), 0);
      const availableSpace = (isH ? (last.bbox.x + last.bbox.w) - first.bbox.x : (last.bbox.y + last.bbox.h) - first.bbox.y) - totalSize;
      const gap = availableSpace / (sorted.length - 1);
      
      const targetPos = {};
      let currentPos = isH ? first.bbox.x : first.bbox.y;
      
      sorted.forEach((b, idx) => {
        if (idx === 0) {
          targetPos[b.item.id] = isH ? b.item.x : b.item.y;
          currentPos += (isH ? b.bbox.w : b.bbox.h) + gap;
        } else if (idx === sorted.length - 1) {
          targetPos[b.item.id] = isH ? b.item.x : b.item.y;
        } else {
          targetPos[b.item.id] = currentPos;
          currentPos += (isH ? b.bbox.w : b.bbox.h) + gap;
        }
      });

      updateItems((prev) => prev.map((item) => 
        targetPos[item.id] !== undefined 
          ? { ...item, [isH ? 'x' : 'y']: targetPos[item.id] } 
          : item
      ), true);
      return;
    }

    updateItems((prev) => prev.map((item) => {
      if (!selectedIds.includes(item.id)) return item;
      
      const { bbox } = bboxes.find(b => b.item.id === item.id);
      let newX = parseFloat(item.x) || 0; 
      let newY = parseFloat(item.y) || 0;
      
      switch (type) {
        case 'left':     newX = minX; break;
        case 'right':    newX = maxX - bbox.w; break;
        case 'top':      newY = minY; break;
        case 'bottom':   newY = maxY - bbox.h; break;
        case 'h-center': newX = boxCenterX - (bbox.w / 2); break;
        case 'v-center': newY = boxCenterY - (bbox.h / 2); break;
        default: break;
      }
      
      return { ...item, x: newX, y: newY };
    }), true);
  };

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

  const handleLayerOrder = (action) => {
    if (selectedIds.length !== 1) return;
    const targetId = selectedIds[0];

    updateItems(prev => {
      const index = prev.findIndex(item => item.id === targetId);
      if (index === -1) return prev;

      if ((action === 'front' || action === 'forward') && index === 0) return prev;
      if ((action === 'back' || action === 'backward') && index === prev.length - 1) return prev;

      const newItems = [...prev];
      const [item] = newItems.splice(index, 1);

      if (action === 'front') {
        newItems.unshift(item);              
      } else if (action === 'back') {
        newItems.push(item);                 
      } else if (action === 'forward') {
        newItems.splice(index - 1, 0, item); 
      } else if (action === 'backward') {
        newItems.splice(index + 1, 0, item); 
      }

      return newItems;
    }, true);
  };

  // =========================================================================
  // 바코드 양방향 동기화 및 데이터 처리 (Data & Barcode Sync)
  // =========================================================================
  
  const editableMasterData = useMemo(() => {
    const combinedParts = [];
    let hasAnyContent = false;
    
    items.forEach((i) => {
      if (i.type === 'data') {
        let val = i.content || '';
        if (val !== '') hasAnyContent = true;
        combinedParts.push(val); 
      } else if (i.type === 'table' && i.cells) {
        const hiddenCells = getHiddenCells(i); 
        i.cells.forEach(cell => {
          if (hiddenCells.has(`${cell.row}_${cell.col}`)) return;
          if (cell.cellType === 'data') {
            let val = cell.dataId || '';
            if (val !== '') hasAnyContent = true;
            combinedParts.push(val);
          }
        });
      }
    });
    
    if (!hasAnyContent) return '';

    let lastNonEmpty = -1;
    for (let idx = combinedParts.length - 1; idx >= 0; idx--) {
      if (combinedParts[idx] !== '') {
        lastNonEmpty = idx;
        break;
      }
    }
    
    const activeParts = combinedParts.slice(0, lastNonEmpty + 1);
    return activeParts.join(layout.delimiter || '');
  }, [items, layout.delimiter]);

  const codeDataWithPrefix = useMemo(() => {
    const combinedParts = [];
    
    items.forEach((i) => {
      if (i.type === 'data' || i.type === 'date') {
        let val = i.type === 'date' 
          ? getKstPreviewDate(i.content || 'YYYY-MM-DD') 
          : (i.content || ''); 
          
        if (i.type === 'date') {
          val = val.replace(/[-_:\s]/g, ''); 
        }
        
        if (val !== '') {
          combinedParts.push(`${i.prefix || ''}${val}${i.suffix || ''}`);
        }
      } else if (i.type === 'table' && i.cells) {
        const hiddenCells = getHiddenCells(i); 
        i.cells.forEach(cell => {
          if (hiddenCells.has(`${cell.row}_${cell.col}`)) return;
          if (cell.cellType === 'data' || cell.cellType === 'date') {
            let val = cell.cellType === 'date' 
              ? getKstPreviewDate(cell.content || 'YYYY-MM-DD') 
              : (cell.dataId || ''); 
              
            if (cell.cellType === 'date') {
              val = val.replace(/[-_:\s]/g, '');
            }
            
            if (val !== '') {
              combinedParts.push(`${cell.prefix || ''}${val}${cell.suffix || ''}`);
            }
          }
        });
      }
    });
    
    return combinedParts.join(layout.delimiter || '');
  }, [items, layout.delimiter]);

  useEffect(() => {
    if (!isMasterFocused) {
      setMasterInputText(editableMasterData);
    }
  }, [editableMasterData, isMasterFocused]);

  const handleCombinedDataChange = (e) => {
    const newValue = e.target.value;
    setMasterInputText(newValue); 
    
    const delimiter = layout.delimiter || '';
    
    let totalFields = 0;
    items.forEach(i => {
      if (i.type === 'data') totalFields++;
      else if (i.type === 'table' && i.cells) {
        const hiddenCells = getHiddenCells(i); 
        i.cells.forEach(c => {
          if (!hiddenCells.has(`${c.row}_${c.col}`) && c.cellType === 'data') totalFields++;
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

    updateItems((prevItems) => {
      let partIdx = 0;

      return prevItems.map((item) => {
        const newItem = { ...item };
        
        if (newItem.type === 'data') {
          let partVal = parts[partIdx] !== undefined ? parts[partIdx] : '';
          newItem.content = partVal; 
          partIdx++;
        } 
        else if (newItem.type === 'table' && newItem.cells) {
          const hiddenCells = getHiddenCells(newItem); 
          newItem.cells = newItem.cells.map(cell => {
            if (!hiddenCells.has(`${cell.row}_${cell.col}`) && cell.cellType === 'data') {
              let partVal = parts[partIdx] !== undefined ? parts[partIdx] : '';
              partIdx++;
              return { ...cell, dataId: partVal };
            } 
            return cell; 
          });
        }
        return newItem;
      });
    }, false); 
  };

  // =========================================================================
  // 이벤트 핸들러 (Mouse, Drag, Keyboard, Table Resize)
  // =========================================================================

  const handleTableResizeStart = (e, item, type, index) => {
    e.stopPropagation();
    e.preventDefault();
    setTableResizeData({
      itemId:      item.id,
      type:        type,
      index:       index,
      startX:      e.clientX,
      startY:      e.clientY,
      startRatios: type === 'col' 
        ? [...(item.colRatios || Array(item.cols).fill(100/item.cols))] 
        : [...(item.rowRatios || Array(item.rows).fill(100/item.rows))],
      totalW:      parseFloat(item.width),
      totalH:      parseFloat(item.height)
    });
  };

  const handleDragStart = (e, data) => {
    dragInfoRef.current = { 
      startX:           data.x, 
      startY:           data.y, 
      isDragging:       false,
      initialItems:     items.filter(i => selectedIds.includes(i.id)),
      hasAlertedBounds: false
    };
  };

  const handleGroupDrag = (e, data) => {
    if (tableResizeData) return; 
    
    if (Math.abs(data.x - dragInfoRef.current.startX) > 2 || Math.abs(data.y - dragInfoRef.current.startY) > 2) {
      dragInfoRef.current.isDragging = true;
    }
    
    const dx = (data.x - dragInfoRef.current.startX) / MM_PX_UNIT;
    const dy = (data.y - dragInfoRef.current.startY) / MM_PX_UNIT;
    const maxW = parseFloat(layout.labelW) || 100;
    const maxH = parseFloat(layout.labelH) || 50;
    let wentOut = false;

    updateItems((prev) => prev.map((item) => {
      if (selectedIds.includes(item.id)) {
        const initialItem = dragInfoRef.current.initialItems.find(i => i.id === item.id);
        if (initialItem) {
          let nextX = (parseFloat(initialItem.x) || 0) + dx;
          let nextY = (parseFloat(initialItem.y) || 0) + dy;
          const bbox = getRealBBox(item); 
          
          if (nextX < 0) { nextX = 0; wentOut = true; }
          if (nextY < 0) { nextY = 0; wentOut = true; }
          if (nextX + bbox.w > maxW) { nextX = maxW - bbox.w; wentOut = true; }
          if (nextY + bbox.h > maxH) { nextY = maxH - bbox.h; wentOut = true; }
          
          return { ...item, x: nextX, y: nextY };
        }
      }
      return item;
    }), false);
    
    if (wentOut) {
      dragInfoRef.current.hasAlertedBounds = true;
    }
  };

  const handleDragStop = () => {
    if (tableResizeData) return;

    setTimeout(() => { 
      dragInfoRef.current.isDragging = false; 
    }, 100);
    
    if (dragInfoRef.current.hasAlertedBounds) {
      showAlert("경고", "warning", "개체가 캔버스 영역을 벗어날 수 없습니다.");
      dragInfoRef.current.hasAlertedBounds = false; 
    }
    
    updateItems((prev) => prev.map((item) => {
      if (selectedIds.includes(item.id)) {
        let finalX = applySnap(parseFloat(item.x) || 0, item.useSnap);
        let finalY = applySnap(parseFloat(item.y) || 0, item.useSnap);
        
        const bbox = getRealBBox(item);
        const maxW = parseFloat(layout.labelW) || 100;
        const maxH = parseFloat(layout.labelH) || 50;
        
        if (finalX < 0) finalX = 0;
        if (finalY < 0) finalY = 0;
        if (finalX + bbox.w > maxW) finalX = maxW - bbox.w;
        if (finalY + bbox.h > maxH) finalY = maxH - bbox.h;
        
        return { ...item, x: finalX, y: finalY };
      }
      return item;
    }), true);
  };

  // ★ 변경점: Ctrl(Cmd) 키로 개별 다중 선택, Shift 키로 범위(Range) 선택 로직 적용
  const handleItemClick = (e, id, fromLayer = false) => {
    e.stopPropagation();
    if (!fromLayer && dragInfoRef.current.isDragging) return;
    if (!fromLayer && activeTool !== 'select') return;

    const isCtrl = e.ctrlKey || e.metaKey;

    if (isCtrl) {
      // Ctrl 클릭: 토글(Toggle) 다중 선택
      setSelectedIds((prev) => prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]);
      lastSelectedIdRef.current = id;
    } else if (e.shiftKey && lastSelectedIdRef.current) {
      // Shift 클릭: 앵커 지점부터 현재까지 연속된 범위 모두 선택
      const visibleItems = items; // 화면 표시 여부에 무관하게 Layer 순서 기준
      const idx1 = visibleItems.findIndex(i => i.id === lastSelectedIdRef.current);
      const idx2 = visibleItems.findIndex(i => i.id === id);
      if (idx1 !== -1 && idx2 !== -1) {
        const start = Math.min(idx1, idx2);
        const end = Math.max(idx1, idx2);
        const rangeIds = visibleItems.slice(start, end + 1).map(i => i.id);
        
        // 기존 선택과 병합(Union)
        setSelectedIds(prev => Array.from(new Set([...prev, ...rangeIds])));
      }
    } else {
      // 일반 클릭: 단일 선택
      setSelectedIds([id]);
      lastSelectedIdRef.current = id;
      if (targetItem?.id !== id) {
        setSelectedCells([]); 
      }
    }
  };

  const updateItem = (id, fieldOrObj, value, saveSnapshot = true) => {
    updateItems((prev) => prev.map((item) => {
      if (item.id === id) {
        if (typeof fieldOrObj === 'object') return { ...item, ...fieldOrObj };
        return { ...item, [fieldOrObj]: value };
      }
      return item;
    }), saveSnapshot);
  };

  const modifyTableStructure = (tableId, action, targetIndex, targetSpan = 1) => {
    updateItems((prev) => prev.map((item) => {
      if (item.id !== tableId || item.type !== 'table') return item;
      
      let { rows, cols, cells, width, height } = item;
      let newCells = [...cells];
      
      let rowRatios = item.rowRatios ? [...item.rowRatios] : Array(rows).fill(100/rows);
      let colRatios = item.colRatios ? [...item.colRatios] : Array(cols).fill(100/cols);

      let newWidth = parseFloat(width);
      let newHeight = parseFloat(height);

      if (action === 'insert-row') {
        const avgRatio = 100 / rows;
        newHeight = newHeight * ((100 + avgRatio) / 100); 

        newCells = newCells.map(c => {
          if (c.row >= targetIndex) return { ...c, row: c.row + 1 };
          if (c.row < targetIndex && c.row + (c.rowSpan || 1) > targetIndex) {
            return { ...c, rowSpan: (c.rowSpan || 1) + 1 };
          }
          return c;
        });
        for(let c = 0; c < cols; c++) {
          newCells.push({ 
            row:                     targetIndex, 
            col:                     c, 
            rowSpan:                 1, 
            colSpan:                 1, 
            cellType:                'text', 
            content:                 'TEXT', 
            dataId:                  '',
            showPrefixSuffixOnLabel: true 
          });
        }
        rowRatios.splice(targetIndex, 0, avgRatio);
        rows += 1;
      } 
      else if (action === 'delete-row') {
        if (rows <= targetSpan) {
          showAlert('안내', 'warning', '모든 행을 삭제할 수 없습니다.');
          return item;
        }

        const deletedRatio = rowRatios.slice(targetIndex, targetIndex + targetSpan).reduce((a, b) => Number(a) + Number(b), 0);
        newHeight = newHeight * ((100 - deletedRatio) / 100);

        let updatedCells = [];
        cells.forEach(c => {
          let rSpan = c.rowSpan || 1;
          let cStart = c.row;
          let cEnd = c.row + rSpan - 1;
          let dStart = targetIndex;
          let dEnd = targetIndex + targetSpan - 1;

          if (cEnd < dStart) {
            updatedCells.push(c);
          } else if (cStart > dEnd) {
            updatedCells.push({ ...c, row: c.row - targetSpan });
          } else {
            let overlapStart = Math.max(cStart, dStart);
            let overlapEnd = Math.min(cEnd, dEnd);
            let overlapCount = overlapEnd - overlapStart + 1;
            
            let newSpan = rSpan - overlapCount;
            if (newSpan > 0) {
              let newRow = cStart < dStart ? cStart : dStart;
              updatedCells.push({ ...c, row: newRow, rowSpan: newSpan });
            }
          }
        });
        newCells = updatedCells;

        rowRatios.splice(targetIndex, targetSpan);
        rows -= targetSpan;
      } 
      else if (action === 'insert-col') {
        const avgRatio = 100 / cols;
        newWidth = newWidth * ((100 + avgRatio) / 100); 

        newCells = newCells.map(c => {
          if (c.col >= targetIndex) return { ...c, col: c.col + 1 };
          if (c.col < targetIndex && c.col + (c.colSpan || 1) > targetIndex) {
            return { ...c, colSpan: (c.colSpan || 1) + 1 };
          }
          return c;
        });
        for(let r = 0; r < rows; r++) {
          newCells.push({ 
            row:                     r, 
            col:                     targetIndex, 
            rowSpan:                 1, 
            colSpan:                 1, 
            cellType:                'text', 
            content:                 'TEXT', 
            dataId:                  '',
            showPrefixSuffixOnLabel: true 
          });
        }
        colRatios.splice(targetIndex, 0, avgRatio);
        cols += 1;
      } 
      else if (action === 'delete-col') {
        if (cols <= targetSpan) {
          showAlert('안내', 'warning', '모든 열을 삭제할 수 없습니다.');
          return item;
        }

        const deletedRatio = colRatios.slice(targetIndex, targetIndex + targetSpan).reduce((a, b) => Number(a) + Number(b), 0);
        newWidth = newWidth * ((100 - deletedRatio) / 100);

        let updatedCells = [];
        cells.forEach(c => {
          let cSpan = c.colSpan || 1;
          let cStart = c.col;
          let cEnd = c.col + cSpan - 1;
          let dStart = targetIndex;
          let dEnd = targetIndex + targetSpan - 1;

          if (cEnd < dStart) {
            updatedCells.push(c);
          } else if (cStart > dEnd) {
            updatedCells.push({ ...c, col: c.col - targetSpan });
          } else {
            let overlapStart = Math.max(cStart, dStart);
            let overlapEnd = Math.min(cEnd, dEnd);
            let overlapCount = overlapEnd - overlapStart + 1;
            
            let newSpan = cSpan - overlapCount;
            if (newSpan > 0) {
              let newCol = cStart < dStart ? cStart : dStart;
              updatedCells.push({ ...c, col: newCol, colSpan: newSpan });
            }
          }
        });
        newCells = updatedCells;

        colRatios.splice(targetIndex, targetSpan);
        cols -= targetSpan;
      }

      const sumRow = rowRatios.reduce((a, b) => Number(a) + Number(b), 0) || 100;
      rowRatios = rowRatios.map(r => (Number(r) / sumRow) * 100);

      const sumCol = colRatios.reduce((a, b) => Number(a) + Number(b), 0) || 100;
      colRatios = colRatios.map(c => (Number(c) / sumCol) * 100);

      return { 
        ...item, 
        width: Math.max(1, newWidth), 
        height: Math.max(1, newHeight), 
        rows, 
        cols, 
        cells: newCells,
        rowRatios,
        colRatios
      };
    }), true);

    if (action.startsWith('delete')) {
      setSelectedCells([]); 
    }
  };

  const updateTableCell = (id, row, col, updates, saveSnapshot = true) => {
    updateItems(prev => prev.map(item => {
      if (item.id === id && item.type === 'table') {
        const newCells = item.cells.map(cell => {
          if (cell.row === row && cell.col === col) {
            let safeUpdates = { ...updates };
            if (safeUpdates.rowSpan !== undefined) {
              safeUpdates.rowSpan = Math.min(Math.max(1, safeUpdates.rowSpan), item.rows - cell.row);
            }
            if (safeUpdates.colSpan !== undefined) {
              safeUpdates.colSpan = Math.min(Math.max(1, safeUpdates.colSpan), item.cols - cell.col);
            }
            if (safeUpdates.cellType === 'date' && cell.cellType !== 'date') {
              safeUpdates.content = 'YYYY-MM-DD';
            }
            return { ...cell, ...safeUpdates };
          }
          return cell;
        });
        return { ...item, cells: newCells };
      }
      return item;
    }), saveSnapshot);
  };

  const handleMergeCells = () => {
    if (!targetItem || targetItem.type !== 'table' || selectedCells.length < 2) return;

    const minRow = Math.min(...selectedCells.map(c => c.row));
    const maxRow = Math.max(...selectedCells.map(c => c.row));
    const minCol = Math.min(...selectedCells.map(c => c.col));
    const maxCol = Math.max(...selectedCells.map(c => c.col));

    const rowSpan = maxRow - minRow + 1;
    const colSpan = maxCol - minCol + 1;

    updateItems((prev) => prev.map((item) => {
      if (item.id === targetItem.id) {
        const mergedCells = item.cells.map(cell => {
          if (cell.row === minRow && cell.col === minCol) {
            return { ...cell, rowSpan: rowSpan, colSpan: colSpan };
          }
          if (cell.row >= minRow && cell.row <= maxRow && cell.col >= minCol && cell.col <= maxCol) {
            return { ...cell, rowSpan: 1, colSpan: 1 };
          }
          return cell;
        });
        return { ...item, cells: mergedCells };
      }
      return item;
    }), true);

    setSelectedCells([{ itemId: targetItem.id, row: minRow, col: minCol }]);
    showAlert("병합 완료", "success", "선택된 영역이 성공적으로 병합되었습니다.");
  };

  const handleUnmergeCells = () => {
    if (!targetItem || targetItem.type !== 'table' || selectedCells.length !== 1) return;

    const targetCell = targetItem.cells.find(c => c.row === selectedCells[0].row && c.col === selectedCells[0].col);
    if (!targetCell || ((targetCell.rowSpan || 1) <= 1 && (targetCell.colSpan || 1) <= 1)) return;

    updateItems((prev) => prev.map((item) => {
      if (item.id === targetItem.id) {
        const unmergedCells = item.cells.map(cell => {
          if (cell.row === targetCell.row && cell.col === targetCell.col) {
            return { ...cell, rowSpan: 1, colSpan: 1 };
          }
          return cell;
        });
        return { ...item, cells: unmergedCells };
      }
      return item;
    }), true);
    
    showAlert("병합 해제", "success", "병합이 정상적으로 해제되었습니다.");
  };

  const deleteSelectedItems = useCallback(() => {
    const sIds = selectedIdsRef.current;
    if (sIds.length > 0) {
      updateItems((prev) => prev.filter((i) => !sIds.includes(i.id)), true);
      setSelectedIds([]);
      setSelectedCells([]);
    }
  }, [updateItems]);

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      const maxW = parseFloat(layout.labelW) || 100;
      const maxH = parseFloat(layout.labelH) || 50;
      
      const currentItems = itemsRef.current;
      const currentSelectedIds = selectedIdsRef.current;

      if (hGuideRef.current && vGuideRef.current && scrollContainerRef.current) {
        const scrollRect = scrollContainerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - scrollRect.left;
        const mouseY = e.clientY - scrollRect.top;

        if (mouseX >= 0 && mouseX <= scrollRect.width && mouseY >= 0 && mouseY <= scrollRect.height) {
          hGuideRef.current.style.transform = `translateX(${mouseX}px)`;
          vGuideRef.current.style.transform = `translateY(${mouseY}px)`;
          hGuideRef.current.style.display = 'block';
          vGuideRef.current.style.display = 'block';
        } else {
          hGuideRef.current.style.display = 'none';
          vGuideRef.current.style.display = 'none';
        }
      }

      if (tableResizeData) {
        const { itemId, type, index, startX, startY, startRatios, totalW, totalH } = tableResizeData;
        const newRatios = [...startRatios];
        
        if (type === 'col') {
          const dx = (e.clientX - startX) / zoom / MM_PX_UNIT; 
          const deltaPct = (dx / totalW) * 100;
          let newLeft = startRatios[index] + deltaPct;
          let newRight = startRatios[index + 1] - deltaPct;
          
          if (newLeft < 2) {
            newRight -= (2 - newLeft);
            newLeft = 2;
          }
          if (newRight < 2) {
            newLeft -= (2 - newRight);
            newRight = 2;
          }
          newRatios[index] = newLeft;
          newRatios[index + 1] = newRight;
          
          updateItems(prev => prev.map(item => item.id === itemId ? { ...item, colRatios: newRatios } : item), false);
        } else {
          const dy = (e.clientY - startY) / zoom / MM_PX_UNIT; 
          const deltaPct = (dy / totalH) * 100;
          let newTop = startRatios[index] + deltaPct;
          let newBottom = startRatios[index + 1] - deltaPct;
          
          if (newTop < 2) {
            newBottom -= (2 - newTop);
            newTop = 2;
          }
          if (newBottom < 2) {
            newTop -= (2 - newBottom);
            newBottom = 2;
          }
          newRatios[index] = newTop;
          newRatios[index + 1] = newBottom;
          
          updateItems(prev => prev.map(item => item.id === itemId ? { ...item, rowRatios: newRatios } : item), false);
        }
        return; 
      }

      if (isResizing && currentSelectedIds.length === 1) {
        const item = currentItems.find((i) => i.id === currentSelectedIds[0]);
        if (!item) return;
        
        const currentPos = getMmPos(e);
        let newW = applySnap(currentPos.x - (parseFloat(item.x)||0), item.useSnap);
        let newH = applySnap(currentPos.y - (parseFloat(item.y)||0), item.useSnap);

        if ((parseFloat(item.x)||0) + newW > maxW) newW = maxW - (parseFloat(item.x)||0);
        if ((parseFloat(item.y)||0) + newH > maxH) newH = maxH - (parseFloat(item.y)||0);

        if (item.type === 'line') {
           updateItems(prev => prev.map(i => i.id === item.id ? { ...i, width: Math.max(0.1, newW), height: Math.max(0.1, newH) } : i), false);
        } else if (item.type === 'qrcode') {
           const availX = maxW - (parseFloat(item.x)||0); 
           const availY = maxH - (parseFloat(item.y)||0);
           let size = Math.max(0.1, Math.max(newW, newH));
           size = Math.min(size, availX, availY);
           updateItems(prev => prev.map(i => i.id === item.id ? { ...i, width: size, height: size } : i), false);
        } else {
           updateItems(prev => prev.map(i => i.id === item.id ? { ...i, width: Math.max(0.1, newW), height: Math.max(0.1, newH) } : i), false);
        }
      }
      
      if (isDrawing) {
        const currentPos = getMmPos(e);
        const clampedX = Math.max(0, Math.min(currentPos.x, maxW));
        const clampedY = Math.max(0, Math.min(currentPos.y, maxH));
        
        let rawW = clampedX - drawStart.x;
        let rawH = clampedY - drawStart.y;
        let w = Math.abs(rawW); 
        let h = Math.abs(rawH);

        if (activeTool === 'qrcode') {
           let size = Math.max(w, h);
           const availX = rawW < 0 ? drawStart.x : maxW - drawStart.x;
           const availY = rawH < 0 ? drawStart.y : maxH - drawStart.y;
           size = Math.min(size, availX, availY);
           
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
      if (hGuideRef.current) hGuideRef.current.style.display = 'none';
      if (vGuideRef.current) vGuideRef.current.style.display = 'none';

      if (isResizing || tableResizeData) {
        takeSnapshot();
      }
      setIsResizing(false); 
      setIsPanning(false);
      setTableResizeData(null); 
    };

    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      
      const isMac = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelectedItems();
      } 
      else if (cmdKey && (e.key === 'z' || e.key === 'Z')) {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        e.preventDefault();
      } else if (cmdKey && (e.key === 'y' || e.key === 'Y')) {
        handleRedo();
        e.preventDefault();
      }
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
    isResizing, isDrawing, isPanning, 
    zoom, showGrid, snapToGrid, gridSize, 
    drawStart, panStart, deleteSelectedItems, activeTool, layout,
    tableResizeData, updateItems, takeSnapshot, handleUndo, handleRedo
  ]);

  const handleMouseDownCanvas = (e) => {
    if (
      e.target.id === 'design-scroll-container' || 
      e.target.id === 'design-canvas-wrapper' || 
      e.target.id === 'design-canvas-paper'
    ) {
      setSelectedIds([]); 
      setSelectedCells([]); 
    }
    
    if (activeTool === 'pan') {
      setIsPanning(true);
      setPanStart({ 
        x: e.clientX, 
        y: e.clientY 
      });
      return;
    }
    
    if (activeTool === 'select' || isResizing || tableResizeData) return;
    
    const pos = getMmPos(e);
    const maxW = parseFloat(layout.labelW) || 100;
    const maxH = parseFloat(layout.labelH) || 50;
    
    if (pos.x < 0 || pos.y < 0 || pos.x > maxW || pos.y > maxH) return;

    setIsDrawing(true);
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
      if (activeTool === 'table') {
        finalW = applySnap(tempRect.w, true) || 40;
        finalH = applySnap(tempRect.h, true) || 20;
      }

      const newItem = {
        id:                      newId, 
        type:                    activeTool, 
        label:                   `${activeTool}_${itemsRef.current.length + 1}`,
        content:                 activeTool === 'text' ? 'TEXT' : activeTool === 'image' ? '' : activeTool === 'date' ? 'YYYY-MM-DD' : 'DATA',
        x:                       applySnap(tempRect.x, true), 
        y:                       applySnap(tempRect.y, true),
        width:                   finalW, 
        height:                  finalH,
        rotate:                  0,
        fontSize:                10, 
        fontWeight:              'normal', 
        fontStyle:               'normal', 
        barcodeType:             'CODE128', 
        qrErrorLevel:            'M',
        borderWidth:             0.5, 
        transparent:             activeTool === 'line' ? false : true,
        fill:                    '#ffffff',
        stroke:                  '#000000', 
        visible:                 true, 
        useSnap:                 true, 
        showBorder:              true,
        prefix:                  '', 
        suffix:                  '',
        src:                     '',
        displayValue:            true,
        showPrefixSuffixOnLabel: true,
        rows:                    activeTool === 'table' ? 2 : undefined,
        cols:                    activeTool === 'table' ? 2 : undefined,
        rowRatios:               activeTool === 'table' ? [50, 50] : undefined, 
        colRatios:               activeTool === 'table' ? [50, 50] : undefined,
        cells:                   activeTool === 'table' ? [
           { row: 0, col: 0, rowSpan: 1, colSpan: 1, cellType: 'text', content: 'TEXT', dataId: '', prefix: '', suffix: '', showPrefixSuffixOnLabel: true, cellName: '', fontSize: '' },
           { row: 0, col: 1, rowSpan: 1, colSpan: 1, cellType: 'text', content: 'TEXT', dataId: '', prefix: '', suffix: '', showPrefixSuffixOnLabel: true, cellName: '', fontSize: '' },
           { row: 1, col: 0, rowSpan: 1, colSpan: 1, cellType: 'text', content: 'TEXT', dataId: '', prefix: '', suffix: '', showPrefixSuffixOnLabel: true, cellName: '', fontSize: '' },
           { row: 1, col: 1, rowSpan: 1, colSpan: 1, cellType: 'text', content: 'TEXT', dataId: '', prefix: '', suffix: '', showPrefixSuffixOnLabel: true, cellName: '', fontSize: '' }
        ] : undefined
      };
      
      updateItems((prev) => [newItem, ...prev], true);
      setSelectedIds([newId]);
    }
    
    setIsDrawing(false); 
    setTempRect(null); 
    setActiveTool('select');
  };

  const handleWheelZoom = (e) => {
    if (e.ctrlKey) {
      e.preventDefault(); 
      setZoom((prev) => Math.min(Math.max(prev + (e.deltaY > 0 ? -0.1 : 0.1), 0.5), 5.0)); 
    }
  };

  const handleExcelLayoutParse = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        if (matrix.length === 0) return showAlert("오류", "error", "빈 엑셀 파일입니다.");

        let maxR = -1;
        let maxC = -1;
        
        for (let r = 0; r < matrix.length; r++) {
          for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c] !== undefined && matrix[r][c] !== null && String(matrix[r][c]).trim() !== '') {
              if (r > maxR) maxR = r;
              if (c > maxC) maxC = c;
            }
          }
        }

        const merges = worksheet['!merges'] || [];
        merges.forEach(m => {
          if (m.s.r <= maxR && m.s.c <= maxC) {
            if (m.e.r > maxR) maxR = m.e.r;
            if (m.e.c > maxC) maxC = m.e.c;
          }
        });

        if (maxR === -1 || maxC === -1) {
          return showAlert("오류", "error", "텍스트가 있는 유효한 영역이 없습니다.");
        }

        const numRows = maxR + 1;
        const numCols = maxC + 1;
        const skipCells = new Set(); 
        const newCells = [];
        
        for (let r = 0; r < numRows; r++) {
          for (let c = 0; c < numCols; c++) {
            if (skipCells.has(`${r},${c}`)) continue;

            let cellText = matrix[r][c] !== undefined && matrix[r][c] !== null ? String(matrix[r][c]).trim() : '';
            let cellType = 'text';
            let dataId   = '';
            let rowSpan  = 1;
            let colSpan  = 1;

            const mergeInfo = merges.find(m => m.s.r === r && m.s.c === c);
            if (mergeInfo) {
              rowSpan = mergeInfo.e.r - mergeInfo.s.r + 1;
              colSpan = mergeInfo.e.c - mergeInfo.s.c + 1;
              for(let i = r; i <= mergeInfo.e.r; i++) {
                for(let j = c; j <= mergeInfo.e.c; j++) {
                  if (i === r && j === c) continue;
                  skipCells.add(`${i},${j}`);
                }
              }
            }

            let dataMatch = cellText.match(/#([^#]+)#/);
            if (!dataMatch) {
               dataMatch = cellText.match(/\[([^\]]+)\]/);
            }
            
            if (dataMatch) {
              cellType = 'data';
              dataId   = dataMatch[1] === 'DATA' ? '' : dataMatch[1]; 
              cellText = '';         
            } else if (cellText.includes('*BARCODE*')) {
              cellType = 'barcode';
              cellText = '';
            } else if (cellText.includes('*QRCODE*')) {
              cellType = 'qrcode';
              cellText = '';
            }

            newCells.push({
              row:                     r,
              col:                     c,
              rowSpan:                 rowSpan,
              colSpan:                 colSpan,
              cellType:                cellType,
              content:                 cellText,
              dataId:                  dataId,
              prefix:                  '',
              suffix:                  '',
              barcodeType:             'CODE128',
              qrErrorLevel:            'M',
              displayValue:            true,
              showPrefixSuffixOnLabel: true,
              cellName:                '',
              fontSize:                ''
            });
          }
        }

        const maxW = parseFloat(layout.labelW) || 100;
        const maxH = parseFloat(layout.labelH) || 50;
        const margin = 2; 
        const tableW = Math.max(10, maxW - (margin * 2));
        const tableH = Math.max(10, maxH - (margin * 2));

        const newTableItem = {
          id:           `excel-table-${Date.now()}`,
          type:         'table',
          label:        `엑셀 연동 표`,
          x:            margin,
          y:            margin,
          width:        tableW,
          height:       tableH,
          rotate:       0,
          fontSize:     9, 
          fontWeight:   'normal',
          fontStyle:    'normal',
          borderWidth:  0.5,
          transparent:  true,
          fill:         '#ffffff',
          stroke:       '#000000',
          visible:      true,
          useSnap:      true,
          showBorder:   true,
          rows:         numRows,
          cols:         numCols,
          rowRatios:    Array(numRows).fill(100 / numRows), 
          colRatios:    Array(numCols).fill(100 / numCols),
          cells:        newCells
        };

        initItems([newTableItem]); 
        setTemplateName(file.name);
        showAlert("파싱 완료", "success", "엑셀의 데이터 영역만 추출하여 표를 생성했습니다.");

      } catch (error) {
        showAlert("오류", "error", "엑셀 파싱 중 오류가 발생했습니다. (.xlsx 권장)");
      }
    };
    reader.readAsArrayBuffer(file); 
    excelLayoutInputRef.current.value = null; 
  };

  const handleExport = async () => {
    if (!templateName) {
      return showAlert("확인", "warning", "내보낼 양식 이름을 먼저 입력하세요.");
    }
    
    const el = canvasRef.current;
    if (!el) return;

    const previousSelection = selectedIds;
    setSelectedIds([]);
    setSelectedCells([]);
    
    await new Promise(r => setTimeout(r, 100));

    const originalBg = el.style.backgroundImage;
    const originalBoxShadow = el.style.boxShadow;
    el.style.backgroundImage = 'none';
    el.style.boxShadow = 'none';

    let canvas;
    try {
      canvas = await html2canvas(el, { 
        scale:           3, 
        useCORS:         true, 
        backgroundColor: '#ffffff' 
      });
    } catch(err) {
      el.style.backgroundImage = originalBg;
      el.style.boxShadow = originalBoxShadow;
      setSelectedIds(previousSelection);
      return showAlert("오류", "error", "미리보기 이미지 생성 중 문제가 발생했습니다.");
    }

    el.style.backgroundImage = originalBg;
    el.style.boxShadow = originalBoxShadow;
    setSelectedIds(previousSelection);

    const data = { 
      templateName, 
      layout, 
      items 
    };
    const jsonString = JSON.stringify(data, null, 2);

    if (window.showDirectoryPicker) {
      try {
        const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        
        const jsonFileHandle = await dirHandle.getFileHandle(`${templateName}.json`, { create: true });
        const jsonWritable = await jsonFileHandle.createWritable();
        await jsonWritable.write(new Blob([jsonString], { type: 'application/json' }));
        await jsonWritable.close();

        canvas.toBlob(async (blob) => {
          const imgFileHandle = await dirHandle.getFileHandle(`${templateName}.png`, { create: true });
          const imgWritable = await imgFileHandle.createWritable();
          await imgWritable.write(blob);
          await imgWritable.close();
          showAlert("성공", "success", "선택하신 폴더에 JSON 양식과 라벨 미리보기(PNG) 이미지가 함께 저장되었습니다.");
        }, 'image/png');
        
        return; 
      } catch (pickerErr) {
        if (pickerErr.name === 'AbortError') return; 
        console.warn("폴더 지정 권한 오류, 브라우저 기본 다운로드로 Fallback합니다.", pickerErr);
      }
    }

    const downloadFile = (url, filename) => {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const jsonBlob = new Blob([jsonString], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    downloadFile(jsonUrl, `${templateName}.json`);
    URL.revokeObjectURL(jsonUrl);

    const imgUrl = canvas.toDataURL('image/png');
    downloadFile(imgUrl, `${templateName}.png`);

    showAlert("성공", "success", "JSON 양식과 미리보기(PNG)가 기본 다운로드 폴더에 저장되었습니다.");
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
        setLayout(json.layout || { labelW: '100', labelH: '50', delimiter: '', excelMapping: {} }); 
        initItems(json.items || []);
        showAlert("성공", "success", "파일을 불러왔습니다.");
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
    reader.onload = (ev) => updateItem(selectedIds[0], 'src', ev.target.result, false);
    reader.readAsDataURL(file); 
    e.target.value = null;
  };

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
        <Tooltip title="선택 (Ctrl: 다중, Shift: 범위)" placement="right">
          <IconButton 
            color={activeTool === 'select' ? 'primary' : 'inherit'} 
            onClick={() => handleToolChange('select')}
          >
            <CursorIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="이동 (화면 스크롤)" placement="right">
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
          { id: 'text',    icon: <TitleIcon />,                label: '글자' }, 
          { id: 'data',    icon: <DataObjectIcon />,           label: '데이터' }, 
          { id: 'date',    icon: <EventIcon />,                label: '날짜' },
          { id: 'table',   icon: <TableChartIcon />,           label: '표(테이블)' }, 
          { id: 'rect',    icon: <CropSquareIcon />,           label: '사각형' }, 
          { id: 'circle',  icon: <RadioButtonUncheckedIcon />, label: '타원' }, 
          { id: 'line',    icon: <MaximizeIcon />,             label: '선' },
          { id: 'image',   icon: <ImageIcon />,                label: '이미지' }, 
          { id: 'barcode', icon: <BarcodeIcon />,              label: '바코드' }, 
          { id: 'qrcode',  icon: <QrCodeIcon />,               label: 'QR코드' }
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
            p:               1, 
            display:         'flex', 
            justifyContent:  'space-between', 
            alignItems:      'center', 
            borderRadius:    0, 
            borderBottom:    '1px solid', 
            borderColor:     'divider', 
            backgroundColor: 'background.paper', 
            zIndex:          12 
          }}
        >
          <Stack 
            direction="row" 
            spacing={2} 
            alignItems="center"
          >
            <Typography variant="caption" fontWeight="bold">Zoom</Typography>
            <Slider 
              size="small" 
              value={zoom} 
              min={0.5} 
              max={5.0} 
              step={0.1} 
              onChange={(e, v) => setZoom(v)} 
              sx={{ width: 80 }} 
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
                  onChange={(e) => setGridSize(e.target.value)} 
                  onBlur={(e) => {
                    let val = parseFloat(e.target.value);
                    if (isNaN(val) || val <= 0) val = 2;
                    setGridSize(String(val));
                  }}
                  sx={{ width: 65 }} 
                  inputProps={{ 
                    step:  0.1, 
                    min:   0.1, 
                    style: { 
                      padding:   '4px', 
                      fontSize:  '0.75rem', 
                      textAlign: 'center' 
                    } 
                  }} 
                />
                <Typography variant="caption" color="text.secondary">mm</Typography>
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
          
          <Stack direction="row" spacing={1}>
            <Tooltip title="실행 취소 (Ctrl+Z)">
              <IconButton 
                size="small" 
                onClick={handleUndo} 
                disabled={historyUIState.step <= 0}
              >
                <UndoIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="다시 실행 (Ctrl+Y)">
              <IconButton 
                size="small" 
                onClick={handleRedo} 
                disabled={historyUIState.step >= historyUIState.length - 1}
              >
                <RedoIcon />
              </IconButton>
            </Tooltip>
            
            <Divider 
              orientation="vertical" 
              flexItem 
              sx={{ mx: 0.5 }} 
            />

            <Button 
              size="small" 
              variant="outlined" 
              color="warning" 
              startIcon={<GridOnIcon />} 
              onClick={() => excelLayoutInputRef.current.click()}
            >
              엑셀 템플릿(표) 생성
            </Button>
            <input 
              type="file" 
              ref={excelLayoutInputRef} 
              style={{ display: 'none' }} 
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
              onChange={handleExcelLayoutParse} 
            />

            <Divider 
              orientation="vertical" 
              flexItem 
              sx={{ mx: 1 }} 
            />

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
              onClick={handleExport}
            >
              내보내기 (JSON+PNG)
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
            overflow: 'hidden',
            backgroundColor: (theme) => theme.palette.layout.design.canvasBg
          }}
        >
          {/* 눈금자 교차점 */}
          <Box 
            sx={{ 
              position: 'absolute', top: 0, left: 0, width: 20, height: 20, 
              backgroundColor: '#e8e8e8', borderBottom: '1px solid #ccc', borderRight: '1px solid #ccc', zIndex: 20 
            }} 
          />
          
          {/* 가로 눈금자 */}
          <Box 
            sx={{ 
              position: 'absolute', top: 0, left: 20, right: 0, height: 20, 
              backgroundColor: '#f5f5f5', borderBottom: '1px solid #ccc', zIndex: 15, overflow: 'hidden' 
            }}
          >
            <canvas ref={hRulerRef} style={{ width: '100%', height: '100%', display: 'block' }} />
            <Box 
              ref={hGuideRef} 
              sx={{ 
                position: 'absolute', top: 0, bottom: 0, width: '1px', 
                backgroundColor: 'red', display: 'none', pointerEvents: 'none', zIndex: 16 
              }} 
            />
          </Box>

          {/* 세로 눈금자 */}
          <Box 
            sx={{ 
              position: 'absolute', top: 20, left: 0, bottom: 0, width: 20, 
              backgroundColor: '#f5f5f5', borderRight: '1px solid #ccc', zIndex: 15, overflow: 'hidden' 
            }}
          >
            <canvas ref={vRulerRef} style={{ width: '100%', height: '100%', display: 'block' }} />
            <Box 
              ref={vGuideRef} 
              sx={{ 
                position: 'absolute', left: 0, right: 0, height: '1px', 
                backgroundColor: 'red', display: 'none', pointerEvents: 'none', zIndex: 16 
              }} 
            />
          </Box>

          {/* 캔버스 배경 스크롤 영역 */}
          <Box 
            id="design-scroll-container"
            ref={scrollContainerRef} 
            onScroll={drawRulers}
            sx={{ 
              position:        'absolute', 
              top:             20, 
              left:            20, 
              right:           0, 
              bottom:          0, 
              overflow:        'auto', 
              cursor:          activeTool === 'pan' ? (isPanning ? 'grabbing' : 'grab') : 'default', 
              userSelect:      'none', 
              WebkitUserSelect:'none' 
            }} 
            onMouseDown={handleMouseDownCanvas} 
            onMouseUp={handleMouseUpCanvas} 
            onWheel={handleWheelZoom}
          >
            <Box
              id="design-canvas-wrapper"
              sx={{
                minWidth:       '100%',
                minHeight:      '100%',
                width:          'max-content',
                height:         'max-content',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                p:              10 
              }}
            >
              <Box 
                id="design-canvas-container"
                ref={canvasRef} 
                sx={{ 
                  position:   'relative', 
                  width:      `${(parseFloat(layout.labelW)||100) * MM_PX_UNIT * zoom}px`, 
                  height:     `${(parseFloat(layout.labelH)||50) * MM_PX_UNIT * zoom}px`, 
                  transition: 'width 0.1s, height 0.1s' 
                }}
              >
                <Box 
                  id="design-canvas-paper"
                  sx={{ 
                    width:           `${parseFloat(layout.labelW)||100}mm`, 
                    height:          `${parseFloat(layout.labelH)||50}mm`, 
                    backgroundColor: '#fff', 
                    position:        'absolute', 
                    top:             0, 
                    left:            0, 
                    boxShadow:       '0 10px 30px rgba(0,0,0,0.3)', 
                    transform:       `scale(${zoom})`, 
                    transformOrigin: '0 0', 
                    ...(showGrid && { 
                      backgroundImage:    `radial-gradient(circle at 0 0, rgba(0,0,0,0.3) 1px, transparent 1px)`, 
                      backgroundSize:     `${safeGridSize * MM_PX_UNIT}px ${safeGridSize * MM_PX_UNIT}px`, 
                      backgroundPosition: `0 0` 
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
                    if (!nodeRefs.current[item.id]) nodeRefs.current[item.id] = createRef();
                    const isSel = selectedIds.includes(item.id);
                    const isTextType = ['text', 'data', 'date'].includes(item.type);
                    
                    const hiddenCells = getHiddenCells(item);

                    // ★ CSS Grid 'fr' 및 SVG 비율 100% 강제 동기화 렌더링 로직 (Auto-Fill)
                    const colRatios = item.colRatios || Array(item.cols).fill(100/(item.cols||1));
                    const rowRatios = item.rowRatios || Array(item.rows).fill(100/(item.rows||1));
                    
                    const totalColRatio = colRatios.reduce((a,b) => Number(a) + Number(b), 0) || 100;
                    const totalRowRatio = rowRatios.reduce((a,b) => Number(a) + Number(b), 0) || 100;

                    const getColPos = (index) => {
                      let pos = 0;
                      for(let i=0; i<index; i++) pos += Number(colRatios[i]);
                      return (pos / totalColRatio) * 100;
                    };
                    const getColWidth = (index, span) => {
                      let w = 0;
                      for(let i=index; i<index+(span||1); i++) w += Number(colRatios[i]);
                      return (w / totalColRatio) * 100;
                    };
                    const getRowPos = (index) => {
                      let pos = 0;
                      for(let i=0; i<index; i++) pos += Number(rowRatios[i]);
                      return (pos / totalRowRatio) * 100;
                    };
                    const getRowHeight = (index, span) => {
                      let h = 0;
                      for(let i=index; i<index+(span||1); i++) h += Number(rowRatios[i]);
                      return (h / totalRowRatio) * 100;
                    };

                    return (
                      <Draggable 
                        key={item.id} 
                        nodeRef={nodeRefs.current[item.id]} 
                        disabled={activeTool !== 'select' || isResizing || isPanning || !isSel || tableResizeData} 
                        scale={zoom} 
                        position={{ 
                          x: (parseFloat(item.x) || 0) * MM_PX_UNIT, 
                          y: (parseFloat(item.y) || 0) * MM_PX_UNIT 
                        }} 
                        onStart={handleDragStart} 
                        onDrag={handleGroupDrag} 
                        onStop={handleDragStop}
                      >
                        <div 
                          ref={nodeRefs.current[item.id]} 
                          onClick={(e) => handleItemClick(e, item.id)} 
                          style={{ 
                            position:         'absolute', 
                            cursor:           activeTool === 'select' ? 'move' : 'inherit', 
                            zIndex:           isSel ? 9999 : (items.length - items.findIndex(i => i.id === item.id)), 
                            userSelect:       'none', 
                            WebkitUserSelect: 'none' 
                          }}
                        >
                          <div 
                            style={{ 
                              transform:       `rotate(${parseFloat(item.rotate)||0}deg)`, 
                              transformOrigin: 'center center', 
                              border:          isSel ? '1px dashed rgba(25, 118, 210, 0.5)' : '1px dashed transparent', 
                              width:           isTextType ? 'max-content' : `${parseFloat(item.width)||0}mm`, 
                              height:          isTextType ? 'max-content' : `${parseFloat(item.height)||0}mm`, 
                              minHeight:       item.type === 'line' ? '1px' : undefined,
                              position:        'relative',
                              boxSizing:       'content-box'
                            }}
                          >
                            
                            {/* 렌더링: 텍스트 개체들 */}
                            {isTextType && (() => {
                              const pfx = item.showPrefixSuffixOnLabel !== false ? (item.prefix || '') : '';
                              const sfx = item.showPrefixSuffixOnLabel !== false ? (item.suffix || '') : '';
                              return (
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
                                      fontSize:   `${parseFloat(item.fontSize)||10}pt`, 
                                      whiteSpace: 'nowrap', 
                                      lineHeight: 1, 
                                      color:      item.type === 'data' ? '#1976d2' : '#000', 
                                      fontWeight: item.fontWeight, 
                                      fontStyle:  item.fontStyle || 'normal' 
                                    }}
                                  >
                                    {item.type === 'date' 
                                      ? `${pfx}${getKstPreviewDate(item.content)}${sfx}` 
                                      : item.type === 'data' 
                                        ? `${pfx}${item.content ? item.content : '[DATA]'}${sfx}` 
                                        : item.content}
                                  </Typography>
                                </Box>
                              );
                            })()}
                            
                            {/* 렌더링: 기본 도형 개체 */}
                            {item.type === 'rect' && (() => {
                               const bw = item.borderWidth !== undefined && item.borderWidth !== '' ? parseFloat(item.borderWidth) : 0.5;
                               return (
                                <svg width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }}>
                                  <rect 
                                    x="0" 
                                    y="0" 
                                    width="100%" 
                                    height="100%" 
                                    fill={item.transparent === false ? (item.fill || '#ffffff') : 'transparent'} 
                                    stroke={item.stroke || '#000000'} 
                                    strokeWidth={`${bw}mm`} 
                                  />
                                </svg>
                               );
                            })()}
                            {item.type === 'circle' && (() => {
                               const bw = item.borderWidth !== undefined && item.borderWidth !== '' ? parseFloat(item.borderWidth) : 0.5;
                               return (
                                <svg width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }}>
                                  <ellipse 
                                    cx="50%" 
                                    cy="50%" 
                                    rx="50%" 
                                    ry="50%" 
                                    fill={item.transparent === false ? (item.fill || '#ffffff') : 'transparent'} 
                                    stroke={item.stroke || '#000000'} 
                                    strokeWidth={`${bw}mm`} 
                                  />
                                </svg>
                               );
                            })()}
                            
                            {item.type === 'line' && (() => {
                               const thk = item.height !== undefined && item.height !== '' ? parseFloat(item.height) : 0.5;
                               return (
                                <svg width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }}>
                                  <line 
                                    x1="0" 
                                    y1="50%" 
                                    x2="100%" 
                                    y2="50%" 
                                    stroke={item.stroke || '#000000'} 
                                    strokeWidth={`${thk}mm`} 
                                  />
                                </svg>
                               );
                            })()}
                            
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
                            
                            {/* 렌더링: 일반 바코드 개체 */}
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
                                  value={codeDataWithPrefix || 'BARCODE'} 
                                  format={item.barcodeType || 'CODE128'} 
                                  width={2} 
                                  height={100} 
                                  displayValue={item.displayValue !== false} 
                                  margin={0} 
                                />
                              </Box>
                            )}
                            
                            {/* 렌더링: 일반 QR코드 개체 */}
                            {item.type === 'qrcode' && (
                              <Box 
                                sx={{ 
                                  width:  '100%', 
                                  height: '100%' 
                                }}
                              >
                                <QRCode 
                                  value={codeDataWithPrefix || 'QRCODE'} 
                                  level={item.qrErrorLevel || 'M'} 
                                  size={(parseFloat(item.height)||0) * MM_PX_UNIT} 
                                  style={{ 
                                    width:  '100%', 
                                    height: '100%' 
                                  }} 
                                />
                              </Box>
                            )}

                            {/* 표 렌더링 */}
                            {item.type === 'table' && (() => {
                              const bw = item.borderWidth !== undefined && item.borderWidth !== '' ? parseFloat(item.borderWidth) : 0.5;
                              const strokeColor = item.stroke || '#000000';
                              const showBorders = item.showBorder !== false && bw > 0;
                              
                              return (
                                <Box 
                                  sx={{ 
                                    width:               '100%', 
                                    height:              '100%', 
                                    position:            'relative',
                                  }}
                                >
                                  <Box 
                                    sx={{ 
                                      width:           '100%', 
                                      height:          '100%', 
                                      backgroundColor: item.transparent === false ? (item.fill || '#ffffff') : 'transparent', 
                                      position:        'absolute', 
                                      top:             0, 
                                      left:            0 
                                    }} 
                                  />

                                  {/* 행/열 개별 드래그 리사이즈 핸들 */}
                                  {isSel && selectedIds.length === 1 && (
                                    <>
                                      {colRatios.slice(0, -1).map((_, i) => (
                                        <Box
                                          data-resizer="true"
                                          key={`col-handle-${i}`}
                                          onMouseDown={(e) => handleTableResizeStart(e, item, 'col', i)}
                                          sx={{
                                            position:        'absolute',
                                            top:             0,
                                            bottom:          0,
                                            left:            `calc(${getColPos(i + 1)}% - 3px)`,
                                            width:           '6px',
                                            cursor:          'col-resize',
                                            zIndex:          10,
                                            '&:hover':       { backgroundColor: 'rgba(25, 118, 210, 0.5)' }
                                          }}
                                        />
                                      ))}
                                      {rowRatios.slice(0, -1).map((_, i) => (
                                        <Box
                                          data-resizer="true"
                                          key={`row-handle-${i}`}
                                          onMouseDown={(e) => handleTableResizeStart(e, item, 'row', i)}
                                          sx={{
                                            position:        'absolute',
                                            left:            0,
                                            right:           0,
                                            top:             `calc(${getRowPos(i + 1)}% - 3px)`,
                                            height:          '6px',
                                            cursor:          'row-resize',
                                            zIndex:          10,
                                            '&:hover':       { backgroundColor: 'rgba(25, 118, 210, 0.5)' }
                                          }}
                                        />
                                      ))}
                                    </>
                                  )}

                                  {showBorders && (
                                    <svg 
                                      width="100%" 
                                      height="100%" 
                                      style={{ 
                                        position:      'absolute', 
                                        top:           0, 
                                        left:          0, 
                                        pointerEvents: 'none', 
                                        overflow:      'visible', 
                                        zIndex:        2 
                                      }}
                                    >
                                      {item.cells?.map((cell, idx) => {
                                        if (hiddenCells.has(`${cell.row}_${cell.col}`)) return null;
                                        return (
                                          <rect 
                                            key={idx}
                                            x={`${getColPos(cell.col)}%`}
                                            y={`${getRowPos(cell.row)}%`}
                                            width={`${getColWidth(cell.col, cell.colSpan)}%`}
                                            height={`${getRowHeight(cell.row, cell.rowSpan)}%`}
                                            fill="none"
                                            stroke={strokeColor}
                                            strokeWidth={`${bw}mm`}
                                          />
                                        );
                                      })}
                                    </svg>
                                  )}

                                  {/* ★ Grid Template 변경: % 대신 fr(Fraction) 단위 강제 할당으로 100% 꽉 채우기 적용 */}
                                  <Box 
                                    sx={{ 
                                      width:               '100%', 
                                      height:              '100%', 
                                      display:             'grid', 
                                      gridTemplateRows:    rowRatios.map(r => `${Number(r)}fr`).join(' '), 
                                      gridTemplateColumns: colRatios.map(r => `${Number(r)}fr`).join(' '), 
                                      position:            'relative',
                                      zIndex:              1,
                                      boxSizing:           'border-box' 
                                    }}
                                  >
                                    {item.cells?.map((cell, idx) => {
                                      if (hiddenCells.has(`${cell.row}_${cell.col}`)) return null;

                                      const isCellSelected = selectedCells.some(c => c.itemId === item.id && c.row === cell.row && c.col === cell.col);
                                      const showCellPfxSfx = cell.showPrefixSuffixOnLabel !== false;
                                      const cPfx = showCellPfxSfx ? (cell.prefix || '') : '';
                                      const cSfx = showCellPfxSfx ? (cell.suffix || '') : '';
                                      const isCellVisible = cell.visible !== false; 
                                      
                                      return (
                                        <Box 
                                          key={idx} 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (activeTool === 'select') {
                                              const newCell = { 
                                                itemId: item.id, 
                                                row:    cell.row, 
                                                col:    cell.col 
                                              };
                                              
                                              const isCtrl = e.ctrlKey || e.metaKey;

                                              if (isCtrl) {
                                                // Ctrl: 토글 다중 선택
                                                setSelectedIds([item.id]);
                                                setSelectedCells(prev => {
                                                  const exists = prev.find(c => c.itemId === item.id && c.row === cell.row && c.col === cell.col);
                                                  if (exists) {
                                                    return prev.filter(c => !(c.itemId === item.id && c.row === cell.row && c.col === cell.col));
                                                  }
                                                  return [...prev, newCell];
                                                });
                                                lastSelectedCellRef.current = newCell;
                                              } else if (e.shiftKey && lastSelectedCellRef.current?.itemId === item.id) {
                                                // Shift: 시작점부터 끝점까지 범위 선택
                                                setSelectedIds([item.id]);
                                                const startCell = lastSelectedCellRef.current;
                                                const minRow = Math.min(startCell.row, cell.row);
                                                const maxRow = Math.max(startCell.row, cell.row);
                                                const minCol = Math.min(startCell.col, cell.col);
                                                const maxCol = Math.max(startCell.col, cell.col);

                                                const rangeCells = [];
                                                item.cells.forEach(c => {
                                                  if (c.row >= minRow && c.row <= maxRow && c.col >= minCol && c.col <= maxCol) {
                                                    if (!hiddenCells.has(`${c.row}_${c.col}`)) {
                                                      rangeCells.push({ itemId: item.id, row: c.row, col: c.col });
                                                    }
                                                  }
                                                });
                                                setSelectedCells(rangeCells);
                                              } else {
                                                // 일반: 단일 선택
                                                setSelectedIds([item.id]);
                                                setSelectedCells([newCell]);
                                                lastSelectedCellRef.current = newCell;
                                              }
                                            }
                                          }}
                                          sx={{
                                            gridRow:         `${cell.row + 1} / span ${cell.rowSpan || 1}`,
                                            gridColumn:      `${cell.col + 1} / span ${cell.colSpan || 1}`,
                                            boxSizing:       'border-box',
                                            display:         'flex',
                                            alignItems:      'center',
                                            justifyContent:  'center',
                                            backgroundColor: isCellSelected ? 'rgba(25, 118, 210, 0.2)' : 'transparent',
                                            overflow:        'hidden',
                                            position:        'relative',
                                            cursor:          'pointer',
                                            padding:         '2px'
                                          }}
                                        >
                                          {/* 셀 가시성이 켜져있을 때만 내부 데이터 렌더링 */}
                                          {isCellVisible && (
                                            cell.cellType === 'barcode' ? (
                                              <Box 
                                                sx={{ 
                                                  display:        'flex', 
                                                  alignItems:     'center', 
                                                  justifyContent: 'center', 
                                                  width:          '100%', 
                                                  height:         '100%', 
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
                                                   value={codeDataWithPrefix || 'BARCODE'} 
                                                   format={cell.barcodeType || 'CODE128'} 
                                                   width={2} 
                                                   height={35} 
                                                   displayValue={cell.displayValue !== false} 
                                                   margin={4} 
                                                />
                                              </Box>
                                            ) : cell.cellType === 'qrcode' ? (
                                              <Box 
                                                sx={{ 
                                                  display:        'flex', 
                                                  alignItems:     'center', 
                                                  justifyContent: 'center',
                                                  width:          '100%',
                                                  height:         '100%',
                                                  padding:        '2px',
                                                  boxSizing:      'border-box'
                                                }}
                                              >
                                                <QRCode 
                                                  value={codeDataWithPrefix || 'QRCODE'} 
                                                  level={cell.qrErrorLevel || 'M'} 
                                                  style={{ 
                                                    maxWidth:  '100%', 
                                                    maxHeight: '100%',
                                                    width:     'auto',
                                                    height:    'auto'
                                                  }}
                                                />
                                              </Box>
                                            ) : (
                                              <Typography 
                                                sx={{ 
                                                  fontSize:   `${parseFloat(cell.fontSize) || parseFloat(item.fontSize) || 10}pt`, 
                                                  fontWeight: item.fontWeight, 
                                                  fontStyle:  item.fontStyle,
                                                  color:      cell.cellType === 'data' ? '#1976d2' : '#000',
                                                  wordBreak:  'break-all',
                                                  textAlign:  'center',
                                                  lineHeight: 1.1
                                                }}
                                              >
                                                {cell.cellType === 'data' 
                                                  ? `${cPfx}[${cell.dataId || 'DATA'}]${cSfx}`
                                                  : cell.cellType === 'date'
                                                    ? `${cPfx}${getKstPreviewDate(cell.content || 'YYYY-MM-DD')}${cSfx}`
                                                    : cell.content}
                                              </Typography>
                                            )
                                          )}
                                        </Box>
                                      );
                                    })}
                                  </Box>
                                </Box>
                              );
                            })()}
                            
                            {/* 우측 하단 리사이즈 컨트롤러 */}
                            {isSel && selectedIds.length === 1 && !isTextType && (
                              <Box 
                                data-resizer="true"
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
      </Box>

      {/* 3. 우측 객체 속성(Properties) 패널 */}
      <Box 
        sx={{ 
          width:           340, 
          minWidth:        340, 
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
               {/* 3-1. 레이어 식별 이름 */}
               {selectedIds.length === 1 && (
                 <TextField 
                   label="레이어 이름" 
                   size="small" 
                   fullWidth 
                   value={targetItem?.label || ''} 
                   onChange={(e) => updateItem(selectedIds[0], 'label', e.target.value, false)} 
                   onBlur={takeSnapshot}
                 />
               )}

               {/* 양방향 동기화 마스터 편집창 */}
               {isMasterInputVisible && (
                 <MuiPaper 
                   variant="outlined" 
                   sx={{ 
                     p:               1.5, 
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
                     💡 가변 데이터 일괄 편집 (양방향 동기화)
                   </Typography>
                   <TextField 
                     label="조합된 데이터 직접 수정" 
                     size="small" 
                     fullWidth 
                     multiline 
                     minRows={2} 
                     value={masterInputText} 
                     onChange={handleCombinedDataChange} 
                     onFocus={() => setIsMasterFocused(true)}
                     onBlur={() => {
                       setIsMasterFocused(false);
                       takeSnapshot();
                     }}
                     sx={{ backgroundColor: '#fff' }}
                     helperText={`구분자 '${layout.delimiter || '없음'}' 기준으로 각 데이터 셀에 자동 분배됩니다.`}
                   />
                 </MuiPaper>
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
                        <IconButton 
                          size="small" 
                          onClick={() => alignSelectedItems('left')}
                        >
                          <AlignHorizontalLeftIcon fontSize="small"/>
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="수평 중앙 맞춤">
                        <IconButton 
                          size="small" 
                          onClick={() => alignSelectedItems('h-center')}
                        >
                          <AlignHorizontalCenterIcon fontSize="small"/>
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="우측 맞춤">
                        <IconButton 
                          size="small" 
                          onClick={() => alignSelectedItems('right')}
                        >
                          <AlignHorizontalRightIcon fontSize="small"/>
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="상단 맞춤">
                        <IconButton 
                          size="small" 
                          onClick={() => alignSelectedItems('top')}
                        >
                          <AlignVerticalTopIcon fontSize="small"/>
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="수직 중앙 맞춤">
                        <IconButton 
                          size="small" 
                          onClick={() => alignSelectedItems('v-center')}
                        >
                          <AlignVerticalCenterIcon fontSize="small"/>
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="하단 맞춤">
                        <IconButton 
                          size="small" 
                          onClick={() => alignSelectedItems('bottom')}
                        >
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

               {/* 3-3. 단일 개체 속성 */}
               {selectedIds.length === 1 && (
                 <>
                   {/* 레이어 순서 (Z-Index) 제어 */}
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
                        레이어 순서 (Z-Index)
                      </Typography>
                      <Stack 
                        direction="row" 
                        spacing={0.5} 
                        justifyContent="space-between" 
                      >
                        <Tooltip title="맨 앞으로 가져오기">
                          <IconButton size="small" onClick={() => handleLayerOrder('front')}>
                            <KeyboardDoubleArrowUpIcon fontSize="small"/>
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="앞으로 가져오기">
                          <IconButton size="small" onClick={() => handleLayerOrder('forward')}>
                            <KeyboardArrowUpIcon fontSize="small"/>
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="뒤로 보내기">
                          <IconButton size="small" onClick={() => handleLayerOrder('backward')}>
                            <KeyboardArrowDownIcon fontSize="small"/>
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="맨 뒤로 보내기">
                          <IconButton size="small" onClick={() => handleLayerOrder('back')}>
                            <KeyboardDoubleArrowDownIcon fontSize="small"/>
                          </IconButton>
                        </Tooltip>
                      </Stack>
                   </MuiPaper>

                   {/* 모양 스타일 제어 (배경색/선두께) */}
                   {['rect', 'circle', 'table', 'line'].includes(targetItem?.type) && (
                     <>
                       <Divider sx={{ my: 1 }} />
                       <Typography variant="caption" fontWeight="bold" color="primary">
                         모양 스타일 설정
                       </Typography>
                       
                       {['rect', 'circle', 'table'].includes(targetItem?.type) && (
                         <Box>
                           <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                             <Typography variant="caption" fontWeight="bold" sx={{ width: 45 }}>선 색상</Typography>
                             <input 
                               type="color" 
                               value={targetItem?.stroke || '#000000'} 
                               onChange={(e) => updateItem(selectedIds[0], 'stroke', e.target.value, false)}
                               onBlur={takeSnapshot}
                               style={{ width: 30, height: 30, padding: 0, border: '1px solid #ccc', cursor: 'pointer' }}
                             />
                             <TextField 
                               label="선 두께(mm)" 
                               type="number" 
                               size="small" 
                               value={targetItem?.borderWidth ?? ''} 
                               onChange={(e) => updateItem(selectedIds[0], 'borderWidth', e.target.value, false)}
                               onBlur={(e) => {
                                 let val = parseFloat(e.target.value);
                                 if(isNaN(val) || val < 0) val = 0; 
                                 updateItem(selectedIds[0], 'borderWidth', Number(val), true);
                               }}
                               inputProps={{ step: 0.1, min: 0 }}
                               sx={{ width: 100, ml: 1 }}
                             />
                           </Stack>
                           
                           <Stack direction="row" spacing={1} alignItems="center" mt={1.5}>
                             <Typography variant="caption" fontWeight="bold" sx={{ width: 45 }}>채우기</Typography>
                             {targetItem?.transparent === false && (
                               <input 
                                 type="color" 
                                 value={targetItem?.fill || '#ffffff'} 
                                 onChange={(e) => updateItem(selectedIds[0], 'fill', e.target.value, false)}
                                 onBlur={takeSnapshot}
                                 style={{ width: 30, height: 30, padding: 0, border: '1px solid #ccc', cursor: 'pointer' }}
                               />
                             )}
                             <FormControlLabel 
                               control={
                                 <Checkbox 
                                   size="small" 
                                   checked={targetItem?.transparent !== false} 
                                   onChange={(e) => updateItem(selectedIds[0], 'transparent', e.target.checked, true)} 
                                 />
                               }
                               label={<Typography variant="caption" fontWeight="bold">채우기 없음(투명)</Typography>}
                               sx={{ ml: targetItem?.transparent === false ? 1 : 0 }}
                             />
                           </Stack>
                         </Box>
                       )}

                       {targetItem?.type === 'line' && (
                         <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                           <Typography variant="caption" fontWeight="bold">선 색상</Typography>
                           <input 
                             type="color" 
                             value={targetItem?.stroke || '#000000'} 
                             onChange={(e) => updateItem(selectedIds[0], 'stroke', e.target.value, false)}
                             onBlur={takeSnapshot}
                             style={{ width: 30, height: 30, padding: 0, border: '1px solid #ccc', cursor: 'pointer' }}
                           />
                           <TextField 
                             label="선 두께(mm)" 
                             type="number" 
                             size="small" 
                             value={targetItem?.height ?? ''} 
                             onChange={(e) => updateItem(selectedIds[0], 'height', e.target.value, false)}
                             onBlur={(e) => {
                               let val = parseFloat(e.target.value);
                               if(isNaN(val) || val <= 0) val = 0.5; 
                               updateItem(selectedIds[0], 'height', Number(val), true);
                             }}
                             inputProps={{ step: 0.1, min: 0.1 }}
                             sx={{ width: 100, ml: 1 }}
                           />
                         </Stack>
                       )}

                       {targetItem?.type === 'table' && (
                         <FormControlLabel 
                           control={
                             <Checkbox 
                               size="small" 
                               checked={targetItem.showBorder !== false} 
                               onChange={(e) => updateItem(targetItem.id, 'showBorder', e.target.checked, true)} 
                             />
                           } 
                           label={<Typography variant="caption" fontWeight="bold">표(Table) 테두리 선 보이기</Typography>} 
                           sx={{ mt: 0.5 }}
                         />
                       )}
                     </>
                   )}
                   
                   <Divider sx={{ my: 1 }} />

                   <FormControlLabel 
                     control={
                       <Checkbox 
                         size="small" 
                         checked={targetItem?.useSnap || false} 
                         onChange={(e) => updateItem(selectedIds[0], 'useSnap', e.target.checked, true)} 
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
                          value={parseFloat(targetItem?.rotate) || 0} 
                          min={0} 
                          max={360} 
                          onChange={(e, v) => updateItem(selectedIds[0], 'rotate', String(v), false)} 
                          onChangeCommitted={takeSnapshot}
                        />
                        <TextField 
                          size="small" 
                          variant="outlined" 
                          type="number" 
                          value={targetItem?.rotate ?? ''} 
                          onChange={(e) => updateItem(selectedIds[0], 'rotate', e.target.value, false)} 
                          onBlur={(e) => {
                            let val = parseFloat(e.target.value);
                            if(isNaN(val)) val = 0;
                            updateItem(selectedIds[0], 'rotate', Number(val), true);
                          }}
                          sx={{ 
                            width: 100 
                          }} 
                          inputProps={{ 
                            step: 1,
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
                       value={targetItem?.x ?? ''} 
                       onChange={(e) => updateItem(selectedIds[0], 'x', e.target.value, false)} 
                       onBlur={(e) => {
                         let val = parseFloat(e.target.value);
                         if(isNaN(val) || val < 0) val = 0;
                         const maxW = parseFloat(layout.labelW) || 100;
                         const bbox = getRealBBox(targetItem);
                         if(val + bbox.w > maxW) val = maxW - bbox.w;
                         updateItem(selectedIds[0], 'x', Number(val), true);
                       }}
                       inputProps={{ step: 0.1 }}
                     />
                     <TextField 
                       label="Y위치(mm)" 
                       type="number" 
                       size="small" 
                       value={targetItem?.y ?? ''} 
                       onChange={(e) => updateItem(selectedIds[0], 'y', e.target.value, false)} 
                       onBlur={(e) => {
                         let val = parseFloat(e.target.value);
                         if(isNaN(val) || val < 0) val = 0;
                         const maxH = parseFloat(layout.labelH) || 50;
                         const bbox = getRealBBox(targetItem);
                         if(val + bbox.h > maxH) val = maxH - bbox.h;
                         updateItem(selectedIds[0], 'y', Number(val), true);
                       }}
                       inputProps={{ step: 0.1 }}
                     />
                   </Stack>
                   
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
                           value={targetItem?.width ?? ''} 
                           onChange={(e) => updateItem(selectedIds[0], 'width', e.target.value, false)} 
                           onBlur={(e) => {
                             let val = parseFloat(e.target.value);
                             if(isNaN(val) || val < 0.1) val = 10;
                             const maxW = parseFloat(layout.labelW) || 100;
                             const cx = parseFloat(targetItem.x) || 0;
                             if(cx + val > maxW) val = maxW - cx;
                             updateItem(selectedIds[0], 'width', Number(val), true);
                             updateItem(selectedIds[0], 'height', Number(val), true);
                           }}
                           inputProps={{ step: 0.1, min: 0.1 }}
                         />
                       ) : (
                         <>
                           <TextField 
                             label="너비(W)" 
                             type="number" 
                             size="small" 
                             value={targetItem?.width ?? ''} 
                             onChange={(e) => updateItem(selectedIds[0], 'width', e.target.value, false)} 
                             onBlur={(e) => {
                               let val = parseFloat(e.target.value);
                               if(isNaN(val) || val < 0.1) val = 10;
                               const maxW = parseFloat(layout.labelW) || 100;
                               const cx = parseFloat(targetItem.x) || 0;
                               if(cx + val > maxW) val = maxW - cx;
                               updateItem(selectedIds[0], 'width', Number(val), true);
                             }}
                             inputProps={{ step: 0.1, min: 0.1 }}
                           />
                           {targetItem?.type !== 'line' && (
                             <TextField 
                               label="높이(H)" 
                               type="number" 
                               size="small" 
                               value={targetItem?.height ?? ''} 
                               onChange={(e) => updateItem(selectedIds[0], 'height', e.target.value, false)} 
                               onBlur={(e) => {
                                 let val = parseFloat(e.target.value);
                                 if(isNaN(val) || val < 0.1) val = 10;
                                 const maxH = parseFloat(layout.labelH) || 50;
                                 const cy = parseFloat(targetItem.y) || 0;
                                 if(cy + val > maxH) val = maxH - cy;
                                 updateItem(selectedIds[0], 'height', Number(val), true);
                               }}
                               inputProps={{ step: 0.1, min: 0.1 }}
                             />
                           )}
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

                   {/* 표(Table) 전용 셀 및 구조 편집(행/열/병합) 제어 기능 */}
                   {targetItem?.type === 'table' && (
                     <>
                       <Divider sx={{ my: 1 }} />
                       <Typography 
                         variant="caption" 
                         fontWeight="bold" 
                         color="primary"
                       >
                         표(Table) 셀/구조 설정
                       </Typography>

                       {selectedCells.length > 0 && selectedCells[0].itemId === targetItem.id && (() => {
                         const isMultiSelected = selectedCells.length > 1;
                         
                         if (isMultiSelected) {
                           return (
                             <MuiPaper 
                               variant="outlined" 
                               sx={{ 
                                 p:               1.5, 
                                 backgroundColor: 'action.hover', 
                                 mt:              2 
                               }}
                             >
                               <Typography 
                                 variant="caption" 
                                 fontWeight="bold" 
                                 display="block" 
                                 mb={1} 
                                 color="secondary"
                               >
                                 {selectedCells.length}개의 셀 다중 선택됨
                               </Typography>
                               <Button 
                                 variant="contained" 
                                 color="primary" 
                                 fullWidth 
                                 startIcon={<CallMergeIcon />} 
                                 onClick={handleMergeCells}
                               >
                                 선택한 영역 병합하기
                               </Button>
                               <Typography 
                                 variant="caption" 
                                 color="text.secondary" 
                                 display="block" 
                                 textAlign="center" 
                                 mt={1}
                               >
                                 Ctrl(또는 Cmd) 키로 다중 선택, Shift 키로 범위 선택이 가능합니다.
                               </Typography>
                             </MuiPaper>
                           );
                         }

                         if (!activeCell) return null;
                         
                         return (
                           <MuiPaper 
                             variant="outlined" 
                             sx={{ 
                               p:               1.5, 
                               backgroundColor: 'action.hover', 
                               mt:              2 
                             }}
                           >
                             <Stack 
                               direction="row" 
                               justifyContent="space-between" 
                               alignItems="center" 
                               mb={1}
                             >
                               <Typography 
                                 variant="caption" 
                                 fontWeight="bold" 
                                 color="secondary"
                               >
                                 단일 셀 설정 ({activeCell.row + 1}행 {activeCell.col + 1}열)
                               </Typography>
                             </Stack>

                             <TextField 
                               label="셀 이름 (별칭)" 
                               size="small" 
                               fullWidth 
                               value={activeCell.cellName || ''} 
                               onChange={(e) => updateTableCell(targetItem.id, activeCell.row, activeCell.col, { cellName: e.target.value }, false)} 
                               onBlur={takeSnapshot}
                               sx={{ mb: 1 }}
                             />

                             {['text', 'data', 'date'].includes(activeCell.cellType) && (
                               <TextField 
                                 label="셀 폰트 크기(pt) - 미입력시 상속" 
                                 type="number" 
                                 size="small" 
                                 fullWidth 
                                 value={activeCell.fontSize || ''} 
                                 onChange={(e) => updateTableCell(targetItem.id, activeCell.row, activeCell.col, { fontSize: e.target.value }, false)} 
                                 onBlur={(e) => {
                                   let val = parseFloat(e.target.value);
                                   if (isNaN(val) || val < 1) val = ''; 
                                   updateTableCell(targetItem.id, activeCell.row, activeCell.col, { fontSize: val === '' ? '' : String(val) }, true);
                                 }}
                                 inputProps={{ step: 0.5, min: 1 }}
                                 sx={{ mb: 1 }}
                               />
                             )}

                             <Typography 
                               variant="caption" 
                               fontWeight="bold" 
                               color="primary"
                               sx={{ mt: 1, mb: 1, display: 'block' }}
                             >
                               구조 편집
                             </Typography>
                             
                             {((activeCell.rowSpan || 1) > 1 || (activeCell.colSpan || 1) > 1) && (
                               <Button 
                                 variant="contained" 
                                 color="warning" 
                                 size="small" 
                                 fullWidth 
                                 startIcon={<CallSplitIcon fontSize="small" />}
                                 onClick={handleUnmergeCells}
                                 sx={{ mb: 1 }}
                               >
                                 셀 병합 해제
                               </Button>
                             )}

                             <Stack 
                               direction="row" 
                               spacing={1} 
                               sx={{ mb: 1 }}
                             >
                               <Button 
                                 variant="outlined" 
                                 size="small" 
                                 fullWidth 
                                 startIcon={<AddRowIcon fontSize="small" />}
                                 onClick={() => modifyTableStructure(targetItem.id, 'insert-row', activeCell.row + 1)}
                               >
                                 행 아래 추가
                               </Button>
                               <Button 
                                 variant="outlined" 
                                 color="error" 
                                 size="small" 
                                 fullWidth 
                                 onClick={() => modifyTableStructure(targetItem.id, 'delete-row', activeCell.row, activeCell.rowSpan || 1)}
                               >
                                 행 일괄 삭제
                               </Button>
                             </Stack>
                             <Stack 
                               direction="row" 
                               spacing={1} 
                               sx={{ mb: 2 }}
                             >
                               <Button 
                                 variant="outlined" 
                                 size="small" 
                                 fullWidth 
                                 startIcon={<AddColIcon fontSize="small" />}
                                 onClick={() => modifyTableStructure(targetItem.id, 'insert-col', activeCell.col + 1)}
                               >
                                 열 우측 추가
                               </Button>
                               <Button 
                                 variant="outlined" 
                                 color="error" 
                                 size="small" 
                                 fullWidth 
                                 onClick={() => modifyTableStructure(targetItem.id, 'delete-col', activeCell.col, activeCell.colSpan || 1)}
                               >
                                 열 일괄 삭제
                               </Button>
                             </Stack>
                             <Divider sx={{ mb: 2 }} />
                             
                             <FormControl 
                               fullWidth 
                               size="small" 
                               sx={{ mb: 1 }}
                             >
                               <InputLabel>셀 속성</InputLabel>
                               <Select 
                                 value={activeCell.cellType || 'text'} 
                                 label="셀 속성" 
                                 onChange={(e) => updateTableCell(targetItem.id, activeCell.row, activeCell.col, { cellType: e.target.value }, true)}
                               >
                                 <MenuItem value="text">고정 텍스트</MenuItem>
                                 <MenuItem value="data">가변 데이터(Data)</MenuItem>
                                 <MenuItem value="date">날짜(Date)</MenuItem>
                                 <MenuItem value="barcode">1D 바코드</MenuItem>
                                 <MenuItem value="qrcode">QR코드</MenuItem>
                               </Select>
                             </FormControl>
                             
                             {(activeCell.cellType === 'data' || activeCell.cellType === 'barcode' || activeCell.cellType === 'qrcode') && (
                               <TextField 
                                 label={activeCell.cellType === 'data' ? "가변 데이터 ID" : "바코드 데이터"} 
                                 size="small" 
                                 fullWidth 
                                 value={activeCell.dataId || ''} 
                                 onChange={(e) => updateTableCell(targetItem.id, activeCell.row, activeCell.col, { dataId: e.target.value }, false)} 
                                 onBlur={takeSnapshot}
                                 sx={{ mt: 1 }}
                               />
                             )}
                             {activeCell.cellType === 'date' && (
                               <TextField 
                                 label="날짜 포맷 (예: YYYY-MM-DD)" 
                                 size="small" 
                                 fullWidth 
                                 value={activeCell.content || 'YYYY-MM-DD'} 
                                 onChange={(e) => updateTableCell(targetItem.id, activeCell.row, activeCell.col, { content: e.target.value }, false)} 
                                 onBlur={takeSnapshot}
                               />
                             )}
                             {activeCell.cellType === 'text' && (
                               <TextField 
                                 label="텍스트 내용" 
                                 size="small" 
                                 fullWidth 
                                 multiline 
                                 value={activeCell.content || ''} 
                                 onChange={(e) => updateTableCell(targetItem.id, activeCell.row, activeCell.col, { content: e.target.value }, false)} 
                                 onBlur={takeSnapshot}
                               />
                             )}
                             
                             {activeCell.cellType === 'barcode' && (
                               <Stack 
                                 spacing={1} 
                                 mt={1}
                               >
                                 <FormControl 
                                   fullWidth 
                                   size="small"
                                 >
                                   <InputLabel>포맷</InputLabel>
                                   <Select 
                                     value={activeCell.barcodeType || 'CODE128'} 
                                     label="포맷" 
                                     onChange={(e) => updateTableCell(targetItem.id, activeCell.row, activeCell.col, { barcodeType: e.target.value }, true)}
                                   >
                                     <MenuItem value="CODE128">CODE128</MenuItem>
                                     <MenuItem value="CODE39">CODE39</MenuItem>
                                     <MenuItem value="EAN13">EAN-13</MenuItem>
                                   </Select>
                                 </FormControl>
                                 <FormControlLabel 
                                   control={
                                     <Checkbox 
                                       size="small" 
                                       checked={activeCell.displayValue !== false} 
                                       onChange={(e) => updateTableCell(targetItem.id, activeCell.row, activeCell.col, { displayValue: e.target.checked }, true)} 
                                     />
                                   } 
                                   label={<Typography variant="caption" fontWeight="bold">바코드 텍스트 표시</Typography>} 
                                 />
                               </Stack>
                             )}
                             {activeCell.cellType === 'qrcode' && (
                               <FormControl 
                                 fullWidth 
                                 size="small" 
                                 sx={{ mt: 1 }}
                               >
                                 <InputLabel>오류 복원율</InputLabel>
                                 <Select 
                                   value={activeCell.qrErrorLevel || 'M'} 
                                   label="오류 복원율" 
                                   onChange={(e) => updateTableCell(targetItem.id, activeCell.row, activeCell.col, { qrErrorLevel: e.target.value }, true)}
                                 >
                                   <MenuItem value="L">L(7%)</MenuItem>
                                   <MenuItem value="M">M(15%)</MenuItem>
                                   <MenuItem value="Q">Q(25%)</MenuItem>
                                   <MenuItem value="H">H(30%)</MenuItem>
                                 </Select>
                               </FormControl>
                             )}

                             {['data', 'date'].includes(activeCell.cellType) && (
                               <Box sx={{ mt: 1 }}>
                                 <Stack 
                                   direction="row" 
                                   spacing={1} 
                                 >
                                   <TextField 
                                     label="접두사(Prefix)" 
                                     size="small" 
                                     value={activeCell.prefix || ''} 
                                     onChange={(e) => updateTableCell(targetItem.id, activeCell.row, activeCell.col, { prefix: e.target.value }, false)} 
                                     onBlur={takeSnapshot}
                                   />
                                   <TextField 
                                     label="접미사(Suffix)" 
                                     size="small" 
                                     value={activeCell.suffix || ''} 
                                     onChange={(e) => updateTableCell(targetItem.id, activeCell.row, activeCell.col, { suffix: e.target.value }, false)} 
                                     onBlur={takeSnapshot}
                                   />
                                 </Stack>
                                 <FormControlLabel 
                                   control={
                                     <Checkbox 
                                       size="small" 
                                       checked={activeCell.showPrefixSuffixOnLabel !== false} 
                                       onChange={(e) => updateTableCell(targetItem.id, activeCell.row, activeCell.col, { showPrefixSuffixOnLabel: e.target.checked }, true)} 
                                     />
                                   } 
                                   label={<Typography variant="caption" fontWeight="bold">화면(라벨)에도 접두/접미사 표시</Typography>} 
                                   sx={{ mt: 0.5, ml: 0.5 }}
                                 />
                               </Box>
                             )}
                           </MuiPaper>
                         );
                       })()}
                     </>
                   )}

                   {/* 텍스트 요소 및 표 전체 기본 폰트 사이즈 및 스타일 제어 */}
                   {['text', 'data', 'date', 'table'].includes(targetItem?.type) && (
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
                            label="기본 폰트(pt)" 
                            type="number" 
                            size="small" 
                            value={targetItem?.fontSize ?? ''} 
                            onChange={(e) => updateItem(selectedIds[0], 'fontSize', e.target.value, false)} 
                            onBlur={(e) => {
                              let val = parseFloat(e.target.value);
                              if(isNaN(val) || val < 1) val = 10;
                              updateItem(selectedIds[0], 'fontSize', Number(val), true);
                            }}
                            inputProps={{ step: 0.5, min: 1 }}
                          />
                          <Tooltip title="굵게 (Bold)">
                            <IconButton 
                              size="small" 
                              color={targetItem?.fontWeight === 'bold' ? 'primary' : 'default'} 
                              onClick={() => updateItem(selectedIds[0], 'fontWeight', targetItem?.fontWeight === 'bold' ? 'normal' : 'bold', true)}
                            >
                              <FormatBoldIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="기울임 (Italic)">
                            <IconButton 
                              size="small" 
                              color={targetItem?.fontStyle === 'italic' ? 'primary' : 'default'} 
                              onClick={() => updateItem(selectedIds[0], 'fontStyle', targetItem?.fontStyle === 'italic' ? 'normal' : 'italic', true)}
                            >
                              <FormatItalicIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                     </MuiPaper>
                   )}

                   {['data', 'date'].includes(targetItem?.type) && (
                     <Box>
                       <Stack 
                         direction="row" 
                         spacing={1}
                       >
                         <TextField 
                           label="접두사(Prefix)" 
                           size="small" 
                           value={targetItem?.prefix || ''} 
                           onChange={(e) => updateItem(selectedIds[0], 'prefix', e.target.value, false)} 
                           onBlur={takeSnapshot}
                         />
                         <TextField 
                           label="접미사(Suffix)" 
                           size="small" 
                           value={targetItem?.suffix || ''} 
                           onChange={(e) => updateItem(selectedIds[0], 'suffix', e.target.value, false)} 
                           onBlur={takeSnapshot}
                         />
                       </Stack>
                       <FormControlLabel 
                         control={
                           <Checkbox 
                             size="small" 
                             checked={targetItem?.showPrefixSuffixOnLabel !== false} 
                             onChange={(e) => updateItem(selectedIds[0], 'showPrefixSuffixOnLabel', e.target.checked, true)} 
                           />
                         } 
                         label={<Typography variant="caption" fontWeight="bold">화면(라벨)에도 접두/접미사 표시</Typography>} 
                         sx={{ mt: 0.5, ml: 0.5 }}
                       />
                     </Box>
                   )}

                   {['barcode', 'qrcode'].includes(targetItem?.type) ? (
                     <></> 
                   ) : targetItem?.type !== 'table' ? (
                     <TextField 
                       label="Content (내용)" 
                       size="small" 
                       multiline 
                       minRows={2} 
                       value={targetItem?.content || ''} 
                       onChange={(e) => updateItem(selectedIds[0], 'content', e.target.value, false)} 
                       onBlur={takeSnapshot}
                     />
                   ) : null}
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
                  onBlur={(e) => {
                    let val = parseFloat(e.target.value);
                    if(isNaN(val) || val < 10) val = 100;
                    setLayout({ ...layout, labelW: String(val) });
                  }}
                />
                <TextField 
                  label="라벨 높이(mm)" 
                  type="number" 
                  size="small" 
                  value={layout.labelH} 
                  onChange={(e) => setLayout({ ...layout, labelH: e.target.value })} 
                  onBlur={(e) => {
                    let val = parseFloat(e.target.value);
                    if(isNaN(val) || val < 10) val = 50;
                    setLayout({ ...layout, labelH: String(val) });
                  }}
                />
              </Stack>
              <TextField 
                label="데이터 그룹 구분자" 
                size="small" 
                value={layout.delimiter} 
                onChange={(e) => setLayout({ ...layout, delimiter: e.target.value })} 
                helperText="지정하지 않으면 바코드 조합 시 데이터 사이에 값이 들어가지 않습니다." 
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
              onReorder={(newItems) => updateItems(newItems, true)} 
              style={{ 
                listStyle: 'none', 
                padding:   0 
              }}
            >
              {items.map((item) => {
                const hiddenCells = getHiddenCells(item);

                return (
                  <Reorder.Item 
                    key={item.id} 
                    value={item}
                  >
                    <MuiPaper 
                      elevation={0} 
                      onClick={(e) => handleItemClick(e, item.id, true)} 
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
                      {item.type === 'table' && (
                        <IconButton 
                          size="small" 
                          onClick={(e) => toggleTableExpand(e, item.id)}
                        >
                          {expandedTableIds.includes(item.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      )}
                      <IconButton 
                        size="small" 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          updateItem(item.id, 'visible', !item.visible, true); 
                        }}
                      >
                        <VisibilityIcon 
                          fontSize="inherit" 
                          color={item.visible ? 'action' : 'disabled'} 
                        />
                      </IconButton>
                    </MuiPaper>

                    {/* 표 서브 레이어(셀) 목록 렌더링 */}
                    {item.type === 'table' && expandedTableIds.includes(item.id) && (
                      <Box sx={{ pl: 4, pr: 1, pb: 1 }}>
                        {item.cells?.map((cell, cIdx) => {
                           if (hiddenCells.has(`${cell.row}_${cell.col}`)) return null; 
                           
                           return (
                             <MuiPaper 
                               key={cIdx} 
                               elevation={0} 
                               sx={{ 
                                 p:               1, 
                                 mb:              0.5, 
                                 display:         'flex', 
                                 alignItems:      'center', 
                                 backgroundColor: 'rgba(0,0,0,0.02)', 
                                 border:          '1px solid #eee' 
                               }}
                             >
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    flex:  1, 
                                    color: 'text.secondary' 
                                  }}
                                >
                                  {cell.cellName ? `${cell.cellName} (${cell.row + 1},${cell.col + 1})` : `셀 (${cell.row + 1}행 ${cell.col + 1}열)`} - {cell.cellType.toUpperCase()}
                                </Typography>
                                <IconButton 
                                  size="small" 
                                  onClick={(e) => {
                                     e.stopPropagation();
                                     updateTableCell(item.id, cell.row, cell.col, { visible: cell.visible === false ? true : false }, true);
                                  }}
                                >
                                   <VisibilityIcon 
                                     fontSize="inherit" 
                                     color={cell.visible !== false ? 'action' : 'disabled'} 
                                   />
                                </IconButton>
                             </MuiPaper>
                           );
                        })}
                      </Box>
                    )}
                  </Reorder.Item>
                );
              })}
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
                    setLayout({ 
                      ...layout, 
                      labelW: t.LabelW, 
                      labelH: t.LabelH, 
                      ...(raw[0].layout || {}) 
                    }); 
                    initItems(raw.slice(1)); 
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