USE [REACT_BASE]
GO

-- 1. 채번 테이블 초기화 (BARCODE와 LABEL 둘 다 넣어줘야 함)
DELETE FROM TB_COM_SEQ WHERE SeqType IN ('BARCODE', 'LABEL');

INSERT INTO TB_COM_SEQ (SeqType, LastDate, LastSeq, UpdDate) 
VALUES ('BARCODE', CONVERT(VARCHAR(8), GETDATE(), 112), 0, GETDATE());

INSERT INTO TB_COM_SEQ (SeqType, LastDate, LastSeq, UpdDate) 
VALUES ('LABEL', CONVERT(VARCHAR(8), GETDATE(), 112), 0, GETDATE());


-- 2. 사용자 계정 확인 (UserId는 대소문자 구분될 수 있으니 주의)
IF NOT EXISTS (SELECT 1 FROM TB_USER WHERE UserId = 'ADMIN')
BEGIN
    INSERT INTO TB_USER (UserId, UserPwd, UserName, Role, IsActive, CreatedAt)
    VALUES ('ADMIN', 'ADMIN', '관리자', 'ADMIN', 'Y', GETDATE());
END

GO