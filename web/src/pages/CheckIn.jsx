import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Html5QrcodeScanner } from "html5-qrcode";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { canCheckIn, errorMessage, formatDate } from "../utils/format";
import { TICKET_CODE } from "../utils/validation";
import usePolling from "../hooks/usePolling";

export default function CheckIn() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const eventId = searchParams.get("event") ?? "";

  const [events, setEvents] = useState([]);
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null); // { type, text, ticket? }
  const [scanning, setScanning] = useState(false);

  const busyRef = useRef(false);
  const lastScanRef = useRef({ code: "", at: 0 });

  // Only events this user is allowed to check in
  const loadEvents = () =>
    api
      .get("/events")
      .then((res) => setEvents(res.data.filter((e) => canCheckIn(user, e))))
      .catch(() => {});

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  usePolling(loadEvents, { interval: 15000 });

  const submitCode = async (rawCode) => {
    const ticketCode = rawCode.trim().toUpperCase();
    if (busyRef.current) return;
    if (!ticketCode) {
      setResult({ type: "error", text: "Enter a ticket code first." });
      return;
    }
    if (!TICKET_CODE.test(ticketCode)) {
      setResult({
        type: "error",
        text: `"${ticketCode.slice(0, 40)}" is not an MSEUF ticket code. Codes look like MSEUF-A8K2PX9Q.`,
      });
      return;
    }
    busyRef.current = true;

    try {
      const res = await api.post("/check-in", {
        ticket_code: ticketCode,
        event_id: eventId ? Number(eventId) : null,
      });
      setResult({ type: "success", text: res.data.message, ticket: res.data.ticket });
      setCode("");
    } catch (err) {
      setResult({ type: "error", text: `${ticketCode}: ${errorMessage(err, "Check-in failed.")}` });
    } finally {
      busyRef.current = false;
    }
  };

  // Camera scanner; the camera keeps running, so ignore the same code for 3 seconds
  useEffect(() => {
    if (!scanning) return;

    const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: 250 }, false);
    scanner.render(
      (decodedText) => {
        const now = Date.now();
        if (decodedText === lastScanRef.current.code && now - lastScanRef.current.at < 3000) return;
        lastScanRef.current = { code: decodedText, at: now };
        submitCode(decodedText);
      },
      () => {} // "no QR code in this frame" fires constantly; ignore it
    );

    return () => {
      scanner.clear().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning, eventId]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    submitCode(code);
  };

  return (
    <>
      <h2 className="page-title">Check In Tickets</h2>

      <div className="card form-card">
        <label>Event</label>
        <select
          value={eventId}
          onChange={(e) => setSearchParams(e.target.value ? { event: e.target.value } : {})}
        >
          <option value="">Any event I created</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title} — {formatDate(e.start_at)}
            </option>
          ))}
        </select>

        <button type="button" onClick={() => setScanning((s) => !s)}>
          {scanning ? "Stop camera" : "Scan QR code with camera"}
        </button>

        {scanning && <div id="qr-reader" className="qr-reader" />}

        <form onSubmit={handleManualSubmit} className="inline-form">
          <input
            placeholder="Or type the ticket code, e.g. MSEUF-A8K2PX9Q"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button type="submit">Check in</button>
        </form>

        {result && (
          <div className={result.type}>
            <strong>{result.text}</strong>
            {result.ticket && (
              <div>
                {result.ticket.user?.name}
                {result.ticket.user?.student_id && ` (${result.ticket.user.student_id})`} —{" "}
                {result.ticket.event?.title}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
