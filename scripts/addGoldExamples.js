#!/usr/bin/env node
/**
 * Adds gold examples for the 16 translated pipeline creation KPIs.
 * Run: node scripts/addGoldExamples.js
 */
const fs = require('fs');
const path = require('path');

const examplesPath = path.join(__dirname, '..', 'server', 'context', 'goldExamples.json');
const data = JSON.parse(fs.readFileSync(examplesPath, 'utf8'));

// Standard mandatory filters (from _filterReference)
const pipeFilters = `p.PAY_MEASURE_ID = 0 AND p.ROLE_COVERAGE_ID IN (1, 3) AND r.SALES_TEAM_BU IN ('#NA','DX','DX/DME','WW') AND (r.SALES_REGION NOT LIKE '%DME%' OR r.SALES_REGION IS NULL) AND r.SALES_TEAM NOT IN ('AMER IND PS DX','AMER LATAM PS','AMER ENT PS DX','AMER PUB SEC SPECIALIST') AND o.MOPG1 <> 'ADVERTISING' AND o.DMX_SOLUTION_GROUP <> 'PPBU'`;
const quotaFilters = `q.PAY_MEASURE_ID = 0 AND r.TERR_ID NOT LIKE '%_%Dummy%' AND q.ROLE_COVERAGE_ID IN (1, 3) AND r.SALES_TEAM_BU IN ('#NA','DX','DX/DME','WW') AND (r.SALES_REGION NOT LIKE '%DME%' OR r.SALES_REGION IS NULL) AND r.SALES_TEAM NOT IN ('AMER IND PS DX','AMER LATAM PS','AMER ENT PS DX','AMER PUB SEC SPECIALIST') AND o.MOPG1 <> 'ADVERTISING' AND o.DMX_SOLUTION_GROUP <> 'PPBU'`;
const snapshotSubquery = `p.SNAPSHOT_DATE_ID = (SELECT MAX(p2.SNAPSHOT_DATE_ID) FROM vw_TF_EBI_P2S p2 JOIN vw_EBI_CALDATE c2 ON p2.SNAPSHOT_DATE_ID = c2.DATE_KEY WHERE c2.WEEK_SORT_ORDER_REVERSE = '0')`;

