# Strategic Analysis Framework for Pipeline Questions

This document defines the three-tier analytical framework used to classify, research, and generate insights for pipeline questions. It is consumed by the classify node (for question categorization), the research agent (for category-specific research strategies), and the present node (for strategic insight generation and follow-up suggestions).

## Question Category Taxonomy

### A) WHAT_HAPPENED — Facts, State, Trends

Questions that describe the current pipeline status, movement, and trends. Answered from standard reporting without interpretation.

**Sub-Categories:**

- **pipeline_level_mix**: Pipeline performance by region, segment, product, stage mix (SS1-SS5+), source (Sales/BDR/Partner), deal count / transaction count remaining.
- **pipeline_walk**: Period-over-period pipeline changes. Walk breakdown by movement type (created, progressed-in, pulled-in, pushed, lost/cleanup). Walk by mature vs non-mature (S3-S4 BOQ vs SS5+ BOQ). Walk by forecast commit category.
- **coverage_creation**: Pipeline coverage and creation comparisons vs last 4 quarters average, YoY, and at same week-in-quarter. SS5 coverage comparisons. Rolling 4Q pipeline growth QoQ/YoY.
- **deal_lists**: Lists of stalled deals, pushed deals, lost deals with reasons. Top deals by ARR that are late-stage and pushed multiple times. Lost deals by stage-at-loss + reason category.

**Example Questions:**

- What is the pipeline performance for Q2'26 by region, by segment?
- Pipeline walk for Q2?
- How is pipeline coverage compared to last 4 quarters average?
- Give me the list of top stalled deals by ARR

### B) WHY — Diagnosis, Drivers, Signals

Questions that focus on root causes of coverage gaps, weak progression, stalls, and slippage.

**Sub-Categories:**

- **gap_drivers**: What is driving pipeline shortfalls by region/segment/product. Is the gap driven more by creation miss or progression/slippage. Concentration risk (over-reliance on a small number of deals).
- **stall_push_risk**: Which deals are at risk and why. Push reason distributions (customer readiness, budget, legal/procurement, competition, no access to power, no mutual plan). Stall reasons by stage (SS3 vs SS4 vs SS5+). Correlation of stalls with missing fundamentals (BANT, mutual plan, IPOV, access to power).
- **signals**: Which signals indicate progression opportunity. Leading signals (stage momentum/progression velocity, DS Score risks/next best actions, missing plan elements, repeated push counts) vs lagging signals (coverage gap, low SS5 coverage, rolling 4Q decline). Evidence that high DS Score predicts better outcomes.
- **forecast_confidence**: Week-N SS5 pipeline conversion rate vs historical. Commit category stability for trending.

**Example Questions:**

- What is driving the pipeline shortfall by region?
- Which SS3 deals are at risk of progression and why?
- Which signals are most significant for progression opportunity?
- Is our current Week N conversion rate consistent with historical?

### C) WHAT_TO_DO — Fix, Actions, Next Steps

Questions that convert signals into prioritized actions, deal/territory focus, and operating rhythm.

**Sub-Categories:**

- **progression_actions**: Which SS3 deals can be progressed to SS4 and why. For each candidate: what is the next best action, missing prerequisite (mutual plan, power access, BANT). For at-risk deals: salvage, reposition, or exit/cleanup. S1/S2 leads that can progress to SS3.
- **creation_actions**: Which accounts to prioritize for creation (whitespace/install base signal, recent engagement, partner attach potential, product/solution propensity). Top creation motions by segment (BDR play, partner play, seller-led, solution-led) and expected yield.
- **deal_focus**: Deals to focus on based on Deal Sensei score. High-ARR deals with high DS Score but low momentum (flag for inspection). Mid-ARR deals with high momentum that could be pulled in.
- **remediation**: Standard interventions by stall reason bucket. For pushed/stalled/lost deal patterns, define playbooks.
- **outlook_views**: Standard views that answer "Is this good or bad at Week N?" by segment/region: stage mix trend by week, commit status trend by week, conversion rates from current week to EOQ.

**Example Questions:**

- Which SS3 deals can be progressed to SS4?
- If my coverage is low, which accounts to prioritize?
- Which deals to focus on based on Deal Sensei score?
- For each stall reason, what's the standard intervention?

## Benchmarks and Thresholds

### Pipeline Coverage Quality

