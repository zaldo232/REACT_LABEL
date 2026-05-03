/**
 * @file        DesignProperties.jsx
 * @description 라벨 디자인 페이지의 우측 상단 속성(Properties) 제어 패널
 * - [UX 개선] 엑셀처럼 테두리를 켜거나 끌 때, 맞닿은 인접 셀의 테두리도 함께 제어되는 동기화 로직 추가
 * - [포맷팅] 프로젝트 코딩 규칙에 따른 JSX 속성 수직 정렬 및 완벽한 코드 보존 적용
 */

import React from 'react';

// MUI 컴포넌트 임포트
import { 
  Box, 
  Typography, 
  Stack, 
  TextField, 
  Button, 
  Divider, 
  IconButton, 
  FormControlLabel, 
  Checkbox, 
  Slider, 
  Tooltip, 
  Paper as MuiPaper, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel 
} from '@mui/material';

// 아이콘 임포트
import DeleteIcon from '@mui/icons-material/Delete';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import AlignHorizontalLeftIcon from '@mui/icons-material/AlignHorizontalLeft';
import AlignHorizontalCenterIcon from '@mui/icons-material/AlignHorizontalCenter';
import AlignHorizontalRightIcon from '@mui/icons-material/AlignHorizontalRight';
import AlignVerticalTopIcon from '@mui/icons-material/AlignVerticalTop';
import AlignVerticalCenterIcon from '@mui/icons-material/AlignVerticalCenter';
import AlignVerticalBottomIcon from '@mui/icons-material/AlignVerticalBottom';
import ViewColumnIcon from '@mui/icons-material/ViewColumn'; 
import TableRowsIcon from '@mui/icons-material/TableRows';
import CallMergeIcon from '@mui/icons-material/CallMerge';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import AddRowIcon from '@mui/icons-material/TableRows';
import AddColIcon from '@mui/icons-material/ViewColumn';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';

// 테두리(Border) 제어 전용 엑셀 스타일 아이콘
import BorderTopIcon from '@mui/icons-material/BorderTop';
import BorderBottomIcon from '@mui/icons-material/BorderBottom';
import BorderLeftIcon from '@mui/icons-material/BorderLeft';
import BorderRightIcon from '@mui/icons-material/BorderRight';
import BorderAllIcon from '@mui/icons-material/BorderAll';
import BorderClearIcon from '@mui/icons-material/BorderClear';

