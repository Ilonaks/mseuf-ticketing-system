import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import api from "./src/api";
import LoginScreen from "./src/screens/LoginScreen";
import EventsScreen from "./src/screens/EventsScreen";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On app start, check if a saved token is still valid
  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync("token");
      if (token) {
        try {
          const res = await api.get("/me");
          setUser(res.data);
        } catch {
          await SecureStore.deleteItemAsync("token");
        }
      }
      setLoading(false);
    })();
  }, []);

  const handleLogin = async (email, password) => {
    const res = await api.post("/login", { email, password, device_name: "mobile" });
    await SecureStore.setItemAsync("token", res.data.token);
    setUser(res.data.user);
  };

  const handleLogout = async () => {
    try {
      await api.post("/logout");
    } catch {
      // Ignore errors; log out locally anyway
    }
    await SecureStore.deleteItemAsync("token");
    setUser(null);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <StatusBar style={user ? "light" : "dark"} />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#7a1f2b" />
          </View>
        ) : user ? (
          <EventsScreen user={user} onLogout={handleLogout} />
        ) : (
          <LoginScreen onLogin={handleLogin} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f4f1f1",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});