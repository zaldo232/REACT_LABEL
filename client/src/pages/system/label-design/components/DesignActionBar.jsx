/**
 * @file        DesignActionBar.jsx
 * @description 라벨 디자인 페이지의 상단 툴바 컴포넌트 (화면 배율, 격자 설정, 파일 입출력 및 저장)
 * - [코드규칙 적용] Props 3개 이상 시 무조건 줄바꿈 및 수직 정렬 완료
 * - [코드규칙 적용] 객체(Object) 선언 내부 요소 줄바꿈 정렬 완료
 * - [UX 처리] 격자 간격 입력창 값을 완전히 지웠을 때 발생하는 NaN 에러 엣지 케이스 방지
 */

import React from 'react';

// MUI 컴포넌트 임포트
import { 
  Paper, 
  Stack, 
  Typography, 
  Slider, 
  FormControlLabel, 
  Checkbox, 
  TextField, 
  Tooltip, 
  IconButton, 
  Divider, 
  Button 
} from '@mui/material';

// 아이콘 임포트
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import GridOnIcon from '@mui/icons-material/GridOn';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SaveIcon from '@mui/icons-material/Save';

// =========================================================================
// [컴포넌트] DesignActionBar
// =========================================================================
const DesignActionBar = ({
  zoom,
  setZoom,
  showGrid,
  setShowGrid,
  gridSize,
  setGridSize,
  snapToGrid,
  setSnapToGrid,
  handleUndo,
  handleRedo,
  historyUIState,
  excelLayoutInputRef,
  handleExcelLayoutParse,
  handleFetchDbList,
  fileInputRef,
  handleImportJson,
  handleExport,
  requestSave,
  templateId
}) => {

  // =========================================================================
  // 이벤트 핸들러 영역
  // =========================================================================

  /**
   * [이벤트] 그리드 간격 입력창 포커스 아웃 (Edge Case 처리)
   * 값을 완전히 지웠거나 0 이하의 값을 넣었을 때 기본값(2)으로 강제 복원합니다.
   */
  const TextField_Blur = (e) => {
    let nGridValue = parseFloat(e.target.value);
    
    if (isNaN(nGridValue) || nGridValue <= 0) {
      nGridValue = 2;
    }
    
    setGridSize(String(nGridValue));
  };

  // =========================================================================
  // 렌더링 영역
  // =========================================================================
  return (
    <Paper 
      elevation={0}
      sx={{ 
        p:               1, 
        display:         'flex', 
        justifyContent:  'space-between', 
        alignItems:      'center', 
        borderRadius:    0, 
        borderBottom:    (theme) => `1px solid ${theme.palette.divider}`, 
        backgroundColor: 'background.paper', 
        zIndex:          12 
      }}
    >
      {/* ------------------------------------------------------------------------- */}
      {/* 좌측: 캔버스 뷰 제어 (줌, 격자, 스냅) */}
      {/* ------------------------------------------------------------------------- */}
      <Stack 
        direction="row" 
        spacing={2} 
        alignItems="center"
      >
        <Typography 
          variant="caption" 
          fontWeight="bold"
        >
          Zoom
        </Typography>
        
        <Slider 
          size="small" 
          value={zoom} 
          min={0.5} 
          max={5.0} 
          step={0.1} 
          onChange={(e, v) => setZoom(v)} 
          sx={{ 
            width: 80 
          }} 
        />
        
        <FormControlLabel 
          control={
            <Checkbox 
              size="small" 
              checked={showGrid} 
              onChange={(e) => setShowGrid(e.target.checked)} 
            />
          } 
          label={
            <Typography variant="caption">
              격자
            </Typography>
          } 
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
              onBlur={TextField_Blur}
              sx={{ 
                width: 65 
              }} 
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
            <Typography 
              variant="caption" 
              color="text.secondary"
            >
              mm
            </Typography>
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
          label={
            <Typography variant="caption">
              스냅
            </Typography>
          } 
        />
      </Stack>
      
      {/* ------------------------------------------------------------------------- */}
      {/* 우측: 기능 버튼 모음 (히스토리, 입출력, 템플릿 제어) */}
      {/* ------------------------------------------------------------------------- */}
      <Stack 
        direction="row" 
        spacing={1}
      >
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
          sx={{ 
            mx: 0.5 
          }} 
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
        
        {/* 숨김 처리된 엑셀 파일 입력 Input */}
        <input 
          type="file" 
          ref={excelLayoutInputRef} 
          style={{ 
            display: 'none' 
          }} 
          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
          onChange={handleExcelLayoutParse} 
        />

        <Divider 
          orientation="vertical" 
          flexItem 
          sx={{ 
            mx: 1 
          }} 
        />

        <Button 
          size="small" 
          variant="outlined" 
          startIcon={<FolderOpenIcon />} 
          onClick={handleFetchDbList}
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
        
        {/* 숨김 처리된 JSON 파일 입력 Input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ 
            display: 'none' 
          }} 
          accept=".json" 
          onChange={handleImportJson} 
        />
      </Stack>
    </Paper>
  );
};

export default DesignActionBar;