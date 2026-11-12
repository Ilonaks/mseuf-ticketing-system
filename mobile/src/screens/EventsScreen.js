import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import api from "../api";
import usePolling from "../usePolling";
import { notify } from "../dialogs";
import { errorMessage, formatPrice, formatTime, isPast, isSoldOut, posterSrc } from "../format";
import { badgeStyle, COLORS, common } from "../styles";
import LiveBadge from "../LiveBadge";

const DAYS_SHOWN = 14;

const dayKey = (value) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

export default function EventsScreen({ user, onOpenEvent }) {
  const isStudent = user.role === "student";

  const [events, setEvents] = useState([]);
  const [myEventIds, setMyEventIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null); // dayKey or null for all dates
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(null); // null = all
  const [search, setSearch] = useState("");
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    api.get("/categories").then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  // background = automatic refresh: stay quiet on errors
  const loadData = useCallback(async ({ background = false } = {}) => {
    try {
      const eventsRes = await api.get("/events");
      setEvents(eventsRes.data);

      if (isStudent) {
        const ticketsRes = await api.get("/tickets");
        setMyEventIds(
          ticketsRes.data.filter((t) => t.status !== "cancelled").map((t) => t.event_id)
        );
      }
    } catch (err) {
      if (!background) notify(errorMessage(err, "Could not load events."), "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isStudent]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  usePolling(() => loadData({ background: true }));

  const eventDays = useMemo(() => new Set(events.map((e) => dayKey(e.start_at))), [events]);

  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: DAYS_SHOWN }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
  }, []);

  const query = search.trim().toLowerCase();
  const visible = events.filter((e) => {
    if (selectedDay && dayKey(e.start_at) !== selectedDay) return false;
    if (!showPast && !selectedDay && isPast(e)) return false;
    if (categoryId && e.category_id !== categoryId) return false;
    if (query && !`${e.title} ${e.venue} ${e.description ?? ""}`.toLowerCase().includes(query)) return false;
    return true;
  });
  const filtersActive = Boolean(query || categoryId || selectedDay);
  const clearFilters = () => {
    setSearch("");
    setCategoryId(null);
    setSelectedDay(null);
  };

  const header = (
    <View>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={common.title}>{isStudent ? "Upcoming Events" : "Events"}</Text>
            <LiveBadge />
          </View>
          <Text style={[common.muted, { marginTop: 2 }]}>
            {visible.length} event{visible.length === 1 ? "" : "s"}
            {filtersActive ? " match your filters" : " · pick a date or filter"}
          </Text>
        </View>
        {filtersActive && (
          <Pressable style={common.chip} onPress={clearFilters}>
            <Text style={common.chipText}>Clear</Text>
          </Pressable>
        )}
      </View>

      <TextInput
        style={[common.input, { marginTop: 14 }]}
        value={search}
        onChangeText={setSearch}
        placeholder="Search title, venue, or description"
        placeholderTextColor={COLORS.muted}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {days.map((d) => {
          const key = dayKey(d);
          const active = selectedDay === key;
          return (
            <Pressable
              key={key}
              style={[styles.day, active && styles.dayActive]}
              onPress={() => setSelectedDay(active ? null : key)}
            >
              <View
                style={[
                  styles.dayDot,
                  eventDays.has(key) && { backgroundColor: active ? "#fff" : "#c9bfc0" },
                ]}
              />
              <Text style={[styles.dayNum, active && { color: "#fff" }]}>{d.getDate()}</Text>
              <Text style={[styles.dayName, active && { color: COLORS.primarySoft }]}>
                {d.toLocaleDateString("en-PH", { weekday: "short" })}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {categories.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cats}>
          {[{ id: null, name: "All" }, ...categories].map((c) => {
            const active = categoryId === c.id;
            return (
              <Pressable
                key={String(c.id)}
                style={[styles.cat, active && styles.catActive]}
                onPress={() => setCategoryId(active && c.id ? null : c.id)}
              >
                {c.color ? <View style={[styles.catDot, { backgroundColor: c.color }]} /> : null}
                <Text style={[common.chipText, active && common.chipTextActive]}>{c.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.pastRow}>
        <Text style={common.muted}>Show past events</Text>
        <Switch
          value={showPast}
          onValueChange={setShowPast}
          trackColor={{ true: COLORS.primary, false: COLORS.border }}
          thumbColor="#fff"
        />
      </View>
    </View>
  );

  const renderEvent = ({ item }) => {
    const d = new Date(item.start_at);
    const fill = Math.min(100, (item.tickets_count / item.capacity) * 100);
    const hasTicket = myEventIds.includes(item.id);

    return (
      <Pressable style={styles.row} onPress={() => onOpenEvent(item.id)}>
        <View style={[styles.dateBlock, isPast(item) && { opacity: 0.55 }]}>
          {posterSrc(item) ? (
            <>
              <Image source={{ uri: posterSrc(item) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <View style={styles.posterShade} />
            </>
          ) : null}
          <Text style={styles.dateNum}>{d.getDate()}</Text>
          <Text style={styles.dateMonth}>{d.toLocaleDateString("en-PH", { month: "short" }).toUpperCase()}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={common.muted} numberOfLines={1}>
            {item.category ? `${item.category.name} · ` : ""}
            {item.venue} · {formatTime(item.start_at)}
          </Text>
          <View style={styles.rowMeta}>
            <Text style={badgeStyle(item.status)}>{item.status}</Text>
            {hasTicket && <Text style={[common.badge, common.badge_used]}>your ticket</Text>}
            {!hasTicket && item.on_waitlist && <Text style={[common.badge, common.badge_used]}>waitlisted</Text>}
            {!hasTicket && !item.on_waitlist && isSoldOut(item) && (
              <Text style={[common.badge, common.badge_cancelled]}>sold out</Text>
            )}
            <Text style={styles.rowPrice}>{formatPrice(item.price)}</Text>
          </View>
          <View style={styles.progress}>
            <View style={[styles.progressFill, { width: `${fill}%` }]} />
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />;
  }

  return (
    <FlatList
      style={common.screen}
      data={visible}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderEvent}
      ListHeaderComponent={header}
      contentContainerStyle={common.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadData();
          }}
          tintColor={COLORS.primary}
        />
      }
      ListEmptyComponent={
        <Text style={[common.muted, { textAlign: "center", marginTop: 30 }]}>
          {filtersActive ? "No events match your filters." : "No upcoming events yet."}
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  strip: {
    gap: 10,
    paddingVertical: 18,
  },
  day: {
    width: 58,
    height: 76,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  dayActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginBottom: 4,
  },
  dayNum: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },
  dayName: {
    fontSize: 11,
    color: COLORS.muted,
  },
  row: {
    flexDirection: "row",
    gap: 14,
    padding: 14,
    marginBottom: 10,
    borderRadius: 20,
    backgroundColor: COLORS.panel,
  },
  cats: {
    gap: 8,
    paddingBottom: 6,
  },
  cat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  catActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pastRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 12,
  },
  posterShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(40,12,16,0.62)",
  },
  dateBlock: {
    width: 58,
    height: 64,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  dateNum: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  dateMonth: {
    color: COLORS.primarySoft,
    fontSize: 11,
    fontWeight: "600",
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  rowPrice: {
    marginLeft: "auto",
    color: COLORS.primary,
    fontWeight: "700",
  },
  progress: {
    height: 5,
    borderRadius: 99,
    backgroundColor: "#ece6e6",
    overflow: "hidden",
    marginTop: 10,
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 99,
  },
});
