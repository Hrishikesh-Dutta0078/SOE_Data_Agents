# Business Rules

## 1. Classification Rules

### Question Taxonomy

**A) WHAT_HAPPENED -- Facts, State, Trends**
Questions describing current pipeline status, movement, and trends. Sub-categories:
- **pipeline_level_mix**: Pipeline by region, segment, product, stage mix, source, deal count.
- **pipeline_walk**: Period-over-period changes by movement type, mature vs non-mature, forecast commit.
- **coverage_creation**: Coverage and creation vs last 4Q average, YoY, same week-in-quarter, rolling 4Q growth.
- **deal_lists**: Stalled, pushed, or lost deals with reasons; top deals by ARR with risk factors.

**B) WHY -- Diagnosis, Drivers, Signals**
Questions about root causes of gaps, weak progression, stalls, and slippage. Sub-categories:
- **gap_drivers**: What drives shortfalls by region/segment/product; creation miss vs slippage; concentration risk.
- **stall_push_risk**: At-risk deals, push reason distributions, stall reasons by stage, correlation with missing fundamentals.
- **signals**: Leading vs lagging indicators of progression opportunity (see Signal Definitions in Section 4).
- **forecast_confidence**: Week-N SS5 conversion rate vs historical; commit category stability.

**C) WHAT_TO_DO -- Fix, Actions, Next Steps**
Questions converting signals into prioritized actions. Sub-categories:
- **progression_actions**: SS3 deals to progress to SS4; missing prerequisites; salvage vs reposition vs exit.
- **creation_actions**: Accounts to prioritize for creation (whitespace, engagement, partner, propensity).
- **deal_focus**: Deals to focus on based on Deal Sensei Score and momentum.
- **remediation**: Standard interventions by stall reason (see Interventions table in Section 4).
- **outlook_views**: "Is this good or bad at Week N?" views by segment/region.

### Follow-Up Progression

The natural analytical flow is **What -> Why -> Fix**. After answering one tier, suggest the next:
- After WHAT_HAPPENED, suggest WHY: e.g., "Pipeline coverage by region?" -> "What drives the shortfall in [worst region]?"
- After WHY, suggest WHAT_TO_DO: e.g., "Why are SS3 deals at risk?" -> "What is the missing prerequisite for each?"
- After WHAT_TO_DO, suggest validation: e.g., "Which accounts to prioritize?" -> "Track creation trend after implementing these plays."

## Key Terminology

- **Pipeline**: Total value of active opportunities in stages S7, S6, S5, S4, S3. Always filter on SALES_STAGE_ID (numeric) or join vw_ebi_sales_stage for stage names.
- **S3 / S4 pipeline**: Stage-specific views with REP_NAME, Close_Qtr, BU, ROLE_COVERAGE_BU, ROLE_COVERAGE_BU_GROUP, and SUM(Oppty). Source of truth for pipeline hygiene. For CQ, add QTR_BKT_IND = 0.
- **Quota**: Sales target assigned to a rep. Always filter PAY_MEASURE_ID = 0 and exclude dummy territories.
- **Pipe Walk**: Period-over-period pipeline movement analysis.
- **Pipe Coverage**: Ratio of Pipeline to Quota. Quality thresholds defined in system configuration. When Quota is NULL or 0, Coverage_Ratio is NULL.
- **Gap**: Quota minus Pipeline: COALESCE(Quota, 0) - COALESCE(Pipe, 0).
- **Pipeline Creation (Gross Creation Coverage)**: Whether enough pipeline is being created. Compares actual gross creation against a weighted target. Thresholds and target weights defined in system configuration.
- **ROLE_COVERAGE_BU / ROLE_COVERAGE_BU_GROUP**: Business unit assignments via role coverage. Used in all quota, pipeline, coverage, and gap analyses alongside BU from vw_EBI_OPG. Sourced from vw_TD_EBI_ROLE_Coverage via ROLE_COVERAGE_ID.

## Account Hierarchy

- **Parent Account**: Top-level corporate entity (e.g., "Acme Corp").
- **Sub Account**: Accounts under a parent, segmented by MOPG1 and Country.
- **Account Sub ID**: Unique identifier for a sub-account.
- When a user says "account", clarify whether they mean sub account or parent account, unless explicitly specified.

## Scoring and Profiling

