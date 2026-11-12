import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import AuthLayout from "../components/AuthLayout";
import Field from "../components/Field";
import { serverFieldErrors, validateLogin } from "../utils/validation";

// Seeded test accounts (see README); handy for demos
const DEMO_ACCOUNTS = [
  { label: "Student", email: "juan@mseuf.edu.ph" },
  { label: "Organizer", email: "organizer@mseuf.edu.ph" },
  { label: "Admin", email: "admin@mseuf.edu.ph" },
];

export default function Login() {
  const { login } = useAuth();
  const { toast } = useDialog();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const found = validateLogin({ email, password });
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      const data = await login(email.trim(), password);
      toast(`Welcome back, ${data.user.name}!`);
      if (data.signed_out_other_device) {
        toast("Your account was logged out on the other device you were using.");
      }
      navigate("/");
    } catch (err) {
      if (err.response?.status === 429) {
        setFormError("Too many login attempts. Please wait a minute and try again.");
      } else if (!err.response) {
        setFormError("Cannot reach the server. Check your connection.");
      } else {
        // Wrong email/password comes back as an error on "email"; show it once, above the form
        setFormError(serverFieldErrors(err)?.email || err.response?.data?.message || "Login failed.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword("password123");
    setErrors({});
    setFormError("");
  };

  return (
    <AuthLayout>
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <h1>Welcome back</h1>
        <p className="muted">Log in to view events and get tickets.</p>

        {formError && <div className="error">{formError}</div>}

        <Field label="Email" htmlFor="email" error={errors.email}>
          <input
            id="email"
            type="email"
            placeholder="you@mseuf.edu.ph"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label="Password" htmlFor="password" error={errors.password}>
          <div className="password-field">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" className="toggle-pw" onClick={() => setShowPassword((s) => !s)}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </Field>

        <button type="submit" className="auth-submit" disabled={submitting}>
          {submitting ? "Logging in..." : "Log in"}
        </button>

        <div className="demo-accounts">
          <span>Try a demo account</span>
          <div>
            {DEMO_ACCOUNTS.map((a) => (
              <button type="button" key={a.label} className="chip-btn" onClick={() => fillDemo(a)}>
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <p className="switch-link">
          No account yet? <Link to="/register">Create one</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
