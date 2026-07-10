# Rezerv Frontend Assessment

This project contains the two assessment parts:

- Part 1: animated landing page
- Part 2: reusable data table

The app is built with Next.js, React, TypeScript, SCSS modules, Three.js, Lenis,
GSAP, Framer Motion, and Vitest.

Deployed website:

```text
https://rezerv-frontend-assessment.vercel.app
```

## 1. Setup Instructions

### Prerequisites

- **Node.js ≥ 20.9** (Next.js 16 requires it — a default Node 16 will fail to
  run `dev`/`build`). The test runner (Vitest 4) needs **≥ 20.12**.
- Verified on **Node v20.11.1** for `dev` / `build` / `lint`, and **v22.21.1**
  for `test`. With `nvm`: `nvm use 20.11.1` (or `nvm use 22` before `npm test`).

### Install & run

```bash
npm install
npm run dev            # start the dev server (http://localhost:3000)
```

Open the Part 1 animation page at:

```text
http://localhost:3000/          # (same experience is also served at /blobverse)
```

### Other scripts

```bash
npm run build          # production build (Node ≥ 20.9)
npm run start          # serve the production build
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm run test           # Vitest (use Node ≥ 20.12, e.g. `nvm use 22`)
```

## 2. Pages

```text
https://rezerv-frontend-assessment.vercel.app/                  Part 1 animation page
https://rezerv-frontend-assessment.vercel.app/blobverse         Part 1 review route
https://rezerv-frontend-assessment.vercel.app/class-timetable   Part 2 class timetable table
https://rezerv-frontend-assessment.vercel.app/room-bookings     Part 2 second table demo
```

## 3. Part 1: BLOBVERSE

Reference used for motion study:

```text
https://nft.fluffyhugs.io/
```

The artwork, copy, and theme are original to this project. The reference was
used only for animation pacing and page feel.

### Which 3 Slides I Implemented

Three scroll-driven scenes (defined in `features/blobverse/blobverse-scenes.ts`),
preceded by a real asset preloader:

1. **Opening / hero — "ENTER THE BLOBVERSE"** (`3,333 on-chain blobs`). One bright
   focal blob with supporting blobs scattered in depth, a central glow, and a
   depth-of-field + bloom postprocessing pass.
2. **Community — "ONE HUGE, CHAOTIC CREW"** (night theme). A mini solar system
   (orbiting planets, moons, rings, asteroid belt) surrounded by poppable
   iridescent soap-bubbles (click to pop → particle burst + shockwave).
3. **Return / CTA — "READY TO BLOB OUT?"** A looping call-to-action scene with
   glowing rings and floating blobs; scrolling past it wraps back to scene 1.

*(A preloader — `components/Loader/Loader.tsx` — runs first on real texture
readiness; it is a loading state, not one of the three scenes.)*

Main files:

```text
app/blobverse/page.tsx                              route
features/blobverse/BlobverseExperience.tsx          React shell (phase/loader/reduced-motion)
features/blobverse/BlobverseWebglStage.tsx          thin React mount seam
features/blobverse/scene/createBlobverseStage.ts    framework-agnostic Three.js controller
features/blobverse/hooks/useScrollSections.ts       Lenis smooth scroll → scene progress
features/blobverse/blobverse-scenes.ts              scene copy + texture manifest
features/blobverse/blobverse.module.scss            DOM overlay styling
```

### Libraries Chosen And Why

- **Three.js** (`0.185`): the hero is one live WebGL scene — transmission
  (refracting) bubbles, a mini solar system, instanced particle pops, and a
  depth-of-field + bloom chain. DOM/CSS can't do real DoF, refraction, or
  thousands of depth-sorted sprites at 60fps.
- **Lenis**: inertial smooth scrolling. Its eased scroll value is the single
  timeline that drives every scene transition (instead of raw `scrollY`).
- **GSAP**: the one-shot bubble **`pop!`** microinteraction affordance.
- **Framer Motion**: `prefers-reduced-motion` detection (`useReducedMotion`) plus
  small React entrance states.
- **SCSS modules**: scoped styling for the DOM text overlay, chrome, and loader
  without pulling in a CSS framework.
- **Next.js (App Router) + TypeScript**: routing, build pipeline, and type-safe
  props/refs across the React ↔ scene boundary.

### Approach To Animation, Smooth Scroll, And Responsiveness

- **Animation** — a single framework-agnostic controller (`createBlobverseStage`)
  builds the scene graph and runs **one** `requestAnimationFrame` loop. Ambient
  motion (float, orbit, parallax, pulse) is derived from elapsed time; scene
  visibility/crossfade is derived from scroll progress. Headline/body copy is a
  DOM overlay that reveals per character. The React component is just a
  mount/unmount seam — no imperative WebGL in the render path.
