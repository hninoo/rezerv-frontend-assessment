import { Dashboard } from "@/features/dashboard/Dashboard";
import { AppShell } from "@/components/app-shell/AppShell";
import { parseCapacity } from "@/lib/format/capacity";
import { classApi } from "@/lib/mock-api/classes";

function getAttendanceParts(attendance: string) {
  const { used: booked, total: capacity } = parseCapacity(attendance);

  return { booked, capacity };
}

export default async function ClassTimetablePage() {
  const classPage = await classApi.list({ delayMs: 0 });
  const classRows = classPage.rows;
  const totals = classRows.reduce(
    (summary, fitnessClass) => {
      const attendance = getAttendanceParts(fitnessClass.attendance);

      return {
        booked: summary.booked + attendance.booked,
        capacity: summary.capacity + attendance.capacity,
        full: summary.full + (fitnessClass.status === "Full" ? 1 : 0),
        scheduled: summary.scheduled + (fitnessClass.status === "Scheduled" ? 1 : 0)
      };
    },
    { booked: 0, capacity: 0, full: 0, scheduled: 0 }
  );
  const capacityPercentage = Math.round((totals.booked / totals.capacity) * 100);

  return (
    <AppShell
      active="class-timetable"
      eyebrow="Component Engineering Challenge"
      title="Fitness Class Timetable"
    >
      <section className="dashboard-page">
        <div className="summary-strip" aria-label="Class timetable summary">
          <div className="summary-item">
            <span>Classes</span>
            <strong>{classRows.length}</strong>
            <small>Active schedule</small>
          </div>
          <div className="summary-item summary-item--jade">
            <span>Booked seats</span>
            <strong>
              {totals.booked} / {totals.capacity}
            </strong>
            <small>{capacityPercentage}% capacity</small>
          </div>
          <div className="summary-item summary-item--brass">
            <span>Scheduled</span>
            <strong>{totals.scheduled}</strong>
            <small>Ready classes</small>
          </div>
          <div className="summary-item summary-item--lacquer">
            <span>Full classes</span>
            <strong>{totals.full}</strong>
            <small>Capacity reached</small>
          </div>
        </div>

        <Dashboard rows={classRows} />
      </section>
    </AppShell>
  );
}
