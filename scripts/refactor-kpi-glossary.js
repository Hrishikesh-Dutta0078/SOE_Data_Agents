/**
 * refactor-kpi-glossary.js
 *
 * Transforms kpi-glossary.json:
 *  1. Preserves original formula as "formulaPbix"
 *  2. Rewrites "formula" to use DB table.column references
 *  3. Rewrites "relatedColumns" to use table.column format
 *  4. Adds optional "notes" for approximated/external KPIs
 *  5. Generates an Excel mapping log
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// ─── paths ─────────────────────────────────────────────────────────────
const GLOSSARY_PATH = path.resolve(__dirname, '../server/context/knowledge/kpi-glossary.json');
const DOCS_DIR = path.resolve(__dirname, '../docs');
const EXCEL_PATH = path.join(DOCS_DIR, 'kpi-glossary-mapping-log.xlsx');

// ─── column -> table.column canonical mappings ─────────────────────────
const COL_MAP = {
  // vw_TF_EBI_P2S
  'Oppty': 'vw_TF_EBI_P2S.OPPTY',
  'OPPTY': 'vw_TF_EBI_P2S.OPPTY',
  'IN_PIPELINE': 'vw_TF_EBI_P2S.IN_PIPELINE',
  'IS_BOQ': 'vw_TF_EBI_P2S.IS_BOQ',
  'IS_EOQ': 'vw_TF_EBI_P2S.IS_EOQ',
  'STALLED_BUT_INACTIVE': 'vw_TF_EBI_P2S.STALLED_BUT_INACTIVE',
  'ADJ_COMMITMENT': 'vw_TF_EBI_P2S.ADJ_COMMITMENT',
  'ADJ_COMMITMENT_GROUP': 'vw_TF_EBI_P2S.ADJ_COMMITMENT_GROUP',
  'MGR_ADJ_COMMIT': 'vw_TF_EBI_P2S.MGR_ADJ_COMMIT',
  'GEO_ADJ_COMMIT': 'vw_TF_EBI_P2S.GEO_ADJ_COMMIT',
  'DEAL_AGE': 'vw_TF_EBI_P2S.DEAL_AGE',
  'STAGE_AGE': 'vw_TF_EBI_P2S.STAGE_AGE',
  'UPSELL_TYPE': 'vw_TF_EBI_P2S.UPSELL_TYPE',
  'Upsell_Attach_Key_Pipeline': 'vw_TF_EBI_P2S.Upsell_Attach_Key_Pipeline',
  'Upsell_Attach_Key_Ren': 'vw_TF_EBI_Retention.Upsell_Attach_Key_Ren',
  'OPP_ID': 'vw_TF_EBI_P2S.OPP_ID',
  'DAYS_SINCE_NEXT_STEPS_MODIFIED_BAND': 'vw_TF_EBI_P2S.DAYS_SINCE_NEXT_STEPS_MODIFIED_BAND',
  'BOQ S3+ Flag': 'vw_TF_EBI_P2S.BOQ_S3_FLAG',
  'BOQ_S3_Flag': 'vw_TF_EBI_P2S.BOQ_S3_FLAG',
  'SALES_STAGE_ID': 'vw_TF_EBI_P2S.SALES_STAGE_ID',
  'OPP_CLOSE_DATE_ID': 'vw_TF_EBI_P2S.OPP_CLOSE_DATE_ID',
  'OPP_CREATE_DATE_ID': 'vw_TF_EBI_P2S.OPP_CREATE_DATE_ID',
  'ACCOUNT_PARENT_ID': 'vw_TF_EBI_P2S.ACCOUNT_PARENT_ID',
  'PRNT_CNTRY': 'vw_TF_EBI_P2S.PRNT_CNTRY',
  'PARENT_TIER': 'vw_TF_EBI_P2S.PARENT_TIER',
  'GNARR': 'vw_TF_EBI_P2S.OPPTY',

  // vw_TF_EBI_QUOTA
  'QUOTA_ACTUAL': 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL',
  'QUOTA_REQ': 'vw_TF_EBI_QUOTA.QUOTA_REQ',
  'QUOTA_REQ_SS5': 'vw_TF_EBI_QUOTA.QUOTA_REQ_SS5',

  // vw_TF_EBI_PLAN_RPT
  'QUOTA_PLAN': 'vw_TF_EBI_PLAN_RPT.QUOTA_PLAN',
  'PIPELINE_REQ': 'vw_TF_EBI_PLAN_RPT.PIPELINE_REQ',
  'PIPELINE_REQ_SS5': 'vw_TF_EBI_PLAN_RPT.PIPELINE_REQ_SS5',

  // vw_TF_EBI_Retention
  'RBOB': 'vw_TF_EBI_Retention.RBOB',
  'ARR_Impact': 'vw_TF_EBI_Retention.ARR_Impact',
  'RISK_UPSIDE_AMOUNT': 'vw_TF_EBI_Retention.RISK_UPSIDE_AMOUNT',
  'Retention_MetaData_ID': 'vw_TF_EBI_Retention.Retention_MetaData_ID',
  'ON_TIME_RENEWAL': 'vw_TF_EBI_Retention.ON_TIME_RENEWAL',
  'ACCOUNT_ID': 'vw_TF_EBI_Retention.ACCOUNT_ID',
  'BOQ_ARR': 'vw_TF_EBI_Retention.BOQ_ARR',
  'EOQ_ARR': 'vw_TF_EBI_Retention.EOQ_ARR',
  'CUSTOMER_HEALTH': 'vw_TF_EBI_Retention.CUSTOMER_HEALTH',
  'CUSTOMER_HEALTH_ID': 'vw_TF_EBI_Retention.CUSTOMER_HEALTH_ID',
  'CUSTOMER_SOLUTION_HEALTH': 'vw_TF_EBI_Retention.CUSTOMER_SOLUTION_HEALTH',
  'SOLUTION_HEALTH_ID': 'vw_TF_EBI_Retention.SOLUTION_HEALTH_ID',
  'DAYS_SINCE_ACCNT_HEALTH_MODIFED': 'vw_TF_EBI_Retention.DAYS_SINCE_ACCNT_HEALTH_MODIFED',
  'DAYS_SINCE_SOL_HEALTH_MODIFED': 'vw_TF_EBI_Retention.DAYS_SINCE_SOL_HEALTH_MODIFED',

  // vw_TD_EBI_Retention_MetaData
  'PIPELINE_RENEWAL': 'vw_TD_EBI_Retention_MetaData.PIPELINE_RENEWAL',
  'RENEWAL_TYPE': 'vw_TD_EBI_Retention_MetaData.RENEWAL_TYPE',
  'LINE_CATEGORY': 'vw_TD_EBI_Retention_MetaData.LINE_CATEGORY',
  'INTERNAL_SEGMENT_NET_OFF': 'vw_TD_EBI_Retention_MetaData.INTERNAL_SEGMENT_NET_OFF',
  'OUTLOOK_CATEGORY': 'vw_TD_EBI_Retention_MetaData.OUTLOOK_CATEGORY',
  'SERVICE_END_DATE': 'vw_TD_EBI_Retention_MetaData.SERVICE_END_DATE',

  // vw_TF_EBI_RENEWALS_TARGET
  'ATTRITION': 'vw_TF_EBI_RENEWALS_TARGET.ATTRITION',

  // vw_TD_EBI_TARGET_TYPE
  'TARGET_TYPE': 'vw_TD_EBI_TARGET_TYPE.TARGET_TYPE',
  'TARGET_TYPE_ID': 'vw_TD_EBI_TARGET_TYPE.TARGET_TYPE_ID',

  // vw_TF_EBI_PIPE_WALK
  'GROSSASV': 'vw_TF_EBI_PIPE_WALK.GROSSASV',
  'STAGEPROGRESSIONASV': 'vw_TF_EBI_PIPE_WALK.STAGEPROGRESSIONASV',
  'WALK_GROUP': 'vw_TF_EBI_PIPE_WALK.WALK_GROUP',
  'PIPE_FLAG': 'vw_TF_EBI_PIPE_WALK.PIPE_FLAG',
  'PREV_SALES_STAGE_DERIVED': 'vw_TF_EBI_PIPE_WALK.PREV_SALES_STAGE_DERIVED',
  'CURR_SALES_STAGE': 'vw_TF_EBI_PIPE_WALK.CURR_SALES_STAGE',
  'DAY_FLAG': 'vw_TF_EBI_PIPE_WALK.DAY_FLAG',

  // vw_EBI_PACING_TARGET
  'PACING_LINEARITY': 'vw_EBI_PACING_TARGET.PACING_LINEARITY',

  // vw_EBI_SALES_STAGE
  'SalesStageGrp': 'vw_EBI_SALES_STAGE.SalesStageGrp',
  'SalesStageGrp_Sort': 'vw_EBI_SALES_STAGE.SalesStageGrp_Sort',
  'SALES_STAGE': 'vw_EBI_SALES_STAGE.SALES_STAGE',

  // vw_EBI_Caldate
  'QTR_BKT_IND': 'vw_EBI_Caldate.QTR_BKT_IND',
  'CLOSE_QTR_BKT': 'vw_EBI_Caldate.QTR_BKT_IND',
  'FISCAL_YR_AND_QTR_DESC': 'vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC',
  'IS_LATEST_SNAPSHOT': 'vw_EBI_Caldate.IS_LATEST_SNAPSHOT',
  'WEEK_SORT_ORDER_REVERSE': 'vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE',
  'SNAPSHOT_WEEK_BKT': 'vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE',
  'WEEKNUMBER': 'vw_EBI_Caldate.WEEKNUMBER',
  'WEEK_NUMBER_SORT': 'vw_EBI_Caldate.WEEK_NUMBER_SORT',
  'CLOSE_YR_BKT_NUMBER': 'vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER',
  'QUALIFICATION_QTR_BKT': 'vw_EBI_Caldate.QUALIFICATION_QTR_BKT',
  'QUALIFICATION_YR': 'vw_EBI_Caldate.QUALIFICATION_YR',
  'QUALIFICATION_WEEK_BKT': 'vw_EBI_Caldate.QUALIFICATION_WEEK_BKT',
  'QUALIFICATION_WEEK_NUMBER': 'vw_EBI_Caldate.QUALIFICATION_WEEK_NUMBER',
  'FISCAL_YR': 'vw_EBI_Caldate.FISCAL_YR',
  'SNAPSHOT_MONTH_ID': 'vw_EBI_Caldate.SNAPSHOT_MONTH_ID',

  // vw_TD_EBI_REGION_RPT_MASKED
  'REP_LDAP': 'vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP',
  'FLM_LDAP': 'vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP',
  'SLM_LDAP': 'vw_TD_EBI_REGION_RPT_MASKED.SLM_LDAP',
  'IS_TRUE_REP': 'vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP',
  'IS_TRUE_FLM': 'vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM',
  'REP_IN_PLACE': 'vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE',
  'AT_EMP_STATUS': 'vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS',
  'IS_CYQUOTA_AVAILABLE': 'vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE',
  'AREA': 'vw_TD_EBI_REGION_RPT_MASKED.AREA',
  'ROLE_TYPE_DISPLAY': 'vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY',
  'REGION_ID': 'vw_TD_EBI_REGION_RPT_MASKED.REGION_ID',

  // vw_TD_EBI_OPP
  'DS_SCORE': 'vw_TD_EBI_OPP.DS_SCORE',
  'Deal_Sensei_Score': 'vw_TD_EBI_OPP.DS_SCORE',
  'DEAL_REG_ID': 'vw_TD_EBI_OPP.DEAL_REG_ID',
  'OPP_ID_OPP': 'vw_TD_EBI_OPP.OPP_ID',

  // vw_EBI_DEAL_TYPE
  'CROSS_UPSELL_DISPLAY': 'vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY',
  'DEAL_TYPE': 'vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY',

  // vw_EBI_PAY_MEASURE
  'PAY_MEASURE_DISPLAY': 'vw_EBI_PAY_MEASURE.PAY_MEASURE_DISPLAY',

  // VW_TD_EBI_REPORTING_HIERARCHY
  'IS_CY_RPT_HIER': 'VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER',

  // vw_EBI_OPG
  'MOPG1': 'vw_EBI_OPG.MOPG1',

  // Customer Health Movement
  'HEALTH_MOVEMENT_TYPE': 'vw_TD_EBI_HEALTH_MOVEMENT.HEALTH_MOVEMENT_TYPE',
  'HAVE_ACTIVE_PQ_EOQ_ARR': 'vw_TF_EBI_CUSTOMER_HEALTH_MOVEMENT.HAVE_ACTIVE_PQ_EOQ_ARR',
  'acc_sol_key': 'vw_TF_EBI_CUSTOMER_SOLUTION_HEALTH_MOVEMENT.acc_sol_key',

  // Generation Target
  'GENERATION_TARGET': 'TF_EBI_GENERATION_TARGET.GENERATION_TARGET',
  'SS4_PROGRESSION_MULTIPLIER': 'TF_EBI_GENERATION_TARGET.SS4_PROGRESSION_MULTIPLIER',
  'CLOSED_QTR_DESC': 'TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC',

  // Snapshot type
  'SNAPSHOT_TYPE': 'vw_EBI_Caldate.SNAPSHOT_TYPE',
};

// ─── Per-KPI formula overrides ─────────────────────────────────────────
// These define the DB-oriented formula for each KPI id.
// If not listed here, the formula is rewritten via token substitution.
const FORMULA_OVERRIDES = {
  // === Landing Page KPIs ===
  'cy_projection_dollar': 'SUM(vw_TF_EBI_P2S.OPPTY) for PQ(Won) + CQ(W+F+UC) + FQ(open pipe * close ratio) / vw_TF_EBI_QUOTA.QUOTA_ACTUAL; time via vw_EBI_Caldate.QTR_BKT_IND',
  'cy_projection_pct': '(SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN (Won,Forecast,Upside - Committed)) across PQ+CQ+FQ) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0)',

  'attrition_outlook_dollar': 'Approximated: SUM(vw_TF_EBI_Retention.ARR_Impact) WHERE vw_EBI_Caldate.QTR_BKT_IND = 0 (Elixir-sourced in PBIX)',
  'attrition_ytd_outlook': 'Approximated: SUM(vw_TF_EBI_Retention.ARR_Impact) WHERE vw_EBI_Caldate.QTR_BKT_IND <= 0 AND vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER = 0 (Elixir-sourced in PBIX)',
  'attrition_outlook_pct': 'Approximated: SUM(vw_TF_EBI_Retention.ARR_Impact) / NULLIF(SUM(vw_TF_EBI_RENEWALS_TARGET.ATTRITION), 0) WHERE vw_EBI_Caldate.QTR_BKT_IND = 0 (Elixir-sourced in PBIX)',
  'attrition_pct_plan': 'Approximated: SUM(vw_TF_EBI_Retention.ARR_Impact) / NULLIF(SUM(vw_TF_EBI_RENEWALS_TARGET.ATTRITION), 0) WHERE vw_EBI_Caldate.QTR_BKT_IND = 0 (Elixir-sourced in PBIX)',

  'forecast': 'SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.ADJ_COMMITMENT = \'Forecast\' AND vw_EBI_Caldate.QTR_BKT_IND = 0',
  'upside': 'SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.ADJ_COMMITMENT = \'Upside - Committed\' AND vw_EBI_Caldate.QTR_BKT_IND = 0',
  'won': 'SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.ADJ_COMMITMENT = \'Won\' AND vw_EBI_Caldate.QTR_BKT_IND = 0',

  'gnarr_pct': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN (\'Won\',\'Forecast\',\'Upside - Committed\')) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0) WHERE vw_EBI_Caldate.QTR_BKT_IND = 0',
  'gnarr_h1_pct': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN (\'Won\',\'Forecast\',\'Upside - Committed\')) for H1 / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL) for H1, 0)',
  'gnarr_ytd_pct': 'SUM(vw_TF_EBI_P2S.OPPTY) YTD (CQ=W+F+UC, PQ=Won) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL) YTD, 0)',

  's3_fu_ltg_covx': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN (\'Forecast\',\'Upside - Committed\') AND vw_EBI_SALES_STAGE.SalesStageGrp_Sort >= 1) / NULLIF(TARGET_LEFT_TO_GO, 0) WHERE vw_EBI_Caldate.QTR_BKT_IND = 0',
  's5_fu_ltg_covx': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN (\'Forecast\',\'Upside - Committed\') AND vw_EBI_SALES_STAGE.SalesStageGrp_Sort = 2) / NULLIF(TARGET_LEFT_TO_GO, 0) WHERE vw_EBI_Caldate.QTR_BKT_IND = 0',

  'flm_participation_qtd': 'COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP WHERE attainment >= 0.75) / NULLIF(COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP), 0); attainment = SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN (\'Won\',\'Forecast\',\'Upside - Committed\')) / SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL)',
  'slm_participation_qtd': 'COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.SLM_LDAP WHERE attainment >= 0.75) / NULLIF(COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.SLM_LDAP), 0)',
  'participation_qtd_reps': 'COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP WHERE attainment >= 0.75 AND IS_TRUE_REP = 1 AND REP_IN_PLACE = \'In Place\' AND AT_EMP_STATUS = \'Active\') / NULLIF(COUNT(AE_IN_SEAT), 0); attainment = SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN (\'Won\',\'Forecast\',\'Upside - Committed\')) / SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL)',
  'participation_team': 'COUNT(teams WHERE >50% of reps attainment > 75%) / COUNT(total teams at vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP level)',
  'my_participation_qtd': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN (\'Won\',\'Forecast\',\'Upside - Committed\')) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0) for individual REP_LDAP, vw_EBI_Caldate.QTR_BKT_IND = 0',

  // Account health published-dataset KPIs
  'account_ryg_arr': 'Approximated: Group by vw_TF_EBI_Retention.CUSTOMER_HEALTH, SUM(vw_TF_EBI_Retention.RBOB) per color / total (published dataset in PBIX)',
  'account_ryg_count': 'Approximated: Group by vw_TF_EBI_Retention.CUSTOMER_HEALTH, COUNT(DISTINCT vw_TF_EBI_Retention.ACCOUNT_ID) per color (published dataset in PBIX)',
  'arravg_parent': 'Approximated: SUM(vw_TF_EBI_Retention.RBOB) / COUNT(DISTINCT ACCOUNT_PARENT_ID) (published dataset in PBIX)',
  'arravg_sub': 'Approximated: SUM(vw_TF_EBI_Retention.RBOB) / COUNT(DISTINCT ACCOUNT_ID) (published dataset in PBIX)',
  'solution_ryg_arr': 'Approximated: Group by vw_TF_EBI_Retention.CUSTOMER_SOLUTION_HEALTH, SUM(vw_TF_EBI_Retention.RBOB) per color / total (published dataset in PBIX)',
  'solution_ryg_count': 'Approximated: Group by vw_TF_EBI_Retention.CUSTOMER_SOLUTION_HEALTH, COUNT(DISTINCT acc_sol_key) per color (published dataset in PBIX)',

  // TPT external-tool KPIs
  'tier1_account_completion': 'Approximated: external Territory Planning Tool (TPT) — not directly queryable from DB',
  'tier1_sub_completion': 'Approximated: external Territory Planning Tool (TPT) — not directly queryable from DB',
  'upsell_attach_rate': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE UPSELL_TYPE = \'Renewal Upsell\' AND vw_EBI_SALES_STAGE.SalesStageGrp_Sort >= 1) / NULLIF(SUM(vw_TF_EBI_Retention.RBOB WHERE vw_TD_EBI_Retention_MetaData.PIPELINE_RENEWAL <> \'PQ Trailing\'), 0)',

  // Retention section
  'rbob': 'SUM(vw_TF_EBI_Retention.RBOB)',
  'renewal_rate_outlook': '(SUM(vw_TF_EBI_Retention.RBOB) + SUM(vw_TF_EBI_Retention.ARR_Impact)) / NULLIF(SUM(vw_TF_EBI_Retention.RBOB), 0) WHERE vw_TD_EBI_Retention_MetaData.PIPELINE_RENEWAL <> \'PQ Trailing\'',
  'rbob_wo_pq_trail': 'SUM(vw_TF_EBI_Retention.RBOB) WHERE vw_TD_EBI_Retention_MetaData.PIPELINE_RENEWAL <> \'PQ Trailing\'',
  'cq_renewal_rate': '(SUM(vw_TF_EBI_Retention.RBOB) + SUM(vw_TF_EBI_Retention.ARR_Impact)) / NULLIF(SUM(vw_TF_EBI_Retention.RBOB), 0) WHERE vw_TD_EBI_Retention_MetaData.PIPELINE_RENEWAL <> \'PQ Trailing\' AND vw_EBI_Caldate.QTR_BKT_IND = 0',
  'cq_renewal_rate_outlook': '(SUM(vw_TF_EBI_Retention.RBOB) + SUM(vw_TF_EBI_Retention.ARR_Impact)) / NULLIF(SUM(vw_TF_EBI_Retention.RBOB), 0) WHERE vw_TD_EBI_Retention_MetaData.PIPELINE_RENEWAL <> \'PQ Trailing\' AND vw_EBI_Caldate.QTR_BKT_IND = 0',
  'arr_impact': 'SUM(vw_TF_EBI_Retention.ARR_Impact)',
  'renewals_attrition_dollar': 'SUM(vw_TF_EBI_RENEWALS_TARGET.ATTRITION) WHERE vw_TD_EBI_TARGET_TYPE.TARGET_TYPE = @SelectedTargetType',
  'cq_attrition_dollar': 'SUM(vw_TF_EBI_Retention.ARR_Impact) WHERE vw_EBI_Caldate.QTR_BKT_IND = 0',
  'fy_attrition_dollar': 'SUM(vw_TF_EBI_Retention.ARR_Impact) WHERE vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER = 0',
  'savables': 'SUM(vw_TF_EBI_Retention.RISK_UPSIDE_AMOUNT) WHERE RISK_UPSIDE_AMOUNT > 0',
  'downsell_deal_count': 'COUNT(DISTINCT vw_TF_EBI_Retention.Retention_MetaData_ID) WHERE vw_TD_EBI_Retention_MetaData.RENEWAL_TYPE = \'Downsell\' AND (vw_TD_EBI_Retention_MetaData.LINE_CATEGORY = \'System Line\' OR (LINE_CATEGORY = \'Customer Adjustment\' AND INTERNAL_SEGMENT_NET_OFF IS NULL))',
  'full_attrition_deal_count': 'COUNT(DISTINCT vw_TF_EBI_Retention.Retention_MetaData_ID) WHERE vw_TD_EBI_Retention_MetaData.RENEWAL_TYPE = \'Lost\' AND (vw_TD_EBI_Retention_MetaData.LINE_CATEGORY = \'System Line\' OR (LINE_CATEGORY = \'Customer Adjustment\' AND INTERNAL_SEGMENT_NET_OFF IS NULL))',
  'on_time_renewal_count': 'COUNT(DISTINCT vw_TF_EBI_Retention.Retention_MetaData_ID) WHERE vw_TF_EBI_Retention.ON_TIME_RENEWAL = \'Yes\'',
  'ltg_overdue': 'COUNT(DISTINCT vw_TF_EBI_Retention.Retention_MetaData_ID) WHERE vw_TD_EBI_Retention_MetaData.OUTLOOK_CATEGORY = \'Left To Go\' AND vw_TD_EBI_Retention_MetaData.SERVICE_END_DATE < GETDATE()',
  'retention_accounts_count': 'COUNT(DISTINCT vw_TF_EBI_Retention.ACCOUNT_ID) WHERE SUM(vw_TF_EBI_Retention.RBOB) IS NOT NULL',
  'cq_plus1_renewal_rate': '(SUM(vw_TF_EBI_Retention.RBOB) + SUM(vw_TF_EBI_Retention.ARR_Impact)) / NULLIF(SUM(vw_TF_EBI_Retention.RBOB), 0) WHERE vw_TD_EBI_Retention_MetaData.PIPELINE_RENEWAL <> \'PQ Trailing\' AND vw_EBI_Caldate.QTR_BKT_IND = 1',
  'cq_plus2_renewal_rate': '(SUM(vw_TF_EBI_Retention.RBOB) + SUM(vw_TF_EBI_Retention.ARR_Impact)) / NULLIF(SUM(vw_TF_EBI_Retention.RBOB), 0) WHERE vw_TD_EBI_Retention_MetaData.PIPELINE_RENEWAL <> \'PQ Trailing\' AND vw_EBI_Caldate.QTR_BKT_IND = 2',
  'cq_plus3_renewal_rate': '(SUM(vw_TF_EBI_Retention.RBOB) + SUM(vw_TF_EBI_Retention.ARR_Impact)) / NULLIF(SUM(vw_TF_EBI_Retention.RBOB), 0) WHERE vw_TD_EBI_Retention_MetaData.PIPELINE_RENEWAL <> \'PQ Trailing\' AND vw_EBI_Caldate.QTR_BKT_IND = 3',
  'cq_plus1_attrition': 'SUM(vw_TF_EBI_Retention.ARR_Impact) WHERE vw_EBI_Caldate.QTR_BKT_IND = 1',
  'cq_plus2_attrition': 'SUM(vw_TF_EBI_Retention.ARR_Impact) WHERE vw_EBI_Caldate.QTR_BKT_IND = 2',
  'cq_plus3_attrition': 'SUM(vw_TF_EBI_Retention.ARR_Impact) WHERE vw_EBI_Caldate.QTR_BKT_IND = 3',
  'cq_upsell_dollar_attach_rate': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE UPSELL_TYPE = \'Renewal Upsell\') / NULLIF(SUM(vw_TF_EBI_Retention.RBOB WHERE vw_TD_EBI_Retention_MetaData.PIPELINE_RENEWAL <> \'PQ Trailing\'), 0) WHERE vw_EBI_Caldate.QTR_BKT_IND = 0 AND vw_EBI_Caldate.IS_LATEST_SNAPSHOT = 1',
  'cq_upsell_count_attach_pct': 'COUNT(DISTINCT vw_TF_EBI_P2S.Upsell_Attach_Key_Pipeline WHERE UPSELL_TYPE = \'Renewal Upsell\' AND vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY = \'Upsell\') / NULLIF(COUNT(DISTINCT vw_TF_EBI_Retention.Upsell_Attach_Key_Ren), 0) WHERE vw_EBI_Caldate.QTR_BKT_IND = 0',
  'cq_attrition_pct': '1 - ((SUM(vw_TF_EBI_Retention.ARR_Impact WHERE QTR_BKT_IND = 0) - SUM(vw_TF_EBI_RENEWALS_TARGET.ATTRITION WHERE QTR_BKT_IND = 0)) / NULLIF(SUM(vw_TF_EBI_RENEWALS_TARGET.ATTRITION WHERE QTR_BKT_IND = 0), 0))',
  'net_pct': '(SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN (\'Won\',\'Forecast\',\'Upside - Committed\')) - ABS(SUM(vw_TF_EBI_Retention.ARR_Impact))) / NULLIF(Net_Plan, 0) WHERE vw_EBI_Caldate.QTR_BKT_IND = 0',

  // Pipeline Coverage
  'coverage_pipe_bookings_target': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0)',
  's5_plus_pipeline_cov': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1 AND vw_EBI_SALES_STAGE.SalesStageGrp_Sort = 2) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0)',
  'total_pipe_cov': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1) / NULLIF(GREATEST(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL) - SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT = \'Won\'), 0), 0)',
  'pipe_target': 'SUM(vw_TF_EBI_QUOTA.QUOTA_REQ) or SUM(vw_TF_EBI_PLAN_RPT.PIPELINE_REQ) based on vw_TD_EBI_TARGET_TYPE.TARGET_TYPE',
  'pipe_target_ss5': 'SUM(vw_TF_EBI_QUOTA.QUOTA_REQ_SS5) or SUM(vw_TF_EBI_PLAN_RPT.PIPELINE_REQ_SS5) based on vw_TD_EBI_TARGET_TYPE.TARGET_TYPE',
  'bookings_target': 'SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL) or SUM(vw_TF_EBI_PLAN_RPT.QUOTA_PLAN) based on vw_TD_EBI_TARGET_TYPE.TARGET_TYPE',
  'target_left_to_go': 'GREATEST(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL) - SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT = \'Won\'), 0)',
  'boq_pipe_dollar': 'SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.IN_PIPELINE = 1 AND vw_TF_EBI_P2S.IS_BOQ = \'TRUE\'',
  'boq_mature_pipe_dollar': 'SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.IN_PIPELINE = 1 AND vw_EBI_SALES_STAGE.SalesStageGrp_Sort = 2 AND vw_TF_EBI_P2S.IS_BOQ = \'TRUE\'',
  's3_dollar': 'SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.IN_PIPELINE = 1 AND vw_EBI_SALES_STAGE.SalesStageGrp = \'S3\'',
  's4_dollar': 'SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.IN_PIPELINE = 1 AND vw_EBI_SALES_STAGE.SalesStageGrp = \'S4\'',
  'ss5_plus_dollar': 'SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.IN_PIPELINE = 1 AND vw_EBI_SALES_STAGE.SalesStageGrp_Sort = 2',
  'pipe_dollar': 'SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.IN_PIPELINE = 1',
  'active_updated_pct': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE STALLED_BUT_INACTIVE = \'Active\') / NULLIF(SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1), 0)',
  'stalled_inactive_pct': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE STALLED_BUT_INACTIVE = \'Stalled & Inactive\') / NULLIF(SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1), 0)',

  // Pipeline L2
  'stalled_pct': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE STALLED_BUT_INACTIVE = \'Stalled & Inactive\') / NULLIF(SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1), 0)',
  'pipe_covx': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0) WHERE vw_EBI_Caldate.QTR_BKT_IND IN (1,2,3)',
  's5_covx': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1 AND vw_EBI_SALES_STAGE.SalesStageGrp_Sort = 2) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0) WHERE vw_EBI_Caldate.QTR_BKT_IND IN (1,2,3)',
  's3_covx_q1': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1 AND vw_EBI_SALES_STAGE.SalesStageGrp_Sort >= 1) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0) WHERE vw_EBI_Caldate.QTR_BKT_IND = 1',
  's5_covx_q1': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1 AND vw_EBI_SALES_STAGE.SalesStageGrp_Sort = 2) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0) WHERE vw_EBI_Caldate.QTR_BKT_IND = 1',
  'mature_pipe_s5_q1': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1 AND vw_EBI_SALES_STAGE.SalesStageGrp_Sort = 2) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0) WHERE vw_EBI_Caldate.QTR_BKT_IND = 1',
  'gross_creation_qtd': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE vw_EBI_SALES_STAGE.SALES_STAGE NOT IN (\'S1\',\'S2\') AND vw_EBI_Caldate.QUALIFICATION_QTR_BKT = 0) / NULLIF(GROSS_CREATION_QTD_TARGET, 0)',
  'gross_creation_ytd': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE vw_EBI_SALES_STAGE.SALES_STAGE NOT IN (\'S1\',\'S2\') AND vw_EBI_Caldate.QUALIFICATION_QTR_BKT <= 0) / NULLIF(GROSS_CREATION_YTD_TARGET, 0)',
  'creation_gap_qtd': '(GROSS_CREATION_QTD_TARGET - SUM(vw_TF_EBI_P2S.OPPTY WHERE vw_EBI_SALES_STAGE.SalesStageGrp_Sort >= 1 AND vw_EBI_Caldate.QUALIFICATION_QTR_BKT = 0)) / NULLIF(GROSS_CREATION_QTD_TARGET, 0)',
  'creation_gap_ytd': '(GROSS_CREATION_YTD_TARGET - CREATION_YTD) / NULLIF(GROSS_CREATION_YTD_TARGET, 0)',
  'pipeline_l2_ytd_pct': 'SUM(vw_TF_EBI_P2S.OPPTY Gross Creation YTD) / NULLIF(Gross Creation YTD Target, 0)',
  's4_prog_vs_s3_boq': 'SUM(vw_TF_EBI_P2S.OPPTY progressed S3->S4+ and booked, close CQ to CQ+2) / NULLIF(BOQ S3 pipeline from vw_TF_EBI_PIPE_WALK, 0)',
  's5_prog_vs_tgt': 'SUM(vw_TF_EBI_P2S.OPPTY progressed S3/S4->S5+ or booked, close CQ to CQ+2) / NULLIF(True progression targets, 0)',
  'ae_12x_s5_pct': 'COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP WHERE S5+ covx >= 1.2) / NULLIF(COUNT(AE_IN_SEAT), 0) WHERE vw_EBI_Caldate.QTR_BKT_IND = 1',
  'ae_2x_pct': 'COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP WHERE pipe covx >= 2.0) / NULLIF(COUNT(AE_IN_SEAT), 0) WHERE vw_EBI_Caldate.QTR_BKT_IND IN (2,3)',
  'ae_part_75_qtd': 'COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP WHERE attainment >= 0.75) / NULLIF(COUNT(AE_IN_SEAT), 0) WHERE vw_EBI_Caldate.QTR_BKT_IND = 0',
  'ae_part_75_ytd': 'COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP WHERE YTD attainment >= 0.75) / NULLIF(COUNT(AE_IN_SEAT), 0)',
  'ae_in_seat_pct': 'COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP WHERE IS_TRUE_REP = 1 AND REP_IN_PLACE = \'In Place\' AND AT_EMP_STATUS = \'Active\') / NULLIF(COUNT(DISTINCT REP_LDAP WHERE IS_TRUE_REP = 1 AND AT_EMP_STATUS = \'Active\'), 0)',
  'flm_50_ae_75_ytd': 'COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP WHERE >50% AEs at >= 75% YTD) / NULLIF(COUNT(DISTINCT FLM_LDAP WHERE IS_TRUE_FLM = 1), 0)',
  'flm_part_75_ytd': 'COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP WHERE attainment >= 0.75) / NULLIF(COUNT(DISTINCT FLM_LDAP WHERE IS_TRUE_FLM = 1), 0)',

  // Pipeline Creation
  'gross_created_qtd_dollar': 'SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_EBI_Caldate.QUALIFICATION_QTR_BKT = 0 AND vw_EBI_Caldate.QTR_BKT_IND IN (0,1,2,3,4) AND vw_EBI_SALES_STAGE.SALES_STAGE NOT IN (\'S1\',\'S2\',\'Closed CleanUp from Non Pipe\',\'Closed Lost from Non Pipe\')',
  'gross_creation_qtd_pct': 'GROSS_CREATED_QTD_$ / NULLIF(GROSS_CREATION_QTD_TARGET, 0)',
  'gross_creation_ytd_pct': 'GROSS_CREATED_YTD_$ / NULLIF(GROSS_CREATION_YTD_TARGET, 0)',
  'full_quarter_gross_creation': 'Full quarter pipeline generation target from TF_EBI_GENERATION_TARGET.GENERATION_TARGET',
  'net_pipe_creation_qtd': 'Net creation target QTD from TF_EBI_GENERATION_TARGET.GENERATION_TARGET',
  'pct_weekly_gross_creation_qtd': '(CW_Gross_Created_QTD - PW_Gross_Created_QTD) / NULLIF(PW_Gross_Created_QTD, 0); CW = vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE = 0, PW = -1',
  's1_s2_dollar': 'SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_EBI_SALES_STAGE.SalesStageGrp = \'S1-S2\'',
  'oppty_wtd_dollar': 'SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_EBI_Caldate.QUALIFICATION_WEEK_BKT = 0',
  'oppty_trend_dollar': 'Cumulative SUM(vw_TF_EBI_P2S.OPPTY) through selected vw_EBI_Caldate.WEEK_NUMBER_SORT (running total by qualification week)',
  'growth_pipe_attainment_pct': 'GROWTH_PIPE_QTD / NULLIF(TF_EBI_GENERATION_TARGET.GENERATION_TARGET net, 0)',
  'ss4_progression_target': 'SUMX over qualification quarters: IN_QTR_GC_TARGET_SS4 + (TF_EBI_GENERATION_TARGET.GENERATION_TARGET * TF_EBI_GENERATION_TARGET.SS4_PROGRESSION_MULTIPLIER) for CQ+1/+2/+3',

  // Forecast & Bookings
  'wfuc_dollar': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN (\'Won\',\'Forecast\',\'Upside - Committed\')) WHERE vw_EBI_Caldate.QTR_BKT_IND = 0',
  'wfuc_pct': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN (\'Won\',\'Forecast\',\'Upside - Committed\')) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0) WHERE vw_EBI_Caldate.QTR_BKT_IND = 0',
  'won_dollar': 'SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.ADJ_COMMITMENT = \'Won\'',
  'forecast_dollar': 'SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.ADJ_COMMITMENT = \'Forecast\'',
  'upside_committed_dollar': 'SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.ADJ_COMMITMENT = \'Upside - Committed\'',
  'gap_to_plan_dollar': 'SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL) - SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN (\'Won\',\'Forecast\',\'Upside - Committed\')) WHERE vw_EBI_Caldate.QTR_BKT_IND = 0',
  'linearity_gap_dollar': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT = \'Won\') - (SUM(vw_EBI_PACING_TARGET.PACING_LINEARITY) * SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL))',
  'linearity_target_dollar': 'SUM(vw_EBI_PACING_TARGET.PACING_LINEARITY) * SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL)',
  'pulled_in_dollar': 'SUM(vw_TF_EBI_PIPE_WALK.GROSSASV) WHERE vw_TF_EBI_PIPE_WALK.WALK_GROUP = \'Pulled In\' AND vw_TF_EBI_PIPE_WALK.PIPE_FLAG = \'Pipe\'',
  'pushed_out_dollar': 'SUM(vw_TF_EBI_PIPE_WALK.GROSSASV) WHERE vw_TF_EBI_PIPE_WALK.WALK_GROUP = \'Pushed\' AND vw_TF_EBI_PIPE_WALK.PIPE_FLAG = \'Pipe\'',
  'net_change_dollar': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1) - SUM(vw_TF_EBI_P2S.OPPTY WHERE IS_BOQ = \'TRUE\' AND IN_PIPELINE = 1)',
  'wfuc_stalled_pct': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE STALLED_BUT_INACTIVE = \'Stalled & Inactive\' AND vw_EBI_SALES_STAGE.SalesStageGrp IN (\'S3\',\'S4\',\'S5+\')) / NULLIF(SUM(vw_TF_EBI_P2S.OPPTY WHERE vw_EBI_SALES_STAGE.SalesStageGrp IN (\'S3\',\'S4\',\'S5+\')), 0)',
  'manager_forecast_cq_pct': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN (\'Won\',\'Forecast\',\'Upside - Committed\')) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0) WHERE vw_EBI_Caldate.QTR_BKT_IND = 0 AND vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE = 0',
  'manager_forecast_ytd_pct': '(PQ Won $ at EOQ + CQ W+F+UC $) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL WHERE vw_EBI_Caldate.FISCAL_YR = current AND QTR_BKT_IND <= 0), 0)',
  'won_attainment_pct': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT = \'Won\') / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0)',
  'performance_ytd_pct': '(PQ Won at EOQ + CQ W+F+UC) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL YTD), 0)',

  // Account Health
  'account_ry_pct': 'COUNT(DISTINCT vw_TF_EBI_Retention.ACCOUNT_ID WHERE CUSTOMER_HEALTH IN (\'Red\',\'Yellow\') AND BOQ_ARR > 0) / NULLIF(COUNT(DISTINCT ACCOUNT_ID WHERE BOQ_ARR > 0), 0) WHERE vw_EBI_Caldate.QTR_BKT_IND = 0',
  'account_ry_count': 'COUNT(vw_TF_EBI_Retention.ACCOUNT_ID WHERE CUSTOMER_HEALTH = \'Red\' AND BOQ_ARR > 0) + COUNT(WHERE CUSTOMER_HEALTH = \'Yellow\' AND BOQ_ARR > 0) WHERE vw_EBI_Caldate.QTR_BKT_IND = 0',
  'cq_acc_arr_red': 'SUM(vw_TF_EBI_Retention.BOQ_ARR) WHERE CUSTOMER_HEALTH = \'Red\' AND vw_EBI_Caldate.QTR_BKT_IND = 0',
  'cq_acc_arr_yellow': 'SUM(vw_TF_EBI_Retention.BOQ_ARR) WHERE CUSTOMER_HEALTH = \'Yellow\' AND vw_EBI_Caldate.QTR_BKT_IND = 0',
  'cq_acc_arr_green': 'SUM(vw_TF_EBI_Retention.BOQ_ARR) WHERE CUSTOMER_HEALTH = \'Green\' AND vw_EBI_Caldate.QTR_BKT_IND = 0',
  'cq_sol_arr_red': 'SUM(vw_TF_EBI_Retention.BOQ_ARR) WHERE CUSTOMER_SOLUTION_HEALTH = \'Red\' AND vw_EBI_Caldate.QTR_BKT_IND = 0',
  'cq_sol_arr_yellow': 'SUM(vw_TF_EBI_Retention.BOQ_ARR) WHERE CUSTOMER_SOLUTION_HEALTH = \'Yellow\' AND vw_EBI_Caldate.QTR_BKT_IND = 0',
  'cq_sol_arr_green': 'SUM(vw_TF_EBI_Retention.BOQ_ARR) WHERE CUSTOMER_SOLUTION_HEALTH = \'Green\' AND vw_EBI_Caldate.QTR_BKT_IND = 0',
  'accnt_movement_up': 'COUNT(DISTINCT vw_TF_EBI_CUSTOMER_HEALTH_MOVEMENT.ACCOUNT_ID) WHERE vw_TD_EBI_HEALTH_MOVEMENT.HEALTH_MOVEMENT_TYPE = \'Trending Up\' AND HAVE_ACTIVE_PQ_EOQ_ARR = 1',
  'accnt_movement_down': 'COUNT(DISTINCT vw_TF_EBI_CUSTOMER_HEALTH_MOVEMENT.ACCOUNT_ID) WHERE vw_TD_EBI_HEALTH_MOVEMENT.HEALTH_MOVEMENT_TYPE = \'Trending Down\' AND HAVE_ACTIVE_PQ_EOQ_ARR = 1',
  'sol_movement_up': 'COUNT(DISTINCT vw_TF_EBI_CUSTOMER_SOLUTION_HEALTH_MOVEMENT.acc_sol_key) WHERE vw_TD_EBI_HEALTH_MOVEMENT.HEALTH_MOVEMENT_TYPE = \'Trending Up\' AND HAVE_ACTIVE_PQ_EOQ_ARR = 1',
  'sol_movement_down': 'COUNT(DISTINCT vw_TF_EBI_CUSTOMER_SOLUTION_HEALTH_MOVEMENT.acc_sol_key) WHERE vw_TD_EBI_HEALTH_MOVEMENT.HEALTH_MOVEMENT_TYPE = \'Trending Down\' AND HAVE_ACTIVE_PQ_EOQ_ARR = 1',
  'fp_risk_cq': 'SUM(vw_TF_EBI_Retention.RISK_UPSIDE_AMOUNT) WHERE risk_type = \'Additional Risks\' AND vw_EBI_Caldate.QTR_BKT_IND = 0',
  'fp_upside_savables_cq': 'SUM(vw_TF_EBI_Retention.RISK_UPSIDE_AMOUNT WHERE RISK_UPSIDE_AMOUNT > 0) WHERE vw_EBI_Caldate.QTR_BKT_IND = 0',
  'noncompliant_acc_count': 'COUNT(DISTINCT vw_TF_EBI_Retention.ACCOUNT_ID WHERE (CUSTOMER_HEALTH=\'Red\' AND DAYS_SINCE_ACCNT_HEALTH_MODIFED > 14) OR (CUSTOMER_HEALTH=\'Yellow\' AND DAYS_SINCE_ACCNT_HEALTH_MODIFED > 30) OR (CUSTOMER_HEALTH=\'Green\' AND DAYS_SINCE_ACCNT_HEALTH_MODIFED > 90)) WHERE BOQ_ARR > 0 AND vw_EBI_Caldate.QTR_BKT_IND = -1',
  'noncompliant_sol_count': 'COUNT(DISTINCT acc_sol_key WHERE (CUSTOMER_SOLUTION_HEALTH=\'Red\' AND DAYS_SINCE_SOL_HEALTH_MODIFED > 14) OR (CUSTOMER_SOLUTION_HEALTH=\'Yellow\' AND DAYS_SINCE_SOL_HEALTH_MODIFED > 30) OR (CUSTOMER_SOLUTION_HEALTH=\'Green\' AND DAYS_SINCE_SOL_HEALTH_MODIFED > 90)) WHERE BOQ_ARR > 0 AND vw_EBI_Caldate.QTR_BKT_IND = -1',

  // Performance & Participation
  'ae_part_75_qtd_pct': 'COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP WHERE MANAGER_FORECAST_CQ >= 0.75 AND IS_TRUE_REP = 1 AND REP_IN_PLACE = \'In Place\' AND AT_EMP_STATUS = \'Active\') / NULLIF(COUNT(AE_IN_SEAT), 0)',
  'ae_part_75_ytd_pct': 'COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP WHERE YTD_PROJECTION >= 0.75 AND IS_TRUE_REP = 1 AND REP_IN_PLACE = \'In Place\' AND AT_EMP_STATUS = \'Active\') / NULLIF(COUNT(AE_IN_SEAT), 0)',
  'rep_participation_cq_75_pct': 'COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP WHERE MANAGER_FORECAST_CQ >= 0.75 AND IS_TRUE_REP = 1) / NULLIF(COUNT(DISTINCT REP_LDAP WHERE IS_TRUE_REP = 1), 0)',
  'rep_participation_ytd_75_pct': 'COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP WHERE MANAGER_FORECAST_YTD >= 0.75 AND IS_TRUE_REP = 1) / NULLIF(COUNT(DISTINCT REP_LDAP WHERE IS_TRUE_REP = 1), 0)',
  'flm_participation_cq_75_pct': 'COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP WHERE MANAGER_FORECAST_CQ >= 0.75 AND IS_TRUE_FLM = 1) / NULLIF(COUNT(DISTINCT FLM_LDAP WHERE IS_TRUE_FLM = 1), 0)',
  'flm_participation_ytd_75_pct': 'COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP WHERE MANAGER_FORECAST_YTD >= 0.75 AND IS_TRUE_FLM = 1) / NULLIF(COUNT(DISTINCT FLM_LDAP WHERE IS_TRUE_FLM = 1), 0)',
  'flm_50_ae_75_qtd_pct': 'COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP WHERE (AEs_at_75/Total_AEs) >= 0.5 AND IS_TRUE_FLM = 1) / NULLIF(COUNT(DISTINCT FLM_LDAP WHERE IS_TRUE_FLM = 1), 0)',
  'ae_in_seat': 'COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP) WHERE IS_TRUE_REP = 1 AND REP_IN_PLACE = \'In Place\' AND AT_EMP_STATUS = \'Active\' AND IS_CYQUOTA_AVAILABLE = 1 AND AREA IN (\'DX\',\'DX/DME\')',
  'ae_total': 'COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP) WHERE IS_TRUE_REP = 1 AND AT_EMP_STATUS = \'Active\' AND IS_CYQUOTA_AVAILABLE = 1 AND AREA IN (\'DX\',\'DX/DME\')',
  'fp_ae_total': 'COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP) WHERE IS_TRUE_REP = 1 AND AT_EMP_STATUS = \'Active\' AND IS_CYQUOTA_AVAILABLE = 1 AND REGION_ID IN (SELECT REGION_ID FROM vw_TF_EBI_QUOTA)',
  'fp_ae_in_seat': 'COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP) WHERE IS_TRUE_REP = 1 AND REP_IN_PLACE = \'In Place\' AND AT_EMP_STATUS = \'Active\' AND IS_CYQUOTA_AVAILABLE = 1 AND REGION_ID IN (SELECT REGION_ID FROM vw_TF_EBI_QUOTA)',
  'flm_count': 'COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP) WHERE IS_TRUE_FLM = 1',
  'flm_count_75_cq_pct': 'COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP WHERE MANAGER_FORECAST_CQ >= 0.75 AND IS_TRUE_REP = 1 under FLM) / NULLIF(COUNT(DISTINCT REP_LDAP WHERE IS_TRUE_REP = 1 under FLM), 0)',
  'flm_count_75_ytd_pct': 'COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP WHERE YTD_PROJECTION >= 0.75 AND IS_TRUE_REP = 1 under FLM) / NULLIF(COUNT(DISTINCT REP_LDAP WHERE IS_TRUE_REP = 1 under FLM), 0)',
  'asv_win_rate_pct': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT = \'Won\') / NULLIF(SUM(OPPTY WHERE ADJ_COMMITMENT = \'Won\') + SUM(OPPTY WHERE ADJ_COMMITMENT = \'Lost\'), 0)',
  'forecast_accuracy_pq_pct': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT = \'Forecast\' AND IS_BOQ = \'TRUE\' AND vw_EBI_Caldate.QTR_BKT_IND = -1) / NULLIF(SUM(OPPTY WHERE ADJ_COMMITMENT = \'Won\' AND IS_EOQ = \'TRUE\' AND QTR_BKT_IND = -1), 0)',

  // ARR & Revenue
  'boq_arr_dollar': 'SUM(vw_TF_EBI_Retention.BOQ_ARR) WHERE vw_EBI_Caldate.QTR_BKT_IND = 0; for Q+N: BOQ_ARR_Q0 + cumulative (W+F+UC + ARR_IMPACT)',
  'eoq_arr_dollar': 'SUM(vw_TF_EBI_Retention.BOQ_ARR) + SUM(W+F+UC + ARR_IMPACT) across selected vw_EBI_Caldate.QTR_BKT_IND buckets; fallback: SUM(vw_TF_EBI_Retention.EOQ_ARR)',
  'arravg_qoq': 'BOQ_ARR removing VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER filter for cross-hierarchy comparison',
  'sub_ma_arr': 'SUM(vw_TF_EBI_Retention.EOQ_ARR) WHERE vw_EBI_Caldate.QTR_BKT_IND = -1, removing vw_EBI_OPG.MOPG1 filter',
  'r4q_rbob_wo_pq_trail': 'SUM(vw_TF_EBI_Retention.RBOB) WHERE vw_TD_EBI_Retention_MetaData.PIPELINE_RENEWAL <> \'PQ Trailing\' AND vw_EBI_Caldate.QTR_BKT_IND IN (0,1,2,3)',
  'cw_pw_rbob_wo_pq_trail': 'CW: SUM(vw_TF_EBI_Retention.RBOB) WHERE PIPELINE_RENEWAL <> \'PQ Trailing\' AND vw_EBI_Caldate.QTR_BKT_IND = 0 AND WEEK_SORT_ORDER_REVERSE = 0; PW: same with WEEK_SORT_ORDER_REVERSE = -1',
  'asv_dollar': 'SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_EBI_PAY_MEASURE.PAY_MEASURE_DISPLAY = \'ASV\'',

  // Deal Intelligence
  'occ_deal_count': 'IF vw_EBI_Caldate.QTR_BKT_IND < 0: COUNT(DISTINCT TM1.OPP_ID WHERE TM1_Bookings > 0). ELSE: COUNT(DISTINCT vw_TD_EBI_OPP.DEAL_REG_ID WHERE OPPTY IS NOT NULL)',
  'deal_sensei_score': 'SUM(vw_TD_EBI_OPP.DS_SCORE)',
  'stage_duration': 'AVG(vw_TF_EBI_P2S.STAGE_AGE)',
  'opp_age': 'AVG(vw_TF_EBI_P2S.DEAL_AGE)',
  'stage_progression_asv': 'SUM(vw_TF_EBI_PIPE_WALK.STAGEPROGRESSIONASV)',
  'abs_walk_value': 'ABS(SUM(vw_TF_EBI_PIPE_WALK.GROSSASV))',
  'cq_s3_to_s4_plus_progression_pct': 'SUM(vw_TF_EBI_PIPE_WALK.STAGEPROGRESSIONASV WHERE DAY_FLAG = \'QTD\' AND PREV_SALES_STAGE_DERIVED IN (\'S3\',\'In Qtr\') AND CURR_SALES_STAGE IN (\'S4\',\'S5\',\'S6\',\'S7\',\'Booked\')) / NULLIF(SUM(STAGEPROGRESSIONASV WHERE DAY_FLAG = \'QTD\' AND PREV_SALES_STAGE_DERIVED IN (\'S3\',\'In Qtr\')), 0)',
  'cq_s3_s4_to_s5_plus_progression_pct': 'SUM(vw_TF_EBI_PIPE_WALK.STAGEPROGRESSIONASV WHERE PREV_SALES_STAGE_DERIVED IN (\'S3\',\'S4\') AND CURR_SALES_STAGE IN (\'S5\',\'S6\',\'S7\',\'Booked\')) / NULLIF(TRUE_PROGRESSION_QTD, 0)',
  'close_rate': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE BOQ_S3_FLAG = 1 AND ADJ_COMMITMENT = \'Won\' AND vw_EBI_Caldate.QTR_BKT_IND = 0) / NULLIF(SUM(OPPTY WHERE IN_PIPELINE = 1 AND vw_EBI_Caldate.WEEKNUMBER = \'W1\'), 0)',
  'close_ratio': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT = \'Won\' AND IS_EOQ = \'TRUE\') / NULLIF(SUM(OPPTY WHERE IN_PIPELINE = 1 AND IS_BOQ = \'TRUE\'), 0)',
  'idle_oppty_pct': 'SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT_GROUP = \'Open\' AND DAYS_SINCE_NEXT_STEPS_MODIFIED_BAND = \'30+ days\') / NULLIF(SUM(OPPTY WHERE ADJ_COMMITMENT_GROUP = \'Open\'), 0)',
  'open_oppty_count': 'COUNT(DISTINCT vw_TF_EBI_P2S.OPP_ID) WHERE vw_TF_EBI_P2S.ADJ_COMMITMENT_GROUP = \'Open\'',

  // Territory Planning
  'tier1_prnt_gnarr_dollar': 'SUM(vw_TF_EBI_P2S.OPPTY) WHERE PARENT_TIER = \'Tier 1\'',
  'tier1_prnt_without_gnarr_count': 'COUNT(Tier 1 PRNT_CNTRY from TPT) - COUNT(Tier 1 ACCOUNT_PARENT_ID with non-null vw_TF_EBI_P2S.OPPTY at latest snapshot, ASV, DX)',
};

// ─── Notes for approximated / external KPIs ────────────────────────────
const NOTES = {
  'attrition_outlook_dollar': 'Elixir-sourced in PBIX; DB approximation uses vw_TF_EBI_Retention.ARR_Impact',
  'attrition_ytd_outlook': 'Elixir-sourced in PBIX; DB approximation uses vw_TF_EBI_Retention.ARR_Impact YTD',
  'attrition_outlook_pct': 'Elixir-sourced in PBIX; DB approximation uses ARR_Impact / RENEWALS_TARGET.ATTRITION',
  'attrition_pct_plan': 'Elixir-sourced in PBIX; DB approximation uses ARR_Impact / RENEWALS_TARGET.ATTRITION',
  'account_ryg_arr': 'Published dataset in PBIX; DB proxy uses vw_TF_EBI_Retention.RBOB grouped by CUSTOMER_HEALTH',
  'account_ryg_count': 'Published dataset in PBIX; DB proxy uses ACCOUNT_ID count grouped by CUSTOMER_HEALTH',
  'arravg_parent': 'Published dataset in PBIX; DB proxy uses vw_TF_EBI_Retention.RBOB / parent accounts',
  'arravg_sub': 'Published dataset in PBIX; DB proxy uses vw_TF_EBI_Retention.RBOB / sub accounts',
  'solution_ryg_arr': 'Published dataset in PBIX; DB proxy uses vw_TF_EBI_Retention grouped by CUSTOMER_SOLUTION_HEALTH',
  'solution_ryg_count': 'Published dataset in PBIX; DB proxy uses CUSTOMER_SOLUTION_HEALTH count',
  'tier1_account_completion': 'External tool (TPT); not directly queryable from DB',
  'tier1_sub_completion': 'External tool (TPT); not directly queryable from DB',
  'accnt_movement_up': 'dataset:Customer_Health_Movement — uses vw_TF_EBI_CUSTOMER_HEALTH_MOVEMENT',
  'accnt_movement_down': 'dataset:Customer_Health_Movement — uses vw_TF_EBI_CUSTOMER_HEALTH_MOVEMENT',
  'sol_movement_up': 'dataset:Customer_Health_Movement — uses vw_TF_EBI_CUSTOMER_SOLUTION_HEALTH_MOVEMENT',
  'sol_movement_down': 'dataset:Customer_Health_Movement — uses vw_TF_EBI_CUSTOMER_SOLUTION_HEALTH_MOVEMENT',
  'net_pct': 'Net Plan/QRF is a VP-level composite; approximated',
  'rbob': 'IC RBoB + OOC RBoB components not separately stored; SUM(RBOB) is the DB equivalent',
  'renewal_rate_outlook': 'Renewal rate uses PIPELINE_RENEWAL filter on vw_TD_EBI_Retention_MetaData, not directly on Retention fact',
  'upsell_attach_rate': 'Renewal matching requires Sub ID+OPG+MA+Opp Close Qtr composite key',
  'boq_arr_dollar': 'For Q+N projections, forward-computes BOQ_ARR + cumulative (W+F+UC + ARR_IMPACT)',
  'eoq_arr_dollar': 'Computed measure; falls back to EOQ_ARR column if computed value is blank',
  'arravg_qoq': 'Removes IS_CY_RPT_HIER filter from VW_TD_EBI_REPORTING_HIERARCHY for cross-hierarchy view',
  'sub_ma_arr': 'Removes MOPG1 filter from vw_EBI_OPG for total ARR irrespective of product grouping',
};

// ─── Related columns overrides per KPI ──────────────────────────────────
// For KPIs that originally had empty relatedColumns or need specific overrides
const RELATED_COLS_OVERRIDES = {
  'attrition_outlook_dollar': ['vw_TF_EBI_Retention.ARR_Impact', 'vw_EBI_Caldate.QTR_BKT_IND'],
  'attrition_ytd_outlook': ['vw_TF_EBI_Retention.ARR_Impact', 'vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER'],
  'attrition_outlook_pct': ['vw_TF_EBI_Retention.ARR_Impact', 'vw_TF_EBI_RENEWALS_TARGET.ATTRITION', 'vw_EBI_Caldate.QTR_BKT_IND'],
  'attrition_pct_plan': ['vw_TF_EBI_Retention.ARR_Impact', 'vw_TF_EBI_RENEWALS_TARGET.ATTRITION', 'vw_EBI_Caldate.QTR_BKT_IND'],
  'forecast': ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT', 'vw_EBI_Caldate.QTR_BKT_IND'],
  'upside': ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT', 'vw_EBI_Caldate.QTR_BKT_IND'],
  'account_ryg_arr': ['vw_TF_EBI_Retention.RBOB', 'vw_TF_EBI_Retention.CUSTOMER_HEALTH'],
  'account_ryg_count': ['vw_TF_EBI_Retention.ACCOUNT_ID', 'vw_TF_EBI_Retention.CUSTOMER_HEALTH'],
  'arravg_parent': ['vw_TF_EBI_Retention.RBOB', 'vw_TF_EBI_P2S.ACCOUNT_PARENT_ID'],
  'arravg_sub': ['vw_TF_EBI_Retention.RBOB', 'vw_TF_EBI_Retention.ACCOUNT_ID'],
  'solution_ryg_arr': ['vw_TF_EBI_Retention.RBOB', 'vw_TF_EBI_Retention.CUSTOMER_SOLUTION_HEALTH'],
  'solution_ryg_count': ['vw_TF_EBI_CUSTOMER_SOLUTION_HEALTH_MOVEMENT.acc_sol_key', 'vw_TF_EBI_Retention.CUSTOMER_SOLUTION_HEALTH'],
  'tier1_account_completion': ['PARENT_TIER'],
  'tier1_sub_completion': ['PARENT_TIER'],
  'renewal_rate_outlook': ['vw_TF_EBI_Retention.RBOB', 'vw_TF_EBI_Retention.ARR_Impact', 'vw_TD_EBI_Retention_MetaData.PIPELINE_RENEWAL'],
  'rbob': ['vw_TF_EBI_Retention.RBOB'],
  'net_pct': ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT', 'vw_TF_EBI_Retention.ARR_Impact', 'vw_EBI_Caldate.QTR_BKT_IND'],
  'upsell_attach_rate': ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.UPSELL_TYPE', 'vw_TF_EBI_Retention.RBOB', 'vw_TD_EBI_Retention_MetaData.PIPELINE_RENEWAL'],
  'slm_participation_qtd': ['vw_TD_EBI_REGION_RPT_MASKED.SLM_LDAP', 'vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL'],
  'ae_in_seat_pct': ['vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP', 'vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP', 'vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE', 'vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS'],
};

// ─── Determine status for each KPI ─────────────────────────────────────
const APPROXIMATED_IDS = new Set([
  'attrition_outlook_dollar', 'attrition_ytd_outlook', 'attrition_outlook_pct', 'attrition_pct_plan',
  'account_ryg_arr', 'account_ryg_count', 'arravg_parent', 'arravg_sub',
  'solution_ryg_arr', 'solution_ryg_count',
  'tier1_account_completion', 'tier1_sub_completion',
  'accnt_movement_up', 'accnt_movement_down', 'sol_movement_up', 'sol_movement_down',
]);

// ─── Transform relatedColumns ──────────────────────────────────────────
function mapRelatedColumns(kpi) {
  // If we have an explicit override, use it
  if (RELATED_COLS_OVERRIDES[kpi.id]) {
    return RELATED_COLS_OVERRIDES[kpi.id];
  }

  // Otherwise, map each column through COL_MAP
  const cols = kpi.relatedColumns || [];
  if (cols.length === 0) return [];

  const mapped = [];
  const seen = new Set();
  for (const col of cols) {
    const mapped_col = COL_MAP[col] || col; // pass through if not found
    if (!seen.has(mapped_col)) {
      seen.add(mapped_col);
      mapped.push(mapped_col);
    }
  }
  return mapped;
}

// ─── DAX Detection ──────────────────────────────────────────────────
// Detects raw Power BI DAX formulas that need DB translation
const DAX_KEYWORDS = [
  /\bEXTERNALMEASURE\b/i, /\bCALCULATE\s*\(/i, /\bSUMX\s*\(/i,
  /\bFILTER\s*\(/i, /\bVAR\s+\w/i, /\bRETURN\b/i, /\bCOALESCE\s*\(/i,
  /\bALL\s*\(/i, /\bRELATED\s*\(/i, /\bCOUNTROWS\s*\(/i,
  /\bAVERAGEX\s*\(/i, /\bMAXX\s*\(/i, /\bMINX\s*\(/i,
  /\bDIVIDE\s*\(/i, /\bSWITCH\s*\(/i, /\bISBLANK\s*\(/i,
  /\bUSERELATIONSHIP\s*\(/i, /\bREMOVEFILTERS\s*\(/i,
  /\bALLSELECTED\s*\(/i, /\bSELECTEDVALUE\s*\(/i,
  /\bIFERROR\s*\(/i, /\bVALUES\s*\(/i, /\bBLANK\s*\(/i,
  /\bDISTINCTCOUNT\s*\(/i, /\bCONTAINS\s*\(/i,
];

function isRawDaxFormula(formula) {
  if (!formula || typeof formula !== 'string') return false;
  return DAX_KEYWORDS.some(p => p.test(formula));
}

// ─── Pass 1: Excel Merge ────────────────────────────────────────────
function loadExcelMappings() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.log('  Excel mapping log not found, skipping Pass 1');
    return { formulaMap: new Map(), colsOnlyMap: new Map() };
  }
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws);
  const formulaMap = new Map();  // Clean DB formula + relatedColumns
  const colsOnlyMap = new Map(); // Only relatedColumns (formula is DAX)
  for (const row of rows) {
    const id = row.KPI_ID;
    if (!id) continue;
    const dbFormula = (row.DB_Formula || '').trim();
    const relCols = (row.Related_Columns_DB || '').trim();
    const parsedCols = relCols
      ? relCols.split(/,\s*/).filter(c => c.length > 0 && !c.startsWith('dataset:'))
      : [];
    if (dbFormula && !isRawDaxFormula(dbFormula)) {
      formulaMap.set(id, { formula: dbFormula, relatedColumns: parsedCols });
    } else if (parsedCols.length > 0) {
      // Formula is DAX but we have usable DB column references
      colsOnlyMap.set(id, parsedCols);
    }
  }
  console.log(`  Pass 1: loaded ${formulaMap.size} full DB mappings, ${colsOnlyMap.size} cols-only from Excel`);
  return { formulaMap, colsOnlyMap };
}

