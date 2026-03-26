# RTB OCC Power BI — Business Context for Text-to-SQL

> Extracted from RTB_OCC_Converse 2.pbix. Database: TAP_PROD (SQL Server).
> This file provides the complete business context layer: table mappings, KPI formulas,
> calculated column logic, default filters, RLS rules, and report page structure.
> Use alongside schema-knowledge.json, join-knowledge.json, and business-rules.md.

---

## 1. PBI Table to Database View Mapping

### 1.1 Fact Tables

| PBI Table | DB View | Notes |
|---|---|---|
| Pipeline | vw_TF_EBI_P2S | Incremental refresh on SNAPSHOT_DATE; PS_ALIGNED renamed PS_ADJ_COMMITMENT |
| Plan & QRF | vw_TF_EBI_PLAN_RPT | |
| Quota | vw_TF_EBI_QUOTA | |
| Retention | vw_TF_EBI_Retention | |
| Pipe Walk | vw_TF_EBI_PIPE_WALK | |
| Account ARR | *(published dataset)* | FK: ACCOUNT_ID, OPG_ID, SEGMENT_ID, REGION_ID, CLOSE_YR_AND_QTR |
| Enablement | vw_EBI_EMP_ENABLEMENT | |
| Pacing Targets | vw_EBI_PACING_TARGET | |
| App Inputs | vw_EBI_SELLER_APP_INPUTS | M:M join to Region Hierarchy via EMP_ID→REP_ID |
| Renewals Target | vw_TF_EBI_RENEWALS_TARGET | |
| Generation Target Multipliers | TF_EBI_GENERATION_TARGET | Physical table, not view |
| TM1 Bookings | *(published dataset)* | |
| SBR Activities | *(published dataset)* | 1:1 with SBR Metadata |
| TPT | *(published dataset)* | |
| Account Activities | *(published dataset)* | |
| Lead | *(published dataset)* | |
| Product Consumption | *(published dataset)* | |
| Customer Health Movement | *(published dataset)* | |
| Customer Solution Health Movement | *(published dataset)* | |
| Performance Historic | *(published dataset)* | |
| DRF Pillars | *(published dataset)* | |

### 1.2 Dimension Tables

| PBI Table | DB View | Key Renames |
|---|---|---|
| Account | vw_TD_EBI_ACCOUNT | AES_SCORE→ACCOUNT_ENGAGEMENT_STAGE |
| Region Hierarchy | vw_TD_EBI_REGION_RPT_MASKED | SALES_TEAM_ALIAS→SALES_LEADER_2, TO_SHOW_IN_RTB→Reps_with_Quota_OR_Plan |
| Reporting Hierarchy | VW_TD_EBI_REPORTING_HIERARCHY | |
| Opportunity | vw_TD_EBI_OPP | 21 renames (AUTHORITY→POWER, BUDGET→CUSTOMER_CHALLENGE, BUSINESS_ISSUE→CUSTOMER_GOALS_INITIATIVES, etc.) |
| OPG | vw_EBI_OPG | OPG_KEY→OPG_ID, PRODUCT_STG→OPG, SOLUTION_GRP→SOLUTION_GROUP; PMBU removed |
| Segment | vw_EBI_SEGMENT | ID→SEGMENT_ID, SEGMENT_GROUP_DISPLAY→SEGMENT_GROUP |
| Sales Stage | vw_EBI_SALES_STAGE | SalesStageDisplay→SALES_STAGE_DISPLAY, SalesStageGrp→SALES_STAGE_GROUP |
| Deal Type | vw_EBI_DEAL_TYPE | ID→DEAL_TYPE_ID, CROSS_UPSELL_DISPLAY→DEAL_TYPE |
| Creator Type | vw_EBI_CREATOR_TYPE | ID→CREATOR_TYPE_ID, GRP_CREATOR_ALL→CREATOR_GROUP |
| Consulting Segment | vw_EBI_CONSULTING_SEGMENT | |
| Revenue Type | vw_EBI_REVENUE_TYPE | |
| Pay Measure | vw_EBI_PAY_MEASURE | Selects only ID, PAY_MEASURE_DISPLAY |
| Focus Vertical | vw_EBI_FOCUS_VERTICAL | |
| Sales Motion | vw_TD_EBI_SALES_MOTION | |
| GTM Motion | vw_EBI_GTM_MOTION | |
| Opp Driver | vw_EBI_OPP_DRIVER | |
| Target Type | vw_TD_EBI_TARGET_TYPE | |
| Commit Type | vw_EBI_COMMIT_ROLE_MAPPING | |
| Enablement Category | vw_EBI_ENABLEMENT_CATEGORY | |
| Partner Created | vw_EBI_PARTNER_CREATED | |
| Emp Ldap Geo Title | vw_TD_EBI_EMP_LDAP_NAME | TITLE→EMP_TITLE |
| Commit Type RLS | vw_TD_EBI_RLS_BY_COMMIT_ROLE_TYPE | |
| Retention MetaData | vw_TD_EBI_Retention_MetaData | LINKED_OPPORTUNITIES→LINKED DRID |
| vw_EBI_PROJECTION_CLOSE_RATIO | vw_EBI_PROJECTION_CLOSE_RATIO | |
| vw_TF_EBI_P2S_LATEST_ATTRIBUTE | vw_TF_EBI_P2S_LATEST_ATTRIBUTE | 1:1 with Pipeline on P2S_ID |
| vw_TD_EBI_REP_ACCESS_RLS | vw_TD_EBI_REP_ACCESS_RLS | Source for all RLS/overlay tables |

### 1.3 Calendar Tables (all from vw_EBI_Caldate)

All are renamed copies of the base calendar. Column prefix indicates role.

| PBI Table | Role | Prefix | Key |
|---|---|---|---|
| FY Calendar | Base | FISCAL_ | DATE_KEY |
| Close Quarter | Opp close dates | CLOSE_ | DATE_KEY |
| Snapshot Quarter | Snapshot dates | SNAPSHOT_ | DATE_KEY |
| Qualification Quarter | Opp create dates | QUALIFICATION_ | DATE_KEY |
| Renewal Quarter | Retention renewal | RENEWAL_ | DATE_KEY |
| Create Quarter | Original opp create | CREATE_ | DATE_KEY |
| Closure Quarter | Derived closure | CLOSURE_ | DATE_KEY |
| Delivery Quarter | Activity delivery | DELIVERY_ | DATE_KEY |
| Close Quarter JOIN | Quarter-level | CLOSE_ | CLOSE_YR_AND_QTR (deduplicated) |
| Snapshot Month Join | Month-level | — | YR_MONTH_KEY |

---

## 2. Report Pages, KPIs, and Default Filters

Each page represents a business domain. The filters listed are the default business context.

### 2.0 Global Default Filters (applied across all pages)

These filters define the "normal" view when a user asks a question without specifying context:

1. **ROLE_TYPE_DISPLAY = 'AE'** — default persona is Account Executive
2. **IS_LATEST_SNAPSHOT = TRUE** — always use the most recent data snapshot
3. **PAY_MEASURE_DISPLAY = 'ASV'** — default pay measure is ASV (Annual Subscription Value)
4. **IS_CY_RPT_HIER = TRUE** — current year reporting hierarchy only
5. **AT_EMP_STATUS = 'Active'** — only active employees
6. **REP_IN_PLACE = 1** — only reps currently in place
7. **CLOSE_QTR_BKT = 1** — current quarter by default
8. **Frequency = 'Daily'** — daily snapshot frequency
9. **TARGET_TYPE = target type filter** — standard target type

### 2.1 ARR Page

**KPIs:** ARR $, BOQ ARR $, EOQ ARR $
**Slicers:** Close Quarter, Role Type, Pay Measure
**Business question:** "What is the current/starting/ending ARR for the quarter?"

### 2.2 Retention Page

**KPIs:** RBOB (Renewals Base of Business), ARR IMPACT
**Slicers:** Close Quarter, Snapshot Week, Daily/Weekly, Role Type
**Business question:** "What is the retention outlook? How much ARR is at risk?"

### 2.3 Pipeline Page

**KPIs:** PIPE $, S3 $, S4 $, SS5+ $ (by stage)
**Variants:** Latest Pipeline, Pipeline Snapshots (weekly trend), BOQ Pipeline, EOQ Pipeline
**Slicers:** Close Quarter Bucket, Snapshot Week, Daily/Weekly, Pay Measure, Role Type
**Key filters:** IS_BOQ=TRUE for BOQ view, IS_EOQ=TRUE for EOQ view
**Business question:** "What does pipeline look like? How has it changed week over week?"

### 2.4 Sales Performance by Rep

**KPIs:** BOOKINGS TARGET, W+F+UC $, W+F+UC %
**Group by:** REP_NAME
**Key filters:** IS_TRUE_REP=1, IS_CYQUOTA_AVAILABLE, AT_EMP_STATUS=Active
**Business question:** "How are individual reps performing against target?"

### 2.5 Sales Performance by FLM

**KPIs:** BOOKINGS TARGET, W+F+UC $, W+F+UC %
**Group by:** FLM (First Level Manager)
**Key filters:** IS_TRUE_FLM=1
**Business question:** "How are FLM teams performing?"

### 2.6 Rep Participation

**KPIs:** MANAGER FORECAST CQ %, CY PROJECTION %, PERFORMANCE YTD %, BOOKINGS TARGET YTD, COVERAGE PIPE / TARGET LEFT TO GO X
**Group by:** REP_NAME
**Business question:** "Which reps are on track/behind for the year?"

### 2.7 Deal Intelligence

**Fields:** DEAL_REG_ID, OPPTY $, SALES_STAGE, CLOSE_DATE, SNAPSHOT_DATE, REP_NAME
**Business question:** "Show me specific deal details for review."

### 2.8 Customer Health

**KPIs:** ARR $, RBOB, PIPE $ by CUSTOMER_HEALTH and CUSTOMER_SOLUTION_HEALTH
**Slicers:** Health status, Solution, OPG
**Business question:** "What is the health distribution of our customer base?"

### 2.9 Customer Health Movement

**KPIs:** Count by HEALTH_MOVEMENT (Improved/Declined/Stable) and HEALTH_MOVEMENT_TYPE
**Filters:** HAVE_ACTIVE_PQ_EOQ_ARR, YR_MONTH_KEY, BU
**Business question:** "How is customer health trending? How many accounts improved vs declined?"

---

## 3. KPI Measures — DAX Formulas with DB Annotations

Each measure shows the DAX formula with inline `/* DB: view.column */` annotations.
Measures reference other measures by `[Name]` — follow the chain to build the SQL equivalent.

### 3.1. _Account ARR Measures (5 measures) — DB: measure-only

#### ARR $

```dax
SUM('Account ARR'[ARR] /* DB: dataset_table.ARR */)
```

#### BOQ ARR $

```dax
VAR BOQ_ARR_Q0 = CALCULATE(SUM('Account ARR'[BOQ_ARR] /* DB: dataset_table.BOQ_ARR */), 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)
VAR WFUC_Impact_Q0 = CALCULATE([W+F+UC $] + [ARR IMPACT], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)
VAR WFUC_Impact_Q1 = CALCULATE([W+F+UC $] + [ARR IMPACT], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1)

-- Scenario A: When Bucket 1 is selected (immediate quarter)
VAR Result1 =
    IF(
        CONTAINS(VALUES('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */), 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */, 1),
        BOQ_ARR_Q0 + WFUC_Impact_Q0
    )

-- Scenario B: When Bucket 2 is selected (future quarters)
VAR Result2 =
    IF(
        CONTAINS(VALUES('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */), 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */, 2),
        BOQ_ARR_Q0 + WFUC_Impact_Q0 + WFUC_Impact_Q1
    )

VAR FinalResult = Result1 + Result2

RETURN
IF(FinalResult = BLANK(),SUM('Account ARR'[BOQ_ARR] /* DB: dataset_table.BOQ_ARR */),FinalResult)
```

#### BOQ ARR $ Default

```dax
IF(
    ISBLANK(SELECTEDVALUE('Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */)) ||
    ISBLANK(SELECTEDVALUE('Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */)) ||
    ISBLANK(SELECTEDVALUE('Pay Measure'[PAY_MEASURE_DISPLAY] /* DB: vw_EBI_PAY_MEASURE.PAY_MEASURE_DISPLAY */)) ||
    ISBLANK(SELECTEDVALUE('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)) ||
    ISBLANK(SELECTEDVALUE('Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */)) ||
    ISBLANK(SELECTEDVALUE('Daily Weekly Switch'[Frequency])) 
    ,
    CALCULATE([BOQ ARR $],
    'Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */ = "AE",
    FILTER('Snapshot Quarter','Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */= TRUE()),
    'Pay Measure'[PAY_MEASURE_DISPLAY] /* DB: vw_EBI_PAY_MEASURE.PAY_MEASURE_DISPLAY */ = "ASV",
    --'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=0 ,
    FILTER('Reporting Hierarchy','Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE()),
    'Daily Weekly Switch'[Frequency]="Daily"
    )
)
```

#### EOQ ARR $

```dax
VAR BOQ_ARR_Q0 = 
    CALCULATE(
        SUM('Account ARR'[BOQ_ARR] /* DB: dataset_table.BOQ_ARR */),
        ALL('Close Quarter'),
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
    )

VAR Impact_Q0 = 
    CALCULATE(
        [W+F+UC $] + [ARR IMPACT],
        ALL('Close Quarter'),
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
    )

VAR Impact_Q1 = 
    CALCULATE(
        [W+F+UC $] + [ARR IMPACT],
        ALL('Close Quarter'),
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1
    )

VAR Impact_Q2 = 
    CALCULATE(
        [W+F+UC $] + [ARR IMPACT],
        ALL('Close Quarter'),
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 2
    )

VAR SelectedBuckets = VALUES('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)

VAR Include0 = CONTAINS(SelectedBuckets, 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */, 0)
VAR Include1 = CONTAINS(SelectedBuckets, 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */, 1)
VAR Include2 = CONTAINS(SelectedBuckets, 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */, 2)

VAR Result0 = IF(Include0, BOQ_ARR_Q0 + Impact_Q0, 0)
VAR Result1 = IF(Include1, Impact_Q0 + Impact_Q1 + BOQ_ARR_Q0, 0)
VAR Result2 = IF(Include2, Impact_Q0 + Impact_Q1 + Impact_Q2 + BOQ_ARR_Q0, 0)

VAR FinalResult = Result0 + Result1 + Result2


RETURN
IF(
        FinalResult = 0 || ISBLANK(FinalResult),
        SUM('Account ARR'[EOQ_ARR] /* DB: dataset_table.EOQ_ARR */),
        FinalResult
)
```

#### EOQ ARR $ Default

```dax
IF(
    ISBLANK(SELECTEDVALUE('Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */)) ||
    ISBLANK(SELECTEDVALUE('Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */)) ||
    ISBLANK(SELECTEDVALUE('Pay Measure'[PAY_MEASURE_DISPLAY] /* DB: vw_EBI_PAY_MEASURE.PAY_MEASURE_DISPLAY */)) ||
    ISBLANK(SELECTEDVALUE('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)) ||
    ISBLANK(SELECTEDVALUE('Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */)) ||
    ISBLANK(SELECTEDVALUE('Daily Weekly Switch'[Frequency])) 
    ,
    CALCULATE([EOQ ARR $],
    'Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */ = "AE",
    FILTER('Snapshot Quarter','Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */= TRUE()),
    'Pay Measure'[PAY_MEASURE_DISPLAY] /* DB: vw_EBI_PAY_MEASURE.PAY_MEASURE_DISPLAY */ = "ASV",
    --'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=0 ,
    FILTER('Reporting Hierarchy','Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE()),
    'Daily Weekly Switch'[Frequency]="Daily"
    )
)
```

### 3.2. _Account Activity Measures (2 measures) — DB: measure-only

#### ACCOUNT ACTIVITY #

```dax
DISTINCTCOUNT('Account Activities'[ACTIVITY_METDATA_ID] /* DB: dataset_table.ACTIVITY_METDATA_ID */)
```

#### ACCOUNT ACTIVITY DOCUMENT #

```dax
DISTINCTCOUNT('Account Activities'[ACTIVITY_DOC_ID] /* DB: dataset_table.ACTIVITY_DOC_ID */)
```

### 3.3. _Coverage Measures (11 measures) — DB: measure-only

#### COV X %

```dax
VAR COVXPCT = CALCULATE(
        DIVIDE(
        [UPSIDE FORECAST PIPE $],
        [BOOKINGS TARGET]
    ),
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ IN {"S3","S4","S5+"}
)
// VAR Result = IF(
//     [BOOKINGS TARGET] = 0,
//     0,
//     if(
//         COVXPCT < 0.01,
//         0,
//         COVXPCT
//     )
// )
RETURN COVXPCT
```

#### COVERAGE BOQ MATURE PIPE / BOOKINGS TARGET X

```dax
VAR PipebyQuota = DIVIDE(
    [BOQ MATURE PIPE $],
    [BOOKINGS TARGET],
    0
)
// VAR Result = IF(
//     PipebyQuota < 0,
//     0,
//     PipebyQuota
// )
RETURN PipebyQuota
```

#### COVERAGE BOQ MATURE PIPE / PIPE TARGET X

```dax
DIVIDE([BOQ MATURE PIPE $],[PIPE TARGET SS5])
```

#### COVERAGE BOQ PIPE / BOOKINGS TARGET X

```dax
VAR PipeByQuota = DIVIDE(
    [BOQ PIPE $],
    [BOOKINGS TARGET],
    0
)
// VAR Result = IF(
//     PipebyQuota < 0,
//     BLANK(),
//     PipebyQuota
// )
RETURN PipeByQuota
```

#### COVERAGE BOQ PIPE / PIPE TARGET X

```dax
DIVIDE([BOQ PIPE $],[PIPE TARGET],0)
```

#### COVERAGE MATURE PIPE / BOOKINGS TARGET X

```dax
VAR PipebyBookings = DIVIDE(
    [SS5+ $],
    [BOOKINGS TARGET]
)

// VAR Result = IF(
//     ISBLANK(PipebyBookings),
//     0,
//     IF(
//         PipebyBookings < 0,
//         0,
//         PipebyBookings
//     )
// )

RETURN PipebyBookings
```

#### COVERAGE MATURE PIPE / PIPE TARGET X

```dax
DIVIDE(
    [SS5+ $],
    [PIPE TARGET SS5]
)
```

#### COVERAGE PIPE / BOOKINGS TARGET X

```dax
DIVIDE(
    [PIPE $],
    [BOOKINGS TARGET]
)
```

#### COVERAGE PIPE / PIPE TARGET X

```dax
DIVIDE(
    [PIPE $],
    [PIPE TARGET]
)
```

#### COVERAGE PIPE / TARGET LEFT TO GO X

```dax
VAR PipebyTarget = DIVIDE(
    [PIPE $],
    [TARGET LEFT TO GO $],
    0
)
// VAR Result = IF(
//     [TARGET LEFT TO GO $] <= 0,
//     BLANK(),
//     PipebyTarget
// )
RETURN PipebyTarget
```

#### COVERAGE PIPE TARGET / BOOKINGS TARGET X

```dax
DIVIDE(
    [PIPE TARGET],
    [BOOKINGS TARGET],
    0
)
```

### 3.4. _Enablement Measures (4 measures) — DB: measure-only

#### CREDIT COMPLETED

```dax
SUM( Enablement[CREDIT_COMPLETED] )
```

#### CURRENT ROLE TENURE GAP

```dax
VAR CurrentWeek = CALCULATE(
     MIN( 'Snapshot Quarter'[SNAPSHOT_YR_QTR_WEEK] /* DB: vw_EBI_Caldate.SNAPSHOT_YR_QTR_WEEK */ ),
     'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
)

VAR UserSelectedWeek = SELECTEDVALUE(
    'Snapshot Quarter'[SNAPSHOT_YR_QTR_WEEK] /* DB: vw_EBI_Caldate.SNAPSHOT_YR_QTR_WEEK */,
    CurrentWeek
)

VAR SelectedDate = CALCULATE(
    MAX( 'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ ),
    'Snapshot Quarter'[SNAPSHOT_YR_QTR_WEEK] /* DB: vw_EBI_Caldate.SNAPSHOT_YR_QTR_WEEK */ = UserSelectedWeek
)

VAR CurrentRoleDate = SELECTEDVALUE( 'Region Hierarchy'[CURR_ROLE_START_DATE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.CURR_ROLE_START_DATE */ )

VAR MonthDiff = DATEDIFF( CurrentRoleDate, SelectedDate, MONTH )

VAR Result = SWITCH(
    TRUE(),
    MonthDiff <= 0, 0,
    MonthDiff > 0 && MonthDiff <=1, 1,
    MonthDiff
)

RETURN Result
```

#### TENURE GAP

```dax
VAR CurrentWeek = CALCULATE(
     MIN( 'Snapshot Quarter'[SNAPSHOT_YR_QTR_WEEK] /* DB: vw_EBI_Caldate.SNAPSHOT_YR_QTR_WEEK */ ),
     'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
)

VAR UserSelectedWeek = SELECTEDVALUE(
    'Snapshot Quarter'[SNAPSHOT_YR_QTR_WEEK] /* DB: vw_EBI_Caldate.SNAPSHOT_YR_QTR_WEEK */,
    CurrentWeek
)

VAR SelectedDate = CALCULATE(
    MAX( 'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ ),
    'Snapshot Quarter'[SNAPSHOT_YR_QTR_WEEK] /* DB: vw_EBI_Caldate.SNAPSHOT_YR_QTR_WEEK */ = UserSelectedWeek
)

VAR HireDate = SELECTEDVALUE( 'Region Hierarchy'[EMP_HIRE_DATE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.EMP_HIRE_DATE */ )

VAR MonthDiff = DATEDIFF( HireDate, SelectedDate, MONTH )

VAR Result = SWITCH(
    TRUE(),
    MonthDiff <= 0, 0,
    MonthDiff > 0 && MonthDiff <=1, 1,
    MonthDiff
)

RETURN Result
```

#### TOTAL CREDIT TARGET

```dax
SUM( Enablement[TOTAL_CREDIT_TARGET] )
```

### 3.5. _Generation Target Measures (34 measures) — DB: measure-only

#### GROSS CREATION QTD TREND

```dax
VAR SelectedQualQtr =
    SELECTEDVALUE ( 'Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */ )
VAR CurrentQtr =
    IF (
        ISBLANK ( SelectedQualQtr ),
        CALCULATE (
            MIN ( 'Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */ ),
            'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = 0
        ),
        SelectedQualQtr
    )
VAR MAXWEEKNUMBER =
    CALCULATE (
        MAX ( 'Qualification Quarter'[WEEK_NUMBER_SORT] /* DB: vw_EBI_Caldate.WEEK_NUMBER_SORT */ ),
        'Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */ = CurrentQtr,
        ALL ( 'Qualification Quarter' )
    )
VAR Qt = [FULL QUARTER GROSS CREATION] --/MAXWEEKNUMBER
VAR CurrentWeek =
    SELECTEDVALUE ( 'Qualification Quarter'[WEEK_NUMBER_SORT] /* DB: vw_EBI_Caldate.WEEK_NUMBER_SORT */ )
VAR Result =
    IF (
        CurrentQtr = "Q1",
        SWITCH (
            TRUE (),
            CurrentWeek <= 6,
                ( Qt * 0.1 * CurrentWeek ) / 6,
            CurrentWeek > 6,
                ( Qt * 0.1 ) + ( Qt * 0.9 * ( CurrentWeek - 6 ) ) / 7
        ),
        ( Qt * CurrentWeek ) / MAXWEEKNUMBER
    )
RETURN
    Result
```

#### NET CREATION QTD TREND

```dax
VAR SelectedQualQtr =
    SELECTEDVALUE ( 'Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */ )
VAR CurrentQtr =
    IF (
        ISBLANK ( SelectedQualQtr ),
        CALCULATE (
            MIN ( 'Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */ ),
            'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = 0
        ),
        SelectedQualQtr
    )
VAR MAXWEEKNUMBER =
    CALCULATE (
        MAX ( 'Qualification Quarter'[WEEK_NUMBER_SORT] /* DB: vw_EBI_Caldate.WEEK_NUMBER_SORT */ ),
        'Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */ = CurrentQtr,
        ALL ( 'Qualification Quarter' )
    )
VAR Qt = [FULL QUARTER NET PIPE CREATION]
VAR CurrentWeek =
    SELECTEDVALUE ( 'Qualification Quarter'[WEEK_NUMBER_SORT] /* DB: vw_EBI_Caldate.WEEK_NUMBER_SORT */ )
VAR Result =
    IF (
        CurrentQtr = "Q1",
        SWITCH (
            TRUE (),
            CurrentWeek <= 6,
                ( Qt * 0.1 * CurrentWeek ) / 6,
            CurrentWeek > 6,
                ( Qt * 0.1 ) + ( Qt * 0.9 * ( CurrentWeek - 6 ) ) / 7
        ),
        ( Qt * CurrentWeek ) / MAXWEEKNUMBER
    )
RETURN
    Result
```

#### RECON LAST DATE

```dax
VAR MaxWeekGeneric = CALCULATE(
    MAX( 'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ ),
    ALL( 'Snapshot Quarter' ),
    'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)

VAR SelectedDate = SELECTEDVALUE( 'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */,
                CALCULATE( MIN( 'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ ),
                ALL( 'Snapshot Quarter' ),
                'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
            )
        )

VAR SelectedWeekBySelectedDate = CALCULATE(
        MAX( 'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ ),
        ALL( 'Snapshot Quarter' ),
        'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ = SelectedDate
    )

VAR CurrentQTRBkt = CALCULATE(
        MIN( 'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ ),
        ALL( 'Snapshot Quarter' ),
        'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ = SelectedDate
    )

VAR Result = IF(
    CurrentQTRBkt = 1,
    MaxWeekGeneric,
    SelectedWeekBySelectedDate
)

RETURN Result
```

#### RECON LAST WEEK

```dax
VAR MaxWeekGeneric = CALCULATE(
    MAX( 'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER_SORT] /* DB: vw_EBI_Caldate.SNAPSHOT_WEEK_NUMBER_SORT */ ),
    ALL( 'Snapshot Quarter' ),
    'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)

VAR SelectedDate = SELECTEDVALUE( 'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */,
                CALCULATE( MIN( 'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ ),
                ALL( 'Snapshot Quarter' ),
                'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
            )
        )

VAR SelectedWeekBySelectedDate = CALCULATE(
        MAX( 'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER_SORT] /* DB: vw_EBI_Caldate.SNAPSHOT_WEEK_NUMBER_SORT */ ),
        ALL( 'Snapshot Quarter' ),
        'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ = SelectedDate
    )

VAR CurrentQTRBkt = CALCULATE(
        MIN( 'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ ),
        ALL( 'Snapshot Quarter' ),
        'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ = SelectedDate
    )

VAR Result = IF(
    CurrentQTRBkt = 1,
    MaxWeekGeneric,
    SelectedWeekBySelectedDate
)

RETURN Result
```

**Gross Creation Measures:**

#### FULL QUARTER GROSS CREATION

```dax
VAR MultiplierCQ1 =
    LOOKUPVALUE(
        'Generation Target Multipliers'[GROSS_CREATION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.GROSS_CREATION_MULTIPLIER */,
        'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */, "CQ+1"
    )
VAR MultiplierCQ2 =
    LOOKUPVALUE(
        'Generation Target Multipliers'[GROSS_CREATION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.GROSS_CREATION_MULTIPLIER */,
        'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */, "CQ+2"
    )
VAR MultiplierCQ3 =
    LOOKUPVALUE(
        'Generation Target Multipliers'[GROSS_CREATION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.GROSS_CREATION_MULTIPLIER */,
        'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */, "CQ+3"
    )
VAR MultiplierCQ4 =
    LOOKUPVALUE(
        'Generation Target Multipliers'[GROSS_CREATION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.GROSS_CREATION_MULTIPLIER */,
        'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */, "CQ+4"
    )

VAR IsFiltered1 = ISFILTERED('Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */)
VAR SelectedQtrs = VALUES('Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */)
VAR QtrCount = IF(IsFiltered1, COUNTROWS(SelectedQtrs), 0)

RETURN 
IF(
    QtrCount >= 1,

    //-- When one or more quarters selected
    SUMX(
        SelectedQtrs,
        VAR CurrentQtr = 'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */
        VAR BaseQtr =
            LOOKUPVALUE(
                'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */,
                'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */, CurrentQtr
            )
        VAR GenerationCQ =
            CALCULATE(
                [IN QTR GC TARGET],
                'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = BaseQtr
            )
        VAR GenerationCQ1 =
            CALCULATE(
                [GENERATION TARGET] * MultiplierCQ1,
                'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = BaseQtr + 1
            )
        VAR GenerationCQ2 =
            CALCULATE(
                [GENERATION TARGET] * MultiplierCQ2,
                'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = BaseQtr + 2
            )
        VAR GenerationCQ3 =
            CALCULATE(
                [GENERATION TARGET] * MultiplierCQ3,
                'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = BaseQtr + 3
            )
        VAR GenerationCQ4 =
            CALCULATE(
                [GENERATION TARGET] * MultiplierCQ4,
                'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = BaseQtr + 4
            )
        RETURN
            GenerationCQ + GenerationCQ1 + GenerationCQ2 + GenerationCQ3 + GenerationCQ4
    ),

    //-- When no quarter is selected (QtrCount = 0)
 IF(
    QtrCount = 0,   
        CALCULATE(
        
        VAR BaseQtr = 0
        
        VAR GenerationCQ =
            CALCULATE(
                [IN QTR GC TARGET],
                'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = BaseQtr
            )
        VAR GenerationCQ1 =
            CALCULATE(
                [GENERATION TARGET] * MultiplierCQ1,
                'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = BaseQtr + 1
            )
        VAR GenerationCQ2 =
            CALCULATE(
                [GENERATION TARGET] * MultiplierCQ2,
                'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = BaseQtr + 2
            )
        VAR GenerationCQ3 =
            CALCULATE(
                [GENERATION TARGET] * MultiplierCQ3,
                'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = BaseQtr + 3
            )
        VAR GenerationCQ4 =
            CALCULATE(
                [GENERATION TARGET] * MultiplierCQ4,
                'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = BaseQtr + 4
            )
        RETURN
            GenerationCQ + GenerationCQ1 + GenerationCQ2 + GenerationCQ3 + GenerationCQ4,

        FILTER(
            ALL('Qualification Quarter'),
            'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = 0
        )
    )

)
)
```

#### FULL QUARTER GROSS CREATION Q1

```dax
VAR MultiplierCQ1 = LOOKUPVALUE(
    'Generation Target Multipliers'[GROSS_CREATION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.GROSS_CREATION_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+1"
)

VAR MultiplierCQ2 = LOOKUPVALUE(
    'Generation Target Multipliers'[GROSS_CREATION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.GROSS_CREATION_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+2"
)

VAR MultiplierCQ3 = LOOKUPVALUE(
    'Generation Target Multipliers'[GROSS_CREATION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.GROSS_CREATION_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+3"
)

VAR MultiplierCQ4 = LOOKUPVALUE(
    'Generation Target Multipliers'[GROSS_CREATION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.GROSS_CREATION_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+4"
)

VAR CurrentYear = SELECTEDVALUE(
    'Qualification Quarter'[QUALIFICATION_YR] /* DB: vw_EBI_Caldate.QUALIFICATION_YR */,
    CALCULATE(
        MIN( 'Qualification Quarter'[QUALIFICATION_YR] /* DB: vw_EBI_Caldate.QUALIFICATION_YR */ ),
        'Qualification Quarter'[QUALIFICATION_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.QUALIFICATION_YR_BKT_NUMBER */ = 0
    )
)

VAR SelectedFQTRBKT = CALCULATE(
    MIN(
        'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */
    ),
    'Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */ = "Q1",
    'Qualification Quarter'[QUALIFICATION_YR] /* DB: vw_EBI_Caldate.QUALIFICATION_YR */ = CurrentYear
)

VAR GenerationCQ = CALCULATE(
    [IN QTR GC TARGET],
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT
) 

VAR GenerationCQ1 = CALCULATE(
    [GENERATION TARGET] * MultiplierCQ1,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 1
) 

VAR GenerationCQ2 = CALCULATE(
    [GENERATION TARGET] * MultiplierCQ2,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 2
) 

VAR GenerationCQ3 = CALCULATE(
    [GENERATION TARGET] * MultiplierCQ3,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 3
)

VAR GenerationCQ4 = CALCULATE(
    [GENERATION TARGET] * MultiplierCQ4,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 4
) 

VAR Result = GenerationCQ + GenerationCQ1 + GenerationCQ2 + GenerationCQ3 + GenerationCQ4

RETURN Result
```

#### FULL QUARTER GROSS CREATION Q2

