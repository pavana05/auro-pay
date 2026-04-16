

# Ultra-Premium Admin Dashboard UI Overhaul

Inspired by the reference image (dealbox.com dashboard), transform the admin dashboard and layout into a world-class, luxury design with rich animations, refined cards, and a polished visual hierarchy.

## What Changes

### 1. AdminLayout.tsx — Premium Sidebar & Header
- **Sidebar**: Add animated gradient border on the left edge, glowing active indicator with smooth transitions, staggered nav item entrance animations
- **Header**: Add user avatar with status ring, notification bell with animated badge, breadcrumb with separator dots, date/time display like reference
- **Password gate**: Add particle-like floating orbs background, premium card with frosted glass effect, animated lock icon

### 2. AdminDashboard.tsx — Full Visual Overhaul
- **Stat cards**: Multi-layered glassmorphism with inner glow borders, animated gradient shimmer sweep on hover, icon boxes with colored glow halos (like reference's Sales Revenue cards), micro-animated trend arrows
- **Chart containers**: Premium frosted-glass cards with subtle gradient top borders, hover elevation effect with shadow scaling, "Week" dropdown-style filters (like reference)
- **Quick Actions**: Card hover lifts with 3D perspective tilt, icon pulse animation on hover, gradient underline reveal
- **System Health**: Animated status dots with ripple effect, progress-bar style health indicators
- **Live Transaction Feed**: Row entrance animations (stagger fade-in), status badges with subtle glow, alternating row highlights
- **Recent Signups**: Avatar with colored ring border, "New" badge like reference, hover slide-right arrow
- **Top Merchants**: Progress bars behind merchant names showing relative volume, rank badges with gradient fills

### 3. New CSS Animations (index.css)
- `admin-shimmer`: Horizontal shimmer sweep for card borders
- `admin-float`: Gentle floating animation for ambient orbs
- `admin-glow-pulse`: Pulsing glow for active elements
- `stagger-fade-in`: Staggered entrance for grid items

## Files to Edit
- `src/components/AdminLayout.tsx` — Premium sidebar, header, password gate
- `src/pages/admin/AdminDashboard.tsx` — All dashboard cards, charts, tables
- `src/index.css` — New admin-specific keyframes

## Technical Notes
- All data fetching and logic remains unchanged — purely visual enhancement
- Uses existing gold primary (#c8952e) theme throughout
- No new dependencies needed

