import { useMemo, useState } from 'react'
import { useDebt } from '../context/DebtContext.jsx'

const field = (key, label, placeholder) => ({ key, label, placeholder })
const baseFields = [
  field('name',       'Debt name',       'e.g. Chase Visa'),
  field('balance',    'Balance ($)',      'e.g. 5000'),
  field('rate',       'Interest %',      'e.g. 24.99'),
  field('minPayment', 'Monthly payment', 'e.g. 150'),
]

const numVal = (debt, key) => (debt[key] === 0 ? '' : (debt[key] ?? ''))

const inputCls = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500'

const MortgageDetails = ({ debt, updateDebt }) => {
  const ltv = debt.homeValue > 0 && debt.balance > 0 ? debt.balance / debt.homeValue : null
  const pmiActive = ltv !== null && ltv > 0.8
  const monthlyPmi = pmiActive ? Math.round(debt.balance * ((debt.pmiRate || 0.85) / 100) / 12) : 0

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Mortgage details</p>
      <div className="flex flex-wrap items-end gap-4">
        <label className="block text-sm text-slate-600 dark:text-slate-400">
          Home value
          <input
            type="number"
            className="mt-1.5 block w-36 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            placeholder="e.g. 350000"
            value={debt.homeValue === 0 ? '' : debt.homeValue}
            onChange={(e) => updateDebt(debt.id, { homeValue: Number(e.target.value) })}
          />
        </label>
        <label className="block text-sm text-slate-600 dark:text-slate-400">
          PMI rate %
          <input
            type="number"
            step="0.01"
            className="mt-1.5 block w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            value={debt.pmiRate ?? 0.85}
            onChange={(e) => updateDebt(debt.id, { pmiRate: Number(e.target.value) })}
          />
        </label>
        {ltv !== null && (
          <>
            <div className="text-sm">
              <p className="text-slate-500 dark:text-slate-400">Current LTV</p>
              <p className={`mt-0.5 font-semibold ${pmiActive ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>
                {Math.round(ltv * 100)}%
                <span className="ml-1.5 font-normal text-slate-500 dark:text-slate-400">
                  {pmiActive ? '— PMI active' : '— PMI-free'}
                </span>
              </p>
            </div>
            {pmiActive && (
              <div className="text-sm">
                <p className="text-slate-500 dark:text-slate-400">Monthly PMI</p>
                <p className="mt-0.5 font-semibold text-amber-600 dark:text-amber-400">~${monthlyPmi}/mo</p>
              </div>
            )}
            {pmiActive && (
              <div className="text-sm">
                <p className="text-slate-500 dark:text-slate-400">To PMI-free</p>
                <p className="mt-0.5 font-semibold text-slate-700 dark:text-slate-300">
                  ${Math.round(debt.balance - debt.homeValue * 0.8).toLocaleString()} to go
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const EditCard = ({ debt, updateDebt, removeDebt, onDone }) => (
  <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 sm:p-5 dark:border-blue-900 dark:bg-blue-950/20">
    <div className="grid gap-4 sm:grid-cols-2">
      {baseFields.map((f) => (
        <label key={f.key} className="block text-sm font-medium text-slate-600 dark:text-slate-400">
          {f.label}
          <input
            type={f.key === 'name' ? 'text' : 'number'}
            className={inputCls}
            placeholder={f.placeholder}
            value={f.key === 'name' ? (debt[f.key] ?? '') : numVal(debt, f.key)}
            onChange={(e) =>
              updateDebt(debt.id, {
                [f.key]: f.key === 'name' ? e.target.value : Number(e.target.value),
              })
            }
          />
        </label>
      ))}
      <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
        Type
        <select
          className={inputCls}
          value={debt.type || 'debt'}
          onChange={(e) => updateDebt(debt.id, { type: e.target.value })}
        >
          <option value="debt">Loan / Card</option>
          <option value="mortgage">Mortgage</option>
        </select>
      </label>
    </div>

    {debt.type === 'mortgage' && <MortgageDetails debt={debt} updateDebt={updateDebt} />}

    <div className="mt-4 flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={() => removeDebt(debt.id)}
        className="rounded-full px-4 py-2 text-sm text-slate-400 transition hover:text-red-500"
      >
        Remove
      </button>
      <button
        type="button"
        onClick={onDone}
        className="rounded-full bg-yellow-400 px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-yellow-300"
      >
        Done
      </button>
    </div>
  </div>
)

const ViewCard = ({ debt, removeDebt, onEdit }) => {
  const ltv = debt.type === 'mortgage' && debt.homeValue > 0 && debt.balance > 0
    ? debt.balance / debt.homeValue
    : null
  const pmiActive = ltv !== null && ltv > 0.8

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => e.key === 'Enter' && onEdit()}
      className="group flex cursor-pointer items-start justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:px-6 sm:py-5 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-700"
    >
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-slate-900 sm:text-lg dark:text-slate-100">
          {debt.name || <span className="italic text-slate-400">Unnamed debt</span>}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 sm:gap-x-4 sm:text-base dark:text-slate-400">
          <span><span className="text-slate-500 dark:text-slate-400">Balance</span> ${Number(debt.balance).toLocaleString()}</span>
          <span className="text-slate-500 dark:text-slate-400">·</span>
          <span><span className="text-slate-500 dark:text-slate-400">APR</span> {debt.rate}%</span>
          <span className="text-slate-500 dark:text-slate-400">·</span>
          <span><span className="text-slate-500 dark:text-slate-400">Payment</span> ${debt.minPayment}/mo</span>
          {ltv !== null && (
            <>
              <span className="text-slate-500 dark:text-slate-400">·</span>
              <span className={pmiActive ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}>
                LTV {Math.round(ltv * 100)}%{pmiActive ? ' — PMI' : ''}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 pl-3">
        <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500 sm:inline dark:bg-slate-700 dark:text-slate-400">
          {debt.type === 'mortgage' ? 'Mortgage' : 'Loan / Card'}
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); removeDebt(debt.id) }}
          className="rounded-full p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-950/30"
          aria-label="Remove"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
          </svg>
        </button>
      </div>
    </div>
  )
}

const Calculator = () => {
  const { debts, monthlyIncome, setMonthlyIncome, maxMonthlyPayment, setMaxMonthlyPayment, addDebt, updateDebt, removeDebt, plan } = useDebt()
  const [editingIds, setEditingIds] = useState(new Set())

  const totalBalance = useMemo(
    () => debts.reduce((sum, debt) => sum + Number(debt.balance || 0), 0),
    [debts],
  )

  const totalMin = useMemo(
    () => debts.reduce((sum, debt) => sum + Number(debt.minPayment || 0), 0),
    [debts],
  )

  const income = Number(monthlyIncome) || 0
  const maxPayment = Number(maxMonthlyPayment) || 0
  const pctOfIncome = income > 0 && maxPayment > 0 ? Math.round((maxPayment / income) * 100) : null
  const belowMin = maxPayment > 0 && maxPayment < totalMin

  const handleAddDebt = () => {
    const id = addDebt()
    setEditingIds((prev) => new Set([...prev, id]))
  }

  const confirmDebt = (id) => {
    setEditingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const startEdit = (id) => {
    setEditingIds((prev) => new Set([...prev, id]))
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 text-slate-900 sm:px-6 sm:py-16 dark:text-slate-100">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-10 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-4xl dark:text-slate-100">Debt Calculator</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 sm:mt-3 sm:text-base dark:text-slate-400">
              Enter your debts and monthly income to create an avalanche payoff plan that understands your real numbers.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddDebt}
            className="inline-flex items-center justify-center rounded-full bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:hover:bg-blue-950"
          >
            + Add debt
          </button>
        </div>

        {debts.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 sm:mt-10 sm:p-12 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="mx-auto max-w-sm text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/50">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-7 w-7 text-blue-600 dark:text-blue-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <h3 className="mt-4 font-semibold text-slate-900 dark:text-slate-100">Add your first debt</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Enter your balances, interest rates, and minimum payments. We'll rank them and build your payoff plan instantly.
              </p>
              <div className="mt-5 space-y-2 text-left rounded-2xl bg-white p-4 dark:bg-slate-900">
                {['Credit card balance + APR', 'Student loan balance + rate', 'Car loan or personal loan', 'Any other debt you carry'].map((ex) => (
                  <div key={ex} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                    {ex}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddDebt}
                className="mt-5 w-full rounded-full bg-yellow-400 py-3 text-sm font-bold text-slate-900 transition hover:bg-yellow-300"
              >
                + Add your first debt
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-3 sm:mt-10">
            {debts.map((debt) =>
              editingIds.has(debt.id) ? (
                <EditCard
                  key={debt.id}
                  debt={debt}
                  updateDebt={updateDebt}
                  removeDebt={removeDebt}
                  onDone={() => confirmDebt(debt.id)}
                />
              ) : (
                <ViewCard
                  key={debt.id}
                  debt={debt}
                  removeDebt={removeDebt}
                  onEdit={() => startEdit(debt.id)}
                />
              )
            )}
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:mt-10 sm:gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:space-y-5 sm:p-6 dark:border-slate-700 dark:bg-slate-800">
            <div>
              <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Monthly income
              </label>
              <input
                type="number"
                value={monthlyIncome}
                onChange={(event) => setMonthlyIncome(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
                placeholder="e.g. 5000"
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Max monthly toward debt
                </label>
                {pctOfIncome !== null && (
                  <span className="text-sm text-slate-500 dark:text-slate-400">{pctOfIncome}% of income</span>
                )}
              </div>
              <input
                type="number"
                value={maxMonthlyPayment}
                onChange={(event) => setMaxMonthlyPayment(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
                placeholder="e.g. 1200"
              />
              {belowMin ? (
                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                  Below your total minimums (${totalMin.toLocaleString()}/mo) — plan will use minimums instead.
                </p>
              ) : maxPayment > 0 ? (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  ${(maxPayment - totalMin).toLocaleString()}/mo extra goes avalanche-first to your highest-rate debt.
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Set a limit and we'll maximize your payoff within it.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-400">Summary</p>
            <div className="mt-4 space-y-3 text-slate-700 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span>Total debt</span>
                <span className="font-semibold">${totalBalance.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Projected monthly payment</span>
                <span className="font-semibold">${plan.monthlyPayment.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Estimated payoff</span>
                <span className="font-semibold">{plan.payoffDate || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Calculator