```dax
VAR MultiplierCQ1 = LOOKUPVALUE(
    'Generation Target Multipliers'[GROSS_CREATION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.GROSS_CREATION_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+1"
)

VAR MultiplierCQ2 = LOOKUPVALUE(
    'Generation Target Multipliers'[GROSS_CREATION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.GROSS_CREATION_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+2"
)

VAR MultiplierCQ3 = LOOKUPVALUE(
    'Generation Target Multipliers'[GROSS_CREATION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.GROSS_CREATION_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+3"
)

VAR MultiplierCQ4 = LOOKUPVALUE(
    'Generation Target Multipliers'[GROSS_CREATION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.GROSS_CREATION_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+4"
)

VAR CurrentYear = SELECTEDVALUE(
    'Qualification Quarter'[QUALIFICATION_YR] /* DB: vw_EBI_Caldate.QUALIFICATION_YR */,
    CALCULATE(
        MIN( 'Qualification Quarter'[QUALIFICATION_YR] /* DB: vw_EBI_Caldate.QUALIFICATION_YR */ ),
        'Qualification Quarter'[QUALIFICATION_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.QUALIFICATION_YR_BKT_NUMBER */ = 0
    )
)


VAR SelectedFQTRBKT = CALCULATE(
    MIN(
        'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */
    ),
    'Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */ = "Q2",
    'Qualification Quarter'[QUALIFICATION_YR] /* DB: vw_EBI_Caldate.QUALIFICATION_YR */ = CurrentYear
)

VAR GenerationCQ = CALCULATE(
    [IN QTR GC TARGET],
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT
) 

VAR GenerationCQ1 = CALCULATE(
    [GENERATION TARGET] * MultiplierCQ1,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 1
) 

VAR GenerationCQ2 = CALCULATE(
    [GENERATION TARGET] * MultiplierCQ2,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 2
) 

VAR GenerationCQ3 = CALCULATE(
    [GENERATION TARGET] * MultiplierCQ3,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 3
)

VAR GenerationCQ4 = CALCULATE(
    [GENERATION TARGET] * MultiplierCQ4,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 4
) 

VAR Result = GenerationCQ + GenerationCQ1 + GenerationCQ2 + GenerationCQ3 + GenerationCQ4

RETURN Result
```

#### FULL QUARTER GROSS CREATION Q3

```dax
VAR MultiplierCQ1 = LOOKUPVALUE(
    'Generation Target Multipliers'[GROSS_CREATION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.GROSS_CREATION_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+1"
)

VAR MultiplierCQ2 = LOOKUPVALUE(
    'Generation Target Multipliers'[GROSS_CREATION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.GROSS_CREATION_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+2"
)

VAR MultiplierCQ3 = LOOKUPVALUE(
    'Generation Target Multipliers'[GROSS_CREATION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.GROSS_CREATION_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+3"
)

VAR MultiplierCQ4 = LOOKUPVALUE(
    'Generation Target Multipliers'[GROSS_CREATION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.GROSS_CREATION_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+4"
)

VAR CurrentYear = SELECTEDVALUE(
    'Qualification Quarter'[QUALIFICATION_YR] /* DB: vw_EBI_Caldate.QUALIFICATION_YR */,
    CALCULATE(
        MIN( 'Qualification Quarter'[QUALIFICATION_YR] /* DB: vw_EBI_Caldate.QUALIFICATION_YR */ ),
        'Qualification Quarter'[QUALIFICATION_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.QUALIFICATION_YR_BKT_NUMBER */ = 0
    )
)


VAR SelectedFQTRBKT = CALCULATE(
    MIN(
        'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */
    ),
    'Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */ = "Q3",
    'Qualification Quarter'[QUALIFICATION_YR] /* DB: vw_EBI_Caldate.QUALIFICATION_YR */ = CurrentYear
)

VAR GenerationCQ = CALCULATE(
    [IN QTR GC TARGET],
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT
) 

VAR GenerationCQ1 = CALCULATE(
    [GENERATION TARGET] * MultiplierCQ1,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 1
) 

VAR GenerationCQ2 = CALCULATE(
    [GENERATION TARGET] * MultiplierCQ2,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 2
) 

VAR GenerationCQ3 = CALCULATE(
    [GENERATION TARGET] * MultiplierCQ3,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 3
)

VAR GenerationCQ4 = CALCULATE(
    [GENERATION TARGET] * MultiplierCQ4,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 4
) 

VAR Result = GenerationCQ + GenerationCQ1 + GenerationCQ2 + GenerationCQ3 + GenerationCQ4

RETURN Result
```

#### FULL QUARTER GROSS CREATION Q4

```dax
VAR MultiplierCQ1 = LOOKUPVALUE(
    'Generation Target Multipliers'[GROSS_CREATION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.GROSS_CREATION_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+1"
)

VAR MultiplierCQ2 = LOOKUPVALUE(
    'Generation Target Multipliers'[GROSS_CREATION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.GROSS_CREATION_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+2"
)

VAR MultiplierCQ3 = LOOKUPVALUE(
    'Generation Target Multipliers'[GROSS_CREATION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.GROSS_CREATION_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+3"
)

VAR MultiplierCQ4 = LOOKUPVALUE(
    'Generation Target Multipliers'[GROSS_CREATION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.GROSS_CREATION_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+4"
)

VAR CurrentYear = SELECTEDVALUE(
    'Qualification Quarter'[QUALIFICATION_YR] /* DB: vw_EBI_Caldate.QUALIFICATION_YR */,
    CALCULATE(
        MIN( 'Qualification Quarter'[QUALIFICATION_YR] /* DB: vw_EBI_Caldate.QUALIFICATION_YR */ ),
        'Qualification Quarter'[QUALIFICATION_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.QUALIFICATION_YR_BKT_NUMBER */ = 0
    )
)


VAR SelectedFQTRBKT = CALCULATE(
    MIN(
        'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */
    ),
    'Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */ = "Q4",
    'Qualification Quarter'[QUALIFICATION_YR] /* DB: vw_EBI_Caldate.QUALIFICATION_YR */ = CurrentYear
)

VAR GenerationCQ = CALCULATE(
    [IN QTR GC TARGET],
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT
) 

VAR GenerationCQ1 = CALCULATE(
    [GENERATION TARGET] * MultiplierCQ1,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 1
) 

VAR GenerationCQ2 = CALCULATE(
    [GENERATION TARGET] * MultiplierCQ2,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 2
) 

VAR GenerationCQ3 = CALCULATE(
    [GENERATION TARGET] * MultiplierCQ3,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 3
)

VAR GenerationCQ4 = CALCULATE(
    [GENERATION TARGET] * MultiplierCQ4,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 4
) 

VAR Result = GenerationCQ + GenerationCQ1 + GenerationCQ2 + GenerationCQ3 + GenerationCQ4

RETURN Result
```

#### GROSS CREATION MONTHLY (YTD)

```dax
VAR CurrentMonthKey = MAX ( 'Qualification Quarter'[YR_MONTH_KEY] /* DB: vw_EBI_Caldate.YR_MONTH_KEY */ )
VAR CurrentYear = MAX ( 'Qualification Quarter'[QUALIFICATION_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.QUALIFICATION_YR_BKT_NUMBER */ )
RETURN
CALCULATE (
    SUMX (
        VALUES ( 'Qualification Quarter'[YR_MONTH_KEY] /* DB: vw_EBI_Caldate.YR_MONTH_KEY */ ),
        [GROSS CREATION MTD]
    ),
    FILTER (
        ALL ( 'Qualification Quarter' ),
        'Qualification Quarter'[QUALIFICATION_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.QUALIFICATION_YR_BKT_NUMBER */ = CurrentYear &&
        'Qualification Quarter'[YR_MONTH_KEY] /* DB: vw_EBI_Caldate.YR_MONTH_KEY */ <= CurrentMonthKey
    )
)
```

#### GROSS CREATION MTD

```dax
VAR selectedYrbkt = SELECTEDVALUE('Qualification Quarter'[QUALIFICATION_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.QUALIFICATION_YR_BKT_NUMBER */)
VAR SelectedQtrbkt = SELECTEDVALUE('Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */)
VAR CurrentMonth = CALCULATE(MAX('Qualification Quarter'[YR_MONTH_KEY] /* DB: vw_EBI_Caldate.YR_MONTH_KEY */),FILTER(ALL('Qualification Quarter'),'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */=0))
VAR CurrentMonthBkt = CALCULATE(MAX('Qualification Quarter'[MONTH_BKT] /* DB: vw_EBI_Caldate.MONTH_BKT */),FILTER(ALL('Qualification Quarter'),'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */=0))

VAR A = [GROSS CREATION QTD]/13

VAR B = 
SWITCH
(
    SELECTEDVALUE('Qualification Quarter'[MONTH_BKT] /* DB: vw_EBI_Caldate.MONTH_BKT */),
    "M1",A*4,
    "M2",A*4,
    "M3",A*5,
    CALCULATE(A*IF(CurrentMonthBkt="M3",5,4),FILTER(ALL('Qualification Quarter'),'Qualification Quarter'[YR_MONTH_KEY] /* DB: vw_EBI_Caldate.YR_MONTH_KEY */= CurrentMonth))
)

RETURN 

IF
(
SELECTEDVALUE('Qualification Quarter'[MONTH_BKT] /* DB: vw_EBI_Caldate.MONTH_BKT */)=BLANK(), 
CALCULATE(B,FILTER(ALL('Qualification Quarter'),'Qualification Quarter'[YR_MONTH_KEY] /* DB: vw_EBI_Caldate.YR_MONTH_KEY */= CurrentMonth)),B
)





/*
VAR CurrentWeek = [RECON LAST WEEK]

VAR IsFiltered1 = ISFILTERED('Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */)
VAR SelectedQtrs = VALUES('Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */)
VAR QtrCount = IF(IsFiltered1, COUNTROWS(SelectedQtrs), 0)

RETURN
IF(
    QtrCount >= 1,
SUMX (
    SelectedQtrs,
    VAR SelectedQtr = 'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */
    VAR SelectedQtrBkt = 
        CALCULATE (
            MAX ( 'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ ),
            'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */ = SelectedQtr
        )
    VAR Qt =
        CALCULATE (
            [FULL QUARTER GROSS CREATION],
            'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */ = SelectedQtr
        )
    VAR IsQ1 = RIGHT(SelectedQtr,2) = "Q1"
    VAR PhasedQt =
        SWITCH (
            TRUE (),
            SelectedQtrBkt < 0, Qt,
            SelectedQtrBkt = 0,
                IF (
                    IsQ1,
                    SWITCH (
                        TRUE (),
                        CurrentWeek <= 4, (0.1 * 4 )/ 6,
                        CurrentWeek > 4 && CurrentWeek <= 8, ((0.1 * 2 )/ 6) + ((0.9 * 2 )/ 7),
                        CurrentWeek > 8, ((0.9 * 5 )/ 7)
                    ),
                    ( Qt * CurrentWeek ) / 13
                ),
            BLANK()
        )
    RETURN
        PhasedQt
),
IF(
    QtrCount = 0,   
        CALCULATE(
            VAR SelectedQtr = CALCULATE(MIN('Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */),'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */=0)
    VAR SelectedQtrBkt = 
        CALCULATE (
            MAX ( 'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ ),
            'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */ = SelectedQtr
        )
    VAR Qt =
        CALCULATE (
            [FULL QUARTER GROSS CREATION],
            'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */ = SelectedQtr
        )
    VAR IsQ1 = RIGHT(SelectedQtr,2) = "Q1"
    VAR PhasedQt =
        SWITCH (
            TRUE (),
            SelectedQtrBkt < 0, Qt,
            SelectedQtrBkt = 0,
                IF (
                    IsQ1,
                    SWITCH (
                        TRUE (),
                        CurrentWeek <= 4, (0.1 * 4 )/ 6,
                        CurrentWeek > 4 && CurrentWeek <= 8, ((0.1 * 2 )/ 6) + ((0.9 * 2 )/ 7),
                        CurrentWeek > 8, ((0.9 * 5 )/ 7)
                    ),
                    ( Qt * CurrentWeek ) / 13
                ),
            BLANK()
        )
    RETURN
        PhasedQt
)
))*/
```

#### GROSS CREATION QTD

```dax
VAR CurrentWeek = [RECON LAST WEEK]

VAR IsFiltered1 = ISFILTERED('Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */)
VAR SelectedQtrs = VALUES('Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */)
VAR QtrCount = IF(IsFiltered1, COUNTROWS(SelectedQtrs), 0)

RETURN
IF(
    QtrCount >= 1,
SUMX (
    SelectedQtrs,
    VAR SelectedQtr = 'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */
    VAR SelectedQtrBkt = 
        CALCULATE (
            MAX ( 'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ ),
            'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */ = SelectedQtr
        )
    VAR Qt =
        CALCULATE (
            [FULL QUARTER GROSS CREATION],
            'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */ = SelectedQtr
        )
    VAR IsQ1 = RIGHT(SelectedQtr,2) = "Q1"
    VAR PhasedQt =
        SWITCH (
            TRUE (),
            SelectedQtrBkt < 0, Qt,
            SelectedQtrBkt = 0,
                IF (
                    IsQ1,
                    SWITCH (
                        TRUE (),
                        CurrentWeek <= 6, ( Qt * 0.1 * CurrentWeek ) / 6,
                        CurrentWeek > 6, ( Qt * 0.1 ) + ( Qt * 0.9 * ( CurrentWeek - 6 ) ) / 7
                    ),
                    ( Qt * CurrentWeek ) / 13
                ),
            BLANK()
        )
    RETURN
        PhasedQt
),
IF(
    QtrCount = 0,   
        CALCULATE(
            VAR SelectedQtr = CALCULATE(MIN('Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */),'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */=0)
    VAR SelectedQtrBkt = 
        CALCULATE (
            MAX ( 'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ ),
            'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */ = SelectedQtr
        )
    VAR Qt =
        CALCULATE (
            [FULL QUARTER GROSS CREATION],
            'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */ = SelectedQtr
        )
    VAR IsQ1 = RIGHT(SelectedQtr,2) = "Q1"
    VAR PhasedQt =
        SWITCH (
            TRUE (),
            SelectedQtrBkt < 0, Qt,
            SelectedQtrBkt = 0,
                IF (
                    IsQ1,
                    SWITCH (
                        TRUE (),
                        CurrentWeek <= 6, ( Qt * 0.1 * CurrentWeek ) / 6,
                        CurrentWeek > 6, ( Qt * 0.1 ) + ( Qt * 0.9 * ( CurrentWeek - 6 ) ) / 7
                    ),
                    ( Qt * CurrentWeek ) / 13
                ),
            BLANK()
        )
    RETURN
        PhasedQt
)
))
```

#### GROSS CREATION WTD

```dax
VAR Qt = [FULL QUARTER GROSS CREATION]

VAR SelectedQualQtr = SELECTEDVALUE('Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */)
VAR SelectedQtrbkt = SELECTEDVALUE( 'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ )

VAR CurrentQtr = IF(ISBLANK(SelectedQualQtr),
    CALCULATE(
        MIN(
            'Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */
        ),
        'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = 0
    ),
    SelectedQualQtr
)

VAR CurrentWeek = [RECON LAST WEEK]

VAR Result = IF(
    SelectedQtrbkt <= 0,
    IF(
        CurrentQtr = "Q1",
        SWITCH(
            TRUE(),
            CurrentWeek <= 6, (Qt*0.1)/6,
            CurrentWeek > 6, (Qt*0.9)/7
        ),
        Qt/13
    )
)

RETURN Result
```

#### GROSS CREATION YTD

```dax
VAR SelectedQtr = SELECTEDVALUE('Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */)
VAR Yr = VALUE(LEFT(SelectedQtr, 4))
VAR QtrBkt = LOOKUPVALUE('Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */, 'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */, SelectedQtr)

VAR IsFiltered1 = NOT ISBLANK(SelectedQtr)
VAR CurrentYr = VALUE(LEFT(LOOKUPVALUE('Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */, 'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */, 0), 4))
VAR CurrentQtrBkt = 0

RETURN
IF(
    IsFiltered1,
    // Row-level: Use filtered quarter
    CALCULATE(
        [GROSS CREATION QTD],
        FILTER(
            ALL('Qualification Quarter'),
            'Qualification Quarter'[QUALIFICATION_YR] /* DB: vw_EBI_Caldate.QUALIFICATION_YR */ = Yr &&
            'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ <= QtrBkt
        )
    ),
    // Total-level: Use latest quarter's year and calculate YTD
    CALCULATE(
        [GROSS CREATION QTD],
        FILTER(
            ALL('Qualification Quarter'),
            'Qualification Quarter'[QUALIFICATION_YR] /* DB: vw_EBI_Caldate.QUALIFICATION_YR */ = CurrentYr &&
            'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ <= CurrentQtrBkt
        )
    )
)
```

**Net Pipe Growth Measures:**

#### FULL QUARTER BOQ CREATION Q1

```dax
VAR MultiplierCQ1 = LOOKUPVALUE(
    'Generation Target Multipliers'[NET_PIPE_GROWTH_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.NET_PIPE_GROWTH_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+1"
)

VAR MultiplierCQ2 = LOOKUPVALUE(
    'Generation Target Multipliers'[NET_PIPE_GROWTH_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.NET_PIPE_GROWTH_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+2"
)

VAR MultiplierCQ3 = LOOKUPVALUE(
    'Generation Target Multipliers'[NET_PIPE_GROWTH_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.NET_PIPE_GROWTH_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+3"
)

VAR MultiplierCQ4 = LOOKUPVALUE(
    'Generation Target Multipliers'[NET_PIPE_GROWTH_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.NET_PIPE_GROWTH_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+4"
)

VAR CurrentYear = CALCULATE(
    MIN( 'Qualification Quarter'[QUALIFICATION_YR] /* DB: vw_EBI_Caldate.QUALIFICATION_YR */ ),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = 0)

VAR SelectedFQTRBKT = CALCULATE(
    MIN(
        'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */
    ),
    'Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */ = "Q1",
    'Qualification Quarter'[QUALIFICATION_YR] /* DB: vw_EBI_Caldate.QUALIFICATION_YR */ = CurrentYear
)

VAR GenerationCQ1 = CALCULATE(
    [PIPE TARGET] * MultiplierCQ1,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 1
) 

VAR GenerationCQ2 = CALCULATE(
    [PIPE TARGET] * MultiplierCQ2,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 2
) 

VAR GenerationCQ3 = CALCULATE(
    [PIPE TARGET] * MultiplierCQ3,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 3
)

VAR GenerationCQ4 = CALCULATE(
    [PIPE TARGET] * MultiplierCQ4,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 4
) 

VAR Result = GenerationCQ1 + GenerationCQ2 + GenerationCQ3 + GenerationCQ4

RETURN Result
```

#### FULL QUARTER BOQ CREATION Q2

```dax
VAR MultiplierCQ1 = LOOKUPVALUE(
    'Generation Target Multipliers'[NET_PIPE_GROWTH_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.NET_PIPE_GROWTH_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+1"
)

VAR MultiplierCQ2 = LOOKUPVALUE(
    'Generation Target Multipliers'[NET_PIPE_GROWTH_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.NET_PIPE_GROWTH_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+2"
)

VAR MultiplierCQ3 = LOOKUPVALUE(
    'Generation Target Multipliers'[NET_PIPE_GROWTH_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.NET_PIPE_GROWTH_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+3"
)

VAR MultiplierCQ4 = LOOKUPVALUE(
    'Generation Target Multipliers'[NET_PIPE_GROWTH_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.NET_PIPE_GROWTH_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+4"
)

VAR CurrentYear = CALCULATE(
    MIN( 'Qualification Quarter'[QUALIFICATION_YR] /* DB: vw_EBI_Caldate.QUALIFICATION_YR */ ),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = 0
)

VAR SelectedFQTRBKT = CALCULATE(
    MIN(
        'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */
    ),
    'Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */ = "Q2",
    'Qualification Quarter'[QUALIFICATION_YR] /* DB: vw_EBI_Caldate.QUALIFICATION_YR */ = CurrentYear
)

VAR GenerationCQ1 = CALCULATE(
    [PIPE TARGET] * MultiplierCQ1,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 1
) 

VAR GenerationCQ2 = CALCULATE(
    [PIPE TARGET] * MultiplierCQ2,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 2
) 

VAR GenerationCQ3 = CALCULATE(
    [PIPE TARGET] * MultiplierCQ3,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 3
)

VAR GenerationCQ4 = CALCULATE(
    [PIPE TARGET] * MultiplierCQ4,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 4
) 

VAR Result = GenerationCQ1 + GenerationCQ2 + GenerationCQ3 + GenerationCQ4

RETURN Result
```

#### FULL QUARTER BOQ CREATION Q3

```dax
VAR MultiplierCQ1 = LOOKUPVALUE(
    'Generation Target Multipliers'[NET_PIPE_GROWTH_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.NET_PIPE_GROWTH_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+1"
)

VAR MultiplierCQ2 = LOOKUPVALUE(
    'Generation Target Multipliers'[NET_PIPE_GROWTH_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.NET_PIPE_GROWTH_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+2"
)

VAR MultiplierCQ3 = LOOKUPVALUE(
    'Generation Target Multipliers'[NET_PIPE_GROWTH_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.NET_PIPE_GROWTH_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+3"
)

VAR MultiplierCQ4 = LOOKUPVALUE(
    'Generation Target Multipliers'[NET_PIPE_GROWTH_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.NET_PIPE_GROWTH_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+4"
)

VAR CurrentYear = CALCULATE(
    MIN( 'Qualification Quarter'[QUALIFICATION_YR] /* DB: vw_EBI_Caldate.QUALIFICATION_YR */ ),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = 0
)

VAR SelectedFQTRBKT = CALCULATE(
    MIN(
        'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */
    ),
    'Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */ = "Q3",
    'Qualification Quarter'[QUALIFICATION_YR] /* DB: vw_EBI_Caldate.QUALIFICATION_YR */ = CurrentYear
)

VAR GenerationCQ1 = CALCULATE(
    [PIPE TARGET] * MultiplierCQ1,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 1
) 

VAR GenerationCQ2 = CALCULATE(
    [PIPE TARGET] * MultiplierCQ2,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 2
) 

VAR GenerationCQ3 = CALCULATE(
    [PIPE TARGET] * MultiplierCQ3,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 3
)

VAR GenerationCQ4 = CALCULATE(
    [PIPE TARGET] * MultiplierCQ4,
    ALL('Close Quarter'),
    ALL('Qualification Quarter'),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedFQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 4
) 

VAR Result = GenerationCQ1 + GenerationCQ2 + GenerationCQ3 + GenerationCQ4

RETURN Result
```

#### FULL QUARTER NET PIPE CREATION

```dax
VAR MultiplierCQ1 = LOOKUPVALUE(
    'Generation Target Multipliers'[NET_PIPE_GROWTH_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.NET_PIPE_GROWTH_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+1"
)

VAR MultiplierCQ2 = LOOKUPVALUE(
    'Generation Target Multipliers'[NET_PIPE_GROWTH_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.NET_PIPE_GROWTH_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+2"
)

VAR MultiplierCQ3 = LOOKUPVALUE(
    'Generation Target Multipliers'[NET_PIPE_GROWTH_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.NET_PIPE_GROWTH_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+3"
)

VAR MultiplierCQ4 = LOOKUPVALUE(
    'Generation Target Multipliers'[NET_PIPE_GROWTH_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.NET_PIPE_GROWTH_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+4"
)

VAR SelectedQualQtr = SELECTEDVALUE('Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */)

VAR CurrentQtr = IF(ISBLANK(SelectedQualQtr),
    CALCULATE(
        MIN(
            'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */
        ),
        'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = 0
    ),
    SelectedQualQtr
)

VAR SelectedCloseQtrs = ALLSELECTED('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)

VAR CQ1Check = CONTAINS(SelectedCloseQtrs,'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */,CurrentQtr+1)
VAR CQ2Check = CONTAINS(SelectedCloseQtrs,'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */,CurrentQtr+2)
VAR CQ3Check = CONTAINS(SelectedCloseQtrs,'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */,CurrentQtr+3)
VAR CQ4Check = CONTAINS(SelectedCloseQtrs,'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */,CurrentQtr+4)


VAR GenerationCQ1 = IF(CQ1Check = TRUE,
    CALCULATE(
        [PIPE TARGET] * MultiplierCQ1,
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = CurrentQtr + 1
    ),0
) 

VAR GenerationCQ2 = IF(CQ2Check = TRUE,
    CALCULATE(
        [PIPE TARGET] * MultiplierCQ2,
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = CurrentQtr + 2
    ),0
) 

VAR GenerationCQ3 = IF(CQ3Check = TRUE,
    CALCULATE(
        [PIPE TARGET] * MultiplierCQ3,
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = CurrentQtr + 3
    ),0
)

VAR GenerationCQ4 = IF(CQ4Check = TRUE,
    CALCULATE(
        [PIPE TARGET] * MultiplierCQ4,
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = CurrentQtr + 4
    ),0
) 

VAR Result = GenerationCQ1 + GenerationCQ2 + GenerationCQ3 + GenerationCQ4

RETURN Result
```

#### NET PIPE CREATION QTD

```dax
VAR Qt = [FULL QUARTER NET PIPE CREATION]

VAR SelectedQualQtr = SELECTEDVALUE('Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */)
VAR SelectedQtrbkt = SELECTEDVALUE( 'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ )

VAR CurrentQtr = IF(ISBLANK(SelectedQualQtr),
    CALCULATE(
        MIN(
            'Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */
        ),
        'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = 0
    ),
    SelectedQualQtr
)

VAR CurrentWeek = [RECON LAST WEEK]

VAR Result = IF(
    SelectedQtrbkt < 0,
    Qt,
    
        IF(
            CurrentQtr = "Q1", 
            SWITCH(
                TRUE(),
                CurrentWeek <= 6, ( Qt*0.1*CurrentWeek )/6,
                CurrentWeek > 6, ( Qt*0.1 ) + ( Qt*0.9*(CurrentWeek - 6) )/7
            ),
        ( Qt*CurrentWeek )/13
        )
    
)


RETURN Result
```

#### NET PIPE CREATION WTD

```dax
VAR Qt = [FULL QUARTER NET PIPE CREATION]

VAR SelectedQualQtr = SELECTEDVALUE('Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */)

VAR CurrentQtr = IF(ISBLANK(SelectedQualQtr),
    CALCULATE(
        MIN(
            'Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */
        ),
        'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = 0
    ),
    SelectedQualQtr
)

VAR CurrentWeek = [RECON LAST WEEK]

VAR Result = IF(
    CurrentQtr = "Q1",
    SWITCH(
        TRUE(),
        CurrentWeek <= 6, (Qt*0.1)/6,
        CurrentWeek > 6, (Qt*0.9)/7
    ),
    Qt/13
)

RETURN Result
```

#### NET PIPE CREATION YTD

```dax
VAR CurrentQTR = CALCULATE(
    MIN(
        'Snapshot Quarter'[SNAPSHOT_GENERIC_QTR] /* DB: vw_EBI_Caldate.SNAPSHOT_GENERIC_QTR */
    ),
    ALL( 'Snapshot Quarter' ),
    'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)

VAR CurrentQTRNum = RIGHT(CurrentQTR,1)

VAR Result = SWITCH(
    CurrentQTRNum,
    "1",CALCULATE( 
        [NET PIPE CREATION QTD],
        ALL( 'Qualification Quarter' )
    ),
    "2",CALCULATE(
        [FULL QUARTER BOQ CREATION Q1] + [NET PIPE CREATION QTD],
        ALL( 'Qualification Quarter' )
    ),
    "3",CALCULATE(
        [FULL QUARTER BOQ CREATION Q1] + [FULL QUARTER BOQ CREATION Q2] + [NET PIPE CREATION QTD],
        ALL( 'Qualification Quarter' )
    ),
    "4",CALCULATE( 
        [FULL QUARTER BOQ CREATION Q1] + [FULL QUARTER BOQ CREATION Q2] + [FULL QUARTER BOQ CREATION Q3] + 
        [NET PIPE CREATION QTD],
        ALL( 'Qualification Quarter' )
    )
)

RETURN Result
```

**Pacing Measures:**

#### LINEARITY TARGET $

```dax
CALCULATE(SUM('Pacing Targets'[PACING_LINEARITY] /* DB: vw_EBI_PACING_TARGET.PACING_LINEARITY */)*[BOOKINGS TARGET])
```

#### LINEARITY TARGET TREND

```dax
VAR Selected_Close_qtr = SELECTEDVALUE('Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */)
VAR Selected_wk = SELECTEDVALUE('Close Quarter'[WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEK_NUMBER */)

VAR RESULT = CALCULATE([LINEARITY TARGET $],'Snapshot Quarter'[SNAPSHOT_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ = Selected_Close_qtr,'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ = Selected_Close_qtr,'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */ = Selected_wk,ALL('Close Quarter'))

Return RESULT
```

#### PACING $

```dax
CALCULATE(SUMX('Pacing Targets','Pacing Targets'[PACING_ASV] /* DB: vw_EBI_PACING_TARGET.PACING_ASV */*[PIPE TARGET]))
```

#### SS4 PACING $

```dax
CALCULATE(SUMX('Pacing Targets','Pacing Targets'[PACING_SS4] /* DB: vw_EBI_PACING_TARGET.PACING_SS4 */*[PIPE TARGET SS4]))
```

#### SS4 PACING QTD $

```dax
CALCULATE([SS4 PACING $],FILTER('Snapshot Quarter','Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */=[RECON LAST DATE]))
// VAR Qt = [SS4 PACING $]
// VAR SelectedQtrbkt =
//     MAX ( 'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ )
// VAR CurrentQtr =
//     CALCULATE (
//         MIN ( 'Snapshot Quarter'[SNAPSHOT_GENERIC_QTR] /* DB: vw_EBI_Caldate.SNAPSHOT_GENERIC_QTR */ ),
//         'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
//     )
// VAR CurrentWeek = [RECON LAST WEEK]
// VAR Result =
//     IF (
//         SelectedQtrbkt < 0,
//         Qt,
//         ( Qt * CurrentWeek ) / 13
//         )
// RETURN
//     Result
```

#### SS5 PACING $

```dax
CALCULATE(SUMX('Pacing Targets','Pacing Targets'[PACING_SS5] /* DB: vw_EBI_PACING_TARGET.PACING_SS5 */*[PIPE TARGET SS5]))
```

#### SS5 PACING QTD $

```dax
CALCULATE([SS5 PACING $],FILTER('Snapshot Quarter','Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */=[RECON LAST DATE]))
// VAR Qt = [SS5 PACING $]
// VAR SelectedQtrbkt =
//     MAX ( 'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ )
// VAR CurrentQtr =
//     CALCULATE (
//         MIN ( 'Snapshot Quarter'[SNAPSHOT_GENERIC_QTR] /* DB: vw_EBI_Caldate.SNAPSHOT_GENERIC_QTR */ ),
//         'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
//     )
// VAR CurrentWeek = [RECON LAST WEEK]
// VAR Result =
//     IF (
//         SelectedQtrbkt < 0,
//         Qt,
//         ( Qt * CurrentWeek ) / 13
//         )
// RETURN
//     Result
```

**SS4 Progression Measures:**

#### SS4 PROGRESSION QTD

```dax
-- ( [SS4 PROGRESSION TARGET $]*[RECON LAST WEEK] ) /13

VAR CurrentWeek = [RECON LAST WEEK]

RETURN
SUMX (
    VALUES ( 'Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */ ),
    VAR SelectedQtr = 'Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */
    VAR SelectedQtrBkt =
        COALESCE(CALCULATE (
            MAX ( 'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ ),
            'Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */ = SelectedQtr
        ),0)
    VAR Qt =
        CALCULATE (
            [SS4 PROGRESSION TARGET $],
            'Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */ = SelectedQtr
        )
    VAR IsQ1 = SelectedQtr = "Q1"
    VAR PhasedQt =
        SWITCH (
            TRUE (),
            SelectedQtrBkt < 0, Qt,
            SelectedQtrBkt = 0,
                
                    ( Qt * CurrentWeek ) / 13
            ,    
            BLANK()
        )
    RETURN
        PhasedQt
)
```

#### SS4 PROGRESSION TARGET $

