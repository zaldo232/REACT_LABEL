/**
 * @file        main.jsx
 * @description 애플리케이션의 최상위 진입점 파일입니다.
 * (React DOM의 루트 생성 및 전역 브라우저 라우터 설정을 담당합니다.)
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';

/** [렌더링 영역] */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);