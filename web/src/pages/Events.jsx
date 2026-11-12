import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import {
  canManage,
  errorMessage,
  eventPayload,
  formatDate,
  formatPrice,
  initialsOf,
  isPast,
  isSoldOut,
  posterSrc,
} from "../utils/format";
import { downloadAttendeesCsv } from "../utils/download";
import usePolling from "../hooks/usePolling";
import LiveBadge from "../components/LiveBadge";
import {
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  PinIcon,
  PlusIcon,
} from "../components/Icons";

const DAYS_SHOWN = 9;
const SEATS_SHOWN = 48;

const dayKey = (value) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const timeOf = (value) =>
  new Date(value).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });

const shortDate = (value) =>
  new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" }).replaceAll("/", ".");

const duration = (start, end) => {
  const hours = (new Date(end) - new Date(start)) / 36e5;
  return hours >= 1 ? `${Math.round(hours * 10) / 10} hrs` : `${Math.round(hours * 60)} min`;
};


// Capacity drawn as a small seat map: dark = taken, light = open
function SeatMap({ taken, capacity }) {
  const takenSeats = taken === 0 ? 0 : Math.max(1, Math.round((taken / capacity) * SEATS_SHOWN));
  return (
    <>
      <div className="seat-map" aria-label={`${taken} of ${capacity} slots reserved`}>
        {Array.from({ length: SEATS_SHOWN }, (_, i) => (
          <span key={i} className={`seat ${i < takenSeats ? "seat-taken" : ""}`} />
        ))}
      </div>
      <div className="seat-legend">
        <span><i className="seat" /> Available · {capacity - taken}</span>
        <span><i className="seat seat-taken" /> Reserved · {taken}</span>
      </div>
    </>
  );
}

