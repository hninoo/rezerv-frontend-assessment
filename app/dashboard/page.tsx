import { Dashboard } from "@/features/dashboard/Dashboard";
import { sampleClasses } from "@/lib/data/classes";

export default function DashboardPage() {
  return (
    <main className="page page--light">
      <section className="container">
        <p className="eyebrow">
          Component Engineering Challenge
        </p>
        <h1 className="title">Fitness Class Timetable</h1>
        <p className="copy">
          A self-contained dashboard view for the reusable DataTable scenario in
          the assessment.
        </p>

        <Dashboard rows={sampleClasses} />
      </section>
    </main>
  );
}
