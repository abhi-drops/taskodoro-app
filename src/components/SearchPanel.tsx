import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, SlidersHorizontal, Clock, Tag, CheckCircle2, Circle, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Workspace, Todo, Group } from '@/types/index';

const PRESET_COLORS = [
  { hex: '#ef4444', label: 'Red' },
  { hex: '#f97316', label: 'Orange' },
  { hex: '#eab308', label: 'Yellow' },
  { hex: '#22c55e', label: 'Green' },
  { hex: '#3b82f6', label: 'Blue' },
  { hex: '#8b5cf6', label: 'Violet' },
  { hex: '#ec4899', label: 'Pink' },
  { hex: '#6b7280', label: 'Gray' },
];

type CompletionFilter = 'all' | 'checked' | 'unchecked';
type DateFilter = 'all' | 'overdue' | 'ending_soon' | 'future' | 'no_date';

interface ResultItem { todo: Todo; group: Group; }
interface Props {
  workspace: Workspace;
  onOpenTask: (groupId: string, todoId: string) => void;
  onClose: () => void;
  isMobile: boolean;
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/30 text-white rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function EndTimeBadge({ endTime }: { endTime: number }) {
  const diff = endTime - Date.now();
  const isOverdue = diff < 0;
  const abs = Math.abs(diff);
  const hours = Math.floor(abs / 3600000);
  const days = Math.floor(abs / 86400000);
  let label: string;
  if (isOverdue) { label = 'Overdue'; }
  else if (hours < 1) { label = `${Math.floor(abs / 60000)}m left`; }
  else if (hours < 24) { label = `${hours}h left`; }
  else { label = `${days}d left`; }
  return (
    <span className={cn(
      'flex items-center gap-0.5 text-[10px] font-semibold rounded-full px-2 py-0.5 shrink-0',
      isOverdue ? 'text-red-400 bg-red-400/15' :
      diff < 3600000 ? 'text-amber-400 bg-amber-400/15' :
      'text-white/40 bg-white/8',
    )}>
      <Clock size={9} />{label}
    </span>
  );
}

export function SearchPanel({ workspace, onOpenTask, onClose, isMobile }: Props) {
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedColors, setSelectedColors] = useState<Set<string>>(new Set());
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const g of workspace.groups)
      for (const t of g.todos)
        (t.tags ?? []).forEach(tag => tags.add(tag));
    return Array.from(tags).sort();
  }, [workspace]);

  const allColors = useMemo(() => {
    const colors = new Set<string>();
    for (const g of workspace.groups)
      for (const t of g.todos)
        if (t.color) colors.add(t.color);
    return Array.from(colors);
  }, [workspace]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (selectedTags.size) n += selectedTags.size;
    if (selectedColors.size) n += selectedColors.size;
    if (completionFilter !== 'all') n++;
    if (dateFilter !== 'all') n++;
    return n;
  }, [selectedTags, selectedColors, completionFilter, dateFilter]);

  const hasAnyFilter = activeFilterCount > 0 || query.trim() !== '';

  const results = useMemo<ResultItem[]>(() => {
    const now = Date.now();
    const q = query.trim().toLowerCase();
    const items: ResultItem[] = [];
    for (const group of workspace.groups) {
      for (const todo of group.todos) {
        if (q) {
          const searchable = [todo.text, todo.description ?? '', ...(todo.comments ?? []).map(c => c.text)].join(' ').toLowerCase();
          if (!searchable.includes(q)) continue;
        }
        if (selectedTags.size > 0) {
          const todoTags = new Set(todo.tags ?? []);
          let allMatch = true;
          for (const t of selectedTags) { if (!todoTags.has(t)) { allMatch = false; break; } }
          if (!allMatch) continue;
        }
        if (selectedColors.size > 0) { if (!todo.color || !selectedColors.has(todo.color)) continue; }
        if (completionFilter === 'checked' && !todo.completed) continue;
        if (completionFilter === 'unchecked' && todo.completed) continue;
        if (dateFilter !== 'all') {
          if (dateFilter === 'no_date') { if (todo.endTime) continue; }
          else if (dateFilter === 'overdue') { if (!todo.endTime || todo.endTime >= now) continue; }
          else if (dateFilter === 'ending_soon') { if (!todo.endTime || todo.endTime < now || todo.endTime > now + 86400000) continue; }
          else if (dateFilter === 'future') { if (!todo.endTime || todo.endTime <= now + 86400000) continue; }
        }
        items.push({ todo, group });
      }
    }
    return items;
  }, [workspace, query, selectedTags, selectedColors, completionFilter, dateFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, { group: Group; todos: Todo[] }>();
    for (const { todo, group } of results) {
      if (!map.has(group.id)) map.set(group.id, { group, todos: [] });
      map.get(group.id)!.todos.push(todo);
    }
    return Array.from(map.values());
  }, [results]);

  function toggleTag(tag: string) {
    setSelectedTags(prev => { const next = new Set(prev); next.has(tag) ? next.delete(tag) : next.add(tag); return next; });
  }
  function toggleColor(hex: string) {
    setSelectedColors(prev => { const next = new Set(prev); next.has(hex) ? next.delete(hex) : next.add(hex); return next; });
  }
  function clearAll() {
    setQuery(''); setSelectedTags(new Set()); setSelectedColors(new Set());
    setCompletionFilter('all'); setDateFilter('all');
  }

  const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
    { value: 'all', label: 'Any date' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'ending_soon', label: 'Ending soon' },
    { value: 'future', label: 'Future' },
    { value: 'no_date', label: 'No date' },
  ];

  const panelContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search tasks"
      className={cn(
        'flex flex-col z-50',
        isMobile
          ? 'fixed inset-x-0 bottom-0 rounded-t-3xl shadow-2xl border-t border-white/10'
          : 'fixed inset-y-0 right-0 w-[440px] border-l border-white/10 shadow-2xl',
      )}
      style={{
        background: 'oklch(0.1 0.008 30)',
        ...(isMobile
          ? { maxHeight: '92dvh', paddingBottom: 'env(safe-area-inset-bottom)' }
          : { paddingTop: 'env(safe-area-inset-top)' }),
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Mobile drag handle */}
      {isMobile && (
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
      )}

      {/* Search bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 shrink-0">
        <Search size={16} className="text-white/30 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search todos, descriptions, comments…"
          className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder:text-white/25"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="flex items-center justify-center w-6 h-6 rounded-xl text-white/30 hover:text-white"
            aria-label="Clear search"
          >
            <X size={13} />
          </button>
        )}
        <button
          onClick={onClose}
          className="flex items-center justify-center w-9 h-9 rounded-2xl bg-white/8 text-white/50 hover:text-white hover:bg-white/15 transition-colors shrink-0"
          aria-label="Close search"
        >
          <X size={17} />
        </button>
      </div>

      {/* Filter toggle bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/8 shrink-0">
        <button
          onClick={() => setFiltersOpen(v => !v)}
          aria-pressed={filtersOpen}
          className={cn(
            'flex items-center gap-1.5 h-8 px-3 rounded-full text-sm font-semibold transition-colors',
            filtersOpen || activeFilterCount > 0
              ? 'bg-primary/15 text-primary border border-primary/25'
              : 'bg-white/8 text-white/40 hover:text-white border border-white/8',
          )}
        >
          <SlidersHorizontal size={12} />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

        {hasAnyFilter && (
          <button
            onClick={clearAll}
            className="h-8 px-3 rounded-full text-sm text-white/30 hover:text-red-400 bg-white/5 border border-white/8 transition-colors font-semibold"
          >
            Clear all
          </button>
        )}

        <span className="ml-auto text-xs text-white/25 font-medium">
          {results.length} result{results.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Filter sections */}
      {filtersOpen && (
        <div className="shrink-0 border-b border-white/8 px-4 py-3 space-y-4">

          {/* Completion */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white/30 uppercase tracking-widest">
              <CheckCircle2 size={11} /> Status
            </div>
            <div className="flex gap-2">
              {(['all', 'unchecked', 'checked'] as CompletionFilter[]).map(v => (
                <button
                  key={v}
                  onClick={() => setCompletionFilter(v)}
                  aria-pressed={completionFilter === v}
                  className={cn(
                    'flex items-center gap-1.5 h-8 px-3 rounded-full text-sm font-semibold transition-all active:scale-95',
                    completionFilter === v
                      ? 'bg-primary text-white shadow-md shadow-primary/30'
                      : 'bg-white/8 text-white/40 hover:text-white border border-white/8',
                  )}
                >
                  {v === 'all' ? 'All' : v === 'checked' ? <><CheckCircle2 size={12} />Done</> : <><Circle size={12} />Active</>}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white/30 uppercase tracking-widest">
              <Calendar size={11} /> Due Date
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {DATE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDateFilter(opt.value)}
                  aria-pressed={dateFilter === opt.value}
                  className={cn(
                    'h-8 px-3 rounded-full text-sm font-semibold transition-all active:scale-95',
                    dateFilter === opt.value
                      ? opt.value === 'overdue'
                        ? 'bg-red-500 text-white shadow-md'
                        : 'bg-primary text-white shadow-md shadow-primary/30'
                      : 'bg-white/8 text-white/40 hover:text-white border border-white/8',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          {allColors.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white/30 uppercase tracking-widest">
                <span className="w-3 h-3 rounded-full bg-gradient-to-br from-primary to-pink-500 shrink-0" />
                Color
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                {PRESET_COLORS.filter(c => allColors.includes(c.hex)).map(c => (
                  <button
                    key={c.hex}
                    onClick={() => toggleColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    aria-label={c.label}
                    aria-pressed={selectedColors.has(c.hex)}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-all',
                      selectedColors.has(c.hex) ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105',
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {allTags.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white/30 uppercase tracking-widest">
                <Tag size={11} /> Tags
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    aria-pressed={selectedTags.has(tag)}
                    className={cn(
                      'h-7 px-2.5 rounded-full text-xs font-semibold transition-all active:scale-95',
                      selectedTags.has(tag)
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-white/8 text-white/40 hover:text-white border border-white/8',
                    )}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center">
              <Search size={19} className="text-white/25" />
            </div>
            <p className="text-sm text-white/30 font-medium">
              {hasAnyFilter ? 'No todos match your search' : 'Start typing to search'}
            </p>
          </div>
        ) : (
          <div className="px-4 py-3 space-y-5">
            {grouped.map(({ group, todos }) => (
              <div key={group.id}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-white/30 uppercase tracking-widest">{group.name}</span>
                  <span className="text-xs font-bold text-white/20 bg-white/8 rounded-full px-1.5">{todos.length}</span>
                </div>
                <div className="space-y-1.5">
                  {todos.map(todo => (
                    <SearchResultCard
                      key={todo.id}
                      todo={todo}
                      query={query}
                      onClick={() => { onOpenTask(group.id, todo.id); onClose(); }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      {panelContent}
    </>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────

interface CardProps { todo: Todo; query: string; onClick: () => void; }

function SearchResultCard({ todo, query, onClick }: CardProps) {
  const colorBorderStyle = todo.color ? { borderLeftColor: todo.color, borderLeftWidth: '3px' } : {};
  const matchedComment = query.trim()
    ? (todo.comments ?? []).find(c => c.text.toLowerCase().includes(query.toLowerCase()))
    : null;
  const matchedDesc = query.trim() && todo.description?.toLowerCase().includes(query.toLowerCase())
    ? todo.description : null;

  return (
    <button
      onClick={onClick}
      style={colorBorderStyle}
      className="w-full text-left flex flex-col gap-1 rounded-2xl border border-white/8 bg-white/5 px-3 py-3 hover:bg-white/10 hover:border-white/15 transition-all active:scale-[0.99]"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="shrink-0 text-[10px] font-mono font-bold text-white/20 bg-white/6 border border-white/8 rounded-md px-1.5 py-0.5">
          #{todo.sn}
        </span>
        <span className={cn('flex-1 text-sm font-semibold leading-snug truncate text-white', todo.completed && 'line-through text-white/25')}>
          {highlight(todo.text, query)}
        </span>
        {todo.endTime && <EndTimeBadge endTime={todo.endTime} />}
        {todo.completed
          ? <CheckCircle2 size={13} className="text-primary shrink-0" />
          : <Circle size={13} className="text-white/15 shrink-0" />
        }
      </div>

      {matchedDesc && (
        <p className="text-xs text-white/35 line-clamp-1 pl-0.5">{highlight(matchedDesc, query)}</p>
      )}
      {matchedComment && (
        <p className="text-xs text-white/35 line-clamp-1 pl-0.5 italic">"{highlight(matchedComment.text, query)}"</p>
      )}
      {(todo.tags ?? []).length > 0 && (
        <div className="flex gap-1 flex-wrap pl-0.5">
          {(todo.tags ?? []).map(tag => (
            <span key={tag} className="text-[10px] bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5 text-primary font-semibold">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
