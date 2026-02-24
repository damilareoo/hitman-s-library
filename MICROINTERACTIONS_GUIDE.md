# Comprehensive Microinteractions Guide

This document outlines all microinteractions implemented throughout the application to ensure engaging, seamless, and delightful user experiences.

---

## Table of Contents

1. [Animation Foundation](#animation-foundation)
2. [Button & Control Interactions](#button--control-interactions)
3. [Data Loading & Fetching](#data-loading--fetching)
4. [Form & Input Feedback](#form--input-feedback)
5. [Navigation & Transitions](#navigation--transitions)
6. [Visual Feedback](#visual-feedback)
7. [Copy & Clipboard](#copy--clipboard)
8. [Empty States](#empty-states)
9. [Error Handling](#error-handling)
10. [Node-Based Workflow](#node-based-workflow)
11. [Typography & Fonts](#typography--fonts)
12. [Accessibility](#accessibility)

---

## Animation Foundation

### CSS Animation Library (`app/globals.css`)

**Location**: `app/globals.css` (lines 774-1319)

A comprehensive animation library with 50+ keyframe animations supporting all microinteractions:

- **Entrance/Exit**: `fade-in`, `fade-in-up`, `slide-up`, `slide-in`, `scale-in`
- **Loading States**: `spin`, `pulse`, `skeleton-loading`
- **Success Feedback**: `checkmark-draw`, `checkmark-bounce`
- **User Feedback**: `toast-slide-in`, `toast-slide-out`, `toast-bounce`, `copy-to-check`
- **Input States**: `input-focus-ring`, `input-underline-expand`, `shake`
- **Empty States**: `float`, `pulse-glow`
- **Cards/Elements**: `lift`, `item-reveal`
- **Progress**: `progress-advance`, `progress-pulse`
- **Icons**: `icon-rotate`, `icon-bounce`, `icon-flip`
- **Nodes**: `node-glow`, `node-pulse`

**Easing Functions Used**:
- `cubic-bezier(0.34, 1.56, 0.64, 1)` - Spring physics for natural motion
- `cubic-bezier(0.4, 0, 0.2, 1)` - Material Design standard
- `ease-out` - Perception of speed

**Reduced Motion Support** (line 1107):
All animations respect `prefers-reduced-motion: reduce` to ensure accessibility for users with motion sensitivity.

---

## Button & Control Interactions

### Button Component Enhancements (`components/ui/button.tsx`)

**Interactive States**:
- **Hover**: Subtle background change with shadow lift (`hover:shadow-md`)
- **Active/Press**: Scale down to 95% (`active:scale-95`) providing tactile feedback
- **Overflow Prevention**: Overflow hidden for ripple containment
- **Variant-Specific**: Each variant (default, destructive, outline, secondary, ghost, link) has dedicated hover/active states

**Animation Timing**: 300ms with cubic-bezier spring easing

**Usage Example**:
```tsx
<Button variant="default">Click me</Button>
```
On click, the button scales down briefly, providing immediate haptic-like feedback.

---

## Data Loading & Fetching

### Loading Skeleton Component (`components/ui/loading-skeleton.tsx`)

**Features**:
- Animated skeleton placeholders during data loads
- Multiple types: `card`, `text`, `avatar`, `list`, `table`
- Staggered animations for multiple items (60ms delays)
- Smooth gradient animation across skeleton elements

**Usage**:
```tsx
<LoadingSkeleton type="card" count={3} />
```

**Animation Details**:
- Uses `animate-skeleton` (linear 2s animation)
- Gradient shift creates perceived loading progress
- Stagger effect makes multiple skeletons feel coordinated

### Design Browser Loading States (`components/design-browser.tsx`)

**Load Sequence**:
1. Display loading spinner + skeleton cards
2. Fetch designs from API
3. Fade out skeletons, fade in loaded cards
4. Stagger card reveals (60ms delays per card)
5. Show success indicator with loaded count

**Success Feedback**:
```tsx
<div className="flex items-center gap-2 text-sm text-green-600 animate-content-fade">
  <CheckCircle2 className="h-4 w-4" />
  <span>Loaded {count} design references</span>
</div>
```

---

## Form & Input Feedback

### Input Focus Animations (`app/globals.css`)

**Animations**:
- `input-focus-ring`: Glow pulse on focus (0.5s ease-out)
- `input-underline-expand`: Horizontal line expansion (origin: left)
- Smooth border-color transitions
- Ring color matches primary theme

**Visual Feedback**:
- Subtle glow appears on focus
- Underline grows from left to right
- Color transitions smoothly

---

## Navigation & Transitions

### Panel Entrance Animations

**Used In**: Execution panel, design details panels

**Animations**:
- `panel-slide-in`: Smooth horizontal slide from left with fade (0.3s)
- `backdrop-fade`: Dark overlay fade-in (0.3s)
- `modal-scale-in`: Scale up with fade (0.3s)

**Timing**: All panel transitions use 0.3s cubic-bezier spring easing for snappy yet smooth appearance

---

## Visual Feedback

### Card Hover Effects (`components/design-browser.tsx`)

**Interactive Hover**:
```tsx
className={cn(
  "hover:border-primary/30 hover:bg-primary/3 hover:shadow-sm",
  "transition-all duration-300 ease-out"
)}
```

**Effects**:
- Border color shift (primary @ 30% opacity)
- Background tint (primary @ 3% opacity)
- Subtle shadow elevation
- 300ms transition for smoothness

### Icon Animations

**Copy Icon Behavior**:
- Normal: Displays copy icon
- On Click: Icon scales down (0.8), rotates slightly (-10deg)
- Success: Transitions to checkmark with bounce animation (`animate-checkmark`)
- Duration: 0.3s spring easing

**Rotation Icons**:
- Loader: `animate-spin-fast` (0.8s linear)
- Spinner: `animate-spin-slow` (2s linear)

---

## Copy & Clipboard

### Typography Copy Interaction (`components/typography-display.tsx`)

**Complete Flow**:
1. User hovers font item → copy button fades in
2. User clicks copy → icon transforms to checkmark
3. Checkmark bounces in (0.6s cubic-bezier spring)
4. Toast notification slides in from right (`animate-toast-in`)
5. Success state persists for 2 seconds
6. Checkmark fades out, returns to copy icon

**Visual Indicators**:
- Button background: `bg-green-500/10` when copied
- Icon: Green text color (`text-green-600`)
- External link icon: Scales up on group hover (`group-hover:scale-110`)

**Toast Animation**:
- Slides in from right (384px translate)
- Fades in simultaneously (0.4s)
- Optional bounce effect on entry

---

## Empty States

### Empty State Display (`components/design-browser.tsx`)

**Visual Treatment**:
```tsx
<Card className="border-dashed hover:border-primary/40 transition-colors animate-content-fade">
  <CardContent className="pt-12 pb-12 text-center space-y-3">
    <p className="text-muted-foreground font-medium">No designs found</p>
    <p className="text-xs text-muted-foreground">Start by analyzing and storing design references.</p>
  </CardContent>
</Card>
```

**Animations**:
- Card fades in (`animate-content-fade`)
- Border color transitions on hover
- 300ms transition for interactivity

### Execution Panel Empty State

**Visual**:
- Play icon bounces in center (`animate-icon-bounce`)
- Text fades in below
- Subtle guidance for user action

---

## Error Handling

### Error State Animations

**Design Browser Errors**:
- Card fades in (`animate-content-fade`)
- Icon bounces continuously (`animate-icon-bounce`)
- Card shakes on initial appearance (`animate-shake`)
- Red/destructive color scheme

**Execution Panel Errors**:
- Similar shake + bounce effect
- Prominent destructive styling
- Clear error message display

**Shake Animation** (0.5s):
```
0%, 100% → translateX(0)
10%, 30%, 50%, 70%, 90% → translateX(-4px)
20%, 40%, 60%, 80% → translateX(4px)
```

---

## Node-Based Workflow

### Execution Panel Animations (`components/execution-panel.tsx`)

**Running Node Display**:
- Outer glow pulse: `animate-node-glow` (2s infinite)
- Spinner: `animate-spin-fast` (0.8s linear)
- Node label: Fades in (`animate-content-fade`)
- Iteration count: Reveals with animation (`animate-item-reveal`)

**Completion Indicators**:
- Checkmark appears with bounce: `animate-checkmark`
- Item reveals with stagger: 100ms delay per log entry
- Success: Green checkmark color (`text-green-600`)
- Error: Red alert icon with bounce

**Iteration Display**:
- Each iteration expands/collapses smoothly
- Latest iteration badge with primary color
- 300ms transition for open/close state

---

## Typography & Fonts

### Font Item Display (`components/typography-display.tsx`)

**Reveal Sequence**:
1. Font items fade in (`animate-content-fade`)
2. Staggered reveals (50ms per item)
3. Badge pops in: `animate-badge-pop` (0.4s)
4. Border animation on category headers

**Interactive Elements**:
- External link icon: Scales on hover (`group-hover:scale-110`)
- Copy button: Fades in on hover (opacity transition)
- Border highlight: Primary color @ 30% opacity on hover

**Categorized Display**:
- Heading Fonts: No delay
- Body Fonts: 100ms delay
- Monospace Fonts: 200ms delay
- Category borders: Left-aligned with primary color

---

## Accessibility

### Motion Preferences

**Implementation** (line 1107):
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

All animations instantly resolve for users with `prefers-reduced-motion: reduce`.

### Focus States

**Focus Ring**:
- 2px solid outline in ring color
- 2px outline offset
- Smooth transition on focus (0.2s)
- Clearly visible across all components

### ARIA & Semantic HTML

- Proper `aria-label` on interactive elements
- `aria-hidden` on decorative icons
- Semantic color usage (destructive, success, primary)
- Clear error/success messaging

---

## Performance Considerations

### 60fps Consistency

**Optimized Properties**:
- Only animate `transform` and `opacity` where possible
- Use `will-change: background-color, color` strategically
- Hardware acceleration via transform3d implicitly
- Avoid animating layout-triggering properties

### Animation Timing

**Durations**:
- Micro-interactions (copy, focus): 0.2-0.3s
- Entrances/Exits: 0.3-0.4s
- State changes: 0.3s
- Long operations (loading): 0.8-2s

### Stagger Calculations

**Formula**: `animationDelay = index * baseDelay`

- Cards/items: 60ms base delay
- Font items: 50ms base delay
- Execution log entries: 100ms base delay

This creates coordinated, non-overlapping reveals.

---

## Testing Microinteractions

### Manual Testing Checklist

- [ ] Buttons press with scale feedback
- [ ] Loading states show skeleton placeholders
- [ ] Copy to clipboard shows checkmark animation
- [ ] Cards fade in with stagger on load
- [ ] Error states shake and bounce
- [ ] Execution panel glows while running
- [ ] Typography fonts reveal categorized
- [ ] Empty states display with guidance
- [ ] All animations smooth at 60fps
- [ ] Reduced motion preferences respected
- [ ] Focus states clearly visible
- [ ] Toast notifications appear/disappear smoothly

### Browser DevTools Inspection

1. Enable DevTools → Performance → Record
2. Perform interaction
3. Check FPS graph stays above 50fps
4. Look for smooth 60fps in animations
5. Verify no layout thrashing

---

## Microinteraction Principles Applied

1. **Feedback**: Every action gets immediate visual response
2. **Feed-forward**: Loading states indicate what's happening
3. **Consistency**: Similar actions produce similar animations
4. **Purposefulness**: All animations serve user understanding
5. **Minimalism**: Animations enhance, don't distract
6. **Delight**: Unexpected small joys (bounce effects, glows)
7. **Performance**: Smooth 60fps across all interactions
8. **Accessibility**: Respect motion preferences, clear focus states

---

## Future Enhancements

- Sound feedback for key interactions (optional toggle)
- Haptic feedback for mobile devices
- Advanced gesture animations
- Progressive animation complexity based on device capability
- Customizable animation speed preferences
- Animation analytics to measure user satisfaction

---

## References

- Emil Kowalski's Animation Principles
- Material Design Interaction Guidelines
- Framer Motion Concepts
- Web Animation Best Practices

---

**Last Updated**: 2026-02-24
**Version**: 1.0
