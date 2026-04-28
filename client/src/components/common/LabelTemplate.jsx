/**
 * @file    LabelTemplate.jsx
 * @description 라벨 인쇄 및 미리보기용 공통 템플릿 컴포넌트
 * - [렌더링동기화] 디자인 페이지의 최신 렌더링 방식(SVG 중앙 선두께, 표 선 겹침 방지, 0.1mm 지원) 완벽 이식
 * - [버그수정] 데이터가 비어있을 때("") 구분자가 결합되어 띄어쓰기가 생기던 오류 수정 (빈 값 필터링)
 * - [복구] 표(Table) 셀 병합(Span) 시 뒷면에 가려지는 유령 셀 필터링(숨김) 로직 복구
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

  /**
   * KST(한국 표준시) 기준으로 현재 시간을 지정된 포맷으로 반환하는 함수
   */
  const getKstFormattedDate = (format) => {
    if (!format) return '';
    const now     = new Date();
    // UTC 기준 시간에 9시간을 더하여 KST(한국 표준시)로 변환합니다.
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
   * 바코드/QR코드에 주입될 가변 데이터 및 정적 데이터를 결합하는 로직
   * - 빈 값("")인 경우 구분자가 불필요하게 결합되는 현상을 방지합니다.
   */
  const codeDataWithPrefix = useMemo(() => {
    const parts = [];
    let hasAnyContent = false;
    
    items.forEach(item => {
      // 일반 데이터 및 날짜 개체 처리
      if (item.type === 'data' || item.type === 'date') {
        let val = item.type === 'date' 
          ? getKstFormattedDate(item.content).replace(/[-_:\s]/g, '') 
          : (dynamicData[item.id] || '');
          
        if (val !== '') hasAnyContent = true;
        parts.push(`${item.prefix || ''}${val}${item.suffix || ''}`);
      } 
      // 표(Table) 내부 셀 데이터 처리
      else if (item.type === 'table' && item.cells) {
        item.cells.forEach((cell) => {
          if (cell.cellType === 'data' || cell.cellType === 'date') {
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
    
    // 후행 빈칸 트리밍 (뒷부분의 무의미한 빈 문자열 제거로 띄어쓰기 방지)
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
        width:           `${parseFloat(width)||100}mm`, 
        height:          `${parseFloat(height)||50}mm`,
        backgroundColor: PRINT_COLORS.background, 
        color:           PRINT_COLORS.foreground,
        border:          `1px solid ${PRINT_COLORS.foreground}`, 
        boxSizing:       'border-box', 
        breakInside:     'avoid', 
        pageBreakInside: 'avoid', 
        overflow:        'hidden',
      }}
    >
      {/* 디자인 툴의 레이어 순서(Z-Index) 정책에 맞게 렌더링 순서 동기화
        - items 배열의 뒤에 있을수록 화면 아래에 깔리도록 reverse를 적용합니다. 
      */}
      {[...items].sort((a, b) => 0).reverse().map((item, index) => {
        if (item.visible === false) return null;

        const itemZIndex     = items.length - index;
        const isTextType     = ['text', 'data', 'date'].includes(item.type);
        let displayContent   = item.content;
        
        // 텍스트 출력 데이터 매핑
        if (item.type === 'data') {
          displayContent = dynamicData[item.id] || ''; 
        } else if (item.type === 'date') {
          displayContent = getKstFormattedDate(item.content); 
        }

        // 셀 병합 시 뒷면에 가려지는 유령 셀 숨김 처리
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
          <div 
            key={item.id} 
            style={{ 
              position: 'absolute', 
              left:     `${(parseFloat(item.x)||0) * MM_PX_UNIT}px`, 
              top:      `${(parseFloat(item.y)||0) * MM_PX_UNIT}px`, 
              zIndex:   itemZIndex 
            }}
          >
            <div 
              style={{ 
                transform:       `rotate(${parseFloat(item.rotate) || 0}deg)`, 
                transformOrigin: 'center center', 
                width:           isTextType ? 'max-content' : `${parseFloat(item.width)||0}mm`, 
                height:          isTextType ? 'max-content' : `${parseFloat(item.height)||0}mm`, 
                minHeight:       item.type === 'line' ? '1px' : undefined,
                position:        'relative' 
              }}
            >
              
              {/* --- 1. 텍스트 / 데이터 / 날짜 개체 --- */}
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
                      justifyContent: 'flex-start',
                      overflow:       'hidden'
                    }}
                  >
                    <Typography 
                      sx={{ 
                        fontSize:   `${parseFloat(item.fontSize)||10}pt`, 
                        fontWeight: item.fontWeight || 'normal', 
                        fontStyle:  item.fontStyle || 'normal',
                        color:      PRINT_COLORS.foreground, 
                        whiteSpace: 'nowrap',
                        lineHeight: 1
                      }}
                    >
                      {item.type === 'text' 
                        ? displayContent 
                        : `${pfx}${displayContent}${sfx}`}
                    </Typography>
                  </Box>
                );
              })()}

              {/* --- 2. 기본 도형 개체 (SVG 렌더링 동기화) --- */}
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

              {/* --- 선(Line) SVG 동기화 --- */}
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
                    value={codeDataWithPrefix || 'NO DATA'} 
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
                    value={codeDataWithPrefix || 'NO DATA'} 
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

              {/* --- 6. 표(Table) 복합 개체 (비대화 방지 렌더링 동기화) --- */}
              {item.type === 'table' && (() => {
                const bw = item.borderWidth !== undefined && item.borderWidth !== '' ? parseFloat(item.borderWidth) : 0.5;
                const strokeColor = item.stroke || PRINT_COLORS.foreground;
                const showBorders = item.showBorder !== false && bw > 0;
                
                // 컨테이너는 윗선/왼선만 그리고, 각 셀은 아랫선/오른선만 그림으로써 선 중첩(비대화) 방지
                const tableBorderStyle = showBorders ? `${bw}mm solid ${strokeColor}` : 'none';
                
                return (
                  <Box 
                    sx={{ 
                      width:               '100%', 
                      height:              '100%', 
                      position:            'relative',
                    }}
                  >
                    {/* 표 배경색 투명도 처리 */}
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

                    {/* SVG 겹침없는 선 오버레이 (정밀한 0.1mm 소수점 렌더링 보장) */}
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

                    {/* 내부 셀 데이터 렌더링 영역 */}
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

                        let cellDisplay = cell.content || '';
                        if (cell.cellType === 'data') cellDisplay = dynamicData[`${item.id}_${cell.row}_${cell.col}`] || '';
                        else if (cell.cellType === 'date') cellDisplay = getKstFormattedDate(cell.content || 'YYYY-MM-DD');

                        const showCellPfxSfx = cell.showPrefixSuffixOnLabel !== false;
                        const cPfx = showCellPfxSfx ? (cell.prefix || '') : '';
                        const cSfx = showCellPfxSfx ? (cell.suffix || '') : '';

                        return (
                          <Box 
                            key={idx} 
                            sx={{
                              gridRow:         `${cell.row + 1} / span ${cell.rowSpan || 1}`,
                              gridColumn:      `${cell.col + 1} / span ${cell.colSpan || 1}`,
                              boxSizing:       'border-box',
                              display:         'flex',
                              alignItems:      'center',
                              justifyContent:  'center',
                              overflow:        'hidden',
                              padding:         '2px',
                            }}
                          >
                            {cell.cellType === 'barcode' ? (
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
                                  value={codeDataWithPrefix || 'QRCODE'} 
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
                                  fontSize:   `${parseFloat(item.fontSize)||10}pt`, 
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