/**
 * @file        LabelDesignPage.jsx
 * @description 전문 디자인 툴 방식의 라벨 편집기 메인 컴포넌트 (조립 공장)
 * - [버그수정] Table Cell Shift 범위 선택을 위해 engine.refs에서 분리 선언된 올바른 참조값 직접 매핑
 * - [UX개선] 마스터 입력창(가변 데이터 일괄 편집)이 표(Table) 선택 시 무조건 뜨는 현상 방지. 오직 바코드/QR 셀 선택 시에만 노출.
 */

import React, { 
  useState, 
  useCallback 
} from 'react';

// MUI 레이아웃 컴포넌트
import { 
  Box 
} from '@mui/material';

// =========================================================================
// [두뇌 부품] 커스텀 훅 (Custom Hooks) 임포트
// =========================================================================
import useDesignHistory from './hooks/useDesignHistory';
import useDesignEngine  from './hooks/useDesignEngine';
import useDesignFileIO  from './hooks/useDesignFileIO';

// =========================================================================
// [화면 부품] UI 컴포넌트 임포트
// =========================================================================
import DesignToolbar    from './components/DesignToolbar';
import DesignActionBar  from './components/DesignActionBar';
import DesignCanvas     from './components/DesignCanvas'; 
import DesignProperties from './components/DesignProperties';
import DesignLayerList  from './components/DesignLayerList'; 
import DesignModals     from './components/DesignModals'; 

