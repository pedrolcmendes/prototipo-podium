import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { normalizeSearch, rankByRelevance } from '../utils/search';

const SEARCH_THRESHOLD = 8;

function textFromNode(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return Children.toArray(node).map(textFromNode).join('');
}

function collectOptions(children, group = '') {
  const options = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === 'option') {
      const label = textFromNode(child.props.children);
      options.push({
        value: child.props.value ?? label,
        label,
        disabled: Boolean(child.props.disabled),
        group,
      });
      return;
    }
    if (child.type === 'optgroup') {
      options.push(...collectOptions(child.props.children, child.props.label || ''));
    }
  });
  return options;
}

function firstEnabled(options) {
  return options.findIndex((option) => !option.disabled);
}

export default function PodiumSelect({
  children,
  value,
  defaultValue,
  onChange,
  onBlur,
  className = '',
  disabled = false,
  searchable,
  searchPlaceholder = 'Buscar opção...',
  placeholder,
  name,
  id,
  required,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...rest
}) {
  const generatedId = useId();
  const triggerId = id || `podium-select-${generatedId.replace(/:/g, '')}`;
  const listboxId = `${triggerId}-listbox`;
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? '');
  const [menuStyle, setMenuStyle] = useState({});

  const options = useMemo(() => collectOptions(children), [children]);
  const controlled = value !== undefined;
  const selectedValue = controlled ? value : uncontrolledValue;
  const selectedIndex = options.findIndex((option) => String(option.value) === String(selectedValue ?? ''));
  const selectedOption = options[selectedIndex];
  const showSearch = searchable ?? options.length >= SEARCH_THRESHOLD;
  const normalizedQuery = normalizeSearch(query);
  const visibleOptions = normalizedQuery
    ? rankByRelevance(options, normalizedQuery, (option) => {
      const primaryLabel = option.label.split(/\s+[·|–—]\s+/)[0];
      return [primaryLabel, option.label];
    })
    : options;

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const viewportGap = 12;
    const groupCount = new Set(visibleOptions.map((option) => option.group).filter(Boolean)).size;
    const contentHeight = 10 + (visibleOptions.length * 40) + (groupCount * 24) + (showSearch ? 54 : 0);
    const desiredHeight = Math.min(showSearch ? 340 : 292, contentHeight, window.innerHeight - viewportGap * 2);
    const roomBelow = window.innerHeight - rect.bottom - viewportGap;
    const roomAbove = rect.top - viewportGap;
    const openAbove = roomBelow < Math.min(desiredHeight, 180) && roomAbove > roomBelow;
    const availableRoom = Math.max(48, openAbove ? roomAbove : roomBelow);
    const maxHeight = Math.min(desiredHeight, availableRoom);
    setMenuStyle({
      left: Math.max(viewportGap, Math.min(rect.left, window.innerWidth - rect.width - viewportGap)),
      top: openAbove ? rect.top - maxHeight - 6 : rect.bottom + 6,
      width: Math.max(rect.width, 190),
      maxHeight,
    });
  };

  const close = (focusTrigger = false) => {
    setOpen(false);
    setQuery('');
    onBlur?.({ target: { value: selectedValue, name } });
    if (focusTrigger) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const openMenu = () => {
    if (disabled) return;
    updatePosition();
    setActiveIndex(selectedIndex >= 0 && !options[selectedIndex]?.disabled ? selectedIndex : firstEnabled(options));
    setOpen(true);
  };

  const choose = (option) => {
    if (!option || option.disabled) return;
    if (!controlled) setUncontrolledValue(option.value);
    onChange?.({
      target: { value: option.value, name, id: triggerId },
      currentTarget: { value: option.value, name, id: triggerId },
    });
    close(true);
  };

  const moveActive = (direction) => {
    if (!visibleOptions.length) return;
    const currentValue = options[activeIndex]?.value;
    let visibleIndex = visibleOptions.findIndex((option) => String(option.value) === String(currentValue));
    for (let attempts = 0; attempts < visibleOptions.length; attempts += 1) {
      visibleIndex = (visibleIndex + direction + visibleOptions.length) % visibleOptions.length;
      if (!visibleOptions[visibleIndex].disabled) {
        const next = options.findIndex((option) => option === visibleOptions[visibleIndex]);
        setActiveIndex(next);
        requestAnimationFrame(() => {
          menuRef.current?.querySelector(`[data-option-index="${next}"]`)?.scrollIntoView({ block: 'nearest' });
        });
        break;
      }
    }
  };

  const handleTriggerKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) openMenu();
      else moveActive(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) choose(options[activeIndex]);
      else openMenu();
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      close(true);
    }
  };

  const handleMenuKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(options[activeIndex]);
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') event.preventDefault();
      close(event.key === 'Escape');
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) close();
    };
    const handleViewportChange = () => updatePosition();
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    if (showSearch) requestAnimationFrame(() => searchRef.current?.focus());
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open, showSearch, visibleOptions.length]);

  useEffect(() => {
    if (!open || activeIndex < 0 || options[activeIndex]?.disabled) return;
    if (normalizedQuery && !visibleOptions.includes(options[activeIndex])) {
      const firstVisible = visibleOptions.find((option) => !option.disabled);
      setActiveIndex(options.findIndex((option) => option === firstVisible));
    }
  }, [normalizedQuery, open]);

  const displayLabel = selectedOption?.label || placeholder || 'Selecione';
  const activeDescendant = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  return (
    <div
      ref={wrapperRef}
      className={`podium-select${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}${className ? ` ${className}` : ''}`}
      {...rest}
    >
      {name ? <input type="hidden" name={name} value={selectedValue ?? ''} required={required} /> : null}
      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        className="podium-select-trigger"
        role="combobox"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-activedescendant={open ? activeDescendant : undefined}
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className={`podium-select-value${!selectedOption ? ' is-placeholder' : ''}`}>{displayLabel}</span>
        <svg className="podium-select-chevron" viewBox="0 0 20 20" aria-hidden="true">
          <path d="m5 7.5 5 5 5-5" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          className="podium-select-menu"
          style={menuStyle}
          onKeyDown={handleMenuKeyDown}
        >
          {showSearch ? (
            <div className="podium-select-search-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.8-3.8" /></svg>
              <input
                ref={searchRef}
                className="podium-select-search"
                role="combobox"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                aria-autocomplete="list"
                aria-expanded="true"
                aria-controls={listboxId}
                aria-activedescendant={activeDescendant}
              />
            </div>
          ) : null}
          <div id={listboxId} className="podium-select-options" role="listbox" aria-labelledby={triggerId}>
            {visibleOptions.length ? visibleOptions.map((option, visibleIndex) => {
              const index = options.findIndex((item) => item === option);
              const selected = String(option.value) === String(selectedValue ?? '');
              const previousGroup = visibleOptions[visibleIndex - 1]?.group;
              return (
                <div key={`${String(option.value)}-${index}`}>
                  {option.group && option.group !== previousGroup ? <div className="podium-select-group">{option.group}</div> : null}
                  <button
                    type="button"
                    id={`${listboxId}-option-${index}`}
                    data-option-index={index}
                    className={`podium-select-option${selected ? ' is-selected' : ''}${activeIndex === index ? ' is-active' : ''}`}
                    role="option"
                    aria-selected={selected}
                    disabled={option.disabled}
                    onMouseEnter={() => !option.disabled && setActiveIndex(index)}
                    onClick={() => choose(option)}
                  >
                    <span>{option.label}</span>
                    {selected ? (
                      <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10 3.5 3.5L16 5.5" /></svg>
                    ) : null}
                  </button>
                </div>
              );
            }) : (
              <div className="podium-select-empty">Nenhuma opção encontrada</div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
