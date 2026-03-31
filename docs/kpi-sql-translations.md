# KPI DAX-to-SQL Translation Log

Reference of all KPI measures translated from Power BI DAX to working T-SQL against `TAP_DWH`.

---

## 1. GROSS CREATED QTD $

**Section:** Pipeline  
**Description:** Opportunity dollar amount created in the selected qualification quarter(s), closing within 4 quarters, excluding early-stage deals. Historical quarters pin to EOQ snapshot.

**Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `@QualificationQtrs` | `NVARCHAR(MAX)` | `NULL` | Comma-separated `FISCAL_YR_AND_QTR_DESC` values (e.g. `'2026-Q1,2025-Q4'`). NULL = current quarter (BKT=0) |

```sql
DECLARE @QualificationQtrs NVARCHAR(MAX) = NULL;

;WITH SelectedQtrs AS (
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
    OR (sq.QUALIFICATION_QTR_BKT < 0 AND snap_cal.CALENDAR_DATE = eoq.EOQ_SNAPSHOT_DATE);
```

**Key logic:**
- BKT >= 0 (current/future): no snapshot filter
- BKT < 0 (historical): pins to EOQ snapshot (W01 of next quarter)
- Sales stages S1, S2, and two "Closed from Non Pipe" variants are excluded
- Close quarter must be within 4 quarters of qualification quarter

---

## 2. GROSS CREATED YTD $

**Section:** Pipeline  
**Description:** Accumulates GROSS CREATED QTD $ across all quarters in the same fiscal year, up to and including the selected quarter.

**Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `@SelectedQtr` | `NVARCHAR(20)` | `NULL` | Single `FISCAL_YR_AND_QTR_DESC` value (e.g. `'2026-Q2'`). NULL = current quarter |

```sql
DECLARE @SelectedQtr NVARCHAR(20) = NULL;

;WITH Params AS (
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
    OR (yq.QUAL_QTR_BKT < 0 AND snap_cal.CALENDAR_DATE = eoq.EOQ_SNAPSHOT_DATE);
```

**Key logic:**
- Wraps GROSS CREATED QTD $ with a YTD accumulator
- `YTDQuarters` CTE expands to all quarters in the same fiscal year with `QTR_BKT_IND <= target`
- E.g. selecting `2026-Q3` sums QTD values for Q1 + Q2 + Q3 of FY2026

---

## 3. GROSS CREATED WTD $

**Section:** Pipeline  
**Description:** Week-to-date version. Filters OPPTY to a specific week within the qualification quarter, then applies quarter/stage filters.

**Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `@SelectedQtr` | `NVARCHAR(20)` | `NULL` | Single quarter. NULL = current (BKT=0) |
| `@Frequency` | `NVARCHAR(10)` | `'Daily'` | `'Daily'` or `'Weekly'` — determines week resolution logic |

```sql
DECLARE @SelectedQtr  NVARCHAR(20) = NULL;
DECLARE @Frequency    NVARCHAR(10) = 'Daily';

;WITH QtrParams AS (
    SELECT COALESCE(
        (SELECT TOP 1 cal.QTR_BKT_IND FROM vw_EBI_CALDATE cal
         WHERE cal.FISCAL_YR_AND_QTR_DESC = @SelectedQtr),
        0
    ) AS SelectedQtrBkt
),
WeekParams AS (
    -- Daily: current week = WEEK_BKT_NUMBER = 0
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
    -- Weekly: latest weekly snapshot date (SNAPSHOT_WEEK_BKT_RTB = 0)
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
    );
```

**Key logic:**
- Inner `[OPPTY WTD $]` resolves the target week via Daily/Weekly frequency switch
- Quarter boundary edge case: if current snapshot week falls in next quarter (QTR_BKT=1), falls back to last week of current quarter
- Outer filters: same quarter/close/stage pattern as QTD

**Column mappings (DAX role-playing to SQL physical):**
| DAX Alias | SQL Column | Calendar Role |
|---|---|---|
| `QUALIFICATION_WEEK_BKT` | `WEEK_BKT_NUMBER` | qual_cal (via `OPP_CREATE_DATE_ID`) |
| `WEEK_NUMBER_SORT` | `FISCAL_WEEK_NUMBER_BY_QTR` | qual_cal |
| `SNAPSHOT_WEEK_BKT` | `WEEK_SORT_ORDER_REVERSE` | snap_cal (via `SNAPSHOT_DATE_ID`) |
| `SNAPSHOT_WEEK_BKT_RTB` | `WEEK_SORT_ORDER_REVERSE_RTB` | snap_cal |

---

## 4. FULL QUARTER GROSS CREATION

**Section:** Pipeline Creation / Generation Target  
**Status:** Verified against DB  
**Description:** Sums generation targets across 5 close quarter buckets. Uses `IN_QTR_GC_TARGET` for the base quarter and `PIPE_TARGET_SURVIVAL_RATE * multiplier` for CQ+1 through CQ+4.

**Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `@QualificationQtrs` | `NVARCHAR(MAX)` | `NULL` | Comma-separated quarters. NULL = current (BKT=0) |
| `@MultiplierCQ1..CQ4` | `FLOAT` | `1.0` | From Power BI `Generation Target Multipliers` table (not in SQL Server) |

