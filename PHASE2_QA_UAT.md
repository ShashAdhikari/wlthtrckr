# Phase 2 — Money Precision — QA & UAT Record

**Date**: 2026-07-14
**Scope**: Reduce floating-point drift in financial calculations (low-risk version).
**File changed**: `app.js`

## What changed
JS binary floats can't represent most decimals exactly (`0.1 + 0.2 === 0.30000000000000004`),
and that error accumulates across sums and subtractions. Phase 2 adds a `round2(n)`
helper (round to whole cents, with an `EPSILON` nudge for half-cent cases) and applies
it **at money aggregation boundaries** in `Calc` — not a full integer-cents rewrite, so
there is **no data migration** and the change is fully reversible.

`round2` is applied to the return value of:
`recurringMonthlyIncome`, `recurringMonthlyExpenses`, `totalIncome`, `totalExpenses`,
`liquidCash`, `totalInvestments`, `totalDebt`, `netWorth`, `monthIncomeOneTime`,
`monthExpensesOneTime`, `monthIncome`, `monthExpenses`, `currentMonthIncome`,
`currentMonthExpenses`, and `safeToSpend`.

Per-item helpers (`monthlyAmount`) are intentionally left unrounded — we round the
aggregate, not each monthly-equivalent, to preserve the intended math.

## Important pre-existing behavior (not changed, not a bug)
`Fmt.money` rounds headline figures to **whole dollars** by design (`Math.round`), while
`Fmt.moneyPrecise` shows cents. So most large headline numbers look the same as before;
Phase 2's benefit is penny-accuracy in the **underlying numbers**, in `moneyPrecise`
surfaces, and in derived comparisons/thresholds (e.g. Safe-to-Spend, pulse health).

## QA — automated, performed in-environment ✅
| # | Check | Method | Result |
|---|---|---|---|
| QA-1 | `app.js` parses | `node --check app.js` | ✅ |
| QA-2 | `round2` correctness | unit test: drift, half-cent, negatives, 1e6 scale, accumulation | ✅ all pass |
| QA-3 | Integration: drift-prone recurring income computes correctly | headless Chromium, seeded 0.1 + 0.2 monthly incomes | ✅ pulse=`health-caution` (proves sts = +0.30, in 0–500 band) |
| QA-4 | No uncaught errors with seeded data | headless load | ✅ 0 page errors |
| QA-5 | No regression on empty state | re-ran Phase 1 boot test | ✅ PASS |

`round2` cases verified: `0.1+0.2→0.30`, `1.005→1.01`, `-0.1-0.2→-0.30`,
`2.675→2.68`, `1000000.1+0.2→1000000.30`, `sum(0.1 ×10)→1.00`.

## UAT — to run in a normal browser (human sign-off)
| # | Step | Expected | Pass/Fail |
|---|---|---|---|
| UAT-1 | Add two incomes of 0.10 and 0.20 | Net worth / totals reflect 0.30 with no long decimal tail anywhere it's shown with cents | ☐ |
| UAT-2 | Add several odd-cent expenses (e.g. 3.33, 3.33, 3.34) | Totals sum to exactly 10.00, not 9.9999999 | ☐ |
| UAT-3 | Check transaction rows (use cents) | Per-row amounts via `moneyPrecise` show clean 2-decimal values | ☐ |
| UAT-4 | Import a CSV with fractional amounts, then export backup | Totals stay penny-accurate; round-trip intact | ☐ |
| UAT-5 | Confirm headline figures still render as whole dollars | Unchanged from before (by design) | ☐ |

## Not changed
- No storage format change; existing `wlth_*` localStorage data works untouched.
- `Fmt.money` whole-dollar display behavior is unchanged.