```dax
VAR MultiplierCQ1 =
    LOOKUPVALUE (
        'Generation Target Multipliers'[SS4_PROGRESSION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.SS4_PROGRESSION_MULTIPLIER */,
        'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */, "CQ+1"
    )
VAR MultiplierCQ2 =
    LOOKUPVALUE (
        'Generation Target Multipliers'[SS4_PROGRESSION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.SS4_PROGRESSION_MULTIPLIER */,
        'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */, "CQ+2"
    )
VAR MultiplierCQ3 =
    LOOKUPVALUE (
        'Generation Target Multipliers'[SS4_PROGRESSION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.SS4_PROGRESSION_MULTIPLIER */,
        'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */, "CQ+3"
    )

RETURN
SUMX (
    VALUES ( 'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ ),
    VAR BaseQtr = COALESCE('Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */,0)

    VAR GenerationCQ =
        CALCULATE (
            [IN QTR GC TARGET SS4],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = BaseQtr
        )
    VAR GenerationCQ1 =
        CALCULATE (
            [GENERATION TARGET SS4] * MultiplierCQ1,
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = BaseQtr + 1
        )
    VAR GenerationCQ2 =
        CALCULATE (
            [GENERATION TARGET SS4] * MultiplierCQ2,
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = BaseQtr + 2
        )
    VAR GenerationCQ3 =
        CALCULATE (
            [GENERATION TARGET SS4] * MultiplierCQ3,
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = BaseQtr + 3
        )


    RETURN
        GenerationCQ + GenerationCQ1 + GenerationCQ2 + GenerationCQ3 
)

// VAR MultiplierCQ1 = LOOKUPVALUE(
//     'Generation Target Multipliers'[SS4_PROGRESSION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.SS4_PROGRESSION_MULTIPLIER */,
//     'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
//     "CQ+1"
// )

// VAR MultiplierCQ2 = LOOKUPVALUE(
//     'Generation Target Multipliers'[SS4_PROGRESSION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.SS4_PROGRESSION_MULTIPLIER */,
//     'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
//     "CQ+2"
// )

// VAR MultiplierCQ3 = LOOKUPVALUE(
//     'Generation Target Multipliers'[SS4_PROGRESSION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.SS4_PROGRESSION_MULTIPLIER */,
//     'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
//     "CQ+3"
// )

// VAR CurrentQtr = CALCULATE(
//     MIN(
//         'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */
//     ),
//     ALL( 'Qualification Quarter' ),
//     'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = 0
// )

// VAR SelectedFQTR = SELECTEDVALUE(
//     'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */,
//     CurrentQtr
// )

// VAR SelectedFQTRBKT = CALCULATE(
//     MIN(
//         'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */
//     ),
//     'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */ = SelectedFQTR
// )

// VAR GenerationCQ = CALCULATE(
//     [IN QTR GC Target SS4] ,
//     --ALL('Close Quarter'),
//     'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT
// ) 

// VAR GenerationCQ1 = CALCULATE(
//     [PIPE TARGET SURVIVAL RATE SS4] * MultiplierCQ1,
//     --ALL('Close Quarter'),
//     'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 1
// ) 

// VAR GenerationCQ2 = CALCULATE(
//     [PIPE TARGET SURVIVAL RATE SS4] * MultiplierCQ2,
//     --ALL('Close Quarter'),
//     'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 2
// )

// VAR GenerationCQ3 = CALCULATE(
//     [PIPE TARGET SURVIVAL RATE SS4] * MultiplierCQ3,
//     --ALL('Close Quarter'),
//     'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 3
// )

// VAR Result = GenerationCQ + GenerationCQ1 + GenerationCQ2 + GenerationCQ3

// RETURN Result
```

#### SS4 PROGRESSION WTD

```dax
[SS4 PROGRESSION TARGET $]/13
```

**True Progression Measures:**

#### TRUE PROGRESSION QTD

```dax
( [TRUE PROGRESSION TARGET $]*[RECON LAST WEEK] ) /13
```

#### TRUE PROGRESSION TARGET $

```dax
VAR MultiplierCQ1 = LOOKUPVALUE(
    'Generation Target Multipliers'[TRUE_PROGRESSION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.TRUE_PROGRESSION_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+1"
)

VAR MultiplierCQ2 = LOOKUPVALUE(
    'Generation Target Multipliers'[TRUE_PROGRESSION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.TRUE_PROGRESSION_MULTIPLIER */,
    'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */,
    "CQ+2"
)

VAR CurrentQtr = CALCULATE(
    MIN(
        'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */
    ),
    ALL( 'Qualification Quarter' ),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = 0
)

VAR SelectedFQTR = SELECTEDVALUE(
    'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */,
    CurrentQtr
)

VAR SelectedFQTRBKT = CALCULATE(
    MIN(
        'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */
    ),
    'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */ = SelectedFQTR
)

VAR GenerationCQ = CALCULATE(
    [IN QTR GC Target SS5] ,
    --ALL('Close Quarter'),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT
) 

VAR GenerationCQ1 = CALCULATE(
    [PIPE TARGET SURVIVAL RATE SS5] * MultiplierCQ1,
    --ALL('Close Quarter'),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 1
) 

VAR GenerationCQ2 = CALCULATE(
    [PIPE TARGET SURVIVAL RATE SS5] * MultiplierCQ2,
    --ALL('Close Quarter'),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SelectedFQTRBKT + 2
)

VAR Result = GenerationCQ + GenerationCQ1 + GenerationCQ2

RETURN Result
```

#### TRUE PROGRESSION WTD

```dax
[TRUE PROGRESSION TARGET $]/13
```

### 3.6. _Lead Measures (4 measures) — DB: measure-only

#### LEAD AMOUNT

```dax
SUM('Lead'[LEAD_AMOUNT] /* DB: dataset_table.LEAD_AMOUNT */)
```

#### PARENT TIER1 LEAD VALUE

```dax
SUM('Lead'[PARENT_TIER1_LEADVALUE] /* DB: dataset_table.PARENT_TIER1_LEADVALUE */)
```

#### SUB TIER1 LEAD VALUE

```dax
SUM('Lead'[SUB_TIER1_LEADVALUE] /* DB: dataset_table.SUB_TIER1_LEADVALUE */)
```

#### SUB TIER23 LEAD VALUE

```dax
SUM('Lead'[SUB_TIER23_LEADVALUE] /* DB: dataset_table.SUB_TIER23_LEADVALUE */)
```

### 3.7. _Performance Measures (75 measures) — DB: measure-only

#### ACTIVE & UPDATED %

```dax
VAR Result = DIVIDE(
    [ACTIVE & UPDATED $],
    [PIPE $]
)

RETURN Result
```

#### ASV WIN RATE %

```dax
DIVIDE([WON $],[WON $]+[LOST $],0)
```

#### BOQ GEO RANK FLM

```dax
VAR PQMAXDATE = [PQ EOQ SNAPSHOT DATE]
VAR SelectedSalesRegion = MAXX(
        TOPN(
            1,
            SUMMARIZE(
                'Region Hierarchy',
                'Region Hierarchy'[SALES_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SALES_REGION */,
                "Count", COUNT( 'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */ )
            ),
            [Count],
            DESC
        ),
        'Region Hierarchy'[SALES_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SALES_REGION */
    )

VAR BaseOfRank = CONVERT(
    CALCULATE(
        DISTINCTCOUNT( 'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */ ),
        FILTER(
            ALL( 'Region Hierarchy' ),
            'Region Hierarchy'[SALES_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SALES_REGION */ = SelectedSalesRegion &&
            'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ = "DX" &&
            'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place" &&
            'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active" &&
            'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE() &&
            'Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */ IN {"AE"} &&
            'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE() &&
            CALCULATE(
            ROUND(
                [BOQ OVERALLSCORE(A+B+C+D)FLM],
                0) > 0
            )             
        )
    ),
    STRING
)


VAR Result = RANKX(
    SUMMARIZE(
        FILTER(
            ALL( 'Region Hierarchy' ),
            'Region Hierarchy'[SALES_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SALES_REGION */ = SelectedSalesRegion &&
            'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ = "DX" &&
            'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place" &&
            'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active" &&
            'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE() &&
            'Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */ IN {"AE"}
        ),
        'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */
    ),
    CALCULATE( 
            ROUND(
                [BOQ OVERALLSCORE(A+B+C+D)FLM],
                0)
        )
)

RETURN "W1 ("& Result & " / " & BaseOfRank & ")"
```

#### BOQ GEO RANK REP

```dax
VAR SelectedRegion = SELECTEDVALUE( 'Region Hierarchy'[SALES_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SALES_REGION */ )
VAR SelectedGlobalRegion = SELECTEDVALUE( 'Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */ )
VAR SelectedRoletype = SELECTEDVALUE( 'Region Hierarchy'[ROLE_TYPE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE */ )
VAR SelectedRoletypeDisplay = SELECTEDVALUE( 'Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */ )
VAR PQMAXDATE = [PQ EOQ SNAPSHOT DATE]


VAR BaseOfRank = SWITCH(
    SelectedRoletypeDisplay,
    "AE", CONVERT(
            COUNTROWS(
                FILTER(
                    ALL( 'Region Hierarchy' ),
                    'Region Hierarchy'[SALES_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SALES_REGION */ = SelectedRegion &&
                    'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ = "DX" &&
                    'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place" &&
                    'Region Hierarchy'[ROLE_TYPE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE */ = SelectedRoleType &&
                    'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active" &&
                    'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE() &&
                    'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1 && 
                    CALCULATE(
                            ROUND(
                                [BOQ OVERALLSCORE(A+B+C+D)REP],
                                0) > 0 
                    )
                )
            ),
            STRING
    ),
    "PS", CONVERT(
            COUNTROWS(
                FILTER(
                    ALL( 'Region Hierarchy' ),
                    'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ = "DX" &&
                    'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place" &&
                    'Region Hierarchy'[ROLE_TYPE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE */ = SelectedRoleType &&
                    'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active" &&
                    'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE() &&
                    'Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */ = SelectedGlobalRegion &&
                    'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1 && 
                    CALCULATE(
                            ROUND(
                                [BOQ OVERALLSCORE(A+B+C+D)REP],
                                0) > 0 
                    )
                )
            ),
            STRING
        )
)


VAR Result = SWITCH(
    SelectedRoletypeDisplay,
    "AE", RANKX(
            FILTER(
            ALL( 'Region Hierarchy' ),
            'Region Hierarchy'[SALES_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SALES_REGION */ = SelectedRegion &&
            'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ = "DX" &&
            'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "Yes" &&
            'Region Hierarchy'[ROLE_TYPE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE */ = SelectedRoleType &&
            'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active" &&
            'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE() &&
            'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1
        ),
        CALCULATE( 
            ROUND(
                [BOQ OVERALLSCORE(A+B+C+D)REP],
                0)
        )
    ),
    "PS", RANKX(
            FILTER(
            ALL( 'Region Hierarchy' ),
            'Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */ = SelectedGlobalRegion &&
            'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ = "DX" &&
            'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "Yes" &&
            'Region Hierarchy'[ROLE_TYPE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE */ = SelectedRoleType &&
            'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active" &&
            'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE() &&
            'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1
        ),
        CALCULATE( 
            ROUND(
                [BOQ OVERALLSCORE(A+B+C+D)REP],
                0)
        )
    )
)



RETURN "W1 ("& Result & " / " & BaseOfRank & ")"
```

#### COMPETITOR FILL RATE %

```dax
var FilledDeals = CALCULATE([OPP #],
     KEEPFILTERS ( NOT ISBLANK (Opportunity[PRIMARY_COMPETITOR]))
     )

var Result = DIVIDE(FilledDeals,[OPP #],0)

return Result
```

#### COMPLETED IPOV %

```dax
VAR ACPipeIpovCACD = CALCULATE(
    [UPSIDE FORECAST PIPE $],
    Opportunity[IPOV_STATUS] in {"Completed - Delivered",
    "Customer Approved"}
)

VAR ACPipeIpov = CALCULATE(
    [UPSIDE FORECAST PIPE $],
    Opportunity[IPOV_STATUS] <> "Not Required"
)

VAR CompletedIpovPct = DIVIDE(
    ACPipeIpovCACD,
    ACPipeIpov
)

VAR Result = IF(
    ACPipeIpov = 0,
    0,
    CompletedIpovPct
)

RETURN Result
```

#### COMPLETED MUTUAL %

```dax
VAR ACPipeMutualCACD = CALCULATE(
    [UPSIDE FORECAST PIPE $],
    Opportunity[MUTUAL_PLAN_STATUS] in {"Completed - Delivered",
    "Customer Approved"}
)

VAR ACPipeMutual = CALCULATE(
    [UPSIDE FORECAST PIPE $],
    Opportunity[MUTUAL_PLAN_STATUS] <> "Not Required"
)

VAR CompletedMutualPct = DIVIDE(
    ACPipeMutualCACD,
    ACPipeMutual
)

VAR Result = IF(
    ACPipeMutual = 0,
    0,
    CompletedMutualPct
)

RETURN Result
```

#### CY H1 PROJECTION $

```dax
CALCULATE([CY PROJECTION $], 'Close Quarter'[CLOSE_GENERIC_QTR] /* DB: vw_EBI_Caldate.CLOSE_GENERIC_QTR */ in {"Q1","Q2"})
```

#### CY H1 PROJECTION %

```dax
CALCULATE(
    [CY PROJECTION %],
    'Close Quarter'[CLOSE_GENERIC_QTR] /* DB: vw_EBI_Caldate.CLOSE_GENERIC_QTR */ IN {"Q1", "Q2"}
)
```

#### CY PROJECTION $

```dax
VAR CYear = CALCULATE(
    MIN( 'Snapshot Quarter'[SNAPSHOT_YR] /* DB: vw_EBI_Caldate.FISCAL_YR */ ),
    'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)

VAR CurrentQTR = CALCULATE(
    MIN( 'Snapshot Quarter'[SNAPSHOT_GENERIC_QTR] /* DB: vw_EBI_Caldate.SNAPSHOT_GENERIC_QTR */ ),
    'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)

VAR PQSnapshotDate = [PQ EOQ SNAPSHOT DATE]

VAR FQtr = CALCULATE(
    SUMX( vw_EBI_PROJECTION_CLOSE_RATIO,
    [UPSIDE FORECAST PIPE $] * vw_EBI_PROJECTION_CLOSE_RATIO[CLOSE_RATIO]
    ),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ > 0,
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0",
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ IN {"S3", "S4", "S5+"},
    'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.FISCAL_YR */ = CYear
)

VAR PQtr = SWITCH(
    CurrentQTR,
    "Q2", CALCULATE(
        [WON $],
        'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ = PQSnapshotDate,
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1
    ),
    "Q3", CALCULATE(
        [WON $],
        'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ = PQSnapshotDate,
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1
    ) + CALCULATE(
        [WON $],
        'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1,
        'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */ = "W1",
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = - 2
    ),
    "Q4", CALCULATE(
        [WON $],
        'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ = PQSnapshotDate,
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1
    ) + CALCULATE(
        [WON $],
        'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1,
        'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */ = "W1",
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = - 2
    ) + CALCULATE(
        [WON $],
        'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -2,
        'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */ = "W1",
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = - 3
    )
)

VAR CQtr = CALCULATE(
    [WON $] + [FORECAST $] + [UPSIDE COMMITTED $],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
)


VAR Result = FQtr + PQtr + CQTR
        

RETURN Result
```

#### CY PROJECTION %

```dax
VAR CYear = CALCULATE(
    MIN( 'Snapshot Quarter'[SNAPSHOT_YR] /* DB: vw_EBI_Caldate.FISCAL_YR */ ),
    'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)

VAR CurrentQTR = CALCULATE(
    MIN( 'Snapshot Quarter'[SNAPSHOT_GENERIC_QTR] /* DB: vw_EBI_Caldate.SNAPSHOT_GENERIC_QTR */ ),
    'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)

VAR PQSnapshotDate = [PQ EOQ SNAPSHOT DATE]

VAR FQtr = CALCULATE(
    SUMX( vw_EBI_PROJECTION_CLOSE_RATIO,
    [UPSIDE FORECAST PIPE $] * vw_EBI_PROJECTION_CLOSE_RATIO[CLOSE_RATIO]
    ),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ > 0,
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0",
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ IN {"S3", "S4", "S5+"},
    'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.FISCAL_YR */ = CYear
)

VAR PQtr = SWITCH(
    CurrentQTR,
    "Q2", CALCULATE(
        [WON $],
        'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ = PQSnapshotDate,
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1
    ),
    "Q3", CALCULATE(
        [WON $],
        'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ = PQSnapshotDate,
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1
    ) + CALCULATE(
        [WON $],
        'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1,
        'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */ = "W1",
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = - 2
    ),
    "Q4", CALCULATE(
        [WON $],
        'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ = PQSnapshotDate,
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1
    ) + CALCULATE(
        [WON $],
        'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1,
        'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */ = "W1",
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = - 2
    ) + CALCULATE(
        [WON $],
        'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -2,
        'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */ = "W1",
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = - 3
    )
)

VAR CQtr = CALCULATE(
    [WON $] + [FORECAST $] + [UPSIDE COMMITTED $],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
)

VAR BookingsTarget = CALCULATE(
    [BOOKINGS TARGET],
    'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.FISCAL_YR */ = CYear
)

VAR Result = DIVIDE(
    FQtr + PQtr + CQTR,
    BookingsTarget
)
        

RETURN Result
```

#### CY PROJECTION WEEK 1 %

```dax
VAR CYear = CALCULATE(
    MIN( 'Snapshot Quarter'[SNAPSHOT_YR] /* DB: vw_EBI_Caldate.FISCAL_YR */ ),
    'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)

VAR CurrentQTR = CALCULATE(
    MIN( 'Snapshot Quarter'[SNAPSHOT_GENERIC_QTR] /* DB: vw_EBI_Caldate.SNAPSHOT_GENERIC_QTR */ ),
    'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)

VAR PQSnapshotDate = [PQ EOQ SNAPSHOT DATE]

VAR FQtr = CALCULATE(
    SUMX( vw_EBI_PROJECTION_CLOSE_RATIO,
    [UPSIDE FORECAST PIPE $] * vw_EBI_PROJECTION_CLOSE_RATIO[CLOSE_RATIO]
    ),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ > 0,
    'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ = PQSnapshotDate,
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ IN {"S3", "S4", "S5+"},
    'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.FISCAL_YR */ = CYear
)

VAR PQtr = SWITCH(
    CurrentQTR,
    "Q2", CALCULATE(
        [WON $],
        'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ = PQSnapshotDate,
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1
    ),
    "Q3", CALCULATE(
        [WON $],
        'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ = PQSnapshotDate,
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1
    ) + CALCULATE(
        [WON $],
        'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1,
        'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */ = "W1",
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = - 2
    ),
    "Q4", CALCULATE(
        [WON $],
        'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ = PQSnapshotDate,
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1
    ) + CALCULATE(
        [WON $],
        'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1,
        'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */ = "W1",
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = - 2
    ) + CALCULATE(
        [WON $],
        'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -2,
        'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */ = "W1",
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = - 3
    )
)

VAR CQtr = CALCULATE(
    [WON $] + [FORECAST $] + [UPSIDE COMMITTED $],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
    'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ = PQSnapshotDate
)

VAR BookingsTarget = CALCULATE(
    [BOOKINGS TARGET],
    'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.FISCAL_YR */ = CYear
)

VAR DivResult = DIVIDE(
    FQtr + PQtr + CQTR,
    BookingsTarget
)

// VAR Result = IF(
//     DivResult = BLANK(),
//     0,
//     DivResult
// )

RETURN DivResult
```

#### DEAL WIN RATE %

```dax
DIVIDE([WON #],[WON #]+[LOST #],0)
```

#### DEFAULT COMMIT TYPE

```dax
"GEO_ADJ_COMMIT"
```

#### EOQ SNAPSHOT DATE

```dax
CALCULATE(
    MAX( 'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ ),
    All( 'Snapshot Quarter' ),
    'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = SELECTEDVALUE('Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */) + 1 && 
    'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */ = "W1"
)
```

#### FLM COUNT > 75 CQ CW %

```dax
VAR Reps75 = COUNTROWS(
    CALCULATETABLE(
        FILTER(
            ADDCOLUMNS(
                SUMMARIZE(
                    'Region Hierarchy',
                    'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,
                    'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */
                ),
            "Perf",[MANAGER FORECAST CQ %]
            ),
            [Perf] >=0.75
        )
        , ALL('Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */)
        ,ALL('Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */)
        ,'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1
    )
)

VAR AllReps = CALCULATE(
    COUNTROWS( 'Region Hierarchy' ),
    'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1
)

VAR Result = DIVIDE(
    Reps75,
    AllReps,
    0
)

RETURN Result
```

#### FLM COUNT > 75 YTD CW %

```dax
VAR Reps75 = COUNTROWS(
    CALCULATETABLE(
        FILTER(
            ADDCOLUMNS(
                SUMMARIZE(
                    'Region Hierarchy',
                    'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,
                    'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */
                ),
            "Perf",[YTD PROJECTION %]
            ),
            [Perf] >=0.75
        )
        , ALL('Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */)
        ,ALL('Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */)
        ,'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1
    )
)

VAR AllReps = CALCULATE(
    COUNTROWS( 'Region Hierarchy' )
    ,'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1
    )

VAR Result = DIVIDE(
    Reps75,
    AllReps,
    0
)

RETURN Result
```

#### FLM PARTICIPATION CQ >75 %

```dax
DIVIDE([FLM PARTICIPATION CQ >75% #], [FLM PARTICIPATION TOTAL FLM #],0)
/*VAR Reps75 = 
COUNTROWS(
    FILTER(
        CALCULATETABLE(
            SUMMARIZECOLUMNS(
                'Region Hierarchy'[SLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM_LDAP */,
                'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,
                "Perf", [MANAGER FORECAST CQ %]
            ),
            ALL('Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */),
            ALL('Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */),
            'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = 1
        ),
        [Perf] >= 0.75
    )
)

VAR AllReps = CALCULATE(
    COUNTROWS( 'Region Hierarchy' ),
    'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = 1
)
 
VAR Result = DIVIDE(Reps75,AllReps,0)

RETURN Result*/
```

#### FLM PARTICIPATION CQ >75% #

```dax
COUNTROWS(
    FILTER(
        CALCULATETABLE(
            SUMMARIZECOLUMNS(
                'Region Hierarchy'[SLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM_LDAP */,
                'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,
                "Perf", [MANAGER FORECAST CQ %]
            ),
            ALL('Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */),
            ALL('Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */),
            'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = 1
        ),
        [Perf] >= 0.75
    )
)
```

#### FLM PARTICIPATION TOTAL FLM #

```dax
CALCULATE(
    DISTINCTCOUNT( 'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */ ),
    'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = 1
)
```

#### FLM PARTICIPATION YTD >75 %

```dax
DIVIDE([FLM PARTICIPATION YTD >75% #], [FLM PARTICIPATION TOTAL FLM #],0)
```

#### FLM PARTICIPATION YTD >75% #

```dax
COUNTROWS(
    FILTER(
        CALCULATETABLE(
            SUMMARIZECOLUMNS(
                'Region Hierarchy'[SLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM_LDAP */,
                'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,
                "Perf", [MANAGER FORECAST YTD %]
            ),
            ALL('Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */),
            ALL('Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */),
            'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = 1
        ),
        [Perf] >= 0.75
    )
)
```

#### FORECAST ACCURACY PQ %

```dax
VAR FORECAST = CALCULATE(
    [FORECAST $]
    ,'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1
    ,Pipeline[IS_BOQ] = "TRUE"
    ,'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ IN {"S3" ,"S4" ,"S5+" ,"Booked"}
)

VAR WON = CALCULATE(
    [WON $]
    ,'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1
    ,Pipeline[IS_EOQ] = "TRUE"
    ,'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ IN {"S3" ,"S4" ,"S5+" ,"Booked"},
    --,ALL('Region Hierarchy'[REGION_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REGION_ID */),
    ALL('Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */),
    ALL('Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */)
)

VAR RESULT = DIVIDE(
    FORECAST,
    WON

)

RETURN RESULT
```

#### GEO RANK BASE FLM

```dax
VAR SelectedSalesRegion = MAXX(
        TOPN(
            1,
            SUMMARIZE(
                'Region Hierarchy',
                'Region Hierarchy'[SALES_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SALES_REGION */,
                "Count", COUNT( 'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */ )
            ),
            [Count],
            DESC
        ),
        'Region Hierarchy'[SALES_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SALES_REGION */
    )

VAR Result = CONVERT(
    CALCULATE(
        DISTINCTCOUNT( 'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */ ),
        FILTER(
            ALL( 'Region Hierarchy' ),
            'Region Hierarchy'[SALES_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SALES_REGION */ = SelectedSalesRegion &&
            'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ = "DX" &&
            'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place" &&
            'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active" &&
            'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE() &&
            'Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */ IN {"AE"} &&
            'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE()
        )
    ),
    STRING
)

RETURN "/ " & Result
```

#### GEO RANK BASE REP

```dax
VAR SelectedRegion = SELECTEDVALUE( 'Region Hierarchy'[SALES_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SALES_REGION */ )
VAR SelectedGlobalRegion = SELECTEDVALUE( 'Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */ )
VAR SelectedRoleType = SELECTEDVALUE( 'Region Hierarchy'[ROLE_TYPE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE */ )
VAR SelectedRoletypeDisplay = SELECTEDVALUE( 'Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */ )

VAR Result = SWITCH(
    SelectedRoletypeDisplay,
    "AE", CONVERT(
            COUNTROWS(
                FILTER(
                    ALL( 'Region Hierarchy' ),
                    'Region Hierarchy'[SALES_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SALES_REGION */ = SelectedRegion &&
                    'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ = "DX" &&
                    'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place" &&
                    'Region Hierarchy'[ROLE_TYPE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE */ = SelectedRoleType &&
                    'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active" &&
                    'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1 && 
                    'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE()
                )
            ),
            STRING
    ),
    "PS", CONVERT(
            COUNTROWS(
                FILTER(
                    ALL( 'Region Hierarchy' ),
                    'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ = "DX" &&
                    'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place" &&
                    'Region Hierarchy'[ROLE_TYPE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE */ = SelectedRoleType &&
                    'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active" &&
                    'Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */ = SelectedGlobalRegion &&
                    'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1 && 
                    'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE()
                )
            ),
            STRING
        )
)
    

RETURN "/ " & Result
```

#### GEO RANK FLM

```dax
VAR SelectedSalesRegion = MAXX(
        TOPN(
            1,
            SUMMARIZE(
                'Region Hierarchy',
                'Region Hierarchy'[SALES_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SALES_REGION */,
                "Count", COUNT( 'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */ )
            ),
            [Count],
            DESC
        ),
        'Region Hierarchy'[SALES_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SALES_REGION */
    )

VAR RegHieOnSalesRegion = SUMMARIZE(
    FILTER(
        ALL( 'Region Hierarchy' ),
        'Region Hierarchy'[SALES_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SALES_REGION */ = SelectedSalesRegion &&
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ = "DX" &&
        'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place" &&
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active" &&
        'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE() &&
        'Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */ IN {"AE"} && 
        'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE()
    ),
    'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */
)

VAR Result = RANKX(
    RegHieOnSalesRegion,
    [OVERALLSCORE(A+B+C+D)FLM]
)

RETURN Result
```

#### GEO RANK REP

```dax
VAR SelectedRegion = SELECTEDVALUE( 'Region Hierarchy'[SALES_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SALES_REGION */ )
VAR SelectedGlobalRegion = SELECTEDVALUE( 'Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */ )
VAR SelectedRoletype = SELECTEDVALUE( 'Region Hierarchy'[ROLE_TYPE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE */ )
VAR SelectedRoletypeDisplay = SELECTEDVALUE( 'Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */ )

VAR Result = SWITCH(
    SelectedRoletypeDisplay,
        "AE", RANKX(
            FILTER(
            ALL( 'Region Hierarchy' ),
            'Region Hierarchy'[SALES_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SALES_REGION */ = SelectedRegion &&
            'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ = "DX" &&
            'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place" &&
            'Region Hierarchy'[ROLE_TYPE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE */ = SelectedRoleType &&
            'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active" &&
            'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1 && 
            'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE()
        ),
        [OVERALL SCORE(A+B+C+D)REP]
    ),
        "PS", RANKX(
            FILTER(
            ALL( 'Region Hierarchy' ),
            'Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */ = SelectedGlobalRegion &&
            'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ = "DX" &&
            'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place" &&
            'Region Hierarchy'[ROLE_TYPE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE */ = SelectedRoleType &&
            'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active" &&
            'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1 && 
            'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE()
        ),
        [OVERALL SCORE(A+B+C+D)REP]
    )
)

RETURN Result
```

#### GROSS CREATED YTD %

```dax
VAR GrossCreatedPCT = DIVIDE(
    [GROSS CREATED YTD $],
    [GROSS CREATION YTD]
)

VAR Result = IF(
    [GROSS CREATION YTD] < 1,
    0,
    GrossCreatedPCT
)

RETURN Result
```

#### GROSS CREATION %

```dax
VAR GrossCreationPCT = DIVIDE(
    [OPPTY $],
    [GROSS CREATION QTD]
)

// VAR Result = IF(
//     [GROSS CREATION QTD] = 0,
//     0,
//     GrossCreationPCT
// )

RETURN GrossCreationPCT
```

#### GROSS CREATION MTD %

```dax
VAR GrossCreationPCT = DIVIDE(
    [GROSS CREATED MTD $],
    [GROSS CREATION MTD]
)

VAR Result = IF(
    [GROSS CREATION MTD] < 1,
    0,
    GrossCreationPCT
)

RETURN Result
```

#### GROSS CREATION QTD %

```dax
VAR GrossCreationPCT = DIVIDE(
    [GROSS CREATED QTD $],
    [GROSS CREATION QTD]
)

VAR Result = IF(
    [GROSS CREATION QTD] < 1,
    0,
    GrossCreationPCT
)

RETURN Result
```

#### GROSS CREATION WTD %

```dax
VAR GrossCreationPCT = DIVIDE(
    [GROSS CREATED WTD $],
    [GROSS CREATION WTD]
)

RETURN GrossCreationPCT
```

#### GROSS CREATION YTD %

```dax
VAR GrossCreationPCT = DIVIDE(
    [GROSS CREATED YTD $],
    [GROSS CREATION YTD]
)

VAR Result = IF(
    [GROSS CREATION YTD] < 1,
    0,
    GrossCreationPCT
)

RETURN Result
```

#### GROWTH PIPE ATTAINMENT %

```dax
DIVIDE(
    [GROWTH PIPE QTD $],
    [FULL QUARTER NET PIPE CREATION],
    0
)
```

#### GROWTH PIPE ATTAINMENT QTD %

```dax
DIVIDE(
    [GROWTH PIPE QTD $],
    [NET PIPE CREATION QTD],
    0
)
```

#### IDLE OPPTY %

```dax
VAR IdleOppty = CALCULATE(
    [OPEN OPPTY $],
    Pipeline[DAYS_SINCE_NEXT_STEPS_MODIFIED_BAND] = "30+ days"
)

VAR Result = DIVIDE(
    IdleOppty,
    [OPEN OPPTY $]
    )

Return Result
```

#### MANAGER FORECAST CQ %

```dax
VAR MForeCQ = CALCULATE(
    [W+F+UC %],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
)

// VAR Result = IF(
//     MForeCQ = BLANK(),
//     0,
//     MForeCQ
// )

RETURN MForeCQ
```

#### MANAGER FORECAST CQ-1 %

```dax
VAR PQMaxDate = [PQ EOQ SNAPSHOT DATE]

VAR MForeCQ = CALCULATE(
    [W+F+UC %],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1,
    'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ = PQMaxDate,
    ALL('Snapshot Quarter')
)

// VAR Result = IF(
//     MForeCQ = BLANK(),
//     0,
//     MForeCQ
// )

RETURN MForeCQ
```

#### MANAGER FORECAST YTD %

```dax
[W+F+UC YTD %]
```

#### MULTI SOLUTION ASV %

```dax
VAR MuliSolASV = CALCULATE([OPPTY $],Pipeline[MULTI_SOLUTION_FLAG_DESC] = "Multi")

VAR Result = DIVIDE(MuliSolASV,[OPPTY $],0)

Return Result
```

#### NET CHANGE WTD %

```dax
DIVIDE([NET CHANGE WTD $],[PREV WEEK PIPE $],0)
```

#### OPEN OPPTY W/W ~ # %

```dax
VAR SelectedFreq = SELECTEDVALUE(
    'Daily Weekly Switch'[Frequency],
    "Daily"
)

VAR PrevOppty = SWITCH(
    SelectedFreq,
    "Daily",CALCULATE(
        [OPEN OPPTY #],
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ IN {"-1"}
        ),
    "Weekly",CALCULATE(
        [OPEN OPPTY #],
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT_RTB] /* DB: vw_EBI_Caldate.SNAPSHOT_WEEK_BKT_RTB */ IN {"-1"}
        )
    )

VAR Result = DIVIDE([OPEN OPPTY W/W ~ #],PrevOppty)

return Result
```

#### OPEN OPPTY W/W ~ %