```sql
DECLARE @QualificationQtrs NVARCHAR(MAX) = NULL;
DECLARE @MultiplierCQ1 FLOAT = 1.0;  -- populate from business rules
DECLARE @MultiplierCQ2 FLOAT = 1.0;
DECLARE @MultiplierCQ3 FLOAT = 1.0;
DECLARE @MultiplierCQ4 FLOAT = 1.0;

;WITH SelectedQtrs AS (
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
        + ISNULL(f1.GenTarget * @MultiplierCQ1, 0)
        + ISNULL(f2.GenTarget * @MultiplierCQ2, 0)
        + ISNULL(f3.GenTarget * @MultiplierCQ3, 0)
        + ISNULL(f4.GenTarget * @MultiplierCQ4, 0)
    ) AS [Full Quarter Gross Creation]
FROM GenerationCQ cq
LEFT JOIN GenerationFuture f1
    ON cq.QUALIFICATION_QTR = f1.QUALIFICATION_QTR AND f1.QTR_OFFSET = 1
LEFT JOIN GenerationFuture f2
    ON cq.QUALIFICATION_QTR = f2.QUALIFICATION_QTR AND f2.QTR_OFFSET = 2
LEFT JOIN GenerationFuture f3
    ON cq.QUALIFICATION_QTR = f3.QUALIFICATION_QTR AND f3.QTR_OFFSET = 3
LEFT JOIN GenerationFuture f4
    ON cq.QUALIFICATION_QTR = f4.QUALIFICATION_QTR AND f4.QTR_OFFSET = 4;
```

**Verified results:**
| Filter | Result |
|---|---|
| NULL (current qtr, 2026-Q2) | 12,268,247,568.45 |
| `'2026-Q1'` | 11,696,631,976.59 |

