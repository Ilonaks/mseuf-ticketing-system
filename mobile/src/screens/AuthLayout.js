import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../styles";

// Maroon brand header with the form on a white sheet (login and register)
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          {/* Soft light circles for depth */}
          <View style={[styles.glow, { top: -60, right: -40 }]} />
          <View style={[styles.glow, { bottom: -90, left: -70, opacity: 0.06 }]} />

          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>M</Text>
            </View>
            <View>
              <Text style={styles.brandName}>MSEUF Events</Text>
              <Text style={styles.brandSub}>Manuel S. Enverga University Foundation</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Campus events,{"\n"}one ticket away.</Text>
          <Text style={styles.heroCopy}>Reserve a seat, show your QR code at the door, and you're in.</Text>
        </View>

        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  hero: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 56,
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#fff",
    opacity: 0.1,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 44,
    height: 48,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: COLORS.primary,
    fontWeight: "800",
    fontSize: 20,
  },
  brandName: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  brandSub: {
    color: COLORS.primarySoft,
    fontSize: 11,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 36,
    marginTop: 36,
  },
  heroCopy: {
    color: COLORS.primarySoft,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    maxWidth: 320,
  },
  sheet: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -28,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.text,
  },
  subtitle: {
    color: COLORS.muted,
    marginTop: 4,
    marginBottom: 8,
  },
});