- **Green**: Coverage Ratio >= 2.5x
- **Yellow**: Coverage Ratio >= 2.0x and < 2.5x
- **Red**: Coverage Ratio < 2.0x

### Week-in-Quarter Interpretation

When assessing "is this good or bad at Week N?", compare current metrics against the same week-in-quarter from prior 4 quarters. Key checkpoints:

- Week 4: Early-quarter health check — is creation pace on track?
- Week 7: Mid-quarter pivot point — is coverage building or eroding?
- Week 10: Late-quarter urgency — what must close vs what can be pulled in?
- Week 13: Quarter close — final execution cadence.

### Pipeline Creation (Gross Creation Coverage)

Same thresholds as coverage: Green >= 2.5x, Yellow >= 2.0x, Red < 2.0x. Target weights by quarter bucket: current quarter uses IN_QTR_GC_TARGET; future quarters use PIPE_TARGET_SURVIVAL_RATE * 0.4 (Q+1), 0.4 (Q+2), 0.14 (Q+3), 0.05 (Q+4).

## Signal Definitions

### Leading Signals (Predictive)

- **Stage momentum / progression velocity**: Deals advancing through stages faster than average.
- **Deal Sensei Score trends**: DS Score >= 65 indicates materially higher booking likelihood and lower loss rates. Falling DS Score signals risk.
- **Missing plan elements**: Absence of mutual close plan, IPOV, access to power, or BANT qualification.
- **Repeated push counts**: Deals pushed 2+ times are significantly more likely to be lost.

### Lagging Signals (Trailing)

- **Coverage gap**: Current coverage below 2.0x vs quota.
- **Low SS5+ coverage**: Insufficient late-stage pipe to cover the quarter.
- **Rolling 4Q pipeline decline**: Pipeline trending down over the last 4 quarters.
- **High NULL ratios in key fields**: Missing data in critical deal fields.

## Deal Sensei Score Interpretation

- **DS Score >= 65**: Materially higher booking likelihood, lower loss rates. Prioritize for progression.
- **DS Score 40-64**: Mixed signals. Review Top 3 risks and Next best actions from DS.
- **DS Score < 40**: High risk. Evaluate whether to invest effort or exit/cleanup.

DS Score combines: opportunity details, text fields (Next Steps, Deal Review Notes, Forecast Notes), and factor thresholds (coverage, progression, attainment, hygiene).

## Standard Interventions by Stall Reason


| Stall Reason               | Standard Intervention                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------- |
| No mutual close plan       | Mutual close plan workshop — define milestones, owners, dates                          |
| No access to power         | Executive sponsor mapping — identify and engage economic buyer                         |
| Budget unclear             | Business case / ROI framework + funding pathway discussion                             |
| Procurement/legal delay    | Early procurement engagement plan + standardized templates                             |
| Competition                | Competitive displacement strategy — differentiation, proof points, reference customers |
| Customer timing            | Reposition to next quarter with engagement plan to maintain momentum                   |
| Missing BANT qualification | BANT validation session — qualify or disqualify and cleanup                            |
| Missing IPOV               | Build IPOV — quantify pain, define outcomes, establish urgency                         |


## Follow-Up Question Progression

The natural analytical flow follows What -> Why -> Fix. After answering a question in one tier, suggest questions from the next tier:

### After WHAT_HAPPENED, suggest WHY:

- "What is pipeline coverage by region?" -> "What is driving the shortfall in [worst region]?" / "Is the gap driven by creation miss or progression?"
- "Show me stalled deals" -> "What are the top stall reasons by stage?" / "Do stalled deals correlate with missing fundamentals?"
- "Pipeline walk for Q2?" -> "Which movement types are most concerning?" / "Are pushed deals concentrated in specific segments?"

### After WHY, suggest WHAT_TO_DO:

- "Why are SS3 deals at risk?" -> "For each at-risk SS3 deal, what's the missing prerequisite?" / "Should we salvage, reposition, or exit?"
- "What's driving the shortfall?" -> "Which accounts to prioritize for pipeline creation?" / "What are the top creation motions by segment?"
- "Which signals indicate progression?" -> "Which deals to focus on based on DS Score?" / "What's the next best action for each candidate deal?"

### After WHAT_TO_DO, suggest validation:

- "Which accounts to prioritize?" -> "What is the pipeline creation trend after implementing these plays?"
- "Standard interventions for stalled deals?" -> "Track pushed deal resolution rate over next 4 weeks"

