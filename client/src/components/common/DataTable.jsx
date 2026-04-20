/**
 * @file        DataTable.jsx
 * @description 애플리케이션 전역에서 사용되는 공통 데이터 그리드 컴포넌트
 */

import React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box } from '@mui/material';

/**
 * [컴포넌트] DataTable
 * @param {Array} columns  - 테이블 헤더 및 데이터 매핑 설정
 * @param {Array} rows     - 테이블에 표시할 데이터 목록
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
        
        // 페이징 설정
        pageSizeOptions={[5, 10, 25, 50]}
        initialState={{
          pagination: {
            paginationModel: { 
              pageSize: pageSize 
            },
          },
        }}

        // 사용자 인터랙션 설정
        disableRowSelectionOnClick
        
        // 테이블 디자인 커스텀 (sx)
        sx={{
          border: '1px solid #e0e0e0',
          backgroundColor: '#fff',
          
          // 헤더 영역 스타일링
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f5f5f5',
            fontWeight: 'bold',
          },
          
          // 셀 선택 시 나타나는 아웃라인 제거
          '& .MuiDataGrid-cell:focus': {
            outline: 'none',
          },
          
          // 가독성을 위한 그리드 라인 스타일
          '& .MuiDataGrid-columnSeparator': {
            display: 'none',
          },
        }}
      />
    </Box>
  );
};

export default DataTable;