```dax
VAR SelectedFreq = SELECTEDVALUE(
    'Daily Weekly Switch'[Frequency],
    "Daily"
)

VAR PrevOppty = SWITCH(
    SelectedFreq,
    "Daily",CALCULATE(
        [OPEN OPPTY $],
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ IN {"-1"}
        ),
    "Weekly",CALCULATE(
        [OPEN OPPTY $],
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT_RTB] /* DB: vw_EBI_Caldate.SNAPSHOT_WEEK_BKT_RTB */ IN {"-1"}
        )
    )


VAR Result = DIVIDE([OPEN OPPTY W/W ~ $],PrevOppty)

return Result
```

#### OPEN STALLED PIPE %

```dax
VAR TotalPipe =
    CALCULATE (
        [UPSIDE FORECAST PIPE $],
        'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ IN { "S3", "S4", "S5+" }
    )
VAR StalledInactive =
    CALCULATE ( 
        [UPSIDE FORECAST PIPE $],
        'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ IN { "S3", "S4", "S5+" },
        Pipeline[STALLED_BUT_INACTIVE] = "Stalled & Inactive" 
    )
VAR StalledPipePct =
    DIVIDE ( StalledInactive, TotalPipe )
VAR Result =
    IF (
        TotalPipe = 0,
        0,
        StalledPipePct
    )
RETURN Result
```

#### PARTNER INFLUENCE BOOKING PQ %

```dax
VAR PARTNER_INFLUENCE = CALCULATE(
    [OPPTY $]
    ,'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1
    ,'Partner Created'[PARTNER_CREATED] /* DB: vw_EBI_PARTNER_CREATED.PARTNER_CREATED */ IN {"Partner Co-Sell","Partner Created"}
    ,'Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */ = "Closed - Booked"
    ,Pipeline[IS_EOQ] = "TRUE"
)

VAR TOTAL_BOOKINGS = CALCULATE(
    [OPPTY $]
    ,'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1
    ,'Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */ = "Closed - Booked"
    ,Pipeline[IS_EOQ] = "TRUE"
)

VAR RESULT = DIVIDE(
    PARTNER_INFLUENCE,
    TOTAL_BOOKINGS
)

RETURN RESULT
```

#### PARTNER INFLUENCE PIPE (CY) %

```dax
VAR PARTNER_INFLUENCE = CALCULATE(
    [PIPE $] + [WON $]
    ,'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0
    ,'Partner Created'[PARTNER_CREATED] /* DB: vw_EBI_PARTNER_CREATED.PARTNER_CREATED */ IN {"Partner Co-Sell","Partner Created"}
    ,'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ IN {"S3" ,"S4" ,"S5+" ,"Booked"}
    ,'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
)

VAR TOTAL_BOOKINGS = CALCULATE(
    [PIPE $]+[UPSIDE FORECAST PIPE $]
    ,'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0
    ,'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ IN {"S3" ,"S4" ,"S5+" ,"Booked"}
    ,'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
)

VAR RESULT = DIVIDE(
    PARTNER_INFLUENCE,
    TOTAL_BOOKINGS
)

RETURN RESULT
```

#### PERFORMANCE YTD %

```dax
VAR PerfPCT = DIVIDE(
    [W+F+UC PIPE YTD $],
    [BOOKINGS TARGET YTD]
)

// VAR Result = IF(
//     [BOOKINGS TARGET YTD] = 0,
//     0,
//     PerfPCT
// )

RETURN PerfPCT
```

#### PIPELINE ATTAINMENT %

```dax
DIVIDE(
    [W+F+UC $],
    [BOOKINGS TARGET]
)
```

#### PQ EOQ SNAPSHOT DATE

```dax
CALCULATE(
    MAX( 'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ ),
    ALL( 'Snapshot Quarter' ),
    'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
    'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */ = "W1"
)
```

#### REP PARTICIPATION CQ >75 %

```dax
DIVIDE([REP PARTICIPATION CQ >75 % #], [REP PARTICIPATION TOTAL REPS #],0)
```

#### REP PARTICIPATION CQ >75 % #

```dax
COUNTROWS(
    FILTER(
        CALCULATETABLE(
            SUMMARIZECOLUMNS(
                'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,
                'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */,
                "Perf", [MANAGER FORECAST CQ %]
            ),
            ALL('Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */),
            ALL('Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */),
            'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1
        ),
        [Perf] >= 0.75
    )
)
```

#### REP PARTICIPATION TOTAL REPS #

```dax
CALCULATE
(
    COUNTROWS( 'Region Hierarchy' ),
    'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1
)
```

#### REP PARTICIPATION YTD >75 %

```dax
DIVIDE([REP PARTICIPATION YTD >75 % #], [REP PARTICIPATION TOTAL REPS #],0)
/*VAR Reps75 = 
COUNTROWS(
    FILTER(
        CALCULATETABLE(
            SUMMARIZECOLUMNS(
                'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,
                'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */,
                "Perf", [MANAGER FORECAST YTD %]
            ),
            ALL('Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */),
            ALL('Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */),
            'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1
        ),
        [Perf] >= 0.75
    )
)

VAR AllReps = CALCULATE(
    COUNTROWS( 'Region Hierarchy' ),
    'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1
)
 
VAR Result = DIVIDE(Reps75,AllReps,0)

RETURN Result*/
```

#### REP PARTICIPATION YTD >75 % #

```dax
COUNTROWS(
    FILTER(
        CALCULATETABLE(
            SUMMARIZECOLUMNS(
                'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,
                'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */,
                "Perf", [MANAGER FORECAST YTD %]
            ),
            ALL('Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */),
            ALL('Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */),
            'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1
        ),
        [Perf] >= 0.75
    )
)
```

#### S3 %

```dax
CALCULATE(
    [S3 $]/[PIPE $],
    ALL('Sales Stage')
)
```

#### S3>180D %

```dax
var S3Pipe = CALCULATE(
    [PIPE $],
    'Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */ = "S3")

var Numerator = CALCULATE(
    [PIPE $],
    'Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */ = "S3",
    Pipeline[STAGE_DURATION] IN {"180-270 days","270+ days"})

var Result = DIVIDE(Numerator,S3Pipe,0)

return Result
```

#### S4 %

```dax
CALCULATE(
    [S4 $]/[PIPE $],
    ALL('Sales Stage')
)
```

#### S4>180D %

```dax
var S4Pipe = CALCULATE(
    [PIPE $],
    'Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */ = "S4")

var Numerator = CALCULATE(
    [PIPE $],
    'Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */ = "S4",
    Pipeline[STAGE_DURATION] IN {"180-270 days","270+ days"})

var Result = DIVIDE(Numerator,S4Pipe,0)

return Result
```

#### S5+ COVERAGE LEFT TO GO %

```dax
VAR COVPCT = DIVIDE(
    [SS5+ $],
    [TARGET LEFT TO GO $]
)

VAR Result = IF(
    [TARGET LEFT TO GO $] = 0,
    0,
    COVPCT
)

RETURN Result
```

#### SLM COUNT > 75 CQ CW %

```dax
VAR Reps75 = COUNTROWS(
    CALCULATETABLE(
        FILTER(
            ADDCOLUMNS(
                SUMMARIZE(
                    'Region Hierarchy',
                    'Region Hierarchy'[SLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM_LDAP */,
                    'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */
                ),
            "Perf",[MANAGER FORECAST CQ %]
            ),
            [Perf] >=0.75
        )
        , ALL('Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */)
        ,ALL('Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */)
        ,'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1
    )
)

VAR AllReps = CALCULATE(
    COUNTROWS( 'Region Hierarchy' ),
    'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1
)

VAR Result = DIVIDE(
    Reps75,
    AllReps,
    0
)

RETURN Result
```

#### SLM COUNT > 75 YTD CW %

```dax
VAR Reps75 = COUNTROWS(
    CALCULATETABLE(
        FILTER(
            ADDCOLUMNS(
                SUMMARIZE(
                    'Region Hierarchy',
                    'Region Hierarchy'[SLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM_LDAP */,
                    'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */
                ),
            "Perf",[YTD PROJECTION %]
            ),
            [Perf] >=0.75
        )
        , ALL('Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */)
        ,ALL('Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */)
        ,'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1
    )
)

VAR AllReps = CALCULATE(
    COUNTROWS( 'Region Hierarchy' )
    ,'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1
    )

VAR Result = DIVIDE(
    Reps75,
    AllReps,
    0
)

RETURN Result
```

#### SS5+ %

```dax
CALCULATE(
    [SS5+ $]/[PIPE $],
    All('Sales Stage')
)
```

#### Stalled & Inactive %

```dax
VAR Result = DIVIDE(
    [Stalled & Inactive $],
    [PIPE $]
)

RETURN Result
```

#### TEAM PARTICIPATION CQ >50 %

```dax
DIVIDE([TEAM PARTICIPATION CQ >50 % #], [TEAM PARTICIPATION TOTAL FLM #],0)
```

#### TEAM PARTICIPATION CQ >50 % #

```dax
COUNTROWS
(
        CALCULATETABLE
	(
        FILTER
	(
            SUMMARIZECOLUMNS('Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,"Perf", [FLM COUNT > 75 CQ CW %]),
              [Perf] >=0.5
        ),
       'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE,
       'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota"
       )
)
```

#### TEAM PARTICIPATION TOTAL FLM #

```dax
CALCULATE(
    DISTINCTCOUNT( 'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */ ),
    'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = 1
)
```

#### TEAM PARTICIPATION YTD >50 %

```dax
DIVIDE([TEAM PARTICIPATION YTD >50 % #], [TEAM PARTICIPATION TOTAL FLM #],0)
```

#### TEAM PARTICIPATION YTD >50 % #

```dax
COUNTROWS
(
        CALCULATETABLE
	(
        FILTER
	(
            SUMMARIZECOLUMNS('Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,"Perf", [FLM COUNT > 75 YTD CW %]),
              [Perf] >=0.5
        ),
       'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE,
       'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota"
       )
)
```

#### W+F+UC %

```dax
VAR ForcastPCT = DIVIDE(
    [WON $]+[FORECAST $]+[UPSIDE COMMITTED $],
    [BOOKINGS TARGET]
)

// VAR Result = IF(
//     [BOOKINGS TARGET] = 0,
//     BLANK(),
//     ForcastPCT
// )

RETURN ForcastPCT
```

#### W+F+UC YTD %

```dax
DIVIDE
(
    [W+F+UC PIPE YTD $],
    [BOOKINGS TARGET YTD],
    0
)
```

#### WON ATTAINMENT %

```dax
VAR WonByTarget = DIVIDE(
        [WON $],
        [BOOKINGS TARGET]
    )

VAR Result = IF(
    ISBLANK(
        WonByTarget
        ),
        BLANK(),
        IF(
    [BOOKINGS TARGET] = 0,
    0,
    WonByTarget
)
)

RETURN Result
```

#### YTD PROJECTION %

```dax
VAR Pipe = CALCULATE(
    [PERFORMANCE YTD %],
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
)
// VAR Result = IF(
//     Pipe = BLANK(),
//     0,
//     Pipe
// )

RETURN Pipe
```

**REP HISTORIC PERFORMANCE:**

#### PY Attainment %

```dax
MAX('Performance Historic'[ATTAINMENT] /* DB: dataset_table.ATTAINMENT */)
```

#### PY QUOTA $

```dax
SUM('Performance Historic'[QUOTA] /* DB: dataset_table.QUOTA */)
```

#### PY WON $

```dax
SUM('Performance Historic'[WON] /* DB: dataset_table.WON */)
```

### 3.8. _Pipeline Measures (77 measures) — DB: measure-only

#### ACTIVE & UPDATED $

```dax
CALCULATE(
    [PIPE $],
    Pipeline[STALLED_BUT_INACTIVE] = "Active"
)
```

#### ASV $

```dax
CALCULATE(SUM(Pipeline[OPPTY]), 'Pay Measure'[PAY_MEASURE_DISPLAY] /* DB: vw_EBI_PAY_MEASURE.PAY_MEASURE_DISPLAY */ = "ASV")
```

#### AVG DEAL DURATION #

```dax
DIVIDE(SUM(Pipeline[DEAL_DURATION]),DISTINCTCOUNT(Pipeline[P2S_ID]))
```

#### AVG DEAL SIZE $

```dax
DIVIDE([OPPTY $],[OPP #],0)
```

#### BOOKINGS TARGET YTD

```dax
VAR CYear = CALCULATE(
    MIN( 'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.FISCAL_YR */ ),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)

VAR Result = CALCULATE(
    [BOOKINGS TARGET],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0,
    'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.FISCAL_YR */ = CYear
)

RETURN Result
```

#### BOQ MATURE PIPE $

```dax
CALCULATE(
    [SS5+ $],
    Pipeline[IS_BOQ] = "TRUE",
    ALL( 'Snapshot Quarter' ),
    ALL('Daily Weekly Switch'[Frequency])
)
```

#### BOQ PIPE $

```dax
CALCULATE(
    [PIPE $],
    Pipeline[IS_BOQ] = "TRUE",
    ALL( 'Snapshot Quarter' ),
    ALL('Daily Weekly Switch'[Frequency])
)
```

#### CLOSE RATE

```dax
VAR CURR_WON = CALCULATE([OPPTY $], Pipeline[BOQ S3+ Flag] = 1, Pipeline[ADJ_COMMITMENT] = "Won", 'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)
VAR BOQ_PIPE = CALCULATE('_Pipeline Measures'[PIPE $], 'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */ = "W1")
RETURN
DIVIDE (CURR_WON, BOQ_PIPE)
```

#### CLOSE RATIO

```dax
VAR WON = CALCULATE([WON $],Pipeline[IS_EOQ] = "TRUE")

VAR BOQ_PIPE = CALCULATE([PIPE $], Pipeline[IS_BOQ] = "TRUE")

RETURN DIVIDE (WON, BOQ_PIPE)
```

#### FORECAST $

```dax
VAR SelectedCommit = SELECTEDVALUE(
    'Commit Type'[COMMIT_TYPE] /* DB: vw_EBI_COMMIT_ROLE_MAPPING.COMMIT_TYPE */,
    [DEFAULT COMMIT TYPE]
)

VAR Result = SWITCH(
    true(),
    SelectedCommit = "MGR_ADJ_COMMIT", CALCULATE(
        [PIPE $],
        Pipeline[MGR_ADJ_COMMIT] = "Forecast"
    ),

    SelectedCommit = "ADJ_COMMITMENT",  CALCULATE(
        [PIPE $],
        Pipeline[ADJ_COMMITMENT] = "Forecast"
    ),

    SelectedCommit = "GEO_ADJ_COMMIT",  CALCULATE(
        [PIPE $],
        Pipeline[GEO_ADJ_COMMIT] = "Forecast"
    ),

    SelectedCommit = "PS_ADJ_COMMIT",  CALCULATE(
        [PIPE $],
        Pipeline[PS_ADJ_COMMITMENT] = "Forecast"
    )
)

RETURN Result
```

#### GAP -VE GROSS CREATED VS GROSS CREATION TARGET QTD $

```dax
Var Gap = [GROSS CREATED QTD $] - [GROSS CREATION QTD]

Var Result = IF(Gap>0,0,Gap)

Return Result
```

#### GAP -VE GROWTH PIPE VS FULL NET CREATION TARGET $

```dax
Var Gap = [GROWTH PIPE QTD $] - [FULL QUARTER NET PIPE CREATION]

Var Result = IF(Gap>0,0,Gap)

Return Result
```

#### GAP -VE GROWTH PIPE VS NET CREATION TARGET QTD $

```dax
Var Gap = [GROWTH PIPE QTD $] - [NET PIPE CREATION QTD]

Var Result = IF(Gap>0,0,Gap)

Return Result
```

#### GAP -VE GROWTH PIPE VS NET CREATION TARGET WTD $

```dax
Var Gap = [GROWTH PIPE WTD $] - [NET PIPE CREATION WTD]

Var Result = IF(Gap>0,0,Gap)

Return Result
```

#### GAP -VE OPPTY VS CREATION TARGET QTD $

```dax
Var Gap = [OPPTY $] - [GROSS CREATION QTD]

Var Result = IF(Gap>0,0,Gap)

Return Result
```

#### GAP -VE OPPTY VS CREATION TARGET WTD $

```dax
Var Gap = [OPPTY WTD $] - [GROSS CREATION WTD]

Var Result = IF(Gap>0,0,Gap)

Return Result
```

#### GAP -VE PIPE VS PIPE TARGET $

```dax
Var Gap = [PIPE $] - [PIPE TARGET]

Var Result = IF(Gap>0,0,Gap)

Return Result
```

#### GAP -VE S5+ PIPE VS S5+ PIPE TARGET $

```dax
Var Gap = [SS5+ $] - [PIPE TARGET SS5]

Var Result = IF(Gap>0,0,Gap)

Return Result
```

#### GAP TO GO $

```dax
[PIPE $] - [PIPE TARGET TO GO]
```

#### GPC  Q1

```dax
VAR QTRBKT = SELECTEDVALUE('Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */)
VAR GenQTR = SELECTEDVALUE('Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */)

Return if (AND(MAX('Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */) = "Q1", MAX('Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */) in { -3,-2,-1}),
    CALCULATE(        [OPPTY $],                                                                

            AND('Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = QTRBKT+1 , 'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */ = "W1"),

        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ in {QTRBKT, QTRBKT+1, QTRBKT+2, QTRBKT+3,QTRBKT+4}

    ), 
    if( AND(MAX('Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */) = "Q1", MAX('Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */) = 0),
      CALCULATE(  [OPPTY $],                                                                

            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0",

        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ in {QTRBKT, QTRBKT+1, QTRBKT+2, QTRBKT+3,QTRBKT+4}

    ), 0
    )
)
```

#### GPC  Q2

```dax
VAR QTRBKT = SELECTEDVALUE('Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */)
VAR GenQTR = SELECTEDVALUE('Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */)

Return if (AND(MAX('Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */) = "Q2", MAX('Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */) in { -2,-1}),
    CALCULATE(        [OPPTY $],                                                                

            AND('Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = QTRBKT+1 , 'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */ = "W1"),

        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ in {QTRBKT, QTRBKT+1, QTRBKT+2, QTRBKT+3,QTRBKT+4}

    ), 
    if( AND(MAX('Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */) = "Q2", MAX('Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */) = 0),
      CALCULATE(  [OPPTY $],                                                                

            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0",

        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ in {QTRBKT, QTRBKT+1, QTRBKT+2, QTRBKT+3,QTRBKT+4}

    ), 0
    )
)
```

#### GPC  Q3

```dax
VAR QTRBKT = SELECTEDVALUE('Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */)
VAR GenQTR = SELECTEDVALUE('Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */)

Return if (AND(MAX('Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */) = "Q3", MAX('Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */) = -1 ),
    CALCULATE(        [OPPTY $],                                                                

            AND('Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = QTRBKT+1 , 'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */ = "W1"),

        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ in {QTRBKT, QTRBKT+1, QTRBKT+2, QTRBKT+3,QTRBKT+4}

    ), 
    if( AND(MAX('Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */) = "Q3", MAX('Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */) = 0),
      CALCULATE(  [OPPTY $],                                                                

            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0",

        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ in {QTRBKT, QTRBKT+1, QTRBKT+2, QTRBKT+3,QTRBKT+4}

    ), 0
    )
)
```

#### GPC  Q4

```dax
VAR QTRBKT = SELECTEDVALUE('Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */)
VAR GenQTR = SELECTEDVALUE('Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */)

Return     if( AND(MAX('Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */) = "Q4", MAX('Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */) = 0),
      CALCULATE(  [OPPTY $],                                                                

            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0",

        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ in {QTRBKT, QTRBKT+1, QTRBKT+2, QTRBKT+3,QTRBKT+4}

    ), 0
    )
```

#### GROSS CREATED MONTHLY (YTD) $

```dax
VAR SelectedMonth = MIN('Qualification Quarter'[YR_MONTH_KEY] /* DB: vw_EBI_Caldate.YR_MONTH_KEY */)
VAR SelectedYear  = MIN('Qualification Quarter'[QUALIFICATION_YR] /* DB: vw_EBI_Caldate.QUALIFICATION_YR */)

-- Check if month is filtered
VAR IsMonthFiltered = ISFILTERED('Qualification Quarter'[YR_MONTH_KEY] /* DB: vw_EBI_Caldate.YR_MONTH_KEY */)

-- Determine current month to use (selected or latest in selected year)
VAR CurrentMonthBkt =
    IF(
        IsMonthFiltered,
        SelectedMonth,
        CALCULATE(
            MAX('Qualification Quarter'[YR_MONTH_KEY] /* DB: vw_EBI_Caldate.YR_MONTH_KEY */),
            FILTER(
                ALL('Qualification Quarter'),
                'Qualification Quarter'[QUALIFICATION_YR] /* DB: vw_EBI_Caldate.QUALIFICATION_YR */ = SelectedYear
            )
        )
    )

RETURN
CALCULATE(
    [GROSS CREATED QTD $],
    FILTER(
        ALL('Qualification Quarter'),
        'Qualification Quarter'[QUALIFICATION_YR] /* DB: vw_EBI_Caldate.QUALIFICATION_YR */ = SelectedYear &&
        'Qualification Quarter'[YR_MONTH_KEY] /* DB: vw_EBI_Caldate.YR_MONTH_KEY */ <= CurrentMonthBkt
    )
)
```

#### GROSS CREATED MTD $

```dax
VAR SelectedQtr = SELECTEDVALUE('Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */)
VAR Yr = VALUE(LEFT(SelectedQtr, 4))
VAR SelectedQtrBkt = MIN('Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */)

-- Determine if a month is selected
VAR IsMonthFiltered = ISFILTERED('Qualification Quarter'[MONTH_BKT] /* DB: vw_EBI_Caldate.MONTH_BKT */)

-- Use selected month or default to latest month in selected quarter
VAR CurrentMonthBkt =
    IF(
        IsMonthFiltered,
        MIN('Qualification Quarter'[MONTH_BKT] /* DB: vw_EBI_Caldate.MONTH_BKT */),
        CALCULATE(
            MAX('Qualification Quarter'[MONTH_BKT] /* DB: vw_EBI_Caldate.MONTH_BKT */),
            'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedQtrBkt
        )
    )

RETURN
CALCULATE (
    [GROSS CREATED QTD $],
    
    FILTER (
        ALL('Qualification Quarter'),
        'Qualification Quarter'[QUALIFICATION_YR] /* DB: vw_EBI_Caldate.QUALIFICATION_YR */ = Yr &&
        'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedQtrBkt &&
        'Qualification Quarter'[MONTH_BKT] /* DB: vw_EBI_Caldate.MONTH_BKT */ <= CurrentMonthBkt
    )
)
```

#### GROSS CREATED QTD $

```dax
VAR IsFiltered1 = ISFILTERED('Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */)
VAR SelectedQtrs = VALUES('Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */)
VAR QtrCount = IF(IsFiltered1, COUNTROWS(SelectedQtrs), 0)

RETURN
IF(
    QtrCount >= 1,

SUMX (
    VALUES ( 'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */ ),
    VAR CurrentQtr = 'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */
    VAR CurrentQtrBkt =
        COALESCE(CALCULATE (
            MIN ( 'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ ),
            'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */ = CurrentQtr
        ),0)
    RETURN
    IF(
            CurrentQtrBkt >= 0,
        CALCULATE 
        (
            [OPPTY $],
            'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = CurrentQtrBkt,
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ IN {
                CurrentQtrBkt,
                CurrentQtrBkt + 1,
                CurrentQtrBkt + 2,
                CurrentQtrBkt + 3,
                CurrentQtrBkt + 4
            },
            KEEPFILTERS (
                NOT 'Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */ IN {
                    "S1",
                    "S2",
                    "Closed CleanUp from Non Pipe",
                    "Closed Lost from Non Pipe"
                }
            )
        )
        ,
         CALCULATE 
        (
            [OPPTY $],
            'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = CurrentQtrBkt,
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ IN {
                CurrentQtrBkt,
                CurrentQtrBkt + 1,
                CurrentQtrBkt + 2,
                CurrentQtrBkt + 3,
                CurrentQtrBkt + 4
            },
            KEEPFILTERS (
                NOT 'Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */ IN {
                    "S1",
                    "S2",
                    "Closed CleanUp from Non Pipe",
                    "Closed Lost from Non Pipe"
                }
            ),
            FILTER(ALL('Snapshot Quarter'),'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ = [EOQ SNAPSHOT DATE]
        )
)

)),
IF(
    QtrCount =0,
VAR CurrentQtr = CALCULATE (
            MIN ( 'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */ ),
            'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = 0
        )
VAR CurrentQtrBkt = 0
RETURN
CALCULATE 
        (
            [OPPTY $],
            'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = CurrentQtrBkt,
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ IN {
                CurrentQtrBkt,
                CurrentQtrBkt + 1,
                CurrentQtrBkt + 2,
                CurrentQtrBkt + 3,
                CurrentQtrBkt + 4
            },
            KEEPFILTERS (
                NOT 'Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */ IN {
                    "S1",
                    "S2",
                    "Closed CleanUp from Non Pipe",
                    "Closed Lost from Non Pipe"
                }
            )
        )
)
)
```

#### GROSS CREATED WTD $

```dax
VAR CurrentQtr = CALCULATE(
    MIN(
        'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */
    ),
    ALL( 'Qualification Quarter' ),
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = 0
)

VAR SelectedQTR = SELECTEDVALUE(
    'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */,
    CurrentQtr
)

VAR SelectedQTRBKT = CALCULATE(
    MIN( 'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ ),
    'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */ = SelectedQTR
)

VAR Result = CALCULATE(
    [OPPTY WTD $],
    'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedQTRBKT,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ in {SelectedQTRBKT, SelectedQTRBKT+1, SelectedQTRBKT+2, SelectedQTRBKT+3, SelectedQTRBKT+4},
    KEEPFILTERS( NOT 'Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */ IN {"S1", "S2", "Closed CleanUp from Non Pipe", "Closed Lost from Non Pipe"} )
)

RETURN Result
```

#### GROSS CREATED YTD $

```dax
VAR SelectedQtr = SELECTEDVALUE('Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */)
VAR Yr = VALUE(LEFT(SelectedQtr, 4))
VAR QtrBkt = LOOKUPVALUE('Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */, 'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */, SelectedQtr)

VAR IsFiltered1 = NOT ISBLANK(SelectedQtr)
VAR CurrentYr = VALUE(LEFT(LOOKUPVALUE('Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */, 'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */, 0), 4))
VAR CurrentQtrBkt = 0

RETURN
IF(
    IsFiltered1,
    // Row-level: Use filtered quarter
    CALCULATE(
        [GROSS CREATED QTD $],
        FILTER(
            ALL('Qualification Quarter'),
            'Qualification Quarter'[QUALIFICATION_YR] /* DB: vw_EBI_Caldate.QUALIFICATION_YR */ = Yr &&
            'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ <= QtrBkt
        )
    ),
    // Total-level: Use latest quarter's year and calculate YTD
    CALCULATE(
        [GROSS CREATED QTD $],
        FILTER(
            ALL('Qualification Quarter'),
            'Qualification Quarter'[QUALIFICATION_YR] /* DB: vw_EBI_Caldate.QUALIFICATION_YR */ = CurrentYr &&
            'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ <= CurrentQtrBkt
        )
    )
)
```

#### GROWTH PIPE QTD $

```dax
CALCULATE([NET CHANGE $],ALL('Qualification Quarter'))
```

#### GROWTH PIPE QTD TREND $

```dax
VAR Selected_Qual_Qtr =
    SELECTEDVALUE ( 'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */ )
VAR Selected_Qual_Wk =
    SELECTEDVALUE ( 'Qualification Quarter'[QUALIFICATION_WEEK_NUMBER] /* DB: vw_EBI_Caldate.QUALIFICATION_WEEK_NUMBER */ )
VAR NetChange =
    CALCULATE (
        [NET CHANGE $],
        'Snapshot Quarter'[SNAPSHOT_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ = Selected_Qual_Qtr,
        'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */ = Selected_Qual_Wk,
        ALL ( 'Qualification Quarter' )
    )

VAR RESULT = IF(
    SELECTEDVALUE( 'Qualification Quarter'[QUALIFICATION_WEEK_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_WEEK_BKT */ ) = "Future Weeks",
    BLANK(),
    NetChange
)
RETURN
    Result
```

#### GROWTH PIPE WTD $

```dax
CALCULATE([NET CHANGE WTD $],ALL('Qualification Quarter'))
```

#### IDLE OPPTY #

```dax
VAR IdleOppty = CALCULATE(
    [OPEN OPPTY #],
    Pipeline[DAYS_SINCE_NEXT_STEPS_MODIFIED_BAND] = "30+ days"
)

VAR Result = DIVIDE(
    IdleOppty,
    [OPEN OPPTY #]
    )

Return Result
```

#### LINEARITY GAP $

```dax
[WON $] - [LINEARITY TARGET $]
```

#### LOST #

```dax
VAR SelectedCommit = SELECTEDVALUE(
    'Commit Type'[COMMIT_TYPE] /* DB: vw_EBI_COMMIT_ROLE_MAPPING.COMMIT_TYPE */,
    [DEFAULT COMMIT TYPE]
)

VAR Result = SWITCH(
    true(),
    SelectedCommit = "MGR_ADJ_COMMIT", CALCULATE(
        [OPP #],
        Pipeline[MGR_ADJ_COMMIT] = "Lost"
    ),

    SelectedCommit = "ADJ_COMMITMENT",  CALCULATE(
        [OPP #],
        Pipeline[ADJ_COMMITMENT] = "Lost"
    ),

    SelectedCommit = "GEO_ADJ_COMMIT",  CALCULATE(
        [OPP #],
        Pipeline[GEO_ADJ_COMMIT] = "Lost"
    ),

    SelectedCommit = "PS_ADJ_COMMIT",  CALCULATE(
        [OPP #],
        Pipeline[PS_ADJ_COMMITMENT] = "Lost"
    )
)

RETURN Result
```

#### LOST $

```dax
VAR SelectedCommit = SELECTEDVALUE(
    'Commit Type'[COMMIT_TYPE] /* DB: vw_EBI_COMMIT_ROLE_MAPPING.COMMIT_TYPE */,
    [DEFAULT COMMIT TYPE]
)

VAR Result = SWITCH(
    true(),
    SelectedCommit = "MGR_ADJ_COMMIT", CALCULATE(
        [OPPTY $],
        Pipeline[MGR_ADJ_COMMIT] = "Lost"
    ),

    SelectedCommit = "ADJ_COMMITMENT",  CALCULATE(
        [OPPTY $],
        Pipeline[ADJ_COMMITMENT] = "Lost"
    ),

    SelectedCommit = "GEO_ADJ_COMMIT",  CALCULATE(
        [OPPTY $],
        Pipeline[GEO_ADJ_COMMIT] = "Lost"
    ),

    SelectedCommit = "PS_ADJ_COMMIT",  CALCULATE(
        [OPPTY $],
        Pipeline[PS_ADJ_COMMITMENT] = "Lost"
    )
)

RETURN Result
```

#### MATURE PIPE NET CHANGE $

```dax
[SS5+ $] - [BOQ MATURE PIPE $]
```

#### MATURE PIPE NET CHANGE WTD $

```dax
CALCULATE([NET CHANGE WTD $],'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ = "S5+")
```

#### NET CHANGE $

```dax
[PIPE $] - [BOQ PIPE $]
```

#### NET CHANGE WTD $

```dax
[PIPE $] - [PREV WEEK PIPE $]
```

#### NET CREATION QTD $

```dax
[OPPTY $] + [LOST QTD $]
```

#### OPEN OPPTY #

```dax
CALCULATE(DISTINCTCOUNT(Pipeline[OPP_ID]),Pipeline[ADJ_COMMITMENT_GROUP] = "Open")
```

#### OPEN OPPTY $

```dax
CALCULATE([OPPTY $],Pipeline[ADJ_COMMITMENT_GROUP] = "Open")
```

#### OPEN OPPTY W/W ~ #

```dax
VAR SelectedFreq = SELECTEDVALUE(
    'Daily Weekly Switch'[Frequency],
    "Daily"
)

VAR PrevWkOpenOppty = SWITCH(
    SelectedFreq,
    "Daily",CALCULATE(
        [OPEN OPPTY #],
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1"
        ),
    "Weekly",CALCULATE(
        [OPEN OPPTY #],
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT_RTB] /* DB: vw_EBI_Caldate.SNAPSHOT_WEEK_BKT_RTB */ = "-1"
        )
    )

VAR CurrWkOpenOppty = SWITCH(
    SelectedFreq,
    "Daily",CALCULATE(
        [OPEN OPPTY #],
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    "Weekly",CALCULATE(
        [OPEN OPPTY #],
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT_RTB] /* DB: vw_EBI_Caldate.SNAPSHOT_WEEK_BKT_RTB */ = "0"
        )
    )

VAR Result = CurrWkOpenOppty - PrevWkOpenOppty

return Result
```