const newExamples = [
  // ─── GROSS CREATED QTD $ ───
  {
    id: "exact__gross_created_qtd",
    question: "How much pipeline was created this quarter?",
    questionCategory: "WHAT_HAPPENED",
    questionSubCategory: "pipeline_creation",
    sql: `SELECT
    r.TERR_ID,
    r.REP_NAME,
    c_qual.FISCAL_YR_AND_QTR_DESC AS Qualification_Qtr,
    o.BU,
    rc.ROLE_COVERAGE_BU,
    rc.ROLE_COVERAGE_BU_GROUP,
    SUM(p.OPPTY) AS [Gross Created QTD $]
FROM vw_TF_EBI_P2S p
JOIN vw_td_ebi_region_rpt r ON p.Region_Id = r.Region_Id
JOIN vw_EBI_CALDATE c_qual ON p.OPP_CREATE_DATE_ID = c_qual.DATE_KEY
JOIN vw_EBI_CALDATE c_close ON p.OPP_CLOSE_DATE_ID = c_close.DATE_KEY
JOIN vw_ebi_sales_stage s ON p.SALES_STAGE_ID = s.SALES_STAGE_ID
JOIN vw_EBI_OPG o ON p.OPG_ID = o.OPG_KEY
JOIN vw_TD_EBI_ROLE_Coverage rc ON p.ROLE_COVERAGE_ID = rc.ROLE_COVERAGE_ID
WHERE c_qual.QTR_BKT_IND = 0
  AND c_close.QTR_BKT_IND IN (0, 1, 2, 3, 4)
  AND s.SALES_STAGE NOT IN ('S1', 'S2', 'Closed CleanUp from Non Pipe', 'Closed Lost from Non Pipe')
  AND ${pipeFilters}
GROUP BY
    r.TERR_ID,
    r.REP_NAME,
    c_qual.FISCAL_YR_AND_QTR_DESC,
    o.BU,
    rc.ROLE_COVERAGE_BU,
    rc.ROLE_COVERAGE_BU_GROUP
ORDER BY r.TERR_ID`,
    tables_used: [
      "vw_TF_EBI_P2S",
      "vw_td_ebi_region_rpt",
      "vw_EBI_CALDATE",
      "vw_ebi_sales_stage",
      "vw_EBI_OPG",
      "vw_TD_EBI_ROLE_Coverage"
    ],
    variants: [
      "Gross created QTD",
      "What is the gross created pipeline this quarter?",
      "Show gross pipeline creation QTD",
      "Pipeline created quarter to date",
      "How much new pipeline was created this quarter?",
      "Gross created pipeline for current quarter"
    ]
  },

  // ─── GROSS CREATED YTD $ ───
  {
    id: "exact__gross_created_ytd",
    question: "How much pipeline was created year to date?",
    questionCategory: "WHAT_HAPPENED",
    questionSubCategory: "pipeline_creation",
    sql: `WITH YTDQuarters AS (
    SELECT DISTINCT cal.QTR_BKT_IND AS QUAL_QTR_BKT
    FROM vw_EBI_CALDATE cal
    WHERE cal.FISCAL_YR = (SELECT TOP 1 c2.FISCAL_YR FROM vw_EBI_CALDATE c2 WHERE c2.QTR_BKT_IND = 0)
      AND cal.QTR_BKT_IND <= 0
),
EOQSnapshotDates AS (
    SELECT yq.QUAL_QTR_BKT,
        MAX(cal.CALENDAR_DATE) AS EOQ_SNAPSHOT_DATE
    FROM YTDQuarters yq
    JOIN vw_EBI_CALDATE cal
        ON cal.QTR_BKT_IND = yq.QUAL_QTR_BKT + 1
        AND cal.WeekNumberName = 'W01'
    WHERE yq.QUAL_QTR_BKT < 0
    GROUP BY yq.QUAL_QTR_BKT
)
SELECT
    r.TERR_ID,
    r.REP_NAME,
    o.BU,
    rc.ROLE_COVERAGE_BU,
    rc.ROLE_COVERAGE_BU_GROUP,
    SUM(p.OPPTY) AS [Gross Created YTD $]
FROM YTDQuarters yq
JOIN vw_TF_EBI_P2S p ON 1 = 1
JOIN vw_td_ebi_region_rpt r ON p.Region_Id = r.Region_Id
JOIN vw_EBI_CALDATE c_qual ON p.OPP_CREATE_DATE_ID = c_qual.DATE_KEY
    AND c_qual.QTR_BKT_IND = yq.QUAL_QTR_BKT
JOIN vw_EBI_CALDATE c_close ON p.OPP_CLOSE_DATE_ID = c_close.DATE_KEY
    AND c_close.QTR_BKT_IND IN (yq.QUAL_QTR_BKT, yq.QUAL_QTR_BKT + 1, yq.QUAL_QTR_BKT + 2, yq.QUAL_QTR_BKT + 3, yq.QUAL_QTR_BKT + 4)
JOIN vw_ebi_sales_stage s ON p.SALES_STAGE_ID = s.SALES_STAGE_ID
    AND s.SALES_STAGE NOT IN ('S1', 'S2', 'Closed CleanUp from Non Pipe', 'Closed Lost from Non Pipe')
JOIN vw_EBI_OPG o ON p.OPG_ID = o.OPG_KEY
JOIN vw_TD_EBI_ROLE_Coverage rc ON p.ROLE_COVERAGE_ID = rc.ROLE_COVERAGE_ID
LEFT JOIN EOQSnapshotDates eoq ON yq.QUAL_QTR_BKT = eoq.QUAL_QTR_BKT
LEFT JOIN vw_EBI_CALDATE snap_cal ON p.SNAPSHOT_DATE_ID = snap_cal.DATE_KEY
WHERE (yq.QUAL_QTR_BKT >= 0 OR (yq.QUAL_QTR_BKT < 0 AND snap_cal.CALENDAR_DATE = eoq.EOQ_SNAPSHOT_DATE))
  AND ${pipeFilters}
GROUP BY
    r.TERR_ID, r.REP_NAME, o.BU, rc.ROLE_COVERAGE_BU, rc.ROLE_COVERAGE_BU_GROUP
ORDER BY r.TERR_ID`,
    tables_used: [
      "vw_TF_EBI_P2S",
      "vw_td_ebi_region_rpt",
      "vw_EBI_CALDATE",
      "vw_ebi_sales_stage",
      "vw_EBI_OPG",
      "vw_TD_EBI_ROLE_Coverage"
    ],
    variants: [
      "Gross created YTD",
      "Show gross created pipeline year to date",
      "Pipeline created YTD",
      "How much new pipeline year to date?",
      "Year to date pipeline creation"
    ]
  },

  // ─── GENERATION TARGET (FULL QTR GROSS CREATION) ───
  {
    id: "exact__generation_target",
    question: "What is our generation target this quarter?",
    questionCategory: "WHAT_HAPPENED",
    questionSubCategory: "pipeline_creation",
    sql: `SELECT
    r.TERR_ID,
    r.REP_NAME,
    o.BU,
    rc.ROLE_COVERAGE_BU,
    rc.ROLE_COVERAGE_BU_GROUP,
    SUM(q.IN_QTR_GC_TARGET) +
    SUM(CASE WHEN c_fq.QTR_BKT_IND = 1 THEN q2.PIPE_TARGET_SURVIVAL_RATE ELSE 0 END) +
    SUM(CASE WHEN c_fq.QTR_BKT_IND = 2 THEN q2.PIPE_TARGET_SURVIVAL_RATE ELSE 0 END) +
    SUM(CASE WHEN c_fq.QTR_BKT_IND = 3 THEN q2.PIPE_TARGET_SURVIVAL_RATE ELSE 0 END) +
    SUM(CASE WHEN c_fq.QTR_BKT_IND = 4 THEN q2.PIPE_TARGET_SURVIVAL_RATE ELSE 0 END)
    AS [Full Quarter Gross Creation]
FROM vw_TF_EBI_QUOTA q
JOIN vw_td_ebi_region_rpt r ON q.Region_Id = r.Region_Id
JOIN vw_EBI_CALDATE c ON q.QUOTA_FISCAL_Quarter_ID = c.DATE_KEY
JOIN vw_EBI_OPG o ON q.OPG_ID = o.OPG_KEY
JOIN vw_TD_EBI_ROLE_Coverage rc ON q.ROLE_COVERAGE_ID = rc.ROLE_COVERAGE_ID
LEFT JOIN vw_TF_EBI_QUOTA q2 ON q2.Region_Id = q.Region_Id AND q2.OPG_ID = q.OPG_ID AND q2.ROLE_COVERAGE_ID = q.ROLE_COVERAGE_ID
LEFT JOIN vw_EBI_CALDATE c_fq ON q2.QUOTA_FISCAL_Quarter_ID = c_fq.DATE_KEY AND c_fq.QTR_BKT_IND IN (1, 2, 3, 4)
WHERE c.QTR_BKT_IND = 0
  AND ${quotaFilters}
GROUP BY
    r.TERR_ID, r.REP_NAME, o.BU, rc.ROLE_COVERAGE_BU, rc.ROLE_COVERAGE_BU_GROUP
ORDER BY r.TERR_ID`,
    tables_used: [
      "vw_TF_EBI_QUOTA",
      "vw_td_ebi_region_rpt",
      "vw_EBI_CALDATE",
      "vw_EBI_OPG",
      "vw_TD_EBI_ROLE_Coverage"
    ],
    variants: [
      "Generation target",
      "Full quarter gross creation",
      "What is the generation target?",
      "Show generation target for this quarter",
      "What's our gross creation target?",
      "Pipeline generation target"
    ]
  },

  // ─── GAP VS GENERATION TARGET ───
  {
    id: "exact__gross_created_vs_target_gap",
    question: "Are we on track for pipeline creation target?",
    questionCategory: "WHAT_HAPPENED",
    questionSubCategory: "pipeline_creation",
    sql: `WITH
GrossCreated AS (
    SELECT
        r.TERR_ID,
        r.REP_NAME,
        o.BU,
        rc.ROLE_COVERAGE_BU,
        rc.ROLE_COVERAGE_BU_GROUP,
        SUM(p.OPPTY) AS [Gross Created QTD $]
    FROM vw_TF_EBI_P2S p
    JOIN vw_td_ebi_region_rpt r ON p.Region_Id = r.Region_Id
    JOIN vw_EBI_CALDATE c_qual ON p.OPP_CREATE_DATE_ID = c_qual.DATE_KEY
    JOIN vw_EBI_CALDATE c_close ON p.OPP_CLOSE_DATE_ID = c_close.DATE_KEY
    JOIN vw_ebi_sales_stage s ON p.SALES_STAGE_ID = s.SALES_STAGE_ID
    JOIN vw_EBI_OPG o ON p.OPG_ID = o.OPG_KEY
    JOIN vw_TD_EBI_ROLE_Coverage rc ON p.ROLE_COVERAGE_ID = rc.ROLE_COVERAGE_ID
    WHERE c_qual.QTR_BKT_IND = 0
      AND c_close.QTR_BKT_IND IN (0, 1, 2, 3, 4)
      AND s.SALES_STAGE NOT IN ('S1', 'S2', 'Closed CleanUp from Non Pipe', 'Closed Lost from Non Pipe')
      AND ${pipeFilters}
    GROUP BY r.TERR_ID, r.REP_NAME, o.BU, rc.ROLE_COVERAGE_BU, rc.ROLE_COVERAGE_BU_GROUP
),
GenTarget AS (
    SELECT
        r.TERR_ID,
        r.REP_NAME,
        o.BU,
        rc.ROLE_COVERAGE_BU,
        rc.ROLE_COVERAGE_BU_GROUP,
        SUM(q.IN_QTR_GC_TARGET) AS [Generation Target]
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
    COALESCE(gc.TERR_ID, gt.TERR_ID) AS TERR_ID,
    COALESCE(gc.REP_NAME, gt.REP_NAME) AS REP_NAME,
    COALESCE(gc.BU, gt.BU) AS BU,
    COALESCE(gc.ROLE_COVERAGE_BU, gt.ROLE_COVERAGE_BU) AS ROLE_COVERAGE_BU,
    gc.[Gross Created QTD $],
    gt.[Generation Target],
    gc.[Gross Created QTD $] - gt.[Generation Target] AS [Gap $],
    CASE
        WHEN gc.[Gross Created QTD $] - gt.[Generation Target] > 0 THEN 0
        ELSE gc.[Gross Created QTD $] - gt.[Generation Target]
    END AS [Gap -ve $]
FROM GrossCreated gc
FULL OUTER JOIN GenTarget gt
    ON gc.TERR_ID = gt.TERR_ID
    AND gc.BU = gt.BU
    AND gc.ROLE_COVERAGE_BU = gt.ROLE_COVERAGE_BU
ORDER BY COALESCE(gc.TERR_ID, gt.TERR_ID)`,
    tables_used: [
      "vw_TF_EBI_P2S",
      "vw_TF_EBI_QUOTA",
      "vw_td_ebi_region_rpt",
      "vw_EBI_CALDATE",
      "vw_ebi_sales_stage",
      "vw_EBI_OPG",
      "vw_TD_EBI_ROLE_Coverage"
    ],
    variants: [
      "Gap vs generation target",
      "Am I on track for pipeline creation?",
      "Gross created vs target gap",
      "Pipeline creation gap",
      "How far behind are we on pipeline creation?",
      "Show the gap between created pipeline and target",
      "Are we meeting our pipeline creation target?"
    ]
  },

  // ─── GROSS CREATION QTD % ───
  {
    id: "exact__gross_creation_qtd_pct",
    question: "What is our gross creation percentage?",
    questionCategory: "WHAT_HAPPENED",
    questionSubCategory: "pipeline_creation",
    sql: `WITH
GrossCreated AS (
    SELECT
        r.TERR_ID,
        r.REP_NAME,
        o.BU,
        rc.ROLE_COVERAGE_BU,
        rc.ROLE_COVERAGE_BU_GROUP,
        SUM(p.OPPTY) AS Val
    FROM vw_TF_EBI_P2S p
    JOIN vw_td_ebi_region_rpt r ON p.Region_Id = r.Region_Id
    JOIN vw_EBI_CALDATE c_qual ON p.OPP_CREATE_DATE_ID = c_qual.DATE_KEY
    JOIN vw_EBI_CALDATE c_close ON p.OPP_CLOSE_DATE_ID = c_close.DATE_KEY
    JOIN vw_ebi_sales_stage s ON p.SALES_STAGE_ID = s.SALES_STAGE_ID
    JOIN vw_EBI_OPG o ON p.OPG_ID = o.OPG_KEY
    JOIN vw_TD_EBI_ROLE_Coverage rc ON p.ROLE_COVERAGE_ID = rc.ROLE_COVERAGE_ID
    WHERE c_qual.QTR_BKT_IND = 0
      AND c_close.QTR_BKT_IND IN (0, 1, 2, 3, 4)
      AND s.SALES_STAGE NOT IN ('S1', 'S2', 'Closed CleanUp from Non Pipe', 'Closed Lost from Non Pipe')
      AND ${pipeFilters}
    GROUP BY r.TERR_ID, r.REP_NAME, o.BU, rc.ROLE_COVERAGE_BU, rc.ROLE_COVERAGE_BU_GROUP
),
GenTarget AS (
    SELECT
        r.TERR_ID,
        r.REP_NAME,
        o.BU,
        rc.ROLE_COVERAGE_BU,
        rc.ROLE_COVERAGE_BU_GROUP,
        SUM(q.IN_QTR_GC_TARGET) AS Val
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
    COALESCE(gc.TERR_ID, gt.TERR_ID) AS TERR_ID,
    COALESCE(gc.REP_NAME, gt.REP_NAME) AS REP_NAME,
    COALESCE(gc.BU, gt.BU) AS BU,
    COALESCE(gc.ROLE_COVERAGE_BU, gt.ROLE_COVERAGE_BU) AS ROLE_COVERAGE_BU,
    gc.Val AS [Gross Created QTD $],
    gt.Val AS [Generation Target],
    CASE
        WHEN gt.Val < 1 THEN 0
        ELSE ROUND(gc.Val / gt.Val, 4)
    END AS [Gross Creation QTD %]
FROM GrossCreated gc
FULL OUTER JOIN GenTarget gt
    ON gc.TERR_ID = gt.TERR_ID
    AND gc.BU = gt.BU
    AND gc.ROLE_COVERAGE_BU = gt.ROLE_COVERAGE_BU
ORDER BY COALESCE(gc.TERR_ID, gt.TERR_ID)`,
    tables_used: [
      "vw_TF_EBI_P2S",
      "vw_TF_EBI_QUOTA",
      "vw_td_ebi_region_rpt",
      "vw_EBI_CALDATE",
      "vw_ebi_sales_stage",
      "vw_EBI_OPG",
      "vw_TD_EBI_ROLE_Coverage"
    ],
    variants: [
      "Gross creation QTD %",
      "Pipeline creation percentage",
      "What's the gross creation ratio?",
      "How are we tracking on pipeline creation %?",
      "Show gross creation QTD percentage",
      "What % of generation target have we hit?"
    ]
  },
];

// Check for ID conflicts
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
