export const normalizeDebt = (debt) => ({
  ...debt,
  balance: Number(debt.balance) || 0,
  rate: Number(debt.rate) || 0,
  minPayment: Number(debt.minPayment) || 0,
  type: debt.type || 'debt',
  homeValue: Number(debt.homeValue) || 0,
  pmiRate: debt.pmiRate !== undefined ? Number(debt.pmiRate) : 0.85,
})

export const sortAvalanche = (debts) =>
  [...debts].sort((a, b) => b.rate - a.rate || a.balance - b.balance)

// Snowball: smallest balance first — costs more interest than avalanche but
// front-loads wins, which is what keeps most people on the plan.
export const sortSnowball = (debts) =>
  [...debts].sort((a, b) => a.balance - b.balance || b.rate - a.rate)

const sorterFor = (method) => (method === 'snowball' ? sortSnowball : sortAvalanche)

const cloneDebts = (debts) => debts.map((debt) => ({ ...debt }))

const monthsBetween = (start, count) => {
  const date = new Date(start)
  date.setMonth(date.getMonth() + count)
  return date
}

export const calculatePayoffPlan = (debts, monthlyIncome, maxMonthlyPayment, method = 'avalanche') => {
  const sortByMethod = sorterFor(method)
  const activeDebts = debts.map(normalizeDebt).filter((debt) => debt.balance > 0)
  if (!activeDebts.length) {
    return {
      method,
      payoffOrder: [],
      monthlyPayment: 0,
      monthsUntilPayoff: 0,
      payoffDate: null,
      paymentTooLow: false,
      minOnlyNeverEnds: false,
      totalInterest: 0,
      milestones: [],
      interestSaved: 0,
      balanceByMonth: [],
      firstDebtPaidMonth: 0,
    }
  }

  const totalMin = activeDebts.reduce((sum, debt) => sum + debt.minPayment, 0)
  const userMax = Number(maxMonthlyPayment) || 0
  const incomeFallback = Math.round((Number(monthlyIncome) || 0) * 0.3)
  const monthlyPayment = Math.max(totalMin, userMax || incomeFallback)
  const startingBalance = activeDebts.reduce((sum, debt) => sum + debt.balance, 0)
  const planDebts = cloneDebts(activeDebts)
  let month = 0
  let totalInterest = 0
  const milestones = []
  const balanceByMonth = [startingBalance]

  while (planDebts.some((debt) => debt.balance > 0) && month < 360) {
    const active = planDebts.filter((debt) => debt.balance > 0)
    const interestThisMonth = active.reduce((sum, debt) => {
      // Promo-rate debts (balance transfers): introRate until introMonths, then postRate
      const rate = debt.introMonths != null && month < debt.introMonths
        ? (debt.introRate ?? 0)
        : (debt.postRate ?? debt.rate)
      const interest = debt.balance * (rate / 100 / 12)
      debt.balance += interest
      return sum + interest
    }, 0)

    // PMI: deduct from payment budget for mortgages above 80% LTV
    let pmiThisMonth = 0
    active.forEach((debt) => {
      if (debt.type === 'mortgage' && debt.homeValue > 0 && debt.balance > debt.homeValue * 0.8) {
        pmiThisMonth += debt.balance * ((debt.pmiRate || 0.85) / 100 / 12)
      }
    })

    totalInterest += interestThisMonth + pmiThisMonth
    let paymentBudget = monthlyPayment - pmiThisMonth

    const paymentOrder = sortByMethod(active)
    for (const debt of paymentOrder) {
      if (paymentBudget <= 0) break
      const minDue = Math.min(debt.minPayment, debt.balance)
      const minPaid = Math.min(paymentBudget, minDue)
      debt.balance -= minPaid
      paymentBudget -= minPaid
    }

    while (paymentBudget > 0) {
      const nextDebt = sortByMethod(planDebts.filter((debt) => debt.balance > 0))[0]
      if (!nextDebt) break
      const extraPaid = Math.min(paymentBudget, nextDebt.balance)
      nextDebt.balance -= extraPaid
      paymentBudget -= extraPaid
    }

    const paidOff = planDebts.filter((debt) => debt.balance <= 0 && !debt.__paidAt)
    paidOff.forEach((debt) => {
      debt.__paidAt = month + 1
      milestones.push({
        label: `${debt.name} paid off`,
        month: debt.__paidAt,
      })
    })

    // PMI elimination milestone
    planDebts.forEach((debt) => {
      if (
        debt.type === 'mortgage' &&
        debt.homeValue > 0 &&
        !debt.__pmiRemovedAt &&
        debt.balance > 0 &&
        debt.balance <= debt.homeValue * 0.8
      ) {
        debt.__pmiRemovedAt = month + 1
        const monthlySaving = Math.round(debt.balance * ((debt.pmiRate || 0.85) / 100) / 12)
        milestones.push({
          label: `${debt.name || 'Mortgage'} PMI eliminated — saving ~$${monthlySaving}/mo`,
          month: debt.__pmiRemovedAt,
          type: 'pmi',
        })
      }
    })

    if ((month + 1) % 3 === 0 || paidOff.length) {
      const remaining = planDebts.reduce((sum, debt) => sum + Math.max(debt.balance, 0), 0)
      const progress = 100 - Math.round((remaining / startingBalance) * 100)
      milestones.push({
        label: `Progress: ${progress}% paid`,
        month: month + 1,
      })
    }

    balanceByMonth.push(planDebts.reduce((sum, debt) => sum + Math.max(debt.balance, 0), 0))
    month += 1
  }

  const monthsUntilPayoff = planDebts.every((debt) => debt.balance <= 0) ? month : 0
  const payoffDate = monthsUntilPayoff
    ? monthsBetween(new Date(), monthsUntilPayoff).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null

  // If the plan never terminates (payment doesn't cover interest), the interest
  // totals are runaway compounding artifacts, not projections — don't report them.
  const paymentTooLow = !monthsUntilPayoff
  const minOnly = calculateMinOnlyInterest(activeDebts)
  // interestSaved is a number only when both simulations reach zero; null means
  // "minimums alone never pay this off" — display sites say that instead.
  const minOnlyNeverEnds = !minOnly.terminated
  const interestSaved = paymentTooLow || minOnlyNeverEnds
    ? null
    : Math.round(Math.max(0, minOnly.totalInterest - totalInterest))

  // Compute the optimized per-debt payment split for month 1
  const sortedForAlloc = sortByMethod(activeDebts)
  const totalPmiAlloc = sortedForAlloc.reduce((sum, d) => {
    if (d.type === 'mortgage' && d.homeValue > 0 && d.balance > d.homeValue * 0.8) {
      return sum + d.balance * ((d.pmiRate || 0.85) / 100 / 12)
    }
    return sum
  }, 0)
  const totalMinAlloc = sortedForAlloc.reduce((sum, d) => sum + d.minPayment, 0)
  const extraAlloc = Math.max(0, monthlyPayment - totalMinAlloc - totalPmiAlloc)

  const monthlyAllocation = sortedForAlloc.map((d, i) => {
    const pmi =
      d.type === 'mortgage' && d.homeValue > 0 && d.balance > d.homeValue * 0.8
        ? Math.round(d.balance * ((d.pmiRate || 0.85) / 100 / 12))
        : 0
    const extra = i === 0 ? Math.round(extraAlloc) : 0
    return { id: d.id, name: d.name, rate: d.rate, minimum: d.minPayment, extra, pmi, total: d.minPayment + extra, isTarget: i === 0 }
  })

  const firstDebtPaidMonth = planDebts.reduce(
    (min, debt) => (debt.__paidAt && (!min || debt.__paidAt < min) ? debt.__paidAt : min),
    0,
  )

  return {
    method,
    payoffOrder: sortByMethod(activeDebts).map((debt) => ({
      ...debt,
      originalBalance: debt.balance,
      rate: debt.rate,
      minPayment: debt.minPayment,
    })),
    monthlyPayment,
    monthsUntilPayoff,
    payoffDate,
    paymentTooLow,
    minOnlyNeverEnds,
    totalInterest: paymentTooLow ? 0 : Math.round(totalInterest),
    milestones,
    interestSaved,
    monthlyAllocation,
    balanceByMonth,
    firstDebtPaidMonth,
  }
}

