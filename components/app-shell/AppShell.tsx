import Link from "next/link";

import type { ReactNode } from "react";

type AppShellProps = {
  active: "class-timetable" | "room-bookings";
  children: ReactNode;
  eyebrow: string;
  title: string;
};

const navItems = [
  {
    href: "/class-timetable",
    key: "class-timetable",
    label: "Class Timetable"
  },
  {
    href: "/room-bookings",
    key: "room-bookings",
    label: "Room Bookings"
  }
];

export function AppShell({ active, children, eyebrow, title }: AppShellProps) {
  const activeItem = navItems.find((item) => item.key === active);

  return (
    <main className="app-shell">
      <aside className="app-sidebar" aria-label="Workspace navigation">
        <Link className="app-sidebar__brand" href="/">
          <span>R</span>
          <strong>Rezerv</strong>
        </Link>
        <nav className="app-sidebar__nav" aria-label="Primary">
          <span className="app-sidebar__group">Workspace</span>
          {navItems.map((item) => (
            <Link
              aria-current={item.key === active ? "page" : undefined}
              className="app-sidebar__link"
              data-active={item.key === active ? "true" : undefined}
              href={item.href}
              key={item.key}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <section className="app-main">
        <header className="app-topbar">
          <div>
            <p>{eyebrow}</p>
            <h1>{title}</h1>
          </div>
          <div className="app-topbar__actions" aria-label="Workspace actions">
            <span className="app-topbar__status">Live workspace</span>
            <span className="app-topbar__user">Hnin Oo</span>
          </div>
        </header>
        <div className="app-content">
          <nav className="app-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span>Admin</span>
            <span aria-hidden="true">/</span>
            <strong>{activeItem?.label ?? title}</strong>
          </nav>
          {children}
        </div>
      </section>
    </main>
  );
}
