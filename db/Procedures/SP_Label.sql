/**
 * @file		SP_Label.sql
 * @description	라벨 관리 시스템 관련 저장 프로시저(Stored Procedure) 모음
 *				(라벨 발행 이력 저장, 동적 컬럼 조회, 양식 및 프리셋 관리, 소프트 삭제 기능을 포함)
 */

USE REACT_LABEL_DB
GO

/* ==========================================================================
 * [1] 라벨 발행(인쇄/스캔) 데이터 일괄 저장
 * - 설명: JSON 배열로 전달받은 스캔 데이터를 파싱하여 이력 테이블에 일괄 저장
 * 저장 시 TB_COM_SEQ 테이블을 통해 일별 고유 작업번호(BatchNo)를 채번
 * ========================================================================== */
CREATE OR ALTER PROCEDURE [dbo].[UP_INSERT_LABEL_PRINT]
	@UserId						VARCHAR(50)						,	--	작업자 ID
	@TemplateId					INT								,	--	사용된 라벨 양식(템플릿) ID
	@JsonData					NVARCHAR(MAX)						--	스캔 및 입력 데이터가 담긴 JSON 배열
AS
BEGIN
	SET NOCOUNT ON;

	--	[변수 선언] 채번 및 로직 제어용
	DECLARE	@Today				VARCHAR(8)		=	CONVERT(VARCHAR(8), GETDATE(), 112);
	DECLARE	@Count				INT;
	DECLARE	@StartSeq			INT;

	--	[임시 테이블] JSON 데이터를 파싱하여 담아둘 테이블 변수
	DECLARE	@InputData TABLE (
		Barcode					NVARCHAR(100)
	,	JsonString				NVARCHAR(MAX)
	,	ScannedAt				DATETIME
	,	Rnk						INT
	);

	--	[로직] JSON 파싱 및 임시 테이블 삽입
	INSERT INTO @InputData 
	(
			Barcode
	,		JsonString
	,		ScannedAt
	,		Rnk
	)
	SELECT	JSON_VALUE(value, '$.barcode')
	,		value
	,		ISNULL(JSON_VALUE(value, '$.scannedAt'), GETDATE())		--	클라이언트 시간이 없으면 DB 시간 사용
	,		ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) - 1			--	채번 계산을 위한 순번(0부터 시작)
	FROM	OPENJSON(@JsonData);

	--	파싱된 데이터 건수 확인 (데이터가 없으면 즉시 종료)
	SELECT	@Count	=	COUNT(*) 
	FROM	@InputData;
	
	IF (@Count = 0) RETURN;

	BEGIN TRY
		BEGIN TRAN TRAN_INSERT_LABEL_PRINT;

		--	[로직] 작업번호(BatchNo) 채번 업데이트
		UPDATE	TB_COM_SEQ
		SET		@StartSeq	=	CASE WHEN LastDate = @Today THEN LastSeq + 1 ELSE 1 END
		,		LastSeq		=	CASE WHEN LastDate = @Today THEN LastSeq + @Count ELSE @Count END
		,		LastDate	=	@Today
		,		UpdDate		=	GETDATE()
		WHERE	SeqType		=	'LABEL';

		--	[로직] 파싱된 데이터를 실제 발행 이력 테이블에 삽입
		INSERT INTO TB_LABEL_PRINT_HISTORY 
		(
				BatchNo
		,		Barcode
		,		JsonData
		,		TemplateId
		,		UserId
		,		CreatedAt
		)
		SELECT	'B' + RIGHT('000' + CAST(@StartSeq + Rnk AS VARCHAR(10)), 3) + '_' + @Today + '_' + @UserId
		,		Barcode
		,		JsonString
		,		@TemplateId
		,		@UserId
		,		ScannedAt
		FROM	@InputData;

		COMMIT TRAN TRAN_INSERT_LABEL_PRINT;

		--	성공 시 클라이언트에게 마지막으로 생성된 BatchNo 반환
		SELECT	'B' + RIGHT('000' + CAST(@StartSeq + @Count - 1 AS VARCHAR(10)), 3) + '_' + @Today + '_' + @UserId	AS	GeneratedBatchNo;
			
	END TRY
	BEGIN CATCH
		--	에러 발생 시 롤백 후 에러 스로우
		IF (@@TRANCOUNT > 0)
			ROLLBACK TRAN TRAN_INSERT_LABEL_PRINT;
			
		THROW;
	END CATCH
