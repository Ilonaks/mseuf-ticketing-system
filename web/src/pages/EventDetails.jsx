import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import { canCheckIn, canManage, errorMessage, formatDate, formatPrice, initialsOf, posterSrc } from "../utils/format";
import { downloadAttendeesCsv } from "../utils/download";
import usePolling from "../hooks/usePolling";
import LiveBadge from "../components/LiveBadge";

export default function EventDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useDialog();

  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState(null); // { summary, tickets } for managers
  const [error, setError] = useState("");

  const load = async ({ background = false } = {}) => {
    try {
      const res = await api.get(`/events/${id}`);
      setEvent(res.data);

      // Organizers watch attendees and check-ins update live
      if (canManage(user, res.data)) {
        const att = await api.get(`/events/${id}/attendees`);
        setAttendees(att.data);
      }
    } catch (err) {
      if (!background) setError(errorMessage(err, "Could not load the event."));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  usePolling(() => load({ background: true }));

  const exportCsv = async () => {
    try {
      await downloadAttendeesCsv(event);
      toast("Attendee list downloaded.");
    } catch (err) {
      toast(errorMessage(err, "Could not export the attendee list."), "error");
    }
  };

  if (error) return <div className="error">{error}</div>;
  if (!event) return <p className="center">Loading event...</p>;

  return (
    <>
      <Link className="chip-btn" to="/">← Back to events</Link>

      <div className="event-card details details-card">
        <div className="hero details-hero">
          {posterSrc(event) ? (
            <img className="hero-img" src={posterSrc(event)} alt={`${event.title} poster`} />
          ) : (
            <div className="hero-art">{initialsOf(event.title)}</div>
          )}
        </div>
        <div className="event-header">
          <h2>{event.title}</h2>
          <span className={`badge badge-${event.status}`}>{event.status}</span>
        </div>

        {event.description && <p>{event.description}</p>}

        {event.category && (
          <p>
            <span className="cat-tag">
              <i style={{ background: event.category.color }} /> {event.category.name}
            </span>
          </p>
        )}
        <p><strong>Venue:</strong> {event.venue}</p>
        <p><strong>Starts:</strong> {formatDate(event.start_at)}</p>
        <p><strong>Ends:</strong> {formatDate(event.end_at)}</p>
        <p><strong>Organizer:</strong> {event.organizer?.name}</p>
        <p><strong>Slots:</strong> {event.tickets_count} / {event.capacity} reserved</p>
        {event.waitlist_count > 0 && (
          <p><strong>Waitlist:</strong> {event.waitlist_count} student(s) waiting</p>
        )}
        {event.on_waitlist && (
          <p className="success">You're #{event.waitlist_position} on the waitlist.</p>
        )}
        <p className="price">{formatPrice(event.price)}</p>

        {attendees && (
          <div className="actions">
            <Link className="btn-link btn-link-outline" to={`/events/${event.id}/edit`}>Edit</Link>
            {canCheckIn(user, event) && (
              <Link className="btn-link" to={`/check-in?event=${event.id}`}>Check in tickets</Link>
            )}
            <button type="button" className="chip-btn" onClick={exportCsv}>Export CSV</button>
          </div>
        )}
      </div>

      {attendees && (
        <>
          <h3 className="section-title">
            Attendees <LiveBadge />
          </h3>
          <p className="muted">
            {attendees.summary.reserved} reserved · {attendees.summary.checked_in} checked in ·{" "}
            {attendees.summary.cancelled} cancelled
          </p>

          {attendees.tickets.length === 0 ? (
            <p className="muted">No tickets yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Student ID</th>
                    <th>Email</th>
                    <th>Ticket code</th>
                    <th>Status</th>
                    <th>Checked in</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.tickets.map((t) => (
                    <tr key={t.id}>
                      <td>{t.user?.name}</td>
                      <td>{t.user?.student_id ?? "—"}</td>
                      <td>{t.user?.email}</td>
                      <td className="mono">{t.ticket_code}</td>
                      <td><span className={`badge badge-${t.status}`}>{t.status}</span></td>
                      <td>{t.checked_in_at ? formatDate(t.checked_in_at) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