export default function Events() {
  const { user } = useAuth();
  const isStudent = user.role === "student";
  const canCreate = user.role === "admin" || user.role === "organizer";
  const { confirm, toast } = useDialog();

  const [events, setEvents] = useState([]);
  const [myEventIds, setMyEventIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null); // dayKey or null for all dates
  const [stripStart, setStripStart] = useState(0); // days from today
  const [selectedId, setSelectedId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState(null); // null = all categories
  const [priceFilter, setPriceFilter] = useState("all"); // all | free | paid
  const [showPast, setShowPast] = useState(false);

  // background = automatic refresh: stay quiet on errors
  const loadData = async ({ background = false } = {}) => {
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
      if (!background) toast("Could not load events.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    api.get("/categories").then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  usePolling(() => loadData({ background: true }));

  const eventDays = useMemo(() => new Set(events.map((e) => dayKey(e.start_at))), [events]);

  const stripDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: DAYS_SHOWN }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + stripStart + i);
      return d;
    });
  }, [stripStart]);

  const query = search.trim().toLowerCase();
  const visible = events.filter((e) => {
    if (selectedDay && dayKey(e.start_at) !== selectedDay) return false;
    if (!showPast && !selectedDay && isPast(e)) return false;
    if (categoryId && e.category_id !== categoryId) return false;
    if (priceFilter === "free" && Number(e.price) > 0) return false;
    if (priceFilter === "paid" && Number(e.price) === 0) return false;
    if (query && !`${e.title} ${e.venue} ${e.description ?? ""}`.toLowerCase().includes(query)) return false;
    return true;
  });
  const filtersActive = Boolean(query || categoryId || priceFilter !== "all" || selectedDay);
  const clearFilters = () => {
    setSearch("");
    setCategoryId(null);
    setPriceFilter("all");
    setSelectedDay(null);
  };
  const selected = visible.find((e) => e.id === selectedId) ?? visible[0] ?? null;

  // Runs an API action for one event, then reloads the list
  const runAction = async (eventId, action, successText) => {
    setBusyId(eventId);
    try {
      const res = await action();
      toast(successText ?? res.data.message);
      await loadData();
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusyId(null);
    }
  };

  const reserve = async (event) => {
    const ok = await confirm({
      title: "Reserve a ticket?",
      message: `${event.title} · ${formatDate(event.start_at)} at ${event.venue}. Price: ${formatPrice(event.price)}.`,
      confirmText: "Get ticket",
    });
    if (!ok) return;
    runAction(event.id, async () => {
      const res = await api.post(`/events/${event.id}/tickets`);
      res.data.message += ` Your code: ${res.data.ticket.ticket_code}`;
      return res;
    });
  };

  const STATUS_PROMPTS = {
    published: {
      title: "Publish this event?",
      message: "Students will be able to see it and reserve tickets.",
      confirmText: "Publish",
      tone: "primary",
    },
    cancelled: {
      title: "Cancel this event?",
      message: "Students can no longer reserve tickets, and existing ticket holders will see it as cancelled.",
      confirmText: "Cancel event",
      cancelText: "Keep event",
      tone: "danger",
    },
  };

  const setStatus = async (event, status) => {
    const prompt = STATUS_PROMPTS[status];
    const ok = await confirm({ ...prompt, title: prompt.title.replace("this event", `"${event.title}"`) });
    if (!ok) return;
    runAction(
      event.id,
      () => api.put(`/events/${event.id}`, eventPayload(event, { status })),
      `"${event.title}" is now ${status}.`
    );
  };

  const joinWaitlist = async (event) => {
    const ok = await confirm({
      title: "Join the waitlist?",
      message: `${event.title} is sold out. If someone cancels, you'll get a ticket automatically (first come, first served) and we'll email you.`,
      confirmText: "Join waitlist",
    });
    if (!ok) return;
    runAction(event.id, async () => {
      const res = await api.post(`/events/${event.id}/waitlist`);
      res.data.message = `You're #${res.data.position} on the waitlist.`;
      return res;
    });
  };

  const leaveWaitlist = async (event) => {
    const ok = await confirm({
      title: "Leave the waitlist?",
      message: "You'll lose your place in line for this event.",
      confirmText: "Leave waitlist",
      cancelText: "Stay",
      tone: "danger",
    });
    if (!ok) return;
    runAction(event.id, () => api.delete(`/events/${event.id}/waitlist`));
  };

  const exportCsv = async (event) => {
    try {
      await downloadAttendeesCsv(event);
      toast("Attendee list downloaded.");
    } catch (err) {
      toast(errorMessage(err, "Could not export the attendee list."), "error");
    }
  };

  const remove = async (event) => {
    const ok = await confirm({
      title: `Delete "${event.title}"?`,
      message:
        event.tickets_count > 0 && event.status !== "cancelled"
          ? `It has ${event.tickets_count} active ticket(s), so it must be cancelled first. Deleting can't be undone.`
          : "This permanently removes the event and its tickets. This can't be undone.",
      confirmText: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    runAction(event.id, () => api.delete(`/events/${event.id}`));
  };

  if (loading) return <p className="center">Loading events...</p>;

  const renderCheckout = (event) => {
    const busy = busyId === event.id;

    if (isStudent) {
      const hasTicket = myEventIds.includes(event.id);
      const soldOut = isSoldOut(event);

      if (soldOut && !hasTicket && event.status === "published" && !isPast(event)) {
        return event.on_waitlist ? (
          <button className="checkout checkout-soft" onClick={() => leaveWaitlist(event)} disabled={busy}>
            <span>On the waitlist · tap to leave</span>
            <strong>{event.waitlist_count} waiting</strong>
          </button>
        ) : (
          <button className="checkout" onClick={() => joinWaitlist(event)} disabled={busy}>
            <span>Sold out / Join waitlist</span>
            <strong>{event.waitlist_count} waiting</strong>
          </button>
        );
      }

      const label = hasTicket ? "Ticket reserved ✓" : soldOut ? "Sold out" : busy ? "Reserving..." : `${shortDate(event.start_at)} / Get Ticket`;
      return (
        <button className="checkout" onClick={() => reserve(event)} disabled={hasTicket || soldOut || busy}>
          <span>{label}</span>
          <strong>{formatPrice(event.price)}</strong>
        </button>
      );
    }

    if (!canManage(user, event)) return null;

    return (
      <>
        <div className="panel-actions">
          <Link className="chip-btn" to={`/events/${event.id}/edit`}>Edit</Link>
          {event.status !== "published" && (
            <button className="chip-btn" disabled={busy} onClick={() => setStatus(event, "published")}>Publish</button>
          )}
          {event.status === "published" && (
            <button className="chip-btn" disabled={busy} onClick={() => setStatus(event, "cancelled")}>Cancel event</button>
          )}
          <button className="chip-btn" disabled={busy} onClick={() => exportCsv(event)}>Export CSV</button>
          <button className="chip-btn chip-danger" disabled={busy} onClick={() => remove(event)}>Delete</button>
        </div>
        <Link className="checkout" to={`/events/${event.id}`}>
          <span>{shortDate(event.start_at)} / Attendees</span>
          <strong>{event.tickets_count} <ArrowRightIcon size={16} /></strong>
        </Link>
      </>
    );
  };

  return (
    <div className="events-layout">
      <section className="events-main">
        <div className="section-head">
          <div>
            <h2 className="page-title">
              {isStudent ? "Upcoming Events" : "Events"} <LiveBadge />
            </h2>
            <p className="muted">
              {visible.length} event{visible.length === 1 ? "" : "s"}
              {filtersActive ? " match your filters" : showPast ? " · including past events" : " · pick a date or filter"}
            </p>
          </div>
          <div className="head-actions">
            {filtersActive && (
              <button className="chip-btn" onClick={clearFilters}>Clear filters</button>
            )}
            {canCreate && (
              <Link className="btn-link" to="/events/new">
                <PlusIcon size={16} /> New Event
              </Link>
            )}
          </div>
        </div>

        <div className="date-strip">
          <button
            className="day-nav"
            onClick={() => setStripStart((s) => Math.max(0, s - 7))}
            disabled={stripStart === 0}
            aria-label="Earlier dates"
          >
            <ChevronLeftIcon />
          </button>
          {stripDays.map((d) => {
            const key = dayKey(d);
            return (
              <button
                key={key}
                className={`day ${selectedDay === key ? "day-active" : ""}`}
                onClick={() => setSelectedDay(selectedDay === key ? null : key)}
              >
                <i className={`day-dot ${eventDays.has(key) ? "has-events" : ""}`} />
                <strong>{d.getDate()}</strong>
                <small>{d.toLocaleDateString("en-PH", { weekday: "short" })}</small>
              </button>
            );
          })}
          <button className="day-nav" onClick={() => setStripStart((s) => s + 7)} aria-label="Later dates">
            <ChevronRightIcon />
          </button>
        </div>

        <div className="filter-bar">
          <input
            type="search"
            className="filter-search"
            placeholder="Search title, venue, or description"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search events"
          />
          <select value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)} aria-label="Price">
            <option value="all">Any price</option>
            <option value="free">Free only</option>
            <option value="paid">Paid only</option>
          </select>
          <label className="toggle">
            <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} />
            Show past events
          </label>
        </div>

        {categories.length > 0 && (
          <div className="category-chips">
            <button className={`cat-chip ${categoryId === null ? "cat-chip-active" : ""}`} onClick={() => setCategoryId(null)}>
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                className={`cat-chip ${categoryId === c.id ? "cat-chip-active" : ""}`}
                onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}
              >
                <i style={{ background: c.color }} /> {c.name}
              </button>
            ))}
          </div>
        )}

        <div className="event-list">
          {visible.length === 0 ? (
            <p className="muted empty">
              {filtersActive ? "No events match your filters." : "No upcoming events yet."}
              {filtersActive && (
                <>
                  {" "}
                  <button className="link-btn" onClick={clearFilters}>Clear filters</button>
                </>
              )}
            </p>
          ) : (
            visible.map((event) => {
              const d = new Date(event.start_at);
              const fill = Math.min(100, (event.tickets_count / event.capacity) * 100);
              return (
                <button
                  key={event.id}
                  className={`event-row ${selected?.id === event.id ? "event-row-active" : ""}`}
                  onClick={() => setSelectedId(event.id)}
                >
                  <div className={`date-block ${isPast(event) ? "date-block-past" : ""}`}>
                    <strong>{d.getDate()}</strong>
                    <small>{d.toLocaleDateString("en-PH", { month: "short" })}</small>
                  </div>
                  <div className="row-main">
                    <div className="row-title">
                      <h4>{event.title}</h4>
                      <span className={`badge badge-${event.status}`}>{event.status}</span>
                    </div>
                    <p className="muted">
                      {event.category && (
                        <span className="cat-tag">
                          <i style={{ background: event.category.color }} /> {event.category.name} ·{" "}
                        </span>
                      )}
                      {event.venue} · {timeOf(event.start_at)}
                      {myEventIds.includes(event.id) && " · you have a ticket"}
                      {event.on_waitlist && " · on waitlist"}
                      {isSoldOut(event) && !myEventIds.includes(event.id) && " · sold out"}
                    </p>
                    <div className="progress">
                      <span style={{ width: `${fill}%` }} />
                    </div>
                  </div>
                  <div className="row-price">{formatPrice(event.price)}</div>
                </button>
              );
            })
          )}
        </div>
      </section>

      <aside className="detail-panel">
        {selected ? (
          <>
            <div className="hero">
              {posterSrc(selected) ? (
                <img className="hero-img" src={posterSrc(selected)} alt={`${selected.title} poster`} />
              ) : (
                <div className="hero-art">{initialsOf(selected.title)}</div>
              )}
              <span className="hero-chip">
                <ClockIcon size={14} /> {duration(selected.start_at, selected.end_at)}
              </span>
            </div>

            <div className="panel-body">
              <div className="panel-title">
                <div>
                  <h2>{selected.title}</h2>
                  <p className="muted">
                    {selected.category && `${selected.category.name} · `}
                    {selected.organizer?.name} · <span className="status-text">{selected.status}</span>
                  </p>
                </div>
                <Link className="round-btn" to={`/events/${selected.id}`} title="Full details">
                  <ArrowRightIcon />
                </Link>
              </div>

              {selected.description && <p className="panel-desc">{selected.description}</p>}

              <div className="panel-facts">
                <span><PinIcon size={16} /> {selected.venue}</span>
                <span><ClockIcon size={16} /> {formatDate(selected.start_at)}</span>
              </div>

              <h4 className="panel-section">Slots Info</h4>
              <SeatMap taken={selected.tickets_count} capacity={selected.capacity} />

              <h4 className="panel-section">{isStudent ? "Total Checkout" : "Manage"}</h4>
              {renderCheckout(selected)}
            </div>
          </>
        ) : (
          <p className="muted empty">Select an event to see its details.</p>
        )}
      </aside>
    </div>
  );
}
