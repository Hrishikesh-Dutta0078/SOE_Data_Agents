#!/usr/bin/env node
/**
 * Updates kpi-glossary.json entries with verified SQL from kpi-sql-translations.md
 * Run: node scripts/updateGlossaryFromTranslations.js
 */
const fs = require('fs');
const path = require('path');

const glossaryPath = path.join(__dirname, '..', 'server', 'context', 'knowledge', 'kpi-glossary.json');
const glossary = JSON.parse(fs.readFileSync(glossaryPath, 'utf8'));

// ── Mapping: glossary ID → updated fields ──────────────────────────────────

const updates = {
  // ─── 1. GROSS CREATED QTD $ ───
  gross_created_qtd_dollar: {
    definition: "Opportunity dollar amount created in the selected qualification quarter(s), closing within 4 quarters, excluding early-stage deals. Historical quarters pin to EOQ snapshot.",
    section: "Pipeline",
    confidence: "verified",
    formula: `;WITH SelectedQtrs AS (
    SELECT DISTINCT
        cal.FISCAL_YR_AND_QTR_DESC AS QUALIFICATION_QTR,
        cal.QTR_BKT_IND           AS QUALIFICATION_QTR_BKT
    FROM vw_EBI_CALDATE cal
    WHERE (@QualificationQtrs IS NOT NULL
           AND cal.FISCAL_YR_AND_QTR_DESC IN (
               SELECT TRIM(value) FROM STRING_SPLIT(@QualificationQtrs, ',')
           ))
       OR (@QualificationQtrs IS NULL AND cal.QTR_BKT_IND = 0)
),
EOQSnapshotDates AS (
    SELECT
        sq.QUALIFICATION_QTR_BKT,
        MAX(cal.CALENDAR_DATE) AS EOQ_SNAPSHOT_DATE
    FROM SelectedQtrs sq
    JOIN vw_EBI_CALDATE cal
        ON cal.QTR_BKT_IND = sq.QUALIFICATION_QTR_BKT + 1
        AND cal.WeekNumberName = 'W01'
    WHERE sq.QUALIFICATION_QTR_BKT < 0
    GROUP BY sq.QUALIFICATION_QTR_BKT
)
SELECT
    SUM(p.OPPTY) AS [Gross Created QTD $]
FROM SelectedQtrs sq
JOIN vw_TF_EBI_P2S p ON 1 = 1
JOIN vw_EBI_CALDATE qual_cal
    ON p.OPP_CREATE_DATE_ID = qual_cal.DATE_KEY
    AND qual_cal.QTR_BKT_IND = sq.QUALIFICATION_QTR_BKT
JOIN vw_EBI_CALDATE close_cal
    ON p.OPP_CLOSE_DATE_ID = close_cal.DATE_KEY
    AND close_cal.QTR_BKT_IND IN (
        sq.QUALIFICATION_QTR_BKT,
        sq.QUALIFICATION_QTR_BKT + 1,
        sq.QUALIFICATION_QTR_BKT + 2,
        sq.QUALIFICATION_QTR_BKT + 3,
        sq.QUALIFICATION_QTR_BKT + 4
    )
JOIN vw_ebi_sales_stage s
    ON p.SALES_STAGE_ID = s.SALES_STAGE_ID
    AND s.SALES_STAGE NOT IN ('S1', 'S2', 'Closed CleanUp from Non Pipe', 'Closed Lost from Non Pipe')
LEFT JOIN EOQSnapshotDates eoq
    ON sq.QUALIFICATION_QTR_BKT = eoq.QUALIFICATION_QTR_BKT
LEFT JOIN vw_EBI_CALDATE snap_cal
    ON p.SNAPSHOT_DATE_ID = snap_cal.DATE_KEY
WHERE
    sq.QUALIFICATION_QTR_BKT >= 0
    OR (sq.QUALIFICATION_QTR_BKT < 0 AND snap_cal.CALENDAR_DATE = eoq.EOQ_SNAPSHOT_DATE)`,
    relatedTables: ["vw_TF_EBI_P2S", "vw_EBI_CALDATE", "vw_ebi_sales_stage"],
    relatedColumns: [
      "vw_TF_EBI_P2S.OPPTY",
      "vw_TF_EBI_P2S.OPP_CREATE_DATE_ID",
      "vw_TF_EBI_P2S.OPP_CLOSE_DATE_ID",
      "vw_TF_EBI_P2S.SNAPSHOT_DATE_ID",
      "vw_EBI_CALDATE.QTR_BKT_IND",
      "vw_EBI_CALDATE.FISCAL_YR_AND_QTR_DESC",
      "vw_EBI_CALDATE.WeekNumberName",
      "vw_ebi_sales_stage.SALES_STAGE"
    ],
    parameters: "@QualificationQtrs NVARCHAR(MAX) = NULL — comma-separated FISCAL_YR_AND_QTR_DESC values. NULL = current quarter (BKT=0)",
    keyLogic: "BKT >= 0: no snapshot filter. BKT < 0: pins to EOQ snapshot (W01 of next quarter). Excludes S1, S2, Closed CleanUp from Non Pipe, Closed Lost from Non Pipe. Close quarter within 4 quarters of qualification quarter."
  },

  // ─── 2. GROSS CREATED YTD $ ───
  gross_created_ytd_dollar: {
    definition: "Accumulates GROSS CREATED QTD $ across all quarters in the same fiscal year, up to and including the selected quarter.",
    section: "Pipeline",
    confidence: "verified",
    formula: `;WITH Params AS (
    SELECT
        CASE
            WHEN @SelectedQtr IS NOT NULL THEN (
                SELECT TOP 1 cal.FISCAL_YR FROM vw_EBI_CALDATE cal
                WHERE cal.FISCAL_YR_AND_QTR_DESC = @SelectedQtr
            )
            ELSE (
                SELECT TOP 1 cal.FISCAL_YR FROM vw_EBI_CALDATE cal
                WHERE cal.QTR_BKT_IND = 0
            )
        END AS TargetYr,
        CASE
            WHEN @SelectedQtr IS NOT NULL THEN (
                SELECT TOP 1 cal.QTR_BKT_IND FROM vw_EBI_CALDATE cal
                WHERE cal.FISCAL_YR_AND_QTR_DESC = @SelectedQtr
            )
            ELSE 0
        END AS TargetQtrBkt
),
YTDQuarters AS (
    SELECT DISTINCT cal.QTR_BKT_IND AS QUAL_QTR_BKT
    FROM vw_EBI_CALDATE cal
    CROSS JOIN Params pm
    WHERE cal.FISCAL_YR = pm.TargetYr
      AND cal.QTR_BKT_IND <= pm.TargetQtrBkt
),
EOQSnapshotDates AS (
    SELECT
        yq.QUAL_QTR_BKT,
        MAX(cal.CALENDAR_DATE) AS EOQ_SNAPSHOT_DATE
    FROM YTDQuarters yq
    JOIN vw_EBI_CALDATE cal
        ON cal.QTR_BKT_IND = yq.QUAL_QTR_BKT + 1
        AND cal.WeekNumberName = 'W01'
    WHERE yq.QUAL_QTR_BKT < 0
    GROUP BY yq.QUAL_QTR_BKT
)
SELECT
    SUM(p.OPPTY) AS [Gross Created YTD $]
FROM YTDQuarters yq
JOIN vw_TF_EBI_P2S p ON 1 = 1
JOIN vw_EBI_CALDATE qual_cal
    ON p.OPP_CREATE_DATE_ID = qual_cal.DATE_KEY
    AND qual_cal.QTR_BKT_IND = yq.QUAL_QTR_BKT
JOIN vw_EBI_CALDATE close_cal
    ON p.OPP_CLOSE_DATE_ID = close_cal.DATE_KEY
    AND close_cal.QTR_BKT_IND IN (
        yq.QUAL_QTR_BKT,
        yq.QUAL_QTR_BKT + 1,
        yq.QUAL_QTR_BKT + 2,
        yq.QUAL_QTR_BKT + 3,
        yq.QUAL_QTR_BKT + 4
    )
JOIN vw_ebi_sales_stage s
    ON p.SALES_STAGE_ID = s.SALES_STAGE_ID
    AND s.SALES_STAGE NOT IN ('S1', 'S2', 'Closed CleanUp from Non Pipe', 'Closed Lost from Non Pipe')
LEFT JOIN EOQSnapshotDates eoq
    ON yq.QUAL_QTR_BKT = eoq.QUAL_QTR_BKT
LEFT JOIN vw_EBI_CALDATE snap_cal
    ON p.SNAPSHOT_DATE_ID = snap_cal.DATE_KEY
WHERE
    yq.QUAL_QTR_BKT >= 0
    OR (yq.QUAL_QTR_BKT < 0 AND snap_cal.CALENDAR_DATE = eoq.EOQ_SNAPSHOT_DATE)`,
    relatedTables: ["vw_TF_EBI_P2S", "vw_EBI_CALDATE", "vw_ebi_sales_stage"],
    relatedColumns: [
      "vw_TF_EBI_P2S.OPPTY",
      "vw_TF_EBI_P2S.OPP_CREATE_DATE_ID",
      "vw_TF_EBI_P2S.OPP_CLOSE_DATE_ID",
      "vw_TF_EBI_P2S.SNAPSHOT_DATE_ID",
      "vw_EBI_CALDATE.QTR_BKT_IND",
      "vw_EBI_CALDATE.FISCAL_YR_AND_QTR_DESC",
      "vw_EBI_CALDATE.FISCAL_YR",
      "vw_EBI_CALDATE.WeekNumberName",
      "vw_ebi_sales_stage.SALES_STAGE"
    ],
    parameters: "@SelectedQtr NVARCHAR(20) = NULL — single FISCAL_YR_AND_QTR_DESC value. NULL = current quarter",
    keyLogic: "Wraps GROSS CREATED QTD $ with a YTD accumulator. YTDQuarters CTE expands to all quarters in the same fiscal year with QTR_BKT_IND <= target."
  },

  // ─── 3. GROSS CREATED WTD $ ───
  gross_created_wtd_dollar: {
    definition: "Week-to-date version. Filters OPPTY to a specific week within the qualification quarter, then applies quarter/stage filters.",
    section: "Pipeline",
    confidence: "verified",
    formula: `;WITH QtrParams AS (
    SELECT COALESCE(
        (SELECT TOP 1 cal.QTR_BKT_IND FROM vw_EBI_CALDATE cal
         WHERE cal.FISCAL_YR_AND_QTR_DESC = @SelectedQtr),
        0
    ) AS SelectedQtrBkt
),
WeekParams AS (
    SELECT 'Daily' AS Freq,
        CASE
            WHEN (SELECT MAX(snap.QTR_BKT_IND) FROM vw_EBI_CALDATE snap
                  WHERE snap.WEEK_SORT_ORDER_REVERSE = '0') = 1
            THEN (SELECT MAX(snap.FISCAL_WEEK_NUMBER_BY_QTR)
                  FROM vw_EBI_CALDATE snap WHERE snap.QTR_BKT_IND = 0)
            ELSE (SELECT MIN(qual.FISCAL_WEEK_NUMBER_BY_QTR)
                  FROM vw_EBI_CALDATE qual WHERE qual.WEEK_BKT_NUMBER = 0)
        END AS TargetWeekNo
    UNION ALL
    SELECT 'Weekly' AS Freq,
        CASE
            WHEN (SELECT MAX(snap.QTR_BKT_IND) FROM vw_EBI_CALDATE snap
                  WHERE snap.CALENDAR_DATE = (
                      SELECT MIN(s2.CALENDAR_DATE) FROM vw_EBI_CALDATE s2
                      WHERE s2.WEEK_SORT_ORDER_REVERSE_RTB = '0'
                  )) = 1
            THEN (SELECT MAX(snap.FISCAL_WEEK_NUMBER_BY_QTR)
                  FROM vw_EBI_CALDATE snap WHERE snap.QTR_BKT_IND = 0)
            ELSE (SELECT MIN(qual.FISCAL_WEEK_NUMBER_BY_QTR)
                  FROM vw_EBI_CALDATE qual WHERE qual.CALENDAR_DATE = (
                      SELECT MIN(s2.CALENDAR_DATE) FROM vw_EBI_CALDATE s2
                      WHERE s2.WEEK_SORT_ORDER_REVERSE_RTB = '0'
                  ))
        END AS TargetWeekNo
)
SELECT
    SUM(p.OPPTY) AS [Gross Created WTD $]
FROM vw_TF_EBI_P2S p
CROSS JOIN QtrParams qp
JOIN vw_EBI_CALDATE qual_cal
    ON p.OPP_CREATE_DATE_ID = qual_cal.DATE_KEY
    AND qual_cal.QTR_BKT_IND = qp.SelectedQtrBkt
    AND qual_cal.FISCAL_WEEK_NUMBER_BY_QTR = (
        SELECT wp.TargetWeekNo FROM WeekParams wp WHERE wp.Freq = @Frequency
    )
JOIN vw_EBI_CALDATE close_cal
    ON p.OPP_CLOSE_DATE_ID = close_cal.DATE_KEY
    AND close_cal.QTR_BKT_IND IN (
        qp.SelectedQtrBkt,
        qp.SelectedQtrBkt + 1,
        qp.SelectedQtrBkt + 2,
        qp.SelectedQtrBkt + 3,
        qp.SelectedQtrBkt + 4
    )
JOIN vw_ebi_sales_stage s
    ON p.SALES_STAGE_ID = s.SALES_STAGE_ID
    AND s.SALES_STAGE NOT IN (
        'S1', 'S2', 'Closed CleanUp from Non Pipe', 'Closed Lost from Non Pipe'
    )`,
    relatedTables: ["vw_TF_EBI_P2S", "vw_EBI_CALDATE", "vw_ebi_sales_stage"],
    relatedColumns: [
      "vw_TF_EBI_P2S.OPPTY",
      "vw_TF_EBI_P2S.OPP_CREATE_DATE_ID",
      "vw_TF_EBI_P2S.OPP_CLOSE_DATE_ID",
      "vw_EBI_CALDATE.QTR_BKT_IND",
      "vw_EBI_CALDATE.FISCAL_WEEK_NUMBER_BY_QTR",
      "vw_EBI_CALDATE.WEEK_BKT_NUMBER",
      "vw_EBI_CALDATE.WEEK_SORT_ORDER_REVERSE",
      "vw_EBI_CALDATE.WEEK_SORT_ORDER_REVERSE_RTB",
      "vw_ebi_sales_stage.SALES_STAGE"
    ],
    parameters: "@SelectedQtr NVARCHAR(20) = NULL — single quarter. @Frequency NVARCHAR(10) = 'Daily' — 'Daily' or 'Weekly'",
    keyLogic: "Daily/Weekly frequency switch resolves target week. Quarter boundary edge case: if snapshot week falls in next quarter (QTR_BKT=1), falls back to last week of current quarter."
  },

  // ─── 4. FULL QUARTER GROSS CREATION ───
  full_quarter_gross_creation: {
    definition: "Sums generation targets across 5 close quarter buckets. Uses IN_QTR_GC_TARGET for the base quarter and PIPE_TARGET_SURVIVAL_RATE * multiplier for CQ+1 through CQ+4.",
    section: "Pipeline Creation / Generation Target",
    confidence: "verified",
    formula: `;WITH SelectedQtrs AS (
    SELECT DISTINCT
        cal.FISCAL_YR_AND_QTR_DESC AS QUALIFICATION_QTR,
        cal.QTR_BKT_IND           AS BASE_QTR_BKT
    FROM vw_EBI_CALDATE cal
    WHERE (@QualificationQtrs IS NOT NULL
           AND cal.FISCAL_YR_AND_QTR_DESC IN (
               SELECT TRIM(value) FROM STRING_SPLIT(@QualificationQtrs, ',')
           ))
       OR (@QualificationQtrs IS NULL AND cal.QTR_BKT_IND = 0)
),
GenerationCQ AS (
    SELECT sq.QUALIFICATION_QTR, sq.BASE_QTR_BKT,
        SUM(q.IN_QTR_GC_TARGET) AS Amount
    FROM SelectedQtrs sq
    JOIN vw_EBI_CALDATE cal ON cal.QTR_BKT_IND = sq.BASE_QTR_BKT
    JOIN vw_TF_EBI_QUOTA q ON q.QUOTA_FISCAL_QUARTER_ID = cal.DATE_KEY
    GROUP BY sq.QUALIFICATION_QTR, sq.BASE_QTR_BKT
),
GenerationFuture AS (
    SELECT sq.QUALIFICATION_QTR, sq.BASE_QTR_BKT,
        o.n AS QTR_OFFSET,
        SUM(q.PIPE_TARGET_SURVIVAL_RATE) AS GenTarget
    FROM SelectedQtrs sq
    CROSS JOIN (VALUES (1),(2),(3),(4)) o(n)
    JOIN vw_EBI_CALDATE cal ON cal.QTR_BKT_IND = sq.BASE_QTR_BKT + o.n
    JOIN vw_TF_EBI_QUOTA q ON q.QUOTA_FISCAL_QUARTER_ID = cal.DATE_KEY
    GROUP BY sq.QUALIFICATION_QTR, sq.BASE_QTR_BKT, o.n
)
SELECT
    SUM(
        cq.Amount
        + ISNULL(f1.GenTarget, 0)
        + ISNULL(f2.GenTarget, 0)
        + ISNULL(f3.GenTarget, 0)
        + ISNULL(f4.GenTarget, 0)
    ) AS [Full Quarter Gross Creation]
FROM GenerationCQ cq
LEFT JOIN GenerationFuture f1
    ON cq.QUALIFICATION_QTR = f1.QUALIFICATION_QTR AND f1.QTR_OFFSET = 1
LEFT JOIN GenerationFuture f2
    ON cq.QUALIFICATION_QTR = f2.QUALIFICATION_QTR AND f2.QTR_OFFSET = 2
LEFT JOIN GenerationFuture f3
    ON cq.QUALIFICATION_QTR = f3.QUALIFICATION_QTR AND f3.QTR_OFFSET = 3
LEFT JOIN GenerationFuture f4
    ON cq.QUALIFICATION_QTR = f4.QUALIFICATION_QTR AND f4.QTR_OFFSET = 4`,
    relatedTables: ["vw_TF_EBI_QUOTA", "vw_EBI_CALDATE"],
    relatedColumns: [
      "vw_TF_EBI_QUOTA.IN_QTR_GC_TARGET",
      "vw_TF_EBI_QUOTA.PIPE_TARGET_SURVIVAL_RATE",
      "vw_TF_EBI_QUOTA.QUOTA_FISCAL_QUARTER_ID",
      "vw_EBI_CALDATE.QTR_BKT_IND",
      "vw_EBI_CALDATE.FISCAL_YR_AND_QTR_DESC"
    ],
    parameters: "@QualificationQtrs NVARCHAR(MAX) = NULL — comma-separated quarters. NULL = current (BKT=0). @MultiplierCQ1..CQ4 FLOAT = 1.0 — from Power BI Generation Target Multipliers table",
    keyLogic: "Uses Quota path only (vw_TF_EBI_QUOTA). CQ component = IN_QTR_GC_TARGET. Future components = PIPE_TARGET_SURVIVAL_RATE * multiplier for CQ+1..CQ+4."
  },

  // ─── 5. GROSS CREATION QTD ───
  gross_creation_qtd: {
    definition: "Phased version of FULL QUARTER GROSS CREATION. Prorates the full quarter generation target by current week progress within the quarter. Uses hockey-stick phasing for Q1 (10% in first 6 weeks, 90% in last 7 weeks) and linear phasing for other quarters.",
    section: "Pipeline Creation / Generation Target",
    confidence: "verified",
    formula: `;WITH
ReconWeek AS (
    SELECT
        CASE
            WHEN (SELECT MIN(cal.QTR_BKT_IND) FROM vw_EBI_CALDATE cal
                  WHERE cal.CALENDAR_DATE = (
                      SELECT MIN(c2.CALENDAR_DATE) FROM vw_EBI_CALDATE c2
                      WHERE c2.WEEK_SORT_ORDER_REVERSE = '0'
                  )) = 1
            THEN (SELECT MAX(CAST(cal.FISCAL_WEEK_NUMBER_BY_QTR AS INT))
                  FROM vw_EBI_CALDATE cal WHERE cal.QTR_BKT_IND = 0)
            ELSE (SELECT MAX(CAST(cal.FISCAL_WEEK_NUMBER_BY_QTR AS INT))
                  FROM vw_EBI_CALDATE cal
                  WHERE cal.CALENDAR_DATE = (
                      SELECT MIN(c2.CALENDAR_DATE) FROM vw_EBI_CALDATE c2
                      WHERE c2.WEEK_SORT_ORDER_REVERSE = '0'
                  ))
        END AS CurrentWeek
),
SelectedQtrs AS (
    SELECT DISTINCT
        cal.FISCAL_YR_AND_QTR_DESC AS QUALIFICATION_QTR,
        cal.QTR_BKT_IND           AS BASE_QTR_BKT
    FROM vw_EBI_CALDATE cal
    WHERE (@QualificationQtrs IS NOT NULL
           AND cal.FISCAL_YR_AND_QTR_DESC IN (
               SELECT TRIM(value) FROM STRING_SPLIT(@QualificationQtrs, ',')
           ))
       OR (@QualificationQtrs IS NULL AND cal.QTR_BKT_IND = 0)
),
GenerationCQ AS (
    SELECT sq.QUALIFICATION_QTR, sq.BASE_QTR_BKT,
        SUM(q.IN_QTR_GC_TARGET) AS Amount
    FROM SelectedQtrs sq
    JOIN vw_EBI_CALDATE cal ON cal.QTR_BKT_IND = sq.BASE_QTR_BKT
    JOIN vw_TF_EBI_QUOTA q ON q.QUOTA_FISCAL_QUARTER_ID = cal.DATE_KEY
    GROUP BY sq.QUALIFICATION_QTR, sq.BASE_QTR_BKT
),
GenerationFuture AS (
    SELECT sq.QUALIFICATION_QTR, sq.BASE_QTR_BKT,
        o.n AS QTR_OFFSET,
        SUM(q.PIPE_TARGET_SURVIVAL_RATE) AS GenTarget
    FROM SelectedQtrs sq
    CROSS JOIN (VALUES (1),(2),(3),(4)) o(n)
    JOIN vw_EBI_CALDATE cal ON cal.QTR_BKT_IND = sq.BASE_QTR_BKT + o.n
    JOIN vw_TF_EBI_QUOTA q ON q.QUOTA_FISCAL_QUARTER_ID = cal.DATE_KEY
    GROUP BY sq.QUALIFICATION_QTR, sq.BASE_QTR_BKT, o.n
),
FullQtrGrossCreation AS (
    SELECT cq.QUALIFICATION_QTR, cq.BASE_QTR_BKT,
        cq.Amount
        + ISNULL(f1.GenTarget, 0)
        + ISNULL(f2.GenTarget, 0)
        + ISNULL(f3.GenTarget, 0)
        + ISNULL(f4.GenTarget, 0) AS Qt
    FROM GenerationCQ cq
    LEFT JOIN GenerationFuture f1 ON cq.QUALIFICATION_QTR = f1.QUALIFICATION_QTR AND f1.QTR_OFFSET = 1
    LEFT JOIN GenerationFuture f2 ON cq.QUALIFICATION_QTR = f2.QUALIFICATION_QTR AND f2.QTR_OFFSET = 2
    LEFT JOIN GenerationFuture f3 ON cq.QUALIFICATION_QTR = f3.QUALIFICATION_QTR AND f3.QTR_OFFSET = 3
    LEFT JOIN GenerationFuture f4 ON cq.QUALIFICATION_QTR = f4.QUALIFICATION_QTR AND f4.QTR_OFFSET = 4
)
SELECT
    SUM(
        CASE
            WHEN fq.BASE_QTR_BKT < 0 THEN fq.Qt
            WHEN fq.BASE_QTR_BKT = 0 THEN
                CASE
                    WHEN RIGHT(fq.QUALIFICATION_QTR, 2) = 'Q1' THEN
                        CASE
                            WHEN rw.CurrentWeek <= 6
                                THEN (fq.Qt * 0.1 * rw.CurrentWeek) / 6.0
                            ELSE (fq.Qt * 0.1) + (fq.Qt * 0.9 * (rw.CurrentWeek - 6)) / 7.0
                        END
                    ELSE (fq.Qt * rw.CurrentWeek) / 13.0
                END
            ELSE NULL
        END
    ) AS [Gross Creation QTD]
FROM FullQtrGrossCreation fq
CROSS JOIN ReconWeek rw`,
    relatedTables: ["vw_TF_EBI_QUOTA", "vw_EBI_CALDATE"],
    relatedColumns: [
      "vw_TF_EBI_QUOTA.IN_QTR_GC_TARGET",
      "vw_TF_EBI_QUOTA.PIPE_TARGET_SURVIVAL_RATE",
      "vw_TF_EBI_QUOTA.QUOTA_FISCAL_QUARTER_ID",
      "vw_EBI_CALDATE.QTR_BKT_IND",
      "vw_EBI_CALDATE.FISCAL_YR_AND_QTR_DESC",
      "vw_EBI_CALDATE.FISCAL_WEEK_NUMBER_BY_QTR",
      "vw_EBI_CALDATE.WEEK_SORT_ORDER_REVERSE"
    ],
    parameters: "@QualificationQtrs NVARCHAR(MAX) = NULL. @MultiplierCQ1..CQ4 FLOAT = 1.0",
    keyLogic: "Historical (BKT<0): full target. Current Q1 weeks 1-6: Qt*0.1*week/6. Current Q1 weeks 7-13: Qt*0.1 + Qt*0.9*(week-6)/7. Current non-Q1: Qt*week/13. Future: NULL."
  },

  // ─── 6. GROSS CREATION YTD ───
  gross_creation_ytd: {
    definition: "YTD accumulator over GROSS CREATION QTD. Sums phased generation targets across all quarters in the same fiscal year, up to and including the selected quarter.",
    section: "Pipeline Creation / Generation Target",
    confidence: "verified",
    formula: `;WITH
ReconWeek AS (
    SELECT
        CASE
            WHEN (SELECT MIN(cal.QTR_BKT_IND) FROM vw_EBI_CALDATE cal
                  WHERE cal.CALENDAR_DATE = (
                      SELECT MIN(c2.CALENDAR_DATE) FROM vw_EBI_CALDATE c2
                      WHERE c2.WEEK_SORT_ORDER_REVERSE = '0'
                  )) = 1
            THEN (SELECT MAX(CAST(cal.FISCAL_WEEK_NUMBER_BY_QTR AS INT))
                  FROM vw_EBI_CALDATE cal WHERE cal.QTR_BKT_IND = 0)
            ELSE (SELECT MAX(CAST(cal.FISCAL_WEEK_NUMBER_BY_QTR AS INT))
                  FROM vw_EBI_CALDATE cal
                  WHERE cal.CALENDAR_DATE = (
                      SELECT MIN(c2.CALENDAR_DATE) FROM vw_EBI_CALDATE c2
                      WHERE c2.WEEK_SORT_ORDER_REVERSE = '0'
                  ))
        END AS CurrentWeek
),
Params AS (
    SELECT
        CASE WHEN @SelectedQtr IS NOT NULL
            THEN (SELECT TOP 1 cal.FISCAL_YR FROM vw_EBI_CALDATE cal
                  WHERE cal.FISCAL_YR_AND_QTR_DESC = @SelectedQtr)
            ELSE (SELECT TOP 1 cal.FISCAL_YR FROM vw_EBI_CALDATE cal
                  WHERE cal.QTR_BKT_IND = 0)
        END AS TargetYr,
        CASE WHEN @SelectedQtr IS NOT NULL
            THEN (SELECT TOP 1 cal.QTR_BKT_IND FROM vw_EBI_CALDATE cal
                  WHERE cal.FISCAL_YR_AND_QTR_DESC = @SelectedQtr)
            ELSE 0
        END AS TargetQtrBkt
),
YTDQuarters AS (
    SELECT DISTINCT
        cal.FISCAL_YR_AND_QTR_DESC AS QUALIFICATION_QTR,
        cal.QTR_BKT_IND           AS BASE_QTR_BKT
    FROM vw_EBI_CALDATE cal
    CROSS JOIN Params pm
    WHERE cal.FISCAL_YR = pm.TargetYr
      AND cal.QTR_BKT_IND <= pm.TargetQtrBkt
),
GenerationCQ AS (
    SELECT sq.QUALIFICATION_QTR, sq.BASE_QTR_BKT,
        SUM(q.IN_QTR_GC_TARGET) AS Amount
    FROM YTDQuarters sq
    JOIN vw_EBI_CALDATE cal ON cal.QTR_BKT_IND = sq.BASE_QTR_BKT
    JOIN vw_TF_EBI_QUOTA q ON q.QUOTA_FISCAL_QUARTER_ID = cal.DATE_KEY
    GROUP BY sq.QUALIFICATION_QTR, sq.BASE_QTR_BKT
),
GenerationFuture AS (
    SELECT sq.QUALIFICATION_QTR, sq.BASE_QTR_BKT,
        o.n AS QTR_OFFSET,
        SUM(q.PIPE_TARGET_SURVIVAL_RATE) AS GenTarget
    FROM YTDQuarters sq
    CROSS JOIN (VALUES (1),(2),(3),(4)) o(n)
    JOIN vw_EBI_CALDATE cal ON cal.QTR_BKT_IND = sq.BASE_QTR_BKT + o.n
    JOIN vw_TF_EBI_QUOTA q ON q.QUOTA_FISCAL_QUARTER_ID = cal.DATE_KEY
    GROUP BY sq.QUALIFICATION_QTR, sq.BASE_QTR_BKT, o.n
),
FullQtrGrossCreation AS (
    SELECT cq.QUALIFICATION_QTR, cq.BASE_QTR_BKT,
        cq.Amount
        + ISNULL(f1.GenTarget, 0)
        + ISNULL(f2.GenTarget, 0)
        + ISNULL(f3.GenTarget, 0)
        + ISNULL(f4.GenTarget, 0) AS Qt
    FROM GenerationCQ cq
    LEFT JOIN GenerationFuture f1 ON cq.QUALIFICATION_QTR = f1.QUALIFICATION_QTR AND f1.QTR_OFFSET = 1
    LEFT JOIN GenerationFuture f2 ON cq.QUALIFICATION_QTR = f2.QUALIFICATION_QTR AND f2.QTR_OFFSET = 2
    LEFT JOIN GenerationFuture f3 ON cq.QUALIFICATION_QTR = f3.QUALIFICATION_QTR AND f3.QTR_OFFSET = 3
    LEFT JOIN GenerationFuture f4 ON cq.QUALIFICATION_QTR = f4.QUALIFICATION_QTR AND f4.QTR_OFFSET = 4
)
SELECT
    SUM(
        CASE
            WHEN fq.BASE_QTR_BKT < 0 THEN fq.Qt
            WHEN fq.BASE_QTR_BKT = 0 THEN
                CASE
                    WHEN RIGHT(fq.QUALIFICATION_QTR, 2) = 'Q1' THEN
                        CASE
                            WHEN rw.CurrentWeek <= 6
                                THEN (fq.Qt * 0.1 * rw.CurrentWeek) / 6.0
                            ELSE (fq.Qt * 0.1) + (fq.Qt * 0.9 * (rw.CurrentWeek - 6)) / 7.0
                        END
                    ELSE (fq.Qt * rw.CurrentWeek) / 13.0
                END
            ELSE NULL
        END
    ) AS [Gross Creation YTD]
FROM FullQtrGrossCreation fq
CROSS JOIN ReconWeek rw`,
    relatedTables: ["vw_TF_EBI_QUOTA", "vw_EBI_CALDATE"],
    relatedColumns: [
      "vw_TF_EBI_QUOTA.IN_QTR_GC_TARGET",
      "vw_TF_EBI_QUOTA.PIPE_TARGET_SURVIVAL_RATE",
      "vw_TF_EBI_QUOTA.QUOTA_FISCAL_QUARTER_ID",
      "vw_EBI_CALDATE.QTR_BKT_IND",
      "vw_EBI_CALDATE.FISCAL_YR_AND_QTR_DESC",
      "vw_EBI_CALDATE.FISCAL_YR",
      "vw_EBI_CALDATE.FISCAL_WEEK_NUMBER_BY_QTR",
      "vw_EBI_CALDATE.WEEK_SORT_ORDER_REVERSE"
    ],
    parameters: "@SelectedQtr NVARCHAR(20) = NULL — single quarter. @MultiplierCQ1..CQ4 FLOAT = 1.0",
    keyLogic: "YTDQuarters CTE: all quarters where FISCAL_YR = target year AND QTR_BKT_IND <= target BKT. Each quarter gets its own FULL QUARTER GROSS CREATION then phased. Historical contribute full target; current contributes phased amount."
  },

  // ─── 7. GROSS CREATION WTD ───
  gross_creation_wtd: {
    definition: "Per-week generation target. Divides FULL QUARTER GROSS CREATION by 13 (or hockey-stick for Q1). Unlike QTD which accumulates weeks, WTD gives the single-week target amount.",
    section: "Pipeline Creation / Generation Target",
    confidence: "verified",
    formula: `;WITH
ReconWeek AS (
    SELECT
        CASE
            WHEN (SELECT MIN(cal.QTR_BKT_IND) FROM vw_EBI_CALDATE cal
                  WHERE cal.CALENDAR_DATE = (
                      SELECT MIN(c2.CALENDAR_DATE) FROM vw_EBI_CALDATE c2
                      WHERE c2.WEEK_SORT_ORDER_REVERSE = '0'
                  )) = 1
            THEN (SELECT MAX(CAST(cal.FISCAL_WEEK_NUMBER_BY_QTR AS INT))
                  FROM vw_EBI_CALDATE cal WHERE cal.QTR_BKT_IND = 0)
            ELSE (SELECT MAX(CAST(cal.FISCAL_WEEK_NUMBER_BY_QTR AS INT))
                  FROM vw_EBI_CALDATE cal
                  WHERE cal.CALENDAR_DATE = (
                      SELECT MIN(c2.CALENDAR_DATE) FROM vw_EBI_CALDATE c2
                      WHERE c2.WEEK_SORT_ORDER_REVERSE = '0'
                  ))
        END AS CurrentWeek
),
CurrentQtrInfo AS (
    SELECT
        CASE WHEN @QualificationQtrs IS NOT NULL
            THEN (SELECT TOP 1 RIGHT(cal.FISCAL_YR_AND_QTR_DESC, 2)
                  FROM vw_EBI_CALDATE cal
                  WHERE cal.FISCAL_YR_AND_QTR_DESC IN (
                      SELECT TRIM(value) FROM STRING_SPLIT(@QualificationQtrs, ',')
                  ))
            ELSE (SELECT TOP 1 RIGHT(cal.FISCAL_YR_AND_QTR_DESC, 2)
                  FROM vw_EBI_CALDATE cal WHERE cal.QTR_BKT_IND = 0)
        END AS GenericQtr
),
SelectedQtrs AS (
    SELECT DISTINCT
        cal.FISCAL_YR_AND_QTR_DESC AS QUALIFICATION_QTR,
        cal.QTR_BKT_IND           AS BASE_QTR_BKT
    FROM vw_EBI_CALDATE cal
    WHERE (@QualificationQtrs IS NOT NULL
           AND cal.FISCAL_YR_AND_QTR_DESC IN (
               SELECT TRIM(value) FROM STRING_SPLIT(@QualificationQtrs, ',')
           ))
       OR (@QualificationQtrs IS NULL AND cal.QTR_BKT_IND = 0)
),
GenerationCQ AS (
    SELECT sq.QUALIFICATION_QTR, sq.BASE_QTR_BKT,
        SUM(q.IN_QTR_GC_TARGET) AS Amount
    FROM SelectedQtrs sq
    JOIN vw_EBI_CALDATE cal ON cal.QTR_BKT_IND = sq.BASE_QTR_BKT
    JOIN vw_TF_EBI_QUOTA q ON q.QUOTA_FISCAL_QUARTER_ID = cal.DATE_KEY
    GROUP BY sq.QUALIFICATION_QTR, sq.BASE_QTR_BKT
),
GenerationFuture AS (
    SELECT sq.QUALIFICATION_QTR, sq.BASE_QTR_BKT,
        o.n AS QTR_OFFSET,
        SUM(q.PIPE_TARGET_SURVIVAL_RATE) AS GenTarget
    FROM SelectedQtrs sq
    CROSS JOIN (VALUES (1),(2),(3),(4)) o(n)
    JOIN vw_EBI_CALDATE cal ON cal.QTR_BKT_IND = sq.BASE_QTR_BKT + o.n
    JOIN vw_TF_EBI_QUOTA q ON q.QUOTA_FISCAL_QUARTER_ID = cal.DATE_KEY
    GROUP BY sq.QUALIFICATION_QTR, sq.BASE_QTR_BKT, o.n
),
FullQtrGrossCreation AS (
    SELECT cq.QUALIFICATION_QTR, cq.BASE_QTR_BKT,
        cq.Amount
        + ISNULL(f1.GenTarget, 0)
        + ISNULL(f2.GenTarget, 0)
        + ISNULL(f3.GenTarget, 0)
        + ISNULL(f4.GenTarget, 0) AS Qt
    FROM GenerationCQ cq
    LEFT JOIN GenerationFuture f1 ON cq.QUALIFICATION_QTR = f1.QUALIFICATION_QTR AND f1.QTR_OFFSET = 1
    LEFT JOIN GenerationFuture f2 ON cq.QUALIFICATION_QTR = f2.QUALIFICATION_QTR AND f2.QTR_OFFSET = 2
    LEFT JOIN GenerationFuture f3 ON cq.QUALIFICATION_QTR = f3.QUALIFICATION_QTR AND f3.QTR_OFFSET = 3
    LEFT JOIN GenerationFuture f4 ON cq.QUALIFICATION_QTR = f4.QUALIFICATION_QTR AND f4.QTR_OFFSET = 4
)
SELECT
    SUM(
        CASE
            WHEN fq.BASE_QTR_BKT <= 0 THEN
                CASE
                    WHEN cqi.GenericQtr = 'Q1' THEN
                        CASE
                            WHEN rw.CurrentWeek <= 6 THEN (fq.Qt * 0.1) / 6.0
                            ELSE (fq.Qt * 0.9) / 7.0
                        END
                    ELSE fq.Qt / 13.0
                END
            ELSE NULL
        END
    ) AS [Gross Creation WTD]
FROM FullQtrGrossCreation fq
CROSS JOIN ReconWeek rw
CROSS JOIN CurrentQtrInfo cqi`,
    relatedTables: ["vw_TF_EBI_QUOTA", "vw_EBI_CALDATE"],
    relatedColumns: [
      "vw_TF_EBI_QUOTA.IN_QTR_GC_TARGET",
      "vw_TF_EBI_QUOTA.PIPE_TARGET_SURVIVAL_RATE",
      "vw_TF_EBI_QUOTA.QUOTA_FISCAL_QUARTER_ID",
      "vw_EBI_CALDATE.QTR_BKT_IND",
      "vw_EBI_CALDATE.FISCAL_YR_AND_QTR_DESC",
      "vw_EBI_CALDATE.FISCAL_WEEK_NUMBER_BY_QTR",
      "vw_EBI_CALDATE.WEEK_SORT_ORDER_REVERSE"
    ],
    parameters: "@QualificationQtrs NVARCHAR(MAX) = NULL. @MultiplierCQ1..CQ4 FLOAT = 1.0",
    keyLogic: "Q1 hockey-stick: weeks 1-6 = Qt*0.1/6, weeks 7-13 = Qt*0.9/7. Non-Q1 linear: Qt/13. Future: NULL."
  },

  // ─── 8. GAP -VE GROSS CREATED VS GROSS CREATION TARGET QTD $ ───
  gap_ve_gross_created_vs_gross_creation_target_qtd_dollar: {
    definition: "Negative-only gap between actual pipeline created (GROSS CREATED QTD $) and the generation target (GROSS CREATION QTD). Returns 0 if ahead of target; returns the negative shortfall if behind.",
    section: "Pipeline",
    confidence: "verified",
    formula: `;WITH
ReconWeek AS (
    SELECT
        CASE
            WHEN (SELECT MIN(cal.QTR_BKT_IND) FROM vw_EBI_CALDATE cal
                  WHERE cal.CALENDAR_DATE = (
                      SELECT MIN(c2.CALENDAR_DATE) FROM vw_EBI_CALDATE c2
                      WHERE c2.WEEK_SORT_ORDER_REVERSE = '0'
                  )) = 1
            THEN (SELECT MAX(CAST(cal.FISCAL_WEEK_NUMBER_BY_QTR AS INT))
                  FROM vw_EBI_CALDATE cal WHERE cal.QTR_BKT_IND = 0)
            ELSE (SELECT MAX(CAST(cal.FISCAL_WEEK_NUMBER_BY_QTR AS INT))
                  FROM vw_EBI_CALDATE cal
                  WHERE cal.CALENDAR_DATE = (
                      SELECT MIN(c2.CALENDAR_DATE) FROM vw_EBI_CALDATE c2
                      WHERE c2.WEEK_SORT_ORDER_REVERSE = '0'
                  ))
        END AS CurrentWeek
),
SelectedQtrs AS (
    SELECT DISTINCT
        cal.FISCAL_YR_AND_QTR_DESC AS QUALIFICATION_QTR,
        cal.QTR_BKT_IND           AS BASE_QTR_BKT
    FROM vw_EBI_CALDATE cal
    WHERE (@QualificationQtrs IS NOT NULL
           AND cal.FISCAL_YR_AND_QTR_DESC IN (
               SELECT TRIM(value) FROM STRING_SPLIT(@QualificationQtrs, ',')
           ))
       OR (@QualificationQtrs IS NULL AND cal.QTR_BKT_IND = 0)
),
EOQSnapshotDates AS (
    SELECT sq.BASE_QTR_BKT,
        MAX(cal.CALENDAR_DATE) AS EOQ_SNAPSHOT_DATE
    FROM SelectedQtrs sq
    JOIN vw_EBI_CALDATE cal
        ON cal.QTR_BKT_IND = sq.BASE_QTR_BKT + 1
        AND cal.WeekNumberName = 'W01'
    WHERE sq.BASE_QTR_BKT < 0
    GROUP BY sq.BASE_QTR_BKT
),
GrossCreatedQTD AS (
    SELECT SUM(p.OPPTY) AS Val
    FROM SelectedQtrs sq
    JOIN vw_TF_EBI_P2S p ON 1 = 1
    JOIN vw_EBI_CALDATE qual_cal
        ON p.OPP_CREATE_DATE_ID = qual_cal.DATE_KEY
        AND qual_cal.QTR_BKT_IND = sq.BASE_QTR_BKT
    JOIN vw_EBI_CALDATE close_cal
        ON p.OPP_CLOSE_DATE_ID = close_cal.DATE_KEY
        AND close_cal.QTR_BKT_IND IN (
            sq.BASE_QTR_BKT, sq.BASE_QTR_BKT + 1, sq.BASE_QTR_BKT + 2,
            sq.BASE_QTR_BKT + 3, sq.BASE_QTR_BKT + 4
        )
    JOIN vw_ebi_sales_stage s
        ON p.SALES_STAGE_ID = s.SALES_STAGE_ID
        AND s.SALES_STAGE NOT IN ('S1', 'S2', 'Closed CleanUp from Non Pipe', 'Closed Lost from Non Pipe')
    LEFT JOIN EOQSnapshotDates eoq ON sq.BASE_QTR_BKT = eoq.BASE_QTR_BKT
    LEFT JOIN vw_EBI_CALDATE snap_cal ON p.SNAPSHOT_DATE_ID = snap_cal.DATE_KEY
    WHERE sq.BASE_QTR_BKT >= 0
       OR (sq.BASE_QTR_BKT < 0 AND snap_cal.CALENDAR_DATE = eoq.EOQ_SNAPSHOT_DATE)
),
GenerationCQ AS (
    SELECT sq.QUALIFICATION_QTR, sq.BASE_QTR_BKT,
        SUM(q.IN_QTR_GC_TARGET) AS Amount
    FROM SelectedQtrs sq
    JOIN vw_EBI_CALDATE cal ON cal.QTR_BKT_IND = sq.BASE_QTR_BKT
    JOIN vw_TF_EBI_QUOTA q ON q.QUOTA_FISCAL_QUARTER_ID = cal.DATE_KEY
    GROUP BY sq.QUALIFICATION_QTR, sq.BASE_QTR_BKT
),
GenerationFuture AS (
    SELECT sq.QUALIFICATION_QTR, sq.BASE_QTR_BKT,
        o.n AS QTR_OFFSET,
        SUM(q.PIPE_TARGET_SURVIVAL_RATE) AS GenTarget
    FROM SelectedQtrs sq
    CROSS JOIN (VALUES (1),(2),(3),(4)) o(n)
    JOIN vw_EBI_CALDATE cal ON cal.QTR_BKT_IND = sq.BASE_QTR_BKT + o.n
    JOIN vw_TF_EBI_QUOTA q ON q.QUOTA_FISCAL_QUARTER_ID = cal.DATE_KEY
    GROUP BY sq.QUALIFICATION_QTR, sq.BASE_QTR_BKT, o.n
),
FullQtrGrossCreation AS (
    SELECT cq.QUALIFICATION_QTR, cq.BASE_QTR_BKT,
        cq.Amount
        + ISNULL(f1.GenTarget, 0)
        + ISNULL(f2.GenTarget, 0)
        + ISNULL(f3.GenTarget, 0)
        + ISNULL(f4.GenTarget, 0) AS Qt
    FROM GenerationCQ cq
    LEFT JOIN GenerationFuture f1 ON cq.QUALIFICATION_QTR = f1.QUALIFICATION_QTR AND f1.QTR_OFFSET = 1
    LEFT JOIN GenerationFuture f2 ON cq.QUALIFICATION_QTR = f2.QUALIFICATION_QTR AND f2.QTR_OFFSET = 2
    LEFT JOIN GenerationFuture f3 ON cq.QUALIFICATION_QTR = f3.QUALIFICATION_QTR AND f3.QTR_OFFSET = 3
    LEFT JOIN GenerationFuture f4 ON cq.QUALIFICATION_QTR = f4.QUALIFICATION_QTR AND f4.QTR_OFFSET = 4
),
GrossCreationQTD AS (
    SELECT SUM(
        CASE
            WHEN fq.BASE_QTR_BKT < 0 THEN fq.Qt
            WHEN fq.BASE_QTR_BKT = 0 THEN
                CASE
                    WHEN RIGHT(fq.QUALIFICATION_QTR, 2) = 'Q1' THEN
                        CASE
                            WHEN rw.CurrentWeek <= 6
                                THEN (fq.Qt * 0.1 * rw.CurrentWeek) / 6.0
                            ELSE (fq.Qt * 0.1) + (fq.Qt * 0.9 * (rw.CurrentWeek - 6)) / 7.0
                        END
                    ELSE (fq.Qt * rw.CurrentWeek) / 13.0
                END
            ELSE NULL
        END
    ) AS Val
    FROM FullQtrGrossCreation fq
    CROSS JOIN ReconWeek rw
)
SELECT
    CASE
        WHEN gc.Val - gt.Val > 0 THEN 0
        ELSE gc.Val - gt.Val
    END AS [Gap -ve Gross Created vs Gross Creation Target QTD $]
FROM GrossCreatedQTD gc
CROSS JOIN GrossCreationQTD gt`,
    relatedTables: ["vw_TF_EBI_P2S", "vw_TF_EBI_QUOTA", "vw_EBI_CALDATE", "vw_ebi_sales_stage"],
    relatedColumns: [
      "vw_TF_EBI_P2S.OPPTY",
      "vw_TF_EBI_P2S.OPP_CREATE_DATE_ID",
      "vw_TF_EBI_P2S.OPP_CLOSE_DATE_ID",
      "vw_TF_EBI_P2S.SNAPSHOT_DATE_ID",
      "vw_TF_EBI_QUOTA.IN_QTR_GC_TARGET",
      "vw_TF_EBI_QUOTA.PIPE_TARGET_SURVIVAL_RATE",
      "vw_EBI_CALDATE.QTR_BKT_IND",
      "vw_EBI_CALDATE.FISCAL_YR_AND_QTR_DESC",
      "vw_ebi_sales_stage.SALES_STAGE"
    ],
    parameters: "@QualificationQtrs NVARCHAR(MAX) = NULL. @MultiplierCQ1..CQ4 FLOAT = 1.0",
    keyLogic: "Computes GROSS CREATED QTD $ and GROSS CREATION QTD independently as CTEs, then IF(Gap > 0, 0, Gap) — only surfaces negative gaps (shortfalls)."
  },

  // ─── 9-11, 13. FULL QUARTER GROSS CREATION Q1-Q4 ───
  // Parameterized template — hardcoded to specific quarter
  full_quarter_gross_creation_q1: _fqgcQn('Q1'),
  full_quarter_gross_creation_q2: _fqgcQn('Q2'),
  full_quarter_gross_creation_q3: _fqgcQn('Q3'),
  full_quarter_gross_creation_q4: _fqgcQn('Q4'),

  // ─── 12. GROSS CREATION QTD TREND ───
  gross_creation_qtd_trend: {
    definition: "Week-by-week trend line of the phased generation target across the quarter. Used to plot the target curve on weekly charts. Takes @WeekNum as parameter (the x-axis week number) instead of using RECON LAST WEEK.",
    section: "Pipeline Creation / Generation Target",
    confidence: "verified",
    formula: `;WITH
SelectedQtrs AS (
    SELECT DISTINCT
        cal.FISCAL_YR_AND_QTR_DESC AS QUALIFICATION_QTR,
        cal.QTR_BKT_IND           AS BASE_QTR_BKT
    FROM vw_EBI_CALDATE cal
    WHERE (@QualificationQtrs IS NOT NULL
           AND cal.FISCAL_YR_AND_QTR_DESC IN (
               SELECT TRIM(value) FROM STRING_SPLIT(@QualificationQtrs, ',')
           ))
       OR (@QualificationQtrs IS NULL AND cal.QTR_BKT_IND = 0)
),
GenericQtr AS (
    SELECT TOP 1 RIGHT(cal.FISCAL_YR_AND_QTR_DESC, 2) AS Val
    FROM vw_EBI_CALDATE cal
    WHERE (@QualificationQtrs IS NOT NULL
           AND cal.FISCAL_YR_AND_QTR_DESC IN (
               SELECT TRIM(value) FROM STRING_SPLIT(@QualificationQtrs, ',')
           ))
       OR (@QualificationQtrs IS NULL AND cal.QTR_BKT_IND = 0)
),
MaxWeek AS (
    SELECT MAX(CAST(cal.FISCAL_WEEK_NUMBER_BY_QTR AS INT)) AS Val
    FROM vw_EBI_CALDATE cal
    JOIN SelectedQtrs sq ON cal.QTR_BKT_IND = sq.BASE_QTR_BKT
),
GenerationCQ AS (
    SELECT sq.QUALIFICATION_QTR, sq.BASE_QTR_BKT,
        SUM(q.IN_QTR_GC_TARGET) AS Amount
    FROM SelectedQtrs sq
    JOIN vw_EBI_CALDATE cal ON cal.QTR_BKT_IND = sq.BASE_QTR_BKT
    JOIN vw_TF_EBI_QUOTA q ON q.QUOTA_FISCAL_QUARTER_ID = cal.DATE_KEY
    GROUP BY sq.QUALIFICATION_QTR, sq.BASE_QTR_BKT
),
GenerationFuture AS (
    SELECT sq.QUALIFICATION_QTR, sq.BASE_QTR_BKT,
        o.n AS QTR_OFFSET,
        SUM(q.PIPE_TARGET_SURVIVAL_RATE) AS GenTarget
    FROM SelectedQtrs sq
    CROSS JOIN (VALUES (1),(2),(3),(4)) o(n)
    JOIN vw_EBI_CALDATE cal ON cal.QTR_BKT_IND = sq.BASE_QTR_BKT + o.n
    JOIN vw_TF_EBI_QUOTA q ON q.QUOTA_FISCAL_QUARTER_ID = cal.DATE_KEY
    GROUP BY sq.QUALIFICATION_QTR, sq.BASE_QTR_BKT, o.n
),
FullQtr AS (
    SELECT
        cq.Amount
        + ISNULL(f1.GenTarget, 0)
        + ISNULL(f2.GenTarget, 0)
        + ISNULL(f3.GenTarget, 0)
        + ISNULL(f4.GenTarget, 0) AS Qt
    FROM GenerationCQ cq
    LEFT JOIN GenerationFuture f1 ON cq.QUALIFICATION_QTR = f1.QUALIFICATION_QTR AND f1.QTR_OFFSET = 1
    LEFT JOIN GenerationFuture f2 ON cq.QUALIFICATION_QTR = f2.QUALIFICATION_QTR AND f2.QTR_OFFSET = 2
    LEFT JOIN GenerationFuture f3 ON cq.QUALIFICATION_QTR = f3.QUALIFICATION_QTR AND f3.QTR_OFFSET = 3
    LEFT JOIN GenerationFuture f4 ON cq.QUALIFICATION_QTR = f4.QUALIFICATION_QTR AND f4.QTR_OFFSET = 4
)
SELECT
    CASE
        WHEN gq.Val = 'Q1' THEN
            CASE
                WHEN @WeekNum <= 6
                    THEN (fq.Qt * 0.1 * @WeekNum) / 6.0
                ELSE (fq.Qt * 0.1) + (fq.Qt * 0.9 * (@WeekNum - 6)) / 7.0
            END
        ELSE (fq.Qt * @WeekNum) / mw.Val
    END AS [Gross Creation QTD Trend]
FROM FullQtr fq
CROSS JOIN MaxWeek mw
CROSS JOIN GenericQtr gq`,
    relatedTables: ["vw_TF_EBI_QUOTA", "vw_EBI_CALDATE"],
    relatedColumns: [
      "vw_TF_EBI_QUOTA.IN_QTR_GC_TARGET",
      "vw_TF_EBI_QUOTA.PIPE_TARGET_SURVIVAL_RATE",
      "vw_TF_EBI_QUOTA.QUOTA_FISCAL_QUARTER_ID",
      "vw_EBI_CALDATE.QTR_BKT_IND",
      "vw_EBI_CALDATE.FISCAL_YR_AND_QTR_DESC",
      "vw_EBI_CALDATE.FISCAL_WEEK_NUMBER_BY_QTR"
    ],
    parameters: "@WeekNum INT (required) — week number 1-13 on chart x-axis. @QualificationQtrs NVARCHAR(MAX) = NULL. @MultiplierCQ1..CQ4 FLOAT = 1.0",
    keyLogic: "Takes @WeekNum as input instead of RECON LAST WEEK, producing one data point per week for a trend chart. Uses MAXWEEKNUMBER (dynamic, from calendar) instead of hardcoded 13."
  },

  // ─── 14. GROSS CREATION % ───
  gross_creation_pct: {
    definition: "Ratio of total pipeline (OPPTY $, unfiltered) to the phased generation target (GROSS CREATION QTD). Indicates how many multiples of the target have been created. Returns as a decimal (e.g. 5.23 = 523%).",
    section: "Performance Measures",
    confidence: "verified",
    formula: `DIVIDE([OPPTY $], [GROSS CREATION QTD]) — where [OPPTY $] = SUM(p.OPPTY) unfiltered and [GROSS CREATION QTD] = phased target from FULL QUARTER GROSS CREATION. Full SQL: SELECT SUM(p.OPPTY) / NULLIF(GrossCreationQTD.Val, 0) AS [Gross Creation %] FROM vw_TF_EBI_P2S p CROSS JOIN (/* GROSS CREATION QTD CTE chain — see gross_creation_qtd */) GrossCreationQTD`,
    relatedTables: ["vw_TF_EBI_P2S", "vw_TF_EBI_QUOTA", "vw_EBI_CALDATE"],
    relatedColumns: [
      "vw_TF_EBI_P2S.OPPTY",
      "vw_TF_EBI_QUOTA.IN_QTR_GC_TARGET",
      "vw_TF_EBI_QUOTA.PIPE_TARGET_SURVIVAL_RATE",
      "vw_EBI_CALDATE.QTR_BKT_IND"
    ],
    parameters: "@QualificationQtrs NVARCHAR(MAX) = NULL. @MultiplierCQ1..CQ4 FLOAT = 1.0",
    keyLogic: "Numerator = OPPTY $ (unfiltered total pipeline across all snapshots/quarters). Denominator = GROSS CREATION QTD (phased target). Result is a coverage ratio."
  },

  // ─── 15. GROSS CREATION QTD % ───
  gross_creation_qtd_pct: {
    definition: "Ratio of actual pipeline created (GROSS CREATED QTD $) to the phased generation target (GROSS CREATION QTD). Returns 0 if target < 1. This is the filtered pipeline version (unlike GROSS CREATION % which uses unfiltered OPPTY $).",
    section: "Performance Measures",
    confidence: "verified",
    formula: `CASE WHEN [GROSS CREATION QTD] < 1 THEN 0 ELSE [GROSS CREATED QTD $] / [GROSS CREATION QTD] END — Uses same CTE chain as GAP measure. Full SQL: SELECT CASE WHEN gt.Val < 1 THEN 0 ELSE gc.Val / gt.Val END AS [Gross Creation QTD %] FROM GrossCreatedQTD gc CROSS JOIN GrossCreationQTD gt`,
    relatedTables: ["vw_TF_EBI_P2S", "vw_TF_EBI_QUOTA", "vw_EBI_CALDATE", "vw_ebi_sales_stage"],
    relatedColumns: [
      "vw_TF_EBI_P2S.OPPTY",
      "vw_TF_EBI_P2S.OPP_CREATE_DATE_ID",
      "vw_TF_EBI_P2S.OPP_CLOSE_DATE_ID",
      "vw_TF_EBI_QUOTA.IN_QTR_GC_TARGET",
      "vw_TF_EBI_QUOTA.PIPE_TARGET_SURVIVAL_RATE",
      "vw_EBI_CALDATE.QTR_BKT_IND",
      "vw_ebi_sales_stage.SALES_STAGE"
    ],
    parameters: "@QualificationQtrs NVARCHAR(MAX) = NULL. @MultiplierCQ1..CQ4 FLOAT = 1.0",
    keyLogic: "Numerator = GROSS CREATED QTD $ (filtered pipeline). Denominator = GROSS CREATION QTD. Returns 0 if target < 1 to avoid nonsense ratios."
  },

  // ─── 16. GROSS CREATION WTD % ───
  gross_creation_wtd_pct: {
    definition: "Week-to-date ratio of actual pipeline created to the weekly generation target. GROSS CREATED WTD $ / GROSS CREATION WTD.",
    section: "Performance Measures",
    confidence: "verified",
    formula: `DIVIDE([GROSS CREATED WTD $], [GROSS CREATION WTD]) — Compose: numerator = GROSS CREATED WTD $ (query #3), denominator = GROSS CREATION WTD (query #7). Full SQL: SELECT wtd_actual.Val / NULLIF(wtd_target.Val, 0) AS [Gross Creation WTD %] FROM GrossCreatedWTD wtd_actual CROSS JOIN GrossCreationWTD wtd_target`,
    relatedTables: ["vw_TF_EBI_P2S", "vw_TF_EBI_QUOTA", "vw_EBI_CALDATE", "vw_ebi_sales_stage"],
    relatedColumns: [
      "vw_TF_EBI_P2S.OPPTY",
      "vw_TF_EBI_P2S.OPP_CREATE_DATE_ID",
      "vw_TF_EBI_P2S.OPP_CLOSE_DATE_ID",
      "vw_TF_EBI_QUOTA.IN_QTR_GC_TARGET",
      "vw_TF_EBI_QUOTA.PIPE_TARGET_SURVIVAL_RATE",
      "vw_EBI_CALDATE.QTR_BKT_IND",
      "vw_EBI_CALDATE.FISCAL_WEEK_NUMBER_BY_QTR",
      "vw_ebi_sales_stage.SALES_STAGE"
    ],
    parameters: "@QualificationQtrs NVARCHAR(MAX) = NULL. @Frequency NVARCHAR(10) = 'Daily'. @MultiplierCQ1..CQ4 FLOAT = 1.0",
    keyLogic: "Composition of GROSS CREATED WTD $ (actual, filtered by week) / GROSS CREATION WTD (target, per-week). Time grain = WTD."
  },
};

