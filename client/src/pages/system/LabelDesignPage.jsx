/**
 * @file    LabelDesignPage.jsx
 * @description 전문 디자인 툴 방식의 라벨 편집기 페이지
 * - [버그수정] 표(Table) CSS border를 제거하고 SVG 렌더링 오버레이로 교체하여 0.1mm 소수점 굵기 완벽 지원 및 선 겹침(비대화) 현상 100% 해결
 * - [버그수정] 일반 선(Line) 객체를 0.1mm로 얇게 했을 때 사라지는 현상을 SVG <line> 태그 렌더링 도입으로 완벽 해결
 * - [UX개선] 선 두께, 격자 간격 등 숫자 입력창에 소수점(0.1) 입력 완벽 지원 및 지웠을 때 강제로 1로 튕기는 버그 해결 (onBlur 검증)
 * - [기능추가] 신규 개체 생성 시 기본 선 색상(Stroke) 검은색 고정 및 선/채우기 독립 컬러 피커 적용
 * - [UI/UX개선] 캔버스 배경 격자(Grid) 점을 수학적으로 완벽하게 (0, 0) 기준으로 렌더링하여 자석 스냅 오차율 0% 달성
 * - [버그수정] 레이어 순서(Z-Index) 앞/뒤 방향 역전 현상 수정 (Index 0 = 최상단)
 * - [기능추가] PPT 스타일의 레이어 순서 제어 기능 추가 (맨 앞으로, 앞으로, 뒤로, 맨 뒤로)
 * - [기능추가] 표(Table) 테두리 선 표시/숨김 토글 및 화면 표시 여부 추가
 * - [기능복구] 표(Table) 셀 병합 해제(Unmerge) 및 행/열 중간 삽입/삭제 로직 완벽 구현
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
  InputLabel,
  DialogActions
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

import Barcode from 'react-barcode';
import QRCode from 'react-qr-code';
import Draggable from 'react-draggable';
import apiClient from '../../utils/apiClient';
import { 
  showAlert, 
  showConfirm 
} from '../../utils/swal';
import * as XLSX from 'xlsx';

const MM_PX_UNIT = 3.78; 

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
  
  // 격자 간격 상태: 문자열로 관리하여 사용자가 다 지워도 튕기지 않음
  const [gridSize, setGridSize] = useState('2');
  const safeGridSize = parseFloat(gridSize) > 0 ? parseFloat(gridSize) : 2;
  
  const [activeTool, setActiveTool] = useState('select'); 
  const [isDrawing, setIsDrawing] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [tempRect, setTempRect] = useState(null);

  const [openDbDialog, setOpenDbDialog] = useState(false);          
  const [dbList, setDbList] = useState([]);                         

  const [masterInputText, setMasterInputText] = useState('');
  const [isMasterFocused, setIsMasterFocused] = useState(false);

  const canvasRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const nodeRefs = useRef({}); 
  const fileInputRef = useRef(null); 
  const imageInputRef = useRef(null);
  const excelLayoutInputRef = useRef(null); 
  
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
  // 유틸리티 및 계산 로직 (Utility & Calculation)
  // =========================================================================
  const handleToolChange = (tool) => {
    setActiveTool(tool);
    if (tool !== 'select') {
      setSelectedIds([]); 
      setSelectedCells([]); 
    }
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

      setItems((prev) => prev.map((item) => 
        targetPos[item.id] !== undefined 
          ? { ...item, [isH ? 'x' : 'y']: targetPos[item.id] } 
          : item
      ));
      return;
    }

    setItems((prev) => prev.map((item) => {
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
    }));
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

    setItems(prev => {
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
    });
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
        i.cells.forEach(cell => {
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
        i.cells.forEach(cell => {
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

    setItems((prevItems) => {
      let partIdx = 0;

      return prevItems.map((item) => {
        const newItem = { ...item };
        
        if (newItem.type === 'data') {
          let partVal = parts[partIdx] !== undefined ? parts[partIdx] : '';
          newItem.content = partVal; 
          partIdx++;
        } 
        else if (newItem.type === 'table' && newItem.cells) {
          newItem.cells = newItem.cells.map(cell => {
            if (cell.cellType === 'data') {
              let partVal = parts[partIdx] !== undefined ? parts[partIdx] : '';
              partIdx++;
              return { ...cell, dataId: partVal };
            } 
            return cell; 
          });
        }
        return newItem;
      });
    });
  };

  // =========================================================================
  // 이벤트 핸들러 (Mouse, Drag, Keyboard)
  // =========================================================================
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
    if (Math.abs(data.x - dragInfoRef.current.startX) > 2 || Math.abs(data.y - dragInfoRef.current.startY) > 2) {
      dragInfoRef.current.isDragging = true;
    }
    
    const dx = (data.x - dragInfoRef.current.startX) / MM_PX_UNIT;
    const dy = (data.y - dragInfoRef.current.startY) / MM_PX_UNIT;
    const maxW = parseFloat(layout.labelW) || 100;
    const maxH = parseFloat(layout.labelH) || 50;
    let wentOut = false;

    setItems((prev) => prev.map((item) => {
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
          
          return { 
            ...item, 
            x: nextX, 
            y: nextY 
          };
        }
      }
      return item;
    }));
    
    if (wentOut) {
      dragInfoRef.current.hasAlertedBounds = true;
    }
  };

  const handleDragStop = () => {
    setTimeout(() => { 
      dragInfoRef.current.isDragging = false; 
    }, 100);
    
    if (dragInfoRef.current.hasAlertedBounds) {
      showAlert("경고", "warning", "개체가 캔버스 영역을 벗어날 수 없습니다.");
      dragInfoRef.current.hasAlertedBounds = false; 
    }
    
    setItems((prev) => prev.map((item) => {
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
        
        return { 
          ...item, 
          x: finalX, 
          y: finalY 
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
      setSelectedIds((prev) => prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]);
    } else {
      setSelectedIds([id]);
      if (targetItem?.id !== id) {
        setSelectedCells([]); 
      }
    }
  };

  const updateItem = (id, fieldOrObj, value) => {
    setItems((prev) => prev.map((item) => {
      if (item.id === id) {
        if (typeof fieldOrObj === 'object') {
          return { ...item, ...fieldOrObj };
        }
        return { ...item, [fieldOrObj]: value };
      }
      return item;
    }));
  };

  const modifyTableStructure = (tableId, action, targetIndex) => {
    setItems((prev) => prev.map((item) => {
      if (item.id !== tableId || item.type !== 'table') return item;
      
      let { rows, cols, cells } = item;
      let newCells = [...cells];

      if (action === 'insert-row') {
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
        rows += 1;
      } 
      else if (action === 'delete-row') {
        if (rows <= 1) {
          showAlert('안내', 'warning', '최소 1개의 행은 유지해야 합니다.');
          return item;
        }
        newCells = newCells
          .filter(c => c.row !== targetIndex)
          .map(c => {
            if (c.row > targetIndex) return { ...c, row: c.row - 1 };
            if (c.row < targetIndex && c.row + (c.rowSpan || 1) > targetIndex) {
              return { ...c, rowSpan: (c.rowSpan || 1) - 1 };
            }
            return c;
          });
        rows -= 1;
      } 
      else if (action === 'insert-col') {
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
        cols += 1;
      } 
      else if (action === 'delete-col') {
        if (cols <= 1) {
          showAlert('안내', 'warning', '최소 1개의 열은 유지해야 합니다.');
          return item;
        }
        newCells = newCells
          .filter(c => c.col !== targetIndex)
          .map(c => {
            if (c.col > targetIndex) return { ...c, col: c.col - 1 };
            if (c.col < targetIndex && c.col + (c.colSpan || 1) > targetIndex) {
              return { ...c, colSpan: (c.colSpan || 1) - 1 };
            }
            return c;
          });
        cols -= 1;
      }

      return { 
        ...item, 
        rows, 
        cols, 
        cells: newCells 
      };
    }));

    if (action.startsWith('delete')) {
      setSelectedCells([]); 
    }
  };

  const updateTableCell = (id, row, col, updates) => {
    setItems(prev => prev.map(item => {
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
            return { 
              ...cell, 
              ...safeUpdates 
            };
          }
          return cell;
        });
        return { 
          ...item, 
          cells: newCells 
        };
      }
      return item;
    }));
  };

  const handleMergeCells = () => {
    if (!targetItem || targetItem.type !== 'table' || selectedCells.length < 2) return;

    const minRow = Math.min(...selectedCells.map(c => c.row));
    const maxRow = Math.max(...selectedCells.map(c => c.row));
    const minCol = Math.min(...selectedCells.map(c => c.col));
    const maxCol = Math.max(...selectedCells.map(c => c.col));

    const rowSpan = maxRow - minRow + 1;
    const colSpan = maxCol - minCol + 1;

    setItems((prev) => prev.map((item) => {
      if (item.id === targetItem.id) {
        const mergedCells = item.cells.map(cell => {
          if (cell.row === minRow && cell.col === minCol) {
            return { 
              ...cell, 
              rowSpan: rowSpan, 
              colSpan: colSpan 
            };
          }
          if (cell.row >= minRow && cell.row <= maxRow && cell.col >= minCol && cell.col <= maxCol) {
            return { 
              ...cell, 
              rowSpan: 1, 
              colSpan: 1 
            };
          }
          return cell;
        });
        return { 
          ...item, 
          cells: mergedCells 
        };
      }
      return item;
    }));

    setSelectedCells([{ 
      itemId: targetItem.id, 
      row:    minRow, 
      col:    minCol 
    }]);
    
    showAlert("병합 완료", "success", "선택된 영역이 성공적으로 병합되었습니다.");
  };

  const handleUnmergeCells = () => {
    if (!targetItem || targetItem.type !== 'table' || selectedCells.length !== 1) return;

    const targetCell = targetItem.cells.find(c => c.row === selectedCells[0].row && c.col === selectedCells[0].col);
    if (!targetCell || ((targetCell.rowSpan || 1) <= 1 && (targetCell.colSpan || 1) <= 1)) return;

    setItems((prev) => prev.map((item) => {
      if (item.id === targetItem.id) {
        const unmergedCells = item.cells.map(cell => {
          if (cell.row === targetCell.row && cell.col === targetCell.col) {
            return { 
              ...cell, 
              rowSpan: 1, 
              colSpan: 1 
            };
          }
          return cell;
        });
        return { 
          ...item, 
          cells: unmergedCells 
        };
      }
      return item;
    }));
    
    showAlert("병합 해제", "success", "병합이 정상적으로 해제되었습니다.");
  };

  const deleteSelectedItems = useCallback(() => {
    if (selectedIds.length > 0) {
      setItems((prev) => prev.filter((i) => !selectedIds.includes(i.id)));
      setSelectedIds([]);
      setSelectedCells([]);
    }
  }, [selectedIds]);

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      const maxW = parseFloat(layout.labelW) || 100;
      const maxH = parseFloat(layout.labelH) || 50;

      if (isResizing && selectedIds.length === 1) {
        const item = items.find((i) => i.id === selectedIds[0]);
        if (!item) return;
        
        const currentPos = getMmPos(e);
        let newW = applySnap(currentPos.x - (parseFloat(item.x)||0), item.useSnap);
        let newH = applySnap(currentPos.y - (parseFloat(item.y)||0), item.useSnap);

        if ((parseFloat(item.x)||0) + newW > maxW) newW = maxW - (parseFloat(item.x)||0);
        if ((parseFloat(item.y)||0) + newH > maxH) newH = maxH - (parseFloat(item.y)||0);

        if (item.type === 'line') {
           updateItem(item.id, { 
             width:  Math.max(0.1, newW), 
             height: Math.max(0.1, newH) 
           });
        } else if (item.type === 'qrcode') {
           const availX = maxW - (parseFloat(item.x)||0); 
           const availY = maxH - (parseFloat(item.y)||0);
           let size = Math.max(0.1, Math.max(newW, newH));
           size = Math.min(size, availX, availY);
           updateItem(item.id, { 
             width:  size, 
             height: size 
           });
        } else {
           updateItem(item.id, { 
             width:  Math.max(0.1, newW), 
             height: Math.max(0.1, newH) 
           });
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
    drawStart, panStart, deleteSelectedItems, activeTool, layout
  ]);

  const handleMouseDownCanvas = (e) => {
    if (e.target === canvasRef.current || e.target === scrollContainerRef.current || e.target === scrollContainerRef.current.firstChild) {
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
    
    if (activeTool === 'select' || isResizing) return;
    
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
        label:                   `${activeTool}_${items.length + 1}`,
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
        borderWidth:             0.5, // 기본 선 두께
        transparent:             activeTool === 'line' ? false : true,
        fill:                    '#ffffff',
        stroke:                  '#000000', // ★ 신규 객체 생성 시 선 색상은 무조건 검은색 적용
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
        cells:                   activeTool === 'table' ? [
           { row: 0, col: 0, rowSpan: 1, colSpan: 1, cellType: 'text', content: 'TEXT', dataId: '', prefix: '', suffix: '', showPrefixSuffixOnLabel: true },
           { row: 0, col: 1, rowSpan: 1, colSpan: 1, cellType: 'text', content: 'TEXT', dataId: '', prefix: '', suffix: '', showPrefixSuffixOnLabel: true },
           { row: 1, col: 0, rowSpan: 1, colSpan: 1, cellType: 'text', content: 'TEXT', dataId: '', prefix: '', suffix: '', showPrefixSuffixOnLabel: true },
           { row: 1, col: 1, rowSpan: 1, colSpan: 1, cellType: 'text', content: 'TEXT', dataId: '', prefix: '', suffix: '', showPrefixSuffixOnLabel: true }
        ] : undefined
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
              showPrefixSuffixOnLabel: true
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
          cells:        newCells
        };

        setItems([newTableItem]); 
        setTemplateName(file.name);
        showAlert("파싱 완료", "success", "엑셀의 데이터 영역만 추출하여 표를 생성했습니다.");

      } catch (error) {
        showAlert("오류", "error", "엑셀 파싱 중 오류가 발생했습니다. (.xlsx 권장)");
      }
    };
    reader.readAsArrayBuffer(file); 
    excelLayoutInputRef.current.value = null; 
  };

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
        setLayout(json.layout || { labelW: '100', labelH: '50', delimiter: '', excelMapping: {} }); 
        setItems(json.items || []);
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
    reader.onload = (ev) => updateItem(selectedIds[0], 'src', ev.target.result);
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
        <Tooltip title="선택 (Del삭제 / Shift다중)" placement="right">
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
                margin:     'auto', 
                position:   'relative', 
                width:      `${(parseFloat(layout.labelW)||100) * MM_PX_UNIT * zoom}px`, 
                height:     `${(parseFloat(layout.labelH)||50) * MM_PX_UNIT * zoom}px`, 
                transition: 'width 0.1s, height 0.1s' 
              }}
            >
              <Box 
                ref={canvasRef} 
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
                  
                  const hiddenCells = new Set();
                  if (item.type === 'table' && item.cells) {
                    item.cells.forEach(c => {
                      if ((c.rowSpan || 1) > 1 || (c.colSpan || 1) > 1) {
                        for (let r = 0; r < (c.rowSpan || 1); r++) {
                          for (let col = 0; col < (c.colSpan || 1); col++) {
                            if (r === 0 && col === 0) continue;
                            hiddenCells.add(`${c.row + r}_${c.col + col}`);
                          }
                        }
                      }
                    });
                  }

                  return (
                    <Draggable 
                      key={item.id} 
                      nodeRef={nodeRefs.current[item.id]} 
                      disabled={activeTool !== 'select' || isResizing || isPanning || !isSel} 
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
                            // ★ 얇은 선(Line)이 브라우저에서 투명해지는 것을 막기 위해 최소 높이 1px 보장
                            height:          isTextType ? 'max-content' : `${parseFloat(item.height)||0}mm`, 
                            minHeight:       item.type === 'line' ? '1px' : undefined,
                            position:        'relative' 
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
                          
                          {/* 렌더링: 기본 도형 개체 (SVG 중앙 기준 선 두께 적용) */}
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
                          
                          {/* ★ 선(Line) SVG 렌더링 도입으로 0.1mm 소수점 두께 완벽 지원 및 투명화 현상 방지 */}
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

                          {/* ★ 표(Table) 렌더링: CSS border에서 SVG 오버레이로 완전히 교체 (0.1mm 두께 및 비대화 현상 완벽 해결) */}
                          {item.type === 'table' && (() => {
                            const bw = item.borderWidth !== undefined && item.borderWidth !== '' ? parseFloat(item.borderWidth) : 0.5;
                            const strokeColor = item.stroke || '#000000';
                            const showBorders = item.showBorder !== false && bw > 0;
                            
                            return (
                              <Box 
                                sx={{ 
                                  width:           '100%', 
                                  height:          '100%', 
                                  position:        'relative',
                                  outline:         isSel && !showBorders ? '1px dashed rgba(0,0,0,0.3)' : 'none',
                                }}
                              >
                                {/* 표 배경색 (테두리 영향 안 받음) */}
                                <Box sx={{ width: '100%', height: '100%', backgroundColor: item.transparent === false ? (item.fill || '#ffffff') : 'transparent', position: 'absolute', top: 0, left: 0 }} />

                                {/* ★ SVG 선 오버레이 (셀 겹침에 의한 굵기 비대화가 전혀 없고, 0.1mm 소수점까지 100% 동일하게 렌더링됨) */}
                                {showBorders && (
                                  <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible', zIndex: 2 }}>
                                    {item.cells?.map((cell, idx) => {
                                      if (hiddenCells.has(`${cell.row}_${cell.col}`)) return null;
                                      return (
                                        <rect 
                                          key={idx}
                                          x={`${(cell.col / (item.cols || 1)) * 100}%`}
                                          y={`${(cell.row / (item.rows || 1)) * 100}%`}
                                          width={`${((cell.colSpan || 1) / (item.cols || 1)) * 100}%`}
                                          height={`${((cell.rowSpan || 1) / (item.rows || 1)) * 100}%`}
                                          fill="none"
                                          stroke={strokeColor}
                                          strokeWidth={`${bw}mm`}
                                        />
                                      );
                                    })}
                                  </svg>
                                )}

                                {/* 표 내부 텍스트 및 바코드 셀들 (CSS Border 전부 제거) */}
                                <Box 
                                  sx={{ 
                                    width:               '100%', 
                                    height:              '100%', 
                                    display:             'grid', 
                                    gridTemplateRows:    `repeat(${item.rows || 1}, 1fr)`, 
                                    gridTemplateColumns: `repeat(${item.cols || 1}, 1fr)`, 
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
                                    
                                    return (
                                      <Box 
                                        key={idx} 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (activeTool === 'select') {
                                            setSelectedIds([item.id]);
                                            const newCell = { 
                                              itemId: item.id, 
                                              row:    cell.row, 
                                              col:    cell.col 
                                            };
                                            
                                            if (e.shiftKey) {
                                              setSelectedCells(prev => {
                                                const exists = prev.find(c => c.itemId === item.id && c.row === cell.row && c.col === cell.col);
                                                if (exists) {
                                                  return prev.filter(c => !(c.itemId === item.id && c.row === cell.row && c.col === cell.col));
                                                }
                                                return [...prev, newCell];
                                              });
                                            } else {
                                              setSelectedCells([newCell]);
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
                                        {cell.cellType === 'barcode' ? (
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
                                               format={cell.barcodeType || 'CODE128'} 
                                               width={2} 
                                               height={100} 
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
                                              fontSize:   `${parseFloat(item.fontSize)||10}pt`, 
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
                   onChange={(e) => updateItem(selectedIds[0], 'label', e.target.value)} 
                 />
               )}

               {/* ★ 양방향 동기화 마스터 편집창 */}
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
                     onBlur={() => setIsMasterFocused(false)}
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
                   {/* ★ 레이어 순서 (Z-Index) 제어 */}
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

                   {/* ★ 모양 스타일 제어 (배경색/선두께) */}
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
                               onChange={(e) => updateItem(selectedIds[0], 'stroke', e.target.value)}
                               style={{ width: 30, height: 30, padding: 0, border: '1px solid #ccc', cursor: 'pointer' }}
                             />
                             <TextField 
                               label="선 두께(mm)" 
                               type="number" 
                               size="small" 
                               value={targetItem?.borderWidth ?? ''} 
                               onChange={(e) => updateItem(selectedIds[0], 'borderWidth', e.target.value)}
                               onBlur={(e) => {
                                 let val = parseFloat(e.target.value);
                                 // ★ 완전히 지웠을 땐 0(선 숨김)을 허용하고, 이상한 값이면 0.5 복구
                                 if(isNaN(val) || val < 0) val = 0; 
                                 updateItem(selectedIds[0], 'borderWidth', String(val));
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
                                 onChange={(e) => updateItem(selectedIds[0], 'fill', e.target.value)}
                                 style={{ width: 30, height: 30, padding: 0, border: '1px solid #ccc', cursor: 'pointer' }}
                               />
                             )}
                             <FormControlLabel 
                               control={
                                 <Checkbox 
                                   size="small" 
                                   checked={targetItem?.transparent !== false} 
                                   onChange={(e) => updateItem(selectedIds[0], 'transparent', e.target.checked)} 
                                 />
                               }
                               label={<Typography variant="caption" fontWeight="bold">채우기 없음(투명)</Typography>}
                               sx={{ ml: targetItem?.transparent === false ? 1 : 0 }}
                             />
                           </Stack>
                         </Box>
                       )}

                       {/* ★ 선(Line) 두께 및 색상 제어 (입력 리셋 버그 픽스 및 최솟값 허용) */}
                       {targetItem?.type === 'line' && (
                         <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                           <Typography variant="caption" fontWeight="bold">선 색상</Typography>
                           <input 
                             type="color" 
                             value={targetItem?.stroke || '#000000'} 
                             onChange={(e) => updateItem(selectedIds[0], 'stroke', e.target.value)}
                             style={{ width: 30, height: 30, padding: 0, border: '1px solid #ccc', cursor: 'pointer' }}
                           />
                           <TextField 
                             label="선 두께(mm)" 
                             type="number" 
                             size="small" 
                             value={targetItem?.height ?? ''} 
                             onChange={(e) => updateItem(selectedIds[0], 'height', e.target.value)}
                             onBlur={(e) => {
                               let val = parseFloat(e.target.value);
                               // ★ 0.1 이하 입력 허용. 아예 지웠을 때만 0.5로 복구
                               if(isNaN(val) || val <= 0) val = 0.5; 
                               updateItem(selectedIds[0], 'height', String(val));
                             }}
                             inputProps={{ step: 0.1, min: 0.1 }}
                             sx={{ width: 100, ml: 1 }}
                           />
                         </Stack>
                       )}

                       {/* 표 전체 테두리 선 표시 제어 */}
                       {targetItem?.type === 'table' && (
                         <FormControlLabel 
                           control={
                             <Checkbox 
                               size="small" 
                               checked={targetItem.showBorder !== false} 
                               onChange={(e) => updateItem(targetItem.id, 'showBorder', e.target.checked)} 
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
                          value={parseFloat(targetItem?.rotate) || 0} 
                          min={0} 
                          max={360} 
                          onChange={(e, v) => updateItem(selectedIds[0], 'rotate', String(v))} 
                        />
                        <TextField 
                          size="small" 
                          variant="outlined" 
                          type="number" 
                          value={targetItem?.rotate ?? ''} 
                          onChange={(e) => updateItem(selectedIds[0], 'rotate', e.target.value)} 
                          onBlur={(e) => {
                            let val = parseFloat(e.target.value);
                            if(isNaN(val)) val = 0;
                            updateItem(selectedIds[0], 'rotate', String(val));
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
                       onChange={(e) => updateItem(selectedIds[0], 'x', e.target.value)} 
                       onBlur={(e) => {
                         let val = parseFloat(e.target.value);
                         if(isNaN(val) || val < 0) val = 0;
                         const maxW = parseFloat(layout.labelW) || 100;
                         const bbox = getRealBBox(targetItem);
                         if(val + bbox.w > maxW) val = maxW - bbox.w;
                         updateItem(selectedIds[0], 'x', String(val));
                       }}
                       inputProps={{ step: 0.1 }}
                     />
                     <TextField 
                       label="Y위치(mm)" 
                       type="number" 
                       size="small" 
                       value={targetItem?.y ?? ''} 
                       onChange={(e) => updateItem(selectedIds[0], 'y', e.target.value)} 
                       onBlur={(e) => {
                         let val = parseFloat(e.target.value);
                         if(isNaN(val) || val < 0) val = 0;
                         const maxH = parseFloat(layout.labelH) || 50;
                         const bbox = getRealBBox(targetItem);
                         if(val + bbox.h > maxH) val = maxH - bbox.h;
                         updateItem(selectedIds[0], 'y', String(val));
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
                           onChange={(e) => updateItem(selectedIds[0], 'width', e.target.value)} 
                           onBlur={(e) => {
                             let val = parseFloat(e.target.value);
                             if(isNaN(val) || val < 0.1) val = 10;
                             const maxW = parseFloat(layout.labelW) || 100;
                             const cx = parseFloat(targetItem.x) || 0;
                             if(cx + val > maxW) val = maxW - cx;
                             updateItem(selectedIds[0], 'width', String(val));
                             updateItem(selectedIds[0], 'height', String(val));
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
                             onChange={(e) => updateItem(selectedIds[0], 'width', e.target.value)} 
                             onBlur={(e) => {
                               let val = parseFloat(e.target.value);
                               if(isNaN(val) || val < 0.1) val = 10;
                               const maxW = parseFloat(layout.labelW) || 100;
                               const cx = parseFloat(targetItem.x) || 0;
                               if(cx + val > maxW) val = maxW - cx;
                               updateItem(selectedIds[0], 'width', String(val));
                             }}
                             inputProps={{ step: 0.1, min: 0.1 }}
                           />
                           {targetItem?.type !== 'line' && (
                             <TextField 
                               label="높이(H)" 
                               type="number" 
                               size="small" 
                               value={targetItem?.height ?? ''} 
                               onChange={(e) => updateItem(selectedIds[0], 'height', e.target.value)} 
                               onBlur={(e) => {
                                 let val = parseFloat(e.target.value);
                                 if(isNaN(val) || val < 0.1) val = 10;
                                 const maxH = parseFloat(layout.labelH) || 50;
                                 const cy = parseFloat(targetItem.y) || 0;
                                 if(cy + val > maxH) val = maxH - cy;
                                 updateItem(selectedIds[0], 'height', String(val));
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

                   {/* ★ 표(Table) 전용 셀 및 구조 편집(행/열/병합) 제어 기능 */}
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

                       {/* ★ 선택된 셀에 따른 조건부 렌더링 */}
                       {selectedCells.length > 0 && selectedCells[0].itemId === targetItem.id && (() => {
                         const isMultiSelected = selectedCells.length > 1;
                         
                         // [다중 선택 상태]: 병합 버튼 표시
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
                                 Shift 키를 누른 채 캔버스 표의 셀을 클릭하면 다중 선택이 가능합니다.
                               </Typography>
                             </MuiPaper>
                           );
                         }

                         // [단일 셀 선택 상태]: 행/열 추가삭제 및 병합해제, 속성 표시
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

                             {/* 병합 해제 및 구조 편집 버튼들 */}
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
                                 onClick={() => modifyTableStructure(targetItem.id, 'delete-row', activeCell.row)}
                               >
                                 행 삭제
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
                                 onClick={() => modifyTableStructure(targetItem.id, 'delete-col', activeCell.col)}
                               >
                                 열 삭제
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
                                 onChange={(e) => updateTableCell(targetItem.id, activeCell.row, activeCell.col, { cellType: e.target.value })}
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
                                 onChange={(e) => updateTableCell(targetItem.id, activeCell.row, activeCell.col, { dataId: e.target.value })} 
                                 sx={{ mt: 1 }}
                               />
                             )}
                             {activeCell.cellType === 'date' && (
                               <TextField 
                                 label="날짜 포맷 (예: YYYY-MM-DD)" 
                                 size="small" 
                                 fullWidth 
                                 value={activeCell.content || 'YYYY-MM-DD'} 
                                 onChange={(e) => updateTableCell(targetItem.id, activeCell.row, activeCell.col, { content: e.target.value })} 
                               />
                             )}
                             {activeCell.cellType === 'text' && (
                               <TextField 
                                 label="텍스트 내용" 
                                 size="small" 
                                 fullWidth 
                                 multiline 
                                 value={activeCell.content || ''} 
                                 onChange={(e) => updateTableCell(targetItem.id, activeCell.row, activeCell.col, { content: e.target.value })} 
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
                                     onChange={(e) => updateTableCell(targetItem.id, activeCell.row, activeCell.col, { barcodeType: e.target.value })}
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
                                       onChange={(e) => updateTableCell(targetItem.id, activeCell.row, activeCell.col, { displayValue: e.target.checked })} 
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
                                   onChange={(e) => updateTableCell(targetItem.id, activeCell.row, activeCell.col, { qrErrorLevel: e.target.value })}
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
                                     onChange={(e) => updateTableCell(targetItem.id, activeCell.row, activeCell.col, { prefix: e.target.value })} 
                                   />
                                   <TextField 
                                     label="접미사(Suffix)" 
                                     size="small" 
                                     value={activeCell.suffix || ''} 
                                     onChange={(e) => updateTableCell(targetItem.id, activeCell.row, activeCell.col, { suffix: e.target.value })} 
                                   />
                                 </Stack>
                                 <FormControlLabel 
                                   control={
                                     <Checkbox 
                                       size="small" 
                                       checked={activeCell.showPrefixSuffixOnLabel !== false} 
                                       onChange={(e) => updateTableCell(targetItem.id, activeCell.row, activeCell.col, { showPrefixSuffixOnLabel: e.target.checked })} 
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

                   {targetItem?.type === 'barcode' && (
                     <>
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
                       <FormControlLabel 
                         control={
                           <Checkbox 
                             size="small" 
                             checked={targetItem?.displayValue !== false} 
                             onChange={(e) => updateItem(selectedIds[0], 'displayValue', e.target.checked)} 
                           />
                         } 
                         label={<Typography variant="caption" fontWeight="bold">바코드 텍스트(HRI) 표시</Typography>} 
                       />
                     </>
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
                   
                   {/* 텍스트 요소 및 표(Table) 전용: 폰트 사이즈 및 스타일 제어 */}
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
                            label="폰트(pt)" 
                            type="number" 
                            size="small" 
                            value={targetItem?.fontSize ?? ''} 
                            onChange={(e) => updateItem(selectedIds[0], 'fontSize', e.target.value)} 
                            onBlur={(e) => {
                              let val = parseFloat(e.target.value);
                              if(isNaN(val) || val < 1) val = 10;
                              updateItem(selectedIds[0], 'fontSize', String(val));
                            }}
                            inputProps={{ step: 0.5, min: 1 }}
                          />
                          <Tooltip title="굵게 (Bold)">
                            <IconButton 
                              size="small" 
                              color={targetItem?.fontWeight === 'bold' ? 'primary' : 'default'} 
                              onClick={() => updateItem(selectedIds[0], 'fontWeight', targetItem?.fontWeight === 'bold' ? 'normal' : 'bold')}
                            >
                              <FormatBoldIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="기울임 (Italic)">
                            <IconButton 
                              size="small" 
                              color={targetItem?.fontStyle === 'italic' ? 'primary' : 'default'} 
                              onClick={() => updateItem(selectedIds[0], 'fontStyle', targetItem?.fontStyle === 'italic' ? 'normal' : 'italic')}
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
                           onChange={(e) => updateItem(selectedIds[0], 'prefix', e.target.value)} 
                         />
                         <TextField 
                           label="접미사(Suffix)" 
                           size="small" 
                           value={targetItem?.suffix || ''} 
                           onChange={(e) => updateItem(selectedIds[0], 'suffix', e.target.value)} 
                         />
                       </Stack>
                       <FormControlLabel 
                         control={
                           <Checkbox 
                             size="small" 
                             checked={targetItem?.showPrefixSuffixOnLabel !== false} 
                             onChange={(e) => updateItem(selectedIds[0], 'showPrefixSuffixOnLabel', e.target.checked)} 
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
                       onChange={(e) => updateItem(selectedIds[0], 'content', e.target.value)} 
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
            {/* ★ 레이어 순서도 캔버스의 Z-Index 방향(Index 0 = 맨 위)에 맞게 렌더링되도록 유지 */}
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
                    onClick={() => { 
                      setSelectedIds([item.id]); 
                      setSelectedCells([]); 
                    }} 
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
                    setLayout({ 
                      ...layout, 
                      labelW: t.LabelW, 
                      labelH: t.LabelH, 
                      ...(raw[0].layout || {}) 
                    }); 
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