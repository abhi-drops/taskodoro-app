# UI Style Guide

## Design Philosophy
Bold, colorful, dark-first mobile app. Strong visual hierarchy, vivid accent gradients, large typography, chunky pill/rounded controls. Inspired by Material 3 Expressive — max 1–2 hero moments per screen, clear primary action, generous touch targets.

---

## Color Tokens (CSS vars)
| Token | Value | Use |
|-------|-------|-----|
| `--primary` | `oklch(0.6455 0.1801 33.7456)` | Tomato red — work sessions, CTAs, active states |
| `--secondary` | `oklch(0.8730 0.1396 93.5379)` | Warm amber/yellow — break sessions, badges |
| `--background` | dark: `oklch(0 0 0)` | App background |
| `--card` | dark: `oklch(0.1822 0 0)` | Surface layer |
| `--muted` | dark: `oklch(0.2393 0 0)` | Subtle fill |
| `--border` | dark: `oklch(0.2686 0 0)` | Hairline separators |

### Dark UI Palette (in-component)
- **Page bg**: `bg-[#0d0d0d]` or `oklch(0.07 0.01 30)` tinted per session type
- **Surface**: `bg-white/8` → `bg-white/12` on hover
- **Borders**: `border-white/10`
- **Primary text**: `text-white`
- **Secondary text**: `text-white/50` – `text-white/70`
- **Disabled / muted**: `text-white/25` – `text-white/35`

---

## Typography
| Role | Classes |
|------|---------|
| Display (timer) | `font-mono font-black tracking-tighter` + `clamp(4rem, 22vw, 7rem)` |
| Hero label | `text-3xl font-black text-white` |
| Section heading | `text-xs font-bold text-white/30 uppercase tracking-widest` |
| Body | `text-sm font-medium text-white` |
| Caption | `text-xs text-white/50` |

---

## Shape & Radius
| Element | Radius |
|---------|--------|
| Primary action button | `rounded-2xl` |
| Modal / sheet | `rounded-t-3xl` (bottom sheet), `rounded-3xl` (modal) |
| Cards / rows | `rounded-2xl` |
| Chips / badges | `rounded-full` |
| Icon buttons | `rounded-2xl` |
| Inputs | `rounded-2xl` |
| Checkboxes | `rounded-md` |

---

## Buttons
### Primary (CTA)
```
bg-primary text-white rounded-2xl h-12–h-14 px-5 font-semibold
shadow-lg shadow-primary/40 active:scale-95 transition-all
```
### Secondary / Ghost
```
bg-white/10 text-white rounded-2xl h-12–h-14 px-5 font-semibold
hover:bg-white/20 active:scale-95 transition-colors
```
### Icon button (nav)
```
w-10 h-10 rounded-2xl bg-white/10 text-white/60
hover:bg-white/20 hover:text-white transition-colors
```
### Destructive
```
text-destructive hover:bg-destructive/10
```
**Touch target minimum: 44×44px**

---

## Progress
- Slim horizontal bar: `h-2 rounded-full bg-white/10` with gradient fill
- Work gradient: `from-primary to-orange-400`
- Break gradient: `from-secondary to-yellow-300`

---

## Session-Tinted Backgrounds
- **Work**: `linear-gradient(160deg, oklch(0.14 0.03 30), oklch(0.08 0.01 30))`
- **Break**: `linear-gradient(160deg, oklch(0.14 0.03 90), oklch(0.08 0.01 90))`

---

## Overlays / Modals
```
background: rgba(0,0,0,0.85)
backdrop-filter: blur(12px)
```
Bottom sheets: `rounded-t-3xl` + drag handle `w-10 h-1 rounded-full bg-white/20`

---

## Cards (Todo / Search result)
```
rounded-2xl bg-white/8 border border-white/10
hover:bg-white/12 transition-colors
```
Color accent: `border-l-[3px]` with todo.color value.

---

## Navigation Dots (progress indicator)
- Active block: `w-6 h-2.5 rounded-full bg-white` (pill)
- Completed: `w-2.5 h-2.5 rounded-full bg-white/40`
- Upcoming: `w-2.5 h-2.5 rounded-full bg-white/15`

---

## Mode Badges
```
flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold uppercase tracking-widest
Work:  bg-primary text-white
Break: bg-secondary text-secondary-foreground
```

---

## M3 Expressive Spring Classes (index.css)
Source: M3 web spring → cubic-bezier conversion table

| Class | Shape change on press | Use on |
|---|---|---|
| `btn-spring` | scaleX 0.96 + scaleY 0.92, border-radius increases | Rect CTAs, overlay buttons |
| `btn-spring-pill` | scaleY 0.88, pill stays pill | Tab chips, tag filters |
| `btn-spring-icon` | scale 0.88, border-radius morphs `rounded-xl → rounded-2xl` | Icon buttons, small squares |
| `spring-check` | scale 0.85, morphs to circle | Checkboxes, toggles |

Spring easing used: `cubic-bezier(0.42, 1.67, 0.21, 0.90)` at 350ms (M3 expressive fast spatial).  
The y > 1 control point causes overshoot = natural bounce/spring feel.  
Color/bg transitions use fast effects: `cubic-bezier(0.31, 0.94, 0.34, 1.00)` at 150ms.

Do **not** combine these with `active:scale-95` or `transition-all` — they handle both.

## Animations
- Button spring morph: `btn-spring` / `btn-spring-pill` / `btn-spring-icon` / `spring-check`
- Timer pulse on expire: `animate-pulse`
- Block transition: `transition-all duration-300`
- Progress bar: `transition-all duration-1000`

---

## Accessibility
- Min touch target: 44dp (≈ `w-11 h-11` / `w-10 h-10`)
- Text contrast: white on dark surfaces ≥ 4.5:1
- `aria-label` on all icon-only buttons
- `role="dialog" aria-modal="true"` on sheets/modals
- `aria-pressed` on toggle buttons
