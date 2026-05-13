/**
 * @file        LabelTemplate.jsx
 * @description 라벨 인쇄 및 미리보기용 공통 템플릿 컴포넌트
 */

import React, { 
  forwardRef, 
  useMemo 
} from 'react';

import { 
  Box, 
  Typography 
} from '@mui/material';

import Barcode from 'react-barcode';
import QRCode from 'react-qr-code';

const MM_PX_UNIT = 3.78; 

const PRINT_COLORS = {
  background: '#ffffff',
  foreground: '#000000'
};

// =========================================================================
// 공통 헬퍼 영역
// =========================================================================

/**
 * 표 병합 시 가려진 셀을 찾아내는 헬퍼 함수
 */
const getHiddenCells = (item) => {
  const hidden = new Set();
  
  if (item.type === 'table' && item.cells) {
    item.cells.forEach((c) => {
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
// 메인 컴포넌트 영역
// =========================================================================

const LabelTemplate = forwardRef(({ 
  items       = [], 
  dynamicData = {}, 
  width       = 100, 
  height      = 50, 
  delimiter   = '_' 
}, ref) => {
  
  // =========================================================================
  // 로직 영역: 날짜 포맷팅 및 가변 데이터 처리
  // =========================================================================

  // 이 함수는 오직 툴바에서 꺼낸 '날짜' 개체의 "시스템 현재(오늘) 날짜"를 인쇄하는 용도입니다. 엑셀 데이터는 이 코드를 거치지 않습니다.
  const getKstFormattedDate = (format) => {
    if (!format) return '';
    
    const now     = new Date();
    const kstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const pad     = (n) => String(n).padStart(2, '0');
    
    return format
      .replace(/YYYY/g, kstDate.getUTCFullYear())
      .replace(/MM/g, pad(kstDate.getUTCMonth() + 1))
      .replace(/DD/g, pad(kstDate.getUTCDate()))
      .replace(/HH/g, pad(kstDate.getUTCHours()))
      .replace(/mm/g, pad(kstDate.getUTCMinutes()))
      .replace(/ss/g, pad(kstDate.getUTCSeconds()));
  };

  /**
   * 바코드/QR코드에 주입될 가변 데이터 및 정적 데이터 결합 로직
   * - 빈 값("")인 경우 구분자가 결합되는 현상 방지
   * - 병합되어 가려진 유령 셀 데이터 취합 무시
   */
  const codeDataWithPrefix = useMemo(() => {
    const parts = [];
    let hasAnyContent = false;
    
    items.forEach((item) => {
      if ((item.type === 'data' || item.type === 'date') && item.useInCode !== false) {
        let val = item.type === 'date' 
          ? getKstFormattedDate(item.content).replace(/[-_:\s]/g, '') 
          : (dynamicData[item.id] || '');
          
        if (val !== '') hasAnyContent = true;
        parts.push(`${item.prefix || ''}${val}${item.suffix || ''}`);
      } 
      else if (item.type === 'table' && item.cells) {
        const hiddenCells = getHiddenCells(item); 
        
        item.cells.forEach((cell) => {
          if (hiddenCells.has(`${cell.row}_${cell.col}`)) return; 

          if ((cell.cellType === 'data' || cell.cellType === 'date') && cell.useInCode !== false) {
            let val = '';
            
            if (cell.cellType === 'date') {
              val = getKstFormattedDate(cell.content || 'YYYY-MM-DD').replace(/[-_:\s]/g, '');
            } else {
              val = dynamicData[`${item.id}_${cell.row}_${cell.col}`] || '';
            }
            
            if (val !== '') hasAnyContent = true;
            parts.push(`${cell.prefix || ''}${val}${cell.suffix || ''}`);
          }
        });
      }
    });

    if (!hasAnyContent) return '';
    
    // 후행 빈칸 트리밍
    let lastNonEmpty = -1;
    for (let idx = parts.length - 1; idx >= 0; idx--) {
      if (parts[idx] !== '') {
        lastNonEmpty = idx;
        break;
      }
    }
    
    const activeParts = parts.slice(0, lastNonEmpty + 1);
    return activeParts.join(delimiter || '');
    
  }, [items, dynamicData, delimiter]);

  // =========================================================================
  // 렌더링 영역
  // =========================================================================
  return (
    <Box 
      ref={ref} 
      sx={{
        position:        'relative', 
        width:           `${parseFloat(width) || 100}mm`, 
        height:          `${parseFloat(height) || 50}mm`,
        backgroundColor: PRINT_COLORS.background, 
        color:           PRINT_COLORS.foreground,
        border:          `1px solid ${PRINT_COLORS.foreground}`, 
        boxSizing:       'border-box', 
        breakInside:     'avoid', 
        pageBreakInside: 'avoid', 
        overflow:        'hidden'
      }}
    >
      {[...items].sort((a, b) => 0).reverse().map((item, index) => {
        if (item.visible === false) return null;

        const itemZIndex   = items.length - index;
        const isTextType   = ['text', 'data', 'date'].includes(item.type);
        let displayContent = item.content;
        
        if (item.type === 'data') {
          displayContent = dynamicData[item.id] || ''; 
        } else if (item.type === 'date') {
          displayContent = getKstFormattedDate(item.content); 
        }

        const hiddenCells = getHiddenCells(item);

        const colRatios = item.colRatios || Array(item.cols).fill(100 / (item.cols || 1));
        const rowRatios = item.rowRatios || Array(item.rows).fill(100 / (item.rows || 1));

        const getColPos    = (idx) => colRatios.slice(0, idx).reduce((a, b) => a + b, 0);
        const getColWidth  = (idx, span) => colRatios.slice(idx, idx + (span || 1)).reduce((a, b) => a + b, 0);
        const getRowPos    = (idx) => rowRatios.slice(0, idx).reduce((a, b) => a + b, 0);
        const getRowHeight = (idx, span) => rowRatios.slice(idx, idx + (span || 1)).reduce((a, b) => a + b, 0);

        return (
          <div 
            key={item.id} 
            style={{ 
              position: 'absolute', 
              left:     `${(parseFloat(item.x) || 0) * MM_PX_UNIT}px`, 
              top:      `${(parseFloat(item.y) || 0) * MM_PX_UNIT}px`, 
              zIndex:   itemZIndex 
            }}
          >
            <div 
              style={{ 
                transform:       `rotate(${parseFloat(item.rotate) || 0}deg)`, 
                transformOrigin: 'center center', 
                width:           `${parseFloat(item.width) || 0}mm`, 
                height:          `${parseFloat(item.height) || 0}mm`, 
                minHeight:       item.type === 'line' ? '1px' : undefined,
                position:        'relative' 
              }}
            >
              
              {/* --- 1. 텍스트 / 데이터 / 날짜 개체 --- */}
              {isTextType && (() => {
                const pfx = item.showPrefixSuffixOnLabel !== false ? (item.prefix || '') : '';
                const sfx = item.showPrefixSuffixOnLabel !== false ? (item.suffix || '') : '';
                
                // 속성창에서 받아온 textAlign 상태를 컨테이너(Box)의 정렬 속성(flex)으로 변환
                const alignMap = {
                  'left':   'flex-start',
                  'center': 'center',
                  'right':  'flex-end'
                };
                const justifyContentStr = alignMap[item.textAlign || 'left'];

                return (
                  <Box 
                    sx={{
                      width:          '100%',
                      height:         '100%',
                      display:        'flex',
                      alignItems:     'center', // 세로도 기본적으로 중앙 정렬
                      justifyContent: justifyContentStr,
                      overflow:       'visible' 
                    }}
                  >
                    <Typography 
                      sx={{ 
                        fontSize:   `${parseFloat(item.fontSize) || 10}pt`, 
                        fontWeight: item.fontWeight || 'normal', 
                        fontStyle:  item.fontStyle || 'normal',
                        color:      PRINT_COLORS.foreground, 
                        whiteSpace: 'nowrap',
                        lineHeight: 1,
                        // 텍스트 자체의 정렬 속성도 동기화
                        textAlign:  item.textAlign || 'left'
                      }}
                    >
                      {item.type === 'text' 
                        ? displayContent 
                        : `${pfx}${displayContent}${sfx}`}
                    </Typography>
                  </Box>
                );
              })()}

              {/* --- 2. 기본 도형 개체 --- */}
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
                      stroke={item.stroke || PRINT_COLORS.foreground} 
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
                      stroke={item.stroke || PRINT_COLORS.foreground} 
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
                      stroke={item.stroke || PRINT_COLORS.foreground} 
                      strokeWidth={`${thk}mm`} 
                    />
                  </svg>
                 );
              })()}

              {/* --- 3. 이미지 개체 --- */}
              {item.type === 'image' && item.src && (
                <Box 
                  sx={{ 
                    width:          '100%', 
                    height:         '100%', 
                    display:        'flex', 
                    alignItems:     'center', 
                    justifyContent: 'center', 
                    overflow:       'hidden' 
                  }}
                >
                  <img 
                    src={item.src} 
                    alt="label-graphic"
                    style={{ 
                      width:     '100%', 
                      height:    '100%',
                      objectFit: 'contain'
                    }} 
                  />
                </Box>
              )}

              {/* --- 4. 1D 바코드 단일 개체 --- */}
              {item.type === 'barcode' && (
                <Box 
                  ref={(el) => {
                    if (el) {
                      const svg = el.querySelector('svg');
                      if (svg) svg.setAttribute('preserveAspectRatio', 'none');
                    }
                  }}
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
                >
                  <Barcode 
                    value={dynamicData[item.id] || codeDataWithPrefix || 'NO DATA'} 
                    format={item.barcodeType || 'CODE128'}
                    width={2} 
                    height={100} 
                    displayValue={item.displayValue !== false} 
                    margin={0} 
                    background={PRINT_COLORS.background}
                    lineColor={PRINT_COLORS.foreground}
                  />
                </Box>
              )}

              {/* --- 5. QR 코드 단일 개체 --- */}
              {item.type === 'qrcode' && (
                <Box 
                  sx={{ 
                    width:          '100%', 
                    height:         '100%',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    overflow:       'hidden'
                  }}
                >
                  <QRCode 
                    value={dynamicData[item.id] || codeDataWithPrefix || 'NO DATA'} 
                    level={item.qrErrorLevel || 'M'}
                    size={256} 
                    bgColor={PRINT_COLORS.background}
                    fgColor={PRINT_COLORS.foreground}
                    style={{ 
                      maxWidth:  '100%', 
                      maxHeight: '100%',
                      width:     'auto',
                      height:    'auto'
                    }}
                  />
                </Box>
              )}

              {/* --- 6. 표(Table) 복합 개체 --- */}
              {item.type === 'table' && (() => {
                const bw          = item.borderWidth !== undefined && item.borderWidth !== '' ? parseFloat(item.borderWidth) : 0.5;
                const strokeColor = item.stroke || PRINT_COLORS.foreground;
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
                                <line x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y1}%`} stroke={strokeColor} strokeWidth={`${bw}mm`} />
                              )}
                              {cell.borderRight !== false && (
                                <line x1={`${x2}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`} stroke={strokeColor} strokeWidth={`${bw}mm`} />
                              )}
                              {cell.borderBottom !== false && (
                                <line x1={`${x1}%`} y1={`${y2}%`} x2={`${x2}%`} y2={`${y2}%`} stroke={strokeColor} strokeWidth={`${bw}mm`} />
                              )}
                              {cell.borderLeft !== false && (
                                <line x1={`${x1}%`} y1={`${y1}%`} x2={`${x1}%`} y2={`${y2}%`} stroke={strokeColor} strokeWidth={`${bw}mm`} />
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
                        gridTemplateRows:    rowRatios.map(r => `${r}%`).join(' '), 
                        gridTemplateColumns: colRatios.map(r => `${r}%`).join(' '), 
                        position:            'relative',
                        zIndex:              1,
                        boxSizing:           'border-box' 
                      }}
                    >
                      {item.cells?.map((cell, idx) => {
                        if (hiddenCells.has(`${cell.row}_${cell.col}`)) return null;

                        let cellDisplay = cell.content || '';
                        const cellIdKey = `${item.id}_${cell.row}_${cell.col}`;
                        
                        if (cell.cellType === 'data') {
                          cellDisplay = dynamicData[cellIdKey] || '';
                        } else if (cell.cellType === 'date') {
                          // 엑셀에서 가져오는 포장일자가 여기에 들어간다면 cell.cellType은 보통 'data'입니다.
                          // cell.cellType이 'date'인 경우는 사용자가 직접 '라벨 인쇄 시점의 날짜'를 찍기 위해 추가한 개체입니다.
                          cellDisplay = getKstFormattedDate(cell.content || 'YYYY-MM-DD');
                        }

                        const showCellPfxSfx = cell.showPrefixSuffixOnLabel !== false;
                        const cPfx = showCellPfxSfx ? (cell.prefix || '') : '';
                        const cSfx = showCellPfxSfx ? (cell.suffix || '') : '';
                        const isCellVisible  = cell.visible !== false; 

                        return (
                          <Box 
                            key={idx} 
                            sx={{
                              gridRow:        `${cell.row + 1} / span ${cell.rowSpan || 1}`,
                              gridColumn:     `${cell.col + 1} / span ${cell.colSpan || 1}`,
                              boxSizing:      'border-box',
                              display:        'flex',
                              alignItems:     'center',
                              justifyContent: 'center',
                              overflow:       'hidden',
                              padding:        '2px',
                            }}
                          >
                            {isCellVisible && (
                              cell.cellType === 'barcode' ? (
                                <Box 
                                  ref={(el) => { 
                                    if (el) { 
                                      const svg = el.querySelector('svg'); 
                                      if (svg) svg.setAttribute('preserveAspectRatio', 'none'); 
                                    } 
                                  }}
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
                                >
                                   <Barcode 
                                     value={dynamicData[cellIdKey] || codeDataWithPrefix || 'BARCODE'} 
                                     format={cell.barcodeType || 'CODE128'} 
                                     width={2} 
                                     height={35} 
                                     displayValue={cell.displayValue !== false} 
                                     margin={4} 
                                     background={PRINT_COLORS.background} 
                                     lineColor={PRINT_COLORS.foreground} 
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
                                    value={dynamicData[cellIdKey] || codeDataWithPrefix || 'QRCODE'} 
                                    level={cell.qrErrorLevel || 'M'} 
                                    size={256} 
                                    bgColor={PRINT_COLORS.background} 
                                    fgColor={PRINT_COLORS.foreground} 
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
                                    fontWeight: item.fontWeight || 'normal', 
                                    fontStyle:  item.fontStyle || 'normal', 
                                    color:      PRINT_COLORS.foreground, 
                                    wordBreak:  'break-all', 
                                    textAlign:  'center', 
                                    lineHeight: 1.1 
                                  }}
                                >
                                  {cell.cellType === 'text' ? cellDisplay : `${cPfx}${cellDisplay}${cSfx}`}
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

            </div>
          </div>
        );
      })}
    </Box>
  );
});

export default LabelTemplate;