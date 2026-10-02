import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent, RefObject } from 'react';
import { isValidDateParts, parseFlexibleDOB, toISODate } from '@/utils/date';
import { cn } from '@/utils/cn';

export interface DobGateProps {
  /** Called with an ISO date (YYYY-MM-DD) once the visitor submits a full date. */
  onSubmit: (dobISO: string) => void;
  /** True while the verification request is in flight. */
  busy?: boolean;
  /**
   * Message to show when the date did not open the surprise.
   * Always generic — it must never hint at how close a guess was.
   */
  error?: string | null;
  firstName: string;
  /** Re-trigger the shake animation whenever this value changes. */
  errorKey?: number;
}

const FORMAT_HINT = 'Enter the full date, for example 15/08/2005.';

/**
 * The "secret code" step.
 *
 * Deliberately does not look like a login: no username, no password field, no
 * sign-in wording. It reads as the last step of opening a gift — three small
 * date boxes and a single "Open my surprise" button.
 */
export function DobGate({
  onSubmit,
  busy = false,
  error = null,
  firstName,
  errorKey = 0,
}: DobGateProps) {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);

  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!errorKey) return;
    setShaking(true);
    const id = window.setTimeout(() => setShaking(false), 520);
    return () => window.clearTimeout(id);
  }, [errorKey]);

  useEffect(() => {
    if (busy) return;
    dayRef.current?.focus({ preventScroll: true });
  }, [busy]);

  const digits = (value: string, max: number) => value.replace(/\D+/g, '').slice(0, max);

  const submit = useCallback(
    (d: string, m: string, y: string) => {
      if (busy) return;
      const dayNum = Number(d);
      const monthNum = Number(m);
      const yearNum = Number(y);

      if (!d || !m || !y) {
        setLocalError(FORMAT_HINT);
        return;
      }
      if (!isValidDateParts(dayNum, monthNum, yearNum)) {
        setLocalError('That date does not look quite right. Please check it.');
        return;
      }
      setLocalError(null);
      onSubmit(toISODate(yearNum, monthNum, dayNum));
    },
    [busy, onSubmit],
  );

  /**
   * Pasting "15/08/2005", "15-8-2005" or "15082005" fills all three boxes at
   * once — the fastest path on mobile, where people copy the date from a chat.
   */
  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLInputElement>) => {
      const text = event.clipboardData.getData('text');
      const iso = parseFlexibleDOB(text ?? '');
      if (!iso) return;
      event.preventDefault();
      const [y, m, d] = iso.split('-');
      setDay(d);
      setMonth(m);
      setYear(y);
      setLocalError(null);
      yearRef.current?.focus({ preventScroll: true });
      window.setTimeout(() => submit(d, m, y), 0);
    },
    [submit],
  );

  /** Backspace in an empty box jumps back and selects the previous value. */
  const moveBack = useCallback(
    (event: KeyboardEvent<HTMLInputElement>, previous: RefObject<HTMLInputElement> | null) => {
      if (event.key !== 'Backspace' || !previous) return;
      if (event.currentTarget.value.length > 0) return;
      event.preventDefault();
      const target = previous.current;
      target?.focus({ preventScroll: true });
      target?.select();
    },
    [],
  );

  const message = localError ?? error;

  return (
    <form
      className={cn('dob', shaking && 'shake')}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit(day, month, year);
      }}
    >
      <div className="dob__fields">
        <div className="dob__field">
          <label htmlFor="dob-day">Day</label>
          <input
            id="dob-day"
            ref={dayRef}
            className="t-input t-input--center"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={2}
            placeholder="DD"
            value={day}
            disabled={busy}
            aria-describedby={message ? 'dob-message' : undefined}
            onChange={(event) => {
              const next = digits(event.target.value, 2);
              setDay(next);
              setLocalError(null);
              if (next.length === 2) monthRef.current?.focus({ preventScroll: true });
            }}
            onKeyDown={(event) => {
              moveBack(event, null);
              if (event.key === 'Enter') event.preventDefault();
            }}
            onPaste={handlePaste}
          />
        </div>

        <span className="dob__sep" aria-hidden="true">
          /
        </span>

        <div className="dob__field">
          <label htmlFor="dob-month">Month</label>
          <input
            id="dob-month"
            ref={monthRef}
            className="t-input t-input--center"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={2}
            placeholder="MM"
            value={month}
            disabled={busy}
            aria-describedby={message ? 'dob-message' : undefined}
            onChange={(event) => {
              const next = digits(event.target.value, 2);
              setMonth(next);
              setLocalError(null);
              if (next.length === 2) yearRef.current?.focus({ preventScroll: true });
            }}
            onKeyDown={(event) => {
              moveBack(event, dayRef);
              if (event.key === 'Enter') event.preventDefault();
            }}
            onPaste={handlePaste}
          />
        </div>

        <span className="dob__sep" aria-hidden="true">
          /
        </span>

        <div className="dob__field dob__field--year">
          <label htmlFor="dob-year">Year</label>
          <input
            id="dob-year"
            ref={yearRef}
            className="t-input t-input--center"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={4}
            placeholder="YYYY"
            value={year}
            disabled={busy}
            aria-describedby={message ? 'dob-message' : undefined}
            onChange={(event) => {
              const next = digits(event.target.value, 4);
              setYear(next);
              setLocalError(null);
              if (next.length === 4 && day.length > 0 && month.length > 0) {
                window.setTimeout(() => submit(day, month, next), 120);
              }
            }}
            onKeyDown={(event) => {
              moveBack(event, monthRef);
              if (event.key === 'Enter') event.preventDefault();
            }}
            onPaste={handlePaste}
          />
        </div>
      </div>

      <button type="submit" className="t-btn t-btn--lg t-btn--block" disabled={busy}>
        {busy ? (
          <>
            <span className="spinner" aria-hidden="true" />
            Opening…
          </>
        ) : (
          'Open my surprise 🎁'
        )}
      </button>

      {message ? (
        <p className="dob__error" id="dob-message" role="alert">
          {message}
        </p>
      ) : (
        <p className="dob__hint">
          Psst… the secret code is {firstName}'s date of birth.
        </p>
      )}
    </form>
  );
}