// =========================================================================
// [메인 컴포넌트] LabelDesignPage
// =========================================================================
const LabelDesignPage = () => {
  
  // -------------------------------------------------------------------------
  // 1. 공통 전역 상태 (Global State) 선언
  // -------------------------------------------------------------------------
  const [templateId, setTemplateId]     = useState(null);                
  const [templateName, setTemplateName] = useState(''); 
  
  const [layout, setLayout] = useState({
    labelW:       '100',     
    labelH:       '50',     
    cols:         '',       
    rows:         '',       
    marginTop:    '',  
    marginLeft:   '', 
    gap:          '',        
    delimiter:    '',
    excelMapping: {} 
  });

  // -------------------------------------------------------------------------
  // 2. 두뇌 부품(Hooks) 조립 및 파라미터 전달
  // -------------------------------------------------------------------------
  
  // [A] 히스토리(시간) 제어 엔진
  const history = useDesignHistory();

  // 단일 개체 속성 업데이트용 콜백 헬퍼
  const updateItem = useCallback((id, fieldOrObj, value, saveSnapshot = true) => {
    history.updateItems((prev) => prev.map((item) => {
      if (item.id === id) {
        if (typeof fieldOrObj === 'object') {
          return { ...item, ...fieldOrObj };
        }
        return { ...item, [fieldOrObj]: value };
      }
      return item;
    }), saveSnapshot);
  }, [history]);

  // [B] 캔버스 및 개체 조작 코어 엔진
  const engine = useDesignEngine({
    items:            history.items,
    setItems:         history.setItems,
    updateItems:      history.updateItems,
    updateItem:       updateItem,
    selectedIds:      history.selectedIds,
    setSelectedIds:   history.setSelectedIds,
    selectedCells:    history.selectedCells,
    setSelectedCells: history.setSelectedCells,
    layout:           layout,
    takeSnapshot:     history.takeSnapshot,
    handleUndo:       history.handleUndo,
    handleRedo:       history.handleRedo
  });

  // [C] 파일 입출력 및 서버 API 통신 엔진
  const fileIO = useDesignFileIO({
    templateId:      templateId,
    setTemplateId:   setTemplateId,
    templateName:    templateName,
    setTemplateName: setTemplateName,
    layout:          layout,
    setLayout:       setLayout,
    items:           history.items,
    initItems:       history.initItems,
    updateItem:      updateItem,
    selectedIds:     history.selectedIds,
    canvasRef:       engine.refs.canvasRef
  });

  // -------------------------------------------------------------------------
  // 3. 파생 상태 (Derived State) 연산
  // -------------------------------------------------------------------------
  
  // 현재 단일로 선택된 최상위 개체 (표, 바코드 등)
  const targetItem = history.selectedIds.length === 1 
    ? history.items.find(i => i.id === history.selectedIds[0]) 
    : null;

  // 표(Table) 내부에서 단일로 선택된 셀 (Cell)
  const activeCell = targetItem?.type === 'table' && history.selectedCells.length === 1
    ? targetItem.cells.find(c => c.row === history.selectedCells[0].row && c.col === history.selectedCells[0].col)
    : null;

  // ★ 버그 수정: 표(table)를 클릭했다고 무조건 띄우지 않고, 바코드/QR코드 개체거나, 셀 타입이 바코드/QR일 때만 노출
  const isMasterInputVisible = history.selectedIds.length === 1 && (
    ['barcode', 'qrcode'].includes(targetItem?.type) ||
    (activeCell && ['barcode', 'qrcode'].includes(activeCell.cellType))
  );

  // =========================================================================
  // 렌더링 영역 (화면 부품 조립)
  // =========================================================================
  return (
    <Box 
      sx={{ 
        display:         'flex', 
        height:          'calc(100vh - 160px)', 
        backgroundColor: 'background.default', 
        gap:             0, 
        overflow:        'hidden' 
      }}
    >
      {/* ------------------------------------------------------------------------- */}
      {/* 화면 부품 1. 좌측 툴바 */}
      {/* ------------------------------------------------------------------------- */}
      <DesignToolbar 
        activeTool={engine.activeTool} 
        handleToolChange={engine.handleToolChange} 
      />

      <Box 
        sx={{ 
          flex:          1, 
          display:       'flex', 
          flexDirection: 'column', 
          overflow:      'hidden', 
          position:      'relative' 
        }}
      >
        {/* ------------------------------------------------------------------------- */}
        {/* 화면 부품 2. 상단 액션 바 */}
        {/* ------------------------------------------------------------------------- */}
        <DesignActionBar 
          zoom={engine.zoom}
          setZoom={engine.setZoom}
          showGrid={engine.showGrid}
          setShowGrid={engine.setShowGrid}
          gridSize={engine.gridSize}
          setGridSize={engine.setGridSize}
          snapToGrid={engine.snapToGrid}
          setSnapToGrid={engine.setSnapToGrid}
          handleUndo={history.handleUndo}
          handleRedo={history.handleRedo}
          historyUIState={history.historyUIState}
          excelLayoutInputRef={fileIO.excelLayoutInputRef}
          handleExcelLayoutParse={fileIO.handleExcelLayoutParse}
          handleFetchDbList={fileIO.handleFetchDbList}
          fileInputRef={fileIO.fileInputRef}
          handleImportJson={fileIO.handleImportJson}
          handleExport={() => fileIO.handleExport()}
          requestSave={fileIO.requestSave}
          templateId={templateId}
        />

        {/* ------------------------------------------------------------------------- */}
        {/* 화면 부품 3. 중앙 캔버스 도화지 */}
        {/* ------------------------------------------------------------------------- */}
        <DesignCanvas 
          canvasRef={engine.refs.canvasRef}
          scrollContainerRef={engine.refs.scrollContainerRef}
          nodeRefs={engine.refs.nodeRefs}
          hRulerRef={engine.refs.hRulerRef}
          vRulerRef={engine.refs.vRulerRef}
          hGuideRef={engine.refs.hGuideRef}
          vGuideRef={engine.refs.vGuideRef}
          layout={layout}
          zoom={engine.zoom}
          showGrid={engine.showGrid}
          safeGridSize={engine.safeGridSize}
          activeTool={engine.activeTool}
          isPanning={engine.isPanning}
          tempRect={engine.tempRect}
          items={history.items}
          selectedIds={history.selectedIds}
          setSelectedIds={history.setSelectedIds}
          selectedCells={history.selectedCells}
          setSelectedCells={history.setSelectedCells}
          lastSelectedCellRef={engine.refs.lastSelectedCellRef}
          isResizing={engine.isResizing}
          setIsResizing={engine.setIsResizing}
          tableResizeData={engine.tableResizeData}
          codeDataWithPrefix={engine.codeDataWithPrefix}
          drawRulers={engine.drawRulers}
          handleMouseDownCanvas={engine.handleMouseDownCanvas}
          handleMouseUpCanvas={engine.handleMouseUpCanvas}
          handleWheelZoom={engine.handleWheelZoom}
          handleItemClick={engine.handleItemClick}
          handleDragStart={engine.handleDragStart}
          handleGroupDrag={engine.handleGroupDrag}
          handleDragStop={engine.handleDragStop}
          handleTableResizeStart={engine.handleTableResizeStart}
          getKstPreviewDate={engine.getKstPreviewDate}
        />
      </Box>

      {/* 우측 패널 래퍼 */}
      <Box 
        sx={{ 
          width:           340, 
          minWidth:        340, 
          flexShrink:      0, 
          borderLeft:      (theme) => `1px solid ${theme.palette.divider}`, 
          backgroundColor: 'background.paper', 
          display:         'flex', 
          flexDirection:   'column' 
        }}
      >
        {/* ------------------------------------------------------------------------- */}
        {/* 화면 부품 4. 우측 상단 속성(Properties) 패널 */}
        {/* ------------------------------------------------------------------------- */}
        <DesignProperties 
          selectedIds={history.selectedIds}
          targetItem={targetItem}
          selectedCells={history.selectedCells}
          activeCell={activeCell}
          layout={layout}
          setLayout={setLayout}
          templateName={templateName}
          setTemplateName={setTemplateName}
          isMasterInputVisible={isMasterInputVisible}
          masterInputText={engine.masterInputText}
          setIsMasterFocused={engine.setIsMasterFocused}
          handleCombinedDataChange={engine.handleCombinedDataChange}
          takeSnapshot={history.takeSnapshot}
          updateItem={updateItem}
          alignSelectedItems={engine.alignSelectedItems}
          handleLayerOrder={engine.handleLayerOrder}
          handleMergeCells={engine.handleMergeCells}
          handleUnmergeCells={engine.handleUnmergeCells}
          modifyTableStructure={engine.modifyTableStructure}
          updateTableCell={engine.updateTableCell}
          deleteSelectedItems={engine.deleteSelectedItems}
          imageInputRef={fileIO.imageInputRef}
          handleImageUpload={fileIO.handleImageUpload}
          getRealBBox={engine.getRealBBox}
        />

        {/* ------------------------------------------------------------------------- */}
        {/* 화면 부품 5. 우측 하단 레이어 목록 (Z-Index 패널) */}
        {/* ------------------------------------------------------------------------- */}
        <DesignLayerList 
          items={history.items}
          updateItems={history.updateItems}
          selectedIds={history.selectedIds}
          handleItemClick={engine.handleItemClick}
          toggleTableExpand={engine.toggleTableExpand}
          expandedTableIds={engine.expandedTableIds}
          updateItem={updateItem}
          updateTableCell={engine.updateTableCell}
        />
      </Box>

      {/* ------------------------------------------------------------------------- */}
      {/* 화면 부품 6. 숨겨진 팝업(Dialog) 모음 */}
      {/* ------------------------------------------------------------------------- */}
      <DesignModals 
        openDbDialog={fileIO.openDbDialog}
        setOpenDbDialog={fileIO.setOpenDbDialog}
        dbList={fileIO.dbList}
        setTemplateId={setTemplateId}
        setTemplateName={setTemplateName}
        layout={layout}
        setLayout={setLayout}
        initItems={history.initItems}
        handleDeleteTemplate={fileIO.handleDeleteTemplate}
      />

    </Box>
  );
};

export default LabelDesignPage;