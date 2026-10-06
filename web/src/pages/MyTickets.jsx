import { useEffect, useState } from "react";
import api from "../api/axios";

const formatDate = (value) =>
  new Date(value).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const loadTickets = async () => {
    try {
      const res = await api.get("/tickets");
      setTickets(res.data);
    } catch {
      setMessage({ type: "error", text: "Could not load your tickets." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const cancel = async (ticketId) => {
    if (!window.confirm("Cancel this ticket?")) return;

    try {
      const res = await api.patch(`/tickets/${ticketId}/cancel`);
      setMessage({ type: "success", text: res.data.message });
      await loadTickets();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Could not cancel the ticket.",
      });
    }
  };

  if (loading) return <p className="center">Loading tickets...</p>;

  return (
    <>
      <h2 className="page-title">My Tickets</h2>

      {message && <div className={message.type}>{message.text}</div>}

      {tickets.length === 0 ? (
        <p className="muted">You don't have any tickets yet.</p>
      ) : (
        <div className="grid">
          {tickets.map((ticket) => (
            <div className="event-card" key={ticket.id}>
              <div className="event-header">
                <h3>{ticket.event?.title}</h3>
                <span className={`badge badge-${ticket.status}`}>{ticket.status}</span>
              </div>

              <p className="ticket-code">{ticket.ticket_code}</p>
              <p><strong>Venue:</strong> {ticket.event?.venue}</p>
              <p><strong>Date:</strong> {ticket.event && formatDate(ticket.event.start_at)}</p>

              {ticket.status === "reserved" && (
                <button className="btn-outline" onClick={() => cancel(ticket.id)}>
                  Cancel Ticket
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}