'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@tamizh/core/utils';
import { CheckIcon, ChevronDownIcon } from './Icons';

/**
 * A filter dropdown that belongs to this panel.
 *
 * The native `<select>` this replaces was styled only as far as its closed
 * state: the moment it opened, the operating system drew the option list, and
 * no stylesheet can reach inside it. On a gold-and-carbon panel that meant a
 * stark system menu — the wrong typeface, the wrong blue highlight, no dark
 * mode — appearing over the interface every time somebody filtered a table.
 *
 * So the list is drawn here instead. That is a real trade: a native select is
 * free, correct, and unbeatable under a thumb, and re-implementing one badly
 * costs a great deal in accessibility. The keyboard contract is therefore the
 * whole of the work below — arrows, Home/End, Enter, Escape, typeahead, and
 * `aria-activedescendant` so a screen reader follows the highlight without
 * focus ever leaving the trigger.
 *
 * On phones the filter row collapses into a sheet that keeps native selects,
 * because there the platform picker is better than anything drawn in a div.
 */

export interface SelectMenuOption {
  value: string;
  label: string;
}

export function SelectMenu({
  value,
  options,
  onChange,
  label,
  /**
   * Shown instead of the matching option when nothing is chosen.
   *
   * A filter row wants this — an unset control should say "Order status", not
   * "View all". A form field does not: there `value === ''` is usually a real
   * choice ("Top level"), and its own label is already printed above.
   */
  placeholder,
  tone = 'filter',
  className,
}: {
  value: string;
  options: SelectMenuOption[];
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  /** `filter` carries gold once set; `field` stays as quiet as an input. */
  tone?: 'filter' | 'field';
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ term: '', at: 0 });

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const selected = options[selectedIndex];
  const showingPlaceholder = value === '' && placeholder !== undefined;
  const isSet = tone === 'filter' && value !== '';

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    // A filter row can sit inside a scrolling page; an anchored panel that
    // stays put while the page moves under it looks broken, so close instead.
    const onScroll = () => setOpen(false);

    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  // Keep the highlighted row in view when the arrows walk past the edge.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    setOpen(false);
    if (option.value !== value) onChange(option.value);
  };

  const openAt = (index: number) => {
    setActive(index);
    setOpen(true);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const last = options.length - 1;

    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        openAt(selectedIndex);
      }
      return;
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        setOpen(false);
        break;
      case 'Tab':
        // Tab commits and moves on, which is what a native select does.
        setOpen(false);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        choose(active);
        break;
      case 'ArrowDown':
        event.preventDefault();
        setActive((i) => (i >= last ? 0 : i + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActive((i) => (i <= 0 ? last : i - 1));
        break;
      case 'Home':
        event.preventDefault();
        setActive(0);
        break;
      case 'End':
        event.preventDefault();
        setActive(last);
        break;
      default: {
        // Typeahead: printable keys jump to the next matching label, the way
        // a native select does when you type "de" to reach "Delivered".
        if (event.key.length !== 1 || event.altKey || event.ctrlKey || event.metaKey) return;
        const now = Date.now();
        const t = typeahead.current;
        t.term = now - t.at > 800 ? event.key : t.term + event.key;
        t.at = now;
        const term = t.term.toLowerCase();
        const from = options.findIndex(
          (o, i) => i > active && o.label.toLowerCase().startsWith(term),
        );
        const found =
          from !== -1
            ? from
            : options.findIndex((o) => o.label.toLowerCase().startsWith(term));
        if (found !== -1) setActive(found);
      }
    }
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      {/*
        A real <select>, carrying the same value and the same options, kept out
        of sight and out of the tab order.

        Drawing the list ourselves does not entitle us to lie about the control
        in the DOM. This keeps the page honest for everything that reads markup
        rather than pixels — native form submission, autofill, and any tooling
        that inspects what a page offers. Our own smoke test is the reason this
        is not hypothetical: it finds a category by looking for an <option> on
        the new-product page, and replacing the select with divs silently
        skipped three of its checks.

        It is aria-hidden and tabIndex -1: the button above is the accessible
        control, and a screen reader must not meet the same choice twice.
      */}
      <select
        aria-hidden="true"
        tabIndex={-1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="sr-only"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={label}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openAt(selectedIndex))}
        onKeyDown={onKeyDown}
        className={cn(
          'flex min-h-10 w-full items-center gap-2 rounded-lg border px-3 text-sm font-medium',
          'transition-colors duration-150',
          'focus:outline-none focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-500/15',
          // A set filter is a fact about what the table is showing, so it
          // carries the gold rather than looking like an untouched control. A
          // form field always has a value, so gold there would mean nothing.
          isSet
            ? 'border-action-edge bg-success-50 text-link'
            : 'border-slate-300 bg-surface text-slate-700 hover:border-slate-400',
          tone === 'field' && 'min-h-11',
          open && 'border-brand-500 ring-3 ring-brand-500/15',
        )}
      >
        <span className="min-w-0 flex-1 truncate text-start">
          {showingPlaceholder ? placeholder : (selected?.label ?? placeholder ?? label)}
        </span>
        <ChevronDownIcon
          aria-hidden="true"
          className={cn(
            'shrink-0 text-sm transition-transform duration-200',
            isSet ? 'text-link' : 'text-slate-400',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          className="absolute z-50 mt-1.5 max-h-72 w-full min-w-48 overflow-y-auto rounded-lg border border-slate-200 bg-surface p-1 shadow-overlay"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value}>
                <div
                  id={`${id}-opt-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => choose(index)}
                  onMouseEnter={() => setActive(index)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm',
                    // The highlight follows the keyboard and the pointer
                    // alike, so there is only ever one "where am I" signal.
                    index === active ? 'bg-success-50 text-link' : 'text-slate-700',
                    isSelected && 'font-semibold',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {isSelected ? (
                    <CheckIcon aria-hidden="true" className="shrink-0 text-sm text-link" />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