// ─── Pass 2: Regex Extract relatedColumns from formula text ─────────
const TABLE_COL_REGEX = /\b(vw_\w+|TF_\w+|TD_\w+|VW_\w+)\.\w+/gi;

function extractRelatedColumnsFromFormula(formula) {
  if (!formula || typeof formula !== 'string') return [];
  const matches = formula.match(TABLE_COL_REGEX);
  if (!matches) return [];
  const seen = new Set();
  const result = [];
  for (const m of matches) {
    const normalized = m;
    if (!seen.has(normalized.toLowerCase())) {
      seen.add(normalized.toLowerCase());
      result.push(normalized);
    }
  }
  return result;
}

function deriveRelatedTables(relatedColumns) {
  const seen = new Set();
  const tables = [];
  for (const col of relatedColumns) {
    const dot = col.indexOf('.');
    if (dot > 0) {
      const table = col.substring(0, dot);
      if (!seen.has(table.toLowerCase())) {
        seen.add(table.toLowerCase());
        tables.push(table);
      }
    }
  }
  return tables;
}

// ─── Pass 3: Pattern-Based Inference ────────────────────────────────
const PBIX_ONLY_FORMULA = 'Power BI calculated measure — not directly queryable via SQL';

const INFERENCE_RULES = [
  // ── PBIX-only patterns (must come first) ──
  { test: n => /\bGEO RANK\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bOVERALLSCORE\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bCREDIT\b/i.test(n) && !/GROSS|NET|PIPE/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bDEFAULT (COMMIT|TARGET)\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bSNAPSHOT DATE\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bMULTI SOLUTION\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bPROJECTED CLOSE RATIO\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bLINEARITY TARGET TREND\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bPARTNER\b.*%/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bProduct Consumption\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bPrimary Product Consumption\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bTENURE\b.*\bGAP\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bCURRENT ROLE TENURE\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bLEAD\b.*\b(AMOUNT|VALUE)\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\b(ACCOUNT|SBR) ACTIVITY\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bCOMPETITOR FILL RATE\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bCOMPLETED (IPOV|MUTUAL)\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bTIER \d\b.*\bCOMPLETED\b.*\bAP\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bTIER \d\b.*\bASSESSED\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bTIER \d\b.*\bCOMPLETED\b.*[#%]/i.test(n) && !/GNARR|WON|GROSS|ACCTS/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bTIER \d\b.*\bOWNER\b.*%/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bNOT TIERED\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bPRNT COMPLETE\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bENABLEMENT\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bEOQ SNAPSHOT DATE\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bPQ EOQ SNAPSHOT DATE\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },

  // ── Tier-specific DB-mappable patterns ──
  {
    test: n => /\bTIER (\d)\b.*\bGNARR\b.*\$/i.test(n),
    formula: n => { const t = n.match(/TIER (\d)/i)[1]; return `SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.PARENT_TIER = 'Tier ${t}'`; },
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.PARENT_TIER'],
  },
  {
    test: n => /\bTIER (\d)\b.*\b(WITH|WITHOUT) GNARR\b.*#/i.test(n),
    formula: n => {
      const t = n.match(/TIER (\d)/i)[1];
      const has = /WITHOUT/i.test(n) ? 'IS NULL' : 'IS NOT NULL';
      return `COUNT(DISTINCT vw_TF_EBI_P2S.ACCOUNT_PARENT_ID) WHERE vw_TF_EBI_P2S.PARENT_TIER = 'Tier ${t}' AND vw_TF_EBI_P2S.OPPTY ${has}`;
    },
    relatedColumns: ['vw_TF_EBI_P2S.ACCOUNT_PARENT_ID', 'vw_TF_EBI_P2S.PARENT_TIER', 'vw_TF_EBI_P2S.OPPTY'],
  },
  {
    test: n => /\bTIER (\d)\b.*\bACCTS\b.*#/i.test(n),
    formula: n => { const t = n.match(/TIER (\d)/i)[1]; return `COUNT(DISTINCT vw_TF_EBI_P2S.ACCOUNT_PARENT_ID) WHERE vw_TF_EBI_P2S.PARENT_TIER = 'Tier ${t}'`; },
    relatedColumns: ['vw_TF_EBI_P2S.ACCOUNT_PARENT_ID', 'vw_TF_EBI_P2S.PARENT_TIER'],
  },
  {
    test: n => /\bTIER (\d)\b.*\bWON\b.*\$/i.test(n),
    formula: n => { const t = n.match(/TIER (\d)/i)[1]; return `SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.PARENT_TIER = 'Tier ${t}' AND vw_TF_EBI_P2S.ADJ_COMMITMENT = 'Won'`; },
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.PARENT_TIER', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'],
  },
  {
    test: n => /\bTIER (\d)\b.*\bGROSS CREATED\b.*\$/i.test(n),
    formula: n => { const t = n.match(/TIER (\d)/i)[1]; return `SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.PARENT_TIER = 'Tier ${t}' AND vw_EBI_Caldate.QUALIFICATION_QTR_BKT = 0`; },
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.PARENT_TIER', 'vw_EBI_Caldate.QUALIFICATION_QTR_BKT'],
  },

  // ── W+F+UC ──
  { test: n => /\bW\+F\+UC\b.*\$/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.ADJ_COMMITMENT IN ('Won','Forecast','Upside - Committed')", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'] },
  { test: n => /\bW\+F\+UC\b.*%/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN ('Won','Forecast','Upside - Committed')) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0)", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL'] },

  // ── Pipeline Walk ──
  { test: n => /\bWALK VALUE\b/i.test(n) || /\bWALK\b.*\$/i.test(n), formula: 'SUM(vw_TF_EBI_PIPE_WALK.GROSSASV)', relatedColumns: ['vw_TF_EBI_PIPE_WALK.GROSSASV'] },
  { test: n => /\bWALK\b.*\bCLOSE RATIO\b/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT = 'Won' AND IS_EOQ = 'TRUE') / NULLIF(SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1 AND IS_BOQ = 'TRUE'), 0)", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT', 'vw_TF_EBI_P2S.IS_EOQ', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_TF_EBI_P2S.IS_BOQ'] },
  { test: n => /\bWalk Oppty\b/i.test(n), formula: 'COUNT(DISTINCT vw_TF_EBI_PIPE_WALK.OPP_ID)', relatedColumns: ['vw_TF_EBI_PIPE_WALK.OPP_ID'] },

  // ── Progression ──
  { test: n => /\bSS4 PROGRESSION\b/i.test(n), formula: "SUM(vw_TF_EBI_PIPE_WALK.STAGEPROGRESSIONASV) WHERE PREV_SALES_STAGE_DERIVED IN ('S3','In Qtr') AND CURR_SALES_STAGE IN ('S4','S5','S6','S7','Booked')", relatedColumns: ['vw_TF_EBI_PIPE_WALK.STAGEPROGRESSIONASV', 'vw_TF_EBI_PIPE_WALK.PREV_SALES_STAGE_DERIVED', 'vw_TF_EBI_PIPE_WALK.CURR_SALES_STAGE'] },
  { test: n => /\bTRUE PROGRESSION\b/i.test(n), formula: "SUM(vw_TF_EBI_PIPE_WALK.STAGEPROGRESSIONASV) WHERE PREV_SALES_STAGE_DERIVED IN ('S3','S4') AND CURR_SALES_STAGE IN ('S5','S6','S7','Booked')", relatedColumns: ['vw_TF_EBI_PIPE_WALK.STAGEPROGRESSIONASV', 'vw_TF_EBI_PIPE_WALK.PREV_SALES_STAGE_DERIVED', 'vw_TF_EBI_PIPE_WALK.CURR_SALES_STAGE'] },

  // ── Won / Lost / Closed ──
  { test: n => /\bWON\b.*\$/i.test(n) && !/TIER|W\+F\+UC|TREND|PRNT/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.ADJ_COMMITMENT = 'Won'", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'] },
  { test: n => /\bWON\b.*#/i.test(n), formula: "COUNT(DISTINCT vw_TF_EBI_P2S.OPP_ID) WHERE vw_TF_EBI_P2S.ADJ_COMMITMENT = 'Won'", relatedColumns: ['vw_TF_EBI_P2S.OPP_ID', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'] },
  { test: n => /\bWON \$ TREND\b/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE ADJ_COMMITMENT = 'Won' by vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT', 'vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE'] },
  { test: n => /\bLOST\b.*\$/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.ADJ_COMMITMENT = 'Lost'", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'] },
  { test: n => /\bLOST\b.*#/i.test(n), formula: "COUNT(DISTINCT vw_TF_EBI_P2S.OPP_ID) WHERE vw_TF_EBI_P2S.ADJ_COMMITMENT = 'Lost'", relatedColumns: ['vw_TF_EBI_P2S.OPP_ID', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'] },
  { test: n => /\bCLOSED\b.*#/i.test(n), formula: "COUNT(DISTINCT vw_TF_EBI_P2S.OPP_ID) WHERE vw_TF_EBI_P2S.ADJ_COMMITMENT IN ('Won','Lost')", relatedColumns: ['vw_TF_EBI_P2S.OPP_ID', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'] },

  // ── Coverage ──
  { test: n => /\bCOVERAGE\b.*\bBOQ\b.*\bMATURE\b/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1 AND IS_BOQ = 'TRUE' AND vw_EBI_SALES_STAGE.SalesStageGrp_Sort = 2) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0)", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_TF_EBI_P2S.IS_BOQ', 'vw_EBI_SALES_STAGE.SalesStageGrp_Sort', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL'] },
  { test: n => /\bCOVERAGE\b.*\bBOQ\b.*\bPIPE\b/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1 AND IS_BOQ = 'TRUE') / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0)", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_TF_EBI_P2S.IS_BOQ', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL'] },
  { test: n => /\bCOVERAGE\b.*\bMATURE\b.*\bPIPE\b/i.test(n), formula: 'SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1 AND vw_EBI_SALES_STAGE.SalesStageGrp_Sort = 2) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0)', relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_EBI_SALES_STAGE.SalesStageGrp_Sort', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL'] },
  { test: n => /\bCOVERAGE\b.*\bPIPE\b.*\bTARGET\b/i.test(n), formula: 'SUM(vw_TF_EBI_QUOTA.QUOTA_REQ) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0)', relatedColumns: ['vw_TF_EBI_QUOTA.QUOTA_REQ', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL'] },
  { test: n => /\b(COVERAGE|COV)\b.*X/i.test(n), formula: 'SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0)', relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL'] },
  { test: n => /\bS5\+\b.*\bCOVERAGE\b.*\bLEFT TO GO\b/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1 AND vw_EBI_SALES_STAGE.SalesStageGrp_Sort = 2) / NULLIF(GREATEST(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL) - SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT = 'Won'), 0), 0)", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_EBI_SALES_STAGE.SalesStageGrp_Sort', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'] },

  // ── Targets ──
  { test: n => /\bPIPE TARGET\b.*\bSS4\b/i.test(n), formula: 'SUM(vw_TF_EBI_QUOTA.QUOTA_REQ_SS5)', relatedColumns: ['vw_TF_EBI_QUOTA.QUOTA_REQ_SS5'] },
  { test: n => /\bPIPE TARGET\b.*\bSURVIVAL\b/i.test(n), formula: 'SUM(vw_TF_EBI_QUOTA.QUOTA_REQ) survival-rate-adjusted', relatedColumns: ['vw_TF_EBI_QUOTA.QUOTA_REQ'] },
  { test: n => /\bPIPE TARGET\b.*\bTO GO\b/i.test(n), formula: "GREATEST(SUM(vw_TF_EBI_QUOTA.QUOTA_REQ) - SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1), 0)", relatedColumns: ['vw_TF_EBI_QUOTA.QUOTA_REQ', 'vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE'] },
  { test: n => /\bPIPE TARGET\b/i.test(n), formula: 'SUM(vw_TF_EBI_QUOTA.QUOTA_REQ)', relatedColumns: ['vw_TF_EBI_QUOTA.QUOTA_REQ'] },
  { test: n => /\bBOOKINGS TARGET\b/i.test(n), formula: 'SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL)', relatedColumns: ['vw_TF_EBI_QUOTA.QUOTA_ACTUAL'] },
  { test: n => /\bGENERATION TARGET\b/i.test(n), formula: 'SUM(TF_EBI_GENERATION_TARGET.GENERATION_TARGET)', relatedColumns: ['TF_EBI_GENERATION_TARGET.GENERATION_TARGET'] },
  { test: n => /\bCQ LEFT TO GO\b/i.test(n), formula: "GREATEST(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL) - SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT = 'Won'), 0) WHERE vw_EBI_Caldate.QTR_BKT_IND = 0", relatedColumns: ['vw_TF_EBI_QUOTA.QUOTA_ACTUAL', 'vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT', 'vw_EBI_Caldate.QTR_BKT_IND'] },
  { test: n => /\bCQ RUNNING TARGET\b/i.test(n), formula: 'SUM(vw_EBI_PACING_TARGET.PACING_LINEARITY) * SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL) WHERE vw_EBI_Caldate.QTR_BKT_IND = 0', relatedColumns: ['vw_EBI_PACING_TARGET.PACING_LINEARITY', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL', 'vw_EBI_Caldate.QTR_BKT_IND'] },
  { test: n => /\bOPP\b.*\bTARGET\b.*\$/i.test(n), formula: 'SUM(vw_TF_EBI_QUOTA.QUOTA_REQ)', relatedColumns: ['vw_TF_EBI_QUOTA.QUOTA_REQ'] },

  // ── Gross Creation ──
  { test: n => /\bGROSS CREAT(ED|ION)\b.*\$/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_EBI_Caldate.QUALIFICATION_QTR_BKT = 0 AND vw_EBI_SALES_STAGE.SALES_STAGE NOT IN ('S1','S2')", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_EBI_Caldate.QUALIFICATION_QTR_BKT', 'vw_EBI_SALES_STAGE.SALES_STAGE'] },
  { test: n => /\bGROSS CREAT(ED|ION)\b.*%/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE QUALIFICATION_QTR_BKT = 0 AND SALES_STAGE NOT IN ('S1','S2')) / NULLIF(TF_EBI_GENERATION_TARGET.GENERATION_TARGET, 0)", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_EBI_Caldate.QUALIFICATION_QTR_BKT', 'vw_EBI_SALES_STAGE.SALES_STAGE', 'TF_EBI_GENERATION_TARGET.GENERATION_TARGET'] },
  { test: n => /\bFULL QUARTER\b.*\bCREATION\b/i.test(n), formula: 'TF_EBI_GENERATION_TARGET.GENERATION_TARGET for the specified quarter', relatedColumns: ['TF_EBI_GENERATION_TARGET.GENERATION_TARGET', 'TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC'] },
  { test: n => /\bGPC\b.*Q\d/i.test(n), formula: 'TF_EBI_GENERATION_TARGET.GENERATION_TARGET for the specified quarter', relatedColumns: ['TF_EBI_GENERATION_TARGET.GENERATION_TARGET', 'TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC'] },

  // ── Net creation / Growth pipe ──
  { test: n => /\bNET\b.*\bCREATION\b/i.test(n) || /\bNET PIPE CREATION\b/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1) - SUM(vw_TF_EBI_P2S.OPPTY WHERE IS_BOQ = 'TRUE' AND IN_PIPELINE = 1)", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_TF_EBI_P2S.IS_BOQ'] },
  { test: n => /\bGROWTH PIPE\b/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1) - SUM(vw_TF_EBI_P2S.OPPTY WHERE IS_BOQ = 'TRUE' AND IN_PIPELINE = 1)", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_TF_EBI_P2S.IS_BOQ'] },
  { test: n => /\bNET\b.*\bCHANGE\b/i.test(n) || /\bNET MOVEMENT\b/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1) - SUM(vw_TF_EBI_P2S.OPPTY WHERE IS_BOQ = 'TRUE' AND IN_PIPELINE = 1)", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_TF_EBI_P2S.IS_BOQ'] },
  { test: n => /\bNET PUSHED\b/i.test(n), formula: "SUM(vw_TF_EBI_PIPE_WALK.GROSSASV) WHERE vw_TF_EBI_PIPE_WALK.WALK_GROUP = 'Pushed'", relatedColumns: ['vw_TF_EBI_PIPE_WALK.GROSSASV', 'vw_TF_EBI_PIPE_WALK.WALK_GROUP'] },

  // ── Pipeline / Oppty ──
  { test: n => /\bOPEN\b.*\bSTALLED\b.*\bPIPE\b/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE STALLED_BUT_INACTIVE = 'Stalled & Inactive' AND IN_PIPELINE = 1) / NULLIF(SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1), 0)", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.STALLED_BUT_INACTIVE', 'vw_TF_EBI_P2S.IN_PIPELINE'] },
  { test: n => /\bSTALLED\b.*\bINACTIVE\b/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.STALLED_BUT_INACTIVE = 'Stalled & Inactive'", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.STALLED_BUT_INACTIVE'] },
  { test: n => /\bIDLE OPPTY\b/i.test(n), formula: "COUNT(DISTINCT vw_TF_EBI_P2S.OPP_ID) WHERE DAYS_SINCE_NEXT_STEPS_MODIFIED_BAND = '30+ days' AND ADJ_COMMITMENT_GROUP = 'Open'", relatedColumns: ['vw_TF_EBI_P2S.OPP_ID', 'vw_TF_EBI_P2S.DAYS_SINCE_NEXT_STEPS_MODIFIED_BAND', 'vw_TF_EBI_P2S.ADJ_COMMITMENT_GROUP'] },
  { test: n => /\bOPEN OPPTY\b.*\bW\/W\b/i.test(n), formula: 'Current week vs prior week delta of pipeline oppty using vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE', relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.OPP_ID', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE'] },
  { test: n => /\bOPPTY\b.*\bW\/W\b/i.test(n), formula: 'Current week vs prior week delta using vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE', relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE'] },
  { test: n => /\bOPEN OPPTY\b.*\$/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE ADJ_COMMITMENT_GROUP = 'Open'", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT_GROUP'] },
  { test: n => /\bOPP\b.*#|OPP #/i.test(n), formula: 'COUNT(DISTINCT vw_TF_EBI_P2S.OPP_ID) WHERE IN_PIPELINE = 1', relatedColumns: ['vw_TF_EBI_P2S.OPP_ID', 'vw_TF_EBI_P2S.IN_PIPELINE'] },
  { test: n => /\bOPPTY\b.*\$/i.test(n), formula: 'SUM(vw_TF_EBI_P2S.OPPTY)', relatedColumns: ['vw_TF_EBI_P2S.OPPTY'] },

  // ── Stage percentages ──
  { test: n => /\bS3\b.*%/i.test(n) && !/COV|>180/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE SalesStageGrp = 'S3') / NULLIF(SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1), 0)", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_EBI_SALES_STAGE.SalesStageGrp'] },
  { test: n => /\bS3>180D\b/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE SalesStageGrp = 'S3' AND STAGE_AGE > 180) / NULLIF(SUM(vw_TF_EBI_P2S.OPPTY WHERE SalesStageGrp = 'S3'), 0)", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.STAGE_AGE', 'vw_EBI_SALES_STAGE.SalesStageGrp'] },
  { test: n => /\bS4\b.*%/i.test(n) && !/COV|>180/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE SalesStageGrp = 'S4') / NULLIF(SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1), 0)", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_EBI_SALES_STAGE.SalesStageGrp'] },
  { test: n => /\bS4>180D\b/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE SalesStageGrp = 'S4' AND STAGE_AGE > 180) / NULLIF(SUM(vw_TF_EBI_P2S.OPPTY WHERE SalesStageGrp = 'S4'), 0)", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.STAGE_AGE', 'vw_EBI_SALES_STAGE.SalesStageGrp'] },
  { test: n => /\bS5\+\b.*%/i.test(n), formula: 'SUM(vw_TF_EBI_P2S.OPPTY WHERE SalesStageGrp_Sort = 2) / NULLIF(SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1), 0)', relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_EBI_SALES_STAGE.SalesStageGrp_Sort'] },
  { test: n => /\bS1\/S2\b.*#/i.test(n), formula: "COUNT(DISTINCT vw_TF_EBI_P2S.OPP_ID) WHERE SalesStageGrp = 'S1-S2'", relatedColumns: ['vw_TF_EBI_P2S.OPP_ID', 'vw_EBI_SALES_STAGE.SalesStageGrp'] },

  // ── Attainment / Pacing ──
  { test: n => /\bATTAINMENT\b/i.test(n) && !/RETENTION|RBOB|GROWTH|PIPELINE/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN ('Won','Forecast','Upside - Committed')) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0)", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL'] },
  { test: n => /\bPIPELINE ATTAINMENT\b/i.test(n), formula: 'SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_REQ), 0)', relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_TF_EBI_QUOTA.QUOTA_REQ'] },
  { test: n => /\bRETENTION ATTAINMENT\b/i.test(n), formula: 'SUM(vw_TF_EBI_Retention.ARR_Impact) / NULLIF(SUM(vw_TF_EBI_RENEWALS_TARGET.ATTRITION), 0)', relatedColumns: ['vw_TF_EBI_Retention.ARR_Impact', 'vw_TF_EBI_RENEWALS_TARGET.ATTRITION'] },
  { test: n => /\bPACING\b.*\$/i.test(n), formula: 'SUM(vw_EBI_PACING_TARGET.PACING_LINEARITY) * SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL)', relatedColumns: ['vw_EBI_PACING_TARGET.PACING_LINEARITY', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL'] },

  // ── Forecast / Manager ──
  { test: n => /\bMANAGER FORECAST\b/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN ('Won','Forecast','Upside - Committed')) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0)", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL'] },
  { test: n => /\bBOOKING VALUE\b/i.test(n) || /\bTM1\b.*\bBookings\b/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE ADJ_COMMITMENT = 'Won'", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'] },
  { test: n => /\bDEAL WIN RATE\b/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT = 'Won') / NULLIF(SUM(OPPTY WHERE ADJ_COMMITMENT IN ('Won','Lost')), 0)", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'] },
  { test: n => /\bAVG DEAL DURATION\b/i.test(n), formula: 'AVG(vw_TF_EBI_P2S.DEAL_AGE)', relatedColumns: ['vw_TF_EBI_P2S.DEAL_AGE'] },
  { test: n => /\bAVG DEAL SIZE\b/i.test(n), formula: 'AVG(vw_TF_EBI_P2S.OPPTY)', relatedColumns: ['vw_TF_EBI_P2S.OPPTY'] },

  // ── Participation ──
  { test: n => /\bREP PARTICIPATION\b.*\bTOTAL\b/i.test(n), formula: "COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP) WHERE IS_TRUE_REP = 1", relatedColumns: ['vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP', 'vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP'] },
  { test: n => /\bTEAM PARTICIPATION\b.*\bTOTAL\b/i.test(n), formula: "COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP) WHERE IS_TRUE_FLM = 1", relatedColumns: ['vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP', 'vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM'] },
  { test: n => /\bREP PARTICIPATION\b/i.test(n), formula: "COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP WHERE attainment >= threshold AND IS_TRUE_REP = 1) / NULLIF(total, 0)", relatedColumns: ['vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP', 'vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP', 'vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL'] },
  { test: n => /\bFLM PARTICIPATION\b/i.test(n), formula: "COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP WHERE attainment >= threshold AND IS_TRUE_FLM = 1) / NULLIF(total, 0)", relatedColumns: ['vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP', 'vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM', 'vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL'] },
  { test: n => /\bSLM\b.*\bCOUNT\b/i.test(n) || /\bSLM\b.*%/i.test(n), formula: "COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.SLM_LDAP WHERE attainment >= threshold) / total", relatedColumns: ['vw_TD_EBI_REGION_RPT_MASKED.SLM_LDAP', 'vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL'] },
  { test: n => /\bTEAM PARTICIPATION\b/i.test(n), formula: "COUNT(DISTINCT FLM_LDAP WHERE >50% AEs at threshold) / NULLIF(COUNT(DISTINCT FLM_LDAP WHERE IS_TRUE_FLM = 1), 0)", relatedColumns: ['vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP', 'vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM', 'vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP', 'vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL'] },

  // ── ARR / RBOB / Retention ──
  { test: n => /\bBOQ ARR\b/i.test(n), formula: 'SUM(vw_TF_EBI_Retention.BOQ_ARR)', relatedColumns: ['vw_TF_EBI_Retention.BOQ_ARR'] },
  { test: n => /\bEOQ ARR\b/i.test(n), formula: 'SUM(vw_TF_EBI_Retention.EOQ_ARR)', relatedColumns: ['vw_TF_EBI_Retention.EOQ_ARR'] },
  { test: n => /\bARR\b.*\$/i.test(n) && !/BOQ|EOQ|OPG|TWELVE/i.test(n), formula: 'SUM(vw_TF_EBI_Retention.BOQ_ARR)', relatedColumns: ['vw_TF_EBI_Retention.BOQ_ARR'] },
  { test: n => /\bOPG\b.*\bARR\b/i.test(n) || /\bTWELVE MONTH\b/i.test(n), formula: 'SUM(vw_TF_EBI_ACC_OPG_ARR.ARR_AMOUNT)', relatedColumns: ['vw_TF_EBI_ACC_OPG_ARR.ARR_AMOUNT'] },
  { test: n => /\bRBOB\b/i.test(n), formula: 'SUM(vw_TF_EBI_Retention.RBOB)', relatedColumns: ['vw_TF_EBI_Retention.RBOB'] },
  { test: n => /\bRISK\b.*\bUPSIDE\b.*\$/i.test(n), formula: 'SUM(vw_TF_EBI_Retention.RISK_UPSIDE_AMOUNT)', relatedColumns: ['vw_TF_EBI_Retention.RISK_UPSIDE_AMOUNT'] },
  { test: n => /\bRENEWAL\b.*#/i.test(n), formula: 'COUNT(DISTINCT vw_TF_EBI_Retention.Retention_MetaData_ID)', relatedColumns: ['vw_TF_EBI_Retention.Retention_MetaData_ID'] },
  { test: n => /\bRENEWALS?\b.*\bATTRITION\b.*\$/i.test(n) || /\bTOTAL ATTRITION\b/i.test(n), formula: 'SUM(vw_TF_EBI_RENEWALS_TARGET.ATTRITION)', relatedColumns: ['vw_TF_EBI_RENEWALS_TARGET.ATTRITION'] },
  { test: n => /\bATTRITION\b/i.test(n) && !/TOTAL|RENEWALS|PLAN|PCT/i.test(n), formula: 'SUM(vw_TF_EBI_Retention.ARR_Impact)', relatedColumns: ['vw_TF_EBI_Retention.ARR_Impact'] },

  // ── Upside / Upsell ──
  { test: n => /\bUPSIDE TARGETED\b/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE ADJ_COMMITMENT = 'Upside - Committed'", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'] },
  { test: n => /\bUPSIDE FORECAST PIPE\b/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE ADJ_COMMITMENT IN ('Forecast','Upside - Committed') AND IN_PIPELINE = 1", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT', 'vw_TF_EBI_P2S.IN_PIPELINE'] },
  { test: n => /\bUPSIDE\b.*\$/i.test(n) && !/RISK|FORECAST|TARGETED/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE ADJ_COMMITMENT = 'Upside - Committed'", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'] },
  { test: n => /\bUPSELL\b/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE UPSELL_TYPE = 'Renewal Upsell'", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.UPSELL_TYPE'] },

  // ── Gaps ──
  { test: n => /\bGAP\b.*\$/i.test(n) && /\bGROSS\b/i.test(n), formula: "TF_EBI_GENERATION_TARGET.GENERATION_TARGET - SUM(vw_TF_EBI_P2S.OPPTY WHERE SALES_STAGE NOT IN ('S1','S2'))", relatedColumns: ['TF_EBI_GENERATION_TARGET.GENERATION_TARGET', 'vw_TF_EBI_P2S.OPPTY', 'vw_EBI_SALES_STAGE.SALES_STAGE'] },
  { test: n => /\bGAP\b.*\$/i.test(n) && /\bPIPE\b/i.test(n), formula: 'SUM(vw_TF_EBI_QUOTA.QUOTA_REQ) - SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1)', relatedColumns: ['vw_TF_EBI_QUOTA.QUOTA_REQ', 'vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE'] },
  { test: n => /\bGAP\b.*\$/i.test(n) && /\bGROWTH\b/i.test(n), formula: 'Net creation target - actual growth pipe', relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_TF_EBI_P2S.IS_BOQ', 'TF_EBI_GENERATION_TARGET.GENERATION_TARGET'] },
  { test: n => /\bGAP TO GO\b/i.test(n), formula: "SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL) - SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN ('Won','Forecast','Upside - Committed'))", relatedColumns: ['vw_TF_EBI_QUOTA.QUOTA_ACTUAL', 'vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'] },
  { test: n => /\bGAP\b.*\$/i.test(n), formula: "SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL) - SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN ('Won','Forecast','Upside - Committed'))", relatedColumns: ['vw_TF_EBI_QUOTA.QUOTA_ACTUAL', 'vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'] },

  // ── Prior year ──
  { test: n => /\bPY\b.*\$/i.test(n) && /\bQUOTA\b/i.test(n), formula: 'SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL) for prior year', relatedColumns: ['vw_TF_EBI_QUOTA.QUOTA_ACTUAL', 'vw_EBI_Caldate.FISCAL_YR'] },
  { test: n => /\bPY\b.*\$/i.test(n) && /\bWON\b/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT = 'Won') for prior year", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT', 'vw_EBI_Caldate.FISCAL_YR'] },
  { test: n => /\bPY\b.*%/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN ('Won','Forecast','Upside - Committed')) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0) for prior year", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL', 'vw_EBI_Caldate.FISCAL_YR'] },

  // ── Misc ──
  { test: n => /\bTRAILING BOOKED\b/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE ADJ_COMMITMENT = 'Won' (rolling window)", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'] },
  { test: n => /\bPREV WEEK PIPE\b/i.test(n), formula: 'SUM(vw_TF_EBI_P2S.OPPTY) WHERE IN_PIPELINE = 1 AND vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE = -1', relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE'] },
  { test: n => /\bMATURE PIPE NET CHANGE\b/i.test(n), formula: 'SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1 AND SalesStageGrp_Sort = 2) - BOQ equivalent', relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_EBI_SALES_STAGE.SalesStageGrp_Sort', 'vw_TF_EBI_P2S.IS_BOQ'] },
  { test: n => /\bACTIVE & UPDATED\b/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE STALLED_BUT_INACTIVE = 'Active'", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.STALLED_BUT_INACTIVE'] },
  { test: n => /\bNET ASV\b/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN ('Won','Forecast','Upside - Committed')) - ABS(SUM(vw_TF_EBI_Retention.ARR_Impact))", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT', 'vw_TF_EBI_Retention.ARR_Impact'] },
  { test: n => /\bLTG\b.*#/i.test(n), formula: "COUNT(DISTINCT vw_TF_EBI_Retention.Retention_MetaData_ID) WHERE OUTLOOK_CATEGORY = 'Left To Go'", relatedColumns: ['vw_TF_EBI_Retention.Retention_MetaData_ID', 'vw_TD_EBI_Retention_MetaData.OUTLOOK_CATEGORY'] },
  { test: n => /\bIN QTR GC TARGET\b/i.test(n), formula: 'TF_EBI_GENERATION_TARGET.GENERATION_TARGET for current qualification quarter', relatedColumns: ['TF_EBI_GENERATION_TARGET.GENERATION_TARGET'] },
  { test: n => /\bBOQ WALK VALUE\b/i.test(n), formula: 'SUM(vw_TF_EBI_PIPE_WALK.BOQ_GROSSASV)', relatedColumns: ['vw_TF_EBI_PIPE_WALK.BOQ_GROSSASV'] },
  { test: n => /\bCURR WALK VALUE\b/i.test(n), formula: 'SUM(vw_TF_EBI_PIPE_WALK.GROSSASV) at current snapshot', relatedColumns: ['vw_TF_EBI_PIPE_WALK.GROSSASV'] },
  { test: n => /\bPREV WALK VALUE\b/i.test(n), formula: 'SUM(vw_TF_EBI_PIPE_WALK.GROSSASV) at prior week snapshot', relatedColumns: ['vw_TF_EBI_PIPE_WALK.GROSSASV', 'vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE'] },
  { test: n => /\bCY\b.*\bPROJECTION\b/i.test(n) || /\bCY\b.*\bPLAN\b/i.test(n), formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN ('Won','Forecast','Upside - Committed')) across PQ+CQ+FQ / SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL)", relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL', 'vw_EBI_Caldate.QTR_BKT_IND'] },
  { test: n => /\bTOTAL CREDIT TARGET\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
];

function inferFromPattern(kpiName) {
  for (const rule of INFERENCE_RULES) {
    if (rule.test(kpiName)) {
      const formula = typeof rule.formula === 'function' ? rule.formula(kpiName) : rule.formula;
      return {
        formula,
        relatedColumns: [...rule.relatedColumns],
        pbixOnly: rule.pbixOnly || false,
      };
    }
  }
  return null;
}

// ─── MAIN — 4-Pass Pipeline ────────────────────────────────────────
function main() {
  const raw = fs.readFileSync(GLOSSARY_PATH, 'utf-8');
  const glossary = JSON.parse(raw);
  const kpis = glossary.kpis;
  console.log(`Read ${kpis.length} KPIs from ${GLOSSARY_PATH}\n`);

  const stats = { excelMerged: 0, regexExtracted: 0, inferred: 0, pbixOnly: 0, mapped: 0, approximated: 0 };

  // ── Reset: restore original formula from formulaPbix for idempotency ─
  for (const kpi of kpis) {
    if (kpi.formulaPbix) {
      kpi.formula = kpi.formulaPbix;
    }
    // Clear derived fields so they get re-computed
    delete kpi.confidence;
    delete kpi.pbix_only;
    kpi.relatedTables = [];
  }

  // ── Pass 1: Excel Merge ───────────────────────────────────────────
  console.log('Pass 1: Excel Merge...');
  const { formulaMap, colsOnlyMap } = loadExcelMappings();

  for (const kpi of kpis) {
    if (!kpi.formulaPbix) {
      kpi.formulaPbix = kpi.formula;
    }

    // Priority 1: FORMULA_OVERRIDES (hand-verified)
    if (FORMULA_OVERRIDES[kpi.id]) {
      kpi.formula = FORMULA_OVERRIDES[kpi.id];
    }
    // Priority 2: Excel full DB_Formula
    else if (kpi.formula && isRawDaxFormula(kpi.formula) && formulaMap.has(kpi.id)) {
      const excel = formulaMap.get(kpi.id);
      kpi.formula = excel.formula;
      if (excel.relatedColumns.length > 0) {
        kpi.relatedColumns = excel.relatedColumns;
      }
      stats.excelMerged++;
    }

    // Priority 3: Excel cols-only (formula still DAX, but we have DB column refs)
    if (isRawDaxFormula(kpi.formula) && colsOnlyMap.has(kpi.id)) {
      kpi.relatedColumns = colsOnlyMap.get(kpi.id);
    }

    // Map relatedColumns through COL_MAP + RELATED_COLS_OVERRIDES
    kpi.relatedColumns = mapRelatedColumns(kpi);

    if (NOTES[kpi.id]) {
      kpi.notes = NOTES[kpi.id];
    }
  }
  console.log(`  Excel merged: ${stats.excelMerged}\n`);

  // ── Pass 2: Regex Extract relatedColumns ──────────────────────────
  console.log('Pass 2: Regex Extract relatedColumns...');
  for (const kpi of kpis) {
    if ((!kpi.relatedColumns || kpi.relatedColumns.length === 0) &&
        kpi.formula && !isRawDaxFormula(kpi.formula)) {
      const extracted = extractRelatedColumnsFromFormula(kpi.formula);
      if (extracted.length > 0) {
        kpi.relatedColumns = extracted;
        stats.regexExtracted++;
      }
    }
  }
  console.log(`  Regex extracted: ${stats.regexExtracted}\n`);

  // ── Pass 3: Pattern-Based Inference ───────────────────────────────
  console.log('Pass 3: Pattern-Based Inference...');
  for (const kpi of kpis) {
    if (kpi.formula && isRawDaxFormula(kpi.formula)) {
      const result = inferFromPattern(kpi.name);
      if (result) {
        kpi.formula = result.formula;
        // Merge inferred relatedColumns with any Excel-sourced ones
        const existingCols = kpi.relatedColumns || [];
        const merged = [...result.relatedColumns];
        const seen = new Set(merged.map(c => c.toLowerCase()));
        for (const c of existingCols) {
          if (!seen.has(c.toLowerCase())) { merged.push(c); seen.add(c.toLowerCase()); }
        }
        kpi.relatedColumns = merged;
        if (result.pbixOnly) {
          kpi.pbix_only = true;
          kpi.confidence = 'pbix_only';
          stats.pbixOnly++;
        } else {
          kpi.confidence = 'inferred';
          stats.inferred++;
        }
      }
    }
  }
  console.log(`  Inferred: ${stats.inferred}`);
  console.log(`  PBIX-only (pattern): ${stats.pbixOnly}\n`);

  // ── Pass 4: Mark Remaining Unmappable ─────────────────────────────
  console.log('Pass 4: Mark Remaining Unmappable...');
  let pass4pbix = 0, pass4partial = 0;
  for (const kpi of kpis) {
    if (kpi.formula && isRawDaxFormula(kpi.formula)) {
      const hasDbCols = kpi.relatedColumns && kpi.relatedColumns.length > 0;
      if (hasDbCols) {
        // Has DB column refs from Excel but no clean formula — LLM can use columns
        kpi.formula = `Composite PBIX measure — use relatedColumns for SQL: ${kpi.relatedColumns.join(', ')}`;
        kpi.confidence = 'inferred';
        stats.inferred++;
        pass4partial++;
      } else {
        kpi.formula = PBIX_ONLY_FORMULA;
        kpi.pbix_only = true;
        kpi.confidence = 'pbix_only';
        kpi.relatedColumns = [];
        stats.pbixOnly++;
        pass4pbix++;
      }
    }
  }
  console.log(`  Partial (has DB cols, no formula): ${pass4partial}`);
  console.log(`  Remaining marked pbix_only: ${pass4pbix}\n`);

  // ── Finalize: Set confidence + relatedTables ──────────────────────
  console.log('Finalizing...');
  for (const kpi of kpis) {
    if (!kpi.confidence) {
      if (APPROXIMATED_IDS.has(kpi.id)) {
        kpi.confidence = 'approximated';
        stats.approximated++;
      } else {
        kpi.confidence = 'mapped';
        stats.mapped++;
      }
    }

    kpi.relatedTables = deriveRelatedTables(kpi.relatedColumns || []);

    if (!kpi.pbix_only) {
      delete kpi.pbix_only;
    }
  }

  // ── Write updated JSON ────────────────────────────────────────────
  const output = JSON.stringify(glossary, null, 2);
  fs.writeFileSync(GLOSSARY_PATH, output, 'utf-8');
  console.log(`Wrote updated glossary to ${GLOSSARY_PATH}`);

  // ── Write Excel log ───────────────────────────────────────────────
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }

  const logRows = kpis.map(kpi => ({
    KPI_ID: kpi.id,
    KPI_Name: kpi.name,
    Section: kpi.section,
    PBIX_Formula: kpi.formulaPbix || '',
    DB_Formula: kpi.formula,
    Related_Columns_DB: (kpi.relatedColumns || []).join(', '),
    Related_Tables: (kpi.relatedTables || []).join(', '),
    Status: kpi.confidence || 'mapped',
    PBIX_Only: kpi.pbix_only ? 'YES' : '',
    Discrepancy_Notes: kpi.notes || '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(logRows);
  ws['!cols'] = [
    { wch: 35 },  // KPI_ID
    { wch: 45 },  // KPI_Name
    { wch: 28 },  // Section
    { wch: 80 },  // PBIX_Formula
    { wch: 100 }, // DB_Formula
    { wch: 80 },  // Related_Columns_DB
    { wch: 50 },  // Related_Tables
    { wch: 15 },  // Status
    { wch: 10 },  // PBIX_Only
    { wch: 80 },  // Discrepancy_Notes
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'KPI Mapping Log');
  XLSX.writeFile(wb, EXCEL_PATH);
  console.log(`Wrote Excel log to ${EXCEL_PATH}`);

  // ── Summary ───────────────────────────────────────────────────────
  const total = kpis.length;
  const byConfidence = {};
  for (const kpi of kpis) {
    byConfidence[kpi.confidence] = (byConfidence[kpi.confidence] || 0) + 1;
  }
  const withRelCols = kpis.filter(k => k.relatedColumns && k.relatedColumns.length > 0).length;
  const extRemaining = kpis.filter(k => k.formula && isRawDaxFormula(k.formula)).length;

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Summary: ${total} KPIs total`);
  for (const [conf, count] of Object.entries(byConfidence).sort()) {
    console.log(`  ${conf.padEnd(15)} ${count}`);
  }
  console.log(`  with relatedColumns: ${withRelCols}`);
  console.log(`  EXTERNALMEASURE remaining: ${extRemaining}`);
  console.log(`${'='.repeat(50)}`);
}

main();
