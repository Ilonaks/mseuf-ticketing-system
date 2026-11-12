import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { errorMessage, formatDate, formatPeso } from "../utils/format";
import { ColumnChart, PercentBars } from "../components/Charts";
import usePolling from "../hooks/usePolling";
import LiveBadge from "../components/LiveBadge";

export default function Reports() {
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  const loadReport = ({ background = false } = {}) =>
    api
      .get("/reports")
      .then((res) => {
        setReport(res.data);
        setError("");
      })
      .catch((err) => !background && setError(errorMessage(err, "Could not load reports.")));

  useEffect(() => {
    loadReport();
  }, []);

  usePolling(() => loadReport({ background: true }));

  if (error) return <div className="error">{error}</div>;
  if (!report) return <p className="center">Loading reports...</p>;

  const { totals, events } = report;

  return (
    <>
      <h2 className="page-title">
        {user.role === "admin" ? "Dashboard — All Events" : "Dashboard — My Events"} <LiveBadge />
      </h2>

      <div className="stats">
        <div className="stat"><span>{totals.events}</span>Events</div>
        <div className="stat"><span>{totals.published_events}</span>Published</div>
        <div className="stat"><span>{totals.tickets_sold}</span>Tickets sold</div>
        <div className="stat"><span>{totals.checked_in}</span>Checked in</div>
        <div className="stat"><span>{totals.cancelled}</span>Cancelled</div>
        <div className="stat"><span>{formatPeso(totals.revenue)}</span>Revenue</div>
      </div>

      <div className="chart-grid-2">
        <section className="chart-card chart-wide">
          <h3>Tickets reserved · last 14 days</h3>
          <ColumnChart
            data={report.daily.map((d) => {
              const date = new Date(`${d.date}T00:00:00`);
              return {
                label: date.toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
                title: date.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" }),
                value: d.tickets,
              };
            })}
          />
        </section>

        <section className="chart-card">
          <h3>Seats filled</h3>
          <p className="muted">Tickets sold ÷ capacity</p>
          {events.length === 0 ? (
            <p className="muted empty">No events yet.</p>
          ) : (
            <PercentBars
              rows={events.map((e) => ({
                id: e.id,
                label: e.title,
                value: e.capacity ? (e.tickets_sold / e.capacity) * 100 : 0,
                detail: `${e.tickets_sold} of ${e.capacity} seats`,
              }))}
            />
          )}
        </section>

        <section className="chart-card">
          <h3>Attendance</h3>
          <p className="muted">Checked in ÷ tickets sold</p>
          {events.filter((e) => e.tickets_sold > 0).length === 0 ? (
            <p className="muted empty">No tickets sold yet.</p>
          ) : (
            <PercentBars
              rows={events
                .filter((e) => e.tickets_sold > 0)
                .map((e) => ({
                  id: e.id,
                  label: e.title,
                  value: e.attendance_rate,
                  detail: `${e.checked_in} of ${e.tickets_sold} checked in`,
                }))}
            />
          )}
        </section>
      </div>

      <h3 className="section-title">All events</h3>
      {events.length === 0 ? (
        <p className="muted">No events yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Date</th>
                {user.role === "admin" && <th>Organizer</th>}
                <th>Status</th>
                <th>Sold / Capacity</th>
                <th>Checked in</th>
                <th>Attendance</th>
                <th>Cancelled</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td><Link to={`/events/${e.id}`}>{e.title}</Link></td>
                  <td>{formatDate(e.start_at)}</td>
                  {user.role === "admin" && <td>{e.organizer}</td>}
                  <td><span className={`badge badge-${e.status}`}>{e.status}</span></td>
                  <td>{e.tickets_sold} / {e.capacity}</td>
                  <td>{e.checked_in}</td>
                  <td>{e.attendance_rate}%</td>
                  <td>{e.cancelled}</td>
                  <td>{formatPeso(e.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
