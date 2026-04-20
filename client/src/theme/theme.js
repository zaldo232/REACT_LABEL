/**
 * @file        theme.js
 * @description 애플리케이션의 전역 스타일 및 영역별 세부 디자인 설정을 정의하는 테마 파일입니다.
 * (Header, Sidebar, DataGrid, Canvas 등 영역별 색상을 독립적으로 관리하며 라이트/다크 모드를 지원합니다.)
 */

import { createTheme } from '@mui/material/styles';

/**
 * [함수] createAppTheme
 * @description 다크모드 여부에 따라 영역별로 최적화된 MUI 테마 객체를 생성하여 반환합니다.
 * @param {boolean} isDarkMode - 현재 시스템의 다크모드 활성화 여부
 */
const createAppTheme = (isDarkMode) => {
  return createTheme({
    
    /** [영역 1: 팔레트 설정] 
     * 시스템의 기본 색상 및 레이아웃 영역별 독립 색상을 정의합니다.
     */
    palette: {
      mode: isDarkMode ? 'dark' : 'light',

      // 시스템 기본 브랜드 색상
      primary: {
        main: isDarkMode ? '#90caf9' : '#1e40af',
      },
      secondary: {
        main: isDarkMode ? '#f48fb1' : '#dc004e',
      },

      // 기본 배경색 설정
      background: {
        default: isDarkMode ? '#121212' : '#f4f6f8',
        paper: isDarkMode ? '#1e1e1e' : '#ffffff',
      },

      /** * [커스텀 레이아웃 설정]
       * 메인 컬러에 종속되지 않고 각 UI 영역의 스타일을 세밀하게 제어합니다.
       * 사용처: theme.palette.layout.header.background 등
       */
      layout: {
        // 1. 상단 헤더(Header/AppBar) 영역
        header: {
          background: isDarkMode ? '#1e1e1e' : '#1e40af',
          font: '#ffffff',
          icon: '#ffffff',
          border: isDarkMode ? '#333333' : 'transparent',
        },
        
        // 2. 좌측 사이드바(Sidebar/Drawer) 영역
        sidebar: {
          background: isDarkMode ? '#121212' : '#233044',
          font: isDarkMode ? '#bbbbbb' : '#eeeeee',
          activeFont: isDarkMode ? '#90caf9' : '#ffffff',
          activeBg: isDarkMode ? 'rgba(144, 202, 249, 0.12)' : 'rgba(255, 255, 255, 0.08)',
          hoverBg: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.04)',
          border: isDarkMode ? '#333333' : 'transparent',
        },
        
        // 3. 데이터 그리드(DataTable) 영역
        datagrid: {
          headerBg: isDarkMode ? '#252525' : '#f8f9fa',
          headerFont: isDarkMode ? '#ffffff' : '#1e293b',
          rowHover: isDarkMode ? 'rgba(255, 255, 255, 0.04)' : '#f1f5f9',
          border: isDarkMode ? '#333333' : '#e2e8f0',
          selectedRow: isDarkMode ? 'rgba(144, 202, 249, 0.16)' : '#e0f2fe',
        },
        
        // 4. 라벨 디자인 캔버스 영역
        design: {
          canvasBg: isDarkMode ? '#2c2c2c' : '#d1d4d9',
          paper: '#ffffff',
          grid: isDarkMode ? '#444444' : '#e0e0e0',
          layerBg: isDarkMode ? '#1a1a1a' : '#fafafa',
        },
      },
    },

    /** [영역 2: 타이포그래피 설정] 
     * 폰트 패밀리 및 전역 텍스트 스타일을 정의합니다.
     */
    typography: {
      fontFamily: [
        'Pretendard',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        'sans-serif',
      ].join(','),
      
      button: {
        textTransform: 'none', // 버튼 텍스트의 자동 대문자 변환 방지
        fontWeight: 600,
      },
    },

    /** [영역 3: 컴포넌트 스타일 오버라이드] 
     * 각 MUI 컴포넌트의 기본 속성과 스타일을 프로젝트 규칙에 맞게 일괄 조정합니다.
     */
    components: {
      // 버튼 컴포넌트 공통 설정
      MuiButton: {
        defaultProps: {
          disableElevation: true, // 기본 그림자 제거
        },
        styleOverrides: {
          root: {
            borderRadius: 8, // 지정된 곡률 적용
            padding: '6px 16px',
          },
        },
      },
      
      // 입력 필드(TextField) 공통 설정
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
          size: 'small', // 밀도 높은 UI를 위한 기본 설정
        },
      },

      // 앱바(헤더) 기본 그림자 제거 및 테두리 설정 연동
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
          },
        },
      },

      // 데이터 그리드 스타일을 테마 설정에 종속시킴
      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: 'none',
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: isDarkMode ? '#252525' : '#f8f9fa',
              color: isDarkMode ? '#ffffff' : '#1e293b',
            },
            '& .MuiDataGrid-cell:focus': {
              outline: 'none', // 셀 선택 시 아웃라인 제거
            },
          },
        },
      },
    },
  });
};

export default createAppTheme;