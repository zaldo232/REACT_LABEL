/**
 * @file        server.js
 * @description Express 서버 설정 및 세션 자동 연장(Rolling) 구성
 */

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MSSQLStore = require('connect-mssql-v2');
const { dbConfig } = require('./config/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors({
  origin:      [process.env.CLIENT_URL, 'http://localhost:5173'],
  credentials: true
}));

/** [영역 분리: 세션 미들웨어]
 * - resave: true (매 요청마다 세션 업데이트 강제)
 * - rolling: true (매 요청마다 쿠키 만료 시간 초기화)
 */
app.use(session({
  secret:            process.env.SESSION_SECRET || 'secret_key',
  resave:            true, 
  saveUninitialized: false,
  rolling:           true, 
  store: new MSSQLStore(dbConfig, { 
    table: 'TB_SESSIONS', 
    ttl:   3600 
  }),
  cookie: {
    httpOnly: true,
    secure:   false, 
    sameSite: 'lax',
    maxAge:   1000 * 60 * 60 
  }
}));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/system', require('./routes/system')); 
app.use('/api/label', require('./routes/label'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});