#### OPEN OPPTY W/W ~ $

```dax
VAR SelectedFreq = SELECTEDVALUE(
    'Daily Weekly Switch'[Frequency],
    "Daily"
)

VAR PrevWkOpenOppty = SWITCH(
    SelectedFreq,
    "Daily",CALCULATE(
        [OPEN OPPTY $],
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1"
        ),
    "Weekly",CALCULATE(
        [OPEN OPPTY $],
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT_RTB] /* DB: vw_EBI_Caldate.SNAPSHOT_WEEK_BKT_RTB */ = "-1"
        )
    )

VAR CurrWkOpenOppty = SWITCH(
    SelectedFreq,
    "Daily",CALCULATE(
        [OPEN OPPTY $],
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    "Weekly",CALCULATE(
        [OPEN OPPTY $],
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT_RTB] /* DB: vw_EBI_Caldate.SNAPSHOT_WEEK_BKT_RTB */ = "0"
        )
    )

VAR Result = CurrWkOpenOppty - PrevWkOpenOppty

return Result
```

#### OPG ARR AVG $

```dax
SUM(Pipeline[OPG_ARR_AVG_USD_CURR_FY])
```

#### OPG TWELVE MONTH ENTRY $

```dax
SUM(Pipeline[OPG_TWELVE_MONTH_ENTRY_USD_CURR_FY])
```

#### OPG TWELVE MONTH EXIT $

```dax
SUM(Pipeline[OPG_TWELVE_MONTH_EXIT_USD_CURR_FY])
```

#### OPP #

```dax
CALCULATE(DISTINCTCOUNT(Pipeline[OPP_ID]))
```

#### OPPTY $

```dax
SUM(Pipeline[OPPTY])
```

#### OPPTY QTD $

```dax
CALCULATE([OPPTY $],'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = 0)
```

#### OPPTY TREND $

```dax
IF([GROSS CREATED QTD $]= BLANK(),BLANK(),
CALCULATE(
	[GROSS CREATED QTD $],
	FILTER(
		CALCULATETABLE(
			SUMMARIZE(
				'Qualification Quarter',
				'Qualification Quarter'[WEEK_NUMBER_SORT] /* DB: vw_EBI_Caldate.WEEK_NUMBER_SORT */,
				'Qualification Quarter'[QUALIFICATION_WEEK_NUMBER] /* DB: vw_EBI_Caldate.QUALIFICATION_WEEK_NUMBER */
			),
			ALLSELECTED('Qualification Quarter')
		),
		ISONORAFTER(
			'Qualification Quarter'[WEEK_NUMBER_SORT] /* DB: vw_EBI_Caldate.WEEK_NUMBER_SORT */, MAX('Qualification Quarter'[WEEK_NUMBER_SORT] /* DB: vw_EBI_Caldate.WEEK_NUMBER_SORT */), DESC,
			'Qualification Quarter'[QUALIFICATION_WEEK_NUMBER] /* DB: vw_EBI_Caldate.QUALIFICATION_WEEK_NUMBER */, MAX('Qualification Quarter'[QUALIFICATION_WEEK_NUMBER] /* DB: vw_EBI_Caldate.QUALIFICATION_WEEK_NUMBER */), DESC
		)
	)
))
// VAR Selected_Qual_qtr = SELECTEDVALUE('Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */)
// VAR Selected_Wk = SELECTEDVALUE('Qualification Quarter'[QUALIFICATION_WEEK_NUMBER] /* DB: vw_EBI_Caldate.QUALIFICATION_WEEK_NUMBER */)

// VAR RESULT = CALCULATE([OPPTY $],'Snapshot Quarter'[SNAPSHOT_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ = Selected_Qual_qtr,'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */ = Selected_Qual_qtr,'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */ = Selected_Wk,ALL('Qualification Quarter'))

// Return RESULT
```

#### OPPTY W/W ~ #

```dax
VAR SelectedFreq = SELECTEDVALUE(
    'Daily Weekly Switch'[Frequency],
    "Daily"
)

VAR MinDate = SWITCH(
    SelectedFreq,
    "Daily",CALCULATE(
        Min('Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */),
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1"
        ),
    "Weekly",CALCULATE(
        Min('Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */),
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT_RTB] /* DB: vw_EBI_Caldate.SNAPSHOT_WEEK_BKT_RTB */ = "-1"
        )
    )

VAR Result = CALCULATE(
        [OPP #],
        'Qualification Quarter'[QUALIFICATION_DATE] /* DB: vw_EBI_Caldate.QUALIFICATION_DATE */ >= MinDate
        )

return Result
```

#### OPPTY W/W ~ $

```dax
VAR SelectedFreq = SELECTEDVALUE(
    'Daily Weekly Switch'[Frequency],
    "Daily"
)

VAR SelectedWeekBkt = SELECTEDVALUE('Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */,"0")

VAR SelectedWeekBktWeekly = SELECTEDVALUE('Snapshot Quarter'[SNAPSHOT_WEEK_BKT_RTB] /* DB: vw_EBI_Caldate.SNAPSHOT_WEEK_BKT_RTB */,"0")



VAR MinDate = SWITCH(
    SelectedFreq,
    "Daily",CALCULATE(
        Min('Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */),
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = CONVERT(CONVERT(SelectedWeekBkt,INTEGER)-1,STRING),
        ALL('Snapshot Quarter')
        ),
    "Weekly",CALCULATE(
        Min('Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */),
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT_RTB] /* DB: vw_EBI_Caldate.SNAPSHOT_WEEK_BKT_RTB */ = CONVERT(CONVERT(SelectedWeekBktWeekly,INTEGER)-1,STRING),
        ALL('Snapshot Quarter')
        )
)

VAR Result = CALCULATE(
        [OPPTY $],
        'Qualification Quarter'[QUALIFICATION_DATE] /* DB: vw_EBI_Caldate.QUALIFICATION_DATE */ >= MinDate
)

return Result
```

#### OPPTY WTD $

```dax
VAR SelectedFreq = SELECTEDVALUE(
    'Daily Weekly Switch'[Frequency],
    "Daily"
)

VAR WkNo = CALCULATE(
    MIN('Qualification Quarter'[WEEK_NUMBER_SORT] /* DB: vw_EBI_Caldate.WEEK_NUMBER_SORT */),
    'Qualification Quarter'[QUALIFICATION_WEEK_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_WEEK_BKT */ = "0"
)

VAR ReconWeekNo = [RECON LAST WEEK]

VAR WeeklyDate = CALCULATE(MIN('Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */),
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT_RTB] /* DB: vw_EBI_Caldate.SNAPSHOT_WEEK_BKT_RTB */ = "0"
)

VAR WeeklyWkNo = CALCULATE(
    MIN('Qualification Quarter'[WEEK_NUMBER_SORT] /* DB: vw_EBI_Caldate.WEEK_NUMBER_SORT */),
    'Qualification Quarter'[QUALIFICATION_DATE] /* DB: vw_EBI_Caldate.QUALIFICATION_DATE */ = WeeklyDate
)

VAR CurrentQTRBktWkly = CALCULATE(
        MAX( 'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ ),
        ALL( 'Snapshot Quarter' ),
        'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ = WeeklyDate
    )

VAR CurrentQTRBktDaily = CALCULATE(
        MAX( 'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ ),
        ALL( 'Snapshot Quarter' ),
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
    )

VAR DailyWeekNo = IF(CurrentQTRBktDaily = 1, [RECON LAST WEEK],WkNo)

VAR WeeklyWeekNo = IF(CurrentQTRBktWkly = 1, [RECON LAST WEEK],WeeklyWkNo)

VAR Result = SWITCH(
    SelectedFreq,
    "Daily",CALCULATE(
        [OPPTY $],
        'Qualification Quarter'[WEEK_NUMBER_SORT] /* DB: vw_EBI_Caldate.WEEK_NUMBER_SORT */ = DailyWeekNo
        ),
    "Weekly",CALCULATE(
        [OPPTY $],
        'Qualification Quarter'[WEEK_NUMBER_SORT] /* DB: vw_EBI_Caldate.WEEK_NUMBER_SORT */ = WeeklyWeekNo
        )
    )

Return Result
```

#### PIPE $

```dax
CALCULATE(SUM(Pipeline[OPPTY]), FILTER(Pipeline, Pipeline[IN_PIPELINE] = 1))
```

#### PREV WEEK PIPE $

```dax
VAR SelectedFreq = SELECTEDVALUE(
    'Daily Weekly Switch'[Frequency],
    "Daily"
)

VAR Result = SWITCH(
    SelectedFreq,
    "Daily", CALCULATE(
        [PIPE $],
        ALL( 'Snapshot Quarter' ),
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1"
    ),
    "Weekly", CALCULATE(
        [PIPE $],
        ALL( 'Snapshot Quarter' ),
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT_RTB] /* DB: vw_EBI_Caldate.SNAPSHOT_WEEK_BKT_RTB */ = "-1"
    )
)

RETURN Result
```

#### PROJECTED CLOSE RATIO

```dax
VAR WFU = CALCULATE(SUM(Pipeline[OPPTY]), Pipeline[GEO_ADJ_COMMIT] in {"Won","Forecast","Upside-Committed"} )
VAR BOQ_PIPE = CALCULATE('_Pipeline Measures'[PIPE $], 'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */ = "W1")
RETURN
DIVIDE (WFU, BOQ_PIPE)
```

#### S1/S2 #

```dax
CALCULATE(
    [OPP #],
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ = "S1-S2",
    ALL('Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */)
)
```

#### S1/S2 $

```dax
CALCULATE(
    [OPPTY $],
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ = "S1-S2",
    ALL('Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */)
)
```

#### S3 $

```dax
CALCULATE(
    [PIPE $],
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ = "S3",
    ALL('Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */)
)
```

#### S4 $

```dax
CALCULATE(
	[PIPE $],
	'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ = "S4",
    ALL('Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */)
)
```

#### SS4 PROGRESSION $

```dax
SUM( Pipeline[S4_PROGRESSION_ASV] )
```

#### SS4 PROGRESSION QTD $

```dax
CALCULATE(
    [SS4 PROGRESSION $]
    ,'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
    ,ALL('Snapshot Quarter')
)
```

#### SS5+ $

```dax
CALCULATE(
    '_Pipeline Measures'[PIPE $],
    'Sales Stage'[SalesStageGrp_Sort] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp_Sort */ = 2,
    ALL('Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */))
```

#### Stalled & Inactive #

```dax
CALCULATE(
    DISTINCTCOUNT(Pipeline[OPP_ID]),
    Pipeline[STALLED_BUT_INACTIVE] = "Stalled & Inactive"
)
```

#### Stalled & Inactive $

```dax
CALCULATE(
    [PIPE $],
    Pipeline[STALLED_BUT_INACTIVE] = "Stalled & Inactive"
)
```

#### TRUE PROGRESSION $

```dax
SUM( Pipeline[TP_ASV] )
```

#### TRUE PROGRESSION QTD $

```dax
CALCULATE(
    [TRUE PROGRESSION $]
    ,'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
    ,ALL('Snapshot Quarter')
)
```

#### UPSIDE $

```dax
VAR SelectedCommit = SELECTEDVALUE(
    'Commit Type'[COMMIT_TYPE] /* DB: vw_EBI_COMMIT_ROLE_MAPPING.COMMIT_TYPE */,
    [DEFAULT COMMIT TYPE]
)

VAR Result = SWITCH(
    true(),
    SelectedCommit = "MGR_ADJ_COMMIT", CALCULATE(
        [PIPE $],
        Pipeline[MGR_ADJ_COMMIT] = "Upside"
    ),

    SelectedCommit = "ADJ_COMMITMENT",  CALCULATE(
        [PIPE $],
        Pipeline[ADJ_COMMITMENT] = "Upside"
    ),

    SelectedCommit = "GEO_ADJ_COMMIT",  CALCULATE(
        [PIPE $],
        Pipeline[GEO_ADJ_COMMIT] = "Upside"
    ),

    SelectedCommit = "PS_ADJ_COMMIT",  CALCULATE(
        [PIPE $],
        Pipeline[PS_ADJ_COMMITMENT] = "Upside"
    )
)

RETURN Result
```

#### UPSIDE COMMITTED $

```dax
VAR SelectedCommit = SELECTEDVALUE(
    'Commit Type'[COMMIT_TYPE] /* DB: vw_EBI_COMMIT_ROLE_MAPPING.COMMIT_TYPE */,
    [DEFAULT COMMIT TYPE]
)

VAR Result = SWITCH(
    true(),
    SelectedCommit = "MGR_ADJ_COMMIT", CALCULATE(
        [PIPE $],
        Pipeline[MGR_ADJ_COMMIT] = "Upside - Committed"
    ),

    // SelectedCommit = "ADJ_COMMITMENT",  CALCULATE(
    //     [OPPTY $],
    //     Pipeline[ADJ_COMMITMENT] = "Upside"
    // ),

    SelectedCommit = "GEO_ADJ_COMMIT",  CALCULATE(
        [PIPE $],
        Pipeline[GEO_ADJ_COMMIT] = "Upside - Committed"
    ),

    SelectedCommit = "PS_ADJ_COMMIT",  CALCULATE(
        [PIPE $],
        Pipeline[PS_ADJ_COMMITMENT] = "Upside - Committed"
    )
)

RETURN Result
```

#### UPSIDE FORECAST PIPE $

```dax
[UPSIDE $]+[FORECAST $]+[UPSIDE COMMITTED $]+[UPSIDE TARGETED $]
```

#### UPSIDE TARGETED $

```dax
VAR SelectedCommit = SELECTEDVALUE(
    'Commit Type'[COMMIT_TYPE] /* DB: vw_EBI_COMMIT_ROLE_MAPPING.COMMIT_TYPE */,
    [DEFAULT COMMIT TYPE]
)

VAR Result = SWITCH(
    true(),
    SelectedCommit = "MGR_ADJ_COMMIT", CALCULATE(
        [PIPE $],
        Pipeline[MGR_ADJ_COMMIT] = "Upside - Targeted"
    ),

    // SelectedCommit = "ADJ_COMMITMENT",  CALCULATE(
    //     [OPPTY $],
    //     Pipeline[ADJ_COMMITMENT] = "Upside"
    // ),

    SelectedCommit = "GEO_ADJ_COMMIT",  CALCULATE(
        [PIPE $],
        Pipeline[GEO_ADJ_COMMIT] = "Upside - Targeted"
    ),

    SelectedCommit = "PS_ADJ_COMMIT",  CALCULATE(
        [PIPE $],
        Pipeline[PS_ADJ_COMMITMENT] = "Upside - Targeted"
    )
)

RETURN Result
```

#### W+F+UC $

```dax
[WON $] + [FORECAST $] + [UPSIDE COMMITTED $]
```

#### W+F+UC PIPE YTD $

```dax
VAR CYear = CALCULATE(
    MIN( 'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.FISCAL_YR */ ),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)

VAR UpsideCommittedCQ = CALCULATE(
    [UPSIDE COMMITTED $],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0 
)

VAR WONPQ = CALCULATE(
    [WON $],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ < 0,
    'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.FISCAL_YR */ = CYear,
    Pipeline[IS_EOQ] = "TRUE",
    ALL( 'Snapshot Quarter' )
)

VAR WONCQ = CALCULATE(
    [WON $],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)

VAR ForecastCQ = CALCULATE(
    [FORECAST $],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0 
)

VAR Result = ForecastCQ+UpsideCommittedCQ+WONPQ+WONCQ

RETURN Result
```

#### WON #

```dax
VAR SelectedCommit = SELECTEDVALUE(
    'Commit Type'[COMMIT_TYPE] /* DB: vw_EBI_COMMIT_ROLE_MAPPING.COMMIT_TYPE */,
    [DEFAULT COMMIT TYPE]
)

VAR Result = SWITCH(
    true(),
    SelectedCommit = "MGR_ADJ_COMMIT", CALCULATE(
        [OPP #],
        Pipeline[MGR_ADJ_COMMIT] = "Won"
    ),

    SelectedCommit = "ADJ_COMMITMENT",  CALCULATE(
        [OPP #],
        Pipeline[ADJ_COMMITMENT] = "Won"
    ),

    SelectedCommit = "GEO_ADJ_COMMIT",  CALCULATE(
        [OPP #],
        Pipeline[GEO_ADJ_COMMIT] = "Won"
    ),

    SelectedCommit = "PS_ADJ_COMMIT",  CALCULATE(
        [OPP #],
        Pipeline[PS_ADJ_COMMITMENT] = "Won"
    )
)

RETURN Result
```

#### WON $

```dax
VAR SelectedCommit = SELECTEDVALUE(
    'Commit Type'[COMMIT_TYPE] /* DB: vw_EBI_COMMIT_ROLE_MAPPING.COMMIT_TYPE */,
    [DEFAULT COMMIT TYPE]
)

VAR Result = SWITCH(
    true(),
    SelectedCommit = "MGR_ADJ_COMMIT", CALCULATE(
        [OPPTY $],
        Pipeline[MGR_ADJ_COMMIT] = "Won"
    ),

    SelectedCommit = "ADJ_COMMITMENT",  CALCULATE(
        [OPPTY $],
        Pipeline[ADJ_COMMITMENT] = "Won"
    ),

    SelectedCommit = "GEO_ADJ_COMMIT",  CALCULATE(
        [OPPTY $],
        Pipeline[GEO_ADJ_COMMIT] = "Won"
    ),

    SelectedCommit = "PS_ADJ_COMMIT",  CALCULATE(
        [OPPTY $],
        Pipeline[PS_ADJ_COMMITMENT] = "Won"
    )
)

RETURN Result
```

#### WON $ TREND

```dax
VAR Selected_Close_qtr = SELECTEDVALUE('Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */)
VAR Selected_wk = SELECTEDVALUE('Close Quarter'[WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEK_NUMBER */)

VAR RESULT = CALCULATE([WON $],'Snapshot Quarter'[SNAPSHOT_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ = Selected_Close_qtr,'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ = Selected_Close_qtr,'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */ = Selected_wk,ALL('Close Quarter'))

Return RESULT
```

### 3.9. _Product Consumption (2 measures) — DB: measure-only

#### Primary Product Consumption %

```dax
CALCULATE('_Product Consumption'[Product Consumption %],FILTER('Product Consumption Metadata','Product Consumption Metadata'[IS_LATEST_MONTH] /* DB: dataset_table.IS_LATEST_MONTH */=TRUE() && 'Product Consumption Metadata'[IS_PRIMARY_METRIC] /* DB: dataset_table.IS_PRIMARY_METRIC */=TRUE()))
```

#### Product Consumption %

```dax
DIVIDE(SUM('Product Consumption'[Actual] /* DB: dataset_table.Actual */),SUM('Product Consumption'[Commit] /* DB: dataset_table.Commit */),0)
```

### 3.10. _Retention Measures (16 measures) — DB: measure-only

#### ARR IMPACT

```dax
SUM(
    Retention[ARR_Impact]
    )
```

#### ATTAINMENT

```dax
SUM(
    Retention[Attainment]
    )
```

#### ATTRITION

```dax
SUM(
    Retention[Attrition]
    )
```

#### BOOKING VALUE

```dax
SUM(
    Retention[Booking_Amount]
    )
```

#### CLOSED #

```dax
CALCULATE(DISTINCTCOUNT('Retention'[Retention_MetaData_ID] /* DB: vw_TF_EBI_Retention.Retention_MetaData_ID */),
FILTER('Retention MetaData',
('Retention MetaData'[LINE_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.LINE_CATEGORY */ = "System Line" 
|| ('Retention MetaData'[LINE_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.LINE_CATEGORY */ ="Customer Adjustment" 
&& 'Retention MetaData'[INTERNAL_SEGMENT_NET_OFF] /* DB: vw_TD_EBI_Retention_MetaData.INTERNAL_SEGMENT_NET_OFF */ = BLANK())) 
&& 'Retention MetaData'[OUTLOOK_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.OUTLOOK_CATEGORY */="Closed"))
```

#### LTG #

```dax
CALCULATE(DISTINCTCOUNT('Retention'[Retention_MetaData_ID] /* DB: vw_TF_EBI_Retention.Retention_MetaData_ID */),
FILTER('Retention MetaData',
('Retention MetaData'[LINE_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.LINE_CATEGORY */ = "System Line" 
|| ('Retention MetaData'[LINE_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.LINE_CATEGORY */ ="Customer Adjustment" 
&& 'Retention MetaData'[INTERNAL_SEGMENT_NET_OFF] /* DB: vw_TD_EBI_Retention_MetaData.INTERNAL_SEGMENT_NET_OFF */ = BLANK())) 
&& 'Retention MetaData'[OUTLOOK_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.OUTLOOK_CATEGORY */="Left To Go"))
```

#### LTG OVERDUE

```dax
CALCULATE(DISTINCTCOUNT('Retention'[Retention_MetaData_ID] /* DB: vw_TF_EBI_Retention.Retention_MetaData_ID */),
FILTER('Retention MetaData',
('Retention MetaData'[LINE_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.LINE_CATEGORY */ = "System Line" 
|| 
('Retention MetaData'[LINE_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.LINE_CATEGORY */ ="Customer Adjustment" && 'Retention MetaData'[INTERNAL_SEGMENT_NET_OFF] /* DB: vw_TD_EBI_Retention_MetaData.INTERNAL_SEGMENT_NET_OFF */ = BLANK())) 
&& 'Retention MetaData'[OUTLOOK_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.OUTLOOK_CATEGORY */="Left To Go" 
&& 'Retention MetaData'[SERVICE_END_DATE] /* DB: vw_TD_EBI_Retention_MetaData.SERVICE_END_DATE */<TODAY()))
```

#### ON TIME RENEWAL #

```dax
CALCULATE(DISTINCTCOUNT('Retention'[Retention_MetaData_ID] /* DB: vw_TF_EBI_Retention.Retention_MetaData_ID */),FILTER('Retention',Retention[ON TIME RENEWAL]="Yes"))
```

#### RBOB

```dax
SUM(
    Retention[RBOB]
        )
```

#### RBOB ACTUALS $

```dax
[ATTRITION] + [RBOB]
```

#### RBOB ATTAINMENT %

```dax
VAR AttainmentPCT = DIVIDE(
    ([RBOB ACTUALS $]),
    [RBOB]
)

VAR Result = IF(
    [RBOB] = 0,
    0,
    AttainmentPCT
)

RETURN Result
```

#### RBOB ATTAINMENT YTD %

```dax
VAR CYear = CALCULATE(
    MIN( 'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.FISCAL_YR */ ),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)

VAR Result = CALCULATE(
    [RBOB ATTAINMENT %],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0,
    'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.FISCAL_YR */ = CYear
)
    
RETURN Result
```

#### RENEWAL #

```dax
CALCULATE(
    DISTINCTCOUNT('Retention'[Retention_MetaData_ID] /* DB: vw_TF_EBI_Retention.Retention_MetaData_ID */),
    FILTER('Retention MetaData',
    'Retention MetaData'[LINE_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.LINE_CATEGORY */ = "System Line" 
    || ('Retention MetaData'[LINE_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.LINE_CATEGORY */ = "Customer Adjustment" 
    && 'Retention MetaData'[INTERNAL_SEGMENT_NET_OFF] /* DB: vw_TD_EBI_Retention_MetaData.INTERNAL_SEGMENT_NET_OFF */ = BLANK())
    ))
```

#### RETENTION ATTAINMENT %

```dax
DIVIDE(
       ( [RBOB] - ABS( [ARR IMPACT] ) ),
        [RBOB]
)
```

#### RISK UPSIDE AMOUNT $

```dax
SUM(Retention[RISK_UPSIDE_AMOUNT])
```

#### UPSELL

```dax
SUM(
    Retention[Upsell]
    )
```

### 3.11. _Retention Target Measures (5 measures) — DB: measure-only

#### NET ASV $

```dax
CALCULATE([ASV $] - ABS('_Retention Target Measures'[RENEWALS TOTAL ATTRITION $]))
```

#### NET PUSHED $

```dax
VAR SelectedTargetType = SELECTEDVALUE(
    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */,
    [DEFAULT TARGET TYPE])

VAR Result = CALCULATE(SUM( 'Renewals Target'[NET_PUSHED] /* DB: vw_TF_EBI_RENEWALS_TARGET.NET_PUSHED */),'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = SelectedTargetType)

RETURN Result
```

#### RENEWALS ATTRITION $

```dax
VAR SelectedTargetType = SELECTEDVALUE(
    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */,
    [DEFAULT TARGET TYPE])

VAR Result = CALCULATE(SUM( 'Renewals Target'[ATTRITION] /* DB: vw_TF_EBI_RENEWALS_TARGET.ATTRITION */),'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = SelectedTargetType)

RETURN Result
```

#### RENEWALS TOTAL ATTRITION $

```dax
VAR SelectedTargetType = SELECTEDVALUE(
    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */,
    [DEFAULT TARGET TYPE])

VAR Result = CALCULATE(SUM( 'Renewals Target'[TOTAL] /* DB: vw_TF_EBI_RENEWALS_TARGET.TOTAL */),'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = SelectedTargetType)

RETURN Result
```

#### TRAILING BOOKED $

```dax
VAR SelectedTargetType = SELECTEDVALUE(
    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */,
    [DEFAULT TARGET TYPE])

VAR Result = CALCULATE(SUM( 'Renewals Target'[TRAILING_BOOKED] /* DB: vw_TF_EBI_RENEWALS_TARGET.TRAILING_BOOKED */),'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = SelectedTargetType)

RETURN Result
```

### 3.12. _SBR Measures (2 measures) — DB: measure-only

#### SBR ACTIVITY #

```dax
DISTINCTCOUNT('SBR Metadata'[ACTIVITY_KEY] /* DB: dataset_table.ACTIVITY_KEY */)
```

#### SBR ACTIVITY DOCUMENT #

```dax
SUM('SBR Activities'[ACTIVITY_COUNT] /* DB: dataset_table.ACTIVITY_COUNT */)
```

### 3.13. _TM1 Booking Measures (1 measures) — DB: measure-only

#### TM1 Bookings $

```dax
SUM('TM1 Bookings'[BOOKING_ARR_AVG_DELTA] /* DB: dataset_table.BOOKING_ARR_AVG_DELTA */)
```

### 3.14. _TPT Measures (92 measures) — DB: measure-only

#### NOT TIERED COMPLETED PRNT #

```dax
CALCULATE(
    DISTINCTCOUNT(TPT[ACCOUNT_PRNT_ID])
    ,NOT('TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */) IN {"Tier 1","Tier 2","Tier 3"}
    ,'TPT Metadata'[PARENT_AP_COMPLETION_STATUS] /* DB: dataset_table.PARENT_AP_COMPLETION_STATUS */ = "Completed"
)
```

#### NOT TIERED COMPLETED PRNT %

```dax
VAR A = [NOT TIERED COMPLETED PRNT #]

VAR B = [NOT TIERED PRNT ACCTS #]
//CALCULATE(DISTINCTCOUNT(TPT[ACCOUNT_PRNT_ID]),NOT('TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */) IN {"Tier 1","Tier 2","Tier 3"})

RETURN DIVIDE(A,B)
```

#### NOT TIERED PRNT ACCTS #

```dax
CALCULATE(
    DISTINCTCOUNT(TPT[ACCOUNT_PRNT_ID])
    ,NOT('TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */) IN { "Tier 1","Tier 2","Tier 3"}
)
```

#### NOT TIERED PRNT GROSS CREATED $

```dax
CALCULATE([GROSS CREATED QTD $],NOT('TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */) IN {"Tier 1","Tier 2","Tier 3"})
```

#### NOT TIERED PRNT WON $

```dax
CALCULATE([WON $],NOT('TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */) IN {"Tier 1","Tier 2","Tier 3"})
```

#### NOT TIERED ROLLUP ACCTS #

```dax
CALCULATE(
    DISTINCTCOUNT(TPT[PRNT_CNTRY])
    ,NOT('TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */) IN { "Tier 1","Tier 2","Tier 3"}
)
```

#### NOT TIERED ROLLUP COMPLETED #

```dax
CALCULATE(
    DISTINCTCOUNT(TPT[ROLLUP_CNTRY])
    ,NOT('TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */) IN { "Tier 1","Tier 2","Tier 3"}
    ,'TPT Metadata'[ROLLUP_AP_COMPLETION_STATUS] /* DB: dataset_table.ROLLUP_AP_COMPLETION_STATUS */ = "Completed"
)
```

#### NOT TIERED ROLLUP COMPLETED %

```dax
VAR A = [NOT TIERED ROLLUP COMPLETED #]

VAR B = [NOT TIERED ROLLUP ACCTS #]

RETURN DIVIDE(A,B)
```

#### NOT TIERED ROLLUP COMPLETED ASSESSED #

```dax
CALCULATE(
    DISTINCTCOUNT(TPT[ROLLUP_CNTRY])
    ,NOT('TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */) IN { "Tier 1","Tier 2","Tier 3"}
    ,'TPT Metadata'[ROLLUP_AP_COMPLETION_STATUS] /* DB: dataset_table.ROLLUP_AP_COMPLETION_STATUS */ = "Completed"
    ,'TPT Metadata'[ROLLUP_ACCOUNT_PLAN_QUALITY] /* DB: dataset_table.ROLLUP_ACCOUNT_PLAN_QUALITY */ IN {"Green","Yellow","Red"}
)
```

#### NOT TIERED ROLLUP COMPLETED ASSESSED %

```dax
DIVIDE([NOT TIERED ROLLUP COMPLETED ASSESSED #],[NOT TIERED ROLLUP COMPLETED #])
```

#### OPP PARENT TARGET $

```dax
MAX(TPT[OPP_PARENT_TARGET])
```

#### OPP TARGET $

```dax
SUM(TPT[OPP_TARGET])
```

#### OPP TARGET NO PIPE $

```dax
SUM(TPT[OPP_TARGET_NO_PIPE])
```

#### PRNT COMPLETE %

```dax
DIVIDE(
    [TIER 1 PRNT COMPLETED #],
    [TIER 1 PRNT ACCTS #]
)
```

#### TIER 1 ACCTS #

```dax
CALCULATE(
    DISTINCTCOUNT(TPT[SUB_CNTRY])
    ,'TPT Metadata'[CLEANED_SUB_TIER] /* DB: dataset_table.CLEANED_SUB_TIER */ = "Tier 1"
)
```

#### TIER 1 COMPLETED #

```dax
CALCULATE(
    DISTINCTCOUNT(TPT[SUB_CNTRY])
    ,'TPT Metadata'[CLEANED_SUB_TIER] /* DB: dataset_table.CLEANED_SUB_TIER */ = "Tier 1"
    ,'TPT Metadata'[AP_COMPLETION_STATUS] /* DB: dataset_table.AP_COMPLETION_STATUS */ = "Completed"
)
```

#### TIER 1 COMPLETED %

```dax
DIVIDE(
    [TIER 1 COMPLETED #],
    [TIER 1 ACCTS #]
)
```

#### TIER 1 COMPLETED AP GREEN #

```dax
CALCULATE
(
DISTINCTCOUNT(TPT[PRNT_CNTRY]),
'TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */="Tier 1" && 
'TPT Metadata'[PARENT_AP_COMPLETION_STATUS] /* DB: dataset_table.PARENT_AP_COMPLETION_STATUS */="Completed" && 
'TPT Metadata'[PARENT_ACCOUNT_PLAN_QUALITY] /* DB: dataset_table.PARENT_ACCOUNT_PLAN_QUALITY */="Green"
)
```

#### TIER 1 COMPLETED AP GREEN %

```dax
DIVIDE([TIER 1 COMPLETED AP GREEN #],[TIER 1 COMPLETED PRNT ASSESSED #])
```

#### TIER 1 COMPLETED AP RED #

```dax
CALCULATE
(
DISTINCTCOUNT(TPT[PRNT_CNTRY]),
'TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */="Tier 1" && 
'TPT Metadata'[PARENT_AP_COMPLETION_STATUS] /* DB: dataset_table.PARENT_AP_COMPLETION_STATUS */="Completed" && 
'TPT Metadata'[PARENT_ACCOUNT_PLAN_QUALITY] /* DB: dataset_table.PARENT_ACCOUNT_PLAN_QUALITY */="Red"
)
```

#### TIER 1 COMPLETED AP RED %

```dax
DIVIDE([TIER 1 COMPLETED AP RED #],[TIER 1 COMPLETED PRNT ASSESSED #])
```

#### TIER 1 COMPLETED AP YELLOW #