- **ICP (Ideal Customer Profile)**: Rates how well an account fits the ideal buyer profile.
- **UCP (Unified Customer Profile)**: Combines multiple signals about an account.
- **AES (Account Engagement Score)**: Measures marketing engagement level.
- **FIT_SCORE**: Numeric ICP fit score. HIGH_ICP / HIGH_UCP / HIGH_AES are boolean flags for above-threshold accounts.
- **High Propensity**: PROPENSITY_TO_BUY > 0.8. **High Intent**: PRODUCT_OF_INTEREST_STATUS = "Hot".

## Products and Solutions

- **OPG (Outlook Product Group)**: Groups products into hierarchies. Also called solution or product.
- **MOPG1 (Major Outlook Product Group)**: Top-level product grouping.
- **Solution / Solution Group**: Product solutions grouped for reporting.
- **BU (Business Unit)**: Top-level business unit.

## Sales Organization Structure

- **GLOBAL_REGION**: Top-level geo. Valid values: AMERICAS, EMEA, APAC, WW.
- **REGION / SUB_REGION**: Geographic breakdown within a global region.
- **SALES_TEAM**: Named sales team. **TERRITORY / TERR_ID**: Specific territory assignment.
- **FLM / SLM / TLM**: First / Second / Third Level Manager.
- **EMP_ROLE_TYPE**: Role type (e.g., AccountManager, BDR, SE).

## Opportunity and Deal Fields

- **SALES_STAGE**: Current stage of a deal. Stage names do NOT equal SALES_STAGE_ID; see stage mapping in system configuration.
- **PUSHED_COUNT / PUSH_COUNT**: Times a deal's close date was pushed. Deals pushed 2+ times are at significantly higher risk.
- **DS_SCORE (Deal Sensei Score)**: AI-generated deal health score. Interpretation thresholds defined in system configuration.
- **STALLED_BUT_INACTIVE**: Flag for stalled deals with no recent activity (in vw_TD_EBI_OPP).
- **NEXT_STEP / DAYS_SINCE_NEXT_STEPS_MODIFIED**: Next step text and staleness. High DSNSM correlates with stalls.

## Pipeline Walk

- **WALK_CATEGORY**: Movement type -- Added, Pulled In, Pushed Out, Lost, Progressed, Regressed, etc.
- **GROSSASV**: Dollar amount per walk movement. Sum by WALK_CATEGORY for analysis.
- **BOQ_WALK_CATEGORY / BOQ_GROSSASV**: Beginning-of-quarter walk values.
- **Mature vs Non-Mature**: Mature = SS3-SS4 at BOQ. Non-mature = SS5+ at BOQ or created in-quarter.

## Time Dimensions

- **FISCAL_YR_AND_QTR_DESC**: Format is 'YYYY-QN' (e.g., '2026-Q1'). Never use 'FY' prefix formats. Adobe fiscal year starts in December (FY26-Q1 = Dec 2025 through Feb 2026).
- **SNAPSHOT_DATE_ID**: Date key for point-in-time snapshots. Join to vw_EBI_CALDATE via SNAPSHOT_DATE_ID = DATE_KEY.
- **CALENDAR_YR / CALENDAR_YR_AND_QTR**: Standard calendar year and quarter as INT keys; use _DESC variants for display.

## Current User Context

The current user is a First Level Manager (FLM):
- "My team" / "my AEs" = Account Managers (EMP_ROLE_TYPE = 'ACCOUNT MANAGER') reporting to this FLM.
- "My pipeline" / "my quota" / "my bookings" = data for all AEs under this FLM.
- Do NOT ask clarification about who the user is or what "my team" means. Team filtering is applied automatically.

## Common Ambiguities

- "Region" can mean GLOBAL_REGION, REGION, SUB_REGION, or SALES_REGION.
- "Account" is ambiguous -- clarify sub account vs parent account unless explicitly stated.
- "Product" can mean OPG, MOPG1, Solution/Solution Group, or BU.
- "Score" can be ICP, UCP, AES, or engagement score.
- "Top accounts" needs clarification: top by what metric?
- "Trend" questions need time range and granularity.
- "Tier" = OPP_FOCUS_TIER. "Stage" = SALES_STAGE.

## 3. SQL Generation Rules

