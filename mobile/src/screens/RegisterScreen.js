import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput } from "react-native";
import { errorMessage } from "../format";
import { serverFieldErrors, validateRegister } from "../validation";
import { COLORS, common } from "../styles";
import AuthLayout from "./AuthLayout";

export default function RegisterScreen({ onRegister, onShowLogin }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    student_id: "",
    password: "",
    password_confirmation: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (value) => {
    setForm({ ...form, [field]: value });
    // Clear a field's error as soon as the user edits it
    if (fieldErrors[field]) setFieldErrors({ ...fieldErrors, [field]: undefined });
  };

  const handleSubmit = async () => {
    setError("");
    const found = validateRegister(form);
    setFieldErrors(found);
    if (Object.keys(found).length) {
      setError("Please fix the highlighted fields.");
      return;
    }

    setSubmitting(true);
    try {
      await onRegister({
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        student_id: form.student_id.trim() || null,
      });
    } catch (err) {
      const serverErrors = serverFieldErrors(err);
      if (serverErrors) {
        setFieldErrors(serverErrors);
        setError("Please fix the highlighted fields.");
      } else {
        setError(errorMessage(err, "Registration failed."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const field = (label, key, props = {}) => (
    <>
      <Text style={common.label}>{label}</Text>
      <TextInput
        style={[common.input, fieldErrors[key] && common.inputInvalid]}
        value={form[key]}
        onChangeText={set(key)}
        placeholderTextColor={COLORS.muted}
        {...props}
      />
      {fieldErrors[key] ? <Text style={common.fieldError}>{fieldErrors[key]}</Text> : null}
    </>
  );

  return (
    <AuthLayout title="Create account" subtitle="Register as an MSEUF student to start getting tickets.">
      {error ? <Text style={[common.error, { marginTop: 10 }]}>{error}</Text> : null}

      {field("Full Name", "name", { placeholder: "Juan Dela Cruz" })}
      {field("Email", "email", {
        placeholder: "you@mseuf.edu.ph",
        autoCapitalize: "none",
        keyboardType: "email-address",
      })}
      {field("Student ID (optional)", "student_id", { placeholder: "e.g. 2023-00001" })}
      {field("Password", "password", { secureTextEntry: true, placeholder: "At least 8 characters, with a number" })}
      {field("Confirm Password", "password_confirmation", { secureTextEntry: true, placeholder: "Type it again" })}

      <Pressable
        style={[common.button, { marginTop: 24 }, submitting && common.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={common.buttonText}>Create account</Text>}
      </Pressable>

      <Pressable onPress={onShowLogin} style={{ marginTop: 22, alignItems: "center" }}>
        <Text style={{ color: COLORS.text }}>
          Already have an account? <Text style={common.link}>Log in</Text>
        </Text>
      </Pressable>
    </AuthLayout>
  );
}