END
GO


/* ==========================================================================
 * [2] 라벨 발행 이력 동적 조회 (핵심 기능)
 * - 설명: 선택한 TemplateId의 JSON 디자인 규격을 분석하여, 
 * 가변 항목(type='data')들을 실제 SQL 컬럼(SELECT 절)으로 변환하여 조회
 * ========================================================================== */
CREATE OR ALTER PROCEDURE [dbo].[UP_SELECT_LABEL_HISTORY_DYNAMIC]
	@TemplateId					INT								,	--	조회할 템플릿 ID
	@StartDate					VARCHAR(8)						,	--	조회 시작일 (YYYYMMDD)
	@EndDate					VARCHAR(8)						,	--	조회 종료일 (YYYYMMDD)
	@Barcode					VARCHAR(100)	=	NULL			--	검색 키워드 (바코드 또는 데이터 내용)
AS
BEGIN
	SET NOCOUNT ON;

	--	[변수 선언] 동적 쿼리 생성용
	DECLARE	@DesignJson			NVARCHAR(MAX);
	DECLARE	@ColumnList			NVARCHAR(MAX)	=	'';
	DECLARE	@Sql				NVARCHAR(MAX);

	--	1. 해당 템플릿의 전체 디자인 정보(JSON) 로드
	SELECT	@DesignJson	=	DesignJson 
	FROM	TB_LABEL_TEMPLATE	WITH (NOLOCK)
	WHERE	TemplateId	=	@TemplateId;

	--	2. JSON 내에서 'data' 타입인 항목들의 label을 추출하여 동적 컬럼 텍스트 조립
	SELECT	@ColumnList	=	@ColumnList + ', JSON_VALUE(A.JsonData, ''$."' + label + '"'') AS [' + label + ']'
	FROM	OPENJSON(@DesignJson)
	WITH	(
				type			NVARCHAR(50)	'$.type'
			,	label			NVARCHAR(50)	'$.label'
			)
	WHERE	type		=	'data';

	--	3. 최종 실행할 동적 SQL 기본 뼈대 조립
	SET @Sql = 
	'
		SELECT		A.PrintSeq
		,			A.BatchNo
		,			A.Barcode' + @ColumnList + '
		,			B.UserName
		,			CONVERT(VARCHAR(19), A.CreatedAt, 120)	AS	PrintedAt
		FROM		TB_LABEL_PRINT_HISTORY	A	WITH (NOLOCK)
		INNER JOIN	TB_USER					B	WITH (NOLOCK)	ON	B.UserId		=	A.UserId
		WHERE		A.TemplateId	=	' + CAST(@TemplateId AS VARCHAR) + '
		AND			CAST(A.CreatedAt AS DATE) BETWEEN ''' + @StartDate + ''' AND ''' + @EndDate + '''
	';

	--	4. 바코드 또는 파싱된 전체 JSON 데이터를 대상으로 키워드 검색 조건 추가
	IF (@Barcode IS NOT NULL AND @Barcode <> '')
		BEGIN
			SET @Sql = @Sql + ' AND (A.Barcode LIKE ''%' + @Barcode + '%'' OR A.JsonData LIKE ''%' + @Barcode + '%'')';
		END

	--	5. 정렬 기준 추가
	SET @Sql = @Sql + ' ORDER BY A.PrintSeq DESC';

	--	6. 완성된 쿼리 문자열 실행
	EXEC(@Sql);
END
GO


/* ==========================================================================
 * [3] 라벨 디자인 템플릿 저장 (수정/신규 통합 로직 - Upsert)
 * - 설명: TemplateId가 있으면 기존 양식을 수정하고, 없으면 새 양식으로 등록
 * ========================================================================== */