- **Smooth scroll** — Lenis produces an eased scroll position; `useScrollSections`
  normalizes it into `{ global, sectionIndex, localProgress }` written to a ref
  every frame. The scene reads that ref (never `window.scrollY`), so visuals and
  scroll stay locked together; scenes crossfade by cyclic distance and loop
  seamlessly (last → first).
- **Responsiveness** — viewport width selects a compact profile (`< 760px` → fewer
  blobs/bubbles, smaller textures); `resize()` recomputes camera distance and
  group scale from the aspect ratio; the DOM overlay is fluid via SCSS `clamp()`
  and media queries. Desktop adds pointer parallax; touch uses intent thresholds.

### Performance Notes

- Device pixel ratio is **capped by screen area** to bound fragment cost.
- The ~50 blob textures are **pre-rasterized** from 2000px source SVGs
  (which embedded multi-MB raster fills) to committed 512px WebP files in
  `public/blobs` — the runtime texture payload drops from ~154MB to **~0.8MB**.
  At runtime they are further capped to ≤ 512px (≤ 320px on mobile) so the
  textures don't exhaust GPU memory.
- Pop droplets are **one pooled `InstancedMesh`** (320 instances); shockwave rings
  are pooled too — no per-interaction allocation.
- Bubble reflections use an environment map **baked once** via PMREM.
- **DoF + bloom run only while the hero scene is visible**, and are disabled under
  reduced motion.
- One RAF loop; `ResizeObserver`-driven resize; every geometry, material, texture,
  render target, and the composer is **disposed on unmount**.
- `prefers-reduced-motion` is honored (ambient motion is reduced).
- If the optional postprocessing modules fail to load, the scene **falls back to a
  plain render** instead of crashing.

### Assumptions Made

- "Any three sections" is satisfied by three scroll-driven scenes; the artwork and
  copy are original — the reference site was used only for motion pacing/feel.
- A modern browser with WebGL2 is assumed, with a graceful fallback to a plain
  render if postprocessing can't load.
- CTAs (view collection / join) are in-page affordances — they don't navigate or
  mint anything.
- Scrolling loops infinitely (the last scene wraps to the first).
- `/` and `/blobverse` render the same Part 1 experience; default dev port is 3000.

## 4. Part 2: Data Table

The table is built from scratch. No table/grid library is used.

