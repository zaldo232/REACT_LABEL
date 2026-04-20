import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import App from './App.jsx';
import theme from './theme/theme'; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {/* CssBaseline은 MUI의 기본 스타일 초기화(reset) 모듈 */}
        <CssBaseline /> 
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);