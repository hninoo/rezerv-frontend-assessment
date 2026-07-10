# Rezerv Frontend Assessment

Frontend engineering assessment for Rezerv.

## Stack

- Next.js and React for the app routes and UI.
- TypeScript for the reusable table API.
- SCSS for styling.
- Framer Motion for animation work.
- Vitest for small utility and mock API tests.

## Setup

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Pages

| Page | Description |
| --- | --- |
| `/animation` | UI animation challenge |
| `/dashboard` | Fitness class timetable |
| `/table-demo` | Reusable table demo with a second data shape |

## Part 1: UI Animation

Reference:

```txt
https://nft.fluffyhugs.io/
```

The page uses a different theme and original artwork direction. The reference is used for motion feel, not for copied branding or NFT artwork.

Theme:

```txt
Myanmar Mythic Collectibles
```

Selected sections:

1. Loading screen
2. Hero section
3. Collection section

Animation approach:

- Use Framer Motion for entrance, scroll, and hover transitions.
- Keep normal browser scrolling unless smooth scrolling improves the page.
- Prefer `transform` and `opacity` for motion.
- Keep the layout responsive on desktop, tablet, and mobile.
- Respect reduced-motion preferences where practical.

## Part 2: Reusable DataTable

The DataTable is built from scratch. No table/grid library is used.

Column definition:

```ts
type ColumnDef<T> = {
  id: string;
  header: string;
  accessor: (row: T) => ReactNode;
  sortable?: boolean;
  pinned?: "left";
  width?: number;
};
```

Dashboard columns:

- Class
- Instructor
- Time
- Attendance
- Status

The first column is pinned to the left.

Attendee rows include:

- Customer name
- Payment type
- Booking status

The table is also used on `/table-demo` with room booking data, so it is not tied to the fitness class shape.

## Sorting And Pagination

Client-side sorting and pagination are handled through small helper functions first.

The table types keep sort and pagination state separate from row data. That keeps room for controlled server-style sorting and pagination when the parent owns the data.

## Expandable Rows

The class timetable uses attendee data for child rows.

Expansion modes:

- Inline child rows
- On-demand child rows from mocked API calls

## Mock API

Mock API functions are used instead of a backend.

They support:

- Class loading
- Attendee loading
- Artificial delay
- Error cases

## Performance

- Animate `transform` and `opacity`.
- Avoid layout-heavy animation.
- Keep table helpers small and easy to test.
- Check desktop, tablet, and mobile layouts.

## Tradeoffs

- The project uses simple feature folders instead of a large shared architecture.
- Table helper logic stays outside the component so it can be tested directly.
- Mock API functions model latency and failures without adding backend setup.
- The table is kept small first, then interaction details are added in focused steps.

## Verification

```bash
npm run lint
npm run typecheck
npm run test -- --run
npm run build
```

## Deployment

Target host: Vercel.
Backup host: Netlify.

Build command:

```bash
npm run build
```

## Assumptions

- The final site will be deployed on Vercel unless a different host is chosen.
- The animation artwork will be original project artwork.
- The reference site is used only for animation direction.
- Documentation and code comments are written in English.