CREATE OR ALTER PROCEDURE [dbo].[UP_SAVE_LABEL_TEMPLATE]
	@TemplateId					INT				=	NULL		,	--	템플릿 ID (NULL이면 신규 생성)
	@TemplateName				NVARCHAR(100)					,	--	템플릿 이름
	@PageW						FLOAT							,	--	용지 가로 크기
	@PageH						FLOAT							,	--	용지 세로 크기
	@LabelW						FLOAT							,	--	라벨 가로 크기
	@LabelH						FLOAT							,	--	라벨 세로 크기
	@Cols						INT								,	--	배치 가로 개수
	@Rows						INT								,	--	배치 세로 개수
	@MarginTop					FLOAT							,	--	상단 여백
	@MarginLeft					FLOAT							,	--	좌측 여백
	@Gap						FLOAT							,	--	라벨 간 간격
	@DesignJson					NVARCHAR(MAX)					,	--	레이어 항목 구조 JSON 데이터
	@UserId						VARCHAR(50)		=	NULL			--	등록/수정자 ID
AS
BEGIN
	SET NOCOUNT ON;

	--	[UPDATE 분기] 템플릿 ID가 파라미터로 넘어왔고, DB에 실제로 존재하는 경우
	IF (@TemplateId IS NOT NULL AND EXISTS (SELECT 1 FROM TB_LABEL_TEMPLATE WITH (NOLOCK) WHERE TemplateId = @TemplateId))
		BEGIN
			UPDATE	TB_LABEL_TEMPLATE 
			SET		TemplateName	=	@TemplateName
			,		PageW			=	@PageW
			,		PageH			=	@PageH
			,		LabelW			=	@LabelW
			,		LabelH			=	@LabelH
			,		Cols			=	@Cols
			,		Rows			=	@Rows
			,		MarginTop		=	@MarginTop
			,		MarginLeft		=	@MarginLeft
			,		Gap				=	@Gap
			,		DesignJson		=	@DesignJson
			,		UpdatedAt		=	GETDATE()
			WHERE	TemplateId		=	@TemplateId;

			--	결과 반환
			SELECT	@TemplateId		AS	ResultId
			,		'UPDATE'		AS	Action;
		END
	--	[INSERT 분기] 템플릿 ID가 없거나 DB에 없는 경우 신규 등록
	ELSE
		BEGIN
			INSERT INTO TB_LABEL_TEMPLATE 
			(
					TemplateName
			,		PageW
			,		PageH
			,		LabelW
			,		LabelH
			,		Cols
			,		Rows
			,		MarginTop
			,		MarginLeft
			,		Gap
			,		DesignJson
			,		DelYn
			,		CreatedBy
			)
			VALUES 
			(
					@TemplateName
			,		@PageW
			,		@PageH
			,		@LabelW
			,		@LabelH
			,		@Cols
			,		@Rows
			,		@MarginTop
			,		@MarginLeft
			,		@Gap
			,		@DesignJson
			,		'N'
			,		@UserId
			);

			--	SCOPE_IDENTITY()로 새로 생성된 ID 반환
			SELECT	SCOPE_IDENTITY()	AS	ResultId
			,		'INSERT'			AS	Action;
		END
END
GO


/* ==========================================================================
 * [4] 템플릿 목록 조회
 * - 설명: 삭제되지 않은(DelYn = 'N') 템플릿 목록을 최신 등록순으로 반환
 * ========================================================================== */
CREATE OR ALTER PROCEDURE [dbo].[UP_SELECT_LABEL_TEMPLATE_LIST]
AS
BEGIN
	SET NOCOUNT ON;

	SELECT	* FROM	TB_LABEL_TEMPLATE	WITH (NOLOCK)
	WHERE	DelYn		=	'N' 
	ORDER BY CreatedAt	DESC;
END
GO


/* ==========================================================================
 * [5] 인쇄 프리셋 저장 및 수정 (Upsert)
 * - 설명: 특정 템플릿에 가변 데이터를 채워 넣은 상태(프리셋)를 저장
 * ========================================================================== */