// ── Helper for FULL QUARTER GROSS CREATION Q1-Q4 ───
function _fqgcQn(qn) {
  return {
    definition: `Same as FULL QUARTER GROSS CREATION but hardcoded to ${qn} of the selected/current fiscal year. Used in YTD decomposition views to show individual quarter targets.`,
    section: "Pipeline Creation / Generation Target",
    confidence: "verified",
    formula: `;WITH
Params AS (
    SELECT COALESCE(
        @SelectedYr,
        (SELECT TOP 1 cal.FISCAL_YR FROM vw_EBI_CALDATE cal WHERE cal.QTR_BKT_IND = 0)
    ) AS TargetYr
),
QBkt AS (
    SELECT MIN(cal.QTR_BKT_IND) AS BKT
    FROM vw_EBI_CALDATE cal
    CROSS JOIN Params pm
    WHERE RIGHT(cal.FISCAL_YR_AND_QTR_DESC, 2) = '${qn}'
      AND cal.FISCAL_YR = pm.TargetYr
),
GenerationCQ AS (
    SELECT SUM(q.IN_QTR_GC_TARGET) AS Amount
    FROM QBkt b
    JOIN vw_EBI_CALDATE cal ON cal.QTR_BKT_IND = b.BKT
    JOIN vw_TF_EBI_QUOTA q ON q.QUOTA_FISCAL_QUARTER_ID = cal.DATE_KEY
),
GenerationFuture AS (
    SELECT o.n AS QTR_OFFSET,
        SUM(q.PIPE_TARGET_SURVIVAL_RATE) AS GenTarget
    FROM QBkt b
    CROSS JOIN (VALUES (1),(2),(3),(4)) o(n)
    JOIN vw_EBI_CALDATE cal ON cal.QTR_BKT_IND = b.BKT + o.n
    JOIN vw_TF_EBI_QUOTA q ON q.QUOTA_FISCAL_QUARTER_ID = cal.DATE_KEY
    GROUP BY o.n
)
SELECT
    cq.Amount
    + ISNULL(f1.GenTarget, 0)
    + ISNULL(f2.GenTarget, 0)
    + ISNULL(f3.GenTarget, 0)
    + ISNULL(f4.GenTarget, 0)
    AS [Full Quarter Gross Creation ${qn}]
FROM GenerationCQ cq
LEFT JOIN GenerationFuture f1 ON f1.QTR_OFFSET = 1
LEFT JOIN GenerationFuture f2 ON f2.QTR_OFFSET = 2
LEFT JOIN GenerationFuture f3 ON f3.QTR_OFFSET = 3
LEFT JOIN GenerationFuture f4 ON f4.QTR_OFFSET = 4`,
    relatedTables: ["vw_TF_EBI_QUOTA", "vw_EBI_CALDATE"],
    relatedColumns: [
      "vw_TF_EBI_QUOTA.IN_QTR_GC_TARGET",
      "vw_TF_EBI_QUOTA.PIPE_TARGET_SURVIVAL_RATE",
      "vw_TF_EBI_QUOTA.QUOTA_FISCAL_QUARTER_ID",
      "vw_EBI_CALDATE.QTR_BKT_IND",
      "vw_EBI_CALDATE.FISCAL_YR_AND_QTR_DESC",
      "vw_EBI_CALDATE.FISCAL_YR"
    ],
    parameters: `@SelectedYr INT = NULL — fiscal year. NULL = current year. @MultiplierCQ1..CQ4 FLOAT = 1.0`,
    keyLogic: `Always targets ${qn} of the given year via RIGHT(FISCAL_YR_AND_QTR_DESC, 2) = '${qn}'. Same FULL QUARTER GROSS CREATION logic with hardcoded quarter.`
  };
}

// ── Apply updates ──────────────────────────────────────────────────────────

let updatedCount = 0;
for (const kpi of glossary.kpis) {
  const upd = updates[kpi.id];
  if (!upd) continue;

  kpi.definition = upd.definition;
  kpi.formula = upd.formula;
  kpi.confidence = upd.confidence;
  kpi.relatedTables = upd.relatedTables;
  kpi.relatedColumns = upd.relatedColumns;
  if (upd.section) kpi.section = upd.section;
  // Add new fields for agent context
  kpi.parameters = upd.parameters;
  kpi.keyLogic = upd.keyLogic;

  updatedCount++;
  console.log(`  Updated: ${kpi.id} (${kpi.name})`);
}

console.log(`\nTotal updated: ${updatedCount} / ${Object.keys(updates).length} expected`);

// Verify all expected IDs were found
const missing = Object.keys(updates).filter(id => !glossary.kpis.find(k => k.id === id));
if (missing.length) {
  console.error('WARNING — IDs not found in glossary:', missing);
}

fs.writeFileSync(glossaryPath, JSON.stringify(glossary, null, 2), 'utf8');
console.log('Wrote updated glossary to', glossaryPath);
