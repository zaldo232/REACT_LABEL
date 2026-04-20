/**
 * @file        init-admin.js
 * @description 초기 관리자 계정 생성을 위한 독립 실행형 시딩 스크립트
 */

const { poolPromise, sql } = require('./config/db'); // DB 연결 경로 확인
const bcrypt = require('bcrypt');

const seedAdmin = async () => {
    const adminId = 'ADMIN'.toUpperCase();
    const adminPw = 'ADMIN'.toUpperCase(); // 초기 비밀번호
    const saltRounds = 10;

    try {
        console.log('--- 관리자 계정 생성 시작 ---');

        // 1. 비밀번호 해싱 (애플리케이션과 동일한 로직)
        const hashedPassword = await bcrypt.hash(adminPw, saltRounds);

        const pool = await poolPromise;
        
        // 2. TB_MEMBERS 테이블에 삽입 (아이디 중복 체크 포함)
        const result = await pool.request()
            .input('MEMBER_ID', sql.NVarChar, adminId)
            .input('MEMBER_NAME', sql.NVarChar, '관리자')
            .input('DEPARTMENT', sql.NVarChar, 'ADMINISTRATOR') // 공통코드와 일치 필요
            .input('MEMBER_PASSWORD', sql.NVarChar, hashedPassword)
            .input('MEMBER_ROLE', sql.NVarChar, 'ADMINISTRATOR')
            .query(`
                IF NOT EXISTS (SELECT 1 FROM TB_MEMBERS WHERE MEMBER_ID = @MEMBER_ID)
                BEGIN
                    INSERT INTO TB_MEMBERS (MEMBER_ID, MEMBER_NAME, DEPARTMENT, MEMBER_PASSWORD, MEMBER_ROLE)
                    VALUES (@MEMBER_ID, @MEMBER_NAME, @DEPARTMENT, @MEMBER_PASSWORD, @MEMBER_ROLE);
                    SELECT 'SUCCESS' AS STATUS;
                END
                ELSE
                BEGIN
                    SELECT 'EXISTS' AS STATUS;
                END
            `);

        const status = result.recordset[0].STATUS;
        if (status === 'SUCCESS') {
            console.log('관리자 계정이 생성되었습니다.');
            console.log(`아이디: ${adminId} / 비밀번호: ${adminPw}`);
        } else {
            console.log('ℹ이미 관리자 계정이 존재합니다.');
        }

    } catch (err) {
        console.error('관리자 생성 중 에러 발생:', err.message);
    } finally {
        process.exit();
    }
};

seedAdmin();

/*node init-admin.js*/