```dax
CALCULATE
(
DISTINCTCOUNT(TPT[PRNT_CNTRY]),
'TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */="Tier 1" && 
'TPT Metadata'[PARENT_AP_COMPLETION_STATUS] /* DB: dataset_table.PARENT_AP_COMPLETION_STATUS */="Completed" && 
'TPT Metadata'[PARENT_ACCOUNT_PLAN_QUALITY] /* DB: dataset_table.PARENT_ACCOUNT_PLAN_QUALITY */="Yellow"
)
```

#### TIER 1 COMPLETED AP YELLOW %

```dax
DIVIDE([TIER 1 COMPLETED AP YELLOW #],[TIER 1 COMPLETED PRNT ASSESSED #])
```

#### TIER 1 COMPLETED ASSESSED #

```dax
CALCULATE(
    DISTINCTCOUNT(TPT[SUB_CNTRY])
    ,'TPT Metadata'[CLEANED_SUB_TIER] /* DB: dataset_table.CLEANED_SUB_TIER */ = "Tier 1"
    ,'TPT Metadata'[AP_COMPLETION_STATUS] /* DB: dataset_table.AP_COMPLETION_STATUS */ = "Completed"
    ,'TPT Metadata'[ASSESSED_ACCOUNT] /* DB: dataset_table.ASSESSED_ACCOUNT */ IN {"Green","Yellow","Red"}
)
```

#### TIER 1 COMPLETED ASSESSED %

```dax
DIVIDE(
    [TIER 1 COMPLETED ASSESSED #]
    ,[TIER 1 COMPLETED #]
)
```

#### TIER 1 COMPLETED PRNT #

```dax
CALCULATE(
    DISTINCTCOUNT(TPT[PRNT_CNTRY])
    ,'TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */ = "Tier 1"
    ,'TPT Metadata'[PARENT_AP_COMPLETION_STATUS] /* DB: dataset_table.PARENT_AP_COMPLETION_STATUS */ = "Completed"
)
```

#### TIER 1 COMPLETED PRNT %

```dax
VAR A = [TIER 1 COMPLETED PRNT #]

VAR B = [TIER 1 PRNT ACCTS #]
//CALCULATE(DISTINCTCOUNT(TPT[ACCOUNT_PRNT_ID]),'TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */ = "Tier 1")

RETURN DIVIDE(A,B)
```

#### TIER 1 COMPLETED PRNT ASSESSED #

```dax
CALCULATE(
    DISTINCTCOUNT(TPT[PRNT_CNTRY])
    ,'TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */ = "Tier 1"
    ,'TPT Metadata'[PARENT_AP_COMPLETION_STATUS] /* DB: dataset_table.PARENT_AP_COMPLETION_STATUS */ = "Completed"
    ,'TPT Metadata'[PARENT_ACCOUNT_PLAN_QUALITY] /* DB: dataset_table.PARENT_ACCOUNT_PLAN_QUALITY */ IN {"Green","Yellow","Red"}
)
```

#### TIER 1 COMPLETED PRNT ASSESSED %

```dax
DIVIDE([TIER 1 COMPLETED PRNT ASSESSED #],[TIER 1 COMPLETED PRNT #])
```

#### TIER 1 OWNER %

```dax
VAR A = 
CALCULATE(DISTINCTCOUNT(TPT[PRNT_CNTRY]),FILTER('TPT Metadata',NOT('TPT Metadata'[PARENT_OWNER] /* DB: dataset_table.PARENT_OWNER */) IN {"No Owner",BLANK()}),LEN('TPT Metadata'[PARENT_OWNER] /* DB: dataset_table.PARENT_OWNER */)>1 && 'TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */="Tier 1")

VAR B = [TIER 1 PRNT ACCTS #]

RETURN DIVIDE(A,B)
```

#### TIER 1 PRNT ACCTS #

```dax
CALCULATE(DISTINCTCOUNT(TPT[PRNT_CNTRY]),'TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */="Tier 1")
```

#### TIER 1 PRNT COMPLETED #

```dax
CALCULATE(
    DISTINCTCOUNT(TPT[PRNT_CNTRY])
    ,'TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */ = "Tier 1"
    ,'TPT Metadata'[PARENT_AP_COMPLETION_STATUS] /* DB: dataset_table.PARENT_AP_COMPLETION_STATUS */ = "Completed"
)
```

#### TIER 1 PRNT GNARR $

```dax
CALCULATE([OPPTY $],'TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */ = "Tier 1")
```

#### TIER 1 PRNT GROSS CREATED $

```dax
CALCULATE([GROSS CREATED QTD $],'TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */ = "Tier 1")
```

#### TIER 1 PRNT WITH GNARR #

```dax
CALCULATE(DISTINCTCOUNT(Pipeline[ACCOUNT_PARENT_ID]),
            'TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */ = "Tier 1",
            NOT(ISBLANK(Pipeline[OPPTY]))
            )
```

#### TIER 1 PRNT WITHOUT GNARR #

```dax
VAR _AllPRNTWithOPPTY = 
    CALCULATETABLE (
        VALUES (Pipeline[ACCOUNT_PARENT_ID]),
        NOT(ISBLANK(Pipeline[OPPTY])),FILTER('Snapshot Quarter','Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */="0"),FILTER('Pay Measure','Pay Measure'[PAY_MEASURE_DISPLAY] /* DB: vw_EBI_PAY_MEASURE.PAY_MEASURE_DISPLAY */="ASV"),FILTER(OPG,OPG[BU]="DX"),FILTER('TPT Metadata','TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */="Tier 1")
    )

VAR _tptwithallprnt =
    CALCULATETABLE(VALUES(TPT[PRNT_CNTRY]), 'TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */ = "Tier 1")

VAR _RemainingPRNT =
    EXCEPT ( _tptwithallprnt, _AllPRNTWithOPPTY )

VAR Result = COUNTROWS(_RemainingPRNT)
    

RETURN
    Result
```

#### TIER 1 PRNT WON $

```dax
CALCULATE([WON $],'TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */ = "Tier 1")
```

#### TIER 1 ROLLUP ACCTS #

```dax
CALCULATE(
    DISTINCTCOUNT(TPT[ROLLUP_CNTRY])
    ,'TPT Metadata'[ROLLUP_TIER] /* DB: dataset_table.ROLLUP_TIER */ = "Tier 1"
)
```

#### TIER 1 ROLLUP COMPLETED #

```dax
CALCULATE(
    DISTINCTCOUNT(TPT[ROLLUP_CNTRY])
    ,'TPT Metadata'[ROLLUP_TIER] /* DB: dataset_table.ROLLUP_TIER */ = "Tier 1"
    ,'TPT Metadata'[ROLLUP_AP_COMPLETION_STATUS] /* DB: dataset_table.ROLLUP_AP_COMPLETION_STATUS */ = "Completed"
)
```

#### TIER 1 ROLLUP COMPLETED %

```dax
DIVIDE(
    [TIER 1 ROLLUP COMPLETED #],
    [TIER 1 ROLLUP ACCTS #]
)
```

#### TIER 1 ROLLUP COMPLETED AP GREEN #

```dax
CALCULATE
(
DISTINCTCOUNT(TPT[ROLLUP_CNTRY]),
'TPT Metadata'[ROLLUP_TIER] /* DB: dataset_table.ROLLUP_TIER */="Tier 1" && 
'TPT Metadata'[ROLLUP_AP_COMPLETION_STATUS] /* DB: dataset_table.ROLLUP_AP_COMPLETION_STATUS */="Completed" && 
'TPT Metadata'[ROLLUP_ACCOUNT_PLAN_QUALITY] /* DB: dataset_table.ROLLUP_ACCOUNT_PLAN_QUALITY */="Green"
)
```

#### TIER 1 ROLLUP COMPLETED AP GREEN %

```dax
DIVIDE([TIER 1 ROLLUP COMPLETED AP GREEN #],[TIER 1 ROLLUP COMPLETED ASSESSED #])
```

#### TIER 1 ROLLUP COMPLETED AP RED #

```dax
CALCULATE
(
DISTINCTCOUNT(TPT[ROLLUP_CNTRY]),
'TPT Metadata'[ROLLUP_TIER] /* DB: dataset_table.ROLLUP_TIER */="Tier 1" && 
'TPT Metadata'[ROLLUP_AP_COMPLETION_STATUS] /* DB: dataset_table.ROLLUP_AP_COMPLETION_STATUS */="Completed" && 
'TPT Metadata'[ROLLUP_ACCOUNT_PLAN_QUALITY] /* DB: dataset_table.ROLLUP_ACCOUNT_PLAN_QUALITY */="Red"
)
```

#### TIER 1 ROLLUP COMPLETED AP RED %

```dax
DIVIDE([TIER 1 ROLLUP COMPLETED AP RED #],[TIER 1 ROLLUP COMPLETED ASSESSED #])
```

#### TIER 1 ROLLUP COMPLETED AP YELLOW #

```dax
CALCULATE
(
DISTINCTCOUNT(TPT[ROLLUP_CNTRY]),
'TPT Metadata'[ROLLUP_TIER] /* DB: dataset_table.ROLLUP_TIER */="Tier 1" && 
'TPT Metadata'[ROLLUP_AP_COMPLETION_STATUS] /* DB: dataset_table.ROLLUP_AP_COMPLETION_STATUS */="Completed" && 
'TPT Metadata'[ROLLUP_ACCOUNT_PLAN_QUALITY] /* DB: dataset_table.ROLLUP_ACCOUNT_PLAN_QUALITY */="Yellow"
)
```

#### TIER 1 ROLLUP COMPLETED AP YELLOW %

```dax
DIVIDE([TIER 1 ROLLUP COMPLETED AP YELLOW #],[TIER 1 ROLLUP COMPLETED ASSESSED #])
```

#### TIER 1 ROLLUP COMPLETED ASSESSED #

```dax
CALCULATE(
    DISTINCTCOUNT(TPT[ROLLUP_CNTRY])
    ,'TPT Metadata'[ROLLUP_TIER] /* DB: dataset_table.ROLLUP_TIER */ = "Tier 1"
    ,'TPT Metadata'[ROLLUP_AP_COMPLETION_STATUS] /* DB: dataset_table.ROLLUP_AP_COMPLETION_STATUS */ = "Completed"
    ,'TPT Metadata'[ROLLUP_ACCOUNT_PLAN_QUALITY] /* DB: dataset_table.ROLLUP_ACCOUNT_PLAN_QUALITY */ IN {"Green","Yellow","Red"}
)
```

#### TIER 1 ROLLUP COMPLETED ASSESSED %

```dax
DIVIDE([TIER 1 ROLLUP COMPLETED ASSESSED #],[TIER 1 ROLLUP COMPLETED #])
```

#### TIER 1 SUB GNARR $

```dax
CALCULATE([OPPTY $],'TPT Metadata'[OPP_FOCUS_TIER] /* DB: dataset_table.OPP_FOCUS_TIER */ = "Tier 1")
```

#### TIER 1 SUB WITH GNARR #

```dax
CALCULATE(DISTINCTCOUNT(Pipeline[ACCOUNT_SUB_ID]),
            'TPT Metadata'[OPP_FOCUS_TIER] /* DB: dataset_table.OPP_FOCUS_TIER */ = "Tier 1",
            NOT(ISBLANK(Pipeline[OPPTY]))
            )
```

#### TIER 1 SUB WITHOUT GNARR #

```dax
VAR _AllSUBWithOPPTY = 
    CALCULATETABLE (
        VALUES (Pipeline[ACCOUNT_SUB_ID]),
        NOT(ISBLANK(Pipeline[OPPTY])),FILTER('Snapshot Quarter','Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */="0"),FILTER('Pay Measure','Pay Measure'[PAY_MEASURE_DISPLAY] /* DB: vw_EBI_PAY_MEASURE.PAY_MEASURE_DISPLAY */="ASV"),FILTER(OPG,OPG[BU]="DX"),FILTER('TPT Metadata','TPT Metadata'[OPP_FOCUS_TIER] /* DB: dataset_table.OPP_FOCUS_TIER */="Tier 1")
    )

VAR _tptwithallsub =
    CALCULATETABLE(VALUES(TPT[ACCOUNT_SUB_ID]), 'TPT Metadata'[OPP_FOCUS_TIER] /* DB: dataset_table.OPP_FOCUS_TIER */ = "Tier 1")

VAR _RemainingSUB =
    EXCEPT ( _tptwithallsub, _AllSUBWithOPPTY )

VAR Result = COUNTROWS(_RemainingSUB)  

RETURN
    Result
```

#### TIER 2 ACCTS #

```dax
CALCULATE(
    DISTINCTCOUNT(TPT[SUB_CNTRY])
    ,'TPT Metadata'[CLEANED_SUB_TIER] /* DB: dataset_table.CLEANED_SUB_TIER */ = "Tier 2"
)
```

#### TIER 2 PRNT ACCTS #

```dax
CALCULATE(
    DISTINCTCOUNT(TPT[PRNT_CNTRY])
    ,'TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */ = "Tier 2"
)
```

#### TIER 2 PRNT GNARR $

```dax
CALCULATE([OPPTY $],'TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */ = "Tier 2")
```

#### TIER 2 PRNT GROSS CREATED $

```dax
CALCULATE([GROSS CREATED QTD $],'TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */ = "Tier 2")
```

#### TIER 2 PRNT WITH GNARR #

```dax
CALCULATE(DISTINCTCOUNT(Pipeline[ACCOUNT_PARENT_ID]),
            'TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */ = "Tier 2",
            NOT(ISBLANK(Pipeline[OPPTY]))
            )
```

#### TIER 2 PRNT WITHOUT GNARR #

```dax
VAR _AllPRNTWithOPPTY = 
    CALCULATETABLE (
        VALUES (Pipeline[ACCOUNT_PARENT_ID]),
        NOT(ISBLANK(Pipeline[OPPTY])),FILTER('Snapshot Quarter','Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */="0"),FILTER('Pay Measure','Pay Measure'[PAY_MEASURE_DISPLAY] /* DB: vw_EBI_PAY_MEASURE.PAY_MEASURE_DISPLAY */="ASV"),FILTER(OPG,OPG[BU]="DX"),FILTER('TPT Metadata','TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */="Tier 2")
    )

VAR _tptwithallprnt =
    CALCULATETABLE(VALUES(TPT[PRNT_CNTRY]), 'TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */ = "Tier 2")

VAR _RemainingPRNT =
    EXCEPT ( _tptwithallprnt, _AllPRNTWithOPPTY )

VAR Result = COUNTROWS(_RemainingPRNT)
    

RETURN
    Result
```

#### TIER 2 PRNT WON $

```dax
CALCULATE([WON $],'TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */ = "Tier 2")
```

#### TIER 2 ROLLUP ACCTS #

```dax
CALCULATE(
    DISTINCTCOUNT(TPT[ROLLUP_CNTRY])
    ,'TPT Metadata'[ROLLUP_TIER] /* DB: dataset_table.ROLLUP_TIER */ = "Tier 2"
)
```

#### TIER 2 ROLLUP COMPLETED #

```dax
CALCULATE(
    DISTINCTCOUNT(TPT[ROLLUP_CNTRY])
    ,'TPT Metadata'[ROLLUP_TIER] /* DB: dataset_table.ROLLUP_TIER */ = "Tier 2"
    ,'TPT Metadata'[ROLLUP_AP_COMPLETION_STATUS] /* DB: dataset_table.ROLLUP_AP_COMPLETION_STATUS */ = "Completed"
)
```

#### TIER 2 ROLLUP COMPLETED %

```dax
DIVIDE(
    [TIER 2 ROLLUP COMPLETED #],
    [TIER 2 ROLLUP ACCTS #]
)
```

#### TIER 2 ROLLUP COMPLETED AP GREEN #

```dax
CALCULATE
(
DISTINCTCOUNT(TPT[ROLLUP_CNTRY]),
'TPT Metadata'[ROLLUP_TIER] /* DB: dataset_table.ROLLUP_TIER */="Tier 2" && 
'TPT Metadata'[ROLLUP_AP_COMPLETION_STATUS] /* DB: dataset_table.ROLLUP_AP_COMPLETION_STATUS */="Completed" && 
'TPT Metadata'[ROLLUP_ACCOUNT_PLAN_QUALITY] /* DB: dataset_table.ROLLUP_ACCOUNT_PLAN_QUALITY */="Green"
)
```

#### TIER 2 ROLLUP COMPLETED AP GREEN %

```dax
DIVIDE([TIER 2 ROLLUP COMPLETED AP GREEN #],[TIER 2 ROLLUP COMPLETED ASSESSED #])
```

#### TIER 2 ROLLUP COMPLETED AP RED #

```dax
CALCULATE
(
DISTINCTCOUNT(TPT[ROLLUP_CNTRY]),
'TPT Metadata'[ROLLUP_TIER] /* DB: dataset_table.ROLLUP_TIER */="Tier 2" && 
'TPT Metadata'[ROLLUP_AP_COMPLETION_STATUS] /* DB: dataset_table.ROLLUP_AP_COMPLETION_STATUS */="Completed" && 
'TPT Metadata'[ROLLUP_ACCOUNT_PLAN_QUALITY] /* DB: dataset_table.ROLLUP_ACCOUNT_PLAN_QUALITY */="Red"
)
```

#### TIER 2 ROLLUP COMPLETED AP RED %

```dax
DIVIDE([TIER 2 ROLLUP COMPLETED AP RED #],[TIER 2 ROLLUP COMPLETED ASSESSED #])
```

#### TIER 2 ROLLUP COMPLETED AP YELLOW #

```dax
CALCULATE
(
DISTINCTCOUNT(TPT[ROLLUP_CNTRY]),
'TPT Metadata'[ROLLUP_TIER] /* DB: dataset_table.ROLLUP_TIER */="Tier 2" && 
'TPT Metadata'[ROLLUP_AP_COMPLETION_STATUS] /* DB: dataset_table.ROLLUP_AP_COMPLETION_STATUS */="Completed" && 
'TPT Metadata'[ROLLUP_ACCOUNT_PLAN_QUALITY] /* DB: dataset_table.ROLLUP_ACCOUNT_PLAN_QUALITY */="Yellow"
)
```

#### TIER 2 ROLLUP COMPLETED AP YELLOW %

```dax
DIVIDE([TIER 2 ROLLUP COMPLETED AP YELLOW #],[TIER 2 ROLLUP COMPLETED ASSESSED #])
```

#### TIER 2 ROLLUP COMPLETED ASSESSED #

```dax
CALCULATE(
    DISTINCTCOUNT(TPT[ROLLUP_CNTRY])
    ,'TPT Metadata'[ROLLUP_TIER] /* DB: dataset_table.ROLLUP_TIER */ = "Tier 2"
    ,'TPT Metadata'[ROLLUP_AP_COMPLETION_STATUS] /* DB: dataset_table.ROLLUP_AP_COMPLETION_STATUS */ = "Completed"
    ,'TPT Metadata'[ROLLUP_ACCOUNT_PLAN_QUALITY] /* DB: dataset_table.ROLLUP_ACCOUNT_PLAN_QUALITY */ IN {"Green","Yellow","Red"}
)
```

#### TIER 2 ROLLUP COMPLETED ASSESSED %

```dax
DIVIDE([TIER 2 ROLLUP COMPLETED ASSESSED #],[TIER 2 ROLLUP COMPLETED #])
```

#### TIER 2 SUB GNARR $

```dax
CALCULATE([OPPTY $],'TPT Metadata'[CLEANED_SUB_TIER] /* DB: dataset_table.CLEANED_SUB_TIER */ = "Tier 2")
```

#### TIER 2 SUB WITH GNARR #

```dax
CALCULATE(DISTINCTCOUNT(Pipeline[ACCOUNT_SUB_ID]),
            'TPT Metadata'[CLEANED_SUB_TIER] /* DB: dataset_table.CLEANED_SUB_TIER */ = "Tier 2",
            NOT(ISBLANK(Pipeline[OPPTY]))
            )
```

#### TIER 2 SUB WITHOUT GNARR #

```dax
VAR _AllSUBWithOPPTY = 
    CALCULATETABLE (
        VALUES (Pipeline[ACCOUNT_SUB_ID]),
        NOT(ISBLANK(Pipeline[OPPTY])),FILTER('Snapshot Quarter','Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */="0"),FILTER('Pay Measure','Pay Measure'[PAY_MEASURE_DISPLAY] /* DB: vw_EBI_PAY_MEASURE.PAY_MEASURE_DISPLAY */="ASV"),FILTER(OPG,OPG[BU]="DX"),FILTER('TPT Metadata','TPT Metadata'[CLEANED_SUB_TIER] /* DB: dataset_table.CLEANED_SUB_TIER */="Tier 2")
    )

VAR _tptwithallsub =
    CALCULATETABLE(VALUES(TPT[SUB_CNTRY]), 'TPT Metadata'[CLEANED_SUB_TIER] /* DB: dataset_table.CLEANED_SUB_TIER */ = "Tier 2")

VAR _RemainingSUB =
    EXCEPT ( _tptwithallsub, _AllSUBWithOPPTY )

VAR Result = COUNTROWS(_RemainingSUB)  

RETURN
    Result
```

#### TIER 3 ACCTS #

```dax
CALCULATE(
    DISTINCTCOUNT(TPT[SUB_CNTRY])
    ,'TPT Metadata'[CLEANED_SUB_TIER] /* DB: dataset_table.CLEANED_SUB_TIER */ = "Tier 3"
)
```

#### TIER 3 PRNT ACCTS #

```dax
CALCULATE(
    DISTINCTCOUNT(TPT[PRNT_CNTRY])
    ,'TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */ = "Tier 3"
)
```

#### TIER 3 PRNT GNARR $

```dax
CALCULATE([OPPTY $],'TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */ = "Tier 3")
```

#### TIER 3 PRNT GROSS CREATED $

```dax
CALCULATE([GROSS CREATED QTD $],'TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */ = "Tier 3")
```

#### TIER 3 PRNT WITH GNARR #

```dax
CALCULATE(DISTINCTCOUNT(Pipeline[ACCOUNT_PARENT_ID]),
            'TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */ = "Tier 3",
            NOT(ISBLANK(Pipeline[OPPTY]))
            )
```

#### TIER 3 PRNT WITHOUT GNARR #

```dax
VAR _AllPRNTWithOPPTY = 
    CALCULATETABLE (
        VALUES (Pipeline[ACCOUNT_PARENT_ID]),
        NOT(ISBLANK(Pipeline[OPPTY])),FILTER('Snapshot Quarter','Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */="0"),FILTER('Pay Measure','Pay Measure'[PAY_MEASURE_DISPLAY] /* DB: vw_EBI_PAY_MEASURE.PAY_MEASURE_DISPLAY */="ASV"),FILTER(OPG,OPG[BU]="DX"),FILTER('TPT Metadata','TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */="Tier 3")
    )

VAR _tptwithallprnt =
    CALCULATETABLE(VALUES(TPT[PRNT_CNTRY]), 'TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */ = "Tier 3")

VAR _RemainingPRNT =
    EXCEPT ( _tptwithallprnt, _AllPRNTWithOPPTY )

VAR Result = COUNTROWS(_RemainingPRNT)
    

RETURN
    Result
```

#### TIER 3 PRNT WON $

```dax
CALCULATE([WON $],'TPT Metadata'[PARENT_TIER] /* DB: dataset_table.PARENT_TIER */ = "Tier 3")
```

#### TIER 3 ROLLUP ACCTS #

```dax
CALCULATE(
    DISTINCTCOUNT(TPT[ROLLUP_CNTRY])
    ,'TPT Metadata'[ROLLUP_TIER] /* DB: dataset_table.ROLLUP_TIER */ = "Tier 3"
)
```

#### TIER 3 ROLLUP COMPLETED #

```dax
CALCULATE(
    DISTINCTCOUNT(TPT[ROLLUP_CNTRY])
    ,'TPT Metadata'[ROLLUP_TIER] /* DB: dataset_table.ROLLUP_TIER */ = "Tier 3"
    ,'TPT Metadata'[ROLLUP_AP_COMPLETION_STATUS] /* DB: dataset_table.ROLLUP_AP_COMPLETION_STATUS */ = "Completed"
)
```

#### TIER 3 ROLLUP COMPLETED %

```dax
DIVIDE(
    [TIER 3 ROLLUP COMPLETED #],
    [TIER 3 ROLLUP ACCTS #]
)
```

#### TIER 3 ROLLUP COMPLETED AP GREEN #

```dax
CALCULATE
(
DISTINCTCOUNT(TPT[ROLLUP_CNTRY]),
'TPT Metadata'[ROLLUP_TIER] /* DB: dataset_table.ROLLUP_TIER */="Tier 3" && 
'TPT Metadata'[ROLLUP_AP_COMPLETION_STATUS] /* DB: dataset_table.ROLLUP_AP_COMPLETION_STATUS */="Completed" && 
'TPT Metadata'[ROLLUP_ACCOUNT_PLAN_QUALITY] /* DB: dataset_table.ROLLUP_ACCOUNT_PLAN_QUALITY */="Green"
)
```

#### TIER 3 ROLLUP COMPLETED AP GREEN %

```dax
DIVIDE([TIER 3 ROLLUP COMPLETED AP GREEN #],[TIER 3 ROLLUP COMPLETED ASSESSED #])
```

#### TIER 3 ROLLUP COMPLETED AP RED #

```dax
CALCULATE
(
DISTINCTCOUNT(TPT[ROLLUP_CNTRY]),
'TPT Metadata'[ROLLUP_TIER] /* DB: dataset_table.ROLLUP_TIER */="Tier 3" && 
'TPT Metadata'[ROLLUP_AP_COMPLETION_STATUS] /* DB: dataset_table.ROLLUP_AP_COMPLETION_STATUS */="Completed" && 
'TPT Metadata'[ROLLUP_ACCOUNT_PLAN_QUALITY] /* DB: dataset_table.ROLLUP_ACCOUNT_PLAN_QUALITY */="Red"
)
```

#### TIER 3 ROLLUP COMPLETED AP RED %

```dax
DIVIDE([TIER 3 ROLLUP COMPLETED AP RED #],[TIER 3 ROLLUP COMPLETED ASSESSED #])
```

#### TIER 3 ROLLUP COMPLETED AP YELLOW #

```dax
CALCULATE
(
DISTINCTCOUNT(TPT[ROLLUP_CNTRY]),
'TPT Metadata'[ROLLUP_TIER] /* DB: dataset_table.ROLLUP_TIER */="Tier 3" && 
'TPT Metadata'[ROLLUP_AP_COMPLETION_STATUS] /* DB: dataset_table.ROLLUP_AP_COMPLETION_STATUS */="Completed" && 
'TPT Metadata'[ROLLUP_ACCOUNT_PLAN_QUALITY] /* DB: dataset_table.ROLLUP_ACCOUNT_PLAN_QUALITY */="Yellow"
)
```

#### TIER 3 ROLLUP COMPLETED AP YELLOW %

```dax
DIVIDE([TIER 3 ROLLUP COMPLETED AP YELLOW #],[TIER 3 ROLLUP COMPLETED ASSESSED #])
```

#### TIER 3 ROLLUP COMPLETED ASSESSED #

```dax
CALCULATE(
    DISTINCTCOUNT(TPT[ROLLUP_CNTRY])
    ,'TPT Metadata'[ROLLUP_TIER] /* DB: dataset_table.ROLLUP_TIER */ = "Tier 3"
    ,'TPT Metadata'[ROLLUP_AP_COMPLETION_STATUS] /* DB: dataset_table.ROLLUP_AP_COMPLETION_STATUS */ = "Completed"
    ,'TPT Metadata'[ROLLUP_ACCOUNT_PLAN_QUALITY] /* DB: dataset_table.ROLLUP_ACCOUNT_PLAN_QUALITY */ IN {"Green","Yellow","Red"}
)
```

#### TIER 3 ROLLUP COMPLETED ASSESSED %

```dax
DIVIDE([TIER 3 ROLLUP COMPLETED ASSESSED #],[TIER 3 ROLLUP COMPLETED #])
```

#### TIER 3 SUB GNARR $

```dax
CALCULATE([OPPTY $],'TPT Metadata'[CLEANED_SUB_TIER] /* DB: dataset_table.CLEANED_SUB_TIER */ = "Tier 3")
```

#### TIER 3 SUB WITHOUT GNARR #

```dax
VAR _AllSUBWithOPPTY = 
    CALCULATETABLE (
        VALUES (Pipeline[ACCOUNT_SUB_ID]),
        NOT(ISBLANK(Pipeline[OPPTY])),FILTER('Snapshot Quarter','Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */="0"),FILTER('Pay Measure','Pay Measure'[PAY_MEASURE_DISPLAY] /* DB: vw_EBI_PAY_MEASURE.PAY_MEASURE_DISPLAY */="ASV"),FILTER(OPG,OPG[BU]="DX"),FILTER('TPT Metadata','TPT Metadata'[CLEANED_SUB_TIER] /* DB: dataset_table.CLEANED_SUB_TIER */="Tier 3")
    )

VAR _tptwithallsub =
    CALCULATETABLE(VALUES(TPT[SUB_CNTRY]), 'TPT Metadata'[CLEANED_SUB_TIER] /* DB: dataset_table.CLEANED_SUB_TIER */ = "Tier 3")

VAR _RemainingSUB =
    EXCEPT ( _tptwithallsub, _AllSUBWithOPPTY )

VAR Result = COUNTROWS(_RemainingSUB)  

RETURN
    Result
```

### 3.15. _Target Measures (17 measures) — DB: measure-only

#### BOOKINGS TARGET

```dax
// VAR A =
// CALCULATE(
//     SUM(Quota[QUOTA_ACTUAL]),
//     FILTER(
//         'Region Hierarchy',
//         LEN('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */) = 18
//     )
// )
// +
// CALCULATE(
//     SUM(Quota[QUOTA_ACTUAL]),
//     FILTER(
//         ALL('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */),
//         LEN('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */) > 18 
//         && MAX('Region Hierarchy'[REGION_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REGION_ID */) IN VALUES(Quota[REGION_ID])
//     )-- ,'Region Hierarchy'[REGION_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REGION_ID */ IN VALUES(Quota[REGION_ID])
// )
-- Whenever this logic needs to be implemented, replace SUM(Quota[QUOTA_ACTUAL]) from the below dax with the variable A.


VAR SelectedTargetType = SELECTEDVALUE(
    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */,
    [DEFAULT TARGET TYPE]
)

VAR Bookings_Target = SWITCH(
    TRUE(),
    SelectedTargetType = "Quota", SUM(Quota[QUOTA_ACTUAL]),
    SelectedTargetType = "Plan" || SelectedTargetType = "QRF", CALCULATE(
                                                                    SUM( 'Plan & QRF'[QUOTA_PLAN] /* DB: vw_TF_EBI_PLAN_RPT.QUOTA_PLAN */ ),
                                                                    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = SelectedTargetType
    )
)

VAR Result = If (
                ISINSCOPE('Region Hierarchy'[TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM */) ||
                ISINSCOPE('Region Hierarchy'[SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM */) ||
                ISINSCOPE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */) ||
                ISINSCOPE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */),
                CALCULATE(SUM(Quota[QUOTA_ACTUAL]), 'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota", ALL('Target Type')),
                Bookings_Target)

RETURN Result
```

#### CQ LEFT TO GO TARGET

```dax
[PIPE TARGET] - [CQ RUNNING TARGET]
```

#### CQ RUNNING TARGET

```dax
VAR PipeTarget = [PIPE TARGET]

VAR Q1 = SWITCH(
    MAX( 'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */ ),
    "W1", (PipeTarget*0.1)/6,
    "W2",(PipeTarget*0.1*2)/6,
    "W3",(PipeTarget*0.1*3)/6,
    "W4",(PipeTarget*0.1*4)/6,
    "W5", (PipeTarget*0.1*5)/6,
    "W6",(PipeTarget*0.1), 
    "W7", ((PipeTarget*0.1) +(PipeTarget*0.9)/7),
    "W8",((PipeTarget*0.1) +(PipeTarget*0.9*2)/7),  
    "W9",((PipeTarget*0.1) +(PipeTarget*0.9*3)/7),
    "W10",((PipeTarget*0.1) +(PipeTarget*0.9*4)/7),
    "W11",((PipeTarget*0.1) +(PipeTarget*0.9*5)/7),
    "W12",((PipeTarget*0.1) +(PipeTarget*0.9*6)/7),
    PipeTarget
)

VAR Q234 = SWITCH(
    MAX( 'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */ ),
    "W1", (PipeTarget/13),
    "W2",(PipeTarget*2)/13,
    "W3",(PipeTarget*3)/13,
    "W4",(PipeTarget*4)/13,
    "W5",(PipeTarget*5)/13,
    "W6",(PipeTarget*6)/13,
    "W7",(PipeTarget*7)/13,
    "W8",(PipeTarget*8)/13,
    "W9",(PipeTarget*9)/13,
    "W10",(PipeTarget*10)/13,
    "W11",(PipeTarget*11)/13,
    "W12",(PipeTarget*12)/13,
    PipeTarget
)

Return
IF(
    Max('Snapshot Quarter'[SNAPSHOT_GENERIC_QTR] /* DB: vw_EBI_Caldate.SNAPSHOT_GENERIC_QTR */) = "Q1",
    Q1,
    Q234
)
```

