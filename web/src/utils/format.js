export const formatDate = (value) =>
  new Date(value).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });

export const formatPrice = (price) =>
  Number(price) === 0 ? "Free" : formatPeso(price);

export const formatPeso = (amount) =>
  `₱${Number(amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Two to three capital letters from an event title, e.g. "Foundation Week Concert" -> "FWC"
export const initialsOf = (title) =>
  title
    .split(/\s+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w))
    .map((w) => w[0])
    .slice(0, 3)
    .join("")
    .toUpperCase();

// Pulls a readable message out of a Laravel error response
export const errorMessage = (err, fallback = "Something went wrong.") => {
  const errors = err.response?.data?.errors;
  if (errors) return Object.values(errors).flat().join(" ");
  return err.response?.data?.message || fallback;
};

// ISO date from the API -> value for <input type="datetime-local"> (local time)
export const toLocalInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Fields the API expects when updating an event (PUT requires all of them)
export const eventPayload = (event, overrides = {}) => ({
  title: event.title,
  description: event.description,
  venue: event.venue,
  start_at: event.start_at,
  end_at: event.end_at,
  capacity: event.capacity,
  price: event.price,
  status: event.status,
  category_id: event.category_id ?? null,
  ...overrides,
});

// The API returns poster_url relative to the API base ("/events/3/poster?v=...")
export const posterSrc = (event) =>
  event?.poster_url ? `${import.meta.env.VITE_API_URL}${event.poster_url}` : null;

// Events that already ended (hidden by default on the Events page)
export const isPast = (event) => new Date(event.end_at) < new Date();

// Students: sold out with no ticket of their own -> waitlist instead of "Get Ticket"
export const isSoldOut = (event) => event.tickets_count >= event.capacity;

// Only the account that created an event (organizer or admin) checks in its tickets
export const canCheckIn = (user, event) =>
  event.user_id === user.id && (user.role === "admin" || user.role === "organizer");

// Admins manage every event; organizers only the ones they created
export const canManage = (user, event) =>
  user.role === "admin" || (user.role === "organizer" && event.user_id === user.id);
