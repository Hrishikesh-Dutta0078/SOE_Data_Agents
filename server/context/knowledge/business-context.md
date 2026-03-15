# Business Context for Sales Pipeline Reporting

This document defines the business terminology, organizational hierarchy, and common field definitions used across the EBI sales pipeline and analytics data model. Use this context to interpret user questions about pipeline, quota, accounts, products, and sales performance.

## Key Terminology

The following terms are commonly used in sales pipeline analysis and reporting:

- **Pipeline**: Total value of active opportunities where `SALES_STAGE_ID IN (2,3,4,5,6)` (S7, S6, S5, S4, S3). Always filter on `SALES_STAGE_ID` (numeric), not the `SALES_STAGE` name column.
- **S3 / S4 pipeline**: Stage-specific pipeline views (filtering on S3 only or S4 only) with REP_NAME, Close_Qtr, BU, ROLE_COVERAGE_BU, ROLE_COVERAGE_BU_GROUP, and sum(Oppty). These queries are the **source of truth for pipeline hygiene analysis**. For current quarter (CQ), apply an additional filter on close quarter (e.g. `c.QTR_BKT_IND = 0`).
- **Quota**: Sales target assigned to a rep. When querying quota data, always filter `PAY_MEASURE_ID = 0` and exclude dummy territories with `TERR_ID NOT LIKE '%_%Dummy%'`.
- **Pipe Walk**: Period-over-period analysis of how pipeline changes (i.e Sales stage progression; S1, S2, Closed - Booked, Lost, etc.)
- **Pipe Coverage (Coverage Ratio)**: Ratio of Pipeline to Quota (`Pipe / Quota`). Quality thresholds: **Green** >= 2.5, **Yellow** >= 2.0, **Red** < 2.0. When `Quota` is NULL or 0, Coverage_Ratio is NULL.
- **Gap**: Quota minus Pipeline. Computed as `coalesce(Quota, 0) - coalesce(Pipe, 0)`. Represents how much more pipeline is needed to meet quota.
- **Pipeline Creation (Gross Creation Coverage)**: Measures whether enough pipeline is being created. Compares actual gross creation pipe (filtered by `OPP_CREATE_DATE_ID` in the current quarter via `QTR_BKT_IND = 0` and close dates in `QTR_BKT_IND IN (0,1,2,3,4)`) against a weighted target. Target weights by quarter bucket: current quarter uses `IN_QTR_GC_TARGET`; future quarters use `PIPE_TARGET_SURVIVAL_RATE` multiplied by 0.4 (Q+1), 0.4 (Q+2), 0.14 (Q+3), 0.05 (Q+4). Quality thresholds same as pipe coverage: **Green** >= 2.5, **Yellow** >= 2.0, **Red** < 2.0.
- **ROLE_COVERAGE_BU / ROLE_COVERAGE_BU_GROUP**: Business unit and business unit group assigned via role coverage. Used in all quota, pipeline, coverage, and gap analyses for grouping alongside `BU` from `vw_EBI_OPG`. Sourced from `vw_TD_EBI_ROLE_Coverage` via `ROLE_COVERAGE_ID`.

## Mandatory Global Filters

These filters MUST be applied wherever the relevant tables/columns are used in a query. If a query does not use a given table/column, that filter does not apply.

