# StackDrop Design.md

> Design system and UI direction for StackDrop, adapted from the uploaded Flatfile reference into a desktop document-search utility.

## 1. Product Context

StackDrop is a local-first desktop app for indexing and searching documents on a user's machine.

The interface must communicate:

- local
- fast
- private
- document-centric
- precise
- utility-first
- not SaaS marketing
- not a file manager clone
- not an AI/chat product

Primary user action:

1. Open StackDrop.
2. Search indexed documents.
3. Index or refresh folders when needed.
4. Open a document detail view when a result matters.

The design must make **search and results** the main product surface.

## 2. Design Direction

### Name

**Precision Document Utility**

### Source Inspiration

This direction adapts the Flatfile-style reference: light theme, monochrome palette, precise typography, flat surfaces, document/data density, and one muted green accent.

### Adaptation Rule

Use the Flatfile reference as a foundation, not a clone.

StackDrop is a desktop search utility, so the final UI must be more functional, compact, and result-focused than a marketing page.

## 3. Non-Negotiables

### Preserve Product Behavior

Do not change:

- database schema
- indexing logic
- OCR logic
- file watcher logic
- Tauri commands
- search behavior
- routing
- document detail behavior
- localStorage behavior for background indexing

### Do Not Add

- AI
- auth
- cloud sync
- semantic/vector search
- server APIs
- dashboards unrelated to document search
- external font files
- decorative animations
- decorative gradients
- unnecessary dependencies

### UI Scope

Primary files:

- `src/features/documents/screens/DocumentLibraryScreen.tsx`
- `src/app/layout/styles.css`

Tests may be updated only if selectors/text moved because of layout changes.

## 4. Theme

Theme: **light**

Overall feel:

- white canvas
- flat surfaces
- high contrast text
- subtle borders
- minimal shadows
- soft pill interactions
- dense but readable document rows

Avoid:

- dark theme as default
- giant editorial hero text
- marketing-site layout
- card-heavy dashboard clutter
- loud color palette

## 5. Color Tokens

Use these CSS custom properties.

```css
:root {
  --color-midnight-ink: #090b2b;
  --color-forest-bloom: #0e1301;
  --color-growth-sprout: #e5ebd3;
  --color-paper-white: #ffffff;
  --color-ghost-gray: #e5e7eb;
  --color-canvas-fog: #f8f8f8;
  --color-obsidian-black: #1b1b1e;
  --color-ash-slate: #808080;
  --color-steel-gray: #aaaaaa;
  --color-silver-mist: #d7d7d7;
  --color-anchor-link: #5f6368;

  /* Functional exception, not a brand accent */
  --color-danger-text: #b42318;
  --color-danger-bg: #fff7f7;
  --color-danger-border: #f3b4ad;

  /* Focus */
  --color-focus-ring: #1b1b1e;
}
```

### Semantic Use

| Purpose | Token |
|---|---|
| Primary text | `--color-midnight-ink` |
| Muted text | `--color-ash-slate` |
| Secondary muted text | `--color-steel-gray` |
| Page background | `--color-paper-white` |
| Secondary surface | `--color-canvas-fog` |
| Borders/dividers | `--color-ghost-gray` |
| Subtle outlines | `--color-silver-mist` |
| Primary action | `--color-obsidian-black` |
| Primary action text | `--color-paper-white` |
| Soft accent background | `--color-growth-sprout` |
| Soft accent text | `--color-forest-bloom` |
| Destructive/error text | `--color-danger-text` |

### Color Rules

- Use **Growth Sprout** only for active/positive utility states, such as active filter, indexed status, or background indexing enabled.
- Use **Obsidian Black** for primary actions like `Index library`.
- Use **danger colors** only for destructive actions and parse failure states.
- Do not introduce new brand colors.
- Do not use gradients.
- Do not use blue as the main CTA color.

## 6. Typography

Use system fonts only.

```css
:root {
  --font-interface: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  --text-caption: 12px;
  --text-small: 14px;
  --text-body: 16px;
  --text-subheading: 22px;
  --text-heading: 28px;
  --text-display: 38px;

  --leading-tight: 1.1;
  --leading-normal: 1.45;
  --leading-relaxed: 1.6;

  --tracking-tight: -0.03em;
  --tracking-normal: -0.01em;
}
```

### Type Roles

| Role | Size | Weight | Line height | Letter spacing |
|---|---:|---:|---:|---:|
| Page title | 38px | 600 to 700 | 1.1 | -0.03em |
| Section heading | 22px | 600 | 1.25 | -0.02em |
| Body | 16px | 400 | 1.45 | -0.01em |
| Result title | 16px | 600 | 1.35 | -0.01em |
| Metadata | 14px | 400 | 1.45 | -0.01em |
| Badge/caption | 12px | 500 | 1.2 | normal |

### Typography Rules

- Use Inter/system fallback only.
- Do not import custom Flatfile fonts.
- Headings should feel precise, not playful.
- Avoid giant marketing headers.
- Keep document metadata smaller and muted.

## 7. Spacing and Shape Tokens

