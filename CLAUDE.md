# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Vite dev server (web preview)
npm run build        # tsc + vite build
npm run build:android  # build + cap sync android (deploy to Android)
npm run lint         # eslint
npm run preview      # preview production build
```

There is no test suite in this project.

## Architecture

This is a **Capacitor + React 19 + TypeScript** mobile app (Android target). The web layer is a Vite/React SPA; Capacitor bridges it to native Android.

### State

All app data lives in a single React context (`src/store/useAppStore.tsx`). State is a tree:

```
AppState
  workspaces[]
    groups[]           ← settings: { onCompleteMoveTo, sortBy, filterBy }
      todos[]          ← subtasks[], comments[], priority, color, tags, endTime, sn
```

The reducer handles all mutations via typed `AppAction` dispatches. State is persisted to device storage via `@capacitor/preferences` with an 800ms debounce on every change. State is loaded asynchronously on mount — `isLoaded` guards rendering until ready.

**Key types** (`src/types/index.ts`):
- `Todo` — has a serial number field `sn: number` (display order), plus optional `description`, `priority` (`low|medium|high|urgent`), `color`, `tags`, `comments` (`TaskComment[]`), `endTime` (timestamp), `subtasks` (`SubTask[]`)
- `GroupSettings` — `onCompleteMoveTo?: string|null`, `sortBy?: TodoSortKey`, `filterBy?: TodoFilterKey`
- `AppState` — `workspaces[]`, `activeWorkspaceId: string|null`

**Pomodoro types** (`src/types/pomodoro.ts`):
- `PomodoroBlock` — `id`, `type: 'work'|'break'`, `label`, `durationMins`, `taskId?`, `groupId?`, `completed`
- `PomodoroSession` — `blocks[]`, `totalMins`

**`ADD_WORKSPACE` action** accepts an optional `id` field (`{ name: string; id?: string }`). Callers that need to navigate immediately after creation should generate the UUID before dispatch and pass it in, then navigate using that same ID.

### Routing

Uses **TanStack Router** with file-based routes (auto-generated `routeTree.gen.ts`). Route structure:

- `/` — welcome screen; redirects to first workspace on load
- `/_app` — pathless layout route; wraps with `AppProvider`, handles Android back button, shows loader until `isLoaded`
- `/_app/workspace/$workspaceId/` — workspace landing:
  - If workspace has groups → redirects to first group
  - If workspace has **no groups** → renders full workspace UI (sidebar/board + empty-groups prompt) so user can create the first group. This is the route a newly created workspace lands on.
- `/_app/workspace/$workspaceId/group/$groupId/` — main board view

The group route (`src/routes/_app/workspace/$workspaceId/group/$groupId/index.tsx`) owns DnD context, all overlay state (task detail sheet, pomodoro, search), and branches between mobile and desktop layouts.

**Redirect safety rule**: redirect-away effects in both workspace and group routes guard on `isLoaded` before navigating, to avoid race conditions where state hasn't propagated yet after a dispatch+navigate in the same event handler.

### Responsive layout

`useIsMobile` (`src/hooks/useIsMobile.ts`) — breakpoint hook — switches between two entirely different layouts:
- **Mobile**: `MobileLayout` — tab-based group switching, bottom input bar, workspace sheet
- **Desktop**: `Sidebar` + `BoardHeader` + `Board` — kanban columns side by side

Drag-and-drop uses `@dnd-kit`. On mobile, dragging a card over a group tab navigates to that group (via `handleDragOver`). `DragOverlay` renders a ghost card during drag. A custom `collisionDetection` strategy is used: group tabs (droppable IDs prefixed `tab:`) are tested with a 1×1 rect at the card's top-left corner via `rectIntersection`; all other droppables use `closestCenter`. This fixes edge hits on the leftmost tab pill.

### Features

- **Pomodoro**: `PomodoroPlanner` builds a block schedule from workspace todos; `PomodoroTimer` runs it. `M3LinearProgress` (`src/components/pomodoro/M3LinearProgress.tsx`) is a custom animated SVG wavy progress bar — amplitude springs to 0 when paused and bounces back on resume (M3 expressive spring: ζ=0.55, ω₀=18). Uses `@material/web` for M3 web components. Alarm sound uses a custom Capacitor plugin (`src/plugins/AlarmSound.ts`) bridging to native Android.
  - **Background timer (Android)**: When running on Android, `PomodoroTimer` starts a native Android Foreground Service (`PomodoroTimerService.java`) that keeps ticking even when the app is minimized. A persistent notification in the status bar shows the current block label, live MM:SS countdown, a progress bar, and action buttons (Pause/Resume, +5 min, Next). Notification button taps are handled by `PomodoroActionReceiver.java` (BroadcastReceiver). The Capacitor bridge plugin is `PomodoroTimerPlugin.java` (TS side: `src/plugins/PomodoroTimer.ts`). React re-syncs from native state on foreground re-entry via `App.addListener('appStateChange')` + `getState()`. Native service is the source of truth in background; React is in foreground.
- **Task details**: `TaskDetailsSheet` — markdown description (via `MarkdownEditor`), priority, color, tags, due date, subtasks, comments, group move.
- **Markdown editor**: `MarkdownEditor` (`src/components/MarkdownEditor.tsx`) — inline rich-text editor with toolbar (H1, H2, bold, italic, list). Converts between markdown syntax and plain-line display.
- **Countdown**: `useCountdown` (`src/hooks/useCountdown.ts`) — hook that ticks every second, returns `{ days, hours, minutes, seconds, isOverdue, isExpiringSoon }` from a `endTime` timestamp. Used by `TodoCard` for due-date display.
- **Search**: `SearchPanel` — filters todos across all groups in the active workspace.
- **Group settings**: `onCompleteMoveTo` — when a todo is checked, it auto-moves to a configured target group.
- **Group sort/filter**: `sortBy` and `filterBy` fields on `GroupSettings` (persisted). Applied view-side via `applyGroupView()` in `src/lib/todoView.ts`, consumed via `useMemo` in `ActiveGroupView` (mobile) and `GroupColumn` (desktop). DnD reorder is suppressed when a sort is active. UI: chip-selector rows in `GroupSettingsSheet`.

### UI / Styling

Design system is documented in `style.md`. Key rules:
- **Dark-first**. Background is always `oklch(0.07 0.005 30)`. Never use light backgrounds in components.
- `--primary`: tomato red `oklch(0.6455 0.1801 33.7456)` — CTAs, active states
- `--secondary`: amber `oklch(0.8730 0.1396 93.5379)` — break states, badges
- Button animation classes from `index.css`: use `btn-spring` (rect CTA), `btn-spring-pill` (tabs/chips), `btn-spring-icon` (icon buttons), `spring-check` (checkboxes). **Do not combine these with `active:scale-95` or `transition-all`** — they handle both internally.
- M3 animation utilities (sheets, dialogs, list items): `m3-sheet`, `m3-dialog`, `m3-list-item`, `m3-fade-in`, etc.
- Cards: `rounded-2xl bg-white/8 border border-white/10`. Color accent via `border-l-[3px]`.
- Min touch target: `w-10 h-10` (44dp). Always include `aria-label` on icon-only buttons.
- Tailwind v4 (CSS-first config, no `tailwind.config.js`). shadcn/ui components live in `src/components/ui/` and are built on **`@base-ui/react`** primitives (Button, Dialog, Input, ScrollArea, Separator, Tooltip, etc.) — not Radix UI.

### Path alias

`@/` maps to `src/`. Use it for all imports within `src/`.

### Key dependencies

| Package | Purpose |
|---|---|
| `@tanstack/react-router` | File-based routing |
| `@dnd-kit/core`, `@dnd-kit/sortable` | Drag-and-drop |
| `@capacitor/preferences` | Persistent storage |
| `@capacitor/app` | Android back button |
| `@material/web` | M3 web components (pomodoro progress bar) |
| `@base-ui/react` | Headless UI primitives for shadcn components |
| `@capacitor-community/native-audio` | Available but alarm bridged via custom `AlarmSound` plugin |
| `@capacitor/app` | Android back button + `appStateChange` for foreground re-sync |
| `tailwindcss` v4 | CSS-first config |
| `lucide-react` | Icons |

## Maintenance rule

**Whenever you make a change that involves any of the following, update `CLAUDE.md` (and `style.md` if relevant) before finishing the task:**
- New file created anywhere in `src/`
- Directory structure change (folder added/moved/removed)
- New dependency added to `package.json`
- Design system change (new color, animation, component pattern, or styling convention)
- New feature, plugin, or major behaviour change

Keep the docs accurate — they are the single source of truth for future sessions.
