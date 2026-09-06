import { useEffect, useRef, useState } from 'react';
import { Wallet, TrendingDown, ArrowDownToLine, AlertTriangle } from 'lucide-react';
import { addDays } from '../lib/sapaEngine.js';
import { recordMeterStarted, recordDemoStarted } from '../lib/analytics.js';

/* Four input cards. Only the first two are required — the optional pair is
 * where the forecast gets genuinely personal, so they are offered but never
 * demanded. */

const toISO = (date) => date.toISOString().slice(0, 10);

function demoValues() {
  const today = new Date();
  return {
    currentCash: '85000',
    weeklySpending: '31500',
    incomeAmount: '70000',
    incomeDate: toISO(addDays(today, 19)),
    expenseAmount: '20000',
    expenseDate: toISO(addDays(today, 9))
  };
}

const EMPTY = {
  currentCash: '', weeklySpending: '',
  incomeAmount: '', incomeDate: '',
  expenseAmount: '', expenseDate: ''
};

export default function SapaForm({ initial, onCalculate }) {
  const [values, setValues] = useState(() => ({ ...EMPTY, ...(initial || {}) }));
  const [errors, setErrors] = useState({});
  const startedRef = useRef(false);

  useEffect(() => { if (initial) setValues((current) => ({ ...current, ...initial })); }, [initial]);

  const update = (field) => (event) => {
    const next = event.target.value;
    // "meter_started" fires once, on first meaningful engagement.
    if (!startedRef.current && next.trim()) {
      startedRef.current = true;
      recordMeterStarted();
    }
    setValues((current) => ({ ...current, [field]: next }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const loadDemo = () => {
    setValues(demoValues());
    setErrors({});
    startedRef.current = true;
    recordDemoStarted('meter');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const next = {};
    const cash = Number(values.currentCash);
    const spend = Number(values.weeklySpending);

    if (values.currentCash === '' || !Number.isFinite(cash) || cash < 0) {
      next.currentCash = 'Enter the money you have now (0 or more).';
    }
    if (values.weeklySpending === '' || !Number.isFinite(spend) || spend < 0) {
      next.weeklySpending = 'Enter what you normally spend in a week.';
    }
    // A dated amount without its date (or vice versa) is incomplete, not invalid.
    if (values.incomeAmount && !values.incomeDate) next.incomeDate = 'Add the date you expect it.';
    if (values.expenseAmount && !values.expenseDate) next.expenseDate = 'Add the date it is due.';

    setErrors(next);
    if (Object.keys(next).length) return;

    onCalculate({
      currentCash: cash,
      weeklySpending: spend,
      income: values.incomeAmount && values.incomeDate
        ? [{ amount: Number(values.incomeAmount), date: values.incomeDate }] : [],
      expenses: values.expenseAmount && values.expenseDate
        ? [{ amount: Number(values.expenseAmount), date: values.expenseDate }] : [],
      raw: values
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InputCard
        icon={Wallet}
        step="01"
        required
        title="Current money available"
        question="How much money do you currently have available?"
        error={errors.currentCash}
      >
        <NairaField value={values.currentCash} onChange={update('currentCash')} placeholder="85000" autoFocus />
      </InputCard>

      <InputCard
        icon={TrendingDown}
        step="02"
        required
        title="Typical weekly spending"
        question="How much do you normally spend in one week?"
        error={errors.weeklySpending}
      >
        <NairaField value={values.weeklySpending} onChange={update('weeklySpending')} placeholder="31500" />
      </InputCard>

      <InputCard
        icon={ArrowDownToLine}
        step="03"
        title="Money coming in"
        question="Expecting money? Tell us and we'll count it."
        error={errors.incomeDate}
        tone="allclear"
      >
        <div className="grid grid-cols-2 gap-3">
          <NairaField value={values.incomeAmount} onChange={update('incomeAmount')} placeholder="70000" />
          <DateField value={values.incomeDate} onChange={update('incomeDate')} label="Expected date" />
        </div>
      </InputCard>

      <InputCard
        icon={AlertTriangle}
        step="04"
        title="Big expense coming"
        question="Anything large due soon? It moves your Sapa date."
        error={errors.expenseDate}
        tone="siren"
      >
        <div className="grid grid-cols-2 gap-3">
          <NairaField value={values.expenseAmount} onChange={update('expenseAmount')} placeholder="20000" />
          <DateField value={values.expenseDate} onChange={update('expenseDate')} label="Due date" />
        </div>
      </InputCard>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1 text-base py-4">
          Calculate my Sapa date
        </button>
        <button type="button" onClick={loadDemo} className="btn-ghost sm:w-auto">
          Use demo data
        </button>
      </div>
    </form>
  );
}

const TONE_RING = {
  hazard: 'border-l-hazard',
  allclear: 'border-l-allclear',
  siren: 'border-l-siren'
};

function InputCard({ icon: Icon, step, title, question, required, children, error, tone = 'hazard' }) {
  return (
    <div className={`panel border-l-4 ${TONE_RING[tone]} p-4 sm:p-5`}>
      <div className="flex items-start gap-3 mb-3">
        <Icon className="w-5 h-5 text-hazard mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="label-tag">
            Input {step}{required ? ' · Required' : ' · Optional'}
          </p>
          <h3 className="font-display text-xl leading-tight mt-1">{title.toUpperCase()}</h3>
          <p className="text-sm text-bone-300 mt-1">{question}</p>
        </div>
      </div>
      {children}
      {error && (
        <p className="mt-2 font-mono text-xs text-siren" role="alert">{error}</p>
      )}
    </div>
  );
}

function NairaField({ value, onChange, placeholder, autoFocus }) {
  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-lg text-hazard pointer-events-none">
        ₦
      </span>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        step="any"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="field-input pl-9"
        aria-label="Amount in naira"
      />
    </div>
  );
}

function DateField({ value, onChange, label }) {
  return (
    <input
      type="date"
      value={value}
      onChange={onChange}
      className="field-input text-base"
      aria-label={label}
    />
  );
}
