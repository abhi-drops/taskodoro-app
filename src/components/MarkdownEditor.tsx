import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Check, Bold, Italic, Heading1, Heading2, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  initialValue: string;
  onSave: (value: string) => void;
  onClose: () => void;
}

// ─── markdown ↔ plain-line helpers ───────────────────────────────────────────

function lineType(line: string): 'h1' | 'h2' | 'ul' | 'p' {
  if (line.startsWith('# ')) return 'h1';
  if (line.startsWith('## ')) return 'h2';
  if (line.startsWith('- ')) return 'ul';
  return 'p';
}

function lineContent(line: string): string {
  if (line.startsWith('## ')) return line.slice(3);
  if (line.startsWith('# ')) return line.slice(2);
  if (line.startsWith('- ')) return line.slice(2);
  return line;
}

function applyInline(text: string): string {
  // bold
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // italic (not preceded/followed by *)
  text = text.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  return text;
}

function renderLine(line: string, idx: number): React.ReactNode {
  const type = lineType(line);
  const content = applyInline(lineContent(line));

  const inner = <span dangerouslySetInnerHTML={{ __html: content || '&ZeroWidthSpace;' }} />;

  const base = 'outline-none min-h-[1.5em] block';

  switch (type) {
    case 'h1':
      return <div key={idx} data-line={idx} className={cn(base, 'text-2xl font-bold mt-4 first:mt-0')}>{inner}</div>;
    case 'h2':
      return <div key={idx} data-line={idx} className={cn(base, 'text-lg font-semibold mt-3 first:mt-0')}>{inner}</div>;
    case 'ul':
      return (
        <div key={idx} data-line={idx} className={cn(base, 'flex gap-2.5 items-baseline')}>
          <span className="shrink-0 mt-[0.45em] w-1.5 h-1.5 rounded-full bg-foreground/60 block" />
          <span dangerouslySetInnerHTML={{ __html: content || '&ZeroWidthSpace;' }} />
        </div>
      );
    default:
      return <div key={idx} data-line={idx} className={cn(base, 'text-base leading-relaxed text-foreground/90')}>{inner}</div>;
  }
}

// ─── Toolbar button ───────────────────────────────────────────────────────────