- **ROLE_TYPE_DISPLAY = 'AE'** — Apply when using region/rep tables (e.g. `vw_td_ebi_region_rpt`). SQL: `r.ROLE_TYPE_DISPLAY = 'AE'`.
- **ROLE_COVERAGE_BU_GROUP = 'DMX'** — Apply when using role coverage (e.g. `vw_TD_EBI_ROLE_Coverage` or region_rpt). SQL: `rc.ROLE_COVERAGE_BU_GROUP = 'DMX'`.
- **SALES_TEAM_BU** — Restrict to: #NA, DX, DX/DME, WW. SQL: `r.SALES_TEAM_BU IN ('#NA','DX','DX/DME','WW')` (when using `vw_td_ebi_region_rpt` or equivalent).
- **PAY_MEASURE_DISPLAY = 'ASV'** — In fact tables (`vw_TF_EBI_P2S`, `vw_TF_EBI_QUOTA`) use `PAY_MEASURE_ID = 0`. Apply in every query that joins these fact tables.
- **OPG (MOPG1) exclude ADVERTISING** — When joining `vw_EBI_OPG`: `o.MOPG1 <> 'ADVERTISING'` (or `o.MOPG1 NOT IN ('ADVERTISING')`).
- **OPG (DMX_SOLUTION_GROUP) exclude PPBU** — When joining `vw_EBI_OPG`: `o.DMX_SOLUTION_GROUP <> 'PPBU'` (or `o.DMX_SOLUTION_GROUP NOT IN ('PPBU')`).
- **SALES_REGION** — Exclude rows where SALES_REGION contains 'DME'. SQL: `(r.SALES_REGION NOT LIKE '%DME%' OR r.SALES_REGION IS NULL)` when using region/rpt views.
- **REPORTING_HIERARCHY (IS_CY_RPT_HIER) = TRUE** — When the reporting hierarchy view or column is in use: `IS_CY_RPT_HIER = 1` (or equivalent TRUE). Apply where this column exists.
- **Snapshot_Week_bkt = 0** — Implement as `c.WEEK_SORT_ORDER_REVERSE = 0` in `vw_EBI_CALDATE`. Pipeline (and quota/pipe walk) join to calendar on snapshot date: e.g. `p.SNAPSHOT_DATE_ID = c.DATE_KEY`. When using pipeline or snapshot-based facts, join to `vw_EBI_CALDATE` on `SNAPSHOT_DATE_ID = DATE_KEY` and add `AND c.WEEK_SORT_ORDER_REVERSE = 0`.
- **SALES_TEAM (Exclude)** — Exclude these team names: AMER IND PS DX, AMER LATAM PS, AMER ENT PS DX, AMER PUB SEC SPECIALIST. SQL: `r.SALES_TEAM NOT IN ('AMER IND PS DX','AMER LATAM PS','AMER ENT PS DX','AMER PUB SEC SPECIALIST')` when using region/rpt.
- **GLOBAL_REGION** — When filtering by GLOBAL_REGION (e.g. in WHERE on region_rpt), restrict to these values only: `r.GLOBAL_REGION IN ('AMERICAS','EMEA','APAC','WW')`.

## Account Hierarchy

The account data model uses a multi-level hierarchy to represent customer organizations:

- **Parent Account**: Top-level corporate entity (e.g., "Acme Corp").
- **Sub Account**: Accounts under a parent, segmented by MOPG1 and Country (CNTRY).
- **Account Sub ID**: Unique identifier for a sub-account.
- **Default behavior**: When a user says "account", clarify whether they mean **sub account** (ACCOUNT_SUB_ID) or **parent account** (top-level entity), unless they explicitly specify one.

## Scoring and Profiling

Multiple scoring models are used to evaluate account fit, engagement, and buying propensity:

- **ICP (Ideal Customer Profile)**: Scoring model that rates how well an account fits the ideal buyer profile.
- **UCP (Unified Customer Profile)**: Scoring model combining multiple signals about an account.
- **AES (Account Engagement Score)**: Measures marketing engagement level of an account.
- **FIT_SCORE**: Numeric ICP fit score.
- **HIGH_ICP / HIGH_UCP / HIGH_AES**: Boolean flags (true/false) indicating accounts that score above threshold.
- **High Propensity**: An account is considered high propensity when PROPENSITY_TO_BUY > '0.8'.
- **High Intent**: An account has high intent when its PRODUCT_OF_INTEREST_STATUS value is "Hot".
- **Low Intent**: An account has low intent when its PRODUCT_OF_INTEREST_STATUS value is anything other than "Hot".

## Products and Solutions

Product and solution groupings used for opportunity categorization and reporting:

- **OPG (Outlook Product Group)**: Groups products into hierarchies. Also referred to as solution or product.
- **MOPG1 (Major Outlook Product Group)**: Top-level product grouping used in marketing and reporting.
- **Solution / Solution Group**: Product solutions grouped for reporting.
- **BU (Business Unit)**: Top-level business unit.

## Sales Organization Structure

The sales organization is structured geographically and by management hierarchy:

- **GLOBAL_REGION**: Top-level geo in `vw_td_ebi_region_rpt`. **Valid filtering candidates only:** AMERICAS, EMEA, APAC, WW. When filtering by region (e.g. `WHERE r.GLOBAL_REGION IN (...)` or "by region" queries), use only these four values.
- **REGION / SUB_REGION**: Geographic breakdown within a global region.
- **SALES_TEAM**: Named sales team.
- **TERRITORY / TERR_ID**: Specific sales territory assignment.
- **FLM**: First Level Manager.
- **SLM**: Second Level Manager.
- **TLM**: Third Level Manager.
- **EMP_ROLE_TYPE**: Role type of the employee (e.g., AccountManager, BDR, SE).

