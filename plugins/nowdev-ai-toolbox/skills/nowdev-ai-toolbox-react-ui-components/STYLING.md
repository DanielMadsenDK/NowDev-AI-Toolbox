# Styling ServiceNow React UI — Horizon Design Tokens

This file covers:
- Horizon Design System (HDS) CSS custom properties (design tokens)
- Building custom components that match the platform aesthetic
- When to use tokens vs plain CSS

For the current CSS/build model (whether CSS Modules, plain stylesheets, or another mechanism is
supported), load `nowdev-ai-toolbox-servicenow-sdk`, the sole authority for `now-sdk` CLI mechanics,
and ask it to retrieve topic `ui-page-patterns-guide` first — this has changed
between SDK versions and is authoritative over anything below. Some `.module.css` filenames used
as illustrative examples in this file assume CSS Modules support; if the installed SDK's build
model doesn't support them, use the same class names and token values in a plain `.css` file
imported directly instead — only the import mechanism changes, not the tokens or values.

---

## 2. Horizon Design Tokens

`@servicenow/react-components` renders with the Horizon Design System. All HDS components expose
their visual properties through **CSS custom properties** (design tokens) that the platform injects
into the page at runtime. Use these tokens in your own CSS to stay visually in sync with the
platform and automatically inherit dark mode, high-contrast, and workspace theme changes.

### Token categories and key examples

#### Colors

| Token | Meaning |
|-------|---------|
| `--now-color--primary-1` | Lightest brand-primary tint |
| `--now-color--primary-2` | Brand-primary surface |
| `--now-color--primary-6` | Brand-primary interactive (button fill, links) |
| `--now-color--primary-9` | Darkest brand-primary shade |
| `--now-color--neutral-1` | Lightest neutral (near-white background) |
| `--now-color--neutral-2` | Subtle surface / zebra row |
| `--now-color--neutral-6` | Mid-grey (borders, placeholder text) |
| `--now-color--neutral-9` | Near-black text |
| `--now-color--critical-2` | Critical-severity surface |
| `--now-color--critical-6` | Critical icon / badge fill |
| `--now-color--positive-2` | Positive/success surface |
| `--now-color--positive-6` | Positive icon / badge fill |
| `--now-color--warning-2` | Warning surface |
| `--now-color--warning-6` | Warning icon / badge fill |
| `--now-color--info-2` | Informational surface |
| `--now-color--info-6` | Informational icon / badge fill |

#### Semantic color aliases (prefer over raw palette tokens)

| Token | Meaning |
|-------|---------|
| `--now-color_text--primary` | Default body text |
| `--now-color_text--secondary` | Muted / label text |
| `--now-color_text--disabled` | Disabled text |
| `--now-color_background--primary` | Page / panel background |
| `--now-color_background--secondary` | Secondary panel / sidebar |
| `--now-color_divider--primary` | Separator lines |
| `--now-color_focus--primary` | Focus ring color |

#### Typography

| Token | Example value |
|-------|--------------|
| `--now-font-family--primary` | Platform sans-serif stack |
| `--now-font-size--xs` | ~11px |
| `--now-font-size--sm` | ~12px |
| `--now-font-size--md` | ~14px (body default) |
| `--now-font-size--lg` | ~16px |
| `--now-font-size--xl` | ~20px |
| `--now-font-weight--normal` | 400 |
| `--now-font-weight--semi-bold` | 600 |
| `--now-font-weight--bold` | 700 |
| `--now-line-height--md` | Body line height |

#### Spacing

Spacing tokens follow a numeric scale (value in px). Use them for padding, margin, and gap.

| Token | Approximate px |
|-------|----------------|
| `--now-space--1` | 2px |
| `--now-space--2` | 4px |
| `--now-space--4` | 8px |
| `--now-space--6` | 12px |
| `--now-space--8` | 16px |
| `--now-space--10` | 20px |
| `--now-space--12` | 24px |
| `--now-space--16` | 32px |
| `--now-space--20` | 40px |
| `--now-space--24` | 48px |

#### Border & Shape

| Token | Meaning |
|-------|---------|
| `--now-border-radius--sm` | Subtle rounding (~2px) |
| `--now-border-radius--md` | Standard card/input rounding (~4px) |
| `--now-border-radius--lg` | Pill-like rounding (~8px) |
| `--now-color_divider--primary` | Border / separator line color |

#### Elevation

| Token | Meaning |
|-------|---------|
| `--now-box-shadow--elevated` | Card / popover drop shadow |
| `--now-box-shadow--overlay` | Modal / tooltip overlay shadow |

---

### Using tokens in a CSS Module

