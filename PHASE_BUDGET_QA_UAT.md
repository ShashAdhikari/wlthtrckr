# Pulse/Safe-to-Spend fixes + Budget Mode — QA & UAT Record

**Date**: 2026-07-15 · **Branch**: `Experiment` · **Files**: `index.html`, `app.js`, `styles.css`

## Part A — Pulse & Safe-to-Spend (bug fixes + relocation)

### Bugs fixed
1. **`$$` double symbol**: `#safe-to-spend` markup carries its own `$`; `renderVelocity`
   also formatted with `Fmt.money` (adds `$`). Split into `UI.renderPulse()`, which sets
   `#sts-symbol` to the sign+symbol and tweens the number **symbol-less** (mirrors the
   net-worth display). Handles negatives correctly.
2. **Indicators ignored ordinary expenses**: `Calc.safeToSpend()` was recurring-only.
   Redefined to `recurringMonthlyIncome − recurringMonthlyExpenses − thisMonth's one-time
   expenses`, so it reacts to every expense. `pulseHealth()` consumes it (plus cash
   runway) and now reacts too. No change needed to the refresh wiring.

### Relocation
Moved the Pulse + Safe-to-Spend cards out of the Velocity section into a new full-width
`<section id="pulse-band">` placed **directly below the hero / Total Net Worth**, above
"Financial Overview". `#recurring-summary` and all other cards are unchanged.

## Part B — Budget Mode (new toggled screen)
- **Toggle** in the nav (`#budget-toggle`) flips `body.budget-mode`, which hides the
  dashboard sections + ticker and shows `#budget-screen` (a `#budget-back` button and the
  toggle both return). `UI.toggleBudgetMode(force?)`.
- **Categories mirror expense types** — `Calc.budgetCategories()` returns the same set the
  expense modal offers (housing, food, transport, utilities, entertainment, healthcare,
  shopping, business, other), so budgets and expenses line up.
- **Summary card on top** (`Calc.budgetSummary`): budgeted vs actual, remaining, % used,
  and an over/under status bar (green → gold ≥80% → red over).
- **Budget vs actual comparison**: one row per category with an inline monthly-budget
  input (persisted via `Store.setBudget` → `wlth_budgets`), the month's actual spend, a
  progress bar, remaining/over amount, and % — over-budget rows flagged red.
- **Period**: current month; actuals = one-time expenses dated this month + recurring
  monthly equivalents (`Calc.currentMonthExpenseByCategory`).
- Persisted in `Store.data.budgets` (`{category: amount}`); included in `saveAll()` and
  reset by `clear()`.

## QA — automated (headless Chromium) ✅
| # | Check | Result |
|---|---|---|
| 1 | `node --check app.js` | ✅ parses |
| 2 | Pulse band exists, moved out of `#velocity`, ordered before `#dashboard` | ✅ |
| 3 | Safe-to-Spend renders `$1,800` (surplus 2000 − one-time 200), **no `$$`** | ✅ |
| 4 | **Live add** $300 food expense via real Add-modal flow → STS `1800 → 1500`, no reload | ✅ |
| 5 | Budget toggle → screen visible, dashboard hidden, 9 category rows | ✅ |
| 6 | Summary computes (`$1,200 of $1,350`, remaining $150, 89% used) | ✅ |
| 7 | Over-budget row flagged (food $200/$150 → 133%, "$50 over") | ✅ |
| 8 | Editing a budget input persists to `wlth_budgets` + recomputes summary live | ✅ |
| 9 | Empty-state boot unchanged, 0 uncaught errors, graceful degradation | ✅ |

Seed used: recurring salary 3000/mo, recurring rent 1000/mo, one-time groceries 200;
budgets {food:150, housing:1200}. All figures verified consistent.

## UAT — manual checklist (networked browser)
- [ ] Add/delete ordinary expenses → Pulse color and Safe-to-Spend update immediately.
- [ ] Safe-to-Spend shows a single clean value (and `-$` when negative).
- [ ] Pulse band sits right under the net-worth number; all other cards unchanged.
- [ ] Budget toggle switches screens both ways; nav Add still works in budget mode.
- [ ] Set budgets for several categories; over-budget rows turn red; summary bar/status track.
- [ ] Reload → budgets persist. Reset All Data clears budgets too.
- [ ] Mobile width: budget summary and rows stack cleanly.
