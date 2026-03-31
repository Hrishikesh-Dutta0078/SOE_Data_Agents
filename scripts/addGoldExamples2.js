#!/usr/bin/env node
/**
 * Adds remaining 11 gold examples for pipeline creation KPIs.
 * Run: node scripts/addGoldExamples2.js
 */
const fs = require('fs');
const path = require('path');

const examplesPath = path.join(__dirname, '..', 'server', 'context', 'goldExamples.json');
const data = JSON.parse(fs.readFileSync(examplesPath, 'utf8'));

const pipeFilters = `p.PAY_MEASURE_ID = 0 AND p.ROLE_COVERAGE_ID IN (1, 3) AND r.SALES_TEAM_BU IN ('#NA','DX','DX/DME','WW') AND (r.SALES_REGION NOT LIKE '%DME%' OR r.SALES_REGION IS NULL) AND r.SALES_TEAM NOT IN ('AMER IND PS DX','AMER LATAM PS','AMER ENT PS DX','AMER PUB SEC SPECIALIST') AND o.MOPG1 <> 'ADVERTISING' AND o.DMX_SOLUTION_GROUP <> 'PPBU'`;
const quotaFilters = `q.PAY_MEASURE_ID = 0 AND r.TERR_ID NOT LIKE '%_%Dummy%' AND q.ROLE_COVERAGE_ID IN (1, 3) AND r.SALES_TEAM_BU IN ('#NA','DX','DX/DME','WW') AND (r.SALES_REGION NOT LIKE '%DME%' OR r.SALES_REGION IS NULL) AND r.SALES_TEAM NOT IN ('AMER IND PS DX','AMER LATAM PS','AMER ENT PS DX','AMER PUB SEC SPECIALIST') AND o.MOPG1 <> 'ADVERTISING' AND o.DMX_SOLUTION_GROUP <> 'PPBU'`;

