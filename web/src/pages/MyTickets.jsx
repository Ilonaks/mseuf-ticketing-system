import { useEffect, useRef, useState } from "react";
import usePolling from "../hooks/usePolling";
import LiveBadge from "../components/LiveBadge";
import { QRCodeSVG } from "qrcode.react";
import api from "../api/axios";
import { useDialog } from "../context/DialogContext";
import { errorMessage, formatDate } from "../utils/format";

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const { confirm, toast } = useDialog();

  const previousStatus = useRef(null); // ticket id -> status from the last load

  // Tells the student when something happened to a ticket elsewhere (gate scan, waitlist)
  const announceChanges = (list) => {
    const before = previousStatus.current;
    if (before) {
      for (const t of list) {
        const was = before.get(t.id);
        if (was === "reserved" && t.status === "used") {
          toast(`Checked in: ${t.event?.title}. Enjoy the event!`);
        } else if (t.status === "reserved" && was !== "reserved") {
          toast(`A slot opened up! You got a ticket for ${t.event?.title}.`);
        }
      }
    }
    previousStatus.current = new Map(list.map((t) => [t.id, t.status]));
  };

  const loadTickets = async ({ background = false } = {}) => {
    try {
      const res = await api.get("/tickets");
      announceChanges(res.data);
      setTickets(res.data);
    } catch {
      if (!background) toast("Could not load your tickets.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  usePolling(() => loadTickets({ background: true }));

  const cancel = async (ticket) => {
    const ok = await confirm({
      title: "Cancel this ticket?",
      message: `Your ticket ${ticket.ticket_code} for ${ticket.event?.title} will stop working. You can reserve again later if slots remain.`,
      confirmText: "Cancel ticket",
      cancelText: "Keep ticket",
      tone: "danger",
    });
    if (!ok) return;

    try {
      const res = await api.patch(`/tickets/${ticket.id}/cancel`);
      toast(res.data.message);
      await loadTickets();
    } catch (err) {
      toast(errorMessage(err, "Could not cancel the ticket."), "error");
    }
  };

  if (loading) return <p className="center">Loading tickets...</p>;

  return (
    <>
      <h2 className="page-title">
        My Tickets <LiveBadge />
      </h2>


      {tickets.length === 0 ? (
        <p className="muted">You don't have any tickets yet.</p>
      ) : (
        <div className="grid">
          {tickets.map((ticket) => (
            <div className="event-card" key={ticket.id}>
              <div className="event-header">
                <h3>{ticket.event?.title}</h3>
                <span className={`badge badge-${ticket.status}`}>
                  {ticket.status === "used" ? "checked in" : ticket.status}
                </span>
              </div>

              {/* Shown at the entrance; the organizer scans it to check in */}
              {ticket.status === "reserved" && (
                <div className="qr">
                  <QRCodeSVG value={ticket.ticket_code} size={160} />
                </div>
              )}

              <p className="ticket-code">{ticket.ticket_code}</p>
              <p><strong>Venue:</strong> {ticket.event?.venue}</p>
              <p><strong>Date:</strong> {ticket.event && formatDate(ticket.event.start_at)}</p>
              {ticket.status === "reserved" && ticket.event?.check_in_opens_at && (
                <p className="muted">Check-in opens {formatDate(ticket.event.check_in_opens_at)}, until the event ends.</p>
              )}

              {ticket.status === "used" && (
                <p className="success">Used — checked in {formatDate(ticket.checked_in_at)}</p>
              )}

              {ticket.status === "reserved" && (
                <button className="btn-outline" onClick={() => cancel(ticket)}>
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
