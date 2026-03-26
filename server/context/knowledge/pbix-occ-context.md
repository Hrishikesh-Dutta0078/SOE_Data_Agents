# OCC (One Command Center) Power BI — Business Context for Text-to-SQL

> Extracted from One Command Center (3).pbix.
> This report uses **DirectQuery** to the RTB DataVerse published dataset (same TAP_PROD DB).
> Table-to-DB mappings are shared with pbix-rtb-context.md — this file focuses on
> the 1355 OCC-specific measures, 174 calculated columns, and 45-page report structure.
> Use alongside pbix-rtb-context.md, schema-knowledge.json, join-knowledge.json, and business-rules.md.

---

## 1. Report Pages and Business Domains

OCC has 45 pages organized by persona (Rep/FLM/SLM/Mgr/AE) and domain.

### 1.1 Page Index

| Page | Visuals | Domain | Key KPIs |
|---|---|---|---|
| Duplicate of One Command Center | 121 | Landing Page | [ARR Impact_OCC], [CQ Attrition %], [CQ Renewal Rate Outlook], [CQ Renewal Rate WoW], [CQ Upsell # Attach %] (+12 more) |
| SLM View | 189 | SLM View | [AE QTD Participation], [ARRAVG SubID], [CQ Attrition OL $], [CQ Renewal Rate Outlook], [CQ Upsell # Attach %] (+43 more) |
| SLM Perf L3 | 94 | Performance | [% Weekly FLM participation QTD], [% Weekly FLM participation YTD], [% Weekly SLM participation QTD], [% Weekly SLM participation YTD], [FLM COUNT] (+9 more) |
| SBR | 95 | SBR/Account Health | [Accnts CQ ARRAVG], [Account Activity # _SBR], [Exec_summary], [Last Refresh], [OPPTY $] (+5 more) |
| ARRAVG L3 Mgr | 172 | ARR | [Accnts CQ ARRAVG], [CQ ARRAVG SubId], [CQ RBOB w/o PQ Trail], [Fit Score], [Last Refresh] (+10 more) |
| ARRAVG L3 AE | 172 | ARR | [Accnts CQ ARRAVG], [CQ ARRAVG SubId], [CQ RBOB w/o PQ Trail], [Fit Score], [Last Refresh] (+10 more) |
| Accounts Health Mgr | 186 | Customer Health | [Acc Red & Yellow %_Ac_H_L3], [Accnt Movement Down], [Accnt Movement Up], [Accnts CQ ARRAVG Health], [Accnts CQ ARRAVG] (+38 more) |
| Accounts Health AE | 186 | Customer Health | [Acc Red & Yellow %_Ac_H_L3], [Accnt Movement Down], [Accnt Movement Up], [Accnts CQ ARRAVG Health], [Accnts CQ ARRAVG] (+38 more) |
| Perf L3_Rep_View | 48 | Performance | [Last Refresh], [OCC_Rep Performance Measure L3], [Quarter_Callout] |
| ARRAVG L3 | 154 | ARR | [Accnts CQ ARRAVG], [CQ ARRAVG SubId], [CQ RBOB w/o PQ Trail], [Fit Score], [Last Refresh] (+10 more) |
| Accounts Health L3 | 185 | Customer Health | [Acc Red & Yellow %_Ac_H_L3], [Accnt Movement Down], [Accnt Movement Up], [Accnts CQ ARRAVG Health], [Accnts CQ ARRAVG] (+38 more) |
| GWP | 100 | Get Well Plan | [ATTRITION], [Accnts CQ ARRAVG], [Action_Plan_Detail], [GWP Account count Open closed], [GWP Account count closed] (+11 more) |
| TP_Deal_Sensei_Score | 1 | Deal Intelligence |  |
| Rep View | 202 | Rep View | [AE QTD Participation], [ARRAVG SubID], [CQ Attrition OL $], [CQ Gross Creation QTD %], [CQ Pipe Gen @75% QTD %] (+32 more) |
| FLM View | 209 | FLM View | [AE QTD Participation], [ARRAVG SubID], [CQ Attrition OL $], [CQ Gross Creation QTD %], [CQ Renewal Rate Outlook] (+33 more) |
| Rep Perf L3 | 107 | Performance | [% Weekly Rep participation QTD], [% Weekly Rep participation YTD], [FLM COUNT], [FP AE Total], [FP AE in seat] (+7 more) |
| FLM Perf L3 | 110 | Performance | [% Weekly FLM participation QTD], [% Weekly FLM participation YTD], [FLM COUNT], [FLM Participation QTD Comp_L3], [FLM Participation QTD] (+7 more) |
| Outlook L2 | 136 | Outlook/Forecast | [ARR Attrition Plan], [ARR Impact_OCC], [ARRAVG SubID], [Attrition Attn], [BOOKINGS TARGET] (+22 more) |
| Outlook L3 | 182 | Outlook/Forecast | [ABS WALK VALUE], [Accounts Count], [BOOKINGS TARGET], [CJ status], [CQ DRM Fct_UC $] (+32 more) |
| Outlook L3 Mgr | 182 | Outlook/Forecast | [ABS WALK VALUE], [Accounts Count], [BOOKINGS TARGET], [CJ status], [CQ DRM Fct_UC $] (+31 more) |
| Outlook L3 AE | 184 | Outlook/Forecast | [ABS WALK VALUE], [Accounts Count], [Adj Commit_M], [BOOKINGS TARGET], [CJ status] (+30 more) |
| Sub Acc On A Page | 136 | Account Detail | [APCompletionStatus], [ARR $], [ARR IMPACT], [ARR Non Zero DOAP], [ARRAVG QoQ] (+23 more) |
| Acc On A Page | 130 | Account Detail | [ARR IMPACT], [ARR Non Zero DOAP], [ARRAVG QoQ], [ARRAVG SubID], [ASV $] (+16 more) |
| Parent Acc On A Page | 125 | Account Detail | [APCompletionStatus], [ARR $], [ARR IMPACT], [ARR Non Zero DOAP], [ARRAVG QoQ] (+17 more) |
| TT Sub on a page | 1 | Account Detail |  |
| TT Parent on a page | 1 | Account Detail |  |
| Glossary | 13 | Glossary |  |
| Deal On A Page | 246 | Deal Intelligence | [ARR Non Zero DOAP], [ASV $], [Concatenated_Explanation_With-Question], [Deal_Sensei_Score], [Last Refresh] (+3 more) |
| Retention L3 | 172 | Retention | [# Green], [# Red], [# Yellow], [ARR IMPACT], [Additional Risks] (+52 more) |
| Retention Mgr | 162 | Retention | [# Green], [# Red], [# Yellow], [ARR IMPACT], [Additional Risks] (+41 more) |
| Retention AE | 163 | Retention | [# Green], [# Red], [# Yellow], [ARR IMPACT], [Additional Risks] (+42 more) |
| Retention - Trend | 53 | Retention | [ARR $], [ARR IMPACT], [Last Refresh], [RBOB ATTAINMENT % _L3], [RBOB ATTAINMENT % _OCC] (+2 more) |
| Linearity View | 65 | Linearity | [DealCount], [DealCount_OPC], [Last Refresh], [RBOB w/o PQ Trail] |
| L2 Mgr | 167 | L2 View | [AE >1.2X S5+ COV X CQ + 1 %], [AE >2X COV X CQ + 2 %], [AE >2X COV X CQ + 3 %], [AE IN SEAT %], [AE PART @75% QTD %] (+44 more) |
| Creation | 144 | Pipeline Creation | [% Weekly Gross Creation QTD], [Accnts CQ ARRAVG], [CQ RBOB w/o PQ Trail], [Deal type Concat], [FULL QUARTER GROSS CREATION] (+14 more) |
| Creation Mgr | 140 | Pipeline Creation | [% Weekly Gross Creation QTD], [Accnts CQ ARRAVG], [CQ RBOB w/o PQ Trail], [Deal type Concat], [FULL QUARTER GROSS CREATION] (+14 more) |
| Creation AE | 148 | Pipeline Creation | [% Weekly Gross Creation QTD], [Accnts CQ ARRAVG], [CQ RBOB w/o PQ Trail], [Deal type Concat], [FULL QUARTER GROSS CREATION] (+14 more) |
| Pipeline Coverage Mgr | 180 | Pipeline Coverage | [ABS WALK VALUE], [ACTIVE & UPDATED %], [Accounts Count], [BOOKINGS TARGET], [CJ status] (+29 more) |
| Pipeline Coverage AE | 184 | Pipeline Coverage | [ABS WALK VALUE], [ACTIVE & UPDATED %], [Accounts Count], [BOOKINGS TARGET], [CJ status] (+29 more) |
| One Command Center | 240 | Landing Page | [ARRAVG QoQ], [ARRAVG SubID], [CQ Attrition %], [CQ Gross Creation QTD %], [CQ Net% Plan] (+23 more) |
| L2 | 179 | L2 View | [AE >1.2X S5+ COV X CQ + 1 %], [AE >2X COV X CQ + 2 %], [AE >2X COV X CQ + 3 %], [AE IN SEAT %], [AE PART @75% QTD %] (+43 more) |
| Page 1 | 7 | General | [# of Deal reviews], [ARR $], [Accnts Propensity], [BOOKINGS TARGET], [PIPE $] (+4 more) |
| AE | 228 | AE View | [AE QTD Participation], [AE YTD Participation], [ARRAVG QoQ], [ARRAVG SubID], [Acc Green%] (+27 more) |
| Manager | 223 | Manager View | [AE QTD Participation], [ARRAVG QoQ], [ARRAVG SubID], [CQ Attrition OL $], [CQ Gross Creation QTD %] (+21 more) |
| Pipeline Coverage | 171 | Pipeline Coverage | [ABS WALK VALUE], [ACTIVE & UPDATED %], [Accounts Count], [BOOKINGS TARGET], [CJ status] (+29 more) |

### 1.2 Key Page Details

**Duplicate of One Command Center** (121 visuals)

- KPIs: [ARR Impact_OCC], [CQ Attrition %], [CQ Renewal Rate Outlook], [CQ Renewal Rate WoW], [CQ Upsell # Attach %], [CW RBOB w/o PQ Trail], [CW attrition $], [Last Refresh], [OPPTY $], [PW RBOB w/o PQ Trail], [PW attrition $], [RBOB ATTAINMENT % _L3], [RBOB w/o PQ Trail test], [RBOB w/o PQ Trail], [RBOB], [Renewal Rate], [param_measure_vp]
- Slicers: OCC_Parameter_ret_AE_attrition.[Parameter_ret_AE_attrition], Parameter_ARRAVG.[Parameter_ARRAVG], Parameter_Account Plan.[Parameter_Account Plan], Parameter_Attrition.[Parameter_Attrition], Parameter_Coverage.[Coverage Parameter], Parameter_Creation.[Creation Parameter], Parameter_FLM_Perf.[Parameter_FLM_Perf], Parameter_GNARR.[GNARR Parameter], Parameter_Health.[Parameter_Health Order], Parameter_Net%.[Parameter_Net%], Parameter_Progresssion.[Progression Parameter], Parameter_Renwal_Retention.[Parameter_Renwal_Retention], Parameter_Rep_perf.[Parameter_Rep_perf], Parameter_Retention_Exp.[Parameter_Retention_Exp], Parameter_Team_Perf.[Parameter_Team_Perf], Parameter_ret_attrition.[Parameter_ret_attrition], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Reporting Hierarchy.[REPORTING_HIERARCHY], Role Coverage.[ROLE_COVERAGE_BU], Role Coverage.[ROLE_COVERAGE_BU_GROUP], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME], Time Slicer.[Time Slicer], dim_param_vp.[Level1], dim_param_vp.[Level2]

**SLM View** (189 visuals)

- KPIs: [AE QTD Participation], [ARRAVG SubID], [CQ Attrition OL $], [CQ Renewal Rate Outlook], [CQ Upsell # Attach %], [FLM WITH >50% AE @75% QTD %], [FP Tier 1 Sub Complete %], [GROSS CREATED YTD %], [Last Refresh], [Mature Pipe SS5+ (Q+1)], [OCC_SLM Performance Measure], [Quarter_Callout], [Rep Participation QTD], [S3 Q+1 CovX], [S3+(F+U) LTG CovX], [S5+(F+U) LTG CovX], [SLM CY Cov Start], [SLM CY Cov Trend], [SLM CY Cov], [SLM Mat Cov Start], [SLM Mat Cov Trend], [SLM Mat Cov], [SLM Part QTD Trend], [SLM Part YTD Trend], [SLM QTD Attain Start], [SLM QTD Attain], [SLM QTD Gen Start], [SLM QTD Gen Trend], [SLM QTD Gen], [SLM QTD Team Start], [SLM QTD Team], [SLM R4Q Cov Start], [SLM R4Q Cov Trend], [SLM R4Q Cov], [SLM Team QTD Trend], [SLM Team YTD Trend], [SLM Tot Cov Start], [SLM Tot Cov Trend], [SLM Tot Cov], [SLM YTD Attain Start], [SLM YTD Attain], [SLM YTD Gen Start], [SLM YTD Gen Trend], [SLM YTD Gen], [SLM YTD Team Start], [SLM YTD Team], [Sol Green %], [W+F+UC %]
- Slicers: OCC_Parameter_ret_AE_attrition.[Parameter_ret_AE_attrition], Parameter_ARRAVG.[Parameter_ARRAVG], Parameter_Account Plan.[Parameter_Account Plan], Parameter_Coverage.[Coverage Parameter], Parameter_Creation.[Creation Parameter], Parameter_GNARR.[GNARR Parameter], Parameter_Health.[Parameter_Health Order], Parameter_OL_S3+LTG.[Parameter_OL_S3+LTG], Parameter_OL_S5+LTG.[Parameter_OL_S5+LTG], Parameter_Progresssion.[Progression Parameter], Parameter_Renwal_Retention.[Parameter_Renwal_Retention], Parameter_Rep_perf.[Parameter_Rep_perf], Parameter_Retention_Exp.[Parameter_Retention_Exp], Parameter_Team_Perf.[Parameter_Team_Perf], Parameter_my_participation.[Parameter_my_participation], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[IS_TRUE_SLM], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Reporting Hierarchy.[REPORTING_HIERARCHY], SLM Performance Table.[KPI Group], SLM Performance Table.[KPI Name], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME]

**SLM Perf L3** (94 visuals)

- KPIs: [% Weekly FLM participation QTD], [% Weekly FLM participation YTD], [% Weekly SLM participation QTD], [% Weekly SLM participation YTD], [FLM COUNT], [FP AE Total], [FP AE in seat], [Last Refresh], [OCC_SLM Performance Measure L3], [Quarter_Callout], [SLM Participation QTD Comp_L3], [SLM Participation YTD Comp_L3], [SLM QTD Attain], [SLM YTD Attain]
- Slicers: FLM Performance Table L3.[KPI Group], FLM Performance Table L3.[KPI Name], OCC_Performance Cohort SLM_Band.[Attainment Band], OCC_Performance Cohort SLM_Band.[QTD Attainment Band], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[IS_TRUE_SLM], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Reporting Hierarchy.[REPORTING_HIERARCHY], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME]

**SBR** (95 visuals)

- KPIs: [Accnts CQ ARRAVG], [Account Activity # _SBR], [Exec_summary], [Last Refresh], [OPPTY $], [SBR Completion], [SBR In-Progress], [SBR Past Due], [SBR Planned], [SBR not started]
- Slicers: Account Activities Metadata.[ACTIVITY_SOURCE_SYSTEM], Account Activities Metadata.[ACTIVITY_STATUS], Account Activities Metadata.[Activity_Status_New], Account Activities Metadata.[Last_modified_Date], Account Activities Metadata.[Meeting_Type_SBR], Customer Solution Health.[CUSTOMER_SOLUTION_HEALTH], Delivery Quarter.[DELIVERY_QTR], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[REPORTING_HIERARCHY], Region Hierarchy.[SALES_LEADER], Region Hierarchy.[SALES_LEADER_2], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Reporting Hierarchy.[REPORTING_HIERARCHY], Retention.[OOC Indicator], SBR Parameter.[SBR Parameter], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME], Whitespace List Metrics Accounts.[Parameter]

**ARRAVG L3 Mgr** (172 visuals)

- KPIs: [Accnts CQ ARRAVG], [CQ ARRAVG SubId], [CQ RBOB w/o PQ Trail], [Fit Score], [Last Refresh], [OPP TARGET NO PIPE $], [OPPTY $], [PIPE $], [ParentID Count], [Pipe by Soln Grp Or Rev band title], [R4Q RBOB w/o PQ Trail], [RBOB w/o PQ Trail], [Soln Grp Or Rev band title], [Sub_MA Count], [param_measure_Accounts]
- Slicers: Account Parent.[PRNT_NAME], Account Patch Metrics Accounts.[Parameter], Account Sub.[High Credit Risk Account], Account Sub.[SUB_NAME], Customer Health.[CUSTOMER_HEALTH], Customer Profile Attributes.[High AES], Customer Profile Attributes.[High ICP or UCP or AES Accounts], Customer Profile Attributes.[High UCP and ICP], Customer Profile Attributes.[High UCP or ICP], Dim_Parameter_Accounts.[Level 1], Dim_Parameter_Accounts.[Level 2], Opportunity.[OCC_No Business Driver], Pipeline.[OCC_Deal in month 3], Pipeline.[OCC_Deals with 5+ Hygiene Flag], Pipeline.[OCC_No IPOV in S5+], Pipeline.[OCC_No Mgr Review (+250k deals)], Pipeline.[OCC_No Mutual Plan in S5+], Pipeline.[OCC_No Partner Attach (+100k)], Pipeline.[OCC_No Power aligned in S5+], Pipeline.[OCC_Not Progressed in 30D], Pipeline.[OCC_Not Progressed in 60D], Pipeline.[OCC_Opp Age >365d], Pipeline.[OCC_Stage Duration > 120D], Prediction List Metrics Accounts.[Parameter], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Reporting Hierarchy.[REPORTING_HIERARCHY], Role Coverage.[ROLE_COVERAGE_BU], Role Coverage.[ROLE_COVERAGE_BU_GROUP], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME], SolutionGrp_ParentRevBand.[Value4], TPT Metadata.[CLEANED_PARENT_TIER], TPT Metadata.[CLEANED_SUB_TIER], TPT Metadata.[PREDICTION_TYPE], TPT Metadata.[Parent No Pipe], TPT Metadata.[Sub No Pipe], Whitespace List Metrics Accounts.[Parameter]

**ARRAVG L3 AE** (172 visuals)

- KPIs: [Accnts CQ ARRAVG], [CQ ARRAVG SubId], [CQ RBOB w/o PQ Trail], [Fit Score], [Last Refresh], [OPP TARGET NO PIPE $], [OPPTY $], [PIPE $], [ParentID Count], [Pipe by Soln Grp Or Rev band title], [R4Q RBOB w/o PQ Trail], [RBOB w/o PQ Trail], [Soln Grp Or Rev band title], [Sub_MA Count], [param_measure_Accounts]
- Slicers: Account Parent.[PRNT_NAME], Account Patch Metrics Accounts.[Parameter], Account Sub.[High Credit Risk Account], Account Sub.[SUB_NAME], Customer Health.[CUSTOMER_HEALTH], Customer Profile Attributes.[High AES], Customer Profile Attributes.[High ICP or UCP or AES Accounts], Customer Profile Attributes.[High UCP and ICP], Customer Profile Attributes.[High UCP or ICP], Dim_Parameter_Accounts.[Level 1], Dim_Parameter_Accounts.[Level 2], Opportunity.[OCC_No Business Driver], Pipeline.[OCC_Deal in month 3], Pipeline.[OCC_Deals with 5+ Hygiene Flag], Pipeline.[OCC_No IPOV in S5+], Pipeline.[OCC_No Mgr Review (+250k deals)], Pipeline.[OCC_No Mutual Plan in S5+], Pipeline.[OCC_No Partner Attach (+100k)], Pipeline.[OCC_No Power aligned in S5+], Pipeline.[OCC_Not Progressed in 30D], Pipeline.[OCC_Not Progressed in 60D], Pipeline.[OCC_Opp Age >365d], Pipeline.[OCC_Stage Duration > 120D], Prediction List Metrics Accounts.[Parameter], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[REP_NAME], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Reporting Hierarchy.[REPORTING_HIERARCHY], Role Coverage.[ROLE_COVERAGE_BU], Role Coverage.[ROLE_COVERAGE_BU_GROUP], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME], SolutionGrp_ParentRevBand.[Value4], TPT Metadata.[CLEANED_PARENT_TIER], TPT Metadata.[CLEANED_SUB_TIER], TPT Metadata.[PREDICTION_TYPE], TPT Metadata.[Parent No Pipe], TPT Metadata.[Sub No Pipe], Whitespace List Metrics Accounts.[Parameter]

**Accounts Health Mgr** (186 visuals)

- KPIs: [Acc Red & Yellow %_Ac_H_L3], [Accnt Movement Down], [Accnt Movement Up], [Accnts CQ ARRAVG Health], [Accnts CQ ARRAVG], [Account Red & Yellow #_Acc_H], [CQ Acc ARR Green], [CQ Acc ARR Red], [CQ Acc ARR Yellow], [CQ Sol ARR Green], [CQ Sol ARR Red], [CQ Sol ARR Yellow], [Child Accounts], [Compliant_Acc_Green#], [Compliant_Acc_Red#], [Compliant_Acc_Yellow#], [Compliant_Sol_Green#], [Compliant_Sol_Red#], [Compliant_Sol_Yellow#], [FP Risk CQ], [FP Upside Savables CQ], [Green #_Ac_H], [Last Refresh], [Non_Compliant_Acc_Green #], [Non_Compliant_Acc_Red #], [Non_Compliant_Acc_Yellow #], [Non_Compliant_Sol_Green #], [Non_Compliant_Sol_Red #], [Non_Compliant_Sol_Yellow #], [OPPTY $], [PIPE $], [R4Q Attrition $], [R4Q RBOB w/o PQ Trail], [Red #_Ac_H], [Sol Movement Down], [Sol Movement Up], [Solution Counts], [Solution Green Count], [Solution Red & Yellow %], [Solution Red Count], [Solution Yellow Count], [Yellow #_Ac_H], [param_measure_AccountsHealth]
- Slicers: Account List Health.[Parameter], Account Parent.[PRNT_NAME], Account Sub.[SUB_NAME], Customer Health.[CUSTOMER_HEALTH], Customer Solution Health.[CUSTOMER_SOLUTION_HEALTH], Dim_Parameter_AccountHealth.[Level 1], Dim_Parameter_AccountHealth.[Level 2], Opportunity.[OCC_No Business Driver], Pipeline.[OCC_Deal in month 3], Pipeline.[OCC_Deals with 5+ Hygiene Flag], Pipeline.[OCC_No IPOV in S5+], Pipeline.[OCC_No Mgr Review (+250k deals)], Pipeline.[OCC_No Mutual Plan in S5+], Pipeline.[OCC_No Partner Attach (+100k)], Pipeline.[OCC_No Power aligned in S5+], Pipeline.[OCC_Not Progressed in 30D], Pipeline.[OCC_Not Progressed in 60D], Pipeline.[OCC_Opp Age >365d], Pipeline.[OCC_Stage Duration > 120D], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Reporting Hierarchy.[REPORTING_HIERARCHY], Retention MetaData.[RENEWAL_TYPE], Role Coverage.[ROLE_COVERAGE_BU], Role Coverage.[ROLE_COVERAGE_BU_GROUP], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME], TPT Metadata.[CLEANED_PARENT_TIER], TPT Metadata.[CLEANED_SUB_TIER], TPT Metadata.[Parent No Pipe], TPT Metadata.[Sub No Pipe], Whitespace List Metrics Accounts.[Parameter]

**Accounts Health AE** (186 visuals)

- KPIs: [Acc Red & Yellow %_Ac_H_L3], [Accnt Movement Down], [Accnt Movement Up], [Accnts CQ ARRAVG Health], [Accnts CQ ARRAVG], [Account Red & Yellow #_Acc_H], [CQ Acc ARR Green], [CQ Acc ARR Red], [CQ Acc ARR Yellow], [CQ Sol ARR Green], [CQ Sol ARR Red], [CQ Sol ARR Yellow], [Child Accounts], [Compliant_Acc_Green#], [Compliant_Acc_Red#], [Compliant_Acc_Yellow#], [Compliant_Sol_Green#], [Compliant_Sol_Red#], [Compliant_Sol_Yellow#], [FP Risk CQ], [FP Upside Savables CQ], [Green #_Ac_H], [Last Refresh], [Non_Compliant_Acc_Green #], [Non_Compliant_Acc_Red #], [Non_Compliant_Acc_Yellow #], [Non_Compliant_Sol_Green #], [Non_Compliant_Sol_Red #], [Non_Compliant_Sol_Yellow #], [OPPTY $], [PIPE $], [R4Q Attrition $], [R4Q RBOB w/o PQ Trail], [Red #_Ac_H], [Sol Movement Down], [Sol Movement Up], [Solution Counts], [Solution Green Count], [Solution Red & Yellow %], [Solution Red Count], [Solution Yellow Count], [Yellow #_Ac_H], [param_measure_AccountsHealth]
- Slicers: Account List Health.[Parameter], Account Parent.[PRNT_NAME], Account Sub.[SUB_NAME], Customer Health.[CUSTOMER_HEALTH], Customer Solution Health.[CUSTOMER_SOLUTION_HEALTH], Dim_Parameter_AccountHealth.[Level 1], Dim_Parameter_AccountHealth.[Level 2], Opportunity.[OCC_No Business Driver], Pipeline.[OCC_Deal in month 3], Pipeline.[OCC_Deals with 5+ Hygiene Flag], Pipeline.[OCC_No IPOV in S5+], Pipeline.[OCC_No Mgr Review (+250k deals)], Pipeline.[OCC_No Mutual Plan in S5+], Pipeline.[OCC_No Partner Attach (+100k)], Pipeline.[OCC_No Power aligned in S5+], Pipeline.[OCC_Not Progressed in 30D], Pipeline.[OCC_Not Progressed in 60D], Pipeline.[OCC_Opp Age >365d], Pipeline.[OCC_Stage Duration > 120D], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[REP_NAME], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Reporting Hierarchy.[REPORTING_HIERARCHY], Retention MetaData.[RENEWAL_TYPE], Role Coverage.[ROLE_COVERAGE_BU], Role Coverage.[ROLE_COVERAGE_BU_GROUP], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME], TPT Metadata.[CLEANED_PARENT_TIER], TPT Metadata.[CLEANED_SUB_TIER], TPT Metadata.[Parent No Pipe], TPT Metadata.[Sub No Pipe], Whitespace List Metrics Accounts.[Parameter]

**Perf L3_Rep_View** (48 visuals)

- KPIs: [Last Refresh], [OCC_Rep Performance Measure L3], [Quarter_Callout]
- Slicers: Region Hierarchy.[REP_NAME], Rep Performance Table L3.[KPI Group], Rep Performance Table L3.[KPI Name], Reporting Hierarchy.[REPORTING_HIERARCHY], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME]

**ARRAVG L3** (154 visuals)

- KPIs: [Accnts CQ ARRAVG], [CQ ARRAVG SubId], [CQ RBOB w/o PQ Trail], [Fit Score], [Last Refresh], [OPP TARGET NO PIPE $], [OPPTY $], [PIPE $], [ParentID Count], [Pipe by Soln Grp Or Rev band title], [R4Q RBOB w/o PQ Trail], [RBOB w/o PQ Trail], [Soln Grp Or Rev band title], [Sub_MA Count], [param_measure_Accounts]
- Slicers: Account Parent.[PRNT_NAME], Account Patch Metrics Accounts.[Parameter], Account Sub.[High Credit Risk Account], Account Sub.[SUB_NAME], Customer Health.[CUSTOMER_HEALTH], Customer Profile Attributes.[High AES], Customer Profile Attributes.[High ICP or UCP or AES Accounts], Customer Profile Attributes.[High UCP and ICP], Customer Profile Attributes.[High UCP or ICP], Dim_Parameter_Accounts.[Level 1], Dim_Parameter_Accounts.[Level 2], Prediction List Metrics Accounts.[Parameter], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Reporting Hierarchy.[REPORTING_HIERARCHY], Role Coverage.[ROLE_COVERAGE_BU], Role Coverage.[ROLE_COVERAGE_BU_GROUP], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME], SolutionGrp_ParentRevBand.[Value4], TPT Metadata.[CLEANED_PARENT_TIER], TPT Metadata.[CLEANED_SUB_TIER], TPT Metadata.[PREDICTION_TYPE], TPT Metadata.[Parent No Pipe], TPT Metadata.[Sub No Pipe], Whitespace List Metrics Accounts.[Parameter]

**Accounts Health L3** (185 visuals)

- KPIs: [Acc Red & Yellow %_Ac_H_L3], [Accnt Movement Down], [Accnt Movement Up], [Accnts CQ ARRAVG Health], [Accnts CQ ARRAVG], [Account Red & Yellow #_Acc_H], [CQ Acc ARR Green], [CQ Acc ARR Red], [CQ Acc ARR Yellow], [CQ Sol ARR Green], [CQ Sol ARR Red], [CQ Sol ARR Yellow], [Child Accounts], [Compliant_Acc_Green#], [Compliant_Acc_Red#], [Compliant_Acc_Yellow#], [Compliant_Sol_Green#], [Compliant_Sol_Red#], [Compliant_Sol_Yellow#], [FP Risk CQ], [FP Upside Savables CQ], [Green #_Ac_H], [Last Refresh], [Non_Compliant_Acc_Green #], [Non_Compliant_Acc_Red #], [Non_Compliant_Acc_Yellow #], [Non_Compliant_Sol_Green #], [Non_Compliant_Sol_Red #], [Non_Compliant_Sol_Yellow #], [OPPTY $], [PIPE $], [R4Q Attrition $], [R4Q RBOB w/o PQ Trail], [Red #_Ac_H], [Sol Movement Down], [Sol Movement Up], [Solution Counts], [Solution Green Count], [Solution Red & Yellow %], [Solution Red Count], [Solution Yellow Count], [Yellow #_Ac_H], [param_measure_AccountsHealth]
- Slicers: Account List Health.[Parameter], Account Parent.[PRNT_NAME], Account Sub.[SUB_NAME], Customer Health.[CUSTOMER_HEALTH], Customer Solution Health.[CUSTOMER_SOLUTION_HEALTH], Dim_Parameter_AccountHealth.[Level 1], Dim_Parameter_AccountHealth.[Level 2], Opportunity.[OCC_No Business Driver], Pipeline.[OCC_Deal in month 3], Pipeline.[OCC_Deals with 5+ Hygiene Flag], Pipeline.[OCC_No IPOV in S5+], Pipeline.[OCC_No Mgr Review (+250k deals)], Pipeline.[OCC_No Mutual Plan in S5+], Pipeline.[OCC_No Partner Attach (+100k)], Pipeline.[OCC_No Power aligned in S5+], Pipeline.[OCC_Not Progressed in 30D], Pipeline.[OCC_Not Progressed in 60D], Pipeline.[OCC_Opp Age >365d], Pipeline.[OCC_Stage Duration > 120D], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Reporting Hierarchy.[REPORTING_HIERARCHY], Retention MetaData.[RENEWAL_TYPE], Role Coverage.[ROLE_COVERAGE_BU], Role Coverage.[ROLE_COVERAGE_BU_GROUP], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME], TPT Metadata.[CLEANED_PARENT_TIER], TPT Metadata.[CLEANED_SUB_TIER], TPT Metadata.[Parent No Pipe], TPT Metadata.[Sub No Pipe], Whitespace List Metrics Accounts.[Parameter]

**GWP** (100 visuals)

- KPIs: [ATTRITION], [Accnts CQ ARRAVG], [Action_Plan_Detail], [GWP Account count Open closed], [GWP Account count closed], [GWP_Description], [Help_Needed_Ask], [Last Refresh], [OPPTY $], [Out of Compliance GWP], [Past_Efforts], [Pct R/Y Account open count], [R/Y Sol Health with Open GWP], [R/Y Sol Health], [RBOB], [Retention Acc count]
- Slicers: Account Activities Metadata.[Activity_Status_New], Account Activities Metadata.[Last_modified_Date], Close Quarter.[CLOSE_QTR], Customer Solution Health.[CUSTOMER_SOLUTION_HEALTH], Delivery Quarter.[DELIVERY_QTR], GWP Details.[Parameter], OPG.[MOPG1], OPG.[OPG], OPG.[SOLUTION_GROUP], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[REPORTING_HIERARCHY], Region Hierarchy.[SALES_LEADER], Region Hierarchy.[SALES_LEADER_2], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Reporting Hierarchy.[REPORTING_HIERARCHY], Retention.[OOC Indicator], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME], Whitespace List Metrics Accounts.[Parameter]

**Rep View** (202 visuals)

- KPIs: [AE QTD Participation], [ARRAVG SubID], [CQ Attrition OL $], [CQ Gross Creation QTD %], [CQ Pipe Gen @75% QTD %], [CQ Pipe Gen @75% YTD %], [CQ Renewal Rate Outlook], [CQ Upsell # Attach %], [CY Cov>2x %], [FLM WITH >50% AE @75% QTD %], [FP Tier 1 Sub Complete %], [Last Refresh], [Mature Pipe SS5+ (Q+1)], [OCC_Rep Performance Measure], [Q+1 Mature Covx>1.2 %], [Q+1 Pipe Covx>2.7 %], [Quarter_Callout], [Rep CY Proj Trend], [Rep CY Projection > 75%_L2], [Rep CY Trend], [Rep Gen QTD Trend], [Rep Gen YTD Trend], [Rep Mat Cov Trend], [Rep Part QTD Trend], [Rep Part YTD Trend], [Rep Participation QTD WoW_L2], [Rep Participation QTD], [Rep Participation YTD], [Rep Q+1 Trend], [Rep R4Q Trend], [Rolling 4 Qtr S3 Covx>2x %], [Rolling 4 Start %], [S3 Q+1 CovX], [S3+(F+U) LTG CovX], [S5+(F+U) LTG CovX], [Sol Green %], [W+F+UC %]
- Slicers: OCC_Parameter_ret_AE_attrition.[Parameter_ret_AE_attrition], Parameter_ARRAVG.[Parameter_ARRAVG], Parameter_Account Plan.[Parameter_Account Plan], Parameter_Coverage.[Coverage Parameter], Parameter_Creation.[Creation Parameter], Parameter_GNARR.[GNARR Parameter], Parameter_Health.[Parameter_Health Order], Parameter_OL_S3+LTG.[Parameter_OL_S3+LTG], Parameter_OL_S5+LTG.[Parameter_OL_S5+LTG], Parameter_Progresssion.[Progression Parameter], Parameter_Renwal_Retention.[Parameter_Renwal_Retention], Parameter_Rep_perf.[Parameter_Rep_perf], Parameter_Retention_Exp.[Parameter_Retention_Exp], Parameter_Team_Perf.[Parameter_Team_Perf], Parameter_my_participation.[Parameter_my_participation], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[REP_TENURE_STATUS], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Rep Performance Table.[KPI Group], Rep Performance Table.[KPI Name], Reporting Hierarchy.[REPORTING_HIERARCHY], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME]

**FLM View** (209 visuals)

- KPIs: [AE QTD Participation], [ARRAVG SubID], [CQ Attrition OL $], [CQ Gross Creation QTD %], [CQ Renewal Rate Outlook], [CQ Upsell # Attach %], [FLM CQ Pipe Gen @75% QTD %], [FLM CQ Pipe Gen @75% YTD %], [FLM CY Cov>2x %], [FLM CY Trend], [FLM Gen QTD Trend], [FLM Gen YTD Trend], [FLM Mat Cov Trend], [FLM Part QTD Trend], [FLM Part YTD Trend], [FLM Participation QTD WoW_L2], [FLM Participation YTD], [FLM Q+1 Mature Covx>1.2 %], [FLM Q+1 Pipe Covx>2.7 %], [FLM Q+1 Trend], [FLM R4Q Trend], [FLM Rolling 4 Qtr S3 Covx>2x %], [FLM Team QTD Trend], [FLM Team YTD Trend], [FLM WITH >50% AE @75% QTD % WoW_L2], [FLM WITH >50% AE @75% QTD %], [FLM WITH >50% AE @75% YTD WoW %], [FP Tier 1 Sub Complete %], [Last Refresh], [Mature Pipe SS5+ (Q+1)], [OCC_FLM Performance Measure], [Quarter_Callout], [Rep Participation QTD], [S3 Q+1 CovX], [S3+(F+U) LTG CovX], [S5+(F+U) LTG CovX], [Sol Green %], [W+F+UC %]
- Slicers: FLM Performance Table.[KPI Group], FLM Performance Table.[KPI Name], OCC_Parameter_ret_AE_attrition.[Parameter_ret_AE_attrition], Parameter_ARRAVG.[Parameter_ARRAVG], Parameter_Account Plan.[Parameter_Account Plan], Parameter_Coverage.[Coverage Parameter], Parameter_Creation.[Creation Parameter], Parameter_GNARR.[GNARR Parameter], Parameter_Health.[Parameter_Health Order], Parameter_OL_S3+LTG.[Parameter_OL_S3+LTG], Parameter_OL_S5+LTG.[Parameter_OL_S5+LTG], Parameter_Progresssion.[Progression Parameter], Parameter_Renwal_Retention.[Parameter_Renwal_Retention], Parameter_Rep_perf.[Parameter_Rep_perf], Parameter_Retention_Exp.[Parameter_Retention_Exp], Parameter_Team_Perf.[Parameter_Team_Perf], Parameter_my_participation.[Parameter_my_participation], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Reporting Hierarchy.[REPORTING_HIERARCHY], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME]

**Rep Perf L3** (107 visuals)

- KPIs: [% Weekly Rep participation QTD], [% Weekly Rep participation YTD], [FLM COUNT], [FP AE Total], [FP AE in seat], [Last Refresh], [OCC_Rep Performance Measure L3], [Quarter_Callout], [Rep Participation QTD Comp_L3], [Rep Participation QTD], [Rep Participation YTD Comp_L3], [Rep Participation YTD]
- Slicers: OCC_Performance Cohort_Band.[Attainment Band], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[REP_IN_PLACE], Region Hierarchy.[REP_TENURE_STATUS], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Rep Performance Table L3.[KPI Group], Rep Performance Table L3.[KPI Name], Reporting Hierarchy.[REPORTING_HIERARCHY], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME]

**FLM Perf L3** (110 visuals)

- KPIs: [% Weekly FLM participation QTD], [% Weekly FLM participation YTD], [FLM COUNT], [FLM Participation QTD Comp_L3], [FLM Participation QTD], [FLM Participation YTD Comp_L3], [FLM Participation YTD], [FP AE Total], [FP AE in seat], [Last Refresh], [OCC_FLM Performance Measure L3], [Quarter_Callout]
- Slicers: FLM Performance Table L3.[KPI Group], FLM Performance Table L3.[KPI Name], OCC_Performance Cohort FLM_Band.[Attainment Band], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Reporting Hierarchy.[REPORTING_HIERARCHY], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME]

**Outlook L2** (136 visuals)

- KPIs: [ARR Attrition Plan], [ARR Impact_OCC], [ARRAVG SubID], [Attrition Attn], [BOOKINGS TARGET], [CQ Attrition %], [CQ Gross Creation QTD %], [CQ Net% Plan], [CQ Renewal Rate Outlook], [CQ Upsell # Attach %], [FLM Participation QTD], [FLM WITH >50% AE @75% QTD %], [FP Tier 1 Sub Complete %], [Gap to Plan OL $], [L2_Net ARR], [Last Refresh], [Mature Pipe SS5+ (Q+1)], [Net ARR Attn], [Net ARR Plan], [Rep Participation QTD], [S3 Q+1 CovX], [Sol Green %], [W+F+UC $ OL], [W+F+UC % OL], [W+F+UC %], [YoY GNARR %], [_Separater]
- Slicers: Close Quarter.[CLOSE_QTR], OPG.[DMX_SOLUTION], OPG.[DMX_SOLUTION_GROUP], OPG.[OPG], OPG.[PRODUCT], OPG.[SOLUTION], OPG.[STRATEGIC_SOLUTION], Parameter_ARRAVG.[Parameter_ARRAVG], Parameter_Account Plan.[Parameter_Account Plan], Parameter_Attrition.[Parameter_Attrition], Parameter_Coverage.[Coverage Parameter], Parameter_Creation.[Creation Parameter], Parameter_FLM_Perf.[Parameter_FLM_Perf], Parameter_GNARR.[GNARR Parameter], Parameter_Health.[Parameter_Health Order], Parameter_Net%.[Parameter_Net%], Parameter_Progresssion.[Progression Parameter], Parameter_Renwal_Retention.[Parameter_Renwal_Retention], Parameter_Rep_perf.[Parameter_Rep_perf], Parameter_Retention_Exp.[Parameter_Retention_Exp], Parameter_Team_Perf.[Parameter_Team_Perf], Parameter_ret_attrition.[Parameter_ret_attrition], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[REPORTING_HIERARCHY], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Reporting Hierarchy.[REPORTING_HIERARCHY], Role Coverage.[ROLE_COVERAGE_BU], Role Coverage.[ROLE_COVERAGE_BU_GROUP], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME]

**Outlook L3** (182 visuals)

- KPIs: [ABS WALK VALUE], [Accounts Count], [BOOKINGS TARGET], [CJ status], [CQ DRM Fct_UC $], [DRF status], [Deal type OL], [FORECAST $], [GNARR $ OL], [Gap to Plan OL $], [Geo Adj Commit_M], [Inactive/Active], [LINEARITY GAP $], [LINEARITY TARGET $], [Last Refresh], [NET CHANGE $], [OCC_Deal Count], [Opp Age], [PIPE $], [PUSHED OUT $], [Products OL], [Result_OL], [STAGE PROGRESSION ASV], [Stage Duration], [Stalled & Inactive %], [TARGET LEFT TO GO $], [UPSIDE $], [UPSIDE COMMITTED $], [UPSIDE TARGETED $], [Upside + Upside Target], [W+F+UC $ OL], [W+F+UC % OL], [WON $ TREND], [WON $], [Weekly Target], [Won $ OL], [YoY_arrow_WFCU]
- Slicers: Account Sub.[High Credit Risk Account], Close Quarter.[CLOSE_QTR], Customer Solution Health.[CUSTOMER_SOLUTION_HEALTH], Daily Weekly Switch.[Frequency], Dim_Param_L3_Outlook.[Level1], Dim_Param_L3_Outlook.[Level2], OPG.[DMX_SOLUTION], OPG.[DMX_SOLUTION_GROUP], OPG.[OPG], OPG.[PRODUCT], OPG.[SOLUTION], Opportunity.[Missing BANT], Opportunity.[OCC_Deal Not Reviewed], Opportunity.[OCC_Deal Reviewed < 30 Days], Opportunity.[OCC_Deal Reviewed < 7 Days], Opportunity.[OCC_Deal Reviewed], Opportunity.[OCC_No Business Driver], Parameter_CJ.[CJ], Parameter_Cov_AccList.[Parameter_Cov_AccList], Parameter_Cov_DealList.[Parameter_Cov_DealList], Parameter_DRF_Status.[DRF], Pipeline.[GEO_ADJ_COMMIT], Pipeline.[OCC_Deal in month 3], Pipeline.[OCC_Deals with 5+ Hygiene Flag], Pipeline.[OCC_No IPOV in S5+], Pipeline.[OCC_No Mgr Review (+250k deals)], Pipeline.[OCC_No Mutual Plan in S5+], Pipeline.[OCC_No Partner Attach (+100k)], Pipeline.[OCC_No Power aligned in S5+], Pipeline.[OCC_Not Progressed in 30D], Pipeline.[OCC_Not Progressed in 60D], Pipeline.[OCC_Opp Age >365d], Pipeline.[OCC_Stage Duration > 120D], Pipeline.[STALLED_BUT_INACTIVE], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Reporting Hierarchy.[REPORTING_HIERARCHY], Role Coverage.[ROLE_COVERAGE_BU], Role Coverage.[ROLE_COVERAGE_BU_GROUP], Sales Stage.[SALES_STAGE_GROUP], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME]

**Outlook L3 Mgr** (182 visuals)

- KPIs: [ABS WALK VALUE], [Accounts Count], [BOOKINGS TARGET], [CJ status], [CQ DRM Fct_UC $], [DRF status], [Deal type OL], [FORECAST $], [GNARR $ OL], [Gap to Plan OL $], [Inactive/Active], [LINEARITY GAP $], [LINEARITY TARGET $], [Last Refresh], [Mgr Adj Commit_M], [NET CHANGE $], [OCC_Deal Count], [Opp Age], [PIPE $], [PUSHED OUT $], [Products OL], [Products], [Result_OL], [STAGE PROGRESSION ASV], [Stage Duration], [Stalled & Inactive %], [TARGET LEFT TO GO $], [UPSIDE $], [UPSIDE COMMITTED $], [UPSIDE TARGETED $], [Upside + Upside Target], [W+F+UC $ OL], [W+F+UC % OL], [WON $ TREND], [WON $], [Won $ OL]
- Slicers: Account Sub.[High Credit Risk Account], Close Quarter.[CLOSE_QTR], Customer Solution Health.[CUSTOMER_SOLUTION_HEALTH], Daily Weekly Switch.[Frequency], Dim_Param_L3_Outlook.[Level1], Dim_Param_L3_Outlook.[Level2], OPG.[DMX_SOLUTION], OPG.[DMX_SOLUTION_GROUP], OPG.[OPG], OPG.[PRODUCT], OPG.[SOLUTION], Opportunity.[Missing BANT], Opportunity.[OCC_Deal Not Reviewed], Opportunity.[OCC_Deal Reviewed < 30 Days], Opportunity.[OCC_Deal Reviewed < 7 Days], Opportunity.[OCC_Deal Reviewed], Opportunity.[OCC_No Business Driver], Parameter_CJ.[CJ], Parameter_Cov_AccList.[Parameter_Cov_AccList], Parameter_Cov_DealList.[Parameter_Cov_DealList], Parameter_DRF_Status.[DRF], Pipeline.[MGR_ADJ_COMMIT], Pipeline.[OCC_Deal in month 3], Pipeline.[OCC_Deals with 5+ Hygiene Flag], Pipeline.[OCC_No IPOV in S5+], Pipeline.[OCC_No Mgr Review (+250k deals)], Pipeline.[OCC_No Mutual Plan in S5+], Pipeline.[OCC_No Partner Attach (+100k)], Pipeline.[OCC_No Power aligned in S5+], Pipeline.[OCC_Not Progressed in 30D], Pipeline.[OCC_Not Progressed in 60D], Pipeline.[OCC_Opp Age >365d], Pipeline.[OCC_Stage Duration > 120D], Pipeline.[STALLED_BUT_INACTIVE], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Reporting Hierarchy.[REPORTING_HIERARCHY], Role Coverage.[ROLE_COVERAGE_BU], Role Coverage.[ROLE_COVERAGE_BU_GROUP], Sales Stage.[SALES_STAGE_GROUP], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME]

**Outlook L3 AE** (184 visuals)

- KPIs: [ABS WALK VALUE], [Accounts Count], [Adj Commit_M], [BOOKINGS TARGET], [CJ status], [CQ DRM Fct_UC $], [DRF status], [Deal type OL], [FORECAST $], [GNARR $ OL], [Gap to Plan OL $], [Inactive/Active], [LINEARITY GAP $], [LINEARITY TARGET $], [Last Refresh], [NET CHANGE $], [OCC_Deal Count], [Opp Age], [PIPE $], [PUSHED OUT $], [Products OL], [Result_OL], [STAGE PROGRESSION ASV], [Stage Duration], [Stalled & Inactive %], [TARGET LEFT TO GO $], [UPSIDE $], [UPSIDE COMMITTED $], [UPSIDE TARGETED $], [Upside + Upside Target], [W+F+UC $ OL], [W+F+UC % OL], [WON $ TREND], [WON $], [Won $ OL]
- Slicers: Account Sub.[High Credit Risk Account], Close Quarter.[CLOSE_QTR], Customer Solution Health.[CUSTOMER_SOLUTION_HEALTH], Daily Weekly Switch.[Frequency], Dim_Param_L3_Outlook.[Level1], Dim_Param_L3_Outlook.[Level2], OPG.[DMX_SOLUTION], OPG.[DMX_SOLUTION_GROUP], OPG.[OPG], OPG.[PRODUCT], OPG.[SOLUTION], Opportunity.[Missing BANT], Opportunity.[OCC_Deal Not Reviewed], Opportunity.[OCC_Deal Reviewed < 30 Days], Opportunity.[OCC_Deal Reviewed < 7 Days], Opportunity.[OCC_Deal Reviewed], Opportunity.[OCC_No Business Driver], Parameter_CJ.[CJ], Parameter_Cov_AccList.[Parameter_Cov_AccList], Parameter_Cov_DealList.[Parameter_Cov_DealList], Parameter_DRF_Status.[DRF], Pipeline.[ADJ_COMMITMENT], Pipeline.[OCC_Deal in month 3], Pipeline.[OCC_Deals with 5+ Hygiene Flag], Pipeline.[OCC_No IPOV in S5+], Pipeline.[OCC_No Mgr Review (+250k deals)], Pipeline.[OCC_No Mutual Plan in S5+], Pipeline.[OCC_No Partner Attach (+100k)], Pipeline.[OCC_No Power aligned in S5+], Pipeline.[OCC_Not Progressed in 30D], Pipeline.[OCC_Not Progressed in 60D], Pipeline.[OCC_Opp Age >365d], Pipeline.[OCC_Stage Duration > 120D], Pipeline.[STALLED_BUT_INACTIVE], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[REP_NAME], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Reporting Hierarchy.[REPORTING_HIERARCHY], Role Coverage.[ROLE_COVERAGE_BU], Role Coverage.[ROLE_COVERAGE_BU_GROUP], Sales Stage.[SALES_STAGE_GROUP], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME]

**Sub Acc On A Page** (136 visuals)

- KPIs: [APCompletionStatus], [ARR $], [ARR IMPACT], [ARR Non Zero DOAP], [ARRAVG QoQ], [ARRAVG SubID], [ASV $], [AccountEngagementStageStatus], [AccountTenureStatus], [CSMCoverageStatus], [CustomerHealthStatus], [Diff MOPG ARR], [Last Refresh], [MajorMinorSegmentStatus], [OPPTY $], [Outlook DME], [PIPE $], [PaidSupportStatus], [Prediction], [Propensity], [RBOB ATTAINMENT %], [RBOB], [RENEWAL #], [RISK UPSIDE AMOUNT $], [Renewal qtr], [UltimateSupportStatus], [W+F+UC PIPE YTD $], [_Separater]

**Acc On A Page** (130 visuals)

- KPIs: [ARR IMPACT], [ARR Non Zero DOAP], [ARRAVG QoQ], [ARRAVG SubID], [ASV $], [Diff MOPG ARR], [Last Refresh], [OPPTY $], [Outlook DME], [PIPE $], [PaidSupportStatus], [Prediction], [Propensity], [RBOB ATTAINMENT %], [RBOB], [RENEWAL #], [RISK UPSIDE AMOUNT $], [Renewal qtr], [UltimateSupportStatus], [W+F+UC PIPE YTD $], [_Separater]

**Parent Acc On A Page** (125 visuals)

- KPIs: [APCompletionStatus], [ARR $], [ARR IMPACT], [ARR Non Zero DOAP], [ARRAVG QoQ], [ARRAVG SubID], [AccountTenureStatus], [Diff MOPG ARR], [Last Refresh], [MajorMinorSegmentStatus], [OPPTY $], [Outlook DME], [PIPE $], [Prediction], [Propensity], [RBOB ATTAINMENT %], [RBOB], [RENEWAL #], [RISK UPSIDE AMOUNT $], [Renewal qtr], [W+F+UC PIPE YTD $], [_Separater]

**Deal On A Page** (246 visuals)

- KPIs: [ARR Non Zero DOAP], [ASV $], [Concatenated_Explanation_With-Question], [Deal_Sensei_Score], [Last Refresh], [OPPTY $], [Score/Max_Point], [Score/max_Point-%age]

**Retention L3** (172 visuals)

- KPIs: [# Green], [# Red], [# Yellow], [ARR IMPACT], [Additional Risks], [Analyse_Renewal Rate], [Analyze Upsell Attach Rate% Ret], [CQ Upsell $ Attach Rate], [CQ YoY RR%], [CQ attrition], [CQ+1 Upsell $ Attach Rate], [CQ+1_Attrition], [CQ+1_Gap to Plan], [CQ+1_RBOB], [CQ+1_Renewal Rate], [CQ+2 Upsell $ Attach Rate], [CQ+2_Attrition], [CQ+2_Gap to Plan], [CQ+2_RBOB], [CQ+2_Renewal Rate], [CQ+3 Upsell $ Attach Rate], [CQ+3_Attrition], [CQ+3_Gap to Plan], [CQ+3_RBOB], [CQ+3_Renewal Rate], [CQ_Best Case], [CQ_Gap to Plan], [CQ_RBOB], [CQ_Renewal Rate], [CQ_Worst Case], [Downsell Deal #], [FY Upsell $ Attach_RetL3], [FY_Attrition], [FY_Best Case], [FY_Gap to Plan], [FY_RBOB], [FY_Renewal Rate], [FY_Worst Case], [Full Attrition Deal #], [Green health renewing flat], [LTG OVERDUE], [LTG with Low Consumption], [LTG with R/Y Soln Health], [Last Refresh], [ON TIME RENEWAL #], [Products_Ret], [RBOB ATTAINMENT % _L3], [RBOB w/o PQ Trail], [RBOB], [RBOB_SolHealth], [RENEWAL #], [RENEWALS ATTRITION $], [Renewal Attrition Plan], [Retention Accounts Count], [Savables], [YoY RR%], [YoY_arrow]
- Slicers: Close Quarter.[CLOSE_QTR], Coming Soon Consumption_GWP.[Consumption GWP], Coming Soon Top10.[Top 10], Customer Solution Health.[CUSTOMER_SOLUTION_HEALTH], OCC_Parameter_Retention_AccList.[Parameter_Retention_AccList], OCC_Parameter_Retention_DealList.[Parameter_Retention_DealList], OPG.[DMX_SOLUTION], OPG.[DMX_SOLUTION_GROUP], OPG.[OPG], OPG.[PRODUCT], OPG.[SOLUTION], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Reporting Hierarchy.[REPORTING_HIERARCHY], Retention MetaData.[OCC_Close in <30 Days], Retention MetaData.[OCC_Closed], Retention MetaData.[OCC_IC], Retention MetaData.[OCC_LTG], Retention MetaData.[OCC_OOC], Retention MetaData.[OCC_Past Due], Retention MetaData.[OCC_Trailing], Retention MetaData.[RENEWAL_TYPE], Retention.[Is On Time Renewal], Role Coverage.[ROLE_COVERAGE_BU], Role Coverage.[ROLE_COVERAGE_BU_GROUP], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME]

**Retention Mgr** (162 visuals)

- KPIs: [# Green], [# Red], [# Yellow], [ARR IMPACT], [Additional Risks], [Analyse_Renewal Rate], [Analyze Upsell Attach Rate% Ret], [CQ Upsell $ Attach Rate], [CQ+1 Upsell $ Attach Rate], [CQ+1_Attrition], [CQ+1_RBOB], [CQ+1_Renewal Rate], [CQ+2 Upsell $ Attach Rate], [CQ+2_Attrition], [CQ+2_RBOB], [CQ+2_Renewal Rate], [CQ+3 Upsell $ Attach Rate], [CQ+3_Attrition], [CQ+3_RBOB], [CQ+3_Renewal Rate], [CQ_Attrition], [CQ_Best Case], [CQ_RBOB], [CQ_Renewal Rate], [CQ_Worst Case], [Downsell Deal #], [FY Upsell $ Attach_RetL3], [FY_Attrition], [FY_Best Case], [FY_RBOB], [FY_Renewal Rate], [FY_Worst Case], [Full Attrition Deal #], [Green health renewing flat], [LTG OVERDUE], [LTG with R/Y Soln Health], [Last Refresh], [ON TIME RENEWAL #], [Products_Ret], [RBOB ATTAINMENT % _L3], [RBOB w/o PQ Trail], [RBOB], [RBOB_SolHealth], [RENEWAL #], [Retention Accounts Count], [Savables]
- Slicers: Close Quarter.[CLOSE_QTR], Coming Soon Consumption_GWP.[Consumption GWP], Coming Soon Top10.[Top 10], Customer Solution Health.[CUSTOMER_SOLUTION_HEALTH], OCC_Parameter_Retention_AccList.[Parameter_Retention_AccList], OCC_Parameter_Retention_DealList.[Parameter_Retention_DealList], OPG.[DMX_SOLUTION], OPG.[DMX_SOLUTION_GROUP], OPG.[OPG], OPG.[PRODUCT], OPG.[SOLUTION], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Retention MetaData.[OCC_Close in <30 Days], Retention MetaData.[OCC_Closed], Retention MetaData.[OCC_IC], Retention MetaData.[OCC_LTG], Retention MetaData.[OCC_OOC], Retention MetaData.[OCC_Past Due], Retention MetaData.[OCC_Trailing], Retention MetaData.[RENEWAL_TYPE], Retention.[Is On Time Renewal], Role Coverage.[ROLE_COVERAGE_BU], Role Coverage.[ROLE_COVERAGE_BU_GROUP], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME]

**Retention AE** (163 visuals)

- KPIs: [# Green], [# Red], [# Yellow], [ARR IMPACT], [Additional Risks], [Analyse_Renewal Rate], [Analyze Upsell Attach Rate% Ret], [CQ Upsell $ Attach Rate], [CQ+1 Upsell $ Attach Rate], [CQ+1_Attrition], [CQ+1_RBOB], [CQ+1_Renewal Rate], [CQ+2 Upsell $ Attach Rate], [CQ+2_Attrition], [CQ+2_RBOB], [CQ+2_Renewal Rate], [CQ+3 Upsell $ Attach Rate], [CQ+3_Attrition], [CQ+3_RBOB], [CQ+3_Renewal Rate], [CQ_Attrition], [CQ_Best Case], [CQ_RBOB], [CQ_Renewal Rate], [CQ_Worst Case], [Downsell Deal #], [FY Upsell $ Attach_RetL3], [FY_Attrition], [FY_Best Case], [FY_RBOB], [FY_Renewal Rate], [FY_Worst Case], [Full Attrition Deal #], [Green health renewing flat], [LTG OVERDUE], [LTG with R/Y Soln Health], [Last Refresh], [ON TIME RENEWAL #], [Products_Ret], [RBOB ATTAINMENT % _L3], [RBOB w/o PQ Trail], [RBOB], [RBOB_SolHealth], [RENEWAL #], [Retention Accounts Count], [Savables], [YoY_arrow]
- Slicers: Close Quarter.[CLOSE_QTR], Coming Soon Consumption_GWP.[Consumption GWP], Coming Soon Top10.[Top 10], Customer Solution Health.[CUSTOMER_SOLUTION_HEALTH], OCC_Parameter_Retention_AccList.[Parameter_Retention_AccList], OCC_Parameter_Retention_DealList.[Parameter_Retention_DealList], OPG.[DMX_SOLUTION], OPG.[DMX_SOLUTION_GROUP], OPG.[OPG], OPG.[PRODUCT], OPG.[SOLUTION], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[REP_NAME], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Retention MetaData.[OCC_Close in <30 Days], Retention MetaData.[OCC_Closed], Retention MetaData.[OCC_IC], Retention MetaData.[OCC_LTG], Retention MetaData.[OCC_OOC], Retention MetaData.[OCC_Past Due], Retention MetaData.[OCC_Trailing], Retention MetaData.[RENEWAL_TYPE], Retention.[Is On Time Renewal], Role Coverage.[DMX_col], Role Coverage.[ROLE_COVERAGE], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME]

**Retention - Trend** (53 visuals)

- KPIs: [ARR $], [ARR IMPACT], [Last Refresh], [RBOB ATTAINMENT % _L3], [RBOB ATTAINMENT % _OCC], [RBOB w/o PQ Trail], [RENEWAL #]
- Slicers: Close Quarter.[CLOSE_QTR], Close Quarter.[CLOSE_YR], OPG.[MOPG1], OPG.[OPG], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[REPORTING_HIERARCHY], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Reporting Hierarchy.[REPORTING_HIERARCHY], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME]

**Linearity View** (65 visuals)

- KPIs: [DealCount], [DealCount_OPC], [Last Refresh], [RBOB w/o PQ Trail]
- Slicers: Close Quarter.[CLOSE_QTR], Region Hierarchy.[FLM], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[REP_NAME], Region Hierarchy.[SALES_LEADER], Region Hierarchy.[SALES_LEADER_2], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[SLM], Region Hierarchy.[TLM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Reporting Hierarchy.[REPORTING_HIERARCHY], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME]

**L2 Mgr** (167 visuals)

- KPIs: [AE >1.2X S5+ COV X CQ + 1 %], [AE >2X COV X CQ + 2 %], [AE >2X COV X CQ + 3 %], [AE IN SEAT %], [AE PART @75% QTD %], [AE PART @75% YTD %], [AE QTD Participation], [ARRAVG SubID], [CQ + 1 STALLED %], [CQ + 2 STALLED %], [CQ + 3 STALLED %], [CQ + N2Q S3 TO S4+ PROGRESSION %], [CQ + N2Q S3/4 TO S5+ PROGRESSION %], [CQ Attrition OL $], [CQ Gross Creation QTD %], [CQ Renewal Rate Outlook], [CQ Upsell # Attach %], [Coverage Trend WoW], [FLM PART @75% YTD %], [FLM WITH >50% AE @75% QTD %], [FLM WITH >50% AE @75% YTD %], [FP Tier 1 Parent Complete %], [FP Tier 1 Sub Complete %], [LP GROSS CREATED YTD %], [LP GROSS CREATION QTD %], [Last Refresh], [Mature Pipe SS5+ (Q+1) numeric], [Mature Pipe SS5+ (Q+1)], [Mature Pipe SS5+ (Q+2) numeric], [Mature Pipe SS5+ (Q+2)], [Mature Pipe SS5+ (Q+3) numeric], [Mature Pipe SS5+ (Q+3)], [Mature Pipe SS5+ CQ], [Mature Pipe Trend WoW], [PIPE $], [Rep Participation QTD], [S3 CQ CovX], [S3 Q+1 CovX (Numeric)], [S3 Q+1 CovX], [S3 Q+2 CovX (Numeric)], [S3 Q+2 CovX], [S3 Q+3 CovX (Numeric)], [S3 Q+3 CovX], [S3+(F+U) LTG CovX], [S5+(F+U) LTG CovX], [SS5+ $], [Sol Green %], [W+F+UC %], [_Separater]
- Slicers: Deal Band.[Deal_Band param], Deal Type.[DEAL_TYPE], OCC_Parameter_ret_AE_attrition.[Parameter_ret_AE_attrition], OPG.[STRATEGIC_SOLUTION], Parameter_ARRAVG.[Parameter_ARRAVG], Parameter_Account Plan.[Parameter_Account Plan], Parameter_Coverage.[Coverage Parameter], Parameter_Creation.[Creation Parameter], Parameter_GNARR.[GNARR Parameter], Parameter_Health.[Parameter_Health Order], Parameter_OL_S3+LTG.[Parameter_OL_S3+LTG], Parameter_OL_S5+LTG.[Parameter_OL_S5+LTG], Parameter_Progresssion.[Progression Parameter], Parameter_Renwal_Retention.[Parameter_Renwal_Retention], Parameter_Rep_perf.[Parameter_Rep_perf], Parameter_Retention_Exp.[Parameter_Retention_Exp], Parameter_Team_Perf.[Parameter_Team_Perf], Parameter_my_participation.[Parameter_my_participation], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Role Coverage.[ROLE_COVERAGE_BU], Role Coverage.[ROLE_COVERAGE_BU_GROUP]

**Creation** (144 visuals)

- KPIs: [% Weekly Gross Creation QTD], [Accnts CQ ARRAVG], [CQ RBOB w/o PQ Trail], [Deal type Concat], [FULL QUARTER GROSS CREATION], [GAP -VE GROSS CREATED VS GROSS CREATION TARGET QTD $], [GROSS CREATED QTD $], [GROSS CREATION QTD %], [GROSS CREATION QTD TREND], [GROSS CREATION QTD], [Last Refresh], [OPP TARGET NO PIPE $], [OPPTY TREND $], [PIPE $], [S1/S2_$], [S3_$], [S4_$], [SS5+_$], [param_measure_Creation]
- Slicers: Account List Metrics_Creation.[Parameter], Account Sub.[High Credit Risk Account], Close Quarter.[CLOSE_QTR], Creator Type.[CREATOR_GROUP], Creator Type.[SUB_CREATOR], Customer Profile Attributes.[High AES], Customer Profile Attributes.[High ICP or UCP or AES Accounts], Customer Profile Attributes.[High UCP and ICP], Customer Profile Attributes.[High UCP or ICP], Customer Solution Health.[CUSTOMER_SOLUTION_HEALTH], Deal List Metrics.[Parameter], Dim_Parameter_Creation.[Level 1], Dim_Parameter_Creation.[Level 2], OPG.[DMX_SOLUTION], OPG.[DMX_SOLUTION_GROUP], OPG.[OPG], OPG.[PRODUCT], OPG.[SOLUTION], Pipeline.[ADJ_COMMITMENT], Pipeline.[STALLED_BUT_INACTIVE], Qualification Quarter.[QUALIFICATION_QTR], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[Rep_gtm], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Reporting Hierarchy.[REPORTING_HIERARCHY], Role Coverage.[ROLE_COVERAGE_BU], Role Coverage.[ROLE_COVERAGE_BU_GROUP], Sales Stage.[SALES_STAGE_GROUP], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME], TPT Metadata.[CLEANED_PARENT_TIER], TPT Metadata.[CLEANED_SUB_TIER], TPT Metadata.[PREDICTION_TYPE], TPT Metadata.[Parent No Pipe], TPT Metadata.[Sub No Pipe]

**Creation Mgr** (140 visuals)

- KPIs: [% Weekly Gross Creation QTD], [Accnts CQ ARRAVG], [CQ RBOB w/o PQ Trail], [Deal type Concat], [FULL QUARTER GROSS CREATION], [GAP -VE GROSS CREATED VS GROSS CREATION TARGET QTD $], [GROSS CREATED QTD $], [GROSS CREATION QTD %], [GROSS CREATION QTD TREND], [GROSS CREATION QTD], [Last Refresh], [OPP TARGET NO PIPE $], [OPPTY TREND $], [PIPE $], [S1/S2_$], [S3_$], [S4_$], [SS5+_$], [param_measure_Creation]
- Slicers: Account List Metrics_Creation.[Parameter], Account Sub.[High Credit Risk Account], Close Quarter.[CLOSE_QTR], Creator Type.[CREATOR_GROUP], Creator Type.[SUB_CREATOR], Customer Profile Attributes.[High AES], Customer Profile Attributes.[High ICP or UCP or AES Accounts], Customer Profile Attributes.[High UCP and ICP], Customer Profile Attributes.[High UCP or ICP], Customer Solution Health.[CUSTOMER_SOLUTION_HEALTH], Deal List Metrics.[Parameter], Dim_Parameter_Creation.[Level 1], Dim_Parameter_Creation.[Level 2], OPG.[DMX_SOLUTION], OPG.[DMX_SOLUTION_GROUP], OPG.[OPG], OPG.[PRODUCT], OPG.[SOLUTION], Pipeline.[ADJ_COMMITMENT], Pipeline.[STALLED_BUT_INACTIVE], Qualification Quarter.[QUALIFICATION_QTR], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Role Coverage.[ROLE_COVERAGE_BU], Role Coverage.[ROLE_COVERAGE_BU_GROUP], Sales Stage.[SALES_STAGE_GROUP], TPT Metadata.[CLEANED_PARENT_TIER], TPT Metadata.[CLEANED_SUB_TIER], TPT Metadata.[PREDICTION_TYPE], TPT Metadata.[Parent No Pipe], TPT Metadata.[Sub No Pipe]

**Creation AE** (148 visuals)

- KPIs: [% Weekly Gross Creation QTD], [Accnts CQ ARRAVG], [CQ RBOB w/o PQ Trail], [Deal type Concat], [FULL QUARTER GROSS CREATION], [GAP -VE GROSS CREATED VS GROSS CREATION TARGET QTD $], [GROSS CREATED QTD $], [GROSS CREATION QTD %], [GROSS CREATION QTD TREND], [GROSS CREATION QTD], [Last Refresh], [OPP TARGET NO PIPE $], [OPPTY TREND $], [PIPE $], [S1/S2_$], [S3_$], [S4_$], [SS5+_$], [param_measure_Creation]
- Slicers: Account Engagement Stage.[High Marketing Engaged Accounts], Account List Metrics_Creation.[Parameter], Account Sub.[High Credit Risk Account], Close Quarter.[CLOSE_QTR], Coming Soon Account.[Account], Creator Type.[CREATOR_GROUP], Creator Type.[SUB_CREATOR], Customer Profile Attributes.[Cross-Sell Predicted], Customer Profile Attributes.[High AES], Customer Profile Attributes.[High ICP or UCP or AES Accounts], Customer Profile Attributes.[High UCP and ICP], Customer Profile Attributes.[High UCP or ICP], Customer Profile Attributes.[New Predicted], Customer Profile Attributes.[Upsell Predicted], Customer Solution Health.[CUSTOMER_SOLUTION_HEALTH], Deal List Metrics.[Parameter], Dim_Parameter_Creation.[Level 1], Dim_Parameter_Creation.[Level 2], OPG.[DMX_SOLUTION], OPG.[DMX_SOLUTION_GROUP], OPG.[OPG], OPG.[PRODUCT], OPG.[SOLUTION], Pipeline.[ADJ_COMMITMENT], Pipeline.[STALLED_BUT_INACTIVE], Qualification Quarter.[QUALIFICATION_QTR], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[REP_NAME], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Role Coverage.[ROLE_COVERAGE_BU], Role Coverage.[ROLE_COVERAGE_BU_GROUP], Sales Stage.[No Pipe], Sales Stage.[SALES_STAGE_GROUP], TPT Metadata.[CLEANED_PARENT_TIER], TPT Metadata.[CLEANED_SUB_TIER], TPT Metadata.[PREDICTION_TYPE], TPT Metadata.[Parent No Pipe], TPT Metadata.[Sub No Pipe]

**Pipeline Coverage Mgr** (180 visuals)

- KPIs: [ABS WALK VALUE], [ACTIVE & UPDATED %], [Accounts Count], [BOOKINGS TARGET], [CJ status], [DRF status], [Deal type Concat], [FORECAST $], [Last Refresh], [NET CHANGE $], [OCC_Deal Count Cov], [OCC_Opp Age], [OPPTY $], [PACING $], [PIPE $], [PIPE TARGET SS5], [PIPE TARGET], [PULLED IN $], [PUSHED OUT $], [Pipe Weekly Trend], [Products], [Result], [S5+ Pipeline Cov.], [SS5+ $], [Stalled & Inactive %], [Total Pipe Cov.], [UPSIDE $], [UPSIDE COMMITTED $], [UPSIDE TARGETED $], [W+F+UC $], [W+F+UC Stalled %], [WON $], [Weekly Change S3+ Q+1 Covx], [Weekly Change S5+ Q+1 Covx]
- Slicers: Account Sub.[High Credit Risk Account], Close Quarter.[CLOSE_QTR], Customer Solution Health.[CUSTOMER_SOLUTION_HEALTH], Dim_Param_L3_Coverage.[Level1], Dim_Param_L3_Coverage.[Level2], OPG.[DMX_SOLUTION], OPG.[DMX_SOLUTION_GROUP], OPG.[OPG], OPG.[PRODUCT], OPG.[SOLUTION], Opportunity.[Missing BANT], Opportunity.[OCC_Deal Not Reviewed], Opportunity.[OCC_Deal Reviewed < 30 Days], Opportunity.[OCC_Deal Reviewed < 7 Days], Opportunity.[OCC_Deal Reviewed], Opportunity.[OCC_No Business Driver], Parameter_CJ.[CJ], Parameter_Cov_AccList.[Parameter_Cov_AccList], Parameter_Cov_DealList.[Parameter_Cov_DealList], Parameter_DRF_Status.[DRF], Pipeline Health Param.[Parameter], Pipeline.[MGR_ADJ_COMMIT], Pipeline.[OCC_Deal in month 3], Pipeline.[OCC_Deals with 5+ Hygiene Flag], Pipeline.[OCC_No IPOV in S5+], Pipeline.[OCC_No Mgr Review (+250k deals)], Pipeline.[OCC_No Mutual Plan in S5+], Pipeline.[OCC_No Partner Attach (+100k)], Pipeline.[OCC_No Power aligned in S5+], Pipeline.[OCC_Not Progressed in 30D], Pipeline.[OCC_Not Progressed in 60D], Pipeline.[OCC_Opp Age >365d], Pipeline.[OCC_Stage Duration > 120D], Pipeline.[STALLED_BUT_INACTIVE], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Role Coverage.[ROLE_COVERAGE_BU], Role Coverage.[ROLE_COVERAGE_BU_GROUP], Sales Stage.[SALES_STAGE_GROUP], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME]

**Pipeline Coverage AE** (184 visuals)

- KPIs: [ABS WALK VALUE], [ACTIVE & UPDATED %], [Accounts Count], [BOOKINGS TARGET], [CJ status], [DRF status], [Deal type Concat], [FORECAST $], [Last Refresh], [NET CHANGE $], [OCC_Deal Count Cov], [OCC_Opp Age], [OPPTY $], [PACING $], [PIPE $], [PIPE TARGET SS5], [PIPE TARGET], [PULLED IN $], [PUSHED OUT $], [Pipe Weekly Trend], [Products], [Result], [S5+ Pipeline Cov.], [SS5+ $], [Stalled & Inactive %], [Total Pipe Cov.], [UPSIDE $], [UPSIDE COMMITTED $], [UPSIDE TARGETED $], [W+F+UC $], [W+F+UC Stalled %], [WON $], [Weekly Change S3+ Q+1 Covx], [Weekly Change S5+ Q+1 Covx]
- Slicers: Account Sub.[High Credit Risk Account], Close Quarter.[CLOSE_QTR], Customer Solution Health.[CUSTOMER_SOLUTION_HEALTH], Dim_Param_L3_Coverage.[Level1], Dim_Param_L3_Coverage.[Level2], OPG.[DMX_SOLUTION], OPG.[DMX_SOLUTION_GROUP], OPG.[OPG], OPG.[PRODUCT], OPG.[SOLUTION], Opportunity.[Missing BANT], Opportunity.[OCC_Deal Not Reviewed], Opportunity.[OCC_Deal Reviewed < 30 Days], Opportunity.[OCC_Deal Reviewed < 7 Days], Opportunity.[OCC_Deal Reviewed], Opportunity.[OCC_No Business Driver], Parameter_CJ.[CJ], Parameter_Cov_AccList.[Parameter_Cov_AccList], Parameter_Cov_DealList.[Parameter_Cov_DealList], Parameter_DRF_Status.[DRF], Pipeline Health Param.[Parameter], Pipeline.[ADJ_COMMITMENT], Pipeline.[OCC_Deal in month 3], Pipeline.[OCC_Deals with 5+ Hygiene Flag], Pipeline.[OCC_No IPOV in S5+], Pipeline.[OCC_No Mgr Review (+250k deals)], Pipeline.[OCC_No Mutual Plan in S5+], Pipeline.[OCC_No Partner Attach (+100k)], Pipeline.[OCC_No Power aligned in S5+], Pipeline.[OCC_Not Progressed in 30D], Pipeline.[OCC_Not Progressed in 60D], Pipeline.[OCC_Opp Age >365d], Pipeline.[OCC_Stage Duration > 120D], Pipeline.[STALLED_BUT_INACTIVE], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[REP_NAME], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Role Coverage.[ROLE_COVERAGE_BU], Role Coverage.[ROLE_COVERAGE_BU_GROUP], Sales Stage.[SALES_STAGE_GROUP], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME]

**One Command Center** (240 visuals)

- KPIs: [ARRAVG QoQ], [ARRAVG SubID], [CQ Attrition %], [CQ Gross Creation QTD %], [CQ Net% Plan], [CQ Renewal Rate Outlook], [CQ Renewal Rate WoW], [CQ Upsell # Attach %], [Coverage Trend WoW], [FLM Participation QTD], [FLM WITH >50% AE @75% QTD %], [FP Tier 1 Sub Complete %], [GNARR % WoW], [Gross Creation Attainment trend], [Last Refresh], [Mature Pipe SS5+ (Q+1)], [Mature Pipe Trend WoW], [Rep Participation QTD WoW], [Rep Participation QTD], [S3 Q+1 CovX], [Sol Green %], [Sol Green ARR], [Sol PYellow %], [Sol PYellow ARR], [Sol Red %], [Sol Red ARR], [W+F+UC %], [param_measure_vp]
- Slicers: OCC_Parameter_ret_AE_attrition.[Parameter_ret_AE_attrition], Parameter_ARRAVG.[Parameter_ARRAVG], Parameter_Account Plan.[Parameter_Account Plan], Parameter_Attrition.[Parameter_Attrition], Parameter_Coverage.[Coverage Parameter], Parameter_Creation.[Creation Parameter], Parameter_FLM_Perf.[Parameter_FLM_Perf], Parameter_GNARR.[GNARR Parameter], Parameter_Health.[Parameter_Health Order], Parameter_Net%.[Parameter_Net%], Parameter_Progresssion.[Progression Parameter], Parameter_Renwal_Retention.[Parameter_Renwal_Retention], Parameter_Rep_perf.[Parameter_Rep_perf], Parameter_Retention_Exp.[Parameter_Retention_Exp], Parameter_Team_Perf.[Parameter_Team_Perf], Parameter_ret_attrition.[Parameter_ret_attrition], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Reporting Hierarchy.[REPORTING_HIERARCHY], Role Coverage.[ROLE_COVERAGE_BU], Role Coverage.[ROLE_COVERAGE_BU_GROUP], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME], Time Slicer.[Time Slicer], dim_param_vp.[Level1], dim_param_vp.[Level2]

**L2** (179 visuals)

- KPIs: [AE >1.2X S5+ COV X CQ + 1 %], [AE >2X COV X CQ + 2 %], [AE >2X COV X CQ + 3 %], [AE IN SEAT %], [AE PART @75% QTD %], [AE PART @75% YTD %], [ARRAVG SubID], [CQ + 1 STALLED %], [CQ + 2 STALLED %], [CQ + 3 STALLED %], [CQ + N2Q S3 TO S4+ PROGRESSION %], [CQ + N2Q S3/4 TO S5+ PROGRESSION %], [CQ Attrition %], [CQ Gross Creation QTD %], [CQ Net% Plan], [CQ Renewal Rate Outlook], [CQ Upsell # Attach %], [Coverage Trend WoW], [FLM PART @75% YTD %], [FLM Participation QTD], [FLM WITH >50% AE @75% QTD %], [FLM WITH >50% AE @75% YTD %], [FP Tier 1 Parent Complete %], [FP Tier 1 Sub Complete %], [LP GROSS CREATED YTD %], [LP GROSS CREATION QTD %], [Last Refresh], [Mature Pipe SS5+ (Q+1) numeric], [Mature Pipe SS5+ (Q+1)], [Mature Pipe SS5+ (Q+2) numeric], [Mature Pipe SS5+ (Q+2)], [Mature Pipe SS5+ (Q+3) numeric], [Mature Pipe SS5+ (Q+3)], [Mature Pipe SS5+ CQ], [Mature Pipe Trend WoW], [PIPE $], [Rep Participation QTD], [S3 CQ CovX], [S3 Q+1 CovX (Numeric)], [S3 Q+1 CovX], [S3 Q+2 CovX (Numeric)], [S3 Q+2 CovX], [S3 Q+3 CovX (Numeric)], [S3 Q+3 CovX], [SS5+ $], [Sol Green %], [W+F+UC %], [_Separater]
- Slicers: Deal Band.[Deal_Band param], Deal Type.[DEAL_TYPE], OPG.[STRATEGIC_SOLUTION], Parameter_ARRAVG.[Parameter_ARRAVG], Parameter_Account Plan.[Parameter_Account Plan], Parameter_Attrition.[Parameter_Attrition], Parameter_Coverage.[Coverage Parameter], Parameter_Creation.[Creation Parameter], Parameter_FLM_Perf.[Parameter_FLM_Perf], Parameter_GNARR.[GNARR Parameter], Parameter_Health.[Parameter_Health Order], Parameter_Net%.[Parameter_Net%], Parameter_Progresssion.[Progression Parameter], Parameter_Renwal_Retention.[Parameter_Renwal_Retention], Parameter_Rep_perf.[Parameter_Rep_perf], Parameter_Retention_Exp.[Parameter_Retention_Exp], Parameter_Team_Perf.[Parameter_Team_Perf], Parameter_ret_attrition.[Parameter_ret_attrition], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[REPORTING_HIERARCHY], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Reporting Hierarchy.[REPORTING_HIERARCHY], Role Coverage.[ROLE_COVERAGE_BU], Role Coverage.[ROLE_COVERAGE_BU_GROUP], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME]

**Page 1** (7 visuals)

- KPIs: [# of Deal reviews], [ARR $], [Accnts Propensity], [BOOKINGS TARGET], [PIPE $], [RBOB], [Renewal qtr], [Solution Health AOAP], [test svg]

**AE** (228 visuals)

- KPIs: [AE QTD Participation], [AE YTD Participation], [ARRAVG QoQ], [ARRAVG SubID], [Acc Green%], [Acc PYellow%], [Acc Red%], [Action Path Rep Landing], [CQ Attrition OL $], [CQ Gross Creation QTD %], [CQ Renewal Rate Outlook], [CQ Renewal Rate WoW], [CQ Upsell # Attach %], [Cohort Rep Landing], [Coverage Trend WoW], [FP Tier 1 Sub Complete %], [GNARR % WoW], [Gross Creation Attainment trend], [Last Refresh], [Mature Pipe SS5+ (Q+1)], [Mature Pipe Trend WoW], [Rep CY Projection > 75%], [Rep Participation QTD WoW], [S3 Q+1 CovX], [S3+(F+U) LTG CovX], [S5+(F+U) LTG CovX], [Sol Green ARR], [Sol PYellow ARR], [Sol Red ARR], [W+F+UC %], [blank_dummy], [param_measure_vp]
- Slicers: OCC_Parameter_ret_AE_attrition.[Parameter_ret_AE_attrition], Parameter_ARRAVG.[Parameter_ARRAVG], Parameter_Account Plan.[Parameter_Account Plan], Parameter_Coverage.[Coverage Parameter], Parameter_Creation.[Creation Parameter], Parameter_FLM_Perf.[Parameter_FLM_Perf], Parameter_GNARR.[GNARR Parameter], Parameter_Health.[Parameter_Health Order], Parameter_OL_S3+LTG.[Parameter_OL_S3+LTG], Parameter_OL_S5+LTG.[Parameter_OL_S5+LTG], Parameter_Progresssion.[Progression Parameter], Parameter_Renwal_Retention.[Parameter_Renwal_Retention], Parameter_Rep_perf.[Parameter_Rep_perf], Parameter_Retention_Exp.[Parameter_Retention_Exp], Parameter_Team_Perf.[Parameter_Team_Perf], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[REP_NAME], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Time Slicer.[Time Slicer], dim_param_vp.[Level1], dim_param_vp.[Level2]

**Manager** (223 visuals)

- KPIs: [AE QTD Participation], [ARRAVG QoQ], [ARRAVG SubID], [CQ Attrition OL $], [CQ Gross Creation QTD %], [CQ Renewal Rate Outlook], [CQ Renewal Rate WoW], [CQ Upsell # Attach %], [Coverage Trend WoW], [FLM WITH >50% AE @75% QTD %], [FP Tier 1 Sub Complete %], [GNARR % WoW], [Gross Creation Attainment trend], [Last Refresh], [Mature Pipe SS5+ (Q+1)], [Mature Pipe Trend WoW], [Rep Participation QTD WoW], [Rep Participation QTD], [S3 Q+1 CovX], [S3+(F+U) LTG CovX], [S5+(F+U) LTG CovX], [Sol Green ARR], [Sol PYellow ARR], [Sol Red ARR], [W+F+UC %], [param_measure_vp]
- Slicers: OCC_Parameter_ret_AE_attrition.[Parameter_ret_AE_attrition], Parameter_ARRAVG.[Parameter_ARRAVG], Parameter_Account Plan.[Parameter_Account Plan], Parameter_Coverage.[Coverage Parameter], Parameter_Creation.[Creation Parameter], Parameter_GNARR.[GNARR Parameter], Parameter_Health.[Parameter_Health Order], Parameter_OL_S3+LTG.[Parameter_OL_S3+LTG], Parameter_OL_S5+LTG.[Parameter_OL_S5+LTG], Parameter_Progresssion.[Progression Parameter], Parameter_Renwal_Retention.[Parameter_Renwal_Retention], Parameter_Rep_perf.[Parameter_Rep_perf], Parameter_Retention_Exp.[Parameter_Retention_Exp], Parameter_Team_Perf.[Parameter_Team_Perf], Parameter_my_participation.[Parameter_my_participation], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Time Slicer.[Time Slicer], dim_param_vp.[Level1], dim_param_vp.[Level2]

**Pipeline Coverage** (171 visuals)

- KPIs: [ABS WALK VALUE], [ACTIVE & UPDATED %], [Accounts Count], [BOOKINGS TARGET], [CJ status], [DRF status], [Deal type Concat], [FORECAST $], [Last Refresh], [NET CHANGE $], [OCC_Deal Count Cov], [OCC_Opp Age], [OPPTY $], [PACING $], [PIPE $], [PIPE TARGET SS5], [PIPE TARGET], [PULLED IN $], [PUSHED OUT $], [Pipe Weekly Trend], [Products], [Result], [S5+ Pipeline Cov.], [SS5+ $], [Stalled & Inactive %], [Total Pipe Cov.], [UPSIDE $], [UPSIDE COMMITTED $], [UPSIDE TARGETED $], [W+F+UC $], [W+F+UC Stalled %], [WON $], [Weekly Change S3+ Q+1 Covx], [Weekly Change S5+ Q+1 Covx]
- Slicers: Account Sub.[High Credit Risk Account], Close Quarter.[CLOSE_QTR], Customer Solution Health.[CUSTOMER_SOLUTION_HEALTH], Dim_Param_L3_Coverage.[Level1], Dim_Param_L3_Coverage.[Level2], OPG.[DMX_SOLUTION], OPG.[DMX_SOLUTION_GROUP], OPG.[OPG], OPG.[PRODUCT], OPG.[SOLUTION], Opportunity.[Missing BANT], Opportunity.[OCC_Deal Not Reviewed], Opportunity.[OCC_Deal Reviewed < 30 Days], Opportunity.[OCC_Deal Reviewed < 7 Days], Opportunity.[OCC_Deal Reviewed], Opportunity.[OCC_No Business Driver], Parameter_CJ.[CJ], Parameter_Cov_AccList.[Parameter_Cov_AccList], Parameter_Cov_DealList.[Parameter_Cov_DealList], Parameter_DRF_Status.[DRF], Pipeline Health Param.[Parameter], Pipeline.[GEO_ADJ_COMMIT], Pipeline.[OCC_Deal in month 3], Pipeline.[OCC_Deals with 5+ Hygiene Flag], Pipeline.[OCC_No IPOV in S5+], Pipeline.[OCC_No Mgr Review (+250k deals)], Pipeline.[OCC_No Mutual Plan in S5+], Pipeline.[OCC_No Partner Attach (+100k)], Pipeline.[OCC_No Power aligned in S5+], Pipeline.[OCC_Not Progressed in 30D], Pipeline.[OCC_Not Progressed in 60D], Pipeline.[OCC_Opp Age >365d], Pipeline.[OCC_Stage Duration > 120D], Pipeline.[STALLED_BUT_INACTIVE], Region Hierarchy.[GLOBAL_REGION], Region Hierarchy.[SALES_REGION], Region Hierarchy.[SALES_TEAM], Region Hierarchy.[VERTICAL_MARKET_SEGMENT], Reporting Hierarchy.[REPORTING_HIERARCHY], Role Coverage.[ROLE_COVERAGE_BU], Role Coverage.[ROLE_COVERAGE_BU_GROUP], Sales Stage.[SALES_STAGE_GROUP], Segment.[SEGMENT_GROUP], Segment.[SEGMENT_NAME]

---

## 2. KPI Measures — DAX Formulas with DB Annotations

Total: **1355** measures across 47 tables.
Each formula has inline `/* DB: view.column */` annotations mapping PBI references to database views.

### Measure Table Index

- **L2 Outlook Measures** (14 measures)
- **Linearity view measures** (10 measures)
- **OCC_Pipe_Cov_L3 Measures** (24 measures)
- **OCC_TPT Measures_Creation** (9 measures)
- **SLM L2 Measures** (37 measures)
- **_Account ARR Measures** (5 measures)
- **_Account Activity Measures** (2 measures)
- **_Coverage Measures** (11 measures)
- **_Enablement Measures** (4 measures)
- **_Generation Target Measures** (35 measures)
- **_Lead Measures** (4 measures)
- **_OCC Measures** (582 measures)
- **_Performance Measures** (82 measures)
- **_Pipeline Measures** (81 measures)
- **_Product Consumption** (2 measures)
- **_Retention Measures** (19 measures)
- **_Retention Target Measures** (5 measures)
- **_SBR Measures** (2 measures)
- **_TM1 Booking Measures** (1 measures)
- **_TPT Measures** (92 measures)
- **_Target Measures** (17 measures)
- **_Walk Measures** (13 measures)
- **kb_measures** (2 measures)
- **AE Region Hierarchy** (2 measures)
- **DOAP_Fields** (3 measures)
- **DRF Pillars** (8 measures)
- **Dim_Param_L3_Coverage** (4 measures)
- **Dim_Param_L3_Outlook** (2 measures)
- **Dim_Parameter_AccountHealth** (1 measures)
- **Dim_Parameter_Accounts** (1 measures)
- **Dim_Parameter_Creation** (3 measures)
- **FLM Performance Table** (2 measures)
- **FLM Performance Table L3** (4 measures)
- **Filter_Count_Measure** (20 measures)
- **GWP Measure Table** (11 measures)
- **OCC_Accounts** (10 measures)
- **OCC_AccountsHealth** (48 measures)
- **OCC_Outlook_L3** (21 measures)
- **OCC_Perf_L2** (116 measures)
- **OCC_Perf_L3** (25 measures)
- **Region Hierarchy** (4 measures)
- **Rep Performance Table** (2 measures)
- **Rep Performance Table L3** (2 measures)
- **SBR Measure Table** (7 measures)
- **SLM Performance Table** (1 measures)
- **Snapshot Quarter** (1 measures)
- **dim_param_vp** (4 measures)

### L2 Outlook Measures (14 measures)

#### ARR Attrition Plan

```dax
VAR target = CALCULATE(
    [RENEWALS ATTRITION $],
    // 'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "QRF",
    ALL('Snapshot Quarter'),ALL('Daily Weekly Switch'),ALL('Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */)
)
 
RETURN IF(
    HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */)
    || HASONEVALUE('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */)
    || HASONEVALUE('Region Hierarchy'[TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM */)
    || HASONEVALUE('Region Hierarchy'[SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM */)
    || HASONEVALUE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */)
    || HASONEVALUE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */)
    || HASONEVALUE('Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */),
    BLANK(),
    target
)
```

#### ARR Impact_OCC

```dax
CALCULATE([ARR IMPACT],
REMOVEFILTERS('Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */, 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */) )
```

#### Attrition Attn

```dax
IF(
    AND(
        NOT(ISBLANK([ARR Impact_OCC])),
        NOT(ISBLANK([ARR Attrition Plan]))
    ),
    1 - DIVIDE(
        [ARR Impact_OCC] - [ARR Attrition Plan],
        [ARR Attrition Plan]
    )
)
```

#### Attrition Y/Y%

```dax
VAR SelectedQuarters = VALUES('Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */)
 
VAR PreviousYearQuarters =
    SELECTCOLUMNS(
        SelectedQuarters,
        "CLOSE_QTR",
        FORMAT(VALUE(LEFT([CLOSE_QTR], 4)) - 1, "0000") & MID([CLOSE_QTR], 5, 3)
    )
 
VAR CurrentValue =
    CALCULATE(
        [ARR Impact_OCC],  
        'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ IN SelectedQuarters
        --'Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */ = TRUE
    )
 
VAR PreviousValue =
    CALCULATE(
        [ARR Impact_OCC],  
        'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ IN PreviousYearQuarters,
        ALL('Snapshot Quarter'), ALL('Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */), ALL('Daily Weekly Switch')
    )
 
RETURN
    IF(
        HASONEVALUE('Region Hierarchy'[TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM */)
        || HASONEVALUE('Region Hierarchy'[SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM */)
        || HASONEVALUE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */)
        || HASONEVALUE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */),BLANK(),
    DIVIDE(CurrentValue - PreviousValue, PreviousValue))
```

#### GNARR Attn

```dax
IFERROR(
DIVIDE([W+F+UC $], [BOOKINGS TARGET]),"")
```

#### GNARR Y/Y%

```dax
VAR SelectedQuarters = VALUES('Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */)
VAR CurrentYear = MAXX(SelectedQuarters, LEFT('Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */, 4))
VAR PreviousYearQuarters =
    SELECTCOLUMNS(
        SelectedQuarters,
        "CLOSE_QTR",
        FORMAT(VALUE(LEFT([CLOSE_QTR], 4)) - 1, "0000") & MID([CLOSE_QTR], 5, 3)
    )
VAR qtr = SELECTEDVALUE('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)
VAR past_ = CALCULATE('_TM1 Booking Measures'[TM1 Bookings $],ALL('Daily Weekly Switch'[Frequency]),ALL('Snapshot Quarter'),    'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ IN SelectedQuarters, 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ < 0    )

VAR CurrentValue = 
    CALCULATE(
        [W+F+UC $],
        'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ IN SelectedQuarters,'Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */=TRUE,
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ >= 0
    )

 
VAR PreviousValue =
    CALCULATE(
       [TM1 Bookings $],
        'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ IN PreviousYearQuarters, ALL('Daily Weekly Switch'[Frequency]),ALL('Snapshot Quarter'), ALL( 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */, 'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */)
    )
 
RETURN
    DIVIDE((CurrentValue + past_) - PreviousValue, PreviousValue)
```

#### Gap to Plan

```dax
[BOOKINGS TARGET] - [W+F+UC $]
```

#### L2_Net ARR

```dax
[W+F+UC $ OL]+[ARR Impact_OCC]
```

#### Net ARR Attn

```dax
IFERROR([L2_Net ARR]/[Net ARR Plan]," ")
```

#### Net ARR Plan

```dax
[BOOKINGS TARGET] + [ARR Attrition Plan]
```

#### Net ARR Y/Y%

```dax
VAR SelectedQuarters = VALUES('Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */)
 
VAR PreviousYearQuarters =
    SELECTCOLUMNS(
        SelectedQuarters,
        "CLOSE_QTR",
        FORMAT(VALUE(LEFT([CLOSE_QTR], 4)) - 1, "0000") & MID([CLOSE_QTR], 5, 3)
    )
 
VAR CurrentValue =
    CALCULATE(
        [W+F+UC $ OL],  
        'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ IN SelectedQuarters,
        'Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */ = TRUE
    )+CALCULATE(
        [ARR Impact_OCC],  
        'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ IN SelectedQuarters//,
        --'Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */ = TRUE
    )
 
VAR PreviousValue =
    CALCULATE(
       [TM1 Bookings $],
        'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ IN PreviousYearQuarters, ALL('Daily Weekly Switch'[Frequency]),ALL('Snapshot Quarter'), ALL(  'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */)
    )+CALCULATE(
        [ARR Impact_OCC],  
        'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ IN PreviousYearQuarters,
        ALL('Snapshot Quarter'), ALL('Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */)
    )
 
RETURN
    IF(
        HASONEVALUE('Region Hierarchy'[TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM */)
        || HASONEVALUE('Region Hierarchy'[SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM */)
        || HASONEVALUE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */)
        || HASONEVALUE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */),BLANK(),
    DIVIDE(CurrentValue - PreviousValue, PreviousValue))
```

#### Prev Value Check

```dax
CALCULATE(
    [TM1 Bookings $],
    ALL('Close Quarter'),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -4
)
```

#### W+F+UC $ plus Sum of ARR_Impact

```dax
[W+F+UC $] + SUM('Retention'[ARR_Impact] /* DB: vw_TF_EBI_Retention.ARR_Impact */)
```

#### gnarr y/y test

```dax
VAR SelectedQuarters = VALUES('Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */)

VAR PreviousYearQuarters =
    SELECTCOLUMNS(
        SelectedQuarters,
        "CLOSE_QTR",
        FORMAT(VALUE(LEFT([CLOSE_QTR], 4)) - 1, "0000") & MID([CLOSE_QTR], 5, 3)
    )

VAR CurrentValue =
    CALCULATE(
        [ARR IMPACT],  
        'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ IN SelectedQuarters,
        'Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */ = TRUE
    )

VAR PreviousValue =
    CALCULATE(
        [ARR IMPACT],  
        'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ IN PreviousYearQuarters,
        ALL('Snapshot Quarter')
    )

RETURN
    DIVIDE(CurrentValue - PreviousValue, PreviousValue)
```

### Linearity view measures (10 measures)

#### DealCount

```dax
VAR Result =
   CALCULATE ( [RENEWAL #] )
 
VAR _rowtotal = CALCULATE(
   [RENEWAL #] ,  ALLSELECTED('Service End Quarter'))

VAR _coltotal = 
    CALCULATE (
       [RENEWAL #],
       ALL('Retention MetaData'[OUTLOOK_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.OUTLOOK_CATEGORY */))

VAR _sel = SELECTEDVALUE('Retention Linearity Time Parameter SED'[Value4])
 
RETURN
SWITCH(TRUE(),
_sel = "Weekly" ,
IF(NOT(ISBLANK(_rowtotal)) ,
IF( ISBLANK(Result), "", Result)
),
_sel = "Monthly" ,
IF (NOT ISBLANK ( _coltotal ),
    IF ( ISBLANK ( Result ), "",Result),
    BLANK())
)
```

#### DealCountPct

```dax
VAR TotalCount = CALCULATE([RENEWAL #]
,ALLSELECTED('Retention MetaData'[OUTLOOK_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.OUTLOOK_CATEGORY */ ), ALLSELECTED('Opp Close Quarter' ) , ALLSELECTED('Retention')
)
RETURN

    DIVIDE([RENEWAL #], TotalCount)
```

#### DealCountPct_OPC

```dax
VAR Qtr =
    SELECTEDVALUE ( 'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ )
VAR Result =
    CALCULATE ( [DealCountPct], 'Opp Close Quarter'[OPP_CLOSE_QTR] /* DB: vw_EBI_Caldate.OPP_CLOSE_QTR */ = Qtr )

VAR _rowtotal =
    CALCULATE (
        [DealCountPct],
        'Opp Close Quarter'[OPP_CLOSE_QTR] /* DB: vw_EBI_Caldate.OPP_CLOSE_QTR */ = Qtr,
        ALLSELECTED ( 'Opp Close Quarter' ))
VAR _coltotal =
    CALCULATE (
        [DealCountPct],
        ( 'Opp Close Quarter'[OPP_CLOSE_QTR] /* DB: vw_EBI_Caldate.OPP_CLOSE_QTR */ = Qtr ),
        ALL ( 'Retention MetaData'[OUTLOOK_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.OUTLOOK_CATEGORY */ ))
VAR _sel =
    SELECTEDVALUE ( 'Retention Linearity Time Parameter OPCD'[Value4] )
RETURN
    SWITCH (
        TRUE (),
        _sel = "Weekly", IF ( NOT ( ISBLANK ( _rowtotal ) ), IF ( ISBLANK ( Result ), "", Result ) ),
        _sel = "Monthly", IF ( NOT ( ISBLANK ( _coltotal ) ), IF ( ISBLANK ( Result ), "", Result ) )
    )
```

#### DealCountPct_SED

```dax
VAR Result = CALCULATE ( [DealCountPct])
VAR _rowtotal =
    CALCULATE ( [DealCountPct], ALLSELECTED ( 'Service End Quarter' ) )
VAR _coltotal =
    CALCULATE (
        [DealCountPct],
        ALL( 'Retention MetaData'[OUTLOOK_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.OUTLOOK_CATEGORY */ ))
VAR _sel =
    SELECTEDVALUE ( 'Retention Linearity Time Parameter SED'[Value4] )
RETURN
    SWITCH (
        TRUE (),
        _sel = "Weekly", IF ( NOT ( ISBLANK ( _rowtotal ) ), IF ( ISBLANK ( Result ), "", Result ) ),
        _sel = "Monthly", IF ( NOT ( ISBLANK ( _coltotal ) ), IF ( ISBLANK ( Result ), "", Result ) )
    )
```

#### DealCount_OPC

```dax
VAR Qtr =
    SELECTEDVALUE ( 'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ )
VAR Result =
    CALCULATE ( [RENEWAL #], ( 'Opp Close Quarter'[OPP_CLOSE_QTR] /* DB: vw_EBI_Caldate.OPP_CLOSE_QTR */ = Qtr ) )

VAR _rowtotal =
    CALCULATE (
        [RENEWAL #],
        ( 'Opp Close Quarter'[OPP_CLOSE_QTR] /* DB: vw_EBI_Caldate.OPP_CLOSE_QTR */ = Qtr ),
        ALLSELECTED ( 'Opp Close Quarter' )
    )
VAR _coltotal =
    CALCULATE (
        [RENEWAL #],
        ( 'Opp Close Quarter'[OPP_CLOSE_QTR] /* DB: vw_EBI_Caldate.OPP_CLOSE_QTR */ = Qtr ),
        ALL ( 'Retention MetaData'[OUTLOOK_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.OUTLOOK_CATEGORY */ )
    )
VAR _sel =
    SELECTEDVALUE ( 'Retention Linearity Time Parameter OPCD'[Value4] )
RETURN
    SWITCH (
        TRUE (),
        _sel = "Weekly", IF ( NOT ( ISBLANK ( _rowtotal ) ), IF ( ISBLANK ( Result ), "", Result ) ),
        _sel = "Monthly", IF ( NOT ( ISBLANK ( _coltotal ) ), IF ( ISBLANK ( Result ), "", Result ) )
    )
```

#### RBOBPct_SED

```dax
VAR Result =
    CALCULATE ( [RbobPCT] )
VAR _rowtotal =
    CALCULATE ( [RbobPCT], ALLSELECTED ( 'Service End Quarter' ) )
VAR _coltotal =
    CALCULATE (
        [RbobPCT],
        ALL ( 'Retention MetaData'[OUTLOOK_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.OUTLOOK_CATEGORY */ ))
VAR _sel =
    SELECTEDVALUE ( 'Retention Linearity Time Parameter SED'[Value4] )
RETURN
    SWITCH (
        TRUE (),
        _sel = "Weekly", IF ( NOT ( ISBLANK ( _rowtotal ) ), IF ( ISBLANK ( Result ), "", Result ) ),
        _sel = "Monthly", IF ( NOT ( ISBLANK ( _coltotal ) ), IF ( ISBLANK ( Result ), "", Result ) )
    )
```

#### RBOB_SED

```dax
VAR Result = CALCULATE ( [RBOB] )
VAR _rowtotal =
    CALCULATE ( [RBOB], ALLSELECTED ( 'Service End Quarter' ) )
VAR _coltotal =
    CALCULATE (
        [RBOB],
        ALL ( 'Retention MetaData'[OUTLOOK_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.OUTLOOK_CATEGORY */ ))
VAR _sel =
    SELECTEDVALUE ( 'Retention Linearity Time Parameter SED'[Value4] )
RETURN
    SWITCH (
        TRUE (),
        _sel = "Weekly", IF ( NOT ( ISBLANK ( _rowtotal ) ), IF ( ISBLANK ( Result ), "", Result ) ),
        _sel = "Monthly", IF ( NOT ( ISBLANK ( _coltotal ) ), IF ( ISBLANK ( Result ), "", Result ) )
    )
```

#### RbobPCT

```dax
VAR TotalCount = CALCULATE('_Retention Measures'[RBOB]
,ALLSELECTED('Retention MetaData'[OUTLOOK_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.OUTLOOK_CATEGORY */ ), ALLSELECTED('Opp Close Quarter' ), ALLSELECTED('Retention')
)
RETURN

    DIVIDE('_Retention Measures'[RBOB], TotalCount)
//TotalCount
```

#### RbobPCT_OPC

```dax
VAR Qtr =
    SELECTEDVALUE ( 'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ )
VAR Result =
    CALCULATE ( [RbobPCT], 'Opp Close Quarter'[OPP_CLOSE_QTR] /* DB: vw_EBI_Caldate.OPP_CLOSE_QTR */ = Qtr )
VAR _rowtotal =
    CALCULATE (
        [RbobPCT],
        'Opp Close Quarter'[OPP_CLOSE_QTR] /* DB: vw_EBI_Caldate.OPP_CLOSE_QTR */ = Qtr,
        ALLSELECTED ( 'Opp Close Quarter' ))
VAR _coltotal =
    CALCULATE (
        [RbobPCT],
        ( 'Opp Close Quarter'[OPP_CLOSE_QTR] /* DB: vw_EBI_Caldate.OPP_CLOSE_QTR */ = Qtr ),
        ALL ( 'Retention MetaData'[OUTLOOK_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.OUTLOOK_CATEGORY */ ))
VAR _sel =
    SELECTEDVALUE ( 'Retention Linearity Time Parameter OPCD'[Value4] )
RETURN
    SWITCH (
        TRUE (),
        _sel = "Weekly", IF ( NOT ( ISBLANK ( _rowtotal ) ), IF ( ISBLANK ( Result ), "", Result ) ),
        _sel = "Monthly", IF ( NOT ( ISBLANK ( _coltotal ) ), IF ( ISBLANK ( Result ), "", Result ) )
    )
```

#### Rbob_OPC

```dax
VAR Qtr =
    SELECTEDVALUE ( 'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ )
VAR Result =
    CALCULATE ( [RBOB w/o PQ Trail], 'Opp Close Quarter'[OPP_CLOSE_QTR] /* DB: vw_EBI_Caldate.OPP_CLOSE_QTR */ = Qtr )
VAR _rowtotal =
    CALCULATE (
        [RBOB w/o PQ Trail],
        'Opp Close Quarter'[OPP_CLOSE_QTR] /* DB: vw_EBI_Caldate.OPP_CLOSE_QTR */ = Qtr,
        ALLSELECTED ( 'Opp Close Quarter' ))
VAR _coltotal =
    CALCULATE (
        [RBOB w/o PQ Trail],
        ( 'Opp Close Quarter'[OPP_CLOSE_QTR] /* DB: vw_EBI_Caldate.OPP_CLOSE_QTR */ = Qtr ),
        ALL ( 'Retention MetaData'[OUTLOOK_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.OUTLOOK_CATEGORY */ ))
VAR _sel =
    SELECTEDVALUE ( 'Retention Linearity Time Parameter OPCD'[Value4] )
RETURN
    SWITCH (
        TRUE (),
        _sel = "Weekly", IF ( NOT ( ISBLANK ( _rowtotal ) ), IF ( ISBLANK ( Result ), "", Result ) ),
        _sel = "Monthly", IF ( NOT ( ISBLANK ( _coltotal ) ), IF ( ISBLANK ( Result ), "", Result ) )
    )
```

### OCC_Pipe_Cov_L3 Measures (24 measures)

**_OCC_Coverage:**

#### # of Deal reviews

```dax
nan
```

#### # of Deal reviews_with By

```dax
CALCULATE(DISTINCTCOUNT(Pipeline[OCC_DRID]),AND(Opportunity[DATE_LAST_REVIEWED]>TODAY()-90,Opportunity[DATE_LAST_REVIEWED]<TODAY()),NOT(ISBLANK(Opportunity[DEAL_REVIEWED_BY])))
```

#### $ of Deal reviews

```dax
CALCULATE([PIPE $],AND(Opportunity[DATE_LAST_REVIEWED]>TODAY()-90,Opportunity[DATE_LAST_REVIEWED]<TODAY()),NOT(ISBLANK(Opportunity[DEAL_REVIEWED_BY])))
```

#### % of Deal reviews

```dax
DIVIDE([$ of Deal reviews],[PIPE $],Blank())
```

#### Close Ratio OL

```dax
VAR Qtr = SELECTEDVALUE('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)

VAR PAST_ = CALCULATE('_TM1 Booking Measures'[TM1 Bookings $],ALL('Daily Weekly Switch'[Frequency]),ALL('Snapshot Quarter'))

VAR WON = CALCULATE([WON $],Pipeline[IS_EOQ] = "TRUE")

VAR BOQ_PIPE = CALCULATE([PIPE $], Pipeline[IS_BOQ] = "TRUE")

RETURN 

IF(Qtr < -1, DIVIDE(PAST_, BOQ_PIPE),

DIVIDE (WON, BOQ_PIPE))
```

#### CovX Gap by Closed Ratio

```dax
BLANK()
```

#### Hist Close Rate

```dax
var calc = CALCULATE (
            [CLOSE RATE],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ in {-1,-2,-3,-4},
            REMOVEFILTERS ( 'Snapshot Quarter' ),
            REMOVEFILTERS ( 'Close Quarter' )
        )
var result = 
        IF ( calc < 0, BLANK (), calc )
RETURN result
```

#### Hist Close Ratio

```dax
var calc = CALCULATE (
            [Close Ratio OL],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ in {-4,-3,-2,-1},
            REMOVEFILTERS ( 'Snapshot Quarter' ),
            REMOVEFILTERS ( 'Close Quarter' )
        )
var result = 
        IF ( calc < 0, BLANK (), calc )
RETURN 
            result
```

#### Mature Pipe Deals Stalled

```dax
CALCULATE([SS5+ $], Pipeline[STALLED_BUT_INACTIVE]="Stalled & Inactive")
```

#### Mature Pipe With Red Acc Health

```dax
var result = CALCULATE([SS5+ $], 'Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */ = "Red")

 RETURN
    IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */),
    BLANK(),
    result)
```

#### OCC_Deal Count

```dax
VAR QTR_BKT = SELECTEDVALUE('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)
 
VAR TM1 = CALCULATE([TM1 deal count], ALL('Daily Weekly Switch'[Frequency]),ALL('Snapshot Quarter'))
VAR _cqdealcount = COUNTROWS(FILTER(SUMMARIZECOLUMNS(Opportunity[DEAL_REG_ID],
     "gnarr", [GNARR $ OL]), [gnarr] > 0))
 
RETURN
 
IF(QTR_BKT < 0, TM1,
CALCULATE(DISTINCTCOUNT(Opportunity[DEAL_REG_ID]),
FILTER ( Opportunity, NOT ISBLANK( [GNARR $ OL] )
)  ) )
```

#### OCC_Deal Count Cov

```dax
CALCULATE(DISTINCTCOUNT(Opportunity[DEAL_REG_ID]),
 FILTER(Opportunity, NOT ISBLANK( [OPPTY $]))
)
```

#### OCC_Opp Age

```dax
CALCULATE(AVERAGE(Pipeline[DEAL_AGE]))
```

#### OCC_Pipe Target

```dax
var result = FORMAT([PIPE TARGET]/1000000,"$#,##0.0M")
RETURN
IF( HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */) ||
ISBLANK([PIPE TARGET]), BLANK(),
result
)
```

#### Param S3 $

```dax
VAR result = [S3 $]
RETURN
    IF( HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */),
    BLANK(),
    result)
```

#### Products

```dax
VAR products = CONCATENATEX(SUMMARIZE(FILTER(Pipeline, Pipeline[OPP_ID] = Pipeline[OPP_ID]),OPG[MOPG1]), OPG[MOPG1],",")

RETURN IF( HASONEVALUE(Opportunity[DEAL_REG_ID]), products)
```

#### S3 Pipe Deals Stalled

```dax
CALCULATE([S3 $], Pipeline[STALLED_BUT_INACTIVE]="Stalled & Inactive")
```

#### S4 Pipe Deals Stalled

```dax
CALCULATE([S4 $], Pipeline[STALLED_BUT_INACTIVE]="Stalled & Inactive")
```

#### S5+ Pipeline Cov.

```dax
CONVERT(
    ROUND(
        CALCULATE(
            [COVERAGE MATURE PIPE / BOOKINGS TARGET X],
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    1
    ),
    STRING
) & "x"
```

#### S5+ Progression

```dax
VAR result = CALCULATE (
    [TRUE PROGRESSION QTD $],
    ALLEXCEPT('Snapshot Quarter','Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */,'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */),
    ALLEXCEPT('Daily Weekly Switch','Daily Weekly Switch'[Frequency]),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ >= 0 && 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 2,
    REMOVEFILTERS('Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */),
    'Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */ IN { "S5", "S6", "S7", "Booked" }
)

RETURN result
```

#### Total Pipe

```dax
VAR result = [PIPE $]

RETURN
    IF( HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */),
    BLANK(),
    result)
```

#### Total Pipe Cov.

```dax
CONVERT(
    ROUND(
        CALCULATE(
            '_Coverage Measures'[COVERAGE PIPE / TARGET LEFT TO GO X],
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    1
    ),
    STRING
) & "x"
```

#### Total Pipe CovX

```dax
VAR result = [COVERAGE PIPE / TARGET LEFT TO GO X]

RETURN
    IF( HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */),
    BLANK(),
    result)
```

#### W+F+UC Stalled %

```dax
DIVIDE(CALCULATE([W+F+UC $],Pipeline[STALLED_BUT_INACTIVE]="Stalled & Inactive"),[W+F+UC $],0)
```

### OCC_TPT Measures_Creation (9 measures)

#### High ICP&UCP w/o Pipe

```dax
VAR res =
    CALCULATE (
        DISTINCTCOUNT ( TPT[ACCOUNT_SUB_ID] ),
       'Customer Profile Attributes'[HIGH_UCP_ICP] /* DB: dataset:Customer_Profile_Attributes.HIGH_UCP_ICP */=TRUE(),
        'TPT Metadata'[IS_PIPE_AT_SUB_MOPG1_CNTRY] /* DB: dataset:TPT_Metadata.IS_PIPE_AT_SUB_MOPG1_CNTRY */ = 0,
        'TPT Metadata'[is_pipe_arr] /* DB: dataset:TPT_Metadata.is_pipe_arr */=1
    )
RETURN
    IF (
        HASONEVALUE ( 'Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */ )
            || HASONEVALUE ( 'Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */ )
            || HASONEVALUE ( 'Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */ )
            || HASONEVALUE ( 'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.CLOSE_YR */ )
            || HASONEVALUE ( 'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ )
            || HASONEVALUE('Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */)
            || HASONEVALUE('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */),
        BLANK (),
        res
    )
```

#### High ICP/UCP/AES Acct W/o Pipe

```dax
VAR res =
    CALCULATE (
        DISTINCTCOUNT ( TPT[ACCOUNT_SUB_ID] ),
       'Customer Profile Attributes'[HIGH_UCP_ICP_AES] /* DB: dataset:Customer_Profile_Attributes.HIGH_UCP_ICP_AES */=TRUE(),
        'TPT Metadata'[IS_PIPE_AT_SUB_MOPG1_CNTRY] /* DB: dataset:TPT_Metadata.IS_PIPE_AT_SUB_MOPG1_CNTRY */ = 0
        // 'TPT Metadata'[is_pipe_arr] /* DB: dataset:TPT_Metadata.is_pipe_arr */=1
    )
RETURN
    IF (
        HASONEVALUE ( 'Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */ )
            || HASONEVALUE ( 'Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */ )
            || HASONEVALUE ( 'Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */ )
            || HASONEVALUE ( 'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.CLOSE_YR */ )
            || HASONEVALUE ( 'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ )
            || HASONEVALUE('Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */)
            || HASONEVALUE('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */),
        BLANK (),
        res
    )
```

#### High Marketing Engaged Accnts w/o pipe

```dax
VAR res =
    CALCULATE (
        DISTINCTCOUNT ( TPT[ACCOUNT_SUB_ID] ),
       'Customer Profile Attributes'[HIGH_AES] /* DB: dataset:Customer_Profile_Attributes.HIGH_AES */=TRUE(),
        'TPT Metadata'[IS_PIPE_AT_SUB_MOPG1_CNTRY] /* DB: dataset:TPT_Metadata.IS_PIPE_AT_SUB_MOPG1_CNTRY */ = 0,
        'TPT Metadata'[is_pipe_arr] /* DB: dataset:TPT_Metadata.is_pipe_arr */=1
    )

RETURN
    IF (
        HASONEVALUE ( 'Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */ )
            || HASONEVALUE ( 'Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */ )
            || HASONEVALUE ( 'Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */ )
            || HASONEVALUE ( 'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.CLOSE_YR */ )
            || HASONEVALUE ( 'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ )
            || HASONEVALUE('Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */)
            || HASONEVALUE('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */),
        BLANK (),
        res
    )
```

#### Parent Tier 1 SS1/2 Pipe $

```dax
CALCULATE (
    [TIER 1 PRNT GNARR $],
    'Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */ IN { "S1", "S2" },
    'Region Hierarchy'[REP_GTM_MOTION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_GTM_MOTION */ IN { "Industry", "Generalist" },
    'Region Hierarchy'[REP_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_ID */ <> -1,
    'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
    NOT ( OPG[MOPG1] = "DX VIDEO" )
)
```

#### Parent Tier 1 with No Pipe

```dax
VAR res =
    CALCULATE (
        DISTINCTCOUNT ( TPT[ACCOUNT_PRNT_ID] ),
      //  'Region Hierarchy'[REP_GTM_MOTION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_GTM_MOTION */ IN { "Industry", "Generalist" },
        'Region Hierarchy'[REP_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_ID */ <> -1,
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
        'TPT Metadata'[CLEANED_PARENT_TIER] /* DB: dataset:TPT_Metadata.CLEANED_PARENT_TIER */ = "Tier 1",
        'TPT Metadata'[IS_PIPE_AT_PRNT_CNTRY] /* DB: dataset:TPT_Metadata.IS_PIPE_AT_PRNT_CNTRY */ = 0
    )
RETURN
    IF (
        HASONEVALUE ( 'Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */ )
            || HASONEVALUE ( 'Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */ )
            || HASONEVALUE ( 'Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */ )
            || HASONEVALUE ( 'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.CLOSE_YR */ )
            || HASONEVALUE ( 'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ )
            || HASONEVALUE('Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */)
            || HASONEVALUE('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */),
        BLANK (),
        res
    )
```

#### Parent Tier 2/3 with No Pipe

```dax
VAR res =
    CALCULATE (
        DISTINCTCOUNT ( TPT[ACCOUNT_PRNT_ID] ),
      //  'Region Hierarchy'[REP_GTM_MOTION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_GTM_MOTION */ IN { "Industry", "Generalist" },
        'Region Hierarchy'[REP_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_ID */ <> -1,
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
        'TPT Metadata'[CLEANED_PARENT_TIER] /* DB: dataset:TPT_Metadata.CLEANED_PARENT_TIER */ IN { "Tier 2", "Tier 3" },
        'TPT Metadata'[IS_PIPE_AT_PRNT_CNTRY] /* DB: dataset:TPT_Metadata.IS_PIPE_AT_PRNT_CNTRY */ = 0
    )
RETURN
    IF (
        HASONEVALUE ( 'Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */ )
            || HASONEVALUE ( 'Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */ )
            || HASONEVALUE ( 'Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */ )
            || HASONEVALUE ( 'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.CLOSE_YR */ )
            || HASONEVALUE ( 'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ )
            || HASONEVALUE('Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */)
            || HASONEVALUE('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */),
        BLANK (),
        res
    )
```

#### Sub Tier 1 SS1/2 Pipe $

```dax
VAR res =
    CALCULATE (
        [TIER 1 SUB GNARR $],
        'Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */ IN { "S1", "S2" },
        'Region Hierarchy'[REP_GTM_MOTION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_GTM_MOTION */ = "Solution",
        'Region Hierarchy'[REP_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_ID */ <> -1,
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
        NOT ( OPG[MOPG1] = "DX VIDEO" )
    )
RETURN
    IF (
        HASONEVALUE ( 'Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */ )
            || HASONEVALUE ( 'Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */ )
            || HASONEVALUE ( 'Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */ )
            || HASONEVALUE ( 'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.CLOSE_YR */ )
            || HASONEVALUE ( 'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ ),
        BLANK (),
        res
    )
```

#### Sub Tier 1 with No Pipe

```dax
VAR res =
    CALCULATE (
        DISTINCTCOUNT ( TPT[ACCOUNT_SUB_ID] ),
      //  'Region Hierarchy'[REP_GTM_MOTION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_GTM_MOTION */ IN { "Solution" },
        'Region Hierarchy'[REP_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_ID */ <> -1,
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
        'TPT Metadata'[CLEANED_SUB_TIER] /* DB: dataset:TPT_Metadata.CLEANED_SUB_TIER */ = "Tier 1",
        'TPT Metadata'[IS_PIPE_AT_SUB_MOPG1_CNTRY] /* DB: dataset:TPT_Metadata.IS_PIPE_AT_SUB_MOPG1_CNTRY */ = 0
    )
RETURN
    IF (
        HASONEVALUE ( 'Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */ )
            || HASONEVALUE ( 'Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */ )
            || HASONEVALUE ( 'Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */ )
            || HASONEVALUE ( 'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.CLOSE_YR */ )
            || HASONEVALUE ( 'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ )
            || HASONEVALUE('Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */)
            || HASONEVALUE('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */),
        BLANK (),
        res
    )
```

#### Sub Tier 2/3 with No Pipe

```dax
VAR res =
    CALCULATE (
        DISTINCTCOUNT ( TPT[ACCOUNT_SUB_ID] ),
       // 'Region Hierarchy'[REP_GTM_MOTION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_GTM_MOTION */ IN { "Solution" },
        'Region Hierarchy'[REP_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_ID */ <> -1,
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
        'TPT Metadata'[CLEANED_SUB_TIER] /* DB: dataset:TPT_Metadata.CLEANED_SUB_TIER */ IN { "Tier 2", "Tier 3" },
        'TPT Metadata'[IS_PIPE_AT_SUB_MOPG1_CNTRY] /* DB: dataset:TPT_Metadata.IS_PIPE_AT_SUB_MOPG1_CNTRY */ = 0
    )
RETURN
    IF (
        HASONEVALUE ( 'Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */ )
            || HASONEVALUE ( 'Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */ )
            || HASONEVALUE ( 'Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */ )
            || HASONEVALUE ( 'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.CLOSE_YR */ )
            || HASONEVALUE ( 'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ )
            || HASONEVALUE('Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */)
            || HASONEVALUE('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */),
        BLANK (),
        res
    )
```

### SLM L2 Measures (37 measures)

#### % Weekly SLM participation QTD

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR diff = IFERROR([SLM QTD Attain] - [SLM QTD Attain_Prev],BLANK())

RETURN
SWITCH(TRUE(), 
    diff > 0,
    UPARROW &" "& FORMAT(diff,"0.0%")&" Pts WoW",
    diff < 0,
    DOWNARROW &" "& FORMAT(ABS(diff),"0.0%")&" Pts WoW",
    FORMAT(diff,"0.0%")&" Pts WoW"
)
```

#### % Weekly SLM participation YTD

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR diff = IFERROR([SLM YTD Attain] - [SLM YTD Attain_Prev],BLANK())

RETURN
SWITCH(TRUE(), 
    diff > 0,
    UPARROW &" "& FORMAT(diff,"0.0%")&" Pts WoW",
    diff < 0,
    DOWNARROW &" "& FORMAT(ABS(diff),"0.0%")&" Pts WoW",
    FORMAT(diff,"0.0%")&" Pts WoW"
)
```

#### SLM CY Cov

```dax
VAR SLMCount = CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Band'[SLM_LDAP]))
return DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[CY Covx >2])),SLMCount,BLANK())
```

#### SLM CY Cov Start

```dax
VAR SLMCount = CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Start'[SLM_LDAP]))
return DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Start'[CY Covx >2])),SLMCount,BLANK())
```

#### SLM CY Cov Trend

```dax
var Diff = [SLM CY Cov]-[SLM CY Cov Start]
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### SLM Count

```dax
CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Band'[SLM_LDAP]))
```

#### SLM Mat Cov

```dax
VAR SLMCount = CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Band'[SLM_LDAP]))
return DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[Q+1 Mat Covx >1.2])),SLMCount,BLANK())
```

#### SLM Mat Cov Start

```dax
VAR SLMCount = CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Start'[SLM_LDAP]))
return DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Start'[Q+1 Mat Covx >1.2])),SLMCount,BLANK())
```

#### SLM Mat Cov Trend

```dax
var Diff = [SLM Mat Cov]-[SLM Mat Cov Start]
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### SLM Part QTD Trend

```dax
var Diff = [SLM QTD Attain]-[SLM QTD Attain Start]
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### SLM Part YTD Trend

```dax
var Diff = [SLM YTD Attain]-[SLM YTD Attain Start]
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### SLM Participation QTD Comp_L3

```dax
VAR Reps75 = CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[QTD Attain >75]))

VAR AllReps = CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Band'[SLM_LDAP]))

RETURN "(" & FORMAT(Reps75,"#") & "/" & 
FORMAT(AllReps,"#") & ")"
```

#### SLM Participation YTD Comp_L3

```dax
VAR Reps75 = CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[YTD Attain >75]))

VAR AllReps = CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Band'[SLM_LDAP]))

RETURN "(" & FORMAT(Reps75,"#") & "/" & 
FORMAT(AllReps,"#") & ")"
```

#### SLM QTD Attain

```dax
VAR SLMCount = CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Band'[SLM_LDAP]))
return DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[QTD Attain >75])),SLMCount,BLANK())
```

#### SLM QTD Attain Start

```dax
VAR SLMCount = CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Start'[SLM_LDAP]))
return DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Start'[QTD Attain >75])),SLMCount,BLANK())
```

#### SLM QTD Attain_Prev

```dax
VAR SLMCount = CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Prev'[SLM_LDAP]))
return DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Prev'[QTD Attain @ 75])),SLMCount,BLANK())
```

#### SLM QTD Gen

```dax
VAR SLMCount = CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Band'[SLM_LDAP]))
return DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[QTD Pipe Gen >75])),SLMCount,BLANK())
```

#### SLM QTD Gen Start

```dax
VAR SLMCount = CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Start'[SLM_LDAP]))
return DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Start'[QTD Pipe Gen >75])),SLMCount,BLANK())
```

#### SLM QTD Gen Trend

```dax
var Diff = [SLM QTD Gen]-[SLM QTD Gen Start]
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### SLM QTD Team

```dax
VAR SLMCount = CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Band'[SLM_LDAP]))
return DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[SLM Team Part QTD >50])),SLMCount,BLANK())
```

#### SLM QTD Team Start

```dax
VAR SLMCount = CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Start'[SLM_LDAP]))
return DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Start'[SLM Team Part QTD >50])),SLMCount,BLANK())
```

#### SLM R4Q Cov

```dax
VAR SLMCount = CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Band'[SLM_LDAP]))
return DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[Rolling 4 Covx >2])),SLMCount,BLANK())
```

#### SLM R4Q Cov Start

```dax
VAR SLMCount = CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Start'[SLM_LDAP]))
return DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Start'[Rolling 4 Covx >2])),SLMCount,BLANK())
```

#### SLM R4Q Cov Trend

```dax
var Diff = [SLM R4Q Cov]-[SLM R4Q Cov Start]
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### SLM Team QTD Trend

```dax
var Diff = [SLM QTD Team]-[SLM QTD Team Start]
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### SLM Team YTD Trend

```dax
var Diff = [SLM YTD Team]-[SLM YTD Team Start]
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### SLM Tot Cov

```dax
VAR SLMCount = CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Band'[SLM_LDAP]))
return DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[Q+1 Covx >2.7])),SLMCount,BLANK())
```

#### SLM Tot Cov Start

```dax
VAR SLMCount = CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Start'[SLM_LDAP]))
return DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Start'[Q+1 Covx >2.7])),SLMCount,BLANK())
```

#### SLM Tot Cov Trend

```dax
var Diff = [SLM Tot Cov]-[SLM Tot Cov Start]
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### SLM YTD Attain

```dax
VAR SLMCount = CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Band'[SLM_LDAP]))
return DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[YTD Attain >75])),SLMCount,BLANK())
```

#### SLM YTD Attain Start

```dax
VAR SLMCount = CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Start'[SLM_LDAP]))
return DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Start'[YTD Attain >75])),SLMCount,BLANK())
```

#### SLM YTD Attain_Prev

```dax
VAR SLMCount = CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Prev'[SLM_LDAP]))
return DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Prev'[Attain @ 75])),SLMCount,BLANK())
```

#### SLM YTD Gen

```dax
VAR SLMCount = CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Band'[SLM_LDAP]))
return DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[YTD Pipe Gen >75])),SLMCount,BLANK())
```

#### SLM YTD Gen Start

```dax
VAR SLMCount = CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Start'[SLM_LDAP]))
return DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Start'[YTD Pipe Gen >75])),SLMCount,BLANK())
```

#### SLM YTD Gen Trend

```dax
var Diff = [SLM YTD Gen]-[SLM YTD Gen Start]
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### SLM YTD Team

```dax
VAR SLMCount = CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Band'[SLM_LDAP]))
return DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[SLM Team Part YTD >50])),SLMCount,BLANK())
```

#### SLM YTD Team Start

```dax
VAR SLMCount = CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Start'[SLM_LDAP]))
return DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Start'[SLM Team Part YTD >50])),SLMCount,BLANK())
```

### _Account ARR Measures (5 measures)

#### ARR $

```dax
EXTERNALMEASURE("ARR $", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### BOQ ARR $

```dax
EXTERNALMEASURE("BOQ ARR $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### BOQ ARR $ Default

```dax
EXTERNALMEASURE("BOQ ARR $ Default", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### EOQ ARR $

```dax
EXTERNALMEASURE("EOQ ARR $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### EOQ ARR $ Default

```dax
EXTERNALMEASURE("EOQ ARR $ Default", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

### _Account Activity Measures (2 measures)

#### ACCOUNT ACTIVITY #

```dax
EXTERNALMEASURE("ACCOUNT ACTIVITY #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### ACCOUNT ACTIVITY DOCUMENT #

```dax
EXTERNALMEASURE("ACCOUNT ACTIVITY DOCUMENT #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

### _Coverage Measures (11 measures)

#### COV X %

```dax
EXTERNALMEASURE("COV X %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### COVERAGE BOQ MATURE PIPE / BOOKINGS TARGET X

```dax
EXTERNALMEASURE("COVERAGE BOQ MATURE PIPE / BOOKINGS TARGET X", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### COVERAGE BOQ MATURE PIPE / PIPE TARGET X

```dax
EXTERNALMEASURE("COVERAGE BOQ MATURE PIPE / PIPE TARGET X", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### COVERAGE BOQ PIPE / BOOKINGS TARGET X

```dax
EXTERNALMEASURE("COVERAGE BOQ PIPE / BOOKINGS TARGET X", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### COVERAGE BOQ PIPE / PIPE TARGET X

```dax
EXTERNALMEASURE("COVERAGE BOQ PIPE / PIPE TARGET X", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### COVERAGE MATURE PIPE / BOOKINGS TARGET X

```dax
EXTERNALMEASURE("COVERAGE MATURE PIPE / BOOKINGS TARGET X", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### COVERAGE MATURE PIPE / PIPE TARGET X

```dax
EXTERNALMEASURE("COVERAGE MATURE PIPE / PIPE TARGET X", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### COVERAGE PIPE / BOOKINGS TARGET X

```dax
EXTERNALMEASURE("COVERAGE PIPE / BOOKINGS TARGET X", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### COVERAGE PIPE / PIPE TARGET X

```dax
EXTERNALMEASURE("COVERAGE PIPE / PIPE TARGET X", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### COVERAGE PIPE / TARGET LEFT TO GO X

```dax
EXTERNALMEASURE("COVERAGE PIPE / TARGET LEFT TO GO X", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### COVERAGE PIPE TARGET / BOOKINGS TARGET X

```dax
EXTERNALMEASURE("COVERAGE PIPE TARGET / BOOKINGS TARGET X", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

### _Enablement Measures (4 measures)

#### CREDIT COMPLETED

```dax
EXTERNALMEASURE("CREDIT COMPLETED", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### CURRENT ROLE TENURE GAP

```dax
EXTERNALMEASURE("CURRENT ROLE TENURE GAP", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TENURE GAP

```dax
EXTERNALMEASURE("TENURE GAP", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TOTAL CREDIT TARGET

```dax
EXTERNALMEASURE("TOTAL CREDIT TARGET", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

### _Generation Target Measures (35 measures)

#### GROSS CREATION QTD TREND

```dax
EXTERNALMEASURE("GROSS CREATION QTD TREND", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### NET CREATION QTD TREND

```dax
EXTERNALMEASURE("NET CREATION QTD TREND", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### RECON LAST DATE

```dax
EXTERNALMEASURE("RECON LAST DATE", DATETIME, "DirectQuery to AS - RTB DataVerse")
```

#### RECON LAST WEEK

```dax
EXTERNALMEASURE("RECON LAST WEEK", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

**Gross Creation Measures:**

#### FULL QUARTER GROSS CREATION

```dax
EXTERNALMEASURE("FULL QUARTER GROSS CREATION", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### FULL QUARTER GROSS CREATION Q1

```dax
EXTERNALMEASURE("FULL QUARTER GROSS CREATION Q1", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### FULL QUARTER GROSS CREATION Q2

```dax
EXTERNALMEASURE("FULL QUARTER GROSS CREATION Q2", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### FULL QUARTER GROSS CREATION Q3

```dax
EXTERNALMEASURE("FULL QUARTER GROSS CREATION Q3", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### FULL QUARTER GROSS CREATION Q4

```dax
EXTERNALMEASURE("FULL QUARTER GROSS CREATION Q4", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### GROSS CREATION MONTHLY (YTD)

```dax
EXTERNALMEASURE("GROSS CREATION MONTHLY (YTD)", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### GROSS CREATION MTD

```dax
EXTERNALMEASURE("GROSS CREATION MTD", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### GROSS CREATION QTD

```dax
EXTERNALMEASURE("GROSS CREATION QTD", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### GROSS CREATION WTD

```dax
EXTERNALMEASURE("GROSS CREATION WTD", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### GROSS CREATION YTD

```dax
EXTERNALMEASURE("GROSS CREATION YTD", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### test FULL QUARTER GROSS CREATION

```dax
VAR MultiplierCQ1 =
    LOOKUPVALUE (
        'Generation Target Multipliers'[GROSS_CREATION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.GROSS_CREATION_MULTIPLIER */,
        'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */, "CQ+1"
    )
VAR MultiplierCQ2 =
    LOOKUPVALUE (
        'Generation Target Multipliers'[GROSS_CREATION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.GROSS_CREATION_MULTIPLIER */,
        'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */, "CQ+2"
    )
VAR MultiplierCQ3 =
    LOOKUPVALUE (
        'Generation Target Multipliers'[GROSS_CREATION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.GROSS_CREATION_MULTIPLIER */,
        'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */, "CQ+3"
    )
VAR MultiplierCQ4 =
    LOOKUPVALUE (
        'Generation Target Multipliers'[GROSS_CREATION_MULTIPLIER] /* DB: TF_EBI_GENERATION_TARGET.GROSS_CREATION_MULTIPLIER */,
        'Generation Target Multipliers'[CLOSED_QTR_DESC] /* DB: TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC */, "CQ+4"
    )
RETURN
SUMX (
    VALUES ( 'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ ),
    VAR BaseQtr = 'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */

    VAR GenerationCQ =
        CALCULATE (
            [IN QTR GC TARGET],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = BaseQtr
        )
    VAR GenerationCQ1 =
        CALCULATE (
            [GENERATION TARGET] * MultiplierCQ1,
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = BaseQtr + 1
        )
    VAR GenerationCQ2 =
        CALCULATE (
            [GENERATION TARGET] * MultiplierCQ2,
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = BaseQtr + 2
        )
    VAR GenerationCQ3 =
        CALCULATE (
            [GENERATION TARGET] * MultiplierCQ3,
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = BaseQtr + 3
        )
    VAR GenerationCQ4 =
        CALCULATE (
            [GENERATION TARGET] * MultiplierCQ4,
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = BaseQtr + 4
        )

    RETURN
        GenerationCQ + GenerationCQ1 + GenerationCQ2 + GenerationCQ3 + GenerationCQ4
)
```

**Net Pipe Growth Measures:**

#### FULL QUARTER BOQ CREATION Q1

```dax
EXTERNALMEASURE("FULL QUARTER BOQ CREATION Q1", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### FULL QUARTER BOQ CREATION Q2

```dax
EXTERNALMEASURE("FULL QUARTER BOQ CREATION Q2", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### FULL QUARTER BOQ CREATION Q3

```dax
EXTERNALMEASURE("FULL QUARTER BOQ CREATION Q3", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### FULL QUARTER NET PIPE CREATION

```dax
EXTERNALMEASURE("FULL QUARTER NET PIPE CREATION", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### NET PIPE CREATION QTD

```dax
EXTERNALMEASURE("NET PIPE CREATION QTD", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### NET PIPE CREATION WTD

```dax
EXTERNALMEASURE("NET PIPE CREATION WTD", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### NET PIPE CREATION YTD

```dax
EXTERNALMEASURE("NET PIPE CREATION YTD", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

**Pacing Measures:**

#### LINEARITY TARGET $

```dax
EXTERNALMEASURE("LINEARITY TARGET $", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### LINEARITY TARGET TREND

```dax
EXTERNALMEASURE("LINEARITY TARGET TREND", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### PACING $

```dax
EXTERNALMEASURE("PACING $", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### SS4 PACING $

```dax
EXTERNALMEASURE("SS4 PACING $", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### SS4 PACING QTD $

```dax
EXTERNALMEASURE("SS4 PACING QTD $", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### SS5 PACING $

```dax
EXTERNALMEASURE("SS5 PACING $", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### SS5 PACING QTD $

```dax
EXTERNALMEASURE("SS5 PACING QTD $", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

**SS4 Progression Measures:**

#### SS4 PROGRESSION QTD

```dax
EXTERNALMEASURE("SS4 PROGRESSION QTD", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### SS4 PROGRESSION TARGET $

```dax
EXTERNALMEASURE("SS4 PROGRESSION TARGET $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### SS4 PROGRESSION WTD

```dax
EXTERNALMEASURE("SS4 PROGRESSION WTD", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

**True Progression Measures:**

#### TRUE PROGRESSION QTD

```dax
EXTERNALMEASURE("TRUE PROGRESSION QTD", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### TRUE PROGRESSION TARGET $

```dax
EXTERNALMEASURE("TRUE PROGRESSION TARGET $", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### TRUE PROGRESSION WTD

```dax
EXTERNALMEASURE("TRUE PROGRESSION WTD", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

### _Lead Measures (4 measures)

#### LEAD AMOUNT

```dax
EXTERNALMEASURE("LEAD AMOUNT", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### PARENT TIER1 LEAD VALUE

```dax
EXTERNALMEASURE("PARENT TIER1 LEAD VALUE", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### SUB TIER1 LEAD VALUE

```dax
EXTERNALMEASURE("SUB TIER1 LEAD VALUE", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### SUB TIER23 LEAD VALUE

```dax
EXTERNALMEASURE("SUB TIER23 LEAD VALUE", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

### _OCC Measures (582 measures)

#### # Green

```dax
CALCULATE([RENEWAL #],'Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */="Green")
```

#### # Red

```dax
CALCULATE([RENEWAL #],'Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */="Red")
```

#### # Yellow

```dax
CALCULATE([RENEWAL #],'Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */="Yellow")
```

#### % Weekly Perf YTD

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR Diff = ([PERFORMANCE YTD %] - [PW Performance YTD %])*100

RETURN

IF(Diff > 0, 
    UPARROW &" "& FORMAT(Diff,"0.0")&"%"&" WoW",
    DOWNARROW &" "& Format(ABS(Diff),"0.0")&"%"&" WoW")
```

#### % Weekly Perf YTD CF

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR Diff = ([PERFORMANCE YTD %] - [PW Performance YTD %])*100

RETURN

Diff
```

#### % Weekly WFUC CF

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR Diff = [W+F+UC %] - [PW W+F+UC $]

RETURN
Diff
```

#### % Weekly YTD Net

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR Diff = ([YTD Net% Plan] - [PW YTD Net Plan])*100

RETURN

IF(Diff > 0, 
    UPARROW &" "& FORMAT(Diff,"0.0")&"%"&" WoW",
    DOWNARROW &" "& Format(ABS(Diff),"0.0")&"%"&" WoW")
```

#### AE >1.2X S5+ COV X CQ + 1 #

```dax
VAR Reps = 
CALCULATE(
    COUNTROWS(
        FILTER(
            SUMMARIZECOLUMNS('Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */,
                    "Cov", [S5+ COVERGAE TO GO CQ+1]
                ),
             [Cov] >=1.2
             )
        ),
        'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
        'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place",
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
        'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
       -- 'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME"},
        'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
        REMOVEFILTERS ( 'Target Type' )
        
    )
RETURN
    IF ( Reps = 0, BLANK (), Reps )
```

#### AE >1.2X S5+ COV X CQ + 1 %

```dax
VAR Result =
    IF (
        HASONEVALUE ( Segment[SEGMENT_NAME] ) || 
        HASONEVALUE ( Segment[SEGMENT_GROUP] ) || 
        HASONEVALUE ( Pipeline[DEAL_BAND] ),
        BLANK(),
         DIVIDE ( [AE >1.2X S5+ COV X CQ + 1 #], [AE IN SEAT], BLANK() )
        )
    RETURN Result
```

#### AE >2X COV X CQ + 2 #

```dax
VAR cnt =
CALCULATE(
    COUNTROWS(
        FILTER(
            SUMMARIZECOLUMNS('Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */,
                    "Cov", [TOTAL PIPE COVERAGE (TO GO) CQ+2]
                ),
             [Cov] >=2
             )
        ),
        'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
        'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place",
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
        'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
        --'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
        'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
        REMOVEFILTERS ( 'Target Type' )
   )
RETURN
    IF ( cnt = 0, BLANK (), cnt )
```

#### AE >2X COV X CQ + 2 %

```dax
DIVIDE([AE >2X COV X CQ + 2 #],[AE IN SEAT],BLANK())
```

#### AE >2X COV X CQ + 3 #

```dax
VAR cnt =
CALCULATE(
    COUNTROWS(
        FILTER(
            SUMMARIZECOLUMNS('Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */,
                    "Cov", [TOTAL PIPE COVERAGE (TO GO) CQ+3]
                ),
             [Cov] >=2
             )
        ),
        'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
        'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place",
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
        'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
        --'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
        'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
        REMOVEFILTERS ( 'Target Type' )
   )
RETURN
    IF ( cnt = 0, BLANK (), cnt )
```

#### AE >2X COV X CQ + 3 %

```dax
DIVIDE([AE >2X COV X CQ + 3 #],[AE IN SEAT],BLANK())
```

#### AE IN SEAT

```dax
Var reps = 
CALCULATE (
    [TOTAL REPS],
     'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
    'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place",
    'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
    'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
    --'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
    'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" }
    )
RETURN IF(reps=0,BLANK(),reps)
```

#### AE IN SEAT %

```dax
IF (
    HASONEVALUE ( Segment[SEGMENT_NAME] ) || 
    HASONEVALUE ( Segment[SEGMENT_GROUP] ) || 
    HASONEVALUE ( OPG[PRODUCT] ) || 
    HASONEVALUE ( OPG[SOLUTION] ) || 
    HASONEVALUE ( OPG[SOLUTION_GROUP] ) || 
    HASONEVALUE ( Pipeline[DEAL_BAND] ) || 
    HASONEVALUE ( 'Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */ ) || 
    HASONEVALUE ( 'Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */ ) || 
    HASONEVALUE ( 'Sales Motion'[SALES_MOTION] /* DB: vw_TD_EBI_SALES_MOTION.SALES_MOTION */ ),
    BLANK(),
    VAR emptyCheck = 
        [GROSS CREATED YTD %] = BLANK() && 
        [CQ + N2Q S3/4 TO S5+ PROGRESSION $] = BLANK() && 
        [AE >1.2X S5+ COV X CQ + 1 %] = BLANK() && 
        [S3 Q+1 CovX] = BLANK() && 
        [S3 Q+2 CovX] = BLANK() && 
        [S3 Q+3 CovX] = BLANK()
    
    RETURN
        IF (emptyCheck, BLANK(), DIVIDE([FP AE in seat], [FP AE Total]))
)
```

#### AE PART @75% QTD #

```dax
var cnt = 
 CALCULATE(
                COUNTROWS(
                    FILTER(
                        SUMMARIZECOLUMNS(
                            'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */,
                            "attn", [CQ MANAGER FORECAST %]
                        ),
                        [attn] >= 0.75
                    )
                ),
                'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
                'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place",
                'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
                'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
                'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
                'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
                REMOVEFILTERS('Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */)
                
            )

    RETURN
    IF ( cnt = 0, BLANK (), cnt )
```

#### AE PART @75% QTD %

```dax
IF (
        HASONEVALUE ( Pipeline[DEAL_BAND_NEW] ),
        BLANK (),
DIVIDE([AE PART @75% QTD #],[AE IN SEAT],BLANK())
)
```

#### AE PART @75% YTD #

```dax
VAR cnt = 
CALCULATE (
                COUNTROWS (
                    FILTER (
                        SUMMARIZECOLUMNS('Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */, "attn", [YTD PROJECTION % OCC]),
                        [attn] >= 0.75
                    )
                ),
                'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
                'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place",
                'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
                // 'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
               -- 'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
                KEEPFILTERS('Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" }),
                KEEPFILTERS('Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota"),
                REMOVEFILTERS ( 'Target Type' )
            )

    RETURN
    IF ( cnt = 0, BLANK (), cnt )
```

#### AE PART @75% YTD %

```dax
IF (
        HASONEVALUE ( Pipeline[DEAL_BAND_NEW] ),
        BLANK (),
DIVIDE([AE PART @75% YTD #],[AE IN SEAT],BLANK())
)
```

#### AE TOTAL

```dax
VAR reps=
CALCULATE (
    [TOTAL REPS],
    'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
    'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
    'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
   -- 'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
    'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" }
)


RETURN IF(reps=0,BLANK(),reps)
```

#### APCompletionStatus

```dax
VAR CountStatus =
    CALCULATE(
        DISTINCTCOUNT('TPT Metadata'[AP_COMPLETION_STATUS] /* DB: dataset:TPT_Metadata.AP_COMPLETION_STATUS */),
        FILTER(
            'TPT Metadata',
            [ARRAVG SubID] > 0
        )
    )
RETURN
IF(
    CountStatus = 1 || MIN('TPT Metadata'[AP_COMPLETION_STATUS] /* DB: dataset:TPT_Metadata.AP_COMPLETION_STATUS */) = "Completed" ,
    CALCULATE(
        MIN('TPT Metadata'[AP_COMPLETION_STATUS] /* DB: dataset:TPT_Metadata.AP_COMPLETION_STATUS */),
        FILTER(
            'TPT Metadata',
            [ARRAVG SubID] > 0
        )
    ),
    ""
)
```

#### ARR Non Zero DOAP

```dax
var arr = 
CALCULATE('_Account ARR Measures'[ARR $], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1,
REMOVEFILTERS('Close Quarter'), REMOVEFILTERS('Create Quarter'))
RETURN
IF(arr = 0, BLANK() , arr)
```

#### ARRAVG ParentID

```dax
VAR _ARR = CALCULATE([BOQ ARR $], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,REMOVEFILTERS('Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */))

RETURN
 _ARR
```

#### ARRAVG ParentID Comp

```dax
VAR _parentid_count = [ParentID Count]
RETURN 
 REPT(UNICHAR(160),4) &
 "# Parent " & _parentid_count
```

#### ARRAVG ParentID Param

```dax
VAR _ARR = [ARR $]
VAR _parentid_count = CALCULATE(COUNTX(VALUES('Account Parent'[PRNT_ID] /* DB: dataset:Account_Parent.PRNT_ID */), '_Account ARR Measures'[ARR $]),  NOT(ISBLANK(Retention[ARR_Impact])))
RETURN 
DIVIDE(_ARR, _parentid_count)
```

#### ARRAVG SubID

```dax
VAR _ARR = CALCULATE([BOQ ARR $], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,REMOVEFILTERS('Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */))
RETURN
IF( HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */)
      || HASONEVALUE('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */)
      || HASONEVALUE('Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */),
      BLANK(),   
        _ARR
)
```

#### ARRAVG SubID Comp

```dax
VAR _subid_count = [Sub_MA Count]

RETURN  
// REPT(UNICHAR(160),4) &
"# Sub + MA " & _subid_count
```

#### ARRAVG SubID Param

```dax
VAR _ARR = [ARR $]
VAR _subid_count = CALCULATE(COUNTX(VALUES('Account Sub'[SUB_ID] /* DB: dataset:Account_Sub.SUB_ID */), '_Account ARR Measures'[ARR $]),
            NOT(ISBLANK(Retention[ARR_Impact])))
RETURN DIVIDE(_ARR, _subid_count)
```

#### Acc Green ARR

```dax
[CQ Acc ARR Green]
//  CALCULATE([ARR $], 'Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */ = "Green")
```

#### Acc Green%

```dax
CALCULATE([Green %], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1)
```

#### Acc PYellow ARR

```dax
[CQ Acc ARR Yellow]
//  CALCULATE([ARR $], 'Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */ = "Yellow")
```

#### Acc PYellow%

```dax
CALCULATE([Yellow %], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1)
```

#### Acc Red ARR

```dax
[CQ Acc ARR Red]
//  CALCULATE([ARR $], 'Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */ = "Red")
```

#### Acc Red%

```dax
CALCULATE([Red %], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1)
```

#### Accnts Propensity

```dax
VAR _prop = MAX('Account ARR'[ARR Propensity] /* DB: dataset:Account_ARR.ARR Propensity */)
VAR _will = MAX('Account ARR'[ARR Willingness] /* DB: dataset:Account_ARR.ARR Willingness */)

RETURN 
IF
    ( [Accnts CQ ARRAVG] > 0, 
    _prop,
    _will
    )
```

#### AccountEngagementStageStatus

```dax
VAR CountStage = 
   CALCULATE(
       DISTINCTCOUNT('Account Engagement Stage'[ACCOUNT_ENGAGEMENT_STAGE] /* DB: dataset:Account_Engagement_Stage.ACCOUNT_ENGAGEMENT_STAGE */),
       FILTER(
           'Account Engagement Stage',
           [ARRAVG SubID] > 0
       )
   )
RETURN
IF(
   CountStage = 1,
   CALCULATE(
       MIN('Account Engagement Stage'[ACCOUNT_ENGAGEMENT_STAGE] /* DB: dataset:Account_Engagement_Stage.ACCOUNT_ENGAGEMENT_STAGE */),
       FILTER(
           'Account Engagement Stage',
           [ARRAVG SubID] > 0
       )
),
   "" )
```

#### AccountTenureStatus

```dax
VAR CountTenure =
    CALCULATE(
        DISTINCTCOUNT('Account Sub Market Area Metadata'[ACCOUNT_TENURE] /* DB: dataset:Account_Sub_MA_Metadata.ACCOUNT_TENURE */),
        FILTER(
            'Account Sub Market Area Metadata',
            [ARRAVG SubID] > 0
        )
    )
RETURN
IF(
    CountTenure = 1,
    CALCULATE(
        MIN('Account Sub Market Area Metadata'[ACCOUNT_TENURE] /* DB: dataset:Account_Sub_MA_Metadata.ACCOUNT_TENURE */),
        FILTER(
            'Account Sub Market Area Metadata',
            [ARRAVG SubID] > 0
        )
    ),
    ""
)
```

#### Accounts Count

```dax
VAR QTR_BKT = SELECTEDVALUE('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)

VAR TM1 = CALCULATE(DISTINCTCOUNT('TM1 Bookings'[ACCOUNT_ID] /* DB: dataset:TM1_Bookings.ACCOUNT_ID */), ALL('Daily Weekly Switch'[Frequency]),ALL('Snapshot Quarter'))

RETURN

IF(QTR_BKT < 0, TM1,CALCULATE(DISTINCTCOUNT(Pipeline[ACCOUNT_ID])))

/*COUNTROWS(
        SUMMARIZECOLUMNS(Account[ACCOUNT_ID], 
                        "rbob", [OPPTY $])
        )*/
```

#### Analyse_Renewal Rate

```dax
if([RBOB ATTAINMENT % _L3]=0,BLANK(),[RBOB ATTAINMENT % _L3])
```

#### Analyze Upsell Attach Rate% Ret

```dax
VAR _renewal = CALCULATE([OPPTY $], 'Upsell Type'[UPSELL_TYPE] /* DB: dataset:Upsell_Type.UPSELL_TYPE */ = "Renewal Upsell"
, 'Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */ = TRUE
, 'Daily Weekly Switch'[Frequency] = "Daily"
, 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ >= 0
)

VAR prev_renewal = CALCULATE([OPPTY $], 'Upsell Type'[UPSELL_TYPE] /* DB: dataset:Upsell_Type.UPSELL_TYPE */ = "Renewal Upsell"
, Pipeline[IS_EOQ] = "TRUE"
, 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ < 0
)
VAR RenewalUpsell = _renewal + prev_renewal
VAR RBOB = CALCULATE([RBOB w/o PQ Trail])

Var Result = DIVIDE(RenewalUpsell, RBOB)
Return
IF(HASONEVALUE('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */)
  || HASONEVALUE('Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */),
  BLANK(),
  Result
)
```

#### BOOKINGS TARGET H1

```dax
VAR CYear = CALCULATE(
    MIN( 'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.CLOSE_YR */ ),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)

VAR Result = CALCULATE(
    [BOOKINGS TARGET],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0,
    'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.CLOSE_YR */ = CYear,
    'Close Quarter'[CLOSE_GENERIC_QTR] /* DB: vw_EBI_Caldate.CLOSE_GENERIC_QTR */ IN {"Q1","Q2"}
)

RETURN Result
```

#### BOQ ARR

```dax
VAR BOQ = CALCULATE([BOQ ARR $], REMOVEFILTERS('Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */))
    
RETURN IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */)
       || HASONEVALUE('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */)
       || HASONEVALUE('Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */),
       BLANK(), BOQ
    )
```

#### BSC Button Navigation

```dax
VAR _URL = "https://app.powerbi.com/groups/me/apps/1e2a60c4-9d35-4084-8266-8c41332fafdb/reports/b6e67ce3-5a6a-471b-b07b-a4e8a0594df8/20574b637b3b2e260de3?ctid=fa7b1b5a-7b34-4387-94ae-d2c178decee1&experience=power-bi"
VAR LoggedInUser = USERPRINCIPALNAME()
VAR Position = SEARCH(
    "@",
    LoggedInUser,,
    0
)
VAR LDAP = LEFT(LoggedInUser,Position - 1)
// "JONATHANA"

VAR isTrueNonEMEARep = IF(CALCULATE(
    MIN( 'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */ ),
    'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */ = LDAP,
    'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
    'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
    'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ = "DX"
    ) = LDAP
    && DISTINCTCOUNT('Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */) = 1
    && SELECTEDVALUE('Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */) = "AE"
    && MIN('Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */) <> "EMEA",
    TRUE(),
    FALSE()
)

VAR isTrueNonEMEAFLM = IF(CALCULATE(
    MIN( 'Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */ ),
    'Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */ = LDAP,
    'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE(),
    'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
    'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ = "DX"
    ) = LDAP
    && DISTINCTCOUNT('Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */) = 1
    && SELECTEDVALUE('Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */) = "AE"
    && MIN('Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */) <> "EMEA",
    TRUE(),
    FALSE()
)

VAR isTrueNonEMEASLM = IF(
    CALCULATE(
        MIN( 'Region Hierarchy'[SLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM_LDAP */ ),
        'Region Hierarchy'[SLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM_LDAP */ = LDAP,
        'Region Hierarchy'[IS_TRUE_SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_SLM */ = TRUE(),
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ = "DX"
    ) = LDAP
    && DISTINCTCOUNT('Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */) = 1
    && SELECTEDVALUE('Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */) = "AE"
    && MIN('Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */) <> "EMEA",
    TRUE(),
    FALSE()
)

VAR isTrueNonEMEATLM = IF(
    CALCULATE(
        MIN( 'Region Hierarchy'[TLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM_LDAP */ ),
        'Region Hierarchy'[TLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM_LDAP */ = LDAP,
        'Region Hierarchy'[IS_TRUE_TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_TLM */ = TRUE(),
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ = "DX"
    ) = LDAP
    && DISTINCTCOUNT('Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */) = 1
    && SELECTEDVALUE('Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */) = "AE"
    && MIN('Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */) <> "EMEA",
    TRUE(),
    FALSE()
)

VAR result = IF( isTrueNonEMEARep || isTrueNonEMEAFLM || isTrueNonEMEASLM || isTrueNonEMEATLM,
 BLANK(), _URL )

RETURN result
```

#### BSC Button border

```dax
VAR LoggedInUser = USERPRINCIPALNAME()
VAR Position = SEARCH(
    "@",
    LoggedInUser,,
    0
)
VAR LDAP = LEFT(LoggedInUser,Position - 1)
// "JONATHANA"

VAR isTrueNonEMEARep = IF(CALCULATE(
    MIN( 'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */ ),
    'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */ = LDAP,
    'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
    'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
    'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ = "DX"
    ) = LDAP
    && DISTINCTCOUNT('Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */) = 1
    && SELECTEDVALUE('Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */) = "AE"
    && MIN('Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */) <> "EMEA",
    TRUE(),
    FALSE()
)

VAR isTrueNonEMEAFLM = IF(CALCULATE(
    MIN( 'Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */ ),
    'Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */ = LDAP,
    'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE(),
    'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
    'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ = "DX"
    ) = LDAP
    && DISTINCTCOUNT('Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */) = 1
    && SELECTEDVALUE('Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */) = "AE"
    && MIN('Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */) <> "EMEA",
    TRUE(),
    FALSE()
)

VAR isTrueNonEMEASLM = IF(
    CALCULATE(
        MIN( 'Region Hierarchy'[SLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM_LDAP */ ),
        'Region Hierarchy'[SLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM_LDAP */ = LDAP,
        'Region Hierarchy'[IS_TRUE_SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_SLM */ = TRUE(),
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ = "DX"
    ) = LDAP
    && DISTINCTCOUNT('Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */) = 1
    && SELECTEDVALUE('Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */) = "AE"
    && MIN('Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */) <> "EMEA",
    TRUE(),
    FALSE()
)

VAR isTrueNonEMEATLM = IF(
    CALCULATE(
        MIN( 'Region Hierarchy'[TLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM_LDAP */ ),
        'Region Hierarchy'[TLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM_LDAP */ = LDAP,
        'Region Hierarchy'[IS_TRUE_TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_TLM */ = TRUE(),
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ = "DX"
    ) = LDAP
    && DISTINCTCOUNT('Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */) = 1
    && SELECTEDVALUE('Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */) = "AE"
    && MIN('Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */) <> "EMEA",
    TRUE(),
    FALSE()
)

VAR EMEAcheck = IF( MAX('Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */) <> "EMEA", TRUE(), FALSE())
VAR result = IF( isTrueNonEMEARep || isTrueNonEMEAFLM || isTrueNonEMEASLM || isTrueNonEMEATLM,
 "#00000000" , "#0063D9" )

RETURN result
```

#### BSC Button text color

```dax
VAR LoggedInUser = USERPRINCIPALNAME()
VAR Position = SEARCH(
    "@",
    LoggedInUser,,
    0
)
VAR LDAP = LEFT(LoggedInUser,Position - 1)
// "JONATHANA"

VAR isTrueNonEMEARep = IF(CALCULATE(
    MIN( 'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */ ),
    'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */ = LDAP,
    'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
    'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
    'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ = "DX"
    ) = LDAP
    && DISTINCTCOUNT('Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */) = 1
    && SELECTEDVALUE('Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */) = "AE"
    && MIN('Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */) <> "EMEA",
    TRUE(),
    FALSE()
)

VAR isTrueNonEMEAFLM = IF(CALCULATE(
    MIN( 'Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */ ),
    'Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */ = LDAP,
    'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE(),
    'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
    'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ = "DX"
    ) = LDAP
    && DISTINCTCOUNT('Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */) = 1
    && SELECTEDVALUE('Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */) = "AE"
    && MIN('Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */) <> "EMEA",
    TRUE(),
    FALSE()
)

VAR isTrueNonEMEASLM = IF(
    CALCULATE(
        MIN( 'Region Hierarchy'[SLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM_LDAP */ ),
        'Region Hierarchy'[SLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM_LDAP */ = LDAP,
        'Region Hierarchy'[IS_TRUE_SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_SLM */ = TRUE(),
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ = "DX"
    ) = LDAP
    && DISTINCTCOUNT('Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */) = 1
    && SELECTEDVALUE('Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */) = "AE"
    && MIN('Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */) <> "EMEA",
    TRUE(),
    FALSE()
)

VAR isTrueNonEMEATLM = IF(
    CALCULATE(
        MIN( 'Region Hierarchy'[TLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM_LDAP */ ),
        'Region Hierarchy'[TLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM_LDAP */ = LDAP,
        'Region Hierarchy'[IS_TRUE_TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_TLM */ = TRUE(),
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ = "DX"
    ) = LDAP
    && DISTINCTCOUNT('Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */) = 1
    && SELECTEDVALUE('Region Hierarchy'[ROLE_TYPE_DISPLAY] /* DB: vw_TD_EBI_REGION_RPT_MASKED.ROLE_TYPE_DISPLAY */) = "AE"
    && MIN('Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */) <> "EMEA",
    TRUE(),
    FALSE()
)

VAR result = IF( 
    isTrueNonEMEARep || isTrueNonEMEAFLM || isTrueNonEMEASLM || isTrueNonEMEATLM,
 "#00000000" , "#0063D9" )

RETURN result
```

#### CJ status

```dax
VAR _drf = SELECTEDVALUE(Parameter_CJ[CJ])
RETURN
SWITCH(TRUE(),
     _drf = "iPOV", COUNT(Opportunity[IPOV_STATUS]),
     _drf = "Biz Case", COUNT(Opportunity[BUSINESS_CASE_STATUS]),
     _drf = "Dec Map", COUNT(Opportunity[DECISION_MAPPING_STATUS]),
     _drf = "Tech case", COUNT(Opportunity[TECHNICAL_CASE_STATUS]),
     _drf = "Mut Plan", COUNT(Opportunity[MUTUAL_PLAN_STATUS]),
     _drf = "CSP", COUNT(Opportunity[CSP_OR_HANDOFF_STATUS])
    )
```

#### CQ + 1 COVERAGE

```dax
IF (
    NOT HASONEVALUE ( Pipeline[DEAL_BAND_NEW] ),
    VAR covx =
        CALCULATE (
            '_Coverage Measures'[COVERAGE PIPE / TARGET LEFT TO GO X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1
        )
    RETURN
        IF ( ABS(covx) > 50, BLANK(), covx ),
    BLANK()
)
```

#### CQ + 1 STALLED %

```dax
CALCULATE([Stalled & Inactive %],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1)
```

#### CQ + 2 STALLED %

```dax
CALCULATE([Stalled & Inactive %],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 2)
```

#### CQ + 3 STALLED %

```dax
CALCULATE([Stalled & Inactive %],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 3)
```

#### CQ + N2Q S3 BoQ PIPE $

```dax
CALCULATE(
    [STAGE PROGRESSION ASV],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ >= 0 && 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 2,
    'Pipe Walk'[DAY_FLAG] /* DB: vw_TF_EBI_PIPE_WALK.DAY_FLAG */ = "QTD",
    'Pipe Walk'[PREV_SALES_STAGE] /* DB: vw_TF_EBI_PIPE_WALK.PREV_SALES_STAGE */ = "S3"
)
```

#### CQ + N2Q S3 TO S4 PROGRESSION $

```dax
IF (
    NOT HASONEVALUE ( Pipeline[DEAL_BAND_NEW] ),
    CALCULATE (
        [STAGE PROGRESSION ASV],
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ >= 0 && 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 2,
        'Pipe Walk'[DAY_FLAG] /* DB: vw_TF_EBI_PIPE_WALK.DAY_FLAG */ = "QTD",
        'Pipe Walk'[PREV_SALES_STAGE_DERIVED] /* DB: vw_TF_EBI_PIPE_WALK.PREV_SALES_STAGE_DERIVED */ IN { "S3", "In Qtr" },
        'Pipe Walk'[CURR_SALES_STAGE] /* DB: vw_TF_EBI_PIPE_WALK.CURR_SALES_STAGE */ = "S4"
    ),
    BLANK ()
)
```

#### CQ + N2Q S3 TO S4+ PROGRESSION %

```dax
IF (
    NOT HASONEVALUE( Pipeline[DEAL_BAND_NEW] ),
    DIVIDE( 
        CALCULATE(
            [STAGE PROGRESSION ASV],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ >= 0 && 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 2,
            'Pipe Walk'[DAY_FLAG] /* DB: vw_TF_EBI_PIPE_WALK.DAY_FLAG */ = "QTD",
            'Pipe Walk'[PREV_SALES_STAGE_DERIVED] /* DB: vw_TF_EBI_PIPE_WALK.PREV_SALES_STAGE_DERIVED */ IN { "S3", "In Qtr" },
            'Pipe Walk'[CURR_SALES_STAGE] /* DB: vw_TF_EBI_PIPE_WALK.CURR_SALES_STAGE */ IN { "S4", "S5", "S6", "S7", "Booked" }
        ),
        [CQ + N2Q S3 BoQ PIPE $], 
        0
    ),
    BLANK()
)
```

#### CQ + N2Q S3/4 TO S5+ PROGRESSION $

```dax
CALCULATE (
    [TRUE PROGRESSION QTD $],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ >= 0 && 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 2,
    'Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */ IN { "S5", "S6", "S7", "Booked" }
)
```

#### CQ + N2Q S3/4 TO S5+ PROGRESSION %

```dax
IF (
    NOT HASONEVALUE(Pipeline[DEAL_BAND_NEW]),
    DIVIDE([CQ + N2Q S3/4 TO S5+ PROGRESSION $], [TRUE PROGRESSION QTD], 0),
    BLANK()
)
```

#### CQ DRM Fct_UC $

```dax
[FORECAST $] + [UPSIDE COMMITTED $]
```

#### CQ MANAGER FORECAST %

```dax
VAR Pipe = CALCULATE(
    [MANAGER FORECAST CQ %],
    ALL('Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */),
    ALL('Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */)
)
// VAR Result = IF(
//     Pipe = BLANK(),
//     0,
//     Pipe
// )
RETURN Pipe
```

#### CQ RBOB w/o PQ Trail

```dax
CALCULATE([RBOB],NOT('Retention MetaData'[PIPELINE_RENEWAL] /* DB: vw_TD_EBI_Retention_MetaData.PIPELINE_RENEWAL */="PQ Trailing"),
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
                REMOVEFILTERS('Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */, 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */)
)
```

#### CQ Risk Category CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"
VAR _black = "#252423"
 
RETURN
SWITCH(TRUE(),
                MAX(Pipeline[CQ Risk Category]) = "High", _red,
                MAX(Pipeline[CQ Risk Category]) = "Low", _green
                
            )
```

#### CQ Risk Category DOAP

```dax
VAR cq = MAX('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)
VAR risk_cat = MAX(Pipeline[CQ Risk Category])
RETURN
IF(cq = 0 && risk_cat in {"High", "Low"}, 
"CQ Risk Category: " & risk_cat,""
)
```

#### CQ+1 Upsell $ Attach Rate

```dax
VAR RenewalUpsell = CALCULATE([OPPTY $], 'Upsell Type'[UPSELL_TYPE] /* DB: dataset:Upsell_Type.UPSELL_TYPE */ = "Renewal Upsell", 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,'Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */=TRUE)
VAR RBOB = CALCULATE([RBOB w/o PQ Trail], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1)

Var Result = DIVIDE(RenewalUpsell, RBOB)
Return
IF(HASONEVALUE('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */)
  || HASONEVALUE('Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */),
  BLANK(),
  Result
)
```

#### CQ+1_Attrition

```dax
CALCULATE([ARR IMPACT],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=1)
```

#### CQ+1_Gap to Plan

```dax
VAR res = CALCULATE([ARR IMPACT]-[RENEWALS ATTRITION $],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=1)

RETURN res
// IF( HASONEVALUE('Region Hierarchy'[TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM */)
//         || HASONEVALUE('Region Hierarchy'[SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM */)
//         || HASONEVALUE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */)
//         || HASONEVALUE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */),BLANK(),
//         res)
```

#### CQ+1_RBOB

```dax
CALCULATE([RBOB w/o PQ Trail],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=1)
```

#### CQ+1_Renewal Rate

```dax
var rr = CALCULATE([RBOB ATTAINMENT % _L3],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=1)
return IF(rr=0,Blank(),rr)
```

#### CQ+2 Upsell $ Attach Rate

```dax
VAR RenewalUpsell = CALCULATE([OPPTY $], 'Upsell Type'[UPSELL_TYPE] /* DB: dataset:Upsell_Type.UPSELL_TYPE */ = "Renewal Upsell", 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 2,'Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */=TRUE)
VAR RBOB = CALCULATE([RBOB w/o PQ Trail], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 2)

Var Result = DIVIDE(RenewalUpsell, RBOB)
Return
IF(HASONEVALUE('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */)
  || HASONEVALUE('Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */),
  BLANK(),
  Result
)
```

#### CQ+2_Attrition

```dax
CALCULATE([ARR IMPACT],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=2)
```

#### CQ+2_Gap to Plan

```dax
CALCULATE([ARR IMPACT]-[RENEWALS ATTRITION $],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=2)
```

#### CQ+2_RBOB

```dax
CALCULATE([RBOB w/o PQ Trail],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=2)
```

#### CQ+2_Renewal Rate

```dax
var rr = CALCULATE([RBOB ATTAINMENT % _L3],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=2)
return IF(rr=0,Blank(),rr)
```

#### CQ+3 Upsell $ Attach Rate

```dax
VAR RenewalUpsell = CALCULATE([OPPTY $], 'Upsell Type'[UPSELL_TYPE] /* DB: dataset:Upsell_Type.UPSELL_TYPE */ = "Renewal Upsell", 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 3,'Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */=TRUE)
VAR RBOB = CALCULATE([RBOB w/o PQ Trail], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 3)

Var Result = DIVIDE(RenewalUpsell, RBOB)
Return
IF(HASONEVALUE('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */)
  || HASONEVALUE('Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */),
  BLANK(),
  Result
)
```

#### CQ+3_Attrition

```dax
CALCULATE([ARR IMPACT],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=3)
```

#### CQ+3_Gap to Plan

```dax
CALCULATE([ARR IMPACT]-[RENEWALS ATTRITION $],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=3)
```

#### CQ+3_RBOB

```dax
CALCULATE([RBOB w/o PQ Trail],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=3)
```

#### CQ+3_Renewal Rate

```dax
var rr = CALCULATE([RBOB ATTAINMENT % _L3],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=3)
return IF(rr=0,Blank(),rr)
```

#### CQ_Attrition

```dax
CALCULATE([ARR IMPACT],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=0)
```

#### CQ_Best Case

```dax
CALCULATE([ARR IMPACT]+[Savables],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=0)
```

#### CQ_Gap to Plan

```dax
VAR res = CALCULATE([ARR IMPACT]-[RENEWALS ATTRITION $],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=0)

RETURN res
// IF( HASONEVALUE('Region Hierarchy'[TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM */)
//         || HASONEVALUE('Region Hierarchy'[SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM */)
//         || HASONEVALUE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */)
//         || HASONEVALUE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */),BLANK(),
//         res)
```

#### CQ_RBOB

```dax
CALCULATE([RBOB w/o PQ Trail],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=0)
```

#### CQ_Renewal Rate

```dax
var rr = CALCULATE([RBOB ATTAINMENT % _L3],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=0)
return IF(rr=0,Blank(),rr)
```

#### CQ_Worst Case

```dax
CALCULATE([ARR IMPACT]+[Additional Risks],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=0)
```

#### CSMCoverageStatus

```dax
VAR CountCoverage =
    CALCULATE(
        DISTINCTCOUNT('Account Sub Market Area Metadata'[CSM_COVERAGE] /* DB: dataset:Account_Sub_MA_Metadata.CSM_COVERAGE */),
        FILTER(
            'Account Sub Market Area Metadata',
            [ARRAVG SubID] > 0
        )
    )
RETURN
IF(
    CountCoverage = 1,
    CALCULATE(
        MIN('Account Sub Market Area Metadata'[CSM_COVERAGE] /* DB: dataset:Account_Sub_MA_Metadata.CSM_COVERAGE */),
        FILTER(
            'Account Sub Market Area Metadata',
            [ARRAVG SubID] > 0
        )
    ),
    ""
)
```

#### CY Bookings Target

```dax
CALCULATE (
    [BOOKINGS TARGET],
    'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0,
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
)
```

#### CY PROJECTION % WoW

```dax
VAR CYear = CALCULATE(
    MIN( 'Snapshot Quarter'[SNAPSHOT_YR] /* DB: vw_EBI_Caldate.SNAPSHOT_YR */ ),
    'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.SNAPSHOT_QTR_BKT */ = 0
)

VAR CurrentQTR = CALCULATE(
    MIN( 'Snapshot Quarter'[SNAPSHOT_GENERIC_QTR] /* DB: vw_EBI_Caldate.SNAPSHOT_GENERIC_QTR */ ),
    'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.SNAPSHOT_QTR_BKT */ = 0
)

VAR PQSnapshotDate = [PQ EOQ SNAPSHOT DATE]

VAR FQtr = CALCULATE(
    SUMX( vw_EBI_PROJECTION_CLOSE_RATIO,
    [UPSIDE FORECAST PIPE $] * vw_EBI_PROJECTION_CLOSE_RATIO[CLOSE_RATIO]
    ),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ > 0,
    // 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0",
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ IN {"S3", "S4", "S5+"},
    'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.CLOSE_YR */ = CYear
)

VAR PQtr = SWITCH(
    CurrentQTR,
    "Q2", CALCULATE(
        [WON $],
        'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.SNAPSHOT_DATE */ = PQSnapshotDate,
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1
    ),
    "Q3", CALCULATE(
        [WON $],
        'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.SNAPSHOT_DATE */ = PQSnapshotDate,
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1
    ) + CALCULATE(
        [WON $],
        'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.SNAPSHOT_QTR_BKT */ = -1,
        'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */ = "W1",
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = - 2
    ),
    "Q4", CALCULATE(
        [WON $],
        'Snapshot Quarter'[SNAPSHOT_DATE] /* DB: vw_EBI_Caldate.SNAPSHOT_DATE */ = PQSnapshotDate,
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1
    ) + CALCULATE(
        [WON $],
        'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.SNAPSHOT_QTR_BKT */ = -1,
        'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */ = "W1",
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = - 2
    ) + CALCULATE(
        [WON $],
        'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.SNAPSHOT_QTR_BKT */ = -2,
        'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */ = "W1",
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = - 3
    )
)

VAR CQtr = CALCULATE(
    [WON $] + [FORECAST $] + [UPSIDE COMMITTED $],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
    // ,'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
)

VAR BookingsTarget = CALCULATE(
    [BOOKINGS TARGET],
    'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.CLOSE_YR */ = CYear
)

VAR Result = DIVIDE(
    FQtr + PQtr + CQTR,
    BookingsTarget
)
        

RETURN Result
```

#### CY PROJECTION Bookings

```dax
VAR CYear = CALCULATE(
    MIN( 'Snapshot Quarter'[SNAPSHOT_YR] /* DB: vw_EBI_Caldate.SNAPSHOT_YR */ ),
    'Snapshot Quarter'[SNAPSHOT_QTR_BKT] /* DB: vw_EBI_Caldate.SNAPSHOT_QTR_BKT */ = 0
)
VAR BookingsTarget = CALCULATE(
    [BOOKINGS TARGET],
    'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.CLOSE_YR */ = CYear
)       

RETURN BookingsTarget
```

#### CY W+F+UC $

```dax
CALCULATE (
    [W+F+UC $],
    'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0,
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
)
```

#### CY W+F+UC %

```dax
DIVIDE([CY W+F+UC $], [CY Bookings Target])
```

#### CY projection Comp

```dax
VAR Num = [CY PROJECTION $]
    
VAR Den = [CY PROJECTION Bookings]
RETURN 
    REPT(UNICHAR(160),6) &
    "(" & FORMAT ( Num, "$#,,M" ) & "/"
        & FORMAT ( Den, "$#,,M" ) & ")"
```

#### Change Indicator SVG

```dax
VAR Change = ([PERFORMANCE YTD %] - [PW Performance YTD %])*100
VAR ArrowUp = "M10 15 L20 5 L30 15 Z"  // Triangle arrow pointing up
VAR ArrowDown = "M10 5 L20 15 L30 5 Z" // Triangle arrow pointing down

VAR ColorArrow = 
    IF(Change >= 0, "#28a745", "#dc3545") // Green or Red
VAR ArrowShape = 
    IF(Change >= 0, ArrowUp, ArrowDown)

VAR ArrowSVG = 
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='20'>
        <polygon points='" & ArrowShape & "' fill='" & ColorArrow & "' />
        <text x='35' y='15' font-size='12' fill='black'>" & 
        FORMAT(Change, "0.0") & "%" & 
        "</text>
     </svg>"

VAR Diff = ([PERFORMANCE YTD %] - [PW Performance YTD %])*100
RETURN
    // "data:image/svg+xml;utf8," & ArrowSVG
IF(Diff > 0, "green", "red")
```

#### Close Week CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"
VAR _black = "#252423"
VAR RiskCategory = SELECTEDVALUE(Pipeline[CQ Risk Category])
VAR CloseWeek   = SELECTEDVALUE('Close Quarter'[WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEK_NUMBER */)
 
VAR result =
SWITCH(TRUE(),
               RiskCategory in {"High","Low"} && CloseWeek in {"W12","W13"} , _red
                              
            )
RETURN
result
```

#### Creation L3 font CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"

var _rule = SWITCH(TRUE(),
  [GROSS CREATION QTD %] >= 0.9, _green,
  [GROSS CREATION QTD %] >= 0.8, _yellow,
  [GROSS CREATION QTD %] < 0.8, _red
)

RETURN _rule
```

#### Cumm Bookings Target

```dax
CALCULATE([BOOKINGS TARGET], 
        'Pipe Walk'[FISCALWEEKNUMBER] /* DB: vw_TF_EBI_PIPE_WALK.FISCALWEEKNUMBER */ < MAX('Pipe Walk'[FISCALWEEKNUMBER] /* DB: vw_TF_EBI_PIPE_WALK.FISCALWEEKNUMBER */)
        )
```

#### Cumm Stage progression asv

```dax
CALCULATE([STAGE PROGRESSION ASV], 
        'Pipe Walk'[FISCALWEEKNUMBER] /* DB: vw_TF_EBI_PIPE_WALK.FISCALWEEKNUMBER */ <= MAX('Pipe Walk'[FISCALWEEKNUMBER] /* DB: vw_TF_EBI_PIPE_WALK.FISCALWEEKNUMBER */)
        )
```

#### CustomerHealthStatus

```dax
VAR CountHealth =
    CALCULATE(
        DISTINCTCOUNT('Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */),
        FILTER(
            'Customer Health',
           
             [ARRAVG SubID] > 0
        )
    )
RETURN
IF(
    CountHealth = 1,
    CALCULATE(
        MIN('Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */),
        FILTER(
            'Customer Health',
           [ARRAVG SubID] > 0
        )
    ),
    ""
)
```

#### DRF status

```dax
VAR _drf = SELECTEDVALUE(Parameter_DRF_Status[DRF])
RETURN
SWITCH(TRUE(),
     _drf = "Customer Challenge", COUNT(Opportunity[CUSTOMER_CHALLENGE]),
     _drf = "Solution", COUNT(Opportunity[SOLUTION]),
     _drf = "Value", COUNT(Opportunity[VALUE]),
     _drf = "Power", COUNT(Opportunity[POWER]),
     _drf = "Timing", COUNT(Opportunity[TIMING]),
     _drf = "Plan", COUNT(Opportunity[PLAN])
    )
```

#### Deal_Sensei_Score

```dax
var DS_Score=sum(Opportunity[DS_SCORE])
Return
if(isblank(DS_Score),BLANK(),DS_Score)
```

#### Diff MOPG ARR

```dax
VAR FirstPeriod =
    CALCULATE (
        MIN ( 'Close Quarter'[CLOSE_YR_AND_QTR] /* DB: vw_EBI_Caldate.CLOSE_YR_AND_QTR */ ),
        FILTER (
            ALL ( 'Close Quarter' ),
            'Close Quarter'[CLOSE_YR_AND_QTR] /* DB: vw_EBI_Caldate.CLOSE_YR_AND_QTR */ >= 20221
                && NOT(ISBLANK([BOQ ARR $])) 
        )
    )
VAR LastPeriod =
    CALCULATE (
        MAX ( 'Close Quarter'[CLOSE_YR_AND_QTR] /* DB: vw_EBI_Caldate.CLOSE_YR_AND_QTR */ ),
        FILTER (
            ALL ( 'Close Quarter' ),
            'Close Quarter'[CLOSE_YR_AND_QTR] /* DB: vw_EBI_Caldate.CLOSE_YR_AND_QTR */ >= 20221 && 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0
                && NOT(ISBLANK([BOQ ARR $]))
        )
    )
VAR FirstSales =
    CALCULATE (
        [BOQ ARR $],
        KEEPFILTERS ( 'Close Quarter'[CLOSE_YR_AND_QTR] /* DB: vw_EBI_Caldate.CLOSE_YR_AND_QTR */ = FirstPeriod )
    )
VAR LastSales =
    CALCULATE (
        [BOQ ARR $],
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0 )

VAR _diff = LastSales - FirstSales

VAR _result = DIVIDE(_diff, FirstSales)

RETURN
IF(
    ISBLANK(_result),
    "NA",
    IF(_result = -1, "LOST", FORMAT(_result, "0.0%"))
)
```

#### Downsell Deal #

```dax
CALCULATE([RENEWAL #],'Retention MetaData'[RENEWAL_TYPE] /* DB: vw_TD_EBI_Retention_MetaData.RENEWAL_TYPE */ = "Downsell")
```

#### Dynamic Callout

```dax
VAR LoggedInUser = USERPRINCIPALNAME()
VAR Position = SEARCH(
    "@",
    LoggedInUser,,
    0
)
VAR LDAP_login = LEFT(LoggedInUser,Position - 1)
VAR LDAP = VALUES(Masked_List[LDAP])

RETURN
IF( LDAP_login in LDAP ,
  "❗Germany rep/manager-level data will be disabled pending WoC approval.",
  ""
)
```

#### FLM COUNT

```dax
VAR flms =
CALCULATE(
    COUNTROWS(
        SUMMARIZE(
            'Region Hierarchy',
            'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */
        )    
    ),    
    'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE,
    'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
    'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
   -- 'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
    'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
    NOT CONTAINSSTRING('Region Hierarchy'[TERR_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_NAME */, "BDR"),
    NOT CONTAINSSTRING('Region Hierarchy'[TERR_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_NAME */, "-AAC "),
    NOT CONTAINSSTRING('Region Hierarchy'[TERR_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_NAME */, "-PAYMENT SERVICES-"),
    NOT CONTAINSSTRING('Region Hierarchy'[TERR_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TERR_ID */, "AE_Dummy")
)                    
VAR tot_flms = flms + [FLM_Extras]       
    RETURN
    tot_flms
```

#### FLM PART @75% YTD #

```dax
VAR flms =
       COUNTROWS(
        CALCULATETABLE(
        FILTER(
            SUMMARIZECOLUMNS( 'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,"Perf",[YTD PROJECTION % OCC]
            ),
            [Perf] >=0.75
        ),
        'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE,
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
        'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
     --   'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
        'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
        REMOVEFILTERS ( 'Target Type' )
    )
)
VAR tot = flms + [FLM_extras_YTDProjection]
RETURN
    IF ( tot = 0, BLANK (), tot )
```

#### FLM PART @75% YTD %

```dax
VAR flms = 
    IF (
        NOT HASONEVALUE(Pipeline[DEAL_BAND_NEW]),
        DIVIDE([FLM PART @75% YTD #], [FLM COUNT]),
        BLANK()
    )
RETURN 
    IF(flms <> 0, flms, BLANK())
```

#### FLM WITH >50% AE @75% YTD #

```dax
VAR flms =
       COUNTROWS(
        CALCULATETABLE(
        FILTER(
            SUMMARIZECOLUMNS('Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,"Perf",[FLM COUNT > 75 YTD CW %]
            ),
            [Perf] >=0.5
        ),
        'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE,
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
        'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
       -- 'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
        'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
        REMOVEFILTERS ( 'Target Type' )
    )
 )
var tot = flms + [FLM_EXTRAS_FLM WITH >50% AE @75% YTD #]

RETURN
    IF ( tot = 0, BLANK (), tot )
```

#### FLM WITH >50% AE @75% YTD %

```dax
VAR flms = 
    IF (
        HASONEVALUE ( 'Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */ )
        || HASONEVALUE(Segment[SEGMENT_GROUP])
        || HASONEVALUE(Segment[SEGMENT_DISPLAY]),
        BLANK(),
        DIVIDE([FLM WITH >50% AE @75% YTD #], [FLM COUNT])
    )

RETURN 
    IF(flms <> 0, flms, BLANK())
```

#### FLM_EXTRAS_FLM WITH >50% AE @75% YTD #

```dax
VAR flms =
       COUNTROWS(
        CALCULATETABLE(
       FILTER(
            SUMMARIZECOLUMNS('Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,"Perf",[FLM COUNT > 75 YTD CW %]
            ),
            [Perf] >=0.5
        ),
        'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */ IN { "JVIKAS"/*, "REABY"*/ },
        'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = FALSE,
        REMOVEFILTERS ( 'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ ),
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
        'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
       -- 'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
        'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
        REMOVEFILTERS ( 'Target Type' )
    )
)
RETURN
    IF ( flms = 0, BLANK (), flms )
```

#### FLM_Extras

```dax
VAR flms =
CALCULATE(
    COUNTROWS(
        SUMMARIZE(
            'Region Hierarchy',
            'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */
        )    
    ),    
  'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */ IN { "JVIKAS"/*, "REABY"*/ },
    'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = FALSE,
    REMOVEFILTERS ( 'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ ),
    'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
    'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
   -- 'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
    'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" }
   
)                    
        
    RETURN flms
```

#### FLM_extras_YTDProjection

```dax
VAR flms =
       COUNTROWS(
        CALCULATETABLE(
        FILTER(
            SUMMARIZECOLUMNS( 'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,"Perf",[YTD PROJECTION % OCC]
            ),
            [Perf] >=0.75
        ),
        'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */ IN { "JVIKAS"/*, "REABY" */},
        'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = FALSE,
         REMOVEFILTERS ( 'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ ),
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
        'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
      --  'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
        'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
         REMOVEFILTERS ( 'Target Type' )
    )
)

RETURN flms
```

#### FP AE Total

```dax
CALCULATE([AE TOTAL],FILTER(
        'Region Hierarchy',
        'Region Hierarchy'[REGION_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REGION_ID */ IN VALUES(Quota[REGION_ID])
    )
)
```

#### FP AE in seat

```dax
CALCULATE([AE IN SEAT],FILTER(
        'Region Hierarchy',
        'Region Hierarchy'[REGION_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REGION_ID */ IN VALUES(Quota[REGION_ID])
    )
)
```

#### FY Upsell $ Attach Rate

```dax
VAR RenewalUpsell = CALCULATE([OPPTY $], 'Upsell Type'[UPSELL_TYPE] /* DB: dataset:Upsell_Type.UPSELL_TYPE */ = "Renewal Upsell", 'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0,'Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */=TRUE)
VAR RBOB = CALCULATE([RBOB w/o PQ Trail], 'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0)

Var Result = DIVIDE(RenewalUpsell, RBOB)
Return
IF(HASONEVALUE('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */)
  || HASONEVALUE('Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */),
  BLANK(),
  Result
)
```

#### FY Upsell $ Attach_RetL3

```dax
CALCULATE([FY Upsell $ Attach Rate])
```

#### FY_Attrition

```dax
CALCULATE([ARR IMPACT],'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */=0)
```

#### FY_Best Case

```dax
CALCULATE([ARR IMPACT]+[Savables],'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */=0)
```

#### FY_Gap to Plan

```dax
CALCULATE([ARR IMPACT]-[RENEWALS ATTRITION $],'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */=0)
```

#### FY_RBOB

```dax
VAR res = CALCULATE([RBOB w/o PQ Trail],'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */=0)

RETURN res
// IF( HASONEVALUE('Region Hierarchy'[TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM */)
//         || HASONEVALUE('Region Hierarchy'[SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM */)
//         || HASONEVALUE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */)
//         || HASONEVALUE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */),BLANK(),
//         res)
```

#### FY_Renewal Rate

```dax
var rr = CALCULATE([RBOB ATTAINMENT % _L3],'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */=0)
return IF(rr=0,Blank(),rr)
```

#### FY_Worst Case

```dax
CALCULATE([ARR IMPACT]+[Additional Risks],'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */=0)
```

#### Full Attrition Deal #

```dax
CALCULATE([RENEWAL #],'Retention MetaData'[RENEWAL_TYPE] /* DB: vw_TD_EBI_Retention_MetaData.RENEWAL_TYPE */ = "Lost")
```

#### GNARR Comp.

```dax
// REPT ( UNICHAR ( 160 ), 2 ) & 
    "("
    & FORMAT ( [W+F+UC $]/1000000, "$#,##0.0M" ) & "/"
    & FORMAT ( [BOOKINGS TARGET]/1000000, "$#,##0.0M" ) & ")"
```

#### Gap to Plan OL $

```dax
[BOOKINGS TARGET] - [W+F+UC $ OL]
```

#### Green %

```dax
Var Num = [Green #_Ac_H]
Var Den =  [Child Accounts]

RETURN

IF( HASONEVALUE('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */)
      || HASONEVALUE('Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */)
      || HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */),
      BLANK(),   
    DIVIDE(Num, Den)
)
```

#### Green health renewing flat

```dax
VAR result =
    CALCULATE (
        [RENEWAL #],
        'Retention MetaData'[RENEWAL_TYPE] /* DB: vw_TD_EBI_Retention_MetaData.RENEWAL_TYPE */ = "Flat",
        'Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ = "Green"
       
    )
RETURN
    IF (
        HASONEVALUE ( 'Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ ),
        BLANK (),
        result
    )
```

#### Gross Creation QTD Comp.

```dax
//  REPT(UNICHAR(160),2) &
"("
    & FORMAT ( [CQ Gross Created QTD] / 1000000, "$#,##0.0M" ) & "/"
    & FORMAT ( [CQ Gross Creation QTD] / 1000000, "$#,##0.0M" ) & ")"
```

#### Gross Creation YTD Comp.

```dax
// REPT ( UNICHAR ( 160 ), 2 ) & 
    "("
    & FORMAT ( [GROSS CREATED YTD $] / 1000000, "$#,##0.0M" ) & "/"
    & FORMAT ( [GROSS CREATION YTD] / 1000000, "$#,##0.0M" ) & ")"
```

#### LTG with Low Consumption

```dax
// SUMMARIZECOLUMNS( 'Retention MetaData'[RETENTION_METADATA_ID] /* DB: vw_TD_EBI_Retention_MetaData.RETENTION_METADATA_ID */, 'Retention MetaData'[LINE_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.LINE_CATEGORY */

        CALCULATE([RENEWAL #], 
        FILTER('Product Consumption', [Product Consumption %] < 0.8))
```

#### LTG with R/Y Soln Health

```dax
VAR result =
    CALCULATE (
        [RENEWAL #],
        'Retention MetaData'[OUTLOOK_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.OUTLOOK_CATEGORY */ = "Left to go",
        'Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ IN { "Red", "Yellow" }
    )
RETURN
    IF (
        HASONEVALUE ( 'Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ ),
        BLANK (),
        result
    )
```

#### LUC Flag Deal List

```dax
VAR _user = USERPRINCIPALNAME()
VAR _param = [GROSS CREATED QTD $]
VAR Cond1 = 
IF(
     MAX('Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */)="EMEA" &&
        ISINSCOPE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */) 
        || 
        ISINSCOPE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */)  
        
    , BLANK(),
    _param
    )

VAR Cond2 = 
    IF(
    _user  IN VALUES('Masking Users'[USER_EMAIL] /* DB: dataset:Masking_Users.USER_EMAIL */)  &&
    MAX('Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */)="EMEA" &&
    (
    ISINSCOPE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */)  ||
    ISINSCOPE('Region Hierarchy'[SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM */)  ||
    ISINSCOPE('Region Hierarchy'[TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM */)  ||
    ISINSCOPE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */) 
    ), 
    BLANK(),
    _param
    )

RETURN 
        IF(_user = "dammann@adobe.com", Cond1, Cond2)
```

#### Low CJ Adoption CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"
VAR _black = "#252423"
VAR RiskCategory = SELECTEDVALUE(Pipeline[CQ Risk Category])
VAR LowCJ   = SELECTEDVALUE(Opportunity[Low CJ Adoption])
 
VAR result =
SWITCH(TRUE(),
               RiskCategory in {"High","Low"} && LowCJ = "Yes" , _red
                              
            )
RETURN
result
```

#### Low Cov FP AE in seat

```dax
CALCULATE([FP AE in seat], 'OCC_Performance Cohort_Band'[Cohort Band] = "Low Coverage")
```

#### MANAGER FORECAST CQ % 2

```dax
CALCULATE(
    [W+F+UC %],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)
```

#### MANAGER FORECAST CY %

```dax
CALCULATE(
    [W+F+UC %],
    'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0,
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0,
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
)
```

#### MajorMinorSegmentStatus

```dax
VAR CountSegment =
    CALCULATE(
        DISTINCTCOUNT('Segment'[Major-Minor Segment] /* DB: vw_EBI_SEGMENT.Major-Minor Segment */),
        FILTER(
            'Segment',
            [ARRAVG SubID] > 0
        )
    )
RETURN
IF(
    CountSegment = 1,
    CALCULATE(
        MIN('Segment'[Major-Minor Segment] /* DB: vw_EBI_SEGMENT.Major-Minor Segment */),
        FILTER(
            'Segment',
            [ARRAVG SubID] > 0
        )
    ),
    ""
)
```

#### Masking DealList Visual Flag

```dax
VAR _user = USERPRINCIPALNAME()
VAR Cond1 = 
IF(
        
        (ISINSCOPE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */) 
        && MAX('Region Hierarchy'[IS_GERMANY_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_GERMANY_FLM */)=1
        ) 
        ||
        
        (ISINSCOPE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */) 
        && MAX('Region Hierarchy'[IS_GERMANY_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_GERMANY_REP */)=1
        )
    , 1,
   0
    )

VAR Cond2 = 
    IF(
     NOT ( _user  IN VALUES('Masking Users'[USER_EMAIL] /* DB: dataset:Masking_Users.USER_EMAIL */) )  &&
    MAX('Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */)="EMEA" &&
    (
    (ISINSCOPE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */) && MAX('Region Hierarchy'[IS_GERMANY_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_GERMANY_FLM */)) ||
    (ISINSCOPE('Region Hierarchy'[SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM */) && MAX('Region Hierarchy'[IS_GERMANY_SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_GERMANY_SLM */)) ||
    (ISINSCOPE('Region Hierarchy'[TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM */) && MAX('Region Hierarchy'[IS_GERMANY_TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_GERMANY_TLM */) ) ||
    (ISINSCOPE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */) && MAX('Region Hierarchy'[IS_GERMANY_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_GERMANY_REP */))
    ), 
    1,
    0
    )

RETURN 
    IF(_user in { "taliyan@adobe.com", "joostavp@adobe.com" } , Cond1, Cond2)
```

#### Mature Pipe SS5+ (Q+1) numeric

```dax
ROUND(
        CALCULATE(
            [COVERAGE MATURE PIPE / BOOKINGS TARGET X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0",
            REMOVEFILTERS('Close Quarter')
        ),
    1
    )
```

#### Mature Pipe SS5+ (Q+2) numeric

```dax
ROUND(
        CALCULATE(
            [COVERAGE MATURE PIPE / BOOKINGS TARGET X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 2,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    1
    )
```

#### Mature Pipe SS5+ (Q+3) numeric

```dax
ROUND(
        CALCULATE(
            [COVERAGE MATURE PIPE / BOOKINGS TARGET X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 3,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    1
    )
```

#### Mature Pipe SS5+ (R4Q)

```dax
VAR Num =
    CALCULATE (
        [SS5+ $],
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ IN {0,1,2,3},
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
    )
VAR Den =
    CALCULATE (
        [TARGET LEFT TO GO $],
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ IN {0,1,2,3},
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
    )
RETURN
    CONVERT( ROUND(
        DIVIDE(Num, Den),
    1
    ),
    STRING
) & "x"
```

#### Mature Pipe SS5+ CQ

```dax
CONVERT(
    ROUND(
        CALCULATE(
            DIVIDE([SS5+ $], '_Target Measures'[TARGET LEFT TO GO $]),
            // [COVERAGE MATURE PIPE / BOOKINGS TARGET X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    1
    ),
    STRING
) & "x"
```

#### Net ARR

```dax
[W+F+UC $]+[ARR IMPACT]
```

#### OCC_SelectedOption

```dax
//SELECTEDVALUE('TopN SQLID Filter'[TopN], "All")
Blank()
```

#### OL YTD attain

```dax
CALCULATE([W+F+UC YTD %], REMOVEFILTERS('Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */))
```

#### PERFORMANCE H1 %

```dax
VAR PerfPCT = DIVIDE(
    [W+F+UC PIPE H1 $],
    [BOOKINGS TARGET H1]
)


RETURN PerfPCT
```

#### PW Performance YTD %

```dax
VAR WFUC = CALCULATE(
    [PERFORMANCE YTD %],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
    ALL('Snapshot Quarter')
)

VAR Result = IF(
    WFUC = BLANK(),
    0,
    WFUC
)

RETURN Result
```

#### PW W+F+UC $

```dax
VAR WFUC = CALCULATE(
    [W+F+UC $],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
    ALL('Snapshot Quarter'),
    ALL('Daily Weekly Switch')
)

// VAR Result = IF(
//     WFUC = BLANK(),
//     0,
//     WFUC
// )

RETURN WFUC
```

#### PW YTD PROJECTION % OCC

```dax
VAR Pipe = CALCULATE( [YTD PROJECTION % OCC],
    // [PERFORMANCE YTD %],
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
    ALL('Snapshot Quarter')
)

RETURN Pipe
```

#### PaidSupportStatus

```dax
VAR CountSupport = 
   CALCULATE(
       DISTINCTCOUNT('Account Sub Market Area Metadata'[HAS_PAID_SUPPORT] /* DB: dataset:Account_Sub_MA_Metadata.HAS_PAID_SUPPORT */),
       FILTER(
           'Account Sub Market Area Metadata',
           [ARRAVG SubID] > 0
       )
   )
VAR SupportValue = 
   CALCULATE(
       MIN('Account Sub Market Area Metadata'[HAS_PAID_SUPPORT] /* DB: dataset:Account_Sub_MA_Metadata.HAS_PAID_SUPPORT */),
       FILTER(
           'Account Sub Market Area Metadata',
           [ARRAVG SubID] > 0
       )
   )
RETURN
IF(
   CountSupport = 1,
   IF(SupportValue = 1, "Yes", "No"),
   ""
)
```

#### Param Gap CW

```dax
VAR result = [GAP -VE OPPTY VS CREATION TARGET WTD $]

RETURN
    IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */),
        BLANK(),
        result )
```

#### Param Target CW

```dax
VAR result =  [GROSS CREATION WTD]

RETURN
    IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */),
        BLANK(),
        result )
```

#### Param Target Full Qtr

```dax
VAR result = [FULL QUARTER GROSS CREATION]

RETURN
    IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */),
        BLANK(),
        result )
```

#### Param Target QTD

```dax
VAR result = [GROSS CREATION QTD]

RETURN
    IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */),
        BLANK(),
        result )
```

#### Param Tier 1 Parent with No pipe

```dax
VAR result = CALCULATE([TIER 1 PRNT WITHOUT GNARR #],'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */="Active")

RETURN
    IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */),
        BLANK(),
        result )
```

#### Parent count

```dax
DISTINCTCOUNT(TPT[ACCOUNT_PRNT_ID])
```

#### ParentID Count

```dax
CALCULATE (
    COUNTROWS (
        FILTER (
            SUMMARIZECOLUMNS ( 'Account Parent'[PRNT_ID] /* DB: dataset:Account_Parent.PRNT_ID */, "ARR_", [ARR $] ),
            [ARR_] > 0
        )
    ),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1
)
```

#### Participation QTD Comp

```dax
VAR Num = CALCULATE([W+F+UC $], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)
    
VAR Den = CALCULATE([BOOKINGS TARGET], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)
RETURN 
    REPT(UNICHAR(160),10) &
    "(" & FORMAT ( Num, "#,,M" ) & "/"
        & FORMAT ( Den, "#,,M" ) & ")"
```

#### Participation YTD Comp

```dax
VAR Num = [CY W+F+UC $]
    
VAR Den = [CY Bookings Target]
RETURN 
    REPT(UNICHAR(160),10) &
    "(" & FORMAT ( Num, "#,,M" ) & "/"
        & FORMAT ( Den, "#,,M" ) & ")"
```

#### Pipe $ R6Q

```dax
CALCULATE (
        [PIPE $],
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ IN {0,1,2,3,4,5}
    )
```

#### Pipe Forecast Active

```dax
CALCULATE([FORECAST $],
            'Pipe Walk'[STALLED_BUT_INACTIVE] /* DB: vw_TF_EBI_PIPE_WALK.STALLED_BUT_INACTIVE */ = "Active"
        )
```

#### Pipe Forecast Stalled

```dax
CALCULATE([FORECAST $],
            'Pipe Walk'[STALLED_BUT_INACTIVE] /* DB: vw_TF_EBI_PIPE_WALK.STALLED_BUT_INACTIVE */ = "Stalled & Inactive"
        )
```

#### Pipe by Soln Grp Or Rev band title

```dax
VAR _sel = SELECTEDVALUE(SolutionGrp_ParentRevBand[Value4])
RETURN
SWITCH(TRUE(),
_sel= "Solution", "Pipe By Soln Grp",
_sel= "Rev Band", "Pipe By Prnt Rev Band"
)
```

#### Prediction

```dax
BLANK()
```

#### Prev 4 Qtrs Lost

```dax
CALCULATE( [OPPTY $],
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ = "Lost",
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ in {-1, -2, -3, -4}
)
```

#### Products_Ret

```dax
CONCATENATEX(SUMMARIZE(FILTER(Retention, Retention[Retention_ID] = Retention[Retention_ID]),OPG[MOPG1]), OPG[MOPG1],",")
```

#### Propensity

```dax
LEFT(FORMAT(IF( '_Account ARR Measures'[ARR $] > 0, [Propensity To Buy], [Willingness To Engage]),"0.00%"),4)
```

#### Propensity To Buy

```dax
CALCULATE(MAX('Customer Profile Attributes'[PROPENSITY_TO_BUY] /* DB: dataset:Customer_Profile_Attributes.PROPENSITY_TO_BUY */),
FILTER('Account ARR', NOT(ISBLANK('Account ARR'[ARR] /* DB: dataset:Account_ARR.ARR */))
))
```

#### Push Flag CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"
VAR _black = "#252423"
VAR RiskCategory = SELECTEDVALUE(Pipeline[CQ Risk Category])
VAR PushedCount   = sum(Opportunity[PUSHED_COUNT])
 
VAR result =
SWITCH(TRUE(),
               RiskCategory in {"High","Low"} && PushedCount >= 2 , _red
                              
            )
RETURN
result
```

#### QoQ ARRAVG

```dax
VAR _cq = [CQ ARRAVG SubId]
VAR _pq = [PQ ARRAVG SubId]
VAR Diff = (_cq - _pq)
VAR _result = DIVIDE(Diff,ABS(_pq))
RETURN _result
```

#### RBOB ATTAINMENT % _L3

```dax
VAR AttainmentPCT = DIVIDE(
    ([RBOB w/o PQ Trail]+[ARR Impact_OCC]),
    [RBOB w/o PQ Trail]
)
 
RETURN AttainmentPCT
```

#### RBOB ATTAINMENT % _OCC

```dax
VAR AttainmentPCT = DIVIDE(
    ([RBOB w/o PQ Trail]+[ARR Impact_OCC]),
    [RBOB w/o PQ Trail]
)
 
RETURN AttainmentPCT
```

#### RBOB w/o PQ Trail

```dax
CALCULATE([RBOB],NOT('Retention MetaData'[PIPELINE_RENEWAL] /* DB: vw_TD_EBI_Retention_MetaData.PIPELINE_RENEWAL */="PQ Trailing"),
                REMOVEFILTERS('Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */
                , 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */
                )
)
```

#### RBOB w/o PQ Trail WoW

```dax
CALCULATE([RBOB],NOT('Retention MetaData'[PIPELINE_RENEWAL] /* DB: vw_TD_EBI_Retention_MetaData.PIPELINE_RENEWAL */="PQ Trailing")
// , REMOVEFILTERS('Retention Snapshot Type'[SNAPSHOT_TYPE] /* DB: dataset:Retention_Snapshot_Type.SNAPSHOT_TYPE */)
// ,                REMOVEFILTERS('Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */, 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */)

)
```

#### RBOB w/o PQ Trail test

```dax
CALCULATE([RBOB],NOT('Retention MetaData'[PIPELINE_RENEWAL] /* DB: vw_TD_EBI_Retention_MetaData.PIPELINE_RENEWAL */="PQ Trailing")
               
)
```

#### RBOB_SolHealth

```dax
CALCULATE([RBOB],OR('Retention MetaData'[LINE_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.LINE_CATEGORY */="System Line",AND('Retention MetaData'[LINE_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.LINE_CATEGORY */="Customer Adjustment",ISBLANK('Retention MetaData'[INTERNAL_SEGMENT_NET_OFF] /* DB: vw_TD_EBI_Retention_MetaData.INTERNAL_SEGMENT_NET_OFF */))),NOT('Retention MetaData'[PIPELINE_RENEWAL] /* DB: vw_TD_EBI_Retention_MetaData.PIPELINE_RENEWAL */="PQ Trailing"))
```

#### Red #

```dax
[Red #_Ac_H]
```

#### Red %

```dax
Var Num = [Red #]

Var Den = [Child Accounts]
RETURN
IF( HASONEVALUE('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */)
      || HASONEVALUE('Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */),
      BLANK(),   
    DIVIDE(Num, Den)
)
```

#### Renewal Rate

```dax
[RBOB ATTAINMENT % _L3]
```

#### Renewal qtr

```dax
CALCULATE( MIN('Renewal Quarter'[RENEWAL_QTR] /* DB: vw_EBI_Caldate.RENEWAL_QTR */),
FILTER(Retention, NOT(ISBLANK([RBOB]))),
'Renewal Quarter'[RENEWAL_QTR_BKT] /* DB: vw_EBI_Caldate.RENEWAL_QTR_BKT */ >= 0
)
```

#### Retention Accounts Count

```dax
COUNTROWS(
        SUMMARIZECOLUMNS(Account[ACCOUNT_ID], 
                        "rbob", [RBOB])
        )
```

#### S1/S2_$

```dax
CALCULATE(
    [OPPTY $],
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ = "S1-S2"
)
```

#### S3 CQ CovX

```dax
CONVERT(
    ROUND(
        CALCULATE(
            [COVERAGE PIPE / TARGET LEFT TO GO X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    1
    ),
    STRING
) & "x"
```

#### S3 Q+1 CovX (Numeric)

```dax
ROUND(
        CALCULATE(
            [COVERAGE PIPE / TARGET LEFT TO GO X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    1
    )
```

#### S3 Q+2 CovX (Numeric)

```dax
ROUND(
        CALCULATE(
            [COVERAGE PIPE / TARGET LEFT TO GO X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 2,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    1
    )
```

#### S3 Q+3 CovX (Numeric)

```dax
ROUND(
        CALCULATE(
            [COVERAGE PIPE / TARGET LEFT TO GO X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 3,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    1
    )
```

#### S3+ Cov R4Q

```dax
VAR res = 
    ROUND(
        CALCULATE(
            [COVERAGE PIPE / TARGET LEFT TO GO X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ IN {0,1,2,3},
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    1
    )
    
RETURN
    IF(NOT(ISBLANK(res)),
    CONVERT(res,
    STRING) & "x" )
```

#### S3_$

```dax
CALCULATE(
    [PIPE $],
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ = "S3"
)
```

#### S4_$

```dax
CALCULATE(
	[PIPE $],
	'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ = "S4"
)
```

#### S5+ COVERGAE TO GO CQ+1

```dax
VAR ToGo = CALCULATE(
    DIVIDE(                 ----using this instead of [S5+ COVERAGE LEFT TO GO %] as [S5+ COVERAGE LEFT TO GO %] has a blank check which is causing issues in Overview tab
    [SS5+ $],
    [TARGET LEFT TO GO $]
),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1
    
)
RETURN ToGo
```

#### SS3 Q+1 Cov Comp.

```dax
VAR Num =
    CALCULATE (
        [PIPE $],
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
    )
VAR Den =
    CALCULATE (
        [BOOKINGS TARGET],
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
    )
RETURN
// REPT(UNICHAR(160),2) &
    "(" & FORMAT ( Num/1000000, "$#,##0.0M" ) & "/"
        & FORMAT ( Den/1000000, "$#,##0.0M" ) & ")"
```

#### SS3 Q+2 Cov Comp.

```dax
VAR Num =
    CALCULATE (
        [PIPE $],
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 2,
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
    )
VAR Den =
    CALCULATE (
        [BOOKINGS TARGET],
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 2,
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
    )
RETURN
// REPT(UNICHAR(160),4) &
    "(" & FORMAT ( Num/1000000, "$#,##0.0M" ) & "/"
        & FORMAT ( Den/1000000, "$#,##0.0M" ) & ")"
```

#### SS3 Q+3 Cov Comp.

```dax
VAR Num =
    CALCULATE (
        [PIPE $],
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 3,
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
    )
VAR Den =
    CALCULATE (
        [BOOKINGS TARGET],
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 3,
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
    )
RETURN
// REPT(UNICHAR(160),6) &
    "(" & FORMAT ( Num/1000000, "$#,##0.0M" ) & "/"
        & FORMAT ( Den/1000000, "$#,##0.0M" ) & ")"
```

#### SS3 R4Q Cov Comp.

```dax
VAR Num =
    CALCULATE (
        [PIPE $],
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ IN {0,1,2,3},
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
    )
VAR Den_CQ =
    CALCULATE (
        [TARGET LEFT TO GO $],
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
    )
VAR Den_FQ =
    CALCULATE (
        [BOOKINGS TARGET],
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ IN {1,2,3},
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
    )
VAR Den = Den_CQ + Den_FQ
RETURN
// REPT(UNICHAR(160),2) &
    "(" & FORMAT ( Num/1000000, "$#,##0.0M" ) & "/"
        & FORMAT ( Den/1000000, "$#,##0.0M" ) & ")"
```

#### SS5 Q+1 Cov Comp.

```dax
VAR Num =
    CALCULATE (
        [SS5+ $],
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
    )
VAR Den =
    CALCULATE (
        [BOOKINGS TARGET],
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
    )
RETURN
// REPT(UNICHAR(160),6) &
    "(" & FORMAT ( Num/1000000, "$#,##0.0M" ) & "/"
        & FORMAT ( Den/1000000, "$#,##0.0M" ) & ")"
```

#### SS5 Q+2 Cov Comp.

```dax
VAR Num =
    CALCULATE (
        [SS5+ $],
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 2,
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
    )
VAR Den =
    CALCULATE (
        [BOOKINGS TARGET],
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 2,
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
    )
RETURN
// REPT(UNICHAR(160),6) &
    "(" & FORMAT ( Num/1000000, "$#,##0.0M" ) & "/"
        & FORMAT ( Den/1000000, "$#,##0.0M" ) & ")"
```

#### SS5 Q+3 Cov Comp.

```dax
VAR Num =
    CALCULATE (
        [SS5+ $],
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 3,
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
    )
VAR Den =
    CALCULATE (
        [BOOKINGS TARGET],
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 3,
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
    )
RETURN
// REPT(UNICHAR(160),6) &
    "(" & FORMAT ( Num/1000000, "$#,##0.0M" ) & "/"
        & FORMAT ( Den/1000000, "$#,##0.0M" ) & ")"
```

#### SS5 R4Q Cov Comp.

```dax
VAR Num =
    CALCULATE (
        [SS5+ $],
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ IN {0,1,2,3},
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
    )
VAR Den_CQ =
    CALCULATE (
        [TARGET LEFT TO GO $],
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
    )
VAR Den_FQ =
    CALCULATE (
        [BOOKINGS TARGET],
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ IN {1,2,3},
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
    )
VAR Den = Den_CQ + Den_FQ
RETURN
// REPT(UNICHAR(160),4) &
    "(" & FORMAT ( Num/1000000, "$#,##0.0M" ) & "/"
        & FORMAT ( Den/1000000, "$#,##0.0M" ) & ")"
```

#### SS5+_$

```dax
CALCULATE(
    '_Pipeline Measures'[PIPE $],
    'Sales Stage'[SalesStageGrp_Sort] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp_Sort */ = 2)
```

#### SVG CQ Risk Category

```dax
VAR SelectedQtr = SELECTEDVALUE ( 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ )
VAR CurrentQtr  = MAX ( 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ )
VAR RiskCat     = MAX(Pipeline[CQ Risk Category])

VAR cq = MAX('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)
VAR risk_cat = MAX(Pipeline[CQ Risk Category])
// RETURN
// IF(cq = 0 && risk_cat in {"High", "Low"}, 
// "CQ Risk Category: " & risk_cat,""
// )

VAR RiskColor =
    SWITCH (
        TRUE(),
        RiskCat = "High", "red",
        RiskCat = "Low",  "green",
        "black"
    )
VAR _svg = 
SELECTEDVALUE (
    'Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */,   -- or any column guaranteed to exist in your context
    "data:image/svg+xml;utf8," &
    "<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'>" &
    "  <circle cx='20' cy='20' r='18' fill='red' />" &
    "</svg>"
)



VAR _svg2 = 
// IF (
//     cq = 0 && risk_cat in {"High", "Low"},
//     "data:image/svg+xml;utf8," &
//     "<svg width='300' height='40' xmlns='http://www.w3.org/2000/svg' >" &
//         "<text x='0' y='25' font-size='20' fill='black'>Risk Category: </text>
//         <text x='150' y='25' font-size='20' fill='" & RiskColor & "'>" & RiskCat & "</text>
//     </svg>",
//     BLANK()
// )
"data:image/svg+xml;utf8," &
"<svg width=' 140' height=' 20' xmlns= 'http://www.w3.org/2000/svg' >" &
"<rect x='0' y= '4' width= '100' height='12' fill='#e0e0e0' rx='6' ry= '6'/>" &
"<rect x='0' y='4' width= '65' height='12' fill='#ffb300' rx='6' ry='6'/>" &
"<text x='10S' y='14' font-size='12' text-anchor='start' fill='#000' font-family='Segoe UI ' >65%</text>" &
"</svg>"

RETURN
    _svg
```

#### Sales Stage CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"
VAR _black = "#252423"
VAR RiskCategory = SELECTEDVALUE(Pipeline[CQ Risk Category])
VAR SalesStage   = SELECTEDVALUE('Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */)
 
VAR result =
SWITCH(TRUE(),
               RiskCategory in {"High","Low"} && SalesStage in {"S3","S4"} , _red
                              
            )
RETURN
result
```

#### ShowTop10OrAll

```dax
Blank()
// VAR SelectedOption = SELECTEDVALUE('TopN SQLID Filter'[TopN], "All")
// VAR Top10SQLIDs =
//     TOPN(
//         10,
//         ADDCOLUMNS(
//             SUMMARIZE('Retention Metadata', 'Retention Metadata'[SQL_ID]),
//             "RBOB_Value", [RBOB]
//         ),
//         [RBOB_Value],
//         DESC
//     )
// VAR CurrentSQLID = MAX('Retention Metadata'[SQL_ID])
// RETURN
// IF (
//     SelectedOption = "Top 10",
//     IF (
//         CurrentSQLID IN SELECTCOLUMNS(Top10SQLIDs, "SQL_ID", [SQL_ID]),
//         1,
//         0
//     ),
//     1
// )
```

#### Sol Green #

```dax
[Solution Green Count]
// CALCULATE(DISTINCTCOUNT('Account ARR'[acc_sol_key] /* DB: dataset:Account_ARR.acc_sol_key */), 'Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ = "Green")
```

#### Sol Green %

```dax
Var Den = [Solution Counts]

Var Num = [Sol Green #]

RETURN

DIVIDE(Num, Den)
```

#### Sol Green ARR

```dax
[CQ Sol ARR Green]
//  CALCULATE([ARR $], 'Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ = "Green")
```

#### Sol PYellow %

```dax
Var 
Den = [Solution Counts]

Var Num = [Sol Yellow #]

RETURN

DIVIDE(Num, Den)
```

#### Sol PYellow ARR

```dax
[CQ Sol ARR Yellow]
//  CALCULATE([ARR $], 'Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ = "Yellow")
```

#### Sol Red #

```dax
[Solution Red Count]
// CALCULATE(DISTINCTCOUNT('Account ARR'[acc_sol_key] /* DB: dataset:Account_ARR.acc_sol_key */), 'Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ = "Red")
```

#### Sol Red %

```dax
Var Den = [Solution Counts]

Var Num = [Sol Red #]

RETURN

DIVIDE(Num, Den)
```

#### Sol Red ARR

```dax
[CQ Sol ARR Red]
//  CALCULATE([ARR $], 'Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ = "Red")
```

#### Sol Yellow #

```dax
[Solution Yellow Count]
// CALCULATE(DISTINCTCOUNT('Account ARR'[acc_sol_key] /* DB: dataset:Account_ARR.acc_sol_key */), 'Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ = "Yellow")
```

#### Soln Grp Or Rev band title

```dax
VAR _sel = SELECTEDVALUE(SolutionGrp_ParentRevBand[Value4])
RETURN
SWITCH(TRUE(),
_sel= "Solution", "By Soln Grp",
_sel= "Rev Band", "By Prnt Rev Band"
)
```

#### Solution Health AOAP

```dax
CALCULATE(MAX('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */),
FILTER('Account ARR', NOT(ISBLANK('Account ARR'[ARR] /* DB: dataset:Account_ARR.ARR */))
))
```

#### Stage Duration CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"
VAR _black = "#252423"
VAR RiskCategory = SELECTEDVALUE(Pipeline[CQ Risk Category])
VAR stageduration = AVERAGE(Pipeline[STAGE_AGE])
 
VAR result =
SWITCH(TRUE(),
               RiskCategory in {"High","Low"} && stageduration >= 60 , _red
                              
            )
RETURN
result
```

#### Sub MA ARR

```dax
CALCULATE([Accnts CQ ARRAVG], ALL(OPG[MOPG1]))
```

#### Sub count

```dax
DISTINCTCOUNT(TPT[ACCOUNT_SUB_ID])
```

#### Sub_MA Count

```dax
CALCULATE (
    COUNTROWS (
        FILTER (
            SUMMARIZECOLUMNS ( 'Account ARR'[Sub_MA] /* DB: dataset:Account_ARR.Sub_MA */, "ARR_", [ARR $] ),
            [ARR_] > 0
        )
    ),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1
)
```

#### TM1 deal count

```dax
CALCULATE(DISTINCTCOUNT('TM1 Bookings'[OPP_ID] /* DB: dataset:TM1_Bookings.OPP_ID */),
                                  FILTER('TM1 Bookings','_TM1 Booking Measures'[TM1 Bookings $]>0) )
```

#### TOTAL PIPE COVERAGE (TO GO) CQ+2

```dax
VAR ToGo = CALCULATE(
            [COV X %],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 2
           
        )

VAR Result = IF(
    ToGo = BLANK(),
    0,
    ToGo
)

RETURN Result
```

#### TOTAL PIPE COVERAGE (TO GO) CQ+3

```dax
VAR ToGo =
    CALCULATE(
        [COV X %],
        KEEPFILTERS('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 3)
       
    )
RETURN
    IF(ISBLANK(ToGo), 0, ToGo)
```

#### TOTAL REPS

```dax
CALCULATE(
    COUNTROWS( 'Region Hierarchy' )
    --ALL( 'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ ),
    --ALL( 'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ )
    ,'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1
)
```

#### UltimateSupportStatus

```dax
VAR CountSupport = 
   CALCULATE(
       DISTINCTCOUNT('Account Sub Market Area Metadata'[HAS_ULTIMATE_SUPPORT] /* DB: dataset:Account_Sub_MA_Metadata.HAS_ULTIMATE_SUPPORT */),
       FILTER(
           'Account Sub Market Area Metadata',
           [ARRAVG SubID] > 0
       )
   )
VAR SupportValue = 
   CALCULATE(
       MIN('Account Sub Market Area Metadata'[HAS_ULTIMATE_SUPPORT] /* DB: dataset:Account_Sub_MA_Metadata.HAS_ULTIMATE_SUPPORT */),
       FILTER(
           'Account Sub Market Area Metadata',
           [ARRAVG SubID] > 0
       )
   )
RETURN
IF(
   CountSupport = 1,
   IF(SupportValue = 1, "Yes", "No"),
   ""
)
```

#### Upsell Attach Rate%

```dax
VAR RenewalUpsell = CALCULATE([OPPTY $], 'Upsell Type'[UPSELL_TYPE] /* DB: dataset:Upsell_Type.UPSELL_TYPE */ = "Renewal Upsell")
VAR RBOB = CALCULATE([RBOB])

Var Result = DIVIDE(RenewalUpsell, RBOB)
Return
IF(HASONEVALUE('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */)
  || HASONEVALUE('Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */),
  BLANK(),
  Result
)
```

#### W+F+UC $ H1

```dax
VAR CYear = CALCULATE(
    MIN( 'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.CLOSE_YR */ ),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)

VAR Result = CALCULATE(
    [W+F+UC $],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0,
    'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.CLOSE_YR */ = CYear,
    'Close Quarter'[CLOSE_GENERIC_QTR] /* DB: vw_EBI_Caldate.CLOSE_GENERIC_QTR */ IN {"Q1","Q2"}
)

RETURN Result
```

#### W+F+UC % OL

```dax
DIVIDE([W+F+UC $ OL], [BOOKINGS TARGET])
```

#### W+F+UC PIPE H1 $

```dax
VAR CYear = CALCULATE(
    MIN( 'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.CLOSE_YR */ ),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)

VAR UpsideCommittedCQ = CALCULATE(
    [UPSIDE COMMITTED $],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
    'Close Quarter'[CLOSE_GENERIC_QTR] /* DB: vw_EBI_Caldate.CLOSE_GENERIC_QTR */ IN {"Q1","Q2"}
)

VAR WONPQ = CALCULATE(
    [WON $],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ < 0,
    'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.CLOSE_YR */ = CYear,
    Pipeline[IS_EOQ] = "TRUE",
    ALL( 'Snapshot Quarter' )
)

VAR WONCQ = CALCULATE(
    [WON $],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
    'Close Quarter'[CLOSE_GENERIC_QTR] /* DB: vw_EBI_Caldate.CLOSE_GENERIC_QTR */ IN {"Q1","Q2"}
)

VAR ForecastCQ = CALCULATE(
    [FORECAST $],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
    'Close Quarter'[CLOSE_GENERIC_QTR] /* DB: vw_EBI_Caldate.CLOSE_GENERIC_QTR */ IN {"Q1","Q2"}
)

VAR Result = ForecastCQ+UpsideCommittedCQ+WONPQ+WONCQ

RETURN Result
```

#### Weekly Target

```dax
CALCULATE([LINEARITY TARGET TREND],ALL('Daily Weekly Switch'[Frequency]),'Snapshot Quarter'[DAY_NAME] /* DB: vw_EBI_Caldate.DAY_NAME */=1)
```

#### Willingness To Engage

```dax
CALCULATE(MAX('Customer Profile Attributes'[WILLINGNESS_TO_ENGAGE] /* DB: dataset:Customer_Profile_Attributes.WILLINGNESS_TO_ENGAGE */),
FILTER('Account ARR', NOT(ISBLANK('Account ARR'[ARR] /* DB: dataset:Account_ARR.ARR */))
))
```

#### WoW CQ W+F+UC $

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR cw = [W+F+UC $]
VAR pw = [PW W+F+UC $]
VAR Diff = cw - pw
VAR res = DIVIDE(Diff, pw)
RETURN

IF(Diff > 0, 
    UPARROW &" "& FORMAT(res,"0.0%")&" WoW",
    IF(Diff < 0 ,
    DOWNARROW &" "& FORMAT(ABS(res),"0.0%")&" WoW",
    FORMAT(res,"0.0%")&" WoW"
    )
)
```

#### WoW MANAGER FORECAST CQ %

```dax
VAR MForeCQ = CALCULATE(
    [W+F+UC %],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)

RETURN MForeCQ
```

#### WoW Participation $

```dax
VAR Num = CALCULATE([W+F+UC $], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)

RETURN Num
```

#### YTD PROJECTION % OCC

```dax
VAR Pipe = CALCULATE(
    [PERFORMANCE YTD %],
    // [YTD PROJECTION %],
    ALL('Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */),
    ALL('Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */)
)

RETURN Pipe
```

#### Yellow %

```dax
Var Num = [Yellow #_Ac_H]
Var Den = [Child Accounts]

RETURN
IF( HASONEVALUE('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */)
      || HASONEVALUE('Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */),
      BLANK(),   
    DIVIDE(Num, Den)
)
```

#### YoY RR%

```dax
//var selected_qtr = SELECTEDVALUE('Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */)
//var cq_rr = CALCULATE([RBOB ATTAINMENT %],all('Close Quarter'),'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=0)
//var py_rr = CALCULATE([RBOB ATTAINMENT %],all('Close Quarter'),'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=-4)
//return if(cq_rr-py_rr=0,Blank(),cq_rr-py_rr)
 
VAR SelectedQuarters = VALUES('Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */)
VAR CurrentYear = MAXX(SelectedQuarters, LEFT('Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */, 4))
VAR PreviousYearQuarters =
    SELECTCOLUMNS(
        SelectedQuarters,
        "CLOSE_QTR",
        FORMAT(VALUE(LEFT([CLOSE_QTR], 4)) - 1, "0000") & MID([CLOSE_QTR], 5, 3)
    )
 
VAR CurrentValue =
    CALCULATE(
        [RBOB ATTAINMENT % _L3],
        'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ IN SelectedQuarters
    )
 
VAR PreviousValue =
    CALCULATE(
       [RBOB ATTAINMENT % _L3],
        'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ IN PreviousYearQuarters, ALL('Daily Weekly Switch'[Frequency]),ALL('Snapshot Quarter'), ALL(  'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */)
    )
 
RETURN
IF(
    HASONEVALUE('Region Hierarchy'[TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM */)
        || HASONEVALUE('Region Hierarchy'[SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM */)
        || HASONEVALUE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */)
        || HASONEVALUE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */),BLANK(),
    CurrentValue - PreviousValue
)
```

#### YoY_arrow

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
var Diff = [YoY RR%]
return 
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%")&" YoY",
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%")&" YoY")
```

#### _Separater

```dax
BLANK()
```

#### cq rep band 50-75

```dax
IF( NOT(ISBLANK([Rep CQ%])),
IF([Rep CQ%] >= 0.5 && [Rep CQ%] <0.75 , "50 - 75 band"))
```

#### cq rep band >75

```dax
COUNTROWS(
FILTER('Rep Band',
     
'Rep Band'[Attain Band] = ">=75 Band"
))
```

#### test ARRAVG SubID

```dax
VAR _ARR = CALCULATE([BOQ ARR $], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,REMOVEFILTERS('Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */), REMOVEFILTERS('Close Quarter'))
RETURN
_ARR
```

#### test svg

```dax
VAR _score = 100
 
VAR _gradientbar =
"data:image/svg+xml;utf8," &
 
"<svg width='400' height='60' xmlns= 'http://www.w3.org/2000/svg' >" &
 " <defs>
    <linearGradient id='redAmberGreen' x1='0%' y1='0%' x2='100%' y2='0%'>
      <!-- smooth transition: start red, middle amber, end green -->
      <stop offset='0%'  stop-color='#E74B3A' stop-opacity='1' />
      <stop offset='50%' stop-color='#CE9905' stop-opacity='1' />
      <stop offset='100%' stop-color='#11A25F' stop-opacity='1' />
    </linearGradient>
 
    <!-- Optional subtle highlight for glossy look -->
    <linearGradient id='gloss' x1='0%' y1='0%' x2='0%' y2='100%'>
      <stop offset='0%' stop-color='#FFFFFF' stop-opacity='0.25'/>
      <stop offset='100%' stop-color='#FFFFFF' stop-opacity='0'/>
    </linearGradient>
  </defs>
 
  <!-- Rounded rectangle using the gradient -->
  <rect x='0' y='0' rx='20' ry='20' width='400' height='50'
        fill='url(#redAmberGreen)' stroke='#222222' stroke-opacity='0.08' stroke-width='1' />
 
  <!-- subtle glossy overlay -->
  <rect x='0' y='0' rx='20' ry='20' width='400' height='25'
        fill='url(#gloss)' pointer-events='none' />" &
 
//   <!-- Optional label centered on the rectangle -->
//   <text x='200' y='34' font-family='Segoe UI, Arial, sans-serif' font-size='14' fill='#ffffff' text-anchor='middle' pointer-events='none' style='font-weight:600'>
//     Status
//   </text>
  "<!-- Moving circle marker -->
  <!-- VALUE_HERE should be a number from 0 to 100 -->
  <circle cx='" & _score & "' cy='25' r='20' fill='#ffffff' stroke='#000000' stroke-width='10' />
</svg>"
 
RETURN
_gradientbar
```

#### text

```dax
""
```

#### tier1 Complete% green

```dax
DIVIDE([tier1 Completed Green], CALCULATE([tier1 Completed],NOT(OPG[MOPG1]="DX VIDEO")))
```

#### tier1 Completed

```dax
CALCULATE([TIER 1 COMPLETED #],
            FILTER( 'Region Hierarchy',
            'Region Hierarchy'[REP_GTM_MOTION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_GTM_MOTION */ = "Solution"
            ),NOT(OPG[MOPG1]="DX VIDEO"),'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */="Active")
```

#### tier1 Completed Green

```dax
CALCULATE([TIER 1 COMPLETED #],
            'TPT Metadata'[ASSESSED_ACCOUNT] /* DB: dataset:TPT_Metadata.ASSESSED_ACCOUNT */ = "Green",
            FILTER( 'Region Hierarchy',
            'Region Hierarchy'[REP_GTM_MOTION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_GTM_MOTION */ = "Solution"
            ),NOT(OPG[MOPG1]="DX VIDEO"),'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */="Active")
```

#### tier1 Parent Complete Green #

```dax
CALCULATE([TIER 1 PRNT COMPLETED #], 
       'TPT Metadata'[PARENT_ACCOUNT_PLAN_QUALITY] /* DB: dataset:TPT_Metadata.PARENT_ACCOUNT_PLAN_QUALITY */ = "Green",
       FILTER( 'Region Hierarchy',
            'Region Hierarchy'[REP_GTM_MOTION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_GTM_MOTION */ in {"Generalist", "Industry"}
            ),NOT(OPG[MOPG1]="DX VIDEO"),'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */="Active")
```

#### tier1 Parent Complete% green

```dax
DIVIDE(CALCULATE([tier1 Parent Complete Green #],NOT(OPG[MOPG1]="DX VIDEO"),'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */="Active"), CALCULATE([tier1 Parent Completed],NOT(OPG[MOPG1]="DX VIDEO"),'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */="Active"))
```

#### tier1 Parent Completed

```dax
CALCULATE([TIER 1 PRNT COMPLETED #], 
       FILTER( 'Region Hierarchy',
            'Region Hierarchy'[REP_GTM_MOTION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_GTM_MOTION */ in {"Generalist", "Industry"}
            ),NOT(OPG[MOPG1]="DX VIDEO"),'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */="Active")
```

#### tier1 Parent completed vs total

```dax
VAR num = CALCULATE([tier1 Parent Completed],NOT(OPG[MOPG1]="DX VIDEO"),'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */="Active")
VAR den = CALCULATE(
    [TIER 1 PRNT ACCTS #],
       FILTER( 'Region Hierarchy',
            'Region Hierarchy'[REP_GTM_MOTION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_GTM_MOTION */ in {"Generalist", "Industry"}
            ),NOT(OPG[MOPG1]="DX VIDEO"),'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */="Active")

RETURN
REPT(UNICHAR(160),18) &
 "(" & num & "/" & den & " Tier 1 Parent Accounts)"
```

#### tier1 Parent completed vs total Green

```dax
VAR _greencompleted = CALCULATE([tier1 Parent Complete Green #],'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */="Active")
VAR _greenaccounts = CALCULATE([tier1 Parent Completed],NOT(OPG[MOPG1]="DX VIDEO"),'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */="Active")
RETURN
REPT(UNICHAR(160),5) &
 "(" & _greencompleted & "/" & _greenaccounts & " Tier 1 Parent Green Accounts)"
```

#### tier1 completed vs total

```dax
VAR num = CALCULATE([TIER 1 COMPLETED #], 
               FILTER( 'Region Hierarchy',
            'Region Hierarchy'[REP_GTM_MOTION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_GTM_MOTION */ = "Solution"
            ),NOT(OPG[MOPG1]="DX VIDEO"),'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */="Active")
VAR den = CALCULATE([TIER 1 ACCTS #], 
               FILTER( 'Region Hierarchy',
            'Region Hierarchy'[REP_GTM_MOTION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_GTM_MOTION */ = "Solution"
            ),NOT(OPG[MOPG1]="DX VIDEO"),'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */="Active")
RETURN
REPT(UNICHAR(160),25) &
 "(" & num & "/" & den & " Tier 1 Accounts)"
```

#### tier1 completed vs total Green

```dax
VAR _greencompleted = CALCULATE([tier1 Completed Green],NOT(OPG[MOPG1]="DX VIDEO"),'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */="Active")
VAR _greenaccounts = CALCULATE([tier1 Completed],NOT(OPG[MOPG1]="DX VIDEO"),'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */="Active")
RETURN
REPT(UNICHAR(160),15) &
 "(" & _greencompleted & "/" & _greenaccounts & " Tier 1 Green Accounts)"
```

#### whitespace tick

```dax
"https://biimagestore.blob.core.windows.net/ebiimages/TickBox.png"
```

#### whitespace untick

```dax
"https://biimagestore.blob.core.windows.net/ebiimages/Untick.png"
```

**_OCC_LP:**

#### % Weekly AE participation QTD

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR diff = ([AE QTD Participation] - [PW AE QTD Participation])

RETURN
SWITCH(TRUE(), 
    diff > 0,
    UPARROW &" "& FORMAT(diff,"0.0%")&" Pts WoW",
    diff < 0,
    DOWNARROW &" "& FORMAT(ABS(diff),"0.0%")&" Pts WoW",
    FORMAT(diff,"0.0%")&" Pts WoW"
)
```

#### % Weekly AE participation YTD

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR diff = ([YTD PROJECTION % OCC] - [PW YTD PROJECTION % OCC])

RETURN
SWITCH(TRUE(), 
    diff > 0,
    UPARROW &" "& FORMAT(diff,"0.0%")&" Pts WoW",
    diff < 0,
    DOWNARROW &" "& FORMAT(ABS(diff),"0.0%")&" Pts WoW",
    FORMAT(diff,"0.0%")&" Pts WoW"
)
```

#### % Weekly CQ Net

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR Diff = ([CQ Net% Plan] - [PW Net Plan])*100

RETURN

IF(Diff > 0, 
    UPARROW &" "& FORMAT(Diff,"0.0")&"%"&" WoW",
    DOWNARROW &" "& Format(ABS(Diff),"0.0")&"%"&" WoW")
```

#### % Weekly FLM participation QTD

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR diff = IFERROR([FLM Participation QTD] - [PW FLM Participation QTD],BLANK())

RETURN
SWITCH(TRUE(), 
    diff > 0,
    UPARROW &" "& FORMAT(diff,"0.0%")&" Pts WoW",
    diff < 0,
    DOWNARROW &" "& FORMAT(ABS(diff),"0.0%")&" Pts WoW",
    FORMAT(diff,"0.0%")&" Pts WoW"
)
```

#### % Weekly FLM participation YTD

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR diff = IFERROR([FLM Participation YTD] - [PW FLM Participation YTD],BLANK())

RETURN
SWITCH(TRUE(), 
    diff > 0,
    UPARROW &" "& FORMAT(diff,"0.0%")&" Pts WoW",
    diff < 0,
    DOWNARROW &" "& FORMAT(ABS(diff),"0.0%")&" Pts WoW",
    FORMAT(diff,"0.0%")&" Pts WoW"
)
```

#### % Weekly Gross Created YTD

```dax
[% Weekly Gross Creation QTD]
```

#### % Weekly Gross Creation QTD

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR cw = CALCULATE([CQ Gross Created QTD], 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0")
VAR pw = CALCULATE([CQ Gross Created QTD], 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
            REMOVEFILTERS('Snapshot Quarter'))
VAR diff = cw - pw
VAR res = DIVIDE(diff, pw)

RETURN 
SWITCH(TRUE(), 
    res > 0,
    UPARROW &" "& FORMAT(res,"0.0%")&" WoW",
    res < 0,
    DOWNARROW &" "& FORMAT(res,"0.0%")&" WoW",
    FORMAT(res,"0.0%")&" WoW"
)
```

#### % Weekly Gross Creation QTD parameter

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR Diff = [LP GROSS CREATION QTD %] -[PW Gross Creation QTD %]

RETURN
Diff
// IF(Diff > 0, 
//     UPARROW &" "& FORMAT(Diff,"#,###")&"%",
//     DOWNARROW &" "& Format(ABS(Diff),"#,###")&"%")
```

#### % Weekly H1 Net

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR Diff = ([H1 Net% Plan] - [PW H1 Net Plan])*100

RETURN

IF(Diff > 0, 
    UPARROW &" "& FORMAT(Diff,"0.0")&"%"&" WoW",
    DOWNARROW &" "& Format(ABS(Diff),"0.0")&"%"&" WoW")
```

#### % Weekly Perf H1

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR Diff = ([PERFORMANCE H1 %] - [PW Performance H1 %])*100

RETURN

IF(Diff > 0, 
    UPARROW &" "& FORMAT(Diff,"0.0")&"%"&" WoW",
    DOWNARROW &" "& Format(ABS(Diff),"0.0")&"%"&" WoW")
```

#### % Weekly Rep participation QTD

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR diff = IFERROR([Rep Participation QTD] - [PW Rep Participation QTD],BLANK())

RETURN
SWITCH(TRUE(), 
    diff > 0,
    UPARROW &" "& FORMAT(diff,"0.0%")&" Pts WoW",
    diff < 0,
    DOWNARROW &" "& FORMAT(ABS(diff),"0.0%")&" Pts WoW",
    FORMAT(diff,"0.0%")&" Pts WoW"
)
```

#### % Weekly Rep participation YTD

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR diff = IFERROR([Rep Participation YTD] - [PW Rep Participation YTD],BLANK())

RETURN
SWITCH(TRUE(), 
    diff > 0,
    UPARROW &" "& FORMAT(diff,"0.0%")&" Pts WoW",
    diff < 0,
    DOWNARROW &" "& FORMAT(ABS(diff),"0.0%")&" Pts WoW",
    FORMAT(diff,"0.0%")&" Pts WoW"
)
```

#### % Weekly Team participation QTD

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR Diff = ([FLM WITH >50% AE @75% QTD %] - [PW Team Participation QTD])

RETURN

SWITCH(TRUE(), 
    diff > 0,
    UPARROW &" "& FORMAT(diff,"0.0%")&" Pts WoW",
    diff < 0,
    DOWNARROW &" "& FORMAT(ABS(diff),"0.0%")&" Pts WoW",
    FORMAT(diff,"0.0%")&" Pts WoW"
)
```

#### % Weekly Team participation YTD

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR diff = ([FLM WITH >50% AE @75% YTD %] - [PW Team Participation YTD])

RETURN
SWITCH(TRUE(), 
    diff > 0,
    UPARROW &" "& FORMAT(diff,"0.0%")&" Pts WoW",
    diff < 0,
    DOWNARROW &" "& FORMAT(ABS(diff),"0.0%")&" Pts WoW",
    FORMAT(diff,"0.0%")&" Pts WoW"
)
```

#### AE Attrition Ret title

```dax
SWITCH(TRUE(),
SELECTEDVALUE(OCC_Parameter_ret_AE_attrition[Value4]) = "CQ Attrition", "Attrition $ CQ",
SELECTEDVALUE(OCC_Parameter_ret_AE_attrition[Value4]) ="YTD Attrition", "Attrition $ YTD",
SELECTEDVALUE(OCC_Parameter_ret_AE_attrition[Value4]) = "CQ + 1 Attrition", "Attrition $ Q+1"
)
```

#### AE Participation title WoW trend

```dax
SWITCH(TRUE(),
SELECTEDVALUE(OCC_Parameter_Perf_AE_WoW[Value4]) = "Rep QTD", "Participation QTD",
SELECTEDVALUE(OCC_Parameter_Perf_AE_WoW[Value4]) ="Rep YTD", "Participation YTD",
SELECTEDVALUE(OCC_Parameter_Perf_AE_WoW[Value4]) = "CY Projection", "CY Projection %"
)
```

#### AE QTD Participation

```dax
CALCULATE (
    [MANAGER FORECAST CQ %],
    ALL ( 'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ ),
    ALL ( 'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ ),
    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
    REMOVEFILTERS('Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */)
)
```

#### AE Rep CY Proj CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"

RETURN
 SWITCH(TRUE(),
  [Rep CY Projection > 75%] >= 0.75, _green,
  [Rep CY Projection > 75%] >= 0.5, _yellow,
  [Rep CY Projection > 75%] < 0.5, _red
)
```

#### AE Rep Perf QTD CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"

RETURN
 SWITCH(TRUE(),
  [AE QTD Participation] >= 0.75, _green,
  [AE QTD Participation] >= 0.5, _yellow,
  [AE QTD Participation] < 0.5, _red
)
```

#### AE Rep Perf YTD CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"

RETURN
 SWITCH(TRUE(),
  [AE YTD Participation] >= 0.75, _green,
  [AE YTD Participation] >= 0.5, _yellow,
  [AE YTD Participation] < 0.5, _red
)
```

#### AE YTD Participation

```dax
CALCULATE(
    [YTD PROJECTION %],    
    ALL('Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */),
    ALL('Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */),
    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
    REMOVEFILTERS('Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */)
)
```

#### ARR Account title

```dax
SWITCH(TRUE(),
SELECTEDVALUE('Parameter_ARRAVG'[Value4]) = "ARR Sub ID", "ARRAVG Sub + MA",
SELECTEDVALUE('Parameter_ARRAVG'[Value4]) ="ARR Parent ID", "ARRAVG Parent ID",
SELECTEDVALUE('Parameter_ARRAVG'[Value4]) = "RBOB", "Renewal ARR AVG CQ"
)
```

#### ARRAVG QoQ

```dax
VAR res = 
CALCULATE([BOQ ARR $], REMOVEFILTERS('Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */))

RETURN 
IF(ISBLANK(res), "", res)
```

#### Acc Health Movement count moving down

```dax
CALCULATE (
        [Child Accounts],
        'Health Movement Metadata'[HEALTH_MOVEMENT_TYPE] /* DB: dataset:Health_Movement_Metadata.HEALTH_MOVEMENT_TYPE */ = "Trending Down"
    )
```

#### Acc Health Movement count moving up

```dax
CALCULATE (
        [Child Accounts],
        'Health Movement Metadata'[HEALTH_MOVEMENT_TYPE] /* DB: dataset:Health_Movement_Metadata.HEALTH_MOVEMENT_TYPE */ = "Trending Up"
    )
```

#### Acc Plan title

```dax
SWITCH(TRUE(),
SELECTEDVALUE('Parameter_Account Plan'[Value4]) = "Sub Comp %", "Sub Account Complete %",
SELECTEDVALUE('Parameter_Account Plan'[Value4]) = "Sub Comp Green %", "Sub Account Green Complete %",
SELECTEDVALUE('Parameter_Account Plan'[Value4]) = "Parent Comp %", "Parent Account Complete %",
SELECTEDVALUE('Parameter_Account Plan'[Value4]) = "Parent Comp Green %", "Parent Account Green Complete %"
)
```

#### Accnts CQ ARRAVG

```dax
CALCULATE(SUM('Account ARR'[EOQ_ARR] /* DB: dataset:Account_ARR.EOQ_ARR */), 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1)
```

#### Accnts CQ ARRAVG Health

```dax
CALCULATE('_Account ARR Measures'[ARR $],
FILTER('Account ARR', 'Account ARR'[ARR] /* DB: dataset:Account_ARR.ARR */ > 0),
'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1)
```

#### Accnts CQ ARRAVG whitespace

```dax
VAR _arr = 
[Accnts CQ ARRAVG]

RETURN IF( NOT ISBLANK(_arr),  _arr)
```

#### Account title WoW trend

```dax
SWITCH(TRUE(),
SELECTEDVALUE(Parameter_Acc_WoW[Parameter_Acc_WoW Order]) = "ARR", "ARR Avg",
SELECTEDVALUE(Parameter_Acc_WoW[Parameter_Acc_WoW Order]) ="Sol Health", "Solution Health",
SELECTEDVALUE(Parameter_Acc_WoW[Parameter_Acc_WoW Order]) = "Acc Health", "Accont Health"
)
```

#### Additional Risks

```dax
VAR SelectedSnapshotType = SELECTEDVALUE('Retention Snapshot Type'[SNAPSHOT_TYPE] /* DB: dataset:Retention_Snapshot_Type.SNAPSHOT_TYPE */)
VAR ADDLRISKS = CALCULATE(SUM(Retention[RISK_UPSIDE_AMOUNT]), Retention[RISK_UPSIDE_AMOUNT]<0, REMOVEFILTERS('Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */, 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */))
VAR Result = IF(ISBLANK(SelectedSnapshotType),
                CALCULATE(ADDLRISKS,
                            'Retention Snapshot Type'[SNAPSHOT_TYPE] /* DB: dataset:Retention_Snapshot_Type.SNAPSHOT_TYPE */ IN {"Historical","Locked"}),
                ADDLRISKS)

RETURN Result
```

#### Attrition %

```dax
VAR _attrition = [ARR IMPACT]
VAR _renewal_target = SUM('Renewals Target'[ATTRITION] /* DB: vw_TF_EBI_RENEWALS_TARGET.ATTRITION */)

RETURN
DIVIDE(_attrition,_renewal_target)
```

#### Attrition OCC

```dax
CALCULATE([ARR IMPACT],
            REMOVEFILTERS('Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */, 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */)
            )
```

#### Attrition OL title

```dax
SWITCH(TRUE(),
SELECTEDVALUE(Parameter_Attrition[Value4]) = "Attrition CQ", "Attrition % CQ",
SELECTEDVALUE(Parameter_Attrition[Value4]) ="Attrition YTD", "Attrition % YTD",
SELECTEDVALUE(Parameter_Attrition[Value4]) = "Attrition H1", "Attrition % H1"
)
```

#### Attrition Ret title

```dax
SWITCH(TRUE(),
SELECTEDVALUE(Parameter_ret_attrition[Value4]) = "Attrition CQ", "Attrition % CQ",
SELECTEDVALUE(Parameter_ret_attrition[Value4]) ="Attrition CQ $", "Attrition $ CQ",
SELECTEDVALUE(Parameter_ret_attrition[Value4]) = "Attrition YTD", "Attrition % YTD",
SELECTEDVALUE(Parameter_ret_attrition[Value4]) = "Attrition Q+1", "Attrition % Q+1"
)
```

#### Attrition font CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"

var _rule = SWITCH(TRUE(),
  SELECTEDVALUE(Parameter_Attrition[Value4]) = "Attrition CQ"
  &&  [CQ Attrition %]  >= 1, _green,
  SELECTEDVALUE(Parameter_Attrition[Value4]) = "Attrition CQ"
  &&  [CQ Attrition %] < 1 , _red,
  SELECTEDVALUE(Parameter_Attrition[Value4]) = "Attrition YTD"
  &&  [YTD Attrition%] >= 1 , _green,
  SELECTEDVALUE(Parameter_Attrition[Value4]) = "Attrition YTD"
  &&  [YTD Attrition%] < 1, _red,
  SELECTEDVALUE(Parameter_Attrition[Value4]) = "Attrition H1"
  &&  [H1 Attrition%] >= 1 , _green,
  SELECTEDVALUE(Parameter_Attrition[Value4]) = "Attrition H1"
  &&  [H1 Attrition%] < 1, _red
)

RETURN _rule
```

#### BOOKINGS TARGET YTD OL $

```dax
CALCULATE( [BOOKINGS TARGET YTD], ALL('Close Quarter'))
```

#### CQ + 1 Attrition

```dax
CALCULATE([ARR IMPACT], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,
REMOVEFILTERS('Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */, 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */))
```

#### CQ + 1 Attrition %

```dax
VAR actual =
    CALCULATE ( [ARR Impact_OCC], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1 )
VAR target =
    CALCULATE (
        SUM ( 'Renewals Target'[ATTRITION] /* DB: vw_TF_EBI_RENEWALS_TARGET.ATTRITION */ ),
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,
        REMOVEFILTERS('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */),
        // REMOVEFILTERS ( 'Target Type' ),'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Plan",
        ALL ( 'Snapshot Quarter' ),
        ALL ( 'Daily Weekly Switch' ),
        ALL ( 'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ )
    )
VAR diff = actual - target
VAR result =
    IF (
        AND ( NOT ( ISBLANK ( actual ) ), NOT ( ISBLANK ( target ) ) ),
        1 - DIVIDE ( diff, target )
    )
RETURN
    result
```

#### CQ + 1 Attrition Comp

```dax
VAR _attrition =
    CALCULATE ( [ARR Impact_OCC], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1 )
VAR _Target =
    CALCULATE (
        SUM ( 'Renewals Target'[ATTRITION] /* DB: vw_TF_EBI_RENEWALS_TARGET.ATTRITION */ ),
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,
        // REMOVEFILTERS ( 'Target Type' ), 'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Plan",
        ALL ( 'Snapshot Quarter' ),
        ALL ( 'Daily Weekly Switch' ),
        ALL ( 'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ )
    )
RETURN
    // REPT(UNICHAR(160),4) &
    "(" & FORMAT ( _attrition / 1000000, "$#,##0.0M" ) & "/"
        & FORMAT ( _Target / 1000000, "$#,##0.0M" ) & ")"
```

#### CQ ARR Impact

```dax
CALCULATE( [ARR IMPACT],
         'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
    )
```

#### CQ ARRAVG # Parent Account

```dax
VAR _parentid_count =
    CALCULATE (
        COUNTX ( VALUES ( 'Account Parent'[PRNT_ID] /* DB: dataset:Account_Parent.PRNT_ID */ ), '_Account ARR Measures'[ARR $] ),
        NOT ( ISBLANK ( 'Account ARR'[ARR] /* DB: dataset:Account_ARR.ARR */ ) ),
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1
    )
RETURN 
 _parentid_count
```

#### CQ ARRAVG # Sub Accounts

```dax
VAR _subid_count = CALCULATE(COUNTX(VALUES('Account Sub'[SUB_ID] /* DB: dataset:Account_Sub.SUB_ID */), 
                    '_Account ARR Measures'[ARR $]), NOT(ISBLANK('Account ARR'[ARR] /* DB: dataset:Account_ARR.ARR */)),
                    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1
                    )
RETURN  
 _subid_count
```

#### CQ ARRAVG ParentID

```dax
[CQ ARRAVG SubId]
```

#### CQ ARRAVG SubId

```dax
CALCULATE([BOQ ARR $],  FILTER( 'Close Quarter','Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)
,REMOVEFILTERS('Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */)
)
```

#### CQ Additional Risk

```dax
CALCULATE([Additional Risks], 
          'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)
```

#### CQ Attrition $ WoW

```dax
VAR res = CALCULATE([CQ attrition],
REMOVEFILTERS('Retention Snapshot Type'[SNAPSHOT_TYPE] /* DB: dataset:Retention_Snapshot_Type.SNAPSHOT_TYPE */))

RETURN IF( ISBLANK(res), "",
        res
    )
```

#### CQ Attrition $ WoW w/o blank

```dax
CALCULATE([CQ attrition],
REMOVEFILTERS('Retention Snapshot Type'[SNAPSHOT_TYPE] /* DB: dataset:Retention_Snapshot_Type.SNAPSHOT_TYPE */))
```

#### CQ Attrition %

```dax
VAR actual = [CQ attrition]
VAR target = [CQ attrition Target]
VAR diff = actual - target
VAR result =  IF( AND(NOT(ISBLANK(actual)), NOT(ISBLANK(target))), 1 - DIVIDE(diff, target) )
RETURN IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */)
       || HASONEVALUE('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */)
       || HASONEVALUE('Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */)
     , BLANK(), result)
```

#### CQ Attrition % WoW

```dax
VAR res = 
CALCULATE([CQ Attrition %],
REMOVEFILTERS('Retention Snapshot Type'[SNAPSHOT_TYPE] /* DB: dataset:Retention_Snapshot_Type.SNAPSHOT_TYPE */),
REMOVEFILTERS('Daily Weekly Switch'[Frequency]))

RETURN IF( ISBLANK(res), "",
        res
    )
```

#### CQ Attrition OL $

```dax
VAR result =  [CQ attrition]

RETURN IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */)
       || HASONEVALUE('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */)
       || HASONEVALUE('Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */),
       BLANK(), result
    )
```

#### CQ Forecast $

```dax
CALCULATE([FORECAST $], 
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)
```

#### CQ GNARR Target

```dax
CALCULATE([BOOKINGS TARGET], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)
```

#### CQ Gross Created QTD

```dax
CALCULATE([GROSS CREATED QTD $],
                FILTER('Qualification Quarter',
                  'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = 0 )
)
```

#### CQ Gross Creation QTD

```dax
CALCULATE([GROSS CREATION QTD],
                FILTER('Qualification Quarter',
                  'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = 0 )
)
```

#### CQ Gross Creation QTD %

```dax
VAR _den = [CQ Gross Creation QTD]
VAR _num = [CQ Gross Created QTD]

RETURN IF(_den < 1 && NOT ISBLANK(_num), 0,
DIVIDE(_num, _den))
```

#### CQ MANAGER FORECAST % WoW

```dax
CALCULATE(
    [W+F+UC %],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
,
ALL('Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */),
    ALL('Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */)
)
```

#### CQ Net Outlook

```dax
VAR _cq_wfuc = CALCULATE([W+F+UC $], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)
VAR _cq_attrition = [CQ attrition]

RETURN  _cq_wfuc + _cq_attrition
```

#### CQ Net Plan

```dax
VAR _cq_bookings_target = CALCULATE([BOOKINGS TARGET], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)
VAR _cq_attrition_plan = [CQ attrition Target]

RETURN  _cq_bookings_target + _cq_attrition_plan
```

#### CQ Net Plan % WoW

```dax
VAR res = CALCULATE([CQ Net% Plan],
REMOVEFILTERS('Retention Snapshot Type'[SNAPSHOT_TYPE] /* DB: dataset:Retention_Snapshot_Type.SNAPSHOT_TYPE */))

RETURN IF( ISBLANK(res), "",
        res
    )
```

#### CQ Net Plan Comp

```dax
// REPT(UNICHAR(160),6) &
"(" & FORMAT ( [CQ Net Outlook]/1000000, "$#,##0.0M" ) & "/"
    & FORMAT ( [CQ Net Plan]/1000000, "$#,##0.0M" ) & ")"
```

#### CQ Net% Plan

```dax
IF( HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */), BLANK(),
DIVIDE([CQ Net Outlook], [CQ Net Plan])
)
```

#### CQ Renewal Rate Comp

```dax
VAR _rbob_actual = CALCULATE([RBOB w/o PQ Trail] + [ARR Impact_OCC], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)
VAR _rbob = CALCULATE([RBOB w/o PQ Trail], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)

RETURN
// REPT(UNICHAR(160),4) &
"(" & FORMAT ( _rbob_actual/1000000, "$#,##0.0M" ) & "/"
    & FORMAT ( _rbob/1000000, "$#,##0.0M" ) & ")"
```

#### CQ Renewal Rate Outlook

```dax
IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */)
       || HASONEVALUE('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */)
       || HASONEVALUE('Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */)
, BLANK(),
CALCULATE([Renewal Rate], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)
)
```

#### CQ Renewal Rate WoW

```dax
VAR res = CALCULATE([Renewal Rate], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
// REMOVEFILTERS('Retention MetaData'[IS_REQ_IN_OCC] /* DB: vw_TD_EBI_Retention_MetaData.IS_REQ_IN_OCC */),
REMOVEFILTERS('Retention Snapshot Type'[SNAPSHOT_TYPE] /* DB: dataset:Retention_Snapshot_Type.SNAPSHOT_TYPE */),
REMOVEFILTERS('Daily Weekly Switch'[Frequency])
)
RETURN IF( ISBLANK(res), "",
        res
    )
```

#### CQ Risk Upside

```dax
VAR risk = CALCULATE([Additional Risks], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)
VAR upside = CALCULATE([Savables], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)

RETURN
"Risk " & FORMAT(risk/1000000, "$#,##0.0M") &
" | " &
"Upside " & FORMAT(upside/1000000, "$#,##0.0M")
```

#### CQ Risk category Cov

```dax
CALCULATE(MAX(Pipeline[CQ Risk Category]),
              NOT(ISBLANK(Pipeline[CQ Risk Category]))
)
```

#### CQ Upsell # Attach %

```dax
VAR RenewalUpsell_C = CALCULATE(DISTINCTCOUNT(Pipeline[Upsell_Attach_Key_Pipeline]),'Upsell Type'[UPSELL_TYPE] /* DB: dataset:Upsell_Type.UPSELL_TYPE */ = "Renewal Upsell", 'Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */ = "Upsell", 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)

    VAR RBOB_C = CALCULATE(DISTINCTCOUNT(Retention[Upsell_Attach_Key_Ren]), 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0, REMOVEFILTERS('Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */, 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */), REMOVEFILTERS('Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */), REMOVEFILTERS('Daily Weekly Switch'[Frequency]))

    Var Result = DIVIDE(RenewalUpsell_C, RBOB_C)
    Return
    Result
```

#### CQ Upsell # Attach % Comp

```dax
VAR RenewalUpsell_C = CALCULATE(DISTINCTCOUNT(Pipeline[Upsell_Attach_Key_Pipeline]),'Upsell Type'[UPSELL_TYPE] /* DB: dataset:Upsell_Type.UPSELL_TYPE */ = "Renewal Upsell", 'Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */ = "Upsell", 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)

    VAR RBOB_C = CALCULATE(DISTINCTCOUNT(Retention[Upsell_Attach_Key_Ren]), 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0, REMOVEFILTERS('Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */, 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */))

    
    Return
    "( " & FORMAT ( RenewalUpsell_C, "#" ) & "/"
    & FORMAT ( RBOB_C, "#" ) & " Deals )"
```

#### CQ Upsell # Attach % WoW

```dax
VAR res = 
CALCULATE([CQ Upsell # Attach %],
REMOVEFILTERS('Retention Snapshot Type'[SNAPSHOT_TYPE] /* DB: dataset:Retention_Snapshot_Type.SNAPSHOT_TYPE */),
REMOVEFILTERS('Daily Weekly Switch'[Frequency]))

RETURN IF( ISBLANK(res), "",
        res
    )
```

#### CQ Upsell $ Attach Rate

```dax
VAR RenewalUpsell = CALCULATE([OPPTY $], 'Upsell Type'[UPSELL_TYPE] /* DB: dataset:Upsell_Type.UPSELL_TYPE */ = "Renewal Upsell", 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,'Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */=TRUE)
VAR RBOB = CALCULATE([RBOB w/o PQ Trail], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)

Var Result = DIVIDE(RenewalUpsell, RBOB)
Return
IF(HASONEVALUE('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */)
  || HASONEVALUE('Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */),
  BLANK(),
  Result
)
```

#### CQ Upsell $ Attach Rate Comp

```dax
VAR RenewalUpsell = CALCULATE([OPPTY $], 'Upsell Type'[UPSELL_TYPE] /* DB: dataset:Upsell_Type.UPSELL_TYPE */ = "Renewal Upsell", 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,'Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */=TRUE)
VAR RBOB = CALCULATE([RBOB w/o PQ Trail], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)

RETURN
// REPT(UNICHAR(160),4) &
"(" & FORMAT ( RenewalUpsell/1000000, "$#,##0.0M" ) & "/"
    & FORMAT ( RBOB/1000000, "$#,##0.0M" ) & ")"
```

#### CQ Upsell $ Attach Rate w/o snapshot

```dax
VAR RenewalUpsell = CALCULATE([OPPTY $], 'Upsell Type'[UPSELL_TYPE] /* DB: dataset:Upsell_Type.UPSELL_TYPE */ = "Renewal Upsell", 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)
VAR RBOB = CALCULATE([RBOB w/o PQ Trail], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)

Var Result = DIVIDE(RenewalUpsell, RBOB)
Return

  Result
```

#### CQ Upside Com

```dax
CALCULATE([UPSIDE COMMITTED $], 
'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ <> "S1-S2",
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)
```

#### CQ W+F+UC

```dax
CALCULATE([W+F+UC %], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)
```

#### CQ W+F+UC $

```dax
CALCULATE([W+F+UC $], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)
```

#### CQ W+F+UC%

```dax
CALCULATE([W+F+UC %], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */= 0 )
```

#### CQ Won $

```dax
CALCULATE([WON $], 
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)
```

#### CQ YoY RR%

```dax
VAR SelectedQuarters = CALCULATE(MAX('Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */),'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=0)
 
VAR PreviousYearQuarters = FORMAT(VALUE(LEFT(SelectedQuarters, 4)) - 1, "0000") & MID(SelectedQuarters, 5, 3)
 
VAR CurrentValue =
    CALCULATE(
        [RBOB ATTAINMENT % _L3],
        'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ = SelectedQuarters
    )
 
VAR PreviousValue =
    CALCULATE(
       [RBOB ATTAINMENT % _L3],
        'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ = PreviousYearQuarters, ALL('Daily Weekly Switch'[Frequency]),ALL('Snapshot Quarter'), ALL(  'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */)
    )
 
RETURN
    // DIVIDE(CurrentValue - PreviousValue, PreviousValue)
    CurrentValue - PreviousValue
```

#### CQ attrition

```dax
CALCULATE([ARR IMPACT],
            REMOVEFILTERS('Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */, 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */),         
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
            )
```

#### CQ attrition Target

```dax
var target = CALCULATE(
    SUM( 'Renewals Target'[ATTRITION] /* DB: vw_TF_EBI_RENEWALS_TARGET.ATTRITION */),
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
        // 'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "QRF",
        ALL('Snapshot Quarter'),ALL('Daily Weekly Switch'),ALL('Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */)
        )
    
RETURN IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */)
       || HASONEVALUE('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */)
       || HASONEVALUE('Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */)
       || HASONEVALUE('Region Hierarchy'[TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM */)
       || HASONEVALUE('Region Hierarchy'[SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM */)
       || HASONEVALUE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */)
       || HASONEVALUE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */) ,
       BLANK(), target
    )
```

#### CQ attrition plan Comp

```dax
// REPT(UNICHAR(160),6) &
"(" & FORMAT ( [CQ attrition]/1000000, "$#,##0.0M" ) & "/"
    & FORMAT ( [CQ attrition Target]/1000000, "$#,##0.0M" ) & ")"
```

#### CQ attrition/Risk Upside Comp

```dax
VAR _risk_upside = [RISK UPSIDE AMOUNT $]
RETURN
IF( _risk_upside < 0,
REPT(UNICHAR(160),10) &
"(" & FORMAT ( ABS(_risk_upside) /1000000, "$#,##0.0M" ) & ")",
 FORMAT ( _risk_upside/1000000, "$#,##0.0M" )
)
```

#### CQ+1 Renewal Rate Comp

```dax
VAR _rbob_actual = CALCULATE([RBOB w/o PQ Trail] + [ARR Impact_OCC], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1)
VAR _rbob = CALCULATE([RBOB w/o PQ Trail], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1)

RETURN
// REPT(UNICHAR(160),4) &
"(" & FORMAT ( _rbob_actual/1000000, "$#,##0.0M" ) & "/"
    & FORMAT ( _rbob/1000000, "$#,##0.0M" ) & ")"
```

#### CQ+1 Renewal Rate Outlook

```dax
CALCULATE([Renewal Rate], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1)
```

#### CW CQ + 1 RBOB w/o PQ Trail

```dax
CALCULATE([RBOB w/o PQ Trail],
                'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,
                'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
)
```

#### CW CQ + 1 Renewal rate

```dax
CALCULATE([RBOB w/o PQ Trail] , 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0",
       REMOVEFILTERS('Retention Snapshot Type'[SNAPSHOT_TYPE] /* DB: dataset:Retention_Snapshot_Type.SNAPSHOT_TYPE */))
```

#### CW CQ + 1 attrition $

```dax
CALCULATE([CQ + 1 Attrition], 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0")
```

#### CW Net ARR $

```dax
[W+F+UC $] + [CW attrition $]
```

#### CW RBOB w/o PQ Trail

```dax
CALCULATE([RBOB w/o PQ Trail],
                'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
                'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
)
```

#### CW Upsell # Attach

```dax
CALCULATE(DISTINCTCOUNT(Pipeline[Upsell_Attach_Key_Pipeline]),'Upsell Type'[UPSELL_TYPE] /* DB: dataset:Upsell_Type.UPSELL_TYPE */ = "Renewal Upsell", 'Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */ = "Upsell", 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
,FILTER('Snapshot Quarter', 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0")
)
```

#### CW attrition $

```dax
CALCULATE([CQ attrition], 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0")
```

#### CW renewal rate

```dax
CALCULATE([RBOB w/o PQ Trail] , 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0",
       REMOVEFILTERS('Retention Snapshot Type'[SNAPSHOT_TYPE] /* DB: dataset:Retention_Snapshot_Type.SNAPSHOT_TYPE */))
```

#### Coverage S3+ title

```dax
SWITCH(TRUE(),
SELECTEDVALUE(Parameter_Coverage[Value4]) = "S3 Q+1", "Coverage S3+ (Q+1) CovX",
SELECTEDVALUE(Parameter_Coverage[Value4]) = "S3 Q+2", "Coverage S3+ (Q+2) CovX",
SELECTEDVALUE(Parameter_Coverage[Value4]) = "S3 Q+3", "Coverage S3+ (Q+3) CovX",
SELECTEDVALUE(Parameter_Coverage[Value4]) = "S3 R4Q", "Coverage S3+ R4Q CovX"
)
```

#### Coverage Trend WoW

```dax
VAR res = [COVERAGE PIPE / TARGET LEFT TO GO X]

RETURN IF( ISBLANK(res), "",
        res
    )
```

#### Coverage Weekly Trend

```dax
CALCULATE( [COVERAGE PIPE / TARGET LEFT TO GO X],
      ALL('Qualification Quarter')
)
```

#### Creation font CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"
VAR _sel = SELECTEDVALUE(Parameter_Creation[Value4])
var _rule = SWITCH(TRUE(),
  _sel = "Gross QTD" && [CQ Gross Creation QTD %] >= 0.9, _green,
  _sel = "Gross QTD" && [CQ Gross Creation QTD %] >= 0.8, _yellow,
  _sel = "Gross QTD" && [CQ Gross Creation QTD %] < 0.8, _red,
  _sel = "Gross YTD" && [GROSS CREATED YTD %] >= 0.9, _green,
  _sel = "Gross YTD" && [GROSS CREATED YTD %] >= 0.8, _yellow,
  _sel = "Gross YTD" && [GROSS CREATED YTD %] < 0.8, _red
)

RETURN _rule
```

#### Creation title

```dax
SWITCH(TRUE(),
SELECTEDVALUE(Parameter_Creation[Value4]) = "Gross QTD", "Gross Creation QTD %",
SELECTEDVALUE(Parameter_Creation[Value4]) = "Gross YTD", "Gross Creation YTD %",
SELECTEDVALUE(Parameter_Creation[Value4]) = "Gross QTD Gap", "Gross Creation QTD Gap",
SELECTEDVALUE(Parameter_Creation[Value4]) = "Gross YTD Gap", "Gross Creation YTD Gap"
)
```

#### Deal type Concat

```dax
CONCATENATEX(SUMMARIZE(FILTER(Pipeline, Pipeline[OPP_ID] =Pipeline[OPP_ID]),'Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */), 'Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */," , ")
```

#### EOQ ARR

```dax
VAR max_q = MAX('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)
VAR EOQ_cq = [BOQ ARR $] + [Net Outlook]
VAR EOQ = [EOQ ARR $]
RETURN

SWITCH( TRUE(),
    max_q < 0, EOQ,
    max_q = 0 , EOQ_cq
    // ,max_q > 0, [BOQ ARR]
    
)
```

#### Expansion Ret title

```dax
SWITCH(TRUE(),
SELECTEDVALUE('Parameter_Retention_Exp'[Value4]) = "Upsell # CQ", "Upsell # Attach Rate CQ",
SELECTEDVALUE('Parameter_Retention_Exp'[Value4]) = "Upsell # YTD", "Upsell # Attach Rate YTD",
SELECTEDVALUE('Parameter_Retention_Exp'[Value4]) = "Upsell $ CQ", "Upsell $ Attach Rate CQ",
SELECTEDVALUE('Parameter_Retention_Exp'[Value4]) = "Upsell $ YTD", "Upsell $ Attach Rate YTD"
)
```

#### FLM COUNT > 75 CQ %

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
            "Perf",[W+F+UC %]
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

#### FLM COUNT > 75 CQ CW % WoW

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
            "Perf",[CQ MANAGER FORECAST % WoW]
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

#### FLM PART @75% QTD #

```dax
VAR flms =
       COUNTROWS(
        CALCULATETABLE(
        FILTER(
            SUMMARIZECOLUMNS( 'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,"Perf",[CQ MANAGER FORECAST %]
            ),
            [Perf] >=0.75
        ),
        'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE,
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
        'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
     --   'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
        'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
        REMOVEFILTERS ( 'Target Type' )
    )
)
VAR tot = flms + [FLM_extras_QTDProjection]
RETURN
    IF ( tot = 0, BLANK (), tot )
```

#### FLM PART @75% QTD # WoW

```dax
VAR flms =
       COUNTROWS(
        CALCULATETABLE(
        FILTER(
            SUMMARIZECOLUMNS( 'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,"Perf",[CQ MANAGER FORECAST % WoW]
            ),
            [Perf] >=0.75
        ),
        'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE,
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
        'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
     --   'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
        'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
        REMOVEFILTERS ( 'Target Type' )
    )
)
VAR tot = flms + [FLM_extras_QTDProjection]
RETURN
    IF ( tot = 0, BLANK (), tot )
```

#### FLM Participation QTD

```dax
VAR flms = 
    IF (
        HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */)
        || HASONEVALUE(Segment[SEGMENT_GROUP])
        || HASONEVALUE(Segment[SEGMENT_DISPLAY]),
        BLANK(),
        DIVIDE([FLM PART @75% QTD #], [FLM COUNT])
    )
RETURN 
    IF(flms <> 0, flms, BLANK())
```

#### FLM Participation QTD Comp

```dax
VAR Reps75 = [FLM PART @75% QTD #]

VAR AllReps = [FLM COUNT]

RETURN REPT(UNICHAR(160), 18) &
"(" & FORMAT(Reps75,"#") & "/" & 
FORMAT(AllReps,"#") & ")"
```

#### FLM Participation QTD WoW

```dax
VAR flms = 
    IF (
        NOT HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */),
        DIVIDE([FLM PART @75% QTD # WoW], [FLM COUNT]),
        BLANK()
    )
var res =
    IF(flms <> 0, flms, BLANK())
RETURN
IF( ISBLANK(res), "",
res)
```

#### FLM Participation YTD

```dax
VAR flms = 
    IF (
       HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */)
        || HASONEVALUE(Segment[SEGMENT_GROUP])
        || HASONEVALUE(Segment[SEGMENT_DISPLAY]),
        BLANK(),
        DIVIDE([FLM PART @75% YTD #], [FLM COUNT])
    )
RETURN 
    IF(flms <> 0, flms, BLANK())
```

#### FLM Participation YTD Comp

```dax
VAR Reps75 = [FLM PART @75% YTD #]

VAR AllReps = [FLM COUNT]

RETURN REPT(UNICHAR(160), 18) &
"(" & FORMAT(Reps75,"#") & "/" & 
FORMAT(AllReps,"#") & ")"
```

#### FLM Perf > 75 CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"

var _rule = SWITCH(TRUE(),
  SELECTEDVALUE('Parameter_FLM_Perf'[Value4]) = "FLM QTD" &&
  [FLM Participation QTD] >= 0.5, _green,
  SELECTEDVALUE('Parameter_FLM_Perf'[Value4]) = "FLM QTD" &&
  [FLM Participation QTD] >= 0.4, _yellow,
  SELECTEDVALUE('Parameter_FLM_Perf'[Value4]) = "FLM QTD" &&
  [FLM Participation QTD] < 0.4, _red,
  SELECTEDVALUE('Parameter_FLM_Perf'[Value4]) = "FLM YTD" &&
  [FLM Participation YTD] >= 0.5, _green,
  SELECTEDVALUE('Parameter_FLM_Perf'[Value4]) = "FLM YTD" &&
  [FLM Participation YTD] >= 0.4, _yellow,
  SELECTEDVALUE('Parameter_FLM_Perf'[Value4]) = "FLM YTD" &&
  [FLM Participation YTD] < 0.4, _red
)

RETURN _rule
```

#### FLM WITH >50% AE @75% QTD #

```dax
VAR flms =
       COUNTROWS(
        CALCULATETABLE(
        FILTER(
            SUMMARIZECOLUMNS('Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,"Perf", [FLM COUNT > 75 CQ CW %]
            ),
            [Perf] >=0.5
        ),
        'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE,
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
        'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
       -- 'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
        'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
        REMOVEFILTERS ( 'Target Type' )
    )
 )
var tot = flms + [FLM_EXTRAS_FLM WITH >50% AE @75% QTD #]

RETURN
    IF ( tot = 0, BLANK (), tot )
```

#### FLM WITH >50% AE @75% QTD # WoW

```dax
VAR flms =
       COUNTROWS(
        CALCULATETABLE(
        FILTER(
            SUMMARIZECOLUMNS('Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,"Perf", [FLM COUNT > 75 CQ CW % WoW]
            ),
            [Perf] >=0.5
        ),
        'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE,
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
        'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
       -- 'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
        'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
        REMOVEFILTERS ( 'Target Type' )
    )
 )
var tot = flms + [FLM_EXTRAS_FLM WITH >50% AE @75% QTD #]

RETURN
    IF ( tot = 0, BLANK (), tot )
```

#### FLM WITH >50% AE @75% QTD %

```dax
VAR flms = 
    IF (
        HASONEVALUE ( 'Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */ )
        || HASONEVALUE(Segment[SEGMENT_GROUP])
        || HASONEVALUE(Segment[SEGMENT_DISPLAY])
        ,
        BLANK (),
        DIVIDE([FLM WITH >50% AE @75% QTD #], [FLM COUNT])
    )

RETURN 
    IF(flms <> 0, flms, BLANK())
```

#### FLM WITH >50% AE @75% QTD % WoW

```dax
VAR flms = 
    IF (
        NOT HASONEVALUE(Pipeline[DEAL_BAND_NEW]),
        DIVIDE([FLM WITH >50% AE @75% QTD # WoW], [FLM COUNT]),
        BLANK()
    )

var res = 
    IF(flms <> 0, flms, BLANK())
RETURN
IF( ISBLANK(res), "",
res)
```

#### FLM WITH >50% AE @75% QTD comp

```dax
VAR Reps75 = [FLM WITH >50% AE @75% QTD #]

VAR AllReps = [FLM COUNT]

RETURN REPT(UNICHAR(160), 18) &
"(" & FORMAT(Reps75,"#") & "/" & 
FORMAT(AllReps,"#") & ")"
```

#### FLM WITH >50% AE @75% YTD comp

```dax
VAR Reps75 = [FLM WITH >50% AE @75% YTD #]

VAR AllReps = [FLM COUNT]

RETURN REPT(UNICHAR(160), 18) &
"(" & FORMAT(Reps75,"#") & "/" & 
FORMAT(AllReps,"#") & ")"
```

#### FLM_EXTRAS_FLM WITH >50% AE @75% QTD #

```dax
VAR flms =
       COUNTROWS(
        CALCULATETABLE(
       FILTER(
            SUMMARIZECOLUMNS('Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,"Perf",[FLM COUNT > 75 CQ CW %]
            ),
            [Perf] >=0.5
        ),
        'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */ IN { "JVIKAS"/*, "REABY"*/ },
        'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = FALSE,
        REMOVEFILTERS ( 'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ ),
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
        'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
       -- 'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
        'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
        REMOVEFILTERS ( 'Target Type' )
    )
)
RETURN
    IF ( flms = 0, BLANK (), flms )
```

#### FLM_EXTRAS_FLM WITH >50% AE @75% QTD # WoW

```dax
VAR flms =
       COUNTROWS(
        CALCULATETABLE(
       FILTER(
            SUMMARIZECOLUMNS('Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,"Perf",[FLM COUNT > 75 CQ CW % WoW]
            ),
            [Perf] >=0.5
        ),
        'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */ IN { "JVIKAS"/*, "REABY"*/ },
        'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = FALSE,
        REMOVEFILTERS ( 'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ ),
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
        'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
       -- 'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
        'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
        REMOVEFILTERS ( 'Target Type' )
    )
)
RETURN
    IF ( flms = 0, BLANK (), flms )
```

#### FLM_extras_QTDProjection

```dax
VAR flms =
       COUNTROWS(
        CALCULATETABLE(
        FILTER(
            SUMMARIZECOLUMNS( 'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,"Perf",[CQ MANAGER FORECAST %]
            ),
            [Perf] >=0.75
        ),
        'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */ IN { "JVIKAS"/*, "REABY" */},
        'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = FALSE,
         REMOVEFILTERS ( 'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ ),
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
        'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
      --  'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
        'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
         REMOVEFILTERS ( 'Target Type' )
    )
)

RETURN flms
```

#### FP # Parent Accounts

```dax
VAR _parentid_count = [ParentID Count]
RETURN
IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */)
    || HASONEVALUE('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */)
    || HASONEVALUE('Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */),
    BLANK(),
    _parentid_count
)
```

#### FP # Sub Accounts

```dax
VAR _subid_count = [Sub_MA Count]
RETURN
IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */)
    || HASONEVALUE('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */)
    || HASONEVALUE('Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */),
    BLANK(),
    _subid_count
)
```

#### FP Bookings Target

```dax
IF (

    HASONEVALUE ( 'Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */ ), BLANK (),[BOOKINGS TARGET]

)
```

#### FP RBOB

```dax
VAR _rbob = CALCULATE([RBOB w/o PQ Trail], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)

RETURN IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */)
       || HASONEVALUE('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */)
       || HASONEVALUE('Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */),
       BLANK(), _rbob
    )
```

#### FP Risk CQ

```dax
VAR _rbob = CALCULATE([Additional Risks], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)
RETURN
IF( HASONEVALUE('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */)
      || HASONEVALUE('Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */),
      BLANK(),   
    _rbob
)
```

#### FP S3 Q+1 Cov

```dax
IF (

    HASONEVALUE ( 'Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */ ), BLANK (),[S3 Q+1 Cov]

)
```

#### FP Tier 1 Parent Complete %

```dax
VAR _comp =
    CALCULATE(
        [PRNT COMPLETE %],
        'Region Hierarchy'[REP_GTM_MOTION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_GTM_MOTION */ IN {"Generalist", "Industry"},
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
        OPG[MOPG1] <> "DX VIDEO"
    )
RETURN
IF(
    ISINSCOPE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */) ||
    ISINSCOPE('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */) ||
    ISINSCOPE('Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */),
    BLANK(),
    _comp
)
```

#### FP Tier 1 Sub Complete %

```dax
var _comp = 
        CALCULATE([TIER 1 COMPLETED %], 
            'Region Hierarchy'[REP_GTM_MOTION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_GTM_MOTION */ = "Solution",
            'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */="Active",
            OPG[MOPG1] <> "DX VIDEO" )
RETURN 
IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */)
    || HASONEVALUE('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */)
    || HASONEVALUE('Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */),
    BLANK(),
    _comp
)
```

#### FP Upside Savables CQ

```dax
VAR _sav = CALCULATE([Savables], 
          'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0 )

RETURN
IF( HASONEVALUE('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */)
      || HASONEVALUE('Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */),
      BLANK(),   
    _sav
)
```

#### FP W+F+UC%

```dax
IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */), BLANK(), CALCULATE([W+F+UC %], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0))
```

#### GNARR $  OL

```dax
VAR qtr = SELECTEDVALUE('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)
RETURN
IF(qtr < 0, CALCULATE('_TM1 Booking Measures'[TM1 Bookings $],ALL('Daily Weekly Switch'[Frequency]),ALL('Snapshot Quarter')),
[OPPTY $])
```

#### GNARR % WoW

```dax
VAR res = [W+F+UC %]

RETURN IF( ISBLANK(res), "",
        res
    )
```

#### GNARR OL title

```dax
SWITCH(TRUE(),
SELECTEDVALUE(Parameter_GNARR[Value4]) = "GNARR CQ", "GNARR (W+F+UC) % CQ",
SELECTEDVALUE(Parameter_GNARR[Value4]) ="GNARR YTD", "GNARR (W+F+UC) % YTD",
SELECTEDVALUE(Parameter_GNARR[Value4]) = "GNARR H1", "GNARR (W+F+UC) % H1"
)
```

#### GNARR font CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"

var _rule = SWITCH(TRUE(),
  SELECTEDVALUE(Parameter_GNARR[Value4]) = "GNARR CQ"
  && [W+F+UC %] >= 0.75, _green,
  SELECTEDVALUE(Parameter_GNARR[Value4]) = "GNARR CQ"
  && [W+F+UC %] >= 0.25, _yellow,
  SELECTEDVALUE(Parameter_GNARR[Value4]) = "GNARR CQ"
  && [W+F+UC %] >= 0, _red,
  SELECTEDVALUE(Parameter_GNARR[Value4]) = "GNARR YTD"
  && [Performance YTD %] >= 0.75, _green,
  SELECTEDVALUE(Parameter_GNARR[Value4]) = "GNARR YTD"
  && [Performance YTD %] >= 0.25, _yellow,
 SELECTEDVALUE(Parameter_GNARR[Value4]) = "GNARR YTD"
  &&  [Performance YTD %] >= 0, _red,
  SELECTEDVALUE(Parameter_GNARR[Value4]) = "GNARR H1"
  && [PERFORMANCE H1 %] >= 0.75, _green,
 SELECTEDVALUE(Parameter_GNARR[Value4]) = "GNARR H1"
  &&  [PERFORMANCE H1 %] >= 0.25, _yellow,
 SELECTEDVALUE(Parameter_GNARR[Value4]) = "GNARR H1"
  &&  [PERFORMANCE H1 %] >= 0, _red
)

RETURN _rule
```

#### Gap -ve

```dax
[GAP -VE OPPTY VS CREATION TARGET WTD $]
```

#### Geo Filtered Records

```dax
VAR MaxFilters = 6
RETURN
IF ( 
    ISFILTERED ( 'Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */ ), 
    VAR ___f = FILTERS ( 'Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */ ) 
    VAR ___r = COUNTROWS ( ___f ) 
    VAR ___t = TOPN ( MaxFilters, ___f, 'Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */ )
    VAR ___d = CONCATENATEX ( ___t, 'Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */, " | " )
    VAR ___x = "Geo = " & ___d & IF(___r > MaxFilters, ", ... [" & ___r & " items selected]") & " " 
    RETURN ___x & UNICHAR(13) & UNICHAR(10)
)
// &
// IF ( 
//     ISFILTERED ( 'Region Hierarchy'[SALES_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SALES_REGION */ ), 
//     VAR ___f = FILTERS ( 'Region Hierarchy'[SALES_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SALES_REGION */ ) 
//     VAR ___r = COUNTROWS ( ___f ) 
//     VAR ___t = TOPN ( MaxFilters, ___f, 'Region Hierarchy'[SALES_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SALES_REGION */ )
//     VAR ___d = CONCATENATEX ( ___t, 'Region Hierarchy'[SALES_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SALES_REGION */, " | " )
//     VAR ___x = "Region = " & ___d & IF(___r > MaxFilters, ", ... [" & ___r & " items selected]") & " " 
//     RETURN ___x & UNICHAR(13) & UNICHAR(10)
// )
```

#### Green # Comp

```dax
REPT(UNICHAR(160),4) &
"# " & FORMAT([Green #], "#,###")
```

#### Gross Creation Attainment trend

```dax
var res = DIVIDE([OPPTY TREND $], [GROSS CREATION QTD TREND])
VAR _res1 = IF( [GROSS CREATION QTD TREND] < 1 && NOT ISBLANK([OPPTY TREND $]), 0, res)
RETURN
IF(ISBLANK(res), "",
_res1)
```

#### Gross Creation Gap QTD

```dax
[GROSS CREATED QTD $] - [GROSS CREATION QTD]
```

#### Gross Creation Gap YTD

```dax
[GROSS CREATED YTD $] - [GROSS CREATION YTD]
```

#### H1 Attrition%

```dax
VAR actual = [H1 attrition]
VAR target = [H1 attrition Target]
VAR diff = actual - target
VAR result =  IF( AND(NOT(ISBLANK(actual)), NOT(ISBLANK(target))), 1 - DIVIDE(diff, target) )
RETURN  result
```

#### H1 Net Outlook

```dax
VAR _h1_wfuc = [W+F+UC PIPE H1 $]
VAR _h1_attrition = [H1 attrition]

RETURN  _h1_wfuc + _h1_attrition
```

#### H1 Net Plan

```dax
VAR _cq_bookings_target = [BOOKINGS TARGET H1]
// CALCULATE([BOOKINGS TARGET], 'Close Quarter'[CLOSE_GENERIC_QTR] /* DB: vw_EBI_Caldate.CLOSE_GENERIC_QTR */ in {"Q1", "Q2"},
//             'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0)
VAR _cq_attrition_plan = [H1 attrition Target]

RETURN  _cq_bookings_target + _cq_attrition_plan
```

#### H1 Net Plan Comp

```dax
// REPT(UNICHAR(160),4) &
"(" & FORMAT ( [H1 Net Outlook]/1000000, "$#,##0.0M" ) & "/"
    & FORMAT ( [H1 Net Plan]/1000000, "$#,##0.0M" ) & ")"
```

#### H1 Net% Plan

```dax
DIVIDE([H1 Net Outlook], [H1 Net Plan])
```

#### H1 attrition

```dax
CALCULATE([ARR IMPACT], 
            'Close Quarter'[CLOSE_GENERIC_QTR] /* DB: vw_EBI_Caldate.CLOSE_GENERIC_QTR */ in {"Q1","Q2"},
            'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0,
            REMOVEFILTERS('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */),
            REMOVEFILTERS('Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */, 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */)
            )
```

#### H1 attrition Comp

```dax
// REPT(UNICHAR(160),4) &
"(" & FORMAT ( [H1 attrition]/1000000, "$#,##0.0M" ) & "/"
    & FORMAT ( [H1 attrition Target]/1000000, "$#,##0.0M") & ")"
```

#### H1 attrition Target

```dax
CALCULATE(sum( 'Renewals Target'[ATTRITION] /* DB: vw_TF_EBI_RENEWALS_TARGET.ATTRITION */), 
            'Close Quarter'[CLOSE_GENERIC_QTR] /* DB: vw_EBI_Caldate.CLOSE_GENERIC_QTR */ in {"Q1","Q2"},
            'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0,
            REMOVEFILTERS('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */),
            ALL('Snapshot Quarter'),ALL('Daily Weekly Switch'),ALL('Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */)
            )
```

#### LP GROSS CREATED YTD %

```dax
VAR _num = [GROSS CREATED YTD $]
var _den = [GROSS CREATION YTD]

VAR _gross_ytd = IF( _den < 1 && NOT ISBLANK(_num),0, DIVIDE(
    [GROSS CREATED YTD $],
    [GROSS CREATION YTD]
))
RETURN
IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */), BLANK(),
  _gross_ytd)
```

#### LP GROSS CREATION QTD %

```dax
IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */), BLANK(),
[CQ Gross Creation QTD %] )
```

#### Last Refresh

```dax
"Last refreshed on:  " & [Last Data Refresh]
```

#### Mature Pipe S5+ title

```dax
SWITCH(TRUE(),
SELECTEDVALUE(Parameter_Progresssion[Value4]) = "S5+ Q+1", "Mature Pipe S5+ (Q+1) CovX",
SELECTEDVALUE(Parameter_Progresssion[Value4]) = "S5+ Q+2", "Mature Pipe S5+ (Q+2) CovX",
SELECTEDVALUE(Parameter_Progresssion[Value4]) = "S5+ Q+3", "Mature Pipe S5+ (Q+3) CovX",
SELECTEDVALUE(Parameter_Progresssion[Value4]) = "S5+ R4Q", "Mature Pipe S5+ R4Q CovX"
)
```

#### Mature Pipe Trend WoW

```dax
VAR res = DIVIDE([SS5+ $], '_Target Measures'[TARGET LEFT TO GO $])

RETURN IF( ISBLANK(res), "",
        res
    )
```

#### Measure 2

```dax
nan
```

#### Measure 3

```dax
nan
```

#### Measure 4

```dax
nan
```

#### Measure 5

```dax
nan
```

#### Measure 6

```dax
nan
```

#### Mgr My participation title

```dax
SWITCH(TRUE(),
SELECTEDVALUE('Parameter_my_participation'[Value4]) = "My Participation QTD" , "My Participation QTD",
  SELECTEDVALUE('Parameter_my_participation'[Value4]) = "My Participation YTD" , "My Participation YTD"
)
```

#### Net OL title

```dax
SWITCH(TRUE(),
SELECTEDVALUE('Parameter_Net%'[Value4]) = "Net CQ", "Net ARR% CQ",
SELECTEDVALUE('Parameter_Net%'[Value4]) ="Net YTD", "Net ARR% YTD",
SELECTEDVALUE('Parameter_Net%'[Value4]) = "Net H1", "Net ARR% H1"
)
```

#### Net Outlook

```dax
[W+F+UC $] + [Attrition OCC]
```

#### Net Plan font CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"

var _rule = SWITCH(TRUE(),
SELECTEDVALUE('Parameter_Net%'[Value4]) = "Net CQ"
  &&  [CQ Net% Plan] >= 1, _green,
 SELECTEDVALUE('Parameter_Net%'[Value4]) = "Net CQ"
  &&  [CQ Net% Plan] >= 0.85, _yellow,
 SELECTEDVALUE('Parameter_Net%'[Value4]) = "Net CQ"
  &&  [CQ Net% Plan] < 0.85, _red,
 SELECTEDVALUE('Parameter_Net%'[Value4]) = "Net YTD"
  &&   [YTD Net% Plan] >= 1, _green,
 SELECTEDVALUE('Parameter_Net%'[Value4]) = "Net YTD"
  &&  [YTD Net% Plan] >= 0.85, _yellow,
 SELECTEDVALUE('Parameter_Net%'[Value4]) = "Net YTD"
  &&  [YTD Net% Plan] < 0.85, _red,
 SELECTEDVALUE('Parameter_Net%'[Value4]) = "Net H1"
  &&  [H1 Net% Plan] >= 1, _green,
 SELECTEDVALUE('Parameter_Net%'[Value4]) = "Net H1"
  &&  [H1 Net% Plan] >= 0.85, _yellow,
 SELECTEDVALUE('Parameter_Net%'[Value4]) = "Net H1"
  &&  [H1 Net% Plan] < 0.85, _red
)

RETURN _rule
```

#### OL title WoW trend

```dax
SWITCH(TRUE(),
SELECTEDVALUE(OCC_Parameter_OL_WoW_AE[Value4]) = "GNARR", "GNARR CQ",
SELECTEDVALUE(OCC_Parameter_OL_WoW_AE[Value4]) ="S3+ LTG", "S3+ (F+U) LTG Cov CQ",
SELECTEDVALUE(OCC_Parameter_OL_WoW_AE[Value4]) = "S5+ LTG", "S5+ (F+U) LTG Cov CQ"
)
```

#### PQ ARRAVG ParentID

```dax
[PQ ARRAVG SubId]
```

#### PQ ARRAVG SubId

```dax
CALCULATE([BOQ ARR $], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1,REMOVEFILTERS('Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */))
```

#### PQ RBOB

```dax
CALCULATE([RBOB], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1)
```

#### PW AE QTD Participation

```dax
CALCULATE (
    [PW MANAGER FORECAST CQ %],
    ALL ( 'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ ),
    ALL ( 'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ ),
    'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
    REMOVEFILTERS('Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */)
)
```

#### PW CQ + 1 RBOB w/o PQ Trail

```dax
CALCULATE([RBOB w/o PQ Trail],
                'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,
                'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
                'Retention Snapshot Type'[SNAPSHOT_TYPE] /* DB: dataset:Retention_Snapshot_Type.SNAPSHOT_TYPE */ = "Locked",
        REMOVEFILTERS('Snapshot Quarter'),
        REMOVEFILTERS('Retention Snapshot Type'))
```

#### PW CQ + 1 attrition $

```dax
CALCULATE([CQ + 1 Attrition], 
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
        'Retention Snapshot Type'[SNAPSHOT_TYPE] /* DB: dataset:Retention_Snapshot_Type.SNAPSHOT_TYPE */ = "Locked",
        REMOVEFILTERS('Snapshot Quarter'),
        REMOVEFILTERS('Retention Snapshot Type')
)
```

#### PW CQ Attrition $ WoW

```dax
CALCULATE([CQ attrition],
'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
REMOVEFILTERS('Retention Snapshot Type'[SNAPSHOT_TYPE] /* DB: dataset:Retention_Snapshot_Type.SNAPSHOT_TYPE */))
```

#### PW FLM Participation QTD

```dax
CALCULATE([FLM Participation QTD WoW],
       'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
        ALL('Snapshot Quarter')
        )
```

#### PW FLM Participation YTD

```dax
CALCULATE([FLM Participation YTD],
       'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
        ALL('Snapshot Quarter')
        )
```

#### PW Gross Created YTD %

```dax
VAR _pw = CALCULATE(
    [GROSS CREATED YTD %],
    // 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
    ALL('Snapshot Quarter')
)
 
VAR Result = IF(
    ISBLANK(_pw),
    0,
    _pw
)
 
RETURN Result
```

#### PW Gross Creation Gap QTD

```dax
VAR _pw = CALCULATE(
    [Gross Creation Gap QTD],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
    ALL('Snapshot Quarter')
)
VAR Result = IF(
    ISBLANK(_pw),
    0,
    _pw
)

RETURN Result
```

#### PW Gross Creation Gap YTD

```dax
VAR _pw = CALCULATE(
    [Gross Creation Gap YTD],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
    ALL('Snapshot Quarter')
)
VAR Result = IF(
    ISBLANK(_pw),
    0,
    _pw
)

RETURN Result
```

#### PW Gross Creation QTD %

```dax
VAR _pw = CALCULATE(
    [LP GROSS CREATION QTD %],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
    ALL('Snapshot Quarter')
)
 
 
RETURN _pw
```

#### PW H1 Net Plan

```dax
VAR net = CALCULATE(
    [H1 Net% Plan],
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
    ALL('Snapshot Quarter')
)

VAR Result = IF(
    net = BLANK(),
    0,
    net
)

RETURN Result
```

#### PW MANAGER FORECAST CQ %

```dax
VAR MForeCQ = CALCULATE(
    [W+F+UC %],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
    ALL('Snapshot Quarter')
)

RETURN MForeCQ
```

#### PW Net ARR $

```dax
[PW W+F+UC $] + [PW attrition $]
```

#### PW Net Plan

```dax
VAR net = CALCULATE(
    [CQ Net% Plan],
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
    ALL('Snapshot Quarter')
)

VAR Result = IF(
    net = BLANK(),
    0,
    net
)

RETURN Result
```

#### PW Performance H1 %

```dax
VAR WFUC = CALCULATE(
    [PERFORMANCE H1 %],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
    ALL('Snapshot Quarter')
)

VAR Result = IF(
    WFUC = BLANK(),
    0,
    WFUC
)

RETURN Result
```

#### PW RBOB w/o PQ Trail

```dax
CALCULATE([RBOB w/o PQ Trail],
                'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
                'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
                'Retention Snapshot Type'[SNAPSHOT_TYPE] /* DB: dataset:Retention_Snapshot_Type.SNAPSHOT_TYPE */ = "Locked",
        REMOVEFILTERS('Snapshot Quarter'),
        REMOVEFILTERS('Retention Snapshot Type'))
```

#### PW Renewal Rate

```dax
// CALCULATE([RBOB w/o PQ Trail] , 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
//         'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
//        REMOVEFILTERS('Retention Snapshot Type'[SNAPSHOT_TYPE] /* DB: dataset:Retention_Snapshot_Type.SNAPSHOT_TYPE */), ALL('Snapshot Quarter')) 
//        +
    //    CALCULATE( [CQ Attrition $ WoW], 
    //     'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1" ,
    //     ALL('Snapshot Quarter'))
        CALCULATE([CQ Attrition $ WoW], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
        REMOVEFILTERS('Snapshot Quarter')
)
```

#### PW Rep Participation QTD

```dax
CALCULATE([Rep Participation QTD WoW],
       'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
        ALL('Snapshot Quarter')
        )
```

#### PW Rep Participation YTD

```dax
CALCULATE([Rep Participation YTD WoW],
       'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
        ALL('Snapshot Quarter')
        )
```

#### PW S3 Q+1 Cov

```dax
ROUND(
        CALCULATE(
            [COVERAGE PIPE / TARGET LEFT TO GO X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
            REMOVEFILTERS('Close Quarter')
        ),
    1
    )
```

#### PW S3 Q+2 Cov

```dax
ROUND(
        CALCULATE(
            [COVERAGE PIPE / TARGET LEFT TO GO X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 2,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1"
        ),
    1
    )
```

#### PW S3 Q+3 Cov

```dax
ROUND(
        CALCULATE(
            [COVERAGE PIPE / TARGET LEFT TO GO X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 3,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1"
        ),
    1
    )
```

#### PW S3+ Cov R4Q w/o x

```dax
ROUND(
        CALCULATE(
            [COVERAGE PIPE / TARGET LEFT TO GO X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ IN {0,1,2,3},
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1"
        ),
    1
    )
```

#### PW S3+(F+U) LTG Cov

```dax
VAR COVXPCT = CALCULATE(
        DIVIDE(
        [UPSIDE FORECAST PIPE $],
        '_Target Measures'[TARGET LEFT TO GO $]
    ),
    FILTER('Sales Stage',
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ IN {"S3","S4","S5+"} )
)
 
RETURN
// CONVERT(
    ROUND(
        CALCULATE(
            COVXPCT,
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
            ALL('Snapshot Quarter')
        ),
    1
    )
//     STRING
// ) & "x"
```

#### PW S5+ (Q+1) Cov

```dax
ROUND(
        CALCULATE(
            [COVERAGE MATURE PIPE / BOOKINGS TARGET X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1"
        ),
    1
    )
```

#### PW S5+ (Q+2) Cov

```dax
ROUND(
        CALCULATE(
            [COVERAGE MATURE PIPE / BOOKINGS TARGET X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 2,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1"
        ),
    1
    )
```

#### PW S5+ (Q+3) Cov

```dax
ROUND(
        CALCULATE(
            [COVERAGE MATURE PIPE / BOOKINGS TARGET X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 3,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1"
        ),
    1
    )
```

#### PW S5+ R4Q Cov

```dax
ROUND(
        CALCULATE(
            [COVERAGE MATURE PIPE / BOOKINGS TARGET X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ in {1, 2,3,4},
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1"
        ),
    1
    )
```

#### PW S5+(F+U) LTG Cov

```dax
VAR COVXPCT = CALCULATE(
        DIVIDE(
        [UPSIDE FORECAST PIPE $],
        '_Target Measures'[TARGET LEFT TO GO $]
    ),
    FILTER('Sales Stage',
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ IN {"S5+"} )
)
 
RETURN
    ROUND(
        CALCULATE(
            COVXPCT,
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
            ALL('Snapshot Quarter')
        ),
    1
    )
```

#### PW Team Participation QTD

```dax
CALCULATE([FLM WITH >50% AE @75% QTD %],
       'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
        ALL('Snapshot Quarter')
        )
```

#### PW Team Participation YTD

```dax
CALCULATE([FLM WITH >50% AE @75% YTD %],
       'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
        ALL('Snapshot Quarter')
        )
```

#### PW W+F+UC %

```dax
VAR WFUC = CALCULATE(
    [W+F+UC %],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
    ALL('Snapshot Quarter'),
    ALL('Daily Weekly Switch')
)

// VAR Result = IF(
//     WFUC = BLANK(),
//     0,
//     WFUC
// )

RETURN WFUC
```

#### PW YTD Net Plan

```dax
VAR net = CALCULATE(
    [YTD Net% Plan],
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
    ALL('Snapshot Quarter')
)

VAR Result = IF(
    net = BLANK(),
    0,
    net
)

RETURN Result
```

#### PW attrition $

```dax
CALCULATE([CQ attrition], 
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
        'Retention Snapshot Type'[SNAPSHOT_TYPE] /* DB: dataset:Retention_Snapshot_Type.SNAPSHOT_TYPE */ = "Locked",
        REMOVEFILTERS('Snapshot Quarter'),
        REMOVEFILTERS('Retention Snapshot Type')
)
```

#### PY Attrition% Plan

```dax
VAR _PY_attrition = CALCULATE([ARR IMPACT], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -4)
VAR _PY_attrition_plan = CALCULATE(sum('Renewals Target'[ATTRITION] /* DB: vw_TF_EBI_RENEWALS_TARGET.ATTRITION */),
                            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -4
                            //  ,'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "QRF" 
                             )


RETURN
DIVIDE(_PY_attrition, _PY_attrition_plan)
```

#### PY W+F+UC %

```dax
VAR WFUC = CALCULATE(
    [W+F+UC %],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -4
    // ,
    // 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
    // ALL('Snapshot Quarter')
)

VAR Result = IF(
    WFUC = BLANK(),
    0,
    WFUC
)

RETURN Result
```

#### Performance H1 Comp.

```dax
// REPT ( UNICHAR ( 160 ), 2 ) & 
    "("
    & FORMAT ( [W+F+UC PIPE H1 $]/1000000, "$#,##0.0M" ) & "/"
    & FORMAT ( [BOOKINGS TARGET H1]/1000000, "$#,##0.0M" ) & ")"
```

#### Performance YTD Comp.

```dax
// REPT ( UNICHAR ( 160 ), 2 ) & 
    "("
    & FORMAT ( [W+F+UC PIPE YTD $]/1000000, "$#,##0.0M" ) & "/"
    & FORMAT ( [BOOKINGS TARGET YTD]/1000000, "$#,##0.0M") & ")"
```

#### Pipe Weekly Trend

```dax
VAR res = [PIPE $]

RETURN IF( ISBLANK(res), "",
        res
    )
```

#### Pipeline title WoW trend

```dax
SWITCH(TRUE(),
SELECTEDVALUE(OCC_Parameter_Pipeline_WoW[Value4]) = "Creation", "Creation",
SELECTEDVALUE(OCC_Parameter_Pipeline_WoW[Value4]) ="Coverage", "Coverage",
SELECTEDVALUE(OCC_Parameter_Pipeline_WoW[Value4]) = "Mature Pipe", "Mature Pipe"
)
```

#### QTD attin

```dax
VAR result = IF(ISBLANK([GROSS CREATION QTD]), BLANK(), [GROSS CREATION QTD %])

RETURN
    IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */),
    BLANK(),
    result )
```

#### QoQ Change ARRAVG ParentID

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR _cq = [CQ ARRAVG ParentID]
VAR _pq = [PQ ARRAVG ParentID]
VAR Diff = (_cq - _pq)
VAR _result = DIVIDE(Diff,ABS(_pq))
 
RETURN

IF(Diff > 0,
    UPARROW &" "& FORMAT(_result,"0.0%")&" QoQ",
    DOWNARROW &" "& FORMAT(ABS(_result),"0.0%")&" QoQ")
```

#### QoQ Change ARRAVG SubId

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR _cq = [CQ ARRAVG SubId]
VAR _pq = [PQ ARRAVG SubId]
VAR Diff = (_cq - _pq)
VAR _result = DIVIDE(Diff,ABS(_pq))
 
RETURN

IF(Diff > 0,
    UPARROW &" "& FORMAT(_result,"0.0%")&" QoQ",
    DOWNARROW &" "& FORMAT(ABS(_result),"0.0%")&" QoQ")
```

#### QoQ Change RBOB

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR _cq = [FP RBOB]
VAR _pq = [PQ RBOB]
VAR Diff = (_cq - _pq)
VAR _result = DIVIDE(Diff,ABS(_pq))
 
RETURN

IF(Diff > 0,
    UPARROW &" "& FORMAT(_result,"0.0%")&" QoQ",
    DOWNARROW &" "& FORMAT(ABS(_result),"0.0%")&" QoQ")
```

#### Red # Comp

```dax
REPT(UNICHAR(160),2) &
"# " & FORMAT([Red #], "#,###")
```

#### Red% # Comp

```dax
REPT(UNICHAR(160),4) &
"# " & FORMAT([Red #]/1000, "#,0.0K")
```

#### Renewal Attrition Plan

```dax
VAR result = [RENEWALS ATTRITION $]
RETURN
    IF (
        HASONEVALUE ( 'Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ )
        || HASONEVALUE('Region Hierarchy'[TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM */)
        || HASONEVALUE('Region Hierarchy'[SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM */)
        || HASONEVALUE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */)
        || HASONEVALUE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */),
        BLANK (),
        result
    )
```

#### Renewal Rate Ret title

```dax
SWITCH(TRUE(),
SELECTEDVALUE(Parameter_Renwal_Retention[Value4]) = "Renewal Rate CQ", "Renewal Rate CQ",
SELECTEDVALUE(Parameter_Renwal_Retention[Value4]) ="Renewal Rate YTD", "Renewal Rate YTD",
SELECTEDVALUE(Parameter_Renwal_Retention[Value4]) = "Renewal Rate Q+1", "Renewal Rate Q+1"
)
```

#### Rep CQ%

```dax
CALCULATE(
             [MANAGER FORECAST CQ %]
            ,
            ALL('Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */),
            ALL('Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */),
            'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1
        )
```

#### Rep CY Projection #

```dax
var cnt = 
 CALCULATE(
                COUNTROWS(
                    FILTER(
                        SUMMARIZECOLUMNS(
                            'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */,
                            "attn", [VP CY Projection %]
                        ),
                        [attn] >= 0.75
                    )
                ),
                'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
                'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place",
                'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
                'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
                'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
                'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
                REMOVEFILTERS('Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */)
                
            )

    RETURN
    IF ( cnt = 0, BLANK (), cnt )
```

#### Rep CY Projection # WoW

```dax
var cnt = 
 CALCULATE(
                COUNTROWS(
                    FILTER(
                        SUMMARIZECOLUMNS(
                            'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */,
                            "attn", [VP CY Projection % WoW]
                        ),
                        [attn] >= 0.75
                    )
                ),
                'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
                'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place",
                'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
                'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
                'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
                'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
                REMOVEFILTERS('Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */)
                
            )

    RETURN
    IF ( cnt = 0, BLANK (), cnt )
```

#### Rep CY Projection > 75 Comp

```dax
REPT(UNICHAR(160),16) &
"(" & FORMAT ( [Rep CY Projection #], "#" ) & "/"
    & FORMAT ( [AE IN SEAT], "#" ) & ")"
```

#### Rep CY Projection > 75%

```dax
IF (
        HASONEVALUE ( 'Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */ ),
        BLANK (),
[VP CY Projection %]
)
```

#### Rep CY Projection > 75% WoW

```dax
var res =
IF (
        HASONEVALUE ( 'Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */ ),
        BLANK (),
DIVIDE([Rep CY Projection # WoW],[AE IN SEAT])
)
RETURN
IF( ISBLANK(res) ,"", res)
```

#### Rep Participation QTD

```dax
IF (
        HASONEVALUE ( 'Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */ )
        || HASONEVALUE(Segment[SEGMENT_GROUP])
        || HASONEVALUE(Segment[SEGMENT_DISPLAY])
        ,
        BLANK (),
DIVIDE([AE PART @75% QTD #],[AE IN SEAT])
)
```

#### Rep Participation QTD # WoW

```dax
var cnt = 
 CALCULATE(
                COUNTROWS(
                    FILTER(
                        SUMMARIZECOLUMNS(
                            'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */,
                            "attn", [CQ MANAGER FORECAST % WoW]
                        ),
                        [attn] >= 0.75
                    )
                ),
                'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
                'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place",
                'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
                'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
                'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
                'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
                REMOVEFILTERS('Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */)
                
            )

    RETURN
    IF ( cnt = 0, BLANK (), cnt )
```

#### Rep Participation QTD Comp

```dax
VAR Reps75 = [AE PART @75% QTD #]

VAR AllReps = [AE IN SEAT]

RETURN 
REPT(UNICHAR(160), 16) &
"(" & FORMAT(Reps75,"#") & "/" & 
FORMAT(AllReps,"#") & ")"
```

#### Rep Participation QTD WoW

```dax
VAR res = 
IF (
        HASONEVALUE ( 'Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */ ),
        BLANK (),
DIVIDE([Rep Participation QTD # WoW],[AE IN SEAT],BLANK())
)

RETURN
IF( ISBLANK(res), "",
res)
```

#### Rep Participation YTD

```dax
IF (
        HASONEVALUE ( 'Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */ )
        || HASONEVALUE(Segment[SEGMENT_GROUP])
        || HASONEVALUE(Segment[SEGMENT_DISPLAY]),
        BLANK (),
DIVIDE([AE PART @75% YTD #],[AE IN SEAT],BLANK())
)
```

#### Rep Participation YTD # WoW

```dax
var cnt = 
 CALCULATE(
                COUNTROWS(
                    FILTER(
                        SUMMARIZECOLUMNS(
                            'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */,
                            "attn", [YTD MANAGER FORECAST % WoW]
                        ),
                        [attn] >= 0.75
                    )
                ),
                'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
                'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place",
                'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
                'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
                'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
                'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
                REMOVEFILTERS('Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */)
                
            )

    RETURN
    IF ( cnt = 0, BLANK (), cnt )
```

#### Rep Participation YTD Comp

```dax
VAR Reps75 = [AE PART @75% YTD #]

VAR AllReps = [AE IN SEAT]


RETURN REPT(UNICHAR(160), 16) &
"(" & FORMAT(Reps75,"#") & "/" & 
FORMAT(AllReps,"#") & ")"
```

#### Rep Participation YTD WoW

```dax
var res = IF (
        HASONEVALUE ( 'Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */ ),
        BLANK (),
DIVIDE([Rep Participation YTD # WoW],[AE IN SEAT],BLANK())
)
RETURN
IF( ISBLANK(res), "",
res)
```

#### Ret Attrition font CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"

var _rule = SWITCH(TRUE(),
  SELECTEDVALUE(Parameter_ret_attrition[Value4]) = "Attrition CQ"
  &&  [CQ Attrition %]  >= 1, _green,
  SELECTEDVALUE(Parameter_ret_attrition[Value4]) = "Attrition CQ"
  &&  [CQ Attrition %] < 1 , _red,
  SELECTEDVALUE(Parameter_ret_attrition[Value4]) = "Attrition YTD"
  &&  [YTD Attrition%] >= 1 , _green,
  SELECTEDVALUE(Parameter_ret_attrition[Value4]) = "Attrition YTD"
  &&  [YTD Attrition%] < 1, _red,
  SELECTEDVALUE(Parameter_ret_attrition[Value4]) = "Attrition Q+1"
  &&  [CQ + 1 Attrition %] >= 1 , _green,
  SELECTEDVALUE(Parameter_ret_attrition[Value4]) = "Attrition Q+1"
  &&  [CQ + 1 Attrition %] < 1, _red
)

RETURN _rule
```

#### Retention title WoW trend

```dax
SWITCH(TRUE(),
SELECTEDVALUE(OCC_Parameter_Retention_WoW[Value4]) = "Renewal Rate", "Renewal Rate CQ",
SELECTEDVALUE(OCC_Parameter_Retention_WoW[Value4]) ="Attrition", "Attrition CQ",
SELECTEDVALUE(OCC_Parameter_Retention_WoW[Value4]) = "Expansion", "Expansion CQ"
)
```

#### Retention title WoW trend AE

```dax
SWITCH(TRUE(),
SELECTEDVALUE(OCC_Parameter_Retention_WoW_AE[Value4]) = "Renewal Rate", "Renewal Rate CQ",
SELECTEDVALUE(OCC_Parameter_Retention_WoW_AE[Value4]) ="Attrition", "Attrition $ CQ",
SELECTEDVALUE(OCC_Parameter_Retention_WoW_AE[Value4]) = "Expansion", "Expansion CQ"
)
```

#### S3 Q+1 Cov

```dax
VAR _s3 = 
    ROUND(
        CALCULATE(
            [COVERAGE PIPE / TARGET LEFT TO GO X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0",
            REMOVEFILTERS('Close Quarter')
        ),
    1
    )
RETURN IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */), BLANK(), _s3)
```

#### S3 Q+2 Cov

```dax
VAR _result =
    ROUND(
        CALCULATE(
            [COVERAGE PIPE / TARGET LEFT TO GO X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 2,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    1
    )
RETURN IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */), BLANK(), _result)
```

#### S3 Q+3 Cov

```dax
VAR _result = 
    ROUND(
        CALCULATE(
            [COVERAGE PIPE / TARGET LEFT TO GO X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 3,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    1
    )
RETURN IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */), BLANK(), _result)
```

#### S3+ AE OL title

```dax
SWITCH(TRUE(),
SELECTEDVALUE('Parameter_OL_S3+LTG'[Value4]) = "S3+(F+U) LTG CovX", "S3+(F+U) LTG CovX",
SELECTEDVALUE('Parameter_OL_S3+LTG'[Value4]) = "Won", "Won",
SELECTEDVALUE('Parameter_OL_S3+LTG'[Value4]) = "Forecast", "Forecast",
SELECTEDVALUE('Parameter_OL_S3+LTG'[Value4]) = "Upside", "Upside"
)
```

#### S3+ Cov R4Q w/o x

```dax
VAR s = 
    ROUND(
        CALCULATE(
            [COVERAGE PIPE / TARGET LEFT TO GO X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ IN {0,1,2,3},
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    1
    )
RETURN IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */), BLANK(), s)
```

#### S3+ Cov font CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"

var _rule = SWITCH(TRUE(),
    SELECTEDVALUE(Parameter_Coverage[Value4]) = "S3 Q+1" &&
  [S3 Q+1 Cov] >= 2.5, _green,
  SELECTEDVALUE(Parameter_Coverage[Value4]) = "S3 Q+1" &&
  [S3 Q+1 Cov] >= 2.0, _yellow,
  SELECTEDVALUE(Parameter_Coverage[Value4]) = "S3 Q+1" &&
  [S3 Q+1 Cov] < 2.0, _red,
  SELECTEDVALUE(Parameter_Coverage[Value4]) = "S3 Q+2" &&
  [S3 Q+2 Cov] > 1.2, _green,
  SELECTEDVALUE(Parameter_Coverage[Value4]) = "S3 Q+2" &&
  [S3 Q+2 Cov] >= 0.9, _yellow,
  SELECTEDVALUE(Parameter_Coverage[Value4]) = "S3 Q+2" &&
  [S3 Q+2 Cov] < 0.9, _red,
  SELECTEDVALUE(Parameter_Coverage[Value4]) = "S3 Q+3" &&
  [S3 Q+3 Cov] > 1.2, _green,
  SELECTEDVALUE(Parameter_Coverage[Value4]) = "S3 Q+3" &&
  [S3 Q+3 Cov] >= 0.9, _yellow,
  SELECTEDVALUE(Parameter_Coverage[Value4]) = "S3 Q+3" &&
  [S3 Q+3 Cov] < 0.9, _red,
  SELECTEDVALUE(Parameter_Coverage[Value4]) = "S3 Q+3" &&
  [S3+ Cov R4Q w/o x] > 1.2, _green,
  SELECTEDVALUE(Parameter_Coverage[Value4]) = "S3 Q+3" &&
  [S3+ Cov R4Q w/o x] >= 0.9, _yellow,
  SELECTEDVALUE(Parameter_Coverage[Value4]) = "S3 Q+3" &&
  [S3+ Cov R4Q w/o x] < 0.9, _red
)

RETURN _rule
```

#### S3+ Forecast $

```dax
CALCULATE (
    [FORECAST $],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)
```

#### S3+ Upside $

```dax
CALCULATE (
    [UPSIDE $],
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */  <> "S1-S2",
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)
```

#### S3+ Won $

```dax
CALCULATE (
    [WON $],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)
```

#### S3+(F+U) LTG Cov

```dax
VAR s =

    ROUND(
        CALCULATE(
            [S3+(F+U) LTG Cov L1],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0",
            REMOVEFILTERS('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)
        ),
    1
    )
RETURN IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */), BLANK(), s)
```

#### S3+(F+U) LTG Cov Comp

```dax
VAR num = CALCULATE(
        [UPSIDE FORECAST PIPE $],
    FILTER('Sales Stage',
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ IN {"S3","S4","S5+"} ),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
)
VAR den = CALCULATE(
        [TARGET LEFT TO GO $],
    FILTER('Sales Stage',
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ IN {"S3","S4","S5+"} ),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
)

RETURN
// REPT(UNICHAR(160),3) &
"(" & FORMAT(num/1000000, "$#,##0.0M") & "/" &
FORMAT(den/1000000, "$#,##0.0M") & ")"
```

#### S3+(F+U) LTG Cov L1

```dax
CALCULATE(
        DIVIDE(
        [UPSIDE FORECAST PIPE $],
        '_Target Measures'[TARGET LEFT TO GO $]
    )
    ,FILTER('Sales Stage',
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ IN {"S3","S4","S5+"} )
)
```

#### S3+(F+U) LTG Cov WoW

```dax
CALCULATE(
            [S3+(F+U) LTG Cov L1],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
            REMOVEFILTERS('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)
        )
```

#### S3+(F+U) LTG Cov WoW trend

```dax
IF( ISBLANK([S3+(F+U) LTG Cov WoW]), "", [S3+(F+U) LTG Cov WoW] )
```

#### S3+(F+U) LTG CovX

```dax
CONVERT(
    ROUND(
        CALCULATE(
            [S3+(F+U) LTG Cov L1],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    1
    ),
    STRING ) & "x"
```

#### S3+(F+U) LTG CovX font CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"

var _rule = SWITCH(TRUE(),
  SELECTEDVALUE('Parameter_OL_S3+LTG'[Value4]) = "S3+(F+U) LTG CovX" &&
  [S3+(F+U) LTG Cov] >= 1, _green,
  SELECTEDVALUE('Parameter_OL_S3+LTG'[Value4]) = "S3+(F+U) LTG CovX" &&
  [S3+(F+U) LTG Cov] >= 0.8, _yellow,
  SELECTEDVALUE('Parameter_OL_S3+LTG'[Value4]) = "S3+(F+U) LTG CovX" &&
  [S3+(F+U) LTG Cov] < 0.8, _red,
  "#252423"
)

RETURN _rule
```

#### S5+ (F+U) LTG Cov Comp

```dax
VAR num = CALCULATE(
        [UPSIDE FORECAST PIPE $],
        FILTER('Sales Stage',
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ IN {"S5+"} ),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
)
VAR den = CALCULATE(
        [TARGET LEFT TO GO $],
        FILTER('Sales Stage',
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ IN {"S5+"} ),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
)

RETURN
// REPT(UNICHAR(160),2) &
"(" & FORMAT(num/1000000, "$#,##0.0M") & "/" &
FORMAT(den/1000000, "$#,##0.0M") & ")"
```

#### S5+ (Q+1) Cov

```dax
VAR s =
    ROUND(
        CALCULATE(
            [COVERAGE MATURE PIPE / BOOKINGS TARGET X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0",
            REMOVEFILTERS('Close Quarter')
        ),
    1
    )
RETURN IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */), BLANK(), s)
```

#### S5+ (Q+2) Cov

```dax
VAR s =
    ROUND(
        CALCULATE(
            [COVERAGE MATURE PIPE / BOOKINGS TARGET X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 2,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    1
    )
RETURN IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */), BLANK(), s)
```

#### S5+ (Q+3) Cov

```dax
ROUND(
        CALCULATE(
            [COVERAGE MATURE PIPE / BOOKINGS TARGET X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 3,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    1
    )
```

#### S5+ AE OL title

```dax
SWITCH(TRUE(),
SELECTEDVALUE('Parameter_OL_S5+LTG'[Value4]) = "S5+(F+U) LTG CovX", "S5+(F+U) LTG CovX",
SELECTEDVALUE('Parameter_OL_S5+LTG'[Value4]) = "S5+ Forecast", "S5+ Forecast",
SELECTEDVALUE('Parameter_OL_S5+LTG'[Value4]) = "S5+ Upside", "S5+ Upside"
)
```

#### S5+ Forecast $

```dax
CALCULATE([FORECAST $], 
 'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ = "S5+",
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)
```

#### S5+ Mature Pipe Cov CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"
VAR mature_pipe = CALCULATE(
            [COVERAGE MATURE PIPE / BOOKINGS TARGET X],
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        )

var _rule = SWITCH(TRUE(),
  mature_pipe > 1.2, _green,
  mature_pipe >= 0.9, _yellow,
  mature_pipe < 0.9, _red
)

RETURN _rule
```

#### S5+ Mature font CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"

var _rule = SWITCH(TRUE(),
  SELECTEDVALUE(Parameter_Progresssion[Value4]) = "S5+ Q+1" &&
  [S5+ (Q+1) Cov] > 1.2, _green,
  SELECTEDVALUE(Parameter_Progresssion[Value4]) = "S5+ Q+1" &&
  [S5+ (Q+1) Cov] >= 0.9, _yellow,
  SELECTEDVALUE(Parameter_Progresssion[Value4]) = "S5+ Q+1" &&
  [S5+ (Q+1) Cov] < 0.9, _red,
  "#252423"
)

RETURN _rule
```

#### S5+ R4Q Cov

```dax
VAR s =
    ROUND(
        CALCULATE(
            [COVERAGE MATURE PIPE / BOOKINGS TARGET X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ in {1, 2,3,4},
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    1
    )
RETURN IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */), BLANK(), s)
```

#### S5+ Upside $

```dax
CALCULATE([UPSIDE $], 'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ = "S5+",
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
    )
```

#### S5+ Won $

```dax
CALCULATE([WON $], 
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
 )
```

#### S5+(F+U) LTG

```dax
CALCULATE(
        DIVIDE(
        [UPSIDE FORECAST PIPE $],
        '_Target Measures'[TARGET LEFT TO GO $]
    ),
    FILTER('Sales Stage',
    'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ IN {"S5+"} )
)
```

#### S5+(F+U) LTG Cov

```dax
VAR s = 
    ROUND(
        CALCULATE(
            [S5+(F+U) LTG],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    1
    )
RETURN IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */), BLANK(), s)
```

#### S5+(F+U) LTG Cov WoW

```dax
CALCULATE(
            [S5+(F+U) LTG],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
            REMOVEFILTERS('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)
        )
```

#### S5+(F+U) LTG Cov WoW trend

```dax
IF( ISBLANK([S5+(F+U) LTG Cov WoW]), "", [S5+(F+U) LTG Cov WoW] )
```

#### S5+(F+U) LTG CovX

```dax
CONVERT(
    ROUND(
        CALCULATE(
            [S5+(F+U) LTG],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    1
    ), 
    STRING ) & "x"
```

#### S5+(F+U) LTG CovX font CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"

var _rule = SWITCH(TRUE(),
  SELECTEDVALUE('Parameter_OL_S5+LTG'[Value4]) = "S5+(F+U) LTG CovX" &&
  [S5+(F+U) LTG Cov] >= 1, _green,
  SELECTEDVALUE('Parameter_OL_S5+LTG'[Value4]) = "S5+(F+U) LTG CovX" &&
  [S5+(F+U) LTG Cov] >= 0.8, _yellow,
  SELECTEDVALUE('Parameter_OL_S5+LTG'[Value4]) = "S5+(F+U) LTG CovX" &&
  [S5+(F+U) LTG Cov] < 0.8, _red,
  "#252423"
)

RETURN _rule
```

#### Savables

```dax
VAR SelectedSnapshotType = SELECTEDVALUE('Retention Snapshot Type'[SNAPSHOT_TYPE] /* DB: dataset:Retention_Snapshot_Type.SNAPSHOT_TYPE */)
VAR Savables =  CALCULATE(SUM(Retention[RISK_UPSIDE_AMOUNT]), Retention[RISK_UPSIDE_AMOUNT] > 0, REMOVEFILTERS('Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */, 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */))
VAR Result = IF(ISBLANK(SelectedSnapshotType),
                CALCULATE(Savables,
                            'Retention Snapshot Type'[SNAPSHOT_TYPE] /* DB: dataset:Retention_Snapshot_Type.SNAPSHOT_TYPE */ IN {"Historical","Locked"}),
                Savables)

RETURN Result
```

#### Sol Green Comp

```dax
REPT(UNICHAR(160),4) &
"# " & FORMAT([Sol Green #], "#,###")
```

#### Sol Health Movement count moving down

```dax
CALCULATE (
        DISTINCTCOUNT('Customer Solution Health Movement'[acc_sol_key] /* DB: dataset:Customer_Solution_Health_Movement.acc_sol_key */),
        'Health Movement Metadata'[HEALTH_MOVEMENT_TYPE] /* DB: dataset:Health_Movement_Metadata.HEALTH_MOVEMENT_TYPE */ = "Trending Down"
    )
```

#### Sol Health Movement count moving down indicator

```dax
VAR _month = MAX('Customer Solution Health Movement'[Month] /* DB: dataset:Customer_Solution_Health_Movement.Month */)

RETURN 
// CALCULATE([Sol Health Movement count moving down], 'Customer Solution Health Movement'[Month] /* DB: dataset:Customer_Solution_Health_Movement.Month */ = _month,REMOVEFILTERS('Customer Solution Health Movement'))
_month
```

#### Sol Health Movement count moving up

```dax
CALCULATE (
        DISTINCTCOUNT('Customer Solution Health Movement'[acc_sol_key] /* DB: dataset:Customer_Solution_Health_Movement.acc_sol_key */),
        'Health Movement Metadata'[HEALTH_MOVEMENT_TYPE] /* DB: dataset:Health_Movement_Metadata.HEALTH_MOVEMENT_TYPE */ = "Trending Up"
    )
```

#### Sol Red % Comp

```dax
REPT(UNICHAR(160),4) &
"# " & FORMAT([Sol Red #]/1000, "#,0.0K")
```

#### Sol Red Comp

```dax
REPT(UNICHAR(160),2) &
"# " & FORMAT([Sol Red #], "#,###")
```

#### Sol Yellow Comp

```dax
REPT(UNICHAR(160),4) &
"# " & FORMAT([Sol Yellow #], "#,###")
```

#### Solution Health title

```dax
SWITCH(TRUE(),
SELECTEDVALUE(Parameter_Health[Parameter_Health Order]) = "Sol R/Y/G by ARR Child", "Solution G/Y/R by ARR Child",
SELECTEDVALUE(Parameter_Health[Parameter_Health Order]) = "Sol R/Y/G by Count Child", "Solution G/Y/R by Count Child",
SELECTEDVALUE(Parameter_Health[Parameter_Health Order]) = "Acc R/Y/G by ARR Child", "Account G/Y/R by ARR Child",
SELECTEDVALUE(Parameter_Health[Parameter_Health Order]) = "Acc R/Y/G by Count Child", "Account G/Y/R by Count Child"
)
```

#### TargetReportURL

```dax
"https://app.powerbi.com/groups/me/apps/5d0c87e5-fc57-4a83-b885-1dddf55552b4/reports/a6f237e1-5b43-42a9-8c16-5156ad07abeb/da92189c1caa95290d2a?experience=power-bi"
```

#### Team Perf > 50 CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"

var _rule = SWITCH(TRUE(),
  SELECTEDVALUE('Parameter_Team_Perf'[Value4]) = "Team QTD" &&
  [FLM WITH >50% AE @75% QTD %] >= 0.5, _green,
  SELECTEDVALUE('Parameter_Team_Perf'[Value4]) = "Team QTD" &&
  [FLM WITH >50% AE @75% QTD %] >= 0.4, _yellow,
  SELECTEDVALUE('Parameter_Team_Perf'[Value4]) = "Team QTD" &&
  [FLM WITH >50% AE @75% QTD %] < 0.4, _red,
  SELECTEDVALUE('Parameter_Team_Perf'[Value4]) = "Team YTD" &&
  [FLM WITH >50% AE @75% YTD %] >= 0.5, _green,
  SELECTEDVALUE('Parameter_Team_Perf'[Value4]) = "Team YTD" &&
  [FLM WITH >50% AE @75% YTD %] >= 0.4, _yellow,
  SELECTEDVALUE('Parameter_Team_Perf'[Value4]) = "Team YTD" &&
  [FLM WITH >50% AE @75% YTD %] < 0.4, _red
)

RETURN _rule
```

#### Total Pipe Cov font CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"
VAR tot_pipe = CALCULATE(
            '_Coverage Measures'[COVERAGE PIPE / TARGET LEFT TO GO X],
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        )
var _rule = SWITCH(TRUE(),
  tot_pipe >= 2.5, _green,
  tot_pipe >= 2.0, _yellow,
   _red
)

RETURN _rule
```

#### Totalrow Accnt ACtivity

```dax
COUNTROWS('Account Activities')
```

#### Upsell # Test

```dax
VAR cw = CALCULATE([CQ Upsell # Attach %], 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0")

VAR pw = CALCULATE([CQ Upsell # Attach %], 
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
        'Retention Snapshot Type'[SNAPSHOT_TYPE] /* DB: dataset:Retention_Snapshot_Type.SNAPSHOT_TYPE */ = "Locked",
        REMOVEFILTERS('Snapshot Quarter'),
        REMOVEFILTERS('Retention Snapshot Type'))
VAR diff = cw - pw

RETURN pw
```

#### VP CY Projection %

```dax
CALCULATE(
    [CY PROJECTION %],
    ALL('Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */),
    ALL('Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */),
	REMOVEFILTERS('Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */),
    REMOVEFILTERS('Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */)

)
```

#### VP CY Projection % WoW

```dax
CALCULATE(
    [CY PROJECTION % WoW],
    ALL('Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */),
    ALL('Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */),
	All('Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */)
)
```

#### VP FLM Perf title

```dax
SWITCH(TRUE(),
SELECTEDVALUE(Parameter_FLM_Perf[Value4]) = "FLM QTD", "FLM Participation > 75% QTD",
SELECTEDVALUE(Parameter_FLM_Perf[Value4]) ="FLM YTD", "FLM Participation > 75% YTD"
)
```

#### VP My Part CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"
 
var _rule = SWITCH(TRUE(),
  SELECTEDVALUE('Parameter_my_participation'[Value4]) = "My Participation QTD" &&
  [AE QTD Participation] >= 0.75, _green,
  SELECTEDVALUE('Parameter_my_participation'[Value4]) = "My Participation QTD" &&
  [AE QTD Participation] >= 0.25, _yellow,
  SELECTEDVALUE('Parameter_my_participation'[Value4]) = "My Participation QTD" &&
  [AE QTD Participation] < 0.25, _red,
  SELECTEDVALUE('Parameter_my_participation'[Value4]) = "My Participation YTD" &&
  [AE YTD Participation] >= 0.75, _green,
  SELECTEDVALUE('Parameter_my_participation'[Value4]) = "My Participation YTD" &&
  [AE YTD Participation] >= 0.25, _yellow,
  SELECTEDVALUE('Parameter_my_participation'[Value4]) = "My Participation YTD" &&
  [AE YTD Participation] < 0.25, _red
)
 
RETURN _rule
```

#### VP OL title WoW trend

```dax
SWITCH(TRUE(),
SELECTEDVALUE(OCC_Parameter_OL_WoW_VP[Value4]) = "GNARR", "GNARR CQ",
SELECTEDVALUE(OCC_Parameter_OL_WoW_VP[Value4]) ="Attrition", "Attrition CQ",
SELECTEDVALUE(OCC_Parameter_OL_WoW_VP[Value4]) = "Net", "Net ARR CQ"
)
```

#### VP Perf title WoW trend

```dax
SWITCH(TRUE(),
SELECTEDVALUE(OCC_Parameter_Perf_WoW[Value4]) = "Rep", "Rep Participation QTD",
SELECTEDVALUE(OCC_Parameter_Perf_WoW[Value4]) ="Team", "Team Participation QTD",
SELECTEDVALUE(OCC_Parameter_Perf_WoW[Value4]) = "FLM", "FLM Participation QTD"
)
```

#### VP Rep Perf > 75 CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"

var _rule = SWITCH(TRUE(),
  SELECTEDVALUE('Parameter_Rep_perf'[Value4]) = "Rep QTD" &&
  [Rep Participation QTD] >= 0.5, _green,
  SELECTEDVALUE('Parameter_Rep_perf'[Value4]) = "Rep QTD" &&
  [Rep Participation QTD] >= 0.4, _yellow,
  SELECTEDVALUE('Parameter_Rep_perf'[Value4]) = "Rep QTD" &&
  [Rep Participation QTD] < 0.4, _red,
  SELECTEDVALUE('Parameter_Rep_perf'[Value4]) = "Rep YTD" &&
  [Rep Participation YTD] >= 0.5, _green,
  SELECTEDVALUE('Parameter_Rep_perf'[Value4]) = "Rep YTD" &&
  [Rep Participation YTD] >= 0.4, _yellow,
  SELECTEDVALUE('Parameter_Rep_perf'[Value4]) = "Rep YTD" &&
  [Rep Participation YTD] < 0.4, _red,
  SELECTEDVALUE('Parameter_Rep_perf'[Value4]) = "CY Projection" &&
  [CY PROJECTION %] >= 0.5, _green,
  SELECTEDVALUE('Parameter_Rep_perf'[Value4]) = "CY Projection" &&
  [CY PROJECTION %] >= 0.4, _yellow,
  SELECTEDVALUE('Parameter_Rep_perf'[Value4]) = "CY Projection" &&
  [CY PROJECTION %] < 0.4, _red
)

RETURN _rule
```

#### VP Rep Perf title

```dax
SWITCH(TRUE(),
SELECTEDVALUE(Parameter_Rep_perf[Value4]) = "Rep QTD", "Rep Participation > 75% QTD",
SELECTEDVALUE(Parameter_Rep_perf[Value4]) ="Rep YTD", "Rep Participation > 75% YTD",
SELECTEDVALUE(Parameter_Rep_perf[Value4]) = "CY Projection", "Rep CY Projection > 75%"
)
```

#### VP Team Perf title

```dax
SWITCH(TRUE(),
SELECTEDVALUE(Parameter_Team_Perf[Value4]) = "Team QTD", "Team Participation > 50% QTD",
SELECTEDVALUE(Parameter_Team_Perf[Value4]) = "Team YTD", "Team Participation > 50% YTD"
)
```

#### W+F+UC $ OL

```dax
VAR qtr = SELECTEDVALUE('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)
VAR curr_ = CALCULATE([W+F+UC $], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ >= 0)
VAR past_ = CALCULATE('_TM1 Booking Measures'[TM1 Bookings $],ALL('Daily Weekly Switch'[Frequency]),ALL('Snapshot Quarter'))
RETURN
curr_ + past_
```

#### W+F+UC $ YTD Pipe OL

```dax
VAR past_ =
    CALCULATE (
        '_TM1 Booking Measures'[TM1 Bookings $],
        ALL ( 'Daily Weekly Switch'[Frequency] ),
        ALL ( 'Snapshot Quarter' ),
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ < 0,
        'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0,
        REMOVEFILTERS ( 'Close Quarter' )
    )
VAR curr_ =
    CALCULATE (
        [W+F+UC $],
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ in {0},
        'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0,
        REMOVEFILTERS ( 'Close Quarter' )
    )
RETURN
    past_ + curr_
```

#### Weekly Change S3+ Q+1 Covx

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR Diff = ([S3 Q+1 Cov] - [PW S3 Q+1 Cov])
 
RETURN
 
IF(Diff > 0,
    UPARROW &" "& FORMAT(Diff,"0.0")&"x"&" WoW",
    DOWNARROW &" "& Format(ABS(Diff),"0.0")&"x"&" WoW")
```

#### Weekly Change S3+ Q+2 Covx

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR Diff = ([S3 Q+2 Cov] - [PW S3 Q+2 Cov])
 
RETURN
 
IF(Diff > 0,
    UPARROW &" "& FORMAT(Diff,"0.0")&"x"&" WoW",
    DOWNARROW &" "& Format(ABS(Diff),"0.0")&"x"&" WoW")
```

#### Weekly Change S3+ Q+3 Covx

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR Diff = ([S3 Q+3 Cov] - [PW S3 Q+3 Cov])
 
RETURN
 
IF(Diff > 0,
    UPARROW &" "& FORMAT(Diff,"0.0")&"x"&" WoW",
    DOWNARROW &" "& Format(ABS(Diff),"0.0")&"x"&" WoW")
```

#### Weekly Change S3+ R4Q Covx

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR Diff = ([S3+ Cov R4Q w/o x] - [PW S3+ Cov R4Q w/o x])
 
RETURN
 
IF(Diff > 0,
    UPARROW &" "& FORMAT(Diff,"0.0")&"x"&" WoW",
    DOWNARROW &" "& Format(ABS(Diff),"0.0")&"x"&" WoW")
```

#### Weekly Change S5+ Q+1 Covx

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR Diff = ([S5+ (Q+1) Cov] - [PW S5+ (Q+1) Cov])
 
RETURN
 
IF(Diff > 0,
    UPARROW &" "& FORMAT(Diff,"0.0")&"x"&" WoW",
    DOWNARROW &" "& Format(ABS(Diff),"0.0")&"x"&" WoW")
```

#### Weekly Change S5+ Q+2 Covx

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR Diff = ([S5+ (Q+2) Cov] - [PW S5+ (Q+2) Cov])
 
RETURN
 
IF(Diff > 0,
    UPARROW &" "& FORMAT(Diff,"0.0")&"x"&" WoW",
    DOWNARROW &" "& Format(ABS(Diff),"0.0")&"x"&" WoW")
```

#### Weekly Change S5+ Q+3 Covx

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR Diff = ([S5+ (Q+3) Cov] - [PW S5+ (Q+3) Cov])
 
RETURN
 
IF(Diff > 0,
    UPARROW &" "& FORMAT(Diff,"0.0")&"x"&" WoW",
    DOWNARROW &" "& Format(ABS(Diff),"0.0")&"x"&" WoW")
```

#### Weekly Change S5+ R4Q Covx

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR Diff = ([S5+ R4Q Cov] - [PW S5+ R4Q Cov])
 
RETURN
 
IF(Diff > 0,
    UPARROW &" "& FORMAT(Diff,"0.0")&"x"&" WoW",
    DOWNARROW &" "& Format(ABS(Diff),"0.0")&"x"&" WoW")
```

#### Weekly Gross Creation Gap QTD

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR Diff = ([Gross Creation Gap QTD] - [PW Gross Creation Gap QTD])
 
RETURN
 
IF(Diff > 0,
    UPARROW &" "& FORMAT(Diff,"$#,,M")&" WoW",
    DOWNARROW &" "& Format(ABS(Diff),"$#,,M")&" WoW")
```

#### Weekly Gross Creation Gap YTD

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR Diff = ([Gross Creation Gap YTD] - [PW Gross Creation Gap YTD])
 
RETURN
 
IF(Diff > 0,
    UPARROW &" "& FORMAT(Diff,"$#,,M")&" WoW",
    DOWNARROW &" "& Format(ABS(Diff),"$#,,M")&" WoW")
```

#### WoW CQ + 1 Attrition $

```dax
VAR UPARROW =
    UNICHAR ( 9650 )
VAR DOWNARROW =
    UNICHAR ( 9660 )
VAR cw = [CW CQ + 1 attrition $]
VAR pw = [PW CQ + 1 attrition $]
VAR diff = cw - pw
VAR res =
    DIVIDE ( diff, pw )
RETURN
    SWITCH (
        TRUE (),
        res > 0,
            UPARROW & " " & FORMAT ( res, "0.0%" ) & " WoW",
        res < 0,
            DOWNARROW & " " & FORMAT ( ABS(res), "0.0%" ) & " WoW",
        FORMAT ( res, "0.0%" ) & " WoW"
    )
```

#### WoW CQ + 1 Renewal Rate

```dax
VAR UPARROW =
    UNICHAR ( 9650 )
VAR DOWNARROW =
    UNICHAR ( 9660 )
VAR cw = DIVIDE([CW CQ + 1 RBOB w/o PQ Trail] + [CW CQ + 1 attrition $], [CW CQ + 1 RBOB w/o PQ Trail])
VAR pw = DIVIDE([PW CQ + 1 RBOB w/o PQ Trail] + [PW CQ + 1 attrition $], [PW CQ + 1 RBOB w/o PQ Trail] )
VAR diff = cw - pw
VAR res =
    DIVIDE ( diff, pw )
RETURN
    SWITCH (
        TRUE (),
        res > 0,
            UPARROW & " " & FORMAT ( diff, "0.0%" ) & " Pts WoW",
        res < 0,
            DOWNARROW & " " & FORMAT ( ABS(diff), "0.0%" ) & " Pts WoW",
        FORMAT ( diff, "0.0%" ) & " Pts WoW"
    )
```

#### WoW CQ Attrition $

```dax
VAR UPARROW =
    UNICHAR ( 9650 )
VAR DOWNARROW =
    UNICHAR ( 9660 )
VAR cw = [CW attrition $]
VAR pw = [PW attrition $]
VAR diff = cw - pw
VAR res =
    DIVIDE ( diff, pw )
RETURN
    SWITCH (
        TRUE (),
        res > 0,
            UPARROW & " " & FORMAT ( res, "0.0%" ) & " WoW",
        res < 0,
            DOWNARROW & " " & FORMAT ( ABS(res), "0.0%" ) & " WoW",
        FORMAT ( res, "0.0%" ) & " WoW"
    )
```

#### WoW CQ Net ARR $

```dax
VAR UPARROW =
    UNICHAR ( 9650 )
VAR DOWNARROW =
    UNICHAR ( 9660 )
VAR cw = [CW Net ARR $]
VAR pw = [PW Net ARR $]
VAR diff = cw - pw
VAR res =
    DIVIDE ( diff, pw )
RETURN
    SWITCH (
        TRUE (),
        res > 0,
            UPARROW & " " & FORMAT ( res, "0.0%" ) & " WoW",
        res < 0,
            DOWNARROW & " " & FORMAT ( ABS(res), "0.0%" ) & " WoW",
        FORMAT ( res, "0.0%" ) & " WoW"
    )
```

#### WoW CQ Renewal Rate

```dax
VAR UPARROW =
    UNICHAR ( 9650 )
VAR DOWNARROW =
    UNICHAR ( 9660 )
VAR cw = DIVIDE([CW RBOB w/o PQ Trail] + [CW attrition $], [CW RBOB w/o PQ Trail])
VAR pw = DIVIDE([PW RBOB w/o PQ Trail] + [PW attrition $], [PW RBOB w/o PQ Trail] )
VAR diff = cw - pw
VAR res =
    DIVIDE ( diff, pw )
RETURN
    SWITCH (
        TRUE (),
        res > 0,
            UPARROW & " " & FORMAT ( diff, "0.0%" ) & " Pts WoW",
        res < 0,
            DOWNARROW & " " & FORMAT ( ABS(diff), "0.0%" ) & " Pts WoW",
        FORMAT ( diff, "0.0%" ) & " Pts WoW"
    )
```

#### WoW CQ Upsell # Rate

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR cw = CALCULATE([CQ Upsell # Attach %], 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0")

VAR pw = CALCULATE([CQ Upsell # Attach %], 
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
        'Retention Snapshot Type'[SNAPSHOT_TYPE] /* DB: dataset:Retention_Snapshot_Type.SNAPSHOT_TYPE */ = "Locked",
        REMOVEFILTERS('Snapshot Quarter'),
        REMOVEFILTERS('Retention Snapshot Type'))
VAR diff = cw - pw

RETURN

SWITCH(TRUE(), 
    diff > 0,
    UPARROW &" "& FORMAT(diff,"0.0%")&" Pts WoW",
    diff < 0,
    DOWNARROW &" "& FORMAT(ABS(diff),"0.0%")&" Pts WoW",
    FORMAT(diff,"0.0%")&" Pts WoW"
)
```

#### WoW CQ Upsell $ Attach Rate

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR cw = CALCULATE([CQ Upsell $ Attach Rate w/o snapshot], 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0")

VAR pw = CALCULATE([CQ Upsell $ Attach Rate w/o snapshot], 
        'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
        'Retention Snapshot Type'[SNAPSHOT_TYPE] /* DB: dataset:Retention_Snapshot_Type.SNAPSHOT_TYPE */ = "Locked",
        REMOVEFILTERS('Snapshot Quarter'),
        REMOVEFILTERS('Retention Snapshot Type'))
VAR diff = cw - pw

RETURN

SWITCH(TRUE(), 
    diff > 0,
    UPARROW &" "& FORMAT(diff,"0.0%")&" Pts WoW",
    diff < 0,
    DOWNARROW &" "& FORMAT(ABS(diff),"0.0%")&" Pts WoW",
    FORMAT(diff,"0.0%")&" Pts WoW"
)
```

#### WoW H1 Attrition $

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR cw = CALCULATE([CQ Attrition $ WoW], 'Close Quarter'[CLOSE_GENERIC_QTR] /* DB: vw_EBI_Caldate.CLOSE_GENERIC_QTR */ in {"Q1","Q2"},
            'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0,
            REMOVEFILTERS('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */),
       FILTER('Snapshot Quarter', 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
))
VAR pw = CALCULATE([CQ Attrition $ WoW], 'Close Quarter'[CLOSE_GENERIC_QTR] /* DB: vw_EBI_Caldate.CLOSE_GENERIC_QTR */ in {"Q1","Q2"},
            'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0,
            REMOVEFILTERS('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */),
       FILTER('Snapshot Quarter', 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1" ))
VAR diff = cw - pw
VAR perc = DIVIDE(diff, pw)

RETURN

SWITCH(TRUE(), 
    perc > 0,
    UPARROW &" "& FORMAT(perc,"0.0%")&" WoW",
    perc < 0,
    DOWNARROW &" "& FORMAT(perc,"0.0%")&" WoW",
    FORMAT(perc,"0.0%")&" WoW"
)
```

#### WoW YTD Attrition $

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR cw = CALCULATE([CQ Attrition $ WoW], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0,
        'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0, REMOVEFILTERS('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */),
       FILTER('Snapshot Quarter', 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0" )
    // 'Retention MetaData'[IS_EOQ] /* DB: vw_TD_EBI_Retention_MetaData.IS_EOQ */ = 1
    )
VAR pw = CALCULATE([CQ Attrition $ WoW], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0,
        'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0,REMOVEFILTERS('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */),
       FILTER('Snapshot Quarter', 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1"))
VAR diff = cw - pw
VAR perc = DIVIDE(diff, pw)

RETURN

SWITCH(TRUE(), 
    perc > 0,
    UPARROW &" "& FORMAT(perc,"0.0%")&" WoW",
    perc < 0,
    DOWNARROW &" "& FORMAT(perc,"0.0%")&" WoW",
    FORMAT(perc,"0.0%")&" WoW"
)
```

#### WoW YTD Net ARR

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR cw = CALCULATE([CQ Attrition $ WoW], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0,
        'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0,
       FILTER('Snapshot Quarter', 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0")) +
       CALCULATE([W+F+UC $], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
       FILTER('Snapshot Quarter', 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"))
VAR pw = CALCULATE([CQ Attrition $ WoW], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0,
        'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0,
       FILTER('Snapshot Quarter', 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1")) +
       CALCULATE([W+F+UC $], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0,
       FILTER('Snapshot Quarter', 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1"))
VAR diff = cw - pw
VAR perc = DIVIDE(diff, pw)

RETURN

SWITCH(TRUE(), 
    perc > 0,
    UPARROW &" "& FORMAT(perc,"0.0%")&" WoW",
    perc < 0,
    DOWNARROW &" "& FORMAT(perc,"0.0%")&" WoW",
    FORMAT(perc,"0.0%")&" WoW"
)
```

#### WoW YTD Upsell # Rate

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
VAR cw = CALCULATE(DISTINCTCOUNT(Pipeline[Upsell_Attach_Key_Pipeline]),'Upsell Type'[UPSELL_TYPE] /* DB: dataset:Upsell_Type.UPSELL_TYPE */ = "Renewal Upsell", 'Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */ = "Upsell", 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0, 'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0
,FILTER('Snapshot Quarter', 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0")
)

VAR pw = CALCULATE(DISTINCTCOUNT(Pipeline[Upsell_Attach_Key_Pipeline]),'Upsell Type'[UPSELL_TYPE] /* DB: dataset:Upsell_Type.UPSELL_TYPE */ = "Renewal Upsell", 'Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */ = "Upsell", 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0, 'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0
,FILTER('Snapshot Quarter', 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1")
)
VAR diff = cw - pw
VAR perc = DIVIDE(diff, pw)

RETURN

SWITCH(TRUE(), 
    diff > 0,
    UPARROW &" "& FORMAT(perc,"0.0%")&" WoW",
    diff < 0,
    DOWNARROW &" "& FORMAT(perc,"0.0%")&" WoW",
    FORMAT(perc,"0.0%")&" WoW"
)
```

#### Won $ OL

```dax
VAR qtr = SELECTEDVALUE('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)
VAR curr_ = CALCULATE([WON $], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ >= 0)
VAR past_ = CALCULATE('_TM1 Booking Measures'[TM1 Bookings $],ALL('Daily Weekly Switch'[Frequency]),ALL('Snapshot Quarter'))
RETURN
curr_ + past_
```

#### YTD Attrition%

```dax
VAR actual = [YTD attrition]
VAR target = [YTD attrition Plan]
VAR diff = actual - target
VAR result =  IF( AND(NOT(ISBLANK(actual)), NOT(ISBLANK(target))), 1 - DIVIDE(diff, target) )
RETURN  result
```

#### YTD MANAGER FORECAST % WoW

```dax
CALCULATE(
    [W+F+UC %],
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0,
    'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0
,
ALL('Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */),
    ALL('Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */)
)
```

#### YTD Net Outlook

```dax
VAR _ytd_wfuc = [W+F+UC PIPE YTD $]
VAR _ytd_attrition = [YTD attrition]

RETURN  _ytd_wfuc + _ytd_attrition
```

#### YTD Net Plan

```dax
VAR _ytd_wfuc = [BOOKINGS TARGET YTD]
VAR _ytd_attrition = [YTD attrition Plan]

RETURN  _ytd_wfuc + _ytd_attrition
```

#### YTD Net Plan Comp

```dax
// REPT(UNICHAR(160),4) &
"(" & FORMAT ( [YTD Net Outlook]/1000000, "$#,##0.0M" ) & "/"
    & FORMAT ( [YTD Net Plan]/1000000, "$#,##0.0M" ) & ")"
```

#### YTD Net% Plan

```dax
DIVIDE([YTD Net Outlook], [YTD Net Plan])
```

#### YTD Renewal Rate

```dax
VAR _rbob_actual = CALCULATE([RBOB w/o PQ Trail] + [ARR Impact_OCC], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0, 'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0)
VAR _rbob = CALCULATE([RBOB w/o PQ Trail], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0, 'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0)

RETURN
DIVIDE(_rbob_actual, _rbob)
```

#### YTD Renewal Rate Comp

```dax
VAR _rbob_actual = CALCULATE([RBOB w/o PQ Trail] + [ARR Impact_OCC], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0, 'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0)
VAR _rbob = CALCULATE([RBOB w/o PQ Trail], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0, 'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0)

RETURN
// REPT(UNICHAR(160),2) &
"(" & FORMAT ( _rbob_actual/1000000, "$#,##0.0M" ) & "/"
    & FORMAT ( _rbob/1000000, "$#,##0.0M" ) & ")"
```

#### YTD Risk Upside

```dax
VAR risk = CALCULATE([Additional Risks], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0, 'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0)
VAR upside = CALCULATE([Savables], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0, 'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0)

RETURN
"Risk " & FORMAT(risk/1000000, "$#,##0.0M") &
" | " &
"Upside " & FORMAT(upside/1000000, "$#,##0.0M")
```

#### YTD Upsell # Attach %

```dax
VAR RenewalUpsell_C = CALCULATE(DISTINCTCOUNT(Pipeline[Upsell_Attach_Key_Pipeline]),'Upsell Type'[UPSELL_TYPE] /* DB: dataset:Upsell_Type.UPSELL_TYPE */ = "Renewal Upsell", 'Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */ = "Upsell", 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0, 'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0)

    VAR RBOB_C = CALCULATE(DISTINCTCOUNT(Retention[Upsell_Attach_Key_Ren]), 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0, 'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0, REMOVEFILTERS('Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */, 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */), REMOVEFILTERS('Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */))

    Var Result = DIVIDE(RenewalUpsell_C, RBOB_C)
    Return
    Result
```

#### YTD Upsell # Attach % Comp

```dax
VAR RenewalUpsell_C = CALCULATE(DISTINCTCOUNT(Pipeline[Upsell_Attach_Key_Pipeline]),'Upsell Type'[UPSELL_TYPE] /* DB: dataset:Upsell_Type.UPSELL_TYPE */ = "Renewal Upsell", 'Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */ = "Upsell", 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0, 'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0)

    VAR RBOB_C = CALCULATE(DISTINCTCOUNT(Retention[Upsell_Attach_Key_Ren]), 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0, 'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0, REMOVEFILTERS('Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */, 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */), REMOVEFILTERS('Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */))

    Return
    "( " & FORMAT ( RenewalUpsell_C, "#" ) & "/"
    & FORMAT ( RBOB_C, "#" ) & " Deals )"
```

#### YTD Upsell $ Attach Rate

```dax
VAR RenewalUpsell = CALCULATE([OPPTY $], 'Upsell Type'[UPSELL_TYPE] /* DB: dataset:Upsell_Type.UPSELL_TYPE */ = "Renewal Upsell", 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0, 'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0,'Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */=TRUE)
VAR RBOB = CALCULATE([RBOB w/o PQ Trail], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0, 'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0)

Var Result = DIVIDE(RenewalUpsell, RBOB)
Return
Result
```

#### YTD Upsell $ Attach Rate Comp

```dax
VAR RenewalUpsell = CALCULATE([OPPTY $], 'Upsell Type'[UPSELL_TYPE] /* DB: dataset:Upsell_Type.UPSELL_TYPE */ = "Renewal Upsell", 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0, 'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0, 'Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */ = TRUE )
VAR RBOB = CALCULATE([RBOB w/o PQ Trail], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0, 'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0)

RETURN
// REPT(UNICHAR(160),2) &
"(" & FORMAT ( RenewalUpsell/1000000, "$#,##0.0M" ) & "/"
    & FORMAT ( RBOB/1000000, "$#,##0.0M" ) & ")"
```

#### YTD attrition

```dax
CALCULATE([ARR IMPACT], 
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0,
            'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0,
            REMOVEFILTERS('Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */, 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */))
```

#### YTD attrition Comp

```dax
// REPT(UNICHAR(160),4) &
"(" & FORMAT ( [YTD attrition]/1000000, "$#,##0.0M" ) & "/"
    & FORMAT ( [YTD attrition Plan]/1000000, "$#,##0.0M" ) & ")"
```

#### YTD attrition Plan

```dax
CALCULATE(SUM( 'Renewals Target'[ATTRITION] /* DB: vw_TF_EBI_RENEWALS_TARGET.ATTRITION */),
'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0,
'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0,
ALL('Snapshot Quarter'),ALL('Daily Weekly Switch'),ALL('Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */)
)
```

#### Yellow # Comp

```dax
REPT(UNICHAR(160),4) &
"# " & FORMAT([Yellow #], "#,###")
```

#### blank_dummy

```dax
BLANK()
```

#### test FP Complete %

```dax
var _comp = CALCULATE([TIER 1 COMPLETED %], 
        FILTER( 'Region Hierarchy',
            'Region Hierarchy'[REP_GTM_MOTION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_GTM_MOTION */ = "Solution"
            ))
RETURN 
IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */)
    || HASONEVALUE('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */)
    || HASONEVALUE('Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */),
    BLANK(),
    _comp
)
```

#### test GROSS CREATION QTD

```dax
VAR Qt = [test FULL QUARTER GROSS CREATION]
VAR CurrentWeek = [RECON LAST WEEK]

VAR SelectedQtrbkt =  MAX('Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ )
    VAR CurrentQtr =
        CALCULATE (
            MIN ( 'Qualification Quarter'[QUALIFICATION_GENERIC_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_GENERIC_QTR */ ),
            'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = 0
        )

VAR _past = CALCULATE([test FULL QUARTER GROSS CREATION], 'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ < 0)
VAR _curr =  IF (
                SelectedQtrbkt = 0,
                IF (
                    CurrentQtr = "Q1",
                    SWITCH (
                        TRUE (),
                        CurrentWeek <= 6,
                            ( Qt * 0.1 * CurrentWeek ) / 6,
                        CurrentWeek > 6,
                            ( Qt * 0.1 ) + ( Qt * 0.9 * ( CurrentWeek - 6 ) ) / 7
                    ),
                    ( Qt * CurrentWeek ) / 13
                ),
                CALCULATE([test FULL QUARTER GROSS CREATION], 'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = 0)
            )

RETURN _past + _curr
```

#### test Gross Created QTD

```dax
VAR CurrentQtr =
    CALCULATE (
        MIN ( 'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */ ),
        ALL ( 'Qualification Quarter' ),
        'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = 0
    )
VAR SelectedQTR =
    MIN ( 'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */ )
VAR SelectedQTRBKT =
    MIN ( 'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ )
VAR Result =
    CALCULATE (
        [OPPTY $],
        'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedQTRBKT,
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */
            IN {
                SelectedQTRBKT,
                SelectedQTRBKT + 1,
                SelectedQTRBKT + 2,
                SelectedQTRBKT + 3,
                SelectedQTRBKT + 4
            },
        KEEPFILTERS ( NOT 'Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */
            IN { "S1", "S2", "Closed CleanUp from Non Pipe", "Closed Lost from Non Pipe" } )
    )
RETURN
    SUMX (
        VALUES ( 'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */ ),
        VAR SelectedQTR = 'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */
        VAR SelectedQTRBKT =
            CALCULATE (
                MIN ( 'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ ),
                'Qualification Quarter'[QUALIFICATION_QTR] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR */ = SelectedQTR
            )
        RETURN
            CALCULATE (
                [OPPTY $],
                'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = SelectedQTRBKT,
                'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */
                    IN {
                        SelectedQTRBKT,
                        SelectedQTRBKT + 1,
                        SelectedQTRBKT + 2,
                        SelectedQTRBKT + 3,
                        SelectedQTRBKT + 4
                    },
                KEEPFILTERS ( NOT 'Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */
                    IN { "S1", "S2", "Closed CleanUp from Non Pipe", "Closed Lost from Non Pipe" } )
            )
    )
```

#### test Gross creation qtd %

```dax
DIVIDE([test Gross Created QTD], [test GROSS CREATION QTD])
```

### _Performance Measures (82 measures)

#### ACTIVE & UPDATED %

```dax
EXTERNALMEASURE("ACTIVE & UPDATED %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### ASV WIN RATE %

```dax
EXTERNALMEASURE("ASV WIN RATE %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### BOQ GEO RANK FLM

```dax
EXTERNALMEASURE("BOQ GEO RANK FLM", STRING, "DirectQuery to AS - RTB DataVerse")
```

#### BOQ GEO RANK REP

```dax
EXTERNALMEASURE("BOQ GEO RANK REP", STRING, "DirectQuery to AS - RTB DataVerse")
```

#### COMPETITOR FILL RATE %

```dax
EXTERNALMEASURE("COMPETITOR FILL RATE %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### COMPLETED IPOV %

```dax
EXTERNALMEASURE("COMPLETED IPOV %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### COMPLETED MUTUAL %

```dax
EXTERNALMEASURE("COMPLETED MUTUAL %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### CY H1 PROJECTION $

```dax
EXTERNALMEASURE("CY H1 PROJECTION $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### CY H1 PROJECTION %

```dax
EXTERNALMEASURE("CY H1 PROJECTION %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### CY PROJECTION $

```dax
EXTERNALMEASURE("CY PROJECTION $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### CY PROJECTION %

```dax
EXTERNALMEASURE("CY PROJECTION %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### CY PROJECTION WEEK 1 %

```dax
EXTERNALMEASURE("CY PROJECTION WEEK 1 %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### DEAL WIN RATE %

```dax
EXTERNALMEASURE("DEAL WIN RATE %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### DEFAULT COMMIT TYPE

```dax
EXTERNALMEASURE("DEFAULT COMMIT TYPE", STRING, "DirectQuery to AS - RTB DataVerse")
```

#### EOQ SNAPSHOT DATE

```dax
EXTERNALMEASURE("EOQ SNAPSHOT DATE", DATETIME, "DirectQuery to AS - RTB DataVerse")
```

#### FLM COUNT > 75 CQ CW %

```dax
EXTERNALMEASURE("FLM COUNT > 75 CQ CW %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### FLM COUNT > 75 YTD CW %

```dax
EXTERNALMEASURE("FLM COUNT > 75 YTD CW %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### FLM PARTICIPATION CQ >75 %

```dax
EXTERNALMEASURE("FLM PARTICIPATION CQ >75 %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### FLM PARTICIPATION CQ >75% #

```dax
EXTERNALMEASURE("FLM PARTICIPATION CQ >75% #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### FLM PARTICIPATION TOTAL FLM #

```dax
EXTERNALMEASURE("FLM PARTICIPATION TOTAL FLM #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### FLM PARTICIPATION YTD >75 %

```dax
EXTERNALMEASURE("FLM PARTICIPATION YTD >75 %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### FLM PARTICIPATION YTD >75% #

```dax
EXTERNALMEASURE("FLM PARTICIPATION YTD >75% #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### FORECAST ACCURACY PQ %

```dax
EXTERNALMEASURE("FORECAST ACCURACY PQ %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GEO RANK BASE FLM

```dax
EXTERNALMEASURE("GEO RANK BASE FLM", STRING, "DirectQuery to AS - RTB DataVerse")
```

#### GEO RANK BASE REP

```dax
EXTERNALMEASURE("GEO RANK BASE REP", STRING, "DirectQuery to AS - RTB DataVerse")
```

#### GEO RANK FLM

```dax
EXTERNALMEASURE("GEO RANK FLM", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### GEO RANK REP

```dax
EXTERNALMEASURE("GEO RANK REP", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### GROSS CREATED YTD %

```dax
EXTERNALMEASURE("GROSS CREATED YTD %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GROSS CREATION %

```dax
EXTERNALMEASURE("GROSS CREATION %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GROSS CREATION MTD %

```dax
EXTERNALMEASURE("GROSS CREATION MTD %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GROSS CREATION QTD %

```dax
EXTERNALMEASURE("GROSS CREATION QTD %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GROSS CREATION WTD %

```dax
EXTERNALMEASURE("GROSS CREATION WTD %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GROSS CREATION YTD %

```dax
EXTERNALMEASURE("GROSS CREATION YTD %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GROWTH PIPE ATTAINMENT %

```dax
EXTERNALMEASURE("GROWTH PIPE ATTAINMENT %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GROWTH PIPE ATTAINMENT QTD %

```dax
EXTERNALMEASURE("GROWTH PIPE ATTAINMENT QTD %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### IDLE OPPTY %

```dax
EXTERNALMEASURE("IDLE OPPTY %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### MANAGER FORECAST CQ %

```dax
EXTERNALMEASURE("MANAGER FORECAST CQ %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### MANAGER FORECAST CQ-1 %

```dax
EXTERNALMEASURE("MANAGER FORECAST CQ-1 %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### MANAGER FORECAST YTD %

```dax
EXTERNALMEASURE("MANAGER FORECAST YTD %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### MULTI SOLUTION ASV %

```dax
EXTERNALMEASURE("MULTI SOLUTION ASV %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### Mature Pipe SS5+ (Q+1)

```dax
CONVERT(
    ROUND(
        CALCULATE(
            [COVERAGE MATURE PIPE / BOOKINGS TARGET X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    1
    ),
    STRING
) & "x"
```

#### Mature Pipe SS5+ (Q+2)

```dax
CONVERT(
    ROUND(
        CALCULATE(
            [COVERAGE MATURE PIPE / BOOKINGS TARGET X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 2,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    1
    ),
    STRING
) & "x"
```

#### Mature Pipe SS5+ (Q+3)

```dax
CONVERT(
    ROUND(
        CALCULATE(
            [COVERAGE MATURE PIPE / BOOKINGS TARGET X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 3,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    1
    ),
    STRING
) & "x"
```

#### NET CHANGE WTD %

```dax
EXTERNALMEASURE("NET CHANGE WTD %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### OPEN OPPTY W/W ~ # %

```dax
EXTERNALMEASURE("OPEN OPPTY W/W ~ # %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### OPEN OPPTY W/W ~ %

```dax
EXTERNALMEASURE("OPEN OPPTY W/W ~ %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### OPEN STALLED PIPE %

```dax
EXTERNALMEASURE("OPEN STALLED PIPE %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### PARTNER INFLUENCE BOOKING PQ %

```dax
EXTERNALMEASURE("PARTNER INFLUENCE BOOKING PQ %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### PARTNER INFLUENCE PIPE (CY) %

```dax
EXTERNALMEASURE("PARTNER INFLUENCE PIPE (CY) %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### PERFORMANCE YTD %

```dax
EXTERNALMEASURE("PERFORMANCE YTD %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### PIPELINE ATTAINMENT %

```dax
EXTERNALMEASURE("PIPELINE ATTAINMENT %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### PQ EOQ SNAPSHOT DATE

```dax
EXTERNALMEASURE("PQ EOQ SNAPSHOT DATE", DATETIME, "DirectQuery to AS - RTB DataVerse")
```

#### REP PARTICIPATION CQ >75 %

```dax
EXTERNALMEASURE("REP PARTICIPATION CQ >75 %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### REP PARTICIPATION CQ >75 % #

```dax
EXTERNALMEASURE("REP PARTICIPATION CQ >75 % #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### REP PARTICIPATION TOTAL REPS #

```dax
EXTERNALMEASURE("REP PARTICIPATION TOTAL REPS #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### REP PARTICIPATION YTD >75 %

```dax
EXTERNALMEASURE("REP PARTICIPATION YTD >75 %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### REP PARTICIPATION YTD >75 % #

```dax
EXTERNALMEASURE("REP PARTICIPATION YTD >75 % #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### S3 %

```dax
EXTERNALMEASURE("S3 %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### S3 Q+1 CovX

```dax
CONVERT(
    ROUND(
        CALCULATE(
            [COVERAGE PIPE / TARGET LEFT TO GO X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    1
    ),
    STRING
) & "x"
```

#### S3 Q+2 CovX

```dax
CONVERT(
    ROUND(
        CALCULATE(
            [COVERAGE PIPE / TARGET LEFT TO GO X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 2,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    1
    ),
    STRING
) & "x"
```

#### S3 Q+3 CovX

```dax
CONVERT(
    ROUND(
        CALCULATE(
            [COVERAGE PIPE / TARGET LEFT TO GO X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 3,
            'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    1
    ),
    STRING
) & "x"
```

#### S3+ CQ CovX

```dax
CONVERT(
    ROUND(
        CALCULATE(
            [COVERAGE PIPE / TARGET LEFT TO GO X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
            // 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0"
        ),
    1
    ),
    STRING
) & "x"
```

#### S3>180D %

```dax
EXTERNALMEASURE("S3>180D %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### S4 %

```dax
EXTERNALMEASURE("S4 %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### S4>180D %

```dax
EXTERNALMEASURE("S4>180D %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### S5+ COVERAGE LEFT TO GO %

```dax
EXTERNALMEASURE("S5+ COVERAGE LEFT TO GO %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### SLM COUNT > 75 CQ CW %

```dax
EXTERNALMEASURE("SLM COUNT > 75 CQ CW %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### SLM COUNT > 75 YTD CW %

```dax
EXTERNALMEASURE("SLM COUNT > 75 YTD CW %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### SS5+ %

```dax
EXTERNALMEASURE("SS5+ %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### Stalled & Inactive %

```dax
EXTERNALMEASURE("Stalled & Inactive %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TEAM PARTICIPATION CQ >50 %

```dax
EXTERNALMEASURE("TEAM PARTICIPATION CQ >50 %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TEAM PARTICIPATION CQ >50 % #

```dax
EXTERNALMEASURE("TEAM PARTICIPATION CQ >50 % #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TEAM PARTICIPATION TOTAL FLM #

```dax
EXTERNALMEASURE("TEAM PARTICIPATION TOTAL FLM #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TEAM PARTICIPATION YTD >50 %

```dax
EXTERNALMEASURE("TEAM PARTICIPATION YTD >50 %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TEAM PARTICIPATION YTD >50 % #

```dax
EXTERNALMEASURE("TEAM PARTICIPATION YTD >50 % #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### W+F+UC %

```dax
EXTERNALMEASURE("W+F+UC %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### W+F+UC YTD %

```dax
EXTERNALMEASURE("W+F+UC YTD %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### WON ATTAINMENT %

```dax
EXTERNALMEASURE("WON ATTAINMENT %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### YTD PROJECTION %

```dax
EXTERNALMEASURE("YTD PROJECTION %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

**REP HISTORIC PERFORMANCE:**

#### PY Attainment %

```dax
EXTERNALMEASURE("PY Attainment %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### PY QUOTA $

```dax
EXTERNALMEASURE("PY QUOTA $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### PY WON $

```dax
EXTERNALMEASURE("PY WON $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

### _Pipeline Measures (81 measures)

#### ACTIVE & UPDATED $

```dax
EXTERNALMEASURE("ACTIVE & UPDATED $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### ASV $

```dax
EXTERNALMEASURE("ASV $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### AVG DEAL DURATION #

```dax
EXTERNALMEASURE("AVG DEAL DURATION #", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### AVG DEAL SIZE $

```dax
EXTERNALMEASURE("AVG DEAL SIZE $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### BOOKINGS TARGET YTD

```dax
EXTERNALMEASURE("BOOKINGS TARGET YTD", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### BOQ MATURE PIPE $

```dax
EXTERNALMEASURE("BOQ MATURE PIPE $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### BOQ PIPE $

```dax
EXTERNALMEASURE("BOQ PIPE $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### CLOSE RATE

```dax
EXTERNALMEASURE("CLOSE RATE", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### CLOSE RATIO

```dax
EXTERNALMEASURE("CLOSE RATIO", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### FORECAST $

```dax
EXTERNALMEASURE("FORECAST $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GAP -VE GROSS CREATED VS GROSS CREATION TARGET QTD $

```dax
EXTERNALMEASURE("GAP -VE GROSS CREATED VS GROSS CREATION TARGET QTD $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GAP -VE GROWTH PIPE VS FULL NET CREATION TARGET $

```dax
EXTERNALMEASURE("GAP -VE GROWTH PIPE VS FULL NET CREATION TARGET $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GAP -VE GROWTH PIPE VS NET CREATION TARGET QTD $

```dax
EXTERNALMEASURE("GAP -VE GROWTH PIPE VS NET CREATION TARGET QTD $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GAP -VE GROWTH PIPE VS NET CREATION TARGET WTD $

```dax
EXTERNALMEASURE("GAP -VE GROWTH PIPE VS NET CREATION TARGET WTD $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GAP -VE OPPTY VS CREATION TARGET QTD $

```dax
EXTERNALMEASURE("GAP -VE OPPTY VS CREATION TARGET QTD $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GAP -VE OPPTY VS CREATION TARGET WTD $

```dax
EXTERNALMEASURE("GAP -VE OPPTY VS CREATION TARGET WTD $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GAP -VE PIPE VS PIPE TARGET $

```dax
EXTERNALMEASURE("GAP -VE PIPE VS PIPE TARGET $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GAP -VE S5+ PIPE VS S5+ PIPE TARGET $

```dax
EXTERNALMEASURE("GAP -VE S5+ PIPE VS S5+ PIPE TARGET $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GAP TO GO $

```dax
EXTERNALMEASURE("GAP TO GO $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GPC  Q1

```dax
EXTERNALMEASURE("GPC  Q1", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GPC  Q2

```dax
EXTERNALMEASURE("GPC  Q2", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GPC  Q3

```dax
EXTERNALMEASURE("GPC  Q3", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GPC  Q4

```dax
EXTERNALMEASURE("GPC  Q4", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GROSS CREATED MONTHLY (YTD) $

```dax
EXTERNALMEASURE("GROSS CREATED MONTHLY (YTD) $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GROSS CREATED MTD $

```dax
EXTERNALMEASURE("GROSS CREATED MTD $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GROSS CREATED QTD $

```dax
EXTERNALMEASURE("GROSS CREATED QTD $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GROSS CREATED WTD $

```dax
EXTERNALMEASURE("GROSS CREATED WTD $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GROSS CREATED YTD $

```dax
EXTERNALMEASURE("GROSS CREATED YTD $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GROWTH PIPE QTD $

```dax
EXTERNALMEASURE("GROWTH PIPE QTD $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GROWTH PIPE QTD TREND $

```dax
EXTERNALMEASURE("GROWTH PIPE QTD TREND $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### GROWTH PIPE WTD $

```dax
EXTERNALMEASURE("GROWTH PIPE WTD $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### IDLE OPPTY #

```dax
EXTERNALMEASURE("IDLE OPPTY #", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### LINEARITY GAP $

```dax
EXTERNALMEASURE("LINEARITY GAP $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### LOST #

```dax
EXTERNALMEASURE("LOST #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### LOST $

```dax
EXTERNALMEASURE("LOST $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### MATURE PIPE NET CHANGE $

```dax
EXTERNALMEASURE("MATURE PIPE NET CHANGE $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### MATURE PIPE NET CHANGE WTD $

```dax
EXTERNALMEASURE("MATURE PIPE NET CHANGE WTD $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### NET CHANGE $

```dax
EXTERNALMEASURE("NET CHANGE $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### NET CHANGE WTD $

```dax
EXTERNALMEASURE("NET CHANGE WTD $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### NET CREATION QTD $

```dax
EXTERNALMEASURE("NET CREATION QTD $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### OPEN OPPTY #

```dax
EXTERNALMEASURE("OPEN OPPTY #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### OPEN OPPTY $

```dax
EXTERNALMEASURE("OPEN OPPTY $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### OPEN OPPTY W/W ~ #

```dax
EXTERNALMEASURE("OPEN OPPTY W/W ~ #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### OPEN OPPTY W/W ~ $

```dax
EXTERNALMEASURE("OPEN OPPTY W/W ~ $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### OPG ARR AVG $

```dax
EXTERNALMEASURE("OPG ARR AVG $", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### OPG TWELVE MONTH ENTRY $

```dax
EXTERNALMEASURE("OPG TWELVE MONTH ENTRY $", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### OPG TWELVE MONTH EXIT $

```dax
EXTERNALMEASURE("OPG TWELVE MONTH EXIT $", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### OPP #

```dax
EXTERNALMEASURE("OPP #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### OPPTY $

```dax
EXTERNALMEASURE("OPPTY $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### OPPTY QTD $

```dax
EXTERNALMEASURE("OPPTY QTD $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### OPPTY TREND $

```dax
EXTERNALMEASURE("OPPTY TREND $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### OPPTY W/W ~ #

```dax
EXTERNALMEASURE("OPPTY W/W ~ #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### OPPTY W/W ~ $

```dax
EXTERNALMEASURE("OPPTY W/W ~ $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### OPPTY WTD $

```dax
EXTERNALMEASURE("OPPTY WTD $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### PIPE $

```dax
EXTERNALMEASURE("PIPE $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### PREV WEEK PIPE $

```dax
EXTERNALMEASURE("PREV WEEK PIPE $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### PROJECTED CLOSE RATIO

```dax
EXTERNALMEASURE("PROJECTED CLOSE RATIO", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### Param S4 $

```dax
VAR result = [S4 $]
RETURN
    IF( HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */),
    BLANK(),
    result)
```

#### Param S5+ CovX

```dax
VAR result = [COVERAGE MATURE PIPE / BOOKINGS TARGET X]
RETURN
    IF( HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */),
    BLANK(),
    result)
```

#### Param SS5+ $

```dax
VAR result = [SS5+ $]
RETURN
    IF( HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */),
    BLANK(),
    result)
```

#### S1/S2 #

```dax
EXTERNALMEASURE("S1/S2 #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### S1/S2 $

```dax
EXTERNALMEASURE("S1/S2 $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### S3 $

```dax
EXTERNALMEASURE("S3 $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### S4 $

```dax
EXTERNALMEASURE("S4 $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### SS4 PROGRESSION $

```dax
EXTERNALMEASURE("SS4 PROGRESSION $", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### SS4 PROGRESSION QTD $

```dax
EXTERNALMEASURE("SS4 PROGRESSION QTD $", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### SS5+ $

```dax
EXTERNALMEASURE("SS5+ $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### Stalled & Inactive #

```dax
EXTERNALMEASURE("Stalled & Inactive #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### Stalled & Inactive $

```dax
EXTERNALMEASURE("Stalled & Inactive $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TRUE PROGRESSION $

```dax
EXTERNALMEASURE("TRUE PROGRESSION $", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### TRUE PROGRESSION QTD $

```dax
EXTERNALMEASURE("TRUE PROGRESSION QTD $", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### UPSIDE $

```dax
EXTERNALMEASURE("UPSIDE $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### UPSIDE COMMITTED $

```dax
EXTERNALMEASURE("UPSIDE COMMITTED $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### UPSIDE FORECAST PIPE $

```dax
EXTERNALMEASURE("UPSIDE FORECAST PIPE $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### UPSIDE TARGETED $

```dax
EXTERNALMEASURE("UPSIDE TARGETED $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### Upsell $ Attach %

```dax
0.32
```

#### W+F+UC $

```dax
EXTERNALMEASURE("W+F+UC $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### W+F+UC PIPE YTD $

```dax
EXTERNALMEASURE("W+F+UC PIPE YTD $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### WON #

```dax
EXTERNALMEASURE("WON #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### WON $

```dax
EXTERNALMEASURE("WON $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### WON $ TREND

```dax
EXTERNALMEASURE("WON $ TREND", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

### _Product Consumption (2 measures)

#### Primary Product Consumption %

```dax
EXTERNALMEASURE("Primary Product Consumption %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### Product Consumption %

```dax
EXTERNALMEASURE("Product Consumption %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

### _Retention Measures (19 measures)

#### ARR IMPACT

```dax
EXTERNALMEASURE("ARR IMPACT", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### ATTAINMENT

```dax
EXTERNALMEASURE("ATTAINMENT", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### ATTRITION

```dax
EXTERNALMEASURE("ATTRITION", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### Attrition %_

```dax
DIVIDE([ARR IMPACT], [RENEWALS ATTRITION $])
```

#### BOOKING VALUE

```dax
EXTERNALMEASURE("BOOKING VALUE", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### CLOSED #

```dax
EXTERNALMEASURE("CLOSED #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### Green #

```dax
[Green #_Ac_H]
```

#### LTG #

```dax
EXTERNALMEASURE("LTG #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### LTG OVERDUE

```dax
EXTERNALMEASURE("LTG OVERDUE", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### ON TIME RENEWAL #

```dax
EXTERNALMEASURE("ON TIME RENEWAL #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### RBOB

```dax
EXTERNALMEASURE("RBOB", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### RBOB ACTUALS $

```dax
EXTERNALMEASURE("RBOB ACTUALS $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### RBOB ATTAINMENT %

```dax
EXTERNALMEASURE("RBOB ATTAINMENT %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### RBOB ATTAINMENT YTD %

```dax
EXTERNALMEASURE("RBOB ATTAINMENT YTD %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### RENEWAL #

```dax
EXTERNALMEASURE("RENEWAL #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### RETENTION ATTAINMENT %

```dax
EXTERNALMEASURE("RETENTION ATTAINMENT %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### RISK UPSIDE AMOUNT $

```dax
EXTERNALMEASURE("RISK UPSIDE AMOUNT $", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### UPSELL

```dax
EXTERNALMEASURE("UPSELL", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### Yellow #

```dax
[Yellow #_Ac_H]
```

### _Retention Target Measures (5 measures)

#### NET ASV $

```dax
EXTERNALMEASURE("NET ASV $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### NET PUSHED $

```dax
EXTERNALMEASURE("NET PUSHED $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### RENEWALS ATTRITION $

```dax
EXTERNALMEASURE("RENEWALS ATTRITION $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### RENEWALS TOTAL ATTRITION $

```dax
EXTERNALMEASURE("RENEWALS TOTAL ATTRITION $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TRAILING BOOKED $

```dax
EXTERNALMEASURE("TRAILING BOOKED $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

### _SBR Measures (2 measures)

#### SBR ACTIVITY #

```dax
EXTERNALMEASURE("SBR ACTIVITY #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### SBR ACTIVITY DOCUMENT #

```dax
EXTERNALMEASURE("SBR ACTIVITY DOCUMENT #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

### _TM1 Booking Measures (1 measures)

#### TM1 Bookings $

```dax
EXTERNALMEASURE("TM1 Bookings $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

### _TPT Measures (92 measures)

#### NOT TIERED COMPLETED PRNT #

```dax
EXTERNALMEASURE("NOT TIERED COMPLETED PRNT #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### NOT TIERED COMPLETED PRNT %

```dax
EXTERNALMEASURE("NOT TIERED COMPLETED PRNT %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### NOT TIERED PRNT ACCTS #

```dax
EXTERNALMEASURE("NOT TIERED PRNT ACCTS #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### NOT TIERED PRNT GROSS CREATED $

```dax
EXTERNALMEASURE("NOT TIERED PRNT GROSS CREATED $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### NOT TIERED PRNT WON $

```dax
EXTERNALMEASURE("NOT TIERED PRNT WON $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### NOT TIERED ROLLUP ACCTS #

```dax
EXTERNALMEASURE("NOT TIERED ROLLUP ACCTS #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### NOT TIERED ROLLUP COMPLETED #

```dax
EXTERNALMEASURE("NOT TIERED ROLLUP COMPLETED #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### NOT TIERED ROLLUP COMPLETED %

```dax
EXTERNALMEASURE("NOT TIERED ROLLUP COMPLETED %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### NOT TIERED ROLLUP COMPLETED ASSESSED #

```dax
EXTERNALMEASURE("NOT TIERED ROLLUP COMPLETED ASSESSED #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### NOT TIERED ROLLUP COMPLETED ASSESSED %

```dax
EXTERNALMEASURE("NOT TIERED ROLLUP COMPLETED ASSESSED %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### OPP PARENT TARGET $

```dax
EXTERNALMEASURE("OPP PARENT TARGET $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### OPP TARGET $

```dax
EXTERNALMEASURE("OPP TARGET $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### OPP TARGET NO PIPE $

```dax
EXTERNALMEASURE("OPP TARGET NO PIPE $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### PRNT COMPLETE %

```dax
EXTERNALMEASURE("PRNT COMPLETE %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 ACCTS #

```dax
EXTERNALMEASURE("TIER 1 ACCTS #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 COMPLETED #

```dax
EXTERNALMEASURE("TIER 1 COMPLETED #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 COMPLETED %

```dax
EXTERNALMEASURE("TIER 1 COMPLETED %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 COMPLETED AP GREEN #

```dax
EXTERNALMEASURE("TIER 1 COMPLETED AP GREEN #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 COMPLETED AP GREEN %

```dax
EXTERNALMEASURE("TIER 1 COMPLETED AP GREEN %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 COMPLETED AP RED #

```dax
EXTERNALMEASURE("TIER 1 COMPLETED AP RED #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 COMPLETED AP RED %

```dax
EXTERNALMEASURE("TIER 1 COMPLETED AP RED %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 COMPLETED AP YELLOW #

```dax
EXTERNALMEASURE("TIER 1 COMPLETED AP YELLOW #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 COMPLETED AP YELLOW %

```dax
EXTERNALMEASURE("TIER 1 COMPLETED AP YELLOW %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 COMPLETED ASSESSED #

```dax
EXTERNALMEASURE("TIER 1 COMPLETED ASSESSED #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 COMPLETED ASSESSED %

```dax
EXTERNALMEASURE("TIER 1 COMPLETED ASSESSED %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 COMPLETED PRNT #

```dax
EXTERNALMEASURE("TIER 1 COMPLETED PRNT #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 COMPLETED PRNT %

```dax
EXTERNALMEASURE("TIER 1 COMPLETED PRNT %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 COMPLETED PRNT ASSESSED #

```dax
EXTERNALMEASURE("TIER 1 COMPLETED PRNT ASSESSED #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 COMPLETED PRNT ASSESSED %

```dax
EXTERNALMEASURE("TIER 1 COMPLETED PRNT ASSESSED %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 OWNER %

```dax
EXTERNALMEASURE("TIER 1 OWNER %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 PRNT ACCTS #

```dax
EXTERNALMEASURE("TIER 1 PRNT ACCTS #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 PRNT COMPLETED #

```dax
EXTERNALMEASURE("TIER 1 PRNT COMPLETED #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 PRNT GNARR $

```dax
EXTERNALMEASURE("TIER 1 PRNT GNARR $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 PRNT GROSS CREATED $

```dax
EXTERNALMEASURE("TIER 1 PRNT GROSS CREATED $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 PRNT WITH GNARR #

```dax
EXTERNALMEASURE("TIER 1 PRNT WITH GNARR #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 PRNT WITHOUT GNARR #

```dax
EXTERNALMEASURE("TIER 1 PRNT WITHOUT GNARR #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 PRNT WON $

```dax
EXTERNALMEASURE("TIER 1 PRNT WON $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 ROLLUP ACCTS #

```dax
EXTERNALMEASURE("TIER 1 ROLLUP ACCTS #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 ROLLUP COMPLETED #

```dax
EXTERNALMEASURE("TIER 1 ROLLUP COMPLETED #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 ROLLUP COMPLETED %

```dax
EXTERNALMEASURE("TIER 1 ROLLUP COMPLETED %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 ROLLUP COMPLETED AP GREEN #

```dax
EXTERNALMEASURE("TIER 1 ROLLUP COMPLETED AP GREEN #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 ROLLUP COMPLETED AP GREEN %

```dax
EXTERNALMEASURE("TIER 1 ROLLUP COMPLETED AP GREEN %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 ROLLUP COMPLETED AP RED #

```dax
EXTERNALMEASURE("TIER 1 ROLLUP COMPLETED AP RED #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 ROLLUP COMPLETED AP RED %

```dax
EXTERNALMEASURE("TIER 1 ROLLUP COMPLETED AP RED %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 ROLLUP COMPLETED AP YELLOW #

```dax
EXTERNALMEASURE("TIER 1 ROLLUP COMPLETED AP YELLOW #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 ROLLUP COMPLETED AP YELLOW %

```dax
EXTERNALMEASURE("TIER 1 ROLLUP COMPLETED AP YELLOW %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 ROLLUP COMPLETED ASSESSED #

```dax
EXTERNALMEASURE("TIER 1 ROLLUP COMPLETED ASSESSED #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 ROLLUP COMPLETED ASSESSED %

```dax
EXTERNALMEASURE("TIER 1 ROLLUP COMPLETED ASSESSED %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 SUB GNARR $

```dax
EXTERNALMEASURE("TIER 1 SUB GNARR $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 SUB WITH GNARR #

```dax
EXTERNALMEASURE("TIER 1 SUB WITH GNARR #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 1 SUB WITHOUT GNARR #

```dax
EXTERNALMEASURE("TIER 1 SUB WITHOUT GNARR #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 2 ACCTS #

```dax
EXTERNALMEASURE("TIER 2 ACCTS #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 2 PRNT ACCTS #

```dax
EXTERNALMEASURE("TIER 2 PRNT ACCTS #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 2 PRNT GNARR $

```dax
EXTERNALMEASURE("TIER 2 PRNT GNARR $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 2 PRNT GROSS CREATED $

```dax
EXTERNALMEASURE("TIER 2 PRNT GROSS CREATED $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 2 PRNT WITH GNARR #

```dax
EXTERNALMEASURE("TIER 2 PRNT WITH GNARR #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 2 PRNT WITHOUT GNARR #

```dax
EXTERNALMEASURE("TIER 2 PRNT WITHOUT GNARR #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 2 PRNT WON $

```dax
EXTERNALMEASURE("TIER 2 PRNT WON $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 2 ROLLUP ACCTS #

```dax
EXTERNALMEASURE("TIER 2 ROLLUP ACCTS #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 2 ROLLUP COMPLETED #

```dax
EXTERNALMEASURE("TIER 2 ROLLUP COMPLETED #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 2 ROLLUP COMPLETED %

```dax
EXTERNALMEASURE("TIER 2 ROLLUP COMPLETED %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 2 ROLLUP COMPLETED AP GREEN #

```dax
EXTERNALMEASURE("TIER 2 ROLLUP COMPLETED AP GREEN #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 2 ROLLUP COMPLETED AP GREEN %

```dax
EXTERNALMEASURE("TIER 2 ROLLUP COMPLETED AP GREEN %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 2 ROLLUP COMPLETED AP RED #

```dax
EXTERNALMEASURE("TIER 2 ROLLUP COMPLETED AP RED #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 2 ROLLUP COMPLETED AP RED %

```dax
EXTERNALMEASURE("TIER 2 ROLLUP COMPLETED AP RED %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 2 ROLLUP COMPLETED AP YELLOW #

```dax
EXTERNALMEASURE("TIER 2 ROLLUP COMPLETED AP YELLOW #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 2 ROLLUP COMPLETED AP YELLOW %

```dax
EXTERNALMEASURE("TIER 2 ROLLUP COMPLETED AP YELLOW %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 2 ROLLUP COMPLETED ASSESSED #

```dax
EXTERNALMEASURE("TIER 2 ROLLUP COMPLETED ASSESSED #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 2 ROLLUP COMPLETED ASSESSED %

```dax
EXTERNALMEASURE("TIER 2 ROLLUP COMPLETED ASSESSED %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 2 SUB GNARR $

```dax
EXTERNALMEASURE("TIER 2 SUB GNARR $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 2 SUB WITH GNARR #

```dax
EXTERNALMEASURE("TIER 2 SUB WITH GNARR #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 2 SUB WITHOUT GNARR #

```dax
EXTERNALMEASURE("TIER 2 SUB WITHOUT GNARR #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 3 ACCTS #

```dax
EXTERNALMEASURE("TIER 3 ACCTS #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 3 PRNT ACCTS #

```dax
EXTERNALMEASURE("TIER 3 PRNT ACCTS #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 3 PRNT GNARR $

```dax
EXTERNALMEASURE("TIER 3 PRNT GNARR $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 3 PRNT GROSS CREATED $

```dax
EXTERNALMEASURE("TIER 3 PRNT GROSS CREATED $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 3 PRNT WITH GNARR #

```dax
EXTERNALMEASURE("TIER 3 PRNT WITH GNARR #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 3 PRNT WITHOUT GNARR #

```dax
EXTERNALMEASURE("TIER 3 PRNT WITHOUT GNARR #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 3 PRNT WON $

```dax
EXTERNALMEASURE("TIER 3 PRNT WON $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 3 ROLLUP ACCTS #

```dax
EXTERNALMEASURE("TIER 3 ROLLUP ACCTS #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 3 ROLLUP COMPLETED #

```dax
EXTERNALMEASURE("TIER 3 ROLLUP COMPLETED #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 3 ROLLUP COMPLETED %

```dax
EXTERNALMEASURE("TIER 3 ROLLUP COMPLETED %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 3 ROLLUP COMPLETED AP GREEN #

```dax
EXTERNALMEASURE("TIER 3 ROLLUP COMPLETED AP GREEN #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 3 ROLLUP COMPLETED AP GREEN %

```dax
EXTERNALMEASURE("TIER 3 ROLLUP COMPLETED AP GREEN %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 3 ROLLUP COMPLETED AP RED #

```dax
EXTERNALMEASURE("TIER 3 ROLLUP COMPLETED AP RED #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 3 ROLLUP COMPLETED AP RED %

```dax
EXTERNALMEASURE("TIER 3 ROLLUP COMPLETED AP RED %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 3 ROLLUP COMPLETED AP YELLOW #

```dax
EXTERNALMEASURE("TIER 3 ROLLUP COMPLETED AP YELLOW #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 3 ROLLUP COMPLETED AP YELLOW %

```dax
EXTERNALMEASURE("TIER 3 ROLLUP COMPLETED AP YELLOW %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 3 ROLLUP COMPLETED ASSESSED #

```dax
EXTERNALMEASURE("TIER 3 ROLLUP COMPLETED ASSESSED #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 3 ROLLUP COMPLETED ASSESSED %

```dax
EXTERNALMEASURE("TIER 3 ROLLUP COMPLETED ASSESSED %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 3 SUB GNARR $

```dax
EXTERNALMEASURE("TIER 3 SUB GNARR $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TIER 3 SUB WITHOUT GNARR #

```dax
EXTERNALMEASURE("TIER 3 SUB WITHOUT GNARR #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

### _Target Measures (17 measures)

#### BOOKINGS TARGET

```dax
EXTERNALMEASURE("BOOKINGS TARGET", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### CQ LEFT TO GO TARGET

```dax
EXTERNALMEASURE("CQ LEFT TO GO TARGET", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### CQ RUNNING TARGET

```dax
EXTERNALMEASURE("CQ RUNNING TARGET", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### CY PLAN/QUOTA $

```dax
EXTERNALMEASURE("CY PLAN/QUOTA $", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### DEFAULT TARGET TYPE

```dax
EXTERNALMEASURE("DEFAULT TARGET TYPE", STRING, "DirectQuery to AS - RTB DataVerse")
```

#### GENERATION TARGET

```dax
EXTERNALMEASURE("GENERATION TARGET", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### GENERATION TARGET SS4

```dax
EXTERNALMEASURE("GENERATION TARGET SS4", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### IN QTR GC TARGET

```dax
EXTERNALMEASURE("IN QTR GC TARGET", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### IN QTR GC TARGET SS4

```dax
EXTERNALMEASURE("IN QTR GC TARGET SS4", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### IN QTR GC TARGET SS5

```dax
EXTERNALMEASURE("IN QTR GC TARGET SS5", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### PIPE TARGET

```dax
EXTERNALMEASURE("PIPE TARGET", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### PIPE TARGET SS4

```dax
EXTERNALMEASURE("PIPE TARGET SS4", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### PIPE TARGET SS5

```dax
EXTERNALMEASURE("PIPE TARGET SS5", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### PIPE TARGET SURVIVAL RATE SS4

```dax
EXTERNALMEASURE("PIPE TARGET SURVIVAL RATE SS4", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### PIPE TARGET SURVIVAL RATE SS5

```dax
EXTERNALMEASURE("PIPE TARGET SURVIVAL RATE SS5", CURRENCY, "DirectQuery to AS - RTB DataVerse")
```

#### PIPE TARGET TO GO

```dax
EXTERNALMEASURE("PIPE TARGET TO GO", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### TARGET LEFT TO GO $

```dax
EXTERNALMEASURE("TARGET LEFT TO GO $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

### _Walk Measures (13 measures)

#### ABS WALK VALUE

```dax
EXTERNALMEASURE("ABS WALK VALUE", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### BOQ WALK VALUE

```dax
EXTERNALMEASURE("BOQ WALK VALUE", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### CURR WALK VALUE

```dax
EXTERNALMEASURE("CURR WALK VALUE", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### LOST QTD $

```dax
EXTERNALMEASURE("LOST QTD $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### LOST WTD $

```dax
EXTERNALMEASURE("LOST WTD $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### NET MOVEMENT $

```dax
EXTERNALMEASURE("NET MOVEMENT $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### PREV WALK VALUE

```dax
EXTERNALMEASURE("PREV WALK VALUE", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### PULLED IN $

```dax
EXTERNALMEASURE("PULLED IN $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### PUSHED OUT $

```dax
EXTERNALMEASURE("PUSHED OUT $", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### STAGE PROGRESSION ASV

```dax
EXTERNALMEASURE("STAGE PROGRESSION ASV", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### WALK CLOSE RATIO %

```dax
EXTERNALMEASURE("WALK CLOSE RATIO %", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### WALK VALUE

```dax
EXTERNALMEASURE("WALK VALUE", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### Walk Oppty #

```dax
EXTERNALMEASURE("Walk Oppty #", INTEGER, "DirectQuery to AS - RTB DataVerse")
```

### kb_measures (2 measures)

#### ARR Non Zero DOAP DX

```dax
var arr = 
CALCULATE('_Account ARR Measures'[ARR $], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0, OPG[BU]="DX",
REMOVEFILTERS('Close Quarter'), REMOVEFILTERS('Create Quarter'), REMOVEFILTERS(OPG[BU]))
RETURN
IF(arr = 0, BLANK() , arr)
```

#### Outlook DME

```dax
var arr = 
CALCULATE('_Pipeline Measures'[W+F+UC PIPE YTD $], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0,'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */=0, OPG[BU]="DME",
REMOVEFILTERS('Close Quarter'), REMOVEFILTERS('Create Quarter'), REMOVEFILTERS(OPG[BU]))
RETURN
IF(arr = 0, BLANK() , arr)
```

### AE Region Hierarchy (2 measures)

#### Measure

```dax
nan
```

#### blank1

```dax
BLANK()
```

### DOAP_Fields (3 measures)

#### FLM Concat

```dax
CONCATENATEX(SUMMARIZE(FILTER('Pipeline', 'Pipeline'[OPP_ID] /* DB: vw_TF_EBI_P2S.OPP_ID */ =MAX('Pipeline'[OPP_ID] /* DB: vw_TF_EBI_P2S.OPP_ID */)),'Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */), 'Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */," | ")
```

#### OPG Concat

```dax
CONCATENATEX(SUMMARIZE(FILTER('Pipeline', 'Pipeline'[OPP_ID] /* DB: vw_TF_EBI_P2S.OPP_ID */ =MAX('Pipeline'[OPP_ID] /* DB: vw_TF_EBI_P2S.OPP_ID */)),OPG[OPG]), OPG[OPG]," | ")
```

#### Rep Concat

```dax
CONCATENATEX(SUMMARIZE(FILTER('Pipeline', 'Pipeline'[OPP_ID] /* DB: vw_TF_EBI_P2S.OPP_ID */ =MAX('Pipeline'[OPP_ID] /* DB: vw_TF_EBI_P2S.OPP_ID */)),'Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */), 'Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */," | ")
```

### DRF Pillars (8 measures)

**DRF_Measuress:**

#### Concatenated_Explanation

```dax
VAR CurrentDeal = SELECTEDVALUE('DRF Pillars'[DEAL_REG_ID] /* DB: dataset:DRF_Pillars.DEAL_REG_ID */)
VAR CurrentPillar = SELECTEDVALUE('DRF Pillars'[DRF_PILLAR] /* DB: dataset:DRF_Pillars.DRF_PILLAR */)
RETURN
CONCATENATEX(
    FILTER(
        ALL('DRF Pillars'),
        'DRF Pillars'[DEAL_REG_ID] /* DB: dataset:DRF_Pillars.DEAL_REG_ID */ = CurrentDeal &&
        'DRF Pillars'[DRF_PILLAR] /* DB: dataset:DRF_Pillars.DRF_PILLAR */ = CurrentPillar
    ),
    'DRF Pillars'[DRF_EXPLANATION] /* DB: dataset:DRF_Pillars.DRF_EXPLANATION */,
    " ||| "
)
```

#### Concatenated_Explanation_With-Question

```dax
VAR CurrentDeal = SELECTEDVALUE('DRF Pillars'[DEAL_REG_ID] /* DB: dataset:DRF_Pillars.DEAL_REG_ID */)
VAR CurrentPillar = SELECTEDVALUE('DRF Pillars'[DRF_PILLAR] /* DB: dataset:DRF_Pillars.DRF_PILLAR */)
Return
CONCATENATEX(
    FILTER(ALL('DRF Pillars'),
        'DRF Pillars'[DEAL_REG_ID] /* DB: dataset:DRF_Pillars.DEAL_REG_ID */ = CurrentDeal &&
        'DRF Pillars'[DRF_PILLAR] /* DB: dataset:DRF_Pillars.DRF_PILLAR */ = CurrentPillar
    ),
    'DRF Pillars'[Concat Q_E] /* DB: dataset:DRF_Pillars.Concat Q_E */,
    " |        |")
```

#### Deal_Rank

```dax
VAR _rank = 
RANKX (
    ALLSELECTED(Opportunity[DEAL_REG_ID]),
   
    [Deal_Sensei_Score],
    ,
    DESC,
    DENSE
)
RETURN _rank
```

#### MS_DRF_Score_

```dax
VAR CurrentDeal = SELECTEDVALUE('DRF Pillars'[DEAL_REG_ID] /* DB: dataset:DRF_Pillars.DEAL_REG_ID */)
VAR CurrentPillar = SELECTEDVALUE('DRF Pillars'[DRF_PILLAR] /* DB: dataset:DRF_Pillars.DRF_PILLAR */)
RETURN
CALCULATE(
    SUM('DRF Pillars'[DRF_SCORE] /* DB: dataset:DRF_Pillars.DRF_SCORE */),
    FILTER(
        ALL('DRF Pillars'),
        'DRF Pillars'[DEAL_REG_ID] /* DB: dataset:DRF_Pillars.DEAL_REG_ID */ = CurrentDeal &&
        'DRF Pillars'[DRF_PILLAR] /* DB: dataset:DRF_Pillars.DRF_PILLAR */ = CurrentPillar
    )
)
```

#### Max_Point

```dax
VAR CurrentDeal = SELECTEDVALUE('DRF Pillars'[DEAL_REG_ID] /* DB: dataset:DRF_Pillars.DEAL_REG_ID */)
VAR CurrentPillar = SELECTEDVALUE('DRF Pillars'[DRF_PILLAR] /* DB: dataset:DRF_Pillars.DRF_PILLAR */)
RETURN
CALCULATE(
    SUM('DRF Pillars'[DRF_MAX_POINT] /* DB: dataset:DRF_Pillars.DRF_MAX_POINT */),
    FILTER(
        ALL('DRF Pillars'),
        'DRF Pillars'[DEAL_REG_ID] /* DB: dataset:DRF_Pillars.DEAL_REG_ID */ = CurrentDeal &&
        'DRF Pillars'[DRF_PILLAR] /* DB: dataset:DRF_Pillars.DRF_PILLAR */ = CurrentPillar
    )
)
```

#### Score/Max_Point

```dax
VAR sum_Max_Point = [Max_Point]
VAR Sum_Score = [MS_DRF_Score_]
VAR Sum_Score_Display = IF(ISBLANK(Sum_Score) || Sum_Score = 0, 0, Sum_Score)
RETURN 
    REPT(UNICHAR(160), 18) &
    "(" & FORMAT(Sum_Score_Display, "#") & "/" & FORMAT(sum_Max_Point, "#") & ")"
```

#### Score/max_Point-%age

```dax
var max_Point=[Max_Point]
var Score=[MS_DRF_Score_]
RETURN
DIVIDE(Score,max_Point)
```

#### max ds score

```dax
MAX(Opportunity[DS_SCORE])
```

### Dim_Param_L3_Coverage (4 measures)

#### Masking Result

```dax
VAR _user = USERPRINCIPALNAME()
VAR _param = [Result]
VAR Cond1 = 
IF(
        (
        (ISINSCOPE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */) ||   ISFILTERED('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */)) 
        && MAX('Region Hierarchy'[IS_GERMANY_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_GERMANY_FLM */)=1
        ) 
        ||
        (
        (ISINSCOPE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */) ||  ISFILTERED('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */)) 
        && MAX('Region Hierarchy'[IS_GERMANY_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_GERMANY_REP */)=1
        )
    , BLANK(),
    _param
    )

VAR Cond2 = 
    IF(
    NOT ( _user  IN VALUES('Masking Users'[USER_EMAIL] /* DB: dataset:Masking_Users.USER_EMAIL */) ) &&
    MAX('Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */)="EMEA" &&
    (
    (ISFILTERED('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */) && MAX('Region Hierarchy'[IS_GERMANY_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_GERMANY_FLM */)) ||
    (ISFILTERED('Region Hierarchy'[SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM */) && MAX('Region Hierarchy'[IS_GERMANY_SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_GERMANY_SLM */)) ||
    (ISFILTERED('Region Hierarchy'[TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM */) && MAX('Region Hierarchy'[IS_GERMANY_TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_GERMANY_TLM */)) ||
    (ISFILTERED('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */) && MAX('Region Hierarchy'[IS_GERMANY_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_GERMANY_REP */))
    ), 
    BLANK(),
    _param
    )

RETURN 
    IF(_user in { "taliyan@adobe.com", "joostavp@adobe.com" } , Cond1, Cond2)
```

#### Param Coverage CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"
VAR _black = "#252423"
VAR sel = SELECTEDVALUE(Dim_Param_L3_Coverage[Level2])
 
VAR result =
    SWITCH(sel,
        "S5+ Covx",
            SWITCH(TRUE(),
                [Param S5+ CovX] > 1.2, _green,
                [Param S5+ CovX] >= 0.9, _yellow,
                [Param S5+ CovX] < 0.9, _red
                
            ),
         "Total Pipe CovX",
            SWITCH(TRUE(),
                [Total Pipe CovX] > 2.5, _green,
                [Total Pipe CovX]  >= 2.0, _yellow,
                 _red   
            )
 

    )
 
RETURN result
```

#### Result

```dax
VAR level2 = SELECTEDVALUE ( Dim_Param_L3_Coverage[Level2] )
VAR val =
    SWITCH(
        level2,
        "GNARR Target", [FP Bookings Target],
        "GNARR Target LTG",[TARGET LEFT TO GO $],
        "Pipe Target", [OCC_Pipe Target],
        "Total Pipe", [PIPE $],
        "Total Pipe CovX", [Total Pipe CovX],
        "S3 $", [S3 $],
        "S4 $", [S4 $],
        "S5+ $", [SS5+ $],
        "S5+ Covx", [Param S5+ CovX],
        "S5+ Progression", [S5+ Progression],
    
        "Hist Close Rate", [Hist Close Rate],
        "Hist Close Ratio", [Hist Close Ratio],
        "BOQ ARR $", [BOQ ARR],

	"CovX Gap by Closed Ratio", [CovX Gap by Closed Ratio],
	"Mature Pipe With Red Acc Health", [Mature Pipe With Red Acc Health],
        "# of Deal reviews", [# of Deal reviews],
	"Mature Pipe Deals Stalled", [Mature Pipe Deals Stalled],

	
	"S3 Pipe Deals Stalled", [S3 Pipe Deals Stalled],
	"S4 Pipe Deals Stalled", [S4 Pipe Deals Stalled],

        "$ of Deal reviews", [$ of Deal reviews],
	"% of Pipe Reviewed", [% of Deal reviews],
        BLANK()
    )
VAR isBlankVal = ISBLANK(val)
VAR formattedVal =
    SWITCH(
        TRUE(),
        isBlankVal, BLANK(),

        level2 IN {
             "GNARR Target","GNARR Target LTG","Total Pipe", "S3 $", "S4 $", "S5+ $", "S5+ Progression", "Mature Pipe With Red Acc Health",  "Mature Pipe Deals Stalled", 
	"S3 Pipe Deals Stalled", "S4 Pipe Deals Stalled", "$ of Deal reviews", "BOQ ARR $"
        }, FORMAT(val/1000000, "$#,##0.0M"),

        level2 IN {
            "Total Pipe CovX", "S5+ Covx", "CovX Gap by Closed Ratio" 
            
        }, FORMAT(val, "0.0"),

        level2 IN {
            "# of Deal reviews"  }, FORMAT(val, "#"),

        // For everything else, just return the raw value without formatting
        TRUE, val
    )
RETURN
    IF(
        ISBLANK(level2),
        BLANK(),
        formattedVal
    )
```

#### Result2

```dax
IF (
    SELECTEDVALUE ( Dim_Param_L3_Coverage[Level2] ) = "Pipe Target",
    FORMAT([PIPE TARGET],"#,0.00"),
        IF (
            SELECTEDVALUE ( Dim_Param_L3_Coverage[Level2] ) = "Total Pipe CovX",
            [COVERAGE PIPE / BOOKINGS TARGET X],
                                          IF (
                                                SELECTEDVALUE ( Dim_Param_L3_Coverage[Level2] ) = "Mature Pipe With Red Acc Health",
                                                 FORMAT([Mature Pipe With Red Acc Health],"#,0.00"),
                                                IF (
                                                    SELECTEDVALUE ( Dim_Param_L3_Coverage[Level2] ) = "# of Deal reviews",
                                                    [# of Deal reviews])
                                               )))
```

### Dim_Param_L3_Outlook (2 measures)

#### Measure CF Outlook

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"
VAR sel = SELECTEDVALUE(Dim_Param_L3_Outlook[Level2])
VAR result =
    SWITCH(sel,
        "% Attainment",
            SWITCH(TRUE(),
                [W+F+UC %] >= 0.75, _green,
                [W+F+UC %]  >= 0.25, _yellow,
                _red
            ),
        "YoY",
        SWITCH(TRUE(),
                [YoY GNARR %] >= 0, _green,
                _red
            ),
        "WoW",
        SWITCH(TRUE(),
               DIVIDE([W+F+UC $] - [PW W+F+UC $], [PW W+F+UC $]) >= 0, _green,
                _red
            )
    )
return result
```

#### Result_OL

```dax
VAR level2 = SELECTEDVALUE ( Dim_Param_L3_Outlook[Level2] )
VAR val =
    SWITCH(
        level2,
        "Target", [FP Bookings Target],
        "Won $", [Won $ OL],
        "W+F+UC $", [W+F+UC $ OL],
        "% Attainment", DIVIDE([W+F+UC $ OL], [BOOKINGS TARGET]),
        "WoW", DIVIDE([W+F+UC $] - [PW W+F+UC $], [PW W+F+UC $]),
        "YoY", [YoY GNARR %],
        "Rep Participation QTD", [Rep Participation QTD],
        "Close Ratio", CALCULATE([Close Ratio OL],REMOVEFILTERS('Snapshot Quarter')),
        "Stalled Pipe $", [Stalled & Inactive $],
        "Forecast $", [FORECAST $],
        "Upside Commit", [UPSIDE COMMITTED $],
        "Upside + Upside Target", [Upside + Upside Target],
        "CQ S5+ (Upside + Upside Target)", [CQ S5+ (Upside+ Upside Target)],
        "Future Qtr S5+ Pipe", [FQ S5+ Pipe],
        "Future Qtr S3/4", [FQ S3/4 Pipe],
		"S3 $",[S3 $],
		"S4 $",[S4 $],
		"S5+ $",[SS5+ $],
		"Pipe $",[PIPE $],
		"S3 Deals #",CALCULATE([OCC_Deal Count],'Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */="S3"),
		"S4 Deals #",CALCULATE([OCC_Deal Count],'Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */="S4"),
		"S5+ Deals #",CALCULATE([OCC_Deal Count],'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */="S5+"),
		"Pipe Deals #",CALCULATE([OCC_Deal Count],'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ in {"S3","S4","S5+"}),
		"Rep Participation YTD", CALCULATE([Rep Participation YTD],ALL('Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */)),
        "FLM Participation QTD", [FLM Participation QTD],
        "FLM Participation YTD", CALCULATE([FLM Participation YTD],ALL('Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */)),
        "Team Participation QTD", [FLM WITH >50% AE @75% QTD %],
        "Team Participation YTD", CALCULATE([FLM WITH >50% AE @75% YTD %],ALL('Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */)),
		"Hist Close Rate",[Hist Close Rate],
		"Hist Close Ratio",[Hist Close Ratio],
		"LTG $",[TARGET LEFT TO GO $],
		"YTD Attainment %",DIVIDE([W+F+UC $ YTD Pipe OL],[BOOKINGS TARGET YTD OL $]),
        "BOQ Pipe $", [BOQ PIPE $],
        "BOQ ARR $", [BOQ ARR],
		"S3 Stalled $ %",CALCULATE([Stalled & Inactive %],'Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */="S3"),
		"S4 Stalled $ %",CALCULATE([Stalled & Inactive %],'Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */="S4"),
		"S5+ Stalled $ %",CALCULATE([Stalled & Inactive %],'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */="S5+"),
		"Mature Pipe with Red Acc health",[Mature Pipe With Red Acc Health],
        BLANK()
    )
VAR isBlankVal = ISBLANK(val)
VAR formattedVal =
    SWITCH(
        TRUE(),
        isBlankVal, BLANK(),

        level2 IN {
             "Target", "Won $", "W+F+UC $", "Stalled Pipe $", "Forecast $", "Upside Commit",  "Upside + Upside Target", 
	"CQ S5+ (Upside + Upside Target)", "Future Qtr S5+ Pipe", "Future Qtr S3/4", "S3 $", "S4 $", "S5+ $", "Pipe $", "LTG $", "Mature Pipe with Red Acc health", "BOQ Pipe $", "BOQ ARR $"
        }, FORMAT(val/1000000, "$#,##0.0M"),

        level2 IN {
            "% Attainment", "WoW", "YoY", "Rep Participation QTD","Close Ratio", "Rep Participation YTD", "FLM Participation QTD","FLM Participation YTD","Team Participation QTD","Team Participation YTD", "YTD Attainment %", "S3 Stalled $ %", "S4 Stalled $ %", "S5+ Stalled $ %", "Hist Close Rate",
            "Hist Close Ratio"
            
        }, FORMAT(val, "0%"),

        // For everything else, just return the raw value without formatting
        TRUE, val
    )
RETURN
    IF(
        ISBLANK(level2),
        BLANK(),
        formattedVal
    )
```

### Dim_Parameter_AccountHealth (1 measures)

#### param_measure_AccountsHealth

```dax
VAR level2 = SELECTEDVALUE ( Dim_Parameter_AccountHealth[Level 2] )
VAR val =
    SWITCH(
        level2,
        "ARR AVG", [CQ ARRAVG SubId],
        "RBOB R4Q", [R4Q RBOB w/o PQ Trail],
        "Attrition R4Q", [R4Q Attrition $],
        "# Accounts", [Child Accounts],
        "Month On Month Accnt Health Up", [Accnt Movement Up w/o Indicator],
        "Month On Month Accnt Health Down", [Accnt Movement Down w/o Indicator],
        "Month On Month Sol Health Up", [Sol Movement Up w/o Indicator],
        "Month On Month Sol Health Down", [Sol Movement Down w/o Indicator] , 
        "Out Of Compliance Accnt Health", [Total Non Compliant Accnts],
        "Out Of Compliance Sol Health", [Total Non Compliant Solution],
        "Out Of Compliance GWP",[Out of Compliance GWP],
        "# Acct-Soln with Overage", [blank_dummy],
        "# of Flat Renewals", [Green health renewing flat],
        "R/Y Soln w/o GWP", [R/Y Sol Health with Open GWP Accnt],
        BLANK()
    )
VAR isBlankVal = ISBLANK(val)
VAR formattedVal =
    SWITCH(
        TRUE(),
        isBlankVal, BLANK(),

        level2 IN {
           "ARR AVG", "RBOB R4Q", 
        "Attrition R4Q"
        }, FORMAT(val/1000000, "$#,##0.0M"),   
        
        level2 IN {
            "# Accounts",
            "Month On Month Accnt Health Up", 
        "Month On Month Accnt Health Down", 
        "Month On Month Sol Health Up", 
        "Month On Month Sol Health Down", 
        "Out Of Compliance Accnt Health", 
        "Out Of Compliance Sol Health", 
        "Out Of Compliance GWP", "# Acct-Soln with Overage", 
        "# of Flat Renewals", "R/Y Soln w/o GWP"
        }, FORMAT(val, "#,###"), 
        TRUE, val
    )
RETURN 
    IF(
        ISBLANK(level2),
        BLANK(),
        formattedVal
    )
```

### Dim_Parameter_Accounts (1 measures)

#### param_measure_Accounts

```dax
VAR level2 = SELECTEDVALUE ( Dim_Parameter_Accounts[Level 2] )
VAR val =
    SWITCH(
        level2,
        "ARR", [CQ ARRAVG SubId],
        "RBOB R4Q", [R4Q RBOB w/o PQ Trail],
        "RBOB CQ", [CQ RBOB w/o PQ Trail],
        // "Exit Value", [blank_dummy],
        // "Exit Varience", [blank_dummy],
        "Pipe $ R6Q", [Pipe $ R6Q],
        "# of Prnt Accts (w/ARR)", [ParentID Count],
        "# of Sub Accts (w/ARR)", [Sub_MA Count] , 
        "YTD W+F+UC $", [W+F+UC $ YTD Pipe OL],
        "Prev 4 Qtrs Lost - GNARR", [Prev 4 Qtrs Lost],
        "QoQ ARR", [QoQ ARRAVG],
        "Parent Tier 1 SS1/2 Pipe $", [Parent Tier 1 SS1/2 Pipe $],
        "Parent Tier 1 with No Pipe", [Parent Tier 1 with No Pipe],
        // "Parent Tier 2/3 with No Pipe", [Parent Tier 2/3 with No Pipe],
        "Sub Tier 1 SS1/2 Pipe $", [Sub Tier 1 SS1/2 Pipe $],
        "Sub Tier 1 with No Pipe", [Sub Tier 1 with No Pipe],
        "Sub Tier 2/3 with No Pipe", [Sub Tier 2/3 with No Pipe],
        "High ICP/UCP/AES Acct with No Pipe",[High ICP/UCP/AES Acct W/o Pipe],
        "High Marketing Engaged w/o Pipe",[High Marketing Engaged Accnts w/o pipe],
        BLANK()
    )
VAR isBlankVal = ISBLANK(val)
VAR formattedVal =
    SWITCH(
        TRUE(),
        isBlankVal, BLANK(),

        level2 IN {
           "ARR",  "RBOB R4Q", "RBOB CQ", 
        "Pipe $ R6Q", "YTD W+F+UC $", 
        "Prev 4 Qtrs Lost - GNARR", "Parent Tier 1 SS1/2 Pipe $","Sub Tier 1 SS1/2 Pipe $"
        }, FORMAT(val/1000000, "$#,##0.0M"),   
        
        level2 IN {
            "# of Prnt Accts (w/ARR)",  "# of Sub Accts (w/ARR)",
            "Parent Tier 1 with No Pipe", "Sub Tier 1 with No Pipe", "Sub Tier 2/3 with No Pipe", "High ICP/UCP/AES Acct with No Pipe", "High Marketing Engaged w/o Pipe"
        }, FORMAT(val, "#,###"), 
        level2 IN {
            "QoQ ARR" 
        }, FORMAT(val, "0%"), 
        // For everything else, just return the raw value without formatting
        TRUE, val
    )
RETURN 
    IF(
        ISBLANK(level2),
        BLANK(),
        formattedVal
    )
```

### Dim_Parameter_Creation (3 measures)

#### Masking param_measure_Creation

```dax
VAR _user = USERPRINCIPALNAME()
VAR _param = [param_measure_Creation]
VAR Cond1 = 
IF(
        (
        (ISINSCOPE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */) ||   ISFILTERED('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */)) 
        && MAX('Region Hierarchy'[IS_GERMANY_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_GERMANY_FLM */)=1
        ) 
        ||
        (
        (ISINSCOPE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */) ||  ISFILTERED('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */)) 
        && MAX('Region Hierarchy'[IS_GERMANY_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_GERMANY_REP */)=1
        )
    , BLANK(),
    _param
    )

VAR Cond2 = 
    IF(
     NOT ( _user  IN VALUES('Masking Users'[USER_EMAIL] /* DB: dataset:Masking_Users.USER_EMAIL */) )  &&
    MAX('Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */)="EMEA" &&
    (
    (ISFILTERED('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */) && MAX('Region Hierarchy'[IS_GERMANY_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_GERMANY_FLM */)) ||
    (ISFILTERED('Region Hierarchy'[SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM */) && MAX('Region Hierarchy'[IS_GERMANY_SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_GERMANY_SLM */)) ||
    (ISFILTERED('Region Hierarchy'[TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM */) && MAX('Region Hierarchy'[IS_GERMANY_TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_GERMANY_TLM */)) ||
    (ISFILTERED('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */) && MAX('Region Hierarchy'[IS_GERMANY_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_GERMANY_REP */))
    ), 
    BLANK(),
    _param
    )

RETURN 
    IF(_user in { "taliyan@adobe.com", "joostavp@adobe.com" } , Cond1, Cond2)
```

#### Param Creation CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"
VAR _black = "#252423"
VAR sel = SELECTEDVALUE(Dim_Parameter_Creation[Level 2])
 
VAR result =
    SWITCH(sel,
        "WoW",
            SWITCH(TRUE(),
                [% Weekly Gross Creation QTD parameter] > 0, _green,
                [% Weekly Gross Creation QTD parameter] < 0, _red,
                _black
            ),
         "QTD Attn",
            SWITCH(TRUE(),
                [QTD attin] >= 0.9, _green,
                [QTD attin] >= 0.8, _yellow,
                _red
            )
    )
 
RETURN result
```

#### param_measure_Creation

```dax
VAR level2 = SELECTEDVALUE ( Dim_Parameter_Creation[Level 2] )
VAR val =
    SWITCH(
        level2,
        "Target-Full Qtr", [Param Target Full Qtr],
        "Target QTD", [Param Target QTD],
        "Created QTD $", [GROSS CREATED QTD $],
        "QTD Attn", [QTD attin],
        "Target CW", [Param Target CW],
        "Created CW", [OPPTY WTD $],
        "Gap CW", [Param Gap CW] , 
        "WoW", [% Weekly Gross Creation QTD parameter],
        "Parent Tier 1 SS1/2 Pipe $", [Parent Tier 1 SS1/2 Pipe $],
        "Parent Tier 1 with No Pipe", [Parent Tier 1 with No Pipe],
        "Parent Tier 2/3 with No Pipe", [Parent Tier 2/3 with No Pipe],
        "Sub Tier 1 SS1/2 Pipe $", [Sub Tier 1 SS1/2 Pipe $],
        "Sub Tier 1 with No Pipe", [Sub Tier 1 with No Pipe],
        "Sub Tier 2/3 with No Pipe", [Sub Tier 2/3 with No Pipe],
        "High ICP/UCP/AES Acct W/o Pipe",[High ICP/UCP/AES Acct W/o Pipe],
        "High ICP&UCP w/o Pipe",[High ICP&UCP w/o Pipe],
        "High Marketing Engaged Accnts w/o pipe",[High Marketing Engaged Accnts w/o pipe],
        BLANK()
    )
VAR isBlankVal = ISBLANK(val)
VAR formattedVal =
    SWITCH(
        TRUE(),
        isBlankVal, BLANK(),

        level2 IN {
           "Target-Full Qtr",  "Target QTD",  "Created QTD $",
         "Target CW", 
        "Created CW", "Gap CW","Parent Tier 1 SS1/2 Pipe $","Sub Tier 1 SS1/2 Pipe $"
        }, FORMAT(val/1000000, "$#,##0.0M"),   
        
        level2 IN {
            "Parent Tier 1 with No Pipe","Parent Tier 2/3 with No Pipe","Sub Tier 1 with No Pipe","Sub Tier 2/3 with No Pipe", "High ICP/UCP/AES Acct W/o Pipe", "High ICP&UCP w/o Pipe",
        "High Marketing Engaged Accnts w/o pipe"
        }, FORMAT(val, "#"), 
        level2 IN {
            "QTD Attn", "WoW" 
        }, FORMAT(val, "0%"), 
        // For everything else, just return the raw value without formatting
        TRUE, val
    )
RETURN
    IF(
        ISBLANK(level2),
        BLANK(),
        formattedVal
    )
```

### FLM Performance Table (2 measures)

#### Measure CF FLM_perf

```dax
// VAR _green = "#11A25F"
// VAR _yellow = "#CE9905"
// VAR _red = "#E74B3A"
// VAR FLMCount = [FLM Count]
// VAR sel = SELECTEDVALUE('FLM Performance Table'[KPI ID], 1)
 
// VAR result =
//     SWITCH(sel,
// 		2,
//             SWITCH(TRUE(),
//                 DIVIDE([FLM WITH >50% AE @75% YTD WoW #],FLMCount,BLANK()) >= 0.5, _green,
//                 DIVIDE([FLM WITH >50% AE @75% YTD WoW #],FLMCount,BLANK()) >= 0.4, _yellow,
//                 _red
//             ),
//         3,
//             SWITCH(TRUE(),
//                 DIVIDE([FLM PART @75% YTD #],FLMCount,BLANK()) >= 0.5, _green,
//                 DIVIDE([FLM PART @75% YTD #],FLMCount,BLANK()) >= 0.4, _yellow,
//                 _red
//             ),
// 		4,
//             SWITCH(TRUE(),
//                 DIVIDE([FLM WITH >50% AE @75% QTD # WoW],FLMCount,BLANK()) >= 0.5, _green,
//                 DIVIDE([FLM WITH >50% AE @75% QTD # WoW],FLMCount,BLANK()) >= 0.4, _yellow,
//                 _red
//             ),
//         5,
//             SWITCH(TRUE(),
//                 DIVIDE([FLM PART @75% QTD # WoW],FLMCount,BLANK()) >= 0.5, _green,
//                 DIVIDE([FLM PART @75% QTD # WoW],FLMCount,BLANK()) >= 0.4, _yellow,
//                 _red
//             ),
// 		9,
//             SWITCH(TRUE(),
//                 DIVIDE([FLM CQ Pipe Gen @75% YTD #],FLMCount,BLANK()) >= 0.5, _green,
//                 DIVIDE([FLM CQ Pipe Gen @75% YTD #],FLMCount,BLANK()) >= 0.4, _yellow,
//                 _red
//             ),
//         10,
//             SWITCH(TRUE(),
//                 DIVIDE([FLM CQ Pipe Gen @75% QTD #],FLMCount,BLANK()) >= 0.5, _green,
//                 DIVIDE([FLM CQ Pipe Gen @75% QTD #],FLMCount,BLANK()) >= 0.4, _yellow,
//                 _red
//             ),
// 		11,
//             SWITCH(TRUE(),
//                 DIVIDE([FLM Q+1 Pipe Covx>2.7 #],FLMCount,BLANK()) >= 0.5, _green,
//                 DIVIDE([FLM Q+1 Pipe Covx>2.7 #],FLMCount,BLANK()) >= 0.4, _yellow,
//                 _red
//             ),
// 		12,
//             SWITCH(TRUE(),
//                 DIVIDE([FLM Q+1 Mature Covx>1.2 #],FLMCount,BLANK()) >= 0.5, _green,
//                 DIVIDE([FLM Q+1 Mature Covx>1.2 #],FLMCount,BLANK()) >= 0.4, _yellow,
//                 _red
//             ),
// 		13,
//             SWITCH(TRUE(),
//                 DIVIDE([FLM Rolling 4 Qtr S3 Covx>2x #],FLMCount,BLANK()) >= 0.5, _green,
//                 DIVIDE([FLM Rolling 4 Qtr S3 Covx>2x #],FLMCount,BLANK()) >= 0.4, _yellow,
//                 _red
//             ),
// 		14,
//             SWITCH(TRUE(),
//                 DIVIDE([FLM CY Cov>2x #],FLMCount,BLANK()) >= 0.5, _green,
//                 DIVIDE([FLM CY Cov>2x #],FLMCount,BLANK()) >= 0.4, _yellow,
//                 _red
//             )
//     )
 
// RETURN result

VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"
 
VAR FLMCount = [FLM Count]
VAR sel = SELECTEDVALUE('FLM Performance Table'[KPI ID], 1)
 
VAR numerator =
   SWITCH(sel,
       2, [FLM WITH >50% AE @75% YTD WoW #],
       3, [FLM PART @75% YTD #],
       4, [FLM WITH >50% AE @75% QTD # WoW],
       5, [FLM PART @75% QTD # WoW],
       9, [FLM CQ Pipe Gen @75% YTD #],
       10, [FLM CQ Pipe Gen @75% QTD #],
       11, [FLM Q+1 Pipe Covx>2.7 #],
       12, [FLM Q+1 Mature Covx>1.2 #],
       13, [FLM Rolling 4 Qtr S3 Covx>2x #],
       14, [FLM CY Cov>2x #],
       BLANK()
   )
 
VAR ratio = DIVIDE(numerator, FLMCount, BLANK())
 
VAR result =
   SWITCH(TRUE(),
       ISBLANK(ratio), BLANK(),
       ratio >= 0.5, _green,
       ratio >= 0.4, _yellow,
       _red
   )
 
RETURN result
```

#### OCC_FLM Performance Measure

```dax
VAR FLMCount = [FLM Count]
VAR SelectedKPI = SELECTEDVALUE('FLM Performance Table'[KPI ID])
Var SelectedToggle = SELECTEDVALUE('Performance Toggle'[Toggle Name])
RETURN
SWITCH(SelectedToggle,"%",

SWITCH(
    SelectedKPI,
    // 1. Total HC
    1,FLMCount,
    // 2. YTD Team Part. >50%
    2,DIVIDE([FLM WITH >50% AE @75% YTD WoW #],FLMCount,BLANK()),
    // 3. YTD Attain >75%
    3,DIVIDE([FLM PART @75% YTD #],FLMCount,BLANK()),
    // 4. CQ Team Part. >50%
    4,DIVIDE([FLM WITH >50% AE @75% QTD # WoW],FLMCount,BLANK()),
    // 5. CQ Attain >75%
    5,DIVIDE([FLM PART @75% QTD # WoW],FLMCount,BLANK()),
    // 6. CQ >50% & <75%
    6,DIVIDE([FLM PART 50_75% QTD # WoW],FLMCount,BLANK()),
    // 7. CQ >25% & <50%
    7,DIVIDE([FLM PART 25_50% QTD # WoW],FLMCount,BLANK()),
    // 8. CQ <25%
    8,DIVIDE([FLM PART <25% QTD # WoW],FLMCount,BLANK()),
    // 9. YTD Pipe Gen >75%
    9,DIVIDE([FLM CQ Pipe Gen @75% YTD #],FLMCount,BLANK()),
    // 10. QTD >75%
    10,DIVIDE([FLM CQ Pipe Gen @75% QTD #],FLMCount,BLANK()),
    // 11. Q+1 Pipe Covx > 2.7
    11,DIVIDE([FLM Q+1 Pipe Covx>2.7 #],FLMCount,BLANK()),
    // 12. Q+1 Mature Covx > 1.2
    12,DIVIDE([FLM Q+1 Mature Covx>1.2 #],FLMCount,BLANK()),
    // 13. Rolling 4 Qtr S3 Covx > 2x
    13,DIVIDE([FLM Rolling 4 Qtr S3 Covx>2x #],FLMCount,BLANK()),
    // 14. CY Cov > 2x
    14,DIVIDE([FLM CY Cov>2x #],FLMCount,BLANK()),
    // 15. Parent Tier 1 Completion > 100%
    15,DIVIDE([Parent Tier 1 Completion >100 #],FLMCount,BLANK()),
    // 16. Sub Tier 1 Completion > 100%
    16,DIVIDE([Sub Tier 1 Completion >100 #],FLMCount,BLANK()),

    BLANK()
)

,"#",

SWITCH(
    SelectedKPI,
    // 1. Total HC
    1,FLMCount,
    // 2. YTD Team Part. >50%
    2,[FLM WITH >50% AE @75% YTD WoW #],
    // 3. YTD Attain >75%
    3,[FLM PART @75% YTD #],
    // 4. CQ Team Part. >50%
    4,[FLM WITH >50% AE @75% QTD # WoW],
    // 5. CQ Attain >75%
    5,[FLM PART @75% QTD # WoW],
    // 6. CQ >50% & <75%
    6,[FLM PART 50_75% QTD # WoW],
    // 7. CQ >25% & <50%
    7,[FLM PART 25_50% QTD # WoW],
    // 8. CQ <25%
    8,[FLM PART <25% QTD # WoW],
    // 9. YTD Pipe Gen >75%
    9,[FLM CQ Pipe Gen @75% YTD #],
    // 10. QTD >75%
    10,[FLM CQ Pipe Gen @75% QTD #],
    // 11. Q+1 Pipe Covx > 2.7
    11,[FLM Q+1 Pipe Covx>2.7 #],
    // 12. Q+1 Mature Covx > 1.2
    12,[FLM Q+1 Mature Covx>1.2 #],
    // 13. Rolling 4 Qtr S3 Covx > 2x
    13,[FLM Rolling 4 Qtr S3 Covx>2x #],
    // 14. CY Cov > 2x
    14,[FLM CY Cov>2x #],
    // 15. Parent Tier 1 Completion > 100%
    15,[Parent Tier 1 Completion >100 #],
    // 16. Sub Tier 1 Completion > 100%
    16,[Sub Tier 1 Completion >100 #],

    BLANK()
)
)
```

### FLM Performance Table L3 (4 measures)

#### Measure CF FLM_perf_L3

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"
VAR sel = SELECTEDVALUE('FLM Performance Table L3'[KPI ID], 1)
 
VAR result =
   SWITCH(sel,
            1, 
                SWITCH(TRUE(),
                    [FLM COUNT > 75 YTD WoW %]>=0.5, _green,
                    [FLM COUNT > 75 YTD WoW %]>=0.4, _yellow,
                    _red
                ),
            2, 
                SWITCH(TRUE(),
                    [FLM COUNT > 75 CQ CW % WoW]>=0.5, _green,
                    [FLM COUNT > 75 CQ CW % WoW]>=0.4, _yellow,
                    _red
                ),
            3, 
                SWITCH(TRUE(),
                    [YTD PROJECTION % OCC]>=0.75, _green,
                    [YTD PROJECTION % OCC]>=0.25, _yellow,
                    _red
                ),
            4, 
                SWITCH(TRUE(),
                    [CQ MANAGER FORECAST %]>=0.75, _green,
                    [CQ MANAGER FORECAST %]>=0.25, _yellow,
                    _red
                ),
            13, 
                SWITCH(TRUE(),
                    [GROSS CREATED YTD %]>=1, _green,
                    [GROSS CREATED YTD %]>=0.5, _yellow,
                    _red
                ),
            14, 
                SWITCH(TRUE(),
                    [Gross Creation_L3]>=1, _green,
                    [Gross Creation_L3]>=0.5, _yellow,
                    _red
                ),
            17, 
                SWITCH(TRUE(),
                    [S3 Q+1 CovX (Numeric) w/o snap]>1, _green,
                    [S3 Q+1 CovX (Numeric) w/o snap]>=0.8, _yellow,
                    _red
                ),
            18, 
                SWITCH(TRUE(),
                    [Mature Pipe SS5+ (Q+1) numeric w/o snap]>1.2, _green,
                    [Mature Pipe SS5+ (Q+1) numeric w/o snap]>=0.9, _yellow,
                    _red
                ),
            BLANK()
   )
  
RETURN result
```

#### Measure CF SLM_perf_L3

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"
VAR sel = SELECTEDVALUE('FLM Performance Table L3'[KPI ID], 1)
 
VAR result =
   SWITCH(sel,
            1, 
                SWITCH(TRUE(),
                    CALCULATE(MAX('OCC_Performance Cohort SLM_Band'[SLM Team Part YTD]))>=0.5, _green,
                    CALCULATE(MAX('OCC_Performance Cohort SLM_Band'[SLM Team Part YTD]))>=0.4, _yellow,
                    _red
                ),
            2, 
                SWITCH(TRUE(),
                    CALCULATE(MAX('OCC_Performance Cohort SLM_Band'[SLM Team Part QTD]))>=0.5, _green,
                    CALCULATE(MAX('OCC_Performance Cohort SLM_Band'[SLM Team Part QTD]))>=0.4, _yellow,
                    _red
                ),
            3, 
                SWITCH(TRUE(),
                    CALCULATE(MAX('OCC_Performance Cohort SLM_Band'[Attain]))>=0.75, _green,
                    CALCULATE(MAX('OCC_Performance Cohort SLM_Band'[Attain]))>=0.25, _yellow,
                    _red
                ),
            4, 
                SWITCH(TRUE(),
                    CALCULATE(MAX('OCC_Performance Cohort SLM_Band'[QTD Attain]))>=0.75, _green,
                    CALCULATE(MAX('OCC_Performance Cohort SLM_Band'[QTD Attain]))>=0.25, _yellow,
                    _red
                ),
            13, 
                SWITCH(TRUE(),
                    CALCULATE(MAX('OCC_Performance Cohort SLM_Band'[Gross Creation YTD]))>=1, _green,
                    CALCULATE(MAX('OCC_Performance Cohort SLM_Band'[Gross Creation YTD]))>=0.5, _yellow,
                    _red
                ),
            14, 
                SWITCH(TRUE(),
                    CALCULATE(MAX('OCC_Performance Cohort SLM_Band'[Gross Creation QTD]))>=1, _green,
                    CALCULATE(MAX('OCC_Performance Cohort SLM_Band'[Gross Creation QTD]))>=0.5, _yellow,
                    _red
                ),
            17, 
                SWITCH(TRUE(),
                    CALCULATE(MAX('OCC_Performance Cohort SLM_Band'[CQ+1 Total Pipe Covx]))>1, _green,
                    CALCULATE(MAX('OCC_Performance Cohort SLM_Band'[CQ+1 Total Pipe Covx]))>=0.8, _yellow,
                    _red
                ),
            18, 
                SWITCH(TRUE(),
                    CALCULATE(MAX('OCC_Performance Cohort SLM_Band'[CQ+1 Mature Covx]))>1.2, _green,
                    CALCULATE(MAX('OCC_Performance Cohort SLM_Band'[CQ+1 Mature Covx]))>=0.9, _yellow,
                    _red
                ),
            BLANK()
   )
  
RETURN result
```

#### OCC_FLM Performance Measure L3

```dax
VAR SelectedKPI = SELECTEDVALUE('FLM Performance Table L3'[KPI ID])
RETURN
SWITCH(
    SelectedKPI,
    // 1. Team YTD Attain %
    1,[FLM COUNT > 75 YTD WoW %],
    // 2. Team QTD Attain %
    2,[FLM COUNT > 75 CQ CW % WoW],
    // 3. FLM YTD Attain %
    3,[YTD PROJECTION % OCC],
    // 4. FLM QTD Attain %
    4,[CQ MANAGER FORECAST %],
    // 5. CQ Quota
    5,[CQ Quota]/1000000,
    // 6. CQ-1 Quota
    6,[CQ-1 Quota]/1000000,
    // 7. CQ-2 Quota
    7,[CQ-2 Quota]/1000000,
    // 8. CQ-3 Quota
    8,[CQ-3 Quota]/1000000,
    // 9. CQ WFUC
    9,[CQ W+F+UC $]/1000000,
    // 10. CQ-1 W
    10,[CQ-1 Won $]/1000000,
    // 11. CQ-2 W
    11,[CQ-2 Won $]/1000000,
	// 12. CQ-3 W
    12,[CQ-3 Won $]/1000000,
    // 13. YTD Pipe Gen Attain %
    13,[Gross Creation YTD_L3],
    // 14. CQ Pipe Gen QTD Attain %
    14,[Gross Creation_L3],
    // 15. CQ Creation Target
    15,[CQ Creation Target]/1000000,
    // 16. CQ Created
    16,[CQ Created]/1000000,
    // 17. CQ+1 Total Pipe Covx
    17,[S3 Q+1 CovX (Numeric) w/o snap],
    // 18. CQ+1 Mature Covx
    18,[Mature Pipe SS5+ (Q+1) numeric w/o snap],
    // 19. Rolling 4 Qtr S3 Covx
    19,[S3+ Cov R4Q w/o snap],
    // 20. CY Covx
    20,[S3+ Cov CY w/o x],
    // 21. Parent Tier 1 Completion %
    21,[PRNT COMPLETE %],
    // 22. Sub Tier 1 Completion %
    22,[TIER 1 COMPLETED %],
    // 23. Cohort
    23,[FLM Cohort],
    // 24. Action Path
    24,[Action Path],
    // 25. % Tier 1 Account with No Pipe (#)
    25,[% Parent Tier 1 Account with no Pipe],
    // 26. % deals next steps update >14 ($)
    26,[% deals next steps update >14 ($)],
    // 27. % deals not reviewed ($)
    27,[% deals not reviewed ($)],
    // 28. % deals missing BANT ($)
    28,[% deals missing BANT ($)],
    // 29. CQ+1 Stalled % ($)
    29,[CQ + 1 STALLED %],
    // 30. Total Deals #
    30,[OCC_Deal Count Cov],
    // 31. % deals next steps update >14 (#)
    31,[% deals next steps update >14 (#)],
    // 32. % deals not reviewed (#)
    32,[% deals not reviewed (#)],
    // 33.% deals missing BANT (#)
    33,[% deals missing BANT (#)],
    // 34.CQ+1 Stalled % (#)
    34,[CQ+1 Stalled % (#)],
    35,[FLM COUNT],
    36,CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Band'[SLM_LDAP])),
    BLANK()
)
```

#### OCC_SLM Performance Measure L3

```dax
VAR SelectedKPI = SELECTEDVALUE('FLM Performance Table L3'[KPI ID])
RETURN
SWITCH(
    SelectedKPI,
    // 1. Team YTD Attain %
    1,[FLM WITH >50% AE @75% YTD %],
    // 2. Team QTD Attain %
    2,[FLM WITH >50% AE @75% QTD %],
    // 3. FLM YTD Attain %
    3,CALCULATE(MAX('OCC_Performance Cohort SLM_Band'[Attain])),
    // 4. FLM QTD Attain %
    4,CALCULATE(MAX('OCC_Performance Cohort SLM_Band'[QTD Attain])),
    // 5. CQ Quota
    5,[CQ Quota]/1000000,
    // 6. CQ-1 Quota
    6,[CQ-1 Quota]/1000000,
    // 7. CQ-2 Quota
    7,[CQ-2 Quota]/1000000,
    // 8. CQ-3 Quota
    8,[CQ-3 Quota]/1000000,
    // 9. CQ WFUC
    9,[CQ W+F+UC $]/1000000,
    // 10. CQ-1 W
    10,[CQ-1 Won $]/1000000,
    // 11. CQ-2 W
    11,[CQ-2 Won $]/1000000,
	// 12. CQ-3 W
    12,[CQ-3 Won $]/1000000,
    // 13. YTD Pipe Gen Attain %
    13,CALCULATE(MAX('OCC_Performance Cohort SLM_Band'[Gross Creation YTD])),
    // 14. CQ Pipe Gen QTD Attain %
    14,CALCULATE(MAX('OCC_Performance Cohort SLM_Band'[Gross Creation QTD])),
    // 15. CQ Creation Target
    15,[CQ Creation Target]/1000000,
    // 16. CQ Created
    16,[CQ Created]/1000000,
    // 17. CQ+1 Total Pipe Covx
    17,CALCULATE(MAX('OCC_Performance Cohort SLM_Band'[CQ+1 Total Pipe Covx])),
    // 18. CQ+1 Mature Covx
    18,CALCULATE(MAX('OCC_Performance Cohort SLM_Band'[CQ+1 Mature Covx])),
    // 19. Rolling 4 Qtr S3 Covx
    19,CALCULATE(MAX('OCC_Performance Cohort SLM_Band'[Rolling 4 Qtr S3 Covx])),
    // 20. CY Covx
    20,CALCULATE(MAX('OCC_Performance Cohort SLM_Band'[CY Covx])),
    // 21. Parent Tier 1 Completion %
    21,[PRNT COMPLETE %],
    // 22. Sub Tier 1 Completion %
    22,[TIER 1 COMPLETED %],
    // 23. Cohort
    23,[FLM Cohort],
    // 24. Action Path
    24,[Action Path],
    // 25. % Tier 1 Account with No Pipe (#)
    25,[% Parent Tier 1 Account with no Pipe],
    // 26. % deals next steps update >14 ($)
    26,[% deals next steps update >14 ($)],
    // 27. % deals not reviewed ($)
    27,[% deals not reviewed ($)],
    // 28. % deals missing BANT ($)
    28,[% deals missing BANT ($)],
    // 29. CQ+1 Stalled % ($)
    29,[CQ + 1 STALLED %],
    // 30. Total Deals #
    30,[OCC_Deal Count Cov],
    // 31. % deals next steps update >14 (#)
    31,[% deals next steps update >14 (#)],
    // 32. % deals not reviewed (#)
    32,[% deals not reviewed (#)],
    // 33.% deals missing BANT (#)
    33,[% deals missing BANT (#)],
    // 34.CQ+1 Stalled % (#)
    34,[CQ+1 Stalled % (#)],
    35,[FLM COUNT],
    36,[SLM Count],//CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Band'[SLM_LDAP])),
    BLANK()
)
```

### Filter_Count_Measure (20 measures)

#### Filter_Applied_Count_ARRAVG_L3 Account

```dax
var Parent_Tier=IF(ISFILTERED('TPT Metadata'[CLEANED_PARENT_TIER] /* DB: dataset:TPT_Metadata.CLEANED_PARENT_TIER */),1,0)
var CLEANED_SUB_TIER=IF(ISFILTERED('TPT Metadata'[CLEANED_SUB_TIER] /* DB: dataset:TPT_Metadata.CLEANED_SUB_TIER */),1,0)
var Parent_No_Pipe=IF(ISFILTERED('TPT Metadata'[Parent No Pipe] /* DB: dataset:TPT_Metadata.Parent No Pipe */),1,0)
var Sub_No_Pipe=IF(ISFILTERED('TPT Metadata'[Sub No Pipe] /* DB: dataset:TPT_Metadata.Sub No Pipe */),1,0)
var High_Risk=IF(ISFILTERED('Account Sub'[High Credit Risk Account] /* DB: dataset:Account_Sub.High Credit Risk Account */),1,0)
var CUSTOMER_HEALTH=IF(ISFILTERED('Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */),1,0)


RETURN
Parent_Tier+CLEANED_SUB_TIER+Parent_No_Pipe+Sub_No_Pipe + High_Risk+CUSTOMER_HEALTH&""
```

#### Filter_Applied_Count_ARRAVG_L3 Prediction

```dax
var Parent_Tier=IF(ISFILTERED('TPT Metadata'[CLEANED_PARENT_TIER] /* DB: dataset:TPT_Metadata.CLEANED_PARENT_TIER */),1,0)
var CLEANED_SUB_TIER=IF(ISFILTERED('TPT Metadata'[CLEANED_SUB_TIER] /* DB: dataset:TPT_Metadata.CLEANED_SUB_TIER */),1,0)
var High_ICP_or_UCP_or_AES_Accounts=IF(ISFILTERED('Customer Profile Attributes'[High ICP or UCP or AES Accounts] /* DB: dataset:Customer_Profile_Attributes.High ICP or UCP or AES Accounts */),1,0)
var High_UCP_and_ICP=IF(ISFILTERED('Customer Profile Attributes'[High UCP and ICP] /* DB: dataset:Customer_Profile_Attributes.High UCP and ICP */),1,0)
var High_UCP_Or_ICP=IF(ISFILTERED('Customer Profile Attributes'[High UCP or ICP] /* DB: dataset:Customer_Profile_Attributes.High UCP or ICP */),1,0)
var PREDICTION_TYPE=IF (ISFILTERED('TPT Metadata'[PREDICTION_TYPE] /* DB: dataset:TPT_Metadata.PREDICTION_TYPE */), 1, 0)
var Parent_No_Pipe=IF(ISFILTERED('TPT Metadata'[Parent No Pipe] /* DB: dataset:TPT_Metadata.Parent No Pipe */),1,0)
var Sub_No_Pipe=IF(ISFILTERED('TPT Metadata'[Sub No Pipe] /* DB: dataset:TPT_Metadata.Sub No Pipe */),1,0)
var High_AES=IF(ISFILTERED('Customer Profile Attributes'[High AES] /* DB: dataset:Customer_Profile_Attributes.High AES */),1,0)
var High_Risk=IF(ISFILTERED('Account Sub'[High Credit Risk Account] /* DB: dataset:Account_Sub.High Credit Risk Account */),1,0)



RETURN
Parent_Tier+CLEANED_SUB_TIER+High_ICP_or_UCP_or_AES_Accounts+High_UCP_and_ICP+High_UCP_Or_ICP+PREDICTION_TYPE+Parent_No_Pipe+Sub_No_Pipe+High_AES + High_Risk&""
```

#### Filter_Applied_Count_ARRAVG_L3_AE

```dax
var Parent_Tier=IF(ISFILTERED('TPT Metadata'[CLEANED_PARENT_TIER] /* DB: dataset:TPT_Metadata.CLEANED_PARENT_TIER */),1,0)
var CLEANED_SUB_TIER=IF(ISFILTERED('TPT Metadata'[CLEANED_SUB_TIER] /* DB: dataset:TPT_Metadata.CLEANED_SUB_TIER */),1,0)
var High_ICP_or_UCP_or_AES_Accounts=IF(ISFILTERED('Customer Profile Attributes'[High ICP or UCP or AES Accounts] /* DB: dataset:Customer_Profile_Attributes.High ICP or UCP or AES Accounts */),1,0)
var High_UCP_and_ICP=IF(ISFILTERED('Customer Profile Attributes'[High UCP and ICP] /* DB: dataset:Customer_Profile_Attributes.High UCP and ICP */),1,0)
var High_UCP_Or_ICP=IF(ISFILTERED('Customer Profile Attributes'[High UCP or ICP] /* DB: dataset:Customer_Profile_Attributes.High UCP or ICP */),1,0)
var PREDICTION_TYPE=IF(ISFILTERED('TPT Metadata'[PREDICTION_TYPE] /* DB: dataset:TPT_Metadata.PREDICTION_TYPE */),1,0)
var Parent_No_Pipe=IF(ISFILTERED('TPT Metadata'[Parent No Pipe] /* DB: dataset:TPT_Metadata.Parent No Pipe */),1,0)
var Sub_No_Pipe=IF(ISFILTERED('TPT Metadata'[Sub No Pipe] /* DB: dataset:TPT_Metadata.Sub No Pipe */),1,0)
var High_AES=IF(ISFILTERED('Customer Profile Attributes'[High AES] /* DB: dataset:Customer_Profile_Attributes.High AES */),1,0)
var High_Risk=IF(ISFILTERED('Account Sub'[High Credit Risk Account] /* DB: dataset:Account_Sub.High Credit Risk Account */),1,0)



RETURN
Parent_Tier+CLEANED_SUB_TIER+High_ICP_or_UCP_or_AES_Accounts+High_UCP_and_ICP+High_UCP_Or_ICP+PREDICTION_TYPE+Parent_No_Pipe+Sub_No_Pipe+High_AES+High_Risk&""
```

#### Filter_Applied_Count_ARRAVG_L3_Manager

```dax
var Parent_Tier=IF(ISFILTERED('TPT Metadata'[CLEANED_PARENT_TIER] /* DB: dataset:TPT_Metadata.CLEANED_PARENT_TIER */),1,0)
var CLEANED_SUB_TIER=IF(ISFILTERED('TPT Metadata'[CLEANED_SUB_TIER] /* DB: dataset:TPT_Metadata.CLEANED_SUB_TIER */),1,0)
var High_ICP_or_UCP_or_AES_Accounts=IF(ISFILTERED('Customer Profile Attributes'[High ICP or UCP or AES Accounts] /* DB: dataset:Customer_Profile_Attributes.High ICP or UCP or AES Accounts */),1,0)
var High_UCP_and_ICP=IF(ISFILTERED('Customer Profile Attributes'[High UCP and ICP] /* DB: dataset:Customer_Profile_Attributes.High UCP and ICP */),1,0)
var High_UCP_Or_ICP=IF(ISFILTERED('Customer Profile Attributes'[High UCP or ICP] /* DB: dataset:Customer_Profile_Attributes.High UCP or ICP */),1,0)
var PREDICTION_TYPE=IF(ISFILTERED('TPT Metadata'[PREDICTION_TYPE] /* DB: dataset:TPT_Metadata.PREDICTION_TYPE */),1,0)
var Parent_No_Pipe=IF(ISFILTERED('TPT Metadata'[Parent No Pipe] /* DB: dataset:TPT_Metadata.Parent No Pipe */),1,0)
var Sub_No_Pipe=IF(ISFILTERED('TPT Metadata'[Sub No Pipe] /* DB: dataset:TPT_Metadata.Sub No Pipe */),1,0)
var High_AES=IF(ISFILTERED('Customer Profile Attributes'[High AES] /* DB: dataset:Customer_Profile_Attributes.High AES */),1,0)
var High_Risk=IF(ISFILTERED('Account Sub'[High Credit Risk Account] /* DB: dataset:Account_Sub.High Credit Risk Account */),1,0)



RETURN
Parent_Tier+CLEANED_SUB_TIER+High_ICP_or_UCP_or_AES_Accounts+High_UCP_and_ICP+High_UCP_Or_ICP+PREDICTION_TYPE+Parent_No_Pipe+Sub_No_Pipe+High_AES+High_Risk&""
```

#### Filter_Applied_Count_AccCreation

```dax
var Parent_Tier=IF(ISFILTERED('TPT Metadata'[CLEANED_PARENT_TIER] /* DB: dataset:TPT_Metadata.CLEANED_PARENT_TIER */),1,0)
var CLEANED_SUB_TIER=IF(ISFILTERED('TPT Metadata'[CLEANED_SUB_TIER] /* DB: dataset:TPT_Metadata.CLEANED_SUB_TIER */),1,0)
var High_ICP_or_UCP_or_AES_Accounts=IF(ISFILTERED('Customer Profile Attributes'[High ICP or UCP or AES Accounts] /* DB: dataset:Customer_Profile_Attributes.High ICP or UCP or AES Accounts */),1,0)
var High_UCP_and_ICP=IF(ISFILTERED('Customer Profile Attributes'[High UCP and ICP] /* DB: dataset:Customer_Profile_Attributes.High UCP and ICP */),1,0)
var High_UCP_Or_ICP=IF(ISFILTERED('Customer Profile Attributes'[High UCP or ICP] /* DB: dataset:Customer_Profile_Attributes.High UCP or ICP */),1,0)
var PREDICTION_TYPE=IF(ISFILTERED('TPT Metadata'[PREDICTION_TYPE] /* DB: dataset:TPT_Metadata.PREDICTION_TYPE */),1,0)
var Parent_No_Pipe=IF(ISFILTERED('TPT Metadata'[Parent No Pipe] /* DB: dataset:TPT_Metadata.Parent No Pipe */),1,0)
var Sub_No_Pipe=IF(ISFILTERED('TPT Metadata'[Sub No Pipe] /* DB: dataset:TPT_Metadata.Sub No Pipe */),1,0)
var High_AES=IF(ISFILTERED('Customer Profile Attributes'[High AES] /* DB: dataset:Customer_Profile_Attributes.High AES */),1,0)
var High_Risk=IF(ISFILTERED('Account Sub'[High Credit Risk Account] /* DB: dataset:Account_Sub.High Credit Risk Account */),1,0)
 
RETURN
Parent_Tier+CLEANED_SUB_TIER+High_ICP_or_UCP_or_AES_Accounts+High_UCP_and_ICP+High_UCP_Or_ICP+PREDICTION_TYPE+Parent_No_Pipe+Sub_No_Pipe+High_AES+High_Risk&""
```

#### Filter_Applied_Count_Account_Health_AE

```dax
var CUSTOMER_SOLUTION_HEALTH=IF(ISFILTERED('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */),1,0)
var CUSTOMER_Account_HEALTH=IF(ISFILTERED('Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */),1,0)

var RENEWAL_TYPE=IF(ISFILTERED('Retention MetaData'[RENEWAL_TYPE] /* DB: vw_TD_EBI_Retention_MetaData.RENEWAL_TYPE */),1,0)

// var Parent_Tier=IF(ISFILTERED('TPT Metadata'[CLEANED_PARENT_TIER] /* DB: dataset:TPT_Metadata.CLEANED_PARENT_TIER */),1,0)
// var CLEANED_SUB_TIER=IF(ISFILTERED('TPT Metadata'[CLEANED_SUB_TIER] /* DB: dataset:TPT_Metadata.CLEANED_SUB_TIER */),1,0)
// var High_ICP_or_UCP_or_AES_Accounts=IF(ISFILTERED('Customer Profile Attributes'[High ICP or UCP or AES Accounts] /* DB: dataset:Customer_Profile_Attributes.High ICP or UCP or AES Accounts */),1,0)
// var High_UCP_and_ICP=IF(ISFILTERED('Customer Profile Attributes'[High UCP and ICP] /* DB: dataset:Customer_Profile_Attributes.High UCP and ICP */),1,0)
// var High_UCP_Or_ICP=IF(ISFILTERED('Customer Profile Attributes'[High UCP or ICP] /* DB: dataset:Customer_Profile_Attributes.High UCP or ICP */),1,0)
// var PREDICTION_TYPE=IF(ISFILTERED('TPT Metadata'[PREDICTION_TYPE] /* DB: dataset:TPT_Metadata.PREDICTION_TYPE */),1,0)
// var Parent_No_Pipe=IF(ISFILTERED('TPT Metadata'[Parent No Pipe] /* DB: dataset:TPT_Metadata.Parent No Pipe */),1,0)
// var Sub_No_Pipe=IF(ISFILTERED('TPT Metadata'[Sub No Pipe] /* DB: dataset:TPT_Metadata.Sub No Pipe */),1,0)
// var High_AES=IF(ISFILTERED('Customer Profile Attributes'[High AES] /* DB: dataset:Customer_Profile_Attributes.High AES */),1,0)



// // var Renewal_Status=IF(ISFILTERED('Retention MetaData'[OCC_Past Due] /* DB: vw_TD_EBI_Retention_MetaData.OCC_Past Due */),1,0)
// // var OCC_Close_in_30_Days=IF(ISFILTERED('Retention MetaData'[OCC_Close in <30 Days] /* DB: vw_TD_EBI_Retention_MetaData.OCC_Close in <30 Days */),1,0)
// // var OCC=IF(ISFILTERED('Retention MetaData'[OCC_OOC] /* DB: vw_TD_EBI_Retention_MetaData.OCC_OOC */),1,0)
// // var LTG=IF(ISFILTERED('Retention MetaData'[OCC_LTG] /* DB: vw_TD_EBI_Retention_MetaData.OCC_LTG */),1,0)
// // var Trailing=IF(ISFILTERED('Retention MetaData'[OCC_Trailing] /* DB: vw_TD_EBI_Retention_MetaData.OCC_Trailing */),1,0)
// // var IC=IF(ISFILTERED('Retention MetaData'[OCC_IC] /* DB: vw_TD_EBI_Retention_MetaData.OCC_IC */),1,0)
// // var Closed=IF(ISFILTERED('Retention MetaData'[OCC_Closed] /* DB: vw_TD_EBI_Retention_MetaData.OCC_Closed */),1,0)


// // // var SALES_STAGE_GROUP = 
// // // IF (
// // //     SELECTEDVALUE ( 'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ ) IN { "S3", "S4", "S5+" },
// // //     1,
// // //     0
// // // )


// // // var ADJ_COMMITMENT=IF(ISFILTERED(Pipeline[ADJ_COMMITMENT]),1,0)

// // //  var CREATOR_GROUP=IF(ISFILTERED('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */),1,0)
// // //  var SUB_CREATOR=IF(ISFILTERED('Creator Type'[SUB_CREATOR] /* DB: vw_EBI_CREATOR_TYPE.SUB_CREATOR */),1,0)

// // // var Deal_Not_Reviewed=IF(ISFILTERED(Opportunity[OCC_Deal Not Reviewed]),1,0)
// // // var Deal_Reviewed_7Days=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed < 7 Days]),1,0)
// // // var Deal_Reviewed_30Days=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed < 30 Days]),1,
// // // // var SALES_STAGE_GROUP=IF(ISFILTERED('Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */),1,0)
// // // var GEO_ADJ_COMMIT=IF(ISFILTERED(Pipeline[GEO_ADJ_COMMIT]),1,0)
// // // var Opp_Age_365d=IF(ISFILTERED(Pipeline[OCC_Opp Age >365d]),1,0)
// // // var Stage_Duration_120D=IF(ISFILTERED(Pipeline[OCC_Stage Duration > 120D]),1,0)
// // // var Not_Progressed_in60D=IF(ISFILTERED(Pipeline[OCC_Not Progressed in 60D]),1,0)
// // // var No_Business_Driver=IF(ISFILTERED(Opportunity[OCC_No Business Driver]),1,0)
// // // var Missing_BANT=IF(ISFILTERED(Opportunity[Missing BANT]),1,0)
// // // var Deal_in_month_3=IF(ISFILTERED(Pipeline[OCC_Deal in month 3]),1,0)
// // // var No_Mutual_Plan_in_S5=IF(ISFILTERED(Pipeline[OCC_No Mutual Plan in S5+]),1,0)
// // // var No_Mgr_Review_250k_deals=IF(ISFILTERED(Pipeline[OCC_No Mgr Review (+250k deals)]),1,0)
// // // var No_Partner_Attach_100k=IF(ISFILTERED(Pipeline[OCC_No Partner Attach (+100k)]),1,0)
// // // var Deals_with_5_Hygiene_Flag=IF(ISFILTERED(Pipeline[OCC_Deals with 5+ Hygiene Flag]),1,0)
// // // var Not_Progressed_in30D=IF(ISFILTERED(Pipeline[OCC_Not Progressed in 30D]),1,0)
// // // var No_IPOV_in_S5=IF(ISFILTERED(Pipeline[OCC_No IPOV in S5+]),1,0)
// // // var No_Power_aligned_in_S5=IF(ISFILTERED(Pipeline[OCC_No Power aligned in S5+]),1,0)



RETURN
CUSTOMER_SOLUTION_HEALTH+CUSTOMER_Account_HEALTH+RENEWAL_TYPE&""
```

#### Filter_Applied_Count_Account_Health_L3

```dax
var CUSTOMER_SOLUTION_HEALTH=IF(ISFILTERED('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */),1,0)
var CUSTOMER_Account_HEALTH=IF(ISFILTERED('Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */),1,0)

var RENEWAL_TYPE=IF(ISFILTERED('Retention MetaData'[RENEWAL_TYPE] /* DB: vw_TD_EBI_Retention_MetaData.RENEWAL_TYPE */),1,0)

// var Parent_Tier=IF(ISFILTERED('TPT Metadata'[CLEANED_PARENT_TIER] /* DB: dataset:TPT_Metadata.CLEANED_PARENT_TIER */),1,0)
// var CLEANED_SUB_TIER=IF(ISFILTERED('TPT Metadata'[CLEANED_SUB_TIER] /* DB: dataset:TPT_Metadata.CLEANED_SUB_TIER */),1,0)
// var High_ICP_or_UCP_or_AES_Accounts=IF(ISFILTERED('Customer Profile Attributes'[High ICP or UCP or AES Accounts] /* DB: dataset:Customer_Profile_Attributes.High ICP or UCP or AES Accounts */),1,0)
// var High_UCP_and_ICP=IF(ISFILTERED('Customer Profile Attributes'[High UCP and ICP] /* DB: dataset:Customer_Profile_Attributes.High UCP and ICP */),1,0)
// var High_UCP_Or_ICP=IF(ISFILTERED('Customer Profile Attributes'[High UCP or ICP] /* DB: dataset:Customer_Profile_Attributes.High UCP or ICP */),1,0)
// var PREDICTION_TYPE=IF(ISFILTERED('TPT Metadata'[PREDICTION_TYPE] /* DB: dataset:TPT_Metadata.PREDICTION_TYPE */),1,0)
// var Parent_No_Pipe=IF(ISFILTERED('TPT Metadata'[Parent No Pipe] /* DB: dataset:TPT_Metadata.Parent No Pipe */),1,0)
// var Sub_No_Pipe=IF(ISFILTERED('TPT Metadata'[Sub No Pipe] /* DB: dataset:TPT_Metadata.Sub No Pipe */),1,0)
// var High_AES=IF(ISFILTERED('Customer Profile Attributes'[High AES] /* DB: dataset:Customer_Profile_Attributes.High AES */),1,0)



// // var Renewal_Status=IF(ISFILTERED('Retention MetaData'[OCC_Past Due] /* DB: vw_TD_EBI_Retention_MetaData.OCC_Past Due */),1,0)
// // var OCC_Close_in_30_Days=IF(ISFILTERED('Retention MetaData'[OCC_Close in <30 Days] /* DB: vw_TD_EBI_Retention_MetaData.OCC_Close in <30 Days */),1,0)
// // var OCC=IF(ISFILTERED('Retention MetaData'[OCC_OOC] /* DB: vw_TD_EBI_Retention_MetaData.OCC_OOC */),1,0)
// // var LTG=IF(ISFILTERED('Retention MetaData'[OCC_LTG] /* DB: vw_TD_EBI_Retention_MetaData.OCC_LTG */),1,0)
// // var Trailing=IF(ISFILTERED('Retention MetaData'[OCC_Trailing] /* DB: vw_TD_EBI_Retention_MetaData.OCC_Trailing */),1,0)
// // var IC=IF(ISFILTERED('Retention MetaData'[OCC_IC] /* DB: vw_TD_EBI_Retention_MetaData.OCC_IC */),1,0)
// // var Closed=IF(ISFILTERED('Retention MetaData'[OCC_Closed] /* DB: vw_TD_EBI_Retention_MetaData.OCC_Closed */),1,0)


// // // var SALES_STAGE_GROUP = 
// // // IF (
// // //     SELECTEDVALUE ( 'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ ) IN { "S3", "S4", "S5+" },
// // //     1,
// // //     0
// // // )


// // // var ADJ_COMMITMENT=IF(ISFILTERED(Pipeline[ADJ_COMMITMENT]),1,0)

// // //  var CREATOR_GROUP=IF(ISFILTERED('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */),1,0)
// // //  var SUB_CREATOR=IF(ISFILTERED('Creator Type'[SUB_CREATOR] /* DB: vw_EBI_CREATOR_TYPE.SUB_CREATOR */),1,0)

// // // var Deal_Not_Reviewed=IF(ISFILTERED(Opportunity[OCC_Deal Not Reviewed]),1,0)
// // // var Deal_Reviewed_7Days=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed < 7 Days]),1,0)
// // // var Deal_Reviewed_30Days=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed < 30 Days]),1,
// // // // var SALES_STAGE_GROUP=IF(ISFILTERED('Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */),1,0)
// // // var GEO_ADJ_COMMIT=IF(ISFILTERED(Pipeline[GEO_ADJ_COMMIT]),1,0)
// // // var Opp_Age_365d=IF(ISFILTERED(Pipeline[OCC_Opp Age >365d]),1,0)
// // // var Stage_Duration_120D=IF(ISFILTERED(Pipeline[OCC_Stage Duration > 120D]),1,0)
// // // var Not_Progressed_in60D=IF(ISFILTERED(Pipeline[OCC_Not Progressed in 60D]),1,0)
// // // var No_Business_Driver=IF(ISFILTERED(Opportunity[OCC_No Business Driver]),1,0)
// // // var Missing_BANT=IF(ISFILTERED(Opportunity[Missing BANT]),1,0)
// // // var Deal_in_month_3=IF(ISFILTERED(Pipeline[OCC_Deal in month 3]),1,0)
// // // var No_Mutual_Plan_in_S5=IF(ISFILTERED(Pipeline[OCC_No Mutual Plan in S5+]),1,0)
// // // var No_Mgr_Review_250k_deals=IF(ISFILTERED(Pipeline[OCC_No Mgr Review (+250k deals)]),1,0)
// // // var No_Partner_Attach_100k=IF(ISFILTERED(Pipeline[OCC_No Partner Attach (+100k)]),1,0)
// // // var Deals_with_5_Hygiene_Flag=IF(ISFILTERED(Pipeline[OCC_Deals with 5+ Hygiene Flag]),1,0)
// // // var Not_Progressed_in30D=IF(ISFILTERED(Pipeline[OCC_Not Progressed in 30D]),1,0)
// // // var No_IPOV_in_S5=IF(ISFILTERED(Pipeline[OCC_No IPOV in S5+]),1,0)
// // // var No_Power_aligned_in_S5=IF(ISFILTERED(Pipeline[OCC_No Power aligned in S5+]),1,0)



RETURN
CUSTOMER_SOLUTION_HEALTH+CUSTOMER_Account_HEALTH+RENEWAL_TYPE&""
```

#### Filter_Applied_Count_Account_Health_Mgr

```dax
var CUSTOMER_SOLUTION_HEALTH=IF(ISFILTERED('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */),1,0)
var CUSTOMER_Account_HEALTH=IF(ISFILTERED('Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */),1,0)

var RENEWAL_TYPE=IF(ISFILTERED('Retention MetaData'[RENEWAL_TYPE] /* DB: vw_TD_EBI_Retention_MetaData.RENEWAL_TYPE */),1,0)

// var Parent_Tier=IF(ISFILTERED('TPT Metadata'[CLEANED_PARENT_TIER] /* DB: dataset:TPT_Metadata.CLEANED_PARENT_TIER */),1,0)
// var CLEANED_SUB_TIER=IF(ISFILTERED('TPT Metadata'[CLEANED_SUB_TIER] /* DB: dataset:TPT_Metadata.CLEANED_SUB_TIER */),1,0)
// var High_ICP_or_UCP_or_AES_Accounts=IF(ISFILTERED('Customer Profile Attributes'[High ICP or UCP or AES Accounts] /* DB: dataset:Customer_Profile_Attributes.High ICP or UCP or AES Accounts */),1,0)
// var High_UCP_and_ICP=IF(ISFILTERED('Customer Profile Attributes'[High UCP and ICP] /* DB: dataset:Customer_Profile_Attributes.High UCP and ICP */),1,0)
// var High_UCP_Or_ICP=IF(ISFILTERED('Customer Profile Attributes'[High UCP or ICP] /* DB: dataset:Customer_Profile_Attributes.High UCP or ICP */),1,0)
// var PREDICTION_TYPE=IF(ISFILTERED('TPT Metadata'[PREDICTION_TYPE] /* DB: dataset:TPT_Metadata.PREDICTION_TYPE */),1,0)
// var Parent_No_Pipe=IF(ISFILTERED('TPT Metadata'[Parent No Pipe] /* DB: dataset:TPT_Metadata.Parent No Pipe */),1,0)
// var Sub_No_Pipe=IF(ISFILTERED('TPT Metadata'[Sub No Pipe] /* DB: dataset:TPT_Metadata.Sub No Pipe */),1,0)
// var High_AES=IF(ISFILTERED('Customer Profile Attributes'[High AES] /* DB: dataset:Customer_Profile_Attributes.High AES */),1,0)



// // var Renewal_Status=IF(ISFILTERED('Retention MetaData'[OCC_Past Due] /* DB: vw_TD_EBI_Retention_MetaData.OCC_Past Due */),1,0)
// // var OCC_Close_in_30_Days=IF(ISFILTERED('Retention MetaData'[OCC_Close in <30 Days] /* DB: vw_TD_EBI_Retention_MetaData.OCC_Close in <30 Days */),1,0)
// // var OCC=IF(ISFILTERED('Retention MetaData'[OCC_OOC] /* DB: vw_TD_EBI_Retention_MetaData.OCC_OOC */),1,0)
// // var LTG=IF(ISFILTERED('Retention MetaData'[OCC_LTG] /* DB: vw_TD_EBI_Retention_MetaData.OCC_LTG */),1,0)
// // var Trailing=IF(ISFILTERED('Retention MetaData'[OCC_Trailing] /* DB: vw_TD_EBI_Retention_MetaData.OCC_Trailing */),1,0)
// // var IC=IF(ISFILTERED('Retention MetaData'[OCC_IC] /* DB: vw_TD_EBI_Retention_MetaData.OCC_IC */),1,0)
// // var Closed=IF(ISFILTERED('Retention MetaData'[OCC_Closed] /* DB: vw_TD_EBI_Retention_MetaData.OCC_Closed */),1,0)


// // // var SALES_STAGE_GROUP = 
// // // IF (
// // //     SELECTEDVALUE ( 'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ ) IN { "S3", "S4", "S5+" },
// // //     1,
// // //     0
// // // )


// // // var ADJ_COMMITMENT=IF(ISFILTERED(Pipeline[ADJ_COMMITMENT]),1,0)

// // //  var CREATOR_GROUP=IF(ISFILTERED('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */),1,0)
// // //  var SUB_CREATOR=IF(ISFILTERED('Creator Type'[SUB_CREATOR] /* DB: vw_EBI_CREATOR_TYPE.SUB_CREATOR */),1,0)

// // // var Deal_Not_Reviewed=IF(ISFILTERED(Opportunity[OCC_Deal Not Reviewed]),1,0)
// // // var Deal_Reviewed_7Days=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed < 7 Days]),1,0)
// // // var Deal_Reviewed_30Days=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed < 30 Days]),1,
// // // // var SALES_STAGE_GROUP=IF(ISFILTERED('Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */),1,0)
// // // var GEO_ADJ_COMMIT=IF(ISFILTERED(Pipeline[GEO_ADJ_COMMIT]),1,0)
// // // var Opp_Age_365d=IF(ISFILTERED(Pipeline[OCC_Opp Age >365d]),1,0)
// // // var Stage_Duration_120D=IF(ISFILTERED(Pipeline[OCC_Stage Duration > 120D]),1,0)
// // // var Not_Progressed_in60D=IF(ISFILTERED(Pipeline[OCC_Not Progressed in 60D]),1,0)
// // // var No_Business_Driver=IF(ISFILTERED(Opportunity[OCC_No Business Driver]),1,0)
// // // var Missing_BANT=IF(ISFILTERED(Opportunity[Missing BANT]),1,0)
// // // var Deal_in_month_3=IF(ISFILTERED(Pipeline[OCC_Deal in month 3]),1,0)
// // // var No_Mutual_Plan_in_S5=IF(ISFILTERED(Pipeline[OCC_No Mutual Plan in S5+]),1,0)
// // // var No_Mgr_Review_250k_deals=IF(ISFILTERED(Pipeline[OCC_No Mgr Review (+250k deals)]),1,0)
// // // var No_Partner_Attach_100k=IF(ISFILTERED(Pipeline[OCC_No Partner Attach (+100k)]),1,0)
// // // var Deals_with_5_Hygiene_Flag=IF(ISFILTERED(Pipeline[OCC_Deals with 5+ Hygiene Flag]),1,0)
// // // var Not_Progressed_in30D=IF(ISFILTERED(Pipeline[OCC_Not Progressed in 30D]),1,0)
// // // var No_IPOV_in_S5=IF(ISFILTERED(Pipeline[OCC_No IPOV in S5+]),1,0)
// // // var No_Power_aligned_in_S5=IF(ISFILTERED(Pipeline[OCC_No Power aligned in S5+]),1,0)



RETURN
CUSTOMER_SOLUTION_HEALTH+CUSTOMER_Account_HEALTH+RENEWAL_TYPE&""
```

#### Filter_Applied_Count_Creation

```dax
var SALES_STAGE_GROUP = 
IF (
    SELECTEDVALUE ( 'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ ) IN { "S3", "S4", "S5+" },
    1,
    0
)
var CUSTOMER_SOLUTION_HEALTH=IF(ISFILTERED('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */),1,0)
var ADJ_COMMITMENT=IF(ISFILTERED(Pipeline[ADJ_COMMITMENT]),1,0)

 var CREATOR_GROUP=IF(ISFILTERED('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */),1,0)
 var SUB_CREATOR=IF(ISFILTERED('Creator Type'[SUB_CREATOR] /* DB: vw_EBI_CREATOR_TYPE.SUB_CREATOR */),1,0)
var Stalled_active=IF(ISFILTERED(Pipeline[STALLED_BUT_INACTIVE]),1,0)
var High_Risk=IF(ISFILTERED('Account Sub'[High Credit Risk Account] /* DB: dataset:Account_Sub.High Credit Risk Account */),1,0)


RETURN
SALES_STAGE_GROUP+CUSTOMER_SOLUTION_HEALTH+ADJ_COMMITMENT+CREATOR_GROUP+SUB_CREATOR + Stalled_active+High_Risk&""
```

#### Filter_Applied_Count_Creation_AE

```dax
var SALES_STAGE_GROUP = 
IF (
    SELECTEDVALUE ( 'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ ) IN { "S3", "S4", "S5+" },
    1,
    0
)
var CUSTOMER_SOLUTION_HEALTH=IF(ISFILTERED('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */),1,0)
var ADJ_COMMITMENT=IF(ISFILTERED(Pipeline[ADJ_COMMITMENT]),1,0)

 var CREATOR_GROUP=IF(ISFILTERED('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */),1,0)
 var SUB_CREATOR=IF(ISFILTERED('Creator Type'[SUB_CREATOR] /* DB: vw_EBI_CREATOR_TYPE.SUB_CREATOR */),1,0)
 var Stalled_active=IF(ISFILTERED(Pipeline[STALLED_BUT_INACTIVE]),1,0)
 var High_Risk=IF(ISFILTERED('Account Sub'[High Credit Risk Account] /* DB: dataset:Account_Sub.High Credit Risk Account */),1,0)

RETURN
SALES_STAGE_GROUP+CUSTOMER_SOLUTION_HEALTH+ADJ_COMMITMENT+CREATOR_GROUP+SUB_CREATOR+Stalled_active+High_Risk&""
```

#### Filter_Applied_Count_Creation_Mgr

```dax
var SALES_STAGE_GROUP = 
IF (
    SELECTEDVALUE ( 'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ ) IN { "S3", "S4", "S5+" },
    1,
    0
)
var CUSTOMER_SOLUTION_HEALTH=IF(ISFILTERED('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */),1,0)
var ADJ_COMMITMENT=IF(ISFILTERED(Pipeline[ADJ_COMMITMENT]),1,0)

 var CREATOR_GROUP=IF(ISFILTERED('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */),1,0)
 var SUB_CREATOR=IF(ISFILTERED('Creator Type'[SUB_CREATOR] /* DB: vw_EBI_CREATOR_TYPE.SUB_CREATOR */),1,0)
 var Stalled_active=IF(ISFILTERED(Pipeline[STALLED_BUT_INACTIVE]),1,0)
 var High_Risk=IF(ISFILTERED('Account Sub'[High Credit Risk Account] /* DB: dataset:Account_Sub.High Credit Risk Account */),1,0)

RETURN
SALES_STAGE_GROUP+CUSTOMER_SOLUTION_HEALTH+ADJ_COMMITMENT+CREATOR_GROUP+SUB_CREATOR + Stalled_active+High_Risk&""
```

#### Filter_Applied_Count_Outlook_L3

```dax
var Deal_Reviewed=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed]),1,0)
var Deal_Not_Reviewed=IF(ISFILTERED(Opportunity[OCC_Deal Not Reviewed]),1,0)
var Deal_Reviewed_7Days=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed < 7 Days]),1,0)
var Deal_Reviewed_30Days=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed < 30 Days]),1,0)

var Filter_Applied_Count_SALES_STAGE_GROUP = 
IF (
    SELECTEDVALUE ( 'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ ) IN { "S3", "S4", "S5+" },
    1,
    0
)
// var SALES_STAGE_GROUP=IF(ISFILTERED('Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */),1,0)
var CUSTOMER_SOLUTION_HEALTH=IF(ISFILTERED('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */),1,0)
var GEO_ADJ_COMMIT=IF(ISFILTERED(Pipeline[GEO_ADJ_COMMIT]),1,0)
var Opp_Age_365d=IF(ISFILTERED(Pipeline[OCC_Opp Age >365d]),1,0)
var Stage_Duration_120D=IF(ISFILTERED(Pipeline[OCC_Stage Duration > 120D]),1,0)
var Not_Progressed_in60D=IF(ISFILTERED(Pipeline[OCC_Not Progressed in 60D]),1,0)
var No_Business_Driver=IF(ISFILTERED(Opportunity[OCC_No Business Driver]),1,0)
var Missing_BANT=IF(ISFILTERED(Opportunity[Missing BANT]),1,0)
var Deal_in_month_3=IF(ISFILTERED(Pipeline[OCC_Deal in month 3]),1,0)
var No_Mutual_Plan_in_S5=IF(ISFILTERED(Pipeline[OCC_No Mutual Plan in S5+]),1,0)
var No_Mgr_Review_250k_deals=IF(ISFILTERED(Pipeline[OCC_No Mgr Review (+250k deals)]),1,0)
var No_Partner_Attach_100k=IF(ISFILTERED(Pipeline[OCC_No Partner Attach (+100k)]),1,0)
var Deals_with_5_Hygiene_Flag=IF(ISFILTERED(Pipeline[OCC_Deals with 5+ Hygiene Flag]),1,0)
var Not_Progressed_in30D=IF(ISFILTERED(Pipeline[OCC_Not Progressed in 30D]),1,0)
var No_IPOV_in_S5=IF(ISFILTERED(Pipeline[OCC_No IPOV in S5+]),1,0)
var No_Power_aligned_in_S5=IF(ISFILTERED(Pipeline[OCC_No Power aligned in S5+]),1,0)
var No_Stalled_Active=IF(ISFILTERED(Pipeline[STALLED_BUT_INACTIVE]),1,0)
var High_Risk=IF(ISFILTERED('Account Sub'[High Credit Risk Account] /* DB: dataset:Account_Sub.High Credit Risk Account */),1,0)



RETURN
Deal_Reviewed+Deal_Not_Reviewed+Deal_Reviewed_7Days+Deal_Reviewed_30Days+CUSTOMER_SOLUTION_HEALTH+GEO_ADJ_COMMIT+Opp_Age_365d+Stage_Duration_120D+Not_Progressed_in60D+No_Business_Driver+Missing_BANT+Deal_in_month_3+No_Mutual_Plan_in_S5+No_Mgr_Review_250k_deals+Deals_with_5_Hygiene_Flag+No_IPOV_in_S5+No_Power_aligned_in_S5+Filter_Applied_Count_SALES_STAGE_GROUP+ No_Partner_Attach_100k + No_Stalled_Active + High_Risk&""
// +SALES_STAGE_GROUP
```

#### Filter_Applied_Count_Outlook_L3_AE

```dax
var Deal_Reviewed=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed]),1,0)
var Deal_Not_Reviewed=IF(ISFILTERED(Opportunity[OCC_Deal Not Reviewed]),1,0)
var Deal_Reviewed_7Days=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed < 7 Days]),1,0)
var Deal_Reviewed_30Days=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed < 30 Days]),1,0)

var Filter_Applied_Count_SALES_STAGE_GROUP = 
IF (
    SELECTEDVALUE ( 'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ ) IN { "S3", "S4", "S5+" },
    1,
    0
)
// var SALES_STAGE_GROUP=IF(ISFILTERED('Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */),1,0)
var CUSTOMER_SOLUTION_HEALTH=IF(ISFILTERED('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */),1,0)
var GEO_ADJ_COMMIT=IF(ISFILTERED(Pipeline[GEO_ADJ_COMMIT]),1,0)
var Opp_Age_365d=IF(ISFILTERED(Pipeline[OCC_Opp Age >365d]),1,0)
var Stage_Duration_120D=IF(ISFILTERED(Pipeline[OCC_Stage Duration > 120D]),1,0)
var Not_Progressed_in60D=IF(ISFILTERED(Pipeline[OCC_Not Progressed in 60D]),1,0)
// var Not_Progressed_in30D=IF(ISFILTERED(Pipeline[OCC_Not Progressed in 30D]),1,0)
var No_Business_Driver=IF(ISFILTERED(Opportunity[OCC_No Business Driver]),1,0)
var Missing_BANT=IF(ISFILTERED(Opportunity[Missing BANT]),1,0)
var Deal_in_month_3=IF(ISFILTERED(Pipeline[OCC_Deal in month 3]),1,0)
var No_Mutual_Plan_in_S5=IF(ISFILTERED(Pipeline[OCC_No Mutual Plan in S5+]),1,0)
var No_Mgr_Review_250k_deals=IF(ISFILTERED(Pipeline[OCC_No Mgr Review (+250k deals)]),1,0)
var No_Partner_Attach_100k=IF(ISFILTERED(Pipeline[OCC_No Partner Attach (+100k)]),1,0)
var Deals_with_5_Hygiene_Flag=IF(ISFILTERED(Pipeline[OCC_Deals with 5+ Hygiene Flag]),1,0)
var Not_Progressed_in30D=IF(ISFILTERED(Pipeline[OCC_Not Progressed in 30D]),1,0)
var No_IPOV_in_S5=IF(ISFILTERED(Pipeline[OCC_No IPOV in S5+]),1,0)
var No_Power_aligned_in_S5=IF(ISFILTERED(Pipeline[OCC_No Power aligned in S5+]),1,0)
var No_Stalled_Active=IF(ISFILTERED(Pipeline[STALLED_BUT_INACTIVE]),1,0)
var High_Risk=IF(ISFILTERED('Account Sub'[High Credit Risk Account] /* DB: dataset:Account_Sub.High Credit Risk Account */),1,0)


RETURN
Deal_Reviewed+Deal_Not_Reviewed+Deal_Reviewed_7Days+Deal_Reviewed_30Days+CUSTOMER_SOLUTION_HEALTH+GEO_ADJ_COMMIT+Opp_Age_365d+Stage_Duration_120D+Not_Progressed_in60D+No_Business_Driver+Missing_BANT+Deal_in_month_3+No_Mutual_Plan_in_S5+No_Mgr_Review_250k_deals+Deals_with_5_Hygiene_Flag+No_IPOV_in_S5+No_Power_aligned_in_S5+Filter_Applied_Count_SALES_STAGE_GROUP+ No_Partner_Attach_100k+Not_Progressed_in30D + No_Stalled_Active + High_Risk&""
// +SALES_STAGE_GROUP
```

#### Filter_Applied_Count_Outlook_L3_Mgr

```dax
var Deal_Reviewed=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed]),1,0)
var Deal_Not_Reviewed=IF(ISFILTERED(Opportunity[OCC_Deal Not Reviewed]),1,0)
var Deal_Reviewed_7Days=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed < 7 Days]),1,0)
var Deal_Reviewed_30Days=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed < 30 Days]),1,0)

var Filter_Applied_Count_SALES_STAGE_GROUP = 
IF (
    SELECTEDVALUE ( 'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ ) IN { "S3", "S4", "S5+" },
    1,
    0
)
// var SALES_STAGE_GROUP=IF(ISFILTERED('Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */),1,0)
var CUSTOMER_SOLUTION_HEALTH=IF(ISFILTERED('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */),1,0)
var GEO_ADJ_COMMIT=IF(ISFILTERED(Pipeline[GEO_ADJ_COMMIT]),1,0)
var Opp_Age_365d=IF(ISFILTERED(Pipeline[OCC_Opp Age >365d]),1,0)
var Stage_Duration_120D=IF(ISFILTERED(Pipeline[OCC_Stage Duration > 120D]),1,0)
var Not_Progressed_in60D=IF(ISFILTERED(Pipeline[OCC_Not Progressed in 60D]),1,0)
// var Not_Progressed_in30D=IF(ISFILTERED(Pipeline[OCC_Not Progressed in 30D]),1,0)
var No_Business_Driver=IF(ISFILTERED(Opportunity[OCC_No Business Driver]),1,0)
var Missing_BANT=IF(ISFILTERED(Opportunity[Missing BANT]),1,0)
var Deal_in_month_3=IF(ISFILTERED(Pipeline[OCC_Deal in month 3]),1,0)
var No_Mutual_Plan_in_S5=IF(ISFILTERED(Pipeline[OCC_No Mutual Plan in S5+]),1,0)
var No_Mgr_Review_250k_deals=IF(ISFILTERED(Pipeline[OCC_No Mgr Review (+250k deals)]),1,0)
var No_Partner_Attach_100k=IF(ISFILTERED(Pipeline[OCC_No Partner Attach (+100k)]),1,0)
var Deals_with_5_Hygiene_Flag=IF(ISFILTERED(Pipeline[OCC_Deals with 5+ Hygiene Flag]),1,0)
var Not_Progressed_in30D=IF(ISFILTERED(Pipeline[OCC_Not Progressed in 30D]),1,0)
var No_IPOV_in_S5=IF(ISFILTERED(Pipeline[OCC_No IPOV in S5+]),1,0)
var No_Power_aligned_in_S5=IF(ISFILTERED(Pipeline[OCC_No Power aligned in S5+]),1,0)
var No_Stalled_Active=IF(ISFILTERED(Pipeline[STALLED_BUT_INACTIVE]),1,0)
var High_Risk=IF(ISFILTERED('Account Sub'[High Credit Risk Account] /* DB: dataset:Account_Sub.High Credit Risk Account */),1,0)


RETURN
Deal_Reviewed+Deal_Not_Reviewed+Deal_Reviewed_7Days+Deal_Reviewed_30Days+CUSTOMER_SOLUTION_HEALTH+GEO_ADJ_COMMIT+Opp_Age_365d+Stage_Duration_120D+Not_Progressed_in60D+No_Business_Driver+Missing_BANT+Deal_in_month_3+No_Mutual_Plan_in_S5+No_Mgr_Review_250k_deals+Deals_with_5_Hygiene_Flag+No_IPOV_in_S5+No_Power_aligned_in_S5+Filter_Applied_Count_SALES_STAGE_GROUP+ No_Partner_Attach_100k+Not_Progressed_in30D + No_Stalled_Active + High_Risk&""
// +SALES_STAGE_GROUP
```

#### Filter_Applied_Count_Pipeline_Cov

```dax
var Deal_Reviewed=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed]),1,0)
var Deal_Not_Reviewed=IF(ISFILTERED(Opportunity[OCC_Deal Not Reviewed]),1,0)
var Deal_Reviewed_7Days=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed < 7 Days]),1,0)
var Deal_Reviewed_30Days=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed < 30 Days]),1,0)

var Filter_Applied_Count_SALES_STAGE_GROUP = 
IF (
    SELECTEDVALUE ( 'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ ) IN { "S3", "S4", "S5+" },
    1,
    0
)
// var SALES_STAGE_GROUP=IF(ISFILTERED('Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */),1,0)
var CUSTOMER_SOLUTION_HEALTH=IF(ISFILTERED('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */),1,0)
var GEO_ADJ_COMMIT=IF(ISFILTERED(Pipeline[GEO_ADJ_COMMIT]),1,0)
var Opp_Age_365d=IF(ISFILTERED(Pipeline[OCC_Opp Age >365d]),1,0)
var Stage_Duration_120D=IF(ISFILTERED(Pipeline[OCC_Stage Duration > 120D]),1,0)
var Not_Progressed_in60D=IF(ISFILTERED(Pipeline[OCC_Not Progressed in 60D]),1,0)
var No_Business_Driver=IF(ISFILTERED(Opportunity[OCC_No Business Driver]),1,0)
var Missing_BANT=IF(ISFILTERED(Opportunity[Missing BANT]),1,0)
var Deal_in_month_3=IF(ISFILTERED(Pipeline[OCC_Deal in month 3]),1,0)
var No_Mutual_Plan_in_S5=IF(ISFILTERED(Pipeline[OCC_No Mutual Plan in S5+]),1,0)
var No_Mgr_Review_250k_deals=IF(ISFILTERED(Pipeline[OCC_No Mgr Review (+250k deals)]),1,0)
var No_Partner_Attach_100k=IF(ISFILTERED(Pipeline[OCC_No Partner Attach (+100k)]),1,0)
var Deals_with_5_Hygiene_Flag=IF(ISFILTERED(Pipeline[OCC_Deals with 5+ Hygiene Flag]),1,0)
var Not_Progressed_in30D=IF(ISFILTERED(Pipeline[OCC_Not Progressed in 30D]),1,0)
var No_IPOV_in_S5=IF(ISFILTERED(Pipeline[OCC_No IPOV in S5+]),1,0)
var No_Power_aligned_in_S5=IF(ISFILTERED(Pipeline[OCC_No Power aligned in S5+]),1,0)
var No_Stalled_Active=IF(ISFILTERED(Pipeline[STALLED_BUT_INACTIVE]),1,0)
var High_Risk=IF(ISFILTERED('Account Sub'[High Credit Risk Account] /* DB: dataset:Account_Sub.High Credit Risk Account */),1,0)



RETURN
Deal_Reviewed+Deal_Not_Reviewed+Deal_Reviewed_7Days+Deal_Reviewed_30Days+CUSTOMER_SOLUTION_HEALTH+GEO_ADJ_COMMIT+Opp_Age_365d+Stage_Duration_120D+Not_Progressed_in60D+No_Business_Driver+Missing_BANT+Deal_in_month_3+No_Mutual_Plan_in_S5+No_Mgr_Review_250k_deals+Deals_with_5_Hygiene_Flag+No_IPOV_in_S5+No_Power_aligned_in_S5+Filter_Applied_Count_SALES_STAGE_GROUP+ No_Partner_Attach_100k + No_Stalled_Active + High_Risk&""
// +SALES_STAGE_GROUP
```

#### Filter_Applied_Count_Pipeline_Cov_AE

```dax
var Deal_Reviewed=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed]),1,0)
var Deal_Not_Reviewed=IF(ISFILTERED(Opportunity[OCC_Deal Not Reviewed]),1,0)
var Deal_Reviewed_7Days=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed < 7 Days]),1,0)
var Deal_Reviewed_30Days=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed < 30 Days]),1,0)

var Filter_Applied_Count_SALES_STAGE_GROUP = 
IF (
    SELECTEDVALUE ( 'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ ) IN { "S3", "S4", "S5+" },
    1,
    0
)
// var SALES_STAGE_GROUP=IF(ISFILTERED('Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */),1,0)
var CUSTOMER_SOLUTION_HEALTH=IF(ISFILTERED('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */),1,0)
var _Commit=IF(ISFILTERED(Pipeline[ADJ_COMMITMENT]),1,0)
var Opp_Age_365d=IF(ISFILTERED(Pipeline[OCC_Opp Age >365d]),1,0)
var Stage_Duration_120D=IF(ISFILTERED(Pipeline[OCC_Stage Duration > 120D]),1,0)
var Not_Progressed_in60D=IF(ISFILTERED(Pipeline[OCC_Not Progressed in 60D]),1,0)
var No_Business_Driver=IF(ISFILTERED(Opportunity[OCC_No Business Driver]),1,0)
var Missing_BANT=IF(ISFILTERED(Opportunity[Missing BANT]),1,0)
var Deal_in_month_3=IF(ISFILTERED(Pipeline[OCC_Deal in month 3]),1,0)
var No_Mutual_Plan_in_S5=IF(ISFILTERED(Pipeline[OCC_No Mutual Plan in S5+]),1,0)
var No_Mgr_Review_250k_deals=IF(ISFILTERED(Pipeline[OCC_No Mgr Review (+250k deals)]),1,0)
var No_Partner_Attach_100k=IF(ISFILTERED(Pipeline[OCC_No Partner Attach (+100k)]),1,0)
var Deals_with_5_Hygiene_Flag=IF(ISFILTERED(Pipeline[OCC_Deals with 5+ Hygiene Flag]),1,0)
var Not_Progressed_in30D=IF(ISFILTERED(Pipeline[OCC_Not Progressed in 30D]),1,0)
var No_IPOV_in_S5=IF(ISFILTERED(Pipeline[OCC_No IPOV in S5+]),1,0)
var No_Power_aligned_in_S5=IF(ISFILTERED(Pipeline[OCC_No Power aligned in S5+]),1,0)
var No_Stalled_Active=IF(ISFILTERED(Pipeline[STALLED_BUT_INACTIVE]),1,0)
var High_Risk=IF(ISFILTERED('Account Sub'[High Credit Risk Account] /* DB: dataset:Account_Sub.High Credit Risk Account */),1,0)


RETURN

Deal_Reviewed+Deal_Not_Reviewed+Deal_Reviewed_7Days+Deal_Reviewed_30Days+CUSTOMER_SOLUTION_HEALTH + _Commit + Opp_Age_365d+Stage_Duration_120D+Not_Progressed_in60D+No_Business_Driver+Missing_BANT+Deal_in_month_3+No_Mutual_Plan_in_S5+No_Mgr_Review_250k_deals+Deals_with_5_Hygiene_Flag+No_IPOV_in_S5+No_Power_aligned_in_S5+Filter_Applied_Count_SALES_STAGE_GROUP+ No_Partner_Attach_100k + No_Stalled_Active + High_Risk&""
// +SALES_STAGE_GROUP
```

#### Filter_Applied_Count_Pipeline_Cov_Mgr

```dax
var Deal_Reviewed=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed]),1,0)
var Deal_Not_Reviewed=IF(ISFILTERED(Opportunity[OCC_Deal Not Reviewed]),1,0)
var Deal_Reviewed_7Days=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed < 7 Days]),1,0)
var Deal_Reviewed_30Days=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed < 30 Days]),1,0)

var Filter_Applied_Count_SALES_STAGE_GROUP = 
IF (
    SELECTEDVALUE ( 'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ ) IN { "S3", "S4", "S5+" },
    1,
    0
)
// var SALES_STAGE_GROUP=IF(ISFILTERED('Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */),1,0)
var CUSTOMER_SOLUTION_HEALTH=IF(ISFILTERED('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */),1,0)
var MGR_ADJ_COMMIT=IF(ISFILTERED(Pipeline[MGR_ADJ_COMMIT]),1,0)
var Opp_Age_365d=IF(ISFILTERED(Pipeline[OCC_Opp Age >365d]),1,0)
var Stage_Duration_120D=IF(ISFILTERED(Pipeline[OCC_Stage Duration > 120D]),1,0)
var Not_Progressed_in60D=IF(ISFILTERED(Pipeline[OCC_Not Progressed in 60D]),1,0)
var No_Business_Driver=IF(ISFILTERED(Opportunity[OCC_No Business Driver]),1,0)
var Missing_BANT=IF(ISFILTERED(Opportunity[Missing BANT]),1,0)
var Deal_in_month_3=IF(ISFILTERED(Pipeline[OCC_Deal in month 3]),1,0)
var No_Mutual_Plan_in_S5=IF(ISFILTERED(Pipeline[OCC_No Mutual Plan in S5+]),1,0)
var No_Mgr_Review_250k_deals=IF(ISFILTERED(Pipeline[OCC_No Mgr Review (+250k deals)]),1,0)
var No_Partner_Attach_100k=IF(ISFILTERED(Pipeline[OCC_No Partner Attach (+100k)]),1,0)
var Deals_with_5_Hygiene_Flag=IF(ISFILTERED(Pipeline[OCC_Deals with 5+ Hygiene Flag]),1,0)
var Not_Progressed_in30D=IF(ISFILTERED(Pipeline[OCC_Not Progressed in 30D]),1,0)
var No_IPOV_in_S5=IF(ISFILTERED(Pipeline[OCC_No IPOV in S5+]),1,0)
var No_Power_aligned_in_S5=IF(ISFILTERED(Pipeline[OCC_No Power aligned in S5+]),1,0)
var No_Stalled_Active=IF(ISFILTERED(Pipeline[STALLED_BUT_INACTIVE]),1,0)
var High_Risk=IF(ISFILTERED('Account Sub'[High Credit Risk Account] /* DB: dataset:Account_Sub.High Credit Risk Account */),1,0)



RETURN
Deal_Reviewed+Deal_Not_Reviewed+Deal_Reviewed_7Days+Deal_Reviewed_30Days+CUSTOMER_SOLUTION_HEALTH+MGR_ADJ_COMMIT+Opp_Age_365d+Stage_Duration_120D+Not_Progressed_in60D+No_Business_Driver+Missing_BANT+Deal_in_month_3+No_Mutual_Plan_in_S5+No_Mgr_Review_250k_deals+Deals_with_5_Hygiene_Flag+No_IPOV_in_S5+No_Power_aligned_in_S5+Filter_Applied_Count_SALES_STAGE_GROUP+ No_Partner_Attach_100k + No_Stalled_Active + High_Risk&""
// +SALES_STAGE_GROUP
```

#### Filter_Applied_Count_Retention_AE

```dax
var Renewal_Status=IF(ISFILTERED('Retention MetaData'[OCC_Past Due] /* DB: vw_TD_EBI_Retention_MetaData.OCC_Past Due */),1,0)
var OCC_Close_in_30_Days=IF(ISFILTERED('Retention MetaData'[OCC_Close in <30 Days] /* DB: vw_TD_EBI_Retention_MetaData.OCC_Close in <30 Days */),1,0)
var OCC=IF(ISFILTERED('Retention MetaData'[OCC_OOC] /* DB: vw_TD_EBI_Retention_MetaData.OCC_OOC */),1,0)
var LTG=IF(ISFILTERED('Retention MetaData'[OCC_LTG] /* DB: vw_TD_EBI_Retention_MetaData.OCC_LTG */),1,0)
var Trailing=IF(ISFILTERED('Retention MetaData'[OCC_Trailing] /* DB: vw_TD_EBI_Retention_MetaData.OCC_Trailing */),1,0)
var IC=IF(ISFILTERED('Retention MetaData'[OCC_IC] /* DB: vw_TD_EBI_Retention_MetaData.OCC_IC */),1,0)
var Closed=IF(ISFILTERED('Retention MetaData'[OCC_Closed] /* DB: vw_TD_EBI_Retention_MetaData.OCC_Closed */),1,0)
var is_on_Time=IF(ISFILTERED(Retention[Is On Time Renewal]),1,0)


// var SALES_STAGE_GROUP = 
// IF (
//     SELECTEDVALUE ( 'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ ) IN { "S3", "S4", "S5+" },
//     1,
//     0
// )
var CUSTOMER_SOLUTION_HEALTH=IF(ISFILTERED('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */),1,0)
var RENEWAL_TYPE=IF(ISFILTERED('Retention MetaData'[RENEWAL_TYPE] /* DB: vw_TD_EBI_Retention_MetaData.RENEWAL_TYPE */),1,0)


// var ADJ_COMMITMENT=IF(ISFILTERED(Pipeline[ADJ_COMMITMENT]),1,0)

//  var CREATOR_GROUP=IF(ISFILTERED('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */),1,0)
//  var SUB_CREATOR=IF(ISFILTERED('Creator Type'[SUB_CREATOR] /* DB: vw_EBI_CREATOR_TYPE.SUB_CREATOR */),1,0)

// var Deal_Not_Reviewed=IF(ISFILTERED(Opportunity[OCC_Deal Not Reviewed]),1,0)
// var Deal_Reviewed_7Days=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed < 7 Days]),1,0)
// var Deal_Reviewed_30Days=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed < 30 Days]),1,
// // var SALES_STAGE_GROUP=IF(ISFILTERED('Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */),1,0)
// var GEO_ADJ_COMMIT=IF(ISFILTERED(Pipeline[GEO_ADJ_COMMIT]),1,0)
// var Opp_Age_365d=IF(ISFILTERED(Pipeline[OCC_Opp Age >365d]),1,0)
// var Stage_Duration_120D=IF(ISFILTERED(Pipeline[OCC_Stage Duration > 120D]),1,0)
// var Not_Progressed_in60D=IF(ISFILTERED(Pipeline[OCC_Not Progressed in 60D]),1,0)
// var No_Business_Driver=IF(ISFILTERED(Opportunity[OCC_No Business Driver]),1,0)
// var Missing_BANT=IF(ISFILTERED(Opportunity[Missing BANT]),1,0)
// var Deal_in_month_3=IF(ISFILTERED(Pipeline[OCC_Deal in month 3]),1,0)
// var No_Mutual_Plan_in_S5=IF(ISFILTERED(Pipeline[OCC_No Mutual Plan in S5+]),1,0)
// var No_Mgr_Review_250k_deals=IF(ISFILTERED(Pipeline[OCC_No Mgr Review (+250k deals)]),1,0)
// var No_Partner_Attach_100k=IF(ISFILTERED(Pipeline[OCC_No Partner Attach (+100k)]),1,0)
// var Deals_with_5_Hygiene_Flag=IF(ISFILTERED(Pipeline[OCC_Deals with 5+ Hygiene Flag]),1,0)
// var Not_Progressed_in30D=IF(ISFILTERED(Pipeline[OCC_Not Progressed in 30D]),1,0)
// var No_IPOV_in_S5=IF(ISFILTERED(Pipeline[OCC_No IPOV in S5+]),1,0)
// var No_Power_aligned_in_S5=IF(ISFILTERED(Pipeline[OCC_No Power aligned in S5+]),1,0)



RETURN
CUSTOMER_SOLUTION_HEALTH+Renewal_Status+OCC_Close_in_30_Days+OCC+LTG+Trailing+IC+RENEWAL_TYPE+is_on_Time&""
```

#### Filter_Applied_Count_Retention_L3

```dax
var Renewal_Status=IF(ISFILTERED('Retention MetaData'[OCC_Past Due] /* DB: vw_TD_EBI_Retention_MetaData.OCC_Past Due */),1,0)
var OCC_Close_in_30_Days=IF(ISFILTERED('Retention MetaData'[OCC_Close in <30 Days] /* DB: vw_TD_EBI_Retention_MetaData.OCC_Close in <30 Days */),1,0)
var OCC=IF(ISFILTERED('Retention MetaData'[OCC_OOC] /* DB: vw_TD_EBI_Retention_MetaData.OCC_OOC */),1,0)
var LTG=IF(ISFILTERED('Retention MetaData'[OCC_LTG] /* DB: vw_TD_EBI_Retention_MetaData.OCC_LTG */),1,0)
var Trailing=IF(ISFILTERED('Retention MetaData'[OCC_Trailing] /* DB: vw_TD_EBI_Retention_MetaData.OCC_Trailing */),1,0)
var IC=IF(ISFILTERED('Retention MetaData'[OCC_IC] /* DB: vw_TD_EBI_Retention_MetaData.OCC_IC */),1,0)
var Closed=IF(ISFILTERED('Retention MetaData'[OCC_Closed] /* DB: vw_TD_EBI_Retention_MetaData.OCC_Closed */),1,0)
var is_on_Time=IF(ISFILTERED(Retention[Is On Time Renewal]),1,0)


// var SALES_STAGE_GROUP = 
// IF (
//     SELECTEDVALUE ( 'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ ) IN { "S3", "S4", "S5+" },
//     1,
//     0
// )
var CUSTOMER_SOLUTION_HEALTH=IF(ISFILTERED('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */),1,0)
var RENEWAL_TYPE=IF(ISFILTERED('Retention MetaData'[RENEWAL_TYPE] /* DB: vw_TD_EBI_Retention_MetaData.RENEWAL_TYPE */),1,0)


// var ADJ_COMMITMENT=IF(ISFILTERED(Pipeline[ADJ_COMMITMENT]),1,0)

//  var CREATOR_GROUP=IF(ISFILTERED('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */),1,0)
//  var SUB_CREATOR=IF(ISFILTERED('Creator Type'[SUB_CREATOR] /* DB: vw_EBI_CREATOR_TYPE.SUB_CREATOR */),1,0)

// var Deal_Not_Reviewed=IF(ISFILTERED(Opportunity[OCC_Deal Not Reviewed]),1,0)
// var Deal_Reviewed_7Days=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed < 7 Days]),1,0)
// var Deal_Reviewed_30Days=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed < 30 Days]),1,
// // var SALES_STAGE_GROUP=IF(ISFILTERED('Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */),1,0)
// var GEO_ADJ_COMMIT=IF(ISFILTERED(Pipeline[GEO_ADJ_COMMIT]),1,0)
// var Opp_Age_365d=IF(ISFILTERED(Pipeline[OCC_Opp Age >365d]),1,0)
// var Stage_Duration_120D=IF(ISFILTERED(Pipeline[OCC_Stage Duration > 120D]),1,0)
// var Not_Progressed_in60D=IF(ISFILTERED(Pipeline[OCC_Not Progressed in 60D]),1,0)
// var No_Business_Driver=IF(ISFILTERED(Opportunity[OCC_No Business Driver]),1,0)
// var Missing_BANT=IF(ISFILTERED(Opportunity[Missing BANT]),1,0)
// var Deal_in_month_3=IF(ISFILTERED(Pipeline[OCC_Deal in month 3]),1,0)
// var No_Mutual_Plan_in_S5=IF(ISFILTERED(Pipeline[OCC_No Mutual Plan in S5+]),1,0)
// var No_Mgr_Review_250k_deals=IF(ISFILTERED(Pipeline[OCC_No Mgr Review (+250k deals)]),1,0)
// var No_Partner_Attach_100k=IF(ISFILTERED(Pipeline[OCC_No Partner Attach (+100k)]),1,0)
// var Deals_with_5_Hygiene_Flag=IF(ISFILTERED(Pipeline[OCC_Deals with 5+ Hygiene Flag]),1,0)
// var Not_Progressed_in30D=IF(ISFILTERED(Pipeline[OCC_Not Progressed in 30D]),1,0)
// var No_IPOV_in_S5=IF(ISFILTERED(Pipeline[OCC_No IPOV in S5+]),1,0)
// var No_Power_aligned_in_S5=IF(ISFILTERED(Pipeline[OCC_No Power aligned in S5+]),1,0)



RETURN
CUSTOMER_SOLUTION_HEALTH+Renewal_Status+OCC_Close_in_30_Days+OCC+LTG+Trailing+IC+RENEWAL_TYPE+is_on_Time&""
```

#### Filter_Applied_Count_Retention_Mgr

```dax
var Renewal_Status=IF(ISFILTERED('Retention MetaData'[OCC_Past Due] /* DB: vw_TD_EBI_Retention_MetaData.OCC_Past Due */),1,0)
var OCC_Close_in_30_Days=IF(ISFILTERED('Retention MetaData'[OCC_Close in <30 Days] /* DB: vw_TD_EBI_Retention_MetaData.OCC_Close in <30 Days */),1,0)
var OCC=IF(ISFILTERED('Retention MetaData'[OCC_OOC] /* DB: vw_TD_EBI_Retention_MetaData.OCC_OOC */),1,0)
var LTG=IF(ISFILTERED('Retention MetaData'[OCC_LTG] /* DB: vw_TD_EBI_Retention_MetaData.OCC_LTG */),1,0)
var Trailing=IF(ISFILTERED('Retention MetaData'[OCC_Trailing] /* DB: vw_TD_EBI_Retention_MetaData.OCC_Trailing */),1,0)
var IC=IF(ISFILTERED('Retention MetaData'[OCC_IC] /* DB: vw_TD_EBI_Retention_MetaData.OCC_IC */),1,0)
var Closed=IF(ISFILTERED('Retention MetaData'[OCC_Closed] /* DB: vw_TD_EBI_Retention_MetaData.OCC_Closed */),1,0)
var is_on_Time=IF(ISFILTERED(Retention[Is On Time Renewal]),1,0)


// var SALES_STAGE_GROUP = 
// IF (
//     SELECTEDVALUE ( 'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ ) IN { "S3", "S4", "S5+" },
//     1,
//     0
// )
var CUSTOMER_SOLUTION_HEALTH=IF(ISFILTERED('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */),1,0)
var RENEWAL_TYPE=IF(ISFILTERED('Retention MetaData'[RENEWAL_TYPE] /* DB: vw_TD_EBI_Retention_MetaData.RENEWAL_TYPE */),1,0)


// var ADJ_COMMITMENT=IF(ISFILTERED(Pipeline[ADJ_COMMITMENT]),1,0)

//  var CREATOR_GROUP=IF(ISFILTERED('Creator Type'[CREATOR_GROUP] /* DB: vw_EBI_CREATOR_TYPE.GRP_CREATOR_ALL */),1,0)
//  var SUB_CREATOR=IF(ISFILTERED('Creator Type'[SUB_CREATOR] /* DB: vw_EBI_CREATOR_TYPE.SUB_CREATOR */),1,0)

// var Deal_Not_Reviewed=IF(ISFILTERED(Opportunity[OCC_Deal Not Reviewed]),1,0)
// var Deal_Reviewed_7Days=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed < 7 Days]),1,0)
// var Deal_Reviewed_30Days=IF(ISFILTERED(Opportunity[OCC_Deal Reviewed < 30 Days]),1,
// // var SALES_STAGE_GROUP=IF(ISFILTERED('Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */),1,0)
// var GEO_ADJ_COMMIT=IF(ISFILTERED(Pipeline[GEO_ADJ_COMMIT]),1,0)
// var Opp_Age_365d=IF(ISFILTERED(Pipeline[OCC_Opp Age >365d]),1,0)
// var Stage_Duration_120D=IF(ISFILTERED(Pipeline[OCC_Stage Duration > 120D]),1,0)
// var Not_Progressed_in60D=IF(ISFILTERED(Pipeline[OCC_Not Progressed in 60D]),1,0)
// var No_Business_Driver=IF(ISFILTERED(Opportunity[OCC_No Business Driver]),1,0)
// var Missing_BANT=IF(ISFILTERED(Opportunity[Missing BANT]),1,0)
// var Deal_in_month_3=IF(ISFILTERED(Pipeline[OCC_Deal in month 3]),1,0)
// var No_Mutual_Plan_in_S5=IF(ISFILTERED(Pipeline[OCC_No Mutual Plan in S5+]),1,0)
// var No_Mgr_Review_250k_deals=IF(ISFILTERED(Pipeline[OCC_No Mgr Review (+250k deals)]),1,0)
// var No_Partner_Attach_100k=IF(ISFILTERED(Pipeline[OCC_No Partner Attach (+100k)]),1,0)
// var Deals_with_5_Hygiene_Flag=IF(ISFILTERED(Pipeline[OCC_Deals with 5+ Hygiene Flag]),1,0)
// var Not_Progressed_in30D=IF(ISFILTERED(Pipeline[OCC_Not Progressed in 30D]),1,0)
// var No_IPOV_in_S5=IF(ISFILTERED(Pipeline[OCC_No IPOV in S5+]),1,0)
// var No_Power_aligned_in_S5=IF(ISFILTERED(Pipeline[OCC_No Power aligned in S5+]),1,0)



RETURN
CUSTOMER_SOLUTION_HEALTH+Renewal_Status+OCC_Close_in_30_Days+OCC+LTG+Trailing+IC+RENEWAL_TYPE+is_on_Time&""
```

### GWP Measure Table (11 measures)

#### Action_Plan_Detail

```dax
VAR SelectedAccount = SELECTEDVALUE(Account[ACCOUNT_NAME])
VAR SelectedSolution = SELECTEDVALUE(OPG[PANORAMA_SOLUTION])
RETURN
IF(
    NOT(ISBLANK(SelectedAccount)) && NOT(ISBLANK(SelectedSolution)),
    MIN('Account Activities Metadata'[ACTION_PLAN_DETAIL]),
    "Select a Row from the table to populate"
)
```

#### GWP Account count Open closed

```dax
Var x = CALCULATE (
    'GWP Measure Table'[Retention Acc count],
    FILTER('Account Activities Metadata','Account Activities Metadata'[ACTIVITY_STATUS] IN { "In Progress", "Not Started" , "Complete"}))
Return
 
    IF(ISBLANK(x) , "",x )
```

#### GWP Account count closed

```dax
CALCULATE (
    'GWP Measure Table'[Retention Acc count],
    FILTER('Account Activities Metadata','Account Activities Metadata'[ACTIVITY_STATUS] = "Complete"
))
```

#### GWP_Description

```dax
VAR SelectedAccount = SELECTEDVALUE(Account[ACCOUNT_NAME])
VAR SelectedSolution = SELECTEDVALUE(OPG[PANORAMA_SOLUTION])
RETURN
IF(
    NOT(ISBLANK(SelectedAccount)) && NOT(ISBLANK(SelectedSolution)),
    MIN('Account Activities Metadata'[GET_WELL_PLAN_DESCRIPTION]),
    "Select a Row from the table to populate"
)
```

#### Help_Needed_Ask

```dax
VAR SelectedAccount = SELECTEDVALUE(Account[ACCOUNT_NAME])
VAR SelectedSolution = SELECTEDVALUE(OPG[PANORAMA_SOLUTION])
RETURN
IF(
    NOT(ISBLANK(SelectedAccount)) && NOT(ISBLANK(SelectedSolution)),
    MIN('Account Activities Metadata'[HELP_NEEDED_ASK]),
    "Select a Row from the table to populate"
)
```

#### Out of Compliance GWP

```dax
CALCULATE(
        SUMX(
            VALUES('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */), [Retention Acc count]),
           FILTER('Retention',Retention[Out Of Compliance]="Yes")
       )
```

#### Past_Efforts

```dax
VAR SelectedAccount = SELECTEDVALUE(Account[ACCOUNT_NAME])
VAR SelectedSolution = SELECTEDVALUE(OPG[PANORAMA_SOLUTION])
RETURN
IF(
    NOT(ISBLANK(SelectedAccount)) && NOT(ISBLANK(SelectedSolution)),
    MIN('Account Activities Metadata'[PAST_EFFORT]),
    "Select a Row from the table to populate"
)
```

#### Pct R/Y Account open count

```dax
DIVIDE ( [R/Y Sol Health with Open GWP], [R/Y Sol Health] )
```

#### R/Y Sol Health

```dax
CALCULATE(
        SUMX(
            VALUES('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */), [Retention Acc count]),
           FILTER('Customer Solution Health','Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ in {"Red", "Yellow"}
       ))
```

#### R/Y Sol Health with Open GWP

```dax
CALCULATE(
        SUMX(
            VALUES('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */), [Retention Acc count]),
           FILTER('Customer Solution Health','Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ in {"Red", "Yellow"}),
           FILTER('Account Activities Metadata','Account Activities Metadata'[ACTIVITY_STATUS] IN { "In Progress", "Not Started" })
       )
```

#### Retention Acc count

```dax
DISTINCTCOUNT(Retention[ret_acc_opg_key])
```

### OCC_Accounts (10 measures)

#### Accnt Health ARRAVG

```dax
IF([Accnts CQ ARRAVG] > 0,IF( 
HASONEVALUE('Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */), VALUES('Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */)), BLANK())
```

#### FY22 ARR

```dax
CALCULATE('_Account ARR Measures'[ARR $], 
        FILTER('Close Quarter',
          'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.CLOSE_YR */ = 2022 )
        )
```

#### FY23 ARR

```dax
CALCULATE('_Account ARR Measures'[ARR $], 
        FILTER('Close Quarter',
          'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.CLOSE_YR */ = 2023 )
        )
```

#### FY24 ARR

```dax
CALCULATE('_Account ARR Measures'[ARR $], 
        FILTER('Close Quarter',
          'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.CLOSE_YR */ = 2024 )
        )
```

#### FY24 RBOB

```dax
CALCULATE([RBOB w/o PQ Trail], 
        FILTER('Close Quarter',
          'Close Quarter'[CLOSE_YR] /* DB: vw_EBI_Caldate.CLOSE_YR */ = 2024 )
        )
```

#### Fit Score

```dax
MIN(TPT[Fit Score TPT])
```

#### MOPG ARR flag

```dax
VAR _arr = [Sub MA ARR]
VAR _arrmopg = [Accnts CQ ARRAVG]
RETURN
IF(
  _arr > 0 && ISBLANK(_arrmopg) , 1

)
```

#### MOPG Accnt ARRAVG

```dax
IF([Accnts CQ ARRAVG] > 0, MIN(OPG[MOPG1]))
```

#### YTD GNARR Lost

```dax
CALCULATE([OPPTY $],
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ <= 0,
        'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0,
        'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */ = "Lost",
        REMOVEFILTERS('Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */)
)
```

#### whitespace MOPG flag

```dax
VAR _selprediction = SELECTEDVALUE('TPT Metadata'[PREDICTION_TYPE] /* DB: dataset:TPT_Metadata.PREDICTION_TYPE */)
VAR _arr = [Accnts CQ ARRAVG]
RETURN
SWITCH(TRUE(),
 _selprediction = "UPSELL" && _arr > 0, 1,
 _selprediction = "CROSS-SELL" && _arr == 0, 1,
 _selprediction <> "UPSELL" && _selprediction <> "CROSS-SELL", 1 
)
```

### OCC_AccountsHealth (48 measures)

#### Acc Red & Yellow %

```dax
Var Num = [Red #] + [Yellow #]

Var Den = DISTINCTCOUNT('Account ARR'[Sub_MA] /* DB: dataset:Account_ARR.Sub_MA */)
RETURN
  
    DIVIDE(Num, Den)
```

#### Acc Red & Yellow %_Ac_H_L3

```dax
Var Num = [Red #_Ac_H] + [Yellow #_Ac_H]

Var Den = DISTINCTCOUNT('Account ARR'[ACCOUNT_ID] /* DB: dataset:Account_ARR.ACCOUNT_ID */)
RETURN
  
    DIVIDE(Num, Den)
```

#### Accnt Movement Down

```dax
VAR DOWNARROW =
    UNICHAR ( 9660 )
VAR _currmonthid =
    CALCULATE (
        MIN ( 'Close Quarter'[YR_MONTH_KEY] /* DB: vw_EBI_Caldate.YR_MONTH_KEY */ ),
        'Close Quarter'[CLOSE_WEEK_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_WEEK_BKT_NUMBER */ = 0
    )
VAR _totalmovingdown =
    CALCULATE (
        DISTINCTCOUNT ( 'Customer Health Movement'[ACCOUNT_ID] /* DB: dataset:Customer_Health_Movement.ACCOUNT_ID */ ),
        'Customer Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Health_Movement.SNAPSHOT_MONTH_ID */ = _currmonthid,
        'Health Movement Metadata'[HEALTH_MOVEMENT_TYPE] /* DB: dataset:Health_Movement_Metadata.HEALTH_MOVEMENT_TYPE */ = "Trending Down",
        Account[HAVE_ACTIVE_PQ_EOQ_ARR] = TRUE()
    )
RETURN
    DOWNARROW & " " & _totalmovingdown & " Moved Down"
```

#### Accnt Movement Down w/o Indicator

```dax
VAR _currmonthid =
    CALCULATE (
        MIN ( 'Close Quarter'[YR_MONTH_KEY] /* DB: vw_EBI_Caldate.YR_MONTH_KEY */ ),
        'Close Quarter'[CLOSE_WEEK_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_WEEK_BKT_NUMBER */ = 0
    )
VAR _totalmovingdown =
     IF( [Accnts CQ ARRAVG Health] > 0,
    CALCULATE (
        DISTINCTCOUNT ( 'Customer Health Movement'[ACCOUNT_ID] /* DB: dataset:Customer_Health_Movement.ACCOUNT_ID */ ),
        'Customer Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Health_Movement.SNAPSHOT_MONTH_ID */ = _currmonthid,
        // FILTER('Account ARR', 'Account ARR'[ARR] /* DB: dataset:Account_ARR.ARR */ > 0),
        'Health Movement Metadata'[HEALTH_MOVEMENT_TYPE] /* DB: dataset:Health_Movement_Metadata.HEALTH_MOVEMENT_TYPE */ = "Trending Down"
        ,Account[HAVE_ACTIVE_PQ_EOQ_ARR] = TRUE()
    )
    )
RETURN
    IF( HASONEVALUE('Account Country'[MARKET_AREA] /* DB: dataset:Account_Country.MARKET_AREA */) ||
       HASONEVALUE('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */),
       BLANK(),
    _totalmovingdown
    )
```

#### Accnt Movement Up

```dax
VAR UPARROW =
    UNICHAR ( 9650 )
VAR _currmonthid =
    CALCULATE (
        MIN ( 'Close Quarter'[YR_MONTH_KEY] /* DB: vw_EBI_Caldate.YR_MONTH_KEY */ ),
        'Close Quarter'[CLOSE_WEEK_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_WEEK_BKT_NUMBER */ = 0
    )
VAR _totalmovingup =
    CALCULATE (
        DISTINCTCOUNT ( 'Customer Health Movement'[ACCOUNT_ID] /* DB: dataset:Customer_Health_Movement.ACCOUNT_ID */ ),
        'Customer Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Health_Movement.SNAPSHOT_MONTH_ID */ = _currmonthid,
        'Health Movement Metadata'[HEALTH_MOVEMENT_TYPE] /* DB: dataset:Health_Movement_Metadata.HEALTH_MOVEMENT_TYPE */ = "Trending Up",
        Account[HAVE_ACTIVE_PQ_EOQ_ARR] = TRUE()
    )
RETURN
    UPARROW & " " & _totalmovingup & " Moved Up"
```

#### Accnt Movement Up w/o Indicator

```dax
VAR _currmonthid =
    CALCULATE (
        MIN ( 'Close Quarter'[YR_MONTH_KEY] /* DB: vw_EBI_Caldate.YR_MONTH_KEY */ ),
        'Close Quarter'[CLOSE_WEEK_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_WEEK_BKT_NUMBER */ = 0
    )
VAR _totalmovingup =
    IF([Accnts CQ ARRAVG Health] > 0,
    CALCULATE (
        DISTINCTCOUNT ( 'Customer Health Movement'[ACCOUNT_ID] /* DB: dataset:Customer_Health_Movement.ACCOUNT_ID */ ),
        'Customer Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Health_Movement.SNAPSHOT_MONTH_ID */ = _currmonthid,
        'Health Movement Metadata'[HEALTH_MOVEMENT_TYPE] /* DB: dataset:Health_Movement_Metadata.HEALTH_MOVEMENT_TYPE */ = "Trending Up",
        Account[HAVE_ACTIVE_PQ_EOQ_ARR] = TRUE()
    )
    )
RETURN
    IF( HASONEVALUE('Account Country'[MARKET_AREA] /* DB: dataset:Account_Country.MARKET_AREA */) ||
       HASONEVALUE('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */),
       BLANK(),
    _totalmovingup
    )
```

#### Account Red & Yellow #

```dax
FORMAT([Red #] + [Yellow #], "#,###") & " Accnt Soln."
```

#### Account Red & Yellow #_Acc_H

```dax
FORMAT([Red #_Ac_H] + [Yellow #_Ac_H], "#,###") & " R/Y Child Accnts"
```

#### CQ Acc ARR Green

```dax
CALCULATE([BOQ ARR $],  FILTER( 'Close Quarter','Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)
,REMOVEFILTERS('Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */),
FILTER('Customer Health', 'Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */ = "Green")
)
```

#### CQ Acc ARR Red

```dax
CALCULATE([BOQ ARR $],  FILTER( 'Close Quarter','Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)
,REMOVEFILTERS('Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */),
FILTER('Customer Health', 'Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */ = "Red")
)
```

#### CQ Acc ARR Yellow

```dax
CALCULATE([BOQ ARR $],  FILTER( 'Close Quarter','Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)
,REMOVEFILTERS('Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */),
FILTER('Customer Health', 'Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */ = "Yellow")
)
```

#### CQ Sol ARR Green

```dax
CALCULATE([BOQ ARR $],  FILTER( 'Close Quarter','Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)
,REMOVEFILTERS('Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */),
FILTER('Customer Solution Health', 'Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ = "Green")
)
```

#### CQ Sol ARR Red

```dax
CALCULATE([BOQ ARR $],  FILTER( 'Close Quarter','Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)
,REMOVEFILTERS('Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */),
FILTER('Customer Solution Health', 'Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ = "Red")
)
```

#### CQ Sol ARR Yellow

```dax
CALCULATE([BOQ ARR $],  FILTER( 'Close Quarter','Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)
,REMOVEFILTERS('Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */),
FILTER('Customer Solution Health', 'Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ = "Yellow")
)
```

#### Child Accounts

```dax
CALCULATE (
    COUNTROWS (
        FILTER (
            SUMMARIZECOLUMNS ( 'Account ARR'[ACCOUNT_ID] /* DB: dataset:Account_ARR.ACCOUNT_ID */, "ARR_", SUM('Account ARR'[BOQ_ARR] /* DB: dataset:Account_ARR.BOQ_ARR */) ),
            [ARR_] > 0
        )
    ),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)
```

#### Child Accounts BOQ

```dax
CALCULATE (
    COUNTROWS (
        FILTER (
            SUMMARIZECOLUMNS ( 'Account ARR'[ACCOUNT_ID] /* DB: dataset:Account_ARR.ACCOUNT_ID */, "ARR_", SUM('Account ARR'[BOQ_ARR] /* DB: dataset:Account_ARR.BOQ_ARR */) ),
            [ARR_] > 0
        )
    ),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)
```

#### Compliant_Acc_Green#

```dax
var Non_Compliant_Green= [Non_Compliant_Acc_Green #]

var DistincAccount=
CALCULATE (
    COUNTROWS (
        FILTER (
            SUMMARIZECOLUMNS (
                'Account ARR'[ACCOUNT_ID] /* DB: dataset:Account_ARR.ACCOUNT_ID */,
                "ARR_", '_Account ARR Measures'[ARR $]
            ),
            [ARR_] > 0 
        )
    ),
    KEEPFILTERS ( 'Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */ = "Green" ),
    KEEPFILTERS('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1)
)
Return
DistincAccount-Non_Compliant_Green
```

#### Compliant_Acc_Red#

```dax
var Non_Compliant_Red= [Non_Compliant_Acc_Red #]
var DistincAccount=
CALCULATE (
    COUNTROWS (
        FILTER (
            SUMMARIZECOLUMNS (
                'Account ARR'[ACCOUNT_ID] /* DB: dataset:Account_ARR.ACCOUNT_ID */,
                "ARR_", '_Account ARR Measures'[ARR $]
            ),
            [ARR_] > 0 
        )
    ),
    KEEPFILTERS ( 'Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */ = "Red" ),
    KEEPFILTERS('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1)
)
Return
DistincAccount-Non_Compliant_Red
```

#### Compliant_Acc_Yellow#

```dax
var Non_Compliant_Yellow= [Non_Compliant_Acc_Yellow #]
var DistincAccount=
CALCULATE (
    COUNTROWS (
        FILTER (
            SUMMARIZECOLUMNS (
                'Account ARR'[ACCOUNT_ID] /* DB: dataset:Account_ARR.ACCOUNT_ID */,
                "ARR_", '_Account ARR Measures'[ARR $]
            ),
            [ARR_] > 0 
        )
    ),
    KEEPFILTERS ( 'Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */ = "Yellow" ),
    KEEPFILTERS('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1)
)
Return
DistincAccount-Non_Compliant_Yellow
```

#### Compliant_Sol_Green#

```dax
var Non_Compliant_Green= [Non_Compliant_Sol_Green #]

var DistincAccount=
CALCULATE (
    COUNTROWS (
        FILTER (
            SUMMARIZECOLUMNS (
                'Account ARR'[acc_sol_key] /* DB: dataset:Account_ARR.acc_sol_key */,
                "ARR_", '_Account ARR Measures'[ARR $]
            ),
            [ARR_] > 0
        )
    ),
    KEEPFILTERS ( 'Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ = "Green" ),
    KEEPFILTERS('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1)
)
Return
DistincAccount-Non_Compliant_Green
```

#### Compliant_Sol_Red#

```dax
var Non_Compliant_Red= [Non_Compliant_Sol_Red #]

var DistincAccount=
CALCULATE (
    COUNTROWS (
        FILTER (
            SUMMARIZECOLUMNS (
                'Account ARR'[acc_sol_key] /* DB: dataset:Account_ARR.acc_sol_key */,
                "ARR_", '_Account ARR Measures'[ARR $]
            ),
            [ARR_] > 0
        )
    ),
    KEEPFILTERS ( 'Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ = "Red" ),
    KEEPFILTERS('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1)
)
Return
DistincAccount-Non_Compliant_Red
```

#### Compliant_Sol_Yellow#

```dax
var Non_Compliant_Yellow= [Non_Compliant_Sol_Yellow #]

var DistincAccount=
CALCULATE (
    COUNTROWS (
        FILTER (
            SUMMARIZECOLUMNS (
                'Account ARR'[acc_sol_key] /* DB: dataset:Account_ARR.acc_sol_key */,
                "ARR_", '_Account ARR Measures'[ARR $]
            ),
            [ARR_] > 0
        )
    ),
    KEEPFILTERS ( 'Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ = "Yellow" ),
    KEEPFILTERS('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1)
)
Return
DistincAccount-Non_Compliant_Yellow
```

#### Green #_Ac_H

```dax
CALCULATE([Child Accounts], 'Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */ = "Green")
```

#### Non_Compliant_Acc_Green #

```dax
CALCULATE (
    COUNTROWS (
        FILTER (
            SUMMARIZECOLUMNS (
                'Account ARR'[ACCOUNT_ID] /* DB: dataset:Account_ARR.ACCOUNT_ID */,
                'Account ARR'[DAYS_SINCE_ACCNT_HEALTH_MODIFED] /* DB: dataset:Account_ARR.DAYS_SINCE_ACCNT_HEALTH_MODIFED */,
                "ARR_", '_Account ARR Measures'[ARR $]
            ),
            [ARR_] > 0 && 'Account ARR'[DAYS_SINCE_ACCNT_HEALTH_MODIFED] /* DB: dataset:Account_ARR.DAYS_SINCE_ACCNT_HEALTH_MODIFED */ > 90
        )
    ),
    KEEPFILTERS ( 'Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */ = "Green" ),
    KEEPFILTERS('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1)
)
```

#### Non_Compliant_Acc_Red #

```dax
CALCULATE (
    COUNTROWS (
        FILTER (
            SUMMARIZECOLUMNS (
                'Account ARR'[ACCOUNT_ID] /* DB: dataset:Account_ARR.ACCOUNT_ID */,
                'Account ARR'[DAYS_SINCE_ACCNT_HEALTH_MODIFED] /* DB: dataset:Account_ARR.DAYS_SINCE_ACCNT_HEALTH_MODIFED */,
                "ARR_", '_Account ARR Measures'[ARR $]
            ),
            [ARR_] > 0 && 'Account ARR'[DAYS_SINCE_ACCNT_HEALTH_MODIFED] /* DB: dataset:Account_ARR.DAYS_SINCE_ACCNT_HEALTH_MODIFED */ > 14
        )
    ),
    KEEPFILTERS ( 'Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */ = "Red" ),
    KEEPFILTERS('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1)
)
```

#### Non_Compliant_Acc_Yellow #

```dax
CALCULATE (
    COUNTROWS (
        FILTER (
            SUMMARIZECOLUMNS (
                'Account ARR'[ACCOUNT_ID] /* DB: dataset:Account_ARR.ACCOUNT_ID */,
                'Account ARR'[DAYS_SINCE_ACCNT_HEALTH_MODIFED] /* DB: dataset:Account_ARR.DAYS_SINCE_ACCNT_HEALTH_MODIFED */,
                "ARR_", '_Account ARR Measures'[ARR $]
            ),
            [ARR_] > 0 && 'Account ARR'[DAYS_SINCE_ACCNT_HEALTH_MODIFED] /* DB: dataset:Account_ARR.DAYS_SINCE_ACCNT_HEALTH_MODIFED */ > 30
        )
    ),
    KEEPFILTERS ( 'Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */ = "Yellow" ),
    KEEPFILTERS('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1)
)
```

#### Non_Compliant_Sol_Green #

```dax
CALCULATE (
    COUNTROWS (
        FILTER (
            SUMMARIZECOLUMNS (
                'Account ARR'[acc_sol_key] /* DB: dataset:Account_ARR.acc_sol_key */,
                'Account ARR'[DAYS_SINCE_SOL_HEALTH_MODIFED] /* DB: dataset:Account_ARR.DAYS_SINCE_SOL_HEALTH_MODIFED */,
                "ARR_", '_Account ARR Measures'[ARR $]
            ),
            [ARR_] > 0 && 'Account ARR'[DAYS_SINCE_SOL_HEALTH_MODIFED] /* DB: dataset:Account_ARR.DAYS_SINCE_SOL_HEALTH_MODIFED */ > 90
        )
    ),
    KEEPFILTERS ( 'Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ = "Green" ),
    KEEPFILTERS('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1)
)
```

#### Non_Compliant_Sol_Red #

```dax
CALCULATE (
    COUNTROWS (
        FILTER (
            SUMMARIZECOLUMNS (
                'Account ARR'[acc_sol_key] /* DB: dataset:Account_ARR.acc_sol_key */,
                'Account ARR'[DAYS_SINCE_SOL_HEALTH_MODIFED] /* DB: dataset:Account_ARR.DAYS_SINCE_SOL_HEALTH_MODIFED */,
                "ARR_", '_Account ARR Measures'[ARR $]
            ),
            [ARR_] > 0 && 'Account ARR'[DAYS_SINCE_SOL_HEALTH_MODIFED] /* DB: dataset:Account_ARR.DAYS_SINCE_SOL_HEALTH_MODIFED */ > 14
        )
    ),
    KEEPFILTERS ( 'Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ = "Red" ),
    KEEPFILTERS('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1)
)
```

#### Non_Compliant_Sol_Yellow #

```dax
CALCULATE (
    COUNTROWS (
        FILTER (
            SUMMARIZECOLUMNS (
                'Account ARR'[acc_sol_key] /* DB: dataset:Account_ARR.acc_sol_key */,
                'Account ARR'[DAYS_SINCE_SOL_HEALTH_MODIFED] /* DB: dataset:Account_ARR.DAYS_SINCE_SOL_HEALTH_MODIFED */,
                "ARR_", '_Account ARR Measures'[ARR $]
            ),
            [ARR_] > 0 && 'Account ARR'[DAYS_SINCE_SOL_HEALTH_MODIFED] /* DB: dataset:Account_ARR.DAYS_SINCE_SOL_HEALTH_MODIFED */ > 30
        )
    ),
    KEEPFILTERS ( 'Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ = "Yellow" ),
    KEEPFILTERS('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1)
)
```

#### R/Y Sol Health with Open GWP Accnt

```dax
CALCULATE(
        SUMX(
            VALUES('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */), [Retention Acc count]),
           FILTER('Customer Solution Health','Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ in {"Red", "Yellow"}),
           FILTER('Account Activities Metadata','Account Activities Metadata'[ACTIVITY_STATUS] IN { "In Progress", "Not Started" }),
           FILTER('Close Quarter', 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)
       )
```

#### R/Y Sol Health with Open GWP_Ac_H

```dax
CALCULATE(
        SUMX(
            VALUES('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */), DISTINCTCOUNT('Account ARR'[acc_sol_key] /* DB: dataset:Account_ARR.acc_sol_key */)),
           FILTER('Customer Solution Health','Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ in {"Red", "Yellow"}),
           FILTER('Account Activities Metadata','Account Activities Metadata'[ACTIVITY_STATUS] IN { "In Progress", "Not Started","Declined/Cancelled","N/A" })
           ////FILTER('Close Quarter', 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0)
       )
```

#### R4Q Attrition $

```dax
CALCULATE([ARR IMPACT],
                            REMOVEFILTERS('Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */, 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */),        
                            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ IN {0,1,2,3}
                            )
```

#### R4Q RBOB w/o PQ Trail

```dax
CALCULATE([RBOB],NOT('Retention MetaData'[PIPELINE_RENEWAL] /* DB: vw_TD_EBI_Retention_MetaData.PIPELINE_RENEWAL */="PQ Trailing"),
                        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ IN {0,1,2,3} ,
                                REMOVEFILTERS('Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */, 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */)
                )
```

#### Red #_Ac_H

```dax
CALCULATE([Child Accounts], 'Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */ = "Red")
```

#### Sol Green Count

```dax
CALCULATE([Solution Counts], 
                        'Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ = "Green"
                        )
```

#### Sol Movement Down

```dax
VAR DOWNARROW =
    UNICHAR ( 9660 )
VAR _currmonthid =
    CALCULATE (
        MIN ( 'Close Quarter'[YR_MONTH_KEY] /* DB: vw_EBI_Caldate.YR_MONTH_KEY */ ),
        'Close Quarter'[CLOSE_WEEK_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_WEEK_BKT_NUMBER */ = 0
    )
VAR _totalmovingdown =
    CALCULATE (
        DISTINCTCOUNT ( 'Customer Solution Health Movement'[acc_sol_key] /* DB: dataset:Customer_Solution_Health_Movement.acc_sol_key */ ),
        'Customer Solution Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Solution_Health_Movement.SNAPSHOT_MONTH_ID */ = _currmonthid,
        'Health Movement Metadata'[HEALTH_MOVEMENT_TYPE] /* DB: dataset:Health_Movement_Metadata.HEALTH_MOVEMENT_TYPE */ = "Trending Down",
        'Customer Solution Health Movement'[HAVE_ACTIVE_PQ_EOQ_ARR_SOL] /* DB: dataset:Customer_Solution_Health_Movement.HAVE_ACTIVE_PQ_EOQ_ARR_SOL */ = TRUE()
    )
RETURN
    DOWNARROW & " " & _totalmovingdown & " Moved Down"
```

#### Sol Movement Down w/o Indicator

```dax
VAR _currmonthid =
    CALCULATE (
        MIN ( 'Close Quarter'[YR_MONTH_KEY] /* DB: vw_EBI_Caldate.YR_MONTH_KEY */ ),
        'Close Quarter'[CLOSE_WEEK_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_WEEK_BKT_NUMBER */ = 0
    )
VAR _totalmovingdown =
    CALCULATE (
        DISTINCTCOUNT ( 'Customer Solution Health Movement'[acc_sol_key] /* DB: dataset:Customer_Solution_Health_Movement.acc_sol_key */ ),
        'Customer Solution Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Solution_Health_Movement.SNAPSHOT_MONTH_ID */ = _currmonthid,
        'Health Movement Metadata'[HEALTH_MOVEMENT_TYPE] /* DB: dataset:Health_Movement_Metadata.HEALTH_MOVEMENT_TYPE */ = "Trending Down",
        'Customer Solution Health Movement'[HAVE_ACTIVE_PQ_EOQ_ARR_SOL] /* DB: dataset:Customer_Solution_Health_Movement.HAVE_ACTIVE_PQ_EOQ_ARR_SOL */ = TRUE()
    )
RETURN
    IF( HASONEVALUE('Account Country'[MARKET_AREA] /* DB: dataset:Account_Country.MARKET_AREA */) ||
       HASONEVALUE('Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */),
       BLANK(),
    _totalmovingdown
    )
```

#### Sol Movement Up

```dax
VAR UPARROW =
    UNICHAR ( 9650 )
VAR _currmonthid =
    CALCULATE (
        MIN ( 'Close Quarter'[YR_MONTH_KEY] /* DB: vw_EBI_Caldate.YR_MONTH_KEY */ ),
        'Close Quarter'[CLOSE_WEEK_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_WEEK_BKT_NUMBER */ = 0
    )
VAR _totalmovingup =
    CALCULATE (
        DISTINCTCOUNT ( 'Customer Solution Health Movement'[acc_sol_key] /* DB: dataset:Customer_Solution_Health_Movement.acc_sol_key */ ),
        'Customer Solution Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Solution_Health_Movement.SNAPSHOT_MONTH_ID */ = _currmonthid,
        'Health Movement Metadata'[HEALTH_MOVEMENT_TYPE] /* DB: dataset:Health_Movement_Metadata.HEALTH_MOVEMENT_TYPE */ = "Trending Up",
        'Customer Solution Health Movement'[HAVE_ACTIVE_PQ_EOQ_ARR_SOL] /* DB: dataset:Customer_Solution_Health_Movement.HAVE_ACTIVE_PQ_EOQ_ARR_SOL */ = TRUE()
    )
RETURN
    UPARROW & " " & _totalmovingup & " Moved Up"
```

#### Sol Movement Up w/o Indicator

```dax
VAR _currmonthid =
    CALCULATE (
        MIN ( 'Close Quarter'[YR_MONTH_KEY] /* DB: vw_EBI_Caldate.YR_MONTH_KEY */ ),
        'Close Quarter'[CLOSE_WEEK_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_WEEK_BKT_NUMBER */ = 0
    )
VAR _totalmovingup =
    CALCULATE (
        DISTINCTCOUNT ( 'Customer Solution Health Movement'[acc_sol_key] /* DB: dataset:Customer_Solution_Health_Movement.acc_sol_key */ ),
        'Customer Solution Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Solution_Health_Movement.SNAPSHOT_MONTH_ID */ = _currmonthid,
        'Health Movement Metadata'[HEALTH_MOVEMENT_TYPE] /* DB: dataset:Health_Movement_Metadata.HEALTH_MOVEMENT_TYPE */ = "Trending Up",
        'Customer Solution Health Movement'[HAVE_ACTIVE_PQ_EOQ_ARR_SOL] /* DB: dataset:Customer_Solution_Health_Movement.HAVE_ACTIVE_PQ_EOQ_ARR_SOL */ = TRUE()
    )
RETURN
    IF( HASONEVALUE('Account Country'[MARKET_AREA] /* DB: dataset:Account_Country.MARKET_AREA */) ||
       HASONEVALUE('Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */),
       BLANK(),
    _totalmovingup
    )
```

#### Solution Counts

```dax
CALCULATE (
    COUNTROWS (
        FILTER (
            SUMMARIZECOLUMNS ( 'Account ARR'[acc_sol_key] /* DB: dataset:Account_ARR.acc_sol_key */, "ARR_", sum('Account ARR'[BOQ_ARR] /* DB: dataset:Account_ARR.BOQ_ARR */) ),
            [ARR_] > 0
        )
    ),
    'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 0
)
```

#### Solution Green Count

```dax
CALCULATE([Solution Counts], 
                        'Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ = "Green"
                        )
```

#### Solution Red & Yellow #

```dax
FORMAT([Solution Red Count] + [Solution Yellow Count], "#,###") & " R/Y Soln."
```

#### Solution Red & Yellow %

```dax
Var Num = [Solution Red Count] + [Solution Yellow Count]

Var Den = [Solution Counts]
RETURN
  
    DIVIDE(Num, Den)
```

#### Solution Red Count

```dax
CALCULATE([Solution Counts], 
                        'Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ = "Red"
                        )
```

#### Solution Yellow Count

```dax
CALCULATE([Solution Counts], 
                        'Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */ = "Yellow"
                        )
```

#### Total Non Compliant Accnts

```dax
[Non_Compliant_Acc_Green #] + [Non_Compliant_Acc_Red #] + [Non_Compliant_Acc_Yellow #]
```

#### Total Non Compliant Solution

```dax
[Non_Compliant_Sol_Green #] + [Non_Compliant_Sol_Red #] + [Non_Compliant_Sol_Yellow #]
```

#### Yellow #_Ac_H

```dax
CALCULATE([Child Accounts], 'Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */ = "Yellow")
```

### OCC_Outlook_L3 (21 measures)

#### Adj Commit_M

```dax
VAR Qtr_bkt = SELECTEDVALUE('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)

VAR TM1 = CALCULATE(MAX('TM1 Bookings'[ADJ_COMMITMENT] /* DB: dataset:TM1_Bookings.ADJ_COMMITMENT */),ALL('Daily Weekly Switch'[Frequency]),ALL('Snapshot Quarter'))

RETURN 

IF(Qtr_bkt < 0, TM1, MAX(Pipeline[ADJ_COMMITMENT]))
```

#### CQ Risk Category OL

```dax
VAR Qtr_bkt = SELECTEDVALUE('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)

VAR TM1 = CALCULATE(MAX('TM1 Bookings'[Dummy] /* DB: dataset:TM1_Bookings.Dummy */),ALL('Daily Weekly Switch'[Frequency]),ALL('Snapshot Quarter'))

RETURN 

IF(Qtr_bkt < 0, TM1, CALCULATE(MAX(Pipeline[CQ Risk Category]), NOT(ISBLANK(Pipeline[CQ Risk Category]))))
```

#### CQ S5+ (Upside+ Upside Target)

```dax
CALCULATE([Upside + Upside Target],'Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */="S5+",ALL('Close Quarter'),'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=0)
```

#### Deal type OL

```dax
VAR Qtr_bkt = SELECTEDVALUE('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)

VAR TM1 = CALCULATE(CONCATENATEX(SUMMARIZE(FILTER('TM1 Bookings', 'TM1 Bookings'[OPP_ID] /* DB: dataset:TM1_Bookings.OPP_ID */ = 'TM1 Bookings'[OPP_ID] /* DB: dataset:TM1_Bookings.OPP_ID */),'Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */), 'Deal Type'[DEAL_TYPE] /* DB: vw_EBI_DEAL_TYPE.CROSS_UPSELL_DISPLAY */," , "),ALL('Daily Weekly Switch'[Frequency]),ALL('Snapshot Quarter'))

RETURN

IF(Qtr_bkt < 0, TM1, [Deal type Concat])
```

#### FQ S3/4 Pipe

```dax
CALCULATE([S3 $]+[S4 $],ALL('Close Quarter'),'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */>=1)
```

#### FQ S5+ Pipe

```dax
CALCULATE([SS5+ $],ALL('Close Quarter'),'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */>=1)
```

#### GNARR $ OL

```dax
VAR QTR_BKT = SELECTEDVALUE('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)

VAR past_ = CALCULATE('_TM1 Booking Measures'[TM1 Bookings $],ALL('Daily Weekly Switch'[Frequency]),ALL('Snapshot Quarter'))

RETURN

IF(QTR_BKT < 0, past_, [OPPTY $])
```

#### Geo Adj Commit_M

```dax
VAR Qtr_bkt = SELECTEDVALUE('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)

VAR TM1 = CALCULATE(MAX('TM1 Bookings'[GEO_ADJ_COMMIT] /* DB: dataset:TM1_Bookings.GEO_ADJ_COMMIT */),ALL('Daily Weekly Switch'[Frequency]),ALL('Snapshot Quarter'))

RETURN 

IF(Qtr_bkt < 0, TM1, MAX(Pipeline[GEO_ADJ_COMMIT]))
```

#### Mgr Adj Commit_M

```dax
VAR Qtr_bkt = SELECTEDVALUE('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)

VAR TM1 = CALCULATE(MAX('TM1 Bookings'[MGR_ADJ_COMMIT] /* DB: dataset:TM1_Bookings.MGR_ADJ_COMMIT */),ALL('Daily Weekly Switch'[Frequency]),ALL('Snapshot Quarter'))

RETURN 

IF(Qtr_bkt < 0, TM1, MAX(Pipeline[MGR_ADJ_COMMIT]))
```

#### Opp Age

```dax
VAR Qtr_bkt = SELECTEDVALUE('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)

VAR TM1 = CALCULATE(AVERAGE('TM1 Bookings'[DEAL_DURATION] /* DB: dataset:TM1_Bookings.DEAL_DURATION */),ALL('Daily Weekly Switch'[Frequency]),ALL('Snapshot Quarter'))

RETURN 

IF(Qtr_bkt < 0, TM1, AVERAGE(Pipeline[DEAL_AGE]))
```

#### PY GNARR

```dax
VAR SelectedQuarters = VALUES('Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */)
VAR CurrentYear = MAXX(SelectedQuarters, LEFT('Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */, 4))
VAR PreviousYearQuarters =
    SELECTCOLUMNS(
        SelectedQuarters,
        "CLOSE_QTR",
        FORMAT(VALUE(LEFT([CLOSE_QTR], 4)) - 1, "0000") & MID([CLOSE_QTR], 5, 3)
    )
VAR qtr = SELECTEDVALUE('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)
VAR past_ = CALCULATE('_TM1 Booking Measures'[TM1 Bookings $],ALL('Daily Weekly Switch'[Frequency]),ALL('Snapshot Quarter'),    'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ IN SelectedQuarters, 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ < 0    )

VAR CurrentValue = 
    CALCULATE(
        [W+F+UC $],
        'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ IN SelectedQuarters,'Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */=TRUE,
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ >= 0
    )

 
VAR PreviousValue =
    CALCULATE(
       [TM1 Bookings $],
        'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ IN PreviousYearQuarters, ALL('Daily Weekly Switch'[Frequency]),ALL('Snapshot Quarter'), ALL( 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */, 'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */)
    )
 
RETURN
 PreviousValue
```

#### Past Due

```dax
VAR Qtr_bkt = SELECTEDVALUE('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)

VAR TM1 = CALCULATE(MAX('TM1 Bookings'[Dummy] /* DB: dataset:TM1_Bookings.Dummy */),ALL('Daily Weekly Switch'[Frequency]),ALL('Snapshot Quarter'))

RETURN 

IF(Qtr_bkt < 0, TM1, MAX(Pipeline[OCC_Past Due]))
```

#### Products OL

```dax
VAR Qtr_bkt = SELECTEDVALUE('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)

RETURN 

IF(Qtr_bkt < 0, [Products_TM1], [Products])
```

#### Products_TM1

```dax
VAR products = CALCULATE(CONCATENATEX(SUMMARIZE(FILTER('TM1 Bookings', 'TM1 Bookings'[OPP_ID] /* DB: dataset:TM1_Bookings.OPP_ID */ = 'TM1 Bookings'[OPP_ID] /* DB: dataset:TM1_Bookings.OPP_ID */),OPG[MOPG1]), OPG[MOPG1],","), ALL('Daily Weekly Switch'[Frequency]),ALL('Snapshot Quarter'))

RETURN IF( HASONEVALUE(Opportunity[DEAL_REG_ID]), products)
```

#### Stage Duration

```dax
VAR Qtr_bkt = SELECTEDVALUE('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)

VAR Stage_age = CALCULATE(AVERAGE(Pipeline[STAGE_AGE]))

VAR TM1 = CALCULATE(MAX('TM1 Bookings'[Dummy] /* DB: dataset:TM1_Bookings.Dummy */), ALL('Daily Weekly Switch'[Frequency]),ALL('Snapshot Quarter'))

RETURN 

IF(Qtr_bkt < 0, TM1 , Stage_age)
```

#### Upside + Upside Target

```dax
[UPSIDE $]+[UPSIDE TARGETED $]
```

#### WoW GNARR%

```dax
VAR WFUC = CALCULATE(
    [W+F+UC $],
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "0",
    ALL('Snapshot Quarter'),
    ALL('Daily Weekly Switch')
)

VAR PW_WFUC = CALCULATE(
    [W+F+UC $],
    'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */ = "-1",
    ALL('Snapshot Quarter'),
    ALL('Daily Weekly Switch')
)

VAR PW_WFUC_res = IF(
    PW_WFUC = BLANK(),
    0,
    PW_WFUC
)

VAR Wow = DIVIDE(WFUC-PW_WFUC_res,PW_WFUC_res,BLANK())

RETURN Wow
```

#### YoY GNARR %

```dax
VAR SelectedQuarters = VALUES('Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */)
VAR CurrentYear = MAXX(SelectedQuarters, LEFT('Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */, 4))
VAR PreviousYearQuarters =
    SELECTCOLUMNS(
        SelectedQuarters,
        "CLOSE_QTR",
        FORMAT(VALUE(LEFT([CLOSE_QTR], 4)) - 1, "0000") & MID([CLOSE_QTR], 5, 3)
    )
VAR qtr = SELECTEDVALUE('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)
VAR past_ = CALCULATE('_TM1 Booking Measures'[TM1 Bookings $],ALL('Daily Weekly Switch'[Frequency]),ALL('Snapshot Quarter'),    'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ IN SelectedQuarters, 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ < 0    )
 
VAR CurrentValue =
    CALCULATE(
        [W+F+UC $],
        'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ IN SelectedQuarters,'Snapshot Quarter'[IS_LATEST_SNAPSHOT] /* DB: vw_EBI_Caldate.IS_LATEST_SNAPSHOT */=TRUE,
        'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ >= 0
    )
 
 
VAR PreviousValue =
    CALCULATE(
       [TM1 Bookings $],
        'Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */ IN PreviousYearQuarters, ALL('Daily Weekly Switch'[Frequency]),ALL('Snapshot Quarter'), ALL( 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */, 'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */)
    )
 
RETURN
    IF(
        HASONEVALUE('Region Hierarchy'[TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM */)
        || HASONEVALUE('Region Hierarchy'[SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM */)
        || HASONEVALUE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */)
        || HASONEVALUE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */),BLANK(),
        DIVIDE((CurrentValue + past_) - PreviousValue, PreviousValue))
```

#### YoY_arrow_WFCU

```dax
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)
var Diff = [YoY GNARR %]
return 
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%")&" YoY",
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%")&" YoY")
```

#### test_measure

```dax
IF(ISFILTERED(Pipeline[ADJ_COMMITMENT]), 1, 0)
```

**_OCC_Coverage:**

#### Inactive/Active

```dax
VAR Qtr_bkt = SELECTEDVALUE('Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */)

VAR PIPE_SI = MAX(Pipeline[STALLED_BUT_INACTIVE])

VAR TM1 = CALCULATE(MAX('TM1 Bookings'[Dummy] /* DB: dataset:TM1_Bookings.Dummy */),ALL('Daily Weekly Switch'[Frequency]),ALL('Snapshot Quarter'))


RETURN 

IF(Qtr_bkt < 0, TM1 , PIPE_SI)
```

### OCC_Perf_L2 (116 measures)

#### AE PART 25_50% Comp

```dax
IF(
    ISBLANK([AE PART 25_50% QTD %]),
    BLANK(),
    FORMAT([AE PART 25_50% QTD %], "0%") & UNICHAR(10) &"("& FORMAT([AE PART 25_50% QTD #], "#,##0")&")"
)
```

#### AE PART 25_50% QTD #

```dax
var cnt = 
 CALCULATE(
                COUNTROWS(
                    FILTER(
                        SUMMARIZECOLUMNS(
                            'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */,
                            "attn", [CQ MANAGER FORECAST %]
                        ),
                        AND([attn] < 0.50, [attn] >= 0.25)
                    )
                ),
                'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
                'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place",
                'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
                'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
                'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
                'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
                REMOVEFILTERS('Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */)
                
            )

    RETURN
    IF ( cnt = 0, BLANK (), cnt )
```

#### AE PART 25_50% QTD %

```dax
DIVIDE([AE PART 25_50% QTD #],[AE IN SEAT],BLANK())
```

#### AE PART 50_75% Comp

```dax
IF(
    ISBLANK([AE PART 50_75% QTD %]),
    BLANK(),
    FORMAT([AE PART 50_75% QTD %], "0%") & UNICHAR(10) &"("& FORMAT([AE PART 50_75% QTD #], "#,##0")&")"
)
```

#### AE PART 50_75% QTD #

```dax
var cnt = 
 CALCULATE(
                COUNTROWS(
                    FILTER(
                        SUMMARIZECOLUMNS(
                            'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */,
                            "attn", [CQ MANAGER FORECAST %]
                        ),
                        AND([attn] < 0.75, [attn] >= 0.5)
                    )
                ),
                'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
                'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place",
                'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
                'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
                'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
                'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
                REMOVEFILTERS('Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */)
                
            )

    RETURN
    IF ( cnt = 0, BLANK (), cnt )
```

#### AE PART 50_75% QTD %

```dax
DIVIDE([AE PART 50_75% QTD #],[AE IN SEAT],BLANK())
```

#### AE PART <25% Comp

```dax
IF(
    ISBLANK([AE PART <25% QTD %]),
    BLANK(),
    FORMAT([AE PART <25% QTD %], "0%") & UNICHAR(10) &"("& FORMAT([AE PART <25% QTD #], "#,##0")&")"
)
```

#### AE PART <25% QTD #

```dax
var cnt = 
 CALCULATE(
                COUNTROWS(
                    FILTER(
                        SUMMARIZECOLUMNS(
                            'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */,
                            "attn", [CQ MANAGER FORECAST %]
                        ),
                        AND([attn] < 0.25, [attn] >= 0)
                    )
                ),
                'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
                'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place",
                'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
                'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
                'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
                'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
                REMOVEFILTERS('Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */)
                
            )

    RETURN
    IF ( cnt = 0, BLANK (), cnt )
```

#### AE PART <25% QTD %

```dax
DIVIDE([AE PART <25% QTD #],[AE IN SEAT],BLANK())
```

#### AE PART @75% Comp

```dax
IF(
    ISBLANK([AE PART @75% QTD %]),
    BLANK(),
    FORMAT([AE PART @75% QTD %], "0%") & UNICHAR(10) &"("& FORMAT([AE PART @75% QTD #], "#,##0")&")"
)
```

#### AE YTD >75% Comp

```dax
IF(
    ISBLANK([Rep Participation YTD]),
    BLANK(),
    FORMAT([Rep Participation YTD], "0%") & UNICHAR(10) &"("& FORMAT([AE PART @75% YTD #], "#,##0")&")"
)
```

#### AE in Seat Comp

```dax
IF(
  NOT(ISBLANK([FP AE in seat])),
    
    FORMAT([AE IN SEAT %], "0%") & UNICHAR(10) &"("& FORMAT([FP AE in seat], "#,##0")&")"
)
```

#### Action Path

```dax
VAR RepName = MAX('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */)
VAR actionpath =
    CALCULATE(
        MAX('OCC_Performance Cohort_Band'[Action Path]),
        'OCC_Performance Cohort_Band'[REP_NAME] = RepName
    )
RETURN
actionpath
```

#### Action Path Rep Landing

```dax
IF(HASONEVALUE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */),[Action Path],BLANK())
```

#### CQ Pipe Gen @75% QTD #

```dax
var cnt = 
 CALCULATE(
                COUNTROWS(
                    FILTER(
                        SUMMARIZECOLUMNS(
                            'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */,
                            "attn", [GROSS CREATION QTD %]
                        ),
                        [attn] >= 0.75
                    )
                ),
                'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
                'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place",
                'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
                'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
                'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
                'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
                REMOVEFILTERS('Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */)
                
            )

    RETURN
    IF ( cnt = 0, BLANK (), cnt )
```

#### CQ Pipe Gen @75% QTD %

```dax
DIVIDE([CQ Pipe Gen @75% QTD #],[AE IN SEAT],BLANK())
```

#### CQ Pipe Gen @75% QTD Comp

```dax
IF(
  NOT(ISBLANK([CQ Pipe Gen @75% QTD %])),
    
    FORMAT([CQ Pipe Gen @75% QTD %], "0%") & UNICHAR(10) &"("& FORMAT([CQ Pipe Gen @75% QTD #], "#,##0")&")"
)
```

#### CQ Pipe Gen @75% YTD #

```dax
var cnt = 
 CALCULATE(
                COUNTROWS(
                    FILTER(
                        SUMMARIZECOLUMNS(
                            'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */,
                            "attn", [GROSS CREATED YTD %]
                        ),
                        [attn] >= 0.75
                    )
                ),
                'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
                'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place",
                'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
                'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE//,
                // 'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
                // 'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
                // REMOVEFILTERS('Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */)
                
            )

    RETURN
    IF ( cnt = 0, BLANK (), cnt )
```

#### CQ Pipe Gen @75% YTD %

```dax
DIVIDE([CQ Pipe Gen @75% YTD #],[AE IN SEAT],BLANK())
```

#### CQ Pipe Gen @75% YTD Comp

```dax
IF(
  NOT(ISBLANK([CQ Pipe Gen @75% YTD %])),
    
    FORMAT([CQ Pipe Gen @75% YTD %], "0%") & UNICHAR(10) &"("& FORMAT([CQ Pipe Gen @75% YTD #], "#,##0")&")"
)
```

#### CY Cov>2x #

```dax
var cnt = 
 CALCULATE(
                COUNTROWS(
                    FILTER(
                        SUMMARIZECOLUMNS(
                            'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */,
                            "attn", [S3+ Cov CY w/o x]
                        ),
                        [attn] >= 2.0
                    )
                ),
                'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
                'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place",
                'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
                'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
                'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
                'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
                REMOVEFILTERS('Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */)
                
            )

    RETURN
    IF ( cnt = 0, BLANK (), cnt )
```

#### CY Cov>2x %

```dax
DIVIDE([CY Cov>2x #],[AE IN SEAT],BLANK())
```

#### CY Cov>2x Comp

```dax
IF(
  NOT(ISBLANK([CY Cov>2x %])),
    
    FORMAT([CY Cov>2x %], "0%") & UNICHAR(10) &"("& FORMAT([CY Cov>2x #], "#,##0")&")"
)
```

#### CY Proj >75% Comp

```dax
IF(
  NOT(ISBLANK([Rep CY Projection > 75%])),
    
    FORMAT([Rep CY Projection > 75%], "0%") & UNICHAR(10) &"("& FORMAT([Rep CY Projection #], "#,##0")&")"
)
```

#### Cohort

```dax
VAR RepName = MAX('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */)
VAR CoverageCohort =
    CALCULATE(
        MAX('OCC_Performance Cohort_Band'[Coverage Cohort]),
        'OCC_Performance Cohort_Band'[REP_NAME] = RepName
    )
VAR MaturityCohort =
    CALCULATE(
        MAX('OCC_Performance Cohort_Band'[Maturity Cohort]),
        'OCC_Performance Cohort_Band'[REP_NAME] = RepName
    )
RETURN
    IF(
        NOT ISBLANK(CoverageCohort) && NOT ISBLANK(MaturityCohort),
        CoverageCohort & " - " & MaturityCohort,
        BLANK()
    )
```

#### Cohort Rep Landing

```dax
IF(HASONEVALUE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */),[Cohort],BLANK())
```

#### Dynamic Drillthrough page

```dax
VAR RepName = MAX('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */)
VAR Drill =
    CALCULATE(
        MAX('OCC_Performance Cohort_Band'[Drillthrough Page]),
        'OCC_Performance Cohort_Band'[REP_NAME] = RepName
    )
RETURN
Drill
```

#### Dynamic Page

```dax
VAR LoggedInUser = USERPRINCIPALNAME()
VAR Position = SEARCH(
    "@",
    LoggedInUser,,
    0
)
VAR LDAP = LEFT(LoggedInUser,Position - 1)
//"MEATCHLE"

VAR REP = CALCULATE(
    MIN( 'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */ ),
    'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */ = LDAP,
    'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
    'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
    'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN {"DX","DX/DME"}
    //'Region Hierarchy'[TA_END_DATE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TA_END_DATE */>TODAY()
)

VAR FLM = CALCULATE(
    MIN( 'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */ ),
    'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */ = LDAP,
    'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE(),
    'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
    'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN {"DX","DX/DME"}
    //'Region Hierarchy'[TA_END_DATE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TA_END_DATE */>TODAY()
)

VAR SLM = CALCULATE(
    MIN( 'Region Hierarchy'[SLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM_LDAP */ ),
    'Region Hierarchy'[SLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM_LDAP */ = LDAP,
    'Region Hierarchy'[IS_TRUE_SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_SLM */ = TRUE(),
    'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
    'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN {"DX","DX/DME"}
   // 'Region Hierarchy'[TA_END_DATE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TA_END_DATE */>TODAY()
)

VAR TLM = CALCULATE(
    MIN( 'Region Hierarchy'[TLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM_LDAP */ ),
    'Region Hierarchy'[TLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM_LDAP */ = LDAP,
    'Region Hierarchy'[IS_TRUE_TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_TLM */ = TRUE(),
    'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
    'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN {"DX","DX/DME"}
    //'Region Hierarchy'[TA_END_DATE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TA_END_DATE */>TODAY()
)

var page = SWITCH(LDAP,TLM,"Manager", 
                    SLM,"Manager",
                    FLM,"Manager",
                    REP,"AE",
                "One Command Center")

RETURN page
```

#### FLM COUNT > 75 YTD CW %_OCC

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

#### FLM COUNT > 75 YTD WoW %

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
            "Perf",[YTD PROJECTION % OCC]
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

#### FLM CQ Pipe Gen @75% QTD #

```dax
var cnt = 
 CALCULATE(
                COUNTROWS(
                    FILTER(
                        SUMMARIZECOLUMNS(
                            'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,
                            "attn", [GROSS CREATION QTD %]
                        ),
                        [attn] >= 0.75
                    )
                ),
        'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE,
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
        'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
     --   'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
        'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
        REMOVEFILTERS ( 'Target Type' )
    )
VAR tot = cnt + [FLM_extras_QTDProjection]
RETURN
    IF ( tot = 0, BLANK (), tot )
```

#### FLM CQ Pipe Gen @75% QTD %

```dax
DIVIDE([FLM CQ Pipe Gen @75% QTD #],[FLM Count],BLANK())
```

#### FLM CQ Pipe Gen @75% QTD Comp

```dax
IF(
  NOT(ISBLANK([FLM CQ Pipe Gen @75% QTD %])),
    
    FORMAT([FLM CQ Pipe Gen @75% QTD %], "0%") & UNICHAR(10) &"("& FORMAT([FLM CQ Pipe Gen @75% QTD #], "#,##0")&")"
)
```

#### FLM CQ Pipe Gen @75% YTD #

```dax
var cnt = 
 CALCULATE(
                COUNTROWS(
                    FILTER(
                        SUMMARIZECOLUMNS(
                            'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,
                            "attn", [GROSS CREATED YTD %]
                        ),
                        [attn] >= 0.75
                    )
                ),
        'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE,
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
        'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
     --   'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
        'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
        REMOVEFILTERS ( 'Target Type' )
    )
VAR tot = cnt + [FLM_extras_QTDProjection]
RETURN
    IF ( tot = 0, BLANK (), tot )
```

#### FLM CQ Pipe Gen @75% YTD %

```dax
DIVIDE([FLM CQ Pipe Gen @75% YTD #],[FLM Count],BLANK())
```

#### FLM CQ Pipe Gen @75% YTD Comp

```dax
IF(
  NOT(ISBLANK([FLM CQ Pipe Gen @75% YTD %])),
    
    FORMAT([FLM CQ Pipe Gen @75% YTD %], "0%") & UNICHAR(10) &"("& FORMAT([FLM CQ Pipe Gen @75% YTD #], "#,##0")&")"
)
```

#### FLM CY Cov>2x #

```dax
var cnt = 
 CALCULATE(
                COUNTROWS(
                    FILTER(
                        SUMMARIZECOLUMNS(
                            'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,
                            "attn", [S3+ Cov CY w/o x]
                        ),
                        [attn] >= 2.0
                    )
                ),
        'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE,
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
        'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
     --   'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
        'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
        REMOVEFILTERS ( 'Target Type' )
    )
VAR tot = cnt + [FLM_extras_QTDProjection]
RETURN
    IF ( tot = 0, BLANK (), tot )
```

#### FLM CY Cov>2x %

```dax
DIVIDE([FLM CY Cov>2x #],[FLM Count],BLANK())
```

#### FLM CY Cov>2x Comp

```dax
IF(
  NOT(ISBLANK([FLM CY Cov>2x %])),
    
    FORMAT([FLM CY Cov>2x %], "0%") & UNICHAR(10) &"("& FORMAT([FLM CY Cov>2x #], "#,##0")&")"
)
```

#### FLM CY Trend

```dax
var Diff = CALCULATE([FLM CY Cov>2x %],'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */="0")-CALCULATE([FLM CY Cov>2x %],'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */="W1",'Daily Weekly Switch'[Frequency]="Weekly")
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)

return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### FLM Cohort

```dax
VAR RepName = MAX('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */)
VAR Team =
    CALCULATE(
        MAX('OCC_Performance Cohort FLM_Band'[Team Cohort]),
        'OCC_Performance Cohort FLM_Band'[FLM] = RepName
    )
VAR FLM =
    CALCULATE(
        MAX('OCC_Performance Cohort FLM_Band'[FLM Cohort]),
        'OCC_Performance Cohort FLM_Band'[FLM] = RepName
    )
RETURN
    IF(
        NOT ISBLANK(Team) && NOT ISBLANK(FLM),
        Team & " - " & FLM,
        BLANK()
    )
```

#### FLM Gen QTD Trend

```dax
var Diff = CALCULATE([FLM CQ Pipe Gen @75% QTD %],'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */="0")-CALCULATE([FLM CQ Pipe Gen @75% QTD %],'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */="W1",'Daily Weekly Switch'[Frequency]="Weekly")
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)

return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### FLM Gen YTD Trend

```dax
var Diff = CALCULATE([FLM CQ Pipe Gen @75% YTD %],'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */="0")-CALCULATE([FLM CQ Pipe Gen @75% YTD %],'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */="W1",'Daily Weekly Switch'[Frequency]="Weekly")
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)

return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### FLM Mat Cov Trend

```dax
var Diff = CALCULATE([FLM Q+1 Mature Covx>1.2 %],'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */="0")-CALCULATE([FLM Q+1 Mature Covx>1.2 %],'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */="W1",'Daily Weekly Switch'[Frequency]="Weekly")
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)

return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### FLM PART 25_50% QTD # WoW

```dax
VAR flms =
       COUNTROWS(
        CALCULATETABLE(
        FILTER(
            SUMMARIZECOLUMNS( 'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,"Perf",[CQ MANAGER FORECAST % WoW]
            ),
            AND([Perf] >=0.25,[Perf]<0.5)
        ),
        'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE,
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
        'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
     --   'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
        'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
        REMOVEFILTERS ( 'Target Type' )
    )
)
VAR tot = flms + [FLM_extras_QTDProjection]
RETURN
    IF ( tot = 0, BLANK (), tot )
```

#### FLM PART 25_50% QTD % WoW

```dax
VAR flms = DIVIDE([FLM PART 25_50% QTD # WoW], [FLM COUNT],BLANK())

RETURN
flms
```

#### FLM PART 25_50% QTD % WoW Comp

```dax
IF(
  NOT(ISBLANK([FLM PART 25_50% QTD % WoW])),
    
    FORMAT([FLM PART 25_50% QTD % WoW], "0%") & UNICHAR(10) &"("& FORMAT([FLM PART 25_50% QTD # WoW], "#,##0")&")"
)
```

#### FLM PART 50_75% QTD # WoW

```dax
VAR flms =
       COUNTROWS(
        CALCULATETABLE(
        FILTER(
            SUMMARIZECOLUMNS( 'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,"Perf",[CQ MANAGER FORECAST % WoW]
            ),
            AND([Perf] >=0.5,[Perf]<0.75)
        ),
        'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE,
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
        'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
     --   'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
        'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
        REMOVEFILTERS ( 'Target Type' )
    )
)
VAR tot = flms + [FLM_extras_QTDProjection]
RETURN
    IF ( tot = 0, BLANK (), tot )
```

#### FLM PART 50_75% QTD % WoW

```dax
VAR flms = DIVIDE([FLM PART 50_75% QTD # WoW], [FLM COUNT],BLANK())

RETURN
flms
```

#### FLM PART 50_75% QTD % WoW Comp

```dax
IF(
  NOT(ISBLANK([FLM PART 50_75% QTD % WoW])),
    
    FORMAT([FLM PART 50_75% QTD % WoW], "0%") & UNICHAR(10) &"("& FORMAT([FLM PART 50_75% QTD # WoW], "#,##0")&")"
)
```

#### FLM PART <25% QTD # WoW

```dax
VAR flms =
       COUNTROWS(
        CALCULATETABLE(
        FILTER(
            SUMMARIZECOLUMNS( 'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,"Perf",[CQ MANAGER FORECAST % WoW]
            ),
            AND([Perf] >=0,[Perf]<0.25)
        ),
        'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE,
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
        'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
     --   'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
        'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
        REMOVEFILTERS ( 'Target Type' )
    )
)
VAR tot = flms + [FLM_extras_QTDProjection]
RETURN
    IF ( tot = 0, BLANK (), tot )
```

#### FLM PART <25% QTD % WoW

```dax
VAR flms = DIVIDE([FLM PART <25% QTD # WoW], [FLM COUNT],BLANK())

RETURN
flms
```

#### FLM PART <25% QTD % WoW Comp

```dax
IF(
  NOT(ISBLANK([FLM PART <25% QTD % WoW])),
    
    FORMAT([FLM PART <25% QTD % WoW], "0%") & UNICHAR(10) &"("& FORMAT([FLM PART <25% QTD # WoW], "#,##0")&")"
)
```

#### FLM Parent Tier 1 Completion >100 #

```dax
var cnt = 
 CALCULATE(
                COUNTROWS(
                    FILTER(
                        SUMMARIZECOLUMNS(
                            'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */,
                            "attn", [FP Tier 1 Parent Complete %]
                        ),
                        [attn] >= 1.0
                    )
                ),
                'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
                'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place",
                'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
                'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
                'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
                'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
                REMOVEFILTERS('Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */)
                
            )

    RETURN
    IF ( cnt = 0, BLANK (), cnt )
```

#### FLM Parent Tier 1 Completion >100 %

```dax
DIVIDE([Parent Tier 1 Completion >100 #],[AE IN SEAT],BLANK())
```

#### FLM Part QTD Trend

```dax
var Diff = CALCULATE([FLM Participation QTD WoW_L2],'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */="0")-CALCULATE([FLM Participation QTD WoW_L2],'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */="W1")
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)

return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### FLM Part YTD Trend

```dax
var Diff = CALCULATE([FLM Participation YTD],'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */="0")-CALCULATE([FLM Participation YTD],'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */="W1")
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)

return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### FLM Participation QTD WoW Comp

```dax
IF(
  NOT(ISBLANK([FLM Participation QTD WoW_L2])),
    
    FORMAT([FLM Participation QTD WoW_L2], "0%") & UNICHAR(10) &"("& FORMAT([FLM PART @75% QTD # WoW], "#,##0")&")"
)
```

#### FLM Participation QTD WoW_L2

```dax
VAR flms = DIVIDE([FLM PART @75% QTD # WoW], [FLM COUNT],BLANK())

RETURN
flms
```

#### FLM Participation YTD Comp_L2

```dax
IF(
  NOT(ISBLANK([FLM Participation YTD])),
    
    FORMAT([FLM Participation YTD], "0%") & UNICHAR(10) &"("& FORMAT([FLM PART @75% YTD #], "#,##0")&")"
)
```

#### FLM Q+1 Mature Covx>1.2 #

```dax
var cnt = 
 CALCULATE(
                COUNTROWS(
                    FILTER(
                        SUMMARIZECOLUMNS(
                            'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,
                            "attn", [Mature Pipe SS5+ (Q+1) numeric w/o snap]
                        ),
                        [attn] >= 1.2
                    )
                ),
        'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE,
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
        'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
     --   'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
        'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
        REMOVEFILTERS ( 'Target Type' )
    )
VAR tot = cnt + [FLM_extras_QTDProjection]
RETURN
    IF ( tot = 0, BLANK (), tot )
```

#### FLM Q+1 Mature Covx>1.2 %

```dax
DIVIDE([FLM Q+1 Mature Covx>1.2 #],[FLM Count],BLANK())
```

#### FLM Q+1 Mature Covx>1.2 Comp

```dax
IF(
  NOT(ISBLANK([FLM Q+1 Mature Covx>1.2 %])),
    
    FORMAT([FLM Q+1 Mature Covx>1.2 %], "0%") & UNICHAR(10) &"("& FORMAT([FLM Q+1 Mature Covx>1.2 #], "#,##0")&")"
)
```

#### FLM Q+1 Pipe Covx>2.7 #

```dax
var cnt = 
 CALCULATE(
                COUNTROWS(
                    FILTER(
                        SUMMARIZECOLUMNS(
                            'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,
                            "attn", [S3 Q+1 CovX (Numeric) w/o snap]
                        ),
                        [attn] >= 2.7
                    )
                ),
        'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE,
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
        'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
     --   'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
        'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
        REMOVEFILTERS ( 'Target Type' )
    )
VAR tot = cnt + [FLM_extras_QTDProjection]
RETURN
    IF ( tot = 0, BLANK (), tot )
```

#### FLM Q+1 Pipe Covx>2.7 %

```dax
DIVIDE([FLM Q+1 Pipe Covx>2.7 #],[FLM Count],BLANK())
```

#### FLM Q+1 Pipe Covx>2.7 Comp

```dax
IF(
  NOT(ISBLANK([FLM Q+1 Pipe Covx>2.7 %])),
    
    FORMAT([FLM Q+1 Pipe Covx>2.7 %], "0%") & UNICHAR(10) &"("& FORMAT([FLM Q+1 Pipe Covx>2.7 #], "#,##0")&")"
)
```

#### FLM Q+1 Trend

```dax
var Diff = CALCULATE([FLM Q+1 Pipe Covx>2.7 %],'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */="0")-CALCULATE([FLM Q+1 Pipe Covx>2.7 %],'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */="W1",'Daily Weekly Switch'[Frequency]="Weekly")
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)

return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### FLM R4Q Trend

```dax
var Diff = CALCULATE([FLM Rolling 4 Qtr S3 Covx>2x %],'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */="0")-CALCULATE([FLM Rolling 4 Qtr S3 Covx>2x %],'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */="W1",'Daily Weekly Switch'[Frequency]="Weekly")
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)

return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### FLM Rolling 4 Qtr S3 Covx>2x #

```dax
var cnt = 
 CALCULATE(
                COUNTROWS(
                    FILTER(
                        SUMMARIZECOLUMNS(
                            'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,
                            "attn", [S3+ Cov R4Q w/o snap]
                        ),
                        [attn] >= 2.0
                    )
                ),
        'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE,
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
        'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
     --   'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
        'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
        REMOVEFILTERS ( 'Target Type' )
    )
VAR tot = cnt + [FLM_extras_QTDProjection]
RETURN
    IF ( tot = 0, BLANK (), tot )
```

#### FLM Rolling 4 Qtr S3 Covx>2x %

```dax
DIVIDE([FLM Rolling 4 Qtr S3 Covx>2x #],[FLM Count],BLANK())
```

#### FLM Rolling 4 Qtr S3 Covx>2x Comp

```dax
IF(
  NOT(ISBLANK([FLM Rolling 4 Qtr S3 Covx>2x %])),
    
    FORMAT([FLM Rolling 4 Qtr S3 Covx>2x %], "0%") & UNICHAR(10) &"("& FORMAT([FLM Rolling 4 Qtr S3 Covx>2x #], "#,##0")&")"
)
```

#### FLM Sub Tier 1 Completion >100 #

```dax
var cnt = 
 CALCULATE(
                COUNTROWS(
                    FILTER(
                        SUMMARIZECOLUMNS(
                            'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,
                            "attn", [FP Tier 1 Sub Complete %]
                        ),
                        [attn] >= 1.0
                    )
                ),
                'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE,
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
        'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
     --   'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
        'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
        REMOVEFILTERS ( 'Target Type' )
    )
VAR tot = cnt + [FLM_extras_QTDProjection]
RETURN
    IF ( tot = 0, BLANK (), tot )
```

#### FLM Sub Tier 1 Completion >100 %

```dax
DIVIDE([Sub Tier 1 Completion >100 #],[AE IN SEAT],BLANK())
```

#### FLM Team QTD Trend

```dax
var Diff = CALCULATE([FLM WITH >50% AE @75% QTD % WoW_L2],'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */="0")-CALCULATE([FLM WITH >50% AE @75% QTD % WoW_L2],'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */="W1")
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)

return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### FLM Team YTD Trend

```dax
var Diff = CALCULATE([FLM WITH >50% AE @75% YTD WoW %],'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */="0")-CALCULATE([FLM WITH >50% AE @75% YTD WoW %],'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */="W1")
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)

return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### FLM WITH >50% AE @75% QTD % WoW Comp

```dax
IF(
  NOT(ISBLANK([FLM WITH >50% AE @75% QTD % WoW_L2])),
    
    FORMAT([FLM WITH >50% AE @75% QTD % WoW_L2], "0%") & UNICHAR(10) &"("& FORMAT([FLM WITH >50% AE @75% QTD # WoW], "#,##0")&")"
)
```

#### FLM WITH >50% AE @75% QTD % WoW_L2

```dax
VAR flms = 
    IF (
        NOT HASONEVALUE(Pipeline[DEAL_BAND_NEW]),
        DIVIDE([FLM WITH >50% AE @75% QTD # WoW], [FLM COUNT]),
        BLANK()
    )

var res = 
    IF(flms <> 0, flms, BLANK())
RETURN
res
```

#### FLM WITH >50% AE @75% YTD WoW #

```dax
VAR flms =
       COUNTROWS(
        CALCULATETABLE(
        FILTER(
            SUMMARIZECOLUMNS('Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,"Perf",[FLM COUNT > 75 YTD WoW %]
            ),
            [Perf] >=0.5
        ),
        'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = TRUE,
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
        'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
       -- 'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
        'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
        REMOVEFILTERS ( 'Target Type' )
    )
 )
var tot = flms + [FLM_EXTRAS_FLM WITH >50% AE @75% YTD WoW #]

RETURN
    IF ( tot = 0, BLANK (), tot )
```

#### FLM WITH >50% AE @75% YTD WoW %

```dax
VAR flms = DIVIDE([FLM WITH >50% AE @75% YTD WoW #], [FLM COUNT])

RETURN 
    IF(flms <> 0, flms, BLANK())
```

#### FLM WITH >50% AE @75% YTD WoW % Comp

```dax
IF(
  NOT(ISBLANK([FLM WITH >50% AE @75% YTD WoW %])),
    
    FORMAT([FLM WITH >50% AE @75% YTD WoW %], "0%") & UNICHAR(10) &"("& FORMAT([FLM WITH >50% AE @75% YTD WoW #], "#,##0")&")"
)
```

#### FLM_EXTRAS_FLM WITH >50% AE @75% YTD WoW #

```dax
VAR flms =
       COUNTROWS(
        CALCULATETABLE(
       FILTER(
            SUMMARIZECOLUMNS('Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */,"Perf",[FLM COUNT > 75 YTD WoW %]
            ),
            [Perf] >=0.5
        ),
        'Region Hierarchy'[FLM_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP */ IN { "JVIKAS"/*, "REABY"*/ },
        'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ = FALSE,
        REMOVEFILTERS ( 'Region Hierarchy'[IS_TRUE_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM */ ),
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
        'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
       -- 'Reporting Hierarchy'[IS_CY_RPT_HIER] /* DB: VW_TD_EBI_REPORTING_HIERARCHY.IS_CY_RPT_HIER */ = TRUE,
        'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
        'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
        REMOVEFILTERS ( 'Target Type' )
    )
)
RETURN
    IF ( flms = 0, BLANK (), flms )
```

#### Gross Creation YTD_L3

```dax
IF([GROSS CREATED YTD %]=0,BLANK(),[GROSS CREATED YTD %])
```

#### Gross Creation_L3

```dax
IF([GROSS CREATION QTD %]=0,BLANK(),[GROSS CREATION QTD %])
```

#### Mature Pipe SS5+ (Q+1) numeric w/o snap

```dax
ROUND(
        CALCULATE(
            [COVERAGE MATURE PIPE / BOOKINGS TARGET X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,
            REMOVEFILTERS('Close Quarter')
        ),
    1
    )
```

#### Parent Tier 1 Completion >100 #

```dax
var cnt = 
 CALCULATE(
                COUNTROWS(
                    FILTER(
                        SUMMARIZECOLUMNS(
                            'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */,
                            "attn", [FP Tier 1 Parent Complete %]
                        ),
                        [attn] >= 1.0
                    )
                ),
                'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
                'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place",
                'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
                'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
                'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
                'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
                REMOVEFILTERS('Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */)
                
            )

    RETURN
    IF ( cnt = 0, BLANK (), cnt )
```

#### Parent Tier 1 Completion >100 %

```dax
DIVIDE([Parent Tier 1 Completion >100 #],[AE IN SEAT],BLANK())
```

#### Parent Tier 1 Completion >100 Comp

```dax
IF(
  NOT(ISBLANK([Parent Tier 1 Completion >100 %])),
    
    FORMAT([Parent Tier 1 Completion >100 %], "0%") & UNICHAR(10) &"("& FORMAT([Parent Tier 1 Completion >100 #], "#,##0")&")"
)
```

#### Q+1 Mature Covx>1.2 #

```dax
var cnt = 
 CALCULATE(
                COUNTROWS(
                    FILTER(
                        SUMMARIZECOLUMNS(
                            'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */,
                            "attn", [Mature Pipe SS5+ (Q+1) numeric w/o snap]
                        ),
                        [attn] >= 1.2
                    )
                ),
                'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
                'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place",
                'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
                'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
                'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
                'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
                REMOVEFILTERS('Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */)
                
            )

    RETURN
    IF ( cnt = 0, BLANK (), cnt )
```

#### Q+1 Mature Covx>1.2 %

```dax
DIVIDE([Q+1 Mature Covx>1.2 #],[AE IN SEAT],BLANK())
```

#### Q+1 Mature Covx>1.2 Comp

```dax
IF(
  NOT(ISBLANK([Q+1 Mature Covx>1.2 %])),
    
    FORMAT([Q+1 Mature Covx>1.2 %], "0%") & UNICHAR(10) &"("& FORMAT([Q+1 Mature Covx>1.2 #], "#,##0")&")"
)
```

#### Q+1 Pipe Covx>2.7 #

```dax
var cnt = 
 CALCULATE(
                COUNTROWS(
                    FILTER(
                        SUMMARIZECOLUMNS(
                            'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */,
                            "attn", [S3 Q+1 CovX (Numeric) w/o snap]
                        ),
                        [attn] >= 2.7
                    )
                ),
                'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
                'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place",
                'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
                'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
                'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
                'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
                REMOVEFILTERS('Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */)
                
            )

    RETURN
    IF ( cnt = 0, BLANK (), cnt )
```

#### Q+1 Pipe Covx>2.7 %

```dax
DIVIDE([Q+1 Pipe Covx>2.7 #],[AE IN SEAT],BLANK())
```

#### Q+1 Pipe Covx>2.7 Comp

```dax
IF(
  NOT(ISBLANK([Q+1 Pipe Covx>2.7 %])),
    
    FORMAT([Q+1 Pipe Covx>2.7 %], "0%") & UNICHAR(10) &"("& FORMAT([Q+1 Pipe Covx>2.7 #], "#,##0")&")"
)
```

#### Rep CY Proj Trend

```dax
var Diff = CALCULATE([Rep CY Projection > 75%_L2],'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */="0")-CALCULATE([Rep CY Projection > 75%_L2],'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */="W1")
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)

return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### Rep CY Projection > 75%_L2

```dax
var res = DIVIDE([Rep CY Projection #],[AE IN SEAT])

RETURN
res
```

#### Rep CY Trend

```dax
var Diff = CALCULATE([CY Cov>2x %],'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */="0")-CALCULATE([CY Cov>2x %],'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */="W1",'Daily Weekly Switch'[Frequency]="Weekly")
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)

return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### Rep Gen QTD Trend

```dax
var Diff = CALCULATE([CQ Pipe Gen @75% QTD %],'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */="0")-CALCULATE([CQ Pipe Gen @75% QTD %],'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */="W1",'Daily Weekly Switch'[Frequency]="Weekly")
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)

return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### Rep Gen YTD Trend

```dax
var Diff = CALCULATE([CQ Pipe Gen @75% YTD %],'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */="0")-CALCULATE([CQ Pipe Gen @75% YTD %],'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */="W1",'Daily Weekly Switch'[Frequency]="Weekly")
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)

return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### Rep Mat Cov Trend

```dax
var Diff = CALCULATE([Q+1 Mature Covx>1.2 %],'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */="0")-CALCULATE([Q+1 Mature Covx>1.2 %],'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */="W1",'Daily Weekly Switch'[Frequency]="Weekly")
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)

return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### Rep Part QTD Trend

```dax
var Diff = CALCULATE([Rep Participation QTD WoW_L2],'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */="0")-CALCULATE([Rep Participation QTD WoW_L2],'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */="W1")
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)

return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### Rep Part YTD Trend

```dax
var Diff = CALCULATE([Rep Participation YTD],'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */="0")-CALCULATE([Rep Participation YTD],'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */="W1")
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)

return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### Rep Participation QTD WoW_L2

```dax
VAR res = 
IF (
        HASONEVALUE ( 'Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */ ),
        BLANK (),
DIVIDE([Rep Participation QTD # WoW],[AE IN SEAT],BLANK())
)

RETURN
res
```

#### Rep Q+1 Trend

```dax
var Diff = CALCULATE([Q+1 Pipe Covx>2.7 %],'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */="0")-CALCULATE([Q+1 Pipe Covx>2.7 %],'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */="W1",'Daily Weekly Switch'[Frequency]="Weekly")
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)

return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### Rep R4Q Trend

```dax
var Diff = CALCULATE([Rolling 4 Start %],'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] /* DB: vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE */="0")-CALCULATE([Rolling 4 Start %],'Snapshot Quarter'[SNAPSHOT_WEEK_NUMBER] /* DB: vw_EBI_Caldate.WEEKNUMBER */="W1",'Daily Weekly Switch'[Frequency]="Weekly")
VAR UPARROW = UNICHAR(9650)
VAR DOWNARROW = UNICHAR(9660)

return
IF(Diff > 0,
UPARROW &" "& FORMAT(Diff,"0.0%"),
DOWNARROW &" "& FORMAT(ABS(Diff),"0.0%"))
```

#### Rolling 4 Qtr S3 Covx>2x #

```dax
var cnt = 
 CALCULATE(
                COUNTROWS(
                    FILTER(
                        SUMMARIZECOLUMNS(
                            'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */,
                            "attn", [S3+ Cov R4Q w/o x]
                        ),
                        [attn] >= 2.0
                    )
                ),
                'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
                'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place",
                'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
                'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
                'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
                'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
                REMOVEFILTERS('Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */)
                
            )

    RETURN
    IF ( cnt = 0, BLANK (), cnt )
```

#### Rolling 4 Qtr S3 Covx>2x %

```dax
DIVIDE([Rolling 4 Qtr S3 Covx>2x #],[AE IN SEAT],BLANK())
```

#### Rolling 4 Qtr S3 Covx>2x Comp

```dax
IF(
  NOT(ISBLANK([Rolling 4 Qtr S3 Covx>2x %])),
    
    FORMAT([Rolling 4 Qtr S3 Covx>2x %], "0%") & UNICHAR(10) &"("& FORMAT([Rolling 4 Qtr S3 Covx>2x #], "#,##0")&")"
)
```

#### Rolling 4 Start #

```dax
var cnt = CALCULATE(
                COUNTROWS(
                    FILTER(
                        SUMMARIZECOLUMNS(
                            'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */,
                            "attn", [S3+ Cov R4Q w/o snap]
                        ),
                        [attn] >= 2.0
                    )
                ),
                'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
                'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place",
                'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
                'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
                'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
                'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
                REMOVEFILTERS('Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */)
                
            )

return IF ( cnt = 0, BLANK (), cnt )
```

#### Rolling 4 Start %

```dax
DIVIDE([Rolling 4 Start #],[AE IN SEAT],BLANK())
```

#### S3 Q+1 CovX (Numeric) w/o snap

```dax
ROUND(
        CALCULATE(
            [COVERAGE PIPE / TARGET LEFT TO GO X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1
        ),
    1
    )
```

#### S3+ Cov CY w/o x

```dax
VAR s = 
    ROUND(
        CALCULATE(
            [COVERAGE PIPE / TARGET LEFT TO GO X],
            'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0
        ),
    1
    )
RETURN s
```

#### S3+ Cov R4Q w/o snap

```dax
VAR s = 
    ROUND(
        CALCULATE(
            [COVERAGE PIPE / TARGET LEFT TO GO X],
            'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ IN {0,1,2,3}
        ),
    1
    )
RETURN IF(HASONEVALUE('Deal Band'[Deal_Band param] /* DB: dataset:Deal_Band.Deal_Band param */), BLANK(), s)
```

#### Sub Tier 1 Completion >100 #

```dax
var cnt = 
 CALCULATE(
                COUNTROWS(
                    FILTER(
                        SUMMARIZECOLUMNS(
                            'Region Hierarchy'[REP_LDAP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP */,
                            "attn", [FP Tier 1 Sub Complete %]
                        ),
                        [attn] >= 1.0
                    )
                ),
                'Region Hierarchy'[IS_TRUE_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP */ = 1,
                'Region Hierarchy'[REP_IN_PLACE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_IN_PLACE */ = "In Place",
                'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "ACTIVE",
                'Region Hierarchy'[IS_CYQUOTA_AVAILABLE] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_CYQUOTA_AVAILABLE */ = TRUE,
                'Region Hierarchy'[AREA] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AREA */ IN { "DX", "DX/DME" },
                'Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */ = "Quota",
                REMOVEFILTERS('Target Type'[TARGET_TYPE] /* DB: vw_TD_EBI_TARGET_TYPE.TARGET_TYPE */)
                
            )

    RETURN
    IF ( cnt = 0, BLANK (), cnt )
```

#### Sub Tier 1 Completion >100 %

```dax
DIVIDE([Sub Tier 1 Completion >100 #],[AE IN SEAT],BLANK())
```

#### Sub Tier 1 Completion >100 Comp

```dax
IF(
  NOT(ISBLANK([Sub Tier 1 Completion >100 %])),
    
    FORMAT([Sub Tier 1 Completion >100 %], "0%") & UNICHAR(10) &"("& FORMAT([Sub Tier 1 Completion >100 #], "#,##0")&")"
)
```

#### first rep

```dax
MAX('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */)
```

### OCC_Perf_L3 (25 measures)

#### % Parent Tier 1 Account with no Pipe

```dax
--BLANK()
--CALCULATE([Parent Tier 1 with No Pipe],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=0)
var dr = CALCULATE(DISTINCTCOUNT(TPT[ACCOUNT_PRNT_ID]),'Region Hierarchy'[REP_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_ID */ <> -1,
        'Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */ = "Active",
        'TPT Metadata'[CLEANED_PARENT_TIER] /* DB: dataset:TPT_Metadata.CLEANED_PARENT_TIER */ = "Tier 1")
        
var result = DIVIDE([Parent Tier 1 with No Pipe],dr,BLANK())
--var result = [Parent Tier 1 with No Pipe]
Return result
```

#### % deals missing BANT (#)

```dax
var pipe = CALCULATE([OCC_Deal Count Cov],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ in {0,1})
var miss_bant = CALCULATE([OCC_Deal Count Cov],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ in {0,1},Opportunity[Missing BANT]="Missing BANT")
return DIVIDE(miss_bant,pipe,BLANK())
```

#### % deals missing BANT ($)

```dax
var pipe = CALCULATE([PIPE $],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ in {0,1})
var miss_bant = CALCULATE([PIPE $],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ in {0,1},Opportunity[Missing BANT]="Missing BANT")
return DIVIDE(miss_bant,pipe,BLANK())
```

#### % deals next steps update >14 (#)

```dax
var pipe = CALCULATE([OCC_Deal Count Cov],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1)
var nxt_mod = CALCULATE([OCC_Deal Count Cov],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,Opportunity[DAYS_SINCE_NEXT_STEPS_MODIFIED]>14)
return --pipe
DIVIDE(nxt_mod,pipe,BLANK())
```

#### % deals next steps update >14 ($)

```dax
var pipe = CALCULATE([PIPE $],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1)
var nxt_mod = CALCULATE([PIPE $],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,Opportunity[DAYS_SINCE_NEXT_STEPS_MODIFIED]>14)
return --pipe
DIVIDE(nxt_mod,pipe,BLANK())
```

#### % deals not reviewed (#)

```dax
var pipe = CALCULATE([OCC_Deal Count Cov],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ in {0,1})
var not_rev = CALCULATE([OCC_Deal Count Cov],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ in {0,1},Opportunity[OCC_Deal Not Reviewed]="Deal Not Reviewed")
return DIVIDE(not_rev,pipe,BLANK())
```

#### % deals not reviewed ($)

```dax
var pipe = CALCULATE([PIPE $],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ in {0,1})
var not_rev = CALCULATE([PIPE $],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ in {0,1},Opportunity[OCC_Deal Not Reviewed]="Deal Not Reviewed")
return DIVIDE(not_rev,pipe,BLANK())
```

#### CQ Created

```dax
CALCULATE([GROSS CREATED QTD $], 'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = 0)
```

#### CQ Creation Target

```dax
CALCULATE([GROSS CREATION QTD], 'Qualification Quarter'[QUALIFICATION_QTR_BKT] /* DB: vw_EBI_Caldate.QUALIFICATION_QTR_BKT */ = 0)
```

#### CQ Quota

```dax
CALCULATE([BOOKINGS TARGET],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=0)
```

#### CQ+1 Stalled % (#)

```dax
var pipe = CALCULATE([OCC_Deal Count Cov],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1)
var stall = CALCULATE([OCC_Deal Count Cov],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = 1,Pipeline[STALLED_BUT_INACTIVE]="Stalled & Inactive")
return DIVIDE(stall,pipe,BLANK())
```

#### CQ-1 Quota

```dax
CALCULATE([BOOKINGS TARGET],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=-1)
```

#### CQ-1 Won $

```dax
CALCULATE([WON $], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -1)
```

#### CQ-2 Quota

```dax
CALCULATE([BOOKINGS TARGET],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=-2)
```

#### CQ-2 Won $

```dax
CALCULATE([WON $], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -2)
```

#### CQ-3 Quota

```dax
CALCULATE([BOOKINGS TARGET],'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=-3)
```

#### CQ-3 Won $

```dax
CALCULATE([WON $], 'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */ = -3)
```

#### Dynamic Drillthrough page_name

```dax
VAR RepName = MAX('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */)
VAR Drill =
    CALCULATE(
        MAX('OCC_Performance Cohort_Band'[Page Name]),
        'OCC_Performance Cohort_Band'[REP_NAME] = RepName
    )
RETURN
Drill
```

#### FLM Participation QTD Comp_L3

```dax
VAR Reps75 = [FLM PART @75% QTD #]

VAR AllReps = [FLM COUNT]

RETURN "(" & FORMAT(Reps75,"#") & "/" & 
FORMAT(AllReps,"#") & ")"
```

#### FLM Participation YTD Comp_L3

```dax
VAR Reps75 = [FLM PART @75% YTD #]

VAR AllReps = [FLM COUNT]

RETURN "(" & FORMAT(Reps75,"#") & "/" & 
FORMAT(AllReps,"#") & ")"
```

#### FP AE >75 QTD

```dax
CALCULATE([AE TOTAL],FILTER(
        'Region Hierarchy',
        'Region Hierarchy'[REGION_ID] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REGION_ID */ IN VALUES(Quota[REGION_ID])
        && [CQ MANAGER FORECAST % WoW]>=0.75
    )
)
```

#### Not rev

```dax
CALCULATE([PIPE $],Opportunity[OCC_Deal Not Reviewed]="Deal Not Reviewed")
```

#### Quarter_Callout

```dax
"CQ: " & CALCULATE(MAX('Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */),ALL('Close Quarter'),'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=0) & ", CQ+1: " & CALCULATE(MAX('Close Quarter'[CLOSE_QTR] /* DB: vw_EBI_Caldate.FISCAL_YR_AND_QTR_DESC */),ALL('Close Quarter'),'Close Quarter'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.QTR_BKT_IND */=1)
```

#### Rep Participation QTD Comp_L3

```dax
VAR Reps75 = [AE PART @75% QTD #]

VAR AllReps = [AE IN SEAT]

RETURN 
"(" & FORMAT(Reps75,"#") & "/" & 
FORMAT(AllReps,"#") & ")"
```

#### Rep Participation YTD Comp_L3

```dax
VAR Reps75 = [AE PART @75% YTD #]

VAR AllReps = [AE IN SEAT]


RETURN 
"(" & FORMAT(Reps75,"#") & "/" & 
FORMAT(AllReps,"#") & ")"
```

### Region Hierarchy (4 measures)

#### BOQ OVERALLSCORE(A+B+C+D)FLM

```dax
EXTERNALMEASURE("BOQ OVERALLSCORE(A+B+C+D)FLM", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### BOQ OVERALLSCORE(A+B+C+D)REP

```dax
EXTERNALMEASURE("BOQ OVERALLSCORE(A+B+C+D)REP", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### OVERALL SCORE(A+B+C+D)REP

```dax
EXTERNALMEASURE("OVERALL SCORE(A+B+C+D)REP", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

#### OVERALLSCORE(A+B+C+D)FLM

```dax
EXTERNALMEASURE("OVERALLSCORE(A+B+C+D)FLM", DOUBLE, "DirectQuery to AS - RTB DataVerse")
```

### Rep Performance Table (2 measures)

#### Measure CF Rep_perf

```dax
// VAR _green = "#11A25F"
// VAR _yellow = "#CE9905"
// VAR _red = "#E74B3A"
// VAR AESeat = [AE IN SEAT]
// VAR sel = SELECTEDVALUE('Rep Performance Table'[KPI ID], 1)
 
// VAR result =
//     SWITCH(sel,
// 		2,
//             SWITCH(TRUE(),
//                 DIVIDE(AESeat,[FP AE Total],BLANK()) >= 0.9, _green,
//                 DIVIDE(AESeat,[FP AE Total],BLANK()) >= 0.8, _yellow,
//                 _red
//             ),
//         3,
//             SWITCH(TRUE(),
//                 DIVIDE([Rep CY Projection #],AESeat,BLANK()) >= 0.5, _green,
//                 DIVIDE([Rep CY Projection #],AESeat,BLANK()) >= 0.4, _yellow,
//                 _red
//             ),
// 		4,
//             SWITCH(TRUE(),
//                 DIVIDE([AE PART @75% YTD #],AESeat,BLANK()) >= 0.5, _green,
//                 DIVIDE([AE PART @75% YTD #],AESeat,BLANK()) >= 0.4, _yellow,
//                 _red
//             ),
//         5,
//             SWITCH(TRUE(),
//                 DIVIDE([AE PART @75% QTD #],AESeat,BLANK()) >= 0.5, _green,
//                 DIVIDE([AE PART @75% QTD #],AESeat,BLANK()) >= 0.4, _yellow,
//                 _red
//             ),
// 		9,
//             SWITCH(TRUE(),
//                 DIVIDE([CQ Pipe Gen @75% YTD #],AESeat,BLANK()) >= 0.5, _green,
//                 DIVIDE([CQ Pipe Gen @75% YTD #],AESeat,BLANK()) >= 0.4, _yellow,
//                 _red
//             ),
//         10,
//             SWITCH(TRUE(),
//                 DIVIDE([CQ Pipe Gen @75% QTD #],AESeat,BLANK()) >= 0.5, _green,
//                 DIVIDE([CQ Pipe Gen @75% QTD #],AESeat,BLANK()) >= 0.4, _yellow,
//                 _red
//             ),
// 		11,
//             SWITCH(TRUE(),
//                 DIVIDE([Q+1 Pipe Covx>2.7 #],AESeat,BLANK()) >= 0.5, _green,
//                 DIVIDE([Q+1 Pipe Covx>2.7 #],AESeat,BLANK()) >= 0.4, _yellow,
//                 _red
//             ),
// 		12,
//             SWITCH(TRUE(),
//                 DIVIDE([Q+1 Mature Covx>1.2 #],AESeat,BLANK()) >= 0.5, _green,
//                 DIVIDE([Q+1 Mature Covx>1.2 #],AESeat,BLANK()) >= 0.4, _yellow,
//                 _red
//             ),
// 		13,
//             SWITCH(TRUE(),
//                 DIVIDE([Rolling 4 Qtr S3 Covx>2x #],AESeat,BLANK()) >= 0.5, _green,
//                 DIVIDE([Rolling 4 Qtr S3 Covx>2x #],AESeat,BLANK()) >= 0.4, _yellow,
//                 _red
//             ),
// 		14,
//             SWITCH(TRUE(),
//                 DIVIDE([CY Cov>2x #],AESeat,BLANK()) >= 0.5, _green,
//                 DIVIDE([CY Cov>2x #],AESeat,BLANK()) >= 0.4, _yellow,
//                 _red
//             )
//     )
 
// RETURN result

VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"
VAR AESeat = [AE IN SEAT]
VAR sel = SELECTEDVALUE('Rep Performance Table'[KPI ID], 1)
 
VAR numerator =
   SWITCH(sel,
       2, [FP AE Total],
       3, [Rep CY Projection #],
       4, [AE PART @75% YTD #],
       5, [AE PART @75% QTD #],
       9, [CQ Pipe Gen @75% YTD #],
       10, [CQ Pipe Gen @75% QTD #],
       11, [Q+1 Pipe Covx>2.7 #],
       12, [Q+1 Mature Covx>1.2 #],
       13, [Rolling 4 Qtr S3 Covx>2x #],
       14, [CY Cov>2x #],
       BLANK()
   )
 
VAR ratio = IF(sel=2,DIVIDE(AESeat, [FP AE Total], BLANK()),DIVIDE(numerator, AESeat, BLANK()))
 
VAR result =
   IF(
       ISBLANK(ratio),
       BLANK(),
       SWITCH(
           TRUE(),
           ratio >= 0.9 && sel = 2, _green,
           ratio >= 0.8 && sel = 2, _yellow,
           ratio >= 0.5 && sel <> 2, _green,
           ratio >= 0.4 && sel <> 2, _yellow,
           _red
       )
   )
 
RETURN result
```

#### OCC_Rep Performance Measure

```dax
VAR AESeat = [AE IN SEAT]
VAR SelectedKPI = SELECTEDVALUE('Rep Performance Table'[KPI ID])
Var SelectedToggle = SELECTEDVALUE('Performance Toggle'[Toggle Name])
RETURN
SWITCH(SelectedToggle,"%",

SWITCH(
    SelectedKPI,
    // 1. Total HC
    1,[FP AE Total],
    // 2. AE in Seat
    2,DIVIDE([FP AE in seat],[FP AE Total],BLANK()),
    // 3. Rep CY Projection ≥ 75%
    3,DIVIDE([Rep CY Projection #],AESeat,BLANK()),
    // 4. AE PART @75% YTD
    4,DIVIDE([AE PART @75% YTD #],AESeat,BLANK()),
    // 5. AE PART @75% QTD
    5,DIVIDE([AE PART @75% QTD #],AESeat,BLANK()),
    // 6. AE PART 50–75% QTD
    6,DIVIDE([AE PART 50_75% QTD #],AESeat,BLANK()),
    // 7. AE PART 25–50% QTD
    7,DIVIDE([AE PART 25_50% QTD #],AESeat,BLANK()),
    // 8. AE PART <25% QTD
    8,DIVIDE([AE PART <25% QTD #],AESeat,BLANK()),
    // 9. CQ Pipe Gen @75% YTD
    9,DIVIDE([CQ Pipe Gen @75% YTD #],AESeat,BLANK()),
    // 10. CQ Pipe Gen @75% QTD
    10,DIVIDE([CQ Pipe Gen @75% QTD #],AESeat,BLANK()),
    // 11. Q+1 Pipe Covx > 2.7
    11,DIVIDE([Q+1 Pipe Covx>2.7 #],AESeat,BLANK()),
    // 12. Q+1 Mature Covx > 1.2
    12,DIVIDE([Q+1 Mature Covx>1.2 #],AESeat,BLANK()),
    // 13. Rolling 4 Qtr S3 Covx > 2x
    13,DIVIDE([Rolling 4 Qtr S3 Covx>2x #],AESeat,BLANK()),
    // 14. CY Cov > 2x
    14,DIVIDE([CY Cov>2x #],AESeat,BLANK()),
    // 15. Parent Tier 1 Completion > 100%
    15,DIVIDE([Parent Tier 1 Completion >100 #],AESeat,BLANK()),
    // 16. Sub Tier 1 Completion > 100%
    16,DIVIDE([Sub Tier 1 Completion >100 #],AESeat,BLANK()),

    BLANK()
)

,"#",

SWITCH(
    SelectedKPI,
    // 1. Total HC
    1,[FP AE Total],
    // 2. AE in Seat
    2,[FP AE in seat],
    // 3. Rep CY Projection ≥ 75%
    3,[Rep CY Projection #],
    // 4. AE PART @75% YTD
    4,[AE PART @75% YTD #],
    // 5. AE PART @75% QTD
    5,[AE PART @75% QTD #],
    // 6. AE PART 50–75% QTD
    6,[AE PART 50_75% QTD #],
    // 7. AE PART 25–50% QTD
    7,[AE PART 25_50% QTD #],
    // 8. AE PART <25% QTD
    8,[AE PART <25% QTD #],
    // 9. CQ Pipe Gen @75% YTD
    9,[CQ Pipe Gen @75% YTD #],
    // 10. CQ Pipe Gen @75% QTD
    10,[CQ Pipe Gen @75% QTD #],
    // 11. Q+1 Pipe Covx > 2.7
    11,[Q+1 Pipe Covx>2.7 #],
    // 12. Q+1 Mature Covx > 1.2
    12,[Q+1 Mature Covx>1.2 #],
    // 13. Rolling 4 Qtr S3 Covx > 2x
    13,[Rolling 4 Qtr S3 Covx>2x #],
    // 14. CY Cov > 2x
    14,[CY Cov>2x #],
    // 15. Parent Tier 1 Completion > 100%
    15,[Parent Tier 1 Completion >100 #],
    // 16. Sub Tier 1 Completion > 100%
    16,[Sub Tier 1 Completion >100 #],

    BLANK()
)
)
```

### Rep Performance Table L3 (2 measures)

#### Measure CF Rep_perf_L3

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"
VAR AESeat = [AE IN SEAT]
VAR sel = SELECTEDVALUE('Rep Performance Table L3'[KPI ID], 1)
 
VAR result =
   SWITCH(sel,
            1, 
                SWITCH(TRUE(),
                    [VP CY Projection %]>=0.75, _green,
                    [VP CY Projection %]>=0.25, _yellow,
                    _red
                ),
            2, 
                SWITCH(TRUE(),
                    [YTD PROJECTION % OCC]>=0.75, _green,
                    [YTD PROJECTION % OCC]>=0.25, _yellow,
                    _red
                ),
            3, 
                SWITCH(TRUE(),
                    [CQ MANAGER FORECAST %]>=0.75, _green,
                    [CQ MANAGER FORECAST %]>=0.25, _yellow,
                    _red
                ),
            12, 
                SWITCH(TRUE(),
                    [GROSS CREATED YTD %]>=1, _green,
                    [GROSS CREATED YTD %]>=0.5, _yellow,
                    _red
                ),
            13, 
                SWITCH(TRUE(),
                    [Gross Creation_L3]>=1, _green,
                    [Gross Creation_L3]>=0.5, _yellow,
                    _red
                ),
            16, 
                SWITCH(TRUE(),
                    [S3 Q+1 CovX (Numeric) w/o snap]>= 2.5, _green,
                    [S3 Q+1 CovX (Numeric) w/o snap]>=2.0, _yellow,
                    _red
                ),
            17, 
                SWITCH(TRUE(),
                    [Mature Pipe SS5+ (Q+1) numeric w/o snap]>1.2, _green,
                    [Mature Pipe SS5+ (Q+1) numeric w/o snap]>=0.9, _yellow,
                    _red
                ),
            BLANK()
   )
  
RETURN result
```

#### OCC_Rep Performance Measure L3

```dax
VAR SelectedKPI = SELECTEDVALUE('Rep Performance Table L3'[KPI ID])
RETURN
SWITCH(
    SelectedKPI,
    // 1. CY Projection > 75%
    1,[VP CY Projection %],
    // 2. YTD Attain %
    2,[YTD PROJECTION % OCC],
    // 3. CQ Attain %
    3,[CQ MANAGER FORECAST %],
    // 4. CQ Quota
    4,[CQ Quota]/1000000,
    // 5. CQ-1 Quota
    5,[CQ-1 Quota]/1000000,
    // 6. CQ-2 Quota
    6,[CQ-2 Quota]/1000000,
    // 7. CQ-3 Quota
    7,[CQ-3 Quota]/1000000,
    // 8. CQ WFUC
    8,[CQ W+F+UC $]/1000000,
    // 9. CQ-1 W
    9,[CQ-1 Won $]/1000000,
    // 10. CQ-2 W
    10,[CQ-2 Won $]/1000000,
    // 11. CQ-3 W
    11,[CQ-3 Won $]/1000000,
    // 12. YTD Pipe Gen Attain %
    12,[Gross Creation YTD_L3],
    // 13. CQ Pipe Gen QTD Attain %
    13,[Gross Creation_L3],
    // 14. CQ Creation Target
    14,[CQ Creation Target]/1000000,
    // 15. CQ Created
    15,[CQ Created]/1000000,
    // 16. CQ+1 Total Pipe Covx
    16,[S3 Q+1 CovX (Numeric) w/o snap],
    // 17. CQ+1 Mature Covx
    17,[Mature Pipe SS5+ (Q+1) numeric w/o snap],
    // 18. Rolling 4 Qtr S3 Covx
    18,[S3+ Cov R4Q w/o snap],
    // 19. CY Covx
    19,[S3+ Cov CY w/o x],
    // 20. Parent Tier 1 Completion %
    20,[FP Tier 1 Parent Complete %],
    // 21. Sub Tier 1 Completion %
    21,[FP Tier 1 Sub Complete %],
    // 22. Cohort
    22,[Cohort],
    // 23. Action Path
    23,[Action Path],
    // 24. % Tier 1 Account with No Pipe (#)
    24,[% Parent Tier 1 Account with no Pipe],
    // 25. % deals next steps update >14 ($)
    25,[% deals next steps update >14 ($)],
    // 26. % deals not reviewed ($)
    26,[% deals not reviewed ($)],
    // 27. % deals missing BANT ($)
    27,[% deals missing BANT ($)],
    // 28. CQ+1 Stalled % ($)
    28,[CQ + 1 STALLED %],
    // 29. Total Deals #
    29,BLANK(),
    // 30. % deals next steps update >14 (#)
    30,BLANK(),
    // 31. % deals not reviewed (#)
    31,BLANK(),
    // 32.% deals missing BANT (#)
    32,BLANK(),
    // 33.CQ+1 Stalled % (#)
    33,BLANK(),
    34,[FP AE in seat],
    BLANK()
)
```

### SBR Measure Table (7 measures)

#### Account Activity # _SBR

```dax
CALCULATE(
    '_Account Activity Measures'[ACCOUNT ACTIVITY #],
    FILTER(
        'Account Activities Metadata',
        'Account Activities Metadata'[ACTIVITY_TYPE] = "SBR"
    ),
    ALL('OPG'[BU] /* DB: vw_EBI_OPG.BU */),
    ALL(OPG)
)
```

#### Exec_summary

```dax
VAR SelectedAccount = SELECTEDVALUE('Account Activities Metadata'[ACTIVITY_KEY])
VAR SelectedSolution = SELECTEDVALUE(Opportunity[CREATED_BY])
RETURN
  IF(
    NOT(ISBLANK(SelectedAccount)) ,
    MIN('Account Activities Metadata'[EXEC_SUMMARY]),
    "Select a Row from the table to populate"
)
```

#### SBR Completion

```dax
VAR A =
CALCULATE (
    '_Account Activity Measures'[ACCOUNT ACTIVITY #],
    FILTER (
        'Account Activities Metadata',
        'Account Activities Metadata'[ACTIVITY_STATUS] = "Complete"
    ),
    FILTER (
        'Account Activities Metadata',
        'Account Activities Metadata'[ACTIVITY_TYPE] = "SBR"
    ),
    ALL ( OPG ),
    --'Account Activities'[rep_flag] /* DB: dataset:Account_Activities.rep_flag */ = 1,
     --'Delivery Quarter'[DELIVERY_QTR_BKT] /* DB: vw_EBI_Caldate.DELIVERY_QTR_BKT */=0,
     --ALL('Delivery Quarter'),
    ALL('Close Quarter')
)

RETURN COALESCE(A,0)
```

#### SBR In-Progress

```dax
VAR A = CALCULATE (
    '_Account Activity Measures'[ACCOUNT ACTIVITY #],
    FILTER (
        'Account Activities Metadata',
        'Account Activities Metadata'[ACTIVITY_STATUS] IN {"In Progress"}
    ),
    FILTER (
        'Account Activities Metadata',
        'Account Activities Metadata'[ACTIVITY_TYPE] = "SBR"
    ),
    ALL ( OPG )
    ---'Account Activities'[rep_flag] /* DB: dataset:Account_Activities.rep_flag */ = 1
)

RETURN COALESCE(A,0)
```

#### SBR Past Due

```dax
VAR A = CALCULATE (
    '_Account Activity Measures'[ACCOUNT ACTIVITY #],
    FILTER (
        'Account Activities Metadata',
        'Account Activities Metadata'[ACTIVITY_STATUS] IN {"In Progress","Not Started"} 
    ),
    FILTER (
        'Account Activities Metadata',
        'Account Activities Metadata'[ACTIVITY_TYPE] = "SBR"
    ),
    FILTER (
        'Delivery Quarter',
        'Delivery Quarter'[DELIVERY_DATE] /* DB: vw_EBI_Caldate.DELIVERY_DATE */ < TODAY()
    ),
    ALL ( OPG )
    ---,    'Account Activities'[rep_flag] /* DB: dataset:Account_Activities.rep_flag */ = 1
)

RETURN COALESCE(A,0)
```

#### SBR Planned

```dax
VAR A = CALCULATE (
    '_Account Activity Measures'[ACCOUNT ACTIVITY #],
    FILTER (
        'Account Activities Metadata',
        'Account Activities Metadata'[ACTIVITY_STATUS] IN {"In Progress","Not Started"}
    ),
    FILTER (
        'Account Activities Metadata',
        'Account Activities Metadata'[ACTIVITY_TYPE] = "SBR"
    ),
    ALL ( OPG )
    ---,'Account Activities'[rep_flag] /* DB: dataset:Account_Activities.rep_flag */ = 1
)

RETURN COALESCE(A,0)
```

#### SBR not started

```dax
VAR A = CALCULATE (
    '_Account Activity Measures'[ACCOUNT ACTIVITY #],
    FILTER (
        'Account Activities Metadata',
        'Account Activities Metadata'[ACTIVITY_STATUS] IN {"Not Started"}
    ),
    FILTER (
        'Account Activities Metadata',
        'Account Activities Metadata'[ACTIVITY_TYPE] = "SBR"
    ),
    ALL ( OPG )
    --'Account Activities'[rep_flag] /* DB: dataset:Account_Activities.rep_flag */ = 1
)

RETURN COALESCE(A,0)
```

### SLM Performance Table (1 measures)

#### OCC_SLM Performance Measure

```dax
VAR SLMCount = CALCULATE(DISTINCTCOUNT('OCC_Performance Cohort SLM_Band'[SLM_LDAP]))
VAR SelectedKPI = SELECTEDVALUE('SLM Performance Table'[KPI ID])
Var SelectedToggle = SELECTEDVALUE('Performance Toggle'[Toggle Name])
RETURN
SWITCH(SelectedToggle,"%",

SWITCH(
    SelectedKPI,
    // 1. Total HC
    1,SLMCount,
    // 2. YTD Team Part. >50%
    2,DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[SLM Team Part YTD >50])),SLMCount,BLANK()),
    // 3. YTD Attain >75%
    3,DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[YTD Attain >75])),SLMCount,BLANK()),
    // 4. CQ Team Part. >50%
    4,DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[SLM Team Part QTD >50])),SLMCount,BLANK()),
    // 5. CQ Attain >75%
    5,DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[QTD Attain >75])),SLMCount,BLANK()),
    // 6. CQ >50% & <75%
    6,DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[QTD Attain >50 & <75])),SLMCount,BLANK()),
    // 7. CQ >25% & <50%
    7,DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[QTD Attain >25 & <50])),SLMCount,BLANK()),
    // 8. CQ <25%
    8,DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[QTD Attain >0 & <25])),SLMCount,BLANK()),
    // 9. YTD Pipe Gen >75%
    9,DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[YTD Pipe Gen >75])),SLMCount,BLANK()),
    // 10. QTD >75%
    10,DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[QTD Pipe Gen >75])),SLMCount,BLANK()),
    // 11. Q+1 Pipe Covx > 2.7
    11,DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[Q+1 Covx >2.7])),SLMCount,BLANK()),
    // 12. Q+1 Mature Covx > 1.2
    12,DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[Q+1 Mat Covx >1.2])),SLMCount,BLANK()),
    // 13. Rolling 4 Qtr S3 Covx > 2x
    13,DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[Rolling 4 Covx >2])),SLMCount,BLANK()),
    // 14. CY Cov > 2x
    14,DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[CY Covx >2])),SLMCount,BLANK()),
    // 15. Parent Tier 1 Completion > 100%
    15,DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[Parent Tier 1 100])),SLMCount,BLANK()),
    // 16. Sub Tier 1 Completion > 100%
    16,DIVIDE(CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[Parent Tier 1 100])),SLMCount,BLANK()),

    BLANK()
)

,"#",

SWITCH(
    SelectedKPI,
    // 1. Total HC
    1,SLMCount,
    // 2. YTD Team Part. >50%
    2,CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[SLM Team Part YTD >50])),
    // 3. YTD Attain >75%
    3,CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[YTD Attain >75])),
    // 4. CQ Team Part. >50%
    4,CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[SLM Team Part QTD >50])),
    // 5. CQ Attain >75%
    5,CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[QTD Attain >75])),
    // 6. CQ >50% & <75%
    6,CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[QTD Attain >50 & <75])),
    // 7. CQ >25% & <50%
    7,CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[QTD Attain >25 & <50])),
    // 8. CQ <25%
    8,CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[QTD Attain >0 & <25])),
    // 9. YTD Pipe Gen >75%
    9,CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[YTD Pipe Gen >75])),
    // 10. QTD >75%
    10,CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[QTD Pipe Gen >75])),
    // 11. Q+1 Pipe Covx > 2.7
    11,CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[Q+1 Covx >2.7])),
    // 12. Q+1 Mature Covx > 1.2
    12,CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[Q+1 Mat Covx >1.2])),
    // 13. Rolling 4 Qtr S3 Covx > 2x
    13,CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[Rolling 4 Covx >2])),
    // 14. CY Cov > 2x
    14,CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[CY Covx >2])),
    // 15. Parent Tier 1 Completion > 100%
    15,CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[Parent Tier 1 100])),
    // 16. Sub Tier 1 Completion > 100%
    16,CALCULATE(SUM('OCC_Performance Cohort SLM_Band'[Sub Tier 1 100])),

    BLANK()
)
)
```

### Snapshot Quarter (1 measures)

#### Last Data Refresh

```dax
EXTERNALMEASURE("Last Data Refresh", STRING, "DirectQuery to AS - RTB DataVerse")
```

### dim_param_vp (4 measures)

#### Masking param_measure_vp

```dax
VAR _user = USERPRINCIPALNAME()
VAR _param = [param_measure_vp]
VAR Cond1 = 
IF(
        (
        (ISINSCOPE('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */) ||   ISFILTERED('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */)) 
        && MAX('Region Hierarchy'[IS_GERMANY_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_GERMANY_FLM */)=1
        ) 
        ||
        (
        (ISINSCOPE('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */) ||  ISFILTERED('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */)) 
        && MAX('Region Hierarchy'[IS_GERMANY_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_GERMANY_REP */)=1
        )
    , BLANK(),
    _param
    )

VAR Cond2 = 
    IF(
     NOT ( _user  IN VALUES('Masking Users'[USER_EMAIL] /* DB: dataset:Masking_Users.USER_EMAIL */) )  &&
    MAX('Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */)="EMEA" &&
    (
    (ISFILTERED('Region Hierarchy'[FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.FLM */) && MAX('Region Hierarchy'[IS_GERMANY_FLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_GERMANY_FLM */)) ||
    (ISFILTERED('Region Hierarchy'[SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SLM */) && MAX('Region Hierarchy'[IS_GERMANY_SLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_GERMANY_SLM */)) ||
    (ISFILTERED('Region Hierarchy'[TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.TLM */) && MAX('Region Hierarchy'[IS_GERMANY_TLM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_GERMANY_TLM */)) ||
    (ISFILTERED('Region Hierarchy'[REP_NAME] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_NAME */) && MAX('Region Hierarchy'[IS_GERMANY_REP] /* DB: vw_TD_EBI_REGION_RPT_MASKED.IS_GERMANY_REP */))
    ), 
    BLANK(),
    _param
    )

RETURN 
    IF(_user in { "taliyan@adobe.com", "joostavp@adobe.com" } , Cond1, Cond2)
```

#### Measure CF LP

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"
VAR sel = SELECTEDVALUE(dim_param_vp[Level2])
 
VAR result =
    SWITCH(sel,
        "GNARR %",
            SWITCH(TRUE(),
                [FP W+F+UC%] >= 0.75, _green,
                [FP W+F+UC%] >= 0.25, _yellow,
                _red
            ),
        "GNARR % YTD",
            SWITCH(TRUE(),
                [PERFORMANCE YTD %] >= 0.75, _green,
                [PERFORMANCE YTD %] >= 0.25, _yellow,
                _red
            ),
 
        "S3+ (F+U) LTG Cov",
            SWITCH(TRUE(),
                [S3+(F+U) LTG Cov] > 1, _green,
                [S3+(F+U) LTG Cov] >= 0.8, _yellow,
                _red
            ),
 
        "S5+ (F+U) LTG Cov",
            SWITCH(TRUE(),
                [S5+(F+U) LTG Cov] > 1.2, _green,
                [S5+(F+U) LTG Cov] >= 0.9, _yellow,
                _red
            ),
 
        "CQ Attrition OL %",
         SWITCH(TRUE(),
                [CQ Attrition %] >= 1, _green,
                _red
            ),

        "Attrition OL %",
            SWITCH(TRUE(),
                [CQ Attrition %] >= 1, _green,
                _red
            ),
        "Attrition YTD OL %",
         SWITCH(TRUE(),
                [YTD Attrition%] >= 1, _green,
                _red
            ),
        "Attrition % YTD",
         SWITCH(TRUE(),
                [YTD Attrition%] >= 1, _green,
                _red
            ),
 
        "Net OL %",
            SWITCH(TRUE(),
                [CQ Net% Plan] >= 1, _green,
                [CQ Net% Plan] >= 0.85, _yellow,
                _red
            ),
 
        "S3+ Covx Q+1",
            SWITCH(TRUE(),
                [S3 Q+1 Cov] >= 2.5, _green,
                [S3 Q+1 Cov] >= 2.0, _yellow,
                _red
            ),
 
        "S3+ Covx Q+2",
            SWITCH(TRUE(),
                [S3 Q+2 Cov] > 1, _green,
                [S3 Q+2 Cov] >= 0.8, _yellow,
                _red
            ),
 
        "S3+ Covx R4Q",
            SWITCH(TRUE(),
                [S3+ Cov R4Q w/o x] > 1, _green,
                [S3+ Cov R4Q w/o x] >= 0.8, _yellow,
                _red
            ),
 
        "S5+ Covx Q+1",
            SWITCH(TRUE(),
                [S5+ (Q+1) Cov] > 1.2, _green,
                [S5+ (Q+1) Cov] >= 0.9, _yellow,
                _red
            ),
 
        "S5+ Covx Q+2",
            SWITCH(TRUE(),
                [S5+ (Q+2) Cov] > 1.2, _green,
                [S5+ (Q+2) Cov] >= 0.9, _yellow,
                _red
            ),
 
        "S5+ Covx R4Q",
            SWITCH(TRUE(),
                [S5+ R4Q Cov] > 1.2, _green,
                [S5+ R4Q Cov] >= 0.9, _yellow,
                _red
            ),
 
        "Gross Creation QTD %",
            SWITCH(TRUE(),
                [LP GROSS CREATION QTD %] >= 1, _green,
                [LP GROSS CREATION QTD %] >= 0.5, _yellow,
                _red
            ),
 
        "Gross Creation YTD %",
            SWITCH(TRUE(),
                [LP GROSS CREATED YTD %] >= 1, _green,
                [LP GROSS CREATED YTD %] >= 0.5, _yellow,
                _red
            ),
 
        "Rep Participation QTD",
            SWITCH(TRUE(),
                [Rep Participation QTD] >= 0.5, _green,
                [Rep Participation QTD] >= 0.4, _yellow,
                _red
            ),
 
        "Rep Participation YTD",
            SWITCH(TRUE(),
                [Rep Participation YTD] >= 0.5, _green,
                [Rep Participation YTD] >= 0.4, _yellow,
                _red
            ),
 
        "FLM Participation QTD",
            SWITCH(TRUE(),
                [FLM Participation QTD] >= 0.5, _green,
                [FLM Participation QTD] >= 0.4, _yellow,
                _red
            ),
 
        "FLM Participation YTD",
            SWITCH(TRUE(),
                [FLM Participation YTD] >= 0.5, _green,
                [FLM Participation YTD] >= 0.4, _yellow,
                _red
            ),
 
        "% Green Sol Health", _green,
        "% Yellow Sol Health", _yellow,
        "% Red Sol Health", _red,
 
        "% Green Accnt Health", _green,
        "% Red Accnt Health", _red
    )
 
RETURN result
```

#### New Group CF

```dax
VAR _green = "#11A25F"
VAR _yellow = "#CE9905"
VAR _red = "#E74B3A"
VAR sel = SELECTEDVALUE(dim_param_vp[Level2])

-- Logic Groupings
VAR _attritionColor =
    SWITCH(TRUE(),
        [CQ Attrition %] > 1.15, _red,
        [CQ Attrition %] >= 1, _yellow,
        _green
    )

VAR _netColor =
    SWITCH(TRUE(),
        [CQ Net% Plan] >= 1, _green,
        [CQ Net% Plan] >= 0.85, _yellow,
        _red
    )

VAR _s3CovColor =
    SWITCH(TRUE(),
        [S3+(F+U) LTG Cov] > 1, _green,
        [S3+(F+U) LTG Cov] >= 0.8, _yellow,
        _red
    )

VAR _s5CovColor =
    SWITCH(TRUE(),
        [S5+(F+U) LTG Cov] > 1.2, _green,
        [S5+(F+U) LTG Cov] >= 0.9, _yellow,
        _red
    )

VAR _s3CovXColor = 
    SWITCH(TRUE(),
        [S3 Q+1 Cov] > 1 || [S3 Q+2 Cov] > 1 || [S3+ Cov R4Q w/o x] > 1, _green,
        [S3 Q+1 Cov] >= 0.8 || [S3 Q+2 Cov] >= 0.8 || [S3+ Cov R4Q w/o x] >= 0.8, _yellow,
        _red
    )

VAR _s5CovXColor = 
    SWITCH(TRUE(),
        [S5+ (Q+1) Cov] > 1.2 || [S5+ (Q+2) Cov] > 1.2 || [S5+ R4Q Cov] > 1.2, _green,
        [S5+ (Q+1) Cov] >= 0.9 || [S5+ (Q+2) Cov] >= 0.9 || [S5+ R4Q Cov] >= 0.9, _yellow,
        _red
    )

VAR _grossCreationColor =
    SWITCH(TRUE(),
        [LP GROSS CREATION QTD %] >= 1 || [LP GROSS CREATED YTD %] >= 1, _green,
        [LP GROSS CREATION QTD %] >= 0.5 || [LP GROSS CREATED YTD %] >= 0.5, _yellow,
        _red
    )

VAR _participationColor =
    SWITCH(TRUE(),
        [Rep Participation QTD] >= 0.5 || [Rep Participation YTD] >= 0.5 || [FLM Participation QTD] >= 0.5 || [FLM Participation YTD] >= 0.5, _green,
        [Rep Participation QTD] >= 0.4 || [Rep Participation YTD] >= 0.4 || [FLM Participation QTD] >= 0.4 || [FLM Participation YTD] >= 0.4, _yellow,
        _red
    )

-- Final Selection Logic
VAR result =
    SWITCH(sel,
        "GNARR %", SWITCH(TRUE(),
            [FP W+F+UC%] >= 0.75, _green,
            [FP W+F+UC%] >= 0.25, _yellow,
            _red
        ),

        "S3+ (F+U) LTG Cov", _s3CovColor,
        "S3+ Covx Q+1", _s3CovColor,
        "S3+ Covx Q+2", _s3CovColor,
        "S3+R4Q", _s3CovColor,

        "S5+ (F+U) LTG Cov", _s5CovColor,
        "S5+ Covx Q+1", _s5CovColor,
        "S5+ Covx Q+2", _s5CovColor,
        "S5+R4Q", _s5CovColor,

        "CQ Attrition OL %", _attritionColor,
        "Attrition OL %", _attritionColor,

        "Net OL %", _netColor,

        "Gross Creation QTD %", _grossCreationColor,
        "Gross Creation YTD %", _grossCreationColor,

        "Rep Participation QTD", _participationColor,
        "Rep Participation YTD", _participationColor,
        "FLM Participation QTD", _participationColor,
        "FLM Participation YTD", _participationColor,

        "% Green Sol Health", _green,
        "% Yellow Sol Health", _yellow,
        "% Red Sol Health", _red,

        "% Green Accnt Health", _green,
        "% Red Accnt Health", _red
    )

RETURN result
```

#### param_measure_vp

```dax
VAR level2 = SELECTEDVALUE(dim_param_vp[Level2])
VAR val =
    SWITCH(
        level2,
        "GNARR Target",[CQ GNARR Target],
        "Won", [CQ Won $],
        "Forecast", [CQ Forecast $],
        "Upside C", [CQ Upside Com],
        "W+F+UC $", [CQ W+F+UC $],
        "GNARR %", [FP W+F+UC%],
        "GNARR % YTD", [PERFORMANCE YTD %],
        "GNARR $ YTD", [W+F+UC PIPE YTD $],
        "S3+ (F+U) LTG Cov", [S3+(F+U) LTG Cov],
        "S5+ (F+U) LTG Cov", [S5+(F+U) LTG Cov],
        "CQ Attrition Target", [CQ attrition Target],
        "CQ Attrition OL $", [CQ Attrition OL $],
        "CQ Attrition OL %", [CQ Attrition %],
        "Attrition YTD OL %", [YTD Attrition%],
        "Attrition YTD OL $", [YTD attrition],
        "Net Target", [CQ Net Plan],
        "Net $", [CQ Net Outlook],
        "Net OL %", [CQ Net% Plan],
        "S3+ Covx Q+1", [S3 Q+1 Cov],
        "S3+ Covx Q+2", [S3 Q+2 Cov],
        "S3+ Covx R4Q", [S3+ Cov R4Q w/o x],
        "S5+ Covx Q+1", [S5+ (Q+1) Cov],
        "S5+ Covx Q+2", [S5+ (Q+2) Cov],
        "S5+ Covx R4Q", [S5+ R4Q Cov],
        "Gross Creation QTD %", [LP GROSS CREATION QTD %],
        "Gross Creation YTD %", [LP GROSS CREATED YTD %],
        "RBOB", [FP RBOB],
        "Risk", [FP Risk CQ],
        "Upside", [FP Upside Savables CQ],
        "Upsell $ Attach Rate", [CQ Upsell $ Attach Rate],
        "Upsell # Attach Rate", [CQ Upsell # Attach %],
        "Renewal Rate %", [CQ Renewal Rate Outlook],
        "Attrition Target", [CQ attrition Target],
        "Attrition OL %", [CQ Attrition %],
        "Attrition OL $", [CQ Attrition OL $],
        "Attrition % YTD", [YTD Attrition%],
        "Attrition $ YTD", [YTD attrition],
        "ARR", [ARRAVG SubID],
        "Sub Accnt Completion %", [FP Tier 1 Sub Complete %],
        "Parent Accnt Completion %", [FP Tier 1 Parent Complete %],
        "# of Sub Accnt", [FP # Sub Accounts],
        "# of Parent Accnt", [FP # Parent Accounts],
        "% Green Sol Health", [Sol Green %],
        "% Yellow Sol Health", [Sol PYellow %],
        "% Red Sol Health", [Sol Red %],
        "% Green Accnt Health", [Green %],
        "% Red Accnt Health", [Red %],
        "AE in Seat %", [AE IN SEAT %],
        "AE in Seat #", [FP AE in seat],
        "Total AE HC #", [FP AE Total],
        "Rep Participation QTD", [Rep Participation QTD],
        "Rep Participation YTD", [Rep Participation YTD],
        "FLM Participation QTD", [FLM Participation QTD],
        "FLM Participation YTD", [FLM Participation YTD],
        "Team Participation QTD", [FLM WITH >50% AE @75% QTD %],
        "Team Participation YTD", [FLM WITH >50% AE @75% YTD %],
        "PY Rep Participation", BLANK(),
        BLANK()
    )
VAR isBlankVal = ISBLANK(val)
VAR formattedVal =
    SWITCH(
        TRUE(),
        isBlankVal, BLANK(),

        level2 IN {
            "GNARR Target", "Won", "Forecast", "Upside C", "W+F+UC $", "GNARR $ YTD", "CQ Attrition Target", "CQ Attrition OL $", "Attrition YTD OL $", "Net Target", "Net $",  "RBOB", "Risk", "Upside", "Attrition Target", "Attrition OL $", "Attrition $ YTD" , "ARR"
        }, FORMAT(val/1000000, "$#,##0.0M"),

        level2 IN {
            "S3+ (F+U) LTG Cov", "S5+ (F+U) LTG Cov", "S3+ Covx Q+1", "S3+ Covx Q+2",
            "S3+ Covx R4Q", "S5+ Covx Q+1", "S5+ Covx Q+2", "S5+ Covx R4Q"
        }, FORMAT(val, "0.0"),

        level2 IN {
            "# of Sub Accnt", "# of Parent Accnt", "AE in Seat #", "Total AE HC #"
        }, FORMAT(val, "#"),

        // For everything else, just return the raw value without formatting
        TRUE, val
    )
RETURN
    IF(
        ISBLANK(level2),
        BLANK(),
        formattedVal
    )
```

---

## 3. Calculated Columns (DAX — not in raw DB)

Total: **174** calculated columns.
These exist only in the PBI model. To replicate in SQL, implement the logic below.

### Account (DB: vw_TD_EBI_ACCOUNT) — 3 calculated columns

#### Account.[DAYS_SINCE_ACCNT_HEALTH_MODIFED]

```dax
DATEDIFF(Account[DX_HEALTH_LAST_MODIFIED_DATE], TODAY(), DAY)
```

#### Account.[Parent_Rev_Band]

```dax
VAR pos = SEARCH("=", Account[PARENT_ANNUAL_REV_BAND], 1, -1)
VAR rev_band = MAX(Account[PARENT_ANNUAL_REV_BAND])
RETURN
IF( 
    Account[PARENT_ANNUAL_REV_BAND] = "7 Not Reported", "Not Reported",
        IF(
        pos = -1,
        BLANK(), 
        RIGHT(Account[PARENT_ANNUAL_REV_BAND], LEN(Account[PARENT_ANNUAL_REV_BAND]) - pos + 2)
        )
)
```

#### Account.[Parent_Rev_Band Sort]

```dax
IF(ISBLANK(Account[PARENT_ANNUAL_REV_BAND]), 1,
LEFT(Account[PARENT_ANNUAL_REV_BAND],1) +1
)
```

### Account ARR (DB: dataset:Account_ARR) — 8 calculated columns

#### Account ARR.[ARR Propensity]

```dax
RELATED('Customer Profile Attributes'[PROPENSITY_TO_BUY] /* DB: dataset:Customer_Profile_Attributes.PROPENSITY_TO_BUY */)
```

#### Account ARR.[ARR Willingness]

```dax
RELATED('Customer Profile Attributes'[WILLINGNESS_TO_ENGAGE] /* DB: dataset:Customer_Profile_Attributes.WILLINGNESS_TO_ENGAGE */)
```

#### Account ARR.[Child_MA]

```dax
CONCATENATE('Account ARR'[ACCOUNT_ID] /* DB: dataset:Account_ARR.ACCOUNT_ID */, 
RELATED('Account Country'[MARKET_AREA] /* DB: dataset:Account_Country.MARKET_AREA */)
)
```

#### Account ARR.[Customer Health]

```dax
RELATED('Customer Health'[CUSTOMER_HEALTH] /* DB: dataset:Customer_Health.CUSTOMER_HEALTH */)
```

#### Account ARR.[DAYS_SINCE_ACCNT_HEALTH_MODIFED]

```dax
DATEDIFF(RELATED(Account[DX_HEALTH_LAST_MODIFIED_DATE]), TODAY(), DAY)
```

#### Account ARR.[Fit Score]

```dax
RELATED('Customer Profile Attributes'[FIT_SCORE] /* DB: dataset:Customer_Profile_Attributes.FIT_SCORE */)
```

#### Account ARR.[Sub_MA]

```dax
CONCATENATE(RELATED(Account[ACCOUNT_SUB_ID]), 
RELATED('Account Country'[MARKET_AREA] /* DB: dataset:Account_Country.MARKET_AREA */)
)
```

#### Account ARR.[acc_sol_key]

```dax
CONCATENATE('Account ARR'[ACCOUNT_ID] /* DB: dataset:Account_ARR.ACCOUNT_ID */,RELATED(OPG[PANORAMA_SOLUTION]))
```

### Account Activities Metadata (DB: Account Activities Metadata) — 5 calculated columns

#### Account Activities Metadata.[Activity_Status_New]

```dax
SWITCH(
    TRUE(),
    'Account Activities Metadata'[Activity_Status] = "In progress", "Open",
    'Account Activities Metadata'[Activity_Status] = "N/A", "No GWP",
    'Account Activities Metadata'[Activity_Status] = "Complete", "Closed",
    ISBLANK('Account Activities Metadata'[Activity_Status]), BLANK(),
    "Unknown Status"
)
```

#### Account Activities Metadata.[Activity_Status_SortOrder]

```dax
SWITCH(
    TRUE(),
    'Account Activities Metadata'[Activity_Status] = "In progress", 1,     -- Open
    'Account Activities Metadata'[Activity_Status] = "Complete", 2,        -- Closed
    'Account Activities Metadata'[Activity_Status] = "N/A", 3,     -- No GWP
    4                                                                      -- Unknown or others
)
```

#### Account Activities Metadata.[GWP Open Closed]

```dax
SWITCH( TRUE(),
    'Account Activities Metadata'[ACTIVITY_STATUS] IN { "In Progress", "Not Started" }, "GWP Open", 
    'Account Activities Metadata'[ACTIVITY_STATUS] = "Complete", "GWP Closed"
)
```

#### Account Activities Metadata.[Last_modified_Date]

```dax
VAR DaysSinceModified = TODAY() - 'Account Activities Metadata'[ACTIVITY_LAST_MODIFIED_ON]
RETURN
SWITCH(
    TRUE(),
    DaysSinceModified < 30, "< 30 days",
    DaysSinceModified < 90, "< 90 days",
    DaysSinceModified < 180, "< 180 days",
    BLANK()
)
```

#### Account Activities Metadata.[Meeting_Type_SBR]

```dax
IF('Account Activities Metadata'[MEETING_TYPE] 
IN{"On Site", "On-Site"} , "Onsite", 
IF('Account Activities Metadata'[MEETING_TYPE] = "",BLANK(), 'Account Activities Metadata'[MEETING_TYPE]))
```

### Account Engagement Stage (DB: dataset:Account_Engagement_Stage) — 1 calculated columns

#### Account Engagement Stage.[High Marketing Engaged Accounts]

```dax
SWITCH(TRUE(),
('Account Engagement Stage'[ACCOUNT_ENGAGEMENT_STAGE] /* DB: dataset:Account_Engagement_Stage.ACCOUNT_ENGAGEMENT_STAGE */) 
		IN { "AE STAGE 3"}, "High Marketing Engaged Accounts",
"No")
```

### Account Sub (DB: dataset:Account_Sub) — 2 calculated columns

#### Account Sub.[High Credit Risk Account]

```dax
IF( 'Account Sub'[ACCOUNT_CREDIT_RISK_HIGH] /* DB: dataset:Account_Sub.ACCOUNT_CREDIT_RISK_HIGH */ = "Yes", "High Credit Risk Account")
```

#### Account Sub.[Sub_MA]

```dax
CONCATENATE('Account Sub'[SUB_ID] /* DB: dataset:Account_Sub.SUB_ID */,'Account Sub'[SUB_MARKET_AREA] /* DB: dataset:Account_Sub.SUB_MARKET_AREA */)
```

### Close Quarter (DB: vw_EBI_Caldate) — 2 calculated columns

#### Close Quarter.[Month_Name]

```dax
FORMAT('Close Quarter'[CLOSE_DATE] /* DB: vw_EBI_Caldate.CLOSE_DATE */, "mmm")
```

#### Close Quarter.[Semester]

```dax
SWITCH(TRUE(),
   'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0 && 'Close Quarter'[CLOSE_GENERIC_QTR] /* DB: vw_EBI_Caldate.CLOSE_GENERIC_QTR */ in {"Q1", "Q2"}, "H1",
   'Close Quarter'[CLOSE_YR_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_YR_BKT_NUMBER */ = 0 && 'Close Quarter'[CLOSE_GENERIC_QTR] /* DB: vw_EBI_Caldate.CLOSE_GENERIC_QTR */ in {"Q3", "Q4"}, "H2"
)
```

### Customer Health Movement (DB: dataset:Customer_Health_Movement) — 3 calculated columns

#### Customer Health Movement.[ARR_ACCOUNT_ID]

```dax
IF( RELATED(Account[HAVE_ACTIVE_PQ_EOQ_ARR]) = TRUE(), RELATED(Account[ACCOUNT_ID]), BLANK())
```

#### Customer Health Movement.[Month]

```dax
var Mon = RIGHT('Customer Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Health_Movement.SNAPSHOT_MONTH_ID */,2)
VAR SnapDate = DATE(
    LEFT('Customer Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Health_Movement.SNAPSHOT_MONTH_ID */, 4) ,
    RIGHT('Customer Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Health_Movement.SNAPSHOT_MONTH_ID */, 2) - 1,
    1
)
VAR SnapDateLY = DATE(
    LEFT('Customer Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Health_Movement.SNAPSHOT_MONTH_ID */, 4) - 1  ,
    12,
    1
)

RETURN IF(Mon = "01", SnapDateLY, SnapDate)
```

#### Customer Health Movement.[MonthOffset]

```dax
VAR _currmonth = 
    CALCULATE (
        MIN ( 'Close Quarter'[YR_MONTH_KEY] /* DB: vw_EBI_Caldate.YR_MONTH_KEY */ ),
        'Close Quarter'[CLOSE_WEEK_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_WEEK_BKT_NUMBER */ = 0
    )
VAR CurrentYM =
    MAXX ( FILTER ( 'Customer Health Movement', 'Customer Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Health_Movement.SNAPSHOT_MONTH_ID */= _currmonth ), 'Customer Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Health_Movement.SNAPSHOT_MONTH_ID */ )
VAR CurrentYear = INT ( CurrentYM / 100 )
VAR CurrentMonth = MOD ( CurrentYM, 100 )
RETURN
    ( INT ( 'Customer Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Health_Movement.SNAPSHOT_MONTH_ID */ / 100 ) - CurrentYear ) * 12 +
    ( MOD('Customer Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Health_Movement.SNAPSHOT_MONTH_ID */,100) - CurrentMonth )
```

### Customer Profile Attributes (DB: dataset:Customer_Profile_Attributes) — 8 calculated columns

#### Customer Profile Attributes.[Cross-Sell Predicted]

```dax
SWITCH(TRUE(),
'Customer Profile Attributes'[PREDICTION_TYPE] /* DB: dataset:Customer_Profile_Attributes.PREDICTION_TYPE */
		IN { "Cross-sell"}, "Cross-sell Predicted",
"No")
```

#### Customer Profile Attributes.[Greenfield Predicted]

```dax
SWITCH(TRUE(),
'Customer Profile Attributes'[PREDICTION_TYPE] /* DB: dataset:Customer_Profile_Attributes.PREDICTION_TYPE */
		IN { "Greenfield"}, "Greenfield Predicted",
"No")
```

#### Customer Profile Attributes.[High AES]

```dax
IF('Customer Profile Attributes'[HIGH_AES] /* DB: dataset:Customer_Profile_Attributes.HIGH_AES */ = TRUE(), "High Marketing Engaged (AES 3)")
```

#### Customer Profile Attributes.[High ICP or UCP or AES Accounts]

```dax
SWITCH(TRUE(),
'Customer Profile Attributes'[HIGH_UCP_ICP_AES] /* DB: dataset:Customer_Profile_Attributes.HIGH_UCP_ICP_AES */ = TRUE(), "High UCP & ICP & AES Accounts",
"No")
```

#### Customer Profile Attributes.[High UCP and ICP]

```dax
IF('Customer Profile Attributes'[HIGH_UCP_ICP] /* DB: dataset:Customer_Profile_Attributes.HIGH_UCP_ICP */ = TRUE(), "High UCP and ICP")
```

#### Customer Profile Attributes.[High UCP or ICP]

```dax
IF('Customer Profile Attributes'[HIGH_UCP_OR_ICP] /* DB: dataset:Customer_Profile_Attributes.HIGH_UCP_OR_ICP */ = TRUE(), "High UCP or ICP")
```

#### Customer Profile Attributes.[New Predicted]

```dax
SWITCH(TRUE(),
'Customer Profile Attributes'[PREDICTION_TYPE] /* DB: dataset:Customer_Profile_Attributes.PREDICTION_TYPE */
		IN { "Greenfield"}, "New Predicted",
"No")
```

#### Customer Profile Attributes.[Upsell Predicted]

```dax
SWITCH(TRUE(),
'Customer Profile Attributes'[PREDICTION_TYPE] /* DB: dataset:Customer_Profile_Attributes.PREDICTION_TYPE */
		IN { "Upsell"}, "Upsell Predicted",
"No")
```

### Customer Solution Health Movement (DB: dataset:Customer_Solution_Health_Movement) — 4 calculated columns

#### Customer Solution Health Movement.[Month]

```dax
VAR Mon = RIGHT('Customer Solution Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Solution_Health_Movement.SNAPSHOT_MONTH_ID */,2)
VAR SnapDate = DATE(
    LEFT('Customer Solution Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Solution_Health_Movement.SNAPSHOT_MONTH_ID */, 4) ,
    RIGHT('Customer Solution Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Solution_Health_Movement.SNAPSHOT_MONTH_ID */, 2) - 1,
    1
)
VAR SnapDateLY = DATE(
    LEFT('Customer Solution Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Solution_Health_Movement.SNAPSHOT_MONTH_ID */, 4) - 1  ,
    12,
    1
)

RETURN IF(Mon = "01", SnapDateLY, SnapDate)
```

#### Customer Solution Health Movement.[Month new]

```dax
VAR _mon = RIGHT('Customer Solution Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Solution_Health_Movement.SNAPSHOT_MONTH_ID */, 2)
VAR SnapDate = DATE(
    LEFT('Customer Solution Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Solution_Health_Movement.SNAPSHOT_MONTH_ID */, 4) ,
    RIGHT('Customer Solution Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Solution_Health_Movement.SNAPSHOT_MONTH_ID */, 2) - 1,
    1
)
VAR SnapDateLY = DATE(
    LEFT('Customer Solution Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Solution_Health_Movement.SNAPSHOT_MONTH_ID */, 4) - 1  ,
    12,
    1
)

RETURN IF(_mon = "01", SnapDateLY, SnapDate)
```

#### Customer Solution Health Movement.[MonthOffset]

```dax
VAR _currmonth = 
    CALCULATE (
        MIN ( 'Close Quarter'[YR_MONTH_KEY] /* DB: vw_EBI_Caldate.YR_MONTH_KEY */ ),
        'Close Quarter'[CLOSE_WEEK_BKT_NUMBER] /* DB: vw_EBI_Caldate.CLOSE_WEEK_BKT_NUMBER */ = 0
    )
VAR CurrentYM =
    MAXX ( FILTER ( 'Customer Health Movement', 'Customer Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Health_Movement.SNAPSHOT_MONTH_ID */= _currmonth ), 'Customer Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Health_Movement.SNAPSHOT_MONTH_ID */ )
VAR CurrentYear = INT ( CurrentYM / 100 )
VAR CurrentMonth = MOD ( CurrentYM, 100 )
RETURN
    ( INT ( 'Customer Solution Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Solution_Health_Movement.SNAPSHOT_MONTH_ID */ / 100 ) - CurrentYear ) * 12 +
    ( MOD('Customer Solution Health Movement'[SNAPSHOT_MONTH_ID] /* DB: dataset:Customer_Solution_Health_Movement.SNAPSHOT_MONTH_ID */,100) - CurrentMonth )
```

#### Customer Solution Health Movement.[acc_sol_key]

```dax
CONCATENATE( RELATED(OPG[PANORAMA_SOLUTION]),  'Customer Solution Health Movement'[ACCOUNT_ID] /* DB: dataset:Customer_Solution_Health_Movement.ACCOUNT_ID */)
```

### DOAP_Fields (DB: DOAP_Fields) — 1 calculated columns

#### DOAP_Fields.[Deal_Sensei_Score_Placeholder_occ]

```dax
"0%"
```

### DRF Pillars (DB: dataset:DRF_Pillars) — 3 calculated columns

#### DRF Pillars.[Concat Q_E]

```dax
CONCATENATE(CONCATENATE('DRF Pillars'[DRF_QUESTION_HEADER] /* DB: dataset:DRF_Pillars.DRF_QUESTION_HEADER */, " "),'DRF Pillars'[DRF_EXPLANATION] /* DB: dataset:DRF_Pillars.DRF_EXPLANATION */)
```

#### DRF Pillars.[DEAL_REG_ID]

```dax
RELATED(Opportunity[DEAL_REG_ID])
```

#### DRF Pillars.[Explanation_Concatenated]

```dax
VAR currentDeal = 'DRF Pillars'[DEAL_REG_ID] /* DB: dataset:DRF_Pillars.DEAL_REG_ID */
VAR currentPillar = 'DRF Pillars'[DRF_PILLAR] /* DB: dataset:DRF_Pillars.DRF_PILLAR */
RETURN
CONCATENATEX(
    FILTER(
        'DRF Pillars',
        'DRF Pillars'[DEAL_REG_ID] /* DB: dataset:DRF_Pillars.DEAL_REG_ID */ = currentDeal &&
        'DRF Pillars'[DRF_PILLAR] /* DB: dataset:DRF_Pillars.DRF_PILLAR */ = currentPillar
    ),
    'DRF Pillars'[DRF_EXPLANATION] /* DB: dataset:DRF_Pillars.DRF_EXPLANATION */,
    " | "
)
```

### DateTableTemplate_f9302a91-3196-43e4-ba70-8917eb78b70f (DB: DateTableTemplate_f9302a91-3196-43e4-ba70-8917eb78b70f) — 6 calculated columns

#### DateTableTemplate_f9302a91-3196-43e4-ba70-8917eb78b70f.[Day]

```dax
DAY([Date])
```

#### DateTableTemplate_f9302a91-3196-43e4-ba70-8917eb78b70f.[Month]

```dax
FORMAT([Date], "MMMM")
```

#### DateTableTemplate_f9302a91-3196-43e4-ba70-8917eb78b70f.[MonthNo]

```dax
MONTH([Date])
```

#### DateTableTemplate_f9302a91-3196-43e4-ba70-8917eb78b70f.[Quarter]

```dax
"Qtr " & [QuarterNo]
```

#### DateTableTemplate_f9302a91-3196-43e4-ba70-8917eb78b70f.[QuarterNo]

```dax
INT(([MonthNo] + 2) / 3)
```

#### DateTableTemplate_f9302a91-3196-43e4-ba70-8917eb78b70f.[Year]

```dax
YEAR([Date])
```

### Deal Band (DB: dataset:Deal_Band) — 2 calculated columns

#### Deal Band.[Deal_Band param]

```dax
SWITCH(TRUE(),
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset:Deal_Band.DEAL_BAND_NEW */ IN {"<0K", "0K-25K", "25K-50K", "50K-75K", "75K-100K", "100K-250K"} ,  "0-250K",
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset:Deal_Band.DEAL_BAND_NEW */ IN { "250K-500K"} ,  "250K-500K",
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset:Deal_Band.DEAL_BAND_NEW */ IN {"500K-750K", "750K-1M"} ,  "500K-1M",
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset:Deal_Band.DEAL_BAND_NEW */ IN {"1M-2M", "2M-3M", "3M-4M", "4M-5M"} ,  "1M-5M",
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset:Deal_Band.DEAL_BAND_NEW */ IN {"5M-6M", "6M-7M", "7M-8M", "8M-9M", "9M-10M"} ,  "5M-10M",
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset:Deal_Band.DEAL_BAND_NEW */ IN {"10M-15M", "15M-20M"} ,  "10M-20M",
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset:Deal_Band.DEAL_BAND_NEW */ IN {"20M+"} ,  "20M+"
)
```

#### Deal Band.[Deal_Band param sort]

```dax
SWITCH(TRUE(),
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset:Deal_Band.DEAL_BAND_NEW */ IN {"<0K", "0K-25K", "25K-50K", "50K-75K", "75K-100K", "100K-250K"} , 7,
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset:Deal_Band.DEAL_BAND_NEW */ IN { "250K-500K"} ,  6,
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset:Deal_Band.DEAL_BAND_NEW */ IN {"500K-750K", "750K-1M"} ,  5,
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset:Deal_Band.DEAL_BAND_NEW */ IN {"1M-2M", "2M-3M", "3M-4M", "4M-5M"} ,  4,
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset:Deal_Band.DEAL_BAND_NEW */ IN {"5M-6M", "6M-7M", "7M-8M", "8M-9M", "9M-10M"} ,  3,
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset:Deal_Band.DEAL_BAND_NEW */ IN {"10M-15M", "15M-20M"} ,  2,
'Deal Band'[DEAL_BAND_NEW] /* DB: dataset:Deal_Band.DEAL_BAND_NEW */ IN {"20M+"} ,  1
)
```

### LocalDateTable_d3899d49-da7d-4fa3-bc41-9d4e40f3a367 (DB: LocalDateTable_d3899d49-da7d-4fa3-bc41-9d4e40f3a367) — 6 calculated columns

#### LocalDateTable_d3899d49-da7d-4fa3-bc41-9d4e40f3a367.[Day]

```dax
DAY([Date])
```

#### LocalDateTable_d3899d49-da7d-4fa3-bc41-9d4e40f3a367.[Month]

```dax
FORMAT([Date], "MMMM")
```

#### LocalDateTable_d3899d49-da7d-4fa3-bc41-9d4e40f3a367.[MonthNo]

```dax
MONTH([Date])
```

#### LocalDateTable_d3899d49-da7d-4fa3-bc41-9d4e40f3a367.[Quarter]

```dax
"Qtr " & [QuarterNo]
```

#### LocalDateTable_d3899d49-da7d-4fa3-bc41-9d4e40f3a367.[QuarterNo]

```dax
INT(([MonthNo] + 2) / 3)
```

#### LocalDateTable_d3899d49-da7d-4fa3-bc41-9d4e40f3a367.[Year]

```dax
YEAR([Date])
```

### OCC_Performance Cohort FLM_Band (DB: OCC_Performance Cohort FLM_Band) — 5 calculated columns

#### OCC_Performance Cohort FLM_Band.[Attainment Band]

```dax
SWITCH(
    TRUE(),
    'OCC_Performance Cohort FLM_Band'[Attain] > 0.75, ">75%",
    'OCC_Performance Cohort FLM_Band'[Attain] > 0.50, "50-75%",
    'OCC_Performance Cohort FLM_Band'[Attain] > 0.25, "25-50%",
    'OCC_Performance Cohort FLM_Band'[Attain] > 0, "<25%", BLANK()
)
```

#### OCC_Performance Cohort FLM_Band.[FLM Cohort]

```dax
IF('OCC_Performance Cohort FLM_Band'[FLM Participation]>=.75,"High FLM Participation","Low FLM Participation")
```

#### OCC_Performance Cohort FLM_Band.[FLM Team Cohort]

```dax
'OCC_Performance Cohort FLM_Band'[FLM Cohort] & " " & 'OCC_Performance Cohort FLM_Band'[Team Cohort]
```

#### OCC_Performance Cohort FLM_Band.[FLM Team Cohort Band Sorting]

```dax
var Cohort_band = 'OCC_Performance Cohort FLM_Band'[FLM Cohort] & " " & 'OCC_Performance Cohort FLM_Band'[Team Cohort]

    RETURN

    SWITCH(TRUE(),
        Cohort_band="High FLM Participation Low Team Participation",1,
        Cohort_band= "Low FLM Participation Low Team Participation",2,
        Cohort_band= "High FLM Participation High Team Participation",3,
        Cohort_band=  "Low FLM Participation High Team Participation",4          
    )
```

#### OCC_Performance Cohort FLM_Band.[Team Cohort]

```dax
IF('OCC_Performance Cohort FLM_Band'[Team Participation]>=.5,"High Team Participation","Low Team Participation")
```

### OCC_Performance Cohort SLM_Band (DB: OCC_Performance Cohort SLM_Band) — 18 calculated columns

#### OCC_Performance Cohort SLM_Band.[Attainment Band]

```dax
SWITCH(
    TRUE(),
    'OCC_Performance Cohort SLM_Band'[Attain] > 0.75, ">75%",
    'OCC_Performance Cohort SLM_Band'[Attain] > 0.50, "50-75%",
    'OCC_Performance Cohort SLM_Band'[Attain] > 0.25, "25-50%",
    'OCC_Performance Cohort SLM_Band'[Attain] > 0, "<25%", BLANK()
)
```

#### OCC_Performance Cohort SLM_Band.[CY Covx >2]

```dax
IF('OCC_Performance Cohort SLM_Band'[CY Covx]>=2,1,0)
```

#### OCC_Performance Cohort SLM_Band.[Parent Tier 1 100]

```dax
IF('OCC_Performance Cohort SLM_Band'[Tier 1 Prnt Complete]>=1,1,0)
```

#### OCC_Performance Cohort SLM_Band.[Q+1 Covx >2.7]

```dax
IF('OCC_Performance Cohort SLM_Band'[CQ+1 Total Pipe Covx]>=2.7,1,0)
```

#### OCC_Performance Cohort SLM_Band.[Q+1 Mat Covx >1.2]

```dax
IF('OCC_Performance Cohort SLM_Band'[CQ+1 Mature Covx]>=1.2,1,0)
```

#### OCC_Performance Cohort SLM_Band.[QTD Attain >0 & <25]

```dax
IF('OCC_Performance Cohort SLM_Band'[QTD Attain]>=0&&'OCC_Performance Cohort SLM_Band'[QTD Attain]<.25,1,0)
```

#### OCC_Performance Cohort SLM_Band.[QTD Attain >25 & <50]

```dax
IF('OCC_Performance Cohort SLM_Band'[QTD Attain]>=.25&&'OCC_Performance Cohort SLM_Band'[QTD Attain]<.5,1,0)
```

#### OCC_Performance Cohort SLM_Band.[QTD Attain >50 & <75]

```dax
IF('OCC_Performance Cohort SLM_Band'[QTD Attain]>=.5&&'OCC_Performance Cohort SLM_Band'[QTD Attain]<.75,1,0)
```

#### OCC_Performance Cohort SLM_Band.[QTD Attain >75]

```dax
IF('OCC_Performance Cohort SLM_Band'[QTD Attain]>=.75,1,0)
```

#### OCC_Performance Cohort SLM_Band.[QTD Attainment Band]

```dax
SWITCH(
    TRUE(),
    'OCC_Performance Cohort SLM_Band'[QTD Attain] > 0.75, ">75%",
    'OCC_Performance Cohort SLM_Band'[QTD Attain] > 0.50, "50-75%",
    'OCC_Performance Cohort SLM_Band'[QTD Attain] > 0.25, "25-50%",
    'OCC_Performance Cohort SLM_Band'[QTD Attain] > 0, "<25%", BLANK()
)
```

#### OCC_Performance Cohort SLM_Band.[QTD Pipe Gen >75]

```dax
IF('OCC_Performance Cohort SLM_Band'[Gross Creation QTD]>=.75,1,0)
```

#### OCC_Performance Cohort SLM_Band.[Rolling 4 Covx >2]

```dax
IF('OCC_Performance Cohort SLM_Band'[Rolling 4 Qtr S3 Covx]>=2,1,0)
```

#### OCC_Performance Cohort SLM_Band.[SLM Team Part QTD >50]

```dax
IF('OCC_Performance Cohort SLM_Band'[SLM Team Part QTD]>=.5,1,0)
```

#### OCC_Performance Cohort SLM_Band.[SLM Team Part QTD_Repcount]

```dax
DIVIDE('OCC_Performance Cohort SLM_Band'[Rep QTD >75],'OCC_Performance Cohort SLM_Band'[Rep Total],Blank())
```

#### OCC_Performance Cohort SLM_Band.[SLM Team Part YTD >50]

```dax
IF('OCC_Performance Cohort SLM_Band'[SLM Team Part YTD]>=.5,1,0)
```

#### OCC_Performance Cohort SLM_Band.[Sub Tier 1 100]

```dax
IF('OCC_Performance Cohort SLM_Band'[Tier 1 Sub Complete]>=1,1,0)
```

#### OCC_Performance Cohort SLM_Band.[YTD Attain >75]

```dax
IF('OCC_Performance Cohort SLM_Band'[Attain]>=.75,1,0)
```

#### OCC_Performance Cohort SLM_Band.[YTD Pipe Gen >75]

```dax
IF('OCC_Performance Cohort SLM_Band'[Gross Creation YTD]>=.75,1,0)
```

### OCC_Performance Cohort SLM_Prev (DB: OCC_Performance Cohort SLM_Prev) — 2 calculated columns

#### OCC_Performance Cohort SLM_Prev.[Attain @ 75]

```dax
IF('OCC_Performance Cohort SLM_Prev'[QTD Attain]>=0.75,1,0)
```

#### OCC_Performance Cohort SLM_Prev.[QTD Attain @ 75]

```dax
IF('OCC_Performance Cohort SLM_Prev'[QTD Attain]>=0.75,1,0)
```

### OCC_Performance Cohort SLM_Start (DB: OCC_Performance Cohort SLM_Start) — 16 calculated columns

#### OCC_Performance Cohort SLM_Start.[CY Covx >2]

```dax
IF('OCC_Performance Cohort SLM_Start'[CY Covx]>=2,1,0)
```

#### OCC_Performance Cohort SLM_Start.[Parent Tier 1 100]

```dax
IF('OCC_Performance Cohort SLM_Start'[Tier 1 Prnt Complete]>=1,1,0)
```

#### OCC_Performance Cohort SLM_Start.[Q+1 Covx >2.7]

```dax
IF('OCC_Performance Cohort SLM_Start'[CQ+1 Total Pipe Covx]>=2.7,1,0)
```

#### OCC_Performance Cohort SLM_Start.[Q+1 Mat Covx >1.2]

```dax
IF('OCC_Performance Cohort SLM_Start'[CQ+1 Mature Covx]>=1.2,1,0)
```

#### OCC_Performance Cohort SLM_Start.[QTD Attain >0 & <25]

```dax
IF('OCC_Performance Cohort SLM_Start'[QTD Attain]>=0&&'OCC_Performance Cohort SLM_Start'[QTD Attain]<.25,1,0)
```

#### OCC_Performance Cohort SLM_Start.[QTD Attain >25 & <50]

```dax
IF('OCC_Performance Cohort SLM_Start'[QTD Attain]>=.25&&'OCC_Performance Cohort SLM_Start'[QTD Attain]<.5,1,0)
```

#### OCC_Performance Cohort SLM_Start.[QTD Attain >50 & <75]

```dax
IF('OCC_Performance Cohort SLM_Start'[QTD Attain]>=.5&&'OCC_Performance Cohort SLM_Start'[QTD Attain]<.75,1,0)
```

#### OCC_Performance Cohort SLM_Start.[QTD Attain >75]

```dax
IF('OCC_Performance Cohort SLM_Start'[QTD Attain]>=.75,1,0)
```

#### OCC_Performance Cohort SLM_Start.[QTD Pipe Gen >75]

```dax
IF('OCC_Performance Cohort SLM_Start'[Gross Creation QTD]>=.75,1,0)
```

#### OCC_Performance Cohort SLM_Start.[Rolling 4 Covx >2]

```dax
IF('OCC_Performance Cohort SLM_Start'[Rolling 4 Qtr S3 Covx]>=2,1,0)
```

#### OCC_Performance Cohort SLM_Start.[SLM Team Part QTD >50]

```dax
IF('OCC_Performance Cohort SLM_Start'[SLM Team Part QTD]>=.5,1,0)
```

#### OCC_Performance Cohort SLM_Start.[SLM Team Part QTD_Repcount]

```dax
DIVIDE('OCC_Performance Cohort SLM_Start'[Rep QTD >75],'OCC_Performance Cohort SLM_Start'[Rep Total],Blank())
```

#### OCC_Performance Cohort SLM_Start.[SLM Team Part YTD >50]

```dax
IF('OCC_Performance Cohort SLM_Start'[SLM Team Part YTD]>=.5,1,0)
```

#### OCC_Performance Cohort SLM_Start.[Sub Tier 1 100]

```dax
IF('OCC_Performance Cohort SLM_Start'[Tier 1 Sub Complete]>=1,1,0)
```

#### OCC_Performance Cohort SLM_Start.[YTD Attain >75]

```dax
IF('OCC_Performance Cohort SLM_Start'[Attain]>=.75,1,0)
```

#### OCC_Performance Cohort SLM_Start.[YTD Pipe Gen >75]

```dax
IF('OCC_Performance Cohort SLM_Start'[Gross Creation YTD]>=.75,1,0)
```

### OCC_Performance Cohort_Band (DB: OCC_Performance Cohort_Band) — 8 calculated columns

#### OCC_Performance Cohort_Band.[Action Path]

```dax
IF(
    'OCC_Performance Cohort_Band'[Coverage Cohort]="High Coverage"&&'OCC_Performance Cohort_Band'[Maturity Cohort]="Low Maturity","Drive Progression",
    IF('OCC_Performance Cohort_Band'[Coverage Cohort]="High Coverage"&&'OCC_Performance Cohort_Band'[Maturity Cohort]="High Maturity",
        "Continue and Execute",
        IF('OCC_Performance Cohort_Band'[Coverage Cohort]="Low Coverage"&&'OCC_Performance Cohort_Band'[Maturity Cohort]="Low Maturity","Build the Pipeline","Focus on Execution while Building pipeline")))
```

#### OCC_Performance Cohort_Band.[Attainment Band]

```dax
SWITCH(
    TRUE(),
    'OCC_Performance Cohort_Band'[Attain] > 0.75, ">75%",
    'OCC_Performance Cohort_Band'[Attain] > 0.50, "50-75%",
    'OCC_Performance Cohort_Band'[Attain] > 0.25, "25-50%",
    'OCC_Performance Cohort_Band'[Attain] > 0, "<25%", BLANK()
)
```

#### OCC_Performance Cohort_Band.[Cohort Band]

```dax
'OCC_Performance Cohort_Band'[Coverage Cohort] & " " & 'OCC_Performance Cohort_Band'[Maturity Cohort]
```

#### OCC_Performance Cohort_Band.[Cohort Band Sorting]

```dax
var Cohort_band = 'OCC_Performance Cohort_Band'[Coverage Cohort] & " " & 'OCC_Performance Cohort_Band'[Maturity Cohort]

RETURN

SWITCH(TRUE(),
    Cohort_band="Low Coverage High Maturity",1,
    Cohort_band= "Low Coverage Low Maturity",2,
    Cohort_band= "High Coverage High Maturity",3,   
    Cohort_band=  "High Coverage Low Maturity",4
)
```

#### OCC_Performance Cohort_Band.[Coverage Cohort]

```dax
SWITCH(
    TRUE(),
    'OCC_Performance Cohort_Band'[REP_GTM_MOTION] = "Industry" && 'OCC_Performance Cohort_Band'[Rolling 4 Qtr Cov] >= 2 , "High Coverage",
    'OCC_Performance Cohort_Band'[REP_GTM_MOTION] = "Industry" && 'OCC_Performance Cohort_Band'[Rolling 4 Qtr Cov] < 2 , "Low Coverage",
    'OCC_Performance Cohort_Band'[CY Cov] >= 2, "High Coverage",
     'OCC_Performance Cohort_Band'[CY Cov] < 2, "Low Coverage",BLANK()
)
```

#### OCC_Performance Cohort_Band.[Drillthrough Page]

```dax
SWITCH(TRUE(),
   [Action Path] = "Drive Progression", "Pipeline Coverage AE",
    [Action Path] in { "Build the Pipeline", "Focus on Execution while Building pipeline"}, "Creation AE",
    [Action Path] = "Continue and Execute","Outlook L3 AE",
    "Not In Seat")
```

#### OCC_Performance Cohort_Band.[Maturity Cohort]

```dax
SWITCH(
    TRUE(),
    'OCC_Performance Cohort_Band'[Q+1 Mature pipe Cov] >= 1.2 , "High Maturity",
    'OCC_Performance Cohort_Band'[Q+1 Mature pipe Cov] < 1.2,"Low Maturity",BLANK()
)
```

#### OCC_Performance Cohort_Band.[Page Name]

```dax
SWITCH(TRUE(),
   [Action Path] = "Drive Progression", "Coverage : Drive Progression",
    [Action Path] in { "Build the Pipeline", "Focus on Execution while Building pipeline"}, "Creation : Build Pipeline",
    [Action Path] = "Continue and Execute","Outlook : Continue and Execute",
    "Not In Seat")
```

### OPG (DB: vw_EBI_OPG) — 1 calculated columns

#### OPG.[OCC_OPG_FLAG]

```dax
IF(OPG[MOPG1]<>"ADVERTISING",1,0)
```

### Opportunity (DB: vw_TD_EBI_OPP) — 9 calculated columns

#### Opportunity.[DRD_DAYS_LEFT_TO_CLOSE]

```dax
Opportunity[ORIGINAL_OPP_CLOSE_DATE]-TODAY()
```

#### Opportunity.[Low CJ Adoption]

```dax
IF( ISBLANK(Opportunity[LOW_CJ_ADOPTION]), BLANK(),
IF(
Opportunity[LOW_CJ_ADOPTION] = TRUE(), "Yes",
 "No"
)
)
```

#### Opportunity.[Missing BANT]

```dax
IF(
    (Opportunity[POWER] in {"In Progress","Champion Engaged","Aligned with Power","Need Ecosystem Support","Addressed","Identified"})&&
    (Opportunity[CUSTOMER_CHALLENGE] in {"In Progress","Customer Discovery","Customer Confirmed Challenge","Need Ecosystem Support","Addressed","Identified"})&&
    (Opportunity[TIMING] in {"In Progress","Lack Compelling Event","Compelling Event Validated","Need Ecosystem Support","Addressed","Identified"})&&
    (NOT(ISBLANK(Opportunity[CUSTOMER_GOALS_INITIATIVES]))),"No"
    ,"Missing BANT")
```

#### Opportunity.[OCC_Deal Not Reviewed]

```dax
IF(NOT(AND(Opportunity[DATE_LAST_REVIEWED]>(TODAY()-90),Opportunity[DATE_LAST_REVIEWED]<TODAY()))&&ISBLANK(Opportunity[DEAL_REVIEWED_BY]),"Deal Not Reviewed","No")
```

#### Opportunity.[OCC_Deal Reviewed]

```dax
IF(AND(Opportunity[DATE_LAST_REVIEWED]>(TODAY()-90),Opportunity[DATE_LAST_REVIEWED]<TODAY())&&NOT(ISBLANK(Opportunity[DEAL_REVIEWED_BY])),"Deal Reviewed","No")
```

#### Opportunity.[OCC_Deal Reviewed < 30 Days]

```dax
IF(AND(Opportunity[DATE_LAST_REVIEWED]>(TODAY()-30),Opportunity[DATE_LAST_REVIEWED]<TODAY())&&NOT(ISBLANK(Opportunity[DEAL_REVIEWED_BY])),"Deal Reviewed < 30 Days","No")
```

#### Opportunity.[OCC_Deal Reviewed < 7 Days]

```dax
IF(AND(Opportunity[DATE_LAST_REVIEWED]>(TODAY()-7),Opportunity[DATE_LAST_REVIEWED]<TODAY())&&NOT(ISBLANK(Opportunity[DEAL_REVIEWED_BY])),"Deal Reviewed < 7 Days","No")
```

#### Opportunity.[OCC_No Business Driver]

```dax
IF(ISBLANK(Opportunity[BUSINESS_DRIVER]),"No Business Driver","No")
```

#### Opportunity.[SC Tech Win]

```dax
IF( Opportunity[SC_TECH_WIN] = "Yes", "Yes")
```

### Pay Measure (DB: vw_EBI_PAY_MEASURE) — 1 calculated columns

#### Pay Measure.[OCC_PAY_MEASURE_DISPLAY_FLAG]

```dax
IF('Pay Measure'[PAY_MEASURE_DISPLAY] /* DB: vw_EBI_PAY_MEASURE.PAY_MEASURE_DISPLAY */="ASV",1,0)
```

### Pipeline (DB: vw_TF_EBI_P2S) — 19 calculated columns

#### Pipeline.[CQ Risk Category]

```dax
SWITCH(TRUE(),
Pipeline[GEO_ADJ_COMMIT] = "Won", "Won",
Pipeline[CQ_RISK_CATEGORY] = "High Risk", "High",
Pipeline[CQ_RISK_CATEGORY] = "Low Risk", "Low",
Pipeline[CQ_RISK_CATEGORY]
)
```

#### Pipeline.[CQ Risk Category Sort]

```dax
SWITCH(TRUE(),
Pipeline[GEO_ADJ_COMMIT] = "Won", 1,
Pipeline[CQ_RISK_CATEGORY] = "High Risk", 3,
Pipeline[CQ_RISK_CATEGORY] = "Low Risk", 2,
4
)
```

#### Pipeline.[MA]

```dax
RELATED('Account Country'[MARKET_AREA] /* DB: dataset:Account_Country.MARKET_AREA */)
```

#### Pipeline.[MOPG1]

```dax
RELATED(OPG[MOPG1])
```

#### Pipeline.[OCC_DRID]

```dax
RELATED(Opportunity[DEAL_REG_ID])
```

#### Pipeline.[OCC_Deal in month 3]

```dax
IF(RELATED('Close Quarter'[MONTH_BKT] /* DB: vw_EBI_Caldate.MONTH_BKT */)="M3","Deal in month 3","No")
```

#### Pipeline.[OCC_Deals with 5+ Hygiene Flag]

```dax
var oppage = if(NOT([OCC_Opp Age >365d]="No"),1,0)
var stage_120 = if(NOT(Pipeline[OCC_Stage Duration > 120D] = "No"),1,0)
var notProg = if(NOT(Pipeline[OCC_Not Progressed in 60D]="No"),1,0)
var noBiz = if(NOT(RELATED(Opportunity[OCC_No Business Driver])="No"),1,0)
var dealin3 = if(NOT(Pipeline[OCC_Deal in month 3]="No"),1,0)
var nomut = if(NOT(Pipeline[OCC_No Mutual Plan in S5+]="No"),1,0)
var nomgrrev = IF(NOT(Pipeline[OCC_No Mgr Review (+250k deals)]="No"),1,0)
var nopart = IF(NOT(Pipeline[OCC_No Partner Attach (+100k)]="No"),1,0)
var sumhyg = oppage+stage_120+notProg+noBiz+dealin3+nomut+nomgrrev+nopart
return if(sumhyg>5,"Deals with 5+ Hygiene Flag","No")
```

#### Pipeline.[OCC_No IPOV in S5+]

```dax
IF(ISBLANK(Related(Opportunity[IPOV_STATUS]))&&RELATED('Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */)="S5+","No IPOV in S5+","No")
```

#### Pipeline.[OCC_No Mgr Review (+250k deals)]

```dax
IF(ISBLANK(RELATED(Opportunity[DEAL_REVIEWED_BY]))&&Pipeline[OPPTY]>250000,"No Mgr Review (+250k deals)","No")
```

#### Pipeline.[OCC_No Mutual Plan in S5+]

```dax
IF(Not(Related(Opportunity[MUTUAL_PLAN_STATUS]) in {"Completed - Delivered","Customer Approved","Not Required"})&&RELATED('Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */)="S5+","No Mutual Plan in S5+","No")
```

#### Pipeline.[OCC_No Partner Attach (+100k)]

```dax
IF(ISBLANK(RELATED(Opportunity[SOURCING_PARTNER_NAME]))&&ISBLANK(RELATED(Opportunity[SELLING_PARTNER_NAME]))&&ISBLANK(RELATED(Opportunity[CO_SELLING_PARTNER_NAME]))&&ISBLANK(RELATED(Opportunity[MSFT_PARTNER]))&&Pipeline[OPPTY]>100000,"No Partner Attach (+100k)","No")
```

#### Pipeline.[OCC_No Power aligned in S5+]

```dax
IF(ISBLANK(Related(Opportunity[POWER]))&&RELATED('Sales Stage'[SALES_STAGE_GROUP] /* DB: vw_EBI_SALES_STAGE.SalesStageGrp */)="S5+","No Power aligned in S5+","No")
```

#### Pipeline.[OCC_Not Progressed in 30D]

```dax
IF(Pipeline[STAGE_AGE]>=30,"Not Progressed in 30D","No")
```

#### Pipeline.[OCC_Not Progressed in 60D]

```dax
IF(Pipeline[STAGE_AGE]>=60,"Not Progressed in 60D","No")
```

#### Pipeline.[OCC_Opp Age >365d]

```dax
IF(Pipeline[DEAL_DURATION]>365,"Opp Age>365d","No")
```

#### Pipeline.[OCC_Past Due]

```dax
IF(Related('Close Quarter'[CLOSE_DATE] /* DB: vw_EBI_Caldate.CLOSE_DATE */)<TODAY()&&(Related('Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */) in {"S3","S4","S5","S6","S7"}),"Past Due","No")
```

#### Pipeline.[OCC_Stage Duration > 120D]

```dax
IF(Pipeline[STAGE_AGE]>120,"Stage Duration > 120D","No")
```

#### Pipeline.[SUBID]

```dax
RELATED('Account Sub'[SUB_ID] /* DB: dataset:Account_Sub.SUB_ID */)
```

#### Pipeline.[Upsell_Attach_Key_Pipeline]

```dax
CONCATENATE(CONCATENATE(Pipeline[SUBID], Pipeline[MA]),Pipeline[MOPG1])
```

### Region Hierarchy (DB: vw_TD_EBI_REGION_RPT_MASKED) — 2 calculated columns

#### Region Hierarchy.[OCC_FLAG_]

```dax
IF(('Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */<>BLANK() && 'Region Hierarchy'[GLOBAL_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.GLOBAL_REGION */<>"WW PRODUCT EVANGELIST")
&& ('Region Hierarchy'[SALES_TEAM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SALES_TEAM */<>"AMER PS" && 'Region Hierarchy'[SALES_TEAM] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SALES_TEAM */<>"AMERICAS PS")
&& NOT(CONTAINSSTRING('Region Hierarchy'[SALES_REGION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.SALES_REGION */, "DME"))
--&& ('Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */="Active")
,1,
0)
```

#### Region Hierarchy.[Rep_gtm]

```dax
SWITCH('Region Hierarchy'[AT_EMP_STATUS] /* DB: vw_TD_EBI_REGION_RPT_MASKED.AT_EMP_STATUS */, "Active",'Region Hierarchy'[REP_GTM_MOTION] /* DB: vw_TD_EBI_REGION_RPT_MASKED.REP_GTM_MOTION */, BLANK())
```

### Rep Band (DB: Rep Band) — 1 calculated columns

#### Rep Band.[Attain Band]

```dax
VAR _sel = 'Rep Band'[Perf]
RETURN
SWITCH(TRUE(),
_sel >= 0.75, ">=75 Band",
_sel >= 0.5, "50 - 75 Band",
_sel >= 0.25, "25 - 50 Band",
_sel >= 0, "0 - 25 Band"
)
```

### Retention (DB: vw_TF_EBI_Retention) — 15 calculated columns

#### Retention.[ACTIVITY_KEY]

```dax
RELATED('Account Activities Metadata'[ACTIVITY_KEY])
```

#### Retention.[ACTIVITY_SOURCE_SYSTEM]

```dax
RELATED('Account Activities Metadata'[ACTIVITY_SOURCE_SYSTEM])
```

#### Retention.[Customer Solution Health]

```dax
RELATED('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */)
```

#### Retention.[GAINSIGHT_GWP_LINK]

```dax
IF (
   RELATED('Account Activities Metadata'[ACTIVITY_STATUS]) = "N/A",
   "NA",
   IF (
       'Retention'[ACTIVITY_SOURCE_SYSTEM] /* DB: vw_TF_EBI_Retention.ACTIVITY_SOURCE_SYSTEM */ = "Gainsight",
       "https://adobe.gainsightcloud.com/v1/ui/successplan#/detail/" & 'Retention'[ACTIVITY_KEY] /* DB: vw_TF_EBI_Retention.ACTIVITY_KEY */ & "/plan_info",
       IF (
           'Retention'[ACTIVITY_KEY] /* DB: vw_TF_EBI_Retention.ACTIVITY_KEY */ = "-1" && RELATED('Customer Solution Health'[SOURCE_SYSTEM] /* DB: dataset:Customer_Solution_Health.SOURCE_SYSTEM */) = "Gainsight",
           "NA",
           'Retention'[PANORAMA_ACCOUNT_LINK] /* DB: vw_TF_EBI_Retention.PANORAMA_ACCOUNT_LINK */
       )
   )
)
```

#### Retention.[Is On Time Renewal]

```dax
IF( Retention[ON TIME RENEWAL] = "Yes", "On Time Renewal")
```

#### Retention.[MA]

```dax
RELATED('Account Country'[MARKET_AREA] /* DB: dataset:Account_Country.MARKET_AREA */)
```

#### Retention.[MOPG]

```dax
RELATED(OPG[MOPG1])
```

#### Retention.[OCC_Loss Reason]

```dax
var riskpillar = Related('Retention MetaData'[RISK_PILLAR] /* DB: vw_TD_EBI_Retention_MetaData.RISK_PILLAR */)
var leadingriskdriver = RELATED('Retention MetaData'[LEADING_RISK_DRIVER_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.LEADING_RISK_DRIVER_CATEGORY */)
var closeqtrbkt = RELATED('Close Quarter JOIN'[CLOSE_QTR_BKT] /* DB: vw_EBI_Caldate.CLOSE_QTR_BKT */)
var final = if(closeqtrbkt<=0,riskpillar,leadingriskdriver)
Return if(OR(ISBLANK(final),final in {"NA","Not Applicable",""}),"NA",final)
```

#### Retention.[OOC Indicator]

```dax
IF (
    
    'Retention'[Customer Solution Health] /* DB: vw_TF_EBI_Retention.Customer Solution Health */ = "Red"
        && TODAY () - RELATED('Account Activities Metadata'[ACTIVITY_LAST_MODIFIED_ON]) > 14,
    "R > 14",
    IF (
            'Retention'[Customer Solution Health] /* DB: vw_TF_EBI_Retention.Customer Solution Health */ = "Yellow"
            && TODAY () - RELATED('Account Activities Metadata'[ACTIVITY_LAST_MODIFIED_ON]) > 30,
        "Y > 30",
        BLANK()
    )
)
```

#### Retention.[OnTime/Late Flag]

```dax
IF(Retention[ON TIME RENEWAL]="Yes", "OnTime","Late")
```

#### Retention.[Out Of Compliance]

```dax
Var DateDiff_with_GWP = DATEDIFF(RELATED('Account Activities Metadata'[ACTIVITY_LAST_MODIFIED_ON]),TODAY(),DAY)

Var DateDiff_without_GWP = Retention[DAYS_SINCE_SOL_HEALTH_MODIFED]

RETURN
   
    
    IF(
    DateDiff_with_GWP > 14 && RELATED('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */) = "Red" && RELATED('Account Activities Metadata'[ACTIVITY_STATUS])<>"N/A","Yes",
    /*IF(
        DateDiff_without_GWP > 14 && RELATED('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */) = "Red" && RELATED('Account Activities Metadata'[ACTIVITY_STATUS])="N/A","Yes",*/
    IF(
    DateDiff_with_GWP > 30 && RELATED('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */) = "Yellow" && RELATED('Account Activities Metadata'[ACTIVITY_STATUS])<>"N/A","Yes",
    /*IF(
        DateDiff_without_GWP >30 && RELATED('Customer Solution Health'[CUSTOMER_SOLUTION_HEALTH] /* DB: dataset:Customer_Solution_Health.CUSTOMER_SOLUTION_HEALTH */) = "Yellow" && RELATED('Account Activities Metadata'[ACTIVITY_STATUS])="N/A","Yes" ,*/
        
        BLANK()))
```

#### Retention.[PANORAMA_ACCOUNT_LINK]

```dax
RELATED(Account[PANORAMA_ACCOUNT_LINK])
```

#### Retention.[SUB]

```dax
RELATED('Account Sub'[SUB_ID] /* DB: dataset:Account_Sub.SUB_ID */)
```

#### Retention.[Upsell_Attach_Key_Ren]

```dax
CONCATENATE(CONCATENATE(Retention[SUB],Retention[MA]),Retention[MOPG])
```

#### Retention.[ret_acc_opg_key]

```dax
CONCATENATE(RELATED(OPG[PANORAMA_SOLUTION]),Retention[ACCOUNT_ID])
```

### Retention MetaData (DB: vw_TD_EBI_Retention_MetaData) — 10 calculated columns

#### Retention MetaData.[LTG/LTG OVERDUE Flag]

```dax
IF('Retention MetaData'[OUTLOOK_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.OUTLOOK_CATEGORY */="Left To Go"
&& 'Retention MetaData'[SERVICE_END_DATE] /* DB: vw_TD_EBI_Retention_MetaData.SERVICE_END_DATE */<TODAY() , "LTG Overdue", if('Retention MetaData'[OUTLOOK_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.OUTLOOK_CATEGORY */= "Left To Go" , "Left To Go", "Blank"))
```

#### Retention MetaData.[Normalized_RBOB Band_Sort]

```dax
SWITCH(
    TRUE(),
    'Retention MetaData'[RBOB_BAND] /* DB: vw_TD_EBI_Retention_MetaData.RBOB_BAND */ IN { "0-25K", "25K-50K", "Sub 50K" },  1,
    'Retention MetaData'[RBOB_BAND] /* DB: vw_TD_EBI_Retention_MetaData.RBOB_BAND */  IN { "50K-100K", "50K - 100K" }, 2,
    'Retention MetaData'[RBOB_BAND] /* DB: vw_TD_EBI_Retention_MetaData.RBOB_BAND */  IN { "100K-250K", "100K - 250K" },3,
    'Retention MetaData'[RBOB_BAND] /* DB: vw_TD_EBI_Retention_MetaData.RBOB_BAND */ = "250K+",4,
    'Retention MetaData'[RBOB_BAND] /* DB: vw_TD_EBI_Retention_MetaData.RBOB_BAND */ = "250K-500K", 5,
    'Retention MetaData'[RBOB_BAND] /* DB: vw_TD_EBI_Retention_MetaData.RBOB_BAND */ = "500K-1M", 6,
    'Retention MetaData'[RBOB_BAND] /* DB: vw_TD_EBI_Retention_MetaData.RBOB_BAND */ = "1M-3M", 7,
    'Retention MetaData'[RBOB_BAND] /* DB: vw_TD_EBI_Retention_MetaData.RBOB_BAND */ = "3M-5M", 8,
    'Retention MetaData'[RBOB_BAND] /* DB: vw_TD_EBI_Retention_MetaData.RBOB_BAND */ = "5M-10M", 9,
    'Retention MetaData'[RBOB_BAND] /* DB: vw_TD_EBI_Retention_MetaData.RBOB_BAND */ = "10M-20M", 10,
    'Retention MetaData'[RBOB_BAND] /* DB: vw_TD_EBI_Retention_MetaData.RBOB_BAND */ = "20M+", 11,
    99
)
```

#### Retention MetaData.[Normalized_RBOB_Band]

```dax
SWITCH(
    
    TRUE(),
    'Retention MetaData'[RBOB_BAND] /* DB: vw_TD_EBI_Retention_MetaData.RBOB_BAND */ IN { "0-25K", "25K-50K", "Sub 50K" }, "0-50K",
    'Retention MetaData'[RBOB_BAND] /* DB: vw_TD_EBI_Retention_MetaData.RBOB_BAND */  IN { "50K-100K", "50K - 100K" }, "50K-100K",
    'Retention MetaData'[RBOB_BAND] /* DB: vw_TD_EBI_Retention_MetaData.RBOB_BAND */  IN { "100K-250K", "100K - 250K" }, "100K-250K",
    'Retention MetaData'[RBOB_BAND] /* DB: vw_TD_EBI_Retention_MetaData.RBOB_BAND */ = "250+", "250K+",
    
    -- Keep clean values as-is
    'Retention MetaData'[RBOB_BAND] /* DB: vw_TD_EBI_Retention_MetaData.RBOB_BAND */
)
```

#### Retention MetaData.[OCC_Close in <30 Days]

```dax
IF('Retention MetaData'[OUTLOOK_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.OUTLOOK_CATEGORY */="Left To Go"&&'Retention MetaData'[SERVICE_END_DATE] /* DB: vw_TD_EBI_Retention_MetaData.SERVICE_END_DATE */<TODAY()-30,"Close in <30 Days","No")
```

#### Retention MetaData.[OCC_Closed]

```dax
IF('Retention MetaData'[OUTLOOK_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.OUTLOOK_CATEGORY */="Closed","Closed","No")
```

#### Retention MetaData.[OCC_IC]

```dax
IF('Retention MetaData'[RENEWAL_EVENT] /* DB: vw_TD_EBI_Retention_MetaData.RENEWAL_EVENT */="CQ Baseline Average","IC","No")
```

#### Retention MetaData.[OCC_LTG]

```dax
IF('Retention MetaData'[OUTLOOK_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.OUTLOOK_CATEGORY */="Left to Go","LTG","No")
```

#### Retention MetaData.[OCC_OOC]

```dax
IF('Retention MetaData'[RENEWAL_EVENT] /* DB: vw_TD_EBI_Retention_MetaData.RENEWAL_EVENT */="Out of Cycle","OOC","No")
```

#### Retention MetaData.[OCC_Past Due]

```dax
IF('Retention MetaData'[OUTLOOK_CATEGORY] /* DB: vw_TD_EBI_Retention_MetaData.OUTLOOK_CATEGORY */="Left to Go"&&'Retention MetaData'[SERVICE_END_DATE] /* DB: vw_TD_EBI_Retention_MetaData.SERVICE_END_DATE */<TODAY(),"Past Due","No")
```

#### Retention MetaData.[OCC_Trailing]

```dax
IF('Retention MetaData'[RENEWAL_EVENT] /* DB: vw_TD_EBI_Retention_MetaData.RENEWAL_EVENT */="PQ Trailing","Trailing","No")
```

### Role Coverage (DB: dataset:Role_Coverage) — 1 calculated columns

#### Role Coverage.[DMX_col]

```dax
IF('Role Coverage'[ROLE_COVERAGE] /* DB: dataset:Role_Coverage.ROLE_COVERAGE */ in {"AE DX", "QBSR DX"}, "DMX", "Others")
```

### Sales Stage (DB: vw_EBI_SALES_STAGE) — 1 calculated columns

#### Sales Stage.[No Pipe]

```dax
Var s3_s7 =
CALCULATE(
	[OPPTY $],
	'Sales Stage'[SALES_STAGE] /* DB: vw_EBI_SALES_STAGE.SALES_STAGE */ IN { "S3", "S4", "S5", "S6", "S7" }
)

RETURN
IF(s3_s7=0,"No Pipe","No")
```

### TM1 Bookings (DB: dataset:TM1_Bookings) — 1 calculated columns

#### TM1 Bookings.[Dummy]

```dax
"NA"
```

### TPT (DB: dataset:TPT) — 2 calculated columns

#### TPT.[Fit Score TPT]

```dax
RELATED('Customer Profile Attributes'[FIT_SCORE] /* DB: dataset:Customer_Profile_Attributes.FIT_SCORE */)
```

#### TPT.[MOPG TPT]

```dax
RELATED(OPG[MOPG1])
```

### TPT Metadata (DB: dataset:TPT_Metadata) — 7 calculated columns

#### TPT Metadata.[Is_Pipe_ARR]

```dax
IF(OR('TPT Metadata'[HAS_PIPE_ARR_RBOB_OPP_TARGET_AT_PRNT] /* DB: dataset:TPT_Metadata.HAS_PIPE_ARR_RBOB_OPP_TARGET_AT_PRNT */ = 1,
    'TPT Metadata'[HAS_PIPE_ARR_RBOB_OPP_TARGET_AT_SUB] /* DB: dataset:TPT_Metadata.HAS_PIPE_ARR_RBOB_OPP_TARGET_AT_SUB */ = 1),
    1, 0
)
```

#### TPT Metadata.[Parent No Pipe]

```dax
IF('TPT Metadata'[IS_PIPE_AT_PRNT_CNTRY] /* DB: dataset:TPT_Metadata.IS_PIPE_AT_PRNT_CNTRY */ = 0, "No Pipe", BLANK())
```

#### TPT Metadata.[Parent Tier]

```dax
VAR _Parent = 'TPT Metadata'[CLEANED_PARENT_TIER] /* DB: dataset:TPT_Metadata.CLEANED_PARENT_TIER */
RETURN
SWITCH(TRUE(),
    _Parent = "Tier 1", "Tier 1",
    _Parent = "Tier 2", "Tier 2",
    _Parent = "Tier 3", "Tier 3",
    "Others"
)
```

#### TPT Metadata.[Parent Tier Sort]

```dax
VAR _Parent = 'TPT Metadata'[CLEANED_PARENT_TIER] /* DB: dataset:TPT_Metadata.CLEANED_PARENT_TIER */
RETURN
SWITCH(TRUE(),
    _Parent = "Tier 1", 1,
    _Parent = "Tier 2", 2,
    _Parent = "Tier 3", 3,
    5
)
```

#### TPT Metadata.[Sub No Pipe]

```dax
IF('TPT Metadata'[IS_PIPE_AT_SUB_MOPG1_CNTRY] /* DB: dataset:TPT_Metadata.IS_PIPE_AT_SUB_MOPG1_CNTRY */ = 0, "No Pipe", BLANK())
```

#### TPT Metadata.[Sub Tier]

```dax
VAR _sub = 'TPT Metadata'[CLEANED_SUB_TIER] /* DB: dataset:TPT_Metadata.CLEANED_SUB_TIER */
RETURN
SWITCH(TRUE(),
    _sub = "Tier 1", "Tier 1",
    _sub = "Tier 2", "Tier 2",
    _sub = "Tier 3", "Tier 3",
    _sub = "Ties to Parent", "Ties to Parent",
    "Others"
)
```

#### TPT Metadata.[Sub Tier Sort]

```dax
VAR _sub = 'TPT Metadata'[CLEANED_SUB_TIER] /* DB: dataset:TPT_Metadata.CLEANED_SUB_TIER */
RETURN
SWITCH(TRUE(),
    _sub = "Tier 1", 1,
    _sub = "Tier 2", 2,
    _sub = "Tier 3", 3,
    _sub = "Ties to Parent", 4,
    5
)
```

### Target Type (DB: vw_TD_EBI_TARGET_TYPE) — 1 calculated columns

#### Target Type.[OCC_TARGET_TYPE_FLAG]

```dax
IF('TARGET TYPE'[ID]=58,1,0)
```

---

## 4. Relationships (254 total)

### 4.1 Star Schema FK Patterns (most common)

| FK Column | Dimension (DB View) | PK | Fact Tables Using It |
|---|---|---|---|
| REGION_ID | Region Hierarchy (vw_TD_EBI_REGION_RPT_MASKED) | REGION_ID | Plan & QRF, Quota, Enablement, Pipe Walk, Renewals Target (+10 more) |
| OPG_ID | OPG (vw_EBI_OPG) | OPG_ID | Pipeline, Plan & QRF, Quota, Retention, Pipe Walk (+9 more) |
| REPORTING_HIERARCHY_ID | Reporting Hierarchy (VW_TD_EBI_REPORTING_HIERARCHY) | REPORTING_HIERARCHY_ID | Pipeline, Plan & QRF, Quota, Retention, Pipe Walk (+6 more) |
| SEGMENT_ID | Segment (vw_EBI_SEGMENT) | SEGMENT_ID | Plan & QRF, Quota, vw_EBI_PROJECTION_CLOSE_RATIO, Pipe Walk, Renewals Target (+6 more) |
| ACCOUNT_ID | Account (vw_TD_EBI_ACCOUNT) | ACCOUNT_ID | Pipeline, Retention, Pipe Walk, Account ARR, Customer Solution Health Movement (+4 more) |
| ROLE_COVERAGE_ID | Role Coverage (dataset:Role_Coverage) | ROLE_COVERAGE_ID | Pipeline, Plan & QRF, Retention, Renewals Target, Account ARR (+4 more) |
| CUSTOMER_HEALTH_ID | Customer Health (dataset:Customer_Health) | CUSTOMER_HEALTH_ID | Pipeline, Retention, Account ARR, SBR Activities, Customer Health Movement (+2 more) |
| SNAPSHOT_DATE_ID | Snapshot Quarter (vw_EBI_Caldate) | DATE_KEY | Pipeline, Pipe Walk, Pacing Targets, App Inputs, Retention (+1 more) |
| TPT_ID | TPT Metadata (dataset:TPT_Metadata) | TPT_ID | Pipeline, Retention, TPT, TM1 Bookings, Account ARR (+1 more) |
| DEAL_TYPE_ID | Deal Type (vw_EBI_DEAL_TYPE) | DEAL_TYPE_ID | Pipeline, Plan & QRF, Quota, Pipe Walk, TM1 Bookings |
| OPP_ID | Opportunity (vw_TD_EBI_OPP) | OPP_ID | Pipeline, Retention, Pipe Walk, TM1 Bookings, DRF Pillars |
| COUNTRY_ID | Account Country (dataset:Account_Country) | COUNTRY_ID | Account ARR, SBR Activities, TPT, Account Activities, Lead |
| CREATOR_TYPE_ID | Creator Type (vw_EBI_CREATOR_TYPE) | CREATOR_TYPE_ID | Pipeline, Quota, Pipe Walk, TM1 Bookings |
| REVENUE_TYPE_ID | Revenue Type (vw_EBI_REVENUE_TYPE) | ID | Pipeline, Plan & QRF, Quota, Pipe Walk |
| FOCUS_VERTICAL_ID | Focus Vertical (vw_EBI_FOCUS_VERTICAL) | FOCUS_VERTICAL_ID | Pipeline, Plan & QRF, Quota, Pipe Walk |
| SALES_MOTION_ID | Sales Motion (vw_TD_EBI_SALES_MOTION) | SALES_MOTION_ID | Pipeline, Plan & QRF, Quota, Pipe Walk |
| PAY_MEASURE_ID | Pay Measure (vw_EBI_PAY_MEASURE) | ID | Pipeline, Plan & QRF, Quota, Pipe Walk |
| GTM_MOTION_ID | GTM Motion (vw_EBI_GTM_MOTION) | GTM_MOTION_ID | Pipeline, Plan & QRF, Quota, Retention |
| SOLUTION_HEALTH_ID | Customer Solution Health (dataset:Customer_Solution_Health) | CUSTOMER_SOLUTION_HEALTH_ID | Pipeline, Retention, Account ARR, TM1 Bookings |
| ACCOUNT_SUB_ID | Account Sub (dataset:Account_Sub) | ACCOUNT_SUB_ID | Account, SBR Activities, TPT, Account Activities |
| CLOSE_DATE_ID | Close Quarter (vw_EBI_Caldate) | DATE_KEY | Pipe Walk, SBR Activities, Lead, Performance Historic |
| AES_SCORE_ID | Account Engagement Stage (dataset:Account_Engagement_Stage) | AES_SCORE_ID | Pipeline, Retention, Account ARR, TPT |
| UCP_ICP_SCORE_ID | Customer Profile Attributes (dataset:Customer_Profile_Attributes) | SCORE_ID | Pipeline, Account ARR, TPT, Retention |
| SUB_MA_ID | Account Sub Market Area Metadata (dataset:Account_Sub_MA_Metadata) | SUB_MA_ID | Pipeline, Retention, Account ARR, TPT |
| SALES_STAGE_ID | Sales Stage (vw_EBI_SALES_STAGE) | SALES_STAGE_ID | Pipeline, TM1 Bookings, Lead |
| CONSULTING_SEGMENT_ID | Consulting Segment (vw_EBI_CONSULTING_SEGMENT) | ID | Pipeline, Plan & QRF, Pipe Walk |
| ACCOUNT_COUNTRY_ID | Account Country (dataset:Account_Country) | COUNTRY_ID | Pipeline, Retention, TM1 Bookings |
| AE_REGION_ID | AE Region Hierarchy (dataset:AE_Region_Hierarchy) | AE_REGION_ID | Retention, Customer Solution Health Movement, TM1 Bookings |
| SUB_MA_SOLUTION_ID | Account Sub Market Area Solution Metadata (dataset:Account_Sub_MA_Solution_Metadata) | SUB_MA_SOLUTION_ID | Pipeline, Retention, Account ARR |
| OPP_CREATE_DATE_ID | Qualification Quarter (vw_EBI_Caldate) | DATE_KEY | Pipeline, TM1 Bookings |

### 4.2 Special Relationships

| From | Column | To | Column | Type | Filter |
|---|---|---|---|---|---|
| Pipeline | P2S_ID | vw_TF_EBI_P2S_LATEST_ATTRIBUTE | P2S_ID | 1:1 | Both |
| Account | ACCOUNT_SUB_ID | Account Sub | ACCOUNT_SUB_ID | M:1 | Both |
| Region Hierarchy | SALES_REGION | SalesRegion | SALESREGION | M:1 | Both |
| Region Hierarchy | SALES_TEAM | SalesTeam | SALESTEAM | M:1 | Both |
| Commit Type | COMMIT_TYPE | Commit Type RLS | COMMIT_TYPE | M:M | Single |
| vw_EBI_PROJECTION_CLOSE_RATIO | SALES_TEAM | Region Hierarchy | SALES_TEAM | M:M | Both |
| App Inputs | EMP_ID | Region Hierarchy | REP_ID | M:M | Single |
| Snapshot Switch Quarter | DATE_KEY | Snapshot Quarter | DATE_KEY | M:1 | Both |
| SBR Activities | SBR_ACTIVITY_ID | SBR Metadata | SBR_ACTIVITY_ID | 1:1 | Both |
| Time_dim_week | nan | Snapshot Quarter | DATE_KEY | 1:1 | Both |
| dim_param_vp | Level2 | nan | Parameter | 1:1 | Both |
| Dim_Param_L3_Coverage | Level2 | nan | Parameter_Coverage | 1:1 | Both |
| OPG | MOPG1 | MOPG SORT | MOPG1 | M:1 | Both |
| Region Hierarchy | SLM_LDAP | nan | nan | M:1 | Both |
| Region Hierarchy | SLM_LDAP | nan | nan | M:1 | Both |
| Close Quarter | CLOSE_YR_AND_QTR | Close Quarter JOIN | CLOSE_YR_AND_QTR | M:M | Both |

---

## 5. OCC-Local Parameter Tables

These tables are defined locally in OCC (not from the dataset) for UI navigation and filtering.

| Table | Purpose |
|---|---|
| _OCC Measures | Measure-only table (DAX measures container) |
| dim_param_vp | Navigation parameter table for UI drill-down |
| OCC_Pipe_Cov_L3 Measures | Measure-only table (DAX measures container) |
| Dim_Param_L3_Coverage | Navigation parameter table for UI drill-down |
| Dim_Parameter_Creation | Navigation parameter table for UI drill-down |
| Coming Soon Sub Creator Deal | Placeholder filter for upcoming features |
| Coming Soon Creator Deal | Placeholder filter for upcoming features |
| Coming Soon Account | Placeholder filter for upcoming features |
| Coming Soon Top10 | Placeholder filter for upcoming features |
| Coming Soon Consumption_GWP | Placeholder filter for upcoming features |
| OCC_Outlook_L3 | OCC_Outlook_L3 |
| Dim_Param_L3_Outlook | Navigation parameter table for UI drill-down |
| Geo_Adj_Sort | Geo_Adj_Sort |
| MGR_ADJ_COMMIT | MGR_ADJ_COMMIT |
| ADJ_COMMIT | ADJ_COMMIT |
| OCC_TPT Measures_Creation | Measure-only table (DAX measures container) |
| Masked_List | Masked_List |
| Dim_Parameter_Accounts | Navigation parameter table for UI drill-down |
| OCC_Accounts | OCC_Accounts |
| OCC_AccountsHealth | OCC_AccountsHealth |
| Dim_Parameter_AccountHealth | Navigation parameter table for UI drill-down |
| MOPG SORT | MOPG SORT |
| GWP Measure Table | Measure-only table (DAX measures container) |
| Linearity view measures | Measure-only table (DAX measures container) |
| OCC_Perf_L2 | OCC_Perf_L2 |
| OCC_Perf_L3 | OCC_Perf_L3 |
| Icon | Icon |
| SLM L2 Measures | Measure-only table (DAX measures container) |
| SBR Measure Table | Measure-only table (DAX measures container) |

---

## 6. Connection & Architecture

| Property | Value |
|---|---|
| Connection Type | DirectQuery to Analysis Services |
| Dataset | RTB DataVerse |
| Workspace | Sales Ops Enterprise BI |
| Dataset ID | b6c09097-4848-42b7-ae64-589fa296f21f |
| Report ID | b3045348-93b9-4025-8314-78037cab83f1 |
| Underlying DB | TAP_PROD (same as RTB) |

**Architecture:** OCC → DirectQuery → RTB DataVerse (published dataset) → TAP_PROD (SQL Server)

All data tables, base relationships, and RLS rules are defined in the RTB DataVerse dataset.
OCC adds its own measures, calculated columns, and local parameter tables on top.