```css
:root {
  --spacing-4: 4px;
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-64: 64px;

  --radius-card: 16px;
  --radius-panel: 20px;
  --radius-control: 999px;
  --radius-badge: 999px;
  --radius-input: 16px;

  --layout-max-width: 1180px;
  --sidebar-width: 240px;
}
```

### Shape Rules

- Buttons and filter chips: full pill radius.
- Search input: 16px radius.
- Main cards/panels: 16px to 20px radius.
- Result rows: 12px to 16px radius when grouped in a surface.
- Do not use sharp 0px cards inside the desktop app, even if the source reference uses them.
- Do not use heavy box shadows.

## 8. Page Structure

The Document Library screen must follow this order:

1. Page header
2. Search and filters
3. Compact index/status toolbar
4. Results list
5. Manage locations disclosure/panel

### Required Above-the-Fold Content

At normal desktop height, the user must see:

- page title
- search input
- filters
- at least part of the results list or empty state
- compact index controls

Search must not be pushed below large settings/folder cards.

## 9. Layout

### Main Content

```css
.layout-main {
  background: var(--color-paper-white);
}

.stack {
  max-width: var(--layout-max-width);
  margin: 0 auto;
  gap: var(--spacing-16);
}
```

### Sidebar

The sidebar should feel quiet and stable.

Rules:

- White background.
- Thin right border.
- Brand block at top.
- Active nav item uses `Canvas Fog` or `Growth Sprout`.
- Avoid oversized sidebar icons.
- Avoid decorative gradients.

## 10. Components

### 10.1 Search Panel

Role: primary product interaction.

Required:

- prominent search input
- placeholder: `Search file name or document content`
- filters directly below
- no card clutter above it

Visual:

- white or `Canvas Fog` panel
- subtle border
- 20px radius
- 20px to 24px padding
- no heavy shadow

Search input:

```css
.search-input {
  width: 100%;
  min-height: 52px;
  border: 1px solid var(--color-silver-mist);
  border-radius: var(--radius-input);
  padding: 0 18px;
  font-size: var(--text-body);
  color: var(--color-midnight-ink);
  background: var(--color-paper-white);
}
```

### 10.2 Filter Chips / Segmented Controls

Use pill filters instead of bulky select-heavy UI when possible.

Required filter groups:

- Location
- Type
- Parse status

Acceptable implementation:

- Keep existing `<select>` elements if lower-risk.
- Style them as pill controls.
- If converting to chips, preserve exact filtering behavior.

States:

| State | Style |
|---|---|
| Default | white/transparent, border `Silver Mist`, muted text |
| Hover | `Canvas Fog` |
| Active | `Obsidian Black` background, white text |
| Positive active | `Growth Sprout` background, `Forest Bloom` text |

### 10.3 Compact Index Toolbar

Replace large `Library index` and `Settings` cards with a compact toolbar.

Must include:

- `Index library` button
- `Add folder` button
- indexed locations count
- Shell OK/version if available
- watcher/background indexing status
- `Auto-index while open` toggle
- last scan summary if available

Suggested layout:

```text
3 indexed locations · Shell OK (v2.0.0) · Watching indexed folders
[Index library] [Add folder] [Auto-index while open]
```

Rules:

- One compact panel.
- Do not create a separate full Settings card.
- Background indexing remains user-controllable.
- Background indexing copy should be short.

### 10.4 Buttons

#### Primary Button

Use for `Index library`.

```css
.button-primary {
  background: var(--color-obsidian-black);
  color: var(--color-paper-white);
  border: 1px solid var(--color-obsidian-black);
  border-radius: var(--radius-control);
  padding: 10px 18px;
  font-weight: 600;
}
```

#### Secondary Button

Use for `Add folder`, `Re-scan`, `Manage locations`.

```css
.button-secondary {
  background: transparent;
  color: var(--color-midnight-ink);
  border: 1px solid var(--color-silver-mist);
  border-radius: var(--radius-control);
  padding: 10px 18px;
  font-weight: 500;
}
```

#### Soft Accent Button

Use sparingly for active or enabled state, not for every CTA.

```css
.button-accent {
  background: var(--color-growth-sprout);
  color: var(--color-forest-bloom);
  border: 1px solid var(--color-growth-sprout);
  border-radius: var(--radius-control);
}
```

#### Danger Button

Use only for `Remove from StackDrop`.

```css
.button-danger {
  background: var(--color-danger-bg);
  color: var(--color-danger-text);
  border: 1px solid var(--color-danger-border);
  border-radius: var(--radius-control);
}
```

### 10.5 Result Rows

Result rows are the core surface.

Each result must show:

- file name
- extension badge
- parse-status badge
- path or relative path
- optional metadata if available
- clear parse failure state
- click target to document detail route

Suggested structure:

```text
[PDF] [Parsed text]
Favorite-Font-List.pdf
C:\Users\Chimdumebi\Downloads\Favorite-Font-List.pdf
```

For OCR:

```text
[PDF] [Parsed OCR]
scanned-contract.pdf
Extracted with OCR fallback
```

For parse failed:

```text
[PDF] [Parse failed]
SGA First Meeting Presentation.pdf
Could not extract searchable text. Open details for error.
```

