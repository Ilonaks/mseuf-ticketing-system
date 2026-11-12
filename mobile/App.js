import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as storage from "./src/storage";
import api from "./src/api";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import EventsScreen from "./src/screens/EventsScreen";
import EventDetailsScreen from "./src/screens/EventDetailsScreen";
import MyTicketsScreen from "./src/screens/MyTicketsScreen";
import CheckInScreen from "./src/screens/CheckInScreen";
import { CalendarIcon, LogoutIcon, ScanIcon, TicketIcon } from "./src/Icons";
import { COLORS } from "./src/styles";
import DialogHost from "./src/DialogHost";
import { alert, confirm, notify } from "./src/dialogs";
import { onSessionEnded } from "./src/session";
import usePolling from "./src/usePolling";

// Bottom tabs shown for each role
const TABS = {
  student: [
    { key: "events", label: "Events", icon: CalendarIcon },
    { key: "tickets", label: "My Tickets", icon: TicketIcon },
  ],
  organizer: [
    { key: "events", label: "Events", icon: CalendarIcon },
    { key: "checkin", label: "Check In", icon: ScanIcon },
  ],
  admin: [
    { key: "events", label: "Events", icon: CalendarIcon },
    { key: "checkin", label: "Check In", icon: ScanIcon },
  ],
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState("login"); // "login" | "register"
  const [tab, setTab] = useState("events");
  const [openEventId, setOpenEventId] = useState(null); // event details on top of the Events tab

  // On app start, check if a saved token is still valid
  useEffect(() => {
    (async () => {
      const token = await storage.getItem("token");
      if (token) {
        try {
          const res = await api.get("/me");
          setUser(res.data);
        } catch {
          await storage.deleteItem("token");
        }
      }
      setLoading(false);
    })();
  }, []);

  const signIn = async (data) => {
    await storage.setItem("token", data.token);
    setTab("events");
    setOpenEventId(null);
    setUser(data.user);
    notify(`Welcome, ${data.user.name}!`);
    if (data.signed_out_other_device) {
      notify("Your account was logged out on the other device you were using.");
    }
  };

  // The API rejected our token (see src/api.js): log out here and explain why
  useEffect(
    () =>
      onSessionEnded(({ reason }) => {
        setUser(null);
        setOpenEventId(null);
        setAuthScreen("login");
        const replaced = reason === "session_replaced";
        alert({
          title: replaced ? "Logged in on another device" : "You've been logged out",
          message: replaced
            ? "Your account was just logged in on another device, so you were logged out here. If that wasn't you, log in again and change your password."
            : "Your session has ended. Please log in again.",
          tone: replaced ? "danger" : "primary",
        });
      }),
    []
  );

  // Heartbeat: notices within seconds if another device took over this account
  usePolling(() => api.get("/me").catch(() => {}), { interval: 10000, enabled: Boolean(user) });

  const handleLogin = async (email, password) => {
    const res = await api.post("/login", { email, password, device_name: "mobile" });
    await signIn(res.data);
  };

  const handleRegister = async (form) => {
    const res = await api.post("/register", { ...form, device_name: "mobile" });
    await signIn(res.data);
  };

  const handleLogout = async () => {
    const ok = await confirm({
      title: "Log out?",
      message: "You'll need to log in again to see your events and tickets.",
      confirmText: "Log out",
      tone: "danger",
    });
    if (!ok) return;

    try {
      await api.post("/logout");
    } catch {
      // Ignore errors; log out locally anyway
    }
    await storage.deleteItem("token");
    setAuthScreen("login");
    setUser(null);
    notify("You've been logged out.");
  };

  const renderLoggedIn = () => {
    const tabs = TABS[user.role] ?? TABS.student;

    let screen;
    if (tab === "tickets") {
      screen = <MyTicketsScreen />;
    } else if (tab === "checkin") {
      screen = <CheckInScreen user={user} />;
    } else if (openEventId) {
      screen = <EventDetailsScreen eventId={openEventId} user={user} onBack={() => setOpenEventId(null)} />;
    } else {
      screen = <EventsScreen user={user} onOpenEvent={setOpenEventId} />;
    }

    const today = new Date();

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>M</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Hi, {user.name}
            </Text>
            <Text style={styles.headerSub}>
              {user.role} ·{" "}
              {today.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" })}
            </Text>
          </View>
          <Pressable style={styles.logoutButton} onPress={handleLogout} accessibilityLabel="Log out">
            <LogoutIcon size={20} color={COLORS.textSoft} />
          </Pressable>
        </View>

        <View style={{ flex: 1 }}>{screen}</View>

        {/* Floating tab bar */}
        <View style={styles.tabBar}>
          {tabs.map(({ key, label, icon: TabIcon }) => {
            const active = tab === key;
            return (
              <Pressable
                key={key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => {
                  setTab(key);
                  setOpenEventId(null);
                }}
              >
                <TabIcon size={20} color={active ? "#fff" : COLORS.muted} />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.safe, { backgroundColor: user || loading ? COLORS.surface : COLORS.primary }]}
        edges={["top", "bottom"]}
      >
        <StatusBar style={user || loading ? "dark" : "light"} />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : user ? (
          renderLoggedIn()
        ) : authScreen === "register" ? (
          <RegisterScreen onRegister={handleRegister} onShowLogin={() => setAuthScreen("login")} />
        ) : (
          <LoginScreen onLogin={handleLogin} onShowRegister={() => setAuthScreen("register")} />
        )}
        <DialogHost />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  logo: {
    width: 40,
    height: 44,
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "700",
  },
  headerSub: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 1,
    textTransform: "lowercase",
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.chip,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 16,
    flexDirection: "row",
    gap: 8,
    padding: 8,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#3c1419",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 18,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.muted,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#fff",
  },
});