```css
/* src/client/components/InfoPanel.module.css */
.panel {
  background-color: var(--now-color_background--primary);
  border: 1px solid var(--now-color_divider--primary);
  border-radius: var(--now-border-radius--md);
  box-shadow: var(--now-box-shadow--elevated);
  padding: var(--now-space--8);
  font-family: var(--now-font-family--primary);
  font-size: var(--now-font-size--md);
  color: var(--now-color_text--primary);
}

.panelTitle {
  font-size: var(--now-font-size--lg);
  font-weight: var(--now-font-weight--semi-bold);
  color: var(--now-color_text--primary);
  margin-bottom: var(--now-space--4);
}

.panelSubtitle {
  font-size: var(--now-font-size--sm);
  color: var(--now-color_text--secondary);
}

.divider {
  border: none;
  border-top: 1px solid var(--now-color_divider--primary);
  margin: var(--now-space--8) 0;
}
```

---

### Scoped token overrides

To override a design token for a subtree only, set the custom property on a container class.
The override is scoped to that container and does not affect other parts of the page.

```css
/* src/client/components/BrandedHeader.module.css */

/* Everything inside .brandedContainer gets the overridden token values */
.brandedContainer {
  --now-color_background--primary: #0a2e5c; /* deep navy background */
  --now-color_text--primary: #ffffff;        /* white text on dark bg */
  --now-color_divider--primary: rgba(255, 255, 255, 0.2);

  background-color: var(--now-color_background--primary);
  color: var(--now-color_text--primary);
  padding: var(--now-space--8) var(--now-space--12);
  border-bottom: 1px solid var(--now-color_divider--primary);
}

/* Child text picks up the overridden --now-color_text--primary automatically */
.title {
  font-size: var(--now-font-size--xl);
  font-weight: var(--now-font-weight--bold);
  color: var(--now-color_text--primary);
}
```

```tsx
import styles from './BrandedHeader.module.css';

export function BrandedHeader({ title }: { title: string }) {
  return (
    <div className={styles.brandedContainer}>
      <span className={styles.title}>{title}</span>
    </div>
  );
}
```

> **Important:** Workspace-level theming (dark mode, high-contrast, tenant brand colours) is
> controlled entirely by the ServiceNow platform. When you use tokens, your component adapts
> automatically — you never need to write separate dark-mode overrides.

---

## 3. Building Custom Components That Match the Platform Aesthetic

### Guidelines

- **Use design tokens for all colours, typography, and spacing.** Never hardcode hex values,
  `px` sizes from memory, or generic CSS property values that ServiceNow has a token for.
- **Match HDS component sizing conventions.** HDS uses `sm` / `md` / `lg` size steps;
  mirror that in custom components when they live alongside HDS components.
- **Use `Card` as the outer container** when your component is a card-like widget — it brings
  the correct shadow, border-radius, and background automatically. Add CSS Modules only for the
  interior layout and custom content areas.
- **Inherit `font-family` and `font-size` from the platform cascade** rather than explicitly
  setting them everywhere. Only override where the design deliberately diverges.

### Complete example — MetricCard

A stat card showing a metric label, numeric value, and a trend/status indicator using
Horizon tokens throughout.

```css
/* src/client/components/MetricCard.module.css */
.body {
  display: flex;
  flex-direction: column;
  gap: var(--now-space--4);
  /* Card already has outer padding; body adds inner vertical rhythm only */
  padding: var(--now-space--2) 0;
}

.label {
  font-size: var(--now-font-size--sm);
  font-weight: var(--now-font-weight--normal);
  color: var(--now-color_text--secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.value {
  font-size: var(--now-font-size--xl);
  font-weight: var(--now-font-weight--bold);
  color: var(--now-color_text--primary);
  line-height: 1.2;
}

.trend {
  display: inline-flex;
  align-items: center;
  gap: var(--now-space--2);
  font-size: var(--now-font-size--sm);
  font-weight: var(--now-font-weight--semi-bold);
}

.trendUp {
  color: var(--now-color--positive-6);
}

.trendDown {
  color: var(--now-color--critical-6);
}

.trendNeutral {
  color: var(--now-color_text--secondary);
}

.footer {
  margin-top: var(--now-space--4);
  padding-top: var(--now-space--4);
  border-top: 1px solid var(--now-color_divider--primary);
  font-size: var(--now-font-size--xs);
  color: var(--now-color_text--secondary);
}
```

```tsx
// src/client/components/MetricCard.tsx
import React from 'react';
import {Card} from '@servicenow/react-components/Card';
import {Icon} from '@servicenow/react-components/Icon';
import styles from './MetricCard.module.css';

type Trend = 'up' | 'down' | 'neutral';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: Trend;
  trendLabel?: string;
  footer?: string;
  /** Maps to Card sidebar color — e.g. 'positive', 'critical', 'info' */
  status?: 'positive' | 'critical' | 'warning' | 'info' | 'neutral';
}

const TREND_ICON: Record<Trend, string> = {
  up: 'arrow-up-outline',
  down: 'arrow-down-outline',
  neutral: 'subtract-outline',
};

export function MetricCard({
  label,
  value,
  trend = 'neutral',
  trendLabel,
  footer,
  status,
}: MetricCardProps) {
  const trendClass =
    trend === 'up'
      ? styles.trendUp
      : trend === 'down'
      ? styles.trendDown
      : styles.trendNeutral;

  return (
    <Card
      size="md"
      sidebar={status && status !== 'neutral' ? {color: status, variant: 'primary'} : undefined}
    >
      <div className={styles.body}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value}</span>

        {(trend !== 'neutral' || trendLabel) && (
          <span className={`${styles.trend} ${trendClass}`}>
            <Icon icon={TREND_ICON[trend]} size="sm" />
            {trendLabel}
          </span>
        )}

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </Card>
  );
}
```

