/**
 * @file        DataTable.jsx
 * @description 애플리케이션 전역에서 사용되는 공통 데이터 그리드 컴포넌트
 * (페이징, 로딩 상태를 관리하며 테마 설정에 연동되어 다크모드를 지원합니다.)
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

  /** [렌더링 영역] */
  return (
    <Box 
      sx={{ 
        height: '100%', 
        width: '100%' 
      }}
    >
      <DataGrid
        // 데이터 및 로딩 설정
        rows={rows}
        columns={columns}
        loading={loading}
        
        // 페이징 옵션 배열 수직 정렬 규칙 적용
        pageSizeOptions={[
          5, 
          10, 
          25, 
          50
        ]}
        initialState={{
          pagination: {
            paginationModel: { 
              pageSize: pageSize 
            },
          },
        }}

        // 사용자 인터랙션 설정
        disableRowSelectionOnClick
        
        // 테이블 디자인 커스텀 (하드코딩 색상 제거, 테마 layout.datagrid 연동)
        sx={{
          border: '1px solid',
          borderColor: (theme) => theme.palette.layout.datagrid.border,
          backgroundColor: 'background.paper', // 다크모드 배경색 대응
          
          // 헤더 영역 스타일링
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: (theme) => theme.palette.layout.datagrid.headerBg,
            color: (theme) => theme.palette.layout.datagrid.headerFont,
            fontWeight: 'bold',
          },
          
          // 마우스 호버 시 행(Row) 색상
          '& .MuiDataGrid-row:hover': {
            backgroundColor: (theme) => theme.palette.layout.datagrid.rowHover,
          },

          // 행 선택 시 색상 (disableRowSelectionOnClick을 쓰더라도 클릭 피드백 제어)
          '& .MuiDataGrid-row.Mui-selected': {
            backgroundColor: (theme) => theme.palette.layout.datagrid.selectedRow,
            '&:hover': {
              backgroundColor: (theme) => theme.palette.layout.datagrid.selectedRow,
            }
          },
          
          // 셀 선택 시 나타나는 기본 파란색 아웃라인 제거
          '& .MuiDataGrid-cell:focus': {
            outline: 'none',
          },
          
          // 가독성을 위한 그리드 헤더 세로 구분선 숨김 처리
          '& .MuiDataGrid-columnSeparator': {
            display: 'none',
          },
        }}
      />
    </Box>
  );
};

export default DataTable;