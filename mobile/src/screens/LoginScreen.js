import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { errorMessage } from "../format";
import { serverFieldErrors, validateLogin } from "../validation";
import { COLORS, common } from "../styles";
import AuthLayout from "./AuthLayout";

// Seeded test accounts (see README); handy for demos
const DEMO_ACCOUNTS = [
  { label: "Student", email: "juan@mseuf.edu.ph" },
  { label: "Organizer", email: "organizer@mseuf.edu.ph" },
  { label: "Admin", email: "admin@mseuf.edu.ph" },
];

export default function LoginScreen({ onLogin, onShowRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError("");
    const found = validateLogin({ email, password });
    setFieldErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      await onLogin(email.trim(), password);
    } catch (err) {
      if (err.response?.status === 429) {
        setError("Too many login attempts. Please wait a minute and try again.");
      } else {
        // Wrong email/password comes back as an error on "email"
        setError(serverFieldErrors(err)?.email || errorMessage(err, "Login failed."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword("password123");
    setError("");
    setFieldErrors({});
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to view events and get tickets.">
      {error ? <Text style={[common.error, { marginTop: 10 }]}>{error}</Text> : null}

      <Text style={common.label}>Email</Text>
      <TextInput
        style={[common.input, fieldErrors.email && common.inputInvalid]}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@mseuf.edu.ph"
        placeholderTextColor={COLORS.muted}
      />
      {fieldErrors.email ? <Text style={common.fieldError}>{fieldErrors.email}</Text> : null}

      <Text style={common.label}>Password</Text>
      <View style={styles.passwordRow}>
        <TextInput
          style={[common.input, { flex: 1, paddingRight: 70 }, fieldErrors.password && common.inputInvalid]}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          placeholder="Your password"
          placeholderTextColor={COLORS.muted}
          onSubmitEditing={handleSubmit}
        />
        <Pressable style={styles.toggle} onPress={() => setShowPassword((s) => !s)}>
          <Text style={common.link}>{showPassword ? "Hide" : "Show"}</Text>
        </Pressable>
      </View>
      {fieldErrors.password ? <Text style={common.fieldError}>{fieldErrors.password}</Text> : null}

      <Pressable
        style={[common.button, { marginTop: 24 }, submitting && common.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={common.buttonText}>Log in</Text>}
      </Pressable>

      <View style={styles.demo}>
        <Text style={common.muted}>Try a demo account</Text>
        <View style={styles.demoRow}>
          {DEMO_ACCOUNTS.map((a) => (
            <Pressable key={a.label} style={common.chip} onPress={() => fillDemo(a)}>
              <Text style={common.chipText}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable onPress={onShowRegister} style={styles.switchLink}>
        <Text style={{ color: COLORS.text }}>
          No account yet? <Text style={common.link}>Create one</Text>
        </Text>
      </Pressable>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  toggle: {
    position: "absolute",
    right: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  demo: {
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  demoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  switchLink: {
    marginTop: 22,
    alignItems: "center",
  },
});
