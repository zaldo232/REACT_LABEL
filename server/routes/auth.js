/**
 * @file        auth.js
 * @description 사용자 인증(로그인, 로그아웃, 세션 체크)을 위한 API 라우팅 설정 파일
 */

/** [의존성 정의] */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

/** [인증 라우트 설정] */

// 사용자 로그인 요청 (POST /api/auth/login)
router.post(
  '/login', 
  authController.login
);

// 현재 세션 상태 확인 (GET /api/auth/check)
router.get(
  '/check', 
  authController.checkSession
);

// 사용자 로그아웃 처리 (POST /api/auth/logout)
router.post(
  '/logout', 
  authController.logout
);

/** [모듈 내보내기] */
module.exports = router;