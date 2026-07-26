import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function parseTime(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value)) return value * 60;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value || '');
  if (!match) return fallback;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 24 || minutes > 59 || (hours === 24 && minutes !== 0)) return fallback;
  return hours * 60 + minutes;
}

function formatTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function nearestIndex(options, value) {
  if (!options.length) return -1;
  const exact = options.indexOf(value);
  if (exact >= 0) return exact;
  const minutes = parseTime(value, parseTime(options[0], 0));
  return options.reduce((best, option, index) => (
    Math.abs(parseTime(option, 0) - minutes) < Math.abs(parseTime(options[best], 0) - minutes) ? index : best
  ), 0);
}

export default function PodiumTimePicker({
  value = '',
  onChange,
  onBlur,
  min = '00:00',
  max = '23:59',
  step = 30,
  name,
  id,
  className = '',
  style,
  disabled = false,
  required = false,
  clearable = true,
  placeholder = 'Selecione um horário',
  label = 'Escolher horário',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...rest
}) {
  const generatedId = useId();
  const triggerId = id || `podium-time-${generatedId.replace(/:/g, '')}`;
  const listboxId = `${triggerId}-listbox`;
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuStyle, setMenuStyle] = useState({});
  const safeStep = Math.max(1, Number(step) || 30);
  const minMinutes = parseTime(min, 0);
  const maxMinutes = parseTime(max, 23 * 60 + 59);

  const options = useMemo(() => {
    if (maxMinutes < minMinutes) return [];
    const values = [];
    for (let minutes = minMinutes; minutes <= maxMinutes; minutes += safeStep) {
      values.push(formatTime(minutes));
    }
    return values;
  }, [minMinutes, maxMinutes, safeStep]);

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const snappedNow = minMinutes + Math.round((nowMinutes - minMinutes) / safeStep) * safeStep;
  const nowAvailable = snappedNow >= minMinutes && snappedNow <= maxMinutes;

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const gap = 12;
    const width = Math.min(330, Math.max(rect.width, 280), window.innerWidth - gap * 2);
    const estimatedHeight = 355;
    const roomBelow = window.innerHeight - rect.bottom - gap;
    const roomAbove = rect.top - gap;
    const openAbove = roomBelow < estimatedHeight && roomAbove > roomBelow;
    const height = Math.min(estimatedHeight, Math.max(220, openAbove ? roomAbove : roomBelow));
    setMenuStyle({
      left: Math.max(gap, Math.min(rect.left, window.innerWidth - width - gap)),
      top: openAbove ? Math.max(gap, rect.top - height - 6) : rect.bottom + 6,
      width,
      maxHeight: height,
    });
  };

  const close = (focusTrigger = false) => {
    setOpen(false);
    onBlur?.({ target: { value, name } });
    if (focusTrigger) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const openMenu = () => {
    if (disabled || !options.length) return;
    const nextIndex = nearestIndex(options, value);
    setActiveIndex(nextIndex);
    updatePosition();
    setOpen(true);
  };

  const choose = (nextValue) => {
    onChange?.({
      target: { value: nextValue, name, id: triggerId },
      currentTarget: { value: nextValue, name, id: triggerId },
    });
    close(true);
  };

  const moveActive = (amount) => {
    if (!options.length) return;
    const next = Math.max(0, Math.min(options.length - 1, activeIndex + amount));
    setActiveIndex(next);
    requestAnimationFrame(() => {
      menuRef.current?.querySelector(`[data-time-index="${next}"]`)?.scrollIntoView({ block: 'nearest' });
    });
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    } else if (event.key === 'Tab') {
      close();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(-4);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActive(4);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (activeIndex >= 0) choose(options[activeIndex]);
    }
  };

  const chooseNow = () => {
    if (nowAvailable) choose(formatTime(snappedNow));
  };

  useEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) close();
    };
    const handleDocumentKeyDown = (event) => {
      if (event.key === 'Escape' && !menuRef.current?.contains(event.target)) {
        event.preventDefault();
        close(true);
      }
    };
    const handleViewportChange = () => updatePosition();
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleDocumentKeyDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    requestAnimationFrame(() => {
      menuRef.current?.querySelector(`[data-time-index="${activeIndex}"]`)?.focus();
      menuRef.current?.querySelector(`[data-time-index="${activeIndex}"]`)?.scrollIntoView({ block: 'center' });
    });
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleDocumentKeyDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className={`podium-time${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}${className ? ` ${className}` : ''}`} {...rest}>
      {name ? <input type="hidden" name={name} value={value || ''} required={required} /> : null}
      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        className="podium-time-trigger"
        style={style}
        role="combobox"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(event) => {
          if ((event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') && !open) {
            event.preventDefault();
            openMenu();
          } else if (event.key === 'Escape' && open) {
            event.preventDefault();
            close(true);
          }
        }}
      >
        <span className={`podium-time-value${value ? '' : ' is-placeholder'}`}>{value || placeholder}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>
      </button>

      {open && createPortal(
        <div ref={menuRef} className="podium-time-menu" style={menuStyle} onKeyDown={handleKeyDown}>
          <div className="podium-time-head">
            <div>
              <small>Horário</small>
              <strong>{label}</strong>
            </div>
            <span>{value || '—'}</span>
          </div>
          <div id={listboxId} className="podium-time-options" role="listbox" aria-labelledby={triggerId}>
            {options.map((option, index) => (
              <button
                type="button"
                key={option}
                data-time-index={index}
                className={`${option === value ? 'is-selected ' : ''}${index === activeIndex ? 'is-active' : ''}`.trim()}
                role="option"
                aria-selected={option === value}
                tabIndex={index === activeIndex ? 0 : -1}
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                onClick={() => choose(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="podium-time-footer">
            {clearable ? <button type="button" onClick={() => choose('')} disabled={!value}>Limpar</button> : <span />}
            <button type="button" onClick={chooseNow} disabled={!nowAvailable}>Agora</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

export { formatTime, parseTime };
