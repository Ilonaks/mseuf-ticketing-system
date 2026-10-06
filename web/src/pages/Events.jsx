import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const formatDate = (value) =>
  new Date(value).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });

const formatPrice = (price) =>
  Number(price) === 0 ? "Free" : `₱${Number(price).toFixed(2)}`;

export default function Events() {
  const { user } = useAuth();
  const isStudent = user.role === "student";

  const [events, setEvents] = useState([]);
  const [myEventIds, setMyEventIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null); // { type: "success" | "error", text }
  const [busyId, setBusyId] = useState(null);

  const loadData = async () => {
    try {
      const eventsRes = await api.get("/events");
      setEvents(eventsRes.data);

      if (isStudent) {
        const ticketsRes = await api.get("/tickets");
        setMyEventIds(
          ticketsRes.data.filter((t) => t.status !== "cancelled").map((t) => t.event_id)
        );
      }
    } catch {
      setMessage({ type: "error", text: "Could not load events." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const reserve = async (eventId) => {
    setBusyId(eventId);
    setMessage(null);

    try {
      const res = await api.post(`/events/${eventId}/tickets`);
      setMessage({
        type: "success",
        text: `${res.data.message} Your ticket code: ${res.data.ticket.ticket_code}`,
      });
      await loadData();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Could not reserve a ticket.",
      });
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <p className="center">Loading events...</p>;

  return (
    <>
      <h2 className="page-title">Upcoming Events</h2>

      {message && <div className={message.type}>{message.text}</div>}

      {events.length === 0 ? (
        <p className="muted">No events available yet.</p>
      ) : (
        <div className="grid">
          {events.map((event) => {
            const hasTicket = myEventIds.includes(event.id);
            const soldOut = event.tickets_count >= event.capacity;

            return (
              <div className="event-card" key={event.id}>
                <div className="event-header">
                  <h3>{event.title}</h3>
                  <span className={`badge badge-${event.status}`}>{event.status}</span>
                </div>

                {event.description && <p className="muted">{event.description}</p>}

                <p><strong>Venue:</strong> {event.venue}</p>
                <p><strong>Date:</strong> {formatDate(event.start_at)}</p>
                <p><strong>Slots:</strong> {event.tickets_count} / {event.capacity} reserved</p>
                <p className="price">{formatPrice(event.price)}</p>

                {isStudent && (
                  <button
                    onClick={() => reserve(event.id)}
                    disabled={hasTicket || soldOut || busyId === event.id}
                  >
                    {hasTicket
                      ? "Ticket reserved ✓"
                      : soldOut
                      ? "Sold out"
                      : busyId === event.id
                      ? "Reserving..."
                      : "Get Ticket"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}