**Known limitations:**
- Uses Quota path only (`vw_TF_EBI_QUOTA`). This matches the DAX `ISINSCOPE` override which forces Quota at row-level drill-down.
- Plan/QRF path requires `vw_TD_EBI_TARGET_TYPE` (doesn't exist in DB) and `vw_TF_EBI_PLAN_RPT_HK` (exists but has `PLAN_FISCAL_QUARTER_ID` instead of `QUOTA_FISCAL_QUARTER_ID`, and TARGET_TYPE_IDs 20/21 with no lookup).
- `Generation Target Multipliers` is a Power BI-only table. Multipliers must be hardcoded or sourced from business rules.

---

## Common Patterns

### Table Mappings

| DAX Table (Role-Playing) | SQL Table | Join Column |
|---|---|---|
| `'Qualification Quarter'` | `vw_EBI_CALDATE qual_cal` | `p.OPP_CREATE_DATE_ID = qual_cal.DATE_KEY` |
| `'Close Quarter'` | `vw_EBI_CALDATE close_cal` | `p.OPP_CLOSE_DATE_ID = close_cal.DATE_KEY` |
| `'Snapshot Quarter'` | `vw_EBI_CALDATE snap_cal` | `p.SNAPSHOT_DATE_ID = snap_cal.DATE_KEY` |
| `Pipeline` | `vw_TF_EBI_P2S p` | Fact table |
| `'Sales Stage'` | `vw_ebi_sales_stage s` | `p.SALES_STAGE_ID = s.SALES_STAGE_ID` |
| `Quota` | `vw_TF_EBI_QUOTA q` | `q.QUOTA_FISCAL_QUARTER_ID = cal.DATE_KEY` |
| `'Plan & QRF'` | `vw_TF_EBI_PLAN_RPT_HK` | `PLAN_FISCAL_QUARTER_ID = cal.DATE_KEY` |

### Key Column Mappings

| DAX Column | SQL Column | Notes |
|---|---|---|
| `QUALIFICATION_QTR` | `FISCAL_YR_AND_QTR_DESC` | e.g. `'2026-Q1'` |
| `QUALIFICATION_QTR_BKT` | `QTR_BKT_IND` | 0=current, -1=previous, 1=next |
| `CLOSE_QTR_BKT` | `QTR_BKT_IND` (close_cal) | Same column, different calendar role |
| `QUALIFICATION_YR` | `FISCAL_YR` | Integer fiscal year |
| `OPPTY $` | `SUM(p.OPPTY)` | Base measure |
| `SNAPSHOT_DATE` | `CALENDAR_DATE` (snap_cal) | |
| `SNAPSHOT_WEEK_NUMBER` | `WeekNumberName` | `'W01'` through `'W13'` |

### Standard Exclusion Filter

All pipeline creation KPIs exclude these sales stages:
```sql
s.SALES_STAGE NOT IN ('S1', 'S2', 'Closed CleanUp from Non Pipe', 'Closed Lost from Non Pipe')
```

### ISFILTERED / Default Quarter Pattern

Every measure uses the same pattern for handling filtered vs. unfiltered state:
```sql
-- NULL parameter = no filter = default to current quarter (BKT = 0)
WHERE (@QualificationQtrs IS NOT NULL AND cal.FISCAL_YR_AND_QTR_DESC IN (...))
   OR (@QualificationQtrs IS NULL AND cal.QTR_BKT_IND = 0)
```

### EOQ Snapshot Pattern (Historical Quarters)

For BKT < 0 quarters, the DAX pins to end-of-quarter snapshot:
```sql
-- EOQ = MAX snapshot date where next-quarter's W01
EOQSnapshotDates AS (
    SELECT sq.QUALIFICATION_QTR_BKT,
        MAX(cal.CALENDAR_DATE) AS EOQ_SNAPSHOT_DATE
    FROM ... JOIN vw_EBI_CALDATE cal
        ON cal.QTR_BKT_IND = sq.QUALIFICATION_QTR_BKT + 1
        AND cal.WeekNumberName = 'W01'
    WHERE sq.QUALIFICATION_QTR_BKT < 0
    GROUP BY sq.QUALIFICATION_QTR_BKT
)
```

---

## 5. GROSS CREATION QTD

**Section:** Pipeline Creation / Generation Target  
**Status:** Verified against DB  
**Description:** Phased version of FULL QUARTER GROSS CREATION. Prorates the full quarter generation target by current week progress within the quarter. Uses hockey-stick phasing for Q1 (10% in first 6 weeks, 90% in last 7 weeks) and linear phasing for other quarters.

**Depends on:** FULL QUARTER GROSS CREATION (#4), RECON LAST WEEK

**Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `@QualificationQtrs` | `NVARCHAR(MAX)` | `NULL` | Comma-separated quarters. NULL = current (BKT=0) |
| `@MultiplierCQ1..CQ4` | `FLOAT` | `1.0` | Generation target multipliers (Power BI-only table) |

```sql
DECLARE @QualificationQtrs NVARCHAR(MAX) = NULL;
DECLARE @MultiplierCQ1 FLOAT = 1.0;  -- populate from business rules
DECLARE @MultiplierCQ2 FLOAT = 1.0;
DECLARE @MultiplierCQ3 FLOAT = 1.0;
DECLARE @MultiplierCQ4 FLOAT = 1.0;

;WITH
-- Step 1: Resolve RECON LAST WEEK (current week number in quarter)
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
-- Step 2: Resolve selected quarters
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
-- Step 3: FULL QUARTER GROSS CREATION components
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
        + ISNULL(f1.GenTarget * @MultiplierCQ1, 0)
        + ISNULL(f2.GenTarget * @MultiplierCQ2, 0)
        + ISNULL(f3.GenTarget * @MultiplierCQ3, 0)
        + ISNULL(f4.GenTarget * @MultiplierCQ4, 0) AS Qt
    FROM GenerationCQ cq
    LEFT JOIN GenerationFuture f1 ON cq.QUALIFICATION_QTR = f1.QUALIFICATION_QTR AND f1.QTR_OFFSET = 1
    LEFT JOIN GenerationFuture f2 ON cq.QUALIFICATION_QTR = f2.QUALIFICATION_QTR AND f2.QTR_OFFSET = 2
    LEFT JOIN GenerationFuture f3 ON cq.QUALIFICATION_QTR = f3.QUALIFICATION_QTR AND f3.QTR_OFFSET = 3
    LEFT JOIN GenerationFuture f4 ON cq.QUALIFICATION_QTR = f4.QUALIFICATION_QTR AND f4.QTR_OFFSET = 4
)
-- Step 4: Phase by current week
SELECT
    SUM(
        CASE
            -- Historical quarters: full target as-is
            WHEN fq.BASE_QTR_BKT < 0 THEN fq.Qt
            -- Current quarter: prorate by week
            WHEN fq.BASE_QTR_BKT = 0 THEN
                CASE
                    -- Q1: hockey-stick phasing (10% first 6 weeks, 90% last 7)
                    WHEN RIGHT(fq.QUALIFICATION_QTR, 2) = 'Q1' THEN
                        CASE
                            WHEN rw.CurrentWeek <= 6
                                THEN (fq.Qt * 0.1 * rw.CurrentWeek) / 6.0
                            ELSE (fq.Qt * 0.1) + (fq.Qt * 0.9 * (rw.CurrentWeek - 6)) / 7.0
                        END
                    -- Non-Q1: linear phasing
                    ELSE (fq.Qt * rw.CurrentWeek) / 13.0
                END
            -- Future quarters: NULL
            ELSE NULL
        END
    ) AS [Gross Creation QTD]
FROM FullQtrGrossCreation fq
CROSS JOIN ReconWeek rw;
```

**Verified results:**
| Filter | CurrentWeek | Result |
|---|---|---|
| NULL (2026-Q2, BKT=0) | 4 | 3,774,845,405.68 |
| `'2026-Q1'` (BKT=-1, historical) | 4 | 11,696,631,976.59 (full target, no phasing) |

**Phasing logic:**
| Quarter Type | BKT | Formula |
|---|---|---|
| Historical | < 0 | `Qt` (full target, no phasing) |
| Current, Q1, weeks 1-6 | 0 | `(Qt * 0.1 * CurrentWeek) / 6` |
| Current, Q1, weeks 7-13 | 0 | `(Qt * 0.1) + (Qt * 0.9 * (CurrentWeek - 6)) / 7` |
| Current, non-Q1 | 0 | `(Qt * CurrentWeek) / 13` |
| Future | > 0 | `NULL` |

**RECON LAST WEEK sub-measure:**
Resolves current week number in the quarter. If the current snapshot week falls in the next quarter (QTR_BKT=1, i.e. quarter boundary), falls back to last week (13) of current quarter.
```
WEEK_SORT_ORDER_REVERSE = '0' → current snapshot date
FISCAL_WEEK_NUMBER_BY_QTR    → week number within quarter (VARCHAR, cast to INT)
```

---

## 6. GROSS CREATION YTD

**Section:** Pipeline Creation / Generation Target  
**Status:** Verified against DB  
**Description:** YTD accumulator over GROSS CREATION QTD. Sums phased generation targets across all quarters in the same fiscal year, up to and including the selected quarter.

**Depends on:** GROSS CREATION QTD (#5), FULL QUARTER GROSS CREATION (#4), RECON LAST WEEK

**Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `@SelectedQtr` | `NVARCHAR(20)` | `NULL` | Single quarter (e.g. `'2026-Q2'`). NULL = current (BKT=0) |
| `@MultiplierCQ1..CQ4` | `FLOAT` | `1.0` | Generation target multipliers (Power BI-only table) |

```sql
DECLARE @SelectedQtr NVARCHAR(20) = NULL;
DECLARE @MultiplierCQ1 FLOAT = 1.0;  -- populate from business rules
DECLARE @MultiplierCQ2 FLOAT = 1.0;
DECLARE @MultiplierCQ3 FLOAT = 1.0;
DECLARE @MultiplierCQ4 FLOAT = 1.0;

;WITH
-- Step 1: Resolve RECON LAST WEEK
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
-- Step 2: Resolve target year and max BKT
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
-- Step 3: Expand to all quarters in the fiscal year up to target
YTDQuarters AS (
    SELECT DISTINCT
        cal.FISCAL_YR_AND_QTR_DESC AS QUALIFICATION_QTR,
        cal.QTR_BKT_IND           AS BASE_QTR_BKT
    FROM vw_EBI_CALDATE cal
    CROSS JOIN Params pm
    WHERE cal.FISCAL_YR = pm.TargetYr
      AND cal.QTR_BKT_IND <= pm.TargetQtrBkt
),
-- Step 4: FULL QUARTER GROSS CREATION per quarter
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
        + ISNULL(f1.GenTarget * @MultiplierCQ1, 0)
        + ISNULL(f2.GenTarget * @MultiplierCQ2, 0)
        + ISNULL(f3.GenTarget * @MultiplierCQ3, 0)
        + ISNULL(f4.GenTarget * @MultiplierCQ4, 0) AS Qt
    FROM GenerationCQ cq
    LEFT JOIN GenerationFuture f1 ON cq.QUALIFICATION_QTR = f1.QUALIFICATION_QTR AND f1.QTR_OFFSET = 1
    LEFT JOIN GenerationFuture f2 ON cq.QUALIFICATION_QTR = f2.QUALIFICATION_QTR AND f2.QTR_OFFSET = 2
    LEFT JOIN GenerationFuture f3 ON cq.QUALIFICATION_QTR = f3.QUALIFICATION_QTR AND f3.QTR_OFFSET = 3
    LEFT JOIN GenerationFuture f4 ON cq.QUALIFICATION_QTR = f4.QUALIFICATION_QTR AND f4.QTR_OFFSET = 4
)
-- Step 5: Phase each quarter by week, then SUM for YTD
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
CROSS JOIN ReconWeek rw;
```

**Verified results:**
| Filter | Quarters Included | Result |
|---|---|---|
| NULL (current = 2026-Q2) | Q1 (full) + Q2 (phased) | 15,471,477,382.26 |
| `'2026-Q2'` breakdown | Q1: 11,696,631,976.59 (historical, full) | |
| | Q2: 3,774,845,405.68 (current, 4/13 phased) | |
| | **YTD total: 15,471,477,382.26** | |

**Key logic:**
- `YTDQuarters` CTE: all quarters where `FISCAL_YR = target year AND QTR_BKT_IND <= target BKT`
- Each quarter gets its own FULL QUARTER GROSS CREATION, then phased by the GROSS CREATION QTD logic
- Historical quarters (BKT < 0) contribute full target; current quarter contributes phased amount
- Results are summed across all included quarters for the YTD total

---

## 7. GROSS CREATION WTD

**Section:** Pipeline Creation / Generation Target  
**Status:** Verified against DB  
**Description:** Per-week generation target. Divides FULL QUARTER GROSS CREATION by 13 (or hockey-stick for Q1). Unlike QTD which accumulates weeks, WTD gives the single-week target amount.

**Depends on:** FULL QUARTER GROSS CREATION (#4), RECON LAST WEEK

**Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `@QualificationQtrs` | `NVARCHAR(MAX)` | `NULL` | Comma-separated quarters. NULL = current (BKT=0) |
| `@MultiplierCQ1..CQ4` | `FLOAT` | `1.0` | Generation target multipliers (Power BI-only table) |

```sql
DECLARE @QualificationQtrs NVARCHAR(MAX) = NULL;
DECLARE @MultiplierCQ1 FLOAT = 1.0;  -- populate from business rules
DECLARE @MultiplierCQ2 FLOAT = 1.0;
DECLARE @MultiplierCQ3 FLOAT = 1.0;
DECLARE @MultiplierCQ4 FLOAT = 1.0;

;WITH
-- Step 1: Resolve RECON LAST WEEK
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
-- Step 2: Resolve generic quarter name (Q1/Q2/Q3/Q4)
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
-- Step 3: Resolve selected quarters
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
-- Step 4: FULL QUARTER GROSS CREATION
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
        + ISNULL(f1.GenTarget * @MultiplierCQ1, 0)
        + ISNULL(f2.GenTarget * @MultiplierCQ2, 0)
        + ISNULL(f3.GenTarget * @MultiplierCQ3, 0)
        + ISNULL(f4.GenTarget * @MultiplierCQ4, 0) AS Qt
    FROM GenerationCQ cq
    LEFT JOIN GenerationFuture f1 ON cq.QUALIFICATION_QTR = f1.QUALIFICATION_QTR AND f1.QTR_OFFSET = 1
    LEFT JOIN GenerationFuture f2 ON cq.QUALIFICATION_QTR = f2.QUALIFICATION_QTR AND f2.QTR_OFFSET = 2
    LEFT JOIN GenerationFuture f3 ON cq.QUALIFICATION_QTR = f3.QUALIFICATION_QTR AND f3.QTR_OFFSET = 3
    LEFT JOIN GenerationFuture f4 ON cq.QUALIFICATION_QTR = f4.QUALIFICATION_QTR AND f4.QTR_OFFSET = 4
)
-- Step 5: Divide by weeks (per-week target)
SELECT
    SUM(
        CASE
            -- Only for current or historical quarters (BKT <= 0)
            WHEN fq.BASE_QTR_BKT <= 0 THEN
                CASE
                    -- Q1: hockey-stick per-week rate
                    WHEN cqi.GenericQtr = 'Q1' THEN
                        CASE
                            WHEN rw.CurrentWeek <= 6 THEN (fq.Qt * 0.1) / 6.0
                            ELSE (fq.Qt * 0.9) / 7.0
                        END
                    -- Non-Q1: linear per-week rate
                    ELSE fq.Qt / 13.0
                END
            -- Future: NULL
            ELSE NULL
        END
    ) AS [Gross Creation WTD]
FROM FullQtrGrossCreation fq
CROSS JOIN ReconWeek rw
CROSS JOIN CurrentQtrInfo cqi;
```

**Verified results:**
| Filter | CurrentWeek | GenericQtr | Formula | Result |
|---|---|---|---|---|
| NULL (2026-Q2, BKT=0) | 4 | Q2 | Qt / 13 | 943,711,351.42 |
| `'2026-Q1'` (BKT=-1) | 4 (<=6) | Q1 | Qt * 0.1 / 6 | 194,943,866.28 |

**WTD vs QTD vs Full Quarter:**
| Measure | Formula | 2026-Q2 Value |
|---|---|---|
| FULL QUARTER GROSS CREATION | Full target | 12,268,247,568.45 |
| GROSS CREATION WTD | Qt / 13 (per week) | 943,711,351.42 |
| GROSS CREATION QTD | Qt * 4 / 13 (accumulated) | 3,774,845,405.68 |

**Q1 hockey-stick per-week rates:**
| Weeks | Rate per week |
|---|---|
| 1-6 | `Qt * 0.1 / 6` (lower rate, 10% of target across 6 weeks) |
| 7-13 | `Qt * 0.9 / 7` (higher rate, 90% of target across 7 weeks) |

---

## 8. GAP -VE GROSS CREATED VS GROSS CREATION TARGET QTD $

**Section:** Pipeline  
**Status:** Verified against DB  
**Description:** Negative-only gap between actual pipeline created (GROSS CREATED QTD $) and the generation target (GROSS CREATION QTD). Returns 0 if ahead of target; returns the negative shortfall if behind.

**Depends on:** GROSS CREATED QTD $ (#1), GROSS CREATION QTD (#5)

**DAX formula:** `IF([GROSS CREATED QTD $] - [GROSS CREATION QTD] > 0, 0, [GROSS CREATED QTD $] - [GROSS CREATION QTD])`

**Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `@QualificationQtrs` | `NVARCHAR(MAX)` | `NULL` | Comma-separated quarters. NULL = current (BKT=0) |
| `@MultiplierCQ1..CQ4` | `FLOAT` | `1.0` | Generation target multipliers |

```sql
DECLARE @QualificationQtrs NVARCHAR(MAX) = NULL;
DECLARE @MultiplierCQ1 FLOAT = 1.0;
DECLARE @MultiplierCQ2 FLOAT = 1.0;
DECLARE @MultiplierCQ3 FLOAT = 1.0;
DECLARE @MultiplierCQ4 FLOAT = 1.0;

;WITH
-- RECON LAST WEEK
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
-- Selected quarters
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
-- EOQ snapshot dates for historical quarters
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
-- Component A: GROSS CREATED QTD $ (actual pipeline)
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
-- Component B: GROSS CREATION QTD (phased target)
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
        + ISNULL(f1.GenTarget * @MultiplierCQ1, 0)
        + ISNULL(f2.GenTarget * @MultiplierCQ2, 0)
        + ISNULL(f3.GenTarget * @MultiplierCQ3, 0)
        + ISNULL(f4.GenTarget * @MultiplierCQ4, 0) AS Qt
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
-- Final: negative-only gap
SELECT
    CASE
        WHEN gc.Val - gt.Val > 0 THEN 0
        ELSE gc.Val - gt.Val
    END AS [Gap -ve Gross Created vs Gross Creation Target QTD $]
FROM GrossCreatedQTD gc
CROSS JOIN GrossCreationQTD gt;
```

**Verified results:**
| Filter | Gross Created QTD $ | Gross Creation QTD | Gap | Capped Result |
|---|---|---|---|---|
| NULL (2026-Q2) | 15,872,053,353.02 | 3,774,845,405.68 | +12,097,207,947.34 | **0** (ahead of target) |

**Key logic:**
- Computes both measures independently as CTEs, then subtracts
- `IF(Gap > 0, 0, Gap)` — only surfaces negative gaps (shortfalls); positive gaps (ahead) = 0
- Both components use the same `SelectedQtrs` CTE for consistency

---

## 9. FULL QUARTER GROSS CREATION Q1

**Section:** Pipeline Creation / Generation Target  
**Status:** Verified against DB  
**Description:** Same as FULL QUARTER GROSS CREATION (#4) but hardcoded to Q1 of the selected (or current) fiscal year. Used in YTD decomposition views to show individual quarter targets.

**Depends on:** IN QTR GC TARGET, GENERATION TARGET, Generation Target Multipliers

**Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `@SelectedYr` | `INT` | `NULL` | Fiscal year (e.g. `2026`). NULL = current year |
| `@MultiplierCQ1..CQ4` | `FLOAT` | `1.0` | Generation target multipliers |

```sql
DECLARE @SelectedYr INT = NULL;  -- e.g. 2026. NULL = current fiscal year
DECLARE @MultiplierCQ1 FLOAT = 1.0;
DECLARE @MultiplierCQ2 FLOAT = 1.0;
DECLARE @MultiplierCQ3 FLOAT = 1.0;
DECLARE @MultiplierCQ4 FLOAT = 1.0;

;WITH
-- Resolve target fiscal year
Params AS (
    SELECT COALESCE(
        @SelectedYr,
        (SELECT TOP 1 cal.FISCAL_YR FROM vw_EBI_CALDATE cal WHERE cal.QTR_BKT_IND = 0)
    ) AS TargetYr
),
-- Find Q1's QTR_BKT_IND for that year
Q1Bkt AS (
    SELECT MIN(cal.QTR_BKT_IND) AS BKT
    FROM vw_EBI_CALDATE cal
    CROSS JOIN Params pm
    WHERE RIGHT(cal.FISCAL_YR_AND_QTR_DESC, 2) = 'Q1'
      AND cal.FISCAL_YR = pm.TargetYr
),
-- CQ component: IN_QTR_GC_TARGET at Q1's BKT
GenerationCQ AS (
    SELECT SUM(q.IN_QTR_GC_TARGET) AS Amount
    FROM Q1Bkt b
    JOIN vw_EBI_CALDATE cal ON cal.QTR_BKT_IND = b.BKT
    JOIN vw_TF_EBI_QUOTA q ON q.QUOTA_FISCAL_QUARTER_ID = cal.DATE_KEY
),
-- CQ+1..CQ+4: PIPE_TARGET_SURVIVAL_RATE * multiplier
GenerationFuture AS (
    SELECT o.n AS QTR_OFFSET,
        SUM(q.PIPE_TARGET_SURVIVAL_RATE) AS GenTarget
    FROM Q1Bkt b
    CROSS JOIN (VALUES (1),(2),(3),(4)) o(n)
    JOIN vw_EBI_CALDATE cal ON cal.QTR_BKT_IND = b.BKT + o.n
    JOIN vw_TF_EBI_QUOTA q ON q.QUOTA_FISCAL_QUARTER_ID = cal.DATE_KEY
    GROUP BY o.n
)
SELECT
    cq.Amount
    + ISNULL(f1.GenTarget * @MultiplierCQ1, 0)
    + ISNULL(f2.GenTarget * @MultiplierCQ2, 0)
    + ISNULL(f3.GenTarget * @MultiplierCQ3, 0)
    + ISNULL(f4.GenTarget * @MultiplierCQ4, 0)
    AS [Full Quarter Gross Creation Q1]
FROM GenerationCQ cq
LEFT JOIN GenerationFuture f1 ON f1.QTR_OFFSET = 1
LEFT JOIN GenerationFuture f2 ON f2.QTR_OFFSET = 2
LEFT JOIN GenerationFuture f3 ON f3.QTR_OFFSET = 3
LEFT JOIN GenerationFuture f4 ON f4.QTR_OFFSET = 4;
```

**Verified results:**
| Filter | Result | Cross-check |
|---|---|---|
| NULL (FY2026 Q1) | 11,696,631,976.59 | Matches FULL QTR GROSS CREATION with `'2026-Q1'` |

**Key difference from FULL QUARTER GROSS CREATION (#4):**
- #4 uses `@QualificationQtrs` to select any quarter(s)
- This measure always targets Q1 of the given year, using `RIGHT(FISCAL_YR_AND_QTR_DESC, 2) = 'Q1'` to find Q1's BKT
- DAX uses `QUALIFICATION_GENERIC_QTR = "Q1"` (role-playing alias) which maps to `RIGHT(FISCAL_YR_AND_QTR_DESC, 2)`
- DAX uses `QUALIFICATION_YR_BKT_NUMBER = 0` for current year, which maps to `FISCAL_YR_BKT_NUMBER`

**Note:** The same pattern applies for Q2, Q3, Q4 variants — just change `'Q1'` to `'Q2'`/`'Q3'`/`'Q4'` in the `QBkt` CTE.

---

## 10. FULL QUARTER GROSS CREATION Q2

**Section:** Pipeline Creation / Generation Target  
**Status:** Verified against DB  
**Description:** Same as #9 but for Q2 of the selected/current fiscal year.

**Parameters:** Same as #9.

```sql
DECLARE @SelectedYr INT = NULL;
DECLARE @MultiplierCQ1 FLOAT = 1.0;
DECLARE @MultiplierCQ2 FLOAT = 1.0;
DECLARE @MultiplierCQ3 FLOAT = 1.0;
DECLARE @MultiplierCQ4 FLOAT = 1.0;

;WITH
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
    WHERE RIGHT(cal.FISCAL_YR_AND_QTR_DESC, 2) = 'Q2'
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
    + ISNULL(f1.GenTarget * @MultiplierCQ1, 0)
    + ISNULL(f2.GenTarget * @MultiplierCQ2, 0)
    + ISNULL(f3.GenTarget * @MultiplierCQ3, 0)
    + ISNULL(f4.GenTarget * @MultiplierCQ4, 0)
    AS [Full Quarter Gross Creation Q2]
FROM GenerationCQ cq
LEFT JOIN GenerationFuture f1 ON f1.QTR_OFFSET = 1
LEFT JOIN GenerationFuture f2 ON f2.QTR_OFFSET = 2
LEFT JOIN GenerationFuture f3 ON f3.QTR_OFFSET = 3
LEFT JOIN GenerationFuture f4 ON f4.QTR_OFFSET = 4;
```

**Verified results:**
| Filter | Result | Cross-check |
|---|---|---|
| NULL (FY2026 Q2) | 12,268,247,568.45 | Matches FULL QTR GROSS CREATION with `'2026-Q2'` |

---

## 11. FULL QUARTER GROSS CREATION Q3

**Section:** Pipeline Creation / Generation Target  
**Status:** Verified against DB  
**Description:** Same as #9/#10 but for Q3 of the selected/current fiscal year.

**Parameters:** Same as #9.

```sql
DECLARE @SelectedYr INT = NULL;
DECLARE @MultiplierCQ1 FLOAT = 1.0;
DECLARE @MultiplierCQ2 FLOAT = 1.0;
DECLARE @MultiplierCQ3 FLOAT = 1.0;
DECLARE @MultiplierCQ4 FLOAT = 1.0;

;WITH
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
    WHERE RIGHT(cal.FISCAL_YR_AND_QTR_DESC, 2) = 'Q3'
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
    + ISNULL(f1.GenTarget * @MultiplierCQ1, 0)
    + ISNULL(f2.GenTarget * @MultiplierCQ2, 0)
    + ISNULL(f3.GenTarget * @MultiplierCQ3, 0)
    + ISNULL(f4.GenTarget * @MultiplierCQ4, 0)
    AS [Full Quarter Gross Creation Q3]
FROM GenerationCQ cq
LEFT JOIN GenerationFuture f1 ON f1.QTR_OFFSET = 1
LEFT JOIN GenerationFuture f2 ON f2.QTR_OFFSET = 2
LEFT JOIN GenerationFuture f3 ON f3.QTR_OFFSET = 3
LEFT JOIN GenerationFuture f4 ON f4.QTR_OFFSET = 4;
```

**Verified results:**
| Filter | Result |
|---|---|
| NULL (FY2026 Q3) | 12,985,476,979.71 |

---

## 12. GROSS CREATION QTD TREND

**Section:** Pipeline Creation / Generation Target  
**Status:** Verified against DB  
**Description:** Week-by-week trend line of the phased generation target across the quarter. Used to plot the target curve on weekly charts. Takes `@WeekNum` as parameter (the x-axis week number) instead of using RECON LAST WEEK.

**Depends on:** FULL QUARTER GROSS CREATION (#4)

**Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `@WeekNum` | `INT` | required | Week number (1-13) on the chart x-axis |
| `@QualificationQtrs` | `NVARCHAR(MAX)` | `NULL` | Quarter filter. NULL = current (BKT=0) |
| `@MultiplierCQ1..CQ4` | `FLOAT` | `1.0` | Generation target multipliers |

```sql
DECLARE @WeekNum INT = 4;  -- the week on the trend chart x-axis
DECLARE @QualificationQtrs NVARCHAR(MAX) = NULL;
DECLARE @MultiplierCQ1 FLOAT = 1.0;
DECLARE @MultiplierCQ2 FLOAT = 1.0;
DECLARE @MultiplierCQ3 FLOAT = 1.0;
DECLARE @MultiplierCQ4 FLOAT = 1.0;

;WITH
-- Resolve selected quarter and generic name
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
-- FULL QUARTER GROSS CREATION
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
        + ISNULL(f1.GenTarget * @MultiplierCQ1, 0)
        + ISNULL(f2.GenTarget * @MultiplierCQ2, 0)
        + ISNULL(f3.GenTarget * @MultiplierCQ3, 0)
        + ISNULL(f4.GenTarget * @MultiplierCQ4, 0) AS Qt
    FROM GenerationCQ cq
    LEFT JOIN GenerationFuture f1 ON cq.QUALIFICATION_QTR = f1.QUALIFICATION_QTR AND f1.QTR_OFFSET = 1
    LEFT JOIN GenerationFuture f2 ON cq.QUALIFICATION_QTR = f2.QUALIFICATION_QTR AND f2.QTR_OFFSET = 2
    LEFT JOIN GenerationFuture f3 ON cq.QUALIFICATION_QTR = f3.QUALIFICATION_QTR AND f3.QTR_OFFSET = 3
    LEFT JOIN GenerationFuture f4 ON cq.QUALIFICATION_QTR = f4.QUALIFICATION_QTR AND f4.QTR_OFFSET = 4
)
-- Phase by the given week number
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
CROSS JOIN GenericQtr gq;
```

**Verified results (2026-Q2, non-Q1, linear):**
| WeekNum | Gross Creation QTD Trend |
|---|---|
| 1 | 943,711,351.42 |
| 4 | 3,774,845,405.68 (matches GROSS CREATION QTD #5) |
| 13 | 12,268,247,568.45 (matches FULL QTR GROSS CREATION #4) |

**Key difference from GROSS CREATION QTD (#5):**
- #5 uses `RECON LAST WEEK` (current week) to compute a single accumulated value
- This measure takes `@WeekNum` as input, producing one data point per week for a trend chart
- Uses `MAXWEEKNUMBER` (dynamic, from calendar) instead of hardcoded 13 — though in practice both are 13 for a standard quarter

---

## 13. FULL QUARTER GROSS CREATION Q4

**Section:** Pipeline Creation / Generation Target  
**Status:** Verified against DB  
**Description:** Same as #9/#10/#11 but for Q4 of the selected/current fiscal year.

**Parameters:** Same as #9.

```sql
DECLARE @SelectedYr INT = NULL;
DECLARE @MultiplierCQ1 FLOAT = 1.0;
DECLARE @MultiplierCQ2 FLOAT = 1.0;
DECLARE @MultiplierCQ3 FLOAT = 1.0;
DECLARE @MultiplierCQ4 FLOAT = 1.0;

;WITH
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
    WHERE RIGHT(cal.FISCAL_YR_AND_QTR_DESC, 2) = 'Q4'
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
    + ISNULL(f1.GenTarget * @MultiplierCQ1, 0)
    + ISNULL(f2.GenTarget * @MultiplierCQ2, 0)
    + ISNULL(f3.GenTarget * @MultiplierCQ3, 0)
    + ISNULL(f4.GenTarget * @MultiplierCQ4, 0)
    AS [Full Quarter Gross Creation Q4]
FROM GenerationCQ cq
LEFT JOIN GenerationFuture f1 ON f1.QTR_OFFSET = 1
LEFT JOIN GenerationFuture f2 ON f2.QTR_OFFSET = 2
LEFT JOIN GenerationFuture f3 ON f3.QTR_OFFSET = 3
LEFT JOIN GenerationFuture f4 ON f4.QTR_OFFSET = 4;
```

**Verified results:**
| Filter | Result |
|---|---|
| NULL (FY2026 Q4) | 14,276,036,673.05 |

**All quarter variants summary:**
| Measure | FY2026 Result |
|---|---|
| FULL QUARTER GROSS CREATION Q1 (#9) | 11,696,631,976.59 |
| FULL QUARTER GROSS CREATION Q2 (#10) | 12,268,247,568.45 |
| FULL QUARTER GROSS CREATION Q3 (#11) | 12,985,476,979.71 |
| FULL QUARTER GROSS CREATION Q4 (#13) | 14,276,036,673.05 |

---

## 14. GROSS CREATION %

**Section:** Performance Measures  
**Status:** Verified against DB  
**Description:** Ratio of total pipeline (OPPTY $) to the phased generation target (GROSS CREATION QTD). Indicates how many multiples of the target have been created. Returns as a decimal (e.g. 5.23 = 523%).

**Depends on:** OPPTY $ (SUM of all pipeline), GROSS CREATION QTD (#5)

**DAX formula:** `DIVIDE([OPPTY $], [GROSS CREATION QTD])`

**Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `@QualificationQtrs` | `NVARCHAR(MAX)` | `NULL` | Quarter filter. NULL = current (BKT=0) |
| `@MultiplierCQ1..CQ4` | `FLOAT` | `1.0` | Generation target multipliers |

```sql
DECLARE @QualificationQtrs NVARCHAR(MAX) = NULL;
DECLARE @MultiplierCQ1 FLOAT = 1.0;
DECLARE @MultiplierCQ2 FLOAT = 1.0;
DECLARE @MultiplierCQ3 FLOAT = 1.0;
DECLARE @MultiplierCQ4 FLOAT = 1.0;

;WITH
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
-- Numerator: OPPTY $ (unfiltered total pipeline)
OpptyDollar AS (
    SELECT SUM(p.OPPTY) AS Val FROM vw_TF_EBI_P2S p
),
-- Denominator: GROSS CREATION QTD (phased target)
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
        + ISNULL(f1.GenTarget * @MultiplierCQ1, 0)
        + ISNULL(f2.GenTarget * @MultiplierCQ2, 0)
        + ISNULL(f3.GenTarget * @MultiplierCQ3, 0)
        + ISNULL(f4.GenTarget * @MultiplierCQ4, 0) AS Qt
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
-- Final: DIVIDE with null-safety
SELECT
    o.Val / NULLIF(gc.Val, 0) AS [Gross Creation %]
FROM OpptyDollar o
CROSS JOIN GrossCreationQTD gc;
```

**Verified results:**
| Filter | OPPTY $ | Gross Creation QTD | Gross Creation % |
|---|---|---|---|
| NULL (2026-Q2) | 1,974,338,788,437.81 | 3,774,845,405.68 | 523.03 (52,303%) |

**Note:** `[OPPTY $]` in the DAX is `SUM(Pipeline[OPPTY])` — the **unfiltered** total pipeline amount across all snapshots/quarters. This is divided by the phased generation target to produce a coverage ratio.

---

## 15. GROSS CREATION QTD %

**Section:** Performance Measures  
**Status:** Verified against DB  
**Description:** Ratio of actual pipeline created (GROSS CREATED QTD $) to the phased generation target (GROSS CREATION QTD). Returns 0 if target < 1 (to avoid nonsense ratios). This is the **filtered** pipeline version (unlike GROSS CREATION % which uses unfiltered OPPTY $).

**Depends on:** GROSS CREATED QTD $ (#1), GROSS CREATION QTD (#5)

**DAX formula:**
```
VAR GrossCreationPCT = DIVIDE([GROSS CREATED QTD $], [GROSS CREATION QTD])
VAR Result = IF([GROSS CREATION QTD] < 1, 0, GrossCreationPCT)
RETURN Result
```

**Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `@QualificationQtrs` | `NVARCHAR(MAX)` | `NULL` | Quarter filter. NULL = current (BKT=0) |
| `@MultiplierCQ1..CQ4` | `FLOAT` | `1.0` | Generation target multipliers |

```sql
-- Uses same CTEs as GAP measure (#8): ReconWeek, SelectedQtrs, GrossCreatedQTD, GrossCreationQTD
-- Then final SELECT:
SELECT
    CASE
        WHEN gt.Val < 1 THEN 0
        ELSE gc.Val / gt.Val
    END AS [Gross Creation QTD %]
FROM GrossCreatedQTD gc
CROSS JOIN GrossCreationQTD gt;
```

**(Full query is identical to #8 GAP measure CTEs, just with a different final SELECT. See #8 for the complete CTE chain.)**

**Verified results:**
| Filter | Gross Created QTD $ | Gross Creation QTD | Gross Creation QTD % |
|---|---|---|---|
| NULL (2026-Q2) | 15,872,053,353.02 | 3,774,845,405.68 | 4.20 (420%) |

**Difference from GROSS CREATION % (#14):**
| Measure | Numerator | Denominator | Result |
|---|---|---|---|
| GROSS CREATION % (#14) | `[OPPTY $]` (unfiltered total pipeline) | `[GROSS CREATION QTD]` | 523.03 |
| GROSS CREATION QTD % (#15) | `[GROSS CREATED QTD $]` (filtered pipeline) | `[GROSS CREATION QTD]` | 4.20 |

---

## 16. GROSS CREATION WTD %

**Section:** Performance Measures  
**Status:** Composite measure (no separate DB test needed)  
**Description:** Week-to-date ratio of actual pipeline created to the weekly generation target. `GROSS CREATED WTD $ / GROSS CREATION WTD`.

**Depends on:** GROSS CREATED WTD $ (#3), GROSS CREATION WTD (#7)

**DAX formula:** `DIVIDE([GROSS CREATED WTD $], [GROSS CREATION WTD])`

**Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `@QualificationQtrs` | `NVARCHAR(MAX)` | `NULL` | Quarter filter. NULL = current (BKT=0) |
| `@Frequency` | `NVARCHAR(10)` | `'Daily'` | `'Daily'` or `'Weekly'` for WTD week resolution |
| `@MultiplierCQ1..CQ4` | `FLOAT` | `1.0` | Generation target multipliers |

```sql
-- Compose: numerator = GROSS CREATED WTD $ (query #3), denominator = GROSS CREATION WTD (query #7)
-- Final SELECT:
SELECT
    wtd_actual.Val / NULLIF(wtd_target.Val, 0) AS [Gross Creation WTD %]
FROM GrossCreatedWTD wtd_actual
CROSS JOIN GrossCreationWTD wtd_target;
```

**(Build the full query by combining the CTE chains from #3 and #7, then dividing in the final SELECT.)**

**Composition of % measures summary:**
| Measure | Numerator | Denominator | Time Grain |
|---|---|---|---|
| GROSS CREATION % (#14) | `[OPPTY $]` (unfiltered) | `[GROSS CREATION QTD]` | QTD target |
| GROSS CREATION QTD % (#15) | `[GROSS CREATED QTD $]` | `[GROSS CREATION QTD]` | QTD target |
| GROSS CREATION WTD % (#16) | `[GROSS CREATED WTD $]` | `[GROSS CREATION WTD]` | WTD target |