// =========================================================================
// [컴포넌트] DesignProperties
// =========================================================================
const DesignProperties = ({
  selectedIds,
  targetItem,
  selectedCells,
  activeCell,
  layout,
  setLayout,
  templateName,
  setTemplateName,
  isMasterInputVisible,
  masterInputText,
  setIsMasterFocused,
  handleCombinedDataChange,
  takeSnapshot,
  updateItem,
  alignSelectedItems,
  handleLayerOrder,
  handleMergeCells,
  handleUnmergeCells,
  modifyTableStructure,
  updateTableCell,
  deleteSelectedItems,
  imageInputRef,
  handleImageUpload,
  getRealBBox
}) => {

  const isTextType = targetItem && ['text', 'data', 'date'].includes(targetItem.type);

  const repCell = activeCell || (
    targetItem?.type === 'table' && selectedCells.length > 0 
      ? targetItem.cells.find(c => c.row === selectedCells[0].row && c.col === selectedCells[0].col) 
      : null
  );

  // ★ 다중 셀 선택 시: 엑셀 스타일 인접 셀 테두리 완벽 동기화 로직
  const applyBordersToSelectedCells = (borderUpdates) => {
    if (!targetItem || targetItem.type !== 'table') return;
    
    const newCells = targetItem.cells.map(c => ({ ...c }));
    
    // 1. 선택된 본체 셀들의 테두리 상태 우선 업데이트
    selectedCells.forEach(sc => {
      const cell = newCells.find(c => c.row === sc.row && c.col === sc.col);
      if (cell) {
        Object.assign(cell, borderUpdates);
      }
    });
    
    // 2. 수학적 좌표 계산을 통해 맞닿아 있는 인접 셀의 선 상태를 강제 동기화
    selectedCells.forEach(sc => {
      const cell = newCells.find(c => c.row === sc.row && c.col === sc.col);
      if (!cell) return;
      
      const rSpan = cell.rowSpan || 1;
      const cSpan = cell.colSpan || 1;

      newCells.forEach(adj => {
        const adjRSpan = adj.rowSpan || 1;
        const adjCSpan = adj.colSpan || 1;

        if (borderUpdates.borderTop !== undefined && adj.row + adjRSpan - 1 === cell.row - 1) {
          if (Math.max(cell.col, adj.col) <= Math.min(cell.col + cSpan - 1, adj.col + adjCSpan - 1)) {
            adj.borderBottom = borderUpdates.borderTop;
          }
        }
        if (borderUpdates.borderBottom !== undefined && adj.row === cell.row + rSpan) {
          if (Math.max(cell.col, adj.col) <= Math.min(cell.col + cSpan - 1, adj.col + adjCSpan - 1)) {
            adj.borderTop = borderUpdates.borderBottom;
          }
        }
        if (borderUpdates.borderLeft !== undefined && adj.col + adjCSpan - 1 === cell.col - 1) {
          if (Math.max(cell.row, adj.row) <= Math.min(cell.row + rSpan - 1, adj.row + adjRSpan - 1)) {
            adj.borderRight = borderUpdates.borderLeft;
          }
        }
        if (borderUpdates.borderRight !== undefined && adj.col === cell.col + cSpan) {
          if (Math.max(cell.row, adj.row) <= Math.min(cell.row + rSpan - 1, adj.row + adjRSpan - 1)) {
            adj.borderLeft = borderUpdates.borderRight;
          }
        }
      });
    });
    
    updateItem(targetItem.id, 'cells', newCells, true);
  };

  // =========================================================================
  // 렌더링 영역
  // =========================================================================
  return (
    <Box 
      sx={{ 
        p:         2, 
        flex:      1, 
        overflowY: 'auto',
        overflowX: 'hidden'
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
      
      {/* ========================================================================= */}
      {/* 개체가 선택되었을 때의 속성 패널 */}
      {/* ========================================================================= */}
      {selectedIds.length > 0 ? (
        <Stack spacing={2.5}>
          
          {/* ------------------------------------------------------------------------- */}
          {/* 다중 개체 정렬 툴바 (2개 이상 선택 시) */}
          {/* ------------------------------------------------------------------------- */}
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

          {/* ------------------------------------------------------------------------- */}
          {/* 단일 개체 속성 패널 (1개 선택 시) */}
          {/* ------------------------------------------------------------------------- */}
          {selectedIds.length === 1 && (
            <>
              {/* ========================================================================= */}
              {/* [섹션 1] 크기 및 위치 (Transform) */}
              {/* ========================================================================= */}
              <Typography 
                variant="caption" 
                fontWeight="bold" 
                color="primary" 
                sx={{ 
                  mt:      1, 
                  mb:      0.5, 
                  display: 'block' 
                }}
              >
                크기 및 위치 (Transform)
              </Typography>

              <TextField 
                label="레이어 이름" 
                size="small" 
                fullWidth 
                value={targetItem?.label || ''} 
                onChange={(e) => updateItem(selectedIds[0], 'label', e.target.value, false)} 
                onBlur={takeSnapshot}
              />

              <Stack 
                direction="row" 
                spacing={1} 
                sx={{ mt: 2 }}
              >
                <TextField 
                  label="X위치(mm)" 
                  type="number" 
                  size="small" 
                  value={targetItem?.x ?? ''} 
                  onChange={(e) => updateItem(selectedIds[0], 'x', e.target.value, false)} 
                  onBlur={(e) => {
                    let val = parseFloat(e.target.value);
                    if(isNaN(val) || val < 0) val = 0;
                    const maxW = parseFloat(layout.labelW) || 100;
                    const bbox = getRealBBox(targetItem);
                    if(val + bbox.w > maxW) val = maxW - bbox.w;
                    updateItem(selectedIds[0], 'x', Number(val), true);
                  }}
                  inputProps={{ step: 0.1 }}
                />
                <TextField 
                  label="Y위치(mm)" 
                  type="number" 
                  size="small" 
                  value={targetItem?.y ?? ''} 
                  onChange={(e) => updateItem(selectedIds[0], 'y', e.target.value, false)} 
                  onBlur={(e) => {
                    let val = parseFloat(e.target.value);
                    if(isNaN(val) || val < 0) val = 0;
                    const maxH = parseFloat(layout.labelH) || 50;
                    const bbox = getRealBBox(targetItem);
                    if(val + bbox.h > maxH) val = maxH - bbox.h;
                    updateItem(selectedIds[0], 'y', Number(val), true);
                  }}
                  inputProps={{ step: 0.1 }}
                />
              </Stack>
              
              {!['text', 'data', 'date'].includes(targetItem?.type) && (
                <Stack 
                  direction="row" 
                  spacing={1} 
                  sx={{ mt: 2 }}
                >
                  {targetItem?.type === 'qrcode' ? (
                    <TextField 
                      label="크기(W/H)" 
                      type="number" 
                      size="small" 
                      fullWidth 
                      value={targetItem?.width ?? ''} 
                      onChange={(e) => updateItem(selectedIds[0], 'width', e.target.value, false)} 
                      onBlur={(e) => {
                        let val = parseFloat(e.target.value);
                        if(isNaN(val) || val < 0.1) val = 10;
                        const maxW = parseFloat(layout.labelW) || 100;
                        const cx   = parseFloat(targetItem.x) || 0;
                        if(cx + val > maxW) val = maxW - cx;
                        updateItem(selectedIds[0], 'width', Number(val), true);
                        updateItem(selectedIds[0], 'height', Number(val), true);
                      }}
                      inputProps={{ 
                        step: 0.1, 
                        min:  0.1 
                      }}
                    />
                  ) : (
                    <>
                      <TextField 
                        label="너비(W)" 
                        type="number" 
                        size="small" 
                        value={targetItem?.width ?? ''} 
                        onChange={(e) => updateItem(selectedIds[0], 'width', e.target.value, false)} 
                        onBlur={(e) => {
                          let val = parseFloat(e.target.value);
                          if(isNaN(val) || val < 0.1) val = 10;
                          const maxW = parseFloat(layout.labelW) || 100;
                          const cx   = parseFloat(targetItem.x) || 0;
                          if(cx + val > maxW) val = maxW - cx;
                          updateItem(selectedIds[0], 'width', Number(val), true);
                        }}
                        inputProps={{ 
                          step: 0.1, 
                          min:  0.1 
                        }}
                      />
                      {targetItem?.type !== 'line' && (
                        <TextField 
                          label="높이(H)" 
                          type="number" 
                          size="small" 
                          value={targetItem?.height ?? ''} 
                          onChange={(e) => updateItem(selectedIds[0], 'height', e.target.value, false)} 
                          onBlur={(e) => {
                            let val = parseFloat(e.target.value);
                            if(isNaN(val) || val < 0.1) val = 10;
                            const maxH = parseFloat(layout.labelH) || 50;
                            const cy   = parseFloat(targetItem.y) || 0;
                            if(cy + val > maxH) val = maxH - cy;
                            updateItem(selectedIds[0], 'height', Number(val), true);
                          }}
                          inputProps={{ 
                            step: 0.1, 
                            min:  0.1 
                          }}
                        />
                      )}
                    </>
                  )}
                </Stack>
              )}

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
                    onChange={(e, v) => updateItem(selectedIds[0], 'rotate', String(v), false)} 
                    onChangeCommitted={takeSnapshot}
                  />
                  <TextField 
                    size="small" 
                    variant="outlined" 
                    type="number" 
                    value={targetItem?.rotate ?? ''} 
                    onChange={(e) => updateItem(selectedIds[0], 'rotate', e.target.value, false)} 
                    onBlur={(e) => {
                      let val = parseFloat(e.target.value);
                      if(isNaN(val)) val = 0;
                      updateItem(selectedIds[0], 'rotate', Number(val), true);
                    }}
                    sx={{ 
                      width: 100 
                    }} 
                    inputProps={{ 
                      step:  1, 
                      style: { 
                        fontSize:  '0.75rem', 
                        textAlign: 'center', 
                        padding:   '6px' 
                      } 
                    }} 
                  />
                </Stack>
              </MuiPaper>

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
                    <IconButton 
                      size="small" 
                      onClick={() => handleLayerOrder('front')}
                    >
                      <KeyboardDoubleArrowUpIcon fontSize="small"/>
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="앞으로 가져오기">
                    <IconButton 
                      size="small" 
                      onClick={() => handleLayerOrder('forward')}
                    >
                      <KeyboardArrowUpIcon fontSize="small"/>
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="뒤로 보내기">
                    <IconButton 
                      size="small" 
                      onClick={() => handleLayerOrder('backward')}
                    >
                      <KeyboardArrowDownIcon fontSize="small"/>
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="맨 뒤로 보내기">
                    <IconButton 
                      size="small" 
                      onClick={() => handleLayerOrder('back')}
                    >
                      <KeyboardDoubleArrowDownIcon fontSize="small"/>
                    </IconButton>
                  </Tooltip>
                </Stack>
              </MuiPaper>

              <FormControlLabel 
                control={
                  <Checkbox 
                    size="small" 
                    checked={targetItem?.useSnap || false} 
                    onChange={(e) => updateItem(selectedIds[0], 'useSnap', e.target.checked, true)} 
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

              <Divider sx={{ my: 1 }} />

              {/* ========================================================================= */}
              {/* [섹션 2] 데이터 및 내용 (Content) */}
              {/* ========================================================================= */}
              <Typography 
                variant="caption" 
                fontWeight="bold" 
                color="primary" 
                sx={{ 
                  mt:      1, 
                  mb:      0.5, 
                  display: 'block' 
                }}
              >
                데이터 및 내용 (Content)
              </Typography>

              {isMasterInputVisible && (
                <MuiPaper 
                  variant="outlined" 
                  sx={{ 
                    p:               1.5, 
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(2, 136, 209, 0.08)', 
                    borderColor:     (theme) => theme.palette.mode === 'dark' ? '#38bdf8' : 'info.main'
                  }}
                >
                  <Typography 
                    variant="caption" 
                    fontWeight="bold" 
                    color={(theme) => theme.palette.mode === 'dark' ? '#38bdf8' : 'info.main'} 
                    display="block" 
                    mb={1}
                  >
                    💡 가변 데이터 일괄 편집 (동기화)
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
                    onBlur={() => { 
                      setIsMasterFocused(false); 
                      takeSnapshot(); 
                    }} 
                    helperText={`구분자 '${layout.delimiter || '없음'}' 기준으로 각 데이터 셀에 자동 분배됩니다.`}
                  />
                </MuiPaper>
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
                  onChange={(e) => updateItem(selectedIds[0], 'content', e.target.value, false)} 
                  onBlur={takeSnapshot} 
                  sx={{ mt: 2 }} 
                />
              ) : null}

              {['data', 'date'].includes(targetItem?.type) && (
                <Box sx={{ mt: 2 }}>
                  <Stack 
                    direction="row" 
                    spacing={1}
                  >
                    <TextField 
                      label="접두사(Prefix)" 
                      size="small" 
                      value={targetItem?.prefix || ''} 
                      onChange={(e) => updateItem(selectedIds[0], 'prefix', e.target.value, false)} 
                      onBlur={takeSnapshot} 
                    />
                    <TextField 
                      label="접미사(Suffix)" 
                      size="small" 
                      value={targetItem?.suffix || ''} 
                      onChange={(e) => updateItem(selectedIds[0], 'suffix', e.target.value, false)} 
                      onBlur={takeSnapshot} 
                    />
                  </Stack>
                  <FormControlLabel 
                    control={
                      <Checkbox 
                        size="small" 
                        checked={targetItem?.showPrefixSuffixOnLabel !== false} 
                        onChange={(e) => updateItem(selectedIds[0], 'showPrefixSuffixOnLabel', e.target.checked, true)} 
                      />
                    } 
                    label={
                      <Typography 
                        variant="caption" 
                        fontWeight="bold"
                      >
                        화면(라벨)에도 접두/접미사 표시
                      </Typography>
                    } 
                    sx={{ 
                      mt: 0.5, 
                      ml: 0.5 
                    }} 
                  />
                </Box>
              )}

              {targetItem?.type === 'image' && (
                <Button 
                  variant="outlined" 
                  startIcon={<AddPhotoAlternateIcon />} 
                  fullWidth 
                  sx={{ mt: 2 }} 
                  onClick={() => imageInputRef.current.click()}
                >
                  이미지 선택
                </Button>
              )}

              <Divider sx={{ my: 1 }} />

              {/* ========================================================================= */}
              {/* [섹션 3] 스타일 및 꾸미기 (Style) */}
              {/* ========================================================================= */}
              <Typography 
                variant="caption" 
                fontWeight="bold" 
                color="primary" 
                sx={{ 
                  mt:      1, 
                  mb:      0.5, 
                  display: 'block' 
                }}
              >
                스타일 및 꾸미기 (Style)
              </Typography>

              {['text', 'data', 'date', 'table'].includes(targetItem?.type) && (
                <MuiPaper 
                  variant="outlined" 
                  sx={{ 
                    p:               1.5, 
                    backgroundColor: 'action.hover', 
                    mt:              1 
                  }}
                >
                   <Stack 
                     direction="row" 
                     spacing={1} 
                     alignItems="center"
                   >
                     <TextField 
                       label="기본 폰트(pt)" 
                       type="number" 
                       size="small" 
                       value={targetItem?.fontSize ?? ''} 
                       onChange={(e) => updateItem(selectedIds[0], 'fontSize', e.target.value, false)} 
                       onBlur={(e) => {
                         let val = parseFloat(e.target.value);
                         if(isNaN(val) || val < 1) val = 10;
                         updateItem(selectedIds[0], 'fontSize', Number(val), true);
                       }}
                       inputProps={{ 
                         step: 0.5, 
                         min:  1 
                       }}
                     />
                     <Tooltip title="굵게 (Bold)">
                       <IconButton 
                         size="small" 
                         color={targetItem?.fontWeight === 'bold' ? 'primary' : 'default'} 
                         onClick={() => updateItem(selectedIds[0], 'fontWeight', targetItem?.fontWeight === 'bold' ? 'normal' : 'bold', true)}
                       >
                         <FormatBoldIcon fontSize="small" />
                       </IconButton>
                     </Tooltip>
                     <Tooltip title="기울임 (Italic)">
                       <IconButton 
                         size="small" 
                         color={targetItem?.fontStyle === 'italic' ? 'primary' : 'default'} 
                         onClick={() => updateItem(selectedIds[0], 'fontStyle', targetItem?.fontStyle === 'italic' ? 'normal' : 'italic', true)}
                       >
                         <FormatItalicIcon fontSize="small" />
                       </IconButton>
                     </Tooltip>
                   </Stack>
                </MuiPaper>
              )}

              {['rect', 'circle', 'table', 'line'].includes(targetItem?.type) && (
                <Box sx={{ mt: 1 }}>
                  
                  {['rect', 'circle', 'table'].includes(targetItem?.type) && (
                    <Box>
                      <Stack 
                        direction="row" 
                        spacing={1} 
                        alignItems="center" 
                        mt={1}
                      >
                        <Typography 
                          variant="caption" 
                          fontWeight="bold" 
                          sx={{ width: 45 }}
                        >
                          선 색상
                        </Typography>
                        <input 
                          type="color" 
                          value={targetItem?.stroke || '#000000'} 
                          onChange={(e) => updateItem(selectedIds[0], 'stroke', e.target.value, false)} 
                          onBlur={takeSnapshot}
                          style={{ 
                            width:   30, 
                            height:  30, 
                            padding: 0, 
                            border:  '1px solid #ccc', 
                            cursor:  'pointer' 
                          }}
                        />
                        <TextField 
                          label="선 두께(mm)" 
                          type="number" 
                          size="small" 
                          value={targetItem?.borderWidth ?? ''} 
                          onChange={(e) => updateItem(selectedIds[0], 'borderWidth', e.target.value, false)}
                          onBlur={(e) => {
                            let val = parseFloat(e.target.value);
                            if(isNaN(val) || val < 0) val = 0; 
                            updateItem(selectedIds[0], 'borderWidth', Number(val), true);
                          }}
                          inputProps={{ 
                            step: 0.1, 
                            min:  0 
                          }} 
                          sx={{ 
                            width: 100, 
                            ml:    1 
                          }}
                        />
                      </Stack>
                      
                      <Stack 
                        direction="row" 
                        spacing={1} 
                        alignItems="center" 
                        mt={1.5}
                      >
                        <Typography 
                          variant="caption" 
                          fontWeight="bold" 
                          sx={{ width: 45 }}
                        >
                          채우기
                        </Typography>
                        {targetItem?.transparent === false && (
                          <input 
                            type="color" 
                            value={targetItem?.fill || '#ffffff'} 
                            onChange={(e) => updateItem(selectedIds[0], 'fill', e.target.value, false)} 
                            onBlur={takeSnapshot}
                            style={{ 
                              width:   30, 
                              height:  30, 
                              padding: 0, 
                              border:  '1px solid #ccc', 
                              cursor:  'pointer' 
                            }}
                          />
                        )}
                        <FormControlLabel 
                          control={
                            <Checkbox 
                              size="small" 
                              checked={targetItem?.transparent !== false} 
                              onChange={(e) => updateItem(selectedIds[0], 'transparent', e.target.checked, true)} 
                            />
                          }
                          label={
                            <Typography 
                              variant="caption" 
                              fontWeight="bold"
                            >
                              채우기 없음(투명)
                            </Typography>
                          } 
                          sx={{ 
                            ml: targetItem?.transparent === false ? 1 : 0 
                          }}
                        />
                      </Stack>
                    </Box>
                  )}

                  {targetItem?.type === 'line' && (
                    <Stack 
                      direction="row" 
                      spacing={1} 
                      alignItems="center" 
                      mt={1}
                    >
                      <Typography 
                        variant="caption" 
                        fontWeight="bold"
                      >
                        선 색상
                      </Typography>
                      <input 
                        type="color" 
                        value={targetItem?.stroke || '#000000'} 
                        onChange={(e) => updateItem(selectedIds[0], 'stroke', e.target.value, false)} 
                        onBlur={takeSnapshot}
                        style={{ 
                          width:   30, 
                          height:  30, 
                          padding: 0, 
                          border:  '1px solid #ccc', 
                          cursor:  'pointer' 
                        }}
                      />
                      <TextField 
                        label="선 두께(mm)" 
                        type="number" 
                        size="small" 
                        value={targetItem?.height ?? ''} 
                        onChange={(e) => updateItem(selectedIds[0], 'height', e.target.value, false)}
                        onBlur={(e) => {
                          let val = parseFloat(e.target.value);
                          if(isNaN(val) || val <= 0) val = 0.5; 
                          updateItem(selectedIds[0], 'height', Number(val), true);
                        }}
                        inputProps={{ 
                          step: 0.1, 
                          min:  0.1 
                        }} 
                        sx={{ 
                          width: 100, 
                          ml:    1 
                        }}
                      />
                    </Stack>
                  )}

                  {targetItem?.type === 'table' && (
                    <FormControlLabel 
                      control={
                        <Checkbox 
                          size="small" 
                          checked={targetItem.showBorder !== false} 
                          onChange={(e) => updateItem(targetItem.id, 'showBorder', e.target.checked, true)} 
                        />
                      } 
                      label={
                        <Typography 
                          variant="caption" 
                          fontWeight="bold"
                        >
                          표(Table) 전체 외곽선 제어 (마스터)
                        </Typography>
                      } 
                      sx={{ mt: 0.5 }}
                    />
                  )}
                </Box>
              )}

              {/* ========================================================================= */}
              {/* [섹션 4] 표(Table) 전용 셀 및 구조 편집 */}
              {/* ========================================================================= */}
              {targetItem?.type === 'table' && selectedCells.length > 0 && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography 
                    variant="caption" 
                    fontWeight="bold" 
                    color="primary" 
                    sx={{ 
                      mt:      1, 
                      mb:      0.5, 
                      display: 'block' 
                    }}
                  >
                    표(Table) 셀/구조 설정
                  </Typography>

                  <MuiPaper 
                    variant="outlined" 
                    sx={{ 
                      p:               1.5, 
                      backgroundColor: 'action.hover', 
                      mt:              1 
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
                        {selectedCells.length > 1 ? `${selectedCells.length}개의 셀 다중 선택됨` : `단일 셀 설정 (${repCell?.row + 1}행 ${repCell?.col + 1}열)`}
                      </Typography>
                    </Stack>

                    {/* ★ 엑셀 표 스타일 테두리(Border) 제어 UI (다중 셀 동시 제어 지원) */}
                    <Typography 
                      variant="caption" 
                      fontWeight="bold" 
                      color="primary" 
                      sx={{ 
                        mt:      1, 
                        mb:      1, 
                        display: 'block' 
                      }}
                    >
                      선택 영역 테두리 지정
                    </Typography>
                    <Stack 
                      direction="row" 
                      spacing={0.5} 
                      sx={{ mb: 2 }}
                    >
                      <Tooltip title="모든 테두리">
                        <IconButton 
                          size="small" 
                          onClick={() => applyBordersToSelectedCells({ borderTop: true, borderBottom: true, borderLeft: true, borderRight: true })}
                        >
                          <BorderAllIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="테두리 없음">
                        <IconButton 
                          size="small" 
                          onClick={() => applyBordersToSelectedCells({ borderTop: false, borderBottom: false, borderLeft: false, borderRight: false })}
                        >
                          <BorderClearIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                      <Tooltip title="위쪽 테두리 토글">
                        <IconButton 
                          size="small" 
                          color={repCell?.borderTop !== false ? 'primary' : 'default'} 
                          onClick={() => applyBordersToSelectedCells({ borderTop: repCell ? repCell.borderTop === false : true })}
                        >
                          <BorderTopIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="아래쪽 테두리 토글">
                        <IconButton 
                          size="small" 
                          color={repCell?.borderBottom !== false ? 'primary' : 'default'} 
                          onClick={() => applyBordersToSelectedCells({ borderBottom: repCell ? repCell.borderBottom === false : true })}
                        >
                          <BorderBottomIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="왼쪽 테두리 토글">
                        <IconButton 
                          size="small" 
                          color={repCell?.borderLeft !== false ? 'primary' : 'default'} 
                          onClick={() => applyBordersToSelectedCells({ borderLeft: repCell ? repCell.borderLeft === false : true })}
                        >
                          <BorderLeftIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="오른쪽 테두리 토글">
                        <IconButton 
                          size="small" 
                          color={repCell?.borderRight !== false ? 'primary' : 'default'} 
                          onClick={() => applyBordersToSelectedCells({ borderRight: repCell ? repCell.borderRight === false : true })}
                        >
                          <BorderRightIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                    
                    <Divider sx={{ mb: 2 }} />

                    {/* 단일 셀 편집 시에만 노출되는 상세 텍스트 및 서식 기능들 */}
                    {selectedCells.length === 1 && repCell && (
                      <>
                        <TextField 
                          label="셀 이름 (별칭)" 
                          size="small" 
                          fullWidth 
                          value={repCell.cellName || ''} 
                          onChange={(e) => updateTableCell(targetItem.id, repCell.row, repCell.col, { cellName: e.target.value }, false)} 
                          onBlur={takeSnapshot} 
                          sx={{ mb: 1 }}
                        />

                        {['text', 'data', 'date'].includes(repCell.cellType) && (
                          <TextField 
                            label="셀 폰트 크기(pt) - 미입력시 상속" 
                            type="number" 
                            size="small" 
                            fullWidth 
                            value={repCell.fontSize || ''} 
                            onChange={(e) => updateTableCell(targetItem.id, repCell.row, repCell.col, { fontSize: e.target.value }, false)} 
                            onBlur={(e) => {
                              let val = parseFloat(e.target.value);
                              if (isNaN(val) || val < 1) val = ''; 
                              updateTableCell(targetItem.id, repCell.row, repCell.col, { fontSize: val === '' ? '' : String(val) }, true);
                            }}
                            inputProps={{ 
                              step: 0.5, 
                              min:  1 
                            }} 
                            sx={{ mb: 1 }}
                          />
                        )}

                        <Typography 
                          variant="caption" 
                          fontWeight="bold" 
                          color="primary" 
                          sx={{ 
                            mt:      1, 
                            mb:      1, 
                            display: 'block' 
                          }}
                        >
                          구조 편집
                        </Typography>
                        
                        {((repCell.rowSpan || 1) > 1 || (repCell.colSpan || 1) > 1) && (
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
                            onClick={() => modifyTableStructure(targetItem.id, 'insert-row', repCell.row + 1)}
                          >
                            행 아래 추가
                          </Button>
                          <Button 
                            variant="outlined" 
                            color="error" 
                            size="small" 
                            fullWidth 
                            onClick={() => modifyTableStructure(targetItem.id, 'delete-row', repCell.row, repCell.rowSpan || 1)}
                          >
                            행 일괄 삭제
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
                            onClick={() => modifyTableStructure(targetItem.id, 'insert-col', repCell.col + 1)}
                          >
                            열 우측 추가
                          </Button>
                          <Button 
                            variant="outlined" 
                            color="error" 
                            size="small" 
                            fullWidth 
                            onClick={() => modifyTableStructure(targetItem.id, 'delete-col', repCell.col, repCell.colSpan || 1)}
                          >
                            열 일괄 삭제
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
                            value={repCell.cellType || 'text'} 
                            label="셀 속성" 
                            onChange={(e) => updateTableCell(targetItem.id, repCell.row, repCell.col, { cellType: e.target.value }, true)}
                          >
                            <MenuItem value="text">고정 텍스트</MenuItem>
                            <MenuItem value="data">가변 데이터(Data)</MenuItem>
                            <MenuItem value="date">날짜(Date)</MenuItem>
                            <MenuItem value="barcode">1D 바코드</MenuItem>
                            <MenuItem value="qrcode">QR코드</MenuItem>
                          </Select>
                        </FormControl>
                        
                        {/* ★ 바코드, QR코드에서는 무의미했던 dataId 입력창을 완벽히 제거. 오직 data 타입일 때만 활성화. */}
                        {repCell.cellType === 'data' && (
                          <TextField 
                            label="가변 데이터 ID" 
                            size="small" 
                            fullWidth 
                            value={repCell.dataId || ''} 
                            onChange={(e) => updateTableCell(targetItem.id, repCell.row, repCell.col, { dataId: e.target.value }, false)} 
                            onBlur={takeSnapshot} 
                            sx={{ mt: 1 }}
                          />
                        )}
                        {repCell.cellType === 'date' && (
                          <TextField 
                            label="날짜 포맷 (예: YYYY-MM-DD)" 
                            size="small" 
                            fullWidth 
                            value={repCell.content || 'YYYY-MM-DD'} 
                            onChange={(e) => updateTableCell(targetItem.id, repCell.row, repCell.col, { content: e.target.value }, false)} 
                            onBlur={takeSnapshot}
                          />
                        )}
                        {repCell.cellType === 'text' && (
                          <TextField 
                            label="텍스트 내용" 
                            size="small" 
                            fullWidth 
                            multiline 
                            value={repCell.content || ''} 
                            onChange={(e) => updateTableCell(targetItem.id, repCell.row, repCell.col, { content: e.target.value }, false)} 
                            onBlur={takeSnapshot}
                          />
                        )}
                        
                        {repCell.cellType === 'barcode' && (
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
                                value={repCell.barcodeType || 'CODE128'} 
                                label="포맷" 
                                onChange={(e) => updateTableCell(targetItem.id, repCell.row, repCell.col, { barcodeType: e.target.value }, true)}
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
                                  checked={repCell.displayValue !== false} 
                                  onChange={(e) => updateTableCell(targetItem.id, repCell.row, repCell.col, { displayValue: e.target.checked }, true)} 
                                />
                              } 
                              label={
                                <Typography 
                                  variant="caption" 
                                  fontWeight="bold"
                                >
                                  바코드 텍스트 표시
                                </Typography>
                              } 
                            />
                          </Stack>
                        )}
                        {repCell.cellType === 'qrcode' && (
                          <FormControl 
                            fullWidth 
                            size="small" 
                            sx={{ mt: 1 }}
                          >
                            <InputLabel>오류 복원율</InputLabel>
                            <Select 
                              value={repCell.qrErrorLevel || 'M'} 
                              label="오류 복원율" 
                              onChange={(e) => updateTableCell(targetItem.id, repCell.row, repCell.col, { qrErrorLevel: e.target.value }, true)}
                            >
                              <MenuItem value="L">L(7%)</MenuItem>
                              <MenuItem value="M">M(15%)</MenuItem>
                              <MenuItem value="Q">Q(25%)</MenuItem>
                              <MenuItem value="H">H(30%)</MenuItem>
                            </Select>
                          </FormControl>
                        )}

                        {['data', 'date'].includes(repCell.cellType) && (
                          <Box sx={{ mt: 1 }}>
                            <Stack 
                              direction="row" 
                              spacing={1}
                            >
                              <TextField 
                                label="접두사(Prefix)" 
                                size="small" 
                                value={repCell.prefix || ''} 
                                onChange={(e) => updateTableCell(targetItem.id, repCell.row, repCell.col, { prefix: e.target.value }, false)} 
                                onBlur={takeSnapshot} 
                              />
                              <TextField 
                                label="접미사(Suffix)" 
                                size="small" 
                                value={repCell.suffix || ''} 
                                onChange={(e) => updateTableCell(targetItem.id, repCell.row, repCell.col, { suffix: e.target.value }, false)} 
                                onBlur={takeSnapshot} 
                              />
                            </Stack>
                            <FormControlLabel 
                              control={
                                <Checkbox 
                                  size="small" 
                                  checked={repCell.showPrefixSuffixOnLabel !== false} 
                                  onChange={(e) => updateTableCell(targetItem.id, repCell.row, repCell.col, { showPrefixSuffixOnLabel: e.target.checked }, true)} 
                                />
                              } 
                              label={
                                <Typography 
                                  variant="caption" 
                                  fontWeight="bold"
                                >
                                  화면(라벨)에도 접두/접미사 표시
                                </Typography>
                              } 
                              sx={{ 
                                mt: 0.5, 
                                ml: 0.5 
                              }} 
                            />
                          </Box>
                        )}
                      </>
                    )}

                    {/* 다중 셀 선택 시 나오는 합치기 버튼 */}
                    {selectedCells.length > 1 && (
                      <Button 
                        variant="contained" 
                        color="primary" 
                        fullWidth 
                        startIcon={<CallMergeIcon />} 
                        onClick={handleMergeCells}
                      >
                        선택한 영역 병합하기
                      </Button>
                    )}
                  </MuiPaper>
                </>
              )}
            </>
          )}
          
          <Divider sx={{ my: 1 }} />

          {/* 공통 액션 */}
          <Button 
            variant="contained" 
            color="error" 
            fullWidth 
            startIcon={<DeleteIcon />} 
            onClick={deleteSelectedItems} 
            sx={{ mt: 2 }}
          >
            삭제 (Del)
          </Button>
        </Stack>
      ) : (
        
        /* 아무것도 선택되지 않았을 때 (전체 라벨 템플릿 설정) */
        <Stack spacing={2}>
          <Typography 
            variant="caption" 
            fontWeight="bold" 
            color="text.secondary"
          >
            라벨 기본 양식 설정
          </Typography>
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
            helperText="바코드 조합 시 데이터 사이에 삽입될 구분자입니다." 
          />
        </Stack>
      )}
    </Box>
  );
};

export default DesignProperties;