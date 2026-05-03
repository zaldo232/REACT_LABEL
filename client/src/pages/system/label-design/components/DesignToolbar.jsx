/**
 * @file        DesignToolbar.jsx
 * @description 라벨 디자인 페이지의 좌측 도구 모음(툴바) 컴포넌트
 * - [포맷팅] 프로젝트 규칙에 따른 수직 정렬 및 블록 주석 적용 완료
 */

import React from 'react';
import { 
  Paper, 
  Tooltip, 
  IconButton, 
  Divider 
} from '@mui/material';

// 도구 아이콘 임포트
import CursorIcon from '@mui/icons-material/NearMe';
import PanToolIcon from '@mui/icons-material/PanTool';
import TitleIcon from '@mui/icons-material/Title';
import DataObjectIcon from '@mui/icons-material/DataObject';
import EventIcon from '@mui/icons-material/Event';
import TableChartIcon from '@mui/icons-material/TableChart';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import MaximizeIcon from '@mui/icons-material/Maximize';
import ImageIcon from '@mui/icons-material/Image';
import BarcodeIcon from '@mui/icons-material/ViewColumn';
import QrCodeIcon from '@mui/icons-material/QrCode';

// =========================================================================
// [컴포넌트] DesignToolbar
// =========================================================================
const DesignToolbar = ({ 
  activeTool, 
  handleToolChange 
}) => {
  // 생성 가능한 툴 목록 배열
  const toolList = [
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
  ];

  // =========================================================================
  // 렌더링 영역
  // =========================================================================
  return (
    <Paper 
      elevation={0} 
      sx={{ 
        width:           60, 
        display:         'flex', 
        flexDirection:   'column', 
        alignItems:      'center', 
        py:              2, 
        gap:             1, 
        backgroundColor: (theme) => theme.palette.layout.sidebar.background, 
        color:           (theme) => theme.palette.layout.sidebar.font, 
        borderRight:     (theme) => `1px solid ${theme.palette.layout.sidebar.border}`,
        borderRadius:    0, 
        zIndex:          12 
      }}
    >
      {/* 1. 기본 조작 툴 (선택, 화면 이동) */}
      <Tooltip 
        title="선택 (Ctrl: 다중, Shift: 범위)" 
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
      
      {/* 2. 개체 생성 툴 목록 매핑 */}
      {toolList.map((tool) => (
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
  );
};

export default DesignToolbar;