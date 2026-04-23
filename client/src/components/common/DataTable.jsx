/**
 * @file        DataTable.jsx
 * @description 애플리케이션 전역에서 사용되는 공통 데이터 그리드 컴포넌트
 * (페이징, 로딩 상태를 관리하며 테마 설정에 연동되어 라이트/다크 모드를 완벽히 지원합니다.)
 */

import React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box } from '@mui/material';

/**
 * [컴포넌트] DataTable
 * @param {Array} columns   - 테이블 헤더 및 데이터 매핑 설정
 * @param {Array} rows      - 테이블에 표시할 데이터 목록
 * @param {Boolean} loading - 데이터 로딩 상태 (스피너 표시 여부)
 * @param {Number} pageSize - 초기 페이지당 행 개수
 */
const DataTable = ({ 
  columns, 
  rows, 
  loading = false, 
  pageSize = 10 
}) => {

  /** [영역 분리: 렌더링 영역] */
  return (
    <Box 
      sx={{ 
        height: '100%', 
        width: '100%' 
      }}
    >
      <DataGrid
        // [데이터 및 기본 설정]
        rows={rows}
        columns={columns}
        loading={loading}
        
        // [사용자 인터랙션 제어]
        disableRowSelectionOnClick
        
        // [페이징 옵션] - 배열 요소 수직 정렬 규칙 적용
        pageSizeOptions={[
          5, 
          10, 
          25, 
          50
        ]}
        
        // [초기 상태 설정] - 객체 내부 요소 줄바꿈 및 수직 정렬
        initialState={{
          pagination: {
            paginationModel: { 
              pageSize: pageSize 
            },
          },
        }}

        // [스타일링 커스텀] - 테마 연동 및 하드코딩 색상 배제
        sx={{
          border: 'none', // 부모 Paper에서 테두리를 관리하므로 내부 선은 제거하여 깔끔함 유지
          backgroundColor: 'background.paper',
          
          // 헤더 영역 스타일링
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: (theme) => theme.palette.layout.datagrid.headerBg,
            color: (theme) => theme.palette.layout.datagrid.headerFont,
            fontWeight: 700,
            borderBottom: (theme) => `1px solid ${theme.palette.layout.datagrid.border}`,
          },

          // 데이터 셀 경계선 스타일링
          '& .MuiDataGrid-cell': {
            borderBottom: (theme) => `1px solid ${theme.palette.layout.datagrid.border}`,
            color: 'text.primary',
          },
          
          // 마우스 호버 시 행(Row) 배경색
          '& .MuiDataGrid-row:hover': {
            backgroundColor: (theme) => theme.palette.layout.datagrid.rowHover,
            cursor: 'pointer',
          },

          // 행 선택 시 색상 (클릭 시 시각적 피드백 강화)
          '& .MuiDataGrid-row.Mui-selected': {
            backgroundColor: (theme) => theme.palette.layout.datagrid.selectedRow,
            '&:hover': {
              backgroundColor: (theme) => theme.palette.layout.datagrid.selectedRow,
            }
          },
          
          // 셀 선택 시 나타나는 기본 아웃라인 제거 (포커스 방지)
          '& .MuiDataGrid-cell:focus': {
            outline: 'none',
          },

          '& .MuiDataGrid-columnHeader:focus': {
            outline: 'none',
          },
          
          // 가독성을 위한 헤더 세로 구분선 숨김
          '& .MuiDataGrid-columnSeparator': {
            display: 'none',
          },

          // 하단 푸터(페이징 영역) 스타일링
          '& .MuiDataGrid-footerContainer': {
            borderTop: (theme) => `1px solid ${theme.palette.layout.datagrid.border}`,
            backgroundColor: (theme) => theme.palette.layout.datagrid.headerBg,
          },
        }}
      />
    </Box>
  );
};

export default DataTable;