USE REACT_BASE
GO

/*
    프로그램명 : UP_GET_COMMON_SEQ
    작성일     : 2026-04-02
    설명       : 공통 채번 관리 (날짜별 초기화 및 순번 증가)
    사용예     : EXEC UP_GET_COMMON_SEQ 'LABEL'
*/
CREATE OR ALTER PROCEDURE UP_GET_COMMON_SEQ
    @SeqType VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Today VARCHAR(8) = CONVERT(VARCHAR(8), GETDATE(), 112); -- YYYYMMDD
    DECLARE @NewSeq INT;
    DECLARE @LastDate VARCHAR(8);

    -- 1. 해당 타입의 채번 정보가 있는지 먼저 확인하고 잠금(UPDLOCK)을 걸어 동시성 제어
    IF NOT EXISTS (SELECT 1 FROM TB_COM_SEQ WHERE SeqType = @SeqType)
    BEGIN
        -- 정보가 없으면 초기 데이터 인서트
        INSERT INTO TB_COM_SEQ (SeqType, LastDate, LastSeq, UpdDate)
        VALUES (@SeqType, @Today, 0, GETDATE());
    END

    BEGIN TRY
        BEGIN TRAN;

        -- 2. 날짜 체크 및 순번 업데이트
        -- 동일한 날짜면 +1, 날짜가 바뀌었으면 1로 초기화
        UPDATE TB_COM_SEQ
        SET 
            @NewSeq = CASE WHEN LastDate = @Today THEN LastSeq + 1 ELSE 1 END,
            LastSeq = CASE WHEN LastDate = @Today THEN LastSeq + 1 ELSE 1 END,
            LastDate = @Today,
            UpdDate = GETDATE()
        WHERE SeqType = @SeqType;

        COMMIT TRAN;

        -- 3. 최종 생성된 날짜와 순번을 반환
        SELECT 
            @SeqType AS SeqType,
            @Today AS LastDate,
            @NewSeq AS LastSeq,
            -- 포맷팅된 풀 번호 예시 (선택사항)
            @SeqType + '_' + @Today + '_' + RIGHT('000' + CAST(@NewSeq AS VARCHAR(10)), 3) AS FullSeqCode;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;

        -- 에러 발생 시 정보 반환
        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrSev INT = ERROR_SEVERITY();
        DECLARE @ErrState INT = ERROR_STATE();
        
        RAISERROR(@ErrMsg, @ErrSev, @ErrState);
    END CATCH
END
GO