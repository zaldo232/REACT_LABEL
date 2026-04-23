/**
 * @file        authController.js
 * @description 사용자 인증 처리 및 세션 수명 관리 컨트롤러
 * (단기 세션 연장을 위한 정보 포함 및 만료 시 401 반환 처리)
 */

const { executeProcedure } = require('../config/db');

const authController = {

  /**
   * [메소드] 로그인 처리 (login)
   */
  login: async (req, res) => {
    try {
      const { userId, userPwd, rememberMe } = req.body;
      const users = await executeProcedure('UP_USER_LOGIN', { UserId: userId });

      if (users.length === 0 || users[0].UserPwd !== userPwd) {
        return res.status(401).json({ 
          success: false, 
          message: 'ID 또는 비밀번호가 일치하지 않습니다.' 
        });
      }

      const user = users[0];

      /** [로직] 세션 데이터 구성
       * - isLongSession: 자동 로그인(1년) 여부를 저장하여 프론트에서 활용
       */
      req.session.user = {
        userId:        user.UserId,
        userName:      user.UserName,
        role:          user.Role,
        isLongSession: !!rememberMe 
      };

      /** [로직] 세션 쿠키 수명(MaxAge) 설정 */
      if (rememberMe) {
        // [운영] 1년 설정 (365일)
        req.session.cookie.maxAge = 365 * 24 * 60 * 60 * 1000;
        
        // [테스트] 5초 설정 (테스트 시 아래 주석 해제)
        //req.session.cookie.maxAge = 5 * 1000; 
      } else {
        // [운영] 60분 설정
        req.session.cookie.maxAge = 60 * 60 * 1000;

        // [테스트] 5초 설정 (테스트 시 아래 주석 해제)
        //req.session.cookie.maxAge = 1.5 * 1000;
      }

      res.json({ 
        success: true, 
        user:    req.session.user 
      });

    } catch (error) {
      console.error('Login Error:', error);
      res.status(500).json({ success: false, message: '서버 오류' });
    }
  },

  /**
   * [메소드] 세션 상태 확인 (checkSession)
   */
  checkSession: (req, res) => {
    if (req.session && req.session.user) {
      res.json({ 
        success: true, 
        isAuth:  true, 
        user:    req.session.user 
      });
    } else {
      /** 401을 반환해야 클라이언트 인터셉터에서 알람 팝업이 뜹니다. */
      res.status(401).json({ 
        success: false, 
        isAuth:  false,
        message: '세션이 만료되었습니다.'
      });
    }
  },

  /**
   * [메소드] 로그아웃 처리
   */
  logout: (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ success: false });
      res.clearCookie('connect.sid'); 
      res.json({ success: true });
    });
  }
};

module.exports = authController;