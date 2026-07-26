import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const YEAR_PAGE_SIZE = 12;

function pad(value) {
  return String(value).padStart(2, '0');
}

function toIso(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseIso(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1, 12);
}

function moveMonthKeepingDay(date, amount) {
  const target = new Date(date.getFullYear(), date.getMonth() + amount, 1, 12);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0, 12).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
}

function dateLabel(value) {
  const date = parseIso(value);
  return date ? `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}` : '';
}

function isOutside(iso, min, max) {
  return Boolean((min && iso < min) || (max && iso > max));
}

function clampDate(date, min, max) {
  const iso = toIso(date);
  if (min && iso < min) return parseIso(min) || date;
  if (max && iso > max) return parseIso(max) || date;
  return date;
}

function monthDisabled(year, month, min, max) {
  const normalized = new Date(year, month, 1, 12);
  year = normalized.getFullYear();
  month = normalized.getMonth();
  const first = `${year}-${pad(month + 1)}-01`;
  const lastDate = new Date(year, month + 1, 0, 12);
  const last = toIso(lastDate);
  return Boolean((max && first > max) || (min && last < min));
}

function yearDisabled(year, min, max) {
  return Boolean((max && `${year}-01-01` > max) || (min && `${year}-12-31` < min));
}

export default function PodiumDatePicker({
  value = '',
  onChange,
  onBlur,
  min,
  max,
  name,
  id,
  className = '',
  style,
  disabled = false,
  required = false,
  placeholder = 'Selecione uma data',
  clearable = true,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...rest
}) {
  const generatedId = useId();
  const triggerId = id || `podium-date-${generatedId.replace(/:/g, '')}`;
  const dialogId = `${triggerId}-calendar`;
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const calendarRef = useRef(null);
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => parseIso(value), [value]);
  const initialDate = selectedDate || clampDate(new Date(), min, max);
  const [cursor, setCursor] = useState(() => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1, 12));
  const [activeIso, setActiveIso] = useState(() => toIso(initialDate));
  const [view, setView] = useState('days');
  const [yearPageStart, setYearPageStart] = useState(() => Math.floor(initialDate.getFullYear() / YEAR_PAGE_SIZE) * YEAR_PAGE_SIZE);
  const [calendarStyle, setCalendarStyle] = useState({});

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12);
    const gridStart = addDays(first, -first.getDay());
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  }, [cursor]);

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const gap = 12;
    const width = Math.min(340, Math.max(rect.width, 310), window.innerWidth - gap * 2);
    const estimatedHeight = view === 'days' ? 405 : 330;
    const roomBelow = window.innerHeight - rect.bottom - gap;
    const roomAbove = rect.top - gap;
    const openAbove = roomBelow < estimatedHeight && roomAbove > roomBelow;
    const height = Math.min(estimatedHeight, Math.max(230, openAbove ? roomAbove : roomBelow));
    setCalendarStyle({
      left: Math.max(gap, Math.min(rect.left, window.innerWidth - width - gap)),
      top: openAbove ? Math.max(gap, rect.top - height - 6) : rect.bottom + 6,
      width,
      maxHeight: height,
    });
  };

  const close = (focusTrigger = false) => {
    setOpen(false);
    setView('days');
    onBlur?.({ target: { value, name } });
    if (focusTrigger) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const openCalendar = () => {
    if (disabled) return;
    const base = selectedDate || clampDate(new Date(), min, max);
    setCursor(new Date(base.getFullYear(), base.getMonth(), 1, 12));
    setActiveIso(toIso(base));
    setYearPageStart(Math.floor(base.getFullYear() / YEAR_PAGE_SIZE) * YEAR_PAGE_SIZE);
    setView('days');
    updatePosition();
    setOpen(true);
  };

  const emit = (nextValue) => {
    onChange?.({
      target: { value: nextValue, name, id: triggerId },
      currentTarget: { value: nextValue, name, id: triggerId },
    });
    close(true);
  };

  const chooseDay = (date) => {
    const iso = toIso(date);
    if (!isOutside(iso, min, max)) emit(iso);
  };

  const moveActive = (amount) => {
    const current = parseIso(activeIso) || selectedDate || new Date();
    const next = clampDate(addDays(current, amount), min, max);
    const iso = toIso(next);
    setActiveIso(iso);
    setCursor(new Date(next.getFullYear(), next.getMonth(), 1, 12));
    requestAnimationFrame(() => calendarRef.current?.querySelector(`[data-date="${iso}"]`)?.focus());
  };

  const handleCalendarKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key === 'Tab') {
      close();
      return;
    }
    if (view !== 'days') return;
    const movements = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (movements[event.key]) {
      event.preventDefault();
      moveActive(movements[event.key]);
    } else if (event.key === 'Home') {
      event.preventDefault();
      const active = parseIso(activeIso) || new Date();
      moveActive(-active.getDay());
    } else if (event.key === 'End') {
      event.preventDefault();
      const active = parseIso(activeIso) || new Date();
      moveActive(6 - active.getDay());
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      const active = parseIso(activeIso) || new Date();
      const next = moveMonthKeepingDay(active, event.key === 'PageUp' ? -1 : 1);
      const clamped = clampDate(next, min, max);
      setActiveIso(toIso(clamped));
      setCursor(new Date(clamped.getFullYear(), clamped.getMonth(), 1, 12));
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const active = parseIso(activeIso);
      if (active) chooseDay(active);
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target) && !calendarRef.current?.contains(event.target)) close();
    };
    const handleViewportChange = () => updatePosition();
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    requestAnimationFrame(() => calendarRef.current?.querySelector(`[data-date="${activeIso}"]`)?.focus());
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) updatePosition();
  }, [view, open]);

  const goPrevious = () => {
    if (view === 'years') {
      setYearPageStart((current) => current - YEAR_PAGE_SIZE);
    } else if (view === 'months') {
      setCursor((current) => new Date(current.getFullYear() - 1, current.getMonth(), 1, 12));
    } else {
      setCursor((current) => addMonths(current, -1));
    }
  };

  const goNext = () => {
    if (view === 'years') {
      setYearPageStart((current) => current + YEAR_PAGE_SIZE);
    } else if (view === 'months') {
      setCursor((current) => new Date(current.getFullYear() + 1, current.getMonth(), 1, 12));
    } else {
      setCursor((current) => addMonths(current, 1));
    }
  };

  const previousDisabled = view === 'days'
    ? monthDisabled(cursor.getFullYear(), cursor.getMonth() - 1, min, max)
    : view === 'months'
      ? yearDisabled(cursor.getFullYear() - 1, min, max)
      : yearPageStart <= 1800;
  const nextDisabled = view === 'days'
    ? monthDisabled(cursor.getFullYear(), cursor.getMonth() + 1, min, max)
    : view === 'months'
      ? yearDisabled(cursor.getFullYear() + 1, min, max)
      : yearPageStart + YEAR_PAGE_SIZE > 2200;
  const todayIso = toIso(new Date());

  return (
    <div ref={wrapperRef} className={`podium-date${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}${className ? ` ${className}` : ''}`} {...rest}>
      {name ? <input type="hidden" name={name} value={value || ''} required={required} /> : null}
      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        className="podium-date-trigger"
        style={style}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        aria-haspopup="dialog"
        aria-controls={dialogId}
        aria-expanded={open}
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => (open ? close() : openCalendar())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            openCalendar();
          } else if (event.key === 'Escape' && open) {
            event.preventDefault();
            close(true);
          }
        }}
      >
        <span className={`podium-date-value${value ? '' : ' is-placeholder'}`}>{dateLabel(value) || placeholder}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>
      </button>

      {open && createPortal(
        <div
          ref={calendarRef}
          id={dialogId}
          className="podium-calendar"
          style={calendarStyle}
          role="dialog"
          aria-modal="false"
          aria-label="Escolher data"
          onKeyDown={handleCalendarKeyDown}
        >
          <div className="podium-calendar-head">
            <button type="button" className="podium-calendar-nav" onClick={goPrevious} disabled={previousDisabled} aria-label="Anterior">
              <svg viewBox="0 0 20 20"><path d="m12.5 4-6 6 6 6" /></svg>
            </button>
            <div className="podium-calendar-title">
              <button type="button" className={view === 'months' ? 'active' : ''} onClick={() => setView(view === 'months' ? 'days' : 'months')}>{MONTHS[cursor.getMonth()]}</button>
              <button type="button" className={view === 'years' ? 'active' : ''} onClick={() => {
                setYearPageStart(Math.floor(cursor.getFullYear() / YEAR_PAGE_SIZE) * YEAR_PAGE_SIZE);
                setView(view === 'years' ? 'days' : 'years');
              }}>{cursor.getFullYear()}</button>
            </div>
            <button type="button" className="podium-calendar-nav" onClick={goNext} disabled={nextDisabled} aria-label="Próximo">
              <svg viewBox="0 0 20 20"><path d="m7.5 4 6 6-6 6" /></svg>
            </button>
          </div>

          {view === 'days' ? (
            <>
              <div className="podium-calendar-weekdays">{WEEKDAYS.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
              <div className="podium-calendar-days" role="grid">
                {days.map((date) => {
                  const iso = toIso(date);
                  const outsideMonth = date.getMonth() !== cursor.getMonth();
                  const selected = iso === value;
                  const today = iso === toIso(new Date());
                  const blocked = isOutside(iso, min, max);
                  return (
                    <button
                      type="button"
                      key={iso}
                      data-date={iso}
                      className={`${outsideMonth ? 'is-outside ' : ''}${selected ? 'is-selected ' : ''}${today ? 'is-today ' : ''}`.trim()}
                      role="gridcell"
                      aria-selected={selected}
                      aria-label={date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      tabIndex={iso === activeIso ? 0 : -1}
                      disabled={blocked}
                      onClick={() => chooseDay(date)}
                      onFocus={() => setActiveIso(iso)}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {view === 'months' ? (
            <div className="podium-calendar-months">
              {MONTHS.map((month, index) => (
                <button
                  type="button"
                  key={month}
                  className={index === cursor.getMonth() ? 'is-current' : ''}
                  disabled={monthDisabled(cursor.getFullYear(), index, min, max)}
                  onClick={() => {
                    setCursor((current) => new Date(current.getFullYear(), index, 1, 12));
                    setView('days');
                  }}
                >
                  {month.slice(0, 3)}
                </button>
              ))}
            </div>
          ) : null}

          {view === 'years' ? (
            <div className="podium-calendar-years">
              {Array.from({ length: YEAR_PAGE_SIZE }, (_, index) => yearPageStart + index).map((year) => (
                <button
                  type="button"
                  key={year}
                  className={year === cursor.getFullYear() ? 'is-current' : ''}
                  disabled={yearDisabled(year, min, max)}
                  onClick={() => {
                    setCursor((current) => new Date(year, current.getMonth(), 1, 12));
                    setView('months');
                  }}
                >
                  {year}
                </button>
              ))}
            </div>
          ) : null}

          <div className="podium-calendar-footer">
            {clearable ? <button type="button" onClick={() => emit('')} disabled={!value}>Limpar</button> : <span />}
            <button type="button" onClick={() => chooseDay(new Date())} disabled={isOutside(todayIso, min, max)}>Hoje</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

export { dateLabel };