## Opportunity and Deal Fields

Key fields used to describe individual sales opportunities and their lifecycle:

- **SALES_STAGE**: Current stage of a deal. Full set: N/A, Closed - Booked, S7, S6, S5, S4, S3, S2, S1, Closed Lost from Pipe, Closed CleanUp from Pipe, Closed Lost from Non Pipe, Closed CleanUp from Non Pipe. See "Sales Stage Source of Truth" below.
- **PUSHED_COUNT / PUSH_COUNT**: Number of times a deal's close date has been pushed out. Deals pushed 2+ times are at significantly higher risk of loss. Available in `vw_TD_EBI_OPP`.
- **DS_SCORE (Deal Sensei Score)**: AI-generated deal health score combining opportunity details, text fields (Next Steps, Deal Review Notes, Forecast Notes), and factor thresholds. Interpretation: **>= 65** = materially higher booking likelihood, lower loss rates — prioritize for progression. **40-64** = mixed signals, review Top 3 risks and Next best actions. **< 40** = high risk, evaluate whether to invest effort or exit/cleanup.
- **STALLED_BUT_INACTIVE**: Flag indicating a deal is stalled with no recent activity. Available in `vw_TD_EBI_OPP`.
- **NEXT_STEP / DAYS_SINCE_NEXT_STEPS_MODIFIED**: Next step text and staleness indicator. High `DAYS_SINCE_NEXT_STEPS_MODIFIED` correlates with stalled deals.

## Sales Stage Source of Truth

**This is the canonical mapping.** All stage filters in SQL MUST derive from this table. Stage names (S4, S5, etc.) do NOT equal SALES_STAGE_ID — never assume S4 = 4 or S5 = 5.


| SALES_STAGE_ID | SALES_STAGE                  |
| -------------- | ---------------------------- |
| -1             | N/A                          |
| 1              | Closed - Booked              |
| 2              | S7                           |
| 3              | S6                           |
| 4              | S5                           |
| 5              | S4                           |
| 6              | S3                           |
| 7              | S2                           |
| 8              | S1                           |
| 9              | Closed Lost from Pipe        |
| 10             | Closed CleanUp from Pipe     |
| 11             | Closed Lost from Non Pipe    |
| 12             | Closed CleanUp from Non Pipe |


**Pipeline (active stages)** = S7, S6, S5, S4, S3 (IDs 2–6).

**SQL rule — avoid ID/name confusion**: When filtering by stage name (S3, S4, S5, etc.), ALWAYS join `vw_ebi_sales_stage` and use `s.SALES_STAGE = 'S4'` or `s.SALES_STAGE IN ('S7','S6','S5','S4','S3')`. Do NOT use `SALES_STAGE_ID` with an assumed mapping. If you must use IDs directly, look them up from this table.

## Pipeline Walk (Movement Analysis)

Pipeline walk tracks how pipeline changes period-over-period using `vw_TF_EBI_PIPE_WALK`. Key concepts:

- **WALK_CATEGORY**: Movement type classification — Added, Pulled In, Pushed Out, Lost, Progressed, Regressed, etc.
- **GROSSASV**: The dollar amount associated with each walk movement. Sum by WALK_CATEGORY for walk analysis.
- **BOQ_WALK_CATEGORY / BOQ_GROSSASV**: Beginning-of-quarter walk values for BOQ-to-current comparison.
- **Mature vs Non-Mature Pipeline**: Mature pipe = deals that were SS3-SS4 at beginning of quarter (BOQ). Non-mature = deals at SS5+ at BOQ or created in-quarter. Use BOQ stage fields and current stage to classify.
- **Walk Movement Types**: Standard categories for QBR walk analysis: **Created** (new deals), **Progressed-in** (stage advanced into current quarter view), **Pulled-in** (close date moved into current quarter), **Pushed** (close date moved out), **Lost/Cleanup** (removed from pipeline).

## Week-in-Quarter Benchmarks

When assessing pipeline health at a given point in the quarter ("Is this good or bad at Week N?"):