1. Apply mandatory filters for all tables in your query. Filters are defined in system configuration and auto-injected.
2. Filter stages by NAME via vw_ebi_sales_stage join, never by SALES_STAGE_ID directly. Stage names do NOT equal IDs (e.g., S4 = ID 5, S5 = ID 4).
3. For quota-vs-pipe analysis, use separate CTEs joined via FULL OUTER JOIN on TERR_ID, REP_NAME, Close_Qtr, BU, ROLE_COVERAGE_BU, ROLE_COVERAGE_BU_GROUP.
4. Use NULLIF(denominator, 0) for all ratio computations.
5. Use COUNT(DISTINCT OPP_ID) for opportunity counts (fact rows duplicate across snapshots).
6. FISCAL_YR_AND_QTR_DESC format is 'YYYY-QN' (e.g., '2026-Q1'). Never use 'FY' prefix formats.
7. Derive current quarter from discover_context CURRENT FISCAL PERIOD. Never hardcode.
8. Adobe fiscal year starts in December (FY26-Q1 = Dec 2025 through Feb 2026).
9. For "top N" queries, use SELECT TOP N ... ORDER BY metric DESC (T-SQL).
10. Always include vw_TD_EBI_ROLE_Coverage (on ROLE_COVERAGE_ID) in quota/pipeline queries.
11. For pipeline creation, use OPP_CREATE_DATE_ID with QTR_BKT_IND = 0 and close dates in QTR_BKT_IND IN (0,1,2,3,4).
12. Country queries: join on ACCOUNT_COUNTRY_ID = COUNTRY_ID in TD_EBI_COUNTRY, filter IS_ACTIVE = 1. Geographic hierarchy: GEO > SALES_REGION > MARKET_AREA > SUB_MARKET_AREA > COUNTRY.
13. When user says "by region", default to GLOBAL_REGION.
14. Pipeline amount column is Oppty (FLOAT) in vw_TF_EBI_P2S, aggregated via SUM(Oppty).
15. When joining vw_TF_EBI_P2S to vw_TF_EBI_QUOTA directly (not via CTEs), match on REGION_ID, OPG_ID, DEAL_TYPE_ID, PAY_MEASURE_ID, SEGMENT_ID, and SNAPSHOT_DATE_ID.
16. When querying quota data, always include PAY_MEASURE_ID = 0 and exclude dummy territories.
17. For pipe walk queries, group by WALK_CATEGORY and sum GROSSASV.
18. Pipeline creation uses QTR_BKT_IND from vw_EBI_CALDATE: 0 = current quarter, 1-4 = future quarters.

## Signal Definitions

**Leading Signals (Predictive):**
- Stage momentum / progression velocity: deals advancing through stages faster than average.
- Deal Sensei Score trends: high DS Score indicates higher booking likelihood (see thresholds in system configuration). Falling DS Score signals risk.
- Missing plan elements: absence of mutual close plan, IPOV, access to power, or BANT qualification.
- Repeated push counts: deals pushed 2+ times are significantly more likely to be lost.

**Lagging Signals (Trailing):**
- Coverage gap: current coverage below target vs quota (see thresholds in system configuration).
- Low SS5+ coverage: insufficient late-stage pipe to cover the quarter.
- Rolling 4Q pipeline decline: pipeline trending down over the last 4 quarters.
- High NULL ratios in key fields: missing data in critical deal fields.

## Deal Sensei Score Interpretation

DS Score combines opportunity details, text fields (Next Steps, Deal Review Notes, Forecast Notes), and factor thresholds. Score band meanings and thresholds are defined in system configuration. Use DS Score to prioritize deals for progression, flag mixed-signal deals for review, and identify high-risk deals for exit/cleanup evaluation.

## Standard Interventions by Stall Reason

| Stall Reason               | Standard Intervention                                                    |
| -------------------------- | ------------------------------------------------------------------------ |
| No mutual close plan       | Mutual close plan workshop -- define milestones, owners, dates           |
| No access to power         | Executive sponsor mapping -- identify and engage economic buyer          |
| Budget unclear             | Business case / ROI framework + funding pathway discussion               |
| Procurement/legal delay    | Early procurement engagement plan + standardized templates               |
| Competition                | Competitive displacement strategy -- differentiation, proof points       |
| Customer timing            | Reposition to next quarter with engagement plan to maintain momentum     |
| Missing BANT qualification | BANT validation session -- qualify or disqualify and cleanup             |
| Missing IPOV               | Build IPOV -- quantify pain, define outcomes, establish urgency          |

## Week-in-Quarter Benchmarks

Compare current metrics against the same week-in-quarter from prior 4 quarters. Key checkpoints:
- **Week 4**: Early-quarter health check -- is creation pace on track?
- **Week 7**: Mid-quarter pivot point -- is coverage building or eroding?
- **Week 10**: Late-quarter urgency -- what must close vs what can be pulled in?
- **Week 13**: Quarter close -- final execution cadence.
