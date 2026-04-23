/**
 * @file        authController.js
 * @description 사용자 인증 및 세션 수명 관리를 담당하는 컨트롤러
 */

/** [의존성 정의] */
const { executeProcedure } = require('../config/db');

/** [인증 컨트롤러 객체 정의] */
const authController = {

  /**
   * [메소드] 로그인 처리 (login)
   * @description 아이디/비번 검증 후 '로그인 상태 유지' 여부에 따라 세션 쿠키 수명을 설정합니다.
   */
  login: async (req, res) => {
    try {
      /** [로직] 클라이언트 요청 데이터 추출 */
      const { 
        userId, 
        userPwd,
        rememberMe // 프론트엔드 체크박스 상태
      } = req.body;
      
      /** [로직] DB 프로시저 호출 */
      const users = await executeProcedure('UP_USER_LOGIN', { 
        UserId: userId 
      });

      // 1. 사용자 존재 여부 및 비밀번호 검증
      if (users.length === 0 || users[0].UserPwd !== userPwd) {
        return res.status(401).json({ 
          success: false, 
          message: 'ID 또는 비밀번호가 일치하지 않습니다.' 
        });
      }

      const user = users[0];

      /** [로직] 세션 데이터 구성 (수직 정렬 적용) */
      req.session.user = {
        userId:   user.UserId,
        userName: user.UserName,
        role:     user.Role
      };

      /** [로직] 세션 쿠키 수명(MaxAge) 설정
       * - rememberMe true: 1년 (365일 * 24시간 * 60분 * 60초 * 1000ms)
       * - rememberMe false: 60분 (60분 * 60초 * 1000ms)
       */
      if (rememberMe) {
        req.session.cookie.maxAge = 365 * 24 * 60 * 60 * 1000;
      } else {
        req.session.cookie.maxAge = 60 * 60 * 1000;
      }

      res.json({ 
        success: true, 
        user:    req.session.user 
      });

    } catch (error) {
      console.error('Login Error:', error);
      res.status(500).json({ 
        success: false, 
        message: '서버 오류가 발생했습니다.' 
      });
    }
  },

  /**
   * [메소드] 세션 상태 확인 (checkSession)
   * @description 새로고침 시 프론트엔드에서 호출하여 세션 유효성을 확인합니다.
   */
  checkSession: (req, res) => {
    // 세션 존재 여부에 따른 응답 반환
    if (req.session && req.session.user) {
      res.json({ 
        success: true, 
        isAuth:  true, 
        user:    req.session.user 
      });
    } else {
      res.json({ 
        success: true, 
        isAuth:  false 
      });
    }
  },

  /**
   * [메소드] 로그아웃 처리
   */
  logout: (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ success: false });
      }
      res.clearCookie('connect.sid'); 
      res.json({ success: true });
    });
  }
};

module.exports = authController;