/**
 * @file        LabelTemplate.jsx
 * @description 라벨 인쇄 및 미리보기용 공통 템플릿 컴포넌트
 * (디자인 툴에서 설정한 회전, 도형, 이미지, 바코드 포맷 및 가변 데이터를 실제 크기에 맞춰 렌더링합니다.)
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

/**
 * [컴포넌트] LabelTemplate
 * @param {Array} items - 라벨에 배치된 요소(text, data, date, rect, circle, line, image, code) 리스트
 * @param {Object} dynamicData - 가변 데이터 항목에 매핑될 실제 값 ({항목ID: 값})
 * @param {Number} width - 라벨 가로 너비 (mm)
 * @param {Number} height - 라벨 세로 높이 (mm)
 * @param {String} delimiter - 바코드/QR코드 생성을 위한 데이터 결합 구분자
 */
const LabelTemplate = forwardRef(({ 
  items = [], 
  dynamicData = {}, 
  width = 100, 
  height = 50, 
  delimiter = '_' 
}, ref) => {
  
  /** [영역 분리: 비즈니스 로직] */

  /**
   * 한국 시간(KST) 기반 날짜 포맷 변환 함수
   * @description 시스템 환경에 구애받지 않고 항상 UTC+9 시간대를 기준으로 포맷팅된 문자열을 반환합니다.
   */
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

  /**
   * 바코드/QR코드용 결합 데이터 생성
   * @description 라벨 내의 'data'와 'date' 항목들을 순서대로 추출하고 접두어와 구분자로 결합합니다.
   */
  const codeDataWithPrefix = items
    .filter((i) => i.type === 'data' || i.type === 'date')
    .map((i) => {
      // 1. 데이터 값 가져오기 (날짜는 KST 포맷 적용)
      let val = i.type === 'date' 
        ? getKstFormattedDate(i.content) 
        : (dynamicData[i.id] || '');

      // 2. 바코드 데이터 특수기호/공백 제거 처리
      if (i.type === 'date') {
        val = val.replace(/[-_:\s]/g, ''); 
      }

      // 3. 설정된 접두어(Prefix)와 결합
      return `${i.prefix || ''}${val}`;
    })
    .join(delimiter || ''); 

  /** [영역 분리: 렌더링 영역] */
  return (
    <Box 
      ref={ref} 
      sx={{
        position: 'relative', 
        width: `${width}mm`, 
        height: `${height}mm`,
        // 인쇄용 물리적 종이이므로 다크모드와 무관하게 무조건 흰 바탕 + 검정 글씨 적용
        backgroundColor: '#ffffff', 
        color: '#000000',
        border: '1px solid #000000', 
        boxSizing: 'border-box', 
        
        // 프린터 출력 시 페이지 레이아웃 깨짐 방지
        breakInside: 'avoid', 
        pageBreakInside: 'avoid', 
        overflow: 'hidden',
      }}
    >
      {/* 레이어 순서를 유지하기 위해 배열을 역순으로 렌더링 
        (디자인 툴 리스트의 최상단 항목이 화면상 가장 위에 덮이도록 처리) 
      */}
      {[...items].reverse().map((item) => {
        // 숨김(visible: false) 처리된 레이어는 렌더링하지 않음
        if (item.visible === false) return null;

        let displayContent = item.content;
        
        // 항목 타입에 따른 출력 데이터 결정
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
              left: `${item.x * MM_PX_UNIT}px`, 
              top: `${item.y * MM_PX_UNIT}px`, 
              transform: `rotate(${item.rotate || 0}deg)`, // 회전각도 적용
              transformOrigin: 'center center',
              lineHeight: 1, 
              zIndex: 1 
            }}
          >
            {/* 1. 일반 텍스트 / 데이터 / 날짜 출력 */}
            {['text', 'data', 'date'].includes(item.type) && (
              <Typography 
                sx={{ 
                  fontSize: `${item.fontSize}pt`, 
                  fontWeight: item.fontWeight || 'normal', 
                  color: '#000000', 
                  whiteSpace: 'nowrap' 
                }}
              >
                {displayContent}
              </Typography>
            )}

            {/* 2. 사각형(Rect) 출력 */}
            {item.type === 'rect' && (
              <Box 
                sx={{ 
                  width: `${item.width * MM_PX_UNIT}px`, 
                  height: `${item.height * MM_PX_UNIT}px`, 
                  border: `${item.borderWidth || 1}px solid #000000`,
                  boxSizing: 'border-box'
                }} 
              />
            )}

            {/* 3. 타원(Circle/Ellipse) 출력 */}
            {item.type === 'circle' && (
              <Box 
                sx={{ 
                  width: `${item.width * MM_PX_UNIT}px`, 
                  height: `${item.height * MM_PX_UNIT}px`, 
                  border: `${item.borderWidth || 1}px solid #000000`,
                  borderRadius: '50%',
                  boxSizing: 'border-box'
                }} 
              />
            )}

            {/* 4. 선(Line) 출력 */}
            {item.type === 'line' && (
              <Box 
                sx={{ 
                  width: `${item.width * MM_PX_UNIT}px`, 
                  height: `${item.borderWidth || 1}px`, // 선은 borderWidth를 두께(height)로 사용
                  backgroundColor: '#000000' 
                }} 
              />
            )}

            {/* 5. 이미지(Image) 출력 */}
            {item.type === 'image' && item.src && (
              <img 
                src={item.src} 
                alt="label-img"
                style={{ 
                  width: `${item.width * MM_PX_UNIT}px`, 
                  height: `${item.height * MM_PX_UNIT}px`,
                  objectFit: 'contain'
                }} 
              />
            )}

            {/* 6. 바코드 출력 (동적 포맷 지원) */}
            {item.type === 'barcode' && (
              <div style={{ lineHeight: 0 }}>
                <Barcode 
                  value={codeDataWithPrefix || 'NO DATA'} 
                  format={item.barcodeType || 'CODE128'}
                  width={item.width / 20} 
                  height={item.height * MM_PX_UNIT} 
                  displayValue={false} 
                  margin={0} 
                />
              </div>
            )}

            {/* 7. QR코드 출력 (오류 복원율 지원) */}
            {item.type === 'qrcode' && (
              <div style={{ lineHeight: 0 }}>
                <QRCode 
                  value={codeDataWithPrefix || 'NO DATA'} 
                  level={item.qrErrorLevel || 'M'}
                  size={item.height * MM_PX_UNIT} 
                />
              </div>
            )}
          </div>
        );
      })}
    </Box>
  );
});

export default LabelTemplate;