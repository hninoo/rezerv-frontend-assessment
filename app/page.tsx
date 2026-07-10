import Link from "next/link";

const routes = [
  {
    href: "/animation",
    title: "Animation Challenge",
    description: "Original Myanmar mythic collectible landing experience."
  },
  {
    href: "/dashboard",
    title: "Class Dashboard",
    description: "Fitness timetable built with a reusable generic DataTable."
  },
  {
    href: "/table-demo",
    title: "Second Table Demo",
    description: "A separate dataset to prove the DataTable is reusable."
  }
];

export default function HomePage() {
  return (
    <main className="page page--light">
      <section className="container container--narrow">
        <div>
          <p className="eyebrow">
            Rezerv Frontend Engineering Assessment
          </p>
          <h1 className="title">
            Animation and component engineering challenge.
          </h1>
          <p className="copy">
            A focused Next.js assessment with an animated collectible page, a
            fitness timetable dashboard, and a reusable table demo.
          </p>
        </div>

        <div className="route-grid">
          {routes.map((route) => (
            <Link
              className="route-card"
              href={route.href}
              key={route.href}
            >
              <h2>{route.title}</h2>
              <p>{route.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
