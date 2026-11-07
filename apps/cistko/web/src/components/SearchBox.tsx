import { useQuery } from '@tanstack/react-query';
import { useEffect, useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { SearchIcon } from './icons';

export const DEBOUNCE_MS = 350;

interface Props<T> {
  /** Accessible label (visually hidden when `hideLabel`). */
  label: string;
  hideLabel?: boolean;
  placeholder: string;
  minChars?: number;
  queryKey: string;
  fetcher: (q: string, signal: AbortSignal) => Promise<T[]>;
  itemKey: (item: T, i: number) => string;
  renderItem: (item: T) => ReactNode;
  itemText: (item: T) => string;
  onSelect: (item: T) => void;
  emptyText: string;
  footer?: (items: T[]) => ReactNode;
  autoFocus?: boolean;
}

/** Debounced ARIA combobox used for address and municipality search. */
export function SearchBox<T>({
  label,
  hideLabel,
  placeholder,
  minChars = 3,
  queryKey,
  fetcher,
  itemKey,
  renderItem,
  itemText,
  onSelect,
  emptyText,
  footer,
  autoFocus,
}: Props<T>) {
  const id = useId();
  const [text, setText] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const trimmed = text.trim();
    const timer = setTimeout(
      () => setDebounced(trimmed.length >= minChars ? trimmed : ''),
      DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [text, minChars]);

  const query = useQuery({
    queryKey: [queryKey, debounced],
    queryFn: ({ signal }) => fetcher(debounced, signal),
    enabled: debounced.length >= minChars,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const items = query.data ?? [];
  const showPanel = open && debounced.length >= minChars && text.trim() === debounced;

  function choose(item: T) {
    setText(itemText(item));
    setOpen(false);
    setActive(-1);
    onSelect(item);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (items.length ? (i + 1) % items.length : -1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (items.length ? (i <= 0 ? items.length - 1 : i - 1) : -1));
    } else if (event.key === 'Enter') {
      const item = items[active] ?? (items.length === 1 ? items[0] : undefined);
      if (item && showPanel) {
        event.preventDefault();
        choose(item);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  }

  const listId = `${id}-list`;
  return (
    <div className="relative w-full">
      <label
        htmlFor={`${id}-input`}
        className={hideLabel ? 'dt-sr-only' : 'mb-1.5 block text-sm font-semibold'}
      >
        {label}
      </label>
      <div className="relative">
        <SearchIcon
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#5b6662]"
          width={20}
          height={20}
        />
        <input
          id={`${id}-input`}
          type="text"
          role="combobox"
          aria-expanded={showPanel && items.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          maxLength={120}
          placeholder={placeholder}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          className="ck-input"
        />
      </div>
      <p className="dt-sr-only" aria-live="polite">
        {showPanel && query.isSuccess
          ? items.length > 0
            ? `${items.length} prijedloga`
            : 'Nema rezultata'
          : ''}
      </p>
      {showPanel ? (
        <div id={listId} className="ck-suggest">
          {query.isFetching && !query.data ? (
            <p className="px-4 py-3 text-sm text-[#5b6662]">Tražim…</p>
          ) : null}
          {query.isError ? (
            <p className="px-4 py-3 text-sm text-[#b42318]">
              {query.error instanceof Error ? query.error.message : 'Pretraga nije uspjela.'}
            </p>
          ) : null}
          {query.isSuccess && items.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[#5b6662]">{emptyText}</p>
          ) : null}
          {items.length > 0 ? (
            <ul role="listbox" aria-label={label}>
              {items.map((item, i) => (
                <li
                  key={itemKey(item, i)}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(item);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className="min-h-[44px] cursor-pointer border-b border-[#efede6] px-4 py-2.5 last:border-b-0"
                >
                  {renderItem(item)}
                </li>
              ))}
            </ul>
          ) : null}
          {footer && items.length > 0 ? footer(items) : null}
        </div>
      ) : null}
    </div>
  );
}