#### CY PLAN/QUOTA $

```dax
VAR CYear = CALCULATE(MIN( 'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.FISCAL_YR */ ),'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)

VAR Result = CALCULATE([BOOKINGS TARGET],'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.FISCAL_YR */ = CYear)

RETURN Result
```

#### DEFAULT TARGET TYPE

```dax
"Plan"
```

#### GENERATION TARGET

```dax
VAR SelectedTargetType = SELECTEDVALUE(
    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */,
    [DEFAULT TARGET TYPE]
)

VAR Generation_Target = SWITCH(
    TRUE(),
    SelectedTargetType = "Quota", SUM( Quota[PIPE_TARGET_SURVIVAL_RATE] ),
    SelectedTargetType = "Plan" || SelectedTargetType = "QRF", CALCULATE(
                                                                    SUM( 'Plan & QRF'[PIPE_TARGET/SURVIVAL_RATIO] /* DB: vw_TF_EBI_PLAN_RPT.PIPE_TARGET/SURVIVAL_RATIO */ ),
                                                                    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = SelectedTargetType
    )
)


VAR Result = If (
                ISINSCOPE('Region Hierarchy'[TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM */) ||
                ISINSCOPE('Region Hierarchy'[SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM */) ||
                ISINSCOPE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */) ||
                ISINSCOPE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */),
                CALCULATE(SUM( Quota[PIPE_TARGET_SURVIVAL_RATE] ), 'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota", ALL('Target Type')),
                Generation_Target)
RETURN Result
```

#### GENERATION TARGET SS4

```dax
VAR SelectedTargetType = SELECTEDVALUE(
    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */,
    [DEFAULT TARGET TYPE]
)

VAR Generation_Target = SWITCH(
    TRUE(),
    SelectedTargetType = "Quota", SUM( Quota[PIPE_TARGET_SURVIVAL_RATE_SS4] ),
    SelectedTargetType = "Plan" || SelectedTargetType = "QRF", CALCULATE(
                                                                    SUM( 'Plan & QRF'[PIPE_TARGET_SURVIVAL_RATIO_SS4] /* DB: vw_TF_EBI_PLAN_RPT.PIPE_TARGET_SURVIVAL_RATIO_SS4 */ ),
                                                                    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = SelectedTargetType
    )
)


VAR Result = If (
                ISINSCOPE('Region Hierarchy'[TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM */) ||
                ISINSCOPE('Region Hierarchy'[SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM */) ||
                ISINSCOPE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */) ||
                ISINSCOPE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */),
                CALCULATE(SUM( Quota[PIPE_TARGET_SURVIVAL_RATE_SS4] ), 'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota", ALL('Target Type')),
                Generation_Target)
RETURN Result
```

#### IN QTR GC TARGET

```dax
// VAR A =
// CALCULATE(
//     SUM(Quota[IN_QTR_GC_TARGET]),
//     FILTER(
//         'Region Hierarchy',
//         LEN('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */) = 18
//     )
// )
// +
// CALCULATE(
//     SUM(Quota[IN_QTR_GC_TARGET]),
//     FILTER(
//         ALL('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */),
//         LEN('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */) > 18 
//         && MAX('Region Hierarchy'[REGION_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REGION_ID */) IN VALUES(Quota[REGION_ID])
//     )-- ,'Region Hierarchy'[REGION_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REGION_ID */ IN VALUES(Quota[REGION_ID])
// )
-- Whenever this logic needs to be implemented, replace SUM(Quota[IN_QTR_GC_TARGET]) from the below dax with the variable A.

VAR SelectedTargetType = SELECTEDVALUE(
    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */,
    [DEFAULT TARGET TYPE]
)

VAR In_Qtr_GC_Target = SWITCH(
    TRUE(),
    SelectedTargetType = "Quota", SUM(Quota[IN_QTR_GC_TARGET]),
    SelectedTargetType = "Plan" || SelectedTargetType = "QRF", CALCULATE(
                                                                    SUM( 'Plan & QRF'[IN_QTR_GC_TARGET] /* DB: vw_TF_EBI_PLAN_RPT.IN_QTR_GC_TARGET */ ),
                                                                    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = SelectedTargetType
    )
)

VAR Result = If (
                ISINSCOPE('Region Hierarchy'[TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM */) ||
                ISINSCOPE('Region Hierarchy'[SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM */) ||
                ISINSCOPE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */) ||
                ISINSCOPE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */),
                CALCULATE(SUM(Quota[IN_QTR_GC_TARGET]), 'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota", ALL('Target Type')),
                In_Qtr_GC_Target)

RETURN Result
```

#### IN QTR GC TARGET SS4

```dax
// VAR A =
// CALCULATE(
//     SUM(Quota[IN_QTR_GC_TARGET_SS4]),
//     FILTER(
//         'Region Hierarchy',
//         LEN('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */) = 18
//     )
// )
// +
// CALCULATE(
//     SUM(Quota[IN_QTR_GC_TARGET_SS4]),
//     FILTER(
//         ALL('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */),
//         LEN('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */) > 18 
//         && MAX('Region Hierarchy'[REGION_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REGION_ID */) IN VALUES(Quota[REGION_ID])
//     )-- ,'Region Hierarchy'[REGION_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REGION_ID */ IN VALUES(Quota[REGION_ID])
// )
-- Whenever this logic needs to be implemented, replace SUM(Quota[IN_QTR_GC_TARGET_SS4]) from the below dax with the variable A.

VAR SelectedTargetType = SELECTEDVALUE(
    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */,
    [DEFAULT TARGET TYPE]
)

VAR In_Qtr_GC_Target_SS4 = SWITCH(
    TRUE(),
    SelectedTargetType = "Quota", SUM(Quota[IN_QTR_GC_TARGET_SS4]),
    SelectedTargetType = "Plan" || SelectedTargetType = "QRF", CALCULATE(
                                                                    SUM( 'Plan & QRF'[IN_QTR_GC_TARGET_SS4] /* DB: vw_TF_EBI_PLAN_RPT.IN_QTR_GC_TARGET_SS4 */ ),
                                                                    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = SelectedTargetType
    )
)


VAR Result = If (
                ISINSCOPE('Region Hierarchy'[TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM */) ||
                ISINSCOPE('Region Hierarchy'[SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM */) ||
                ISINSCOPE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */) ||
                ISINSCOPE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */),
                CALCULATE(SUM(Quota[IN_QTR_GC_TARGET_SS4]), 'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota", ALL('Target Type')),
                In_Qtr_GC_Target_SS4)

RETURN Result
```

#### IN QTR GC TARGET SS5

```dax
// VAR A =
// CALCULATE(
//     SUM(Quota[IN_QTR_GC_TARGET_SS5]),
//     FILTER(
//         'Region Hierarchy',
//         LEN('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */) = 18
//     )
// )
// +
// CALCULATE(
//     SUM(Quota[IN_QTR_GC_TARGET_SS5]),
//     FILTER(
//         ALL('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */),
//         LEN('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */) > 18 
//         && MAX('Region Hierarchy'[REGION_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REGION_ID */) IN VALUES(Quota[REGION_ID])
//     )-- ,'Region Hierarchy'[REGION_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REGION_ID */ IN VALUES(Quota[REGION_ID])
// )
-- Whenever this logic needs to be implemented, replace SUM(Quota[IN_QTR_GC_TARGET_SS5]) from the below dax with the variable A.

VAR SelectedTargetType = SELECTEDVALUE(
    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */,
    [DEFAULT TARGET TYPE]
)

VAR In_Qtr_GC_Target_SS5 = SWITCH(
    TRUE(),
    SelectedTargetType = "Quota", SUM(Quota[IN_QTR_GC_TARGET_SS5]),
    SelectedTargetType = "Plan" || SelectedTargetType = "QRF", CALCULATE(
                                                                    SUM( 'Plan & QRF'[IN_QTR_GC_TARGET_SS5] /* DB: vw_TF_EBI_PLAN_RPT.IN_QTR_GC_TARGET_SS5 */ ),
                                                                    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = SelectedTargetType
    )
)


VAR Result = If (
                ISINSCOPE('Region Hierarchy'[TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM */) ||
                ISINSCOPE('Region Hierarchy'[SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM */) ||
                ISINSCOPE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */) ||
                ISINSCOPE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */),
                CALCULATE(SUM(Quota[IN_QTR_GC_TARGET_SS5]), 'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota", ALL('Target Type')),
                In_Qtr_GC_Target_SS5)

RETURN Result
```

#### PIPE TARGET

```dax
// VAR A =
// CALCULATE(
//     SUM( Quota[QUOTA_REQ] ),
//     FILTER(
//         'Region Hierarchy',
//         LEN('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */) = 18
//     )
// )
// +
// CALCULATE(
//     SUM( Quota[QUOTA_REQ] ),
//     FILTER(
//         ALL('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */),
//         LEN('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */) > 18 
//         && MAX('Region Hierarchy'[REGION_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REGION_ID */) IN VALUES(Quota[REGION_ID])
//     )-- ,'Region Hierarchy'[REGION_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REGION_ID */ IN VALUES(Quota[REGION_ID])
// )
-- Whenever this logic needs to be implemented, replace SUM( Quota[QUOTA_REQ] ) from the below dax with the variable A.

VAR SelectedTargetType = SELECTEDVALUE(
    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */,
    [DEFAULT TARGET TYPE]
)

VAR Pipe_Target = SWITCH(
    TRUE(),
    SelectedTargetType = "Quota", SUM( Quota[QUOTA_REQ] ),
    SelectedTargetType = "Plan" || SelectedTargetType = "QRF", CALCULATE(
                                                                    SUM( 'Plan & QRF'[PIPELINE_REQ] /* DB: vw_TF_EBI_PLAN_RPT.PIPELINE_REQ */ ),
                                                                    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = SelectedTargetType
    )
)

VAR Result = If (
                ISINSCOPE('Region Hierarchy'[TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM */) ||
                ISINSCOPE('Region Hierarchy'[SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM */) ||
                ISINSCOPE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */) ||
                ISINSCOPE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */),
                CALCULATE(SUM( Quota[QUOTA_REQ] ), 'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota", ALL('Target Type')),
                Pipe_Target)

RETURN Result
```

#### PIPE TARGET SS4

```dax
// VAR A =
// CALCULATE(
//     SUM( Quota[QUOTA_REQ_SS4] ),
//     FILTER(
//         'Region Hierarchy',
//         LEN('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */) = 18
//     )
// )
// +
// CALCULATE(
//     SUM( Quota[QUOTA_REQ_SS4] ),
//     FILTER(
//         ALL('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */),
//         LEN('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */) > 18 
//         && MAX('Region Hierarchy'[REGION_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REGION_ID */) IN VALUES(Quota[REGION_ID])
//     )-- ,'Region Hierarchy'[REGION_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REGION_ID */ IN VALUES(Quota[REGION_ID])
// )
-- Whenever this logic needs to be implemented, replace SUM( Quota[QUOTA_REQ_SS4] ) from the below dax with the variable A.

VAR SelectedTargetType = SELECTEDVALUE(
    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */,
    [DEFAULT TARGET TYPE]
)

VAR PIPE_TARGET_SS4 = SWITCH(
    TRUE(),
    SelectedTargetType = "Quota", SUM( Quota[QUOTA_REQ_SS4] ),
    SelectedTargetType = "Plan" || SelectedTargetType = "QRF", CALCULATE(
                                                                    SUM( 'Plan & QRF'[PIPELINE_REQ_SS4] /* DB: vw_TF_EBI_PLAN_RPT.PIPELINE_REQ_SS4 */ ),
                                                                    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = SelectedTargetType
    )
)

VAR Result = If (
                ISINSCOPE('Region Hierarchy'[TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM */) ||
                ISINSCOPE('Region Hierarchy'[SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM */) ||
                ISINSCOPE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */) ||
                ISINSCOPE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */),
                CALCULATE(SUM( Quota[QUOTA_REQ_SS4] ), 'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota", ALL('Target Type')),
                PIPE_TARGET_SS4)

RETURN Result
```

#### PIPE TARGET SS5

```dax
// VAR A =
// CALCULATE(
//     SUM( Quota[QUOTA_REQ_SS5] ),
//     FILTER(
//         'Region Hierarchy',
//         LEN('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */) = 18
//     )
// )
// +
// CALCULATE(
//     SUM( Quota[QUOTA_REQ_SS5] ),
//     FILTER(
//         ALL('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */),
//         LEN('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */) > 18 
//         && MAX('Region Hierarchy'[REGION_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REGION_ID */) IN VALUES(Quota[REGION_ID])
//     )-- ,'Region Hierarchy'[REGION_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REGION_ID */ IN VALUES(Quota[REGION_ID])
// )
-- Whenever this logic needs to be implemented, replace SUM( Quota[QUOTA_REQ_SS5] ) from the below dax with the variable A.

VAR SelectedTargetType = SELECTEDVALUE(
    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */,
    [DEFAULT TARGET TYPE]
)

VAR PIPE_TARGET_SS5 = SWITCH(
    TRUE(),
    SelectedTargetType = "Quota", SUM( Quota[QUOTA_REQ_SS5] ),
    SelectedTargetType = "Plan" || SelectedTargetType = "QRF", CALCULATE(
                                                                    SUM( 'Plan & QRF'[PIPELINE_REQ_SS5] /* DB: vw_TF_EBI_PLAN_RPT.PIPELINE_REQ_SS5 */ ),
                                                                    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = SelectedTargetType
    )
)

VAR Result = If (
                ISINSCOPE('Region Hierarchy'[TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM */) ||
                ISINSCOPE('Region Hierarchy'[SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM */) ||
                ISINSCOPE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */) ||
                ISINSCOPE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */),
                CALCULATE(SUM( Quota[QUOTA_REQ_SS5] ), 'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota", ALL('Target Type')),
                PIPE_TARGET_SS5)

RETURN Result
```

#### PIPE TARGET SURVIVAL RATE SS4

```dax
// VAR A =
// CALCULATE(
//     SUM( Quota[PIPE_TARGET_SURVIVAL_RATE_SS4] ),
//     FILTER(
//         'Region Hierarchy',
//         LEN('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */) = 18
//     )
// )
// +
// CALCULATE(
//     SUM( Quota[PIPE_TARGET_SURVIVAL_RATE_SS4] ),
//     FILTER(
//         ALL('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */),
//         LEN('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */) > 18 
//         && MAX('Region Hierarchy'[REGION_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REGION_ID */) IN VALUES(Quota[REGION_ID])
//     )-- ,'Region Hierarchy'[REGION_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REGION_ID */ IN VALUES(Quota[REGION_ID])
// )
-- Whenever this logic needs to be implemented, replace SUM( Quota[PIPE_TARGET_SURVIVAL_RATE_SS4] ) from the below dax with the variable A.

VAR SelectedTargetType = SELECTEDVALUE(
    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */,
    [DEFAULT TARGET TYPE]
)

VAR Output = SWITCH(
    TRUE(),
    SelectedTargetType = "Quota", SUM( Quota[PIPE_TARGET_SURVIVAL_RATE_SS4] ),
    SelectedTargetType = "Plan" || SelectedTargetType = "QRF", CALCULATE(
                                                                    SUM( 'Plan & QRF'[PIPE_TARGET_SURVIVAL_RATIO_SS4] /* DB: vw_TF_EBI_PLAN_RPT.PIPE_TARGET_SURVIVAL_RATIO_SS4 */ ),
                                                                    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = SelectedTargetType
    )
)

VAR Result = If (
                ISINSCOPE('Region Hierarchy'[TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM */) ||
                ISINSCOPE('Region Hierarchy'[SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM */) ||
                ISINSCOPE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */) ||
                ISINSCOPE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */),
                CALCULATE(SUM( Quota[PIPE_TARGET_SURVIVAL_RATE_SS4] ), 'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota", ALL('Target Type')),
                Output)
                
RETURN Result
```

#### PIPE TARGET SURVIVAL RATE SS5

```dax
// VAR A =
// CALCULATE(
//     SUM( Quota[PIPE_TARGET_SURVIVAL_RATE_SS5] ),
//     FILTER(
//         'Region Hierarchy',
//         LEN('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */) = 18
//     )
// )
// +
// CALCULATE(
//     SUM( Quota[PIPE_TARGET_SURVIVAL_RATE_SS5] ),
//     FILTER(
//         ALL('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */),
//         LEN('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */) > 18 
//         && MAX('Region Hierarchy'[REGION_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REGION_ID */) IN VALUES(Quota[REGION_ID])
//     )-- ,'Region Hierarchy'[REGION_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REGION_ID */ IN VALUES(Quota[REGION_ID])
// )
-- Whenever this logic needs to be implemented, replace SUM( Quota[PIPE_TARGET_SURVIVAL_RATE_SS5] ) from the below dax with the variable A.

VAR SelectedTargetType = SELECTEDVALUE(
    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */,
    [DEFAULT TARGET TYPE]
)

VAR Output = SWITCH(
    TRUE(),
    SelectedTargetType = "Quota", SUM( Quota[PIPE_TARGET_SURVIVAL_RATE_SS5] ),
    SelectedTargetType = "Plan" || SelectedTargetType = "QRF", CALCULATE(
                                                                    SUM( 'Plan & QRF'[PIPE_TARGET/SURVIVAL_RATIO_SS5] /* DB: vw_TF_EBI_PLAN_RPT.PIPE_TARGET/SURVIVAL_RATIO_SS5 */ ),
                                                                    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = SelectedTargetType
    )
)

VAR Result = If (
                ISINSCOPE('Region Hierarchy'[TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM */) ||
                ISINSCOPE('Region Hierarchy'[SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM */) ||
                ISINSCOPE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */) ||
                ISINSCOPE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */),
                CALCULATE(SUM( Quota[PIPE_TARGET_SURVIVAL_RATE_SS5] ), 'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota", ALL('Target Type')),
                Output)
                
RETURN Result
```

#### PIPE TARGET TO GO

```dax
'_Target Measures'[TARGET LEFT TO GO $] * '_Coverage Measures'[COVERAGE PIPE TARGET / BOOKINGS TARGET X]
```

#### TARGET LEFT TO GO $

```dax
VAR TargetLTG = [BOOKINGS TARGET] - [WON $]
 
VAR Result = IF(
    TargetLTG < 0,
    0,
    TargetLTG
)
 
RETURN Result
```

### 3.16. _Walk Measures (13 measures) — DB: measure-only

#### ABS WALK VALUE

```dax
ABS('_Walk Measures'[WALK VALUE])
```

#### BOQ WALK VALUE

```dax
CALCULATE(SUM('Pipe Walk'[BOQ_GROSSASV] /* DB: vw_TF_EBI_PIPE_WALK.BOQ_GROSSASV */))
```

#### CURR WALK VALUE

```dax
CALCULATE(SUM('Pipe Walk'[CURR_GROSSASV] /* DB: vw_TF_EBI_PIPE_WALK.CURR_GROSSASV */))
```

#### LOST QTD $

```dax
VAR SelectedFreq = SELECTEDVALUE(
    'Daily Weekly Switch'[Frequency],
    "Daily"
)

VAR Result = SWITCH(
    SelectedFreq,
    "Daily", CALCULATE (
    -1 * [STAGE PROGRESSION ASV],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ IN { 0, 1, 2, 3, 4 },
    'Pipe Walk'[FREQUENCY] /* DB: vw_TF_EBI_PIPE_WALK.FREQUENCY */ = "Daily",
    'Pipe Walk'[DAY_FLAG] /* DB: vw_TF_EBI_PIPE_WALK.DAY_FLAG */ = "QTD",
    'Pipe Walk'[OFFSET_FLAG] /* DB: vw_TF_EBI_PIPE_WALK.OFFSET_FLAG */ = FALSE,
    'Pipe Walk'[PREV_SALES_STAGE_DERIVED] /* DB: vw_TF_EBI_PIPE_WALK.PREV_SALES_STAGE_DERIVED */ IN { "In Qtr", "Pulled In", "S5+", "S4", "S3" },
    'Pipe Walk'[CURR_SALES_STAGE_DERIVED] /* DB: vw_TF_EBI_PIPE_WALK.CURR_SALES_STAGE_DERIVED */ IN { "Lost", "Clean Up" }
),
    "Weekly", CALCULATE (
    -1 * [STAGE PROGRESSION ASV],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ IN { 0, 1, 2, 3, 4 },
    'Pipe Walk'[FREQUENCY] /* DB: vw_TF_EBI_PIPE_WALK.FREQUENCY */ = "RTB",
    'Pipe Walk'[DAY_FLAG] /* DB: vw_TF_EBI_PIPE_WALK.DAY_FLAG */ = "QTD",
    'Pipe Walk'[OFFSET_FLAG] /* DB: vw_TF_EBI_PIPE_WALK.OFFSET_FLAG */ = FALSE,
    'Pipe Walk'[PREV_SALES_STAGE_DERIVED] /* DB: vw_TF_EBI_PIPE_WALK.PREV_SALES_STAGE_DERIVED */ IN { "In Qtr", "Pulled In", "S5+", "S4", "S3" },
    'Pipe Walk'[CURR_SALES_STAGE_DERIVED] /* DB: vw_TF_EBI_PIPE_WALK.CURR_SALES_STAGE_DERIVED */ IN { "Lost", "Clean Up" }
)
)


return Result
```

#### LOST WTD $

```dax
VAR SelectedFreq = SELECTEDVALUE(
    'Daily Weekly Switch'[Frequency],
    "Daily"
)

VAR Result = SWITCH(
    SelectedFreq,
    "Daily", CALCULATE (
    -1 * [STAGE PROGRESSION ASV],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ IN { 0, 1, 2, 3, 4 },
    'Pipe Walk'[FREQUENCY] /* DB: vw_TF_EBI_PIPE_WALK.FREQUENCY */ = "Daily",
    'Pipe Walk'[DAY_FLAG] /* DB: vw_TF_EBI_PIPE_WALK.DAY_FLAG */ = "WTD",
    'Pipe Walk'[OFFSET_FLAG] /* DB: vw_TF_EBI_PIPE_WALK.OFFSET_FLAG */ = FALSE,
    'Pipe Walk'[PREV_SALES_STAGE_DERIVED] /* DB: vw_TF_EBI_PIPE_WALK.PREV_SALES_STAGE_DERIVED */ IN { "In Qtr", "Pulled In", "S5+", "S4", "S3" },
    'Pipe Walk'[CURR_SALES_STAGE_DERIVED] /* DB: vw_TF_EBI_PIPE_WALK.CURR_SALES_STAGE_DERIVED */ IN { "Lost", "Clean Up" }
),
    "Weekly", CALCULATE (
    -1 * [STAGE PROGRESSION ASV],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ IN { 0, 1, 2, 3, 4 },
    'Pipe Walk'[FREQUENCY] /* DB: vw_TF_EBI_PIPE_WALK.FREQUENCY */ = "RTB",
    'Pipe Walk'[DAY_FLAG] /* DB: vw_TF_EBI_PIPE_WALK.DAY_FLAG */ = "WTD",
    'Pipe Walk'[OFFSET_FLAG] /* DB: vw_TF_EBI_PIPE_WALK.OFFSET_FLAG */ = FALSE,
    'Pipe Walk'[PREV_SALES_STAGE_DERIVED] /* DB: vw_TF_EBI_PIPE_WALK.PREV_SALES_STAGE_DERIVED */ IN { "In Qtr", "Pulled In", "S5+", "S4", "S3" },
    'Pipe Walk'[CURR_SALES_STAGE_DERIVED] /* DB: vw_TF_EBI_PIPE_WALK.CURR_SALES_STAGE_DERIVED */ IN { "Lost", "Clean Up" }
)
)


return Result
```

#### NET MOVEMENT $

```dax
[PUSHED OUT $] + [PULLED IN $]
```

#### PREV WALK VALUE

```dax
CALCULATE(SUM('Pipe Walk'[PREV_GROSSASV] /* DB: vw_TF_EBI_PIPE_WALK.PREV_GROSSASV */))
```

#### PULLED IN $

```dax
CALCULATE(
    '_Walk Measures'[WALK VALUE],
    'Pipe Walk'[WALK_GROUP] /* DB: vw_TF_EBI_PIPE_WALK.WALK_GROUP */ = "Pulled In",
    'Pipe Walk'[PIPE_FLAG] /* DB: vw_TF_EBI_PIPE_WALK.PIPE_FLAG */ = "Pipe"
)
```

#### PUSHED OUT $

```dax
CALCULATE(
    '_Walk Measures'[WALK VALUE],
    'Pipe Walk'[WALK_GROUP] /* DB: vw_TF_EBI_PIPE_WALK.WALK_GROUP */ = "Pushed",
    'Pipe Walk'[PIPE_FLAG] /* DB: vw_TF_EBI_PIPE_WALK.PIPE_FLAG */ = "Pipe"
)
```

#### STAGE PROGRESSION ASV

```dax
CALCULATE(SUM('Pipe Walk'[STAGEPROGRESSIONASV] /* DB: vw_TF_EBI_PIPE_WALK.STAGEPROGRESSIONASV */))
```

#### WALK CLOSE RATIO %

```dax
VAR SProgASVDerived = CALCULATE(
    [STAGE PROGRESSION ASV],
    'Pipe Walk'[CURR_SALES_STAGE_DERIVED] /* DB: vw_TF_EBI_PIPE_WALK.CURR_SALES_STAGE_DERIVED */ = "Booked"
)

VAR Result = DIVIDE(
    SProgASVDerived,
    [STAGE PROGRESSION ASV],
    0
)

RETURN Result
```

#### WALK VALUE

```dax
CALCULATE(SUM('Pipe Walk'[GROSSASV] /* DB: vw_TF_EBI_PIPE_WALK.GROSSASV */))
```

#### Walk Oppty #

```dax
CALCULATE(DISTINCTCOUNT('Pipe Walk'[OPP_ID] /* DB: vw_TF_EBI_PIPE_WALK.OPP_ID */))
```

### 3.17. Region Hierarchy (4 measures) — DB: vw_TD_EBI_REGION_RPT_MASKED

#### BOQ OVERALLSCORE(A+B+C+D)FLM

```dax
VAR Multi = 20
VAR PQMAXDATE = [PQ EOQ SNAPSHOT DATE]


---A.YTD Performance
VAR ACOV = CALCULATE(
    [PERFORMANCE YTD %],
    'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ = PQMAXDATE
)*Multi
VAR AYTDPerformance = SWITCH(
    TRUE(),
    ACOV < 0.01, 0,
    ACOV >= 0.01 && ACOV <= Multi, ACOV,
    ACOV > Multi, Multi    
)

---B.Mature
VAR BCOV = CALCULATE(
    DIVIDE(
        [PIPE $] *Multi,
        [BOOKINGS TARGET]* 1.2
    ),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ = "S5+",
    'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ = PQMAXDATE
)
VAR BMATURECOV =  SWITCH(
    TRUE(),
    BCOV < 0.01, 0,
    BCOV >= 0.01 && BCOV <= Multi, BCOV,
    BCOV > Multi, Multi    
)

---D.Pipe
VAR DCOV = CALCULATE(
    DIVIDE(
        [UPSIDE FORECAST PIPE $] * Multi,
        [PIPE TARGET]
    ),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 2,
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ IN {"S3","S4","S5+"},
    'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ = PQMAXDATE
)
VAR DPIPECOV = SWITCH(
    TRUE(),
    DCOV < 0.01, 0,
    DCOV >= 0.01 && DCOV <= Multi, DCOV,
    DCOV > Multi, Multi    
)

---E.YTDPipe
VAR ECOV = DIVIDE(
    CALCULATE(
        [GROSS CREATED YTD $],
        NOT 'Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */ IN {"S1","S2","Closed Lost from Non Pipe", "Closed CleanUp from Non Pipe"},
        'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ = PQMAXDATE
    )*Multi,
    [GROSS CREATION YTD]
)
VAR EYTDPipe =  SWITCH(
    TRUE(),
    ECOV < 0.01, 0,
    ECOV >= 0.01 && ECOV <= Multi, ECOV,
    ECOV > Multi, Multi    
)

---ETeamPArticipationFLM
VAR REPYTDPROJ75Pct = COUNTROWS(
    FILTER(
        'Region Hierarchy',
        ACOV > 0.75
    )
)
VAR REP = CALCULATE(
    COUNTROWS( 'Region Hierarchy' ),
    'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place"
)
VAR TeamParticipation = DIVIDE(
    REPYTDPROJ75Pct*20,
    REP,
    0
)
VAR ETeamPart = SWITCH(
    TRUE(),
    TeamParticipation < 0.01, 0,
    TeamParticipation >= 0.01 && TeamParticipation <= 20, TeamParticipation,
    TeamParticipation > 20, 20    
)

VAR Result = ROUND(
    AYTDPerformance + BMATURECOV + DPIPECOV + EYTDPipe + ETeamPart,
    0
)

RETURN Result
```

#### BOQ OVERALLSCORE(A+B+C+D)REP

```dax
VAR Multi = 25
VAR PQMAXDATE = [PQ EOQ SNAPSHOT DATE]


---A.YTD Performance
VAR ACOV = CALCULATE(
    [PERFORMANCE YTD %],
    'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ = PQMAXDATE
)*Multi
VAR AYTDPerformance = SWITCH(
    TRUE(),
    ACOV < 0.01, 0,
    ACOV >= 0.01 && ACOV <= Multi, ACOV,
    ACOV > Multi, Multi    
)

---B.Mature
VAR BCOV = CALCULATE(
    DIVIDE(
        [PIPE $] *Multi,
        [BOOKINGS TARGET]* 1.2
    ),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ = "S5+",
    'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ = PQMAXDATE
)
VAR BMATURECOV =  SWITCH(
    TRUE(),
    BCOV < 0.01, 0,
    BCOV >= 0.01 && BCOV <= Multi, BCOV,
    BCOV > Multi, Multi    
)

---D.Pipe
VAR DCOV = CALCULATE(
    DIVIDE(
        [UPSIDE FORECAST PIPE $] * Multi,
        [PIPE TARGET]
    ),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 2,
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ IN {"S3","S4","S5+"},
    'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ = PQMAXDATE
)
VAR DPIPECOV = SWITCH(
    TRUE(),
    DCOV < 0.01, 0,
    DCOV >= 0.01 && DCOV <= Multi, DCOV,
    DCOV > Multi, Multi    
)

---E.YTDPipe
VAR ECOV = DIVIDE(
    CALCULATE(
        [GROSS CREATED YTD $],
        NOT 'Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */ IN {"S1","S2","Closed Lost from Non Pipe", "Closed CleanUp from Non Pipe"},
        'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */ = PQMAXDATE
    )*Multi,
    [GROSS CREATION YTD]
)
VAR EYTDPipe =  SWITCH(
    TRUE(),
    ECOV < 0.01, 0,
    ECOV >= 0.01 && ECOV <= Multi, ECOV,
    ECOV > Multi, Multi    
)

VAR Result = ROUND(
    AYTDPerformance + BMATURECOV + DPIPECOV + EYTDPipe,
    0
)

RETURN Result
```

#### OVERALL SCORE(A+B+C+D)REP

```dax
VAR Multi = 25


---A.YTD Performance
VAR ACOV = CALCULATE(
    [PERFORMANCE YTD %],
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
)*Multi
VAR AYTDPerformance = SWITCH(
    TRUE(),
    ACOV < 0.01, 0,
    ACOV >= 0.01 && ACOV <= Multi, ACOV,
    ACOV > Multi, Multi    
)

---B.Mature
VAR BCOV = CALCULATE(
    DIVIDE(
        [PIPE $] *Multi,
        [BOOKINGS TARGET]* 1.2
    ),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ = "S5+",
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
)
VAR BMATURECOV =  SWITCH(
    TRUE(),
    BCOV < 0.01, 0,
    BCOV >= 0.01 && BCOV <= Multi, BCOV,
    BCOV > Multi, Multi    
)

---D.Pipe
VAR DCOV = CALCULATE(
    DIVIDE(
        [UPSIDE FORECAST PIPE $] * Multi,
        [PIPE TARGET]
    ),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 2,
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ IN {"S3","S4","S5+"},
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
)
VAR DPIPECOV = SWITCH(
    TRUE(),
    DCOV < 0.01, 0,
    DCOV >= 0.01 && DCOV <= Multi, DCOV,
    DCOV > Multi, Multi    
)

---E.YTDPipe
VAR ECOV = DIVIDE(
    CALCULATE(
        [GROSS CREATED YTD $],
        NOT 'Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */ IN {"S1","S2","Closed Lost from Non Pipe", "Closed CleanUp from Non Pipe"},
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
    )*Multi,
    [GROSS CREATION YTD]
)
VAR EYTDPipe =  SWITCH(
    TRUE(),
    ECOV < 0.01, 0,
    ECOV >= 0.01 && ECOV <= Multi, ECOV,
    ECOV > Multi, Multi    
)

VAR Result = ROUND(
    AYTDPerformance + BMATURECOV + DPIPECOV + EYTDPipe,
    0
)

RETURN Result
```

