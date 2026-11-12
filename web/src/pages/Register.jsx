import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import AuthLayout from "../components/AuthLayout";
import Field from "../components/Field";
import { serverFieldErrors, validateRegister } from "../utils/validation";

export default function Register() {
  const { register } = useAuth();
  const { toast } = useDialog();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    student_id: "",
    password: "",
    password_confirmation: "",
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Clear a field's error as soon as the user edits it
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: undefined });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const found = validateRegister(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      const user = await register({
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        student_id: form.student_id.trim() || null,
      });
      toast(`Account created. Welcome, ${user.name}!`);
      navigate("/");
    } catch (err) {
      const fieldErrors = serverFieldErrors(err);
      if (fieldErrors) setErrors(fieldErrors);
      else if (err.response?.status === 429) setFormError("Too many attempts. Please wait a minute and try again.");
      else setFormError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <h1>Create account</h1>
        <p className="muted">Register as an MSEUF student to start getting tickets.</p>

        {formError && <div className="error">{formError}</div>}

        <Field label="Full Name" htmlFor="name" error={errors.name}>
          <input id="name" name="name" placeholder="Juan Dela Cruz" value={form.name} onChange={handleChange} />
        </Field>

        <Field label="Email" htmlFor="reg-email" error={errors.email}>
          <input
            id="reg-email"
            type="email"
            name="email"
            placeholder="you@mseuf.edu.ph"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
          />
        </Field>

        <Field label="Student ID (optional)" htmlFor="student_id" error={errors.student_id}>
          <input
            id="student_id"
            name="student_id"
            placeholder="e.g. 2023-00001"
            value={form.student_id}
            onChange={handleChange}
          />
        </Field>

        <Field label="Password" htmlFor="reg-password" error={errors.password}>
          <input
            id="reg-password"
            type="password"
            name="password"
            placeholder="At least 8 characters, with a number"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
          />
        </Field>

        <Field label="Confirm Password" htmlFor="password_confirmation" error={errors.password_confirmation}>
          <input
            id="password_confirmation"
            type="password"
            name="password_confirmation"
            placeholder="Type it again"
            autoComplete="new-password"
            value={form.password_confirmation}
            onChange={handleChange}
          />
        </Field>

        <button type="submit" className="auth-submit" disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </button>

        <p className="switch-link">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
