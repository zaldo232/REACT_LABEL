/**
 * @file        DesignCanvas.jsx
 * @description 라벨 디자인 페이지의 중앙 작업 영역 (도화지 및 눈금자) 컴포넌트
 * - [버그수정] 이전 버전 덮어쓰기로 유실되었던 '표 내부 셀 개별 테두리(Line) 렌더링 로직' 완벽 복구
 * - [포맷팅] 프로젝트 규칙에 따라 모든 JSX 속성, 객체, 이벤트 핸들러 내부 로직의 줄바꿈 및 수직 정렬 완벽 적용
 */

import React, { createRef } from 'react';

import { 
  Box, 
  Typography 
} from '@mui/material';

import ImageIcon from '@mui/icons-material/Image';
import Barcode from 'react-barcode';
import QRCode from 'react-qr-code';
import Draggable from 'react-draggable';

const MM_PX_UNIT = 3.78; 

// =========================================================================
// 공통 헬퍼 함수
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

// =========================================================================
// [컴포넌트] DesignCanvas
// =========================================================================
const DesignCanvas = ({
  canvasRef,
  scrollContainerRef,
  nodeRefs,
  hRulerRef,
  vRulerRef,
  hGuideRef,
  vGuideRef,
  layout,
  zoom,
  showGrid,
  safeGridSize,
  activeTool,
  isPanning,
  tempRect,
  items,
  selectedIds,
  setSelectedIds,
  selectedCells,
  setSelectedCells,
  lastSelectedCellRef,
  isResizing,
  setIsResizing,
  tableResizeData,
  codeDataWithPrefix,
  drawRulers,
  handleMouseDownCanvas,
  handleMouseUpCanvas,
  handleWheelZoom,
  handleItemClick,
  handleDragStart,
  handleGroupDrag,
  handleDragStop,
  handleTableResizeStart,
  getKstPreviewDate
}) => {

  return (
    <Box 
      sx={{ 
        flex:            1, 
        position:        'relative', 
        overflow:        'hidden',
        backgroundColor: (theme) => theme.palette.layout.design.canvasBg
      }}
    >
      <Box 
        sx={{ 
          position:        'absolute', 
          top:             0, 
          left:            0, 
          width:           20, 
          height:          20, 
          backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1e293b' : '#e8e8e8', 
          borderBottom:    (theme) => `1px solid ${theme.palette.divider}`, 
          borderRight:     (theme) => `1px solid ${theme.palette.divider}`, 
          zIndex:          20 
        }} 
      />
      <Box 
        sx={{ 
          position:        'absolute', 
          top:             0, 
          left:            20, 
          right:           0, 
          height:          20, 
          backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#0f172a' : '#f5f5f5', 
          borderBottom:    (theme) => `1px solid ${theme.palette.divider}`, 
          zIndex:          15, 
          overflow:        'hidden' 
        }}
      >
        <canvas 
          ref={hRulerRef} 
          style={{ 
            width:   '100%', 
            height:  '100%', 
            display: 'block' 
          }} 
        />
        <Box 
          ref={hGuideRef} 
          sx={{ 
            position:        'absolute', 
            top:             0, 
            bottom:          0, 
            width:           '1px', 
            backgroundColor: 'red', 
            display:         'none', 
            pointerEvents:   'none', 
            zIndex:          16 
          }} 
        />
      </Box>

      <Box 
        sx={{ 
          position:        'absolute', 
          top:             20, 
          left:            0, 
          bottom:          0, 
          width:           20, 
          backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#0f172a' : '#f5f5f5', 
          borderRight:     (theme) => `1px solid ${theme.palette.divider}`, 
          zIndex:          15, 
          overflow:        'hidden' 
        }}
      >
        <canvas 
          ref={vRulerRef} 
          style={{ 
            width:   '100%', 
            height:  '100%', 
            display: 'block' 
          }} 
        />
        <Box 
          ref={vGuideRef} 
          sx={{ 
            position:        'absolute', 
            left:            0, 
            right:           0, 
            height:          '1px', 
            backgroundColor: 'red', 
            display:         'none', 
            pointerEvents:   'none', 
            zIndex:          16 
          }} 
        />
      </Box>

      <Box 
        id="design-scroll-container"
        ref={scrollContainerRef} 
        onScroll={drawRulers}
        onMouseDown={handleMouseDownCanvas} 
        onMouseUp={handleMouseUpCanvas} 
        onWheel={handleWheelZoom}
        sx={{ 
          position:         'absolute', 
          top:              20, 
          left:             20, 
          right:            0, 
          bottom:           0, 
          overflow:         'auto', 
          cursor:           activeTool === 'pan' ? (isPanning ? 'grabbing' : 'grab') : 'default', 
          userSelect:       'none', 
          WebkitUserSelect: 'none' 
        }} 
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
              width:      `${(parseFloat(layout.labelW) || 100) * MM_PX_UNIT * zoom}px`, 
              height:     `${(parseFloat(layout.labelH) || 50) * MM_PX_UNIT * zoom}px`, 
              transition: 'width 0.1s, height 0.1s' 
            }}
          >
            <Box 
              id="design-canvas-paper"
              sx={{ 
                width:           `${parseFloat(layout.labelW) || 100}mm`, 
                height:          `${parseFloat(layout.labelH) || 50}mm`, 
                backgroundColor: (theme) => theme.palette.layout.design.paper, 
                position:        'absolute', 
                top:             0, 
                left:            0, 
                boxShadow:       '0 10px 30px rgba(0,0,0,0.3)', 
                transform:       `scale(${zoom})`, 
                transformOrigin: '0 0', 
                ...(showGrid && { 
                  backgroundImage:    (theme) => `radial-gradient(circle at 0 0, ${theme.palette.layout.design.grid} 1px, transparent 1px)`, 
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
                
                if (!nodeRefs.current[item.id]) {
                  nodeRefs.current[item.id] = createRef();
                }
                
                const isSel       = selectedIds.includes(item.id);
                const isTextType  = ['text', 'data', 'date'].includes(item.type);
                const hiddenCells = getHiddenCells(item);

                const colRatios = item.colRatios || Array(item.cols).fill(100 / (item.cols || 1));
                const rowRatios = item.rowRatios || Array(item.rows).fill(100 / (item.rows || 1));
                
                const totalColRatio = colRatios.reduce((a, b) => Number(a) + Number(b), 0) || 100;
                const totalRowRatio = rowRatios.reduce((a, b) => Number(a) + Number(b), 0) || 100;

                const getColPos    = (index)       => (colRatios.slice(0, index).reduce((a, b) => Number(a) + Number(b), 0) / totalColRatio) * 100;
                const getColWidth  = (index, span) => (colRatios.slice(index, index + (span || 1)).reduce((a, b) => Number(a) + Number(b), 0) / totalColRatio) * 100;
                const getRowPos    = (index)       => (rowRatios.slice(0, index).reduce((a, b) => Number(a) + Number(b), 0) / totalRowRatio) * 100;
                const getRowHeight = (index, span) => (rowRatios.slice(index, index + (span || 1)).reduce((a, b) => Number(a) + Number(b), 0) / totalRowRatio) * 100;

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
                          transform:       `rotate(${parseFloat(item.rotate) || 0}deg)`, 
                          transformOrigin: 'center center', 
                          border:          isSel ? '1px dashed rgba(25, 118, 210, 0.5)' : '1px dashed transparent', 
                          width:           isTextType ? 'max-content' : `${parseFloat(item.width) || 0}mm`, 
                          height:          isTextType ? 'max-content' : `${parseFloat(item.height) || 0}mm`, 
                          minHeight:       item.type === 'line' ? '1px' : undefined,
                          position:        'relative',
                          boxSizing:       'content-box'
                        }}
                      >
                        
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
                                  fontSize:   `${parseFloat(item.fontSize) || 10}pt`, 
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
                        
                        {item.type === 'rect' && (() => {
                           const bw = item.borderWidth !== undefined && item.borderWidth !== '' ? parseFloat(item.borderWidth) : 0.5;
                           return (
                            <svg 
                              width="100%" 
                              height="100%" 
                              style={{ 
                                overflow: 'visible', 
                                display:  'block' 
                              }}
                            >
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
                            <svg 
                              width="100%" 
                              height="100%" 
                              style={{ 
                                overflow: 'visible', 
                                display:  'block' 
                              }}
                            >
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
                            <svg 
                              width="100%" 
                              height="100%" 
                              style={{ 
                                overflow: 'visible', 
                                display:  'block' 
                              }}
                            >
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
                                alt="label-graphic" 
                              />
                            ) : (
                              <ImageIcon sx={{ color: '#ccc' }} />
                            )}
                          </Box>
                        )}
                        
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
                                if (svg) {
                                  svg.setAttribute('preserveAspectRatio', 'none'); 
                                }
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
                              size={(parseFloat(item.height) || 0) * MM_PX_UNIT} 
                              style={{ 
                                width:  '100%', 
                                height: '100%' 
                              }} 
                            />
                          </Box>
                        )}

                        {/* --- [H] 복합 표(Table) 렌더링 --- */}
                        {item.type === 'table' && (() => {
                          const bw          = item.borderWidth !== undefined && item.borderWidth !== '' ? parseFloat(item.borderWidth) : 0.5;
                          const strokeColor = item.stroke || '#000000';
                          const showBorders = item.showBorder !== false && bw > 0;
                          
                          return (
                            <Box 
                              sx={{ 
                                width:    '100%', 
                                height:   '100%', 
                                position: 'relative',
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

                              {isSel && selectedIds.length === 1 && (
                                <>
                                  {colRatios.slice(0, -1).map((_, i) => (
                                    <Box
                                      data-resizer="true" 
                                      key={`col-handle-${i}`}
                                      onMouseDown={(e) => handleTableResizeStart(e, item, 'col', i)}
                                      sx={{ 
                                        position:  'absolute', 
                                        top:       0, 
                                        bottom:    0, 
                                        left:      `calc(${getColPos(i + 1)}% - 3px)`, 
                                        width:     '6px', 
                                        cursor:    'col-resize', 
                                        zIndex:    10, 
                                        '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.5)' } 
                                      }}
                                    />
                                  ))}
                                  {rowRatios.slice(0, -1).map((_, i) => (
                                    <Box
                                      data-resizer="true" 
                                      key={`row-handle-${i}`}
                                      onMouseDown={(e) => handleTableResizeStart(e, item, 'row', i)}
                                      sx={{ 
                                        position:  'absolute', 
                                        left:      0, 
                                        right:     0, 
                                        top:       `calc(${getRowPos(i + 1)}% - 3px)`, 
                                        height:    '6px', 
                                        cursor:    'row-resize', 
                                        zIndex:    10, 
                                        '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.5)' } 
                                      }}
                                    />
                                  ))}
                                </>
                              )}

                              {/* ★ 복구 완료: 엑셀 표와 같이 4면의 테두리를 각각 그리는 기능 적용 */}
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

                                    const x1 = getColPos(cell.col);
                                    const y1 = getRowPos(cell.row);
                                    const w  = getColWidth(cell.col, cell.colSpan);
                                    const h  = getRowHeight(cell.row, cell.rowSpan);
                                    const x2 = x1 + w;
                                    const y2 = y1 + h;

                                    return (
                                      <g key={idx}>
                                        {cell.borderTop !== false && (
                                          <line 
                                            x1={`${x1}%`} 
                                            y1={`${y1}%`} 
                                            x2={`${x2}%`} 
                                            y2={`${y1}%`} 
                                            stroke={strokeColor} 
                                            strokeWidth={`${bw}mm`} 
                                          />
                                        )}
                                        {cell.borderRight !== false && (
                                          <line 
                                            x1={`${x2}%`} 
                                            y1={`${y1}%`} 
                                            x2={`${x2}%`} 
                                            y2={`${y2}%`} 
                                            stroke={strokeColor} 
                                            strokeWidth={`${bw}mm`} 
                                          />
                                        )}
                                        {cell.borderBottom !== false && (
                                          <line 
                                            x1={`${x1}%`} 
                                            y1={`${y2}%`} 
                                            x2={`${x2}%`} 
                                            y2={`${y2}%`} 
                                            stroke={strokeColor} 
                                            strokeWidth={`${bw}mm`} 
                                          />
                                        )}
                                        {cell.borderLeft !== false && (
                                          <line 
                                            x1={`${x1}%`} 
                                            y1={`${y1}%`} 
                                            x2={`${x1}%`} 
                                            y2={`${y2}%`} 
                                            stroke={strokeColor} 
                                            strokeWidth={`${bw}mm`} 
                                          />
                                        )}
                                      </g>
                                    );
                                  })}
                                </svg>
                              )}

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
                                  const cPfx           = showCellPfxSfx ? (cell.prefix || '') : '';
                                  const cSfx           = showCellPfxSfx ? (cell.suffix || '') : '';
                                  const isCellVisible  = cell.visible !== false; 
                                  
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
                                            setSelectedIds([item.id]);
                                            setSelectedCells(prev => {
                                              const exists = prev.find(c => c.itemId === item.id && c.row === cell.row && c.col === cell.col);
                                              if (exists) {
                                                return prev.filter(c => !(c.itemId === item.id && c.row === cell.row && c.col === cell.col));
                                              }
                                              return [...prev, newCell];
                                            });
                                            if (lastSelectedCellRef) {
                                              lastSelectedCellRef.current = newCell;
                                            }
                                          } else if (e.shiftKey && lastSelectedCellRef?.current?.itemId === item.id) {
                                            setSelectedIds([item.id]);
                                            
                                            const startCell = lastSelectedCellRef.current;
                                            const minRow    = Math.min(startCell.row, cell.row);
                                            const maxRow    = Math.max(startCell.row, cell.row);
                                            const minCol    = Math.min(startCell.col, cell.col);
                                            const maxCol    = Math.max(startCell.col, cell.col);

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
                                            setSelectedIds([item.id]);
                                            setSelectedCells([newCell]);
                                            if (lastSelectedCellRef) {
                                              lastSelectedCellRef.current = newCell;
                                            }
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
                                                if (svg) {
                                                  svg.setAttribute('preserveAspectRatio', 'none'); 
                                                }
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
                        
                        {isSel && selectedIds.length === 1 && !isTextType && (
                          <Box 
                            data-resizer="true"
                            onMouseDown={(e) => { 
                              e.stopPropagation(); 
                              if (setIsResizing) setIsResizing(true); 
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
  );
};

export default DesignCanvas;