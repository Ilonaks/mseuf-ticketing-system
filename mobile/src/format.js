export const formatDate = (value) =>
  new Date(value).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const formatTime = (value) =>
  new Date(value).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });

export const formatPrice = (price) =>
  Number(price) === 0 ? "Free" : `₱${Number(price).toFixed(2)}`;

// "23.11.26" style date used on the checkout button
export const shortDate = (value) => {
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`;
};

export const duration = (start, end) => {
  const hours = (new Date(end) - new Date(start)) / 36e5;
  return hours >= 1 ? `${Math.round(hours * 10) / 10} hrs` : `${Math.round(hours * 60)} min`;
};

// "Foundation Week Concert" -> "FWC"
export const initialsOf = (text) =>
  text
    .split(/\s+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w))
    .map((w) => w[0])
    .slice(0, 3)
    .join("")
    .toUpperCase();

// Pulls a readable message out of a Laravel error response
export const errorMessage = (err, fallback = "Something went wrong.") => {
  if (!err.response) return "Cannot reach the server. Check your Wi-Fi and API URL.";
  const errors = err.response.data?.errors;
  if (errors) return Object.values(errors).flat().join("\n");
  return err.response.data?.message || fallback;
};

// The API returns poster_url relative to the API base ("/events/3/poster?v=...")
export const posterSrc = (event) =>
  event?.poster_url ? `${process.env.EXPO_PUBLIC_API_URL}${event.poster_url}` : null;

export const isPast = (event) => new Date(event.end_at) < new Date();

export const isSoldOut = (event) => event.tickets_count >= event.capacity;
