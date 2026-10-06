import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import api from "../api";

const formatDate = (value) =>
  new Date(value).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const formatPrice = (price) =>
  Number(price) === 0 ? "Free" : `₱${Number(price).toFixed(2)}`;

export default function EventsScreen({ user, onLogout }) {
  const isStudent = user.role === "student";

  const [events, setEvents] = useState([]);
  const [myEventIds, setMyEventIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const loadData = useCallback(async () => {
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
      Alert.alert("Error", "Could not load events.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isStudent]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const reserve = async (eventId) => {
    setBusyId(eventId);
    try {
      const res = await api.post(`/events/${eventId}/tickets`);
      Alert.alert("Success", `Ticket reserved!\nCode: ${res.data.ticket.ticket_code}`);
      await loadData();
    } catch (err) {
      Alert.alert("Sorry", err.response?.data?.message || "Could not reserve a ticket.");
    } finally {
      setBusyId(null);
    }
  };

  const renderEvent = ({ item }) => {
    const hasTicket = myEventIds.includes(item.id);
    const soldOut = item.tickets_count >= item.capacity;
    const disabled = hasTicket || soldOut || busyId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <Text style={[styles.badge, item.status === "draft" && styles.badgeDraft]}>
            {item.status}
          </Text>
        </View>

        {item.description ? <Text style={styles.muted}>{item.description}</Text> : null}

        <Text style={styles.info}>Venue: {item.venue}</Text>
        <Text style={styles.info}>Date: {formatDate(item.start_at)}</Text>
        <Text style={styles.info}>
          Slots: {item.tickets_count} / {item.capacity} reserved
        </Text>
        <Text style={styles.price}>{formatPrice(item.price)}</Text>

        {isStudent && (
          <Pressable
            style={[styles.button, disabled && styles.buttonDisabled]}
            onPress={() => reserve(item.id)}
            disabled={disabled}
          >
            <Text style={styles.buttonText}>
              {hasTicket
                ? "Ticket reserved ✓"
                : soldOut
                ? "Sold out"
                : busyId === item.id
                ? "Reserving..."
                : "Get Ticket"}
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>MSEUF Events</Text>
          <Text style={styles.headerSub}>
            {user.name} ({user.role})
          </Text>
        </View>
        <Pressable style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#7a1f2b" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderEvent}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.muted}>No events available yet.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f1f1",
  },
  header: {
    backgroundColor: "#7a1f2b",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  headerSub: {
    color: "#f3dede",
    fontSize: 13,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: "#fff",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  logoutText: {
    color: "#7a1f2b",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  badge: {
    backgroundColor: "#e3f5e9",
    color: "#1e7b3c",
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
    textTransform: "capitalize",
  },
  badgeDraft: {
    backgroundColor: "#eee",
    color: "#555",
  },
  muted: {
    color: "#777",
    marginBottom: 6,
  },
  info: {
    marginTop: 2,
  },
  price: {
    color: "#7a1f2b",
    fontWeight: "700",
    fontSize: 16,
    marginTop: 6,
  },
  button: {
    backgroundColor: "#7a1f2b",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
});