/**
 * @file        DesignLayerList.jsx
 * @description 라벨 디자인 페이지의 우측 하단 레이어 목록(Reorder) 패널 컴포넌트
 * - [포맷팅] 프로젝트 규칙에 따른 JSX 속성 및 Object 내부 수직 정렬 완벽 적용
 * - [기능] framer-motion을 이용한 레이어 Z-Index 순서 드래그 앤 드롭 변경
 * - [기능] 표(Table) 개체 하위에 종속된 개별 셀(Cell) 레이어 트리 뷰 및 가시성 제어 지원
 */

import React from 'react';

// MUI 컴포넌트 임포트
import { 
  Box, 
  Typography, 
  IconButton, 
  Paper as MuiPaper 
} from '@mui/material';

// 드래그 앤 드롭 애니메이션 라이브러리
import { Reorder } from 'framer-motion';

// 아이콘 임포트
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

// =========================================================================
// 공통 유틸리티 헬퍼 함수
// =========================================================================

/**
 * 표(Table) 병합(RowSpan/ColSpan)으로 인해 화면과 데이터에서 
 * 가려져야 할 유령 셀들의 ID(row_col)를 Set으로 반환합니다.
 */
const getHiddenCells = (item) => {
  const hidden = new Set();
  
  if (item.type === 'table' && item.cells) {
    item.cells.forEach(c => {
      if ((c.rowSpan || 1) > 1 || (c.colSpan || 1) > 1) {
        for (let r = 0; r < (c.rowSpan || 1); r++) {
          for (let col = 0; col < (c.colSpan || 1); col++) {
            // 본체 셀(0,0)은 살려두고, 확장된 영역만 숨김 처리
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
// [컴포넌트] DesignLayerList
// =========================================================================
const DesignLayerList = ({
  items,
  updateItems,
  selectedIds,
  handleItemClick,
  toggleTableExpand,
  expandedTableIds,
  updateItem,
  updateTableCell
}) => {

  // =========================================================================
  // 렌더링 영역
  // =========================================================================
  return (
    <Box 
      sx={{ 
        p:               2, 
        height:          350, 
        display:         'flex', 
        flexDirection:   'column', 
        backgroundColor: (theme) => theme.palette.layout.design.layerBg 
      }}
    >
      <Typography 
        variant="subtitle2" 
        gutterBottom 
        fontWeight="bold" 
        color="secondary"
      >
        Layers
      </Typography>
      
      <Box 
        sx={{ 
          flex:      1, 
          overflowY: 'auto' 
        }}
      >
        <Reorder.Group 
          axis="y" 
          values={items} 
          onReorder={(newItems) => updateItems(newItems, true)} 
          style={{ 
            listStyle: 'none', 
            padding:   0 
          }}
        >
          {items.map((item) => {
            const hiddenCells = getHiddenCells(item);

            return (
              <Reorder.Item 
                key={item.id} 
                value={item}
              >
                {/* --- 1. 메인 개체 (Layer) 렌더링 --- */}
                <MuiPaper 
                  elevation={0} 
                  onClick={(e) => handleItemClick(e, item.id, true)} 
                  sx={{ 
                    p:               1, 
                    mb:              0.5, 
                    display:         'flex', 
                    alignItems:      'center', 
                    gap:             1, 
                    border:          selectedIds.includes(item.id) ? (theme) => `1.5px solid ${theme.palette.primary.main}` : '1px solid', 
                    borderColor:     'divider', 
                    cursor:          'pointer', 
                    backgroundColor: selectedIds.includes(item.id) ? 'action.selected' : 'background.paper' 
                  }}
                >
                  <DragIndicatorIcon 
                    fontSize="small" 
                    sx={{ 
                      color: 'text.secondary' 
                    }} 
                  />
                  
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      flex:       1, 
                      fontWeight: 'bold' 
                    }}
                  >
                    {item.label}
                  </Typography>
                  
                  {/* 표(Table) 개체일 경우 하위 셀 목록 펼치기/접기 버튼 */}
                  {item.type === 'table' && (
                    <IconButton 
                      size="small" 
                      onClick={(e) => toggleTableExpand(e, item.id)}
                    >
                      {expandedTableIds.includes(item.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  )}
                  
                  {/* 레이어 가시성(눈 모양) 토글 버튼 */}
                  <IconButton 
                    size="small" 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      updateItem(item.id, 'visible', !item.visible, true); 
                    }}
                  >
                    <VisibilityIcon 
                      fontSize="inherit" 
                      color={item.visible ? 'action' : 'disabled'} 
                    />
                  </IconButton>
                </MuiPaper>

                {/* --- 2. 표(Table) 서브 레이어(셀) 목록 렌더링 --- */}
                {item.type === 'table' && expandedTableIds.includes(item.id) && (
                  <Box 
                    sx={{ 
                      pl: 4, 
                      pr: 1, 
                      pb: 1 
                    }}
                  >
                    {item.cells?.map((cell, cIdx) => {
                       // 병합되어 가려진 유령 셀은 렌더링하지 않음
                       if (hiddenCells.has(`${cell.row}_${cell.col}`)) return null; 
                       
                       return (
                         <MuiPaper 
                           key={cIdx} 
                           elevation={0} 
                           sx={{ 
                             p:               1, 
                             mb:              0.5, 
                             display:         'flex', 
                             alignItems:      'center', 
                             backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', 
                             border:          (theme) => `1px solid ${theme.palette.divider}` 
                           }}
                         >
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                flex:  1, 
                                color: 'text.secondary' 
                              }}
                            >
                              {cell.cellName ? `${cell.cellName} (${cell.row + 1},${cell.col + 1})` : `셀 (${cell.row + 1}행 ${cell.col + 1}열)`} - {cell.cellType.toUpperCase()}
                            </Typography>
                            
                            {/* 개별 셀 가시성(눈 모양) 토글 버튼 */}
                            <IconButton 
                              size="small" 
                              onClick={(e) => {
                                 e.stopPropagation();
                                 updateTableCell(item.id, cell.row, cell.col, { visible: cell.visible === false ? true : false }, true);
                              }}
                            >
                               <VisibilityIcon 
                                 fontSize="inherit" 
                                 color={cell.visible !== false ? 'action' : 'disabled'} 
                               />
                            </IconButton>
                         </MuiPaper>
                       );
                    })}
                  </Box>
                )}
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      </Box>
    </Box>
  );
};

export default DesignLayerList;