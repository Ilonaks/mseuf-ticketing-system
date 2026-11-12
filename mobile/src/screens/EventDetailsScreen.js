import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import api from "../api";
import usePolling from "../usePolling";
import { confirm, notify } from "../dialogs";
import { duration, errorMessage, formatDate, formatPrice, initialsOf, isPast, posterSrc, shortDate } from "../format";
import { ChevronLeftIcon, ClockIcon, PinIcon, UserIcon } from "../Icons";
import { badgeStyle, COLORS, common } from "../styles";

const SEATS_SHOWN = 48;

// Capacity drawn as a small seat map: maroon = taken, light = open
function SeatMap({ taken, capacity }) {
  const takenSeats = taken === 0 ? 0 : Math.max(1, Math.round((taken / capacity) * SEATS_SHOWN));
  return (
    <>
      <View style={styles.seatMap}>
        {Array.from({ length: SEATS_SHOWN }, (_, i) => (
          <View key={i} style={[styles.seat, i < takenSeats && styles.seatTaken]} />
        ))}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: COLORS.seat }]} />
          <Text style={styles.legendText}>AVAILABLE · {capacity - taken}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.legendText}>RESERVED · {taken}</Text>
        </View>
      </View>
    </>
  );
}

export default function EventDetailsScreen({ eventId, user, onBack }) {
  const isStudent = user.role === "student";

  const [event, setEvent] = useState(null);
  const [hasTicket, setHasTicket] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async ({ background = false } = {}) => {
    try {
      const res = await api.get(`/events/${eventId}`);
      setEvent(res.data);
      if (isStudent) {
        const tickets = await api.get("/tickets");
        setHasTicket(tickets.data.some((t) => t.event_id === eventId && t.status !== "cancelled"));
      }
    } catch (err) {
      if (!background) setError(errorMessage(err, "Could not load the event."));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // Slots, waitlist position, and status update live (paused while an action is running)
  usePolling(() => load({ background: true }), { enabled: !busy });

  const reserve = async () => {
    const ok = await confirm({
      title: "Reserve a ticket?",
      message: `${event.title}\n${formatDate(event.start_at)} · ${event.venue}\nPrice: ${formatPrice(event.price)}`,
      confirmText: "Get ticket",
    });
    if (!ok) return;

    setBusy(true);
    try {
      const res = await api.post(`/events/${eventId}/tickets`);
      notify(`Ticket reserved! Code: ${res.data.ticket.ticket_code}. Find it under My Tickets.`);
      await load();
    } catch (err) {
      notify(errorMessage(err, "Could not reserve a ticket."), "error");
    } finally {
      setBusy(false);
    }
  };

  const joinWaitlist = async () => {
    const ok = await confirm({
      title: "Join the waitlist?",
      message: `${event.title} is sold out. If someone cancels, you'll get a ticket automatically (first come, first served) and we'll email you.`,
      confirmText: "Join waitlist",
    });
    if (!ok) return;

    setBusy(true);
    try {
      const res = await api.post(`/events/${eventId}/waitlist`);
      notify(`You're #${res.data.position} on the waitlist.`);
      await load();
    } catch (err) {
      notify(errorMessage(err, "Could not join the waitlist."), "error");
    } finally {
      setBusy(false);
    }
  };

  const leaveWaitlist = async () => {
    const ok = await confirm({
      title: "Leave the waitlist?",
      message: "You'll lose your place in line for this event.",
      confirmText: "Leave",
      cancelText: "Stay",
      tone: "danger",
    });
    if (!ok) return;

    setBusy(true);
    try {
      const res = await api.delete(`/events/${eventId}/waitlist`);
      notify(res.data.message);
      await load();
    } catch (err) {
      notify(errorMessage(err, "Could not leave the waitlist."), "error");
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <View style={[common.screen, common.content]}>
        <Text style={common.error}>{error}</Text>
        <Pressable style={common.chip} onPress={onBack}>
          <Text style={common.chipText}>← Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!event) return <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />;

  const soldOut = event.tickets_count >= event.capacity;
  const canReserve = isStudent && event.status === "published" && !isPast(event);
  const disabled = hasTicket || soldOut || busy;
  const showWaitlist = canReserve && soldOut && !hasTicket;

  return (
    <ScrollView style={common.screen} contentContainerStyle={{ paddingBottom: 110 }}>
      <View style={styles.hero}>
        <View style={[styles.glow, { top: -50, right: -30 }]} />
        {posterSrc(event) ? (
          <Image source={{ uri: posterSrc(event) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Text style={styles.heroArt}>{initialsOf(event.title)}</Text>
        )}
        <Pressable style={styles.back} onPress={onBack} hitSlop={10}>
          <ChevronLeftIcon color={COLORS.text} />
        </Pressable>
        <View style={styles.heroChip}>
          <ClockIcon size={14} color={COLORS.primary} />
          <Text style={styles.heroChipText}>{duration(event.start_at, event.end_at)}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
          <Text style={[common.title, { flex: 1 }]}>{event.title}</Text>
          <Text style={badgeStyle(event.status)}>{event.status}</Text>
        </View>
        <Text style={[common.muted, { marginTop: 4 }]}>
          {event.category ? `${event.category.name} · ` : ""}
          {event.organizer?.name}
        </Text>

        {event.description ? <Text style={styles.desc}>{event.description}</Text> : null}

        <View style={styles.facts}>
          <View style={styles.fact}>
            <PinIcon size={16} color={COLORS.primary} />
            <Text style={styles.factText}>{event.venue}</Text>
          </View>
          <View style={styles.fact}>
            <ClockIcon size={16} color={COLORS.primary} />
            <Text style={styles.factText}>{formatDate(event.start_at)}</Text>
          </View>
          <View style={styles.fact}>
            <UserIcon size={16} color={COLORS.primary} />
            <Text style={styles.factText}>
              {event.tickets_count} / {event.capacity} reserved
              {event.waitlist_count > 0 ? ` · ${event.waitlist_count} waiting` : ""}
            </Text>
          </View>
        </View>

        <Text style={common.sectionTitle}>Slots Info</Text>
        <SeatMap taken={event.tickets_count} capacity={event.capacity} />

        {showWaitlist && (
          <>
            <Text style={common.sectionTitle}>Sold out</Text>
            {event.on_waitlist ? (
              <>
                <Text style={[common.success, { marginBottom: 10 }]}>
                  You're #{event.waitlist_position} on the waitlist. We'll give you a ticket automatically if a slot opens.
                </Text>
                <Pressable
                  style={[common.button, common.buttonOutline, busy && common.buttonDisabled]}
                  onPress={leaveWaitlist}
                  disabled={busy}
                >
                  <Text style={common.buttonOutlineText}>Leave waitlist</Text>
                </Pressable>
              </>
            ) : (
              <Pressable style={[styles.checkout, busy && common.buttonDisabled]} onPress={joinWaitlist} disabled={busy}>
                <Text style={styles.checkoutLabel}>Join the waitlist</Text>
                <Text style={styles.checkoutPrice}>{event.waitlist_count} waiting</Text>
              </Pressable>
            )}
          </>
        )}

        {canReserve && !showWaitlist && (
          <>
            <Text style={common.sectionTitle}>Total Checkout</Text>
            <Pressable
              style={[styles.checkout, disabled && common.buttonDisabled]}
              onPress={reserve}
              disabled={disabled}
            >
              <Text style={styles.checkoutLabel}>
                {hasTicket
                  ? "Ticket reserved ✓"
                  : soldOut
                  ? "Sold out"
                  : busy
                  ? "Reserving..."
                  : `${shortDate(event.start_at)} / Get Ticket`}
              </Text>
              <Text style={styles.checkoutPrice}>{formatPrice(event.price)}</Text>
            </Pressable>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 220,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  glow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#fff",
    opacity: 0.1,
  },
  back: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  heroArt: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 56,
    fontWeight: "800",
    letterSpacing: 6,
  },
  heroChip: {
    position: "absolute",
    left: 20,
    bottom: -16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
    zIndex: 2,
  },
  heroChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },
  body: {
    padding: 20,
    paddingTop: 32,
  },
  desc: {
    color: COLORS.textSoft,
    lineHeight: 22,
    marginTop: 14,
  },
  facts: {
    gap: 8,
    marginTop: 14,
  },
  fact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  factText: {
    color: COLORS.textSoft,
  },
  seatMap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  seat: {
    width: "6.9%",
    height: 12,
    borderRadius: 4,
    backgroundColor: COLORS.seat,
  },
  seatTaken: {
    backgroundColor: COLORS.primary,
  },
  legend: {
    flexDirection: "row",
    gap: 18,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendSwatch: {
    width: 16,
    height: 10,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 0.4,
  },
  checkout: {
    ...common.shadow,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 22,
  },
  checkoutLabel: {
    color: "#fff",
    fontWeight: "600",
  },
  checkoutPrice: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
  },
});