Usage:

```tsx
import {MetricCard} from './components/MetricCard';

function Dashboard() {
  return (
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem'}}>
      <MetricCard
        label="Open Incidents"
        value={142}
        trend="down"
        trendLabel="12% vs last week"
        status="info"
        footer="Updated 5 min ago"
      />
      <MetricCard
        label="Critical P1s"
        value={7}
        trend="up"
        trendLabel="3 new today"
        status="critical"
      />
      <MetricCard
        label="Resolved Today"
        value={38}
        trend="up"
        trendLabel="Above target"
        status="positive"
      />
    </div>
  );
}
```

---

## 4. When to Use Horizon Tokens vs Custom CSS

### Decision table

| What you're styling | Use | Reason |
|--------------------|-----|--------|
| Text colour | Token (`--now-color_text--primary`) | Adapts to dark mode & themes |
| Background colour | Token (`--now-color_background--primary`) | Adapts to dark mode & themes |
| Border / divider colour | Token (`--now-color_divider--primary`) | Adapts to themes |
| Button, badge, alert accent colour | Token (`--now-color--critical-6` etc.) | Matches HDS severity palette |
| Font family | Token (`--now-font-family--primary`) | Matches platform typeface |
| Font size | Token (`--now-font-size--md` etc.) | Matches HDS size steps |
| Font weight | Token (`--now-font-weight--bold` etc.) | Consistent with HDS labels |
| Padding / margin / gap | Token (`--now-space--8` etc.) | Matches HDS spacing rhythm |
| Border radius | Token (`--now-border-radius--md`) | Matches HDS shape |
| Box shadow / elevation | Token (`--now-box-shadow--elevated`) | Matches HDS elevation model |
| Grid column count / widths | Custom CSS | Pure layout — no token covers this |
| Absolute/relative positioning | Custom CSS | Structural, not thematic |
| `z-index` layering | Custom CSS | App-specific stacking |
| CSS animations / transitions | Custom CSS | Not covered by HDS tokens |
| Background images / patterns | Custom CSS | Not covered by HDS tokens |
| Aspect ratios / object-fit | Custom CSS | Layout geometry |

### ✅ / ❌ Patterns

```css
/* ✅ Use tokens for colours */
.card {
  background-color: var(--now-color_background--primary);
  border: 1px solid var(--now-color_divider--primary);
  color: var(--now-color_text--primary);
}

/* ✅ Adding a CSS fallback value is acceptable as a safety net */
.card {
  background-color: var(--now-color_background--primary, #ffffff);
  border: 1px solid var(--now-color_divider--primary, #e0e0e0);
  color: var(--now-color_text--primary, #1c1f23);
}

/* ❌ Never use a hardcoded colour as the primary value — it won't adapt to themes or dark mode */
.card {
  background-color: #ffffff;
  border: 1px solid #d0d3d8;
  color: #1c1f23;
}
```

```css
/* ✅ Use spacing tokens for padding/margin */
.panel {
  padding: var(--now-space--8) var(--now-space--12);
  gap: var(--now-space--6);
}

/* ❌ Hardcoded pixel values for spacing drift from platform rhythm */
.panel {
  padding: 16px 24px;
  gap: 12px;
}
```

```css
/* ✅ Custom CSS is correct for structural layout */
.metricsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--now-space--8); /* ← still use a token for the gap */
  align-items: start;
}

/* ✅ Custom CSS for positioning */
.floatingLabel {
  position: absolute;
  top: var(--now-space--2);
  right: var(--now-space--4);
}
```

```css
/* ✅ Override a token only for a scoped subtree */
.darkPanel {
  --now-color_background--primary: #1c1f23;
  --now-color_text--primary: #ffffff;
  background-color: var(--now-color_background--primary);
  color: var(--now-color_text--primary);
}

/* ❌ Never override HDS component internals with !important — it breaks themes */
.myButton {
  background-color: red !important;
}
```

---

## 5. CSS Bundling and Build Configuration

Do not hand-write bundler config (Rollup, `now.prebuild.mjs`, or otherwise) for CSS output without
first asking `nowdev-ai-toolbox-servicenow-sdk` to retrieve topic `ui-page-patterns-guide`. That topic
documents exactly what the installed SDK's build system handles automatically versus what it
forbids agents from configuring manually, and this is the authoritative source for CSS file
placement, linking, and bundling behavior.
