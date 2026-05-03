/**
 * @file        useDesignEngine.js
 * @description 라벨 디자인 캔버스의 조작을 총괄하는 코어 엔진
 * - [기능추가] 신규 표(Table)를 캔버스에 생성할 때, 각 셀마다 상/하/좌/우 테두리 상태 기본값(true) 부여
 * - [포맷팅] 프로젝트 규칙에 따라 모든 Object 속성, 파라미터, Return 객체, 이벤트 핸들러 로직의 줄바꿈 및 수직 정렬 완벽 적용
 */

import { 
  useState, 
  useRef, 
  useEffect, 
  useMemo, 
  useCallback 
} from 'react';

import { showAlert } from '../../../../utils/swal';

const MM_PX_UNIT = 3.78; 

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

const useDesignEngine = ({ 
  items, 
  setItems, 
  updateItems, 
  updateItem, 
  selectedIds, 
  setSelectedIds, 
  selectedCells, 
  setSelectedCells, 
  layout, 
  takeSnapshot, 
  handleUndo, 
  handleRedo 
}) => {

  const [zoom, setZoom]                         = useState(1.5); 
  const [showGrid, setShowGrid]                 = useState(true);     
  const [snapToGrid, setSnapToGrid]             = useState(true); 
  const [gridSize, setGridSize]                 = useState('2');
  const safeGridSize                            = parseFloat(gridSize) > 0 ? parseFloat(gridSize) : 2;
  
  const [activeTool, setActiveTool]             = useState('select'); 
  const [isDrawing, setIsDrawing]               = useState(false);
  const [isResizing, setIsResizing]             = useState(false);
  const [isPanning, setIsPanning]               = useState(false);
  
  const [tableResizeData, setTableResizeData]   = useState(null);
  
  const [drawStart, setDrawStart]               = useState({ x: 0, y: 0 });
  const [panStart, setPanStart]                 = useState({ x: 0, y: 0 });
  
  const [tempRect, setTempRect]                 = useState(null);
  const [expandedTableIds, setExpandedTableIds] = useState([]);
  const [masterInputText, setMasterInputText]   = useState('');
  const [isMasterFocused, setIsMasterFocused]   = useState(false);

  const canvasRef           = useRef(null);
  const scrollContainerRef  = useRef(null);
  const nodeRefs            = useRef({});
  const hRulerRef           = useRef(null);
  const vRulerRef           = useRef(null);
  const hGuideRef           = useRef(null);
  const vGuideRef           = useRef(null);
  
  const lastSelectedIdRef   = useRef(null);
  const lastSelectedCellRef = useRef(null);
  
  const dragInfoRef = useRef({ 
    startX:           0, 
    startY:           0, 
    isDragging:       false, 
    initialItems:     [], 
    hasAlertedBounds: false 
  });
  
  const itemsRef       = useRef(items);
  const selectedIdsRef = useRef(selectedIds);

  useEffect(() => { 
    itemsRef.current = items; 
  }, [items]);
  
  useEffect(() => { 
    selectedIdsRef.current = selectedIds; 
  }, [selectedIds]);

  const refs = {
    canvasRef,
    scrollContainerRef,
    nodeRefs,
    hRulerRef,
    vRulerRef,
    hGuideRef,
    vGuideRef,
    lastSelectedIdRef,
    lastSelectedCellRef,
    dragInfoRef,
    itemsRef,
    selectedIdsRef
  };

  const drawRulers = useCallback(() => {
    if (!hRulerRef.current || !vRulerRef.current || !canvasRef.current || !scrollContainerRef.current) return;

    const hCtx = hRulerRef.current.getContext('2d');
    const vCtx = vRulerRef.current.getContext('2d');
    
    const scrollContainer = scrollContainerRef.current;
    const canvasEl        = canvasRef.current; 
    
    const scrollRect = scrollContainer.getBoundingClientRect();
    const canvasRect = canvasEl.getBoundingClientRect();

    const offsetX = canvasRect.left - scrollRect.left;
    const offsetY = canvasRect.top - scrollRect.top;

    const hWidth  = scrollRect.width;
    const hHeight = 20;
    const vWidth  = 20;
    const vHeight = scrollRect.height;

    const dpr = window.devicePixelRatio || 1;
    
    hRulerRef.current.width  = hWidth * dpr;
    hRulerRef.current.height = hHeight * dpr;
    hCtx.scale(dpr, dpr);

    vRulerRef.current.width  = vWidth * dpr;
    vRulerRef.current.height = vHeight * dpr;
    vCtx.scale(dpr, dpr);

    hCtx.clearRect(0, 0, hWidth, hHeight);
    vCtx.clearRect(0, 0, vWidth, vHeight);

    hCtx.beginPath();
    vCtx.beginPath();
    
    const isDark         = document.body.style.backgroundColor !== 'rgb(241, 245, 249)' && document.body.style.backgroundColor !== '';
    const rulerLineColor = isDark ? '#64748b' : '#999999';
    const rulerTextColor = isDark ? '#94a3b8' : '#666666';

    hCtx.strokeStyle  = rulerLineColor;
    vCtx.strokeStyle  = rulerLineColor;
    hCtx.fillStyle    = rulerTextColor;
    vCtx.fillStyle    = rulerTextColor;
    hCtx.font         = '9px "Segoe UI", Arial, sans-serif';
    vCtx.font         = '9px "Segoe UI", Arial, sans-serif';
    hCtx.textAlign    = 'center';
    hCtx.textBaseline = 'top';

    vCtx.textAlign    = 'right';
    vCtx.textBaseline = 'middle';

    const mmPx = MM_PX_UNIT * zoom;
    
    const startMmx = Math.floor(-offsetX / mmPx);
    const endMmx   = startMmx + Math.ceil(hWidth / mmPx);

    for (let i = startMmx - 5; i <= endMmx + 5; i++) {
       const x = offsetX + (i * mmPx);
       if (x < -10 || x > hWidth + 10) continue;

       if (i % 10 === 0) {
         hCtx.moveTo(x, 0); 
         hCtx.lineTo(x, 20);
         if (i >= 0) {
           hCtx.fillText((i / 10).toString(), x + 2, 2);
         }
       } else if (i % 5 === 0) {
         hCtx.moveTo(x, 10); 
         hCtx.lineTo(x, 20);
       } else {
         hCtx.moveTo(x, 15); 
         hCtx.lineTo(x, 20);
       }
    }

    const startMmy = Math.floor(-offsetY / mmPx);
    const endMmy   = startMmy + Math.ceil(vHeight / mmPx);

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
  }, [zoom, layout.labelW, layout.labelH, hRulerRef, vRulerRef, canvasRef, scrollContainerRef]);

  useEffect(() => {
    const timer = setTimeout(() => drawRulers(), 50);
    window.addEventListener('resize', drawRulers);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', drawRulers);
    };
  }, [drawRulers, layout.labelW, layout.labelH]);

  const handleToolChange = (tool) => {
    setActiveTool(tool);
    if (tool !== 'select') {
      setSelectedIds([]); 
      setSelectedCells([]); 
    }
  };

  const toggleTableExpand = (e, id) => {
    e.stopPropagation();
    setExpandedTableIds((prev) => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const applySnap = (val, forceSnap) => {
    if (!(showGrid && snapToGrid && parseFloat(gridSize) > 0) || !forceSnap) {
      return parseFloat(Number(val).toFixed(1));
    }
    return Math.round(val / safeGridSize) * safeGridSize;
  };

  const getRealBBox = (item) => {
    if (['text', 'data', 'date'].includes(item.type)) {
      const el = nodeRefs.current[item.id]?.current;
      if (el) {
        const rect  = el.getBoundingClientRect();
        const realW = rect.width / zoom / MM_PX_UNIT;
        const realH = rect.height / zoom / MM_PX_UNIT;
        
        return { 
          x: parseFloat(item.x) || 0, 
          y: parseFloat(item.y) || 0, 
          w: realW, 
          h: realH 
        };
      }
    }
    
    return { 
      x:      parseFloat(item.x) || 0, 
      y:      parseFloat(item.y) || 0, 
      w:      parseFloat(item.width) || 0, 
      h:      parseFloat(item.height) || 0 
    };
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

  const alignSelectedItems = (type) => {
    if (selectedIds.length < 2) return;
    
    const selectedItems = items.filter((i) => selectedIds.includes(i.id));
    const bboxes        = selectedItems.map(item => ({ item, bbox: getRealBBox(item) }));
    
    const minX       = Math.min(...bboxes.map(b => b.bbox.x));
    const maxX       = Math.max(...bboxes.map(b => b.bbox.x + b.bbox.w));
    const minY       = Math.min(...bboxes.map(b => b.bbox.y));
    const maxY       = Math.max(...bboxes.map(b => b.bbox.y + b.bbox.h));
    const boxCenterX = (minX + maxX) / 2;
    const boxCenterY = (minY + maxY) / 2;

    if (type === 'h-distribute' || type === 'v-distribute') {
      if (selectedItems.length < 3) return; 
      
      const isH       = type === 'h-distribute';
      const sorted    = [...bboxes].sort((a, b) => isH ? a.bbox.x - b.bbox.x : a.bbox.y - b.bbox.y);
      const first     = sorted[0];
      const last      = sorted[sorted.length - 1];
      const totalSize = sorted.reduce((acc, curr) => acc + (isH ? curr.bbox.w : curr.bbox.h), 0);
      
      const availableSpace = (isH ? (last.bbox.x + last.bbox.w) - first.bbox.x : (last.bbox.y + last.bbox.h) - first.bbox.y) - totalSize;
      const gap            = availableSpace / (sorted.length - 1);
      
      const targetPos  = {};
      let   currentPos = isH ? first.bbox.x : first.bbox.y;
      
      sorted.forEach((b, idx) => {
        if (idx === 0) { 
          targetPos[b.item.id] = isH ? b.item.x : b.item.y; 
          currentPos += (isH ? b.bbox.w : b.bbox.h) + gap; 
        } 
        else if (idx === sorted.length - 1) { 
          targetPos[b.item.id] = isH ? b.item.x : b.item.y; 
        } 
        else { 
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
        case 'left':     
          newX = minX; 
          break;
        case 'right':    
          newX = maxX - bbox.w; 
          break;
        case 'top':      
          newY = minY; 
          break;
        case 'bottom':   
          newY = maxY - bbox.h; 
          break;
        case 'h-center': 
          newX = boxCenterX - (bbox.w / 2); 
          break;
        case 'v-center': 
          newY = boxCenterY - (bbox.h / 2); 
          break;
        default: 
          break;
      }
      
      return { 
        ...item, 
        x: newX, 
        y: newY 
      };
    }), true);
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
      const [item]   = newItems.splice(index, 1);
      
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

  const deleteSelectedItems = useCallback(() => {
    const sIds = selectedIdsRef.current;
    
    if (sIds.length > 0) {
      updateItems((prev) => prev.filter((i) => !sIds.includes(i.id)), true);
      setSelectedIds([]);
      setSelectedCells([]);
    }
  }, [updateItems, setSelectedIds, setSelectedCells]);

  const editableMasterData = useMemo(() => {
    const combinedParts = [];
    let hasAnyContent   = false;
    
    items.forEach((i) => {
      if (i.type === 'data') {
        let val = i.content || '';
        if (val !== '') {
          hasAnyContent = true;
        }
        combinedParts.push(val); 
      } else if (i.type === 'table' && i.cells) {
        const hiddenCells = getHiddenCells(i); 
        i.cells.forEach(cell => {
          if (hiddenCells.has(`${cell.row}_${cell.col}`)) return;
          if (cell.cellType === 'data') {
            let val = cell.dataId || '';
            if (val !== '') {
              hasAnyContent = true;
            }
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
    const newValue  = e.target.value;
    const delimiter = layout.delimiter || '';
    let totalFields = 0;
    
    setMasterInputText(newValue); 
    
    items.forEach(i => {
      if (i.type === 'data') {
        totalFields++;
      } else if (i.type === 'table' && i.cells) {
        const hiddenCells = getHiddenCells(i); 
        i.cells.forEach(c => {
          if (!hiddenCells.has(`${c.row}_${c.col}`) && c.cellType === 'data') {
            totalFields++;
          }
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
              return { 
                ...cell, 
                dataId: partVal 
              };
            } 
            return cell; 
          });
        }
        return newItem;
      });
    }, false); 
  };

  const modifyTableStructure = (tableId, action, targetIndex, targetSpan = 1) => {
    updateItems((prev) => prev.map((item) => {
      if (item.id !== tableId || item.type !== 'table') return item;
      
      let { rows, cols, cells, width, height } = item;
      
      let newCells  = [...cells];
      let rowRatios = item.rowRatios ? [...item.rowRatios] : Array(rows).fill(100/rows);
      let colRatios = item.colRatios ? [...item.colRatios] : Array(cols).fill(100/cols);
      let newWidth  = parseFloat(width);
      let newHeight = parseFloat(height);

      if (action === 'insert-row') {
        const avgRatio = 100 / rows;
        newHeight = newHeight * ((100 + avgRatio) / 100); 
        
        newCells = newCells.map(c => {
          if (c.row >= targetIndex) {
            return { 
              ...c, 
              row: c.row + 1 
            };
          }
          if (c.row < targetIndex && c.row + (c.rowSpan || 1) > targetIndex) {
            return { 
              ...c, 
              rowSpan: (c.rowSpan || 1) + 1 
            };
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
            showPrefixSuffixOnLabel: true, 
            borderTop:               true, 
            borderRight:             true, 
            borderBottom:            true, 
            borderLeft:              true 
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
          let rSpan  = c.rowSpan || 1; 
          let cStart = c.row; 
          let cEnd   = c.row + rSpan - 1; 
          let dStart = targetIndex; 
          let dEnd   = targetIndex + targetSpan - 1;
          
          if (cEnd < dStart) { 
            updatedCells.push(c); 
          } else if (cStart > dEnd) { 
            updatedCells.push({ 
              ...c, 
              row: c.row - targetSpan 
            }); 
          } else {
            let overlapStart = Math.max(cStart, dStart); 
            let overlapEnd   = Math.min(cEnd, dEnd); 
            let overlapCount = overlapEnd - overlapStart + 1; 
            let newSpan      = rSpan - overlapCount;
            
            if (newSpan > 0) { 
              let newRow = cStart < dStart ? cStart : dStart; 
              updatedCells.push({ 
                ...c, 
                row:     newRow, 
                rowSpan: newSpan 
              }); 
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
          if (c.col >= targetIndex) {
            return { 
              ...c, 
              col: c.col + 1 
            };
          }
          if (c.col < targetIndex && c.col + (c.colSpan || 1) > targetIndex) {
            return { 
              ...c, 
              colSpan: (c.colSpan || 1) + 1 
            };
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
            showPrefixSuffixOnLabel: true, 
            borderTop:               true, 
            borderRight:             true, 
            borderBottom:            true, 
            borderLeft:              true 
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
          let cSpan  = c.colSpan || 1; 
          let cStart = c.col; 
          let cEnd   = c.col + cSpan - 1; 
          let dStart = targetIndex; 
          let dEnd   = targetIndex + targetSpan - 1;
          
          if (cEnd < dStart) { 
            updatedCells.push(c); 
          } else if (cStart > dEnd) { 
            updatedCells.push({ 
              ...c, 
              col: c.col - targetSpan 
            }); 
          } else {
            let overlapStart = Math.max(cStart, dStart); 
            let overlapEnd   = Math.min(cEnd, dEnd); 
            let overlapCount = overlapEnd - overlapStart + 1; 
            let newSpan      = cSpan - overlapCount;
            
            if (newSpan > 0) { 
              let newCol = cStart < dStart ? cStart : dStart; 
              updatedCells.push({ 
                ...c, 
                col:     newCol, 
                colSpan: newSpan 
              }); 
            }
          }
        });
        
        newCells = updatedCells;
        colRatios.splice(targetIndex, targetSpan);
        cols -= targetSpan;
      }

      const sumRow = rowRatios.reduce((a, b) => Number(a) + Number(b), 0) || 100;
      rowRatios    = rowRatios.map(r => (Number(r) / sumRow) * 100);
      
      const sumCol = colRatios.reduce((a, b) => Number(a) + Number(b), 0) || 100;
      colRatios    = colRatios.map(c => (Number(c) / sumCol) * 100);

      return { 
        ...item, 
        width:     Math.max(1, newWidth), 
        height:    Math.max(1, newHeight), 
        rows, 
        cols, 
        cells:     newCells, 
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
    }), saveSnapshot);
  };

  const handleMergeCells = () => {
    const targetItem = items.find(i => selectedIds.includes(i.id));
    
    if (!targetItem || targetItem.type !== 'table' || selectedCells.length < 2) return;
    
    const actualSelectedCells = selectedCells.map(sc => targetItem.cells.find(c => c.row === sc.row && c.col === sc.col)).filter(Boolean);
    
    if (actualSelectedCells.length < 2) return;
    
    const minRow       = Math.min(...actualSelectedCells.map(c => c.row));
    const maxRow       = Math.max(...actualSelectedCells.map(c => c.row + (c.rowSpan || 1) - 1));
    const minCol       = Math.min(...actualSelectedCells.map(c => c.col));
    const maxCol       = Math.max(...actualSelectedCells.map(c => c.col + (c.colSpan || 1) - 1));
    const finalRowSpan = maxRow - minRow + 1;
    const finalColSpan = maxCol - minCol + 1;

    updateItems((prev) => prev.map((item) => {
      if (item.id === targetItem.id) {
        const mergedCells = item.cells.map(cell => {
          if (cell.row === minRow && cell.col === minCol) { 
            return { 
              ...cell, 
              rowSpan: finalRowSpan, 
              colSpan: finalColSpan 
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
    }), true);
    
    setSelectedCells([{ 
      itemId: targetItem.id, 
      row:    minRow, 
      col:    minCol 
    }]);
    
    showAlert("병합 완료", "success", "선택된 영역이 성공적으로 병합되었습니다.");
  };

  const handleUnmergeCells = () => {
    const targetItem = items.find(i => selectedIds.includes(i.id));
    
    if (!targetItem || targetItem.type !== 'table' || selectedCells.length !== 1) return;
    
    const targetCell = targetItem.cells.find(c => c.row === selectedCells[0].row && c.col === selectedCells[0].col);
    
    if (!targetCell || ((targetCell.rowSpan || 1) <= 1 && (targetCell.colSpan || 1) <= 1)) return;

    updateItems((prev) => prev.map((item) => {
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
    }), true);
    
    showAlert("병합 해제", "success", "병합이 정상적으로 해제되었습니다.");
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      const maxW               = parseFloat(layout.labelW) || 100;
      const maxH               = parseFloat(layout.labelH) || 50;
      const currentItems       = itemsRef.current;
      const currentSelectedIds = selectedIdsRef.current;

      if (hGuideRef.current && vGuideRef.current && scrollContainerRef.current) {
        const scrollRect = scrollContainerRef.current.getBoundingClientRect();
        const mouseX     = e.clientX - scrollRect.left;
        const mouseY     = e.clientY - scrollRect.top;

        if (mouseX >= 0 && mouseX <= scrollRect.width && mouseY >= 0 && mouseY <= scrollRect.height) {
          hGuideRef.current.style.transform = `translateX(${mouseX}px)`;
          vGuideRef.current.style.transform = `translateY(${mouseY}px)`;
          hGuideRef.current.style.display   = 'block';
          vGuideRef.current.style.display   = 'block';
        } else {
          hGuideRef.current.style.display = 'none';
          vGuideRef.current.style.display = 'none';
        }
      }

      if (tableResizeData) {
        const { itemId, type, index, startX, startY, startRatios, totalW, totalH } = tableResizeData;
        const newRatios = [...startRatios];
        
        if (type === 'col') {
          const dx       = (e.clientX - startX) / zoom / MM_PX_UNIT; 
          const deltaPct = (dx / totalW) * 100;
          let newLeft    = startRatios[index] + deltaPct;
          let newRight   = startRatios[index + 1] - deltaPct;
          
          if (newLeft < 2) { 
            newRight -= (2 - newLeft); 
            newLeft   = 2; 
          }
          if (newRight < 2) { 
            newLeft  -= (2 - newRight); 
            newRight  = 2; 
          }
          
          newRatios[index]     = newLeft;
          newRatios[index + 1] = newRight;
          
          updateItems(prev => prev.map(item => 
            item.id === itemId 
              ? { ...item, colRatios: newRatios } 
              : item
          ), false);
        } else {
          const dy       = (e.clientY - startY) / zoom / MM_PX_UNIT; 
          const deltaPct = (dy / totalH) * 100;
          let newTop     = startRatios[index] + deltaPct;
          let newBottom  = startRatios[index + 1] - deltaPct;
          
          if (newTop < 2) { 
            newBottom -= (2 - newTop); 
            newTop     = 2; 
          }
          if (newBottom < 2) { 
            newTop    -= (2 - newBottom); 
            newBottom  = 2; 
          }
          
          newRatios[index]     = newTop;
          newRatios[index + 1] = newBottom;
          
          updateItems(prev => prev.map(item => 
            item.id === itemId 
              ? { ...item, rowRatios: newRatios } 
              : item
          ), false);
        }
        return; 
      }

      if (isResizing && currentSelectedIds.length === 1) {
        const item = currentItems.find((i) => i.id === currentSelectedIds[0]);
        if (!item) return;
        
        const rect       = canvasRef.current.getBoundingClientRect();
        const currentPos = { 
          x: (e.clientX - rect.left) / zoom / MM_PX_UNIT, 
          y: (e.clientY - rect.top) / zoom / MM_PX_UNIT 
        };
        let newW = applySnap(currentPos.x - (parseFloat(item.x) || 0), item.useSnap);
        let newH = applySnap(currentPos.y - (parseFloat(item.y) || 0), item.useSnap);

        if ((parseFloat(item.x) || 0) + newW > maxW) newW = maxW - (parseFloat(item.x) || 0);
        if ((parseFloat(item.y) || 0) + newH > maxH) newH = maxH - (parseFloat(item.y) || 0);

        if (item.type === 'line') {
          updateItems(prev => prev.map(i => 
            i.id === item.id 
              ? { ...i, width: Math.max(0.1, newW), height: Math.max(0.1, newH) } 
              : i
          ), false);
        } else if (item.type === 'qrcode') {
           const availX = maxW - (parseFloat(item.x) || 0); 
           const availY = maxH - (parseFloat(item.y) || 0);
           let size     = Math.max(0.1, Math.max(newW, newH)); 
           size         = Math.min(size, availX, availY);
           
           updateItems(prev => prev.map(i => 
             i.id === item.id 
               ? { ...i, width: size, height: size } 
               : i
           ), false);
        } else {
           updateItems(prev => prev.map(i => 
             i.id === item.id 
               ? { ...i, width: Math.max(0.1, newW), height: Math.max(0.1, newH) } 
               : i
           ), false);
        }
      }
      
      if (isDrawing) {
        const rect       = canvasRef.current.getBoundingClientRect();
        const currentPos = { 
          x: (e.clientX - rect.left) / zoom / MM_PX_UNIT, 
          y: (e.clientY - rect.top) / zoom / MM_PX_UNIT 
        };
        const clampedX = Math.max(0, Math.min(currentPos.x, maxW));
        const clampedY = Math.max(0, Math.min(currentPos.y, maxH));
        
        let rawW = clampedX - drawStart.x; 
        let rawH = clampedY - drawStart.y; 
        let w    = Math.abs(rawW); 
        let h    = Math.abs(rawH);

        if (activeTool === 'qrcode') {
           let size     = Math.max(w, h); 
           const availX = rawW < 0 ? drawStart.x : maxW - drawStart.x; 
           const availY = rawH < 0 ? drawStart.y : maxH - drawStart.y;
           
           size = Math.min(size, availX, availY); 
           w    = size; 
           h    = size; 
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
        scrollContainerRef.current.scrollTop  -= dy;
        
        setPanStart({ 
          x: e.clientX, 
          y: e.clientY 
        });
      }
    };

    const handleGlobalMouseUp = () => {
      if (hGuideRef.current) hGuideRef.current.style.display = 'none';
      if (vGuideRef.current) vGuideRef.current.style.display = 'none';
      
      if (isResizing || tableResizeData) takeSnapshot();
      
      setIsResizing(false); 
      setIsPanning(false); 
      setTableResizeData(null); 
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => { 
      window.removeEventListener('mousemove', handleGlobalMouseMove); 
      window.removeEventListener('mouseup', handleGlobalMouseUp); 
    };
  }, [ 
    isResizing, 
    isDrawing, 
    isPanning, 
    zoom, 
    showGrid, 
    snapToGrid, 
    gridSize, 
    drawStart, 
    panStart, 
    activeTool, 
    layout, 
    tableResizeData, 
    updateItems, 
    takeSnapshot 
  ]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      
      const isMac  = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0; 
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;
      
      if (e.key === 'Delete' || e.key === 'Backspace') { 
        deleteSelectedItems(); 
      } else if (cmdKey && (e.key.toLowerCase() === 'z')) { 
        if (e.shiftKey) {
          handleRedo(); 
        } else {
          handleUndo(); 
        }
        e.preventDefault(); 
      } else if (cmdKey && (e.key.toLowerCase() === 'y')) { 
        handleRedo(); 
        e.preventDefault(); 
      }
    };
    
    window.addEventListener('keydown', handleKeyDown); 
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleteSelectedItems, handleUndo, handleRedo]);

  const handleDragStart = (e, data) => {
    dragInfoRef.current = { 
      startX:           data.x, 
      startY:           data.y, 
      isDragging:       false, 
      initialItems:     itemsRef.current.filter(i => selectedIdsRef.current.includes(i.id)), 
      hasAlertedBounds: false 
    };
  };

  const handleGroupDrag = (e, data) => {
    if (tableResizeData) return; 
    
    if (Math.abs(data.x - dragInfoRef.current.startX) > 2 || Math.abs(data.y - dragInfoRef.current.startY) > 2) {
      dragInfoRef.current.isDragging = true;
    }
    
    const dx   = (data.x - dragInfoRef.current.startX) / MM_PX_UNIT; 
    const dy   = (data.y - dragInfoRef.current.startY) / MM_PX_UNIT;
    const maxW = parseFloat(layout.labelW) || 100; 
    const maxH = parseFloat(layout.labelH) || 50; 
    let wentOut = false;

    updateItems((prev) => prev.map((item) => {
      if (selectedIdsRef.current.includes(item.id)) {
        const initialItem = dragInfoRef.current.initialItems.find(i => i.id === item.id);
        
        if (initialItem) {
          let nextX  = (parseFloat(initialItem.x) || 0) + dx; 
          let nextY  = (parseFloat(initialItem.y) || 0) + dy; 
          const bbox = getRealBBox(item); 
          
          if (nextX < 0) { 
            nextX = 0; 
            wentOut = true; 
          } 
          if (nextY < 0) { 
            nextY = 0; 
            wentOut = true; 
          }
          if (nextX + bbox.w > maxW) { 
            nextX = maxW - bbox.w; 
            wentOut = true; 
          } 
          if (nextY + bbox.h > maxH) { 
            nextY = maxH - bbox.h; 
            wentOut = true; 
          }
          
          return { 
            ...item, 
            x: nextX, 
            y: nextY 
          };
        }
      }
      return item;
    }), false);
    
    if (wentOut) dragInfoRef.current.hasAlertedBounds = true;
  };

  const handleDragStop = () => {
    if (tableResizeData) return;
    
    setTimeout(() => { dragInfoRef.current.isDragging = false; }, 100);
    
    if (dragInfoRef.current.hasAlertedBounds) { 
      showAlert("경고", "warning", "개체가 캔버스 영역을 벗어날 수 없습니다."); 
      dragInfoRef.current.hasAlertedBounds = false; 
    }
    
    const forceSnapCalc = (val) => { 
      if (!(showGrid && snapToGrid && parseFloat(gridSize) > 0)) { 
        return parseFloat(Number(val).toFixed(1)); 
      } 
      return Math.round(val / safeGridSize) * safeGridSize; 
    };

    updateItems((prev) => prev.map((item) => {
      if (selectedIdsRef.current.includes(item.id)) {
        let finalX = forceSnapCalc(item.x); 
        let finalY = forceSnapCalc(item.y); 
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
    }), true);
  };

  const handleItemClick = (e, id, fromLayer = false) => {
    e.stopPropagation();
    
    if (!fromLayer && dragInfoRef.current.isDragging) return; 
    if (!fromLayer && activeTool !== 'select') return;

    const isCtrl = e.ctrlKey || e.metaKey;
    
    if (isCtrl) {
      setSelectedIds((prev) => prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]); 
      lastSelectedIdRef.current = id;
    } else if (e.shiftKey && lastSelectedIdRef.current) {
      const idx1 = itemsRef.current.findIndex(i => i.id === lastSelectedIdRef.current); 
      const idx2 = itemsRef.current.findIndex(i => i.id === id);
      
      if (idx1 !== -1 && idx2 !== -1) { 
        const start = Math.min(idx1, idx2); 
        const end = Math.max(idx1, idx2); 
        const rangeIds = itemsRef.current.slice(start, end + 1).map(i => i.id); 
        setSelectedIds(prev => Array.from(new Set([...prev, ...rangeIds]))); 
      }
    } else {
      setSelectedIds([id]); 
      lastSelectedIdRef.current = id; 
      
      if (selectedIdsRef.current.length === 1 && selectedIdsRef.current[0] !== id) { 
        setSelectedCells([]); 
      }
    }
  };

  const handleTableResizeStart = (e, item, type, index) => {
    e.stopPropagation(); 
    e.preventDefault();
    
    setTableResizeData({ 
      itemId:      item.id, 
      type:        type, 
      index:       index, 
      startX:      e.clientX, 
      startY:      e.clientY, 
      startRatios: type === 'col' ? [...(item.colRatios || Array(item.cols).fill(100/item.cols))] : [...(item.rowRatios || Array(item.rows).fill(100/item.rows))], 
      totalW:      parseFloat(item.width), 
      totalH:      parseFloat(item.height) 
    });
  };

  const handleMouseDownCanvas = (e) => {
    if (e.target.id === 'design-scroll-container' || e.target.id === 'design-canvas-wrapper' || e.target.id === 'design-canvas-paper') { 
      setSelectedIds([]); 
      setSelectedCells([]); 
    }
    
    if (activeTool === 'pan') { 
      setIsPanning(true); 
      setPanStart({ x: e.clientX, y: e.clientY }); 
      return; 
    }
    
    if (activeTool === 'select' || isResizing || tableResizeData) return;
    
    const rect = canvasRef.current.getBoundingClientRect(); 
    const pos  = { 
      x: ((e.clientX - rect.left) / zoom) / MM_PX_UNIT, 
      y: ((e.clientY - rect.top) / zoom) / MM_PX_UNIT 
    };
    
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

    const forceSnapCalc = (val) => { 
      if (!(showGrid && snapToGrid && parseFloat(gridSize) > 0)) { 
        return parseFloat(Number(val).toFixed(1)); 
      } 
      return Math.round(val / safeGridSize) * safeGridSize; 
    };
    
    if (tempRect.w > 0.5 || tempRect.h > 0.5) {
      const newId  = `item-${Date.now()}`;
      let   finalW = forceSnapCalc(tempRect.w) || 20; 
      let   finalH = forceSnapCalc(tempRect.h) || (activeTool === 'line' ? 1 : activeTool === 'qrcode' ? 20 : 10);
      
      if (activeTool === 'qrcode') { 
        const size = Math.max(finalW, finalH); 
        finalW = size; 
        finalH = size; 
      }
      
      if (activeTool === 'table') { 
        finalW = forceSnapCalc(tempRect.w) || 40; 
        finalH = forceSnapCalc(tempRect.h) || 20; 
      }

      const newItem = {
        id:                      newId, 
        type:                    activeTool, 
        label:                   `${activeTool}_${itemsRef.current.length + 1}`, 
        content:                 activeTool === 'text' ? 'TEXT' : activeTool === 'image' ? '' : activeTool === 'date' ? 'YYYY-MM-DD' : 'DATA',
        x:                       forceSnapCalc(tempRect.x), 
        y:                       forceSnapCalc(tempRect.y), 
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
           { 
             row:                     0, 
             col:                     0, 
             rowSpan:                 1, 
             colSpan:                 1, 
             cellType:                'text', 
             content:                 'TEXT', 
             dataId:                  '', 
             prefix:                  '', 
             suffix:                  '', 
             showPrefixSuffixOnLabel: true, 
             cellName:                '', 
             fontSize:                '', 
             borderTop:               true, 
             borderBottom:            true, 
             borderLeft:              true, 
             borderRight:             true 
           },
           { 
             row:                     0, 
             col:                     1, 
             rowSpan:                 1, 
             colSpan:                 1, 
             cellType:                'text', 
             content:                 'TEXT', 
             dataId:                  '', 
             prefix:                  '', 
             suffix:                  '', 
             showPrefixSuffixOnLabel: true, 
             cellName:                '', 
             fontSize:                '', 
             borderTop:               true, 
             borderBottom:            true, 
             borderLeft:              true, 
             borderRight:             true 
           },
           { 
             row:                     1, 
             col:                     0, 
             rowSpan:                 1, 
             colSpan:                 1, 
             cellType:                'text', 
             content:                 'TEXT', 
             dataId:                  '', 
             prefix:                  '', 
             suffix:                  '', 
             showPrefixSuffixOnLabel: true, 
             cellName:                '', 
             fontSize:                '', 
             borderTop:               true, 
             borderBottom:            true, 
             borderLeft:              true, 
             borderRight:             true 
           },
           { 
             row:                     1, 
             col:                     1, 
             rowSpan:                 1, 
             colSpan:                 1, 
             cellType:                'text', 
             content:                 'TEXT', 
             dataId:                  '', 
             prefix:                  '', 
             suffix:                  '', 
             showPrefixSuffixOnLabel: true, 
             cellName:                '', 
             fontSize:                '', 
             borderTop:               true, 
             borderBottom:            true, 
             borderLeft:              true, 
             borderRight:             true 
           }
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

  return {
    zoom, 
    setZoom, 
    showGrid, 
    setShowGrid, 
    gridSize, 
    setGridSize, 
    snapToGrid, 
    setSnapToGrid, 
    safeGridSize, 
    activeTool, 
    handleToolChange, 
    isPanning, 
    tempRect, 
    tableResizeData, 
    isResizing, 
    setIsResizing,
    masterInputText, 
    isMasterFocused, 
    setIsMasterFocused, 
    handleCombinedDataChange, 
    codeDataWithPrefix, 
    expandedTableIds, 
    toggleTableExpand, 
    alignSelectedItems, 
    handleLayerOrder, 
    modifyTableStructure,
    updateTableCell, 
    handleMergeCells, 
    handleUnmergeCells, 
    deleteSelectedItems, 
    handleItemClick, 
    handleDragStart, 
    handleGroupDrag, 
    handleDragStop, 
    handleTableResizeStart, 
    getRealBBox, 
    getKstPreviewDate,
    handleMouseDownCanvas, 
    handleMouseUpCanvas, 
    handleWheelZoom, 
    drawRulers, 
    refs
  };
};

export default useDesignEngine;