- Compare current metrics against the same week-in-quarter from the prior 4 quarters to determine if performance is tracking above or below typical patterns.
- Key checkpoints: **Week 4** = early-quarter health check (is creation pace on track?). **Week 7** = mid-quarter pivot point (is coverage building or eroding?). **Week 10** = late-quarter urgency (what must close vs what can be pulled in?). **Week 13** = quarter close (final execution cadence).
- Coverage at Week 7 should ideally be >= 2.0x for the quarter to be on track; below 1.5x at Week 7 is a significant red flag.

## Leading vs Lagging Signals

- **Leading signals** (predictive of future outcomes): Stage progression velocity, Deal Sensei Score trends, missing plan elements (mutual plan, IPOV, access to power), push count acceleration, days-since-next-steps-modified.
- **Lagging signals** (trailing indicators): Coverage gap vs quota, low SS5+ coverage, rolling 4Q pipeline decline, lost deal rate.

## Time Dimensions

The data model uses both fiscal and calendar time dimensions:

- **FISCAL_YR / FISCAL_YR_AND_QTR**: Adobe fiscal year and quarter as INT keys (Adobe FY starts in December). Use FISCAL_YR_DESC / FISCAL_YR_AND_QTR_DESC (VARCHAR) for display values (format 'YYYY-QN'). Always derive the correct year from the CURRENT FISCAL PERIOD provided by discover_context.
- **SNAPSHOT_DATE_ID**: Date key for point-in-time snapshots. Pipeline and quota facts join to `vw_EBI_CALDATE` via `SNAPSHOT_DATE_ID = DATE_KEY`. For the mandatory snapshot-week filter (Snapshot_Week_bkt = 0), use `vw_EBI_CALDATE.WEEK_SORT_ORDER_REVERSE = 0` (WEEK_SORT_ORDER_REVERSE is the snapshot week bucket in the calendar view).
- **CALENDAR_YR / CALENDAR_YR_AND_QTR**: Standard calendar year and quarter as INT keys. Use CALENDAR_YR_DESC / CALENDAR_YR_AND_QTR_DESC (VARCHAR) for display values.

## Current User Context

The current user is a **First Level Manager (FLM)**. This means:

- "My team" or "my AEs" = all Account Managers (EMP_ROLE_TYPE = 'ACCOUNT MANAGER') reporting to this FLM in vw_td_ebi_region_rpt (where FLM_ID matches the current user).
- "My accounts" = accounts assigned to the AEs under this FLM.
- "My pipeline" / "my quota" / "my bookings" = data for all AEs under this FLM.
- Do NOT ask clarification about who the user is, what "my team" means, or how to identify team members. The system applies team-level filtering automatically after SQL generation.
- When the user says "my reps", "my direct reports", or "my people", treat it the same as "my AEs."

## Common Ambiguities to Watch For

When interpreting user questions, be aware of the following ambiguities that may require clarification:

- "Region" can refer to GLOBAL_REGION, REGION, SUB_REGION, or SALES_REGION.
- "Account" is ambiguous — clarify whether the user means **sub accounts** (ACCOUNT_SUB_ID) or **parent accounts** (PARENT_ACCOUNT_ID / top-level entity). Always ask unless the user explicitly specifies "sub account" or "parent account".
- "Product" can refer to OPG (Outlook Product Group), MOPG1 (Major Outlook Product Group), Solution / Solution Group, or BU (Business Unit).
- "Score" can be ICP score, UCP score, AES score, or engagement score.
- Questions about "top accounts" need clarification: top by what metric? (ARR, pipeline, ICP, AES).
- "Trend" questions need a time range and granularity (weekly, monthly, quarterly).
- "Tier" refers to OPP_FOCUS_TIER (sub-account level)
- "Stage" refers to SALES_STAGE.

## KPI Abbreviations

When users or dashboard labels use these abbreviations, interpret them as follows:


| Abbreviation     | Meaning                                                          |
| ---------------- | ---------------------------------------------------------------- |
| W                | Won ($ amount closed won in quarter)                             |
| F                | Forecast (Adj Commit for reps; Adj Manager Commit for managers)  |
| UC               | Upside Committed                                                 |
| CQ / PQ / FQ     | Current Quarter / Previous Quarter / Future Quarter              |
| QTD / YTD / H1   | Quarter to Date / Year to Date / First Half (Q1+Q2)              |
| LTG              | Left to Go (quota remaining in the year)                         |
| Covx             | Coverage (pipeline or stage-specific pipeline / quota or target) |
| BOQ              | Beginning of Quarter                                             |
| DSNSM            | Days Since Next Step Modified                                    |
| SD               | Stage Duration                                                   |
| RBOB             | Renewal Base of Business (IC RBoB$ + OOC RBoB$)                  |
| GNARR            | Gross New ARR (bookings + outlook: W+F+UC)                       |
| ARRAVG           | ARR Average                                                      |
| R4Q              | Rolling 4 Quarters                                               |
| S3+ / S5+ / SS5+ | Sales Stage 3 and above / Stage 5 and above                      |
| FLM / SLM / TLM  | First / Second / Third Level Manager                             |
| AE               | Account Executive                                                |


## KPI Calculation Rules

Use these definitions when the user asks for specific KPIs or when building metrics that match dashboard/glossary semantics:

- **GNARR (Gross New ARR)**: Sum of opportunity amounts where commitment is Won, Forecast, or Upside Committed in the current quarter. **GNARR %** = (W+F+UC) / Plan (or Quota for AE/Manager). For VP view use Plan/QRF; for AE/Manager use Quota.
- **Stalled pipeline**: A deal is **stalled** when `DSNSM > 30 days` OR `(SD > 90 days AND DSNSM > 15 days)`. **STALLED %** = Total Stalled Pipeline $ / Total pipeline $ for the close quarter in scope. **Active** = Total Pipe - Stalled. Use `DAYS_SINCE_NEXT_STEPS_MODIFIED` and stage duration from opportunity or fact tables where available.
- **Participation (reps / FLM)**: **Participation rate** = Count of reps (or FLMs) with **attainment >= 75%** / Total in-place active reps (or FLMs). Attainment = (W+F+UC) / Quota for the period. **Team participation** = team counts when **>50% of reps** in the team have attainment >75%.
- **Coverage quality thresholds**: For pipe coverage and creation coverage ratios: **Green** >= 2.5, **Yellow** >= 2.0, **Red** < 2.0. Use NULL when denominator is 0.
- **S3+ / S5+ coverage**: **S3+ Covx** = Sum of pipeline $ (SALES_STAGE_ID >= 3, active stages) for the close quarter / Quota (or Bookings Target) for that quarter. **S5+ Covx** = Same with SALES_STAGE_ID >= 5 (mature pipeline). Apply for CQ+1, CQ+2, CQ+3 or rolling 4 quarters as the user specifies.
- **LTG Coverage**: **S3+ (F+U) LTG Covx** = S3+ pipeline where Adj commitment in (Forecast, Upside) / TARGET LEFT TO GO $. Similarly for S5+ (F+U) LTG Covx.
- **Gross Creation**: Pipeline qualified to **stage 3 and above** (creation = Oppty where stage in 3,4,5,6,7, closed booked, clean up, lost); filter by qualification quarter = CQ and close quarter in CQ..CQ+4. **Gross Creation %** = Gross Creation $ / Gross Creation Target (weighted by quarter bucket: IN_QTR_GC_TARGET for CQ, PIPE_TARGET_SURVIVAL_RATE * 0.4/0.4/0.14/0.05 for Q+1..Q+4).
- **Persona note**: AE and Manager views typically use **Quota** as the denominator for GNARR % and attainment; VP view uses **Plan** or **QRF** (Quarterly Revenue Forecast). When in doubt, use Quota for rep-level and Plan for org-level.

## SQL Generation Rules

Critical rules that MUST be followed when generating SQL queries:

- **Mandatory global filters**: Before writing any query, check the "Mandatory Global Filters" section. Apply every listed filter that applies to the tables/columns in your query (e.g. when using vw_TF_EBI_P2S or vw_TF_EBI_QUOTA include PAY_MEASURE; when using vw_EBI_OPG include MOPG1 and DMX_SOLUTION_GROUP exclusions; when using region/rpt include ROLE_TYPE_DISPLAY, ROLE_COVERAGE_BU_GROUP, SALES_TEAM_BU, SALES_REGION, SALES_TEAM exclusions, and when filtering by GLOBAL_REGION use only r.GLOBAL_REGION IN ('AMERICAS','EMEA','APAC','WW'); when joining pipeline/quota to vw_EBI_CALDATE on SNAPSHOT_DATE_ID include WEEK_SORT_ORDER_REVERSE = 0 for Snapshot_Week_bkt; and IS_CY_RPT_HIER where that column exists).
- When counting opportunities, always use `COUNT(DISTINCT OPP_ID)` because fact table rows can duplicate across snapshot dates.
- Always filter by the latest SNAPSHOT_DATE_ID unless the user explicitly asks for historical or trend data.
- "Pipeline" means active deals only — filter using `s.SALES_STAGE IN ('S7','S6','S5','S4','S3')` with a join to `vw_ebi_sales_stage`, or `SALES_STAGE_ID IN (2,3,4,5,6)` if you have the mapping. See Sales Stage Source of Truth.
- **Stage filters**: When filtering by stage name (S3, S4, S5, etc.), join `vw_ebi_sales_stage` and use `s.SALES_STAGE = 'S4'`. Never use `SALES_STAGE_ID = N` assuming stage name equals N — the mapping is non-intuitive (e.g. S4 = ID 5, S5 = ID 4).
- Adobe fiscal year starts in December, so FY26-Q1 = Dec 2025 through Feb 2026. Map "current quarter" to the FISCAL_YR_AND_QTR_DESC value returned by discover_context's CURRENT FISCAL PERIOD — do NOT hardcode or guess the year. **IMPORTANT**: The database format for FISCAL_YR_AND_QTR_DESC is always 'YYYY-QN' (e.g., '2024-Q2', '2026-Q1'). Never use 'FY' prefix formats like 'FY24Q2' or 'FY25-Q1' in SQL filters — always convert to the 'YYYY-QN' format. Note: FISCAL_YR_AND_QTR is INT (e.g., 20264); use the _DESC variant for string comparisons.
- For pipeline-vs-quota analyses (coverage, gap, creation), prefer building **separate CTEs** for quota and pipeline, then joining on `TERR_ID`, `REP_NAME`, `Close_Qtr`, `BU`, `ROLE_COVERAGE_BU`, and `ROLE_COVERAGE_BU_GROUP` using a `FULL OUTER JOIN` to capture reps with quota but no pipe and vice versa. Each CTE independently joins its fact table (vw_TF_EBI_QUOTA or vw_TF_EBI_P2S) to dimension tables (vw_td_ebi_region_rpt on Region_Id, vw_EBI_CALDATE on the relevant date key, vw_EBI_OPG on OPG_ID, vw_TD_EBI_ROLE_Coverage on ROLE_COVERAGE_ID).
- When joining vw_TF_EBI_P2S to vw_TF_EBI_QUOTA directly (not via CTEs), match on REGION_ID, OPG_ID, DEAL_TYPE_ID, PAY_MEASURE_ID, SEGMENT_ID, and SNAPSHOT_DATE_ID — not just REGION_ID alone.
- When querying quota data, always include `PAY_MEASURE_ID = 0` and exclude dummy territories with `TERR_ID NOT LIKE '%_%Dummy%'`.
- Use NULLIF(denominator, 0) or a CASE expression to handle division-by-zero when computing ratios like coverage.
- For "top N" queries, use `SELECT TOP N ... ORDER BY metric DESC` (T-SQL syntax).
- Always use table aliases for readability, especially in multi-table joins.
- When the user says "by region", default to GLOBAL_REGION unless they specify a finer level. When filtering by GLOBAL_REGION, use only: AMERICAS, EMEA, APAC, WW.
- When computing quota attainment, use: `ROUND(SUM(booked) * 100.0 / NULLIF(SUM(quota), 0), 2)`.
- For pipe walk queries, group by WALK_CATEGORY and sum GROSSASV.
- Pipeline creation uses `QTR_BKT_IND` from `vw_EBI_CALDATE` to bucket quarters: 0 = current quarter, 1-4 = future quarters. Filter by `QTR_BKT_IND IN (0,1,2,3,4)` for multi-quarter creation targets.
- The opportunity amount column is `Oppty` (aliased `OPPTY`, FLOAT) in `vw_TF_EBI_P2S`, aggregated via `SUM(Oppty)` for pipeline totals.
- Always include `vw_TD_EBI_ROLE_Coverage` (joined on `ROLE_COVERAGE_ID`) in quota and pipeline queries to group by `ROLE_COVERAGE_BU` and `ROLE_COVERAGE_BU_GROUP`.