**Setup:** see [§1 Setup Instructions](#1-setup-instructions) — same install/run
steps and Node requirement apply. Review routes: `/class-timetable` (client mode)
and `/room-bookings` (server mode).

Main files:

```text
components/data-table/DataTable.tsx
components/data-table/DataTable.types.ts
features/dashboard/Dashboard.tsx
features/dashboard/hooks/useAttendees.ts
features/room-bookings/hooks/useRoomBookings.ts
lib/table/sorting.ts
lib/table/pagination.ts
lib/table/expansion.ts
lib/mock-api/
```

Column shape:

```ts
type ColumnDef<T> = {
  id: string;
  header: string;
  accessor: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  sortable?: boolean;
  pinned?: "left";
  width?: number;
};
```

The table is generic over its row type (`DataTable<T>`) and fully driven by
`columns` — the header and every cell come from the column list, so adding,
reordering, or re-rendering a column needs no change to the table itself.

### Component API and how column definitions work

Each `ColumnDef<T>` describes one column:

- `id` — stable key; also the sort + `aria-sort` identity.
- `header` — column label.
- `accessor(row)` — custom cell render, returns any `ReactNode` (badge, capacity
  bar, plain text…).
- `sortValue(row)` — optional sort key for when the rendered cell isn't directly
  comparable (e.g. a JSX cell); otherwise the accessor value is used.
- `sortable`, `pinned: "left"`, `width` — behaviour / layout flags.

The table maps over `columns` for `<thead>` and for each row's `<td>`s
(`column.accessor(row)`); the first column automatically hosts the expand toggle
when a row is expandable. Key props: `rows` / `columns` / `getRowId` / `ariaLabel`;
`sort` / `onSortChange` / `manualSorting`; `pagination` / `onPaginationChange` /
`manualPagination` / `totalRows` / `pageSizeOptions`; `canExpandRow` /
`renderExpandedRow` / `getRowExpansionState` / `onExpandedRowChange`; `isLoading`;
`error`.

### Client-side vs server-side (sort & pagination)

The same component is controlled *or* uncontrolled, per concern:

- Sort: `activeSort = sort === undefined ? localSort : sort`
- Pagination: `activePagination = pagination ?? localPagination`

Omit `sort` / `pagination` and the table owns them in local state and sorts +
slices the in-memory rows (**client mode**). Pass them together with
`manualSorting` / `manualPagination` and the table does **not** sort or slice — it
renders `rows` as the current page, emits change events, and the parent supplies
the sorted page + `totalRows` (**server mode**).

- `/class-timetable` → uncontrolled / client-side.
- `/room-bookings` → controlled / server-side: `useRoomBookings` owns sort, page
  and filters, calls the mock API, and feeds back the page + total.

Sorting cycles asc → desc → none (`getNextSortDirection`). Invalid sort key → rows
left in natural order; out-of-range page → `clampPageIndex`. Both are unit-tested.

### Expandable rows — inline and on-demand

One expansion API, two data strategies:

- **Inline** — children ship with the parent (e.g. `class-002`); `renderExpandedRow`
  reads them directly, no fetch.
- **On-demand** — expanding fires `onExpandedRowChange(row, true)`; the parent hook
  lazily fetches children and reports status through `getRowExpansionState(row)` →
  `{ isLoading, error }`. `DataTableExpandedContent` shows a **skeleton** while
  loading, an **error** (`role="alert"`) on failure, otherwise the children.

The expanded panel is a second `<tr>` with `<td colSpan={columns.length}>` so it
spans the full width. Expand/collapse is animated; on collapse the row stays
mounted until `onAnimationEnd` (tracked via `closingExpandedIds`) so the exit
transition plays. The toggle is a `<button>` with `aria-expanded` + `aria-controls`.

### Sticky / pinned column

`pinned: "left"` tags a column; its cells get `position: sticky; left: 0`. The
body scrolls horizontally (`overflow-x: auto`) on narrow / mobile while the pinned
column stays fixed. An `onScroll` handler sets `data-pinned-shadow` when
`scrollLeft > 0`, dropping a shadow/divider so the pinned column reads as floating
above the scrolled content. (The boolean `setState` bails when unchanged, so it
re-renders only on the 0 ↔ >0 transition, not per scroll frame.)

### State management decision, and why

No global store. State is local and colocated:

- The table owns presentational state with `useState`: local sort, local
  pagination, expanded ids (+ closing ids for the exit animation), the
  scroll-shadow flag, and the page-jump input. Controlled props override the local
  copies.
- Data + orchestration live in feature hooks (`useRoomBookings`, `useAttendees`)
  that wrap the mock-API layer + `useAsyncData`, keeping the pages presentational.
- Sort / pagination / expansion logic are pure modules under `lib/table/`.

Why: there is no cross-cutting shared state, so a global store (Redux/Zustand)
would add ceremony for no benefit. Local state + the controlled/uncontrolled split
lets one component work in both client and server modes; the hook layer keeps
data-fetching out of components.

### Tradeoffs and assumptions

- **Large data → server mode.** `/room-bookings` models a **5,000,000-row** store
  (`lib/mock-api/booking-store.ts`) with typed-array columns + counting-sort +
  server pagination. The browser never holds all rows — only the current page is in
  the DOM, so no row virtualization is needed.
- Client-side sort is `[...rows].sort()` (O(n log n)) — fine for the small
  timetable, which is exactly why the huge dataset uses server mode instead.
- The mock API models production endpoints: artificial latency, failure toggles,
  bounded page sizes; large data is treated as backend-owned.
- Sort keys are assumed string/number — supply `sortValue` for JSX / derived cells.
- Responsive strategy is horizontal scroll + sticky column (not a card reflow),
  around a single ~768px breakpoint.
- The expanded-content skeleton is a fixed child-shaped layout, since child rows
  differ from the parent columns.

## 5. Project Structure

```text
app/
  page.tsx
  layout.tsx
  globals.scss
  blobverse/page.tsx
  class-timetable/page.tsx
  room-bookings/page.tsx

components/
  Loader/
  app-shell/
  data-table/
    DataTable.tsx
    DataTable.types.ts
    DataTableBody.tsx
    DataTableFooter.tsx
    DataTableHeader.tsx
  ui/

features/
  blobverse/
    BlobverseExperience.tsx
    BlobverseWebglStage.tsx
    hooks/
    lib/
    scene/
    sections/
  dashboard/
    Dashboard.tsx
    components/
    hooks/
  room-bookings/
    components/
    hooks/
    room-booking-columns.tsx

hooks/
  use-async-data.ts
  use-debounced-value.ts

lib/
  data/
  format/
  mock-api/
  table/
  time/
```
