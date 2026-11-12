import api from "../api/axios";

// Downloads the attendee CSV (needs the auth token, so a plain <a href> won't work)
export async function downloadAttendeesCsv(event) {
  const res = await api.get(`/events/${event.id}/attendees/export`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-attendees.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