// Both strategies side by side, so the user can make an informed choice:
// avalanche minimizes interest, snowball reaches its first payoff sooner.
export const comparePlans = (debts, monthlyIncome, maxMonthlyPayment) => ({
  avalanche: calculatePayoffPlan(debts, monthlyIncome, maxMonthlyPayment, 'avalanche'),
  snowball: calculatePayoffPlan(debts, monthlyIncome, maxMonthlyPayment, 'snowball'),
})

// What happens if one debt is moved to a balance-transfer card: the fee is
// added to the balance up front, 0% during the intro window, offer APR after.
// Returns the full re-simulated plan so callers can diff date and interest.
export const simulateTransfer = (debts, targetId, { introMonths, feePct, postApr }, monthlyIncome, maxMonthlyPayment, method) => {
  const modified = debts.map((debt) => {
    if (debt.id !== targetId) return debt
    return {
      ...debt,
      balance: Number(debt.balance) * (1 + Number(feePct) / 100),
      introMonths: Number(introMonths),
      introRate: 0,
      postRate: Number(postApr),
    }
  })
  return calculatePayoffPlan(modified, monthlyIncome, maxMonthlyPayment, method)
}

// Baseline: each debt receives only its own minimum payment, no avalanche extra.
// If any balance is still growing after 40 years, minimums alone never reach zero
// and the accumulated interest is a compounding artifact, not a comparison figure.
const calculateMinOnlyInterest = (debts) => {
  const planDebts = cloneDebts(debts)
  let totalInterest = 0
  let month = 0

  while (planDebts.some((debt) => debt.balance > 0) && month < 480) {
    for (const debt of planDebts) {
      if (debt.balance <= 0) continue
      const interest = debt.balance * (debt.rate / 100 / 12)
      totalInterest += interest
      debt.balance += interest
      debt.balance -= Math.min(debt.minPayment, debt.balance)
    }
    month += 1
  }

  const terminated = planDebts.every((debt) => debt.balance <= 0)
  return { totalInterest, terminated }
}

export const simulateExtraPayment = (debts, extraAmount) => {
  const activeDebts = debts.map(normalizeDebt).filter((debt) => debt.balance > 0)
  if (!activeDebts.length) {
    return null
  }

  const simulatedDebts = cloneDebts(activeDebts)
  const monthlyPayment = simulatedDebts.reduce((sum, debt) => sum + debt.minPayment, 0) + Number(extraAmount || 0)
  let month = 0

  while (simulatedDebts.some((debt) => debt.balance > 0) && month < 360) {
    const active = simulatedDebts.filter((debt) => debt.balance > 0)
    active.forEach((debt) => {
      const interest = debt.balance * (debt.rate / 100 / 12)
      debt.balance += interest
    })

    let paymentBudget = monthlyPayment
    const order = sortAvalanche(active)
    for (const debt of order) {
      if (paymentBudget <= 0) break
      const payment = Math.min(debt.balance, paymentBudget)
      debt.balance -= payment
      paymentBudget -= payment
    }

    month += 1
  }

  return month < 360 ? month : null
}