Visual rules:

- Dense but readable.
- Row padding: 14px to 16px.
- Border between rows or individual rounded rows.
- Hover state: `Canvas Fog`.
- Failed rows: use danger text/border subtly, not a full red block.
- No default link underline on the whole row.

### 10.6 Badges

Required badges:

- `TXT`
- `PDF`
- `DOCX`
- `DOC`
- `Parsed text`
- `Parsed OCR`
- `Parse failed`

Badge style:

```css
.badge {
  display: inline-flex;
  align-items: center;
  border-radius: var(--radius-badge);
  border: 1px solid var(--color-ghost-gray);
  padding: 3px 8px;
  font-size: var(--text-caption);
  line-height: 1.2;
  color: var(--color-midnight-ink);
  background: var(--color-paper-white);
}
```

Status badge mapping:

| Status | Style |
|---|---|
| Parsed text | neutral badge |
| Parsed OCR | soft accent badge |
| Parse failed | danger badge |

### 10.7 Manage Locations Panel

Indexed locations must not dominate the top of the screen.

Use either:

- collapsed disclosure, or
- compact section below results

Required:

- path
- last scan timestamp
- Re-scan action
- Remove from StackDrop action

Suggested heading:

```text
Manage indexed locations (3)
```

Rules:

- Do not place this above search results unless collapsed.
- Do not make each folder row taller than needed.
- Keep destructive action visually secondary but clear.

### 10.8 Empty States

#### No indexed documents

```text
No indexed documents yet.
Index your library to search Documents, Desktop, Downloads, and any folders you add.
[Index library]
```

#### No matching search results

```text
No documents matched this search.
Try a different filename, phrase, file type, or parse-status filter.
```

#### No indexed locations

```text
No indexed locations.
Add a folder or index the default library locations.
```

### 10.9 Document Detail Screen

If touched, keep it consistent:

- title at top
- badges under title
- metadata grid
- extracted preview in `Canvas Fog`
- parse error clearly shown for failed files
- no decorative sections

## 11. Accessibility Requirements

- Text and controls must maintain readable contrast.
- Do not use color alone to communicate parse status.
- Keep visible focus states for keyboard users.
- Inputs, buttons, links, and result rows must have clear focus styling.
- Preserve labels or `aria-label`s for controls.
- Do not remove status updates that assist screen readers.

Suggested focus style:

```css
:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 3px;
}
```

## 12. Interaction Rules

- Search remains responsive as user types.
- Results remain clickable.
- Indexing actions must still disable while scanning/busy.
- Background indexing toggle must persist existing localStorage behavior.
- Folder removal must still confirm before removing from StackDrop.
- Removing a folder must never delete files from disk.

## 13. Copy Rules

Use direct, utility-focused copy.

Good:

- `Search file name or document content`
- `Index library`
- `Add folder`
- `Auto-index while open`
- `Manage locations`
- `Parsed OCR`
- `Parse failed`

Avoid:

- `Unlock insights`
- `Your knowledge hub`
- `AI-powered`
- `Supercharge productivity`
- `Magical document intelligence`

## 14. CSS Implementation Starter

Add or adapt these tokens in `src/app/layout/styles.css`.

```css
:root {
  color: #090b2b;
  background: #ffffff;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  --color-midnight-ink: #090b2b;
  --color-forest-bloom: #0e1301;
  --color-growth-sprout: #e5ebd3;
  --color-paper-white: #ffffff;
  --color-ghost-gray: #e5e7eb;
  --color-canvas-fog: #f8f8f8;
  --color-obsidian-black: #1b1b1e;
  --color-ash-slate: #808080;
  --color-steel-gray: #aaaaaa;
  --color-silver-mist: #d7d7d7;
  --color-anchor-link: #5f6368;

  --color-danger-text: #b42318;
  --color-danger-bg: #fff7f7;
  --color-danger-border: #f3b4ad;

  --spacing-4: 4px;
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-64: 64px;

  --radius-card: 16px;
  --radius-panel: 20px;
  --radius-control: 999px;
  --radius-badge: 999px;
  --radius-input: 16px;

  --layout-max-width: 1180px;
  --sidebar-width: 240px;
}
```

## 15. Verification Checklist

After implementation, verify:

- Search input is visible above the fold.
- Results are visible without scrolling after indexing when enough screen height exists.
- Index controls are compact.
- Settings is not a separate large card.
- Indexed locations no longer dominate the screen.
- Result rows show badges, path, and status.
- `parse_failed` is visibly distinct.
- Buttons are consistently styled.
- Focus states are visible.
- No external fonts were added.
- No indexing/search/OCR/watcher behavior changed.

## 16. Required Commands

Run:

```bash
npm run typecheck
npm run test
npm run build
```

If E2E fails only because UI text moved, update tests minimally without weakening coverage.

## 17. Definition of Done

The UI is done when StackDrop feels like a polished desktop document search utility:

- search-first
- compact controls
- readable result rows
- Flatfile-inspired palette
- no marketing fluff
- no feature creep
- no backend behavior changes