#### OVERALLSCORE(A+B+C+D)FLM

```dax
VAR Multi = 20


---A.YTD Performance
VAR ACOV = CALCULATE(
    [PERFORMANCE YTD %],
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
)*Multi
VAR AYTDPerformance = SWITCH(
    TRUE(),
    ACOV < 0.01, 0,
    ACOV >= 0.01 && ACOV <= Multi, ACOV,
    ACOV > Multi, Multi    
)

---B.Mature
VAR BCOV = CALCULATE(
    DIVIDE(
        [PIPE $] *Multi,
        [BOOKINGS TARGET]* 1.2
    ),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ = "S5+",
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
)
VAR BMATURECOV =  SWITCH(
    TRUE(),
    BCOV < 0.01, 0,
    BCOV >= 0.01 && BCOV <= Multi, BCOV,
    BCOV > Multi, Multi    
)

---D.Pipe
VAR DCOV = CALCULATE(
    DIVIDE(
        [UPSIDE FORECAST PIPE $] * Multi,
        [PIPE TARGET]
    ),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 2,
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ IN {"S3","S4","S5+"},
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
)
VAR DPIPECOV = SWITCH(
    TRUE(),
    DCOV < 0.01, 0,
    DCOV >= 0.01 && DCOV <= Multi, DCOV,
    DCOV > Multi, Multi    
)

---E.YTDPipe
VAR ECOV = DIVIDE(
    CALCULATE(
        [GROSS CREATED YTD $],
        NOT 'Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */ IN {"S1","S2","Closed Lost from Non Pipe", "Closed CleanUp from Non Pipe"},
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
    )*Multi,
    [GROSS CREATION YTD]
)
VAR EYTDPipe =  SWITCH(
    TRUE(),
    ECOV < 0.01, 0,
    ECOV >= 0.01 && ECOV <= Multi, ECOV,
    ECOV > Multi, Multi    
)

---ETeamPArticipationFLM
VAR REPYTDPROJ75Pct = COUNTROWS(
    FILTER(
        'Region Hierarchy',
        ACOV > 0.75
    )
)
VAR REP = CALCULATE(
    COUNTROWS( 'Region Hierarchy' ),
    'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place"
)
VAR TeamParticipation = DIVIDE(
    REPYTDPROJ75Pct*20,
    REP,
    0
)
VAR ETeamPart = SWITCH(
    TRUE(),
    TeamParticipation < 0.01, 0,
    TeamParticipation >= 0.01 && TeamParticipation <= 20, TeamParticipation,
    TeamParticipation > 20, 20    
)

VAR Result = ROUND(
    AYTDPerformance + BMATURECOV + DPIPECOV + EYTDPipe + ETeamPart,
    0
)

RETURN Result
```

### 3.18. Snapshot Quarter (1 measures) — DB: vw_EBI_Caldate

#### Last Data Refresh

```dax
FORMAT(CALCULATE(Max('Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.CALENDAR_DATE */)+1, 'Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */ = TRUE()),"mmm d yyyy")
```

---

## 4. Calculated Columns (DAX — not in raw DB)

These columns exist only in the PBI model. To replicate in SQL, implement the logic below.

### Pipeline.[Segment ID] — DB base: vw_TF_EBI_P2S

```dax
RELATED(vw_TF_EBI_P2S_LATEST_ATTRIBUTE[SEGMENT_ID])
```

### Pipeline.[Region ID] — DB base: vw_TF_EBI_P2S

```dax
RELATED(vw_TF_EBI_P2S_LATEST_ATTRIBUTE[REGION_ID])
```

### Pipeline.[BOQ S3+ Flag] — DB base: vw_TF_EBI_P2S

```dax
If(AND(RELATED('Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */) = "W1", Pipeline[SALES_STAGE_ID] in {1,2,3,4,5,6}) = TRUE(), 1,0)
```

### Pipeline.[OPPTY_CY] — DB base: vw_TF_EBI_P2S

```dax
CALCULATE(
                                [OPPTY $]
                                ,'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0
                                ,Pipeline[IS_EOQ] = "TRUE"
                                ,'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ IN {"S3", "S4" ,"S5+" ,"Booked"}
                            )
```

### Pipeline.[AE Region ID] — DB base: vw_TF_EBI_P2S

```dax
RELATED(vw_TF_EBI_P2S_LATEST_ATTRIBUTE[AE_REGION_ID])
```

### Pipeline.[ACCOUNT_SUB_ID] — DB base: vw_TF_EBI_P2S

```dax
RELATED(Account[ACCOUNT_SUB_ID])
```

### Pipeline.[ACCOUNT_PARENT_ID] — DB base: vw_TF_EBI_P2S

```dax
RELATED('Account Sub'[ACCOUNT_PRNT_ID] /* DB: dataset_table.ACCOUNT_PRNT_ID */)
```

### FY Calendar.[FISCAL_QTR] — DB base: vw_EBI_Caldate

```dax
RIGHT(
    'FY Calendar'[FISCAL_YR_AND_QTR_DESC] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */,
    2
)
```

### Segment.[Major-Minor Segment] — DB base: vw_EBI_SEGMENT

```dax
CONCATENATE(CONCATENATE(Upper(Left(Segment[SEGMENT_REPORTING_GROUP_DISPLAY],3)), "-"),Segment[SEGMENT_DISPLAY])
```

### Region Hierarchy.[COMMIT TYPE] — DB base: vw_TD_EBI_REGION_RPT_MASKED

```dax
VAR LookupbyEmpRT = LOOKUPVALUE(
    'Commit Type'[COMMIT_TYPE] /* DB: vw_EBI_COMMIT_ROLE_MAPPING.COMMIT_TYPE */,
    'Commit Type'[COMMIT_ROLE_TYPE] /* DB: vw_EBI_COMMIT_ROLE_MAPPING.COMMIT_ROLE_TYPE */,
    'Region Hierarchy'[EMP_ROLE_TYPE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.EMP_ROLE_TYPE */
)

VAR Result = IF(
    ISBLANK( LookupbyEmpRT ),
    LOOKUPVALUE(
        'Commit Type'[COMMIT_TYPE] /* DB: vw_EBI_COMMIT_ROLE_MAPPING.COMMIT_TYPE */,
        'Commit Type'[COMMIT_ROLE_TYPE] /* DB: vw_EBI_COMMIT_ROLE_MAPPING.COMMIT_ROLE_TYPE */,
        'Region Hierarchy'[ROLE_TYPE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE */
    ),
    LookupbyEmpRT
)

RETURN Result
```

### Region Hierarchy.[IS_TRUE_REP] — DB base: vw_TD_EBI_REGION_RPT_MASKED

```dax
SWITCH(
    'Region Hierarchy'[TERR_IDENT] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_IDENT */,
    "AE", IF(
        CONTAINSSTRING( 'Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */, "Dummy"),
        0,
        IF(
            'Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */ = "AE" &&
            'Region Hierarchy'[EMP_ROLE_TYPE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.EMP_ROLE_TYPE */ <> "ACCOUNT MANAGER",
            0,
            1
        )
    ),
    0
)
```

### Region Hierarchy.[IS_CYQUOTA_AVAILABLE] — DB base: vw_TD_EBI_REGION_RPT_MASKED

```dax
'Region Hierarchy'[IS_CY_QUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CY_QUOTA_AVAILABLE */
```

### Region Hierarchy.[REP_TENURE_STATUS] — DB base: vw_TD_EBI_REGION_RPT_MASKED

```dax
VAR CurrentRoleGap = [CURRENT ROLE TENURE GAP]
VAR QuotaPQ = CALCULATE(
    [BOOKINGS TARGET],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1
)
VAR QuotaPQ1 = CALCULATE(
    [BOOKINGS TARGET],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -2
)

VAR Result = SWITCH(
    TRUE(),
    CurrentRoleGap <= 3, "First Qtr",
    CurrentRoleGap > 3 && CurrentRoleGap <= 6, "New Hire",
    CurrentRoleGap <= 12 && CurrentRoleGap > 6, "Rookie",
    CurrentRoleGap > 12 || (CurrentRoleGap < 12 && (QuotaPQ > 0 || QuotaPQ1 > 0)), "Veteran",
    "Rookie"
)  


RETURN Result
```

### Opportunity.[IS_BUSINESS_ISSUE_BLANK] — DB base: vw_TD_EBI_OPP

```dax
IF(
    ISBLANK( Opportunity[CUSTOMER_GOALS_INITIATIVES] )
    ,"BLANK1"
    ,Opportunity[CUSTOMER_GOALS_INITIATIVES]
)
```

### Pacing Targets.[weekn] — DB base: vw_EBI_PACING_TARGET

```dax
RELATED('Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */)
```

### TPT.[ACCOUNT_PRNT_ID] — DB base: dataset_table

```dax
RELATED('Account Sub'[ACCOUNT_PRNT_ID] /* DB: dataset_table.ACCOUNT_PRNT_ID */)
```

### Opportunity.[Deal_Review_Flag] — DB base: vw_TD_EBI_OPP

```dax
IF(Opportunity[DATE_LAST_REVIEWED] = BLANK(), "No", IF(Opportunity[DATE_LAST_REVIEWED] >= TODAY()-90, "Yes", "No"))
```

### Opportunity.[Deal_Review_Flag_30D] — DB base: vw_TD_EBI_OPP

```dax
IF(Opportunity[DATE_LAST_REVIEWED] = BLANK(), "No", IF(Opportunity[DATE_LAST_REVIEWED] >= TODAY()-30, "Yes", "No"))
```

### Retention.[ORIGINAL_OPP_CLOSE_DATE] — DB base: vw_TF_EBI_Retention

```dax
RELATED(Opportunity[ORIGINAL_OPP_CLOSE_DATE])
```

### Retention.[ON TIME RENEWAL] — DB base: vw_TF_EBI_Retention

```dax
IF
(
    RELATED(Opportunity[ORIGINAL_OPP_CLOSE_DATE])<=RELATED('Retention MetaData'[SERVICE_END_DATE] /* DB: vw_TD_EBI_Retention_MetaData.SERVICE_END_DATE */)
    &&
    Retention[OPP_ID]<>-1
    && 
    RELATED('Retention MetaData'[OUTLOOK_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.OUTLOOK_CATEGORY */)= "Closed" 
    && 
    (RELATED('Retention MetaData'[LINE_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.LINE_CATEGORY */)= "System Line" 
    || 
    (RELATED('Retention MetaData'[LINE_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.LINE_CATEGORY */)= "Customer Adjustment" && RELATED('Retention MetaData'[INTERNAL_SEGMENT_NET_OFF] /* DB: vw_TD_EBI_Retention_MetaData.INTERNAL_SEGMENT_NET_OFF */) = BLANK())),

    "Yes",

IF
(
    RELATED(Opportunity[ORIGINAL_OPP_CLOSE_DATE])>RELATED('Retention MetaData'[SERVICE_END_DATE] /* DB: vw_TD_EBI_Retention_MetaData.SERVICE_END_DATE */)
    &&
    Retention[OPP_ID]<>-1
    && 
    RELATED('Retention MetaData'[OUTLOOK_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.OUTLOOK_CATEGORY */)= "Closed" 
    && 
    (RELATED('Retention MetaData'[LINE_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.LINE_CATEGORY */)= "System Line" 
    || 
    (RELATED('Retention MetaData'[LINE_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.LINE_CATEGORY */)= "Customer Adjustment" && RELATED('Retention MetaData'[INTERNAL_SEGMENT_NET_OFF] /* DB: vw_TD_EBI_Retention_MetaData.INTERNAL_SEGMENT_NET_OFF */) = BLANK())),

    "No", BLANK()
)
)
```

### Deal Band.[Deal_Band param] — DB base: dataset_table

```dax
SWITCH(TRUE(),
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset_table.DEAL_BAND_NEW */ IN {"<0K", "0K-25K", "25K-50K", "50K-75K", "75K-100K", "100K-250K"} ,  "0-250K",
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset_table.DEAL_BAND_NEW */ IN { "250K-500K"} ,  "250K-500K",
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset_table.DEAL_BAND_NEW */ IN {"500K-750K", "750K-1M"} ,  "500K-1M",
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset_table.DEAL_BAND_NEW */ IN {"1M-2M", "2M-3M", "3M-4M", "4M-5M"} ,  "1M-5M",
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset_table.DEAL_BAND_NEW */ IN {"5M-6M", "6M-7M", "7M-8M", "8M-9M", "9M-10M"} ,  "5M-10M",
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset_table.DEAL_BAND_NEW */ IN {"10M-15M", "15M-20M"} ,  "10M-20M",
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset_table.DEAL_BAND_NEW */ IN {"20M+"} ,  "20M+"
)
```

### Deal Band.[Deal_Band param sort] — DB base: dataset_table

```dax
SWITCH(TRUE(),
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset_table.DEAL_BAND_NEW */ IN {"<0K", "0K-25K", "25K-50K", "50K-75K", "75K-100K", "100K-250K"} , 7,
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset_table.DEAL_BAND_NEW */ IN { "250K-500K"} ,  6,
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset_table.DEAL_BAND_NEW */ IN {"500K-750K", "750K-1M"} ,  5,
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset_table.DEAL_BAND_NEW */ IN {"1M-2M", "2M-3M", "3M-4M", "4M-5M"} ,  4,
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset_table.DEAL_BAND_NEW */ IN {"5M-6M", "6M-7M", "7M-8M", "8M-9M", "9M-10M"} ,  3,
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset_table.DEAL_BAND_NEW */ IN {"10M-15M", "15M-20M"} ,  2,
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset_table.DEAL_BAND_NEW */ IN {"20M+"} ,  1
)
```

### Qualification Quarter.[QUALIFICATION_MONTH_BKT] — DB base: vw_EBI_Caldate

```dax
IF(LEFT(RIGHT('Qualification Quarter'[YR_MONTH_KEY] /* DB: vw_EBI_Caldate.YR_MONTH_KEY */,2),1)="0","M"&RIGHT('Qualification Quarter'[YR_MONTH_KEY] /* DB: vw_EBI_Caldate.YR_MONTH_KEY */,1),"M"&RIGHT('Qualification Quarter'[YR_MONTH_KEY] /* DB: vw_EBI_Caldate.YR_MONTH_KEY */,2))
```

---

## 5. Row-Level Security (RLS) Roles

The PBI report enforces these RLS roles. Relevant for understanding data access patterns.

### Role: EU

- **Region Hierarchy** (DB: vw_TD_EBI_REGION_RPT_MASKED): `[REP_LDAP] = LEFT(USERPRINCIPALNAME(),SEARCH("@",USERPRINCIPALNAME())-1)
	|| [FLM_LDAP] = LEFT(USERPRINCIPALNAME(),SEARCH("@",USERPRINCIPALNAME())-1)
	|| [SLM_Ldap] = LEFT(USERPRINCIPALNAME(),SEARCH("@",USERPRINCIPALNAME())-1)
	|| [TLM_Ldap] = LEFT(USERPRINCIPALNAME(),SEARCH("@",USERPRINCIPALNAME())-1)
        || [Sales_Leader_Ldap] = LEFT(USERPRINCIPALNAME(),SEARCH("@",USERPRINCIPALNAME())-1)`
- **Logged In User Role** (DB: Logged In User Role): `[User_Role] == "EU"`
- **Commit Type RLS** (DB: vw_TD_EBI_RLS_BY_COMMIT_ROLE_TYPE): `[REP_LDAP] = LEFT(USERPRINCIPALNAME(),SEARCH("@",USERPRINCIPALNAME())-1)`

### Role: Overlay_SR

- **SalesRegion** (DB: SalesRegion): `[SALESREGION] IN SELECTCOLUMNS(
            Filter(SalesRegion_Overlay,
            SalesRegion_Overlay[LDAP] = LOOKUPVALUE('Overlay_SR'[LDAP],'Overlay_SR'[Email],USERNAME())
),
"SalesRegion",SalesRegion_Overlay[SALESREGION])`
- **Logged In User Role** (DB: Logged In User Role): `[User_Role] == "Overlay"`
- **Commit Type** (DB: vw_EBI_COMMIT_ROLE_MAPPING): `[COMMIT_TYPE] == "GEO_ADJ_COMMIT"`

### Role: Overlay_ST

- **SalesTeam** (DB: SalesTeam): `[SALESTEAM] IN SELECTCOLUMNS(
            Filter(SalesTeam_Overlay,
            SalesTeam_Overlay[LDAP] = LOOKUPVALUE('Overlay_ST'[LDAP],'Overlay_ST'[Email],USERNAME())
),
"SalesTeam",SalesTeam_Overlay[SALESTEAM])`
- **Logged In User Role** (DB: Logged In User Role): `[User_Role] == "Overlay"`
- **Commit Type** (DB: vw_EBI_COMMIT_ROLE_MAPPING): `[COMMIT_TYPE] == "GEO_ADJ_COMMIT"`

### Role: PU

- **Logged In User Role** (DB: Logged In User Role): `[User_Role] == "PU"`

### Role: PU_AMER

- **Region Hierarchy** (DB: vw_TD_EBI_REGION_RPT_MASKED): `[GLOBAL_REGION] == "AMERICAS"`
- **Logged In User Role** (DB: Logged In User Role): `[User_Role] == "PU-AMER"`

### Role: PU_APAC

- **Region Hierarchy** (DB: vw_TD_EBI_REGION_RPT_MASKED): `[GLOBAL_REGION] == "APAC"`
- **Logged In User Role** (DB: Logged In User Role): `[User_Role] == "PU-INTL"`

### Role: PU_EMEA

- **Region Hierarchy** (DB: vw_TD_EBI_REGION_RPT_MASKED): `[GLOBAL_REGION] == "EMEA"`
- **Logged In User Role** (DB: Logged In User Role): `[User_Role] == "PU-INTL"`

### Role: PU_EXCEPT_AMER

- **Logged In User Role** (DB: Logged In User Role): `[User_Role] == "PU"`
- **Region Hierarchy** (DB: vw_TD_EBI_REGION_RPT_MASKED): `[SUPER_GEO] == "INTERNATIONAL"`

### Role: PU_JAPAN

- **Region Hierarchy** (DB: vw_TD_EBI_REGION_RPT_MASKED): `[GLOBAL_REGION] == "JAPAN"`
- **Logged In User Role** (DB: Logged In User Role): `[User_Role] == "PU-INTL"`

---

## 6. Key Relationship Patterns

### 6.1 Star Schema: Common FK Patterns

Most fact tables join to dimensions using these standard FKs:

| FK Column | Dimension | Dimension PK | Used By |
|---|---|---|---|
| REGION_ID | Region Hierarchy (vw_TD_EBI_REGION_RPT_MASKED) | REGION_ID | Quota, Plan & QRF, Enablement, Pipe Walk, Renewals Target (+10 more) |
| OPG_ID | OPG (vw_EBI_OPG) | OPG_ID | Plan & QRF, Quota, Retention, Pipeline, Pipe Walk (+9 more) |
| SEGMENT_ID | Segment (vw_EBI_SEGMENT) | SEGMENT_ID | Plan & QRF, Pipe Walk, Quota, vw_EBI_PROJECTION_CLOSE_RATIO, Renewals Target (+6 more) |
| REPORTING_HIERARCHY_ID | Reporting Hierarchy (VW_TD_EBI_REPORTING_HIERARCHY) | REPORTING_HIERARCHY_ID | Pipeline, Plan & QRF, Quota, Retention, Pipe Walk (+6 more) |
| ACCOUNT_ID | Account (vw_TD_EBI_ACCOUNT) | ACCOUNT_ID | Retention, Pipe Walk, Account ARR, Customer Solution Health Movement, Customer Health Movement (+4 more) |
| ROLE_COVERAGE_ID | Role Coverage (dataset_table) | ROLE_COVERAGE_ID | Account ARR, Pipeline, Plan & QRF, Renewals Target, Retention (+4 more) |
| CUSTOMER_HEALTH_ID | Customer Health (dataset_table) | CUSTOMER_HEALTH_ID | Account ARR, SBR Activities, Retention, Pipeline, Customer Health Movement (+2 more) |
| SNAPSHOT_DATE_ID | Snapshot Quarter (vw_EBI_Caldate) | DATE_KEY | Pipeline, Pipe Walk, App Inputs, Pacing Targets, Retention (+1 more) |
| TPT_ID | TPT Metadata (dataset_table) | TPT_ID | TPT, Retention, Pipeline, TM1 Bookings, Account ARR (+1 more) |
| DEAL_TYPE_ID | Deal Type (vw_EBI_DEAL_TYPE) | DEAL_TYPE_ID | Plan & QRF, Pipeline, Quota, Pipe Walk, TM1 Bookings |
| OPP_ID | Opportunity (vw_TD_EBI_OPP) | OPP_ID | Pipeline, Retention, Pipe Walk, TM1 Bookings, DRF Pillars |
| COUNTRY_ID | Account Country (dataset_table) | COUNTRY_ID | Account ARR, SBR Activities, TPT, Account Activities, Lead |
| CREATOR_TYPE_ID | Creator Type (vw_EBI_CREATOR_TYPE) | CREATOR_TYPE_ID | Quota, Pipeline, Pipe Walk, TM1 Bookings |
| REVENUE_TYPE_ID | Revenue Type (vw_EBI_REVENUE_TYPE) | ID | Pipeline, Quota, Plan & QRF, Pipe Walk |
| FOCUS_VERTICAL_ID | Focus Vertical (vw_EBI_FOCUS_VERTICAL) | FOCUS_VERTICAL_ID | Pipeline, Plan & QRF, Quota, Pipe Walk |
| SALES_MOTION_ID | Sales Motion (vw_TD_EBI_SALES_MOTION) | SALES_MOTION_ID | Plan & QRF, Quota, Pipeline, Pipe Walk |
| PAY_MEASURE_ID | Pay Measure (vw_EBI_PAY_MEASURE) | ID | Plan & QRF, Quota, Pipeline, Pipe Walk |
| GTM_MOTION_ID | GTM Motion (vw_EBI_GTM_MOTION) | GTM_MOTION_ID | Quota, Plan & QRF, Pipeline, Retention |
| CLOSE_DATE_ID | Close Quarter (vw_EBI_Caldate) | DATE_KEY | Pipe Walk, SBR Activities, Lead, Performance Historic |
| ACCOUNT_SUB_ID | Account Sub (dataset_table) | ACCOUNT_SUB_ID | SBR Activities, TPT, Account, Account Activities |
| SOLUTION_HEALTH_ID | Customer Solution Health (dataset_table) | CUSTOMER_SOLUTION_HEALTH_ID | Retention, Pipeline, Account ARR, TM1 Bookings |
| AES_SCORE_ID | Account Engagement Stage (dataset_table) | AES_SCORE_ID | Pipeline, Retention, Account ARR, TPT |
| UCP_ICP_SCORE_ID | Customer Profile Attributes (dataset_table) | SCORE_ID | Pipeline, Account ARR, TPT, Retention |
| SUB_MA_ID | Account Sub Market Area Metadata (dataset_table) | SUB_MA_ID | Retention, Account ARR, Pipeline, TPT |
| SALES_STAGE_ID | Sales Stage (vw_EBI_SALES_STAGE) | SALES_STAGE_ID | Pipeline, TM1 Bookings, Lead |
| CONSULTING_SEGMENT_ID | Consulting Segment (vw_EBI_CONSULTING_SEGMENT) | ID | Pipeline, Plan & QRF, Pipe Walk |
| ACCOUNT_COUNTRY_ID | Account Country (dataset_table) | COUNTRY_ID | Retention, Pipeline, TM1 Bookings |
| AE_REGION_ID | AE Region Hierarchy (dataset_table) | AE_REGION_ID | Customer Solution Health Movement, Retention, TM1 Bookings |
| SUB_MA_SOLUTION_ID | Account Sub Market Area Solution Metadata (dataset_table) | SUB_MA_SOLUTION_ID | Retention, Account ARR, Pipeline |
| OPP_CREATE_DATE_ID | Qualification Quarter (vw_EBI_Caldate) | DATE_KEY | Pipeline, TM1 Bookings |

### 6.2 Special Relationships (non-standard cardinality)

| From | Column | To | Column | Type | Filter |
|---|---|---|---|---|---|
| vw_TF_EBI_P2S_LATEST_ATTRIBUTE | P2S_ID | Pipeline | P2S_ID | 1:1 | Both |
| Region Hierarchy | SALES_REGION | SalesRegion | SALESREGION | M:1 | Both |
| App Inputs | EMP_ID | Region Hierarchy | REP_ID | M:M | Single |
| vw_EBI_PROJECTION_CLOSE_RATIO | SALES_TEAM | Region Hierarchy | SALES_TEAM | M:M | Both |
| Snapshot Switch Quarter | DATE_KEY | Snapshot Quarter | DATE_KEY | M:1 | Both |
| Commit Type | COMMIT_TYPE | Commit Type RLS | COMMIT_TYPE | M:M | Single |
| Region Hierarchy | SALES_TEAM | SalesTeam | SALESTEAM | M:1 | Both |
| SBR Metadata | SBR_ACTIVITY_ID | SBR Activities | SBR_ACTIVITY_ID | 1:1 | Both |
| Account | ACCOUNT_SUB_ID | Account Sub | ACCOUNT_SUB_ID | M:1 | Both |
| Close Quarter | CLOSE_YR_AND_QTR | Close Quarter JOIN | CLOSE_YR_AND_QTR | M:M | Both |

---

## 7. Business Logic Rules (derived from DAX)

### 7.1 Commit Type Logic

The commit type determines which forecast column to use on the Pipeline table:

| Commit Type | Pipeline Column | Who Sets It |
|---|---|---|
| MGR_ADJ_COMMIT | Pipeline.MGR_ADJ_COMMIT | Manager |
| ADJ_COMMITMENT | Pipeline.ADJ_COMMITMENT | Rep |
| GEO_ADJ_COMMIT | Pipeline.GEO_ADJ_COMMIT | Geo lead |
| PS_ADJ_COMMIT | Pipeline.PS_ADJ_COMMITMENT | PS leader |

Commit type is resolved per-user via Region Hierarchy.COMMIT TYPE calculated column,
which looks up vw_EBI_COMMIT_ROLE_MAPPING by EMP_ROLE_TYPE or ROLE_TYPE.

### 7.2 Pipeline Stage Categories

Pipeline stages are grouped for reporting via SALES_STAGE_GROUP (from vw_EBI_SALES_STAGE):

- **S3, S4, S5+, Booked**: Active pipeline stages
- **S1, S2**: Early stage (excluded from most pipeline KPIs)
- **Closed Lost from Non Pipe, Closed CleanUp from Non Pipe**: Excluded from gross creation
- **Won**: Booked business

### 7.3 Quarter Bucket Logic (QTR_BKT_IND / CLOSE_QTR_BKT)

| Value | Meaning | Use When |
|---|---|---|
| -2 | Two quarters ago | Historical comparison |
| -1 | Previous quarter | PQ performance |
| 0 | Current quarter | Default CQ view — **most common** |
| 1 | Next quarter | CQ+1 pipeline/forecast |
| 2 | Two quarters out | Future pipeline coverage |

### 7.4 Snapshot Logic

- **IS_LATEST_SNAPSHOT = TRUE** when SNAPSHOT_WEEK_BKT = '0' or SNAPSHOT_WEEK_BKT_RTB = '0'
- **SNAPSHOT_WEEK_BKT = '0'**: Current week snapshot (latest data)
- **IS_BOQ**: Beginning of quarter flag on Pipeline
- **IS_EOQ**: End of quarter flag on Pipeline

### 7.5 Rep Classification

From calculated column Region Hierarchy.IS_TRUE_REP:

- Excludes Dummy territories
- Excludes ROLE_TYPE_DISPLAY='AE' where EMP_ROLE_TYPE='ACCOUNT MANAGER'
- Only TERR_IDENT='AE' qualifies as true rep

### 7.6 Rep Tenure Classification

From calculated column Region Hierarchy.REP_TENURE_STATUS:

| Status | Tenure Gap (months) |
|---|---|
| First Qtr | <= 3 |
| New Hire | 3-6 |
| Rookie | 6-12 |
| Veteran | > 12 or has PQ/PQ-1 quota |

### 7.7 On-Time Renewal Logic

A renewal is 'On Time' when:
- ORIGINAL_OPP_CLOSE_DATE <= SERVICE_END_DATE
- OPP_ID <> -1
- OUTLOOK_CATEGORY = 'Closed'
- LINE_CATEGORY = 'System Line' OR (LINE_CATEGORY = 'Customer Adjustment' AND INTERNAL_SEGMENT_NET_OFF IS NULL)

### 7.8 Deal Band Groupings

| Deal Band Group | Raw Bands |
|---|---|
| 0-250K | <0K, 0K-25K, 25K-50K, 50K-75K, 75K-100K, 100K-250K |
| 250K-500K | 250K-500K |
| 500K-1M | 500K-750K, 750K-1M |
| 1M-5M | 1M-2M, 2M-3M, 3M-4M, 4M-5M |
| 5M-10M | 5M-6M, 6M-7M, 7M-8M, 8M-9M, 9M-10M |
| 10M-20M | 10M-15M, 15M-20M |
| 20M+ | 20M+ |

### 7.9 Overall Score Composite (Rep/FLM)

The overall score is a 0-100 composite of 4 components (each scored 0-25):

1. **A: YTD Performance** — PERFORMANCE YTD % * 25, capped at 25
2. **B: Mature Coverage** — (PIPE $ for S5+ / BOOKINGS TARGET * 1.2) * 25, CQ, latest snapshot
3. **D: Future Pipe** — (UPSIDE FORECAST PIPE $ / PIPE TARGET) * 25, CQ+1, S3+S4+S5+
4. **E: YTD Pipe Creation** — (GROSS CREATED YTD $ for S3+ / GROSS CREATION YTD target) * 25

FLM version uses multiplier of 20 (max 80 total).

---

## 8. RLS & Overlay Architecture

All derived from vw_TD_EBI_REP_ACCESS_RLS:

| PBI Table | Source Filter | Purpose |
|---|---|---|
| SalesRegion_Overlay | Column_Name='SalesRegion' | Overlay region access |
| SalesTeam_Overlay | Column_Name='SalesTeamAlias' | Overlay team access |
| SalesRegion | Column_Name='SalesRegion' (distinct, no LDAP) | Region lookup |
| SalesTeam | Column_Name='SalesTeamAlias' (distinct) | Team lookup |
| Overlay_SR | Column_Name='SalesRegion' (LDAP + Email) | Region overlay users |
| Overlay_ST | Column_Name='SalesTeamAlias' (LDAP + Email) | Team overlay users |

**RLS Role Hierarchy:**

| Role | Type | Filter Logic |
|---|---|---|
| EU (End User) | LDAP match | REP_LDAP/FLM_LDAP/SLM_Ldap/TLM_Ldap/Sales_Leader_Ldap = current user |
| PU (Power User) | Full access | No region filter |
| PU_AMER | Geo-scoped PU | GLOBAL_REGION = 'AMERICAS' |
| PU_EMEA | Geo-scoped PU | GLOBAL_REGION = 'EMEA' |
| PU_APAC | Geo-scoped PU | GLOBAL_REGION = 'APAC' |
| PU_JAPAN | Geo-scoped PU | GLOBAL_REGION = 'JAPAN' |
| PU_EXCEPT_AMER | Intl PU | SUPER_GEO = 'INTERNATIONAL' |
| Overlay_ST | Team overlay | SalesTeam filter via LDAP lookup |
| Overlay_SR | Region overlay | SalesRegion filter via LDAP lookup |

**Commit Type by RLS Role:**

- EU role: commit type derived from user's EMP_ROLE_TYPE via COMMIT_ROLE_MAPPING
- Overlay roles: forced to GEO_ADJ_COMMIT

---

## 9. Connection & Parameters

| Parameter | Value |
|---|---|
| Database | TAP_PROD |
| Server (prod) | idsha06.corp.adobe.com,1433 |
| Server (preprod) | IDSSQLPREPROD.corp.adobe.com,1440 |
| Incremental Refresh | Pipeline table — partitioned by SNAPSHOT_DATE (RangeStart/RangeEnd) |
| Published Dataset ID | e3d23c6a-9eea-4316-8425-cd5eae3fc382 |
