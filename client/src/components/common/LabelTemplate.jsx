/**
 * @file        LabelTemplate.jsx
 * @description 라벨 인쇄 및 미리보기용 공통 템플릿 컴포넌트
 */

import React, { forwardRef } from 'react';
import { Box, Typography } from '@mui/material';
import Barcode from 'react-barcode';
import QRCode from 'react-qr-code';

/** [상수] mm 단위를 화면 px 단위로 변환하기 위한 비율 */
const MM_PX_UNIT = 3.78; 

/**
 * [컴포넌트] LabelTemplate
 * @param {Array} items - 라벨에 배치된 요소(text, data, date, code) 리스트
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
  
  /**
   * [로직] 날짜 포맷 변환 함수
   * (사용자가 정의한 포맷 문자열에 맞춰 현재 날짜를 반환)
   */
  const getFormattedDate = (format) => {
    if (!format) return '';
    const d = new Date();
    const yyyy = d.getFullYear(); 
    const MM = String(d.getMonth() + 1).padStart(2, '0'); 
    const dd = String(d.getDate()).padStart(2, '0');
    const HH = String(d.getHours()).padStart(2, '0'); 
    const mm = String(d.getMinutes()).padStart(2, '0'); 
    const ss = String(d.getSeconds()).padStart(2, '0');
    
    return format
      .replace(/YYYY/g, yyyy)
      .replace(/MM/g, MM)
      .replace(/DD/g, dd)
      .replace(/HH/g, HH)
      .replace(/mm/g, mm)
      .replace(/ss/g, ss);
  };

  /**
   * 바코드/QR코드용 결합 데이터 생성
   * (라벨 내의 'data'와 'date' 항목들을 순서대로 추출하고 
   * 접두어(Prefix)와 결합한 뒤 구분자(Delimiter)로 이어서 코드값을 생성)
   */
  const codeDataWithPrefix = items
    .filter(i => i.type === 'data' || i.type === 'date')
    .map(i => {
      // 1. 데이터 값 가져오기 (날짜는 포맷 적용)
      let val = i.type === 'date' ? getFormattedDate(i.content) : (dynamicData[i.id] || '');

      // 2. 바코드 포함 시 특수기호/공백 제거 처리
      if (i.type === 'date') {
        val = val.replace(/[-_:\s]/g, ''); 
      }

      // 3. 접두어와 결합
      return `${i.prefix || ''}${val}`;
    })
    .join(delimiter || ''); // 전달받은 구분자로 최종 결합

  /** [렌더링 영역] */
  return (
    <Box 
      ref={ref} 
      sx={{
        position: 'relative', 
        width: `${width}mm`, 
        height: `${height}mm`,
        backgroundColor: '#fff', 
        border: '1px solid #000', 
        boxSizing: 'border-box', 
        color: '#000',
        // 인쇄 시 레이아웃 깨짐 방지 설정
        breakInside: 'avoid', 
        pageBreakInside: 'avoid', 
        overflow: 'hidden',
      }}
    >
      {/* 레이어 순서를 유지하기 위해 배열을 역순으로 렌더링 
        (디자인 툴의 리스트 상단 항목이 화면상 가장 위에 오도록 처리)
      */}
      {[...items].reverse().map((item) => {
        let displayContent = item.content;
        
        // 항목 타입에 따른 표시 데이터 결정
        if (item.type === 'data') {
          displayContent = dynamicData[item.id] || ''; 
        } else if (item.type === 'date') {
          displayContent = getFormattedDate(item.content); 
        }

        return (
          <div 
            key={item.id} 
            style={{ 
              position: 'absolute', 
              left: `${item.x * MM_PX_UNIT}px`, 
              top: `${item.y * MM_PX_UNIT}px`, 
              lineHeight: 1, 
              zIndex: 1 
            }}
          >
            {/* 1. 일반 텍스트 / 데이터 / 날짜 출력 */}
            {(item.type === 'text' || item.type === 'data' || item.type === 'date') && (
              <Typography 
                sx={{ 
                  fontSize: `${item.fontSize}pt`, 
                  fontWeight: item.fontWeight || 'normal', 
                  color: '#000', 
                  whiteSpace: 'nowrap' 
                }}
              >
                {displayContent}
              </Typography>
            )}

            {/* 2. 바코드 출력 */}
            {item.type === 'barcode' && (
              <div style={{ lineHeight: 0 }}>
                <Barcode 
                  value={codeDataWithPrefix || 'NO DATA'} 
                  width={item.width || 1.2} 
                  height={item.height} 
                  displayValue={false} 
                  margin={0} 
                />
              </div>
            )}

            {/* 3. QR코드 출력 */}
            {item.type === 'qrcode' && (
              <div style={{ lineHeight: 0 }}>
                <QRCode 
                  value={codeDataWithPrefix || 'NO DATA'} 
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