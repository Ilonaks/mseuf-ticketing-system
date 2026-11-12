import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import api from "../api";
import usePolling from "../usePolling";
import LiveBadge from "../LiveBadge";
import { confirm, notify } from "../dialogs";
import { errorMessage, formatDate } from "../format";
import { ClockIcon, PinIcon } from "../Icons";
import { badgeStyle, COLORS, common } from "../styles";

export default function MyTicketsScreen() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const previousStatus = useRef(null); // ticket id -> status from the last load

  // Tells the student when something happened to a ticket elsewhere (gate scan, waitlist)
  const announceChanges = (list) => {
    const before = previousStatus.current;
    if (before) {
      for (const t of list) {
        const was = before.get(t.id);
        if (was === "reserved" && t.status === "used") {
          notify(`Checked in: ${t.event?.title}. Enjoy the event!`);
        } else if (t.status === "reserved" && was !== "reserved") {
          notify(`A slot opened up! You got a ticket for ${t.event?.title}.`);
        }
      }
    }
    previousStatus.current = new Map(list.map((t) => [t.id, t.status]));
  };

  const loadTickets = useCallback(async ({ background = false } = {}) => {
    try {
      const res = await api.get("/tickets");
      announceChanges(res.data);
      setTickets(res.data);
    } catch (err) {
      if (!background) notify(errorMessage(err, "Could not load your tickets."), "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  usePolling(() => loadTickets({ background: true }));

  const cancel = async (ticket) => {
    const ok = await confirm({
      title: "Cancel this ticket?",
      message: `Your ticket ${ticket.ticket_code} for ${ticket.event?.title} will stop working. You can reserve again later if slots remain.`,
      confirmText: "Cancel ticket",
      cancelText: "Keep it",
      tone: "danger",
    });
    if (!ok) return;

    try {
      const res = await api.patch(`/tickets/${ticket.id}/cancel`);
      notify(res.data.message);
      await loadTickets();
    } catch (err) {
      notify(errorMessage(err, "Could not cancel the ticket."), "error");
    }
  };

  const renderTicket = ({ item }) => {
    const active = item.status === "reserved";
    return (
      <View style={[styles.ticket, !active && { opacity: 0.75 }]}>
        {/* Top half: event info on maroon */}
        <View style={[styles.top, !active && { backgroundColor: COLORS.textSoft }]}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            <Text style={styles.eventTitle}>{item.event?.title}</Text>
            <Text style={badgeStyle(item.status)}>{item.status === "used" ? "checked in" : item.status}</Text>
          </View>
          <View style={styles.meta}>
            <PinIcon size={14} color={COLORS.primarySoft} />
            <Text style={styles.metaText}>{item.event?.venue}</Text>
          </View>
          {item.event && (
            <View style={styles.meta}>
              <ClockIcon size={14} color={COLORS.primarySoft} />
              <Text style={styles.metaText}>{formatDate(item.event.start_at)}</Text>
            </View>
          )}
        </View>

        {/* Perforation */}
        <View style={styles.perforation}>
          <View style={[styles.notch, { left: -12 }]} />
          <View style={styles.dashes} />
          <View style={[styles.notch, { right: -12 }]} />
        </View>

        {/* Bottom half: QR code to show at the entrance */}
        <View style={styles.bottom}>
          {active && (
            <View style={styles.qr}>
              <QRCode value={item.ticket_code} size={170} color={COLORS.text} />
            </View>
          )}
          <Text style={common.ticketCode}>{item.ticket_code}</Text>

          {item.status === "used" && (
            <Text style={[common.success, { textAlign: "center" }]}>
              Used — checked in {formatDate(item.checked_in_at)}
            </Text>
          )}

          {active && (
            <>
              <Text style={[common.muted, { textAlign: "center" }]}>Show this QR code at the entrance</Text>
              {item.event?.check_in_opens_at ? (
                <Text style={[common.muted, { textAlign: "center", marginTop: 2 }]}>
                  Check-in opens {formatDate(item.event.check_in_opens_at)}
                </Text>
              ) : null}
              <Pressable style={[common.button, common.buttonOutline]} onPress={() => cancel(item)}>
                <Text style={common.buttonOutlineText}>Cancel Ticket</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    );
  };

  if (loading) return <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />;

  return (
    <FlatList
      style={common.screen}
      data={tickets}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderTicket}
      contentContainerStyle={common.content}
      ListHeaderComponent={
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={common.title}>My Tickets</Text>
            <LiveBadge />
          </View>
          <Text style={common.subtitle}>
            {tickets.filter((t) => t.status === "reserved").length} active ticket(s)
          </Text>
        </>
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadTickets();
          }}
          tintColor={COLORS.primary}
        />
      }
      ListEmptyComponent={
        <Text style={[common.muted, { textAlign: "center", marginTop: 30 }]}>
          You don't have any tickets yet.
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  ticket: {
    borderRadius: 24,
    backgroundColor: COLORS.panel,
    marginBottom: 18,
    overflow: "hidden",
  },
  top: {
    backgroundColor: COLORS.primary,
    padding: 18,
    gap: 6,
  },
  eventTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    color: COLORS.primarySoft,
    fontSize: 13,
  },
  perforation: {
    height: 24,
    justifyContent: "center",
    backgroundColor: COLORS.panel,
  },
  notch: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  dashes: {
    marginHorizontal: 18,
    borderTopWidth: 2,
    borderStyle: "dashed",
    borderColor: "#ddd3d3",
  },
  bottom: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  qr: {
    alignSelf: "center",
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
  },
});
