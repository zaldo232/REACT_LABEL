/**
 * @file        LabelTemplate.jsx
 * @description 라벨 인쇄 및 미리보기용 공통 템플릿 컴포넌트
 * (디자인 화면과 100% 동일한 렌더링 결과를 얻기 위해, 바코드 SVG 스케일링 및 텍스트 자동 크기 로직을 이식했습니다.)
 */

import React, { forwardRef } from 'react';
import { 
  Box, 
  Typography 
} from '@mui/material';
import Barcode from 'react-barcode';
import QRCode from 'react-qr-code';

/** [상수] mm 단위를 화면 px 단위로 변환하기 위한 비율 (96dpi 기준) */
const MM_PX_UNIT = 3.78; 

/** 인쇄용 고정 색상 (출력물은 흑백을 유지해야 함) */
const PRINT_COLORS = {
  background: '#ffffff',
  foreground: '#000000'
};

/**
 * [컴포넌트] LabelTemplate
 * @param {Array} items - 라벨 요소 리스트
 * @param {Object} dynamicData - 가변 데이터 매핑 값
 * @param {Number} width - 라벨 가로 너비 (mm)
 * @param {Number} height - 라벨 세로 높이 (mm)
 * @param {String} delimiter - 데이터 결합 구분자
 */
const LabelTemplate = forwardRef(({ 
  items = [], 
  dynamicData = {}, 
  width = 100, 
  height = 50, 
  delimiter = '_' 
}, ref) => {
  
  /** [영역 분리: 비즈니스 로직] */

  const getKstFormattedDate = (format) => {
    if (!format) return '';
    const now = new Date();
    const kstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const pad = (n) => String(n).padStart(2, '0');
    
    return format
      .replace(/YYYY/g, kstDate.getUTCFullYear())
      .replace(/MM/g, pad(kstDate.getUTCMonth() + 1))
      .replace(/DD/g, pad(kstDate.getUTCDate()))
      .replace(/HH/g, pad(kstDate.getUTCHours()))
      .replace(/mm/g, pad(kstDate.getUTCMinutes()))
      .replace(/ss/g, pad(kstDate.getUTCSeconds()));
  };

  const codeDataWithPrefix = items
    .filter((i) => i.type === 'data' || i.type === 'date')
    .map((i) => {
      let val = i.type === 'date' 
        ? getKstFormattedDate(i.content) 
        : (dynamicData[i.id] || '');

      if (i.type === 'date') {
        val = val.replace(/[-_:\s]/g, ''); 
      }
      return `${i.prefix || ''}${val}`;
    })
    .join(delimiter || ''); 

  /** [영역 분리: 렌더링 영역] */
  return (
    <Box 
      ref={ref} 
      sx={{
        position:        'relative', 
        width:           `${width}mm`, 
        height:          `${height}mm`,
        backgroundColor: PRINT_COLORS.background, 
        color:           PRINT_COLORS.foreground,
        border:          `1px solid ${PRINT_COLORS.foreground}`, 
        boxSizing:       'border-box', 
        breakInside:     'avoid', 
        pageBreakInside: 'avoid', 
        overflow:        'hidden',
      }}
    >
      {[...items].reverse().map((item) => {
        if (item.visible === false) return null;

        let displayContent = item.content;
        const isTextType = ['text', 'data', 'date'].includes(item.type);
        
        if (item.type === 'data') {
          displayContent = dynamicData[item.id] || ''; 
        } else if (item.type === 'date') {
          displayContent = getKstFormattedDate(item.content); 
        }

        return (
          <div 
            key={item.id} 
            style={{ 
              position: 'absolute', 
              left:     `${item.x * MM_PX_UNIT}px`, 
              top:      `${item.y * MM_PX_UNIT}px`, 
              zIndex:   1 
            }}
          >
            <div 
              style={{ 
                transform:       `rotate(${item.rotate || 0}deg)`, 
                transformOrigin: 'center center', 
                width:           isTextType ? 'max-content' : `${item.width}mm`, 
                height:          isTextType ? 'max-content' : `${item.height}mm`, 
                position:        'relative' 
              }}
            >
              
              {isTextType && (
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
                      fontSize:   `${item.fontSize}pt`, 
                      fontWeight: item.fontWeight || 'normal', 
                      fontStyle:  item.fontStyle || 'normal',
                      color:      PRINT_COLORS.foreground, 
                      whiteSpace: 'nowrap',
                      lineHeight: 1
                    }}
                  >
                    {displayContent}
                  </Typography>
                </Box>
              )}

              {item.type === 'rect' && (
                <Box 
                  sx={{ 
                    width:     '100%', 
                    height:    '100%', 
                    border:    `${item.borderWidth || 1}px solid ${PRINT_COLORS.foreground}`,
                    boxSizing: 'border-box'
                  }} 
                />
              )}

              {item.type === 'circle' && (
                <Box 
                  sx={{ 
                    width:        '100%', 
                    height:       '100%', 
                    border:       `${item.borderWidth || 1}px solid ${PRINT_COLORS.foreground}`,
                    borderRadius: '50%',
                    boxSizing:    'border-box'
                  }} 
                />
              )}

              {item.type === 'line' && (
                <Box 
                  sx={{ 
                    width:           '100%', 
                    height:          `${item.borderWidth || 1}px`, 
                    backgroundColor: PRINT_COLORS.foreground 
                  }} 
                />
              )}

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

              {/* ★ 디자인 페이지와 동일하게 SVG 강제 늘림/줄임 속성 적용 (크기 절대 고정) */}
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
                    displayValue={false} 
                    margin={0} 
                    background={PRINT_COLORS.background}
                    lineColor={PRINT_COLORS.foreground}
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
                    value={codeDataWithPrefix || 'NO DATA'} 
                    level={item.qrErrorLevel || 'M'}
                    size={item.height * MM_PX_UNIT} 
                    bgColor={PRINT_COLORS.background}
                    fgColor={PRINT_COLORS.foreground}
                    style={{ width: '100%', height: '100%' }}
                  />
                </Box>
              )}
            </div>
          </div>
        );
      })}
    </Box>
  );
});

export default LabelTemplate;