function ToolBtn({ icon, label, active, onPress }: {
  icon: React.ReactNode; label: string; active?: boolean; onPress: () => void;
}) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onPress(); }}
      aria-label={label}
      className={cn(
        'flex items-center justify-center w-11 h-11 rounded-xl transition-colors select-none',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {icon}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MarkdownEditor({ initialValue, onSave, onClose }: Props) {
  const [lines, setLines] = useState<string[]>(() =>
    initialValue ? initialValue.split('\n') : ['']
  );
  const [cursorLine, setCursorLine] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // We use a hidden textarea as the actual input target for reliable mobile keyboard support.
  // The div above shows the rendered output. Cursor line tracks which line is "active".

  const rawValue = lines.join('\n');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Keep hidden textarea value in sync and focused
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.value = rawValue;
    }
  }, [rawValue]);

  function focusTextarea() {
    textareaRef.current?.focus();
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setLines(val.split('\n'));
  }

  function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    const val = el.value;
    const pos = el.selectionStart;

    // Find current line
    const before = val.slice(0, pos);
    const lineIdx = before.split('\n').length - 1;
    const lineArr = val.split('\n');
    const line = lineArr[lineIdx] ?? '';

    setCursorLine(lineIdx);

    if (e.key === 'Enter') {
      // Auto-continue bullet list
      if (line.startsWith('- ') && line.trim() !== '-') {
        e.preventDefault();
        const insert = '\n- ';
        const next = val.slice(0, pos) + insert + val.slice(pos);
        setLines(next.split('\n'));
        requestAnimationFrame(() => {
          if (!textareaRef.current) return;
          textareaRef.current.value = next;
          const newPos = pos + insert.length;
          textareaRef.current.setSelectionRange(newPos, newPos);
        });
        return;
      }
      // On empty bullet, remove bullet prefix
      if (line === '- ') {
        e.preventDefault();
        lineArr[lineIdx] = '';
        lineArr.splice(lineIdx + 1, 0, '');
        const next = lineArr.join('\n');
        setLines(lineArr);
        requestAnimationFrame(() => {
          if (!textareaRef.current) return;
          textareaRef.current.value = next;
          // position after the now-empty line
          const newPos = lineArr.slice(0, lineIdx + 1).join('\n').length + 1;
          textareaRef.current.setSelectionRange(newPos, newPos);
        });
        return;
      }
    }
  }

  function handleTextareaSelect(e: React.SyntheticEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    const before = el.value.slice(0, el.selectionStart);
    setCursorLine(before.split('\n').length - 1);
  }

  // ── Format toggles ──────────────────────────────────────────────────────────

  const toggleLinePrefix = useCallback((prefix: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const val = el.value;
    const pos = el.selectionStart;
    const before = val.slice(0, pos);
    const lineIdx = before.split('\n').length - 1;
    const arr = val.split('\n');
    const line = arr[lineIdx];

    if (line.startsWith(prefix)) {
      arr[lineIdx] = line.slice(prefix.length);
    } else {
      // Remove other prefixes first
      arr[lineIdx] = line.replace(/^(# |## |- )/, '') ;
      arr[lineIdx] = prefix + arr[lineIdx];
    }

    const next = arr.join('\n');
    setLines(arr);
    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.value = next;
      textareaRef.current.focus();
    });
  }, []);

  const wrapSelection = useCallback((marker: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const val = el.value;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = val.slice(start, end);

    let next: string;
    let newStart: number;
    let newEnd: number;

    // Toggle: if already wrapped, unwrap
    if (val.slice(start - marker.length, start) === marker && val.slice(end, end + marker.length) === marker) {
      next = val.slice(0, start - marker.length) + selected + val.slice(end + marker.length);
      newStart = start - marker.length;
      newEnd = end - marker.length;
    } else {
      const replacement = selected || 'text';
      next = val.slice(0, start) + marker + replacement + marker + val.slice(end);
      newStart = start + marker.length;
      newEnd = newStart + replacement.length;
    }

    setLines(next.split('\n'));
    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.value = next;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(newStart, newEnd);
    });
  }, []);

  // Active format detection for toolbar highlight
  function getActive() {
    const el = textareaRef.current;
    if (!el) return { h1: false, h2: false, ul: false, bold: false, italic: false };
    const val = el.value;
    const pos = el.selectionStart;
    const before = val.slice(0, pos);
    const lineIdx = before.split('\n').length - 1;
    const line = val.split('\n')[lineIdx] ?? '';
    const start = el.selectionStart;
    const checkBold = val.slice(start - 2, start) === '**' && val.slice(start, start + 2) === '**';
    return {
      h1: line.startsWith('# ') && !line.startsWith('## '),
      h2: line.startsWith('## '),
      ul: line.startsWith('- '),
      bold: checkBold,
      italic: false,
    };
  }

  const [active, setActive] = useState({ h1: false, h2: false, ul: false, bold: false, italic: false });

  function refreshActive() {
    setActive(getActive());
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-background flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        <span className="flex-1 font-semibold text-base truncate">Description</span>
        <button
          onClick={() => { onSave(rawValue); onClose(); }}
          className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Check size={15} />
          Save
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border shrink-0">
        <ToolBtn icon={<Heading1 size={18} />} label="Heading 1" active={active.h1} onPress={() => toggleLinePrefix('# ')} />
        <ToolBtn icon={<Heading2 size={18} />} label="Heading 2" active={active.h2} onPress={() => toggleLinePrefix('## ')} />
        <div className="w-px h-6 bg-border mx-1 shrink-0" />
        <ToolBtn icon={<Bold size={18} />} label="Bold" active={active.bold} onPress={() => wrapSelection('**')} />
        <ToolBtn icon={<Italic size={18} />} label="Italic" onPress={() => wrapSelection('*')} />
        <div className="w-px h-6 bg-border mx-1 shrink-0" />
        <ToolBtn icon={<List size={18} />} label="Bullet list" active={active.ul} onPress={() => toggleLinePrefix('- ')} />
      </div>

      {/* ── WYSIWYG area ── */}
      {/* Rendered preview sits on top; hidden textarea captures all input */}
      <div className="flex-1 min-h-0 relative overflow-hidden" onClick={focusTextarea}>
        {/* Hidden real textarea — transparent, sits behind, same size */}
        <textarea
          ref={textareaRef}
          defaultValue={rawValue}
          onChange={handleTextareaChange}
          onKeyDown={handleTextareaKeyDown}
          onSelect={handleTextareaSelect}
          onKeyUp={refreshActive}
          onClick={e => { e.stopPropagation(); refreshActive(); }}
          onFocus={refreshActive}
          className="absolute inset-0 w-full h-full opacity-0 resize-none z-10 cursor-text"
          autoCapitalize="sentences"
          spellCheck
          aria-label="Description editor"
        />

        {/* Rendered output */}
        <div
          ref={editorRef}
          className="absolute inset-0 overflow-y-auto px-5 py-4 pointer-events-none select-none"
        >
          {lines.length === 0 || (lines.length === 1 && lines[0] === '') ? (
            <p className="text-muted-foreground/40 text-base">Write your description…</p>
          ) : (
            lines.map((line, i) => (
              <div
                key={i}
                className={cn(
                  'min-h-[1.6em]',
                  i === cursorLine && 'bg-primary/5 rounded-lg -mx-1 px-1',
                )}
              >
                {renderLine(line, i)}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Bottom hint ── */}
      <div className="shrink-0 px-5 py-2 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground/50">
          # H1 &nbsp;## H2 &nbsp;**bold** &nbsp;*italic* &nbsp;- bullet
        </span>
        <span className="text-xs text-muted-foreground/50 tabular-nums">
          {rawValue.replace(/\n/g, '').length} chars
        </span>
      </div>
    </div>
  );
}
