/**
 * @file        theme.js
 * @description 애플리케이션의 전역 스타일 테마 설정 파일
 */

import { createTheme } from '@mui/material/styles';

/** [테마 정의] */
const theme = createTheme({
  
  /** [팔레트 설정]
   * 애플리케이션에서 사용할 주요 색상 시스템을 정의
   */
  palette: {
    // 시스템 메인 브랜드 색상
    primary: {
      main: '#1e40af',
    },
    // 강조 및 보조 색상
    secondary: {
      main: '#dc004e',
    },
    // 배경색 설정 (앱 전체 레이아웃의 기본 톤)
    background: {
      default: '#f4f6f8', 
    },
  },

  /** [타이포그래피 설정]
   * 폰트 패밀리 및 글꼴 관련 스타일을 정의
   */
  typography: {
    // Pretendard를 우선순위로 설정하며, 시스템 기본 폰트들을 폴백으로 지정
    fontFamily: [
      'Pretendard',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    
    // 버튼 등 공통 텍스트 스타일 커스텀이 필요할 경우 여기에 추가 정의 가능
    button: {
      textTransform: 'none', // 버튼 텍스트의 자동 대문자 변환 방지
    },
  },

  /** [컴포넌트 기본 스타일 커스텀]
   * 각 MUI 컴포넌트의 기본 Props나 스타일을 프로젝트 전역에 맞게 조정
   */
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true, // 버튼의 기본 그림자 제거
      },
      styleOverrides: {
        root: {
          borderRadius: 8, // 모든 버튼에 공통 곡률 적용
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined', // 기본 입력 필드 스타일을 Outlined로 고정
        size: 'small',       // 기본 크기를 작게 설정하여 밀도 높은 UI 구성
      },
    },
  },
});

export default theme;