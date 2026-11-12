import { StyleSheet } from "react-native";

// MSEUF maroon palette (same as the web app)
export const COLORS = {
  primary: "#7a1f2b",
  primaryDark: "#5e1621",
  primaryDeep: "#3f0c15",
  primarySoft: "#f3dede",
  background: "#f4f1f1",
  surface: "#fff",
  panel: "#faf8f8",
  chip: "#f6f3f3",
  border: "#eee8e8",
  text: "#222",
  textSoft: "#555",
  muted: "#8a8383",
  danger: "#b42318",
  dangerSoft: "#fde8e8",
  success: "#1e7b3c",
  successSoft: "#e3f5e9",
  info: "#2851a3",
  infoSoft: "#e7eefc",
  seat: "#e9e3e3",
};

const shadow = {
  shadowColor: COLORS.primary,
  shadowOpacity: 0.28,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 8 },
  elevation: 6,
};

// Styles shared by the screens
export const common = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  content: {
    padding: 20,
    paddingBottom: 110, // room for the floating tab bar
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 2,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 22,
    marginBottom: 10,
  },
  muted: {
    color: COLORS.muted,
    fontSize: 13,
  },
  info: {
    marginTop: 2,
    color: COLORS.textSoft,
  },
  label: {
    fontWeight: "600",
    fontSize: 13,
    color: COLORS.textSoft,
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    backgroundColor: COLORS.panel,
    color: COLORS.text,
  },
  inputInvalid: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerSoft,
  },
  fieldError: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 5,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: "center",
    marginTop: 14,
    ...shadow,
  },
  buttonOutline: {
    backgroundColor: COLORS.dangerSoft,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonDisabled: {
    opacity: 0.55,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  buttonOutlineText: {
    color: COLORS.danger,
    fontWeight: "700",
    fontSize: 15,
  },
  chip: {
    backgroundColor: COLORS.chip,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.text,
    fontWeight: "600",
    fontSize: 13,
  },
  chipTextActive: {
    color: "#fff",
  },
  link: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  error: {
    backgroundColor: COLORS.dangerSoft,
    color: COLORS.danger,
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    overflow: "hidden",
  },
  success: {
    backgroundColor: COLORS.successSoft,
    color: COLORS.success,
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    overflow: "hidden",
  },
  badge: {
    backgroundColor: COLORS.successSoft,
    color: COLORS.success,
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
    textTransform: "capitalize",
    alignSelf: "flex-start",
  },
  badge_draft: { backgroundColor: "#eee", color: COLORS.textSoft },
  badge_cancelled: { backgroundColor: COLORS.dangerSoft, color: COLORS.danger },
  badge_used: { backgroundColor: COLORS.infoSoft, color: COLORS.info },
  ticketCode: {
    fontFamily: "monospace",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    backgroundColor: COLORS.chip,
    color: COLORS.text,
    padding: 10,
    borderRadius: 12,
    marginVertical: 10,
    letterSpacing: 1.5,
    overflow: "hidden",
  },
  shadow,
});

// Badge style for a status like "draft", "cancelled" or "used"
export const badgeStyle = (status) => [common.badge, common[`badge_${status}`]];
