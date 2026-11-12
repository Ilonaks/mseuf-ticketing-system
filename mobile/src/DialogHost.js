import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { registerDialogHost } from "./dialogs";
import { COLORS } from "./styles";

// Renders the confirmation pop-up and toasts requested through src/dialogs.js
export default function DialogHost() {
  const [dialog, setDialog] = useState(null); // { title, message, confirmText, cancelText, tone, resolve }
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    registerDialogHost({
      confirm: (options) =>
        new Promise((resolve) =>
          setDialog({ confirmText: "Confirm", cancelText: "Cancel", tone: "primary", ...options, resolve })
        ),
      // One-button notice; resolves when dismissed
      alert: (options) =>
        new Promise((resolve) => setDialog({ confirmText: "OK", tone: "primary", ...options, single: true, resolve })),
      toast: (text, type) => {
        const id = Date.now() + Math.random();
        setToasts((list) => [...list, { id, text, type }]);
        setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3500);
      },
    });
    return () => registerDialogHost(null);
  }, []);

  const close = (result) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  const danger = dialog?.tone === "danger";

  return (
    <>
      <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={() => close(false)}>
        <Pressable style={styles.backdrop} onPress={() => close(false)}>
          {/* Inner Pressable stops taps on the card from closing it */}
          <Pressable style={styles.card} onPress={() => {}}>
            <View style={[styles.icon, danger && styles.iconDanger]}>
              <Text style={[styles.iconText, danger && { color: COLORS.danger }]}>{danger ? "!" : dialog?.single ? "i" : "?"}</Text>
            </View>
            <Text style={styles.title}>{dialog?.title}</Text>
            {dialog?.message ? <Text style={styles.message}>{dialog.message}</Text> : null}
            <View style={styles.actions}>
              {!dialog?.single && (
                <Pressable style={[styles.button, styles.cancel]} onPress={() => close(false)}>
                  <Text style={styles.cancelText}>{dialog?.cancelText}</Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.button, { backgroundColor: danger ? COLORS.danger : COLORS.primary }]}
                onPress={() => close(true)}
              >
                <Text style={styles.confirmText}>{dialog?.confirmText}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={styles.toasts} pointerEvents="none">
        {toasts.map((t) => (
          <View key={t.id} style={[styles.toast, t.type === "error" && { backgroundColor: COLORS.danger }]}>
            <Text style={styles.toastText}>{t.text}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(40,12,16,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 26,
    padding: 24,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  iconDanger: {
    backgroundColor: COLORS.dangerSoft,
  },
  iconText: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.primary,
  },
  title: {
    fontSize: 19,
    fontWeight: "700",
    color: COLORS.text,
  },
  message: {
    marginTop: 8,
    color: COLORS.textSoft,
    lineHeight: 21,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  cancel: {
    backgroundColor: COLORS.chip,
  },
  cancelText: {
    color: COLORS.text,
    fontWeight: "700",
  },
  confirmText: {
    color: "#fff",
    fontWeight: "700",
  },
  toasts: {
    position: "absolute",
    top: 70,
    left: 20,
    right: 20,
    gap: 8,
    zIndex: 100,
  },
  toast: {
    backgroundColor: COLORS.success,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  toastText: {
    color: "#fff",
    fontWeight: "600",
  },
});
