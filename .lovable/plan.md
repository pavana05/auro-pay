

# Premium Scratch Cards UI Overhaul

Redesign the Scratch Cards page to match the SpinWheel's ultra-premium aesthetic — ambient backgrounds, particle effects, glassmorphism cards, and rich scratch animations.

## Changes to `src/pages/ScratchCards.tsx`

### 1. Ambient Background
- Fixed radial gradient orbs (gold, teal, purple) like SpinWheel
- Floating sparkle particles using `star-fall` animation
- Confetti burst on card reveal

### 2. Premium Header
- Sparkles icon in title, "Rewards" badge pill (like SpinWheel's "Daily" badge)
- Entrance animation with `slide-up-spring`

### 3. Stats Banner Upgrade
- Multi-layered glassmorphism with `bg-white/[0.03]` + `border-white/[0.06]`
- Animated gold glow halo behind icon
- Shimmer sweep effect on the card count

### 4. Scratch Card Visual Overhaul
- **Unscratched surface**: Conic gradient gold pattern with animated shimmer sweep overlay, premium border glow, floating "✨" particles on the card face
- **Scratch animation**: Multi-phase reveal — particles scatter outward, surface dissolves with blur + scale, then reward bounces in with spring animation
- **Revealed reward**: Pulsing glow halo behind emoji, animated coin counter, confetti burst
- **LED-style dots** around each card border (like SpinWheel's ring dots)

### 5. History Section
- Glassmorphism rows with subtle hover glow
- Staggered entrance animations
- Gold accent line on left border

### 6. Empty & Loading States
- Premium floating card animation for empty state
- Gold-accented spinner with pulsing glow

## Files to Edit
- `src/pages/ScratchCards.tsx` — Full UI overhaul (logic unchanged)