CREATE OR ALTER PROCEDURE [dbo].[UP_SAVE_PRINT_PRESET]
	@PresetId					INT				=	NULL		,	--	프리셋 ID (NULL이면 신규)
	@PresetName					NVARCHAR(100)					,	--	사용자가 지정한 프리셋 이름
	@TemplateId					INT								,	--	연결된 원본 템플릿 ID
	@DynamicDataJson			NVARCHAR(MAX)					,	--	미리 입력해둔 가변 데이터 맵 매핑 JSON
	@LayoutJson					NVARCHAR(MAX)					,	--	인쇄 설정(여백 등) JSON
	@CopyCount					INT								,	--	저장된 출력 장수
	@UserId						VARCHAR(50)		=	NULL			--	등록/수정자 ID
AS
BEGIN
	SET NOCOUNT ON;

	IF (@PresetId IS NOT NULL AND EXISTS (SELECT 1 FROM TB_LABEL_PRINT_PRESET WITH (NOLOCK) WHERE PresetId = @PresetId))
		BEGIN
			UPDATE	TB_LABEL_PRINT_PRESET 
			SET		PresetName		=	@PresetName
			,		TemplateId		=	@TemplateId
			,		DynamicDataJson	=	@DynamicDataJson
			,		LayoutJson		=	@LayoutJson
			,		CopyCount		=	@CopyCount
			,		UpdatedAt		=	GETDATE()
			WHERE	PresetId		=	@PresetId;

			SELECT	@PresetId		AS	ResultId
			,		'UPDATE'		AS	Action;
		END
	ELSE
		BEGIN
			INSERT INTO TB_LABEL_PRINT_PRESET 
			(
					PresetName
			,		TemplateId
			,		DynamicDataJson
			,		LayoutJson
			,		CopyCount
			,		DelYn
			,		CreatedBy
			)
			VALUES 
			(
					@PresetName
			,		@TemplateId
			,		@DynamicDataJson
			,		@LayoutJson
			,		@CopyCount
			,		'N'
			,		@UserId
			);

			SELECT	SCOPE_IDENTITY()	AS	ResultId
			,		'INSERT'			AS	Action;
		END
END
GO


/* ==========================================================================
 * [6] 프리셋 목록 조회
 * - 설명: 사용자가 저장해둔 프리셋 목록과, 해당 프리셋의 원본 템플릿 정보를 JOIN 하여 반환
 * ========================================================================== */
CREATE OR ALTER PROCEDURE [dbo].[UP_SELECT_PRINT_PRESET_LIST]
AS
BEGIN
	SET NOCOUNT ON;

	SELECT		P.*
	,			T.TemplateName
	,			T.DesignJson 
	FROM		TB_LABEL_PRINT_PRESET	P	WITH (NOLOCK)
	INNER JOIN	TB_LABEL_TEMPLATE		T	WITH (NOLOCK)	ON	T.TemplateId	=	P.TemplateId
	WHERE		P.DelYn			=	'N'
	ORDER BY	P.CreatedAt		DESC;
END
GO


/* ==========================================================================
 * [7] 데이터 삭제 (Soft Delete 통합 관리)
 * - 설명: @Type 파라미터에 따라 'TEMPLATE(양식)' 또는 'PRESET(프리셋)'을 
 * 실제 DB에서 지우지 않고 DelYn 플래그만 'Y'로 변경 (이력 보존 목적)
 * ========================================================================== */
CREATE OR ALTER PROCEDURE [dbo].[UP_DELETE_LABEL_DATA]
	@Type						NVARCHAR(20)					,	--	삭제할 대상 타입 ('TEMPLATE' 또는 'PRESET')
	@Id							INT									--	삭제할 대상의 고유 ID
AS
BEGIN
	SET NOCOUNT ON;

	--	양식(템플릿) 삭제 처리
	IF (@Type = 'TEMPLATE')
		BEGIN
			UPDATE	TB_LABEL_TEMPLATE 
			SET		DelYn		=	'Y'
			,		UpdatedAt	=	GETDATE() 
			WHERE	TemplateId	=	@Id;
		END
	--	프리셋 삭제 처리
	ELSE IF (@Type = 'PRESET')
		BEGIN
			UPDATE	TB_LABEL_PRINT_PRESET 
			SET		DelYn		=	'Y'
			,		UpdatedAt	=	GETDATE() 
			WHERE	PresetId	=	@Id;
		END
END
GO