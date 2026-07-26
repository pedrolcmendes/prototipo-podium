import { useId } from 'react';

const decimalPlaces = (step) => {
  const text = String(step ?? 1);
  return text.includes('.') ? text.split('.')[1].length : 0;
};

const asNumber = (value) => {
  const normalized = String(value ?? '').trim().replace(',', '.');
  if (!normalized || normalized === '-' || normalized === '.') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const limit = (value, min, max) => {
  let next = value;
  if (min !== undefined && min !== null) next = Math.max(Number(min), next);
  if (max !== undefined && max !== null) next = Math.min(Number(max), next);
  return next;
};

export default function PodiumNumberInput({
  value,
  onChange,
  onBlur,
  min,
  max,
  step = 1,
  prefix,
  suffix,
  className = '',
  disabled = false,
  name,
  id,
  placeholder,
  required,
  'aria-label': ariaLabel = 'Valor',
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const numericValue = asNumber(value);
  const precision = decimalPlaces(step);
  const minReached = numericValue !== null && min !== undefined && numericValue <= Number(min);
  const maxReached = numericValue !== null && max !== undefined && numericValue >= Number(max);

  const emit = (nextValue) => {
    onChange?.({ target: { value: nextValue, name, id: inputId } });
  };

  const adjust = (direction) => {
    const fallback = min !== undefined ? Number(min) : 0;
    const current = numericValue ?? fallback;
    const next = limit(current + (Number(step) * direction), min, max);
    emit(String(Number(next.toFixed(precision))));
  };

  const handleChange = (event) => {
    let next = event.target.value.replace(',', '.');
    const allowsNegative = min === undefined || Number(min) < 0;
    next = next.replace(allowsNegative ? /[^0-9.-]/g : /[^0-9.]/g, '');
    const [integer = '', ...decimals] = next.split('.');
    next = decimals.length ? `${integer}.${decimals.join('')}` : integer;
    if (next.includes('-')) next = `${next.startsWith('-') ? '-' : ''}${next.replace(/-/g, '')}`;
    emit(next);
  };

  const handleBlur = (event) => {
    const parsed = asNumber(event.target.value);
    if (parsed !== null) {
      const next = limit(parsed, min, max);
      emit(String(Number(next.toFixed(precision))));
    }
    onBlur?.(event);
  };

  return (
    <div className={`podium-number${disabled ? ' is-disabled' : ''}${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className="podium-number-step"
        onClick={() => adjust(-1)}
        disabled={disabled || minReached}
        aria-label={`Diminuir ${ariaLabel.toLowerCase()}`}
        tabIndex={-1}
      >
        <span aria-hidden="true">−</span>
      </button>
      <div className="podium-number-value">
        {prefix ? <span className="podium-number-affix">{prefix}</span> : null}
        <input
          id={inputId}
          name={name}
          className="podium-number-input"
          type="text"
          inputMode={precision > 0 ? 'decimal' : 'numeric'}
          role="spinbutton"
          aria-label={ariaLabel}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={numericValue ?? undefined}
          value={value ?? ''}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              if (!maxReached) adjust(1);
            }
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              if (!minReached) adjust(-1);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete="off"
        />
        {suffix ? <span className="podium-number-affix podium-number-suffix">{suffix}</span> : null}
      </div>
      <button
        type="button"
        className="podium-number-step"
        onClick={() => adjust(1)}
        disabled={disabled || maxReached}
        aria-label={`Aumentar ${ariaLabel.toLowerCase()}`}
        tabIndex={-1}
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
}
