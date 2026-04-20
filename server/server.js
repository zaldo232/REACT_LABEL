const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MSSQLStore = require('connect-mssql-v2');
const { dbConfig } = require('./config/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// 미들웨어
app.use(express.json());
app.use(cors({
  origin: [process.env.CLIENT_URL, 'http://localhost:5173'],
  credentials: true
}));

// 세션 설정 (DB 기반)
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  store: new MSSQLStore(dbConfig, { 
    table: 'TB_SESSIONS', 
    ttl: 3600 // 1시간
  }),
  cookie: {
    httpOnly: true,
    secure: false, 
    maxAge: 1000 * 60 * 60
  }
}));

// [라우터 연결]
app.use('/api/auth', require('./routes/auth'));
app.use('/api/system', require('./routes/system')); 
app.use('/api/label', require('./routes/label'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
});