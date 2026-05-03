/**
 * @file        DesignModals.jsx
 * @description 라벨 디자인 페이지에서 호출되는 모든 팝업(Dialog) 모음 컴포넌트
 * - [포맷팅] 프로젝트 규칙에 따른 JSX 속성 및 Object 내부 수직 정렬 완벽 적용
 * - [기능] 서버에 저장된 라벨 템플릿 목록 조회, 불러오기 및 삭제 기능 지원
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
  IconButton
} from '@mui/material';

// 아이콘 임포트
import CloseIcon from '@mui/icons-material/Close';

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
  handleDeleteTemplate
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
        <DialogTitle>
          디자인 불러오기
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
    </>
  );
};

export default DesignModals;