import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import api from "../api";
import usePolling from "../usePolling";
import { errorMessage, formatDate } from "../format";
import { TICKET_CODE } from "../validation";
import { COLORS, common } from "../styles";

// Organizers and admins scan a student's ticket QR code at the entrance
export default function CheckInScreen({ user }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState(null); // null = any of my events
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null); // { ok, text, ticket? }

  const busyRef = useRef(false);
  const lastScanRef = useRef({ code: "", at: 0 });

  // Only events this user may check in: admins all, organizers their own
  const loadEvents = () =>
    api
      .get("/events")
      // Only the account that created an event checks in its tickets
      .then((res) => setEvents(res.data.filter((e) => e.user_id === user.id)))
      .catch(() => {});

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Keep the event list current (new or renamed events), less often than ticket data
  usePolling(loadEvents, { interval: 15000 });

  const submitCode = async (rawCode) => {
    const ticketCode = rawCode.trim().toUpperCase();
    if (busyRef.current) return;
    if (!ticketCode) {
      setResult({ ok: false, text: "Enter a ticket code first." });
      return;
    }
    if (!TICKET_CODE.test(ticketCode)) {
      setResult({
        ok: false,
        text: `"${ticketCode.slice(0, 40)}" is not an MSEUF ticket code. Codes look like MSEUF-A8K2PX9Q.`,
      });
      return;
    }
    busyRef.current = true;
    try {
      const res = await api.post("/check-in", { ticket_code: ticketCode, event_id: eventId });
      setResult({ ok: true, text: res.data.message, ticket: res.data.ticket });
      setCode("");
    } catch (err) {
      setResult({ ok: false, text: `${ticketCode}: ${errorMessage(err, "Check-in failed.")}` });
    } finally {
      busyRef.current = false;
    }
  };

  // The camera reports the same code many times a second; ignore repeats for 3 seconds
  const handleScan = ({ data }) => {
    const now = Date.now();
    if (data === lastScanRef.current.code && now - lastScanRef.current.at < 3000) return;
    lastScanRef.current = { code: data, at: now };
    submitCode(data);
  };

  const startCamera = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        setResult({ ok: false, text: "Camera permission denied. Type the ticket code instead." });
        return;
      }
    }
    setScanning(true);
  };

  return (
    <ScrollView style={common.screen} contentContainerStyle={common.content}>
      <Text style={common.title}>Check In Tickets</Text>
      <Text style={common.subtitle}>Scan a student's QR code or type their ticket code.</Text>

      <Text style={common.label}>Event</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {[{ id: null, title: "Any event I created" }, ...events].map((e) => (
          <Pressable
            key={String(e.id)}
            onPress={() => setEventId(e.id)}
            style={[common.chip, eventId === e.id && common.chipActive]}
          >
            <Text style={[common.chipText, eventId === e.id && common.chipTextActive]}>
              {e.title}
              {e.start_at ? ` · ${formatDate(e.start_at)}` : ""}
            </Text>
          </Pressable>
        ))}
      </View>

      {result && (
        <View style={[result.ok ? common.success : common.error, { marginTop: 12 }]}>
          <Text style={{ fontWeight: "700", color: result.ok ? COLORS.success : COLORS.danger }}>{result.text}</Text>
          {result.ticket && (
            <Text>
              {result.ticket.user?.name}
              {result.ticket.user?.student_id ? ` (${result.ticket.user.student_id})` : ""} — {result.ticket.event?.title}
            </Text>
          )}
        </View>
      )}

      {scanning ? (
        <>
          <View style={{ height: 320, borderRadius: 24, overflow: "hidden", marginTop: 14 }}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={handleScan}
            />
          </View>
          <Pressable style={[common.button, common.buttonOutline]} onPress={() => setScanning(false)}>
            <Text style={common.buttonOutlineText}>Stop camera</Text>
          </Pressable>
        </>
      ) : (
        <Pressable style={common.button} onPress={startCamera}>
          <Text style={common.buttonText}>Scan QR code with camera</Text>
        </Pressable>
      )}

      <Text style={[common.label, { marginTop: 20 }]}>Or type the ticket code</Text>
      <TextInput
        style={common.input}
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        placeholder="MSEUF-A8K2PX9Q"
        placeholderTextColor={COLORS.muted}
        onSubmitEditing={() => submitCode(code)}
      />
      <Pressable style={common.button} onPress={() => submitCode(code)}>
        <Text style={common.buttonText}>Check in</Text>
      </Pressable>
    </ScrollView>
  );
}

