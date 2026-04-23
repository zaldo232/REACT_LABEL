/**
 * @file		SP_Auth.sql
 * @description	사용자 인증 및 권한 관련 저장 프로시저(Stored Procedure) 모음
 */

USE REACT_LABEL_DB
GO

/* ==========================================================================
 * [1] 사용자 로그인 검증 및 정보 조회
 * - 설명: 입력받은 UserId를 기반으로 활성화(IsActive='Y')된 사용자의 
 * 비밀번호 및 기본 권한 정보를 조회하여 반환
 * ========================================================================== */
CREATE OR ALTER PROCEDURE [dbo].[UP_USER_LOGIN]
	@UserId						VARCHAR(50)						--	로그인 시도하는 사용자 ID
AS
BEGIN
	SET NOCOUNT ON;

	--	[로직] 활성화된 사용자 정보 조회
	SELECT	UserId
	,		UserPwd
	,		UserName
	,		Role
	FROM	TB_USER				WITH (NOLOCK)
	WHERE	UserId		=	@UserId
	AND		IsActive	=	'Y'

END
GO