const newExamples = [
  // ─── GROSS CREATED WTD $ ───
  {
    id: "exact__gross_created_wtd",
    question: "How much pipeline was created this week?",
    questionCategory: "WHAT_HAPPENED",
    questionSubCategory: "pipeline_creation",
    sql: `WITH QtrParams AS (
    SELECT 0 AS SelectedQtrBkt
),
WeekParams AS (
    SELECT
        CASE
            WHEN (SELECT MAX(snap.QTR_BKT_IND) FROM vw_EBI_CALDATE snap
                  WHERE snap.WEEK_SORT_ORDER_REVERSE = '0') = 1
            THEN (SELECT MAX(snap.FISCAL_WEEK_NUMBER_BY_QTR)
                  FROM vw_EBI_CALDATE snap WHERE snap.QTR_BKT_IND = 0)
            ELSE (SELECT MIN(qual.FISCAL_WEEK_NUMBER_BY_QTR)
                  FROM vw_EBI_CALDATE qual WHERE qual.WEEK_BKT_NUMBER = 0)
        END AS TargetWeekNo
)
SELECT
    r.TERR_ID,
    r.REP_NAME,
    o.BU,
    rc.ROLE_COVERAGE_BU,
    rc.ROLE_COVERAGE_BU_GROUP,
    SUM(p.OPPTY) AS [Gross Created WTD $]
FROM vw_TF_EBI_P2S p
CROSS JOIN QtrParams qp
JOIN vw_td_ebi_region_rpt r ON p.Region_Id = r.Region_Id
JOIN vw_EBI_CALDATE qual_cal
    ON p.OPP_CREATE_DATE_ID = qual_cal.DATE_KEY
    AND qual_cal.QTR_BKT_IND = qp.SelectedQtrBkt
    AND qual_cal.FISCAL_WEEK_NUMBER_BY_QTR = (SELECT wp.TargetWeekNo FROM WeekParams wp)
JOIN vw_EBI_CALDATE close_cal
    ON p.OPP_CLOSE_DATE_ID = close_cal.DATE_KEY
    AND close_cal.QTR_BKT_IND IN (
        qp.SelectedQtrBkt, qp.SelectedQtrBkt + 1, qp.SelectedQtrBkt + 2,
        qp.SelectedQtrBkt + 3, qp.SelectedQtrBkt + 4
    )
JOIN vw_ebi_sales_stage s
    ON p.SALES_STAGE_ID = s.SALES_STAGE_ID
    AND s.SALES_STAGE NOT IN ('S1', 'S2', 'Closed CleanUp from Non Pipe', 'Closed Lost from Non Pipe')
JOIN vw_EBI_OPG o ON p.OPG_ID = o.OPG_KEY
JOIN vw_TD_EBI_ROLE_Coverage rc ON p.ROLE_COVERAGE_ID = rc.ROLE_COVERAGE_ID
WHERE ${pipeFilters}
GROUP BY r.TERR_ID, r.REP_NAME, o.BU, rc.ROLE_COVERAGE_BU, rc.ROLE_COVERAGE_BU_GROUP
ORDER BY r.TERR_ID`,
    tables_used: [
      "vw_TF_EBI_P2S", "vw_td_ebi_region_rpt", "vw_EBI_CALDATE",
      "vw_ebi_sales_stage", "vw_EBI_OPG", "vw_TD_EBI_ROLE_Coverage"
    ],
    variants: [
      "Gross created WTD",
      "Pipeline created this week",
      "Show gross created pipeline week to date",
      "How much new pipeline this week?",
      "Week to date pipeline creation",
      "What was created this week?"
    ]
  },

  // ─── GROSS CREATION QTD (phased target) ───
  {
    id: "exact__gross_creation_qtd_target",
    question: "What is our phased generation target QTD?",
    questionCategory: "WHAT_HAPPENED",
    questionSubCategory: "pipeline_creation",
    sql: `WITH
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
FullQtr AS (
    SELECT
        r.TERR_ID,
        r.REP_NAME,
        o.BU,
        rc.ROLE_COVERAGE_BU,
        rc.ROLE_COVERAGE_BU_GROUP,
        c.FISCAL_YR_AND_QTR_DESC AS QUALIFICATION_QTR,
        SUM(q.IN_QTR_GC_TARGET) AS Qt
    FROM vw_TF_EBI_QUOTA q
    JOIN vw_td_ebi_region_rpt r ON q.Region_Id = r.Region_Id
    JOIN vw_EBI_CALDATE c ON q.QUOTA_FISCAL_Quarter_ID = c.DATE_KEY
    JOIN vw_EBI_OPG o ON q.OPG_ID = o.OPG_KEY
    JOIN vw_TD_EBI_ROLE_Coverage rc ON q.ROLE_COVERAGE_ID = rc.ROLE_COVERAGE_ID
    WHERE c.QTR_BKT_IND = 0
      AND ${quotaFilters}
    GROUP BY r.TERR_ID, r.REP_NAME, o.BU, rc.ROLE_COVERAGE_BU, rc.ROLE_COVERAGE_BU_GROUP, c.FISCAL_YR_AND_QTR_DESC
)
SELECT
    fq.TERR_ID,
    fq.REP_NAME,
    fq.BU,
    fq.ROLE_COVERAGE_BU,
    fq.ROLE_COVERAGE_BU_GROUP,
    fq.Qt AS [Full Qtr Target],
    CASE
        WHEN RIGHT(fq.QUALIFICATION_QTR, 2) = 'Q1' THEN
            CASE
                WHEN rw.CurrentWeek <= 6 THEN (fq.Qt * 0.1 * rw.CurrentWeek) / 6.0
                ELSE (fq.Qt * 0.1) + (fq.Qt * 0.9 * (rw.CurrentWeek - 6)) / 7.0
            END
        ELSE (fq.Qt * rw.CurrentWeek) / 13.0
    END AS [Gross Creation QTD]
FROM FullQtr fq
CROSS JOIN ReconWeek rw
ORDER BY fq.TERR_ID`,
    tables_used: [
      "vw_TF_EBI_QUOTA", "vw_td_ebi_region_rpt", "vw_EBI_CALDATE",
      "vw_EBI_OPG", "vw_TD_EBI_ROLE_Coverage"
    ],
    variants: [
      "Gross creation QTD",
      "Phased generation target",
      "What's the QTD generation target?",
      "Show phased target quarter to date",
      "What should we have created by now?",
      "Generation target prorated to this week"
    ]
  },

  // ─── GROSS CREATION YTD (phased target YTD) ───
  {
    id: "exact__gross_creation_ytd_target",
    question: "What is the generation target year to date?",
    questionCategory: "WHAT_HAPPENED",
    questionSubCategory: "pipeline_creation",
    sql: `WITH
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
YTDQuarters AS (
    SELECT DISTINCT
        cal.FISCAL_YR_AND_QTR_DESC AS QUALIFICATION_QTR,
        cal.QTR_BKT_IND           AS BASE_QTR_BKT
    FROM vw_EBI_CALDATE cal
    WHERE cal.FISCAL_YR = (SELECT TOP 1 c2.FISCAL_YR FROM vw_EBI_CALDATE c2 WHERE c2.QTR_BKT_IND = 0)
      AND cal.QTR_BKT_IND <= 0
),
FullQtr AS (
    SELECT
        r.TERR_ID,
        r.REP_NAME,
        o.BU,
        rc.ROLE_COVERAGE_BU,
        rc.ROLE_COVERAGE_BU_GROUP,
        yq.QUALIFICATION_QTR,
        yq.BASE_QTR_BKT,
        SUM(q.IN_QTR_GC_TARGET) AS Qt
    FROM YTDQuarters yq
    JOIN vw_EBI_CALDATE cal ON cal.QTR_BKT_IND = yq.BASE_QTR_BKT
    JOIN vw_TF_EBI_QUOTA q ON q.QUOTA_FISCAL_Quarter_ID = cal.DATE_KEY
    JOIN vw_td_ebi_region_rpt r ON q.Region_Id = r.Region_Id
    JOIN vw_EBI_OPG o ON q.OPG_ID = o.OPG_KEY
    JOIN vw_TD_EBI_ROLE_Coverage rc ON q.ROLE_COVERAGE_ID = rc.ROLE_COVERAGE_ID
    WHERE ${quotaFilters}
    GROUP BY r.TERR_ID, r.REP_NAME, o.BU, rc.ROLE_COVERAGE_BU, rc.ROLE_COVERAGE_BU_GROUP,
             yq.QUALIFICATION_QTR, yq.BASE_QTR_BKT
)
SELECT
    fq.TERR_ID,
    fq.REP_NAME,
    fq.BU,
    fq.ROLE_COVERAGE_BU,
    fq.ROLE_COVERAGE_BU_GROUP,
    SUM(
        CASE
            WHEN fq.BASE_QTR_BKT < 0 THEN fq.Qt
            WHEN fq.BASE_QTR_BKT = 0 THEN
                CASE
                    WHEN RIGHT(fq.QUALIFICATION_QTR, 2) = 'Q1' THEN
                        CASE
                            WHEN rw.CurrentWeek <= 6 THEN (fq.Qt * 0.1 * rw.CurrentWeek) / 6.0
                            ELSE (fq.Qt * 0.1) + (fq.Qt * 0.9 * (rw.CurrentWeek - 6)) / 7.0
                        END
                    ELSE (fq.Qt * rw.CurrentWeek) / 13.0
                END
            ELSE NULL
        END
    ) AS [Gross Creation YTD]
FROM FullQtr fq
CROSS JOIN ReconWeek rw
GROUP BY fq.TERR_ID, fq.REP_NAME, fq.BU, fq.ROLE_COVERAGE_BU, fq.ROLE_COVERAGE_BU_GROUP
ORDER BY fq.TERR_ID`,
    tables_used: [
      "vw_TF_EBI_QUOTA", "vw_td_ebi_region_rpt", "vw_EBI_CALDATE",
      "vw_EBI_OPG", "vw_TD_EBI_ROLE_Coverage"
    ],
    variants: [
      "Gross creation YTD",
      "YTD generation target",
      "Show generation target year to date",
      "What's the phased target YTD?",
      "Year to date generation target",
      "How much should we have created YTD?"
    ]
  },

  // ─── GROSS CREATION WTD (per-week target) ───
  {
    id: "exact__gross_creation_wtd_target",
    question: "What is the weekly generation target?",
    questionCategory: "WHAT_HAPPENED",
    questionSubCategory: "pipeline_creation",
    sql: `WITH
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
    SELECT TOP 1 RIGHT(cal.FISCAL_YR_AND_QTR_DESC, 2) AS GenericQtr
    FROM vw_EBI_CALDATE cal WHERE cal.QTR_BKT_IND = 0
),
FullQtr AS (
    SELECT
        r.TERR_ID,
        r.REP_NAME,
        o.BU,
        rc.ROLE_COVERAGE_BU,
        rc.ROLE_COVERAGE_BU_GROUP,
        SUM(q.IN_QTR_GC_TARGET) AS Qt
    FROM vw_TF_EBI_QUOTA q
    JOIN vw_td_ebi_region_rpt r ON q.Region_Id = r.Region_Id
    JOIN vw_EBI_CALDATE c ON q.QUOTA_FISCAL_Quarter_ID = c.DATE_KEY
    JOIN vw_EBI_OPG o ON q.OPG_ID = o.OPG_KEY
    JOIN vw_TD_EBI_ROLE_Coverage rc ON q.ROLE_COVERAGE_ID = rc.ROLE_COVERAGE_ID
    WHERE c.QTR_BKT_IND = 0
      AND ${quotaFilters}
    GROUP BY r.TERR_ID, r.REP_NAME, o.BU, rc.ROLE_COVERAGE_BU, rc.ROLE_COVERAGE_BU_GROUP
)
SELECT
    fq.TERR_ID,
    fq.REP_NAME,
    fq.BU,
    fq.ROLE_COVERAGE_BU,
    fq.ROLE_COVERAGE_BU_GROUP,
    CASE
        WHEN cqi.GenericQtr = 'Q1' THEN
            CASE
                WHEN rw.CurrentWeek <= 6 THEN (fq.Qt * 0.1) / 6.0
                ELSE (fq.Qt * 0.9) / 7.0
            END
        ELSE fq.Qt / 13.0
    END AS [Gross Creation WTD]
FROM FullQtr fq
CROSS JOIN ReconWeek rw
CROSS JOIN CurrentQtrInfo cqi
ORDER BY fq.TERR_ID`,
    tables_used: [
      "vw_TF_EBI_QUOTA", "vw_td_ebi_region_rpt", "vw_EBI_CALDATE",
      "vw_EBI_OPG", "vw_TD_EBI_ROLE_Coverage"
    ],
    variants: [
      "Gross creation WTD",
      "Weekly generation target",
      "What should we create per week?",
      "Show the per-week generation target",
      "What's this week's creation target?",
      "Week to date generation target"
    ]
  },

  // ─── FULL QUARTER GROSS CREATION Q1 ───
  {
    id: "exact__fqgc_q1",
    question: "What is the Q1 generation target?",
    questionCategory: "WHAT_HAPPENED",
    questionSubCategory: "pipeline_creation",
    sql: `WITH
Params AS (
    SELECT TOP 1 cal.FISCAL_YR AS TargetYr FROM vw_EBI_CALDATE cal WHERE cal.QTR_BKT_IND = 0
),
Q1Bkt AS (
    SELECT MIN(cal.QTR_BKT_IND) AS BKT
    FROM vw_EBI_CALDATE cal
    CROSS JOIN Params pm
    WHERE RIGHT(cal.FISCAL_YR_AND_QTR_DESC, 2) = 'Q1'
      AND cal.FISCAL_YR = pm.TargetYr
)
SELECT
    r.TERR_ID,
    r.REP_NAME,
    o.BU,
    rc.ROLE_COVERAGE_BU,
    rc.ROLE_COVERAGE_BU_GROUP,
    SUM(q.IN_QTR_GC_TARGET) AS [Full Quarter Gross Creation Q1]
FROM Q1Bkt b
JOIN vw_EBI_CALDATE cal ON cal.QTR_BKT_IND = b.BKT
JOIN vw_TF_EBI_QUOTA q ON q.QUOTA_FISCAL_Quarter_ID = cal.DATE_KEY
JOIN vw_td_ebi_region_rpt r ON q.Region_Id = r.Region_Id
JOIN vw_EBI_OPG o ON q.OPG_ID = o.OPG_KEY
JOIN vw_TD_EBI_ROLE_Coverage rc ON q.ROLE_COVERAGE_ID = rc.ROLE_COVERAGE_ID
WHERE ${quotaFilters}
GROUP BY r.TERR_ID, r.REP_NAME, o.BU, rc.ROLE_COVERAGE_BU, rc.ROLE_COVERAGE_BU_GROUP
ORDER BY r.TERR_ID`,
    tables_used: [
      "vw_TF_EBI_QUOTA", "vw_td_ebi_region_rpt", "vw_EBI_CALDATE",
      "vw_EBI_OPG", "vw_TD_EBI_ROLE_Coverage"
    ],
    variants: [
      "Full quarter gross creation Q1",
      "Q1 generation target",
      "Show Q1 generation target",
      "What was the Q1 pipeline creation target?",
      "Generation target for Q1"
    ]
  },

  // ─── FULL QUARTER GROSS CREATION Q2 ───
  {
    id: "exact__fqgc_q2",
    question: "What is the Q2 generation target?",
    questionCategory: "WHAT_HAPPENED",
    questionSubCategory: "pipeline_creation",
    sql: `WITH
Params AS (
    SELECT TOP 1 cal.FISCAL_YR AS TargetYr FROM vw_EBI_CALDATE cal WHERE cal.QTR_BKT_IND = 0
),
Q2Bkt AS (
    SELECT MIN(cal.QTR_BKT_IND) AS BKT
    FROM vw_EBI_CALDATE cal
    CROSS JOIN Params pm
    WHERE RIGHT(cal.FISCAL_YR_AND_QTR_DESC, 2) = 'Q2'
      AND cal.FISCAL_YR = pm.TargetYr
)
SELECT
    r.TERR_ID,
    r.REP_NAME,
    o.BU,
    rc.ROLE_COVERAGE_BU,
    rc.ROLE_COVERAGE_BU_GROUP,
    SUM(q.IN_QTR_GC_TARGET) AS [Full Quarter Gross Creation Q2]
FROM Q2Bkt b
JOIN vw_EBI_CALDATE cal ON cal.QTR_BKT_IND = b.BKT
JOIN vw_TF_EBI_QUOTA q ON q.QUOTA_FISCAL_Quarter_ID = cal.DATE_KEY
JOIN vw_td_ebi_region_rpt r ON q.Region_Id = r.Region_Id
JOIN vw_EBI_OPG o ON q.OPG_ID = o.OPG_KEY
JOIN vw_TD_EBI_ROLE_Coverage rc ON q.ROLE_COVERAGE_ID = rc.ROLE_COVERAGE_ID
WHERE ${quotaFilters}
GROUP BY r.TERR_ID, r.REP_NAME, o.BU, rc.ROLE_COVERAGE_BU, rc.ROLE_COVERAGE_BU_GROUP
ORDER BY r.TERR_ID`,
    tables_used: [
      "vw_TF_EBI_QUOTA", "vw_td_ebi_region_rpt", "vw_EBI_CALDATE",
      "vw_EBI_OPG", "vw_TD_EBI_ROLE_Coverage"
    ],
    variants: [
      "Full quarter gross creation Q2",
      "Q2 generation target",
      "Show Q2 generation target",
      "What is the Q2 pipeline creation target?",
      "Generation target for Q2"
    ]
  },

  // ─── FULL QUARTER GROSS CREATION Q3 ───
  {
    id: "exact__fqgc_q3",
    question: "What is the Q3 generation target?",
    questionCategory: "WHAT_HAPPENED",
    questionSubCategory: "pipeline_creation",
    sql: `WITH
Params AS (
    SELECT TOP 1 cal.FISCAL_YR AS TargetYr FROM vw_EBI_CALDATE cal WHERE cal.QTR_BKT_IND = 0
),
Q3Bkt AS (
    SELECT MIN(cal.QTR_BKT_IND) AS BKT
    FROM vw_EBI_CALDATE cal
    CROSS JOIN Params pm
    WHERE RIGHT(cal.FISCAL_YR_AND_QTR_DESC, 2) = 'Q3'
      AND cal.FISCAL_YR = pm.TargetYr
)
SELECT
    r.TERR_ID,
    r.REP_NAME,
    o.BU,
    rc.ROLE_COVERAGE_BU,
    rc.ROLE_COVERAGE_BU_GROUP,
    SUM(q.IN_QTR_GC_TARGET) AS [Full Quarter Gross Creation Q3]
FROM Q3Bkt b
JOIN vw_EBI_CALDATE cal ON cal.QTR_BKT_IND = b.BKT
JOIN vw_TF_EBI_QUOTA q ON q.QUOTA_FISCAL_Quarter_ID = cal.DATE_KEY
JOIN vw_td_ebi_region_rpt r ON q.Region_Id = r.Region_Id
JOIN vw_EBI_OPG o ON q.OPG_ID = o.OPG_KEY
JOIN vw_TD_EBI_ROLE_Coverage rc ON q.ROLE_COVERAGE_ID = rc.ROLE_COVERAGE_ID
WHERE ${quotaFilters}
GROUP BY r.TERR_ID, r.REP_NAME, o.BU, rc.ROLE_COVERAGE_BU, rc.ROLE_COVERAGE_BU_GROUP
ORDER BY r.TERR_ID`,
    tables_used: [
      "vw_TF_EBI_QUOTA", "vw_td_ebi_region_rpt", "vw_EBI_CALDATE",
      "vw_EBI_OPG", "vw_TD_EBI_ROLE_Coverage"
    ],
    variants: [
      "Full quarter gross creation Q3",
      "Q3 generation target",
      "Show Q3 generation target",
      "What is the Q3 pipeline creation target?",
      "Generation target for Q3"
    ]
  },

  // ─── FULL QUARTER GROSS CREATION Q4 ───
  {
    id: "exact__fqgc_q4",
    question: "What is the Q4 generation target?",
    questionCategory: "WHAT_HAPPENED",
    questionSubCategory: "pipeline_creation",
    sql: `WITH
Params AS (
    SELECT TOP 1 cal.FISCAL_YR AS TargetYr FROM vw_EBI_CALDATE cal WHERE cal.QTR_BKT_IND = 0
),
Q4Bkt AS (
    SELECT MIN(cal.QTR_BKT_IND) AS BKT
    FROM vw_EBI_CALDATE cal
    CROSS JOIN Params pm
    WHERE RIGHT(cal.FISCAL_YR_AND_QTR_DESC, 2) = 'Q4'
      AND cal.FISCAL_YR = pm.TargetYr
)
SELECT
    r.TERR_ID,
    r.REP_NAME,
    o.BU,
    rc.ROLE_COVERAGE_BU,
    rc.ROLE_COVERAGE_BU_GROUP,
    SUM(q.IN_QTR_GC_TARGET) AS [Full Quarter Gross Creation Q4]
FROM Q4Bkt b
JOIN vw_EBI_CALDATE cal ON cal.QTR_BKT_IND = b.BKT
JOIN vw_TF_EBI_QUOTA q ON q.QUOTA_FISCAL_Quarter_ID = cal.DATE_KEY
JOIN vw_td_ebi_region_rpt r ON q.Region_Id = r.Region_Id
JOIN vw_EBI_OPG o ON q.OPG_ID = o.OPG_KEY
JOIN vw_TD_EBI_ROLE_Coverage rc ON q.ROLE_COVERAGE_ID = rc.ROLE_COVERAGE_ID
WHERE ${quotaFilters}
GROUP BY r.TERR_ID, r.REP_NAME, o.BU, rc.ROLE_COVERAGE_BU, rc.ROLE_COVERAGE_BU_GROUP
ORDER BY r.TERR_ID`,
    tables_used: [
      "vw_TF_EBI_QUOTA", "vw_td_ebi_region_rpt", "vw_EBI_CALDATE",
      "vw_EBI_OPG", "vw_TD_EBI_ROLE_Coverage"
    ],
    variants: [
      "Full quarter gross creation Q4",
      "Q4 generation target",
      "Show Q4 generation target",
      "What is the Q4 pipeline creation target?",
      "Generation target for Q4"
    ]
  },

  // ─── GROSS CREATION QTD TREND ───
  {
    id: "exact__gross_creation_qtd_trend",
    question: "Show the generation target trend by week",
    questionCategory: "WHAT_HAPPENED",
    questionSubCategory: "pipeline_creation",
    sql: `WITH
Weeks AS (
    SELECT n AS WeekNum FROM (VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13)) w(n)
),
FullQtr AS (
    SELECT
        r.TERR_ID,
        r.REP_NAME,
        c.FISCAL_YR_AND_QTR_DESC AS QUALIFICATION_QTR,
        SUM(q.IN_QTR_GC_TARGET) AS Qt
    FROM vw_TF_EBI_QUOTA q
    JOIN vw_td_ebi_region_rpt r ON q.Region_Id = r.Region_Id
    JOIN vw_EBI_CALDATE c ON q.QUOTA_FISCAL_Quarter_ID = c.DATE_KEY
    JOIN vw_EBI_OPG o ON q.OPG_ID = o.OPG_KEY
    JOIN vw_TD_EBI_ROLE_Coverage rc ON q.ROLE_COVERAGE_ID = rc.ROLE_COVERAGE_ID
    WHERE c.QTR_BKT_IND = 0
      AND ${quotaFilters}
    GROUP BY r.TERR_ID, r.REP_NAME, c.FISCAL_YR_AND_QTR_DESC
),
MaxWeek AS (
    SELECT MAX(CAST(cal.FISCAL_WEEK_NUMBER_BY_QTR AS INT)) AS Val
    FROM vw_EBI_CALDATE cal WHERE cal.QTR_BKT_IND = 0
),
GenericQtr AS (
    SELECT TOP 1 RIGHT(cal.FISCAL_YR_AND_QTR_DESC, 2) AS Val
    FROM vw_EBI_CALDATE cal WHERE cal.QTR_BKT_IND = 0
)
SELECT
    fq.TERR_ID,
    fq.REP_NAME,
    w.WeekNum,
    CASE
        WHEN gq.Val = 'Q1' THEN
            CASE
                WHEN w.WeekNum <= 6 THEN (fq.Qt * 0.1 * w.WeekNum) / 6.0
                ELSE (fq.Qt * 0.1) + (fq.Qt * 0.9 * (w.WeekNum - 6)) / 7.0
            END
        ELSE (fq.Qt * w.WeekNum) / mw.Val
    END AS [Gross Creation QTD Trend]
FROM FullQtr fq
CROSS JOIN Weeks w
CROSS JOIN MaxWeek mw
CROSS JOIN GenericQtr gq
WHERE w.WeekNum <= mw.Val
ORDER BY fq.TERR_ID, w.WeekNum`,
    tables_used: [
      "vw_TF_EBI_QUOTA", "vw_td_ebi_region_rpt", "vw_EBI_CALDATE",
      "vw_EBI_OPG", "vw_TD_EBI_ROLE_Coverage"
    ],
    variants: [
      "Gross creation QTD trend",
      "Generation target trend",
      "Weekly generation target curve",
      "Show generation target by week",
      "Pipeline creation target trend line",
      "Target phasing week by week"
    ]
  },

  // ─── GROSS CREATION % (unfiltered OPPTY / target) ───
  {
    id: "exact__gross_creation_pct",
    question: "What is the overall gross creation percentage?",
    questionCategory: "WHAT_HAPPENED",
    questionSubCategory: "pipeline_creation",
    sql: `WITH
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
OpptyTotal AS (
    SELECT
        r.TERR_ID,
        r.REP_NAME,
        SUM(p.OPPTY) AS Val
    FROM vw_TF_EBI_P2S p
    JOIN vw_td_ebi_region_rpt r ON p.Region_Id = r.Region_Id
    JOIN vw_EBI_OPG o ON p.OPG_ID = o.OPG_KEY
    JOIN vw_TD_EBI_ROLE_Coverage rc ON p.ROLE_COVERAGE_ID = rc.ROLE_COVERAGE_ID
    WHERE ${pipeFilters}
    GROUP BY r.TERR_ID, r.REP_NAME
),
GenTarget AS (
    SELECT
        r.TERR_ID,
        r.REP_NAME,
        c.FISCAL_YR_AND_QTR_DESC AS QUALIFICATION_QTR,
        SUM(q.IN_QTR_GC_TARGET) AS Qt
    FROM vw_TF_EBI_QUOTA q
    JOIN vw_td_ebi_region_rpt r ON q.Region_Id = r.Region_Id
    JOIN vw_EBI_CALDATE c ON q.QUOTA_FISCAL_Quarter_ID = c.DATE_KEY
    JOIN vw_EBI_OPG o ON q.OPG_ID = o.OPG_KEY
    JOIN vw_TD_EBI_ROLE_Coverage rc ON q.ROLE_COVERAGE_ID = rc.ROLE_COVERAGE_ID
    WHERE c.QTR_BKT_IND = 0
      AND ${quotaFilters}
    GROUP BY r.TERR_ID, r.REP_NAME, c.FISCAL_YR_AND_QTR_DESC
)
SELECT
    ot.TERR_ID,
    ot.REP_NAME,
    ot.Val AS [OPPTY $],
    CASE
        WHEN RIGHT(gt.QUALIFICATION_QTR, 2) = 'Q1' THEN
            CASE
                WHEN rw.CurrentWeek <= 6 THEN (gt.Qt * 0.1 * rw.CurrentWeek) / 6.0
                ELSE (gt.Qt * 0.1) + (gt.Qt * 0.9 * (rw.CurrentWeek - 6)) / 7.0
            END
        ELSE (gt.Qt * rw.CurrentWeek) / 13.0
    END AS [Gross Creation QTD],
    ot.Val / NULLIF(
        CASE
            WHEN RIGHT(gt.QUALIFICATION_QTR, 2) = 'Q1' THEN
                CASE
                    WHEN rw.CurrentWeek <= 6 THEN (gt.Qt * 0.1 * rw.CurrentWeek) / 6.0
                    ELSE (gt.Qt * 0.1) + (gt.Qt * 0.9 * (rw.CurrentWeek - 6)) / 7.0
                END
            ELSE (gt.Qt * rw.CurrentWeek) / 13.0
        END, 0
    ) AS [Gross Creation %]
FROM OpptyTotal ot
JOIN GenTarget gt ON ot.TERR_ID = gt.TERR_ID
CROSS JOIN ReconWeek rw
ORDER BY ot.TERR_ID`,
    tables_used: [
      "vw_TF_EBI_P2S", "vw_TF_EBI_QUOTA", "vw_td_ebi_region_rpt",
      "vw_EBI_CALDATE", "vw_EBI_OPG", "vw_TD_EBI_ROLE_Coverage"
    ],
    variants: [
      "Gross creation %",
      "Pipeline to generation target ratio",
      "What multiple of the generation target have we created?",
      "Show gross creation ratio",
      "Overall creation percentage vs target"
    ]
  },

  // ─── GROSS CREATION WTD % ───
  {
    id: "exact__gross_creation_wtd_pct",
    question: "What is the gross creation WTD percentage?",
    questionCategory: "WHAT_HAPPENED",
    questionSubCategory: "pipeline_creation",
    sql: `WITH
QtrParams AS (
    SELECT 0 AS SelectedQtrBkt
),
WeekParams AS (
    SELECT
        CASE
            WHEN (SELECT MAX(snap.QTR_BKT_IND) FROM vw_EBI_CALDATE snap
                  WHERE snap.WEEK_SORT_ORDER_REVERSE = '0') = 1
            THEN (SELECT MAX(snap.FISCAL_WEEK_NUMBER_BY_QTR)
                  FROM vw_EBI_CALDATE snap WHERE snap.QTR_BKT_IND = 0)
            ELSE (SELECT MIN(qual.FISCAL_WEEK_NUMBER_BY_QTR)
                  FROM vw_EBI_CALDATE qual WHERE qual.WEEK_BKT_NUMBER = 0)
        END AS TargetWeekNo
),
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
    SELECT TOP 1 RIGHT(cal.FISCAL_YR_AND_QTR_DESC, 2) AS GenericQtr
    FROM vw_EBI_CALDATE cal WHERE cal.QTR_BKT_IND = 0
),
CreatedWTD AS (
    SELECT
        r.TERR_ID,
        r.REP_NAME,
        SUM(p.OPPTY) AS Val
    FROM vw_TF_EBI_P2S p
    CROSS JOIN QtrParams qp
    JOIN vw_td_ebi_region_rpt r ON p.Region_Id = r.Region_Id
    JOIN vw_EBI_CALDATE qual_cal
        ON p.OPP_CREATE_DATE_ID = qual_cal.DATE_KEY
        AND qual_cal.QTR_BKT_IND = qp.SelectedQtrBkt
        AND qual_cal.FISCAL_WEEK_NUMBER_BY_QTR = (SELECT wp.TargetWeekNo FROM WeekParams wp)
    JOIN vw_EBI_CALDATE close_cal
        ON p.OPP_CLOSE_DATE_ID = close_cal.DATE_KEY
        AND close_cal.QTR_BKT_IND IN (
            qp.SelectedQtrBkt, qp.SelectedQtrBkt + 1, qp.SelectedQtrBkt + 2,
            qp.SelectedQtrBkt + 3, qp.SelectedQtrBkt + 4
        )
    JOIN vw_ebi_sales_stage s
        ON p.SALES_STAGE_ID = s.SALES_STAGE_ID
        AND s.SALES_STAGE NOT IN ('S1', 'S2', 'Closed CleanUp from Non Pipe', 'Closed Lost from Non Pipe')
    JOIN vw_EBI_OPG o ON p.OPG_ID = o.OPG_KEY
    JOIN vw_TD_EBI_ROLE_Coverage rc ON p.ROLE_COVERAGE_ID = rc.ROLE_COVERAGE_ID
    WHERE ${pipeFilters}
    GROUP BY r.TERR_ID, r.REP_NAME
),
TargetWTD AS (
    SELECT
        r.TERR_ID,
        r.REP_NAME,
        CASE
            WHEN cqi.GenericQtr = 'Q1' THEN
                CASE
                    WHEN rw.CurrentWeek <= 6 THEN (SUM(q.IN_QTR_GC_TARGET) * 0.1) / 6.0
                    ELSE (SUM(q.IN_QTR_GC_TARGET) * 0.9) / 7.0
                END
            ELSE SUM(q.IN_QTR_GC_TARGET) / 13.0
        END AS Val
    FROM vw_TF_EBI_QUOTA q
    JOIN vw_td_ebi_region_rpt r ON q.Region_Id = r.Region_Id
    JOIN vw_EBI_CALDATE c ON q.QUOTA_FISCAL_Quarter_ID = c.DATE_KEY
    JOIN vw_EBI_OPG o ON q.OPG_ID = o.OPG_KEY
    JOIN vw_TD_EBI_ROLE_Coverage rc ON q.ROLE_COVERAGE_ID = rc.ROLE_COVERAGE_ID
    CROSS JOIN ReconWeek rw
    CROSS JOIN CurrentQtrInfo cqi
    WHERE c.QTR_BKT_IND = 0
      AND ${quotaFilters}
    GROUP BY r.TERR_ID, r.REP_NAME, cqi.GenericQtr, rw.CurrentWeek
)
SELECT
    COALESCE(cw.TERR_ID, tw.TERR_ID) AS TERR_ID,
    COALESCE(cw.REP_NAME, tw.REP_NAME) AS REP_NAME,
    cw.Val AS [Gross Created WTD $],
    tw.Val AS [Gross Creation WTD],
    cw.Val / NULLIF(tw.Val, 0) AS [Gross Creation WTD %]
FROM CreatedWTD cw
FULL OUTER JOIN TargetWTD tw ON cw.TERR_ID = tw.TERR_ID
ORDER BY COALESCE(cw.TERR_ID, tw.TERR_ID)`,
    tables_used: [
      "vw_TF_EBI_P2S", "vw_TF_EBI_QUOTA", "vw_td_ebi_region_rpt",
      "vw_EBI_CALDATE", "vw_ebi_sales_stage", "vw_EBI_OPG", "vw_TD_EBI_ROLE_Coverage"
    ],
    variants: [
      "Gross creation WTD %",
      "Weekly pipeline creation percentage",
      "What % of this week's target have we created?",
      "Show WTD creation vs target %",
      "Week to date creation ratio"
    ]
  },
];

// Check for conflicts
const existingIds = new Set(data.examples.map(e => e.id));
const conflicts = newExamples.filter(e => existingIds.has(e.id));
if (conflicts.length) {
  console.error('ID conflicts:', conflicts.map(e => e.id));
  process.exit(1);
}

data.examples.push(...newExamples);
fs.writeFileSync(examplesPath, JSON.stringify(data, null, 2), 'utf8');
console.log(`Added ${newExamples.length} new gold examples. Total: ${data.examples.length}`);
newExamples.forEach(e => console.log(`  ${e.id}: "${e.question}"`));
