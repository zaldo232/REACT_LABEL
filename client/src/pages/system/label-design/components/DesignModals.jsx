/**
 * @file        DesignModals.jsx
 * @description 라벨 디자인 페이지에서 호출되는 모든 팝업(Dialog) 모음 컴포넌트
 */

import React from 'react';

// MUI 컴포넌트 임포트
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemText,
  ListItemIcon,
  IconButton
} from '@mui/material';

// 아이콘 임포트
import CloseIcon from '@mui/icons-material/Close';
import TableViewIcon from '@mui/icons-material/TableView';

// =========================================================================
// [컴포넌트] DesignModals
// =========================================================================
const DesignModals = ({
  openDbDialog,
  setOpenDbDialog,
  dbList,
  setTemplateId,
  setTemplateName,
  layout,
  setLayout,
  initItems,
  handleDeleteTemplate,
  
  // ★ 엑셀 시트 선택 관련 Props
  openExcelSheetDialog,
  setOpenExcelSheetDialog,
  excelSheetNames,
  onSelectExcelSheet
}) => {

  // =========================================================================
  // 렌더링 영역
  // =========================================================================
  return (
    <>
      {/* ------------------------------------------------------------------------- */}
      {/* 1. 디자인 서버 로드 모달 다이얼로그 */}
      {/* ------------------------------------------------------------------------- */}
      <Dialog 
        open={openDbDialog} 
        onClose={() => setOpenDbDialog(false)} 
        fullWidth 
        maxWidth="xs"
      >
        <DialogTitle 
          sx={{ 
            m:              0, 
            p:              2, 
            display:        'flex', 
            justifyContent: 'space-between', 
            alignItems:     'center' 
          }}
        >
          디자인 불러오기
          <IconButton 
            onClick={() => setOpenDbDialog(false)} 
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent dividers>
          <List>
            {dbList.map((t) => (
              <ListItem 
                key={t.TemplateId} 
                disablePadding 
                secondaryAction={
                  <IconButton 
                    edge="end" 
                    color="error" 
                    size="small" 
                    onClick={(e) => handleDeleteTemplate(e, t.TemplateId, t.TemplateName)}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemButton 
                  onClick={() => { 
                    setTemplateId(t.TemplateId); 
                    setTemplateName(t.TemplateName); 
                    
                    const raw = JSON.parse(t.DesignJson); 
                    
                    setLayout({ 
                      ...layout, 
                      labelW: t.LabelW, 
                      labelH: t.LabelH, 
                      ...(raw[0].layout || {}) 
                    }); 
                    
                    initItems(raw.slice(1)); 
                    setOpenDbDialog(false); 
                  }}
                >
                  <ListItemText 
                    primary={t.TemplateName} 
                    secondary={`${t.LabelW}x${t.LabelH}mm`} 
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------------- */}
      {/* 2. 엑셀 멀티 시트 선택 모달 다이얼로그 (신규) */}
      {/* ------------------------------------------------------------------------- */}
      <Dialog 
        open={openExcelSheetDialog} 
        onClose={() => setOpenExcelSheetDialog(false)} 
        fullWidth 
        maxWidth="xs"
      >
        <DialogTitle 
          sx={{ 
            m:              0, 
            p:              2, 
            display:        'flex', 
            justifyContent: 'space-between', 
            alignItems:     'center' 
          }}
        >
          표를 생성할 엑셀 시트 선택
          <IconButton 
            onClick={() => setOpenExcelSheetDialog(false)} 
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent dividers>
          <List>
            {excelSheetNames?.map((sheetName, idx) => (
              <ListItem 
                key={idx} 
                disablePadding
              >
                <ListItemButton 
                  onClick={() => onSelectExcelSheet(sheetName)}
                >
                  <ListItemIcon>
                    <TableViewIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={sheetName} 
                    secondary={`시트 인덱스: ${idx + 1}`} 
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DesignModals;